import os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
import json, numpy as np, re
d=json.load(open(os.path.join(ROOT,'data','osm.json')))
# official map entries (no, zh, en, px, py) from the school map
OFF=[(1,'行政大樓','Administration Building',1240,480),(2,'展示廳、海洋廳','Exhibition Hall & Ocean Hall',1292,398),(3,'圖書館','Library',1375,468),(4,'綜合研究中心','Integrated Research Center',1340,545),(5,'綜合二館','Comprehensive Building 2',1432,540),(6,'宏廣書屋','Hongguang Bookstore',1420,500),(7,'郵局','Post Office',1278,562),(8,'機械B館、圖資處','Mechanical Eng. B & Library IT',1160,472),(9,'機械A館','Mechanical Eng. A',1075,442),(10,'育樂館','Recreation Hall',1070,335),(11,'商船系館','Merchant Marine',1000,398),(12,'延平技術大樓','Yanping Technology Building',985,300),(13,'輪機實習工廠','Marine Engineering Workshop',945,378),(14,'沛華大樓','Peihua Building',900,372),(15,'航管系館','Shipping & Transportation Mgmt.',848,350),(16,'勇泉','Yong Spring',850,248),(17,'海空大樓','Sea & Air Building',768,330),(18,'游泳運動中心','Swimming Center',775,258),(19,'第四宿舍','Dorm 4',745,175),(20,'第二餐廳','Second Cafeteria',782,188),(21,'第三宿舍','Dorm 3',832,160),(22,'學生活動中心','Student Activity Center',628,455),(23,'體育館','Gymnasium',725,462),(24,'運動場','Sports Field',885,555),(25,'籃球場','Basketball Courts',1048,612),(26,'海大意象館','NTOU Image Hall',1300,700),(27,'小艇碼頭','Boat Dock',1310,800),(28,'第二宿舍','Dorm 2',1350,145),(29,'射箭場','Archery Range',1305,215),(30,'第一餐廳','First Cafeteria',1388,218),(31,'綜合三館','Comprehensive Building 3',1362,302),(32,'龍崗生態園區','Longgang Ecological Park',1440,150),(33,'夢泉','Dream Spring',1455,285),(34,'人文大樓','Humanities Building',1432,342),(35,'山海迴廊','Mountain-Sea Corridor',1356,392),(36,'第一宿舍','Dorm 1',1610,192),(37,'景觀公園','Landscape Park',1612,260),(38,'海事大樓乙棟','Maritime Building B',1500,305),(39,'海事大樓甲棟','Maritime Building A',1515,392),(40,'創校紀念公園','Founding Memorial Park',1545,345),(41,'海事大樓丙棟','Maritime Building C',1590,300),(42,'校史博物館','University History Museum',1590,420),(43,'環態所館','Inst. of Marine Environment & Ecology',1678,292),(44,'養殖溫室','Aquaculture Greenhouse',1640,408),(45,'綜合一館','Comprehensive Building 1',1752,338),(46,'海洋系館','Ocean Science Building',1702,410),(47,'食安所館','Food Safety Institute',1665,468),(48,'排球場、網球場','Volleyball & Tennis Courts',1756,470),(49,'環漁系館','Environmental Biology & Fisheries',1888,342),(50,'生命科學院館','College of Life Sciences',1822,482),(51,'食品工程館','Food Engineering',1742,572),(52,'陸生動物實驗中心','Terrestrial Animal Lab',1716,614),(53,'食品科學系館','Food Science',1630,558),(54,'木蘭海洋海事教育大樓','Mulan Maritime Education Building',1910,735),(55,'雨水公園','Rain Garden',232,305),(56,'海洋工程綜合實驗館','Ocean Engineering Lab Complex',270,385),(57,'壘球場','Softball Field',218,530),(58,'河工一館','Hydraulic & Ocean Eng. 1',350,468),(59,'沙灘排球場','Beach Volleyball',305,622),(60,'造船系館','Naval Architecture',420,482),(61,'工學院、第三餐廳','College of Engineering & Third Cafeteria',462,515),(62,'電機一館','Electrical Engineering 1',500,557),(63,'電機二館','Electrical Engineering 2',540,612),(64,'資工系館','Computer Science & Engineering',580,642),(65,'水生動物實驗中心','Aquatic Animal Lab',692,650),(66,'海洋生物培育館','Marine Organism Cultivation',480,705),(67,'聲學實驗中心','Acoustics Lab',362,635),(68,'電資暨綜合教學大樓','EECS & Teaching Building',606,580),(69,'大型空蝕水槽實驗室','Cavitation Tunnel Lab',125,292),(70,'河工二館','Hydraulic & Ocean Eng. 2',155,355)]
ALIAS={'商船學系系館':11,'航管大樓':15,'游泳池':18,'第一餐廳FRB':30,'海事大樓':39,'海洋環境化學與生態研究所':43,'海洋環境資訊系系館':46,'食品科學學系館':53,'電機二館':63,'工學院':61,'海洋工程綜合試驗館':56,'綜合2管':5,'機械B館和圖資處':8}
offd={o[0]:o for o in OFF}
byname={o[1]:o[0] for o in OFF}
pairs=[]
for b in d['buildings']:
    n=b['name']; no=byname.get(n) or ALIAS.get(n)
    if no: b['no']=no; pairs.append((offd[no][3],offd[no][4],b['c'][0],b['c'][1],no))
