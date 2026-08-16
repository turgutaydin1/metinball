// @ts-nocheck

class GameScene extends Phaser.Scene {
  constructor() {
    super('GameScene')

    this.characters = [
      {
        id:'turgut', name:'TURGUT', texture:'turgut_sheet',
        speed:790, catchWidth:120, scoreMul:1.12,
        ability:'USTA REFLEKSİ',
        description:'Dengeli ve güçlü. Her görevde ilk normal hatayı engeller.',
        stars:{speed:5,catch:5,score:5}
      },
      {
        id:'zeko', name:'ZEKO', texture:'zeko_sheet',
        speed:745, catchWidth:128, scoreMul:1.00,
        ability:'GÜVENLİ ELLER',
        description:'En geniş yakalama ve hedef toleransına sahip karakter.',
        stars:{speed:4,catch:5,score:3}
      },
      {
        id:'nafi', name:'NAFİ', texture:'nafi_sheet',
        speed:880, catchWidth:98, scoreMul:1.05,
        ability:'HIZLI ADIM',
        description:'En hızlı hareket ve en seri ateş avantajına sahip.',
        stars:{speed:5,catch:4,score:3}
      },
      {
        id:'baki', name:'BAKİ', texture:'baki_sheet',
        speed:710, catchWidth:108, scoreMul:1.25,
        ability:'KOMBO UZMANI',
        description:'Kombo ve kritik seri puanlarında en yüksek kazanç.',
        stars:{speed:4,catch:4,score:5}
      }
    ]

    this.missions = [
      {
        id:1, title:'METİN YAĞMURU', verb:'YAKALA',
        subtitle:'Düşen Metinleri yakala, tuzaklardan kaç.',
        duration:75
      },
      {
        id:2, title:'SİLAHLI METİN BASKINI', verb:'VUR',
        subtitle:'Silahlı hedefleri vur. Silahsız Metinlere ateş etme.',
        duration:70
      },
      {
        id:3, title:'METİN KAÇIYOR', verb:'KOVALA',
        subtitle:'Sağa-sola kaçan Metinleri süre dolmadan yakala.',
        duration:65
      },
      {
        id:4, title:'OFİSİ KORU', verb:'SAVUN',
        subtitle:'Masa, belgeler ve bilgisayara ulaşmalarını engelle.',
        duration:70
      },
      {
        id:5, title:'BÜYÜK METİN', verb:'BOSS',
        subtitle:'Büyük Metin ve gönderdiği minyonlara karşı son savaş.',
        duration:90
      }
    ]

    this.selected = null
    this.selectedMission = 1
    this.bg = null
    this.bgObjects = []
    this.activeOverlay = []
    this.pauseObjects = []
    this.dynamic = []
    this.player = null
    this.playerImage = null
    this.playerWeapon = null
    this.crosshair = null
    this.spawnEvent = null
    this.secondEvent = null
    this.extraEvents = []
    this.customCharacterData = null
    this.customCharacterUi = null
  }

  preload() {
    // v0.19.x sevilen karakterler ve orijinal Mini Metinler
    for (const id of ['turgut','zeko','nafi','baki']) this.load.spritesheet(`${id}_sheet`,`./assets/${id}_sheet.webp`,{frameWidth:160,frameHeight:276})

    // v0.19.5: özel karakter + portable USB durum senkronu (bridge üzerinden)
    try {
      const raw=localStorage.getItem('metinballCustomCharacterV1')
      if (raw) {
        const custom=JSON.parse(raw)
        if (custom?.idle) {
          this.customCharacterData=custom
          const idle=custom.idle
          const catchPose=custom.catchPose||idle
          const aimPose=custom.aimPose||catchPose||idle

          this.load.image('custom',idle)
          this.load.image('custom_run1',idle)
          this.load.image('custom_run2',idle)
          this.load.image('custom_catch1',catchPose)
          this.load.image('custom_catch2',catchPose)
          this.load.image('custom_aim',aimPose)
          this.load.image('custom_fire',aimPose)
          this.load.image('custom_reload1',aimPose)
          this.load.image('custom_reload2',aimPose)
          this.load.image('custom_hit',idle)
        }
      }
    } catch {}

    this.load.spritesheet('miniSheet','./assets/mini_metin_sheet.webp',{frameWidth:180,frameHeight:270})

    this.load.audio('music','./audio/music_loop.wav')
    this.load.audio('catch','./audio/catch.wav')
    this.load.audio('miss','./audio/miss.wav')
    this.load.audio('combo','./audio/combo.wav')
    this.load.audio('countdown','./audio/countdown.wav')
    this.load.audio('start','./audio/start.wav')
    this.load.audio('resultGood','./audio/result_good.wav')
    this.load.audio('resultTry','./audio/result_try.wav')
    this.load.audio('bonus','./audio/bonus.wav')
    this.load.audio('danger','./audio/danger.wav')
    this.load.audio('gunshot','./audio/gunshot.wav')
    this.load.audio('reload','./audio/reload.wav')
    this.load.audio('shieldBreak','./audio/shield_break.wav')
    this.load.audio('enemyExplode','./audio/enemy_explode.wav')
    this.load.audio('bossHit','./audio/boss_hit.wav')
    this.load.audio('bossExplode','./audio/boss_explode.wav')
    this.load.audio('step','./audio/step.wav')
  }

  create(data={}) {
    this.installCustomCharacterDefinition()

    const savedId=localStorage.getItem('metinballCharacter')||'turgut'
    this.selected=this.characters.find(c=>c.id===savedId)||this.characters[0]

    this.selectedMission=Number(
      data.missionId ||
      localStorage.getItem('metinballMission') ||
      1
    )
    if (!this.missions.some(m=>m.id===this.selectedMission)) this.selectedMission=1

    const savedSound=localStorage.getItem('metinballSound')
    this.soundOn=savedSound!=='off'
    this.sound.mute=!this.soundOn

    this.resetGameplayState()
    this.drawProceduralBackground(0)
    this.buildHud()
    this.registerInput()

    const pendingCustomOpen=localStorage.getItem('metinballOpenCharacterAfterReload')==='1'
    if (pendingCustomOpen) localStorage.removeItem('metinballOpenCharacterAfterReload')

    if (data.autoStart) this.startSelectedMission()
    else if (data.openMissionSelect) this.showMissionSelect()
    else if (data.openCharacterSelect || pendingCustomOpen) this.showCharacterSelect()
    else if (data.openCareer) this.showCareer()
    else this.showMainMenu()
  }

  installCustomCharacterDefinition() {
    if (!this.customCharacterData?.idle) return
    if (this.characters.some(c=>c.id==='custom')) return

    const cleanName=String(this.customCharacterData.name||'ÖZEL KARAKTER').trim().slice(0,18).toUpperCase() || 'ÖZEL KARAKTER'
    this.characters.push({
      id:'custom',
      name:cleanName,
      texture:'custom',
      speed:790,
      catchWidth:116,
      scoreMul:1.08,
      ability:'KİŞİSEL KARAKTER',
      description:'Yüklediğin fotoğraflardan oluşturulan kişisel yakalayıcı.',
      stars:{speed:4,catch:4,score:4}
    })
  }

  resetGameplayState() {
    this.dynamic=[]
    this.activeOverlay=[]
    this.pauseObjects=[]

    this.score=0
    this.caught=0
    this.missed=0
    this.combo=0
    this.bestCombo=0
    this.perfectCatches=0
    this.shots=0
    this.hits=0

    this.secondsLeft=75
    this.elapsedSeconds=0
    this.maxRoundSeconds=105
    this.phase=1

    this.started=false
    this.gameOver=false
    this.pausedByMenu=false
    this.fever=false
    this.firstErrorShield=true

    this.ammo=0
    this.maxAmmo=0
    this.reloading=false
    this.lastShotAt=0

    this.m1Items=[]
    this.m2Targets=[]
    this.m3Runners=[]
    this.m4Invaders=[]
    this.m5Minions=[]
    this.m5Projectiles=[]

    this.officeHealth=[100,100,100]
    this.officeIntegrity=100

    this.boss=null

    // v0.15 karakter animasyon durumu
    this.playerAnimToken=0
    this.playerLean=0
    this.weaponPivot=null
    this.weaponGun=null
    this.lastAimX=0
    this.lastAimY=0
    this.playerBaseScaleX=1
    this.playerBaseScaleY=1
    this.playerBaseY=0
    this.playerMoveBob=0
    this.playerMoving=false
    this.playerActionLockUntil=0
    this.playerIdleTween=null
    this.runFrame=0
    this.lastRunSwapAt=0
    this.lastStepAt=0
    this.lastMoveAt=0

    this.bossHP=0
    this.bossMaxHP=0
    this.playerHP=5
    this.bossPhase=1
    this.missionSuccess=false
  }

  currentMission() {
    return this.missions.find(m=>m.id===this.selectedMission)||this.missions[0]
  }

  // ------------------------------------------------------------
  // PROCEDURAL BACKGROUNDS - no external/user photo is loaded.
  // ------------------------------------------------------------
  clearBackground() {
    for (const o of this.bgObjects) {
      try { o.destroy() } catch {}
    }
    this.bgObjects=[]
  }

  drawProceduralBackground(mode=0) {
    this.clearBackground()
    const w=this.scale.width
    const h=this.scale.height
    const g=this.add.graphics().setDepth(-20)
    this.bgObjects.push(g)

    const band=(y1,y2,color) => {
      g.fillStyle(color,1)
      g.fillRect(0,y1,w,y2-y1)
    }

    if (mode===0) {
      band(0,h*0.28,0x071521)
      band(h*0.28,h*0.58,0x0b2231)
      band(h*0.58,h,0x061019)

      g.fillStyle(0x113147,1)
      for (let x=0;x<w;x+=130) g.fillRect(x+18,h*0.30,88,h*0.24)

      g.fillStyle(0x22465b,1)
      for (let x=0;x<w;x+=130) {
        for (let y=h*0.33;y<h*0.49;y+=38) {
          g.fillRect(x+30,y,22,14)
          g.fillRect(x+67,y,22,14)
        }
      }

      g.lineStyle(2,0x315b73,0.45)
      for (let i=0;i<8;i++) {
        const y=h*0.62+i*42
        g.lineBetween(0,y,w,y)
      }

      g.lineStyle(3,0xffd166,0.18)
      g.lineBetween(w*0.15,h,w*0.44,h*0.58)
      g.lineBetween(w*0.85,h,w*0.56,h*0.58)
    }

    if (mode===1) {
      // Mission 1: stylized terminal/runway roof.
      band(0,h*0.30,0x0a2130)
      band(h*0.30,h*0.57,0x12364b)
      band(h*0.57,h,0x07131c)

      g.fillStyle(0x102b3c,1)
      g.fillRect(0,h*0.48,w,h*0.12)

      g.fillStyle(0x2b596e,1)
      for (let x=20;x<w;x+=118) g.fillRect(x,h*0.50,78,h*0.045)

      g.lineStyle(3,0xd4e7ef,0.23)
      for (let i=0;i<9;i++) {
        const y=h*0.64+i*40
        g.lineBetween(0,y,w,y)
      }

      g.lineStyle(3,0xffd166,0.42)
      g.lineBetween(w*0.08,h,w*0.42,h*0.58)
      g.lineBetween(w*0.92,h,w*0.58,h*0.58)

      g.fillStyle(0xffdf77,0.75)
      for (let i=0;i<12;i++) {
        const x=w*0.16+i*(w*0.68/11)
        g.fillCircle(x,h*0.72+(i%2)*35,3)
      }
    }

    if (mode===2) {
      // Mission 2: arcade firing range / hangar.
      band(0,h,0x050c13)
      g.fillStyle(0x0c1c28,1)
      g.fillRect(w*0.04,h*0.12,w*0.92,h*0.72)

      g.lineStyle(2,0x25475d,0.8)
      for (let x=w*0.10;x<w*0.95;x+=w*0.14) {
        g.lineBetween(x,h*0.15,x,h*0.82)
      }
      for (let y=h*0.22;y<h*0.84;y+=80) {
        g.lineBetween(w*0.05,y,w*0.95,y)
      }

      g.fillStyle(0x2b1417,1)
      g.fillRect(0,h*0.83,w,h*0.17)

      // code-drawn warning stripes
      for (let x=-40;x<w+40;x+=80) {
        g.fillStyle(0xffc34f,0.7)
        g.fillTriangle(x,h*0.85,x+34,h*0.85,x+76,h)
      }

      g.fillStyle(0xff5364,0.40)
      for (let i=0;i<6;i++) g.fillCircle(w*(0.10+i*0.16),h*0.18,7)
    }

    if (mode===3) {
      // Mission 3: airport service tunnel / chase lane.
      band(0,h*0.30,0x081622)
      band(h*0.30,h*0.67,0x102a3b)
      band(h*0.67,h,0x081017)

      g.fillStyle(0x183a4f,1)
      g.fillRect(0,h*0.35,w,h*0.18)

      g.lineStyle(4,0xc8d6dc,0.28)
      for (let x=0;x<w;x+=110) g.lineBetween(x,h*0.35,x,h*0.53)

      g.lineStyle(4,0xffd166,0.55)
      g.lineBetween(0,h*0.77,w,h*0.77)

      g.lineStyle(3,0xffffff,0.38)
      for (let x=0;x<w;x+=180) g.lineBetween(x,h*0.88,x+90,h*0.88)

      // directional arrows
      g.fillStyle(0x85cae8,0.28)
      for (let x=80;x<w;x+=240) {
        g.fillTriangle(x,h*0.70,x+34,h*0.66,x+34,h*0.74)
        g.fillRect(x+30,h*0.69,72,8)
      }
    }

    if (mode===4) {
      // Mission 4: entirely code-drawn office.
      band(0,h*0.70,0x172837)
      band(h*0.70,h,0x091219)

      // Window
      g.fillStyle(0x0b1b27,1)
      g.fillRect(w*0.08,h*0.15,w*0.32,h*0.34)
      g.lineStyle(5,0x315267,1)
      g.strokeRect(w*0.08,h*0.15,w*0.32,h*0.34)
      g.lineBetween(w*0.24,h*0.15,w*0.24,h*0.49)
      g.lineBetween(w*0.08,h*0.32,w*0.40,h*0.32)

      // distant airport lights
      g.fillStyle(0xffd166,0.5)
      for (let i=0;i<18;i++) {
        g.fillCircle(w*0.10+i*25,h*0.42+(i%3)*7,2)
      }

      // Cabinet
      g.fillStyle(0x203d4e,1)
      g.fillRect(w*0.74,h*0.19,w*0.17,h*0.39)
      g.lineStyle(2,0x456679,0.8)
      for (let y=h*0.26;y<h*0.57;y+=70) g.lineBetween(w*0.74,y,w*0.91,y)

      // Desk
      g.fillStyle(0x563824,1)
      g.fillRect(w*0.20,h*0.66,w*0.60,h*0.07)
      g.fillRect(w*0.24,h*0.73,w*0.04,h*0.18)
      g.fillRect(w*0.72,h*0.73,w*0.04,h*0.18)

      // Monitor
      g.fillStyle(0x071018,1)
      g.fillRect(w*0.46,h*0.51,w*0.13,h*0.11)
      g.lineStyle(3,0x4b6b7c,1)
      g.strokeRect(w*0.46,h*0.51,w*0.13,h*0.11)
      g.fillStyle(0x315267,1)
      g.fillRect(w*0.518,h*0.62,w*0.015,h*0.04)

      // Documents
      g.fillStyle(0xe6edf0,1)
      g.fillRect(w*0.31,h*0.61,w*0.09,h*0.03)
      g.fillStyle(0xd2dfe5,1)
      g.fillRect(w*0.32,h*0.58,w*0.085,h*0.03)
    }

    if (mode===5) {
      // Mission 5: boss arena / dark hangar.
      band(0,h,0x09090d)
      g.fillStyle(0x19131a,1)
      g.fillRect(w*0.06,h*0.10,w*0.88,h*0.76)

      g.lineStyle(4,0x542c34,0.7)
      for (let x=w*0.08;x<w*0.95;x+=w*0.12) {
        g.lineBetween(x,h*0.12,x,h*0.82)
      }

      g.lineStyle(2,0x8b3d48,0.45)
      for (let y=h*0.20;y<h*0.82;y+=85) g.lineBetween(w*0.06,y,w*0.94,y)

      g.fillStyle(0xb62d3f,0.55)
      g.fillCircle(w*0.10,h*0.16,11)
      g.fillCircle(w*0.90,h*0.16,11)

      g.fillStyle(0x321319,1)
      g.fillRect(0,h*0.82,w,h*0.18)
      for (let x=-50;x<w+50;x+=95) {
        g.fillStyle(0xffbf47,0.55)
        g.fillTriangle(x,h*0.83,x+36,h*0.83,x+86,h)
      }

      g.lineStyle(5,0xc33b4d,0.24)
      g.strokeCircle(w/2,h*0.43,Math.min(w,h)*0.27)
      g.strokeCircle(w/2,h*0.43,Math.min(w,h)*0.18)
    }
  }

