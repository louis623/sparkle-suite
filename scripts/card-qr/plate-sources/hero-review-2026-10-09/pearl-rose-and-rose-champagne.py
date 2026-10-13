from PIL import Image, ImageFilter, ImageDraw, ImageChops
import sys
H=Image.open(sys.argv[1]).convert('RGB'); out=sys.argv[2]; k=1.25
def ch(b): return H.crop(tuple(int(x*k) for x in b))
def sw(p,w): return p.resize((w,int(p.height*w/p.width)),Image.LANCZOS)
def mask(sz,l=0,t=0,r=0,b=0):
    W,Hh=sz; m=Image.new('L',sz,255); d=ImageDraw.Draw(m)
    for i in range(t): d.line((0,i,W,i),fill=int(255*i/t))
    for i in range(b): d.line((0,Hh-1-i,W,Hh-1-i),fill=int(255*i/b))
    m2=Image.new('L',sz,255); d2=ImageDraw.Draw(m2)
    for i in range(l): d2.line((i,0,i,Hh),fill=int(255*i/l))
    for i in range(r): d2.line((W-1-i,0,W-1-i,Hh),fill=int(255*i/r))
    return ImageChops.multiply(m,m2)
base=lambda: ch((120,40,540,220)).resize((1080,1920)).filter(ImageFilter.GaussianBlur(30))
floor=sw(ch((0,300,1024,576)),1500); corner=sw(ch((620,0,1024,330)),720)
def v(name,top=False,corner_on=True):
    c=base(); c.paste(floor,((1080-floor.width)//2+150,1920-floor.height),mask(floor.size,t=140))
    if top:
        f=sw(floor.transpose(Image.FLIP_TOP_BOTTOM).transpose(Image.FLIP_LEFT_RIGHT),1300); c.paste(f,((1080-f.width)//2,-80),mask(f.size,b=160))
    elif corner_on:
        c.paste(corner,(1080-corner.width+60,-40),mask(corner.size,l=220,b=220))
    c.save(f'{out}/{name}-plate.jpg',quality=93)
v('v1'); v('v2'); v('v3',top=True)