print('matched',len(pairs),sorted(p[4] for p in pairs))
A=np.array([[px,py,1] for px,py,_,_,_ in pairs]);X=np.array([[x,z] for _,_,x,z,_ in pairs])
M,res,_,_=np.linalg.lstsq(A,X,rcond=None)
err=np.linalg.norm(A@M-X,axis=1)
print('affine residual m: mean %.1f max %.1f'%(err.mean(),err.max()))
for (px,py,x,z,no),e in zip(pairs,err):
    if e>60: print('  big',no,offd[no][1],round(e))
json.dump({'M':M.tolist()},open(os.path.join(ROOT,'data','affine.json'),'w'))
print('---- refit, campus only')
for b in d['buildings']:
    if not b['campus'] and b.get('no'): del b['no']
pairs=[(offd[b['no']][3],offd[b['no']][4],b['c'][0],b['c'][1],b['no']) for b in d['buildings'] if b.get('no')]
A=np.array([[px,py,1] for px,py,*_ in pairs]);X=np.array([[x,z] for _,_,x,z,_ in pairs])
M=np.linalg.lstsq(A,X,rcond=None)[0];res=X-A@M
print('residual mean %.1f'%np.linalg.norm(res,axis=1).mean())
def pred(px,py):
    base=np.array([px,py,1])@M
    dd=np.hypot(A[:,0]-px,A[:,1]-py)+1e-3;w=1/dd**2;idx=np.argsort(dd)[:5]
    return base+(res[idx]*w[idx,None]).sum(0)/w[idx].sum()
# leave-one-out check
errs=[]
for i in range(len(pairs)):
    px,py,x,z,no=pairs[i];A2=np.delete(A,i,0);X2=np.delete(X,i,0);M2=np.linalg.lstsq(A2,X2,rcond=None)[0];r2=X2-A2@M2
    dd=np.hypot(A2[:,0]-px,A2[:,1]-py)+1e-3;w=1/dd**2;idx=np.argsort(dd)[:5]
    p=np.array([px,py,1])@M2+(r2[idx]*w[idx,None]).sum(0)/w[idx].sum();errs.append(np.hypot(p[0]-x,p[1]-z))
print('LOO error mean %.1f median %.1f max %.1f'%(np.mean(errs),np.median(errs),np.max(errs)))
matched=set(b['no'] for b in d['buildings'] if b.get('no'))
unnamed=[b for b in d['buildings'] if b['campus'] and not b['name']]
used=set()
assign=[]
for o in OFF:
    if o[0] in matched: continue
    p=pred(o[3],o[4])
    best=sorted(unnamed,key=lambda b:np.hypot(b['c'][0]-p[0],b['c'][1]-p[1]))
    bd=np.hypot(best[0]['c'][0]-p[0],best[0]['c'][1]-p[1]) if best else 999
    print(o[0],o[1],'pred',np.round(p),'nearest unnamed',best[0]['id'] if best else None,round(bd),best[0]['area'] if best else '')
