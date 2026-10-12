import card, random, json
from PIL import Image, ImageDraw, ImageFilter
from card import W,H,SK,FD
CQ=json.load(open(card.OUT+'src/qr-custom.json'))
PF=dict(head=(FD+'playfair-display/PlayfairDisplay[wght].ttf',[600]),script=(FD+'playfair-display/PlayfairDisplay-Italic-VariableFont_wght.ttf',[500]),body=(FD+'dm-sans/DMSans[opsz,wght].ttf','dm'))
def glow(c,x,y,r,col,a):
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).ellipse((x-r,y-r,x+r,y+r),fill=a); c.paste(Image.new('RGB',(W,H),col),(0,0),m.filter(ImageFilter.GaussianBlur(r*0.6)))
def gnome_bg():
    c=card.cover(Image.open(SK+'gnome-garden/forest.webp').convert('RGB'),W,H,0.5,0.6)
    m=Image.new('L',(W,H),0); md=ImageDraw.Draw(m); md.ellipse((140,90,985,520),fill=150)
    c=Image.composite(Image.new('RGB',(W,H),'#0d1f17'),c,m.filter(ImageFilter.GaussianBlur(90)))
    ln=Image.open(SK+'gnome-garden/lantern.webp').convert('RGBA'); lw=82; ln=ln.resize((lw,int(ln.height*lw/ln.width)),Image.LANCZOS)
    for x in (58,W-58-lw):
        glow(c,x+lw//2,ln.height-60,70,(255,200,110),70); c.paste(ln,(x,-6),ln)
    g=Image.open(SK+'gnome-garden/gnome.webp').convert('RGBA'); gw=150; g=g.resize((gw,int(g.height*gw/g.width)),Image.LANCZOS)
    c.paste(g,(W-gw-70,H-g.height+2),g)
    random.seed(4); d=ImageDraw.Draw(c,'RGBA')
    for x,y in [(.06,.45),(.18,.78),(.87,.58),(.92,.24),(.37,.12),(.62,.86),(.27,.3),(.75,.2)]:
        glow(c,int(x*W),int(y*H),10,(255,230,164),120); d.ellipse((x*W-3,y*H-3,x*W+3,y*H+3),fill=(255,236,180,230))
    return c
def kelly_bg():
    c=card.cover(Image.open(SK+'neon-butterfly/kelly-studio-desktop.webp').convert('RGB'),W,H)
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).ellipse((220,140,905,560),fill=120)
    c=Image.composite(Image.new('RGB',(W,H),'#1a0420'),c,m.filter(ImageFilter.GaussianBlur(80)))
    for f,w,x,y,ang in [('pink',124,(W-124)//2,44,-4),('gold',92,214,92,-7),('violet',92,W-214-92,100,12)]:
        b=Image.open(SK+f'neon-butterfly/kelly-sign-{f}.png').convert('RGBA'); b=b.resize((w,int(b.height*w/b.width)),Image.LANCZOS).rotate(ang,expand=True,resample=Image.BICUBIC)
        from PIL import ImageChops
        gl=Image.new('RGB',(W,H),0); gl.paste(b.convert('RGB'),(x,y),b); gl=gl.filter(ImageFilter.GaussianBlur(10))
        c=ImageChops.screen(c,gl); c=ImageChops.screen(c,gl)
        c.paste(b,(x,y),b); c.paste(b,(x,y),b)
    return c
card.FONTSET['custom-kim']=PF; card.FONTSET['custom-kelly']=PF
card.THEMES['custom-kim']=dict(key='gnome_garden',qrkey='custom_kim',art=gnome_bg,align='top',maxw=690,cmaxh=300,ytop=150,
   back='#173126',name='#f4c45e',ink='#fff3d6',sub='#e6dcc0',rule='#3b5a48',title='#fff3d6',script='#f4c45e',scrim=(8,20,14))
card.THEMES['custom-kelly']=dict(key='neon_butterfly',qrkey='custom_kelly',art=kelly_bg,align='top',maxw=700,cmaxh=330,ytop=186,
   back='#2a0a2e',name='#ff7ad9',ink='#ffe6f7',sub='#e7b6d4',rule='#5a2560',title='#ffffff',script='#ffc24a',scrim=(26,4,32))
REPS={
 'custom-kim':dict(show='GofortheBling',first='Kim',name='Kim Goforth',email='ksgoforth64@gmail.com',web='goforthebling.com',phone='Text (919) 723-1010',social='@Goforthebling'),
 'custom-kelly':dict(show='Sparkly Butterflies',first='Kelly',name='Kelly Joseph',email='kellyygiselleee@gmail.com',web='sparklybutterflies.com',phone='Text (832) 729-5715',social='@kellygisellee1'),
}
# need icons in these name colours
if __name__=='__main__':
    for t,r in REPS.items():
        card.REP.update(r)
        im,b=card.front(t); im.save(f'{t}-front.png'); print(t,b)
        im,b=card.front(t,card.LONG); im.save(f'{t}-front-longtitle.png')
        im,i=card.back(t,card.ALL); im.save(f'{t}-back-all.png'); print(i)
        im,i=card.back(t,card.MIN); im.save(f'{t}-back-min.png')
        ims=[Image.open(f'{t}-{s}.png') for s in ['front','back-all','back-min']]
        R=Image.new('RGB',(20+3*1145,715),'#f3f1f6')
        for k,x in enumerate(ims): R.paste(x,(20+k*1145,20))
        R.save(f'review-{t}.png')