  buildHud() {
    const w=this.scale.width
    const h=this.scale.height

    this.topBar=this.add.rectangle(w/2,42,w,84,0x04111d,0.92).setDepth(30)

    this.scoreText=this.add.text(20,15,'SKOR  0',{
      fontFamily:'Arial Black, Arial',fontSize:'21px',color:'#ffffff'
    }).setDepth(40)

    this.highText=this.add.text(20,48,'KARİYER  0 ★',{
      fontFamily:'Arial',fontSize:'13px',fontStyle:'bold',color:'#a9d2ea'
    }).setDepth(40)

    this.titleText=this.add.text(w/2,7,'METINBALL',{
      fontFamily:'Arial Black, Arial',
      fontSize:'29px',fontStyle:'bold',color:'#ffd166',
      stroke:'#281800',strokeThickness:5
    }).setOrigin(0.5,0).setDepth(40)

    this.targetText=this.add.text(w/2,50,'v0.19.5 • PORTABLE GELİŞTİRME • ÖZEL KARAKTER • 5 GÖREV',{
      fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',color:'#bfffd0'
    }).setOrigin(0.5).setDepth(40)

    this.timeText=this.add.text(w-20,15,'SÜRE  --:--',{
      fontFamily:'Arial Black, Arial',fontSize:'20px',color:'#ffffff'
    }).setOrigin(1,0).setDepth(40)

    this.errorText=this.add.text(w-20,49,'HATA  0',{
      fontFamily:'Arial',fontSize:'16px',fontStyle:'bold',color:'#72ff8b'
    }).setOrigin(1,0).setDepth(40)

    this.countText=this.pill(16,93,'DURUM  HAZIR')
    this.phaseText=this.pill(w/2,93,'GÖREV SEÇ','center')
    this.accuracyText=this.pill(w-16,93,'ORAN  %100','right')

    this.comboText=this.add.text(w/2,132,'',{
      fontFamily:'Arial Black, Arial',fontSize:'24px',color:'#ffd166',
      stroke:'#251500',strokeThickness:5
    }).setOrigin(0.5).setDepth(45)

    this.specialText=this.add.text(w/2,163,'',{
      fontFamily:'Arial Black, Arial',fontSize:'16px',color:'#d9eff9',
      stroke:'#071018',strokeThickness:4
    }).setOrigin(0.5).setDepth(45)

    this.missionText=this.add.text(12,h-116,'GÖREVLERDEN BİRİNİ SEÇ',{
      fontFamily:'Arial',fontSize:'13px',fontStyle:'bold',
      color:'#e8f5fc',backgroundColor:'#061826',
      padding:{x:8,y:6},lineSpacing:3
    }).setAlpha(0.84).setDepth(35)

    this.bottomBar=this.add.rectangle(w/2,h-17,w,34,0x04111d,0.90).setDepth(30)

    this.controlsText=this.add.text(w/2,h-17,'Mouse • ← → / A D • P/ESC: Durdur • F: Tam Ekran • M: Ses',{
      fontFamily:'Arial',fontSize:'12px',color:'#d4ebf8'
    }).setOrigin(0.5).setDepth(40)

    this.menuButton=this.add.text(w-10,h-17,'MENÜ',{
      fontFamily:'Arial Black, Arial',fontSize:'12px',color:'#ffffff',
      backgroundColor:'#0b2a40',padding:{x:8,y:5}
    }).setOrigin(1,0.5).setInteractive({useHandCursor:true}).setDepth(45)
    this.menuButton.on('pointerdown',()=>this.openPauseMenu())

    this.soundButton=this.add.text(10,h-17,this.soundOn?'SES: AÇIK':'SES: KAPALI',{
      fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',color:'#ffffff',
      backgroundColor:'#0b2a40',padding:{x:8,y:5}
    }).setOrigin(0,0.5).setInteractive({useHandCursor:true}).setDepth(45)
    this.soundButton.on('pointerdown',()=>this.toggleSound())

    this.updateCareerHud()
  }

  pill(x,y,text,origin='left') {
    const t=this.add.text(x,y,text,{
      fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',
      color:'#ffffff',backgroundColor:'#071b2b',
      padding:{x:9,y:5}
    }).setAlpha(0.94).setDepth(35)
    if (origin==='center') t.setOrigin(0.5,0)
    if (origin==='right') t.setOrigin(1,0)
    return t
  }

  registerInput() {
    this.cursors=this.input.keyboard.createCursorKeys()
    this.keys=this.input.keyboard.addKeys('A,D,P,F,M,ESC,R')

    this.input.keyboard.on('keydown-P',()=>this.openPauseMenu())
    this.input.keyboard.on('keydown-ESC',()=>this.openPauseMenu())
    this.input.keyboard.on('keydown-F',()=>this.toggleFullscreen())
    this.input.keyboard.on('keydown-M',()=>this.toggleSound())
    this.input.keyboard.on('keydown-R',()=>this.reloadWeapon())

    this.input.on('pointermove',pointer=>{
      if (!this.started || this.gameOver || this.pausedByMenu) return

      if (this.player) this.movePlayer(pointer.worldX)

      if ((this.selectedMission===2 || this.selectedMission===5) && this.crosshair) {
        this.drawCrosshair(pointer.worldX,pointer.worldY)
        this.aimWeapon(pointer.worldX,pointer.worldY)
      }
    })

    this.input.on('pointerdown',pointer=>{
      if (!this.started || this.gameOver || this.pausedByMenu) return
      if (this.selectedMission===2) this.shootMission2(pointer)
      if (this.selectedMission===5) this.shootMission5(pointer)
    })
  }

  // ------------------------------------------------------------
  // MENUS
  // ------------------------------------------------------------
  menuButtonWidget(x,y,label,handler,primary=false,width=310,depth=94) {
    const btn=this.add.text(x,y,label,{
      fontFamily:'Arial Black, Arial',
      fontSize:primary?'19px':'16px',
      fontStyle:'bold',
      color:primary?'#071725':'#ffffff',
      backgroundColor:primary?'#ffd166':'#12334a',
      fixedWidth:width,
      align:'center',
      padding:{x:14,y:10}
    }).setOrigin(0.5).setInteractive({useHandCursor:true}).setDepth(depth)

    btn.on('pointerover',()=>btn.setScale(1.02))
    btn.on('pointerout',()=>btn.setScale(1))
    btn.on('pointerdown',handler)
    return btn
  }

  showMainMenu() {
    this.clearOverlay()
    this.drawProceduralBackground(0)

    const w=this.scale.width
    const h=this.scale.height
    const mission=this.currentMission()

    const overlay=this.add.rectangle(w/2,h/2,w,h,0x02070b,0.54).setDepth(90)
    const card=this.add.rectangle(w/2,h/2,Math.min(700,w-70),Math.min(680,h-35),0x071725,0.985)
      .setStrokeStyle(3,0x3b7297,0.96).setDepth(91)

    const title=this.add.text(w/2,h/2-265,'METINBALL',{
      fontFamily:'Arial Black, Arial',fontSize:'45px',fontStyle:'bold',
      color:'#ffd166',stroke:'#2b1800',strokeThickness:6
    }).setOrigin(0.5).setDepth(92)

    const sub=this.add.text(w/2,h/2-220,'v0.19.5 • PORTABLE + GÜNCELLENEBİLİR • KENDİ KARAKTERİNİ YÜKLE • 5 GÖREV',{
      fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',color:'#bfffd0'
    }).setOrigin(0.5).setDepth(92)

    const charImg=this.add.image(w/2-120,h/2-135,this.selected.texture).setDepth(92)
    this.sizeMenuAvatar(charImg,this.selected.id)
    this.tweens.add({
      targets:charImg,
      y:charImg.y-4,
      duration:760,
      yoyo:true,
      repeat:-1,
      ease:'Sine.easeInOut'
    })

    const selectedText=this.add.text(w/2+70,h/2-145,
      `KARAKTER\n${this.selected.name}\n\nSEÇİLİ GÖREV\n${this.selectedMission}. ${mission.title}`,
      {
        fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',
        color:'#e7f3f8',lineSpacing:5
      }
    ).setDepth(92)

    const play=this.menuButtonWidget(w/2,h/2-5,`OYNA • GÖREV ${this.selectedMission}`,()=>{
      this.startSelectedMission()
    },true,350)

    const missions=this.menuButtonWidget(w/2,h/2+47,'GÖREVLER (5)',()=>this.showMissionSelect(),false,350)
    const chars=this.menuButtonWidget(w/2,h/2+99,'KARAKTER SEÇ',()=>this.showCharacterSelect(),false,350)
    const custom=this.menuButtonWidget(w/2,h/2+151,'KENDİ KARAKTERİNİ YÜKLE',()=>this.showCustomCharacterUploader(),false,350)
    const career=this.menuButtonWidget(w/2,h/2+203,'KARİYER / BAŞARILAR',()=>this.showCareer(),false,350)
    const settings=this.menuButtonWidget(w/2-100,h/2+259,'AYARLAR',()=>this.showSettings(),false,180)
    const exit=this.menuButtonWidget(w/2+100,h/2+259,'ÇIKIŞ',()=>this.exitGame(),false,180)

    this.activeOverlay=[
      overlay,card,title,sub,charImg,selectedText,
      play,missions,chars,custom,career,settings,exit
    ]
  }

  showMissionSelect() {
    this.clearOverlay()
    this.drawProceduralBackground(0)

    const w=this.scale.width
    const h=this.scale.height
    const overlay=this.add.rectangle(w/2,h/2,w,h,0x02070b,0.76).setDepth(90)
    const panel=this.add.rectangle(w/2,h/2,Math.min(1160,w-50),Math.min(650,h-45),0x071725,0.995)
      .setStrokeStyle(3,0x3b7297,0.96).setDepth(91)

    const title=this.add.text(w/2,h/2-285,'GÖREVLER',{
      fontFamily:'Arial Black, Arial',fontSize:'31px',color:'#ffffff'
    }).setOrigin(0.5).setDepth(92)

    const positions=[
      [w/2-330,h/2-105],
      [w/2,h/2-105],
      [w/2+330,h/2-105],
      [w/2-170,h/2+135],
      [w/2+170,h/2+135]
    ]

    const objects=[overlay,panel,title]

    this.missions.forEach((m,i)=>{
      const [x,y]=positions[i]
      const selected=m.id===this.selectedMission
      const rec=this.getMissionRecord(m.id)

      const c=this.add.rectangle(x,y,292,190,0x0b2233,0.99)
        .setStrokeStyle(selected?4:2,selected?0xffd166:0x315f7d,1)
        .setInteractive({useHandCursor:true}).setDepth(92)

      const no=this.add.text(x-125,y-78,`0${m.id}`,{
        fontFamily:'Arial Black, Arial',fontSize:'26px',
        color:selected?'#ffd166':'#6595b0'
      }).setDepth(93)

      const name=this.add.text(x,y-55,m.title,{
        fontFamily:'Arial Black, Arial',fontSize:'17px',
        color:'#ffffff',align:'center',
        wordWrap:{width:245}
      }).setOrigin(0.5).setDepth(93)

      const verb=this.add.text(x,y-18,m.verb,{
        fontFamily:'Arial Black, Arial',fontSize:'13px',
        color:'#071725',backgroundColor:selected?'#ffd166':'#9ed7f4',
        padding:{x:10,y:4}
      }).setOrigin(0.5).setDepth(93)

      const desc=this.add.text(x,y+22,m.subtitle,{
        fontFamily:'Arial',fontSize:'11px',color:'#bdd4df',
        align:'center',wordWrap:{width:250}
      }).setOrigin(0.5,0).setDepth(93)

      const record=this.add.text(x,y+70,
        rec
          ? `REKOR ${rec.score.toLocaleString('tr-TR')} • ${'★'.repeat(rec.stars)}${'☆'.repeat(3-rec.stars)}`
          : 'REKOR YOK • ☆☆☆',
        {
          fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',
          color:rec?'#bfffd0':'#8099a7'
        }
      ).setOrigin(0.5).setDepth(93)

      c.on('pointerdown',()=>{
        this.selectedMission=m.id
        localStorage.setItem('metinballMission',String(m.id))
        this.showMissionSelect()
      })

      objects.push(c,no,name,verb,desc,record)
    })

    const play=this.menuButtonWidget(w/2-125,h/2+285,'OYNA',()=>{
      this.startSelectedMission()
    },true,220,95)

    const home=this.menuButtonWidget(w/2+125,h/2+285,'ANA MENÜ',()=>{
      this.showMainMenu()
    },false,220,95)

    objects.push(play,home)
    this.activeOverlay=objects
  }

  showCharacterSelect() {
    this.clearOverlay()
    const w=this.scale.width
    const h=this.scale.height

    const overlay=this.add.rectangle(w/2,h/2,w,h,0x02070b,0.78).setDepth(90)
    const panelW=Math.min(1120,w-55)
    const panel=this.add.rectangle(w/2,h/2,panelW,Math.min(620,h-50),0x071725,0.995)
      .setStrokeStyle(3,0x3b7297,0.96).setDepth(91)

    const title=this.add.text(w/2,h/2-270,'KARAKTER SEÇ',{
      fontFamily:'Arial Black, Arial',fontSize:'29px',color:'#ffffff'
    }).setOrigin(0.5).setDepth(92)

    const count=this.characters.length
    const spacing=(panelW-80)/count
    const startX=w/2-spacing*(count-1)/2
    const objects=[overlay,panel,title]

    this.characters.forEach((c,i)=>{
      const x=startX+i*spacing
      const y=h/2-10
      const active=c.id===this.selected.id

      const box=this.add.rectangle(x,y,Math.min(210,spacing-12),405,0x0a2030,0.99)
        .setStrokeStyle(active?4:2,active?0xffd166:0x315f7d,1)
        .setInteractive({useHandCursor:true}).setDepth(92)

      const img=this.add.image(x,y-118,c.texture).setDepth(93)
      this.sizeSelectionAvatar(img,c.id)

      const name=this.add.text(x,y+3,c.name,{
        fontFamily:'Arial Black, Arial',fontSize:count>4?'17px':'20px',
        color:active?'#ffd166':'#ffffff'
      }).setOrigin(0.5).setDepth(93)

      const ability=this.add.text(x,y+36,c.ability,{
        fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',color:'#9ed7f4'
      }).setOrigin(0.5).setDepth(93)

      const stars=n=>'★'.repeat(n)+'☆'.repeat(5-n)
      const stats=this.add.text(x,y+70,
        `HIZ       ${stars(c.stars.speed)}\n`+
        `YAKALAMA  ${stars(c.stars.catch)}\n`+
        `PUAN      ${stars(c.stars.score)}`,
        {
          fontFamily:'Arial',fontSize:'12px',fontStyle:'bold',
          color:'#e4f3fa',lineSpacing:6
        }
      ).setOrigin(0.5,0).setDepth(93)

      const desc=this.add.text(x,y+150,c.description,{
        fontFamily:'Arial',fontSize:'11px',color:'#b9d2df',
        align:'center',wordWrap:{width:Math.max(145,Math.min(190,spacing-28))}
      }).setOrigin(0.5,0).setDepth(93)

      box.on('pointerdown',()=>{
        this.selected=c
        localStorage.setItem('metinballCharacter',c.id)
        this.showCharacterSelect()
      })

      objects.push(box,img,name,ability,stats,desc)
    })

    const upload=this.menuButtonWidget(w/2-250,h/2+260,'KARAKTER YÜKLE',()=>this.showCustomCharacterUploader(),false,200,95)
    const play=this.menuButtonWidget(w/2,h/2+260,'OYNA',()=>this.startSelectedMission(),true,200,95)
    const home=this.menuButtonWidget(w/2+250,h/2+260,'ANA MENÜ',()=>this.showMainMenu(),false,200,95)
    objects.push(upload,play,home)
    this.activeOverlay=objects
  }

