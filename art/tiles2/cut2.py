# Cuts art/tiles2/tileset-sheet.png (the ChatGPT "Dawnspire Isle / Ruptured Spire" tileset) into one atlas:
#   assets/sprites/tiles2.png  (everything stored at 2x game size)
#   js/tiles2.js               (T2: atlas rects and game-pixel size/anchor for each piece)
# Kinds:
#   top   - the top face of a slab, warped onto the game's 64x32 tile diamond
#   face  - the left or right side of a cube, flattened into a 32-wide strip (drawn skewed on terrace walls)
#   prop  - a standalone sprite, scaled to a target height in game px, anchored at its bottom centre
# Run from the repo root.
from PIL import Image
import numpy as np
from scipy import ndimage
import json

SRC = 'art/tiles2/tileset-sheet.png'
im = Image.open(SRC).convert('RGB')
A = np.array(im).astype(int)
BG = np.array([19, 20, 28])

# Segment boxes found by labelling the sheet (x0, y0, x1, y1).
SEG = {}
fg = np.abs(A - BG).sum(2) > 40
fg[:75] = False
lab, n = ndimage.label(ndimage.binary_closing(fg, iterations=2))
objs = ndimage.find_objects(lab)
sizes = ndimage.sum(fg, lab, range(1, n + 1))
k = 0
for i, o in enumerate(objs):
    if sizes[i] > 150:
        SEG[k] = (o[1].start, o[0].start, o[1].stop, o[0].stop)
        k += 1


def cut(box, pad=2):
    """Crop a box and make its background transparent (flood fill of bg-coloured pixels from the edges)."""
    x0, y0, x1, y1 = box
    x0, y0, x1, y1 = max(0, x0 - pad), max(0, y0 - pad), min(im.width, x1 + pad), min(im.height, y1 + pad)
    a = A[y0:y1, x0:x1]
    near = np.abs(a - BG).sum(2) < 46
    l2, _ = ndimage.label(near)
    edge = set(np.unique(np.concatenate([l2[0], l2[-1], l2[:, 0], l2[:, -1]]))) - {0}
    bgm = np.isin(l2, list(edge))
    alpha = (~bgm).astype(np.uint8) * 255
    out = Image.fromarray(np.dstack([a, alpha]).astype(np.uint8), 'RGBA')
    bb = out.getbbox()
    return out.crop(bb)


def premul_resize(img, size):
    a = np.array(img).astype(float)
    al = a[..., 3:] / 255
    pre = Image.fromarray(np.dstack([a[..., :3] * al, a[..., 3:]]).astype(np.uint8), 'RGBA').resize(size, Image.LANCZOS)
    r = np.array(pre).astype(float)
    al2 = r[..., 3:] / 255
    rgb = np.where(al2 > 0, r[..., :3] / np.maximum(al2, 1e-6), 0).clip(0, 255)
    return Image.fromarray(np.dstack([rgb, r[..., 3:]]).astype(np.uint8), 'RGBA')


def corners(img):
    """Top diamond of a slab/cube: top point, left and right corners."""
    a = np.array(img)[..., 3] > 0
    H, W = a.shape
    cols = np.where(a.any(0))[0]
    x0, x1 = cols.min(), cols.max()
    yl = np.where(a[:, x0:x0 + 3].any(1))[0].min()
    yr = np.where(a[:, x1 - 2:x1 + 1].any(1))[0].min()
    xc = (x0 + x1) / 2
    yt = np.where(a[:, int(xc) - 2:int(xc) + 3].any(1))[0].min()
    return x0, x1, xc, yt, yl, yr


