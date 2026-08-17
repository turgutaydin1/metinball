(() => {
  if (typeof GameScene === 'undefined') return;

  const isPhone = () => (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && Math.min(window.innerWidth, window.innerHeight) < 820;

  // Özel karakter özelliğini tamamen devreden çıkar.
  try {
    localStorage.removeItem('metinballCustomCharacterV1');
    localStorage.removeItem('metinballOpenCharacterAfterReload');
    if (localStorage.getItem('metinballCharacter') === 'custom') localStorage.setItem('metinballCharacter','turgut');
  } catch {}
  GameScene.prototype.installCustomCharacterDefinition = function(){};

  const oldMainMenu = GameScene.prototype.showMainMenu;
  GameScene.prototype.showMainMenu = function(...args){
    const out = oldMainMenu.apply(this,args);
    try {
      // "KENDİ KARAKTERİNİ YÜKLE" düğmesini kaldır.
      const customBtn = this.activeOverlay?.find(o => o?.text === 'KENDİ KARAKTERİNİ YÜKLE');
      customBtn?.destroy();
      this.activeOverlay = (this.activeOverlay||[]).filter(o => o !== customBtn);
      // Alt menüleri yukarı al.
      const career = this.activeOverlay?.find(o => o?.text === 'KARİYER / BAŞARILAR');
      const settings = this.activeOverlay?.find(o => o?.text === 'AYARLAR');
      const exit = this.activeOverlay?.find(o => o?.text === 'ÇIKIŞ');
      if (career) career.y -= 52;
      if (settings) settings.y -= 52;
      if (exit) exit.y -= 52;
      const sub = this.activeOverlay?.find(o => typeof o?.text === 'string' && o.text.includes('KENDİ KARAKTERİNİ YÜKLE'));
      if (sub) sub.setText('v0.20.2 • PORTABLE + GÜNCELLENEBİLİR • 5 GÖREV');
    } catch {}
    return out;
  };

  const oldCharSelect = GameScene.prototype.showCharacterSelect;
  GameScene.prototype.showCharacterSelect = function(...args){
    this.characters = (this.characters||[]).filter(c => c.id !== 'custom');
    if (!this.selected || this.selected.id === 'custom') this.selected = this.characters[0];
    const out = oldCharSelect.apply(this,args);
    try {
      for (const o of [...(this.activeOverlay||[])]) {
        if (typeof o?.text === 'string' && (o.text === 'KARAKTER YÜKLE' || o.text === 'KENDİ KARAKTERİNİ YÜKLE')) {
          o.destroy();
          this.activeOverlay = this.activeOverlay.filter(x => x !== o);
        }
      }
    } catch {}
    return out;
  };

  function text(t,size,x,y,ox=0,oy=0,wrap=0){
    if(!t?.active) return;
    try{ t.setScale(1,1); t.setFontSize(size); t.setPosition(x,y); t.setOrigin(ox,oy); }catch{}
    try{ if(wrap) t.setWordWrapWidth(wrap,true); }catch{}
    try{ t.setResolution?.(Math.max(2,Math.min(3,window.devicePixelRatio||2))); }catch{}
  }

  function applyMobile(scene){
    if(!isPhone() || !scene?.scale) return;
    const w=scene.scale.width, h=scene.scale.height;

    // Üst HUD tek kompakt blok: oyun alanı y=86 civarında başlar.
    try{ scene.topBar?.setPosition(w/2,29).setSize(w,58); }catch{}
    text(scene.titleText,12,w/2,2,.5,0,Math.max(210,w*.64));
    text(scene.scoreText,9.5,10,25,0,0);
    text(scene.timeText,9.5,w-10,25,1,0);
    text(scene.highText,7,10,41,0,0);
    text(scene.errorText,7.5,w-10,41,1,0);
    text(scene.targetText,7,w/2,53,.5,0,w-45);
    text(scene.countText,7.5,8,73,0,.5);
    text(scene.phaseText,7.5,w/2,73,.5,.5,w*.43);
    text(scene.accuracyText,7.5,w-8,73,1,.5);
    text(scene.comboText,9,w/2,92,.5,.5,w-28);
    text(scene.specialText,7.5,w/2,108,.5,.5,w-28);

    // Alt HUD, Safari çubuğundan uzakta.
    if(scene.missionText?.active){
      text(scene.missionText,7.5,8,h-124,0,0,Math.min(158,w*.40));
      try{scene.missionText.setPadding(5,4,5,4).setLineSpacing(0)}catch{}
    }
    text(scene.controlsText,6,w/2,h-31,.5,.5,w-145);
    text(scene.soundButton,7.5,7,h-31,0,.5);
    text(scene.menuButton,7.5,w-7,h-31,1,.5);

    // Oyuncu mobilde masaüstü boyutunun yaklaşık %60'ı.
    if(scene.playerImage?.active){
      try{
        const targetH = Math.min(142, h*.19);
        const ratio = scene.playerImage.displayWidth / Math.max(1,scene.playerImage.displayHeight);
        scene.playerImage.setDisplaySize(targetH*ratio,targetH);
        scene.playerBaseScaleX=scene.playerImage.scaleX;
        scene.playerBaseScaleY=scene.playerImage.scaleY;
        scene.playerIdleTween?.stop?.();
        scene.startPlayerIdleAnimation?.();
      }catch{}
    }
    if(scene.player?.active){
      try{
        const y=h-54;
        scene.playerBaseY=y; scene.player.y=y;
        scene.playerShadow?.setPosition(scene.player.x,h-44).setScale(.76,.72);
      }catch{}
    }
    // Mobilde çarpışma/yakalama genişliği görsel boyutla uyumlu olsun.
    if(scene.selected && !scene.__mobileCatchWidthApplied){
      scene.__desktopCatchWidth = scene.selected.catchWidth;
      scene.selected.catchWidth = Math.max(54, Math.round(scene.selected.catchWidth*.58));
      scene.__mobileCatchWidthApplied=true;
    }
  }

  // Oyuncu yaratıldığı anda küçült: sonradan scale yamalarına güvenme.
  const oldCreatePlayer=GameScene.prototype.createPlayer;
  GameScene.prototype.createPlayer=function(...args){
    const out=oldCreatePlayer.apply(this,args);
    if(isPhone()) this.time?.delayedCall?.(0,()=>applyMobile(this));
    return out;
  };

  function resizeSprite(sprite,targetH){
    if(!sprite?.active) return;
    const r=sprite.displayWidth/Math.max(1,sprite.displayHeight);
    sprite.setDisplaySize(targetH*r,targetH);
  }

  // Hedefleri doğdukları anda telefon ölçüsünde oluştur.
  const spawnMap={
    spawnMission1Item:['m1Items',82],
    spawnMission2Target:['m2Targets',84],
    spawnMission3Runner:['m3Runners',82],
    spawnMission4Invader:['m4Invaders',84]
  };
  Object.entries(spawnMap).forEach(([name,[arrName,targetH]])=>{
    const old=GameScene.prototype[name];
    if(typeof old!=='function') return;
    GameScene.prototype[name]=function(...args){
      const before=(this[arrName]||[]).length;
      const out=old.apply(this,args);
      if(isPhone()){
        const arr=this[arrName]||[];
        const item=arr.length>before?arr[arr.length-1]:null;
        if(item?.sprite){
          const h = item.kind==='boss' ? 125 : targetH;
          resizeSprite(item.sprite,h);
          // Görev 1 nesneleri HUD'ın hemen altından görünmeye başlasın.
          if(name==='spawnMission1Item'){
            item.sprite.y=112;
            item.ring?.setPosition(item.sprite.x,item.sprite.y).setScale(.70);
            item.badge?.setPosition(item.sprite.x,item.sprite.y-item.sprite.displayHeight*.58).setScale(.78);
          } else {
            item.ring?.setScale(.76);
            item.badge?.setScale(.78);
          }
        }
      }
      return out;
    };
  });

  // Mission 5 minyon ve boss ölçüleri.
  const oldSpawnMinion=GameScene.prototype.spawnBossMinion;
  if(typeof oldSpawnMinion==='function') GameScene.prototype.spawnBossMinion=function(...args){
    const before=this.m5Minions?.length||0;
    const out=oldSpawnMinion.apply(this,args);
    if(isPhone() && (this.m5Minions?.length||0)>before){
      const m=this.m5Minions[this.m5Minions.length-1];
      try{m.node?.setScale(.66)}catch{}
    }
    return out;
  };
  const oldStart5=GameScene.prototype.startMission5;
  if(typeof oldStart5==='function') GameScene.prototype.startMission5=function(...args){
    const out=oldStart5.apply(this,args);
    if(isPhone()){
      try{ this.boss?.node?.setScale(.62); this.boss.node.y=175; }catch{}
      this.time?.delayedCall?.(0,()=>applyMobile(this));
    }
    return out;
  };

  // Sonuç ekranı: mobilde tüm seçenekler her zaman görünür.
  const oldResult=GameScene.prototype.showMissionResult;
  GameScene.prototype.showMissionResult=function(accuracy,stars,grade){
    if(!isPhone()) return oldResult.apply(this,arguments);
    this.clearOverlay();
    const w=this.scale.width,h=this.scale.height,m=this.currentMission();
    const color=grade==='S'?'#72ff8b':grade==='A+'?'#bfffd0':grade==='A'?'#ffd166':grade==='B'?'#ffcf8b':'#ff9aa5';
    const overlay=this.add.rectangle(w/2,h/2,w,h,0x02070b,.91).setDepth(100);
    const cardTop=62, cardBottom=h-48;
    const card=this.add.rectangle(w/2,(cardTop+cardBottom)/2,w-18,cardBottom-cardTop,0x071725,.998).setStrokeStyle(3,0x3b7297,.98).setDepth(101);
    const title=this.add.text(w/2,cardTop+34,this.missionSuccess?`GÖREV ${m.id} TAMAMLANDI`:`GÖREV ${m.id} TAMAMLANAMADI`,{fontFamily:'Arial Black, Arial',fontSize:'18px',color,align:'center',wordWrap:{width:w-34}}).setOrigin(.5).setDepth(102);
    const mn=this.add.text(w/2,cardTop+72,`${m.title} • ${'★'.repeat(stars)}${'☆'.repeat(3-stars)}`,{fontFamily:'Arial Black, Arial',fontSize:'12px',color:'#fff',align:'center',wordWrap:{width:w-36}}).setOrigin(.5).setDepth(102);
    const stats=this.add.text(24,cardTop+112,`SKOR          ${this.score.toLocaleString('tr-TR')}\nHATA          ${this.missed}\nBAŞARI / ORAN %${accuracy}\nKARAKTER      ${this.selected.name}\nDERECE        ${grade}\nYILDIZ        ${stars}/3`,{fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',color:'#fff',lineSpacing:6}).setDepth(102);
    let specific='';
    if(m.id===1)specific=`Yakalanan ${this.caught} • En iyi kombo x${this.bestCombo}`;
    if(m.id===2)specific=`Vurulan ${this.caught} • Atış ${this.shots} • İsabet %${accuracy}`;
    if(m.id===3)specific=`Yakalanan ${this.caught} • En iyi kombo x${this.bestCombo}`;
    if(m.id===4)specific=`Ofis bütünlüğü %${this.officeIntegrity} • Durdurulan ${this.caught}`;
    if(m.id===5)specific=`Oyuncu canı ${this.playerHP}/5`;
    const detail=this.add.text(w/2,cardTop+262,specific,{fontFamily:'Arial',fontSize:'10px',color:'#b9d2df',align:'center',wordWrap:{width:w-42}}).setOrigin(.5).setDepth(102);
    const zero=this.add.text(w/2,cardTop+291,this.missed===0?'SIFIR HATA MADALYASI':'HEDEF: SIFIR HATA',{fontFamily:'Arial Black, Arial',fontSize:'11px',color:this.missed===0?'#72ff8b':'#ffd166'}).setOrigin(.5).setDepth(102);
    const mk=(x,y,bw,label,primary,fn)=>{const box=this.add.rectangle(0,0,bw,42,primary?0xffd166:0x123953,1).setStrokeStyle(2,primary?0xffe49b:0x2b6385,1).setInteractive({useHandCursor:true});const tx=this.add.text(0,0,label,{fontFamily:'Arial Black, Arial',fontSize:'10px',color:primary?'#07131c':'#fff'}).setOrigin(.5);const c=this.add.container(x,y,[box,tx]).setDepth(103);box.on('pointerdown',fn);return c;};
    const bw=(w-34)/2, nextId=this.selectedMission<5?this.selectedMission+1:1;
    const y1=h-130, y2=h-80;
    const again=mk(9+bw/2,y1,bw-5,'TEKRAR OYNA',true,()=>this.scene.restart({missionId:this.selectedMission,autoStart:true}));
    const next=mk(w-9-bw/2,y1,bw-5,this.selectedMission<5?'SONRAKİ GÖREV':'GÖREV 1',false,()=>{localStorage.setItem('metinballMission',String(nextId));this.scene.restart({missionId:nextId,autoStart:true});});
    const missions=mk(9+bw/2,y2,bw-5,'GÖREVLER',false,()=>this.scene.restart({openMissionSelect:true}));
    const home=mk(w-9-bw/2,y2,bw-5,'ANA MENÜ',false,()=>this.scene.restart({}));
    this.activeOverlay=[overlay,card,title,mn,stats,detail,zero,again,next,missions,home];
  };

  // Duraklatma menüsü de tek ekrana sığsın.
  const oldPause=GameScene.prototype.openPauseMenu;
  GameScene.prototype.openPauseMenu=function(){
    if(!isPhone()) return oldPause.apply(this,arguments);
    if(!this.started || this.gameOver || this.pausedByMenu) return;
    this.pausedByMenu=true; this.tweens.pauseAll();
    const w=this.scale.width,h=this.scale.height,m=this.currentMission();
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.86).setDepth(120);
    const card=this.add.rectangle(w/2,h/2,w-28,392,0x071725,.998).setStrokeStyle(3,0x3b7297,.98).setDepth(121);
    const title=this.add.text(w/2,h/2-158,'OYUN DURDU',{fontFamily:'Arial Black, Arial',fontSize:'19px',color:'#fff'}).setOrigin(.5).setDepth(122);
    const ms=this.add.text(w/2,h/2-126,`GÖREV ${m.id} • ${m.title}`,{fontFamily:'Arial',fontSize:'10px',fontStyle:'bold',color:'#9ed7f4',wordWrap:{width:w-55},align:'center'}).setOrigin(.5).setDepth(122);
    const btn=(y,label,primary,fn)=>{const b=this.add.text(w/2,y,label,{fontFamily:'Arial Black, Arial',fontSize:'11px',color:primary?'#071725':'#fff',backgroundColor:primary?'#ffd166':'#12334a',fixedWidth:w-72,align:'center',padding:{x:8,y:9}}).setOrigin(.5).setInteractive({useHandCursor:true}).setDepth(123);b.on('pointerdown',fn);return b;};
    const a=btn(h/2-78,'DEVAM ET',true,()=>this.closePauseMenu());
    const b=btn(h/2-24,'YENİDEN BAŞLAT',false,()=>{this.tweens.resumeAll();this.scene.restart({missionId:this.selectedMission,autoStart:true});});
    const c=btn(h/2+30,'GÖREVLER',false,()=>{this.tweens.resumeAll();this.stopAllAudio();this.scene.restart({openMissionSelect:true});});
    const d=btn(h/2+84,'ANA MENÜ',false,()=>{this.tweens.resumeAll();this.stopAllAudio();this.scene.restart({});});
    const e=btn(h/2+138,'ÇIKIŞ',false,()=>{this.tweens.resumeAll();this.exitGame();});
    this.pauseObjects=[ov,card,title,ms,a,b,c,d,e];
  };

  ['buildHud','configureMissionHud','updateHud','updateTimer','updateAmmoHud','startSelectedMission'].forEach(name=>{
    const old=GameScene.prototype[name];
    if(typeof old!=='function') return;
    GameScene.prototype[name]=function(...args){
      const out=old.apply(this,args);
      if(isPhone()) this.time?.delayedCall?.(0,()=>applyMobile(this));
      return out;
    };
  });

  const reflow=()=>{ if(!isPhone()) return; setTimeout(()=>{try{const g=window.__METINBALL_GAME__;const s=g?.scene?.getScene?.('GameScene');if(s)applyMobile(s)}catch{}},120); };
  window.addEventListener('resize',reflow,{passive:true});
  window.visualViewport?.addEventListener('resize',reflow,{passive:true});
})();
