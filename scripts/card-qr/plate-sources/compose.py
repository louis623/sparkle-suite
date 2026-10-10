"""Compose 1080x1920 flyer plates from black-background pieces (lighten blend).
usage: python3 compose.py <dir> <skin> glow=R,G,B base=R,G,B topw=760 topy=-110 topcrop=x0,y0,x1,y1 gar=y0,y1 dust=R,G,B"""
from PIL import Image, ImageChops, ImageDraw
import numpy as np, random, sys, os
args=dict(a.split('=',1) for a in sys.argv[3:]); d=sys.argv[1]; skin=sys.argv[2]
W,H=1080,1920
tup=lambda k,dflt: tuple(int(v) for v in args.get(k,dflt).split(','))
glow=tup('glow','70,28,6'); base0=tup('base','10,4,2')
yy,xx=np.mgrid[0:H,0:W]
g=np.clip(1-np.sqrt(((xx-540)/620)**2+((yy-1000)/900)**2),0,1)**2
arr=np.stack([base0[i]+glow[i]*g for i in range(3)],-1)
LIGHT=args.get('mode')=='light'
if LIGHT:
    arr=np.stack([base0[i]-glow[i]*(1-g)*0.6 for i in range(3)],-1)
canvas=Image.fromarray(np.clip(arr,0,255).astype('uint8'))
BL=ImageChops.darker if LIGHT else ImageChops.lighter
def screen(src,pos):
    x,y=pos; box=(max(x,0),max(y,0),min(x+src.width,W),min(y+src.height,H))
    s=src.crop((box[0]-x,box[1]-y,box[2]-x,box[3]-y))
    canvas.paste(BL(canvas.crop(box),s),box[:2])
def bbox(im,th=28):
    a=(np.asarray(im.convert('L'))<255-th) if LIGHT else (np.asarray(im.convert('L'))>th); ys=np.where(a.any(1))[0]; xs=np.where(a.any(0))[0]
    return xs[0],ys[0],xs[-1]+1,ys[-1]+1
top=Image.open(f'{d}/top.jpg').convert('RGB')
tc=tup('topcrop',','.join(map(str,bbox(top))))
top=top.crop(tc); tw=int(args.get('topw',760)); top=top.resize((tw,int(top.height*tw/top.width)),Image.LANCZOS)
screen(top,((W-tw)//2,int(args.get('topy',-110))))
gar=Image.open(f'{d}/garland.jpg').convert('RGB')
if 'gar' in args: y0,y1=tup('gar','0,0')
else: _,y0,_,y1=bbox(gar); y0-=6; y1+=6
band=gar.crop((0,y0,gar.width,y1)); gw=int(band.height*1500/band.width)
gw=int(args.get('garw',gw))
L=band.rotate(90,expand=True).resize((gw,1500),Image.LANCZOS); R=band.rotate(-90,expand=True).resize((gw,1500),Image.LANCZOS)
gy=int(args.get('gary',240)); screen(L,(-20,gy)); screen(R,(W-gw+20,gy))
fl=Image.open(f'{d}/floor.jpg').convert('RGB')
fy=int(args.get('floorcrop',0)); fl=fl.crop((0,fy,fl.width,fl.height))
fl=fl.resize((1080,int(fl.height*1080/fl.width)),Image.LANCZOS)
fa=np.asarray(fl).astype(float); n=min(90,fl.height); ramp=np.linspace(0,1,n)[:,None,None]
bgc=255.0 if LIGHT else 0.0
fa[:n]=fa[:n]*ramp+bgc*(1-ramp); fl=Image.fromarray(fa.astype('uint8'))
screen(fl,(0,H-fl.height+int(args.get('floordy',0))))
dr=ImageDraw.Draw(canvas); random.seed(3); dc=tup('dust','255,180,80')
for _ in range(240):
    x=random.randint(0,W);y=random.randint(0,H);r=random.choice([1,1,1,2,2,3]);k=random.uniform(.55,1)
    dr.ellipse((x-r,y-r,x+r,y+r),fill=tuple(int(c*k) for c in dc))
canvas.save(f'{d}/plate.jpg',quality=93)
out=f'/tmp/suite-smoke-pr75/public/amethyst/skins/{skin}/flyer/plate.webp'
os.makedirs(os.path.dirname(out),exist_ok=True); canvas.save(out,quality=92); print('ok',tc,(y0,y1),gw)
