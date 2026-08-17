(() => {
  if (typeof GameScene === 'undefined') return;

  const isPhone = () => (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && Math.min(window.innerWidth, window.innerHeight) < 820;
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

  // Kendi karakterini yükle özelliğini mobil/masaüstü menülerden kaldır.
  try {
    localStorage.removeItem('metinballCustomCharacterV1');
    localStorage.removeItem('metinballOpenCharacterAfterReload');
    if (localStorage.getItem('metinballCharacter') === 'custom') localStorage.setItem('metinballCharacter','turgut');
  } catch {}
  GameScene.prototype.installCustomCharacterDefinition = function(){};

  function txt(scene,x,y,value,size=12,color='#fff',originX=0,originY=0,opts={}) {
    const t=scene.add.text(x,y,value,{
      fontFamily:opts.bold?'Arial Black, Arial':'Arial, sans-serif',
      fontSize:`${size}px`,
      fontStyle:opts.bold?'bold':'normal',
      color,
      align:opts.align||'left',
      wordWrap: opts.wrap ? {width:opts.wrap,useAdvancedWrap:true} : undefined,
      lineSpacing:opts.lineSpacing||0,
      backgroundColor:opts.bg,
      padding:opts.padding
    }).setOrigin(originX,originY).setDepth(opts.depth||92);
    try{t.setResolution(Math.max(2,Math.min(3,window.devicePixelRatio||2)))}catch{}
    return t;
  }

  function button(scene,x,y,w,h,label,primary,fn,size=12,depth=94){
    const bg=scene.add.rectangle(0,0,w,h,primary?0xffd166:0x12334a,1)
      .setStrokeStyle(2,primary?0xffe49b:0x2f6384,1)
      .setInteractive({useHandCursor:true});
    const tx=txt(scene,0,0,label,size,primary?'#071725':'#ffffff',.5,.5,{bold:true,align:'center',wrap:w-16,depth:depth+1});
    const c=scene.add.container(x,y,[bg,tx]).setDepth(depth);
    bg.on('pointerdown',fn);
    return c;
  }

  function phoneCard(scene,top,bottom){
    const w=scene.scale.width;
    return scene.add.rectangle(w/2,(top+bottom)/2,w-18,bottom-top,0x071725,.995)
      .setStrokeStyle(3,0x3b7297,.96).setDepth(91);
  }

  // -------------------- TAM MOBİL MENÜLER --------------------
  const desktopMain=GameScene.prototype.showMainMenu;
  GameScene.prototype.showMainMenu=function(){
    if(!isPhone()) return desktopMain.apply(this,arguments);
    this.clearOverlay(); this.drawProceduralBackground(0);
    const w=this.scale.width,h=this.scale.height,m=this.currentMission();
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.72).setDepth(90);
    const top=16,bottom=h-22; const card=phoneCard(this,top,bottom);
    const title=txt(this,w/2,top+34,'METINBALL',28,'#ffd166',.5,.5,{bold:true});
    const sub=txt(this,w/2,top+63,'4 KARAKTER • 5 GÖREV',10,'#bfffd0',.5,.5,{bold:true});

    const avatar=this.add.sprite(w*.25,top+142,this.selected.texture,this.selected.id==='custom'?undefined:0).setDepth(92);
    if(this.selected.id!=='custom') avatar.setDisplaySize(74,128); else avatar.setDisplaySize(80,128);
    const info=txt(this,w*.47,top+106,`KARAKTER\n${this.selected.name}\n\nSEÇİLİ GÖREV\n${this.selectedMission}. ${m.title}`,12,'#e7f3f8',0,0,{bold:true,wrap:w*.48,lineSpacing:3});

    const bw=w-42, bh=46, cx=w/2;
    const y0=top+235;
    const play=button(this,cx,y0,bw,bh,`OYNA • GÖREV ${this.selectedMission}`,true,()=>this.startSelectedMission(),13);
    const missions=button(this,cx,y0+55,bw,bh,'GÖREVLER',false,()=>this.showMissionSelect(),12);
    const chars=button(this,cx,y0+110,bw,bh,'KARAKTER SEÇ',false,()=>this.showCharacterSelect(),12);
    const career=button(this,cx,y0+165,bw,bh,'KARİYER / BAŞARILAR',false,()=>this.showCareer(),11);
    const settings=button(this,w*.28,y0+222,w*.43,bh,'AYARLAR',false,()=>this.showSettings(),11);
    const exit=button(this,w*.72,y0+222,w*.43,bh,'ÇIKIŞ',false,()=>this.exitGame(),11);
    this.activeOverlay=[ov,card,title,sub,avatar,info,play,missions,chars,career,settings,exit];
  };

  const desktopMissionSelect=GameScene.prototype.showMissionSelect;
  GameScene.prototype.showMissionSelect=function(){
    if(!isPhone()) return desktopMissionSelect.apply(this,arguments);
    this.clearOverlay(); this.drawProceduralBackground(0);
    const w=this.scale.width,h=this.scale.height;
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.80).setDepth(90);
    const top=14,bottom=h-20; const card=phoneCard(this,top,bottom);
    const title=txt(this,w/2,top+34,'GÖREVLER',22,'#ffffff',.5,.5,{bold:true});
    const rowW=w-40,rowH=74,start=top+78,gap=8;
    const rows=[];
    this.missions.forEach((m,i)=>{
      const y=start+i*(rowH+gap);
      const selected=m.id===this.selectedMission;
      const box=this.add.rectangle(w/2,y,rowW,rowH,0x0b2233,.98).setStrokeStyle(2,selected?0xffd166:0x315d78,1).setInteractive({useHandCursor:true}).setDepth(92);
      const num=txt(this,28,y-rowH/2+12,String(m.id).padStart(2,'0'),11,selected?'#ffd166':'#85a9bf',0,0,{bold:true});
      const name=txt(this,58,y-rowH/2+10,m.title,11,'#ffffff',0,0,{bold:true,wrap:rowW-125});
      const desc=txt(this,58,y+5,m.subtitle,8,'#b8ced9',0,.5,{wrap:rowW-135});
      const rec=this.getMissionRecord(m.id);
      const rt=txt(this,w-24,y+rowH/2-13,rec?`★ ${rec.stars}/3`:'☆ 0/3',9,rec?'#bfffd0':'#7693a4',1,1,{bold:true});
      box.on('pointerdown',()=>{this.selectedMission=m.id;localStorage.setItem('metinballMission',String(m.id));this.showMissionSelect();});
      rows.push(box,num,name,desc,rt);
    });
    const by=h-49;
    const play=button(this,w*.28,by,w*.46,42,'OYNA',true,()=>this.startSelectedMission(),12);
    const home=button(this,w*.72,by,w*.46,42,'ANA MENÜ',false,()=>this.showMainMenu(),11);
    this.activeOverlay=[ov,card,title,...rows,play,home];
  };

  const desktopCharSelect=GameScene.prototype.showCharacterSelect;
  GameScene.prototype.showCharacterSelect=function(){
    if(!isPhone()) return desktopCharSelect.apply(this,arguments);
    this.characters=(this.characters||[]).filter(c=>c.id!=='custom');
    if(!this.characters.some(c=>c.id===this.selected?.id)) this.selected=this.characters[0];
    this.clearOverlay(); this.drawProceduralBackground(0);
    const w=this.scale.width,h=this.scale.height;
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.82).setDepth(90);
    const top=14,bottom=h-20; const card=phoneCard(this,top,bottom);
    const title=txt(this,w/2,top+34,'KARAKTER SEÇ',21,'#ffffff',.5,.5,{bold:true});
    const cellW=(w-54)/2, cellH=190;
    const cards=[];
    this.characters.slice(0,4).forEach((c,i)=>{
      const col=i%2,row=Math.floor(i/2);
      const x=18+cellW/2+col*(cellW+18);
      const y=top+156+row*(cellH+12);
      const selected=c.id===this.selected.id;
      const box=this.add.rectangle(x,y,cellW,cellH,0x0b2233,.98).setStrokeStyle(2,selected?0xffd166:0x315d78,1).setInteractive({useHandCursor:true}).setDepth(92);
      const im=this.add.sprite(x,y-45,c.texture,0).setDisplaySize(70,121).setDepth(93);
      const name=txt(this,x,y+25,c.name,13,selected?'#ffd166':'#ffffff',.5,.5,{bold:true});
      const ability=txt(this,x,y+47,c.ability,8,'#9ed7f4',.5,.5,{bold:true,wrap:cellW-14,align:'center'});
      const stars=txt(this,x,y+72,`HIZ ${'★'.repeat(c.stars.speed)}\nYAK ${'★'.repeat(c.stars.catch)}\nPUAN ${'★'.repeat(c.stars.score)}`,8,'#e9f4fa',.5,.5,{lineSpacing:2,align:'center'});
      box.on('pointerdown',()=>{this.selected=c;localStorage.setItem('metinballCharacter',c.id);this.showCharacterSelect();});
      cards.push(box,im,name,ability,stars);
    });
    const by=h-49;
    const play=button(this,w*.28,by,w*.46,42,'OYNA',true,()=>this.startSelectedMission(),12);
    const home=button(this,w*.72,by,w*.46,42,'ANA MENÜ',false,()=>this.showMainMenu(),11);
    this.activeOverlay=[ov,card,title,...cards,play,home];
  };

  const desktopCareer=GameScene.prototype.showCareer;
  GameScene.prototype.showCareer=function(){
    if(!isPhone()) return desktopCareer.apply(this,arguments);
    this.clearOverlay(); const w=this.scale.width,h=this.scale.height;
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.84).setDepth(90);
    const top=18,bottom=h-22; const card=phoneCard(this,top,bottom);
    const title=txt(this,w/2,top+34,`KARİYER • ${this.getCareerStars()}/15 ★`,19,'#ffd166',.5,.5,{bold:true});
    const items=[];
    this.missions.forEach((m,i)=>{
      const r=this.getMissionRecord(m.id), y=top+92+i*58;
      const line=r?`${m.id}. ${m.title}\n${r.grade} • ${r.score.toLocaleString('tr-TR')} • ${'★'.repeat(r.stars)}${'☆'.repeat(3-r.stars)}`:`${m.id}. ${m.title}\nKAYIT YOK • ☆☆☆`;
      items.push(txt(this,30,y,line,10,'#e7f3f8',0,0,{bold:true,wrap:w-60,lineSpacing:2}));
    });
    const zeroCount=this.missions.filter(m=>this.getMissionRecord(m.id)?.zeroError).length;
    const medal=txt(this,w/2,h-105,`SIFIR HATA MADALYASI ${zeroCount}/5`,11,'#bfffd0',.5,.5,{bold:true});
    const back=button(this,w/2,h-50,w-42,42,'ANA MENÜ',false,()=>this.showMainMenu(),11);
    this.activeOverlay=[ov,card,title,...items,medal,back];
  };

  const desktopSettings=GameScene.prototype.showSettings;
  GameScene.prototype.showSettings=function(){
    if(!isPhone()) return desktopSettings.apply(this,arguments);
    this.clearOverlay(); const w=this.scale.width,h=this.scale.height;
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.84).setDepth(90);
    const card=this.add.rectangle(w/2,h/2,w-32,320,0x071725,.998).setStrokeStyle(3,0x3b7297,.96).setDepth(91);
    const title=txt(this,w/2,h/2-118,'AYARLAR',20,'#ffffff',.5,.5,{bold:true});
    const sound=button(this,w/2,h/2-54,w-76,44,this.soundOn?'SES: AÇIK':'SES: KAPALI',true,()=>{this.toggleSound();this.showSettings();},11);
    const info=txt(this,w/2,h/2+14,'Telefon sürümünde arayüz ve oyun alanı otomatik ölçeklenir.',10,'#b8ced9',.5,.5,{wrap:w-76,align:'center'});
    const back=button(this,w/2,h/2+86,w-76,44,'ANA MENÜ',false,()=>this.showMainMenu(),11);
    this.activeOverlay=[ov,card,title,sound,info,back];
  };

  // -------------------- MOBİL OYUN ALANI --------------------
  function applyHud(scene){
    if(!isPhone()||!scene?.scale) return;
    const w=scene.scale.width,h=scene.scale.height;
    const set=(o,size,x,y,ox=0,oy=0,wrap=0)=>{if(!o?.active)return;try{o.setScale(1);o.setFontSize(size);o.setPosition(x,y);o.setOrigin(ox,oy);if(wrap)o.setWordWrapWidth(wrap,true);o.setResolution?.(Math.max(2,Math.min(3,window.devicePixelRatio||2)));}catch{}};
    try{scene.topBar?.setPosition(w/2,27).setSize(w,54)}catch{}
    set(scene.titleText,12,w/2,2,.5,0,w-130);
    set(scene.scoreText,9,9,24,0,0); set(scene.timeText,9,w-9,24,1,0);
    set(scene.highText,6.5,9,40,0,0); set(scene.errorText,7,w-9,40,1,0);
    set(scene.targetText,6.5,w/2,51,.5,0,w-40);
    set(scene.countText,7,7,68,0,.5); set(scene.phaseText,7,w/2,68,.5,.5,w*.44); set(scene.accuracyText,7,w-7,68,1,.5);
    set(scene.comboText,8,w/2,86,.5,.5,w-24); set(scene.specialText,7.5,w/2,103,.5,.5,w-22);
    if(scene.missionText?.active){set(scene.missionText,7,7,h-107,0,0,145);try{scene.missionText.setPadding(4,3,4,3);scene.missionText.setLineSpacing(0)}catch{}}
    set(scene.soundButton,7,7,h-26,0,.5); set(scene.menuButton,7,w-7,h-26,1,.5); set(scene.controlsText,5.5,w/2,h-26,.5,.5,w-135);
  }

  const oldCreatePlayer=GameScene.prototype.createPlayer;
  GameScene.prototype.createPlayer=function(...args){
    const out=oldCreatePlayer.apply(this,args);
    if(isPhone()){
      const w=this.scale.width,h=this.scale.height;
      try{
        const targetH=128, ratio=this.playerImage.displayWidth/Math.max(1,this.playerImage.displayHeight);
        this.playerImage.setDisplaySize(targetH*ratio,targetH);
        this.playerBaseScaleX=this.playerImage.scaleX; this.playerBaseScaleY=this.playerImage.scaleY;
        this.playerIdleTween?.stop?.(); this.startPlayerIdleAnimation?.();
        this.playerBaseY=h-46; this.player.y=this.playerBaseY;
        this.playerShadow?.setPosition(this.player.x,h-39).setScale(.66,.66);
        if(this.selected){ this.__desktopCatchWidth=this.selected.catchWidth; this.selected.catchWidth=Math.max(48,Math.round(this.selected.catchWidth*.50)); }
      }catch{}
      this.time?.delayedCall?.(0,()=>applyHud(this));
    }
    return out;
  };

  function resizeSprite(sp,h){ if(!sp?.active)return; const r=sp.displayWidth/Math.max(1,sp.displayHeight); sp.setDisplaySize(h*r,h); }
  const spawnRules={spawnMission1Item:['m1Items',68],spawnMission2Target:['m2Targets',72],spawnMission3Runner:['m3Runners',70],spawnMission4Invader:['m4Invaders',72]};
  Object.entries(spawnRules).forEach(([name,[arrName,targetH]])=>{
    const old=GameScene.prototype[name]; if(typeof old!=='function')return;
    GameScene.prototype[name]=function(...args){
      const before=(this[arrName]||[]).length; const out=old.apply(this,args);
      if(isPhone()){
        const arr=this[arrName]||[], item=arr.length>before?arr[arr.length-1]:null;
        if(item?.sprite){
          resizeSprite(item.sprite,item.kind==='boss'?100:targetH);
          item.ring?.setScale(.62); item.badge?.setScale(.72);
          if(name==='spawnMission1Item'){
            item.sprite.y=84;
            item.ring?.setPosition(item.sprite.x,item.sprite.y);
            item.badge?.setPosition(item.sprite.x,item.sprite.y-item.sprite.displayHeight*.58);
          }
        }
      }
      return out;
    };
  });

  const oldStart5=GameScene.prototype.startMission5;
  if(typeof oldStart5==='function') GameScene.prototype.startMission5=function(...args){const out=oldStart5.apply(this,args);if(isPhone()){try{this.boss?.node?.setScale(.54);this.boss.node.y=150}catch{};this.time?.delayedCall?.(0,()=>applyHud(this));}return out};
  const oldMinion=GameScene.prototype.spawnBossMinion;
  if(typeof oldMinion==='function') GameScene.prototype.spawnBossMinion=function(...args){const before=this.m5Minions?.length||0;const out=oldMinion.apply(this,args);if(isPhone()&&(this.m5Minions?.length||0)>before){try{this.m5Minions.at(-1)?.node?.setScale(.58)}catch{}}return out};

  ['buildHud','configureMissionHud','updateHud','updateTimer','updateAmmoHud','startSelectedMission'].forEach(name=>{
    const old=GameScene.prototype[name]; if(typeof old!=='function')return;
    GameScene.prototype[name]=function(...args){const out=old.apply(this,args);if(isPhone())this.time?.delayedCall?.(0,()=>applyHud(this));return out};
  });

  // Sonuç ekranı: butonlar görünür ve ekran içinde.
  const desktopResult=GameScene.prototype.showMissionResult;
  GameScene.prototype.showMissionResult=function(accuracy,stars,grade){
    if(!isPhone()) return desktopResult.apply(this,arguments);
    this.clearOverlay(); const w=this.scale.width,h=this.scale.height,m=this.currentMission();
    const color=grade==='S'?'#72ff8b':grade==='A+'?'#bfffd0':grade==='A'?'#ffd166':grade==='B'?'#ffcf8b':'#ff9aa5';
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.92).setDepth(100);
    const top=18,bottom=h-20; const card=this.add.rectangle(w/2,(top+bottom)/2,w-18,bottom-top,0x071725,.998).setStrokeStyle(3,0x3b7297,.98).setDepth(101);
    const title=txt(this,w/2,top+38,this.missionSuccess?`GÖREV ${m.id} TAMAMLANDI`:`GÖREV ${m.id} TAMAMLANAMADI`,18,color,.5,.5,{bold:true,wrap:w-34,align:'center',depth:102});
    const mn=txt(this,w/2,top+76,`${m.title} • ${'★'.repeat(stars)}${'☆'.repeat(3-stars)}`,12,'#fff',.5,.5,{bold:true,wrap:w-34,align:'center',depth:102});
    const stats=txt(this,26,top+120,`SKOR          ${this.score.toLocaleString('tr-TR')}\nHATA          ${this.missed}\nBAŞARI / ORAN %${accuracy}\nKARAKTER      ${this.selected.name}\nDERECE        ${grade}\nYILDIZ        ${stars}/3`,11,'#fff',0,0,{bold:true,lineSpacing:6,depth:102});
    let detail=''; if(m.id===1)detail=`Yakalanan ${this.caught} • Kombo x${this.bestCombo}`; if(m.id===2)detail=`Vurulan ${this.caught} • Atış ${this.shots} • İsabet %${accuracy}`; if(m.id===3)detail=`Yakalanan ${this.caught} • Kombo x${this.bestCombo}`; if(m.id===4)detail=`Ofis %${this.officeIntegrity} • Durdurulan ${this.caught}`; if(m.id===5)detail=`Oyuncu canı ${this.playerHP}/5`;
    const dt=txt(this,w/2,top+275,detail,9,'#b9d2df',.5,.5,{wrap:w-42,align:'center',depth:102});
    const zero=txt(this,w/2,top+305,this.missed===0?'SIFIR HATA MADALYASI':'HEDEF: SIFIR HATA',10,this.missed===0?'#72ff8b':'#ffd166',.5,.5,{bold:true,depth:102});
    const bw=(w-34)/2, y1=h-116,y2=h-66,nextId=this.selectedMission<5?this.selectedMission+1:1;
    const again=button(this,9+bw/2,y1,bw-5,42,'TEKRAR OYNA',true,()=>this.scene.restart({missionId:this.selectedMission,autoStart:true}),10,103);
    const next=button(this,w-9-bw/2,y1,bw-5,42,this.selectedMission<5?'SONRAKİ GÖREV':'GÖREV 1',false,()=>{localStorage.setItem('metinballMission',String(nextId));this.scene.restart({missionId:nextId,autoStart:true});},9,103);
    const missions=button(this,9+bw/2,y2,bw-5,42,'GÖREVLER',false,()=>this.scene.restart({openMissionSelect:true}),10,103);
    const home=button(this,w-9-bw/2,y2,bw-5,42,'ANA MENÜ',false,()=>this.scene.restart({}),10,103);
    this.activeOverlay=[ov,card,title,mn,stats,dt,zero,again,next,missions,home];
  };

  const desktopPause=GameScene.prototype.openPauseMenu;
  GameScene.prototype.openPauseMenu=function(){
    if(!isPhone()) return desktopPause.apply(this,arguments);
    if(!this.started||this.gameOver||this.pausedByMenu)return;
    this.pausedByMenu=true;this.tweens.pauseAll();const w=this.scale.width,h=this.scale.height,m=this.currentMission();
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.88).setDepth(120);
    const card=this.add.rectangle(w/2,h/2,w-30,352,0x071725,.998).setStrokeStyle(3,0x3b7297,.98).setDepth(121);
    const title=txt(this,w/2,h/2-135,'OYUN DURDU',18,'#fff',.5,.5,{bold:true,depth:122});
    const ms=txt(this,w/2,h/2-104,`GÖREV ${m.id} • ${m.title}`,10,'#9ed7f4',.5,.5,{bold:true,wrap:w-50,align:'center',depth:122});
    const ys=[h/2-55,h/2-5,h/2+45,h/2+95];
    const resume=button(this,w/2,ys[0],w-78,40,'DEVAM ET',true,()=>this.closePauseMenu(),11,123);
    const restart=button(this,w/2,ys[1],w-78,40,'YENİDEN BAŞLAT',false,()=>{this.tweens.resumeAll();this.scene.restart({missionId:this.selectedMission,autoStart:true})},10,123);
    const missions=button(this,w/2,ys[2],w-78,40,'GÖREVLER',false,()=>{this.tweens.resumeAll();this.stopAllAudio();this.scene.restart({openMissionSelect:true})},10,123);
    const home=button(this,w/2,ys[3],w-78,40,'ANA MENÜ',false,()=>{this.tweens.resumeAll();this.stopAllAudio();this.scene.restart({})},10,123);
    this.pauseObjects=[ov,card,title,ms,resume,restart,missions,home];
  };

  const reflow=()=>{if(!isPhone())return;setTimeout(()=>{try{const g=window.__METINBALL_GAME__;const s=g?.scene?.getScene?.('GameScene');if(s)applyHud(s)}catch{}},120)};
  window.addEventListener('resize',reflow,{passive:true});
  window.visualViewport?.addEventListener('resize',reflow,{passive:true});
})();
