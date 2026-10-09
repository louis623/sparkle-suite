from PIL import Image, ImageChops, ImageDraw
import numpy as np, random, sys
W,H=1080,1920
yy,xx=np.mgrid[0:H,0:W]
d=np.sqrt(((xx-540)/620)**2+((yy-1000)/900)**2); g=np.clip(1-d,0,1)**2
base=np.zeros((H,W,3)); base[...,0]=10+70*g; base[...,1]=4+28*g; base[...,2]=2+6*g
canvas=Image.fromarray(base.astype('uint8'))
def screen(dst,src,pos):
    x,y=pos; box=(max(x,0),max(y,0),min(x+src.width,W),min(y+src.height,H))
    s=src.crop((box[0]-x,box[1]-y,box[2]-x,box[3]-y))
    dst.paste(ImageChops.lighter(dst.crop(box),s),box[:2])
cat=Image.open('pc-cat-band.jpg').convert('RGB').crop((230,20,1050,560))  # 820x540, eyes ~y 300 in src -> 280 in crop
cw=760; cat=cat.resize((cw,int(540*cw/820)),Image.LANCZOS)  # eyes at ~260 scaled -> want ~150
screen(canvas,cat,((W-cw)//2,-110))
band=Image.open('pc-vine-garland.jpg').convert('RGB').crop((0,265,1280,445))
L=band.rotate(90,expand=True).resize((211,1500),Image.LANCZOS); R=band.rotate(-90,expand=True).resize((211,1500),Image.LANCZOS)
screen(canvas,L,(-20,240)); screen(canvas,R,(W-191,240))
floor=Image.open('pc-floor-band.jpg').convert('RGB').resize((1080,608),Image.LANCZOS)
screen(canvas,floor,(0,H-608))
dr=ImageDraw.Draw(canvas); random.seed(3)
for _ in range(260):
    x=random.randint(0,W);y=random.randint(0,H);r=random.choice([1,1,1,2,2,3])
    dr.ellipse((x-r,y-r,x+r,y+r),fill=random.choice([(255,170,60),(255,210,120),(255,140,40)]))
canvas.save('pumpkin-cat-plate-composite.jpg',quality=93)
canvas.save('/tmp/suite-smoke-pr75/public/amethyst/skins/halloween-pumpkin-cat/flyer/plate.webp',quality=92)
