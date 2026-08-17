(() => {
  if (typeof GameScene === 'undefined') return;

  const isPhone = () => Math.min(window.innerWidth, window.innerHeight) < 700 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);
  const originals = new WeakMap();

  const textOf = o => {
    if (!o) return '';
    if (typeof o.text === 'string') return o.text;
    if (Array.isArray(o.list)) {
      const t=o.list.find(x=>typeof x?.text==='string');
      return t?.text||'';
    }
    return '';
  };

  function remember(o){
    if(!o || originals.has(o)) return;
    originals.set(o,{
      x:o.x,y:o.y,scaleX:o.scaleX,scaleY:o.scaleY,
      displayWidth:o.displayWidth,displayHeight:o.displayHeight,
      visible:o.visible,
      fontSize:typeof o.style?.fontSize!=='undefined'?o.style.fontSize:null
    });
  }

  function restore(o){
    const s=originals.get(o); if(!s||!o?.active)return;
    if(typeof s.x==='number')o.x=s.x;if(typeof s.y==='number')o.y=s.y;
    if(typeof o.setScale==='function')o.setScale(s.scaleX??1,s.scaleY??1);
    if(typeof o.setVisible==='function')o.setVisible(s.visible!==false);
    if(s.fontSize!=null&&typeof o.setFontSize==='function')o.setFontSize(s.fontSize);
  }

  function objects(scene){return Array.isArray(scene.activeOverlay)?scene.activeOverlay.filter(o=>o&&o.active):[];}
  function allTexts(scene){return objects(scene).flatMap(o=>Array.isArray(o.list)?o.list.filter(x=>typeof x?.text==='string'):(typeof o.text==='string'?[o]:[]));}
  function labelHas(scene,s){s=s.toUpperCase();return allTexts(scene).some(t=>String(t.text).toUpperCase().includes(s));}
  function isBigBg(o,w,h){
    if(typeof o.getBounds!=='function')return false;const b=o.getBounds();return b.width>w*.82&&b.height>h*.70;
  }
  function setFont(o,n){try{o.setFontSize(n)}catch{}}
  function wrap(o,w){try{o.setWordWrapWidth(w,true)}catch{}}

  function fitGeneric(scene, padX=14, top=92, bottom=92){
    const w=scene.scale.width,h=scene.scale.height, list=objects(scene);
    list.forEach(remember); list.forEach(restore);
    const items=list.filter(o=>typeof o.getBounds==='function'&&!isBigBg(o,w,h));
    if(!items.length)return;
    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for(const o of items){const b=o.getBounds();minX=Math.min(minX,b.left);minY=Math.min(minY,b.top);maxX=Math.max(maxX,b.right);maxY=Math.max(maxY,b.bottom);}
    const bw=Math.max(1,maxX-minX),bh=Math.max(1,maxY-minY),cx=(minX+maxX)/2,cy=(minY+maxY)/2;
    const availW=w-padX*2,availH=h-top-bottom;
    const s=Math.min(1,availW/bw,availH/bh);
    const tx=w/2,ty=top+availH/2;
    for(const o of items){
      o.x=tx+(o.x-cx)*s;o.y=ty+(o.y-cy)*s;
      if(typeof o.setScale==='function')o.setScale((o.scaleX||1)*s,(o.scaleY||1)*s);
    }
    const panels=list.filter(o=>o.type==='Rectangle'&&typeof o.width==='number'&&o.width>w*.55&&o.height>h*.45&&!isBigBg(o,w,h));
    panels.forEach(p=>{p.setPosition(w/2,(top+h-bottom)/2);p.setDisplaySize(w-18,h-top-bottom);});
  }

  function placeButton(scene,label,x,y,scale=.82){
    const root=objects(scene).find(o=>textOf(o).trim().toUpperCase()===label);
    if(!root)return;remember(root);root.x=x;root.y=y;if(typeof root.setScale==='function')root.setScale(scale);
  }

  function layoutCharacters(scene){
    const w=scene.scale.width,h=scene.scale.height,list=objects(scene);list.forEach(remember);list.forEach(restore);
    const cards=list.filter(o=>o.type==='Rectangle'&&o.width>=120&&o.width<=260&&o.height>=280&&o.height<=470).sort((a,b)=>a.x-b.x);
    if(cards.length<4){fitGeneric(scene);return;}
    const cw=Math.min(168,w*.42),ch=Math.min(245,h*.29);
    const xs=[w*.27,w*.73],ys=[h*.31,h*.62];
    cards.slice(0,4).forEach((card,i)=>{
      const ox=card.x,oy=card.y,tx=xs[i%2],ty=ys[Math.floor(i/2)];
      card.setPosition(tx,ty).setDisplaySize(cw,ch);
      const members=list.filter(o=>o!==card&&Math.abs((originals.get(o)?.x??o.x)-ox)<125&&Math.abs((originals.get(o)?.y??o.y)-oy)<230&&!cards.includes(o));
      const texts=members.filter(o=>typeof o.text==='string');
      const img=members.find(o=>o.type==='Image'||o.type==='Sprite');
      if(img){img.setPosition(tx,ty-ch*.24);try{img.setFrame(0)}catch{};const ih=Math.min(112,ch*.46);img.setDisplaySize(ih*(160/276),ih);}
      const charName=texts.find(t=>['TURGUT','ZEKO','NAFİ','NAFI','BAKİ','BAKI'].includes(String(t.text).trim().toUpperCase()));
      if(charName){charName.setPosition(tx,ty+ch*.07).setOrigin(.5);setFont(charName,14);}
      const ability=texts.find(t=>t!==charName&&String(t.text).length<28&&(String(t.text).includes('REFLEKS')||String(t.text).includes('ELLER')||String(t.text).includes('ADIM')||String(t.text).includes('UZMAN')));
      if(ability){ability.setPosition(tx,ty+ch*.18).setOrigin(.5);setFont(ability,8);}
      const stats=texts.find(t=>String(t.text).includes('HIZ')&&String(t.text).includes('PUAN'));
      if(stats){stats.setPosition(tx-cw*.42,ty+ch*.27).setOrigin(0,0);setFont(stats,7);wrap(stats,cw*.84);}
      texts.forEach(t=>{if(t!==charName&&t!==ability&&t!==stats&&String(t.text).length>35)t.setVisible(false);});
    });
    const title=allTexts(scene).find(t=>String(t.text).trim().toUpperCase()==='KARAKTER SEÇ');if(title){title.setPosition(w/2,h*.105).setOrigin(.5);setFont(title,24);}
    placeButton(scene,'KARAKTER YÜKLE',w*.18,h*.84,.70);placeButton(scene,'OYNA',w*.50,h*.84,.78);placeButton(scene,'ANA MENÜ',w*.82,h*.84,.70);
    list.filter(o=>o.type==='Rectangle'&&o.width>w*.6&&o.height>h*.55&&!isBigBg(o,w,h)).forEach(p=>p.setPosition(w/2,h*.50).setDisplaySize(w-18,h*.82));
  }

  function layoutMissions(scene){
    const w=scene.scale.width,h=scene.scale.height,list=objects(scene);list.forEach(remember);list.forEach(restore);
    const cards=list.filter(o=>o.type==='Rectangle'&&o.width>=150&&o.height>=120&&o.height<=330&&o.width<w*.95).sort((a,b)=>(a.y-b.y)||(a.x-b.x));
    if(cards.length<5){fitGeneric(scene);return;}
    const cw=(w-34)/2,ch=Math.min(145,h*.155),xs=[w*.27,w*.73],ys=[h*.28,h*.47,h*.66];
    cards.slice(0,5).forEach((card,i)=>{
      const ox=card.x,oy=card.y,tx=xs[i%2],ty=ys[Math.floor(i/2)];card.setPosition(tx,ty).setDisplaySize(cw,ch);
      const members=list.filter(o=>o!==card&&!cards.includes(o)&&Math.abs((originals.get(o)?.x??o.x)-ox)<card.width*.62&&Math.abs((originals.get(o)?.y??o.y)-oy)<card.height*.75);
      members.forEach(o=>{const s=.67;o.x=tx+((originals.get(o)?.x??o.x)-ox)*s;o.y=ty+((originals.get(o)?.y??o.y)-oy)*s;if(typeof o.setScale==='function')o.setScale(s);if(typeof o.text==='string'){setFont(o,Math.min(10,Number.parseFloat(o.style?.fontSize)||10));wrap(o,cw-14);}});
    });
    const title=allTexts(scene).find(t=>String(t.text).trim().toUpperCase()==='GÖREVLER');if(title){title.setPosition(w/2,h*.11).setOrigin(.5);setFont(title,25);}
    placeButton(scene,'OYNA',w*.31,h*.84,.78);placeButton(scene,'ANA MENÜ',w*.69,h*.84,.78);
    list.filter(o=>o.type==='Rectangle'&&o.width>w*.6&&o.height>h*.55&&!isBigBg(o,w,h)).forEach(p=>p.setPosition(w/2,h*.50).setDisplaySize(w-18,h*.82));
  }

  function layoutResult(scene){
    fitGeneric(scene,12,115,105);
    const w=scene.scale.width,h=scene.scale.height;
    allTexts(scene).forEach(t=>{const s=String(t.text).toUpperCase();if(s.includes('TAMAMLANDI')||s.includes('BAŞARISIZ')){setFont(t,Math.min(24,Number.parseFloat(t.style?.fontSize)||24));wrap(t,w-32);t.setOrigin(.5);t.x=w/2;}});
    placeButton(scene,'TEKRAR OYNA',w*.26,h*.76,.68);placeButton(scene,'SONRAKİ GÖREV',w*.74,h*.76,.68);placeButton(scene,'GÖREVLER',w*.26,h*.84,.68);placeButton(scene,'ANA MENÜ',w*.74,h*.84,.68);
  }

  function layoutOverlay(scene){
    if(!isPhone()||!objects(scene).length)return;
    if(labelHas(scene,'KARAKTER SEÇ'))return layoutCharacters(scene);
    if(labelHas(scene,'GÖREVLER')&&!labelHas(scene,'KARİYER'))return layoutMissions(scene);
    if(labelHas(scene,'TAMAMLANDI')||labelHas(scene,'BAŞARISIZ'))return layoutResult(scene);
    return fitGeneric(scene,14,100,100);
  }

  function mobileHud(scene){
    if(!isPhone())return;const w=scene.scale.width,h=scene.scale.height;
    scene.topBar?.setPosition(w/2,55).setSize(w,110);
    scene.titleText?.setPosition(w/2,5).setFontSize(17).setOrigin(.5,0).setWordWrapWidth(w*.56,true);
    scene.scoreText?.setPosition(10,36).setFontSize(13).setOrigin(0,0);
    scene.timeText?.setPosition(w-10,36).setFontSize(13).setOrigin(1,0);
    scene.highText?.setPosition(10,58).setFontSize(9).setOrigin(0,0);
    scene.errorText?.setPosition(w-10,58).setFontSize(10).setOrigin(1,0);
    scene.targetText?.setPosition(w/2,80).setFontSize(9).setOrigin(.5,0).setWordWrapWidth(w-80,true);
    scene.comboText?.setFontSize?.(9);scene.specialText?.setFontSize?.(9);

    // Oyun içi alt çubukları Safari'nin araç çubuğundan uzaklaştır.
    try{
      scene.children.list.filter(o=>o?.type==='Text').forEach(t=>{
        const s=String(t.text||'');
        if(t.y>h-75){
          if(s.startsWith('SES:')){t.setPosition(8,h-56).setOrigin(0,.5);setFont(t,9);}
          else if(s.trim()==='MENÜ'){t.setPosition(w-8,h-56).setOrigin(1,.5);setFont(t,9);}
          else if(s.includes('Mouse:')||s.includes('A/D')||s.includes('SOL TIK')){t.setPosition(w/2,h-55).setOrigin(.5);setFont(t,7);wrap(t,w-125);}
        }
      });
    }catch{}
  }

  function after(scene){if(!isPhone())return;scene.time?.delayedCall?.(20,()=>{layoutOverlay(scene);mobileHud(scene);});}

  // Sadece mobilde çalışır; masaüstü metotlarına davranış değişikliği getirmez.
  Object.getOwnPropertyNames(GameScene.prototype).forEach(name=>{
    if(!/^(show|open|finish|togglePause|startSelectedMission|startMission)/.test(name))return;
    const original=GameScene.prototype[name];if(typeof original!=='function'||original.__mobileWrapped)return;
    const wrapped=function(...args){const out=original.apply(this,args);after(this);return out;};wrapped.__mobileWrapped=true;GameScene.prototype[name]=wrapped;
  });

  const oldBuildHud=GameScene.prototype.buildHud;
  if(typeof oldBuildHud==='function')GameScene.prototype.buildHud=function(...args){const out=oldBuildHud.apply(this,args);mobileHud(this);return out;};

  // Yön değişiminde oyun sahnesini yeniden başlatmadan arayüzü yeniden yerleştir.
  window.addEventListener('resize',()=>{
    if(!isPhone())return;
    setTimeout(()=>{
      const canvas=document.querySelector('canvas');if(canvas){canvas.style.touchAction='none';canvas.style.maxWidth='100vw';canvas.style.maxHeight='100dvh';}
    },50);
  },{passive:true});

  document.documentElement.style.overscrollBehavior='none';document.body.style.overscrollBehavior='none';
  const syncVisualViewport=()=>{
    if(!isPhone())return;const app=document.getElementById('app');if(!app)return;
    const vh=window.visualViewport?.height||window.innerHeight;app.style.height=`${vh}px`;app.style.maxHeight=`${vh}px`;
    const c=document.querySelector('canvas');if(c)c.style.touchAction='none';
  };
  syncVisualViewport();window.visualViewport?.addEventListener('resize',syncVisualViewport,{passive:true});
})();
