import card
from PIL import Image, ImageDraw
ts=card.ORDER; cw,ch=600,360; pad=24; rh=ch+56
S=Image.new('RGB',(pad+3*(cw+pad),120+len(ts)*rh+20),'#f3f1f6'); d=ImageDraw.Draw(S)
f=card.F('SemiBold',32); g=card.F('Medium',20)
d.text((pad,24),"Rep business cards — all 14 shared themes · 3.5×2 in · bleed shown · cyan = trim · red = 0.15 in safe",font=f,fill='#2a1a3a')
for k,h in enumerate(['FRONT (UV gloss)','BACK — all fields on','BACK — minimal (name, email, website)']): d.text((pad+k*(cw+pad),78),h,font=g,fill='#5c4d78')
LOCK={'pumpkin-cat','amethyst','midnight-rose'}
for r,t in enumerate(ts):
    y=110+r*rh; d.text((pad,y),card.THEMES[t]['key']+('  ·  LOCKED' if t in LOCK else '  ·  new')+'  ·  QR mark: '+card.Q['themes'][card.THEMES[t]['key']]['icon'],font=g,fill='#2a1a3a')
    for k,s in enumerate(['front','back-all','back-min']):
        S.paste(card.guides(Image.open(f'{t}-{s}.png')).resize((cw,ch),Image.LANCZOS),(pad+k*(cw+pad),y+28))
S.save('sheet.png'); print(S.size)
