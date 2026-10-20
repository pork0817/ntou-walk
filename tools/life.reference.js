/* =====================================================================
   CAMPUS LIFE: clock and sky, signal timing, traffic, students, bikes, emotes
   ===================================================================== */

/* ---------- clock: Taiwan time, with an hour offset and a ×60 fast-forward ---------- */
const CLOCK={offset:0,fast:false,acc:0};
function realSecTaipei(){const d=new Date();return ((d.getUTCHours()+8)%24)*3600+d.getUTCMinutes()*60+d.getUTCSeconds()+d.getUTCMilliseconds()/1000;}
function gameSec(){let s=(realSecTaipei()+CLOCK.offset*3600+CLOCK.acc)%86400;if(s<0)s+=86400;return s;}
function gameHour(){return gameSec()/3600;}
// relative traffic and crowd level by hour 0–23: morning rush 7–9, the big one 16–19, almost nothing after midnight
const TRAFFIC=[0.06,0.04,0.03,0.03,0.05,0.12,0.35,0.8,0.95,0.6,0.5,0.55,0.65,0.55,0.5,0.6,0.95,1.0,0.9,0.55,0.4,0.3,0.2,0.1];
const CROWD=[0.05,0.03,0.02,0.01,0.01,0.02,0.1,0.45,0.9,0.85,0.8,0.85,1.0,0.95,0.85,0.85,0.9,0.8,0.65,0.55,0.45,0.35,0.2,0.1];
function profile(arr,h){const i=Math.floor(h)%24,j=(i+1)%24,f=h-Math.floor(h);return arr[i]*(1-f)+arr[j]*f;}
const isNight=h=>h>=23||h<6;
const isPeak=h=>(h>=7&&h<9)||(h>=16&&h<19);
function periodLabel(h){return isNight(h)?'深夜 · 閃光號誌':isPeak(h)?'尖峰時段':'一般時段';}
function fmtClock(){const s=gameSec();const hh=Math.floor(s/3600),mm=Math.floor(s%3600/60);return String(hh).padStart(2,'0')+':'+String(mm).padStart(2,'0');}

/* ---------- sky and light follow the hour ---------- */
const SKY_DAY=new THREE.Color(0x9fdcf5),SKY_DUSK=new THREE.Color(0xf2a76b),SKY_NIGHT=new THREE.Color(0x14233b);
const hemi=scene.children.find(o=>o.isHemisphereLight);
let lampMats=[];
function smooth(a,b,x){const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}
let nightLevel=0;
function updateSky(){
  const h=gameHour();
  const day=smooth(5.3,7,h)*(1-smooth(17.6,19.2,h));
  const dusk=Math.max(smooth(5,6.2,h)*(1-smooth(6.2,7.4,h)),smooth(16.8,18,h)*(1-smooth(18,19.4,h)));
  const c=SKY_NIGHT.clone().lerp(SKY_DAY,day).lerp(SKY_DUSK,dusk*0.75);
  scene.background.copy(c);scene.fog.color.copy(c);
  sun.intensity=0.08+0.85*day;sun.color.setHex(dusk>0.3?0xffc89a:0xfff4e0);
  if(hemi)hemi.intensity=0.32+0.32*day;
  nightLevel=1-day;
  for(const m of lampMats)m.color.setHex(nightLevel>0.5?0xfff1b0:0xf4efe0);
  // sun moves across the sky (rises over the sea to the east, sets behind the hills)
  const a=(h-6)/12*Math.PI;sunDir.set(Math.cos(a)*70,Math.max(15,Math.sin(a)*90),35);
}
const sunDir=new THREE.Vector3(50,90,35);

/* ---------- traffic signals: real cycle times by period ---------- */
// peak: 62 s main green; off-peak: 42 s; 23:00–06:00 flashing yellow for the main road (台灣 閃光號誌)
function sigPlan(h){if(isNight(h))return null;return isPeak(h)?{G:62,Y:3,A:2,W:20,F:7,B:3}:{G:42,Y:3,A:2,W:18,F:6,B:3};}
const SIG_T0=performance.now()/1000;
function sigState(x){
  const pl=sigPlan(gameHour());
  if(!pl)return {main:'FY',ped:'off',left:0};
  const cyc=pl.G+pl.Y+pl.A+pl.W+pl.B;
  let t=(performance.now()/1000-SIG_T0+(x.offset||0))%cyc;
  if(t<pl.G)return {main:'G',ped:'D',left:Math.ceil(pl.G-t)};t-=pl.G;
  if(t<pl.Y)return {main:'Y',ped:'D',left:0};t-=pl.Y;
  if(t<pl.A)return {main:'R',ped:'D',left:0};t-=pl.A;
  if(t<pl.W)return {main:'R',ped:t>pl.W-pl.F?'FW':'W',left:Math.ceil(pl.W-t)};
  return {main:'R',ped:'D',left:0};
}
function drawPedSignal(h,state,left,blink){
  const g=h.pc.getContext('2d');g.fillStyle='#14181c';g.fillRect(0,0,64,96);
  const man=(col,walking,frame)=>{g.fillStyle=col;g.beginPath();g.arc(32,18,6,0,TAU);g.fill();
    g.lineWidth=6;g.lineCap='round';g.strokeStyle=col;g.beginPath();g.moveTo(32,26);g.lineTo(32,46);g.stroke();
    if(walking){const k=frame?1:-1;g.beginPath();g.moveTo(32,46);g.lineTo(32+9*k,60);g.moveTo(32,46);g.lineTo(32-7*k,60);g.moveTo(32,30);g.lineTo(32+8*k,40);g.moveTo(32,30);g.lineTo(32-8*k,40);g.stroke();}
    else{g.beginPath();g.moveTo(32,46);g.lineTo(28,62);g.moveTo(32,46);g.lineTo(36,62);g.moveTo(32,30);g.lineTo(25,44);g.moveTo(32,30);g.lineTo(39,44);g.stroke();}};
  if(state==='off'){}
  else if(state==='D')man('#ff3b30',false);
  else if(state==='W'||(state==='FW'&&blink))man('#39e07a',true,Math.floor(performance.now()/350)%2);
  if((state==='W'||state==='FW')&&left>0){g.fillStyle=state==='FW'?'#ffcf33':'#39e07a';g.font='800 22px "Baloo 2",Arial,sans-serif';g.textAlign='center';g.fillText(String(left),32,88);}
  h.pt.needsUpdate=true;
}
function updateSignals(){
  const blink=Math.floor(performance.now()/500)%2===0;
  for(const x of xingSpots){if(!x.heads)continue;
    const st=sigState(x);x.state=st;
    const near=Math.hypot(x.x-P.x,x.z-P.z)<90;
    for(const h of x.heads){
      const [r,y,g]=h.veh;
      r.opacity=st.main==='R'?1:0.18;g.opacity=st.main==='G'?1:0.18;
      y.opacity=st.main==='Y'||(st.main==='FY'&&blink)?1:0.18;
      if(near){const key=st.ped+'|'+st.left+'|'+(st.ped==='FW'?blink:'')+'|'+(st.ped==='W'?Math.floor(performance.now()/350)%2:'');
        if(key!==h.last){h.last=key;drawPedSignal(h,st.ped,st.left,blink);}}
    }
  }
}

