/* rook.core.js — v300 */

(function(window,document){'use strict';

/* 1 - Olay yardımcıları --------------------------------------------------- */
const emit=(name,detail)=>{try{document.dispatchEvent(new CustomEvent(name,{detail}))}catch(err){console.warn(`Event emission failed for ${name}:`,err)}};

const safeGetItem = (key, fallback = null) => {
  try { return localStorage.getItem(key) || fallback } catch(_) { return fallback }
};
const safeSetItem = (key, value) => {
  try { localStorage.setItem(key, value) } catch(_) { /* silent fail */ }
};
/* Bölüm sonu --------------------------------------------------------------- */

/* 2 - Core iskeleti ve varsayılan durum ----------------------------------- */
const Core={cfg:{pieceBase:'/wp-content/uploads/chess/img/chesspieces/wikipedia'},_eventListeners:[],_observers:[],
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
levelsStartAt:null,
combo: 0,
lastCaptureTime: 0,
comboTimer: null
},
/* Bölüm sonu --------------------------------------------------------------- */

/* 3 - Genel yardımcılar --------------------------------------------------- */
use(plugin){try{if(plugin?.install)plugin.install(this)}catch(err){console.warn('Plugin installation failed:',err)}return this},
pieceTheme(p){return `${this.cfg.pieceBase}/${p}.png`},
allSquares(){const files=['a','b','c','d','e','f','g','h'];const ranks=['1','2','3','4','5','6','7','8'];const out=[];for(let r=0;r<8;r++){for(let f=0;f<8;f++){out.push(files[f]+ranks[r])}}return out},
_addTrackedListener(target,event,handler,options={}){target.addEventListener(event,handler,options);this._eventListeners.push({target,event,handler,options})},
setTheme(theme){const t=(theme==='light')?'light':'dark';this.st.theme=t;safeSetItem('cm-theme',t);emit('cm-theme',{theme:t,from:'rook'});document.body.classList.toggle('cm-theme-light',t==='light');document.body.classList.toggle('cm-theme-dark',t!=='light')},
toggleTheme(){this.setTheme(this.st.theme==='light'?'dark':'light')},
setBoardSkin(skin){const list=['classic','green','cmink','azure','emerald'];const s=list.includes(skin)?skin:(this.st.boardSkin||'classic');this.st.boardSkin=s;safeSetItem('cm-board',s);emit('cm-board',{skin:s,from:'rook'});const b=document.body;list.forEach(n=>b.classList.remove(`cm-board-${n}`));b.classList.add(`cm-board-${s}`)},
cycleBoard(){const list=['classic','green','cmink','azure','emerald'];const i=Math.max(0,list.indexOf(this.st.boardSkin||'classic'));this.setBoardSkin(list[(i+1)%list.length])},
/* Bölüm sonu --------------------------------------------------------------- */

/* 4 - Geometri ve yol açıklığı -------------------------------------------- */
_occupiedSet(){const S=new Set(this.st.pawns);S.add(this.st.rookSq);return S},
pathClear(from,to){if(typeof from!=='string'||typeof to!=='string')return false;if(from.length<2||to.length<2)return false;if(from===to)return false;const files=['a','b','c','d','e','f','g','h'];const ranks=['1','2','3','4','5','6','7','8'];const fx=files.indexOf(from[0]);const fy=ranks.indexOf(from[1]);const tx=files.indexOf(to[0]);const ty=ranks.indexOf(to[1]);if(fx<0||fy<0||tx<0||ty<0)return false;const occ=this._occupiedSet();occ.delete(from);if(fx===tx){const step=(ty>fy)?1:-1;for(let y=fy+step;y!==ty;y+=step){const sq=files[fx]+ranks[y];if(occ.has(sq))return false}return true}if(fy===ty){const step2=(tx>fx)?1:-1;for(let x=fx+step2;x!==tx;x+=step2){const sq2=files[x]+ranks[fy];if(occ.has(sq2))return false}return true}return false},
/* Bölüm sonu --------------------------------------------------------------- */

/* 5 - Taraf ve mod yönetimi ----------------------------------------------- */
_startForSide(side){return(side==='black')?{rookSq:'d4',rookPiece:'bR',pawnPiece:'wP'}:{rookSq:'e4',rookPiece:'wR',pawnPiece:'bP'}},
setSide(side){const s=(side==='black')?'black':'white';this.st.side=s;safeSetItem('rk-side',s);const p=this._startForSide(s);this.st.rookSq=p.rookSq;this.st.rookPiece=p.rookPiece;this.st.pawnPiece=p.pawnPiece;emit('rk:side',{side:s})},
setMode(mode){const m=(mode==='levels')?'levels':'timed';if(this.st.mode===m){emit('rk:mode',{mode:m});return}this.st.mode=m;safeSetItem('rk-mode',m);emit('rk:mode',{mode:m});this.hardReset()},
setWave(n){const w=Math.max(1,Math.min(8,n|0));this.st.wave=w;emit('rk:wave',{wave:w})},
/* Bölüm sonu --------------------------------------------------------------- */

/* 6 - Skor ve bilgi yönetimi ---------------------------------------------- */
updateInfo(msg){if(msg)emit('rk:state',{msg})},
updateBar(max=60){const fill=document.querySelector('.rk-timebar .rk-timefill');if(fill){const clamp01=(v)=>Math.max(0,Math.min(1,v));const fracLeft=clamp01(this.st.timeLeft/max);const scale=(this.st.timerDir==='down')?(1-fracLeft):clamp01((this.st.timeLeft%max)/max);fill.style.transform=`scaleX(${scale})`}},
draw(){if(this.st.board){this.st.board.position(this.makePosition(),false)}this.updateInfo();this.updateBar(60)},
currentBest(){return(this.st.mode==='timed')?this.st.bestTimed:this.st.bestLevels},
setBest(v){if(this.st.mode==='timed'){this.st.bestTimed=v;safeSetItem('rk-best-timed',String(v))}else{this.st.bestLevels=v;safeSetItem('rk-best-levels',String(v))}emit('rk:best',{best:v})},
setBestLevelsTime(sec){this.st.bestLevelsTime=sec|0;safeSetItem('rk-best-levels-time',String(this.st.bestLevelsTime));emit('rk:bestTime',{seconds:this.st.bestLevelsTime})},
makePosition(){const p={};p[this.st.rookSq]=this.st.rookPiece;const pp=this.st.pawnPiece;this.st.pawns.forEach(sq=>{p[sq]=pp});return p},
/* Bölüm sonu --------------------------------------------------------------- */

/* 7 - Zamanlayıcı sistemi ------------------------------------------------- */
startTimer(dir){if(this.st.timer)return;this.st.timerDir=(dir==='up')?'up':'down';this.st.playing=true;const now=performance.now();if(this.st.timerDir==='down'){this._timerEndAt=now+(this.st.timeLeft*1000)}else{this._timerStartAt=now-(this.st.timeLeft*1000)}let prevWhole=Math.round(this.st.timeLeft);const tick=(tNow)=>{if(this.st.timerDir==='down'){this.st.timeLeft=Math.max(0,(this._timerEndAt-tNow)/1000)}else{this.st.timeLeft=Math.max(0,(tNow-this._timerStartAt)/1000)}this.updateBar(60);const whole=Math.round(this.st.timeLeft);if(whole!==prevWhole){emit('rk:timer',{timeLeft:this.st.timeLeft,dir:this.st.timerDir});prevWhole=whole}if(this.st.timerDir==='down'&&this.st.timeLeft<=0){this.stopTimer();this.st.playing=false;if(this.st.score>this.currentBest()){this.setBest(this.st.score)}this.updateInfo(this.t('msg.timeup')+` ${this.t('hud.score')}: ${this.st.score}`);emit('rk:timeup',{score:this.st.score,best:this.currentBest()});return}this.st.timer=requestAnimationFrame(tick)};this.st.timer=requestAnimationFrame(tick)},
stopTimer(){if(this.st.timer){cancelAnimationFrame(this.st.timer)}this.st.timer=null},
/* Bölüm sonu --------------------------------------------------------------- */

/* 8 - İpucu sistemi ------------------------------------------------------- */
boardEl(){return document.getElementById('cm-board')},
squareEl(sq){return document.querySelector(`#cm-board .square-${sq}`)},
_hintMarks:[],
_srcMarked:null,
_setHintsActive(on){const el=this.boardEl();if(el)el.classList.toggle('hints-active',!!on)},
addHintClass(sq,cls){const el=this.squareEl(sq);if(!el)return;el.classList.add(cls);this._hintMarks.push({sq,cls})},
clearHints(){this._hintMarks.forEach(({sq,cls})=>{const el=this.squareEl(sq);if(el)el.classList.remove(cls)});this._hintMarks.length=0;if(this._srcMarked){const el=this.squareEl(this._srcMarked);if(el)el.classList.remove('square-highlight');this._srcMarked=null}this._setHintsActive(false)},
showHintsFor(from){if(!this.st.hintsOn)return;this.clearHints();const elFrom=this.squareEl(from);if(elFrom&&!elFrom.classList.contains('square-highlight')){elFrom.classList.add('square-highlight');this._srcMarked=from}this.allSquares().forEach(sq=>{if(sq===from)return;if(this.pathClear(from,sq)){if(this.st.pawns.includes(sq)){this.addHintClass(sq,'square-hint-cap')}else{this.addHintClass(sq,'square-hint')}}});this._setHintsActive(true)},

showAdvancedHintsFor(from){
  if(!this.st.hintsOn) return;
  this.clearHints();
  
  const elFrom = this.squareEl(from);
  if(elFrom && !elFrom.classList.contains('square-highlight')) {
    elFrom.classList.add('square-highlight');
    this._srcMarked = from;
  }
  
  this.allSquares().forEach(to => {
    if(to === from) return;
    if(this.pathClear(from, to)) {
      this.addAdvancedHint(from, to);
    }
  });
  
  this._setHintsActive(true);
},

addAdvancedHint(from, to){
  const isCapture = this.st.pawns.includes(to);
  const direction = this.getDirection(from, to);
  const pathSquares = this.getPathSquares(from, to);
  
  pathSquares.forEach(sq => {
    this.addHintClass(sq, 'square-hint-path');
  });
  
  if(isCapture) {
    this.addHintClass(to, 'square-hint-cap');
    this.addHintClass(to, 'square-hint-destination');
  } else {
    this.addHintClass(to, 'square-hint');
    this.addHintClass(to, 'square-hint-destination');
  }
  
  if(!isCapture && direction) {
    this.addHintClass(to, 'square-hint-arrow');
    this.addHintClass(to, `arrow-${direction}`);
  }
},

getDirection(from, to){
  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = ['1','2','3','4','5','6','7','8'];
  const fx = files.indexOf(from[0]);
  const fy = ranks.indexOf(from[1]);
  const tx = files.indexOf(to[0]);
  const ty = ranks.indexOf(to[1]);
  
  if(fx === tx) {
    return (ty > fy) ? 'up' : 'down';
  } else if(fy === ty) {
    return (tx > fx) ? 'right' : 'left';
  }
  return null;
},

getPathSquares(from, to){
  const files = ['a','b','c','d','e','f','g','h'];
  const ranks = ['1','2','3','4','5','6','7','8'];
  const fx = files.indexOf(from[0]);
  const fy = ranks.indexOf(from[1]);
  const tx = files.indexOf(to[0]);
  const ty = ranks.indexOf(to[1]);
  const path = [];
  
  if(fx === tx) {
    const step = (ty > fy) ? 1 : -1;
    for(let y = fy + step; y !== ty; y += step) {
      path.push(files[fx] + ranks[y]);
    }
  } else if(fy === ty) {
    const step = (tx > fx) ? 1 : -1;
    for(let x = fx + step; x !== tx; x += step) {
      path.push(files[x] + ranks[fy]);
    }
  }
  
  return path;
},

applyHints(on){this.st.hintsOn=!!on;safeSetItem('cm-hints',on?'on':'off');if(!on){this.clearHints()}emit('cm-hints',{on:this.st.hintsOn});emit('rk:hints',{on:this.st.hintsOn})},
toggleHints(){this.applyHints(!this.st.hintsOn)},
/* Bölüm sonu --------------------------------------------------------------- */

/* 9 - Combo sistemi ------------------------------------------------------- */
updateCombo() {
  const now = Date.now();
  const timeSinceLastCapture = now - this.st.lastCaptureTime;
  
  if (timeSinceLastCapture < 3000 && this.st.combo > 0) {
    this.st.combo++;
  } else {
    this.st.combo = 1;
  }
  
  this.st.lastCaptureTime = now;
  
  this.updateBoardComboClasses();
  
  emit('rk:combo', {combo: this.st.combo});
  emit('rk:combo-change', {combo: this.st.combo, isNew: this.st.combo === 1});
},

updateBoardComboClasses() {
  const boardEl = this.boardEl();
  if (!boardEl) return;
  
  boardEl.classList.remove('combo-active', 'combo-high', 'combo-super');
  
  const combo = this.st.combo || 0;
  if (combo >= 6) {
    boardEl.classList.add('combo-super');
  } else if (combo >= 4) {
    boardEl.classList.add('combo-high');
  } else if (combo >= 2) {
    boardEl.classList.add('combo-active');
  }
},

calculateComboScore() {
  const baseScore = 1;
  const comboBonus = this.st.combo;
  return baseScore * comboBonus;
},

resetComboTimer() {
  if (this.st.comboTimer) {
    clearTimeout(this.st.comboTimer);
  }
  
  this.st.comboTimer = setTimeout(() => {
    if (this.st.combo > 0) {
      this.st.combo = 0;
      this.updateBoardComboClasses();
      emit('rk:combo-break', {});
      emit('rk:combo-change', {combo: 0, isBreak: true});
    }
  }, 3000);
},

resetCombo() {
  this.st.combo = 0;
  this.st.lastCaptureTime = 0;
  if (this.st.comboTimer) {
    clearTimeout(this.st.comboTimer);
    this.st.comboTimer = null;
  }
  this.updateBoardComboClasses();
  emit('rk:combo-change', {combo: 0, isReset: true});
},
/* Bölüm sonu --------------------------------------------------------------- */

/* 10 - Ses sistemi -------------------------------------------------------- */
initAudio(){
  const AUDIO_DEBUG = false;

  const debugLog = (msg, ...args) => {
    if (AUDIO_DEBUG) console.log(msg, ...args);
  };

  const warnLog = (msg, ...args) => {
    if (AUDIO_DEBUG) console.warn(msg, ...args);
  };

  if (window.ChessBoard) {
    try {
      window.ChessBoard.prototype.playAudio = function() { /* sessiz */ };
      window.ChessBoard.prototype.playSound = function() { /* sessiz */ };
    } catch(e) {
      warnLog('Failed to disable ChessBoard audio:', e);
    }
  }

  const originalAudioPlay = window.Audio.prototype.play;
  const allowedSounds = [
    '/wp-content/uploads/chess/sounds/move.wav',
    '/wp-content/uploads/chess/sounds/capture.wav', 
    '/wp-content/uploads/chess/sounds/countdown.wav',
    '/wp-content/uploads/chess/sounds/result.wav',
  ];

  window.Audio.prototype.play = function() {
    const audioSrc = this.src || this.currentSrc || '';
    
    if (!window.Rook?.st?.soundOn) {
      debugLog('🔇 Audio blocked - sound disabled');
      return Promise.resolve();
    }
    
    const isAllowed = allowedSounds.some(allowed => 
      audioSrc.includes(allowed.replace(/^\//, '')) || 
      audioSrc.endsWith(allowed)
    );
    
    if (isAllowed) {
      debugLog('✅ Audio allowed:', audioSrc);
      return originalAudioPlay.call(this);
    } else {
      debugLog('🚫 Audio blocked:', audioSrc);
      return Promise.resolve();
    }
  };

  const originalCreateBufferSource = AudioContext.prototype.createBufferSource;
  AudioContext.prototype.createBufferSource = function() {
    const source = originalCreateBufferSource.call(this);
    const originalStart = source.start;
    
    source.start = function(when, offset, duration) {
      if (!window.Rook?.st?.soundOn) {
        debugLog('🔇 WebAudio blocked - sound disabled');
        return;
      }
      
      if (this.context !== window.Rook?.audio?.audioCtx?.()) {
        debugLog('🚫 WebAudio blocked - unauthorized context');
        return;
      }
      
      debugLog('✅ WebAudio allowed');
      return originalStart.call(this, when, offset, duration);
    };
    
    return source;
  };

  document.addEventListener('click', (e) => {
    if (e.target) {
      e.target.style.outline = 'none';
    }
  }, { passive: true, capture: true });

  const boardElement = document.getElementById('cm-board');
  if (boardElement) {
    boardElement.addEventListener('click', (e) => {
      if (e.target.closest('#cm-board')) {
        e.stopPropagation();
      }
    }, { passive: true, capture: true });
    
    ['dragstart', 'dragend', 'drop'].forEach(event => {
      boardElement.addEventListener(event, (e) => {
        e.stopPropagation();
      }, { passive: false, capture: true });
    });
  }

  const baseUrl = window.location.origin;
  const soundPath = '/wp-content/uploads/chess/sounds/';
  
  const createAudioWithFallback = (name, volume = 0.7) => {
    const formats = ['mp3', 'ogg', 'wav'];
    let audio = null;
    
    for (const format of formats) {
      try {
        const testAudio = new Audio();
        const canPlay = testAudio.canPlayType(`audio/${format}`);
        if (canPlay !== '') {
          audio = new Audio(`${baseUrl}${soundPath}${name}.${format}`);
          debugLog(`Using ${format} format for ${name}`);
          break;
        }
      } catch(e) {
        warnLog(`Failed to test ${format} format:`, e);
      }
    }
    
    if (!audio) {
      audio = new Audio(`${baseUrl}${soundPath}${name}.wav`);
      warnLog(`Fallback to WAV for ${name}`);
    }
    
    audio.preload = 'auto';
    audio.volume = volume;
    audio.crossOrigin = 'anonymous';
    
    try {
      audio.setAttribute('data-rook-allowed', 'true');
      audio.setAttribute('data-audio-type', name);
    } catch(e) {
      warnLog('Failed to set audio attributes:', e);
    }
    
    audio.load();
    
    return audio;
  };
  
  const moveAudio = createAudioWithFallback('move', 0.7);
  const captureAudio = createAudioWithFallback('capture', 0.6);  
  const countdownAudio = createAudioWithFallback('countdown', 0.8);
  const resultAudio = createAudioWithFallback('result', 0.75);
  
  let audioCtx = null;
  let moveBuf = null, captureBuf = null, countdownBuf = null, resultBuf = null;
  let audioPrimed = false;
  let bufferLoadAttempts = 0;
  const maxBufferAttempts = 3;
  
  const loadBufferWithRetry = async (url, maxRetries = 3) => {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(url, {
          cache: 'force-cache',
          mode: 'cors',
          credentials: 'same-origin'
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const arrayBuffer = await response.arrayBuffer();
        return await audioCtx.decodeAudioData(arrayBuffer);
      } catch (err) {
        warnLog(`Buffer load attempt ${i + 1} failed for ${url}:`, err);
        if (i === maxRetries - 1) throw err;
        await new Promise(resolve => setTimeout(resolve, 100 * (i + 1)));
      }
    }
  };
  
  const installAudioUnlock = () => {
    if (audioPrimed) return;
    
    const prime = async () => {
      audioPrimed = true;
      debugLog('🔊 Audio system priming started...');
      
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) {
          if (!audioCtx) audioCtx = new Ctx();
          
          if (audioCtx.state === 'suspended') { 
            try { 
              await audioCtx.resume(); 
              debugLog('AudioContext resumed');
            } catch(e) { 
              warnLog('AudioContext resume failed:', e);
            } 
          }
          
          if (bufferLoadAttempts < maxBufferAttempts) {
            bufferLoadAttempts++;
            
            const loadTasks = [
              { name: 'move', url: `${baseUrl}${soundPath}move.wav`, target: 'moveBuf' },
              { name: 'capture', url: `${baseUrl}${soundPath}capture.wav`, target: 'captureBuf' },
              { name: 'countdown', url: `${baseUrl}${soundPath}countdown.wav`, target: 'countdownBuf' },
              { name: 'result', url: `${baseUrl}${soundPath}result.wav`, target: 'resultBuf' }
            ];
            
            const results = await Promise.allSettled(
              loadTasks.map(async (task) => {
                try {
                  const buffer = await loadBufferWithRetry(task.url);
                  return { task, buffer };
                } catch (err) {
                  warnLog(`Final buffer load failed for ${task.name}:`, err);
                  return { task, buffer: null };
                }
              })
            );
            
            results.forEach(result => {
              if (result.status === 'fulfilled' && result.value.buffer) {
                const { task, buffer } = result.value;
                switch(task.target) {
                  case 'moveBuf': moveBuf = buffer; break;
                  case 'captureBuf': captureBuf = buffer; break;
                  case 'countdownBuf': countdownBuf = buffer; break;
                  case 'resultBuf': resultBuf = buffer; break;
                }
                debugLog(`✅ ${task.name} buffer loaded`);
              }
            });
          }
        }
        
        const primeAudio = async (audio, name) => {
          try { 
            audio.muted = true;
            const playPromise = audio.play();
            if (playPromise) await playPromise.catch(() => {});
            audio.pause(); 
            audio.currentTime = 0; 
            audio.muted = false;
            debugLog(`✅ ${name} HTML5 Audio primed`);
          } catch(e) {
            warnLog(`${name} HTML5 Audio prime failed:`, e);
          }
        };
        
        await Promise.allSettled([
          primeAudio(moveAudio, 'move'),
          primeAudio(captureAudio, 'capture'),
          primeAudio(countdownAudio, 'countdown'),
          primeAudio(resultAudio, 'result')
        ]);
        
        debugLog('🔊 Audio system priming completed');
        
      } catch(err) {
        warnLog('Audio unlock failed:', err);
      } finally {
        ['pointerdown', 'touchend', 'touchstart', 'keydown', 'click'].forEach(event => {
          window.removeEventListener(event, prime, true);
        });
      }
    };
    
    ['pointerdown', 'touchend', 'touchstart', 'keydown', 'click'].forEach(event => {
      window.addEventListener(event, prime, true);
    });
  };

  this._audioDebug = { debugLog, warnLog };

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
    installAudioUnlock,
    
    getDebugInfo: () => ({
      contextState: audioCtx?.state,
      buffersLoaded: {
        move: !!moveBuf,
        capture: !!captureBuf,
        countdown: !!countdownBuf,
        result: !!resultBuf
      },
      loadAttempts: bufferLoadAttempts,
      primed: audioPrimed
    })
  };

  installAudioUnlock();
},

playMove(){
  if(!this.st.soundOn) return;
  const A = this.audio;
  if(!A) return;
  
  const { debugLog, warnLog } = this._audioDebug || { 
    debugLog: () => {}, 
    warnLog: () => {} 
  };
  
  const audioCtx = A.audioCtx();
  const moveBuf = A.moveBuf();
  
  if(audioCtx && moveBuf && audioCtx.state === 'running'){ 
    try{ 
      const src = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.7, audioCtx.currentTime);
      src.buffer = moveBuf; 
      src.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      src.start(0); 
      debugLog('🔊 Move sound played via WebAudio');
      return; 
    }catch(err){ 
      warnLog('WebAudio move playback failed:', err);
    } 
  }
  
  try{ 
    const audio = A.moveAudio;
    if (audio.readyState >= 2) {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise) {
        playPromise
          .then(() => debugLog('🔊 Move sound played via HTML5'))
          .catch(err => warnLog('HTML5 move play failed:', err));
      }
    } else {
      warnLog('Move audio not ready, readyState:', audio.readyState);
    }
  }catch(err){
    warnLog('HTML5 move audio failed:', err);
  }
},

