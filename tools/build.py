import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import json, numpy as np, base64, math, random
from matplotlib.path import Path
from scipy import ndimage
exec(open(os.path.join(ROOT,'tools','fit.py')).read().split("print('---- refit")[0].replace("print(","(lambda *a,**k:None)("))
d=json.load(open(os.path.join(ROOT,'data','osm.json')))
for b in d['buildings']:
    n=b['name'];no=byname.get(n) or ALIAS.get(n)
    if no and b['campus']:b['no']=no
pairs=[(offd[b['no']][3],offd[b['no']][4],b['c'][0],b['c'][1]) for b in d['buildings'] if b.get('no')]
A=np.array([[px,py,1] for px,py,_,_ in pairs]);X=np.array([[x,z] for *_,x,z in pairs])
M=np.linalg.lstsq(A,X,rcond=None)[0];res=X-A@M
def pred(px,py):
    dd=np.hypot(A[:,0]-px,A[:,1]-py)+1e-3;w=1/dd**2;idx=np.argsort(dd)[:5]
    return np.array([px,py,1])@M+(res[idx]*w[idx,None]).sum(0)/w[idx].sum()
X0,X1,Z0,Z1=-600,760,-320,400
# ---------- English names for OSM campus buildings ----------
EN={'人文大樓':'Humanities Building','綜合研究中心':'Integrated Research Center','綜合三館':'Comprehensive Building 3','會議中心':'Conference Center','行政大樓':'Administration Building','操船模擬機室':'Ship Handling Simulator','育樂館':'Recreation Hall','商船學系系館':'Merchant Marine','機械B館和圖資處':'Mechanical Eng. B & Library IT','延平技術大樓':'Yanping Technology Building','沛華大樓':'Peihua Building','航管大樓':'Shipping & Transportation Mgmt.','海空大樓':'Sea & Air Building','游泳池':'Swimming Pool','男二舍':"Men's Dorm 2",'男三女二舍':"Men's Dorm 3 / Women's Dorm 2",'第一餐廳FRB':'First Cafeteria','男一舍':"Men's Dorm 1",'海事大樓':'Maritime Building','海洋環境化學與生態研究所':'Inst. of Marine Environmental Chemistry & Ecology','綜合一館':'Comprehensive Building 1','海洋環境資訊系系館':'Marine Environmental Informatics','環漁系館':'Environmental Biology & Fisheries','生命科學院館':'College of Life Sciences','食品工程館':'Food Engineering','陸生動物實驗中心':'Terrestrial Animal Lab','食品科學學系館':'Food Science','水生動物實驗中心':'Aquatic Animal Lab','電機二館':'Electrical Engineering 2','工學院':'College of Engineering','海洋工程綜合試驗館':'Ocean Engineering Lab Complex','河工二館':'Hydraulic & Ocean Eng. 2','大型空蝕水槽實驗室':'Cavitation Tunnel Lab','體育館':'Gymnasium','學生活動中心':'Student Activity Center','女一舍':"Women's Dorm 1",'電機一館':'Electrical Engineering 1','電資暨綜合教學大樓':'EECS & Teaching Building','綜合2管':'Comprehensive Building 2','五南文化広場（海洋書坊）':'Wunan Bookstore','機械A館':'Mechanical Eng. A','圖書館':'Library','機械與工程學系系館':'Mechanical & Mechatronic Eng.','7-Eleven':'7-Eleven'}
FIXNAME={'綜合2管':'綜合二館'}
LEVELS={'延平技術大樓':11,'行政大樓':6,'圖書館':6,'人文大樓':7,'海事大樓':6,'電機二館':10,'育樂館':4,'游泳池':2,'第一餐廳FRB':3,'會議中心':3,'7-Eleven':1,'男一舍':8,'女一舍':8,'海洋工程綜合試驗館':3,'大型空蝕水槽實驗室':3,'綜合研究中心':5,'海空大樓':7,'商船學系系館':6,'沛華大樓':7}
# dorm numbers from the school map
DORMNO={'男一舍':28,'女一舍':36,'男二舍':21,'男三女二舍':19,'五南文化広場（海洋書坊）':6}
for b in d['buildings']:
    if b['campus'] and b['name'] in DORMNO: b['no']=DORMNO[b['name']]
