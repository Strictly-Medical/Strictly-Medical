# Builds js/map-dawnspire.js (the village island) from the reference painting art/tiles2/maps-reference.png.
#
# The painting has no tile grid, so the game grid is projected onto it: every tile (x,y) at level L lands on an image point,
# and the pixel colours there decide what the tile is (sky = void, grass, path, trees, water). Terrace heights, stairs,
# buildings and landmarks are marked by hand below in image coordinates (pixels of the 1536px-wide reference).
# Run from the repo root:  python3 art/maps/overworld.py   (writes js/map-dawnspire.js and a debug picture to /tmp)
import json, math, sys
from collections import deque
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

REF = 'art/tiles2/maps-reference.png'
im = Image.open(REF).convert('RGB').crop((0, 0, 1536, 505))
A = np.array(im).astype(int)
R_, G_, B_ = A[..., 0], A[..., 1], A[..., 2]
MX, MN, BR = A.max(2), A.min(2), A.mean(2)

# ---- pixel classes ----
blue = (B_ > 140) & (B_ > R_ + 25) & (B_ >= G_)
cloud = (MN > 185) & (MX - MN < 40)
skyish = blue | cloud
lab, _ = ndimage.label(skyish)
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
SKY = np.isin(lab, list(border))
# the legend box and title plate count as sky
SKY[0:175, 1350:1536] = True
SKY[0:85, 0:330] = True
WATERPX = blue & ~SKY
ROCK = (MX - MN < 50) & (BR > 45) & (BR < 175) & (B_ >= G_ - 8) & ~skyish
GRASS = (G_ > R_ + 6) & (G_ > B_ + 12) & (G_ >= 95)
TREE = (G_ > R_ + 2) & (G_ > B_ + 4) & (G_ < 95)
PATH = (R_ > G_ + 14) & (G_ > B_ + 10) & (R_ > 125)

# ---- projection ----
F = 0.49            # image px per game px (the guild hall is ~158px wide in the painting, 322px in game)
ZL = 40             # game px per level (matches js/core.js)
CX, TY, OFF = 785, 92, 27
N = 78


def proj(x, y, L):
    u, v = x - y, x + y - 2 * OFF
    return CX + u * 32 * F, TY + (v * 16 + 16) * F - L * ZL * F


def unproj(px, py, L):
    u = (px - CX) / (32 * F)
    v = ((py + L * ZL * F - TY) / F - 16) / 16
    return round((u + v) / 2 + OFF), round((v - u) / 2 + OFF)


def sample(mask, px, py, r=2):
    x, y = int(round(px)), int(round(py))
    if x < 0 or y < 0 or x >= mask.shape[1] or y >= mask.shape[0]:
        return 0.0
    return mask[max(0, y - r):y + r + 1, max(0, x - r):x + r + 1].mean()


def inside(poly, px, py):
    c = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % n]
        if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
            c = not c
    return c


# ---- hand-marked regions (image coords) ----
LEVEL_POLYS = {
    3: [[(1150, 78), (1205, 62), (1245, 80), (1200, 102)]],                                   # bell-tower top
    2: [[(612, 108), (700, 52), (780, 36), (900, 70), (1005, 120), (935, 172), (805, 214), (700, 182), (630, 150)],   # guild plateau
        [(330, 112), (420, 40), (560, 52), (610, 96), (555, 140), (450, 160), (342, 150)],                         # north-west ruin terrace
        [(1040, 98), (1150, 40), (1300, 78), (1318, 160), (1215, 182), (1100, 160)]],                              # north-east bell-tower terrace
    0: [[(985, 372), (1095, 322), (1235, 340), (1310, 392), (1245, 448), (1095, 452)]],                          # south-east yard before the Barrow
}
COBBLE_POLYS = [[(640, 120), (900, 120), (930, 175), (700, 190)],      # guild forecourt
                [(800, 230), (980, 215), (1010, 285), (840, 300)],     # market square
                [(1060, 360), (1230, 350), (1250, 420), (1090, 430)]]  # Barrow yard
