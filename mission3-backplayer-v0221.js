(()=>{
  if(typeof GameScene==='undefined') return;

  const BACK_URLS={
    turgut:'./assets/m3_turgut_back.svg?v=0221',
    zeko:'./assets/m3_zeko_back.svg?v=0221',
    nafi:'./assets/m3_nafi_back.svg?v=0221',
    baki:'./assets/m3_baki_back.svg?v=0221'
  };

  const isPhone=()=>{
    try{
      if(navigator.userAgentData?.mobile===true) return true;
      return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'');
    }catch{return false;}
  };

  const previousCreatePlayer=GameScene.prototype.createPlayer;

  function destroyOldM3Figure(scene){
    try{scene.m3RearFigure?.removeAll?.(true)}catch{}
    try{scene.m3RearFigure?.destroy?.()}catch{}
    scene.m3RearFigure=null;
    try{scene.m3Bat?.removeAll?.(true)}catch{}
    try{scene.m3Bat?.destroy?.()}catch{}
    scene.m3Bat=null;
  }

  function buildBat(scene,targetW,targetH){
    const handX=-targetW*.33;
    const handY=-targetH*.55;
    const batLen=targetH*.55;
    const batW=Math.max(12,targetH*.038);
    const bat=scene.add.container(handX,handY).setDepth(28);
    const g=scene.add.graphics();
    g.fillStyle(0x3a2518,1);
    g.fillRoundedRect(-batW*.34,-batLen*.12,batW*.68,batLen*.16,batW*.25);
    g.fillStyle(0x704221,1);
    g.fillRoundedRect(-batW*.42,-batLen,batW*.84,batLen*.91,batW*.38);
    g.fillStyle(0xb97a3c,1);
    g.fillRoundedRect(-batW*.58,-batLen,batW*1.16,batLen*.20,batW*.48);
    g.lineStyle(Math.max(2,batW*.12),0x321d10,.82);
    g.strokeRoundedRect(-batW*.42,-batLen,batW*.84,batLen*.91,batW*.38);
    bat.add(g);
    bat.setRotation(-.22);
    scene.player?.add(bat);
    try{scene.player?.bringToTop(bat)}catch{}
    scene.m3Bat=bat;
    scene.m3BatBaseX=Math.abs(handX);
    scene.m3BatBaseY=handY;
    scene.m3BatRest=.22;
    scene.m3LastSwing=0;
  }

  function applyBackTexture(scene,key){
    if(scene.selectedMission!==3||!scene.playerImage?.active)return;
    try{scene.playerIdleTween?.stop()}catch{}
    try{scene.playerImage.stop?.()}catch{}
    try{scene.playerImage.setTexture(key).setVisible(true).setAlpha(1).clearTint().setAngle(0).setFlipX(false)}catch{}

    const h=scene.scale.height;
    const phone=isPhone();
    // Masaüstünde önceki küçük görüntünün yaklaşık iki katı.
    const targetH=phone?Math.min(285,h*.31):Math.min(355,h*.395);
    const source=scene.textures.get(key).getSourceImage();
    const ratio=(source?.width||280)/Math.max(1,source?.height||520);
    const targetW=targetH*ratio;

    scene.playerImage.setDisplaySize(targetW,targetH);
    scene.playerImage.setPosition(0,-targetH/2);
    scene.playerBaseScaleX=scene.playerImage.scaleX;
    scene.playerBaseScaleY=scene.playerImage.scaleY;
    scene.m3BackTargetH=targetH;
    scene.m3BackTargetW=targetW;

    scene.playerBaseY=phone?h*.925:h-42;
    if(scene.player)scene.player.y=scene.playerBaseY;
    try{scene.playerShadow?.setPosition(scene.player.x,scene.playerBaseY+5).setDisplaySize(Math.max(105,targetW*.72),20)}catch{}
    try{scene.playerLabel?.setText(scene.selected.name).setPosition(0,8)}catch{}

    buildBat(scene,targetW,targetH);
  }

  function ensureBackTexture(scene,id,done){
    const key=`m3_back_${id}_v0221`;
    if(scene.textures.exists(key)){done(key);return;}
    const src=BACK_URLS[id];
    if(!src){done(null);return;}
    const img=new Image();
    img.onload=()=>{
      try{if(!scene.textures.exists(key))scene.textures.addImage(key,img)}catch{}
      done(scene.textures.exists(key)?key:null);
    };
    img.onerror=()=>done(null);
    img.src=src;
  }

  GameScene.prototype.createPlayer=function(withWeapon=false){
    const out=previousCreatePlayer.call(this,withWeapon);
    if(this.selectedMission!==3)return out;

    destroyOldM3Figure(this);
    try{this.weaponPivot?.setVisible(false)}catch{}
    // Öndeki gerçek fotoğraflı sprite kısa bir an bile görünmesin.
    try{this.playerImage?.setVisible(false)}catch{}

    const id=['turgut','zeko','nafi','baki'].includes(this.selected?.id)?this.selected.id:'turgut';
    ensureBackTexture(this,id,key=>{
      if(this.selectedMission!==3||!this.player?.active)return;
      if(key)applyBackTexture(this,key);
    });
    return out;
  };

  GameScene.prototype.m3FaceTarget=function(x){
    if(!this.player||!this.playerImage)return;
    const dir=x<this.player.x?-1:1;
    // Karakter her durumda ARKADAN görünür; yalnız hedef tarafına göre aynalanır.
    try{this.playerImage.setFlipX(dir>0)}catch{}
    if(this.m3Bat){
      this.m3Bat.x=(dir<0?-1:1)*(this.m3BatBaseX||40);
      this.m3Bat.y=this.m3BatBaseY||-150;
      this.m3Bat.setRotation((dir<0?-1:1)*(this.m3BatRest||.22));
    }
  };

  GameScene.prototype.m3SwingBat=function(target,hit){
    const now=this.time.now;
    if(now-(this.m3LastSwing||0)<170)return false;
    this.m3LastSwing=now;
    const x=target?.hole?.x??target?.worldX??this.player.x;
    const dir=x<this.player.x?-1:1;
    this.m3FaceTarget(x);

    const strike=()=>{
      if(!this.m3Bat?.active)return;
      this.tweens.killTweensOf(this.m3Bat);
      this.tweens.add({
        targets:this.m3Bat,
        rotation:-1.30*dir,
        duration:115,
        hold:30,
        yoyo:true,
        ease:'Quad.easeIn',
        onYoyo:()=>{
          if(hit&&target&&!target.resolved)this.m3HitTarget(target,true);
        },
        onComplete:()=>this.m3FaceTarget(x)
      });
      try{this.tweens.add({targets:this.playerImage,angle:-5*dir,duration:90,yoyo:true,ease:'Sine.easeInOut'})}catch{}
    };

    if(this.player){
      const dist=Math.abs(this.player.x-x);
      const dur=Math.min(190,65+dist*.10);
      this.tweens.killTweensOf(this.player);
      this.tweens.add({targets:this.player,x,duration:dur,ease:'Quad.easeOut',onComplete:strike});
      if(this.playerShadow?.active){
        this.tweens.killTweensOf(this.playerShadow);
        this.tweens.add({targets:this.playerShadow,x,duration:dur,ease:'Quad.easeOut'});
      }
    }else strike();
    return true;
  };
})();