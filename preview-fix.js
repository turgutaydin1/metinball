(() => {
  if (typeof GameScene === 'undefined') return;

  const sizeAvatar = function (img, id, h) {
    if (!img || !img.active) return;

    if (id !== 'custom') {
      try { img.setFrame(0); } catch {}
      img.setDisplaySize(h * (160 / 276), h);
      return;
    }

    const source = this.textures.get(img.texture.key).getSourceImage();
    img.setDisplaySize(h * (source.width / source.height), h);
  };

  GameScene.prototype.sizeSelectionAvatar = function (img, id) {
    sizeAvatar.call(this, img, id, 180);
  };

  GameScene.prototype.sizeMenuAvatar = function (img, id) {
    sizeAvatar.call(this, img, id, 160);
  };
})();
