(() => {
  if (typeof GameScene === 'undefined') return;
  const phone=()=>((('ontouchstart' in window)||navigator.maxTouchPoints>0)&&Math.min(window.innerWidth,window.innerHeight)<900);

  // Görünen görev yapısı: 1, 2, yeni 3 ve eski Boss (iç kimliği 5, ekranda 4).
  const oldCreate=GameScene.prototype.create;
  GameScene.prototype.create=function(data={}){
    this.missions=[
      {id:1,title:'METİN YAĞMURU',verb:'YAKALA',subtitle:'Düşen Metinleri yakala, tuzaklardan kaç.',duration:75},
      {id:2,title:'SİLAHLI METİN BASKINI',verb:'VUR',subtitle:'Silahlı hedefleri vur. Silahsız Metinlere ateş etme.',duration:70},
      {id:3,title:'METİNİN İNTİKAMI',verb:'KES',subtitle:'Turgut, Zeko, Nafi ve Baki düşerken Metin kılıcıyla onları yakala.',duration:70},
      {id:5,title:'BÜYÜK METİN',verb:'BOSS',subtitle:'Büyük Metin ve gönderdiği minyonlara karşı son savaş.',duration:90,displayId:4}
    ];
    if(Number(data?.missionId)===4) data={...data,missionId:5};
    try{if(localStorage.getItem('metinballMission')==='4')localStorage.setItem('metinballMission','5')}catch{}
    return oldCreate.call(this,data);
  };

  // Görev 3'te oyuncu artık METİN ve elinde kılıç var.
  const oldCreatePlayer=GameScene.prototype.createPlayer;
  GameScene.prototype.createPlayer=function(withWeapon=false){
    if(this.selectedMission!==3) return oldCreatePlayer.call(this,withWeapon);
    const w=this.scale.width,h=this.scale.height;
    const ph=phone()?h*.14:210;
    this.playerAnimToken++;
    this.playerLean=0;this.playerMoving=false;this.weaponPivot=null;this.weaponGun=null;
    this.playerShadow=this.add.ellipse(w/2,h-(phone()?h*.045:47),phone()?w*.17:136,phone()?h*.018:23,0x000000,.38).setDepth(9);
    this.player=this.add.container(w/2,h-(phone()?h*.055:38)).setDepth(20);
    this.playerBaseY=this.player.y;
    this.playerImage=this.add.image(0,-ph*.46,'miniSheet',0).setDisplaySize(ph*.67,ph);
    this.playerBaseScaleX=this.playerImage.scaleX;this.playerBaseScaleY=this.playerImage.scaleY;
    this.playerLabel=this.add.text(0,phone()?h*.012:-1,'METİN',{fontFamily:'Arial Black, Arial',fontSize:phone()?`${Math.max(9,Math.round(w*.028))}px`:'12px',color:'#ffd166',backgroundColor:'#071725',padding:{x:7,y:3}}).setOrigin(.5);
    this.player.add([this.playerImage,this.playerLabel]);

    const sword=this.add.container(ph*.18,-ph*.62);
    const g=this.add.graphics();
    g.fillStyle(0xd9e2e8,1);g.fillTriangle(0,-8,9,-72,18,-8);g.fillStyle(0xffffff,.75);g.fillTriangle(7,-13,10,-63,13,-13);
    g.fillStyle(0xc99c47,1);g.fillRoundedRect(-8,-4,34,7,3);g.fillStyle(0x5a3824,1);g.fillRoundedRect(7,2,8,33,3);g.fillStyle(0xd9b45a,1);g.fillCircle(11,38,7);
    sword.add(g);sword.setRotation(.35);this.player.add(sword);this.swordPivot=sword;
    this.revengeItems=[];this.lastSwordAt=0;this.swordActiveUntil=0;
  };

  const oldConfigure=GameScene.prototype.configureMissionHud;
  GameScene.prototype.configureMissionHud=function(...args){
    const out=oldConfigure.apply(this,args);
    if(this.selectedMission===3){
      this.titleText?.setText('GÖREV 3 • METİNİN İNTİKAMI');
      this.targetText?.setText('Düşen Turgut, Zeko, Nafi ve Baki’yi kılıçla kes.');
      this.countText?.setText('KESİLEN  0');this.phaseText?.setText('İNTİKAM • BAŞLANGIÇ');this.accuracyText?.setText('ORAN  %100');
      this.controlsText?.setText(phone()?'Sürükle: hareket • Dokun: kılıç':'Mouse: hareket • SOL TIK / SPACE: kılıç • P/ESC: durdur');
      this.missionText?.setText('GÖREV 3\n[ ] 22 karakter kes\n[ ] x10 kombo\n[ ] En fazla 5 kaçır');
    }
    return out;
  };

  GameScene.prototype.startMission3=function(){
    this.revengeItems=[];this.spawnEvent=this.time.addEvent({delay:900,loop:true,callback:()=>this.spawnRevengeHero()});
  };
  GameScene.prototype.spawnRevengeHero=function(){
    if(!this.started||this.gameOver||this.pausedByMenu)return;
    const max=this.phase===1?5:this.phase===2?7:9;if(this.revengeItems.length>=max)return;
    const hero=Phaser.Utils.Array.GetRandom(this.characters.filter(c=>['turgut','zeko','nafi','baki'].includes(c.id)));
    const h=this.scale.height,w=this.scale.width;
    const targetH=phone()?h*.105:155;
    const x=Phaser.Math.Between(Math.round(w*.09),Math.round(w*.91));
    const sprite=this.add.sprite(x,-targetH*.6,hero.texture,0).setDisplaySize(targetH*(160/276),targetH).setDepth(12);
    const label=this.add.text(x,-targetH*.6-targetH*.58,hero.name,{fontFamily:'Arial Black, Arial',fontSize:phone()?`${Math.max(8,Math.round(w*.024))}px`:'11px',color:'#fff',backgroundColor:'#8b2f3b',padding:{x:4,y:2}}).setOrigin(.5).setDepth(13);
    const speed=(hero.id==='nafi'?285:hero.id==='baki'?235:hero.id==='zeko'?215:225)+(this.phase-1)*55;
    this.revengeItems.push({hero,sprite,label,speed,spin:Phaser.Math.Between(-18,18),resolved:false});
  };
  GameScene.prototype.updateMission3=function(dt){
    for(let i=this.revengeItems.length-1;i>=0;i--){
      const it=this.revengeItems[i];if(!it?.sprite?.active||it.resolved)continue;
      it.sprite.y+=it.speed*dt;it.sprite.angle+=it.spin*dt;it.label?.setPosition(it.sprite.x,it.sprite.y-it.sprite.displayHeight*.58);
      const swordY=this.player.y-(phone()?this.scale.height*.10:120);
      const dx=Math.abs(it.sprite.x-this.player.x),dy=Math.abs(it.sprite.y-swordY);
      const reach=phone()?this.scale.width*.13:105;
      const vert=phone()?this.scale.height*.09:95;
      if(this.time.now<this.swordActiveUntil&&dx<reach&&dy<vert){this.cutRevengeHero(i);continue;}
      if(it.sprite.y-it.sprite.displayHeight*.5>this.scale.height){
        it.resolved=true;this.missed++;this.combo=0;this.comboText?.setText('');
        if(this.soundOn)this.sound.play('miss',{volume:.32});
        this.pop(it.sprite.x,this.scale.height*.82,'KAÇTI','#ff7582','#2a0609');
        it.sprite.destroy();it.label?.destroy();this.revengeItems.splice(i,1);this.updateHud();
      }
    }
  };
  GameScene.prototype.swingSword=function(){
    if(this.selectedMission!==3||!this.started||this.gameOver||this.pausedByMenu)return;
    const now=this.time.now;if(now-this.lastSwordAt<230)return;this.lastSwordAt=now;this.swordActiveUntil=now+165;
    if(this.swordPivot){this.tweens.killTweensOf(this.swordPivot);this.swordPivot.setRotation(.45);this.tweens.add({targets:this.swordPivot,rotation:-1.05,duration:90,yoyo:true,ease:'Quad.easeOut'});}
    if(this.soundOn)this.sound.play('catch',{volume:.28});
  };
  GameScene.prototype.cutRevengeHero=function(index){
    const it=this.revengeItems[index];if(!it||it.resolved)return;it.resolved=true;
    this.caught++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);
    const base=it.hero.id==='baki'?45:it.hero.id==='nafi'?38:it.hero.id==='zeko'?30:34;
    const earned=base+Math.min(this.combo*3,45);this.score+=earned;
    this.pop(it.sprite.x,it.sprite.y,`KESİLDİ +${earned}`,'#ffd166','#2b1800');
    this.arcadeBurst?.(it.sprite.x,it.sprite.y,0xffd166);
    this.tweens.add({targets:it.sprite,angle:it.sprite.angle+120,y:it.sprite.y-35,alpha:0,scaleX:it.sprite.scaleX*.55,scaleY:it.sprite.scaleY*.55,duration:220,onComplete:()=>it.sprite.destroy()});
    this.tweens.add({targets:it.label,alpha:0,y:it.label.y-25,duration:180,onComplete:()=>it.label?.destroy()});
    this.revengeItems.splice(index,1);this.updateHud();
  };

  // Yeni görev için dokunma/tıklama ile kılıç. Mevcut hareket ve ateş kontrollerine dokunmaz.
  const oldRegister=GameScene.prototype.registerInput;
  GameScene.prototype.registerInput=function(...args){
    const out=oldRegister.apply(this,args);
    try{this.keys.SPACE=this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);this.input.keyboard.on('keydown-SPACE',()=>this.swingSword())}catch{}
    this.input.on('pointerdown',p=>{if(this.selectedMission===3){if(this.player)this.movePlayer(p.worldX);this.swingSword();}});
    return out;
  };

  const oldHud=GameScene.prototype.updateHud;
  GameScene.prototype.updateHud=function(...args){
    const out=oldHud.apply(this,args);
    if(this.selectedMission===3){
      const acc=this.getAccuracy();this.countText?.setText(`KESİLEN  ${this.caught}`);this.accuracyText?.setText(`ORAN  %${acc}`);
      const a=this.caught>=22?'[✓]':'[ ]',b=this.bestCombo>=10?'[✓]':'[ ]',c=this.missed<=5?'[✓]':'[ ]';
      this.missionText?.setText(`GÖREV 3\n${a} 22 karakter kes\n${b} x10 kombo\n${c} En fazla 5 kaçır`);
    }
    return out;
  };

  const oldDifficulty=GameScene.prototype.updateTimedDifficulty;
  GameScene.prototype.updateTimedDifficulty=function(...args){
    const out=oldDifficulty.apply(this,args);
    if(this.selectedMission===3&&this.spawnEvent){this.spawnEvent.delay=this.phase===1?900:this.phase===2?720:560;this.phaseText?.setText(this.phase===1?'İNTİKAM • BAŞLANGIÇ':this.phase===2?'İNTİKAM • HIZLANIYOR':'İNTİKAM • FİNAL');}
    return out;
  };

  const oldFinishTime=GameScene.prototype.finishMissionByTime;
  GameScene.prototype.finishMissionByTime=function(){
    if(this.selectedMission===3){if(this.gameOver)return;this.missionSuccess=this.caught>=22&&this.missed<=5;return this.finishMission();}
    return oldFinishTime.apply(this,arguments);
  };

  const oldCleanup=GameScene.prototype.cleanupMissionObjects;
  GameScene.prototype.cleanupMissionObjects=function(...args){
    if(this.revengeItems){for(const it of this.revengeItems){try{it.sprite?.destroy()}catch{}try{it.label?.destroy()}catch{}}this.revengeItems=[];}
    return oldCleanup?.apply(this,args);
  };

  // Görsel numaralandırma: iç kimliği 5 olan Boss ekranda Görev 4 görünür.
  const patchTexts=scene=>{
    for(const o of (scene.activeOverlay||[])){
      if(typeof o?.text!=='string')continue;
      let s=o.text.replace(/5 GÖREV/g,'4 GÖREV').replace(/GÖREVLER \(5\)/g,'GÖREVLER (4)').replace(/^05$/,'04').replace(/GÖREV 5/g,'GÖREV 4').replace(/\/15 ★/g,'/12 ★');
      if(scene.selectedMission===3)s=s.replace(/Yakalanan/g,'Kesilen').replace(/YAKALANAN/g,'KESİLEN');
      if(o.text!==s)o.setText(s);
    }
  };
  for(const name of ['showMainMenu','showMissionSelect','showCareer','showMissionResult']){
    const old=GameScene.prototype[name];if(typeof old!=='function')continue;
    GameScene.prototype[name]=function(...args){const out=old.apply(this,args);patchTexts(this);return out;};
  }

  // Boss içte 5 kalır; sonuçtan sonra sonraki görev zaten Görev 1'dir.
})();