  showCustomCharacterUploader() {
    if (this.customCharacterUi) return

    const wrap=document.createElement('div')
    wrap.style.cssText='position:fixed;inset:0;z-index:999999;background:rgba(1,7,12,.90);display:flex;align-items:center;justify-content:center;font-family:Arial,sans-serif;color:#fff;'

    const card=document.createElement('div')
    card.style.cssText='width:min(720px,calc(100vw - 40px));max-height:calc(100vh - 40px);overflow:auto;background:#071725;border:2px solid #3b7297;border-radius:8px;padding:24px;box-sizing:border-box;box-shadow:0 20px 70px rgba(0,0,0,.55);'

    const existing=this.customCharacterData
    card.innerHTML=`
      <div style="font-size:28px;font-weight:900;text-align:center;color:#ffd166;margin-bottom:8px">KENDİ KARAKTERİNİ OLUŞTUR</div>
      <div style="font-size:13px;color:#b9d2df;text-align:center;line-height:1.45;margin-bottom:20px">
        Tek fotoğrafla hızlı karakter oluşturabilirsin. Daha iyi animasyon için ayrıca <b>yakalama pozu</b> ve <b>nişan pozu</b> fotoğrafları ekle.<br>
        En iyi sonuç: tam/yarım boy, kişi net, arka plan sade veya şeffaf PNG.
      </div>
      <label style="display:block;font-weight:700;margin:10px 0 6px">Karakter adı</label>
      <input id="mbCustomName" maxlength="18" value="${existing?.name||''}" placeholder="Örn. TURGUT" style="width:100%;box-sizing:border-box;padding:11px;background:#0d2a3c;color:#fff;border:1px solid #47718a;border-radius:5px;font-weight:700">

      <label style="display:block;font-weight:700;margin:14px 0 6px">1. Normal fotoğraf <span style="color:#ffd166">(zorunlu - yeni karakter için)</span></label>
      <input id="mbCustomIdle" type="file" accept="image/png,image/jpeg,image/webp" style="width:100%">

      <label style="display:block;font-weight:700;margin:14px 0 6px">2. Yakalama pozu <span style="color:#8fb8cc">(isteğe bağlı)</span></label>
      <input id="mbCustomCatch" type="file" accept="image/png,image/jpeg,image/webp" style="width:100%">

      <label style="display:block;font-weight:700;margin:14px 0 6px">3. Nişan / iki el önde pozu <span style="color:#8fb8cc">(isteğe bağlı)</span></label>
      <input id="mbCustomAim" type="file" accept="image/png,image/jpeg,image/webp" style="width:100%">

      <label style="display:flex;gap:8px;align-items:center;margin:16px 0;color:#cde3ee;font-size:13px">
        <input id="mbCustomRemoveBg" type="checkbox" checked> Sade arka planı otomatik temizlemeyi dene
      </label>

      <div id="mbCustomStatus" style="min-height:22px;color:#ffd166;font-size:13px;margin-top:10px"></div>

      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:16px">
        <button id="mbCustomSave" style="flex:1;min-width:180px;padding:12px;background:#ffd166;color:#071725;border:0;border-radius:5px;font-weight:900;cursor:pointer">KAYDET VE KARAKTERE EKLE</button>
        <button id="mbCustomCancel" style="padding:12px 18px;background:#17415b;color:#fff;border:0;border-radius:5px;font-weight:800;cursor:pointer">VAZGEÇ</button>
      </div>

      <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:10px">
        <button id="mbCustomExport" style="flex:1;padding:10px;background:#12334a;color:#fff;border:0;border-radius:5px;font-weight:700;cursor:pointer">ÖZEL KARAKTERİ DIŞA AKTAR</button>
        <label style="flex:1;padding:10px;background:#12334a;color:#fff;border-radius:5px;font-weight:700;text-align:center;cursor:pointer;box-sizing:border-box">
          ÖZEL KARAKTERİ İÇE AKTAR
          <input id="mbCustomImport" type="file" accept="application/json,.json" style="display:none">
        </label>
        <button id="mbCustomDelete" style="padding:10px 16px;background:#6f2630;color:#fff;border:0;border-radius:5px;font-weight:700;cursor:pointer">SİL</button>
      </div>
    `

    wrap.appendChild(card)
    document.body.appendChild(wrap)
    this.customCharacterUi=wrap

    const close=()=>{
      try { wrap.remove() } catch {}
      this.customCharacterUi=null
    }

    card.querySelector('#mbCustomCancel').onclick=close
    wrap.addEventListener('click',e=>{ if (e.target===wrap) close() })

    card.querySelector('#mbCustomSave').onclick=async()=>{
      const status=card.querySelector('#mbCustomStatus')
      const name=String(card.querySelector('#mbCustomName').value||'ÖZEL KARAKTER').trim().slice(0,18)
      const idleFile=card.querySelector('#mbCustomIdle').files?.[0]
      const catchFile=card.querySelector('#mbCustomCatch').files?.[0]
      const aimFile=card.querySelector('#mbCustomAim').files?.[0]
      const removeBg=card.querySelector('#mbCustomRemoveBg').checked

      if (!idleFile && !existing?.idle) {
        status.textContent='Önce normal fotoğraf seçmelisin.'
        return
      }

      try {
        status.textContent='Fotoğraf hazırlanıyor...'
        const idle=idleFile ? await this.prepareCustomCharacterPhoto(idleFile,removeBg) : existing.idle
        const catchPose=catchFile ? await this.prepareCustomCharacterPhoto(catchFile,removeBg) : (existing?.catchPose||idle)
        const aimPose=aimFile ? await this.prepareCustomCharacterPhoto(aimFile,removeBg) : (existing?.aimPose||catchPose||idle)

        const payload={version:1,name:name||'ÖZEL KARAKTER',idle,catchPose,aimPose}
        localStorage.setItem('metinballCustomCharacterV1',JSON.stringify(payload))
        localStorage.setItem('metinballCharacter','custom')
        localStorage.setItem('metinballOpenCharacterAfterReload','1')
        status.textContent='Kaydedildi. Oyun özel karakterle yeniden yükleniyor...'
        setTimeout(()=>location.reload(),350)
      } catch (err) {
        status.textContent='Kaydedilemedi: '+(err?.message||err)
      }
    }

    card.querySelector('#mbCustomDelete').onclick=()=>{
      if (!localStorage.getItem('metinballCustomCharacterV1')) return
      localStorage.removeItem('metinballCustomCharacterV1')
      if (localStorage.getItem('metinballCharacter')==='custom') localStorage.setItem('metinballCharacter','turgut')
      close()
      location.reload()
    }

    card.querySelector('#mbCustomExport').onclick=()=>{
      const raw=localStorage.getItem('metinballCustomCharacterV1')
      const status=card.querySelector('#mbCustomStatus')
      if (!raw) { status.textContent='Dışa aktarılacak özel karakter yok.'; return }
      const blob=new Blob([raw],{type:'application/json'})
      const a=document.createElement('a')
      a.href=URL.createObjectURL(blob)
      a.download='metinball_ozel_karakter.json'
      a.click()
      setTimeout(()=>URL.revokeObjectURL(a.href),1000)
    }

    card.querySelector('#mbCustomImport').onchange=async(e)=>{
      const file=e.target.files?.[0]
      const status=card.querySelector('#mbCustomStatus')
      if (!file) return
      try {
        const data=JSON.parse(await file.text())
        if (!data?.idle) throw new Error('Geçersiz karakter dosyası')
        localStorage.setItem('metinballCustomCharacterV1',JSON.stringify(data))
        localStorage.setItem('metinballCharacter','custom')
        localStorage.setItem('metinballOpenCharacterAfterReload','1')
        status.textContent='İçe aktarıldı. Oyun yeniden yükleniyor...'
        setTimeout(()=>location.reload(),300)
      } catch (err) {
        status.textContent='İçe aktarma hatası: '+(err?.message||err)
      }
    }
  }

  async prepareCustomCharacterPhoto(file,removeBg=true) {
    if (!file || file.size>12*1024*1024) throw new Error('Fotoğraf en fazla 12 MB olmalı')

    const dataUrl=await new Promise((resolve,reject)=>{
      const reader=new FileReader()
      reader.onload=()=>resolve(reader.result)
      reader.onerror=()=>reject(new Error('Fotoğraf okunamadı'))
      reader.readAsDataURL(file)
    })

    const img=await new Promise((resolve,reject)=>{
      const im=new Image()
      im.onload=()=>resolve(im)
      im.onerror=()=>reject(new Error('Fotoğraf açılamadı'))
      im.src=dataUrl
    })

    const maxW=620
    const maxH=820
    const scale=Math.min(1,maxW/img.width,maxH/img.height)
    const w=Math.max(1,Math.round(img.width*scale))
    const h=Math.max(1,Math.round(img.height*scale))

    const canvas=document.createElement('canvas')
    canvas.width=w
    canvas.height=h
    const ctx=canvas.getContext('2d',{willReadFrequently:true})
    ctx.clearRect(0,0,w,h)
    ctx.drawImage(img,0,0,w,h)

    if (removeBg) this.removeSimplePhotoBackground(ctx,w,h)

    const imageData=ctx.getImageData(0,0,w,h)
    const d=imageData.data
    let minX=w,minY=h,maxX=-1,maxY=-1
    for (let y=0;y<h;y++) {
      for (let x=0;x<w;x++) {
        const a=d[(y*w+x)*4+3]
        if (a>22) {
          if (x<minX) minX=x
          if (x>maxX) maxX=x
          if (y<minY) minY=y
          if (y>maxY) maxY=y
        }
      }
    }

    if (maxX<minX || maxY<minY) return canvas.toDataURL('image/webp',0.88)

    const pad=12
    minX=Math.max(0,minX-pad); minY=Math.max(0,minY-pad)
    maxX=Math.min(w-1,maxX+pad); maxY=Math.min(h-1,maxY+pad)
    const cw=maxX-minX+1, ch=maxY-minY+1

    const out=document.createElement('canvas')
    out.width=cw
    out.height=ch
    out.getContext('2d').drawImage(canvas,minX,minY,cw,ch,0,0,cw,ch)
    return out.toDataURL('image/webp',0.88)
  }

  removeSimplePhotoBackground(ctx,w,h) {
    const img=ctx.getImageData(0,0,w,h)
    const d=img.data
    const sample=[]
    const step=Math.max(1,Math.floor(Math.min(w,h)/45))

    const add=(x,y)=>{
      const i=(y*w+x)*4
      if (d[i+3]>10) sample.push([d[i],d[i+1],d[i+2]])
    }
    for (let x=0;x<w;x+=step) { add(x,0); add(x,h-1) }
    for (let y=0;y<h;y+=step) { add(0,y); add(w-1,y) }
    if (!sample.length) return

    const avg=sample.reduce((a,c)=>[a[0]+c[0],a[1]+c[1],a[2]+c[2]],[0,0,0]).map(v=>v/sample.length)
    const low=42, high=92

    for (let i=0;i<d.length;i+=4) {
      const dr=d[i]-avg[0], dg=d[i+1]-avg[1], db=d[i+2]-avg[2]
      const dist=Math.sqrt(dr*dr+dg*dg+db*db)
      if (dist<low) d[i+3]=0
      else if (dist<high) d[i+3]=Math.round(d[i+3]*(dist-low)/(high-low))
    }
    ctx.putImageData(img,0,0)
  }

  showCareer() {
    this.clearOverlay()
    const w=this.scale.width
    const h=this.scale.height
    const totalStars=this.getCareerStars()

    const overlay=this.add.rectangle(w/2,h/2,w,h,0x02070b,0.80).setDepth(90)
    const panel=this.add.rectangle(w/2,h/2,Math.min(900,w-60),Math.min(610,h-55),0x071725,0.995)
      .setStrokeStyle(3,0x3b7297,0.96).setDepth(91)

    const title=this.add.text(w/2,h/2-255,`KARİYER • ${totalStars}/15 ★`,{
      fontFamily:'Arial Black, Arial',fontSize:'30px',
      color:'#ffd166'
    }).setOrigin(0.5).setDepth(92)

    const lines=this.missions.map(m=>{
      const r=this.getMissionRecord(m.id)
      if (!r) return `${m.id}. ${m.title.padEnd(24,' ')}  ---  ☆☆☆`
      return `${m.id}. ${m.title.padEnd(24,' ')}  ${String(r.grade).padEnd(2,' ')}  ${r.score.toLocaleString('tr-TR').padStart(7,' ')}  ${'★'.repeat(r.stars)}${'☆'.repeat(3-r.stars)}`
    }).join('\n\n')

    const list=this.add.text(w/2-350,h/2-190,lines,{
      fontFamily:'Courier New, monospace',fontSize:'16px',
      fontStyle:'bold',color:'#e7f3f8',lineSpacing:8
    }).setDepth(92)

    const zeroCount=this.missions.filter(m=>this.getMissionRecord(m.id)?.zeroError).length
    const medal=this.add.text(w/2,h/2+155,
      `SIFIR HATA MADALYASI  ${zeroCount}/5\n`+
      `TAMAMLAMA  ${this.missions.filter(m=>this.getMissionRecord(m.id)?.success).length}/5`,
      {
        fontFamily:'Arial Black, Arial',fontSize:'17px',
        color:'#bfffd0',align:'center',lineSpacing:8
      }
    ).setOrigin(0.5).setDepth(92)

    const back=this.menuButtonWidget(w/2,h/2+245,'ANA MENÜ',()=>this.showMainMenu(),false,260,95)

    this.activeOverlay=[overlay,panel,title,list,medal,back]
  }

  showSettings() {
    this.clearOverlay()
    const w=this.scale.width
    const h=this.scale.height

    const overlay=this.add.rectangle(w/2,h/2,w,h,0x02070b,0.78).setDepth(90)
    const card=this.add.rectangle(w/2,h/2,Math.min(540,w-70),380,0x071725,0.99)
      .setStrokeStyle(3,0x3b7297,0.96).setDepth(91)

    const title=this.add.text(w/2,h/2-135,'AYARLAR',{
      fontFamily:'Arial Black, Arial',fontSize:'28px',color:'#ffffff'
    }).setOrigin(0.5).setDepth(92)

    const sound=this.menuButtonWidget(w/2,h/2-55,this.soundOn?'SES: AÇIK':'SES: KAPALI',()=>{
      this.toggleSound()
      this.showSettings()
    },false,300,95)

    const full=this.menuButtonWidget(w/2,h/2+5,'TAM EKRAN (F)',()=>this.toggleFullscreen(),false,300,95)

    const info=this.add.text(w/2,h/2+68,
      'Arka planlar oyun motorunda kodla çizilir.\nKarakterler çok kareli görev animasyonlarıyla canlanır; klasik tabanca, gerçek atış/reload sesleri ve patlama efektleri aktiftir.',
      {
        fontFamily:'Arial',fontSize:'13px',color:'#a9c5d3',
        align:'center',lineSpacing:5
      }
    ).setOrigin(0.5).setDepth(92)

    const back=this.menuButtonWidget(w/2,h/2+130,'ANA MENÜ',()=>this.showMainMenu(),false,300,95)

    this.activeOverlay=[overlay,card,title,sound,full,info,back]
  }

  // ------------------------------------------------------------
  // START / COUNTDOWN / PLAYER
  // ------------------------------------------------------------
  startSelectedMission() {
    if (this.started) return

    this.clearOverlay()
    this.stopAllAudio()

    // reset mission-specific runtime state but keep selection/menu scene.
    this.score=0
    this.caught=0
    this.missed=0
    this.combo=0
    this.bestCombo=0
    this.perfectCatches=0
    this.shots=0
    this.hits=0
    this.elapsedSeconds=0
    this.phase=1
    this.firstErrorShield=true
    this.gameOver=false
    this.pausedByMenu=false
    this.fever=false
    this.missionSuccess=false

    this.officeHealth=[100,100,100]
    this.officeIntegrity=100
    this.playerHP=5
    this.bossPhase=1

    const mission=this.currentMission()
    this.secondsLeft=mission.duration
    this.maxRoundSeconds=mission.id===1?105:mission.duration

    this.drawProceduralBackground(mission.id)
    this.createPlayer(mission.id===2 || mission.id===5)
    this.configureMissionHud()
    this.startMusic()
    this.countdown()
  }

  createPlayer(withWeapon=false) {
    const w=this.scale.width
    const h=this.scale.height

    this.playerAnimToken++
    this.playerLean=0
    this.weaponPivot=null
    this.weaponGun=null
    this.playerMoveBob=0
    this.playerMoving=false

    this.playerShadow=this.add.ellipse(w/2,h-47,136,23,0x000000,0.38).setDepth(9)
    this.player=this.add.container(w/2,h-38).setDepth(20)
    this.playerBaseY=this.player.y

    this.playerImage=this.add.sprite(0,-104,this.selected.texture,this.selected.id==='custom'?undefined:0)
    const source=this.textures.get(this.selected.texture).getSourceImage()
    const targetH=228
    const targetW=this.selected.id==='custom'?targetH*(source.width/source.height):targetH*(475/820)
    this.playerImage.setDisplaySize(targetW,targetH)

    this.playerBaseScaleX=this.playerImage.scaleX
    this.playerBaseScaleY=this.playerImage.scaleY

    this.playerLabel=this.add.text(0,-1,this.selected.name,{
      fontFamily:'Arial Black, Arial',fontSize:'12px',color:'#ffffff',
      backgroundColor:'#071725',padding:{x:7,y:3}
    }).setOrigin(0.5)

    this.player.add([this.playerImage,this.playerLabel])

    if (withWeapon) {
      this.setPlayerPose('aim')
      this.attachCodeDrawnWeapon()
    }

    this.ensureLiveCharacterAnimations()
    this.startPlayerIdleAnimation()
  }

  ensureLiveCharacterAnimations() {
    const id=this.selected?.id; if (!id || id==='custom') return; const sheet=`${id}_sheet`
    if (!this.anims.exists(`${id}_run_live`)) this.anims.create({key:`${id}_run_live`,frames:Array.from({length:8},(_,i)=>({key:sheet,frame:10+i})),frameRate:15,repeat:-1})
    if (!this.anims.exists(`${id}_catch_live`)) this.anims.create({key:`${id}_catch_live`,frames:Array.from({length:8},(_,i)=>({key:sheet,frame:18+i})),frameRate:24,repeat:0})
  }
  playLiveRun() { const id=this.selected?.id; if (!id || id==='custom') return false; const k=`${id}_run_live`; if(!this.anims.exists(k)) return false; if(this.playerImage.anims?.currentAnim?.key!==k||!this.playerImage.anims.isPlaying)this.playerImage.play(k,true); return true }
  stopLiveAnimation(){try{if(this.playerImage?.anims?.isPlaying)this.playerImage.stop()}catch{}}