/* ---------- speech bubbles ---------- */
const bubbleCache=new Map();
function bubbleTex(text){
  if(bubbleCache.has(text))return bubbleCache.get(text);
  const c=document.createElement('canvas');const g=c.getContext('2d');
  g.font='700 44px "Noto Sans TC",sans-serif';const tw=Math.ceil(g.measureText(text).width);
  c.width=tw+56;c.height=112;
  g.font='700 44px "Noto Sans TC",sans-serif';
  g.fillStyle='#0b1c2c';roundRect(g,2,2,c.width-4,82,26);g.fill();
  g.beginPath();g.moveTo(c.width/2-14,80);g.lineTo(c.width/2,108);g.lineTo(c.width/2+14,80);g.fill();
  g.fillStyle='#ffffff';roundRect(g,6,6,c.width-12,74,22);g.fill();
  g.beginPath();g.moveTo(c.width/2-9,78);g.lineTo(c.width/2,100);g.lineTo(c.width/2+9,78);g.fill();
  g.fillStyle='#13304a';g.textAlign='center';g.textBaseline='middle';g.fillText(text,c.width/2,44);
  const t=new THREE.CanvasTexture(c);const r={t,ar:c.width/c.height};
  if(bubbleCache.size>160)bubbleCache.clear();
  bubbleCache.set(text,r);return r;
}
function say(o,text,dur=3.6){
  if(!o.bubble){o.bubble=new THREE.Sprite(new THREE.SpriteMaterial({depthWrite:false,fog:false,transparent:true}));o.bubble.renderOrder=5;scene.add(o.bubble);}
  const b=bubbleTex(text);o.bubble.material.map=b.t;o.bubble.material.needsUpdate=true;
  const hgt=0.85;o.bubble.scale.set(hgt*b.ar,hgt,1);o.bubble.visible=true;o.bubbleT=dur;
}
function tickBubble(o,dt,x,y,z){
  if(!o.bubble)return;
  if(o.bubbleT>0){o.bubbleT-=dt;o.bubble.position.set(x,y,z);o.bubble.visible=o.bubbleT>0&&Math.hypot(x-P.x,z-P.z)<45;}
  else o.bubble.visible=false;
}
const playerTalk={bubbleT:0};
const pick=a=>a[(Math.random()*a.length)|0];
const LINES={
  pair:['第一餐廳今天吃什麼？','等一下要去圖書館嗎？','風好大，傘要飛走了','期中考好難……','報告明天要交！','下課去八斗子吃海鮮？','又下雨了，基隆真的是雨港','教授又延堂了','社團今天要練習嗎？','我腳踏車停哪了……','去 7-Eleven 買咖啡','晚上去潮境公園看夜景？','實習好累喔','海大的夕陽很漂亮','公車又過站了','等等體育課要跑步','你選了哪一堂通識？','宿舍網路又斷了','好想吃八方雲集','明天早八，好想睡'],
  peak:['北寧路好塞','下班時間車好多','公車要擠爆了','過馬路小心一點'],
  night:['好晚了，回宿舍吧','今天星星好多','宵夜要吃什麼？','海風好冷','報告寫到半夜……'],
  morning:['早安！','早八好痛苦','你吃早餐了嗎？','快遲到了！'],
  phone:['喂？我在海大這邊','嗯嗯，等一下到','我快到了啦','好，晚點打給你'],
  wait:['紅燈好久喔','等綠燈','這個路口車好多'],
  hello:['嗨！','同學好！','你也是海大的嗎？','要不要一起去吃飯？','今天天氣不錯欸'],
  bikeHello:['騎車小心喔！','腳踏車好帥！','借我騎一下啦'],
  react:{wave:['嗨～','哈囉！','你好！'],cheer:['加油！','耶！','好嗨喔！'],bow:['你好你好','不用這麼客氣啦','（回禮）'],dance:['哈哈，跳得不錯！','好會跳！','我也要跳！'],sit:['在休息喔？','累了嗎？','坐這邊看海不錯']}
};
function chatLine(){const h=gameHour();
  if(isNight(h)&&Math.random()<0.6)return pick(LINES.night);
  if(h>=6.5&&h<9.5&&Math.random()<0.4)return pick(LINES.morning);
  if(isPeak(h)&&Math.random()<0.25)return pick(LINES.peak);
  return pick(LINES.pair);}

/* ---------- traffic: lanes, vehicles, signals, bus stops ---------- */
const VEH={chains:[],list:[],max:isTouch?26:50};
function projectOn(c,x,z){let best=null;for(let i=0;i<c.pts.length-1;i++){const [ax,az]=c.pts[i],[bx,bz]=c.pts[i+1];const dx=bx-ax,dz=bz-az,L2=dx*dx+dz*dz||1;let t=((x-ax)*dx+(z-az)*dz)/L2;t=Math.max(0,Math.min(1,t));const px=ax+dx*t,pz=az+dz*t;const d=Math.hypot(x-px,z-pz);if(!best||d<best.d)best={d,s:c.cum[i]+Math.sqrt(L2)*t,side:Math.sign((x-px)*(-dz)+(z-pz)*dx)||1};}return best;}
function chainAt(c,s){s=Math.max(0,Math.min(c.L-1e-3,s));let lo=0,hi=c.cum.length-1;while(hi-lo>1){const m=(lo+hi)>>1;if(c.cum[m]<=s)lo=m;else hi=m;}
  const [ax,az]=c.pts[lo],[bx,bz]=c.pts[lo+1];const seg=c.cum[lo+1]-c.cum[lo]||1;const t=(s-c.cum[lo])/seg;return {x:ax+(bx-ax)*t,z:az+(bz-az)*t,tx:(bx-ax)/seg,tz:(bz-az)/seg};}
function buildChains(){
  const segs=ROADS3.filter(r=>(RANK[r.k]??0)>=3).map(r=>({pts:r.p.map(q=>q.slice()),w:r.w,ln:r.ln||((RANK[r.k]??0)>=4?4:2),ow:!!r.ow,nm:r.nm,used:false}));
  const close=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1])<0.8;
  for(const s of segs){if(s.used)continue;s.used=true;let pts=s.pts.slice();
    let grown=true;while(grown){grown=false;for(const o of segs){if(o.used||o.nm!==s.nm||o.ow!==s.ow||Math.abs(o.w-s.w)>0.6)continue;
      const end=pts[pts.length-1],st=pts[0];
      if(close(end,o.pts[0])){pts=pts.concat(o.pts.slice(1));o.used=true;grown=true;}
      else if(close(o.pts[o.pts.length-1],st)){pts=o.pts.slice(0,-1).concat(pts);o.used=true;grown=true;}
      else if(!s.ow&&close(end,o.pts[o.pts.length-1])){pts=pts.concat(o.pts.slice(0,-1).reverse());o.used=true;grown=true;}
      else if(!s.ow&&close(st,o.pts[0])){pts=o.pts.slice(1).reverse().concat(pts);o.used=true;grown=true;}}}
    const cum=[0];for(let i=1;i<pts.length;i++)cum.push(cum[i-1]+Math.hypot(pts[i][0]-pts[i-1][0],pts[i][1]-pts[i-1][1]));
    const L=cum[cum.length-1];if(L<60)continue;
    const W=s.w,lanes=[];
    if(s.ow){const n=Math.max(1,s.ln);for(let i=0;i<n;i++)lanes.push({off:-W/2+0.55+(i+0.5)*(W-1.1)/n,dir:1,outer:i===n-1});}
    else{const m=Math.max(1,Math.round(s.ln/2));const inner=(W/2-0.8)/m;for(let i=0;i<m;i++){lanes.push({off:0.25+(i+0.5)*inner,dir:1,outer:i===m-1});lanes.push({off:-(0.25+(i+0.5)*inner),dir:-1,outer:i===m-1});}}
    lanes.forEach(l=>{l.acc=Math.random()*4;l.veh=[];});
    const c={pts,cum,L,w:W,nm:s.nm,lanes,stops:[],busStops:[],bus:s.nm==='北寧路'||s.nm==='中正路'};
    for(const l of lanes)l.c=c;
    VEH.chains.push(c);
  }
  for(const c of VEH.chains){
    for(const x of xingSpots.concat(PXING)){const pr=projectOn(c,x.x,x.z);if(pr&&pr.d<c.w/2+3&&pr.s>8&&pr.s<c.L-8)c.stops.push({s:pr.s,x});}
    if(c.bus)for(const b of BUS_SHELTERS){const pr=projectOn(c,b.x,b.z);if(pr&&pr.d<c.w/2+5)c.busStops.push({s:pr.s,side:pr.side});}
  }
  xingSpots.forEach((x,i)=>{x.offset=(i*23.7)%60;});
}
// ---- vehicle models ----
function vehWheel(g,wheels,x,z,r,w){const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,w,12),toon(0x22272c));m.rotation.z=Math.PI/2;m.position.set(x,r,z);g.add(m);wheels.push(m);}
const busSideTex=tileTex('busside',512,128,(g,w,h)=>{g.fillStyle='#f6f6f2';g.fillRect(0,0,w,h);g.fillStyle='#1f6fa8';g.fillRect(0,86,w,16);g.fillStyle='#2fb0a0';g.fillRect(0,104,w,6);
  g.fillStyle='#2c3e4c';for(let x=18;x<w-30;x+=56)g.fillRect(x,22,46,46);g.fillStyle='rgba(255,255,255,.35)';for(let x=22;x<w-30;x+=56)g.fillRect(x,26,10,38);
  g.fillStyle='#1f6fa8';g.font='800 18px "Noto Sans TC",sans-serif';g.fillText('基隆市公車',w-120,120);});
