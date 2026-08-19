(()=>{
  if(typeof GameScene==='undefined') return;

  const phone=()=>{
    try{
      if(navigator.userAgentData?.mobile===true) return true;
      return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent||'');
    }catch{return false;}
  };

  const currentMission3CreatePlayer=GameScene.prototype.createPlayer;

  GameScene.prototype.createPlayer=function(withWeapon=false){
    const out=currentMission3CreatePlayer.call(this,withWeapon);
    if(this.selectedMission!==3) return out;

    // v0.21.7'de eklenen yapay/çizilmiş arka görünüş karakterini tamamen sök.
    try{this.m3RearFigure?.removeAll?.(true)}catch{}
    try{this.m3RearFigure?.destroy?.()}catch{}
    this.m3RearFigure=null;

    try{this.m3Bat?.removeAll?.(true)}catch{}
    try{this.m3Bat?.destroy?.()}catch{}
    this.m3Bat=null;

    // PC'de çalışan v0.21.3 davranışı: oyunun gerçek seçili karakterini aynen kullan.
    try{
      this.playerImage?.setVisible(true).setAlpha(1).clearTint().setAngle(0).setFlipX(false);
      if(this.selected?.id!=='custom') this.playerImage?.setTexture(`${this.selected.id}_sheet`,0);
    }catch{}
    try{this.weaponPivot?.setVisible(false)}catch{}

    const h=this.scale.height;
    const ph=this.playerImage?.displayHeight||228;

    if(phone()){
      // Gerçek karakterin oranını bozmadan mobilde kontrollü küçült.
      const targetH=Math.min(ph,h*.245);
      const targetW=this.selected?.id==='custom'
        ? targetH*((this.playerImage?.displayWidth||132)/Math.max(1,ph))
        : targetH*(160/276);
      try{this.playerImage?.setDisplaySize(targetW,targetH)}catch{}
      this.playerBaseY=h*.91;
      if(this.player)this.player.y=this.playerBaseY;
      this.playerShadow?.setY(this.playerBaseY+8);
    }else{
      // PC'de sevilen/çalışan paketle aynı boyut ve zemin konumu.
      this.playerBaseY=h-48;
      if(this.player)this.player.y=this.playerBaseY;
      this.playerShadow?.setY(this.playerBaseY+10);
    }

    this.playerLabel?.setText(this.selected.name);

    // PC v0.21.3'te çalışan sopa: gerçek karakterin el/omuz bölgesine bağlıdır.
    const bat=this.add.container(ph*.18,-ph*.66).setDepth(24);
    const g=this.add.graphics();
    g.fillStyle(0x6e4022,1);
    g.fillRoundedRect(-ph*.026,-ph*.42,ph*.052,ph*.46,ph*.026);
    g.fillStyle(0xb7773a,1);
    g.fillRoundedRect(-ph*.040,-ph*.45,ph*.080,ph*.14,ph*.035);
    g.lineStyle(Math.max(1,ph*.007),0x321d10,.88);
    g.strokeRoundedRect(-ph*.026,-ph*.42,ph*.052,ph*.46,ph*.026);
    bat.add(g);
    bat.setRotation(.25);
    this.player?.add(bat);
    try{this.player?.bringToTop(bat)}catch{}
    this.m3Bat=bat;
    this.m3BatRest=.25;
    this.m3LastSwing=0;

    return out;
  };
})();
