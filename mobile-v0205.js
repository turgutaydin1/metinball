(() => {
  if (typeof GameScene === 'undefined') return;

  const phone = () => (('ontouchstart' in window) || navigator.maxTouchPoints > 0) && Math.min(window.innerWidth, window.innerHeight) < 900;

  // GÖREV 2: hedef container'ı gerçek nesnedir (node). Ölçek burada tutulur
  // ve updateMission2 içinde her karede korunur; böylece ana oyun kodu ölçeği geri büyütemez.
  const previousSpawnMission2Target = GameScene.prototype.spawnMission2Target;
  if (typeof previousSpawnMission2Target === 'function') {
    GameScene.prototype.spawnMission2Target = function(...args) {
      const before = this.m2Targets?.length || 0;
      const out = previousSpawnMission2Target.apply(this, args);

      if (phone() && (this.m2Targets?.length || 0) > before) {
        const target = this.m2Targets[this.m2Targets.length - 1];
        if (target?.node?.active) {
          const targetHeight = this.scale.height * 0.060;
          const baseScale = targetHeight / 116;
          target.__mobileBaseScale = baseScale;
          target.node.setScale(baseScale);

          // Atış alanı da görsel boyutla aynı oranda küçülür.
          target.radiusX = (target.kind === 'shield' ? 68 : 58) * baseScale;
          target.radiusY = 80 * baseScale;
        }
      }
      return out;
    };
  }

  const previousUpdateMission2 = GameScene.prototype.updateMission2;
  GameScene.prototype.updateMission2 = function(dt) {
    if (!phone()) return previousUpdateMission2.apply(this, arguments);

    for (let i = this.m2Targets.length - 1; i >= 0; i--) {
      const t = this.m2Targets[i];
      if (!t.node?.active || t.dead) continue;

      t.wave += dt * 2.7;
      t.node.x += t.vx * dt + Math.sin(t.wave) * 18 * dt;
      t.node.y += t.vy * dt;
      t.node.angle = Math.sin(t.wave * 1.2) * 4;

      const bob = 1 + Math.sin(t.wave * 1.4) * 0.015;
      const baseScale = t.__mobileBaseScale || (this.scale.height * 0.060 / 116);
      t.__mobileBaseScale = baseScale;
      t.node.setScale(baseScale * bob);

      const sideMargin = Math.max(this.scale.width * 0.055, 65 * baseScale);
      if (t.node.x < sideMargin || t.node.x > this.scale.width - sideMargin) t.vx *= -1;

      if (t.node.y > this.scale.height * 0.855) {
        if (t.kind !== 'civilian') this.registerError(t.penalty, 'SİLAHLI HEDEF KAÇTI');
        this.removeM2(i);
      }
    }
  };

  // GÖREV 5: mobilde global pointer girişini gerçekten yeniden bağla.
  // Bir parmak alt bölgede oyuncuyu hareket ettirirken ikinci parmak üst bölgede ateş eder.
  function bindMobileInput(scene, forceRebind = false) {
    if (!phone() || !scene?.input) return;
    if (scene.__mobileDualInputBound && !forceRebind) return;

    if (forceRebind) {
      try { scene.input.removeAllListeners('pointerdown'); } catch {}
      try { scene.input.removeAllListeners('pointermove'); } catch {}
      try { scene.input.removeAllListeners('pointerup'); } catch {}
      try { scene.input.removeAllListeners('pointerupoutside'); } catch {}
    }

    scene.__mobileDualInputBound = true;
    try { scene.input.addPointer(3); } catch {}

    const movePointers = new Set();
    const playable = () => scene.started && !scene.gameOver && !scene.pausedByMenu;
    const moveZone = p => p.worldY >= scene.scale.height * 0.70;

    scene.input.on('pointerdown', pointer => {
      if (!playable()) return;

      if (scene.selectedMission === 5) {
        if (moveZone(pointer)) {
          movePointers.add(pointer.id);
          if (scene.player) scene.movePlayer(pointer.worldX);
          return;
        }

        if (scene.crosshair) scene.drawCrosshair(pointer.worldX, pointer.worldY);
        scene.aimWeapon(pointer.worldX, pointer.worldY);
        scene.shootMission5(pointer);
        return;
      }

      if (scene.player) scene.movePlayer(pointer.worldX);
      if (scene.selectedMission === 2) {
        if (scene.crosshair) scene.drawCrosshair(pointer.worldX, pointer.worldY);
        scene.aimWeapon(pointer.worldX, pointer.worldY);
        scene.shootMission2(pointer);
      }
    });

    scene.input.on('pointermove', pointer => {
      if (!playable()) return;

      if (scene.selectedMission === 5) {
        if (movePointers.has(pointer.id)) {
          if (scene.player) scene.movePlayer(pointer.worldX);
          return;
        }

        if (pointer.isDown && !moveZone(pointer)) {
          if (scene.crosshair) scene.drawCrosshair(pointer.worldX, pointer.worldY);
          scene.aimWeapon(pointer.worldX, pointer.worldY);
        }
        return;
      }

      if (scene.player) scene.movePlayer(pointer.worldX);
      if (scene.selectedMission === 2 && scene.crosshair) {
        scene.drawCrosshair(pointer.worldX, pointer.worldY);
        scene.aimWeapon(pointer.worldX, pointer.worldY);
      }
    });

    const release = pointer => movePointers.delete(pointer.id);
    scene.input.on('pointerup', release);
    scene.input.on('pointerupoutside', release);
  }

  // Scene henüz yaratılmadıysa registerInput çağrısında doğrudan mobil sistemi kur.
  const desktopRegisterInput = GameScene.prototype.registerInput;
  GameScene.prototype.registerInput = function(...args) {
    if (!phone()) return desktopRegisterInput.apply(this, args);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('A,D,P,F,M,ESC,R');
    this.input.keyboard.on('keydown-P', () => this.openPauseMenu());
    this.input.keyboard.on('keydown-ESC', () => this.openPauseMenu());
    this.input.keyboard.on('keydown-F', () => this.toggleFullscreen());
    this.input.keyboard.on('keydown-M', () => this.toggleSound());
    bindMobileInput(this, false);
  };

  // main.js oyunu bu dosyadan önce başlatmışsa mevcut scene'deki eski tek-pointer
  // dinleyicilerini kaldırıp yeni iki-parmak sistemini bağla.
  const rebindExistingScene = () => {
    if (!phone()) return;
    try {
      const game = window.__METINBALL_GAME__;
      const scene = game?.scene?.getScene?.('GameScene');
      if (scene?.input) bindMobileInput(scene, true);
    } catch {}
  };
  setTimeout(rebindExistingScene, 0);
  setTimeout(rebindExistingScene, 250);
  setTimeout(rebindExistingScene, 900);

  const previousConfigureMissionHud = GameScene.prototype.configureMissionHud;
  if (typeof previousConfigureMissionHud === 'function') {
    GameScene.prototype.configureMissionHud = function(...args) {
      const out = previousConfigureMissionHud.apply(this, args);
      if (phone() && this.selectedMission === 5) {
        this.controlsText?.setText('Alt bölgede sürükle: kaç • Üstte ikinci parmakla dokun: ateş');
      }
      return out;
    };
  }
})();