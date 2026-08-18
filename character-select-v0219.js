(() => {
  if (typeof GameScene === 'undefined') return;

  // Telefonu pencere yüksekliğine göre değil, gerçek dokunmatik/kalın işaretçi
  // ve fiziksel ekran boyutuna göre ayır. Böylece Windows masaüstü tarayıcı
  // yanlışlıkla mobil karakter ekranına düşmez.
  const realPhone = () => {
    const touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const coarse = !!window.matchMedia?.('(pointer: coarse)').matches;
    const sw = Number(window.screen?.width || window.innerWidth || 0);
    const sh = Number(window.screen?.height || window.innerHeight || 0);
    return touch && coarse && Math.min(sw, sh) < 900;
  };

  // Gerçek telefonda mobile-v0204 tarafından kurulan responsive ekranı koru.
  if (realPhone()) return;

  // PC paketindeki çalışan önizleme mantığı.
  GameScene.prototype.sizeSelectionAvatar = function(img,id) {
    const h=180;
    if (id !== 'custom') {
      try { img.setFrame(0); } catch {}
      img.setDisplaySize(h*(160/276),h);
      return;
    }
    const source=this.textures.get(img.texture.key).getSourceImage();
    img.setDisplaySize(h*(source.width/source.height),h);
  };

  GameScene.prototype.sizeMenuAvatar = function(img,id) {
    const h=160;
    if (id !== 'custom') {
      try { img.setFrame(0); } catch {}
      img.setDisplaySize(h*(160/276),h);
      return;
    }
    const source=this.textures.get(img.texture.key).getSourceImage();
    img.setDisplaySize(h*(source.width/source.height),h);
  };

  // PC'de düzgün çalışan paketle aynı karakter seçim ekranı.
  GameScene.prototype.showCharacterSelect = function() {
    this.clearOverlay();
    const w=this.scale.width;
    const h=this.scale.height;

    const overlay=this.add.rectangle(w/2,h/2,w,h,0x02070b,0.78).setDepth(90);
    const panelW=Math.min(1120,w-55);
    const panel=this.add.rectangle(w/2,h/2,panelW,Math.min(620,h-50),0x071725,0.995)
      .setStrokeStyle(3,0x3b7297,0.96).setDepth(91);

    const title=this.add.text(w/2,h/2-270,'KARAKTER SEÇ',{
      fontFamily:'Arial Black, Arial',fontSize:'29px',color:'#ffffff'
    }).setOrigin(0.5).setDepth(92);

    const count=this.characters.length;
    const spacing=(panelW-80)/count;
    const startX=w/2-spacing*(count-1)/2;
    const objects=[overlay,panel,title];

    this.characters.forEach((c,i)=>{
      const x=startX+i*spacing;
      const y=h/2-10;
      const active=c.id===this.selected.id;

      const box=this.add.rectangle(x,y,Math.min(210,spacing-12),405,0x0a2030,0.99)
        .setStrokeStyle(active?4:2,active?0xffd166:0x315f7d,1)
        .setInteractive({useHandCursor:true}).setDepth(92);

      // Kritik fark: yerleşik karakterlerde frame 0 doğrudan oluşturulurken seçilir.
      const img=this.add.image(x,y-118,c.texture,c.id==='custom'?undefined:0).setDepth(93);
      this.sizeSelectionAvatar(img,c.id);

      const name=this.add.text(x,y+3,c.name,{
        fontFamily:'Arial Black, Arial',fontSize:count>4?'17px':'20px',
        color:active?'#ffd166':'#ffffff'
      }).setOrigin(0.5).setDepth(93);

      const ability=this.add.text(x,y+36,c.ability,{
        fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',color:'#9ed7f4'
      }).setOrigin(0.5).setDepth(93);

      const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n);
      const stats=this.add.text(x,y+70,
        `HIZ       ${stars(c.stars.speed)}\n`+
        `YAKALAMA  ${stars(c.stars.catch)}\n`+
        `PUAN      ${stars(c.stars.score)}`,
        {
          fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',
          color:'#e4f3fa',lineSpacing:6
        }
      ).setOrigin(0.5,0).setDepth(93);

      const desc=this.add.text(x,y+150,c.description,{
        fontFamily:'Arial',fontSize:'11px',color:'#b9d2df',
        align:'center',wordWrap:{width:Math.max(145,Math.min(190,spacing-28))}
      }).setOrigin(0.5,0).setDepth(93);

      box.on('pointerdown',()=>{
        this.selected=c;
        localStorage.setItem('metinballCharacter',c.id);
        this.showCharacterSelect();
      });

      objects.push(box,img,name,ability,stats,desc);
    });

    const upload=this.menuButtonWidget(w/2-250,h/2+260,'KARAKTER YÜKLE',()=>this.showCustomCharacterUploader(),false,200,95);
    const play=this.menuButtonWidget(w/2,h/2+260,'OYNA',()=>this.startSelectedMission(),true,200,95);
    const home=this.menuButtonWidget(w/2+250,h/2+260,'ANA MENÜ',()=>this.showMainMenu(),false,200,95);
    objects.push(upload,play,home);
    this.activeOverlay=objects;
  };
})();
