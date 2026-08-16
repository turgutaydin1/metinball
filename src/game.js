import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

const MODEL_URL='https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/models/gltf/Soldier.glb';
const $=id=>document.getElementById(id);
const clamp=THREE.MathUtils.clamp;
const rand=(a,b)=>a+Math.random()*(b-a);
const choice=a=>a[Math.floor(Math.random()*a.length)];
const SAVE_KEY='metinball3dSaveV1';
const SETTINGS_KEY='metinball3dSettingsV1';

const MISSIONS=[
 {id:1,name:'METİN YAĞMURU',verb:'YAKALA',desc:'Düşen Metinleri yakala. Sahte kırmızı Metinlerden kaçın.',time:45},
 {id:2,name:'SİLAHLI METİN BASKINI',verb:'VUR',desc:'Silahlı hedefleri vur, sivillere dokunma. R ile şarjör değiştir.',time:50},
 {id:3,name:'METİN KAÇIYOR',verb:'KOVALA',desc:'Kaçan Metinleri yakala. Her yakalamada hız artar.',time:60},
 {id:4,name:'OFİSİ KORU',verb:'SAVUN',desc:'Masayı, bilgisayarı ve evrakları saldıran Metinlerden koru.',time:60},
 {id:5,name:'BÜYÜK METİN',verb:'BOSS',desc:'Büyük Metin’i ve minyonlarını yen. Üç aşamalı boss savaşı.',time:90}
];
const CHARACTERS=[
 {id:'turgut',name:'Turgut',color:0x356c91,speed:1.00,aim:1.00,bonus:1.00,desc:'Dengeli ve güçlü. İlk normal hatayı kalkan karşılar.'},
 {id:'zeko',name:'Zeko',color:0x2e8b57,speed:.96,aim:1.18,bonus:1.00,desc:'Yakalama ve hedef toleransı daha geniş.'},
 {id:'nafi',name:'Nafi',color:0xb07a2a,speed:1.18,aim:1.00,bonus:1.00,desc:'En hızlı hareket ve şarjör değişimi.'},
 {id:'baki',name:'Baki',color:0x7b4ea3,speed:1.03,aim:1.00,bonus:1.22,desc:'Kombo ve skor konusunda uzman.'}
];

function loadSave(){
 try{return Object.assign({selectedCharacter:'turgut',selectedMission:1,best:{},totalStars:0,zeroError:0},JSON.parse(localStorage.getItem(SAVE_KEY)||'{}'));}
 catch{return {selectedCharacter:'turgut',selectedMission:1,best:{},totalStars:0,zeroError:0};}
}
function saveGame(){localStorage.setItem(SAVE_KEY,JSON.stringify(save));}
function loadSettings(){
 try{return Object.assign({volume:.65,quality:Math.min(devicePixelRatio,1.4)},JSON.parse(localStorage.getItem(SETTINGS_KEY)||'{}'));}
 catch{return {volume:.65,quality:1.2};}
}
function saveSettings(){localStorage.setItem(SETTINGS_KEY,JSON.stringify(settings));}
let save=loadSave(),settings=loadSettings();

const stage=$('stage');
const scene=new THREE.Scene();
scene.background=new THREE.Color(0x09131c);
scene.fog=new THREE.Fog(0x09131c,12,34);
const camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.05,120);
camera.position.set(0,2.65,7.6);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality));
renderer.setSize(innerWidth,innerHeight);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.08;
stage.appendChild(renderer.domElement);
const clock=new THREE.Clock();

scene.add(new THREE.HemisphereLight(0xd6efff,0x223039,2.1));
const keyLight=new THREE.DirectionalLight(0xffffff,3.0);keyLight.position.set(-4,9,6);keyLight.castShadow=true;keyLight.shadow.mapSize.set(2048,2048);keyLight.shadow.camera.left=-9;keyLight.shadow.camera.right=9;keyLight.shadow.camera.top=8;keyLight.shadow.camera.bottom=-3;scene.add(keyLight);
const rimLight=new THREE.DirectionalLight(0x6abfff,1.4);rimLight.position.set(5,5,-5);scene.add(rimLight);

const permanent=new THREE.Group();scene.add(permanent);
const world=new THREE.Group();scene.add(world);
const dynamic=new THREE.Group();scene.add(dynamic);

