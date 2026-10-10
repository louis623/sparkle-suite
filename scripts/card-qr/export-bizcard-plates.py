# Box-only build step: regenerates lib/workspace/card-qr/card-plates from the approved mock (/workspace/bizcard-mock/card.py).
import sys; sys.path.insert(0,'/workspace/bizcard-mock')
import card, custom, custom2
from card import *
from PIL import Image, ImageDraw, ImageFilter
OUTD=sys.argv[1]
def plate(t):
    c=THEMES[t]
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
    return im
def own(t):
    if t=='custom-lindsey': im=card.cover(Image.open(card.OUT+'src/mhf-f0.5.png').convert('RGB'),W,H); scr=(12,4,28); a=185
    else: im=card.cover(Image.open(custom2.REPO+'britt-with-bling/hero.jpeg').convert('RGB'),W,H); scr=(0,0,0); a=150
    m=Image.new('L',(W,H),0); ImageDraw.Draw(m).ellipse((90,120,1035,555),fill=a)
    return Image.composite(Image.new('RGB',(W,H),scr),im,m.filter(ImageFilter.GaussianBlur(80)))
for t in ORDER+['custom-kim','custom-kelly']: plate(t).save(f'{OUTD}/{t}.jpg',quality=92,subsampling=0)
for t in ['custom-lindsey','custom-brittany']: own(t).save(f'{OUTD}/{t}.jpg',quality=92,subsampling=0)
