# Builds js/map-spire.js (the first dungeon floor) from the lower half of art/tiles2/maps-reference.png.
# Same idea as overworld.py: the tile grid is projected onto the painting; warm lit stone is floor, the dark background is
# the abyss. Walls are raised along the back edges of every floor area (the front edges stay open over the drop, so rooms
# are never hidden), levels come from hand-marked regions, and stairs are added until everything connects.
# Rooms, the Warden's hall, the wounded, enemies and props are placed from hand-marked image points.
# Run from the repo root:  python3 art/maps/dungeon.py
import json, sys
from collections import deque
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

im = Image.open('art/tiles2/maps-reference.png').convert('RGB').crop((0, 505, 1536, 1024))
A = np.array(im).astype(int)
R_, G_, B_ = A[..., 0], A[..., 1], A[..., 2]
BR = A.mean(2)
_w = lambda a: ndimage.uniform_filter(a.astype(float), 5)
_rb, _br = _w(R_ - B_), _w(BR)
FLOORPX = (_rb > -4) & (_br > 48)
# rooms lit in purple or blue that the warm-stone test misses (full-image coords)
_FORCE = [[(1252, 735), (1330, 688), (1495, 722), (1420, 778)], [(225, 895), (300, 850), (395, 872), (330, 932)]]
from matplotlib.path import Path as _P
_yy, _xx = np.mgrid[0:A.shape[0], 0:A.shape[1]]
for _poly in _FORCE:
    _m = _P([(x, y - 505) for x, y in _poly]).contains_points(np.c_[_xx.ravel(), _yy.ravel()]).reshape(_xx.shape)
    FLOORPX |= _m & (_br > 38)
VOIDPX = (_br < 40)
VOIDPX[0:80, 0:280] = True      # title plate
VOIDPX[0:175, 1385:1536] = True # legend

F, ZL = 0.49, 40
CX, TY, OFF, N = 770, 8, 26, 78
Y0 = 505   # the crop's offset in the full reference, so marks below use full-image coordinates


def proj(x, y, L):
    u, v = x - y, x + y - 2 * OFF
    return CX + u * 32 * F, TY + (v * 16 + 16) * F - L * ZL * F


def unproj(px, py, L):
    py -= Y0
    u = (px - CX) / (32 * F)
    v = ((py + L * ZL * F - TY) / F - 16) / 16
    return int(round((u + v) / 2 + OFF)), int(round((v - u) / 2 + OFF))


def sample(mask, px, py, r=2):
    x, y = int(round(px)), int(round(py))
    if x < 2 or y < 2 or x >= mask.shape[1] - 2 or y >= mask.shape[0] - 2:
        return 0.0
    return mask[y - r:y + r + 1, x - r:x + r + 1].mean()


def inside(poly, px, py):
    py += Y0
    c = False
    for i in range(len(poly)):
        x1, y1 = poly[i]; x2, y2 = poly[(i + 1) % len(poly)]
        if (y1 > py) != (y2 > py) and px < (x2 - x1) * (py - y1) / (y2 - y1) + x1:
            c = not c
    return c


# Levels (full-image coords): the entrance landing is highest, the lower row of rooms is lowest; everything else is level 1.
LEVEL_POLYS = {
    2: [[(660, 520), (790, 520), (830, 560), (760, 600), (680, 585)]],
    0: [[(20, 780), (300, 760), (560, 800), (880, 815), (1060, 800), (1320, 790), (1500, 800), (1500, 1010), (20, 1010)]],
}
STAIRS = [((728, 600), 1), ((600, 775), 0), ((232, 765), 0), ((905, 790), 0), ((1160, 820), 0), ((1225, 690), 0), ((1272, 560), 1)]
ROOMS = {  # name: image point (full coords), level
    'entrance': ((725, 560), 2), 'hall': ((760, 705), 1), 'library': ((300, 690), 1), 'shrine': ((1080, 610), 1),
    'crystal': ((1360, 730), 1), 'fountain': ((312, 878), 0), 'throne': ((700, 880), 0), 'west': ((112, 812), 0),
    'east': ((1290, 868), 0), 'gallery': ((960, 820), 0), 'north': ((560, 580), 1), 'northeast': ((960, 590), 1),
}