let baseModel=null,baseClips=[],player=null,mixer=null,actions={},activeAction='idle';
let playerShadow=null,playerVelY=0,grounded=true,facing=1;
let mode='menu',paused=false,missionId=save.selectedMission;
let missionState=null,objects=[],projectiles=[],shootables=[];
let keys={left:false,right:false,shift:false};
let lastTime=0,spawnAcc=0;
let audioCtx=null;

function currentChar(){return CHARACTERS.find(c=>c.id===save.selectedCharacter)||CHARACTERS[0];}
function currentMission(){return MISSIONS.find(m=>m.id===missionId)||MISSIONS[0];}
function setTop(t){$('topState').textContent=t;}
function hideAllPanels(){['missionPanel','characterPanel','careerPanel','settingsPanel'].forEach(id=>$(id).classList.add('hidden'));}
function showMenu(){
 mode='menu';paused=false;clearWorld();buildMenuWorld();hideAllPanels();$('hud').classList.add('hidden');$('controls').classList.add('hidden');$('crosshair').classList.add('hidden');$('pause').classList.add('hidden');$('result').classList.add('hidden');$('menu').classList.remove('hidden');
 setTop('ANA MENÜ');updateMenuText();
}
function updateMenuText(){const c=currentChar(),m=MISSIONS.find(x=>x.id===save.selectedMission);$('menuSub').innerHTML=`Karakter: <b>${c.name}</b> &nbsp;•&nbsp; Görev: <b>${m.id}. ${m.name}</b><br>Gerçek rig'li 3D karakter • 5 oynanabilir görev • kayıtlar tarayıcıda saklanır.`;}
function toast(t,bad=false){const e=$('toast');e.textContent=t;e.style.borderColor=bad?'#8c4150':'#44718d';e.style.color=bad?'#ffabb5':'#fff';e.style.opacity='1';clearTimeout(toast._t);toast._t=setTimeout(()=>e.style.opacity='0',900);}

function ensureAudio(){if(!audioCtx)audioCtx=new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();}
function beep(type='ok'){
 if(settings.volume<=0)return;ensureAudio();const o=audioCtx.createOscillator(),g=audioCtx.createGain();const now=audioCtx.currentTime;
 const map={ok:[520,.07],bad:[125,.13],shoot:[180,.045],reload:[330,.09],bonus:[760,.12],boss:[85,.18],hit:[260,.08]};const [f,d]=map[type]||map.ok;o.frequency.setValueAtTime(f,now);if(type==='shoot')o.frequency.exponentialRampToValueAtTime(80,now+d);g.gain.setValueAtTime(.12*settings.volume,now);g.gain.exponentialRampToValueAtTime(.001,now+d);o.connect(g).connect(audioCtx.destination);o.start(now);o.stop(now+d);
}

function mat(color,rough=.75,metal=.05){return new THREE.MeshStandardMaterial({color,roughness:rough,metalness:metal});}
function box(w,h,d,color,x,y,z,parent=world){const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat(color));m.position.set(x,y,z);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
function floorBase(color=0x182c38){const f=new THREE.Mesh(new THREE.PlaneGeometry(40,24),mat(color,.82,.02));f.rotation.x=-Math.PI/2;f.receiveShadow=true;world.add(f);return f;}
function clearWorld(){
 while(world.children.length)world.remove(world.children[0]);while(dynamic.children.length)dynamic.remove(dynamic.children[0]);objects=[];projectiles=[];shootables=[];missionState=null;spawnAcc=0;
 if(player){scene.remove(player);player=null;}if(playerShadow){scene.remove(playerShadow);playerShadow=null;}if(mixer){mixer.stopAllAction();mixer=null;}actions={};
}
function addRunway(){
 floorBase(0x202a30);for(let i=-4;i<=4;i++)box(.16,.01,1.2,0xe8e6d9,i*1.5,.011,-1.8);box(12,.012,.08,0xf5d35a,0,.013,1.8);for(let i=-3;i<=3;i++){const l=new THREE.PointLight(0x72c7ff,.35,3);l.position.set(i*2,0.16,-2.8);world.add(l);}
}
function addHangar(){floorBase(0x222a2f);box(15,4.8,.18,0x14222a,0,2.4,-4.3);for(let i=-3;i<=3;i++)box(.12,4.8,.12,0x42515b,i*2.2,2.4,-4.05);box(15,.18,1.8,0x18262e,0,4.65,-3.5);}
function addOffice(){
 floorBase(0x28303a);box(14,4,.18,0x172630,0,2,-4);for(let i=-3;i<=3;i++){box(1.3,.72,.7,0x6f573e,i*1.9,.36,-.8);box(.62,.42,.10,0x1a2932,i*1.9,.93,-.85);box(.12,.12,.4,0xddddcc,i*1.9+.45,.8,-.6);}box(4,.9,.9,0x59442f,0,.45,1.3);
}
function buildMenuWorld(){
 addRunway();for(let i=0;i<5;i++){const pole=box(.08,3.2,.08,0x465a67,-5+i*2.5,1.6,-3);const l=new THREE.PointLight(i%2?0xffd36c:0x68c9ff,.45,4);l.position.set(pole.position.x,3,-2.8);world.add(l);}createPlayer(false);if(player)player.position.set(1.7,0,0);
}

