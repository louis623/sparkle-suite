import card
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from card import W,H,FD,SX0,SX1,SY0,SY1
PAC=card.ASSETS+'fonts/google/Pacifico/Pacifico-Regular.ttf'
DMF=FD+'dm-sans/DMSans[opsz,wght].ttf'
PFD=FD+'playfair-display/PlayfairDisplay[wght].ttf'; PFI=FD+'playfair-display/PlayfairDisplay-Italic-VariableFont_wght.ttf'
REPO=card.REPO_ROOT+'/public/'
def vf(p,s,w=None,opsz=None):
    f=ImageFont.truetype(p,int(s))
    if w:
        ax=[a['name'] for a in f.get_variation_axes()]; f.set_variation_by_axes([opsz if n in (b'Optical size','Optical size') else w for n in ax])
    return f
DM_=dict(head=None,script=None,body=(DMF,'dm'))
# Lindsey: Mile High Fizz custom site on its own preset (alpine_opal per tests/mile-high-fizz-public-site.test.ts)
card.FONTSET['custom-lindsey']=dict(head=(PAC,'none'),script=(PAC,'none'),body=(DMF,'dm'))
card.THEMES['custom-lindsey']=dict(key='alpine_opal',qrkey='custom_lindsey',art=None,align='center',
   back='#1e1b4b',name='#f9a8d4',ink='#f0f9ff',sub='#c7d2fe',rule='#3b3878',title='#fff',script='#fff',scrim=None,nscale=0.9)
# Brittany: Britt with Bling custom site on its own preset (black_diamond per tests/britt-with-bling-public-site.test.ts)
card.FONTSET['custom-brittany']=dict(head=(PFD,[600]),script=(PFI,[500]),body=(DMF,'dm'))
card.THEMES['custom-brittany']=dict(key='black_diamond',qrkey='custom_brittany',art=None,align='center',
   back='#080808',name='#d4af37',ink='#f8f1dc',sub='#d9cba8',rule='#3a3220',title='#fff',script='#fff',scrim=None)
def grad_fill(x0,x1,stops):
    g=Image.new('RGB',(W,H)); d=ImageDraw.Draw(g)
    for x in range(W):
        t=min(1,max(0,(x-x0)/max(1,x1-x0)))
        for i in range(len(stops)-1):
            if stops[i][0]<=t<=stops[i+1][0]:
                u=(t-stops[i][0])/(stops[i+1][0]-stops[i][0]); col=tuple(int(stops[i][1][k]+(stops[i+1][1][k]-stops[i][1][k])*u) for k in range(3)); break
        d.line([(x,0),(x,H)],fill=col)
    return g
def text_on(im,x,y,txt,f,fill,shadow=170,glow=None):
    b=f.getbbox(txt); m=Image.new('L',(W,H),0); ImageDraw.Draw(m).text((x-b[0],y-b[1]),txt,font=f,fill=255)
    if glow: im.paste(Image.new('RGB',(W,H),glow),(0,0),m.filter(ImageFilter.GaussianBlur(14)).point(lambda v:int(v*0.55)))
    im.paste(Image.new('RGB',(W,H),0),(0,0),m.filter(ImageFilter.GaussianBlur(8)).point(lambda v:int(v*shadow/255)))
    if isinstance(fill,Image.Image): im.paste(fill,(0,0),m)
    else: im.paste(Image.new('RGB',(W,H),fill),(0,0),m)
def own_front(t,show,first):
    if t=='custom-lindsey':
        im=card.cover(Image.open(card.SRC+'mhf-f0.5.png').convert('RGB'),W,H)
        tf=lambda s: ImageFont.truetype(PAC,s); stops=[(0,(0xf4,0x72,0xd0)),(.52,(0xbd,0x7c,0xff)),(1,(0x60,0xa5,0xfa))]
        wf=vf(DMF,46,900,40); wtxt='WITH '+first.upper(); wcol='#ffffff'; wglow=None; lhk=1.25; start=118; scr=(12,4,28)
    else:
        im=card.cover(Image.open(REPO+'britt-with-bling/hero.jpeg').convert('RGB'),W,H)
        tf=lambda s: vf(PFD,s,900); stops=[(0,(0xd4,0xaf,0x37)),(.5,(0xee,0xdf,0xaf)),(1,(0x00,0xd9,0xff))]
        wf=vf(PFI,64,500); wtxt='with '+first; wcol='#00d9ff'; wglow=(0,217,255); lhk=1.08; start=124; scr=(0,0,0)
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).ellipse((90,120,1035,555),fill=(185 if t=='custom-lindsey' else 150)); im=Image.composite(Image.new('RGB',(W,H),scr),im,m.filter(ImageFilter.GaussianBlur(80)))
    maxw=SX1-SX0-80
    tl=None
    for ts in range(start,86,-2):
        f=tf(ts); tl=card.balanced(show,f,maxw,1)
        if tl: break
    if not tl:
        for ts in range(start,50,-2):
            f=tf(ts); tl=card.balanced(show,f,maxw,2)
            if tl and len(tl)*ts*lhk<=300: break
    lh=int(ts*lhk); hb=f.getbbox('H'); capH=hb[3]-hb[1]; wb=wf.getbbox('H'); wcap=wb[3]-wb[1]
    gap=int(ts*0.36); block=lh*(len(tl)-1)+capH+gap+wcap; y=(H-block)//2
    for l in tl:
        bb=f.getbbox(l); x=(W-(bb[2]-bb[0]))//2
        text_on(im,x,y+(bb[1]-hb[1]),l,f,grad_fill(x,x+bb[2]-bb[0],stops)); y+=lh
    y+=capH-lh+gap; bb=wf.getbbox(wtxt); x=(W-(bb[2]-bb[0]))//2
    text_on(im,x,y+(bb[1]-wb[1]),wtxt,wf,wcol,glow=wglow)
    return im
REPS={
 'custom-lindsey':dict(show='Mile High Fizz',first='Lindsey',name='Lindsey Chapman',email='lindseychapman1188@gmail.com',web='milehighfizz.com',phone='',social='@lindze1188'),
 'custom-brittany':dict(show='Britt with Bling',first='Brittany',name='Brittany Osborne',email='braxtonsherri33@gmail.com',web='brittwithbling.com',phone='Text (863) 208-2888',social='@brittwithbling'),
}
if __name__=='__main__':
    for t,r in REPS.items():
        card.REP.update(r)
        own_front(t,r['show'],r['first']).save(f'{t}-front.png'); own_front(t,card.LONG,r['first']).save(f'{t}-front-longtitle.png')
        fields=dict(card.ALL)
        if not r['phone']: fields.pop('phone')
        im,i=card.back(t,fields); im.save(f'{t}-back-all.png'); print(t,i)
        card.back(t,card.MIN)[0].save(f'{t}-back-min.png')
        R=Image.new('RGB',(20+3*1145,715),'#f3f1f6')
        for k,s in enumerate(['front','back-all','back-min']): R.paste(Image.open(f'{t}-{s}.png'),(20+k*1145,20))
        R.save(f'review-{t}.png')
