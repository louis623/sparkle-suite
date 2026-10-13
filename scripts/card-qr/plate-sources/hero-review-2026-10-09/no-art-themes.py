from PIL import Image, ImageDraw, ImageFilter
import random, sys
out,bg,acc,glow=sys.argv[1],*[tuple(int(s[i:i+2],16) for i in (1,3,5)) for s in sys.argv[2:5]]
W,H=1080,1920
def base(g=True,strength=110):
    c=Image.new('RGB',(W,H),bg)
    if g:
        m=Image.new('L',(W,H),0); d=ImageDraw.Draw(m); d.ellipse((-200,-300,W+200,900),fill=strength); d.ellipse((-200,1400,W+200,2300),fill=strength)
        c=Image.composite(Image.new('RGB',(W,H),glow),c,m.filter(ImageFilter.GaussianBlur(220)))
    return c
def dust(c,n,seed):
    random.seed(seed); d=ImageDraw.Draw(c,'RGBA')
    for _ in range(n):
        x,y=random.randint(0,W),random.randint(0,H); r=random.choice([1,1,2,2,3])
        if 260<y<1560 and 70<x<1010: continue
        d.ellipse((x-r,y-r,x+r,y+r),fill=acc+(random.randint(90,210),))
    for _ in range(16):
        x,y=random.randint(0,W),random.choice([random.randint(0,240),random.randint(1580,H)]); s=random.randint(8,18)
        d.polygon([(x,y-s),(x+s//4,y-s//4),(x+s,y),(x+s//4,y+s//4),(x,y+s),(x-s//4,y+s//4),(x-s,y),(x-s//4,y-s//4)],fill=(255,255,255,210))
    return c
dust(base(False),260,7).save(f'{out}/v1-plate.jpg',quality=93)
dust(base(True),200,9).save(f'{out}/v3-plate.jpg',quality=93)
