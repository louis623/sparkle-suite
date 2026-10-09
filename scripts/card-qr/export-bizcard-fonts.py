# Box-only build step: static font instances for the card renderer from the approved mock FONTSET.
import sys, json, os, shutil
sys.path.insert(0,'/workspace/bizcard-mock')
import card, custom, custom2
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
OUT='/tmp/suite-smoke-pr75/lib/workspace/card-qr/fonts/card/'; os.makedirs(OUT,exist_ok=True)
made={}
def inst(path,axes):
    base=os.path.basename(path).split('.')[0].replace('[','').replace(']','').replace(',','-')
    key=base+''.join(f'-{k[:4]}{int(v)}' for k,v in sorted(axes.items()))
    fn=key+'.ttf'
    if fn not in made:
        f=TTFont(path)
        if 'fvar' in f:
            names={a.axisTag:a for a in f['fvar'].axes}
            loc={}
            for a in f['fvar'].axes: loc[a.axisTag]=a.defaultValue
            for k,v in axes.items():
                tag={'Weight':'wght','Width':'wdth','opsz':'opsz','wght':'wght'}.get(k,k)
                if tag in names: loc[tag]=v
            f=instancer.instantiateVariableFont(f,loc)
        f.save(OUT+fn); made[fn]=1
    return fn
def spec(t,kind,wt=None):
    p,ax=card.FONTSET[t][kind]
    if isinstance(p,dict):
        w=wt or ax; return inst(p[min(p,key=lambda k:abs(k-w))],{})
    if ax=='none': return inst(p,{})
    if isinstance(ax,dict):
        a=dict(ax); 
        if wt: a['Weight']=wt
        return inst(p,a)
    if ax=='inter': return inst(p,{'opsz':27,'wght':wt or 450})
    if ax=='dm': return inst(p,{'opsz':40,'wght':wt or 500})
    if ax is None and kind=='body': return inst(p,{'wght':wt or 400})
    if isinstance(ax,list): return inst(p,{'wght':ax[0]})
    if ax is None: return inst(p,{})
    raise Exception((t,kind,ax))
M={}
for t in card.ORDER+['custom-kim','custom-kelly','custom-lindsey','custom-brittany']:
    M[t]=dict(head=spec(t,'head'),script=spec(t,'script'),body=spec(t,'body'),body600=spec(t,'body',600),body700=spec(t,'body',700))
# custom2 own fronts
M['custom-lindsey']['ownTitle']=inst(custom2.PAC,{}); M['custom-lindsey']['ownWith']=inst(custom2.DMF,{'opsz':40,'wght':900})
M['custom-brittany']['ownTitle']=inst(custom2.PFD,{'wght':900}); M['custom-brittany']['ownWith']=inst(custom2.PFI,{'wght':500})
json.dump(M,open('/workspace/bizcard-port/fontmap.json','w'),indent=1)
print(len(made)); print(json.dumps(M,indent=0)[:3000])
