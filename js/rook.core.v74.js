/* rook.core.js — v74 */

(function(window,document){'use strict';

/* 1 - IIFE ve 'use strict' ------------------------------------------------ */

/* 2 - Olay yardımcıları --------------------------------------------------- */
const emit=(name,detail)=>{try{document.dispatchEvent(new CustomEvent(name,{detail}))}catch(err){console.warn(`Event emission failed for ${name}:`,err)}};

/* Helper functions for localStorage */
const safeGetItem = (key, fallback = null) => {
  try { return localStorage.getItem(key) || fallback } catch(_) { return fallback }
};
const safeSetItem = (key, value) => {
  try { localStorage.setItem(key, value) } catch(_) { /* silent fail */ }
};
/* Bölüm sonu --------------------------------------------------------------- */

/* 3 - Core iskeleti ve sabitler ------------------------------------------- */
const Core={cfg:{pieceBase:'/wp-content/uploads/chess/img/chesspieces/wikipedia'},_eventListeners:[],_observers:[],
/* Bölüm sonu --------------------------------------------------------------- */

/* 4 - Varsayılan durum ----------------------------------------------------- */            
st:{
side: safeGetItem('rk-side', 'white'),
theme: safeGetItem('cm-theme') || safeGetItem('rk-theme', 'dark'),
boardSkin: safeGetItem('cm-board') || safeGetItem('rk-board-skin', 'classic'),
hintsOn: (()=>{const ch=safeGetItem('cm-hints');return ch==='on'||(ch!=='off'&&safeGetItem('rk-hints')!=='off')})(),
soundOn: (()=>{const cs=safeGetItem('cm-sound');return cs==='on'||(cs!=='off')})(),
rookPiece:'wR',
pawnPiece:'bP',
rookSq:'e4',
pawns:['e8'],
mode: safeGetItem('rk-mode', 'timed'),
wave:1,
board:null,
score:0,
bestTimed: Number(safeGetItem('rk-best-timed', '0')),
bestLevels: Number(safeGetItem('rk-best-levels', '0')),
bestLevelsTime: Number(safeGetItem('rk-best-levels-time', '0')),
timeLeft:60,
timer:null,
timerDir:'down',
playing:false,
levelsStartAt:null
},
/* Bölüm sonu --------------------------------------------------------------- */

/* 5 - Genel yardımcılar --------------------------------------------------- */
use(plugin){try{if(plugin?.install)plugin.install(this)}catch(err){console.warn('Plugin installation failed:',err)}return this},
pieceTheme(p){return `${this.cfg.pieceBase}/${p}.png`},
allSquares(){const files=['a','b','c','d','e','f','g','h'];const ranks=['1','2','3','4','5','6','7','8'];const out=[];for(let r=0;r<8;r++){for(let f=0;f<8;f++){out.push(files[f]+ranks[r])}}return out},
_addTrackedListener(target,event,handler,options={}){target.addEventListener(event,handler,options);this._eventListeners.push({target,event,handler,options})},
setTheme(theme){const t=(theme==='light')?'light':'dark';this.st.theme=t;safeSetItem('cm-theme',t);emit('cm-theme',{theme:t,from:'rook'});document.body.classList.toggle('cm-theme-light',t==='light');document.body.classList.toggle('cm-theme-dark',t!=='light')},
toggleTheme(){this.setTheme(this.st.theme==='light'?'dark':'light')},
setBoardSkin(skin){const list=['classic','green','cmink'];const s=list.includes(skin)?skin:(this.st.boardSkin||'classic');this.st.boardSkin=s;safeSetItem('cm-board',s);emit('cm-board',{skin:s,from:'rook'});const b=document.body;list.forEach(n=>b.classList.remove(`cm-board-${n}`));b.classList.add(`cm-board-${s}`)},
cycleBoard(){const list=['classic','green','cmink'];const i=Math.max(0,list.indexOf(this.st.boardSkin||'classic'));this.setBoardSkin(list[(i+1)%list.length])},
/* Bölüm sonu --------------------------------------------------------------- */

/* 6 - Geometri ve yol açıklığı -------------------------------------------- */
_occupiedSet(){const S=new Set(this.st.pawns);S.add(this.st.rookSq);return S},
pathClear(from,to){if(typeof from!=='string'||typeof to!=='string')return false;if(from.length<2||to.length<2)return false;if(from===to)return false;const files=['a','b','c','d','e','f','g','h'];const ranks=['1','2','3','4','5','6','7','8'];const fx=files.indexOf(from[0]);const fy=ranks.indexOf(from[1]);const tx=files.indexOf(to[0]);const ty=ranks.indexOf(to[1]);if(fx<0||fy<0||tx<0||ty<0)return false;const occ=this._occupiedSet();occ.delete(from);if(fx===tx){const step=(ty>fy)?1:-1;for(let y=fy+step;y!==ty;y+=step){const sq=files[fx]+ranks[y];if(occ.has(sq))return false}return true}if(fy===ty){const step2=(tx>fx)?1:-1;for(let x=fx+step2;x!==tx;x+=step2){const sq2=files[x]+ranks[fy];if(occ.has(sq2))return false}return true}return false},
/* Bölüm sonu --------------------------------------------------------------- */

/* 7 - Taraf başlangıçları ve taraf değiştirme ---------------------------- */
_startForSide(side){return(side==='black')?{rookSq:'d4',rookPiece:'bR',pawnPiece:'wP'}:{rookSq:'e4',rookPiece:'wR',pawnPiece:'bP'}},
setSide(side){const s=(side==='black')?'black':'white';this.st.side=s;safeSetItem('rk-side',s);const p=this._startForSide(s);this.st.rookSq=p.rookSq;this.st.rookPiece=p.rookPiece;this.st.pawnPiece=p.pawnPiece;emit('rk:side',{side:s})},
/* Bölüm sonu --------------------------------------------------------------- */

/* 8 - Mod ve dalga yönetimi ----------------------------------------------- */
setMode(mode){const m=(mode==='levels')?'levels':'timed';if(this.st.mode===m){emit('rk:mode',{mode:m});return}this.st.mode=m;safeSetItem('rk-mode',m);emit('rk:mode',{mode:m});this.hardReset()},
setWave(n){const w=Math.max(1,Math.min(8,n|0));this.st.wave=w;emit('rk:wave',{wave:w})},
/* Bölüm sonu --------------------------------------------------------------- */

/* 9 - Skor ve bilgi ------------------------------------------------------- */
updateInfo(msg){if(msg)emit('rk:state',{msg})},
updateBar(max=60){const fill=document.querySelector('.rk-timebar .rk-timefill');if(fill){const clamp01=(v)=>Math.max(0,Math.min(1,v));const fracLeft=clamp01(this.st.timeLeft/max);const scale=(this.st.timerDir==='down')?(1-fracLeft):clamp01((this.st.timeLeft%max)/max);fill.style.transform=`scaleX(${scale})`}},
draw(){if(this.st.board){this.st.board.position(this.makePosition(),false)}this.updateInfo();this.updateBar(60)},
currentBest(){return(this.st.mode==='timed')?this.st.bestTimed:this.st.bestLevels},
setBest(v){if(this.st.mode==='timed'){this.st.bestTimed=v;safeSetItem('rk-best-timed',String(v))}else{this.st.bestLevels=v;safeSetItem('rk-best-levels',String(v))}emit('rk:best',{best:v})},
setBestLevelsTime(sec){this.st.bestLevelsTime=sec|0;safeSetItem('rk-best-levels-time',String(this.st.bestLevelsTime));emit('rk:bestTime',{seconds:this.st.bestLevelsTime})},
/* Bölüm sonu --------------------------------------------------------------- */

/* 10 - Pozisyon üretimi --------------------------------------------------- */
makePosition(){const p={};p[this.st.rookSq]=this.st.rookPiece;const pp=this.st.pawnPiece;this.st.pawns.forEach(sq=>{p[sq]=pp});return p},
/* Bölüm sonu --------------------------------------------------------------- */

/* 11 - Zamanlayıcı -------------------------------------------------------- */
startTimer(dir){if(this.st.timer)return;this.st.timerDir=(dir==='up')?'up':'down';this.st.playing=true;const now=performance.now();if(this.st.timerDir==='down'){this._timerEndAt=now+(this.st.timeLeft*1000)}else{this._timerStartAt=now-(this.st.timeLeft*1000)}let prevWhole=Math.round(this.st.timeLeft);const tick=(tNow)=>{if(this.st.timerDir==='down'){this.st.timeLeft=Math.max(0,(this._timerEndAt-tNow)/1000)}else{this.st.timeLeft=Math.max(0,(tNow-this._timerStartAt)/1000)}this.updateBar(60);const whole=Math.round(this.st.timeLeft);if(whole!==prevWhole){emit('rk:timer',{timeLeft:this.st.timeLeft,dir:this.st.timerDir});prevWhole=whole}if(this.st.timerDir==='down'&&this.st.timeLeft<=0){this.stopTimer();this.st.playing=false;if(this.st.score>this.currentBest()){this.setBest(this.st.score)}this.updateInfo(this.t('msg.timeup')+` ${this.t('hud.score')}: ${this.st.score}`);emit('rk:timeup',{score:this.st.score,best:this.currentBest()});return}this.st.timer=requestAnimationFrame(tick)};this.st.timer=requestAnimationFrame(tick)},
stopTimer(){if(this.st.timer){cancelAnimationFrame(this.st.timer)}this.st.timer=null},
/* Bölüm sonu --------------------------------------------------------------- */

/* 12 - İpucu sistemi ----------------------------------------------------- */
boardEl(){return document.getElementById('cm-board')},
squareEl(sq){return document.querySelector(`#cm-board .square-${sq}`)},
_hintMarks:[],
_srcMarked:null,
_setHintsActive(on){const el=this.boardEl();if(el)el.classList.toggle('hints-active',!!on)},
addHintClass(sq,cls){const el=this.squareEl(sq);if(!el)return;el.classList.add(cls);this._hintMarks.push({sq,cls})},
clearHints(){this._hintMarks.forEach(({sq,cls})=>{const el=this.squareEl(sq);if(el)el.classList.remove(cls)});this._hintMarks.length=0;if(this._srcMarked){const el=this.squareEl(this._srcMarked);if(el)el.classList.remove('square-highlight');this._srcMarked=null}this._setHintsActive(false)},
showHintsFor(from){if(!this.st.hintsOn)return;this.clearHints();const elFrom=this.squareEl(from);if(elFrom&&!elFrom.classList.contains('square-highlight')){elFrom.classList.add('square-highlight');this._srcMarked=from}this.allSquares().forEach(sq=>{if(sq===from)return;if(this.pathClear(from,sq)){if(this.st.pawns.includes(sq)){this.addHintClass(sq,'square-hint-cap')}else{this.addHintClass(sq,'square-hint')}}});this._setHintsActive(true)},
applyHints(on){this.st.hintsOn=!!on;safeSetItem('cm-hints',on?'on':'off');if(!on){this.clearHints()}emit('cm-hints',{on:this.st.hintsOn});emit('rk:hints',{on:this.st.hintsOn})},
toggleHints(){this.applyHints(!this.st.hintsOn)},
/* Bölüm sonu --------------------------------------------------------------- */

/* 13 - Ses - GELİŞTİRİLMİŞ WEBAUDIO SİSTEMİ ----------------------------- */
initAudio(){
  const moveAudio = new Audio('/wp-content/uploads/chess/sounds/move.wav'); 
  const captureAudio = new Audio('/wp-content/uploads/chess/sounds/capture.wav');
  const countdownAudio = new Audio('/wp-content/uploads/chess/sounds/countdown.wav');
  const resultAudio = new Audio('/wp-content/uploads/chess/sounds/result.wav');
  moveAudio.preload='auto';
  captureAudio.preload='auto';
  countdownAudio.preload='auto';
  resultAudio.preload='auto';
  moveAudio.volume=0.7;
  captureAudio.volume=0.6;
  countdownAudio.volume=0.8;
  resultAudio.volume=0.75;
  
  let audioCtx=null, moveBuf=null, captureBuf=null, countdownBuf=null, resultBuf=null, audioPrimed=false;
  
  const installAudioUnlock=()=>{
    if(audioPrimed) return;
    const prime=async()=>{
      audioPrimed=true;
      try{
        const Ctx=window.AudioContext||window.webkitAudioContext;
        if(Ctx){
          if(!audioCtx) audioCtx=new Ctx();
          if(audioCtx.state==='suspended'){ 
            try{ await audioCtx.resume(); }catch(_){ } 
          }
          
          // Load move sound buffer
          if(!moveBuf){
            try{
              const resp=await fetch('/wp-content/uploads/chess/sounds/move.wav',{cache:'force-cache'});
              const arr=await resp.arrayBuffer();
              moveBuf=await audioCtx.decodeAudioData(arr);
            }catch(err){
              console.warn('Failed to load move sound buffer:', err);
            }
          }
          
          // Load capture sound buffer
          if(!captureBuf){
            try{
              const resp2=await fetch('/wp-content/uploads/chess/sounds/capture.wav',{cache:'force-cache'});
              const arr2=await resp2.arrayBuffer();
              captureBuf=await audioCtx.decodeAudioData(arr2);
            }catch(err){
              console.warn('Failed to load capture sound buffer:', err);
            }
          }
          
          // Load countdown sound buffer
          if(!countdownBuf){
            try{
              const resp3=await fetch('/wp-content/uploads/chess/sounds/countdown.wav',{cache:'force-cache'});
              const arr3=await resp3.arrayBuffer();
              countdownBuf=await audioCtx.decodeAudioData(arr3);
            }catch(err){
              console.warn('Failed to load countdown sound buffer:', err);
            }
          }
          
          // Load result sound buffer
          if(!resultBuf){
            try{
              const resp4=await fetch('/wp-content/uploads/chess/sounds/result.wav',{cache:'force-cache'});
              const arr4=await resp4.arrayBuffer();
              resultBuf=await audioCtx.decodeAudioData(arr4);
            }catch(err){
              console.warn('Failed to load result sound buffer:', err);
            }
          }
        }
        
        // Prime HTML5 Audio fallback
        try{ 
          moveAudio.muted=true; 
          await moveAudio.play().catch(()=>{}); 
          moveAudio.pause(); 
          moveAudio.currentTime=0; 
          moveAudio.muted=false; 
        }catch(_){}
        
        try{ 
          captureAudio.muted=true; 
          await captureAudio.play().catch(()=>{}); 
          captureAudio.pause(); 
          captureAudio.currentTime=0; 
          captureAudio.muted=false; 
        }catch(_){}
        
        try{ 
          countdownAudio.muted=true; 
          await countdownAudio.play().catch(()=>{}); 
          countdownAudio.pause(); 
          countdownAudio.currentTime=0; 
          countdownAudio.muted=false; 
        }catch(_){}
        
        try{ 
          resultAudio.muted=true; 
          await resultAudio.play().catch(()=>{}); 
          resultAudio.pause(); 
          resultAudio.currentTime=0; 
          resultAudio.muted=false; 
        }catch(_){}
        
      }catch(err){
        console.warn('Audio unlock failed:', err);
      }finally{
        // Remove unlock listeners
        window.removeEventListener('pointerdown',prime,true);
        window.removeEventListener('touchend',prime,true);
        window.removeEventListener('keydown',prime,true);
        window.removeEventListener('click',prime,true);
      }
    };
    
    // Install unlock listeners
    window.addEventListener('pointerdown',prime,true);
    window.addEventListener('touchend',prime,true);
    window.addEventListener('keydown',prime,true);
    window.addEventListener('click',prime,true);
  };

  this.audio = {
    moveAudio,
    captureAudio,
    countdownAudio,
    resultAudio,
    audioCtx: () => audioCtx,
    moveBuf: () => moveBuf,
    captureBuf: () => captureBuf,
    countdownBuf: () => countdownBuf,
    resultBuf: () => resultBuf,
    audioPrimed: () => audioPrimed,
    installAudioUnlock
  };

  installAudioUnlock();
},

playMove(){
  if(!this.st.soundOn)return;
  const A=this.audio;
  if(!A)return;
  
  // Try WebAudio first (low latency)
  const audioCtx = A.audioCtx();
  const moveBuf = A.moveBuf();
  
  if(audioCtx && moveBuf && audioCtx.state === 'running'){ 
    try{ 
      const src=audioCtx.createBufferSource();
      const gainNode=audioCtx.createGain();
      gainNode.gain.value=0.7;
      src.buffer=moveBuf; 
      src.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      src.start(0); 
      return; 
    }catch(err){ 
      console.warn('WebAudio move playback failed:', err);
    } 
  }
  
  // Fallback to HTML5 Audio
  try{ 
    A.moveAudio.currentTime=0; 
    A.moveAudio.play().catch(()=>{});
  }catch(_){}
},

playCapture(){
  if(!this.st.soundOn)return;
  const A=this.audio;
  if(!A)return;
  
  // Try WebAudio first (low latency)
  const audioCtx = A.audioCtx();
  const captureBuf = A.captureBuf();
  
  if(audioCtx && captureBuf && audioCtx.state === 'running'){ 
    try{ 
      const src=audioCtx.createBufferSource();
      const gainNode=audioCtx.createGain();
      gainNode.gain.value=0.6;
      src.buffer=captureBuf; 
      src.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      src.start(0); 
      return; 
    }catch(err){ 
      console.warn('WebAudio capture playback failed:', err);
    } 
  }
  
  // Fallback to HTML5 Audio
  try{ 
    A.captureAudio.currentTime=0; 
    A.captureAudio.play().catch(()=>{});
  }catch(_){
    // Double fallback to move sound
    this.playMove();
  }
},

playCountdown(){
  if(!this.st.soundOn)return;
  const A=this.audio;
  if(!A)return;
  
  // Try WebAudio first (low latency)
  const audioCtx = A.audioCtx();
  const countdownBuf = A.countdownBuf();
  
  if(audioCtx && countdownBuf && audioCtx.state === 'running'){ 
    try{ 
      const src=audioCtx.createBufferSource();
      const gainNode=audioCtx.createGain();
      gainNode.gain.value=0.8;
      src.buffer=countdownBuf; 
      src.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      src.start(0); 
      return; 
    }catch(err){ 
      console.warn('WebAudio countdown playback failed:', err);
    } 
  }
  
  // Fallback to HTML5 Audio
  try{ 
    A.countdownAudio.currentTime=0; 
    A.countdownAudio.play().catch(()=>{});
  }catch(_){
    // Fallback to move sound
    this.playMove();
  }
},

playResult(){
  if(!this.st.soundOn)return;
  const A=this.audio;
  if(!A)return;
  
  // Try WebAudio first (low latency)
  const audioCtx = A.audioCtx();
  const resultBuf = A.resultBuf();
  
  if(audioCtx && resultBuf && audioCtx.state === 'running'){ 
    try{ 
      const src=audioCtx.createBufferSource();
      const gainNode=audioCtx.createGain();
      gainNode.gain.value=0.75;
      src.buffer=resultBuf; 
      src.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      src.start(0); 
      return; 
    }catch(err){ 
      console.warn('WebAudio result playback failed:', err);
    } 
  }
  
  // Fallback to HTML5 Audio
  try{ 
    A.resultAudio.currentTime=0; 
    A.resultAudio.play().catch(()=>{});
  }catch(_){
    // Fallback to capture sound
    this.playCapture();
  }
},

setSound(on){
  this.st.soundOn=!!on;
  safeSetItem('cm-sound',this.st.soundOn?'on':'off');
  emit('cm-sound',{on:this.st.soundOn});
  emit('rk:sound',{on:this.st.soundOn})
},

toggleSound(){
  this.setSound(!this.st.soundOn)
},
/* Bölüm sonu --------------------------------------------------------------- */

/* 14 - Tahta kurulumu ----------------------------------------------------- */
_dragRookEl(){
  const code=this.st.rookPiece;
  return document.querySelector(`#cm-board .piece-417db.dragging-31d41[data-piece="${code}"]`)
},
_clearDragCenter(){
  document.querySelectorAll('#cm-board .piece-417db.rk-drag-center').forEach(el=>el.classList.remove('rk-drag-center'))
},
_touchLockHandler:null,
_touchLocked:false,
_enableTouchLock(){
  if(this._touchLocked)return;
  this._touchLocked=true;
  this._touchLockHandler=(e)=>{if(e?.cancelable)e.preventDefault()};
  this._addTrackedListener(window,'touchmove',this._touchLockHandler,{passive:false});
  document.body.classList.add('rk-drag-lock')
},
_disableTouchLock(){
  if(!this._touchLocked)return;
  this._touchLocked=false;
  if(this._touchLockHandler){
    window.removeEventListener('touchmove',this._touchLockHandler,{passive:false})
  }
  this._touchLockHandler=null;
  document.body.classList.remove('rk-drag-lock')
},
initBoard(){
  const self=this;
  
  this.st.board=Chessboard('cm-board',{
    position:this.makePosition(),
    pieceTheme:this.pieceTheme.bind(this),
    draggable:true,
    moveSpeed:200,      
    snapSpeed:50,       
    snapbackSpeed:500,  
    appearSpeed:200,
    onDragStart(source,piece){
      if(piece!==self.st.rookPiece)return false;
      if(!self.st.playing)self.updateInfo(self.t('msg.start.first'));
      
      // Audio context'i hazırla (mobil için kritik)
      if(self.audio && !self.audio.audioPrimed()){
        try{
          const audioCtx = self.audio.audioCtx();
          if(audioCtx && audioCtx.state==='suspended'){
            audioCtx.resume().catch(()=>{});
          }
        }catch(_){}
      }
      
      self.showHintsFor(source);
      self._enableTouchLock();
      let tries=0;
      (function waitDrag(){
        const el=self._dragRookEl();
        if(el){
          self._clearDragCenter();
          el.classList.add('rk-drag-center')
        }else if(++tries<6){
          requestAnimationFrame(waitDrag)
        }
      })();
      return true
    },
    onDrop(source,target){
      self._clearDragCenter();
      self.clearHints();
      if(source===target){return 'snapback'}
      if(!self.pathClear(source,target)){return 'snapback'}
      
      const captured=self.st.pawns.includes(target);
      if(captured){
        self.playCapture();
      }else{
        self.playMove();
      }
      
      self.st.rookSq=target;
      if(captured){
        self.st.score++;
        emit('rk:score',{score:self.st.score});
        if(self.modes?.onCapture){self.modes.onCapture(self,target)}
        self.updateInfo(self.t('msg.capture'))
      }
    },
    onSnapEnd(){
      self._disableTouchLock();
      self._clearDragCenter();
      
      self.st.board.position(self.makePosition(), false);
    }
  });

  const host=this.boardEl();
  const doResize=()=>{if(self.st.board)self.st.board.resize()};
  if(host){
    if('ResizeObserver'in window){
      const observer=new ResizeObserver(()=>doResize());
      observer.observe(host);
      this._observers.push(observer)
    }
    this._addTrackedListener(window,'resize',doResize,{passive:true});
    requestAnimationFrame(doResize)
  }
},
/* Bölüm sonu --------------------------------------------------------------- */

/* 15 - Oyun kontrolleri --------------------------------------------------- */
hardReset(){this.stopTimer();this.st.playing=false;this.st.score=0;const p=this._startForSide(this.st.side);this.st.rookPiece=p.rookPiece;this.st.pawnPiece=p.pawnPiece;this.setWave(1);this.st.levelsStartAt=null;if(this.st.mode==='levels'){this.st.timeLeft=0;this.st.timerDir='up'}else{this.st.timeLeft=60;this.st.timerDir='down'}if(this.modes?.reset){this.modes.reset(this)}else{this.st.rookSq=p.rookSq;const pool=this.allSquares().filter(sq=>sq!==this.st.rookSq);this.st.pawns=[pool[Math.floor(Math.random()*pool.length)]]}this.updateInfo('—');this.draw()},
start(){this.hardReset();this.st.score=0;emit('rk:score',{score:0});this.updateInfo('—');if(this.st.mode==='levels'){this.st.levelsStartAt=Date.now()}if(this.modes?.onStart)this.modes.onStart(this);if(!this.st.timer)this.startTimer(this.st.timerDir);this.st.playing=true;emit('rk:start',{mode:this.st.mode})},
stop(){this.st.playing=false;this.stopTimer();this.updateInfo(this.t('msg.paused'));emit('rk:stop',{})},
/* Bölüm sonu --------------------------------------------------------------- */

/* 16 - Cleanup ve önyükleme ----------------------------------------------- */
cleanup(){this._eventListeners.forEach(({target,event,handler,options})=>{try{target.removeEventListener(event,handler,options)}catch(err){console.warn(`Failed to remove event listener ${event}:`,err)}});this._eventListeners.length=0;this._observers.forEach(observer=>{try{observer.disconnect()}catch(err){console.warn('Failed to disconnect observer:',err)}});this._observers.length=0;this.stopTimer();this._disableTouchLock()},
init(){
this.initLang();
this.initAudio();
const self=this;
const syncSoundFromGlobal=()=>{
  const soundHandler=(e)=>{const on=!!(e?.detail?.on);self.st.soundOn=on;emit('rk:sound',{on})};
  const storageHandler=(e)=>{if(e?.key==='cm-sound'){const on=(e.newValue==='on');self.st.soundOn=on;emit('rk:sound',{on})}};
  this._addTrackedListener(document,'cm-sound',soundHandler,{passive:true});
  this._addTrackedListener(window,'storage',storageHandler)
};
syncSoundFromGlobal();

const syncThemeBoardFromGlobal=()=>{
  const t=safeGetItem('cm-theme',this.st.theme||'dark');
  const b=safeGetItem('cm-board',this.st.boardSkin||'classic');
  this.setTheme(t);
  this.setBoardSkin(b);
  
  const themeHandler=(e)=>{const fromSelf=!!(e?.detail?.from==='rook');const t=e?.detail?.theme||self.st.theme;if(fromSelf)return;if(!t||t===self.st.theme)return;self.setTheme(t)};
  const boardHandler=(e)=>{const fromSelf=!!(e?.detail?.from==='rook');const s=e?.detail?.skin||self.st.boardSkin;if(fromSelf)return;if(!s||s===self.st.boardSkin)return;self.setBoardSkin(s)};
  const storageThemeBoardHandler=(e)=>{if(!e)return;if(e.key==='cm-theme'&&e.newValue&&e.newValue!==self.st.theme){self.setTheme(e.newValue)}if(e.key==='cm-board'&&e.newValue&&e.newValue!==self.st.boardSkin){self.setBoardSkin(e.newValue)}};
  this._addTrackedListener(document,'cm-theme',themeHandler,{passive:true});
  this._addTrackedListener(document,'cm-board',boardHandler,{passive:true});
  this._addTrackedListener(window,'storage',storageThemeBoardHandler)
};
syncThemeBoardFromGlobal();

this.setSide(this.st.side);
this.initBoard();
this.applyHints(this.st.hintsOn);
this.hardReset();
emit('rk:ready',{ok:true});
emit('rk:sound',{on:this.st.soundOn});
emit('rk:mode',{mode:this.st.mode});
emit('rk:wave',{wave:this.st.wave});
if(this.st.bestLevelsTime>0){emit('rk:bestTime',{seconds:this.st.bestLevelsTime})}

const guard=(e)=>{const t=e.target;if(!t)return e.preventDefault();const tag=t.tagName;if(tag==='INPUT'||tag==='TEXTAREA'||t.isContentEditable)return;e.preventDefault()};
this._addTrackedListener(document,'contextmenu',guard,{capture:true});
this._addTrackedListener(document,'dragstart',guard,{capture:true});
this._addTrackedListener(document,'selectstart',guard,{capture:true});

const setupCoachBubble=()=>{
  const wrap=document.querySelector('.rk-wrap');
  const toolbar=document.querySelector('.cm-toolbar');
  if(!wrap)return;
  let coach=document.getElementById('rk-coach');
  if(!coach){
    coach=document.createElement('div');
    coach.className='rk-coach';
    coach.id='rk-coach';
    coach.setAttribute('role','status');
    coach.setAttribute('aria-live','polite');
    coach.innerHTML='<div class="rk-coach__avatar" aria-hidden="true"><img class="rk-coach__img" alt="" decoding="async" loading="lazy" /></div><div class="rk-coach__bubble"><div class="rk-coach__title" id="rk-coach-title"></div><p class="rk-coach__desc" id="rk-coach-desc"></p></div>';
    if(toolbar?.parentNode){toolbar.parentNode.insertBefore(coach,toolbar)}else{wrap.insertBefore(coach,wrap.firstChild)}
  }
  wrap.classList.add('rk-has-coach');
  
  try{
    const img=coach.querySelector('.rk-coach__img');
    if(img){
      const av1=wrap.getAttribute('data-avatar')||'';
      const av2=wrap.getAttribute('data-avatar-2x')||'';
      const av3=wrap.getAttribute('data-avatar-3x')||'';
      if(av1){
        img.src=av1;
        const srcset=[['1x',av1],['2x',av2],['3x',av3]].filter(([,url])=>!!url).map(([scale,url])=>`${url} ${scale}`).join(', ');
        if(srcset)img.setAttribute('srcset',srcset)
      }else{
        img.remove()
      }
    }
  }catch(err){console.warn('Avatar setup failed:',err)}
  
  const $title=coach.querySelector('#rk-coach-title');
  const $desc=coach.querySelector('#rk-coach-desc');
  const setCoachText=(mode)=>{
    if(!$title||!$desc)return;
    $title.textContent=self.t('coach.title');
    const hint=`<br><span class="rk-coach__hint">${self.t('coach.hint')}</span><span class="rk-coach__hint"></span>`;
    if(mode==='levels'){
      $desc.innerHTML=self.t('coach.desc.levels')+hint
    }else{
      $desc.innerHTML=self.t('coach.desc.timed')+hint
    }
  };
  setCoachText(self.st.mode);
  
  const modeHandler=(e)=>{const mode=e?.detail?.mode||self.st.mode;setCoachText(mode)};
  this._addTrackedListener(document,'rk:mode',modeHandler,{passive:true});
  this._addTrackedListener(document,'cm-lang',()=>setCoachText(self.st.mode),{passive:true})
};
setupCoachBubble();

this._addTrackedListener(window,'beforeunload',()=>this.cleanup(),{passive:true})
}};

/* 17 - Çok dilli destek sistemi ------------------------------------------- */
Core.initLang=function(){
  const TEXTS = {
    en: {
      // Game modes
      'mode.timed': '⏱️ Timed Mode',
      'mode.levels': '🌊 Eight Waves',
      
      // Buttons and controls
      'btn.start': 'Start',
      'btn.newgame': 'New Game',
      'btn.close': 'Close',
      
      // Tooltips
      'tooltip.theme': 'Toggle Theme',
      'tooltip.board': 'Change Board Theme',
      'tooltip.sound.on': 'Sound: On',
      'tooltip.sound.off': 'Sound: Off',
      'tooltip.hints.on': 'Hints: On',
      'tooltip.hints.off': 'Hints: Off',
      'tooltip.start': 'Start Game',
      
      // HUD labels
      'hud.time': 'Time',
      'hud.score': 'Score',
      'hud.best': 'Best',
      'hud.fastest': 'Fastest',
      
      // Side selection
      'side.white': 'White',
      'side.black': 'Black',
      'label.side': 'Side:',
      'label.mode': 'Game Mode:',
      
      // Coach messages
      'coach.title': 'Welcome to Rook Training Mode.',
      'coach.desc.timed': 'How many pawns can you capture in <span class="hl">60 seconds</span>?',
      'coach.desc.levels': 'How fast can you complete all 8 levels?',
      'coach.hint': '<strong>Hint:</strong> Rook moves only horizontally/vertically and cannot jump over pieces.',
      
      // Game messages
      'msg.start.first': "Press Start first.",
      'msg.capture': 'Great! Score +1',
      'msg.paused': 'Paused.',
      'msg.timeup': 'Time up!',
      'msg.congratulations': 'Congratulations!',
      
      // Modal content
      'modal.timeup.title': 'Time Up!',
      'modal.timeup.desc': 'Score: {0} ♟️',
      'modal.levels.title': 'Congratulations!',
      'modal.levels.desc': 'Time: {0} ⏱️',
      
      // Accessibility
      'aria.board': 'Chess Board',
      'aria.gameinfo': 'Game Information',
      'aria.toolbar': 'Game Controls'
    },
    
    tr: {
      // Game modes
      'mode.timed': '⏱️ Zamana Karşı',
      'mode.levels': '🌊 Sekiz Dalga',
      
      // Buttons and controls
      'btn.start': 'Başlat',
      'btn.newgame': 'Yeni Oyun',
      'btn.close': 'Kapat',
      
      // Tooltips
      'tooltip.theme': 'Tema Değiştir',
      'tooltip.board': 'Tahta Temasını Değiştir',
      'tooltip.sound.on': 'Ses: Açık',
      'tooltip.sound.off': 'Ses: Kapalı',
      'tooltip.hints.on': 'İpuçları: Açık',
      'tooltip.hints.off': 'İpuçları: Kapalı',
      'tooltip.start': 'Oyunu Başlat',
      
      // HUD labels
      'hud.time': 'Süre',
      'hud.score': 'Skor',
      'hud.best': 'En İyi',
      'hud.fastest': 'En Hızlı',
      
      // Side selection
      'side.white': 'Beyaz',
      'side.black': 'Siyah',
      'label.side': 'Taraf:',
      'label.mode': 'Oyun Modu:',
      
      // Coach messages
      'coach.title': 'Kale Eğitim Moduna Hoşgeldin.',
      'coach.desc.timed': '<span class="hl">60 saniyede</span> kaç piyonu toplayabilirsin?',
      'coach.desc.levels': '8 seviyeyi en hızlı kaç saniyede bitirebilirsin görmek isterim.',
      'coach.hint': '<strong>İpucu:</strong> Kale yalnızca aynı satır/sütunda hareket eder ve aradan atlayamaz.',
      
      // Game messages
      'msg.start.first': "Önce Start'a basın.",
      'msg.capture': 'Harika! Skor +1',
      'msg.paused': 'Duraklatıldı.',
      'msg.timeup': 'Süre doldu!',
      'msg.congratulations': 'Tebrikler!',
      
      // Modal content
      'modal.timeup.title': 'Süre Doldu!',
      'modal.timeup.desc': 'Skor: {0} ♟️',
      'modal.levels.title': 'Tebrikler!',
      'modal.levels.desc': 'Süre: {0} ⏱️',
      
      // Accessibility
      'aria.board': 'Satranç Tahtası',
      'aria.gameinfo': 'Oyun Bilgileri',
      'aria.toolbar': 'Oyun Kontrolleri'
    },
    
    de: {
      // Game modes
      'mode.timed': '⏱️ Zeitlimit',
      'mode.levels': '🌊 Acht Wellen',
      
      // Buttons and controls
      'btn.start': 'Start',
      'btn.newgame': 'Neues Spiel',
      'btn.close': 'Schließen',
      
      // Tooltips
      'tooltip.theme': 'Thema Wechseln',
      'tooltip.board': 'Brett-Thema Ändern',
      'tooltip.sound.on': 'Ton: An',
      'tooltip.sound.off': 'Ton: Aus',
      'tooltip.hints.on': 'Hinweise: An',
      'tooltip.hints.off': 'Hinweise: Aus',
      'tooltip.start': 'Spiel Starten',
      
      // HUD labels
      'hud.time': 'Zeit',
      'hud.score': 'Punkte',
      'hud.best': 'Beste',
      'hud.fastest': 'Schnellste',
      
      // Side selection
      'side.white': 'Weiß',
      'side.black': 'Schwarz',
      'label.side': 'Seite:',
      'label.mode': 'Spielmodus:',
      
      // Coach messages
      'coach.title': 'Willkommen beim Turm-Training.',
      'coach.desc.timed': 'Wie viele Bauern kannst du in <span class="hl">60 Sekunden</span> schlagen?',
      'coach.desc.levels': 'Wie schnell kannst du alle 8 Level schaffen?',
      'coach.hint': '<strong>Tipp:</strong> Der Turm bewegt sich nur horizontal/vertikal und kann nicht über Figuren springen.',
      
      // Game messages
      'msg.start.first': "Zuerst Start drücken.",
      'msg.capture': 'Großartig! Punkte +1',
      'msg.paused': 'Pausiert.',
      'msg.timeup': 'Zeit abgelaufen!',
      'msg.congratulations': 'Herzlichen Glückwunsch!',
      
      // Modal content
      'modal.timeup.title': 'Zeit Abgelaufen!',
      'modal.timeup.desc': 'Punkte: {0} ♟️',
      'modal.levels.title': 'Herzlichen Glückwunsch!',
      'modal.levels.desc': 'Zeit: {0} ⏱️',
      
      // Accessibility
      'aria.board': 'Schachbrett',
      'aria.gameinfo': 'Spiel-Information',
      'aria.toolbar': 'Spiel-Steuerung'
    }
  };

  // URL parameter detection
  const getUrlLang = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const lang = params.get('lang');
      return ['en', 'tr', 'de'].includes(lang) ? lang : 'en';
    } catch(_) {
      return 'en';
    }
  };

  // Language state
  this.lang = {
    current: safeGetItem('cm-lang', getUrlLang()),
    texts: TEXTS,
    
    // Get localized text
    t(key, ...args) {
      const text = this.texts[this.current]?.[key] || this.texts.en[key] || key;
      if (args.length === 0) return text;
      
      // Simple placeholder replacement {0}, {1}, etc.
      return text.replace(/\{(\d+)\}/g, (match, index) => {
        const argIndex = parseInt(index, 10);
        return args[argIndex] !== undefined ? args[argIndex] : match;
      });
    },
    
    // Set language
    setLang(langCode) {
      const validLangs = ['en', 'tr', 'de'];
      const lang = validLangs.includes(langCode) ? langCode : 'en';
      
      if (this.current === lang) return;
      
      this.current = lang;
      safeSetItem('cm-lang', lang);
      
      // Update URL without reload
      try {
        const url = new URL(window.location);
        url.searchParams.set('lang', lang);
        window.history.replaceState({}, '', url);
      } catch(_) {}
      
      // Emit language change event
      emit('cm-lang', { lang, from: 'rook' });
    },
    
    // Get available languages
    getAvailableLangs() {
      return [
        { code: 'en', name: 'English' },
        { code: 'tr', name: 'Türkçe' },
        { code: 'de', name: 'Deutsch' }
      ];
    }
  };

  // Initialize language from URL or storage
  const urlLang = getUrlLang();
  if (urlLang !== this.lang.current) {
    this.lang.setLang(urlLang);
  }
};

// Helper method for getting translations
Core.t = function(key, ...args) {
  return this.lang?.t(key, ...args) || key;
};

// Language setter
Core.setLang = function(langCode) {
  if (this.lang?.setLang) {
    this.lang.setLang(langCode);
  }
};
/* Bölüm sonu --------------------------------------------------------------- */

window.Rook=Core;
if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>Core.init(),{once:true})}else{Core.init()}
})(window,document);
/* Bölüm sonu --------------------------------------------------------------- */
