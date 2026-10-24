# Fetches real ground heights (SRTM 30 m, via api.opentopodata.org) on a 30 m grid over the game area and saves
# data/dem.json. build.py uses it outside the original campus box (where the hills were estimated from woods).
import os,json,math,time,urllib.request
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LAT0,LON0=25.15,121.777;KX=math.cos(math.radians(LAT0))*111320;KZ=110574
X0,X1,Z0,Z1,STEP=-1552,2100,-1520,1250,30   # widened west to 正濱 and 和平島
xs=list(range(X0,X1+1,STEP));zs=list(range(Z0,Z1+1,STEP))
pts=[(z,x) for z in zs for x in xs]
H=[]
for i in range(0,len(pts),100):
    chunk=pts[i:i+100]
    loc='|'.join(f'{LAT0-z/KZ:.6f},{LON0+x/KX:.6f}' for z,x in chunk)
    for attempt in range(5):
        try:
            req=urllib.request.Request('https://api.opentopodata.org/v1/srtm30m?locations='+loc,headers={'User-Agent':'ntou-walk-game/1.0'})
            r=json.load(urllib.request.urlopen(req,timeout=60));break
        except Exception as e:
            print('retry',i,e);time.sleep(3)
    H+=[(q['elevation'] if q['elevation'] is not None else 0) for q in r['results']]
    time.sleep(1.1)
    print(i+len(chunk),'/',len(pts))
json.dump({'x0':X0,'z0':Z0,'step':STEP,'nx':len(xs),'nz':len(zs),'h':H,'source':'SRTM 30 m via opentopodata.org'},open(os.path.join(ROOT,'data','dem.json'),'w'))