function tintModel(root,color){
 root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material=o.material.clone();if(o.material.color){const base=o.material.color.clone();base.lerp(new THREE.Color(color),.28);o.material.color.copy(base);}}}});
}
function createPlayer(addToScene=true){
 if(!baseModel)return null;const c=currentChar();player=SkeletonUtils.clone(baseModel);player.scale.setScalar(1.12);tintModel(player,c.color);player.position.set(0,0,0);if(addToScene)scene.add(player);else world.add(player);
 mixer=new THREE.AnimationMixer(player);const clips=baseClips;const byName=n=>clips.find(c=>c.name.toLowerCase()===n)||null;
 const idle=byName('idle')||clips[0],run=byName('run')||clips[1],walk=byName('walk')||clips[3]||clips[0];
 actions.idle=mixer.clipAction(idle);actions.run=mixer.clipAction(run);actions.walk=mixer.clipAction(walk);Object.values(actions).forEach(a=>{a.enabled=true;a.setEffectiveWeight(0);a.play();});actions.idle.setEffectiveWeight(1);activeAction='idle';
 const sh=new THREE.Mesh(new THREE.CircleGeometry(.42,28),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.28,depthWrite:false}));sh.rotation.x=-Math.PI/2;sh.position.set(player.position.x,.012,player.position.z);scene.add(sh);playerShadow=sh;return player;
}
function fadeAction(name,d=.18){if(!actions[name]||activeAction===name)return;actions[activeAction]?.fadeOut(d);actions[name].reset().setEffectiveWeight(1).fadeIn(d).play();activeAction=name;}
function controller(dt){
 if(!player||mode!=='mission')return;const c=currentChar();const moving=keys.left||keys.right;facing=keys.right?1:keys.left?-1:facing;const run=keys.shift;const speed=(run?3.25:1.85)*c.speed;let vx=moving?facing*speed:0;if(moving)fadeAction(run?'run':'walk');else fadeAction('idle');
 player.position.x=clamp(player.position.x+vx*dt,-5.1,5.1);const targetY=facing>0?Math.PI/2:-Math.PI/2;let dy=((targetY-player.rotation.y+Math.PI)%(Math.PI*2))-Math.PI;player.rotation.y+=dy*Math.min(1,dt*11);
 if(!grounded){playerVelY-=10.8*dt;player.position.y+=playerVelY*dt;if(player.position.y<=0){player.position.y=0;playerVelY=0;grounded=true;}}
 if(playerShadow){playerShadow.position.x=player.position.x;playerShadow.position.z=player.position.z;playerShadow.scale.setScalar(grounded?1:.75);playerShadow.material.opacity=grounded?.28:.16;}
 camera.position.x+=(player.position.x*.18-camera.position.x)*Math.min(1,dt*2.8);camera.lookAt(player.position.x*.08,1.05,-.4);
}
function jump(){if(mode==='mission'&&player&&grounded){grounded=false;playerVelY=4.7;beep('ok');}}