  setPlayerPose(pose='idle') {
    if (!this.playerImage?.active) return; this.stopLiveAnimation()
    if (this.selected.id!=='custom') { const fm={idle:0,run1:1,run2:2,catch1:3,catch2:4,aim:5,fire:6,reload1:7,reload2:8,hit:9}; this.playerImage.setTexture(`${this.selected.id}_sheet`,fm[pose]??0); return }
    let key=this.selected.texture; if(pose==='run1')key='custom_run1';if(pose==='run2')key='custom_run2';if(pose==='catch1')key='custom_catch1';if(pose==='catch2')key='custom_catch2';if(pose==='aim')key='custom_aim';if(pose==='fire')key='custom_fire';if(pose==='reload1')key='custom_reload1';if(pose==='reload2')key='custom_reload2';if(pose==='hit')key='custom_hit'; if(this.textures.exists(key)&&this.playerImage.texture.key!==key)this.playerImage.setTexture(key)
  }

  startPlayerIdleAnimation() {
    if (!this.playerImage?.active) return

    try { this.playerIdleTween?.stop() } catch {}

    this.playerIdleTween=this.tweens.add({
      targets:this.playerImage,
      scaleY:this.playerBaseScaleY*1.018,
      scaleX:this.playerBaseScaleX*0.994,
      duration:700,
      ease:'Sine.easeInOut',
      yoyo:true,
      repeat:-1
    })
  }

  playCatchAnimation() {
    if (!this.playerImage?.active) return

    const token=++this.playerAnimToken
    this.playerActionLockUntil=this.time.now+340
    const liveCatch=this.selected?.id!=='custom'&&this.anims.exists(`${this.selected.id}_catch_live`); if(liveCatch)this.playerImage.play(`${this.selected.id}_catch_live`,true); else this.setPlayerPose('catch1')

    this.tweens.add({
      targets:[this.playerImage,this.playerLabel],
      y:'-=7',
      duration:70,
      yoyo:true,
      ease:'Quad.easeOut'
    })
    this.tweens.add({
      targets:this.playerShadow,
      scaleX:0.90,
      scaleY:0.86,
      duration:80,
      yoyo:true,
      ease:'Quad.easeOut'
    })

    this.time.delayedCall(55,()=>{
      if (token!==this.playerAnimToken || !this.playerImage?.active) return
      if(!liveCatch)this.setPlayerPose('catch2')
      this.tweens.add({
        targets:this.playerImage,
        y:-112,
        angle:Phaser.Math.Clamp(this.playerLean*0.8,-5,5),
        duration:90,
        yoyo:true,
        ease:'Quad.easeOut'
      })
    })

    this.time.delayedCall(175,()=>{
      if (token!==this.playerAnimToken || !this.playerImage?.active) return
      if(!liveCatch)this.setPlayerPose('catch1')
    })

    this.time.delayedCall(310,()=>{
      if (token!==this.playerAnimToken || !this.playerImage?.active) return
      this.playerImage.setY(-104)
      this.playerLabel.setY(0)
      if (this.selectedMission===2 || this.selectedMission===5) this.setPlayerPose('aim')
      else this.setPlayerPose('idle')
    })
  }

  playShootAnimation(targetX,targetY) {
    if (!this.playerImage?.active) return

    const token=++this.playerAnimToken
    this.playerActionLockUntil=this.time.now+150
    this.setPlayerPose('fire')
    this.aimWeapon(targetX,targetY,true)

    this.tweens.add({
      targets:this.playerImage,
      y:-108,
      angle:this.weaponPivot?.rotation<(-Math.PI/2)?2:-2,
      duration:48,
      yoyo:true,
      ease:'Quad.easeOut'
    })
    this.tweens.add({
      targets:this.playerLabel,
      y:4,
      duration:48,
      yoyo:true,
      ease:'Quad.easeOut'
    })
    this.tweens.add({
      targets:this.playerShadow,
      scaleX:0.93,
      duration:55,
      yoyo:true
    })

    if (this.weaponPivot) {
      const baseX=-18
      const baseY=-136
      const angle=this.weaponPivot.rotation
      this.weaponPivot.x=baseX-Math.cos(angle)*8
      this.weaponPivot.y=baseY-Math.sin(angle)*8
      this.tweens.add({
        targets:this.weaponPivot,
        x:baseX,
        y:baseY,
        duration:85,
        ease:'Quad.easeOut'
      })
    }

    this.drawMuzzleFlash()
    this.spawnShellCasing()

    this.time.delayedCall(95,()=>{
      if (token!==this.playerAnimToken || !this.playerImage?.active) return
      this.playerLabel.setY(0)
      this.setPlayerPose('aim')
    })
  }

  playHitAnimation() {
    if (!this.playerImage?.active) return
    ++this.playerAnimToken
    this.playerActionLockUntil=this.time.now+220
    this.setPlayerPose('hit')
    this.playerImage.setTint(0xff8f8f)
    this.tweens.add({
      targets:[this.playerImage,this.playerLabel],
      angle:{from:-8,to:8},
      alpha:{from:0.70,to:1},
      duration:75,
      yoyo:true,
      repeat:1,
      onComplete:()=>{
        if (!this.playerImage?.active) return
        this.playerImage.clearTint()
        this.playerImage.setAngle(0)
        this.playerLabel.setAngle(0)
        if (this.selectedMission===2 || this.selectedMission===5) this.setPlayerPose('aim')
      }
    })
  }

  attachCodeDrawnWeapon() {
    // İki elin birleştiği bölgeye oturan, marka/model taklit etmeyen klasik hizmet tabancası.
    const pivot=this.add.container(-18,-136)

    const gun=this.add.graphics()
    gun.fillStyle(0x202428,1)
    gun.fillRoundedRect(3,-6,39,12,3)
    gun.fillStyle(0x0e1114,1)
    gun.fillRect(34,-3,20,6)
    gun.fillStyle(0x30363b,1)
    gun.fillRect(11,-10,23,5)
    gun.fillStyle(0x64472e,1)
    gun.fillRoundedRect(13,5,13,23,2)
    gun.fillStyle(0x171b1e,1)
    gun.fillTriangle(6,5,15,5,11,22)
    gun.lineStyle(1.5,0x98a2aa,0.75)
    gun.strokeRoundedRect(3,-6,39,12,3)

    pivot.add(gun)
    this.player.add(pivot)
    this.player.bringToTop(pivot)

    this.weaponPivot=pivot
    this.weaponGun=gun

    this.crosshair=this.add.graphics().setDepth(70)
    this.drawCrosshair(this.scale.width/2,this.scale.height/2)
    this.aimWeapon(this.scale.width/2,210,true)
  }

  aimWeapon(x,y,force=false) {
    this.lastAimX=x
    this.lastAimY=y
    if (!this.weaponPivot || (this.reloading && !force)) return

    const worldX=this.player.x+(this.weaponPivot?.x||0)
    const worldY=this.player.y+(this.weaponPivot?.y||-136)
    let angle=Phaser.Math.Angle.Between(worldX,worldY,x,y)

    // Karakter önden duruyor; silah yukarıdaki oyun alanına nişan alır.
    angle=Phaser.Math.Clamp(angle,-2.92,-0.22)
    this.weaponPivot.setRotation(angle)
  }

  drawMuzzleFlash() {
    if (!this.weaponPivot || !this.player) return

    const a=this.weaponPivot.rotation
    const muzzleX=this.player.x+this.weaponPivot.x+Math.cos(a)*55
    const muzzleY=this.player.y+this.weaponPivot.y+Math.sin(a)*55

    const g=this.add.graphics().setDepth(71)
    g.fillStyle(0xffe08a,0.95)
    g.fillCircle(muzzleX,muzzleY,7)
    g.lineStyle(3,0xfff1ad,0.92)
    g.lineBetween(muzzleX,muzzleY,muzzleX+Math.cos(a)*18,muzzleY+Math.sin(a)*18)
    g.lineBetween(muzzleX,muzzleY,muzzleX+Math.cos(a+0.45)*12,muzzleY+Math.sin(a+0.45)*12)
    g.lineBetween(muzzleX,muzzleY,muzzleX+Math.cos(a-0.45)*12,muzzleY+Math.sin(a-0.45)*12)
    this.time.delayedCall(55,()=>g.destroy())
  }

  drawCrosshair(x,y) {
    if (!this.crosshair) return
    this.crosshair.clear()
    this.crosshair.lineStyle(2,0xd9f4ff,0.85)
    this.crosshair.strokeCircle(x,y,15)
    this.crosshair.lineBetween(x-23,y,x-8,y)
    this.crosshair.lineBetween(x+8,y,x+23,y)
    this.crosshair.lineBetween(x,y-23,x,y-8)
    this.crosshair.lineBetween(x,y+8,x,y+23)
    this.crosshair.fillStyle(0xffd166,0.9)
    this.crosshair.fillCircle(x,y,2)
  }

  countdown() {
    const w=this.scale.width
    const h=this.scale.height
    const mission=this.currentMission()

    const overlay=this.add.rectangle(w/2,h/2,w,h,0x000000,0.30).setDepth(85)
    const missionName=this.add.text(w/2,h/2-120,
      `GÖREV ${mission.id} • ${mission.title}`,
      {
        fontFamily:'Arial Black, Arial',fontSize:'24px',
        color:'#ffd166'
      }
    ).setOrigin(0.5).setDepth(86)

    const label=this.add.text(w/2,h/2,'3',{
      fontFamily:'Arial Black, Arial',fontSize:'92px',
      color:'#ffffff',stroke:'#10263a',strokeThickness:8
    }).setOrigin(0.5).setDepth(86)

    const steps=['3','2','1',mission.verb+'!']
    let i=0

    const next=()=>{
      label.setText(steps[i])
      label.setScale(1.28)
      if (this.soundOn) this.sound.play(i<3?'countdown':'start',{volume:i<3?0.30:0.42})
      this.tweens.add({targets:label,scale:1,duration:190})
      i++

      if (i<steps.length) this.time.delayedCall(560,next)
      else this.time.delayedCall(420,()=>{
        overlay.destroy()
        missionName.destroy()
        label.destroy()
        this.startMissionLogic()
      })
    }
    next()
  }

  startMissionLogic() {
    this.started=true

    if (this.selectedMission===1) this.startMission1()
    if (this.selectedMission===2) this.startMission2()
    if (this.selectedMission===3) this.startMission3()
    if (this.selectedMission===4) this.startMission4()
    if (this.selectedMission===5) this.startMission5()

    this.secondEvent=this.time.addEvent({
      delay:1000,
      loop:true,
      callback:()=>{
        if (this.gameOver || this.pausedByMenu) return
        this.elapsedSeconds++
        this.secondsLeft--
        this.updateTimer()
        this.updateTimedDifficulty()

        if (this.selectedMission===1 && this.elapsedSeconds>=this.maxRoundSeconds) {
          this.secondsLeft=0
        }

        if (this.secondsLeft<=0) this.finishMissionByTime()
      }
    })
  }

  configureMissionHud() {
    const m=this.currentMission()
    this.titleText.setText(`GÖREV ${m.id} • ${m.title}`)
    this.targetText.setText(m.subtitle)
    this.scoreText.setText('SKOR  0')
    this.errorText.setText('HATA  0')
    this.comboText.setText('')
    this.specialText.setText('')
    this.updateTimer()

    if (m.id===1) {
      this.countText.setText('YAKALANAN  0')
      this.phaseText.setText('SEVİYE 1 • BAŞLANGIÇ')
      this.accuracyText.setText('ORAN  %100')
      this.controlsText.setText('Mouse: Doğrudan hareket • ← → / A D • P/ESC: Durdur • F: Tam Ekran')
      this.missionText.setText('GÖREV 1\n[ ] 40 yakala\n[ ] x12 kombo\n[ ] En fazla 2 hata')
    }

    if (m.id===2) {
      this.countText.setText('VURULAN  0')
      this.phaseText.setText('ATIŞ HATTI • HAZIR')
      this.accuracyText.setText('İSABET  %100')
      this.controlsText.setText('Mouse: Nişan + hareket • SOL TIK: Ateş • R: Şarjör • P/ESC: Durdur')
      this.missionText.setText('GÖREV 2\nSilahlı hedefi vur\nSilahsıza ateş etme\nR ile şarjör doldur')
    }

    if (m.id===3) {
      this.countText.setText('YAKALANAN  0')
      this.phaseText.setText('KAÇIŞ HATTI • HAZIR')
      this.accuracyText.setText('ORAN  %100')
      this.controlsText.setText('Mouse / ← → / A D: Kovalamaca • P/ESC: Durdur')
      this.missionText.setText('GÖREV 3\nKaçanları yakala\nYön değiştirmelerine dikkat\nHızlı Metin = daha çok puan')
    }

    if (m.id===4) {
      this.countText.setText('DURDURULAN  0')
      this.phaseText.setText('OFİS  %100')
      this.accuracyText.setText('SAVUNMA  %100')
      this.controlsText.setText('Mouse / ← → / A D: Savunma hattında hareket • P/ESC: Durdur')
      this.missionText.setText('GÖREV 4\nBELGELER %100\nBİLGİSAYAR %100\nMASA %100')
    }

    if (m.id===5) {
      this.countText.setText('BOSS  %100')
      this.phaseText.setText('BÜYÜK METİN • EVRE 1')
      this.accuracyText.setText('CAN  5/5')
      this.controlsText.setText('Mouse: Nişan + kaçın • SOL TIK: Ateş • R: Şarjör • P/ESC: Durdur')
      this.missionText.setText('GÖREV 5\nBüyük Metin canını sıfırla\nEnerji toplarından kaç\nMinyonları temizle')
    }
  }

  startMusic() {
    try { this.music?.stop() } catch {}
    if (!this.soundOn) return
    try {
      this.music=this.sound.add('music',{loop:true,volume:0.12})
      this.music.play()
    } catch {}
  }

  stopAllAudio() {
    try { this.music?.stop() } catch {}
  }

  // ------------------------------------------------------------
  // UPDATE DISPATCH
  // ------------------------------------------------------------
  update(_time,delta) {
    if (!this.started || this.gameOver || this.pausedByMenu || !this.player) return
    const dt=Math.min(delta/1000,0.045)

    this.playerMoving=(this.time.now-this.lastMoveAt)<105
    const kSpeed=this.selected.speed*dt
    if (this.cursors.left.isDown || this.keys.A.isDown) this.movePlayer(this.player.x-kSpeed)
    if (this.cursors.right.isDown || this.keys.D.isDown) this.movePlayer(this.player.x+kSpeed)

    this.playerLean*=0.84
    if (this.playerImage?.active && !this.reloading) {
      const targetAngle=Phaser.Math.Clamp(this.playerLean,-5.2,5.2)
      const lockActive=this.time.now<this.playerActionLockUntil
      if (!lockActive) this.playerImage.angle+=(targetAngle-this.playerImage.angle)*0.20

      if (this.playerMoving && !lockActive) {
        this.playerMoveBob+=delta*0.015
        const bob=Math.sin(this.playerMoveBob)*5
        this.player.y=this.playerBaseY+bob
        this.playerShadow.scaleX=1.02-Math.abs(bob)*0.012
        this.playerShadow.scaleY=1-Math.abs(bob)*0.018
        this.playerLabel.y=2+Math.abs(bob)*0.35
        if (this.selectedMission!==2 && this.selectedMission!==5) {
          const liveRun=this.playLiveRun()
          if (!liveRun && this.time.now-this.lastRunSwapAt>115) {
            this.runFrame=this.runFrame===1?2:1
            this.lastRunSwapAt=this.time.now
            this.setPlayerPose(this.runFrame===1?'run1':'run2')
          }
          if (this.soundOn && this.time.now-this.lastStepAt>210) {
            this.lastStepAt=this.time.now
            this.sound.play('step',{volume:0.11})
          }
        }
      } else {
        this.player.y += (this.playerBaseY-this.player.y)*0.20
        this.playerShadow.scaleX += (1-this.playerShadow.scaleX)*0.18
        this.playerShadow.scaleY += (1-this.playerShadow.scaleY)*0.18
        this.playerLabel.y += (0-this.playerLabel.y)*0.18
        if (this.selectedMission!==2 && this.selectedMission!==5 && this.time.now>=this.playerActionLockUntil) {
          this.setPlayerPose('idle')
        }
      }
    }

    if (this.selectedMission===1) this.updateMission1(dt)
    if (this.selectedMission===2) this.updateMission2(dt)
    if (this.selectedMission===3) this.updateMission3(dt)
    if (this.selectedMission===4) this.updateMission4(dt)
    if (this.selectedMission===5) this.updateMission5(dt)
  }

  movePlayer(x) {
    if (!this.player) return
    const margin=70
    const oldX=this.player.x
    const px=Phaser.Math.Clamp(x,margin,this.scale.width-margin)
    this.player.x=px
    if (this.playerShadow) this.playerShadow.x=px

    const delta=px-oldX
    if (Math.abs(delta)>0.2) {
      this.playerMoving=true
      this.lastMoveAt=this.time.now
      this.playerLean=Phaser.Math.Clamp(delta*0.20,-5,5)
    }
  }