def warp_top(img, W=128, H=64, inset=7):
    x0, x1, xc, yt, yl, yr = corners(img)
    x0 += inset; x1 -= inset; yt += inset * .5
    # Dest (u,v) -> src (x,y), affine through T(xc,yt)=(W/2,0), L(x0,yl)=(0,H/2), R(x1,yr)=(W,H/2)
    S = np.array([[xc, yt], [x0, yl], [x1, yr]], float)
    D = np.array([[W / 2, 0, 1], [0, H / 2, 1], [W, H / 2, 1]], float)
    M = np.linalg.solve(D, S)  # 3x2
    coef = (M[0, 0], M[1, 0], M[2, 0], M[0, 1], M[1, 1], M[2, 1])
    big = img.transform((W * 2, H * 2), Image.AFFINE, (coef[0] / 2, coef[1] / 2, coef[2], coef[3] / 2, coef[4] / 2, coef[5]), Image.BICUBIC)
    out = premul_resize(big, (W, H))
    # clip to the diamond
    m = Image.new('L', (W, H), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(m).polygon([(W / 2, 0), (W, H / 2), (W / 2, H), (0, H / 2)], fill=255)
    al = np.minimum(np.array(out)[..., 3], np.array(m))
    o = np.array(out); o[..., 3] = al
    return Image.fromarray(o, 'RGBA')


def warp_face(img, side, W=64, H=80, trim=0.0):
    """Flatten the left or right side face of a cube into a W x H strip."""
    x0, x1, xc, yt, yl, yr = corners(img)
    a = np.array(img)[..., 3] > 0
    yb = np.where(a.any(1))[0].max()
    yf = yl + (yl - yt)  # front corner of the top diamond
    h = yb - yf
    if side == 'L':
        P0, P1 = (x0 + 1, yl), (xc, yf)
    else:
        P0, P1 = (xc, yf), (x1 - 1, yr)
    # dest (u,v) -> src: x = P0x + u*(P1x-P0x)/W ; y = P0y + u*(P1y-P0y)/W + v*h/H
    top = 4 + h * trim  # skip the rim of the top face (and for plain rock, the bands at the top and bottom)
    hh = h - top - h * trim
    coef = ((P1[0] - P0[0]) / W, 0, P0[0], (P1[1] - P0[1]) / W, hh / H, P0[1] + top)
    return img.transform((W, H), Image.AFFINE, coef, Image.BICUBIC)


pieces = {}  # name -> (Image at 2x, meta)

TOPS = {'grass1': 6, 'grass2': 15, 'dirt1': 16, 'dirt2': 7, 'cobble1': 5, 'cobble2': 12,
        'df1': 8, 'df2': 10, 'df3': 11, 'df4': 17, 'df5': 18, 'df6': 19, 'drune': 9, 'dcrack': 59}
def clean_grass(t):
    """Paint out rocks and flowers: keep only grass-coloured pixels, fill the rest from a blur of the grass."""
    a = np.array(t).astype(float)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    grass = (g > r * 1.02) & (g > b * 1.15) & (al > 0)
    w = ndimage.gaussian_filter(grass.astype(float), 3)
    out = a.copy()
    for c in range(3):
        bl = ndimage.gaussian_filter(np.where(grass, a[..., c], 0), 3) / np.maximum(w, 1e-3)
        out[..., c] = np.where(grass, a[..., c] * .7 + bl * .3, bl)
    return Image.fromarray(out.clip(0, 255).astype(np.uint8), 'RGBA')


for nm, s in TOPS.items():
    t = warp_top(cut(SEG[s], 0))
    pieces[nm] = (t, dict(kind='top', gw=64, gh=32, ax=32, ay=0))
for nm, s in {'grass0': 6, 'grass0b': 15}.items():
    pieces[nm] = (clean_grass(warp_top(cut(SEG[s], 0))), dict(kind='top', gw=64, gh=32, ax=32, ay=0))
FACES = {'rock': 12, 'grassrock': 13, 'brick': 86, 'brick2': 82}
for nm, s in FACES.items():
    c = cut(SEG[s], 0)
    for side in 'LR':
        f = warp_face(c, side, trim=.14 if nm in ('rock', 'brick') else 0)
        pieces[nm + side] = (f, dict(kind='face', gw=32, gh=40))

# Props: name -> (segment index or manual box, target height in game px)
PROPS = {
    'tree1': (22, 86), 'tree2': (21, 92), 'pine': (20, 98), 'tree3': (31, 80),
    'bush1': (36, 26), 'bush2': (37, 28), 'bushf': (40, 24), 'flowers': (45, 18), 'flower1': (47, 16), 'bush3': (61, 22),
    'bush4': (108, 30), 'bush5': (109, 26), 'bush6': (114, 20), 'bush7': (115, 20), 'flower2': (113, 11), 'flower3': (116, 15),
    'flower4': (120, 11), 'sapling': (111, 28), 'plant': (41, 26), 'grasstuft': (62, 18), 'herbs': (50, 22),
    'rock1': (39, 30), 'rock2': (44, 28), 'rock3': (46, 28), 'rock4': (48, 16),
    'fence': (54, 26), 'fence2': (52, 28), 'post': (51, 28),
    'wall1': (53, 40), 'wall2': (57, 32),
    'bridge': (63, 52), 'banner1': (76, 58), 'banner2': (77, 58),
    'arch': (94, 100), 'ruinarch': (98, 72), 'pillar1': (107, 44), 'pillar2': (110, 44),
    'stall': (93, 78), 'well2': (95, 64), 'crate1': (102, 22), 'crate2': (119, 18), 'crate3': (112, 13), 'cart': (103, 26), 'lamp': (118, 24),
    'windmill': ((582, 633, 674, 812), 236), 'tower': ((671, 700, 750, 804), 150), 'wheat': ((525, 797, 566, 840), 22),
    'dpillar': (23, 84), 'darch': (28, 100), 'darch2': (49, 112), 'darch3': (104, 92), 'ddoor': (101, 100),
    'dwall1': (27, 86), 'dwall2': (24, 86), 'dwall3': (26, 96), 'dcell': (60, 104), 'dstairs': (42, 92), 'daltar': (70, 150),
    'dbanner': (73, 50), 'candle': (74, 46), 'candelabra': (69, 62), 'dbrazier': (75, 60), 'dchest': (85, 32), 'fountain': (81, 96),
    'railing': (88, 56), 'grate': (87, 10), 'grate2': (97, 11), 'rubble1': (84, 36), 'rubble2': (92, 34), 'dblock1': (66, 72),
    'dblock2': (91, 72), 'dbroken1': (105, 70), 'dbroken2': (106, 66), 'dcube1': (82, 52), 'dcube2': (86, 56), 'druin1': (38, 70),
    'druin2': (72, 82), 'druin3': (80, 88),
}
for nm, (s, th) in PROPS.items():
    box = SEG[s] if isinstance(s, int) else s
    c = cut(box)
    sc = th / c.height
    gw, gh = c.width * sc, th
    img = premul_resize(c, (max(1, round(gw * 2)), round(gh * 2)))
    pieces[nm] = (img, dict(kind='prop', gw=round(gw, 1), gh=gh, ax=round(gw / 2, 1), ay=gh - 1))

# Shelf-pack into one atlas
order = sorted(pieces, key=lambda n: -pieces[n][0].height)
W = 2048
x = y = rowh = 0
rects = {}
for nm in order:
    img = pieces[nm][0]
    if x + img.width + 2 > W:
        x = 0; y += rowh + 2; rowh = 0
    rects[nm] = (x, y, img.width, img.height)
    x += img.width + 2
    rowh = max(rowh, img.height)
H = y + rowh
atlas = Image.new('RGBA', (W, H))
for nm, (x, y, w, h) in rects.items():
    atlas.paste(pieces[nm][0], (x, y))
atlas.save('assets/sprites/tiles2.png', optimize=True)
# then compress: pngquant 256 --speed 1 --force --output assets/sprites/tiles2.png -- assets/sprites/tiles2.png
meta = {nm: dict(x=r[0], y=r[1], w=r[2], h=r[3], **pieces[nm][1]) for nm, r in rects.items()}
with open('js/tiles2.js', 'w') as f:
    f.write("'use strict';\n// Generated by art/tiles2/cut2.py. Atlas assets/sprites/tiles2.png, stored at 2x.\n")
    f.write('// x,y,w,h: atlas rect (2x px). gw,gh: size in game px. ax,ay: anchor in game px (props: bottom centre).\n')
    f.write('const T2=' + json.dumps(meta, separators=(',', ':')) + ';\n')
print('atlas', W, H, len(rects))
