(() => {
  if (typeof GameScene === 'undefined') return;

  const isPhone = () => Math.min(window.innerWidth, window.innerHeight) < 700 && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  function fitOverlay(scene) {
    if (!isPhone() || !Array.isArray(scene.activeOverlay) || !scene.activeOverlay.length) return;
    const w = scene.scale.width, h = scene.scale.height;
    const items = scene.activeOverlay.filter(o => {
      if (!o || !o.active || typeof o.getBounds !== 'function') return false;
      const b = o.getBounds();
      // Tam ekran karartma/zemin öğelerini ölçek hesabına katma.
      return !(b.width > w * 0.82 && b.height > h * 0.72);
    });
    if (!items.length) return;

    let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
    for (const o of items) {
      const b=o.getBounds();
      minX=Math.min(minX,b.left); minY=Math.min(minY,b.top);
      maxX=Math.max(maxX,b.right); maxY=Math.max(maxY,b.bottom);
    }
    const bw=Math.max(1,maxX-minX), bh=Math.max(1,maxY-minY);
    const cx=(minX+maxX)/2, cy=(minY+maxY)/2;
    const safeTop=18, safeBottom=74;
    const availW=w-18, availH=h-safeTop-safeBottom;
    const s=Math.min(1, availW/bw, availH/bh);
    const targetCx=w/2, targetCy=safeTop+availH/2;

    for (const o of items) {
      if (typeof o.x==='number') o.x=targetCx+(o.x-cx)*s;
      if (typeof o.y==='number') o.y=targetCy+(o.y-cy)*s;
      if (typeof o.setScale==='function') {
        const sx=(typeof o.scaleX==='number'?o.scaleX:1)*s;
        const sy=(typeof o.scaleY==='number'?o.scaleY:1)*s;
        o.setScale(sx,sy);
      }
    }
  }

  function patchOverlay(name) {
    const original=GameScene.prototype[name];
    if (typeof original!=='function') return;
    GameScene.prototype[name]=function(...args){
      const out=original.apply(this,args);
      if (isPhone()) this.time.delayedCall(0,()=>fitOverlay(this));
      return out;
    };
  }

  ['showMainMenu','showMissionSelect','showCharacterSelect','showCareer','showSettings','showCustomCharacterUploader'].forEach(patchOverlay);

  const oldBuildHud=GameScene.prototype.buildHud;
  GameScene.prototype.buildHud=function(...args){
    const out=oldBuildHud.apply(this,args);
    if (!isPhone()) return out;
    const w=this.scale.width;
    // Telefon dikey görünümünde üst HUD'u üç satıra ayır.
    this.topBar?.setPosition(w/2,54).setSize(w,108);

    this.scoreText?.setPosition(10,8).setFontSize(15).setOrigin(0,0);
    this.highText?.setPosition(10,31).setFontSize(10).setOrigin(0,0);

    this.titleText?.setPosition(w/2,5).setFontSize(18).setOrigin(.5,0);
    this.targetText?.setPosition(w/2,56).setFontSize(10).setOrigin(.5,0).setWordWrapWidth(Math.max(190,w*.62));

    this.timeText?.setPosition(w-10,8).setFontSize(14).setOrigin(1,0);
    this.errorText?.setPosition(w-10,31).setFontSize(11).setOrigin(1,0);

    this.comboText?.setFontSize?.(10);
    this.specialText?.setFontSize?.(10);
    return out;
  };

  // iPhone/Safari: oyun alanında çift dokunma yakınlaştırmasını ve sayfa kaymasını engelle.
  document.documentElement.style.overscrollBehavior='none';
  document.body.style.overscrollBehavior='none';
  const applyCanvasTouch=()=>{
    const c=document.querySelector('canvas');
    if(c){ c.style.touchAction='none'; c.style.maxWidth='100vw'; c.style.maxHeight='100dvh'; }
  };
  setTimeout(applyCanvasTouch,300);
  window.addEventListener('resize',applyCanvasTouch,{passive:true});
})();