  updateTimedDifficulty() {
    const ratio=this.elapsedSeconds/Math.max(1,this.currentMission().duration)
    const newPhase=ratio<0.33?1:ratio<0.66?2:3
    if (newPhase!==this.phase) {
      this.phase=newPhase
      if (this.selectedMission!==5) {
        this.flashMessage(
          newPhase===2?'TEMPO ARTIYOR':'FİNAL TEMPOSU',
          newPhase===3?'#ffb167':'#ffd166'
        )
      }
    }

    if (this.selectedMission===1 && this.spawnEvent) {
      this.spawnEvent.delay=this.phase===1?780:this.phase===2?650:510
      const text=this.phase===1?'SEVİYE 1 • BAŞLANGIÇ':
                 this.phase===2?'SEVİYE 2 • HIZLANIYOR':
                                'SEVİYE 3 • FİNAL TRAFİĞİ'
      this.phaseText.setText(text)
    }
    if (this.selectedMission===2 && this.spawnEvent) {
      this.spawnEvent.delay=this.phase===1?930:this.phase===2?760:620
    }
    if (this.selectedMission===3 && this.spawnEvent) {
      this.spawnEvent.delay=this.phase===1?1450:this.phase===2?1200:980
    }
    if (this.selectedMission===4 && this.spawnEvent) {
      this.spawnEvent.delay=this.phase===1?1180:this.phase===2?940:760
    }
  }

  // ------------------------------------------------------------
  miniFrame(key){return ({mini1:0,mini2:1,mini3:2,mini4:3})[key]??0}

  // MISSION 1 - METIN YAĞMURU
  // ------------------------------------------------------------
  startMission1() {
    this.spawnEvent=this.time.addEvent({
      delay:780,loop:true,callback:()=>this.spawnMission1Item()
    })
  }

  spawnMission1Item() {
    if (!this.started || this.gameOver || this.pausedByMenu) return
    const maxActive=this.phase===1?6:this.phase===2?8:10
    if (this.m1Items.length>=maxActive) return

    const r=Math.random()
    let kind='normal'
    let key=Phaser.Utils.Array.GetRandom(['mini1','mini2','mini3','mini4'])
    let score=10
    let speed=Phaser.Math.Between(180,245)
    let size=Phaser.Math.Between(104,136)
    let missPenalty=1

    if (this.phase===3 && r<0.08) {
      kind='boss'; key='mini1'; score=120; speed=175; size=210; missPenalty=2
    } else if (r<0.12) {
      kind='bonus'; key='mini2'; score=50; speed=220; missPenalty=0
    } else if (r<0.20) {
      kind='fake'; key='mini4'; score=0; speed=230; missPenalty=0
    } else {
      const base={mini1:10,mini2:12,mini3:15,mini4:18}[key]
      score=base
    }

    speed+=this.phase===1?0:this.phase===2?55:105

    const x=Phaser.Math.Between(70,this.scale.width-70)
    const sprite=this.add.image(x,-90,'miniSheet',this.miniFrame(key)).setDisplaySize(size*0.68,size).setDepth(7)

    let ring=null
    let badge=null

    if (kind==='bonus') {
      ring=this.add.circle(x,-90,size*0.40,0xffd166,0.06)
        .setStrokeStyle(4,0xffd166,0.88).setDepth(6)
      badge=this.badge(x,-90-size*0.52,'BONUS',0xffd166,0x3b2800)
    }
    if (kind==='fake') {
      ring=this.add.circle(x,-90,size*0.40,0xff5364,0.05)
        .setStrokeStyle(4,0xff5364,0.90).setDepth(6)
      badge=this.badge(x,-90-size*0.52,'DİKKAT',0xa91f31,0xffffff)
    }
    if (kind==='boss') {
      ring=this.add.circle(x,-90,size*0.40,0xffe08a,0.06)
        .setStrokeStyle(5,0xffe08a,0.92).setDepth(6)
      badge=this.badge(x,-90-size*0.52,'BÜYÜK METİN',0xffe08a,0x3b2800)
    }

    this.m1Items.push({
      kind,key,sprite,ring,badge,score,speed,
      missPenalty,spin:Phaser.Math.Between(-28,28),resolved:false
    })
  }

  updateMission1(dt) {
    for (let i=this.m1Items.length-1;i>=0;i--) {
      const item=this.m1Items[i]
      if (!item || item.resolved || !item.sprite?.active) continue

      const s=item.sprite
      s.y+=item.speed*dt
      s.angle+=item.spin*dt
      if (item.ring) item.ring.setPosition(s.x,s.y)
      if (item.badge) item.badge.setPosition(s.x,s.y-s.displayHeight*0.52)

      const bottom=s.y+s.displayHeight*0.39
      const catchY=this.player.y-156
      const dx=Math.abs(s.x-this.player.x)
      const width=(item.kind==='boss'?this.selected.catchWidth+30:this.selected.catchWidth)
      const height=item.kind==='boss'?126:104

      if (bottom>=catchY && bottom<=catchY+height && dx<width) {
        if (item.kind==='fake') this.mission1Fake(i)
        else if (item.kind==='bonus') this.mission1Bonus(i)
        else this.mission1Catch(i)
      } else if (s.y-s.displayHeight/2>this.scale.height) {
        if (item.kind==='normal' || item.kind==='boss') this.registerError(item.missPenalty,'KAÇTI')
        this.removeM1(i)
      }
    }
  }

  mission1Catch(index) {
    const item=this.m1Items[index]
    if (!item || item.resolved) return

    this.caught++
    this.combo+=item.kind==='boss'?2:1
    this.bestCombo=Math.max(this.bestCombo,this.combo)

    const perfect=Math.abs(item.sprite.x-this.player.x)<=24
    if (perfect) this.perfectCatches++

    let comboBonus=Math.min(Math.max(this.combo-1,0),20)
    if (this.selected.id==='baki') comboBonus=Math.round(comboBonus*1.50)

    const precision=perfect?(this.selected.id==='nafi'?8:5):0
    const base=item.kind==='boss'?120:item.score
    const earned=Math.round((base+comboBonus+precision)*this.selected.scoreMul*(this.fever?1.5:1))
    this.score+=earned

    if (this.combo>=10 && this.combo%10===0 && !this.fever) this.startFever()
    if (this.soundOn) this.sound.play(item.kind==='boss'?'bonus':'catch',{volume:0.38})

    this.pop(item.sprite.x,item.sprite.y,
      perfect?`TAM İSABET +${earned}`:`+${earned}`,
      perfect?'#bfffd0':'#75ff9d','#052016'
    )

    if (item.kind==='boss') {
      const room=Math.max(0,this.maxRoundSeconds-this.elapsedSeconds)
      this.secondsLeft=Math.min(this.secondsLeft+4,room)
      this.flashMessage('BÜYÜK METİN • +4 SANİYE','#ffe08a')
    }

    this.playCatchAnimation()
    this.animateToLap(item,()=>this.spliceObject(this.m1Items,item))
    this.updateHud()
  }

  mission1Bonus(index) {
    const item=this.m1Items[index]
    if (!item || item.resolved) return

    this.caught++
    const earned=Math.round(50*this.selected.scoreMul)
    this.score+=earned

    const extra=this.selected.id==='turgut'?4:3
    const room=Math.max(0,this.maxRoundSeconds-this.elapsedSeconds)
    this.secondsLeft=Math.min(this.secondsLeft+extra,room)

    if (this.soundOn) this.sound.play('bonus',{volume:0.44})
    this.flashMessage(`BONUS +${earned} • +${extra} SANİYE`,'#ffd166')
    this.playCatchAnimation()
    this.animateToLap(item,()=>this.spliceObject(this.m1Items,item))
    this.updateHud()
    this.updateTimer()
  }

  mission1Fake(index) {
    const item=this.m1Items[index]
    if (!item || item.resolved) return
    this.registerError(1,'TUZAK')
    this.removeM1(index)
  }

  removeM1(index) {
    const item=this.m1Items[index]
    if (!item) return
    this.destroyItem(item)
    this.m1Items.splice(index,1)
  }

  // ------------------------------------------------------------
  // MISSION 2 - SILAHLI METIN BASKINI
  // ------------------------------------------------------------
  startMission2() {
    this.maxAmmo=this.selected.id==='turgut'?8:this.selected.id==='zeko'?7:6
    this.ammo=this.maxAmmo
    this.updateAmmoHud()

    this.spawnEvent=this.time.addEvent({
      delay:930,loop:true,callback:()=>this.spawnMission2Target()
    })
  }

  spawnMission2Target() {
    if (!this.started || this.gameOver || this.pausedByMenu) return
    if (this.m2Targets.length>=8) return

    const r=Math.random()
    let kind='armed'
    if (r<0.16) kind='civilian'
    else if (r<0.28) kind='shield'
    else if (r<0.40) kind='fast'
    else if (r<0.49) kind='gold'
    else if (r<0.57) kind='red'

    const key=Phaser.Utils.Array.GetRandom(['mini1','mini2','mini3','mini4'])
    const x=Phaser.Math.Between(80,this.scale.width-80)
    const y=Phaser.Math.Between(160,260)
    const node=this.createShooterTarget(x,y,key,kind)

    const target={
      kind,node,key,
      hp:kind==='shield'?2:1,
      maxHp:kind==='shield'?2:1,
      vx:Phaser.Math.Between(-80,80),
      vy:kind==='fast'?Phaser.Math.Between(100,135):Phaser.Math.Between(55,90),
      wave:Math.random()*Math.PI*2,
      score:kind==='gold'?80:kind==='red'?55:kind==='shield'?42:kind==='fast'?35:25,
      penalty:kind==='red'?2:1,
      radiusX:kind==='shield'?68:58,
      radiusY:80,
      dead:false
    }

    this.m2Targets.push(target)
  }

  createShooterTarget(x,y,key,kind) {
    const container=this.add.container(x,y).setDepth(12)
    const img=this.add.image(0,0,'miniSheet',this.miniFrame(key)).setDisplaySize(76,116)
    container.add(img)

    if (kind!=='civilian') {
      const gun=this.add.graphics()
      gun.fillStyle(kind==='gold'?0xd6ad4b:0x22272b,1)
      gun.fillRoundedRect(18,14,27,7,2)
      gun.fillRect(39,16,13,4)
      gun.fillStyle(0x59412e,1)
      gun.fillRoundedRect(24,20,9,15,2)
      container.add(gun)
    }

    if (kind==='shield') {
      const shield=this.add.circle(0,4,60,0x58b4e8,0.07)
        .setStrokeStyle(4,0x7bd6ff,0.85)
      container.addAt(shield,0)
      container.setData('shield',shield)
    }

    let label='SİLAHLI'
    let bg=0x9b2937
    if (kind==='civilian') { label='SİLAHSIZ'; bg=0x2f6f4e }
    if (kind==='shield') { label='KALKAN'; bg=0x245f83 }
    if (kind==='fast') { label='HIZLI'; bg=0xa5482f }
    if (kind==='gold') { label='ALTIN'; bg=0xa57612 }
    if (kind==='red') { label='TEHLİKE'; bg=0xb32035 }

    const badge=this.add.text(0,-78,label,{
      fontFamily:'Arial Black, Arial',fontSize:'10px',color:'#ffffff',
      backgroundColor:`#${bg.toString(16).padStart(6,'0')}`,
      padding:{x:5,y:2}
    }).setOrigin(0.5)
    container.add(badge)
    return container
  }

  updateMission2(dt) {
    for (let i=this.m2Targets.length-1;i>=0;i--) {
      const t=this.m2Targets[i]
      if (!t.node?.active || t.dead) continue

      t.wave+=dt*2.7
      t.node.x+=t.vx*dt+Math.sin(t.wave)*18*dt
      t.node.y+=t.vy*dt
      t.node.angle=Math.sin(t.wave*1.2)*4
      const bob=1+Math.sin(t.wave*1.4)*0.015
      t.node.setScale(bob)

      if (t.node.x<65 || t.node.x>this.scale.width-65) t.vx*=-1

      if (t.node.y>this.scale.height-120) {
        if (t.kind!=='civilian') this.registerError(t.penalty,'SİLAHLI HEDEF KAÇTI')
        this.removeM2(i)
      }
    }
  }

  shootMission2(pointer) {
    if (this.reloading) return
    const now=this.time.now
    const cooldown=this.selected.id==='nafi'?105:this.selected.id==='turgut'?145:165
    if (now-this.lastShotAt<cooldown) return
    this.lastShotAt=now

    if (this.ammo<=0) {
      this.reloadWeapon()
      return
    }

    this.ammo--
    this.shots++
    if (this.soundOn) this.sound.play('gunshot',{volume:0.44})
    this.playShootAnimation(pointer.worldX,pointer.worldY)
    this.drawShot(pointer.worldX,pointer.worldY)
    this.updateAmmoHud()

    let bestIndex=-1
    let bestD=999999

    for (let i=0;i<this.m2Targets.length;i++) {
      const t=this.m2Targets[i]
      if (!t.node?.active) continue

      const tol=this.selected.id==='zeko'?1.25:1
      const dx=(pointer.worldX-t.node.x)/(t.radiusX*tol)
      const dy=(pointer.worldY-t.node.y)/(t.radiusY*tol)
      const d=dx*dx+dy*dy
      if (d<=1 && d<bestD) {
        bestD=d
        bestIndex=i
      }
    }

    if (bestIndex<0) {
      this.combo=0
      this.comboText.setText('')
      this.updateHud()
      if (this.ammo===0) this.reloadWeapon()
      return
    }

    const t=this.m2Targets[bestIndex]
    if (t.kind==='civilian') {
      this.registerError(1,'YANLIŞ HEDEF')
      this.pop(t.node.x,t.node.y,'SİLAHSIZ!','#ff7582','#2a0609')
      this.explodeMission2Target(bestIndex,0xff7582,0.72,true)
      if (this.ammo===0) this.reloadWeapon()
      return
    }

    this.hits++
    t.hp--

    if (t.hp>0) {
      this.pop(t.node.x,t.node.y,'KALKAN KIRILDI','#9ee7ff','#062238')
      this.spawnImpactPuff(t.node.x,t.node.y,0x9ee7ff)
      try { t.node.getData('shield')?.destroy() } catch {}
      if (this.soundOn) this.sound.play('shieldBreak',{volume:0.50})
      this.updateHud()
      return
    }

    this.caught++
    this.combo++
    this.bestCombo=Math.max(this.bestCombo,this.combo)

    let earned=t.score+Math.min(this.combo*2,30)
    if (this.selected.id==='baki') earned=Math.round(earned*1.35)
    earned=Math.round(earned*this.selected.scoreMul)
    this.score+=earned

    if (this.soundOn) this.sound.play(t.kind==='gold'?'bonus':'catch',{volume:0.36})
    this.pop(t.node.x,t.node.y,`PAT! +${earned}`,t.kind==='gold'?'#ffe08a':'#75ff9d','#052016')
    this.explodeMission2Target(bestIndex,t.kind==='gold'?0xffd166:0x9ee7ff,t.kind==='gold'?1.12:0.96,false)
    this.updateHud()

    if (this.ammo===0) this.reloadWeapon()
  }

  explodeMission2Target(index,color=0x9ee7ff,scale=1,wrong=false) {
    const t=this.m2Targets[index]
    if (!t || t.dead || !t.node?.active) return
    t.dead=true
    const x=t.node.x
    const y=t.node.y
    this.explodeMetinTarget(x,y,color,scale)
    if (this.soundOn) this.sound.play('enemyExplode',{volume:wrong?0.28:0.44})

    this.tweens.add({
      targets:t.node,
      x:x+Phaser.Math.Between(-55,55),
      y:y-Phaser.Math.Between(22,48),
      angle:Phaser.Math.Between(-100,100),
      scaleX:0.28,
      scaleY:0.28,
      alpha:0,
      duration:230,
      ease:'Quad.easeOut',
      onComplete:()=>{
        try { t.node.destroy() } catch {}
        const liveIndex=this.m2Targets.indexOf(t)
        if (liveIndex>=0) this.m2Targets.splice(liveIndex,1)
      }
    })
  }

  removeM2(index) {
    const t=this.m2Targets[index]
    if (!t) return
    try { t.node.destroy() } catch {}
    this.m2Targets.splice(index,1)
  }

  // ------------------------------------------------------------
  // MISSION 3 - METIN KACIYOR
  // ------------------------------------------------------------
  startMission3() {
    this.spawnEvent=this.time.addEvent({
      delay:1450,loop:true,callback:()=>this.spawnMission3Runner()
    })
  }

  spawnMission3Runner() {
    if (!this.started || this.gameOver || this.pausedByMenu) return
    if (this.m3Runners.length>=4) return

    const fast=Math.random()<0.30
    const bonus=Math.random()<0.10
    const fromLeft=Math.random()<0.5

    const key=Phaser.Utils.Array.GetRandom(['mini1','mini2','mini3','mini4'])
    const x=fromLeft?-70:this.scale.width+70
    const y=this.scale.height-188-Phaser.Math.Between(-12,12)
    const sprite=this.add.image(x,y,'miniSheet',this.miniFrame(key)).setDisplaySize(78,118).setDepth(12)

    let ring=null
    let badge=null
    if (fast) badge=this.badge(x,y-77,'HIZLI',0xa5482f,0xffffff)
    if (bonus) {
      ring=this.add.circle(x,y,55,0xffd166,0.04).setStrokeStyle(3,0xffd166,0.80).setDepth(11)
      badge?.destroy()
      badge=this.badge(x,y-77,'ALTIN KAÇAK',0xa57612,0xffffff)
    }

    const base=fast?Phaser.Math.Between(270,330):Phaser.Math.Between(185,245)

    this.m3Runners.push({
      sprite,ring,badge,
      vx:(fromLeft?1:-1)*base,
      life:0,
      maxLife:fast?6.1:7.8,
      changeAt:Phaser.Math.FloatBetween(0.9,2.0),
      fast,bonus,resolved:false
    })
  }

