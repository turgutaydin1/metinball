(() => {
  if (typeof GameScene === 'undefined') return;

  const REVENGE_ID = 99;
  const REVENGE = {
    id: REVENGE_ID,
    title: 'METİNİN İNTİKAMI',
    verb: 'KES',
    subtitle: 'Turgut, Zeko, Nafi ve Baki düşerken Metin kılıcıyla onları kes.',
    duration: 70
  };
  const phone = () => ((('ontouchstart' in window) || navigator.maxTouchPoints > 0) && Math.min(window.innerWidth, window.innerHeight) < 900);

  // Eski 3 ve 4 numaralı oyunlar görev listesinden çıkarıldı. Metin'in İntikamı ayrı moddur.
  const oldCreate = GameScene.prototype.create;
  GameScene.prototype.create = function(data = {}) {
    this.missions = [
      {id:1,title:'METİN YAĞMURU',verb:'YAKALA',subtitle:'Düşen Metinleri yakala, tuzaklardan kaç.',duration:75},
      {id:2,title:'SİLAHLI METİN BASKINI',verb:'VUR',subtitle:'Silahlı hedefleri vur. Silahsız Metinlere ateş etme.',duration:70},
      {id:5,title:'BÜYÜK METİN',verb:'BOSS',subtitle:'Büyük Metin ve gönderdiği minyonlara karşı son savaş.',duration:90}
    ];
    try {
      const saved = Number(localStorage.getItem('metinballMission') || 1);
      if (saved === 3 || saved === 4 || saved === REVENGE_ID) localStorage.setItem('metinballMission','1');
    } catch {}

    const revengeStart = Boolean(data?.revengeMode);
    const cleanData = revengeStart ? {} : data;
    const out = oldCreate.call(this, cleanData);
    if (revengeStart) {
      this.clearOverlay?.();
      this.startRevengeMode();
    }
    return out;
  };

  const oldCurrentMission = GameScene.prototype.currentMission;
  GameScene.prototype.currentMission = function() {
    if (this.selectedMission === REVENGE_ID) return REVENGE;
    return oldCurrentMission.apply(this, arguments);
  };

  GameScene.prototype.startRevengeMode = function() {
    if (this.started) return;
    this.selectedMission = REVENGE_ID;
    this.startSelectedMission();
  };

  // Metin'in İntikamı modunda oyuncu daima Metin'dir. Seçili karakter bu modu değiştiremez.
  const oldCreatePlayer = GameScene.prototype.createPlayer;
  GameScene.prototype.createPlayer = function(withWeapon = false) {
    if (this.selectedMission !== REVENGE_ID) return oldCreatePlayer.call(this, withWeapon);

    const w = this.scale.width, h = this.scale.height;
    const metinH = phone() ? h * 0.135 : Math.min(205, h * 0.24);
    this.playerAnimToken++;
    this.playerLean = 0;
    this.playerMoving = false;
    this.weaponPivot = null;
    this.weaponGun = null;
    this.crosshair = null;

    this.playerShadow = this.add.ellipse(w/2, h - h*0.045, phone()?w*0.15:118, phone()?h*0.015:20, 0x000000, 0.38).setDepth(9);
    this.player = this.add.container(w/2, h - h*0.055).setDepth(20);
    this.playerBaseY = this.player.y;

    this.playerImage = this.add.image(0, -metinH*0.47, 'miniSheet', 0).setDisplaySize(metinH*0.67, metinH);
    this.playerBaseScaleX = this.playerImage.scaleX;
    this.playerBaseScaleY = this.playerImage.scaleY;
    this.playerLabel = this.add.text(0, phone()?h*0.009:-1, 'METİN', {
      fontFamily:'Arial Black, Arial', fontSize:phone()?`${Math.max(9,Math.round(w*0.026))}px`:'12px',
      color:'#ffd166', backgroundColor:'#071725', padding:{x:7,y:3}
    }).setOrigin(0.5);
    this.player.add([this.playerImage, this.playerLabel]);

    // Kılıç karaktere oranlıdır; mobilde dev görünmez ve saldırı dışında yanda bekler.
    const sword = this.add.container(metinH*0.18, -metinH*0.50);
    const g = this.add.graphics();
    g.fillStyle(0xd9e2e8,1); g.fillTriangle(0,-5,8,-72,16,-5);
    g.fillStyle(0xffffff,0.72); g.fillTriangle(6,-10,9,-62,12,-10);
    g.fillStyle(0xc99c47,1); g.fillRoundedRect(-8,-3,32,6,3);
    g.fillStyle(0x5a3824,1); g.fillRoundedRect(6,2,8,30,3);
    g.fillStyle(0xd9b45a,1); g.fillCircle(10,35,6);
    sword.add(g);
    sword.setScale((metinH/205) * (phone()?0.72:0.88));
    sword.setRotation(0.72);
    this.player.add(sword);
    this.swordPivot = sword;
    this.swordRestRotation = 0.72;
    this.revengeMetinH = metinH;
    this.revengeItems = [];
    this.lastSwordAt = 0;
    this.swordActiveUntil = 0;
  };

  const oldConfigure = GameScene.prototype.configureMissionHud;
  GameScene.prototype.configureMissionHud = function(...args) {
    const out = oldConfigure.apply(this,args);
    if (this.selectedMission === REVENGE_ID) {
      this.titleText?.setText('METİNİN İNTİKAMI');
      this.targetText?.setText('Turgut, Zeko, Nafi ve Baki düşerken kılıçla kes.');
      this.countText?.setText('KESİLEN  0');
      this.phaseText?.setText('İNTİKAM • BAŞLANGIÇ');
      this.accuracyText?.setText('ORAN  %100');
      this.controlsText?.setText(phone() ? 'Sürükle: Metin’i hareket ettir • Dokun: kılıç savur' : 'Mouse: hareket • SOL TIK / SPACE: kılıç • P/ESC: durdur');
      this.missionText?.setText('METİNİN İNTİKAMI\n[ ] 18 karakter kes\n[ ] x8 kombo\n[ ] En fazla 5 kaçır');
    }
    return out;
  };

  // Ayrı modun geri sayımı: ekranda hiçbir yerde Görev 3/99 yazmaz.
  const oldCountdown = GameScene.prototype.countdown;
  GameScene.prototype.countdown = function() {
    if (this.selectedMission !== REVENGE_ID) return oldCountdown.apply(this, arguments);
    const w=this.scale.width,h=this.scale.height;
    const overlay=this.add.rectangle(w/2,h/2,w,h,0x000000,0.30).setDepth(85);
    const missionName=this.add.text(w/2,h/2-h*0.14,'METİNİN İNTİKAMI',{fontFamily:'Arial Black, Arial',fontSize:phone()?`${Math.max(17,Math.round(w*.055))}px`:'26px',color:'#ffd166'}).setOrigin(.5).setDepth(86);
    const label=this.add.text(w/2,h/2,'3',{fontFamily:'Arial Black, Arial',fontSize:phone()?`${Math.max(58,Math.round(w*.20))}px`:'92px',color:'#fff',stroke:'#10263a',strokeThickness:8}).setOrigin(.5).setDepth(86);
    const steps=['3','2','1','İNTİKAM!']; let i=0;
    const next=()=>{
      label.setText(steps[i]); label.setScale(1.22);
      if(this.soundOn) this.sound.play(i<3?'countdown':'start',{volume:i<3?.30:.42});
      this.tweens.add({targets:label,scale:1,duration:190}); i++;
      if(i<steps.length) this.time.delayedCall(560,next);
      else this.time.delayedCall(420,()=>{overlay.destroy();missionName.destroy();label.destroy();this.startMissionLogic();});
    };
    next();
  };

  GameScene.prototype.startRevenge = function() {
    this.revengeItems=[];
    this.spawnEvent=this.time.addEvent({delay:1350,loop:true,callback:()=>this.spawnRevengeHero()});
  };

  GameScene.prototype.spawnRevengeHero = function() {
    if(!this.started||this.gameOver||this.pausedByMenu)return;
    const max=this.phase===1?3:this.phase===2?4:5;
    if(this.revengeItems.length>=max)return;
    const pool=this.characters.filter(c=>['turgut','zeko','nafi','baki'].includes(c.id));
    const hero=Phaser.Utils.Array.GetRandom(pool);
    const h=this.scale.height,w=this.scale.width;
    const heroH=phone()?h*.092:Math.min(145,h*.17);
    const x=Phaser.Math.Between(Math.round(w*.10),Math.round(w*.90));
    const sprite=this.add.sprite(x,-heroH*.60,hero.texture,0).setDisplaySize(heroH*(160/276),heroH).setDepth(12);
    const label=this.add.text(x,-heroH*1.16,hero.name,{fontFamily:'Arial Black, Arial',fontSize:phone()?`${Math.max(8,Math.round(w*.021))}px`:'10px',color:'#fff',backgroundColor:'#8b2f3b',padding:{x:4,y:2}}).setOrigin(.5).setDepth(13);

    // Başlangıçta belirgin biçimde yavaş; yalnız son evrelerde kontrollü hızlanır.
    const base=phone()?h*.155:132;
    const heroMul=hero.id==='nafi'?1.14:hero.id==='baki'?0.96:hero.id==='zeko'?0.91:1.0;
    const phaseMul=this.phase===1?1:this.phase===2?1.13:1.27;
    const speed=base*heroMul*phaseMul;
    this.revengeItems.push({hero,sprite,label,speed,spin:Phaser.Math.Between(-8,8),resolved:false});
  };

  GameScene.prototype.revengeSwordHits = function() {
    if(this.selectedMission!==REVENGE_ID || this.time.now>=this.swordActiveUntil || !this.player)return;
    const ph=this.revengeMetinH || (phone()?this.scale.height*.135:205);
    const reachX=phone()?Math.max(this.scale.width*.18,68):125;
    const attackTop=this.player.y-ph*1.18;
    const attackBottom=this.player.y-ph*.10;
    for(let i=this.revengeItems.length-1;i>=0;i--){
      const it=this.revengeItems[i]; if(!it?.sprite?.active||it.resolved)continue;
      const dx=Math.abs(it.sprite.x-this.player.x);
      const heroBottom=it.sprite.y+it.sprite.displayHeight*.43;
      const heroTop=it.sprite.y-it.sprite.displayHeight*.43;
      if(dx<=reachX && heroBottom>=attackTop && heroTop<=attackBottom) this.cutRevengeHero(i);
    }
  };

  GameScene.prototype.updateRevenge = function(dt) {
    const ph=this.revengeMetinH || (phone()?this.scale.height*.135:205);
    for(let i=this.revengeItems.length-1;i>=0;i--){
      const it=this.revengeItems[i];if(!it?.sprite?.active||it.resolved)continue;
      it.sprite.y+=it.speed*dt;
      it.sprite.angle+=it.spin*dt;
      it.label?.setPosition(it.sprite.x,it.sprite.y-it.sprite.displayHeight*.58);
    }
    this.revengeSwordHits();
    for(let i=this.revengeItems.length-1;i>=0;i--){
      const it=this.revengeItems[i];if(!it?.sprite?.active||it.resolved)continue;
      // Oyuncunun hizasını geçene kadar kesilebilir; erken kaybolmaz.
      if(it.sprite.y-it.sprite.displayHeight*.48 > this.player.y+ph*.10){
        it.resolved=true;this.missed++;this.combo=0;this.comboText?.setText('');
        if(this.soundOn)this.sound.play('miss',{volume:.30});
        this.pop(it.sprite.x,this.player.y-ph*.65,'KAÇTI','#ff7582','#2a0609');
        it.sprite.destroy();it.label?.destroy();this.revengeItems.splice(i,1);this.updateHud();
      }
    }
  };

  GameScene.prototype.swingSword = function() {
    if(this.selectedMission!==REVENGE_ID||!this.started||this.gameOver||this.pausedByMenu)return;
    const now=this.time.now;if(now-this.lastSwordAt<260)return;
    this.lastSwordAt=now;this.swordActiveUntil=now+255;
    if(this.swordPivot){
      this.tweens.killTweensOf(this.swordPivot);
      this.swordPivot.setRotation(this.swordRestRotation);
      this.tweens.add({targets:this.swordPivot,rotation:-0.82,duration:115,yoyo:true,hold:35,ease:'Quad.easeOut'});
    }
    // Kısa süreli görsel kesme yayı: gerçek hitbox ile aynı bölgeyi anlatır.
    try{
      const ph=this.revengeMetinH||150;
      const arc=this.add.graphics().setDepth(18);
      arc.lineStyle(phone()?5:7,0xffe08a,.58);
      arc.beginPath();arc.arc(this.player.x,this.player.y-ph*.52,phone()?this.scale.width*.16:112,3.45,5.85,false);arc.strokePath();
      this.tweens.add({targets:arc,alpha:0,duration:170,onComplete:()=>arc.destroy()});
    }catch{}
    if(this.soundOn)this.sound.play('catch',{volume:.25});
    this.revengeSwordHits();
  };

  GameScene.prototype.cutRevengeHero = function(index) {
    const it=this.revengeItems[index];if(!it||it.resolved)return;it.resolved=true;
    this.caught++;this.combo++;this.bestCombo=Math.max(this.bestCombo,this.combo);
    const base=it.hero.id==='baki'?42:it.hero.id==='nafi'?36:it.hero.id==='zeko'?28:32;
    const earned=base+Math.min(this.combo*3,42);this.score+=earned;
    this.pop(it.sprite.x,it.sprite.y,`KESİLDİ +${earned}`,'#ffd166','#2b1800');
    this.arcadeBurst?.(it.sprite.x,it.sprite.y,0xffd166);
    const sprite=it.sprite,label=it.label;
    this.revengeItems.splice(index,1);
    this.tweens.add({targets:sprite,angle:sprite.angle+(sprite.x<this.player.x?-105:105),x:sprite.x+(sprite.x<this.player.x?-38:38),y:sprite.y-24,alpha:0,scaleX:sprite.scaleX*.58,scaleY:sprite.scaleY*.58,duration:235,onComplete:()=>sprite.destroy()});
    this.tweens.add({targets:label,alpha:0,y:label.y-22,duration:180,onComplete:()=>label?.destroy()});
    this.updateHud();
  };

  // Ana update Metin görselini seçili Turgut/Zeko/Nafi/Baki sprite'ına çevirmesin.
  const oldUpdate = GameScene.prototype.update;
  GameScene.prototype.update = function(_time,delta) {
    if(this.selectedMission!==REVENGE_ID) return oldUpdate.apply(this,arguments);
    if(!this.started||this.gameOver||this.pausedByMenu||!this.player)return;
    const dt=Math.min(delta/1000,.045);
    const speed=(phone()?this.scale.width*1.55:760)*dt;
    if(this.cursors?.left?.isDown||this.keys?.A?.isDown)this.movePlayer(this.player.x-speed);
    if(this.cursors?.right?.isDown||this.keys?.D?.isDown)this.movePlayer(this.player.x+speed);
    this.updateRevenge(dt);
  };

  const oldStartLogic = GameScene.prototype.startMissionLogic;
  GameScene.prototype.startMissionLogic = function() {
    if(this.selectedMission!==REVENGE_ID) return oldStartLogic.apply(this,arguments);
    this.started=true;this.startRevenge();
    this.secondEvent=this.time.addEvent({delay:1000,loop:true,callback:()=>{
      if(this.gameOver||this.pausedByMenu)return;
      this.elapsedSeconds++;this.secondsLeft--;this.updateTimer();this.updateTimedDifficulty();
      if(this.secondsLeft<=0)this.finishMissionByTime();
    }});
  };

  // Kılıç girişi mevcut hareket kontrollerinin üstüne eklenir. Seçili karaktere bağlı değildir.
  const oldRegister = GameScene.prototype.registerInput;
  GameScene.prototype.registerInput = function(...args) {
    const out=oldRegister.apply(this,args);
    try{
      this.keys.SPACE=this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
      this.input.keyboard.on('keydown-SPACE',()=>this.swingSword());
    }catch{}
    this.input.on('pointerdown',p=>{
      if(this.selectedMission!==REVENGE_ID||!this.started||this.gameOver||this.pausedByMenu)return;
      if(this.player)this.movePlayer(p.worldX);
      this.swingSword();
    });
    return out;
  };

  const oldHud = GameScene.prototype.updateHud;
  GameScene.prototype.updateHud = function(...args) {
    const out=oldHud.apply(this,args);
    if(this.selectedMission===REVENGE_ID){
      const acc=this.getAccuracy();
      this.countText?.setText(`KESİLEN  ${this.caught}`);
      this.accuracyText?.setText(`ORAN  %${acc}`);
      const a=this.caught>=18?'[✓]':'[ ]',b=this.bestCombo>=8?'[✓]':'[ ]',c=this.missed<=5?'[✓]':'[ ]';
      this.missionText?.setText(`METİNİN İNTİKAMI\n${a} 18 karakter kes\n${b} x8 kombo\n${c} En fazla 5 kaçır`);
    }
    return out;
  };

  const oldDifficulty = GameScene.prototype.updateTimedDifficulty;
  GameScene.prototype.updateTimedDifficulty = function(...args) {
    if(this.selectedMission!==REVENGE_ID)return oldDifficulty.apply(this,args);
    const ratio=this.elapsedSeconds/Math.max(1,REVENGE.duration);
    const next=ratio<.38?1:ratio<.74?2:3;
    if(next!==this.phase){this.phase=next;this.flashMessage(next===2?'İNTİKAM HIZLANIYOR':'İNTİKAM FİNALİ',next===3?'#ffb167':'#ffd166');}
    if(this.spawnEvent)this.spawnEvent.delay=this.phase===1?1350:this.phase===2?1100:900;
    this.phaseText?.setText(this.phase===1?'İNTİKAM • BAŞLANGIÇ':this.phase===2?'İNTİKAM • HIZLANIYOR':'İNTİKAM • FİNAL');
  };

  const oldFinishTime = GameScene.prototype.finishMissionByTime;
  GameScene.prototype.finishMissionByTime = function() {
    if(this.selectedMission!==REVENGE_ID)return oldFinishTime.apply(this,arguments);
    if(this.gameOver)return;
    this.missionSuccess=this.caught>=18&&this.missed<=5;
    return this.finishMission();
  };

  const oldCleanup = GameScene.prototype.cleanupMissionObjects;
  GameScene.prototype.cleanupMissionObjects = function(...args) {
    if(this.revengeItems){for(const it of this.revengeItems){try{it.sprite?.destroy()}catch{}try{it.label?.destroy()}catch{}}this.revengeItems=[];}
    try{this.swordPivot?.destroy()}catch{}
    this.swordPivot=null;
    return oldCleanup?.apply(this,args);
  };

  // Metin'in İntikamı için ayrı sonuç ekranı; görev numarası yoktur.
  const oldResult = GameScene.prototype.showMissionResult;
  GameScene.prototype.showMissionResult = function(accuracy,stars,grade) {
    if(this.selectedMission!==REVENGE_ID)return oldResult.apply(this,arguments);
    this.clearOverlay();
    const w=this.scale.width,h=this.scale.height;
    const color=this.missionSuccess?'#72ff8b':'#ff9aa5';
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.91).setDepth(100);
    const card=this.add.rectangle(w/2,h/2,w*.92,h*.76,0x071725,.997).setStrokeStyle(Math.max(2,w*.005),0x3b7297,.96).setDepth(101);
    const t=this.add.text(w/2,h*.23,'METİNİN İNTİKAMI',{fontFamily:'Arial Black, Arial',fontSize:`${Math.max(20,Math.round(Math.min(w,h)*.055))}px`,color:'#ffd166',align:'center'}).setOrigin(.5).setDepth(102);
    const status=this.add.text(w/2,h*.31,this.missionSuccess?'İNTİKAM TAMAMLANDI':'İNTİKAM YARIM KALDI',{fontFamily:'Arial Black, Arial',fontSize:`${Math.max(16,Math.round(Math.min(w,h)*.038))}px`,color,align:'center'}).setOrigin(.5).setDepth(102);
    const stats=this.add.text(w/2,h*.46,`KESİLEN  ${this.caught}\nKAÇAN  ${this.missed}\nEN İYİ KOMBO  x${this.bestCombo}\nORAN  %${accuracy}\nSKOR  ${this.score.toLocaleString('tr-TR')}`,{fontFamily:'Arial',fontSize:`${Math.max(14,Math.round(Math.min(w,h)*.032))}px`,fontStyle:'bold',color:'#fff',align:'center',lineSpacing:Math.max(5,h*.008)}).setOrigin(.5).setDepth(102);
    const makeBtn=(x,y,label,primary,fn)=>{
      const b=this.add.text(x,y,label,{fontFamily:'Arial Black, Arial',fontSize:`${Math.max(13,Math.round(Math.min(w,h)*.029))}px`,color:primary?'#071725':'#fff',backgroundColor:primary?'#ffd166':'#12334a',fixedWidth:w*.38,align:'center',padding:{x:8,y:10}}).setOrigin(.5).setInteractive({useHandCursor:true}).setDepth(103);
      b.on('pointerdown',fn);return b;
    };
    const again=makeBtn(w*.28,h*.73,'TEKRAR OYNA',true,()=>this.scene.restart({revengeMode:true}));
    const home=makeBtn(w*.72,h*.73,'ANA MENÜ',false,()=>this.scene.restart({}));
    this.activeOverlay=[ov,card,t,status,stats,again,home];
  };

  // Ana menüye ayrı mod butonu ekle. Görevler menüsüne eklenmez.
  const oldMainMenu = GameScene.prototype.showMainMenu;
  GameScene.prototype.showMainMenu = function(...args) {
    const out=oldMainMenu.apply(this,args);
    const w=this.scale.width,h=this.scale.height;
    // Sabit piksel yerine ekran oranı; telefon ve PC'de ayrı mod görünür.
    const y=phone()?h*.78:Math.min(h-48,h*.89);
    const revenge=this.add.text(w/2,y,'METİNİN İNTİKAMI',{fontFamily:'Arial Black, Arial',fontSize:phone()?`${Math.max(13,Math.round(w*.034))}px`:'16px',fontStyle:'bold',color:'#2b1800',backgroundColor:'#ffb347',fixedWidth:phone()?w*.86:350,align:'center',padding:{x:12,y:10}}).setOrigin(.5).setInteractive({useHandCursor:true}).setDepth(96);
    revenge.on('pointerdown',()=>this.startRevengeMode());
    this.activeOverlay?.push(revenge);
    for(const o of (this.activeOverlay||[])){
      if(typeof o?.text!=='string')continue;
      const s=o.text.replace('4 KARAKTER • 5 GÖREV','4 KARAKTER • GÖREVLER + ÖZEL MOD').replace('GÖREVLER (5)','GÖREVLER');
      if(s!==o.text)o.setText(s);
    }
    return out;
  };

  // Kariyer yalnız numaralı görevleri sayar; özel mod ayrı tutulur.
  const oldCareer = GameScene.prototype.showCareer;
  GameScene.prototype.showCareer = function(...args){
    const out=oldCareer.apply(this,args);
    for(const o of (this.activeOverlay||[]))if(typeof o?.text==='string'&&o.text.includes('/15 ★'))o.setText(o.text.replace('/15 ★','/9 ★'));
    return out;
  };
})();