busSideTex.wrapS=THREE.ClampToEdgeWrapping;
const busFrontTex=tileTex('busfront',128,128,(g,w,h)=>{g.fillStyle='#f6f6f2';g.fillRect(0,0,w,h);g.fillStyle='#14181c';g.fillRect(8,6,112,22);
  g.fillStyle='#ffb020';g.font='800 18px "Noto Sans TC",sans-serif';g.textAlign='center';g.fillText(pick(['103 八斗子','104 新豐街','108 潮境公園']),64,24);
  g.fillStyle='#2c3e4c';g.fillRect(10,34,108,52);g.fillStyle='#1f6fa8';g.fillRect(0,100,w,10);
  g.fillStyle='#fff4c8';g.fillRect(10,112,22,10);g.fillRect(96,112,22,10);});
function makeVehicle(type){
  const g=new THREE.Group();const wheels=[];let len,wid,lights=[];
  const lamp=(x,y,z,c)=>{const m=new THREE.Mesh(new THREE.BoxGeometry(0.28,0.14,0.06),new THREE.MeshBasicMaterial({color:c}));m.position.set(x,y,z);g.add(m);lights.push(m);};
  if(type==='car'||type==='taxi'){
    const col=type==='taxi'?0xf2c230:pick([0xf4f4f2,0xc9ced3,0x2b2f36,0xd8463c,0x2f6fb8,0xf4f4f2,0x7d8a94,0x8fb3c8]);
    len=4.3;wid=1.8;
    const body=shade(new THREE.Mesh(new THREE.BoxGeometry(1.8,0.72,4.3),toon(col)),true,false);body.position.y=0.66;g.add(body);
    const cab=shade(new THREE.Mesh(new THREE.BoxGeometry(1.6,0.58,2.2),[toon(0x3d5568),toon(0x3d5568),toon(col),toon(col),toon(0x3d5568),toon(0x3d5568)]),true,false);cab.position.set(0,1.3,-0.2);g.add(cab);
    if(type==='taxi'){const sign=new THREE.Mesh(new THREE.BoxGeometry(0.6,0.2,0.25),toon(0xffffff));sign.position.set(0,1.7,-0.2);g.add(sign);}
    for(const sx of [-0.85,0.85])for(const sz of [-1.35,1.35])vehWheel(g,wheels,sx,sz,0.33,0.24);
    lamp(-0.6,0.72,2.16,0xfff4c8);lamp(0.6,0.72,2.16,0xfff4c8);lamp(-0.6,0.75,-2.16,0xd8262f);lamp(0.6,0.75,-2.16,0xd8262f);
  }else if(type==='scooter'){
    len=1.9;wid=0.7;const col=pick([0xf4f4f2,0x2b2f36,0xd8463c,0x8fb3c8,0xf2c230,0x7fd1c4]);
    const body=shade(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.45,1.3),toon(col)),true,false);body.position.y=0.55;g.add(body);
    const shield=shade(new THREE.Mesh(new THREE.BoxGeometry(0.5,0.8,0.18),toon(col)),true,false);shield.position.set(0,0.85,0.58);g.add(shield);
    const seat=new THREE.Mesh(new THREE.BoxGeometry(0.4,0.12,0.7),toon(0x22272c));seat.position.set(0,0.84,-0.2);g.add(seat);
    const bar=new THREE.Mesh(new THREE.BoxGeometry(0.7,0.06,0.06),toon(0x8a8f96));bar.position.set(0,1.28,0.55);g.add(bar);
    vehWheel(g,wheels,0,0.6,0.23,0.14);vehWheel(g,wheels,0,-0.55,0.23,0.14);
    // rider with a helmet
    const shirt=pick([0x2f6fb8,0xd8463c,0x4f9a72,0x2b2f36,0xf3d58a,0x9a6fb8]);
    const torso=shade(new THREE.Mesh(new THREE.BoxGeometry(0.46,0.6,0.28),toon(shirt)),true,false);torso.position.set(0,1.3,-0.15);torso.rotation.x=0.15;g.add(torso);
    const head=new THREE.Mesh(new THREE.SphereGeometry(0.2,10,8),toon(0xffd9bb));head.position.set(0,1.78,-0.08);g.add(head);
    const helm=new THREE.Mesh(new THREE.SphereGeometry(0.24,10,8,0,TAU,0,Math.PI*0.6),toon(pick([0xf4f4f2,0xd8463c,0x2b2f36,0xf2c230,0x2f6fb8])));helm.position.set(0,1.8,-0.1);g.add(helm);
    for(const sx of [-1,1]){const arm=new THREE.Mesh(new THREE.BoxGeometry(0.1,0.1,0.55),toon(shirt));arm.position.set(sx*0.26,1.38,0.2);g.add(arm);
      const leg=new THREE.Mesh(new THREE.BoxGeometry(0.14,0.14,0.5),toon(0x2d3a55));leg.position.set(sx*0.16,0.95,0.1);g.add(leg);}
    lamp(0,1.0,0.68,0xfff4c8);lamp(0,0.7,-0.66,0xd8262f);
  }else if(type==='bus'){
    len=11;wid=2.5;
    const side=new THREE.MeshToonMaterial({map:busSideTex,gradientMap:grad}),front=new THREE.MeshToonMaterial({map:busFrontTex,gradientMap:grad}),roof=toon(0xe6e6e2);
    const body=shade(new THREE.Mesh(new THREE.BoxGeometry(2.5,2.9,11),[side,side,roof,roof,front,toon(0xf6f6f2)]),true,false);body.position.y=1.85;g.add(body);
    for(const sx of [-1.15,1.15])for(const sz of [-3.6,3.4])vehWheel(g,wheels,sx,sz,0.5,0.3);
    lamp(-0.9,0.75,5.52,0xfff4c8);lamp(0.9,0.75,5.52,0xfff4c8);lamp(-0.9,0.9,-5.52,0xd8262f);lamp(0.9,0.9,-5.52,0xd8262f);
  }else{ // small truck
    len=6.6;wid=2.1;
    const cab=shade(new THREE.Mesh(new THREE.BoxGeometry(2.1,2.0,1.8),[toon(0x2f6fb8),toon(0x2f6fb8),toon(0xe6e6e2),toon(0xe6e6e2),toon(0x3d5568),toon(0x2f6fb8)]),true,false);cab.position.set(0,1.45,2.3);g.add(cab);
    const box=shade(new THREE.Mesh(new THREE.BoxGeometry(2.2,2.4,4.6),toon(pick([0xf4f4f2,0xd9d4ca,0x4f9a72]))),true,false);box.position.set(0,1.65,-0.9);g.add(box);
    for(const sx of [-0.95,0.95])for(const sz of [-2.2,2.3])vehWheel(g,wheels,sx,sz,0.45,0.26);
    lamp(-0.75,0.9,3.22,0xfff4c8);lamp(0.75,0.9,3.22,0xfff4c8);lamp(-0.8,0.9,-3.22,0xd8262f);lamp(0.8,0.9,-3.22,0xd8262f);
  }
  scene.add(g);
  return {g,wheels,len,wid,type,lights};
}
function spawnVehicle(c,lane,s){
  let type;const r=Math.random();
  if(c.bus&&lane.outer&&r<0.08)type='bus';
  else if(r<0.5)type='scooter';else if(r<0.62)type='taxi';else if(r<0.93)type='car';else type='truck';
  if(type==='scooter'&&!lane.outer&&Math.random()<0.6)type='car';   // scooters keep to the outer lane mostly
  const m=makeVehicle(type);
  const v={...m,c,lane,s,v:type==='bus'?7:9,vmax:(type==='scooter'?11:type==='bus'?10:type==='truck'?11:13.5)*(0.9+Math.random()*0.2),served:new Set(),dwell:0,honk:0,lat:type==='scooter'?(lane.dir*0.7):0};
  lane.veh.push(v);VEH.list.push(v);placeVehicle(v);return v;
}
function removeVehicle(v){scene.remove(v.g);v.g.traverse(o=>{if(o.geometry)o.geometry.dispose();});if(v.bubble)scene.remove(v.bubble);
  v.lane.veh.splice(v.lane.veh.indexOf(v),1);VEH.list.splice(VEH.list.indexOf(v),1);}
