from PIL import Image, ImageCms, ImageDraw, ImageFont
import numpy as np, sys
srgb=ImageCms.createProfile('sRGB'); cmyk=ImageCms.getOpenProfile('/usr/share/color/icc/ghostscript/default_cmyk.icc')
X=ImageCms.buildTransform(srgb,cmyk,'RGB','CMYK',renderingIntent=0)
SL=75  # 0.25in slug
def page(png,label):
    im=ImageCms.applyTransform(Image.open(png).convert('RGB'),X)
    W,H=im.size; P=Image.new('CMYK',(W+2*SL,H+2*SL),(0,0,0,0)); P.paste(im,(SL,SL)); d=ImageDraw.Draw(P)
    t0=SL+37.5; tx1=SL+W-37.5; ty1=SL+H-37.5; k=(0,0,0,255)
    for x in (t0,tx1):
        d.line([(x,0),(x,SL-12)],fill=k,width=1); d.line([(x,P.height-SL+12),(x,P.height)],fill=k,width=1)
    for y in (t0,ty1):
        d.line([(0,y),(SL-12,y)],fill=k,width=1); d.line([(P.width-SL+12,y),(P.width,y)],fill=k,width=1)
    d.text((SL+60,P.height-SL+30),label,fill=k,font=ImageFont.truetype('/usr/share/fonts/truetype/sand-box/google/Poppins/Poppins-Regular.ttf',18))
    a=np.asarray(im).astype(int).sum(2)/255*100
    print(png,'max ink %.0f%%'%a.max(),'mean %.0f%%'%a.mean())
    return P
t=sys.argv[1]
pages=[page(f'{t}-front.png',f'{t} FRONT  3.5x2in trim, 0.125in bleed, 300dpi CMYK  (UV gloss)'),page(f'{t}-back-all.png',f'{t} BACK  (uncoated)')]
pages[0].save(f'{t}-print-sample.pdf',save_all=True,append_images=pages[1:],resolution=300)