playCapture(){
  if(!this.st.soundOn) return;
  const A = this.audio;
  if(!A) return;
  
  const { debugLog, warnLog } = this._audioDebug || { 
    debugLog: () => {}, 
    warnLog: () => {} 
  };
  
  const audioCtx = A.audioCtx();
  const captureBuf = A.captureBuf();
  
  if(audioCtx && captureBuf && audioCtx.state === 'running'){ 
    try{ 
      const src = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.6, audioCtx.currentTime);
      src.buffer = captureBuf; 
      src.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      src.start(0); 
      debugLog('🔊 Capture sound played via WebAudio');
      return; 
    }catch(err){ 
      warnLog('WebAudio capture playback failed:', err);
    } 
  }
  
  try{ 
    const audio = A.captureAudio;
    if (audio.readyState >= 2) {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise) {
        playPromise
          .then(() => debugLog('🔊 Capture sound played via HTML5'))
          .catch(() => {
            this.playMove();
            debugLog('🔊 Fallback to move sound');
          });
      }
    } else {
      this.playMove();
    }
  }catch(err){
    warnLog('HTML5 capture audio failed:', err);
    this.playMove();
  }
},

playCountdown(){
  if(!this.st.soundOn) return;
  const A = this.audio;
  if(!A) return;
  
  const { debugLog, warnLog } = this._audioDebug || { 
    debugLog: () => {}, 
    warnLog: () => {} 
  };
  
  const audioCtx = A.audioCtx();
  const countdownBuf = A.countdownBuf();
  
  if(audioCtx && countdownBuf && audioCtx.state === 'running'){ 
    try{ 
      const src = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.8, audioCtx.currentTime);
      src.buffer = countdownBuf; 
      src.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      src.start(0); 
      debugLog('🔊 Countdown sound played via WebAudio');
      return; 
    }catch(err){ 
      warnLog('WebAudio countdown playback failed:', err);
    } 
  }
  
  try{ 
    const audio = A.countdownAudio;
    if (audio.readyState >= 2) {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise) {
        playPromise
          .then(() => debugLog('🔊 Countdown sound played via HTML5'))
          .catch(() => {
            this.playMove();
            debugLog('🔊 Fallback to move sound');
          });
      }
    } else {
      this.playMove();
    }
  }catch(err){
    warnLog('HTML5 countdown audio failed:', err);
    this.playMove();
  }
},