const prog=v=>v.lane.dir>0?v.s:v.c.L-v.s;
function placeVehicle(v){
  const a=chainAt(v.c,v.s);const nx=-a.tz,nz=a.tx;const off=v.lane.off+v.lat;
  const x=a.x+nx*off,z=a.z+nz*off;const hx=a.tx*v.lane.dir,hz=a.tz*v.lane.dir;
  const y=ground(x,z)+0.1,yf=ground(x+hx*v.len*0.5,z+hz*v.len*0.5),yb=ground(x-hx*v.len*0.5,z-hz*v.len*0.5);
  v.x=x;v.z=z;v.hx=hx;v.hz=hz;
  v.g.position.set(x,Math.max(y,(yf+yb)/2+0.1),z);v.g.rotation.set(0,Math.atan2(hx,hz),0);v.g.rotateX(-Math.atan2(yf-yb,v.len));
}
function seedTraffic(){
  const dens=profile(TRAFFIC,gameHour());
  for(const c of VEH.chains)for(const l of c.lanes){
    const gap=Math.max(25,90/Math.max(0.05,dens));
    for(let p=10+Math.random()*gap;p<c.L-10;p+=gap*(0.6+Math.random()*0.8)){
      if(VEH.list.length>=VEH.max*0.8)return;
      spawnVehicle(c,l,l.dir>0?p:c.L-p);
    }}
}
function pedsOnCrossing(x){
  if(Math.hypot(P.x-x.x,P.z-x.z)<x.w/2+1&&Math.abs((P.x-x.x)*x.tx+(P.z-x.z)*x.tz)<2.2)return true;
  for(const s of STU.list)if(s.crossing===x)return true;
  return false;
}
function updateVehicles(dt){
  const h=gameHour(),dens=profile(TRAFFIC,h),night=isNight(h);
  // spawning at the lane entries, rate follows the hour
  for(const c of VEH.chains)for(const l of c.lanes){
    l.acc-=dt;if(l.acc>0)continue;
    const perMin=dens*(c.w>12?10:6);
    l.acc=perMin>0.05?(60/perMin)*(0.5+Math.random()):40;
    if(VEH.list.length>=VEH.max)continue;
    if(l.veh.some(v=>prog(v)<16))continue;
    spawnVehicle(c,l,l.dir>0?0.5:c.L-0.5);
  }
  for(const c of VEH.chains)for(const l of c.lanes){
    l.veh.sort((a,b)=>prog(b)-prog(a));
    for(let i=0;i<l.veh.length;i++){
      const v=l.veh[i],p=prog(v);
      let gap=1e9,lv=v.vmax;
      if(i>0){const ld=l.veh[i-1];gap=prog(ld)-p-(ld.len+v.len)/2;lv=ld.v;}
      // signals and crossings ahead
      for(const st of c.stops){
        const sp=(l.dir>0?st.s:c.L-st.s)-5.6-v.len/2;const d=sp-p;
        if(d<-1||d>70)continue;
        const x=st.x;let stop=false;
        if(x.state&&x.sig){
          if(x.state.main==='R')stop=true;
          else if(x.state.main==='Y'&&d>v.v*v.v/7+1)stop=true;
          else if(x.state.main==='FY'){v.cap=Math.min(v.cap??99,7);if(pedsOnCrossing(x))stop=true;}
        }else if(pedsOnCrossing(x))stop=true;
        if(stop&&d<gap){gap=Math.max(0.01,d);lv=0;}
      }
      // buses pull in at stops on their side
      if(v.type==='bus')for(const bs of c.busStops){
        if(bs.side!==l.dir||v.served.has(bs))continue;
        const d=(l.dir>0?bs.s:c.L-bs.s)-p;if(d<-2||d>60)continue;
        if(d<1.2&&v.v<0.4){v.dwell+=dt;if(v.dwell>7){v.served.add(bs);v.dwell=0;}gap=0.01;lv=0;}
        else if(d<gap){gap=Math.max(0.01,d);lv=0;}
      }
      // people in the lane: the player and crossing students
      const checkPerson=(px,pz)=>{const dx=px-v.x,dz=pz-v.z;const a=dx*v.hx+dz*v.hz;if(a<0||a>18)return;const lat=Math.abs(-dx*v.hz+dz*v.hx);
        if(lat<v.wid/2+0.7){const d=a-v.len/2-2.2;if(d<gap){gap=Math.max(0.01,d);lv=0;if(px===P.x)v.blockedByPlayer=true;}}};
      v.blockedByPlayer=false;
      if(Math.hypot(P.x-v.x,P.z-v.z)<26)checkPerson(P.x,P.z);
      for(const s of STU.list)if(s.onRoad&&Math.abs(s.x-v.x)<22&&Math.abs(s.z-v.z)<22)checkPerson(s.x,s.z);
      // intelligent-driver style following
      const vmax=Math.min(v.vmax,v.cap??99)*(night?0.95:1);v.cap=undefined;
      const sStar=2.2+v.v*1.2+v.v*(v.v-lv)/(2*Math.sqrt(2.2*3.5));
      let acc=2.2*(1-Math.pow(v.v/Math.max(0.1,vmax),4)-Math.pow(Math.max(0,sStar)/Math.max(0.05,gap),2));
      acc=Math.max(-7,Math.min(2.2,acc));
      v.v=Math.max(0,v.v+acc*dt);
      if(gap<0.3&&v.v>0)v.v=0;
      v.s+=l.dir*v.v*dt;
      for(const w of v.wheels)w.rotation.x+=v.v*dt/0.33;
      placeVehicle(v);
      const night2=nightLevel>0.5;for(const m of v.lights)m.visible=night2||m.material.color.r>0.8&&m.material.color.g<0.3&&acc<-1;
      // honk at a player standing in the road
      if(v.blockedByPlayer&&v.v<0.5){v.honk+=dt;if(v.honk>2.5){say(v,pick(['叭叭！','叭——！','借過一下！']),1.6);v.honk=-4;}}else if(v.honk>0)v.honk=0;
      tickBubble(v,dt,v.x,v.g.position.y+(v.type==='bus'?3.9:2.6),v.z);
    }
  }
  for(const v of VEH.list.slice()){if(v.s<-2||v.s>v.c.L+2)removeVehicle(v);}
}
function hitsVehicle(x,z,r){
  for(const v of VEH.list){const dx=x-v.x,dz=z-v.z;if(Math.abs(dx)>8||Math.abs(dz)>8)continue;
    const a=Math.abs(dx*v.hx+dz*v.hz),l=Math.abs(-dx*v.hz+dz*v.hx);if(a<v.len/2+r&&l<v.wid/2+r)return true;}
  return false;
}

