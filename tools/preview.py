import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import json, matplotlib; matplotlib.use('Agg'); import matplotlib.pyplot as plt
d=json.load(open(os.path.join(ROOT,'data','osm.json')))
fig,ax=plt.subplots(figsize=(22,13));ax.set_aspect('equal');ax.invert_yaxis()
for a in d['areas']:
    xs,zs=zip(*a['p']);ax.fill(xs,zs,color={'natural=wood':'#4a9a4a','leisure=pitch':'#c86','leisure=park':'#9c9'}.get(a['k'],'#ddd'),alpha=.5)
for w in d['water']: xs,zs=zip(*w);ax.fill(xs,zs,color='#5af',alpha=.5)
for c in d['coast']: xs,zs=zip(*c);ax.plot(xs,zs,'b-',lw=2)
for p in d['piers']: xs,zs=zip(*p['p']);ax.plot(xs,zs,'k-',lw=1.5)
for r in d['roads']:
    xs,zs=zip(*r['p']);ax.plot(xs,zs,'-',color='#f80' if r['k'] in('primary','trunk','secondary') else ('#c00' if r['k']=='steps' else '#888'),lw=max(.6,r['w']/3))
for c in d['campus']: xs,zs=zip(*c);ax.plot(xs+(xs[0],),zs+(zs[0],),'m--',lw=1)
for b in d['buildings']:
    xs,zs=zip(*b['p']);ax.fill(xs,zs,color='#f5c' if b['campus'] else '#bbb',ec='k',lw=.5)
    if b['name']:ax.text(b['c'][0],b['c'][1],b['name'],fontsize=7,ha='center',fontname='Noto Sans CJK JP')
ax.set_xlim(-620,780);ax.set_ylim(420,-330);plt.savefig(os.path.join(ROOT,'docs','osm-preview.png'),dpi=80,bbox_inches='tight')
