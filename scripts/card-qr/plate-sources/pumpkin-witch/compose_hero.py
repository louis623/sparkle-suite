from PIL import Image, ImageChops, ImageFilter, ImageDraw
D=Image.open('pw-hero-desktop.png').convert('RGB'); kd=1672/1024
W=Image.open('pw-witch.png').convert('RGBA').crop((0,19,1629,914)); B=Image.open('pw-bats.png').convert('RGBA')
bats=[B.crop((11,37,560,855)),B.crop((530,37,1240,855)),B.crop((1230,37,1758,855))]
bats=[b.crop(b.split()[3].getbbox()) for b in bats]
def cd(b): return D.crop(tuple(int(x*kd) for x in b))
def sw(p,w): return p.resize((w,int(p.height*w/p.width)),Image.LANCZOS)
def feather(p,f=40):
    m=Image.new('L',p.size,0); ImageDraw.Draw(m).rectangle((f,f,p.width-f,p.height-f),255)
    m=m.filter(ImageFilter.GaussianBlur(f/2)); return Image.composite(p,Image.new('RGB',p.size),m)
def put(c,p,xy):
    l=Image.new('RGB',c.size); l.paste(p,xy); return ImageChops.lighter(c,l)
def alpha(c,p,xy): c.paste(p,xy,p); return c
moon=cd((600,5,965,415)); jack=cd((58,215,372,576)); lp=cd((900,400,1024,505)).transpose(Image.FLIP_LEFT_RIGHT); rp=cd((900,400,1024,505))
def bottom(c,jw=470):
    p=feather(sw(jack,jw),40); c=put(c,p,((1080-p.width)//2,1920-p.height+10))
    p=feather(sw(lp,230),25); c=put(c,p,(30,1920-p.height-30)); p=feather(sw(rp,230),25); return put(c,p,(1080-p.width-30,1920-p.height-30))
def side_bats(c,ys=(640,1040)):
    c=alpha(c,sw(bats[0],190),(10,ys[0])); c=alpha(c,sw(bats[2],190),(880,ys[0]+40))
    c=alpha(c,sw(bats[1],180),(15,ys[1])); return alpha(c,sw(bats[1].transpose(Image.FLIP_LEFT_RIGHT),180),(885,ys[1]+30))
def base(): return Image.new('RGB',(1080,1920))
# V1 moon top-right + witch top-left, jack bottom, bats sides
c=base(); p=feather(sw(moon,330),30); c=put(c,p,(1080-p.width-20,-40))
c=alpha(c,sw(W,520),(40,20)); c=side_bats(c); c=bottom(c); c.save('pwh/v1-plate.jpg',quality=93)
# V2 witch across top, jack bottom, bats sides
c=base(); c=alpha(c,sw(W,680),(200,-10)); c=side_bats(c); c=bottom(c); c.save('pwh/v2-plate.jpg',quality=93)
# V3 moon top center with witch flying across it, jack bottom, bats sides
c=base(); p=feather(sw(moon,380),30); c=put(c,p,((1080-p.width)//2+60,-120))
c=alpha(c,sw(W,500),(250,40)); c=side_bats(c); c=bottom(c); c.save('pwh/v3-plate.jpg',quality=93)