/* ---------- pedestrian network built from footpaths, campus roads and sidewalks ---------- */
const PG={nx:[],nz:[],adj:[],key:new Map(),comp:[],poi:[]};
const PXING=[];
function pgNode(x,z){const k=Math.round(x*2)+','+Math.round(z*2);let id=PG.key.get(k);
  if(id===undefined){id=PG.nx.length;PG.nx.push(x);PG.nz.push(z);PG.adj.push([]);PG.key.set(k,id);}return id;}
function pgEdge(a,b,cross){if(a===b)return;if(PG.adj[a].some(e=>e.to===b))return;const L=Math.hypot(PG.nx[a]-PG.nx[b],PG.nz[a]-PG.nz[b]);
  PG.adj[a].push({to:b,len:L,cross:cross||null});PG.adj[b].push({to:a,len:L,cross:cross||null});}
function buildPedGraph(){
  const majors=ROADS3.filter(r=>(RANK[r.k]??0)>=3);
  const band=(x,z)=>{for(const r of majors)for(let i=0;i<r.p.length-1;i++)if(segDist(x,z,...r.p[i],...r.p[i+1])<r.w/2+0.4)return r;return null;};
  const crossFor=(ax,az,bx,bz,r)=>{const mx=(ax+bx)/2,mz=(az+bz)/2;
    let best=null,bd=22;for(const x of xingSpots.concat(PXING)){const d=Math.hypot(x.x-mx,x.z-mz);if(d<bd){bd=d;best=x;}}
    if(best)return best;
    const L=Math.hypot(bx-ax,bz-az)||1;const v={x:mx,z:mz,tx:-(bz-az)/L,tz:(bx-ax)/L,w:r?r.w:8,sig:false,virt:true};PXING.push(v);return v;};
  const walkable=ROADS3.filter(r=>(RANK[r.k]??0)<=2);
  for(const r of walkable){
    const pts=r.p;const inB=pts.map(q=>band(q[0],q[1]));
    let last=-1;
    for(let i=0;i<pts.length;i++){
      if(inB[i])continue;
      if(last>=0){
        const a=pgNode(...pts[last]),b=pgNode(...pts[i]);
        let cr=null,hitR=null;
        if(i>last+1)hitR=inB[last+1];
        else for(const m of majors){for(let j=0;j<m.p.length-1;j++)if(segIntersect(pts[last],pts[i],m.p[j],m.p[j+1])){hitR=m;break;}if(hitR)break;}
        if(hitR)cr=crossFor(...pts[last],...pts[i],hitR);
        pgEdge(a,b,cr);
      }else pgNode(...pts[i]);
      last=i;
    }
  }
  // sidewalks along the main roads
  const side=[];
  for(const r of majors){
    for(const sgn of [-1,1]){
      const s=resample(r.p,8);let prev=null;
      for(let i=0;i<s.length;i++){
        const q0=s[Math.max(0,i-1)],q1=s[Math.min(s.length-1,i+1)];let tx=q1[0]-q0[0],tz=q1[1]-q0[1];const tl=Math.hypot(tx,tz)||1;tx/=tl;tz/=tl;
        const x=s[i][0]-tz*(r.w/2+1.3)*sgn,z=s[i][1]+tx*(r.w/2+1.3)*sgn;
        const ok=ground(x,z)>0.8&&free(x,z,0.2)&&!band(x,z);
        if(!ok){prev=null;continue;}
        const id=pgNode(x,z);side.push(id);if(prev!==null)pgEdge(prev,id);prev=id;
      }
    }
  }
  const sideSet=new Set(side);
  const nearestSide=(x,z,maxD)=>{let best=-1,bd=maxD;for(const id of side){const d=Math.hypot(PG.nx[id]-x,PG.nz[id]-z);if(d<bd){bd=d;best=id;}}return best;};
  // link path ends and nearby path nodes to the sidewalk
  for(let id=0;id<PG.nx.length;id++){if(sideSet.has(id))continue;
    const deg=PG.adj[id].length;const maxD=deg<=1?9:4;
    const s=nearestSide(PG.nx[id],PG.nz[id],maxD);if(s>=0)pgEdge(id,s);}
  // zebra crossings join the two sidewalks
  for(const x of xingSpots){
    const nx=-x.tz,nz=x.tx,o=x.w/2+1.3;
    const a=pgNode(x.x+nx*o,x.z+nz*o),b=pgNode(x.x-nx*o,x.z-nz*o);
    for(const [id,sx,sz] of [[a,x.x+nx*o,x.z+nz*o],[b,x.x-nx*o,x.z-nz*o]]){
      const near=side.map(s2=>[s2,Math.hypot(PG.nx[s2]-sx,PG.nz[s2]-sz)]).filter(q=>q[1]<10&&q[0]!==id).sort((p,q)=>p[1]-q[1]).slice(0,2);
      for(const [s2] of near)pgEdge(id,s2);}
    pgEdge(a,b,x);
  }
  // keep the largest connected network
  const comp=new Int32Array(PG.nx.length).fill(-1);let best=-1,bestN=0;
  for(let i=0;i<PG.nx.length;i++){if(comp[i]>=0)continue;const st=[i];comp[i]=i;let n=0;
    while(st.length){const u=st.pop();n++;for(const e of PG.adj[u])if(comp[e.to]<0){comp[e.to]=i;st.push(e.to);}}
    if(n>bestN){bestN=n;best=i;}}
  for(let i=0;i<PG.nx.length;i++)if(comp[i]===best)PG.comp.push(i);
  const campusB=D.b.filter(b=>b.c&&b.n).map(b=>centroid(b.p));
  for(const id of PG.comp){const x=PG.nx[id],z=PG.nz[id];if(campusB.some(([cx,cz])=>Math.hypot(cx-x,cz-z)<32))PG.poi.push(id);}
}
function astar(a,b){
  const n=PG.nx.length;const g=new Float64Array(n).fill(Infinity),f=new Float64Array(n).fill(Infinity),from=new Int32Array(n).fill(-1);
  const open=[a];const inOpen=new Uint8Array(n);inOpen[a]=1;g[a]=0;
  const hh=i=>Math.hypot(PG.nx[i]-PG.nx[b],PG.nz[i]-PG.nz[b]);f[a]=hh(a);
  let iter=0;
  while(open.length&&iter++<6000){
    let bi=0;for(let i=1;i<open.length;i++)if(f[open[i]]<f[open[bi]])bi=i;
    const u=open[bi];open[bi]=open[open.length-1];open.pop();inOpen[u]=0;
    if(u===b){const path=[u];let k=u;while(from[k]>=0){k=from[k];path.push(k);}return path.reverse();}
    for(const e of PG.adj[u]){const ng=g[u]+e.len+(e.cross?6:0);if(ng<g[e.to]){g[e.to]=ng;f[e.to]=ng+hh(e.to);from[e.to]=u;if(!inOpen[e.to]){inOpen[e.to]=1;open.push(e.to);}}}
  }
  return null;
}
function edgeBetween(a,b){return PG.adj[a].find(e=>e.to===b);}

