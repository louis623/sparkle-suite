from PIL import Image, ImageFilter, ImageDraw
H=Image.open('ga-hero-poster.png').convert('RGB'); k=1204/1024
def ch(b): return H.crop(tuple(int(x*k) for x in b))
def sw(p,w): return p.resize((w,int(p.height*w/p.width)),Image.LANCZOS)
def base():
    b=ch((380,0,780,650)).filter(ImageFilter.GaussianBlur(4)); return b.resize((1080,1920),Image.LANCZOS).filter(ImageFilter.GaussianBlur(10))
def fpaste(c,p,xy,top=80,side=0):
    m=Image.new('L',p.size,255); d=ImageDraw.Draw(m)
    for i in range(top): d.line((0,i,p.width,i),fill=int(255*i/top))
    c.paste(p,xy,m.filter(ImageFilter.GaussianBlur(6))); return c
pile=sw(ch((0,430,1024,650)),1300); fall=ch((0,30,420,330))
def v(name,canopy=False,falls=True):
    c=base(); c=fpaste(c,pile,((1080-pile.width)//2,1920-pile.height))
    if canopy:
        cp=pile.transpose(Image.FLIP_TOP_BOTTOM); cp=sw(cp,1200); c=fpaste(c,cp.transpose(Image.FLIP_TOP_BOTTOM),(0,0)) if False else None or c
        m=Image.new('L',cp.size,255); d=ImageDraw.Draw(m)
        for i in range(90): d.line((0,cp.height-1-i,cp.width,cp.height-1-i),fill=int(255*i/90))
        c.paste(cp,((1080-cp.width)//2,-60),m)
    if falls:
        f=sw(fall,620); m=Image.new('L',f.size,0); ImageDraw.Draw(m).rectangle((40,20,f.width-60,f.height-60),255); c.paste(f,(-20,-10),m.filter(ImageFilter.GaussianBlur(30)))
        f2=sw(ch((850,80,1024,420)),300); m=Image.new('L',f2.size,0); ImageDraw.Draw(m).rectangle((30,20,f2.width-10,f2.height-30),255); c.paste(f2,(1080-f2.width+10,20),m.filter(ImageFilter.GaussianBlur(25)))
    c.save(f'ga/{name}-plate.jpg',quality=93)
v('v1'); v('v2'); v('v3',canopy=True,falls=False)