# assign unmatched official buildings to unnamed footprints within 25 m
taken=set()
unn=[b for b in d['buildings'] if not b['name'] and (b['campus'] or True)]
BUILDING_NOS={2,7,13,19,20,21,26,28,36,38,41,42,44,47,54,58,60,64,66,67}
matched=set(b.get('no') for b in d['buildings'] if b.get('no'))
markers=[]
for o in OFF:
    no=o[0]
    if no in matched: continue
    p=pred(o[3],o[4])
    if no in BUILDING_NOS:
        cand=sorted([b for b in unn if b['id'] not in taken],key=lambda b:math.hypot(b['c'][0]-p[0],b['c'][1]-p[1]))
        if cand and math.hypot(cand[0]['c'][0]-p[0],cand[0]['c'][1]-p[1])<25:
            b=cand[0];taken.add(b['id']);b['no']=no;b['name']=o[1];b['assigned']=True;continue
    markers.append({'no':no,'zh':o[1],'en':o[2],'x':round(float(p[0]),1),'z':round(float(p[1]),1)})
# snap features to OSM objects
def area_c(a):
    xs=[q[0] for q in a['p']];zs=[q[1] for q in a['p']];return (sum(xs)/len(xs),sum(zs)/len(zs))
SNAP={24:('leisure=pitch',''),25:('leisure=pitch','basketball'),48:('leisure=pitch','tennis'),59:('leisure=pitch','beachvolleyball')}
feat=[]
for m in list(markers):
    if m['no'] in SNAP:
        k,sp=SNAP[m['no']]
        c=sorted([a for a in d['areas'] if a['k']==k and a['sport']==sp],key=lambda a:math.hypot(area_c(a)[0]-m['x'],area_c(a)[1]-m['z']))
        if c and math.hypot(area_c(c[0])[0]-m['x'],area_c(c[0])[1]-m['z'])<40:
            c[0]['no']=m['no'];c[0]['zh']=m['zh'];c[0]['en']=m['en'];cx,cz=area_c(c[0]);m['x'],m['z']=round(cx,1),round(cz,1);m['kind']='area'
    if m['no']==33 and d.get('spring'): m['x'],m['z']=d['spring'];m['kind']='fountain'
    if m['no']==16: m['kind']='fountain'
    if m['no']==27:
        pier=[p for p in d['piers'] if p['name']=='海洋大學小艇碼頭']
        if pier: xs=[q[0] for q in pier[0]['p']];zs=[q[1] for q in pier[0]['p']];m['x'],m['z']=round(sum(xs)/len(xs),1),round(sum(zs)/len(zs),1);m['kind']='dock'
    m.setdefault('kind','sign')
print('markers',[(m['no'],m['zh'],m['kind']) for m in markers])
print('assigned',[(b['no'],b['name']) for b in d['buildings'] if b.get('assigned')])
# ---------- rasters (1 m) ----------
RX,RZ=X1-X0,Z1-Z0
def rpath(poly):return Path(np.array([[x-X0,z-Z0] for x,z in poly]))
yy,xx=np.mgrid[0:RZ,0:RX]+0.5
P2=np.c_[xx.ravel(),yy.ravel()]
def mask(poly):return rpath(poly).contains_points(P2).reshape(RZ,RX)
barrier=np.zeros((RZ,RX),bool)
def draw_line(pts,arr,th=1):
    for (ax,az),(bx,bz) in zip(pts,pts[1:]):
        n=int(max(abs(bx-ax),abs(bz-az))*2)+1
        for t in np.linspace(0,1,n):
            x=int(ax+(bx-ax)*t-X0);z=int(az+(bz-az)*t-Z0)
            if x<-th or z<-th or x>=RX+th or z>=RZ+th: continue
            arr[max(0,z-th):max(0,z+th+1),max(0,x-th):max(0,x+th+1)]=True
import xml.etree.ElementTree as ET
_r=ET.parse(os.path.join(ROOT,'data','map.osm')).getroot()
_LAT0,_LON0=25.15,121.777;_KX=math.cos(math.radians(_LAT0))*111320
_nodes={n.get('id'):((float(n.get('lon'))-_LON0)*_KX,(_LAT0-float(n.get('lat')))*110574) for n in _r.iter('node')}
d['coast']=[[_nodes[n.get('ref')] for n in w.iter('nd')] for w in _r.iter('way') if any(t.get('k')=='natural' and t.get('v')=='coastline' for t in w.iter('tag'))]
for c in d['coast']:draw_line(c,barrier)
lbl,n=ndimage.label(~barrier)
# decide each component by the coastline rule: land lies left of the way's direction
from scipy.spatial import cKDTree
sp=[];sd=[]
for c in d['coast']:
    for (ax,az),(bx,bz) in zip(c,c[1:]):
        L=math.hypot(bx-ax,bz-az)
        for t in np.linspace(0,1,max(2,int(L))):
            sp.append((ax+(bx-ax)*t,az+(bz-az)*t));sd.append(((bx-ax)/L,(bz-az)/L))
