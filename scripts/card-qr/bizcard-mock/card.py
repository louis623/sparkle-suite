import json, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
SK='/tmp/suite-smoke-pr75/public/amethyst/skins/'
MP='/workspace/qr-flyer-plan/plates/morganite/'
PF='/usr/share/fonts/truetype/sand-box/google/Poppins/Poppins-'
GV='/tmp/suite-smoke-pr75/lib/workspace/card-qr/fonts/great-vibes/GreatVibes-Regular.ttf'
OUT='/workspace/bizcard-mock/'
W,H=1125,675; TRIM=37.5; SAFE=TRIM+45
SX0,SY0,SX1,SY1=int(SAFE)+1,int(SAFE)+1,W-int(SAFE)-1,H-int(SAFE)-1
MINPX=34  # 8pt @300dpi
FD='/tmp/suite-smoke-pr75/lib/workspace/card-qr/fonts/'
# site theme fonts (public/amethyst/homepage.jsx FONTS + lib/amethyst/appearance-presets.ts)
FONTSET={
 'pumpkin-cat':dict(head=(FD+'gelasio/Gelasio[wght].ttf',[600]),script=(OUT+'src/fonts/Gelasio-Italic.ttf',[500]),body=(FD+'arimo/Arimo[wght].ttf',None)),
 'amethyst':dict(head=(FD+'italiana/Italiana-Regular.ttf',None),script=(FD+'italiana/Italiana-Regular.ttf',None),body=(FD+'inter/Inter[opsz,wght].ttf','inter')),
 'midnight-rose':dict(head=(FD+'playfair-display/PlayfairDisplay[wght].ttf',[600]),script=(FD+'playfair-display/PlayfairDisplay-Italic-VariableFont_wght.ttf',[500]),body=(FD+'dm-sans/DMSans[opsz,wght].ttf','dm')),
 'morganite':dict(head=(FD+'playfair-display/PlayfairDisplay[wght].ttf',[500]),script=(FD+'playfair-display/PlayfairDisplay-Italic-VariableFont_wght.ttf',[500]),body=(FD+'dm-sans/DMSans[opsz,wght].ttf','dm')),
}
_G='/usr/share/fonts/truetype/sand-box/google/'; _FS=OUT+'src/fonts/fs/'
def _pf(w): return dict(head=(FD+'playfair-display/PlayfairDisplay[wght].ttf',[w]),script=(FD+'playfair-display/PlayfairDisplay-Italic-VariableFont_wght.ttf',[500]),body=(FD+'dm-sans/DMSans[opsz,wght].ttf','dm'))
for _t,_w in [('pumpkin-witch',600),('gilded-autumn',500),('pearl-rose',600),('rose-champagne',600),('moonstone',600),('rose-gold',600)]: FONTSET[_t]=_pf(_w)
FONTSET['emerald-garden']=dict(head=(GV,'none'),script=(GV,'none'),body=({400:_G+'Lato/Lato-Regular.ttf',500:_G+'Lato/Lato-Regular.ttf',600:_G+'Lato/Lato-Bold.ttf',700:_G+'Lato/Lato-Bold.ttf'},400))
_SW=_FS+'switzer/Switzer_Complete/Fonts/WEB/fonts/Switzer-'
FONTSET['garnet']=dict(head=(_FS+'boska/Boska_Complete/Fonts/WEB/fonts/Boska-Bold.ttf','none'),script=(_FS+'boska/Boska_Complete/Fonts/WEB/fonts/Boska-MediumItalic.ttf','none'),body=({400:_SW+'Regular.ttf',500:_SW+'Medium.ttf',600:_SW+'Semibold.ttf',700:_SW+'Bold.ttf'},500))
_MD=_FS+'melodrama/Melodrama_Complete/Fonts/WEB/fonts/Melodrama-'
FONTSET['amber']=dict(head=(_MD+'Semibold.ttf','none'),script=(_MD+'Medium.ttf','none'),body=(FD+'nunito/Nunito[wght].ttf',{'Weight':500}))
FONTSET['velvet']=dict(head=(FD+'bitter/Bitter[wght].ttf',{'Weight':600}),script=(_G+'Bitter/Bitter-Italic-VariableFont_wght.ttf',{'Weight':500}),body=(FD+'archivo/Archivo[wdth,wght].ttf',{'Weight':500,'Width':100}))
CUR=['amethyst']
def _mk(kind,s,wt=None):
    p,ax=FONTSET[CUR[0]][kind]
    if isinstance(p,dict):
        w=wt or ax; return ImageFont.truetype(p[min(p,key=lambda k:abs(k-w))],int(s))
    f=ImageFont.truetype(p,int(s))
    if ax=='none': return f
    if isinstance(ax,dict):
        vals=[]
        for a in f.get_variation_axes():
            n=a['name'].decode() if isinstance(a['name'],bytes) else a['name']
            vals.append(wt if (n=='Weight' and wt) else ax.get(n,a['default']))
        f.set_variation_by_axes(vals); return f
    if ax=='inter': f.set_variation_by_axes([min(32,max(14,s*0.75)),wt or 450])
    elif ax=='dm': f.set_variation_by_axes([40,wt or 500])
    elif ax is None and kind=='body': f.set_variation_by_axes([wt or 400])
    elif isinstance(ax,list): f.set_variation_by_axes(ax)
    return f