function createMetin({x=0,y=1,z=-1,scale=.45,color=0x6b7480,kind='normal'}={}){
 const g=new THREE.Group();const rock=new THREE.Mesh(new THREE.IcosahedronGeometry(scale,2),new THREE.MeshStandardMaterial({color,roughness:.82,metalness:.08,flatShading:true}));rock.castShadow=true;g.add(rock);
 const eyeMat=new THREE.MeshStandardMaterial({color:kind==='fake'?0xff3030:0xffd45b,emissive:kind==='fake'?0xaa0000:0x664400,emissiveIntensity:1.4});for(const sx of [-1,1]){const e=new THREE.Mesh(new THREE.SphereGeometry(scale*.075,10,8),eyeMat);e.position.set(sx*scale*.18,scale*.12,scale*.87);g.add(e);}g.position.set(x,y,z);g.userData={kind,hp:1,alive:true};dynamic.add(g);return g;
}
function addGunMarker(parent,color=0x20242a){const gun=new THREE.Mesh(new THREE.BoxGeometry(.42,.10,.12),new THREE.MeshStandardMaterial({color,metalness:.6,roughness:.35}));gun.position.set(.45,-.03,.1);parent.add(gun);}

function startMission(id){
 ensureAudio();missionId=id;save.selectedMission=id;saveGame();mode='mission';paused=false;clearWorld();hideAllPanels();$('menu').classList.add('hidden');$('result').classList.add('hidden');$('pause').classList.add('hidden');$('hud').classList.remove('hidden');$('controls').classList.remove('hidden');$('crosshair').classList.toggle('hidden',![2,4,5].includes(id));
 const m=currentMission();setTop(`${id}. GÖREV • ${m.name}`);$('hudMission').textContent=`${id}. ${m.name}`;missionState={time:m.time,score:0,errors:0,combo:0,ammo:8,reloading:false,hp:5,deskHp:10,bossHp:320,catches:0,shieldUsed:false,done:false};grounded=true;playerVelY=0;
 if(id===1)addRunway();else if(id===2)addHangar();else if(id===3)addRunway();else if(id===4)addOffice();else addHangar();
 createPlayer();player.position.set(0,0,2.2);if(id===1||id===3)player.position.z=1.7;camera.position.set(0,2.65,7.6);camera.lookAt(0,1.05,-.4);updateHUD();
 const controls={1:'A/D: hareket • SHIFT: koş • SPACE: zıpla • düşen Metinleri otomatik yakala',2:'A/D: hareket • Fare: hedef al / tıkla • R: şarjör değiştir • P/ESC: duraklat',3:'A/D: kovala • SHIFT: koş • SPACE: zıpla',4:'Fare: saldıran Metinleri vur • A/D: hareket • R: şarjör değiştir',5:'Boss ve minyonlara tıkla • A/D: kaç • R: şarjör değiştir'};$('controls').textContent=controls[id];
}
function updateHUD(){if(!missionState)return;const s=missionState;$('hudScore').textContent=`SKOR ${Math.round(s.score)}`;$('hudLeft').textContent=`Süre: ${Math.max(0,Math.ceil(s.time))} sn • Hata: ${s.errors}`;let r='';if([2,4,5].includes(missionId))r=`Mermi: ${s.reloading?'ŞARJÖR...':s.ammo+'/8'}`;if(missionId===3)r=`Yakalanan: ${s.catches}/10`;if(missionId===4)r+=` • Ofis: ${s.deskHp}/10`;if(missionId===5)r+=` • Can: ${s.hp}/5 • Boss: ${Math.max(0,Math.ceil(s.bossHp))}/320`;$('hudRight').textContent=r;}
function addScore(v){const mul=currentChar().bonus;missionState.score+=Math.round(v*mul);missionState.combo++;}
function addError(msg='HATA!'){
 const c=currentChar();if(c.id==='turgut'&&!missionState.shieldUsed){missionState.shieldUsed=true;toast('Turgut kalkanı hatayı karşıladı');beep('bonus');return;}missionState.errors++;missionState.combo=0;toast(msg,true);beep('bad');
}
function reload(){if(!missionState||![2,4,5].includes(missionId)||missionState.reloading||missionState.ammo===8)return;missionState.reloading=true;beep('reload');updateHUD();setTimeout(()=>{if(!missionState)return;missionState.ammo=8;missionState.reloading=false;updateHUD();},currentChar().id==='nafi'?650:1050);}

