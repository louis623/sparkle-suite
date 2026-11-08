"""Finish the approved 1280x720 direct-API take; needs ffmpeg, Pillow and NumPy.
Usage: python finish-motion.py <original-take.mp4> <approved-poster.webp> <output-folder>
No API calls. Work at the master frame rate; the mobile file uses the same frames.
"""
import math
import subprocess as sp
import sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageFilter

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
# Trace the actual silhouette in reference pixels. Keep the snowfall in camera
# coordinates, even when an ear or the hat moves past it.
hx,hy=grid(780,90,1020,335)
outline=np.asarray([
    (54,79),(55,69),(57,59),(61,50),(69,44),(80,40),(89,34),(99,30),
    (110,23),(120,18),(129,17),(139,18),(150,20),(160,25),(170,32),
    (179,41),(187,52),(193,64),(197,77),(199,91),(199,105),(196,115),
    (202,119),(207,125),(210,132),(211,139),(208,147),(204,153),
    (198,157),(190,159),(180,158),(172,154),(166,149),(163,141),
    (163,134),(157,133),(151,135),(149,144),(153,157),(155,170),
    (156,178),(163,186),(172,205),(173,225),(47,225),(46,199),
    (48,186),(52,175),(52,165),(48,154),(46,145),(47,139),(42,136),
    (40,133),(33,133),(27,131),(24,128),(25,122),(27,115),(29,109),
    (31,102),(36,94),(41,87),(48,83)
],dtype=np.float32)+[790,110]
# Find the closest point on the contour and its outward direction, fixed for
# the entire shot. An edge trimap below adapts to the tiny native movements.
near=np.full(hx.shape,1e9); inside=np.zeros(hx.shape,bool)
edge_x=hx.copy(); edge_y=hy.copy()
for a,b in zip(outline,np.roll(outline,-1,axis=0)):
    vx,vy=b-a
    u=np.clip(((hx-a[0])*vx+(hy-a[1])*vy)/(vx*vx+vy*vy),0,1)
    px=a[0]+u*vx; py=a[1]+u*vy
    dist=(hx-px)**2+(hy-py)**2
    use=dist<near
    edge_x[use]=px[use]; edge_y[use]=py[use]; near=np.minimum(near,dist)
    if vy!=0: inside^=((a[1]>hy)!=(b[1]>hy)) & (hx<(a[0]+(hy-a[1])*vx/vy))
sd=np.sqrt(near).astype(np.float32)*np.where(inside,1.,-1.)
# Smoothed normals avoid seams at polygon corners in the hidden plate.
ny,nx=np.gradient(-sd); length=np.maximum(np.hypot(nx,ny),.001)
nx=(nx/length).astype(np.float32); ny=(ny/length).astype(np.float32)
band=(np.abs(sd)<7.0)&(hy<325)
# Exclude the whole original contour plus its lens-softened fringe before
# estimating exposed sky. Sampling across the contour leaves a ghost of the hat.
known=np.uint8(sd < -5.5)*255
def blur(pixels,radius):
    return np.asarray(Image.fromarray(pixels).filter(ImageFilter.GaussianBlur(radius)),dtype=np.float32)
den=[blur(known,r) for r in (4,12,32)]
def sky_under_subject(src):
    data=(np.uint8(src)*(known>0)[...,None]).astype(np.uint8)
    fill=np.zeros_like(src)
    for radius,weight in reversed(list(zip((4,12,32),den))):
        color=blur(data,radius)*(255/np.maximum(weight,1))[:,:,None]
        fill=mix(fill,color,smooth((weight-14)/64))
    return fill
def small_sample(im,x,y):
    x=np.clip(x,0,im.shape[1]-1.001); y=np.clip(y,0,im.shape[0]-1.001)
    ix=x.astype(np.int32); iy=y.astype(np.int32)
    dx=(x-ix).astype(np.float32)[...,None]; dy=(y-iy).astype(np.float32)[...,None]
    return (im[iy,ix]*(1-dx)+im[iy,ix+1]*dx)*(1-dy)+(im[iy+1,ix]*(1-dx)+im[iy+1,ix+1]*dx)*dy
def edge_color(im,direction):
    colors=[small_sample(im,edge_x[band]+direction*nx[band]*dist-ny[band]*side,
                            edge_y[band]+direction*ny[band]*dist+nx[band]*side)
            for dist,side in ((6,-2),(7,0),(6,2),(8,1),(8,-1))]
    return np.median(colors,axis=0)
def tilt_subject(frame,im,t):
    strength=smooth((319-hy)/49)
    ang=math.radians(3.9*math.sin(t)**3+.85*(1-math.cos(t)))*strength
    dx=hx-883; dy=hy-299
    xs=883+np.cos(ang)*dx+np.sin(ang)*dy
    ys=299-np.sin(ang)*dx+np.cos(ang)*dy-2.1*strength*math.sin(t)**2
    src=im[90:335,780:1020].astype(np.float32)
    alpha=inside.astype(np.float32)
    fg=edge_color(im,-1); bg=edge_color(im,1); delta=fg-bg
    # Project each edge pixel's color between local fur/velvet and night sky.
    estimate=np.sum((src[band]-bg)*delta,axis=1)/np.maximum(60,np.sum(delta*delta,axis=1))
    prior=smooth((sd[band]+4.5)/9)
    alpha[band]=smooth((np.clip(estimate,0,1)*.88+prior*.12-.08)/.84)
    # Reconstruct only the narrow strip uncovered by the tilt, using surrounding
    # sky from this instant. No donor coordinate or snow layer follows the head.
    coverage=smooth((sd+5.5)/2.5)
    clean=mix(src,sky_under_subject(src),coverage)
    premul=np.clip(src-clean*(1-alpha[...,None]),0,255*alpha[...,None])
    warped=small_sample(np.dstack((premul,alpha)),xs-780,ys-90)
    value=clean*(1-warped[:,:,3:4])+warped[:,:,:3]
    displacement=np.hypot(hx-xs,hy-ys)
    changed=((coverage>.002)|(warped[:,:,3]>.002)) & (displacement>.001)
    patch=frame[90:335,780:1020]
    result=mix(src,value,smooth(displacement/1.2))
    patch[changed]=np.uint8(np.clip(result[changed]+.5,0,255))
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
    tilt_subject(frame,im,t)
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

