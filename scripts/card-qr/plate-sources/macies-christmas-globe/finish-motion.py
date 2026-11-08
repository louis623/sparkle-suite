"""Finish the approved 1280x720 direct-API take; needs ffmpeg, Pillow and NumPy.
Usage: python finish-motion.py <original-take.mp4> <approved-poster.webp> <output-folder>
No API calls. Work at the master frame rate; the mobile file uses the same frames.
"""
import math
import subprocess as sp
import sys
from pathlib import Path
import numpy as np
from PIL import Image

src, plate, out = sys.argv[1:]
out = Path(out)
out.mkdir(parents=True, exist_ok=True)
W,H,N = 1280,720,220
base = np.array(Image.open(plate).convert('RGB').resize((W,H), Image.Resampling.LANCZOS))
def smooth(v):
    v = np.clip(v, 0, 1)
    return v*v*(3-2*v)
def grid(x0,y0,x1,y1):
    y,x=np.mgrid[y0:y1,x0:x1].astype(np.float32)
    return x,y
def sample(im,x,y):
    x=np.clip(x,0,W-1.01); y=np.clip(y,0,H-1.01)
    xi=x.astype(np.int32); yi=y.astype(np.int32)
    fx=(x-xi).astype(np.float32)[:,:,None]; fy=(y-yi).astype(np.float32)[:,:,None]
    return (im[yi,xi]*(1-fx)+im[yi,xi+1]*fx)*(1-fy)+(im[yi+1,xi]*(1-fx)+im[yi+1,xi+1]*fx)*fy
def mix(a,b,alpha):
    return a+(b.astype(np.float32)-a)*alpha[:,:,None]
gx,gy=grid(568,0,1178,514)
# All living subjects inside the glass remain in the original take, including the blink.
ell=np.sqrt(((gx-873)/296)**2+((gy-266)/267)**2)
gm=smooth((1.003-ell)/.045)*smooth((511-gy)/14)
hx,hy=grid(783,95,1021,329)
hw=smooth((1.25-np.sqrt(((hx-902)/100)**2+((hy-214)/123)**2))/.28)*smooth((323-hy)/42)
fx,fy=grid(0,434,187,686)
# Constrain motion to the hearth, leaving the gift box and the lip of the table rigid.
edge=130+np.clip((601-fy)*1.3,0,57)
fm=smooth((edge-fx)/14)*smooth((161-fx)/23)*smooth((fy-434)/29)*smooth((686-fy)/22)
height=np.clip((623-fy)/122,0,1.35)
lights=[(1092,195),(1074,232),(1105,248),(1066,275),(1117,286),(1085,307),
        (1097,336),(1122,355),(1080,379),(644,262),(631,287),(652,310),
        (620,333),(646,352),(1018,320),(1010,343)]
patches=[]
for k,(cx,cy) in enumerate(lights):
    sz=12; x,y=grid(cx-sz,cy-sz,cx+sz+1,cy+sz+1)
    dist=(x-cx)**2+(y-cy)**2
    core=np.exp(-dist/(2*1.85**2)); halo=np.exp(-dist/(2*4.8**2))
    rgb=core[:,:,None]*np.array([.93,.76,.42])+halo[:,:,None]*np.array([.46,.24,.06])
    patches.append((slice(cy-sz,cy+sz+1),slice(cx-sz,cx+sz+1),np.minimum(rgb,1),k))
encs=[]
for name,scale,crf in [('hero-loop.mp4','1280:720','22'),('hero-loop-phone.mp4','640:360','25')]:
    encs.append(sp.Popen(['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s','1280x720','-r','24','-i','pipe:0','-an','-vf','scale='+scale+':flags=lanczos','-c:v','libx264','-threads','4','-preset','slow','-x264-params','zones=0,0,q=16','-crf',crf,'-pix_fmt','yuv420p','-movflags','+faststart',str(out/name)],stdin=sp.PIPE))
dec=sp.Popen(['ffmpeg','-loglevel','error','-i',str(src),'-frames:v','232','-vf','scale=1280:720','-f','rawvideo','-pix_fmt','rgb24','pipe:1'],stdout=sp.PIPE)
def read():
    return np.frombuffer(dec.stdout.read(W*H*3),dtype=np.uint8).reshape(H,W,3)
start=[read() for _ in range(12)]
for i in range(N):
    im=read()
    if i>=N-12:
        k=i-(N-12); a=float(smooth(k/12))
        im=np.uint8((1-a)*im+a*start[k])
    t=2*math.pi*i/N
    frame=base.copy()
    frame[0:514,568:1178]=mix(base[0:514,568:1178],im[0:514,568:1178],gm)
    # Tilt the head together with the ears and hat, tapering to zero at the necklace.
    ang=math.radians(5.3*math.sin(t)**3+1.2*(1-math.cos(t)))*hw
    dx=hx-883; dy=hy-299
    xs=883+np.cos(ang)*dx+np.sin(ang)*dy
    ys=299-np.sin(ang)*dx+np.cos(ang)*dy-2.1*hw*math.sin(t)**2
    patch=frame[95:329,783:1021]
    patch[:]=mix(patch,sample(im,xs,ys),hw)
    # Animate photographic flame shapes about their bases. Neighbouring tongues flicker
    # at different phases/speeds. The low fire reflection receives only soft spill.
    wave=np.sin(9*t+fx*.039)+.51*np.sin(16*t-fx*.060)+.26*np.cos(23*t+fx*.031)
    scale=1+.175*wave
    xs=fx-height*(6.4*np.sin(7*t+fx*.062)+3.2*np.sin(13*t-fx*.037))
    ys=623+(fy-623)/(1+(scale-1)*smooth((635-fy)/36))
    fire=sample(im,xs,ys)
    gain=1+(.088*np.sin(9*t+fx*.026)+.049*np.sin(14*t-fx*.021)+.028*np.cos(23*t))*smooth((fy-440)/39)
    fire=np.clip(fire*gain[:,:,None],0,255)
    frame[434:686,:187]=mix(base[434:686,:187],fire,fm)
    for sy,sx,rgb,k in patches:
        phi=(k%3)*2.23+.29*math.sin(k*3.2)
        strength=.07+.91*smooth((1+math.sin((2+k%2)*t+phi))/2)
        p=frame[sy,sx]; p[:]=np.clip(p+(255.-p)*rgb*strength,0,255)
    data=frame.tobytes()
    for enc in encs: enc.stdin.write(data)
dec.stdout.close()
assert dec.wait()==0
for enc in encs:
    enc.stdin.close()
    assert enc.wait()==0