function updateMission1(dt){
 spawnAcc+=dt;if(spawnAcc>(missionState.time<18?.46:.62)){spawnAcc=0;const r=Math.random();let kind='normal',color=0x737d86,scale=.38;if(r<.11){kind='bonus';color=0xf0b82d;scale=.34}else if(r<.20){kind='fake';color=0xa6323a;scale=.35}else if(r>.94){kind='big';color=0x485461;scale=.62}const o=createMetin({x:rand(-4.8,4.8),y:5.4,z:1.7,scale,color,kind});o.userData.vy=rand(2.3,3.6)+(45-missionState.time)*.018;objects.push(o);}
 for(const o of [...objects]){o.position.y-=o.userData.vy*dt;o.rotation.x+=dt*1.4;o.rotation.y+=dt*1.7;const tol=currentChar().id==='zeko'?1.0:.72;if(o.position.y<1.2&&o.position.y>.15&&Math.abs(o.position.x-player.position.x)<tol){if(o.userData.kind==='fake')addError('SAHTE METİN!');else{addScore(o.userData.kind==='bonus'?180:o.userData.kind==='big'?250:100);beep(o.userData.kind==='bonus'?'bonus':'ok');toast(o.userData.kind==='big'?'BÜYÜK METİN! +250':`YAKALANDI +${o.userData.kind==='bonus'?180:100}`);}dynamic.remove(o);objects.splice(objects.indexOf(o),1);continue;}if(o.position.y<-.5){if(o.userData.kind!=='fake')addError('METİN KAÇTI');dynamic.remove(o);objects.splice(objects.indexOf(o),1);}}
}

function spawnTarget(){
 const r=Math.random();let kind='armed',color=0x9b313b,hp=1,points=120;if(r<.18){kind='civil';color=0x3186a3;points=0}else if(r<.37){kind='shield';color=0x664b9f;hp=2;points=180}else if(r<.50){kind='gold';color=0xd4a62b;points=240}else if(r<.68){kind='fast';color=0x9b5131;points=150};const o=createMetin({x:rand(-4.7,4.7),y:rand(1.0,2.1),z:rand(-2.9,-1.1),scale:.42,color,kind});if(kind!=='civil')addGunMarker(o);o.userData.hp=hp;o.userData.points=points;o.userData.life=rand(2.4,4.3);o.userData.vx=kind==='fast'?choice([-1,1])*rand(1.3,2.2):rand(-.35,.35);objects.push(o);shootables.push(o);
}
function updateMission2(dt){spawnAcc+=dt;if(spawnAcc>.7){spawnAcc=0;if(objects.length<7)spawnTarget();}for(const o of [...objects]){o.userData.life-=dt;o.position.x+=o.userData.vx*dt;if(Math.abs(o.position.x)>5.2)o.userData.vx*=-1;o.rotation.y+=dt*.35;if(o.userData.life<=0){if(o.userData.kind!=='civil')addError('HEDEF KAÇTI');removeObj(o);}}}

function spawnRunner(){const o=createMetin({x:choice([-4.8,4.8]),y:.65,z:1.7,scale:.46,color:0x596878,kind:'runner'});o.userData.dir=o.position.x<0?1:-1;o.userData.speed=2.0+missionState.catches*.18;o.userData.turn=rand(1.2,2.5);objects.push(o);return o;}
function updateMission3(dt){if(!objects.length)spawnRunner();const o=objects[0];o.userData.turn-=dt;if(o.userData.turn<0){o.userData.dir*=-1;o.userData.turn=rand(.8,2.1);}o.position.x+=o.userData.dir*o.userData.speed*dt;if(o.position.x>5)o.userData.dir=-1;if(o.position.x<-5)o.userData.dir=1;o.rotation.y+=dt*3;if(Math.abs(o.position.x-player.position.x)<(currentChar().id==='zeko'?.92:.66)){missionState.catches++;addScore(150+missionState.catches*15);beep('bonus');toast(`YAKALANDI ${missionState.catches}/10`);removeObj(o);if(missionState.catches>=10)finishMission(true);}}

function spawnOfficeEnemy(){const kind=Math.random()<.18?'shield':'armed';const o=createMetin({x:rand(-5,5),y:.6,z:-3.4,scale:kind==='shield'?.48:.42,color:kind==='shield'?0x654c97:0x91323d,kind});o.userData.hp=kind==='shield'?2:1;o.userData.points=kind==='shield'?170:110;o.userData.speed=rand(.65,1.05);addGunMarker(o);objects.push(o);shootables.push(o);}
function updateMission4(dt){spawnAcc+=dt;if(spawnAcc>.72){spawnAcc=0;if(objects.length<9)spawnOfficeEnemy();}for(const o of [...objects]){o.position.z+=o.userData.speed*dt;o.rotation.y+=dt;if(o.position.z>.65){missionState.deskHp--;addError('OFİSE DARBE!');removeObj(o);if(missionState.deskHp<=0){finishMission(false);return;}}}}

