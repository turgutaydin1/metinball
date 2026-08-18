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

  function outfit(id){
    if(id==='zeko') return {shirt:0xe8e8e4,pants:0xb8a079,hair:0x5c4637};
    if(id==='nafi') return {shirt:0x495a68,pants:0x26313a,hair:0x342a24};
    if(id==='baki') return {shirt:0x17191c,pants:0x111317,hair:0x2d2927};
    return {shirt:0x174f79,pants:0x1c2632,hair:0x2c241f};
  }

  const oldCreatePlayer=GameScene.prototype.createPlayer;
  GameScene.prototype.createPlayer=function(withWeapon=false){
    const out=oldCreatePlayer.call(this,withWeapon);
    if(this.selectedMission!==3) return out;
    const w=this.scale.width,h=this.scale.height;
    try{this.playerImage?.setVisible(false)}catch{}
    try{this.weaponPivot?.setVisible(false)}catch{}
    const ph=phone()?h*.145:205;
    const c=outfit(this.selected.id);
    const back=this.add.container(0,-ph*.42);
    const g=this.add.graphics();
    // Arkadan görünen kafa, saç, gövde, kollar ve bacaklar.
    g.fillStyle(0xd9a879,1);g.fillCircle(0,-ph*.37,ph*.105);
    g.fillStyle(c.hair,1);g.fillEllipse(0,-ph*.405,ph*.20,ph*.105);
    g.fillStyle(c.shirt,1);g.fillRoundedRect(-ph*.14,-ph*.29,ph*.28,ph*.31,ph*.055);
    g.fillStyle(c.shirt,1);g.fillRoundedRect(-ph*.215,-ph*.255,ph*.085,ph*.27,ph*.04);g.fillRoundedRect(ph*.13,-ph*.255,ph*.085,ph*.27,ph*.04);
    g.fillStyle(c.pants,1);g.fillRoundedRect(-ph*.115,0,ph*.10,ph*.31,ph*.035);g.fillRoundedRect(ph*.015,0,ph*.10,ph*.31,ph*.035);
    g.fillStyle(0x171717,1);g.fillRoundedRect(-ph*.13,ph*.27,ph*.13,ph*.055,ph*.025);g.fillRoundedRect(0,ph*.27,ph*.13,ph*.055,ph*.025);
    back.add(g);
    this.player.add(back);this.player.sendToBack(back);this.m3BackFigure=back;
    this.playerLabel?.setText(this.selected.name).setY(phone()?h*.008:2);

    // Sopa sağ elde, normalde yukarı-geride; vuruşta baş üstünden aşağı iner.
    const bat=this.add.container(ph*.13,-ph*.68);
    const bg=this.add.graphics();
    bg.fillStyle(0x70401f,1);bg.fillRoundedRect(-ph*.028,-ph*.40,ph*.056,ph*.43,ph*.028);
    bg.fillStyle(0xa86e36,1);bg.fillRoundedRect(-ph*.040,-ph*.43,ph*.080,ph*.13,ph*.035);
    bg.lineStyle(Math.max(1,ph*.008),0x3a2113,.85);bg.strokeRoundedRect(-ph*.028,-ph*.40,ph*.056,ph*.43,ph*.028);
    bat.add(bg);bat.setRotation(.30);this.player.add(bat);this.player.bringToTop(bat);
    this.m3Bat=bat;this.m3BatRest=.30;this.m3LastSwing=0;this.m3PlayerH=ph;
    this.playerBaseY=phone()?h*.91:h-48;this.player.y=this.playerBaseY;this.playerShadow?.setY(this.playerBaseY+10);
    return out;
  };

  const oldConfigure=GameScene.prototype.configureMissionHud;
  GameScene.prototype.configureMissionHud=function(...args){
    const out=oldConfigure.apply(this,args);
    if(this.selectedMission===3){
      this.titleText?.setText('GÖREV 3 • METİN’İ DELİĞİNE GERİ SOK');
      this.targetText?.setText('Metin çıkınca kafasına sopayla vur.');
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
    const w=this.scale.width,h=this.scale.height;
    const xs=[w*.19,w*.50,w*.81],y=phone()?h*.48:h*.46;
    const holeW=phone()?w*.235:170,holeH=phone()?h*.036:30;
    for(const x of xs){
      const shadow=this.add.ellipse(x,y+holeH*.28,holeW*.94,holeH*1.45,0x000000,.28).setDepth(6);
      const rim=this.add.ellipse(x,y,holeW,holeH*1.65,0x744d2f,1).setDepth(7);
      const dark=this.add.ellipse(x,y+holeH*.06,holeW*.82,holeH,0x160d08,1).setDepth(10);
      this.m3Holes.push({x,y,rim,dark,shadow,busy:false});
    }
  };

  GameScene.prototype.startMission3=function(){
    this.m3BuildHoles();this.m3Whacks=[];
    this.spawnEvent=this.time.addEvent({delay:1180,loop:true,callback:()=>this.m3SpawnMetin()});
  };

  GameScene.prototype.m3SpawnMetin=function(){
    if(!this.started||this.gameOver||this.pausedByMenu||!this.m3Holes?.length)return;
    const max=this.phase===3?2:1;if((this.m3Whacks||[]).filter(t=>!t.resolved).length>=max)return;
    const free=this.m3Holes.filter(x=>!x.busy);if(!free.length)return;
    const hole=Phaser.Utils.Array.GetRandom(free);hole.busy=true;
    const w=this.scale.width,h=this.scale.height,roll=Math.random();
    const kind=roll<.11?'gold':roll<.25?'fast':'normal',frame=kind==='gold'?1:Phaser.Math.Between(0,3);
    const mh=phone()?h*.12:132;
    const sprite=this.add.image(hole.x,hole.y+mh*.47,'miniSheet',frame).setDisplaySize(mh*.67,mh).setDepth(9);
    if(kind==='gold')sprite.setTint(0xffe08a);
    const badge=this.add.text(hole.x,hole.y-mh*.58,kind==='gold'?'ALTIN':kind==='fast'?'HIZLI':'METİN',{fontFamily:'Arial Black, Arial',fontSize:phone()?`${Math.max(8,Math.round(w*.020))}px`:'10px',color:'#fff',backgroundColor:kind==='gold'?'#9b7416':kind==='fast'?'#9b4930':'#7e3038',padding:{x:4,y:2}}).setOrigin(.5).setDepth(11).setAlpha(0);
    const t={hole,sprite,badge,kind,resolved:false,exposed:false,expireAt:0,marked:false};this.m3Whacks.push(t);
    const riseY=hole.y-mh*.39,rise=kind==='fast'?130:175;
    this.tweens.add({targets:sprite,y:riseY,duration:rise,ease:'Quad.easeOut',onComplete:()=>{
      if(t.resolved)return;t.exposed=true;badge.setAlpha(1).setPosition(hole.x,riseY-mh*.56);
      t.expireAt=this.time.now+(kind==='fast'?760:kind==='gold'?1120:980);
    }});
  };

  GameScene.prototype.m3Blood=function(x,y){
    const n=phone()?13:18;
    const flash=this.add.circle(x,y,phone()?8:10,0xd12430,.82).setDepth(72);
    this.tweens.add({targets:flash,scale:1.8,alpha:0,duration:180,onComplete:()=>flash.destroy()});
    for(let i=0;i<n;i++){
      const r=Phaser.Math.Between(phone()?2:3,phone()?5:7),d=this.add.circle(x,y,r,i%3===0?0x6e0d15:0xc91f2d,.92).setDepth(73);
      this.tweens.add({targets:d,x:x+Phaser.Math.Between(-55,55),y:y+Phaser.Math.Between(-45,38),alpha:0,scale:.35,duration:300+Phaser.Math.Between(0,170),ease:'Quad.easeOut',onComplete:()=>d.destroy()});
    }
  };

  GameScene.prototype.m3SwingBat=function(target,hit){
    const now=this.time.now;if(now-(this.m3LastSwing||0)<150)return false;this.m3LastSwing=now;
    const x=target?.hole?.x??target?.worldX??this.player.x;
    const arrive=()=>{
      if(!this.m3Bat)return;
      this.tweens.killTweensOf(this.m3Bat);this.m3Bat.setRotation(this.m3BatRest??.30);
      this.tweens.add({targets:this.m3Bat,rotation:-1.72,duration:115,hold:35,yoyo:true,ease:'Quad.easeIn',onYoyo:()=>{
        if(hit&&target&&!target.resolved)this.m3HitTarget(target,true);
      }});
    };
    if(this.player){
      const dist=Math.abs(this.player.x-x);const dur=Math.min(150,55+dist*.12);
      this.tweens.killTweensOf(this.player);this.tweens.add({targets:this.player,x,duration:dur,ease:'Quad.easeOut',onComplete:arrive});
      if(this.playerShadow){this.tweens.killTweensOf(this.playerShadow);this.tweens.add({targets:this.playerShadow,x,duration:dur,ease:'Quad.easeOut'});}
    }else arrive();
    return true;
  };

  GameScene.prototype.m3HitTarget=function(t,fromSwing=false){
    if(!t||t.resolved||!t.exposed)return;
    t.resolved=true;t.exposed=false;t.hole.busy=false;
    this.caught++;this.hits++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);
    let earned=t.kind==='gold'?75:t.kind==='fast'?40:28;earned+=Math.min(this.combo*3,36);if(this.selected.id==='baki')earned=Math.round(earned*1.15);this.score+=earned;
    const headY=t.sprite.y-t.sprite.displayHeight*.34;
    this.m3Blood(t.sprite.x,headY);
    if(this.soundOn)this.sound.play('catch',{volume:.38});
    this.pop(t.sprite.x,headY,`PAT! +${earned}`,'#ffadb5','#3a0b0f');
    t.badge?.destroy();
    this.tweens.add({targets:t.sprite,y:t.hole.y+t.sprite.displayHeight*.48,scaleX:t.sprite.scaleX*.86,scaleY:t.sprite.scaleY*.72,duration:190,ease:'Back.easeIn',onComplete:()=>{try{t.sprite.destroy()}catch{}}});
    this.updateHud();
  };

  GameScene.prototype.m3TryHit=function(pointer){
    if(this.selectedMission!==3||!this.started||this.gameOver||this.pausedByMenu)return;
    this.shots++;
    let best=null,bestD=1e9;
    for(const t of this.m3Whacks||[]){
      if(!t?.sprite?.active||t.resolved||!t.exposed||t.marked)continue;
      const dx=pointer.worldX-t.hole.x,dy=pointer.worldY-t.hole.y,d=dx*dx+dy*dy;
      const radius=Math.max(t.sprite.displayWidth*.9,phone()?this.scale.width*.12:90);
      if(d<radius*radius&&d<bestD){best=t;bestD=d;}
    }
    if(best){best.marked=true;this.m3SwingBat(best,true);}else{this.combo=0;this.comboText?.setText('');this.m3SwingBat(pointer,false);this.updateHud();}
  };

  GameScene.prototype.updateMission3=function(){
    if(!this.m3Whacks)return;
    for(let i=this.m3Whacks.length-1;i>=0;i--){
      const t=this.m3Whacks[i];if(!t||t.resolved)continue;
      if(t.exposed&&t.expireAt&&this.time.now>=t.expireAt&&!t.marked){
        t.exposed=false;t.resolved=true;t.hole.busy=false;this.missed++;this.combo=0;
        if(this.soundOn)this.sound.play('miss',{volume:.28});
        t.badge?.destroy();
        this.tweens.add({targets:t.sprite,y:t.hole.y+t.sprite.displayHeight*.48,duration:150,ease:'Quad.easeIn',onComplete:()=>{try{t.sprite.destroy()}catch{}}});
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
    if(this.spawnEvent)this.spawnEvent.delay=n===1?1180:n===2?930:760;
    this.phaseText?.setText(n===1?'3 DELİK • BAŞLANGIÇ':n===2?'3 DELİK • HIZLANIYOR':'3 DELİK • FİNAL');
  };

  const oldFinish=GameScene.prototype.finishMissionByTime;
  GameScene.prototype.finishMissionByTime=function(){if(this.selectedMission!==3)return oldFinish.apply(this,arguments);if(this.gameOver)return;this.missionSuccess=this.caught>=20&&this.missed<=5;return this.finishMission();};

  const oldCleanup=GameScene.prototype.cleanupMissionObjects;
  GameScene.prototype.cleanupMissionObjects=function(...args){
    if(this.m3Whacks){for(const t of this.m3Whacks){try{t.sprite?.destroy()}catch{}try{t.badge?.destroy()}catch{}}this.m3Whacks=[];}
    if(this.m3Holes){for(const h of this.m3Holes){try{h.rim?.destroy()}catch{}try{h.dark?.destroy()}catch{}try{h.shadow?.destroy()}catch{}}this.m3Holes=[];}
    try{this.m3Bat?.destroy()}catch{}try{this.m3BackFigure?.destroy()}catch{}this.m3Bat=null;this.m3BackFigure=null;
    return oldCleanup?.apply(this,args);
  };
})();