(()=>{
  if(typeof GameScene==='undefined') return;

  const phone=()=>((('ontouchstart' in window)||navigator.maxTouchPoints>0)&&Math.min(window.innerWidth,window.innerHeight)<900);
  const M3={id:3,title:'METİN’İ DELİĞİNE GERİ SOK',verb:'VUR',subtitle:'Delikten çıkan Metin’in kafasına sopayla vur ve geri sok.',duration:70};

  const oldCreate=GameScene.prototype.create;
  GameScene.prototype.create=function(data={}){
    const out=oldCreate.call(this,data);
    const boss=this.missions.find(m=>m.id===5);
    this.missions=[...this.missions.filter(m=>m.id!==3&&m.id!==5),M3,...(boss?[boss]:[])].sort((a,b)=>a.id-b.id);
    return out;
  };

  GameScene.prototype.m3BuildBackground=function(){
    const w=this.scale.width,h=this.scale.height;
    this.m3Bg=[];
    const add=o=>{o.setDepth(4);this.m3Bg.push(o);return o};
    add(this.add.rectangle(w/2,h*.52,w,h*.58,0x173d31,1));
    add(this.add.rectangle(w/2,h*.42,w,h*.22,0x315d4c,1));
    add(this.add.rectangle(w/2,h*.58,w,h*.12,0x796044,1));
    add(this.add.rectangle(w/2,h*.64,w,h*.06,0x4a3628,1));
    add(this.add.rectangle(w/2,h*.69,w,h*.08,0x20392d,1));
    for(let i=0;i<9;i++){
      const x=w*(.04+i*.115);
      add(this.add.rectangle(x,h*.34,Math.max(4,w*.005),h*.30,0x6c806c,.65));
      add(this.add.rectangle(x+w*.026,h*.49,w*.052,Math.max(4,h*.006),0x8da18a,.55));
    }
    for(let i=0;i<14;i++){
      const x=w*(i/13),y=h*(.66+Math.sin(i*.9)*.018);
      add(this.add.circle(x,y,phone()?10:17,i%3===0?0x426f3e:i%3===1?0x315b32:0x527b43,.95));
    }
    add(this.add.text(w*.5,h*.285,'METİN BAHÇESİ',{fontFamily:'Arial Black, Arial',fontSize:phone()?`${Math.max(12,Math.round(w*.033))}px`:'18px',color:'#d7e7c2',stroke:'#173126',strokeThickness:4}).setOrigin(.5));
  };

  const hairColor=id=>id==='baki'?0x282522:id==='nafi'?0x38312d:id==='zeko'?0x58483d:0x3b332d;

  const oldCreatePlayer=GameScene.prototype.createPlayer;
  GameScene.prototype.createPlayer=function(withWeapon=false){
    const out=oldCreatePlayer.call(this,withWeapon);
    if(this.selectedMission!==3) return out;

    const w=this.scale.width,h=this.scale.height,isPhone=phone();
    try{this.weaponPivot?.setVisible(false)}catch{}

    const targetH=isPhone?Math.min(h*.285,w*.66):Math.min(h*.38,360);
    this.m3PlayerH=targetH;
    this.playerBaseY=isPhone?h*.925:h-34;
    if(this.player)this.player.y=this.playerBaseY;
    this.playerShadow?.setY(this.playerBaseY+10);
    this.playerLabel?.setText(this.selected.name).setY(isPhone?h*.014:8);

    // Ön yüzdeki yüz tamamen kaldırılır: yalnız karakterin gerçek gövde/kıyafet kısmı kullanılır.
    if(this.playerImage){
      try{this.playerImage.clearCrop()}catch{}
      try{this.playerImage.setCrop(0,62,160,214)}catch{}
      this.playerImage.setDisplaySize(targetH*(160/276),targetH*(214/276));
      this.playerImage.setY(-targetH*.39);
      this.playerImage.setFlipX(false);
      this.playerImage.setAngle(0);
      this.playerImage.setVisible(true);
      try{this.playerImage.clearTint()}catch{}
    }

    // Ayrı, doğal arkadan baş görünümü. Yüzün üzerine bindirilmez; ön yüz crop ile zaten kaldırılmıştır.
    const head=this.add.container(0,-targetH*.745).setDepth(24);
    const hg=this.add.graphics();
    const skin=0xc99570,hair=hairColor(this.selected.id);
    hg.fillStyle(skin,1);hg.fillEllipse(0,0,targetH*.165,targetH*.145);
    hg.fillStyle(hair,1);hg.fillEllipse(0,-targetH*.025,targetH*.172,targetH*.095);
    hg.fillStyle(hair,.96);hg.fillRoundedRect(-targetH*.078,-targetH*.015,targetH*.156,targetH*.055,targetH*.02);
    hg.fillStyle(skin,1);hg.fillEllipse(-targetH*.082,targetH*.005,targetH*.025,targetH*.045);hg.fillEllipse(targetH*.082,targetH*.005,targetH*.025,targetH*.045);
    head.add(hg);
    this.player.add(head);
    this.player.bringToTop(head);
    this.m3RearHead=head;

    const bat=this.add.container(targetH*.19,-targetH*.67);
    const g=this.add.graphics();
    g.fillStyle(0x6e4022,1);g.fillRoundedRect(-targetH*.025,-targetH*.40,targetH*.050,targetH*.44,targetH*.025);
    g.fillStyle(0xb7773a,1);g.fillRoundedRect(-targetH*.039,-targetH*.43,targetH*.078,targetH*.13,targetH*.034);
    g.lineStyle(Math.max(1,targetH*.006),0x321d10,.88);g.strokeRoundedRect(-targetH*.025,-targetH*.40,targetH*.050,targetH*.44,targetH*.025);
    bat.add(g);bat.setRotation(.30);this.player.add(bat);this.player.bringToTop(bat);
    this.m3Bat=bat;this.m3BatRest=.30;this.m3LastSwing=0;
    return out;
  };

  const oldConfigure=GameScene.prototype.configureMissionHud;
  GameScene.prototype.configureMissionHud=function(...args){
    const out=oldConfigure.apply(this,args);
    if(this.selectedMission===3){
      this.titleText?.setText('GÖREV 3 • METİN’İ DELİĞİNE GERİ SOK');
      this.targetText?.setText('Metin delikten çıkınca kafasına sopayla vur.');
      this.countText?.setText('GERİ SOKULAN  0');
      this.phaseText?.setText('3 DELİK • BAŞLANGIÇ');
      this.accuracyText?.setText('İSABET  %100');
      this.controlsText?.setText(phone()?'Metin çıkan deliğe dokun':'Metin çıkan deliğe tıkla • P/ESC: durdur');
      this.missionText?.setText('GÖREV 3\n[ ] 20 Metin geri sok\n[ ] x8 kombo\n[ ] En fazla 5 kaçır');
    }
    return out;
  };

  GameScene.prototype.m3BuildHoles=function(){
    this.m3Holes=[];this.m3Whacks=[];
    this.m3BuildBackground();
    const w=this.scale.width,h=this.scale.height;
    const xs=phone()?[w*.19,w*.50,w*.81]:[w*.37,w*.50,w*.63];
    const y=h*.48;
    const holeW=phone()?w*.235:175,holeH=phone()?h*.036:31;
    for(const x of xs){
      const shadow=this.add.ellipse(x,y+holeH*.30,holeW*.96,holeH*1.46,0x000000,.30).setDepth(6);
      const rimBack=this.add.ellipse(x,y,holeW,holeH*1.72,0x744d2f,1).setDepth(7);
      const dark=this.add.ellipse(x,y+holeH*.07,holeW*.82,holeH,0x150c08,1).setDepth(8);
      const rimFront=this.add.arc(x,y+holeH*.20,holeW*.50,holeH*.48,0,180,false,0x8a5a34,1).setDepth(12);
      this.m3Holes.push({x,y,rimBack,rimFront,dark,shadow,busy:false,holeW,holeH});
    }
  };

  GameScene.prototype.startMission3=function(){
    this.m3BuildHoles();this.m3Whacks=[];
    this.spawnEvent=this.time.addEvent({delay:1200,loop:true,callback:()=>this.m3SpawnMetin()});
  };

  GameScene.prototype.m3SpawnMetin=function(){
    if(!this.started||this.gameOver||this.pausedByMenu||!this.m3Holes?.length)return;
    const max=this.phase===3?2:1;if((this.m3Whacks||[]).filter(t=>!t.resolved).length>=max)return;
    const free=this.m3Holes.filter(x=>!x.busy);if(!free.length)return;
    const hole=Phaser.Utils.Array.GetRandom(free);hole.busy=true;
    const w=this.scale.width,h=this.scale.height,roll=Math.random();
    const kind=roll<.11?'gold':roll<.25?'fast':'normal',frame=kind==='gold'?1:Phaser.Math.Between(0,3);
    const mh=phone()?h*.115:126;
    const sprite=this.add.image(hole.x,hole.y+mh*.40,'miniSheet',frame).setDisplaySize(mh*.67,mh).setDepth(10);
    if(kind==='gold')sprite.setTint(0xffe08a);
    const maskG=this.make.graphics({x:0,y:0,add:false});
    maskG.fillStyle(0xffffff,1);maskG.fillRect(hole.x-hole.holeW*.54,0,hole.holeW*1.08,hole.y+hole.holeH*.18);
    const mask=maskG.createGeometryMask();sprite.setMask(mask);
    const badge=this.add.text(hole.x,hole.y-mh*.40,kind==='gold'?'ALTIN':kind==='fast'?'HIZLI':'METİN',{fontFamily:'Arial Black, Arial',fontSize:phone()?`${Math.max(8,Math.round(w*.020))}px`:'10px',color:'#fff',backgroundColor:kind==='gold'?'#9b7416':kind==='fast'?'#9b4930':'#7e3038',padding:{x:4,y:2}}).setOrigin(.5).setDepth(13).setAlpha(0);
    const t={hole,sprite,badge,maskG,mask,kind,resolved:false,exposed:false,expireAt:0,marked:false};this.m3Whacks.push(t);
    const riseY=hole.y+mh*.16,rise=kind==='fast'?130:180;
    this.tweens.add({targets:sprite,y:riseY,duration:rise,ease:'Quad.easeOut',onComplete:()=>{
      if(t.resolved)return;t.exposed=true;badge.setAlpha(1).setPosition(hole.x,hole.y-mh*.38);
      t.expireAt=this.time.now+(kind==='fast'?800:kind==='gold'?1150:1020);
    }});
  };

  GameScene.prototype.m3Blood=function(x,y){
    const n=phone()?13:18;
    const flash=this.add.circle(x,y,phone()?8:10,0xd12430,.86).setDepth(72);
    this.tweens.add({targets:flash,scale:1.8,alpha:0,duration:170,onComplete:()=>flash.destroy()});
    for(let i=0;i<n;i++){
      const r=Phaser.Math.Between(phone()?2:3,phone()?5:7),d=this.add.circle(x,y,r,i%3===0?0x6e0d15:0xc91f2d,.94).setDepth(73);
      this.tweens.add({targets:d,x:x+Phaser.Math.Between(-55,55),y:y+Phaser.Math.Between(-48,34),alpha:0,scale:.35,duration:300+Phaser.Math.Between(0,170),ease:'Quad.easeOut',onComplete:()=>d.destroy()});
    }
  };

  GameScene.prototype.m3FaceTarget=function(x){
    if(!this.player)return;
    const dir=x<this.player.x?-1:1;
    if(this.playerImage)this.playerImage.setFlipX(dir<0);
    if(this.m3RearHead){this.m3RearHead.x=dir<0?targetSafe(-4):targetSafe(4);this.m3RearHead.setScale(dir<0?-1:1,1);}
    if(this.m3Bat)this.m3Bat.x=Math.abs(this.m3Bat.x)*dir;
    function targetSafe(v){return v}
  };

  GameScene.prototype.m3SwingBat=function(target,hit){
    const now=this.time.now;if(now-(this.m3LastSwing||0)<150)return false;this.m3LastSwing=now;
    const x=target?.hole?.x??target?.worldX??this.player.x;
    this.m3FaceTarget(x);
    const arrive=()=>{
      if(!this.m3Bat)return;
      const dir=x<this.player.x?-1:1;
      this.tweens.killTweensOf(this.m3Bat);this.m3Bat.setRotation(this.m3BatRest*dir);
      this.tweens.add({targets:this.m3Bat,rotation:-1.82*dir,duration:120,hold:35,yoyo:true,ease:'Quad.easeIn',onYoyo:()=>{
        if(hit&&target&&!target.resolved)this.m3HitTarget(target,true);
      }});
    };
    if(this.player){
      const dist=Math.abs(this.player.x-x),dur=Math.min(180,60+dist*.10);
      this.tweens.killTweensOf(this.player);this.tweens.add({targets:this.player,x,duration:dur,ease:'Quad.easeOut',onComplete:arrive});
      if(this.playerShadow){this.tweens.killTweensOf(this.playerShadow);this.tweens.add({targets:this.playerShadow,x,duration:dur,ease:'Quad.easeOut'});}
    }else arrive();
    return true;
  };

  GameScene.prototype.m3DestroyTarget=function(t){
    try{t.sprite?.clearMask(true)}catch{}
    try{t.maskG?.destroy()}catch{}
    try{t.badge?.destroy()}catch{}
    try{t.sprite?.destroy()}catch{}
  };

  GameScene.prototype.m3HitTarget=function(t){
    if(!t||t.resolved||!t.exposed)return;
    t.resolved=true;t.exposed=false;t.hole.busy=false;
    this.caught++;this.hits++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);
    let earned=t.kind==='gold'?75:t.kind==='fast'?40:28;earned+=Math.min(this.combo*3,36);if(this.selected.id==='baki')earned=Math.round(earned*1.15);this.score+=earned;
    const headY=t.sprite.y-t.sprite.displayHeight*.40;
    this.m3Blood(t.sprite.x,headY);
    if(this.soundOn)this.sound.play('catch',{volume:.38});
    this.pop(t.sprite.x,headY,`PAT! +${earned}`,'#ffadb5','#3a0b0f');
    t.badge?.destroy();
    this.tweens.add({targets:t.sprite,y:t.hole.y+t.sprite.displayHeight*.52,scaleX:t.sprite.scaleX*.88,scaleY:t.sprite.scaleY*.72,duration:190,ease:'Back.easeIn',onComplete:()=>this.m3DestroyTarget(t)});
    this.updateHud();
  };

  GameScene.prototype.m3TryHit=function(pointer){
    if(this.selectedMission!==3||!this.started||this.gameOver||this.pausedByMenu)return;
    this.shots++;
    let best=null,bestD=1e9;
    for(const t of this.m3Whacks||[]){
      if(!t?.sprite?.active||t.resolved||!t.exposed||t.marked)continue;
      const dx=pointer.worldX-t.hole.x,dy=pointer.worldY-t.hole.y,d=dx*dx+dy*dy;
      const radius=Math.max(t.hole.holeW*.58,phone()?this.scale.width*.12:92);
      if(d<radius*radius&&d<bestD){best=t;bestD=d;}
    }
    if(best){best.marked=true;this.m3SwingBat(best,true);}else{this.combo=0;this.comboText?.setText('');this.m3SwingBat(pointer,false);this.updateHud();}
  };

  GameScene.prototype.updateMission3=function(){
    if(!this.m3Whacks)return;
    for(const t of this.m3Whacks){
      if(!t||t.resolved)continue;
      if(t.exposed&&t.expireAt&&this.time.now>=t.expireAt&&!t.marked){
        t.exposed=false;t.resolved=true;t.hole.busy=false;this.missed++;this.combo=0;
        if(this.soundOn)this.sound.play('miss',{volume:.28});
        t.badge?.destroy();
        this.tweens.add({targets:t.sprite,y:t.hole.y+t.sprite.displayHeight*.52,duration:155,ease:'Quad.easeIn',onComplete:()=>this.m3DestroyTarget(t)});
        this.updateHud();
      }
    }
  };

  const oldInput=GameScene.prototype.registerInput;
  GameScene.prototype.registerInput=function(...args){const out=oldInput.apply(this,args);this.input.on('pointerdown',p=>{if(this.selectedMission===3)this.m3TryHit(p)});return out;};

  const oldHud=GameScene.prototype.updateHud;
  GameScene.prototype.updateHud=function(...args){
    const out=oldHud.apply(this,args);
    if(this.selectedMission===3){
      const acc=this.shots===0?100:Math.round(this.hits/Math.max(1,this.shots)*100);
      this.countText?.setText(`GERİ SOKULAN  ${this.caught}`);this.accuracyText?.setText(`İSABET  %${acc}`);
      this.missionText?.setText(`GÖREV 3\n${this.caught>=20?'[✓]':'[ ]'} 20 Metin geri sok\n${this.bestCombo>=8?'[✓]':'[ ]'} x8 kombo\n${this.missed<=5?'[✓]':'[ ]'} En fazla 5 kaçır`);
    }
    return out;
  };

  const oldDiff=GameScene.prototype.updateTimedDifficulty;
  GameScene.prototype.updateTimedDifficulty=function(...args){
    if(this.selectedMission!==3)return oldDiff.apply(this,args);
    const q=this.elapsedSeconds/M3.duration,n=q<.36?1:q<.72?2:3;this.phase=n;
    if(this.spawnEvent)this.spawnEvent.delay=n===1?1200:n===2?950:780;
    this.phaseText?.setText(n===1?'3 DELİK • BAŞLANGIÇ':n===2?'3 DELİK • HIZLANIYOR':'3 DELİK • FİNAL');
  };

  const oldFinish=GameScene.prototype.finishMissionByTime;
  GameScene.prototype.finishMissionByTime=function(){if(this.selectedMission!==3)return oldFinish.apply(this,arguments);if(this.gameOver)return;this.missionSuccess=this.caught>=20&&this.missed<=5;return this.finishMission();};

  const oldCleanup=GameScene.prototype.cleanupMissionObjects;
  GameScene.prototype.cleanupMissionObjects=function(...args){
    if(this.m3Whacks){for(const t of this.m3Whacks)this.m3DestroyTarget?.(t);this.m3Whacks=[];}
    if(this.m3Holes){for(const h of this.m3Holes){for(const k of ['rimBack','rimFront','dark','shadow'])try{h[k]?.destroy()}catch{}}this.m3Holes=[];}
    if(this.m3Bg){for(const o of this.m3Bg)try{o?.destroy()}catch{}this.m3Bg=[];}
    try{this.m3Bat?.destroy()}catch{}this.m3Bat=null;
    try{this.m3RearHead?.destroy()}catch{}this.m3RearHead=null;
    try{this.playerImage?.clearCrop()}catch{}
    return oldCleanup?.apply(this,args);
  };
})();