WHEAT = [(335, 272), (400, 250), (585, 262), (565, 292), (460, 302), (345, 292)]
STREAM = [(462, 318), (560, 295), (684, 297), (678, 320), (560, 332), (470, 347)]
# Buildings: sprite, ground centre in the image, level
BUILDINGS = [('guild', (770, 112), 2), ('mill', (1012, 238), 1), ('apothecary', (608, 268), 1), ('forge', (512, 168), 1),
             ('cottage', (1255, 290), 1), ('cottage', (300, 248), 1)]
# Landmarks: kind, image point, level
MARKS = [('windmill', (382, 238), 1), ('tower', (1197, 92), 3), ('tower', (424, 72), 2), ('gate', (1140, 392), 0),
         ('statue', (880, 262), 1), ('stall', (893, 222), 1), ('stall', (952, 226), 1), ('ruinarch', (1338, 262), 1),
         ('arch', (1392, 270), 1), ('bridge', (640, 318), 1), ('banner1', (735, 158), 2), ('banner2', (800, 165), 2),
         ('well', (565, 200), 1), ('anvil', (540, 186), 1)]
# Stair hints: image point and the lower level (a stair is placed on the nearest suitable boundary)
STAIRS = [((712, 150), 1), ((768, 162), 1), ((455, 118), 1), ((358, 188), 1), ((1130, 126), 1), ((1025, 360), 0), ((1262, 362), 0)]
WATERFALLS = [(466, 348), (218, 352), (1392, 352)]

# ---- classify tiles ----
LV = np.full((N, N), -1, int)      # -1 void
ST = np.full((N, N), '.', object)
for x in range(N):
    for y in range(N):
        for L in (3, 2, 1, 0):
            px, py = proj(x, y, L)
            if L != 1:
                if not any(inside(p, px, py) for p in LEVEL_POLYS[L]):
                    continue
            else:
                # inside another level's region the ground seen is that level's, not level 1
                if any(inside(p, px, py) for q in (2, 3, 0) for p in LEVEL_POLYS[q]):
                    continue
            if not (2 <= px < 1534 and 2 <= py < 503) or sample(SKY, px, py) > .5:
                continue
            if sample(ROCK, px, py) > .7 and sample(GRASS | PATH | TREE, px, py) < .15:
                continue
            LV[x, y] = L
            break