def HEAD(s): return _mk('head',s)
def SCRIPT(s): return _mk('script',s)
def BODY(s,wt=None): return _mk('body',s,wt)
Q=json.load(open(OUT+'src/qr.json'))
def F(w,s): return ImageFont.truetype(PF+w+'.ttf',int(s))
DMF='/tmp/suite-smoke-pr75/lib/workspace/card-qr/fonts/dm-sans/DMSans[opsz,wght].ttf'

def hexrgb(h): h=h.lstrip('#'); return tuple(int(h[i:i+2],16) for i in (0,2,4))
THEMES={
 'pumpkin-cat':dict(key='halloween_pumpkin_cat',art=SK+'halloween-pumpkin-cat/hero-desktop.webp',align='left',tw=0.47,
   back='#1c0e08',name='#ffa04d',ink='#fff4e8',sub='#f0c9a0',rule='#5e3218',title='#fff4e8',script='#ffa04d',scrim=(10,5,3)),
 'amethyst':dict(key='amethyst',art=SK+'am01-unicorn/hero-poster.webp',align='left',tw=0.40,
   back='#26105c',name='#ff8fd0',ink='#ffffff',sub='#cdb8ff',rule='#4f3398',title='#ffffff',script='#ff9bd6',scrim=(20,6,60)),
 'midnight-rose':dict(key='midnight_rose',art=SK+'midnight-rose/hero-poster.webp',align='top',
   back='#2a1218',name='#efb5a3',ink='#fff1ea',sub='#e7c2b6',rule='#5a303b',title='#fff1ea',script='#efb5a3',scrim=(20,8,12)),
 'morganite':dict(key='sparkle_suite_morganite',art=None,align='center',
   back='#4a1838',name='#ffb8dc',ink='#ffffff',sub='#f3cfe2',rule='#74385e',title='#3a1630',script='#d81b8a',scrim=None,nogen=('#fff8fa','#ee2c9b')),
 'pumpkin-witch':dict(key='halloween_pumpkin_witch',art='witch',align='left',tw=0.44,
   back='#1c0e08',name='#ff8a3d',ink='#fff4e8',sub='#f0c9a0',rule='#5e3218',title='#fff4e8',script='#ff8a3d',scrim=None),
 'gilded-autumn':dict(key='gilded_autumn',art=SK+'gilded-autumn/hero-poster.webp',align='center',panel='#fff6ea',frost=(0.42,9),cmaxh=300,hmax=120,
   back='#3a2410',name='#f2b766',ink='#fff6ea',sub='#e8cfa8',rule='#6a4826',title='#3a2410',script='#6a2c0e',scrim=None),
 'pearl-rose':dict(key='pearl_rose',art=SK+'pearl-rose/hero-poster.webp',align='top',lscrim='#fff8f6',
   back='#3a2430',name='#f3b9c4',ink='#fff8f6',sub='#ecd3d9',rule='#654552',title='#3a2430',script='#954354',scrim=None),
 'rose-champagne':dict(key='rose_champagne',art=SK+'rose-champagne/hero-poster.webp',align='top',lscrim='#fff7f4',lstr=245,
   back='#45232d',name='#f6c1b0',ink='#fff7f4',sub='#efd4cc',rule='#6e4450',title='#3a2430',script='#82344a',scrim=None),
 'moonstone':dict(key='moonstone',art=None,align='center',nogen=('#1c1631','#c9bddf'),
   back='#1c1630',name='#c4b0ff',ink='#f4f0ff',sub='#c9bddf',rule='#3d3460',title='#f4f0ff',script='#c4b0ff',scrim=None),
 'emerald-garden':dict(key='emerald_garden',art=None,align='center',hmax=170,nscale=1.3,cmaxh=290,nogen=('#f2fcf6','#059669'),
   back='#0f3a2e',name='#86e3bb',ink='#f3fbf6',sub='#bfe3d2',rule='#2b5f4e',title='#123028',script='#047857',scrim=None),
 'rose-gold':dict(key='rose_gold',art=None,align='center',nogen=('#fef5f6','#e04f73'),
   back='#4a1e2b',name='#f7a8bb',ink='#fff5f6',sub='#f0cfd7',rule='#74404f',title='#3a1824',script='#b8304f',scrim=None),
 'garnet':dict(key='garnet',art=None,align='center',nogen=('#fff5f4','#B91C1C'),
   back='#4a0f16',name='#ff9e9e',ink='#fff5f5',sub='#f2cccc',rule='#73303a',title='#3a1014',script='#a51818',scrim=None),
 'amber':dict(key='amber',art=None,align='center',nogen=('#fffcf8','#F97316'),
   back='#4a2608',name='#ffb46b',ink='#fff8f1',sub='#f2d8b8',rule='#734a26',title='#3a220c',script='#b4500c',scrim=None),
 'velvet':dict(key='velvet',art=None,align='center',nogen=('#1a1023','#d2c0ea'),
   back='#1a1024',name='#d3a6ff',ink='#f7efff',sub='#d2c0ea',rule='#3e2a55',title='#f7efff',script='#d3a6ff',scrim=None),
}
ORDER=['pumpkin-cat','pumpkin-witch','amethyst','gilded-autumn','midnight-rose','pearl-rose','rose-champagne','morganite','moonstone','emerald-garden','rose-gold','garnet','amber','velvet']
REP=dict(show="Dude's Fizzfest",first='Louis',name='Louis Chapman',role='Independent Bomb Party Representative',
  email='louis@dudesfizzfest.com',web='dudesfizzfest.com',phone='Text (555) 201-4410',code='FIZZ10',social='@dudesfizzfest',qrlabel='VIP Facebook Group')