  updateMission3(dt) {
    for (let i=this.m3Runners.length-1;i>=0;i--) {
      const r=this.m3Runners[i]
      if (!r.sprite?.active) continue

      r.life+=dt
      r.changeAt-=dt
      if (r.changeAt<=0) {
        r.vx*=-1
        r.vx*=Phaser.Math.FloatBetween(0.96,1.12)
        r.changeAt=Phaser.Math.FloatBetween(0.8,1.8)
        this.pop(r.sprite.x,r.sprite.y-60,'YÖN DEĞİŞTİ','#9ee7ff','#071725')
      }

      r.sprite.x+=r.vx*dt
      r.sprite.angle=Math.sin(r.life*8)*4
      if (r.ring) r.ring.setPosition(r.sprite.x,r.sprite.y)
      if (r.badge) r.badge.setPosition(r.sprite.x,r.sprite.y-77)

      if (r.sprite.x<65) { r.sprite.x=65; r.vx=Math.abs(r.vx) }
      if (r.sprite.x>this.scale.width-65) { r.sprite.x=this.scale.width-65; r.vx=-Math.abs(r.vx) }

      const dx=Math.abs(r.sprite.x-this.player.x)
      if (dx<this.selected.catchWidth) {
        this.catchMission3(i)
        continue
      }

      if (r.life>=r.maxLife) {
        this.registerError(1,'METİN KAÇTI')
        this.removeM3(i)
      }
    }
  }

  catchMission3(index) {
    const r=this.m3Runners[index]
    if (!r || r.resolved) return
    r.resolved=true

    this.caught++
    this.combo++
    this.bestCombo=Math.max(this.bestCombo,this.combo)

    let earned=r.fast?36:24
    if (r.bonus) earned+=55
    earned+=Math.min(this.combo*2,24)
    if (this.selected.id==='baki') earned=Math.round(earned*1.30)
    this.score+=Math.round(earned*this.selected.scoreMul)

    const finalEarned=Math.round(earned*this.selected.scoreMul)
    if (this.soundOn) this.sound.play(r.bonus?'bonus':'catch',{volume:0.36})
    this.playCatchAnimation()
    this.pop(r.sprite.x,r.sprite.y,`YAKALANDI +${finalEarned}`,'#75ff9d','#052016')

    r.ring?.destroy()
    r.badge?.destroy()

    this.tweens.add({
      targets:r.sprite,
      x:this.player.x,
      y:this.player.y-105,
      scaleX:r.sprite.scaleX*0.72,
      scaleY:r.sprite.scaleY*0.72,
      duration:150,
      ease:'Quad.easeIn',
      onComplete:()=>{
        try { r.sprite.destroy() } catch {}
        this.spliceObject(this.m3Runners,r)
      }
    })

    this.updateHud()
  }

  removeM3(index) {
    const r=this.m3Runners[index]
    if (!r) return
    this.destroyItem(r)
    this.m3Runners.splice(index,1)
  }

  // ------------------------------------------------------------
  // MISSION 4 - OFISI KORU
  // ------------------------------------------------------------
  startMission4() {
    this.drawOfficeAssetMarkers()
    this.spawnEvent=this.time.addEvent({
      delay:1180,loop:true,callback:()=>this.spawnMission4Invader()
    })
  }

  drawOfficeAssetMarkers() {
    const h=this.scale.height
    const xs=[this.scale.width*0.35,this.scale.width*0.525,this.scale.width*0.69]
    const names=['BELGELER','BİLGİSAYAR','MASA']
    this.officeMarkers=[]

    for (let i=0;i<3;i++) {
      const mark=this.add.text(xs[i],h-220,names[i],{
        fontFamily:'Arial Black, Arial',fontSize:'11px',
        color:'#ffffff',backgroundColor:'#163345',
        padding:{x:6,y:3}
      }).setOrigin(0.5).setDepth(8)
      this.officeMarkers.push(mark)
    }
  }

  spawnMission4Invader() {
    if (!this.started || this.gameOver || this.pausedByMenu) return
    if (this.m4Invaders.length>=7) return

    const r=Math.random()
    let kind='normal'
    if (r<0.18) kind='thief'
    else if (r<0.28) kind='heavy'
    else if (r<0.38) kind='support'

    const targetIndex=Phaser.Math.Between(0,2)
    const tx=[this.scale.width*0.35,this.scale.width*0.525,this.scale.width*0.69][targetIndex]
    const ty=this.scale.height-205

    const edge=Math.random()
    let x,y
    if (edge<0.33) { x=35; y=Phaser.Math.Between(150,360) }
    else if (edge<0.66) { x=this.scale.width-35; y=Phaser.Math.Between(150,360) }
    else { x=Phaser.Math.Between(80,this.scale.width-80); y=130 }

    const key=Phaser.Utils.Array.GetRandom(['mini1','mini2','mini3','mini4'])
    const sprite=this.add.image(x,y,'miniSheet',this.miniFrame(key)).setDisplaySize(kind==='heavy'?90:76,kind==='heavy'?135:114).setDepth(12)

    let badge=null
    if (kind==='thief') badge=this.badge(x,y-78,'EVRAK HIRSIZI',0xa5482f,0xffffff)
    if (kind==='heavy') badge=this.badge(x,y-88,'AĞIR METİN',0x8b2f3b,0xffffff)
    if (kind==='support') badge=this.badge(x,y-78,'DESTEK',0x2f6f4e,0xffffff)

    const dx=tx-x
    const dy=ty-y
    const len=Math.max(1,Math.hypot(dx,dy))
    let speed=kind==='thief'?190:kind==='heavy'?105:kind==='support'?125:145
    speed+=this.phase===1?0:this.phase===2?25:50

    this.m4Invaders.push({
      kind,sprite,badge,targetIndex,tx,ty,
      vx:dx/len*speed,vy:dy/len*speed,
      damage:kind==='heavy'?28:kind==='thief'?18:14,
      score:kind==='heavy'?55:kind==='thief'?44:kind==='support'?25:30,
      resolved:false
    })
  }

  updateMission4(dt) {
    for (let i=this.m4Invaders.length-1;i>=0;i--) {
      const inv=this.m4Invaders[i]
      if (!inv.sprite?.active) continue

      inv.sprite.x+=inv.vx*dt
      inv.sprite.y+=inv.vy*dt
      inv.sprite.angle=Math.sin(this.time.now/190+inv.targetIndex)*3
      if (inv.badge) inv.badge.setPosition(inv.sprite.x,inv.sprite.y-inv.sprite.displayHeight*0.62)

      const defenseY=this.scale.height-205
      const dx=Math.abs(inv.sprite.x-this.player.x)

      if (inv.sprite.y>=defenseY-48 && dx<this.selected.catchWidth) {
        this.catchMission4(i)
        continue
      }

      const dist=Math.hypot(inv.sprite.x-inv.tx,inv.sprite.y-inv.ty)
      if (dist<26 || inv.sprite.y>defenseY+28) {
        if (inv.kind==='support') {
          this.removeM4(i)
          continue
        }

        this.officeHealth[inv.targetIndex]=Math.max(0,this.officeHealth[inv.targetIndex]-inv.damage)
        this.missed++
        this.combo=0
        this.officeIntegrity=Math.round(this.officeHealth.reduce((a,b)=>a+b,0)/3)

        if (this.soundOn) this.sound.play('danger',{volume:0.42})
        this.cameras.main.shake(140,0.006)
        this.flashMessage(`OFİS HASAR ALDI • -${inv.damage}`,'#ff7582')
        this.removeM4(i)
        this.updateHud()

        if (this.officeIntegrity<=0) {
          this.missionSuccess=false
          this.finishMission()
          return
        }
      }
    }
  }

  catchMission4(index) {
    const inv=this.m4Invaders[index]
    if (!inv || inv.resolved) return
    inv.resolved=true

    this.playCatchAnimation()

    if (inv.kind==='support') {
      this.officeHealth=this.officeHealth.map(v=>Math.min(100,v+12))
      this.officeIntegrity=Math.round(this.officeHealth.reduce((a,b)=>a+b,0)/3)
      this.caught++
      this.score+=35
      if (this.soundOn) this.sound.play('bonus',{volume:0.40})
      this.flashMessage('DESTEK YAKALANDI • OFİS +12','#bfffd0')
    } else {
      this.caught++
      this.combo++
      this.bestCombo=Math.max(this.bestCombo,this.combo)

      let earned=inv.score+Math.min(this.combo*2,28)
      if (this.selected.id==='baki') earned=Math.round(earned*1.30)
      earned=Math.round(earned*this.selected.scoreMul)
      this.score+=earned

      if (this.soundOn) this.sound.play('catch',{volume:0.35})
      this.pop(inv.sprite.x,inv.sprite.y,`DURDURULDU +${earned}`,'#75ff9d','#052016')
    }

    inv.badge?.destroy()
    this.tweens.add({
      targets:inv.sprite,
      x:this.player.x,
      y:this.player.y-108,
      alpha:0,
      scaleX:inv.sprite.scaleX*0.65,
      scaleY:inv.sprite.scaleY*0.65,
      duration:180,
      ease:'Quad.easeIn',
      onComplete:()=>{
        try { inv.sprite.destroy() } catch {}
        this.spliceObject(this.m4Invaders,inv)
      }
    })
    this.updateHud()
  }

  removeM4(index) {
    const inv=this.m4Invaders[index]
    if (!inv) return
    this.destroyItem(inv)
    this.m4Invaders.splice(index,1)
  }

  // ------------------------------------------------------------
  // MISSION 5 - BÜYÜK METIN BOSS
  // ------------------------------------------------------------
  startMission5() {
    this.maxAmmo=this.selected.id==='turgut'?10:this.selected.id==='zeko'?9:8
    this.ammo=this.maxAmmo
    this.bossMaxHP=320
    this.bossHP=this.bossMaxHP
    this.playerHP=5
    this.updateAmmoHud()

    const w=this.scale.width
    const bossContainer=this.add.container(w/2,245).setDepth(13)
    const ring=this.add.circle(0,0,142,0xb62d3f,0.06)
      .setStrokeStyle(5,0xd14c5d,0.75)
    const img=this.add.image(0,0,'miniSheet',0).setDisplaySize(185,275)
    const label=this.add.text(0,-167,'BÜYÜK METİN',{
      fontFamily:'Arial Black, Arial',fontSize:'14px',
      color:'#ffffff',backgroundColor:'#8f2232',
      padding:{x:8,y:3}
    }).setOrigin(0.5)
    bossContainer.add([ring,img,label])

    this.boss={
      node:bossContainer,img,
      vx:150,
      shootTimer:1.05,
      minionTimer:3.2,
      dead:false
    }

    this.drawBossBar()
  }

  drawBossBar() {
    if (this.bossBarObjects) {
      for (const o of this.bossBarObjects) try{o.destroy()}catch{}
    }

    const w=this.scale.width
    const x=w/2
    const y=202
    const bg=this.add.rectangle(x,y,410,18,0x20080d,0.95)
      .setStrokeStyle(2,0x8e3b49,1).setDepth(32)
    const fill=this.add.rectangle(x-200,y,400,12,0xc83d50,1)
      .setOrigin(0,0.5).setDepth(33)
    const text=this.add.text(x,y-26,'BOSS CANI %100',{
      fontFamily:'Arial Black, Arial',fontSize:'12px',color:'#ffffff'
    }).setOrigin(0.5).setDepth(34)

    this.bossBarBg=bg
    this.bossBarFill=fill
    this.bossBarText=text
    this.bossBarObjects=[bg,fill,text]
  }

  updateBossBar() {
    if (!this.bossBarFill) return
    const ratio=Phaser.Math.Clamp(this.bossHP/this.bossMaxHP,0,1)
    this.bossBarFill.width=400*ratio
    this.bossBarText.setText(`BOSS CANI %${Math.round(ratio*100)}`)
    this.countText.setText(`BOSS  %${Math.round(ratio*100)}`)
  }

  updateMission5(dt) {
    if (!this.boss?.node?.active || this.boss.dead) return

    const boss=this.boss
    boss.node.x+=boss.vx*dt
    if (boss.node.x<170) { boss.node.x=170; boss.vx=Math.abs(boss.vx) }
    if (boss.node.x>this.scale.width-170) { boss.node.x=this.scale.width-170; boss.vx=-Math.abs(boss.vx) }

    boss.shootTimer-=dt
    boss.minionTimer-=dt

    if (boss.shootTimer<=0) {
      this.spawnBossProjectile()
      boss.shootTimer=this.bossPhase===1?1.10:this.bossPhase===2?0.82:0.58
    }

    if (boss.minionTimer<=0) {
      this.spawnBossMinion()
      boss.minionTimer=this.bossPhase===1?3.5:this.bossPhase===2?2.7:2.1
    }

    for (let i=this.m5Projectiles.length-1;i>=0;i--) {
      const p=this.m5Projectiles[i]
      if (!p.node?.active) continue
      p.node.x+=p.vx*dt
      p.node.y+=p.vy*dt

      const dx=Math.abs(p.node.x-this.player.x)
      const dy=Math.abs(p.node.y-(this.player.y-100))
      if (dx<58 && dy<88) {
        this.hitPlayerMission5(i)
        continue
      }
      if (p.node.y>this.scale.height+40) this.removeBossProjectile(i)
    }

    for (let i=this.m5Minions.length-1;i>=0;i--) {
      const m=this.m5Minions[i]
      if (!m.node?.active || m.dead) continue
      m.node.y+=m.vy*dt
      m.node.x+=Math.sin((this.time.now+m.seed)/330)*35*dt

      if (m.node.y>this.scale.height-105) {
        const beforeErrors=this.missed
        this.registerError(1,'MİNYON GEÇTİ')
        const errorApplied=this.missed>beforeErrors
        if (errorApplied) this.playerHP=Math.max(0,this.playerHP-1)
        this.removeBossMinion(i)
        this.updateHud()
        if (this.playerHP<=0) {
          this.missionSuccess=false
          this.finishMission()
          return
        }
      }
    }
  }

  spawnBossProjectile() {
    if (this.m5Projectiles.length>=8) return
    const bx=this.boss.node.x
    const by=this.boss.node.y+100
    const tx=this.player.x+Phaser.Math.Between(-90,90)
    const dx=tx-bx
    const dy=(this.scale.height-80)-by
    const len=Math.max(1,Math.hypot(dx,dy))
    const speed=this.bossPhase===1?280:this.bossPhase===2?330:390

    const node=this.add.circle(bx,by,this.bossPhase===3?15:12,0xff5364,0.85)
      .setStrokeStyle(4,0xffb36c,0.88).setDepth(14)

    this.m5Projectiles.push({
      node,vx:dx/len*speed,vy:dy/len*speed
    })
  }

  spawnBossMinion() {
    if (this.m5Minions.length>=5) return
    const key=Phaser.Utils.Array.GetRandom(['mini2','mini3','mini4'])
    const node=this.add.container(
      this.boss.node.x+Phaser.Math.Between(-100,100),
      this.boss.node.y+95
    ).setDepth(12)
    const img=this.add.image(0,0,'miniSheet',this.miniFrame(key)).setDisplaySize(66,98)
    const badge=this.add.text(0,-62,'MİNYON',{
      fontFamily:'Arial Black, Arial',fontSize:'9px',color:'#ffffff',
      backgroundColor:'#67303a',padding:{x:4,y:2}
    }).setOrigin(0.5)
    node.add([img,badge])

    this.m5Minions.push({
      node,vy:this.bossPhase===1?125:this.bossPhase===2?160:195,
      seed:Math.random()*5000,
      dead:false
    })
  }

  hitPlayerMission5(index) {
    const p=this.m5Projectiles[index]
    if (!p) return

    if (this.selected.id==='turgut' && this.firstErrorShield) {
      this.firstErrorShield=false
      this.flashMessage('USTA REFLEKSİ • DARBE ENGELLENDİ','#9ee7ff')
      this.removeBossProjectile(index)
      return
    }

    this.playerHP=Math.max(0,this.playerHP-1)
    this.missed++
    this.combo=0
    this.playHitAnimation()
    if (this.soundOn) this.sound.play('danger',{volume:0.45})
    this.cameras.main.shake(150,0.007)
    this.flashMessage(`DARBE! CAN ${this.playerHP}/5`,'#ff7582')
    this.removeBossProjectile(index)
    this.updateHud()

    if (this.playerHP<=0) {
      this.missionSuccess=false
      this.finishMission()
    }
  }