# keep the main island and the ruin islet, drop the tiny floating rocks
land = LV >= 0
lab2, n2 = ndimage.label(land)
sizes = ndimage.sum(land, lab2, range(1, n2 + 1))
keep = {i + 1 for i, s in enumerate(sizes) if s >= 120}
LV[~np.isin(lab2, list(keep))] = -1
# fill pinholes
land = ndimage.binary_fill_holes(LV >= 0)
for x in range(N):
    for y in range(N):
        if land[x, y] and LV[x, y] < 0:
            nb = [LV[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < N and 0 <= y + dy < N and LV[x + dx, y + dy] >= 0]
            LV[x, y] = max(set(nb), key=nb.count) if nb else 1
# smooth levels: a tile whose 4 neighbours mostly share another level joins them (removes single-tile ledges)
for _ in range(2):
    L2 = LV.copy()
    for x in range(1, N - 1):
        for y in range(1, N - 1):
            if LV[x, y] < 0:
                continue
            nb = [LV[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if LV[x + dx, y + dy] >= 0]
            if len(nb) >= 3:
                m = max(set(nb), key=nb.count)
                if nb.count(m) >= 3 and m != LV[x, y]:
                    L2[x, y] = m
    LV = L2

# ground types
for x in range(N):
    for y in range(N):
        if LV[x, y] < 0:
            continue
        px, py = proj(x, y, LV[x, y])
        if any(inside(p, px, py) for p in COBBLE_POLYS):
            ST[x, y] = 'c'
        elif inside(STREAM, px, py):
            ST[x, y] = 'w'
        elif sample(PATH, px, py, 3) > .45:
            ST[x, y] = 'd'
        else:
            ST[x, y] = 'g'

objs = []
blocked = np.zeros((N, N), bool)
buildings = []
for spr, (px, py), L in BUILDINGS:
    foot = {'guild': (6, 4), 'forge': (4, 5), 'apothecary': (5, 4), 'mill': (5, 4), 'cottage': (3, 3)}[spr]
    cx, cy = unproj(px, py, L)
    x0, y0 = cx - foot[0] // 2, cy - foot[1] // 2
    x1, y1 = x0 + foot[0] - 1, y0 + foot[1] - 1
    for x in range(x0 - 1, x1 + 2):
        for y in range(y0 - 1, y1 + 3):
            LV[x, y] = L
            if ST[x, y] in ('.', 'w'):
                ST[x, y] = 'g'
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            blocked[x, y] = True
    door = (math.floor((x0 + x1) / 2), y1 + 1)
    ST[door] = 'c' if ST[door] == 'c' else 'd'
    ST[door[0], door[1] + 1] = ST[door]
    buildings.append(dict(spr=spr, x0=int(x0), y0=int(y0), door=[int(door[0]), int(door[1])]))

marks = {}
for kind, (px, py), L in MARKS:
    x, y = unproj(px, py, L)
    if LV[x, y] < 0:
        LV[x, y] = L
        ST[x, y] = 'g'
    marks.setdefault(kind, []).append((int(x), int(y)))
    if kind == 'bridge':
        continue
    if kind == 'windmill':
        for dx in (-1, 0):
            for dy in (-1, 0):
                blocked[x + dx, y + dy] = True
                LV[x + dx, y + dy] = LV[x, y]
    elif kind in ('stall', 'statue', 'tower', 'ruinarch', 'arch', 'well', 'anvil', 'banner1', 'banner2'):
        blocked[x, y] = True
    elif kind == 'gate':
        for dx in (-1, 0, 1):
            blocked[x + dx, y] = True
            LV[x + dx, y] = 0
    objs.append(dict(t=kind, x=int(x), y=int(y)))

# bridge: walkable planks across the stream around the mark
for (bx, by) in marks.get('bridge', []):
    for k in range(-4, 5):
        for (x, y) in ((bx + k, by), ):
            if 0 <= x < N and ST[x, y] == 'w':
                ST[x, y] = 'br'
    # make sure both banks connect
    for k in (-5, 5):
        if ST[bx + k, by] == 'w':
            ST[bx + k, by] = 'br'

# wheat field
for x in range(N):
    for y in range(N):
        if LV[x, y] >= 0 and not blocked[x, y]:
            px, py = proj(x, y, LV[x, y])
            if inside(WHEAT, px, py):
                ST[x, y] = 'd'
                objs.append(dict(t='wheat', x=x, y=y))


# ---- stairs ----
SD = {}
D4 = ((1, 0), (-1, 0), (0, 1), (0, -1))


def walk(x, y):
    return 0 <= x < N and 0 <= y < N and LV[x, y] >= 0 and not blocked[x, y] and ST[x, y] != 'w'


def can(a, b):
    (ax, ay), (bx, by) = a, b
    sa, sb = SD.get(a), SD.get(b)
    ha, hb = LV[a], LV[b]
    dx, dy = bx - ax, by - ay
    if not sa and not sb:
        return ha == hb
    if sb and not sa:
        if (dx, dy) == sb: return ha == hb
        if (dx, dy) == (-sb[0], -sb[1]): return ha == hb + 1
        return False
    if sa and not sb:
        if (dx, dy) == sa: return hb == ha + 1
        if (dx, dy) == (-sa[0], -sa[1]): return hb == ha
        return False
    return False


def try_stair(t, d):
    """Make tile t (level L) a stair climbing toward t+d (level L+1), approached from t-d (level L)."""
    x, y = t
    up, dn = (x + d[0], y + d[1]), (x - d[0], y - d[1])
    if t in SD or not walk(x, y) or not walk(*up) or not walk(*dn):
        return False
    if LV[up] != LV[t] + 1 or LV[dn] != LV[t] or up in SD or dn in SD:
        return False
    SD[t] = d
    return True


for (px, py), L in STAIRS:
    cx, cy = unproj(px, py, L)
    best = None
    for r in range(0, 8):
        for x in range(cx - r, cx + r + 1):
            for y in range(cy - r, cy + r + 1):
                if max(abs(x - cx), abs(y - cy)) != r or not (0 <= x < N and 0 <= y < N):
                    continue
                for d in D4:
                    if LV[x, y] == L and try_stair((x, y), d):
                        best = (x, y); break
                if best: break
            if best: break
        if best: break
    if not best:
        print('no stair near', (px, py), file=sys.stderr)

# ---- start spot and connectivity ----
start = marks['statue'][0]
start = (start[0], start[1] + 2)


def reach(src):
    seen = {src}
    q = deque([src])
    while q:
        a = q.popleft()
        for d in D4:
            b = (a[0] + d[0], a[1] + d[1])
            if b in seen or not walk(*b) or not can(a, b):
                continue
            seen.add(b); q.append(b)
    return seen


for it in range(40):
    R = reach(start)
    cand = None
    # any walkable tile not reached, adjacent to a reached tile one level apart -> stair
    for (x, y) in list(R):
        for d in D4:
            b = (x + d[0], y + d[1])
            if not walk(*b) or b in R:
                continue
            if LV[b] == LV[x, y] + 1 and try_stair((x, y), d):
                cand = 1; break
            if LV[b] == LV[x, y] - 1 and try_stair(b, (-d[0], -d[1])):
                cand = 1; break
        if cand: break
    if not cand:
        break

R = reach(start)
walkable = {(x, y) for x in range(N) for y in range(N) if walk(x, y)}
print('walkable', len(walkable), 'reached', len(R), 'stairs', len(SD), file=sys.stderr)

# ---- trees, bushes, rocks ----
rng = np.random.default_rng(7)
taken = set(SD) | {tuple(b['door']) for b in buildings} | {(b['door'][0], b['door'][1] + 1) for b in buildings}
for (x, y) in marks.get('gate', []):
    for k in range(1, 4): taken.add((x, y + k))
for k in range(-2, 3):
    for j in range(-2, 3): taken.add((start[0] + k, start[1] + j))
for (sx, sy), d in SD.items():
    taken |= {(sx + d[0], sy + d[1]), (sx - d[0], sy - d[1])}
treeset = set()
# The painting's pines are too close to its grass in colour to detect reliably, so woods are laid out as noise clumps on grass.
CLUMP = ndimage.gaussian_filter(rng.random((N, N)), 1.6)
CLUMP = (CLUMP - CLUMP.min()) / (CLUMP.max() - CLUMP.min())
order = sorted(walkable, key=lambda t: rng.random())
for (x, y) in order:
    if (x, y) in taken or ST[x, y] != 'g' or (x, y) in treeset:
        continue
    if CLUMP[x, y] < .31:
        continue
    if any((x + dx, y + dy) in treeset for dx, dy in D4):
        continue
    if any(ST[x + dx, y + dy] in ('d', 'c', 'br') for dx, dy in D4 if 0 <= x + dx < N and 0 <= y + dy < N) and rng.random() < .6:
        continue
    treeset.add((x, y))
# keep everything reachable: drop trees that cut off walkable ground
for t in list(treeset):
    blocked[t] = True
R0 = reach(start)
lost = [t for t in R if t not in R0 and t not in treeset]
if lost:
    for t in list(treeset):
        blocked[t] = False
        R1 = reach(start)
        if len(R1) > len(R0) + 1:   # freeing this tree opens more than its own tile
            treeset.discard(t)
            R0 = R1
        else:
            blocked[t] = True
for (x, y) in treeset:
    h = rng.random()
    objs.append(dict(t='tree', n='pine' if h < .55 else 'tree1' if h < .75 else 'tree2' if h < .9 else 'tree3', x=x, y=y))
# undergrowth on open grass
for (x, y) in order:
    if (x, y) in taken or (x, y) in treeset or ST[x, y] != 'g' or blocked[x, y]:
        continue
    h = rng.random()
    if h < .05:
        objs.append(dict(t='deco', n=rng.choice(['bush1', 'bush2', 'bushf', 'flowers', 'flower1', 'bush3', 'bush6', 'bush7', 'flower3', 'grasstuft']), x=x, y=y))
    elif h < .058:
        objs.append(dict(t='rock', n=rng.choice(['rock1', 'rock2', 'rock3', 'rock4']), x=x, y=y))
        blocked[x, y] = True

# fences along the wheat field's front edges
wheat = {(o['x'], o['y']) for o in objs if o['t'] == 'wheat'}
for (x, y) in wheat:
    for d in ((1, 0), (0, 1)):
        b = (x + d[0], y + d[1])
        if b not in wheat and walk(*b):
            objs.append(dict(t='fence', x=x, y=y, side='x' if d == (1, 0) else 'y'))

falls = []
for (px, py) in WATERFALLS:
    best = None
    for x in range(N):
        for y in range(N):
            if LV[x, y] < 0: continue
            qx, qy = proj(x, y, LV[x, y])
            d = (qx - px) ** 2 + (qy - py) ** 2
            if best is None or d < best[0]:
                best = (d, x, y)
    falls.append([best[1], best[2]])

# ---- write ----
rows = []
for y in range(N):
    r = ''
    for x in range(N):
        if LV[x, y] < 0:
            r += '..'
        else:
            r += {'g': 'g', 'd': 'd', 'c': 'c', 'w': 'w', 'br': 'b'}[ST[x, y]] + str(LV[x, y])
    rows.append(r)
out = dict(W=N, H=N, rows=rows, stairs=[[x, y, d[0], d[1]] for (x, y), d in SD.items()], buildings=buildings,
           objs=objs, falls=falls, start=list(start), marks={k: v for k, v in marks.items()})
with open('js/map-dawnspire.js', 'w') as f:
    f.write("'use strict';\n// Generated by art/maps/overworld.py from art/tiles2/maps-reference.png. rows[y] holds 2 chars per tile:\n")
    f.write("// ground (g grass, d dirt, c cobble, w water, b bridge, . void) and level digit.\nvar MAPS=window.MAPS||{};window.MAPS=MAPS;\n")
    f.write('MAPS.dawnspire=' + json.dumps(out, separators=(',', ':'), default=int) + ';\n')

# ---- debug picture: top-down map and the projection over the painting ----
col = {'g': (90, 160, 70), 'd': (190, 160, 110), 'c': (170, 170, 170), 'w': (60, 120, 200), 'br': (140, 100, 60)}
dbg = Image.new('RGB', (N * 8, N * 8), (20, 20, 30))
dd = ImageDraw.Draw(dbg)
for x in range(N):
    for y in range(N):
        if LV[x, y] < 0: continue
        c = col[ST[x, y]]; k = .6 + .2 * LV[x, y]
        c = tuple(min(255, int(v * k)) for v in c)
        if blocked[x, y]: c = (40, 70, 40)
        if (x, y) in SD: c = (255, 255, 0)
        if (x, y) in walkable and (x, y) not in R0 and not blocked[x, y]: c = (255, 0, 255)
        dd.rectangle([x * 8, y * 8, x * 8 + 7, y * 8 + 7], fill=c)
dbg.save('/tmp/ow-top.png')
ov = im.copy().convert('RGBA')
od = ImageDraw.Draw(ov, 'RGBA')
for x in range(N):
    for y in range(N):
        if LV[x, y] < 0: continue
        px, py = proj(x, y, LV[x, y])
        c = {0: (0, 0, 255, 90), 1: (0, 255, 0, 60), 2: (255, 160, 0, 90), 3: (255, 0, 0, 120)}[LV[x, y]]
        od.polygon([(px, py - 4), (px + 7.8, py), (px, py + 4), (px - 7.8, py)], fill=c)
        if (x, y) in SD: od.ellipse([px - 3, py - 3, px + 3, py + 3], fill=(255, 255, 0, 255))
ov.save('/tmp/ow-proj.png')