sp=np.array(sp);sd=np.array(sd);kd=cKDTree(sp)
near=ndimage.binary_dilation(barrier,iterations=4)&~barrier
sea=np.zeros_like(barrier)
for l in range(1,n+1):
    zz,xx_=np.nonzero(near&(lbl==l))
    if len(zz)==0: continue
    idx=np.random.default_rng(0).choice(len(zz),min(400,len(zz)),replace=False)
    pts=np.c_[xx_[idx]+X0+0.5,zz[idx]+Z0+0.5]
    _,j=kd.query(pts)
    v=pts-sp[j];dirs=sd[j]
    land=(v[:,0]*dirs[:,1]-v[:,1]*dirs[:,0])>0
    frac=land.mean();print('component',l,'size',(lbl==l).sum(),'land vote',round(frac,2))
    if frac<0.5: sea|=lbl==l
sea=ndimage.binary_dilation(sea,iterations=1)&(sea|barrier)|sea
sea0=sea.copy()
for w in d['water']: sea|=mask(w)
for p in d['piers']:
    if p['closed']: sea&=~mask(p['p'])
print('sea fraction',sea.mean().round(3),'components',n)
wood=np.zeros_like(sea)
for a in d['areas']:
    if a['k']=='natural=wood': wood|=mask(a['p'])
wood&=~sea
# ---------- heights ----------
B=[(b['c'][0],b['c'][1],b['ele']) for b in d['bench']]
gx=xx+X0;gz=yy+Z0
wsum=0;hsum=0
for bx,bz,be in B:
    w=1/((gx-bx)**2+(gz-bz)**2+400);wsum=wsum+w;hsum=hsum+w*be
base=hsum/wsum
dist=ndimage.distance_transform_edt(wood)
rng=np.random.default_rng(7)
noise=ndimage.gaussian_filter(rng.standard_normal((RZ,RX)),40);noise/=np.abs(noise).max()
hill=48*(1-np.exp(-dist/75))*(1+0.35*noise)
H=base+hill
H=ndimage.gaussian_filter(H,3)
# keep campus/roads area flat-ish: no change needed (wood excluded)
# coast: land near sea a bit lower toward seawall
dsea=ndimage.distance_transform_edt(~sea)
H=np.where(dsea<6,np.minimum(H,base),H)
H[sea]=-5.0
for p in d['piers']:
    if p['closed']: H[mask(p['p'])&sea0]=2.6
CELL=4
Hs=H[::CELL,::CELL];nz,nx=Hs.shape
Hd=np.round(Hs*10).astype('<i2')
grid={'x0':X0,'z0':Z0,'cell':CELL,'nx':int(nx),'nz':int(nz),'h':base64.b64encode(Hd.tobytes()).decode()}
print('grid',nx,nz,'h range',float(Hs.min()),float(Hs.max()))
# ---------- trees ----------
occupied=np.zeros_like(sea)
for b in d['buildings']: occupied|=mask(b['p'])
for r in d['roads']:
    if not r['tunnel']: draw_line(r['p'],occupied,th=int(r['w']/2)+1)
occ=ndimage.binary_dilation(occupied|sea,iterations=3)
trees=[]
rnd=random.Random(3)
park=np.zeros_like(sea)
for a in d['areas']:
    if a['k'] in('leisure=park','landuse=recreation_ground','landuse=grass'): park|=mask(a['p'])
for _ in range(60000):
    x=rnd.uniform(X0+2,X1-2);z=rnd.uniform(Z0+2,Z1-2);ix,iz=int(x-X0),int(z-Z0)
    if occ[iz,ix]:continue
    if wood[iz,ix] and rnd.random()<0.10: trees.append((x,z))
    elif park[iz,ix] and rnd.random()<0.02: trees.append((x,z))