/* ---------- students ---------- */
const STU={list:[],max:isTouch?22:44,acc:0};
const SGEO={
  leg:(()=>{const g=new THREE.BoxGeometry(0.17,0.72,0.19);g.translate(0,-0.36,0);return g;})(),
  arm:(()=>{const g=new THREE.BoxGeometry(0.11,0.56,0.11);g.translate(0,-0.28,0);return g;})(),
  torso:new THREE.CylinderGeometry(0.25,0.29,0.62,10),
  skirt:new THREE.CylinderGeometry(0.24,0.42,0.42,10),
  head:new THREE.SphereGeometry(0.3,14,12),
  hair:new THREE.SphereGeometry(0.325,14,10,0,TAU,0,Math.PI*0.56),
  pony:new THREE.SphereGeometry(0.13,8,8),
  pack:new THREE.BoxGeometry(0.36,0.42,0.17),
  eye:new THREE.SphereGeometry(0.045,6,6),
  bag:new THREE.BoxGeometry(0.08,0.32,0.3)
};
function makeStudent(){
  const F=Math.random()<0.5;const g=new THREE.Group();
  const skin=pick([0xffd9bb,0xf3c9a5,0xe8b991,0xffe0c8]);
  const shirt=pick([0x2f7fd1,0xff7a8a,0x4f9a72,0xf3d58a,0xffffff,0x2b2f36,0x9a6fb8,0xe07a3a,0x7fd1c4,0x1f6fa8]);
  const pants=pick([0x2d3a55,0x34496f,0x3d3d44,0x8a7a5a,0x5a6b70]);
  const hair=pick([0x2b1e18,0x1a1414,0x4a2c22,0x3a2a20,0x6a4a30]);
  const legs=[];for(const s of [-1,1]){const p=new THREE.Group();p.position.set(s*0.12,0.74,0);const m=new THREE.Mesh(SGEO.leg,toon(F&&Math.random()<0.5?skin:pants));m.castShadow=true;p.add(m);g.add(p);legs.push(p);}
  const body=new THREE.Group();g.add(body);
  const t=new THREE.Mesh(SGEO.torso,toon(shirt));t.position.y=1.1;t.castShadow=true;body.add(t);
  if(F&&Math.random()<0.55){const sk=new THREE.Mesh(SGEO.skirt,toon(pick([0x2d3a55,0x8a3a3a,0x3a5a7a,0xd9c9a8])));sk.position.y=0.78;body.add(sk);}
  const arms=[];for(const s of [-1,1]){const p=new THREE.Group();p.position.set(s*0.33,1.36,0);const m=new THREE.Mesh(SGEO.arm,toon(shirt));p.add(m);body.add(p);arms.push(p);}
  const head=new THREE.Group();head.position.y=1.72;body.add(head);
  const hm=new THREE.Mesh(SGEO.head,toon(skin));hm.castShadow=true;head.add(hm);
  const hr=new THREE.Mesh(SGEO.hair,toon(hair));hr.rotation.x=-0.3;head.add(hr);
  if(F){const pt=new THREE.Mesh(SGEO.pony,toon(hair));pt.position.set(0,0.05,-0.33);pt.scale.set(1,1.5,1);head.add(pt);}
  for(const s of [-1,1]){const e=new THREE.Mesh(SGEO.eye,toon(0x1b1b24));e.position.set(s*0.1,0.02,0.27);e.scale.y=1.4;head.add(e);}
  if(Math.random()<0.75){const bp=new THREE.Mesh(SGEO.pack,toon(pick([0xffc93c,0x2f6fb8,0x2b2f36,0xd8463c,0x4f9a72])));bp.position.set(0,1.12,-0.3);body.add(bp);}
  else{const bg=new THREE.Mesh(SGEO.bag,toon(pick([0xd9c9a8,0x2b2f36])));bg.position.set(0.32,0.95,0);body.add(bg);}
  const sc=0.92+Math.random()*0.14;g.scale.setScalar(sc);
  scene.add(g);
  return {g,body,head,legs,arms,F,sc};
}
function stuNode(nearX,nearZ,minD,maxD,tries=30){
  for(let k=0;k<tries;k++){const id=PG.comp[(Math.random()*PG.comp.length)|0];const d=Math.hypot(PG.nx[id]-nearX,PG.nz[id]-nearZ);if(d>=minD&&d<=maxD)return id;}
  return -1;
}
function newRoute(s){
  const dests=PG.poi.length&&Math.random()<0.7?PG.poi:PG.comp;
  for(let k=0;k<6;k++){const d=dests[(Math.random()*dests.length)|0];const dd=Math.hypot(PG.nx[d]-s.x,PG.nz[d]-s.z);if(dd<40||dd>320)continue;
    const p=astar(s.node,d);if(p&&p.length>1){s.path=p;s.pi=1;return true;}}
  return false;
}
function spawnStudent(x,z,node,mode){
  const m=makeStudent();
  const s={...m,x,z,node,path:null,pi:0,lat:(Math.random()*2-1)*0.55,speed:1.15+Math.random()*0.4,phase:Math.random()*6,rot:Math.random()*TAU,
    state:mode||'walk',onRoad:false,crossing:null,partner:null,lead:null,talkT:3+Math.random()*6,greetT:0,idleT:0,react:null,bubbleT:0,wave:0,emote:null,emoteT:0};
  m.g.position.set(x,ground(x,z),z);
  STU.list.push(s);return s;
}
function removeStudent(s){scene.remove(s.g);if(s.bubble)scene.remove(s.bubble);STU.list.splice(STU.list.indexOf(s),1);
  if(s.partner){s.partner.lead=null;s.partner.partner=null;}
  if(s.lead){s.lead.partner=null;}
  if(s.group)s.group.members=s.group.members.filter(q=>q!==s);
}
function spawnAround(){
  if(!PG.comp.length)return;
  const r=Math.random();
  const node=stuNode(P.x,P.z,25,140);if(node<0)return;
  const x=PG.nx[node],z=PG.nz[node];
  if(r<0.16&&PG.poi.length){ // a group chatting by a building
    const n2=PG.poi[(Math.random()*PG.poi.length)|0];if(Math.hypot(PG.nx[n2]-P.x,PG.nz[n2]-P.z)>160)return;
    const gx=PG.nx[n2],gz=PG.nz[n2];const k=2+((Math.random()*2)|0);const grp={x:gx,z:gz,members:[],t:40+Math.random()*60,turn:0};
    for(let i=0;i<k;i++){const a=i/k*TAU;const px=gx+Math.cos(a)*0.9,pz=gz+Math.sin(a)*0.9;const s=spawnStudent(px,pz,n2,'group');s.group=grp;s.rot=Math.atan2(gx-px,gz-pz);grp.members.push(s);}
    return;
  }
  const s=spawnStudent(x,z,node,'walk');
  if(!newRoute(s)){s.state='idle';s.idleT=5;}
  if(r<0.45){ // walking with a friend
    const f=spawnStudent(x+0.8,z,node,'follow');f.lead=s;s.partner=f;
  }
}
function crossAllowed(x){
  if(x.sig&&x.state){
    if(x.state.ped==='W')return true;
    if(x.state.ped==='off')return !carNear(x,26);
    return false;
  }
  return !carNear(x,20);
}
function carNear(x,d){for(const v of VEH.list){if(Math.hypot(v.x-x.x,v.z-x.z)<d&&v.v>1.5){const dx=x.x-v.x,dz=x.z-v.z;if(dx*v.hx+dz*v.hz>-3)return true;}}return false;}
function animStudent(s,dt,moving,speed){
  if(s.emote){applyEmote(s,s.emote,s.emoteT);return;}
  if(moving){s.phase+=dt*speed*4.2;const a=Math.sin(s.phase)*0.55;s.legs[0].rotation.x=a;s.legs[1].rotation.x=-a;s.arms[0].rotation.x=-a*0.8;s.arms[1].rotation.x=a*0.8;s.body.position.y=Math.abs(Math.cos(s.phase))*0.04;}
  else{for(const p of [...s.legs,...s.arms])p.rotation.x*=Math.max(0,1-dt*8);s.body.position.y=0;}
  s.arms[0].rotation.z=0;s.arms[1].rotation.z=0;s.body.rotation.x=0;s.body.rotation.y=0;
}
function updateStudents(dt){
  const h=gameHour();const target=Math.round(STU.max*profile(CROWD,h));
  STU.acc-=dt;
  if(STU.acc<=0){STU.acc=0.6;
    if(STU.list.length<target)spawnAround();
    // retire students who wandered far away, or when the crowd should thin out
    for(const s of STU.list.slice()){const d=Math.hypot(s.x-P.x,s.z-P.z);
      if(d>190||(STU.list.length>target+2&&d>70&&!s.lead&&!s.partner&&Math.random()<0.15))removeStudent(s);}
  }
  for(const s of STU.list){
    s.greetT-=dt;s.talkT-=dt;
    if(s.emote){s.emoteT+=dt;if(s.emoteT>(s.emote==='bow'?1.6:2.4)){s.emote=null;s.head.rotation.set(0,0,0);s.body.rotation.set(0,0,0);s.body.position.y=0;}}
    let moving=false,spd=0;
    if(s.state==='follow'&&s.lead){
      const L=s.lead;const sx=L.x-Math.sin(L.rot+Math.PI/2)*0.85,sz=L.z-Math.cos(L.rot+Math.PI/2)*0.85;
      const dx=sx-s.x,dz=sz-s.z,d=Math.hypot(dx,dz);
      if(d>0.05){const st=Math.min(d,(L.curSpeed||0)*dt+d*dt*3);s.x+=dx/d*st;s.z+=dz/d*st;}
      moving=(L.curSpeed||0)>0.2;spd=L.curSpeed||0;s.rot=L.rot;s.onRoad=L.onRoad;s.crossing=L.crossing;
    }else if(s.state==='follow'){s.state='walk';s.node=nearestNode(s.x,s.z);if(!newRoute(s)){s.state='idle';s.idleT=4;}}
    else if(s.state==='group'){
      const G=s.group;s.rot=Math.atan2(G.x-s.x,G.z-s.z);G.t-=dt/G.members.length;
      if(G.t<=0){s.state='walk';s.node=nearestNode(s.x,s.z);s.group=null;if(!newRoute(s)){s.state='idle';s.idleT=5;}}
    }else if(s.state==='idle'){
      s.idleT-=dt;if(s.idleT<=0){s.node=nearestNode(s.x,s.z);if(newRoute(s))s.state='walk';else s.idleT=4;}
    }else if(s.state==='walk'||s.state==='wait'){
      if(!s.path||s.pi>=s.path.length){s.state='idle';s.idleT=4+Math.random()*12;s.curSpeed=0;}
      else{
        const a=s.path[s.pi-1],b=s.path[s.pi];const e=edgeBetween(a,b);
        const ax=PG.nx[a],az=PG.nz[a],bx=PG.nx[b],bz=PG.nz[b];const L=Math.hypot(bx-ax,bz-az)||1;const ex=(bx-ax)/L,ez=(bz-az)/L;
        const lat=e&&e.cross?s.lat*0.4:s.lat;
        const tx=bx-ez*lat,tz=bz+ex*lat;
        // wait at the kerb until it is safe or the walking man is green
        if(e&&e.cross&&!s.crossing){
          if(!crossAllowed(e.cross)){s.state='wait';s.curSpeed=0;s.rot=Math.atan2(ex,ez);
            if(s.talkT<0&&Math.random()<0.3){say(s,pick(LINES.wait));s.talkT=12;}
            animStudent(s,dt,false,0);placeStu(s);tickBubble(s,dt,s.x,s.g.position.y+2.45*s.sc,s.z);continue;}
          s.crossing=e.cross;s.state='walk';
          if(e.cross.state&&e.cross.state.ped==='FW')s.hurry=true;
        }
        const dx=tx-s.x,dz=tz-s.z,d=Math.hypot(dx,dz);
        let sp=s.speed*(s.hurry?1.6:1);
        if(s.partner)sp=Math.min(sp,1.25);
        if(d<0.35){s.node=b;s.pi++;if(s.crossing&&!(edgeBetween(b,s.path[s.pi]||-1)||{}).cross){s.crossing=null;s.hurry=false;}}
        else{const st=Math.min(d,sp*dt);const nx=s.x+dx/d*st,nz=s.z+dz/d*st;
          // do not walk into the player or a car
          if(Math.hypot(nx-P.x,nz-P.z)<0.8||hitsVehicle(nx,nz,0.35)){s.curSpeed=0;}
          else{s.x=nx;s.z=nz;s.curSpeed=sp;moving=true;spd=sp;}
          const tr=Math.atan2(dx,dz);let dr=tr-s.rot;dr=Math.atan2(Math.sin(dr),Math.cos(dr));s.rot+=dr*Math.min(1,dt*8);}
        s.onRoad=!!s.crossing;
      }
    }
    animStudent(s,dt,moving,spd);
    placeStu(s);
    // conversation: pairs and groups take turns, solos sometimes talk on the phone
    const near=Math.hypot(s.x-P.x,s.z-P.z);
    if(near<45&&s.talkT<0&&!s.emote){
      if(s.group&&s.group.members.length>1){const G=s.group;const speaker=G.members[G.turn%G.members.length];if(speaker===s){say(s,chatLine());G.turn++;for(const m of G.members)m.talkT=3.5+Math.random()*2;}else s.talkT=1;}
      else if(s.partner||s.lead){say(s,chatLine());s.talkT=7+Math.random()*6;const o=s.partner||s.lead;o.talkT=Math.max(o.talkT,3.4);}
      else{if(Math.random()<0.25)say(s,pick(LINES.phone));s.talkT=12+Math.random()*16;}
    }
    // greet the player when passing close by
    if(near<3.6&&s.greetT<=0&&Math.random()<0.02){s.greetT=45;say(s,P.riding?pick(LINES.bikeHello):pick(LINES.hello));s.head.rotation.y=Math.atan2(P.x-s.x,P.z-s.z)-s.rot;}
    if(s.react){s.react.t-=dt;if(s.react.t<=0){const k=s.react.kind;say(s,pick(LINES.react[k]));if(k!=='sit'){s.emote=k==='dance'?'cheer':k;s.emoteT=0;}s.react=null;}}
    tickBubble(s,dt,s.x,s.g.position.y+2.45*s.sc,s.z);
  }
}
function nearestNode(x,z){let best=PG.comp[0],bd=1e9;for(const id of PG.comp){const d=Math.abs(PG.nx[id]-x)+Math.abs(PG.nz[id]-z);if(d<bd){bd=d;best=id;}}return best;}
function placeStu(s){s.g.position.set(s.x,ground(s.x,s.z)+(s.onRoad?0.1:0.2)*(ground(s.x,s.z)>0?1:0),s.z);s.g.rotation.y=s.rot;}

