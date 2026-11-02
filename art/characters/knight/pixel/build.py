# Builds assets/sprites/knight.png from the SpriteCook pixel-art sheets in this folder.
# Rows: 0 walk (front), 1 walk (back), 2 sword attack (front), 3 sword attack (back); 8 frames each.
# Source art faces left / upper left; it is mirrored so the unflipped sheet faces down-right / up-right like the game expects.
# Pixels are kept 1:1 (the source knight is ~180px tall, i.e. 3x the game's ~60px figure). Run from the repo root.
from PIL import Image
import numpy as np
D='art/characters/knight/pixel/'
ROWS=['walk-front2','walk-back','attack-front','attack-back']
N=8
def frames(name):
    im=Image.open(D+name+'.png').convert('RGBA').transpose(Image.FLIP_LEFT_RIGHT)
    fw=im.width//N
    # transpose mirrored the whole strip, so frame order is reversed too
    return [im.crop((i*fw,0,(i+1)*fw,im.height)) for i in range(N)][::-1]
def anchor(fs):
    # feet line: lowest painted row over all frames; x: centre of the helmet in frame 0
    a=np.array(fs[0])[...,3]>0
    bot=max(np.where(np.array(f)[...,3].any(1))[0].max() for f in fs)
    rows=np.where(a.any(1))[0];top=rows.min()
    cols=np.where(a[top:top+12].any(0))[0]
    return (cols.min()+cols.max())/2,bot,bot-top
sheets=[frames(r) for r in ROWS]
anc=[anchor(fs) for fs in sheets]
for r,(x,b,h) in zip(ROWS,anc):print(r,'helm x',x,'feet',b,'height',h)
# common canvas: room on every side for the widest sword reach in any row
L=R=U=0
for fs,(x,b,h) in zip(sheets,anc):
    for f in fs:
        bb=f.getbbox()
        if not bb:continue
        L=max(L,x-bb[0]);R=max(R,bb[2]-x);U=max(U,b-bb[1])
L,R,U=int(np.ceil(L))+2,int(np.ceil(R))+2,int(U)+2
W,H=L+R,U+3
out=Image.new('RGBA',(W*N,H*len(ROWS)))
for j,(fs,(x,b,h)) in enumerate(zip(sheets,anc)):
    for i,f in enumerate(fs):
        out.alpha_composite(f,(i*W+int(round(L-x)),j*H+(U-b)))
out.save('assets/sprites/knight.png',optimize=True)
print('frame',W,H,'game px',W/3,H/3,'ax',L/3,'ay',U/3)