LV = np.full((N, N), -1, int)
for x in range(N):
    for y in range(N):
        for L in (2, 1, 0):
            px, py = proj(x, y, L)
            if L != 1 and not any(inside(p, px, py) for p in LEVEL_POLYS[L]):
                continue
            if L == 1 and any(inside(p, px, py) for q in (2, 0) for p in LEVEL_POLYS[q]):
                continue
            if sample(FLOORPX, px, py) > .45 and sample(VOIDPX, px, py) < .3:
                LV[x, y] = L
                break
# drop specks, fill pinholes
land = LV >= 0
land = ndimage.binary_opening(land, iterations=1) | (ndimage.binary_closing(land, iterations=1) & land)
lab, n = ndimage.label(land)
sizes = ndimage.sum(land, lab, range(1, n + 1))
keepm = np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= 12])
filled = ndimage.binary_closing(keepm, iterations=1)
for x in range(N):
    for y in range(N):
        if not filled[x, y]:
            LV[x, y] = -1
        elif LV[x, y] < 0:
            nb = [LV[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if 0 <= x + dx < N and 0 <= y + dy < N and LV[x + dx, y + dy] >= 0]
            LV[x, y] = max(set(nb), key=nb.count) if nb else -1
for _ in range(2):
    L2 = LV.copy()
    for x in range(1, N - 1):
        for y in range(1, N - 1):
            if LV[x, y] < 0: continue
            nb = [LV[x + dx, y + dy] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)) if LV[x + dx, y + dy] >= 0]
            if len(nb) >= 3:
                m = max(set(nb), key=nb.count)
                if nb.count(m) >= 3 and m != LV[x, y]: L2[x, y] = m
    LV = L2

ST = np.full((N, N), 's', object)
D4 = ((1, 0), (-1, 0), (0, 1), (0, -1))
room_at = {k: unproj(px, py, L) for k, ((px, py), L) in ROOMS.items()}

# The Warden's hall: a clean flat rectangle around the throne room point.
tx, ty = room_at['throne']
BOSS = dict(x0=tx - 5, y0=ty - 4, x1=tx + 5, y1=ty + 5)
for x in range(BOSS['x0'], BOSS['x1'] + 1):
    for y in range(BOSS['y0'], BOSS['y1'] + 1):
        LV[x, y] = 0; ST[x, y] = 'b'
# rune circle in the central hall and runes in the Warden's hall
hx, hy = room_at['hall']
for x in range(hx - 2, hx + 3):
    for y in range(hy - 2, hy + 3):
        if LV[x, y] >= 0 and abs(x - hx) + abs(y - hy) <= 3: ST[x, y] = 'r'
for (x, y) in ((tx, ty), (tx - 2, ty), (tx + 2, ty), (tx, ty - 2), (tx, ty + 2)):
    ST[x, y] = 'r'

blocked = np.zeros((N, N), bool)
SD = {}


def walk(x, y):
    return 0 <= x < N and 0 <= y < N and LV[x, y] >= 0 and not blocked[x, y]


def can(a, b):
    sa, sb = SD.get(a), SD.get(b)
    ha, hb = LV[a], LV[b]
    dx, dy = b[0] - a[0], b[1] - a[1]
    if not sa and not sb: return ha == hb
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
    x, y = t
    up, dn = (x + d[0], y + d[1]), (x - d[0], y - d[1])
    if t in SD or not walk(x, y) or not walk(*up) or not walk(*dn): return False
    if LV[up] != LV[t] + 1 or LV[dn] != LV[t] or up in SD or dn in SD: return False
    if ST[t] == 'b': return False
    SD[t] = d
    return True