/* ---------- emotes ---------- */
const EMOTES=[
  {k:'wave',zh:'揮手',key:'Digit1',line:'嗨！'},
  {k:'cheer',zh:'歡呼',key:'Digit2',line:'耶！'},
  {k:'bow',zh:'鞠躬',key:'Digit3',line:'你好'},
  {k:'dance',zh:'跳舞',key:'Digit4',line:'♪'},
  {k:'sit',zh:'坐下',key:'Digit5',line:''}
];
function applyEmote(c,k,t){
  const L=c.arms?c.arms[0]:c.armL,Rr=c.arms?c.arms[1]:c.armR,legs=c.legs||[c.legL,c.legR];
  if(k==='wave'){Rr.rotation.set(0,0,2.5+Math.sin(t*12)*0.35);L.rotation.set(0,0,0);}
  else if(k==='cheer'){L.rotation.set(0,0,-2.7);Rr.rotation.set(0,0,2.7);c.body.position.y=Math.abs(Math.sin(t*7))*0.28;}
  else if(k==='bow'){const b=t<0.5?t/0.5:t<1.1?1:Math.max(0,1-(t-1.1)/0.5);c.body.rotation.x=0.75*b;L.rotation.set(0,0,0);Rr.rotation.set(0,0,0);}
  else if(k==='dance'){const s=Math.sin(t*7);c.body.rotation.y=s*0.45;c.body.position.y=Math.abs(Math.cos(t*7))*0.12;
    L.rotation.set(0,0,-1.4-s*0.9);Rr.rotation.set(0,0,1.4-s*0.9);legs[0].rotation.x=s*0.35;legs[1].rotation.x=-s*0.35;}
  else if(k==='sit'){c.body.position.y=-0.52;legs[0].rotation.x=-1.45;legs[1].rotation.x=-1.45;L.rotation.set(-0.3,0,-0.15);Rr.rotation.set(-0.3,0,0.15);}
}
function startEmote(k){
  if(mode!=='play'||P.riding)return;
  P.emote=k;P.emoteT=0;
  const e=EMOTES.find(q=>q.k===k);if(e&&e.line)say(playerTalk,e.line,2);
  // nearby students react
  for(const s of STU.list){const d=Math.hypot(s.x-P.x,s.z-P.z);if(d<10&&!s.react&&Math.random()<0.8){s.react={kind:k,t:0.4+Math.random()*0.8};s.rot=Math.atan2(P.x-s.x,P.z-s.z);}}
  $('#emoteBar').hidden=true;
}
function endEmote(){if(!P.emote)return;P.emote=null;
  const c=player;c.body.rotation.set(0,0,0);c.body.position.y=0;c.armL.rotation.set(0,0,0);c.armR.rotation.set(0,0,0);}

