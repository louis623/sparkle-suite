from PIL import Image, ImageFilter, ImageDraw, ImageChops
H=Image.open('mr-hero.png').convert('RGB'); k=1.25
def ch(b): return H.crop(tuple(int(x*k) for x in b))
def sw(p,w): return p.resize((w,int(p.height*w/p.width)),Image.LANCZOS)
def mask(sz,l=0,t=0,r=0,b=0):
    m=Image.new('L',sz,255); d=ImageDraw.Draw(m); W,Hh=sz
    for i in range(t): d.line((0,i,W,i),fill=int(255*i/t))
    for i in range(b): d.line((0,Hh-1-i,W,Hh-1-i),fill=int(255*i/b))
    m2=Image.new('L',sz,255); d2=ImageDraw.Draw(m2)
    for i in range(l): d2.line((i,0,i,Hh),fill=int(255*i/l))
    for i in range(r): d2.line((W-1-i,0,W-1-i,Hh),fill=int(255*i/r))
    return ImageChops.multiply(m,m2)
def base():
    c=Image.new('RGB',(1080,1920),(14,4,10)); g=ch((0,0,500,250)).resize((1080,1920)).filter(ImageFilter.GaussianBlur(30)); return g
floor=sw(ch((0,320,1024,576)),1500); bok=sw(ch((640,0,1024,330)),700); rib=sw(ch((0,220,620,390)),900)
def v(name,top=False):
    c=base()
    c.paste(floor,((1080-floor.width)//2+150,1920-floor.height),mask(floor.size,t=120))
    if top:
        f=floor.transpose(Image.FLIP_TOP_BOTTOM).transpose(Image.FLIP_LEFT_RIGHT); f=sw(f,1300); c.paste(f,((1080-f.width)//2,-80),mask(f.size,b=140))
    else:
        c=ImageChops.lighter(c,Image.new('RGB',c.size)); l=Image.new('RGB',c.size); l.paste(bok,(1080-bok.width+60,-40),mask(bok.size,l=200,b=200)); c=ImageChops.lighter(c,l)
    l=Image.new('RGB',c.size); l.paste(rib,(-80,1050),mask(rib.size,r=300,t=60,b=60)); c=ImageChops.lighter(c,l)
    c.save(f'mr/{name}-plate.jpg',quality=93)
v('v1'); v('v2'); v('v3',top=True)