  shootMission5(pointer) {
    if (this.reloading) return
    const now=this.time.now
    const cooldown=this.selected.id==='nafi'?90:this.selected.id==='turgut'?125:150
    if (now-this.lastShotAt<cooldown) return
    this.lastShotAt=now

    if (this.ammo<=0) {
      this.reloadWeapon()
      return
    }

    this.ammo--
    this.shots++
    if (this.soundOn) this.sound.play('gunshot',{volume:0.44})
    this.playShootAnimation(pointer.worldX,pointer.worldY)
    this.drawShot(pointer.worldX,pointer.worldY)
    this.updateAmmoHud()

    // Minions take priority if cursor is on one.
    for (let i=this.m5Minions.length-1;i>=0;i--) {
      const m=this.m5Minions[i]
      const tol=this.selected.id==='zeko'?1.25:1
      if (Math.abs(pointer.worldX-m.node.x)<48*tol &&
          Math.abs(pointer.worldY-m.node.y)<65*tol) {
        this.hits++
        this.caught++
        this.combo++
        const earned=Math.round((28+Math.min(this.combo*2,20))*this.selected.scoreMul)
        this.score+=earned
        this.pop(m.node.x,m.node.y,`MİNYON +${earned}`,'#75ff9d','#052016')
        this.explodeBossMinion(i)
        this.updateHud()
        if (this.ammo===0) this.reloadWeapon()
        return
      }
    }

    const tol=this.selected.id==='zeko'?1.18:1
    const hitBoss=
      Math.abs(pointer.worldX-this.boss.node.x)<105*tol &&
      Math.abs(pointer.worldY-this.boss.node.y)<145*tol

    if (hitBoss) {
      this.hits++
      this.combo++
      this.bestCombo=Math.max(this.bestCombo,this.combo)

      let damage=this.selected.id==='turgut'?8:this.selected.id==='nafi'?6:7
      if (this.selected.id==='baki' && this.combo%5===0) damage+=5

      this.bossHP=Math.max(0,this.bossHP-damage)
      const earned=Math.round((damage*5+Math.min(this.combo,25))*this.selected.scoreMul)
      this.score+=earned

      this.boss.img.setTint(0xffffff)
      this.time.delayedCall(65,()=>{ try{this.boss.img.clearTint()}catch{} })

      this.spawnImpactPuff(pointer.worldX,pointer.worldY,0xffd166)
      if (this.soundOn) this.sound.play('bossHit',{volume:0.38})
      this.pop(pointer.worldX,pointer.worldY,`-${damage} CAN`,'#ffe08a','#371016')
      this.updateBossBar()
      this.updateBossPhase()
      this.updateHud()

      if (this.bossHP<=0) {
        this.missionSuccess=true
        this.flashMessage('BÜYÜK METİN YENİLDİ!','#bfffd0')
        this.playBossDeathExplosion()
        this.time.delayedCall(980,()=>this.finishMission())
        return
      }
    } else {
      this.combo=0
    }

    if (this.ammo===0) this.reloadWeapon()
  }

  updateBossPhase() {
    const ratio=this.bossHP/this.bossMaxHP
    const next=ratio>0.67?1:ratio>0.34?2:3
    if (next===this.bossPhase) return
    this.bossPhase=next
    this.phaseText.setText(`BÜYÜK METİN • EVRE ${next}`)
    this.flashMessage(`BOSS EVRE ${next}!`,next===3?'#ff7582':'#ffb167')
    this.boss.vx*=1.20
  }

  explodeBossMinion(index) {
    const m=this.m5Minions[index]
    if (!m || m.dead || !m.node?.active) return
    m.dead=true
    const x=m.node.x
    const y=m.node.y
    this.explodeMetinTarget(x,y,0x9ee7ff,0.90)
    if (this.soundOn) this.sound.play('enemyExplode',{volume:0.34})
    this.tweens.add({
      targets:m.node,
      y:y-35,
      x:x+Phaser.Math.Between(-45,45),
      angle:Phaser.Math.Between(-120,120),
      scaleX:0.25,scaleY:0.25,alpha:0,
      duration:220,
      onComplete:()=>{
        try { m.node.destroy() } catch {}
        const liveIndex=this.m5Minions.indexOf(m)
        if (liveIndex>=0) this.m5Minions.splice(liveIndex,1)
      }
    })
  }

  playBossDeathExplosion() {
    if (!this.boss?.node?.active) return
    const x=this.boss.node.x
    const y=this.boss.node.y
    this.boss.dead=true
    if (this.soundOn) this.sound.play('bossExplode',{volume:0.52})
    this.explodeMetinTarget(x,y,0xff6677,1.8)
    this.time.delayedCall(170,()=>this.explodeMetinTarget(x-60,y+25,0xffd166,1.25))
    this.time.delayedCall(330,()=>this.explodeMetinTarget(x+58,y-12,0xff8b66,1.35))
    this.tweens.add({
      targets:this.boss.node,
      angle:Phaser.Math.Between(-18,18),
      scaleX:1.18,scaleY:1.18,
      alpha:0,
      y:y-25,
      duration:760,
      ease:'Quad.easeOut'
    })
    this.cameras.main.shake(500,0.008)
  }

  removeBossProjectile(index) {
    const p=this.m5Projectiles[index]
    if (!p) return
    try { p.node.destroy() } catch {}
    this.m5Projectiles.splice(index,1)
  }

  removeBossMinion(index) {
    const m=this.m5Minions[index]
    if (!m) return
    try { m.node.destroy() } catch {}
    this.m5Minions.splice(index,1)
  }

  // ------------------------------------------------------------
  // SHOOTER SHARED
  // ------------------------------------------------------------
  reloadWeapon() {
    if (!this.started || this.gameOver || this.pausedByMenu) return
    if (this.selectedMission!==2 && this.selectedMission!==5) return
    if (this.reloading || this.ammo===this.maxAmmo) return

    this.reloading=true
    ++this.playerAnimToken
    this.playerActionLockUntil=this.time.now+780
    this.specialText.setText('ŞARJÖR DOLDURULUYOR...')
    if (this.soundOn) this.sound.play('reload',{volume:0.48})

    const duration=this.selected.id==='nafi'?520:this.selected.id==='turgut'?650:720
    this.setPlayerPose('reload1')

    if (this.weaponPivot) {
      this.tweens.add({
        targets:this.weaponPivot,
        rotation:0.78,
        y:-105,
        x:-24,
        duration:Math.round(duration*0.40),
        ease:'Sine.easeInOut'
      })
    }

    this.time.delayedCall(Math.round(duration*0.38),()=>{
      if (this.gameOver) return
      this.setPlayerPose('reload2')
    })

    this.time.delayedCall(duration,()=>{
      if (this.gameOver) return
      this.ammo=this.maxAmmo
      this.reloading=false
      this.playerImage.setAngle(0)
      this.playerImage.setY(-104)
      this.setPlayerPose('aim')
      if (this.weaponPivot) {
        this.weaponPivot.setPosition(-18,-136)
      }
      this.aimWeapon(this.lastAimX||this.scale.width/2,this.lastAimY||210,true)
      this.updateAmmoHud()
      this.specialText.setText('')
    })
  }

  updateAmmoHud() {
    if (this.selectedMission===2) {
      this.phaseText.setText(`ŞARJÖR  ${this.ammo}/${this.maxAmmo} • ${this.reloading?'DOLDURULUYOR':'HAZIR'}`)
    }
    if (this.selectedMission===5) {
      this.specialText.setText(this.reloading?'ŞARJÖR DOLDURULUYOR...':`MERMİ ${this.ammo}/${this.maxAmmo}`)
    }
  }

  drawShot(x,y) {
    if (!this.player) return

    let startX=this.player.x+48
    let startY=this.player.y-130
    let angle=-0.8

    if (this.weaponPivot) {
      angle=this.weaponPivot.rotation
      startX=this.player.x+this.weaponPivot.x+Math.cos(angle)*74
      startY=this.player.y+this.weaponPivot.y+Math.sin(angle)*74
    }

    this.spawnShotSmoke(startX,startY,angle)
    this.spawnImpactPuff(x,y,0xd7e6ef)
  }

  spawnShotSmoke(x,y,angle) {
    const count=this.dynamicParticleLoad()>10?2:4
    for (let i=0;i<count;i++) {
      const p=this.add.circle(x,y,Phaser.Math.Between(3,6),i===0?0xffd88a:0xcdd8df,0.85-i*0.15).setDepth(68)
      this.tweens.add({
        targets:p,
        x:x+Math.cos(angle)*Phaser.Math.Between(8,24)+Phaser.Math.Between(-6,6),
        y:y+Math.sin(angle)*Phaser.Math.Between(8,24)+Phaser.Math.Between(-6,6),
        scale:1.5,
        alpha:0,
        duration:180+Phaser.Math.Between(0,90),
        onComplete:()=>p.destroy()
      })
    }
  }

  spawnShellCasing() {
    if (!this.player) return
    const x=this.player.x+10
    const y=this.player.y-128
    const casing=this.add.rectangle(x,y,8,3,0xc9a75b,0.96).setDepth(68)
    this.tweens.add({
      targets:casing,
      x:x+Phaser.Math.Between(-28,-8),
      y:y+Phaser.Math.Between(12,30),
      angle:Phaser.Math.Between(220,420),
      alpha:0,
      duration:280,
      ease:'Quad.easeOut',
      onComplete:()=>casing.destroy()
    })
  }

  spawnImpactPuff(x,y,color=0xd7e6ef) {
    const g=this.add.graphics().setDepth(69)
    g.fillStyle(color,0.35)
    g.fillCircle(x,y,10)
    g.lineStyle(2,0xffffff,0.45)
    g.strokeCircle(x,y,14)
    this.tweens.add({
      targets:g,
      alpha:0,
      duration:120,
      onComplete:()=>g.destroy()
    })
  }

  explodeMetinTarget(x,y,color=0xffd166,scale=1) {
    const flash=this.add.circle(x,y,20*scale,0xfff3c2,0.85).setDepth(63)
    this.tweens.add({targets:flash,scale:1.7,alpha:0,duration:160,onComplete:()=>flash.destroy()})

    const sparkCount=this.dynamicParticleLoad()>10?5:9
    for (let i=0;i<sparkCount;i++) {
      const piece=(i%2===0)
        ? this.add.rectangle(x,y,Phaser.Math.Between(5,11),Phaser.Math.Between(3,7),color,0.95).setDepth(64)
        : this.add.circle(x,y,Phaser.Math.Between(3,6),i<3?0xffe9a6:0xdadfe4,0.9).setDepth(64)
      this.tweens.add({
        targets:piece,
        x:x+Phaser.Math.Between(-70,70)*scale,
        y:y+Phaser.Math.Between(-65,65)*scale,
        angle:Phaser.Math.Between(-240,240),
        alpha:0,
        duration:260+Phaser.Math.Between(0,120),
        ease:'Quad.easeOut',
        onComplete:()=>piece.destroy()
      })
    }

    const smokeCount=this.dynamicParticleLoad()>10?2:4
    for (let i=0;i<smokeCount;i++) {
      const smoke=this.add.circle(x,y,Phaser.Math.Between(10,18)*scale,0x72777d,0.26).setDepth(63)
      this.tweens.add({
        targets:smoke,
        x:x+Phaser.Math.Between(-30,30),
        y:y+Phaser.Math.Between(-28,20),
        scale:1.35,
        alpha:0,
        duration:360+Phaser.Math.Between(0,140),
        onComplete:()=>smoke.destroy()
      })
    }
  }


  // ------------------------------------------------------------
  // COMMON SCORING / HUD / RESULTS
  // ------------------------------------------------------------
  registerError(amount=1,label='HATA') {
    if (amount<=0) return

    if (this.selected.id==='turgut' && this.firstErrorShield && amount===1) {
      this.firstErrorShield=false
      this.flashMessage('USTA REFLEKSİ • HATA ENGELLENDİ','#9ee7ff')
      return
    }

    this.missed+=amount
    this.combo=0
    this.comboText.setText('')
    this.playHitAnimation()
    this.stopFever()

    if (this.soundOn) this.sound.play('miss',{volume:0.40})
    this.cameras.main.shake(110,0.0045)
    this.flashMessage(`${label} • +${amount} HATA`,'#ff7582')
    this.updateHud()
  }

  updateHud() {
    this.scoreText.setText(`SKOR  ${this.score.toLocaleString('tr-TR')}`)
    this.errorText.setText(`HATA  ${this.missed}`)

    const accuracy=this.getAccuracy()

    if (this.selectedMission===1) {
      this.countText.setText(`YAKALANAN  ${this.caught}`)
      this.accuracyText.setText(`ORAN  %${accuracy}`)
      const m1=(this.caught>=40?'[✓]':'[ ]')+' 40 yakala'
      const m2=(this.bestCombo>=12?'[✓]':'[ ]')+' x12 kombo'
      const m3=(this.missed<=2?'[✓]':'[ ]')+' En fazla 2 hata'
      this.missionText.setText(`GÖREV 1\n${m1}\n${m2}\n${m3}`)
    }

    if (this.selectedMission===2) {
      this.countText.setText(`VURULAN  ${this.caught}`)
      this.accuracyText.setText(`İSABET  %${accuracy}`)
      this.updateAmmoHud()
    }

    if (this.selectedMission===3) {
      this.countText.setText(`YAKALANAN  ${this.caught}`)
      this.accuracyText.setText(`ORAN  %${accuracy}`)
    }

    if (this.selectedMission===4) {
      this.countText.setText(`DURDURULAN  ${this.caught}`)
      this.phaseText.setText(`OFİS  %${this.officeIntegrity}`)
      this.accuracyText.setText(`SAVUNMA  %${this.officeIntegrity}`)
      this.missionText.setText(
        `GÖREV 4\n`+
        `BELGELER %${this.officeHealth[0]}\n`+
        `BİLGİSAYAR %${this.officeHealth[1]}\n`+
        `MASA %${this.officeHealth[2]}`
      )
    }

    if (this.selectedMission===5) {
      this.accuracyText.setText(`CAN  ${this.playerHP}/5`)
      this.updateBossBar()
      this.updateAmmoHud()
    }

    if (this.combo>=2) {
      this.comboText.setText(`KOMBO x${this.combo}`)
    }

    if (this.missed===0) {
      this.errorText.setColor('#72ff8b')
    } else if (this.missed<=2) {
      this.errorText.setColor('#ffd166')
    } else {
      this.errorText.setColor('#ff7582')
    }
  }

  getAccuracy() {
    if (this.selectedMission===2 || this.selectedMission===5) {
      return this.shots===0?100:Math.round(this.hits/this.shots*100)
    }
    const total=this.caught+this.missed
    return total===0?100:Math.round(this.caught/total*100)
  }

  updateTimer() {
    const sec=Math.max(0,this.secondsLeft)
    const mm=Math.floor(sec/60).toString().padStart(2,'0')
    const ss=(sec%60).toString().padStart(2,'0')
    this.timeText.setText(`SÜRE  ${mm}:${ss}`)
    if (sec<=10) this.timeText.setColor('#ffd166')
    else this.timeText.setColor('#ffffff')
  }

  finishMissionByTime() {
    if (this.gameOver) return

    if (this.selectedMission===1) this.missionSuccess=true
    if (this.selectedMission===2) this.missionSuccess=this.caught>=20
    if (this.selectedMission===3) this.missionSuccess=this.caught>=18
    if (this.selectedMission===4) this.missionSuccess=this.officeIntegrity>0
    if (this.selectedMission===5) this.missionSuccess=this.bossHP<=0

    this.finishMission()
  }

  finishMission() {
    if (this.gameOver) return

    this.gameOver=true
    this.started=false
    this.stopFever()

    try { this.spawnEvent?.remove() } catch {}
    try { this.secondEvent?.remove() } catch {}
    for (const e of this.extraEvents) try{e?.remove()}catch{}
    this.extraEvents=[]

    this.cleanupMissionObjects()
    this.stopAllAudio()

    const accuracy=this.getAccuracy()
    const stars=this.calculateStars(accuracy)
    const grade=this.calculateGrade(accuracy,this.missionSuccess)

    this.saveMissionRecord({
      missionId:this.selectedMission,
      score:this.score,
      stars,
      grade,
      accuracy,
      errors:this.missed,
      success:this.missionSuccess,
      zeroError:this.missed===0,
      character:this.selected.name
    })

    this.updateCareerHud()

    if (this.soundOn) {
      this.sound.play(this.missionSuccess?'resultGood':'resultTry',{volume:0.44})
    }

    this.showMissionResult(accuracy,stars,grade)
  }

  calculateStars(accuracy) {
    let stars=this.missionSuccess?1:0
    if (this.missionSuccess && this.missed<=2) stars++
    if (this.missionSuccess && accuracy>=88) stars++
    return Phaser.Math.Clamp(stars,0,3)
  }

  calculateGrade(accuracy,success) {
    if (success && this.missed===0 && accuracy>=90) return 'S'
    if (success && this.missed<=1 && accuracy>=88) return 'A+'
    if (success && accuracy>=85) return 'A'
    if (success) return 'B'
    if (accuracy>=70) return 'C'
    return 'D'
  }

