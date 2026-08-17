(() => {
  if (typeof GameScene === 'undefined') return;

  const phone = () => (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && Math.min(window.innerWidth, window.innerHeight) < 900;

  // Görev 2: yalnız bu görevde hedefleri mevcut mobil sürümden yaklaşık %20 daha küçük tut.
  // Diğer görevlerin mevcut oranlarına dokunulmaz.
  const previousSpawnMission2Target = GameScene.prototype.spawnMission2Target;
  if (typeof previousSpawnMission2Target === 'function') {
    GameScene.prototype.spawnMission2Target = function(...args) {
      const before = this.m2Targets?.length || 0;
      const out = previousSpawnMission2Target.apply(this, args);
      if (phone() && (this.m2Targets?.length || 0) > before) {
        const item = this.m2Targets[this.m2Targets.length - 1];
        const sprite = item?.sprite;
        if (sprite?.active) {
          const targetH = this.scale.height * 0.064;
          const ratio = sprite.displayWidth / Math.max(1, sprite.displayHeight);
          sprite.setDisplaySize(targetH * ratio, targetH);
          try { item.ring?.setScale(0.52); } catch {}
          try { item.badge?.setScale(0.62); } catch {}
        }
      }
      return out;
    };
  }

  // Mobil giriş sistemi: Görev 5'te hareket ve ateş aynı anda yapılabilir.
  // Alt oyun bölgesindeki parmak hareket içindir; ikinci parmak üst oyun alanına dokunarak ateş eder.
  const desktopRegisterInput = GameScene.prototype.registerInput;
  GameScene.prototype.registerInput = function(...args) {
    if (!phone()) return desktopRegisterInput.apply(this, args);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,P,F,M,ESC,R');

    this.input.keyboard.on('keydown-P', () => this.openPauseMenu());
    this.input.keyboard.on('keydown-ESC', () => this.openPauseMenu());
    this.input.keyboard.on('keydown-F', () => this.toggleFullscreen());
    this.input.keyboard.on('keydown-M', () => this.toggleSound());

    // Phaser'ın aynı anda birden fazla dokunmayı takip etmesini sağla.
    try { this.input.addPointer(2); } catch {}

    const movePointers = new Set();
    const canPlay = () => this.started && !this.gameOver && !this.pausedByMenu;
    const isMission5MoveZone = pointer => pointer.worldY >= this.scale.height * 0.69;

    this.input.on('pointerdown', pointer => {
      if (!canPlay()) return;

      if (this.selectedMission === 5) {
        if (isMission5MoveZone(pointer)) {
          movePointers.add(pointer.id);
          if (this.player) this.movePlayer(pointer.worldX);
          return;
        }

        if (this.crosshair) this.drawCrosshair(pointer.worldX, pointer.worldY);
        this.aimWeapon(pointer.worldX, pointer.worldY);
        this.shootMission5(pointer);
        return;
      }

      // Diğer görevlerde mevcut mobil davranış korunur.
      if (this.player) this.movePlayer(pointer.worldX);
      if (this.selectedMission === 2) {
        if (this.crosshair) this.drawCrosshair(pointer.worldX, pointer.worldY);
        this.aimWeapon(pointer.worldX, pointer.worldY);
        this.shootMission2(pointer);
      }
    });

    this.input.on('pointermove', pointer => {
      if (!canPlay()) return;

      if (this.selectedMission === 5) {
        if (movePointers.has(pointer.id)) {
          if (this.player) this.movePlayer(pointer.worldX);
          return;
        }

        // Ateş parmağı hareket ettirilirse nişangâhı takip et; ateş pointerdown'da yapılır.
        if (pointer.isDown && !isMission5MoveZone(pointer)) {
          if (this.crosshair) this.drawCrosshair(pointer.worldX, pointer.worldY);
          this.aimWeapon(pointer.worldX, pointer.worldY);
        }
        return;
      }

      if (this.player) this.movePlayer(pointer.worldX);
      if (this.selectedMission === 2 && this.crosshair) {
        this.drawCrosshair(pointer.worldX, pointer.worldY);
        this.aimWeapon(pointer.worldX, pointer.worldY);
      }
    });

    const releasePointer = pointer => movePointers.delete(pointer.id);
    this.input.on('pointerup', releasePointer);
    this.input.on('pointerupoutside', releasePointer);
  };

  // Görev 5 mobil açıklamasını yeni iki-parmak kontrolüne göre düzelt.
  const previousConfigureMissionHud = GameScene.prototype.configureMissionHud;
  if (typeof previousConfigureMissionHud === 'function') {
    GameScene.prototype.configureMissionHud = function(...args) {
      const out = previousConfigureMissionHud.apply(this, args);
      if (phone() && this.selectedMission === 5) {
        this.controlsText?.setText('Alt bölgede sürükle: kaç • Üstte dokun: ateş • 2 parmak destekli');
      }
      return out;
    };
  }
})();
