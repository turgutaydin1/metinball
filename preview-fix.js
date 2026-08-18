(() => {
  if (typeof GameScene === 'undefined') return;

  const isBuiltInCharacter = (id) => ['turgut','zeko','nafi','baki'].includes(id);

  const normalizeAvatar = function (img, id, height) {
    if (!img || !img.active) return;

    if (isBuiltInCharacter(id)) {
      const key = img.texture?.key || `${id}_sheet`;
      try {
        // Karakter seçiminde spritesheet'in tamamını değil yalnızca ilk 160x276 kareyi göster.
        img.setTexture(key, 0);
        img.setFrame(0);
        img.setCrop();
      } catch {}

      const frameW = Number(img.frame?.realWidth || img.frame?.width || 160);
      const frameH = Number(img.frame?.realHeight || img.frame?.height || 276);
      const ratio = frameH > 0 ? frameW / frameH : 160 / 276;
      img.setDisplaySize(height * ratio, height);
      return;
    }

    // Kullanıcının yüklediği özel karakter tek resimdir; kendi oranını koru.
    try {
      const source = this.textures.get(img.texture.key).getSourceImage();
      const ratio = source?.height ? source.width / source.height : 160 / 276;
      img.setDisplaySize(height * ratio, height);
    } catch {
      img.setDisplaySize(height * (160 / 276), height);
    }
  };

  GameScene.prototype.sizeSelectionAvatar = function (img, id) {
    normalizeAvatar.call(this, img, id, 180);
  };

  GameScene.prototype.sizeMenuAvatar = function (img, id) {
    normalizeAvatar.call(this, img, id, 160);
  };

  // Eski/önbellekten gelen ana kod görüntüyü yanlış kurmuş olsa bile
  // karakter seçim ekranı açıldıktan sonra yerleşik karakterleri tekrar düzelt.
  const originalCharacterSelect = GameScene.prototype.showCharacterSelect;
  GameScene.prototype.showCharacterSelect = function (...args) {
    const result = originalCharacterSelect.apply(this, args);

    try {
      const byTexture = new Map((this.characters || []).map(c => [c.texture, c.id]));
      for (const obj of this.activeOverlay || []) {
        const key = obj?.texture?.key;
        const id = byTexture.get(key);
        if (id && isBuiltInCharacter(id)) normalizeAvatar.call(this, obj, id, 180);
      }
    } catch {}

    return result;
  };
})();
