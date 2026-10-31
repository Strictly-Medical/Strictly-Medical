# Fits each cut building (art/buildings/<name>.png) onto its tile footprint and writes assets/sprites/bld-<name>.png
# (stored at 2x game size) plus the metadata block for BLD in js/core.js. Afterwards compress with:
#   for f in assets/sprites/bld-*.png; do pngquant --quality=80-95 --speed 1 --force --output "$f" -- "$f"; done
#
# The generated art is drawn at a flatter angle than the game's 2:1 grid, so each half of the sprite (split at the
# front corner) gets its own horizontal scale plus a vertical shear of its columns. That maps the left, front and
# right base corners exactly onto the footprint's corners while keeping walls vertical.
# Footprint (a, b): a tiles along the front-left (door) wall, b along the front-right wall.
import json,numpy as np
from PIL import Image
FOOT={'guild':(6,4),'forge':(4,5),'apothecary':(5,4),'mill':(5,4),'cottage':(3,3)}
SMOKE={'guild':(461,29),'forge':(402,7),'apothecary':(354,7),'cottage':(336,7)}  # chimney tops in cut-sprite pixels
S2=2  # stored resolution multiplier
def premul_transform(im,size,coeffs):
    a=np.array(im).astype(float);al=a[...,3:]/255
    pre=Image.fromarray(np.dstack([a[...,:3]*al,a[...,3:]]).astype(np.uint8))
    t=np.array(pre.transform(size,Image.AFFINE,coeffs,resample=Image.BICUBIC)).astype(float)
    a2=t[...,3:]/255;rgb=np.where(a2>0,t[...,:3]/np.maximum(a2,1e-6),0).clip(0,255)
    return Image.fromarray(np.dstack([rgb,t[...,3:].clip(0,255)]).astype(np.uint8))
def edge_line(bot,xs):
    ys=bot[xs].astype(float);ok=ys>0;xs=xs[ok];ys=ys[ok];A=np.vstack([xs,np.ones_like(xs)]).T
    m,c=np.linalg.lstsq(A,ys,rcond=None)[0]
    for _ in range(3):
        res=np.abs(ys-(m*xs+c));k=res<max(3,np.percentile(res,55));m,c=np.linalg.lstsq(A[k],ys[k],rcond=None)[0]
    return m,c
meta={}
for n,(A,B) in FOOT.items():
    im=Image.open(f'art/buildings/{n}.png').convert('RGBA');m=np.array(im)[...,3]>0;h,w=m.shape
    bot=np.array([np.where(m[:,x])[0].max() if m[:,x].any() else -1 for x in range(w)])
    fy0=bot.max();fx0=int(np.median(np.where(bot>=fy0-2)[0]))
    mL,cL=edge_line(bot,np.arange(int(fx0*.2),int(fx0*.85)));mR,cR=edge_line(bot,np.arange(int(fx0+(w-fx0)*.15),int(fx0+(w-fx0)*.8)))
    fx=(cR-cL)/(mL-mR);fy=mL*fx+cL                       # front corner: where the two base lines meet
    onL=[x for x in range(0,int(fx)) if bot[x]>0 and abs(bot[x]-(mL*x+cL))<8];onR=[x for x in range(int(fx),w) if bot[x]>0 and abs(bot[x]-(mR*x+cR))<8]
    lx,rx=min(onL),max(onR);ly=mL*lx+cL;ry=mR*rx+cR;sl,sr=abs(mL),abs(mR)
    # Target (game px): front corner F', left corner F'+(-32A,-16A), right corner F'+(32B,-16B).
    aL=32*A/(fx-lx);aR=32*B/(rx-fx);k=(aL+aR)/2          # x scales per half, common vertical scale
    shL=(-16*A-k*(ly-fy))/(-32*A)                          # vertical shear per output px, left half (dy'/dx')
    shR=(-16*B-k*(ry-fy))/(32*B)
    # Output canvas: find bounds by mapping the source corners of each half.
    def fwd(x,y):
        if x<=fx:X=(x-fx)*aL;return X,k*(y-fy)+shL*X
        X=(x-fx)*aR;return X,k*(y-fy)+shR*X
    pts=[fwd(x,y) for x in(0,fx,w-1) for y in(0,h-1)]
    minx=min(p[0] for p in pts);maxx=max(p[0] for p in pts);miny=min(p[1] for p in pts);maxy=max(p[1] for p in pts)
    W=int(np.ceil((maxx-minx)*S2))+2;H=int(np.ceil((maxy-miny)*S2))+2
    Fx=-minx;Fy=-miny   # front corner in output game px
    out=Image.new('RGBA',(W,H))
    for half,(a,sh) in enumerate([(aL,shL),(aR,shR)]):
        # inverse map, output px (x',y') at S2 -> source (x,y)
        # X = x'/S2 - Fx ; x = fx + X/a ; y = fy + (y'/S2 - Fy - sh*X)/k
        c=(1/(S2*a),0,fx-Fx/a, -sh/(S2*k),1/(S2*k),fy-(Fy-sh*Fx)/k)
        part=premul_transform(im,(W,H),c);arr=np.array(part)
        cut=int(round(Fx*S2))
        if half==0:arr[:,cut:]=0
        else:arr[:,:cut]=0
        out.alpha_composite(Image.fromarray(arr))
    out.save(f'assets/sprites/bld-{n}.png',optimize=True)
    e=dict(foot=[A,B],w=round(W/S2,2),h=round(H/S2,2),cx=round(Fx+16*(B-A),2),cy=round(Fy-8*(A+B),2),fx=round(Fx,2))
    if n in SMOKE:
        X,Y=fwd(*SMOKE[n]);e['smoke']=[round(X+Fx,2),round(Y+Fy,2)]
    meta[n]=e
    print(f'# {n}: slopes {sl:.2f}/{sr:.2f} -> 0.50, x scales {aL:.2f}/{aR:.2f}, height scale {k:.2f}')
print(json.dumps(meta,separators=(',',':')))
