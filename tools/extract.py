import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import xml.etree.ElementTree as ET, json, math, sys
import numpy as np
from matplotlib.path import Path
F=os.path.join(ROOT,'data','map.osm')
r=ET.parse(F).getroot()
LAT0,LON0=25.1500,121.7770
KX=math.cos(math.radians(LAT0))*111320; KZ=110574
def P(lat,lon): return ((lon-LON0)*KX,(LAT0-lat)*KZ)   # x east, z south (m)
nodes={}; ntags={}
for n in r.iter('node'):
    nodes[n.get('id')]=P(float(n.get('lat')),float(n.get('lon')))
    t={x.get('k'):x.get('v') for x in n.iter('tag')}
    if t: ntags[n.get('id')]=t
ways={}
for w in r.iter('way'):
    ways[w.get('id')]=([n.get('ref') for n in w.iter('nd')],{t.get('k'):t.get('v') for t in w.iter('tag')})
rels={}
for rl in r.iter('relation'):
    rels[rl.get('id')]=([(m.get('type'),m.get('ref'),m.get('role')) for m in rl.iter('member')],{t.get('k'):t.get('v') for t in rl.iter('tag')})
def pts(wid): return [nodes[n] for n in ways[wid][0] if n in nodes]
# region of the game (m)
X0,X1,Z0,Z1=-1572,2120,-1540,1270   # campus box was -620..780 × -330..420; widened east to 碧砂漁港 and 八斗子, west to 正濱 and 和平島
def inreg(p,m=0): return X0-m<p[0]<X1+m and Z0-m<p[1]<Z1+m
campus=[pts(ref) for t,ref,role in rels['5473923'][0] if ref in ways]
cp=[Path(np.array(c)) for c in campus]
def incampus(x,z): return any(p.contains_point((x,z)) for p in cp)
def area(p):
    a=0
    for i in range(len(p)): x1,z1=p[i-1];x2,z2=p[i];a+=x1*z2-x2*z1
    return a/2
out={'campus':[[[round(x,1),round(z,1)] for x,z in c] for c in campus],'buildings':[],'roads':[],'areas':[],'coast':[],'piers':[],'water':[],'bench':[]}
# buildings (also building parts in relations as multipolygon outer)
for wid,(nd,t) in ways.items():
    if 'building' not in t: continue
    p=pts(wid)
    if len(p)<4: continue
    if p[0]==p[-1]: p=p[:-1]
    cx=sum(q[0] for q in p)/len(p); cz=sum(q[1] for q in p)/len(p)
    if not inreg((cx,cz)): continue
    A=abs(area(p))
    if A<25: continue
    lv=t.get('building:levels'); 
    try: lv=float(lv) if lv else None
    except: lv=None
    out['buildings'].append({'id':wid,'name':t.get('name',''),'type':t.get('building'),'levels':lv,'campus':incampus(cx,cz),'c':[round(cx,1),round(cz,1)],'area':round(A),'p':[[round(x,1),round(z,1)] for x,z in p]})
for rid,(mem,t) in rels.items():
    if 'building' in t and t.get('type')=='multipolygon':
        for ty,ref,role in mem:
            if ty=='way' and role=='outer' and ref in ways:
                p=pts(ref)
                if p[0]==p[-1]: p=p[:-1]
                cx=sum(q[0] for q in p)/len(p); cz=sum(q[1] for q in p)/len(p)
                if not inreg((cx,cz)): continue
                lv=t.get('building:levels')
                try: lv=float(lv) if lv else None
                except: lv=None
                out['buildings'].append({'id':'r'+rid+'_'+ref,'name':t.get('name',''),'type':t.get('building'),'levels':lv,'campus':incampus(cx,cz),'c':[round(cx,1),round(cz,1)],'area':round(abs(area(p))),'p':[[round(x,1),round(z,1)] for x,z in p]})