function createBoss(){const boss=createMetin({x:0,y:1.45,z:-2.5,scale:1.28,color:0x3f4b55,kind:'boss'});boss.userData.hp=320;boss.userData.points=0;boss.userData.vx=1.1;boss.userData.fire=1.3;objects.push(boss);shootables.push(boss);return boss;}
function spawnMinion(){const o=createMetin({x:rand(-4.5,4.5),y:.55,z:-2.5,scale:.34,color:0x6f3439,kind:'minion'});o.userData.hp=1;o.userData.points=80;o.userData.speed=rand(.55,.9);objects.push(o);shootables.push(o);}
function bossProjectile(x){const m=new THREE.Mesh(new THREE.SphereGeometry(.13,12,8),new THREE.MeshStandardMaterial({color:0xff5035,emissive:0xaa1608,emissiveIntensity:2}));m.position.set(x,1,-2.3);m.userData.vz=4.3;dynamic.add(m);projectiles.push(m);}
function updateMission5(dt){let boss=objects.find(o=>o.userData.kind==='boss');if(!boss){boss=createBoss();}const phase=missionState.bossHp>220?1:missionState.bossHp>110?2:3;boss.userData.vx=Math.abs(boss.userData.vx)*(phase===1?1:phase===2?1.35:1.75)*Math.sign(boss.userData.vx||1);boss.position.x+=boss.userData.vx*dt;if(Math.abs(boss.position.x)>3.8)boss.userData.vx*=-1;boss.rotation.y+=dt*.35;boss.userData.fire-=dt;if(boss.userData.fire<=0){bossProjectile(boss.position.x);boss.userData.fire=phase===1?1.5:phase===2?1.05:.72;}spawnAcc+=dt;if(spawnAcc>(phase===3?1.35:2.0)){spawnAcc=0;if(objects.filter(o=>o.userData.kind==='minion').length<4)spawnMinion();}
 for(const o of [...objects])if(o.userData.kind==='minion'){o.position.z+=o.userData.speed*dt;if(o.position.z>1.1){missionState.hp--;addError('MİNYON VURDU!');removeObj(o);if(missionState.hp<=0){finishMission(false);return;}}}
 for(const p of [...projectiles]){p.position.z+=p.userData.vz*dt;if(p.position.z>1.8){if(Math.abs(p.position.x-player.position.x)<.75){missionState.hp--;addError('BOSS ATIŞI!');}dynamic.remove(p);projectiles.splice(projectiles.indexOf(p),1);if(missionState.hp<=0){finishMission(false);return;}}}
}

function removeObj(o){dynamic.remove(o);let i=objects.indexOf(o);if(i>=0)objects.splice(i,1);i=shootables.indexOf(o);if(i>=0)shootables.splice(i,1);}
function shoot(ev){
 if(mode!=='mission'||paused||![2,4,5].includes(missionId)||missionState.reloading)return;ensureAudio();if(missionState.ammo<=0){toast('ŞARJÖR BOŞ • R',true);beep('bad');return;}missionState.ammo--;beep('shoot');
 const rect=renderer.domElement.getBoundingClientRect();const mouse=new THREE.Vector2(((ev.clientX-rect.left)/rect.width)*2-1,-((ev.clientY-rect.top)/rect.height)*2+1);const ray=new THREE.Raycaster();ray.setFromCamera(mouse,camera);const meshes=[];for(const g of shootables)g.traverse(o=>{if(o.isMesh){o.userData.targetRoot=g;meshes.push(o);}});const hit=ray.intersectObjects(meshes,false)[0];if(hit){const o=hit.object.userData.targetRoot;if(o?.userData?.alive!==false)hitTarget(o);}updateHUD();
}
function hitTarget(o){
 const kind=o.userData.kind;if(kind==='civil'){addError('SİVİL HEDEF!');removeObj(o);return;}if(kind==='boss'){missionState.bossHp=Math.max(0,missionState.bossHp-10);addScore(25);beep('boss');toast(`BOSS ${missionState.bossHp}/320`);if(missionState.bossHp<=0){removeObj(o);finishMission(true);}return;}o.userData.hp--;beep('hit');if(o.userData.hp>0){toast('KALKAN KIRILDI');return;}addScore(o.userData.points||100);toast(`+${Math.round((o.userData.points||100)*currentChar().bonus)}`);removeObj(o);
}

