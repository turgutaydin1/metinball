(() => {
  if (typeof GameScene === 'undefined') return;

  const isPhone = () => ('ontouchstart' in window || navigator.maxTouchPoints > 0) && Math.min(window.innerWidth, window.innerHeight) < 820;

  function crispText(t, size, x, y, ox, oy, wrapWidth) {
    if (!t || !t.active) return;
    try { t.setScale(1,1); } catch {}
    try { t.setFontSize(size); } catch {}
    try { if (typeof x === 'number' && typeof y === 'number') t.setPosition(x,y); } catch {}
    try { if (typeof ox === 'number') t.setOrigin(ox, typeof oy === 'number' ? oy : 0); } catch {}
    try { if (wrapWidth) t.setWordWrapWidth(wrapWidth,true); } catch {}
    try { if (t.style && typeof t.setStroke === 'function' && Number(t.style.strokeThickness||0) > 2) t.setStroke(t.style.stroke || '#071018', 2); } catch {}
    try { t.setResolution?.(Math.max(2, Math.min(3, window.devicePixelRatio || 2))); } catch {}
  }

  function applyGameplayHud(scene) {
    if (!isPhone() || !scene) return;
    const w=scene.scale.width, h=scene.scale.height;

    // Üst alanı yaklaşık 160 px'den 105-115 px bandına indir.
    scene.topBar?.setPosition(w/2,39).setSize(w,78);

    crispText(scene.titleText, 15, w/2, 4, .5, 0, Math.max(205,w*.56));
    crispText(scene.scoreText, 11, 10, 32, 0, 0);
    crispText(scene.timeText, 11, w-10, 32, 1, 0);
    crispText(scene.highText, 8, 10, 51, 0, 0);
    crispText(scene.errorText, 9, w-10, 51, 1, 0);
    crispText(scene.targetText, 8, w/2, 69, .5, 0, w-58);

    // Göreve özel durum satırı: VURULAN / ŞARJÖR / İSABET, BOSS / EVRE / CAN vb.
    crispText(scene.countText, 9, 8, 92, 0, .5);
    crispText(scene.phaseText, 9, w/2, 92, .5, .5, w*.42);
    crispText(scene.accuracyText, 9, w-8, 92, 1, .5);

    crispText(scene.comboText, 12, w/2, 115, .5, .5, w-28);
    crispText(scene.specialText, 10, w/2, 134, .5, .5, w-28);

    // Alt görev kutusu ve kontrol şeridi daha küçük ve okunaklı.
    if (scene.missionText?.active) {
      crispText(scene.missionText, 9, 10, h-142, 0, 0, Math.max(145,w*.43));
      try { scene.missionText.setPadding(6,5,6,5); scene.missionText.setLineSpacing(1); } catch {}
    }
    if (scene.controlsText?.active) crispText(scene.controlsText, 7, w/2, h-51, .5, .5, w-150);
    if (scene.soundButton?.active) crispText(scene.soundButton, 9, 9, h-52, 0, .5);
    if (scene.menuButton?.active) crispText(scene.menuButton, 9, w-9, h-52, 1, .5);

    // Oyuncu adı alt güvenli alana girmesin.
    if (scene.playerNameText?.active) crispText(scene.playerNameText, 9, scene.playerNameText.x, Math.min(scene.playerNameText.y,h-71), .5, .5);
  }

  // Görev 5 boss barı mobil genişliğe ve yeni kompakt HUD'a uyumlu.
  const oldDrawBossBar=GameScene.prototype.drawBossBar;
  if (typeof oldDrawBossBar==='function') {
    GameScene.prototype.drawBossBar=function(...args){
      const out=oldDrawBossBar.apply(this,args);
      if (!isPhone()) return out;
      const w=this.scale.width;
      const y=151, barW=Math.min(w-78,330);
      if (this.bossBarBg) { this.bossBarBg.setPosition(w/2,y); this.bossBarBg.width=barW; }
      if (this.bossBarFill) { this.bossBarFill.setPosition(w/2-barW/2,y); this.bossBarFill.width=barW; }
      if (this.bossBarText) crispText(this.bossBarText,9,w/2,y-18,.5,.5,w-60);
      this.__mobileBossBarWidth=barW;
      return out;
    };
  }

  const oldUpdateBossBar=GameScene.prototype.updateBossBar;
  if (typeof oldUpdateBossBar==='function') {
    GameScene.prototype.updateBossBar=function(...args){
      const out=oldUpdateBossBar.apply(this,args);
      if (isPhone() && this.bossBarFill && this.__mobileBossBarWidth && this.bossMaxHP) {
        const ratio=Phaser.Math.Clamp(this.bossHP/this.bossMaxHP,0,1);
        this.bossBarFill.width=this.__mobileBossBarWidth*ratio;
      }
      return out;
    };
  }

  // HUD'u oluşturan/güncelleyen yolların hepsinde aynı mobil ölçüleri tekrar uygula.
  ['buildHud','configureMissionHud','updateHud','updateTimer','updateAmmoHud'].forEach(name=>{
    const original=GameScene.prototype[name];
    if(typeof original!=='function') return;
    GameScene.prototype[name]=function(...args){
      const out=original.apply(this,args);
      if(isPhone()) this.time?.delayedCall?.(0,()=>applyGameplayHud(this));
      return out;
    };
  });

  // Görev başlangıcından sonra karakter ve görev nesneleri oluşunca son kez uygula.
  ['startSelectedMission','startMission'].forEach(name=>{
    const original=GameScene.prototype[name];
    if(typeof original!=='function') return;
    GameScene.prototype[name]=function(...args){
      const out=original.apply(this,args);
      if(isPhone()) {
        this.time?.delayedCall?.(30,()=>applyGameplayHud(this));
        this.time?.delayedCall?.(180,()=>applyGameplayHud(this));
      }
      return out;
    };
  });

  // Safari yön değişiminde fontları CSS scale ile değil gerçek font boyutuyla yeniden yerleştir.
  window.addEventListener('resize',()=>{
    if(!isPhone()) return;
    setTimeout(()=>{
      try {
        const game=window.__METINBALL_GAME__;
        const scene=game?.scene?.getScene?.('GameScene');
        if(scene) applyGameplayHud(scene);
      } catch {}
    },120);
  },{passive:true});
})();