# thin trees closer than 5 m
keep=[];gridset={}
for x,z in trees:
    k=(int(x//5),int(z//5))
    if any((k[0]+i,k[1]+j) in gridset for i in(-1,0,1) for j in(-1,0,1)):continue
    gridset[k]=1;keep.append((x,z))
print('trees',len(keep))
tarr=np.array(keep).round().astype('<i2')
# ---------- spawn ----------
# nearest free point to 14 m south of the gate (clear of the bus shelter and its label)
# with no building within 4 m, so the player can walk off in any direction
gate=(-128,-92)
bld=np.zeros_like(sea)
for b in d['buildings']: bld|=mask(b['p'])
room=ndimage.distance_transform_edt(~bld)
best=None;bd=1e9
for dz in range(12,40):
    for dx in range(-12,13):
        x,z=gate[0]+dx,gate[1]+dz;ix,iz=int(x-X0),int(z-Z0)
        if occupied[iz,ix] or sea[iz,ix] or room[iz,ix]<4: continue
        dd=math.hypot(dx,dz-14)
        if dd<bd: best,bd=(x,z),dd
print('spawn',best)
# ---------- bus stops ----------
import xml.etree.ElementTree as ET
r=ET.parse(os.path.join(ROOT,'data','map.osm')).getroot()
LON0,LAT0=121.7770,25.1500;KX=math.cos(math.radians(LAT0))*111320;KZ=110574
bus={}
for n in r.iter('node'):
    t={x.get('k'):x.get('v') for x in n.iter('tag')}
    nm=t.get('name','')
    if nm.startswith('海大('):
        bus.setdefault(nm,[]).append(((float(n.get('lon'))-LON0)*KX,(LAT0-float(n.get('lat')))*KZ))
busl=[{'zh':k,'x':round(p[0],1),'z':round(p[1],1)} for k,v in bus.items() for p in v]
print('bus',busl)
# ---------- pack ----------
OUTB=[]
for b in d['buildings']:
    nm=b['name'];lv=LEVELS.get(nm) or b['levels']
    if nm=='電機二館': lv=10
    if not lv:
        t=b['type'];lv={'apartments':6,'dormitory':9,'school':4,'university':5,'college':5,'industrial':2,'hospital':6,'ruins':1,'temple':2,'public':4,'office':5,'commercial':3,'retail':2}.get(t,3 if b['area']>120 else 2)
    lv=min(lv,14)
    no=b.get('no')
    zh=FIXNAME.get(nm,nm)
    if no and no in offd and b.get('assigned'): en=offd[no][2]
    else: en=EN.get(nm,'')
    if b['campus'] or nm=='機械與工程學系系館':
        if nm in DORMNO and no: zh=f'{offd[no][1]}（{nm}）' if no in offd and offd[no][1]!=nm and nm!='五南文化広場（海洋書坊）' else zh
    show=(b['campus'] or b.get('assigned') or nm=='機械與工程學系系館') and nm not in ('Amungus','男厠')
    OUTB.append({'n':zh if show else '','e':en if show else '','no':no or 0,'c':int(b['campus'] or bool(b.get('assigned'))),'d':int(bool(show) and nm!='7-Eleven'),'lv':lv,'t':b['type'],'p':b['p'],'lib':int(nm=='圖書館')})
# drop extra library parts labels (keep largest)
libs=[b for b in OUTB if b['lib']]
if libs:
    big=max(libs,key=lambda b:abs(sum(x1*z2-x2*z1 for (x1,z1),(x2,z2) in zip(b['p'],b['p'][1:]+b['p'][:1]))))
    for b in libs:
        if b is not big: b['n']='';b['d']=0
ROADS=[{'k':r['k'],'w':r['w'],'p':r['p'],'t':int(r['tunnel']),'nm':r['name'],'ln':r['lanes'],'ow':int(r['oneway']),'fw':r['fw']} for r in d['roads']]
AREAS=[{'k':a['k'],'s':a['sport'],'p':a['p'],'no':a.get('no',0)} for a in d['areas']]
PIERS=[{'k':p['k'],'c':int(p['closed']),'p':p['p']} for p in d['piers']]
data={'bounds':[X0,X1,Z0,Z1],'grid':grid,'trees':base64.b64encode(tarr.tobytes()).decode(),'b':OUTB,'r':ROADS,'a':AREAS,'pier':PIERS,'coast':d['coast'],'campus':d['campus'],'m':markers,'bus':busl,'spawn':best,'bench':d['bench'],'sig':d['signals'],'xing':d['crossings']}
s=json.dumps(data,ensure_ascii=False,separators=(',',':'))
open(os.path.join(ROOT,'data','game-data.json'),'w').write(s);print('data KB',len(s)//1024)