  showMissionResult(accuracy,stars,grade) {
    const w=this.scale.width
    const h=this.scale.height
    const m=this.currentMission()

    const color=grade==='S'?'#72ff8b':
                grade==='A+'?'#bfffd0':
                grade==='A'?'#ffd166':
                grade==='B'?'#ffcf8b':
                '#ff9aa5'

    const headline=this.missionSuccess
      ? `GÖREV ${m.id} TAMAMLANDI`
      : `GÖREV ${m.id} TAMAMLANAMADI`

    let specific=''
    if (m.id===1) specific=`Yakalanan ${this.caught} • En iyi kombo x${this.bestCombo} • Tam İsabet ${this.perfectCatches}`
    if (m.id===2) specific=`Vurulan ${this.caught} • Atış ${this.shots} • İsabet %${accuracy}`
    if (m.id===3) specific=`Yakalanan ${this.caught} • En iyi kombo x${this.bestCombo}`
    if (m.id===4) specific=`Ofis bütünlüğü %${this.officeIntegrity} • Durdurulan ${this.caught}`
    if (m.id===5) specific=`Boss canı %${Math.round(this.bossHP/Math.max(1,this.bossMaxHP)*100)} • Oyuncu canı ${this.playerHP}/5`

    const overlay=this.add.rectangle(w/2,h/2,w,h,0x02070b,0.86).setDepth(100)
    const card=this.add.rectangle(w/2,h/2,Math.min(1040,w-55),Math.min(620,h-45),0x071725,0.997)
      .setStrokeStyle(3,0x3b7297,0.96).setDepth(101)

    const gradeText=this.add.text(w/2-400,h/2-135,grade,{
      fontFamily:'Arial Black, Arial',fontSize:'82px',
      color,stroke:'#031018',strokeThickness:8
    }).setOrigin(0.5).setDepth(102)

    const avatar=this.add.image(w/2-400,h/2+30,this.selected.texture).setDepth(102)
    this.sizeMenuAvatar(avatar,this.selected.id)

    const title=this.add.text(w/2+80,h/2-210,headline,{
      fontFamily:'Arial Black, Arial',fontSize:'27px',
      color,align:'center'
    }).setOrigin(0.5).setDepth(102)

    const missionName=this.add.text(w/2+80,h/2-170,`${m.title} • ${'★'.repeat(stars)}${'☆'.repeat(3-stars)}`,{
      fontFamily:'Arial Black, Arial',fontSize:'18px',color:'#ffffff'
    }).setOrigin(0.5).setDepth(102)

    const stats=this.add.text(w/2-170,h/2-105,
      `SKOR              ${this.score.toLocaleString('tr-TR')}\n`+
      `HATA              ${this.missed}\n`+
      `BAŞARI / ORAN     %${accuracy}\n`+
      `KARAKTER          ${this.selected.name}\n`+
      `DERECE            ${grade}\n`+
      `YILDIZ            ${stars}/3`,
      {
        fontFamily:'Arial',fontSize:'17px',fontStyle:'bold',
        color:'#ffffff',lineSpacing:9
      }
    ).setDepth(102)

    const detail=this.add.text(w/2+255,h/2-88,specific,{
      fontFamily:'Arial',fontSize:'15px',color:'#cde3ee',
      align:'center',wordWrap:{width:370}
    }).setOrigin(0.5,0).setDepth(102)

    const zero=this.add.text(w/2+255,h/2+25,
      this.missed===0?'SIFIR HATA MADALYASI KAZANILDI':'HEDEF: SIFIR HATA',
      {
        fontFamily:'Arial Black, Arial',fontSize:'15px',
        color:this.missed===0?'#72ff8b':'#ffd166',
        align:'center'
      }
    ).setOrigin(0.5).setDepth(102)

    const nextId=this.selectedMission<5?this.selectedMission+1:1

    const again=this.menuButtonWidget(w/2-225,h/2+180,'TEKRAR OYNA',()=>{
      this.scene.restart({missionId:this.selectedMission,autoStart:true})
    },true,205,112)

    const next=this.menuButtonWidget(w/2+5,h/2+180,
      this.selectedMission<5?'SONRAKİ GÖREV':'GÖREV 1',
      ()=>{
        localStorage.setItem('metinballMission',String(nextId))
        this.scene.restart({missionId:nextId,autoStart:true})
      },false,205,112)

    const missions=this.menuButtonWidget(w/2-110,h/2+235,'GÖREVLER',()=>{
      this.scene.restart({openMissionSelect:true})
    },false,205,112)

    const home=this.menuButtonWidget(w/2+120,h/2+235,'ANA MENÜ',()=>{
      this.scene.restart({})
    },false,205,112)

    this.activeOverlay=[
      overlay,card,gradeText,avatar,title,missionName,
      stats,detail,zero,again,next,missions,home
    ]
  }

  cleanupMissionObjects() {
    const arrays=[
      this.m1Items,this.m2Targets,this.m3Runners,
      this.m4Invaders,this.m5Minions,this.m5Projectiles
    ]

    for (const arr of arrays) {
      for (const item of arr) {
        try { item.sprite?.destroy() } catch {}
        try { item.node?.destroy() } catch {}
        try { item.ring?.destroy() } catch {}
        try { item.badge?.destroy() } catch {}
      }
      arr.length=0
    }

    try { this.boss?.node?.destroy() } catch {}
    this.boss=null

    if (this.bossBarObjects) {
      for (const o of this.bossBarObjects) try{o.destroy()}catch{}
      this.bossBarObjects=[]
    }

    if (this.officeMarkers) {
      for (const o of this.officeMarkers) try{o.destroy()}catch{}
      this.officeMarkers=[]
    }

    try { this.crosshair?.destroy() } catch {}
    this.crosshair=null
  }

  // ------------------------------------------------------------
  // PAUSE
  // ------------------------------------------------------------
  openPauseMenu() {
    if (!this.started || this.gameOver || this.pausedByMenu) return
    this.pausedByMenu=true
    this.tweens.pauseAll()

    const w=this.scale.width
    const h=this.scale.height
    const m=this.currentMission()

    const overlay=this.add.rectangle(w/2,h/2,w,h,0x02070b,0.74).setDepth(120)
    const card=this.add.rectangle(w/2,h/2,520,480,0x071725,0.995)
      .setStrokeStyle(3,0x3b7297,0.96).setDepth(121)

    const title=this.add.text(w/2,h/2-180,'OYUN DURDU',{
      fontFamily:'Arial Black, Arial',fontSize:'29px',color:'#ffffff'
    }).setOrigin(0.5).setDepth(122)

    const mission=this.add.text(w/2,h/2-138,`GÖREV ${m.id} • ${m.title}`,{
      fontFamily:'Arial',fontSize:'14px',fontStyle:'bold',color:'#9ed7f4'
    }).setOrigin(0.5).setDepth(122)

    const resume=this.pauseButton(w/2,h/2-80,'DEVAM ET',()=>this.closePauseMenu(),true)
    const restart=this.pauseButton(w/2,h/2-20,'YENİDEN BAŞLAT',()=>{
      this.tweens.resumeAll()
      this.scene.restart({missionId:this.selectedMission,autoStart:true})
    })
    const missions=this.pauseButton(w/2,h/2+40,'GÖREVLER',()=>{
      this.tweens.resumeAll()
      this.stopAllAudio()
      this.scene.restart({openMissionSelect:true})
    })
    const home=this.pauseButton(w/2,h/2+100,'ANA MENÜ',()=>{
      this.tweens.resumeAll()
      this.stopAllAudio()
      this.scene.restart({})
    })
    const exit=this.pauseButton(w/2,h/2+160,'ÇIKIŞ',()=>{
      this.tweens.resumeAll()
      this.exitGame()
    })

    this.pauseObjects=[overlay,card,title,mission,resume,restart,missions,home,exit]
  }

  pauseButton(x,y,label,handler,primary=false) {
    const b=this.add.text(x,y,label,{
      fontFamily:'Arial Black, Arial',fontSize:'16px',
      color:primary?'#071725':'#ffffff',
      backgroundColor:primary?'#ffd166':'#12334a',
      fixedWidth:300,align:'center',padding:{x:10,y:10}
    }).setOrigin(0.5).setInteractive({useHandCursor:true}).setDepth(123)
    b.on('pointerdown',handler)
    return b
  }

  closePauseMenu() {
    for (const o of this.pauseObjects) try{o.destroy()}catch{}
    this.pauseObjects=[]
    this.pausedByMenu=false
    this.tweens.resumeAll()
  }

  // ------------------------------------------------------------
  // VISUAL HELPERS
  // ------------------------------------------------------------
  badge(x,y,text,bg,fg) {
    return this.add.text(x,y,text,{
      fontFamily:'Arial Black, Arial',
      fontSize:'10px',
      color:`#${fg.toString(16).padStart(6,'0')}`,
      backgroundColor:`#${bg.toString(16).padStart(6,'0')}`,
      padding:{x:5,y:2}
    }).setOrigin(0.5).setDepth(14)
  }

  animateToLap(item,onDone) {
    if (!item || item.resolved) return
    item.resolved=true

    try { item.ring?.destroy() } catch {}
    try { item.badge?.destroy() } catch {}

    const sprite=item.sprite
    if (!sprite?.active || !this.player?.active) {
      try{sprite?.destroy()}catch{}
      onDone?.()
      return
    }

    const originalScaleX=sprite.scaleX
    const originalScaleY=sprite.scaleY

    // Mevcut yakalama davranışı korunur:
    // Dünya koordinatını karakter container'ının yerel koordinatına çevir.
    const localX=sprite.x-this.player.x
    const localY=sprite.y-this.player.y

    // Karakter image/label zaten container içinde.
    // Mini Metin sonradan eklendiği için karakterin ÖNÜNDE çizilir
    // ve oyuncu sağa/sola hareket ederken onunla birlikte hareket eder.
    this.player.add(sprite)
    sprite.setPosition(localX,localY)
    sprite.setAngle(sprite.angle)

    const side=Phaser.Math.Clamp(localX*0.10,-24,24)
    const lapY=-108

    this.tweens.add({
      targets:sprite,
      x:side,
      y:lapY-18,
      angle:0,
      scaleX:originalScaleX*0.82,
      scaleY:originalScaleY*0.82,
      duration:145,
      ease:'Quad.easeIn',
      onComplete:()=>{
        if (!sprite?.active) { onDone?.(); return }

        this.tweens.add({
          targets:sprite,
          y:lapY,
          scaleX:originalScaleX*0.76,
          scaleY:originalScaleY*0.76,
          duration:85,
          ease:'Sine.easeOut',
          onComplete:()=>{
            if (!sprite?.active) { onDone?.(); return }

            this.time.delayedCall(135,()=>{
              if (!sprite?.active) { onDone?.(); return }

              this.tweens.add({
                targets:sprite,
                y:lapY+5,
                alpha:0,
                scaleX:originalScaleX*0.48,
                scaleY:originalScaleY*0.48,
                duration:155,
                ease:'Quad.easeOut',
                onComplete:()=>{
                  try{sprite.destroy()}catch{}
                  onDone?.()
                }
              })
            })
          }
        })
      }
    })
  }

  destroyItem(item) {
    try { item.sprite?.destroy() } catch {}
    try { item.node?.destroy() } catch {}
    try { item.ring?.destroy() } catch {}
    try { item.badge?.destroy() } catch {}
  }

  spliceObject(arr,obj) {
    const i=arr.indexOf(obj)
    if (i>=0) arr.splice(i,1)
  }

  pop(x,y,text,color='#ffffff',bg='#071725') {
    const t=this.add.text(x,y,text,{
      fontFamily:'Arial Black, Arial',fontSize:'13px',
      color,backgroundColor:bg,padding:{x:6,y:3}
    }).setOrigin(0.5).setDepth(60)

    this.tweens.add({
      targets:t,y:y-38,alpha:0,duration:620,
      ease:'Quad.easeOut',onComplete:()=>t.destroy()
    })
  }

  flashMessage(text,color='#ffd166') {
    const w=this.scale.width
    const t=this.add.text(w/2,205,text,{
      fontFamily:'Arial Black, Arial',fontSize:'21px',
      color,backgroundColor:'#06131d',
      padding:{x:10,y:5}
    }).setOrigin(0.5).setDepth(62)

    t.setScale(1.12)
    this.tweens.add({
      targets:t,scale:1,duration:120,
      onComplete:()=>this.time.delayedCall(620,()=>{
        if (!t.active) return
        this.tweens.add({targets:t,alpha:0,duration:220,onComplete:()=>t.destroy()})
      })
    })
  }

  arcadeBurst(x,y,color) {
    const count=this.dynamicParticleLoad()>8?2:4
    for (let i=0;i<count;i++) {
      const p=this.add.circle(x,y,Phaser.Math.Between(3,6),color,0.90).setDepth(61)
      this.tweens.add({
        targets:p,
        x:x+Phaser.Math.Between(-45,45),
        y:y+Phaser.Math.Between(-45,45),
        alpha:0,
        duration:260,
        onComplete:()=>p.destroy()
      })
    }
  }

  dynamicParticleLoad() {
    return this.m1Items.length+this.m2Targets.length+this.m3Runners.length+
           this.m4Invaders.length+this.m5Minions.length+this.m5Projectiles.length
  }

  startFever() {
    this.fever=true
    this.specialText.setText('HATASIZ SERİ • x1.5 PUAN')
    if (this.soundOn) this.sound.play('combo',{volume:0.48})
    this.time.delayedCall(5000,()=>this.stopFever())
  }

  stopFever() {
    this.fever=false
    if (this.selectedMission===1) this.specialText.setText('')
  }

  // ------------------------------------------------------------
  // STORAGE / CAREER
  // ------------------------------------------------------------
  getMissionRecord(id) {
    try {
      const raw=localStorage.getItem(`metinballMissionRecord_${id}`)
      return raw?JSON.parse(raw):null
    } catch {
      return null
    }
  }

  saveMissionRecord(rec) {
    const old=this.getMissionRecord(rec.missionId)
    const gradeRank={'S':6,'A+':5,'A':4,'B':3,'C':2,'D':1}

    const merged={
      score:Math.max(rec.score,old?.score||0),
      stars:Math.max(rec.stars,old?.stars||0),
      grade:!old || gradeRank[rec.grade]>gradeRank[old.grade] ? rec.grade : old.grade,
      accuracy:Math.max(rec.accuracy,old?.accuracy||0),
      errors:old?Math.min(rec.errors,old.errors):rec.errors,
      success:Boolean(rec.success || old?.success),
      zeroError:Boolean(rec.zeroError || old?.zeroError),
      character:rec.score>=(old?.score||0)?rec.character:(old?.character||rec.character)
    }

    localStorage.setItem(`metinballMissionRecord_${rec.missionId}`,JSON.stringify(merged))

    const charKey=`metinballMissionRecord_${rec.missionId}_${this.selected.id}`
    let charOld=null
    try {
      const raw=localStorage.getItem(charKey)
      charOld=raw?JSON.parse(raw):null
    } catch {}

    if (!charOld || rec.score>charOld.score) {
      localStorage.setItem(charKey,JSON.stringify(rec))
    }
  }

  getCareerStars() {
    return this.missions.reduce((sum,m)=>sum+(this.getMissionRecord(m.id)?.stars||0),0)
  }

  updateCareerHud() {
    if (this.highText) this.highText.setText(`KARİYER  ${this.getCareerStars()}/15 ★`)
  }

  sizeSelectionAvatar(img,id) {
    const h=180
    const source=this.textures.get(img.texture.key).getSourceImage()
    img.setDisplaySize(h*(source.width/source.height),h)
  }

  sizeMenuAvatar(img,id) {
    const h=160
    const source=this.textures.get(img.texture.key).getSourceImage()
    img.setDisplaySize(h*(source.width/source.height),h)
  }

  clearOverlay() {
    for (const o of this.activeOverlay) try{o.destroy()}catch{}
    this.activeOverlay=[]
  }

  toggleSound() {
    this.soundOn=!this.soundOn
    this.sound.mute=!this.soundOn
    localStorage.setItem('metinballSound',this.soundOn?'on':'off')
    if (this.soundButton) this.soundButton.setText(this.soundOn?'SES: AÇIK':'SES: KAPALI')

    if (!this.soundOn) {
      try { this.music?.stop() } catch {}
    } else if (this.started && !this.gameOver) {
      this.startMusic()
    }
  }

  toggleFullscreen() {
    try {
      if (this.scale.isFullscreen) this.scale.stopFullscreen()
      else this.scale.startFullscreen()
    } catch {}
  }

  exitGame() {
    this.stopAllAudio()
    this.clearOverlay()
    const w=this.scale.width
    const h=this.scale.height
    const overlay=this.add.rectangle(w/2,h/2,w,h,0x02070b,0.88).setDepth(150)
    const text=this.add.text(w/2,h/2,
      'METINBALL DURDURULDU\n\nTarayıcı sekmesini kapatabilirsin.',
      {
        fontFamily:'Arial Black, Arial',fontSize:'22px',
        color:'#ffffff',align:'center',lineSpacing:10
      }
    ).setOrigin(0.5).setDepth(151)
    this.activeOverlay=[overlay,text]
  }
}

const config={
  type:Phaser.AUTO,
  parent:'app',
  backgroundColor:'#07111a',
  scale:{
    mode:Phaser.Scale.RESIZE,
    width:'100%',
    height:'100%',
    autoCenter:Phaser.Scale.CENTER_BOTH,
    fullscreenTarget:'app'
  },
  render:{
    antialias:true,
    pixelArt:false,
    roundPixels:false,
    transparent:false,
    powerPreference:'high-performance'
  },
  audio:{disableWebAudio:false},
  scene:GameScene
}

new Phaser.Game(config)
