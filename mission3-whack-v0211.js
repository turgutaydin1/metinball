(()=>{
  if(typeof GameScene==='undefined') return;
  const phone=()=>((('ontouchstart' in window)||navigator.maxTouchPoints>0)&&Math.min(window.innerWidth,window.innerHeight)<900);
  const M3={id:3,title:'METİNİ İNDİR',verb:'VUR',subtitle:'Deliklerden çıkan Metinlerin kafasına sopayla vur.',duration:70};

  // Metin'in İntikamı ayrı mod olarak kalır; normal görev listesine yeni Görev 3 eklenir.
  const oldCreate=GameScene.prototype.create;
  GameScene.prototype.create=function(data={}){
    const out=oldCreate.call(this,data);
    if(!this.missions.some(m=>m.id===3)){
      const boss=this.missions.find(m=>m.id===5);
      this.missions=[
        ...this.missions.filter(m=>m.id!==5),
        M3,
        ...(boss?[boss]:[])
      ].sort((a,b)=>a.id-b.id);
    }
    return out;
  };

  // Görev 3 oyuncusu seçili karakterdir ve elinde sopa taşır.
  const oldCreatePlayer=GameScene.prototype.createPlayer;
  GameScene.prototype.createPlayer=function(withWeapon=false){
    const out=oldCreatePlayer.call(this,withWeapon);
    if(this.selectedMission!==3) return out;
    const h=this.scale.height;
    const ph=this.playerImage?.displayHeight||228;
    try{
      const bat=this.add.container(ph*.13,-ph*.50);
      const g=this.add.graphics();
      g.fillStyle(0x7a4a28,1);g.fillRoundedRect(-6,-64,12,72,6);
      g.fillStyle(0xb98046,1);g.fillRoundedRect(-8,-70,16,18,8);
      g.lineStyle(2,0x3e2415,.85);g.strokeRoundedRect(-6,-64,12,72,6);
      bat.add(g);bat.setRotation(.52);
      bat.setScale(phone()?.72:.90);
      this.player.add(bat);this.player.bringToTop(bat);
      this.m3Bat=bat;this.m3BatRest=.52;this.m3LastSwing=0;
      this.playerBaseY=this.player.y;
      if(phone()) this.player.y=h*.93;
    }catch{}
    return out;
  };

  const oldConfigure=GameScene.prototype.configureMissionHud;
  GameScene.prototype.configureMissionHud=function(...args){
    const out=oldConfigure.apply(this,args);
    if(this.selectedMission===3){
      this.titleText?.setText('GÖREV 3 • METİNİ İNDİR');
      this.targetText?.setText('Deliklerden çıkan Metinlere sopayla vur.');
      this.countText?.setText('VURULAN  0');
      this.phaseText?.setText('DELİKLER • BAŞLANGIÇ');
      this.accuracyText?.setText('İSABET  %100');
      this.controlsText?.setText(phone()?'Metin çıkan deliğe dokun: sopa vur':'Metin çıkan deliğe tıkla • P/ESC: durdur');
      this.missionText?.setText('GÖREV 3\n[ ] 20 Metin vur\n[ ] x8 kombo\n[ ] En fazla 5 kaçır');
    }
    return out;
  };

  GameScene.prototype.m3BuildHoles=function(){
    this.m3Holes=[];this.m3Whacks=[];
    const w=this.scale.width,h=this.scale.height;
    const cols=3,rows=3;
    const xs=[w*.20,w*.50,w*.80];
    const ys=phone()?[h*.27,h*.47,h*.67]:[h*.30,h*.49,h*.68];
    const holeW=phone()?w*.23:150,holeH=phone()?h*.038:28;
    for(let r=0;r<rows;r++) for(let c=0;c<cols;c++){
      const x=xs[c],y=ys[r];
      const rim=this.add.ellipse(x,y,holeW,holeH*1.6,0x6f4a2d,1).setDepth(7);
      const dark=this.add.ellipse(x,y+holeH*.06,holeW*.82,holeH,0x160d08,1).setDepth(8);
      this.m3Holes.push({x,y,rim,dark,busy:false});
    }
  };

  GameScene.prototype.startMission3=function(){
    this.m3BuildHoles();
    this.m3Whacks=[];
    this.spawnEvent=this.time.addEvent({delay:1050,loop:true,callback:()=>this.m3SpawnMetin()});
  };

  GameScene.prototype.m3SpawnMetin=function(){
    if(!this.started||this.gameOver||this.pausedByMenu||!this.m3Holes?.length)return;
    const max=this.phase===1?2:this.phase===2?3:4;
    if((this.m3Whacks||[]).filter(t=>!t.resolved).length>=max)return;
    const free=this.m3Holes.filter(h=>!h.busy);if(!free.length)return;
    const hole=Phaser.Utils.Array.GetRandom(free);hole.busy=true;
    const w=this.scale.width,h=this.scale.height;
    const kindRoll=Math.random();
    const kind=kindRoll<.12?'gold':kindRoll<.25?'fast':'normal';
    const frame=kind==='gold'?1:Phaser.Math.Between(0,3);
    const mh=phone()?h*.105:118;
    const sprite=this.add.image(hole.x,hole.y+mh*.45,'miniSheet',frame).setDisplaySize(mh*.67,mh).setDepth(9);
    if(kind==='gold')sprite.setTint(0xffe08a);
    const badge=this.add.text(hole.x,hole.y-mh*.38,kind==='gold'?'ALTIN':kind==='fast'?'HIZLI':'METİN',{
      fontFamily:'Arial Black, Arial',fontSize:phone()?`${Math.max(8,Math.round(w*.020))}px`:'10px',color:'#fff',
      backgroundColor:kind==='gold'?'#9b7416':kind==='fast'?'#9b4930':'#7e3038',padding:{x:4,y:2}
    }).setOrigin(.5).setDepth(11).setAlpha(0);
    const target={hole,sprite,badge,kind,resolved:false,exposed:false,expireAt:0};
    this.m3Whacks.push(target);
    const riseY=hole.y-mh*.42;
    const rise=kind==='fast'?125:165;
    this.tweens.add({targets:sprite,y:riseY,duration:rise,ease:'Quad.easeOut',onComplete:()=>{
      if(target.resolved)return;
      target.exposed=true;badge.setAlpha(1).setPosition(hole.x,riseY-mh*.56);
      const hold=kind==='fast'?520:kind==='gold'?820:720;
      target.expireAt=this.time.now+hold;
    }});
  };

  GameScene.prototype.m3SwingBat=function(targetX,targetY){
    const now=this.time.now;if(now-(this.m3LastSwing||0)<120)return;
    this.m3LastSwing=now;
    try{
      if(this.player)this.movePlayer(targetX);
      if(this.m3Bat){
        this.tweens.killTweensOf(this.m3Bat);this.m3Bat.setRotation(this.m3BatRest??.52);
        this.tweens.add({targets:this.m3Bat,rotation:-1.05,duration:75,yoyo:true,hold:25,ease:'Quad.easeOut'});
      }
    }catch{}
  };

  GameScene.prototype.m3Blood=function(x,y){
    const count=phone()?8:12;
    for(let i=0;i<count;i++){
      const r=Phaser.Math.Between(2,5);
      const d=this.add.circle(x,y,r,i%3===0?0x7a1018:0xc92735,.88).setDepth(70);
      this.tweens.add({targets:d,x:x+Phaser.Math.Between(-42,42),y:y+Phaser.Math.Between(-28,48),alpha:0,scale:.45,duration:260+Phaser.Math.Between(0,150),ease:'Quad.easeOut',onComplete:()=>d.destroy()});
    }
  };

  GameScene.prototype.m3HitTarget=function(t){
    if(!t||t.resolved||!t.exposed)return;
    t.resolved=true;t.exposed=false;t.hole.busy=false;
    this.caught++;this.hits++;this.shots++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);
    let earned=t.kind==='gold'?75:t.kind==='fast'?38:25;earned+=Math.min(this.combo*3,36);if(this.selected.id==='baki')earned=Math.round(earned*1.15);this.score+=earned;
    this.m3SwingBat(t.hole.x,t.hole.y);this.m3Blood(t.sprite.x,t.sprite.y);
    if(this.soundOn)this.sound.play('catch',{volume:.34});
    this.pop(t.sprite.x,t.sprite.y,`PAT! +${earned}`,'#ffb0b8','#3a0b0f');
    t.badge?.destroy();
    this.tweens.add({targets:t.sprite,y:t.hole.y+t.sprite.displayHeight*.45,angle:Phaser.Math.Between(-12,12),alpha:.45,duration:145,ease:'Quad.easeIn',onComplete:()=>{try{t.sprite.destroy()}catch{}}});
    this.updateHud();
  };

  GameScene.prototype.m3TryHit=function(pointer){
    if(this.selectedMission!==3||!this.started||this.gameOver||this.pausedByMenu)return;
    this.shots++;
    let best=null,bestD=1e9;
    for(const t of this.m3Whacks||[]){
      if(!t?.sprite?.active||t.resolved||!t.exposed)continue;
      const rx=t.sprite.displayWidth*.75,ry=t.sprite.displayHeight*.58;
      const dx=(pointer.worldX-t.sprite.x)/Math.max(1,rx),dy=(pointer.worldY-t.sprite.y)/Math.max(1,ry),d=dx*dx+dy*dy;
      if(d<=1.35&&d<bestD){best=t;bestD=d;}
    }
    this.m3SwingBat(pointer.worldX,pointer.worldY);
    if(best){this.shots--;this.m3HitTarget(best);}else{this.combo=0;this.comboText?.setText('');this.updateHud();}
  };

  GameScene.prototype.updateMission3=function(_dt){
    if(!this.m3Whacks)return;
    for(let i=this.m3Whacks.length-1;i>=0;i--){
      const t=this.m3Whacks[i];if(!t||t.resolved)continue;
      if(t.exposed&&t.expireAt&&this.time.now>=t.expireAt){
        t.exposed=false;t.resolved=true;t.hole.busy=false;this.missed++;this.combo=0;
        if(this.soundOn)this.sound.play('miss',{volume:.28});
        t.badge?.destroy();
        this.tweens.add({targets:t.sprite,y:t.hole.y+t.sprite.displayHeight*.45,duration:135,ease:'Quad.easeIn',onComplete:()=>{try{t.sprite.destroy()}catch{}}});
        this.updateHud();
      }
    }
  };

  const oldInput=GameScene.prototype.registerInput;
  GameScene.prototype.registerInput=function(...args){
    const out=oldInput.apply(this,args);
    this.input.on('pointerdown',p=>{if(this.selectedMission===3)this.m3TryHit(p)});
    return out;
  };

  const oldHud=GameScene.prototype.updateHud;
  GameScene.prototype.updateHud=function(...args){
    const out=oldHud.apply(this,args);
    if(this.selectedMission===3){
      const acc=this.shots===0?100:Math.round(this.hits/Math.max(1,this.shots)*100);
      this.countText?.setText(`VURULAN  ${this.caught}`);this.accuracyText?.setText(`İSABET  %${acc}`);
      this.missionText?.setText(`GÖREV 3\n${this.caught>=20?'[✓]':'[ ]'} 20 Metin vur\n${this.bestCombo>=8?'[✓]':'[ ]'} x8 kombo\n${this.missed<=5?'[✓]':'[ ]'} En fazla 5 kaçır`);
    }
    return out;
  };

  const oldDiff=GameScene.prototype.updateTimedDifficulty;
  GameScene.prototype.updateTimedDifficulty=function(...args){
    if(this.selectedMission!==3)return oldDiff.apply(this,args);
    const q=this.elapsedSeconds/M3.duration,n=q<.36?1:q<.72?2:3;this.phase=n;
    if(this.spawnEvent)this.spawnEvent.delay=n===1?1050:n===2?820:650;
    this.phaseText?.setText(n===1?'DELİKLER • BAŞLANGIÇ':n===2?'DELİKLER • HIZLANIYOR':'DELİKLER • FİNAL');
  };

  const oldFinish=GameScene.prototype.finishMissionByTime;
  GameScene.prototype.finishMissionByTime=function(){
    if(this.selectedMission!==3)return oldFinish.apply(this,arguments);
    if(this.gameOver)return;this.missionSuccess=this.caught>=20&&this.missed<=5;return this.finishMission();
  };

  const oldCleanup=GameScene.prototype.cleanupMissionObjects;
  GameScene.prototype.cleanupMissionObjects=function(...args){
    if(this.m3Whacks){for(const t of this.m3Whacks){try{t.sprite?.destroy()}catch{}try{t.badge?.destroy()}catch{}}this.m3Whacks=[];}
    if(this.m3Holes){for(const h of this.m3Holes){try{h.rim?.destroy()}catch{}try{h.dark?.destroy()}catch{}}this.m3Holes=[];}
    try{this.m3Bat?.destroy()}catch{}this.m3Bat=null;
    return oldCleanup?.apply(this,args);
  };
})();