for (px, py), L in STAIRS:
    cx, cy = unproj(px, py, L)
    done = False
    for r in range(0, 8):
        for x in range(cx - r, cx + r + 1):
            for y in range(cy - r, cy + r + 1):
                if done or max(abs(x - cx), abs(y - cy)) != r or not (0 <= x < N and 0 <= y < N) or LV[x, y] != L: continue
                for d in D4:
                    if try_stair((x, y), d): done = True; break
        if done: break

start = room_at['entrance']
if LV[start] < 0:
    LV[start] = 2


def reach(src):
    seen = {src}; q = deque([src])
    while q:
        a = q.popleft()
        for d in D4:
            b = (a[0] + d[0], a[1] + d[1])
            if b in seen or not walk(*b) or not can(a, b): continue
            seen.add(b); q.append(b)
    return seen


for it in range(80):
    R = reach(start)
    added = False
    for (x, y) in sorted(R):
        for d in D4:
            b = (x + d[0], y + d[1])
            if not walk(*b) or b in R: continue
            if LV[b] == LV[x, y] + 1 and try_stair((x, y), d): added = True; break
            if LV[b] == LV[x, y] - 1 and try_stair(b, (-d[0], -d[1])): added = True; break
        if added: break
    if not added: break
TRIED = set()


def connect_once():
    """Join the nearest cut-off floor area to the reachable part: a 2-wide corridor, ending in a stair if the levels differ."""
    R = reach(start)
    rest = [(x, y) for x in range(N) for y in range(N) if LV[x, y] >= 0 and (x, y) not in R]
    if not rest:
        return False
    ra = np.array(sorted(R))
    best = None
    for b in rest:
        if b in TRIED: continue
        d = np.abs(ra - np.array(b)).sum(1)
        i = int(d.argmin())
        if best is None or d[i] < best[0]:
            best = (int(d[i]), tuple(int(v) for v in ra[i]), b)
    if best is None:
        return False
    _, a, b = best
    TRIED.add(b)
    lv = LV[a]
    x, y = a
    path = [a]
    while x != b[0]:
        x += 1 if b[0] > x else -1; path.append((x, y))
    while y != b[1]:
        y += 1 if b[1] > y else -1; path.append((x, y))
    d = (path[-1][0] - path[-2][0], path[-1][1] - path[-2][1])
    side = (d[1], d[0])
    for (px_, py_) in path[1:-1]:
        for (qx, qy) in ((px_, py_), (px_ + side[0], py_ + side[1])):
            if 0 <= qx < N and 0 <= qy < N and LV[qx, qy] < 0:
                LV[qx, qy] = lv
    hb = LV[b]
    if hb == lv:
        return True
    if abs(hb - lv) > 1:
        LV[b] = hb = lv + (1 if hb > lv else -1)
    if hb == lv + 1:   # climb onto b: stair just before it, with a level approach behind
        t = (b[0] - d[0], b[1] - d[1]); dn = (t[0] - d[0], t[1] - d[1])
        for q in (t, dn):
            if LV[q] < 0: LV[q] = lv
        if LV[t] == lv and LV[dn] == lv and t not in SD and dn not in SD and b not in SD:
            SD[t] = d
    else:              # step down onto b: b itself is the stair, with level ground beyond it
        dn = (b[0] + d[0], b[1] + d[1])
        if 0 <= dn[0] < N and 0 <= dn[1] < N:
            if LV[dn] < 0: LV[dn] = hb
            if LV[dn] == hb and b not in SD and dn not in SD:
                SD[b] = (-d[0], -d[1])
    return True


for rnd_ in range(60):
    for it in range(80):
        R = reach(start)
        added = False
        for (x, y) in sorted(R):
            for d in D4:
                b = (x + d[0], y + d[1])
                if not walk(*b) or b in R: continue
                if LV[b] == LV[x, y] + 1 and try_stair((x, y), d): added = True; break
                if LV[b] == LV[x, y] - 1 and try_stair(b, (-d[0], -d[1])): added = True; break
            if added: break
        if not added: break
    rest = sum(1 for x in range(N) for y in range(N) if LV[x, y] >= 0) - len(reach(start))
    if rest == 0 or not connect_once():
        break