/* ---------- bikes parked around campus ---------- */
const BIKES=[];
const BIKE_SPOTS=[{no:3,zh:'圖書館'},{no:30,zh:'第一餐廳'},{no:23,zh:'體育館'},{no:61,zh:'工學院'},{no:28,zh:'第二宿舍'},{no:36,zh:'第一宿舍'},{no:50,zh:'生命科學院館'},{no:22,zh:'學生活動中心'},{no:19,zh:'第四宿舍'}];
const BIKE_COLORS=[0x1f8f96,0xff8a3d,0x2f6fb8,0xd8463c,0xf2c230,0x4f9a72,0x9a6fb8];
function onDriveRoad(x,z){for(const r of ROADS3)if((RANK[r.k]??0)>=1)for(let i=0;i<r.p.length-1;i++)if(segDist(x,z,...r.p[i],...r.p[i+1])<r.w/2+(RANK[r.k]>=3?3.2:0.8))return true;return false;}
function findRackSpot(x0,z0){
  for(let r=4;r<45;r+=1.5)for(let a=0;a<TAU;a+=0.35){const x=x0+Math.cos(a)*r,z=z0+Math.sin(a)*r;
    if(ground(x,z)<0.8||!free(x,z,1.6)||onDriveRoad(x,z))continue;
    // the rack line (bikes 1 m apart) must also be clear
    if(!free(x+1.2,z,1.2)||!free(x-1.2,z,1.2))continue;
    return [x,z];}
  return null;
}
function addRack(x,z,n,label){
  const y=ground(x,z);
  const bar=new THREE.Mesh(new THREE.BoxGeometry(n*1.0+0.6,0.06,0.06),toon(0x8f979c));bar.position.set(x,y+0.55,z+0.7);scene.add(bar);
  for(let i=0;i<n;i++){
    const hoop=new THREE.Mesh(new THREE.TorusGeometry(0.32,0.03,6,16,Math.PI),toon(0x8f979c));hoop.position.set(x+(i-(n-1)/2)*1.0,y,z+0.7);scene.add(hoop);
    const b=Object.assign(makeBike(BIKE_COLORS[(BIKES.length*3+i)%BIKE_COLORS.length]),{px:0,pz:0,prot:0,home:label});
    scene.add(b.g);BIKES.push(b);placeBike(b,x+(i-(n-1)/2)*1.0,z,0);
  }
}
function placeBike(b,x,z,rot){b.px=x;b.pz=z;b.prot=rot;b.g.position.set(x,ground(x,z),z);b.g.rotation.set(0,rot,0.1);b.stand.visible=true;b.fork.rotation.y=0.35;}
function placeBikeStations(){
  // the bike you start with, by 濱海校門
  const b0=Object.assign(makeBike(0x1f8f96),{px:0,pz:0,prot:0});scene.add(b0.g);BIKES.push(b0);placeBike(b0,START.x+3.4,START.z,Math.PI/2);
  for(const sp of BIKE_SPOTS){
    const b=D.b.find(q=>q.no===sp.no&&q.n);if(!b)continue;
    const [cx,cz]=centroid(b.p);
    // start the search from the building edge nearest the walking network
    let best=null,bd=1e9;for(const q of b.p){const d=Math.hypot(q[0]-cx,q[1]-cz);if(d<bd){bd=d;best=q;}}
    const s=findRackSpot(best?best[0]:cx,best?best[1]:cz);
    if(s)addRack(s[0],s[1],2+((sp.no%2)),sp.zh);
  }
}