function missionUpdate(dt){
 if(!missionState||missionState.done)return;missionState.time-=dt;controller(dt);if(missionId===1)updateMission1(dt);else if(missionId===2)updateMission2(dt);else if(missionId===3)updateMission3(dt);else if(missionId===4)updateMission4(dt);else updateMission5(dt);updateHUD();if(missionState.time<=0&&!missionState.done){const success=missionId===3 ? missionState.catches>=7 : missionId===4 ? missionState.deskHp>0 : missionId===5 ? missionState.bossHp<=0 : missionId===1 ? missionState.score>=1800 : missionState.score>=1600;finishMission(success);}
}
function finishMission(success){
 if(!missionState||missionState.done)return;missionState.done=true;mode='result';fadeAction('idle');const s=missionState;let stars=success?1:0;if(success&&s.errors<=2)stars=2;if(success&&s.errors===0)stars=3;const old=save.best[missionId]||{score:0,stars:0};save.best[missionId]={score:Math.max(old.score||0,Math.round(s.score)),stars:Math.max(old.stars||0,stars)};save.totalStars=Object.values(save.best).reduce((a,b)=>a+(b.stars||0),0);if(success&&s.errors===0)save.zeroError=Math.max(save.zeroError||0,1);saveGame();$('resultTitle').textContent=success?'GÖREV TAMAMLANDI':'GÖREV BAŞARISIZ';$('resultText').innerHTML=`Skor: <b>${Math.round(s.score)}</b><br>Hata: <b>${s.errors}</b>${missionId===5?`<br>Boss: <b>${Math.max(0,s.bossHp)}/320</b>`:''}`;$('resultStars').textContent='★'.repeat(stars)+'☆'.repeat(3-stars);$('result').classList.remove('hidden');$('hud').classList.add('hidden');$('controls').classList.add('hidden');$('crosshair').classList.add('hidden');setTop(success?'GÖREV TAMAMLANDI':'GÖREV BAŞARISIZ');beep(success?'bonus':'bad');
}

function qualityTest(){
 ensureAudio();mode='mission';missionId=0;clearWorld();hideAllPanels();$('menu').classList.add('hidden');$('hud').classList.remove('hidden');$('controls').classList.remove('hidden');$('crosshair').classList.add('hidden');addRunway();createPlayer();player.position.set(0,0,0);missionState={time:9999,score:0,errors:0,combo:0,ammo:8,reloading:false,done:false};$('hudMission').textContent='3D HAREKET TESTİ';$('hudScore').textContent=currentChar().name;$('hudLeft').textContent='Gerçek rig / skinning';$('hudRight').textContent='Idle • Walk • Run';$('controls').textContent='A/D veya ←/→: yürü • SHIFT: koş • SPACE: zıpla • ESC: ana menü';setTop('3D HAREKET TESTİ');camera.position.set(0,2.45,6.2);camera.lookAt(0,1.05,0);
}

function renderMissionGrid(){const grid=$('missionGrid');grid.innerHTML='';for(const m of MISSIONS){const b=save.best[m.id]||{score:0,stars:0};const d=document.createElement('div');d.className='tile';d.innerHTML=`<h3>${m.id}. ${m.name} / ${m.verb}</h3><p>${m.desc}</p><div class="stars">${'★'.repeat(b.stars||0)}${'☆'.repeat(3-(b.stars||0))} &nbsp; En iyi: ${b.score||0}</div>`;d.onclick=()=>startMission(m.id);grid.appendChild(d);}}
function renderCharacterGrid(){const grid=$('characterGrid');grid.innerHTML='';for(const c of CHARACTERS){const d=document.createElement('div');d.className='tile char'+(save.selectedCharacter===c.id?' selected':'');d.innerHTML=`<h3>${c.name}</h3><p>${c.desc}</p><span class="charTag">3D RIG</span><div class="statline">Hız ${Math.round(c.speed*100)} • Hedef ${Math.round(c.aim*100)} • Skor ${Math.round(c.bonus*100)}</div>`;d.onclick=()=>{save.selectedCharacter=c.id;saveGame();renderCharacterGrid();updateMenuText();toast(`${c.name} seçildi`);};grid.appendChild(d);}}
function renderCareer(){let rows=MISSIONS.map(m=>{const b=save.best[m.id]||{score:0,stars:0};return `<div class="tile"><h3>${m.id}. ${m.name}</h3><p>En iyi skor: <b>${b.score||0}</b></p><div class="stars">${'★'.repeat(b.stars||0)}${'☆'.repeat(3-(b.stars||0))}</div></div>`}).join('');$('careerContent').innerHTML=`<p>Toplam yıldız: <b>${save.totalStars||0}/15</b> &nbsp;•&nbsp; Sıfır hata rozeti: <b>${save.zeroError?'Açıldı':'Henüz yok'}</b></p><div class="grid">${rows}</div>`;}
function openPanel(id){hideAllPanels();$('menu').classList.add('hidden');$(id).classList.remove('hidden');if(id==='missionPanel')renderMissionGrid();if(id==='characterPanel')renderCharacterGrid();if(id==='careerPanel')renderCareer();}

