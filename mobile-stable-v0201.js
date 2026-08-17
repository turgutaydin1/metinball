(() => {
  if (typeof GameScene === 'undefined') return;

  const isPhone = () => ('ontouchstart' in window || navigator.maxTouchPoints > 0) && Math.min(window.innerWidth, window.innerHeight) < 820;
  const safeBottom = () => 70;

  function crisp(t,size,x,y,originX,originY,wrap){
    if(!t || !t.active) return;
    try{t.setScale(1,1)}catch{}
    try{t.setFontSize(size)}catch{}
    try{t.setPosition(x,y)}catch{}
    try{t.setOrigin(originX,originY)}catch{}
    try{if(wrap)t.setWordWrapWidth(wrap,true)}catch{}
    try{t.setResolution(Math.max(2,Math.min(3,window.devicePixelRatio||2)))}catch{}
  }

  function compactGameplay(scene){
    if(!isPhone() || !scene || !scene.scale) return;
    const w=scene.scale.width,h=scene.scale.height;

    // Üst HUD: gerçek telefon ölçülerinde, gereksiz boşluk bırakmadan.
    try{scene.topBar && scene.topBar.setPosition(w/2,34).setSize(w,68)}catch{}
    crisp(scene.titleText,13,w/2,3,.5,0,Math.max(210,w*.58));
    crisp(scene.scoreText,10,10,27,0,0);
    crisp(scene.timeText,10,w-10,27,1,0);
    crisp(scene.highText,7,10,44,0,0);
    crisp(scene.errorText,8,w-10,44,1,0);
    crisp(scene.targetText,7.5,w/2,56,.5,0,w-48);

    crisp(scene.countText,8,8,76,0,.5);
    crisp(scene.phaseText,8,w/2,76,.5,.5,w*.44);
    crisp(scene.accuracyText,8,w-8,76,1,.5);
    crisp(scene.comboText,10,w/2,96,.5,.5,w-30);
    crisp(scene.specialText,8.5,w/2,112,.5,.5,w-30);

    // Alt alanlar Safari araç çubuğunun üstünde ve birbirinden ayrı.
    if(scene.missionText && scene.missionText.active){
      crisp(scene.missionText,8,9,h-139,0,0,Math.min(172,w*.43));
      try{scene.missionText.setPadding(5,4,5,4);scene.missionText.setLineSpacing(0)}catch{}
    }
    crisp(scene.controlsText,6.5,w/2,h-53,.5,.5,w-145);
    crisp(scene.soundButton,8,8,h-54,0,.5);
    crisp(scene.menuButton,8,w-8,h-54,1,.5);

    // Oyuncu telefon ekranını kaplamasın; PC ölçülerine dokunulmaz.
    if(scene.playerImage && scene.playerImage.active){
      try{
        const maxH=Math.min(188,h*.235);
        if(scene.playerImage.displayHeight>maxH){
          const r=scene.playerImage.displayWidth/Math.max(1,scene.playerImage.displayHeight);
          scene.playerImage.setDisplaySize(maxH*r,maxH);
          scene.playerBaseScaleX=scene.playerImage.scaleX;
          scene.playerBaseScaleY=scene.playerImage.scaleY;
        }
      }catch{}
    }
    if(scene.player && scene.player.active){
      try{scene.playerBaseY=Math.min(scene.playerBaseY,h-47);scene.player.y=Math.min(scene.player.y,h-47)}catch{}
    }
  }

  function scaleLast(arr, factor, minH, maxH){
    if(!isPhone() || !Array.isArray(arr) || !arr.length) return;
    const item=arr[arr.length-1];
    const s=item && (item.sprite || item.node);
    if(!s || !s.active) return;
    try{
      if(item.sprite){
        const h=Math.max(minH,Math.min(maxH,item.sprite.displayHeight*factor));
        const r=item.sprite.displayWidth/Math.max(1,item.sprite.displayHeight);
        item.sprite.setDisplaySize(h*r,h);
        if(item.ring){item.ring.setScale(factor)}
        if(item.badge){item.badge.setScale(.82)}
      } else if(item.node && item.node.list){
        item.node.setScale(factor);
      }
    }catch{}
  }

  // Telefon hedefleri: masaüstü oyun dengesi korunur, yalnız görsel boyut küçülür.
  const spawnRules={
    spawnMission1Item:['m1Items',.72,68,118],
    spawnMission2Target:['m2Targets',.78,72,118],
    spawnMission3Runner:['m3Runners',.82,74,112],
    spawnMission4Invader:['m4Invaders',.80,72,118],
    spawnBossMinion:['m5Minions',.82,60,110]
  };
  Object.keys(spawnRules).forEach(name=>{
    const original=GameScene.prototype[name];
    if(typeof original!=='function') return;
    GameScene.prototype[name]=function(...args){
      const out=original.apply(this,args);
      const rule=spawnRules[name];
      if(isPhone()) scaleLast(this[rule[0]],rule[1],rule[2],rule[3]);
      return out;
    };
  });

  // Boss da mobilde ekranı gereksiz kaplamasın.
  const originalStart5=GameScene.prototype.startMission5;
  if(typeof originalStart5==='function') GameScene.prototype.startMission5=function(...args){
    const out=originalStart5.apply(this,args);
    if(isPhone() && this.boss && this.boss.node){
      try{this.boss.node.setScale(.78);this.boss.node.y=Math.max(170,Math.min(210,this.boss.node.y))}catch{}
    }
    this.time && this.time.delayedCall && this.time.delayedCall(0,()=>compactGameplay(this));
    return out;
  };

  // Mobil sonuç ekranı: dört seçim her zaman görünür ve dokunulabilir.
  const originalResult=GameScene.prototype.showMissionResult;
  GameScene.prototype.showMissionResult=function(accuracy,stars,grade){
    if(!isPhone()) return originalResult.apply(this,arguments);
    this.clearOverlay();
    const w=this.scale.width,h=this.scale.height,m=this.currentMission();
    const color=grade==='S'?'#72ff8b':grade==='A+'?'#bfffd0':grade==='A'?'#ffd166':grade==='B'?'#ffcf8b':'#ff9aa5';
    const overlay=this.add.rectangle(w/2,h/2,w,h,0x02070b,.90).setDepth(100);
    const top=78,bottom=safeBottom()+18;
    const card=this.add.rectangle(w/2,(top+h-bottom)/2,w-18,h-top-bottom,0x071725,.998).setStrokeStyle(3,0x3b7297,.98).setDepth(101);
    const title=this.add.text(w/2,top+38,this.missionSuccess?`GÖREV ${m.id} TAMAMLANDI`:`GÖREV ${m.id} TAMAMLANAMADI`,{fontFamily:'Arial Black, Arial',fontSize:'20px',color,align:'center',wordWrap:{width:w-42}}).setOrigin(.5).setDepth(102);
    const mission=this.add.text(w/2,top+82,`${m.title} • ${'★'.repeat(stars)}${'☆'.repeat(3-stars)}`,{fontFamily:'Arial Black, Arial',fontSize:'14px',color:'#ffffff',align:'center',wordWrap:{width:w-42}}).setOrigin(.5).setDepth(102);
    const stats=this.add.text(28,top+133,`SKOR          ${this.score.toLocaleString('tr-TR')}\nHATA          ${this.missed}\nBAŞARI / ORAN %${accuracy}\nKARAKTER      ${this.selected.name}\nDERECE        ${grade}\nYILDIZ        ${stars}/3`,{fontFamily:'Arial, sans-serif',fontSize:'13px',fontStyle:'bold',color:'#ffffff',lineSpacing:7}).setDepth(102);
    let specific='';
    if(m.id===1)specific=`Yakalanan ${this.caught} • En iyi kombo x${this.bestCombo}`;
    if(m.id===2)specific=`Vurulan ${this.caught} • Atış ${this.shots} • İsabet %${accuracy}`;
    if(m.id===3)specific=`Yakalanan ${this.caught} • En iyi kombo x${this.bestCombo}`;
    if(m.id===4)specific=`Ofis bütünlüğü %${this.officeIntegrity} • Durdurulan ${this.caught}`;
    if(m.id===5)specific=`Oyuncu canı ${this.playerHP}/5`;
    const detail=this.add.text(w/2,top+300,specific,{fontFamily:'Arial, sans-serif',fontSize:'11px',color:'#b9d2df',align:'center',wordWrap:{width:w-50}}).setOrigin(.5).setDepth(102);
    const zero=this.add.text(w/2,top+334,this.missed===0?'SIFIR HATA MADALYASI':'HEDEF: SIFIR HATA',{fontFamily:'Arial Black, Arial',fontSize:'12px',color:this.missed===0?'#72ff8b':'#ffd166'}).setOrigin(.5).setDepth(102);

    const mkBtn=(x,y,bw,label,primary,handler)=>{
      const box=this.add.rectangle(0,0,bw,48,primary?0xffd166:0x123953,1).setStrokeStyle(2,primary?0xffe49b:0x2b6385,1).setInteractive({useHandCursor:true});
      const text=this.add.text(0,0,label,{fontFamily:'Arial Black, Arial',fontSize:'12px',color:primary?'#07131c':'#ffffff',align:'center'}).setOrigin(.5);
      const c=this.add.container(x,y,[box,text]).setDepth(103);box.on('pointerdown',handler);return c;
    };
    const nextId=this.selectedMission<5?this.selectedMission+1:1;
    const bw=(w-38)/2;
    const y1=h-bottom-74,y2=h-bottom-20;
    const again=mkBtn(10+bw/2,y1,bw-6,'TEKRAR OYNA',true,()=>this.scene.restart({missionId:this.selectedMission,autoStart:true}));
    const next=mkBtn(w-10-bw/2,y1,bw-6,this.selectedMission<5?'SONRAKİ GÖREV':'GÖREV 1',false,()=>{localStorage.setItem('metinballMission',String(nextId));this.scene.restart({missionId:nextId,autoStart:true})});
    const missions=mkBtn(10+bw/2,y2,bw-6,'GÖREVLER',false,()=>this.scene.restart({openMissionSelect:true}));
    const home=mkBtn(w-10-bw/2,y2,bw-6,'ANA MENÜ',false,()=>this.scene.restart({}));
    this.activeOverlay=[overlay,card,title,mission,stats,detail,zero,again,next,missions,home];
  };

  // Mobil duraklatma ekranı: tüm dönüş yolları tek ekranda.
  const originalPause=GameScene.prototype.openPauseMenu;
  GameScene.prototype.openPauseMenu=function(){
    if(!isPhone()) return originalPause.apply(this,arguments);
    if(!this.started || this.gameOver || this.pausedByMenu) return;
    this.pausedByMenu=true;this.tweens.pauseAll();
    const w=this.scale.width,h=this.scale.height,m=this.currentMission();
    const overlay=this.add.rectangle(w/2,h/2,w,h,0x02070b,.84).setDepth(120);
    const card=this.add.rectangle(w/2,h/2,w-34,430,0x071725,.998).setStrokeStyle(3,0x3b7297,.98).setDepth(121);
    const title=this.add.text(w/2,h/2-175,'OYUN DURDU',{fontFamily:'Arial Black, Arial',fontSize:'21px',color:'#ffffff'}).setOrigin(.5).setDepth(122);
    const mission=this.add.text(w/2,h/2-140,`GÖREV ${m.id} • ${m.title}`,{fontFamily:'Arial',fontSize:'11px',fontStyle:'bold',color:'#9ed7f4',wordWrap:{width:w-70},align:'center'}).setOrigin(.5).setDepth(122);
    const pbtn=(y,label,primary,fn)=>{const b=this.add.text(w/2,y,label,{fontFamily:'Arial Black, Arial',fontSize:'13px',color:primary?'#071725':'#ffffff',backgroundColor:primary?'#ffd166':'#12334a',fixedWidth:w-90,align:'center',padding:{x:8,y:10}}).setOrigin(.5).setInteractive({useHandCursor:true}).setDepth(123);b.on('pointerdown',fn);return b};
    const resume=pbtn(h/2-90,'DEVAM ET',true,()=>this.closePauseMenu());
    const restart=pbtn(h/2-30,'YENİDEN BAŞLAT',false,()=>{this.tweens.resumeAll();this.scene.restart({missionId:this.selectedMission,autoStart:true})});
    const missions=pbtn(h/2+30,'GÖREVLER',false,()=>{this.tweens.resumeAll();this.stopAllAudio();this.scene.restart({openMissionSelect:true})});
    const home=pbtn(h/2+90,'ANA MENÜ',false,()=>{this.tweens.resumeAll();this.stopAllAudio();this.scene.restart({})});
    const exit=pbtn(h/2+150,'ÇIKIŞ',false,()=>{this.tweens.resumeAll();this.exitGame()});
    this.pauseObjects=[overlay,card,title,mission,resume,restart,missions,home,exit];
  };

  // HUD yeniden yazıldığında kompakt mobil ölçüleri koru.
  ['buildHud','configureMissionHud','updateHud','updateTimer','updateAmmoHud','startSelectedMission'].forEach(name=>{
    const original=GameScene.prototype[name];
    if(typeof original!=='function')return;
    GameScene.prototype[name]=function(...args){const out=original.apply(this,args);if(isPhone()){this.time && this.time.delayedCall ? this.time.delayedCall(0,()=>compactGameplay(this)) : setTimeout(()=>compactGameplay(this),0);}return out};
  });

  // Görsel viewport değişimlerinde taşma/zoom yerine yeniden yerleştir.
  const reflow=()=>{if(!isPhone())return;setTimeout(()=>{try{const game=window.__METINBALL_GAME__;const scene=game && game.scene && game.scene.getScene && game.scene.getScene('GameScene');if(scene)compactGameplay(scene)}catch{}},100)};
  window.addEventListener('resize',reflow,{passive:true});
  window.visualViewport && window.visualViewport.addEventListener('resize',reflow,{passive:true});
})();
