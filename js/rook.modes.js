/* rook.modes.js — v40 */

(function(window,document){'use strict';

/* 1 - IIFE ve 'use strict' ------------------------------------------------ */

/* 2 - Constants ve configuration ------------------------------------------ */
const CONFIG={TIMED_DURATION:60,MAX_LEVELS:8,RANDOM_GUARD_LIMIT:1000,MIN_ELAPSED_TIME:1};

/* 3 - Olay ve yardımcılar ------------------------------------------------- */
const emit=(name,detail)=>{try{document.dispatchEvent(new CustomEvent(name,{detail}))}catch(err){console.warn(`Event emission failed for ${name}:`,err)}};const randPick=(arr)=>{if(!Array.isArray(arr)||arr.length===0)return null;return arr[(Math.random()*arr.length)|0]};

/* 4 - Kale-güvenli yardımcılar (tahta örnekleme) ------------------------- */
function randomSquares(core,count){if(!core?.st?.rookSq||!core.allSquares)return[];const rook=core.st.rookSq;const occ=new Set([rook]);const all=core.allSquares();const out=[];let guard=0;const safeCount=Math.max(0,Math.min(count,all.length-1));while(out.length<safeCount&&guard++<CONFIG.RANDOM_GUARD_LIMIT){const sq=randPick(all);if(!sq||occ.has(sq))continue;occ.add(sq);out.push(sq)}return out}

/* 5 - Doğurma yardımcıları ------------------------------------------------ */
function spawnForTimed(core){if(!core?.st?.rookSq||!core.allSquares){core.st.pawns=['e8'];return}const pool=core.allSquares().filter(sq=>sq!==core.st.rookSq);if(pool.length===0){core.st.pawns=['e8'];return}const newPawn=randPick(pool);core.st.pawns=newPawn?[newPawn]:['e8']}function spawnForWave(core,n){if(!core?.st){core.st.pawns=['e8'];return}const safeN=Math.max(1,Math.min(n,CONFIG.MAX_LEVELS));core.st.pawns=randomSquares(core,safeN);if(core.st.pawns.length===0){core.st.pawns=['e8']}emit('rk:wave',{wave:core.st.wave})}

/* 6 - Modlar eklentisi iskeleti (install) -------------------------------- */
const ModesPlugin={_installed:false,_eventListeners:[],_addListener(target,event,handler,options={}){target.addEventListener(event,handler,options);this._eventListeners.push({target,event,handler,options})},cleanup(){this._eventListeners.forEach(({target,event,handler,options})=>{try{target.removeEventListener(event,handler,options)}catch(err){console.warn(`Failed to remove modes event listener ${event}:`,err)}});this._eventListeners.length=0;this._installed=false},install(RK){if(this._installed)return;this._installed=true;RK.modes={

/* 7 - RESET işleyicisi ---------------------------------------------------- */
reset(core){if(!core?.st||!core._startForSide){if(core?.st){core.st.pawns=['e8'];core.st.timeLeft=core.st.mode==='timed'?CONFIG.TIMED_DURATION:0}return}const p=core._startForSide(core.st.side);core.st.rookSq=p.rookSq;if(core.st.mode==='timed'){core.st.timeLeft=CONFIG.TIMED_DURATION;spawnForTimed(core)}else{core.setWave?.(1);core.st.timeLeft=0;core.st.levelsStartAt=null;spawnForWave(core,1)}},

/* 8 - START işleyicisi ---------------------------------------------------- */
onStart(core){if(!core?.st||!core.startTimer)return;if(core.st.mode==='timed'){core.startTimer('down')}else{core.st.timeLeft=0;core.st.levelsStartAt=Date.now();core.startTimer('up')}},

/* 9 - CAPTURE işleyicisi -------------------------------------------------- */
onCapture(core,target){if(!core?.st?.pawns||!target){if(core?.st){if(core.st.mode==='timed'){spawnForTimed(core)}else{spawnForWave(core,core.st.wave||1)}}return}if(core.st.mode==='timed'){core.st.pawns=core.st.pawns.filter(sq=>sq!==target);spawnForTimed(core);return}core.st.pawns=core.st.pawns.filter(sq=>sq!==target);if(core.st.pawns.length===0){if(core.st.wave<CONFIG.MAX_LEVELS){const nextWave=Math.min(core.st.wave+1,CONFIG.MAX_LEVELS);core.setWave?.(nextWave);spawnForWave(core,nextWave)}else{if(!core.st.playing||!core.st.levelsStartAt||!core.st.timer){core.setWave?.(1);spawnForWave(core,1);return}let elapsedSec=CONFIG.MIN_ELAPSED_TIME;if(core.st.levelsStartAt){const rawElapsed=(Date.now()-core.st.levelsStartAt)/1000;elapsedSec=Math.max(CONFIG.MIN_ELAPSED_TIME,Math.floor(rawElapsed))}emit('rk:levels-finished',{seconds:elapsedSec});if(!core.st.bestLevelsTime||elapsedSec<core.st.bestLevelsTime){core.setBestLevelsTime?.(elapsedSec)}core.stopTimer?.();core.st.playing=false;core.st.pawns=[]}}}};this._addListener(window,'beforeunload',()=>this.cleanup(),{passive:true})},uninstall(){this.cleanup()}};

/* 10 - Cleanup ve lifecycle management ----------------------------------- */
window.RookModesPlugin=ModesPlugin;

/* 11 - Otomatik kurulum --------------------------------------------------- */
const installPlugin=()=>{if(window.Rook?.use&&typeof window.Rook.use==='function'){window.Rook.use(ModesPlugin);return true}return false};if(!installPlugin()){const observer=new MutationObserver(()=>{if(installPlugin()){observer.disconnect()}});const readyHandler=()=>{if(window.Rook?.use){window.Rook.use(ModesPlugin)}observer.disconnect()};document.addEventListener('rk:ready',readyHandler,{once:true});if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>{if(!installPlugin()){observer.observe(document,{childList:true,subtree:true})}},{once:true})}else{observer.observe(document,{childList:true,subtree:true})}}})(window,document);

/* Bölüm sonu --------------------------------------------------------------- */
