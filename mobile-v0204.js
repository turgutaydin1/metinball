(() => {
  if (typeof GameScene === 'undefined') return;

  const phone = () => (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && Math.min(window.innerWidth, window.innerHeight) < 900;
  const fs = (w,h,r) => Math.max(7, Math.round(Math.min(w,h) * r));
  const dp = () => Math.max(2, Math.min(3, window.devicePixelRatio || 2));

  try {
    localStorage.removeItem('metinballCustomCharacterV1');
    localStorage.removeItem('metinballOpenCharacterAfterReload');
    if (localStorage.getItem('metinballCharacter') === 'custom') localStorage.setItem('metinballCharacter','turgut');
  } catch {}
  GameScene.prototype.installCustomCharacterDefinition = function(){};

  function text(scene,x,y,value,size,color='#fff',ox=0,oy=0,opt={}) {
    const t=scene.add.text(x,y,value,{
      fontFamily:opt.bold?'Arial Black, Arial':'Arial, sans-serif',
      fontSize:`${size}px`, fontStyle:opt.bold?'bold':'normal', color,
      align:opt.align||'left', lineSpacing:opt.lineSpacing||0,
      wordWrap:opt.wrap?{width:opt.wrap,useAdvancedWrap:true}:undefined,
      backgroundColor:opt.bg, padding:opt.padding
    }).setOrigin(ox,oy).setDepth(opt.depth||92);
    try{t.setResolution(dp())}catch{}
    return t;
  }
  function button(scene,x,y,w,h,label,primary,fn,size,depth=94){
    const bg=scene.add.rectangle(0,0,w,h,primary?0xffd166:0x12334a,1)
      .setStrokeStyle(Math.max(1,w*.004),primary?0xffe49b:0x2f6384,1)
      .setInteractive({useHandCursor:true});
    const tx=text(scene,0,0,label,size,primary?'#071725':'#fff',.5,.5,{bold:true,align:'center',wrap:w*.88,depth:depth+1});
    const c=scene.add.container(x,y,[bg,tx]).setDepth(depth); bg.on('pointerdown',fn); return c;
  }
  function panel(scene,top,bottom){
    const w=scene.scale.width;
    return scene.add.rectangle(w/2,(top+bottom)/2,w*.95,bottom-top,0x071725,.995)
      .setStrokeStyle(Math.max(1,w*.006),0x3b7297,.96).setDepth(91);
  }

  // -------- TAM RESPONSIVE MOBİL MENÜLER --------
  const desktopMain=GameScene.prototype.showMainMenu;
  GameScene.prototype.showMainMenu=function(){
    if(!phone()) return desktopMain.apply(this,arguments);
    this.clearOverlay(); this.drawProceduralBackground(0);
    this.characters=(this.characters||[]).filter(c=>c.id!=='custom');
    if(!this.characters.some(c=>c.id===this.selected?.id)) this.selected=this.characters[0];
    const w=this.scale.width,h=this.scale.height,m=this.currentMission();
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.72).setDepth(90);
    const top=h*.025,bottom=h*.965,card=panel(this,top,bottom);
    const title=text(this,w/2,h*.075,'METINBALL',fs(w,h,.070),'#ffd166',.5,.5,{bold:true});
    const sub=text(this,w/2,h*.115,'4 KARAKTER • 5 GÖREV',fs(w,h,.026),'#bfffd0',.5,.5,{bold:true});
    const avatarH=h*.17;
    const avatar=this.add.sprite(w*.27,h*.225,this.selected.texture,0).setDepth(92);
    avatar.setDisplaySize(avatarH*(160/276),avatarH);
    const info=text(this,w*.46,h*.17,`KARAKTER\n${this.selected.name}\n\nSEÇİLİ GÖREV\n${this.selectedMission}. ${m.title}`,
      fs(w,h,.029),'#e7f3f8',0,0,{bold:true,wrap:w*.45,lineSpacing:h*.004});
    const bw=w*.86,bh=h*.057,cx=w/2,start=h*.39,gap=h*.071;
    const play=button(this,cx,start,bw,bh,`OYNA • GÖREV ${this.selectedMission}`,true,()=>this.startSelectedMission(),fs(w,h,.031));
    const missions=button(this,cx,start+gap,bw,bh,'GÖREVLER',false,()=>this.showMissionSelect(),fs(w,h,.028));
    const chars=button(this,cx,start+gap*2,bw,bh,'KARAKTER SEÇ',false,()=>this.showCharacterSelect(),fs(w,h,.028));
    const career=button(this,cx,start+gap*3,bw,bh,'KARİYER / BAŞARILAR',false,()=>this.showCareer(),fs(w,h,.026));
    const settings=button(this,w*.29,start+gap*4,w*.40,bh,'AYARLAR',false,()=>this.showSettings(),fs(w,h,.025));
    const exit=button(this,w*.71,start+gap*4,w*.40,bh,'ÇIKIŞ',false,()=>this.exitGame(),fs(w,h,.025));
    this.activeOverlay=[ov,card,title,sub,avatar,info,play,missions,chars,career,settings,exit];
  };

  const desktopMission=GameScene.prototype.showMissionSelect;
  GameScene.prototype.showMissionSelect=function(){
    if(!phone()) return desktopMission.apply(this,arguments);
    this.clearOverlay(); this.drawProceduralBackground(0);
    const w=this.scale.width,h=this.scale.height;
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.80).setDepth(90);
    const top=h*.02,bottom=h*.97,card=panel(this,top,bottom);
    const title=text(this,w/2,h*.065,'GÖREVLER',fs(w,h,.052),'#fff',.5,.5,{bold:true});
    const rowW=w*.88,rowH=h*.105,start=h*.16,gap=h*.018,items=[];
    this.missions.forEach((m,i)=>{
      const y=start+i*(rowH+gap),sel=m.id===this.selectedMission;
      const box=this.add.rectangle(w/2,y,rowW,rowH,0x0b2233,.98).setStrokeStyle(w*.004,sel?0xffd166:0x315d78,1).setInteractive({useHandCursor:true}).setDepth(92);
      const n=text(this,w*.095,y-rowH*.33,String(m.id).padStart(2,'0'),fs(w,h,.026),sel?'#ffd166':'#85a9bf',0,0,{bold:true});
      const name=text(this,w*.17,y-rowH*.34,m.title,fs(w,h,.027),'#fff',0,0,{bold:true,wrap:w*.58});
      const desc=text(this,w*.17,y+rowH*.03,m.subtitle,fs(w,h,.020),'#b8ced9',0,.5,{wrap:w*.60});
      const rec=this.getMissionRecord(m.id);
      const rt=text(this,w*.91,y+rowH*.31,rec?`★ ${rec.stars}/3`:'☆ 0/3',fs(w,h,.021),rec?'#bfffd0':'#7693a4',1,1,{bold:true});
      box.on('pointerdown',()=>{this.selectedMission=m.id;localStorage.setItem('metinballMission',String(m.id));this.showMissionSelect();});
      items.push(box,n,name,desc,rt);
    });
    const by=h*.93;
    const play=button(this,w*.28,by,w*.44,h*.055,'OYNA',true,()=>this.startSelectedMission(),fs(w,h,.027));
    const home=button(this,w*.72,by,w*.44,h*.055,'ANA MENÜ',false,()=>this.showMainMenu(),fs(w,h,.025));
    this.activeOverlay=[ov,card,title,...items,play,home];
  };

  const desktopChar=GameScene.prototype.showCharacterSelect;
  GameScene.prototype.showCharacterSelect=function(){
    if(!phone()) return desktopChar.apply(this,arguments);
    this.characters=(this.characters||[]).filter(c=>c.id!=='custom');
    if(!this.characters.some(c=>c.id===this.selected?.id)) this.selected=this.characters[0];
    this.clearOverlay(); this.drawProceduralBackground(0);
    const w=this.scale.width,h=this.scale.height;
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.82).setDepth(90);
    const card=panel(this,h*.02,h*.97);
    const title=text(this,w/2,h*.065,'KARAKTER SEÇ',fs(w,h,.050),'#fff',.5,.5,{bold:true});
    const cw=w*.41,ch=h*.285,xs=[w*.275,w*.725],ys=[h*.285,h*.60],items=[];
    this.characters.slice(0,4).forEach((c,i)=>{
      const x=xs[i%2],y=ys[Math.floor(i/2)],sel=c.id===this.selected.id;
      const box=this.add.rectangle(x,y,cw,ch,0x0b2233,.98).setStrokeStyle(w*.004,sel?0xffd166:0x315d78,1).setInteractive({useHandCursor:true}).setDepth(92);
      const imH=ch*.50,im=this.add.sprite(x,y-ch*.18,c.texture,0).setDisplaySize(imH*(160/276),imH).setDepth(93);
      const name=text(this,x,y+ch*.13,c.name,fs(w,h,.029),sel?'#ffd166':'#fff',.5,.5,{bold:true});
      const ability=text(this,x,y+ch*.25,c.ability,fs(w,h,.019),'#9ed7f4',.5,.5,{bold:true,wrap:cw*.88,align:'center'});
      const stars=text(this,x,y+ch*.38,`HIZ ${'★'.repeat(c.stars.speed)}\nYAK ${'★'.repeat(c.stars.catch)}\nPUAN ${'★'.repeat(c.stars.score)}`,
        fs(w,h,.018),'#e9f4fa',.5,.5,{align:'center',lineSpacing:h*.002});
      box.on('pointerdown',()=>{this.selected=c;localStorage.setItem('metinballCharacter',c.id);this.showCharacterSelect();});
      items.push(box,im,name,ability,stars);
    });
    const by=h*.92;
    const play=button(this,w*.28,by,w*.44,h*.055,'OYNA',true,()=>this.startSelectedMission(),fs(w,h,.027));
    const home=button(this,w*.72,by,w*.44,h*.055,'ANA MENÜ',false,()=>this.showMainMenu(),fs(w,h,.025));
    this.activeOverlay=[ov,card,title,...items,play,home];
  };

  const desktopCareer=GameScene.prototype.showCareer;
  GameScene.prototype.showCareer=function(){
    if(!phone()) return desktopCareer.apply(this,arguments);
    this.clearOverlay(); const w=this.scale.width,h=this.scale.height;
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.84).setDepth(90),card=panel(this,h*.025,h*.97);
    const title=text(this,w/2,h*.07,`KARİYER • ${this.getCareerStars()}/15 ★`,fs(w,h,.043),'#ffd166',.5,.5,{bold:true});
    const items=[];
    this.missions.forEach((m,i)=>{
      const r=this.getMissionRecord(m.id),y=h*(.16+i*.105),line=r?`${m.id}. ${m.title}\n${r.grade} • ${r.score.toLocaleString('tr-TR')} • ${'★'.repeat(r.stars)}${'☆'.repeat(3-r.stars)}`:`${m.id}. ${m.title}\nKAYIT YOK • ☆☆☆`;
      items.push(text(this,w*.08,y,line,fs(w,h,.024),'#e7f3f8',0,0,{bold:true,wrap:w*.84,lineSpacing:h*.004}));
    });
    const zero=this.missions.filter(m=>this.getMissionRecord(m.id)?.zeroError).length;
    const medal=text(this,w/2,h*.83,`SIFIR HATA MADALYASI ${zero}/5`,fs(w,h,.026),'#bfffd0',.5,.5,{bold:true});
    const back=button(this,w/2,h*.91,w*.86,h*.055,'ANA MENÜ',false,()=>this.showMainMenu(),fs(w,h,.025));
    this.activeOverlay=[ov,card,title,...items,medal,back];
  };

  const desktopSettings=GameScene.prototype.showSettings;
  GameScene.prototype.showSettings=function(){
    if(!phone()) return desktopSettings.apply(this,arguments);
    this.clearOverlay(); const w=this.scale.width,h=this.scale.height;
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.84).setDepth(90);
    const card=this.add.rectangle(w/2,h/2,w*.90,h*.38,0x071725,.998).setStrokeStyle(w*.006,0x3b7297,.96).setDepth(91);
    const title=text(this,w/2,h*.38,'AYARLAR',fs(w,h,.046),'#fff',.5,.5,{bold:true});
    const sound=button(this,w/2,h*.47,w*.76,h*.057,this.soundOn?'SES: AÇIK':'SES: KAPALI',true,()=>{this.toggleSound();this.showSettings();},fs(w,h,.026));
    const info=text(this,w/2,h*.56,'Telefon sürümü ekran ölçüsüne göre otomatik ölçeklenir.',fs(w,h,.022),'#b8ced9',.5,.5,{wrap:w*.75,align:'center'});
    const back=button(this,w/2,h*.64,w*.76,h*.057,'ANA MENÜ',false,()=>this.showMainMenu(),fs(w,h,.025));
    this.activeOverlay=[ov,card,title,sound,info,back];
  };

  // -------- OYUN ALANI: TAM ORANSAL --------
  function hud(scene){
    if(!phone()||!scene?.scale)return;
    const w=scene.scale.width,h=scene.scale.height;
    const set=(o,s,x,y,ox=0,oy=0,wrap=0)=>{if(!o?.active)return;try{o.setScale(1);o.setFontSize(s);o.setPosition(x,y);o.setOrigin(ox,oy);if(wrap)o.setWordWrapWidth(wrap,true);o.setResolution?.(dp())}catch{}};
    const topH=h*.075;
    try{scene.topBar?.setPosition(w/2,topH/2).setSize(w,topH)}catch{}
    set(scene.titleText,fs(w,h,.026),w/2,h*.006,.5,0,w*.58);
    set(scene.scoreText,fs(w,h,.020),w*.02,h*.031,0,0);
    set(scene.timeText,fs(w,h,.020),w*.98,h*.031,1,0);
    set(scene.highText,fs(w,h,.015),w*.02,h*.055,0,0);
    set(scene.errorText,fs(w,h,.016),w*.98,h*.055,1,0);
    set(scene.targetText,fs(w,h,.014),w/2,h*.068,.5,1,w*.60);
    set(scene.countText,fs(w,h,.016),w*.02,h*.088,0,.5);
    set(scene.phaseText,fs(w,h,.016),w/2,h*.088,.5,.5,w*.44);
    set(scene.accuracyText,fs(w,h,.016),w*.98,h*.088,1,.5);
    set(scene.comboText,fs(w,h,.019),w/2,h*.112,.5,.5,w*.7);
    set(scene.specialText,fs(w,h,.016),w/2,h*.132,.5,.5,w*.7);
    if(scene.missionText?.active){set(scene.missionText,fs(w,h,.015),w*.015,h*.84,0,0,w*.34);try{scene.missionText.setPadding(w*.01,h*.004,w*.01,h*.004);scene.missionText.setLineSpacing(0)}catch{}}
    try{scene.bottomBar?.setPosition(w/2,h*.975).setSize(w,h*.05)}catch{}
    set(scene.soundButton,fs(w,h,.015),w*.015,h*.975,0,.5);
    set(scene.menuButton,fs(w,h,.015),w*.985,h*.975,1,.5);
    set(scene.controlsText,fs(w,h,.012),w/2,h*.975,.5,.5,w*.58);
  }

  const catchMul={turgut:1,zeko:1.08,nafi:.84,baki:.92};
  const oldCreatePlayer=GameScene.prototype.createPlayer;
  GameScene.prototype.createPlayer=function(...args){
    const out=oldCreatePlayer.apply(this,args);
    if(phone()){
      const w=this.scale.width,h=this.scale.height,charH=h*.145;
      try{
        this.playerImage.setDisplaySize(charH*(160/276),charH);
        this.playerBaseScaleX=this.playerImage.scaleX; this.playerBaseScaleY=this.playerImage.scaleY;
        this.playerIdleTween?.stop?.(); this.startPlayerIdleAnimation?.();
        this.playerBaseY=h*.93; this.player.y=this.playerBaseY;
        this.playerShadow?.setPosition(this.player.x,h*.945).setScale(.58,.58);
        if(this.selected) this.selected.catchWidth=w*.145*(catchMul[this.selected.id]||1);
        this.playerLabel?.setFontSize(fs(w,h,.016)).setPosition(0,h*.012);
        if(this.weaponPivot){
          const gunScale=(charH/228)*.76;
          this.weaponPivot.setScale(gunScale);
          this.weaponPivot.setPosition(charH*.07,-charH*.57);
        }
      }catch{}
      this.time?.delayedCall?.(0,()=>hud(this));
    }
    return out;
  };

  const oldAttach=GameScene.prototype.attachCodeDrawnWeapon;
  if(typeof oldAttach==='function') GameScene.prototype.attachCodeDrawnWeapon=function(...args){
    const out=oldAttach.apply(this,args);
    if(phone() && this.weaponPivot && this.playerImage){
      const h=this.scale.height,charH=this.playerImage.displayHeight;
      try{this.weaponPivot.setScale((charH/228)*.76);this.weaponPivot.setPosition(charH*.07,-charH*.57)}catch{}
    }
    return out;
  };

  function resizeSprite(scene,sprite,heightRatio){
    if(!sprite?.active)return;
    const h=scene.scale.height,targetH=h*heightRatio,r=sprite.displayWidth/Math.max(1,sprite.displayHeight);
    sprite.setDisplaySize(targetH*r,targetH);
  }
  const spawnRules={
    spawnMission1Item:['m1Items',.074],
    spawnMission2Target:['m2Targets',.080],
    spawnMission3Runner:['m3Runners',.078],
    spawnMission4Invader:['m4Invaders',.080]
  };
  Object.entries(spawnRules).forEach(([name,[arrName,ratio]])=>{
    const old=GameScene.prototype[name]; if(typeof old!=='function')return;
    GameScene.prototype[name]=function(...args){
      const before=this[arrName]?.length||0,out=old.apply(this,args);
      if(phone() && (this[arrName]?.length||0)>before){
        const item=this[arrName][this[arrName].length-1];
        if(item?.sprite){
          resizeSprite(this,item.sprite,item.kind==='boss'?ratio*1.40:ratio);
          if(name==='spawnMission1Item'){
            item.sprite.y=this.scale.height*.12;
            item.ring?.setPosition(item.sprite.x,item.sprite.y).setScale(.55);
            item.badge?.setPosition(item.sprite.x,item.sprite.y-item.sprite.displayHeight*.60).setScale(.70);
          } else { item.ring?.setScale(.62); item.badge?.setScale(.70); }
        }
      }
      return out;
    };
  });

  const oldStart5=GameScene.prototype.startMission5;
  if(typeof oldStart5==='function') GameScene.prototype.startMission5=function(...args){
    const out=oldStart5.apply(this,args);
    if(phone()&&this.boss?.node){try{this.boss.node.setScale(this.scale.height/900*.58);this.boss.node.y=this.scale.height*.24}catch{}}
    return out;
  };
  const oldMinion=GameScene.prototype.spawnBossMinion;
  if(typeof oldMinion==='function') GameScene.prototype.spawnBossMinion=function(...args){
    const before=this.m5Minions?.length||0,out=oldMinion.apply(this,args);
    if(phone()&&(this.m5Minions?.length||0)>before){try{this.m5Minions[this.m5Minions.length-1].node?.setScale(this.scale.height/900*.55)}catch{}}
    return out;
  };

  // Mobilde mermi sınırsız: şarjör boşalmaz, reload yok.
  const desktopReload=GameScene.prototype.reloadWeapon;
  GameScene.prototype.reloadWeapon=function(...args){ if(phone()) return; return desktopReload?.apply(this,args); };
  ['startMission2','startMission5'].forEach(name=>{
    const old=GameScene.prototype[name]; if(typeof old!=='function')return;
    GameScene.prototype[name]=function(...args){const out=old.apply(this,args);if(phone()){this.maxAmmo=999999;this.ammo=999999;this.reloading=false;}return out;};
  });
  ['shootMission2','shootMission5'].forEach(name=>{
    const old=GameScene.prototype[name]; if(typeof old!=='function')return;
    GameScene.prototype[name]=function(...args){if(phone()){this.maxAmmo=999999;this.ammo=999999;this.reloading=false;}const out=old.apply(this,args);if(phone()){this.ammo=999999;this.reloading=false;}return out;};
  });
  const oldAmmo=GameScene.prototype.updateAmmoHud;
  GameScene.prototype.updateAmmoHud=function(...args){
    if(!phone()) return oldAmmo?.apply(this,args);
    if(this.selectedMission===2) this.phaseText?.setText('ATIŞ HATTI • HAZIR');
    if(this.selectedMission===5) this.specialText?.setText('');
  };

  const oldConfig=GameScene.prototype.configureMissionHud;
  if(typeof oldConfig==='function') GameScene.prototype.configureMissionHud=function(...args){
    const out=oldConfig.apply(this,args);
    if(phone()){
      if(this.selectedMission===1)this.controlsText?.setText('Dokun / sürükle: hareket • MENÜ: durdur');
      if(this.selectedMission===2)this.controlsText?.setText('Dokun: nişan + ateş • Sınırsız mermi • MENÜ');
      if(this.selectedMission===3)this.controlsText?.setText('Dokun / sürükle: kovala • MENÜ');
      if(this.selectedMission===4)this.controlsText?.setText('Dokun / sürükle: savun • MENÜ');
      if(this.selectedMission===5)this.controlsText?.setText('Dokun: nişan + ateş • Sınırsız mermi • MENÜ');
      this.time?.delayedCall?.(0,()=>hud(this));
    }
    return out;
  };

  ['buildHud','updateHud','updateTimer'].forEach(name=>{
    const old=GameScene.prototype[name];if(typeof old!=='function')return;
    GameScene.prototype[name]=function(...args){const out=old.apply(this,args);if(phone())this.time?.delayedCall?.(0,()=>hud(this));return out;};
  });

  // -------- SONUÇ VE DURAKLATMA --------
  const desktopResult=GameScene.prototype.showMissionResult;
  GameScene.prototype.showMissionResult=function(accuracy,stars,grade){
    if(!phone()) return desktopResult.apply(this,arguments);
    this.clearOverlay(); const w=this.scale.width,h=this.scale.height,m=this.currentMission();
    const color=grade==='S'?'#72ff8b':grade==='A+'?'#bfffd0':grade==='A'?'#ffd166':grade==='B'?'#ffcf8b':'#ff9aa5';
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.91).setDepth(100);
    const card=panel(this,h*.04,h*.95).setDepth(101);
    const title=text(this,w/2,h*.10,this.missionSuccess?`GÖREV ${m.id} TAMAMLANDI`:`GÖREV ${m.id} TAMAMLANAMADI`,fs(w,h,.042),color,.5,.5,{bold:true,align:'center',wrap:w*.88,depth:102});
    const mn=text(this,w/2,h*.16,`${m.title} • ${'★'.repeat(stars)}${'☆'.repeat(3-stars)}`,fs(w,h,.027),'#fff',.5,.5,{bold:true,wrap:w*.88,align:'center',depth:102});
    const stats=text(this,w*.08,h*.23,`SKOR          ${this.score.toLocaleString('tr-TR')}\nHATA          ${this.missed}\nBAŞARI / ORAN %${accuracy}\nKARAKTER      ${this.selected.name}\nDERECE        ${grade}\nYILDIZ        ${stars}/3`,fs(w,h,.026),'#fff',0,0,{bold:true,lineSpacing:h*.010,depth:102});
    const zero=text(this,w/2,h*.58,this.missed===0?'SIFIR HATA MADALYASI':'HEDEF: SIFIR HATA',fs(w,h,.027),this.missed===0?'#72ff8b':'#ffd166',.5,.5,{bold:true,depth:102});
    const bw=w*.41,bh=h*.058,y1=h*.72,y2=h*.81,nextId=this.selectedMission<5?this.selectedMission+1:1;
    const again=button(this,w*.275,y1,bw,bh,'TEKRAR OYNA',true,()=>this.scene.restart({missionId:this.selectedMission,autoStart:true}),fs(w,h,.024),103);
    const next=button(this,w*.725,y1,bw,bh,this.selectedMission<5?'SONRAKİ GÖREV':'GÖREV 1',false,()=>{localStorage.setItem('metinballMission',String(nextId));this.scene.restart({missionId:nextId,autoStart:true});},fs(w,h,.022),103);
    const missions=button(this,w*.275,y2,bw,bh,'GÖREVLER',false,()=>this.scene.restart({openMissionSelect:true}),fs(w,h,.023),103);
    const home=button(this,w*.725,y2,bw,bh,'ANA MENÜ',false,()=>this.scene.restart({}),fs(w,h,.023),103);
    this.activeOverlay=[ov,card,title,mn,stats,zero,again,next,missions,home];
  };

  const desktopPause=GameScene.prototype.openPauseMenu;
  GameScene.prototype.openPauseMenu=function(){
    if(!phone()) return desktopPause.apply(this,arguments);
    if(!this.started||this.gameOver||this.pausedByMenu)return;
    this.pausedByMenu=true;this.tweens.pauseAll();const w=this.scale.width,h=this.scale.height,m=this.currentMission();
    const ov=this.add.rectangle(w/2,h/2,w,h,0x02070b,.86).setDepth(120);
    const card=this.add.rectangle(w/2,h/2,w*.90,h*.62,0x071725,.998).setStrokeStyle(w*.006,0x3b7297,.98).setDepth(121);
    const title=text(this,w/2,h*.27,'OYUN DURDU',fs(w,h,.043),'#fff',.5,.5,{bold:true,depth:122});
    const ms=text(this,w/2,h*.32,`GÖREV ${m.id} • ${m.title}`,fs(w,h,.022),'#9ed7f4',.5,.5,{bold:true,wrap:w*.80,align:'center',depth:122});
    const bw=w*.76,bh=h*.055,ys=[.40,.48,.56,.64,.72].map(r=>h*r);
    const resume=button(this,w/2,ys[0],bw,bh,'DEVAM ET',true,()=>this.closePauseMenu(),fs(w,h,.025),123);
    const restart=button(this,w/2,ys[1],bw,bh,'YENİDEN BAŞLAT',false,()=>{this.tweens.resumeAll();this.scene.restart({missionId:this.selectedMission,autoStart:true})},fs(w,h,.024),123);
    const missions=button(this,w/2,ys[2],bw,bh,'GÖREVLER',false,()=>{this.tweens.resumeAll();this.stopAllAudio();this.scene.restart({openMissionSelect:true})},fs(w,h,.024),123);
    const home=button(this,w/2,ys[3],bw,bh,'ANA MENÜ',false,()=>{this.tweens.resumeAll();this.stopAllAudio();this.scene.restart({})},fs(w,h,.024),123);
    const exit=button(this,w/2,ys[4],bw,bh,'ÇIKIŞ',false,()=>{this.tweens.resumeAll();this.exitGame()},fs(w,h,.024),123);
    this.pauseObjects=[ov,card,title,ms,resume,restart,missions,home,exit];
  };

  const reflow=()=>{if(!phone())return;setTimeout(()=>{try{const g=window.__METINBALL_GAME__;const s=g?.scene?.getScene?.('GameScene');if(s){hud(s);if(s.playerImage?.active){const h=s.scale.height,charH=h*.145;s.playerImage.setDisplaySize(charH*(160/276),charH);s.playerBaseScaleX=s.playerImage.scaleX;s.playerBaseScaleY=s.playerImage.scaleY;if(s.weaponPivot){s.weaponPivot.setScale((charH/228)*.76);s.weaponPivot.setPosition(charH*.07,-charH*.57)}}}}catch{}},80)};
  window.addEventListener('resize',reflow,{passive:true});
  window.visualViewport?.addEventListener('resize',reflow,{passive:true});
})();