def cover(im,w,h,fx=0.5,fy=0.5):
    s=max(w/im.width,h/im.height); im=im.resize((round(im.width*s),round(im.height*s)),Image.LANCZOS)
    x=int((im.width-w)*fx); y=int((im.height-h)*fy); return im.crop((x,y,x+w,y+h))
_d=ImageDraw.Draw(Image.new('L',(1,1)))
def tw(t,f): b=_d.textbbox((0,0),t,font=f); return b[2]-b[0]
def wrap(t,f,w):
    lines=['']
    for wd in t.split():
        tr=(lines[-1]+' '+wd).strip()
        if tw(tr,f)<=w or not lines[-1]: lines[-1]=tr
        else: lines.append(wd)
    return lines
def balanced(t,f,w,maxl):
    """fewest lines that fit, then balance line lengths"""
    words=t.split(); best=None
    for n in range(1,maxl+1):
        if n>len(words): break
        # try all splits into n lines (titles are short)
        import itertools
        for cut in itertools.combinations(range(1,len(words)),n-1):
            idx=(0,)+cut+(len(words),); ls=[' '.join(words[idx[i]:idx[i+1]]) for i in range(n)]
            m=max(tw(l,f) for l in ls)
            if m<=w and (best is None or m<best[0]): best=(m,ls)
        if best: return best[1]
    return None

