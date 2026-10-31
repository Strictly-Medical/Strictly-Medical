# Builds assets/sprites/knight-walk.png: 4 walk frames + 1 idle frame, aligned on helmet x and feet y.
from PIL import Image
import numpy as np
from scipy import ndimage
def cut(path,n,flip=False):
    im=np.array(Image.open(path).convert('RGB')).astype(int)
    if flip:im=im[:,::-1]
    r,g,b=im[...,0],im[...,1],im[...,2];fg=~((r-g>90)&(b-g>90))
    lab,_=ndimage.label(ndimage.binary_closing(fg,iterations=4))
    ids=np.argsort(ndimage.sum(fg,lab,range(1,lab.max()+1)))[::-1][:n]+1
    out=[]
    for k in sorted(ids,key=lambda k:ndimage.find_objects((lab==k).astype(int))[0][1].start):
        sl=ndimage.find_objects((lab==k).astype(int))[0]
        m=ndimage.binary_erosion((lab[sl]==k)&fg[sl],iterations=1)
        px=im[sl].copy();pink=(px[...,0]-px[...,1]>25)&(px[...,2]-px[...,1]>25)
        gray=(px[...,0]+px[...,1]*2+px[...,2])//4
        for c in range(3):px[...,c]=np.where(pink,gray,px[...,c])
        rows=np.where(m.any(1))[0];top,bot=rows.min(),rows.max()
        # helmet: rows from top, ~8% of height
        hh=max(8,int((bot-top)*.09));cols=np.where(m[top:top+hh].any(0))[0]
        out.append(dict(img=Image.fromarray(np.dstack([px,m*255]).astype(np.uint8)),top=top,bot=bot,hx=cols.mean(),hw=cols.max()-cols.min()))
    return out
walk=cut('art/characters/knight/walk-front-sheet.png',4)
idle=cut('art/characters/knight/idle-front.png',1,flip=True)[0]
ref=np.mean([f['bot']-f['top'] for f in walk])*1.04;s=ref/(idle['bot']-idle['top'])  # standing is a touch taller than mid-stride
w,h=idle['img'].size;idle['img']=idle['img'].resize((round(w*s),round(h*s)),Image.LANCZOS)
for k in('top','bot','hx','hw'):idle[k]*=s
frames=walk+[idle]
L=max(f['hx'] for f in frames);R=max(f['img'].width-f['hx'] for f in frames);U=max(f['bot'] for f in frames)
cw=int(L+R)+6;ch=int(U)+6
tgt=58*3/max(f['bot']-f['top'] for f in walk)  # walk height -> 58 game px
print('idle height vs walk:',(idle['bot']-idle['top'])/max(f['bot']-f['top'] for f in walk))
W3,H3=round(cw*tgt),round(ch*tgt)
sheet=Image.new('RGBA',(W3*len(frames),H3))
for i,f in enumerate(frames):
    c=Image.new('RGBA',(cw,ch));c.alpha_composite(f['img'],(int(round(L-f['hx']))+3,int(round(ch-3-f['bot']))))
    a=np.array(c).astype(float);al=a[...,3:]/255
    pre=Image.fromarray(np.dstack([a[...,:3]*al,a[...,3:]]).astype(np.uint8)).resize((W3,H3),Image.LANCZOS)
    r=np.array(pre).astype(float);al2=r[...,3:]/255;rgb=np.where(al2>0,r[...,:3]/np.maximum(al2,1e-6),0).clip(0,255)
    sheet.paste(Image.fromarray(np.dstack([rgb,r[...,3:]]).astype(np.uint8)),(i*W3,0))
sheet.save('assets/sprites/knight-walk.png',optimize=True)
print('frame',W3/3,H3/3,'ax',(L+3)*tgt/3,'ay',(ch-3)*tgt/3)
