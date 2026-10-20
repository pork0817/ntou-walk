import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import json, base64, numpy as np, matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager as fm
from matplotlib.patches import Polygon, Rectangle
from matplotlib.colors import LightSource
import matplotlib.patheffects as pe
fm.fontManager.addfont('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
fm.fontManager.addfont('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc')
plt.rcParams['font.family']='Noto Sans CJK TC'
D=json.load(open(os.path.join(ROOT,'data','game-data.json')))
G=D['grid'];H=np.frombuffer(base64.b64decode(G['h']),dtype='<i2').reshape(G['nz'],G['nx'])/10
x0,z0,c=G['x0'],G['z0'],G['cell'];X1=x0+(G['nx']-1)*c;Z1=z0+(G['nz']-1)*c
PPM=4  # pixels per metre
W,Hh=(X1-x0),(Z1-z0)
fig=plt.figure(figsize=(W*PPM/100,Hh*PPM/100+1.6),dpi=100)
ax=fig.add_axes([0,1.6/(Hh*PPM/100+1.6),1,Hh*PPM/100/(Hh*PPM/100+1.6)])
ax.set_xlim(x0,X1);ax.set_ylim(Z1,z0);ax.set_aspect('equal');ax.axis('off')
# terrain: hillshade over land colours, sea in blue
ls=LightSource(azdeg=315,altdeg=45)
land=np.ma.masked_where(H<0,H)
shade=ls.hillshade(np.where(H<0,0,H),vert_exag=3,dx=c,dy=c)
rgb=np.zeros(H.shape+(3,))
base=np.array([0.72,0.85,0.58])
rgb[:]=base
rgb=rgb*(0.55+0.45*shade[...,None])
rgb[H<0]=[0.44,0.71,0.88]
ax.imshow(rgb,extent=[x0-c/2,X1+c/2,Z1+c/2,z0-c/2],interpolation='bilinear',zorder=0)
def poly(p,**k):ax.add_patch(Polygon(p,closed=True,**k))
for a in D['a']:
    col={'natural=wood':'#5f9e55','leisure=park':'#9ccc78','landuse=recreation_ground':'#9ccc78','landuse=grass':'#9ccc78','amenity=parking':'#c9cdd0','leisure=pitch':'#d9744f' if a['s'] else '#c94f45','leisure=swimming_pool':'#4fb3e6'}.get(a['k'])
    if col: poly(a['p'],fc=col,ec='none',alpha=.55 if a['k']=='natural=wood' else .9,zorder=1)
for c_ in D['campus']: poly(c_,fc='#e8eef0',ec='#6d8a93',lw=1.2,alpha=.55,zorder=1.5)
for p in D['pier']:
    if p['c']: poly(p['p'],fc='#d9d4c6',ec='#8a8f96',lw=.8,zorder=2)
    else:
        xs,zs=zip(*p['p']);ax.plot(xs,zs,color='#a9a59c',lw=4,zorder=2,solid_capstyle='round')
# contour lines every 2 m (index every 10 m) so slopes are visible
xs=np.linspace(x0,X1,G['nx']);zs=np.linspace(z0,Z1,G['nz'])
Hl=np.where(H<0,np.nan,H)
cs=ax.contour(xs,zs,Hl,levels=np.arange(2,80,2),colors='#6b5a3a',linewidths=.35,alpha=.6,zorder=3)
ci=ax.contour(xs,zs,Hl,levels=np.arange(10,80,10),colors='#5a4a2a',linewidths=.9,alpha=.8,zorder=3)
ax.clabel(ci,fmt='%d m',fontsize=7,inline=True)
RANK={'trunk':5,'primary':5,'secondary':4,'tertiary':3,'tertiary_link':3,'unclassified':2,'residential':2,'living_street':2,'service':1}
roads=[r for r in D['r'] if not r['t']]
roads.sort(key=lambda r:RANK.get(r['k'],0))
lw=lambda m:m*PPM*72/100  # metres -> points
for r in roads:
    xs_,zs_=zip(*r['p']);rk=RANK.get(r['k'],0)
    if r['k']=='steps': continue
    if rk>=1: ax.plot(xs_,zs_,color='#cfc9bd',lw=lw(r['w']+(5.2 if rk>=3 else 1)),solid_capstyle='round',zorder=4)
for r in roads:
    xs_,zs_=zip(*r['p']);rk=RANK.get(r['k'],0)
    if r['k']=='steps': continue
    col='#4a4f55' if rk>=4 else '#5b6066' if rk>=2 else '#6a6f74' if rk>=1 else ('#bba67e' if r['k'] in('path','track') else '#e9dcc4')
    ax.plot(xs_,zs_,color=col,lw=lw(r['w']),solid_capstyle='round',zorder=5 if rk>=1 else 4.5)
    if rk>=4 and not r['ow']: ax.plot(xs_,zs_,color='#f2c230',lw=.8,zorder=5.1)
# existing stairs: red ladder so you can see what the game already has
for r in roads:
    if r['k']!='steps':continue
    xs_,zs_=zip(*r['p'])
    ax.plot(xs_,zs_,color='#d8262f',lw=lw(2.6),zorder=6,solid_capstyle='butt')
    ax.plot(xs_,zs_,color='white',lw=lw(1.8),zorder=6.1,dashes=(1.2,1.2))
for b in D['b']:
    fc='#f3d58a' if b['c'] else '#e4e1db'
    poly(b['p'],fc=fc,ec='#1b2a3a',lw=.8,zorder=7)
for b in D['b']:
    if not b['n']:continue
    p=np.array(b['p']);cx,cz=p.mean(0)
    t=(f"{b['no']} " if b['no'] else '')+b['n']
    ax.text(cx,cz,t,fontsize=7.5,ha='center',va='center',zorder=9,color='#13304a',weight='bold',path_effects=[pe.withStroke(linewidth=2.2,foreground='white')])
for m in D['m']:
    ax.plot(m['x'],m['z'],'o',ms=6,mfc='#ff8a3d',mec='#13304a',zorder=9)
    ax.text(m['x'],m['z']-4,f"{m['no']} {m['zh']}",fontsize=7,ha='center',va='bottom',zorder=9,color='#7a3a10',path_effects=[pe.withStroke(linewidth=2,foreground='white')])
for s in D['sig']:ax.plot(*s,marker='s',ms=5,mfc='#2fd17a',mec='k',zorder=9)
seen=set()
for s in D['bus']:
    ax.plot(s['x'],s['z'],marker='^',ms=6,mfc='#2fa4d6',mec='k',zorder=9)
ax.plot(*D['spawn'],marker='*',ms=14,mfc='#ff8a3d',mec='k',zorder=10)
# 50 m reference grid with labels on every edge
cols=[];import string
def colname(i):return string.ascii_uppercase[i] if i<26 else 'A'+string.ascii_uppercase[i-26]
gx=np.arange(np.floor(x0/50)*50,X1+1,50);gz=np.arange(np.floor(z0/50)*50,Z1+1,50)
for v in gx: ax.axvline(v,color='#13304a',lw=.5,alpha=.35,zorder=8)
for v in gz: ax.axhline(v,color='#13304a',lw=.5,alpha=.35,zorder=8)
for i in range(len(gx)-1):
    xm=(gx[i]+gx[i+1])/2
    if xm<x0 or xm>X1:continue
    for zz,va in ((z0+3,'top'),(Z1-3,'bottom')):
        ax.text(xm,zz,colname(i),fontsize=11,ha='center',va=va,weight='bold',color='#13304a',zorder=11,path_effects=[pe.withStroke(linewidth=3,foreground='white')])
for j in range(len(gz)-1):
    zm=(gz[j]+gz[j+1])/2
    if zm<z0 or zm>Z1:continue
    for xx,ha in ((x0+3,'left'),(X1-3,'right')):
        ax.text(xx,zm,str(j+1),fontsize=11,ha=ha,va='center',weight='bold',color='#13304a',zorder=11,path_effects=[pe.withStroke(linewidth=3,foreground='white')])
# north arrow + scale bar
ax.annotate('',xy=(X1-30,z0+25),xytext=(X1-30,z0+55),arrowprops=dict(arrowstyle='-|>',lw=2,color='#13304a'),zorder=12)
ax.text(X1-30,z0+20,'N',fontsize=14,weight='bold',ha='center',va='bottom',zorder=12,color='#13304a')
ax.add_patch(Rectangle((x0+20,Z1-30),100,4,fc='#13304a',zorder=12));ax.add_patch(Rectangle((x0+20,Z1-30),50,4,fc='white',ec='#13304a',zorder=12))
ax.text(x0+20,Z1-33,'0',fontsize=9,ha='center',zorder=12);ax.text(x0+70,Z1-33,'50',fontsize=9,ha='center',zorder=12);ax.text(x0+120,Z1-33,'100 m',fontsize=9,ha='center',zorder=12)
# legend strip
lg=fig.add_axes([0,0,1,1.6/(Hh*PPM/100+1.6)]);lg.axis('off');lg.set_xlim(0,100);lg.set_ylim(0,1)
items=[('■','#f3d58a','校園建築 Campus building'),('●','#ff8a3d','標示點 Signpost place'),('▲','#2fa4d6','公車站 Bus stop'),('■','#2fd17a','紅綠燈 Traffic signal'),('▬','#d8262f','現有階梯 Stairs in game'),('〰','#6b5a3a','等高線 2 m (粗線 10 m)'),('★','#ff8a3d','出發點 Start')]
for i,(sym,col,t) in enumerate(items):
    lg.text(1+i*14,0.62,sym,color=col,fontsize=18,va='center',path_effects=[pe.withStroke(linewidth=1.5,foreground='#13304a')])
    lg.text(3+i*14,0.62,t,fontsize=11,va='center',color='#13304a')
lg.text(1,0.2,'海大漫遊 遊戲地圖 · 格線每格 50 m（例：「K7 加樓梯」）· 標記：樓梯、斜坡、護欄、其他修正 · Map data © OpenStreetMap contributors',fontsize=11,va='center',color='#13304a')
fig.savefig(os.path.join(ROOT,'docs','ntou-game-map.png'),dpi=100,facecolor='white')
print(fig.get_size_inches()*100)
