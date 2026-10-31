# Cuts village-set.png into one transparent PNG per building and measures each base:
# the front corner (bottom point of the plinth) and the left and right corners, by walking the bottom outline.
import json,sys
from PIL import Image
import numpy as np
from scipy import ndimage
im=np.array(Image.open('art/buildings/village-set.png').convert('RGB')).astype(int)
r,g,b=im[...,0],im[...,1],im[...,2];mag=(r-g>90)&(b-g>90);fg=~mag
lab,_=ndimage.label(ndimage.binary_closing(fg,iterations=3))
ids=np.argsort(ndimage.sum(fg,lab,range(1,lab.max()+1)))[::-1][:5]+1
boxes=[(k,ndimage.find_objects((lab==k).astype(int))[0]) for k in ids]
# order: top row left->right, bottom row left->right
boxes.sort(key=lambda t:(t[1][0].start>400,t[1][1].start))
names=['guild','forge','apothecary','mill','cottage']
info={}
for name,(k,sl) in zip(names,boxes):
    m=(lab[sl]==k)&fg[sl];m=ndimage.binary_erosion(m,iterations=1)
    px=im[sl].copy();pink=(px[...,0]-px[...,1]>25)&(px[...,2]-px[...,1]>25)
    gray=(px[...,0]+px[...,1]*2+px[...,2])//4
    for c in range(3):px[...,c]=np.where(pink,gray,px[...,c])
    Image.fromarray(np.dstack([px,m*255]).astype(np.uint8)).save(f'art/buildings/{name}.png')
    h,w=m.shape;bot=np.array([np.where(m[:,x])[0].max() if m[:,x].any() else -1 for x in range(w)])
    info[name]=dict(w=w,h=h,bottom=bot.tolist())
json.dump(info,open('/tmp/claude-0/-home-claude/058051bd-5e81-5b7e-b768-05a2776daca9/scratchpad/bld_info.json','w'))
for n,v in info.items():
    bot=np.array(v['bottom']);fx=int(np.argmax(bot));print(n,v['w'],v['h'],'front corner x',fx,'y',bot[fx])