R = reach(start)
# Anything still cut off is dropped.
for x in range(N):
    for y in range(N):
        if LV[x, y] >= 0 and (x, y) not in R: LV[x, y] = -1
print('floor', int((LV >= 0).sum()), 'stairs', len(SD), file=sys.stderr)

# Walls on the back edges: a void tile directly behind (-x or -y) a floor tile becomes wall, at that floor's level.
WALL = {}
for x in range(N):
    for y in range(N):
        if LV[x, y] >= 0: continue
        hs = [LV[x + dx, y + dy] for dx, dy in ((1, 0), (0, 1), (1, 1)) if 0 <= x + dx < N and 0 <= y + dy < N and LV[x + dx, y + dy] >= 0]
        if hs: WALL[(x, y)] = max(hs)

# ---- placements ----
objs = []
taken = set(SD) | {(s[0] + d[0], s[1] + d[1]) for s, d in SD.items()} | {(s[0] - d[0], s[1] - d[1]) for s, d in SD.items()}
rng = np.random.default_rng(3)


def spot(name, dx=0, dy=0, lv=None, block=True):
    cx, cy = room_at[name]
    cx += dx; cy += dy
    for r in range(0, 9):
        for x in range(cx - r, cx + r + 1):
            for y in range(cy - r, cy + r + 1):
                if max(abs(x - cx), abs(y - cy)) != r: continue
                if (x, y) in R and not blocked[x, y] and (x, y) not in taken and (lv is None or LV[x, y] == lv):
                    if block:
                        before = len(reach(start))
                        blocked[x, y] = True
                        if len(reach(start)) < before - 1:   # this spot would cut something off
                            blocked[x, y] = False
                            continue
                    taken.add((x, y))
                    return [int(x), int(y)]
    return None


starts = [spot('entrance', 0, 0, block=False) for _ in range(4)]
exitp = spot('throne', 4, 2, 0, block=False)
boss = [tx, ty]
taken.add(tuple(boss))
for k in range(-1, 2):
    for j in range(-1, 2): taken.add((tx + k, ty + j))
fallen = {'aldous': spot('shrine', 0, 1), 'wren': spot('crystal', 0, 1), 'hale': spot('fountain', -2, 1)}
for nm, (dx, dy) in {'fountain': (0, 0)}.items():
    p = spot('fountain', dx, dy)
    if p: objs.append(dict(t='t2', n='fountain', x=p[0], y=p[1]))
p = spot('shrine', 0, -2)
if p: objs.append(dict(t='t2', n='daltar', x=p[0], y=p[1]))
p = spot('crystal', -1, -1)
if p: objs.append(dict(t='t2', n='fountain', x=p[0], y=p[1], tint='violet'))
for (dx, dy) in ((-3, -3), (3, -3), (-3, 3), (3, 3)):
    p = spot('hall', dx, dy, 1)
    if p: objs.append(dict(t='t2', n='dpillar', x=p[0], y=p[1]))
for nm, offs in {'entrance': [(-2, 0), (2, 0)], 'hall': [(-4, 0), (4, 0)], 'library': [(-3, -1), (3, 1)], 'shrine': [(-2, 2), (2, 2)],
                 'crystal': [(3, 1)], 'fountain': [(2, 2)], 'throne': [(-5, -4), (5, -4), (-5, 5), (5, 5)], 'west': [(0, 0)],
                 'east': [(0, 0)], 'gallery': [(0, 0)], 'north': [(0, 0)], 'northeast': [(0, 0)]}.items():
    for (dx, dy) in offs:
        p = spot(nm, dx, dy)
        if p: objs.append(dict(t='brazier', x=p[0], y=p[1]))