W={'motorway':14,'trunk':14,'primary':13,'secondary':11,'tertiary':9,'tertiary_link':7,'unclassified':7,'residential':7,'service':5,'living_street':6,'pedestrian':5,'footway':2.6,'path':2.2,'cycleway':2.6,'steps':2.6,'track':3.5}
for wid,(nd,t) in ways.items():
    h=t.get('highway')
    if h not in W or t.get('area')=='yes': continue
    p=pts(wid)
    if not any(inreg(q,40) for q in p): continue
    lanes=t.get('lanes');ow=t.get('oneway')=='yes'
    try: lanes=int(lanes)
    except: lanes=None
    w=W[h]
    if lanes and h in('primary','trunk','secondary','tertiary','unclassified','residential'): w=lanes*3.3+(0 if ow else 2.4)
    out['roads'].append({'id':wid,'k':h,'w':round(w,1),'lanes':lanes or 0,'oneway':ow,'fw':t.get('footway',''),'name':t.get('name',''),'tunnel':t.get('tunnel','')=='yes' or t.get('layer','0').startswith('-'),'bridge':t.get('bridge','')=='yes','p':[[round(x,1),round(z,1)] for x,z in p]})
for wid,(nd,t) in ways.items():
    p=pts(wid)
    if not p or not any(inreg(q,60) for q in p): continue
    if t.get('natural')=='coastline': out['coast'].append([[round(x,1),round(z,1)] for x,z in p])
    elif t.get('man_made') in ('pier','breakwater','quay') : out['piers'].append({'k':t.get('man_made'),'closed':nd[0]==nd[-1],'name':t.get('name',''),'p':[[round(x,1),round(z,1)] for x,z in p]})
    elif t.get('natural')=='water' or t.get('waterway') in ('dock','boatyard','riverbank') or t.get('landuse')=='harbour':
        if nd[0]==nd[-1]: out['water'].append([[round(x,1),round(z,1)] for x,z in p])
    elif 'building' not in t and 'highway' not in t and nd[0]==nd[-1]:
        k=None
        for key in ('leisure','natural','landuse','amenity'):
            if key in t: k=key+'='+t[key];break
        if k and k.split('=')[1] in ('pitch','swimming_pool','park','wood','parking','recreation_ground','grass','garden','stadium','sports_centre','track','school','scrub','residential','military','construction','bare_rock','beach'):
            out['areas'].append({'k':k,'sport':t.get('sport',''),'name':t.get('name',''),'p':[[round(x,1),round(z,1)] for x,z in p]})
# multipolygon relations for water/wood
for rid,(mem,t) in rels.items():
    if t.get('type')!='multipolygon': continue
    if t.get('natural') in ('water','wood') or t.get('landuse') in ('harbour',):
        for ty,ref,role in mem:
            if ty=='way' and ref in ways and role=='outer':
                p=pts(ref)
                if p and any(inreg(q,60) for q in p):
                    if t.get('natural')=='wood': out['areas'].append({'k':'natural=wood','sport':'','name':'','p':[[round(x,1),round(z,1)] for x,z in p]})
                    else: out['water'].append([[round(x,1),round(z,1)] for x,z in p])
out['signals']=[];out['crossings']=[]
for nid,t in ntags.items():
    if t.get('highway')=='traffic_signals' and inreg(nodes[nid],20): out['signals'].append([round(v,1) for v in nodes[nid]])
    if t.get('highway')=='crossing' and inreg(nodes[nid],20): out['crossings'].append([round(v,1) for v in nodes[nid]])
for nid,t in ntags.items():
    if 'ele' in t and inreg(nodes[nid],50): out['bench'].append({'name':t.get('name',''),'ele':float(t['ele'].split()[0]),'c':[round(v,1) for v in nodes[nid]]})
    if t.get('name') in ('夢泉',) : out['spring']=[round(v,1) for v in nodes[nid]]
json.dump(out,open(os.path.join(ROOT,'data','osm.json'),'w'),ensure_ascii=False)
print({k:len(v) for k,v in out.items() if isinstance(v,list)})
print('campus buildings',sum(b['campus'] for b in out['buildings']))
xs=[q[0] for c in campus for q in c];zs=[q[1] for c in campus for q in c];print('campus extent',min(xs),max(xs),min(zs),max(zs))
print(out['bench'])
