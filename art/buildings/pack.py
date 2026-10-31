# Fits each cut building to its tile footprint and writes assets/sprites/bld-<name>.png (stored at 2x game size)
# plus the metadata block for js/core.js (paste it into BLD). Afterwards compress with:
#   for f in assets/sprites/bld-*.png; do pngquant --quality=80-95 --speed 1 --force --output "$f" -- "$f"; done
# Footprint a x b: a tiles along the door (front-left) wall, b along the front-right wall.
import json,numpy as np
from PIL import Image
FOOT={'guild':(6,4),'forge':(4,5),'apothecary':(5,4),'mill':(5,4),'cottage':(3,4)}
SMOKE={'guild':(461,29),'forge':(402,7),'apothecary':(354,7),'cottage':(336,7)}  # chimney tops in cut-sprite pixels
meta={}
for n,(a,b) in FOOT.items():
    im=Image.open(f'art/buildings/{n}.png').convert('RGBA');m=np.array(im)[...,3]>0;h,w=m.shape
    bot=np.array([np.where(m[:,x])[0].max() if m[:,x].any() else -1 for x in range(w)])
    fy=bot.max();fx=int(np.median(np.where(bot>=fy-2)[0]))
    def walk(d):
        best=fx;miss=0;x=fx
        while 0<=x+d<w:
            x+=d
            if bot[x]>=fy-abs(x-fx)/2-4:best=x;miss=0
            else:
                miss+=1
                if miss>6:break
        return best
    lx,rx=walk(-1),walk(1)
    k=32*(a+b)/(rx-lx)                     # game px per sprite px
    cx=(lx+rx)/2;cy=fy-((fx-lx)+(rx-fx))/4  # centre of the base diamond
    out=im.resize((round(w*k*2),round(h*k*2)),Image.LANCZOS)
    # premultiplied resize to avoid magenta/dark fringes
    arr=np.array(im).astype(float);al=arr[...,3:]/255
    pre=Image.fromarray(np.dstack([arr[...,:3]*al,arr[...,3:]]).astype(np.uint8)).resize(out.size,Image.LANCZOS)
    r=np.array(pre).astype(float);a2=r[...,3:]/255;rgb=np.where(a2>0,r[...,:3]/np.maximum(a2,1e-6),0).clip(0,255)
    Image.fromarray(np.dstack([rgb,r[...,3:]]).astype(np.uint8)).save(f'assets/sprites/bld-{n}.png',optimize=True)
    e=dict(foot=[a,b],w=round(w*k,2),h=round(h*k,2),cx=round(cx*k,2),cy=round(cy*k,2),fx=round(fx*k,2),scale=round(k,3))
    if n in SMOKE:e['smoke']=[round(SMOKE[n][0]*k,2),round(SMOKE[n][1]*k,2)]
    meta[n]=e
print(json.dumps(meta))