def morganite_bg():
    blush=Image.new('RGB',(W,H),'#fbe9f1')
    g=Image.new('RGB',(W,H),'#fff7fa'); m=Image.new('L',(W,H),0); ImageDraw.Draw(m).ellipse((180,120,945,600),fill=255)
    bg=Image.composite(g,blush,m.filter(ImageFilter.GaussianBlur(140)))
    top=Image.open(MP+'top.jpg').convert('RGB').crop((0,30,1280,460))  # jeweled crown garland (Morganite plate art)
    tw_=700; top=top.resize((tw_,int(430*tw_/1280)),Image.LANCZOS)
    lay=Image.new('RGB',(W,H),'white'); lay.paste(top,((W-tw_)//2,62)); bg=ImageChops.multiply(bg,lay)
    fl=Image.open(MP+'floor.jpg').convert('RGB').crop((0,500,1280,720)); fl=fl.resize((W+40,int(220*(W+40)/1280)),Image.LANCZOS).crop((0,40,W+40,int(220*(W+40)/1280)))
    lay=Image.new('RGB',(W,H),'white'); fy=H-fl.height+28; lay.paste(fl,(-20,fy))
    gm=Image.new('L',(W,H),0); gd=ImageDraw.Draw(gm)
    for y in range(H): gd.line([(0,y),(W,y)],fill=int(255*min(1,max(0,(y-fy)/70))))
    lay=Image.composite(lay,Image.new('RGB',(W,H),'white'),gm); bg=ImageChops.multiply(bg,lay)
    # site-style fine sparkle dust
    import random; r=random.Random(7); d=ImageDraw.Draw(bg)
    for _ in range(70):
        x,y=r.uniform(60,W-60),r.uniform(170,H-150); s=r.choice([1.2,1.6,2.2])
        d.ellipse((x-s,y-s,x+s,y+s),fill=r.choice(['#e7a3c3','#d98fb4','#f2c0d6','#c9a07a']))
    return bg

def nogen_bg(bg,acc,dark=False):
    # same recipe as approved no-art flyer plates (qr-flyer-plan/plates/nogen.py v1): plain theme colour, accent dust kept off the text zone, white 4-point sparkles at the edges
    import random
    c=Image.new('RGB',(W,H),bg); random.seed(7); d=ImageDraw.Draw(c,'RGBA'); a=hexrgb(acc)
    for _ in range(110):
        x,y=random.randint(0,W),random.randint(0,H); r=random.choice([1,1,2,2,3])
        if 120<y<H-120 and 110<x<W-110: continue
        d.ellipse((x-r,y-r,x+r,y+r),fill=a+(random.randint(90,210),))
    for _ in range(9):
        x=random.randint(0,W); y=random.choice([random.randint(10,105),random.randint(H-105,H-10)]); s_=random.randint(8,18)
        col=(255,255,255,210) if dark else a+(150,)
        d.polygon([(x,y-s_),(x+s_//4,y-s_//4),(x+s_,y),(x+s_//4,y+s_//4),(x,y+s_),(x-s_//4,y+s_//4),(x-s_,y),(x-s_//4,y-s_//4)],fill=col)
    return c
def witch_bg():
    import random
    c=Image.new('RGB',(W,H),'#000000'); random.seed(3); d=ImageDraw.Draw(c,'RGBA')
    for _ in range(60):
        x,y=random.randint(0,W),random.randint(0,H); r=random.choice([1,1,1,2]); d.ellipse((x-r,y-r,x+r,y+r),fill=(255,236,214,random.randint(60,170)))
    wi=Image.open(SK+'halloween-pumpkin-witch/witch.webp').convert('RGBA'); bb=wi.getbbox(); wi=wi.crop(bb)
    ww=600; wi=wi.resize((ww,int(wi.height*ww/wi.width)),Image.LANCZOS)
    c.paste(wi,(W-ww-24,(H-wi.height)//2-10),wi); return c
def front(t,show=None):
    CUR[0]=t; c=THEMES[t]; show=show or REP['show']
    if c.get('nogen'): im=nogen_bg(*c['nogen'],dark=c['title'].lower()>'#c')
    elif callable(c['art']): im=c['art']()
    elif c['art']=='witch': im=witch_bg()
    else:
        src=Image.open(c['art']).convert('RGB'); im=cover(src,W,H,1.0 if c['align']=='left' else 0.5)
    if c['scrim']:
        m=Image.new('L',(W,H),0); md=ImageDraw.Draw(m)
        if c['align']=='left':
            for x in range(W): md.line([(x,0),(x,H)],fill=int(max(0,215*(1-x/(W*0.6)))))
        else:
            for y in range(H): md.line([(0,y),(W,y)],fill=int(max(0,180*(1-y/(H*0.72)))))
        im=Image.composite(Image.new('RGB',(W,H),c['scrim']),im,m)
    if c.get('lscrim'):
        m=Image.new('L',(W,H),0); md=ImageDraw.Draw(m)
        for y in range(H): md.line([(0,y),(W,y)],fill=int(max(0,c.get('lstr',215)*(1-y/(H*0.66)))))
        im=Image.composite(Image.new('RGB',(W,H),c['lscrim']),im,m)
    script='with '+REP['first']
    if c.get('maxw'): maxw=c['maxw']; maxh=c.get('cmaxh',215); maxl=2
    elif c['align']=='left': maxw=int((SX1-SX0)*c['tw']); maxh=SY1-SY0-40; maxl=3
    elif c['align']=='top': maxw=SX1-SX0-40; maxh=int(H*0.52); maxl=2
    else: maxw=SX1-SX0-140; maxh=c.get('cmaxh',215); maxl=2
    for ts in range(c.get('hmax',112),44,-2):
        tf=HEAD(ts); tl=balanced(show,tf,maxw,maxl)
        if not tl: continue
        sf=SCRIPT(max(int(ts*0.82),60)); lh=int(ts*1.1)
        sh=sf.getbbox(script)[3]-sf.getbbox(script)[1]; gap=int(ts*0.16)
        th=lh*(len(tl)-1)+int(ts*0.78); block=th+gap+sh
        if block<=maxh and tw(script,sf)<=maxw: break
    if c.get('ytop'): y0=c['ytop']+max(0,(c.get('cmaxh',215)-block)//2)
    elif c['align']=='top': y0=SY0+20
    elif c['align']=='center': y0=(H-block)//2-6
    else: y0=(H-block)//2
    if c.get('panel'):
        op,bl=c.get('frost',(0.84,18))
        if c['align']=='center': box=(SX0+10,y0-44,SX1-10,y0+block+48)
        else:
            x=SX0+20; mw=max(max(tw(l,tf) for l in tl),tw(script,sf)); box=(x-44,y0-40,x+mw+44,y0+block+44)
        fr=im.crop(box).filter(ImageFilter.GaussianBlur(bl)); fr=Image.blend(fr,Image.new('RGB',fr.size,c['panel']),op)
        m=Image.new('L',fr.size,0); ImageDraw.Draw(m).rounded_rectangle((0,0,fr.width-1,fr.height-1),24,fill=255)
        sh_=Image.new('L',(W,H),0); ImageDraw.Draw(sh_).rounded_rectangle((box[0],box[1]+6,box[2],box[3]+6),24,fill=90)
        im.paste(Image.new('RGB',(W,H),(60,30,10)),(0,0),sh_.filter(ImageFilter.GaussianBlur(14)))
        im.paste(fr,box[:2],m)
    def put(txt,f,y,col,shadow):
        b=f.getbbox(txt); x=SX0+14+(6 if c.get('panel') else 0) if c['align']=='left' else (W-(b[2]-b[0]))//2
        if shadow:
            s=Image.new('L',(W,H),0); ImageDraw.Draw(s).text((x-b[0],y-b[1]),txt,font=f,fill=170)
            im.paste(Image.new('RGB',(W,H),0),(0,0),s.filter(ImageFilter.GaussianBlur(7)))
        elif c.get('halo'):
            s=Image.new('L',(W,H),0); ImageDraw.Draw(s).text((x-b[0],y-b[1]),txt,font=f,fill=255)
            im.paste(Image.new('RGB',(W,H),c['halo']),(0,0),s.filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.GaussianBlur(8)))
        ImageDraw.Draw(im).text((x-b[0],y-b[1]),txt,font=f,fill=col)
        return (x,y,x+b[2]-b[0],y+b[3]-b[1])
    boxes=[]
    for i,l in enumerate(tl):
        bb=tf.getbbox(l); capy=y0+i*lh  # align by font metrics so lines are even
        b=tf.getbbox('H'); x=SX0+14+(6 if c.get('panel') else 0) if c['align']=='left' else (W-(bb[2]-bb[0]))//2
        if c['scrim']:
            s=Image.new('L',(W,H),0); ImageDraw.Draw(s).text((x-bb[0],capy-b[1]),l,font=tf,fill=170)
            im.paste(Image.new('RGB',(W,H),0),(0,0),s.filter(ImageFilter.GaussianBlur(7)))
        ImageDraw.Draw(im).text((x-bb[0],capy-b[1]),l,font=tf,fill=c['title']); boxes.append((x,capy,x+bb[2]-bb[0],capy+int(ts*0.78)))
    boxes.append(put(script,sf,y0+th+gap,c['script'],bool(c['scrim'])))
    return im,boxes

def paste_icon(im,name,col,x,y,size):
    ic=Image.open(OUT+f'src/icons/{name}-{col.lstrip("#")}.png').resize((size,size),Image.LANCZOS)
    im.paste(ic,(int(x),int(y)),ic)

def back(t,fields,qrlabel=False):
    CUR[0]=t; c=THEMES[t]; im=Image.new('RGB',(W,H),c['back']); d=ImageDraw.Draw(im)
    n=sum(1 for k in ['email','web','phone','social','code'] if k in fields)
    tile=356 if n<=3 else 330
    capf=BODY(36,700); caplh=42; labf=BODY(MINPX,600)
    capH=2*caplh+(10+40 if qrlabel else 0)
    lw=max(tile,tw(REP['qrlabel'],labf) if qrlabel else 0); tx=SX0+(lw-tile)//2; ty=(H-(tile+18+capH))//2
    m=Image.new('L',(tile,tile),0); ImageDraw.Draw(m).rounded_rectangle((0,0,tile-1,tile-1),28,fill=255)
    im.paste(Image.new('RGB',(tile,tile),'white'),(tx,ty),m)
    qr=Image.open(OUT+f"src/qr-{c.get('qrkey',c['key'])}.png").convert('RGB'); qs=tile-10
    im.paste(qr.resize((qs,qs),Image.LANCZOS),(tx+5,ty+5))
    y=ty+tile+18; hb=capf.getbbox('H')
    for l in ['SCAN HERE','TO ORDER']:
        d.text((tx+(tile-tw(l,capf))//2-capf.getbbox(l)[0],y-hb[1]),l,font=capf,fill=c['name']); y+=caplh
    if qrlabel:
        lb=REP['qrlabel']; y+=10; d.text((tx+(tile-tw(lb,labf))//2-labf.getbbox(lb)[0],y-labf.getbbox('H')[1]),lb,font=labf,fill=c['ink'])
    rx=SX0+lw+22; d.line([(rx,SY0+24),(rx,SY1-24)],fill=c['rule'],width=3)
    X0=rx+22; CW=SX1-X0
    # --- right stack ---
    ns=int((66 if n<=3 else 62)*c.get('nscale',1))
    while tw(REP['name'],HEAD(ns))>CW and ns>50: ns-=1
    body=38 if n<=3 else 34
    ic=int(body*0.9); icg=int(body*0.32)
    items=[]  # each: (height, draw_fn)
    if 'name' in fields:
        nf=HEAD(ns)
        items.append((int(ns*0.98),lambda y,nf=nf: d.text((X0-nf.getbbox(REP['name'])[0],y-nf.getbbox('H')[1]+2),REP['name'],font=nf,fill=c['name'])))
        rf=BODY(MINPX if n>3 else 37); rl=wrap(REP['role'],rf,CW)
        def role(y,rf=rf,rl=rl):
            for i,l in enumerate(rl): d.text((X0-rf.getbbox(l)[0],y+i*int(rf.size*1.22)-rf.getbbox('H')[1]+4),l,font=rf,fill=c['sub'])
        items.append((int(rf.size*1.22)*(len(rl)-1)+int(rf.size*0.9),role))
        items.append(('RULE',None))
    bf=BODY(body); rowh=int(body*1.0)
    def line(y,icon,txt,x=X0,f=bf):
        paste_icon(im,icon,c['name'],x,y+(rowh-ic)//2-1,ic)
        d.text((x+ic+icg-f.getbbox(txt)[0],y-f.getbbox('H')[1]+(rowh-int(f.size*0.72))//2),txt,font=f,fill=c['ink'])
    def fitf(txt,avail):
        s=body
        while s>MINPX and ic+icg+tw(txt,BODY(s))>avail: s-=1
        return BODY(s)
    for k,icon in [('email','mail'),('web','globe')]:
        if k in fields: items.append((rowh,lambda y,k=k,icon=icon: line(y,icon,REP[k],f=fitf(REP[k],CW))))
    ph,so='phone' in fields,'social' in fields
    if ph and so:
        w1=ic+icg+tw(REP['phone'],bf); w2=ic+icg+tw(REP['social'],bf)
        if w1+w2+24<=CW:
            items.append((rowh,lambda y,w1=w1: (line(y,'msg',REP['phone']),line(y,REP.get('platform','at'),REP['social'],x=X0+CW-w2-4))))
        else:
            items.append((rowh,lambda y: line(y,'msg',REP['phone']))); items.append((rowh,lambda y: line(y,REP.get('platform','at'),REP['social'])))
    else:
        if ph: items.append((rowh,lambda y: line(y,'msg',REP['phone'])))
        if so: items.append((rowh,lambda y: line(y,REP.get('platform','at'),REP['social'])))
    if 'code' in fields:
        if fields['code']=='print':
            def code(y):
                paste_icon(im,'tag',c['name'],X0,y+(rowh-ic)//2-1,ic)
                lf=BODY(body); cf=BODY(body,700); lab='Discount code '; x=X0+ic+icg
                d.text((x-lf.getbbox(lab)[0],y-lf.getbbox('H')[1]+(rowh-int(body*0.72))//2),lab,font=lf,fill=c['sub'])
                d.text((x+tw(lab,lf)+10,y-cf.getbbox('H')[1]+(rowh-int(body*0.72))//2),REP['code'],font=cf,fill=c['name'])
            items.append((rowh,code))
        else:
            CODEH=78
            def code(y):
                lf=BODY(body); lab='Discount code'; x=X0+ic+icg; ly=y+CODEH-3
                ty_=ly-6-int(body*0.72)  # label sits on the write-in line
                paste_icon(im,'tag',c['name'],X0,ty_+(int(body*0.72)-ic)//2,ic)
                d.text((x-lf.getbbox(lab)[0],ty_-lf.getbbox('H')[1]),lab,font=lf,fill=c['sub'])
                d.line([(x+tw(lab,lf)+16,ly),(SX1-4,ly)],fill=c['sub'],width=2)
            items.append(('CODE',code))
    hc=any(h=='CODE' for h,_ in items); items=[((78 if h=='CODE' else h),fn) for h,fn in items]; EXTRA=10 if hc else 0
    nb=sum(1 for h,_ in items if h!='RULE')
    # spacing: generous, shrink to fit
    avail=SY1-SY0-14-EXTRA
    for gap in range(30,9,-1):
        rule_sp=gap+12
        hasr=any(h=='RULE' for h,_ in items); total=sum(h for h,_ in items if h!='RULE')+gap*(nb-1-(1 if hasr else 0))+(2*rule_sp if hasr else 0)+EXTRA
        if total<=avail: break
    y=(H-total)//2; prev=None
    for h,fn in items:
        if h=='RULE':
            y+=rule_sp; d.line([(X0,y),(X0+70,y)],fill=c['name'],width=3); y+=rule_sp; prev='RULE'; continue
        if prev and prev!='RULE': y+=gap+(EXTRA if h==78 else 0)
        fn(y); y+=h; prev='x'
    return im,dict(total=total,avail=SY1-SY0,gap=gap,name=ns,body=body,tile=tile)

def guides(im):
    im=im.copy(); d=ImageDraw.Draw(im)
    d.rectangle((TRIM,TRIM,W-TRIM,H-TRIM),outline=(0,200,255),width=2)
    d.rectangle((SAFE,SAFE,W-SAFE,H-SAFE),outline=(255,60,60),width=1)
    return im
ALL={'name':1,'email':1,'web':1,'phone':1,'code':'blank','social':1}
MIN={'name':1,'email':1,'web':1}
LONG='Sparkle & Shine with the Fizz Queens'
if __name__=='__main__':
    for t in ORDER:
        im,b=front(t); im.save(OUT+f'{t}-front.png'); print(t,'front',b[-1])
        im,b=front(t,LONG); im.save(OUT+f'{t}-front-longtitle.png'); print(t,'long',b)
        for nm,fl,ql in [('back-all',ALL,False),('back-min',MIN,False)]:
            im,info=back(t,fl,ql); im.save(OUT+f'{t}-{nm}.png'); print(t,nm,info)
    im,info=back('amethyst',{'name':1,'email':1,'web':1,'code':'blank'}); im.save(OUT+'amethyst-back-mid.png'); print('mid',info)
