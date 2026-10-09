from PIL import Image, ImageChops, ImageFilter, ImageDraw
M=Image.open('pc-hero-mobile.png').convert('RGB'); D=Image.open('pc-hero-desktop.png').convert('RGB')
km=1254/655; kd=1672/1024
def cm(b): return M.crop(tuple(int(x*km) for x in b))
def cd(b): return D.crop(tuple(int(x*kd) for x in b))
def sw(p,w): return p.resize((w,int(p.height*w/p.width)),Image.LANCZOS)
def feather(p,f=40):
    m=Image.new('L',p.size,0); ImageDraw.Draw(m).rectangle((f,f,p.width-f,p.height-f),255)
    m=m.filter(ImageFilter.GaussianBlur(f/2)); b=Image.new('RGB',p.size,(0,0,0)); return Image.composite(p,b,m)
def put(c,p,xy):
    l=Image.new('RGB',c.size,(0,0,0)); l.paste(p,xy); return ImageChops.lighter(c,l)
cat=cm((228,40,505,268)); jack_scene=cm((0,250,655,655)); jack=cm((110,250,545,600))
lcl=cm((0,370,128,560)); rcl=cm((530,370,655,560))
def base(): return Image.new('RGB',(1080,1920),(0,0,0))
# V1 cat top, full hero bottom
c=base(); p=feather(sw(cat,500),30); c=put(c,p,((1080-p.width)//2,-10))
p=feather(sw(jack_scene,860),50); c=put(c,p,((1080-p.width)//2,1920-p.height+20)); c.save('pch/v1-plate.jpg',quality=93)
# V2 desktop-style: cat top-right corner, jack bottom-right, black pumpkins bottom-left
c=base(); p=feather(sw(cat,330),25); c=put(c,p,(1080-p.width-10,-10))
p=feather(sw(jack,600),45); c=put(c,p,(1080-p.width+40,1920-p.height+10))
p=feather(sw(lcl,420),35); c=put(c,p,(-20,1920-p.height-10)); c.save('pch/v2-plate.jpg',quality=93)
# V3 cat top, black pumpkin clusters up the sides, jack bottom center
c=base(); p=feather(sw(cat,500),30); c=put(c,p,((1080-p.width)//2,-10))
for y in (560,900):
    p=feather(sw(lcl,250),25); c=put(c,p,(-40,y)); p=feather(sw(rcl,250),25); c=put(c,p,(1080-p.width+40,y))
p=feather(sw(jack,560),45); c=put(c,p,((1080-p.width)//2,1920-p.height+10))
p=feather(sw(lcl,300),30); c=put(c,p,(-30,1920-p.height)); p=feather(sw(rcl,300),30); c=put(c,p,(1080-p.width+30,1920-p.height))
c.save('pch/v3-plate.jpg',quality=93)