playResult(){
  if(!this.st.soundOn) return;
  const A = this.audio;
  if(!A) return;
  
  const { debugLog, warnLog } = this._audioDebug || { 
    debugLog: () => {}, 
    warnLog: () => {} 
  };
  
  const audioCtx = A.audioCtx();
  const resultBuf = A.resultBuf();
  
  if(audioCtx && resultBuf && audioCtx.state === 'running'){ 
    try{ 
      const src = audioCtx.createBufferSource();
      const gainNode = audioCtx.createGain();
      gainNode.gain.setValueAtTime(0.75, audioCtx.currentTime);
      src.buffer = resultBuf; 
      src.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      src.start(0); 
      debugLog('🔊 Result sound played via WebAudio');
      return; 
    }catch(err){ 
      warnLog('WebAudio result playback failed:', err);
    } 
  }
  
  try{ 
    const audio = A.resultAudio;
    if (audio.readyState >= 2) {
      audio.currentTime = 0;
      const playPromise = audio.play();
      if (playPromise) {
        playPromise
          .then(() => debugLog('🔊 Result sound played via HTML5'))
          .catch(() => {
            this.playCapture();
            debugLog('🔊 Fallback to capture sound');
          });
      }
    } else {
      this.playCapture();
    }
  }catch(err){
    warnLog('HTML5 result audio failed:', err);
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

debugAudio(){
  if(this.audio?.getDebugInfo){
    console.log('🔊 Audio Debug Info:', this.audio.getDebugInfo());
  }
},

cleanupAudioSecurity(){
  try {
    if (this._originalAudioPlay) {
      window.Audio.prototype.play = this._originalAudioPlay;
    }
    
    if (this._originalCreateBufferSource) {
      AudioContext.prototype.createBufferSource = this._originalCreateBufferSource;
    }
    
    debugLog('🧹 Audio security cleanup completed');
  } catch(err) {
    warnLog('Audio security cleanup failed:', err);
  }
},
/* Bölüm sonu --------------------------------------------------------------- */

/* 11 - Tahta kurulumu ----------------------------------------------------- */
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
      
      if(self.audio && !self.audio.audioPrimed()){
        try{
          const audioCtx = self.audio.audioCtx();
          if(audioCtx && audioCtx.state==='suspended'){
            audioCtx.resume().catch(()=>{});
          }
        }catch(_){}
      }
      
      self.showAdvancedHintsFor(source);
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
        
        self.updateCombo();
        const comboScore = self.calculateComboScore();
        self.st.score += comboScore;
        self.resetComboTimer();
        
        emit('rk:score',{score:self.st.score});
        if(self.modes?.onCapture){self.modes.onCapture(self,target)}
        
        const comboText = self.st.combo > 1 ? ` (×${self.st.combo} Combo!)` : '';
        self.updateInfo(self.t('msg.capture') + comboText)
      }else{
        self.playMove();
      }
      
      self.st.rookSq=target;
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

/* 12 - Oyun kontrolleri --------------------------------------------------- */
hardReset(){
  this.stopTimer();
  this.st.playing=false;
  this.st.score=0;
  
  this.resetCombo();
  
  const p=this._startForSide(this.st.side);
  this.st.rookPiece=p.rookPiece;
  this.st.pawnPiece=p.pawnPiece;
  this.setWave(1);
  this.st.levelsStartAt=null;
  if(this.st.mode==='levels'){
    this.st.timeLeft=0;
    this.st.timerDir='up'
  }else{
    this.st.timeLeft=60;
    this.st.timerDir='down'
  }
  if(this.modes?.reset){
    this.modes.reset(this)
  }else{
    this.st.rookSq=p.rookSq;
    const pool=this.allSquares().filter(sq=>sq!==this.st.rookSq);
    this.st.pawns=[pool[Math.floor(Math.random()*pool.length)]]
  }
  this.updateInfo('—');
  this.draw()
},
start(){
  this.hardReset();
  this.st.score=0;
  
  this.resetCombo();
  
  emit('rk:score',{score:0});
  this.updateInfo('—');
  if(this.st.mode==='levels'){this.st.levelsStartAt=Date.now()}
  if(this.modes?.onStart)this.modes.onStart(this);
  if(!this.st.timer)this.startTimer(this.st.timerDir);
  this.st.playing=true;
  emit('rk:start',{mode:this.st.mode})
},
stop(){
  this.st.playing=false;
  this.stopTimer();
  
  this.resetCombo();
  
  this.updateInfo(this.t('msg.paused'));
  emit('rk:stop',{})
},
/* Bölüm sonu --------------------------------------------------------------- */

/* 13 - Cleanup ve önyükleme ----------------------------------------------- */
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

const guard=(e)=>{
  const t=e.target;
  if(!t)return e.preventDefault();
  const tag=t.tagName;
  
  if(tag==='A'||tag==='INPUT'||tag==='TEXTAREA'||tag==='BUTTON'||tag==='SELECT'||t.isContentEditable){
    return;
  }
  
  if(t.closest('.cm-nav')||t.closest('.cm-footer')||t.closest('.cm-brand')||t.closest('.cm-ico')){
    return;
  }
  
  e.preventDefault();
};

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
/* Bölüm sonu --------------------------------------------------------------- */

/* 14 - Çok dilli destek sistemi ------------------------------------------- */
Core.initLang=function(){
  const TEXTS = {
    en: {
      'mode.timed': '⏱️ Timed Mode',
      'mode.levels': '🌊 Eight Waves',
      'btn.start': 'Start',
      'btn.newgame': 'New Game',
      'btn.close': 'Close',
      'tooltip.theme': 'Toggle Theme',
      'tooltip.board': 'Change Board Theme',
      'tooltip.sound.on': 'Sound: On',
      'tooltip.sound.off': 'Sound: Off',
      'tooltip.hints.on': 'Hints: On',
      'tooltip.hints.off': 'Hints: Off',
      'tooltip.start': 'Start Game',
      'hud.time': 'Time',
      'hud.score': 'Score',
      'hud.best': 'Best',
      'hud.fastest': 'Fastest',
      'side.white': 'White',
      'side.black': 'Black',
      'label.side': 'Side:',
      'label.mode': 'Game Mode:',
      'coach.title': 'Welcome to Rook Training Mode.',
      'coach.desc.timed': 'How many pawns can you capture in <span class="hl">60 seconds</span>?',
      'coach.desc.levels': 'How fast can you complete all 8 levels?',
      'coach.hint': '<strong>Hint:</strong> Rook moves only horizontally/vertically and cannot jump over pieces.',
      'msg.start.first': "Press Start first.",
      'msg.capture': 'Great! Score +1',
      'msg.paused': 'Paused.',
      'msg.timeup': 'Time up!',
      'msg.congratulations': 'Congratulations!',
      'modal.timeup.title': 'Time Up!',
      'modal.timeup.desc': 'Score: {0} ♟️',
      'modal.levels.title': 'Congratulations!',
      'modal.levels.desc': 'Time: {0} ⏱️',
      'aria.board': 'Chess Board',
      'aria.gameinfo': 'Game Information',
      'aria.toolbar': 'Game Controls'
    },
    
    tr: {
      'mode.timed': '⏱️ Zamana Karşı',
      'mode.levels': '🌊 Sekiz Dalga',
      'btn.start': 'Başlat',
      'btn.newgame': 'Yeni Oyun',
      'btn.close': 'Kapat',
      'tooltip.theme': 'Tema Değiştir',
      'tooltip.board': 'Tahta Temasını Değiştir',
      'tooltip.sound.on': 'Ses: Açık',
      'tooltip.sound.off': 'Ses: Kapalı',
      'tooltip.hints.on': 'İpuçları: Açık',
      'tooltip.hints.off': 'İpuçları: Kapalı',
      'tooltip.start': 'Oyunu Başlat',
      'hud.time': 'Süre',
      'hud.score': 'Skor',
      'hud.best': 'En İyi',
      'hud.fastest': 'En Hızlı',
      'side.white': 'Beyaz',
      'side.black': 'Siyah',
      'label.side': 'Taraf:',
      'label.mode': 'Oyun Modu:',
      'coach.title': 'Kale Eğitim Moduna Hoşgeldin.',
      'coach.desc.timed': '<span class="hl">60 saniyede</span> kaç piyonu toplayabilirsin?',
      'coach.desc.levels': '8 seviyeyi en hızlı kaç saniyede bitirebilirsin görmek isterim.',
      'coach.hint': '<strong>İpucu:</strong> Kale yalnızca aynı satır/sütunda hareket eder ve aradan atlayamaz.',
      'msg.start.first': "Önce Start'a basın.",
      'msg.capture': 'Harika! Skor +1',
      'msg.paused': 'Duraklatıldı.',
      'msg.timeup': 'Süre doldu!',
      'msg.congratulations': 'Tebrikler!',
      'modal.timeup.title': 'Süre Doldu!',
      'modal.timeup.desc': 'Skor: {0} ♟️',
      'modal.levels.title': 'Tebrikler!',
      'modal.levels.desc': 'Süre: {0} ⏱️',
      'aria.board': 'Satranç Tahtası',
      'aria.gameinfo': 'Oyun Bilgileri',
      'aria.toolbar': 'Oyun Kontrolleri'
    },
    
    de: {
      'mode.timed': '⏱️ Zeitlimit',
      'mode.levels': '🌊 Acht Wellen',
      'btn.start': 'Start',
      'btn.newgame': 'Neues Spiel',
      'btn.close': 'Schließen',
      'tooltip.theme': 'Thema Wechseln',
      'tooltip.board': 'Brett-Thema Ändern',
      'tooltip.sound.on': 'Ton: An',
      'tooltip.sound.off': 'Ton: Aus',
      'tooltip.hints.on': 'Hinweise: An',
      'tooltip.hints.off': 'Hinweise: Aus',
      'tooltip.start': 'Spiel Starten',
      'hud.time': 'Zeit',
      'hud.score': 'Punkte',
      'hud.best': 'Beste',
      'hud.fastest': 'Schnellste',
      'side.white': 'Weiß',
      'side.black': 'Schwarz',
      'label.side': 'Seite:',
      'label.mode': 'Spielmodus:',
      'coach.title': 'Willkommen beim Turm-Training.',
      'coach.desc.timed': 'Wie viele Bauern kannst du in <span class="hl">60 Sekunden</span> schlagen?',
      'coach.desc.levels': 'Wie schnell kannst du alle 8 Level schaffen?',
      'coach.hint': '<strong>Tipp:</strong> Der Turm bewegt sich nur horizontal/vertikal und kann nicht über Figuren springen.',
      'msg.start.first': "Zuerst Start drücken.",
      'msg.capture': 'Großartig! Punkte +1',
      'msg.paused': 'Pausiert.',
      'msg.timeup': 'Zeit abgelaufen!',
      'msg.congratulations': 'Herzlichen Glückwunsch!',
      'modal.timeup.title': 'Zeit Abgelaufen!',
      'modal.timeup.desc': 'Punkte: {0} ♟️',
      'modal.levels.title': 'Herzlichen Glückwunsch!',
      'modal.levels.desc': 'Zeit: {0} ⏱️',
      'aria.board': 'Schachbrett',
      'aria.gameinfo': 'Spiel-Information',
      'aria.toolbar': 'Spiel-Steuerung'
    }
  };

  const getUrlLang = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const lang = params.get('lang');
      return ['en', 'tr', 'de'].includes(lang) ? lang : 'en';
    } catch(_) {
      return 'en';
    }
  };

  this.lang = {
    current: safeGetItem('cm-lang', getUrlLang()),
    texts: TEXTS,
    
    t(key, ...args) {
      const text = this.texts[this.current]?.[key] || this.texts.en[key] || key;
      if (args.length === 0) return text;
      
      return text.replace(/\{(\d+)\}/g, (match, index) => {
        const argIndex = parseInt(index, 10);
        return args[argIndex] !== undefined ? args[argIndex] : match;
      });
    },
    
    setLang(langCode) {
      const validLangs = ['en', 'tr', 'de'];
      const lang = validLangs.includes(langCode) ? langCode : 'en';
      
      if (this.current === lang) return;
      
      this.current = lang;
      safeSetItem('cm-lang', lang);
      
      try {
        const url = new URL(window.location);
        url.searchParams.set('lang', lang);
        window.history.replaceState({}, '', url);
      } catch(_) {}
      
      emit('cm-lang', { lang, from: 'rook' });
    },
    
    getAvailableLangs() {
      return [
        { code: 'en', name: 'English' },
        { code: 'tr', name: 'Türkçe' },
        { code: 'de', name: 'Deutsch' }
      ];
    }
  };

  const urlLang = getUrlLang();
  if (urlLang !== this.lang.current) {
    this.lang.setLang(urlLang);
  }
};

Core.t = function(key, ...args) {
  return this.lang?.t(key, ...args) || key;
};

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
