from PIL import Image
import numpy as np, card
def L(c):
    c=[x/255 for x in c]; c=[x/12.92 if x<=0.03928 else ((x+0.055)/1.055)**2.4 for x in c]; return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def cr(a,b): a,b=sorted([L(a),L(b)]); return (b+0.05)/(a+0.05)
for t in card.ORDER:
    c=card.THEMES[t]; im,boxes=card.front(t); out=[]
    for bx,col in [(boxes[0],c['title']),(boxes[-1],c['script'])]:
        a=np.asarray(im.crop(bx)).reshape(-1,3).astype(float); tc=np.array(card.hexrgb(col))
        bg=a[np.linalg.norm(a-tc,axis=1)>120]; bgc=tuple(np.median(bg,0)) if len(bg) else (0,0,0)
        out.append('%.1f'%cr(card.hexrgb(col),bgc))
    print(t,'title',out[0],'script',out[1])