for nm in ('library', 'northeast'):
    p = spot(nm, -2, -2)
    if p: objs.append(dict(t='t2', n='candelabra', x=p[0], y=p[1]))
for nm in ('library', 'east', 'west', 'northeast', 'gallery'):
    p = spot(nm, 1, -1)
    if p: objs.append(dict(t='chest', x=p[0], y=p[1]))
for nm, metal in (('north', 'copper'), ('library', 'copper'), ('west', 'copper'), ('gallery', 'copper'), ('northeast', 'copper'),
                  ('hall', 'copper'), ('east', 'iron'), ('crystal', 'iron'), ('shrine', 'iron'), ('west', 'iron')):
    p = spot(nm, int(rng.integers(-3, 4)), int(rng.integers(-3, 4)))
    if p: objs.append(dict(t='ore', metal=metal, x=p[0], y=p[1]))
for nm in ('north', 'west', 'east', 'gallery', 'library'):
    p = spot(nm, int(rng.integers(-3, 4)), int(rng.integers(-3, 4)))
    if p: objs.append(dict(t='t2', n=str(rng.choice(['rubble1', 'rubble2', 'dbroken1', 'dcube1'])), x=p[0], y=p[1]))
enemies = []
for nm, kinds in {'north': ['skeleton', 'skeleton'], 'library': ['archer', 'skeleton', 'skeleton'], 'hall': ['skeleton', 'skeleton', 'archer'],
                  'northeast': ['ghoul', 'ghoul'], 'shrine': ['ghoul', 'ghoul', 'archer'], 'crystal': ['ghoul', 'skeleton', 'archer'],
                  'west': ['skeleton', 'ghoul'], 'fountain': ['ghoul', 'ghoul'], 'gallery': ['skeleton', 'archer'], 'east': ['ghoul', 'skeleton']}.items():
    for i, k in enumerate(kinds):
        p = spot(nm, int(rng.integers(-3, 4)), int(rng.integers(-3, 4)), block=False)
        if p: enemies.append([k, p[0], p[1]])

rows = []
for y in range(N):
    r = ''
    for x in range(N):
        if LV[x, y] >= 0:
            r += ST[x, y] + str(LV[x, y])
        elif (x, y) in WALL:
            r += '#' + str(WALL[(x, y)])
        else:
            r += '..'
    rows.append(r)
out = dict(W=N, H=N, rows=rows, stairs=[[x, y, d[0], d[1]] for (x, y), d in SD.items()], objs=objs, enemies=enemies,
           starts=starts, exit=exitp, boss=boss, room=BOSS, fallen=fallen)
with open('js/map-spire.js', 'w') as f:
    f.write("'use strict';\n// Generated by art/maps/dungeon.py from the lower half of art/tiles2/maps-reference.png. rows[y]: 2 chars per tile,\n")
    f.write("// ground (s floor, b Warden's hall, r rune, # wall, . abyss) and level digit.\nvar MAPS=window.MAPS||{};window.MAPS=MAPS;\n")
    f.write('MAPS.spire=' + json.dumps(out, separators=(',', ':'), default=int) + ';\n')

ov = im.copy().convert('RGBA'); od = ImageDraw.Draw(ov, 'RGBA')
for x in range(N):
    for y in range(N):
        if LV[x, y] < 0 and (x, y) not in WALL: continue
        L = LV[x, y] if LV[x, y] >= 0 else WALL[(x, y)]
        px, py = proj(x, y, L)
        c = (255, 0, 0, 110) if (x, y) in WALL else {0: (0, 0, 255, 90), 1: (0, 255, 0, 70), 2: (255, 160, 0, 110)}[L]
        od.polygon([(px, py - 4), (px + 7.8, py), (px, py + 4), (px - 7.8, py)], fill=c)
        if (x, y) in SD: od.ellipse([px - 3, py - 3, px + 3, py + 3], fill=(255, 255, 0, 255))
ov.save('/tmp/dg-proj.png')
