(() => {
  if (typeof GameScene === 'undefined') return;

  const touch = () => ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const isPhone = () => touch() && Math.min(window.innerWidth, window.innerHeight) < 820;
  const isPortrait = () => window.innerHeight >= window.innerWidth;
  const C = {panel:0x071725, line:0x3b7297, ink:'#ffffff', gold:'#ffd166', cyan:'#bfe7ff', dim:'#9db9c9'};

  const txt = (scene,x,y,text,size=16,color=C.ink,opts={}) => scene.add.text(x,y,text,{
    fontFamily:opts.bold?'Arial Black, Arial':'Arial, Helvetica, sans-serif',
    fontSize:`${size}px`, color, fontStyle:opts.bold?'bold':'normal', align:opts.align||'center',
    wordWrap:opts.wrap?{width:opts.wrap,useAdvancedWrap:true}:undefined,
    lineSpacing:opts.lineSpacing||0
  }).setOrigin(opts.ox??0.5,opts.oy??0.5).setDepth(opts.depth||93);

  function button(scene,x,y,w,h,label,cb,primary=false,size=16){
    const box=scene.add.rectangle(0,0,w,h,primary?0xffd166:0x123953,1)
      .setStrokeStyle(2,primary?0xffe49b:0x2b6385,1).setInteractive({useHandCursor:true});
    const labelText=scene.add.text(0,0,label,{fontFamily:'Arial Black, Arial',fontSize:`${size}px`,color:primary?'#07131c':'#ffffff',align:'center'}).setOrigin(.5);
    const c=scene.add.container(x,y,[box,labelText]).setDepth(94);
    box.on('pointerdown',cb);
    return c;
  }

  function shell(scene,titleText){
    scene.clearOverlay(); scene.drawProceduralBackground(0);
    const w=scene.scale.width,h=scene.scale.height,top=72,bottom=82;
    const overlay=scene.add.rectangle(w/2,h/2,w,h,0x02070b,.80).setDepth(90);
    const panel=scene.add.rectangle(w/2,(top+h-bottom)/2,w-18,h-top-bottom,C.panel,.995).setStrokeStyle(3,C.line,.98).setDepth(91);
    const title=txt(scene,w/2,top+42,titleText,26,C.ink,{bold:true});
    return {w,h,top,bottom,objects:[overlay,panel,title]};
  }
  const setActive=(scene,items)=>scene.activeOverlay=items.filter(Boolean);

  const originalMain=GameScene.prototype.showMainMenu;
  GameScene.prototype.showMainMenu=function(){
    if(!isPhone()) return originalMain.apply(this,arguments);
    const s=shell(this,'METINBALL'),{w,top,objects}=s;
    const sub=txt(this,w/2,top+78,'5 GÖREV • CANLI KARAKTERLER • MOBİL UYUMLU',11,'#bfffd0',{bold:true,wrap:w-70});
    const charY=top+175;
    const img=this.add.image(w*.28,charY,this.selected.texture,this.selected.id==='custom'?undefined:0).setDepth(93);
    if(this.selected.id!=='custom') img.setFrame(0);
    const ih=128;
    if(this.selected.id==='custom'){const src=this.textures.get(this.selected.texture).getSourceImage();img.setDisplaySize(ih*(src.width/src.height),ih);}else img.setDisplaySize(ih*(160/276),ih);
    const m=this.currentMission();
    const info=txt(this,w*.58,charY-12,`KARAKTER\n${this.selected.name}\n\nSEÇİLİ GÖREV\n${m.id}. ${m.title}`,15,C.ink,{bold:true,align:'left',ox:0,wrap:w*.36,lineSpacing:4});
    const bw=w-54,bh=54,start=top+285,gap=62;
    const b1=button(this,w/2,start,bw,bh,`OYNA • GÖREV ${this.selectedMission}`,()=>this.startSelectedMission(),true,18);
    const b2=button(this,w/2,start+gap,bw,bh,'GÖREVLER (5)',()=>this.showMissionSelect(),false,16);
    const b3=button(this,w/2,start+gap*2,bw,bh,'KARAKTER SEÇ',()=>this.showCharacterSelect(),false,16);
    const b4=button(this,w/2,start+gap*3,bw,bh,'KENDİ KARAKTERİNİ YÜKLE',()=>this.showCustomCharacterUploader(),false,14);
    const b5=button(this,w/2,start+gap*4,bw,bh,'KARİYER / BAŞARILAR',()=>this.showCareer(),false,15);
    const half=(bw-12)/2;
    const b6=button(this,w/2-half/2-6,start+gap*5,half,bh,'AYARLAR',()=>this.showSettings(),false,15);
    const b7=button(this,w/2+half/2+6,start+gap*5,half,bh,'ÇIKIŞ',()=>this.exitGame(),false,15);
    setActive(this,[...objects,sub,img,info,b1,b2,b3,b4,b5,b6,b7]);
  };

  const originalMission=GameScene.prototype.showMissionSelect;
  GameScene.prototype.showMissionSelect=function(){
    if(!isPhone()) return originalMission.apply(this,arguments);
    const s=shell(this,'GÖREVLER'),{w,h,top,bottom,objects}=s;
    const cardX=w/2,cardW=w-54,cardH=Math.min(116,(h-top-bottom-185)/5),firstY=top+112;
    this.missions.forEach((m,i)=>{
      const y=firstY+i*(cardH+10),active=m.id===this.selectedMission;
      const c=this.add.rectangle(cardX,y,cardW,cardH,0x0a2030,.995).setStrokeStyle(active?3:2,active?0xffd166:0x315f7d,1).setInteractive({useHandCursor:true}).setDepth(92);
      const no=txt(this,cardX-cardW/2+14,y-cardH/2+12,String(m.id).padStart(2,'0'),12,active?C.gold:'#7da5ba',{ox:0,oy:0,bold:true});
      const name=txt(this,cardX,y-cardH*.24,m.title,15,C.ink,{bold:true,wrap:cardW-95});
      const verb=txt(this,cardX,y+2,m.verb,11,'#07131c',{bold:true});verb.setBackgroundColor(active?'#ffd166':'#bfe7ff');verb.setPadding(10,4,10,4);
      const desc=txt(this,cardX,y+cardH*.25,m.subtitle,10,C.dim,{wrap:cardW-34});
      const rec=this.getMissionRecord(m.id),stars=rec?.stars||0;
      const record=txt(this,cardX,y+cardH*.42,rec?`REKOR ${Number(rec.score||0).toLocaleString('tr-TR')} • ${'★'.repeat(stars)}${'☆'.repeat(3-stars)}`:'REKOR YOK • ☆☆☆',10,rec?'#bfffd0':'#7892a1',{bold:true});
      c.on('pointerdown',()=>{this.selectedMission=m.id;localStorage.setItem('metinballMission',String(m.id));this.showMissionSelect();});
      objects.push(c,no,name,verb,desc,record);
    });
    const by=h-bottom-38;
    const play=button(this,w*.29,by,w*.48-8,52,'OYNA',()=>this.startSelectedMission(),true,17);
    const home=button(this,w*.73,by,w*.42-8,52,'ANA MENÜ',()=>this.showMainMenu(),false,15);
    setActive(this,[...objects,play,home]);
  };

  const originalChars=GameScene.prototype.showCharacterSelect;
  GameScene.prototype.showCharacterSelect=function(){
    if(!isPhone()) return originalChars.apply(this,arguments);
    const s=shell(this,'KARAKTER SEÇ'),{w,h,top,bottom,objects}=s;
    const chars=this.characters.slice(0,4),gap=12,cw=(w-54-gap)/2,ch=Math.min(270,(h-top-bottom-245)/2),xs=[18+cw/2,18+cw+gap+cw/2],ys=[top+175,top+175+ch+12];
    chars.forEach((c,i)=>{
      const x=xs[i%2],y=ys[Math.floor(i/2)],active=this.selected?.id===c.id;
      const card=this.add.rectangle(x,y,cw,ch,0x0a2030,.995).setStrokeStyle(active?3:2,active?0xffd166:0x315f7d,1).setInteractive({useHandCursor:true}).setDepth(92);
      const img=this.add.image(x,y-ch*.24,c.texture,c.id==='custom'?undefined:0).setDepth(93);if(c.id!=='custom')img.setFrame(0);
      const ih=Math.min(100,ch*.38);if(c.id==='custom'){const src=this.textures.get(c.texture).getSourceImage();img.setDisplaySize(ih*(src.width/src.height),ih);}else img.setDisplaySize(ih*(160/276),ih);
      const name=txt(this,x,y+ch*.02,c.name,17,active?C.gold:C.ink,{bold:true});
      const ability=txt(this,x,y+ch*.14,c.ability,9,'#9ed0eb',{bold:true,wrap:cw-16});
      const stats=txt(this,x,y+ch*.28,`HIZ ${'★'.repeat(c.stars.speed)}${'☆'.repeat(5-c.stars.speed)}\nYAKALAMA ${'★'.repeat(c.stars.catch)}${'☆'.repeat(5-c.stars.catch)}\nPUAN ${'★'.repeat(c.stars.score)}${'☆'.repeat(5-c.stars.score)}`,9,C.ink,{align:'left',wrap:cw-20,lineSpacing:2});
      const desc=txt(this,x,y+ch*.43,c.description,8,C.dim,{wrap:cw-18});
      card.on('pointerdown',()=>{this.selected=c;localStorage.setItem('metinballCharacter',c.id);this.showCharacterSelect();});objects.push(card,img,name,ability,stats,desc);
    });
    const by=h-bottom-38,third=(w-42)/3;
    const upload=button(this,10+third/2,by,third-6,50,'KARAKTER YÜKLE',()=>this.showCustomCharacterUploader(),false,11);
    const play=button(this,16+third*1.5,by,third-6,50,'OYNA',()=>this.startSelectedMission(),true,15);
    const home=button(this,22+third*2.5,by,third-6,50,'ANA MENÜ',()=>this.showMainMenu(),false,12);
    setActive(this,[...objects,upload,play,home]);
  };

  const originalCareer=GameScene.prototype.showCareer;
  GameScene.prototype.showCareer=function(){
    if(!isPhone()) return originalCareer.apply(this,arguments);
    const s=shell(this,'KARİYER / BAŞARILAR'),{w,h,top,bottom,objects}=s;
    const total=txt(this,w/2,top+82,`TOPLAM ${this.getCareerStars()}/15 ★`,17,C.gold,{bold:true});objects.push(total);
    const rowH=Math.min(105,(h-top-bottom-210)/5),firstY=top+145;
    this.missions.forEach((m,i)=>{const y=firstY+i*(rowH+8),rec=this.getMissionRecord(m.id),stars=rec?.stars||0;const box=this.add.rectangle(w/2,y,w-54,rowH,0x0a2030,.995).setStrokeStyle(2,0x315f7d,1).setDepth(92);const name=txt(this,28,y-rowH*.22,`${m.id}. ${m.title}`,13,C.ink,{bold:true,ox:0,wrap:w-85});const score=txt(this,28,y+rowH*.17,rec?`EN İYİ SKOR ${Number(rec.score||0).toLocaleString('tr-TR')}`:'REKOR YOK',11,C.dim,{ox:0});const st=txt(this,w-28,y+rowH*.17,`${'★'.repeat(stars)}${'☆'.repeat(3-stars)}`,16,stars?C.gold:'#64808f',{ox:1});objects.push(box,name,score,st);});
    const back=button(this,w/2,h-bottom-38,w-70,52,'ANA MENÜ',()=>this.showMainMenu(),false,16);setActive(this,[...objects,back]);
  };

  const originalSettings=GameScene.prototype.showSettings;
  GameScene.prototype.showSettings=function(){
    if(!isPhone()) return originalSettings.apply(this,arguments);
    const s=shell(this,'AYARLAR'),{w,h,top,bottom,objects}=s;
    const info=txt(this,w/2,top+125,'Mobilde oyun dokunmatik olarak çalışır.\nPC ayarları ve oynanış değişmez.',13,C.dim,{wrap:w-70,lineSpacing:5});
    const sound=button(this,w/2,top+235,w-70,58,this.soundOn?'SES: AÇIK':'SES: KAPALI',()=>{this.toggleSound();this.showSettings();},false,16);
    const full=button(this,w/2,top+307,w-70,58,'TAM EKRAN',()=>this.toggleFullscreen(),false,16);
    const back=button(this,w/2,h-bottom-45,w-70,56,'ANA MENÜ',()=>this.showMainMenu(),true,16);setActive(this,[...objects,info,sound,full,back]);
  };

  const originalUploader=GameScene.prototype.showCustomCharacterUploader;
  GameScene.prototype.showCustomCharacterUploader=function(){
    const out=originalUploader.apply(this,arguments);
    if(isPhone()) setTimeout(()=>{const wrap=this.customCharacterUi;if(!wrap)return;wrap.style.padding='12px';wrap.style.boxSizing='border-box';wrap.style.alignItems='flex-start';wrap.style.overflow='auto';const box=wrap.firstElementChild;if(box){box.style.width='94vw';box.style.maxWidth='94vw';box.style.maxHeight='88dvh';box.style.overflowY='auto';box.style.marginTop='4dvh';box.style.boxSizing='border-box';}wrap.querySelectorAll('input,button,select').forEach(el=>{el.style.minHeight='44px';el.style.fontSize='16px';});},0);
    return out;
  };

  function mobileHud(scene){
    if(!isPhone())return;const w=scene.scale.width,h=scene.scale.height;
    scene.topBar?.setPosition(w/2,57).setSize(w,114);scene.titleText?.setPosition(w/2,7).setFontSize(18).setOrigin(.5,0).setWordWrapWidth(w*.62,true);scene.scoreText?.setPosition(12,43).setFontSize(13).setOrigin(0,0);scene.timeText?.setPosition(w-12,43).setFontSize(13).setOrigin(1,0);scene.highText?.setPosition(12,66).setFontSize(9).setOrigin(0,0);scene.errorText?.setPosition(w-12,66).setFontSize(10).setOrigin(1,0);scene.targetText?.setPosition(w/2,87).setFontSize(9).setOrigin(.5,0).setWordWrapWidth(w-70,true);scene.comboText?.setFontSize?.(9);scene.specialText?.setFontSize?.(9);
    if(scene.playerImage?.active&&isPortrait()){const ratio=scene.playerImage.displayWidth/Math.max(1,scene.playerImage.displayHeight),th=Math.min(scene.playerImage.displayHeight,190);scene.playerImage.setDisplaySize(th*ratio,th);}
    try{scene.children.list.filter(o=>o?.type==='Text').forEach(t=>{const s=String(t.text||'');if(s.startsWith('SES:')){t.setPosition(10,h-52).setOrigin(0,.5).setFontSize(9);}else if(s.trim()==='MENÜ'){t.setPosition(w-10,h-52).setOrigin(1,.5).setFontSize(9);}else if(s.includes('Mouse:')||s.includes('SOL TIK')||s.includes('A/D')){t.setPosition(w/2,h-51).setOrigin(.5).setFontSize(7);t.setWordWrapWidth(w-145,true);}else if(/^GÖREV \d/.test(s)&&s.includes('\n')&&t.y>h*.55){t.setPosition(12,h-150).setOrigin(0,0).setFontSize(10);t.setWordWrapWidth(w*.46,true);}});}catch{}
  }

  const oldBuild=GameScene.prototype.buildHud;GameScene.prototype.buildHud=function(){const out=oldBuild.apply(this,arguments);mobileHud(this);return out;};
  const oldStart=GameScene.prototype.startSelectedMission;GameScene.prototype.startSelectedMission=function(){const out=oldStart.apply(this,arguments);if(isPhone())this.time.delayedCall(40,()=>mobileHud(this));return out;};
  function clearObjects(arr){if(!Array.isArray(arr))return;arr.forEach(o=>{try{o.destroy()}catch{}});arr.length=0;}

  const oldPause=GameScene.prototype.openPauseMenu;
  GameScene.prototype.openPauseMenu=function(){
    const out=oldPause.apply(this,arguments);if(!isPhone()||!this.pausedByMenu)return out;
    this.time.delayedCall(0,()=>{clearObjects(this.pauseObjects);const w=this.scale.width,h=this.scale.height;const overlay=this.add.rectangle(w/2,h/2,w,h,0x02070b,.84).setDepth(120);const panel=this.add.rectangle(w/2,h/2,w-34,430,C.panel,.995).setStrokeStyle(3,C.line,1).setDepth(121);const title=txt(this,w/2,h/2-160,'DURAKLATILDI',25,C.ink,{bold:true,depth:122});const b1=button(this,w/2,h/2-80,w-90,54,'DEVAM ET',()=>this.closePauseMenu(),true,16);const b2=button(this,w/2,h/2-15,w-90,54,'YENİDEN BAŞLAT',()=>{this.tweens.resumeAll();this.scene.restart({missionId:this.selectedMission,autoStart:true});},false,15);const b3=button(this,w/2,h/2+50,w-90,54,'GÖREVLER',()=>{this.tweens.resumeAll();this.stopAllAudio();this.scene.restart({openMissionSelect:true});},false,15);const b4=button(this,w/2,h/2+115,w-90,54,'ANA MENÜ',()=>{this.tweens.resumeAll();this.stopAllAudio();this.scene.restart({});},false,15);this.pauseObjects=[overlay,panel,title,b1,b2,b3,b4];});return out;
  };

  const oldFinish=GameScene.prototype.finishMission;
  GameScene.prototype.finishMission=function(){
    const out=oldFinish.apply(this,arguments);if(!isPhone())return out;
    this.time.delayedCall(0,()=>{clearObjects(this.activeOverlay);const w=this.scale.width,h=this.scale.height,m=this.currentMission(),rec=this.getMissionRecord(m.id),stars=rec?.stars||0,acc=this.getAccuracy?.()??0;const overlay=this.add.rectangle(w/2,h/2,w,h,0x02070b,.86).setDepth(100);const panel=this.add.rectangle(w/2,h/2,w-28,h-150,C.panel,.995).setStrokeStyle(3,C.line,1).setDepth(101);const headline=txt(this,w/2,125,this.missionSuccess?`GÖREV ${m.id} TAMAMLANDI`:`GÖREV ${m.id} TAMAMLANAMADI`,24,this.missionSuccess?C.gold:'#ff9aa5',{bold:true,wrap:w-55,depth:102});const sub=txt(this,w/2,185,`${m.title} • ${'★'.repeat(stars)}${'☆'.repeat(3-stars)}`,17,C.ink,{bold:true,wrap:w-60,depth:102});const stats=txt(this,42,285,`SKOR\nHATA\nBAŞARI / ORAN\nKARAKTER\nYILDIZ`,15,C.ink,{bold:true,align:'left',ox:0,oy:0,depth:102,lineSpacing:16});const vals=txt(this,w*.48,285,`${Number(this.score||0).toLocaleString('tr-TR')}\n${this.missed||0}\n%${acc}\n${this.selected?.name||'-'}\n${stars}/3`,15,C.ink,{bold:true,align:'left',ox:0,oy:0,depth:102,lineSpacing:16});let specific='';if(m.id===1)specific=`Yakalanan ${this.caught} • En iyi kombo x${this.bestCombo}`;if(m.id===2)specific=`Vurulan ${this.caught} • Atış ${this.shots} • İsabet %${acc}`;if(m.id===3)specific=`Yakalanan ${this.caught}`;if(m.id===4)specific=`Ofis bütünlüğü %${Math.max(0,Math.round(this.officeIntegrity||0))}`;if(m.id===5)specific=`Boss canı ${Math.max(0,Math.round(this.bossHP||0))}`;const detail=txt(this,w/2,520,specific,12,C.dim,{wrap:w-70,depth:102});const bw=(w-66)/2,x1=22+bw/2,x2=44+bw+bw/2;const r=button(this,x1,h-270,bw,54,'TEKRAR OYNA',()=>this.scene.restart({missionId:m.id,autoStart:true}),true,13);const n=button(this,x2,h-270,bw,54,'SONRAKİ GÖREV',()=>{const id=m.id>=5?1:m.id+1;localStorage.setItem('metinballMission',String(id));this.scene.restart({missionId:id,autoStart:true});},false,12);const ms=button(this,x1,h-205,bw,54,'GÖREVLER',()=>this.scene.restart({openMissionSelect:true}),false,13);const hm=button(this,x2,h-205,bw,54,'ANA MENÜ',()=>this.scene.restart({}),false,13);this.activeOverlay=[overlay,panel,headline,sub,stats,vals,detail,r,n,ms,hm];});return out;
  };

  function syncViewport(){if(!isPhone())return;const app=document.getElementById('app'),vh=window.visualViewport?.height||window.innerHeight;if(app){app.style.height=`${vh}px`;app.style.maxHeight=`${vh}px`;}const c=document.querySelector('canvas');if(c){c.style.touchAction='none';c.style.maxWidth='100vw';c.style.maxHeight='100dvh';}}
  document.documentElement.style.overscrollBehavior='none';document.body.style.overscrollBehavior='none';syncViewport();window.visualViewport?.addEventListener('resize',syncViewport,{passive:true});window.addEventListener('resize',syncViewport,{passive:true});
})();