$('playBtn').onclick=()=>startMission(save.selectedMission||1);$('missionsBtn').onclick=()=>openPanel('missionPanel');$('charsBtn').onclick=()=>openPanel('characterPanel');$('careerBtn').onclick=()=>openPanel('careerPanel');$('settingsBtn').onclick=()=>openPanel('settingsPanel');$('qualityBtn').onclick=qualityTest;$('fullscreenBtn').onclick=()=>document.documentElement.requestFullscreen?.();document.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>showMenu());
$('resumeBtn').onclick=()=>togglePause(false);$('pauseHomeBtn').onclick=showMenu;$('resultHomeBtn').onclick=showMenu;$('repeatBtn').onclick=()=>startMission(missionId);$('nextBtn').onclick=()=>startMission(missionId>=5?1:missionId+1);
$('volumeRange').value=settings.volume;$('volumeVal').textContent=Math.round(settings.volume*100)+'%';$('volumeRange').oninput=e=>{settings.volume=+e.target.value;$('volumeVal').textContent=Math.round(settings.volume*100)+'%';saveSettings();};$('qualityRange').value=settings.quality;$('qualityVal').textContent=settings.quality.toFixed(1)+'x';$('qualityRange').oninput=e=>{settings.quality=+e.target.value;$('qualityVal').textContent=settings.quality.toFixed(1)+'x';renderer.setPixelRatio(Math.min(devicePixelRatio,settings.quality));renderer.setSize(innerWidth,innerHeight);saveSettings();};

function togglePause(force){if(mode!=='mission'||missionId===0&&force===undefined){if(missionId===0){showMenu();}return;}paused=force===undefined?!paused:force;$('pause').classList.toggle('hidden',!paused);setTop(paused?'DURAKLATILDI':`${missionId}. GÖREV • ${currentMission().name}`);}
function keyChange(code,down){if(code==='KeyA'||code==='ArrowLeft')keys.left=down;if(code==='KeyD'||code==='ArrowRight')keys.right=down;if(code==='ShiftLeft'||code==='ShiftRight')keys.shift=down;if(down&&code==='Space')jump();if(down&&code==='KeyR')reload();if(down&&(code==='KeyP'||code==='Escape')){if(mode==='mission'){if(missionId===0)showMenu();else togglePause();}else if(mode!=='menu')showMenu();}}
addEventListener('keydown',e=>{if(['ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();if(!e.repeat||['ArrowLeft','ArrowRight','KeyA','KeyD'].includes(e.code))keyChange(e.code,true);});addEventListener('keyup',e=>keyChange(e.code,false));renderer.domElement.addEventListener('pointerdown',shoot);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

function animate(t){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);if(!paused){if(mixer)mixer.update(dt);if(mode==='mission'){if(missionId===0)controller(dt);else missionUpdate(dt);}world.rotation.y=Math.sin(t*.00008)*.008;}renderer.render(scene,camera);}

const loader=new GLTFLoader();
loader.load(MODEL_URL,gltf=>{baseModel=gltf.scene;baseClips=gltf.animations;$('loadMsg').textContent='3D karakter hazır. Oyun başlatılıyor…';setTimeout(()=>{$('loading').classList.add('hidden');showMenu();animate(0);},200);},xhr=>{if(xhr.total){$('loadMsg').textContent=`Gerçek iskeletli karakter yükleniyor… %${Math.round(xhr.loaded/xhr.total*100)}`;}},err=>{console.error(err);$('loadErr').textContent='3D model yüklenemedi. İnternet bağlantısını kontrol edip sayfayı yenile.';setTop('YÜKLEME HATASI');});