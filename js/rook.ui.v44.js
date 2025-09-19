/* rook.ui.js — v44 */

(function(window,document){'use strict';

/* 1 - Namespace ve cleanup tracking -------------------------------------- */
const RookUI={_eventListeners:[],_timers:new Set(),_animationFrames:new Set(),_observers:[],_modal:{lastFocus:null,trapHandler:null,escHandler:null,unlockAt:0,unlockTimer:null},_countdown:{active:false,resizeHandler:null},_confetti:{active:new Set()}};const on=(el,ev,fn,opts=false)=>{if(!el)return;el.addEventListener(ev,fn,opts);RookUI._eventListeners.push({el,ev,fn,opts})};const $=(id)=>document.getElementById(id);const throttle=(func,delay)=>{let timeoutId;let lastExecTime=0;return function(...args){const currentTime=Date.now();if(currentTime-lastExecTime>delay){func.apply(this,args);lastExecTime=currentTime}else{clearTimeout(timeoutId);timeoutId=setTimeout(()=>{func.apply(this,args);lastExecTime=Date.now()},delay-(currentTime-lastExecTime));RookUI._timers.add(timeoutId)}}};
/* Bölüm sonu --------------------------------------------------------------- */

/* 2 - Önyükleme ve yardımcılar ------------------------------------------- */
function getCardHost(){const board=$('cm-board');const card=board?.closest('.rk-wrap');return card||document.querySelector('.rk-wrap')||document.body}function insertAfter(ref,node){if(!ref?.parentNode)return;ref.parentNode.insertBefore(node,ref.nextSibling)}const pad2=(n)=>String((n|0)).padStart(2,'0');const fmtMMSS=(sec)=>{sec=Math.max(0,sec|0);const m=(sec/60|0),s=sec%60;return pad2(m)+':'+pad2(s)};const fmtMMSSDown60=(sec)=>{sec=Math.max(0,sec|0);if(sec===60)return'00:60';return'00:'+pad2(sec)};const fmtOrDashMMSS=(sec)=>(sec&&sec>0)?fmtMMSS(sec):'—';const hasCMUI=()=>!!(window.CMUI&&(typeof window.CMUI.setTheme==='function'||typeof window.CMUI.setBoardSkin==='function'));function setToggleButtonState(btn,{pressed,title,text}){if(!btn)return;if(typeof pressed==='boolean'){btn.setAttribute('aria-pressed',pressed?'true':'false')}if(typeof title==='string')btn.title=title;if(typeof text==='string')btn.textContent=text}
/* Bölüm sonu --------------------------------------------------------------- */

/* 3 - Geri sayım arayüzü ------------------------------------------------- */
function ensureCountdownDom(){let back=$('rk-countdown-back');const host=getCardHost();if(!back){back=document.createElement('div');back.id='rk-countdown-back';back.setAttribute('aria-hidden','true');back.innerHTML='<div id="rk-countdown">3</div>';host.appendChild(back)}else if(back.parentElement!==host){back.remove();host.appendChild(back)}Object.assign(back.style,{position:'absolute',inset:'0',zIndex:'9'});return back}async function rkCountdown(n=3){if(RookUI._countdown.active)return;RookUI._countdown.active=true;try{const back=ensureCountdownDom();const num=$('rk-countdown');if(!back||!num)return;const setFont=()=>{const board=$('cm-board');const base=(board&&(board.clientWidth||board.getBoundingClientRect().width))||360;num.style.fontSize=Math.max(48,Math.min(140,Math.round(base*0.22)))+'px'};setFont();RookUI._countdown.resizeHandler=throttle(setFont,100);on(window,'resize',RookUI._countdown.resizeHandler,{passive:true});document.body.classList.add('rk-count-open');back.style.display='flex';for(let i=n;i>=1;i--){num.textContent=String(i);await new Promise(r=>{const timeoutId=setTimeout(r,800);RookUI._timers.add(timeoutId)})}back.style.display='none';document.body.classList.remove('rk-count-open')}finally{RookUI._countdown.active=false;RookUI._countdown.resizeHandler=null}}
/* Bölüm sonu --------------------------------------------------------------- */

/* 4 - Konfeti efekti ----------------------------------------------------- */
function rkConfetti(duration=1800,fadeMs=500){try{if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return}catch(_){}const confettiId=Date.now()+Math.random();RookUI._confetti.active.add(confettiId);try{const host=getCardHost();const rect=host.getBoundingClientRect();const c=document.createElement('canvas');c.width=Math.max(1,Math.round(rect.width));c.height=Math.max(1,Math.round(rect.height));Object.assign(c.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:10001});host.appendChild(c);const ctx=c.getContext('2d');const N=Math.floor(Math.min(240,Math.max(140,rect.width/5.5)));const colors=['#FFD700','#3AA9FF','#6EE7B7','#FB923C','#A855F7'];const P=Array.from({length:N},()=>({x:Math.random()*c.width,y:-20-Math.random()*c.height*0.3,r:3+Math.random()*5,vx:(Math.random()-.5)*2,vy:2+Math.random()*3,a:Math.random()*Math.PI*2,va:(Math.random()-.5)*0.2,col:colors[(Math.random()*colors.length)|0]}));const t0=performance.now();let frameId;function step(t){if(!RookUI._confetti.active.has(confettiId)){c.remove();return}const dt=t-t0;const done=dt>=duration+fadeMs;const fading=dt>duration;const alpha=fading?Math.max(0,1-(dt-duration)/fadeMs):1;ctx.clearRect(0,0,c.width,c.height);ctx.save();ctx.globalAlpha=alpha;for(const p of P){p.x+=p.vx;p.y+=p.vy;p.a+=p.va;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.a);ctx.fillStyle=p.col;ctx.fillRect(-p.r,-p.r,p.r*2,p.r*2);ctx.restore()}ctx.restore();if(!done){frameId=requestAnimationFrame(step);RookUI._animationFrames.add(frameId)}else{c.remove();RookUI._confetti.active.delete(confettiId)}}frameId=requestAnimationFrame(step);RookUI._animationFrames.add(frameId)}catch(err){console.warn('Confetti effect failed:',err);RookUI._confetti.active.delete(confettiId)}}
/* Bölüm sonu --------------------------------------------------------------- */

/* 5 - Sonuç modali ------------------------------------------------------- */
function ensureResultModal(){const host=getCardHost();let back=$('rk-modal-back');if(!back){back=document.createElement('div');back.id='rk-modal-back';back.style.display='none';back.innerHTML='<div class="rk-modal" role="dialog" aria-modal="true" aria-labelledby="rk-modal-title" aria-describedby="rk-modal-desc"><button id="rk-modal-close" class="rk-modal__close" type="button" aria-label="Kapat">✕</button><h3 class="rk-modal-title" id="rk-modal-title">Sonuç</h3><p class="rk-modal-desc" id="rk-modal-desc">—</p><div class="rk-modal-actions"><button id="rk-modal-newgame" class="rk-btn" type="button">Yeni Oyun</button></div></div>';host.appendChild(back)}else if(back.parentElement!==host){back.remove();host.appendChild(back)}const btn=$('rk-modal-newgame');const closeBtn=$('rk-modal-close');on(back,'click',(e)=>{if(e.target===back&&Date.now()>=RookUI._modal.unlockAt){closeResultModal()}});on(closeBtn,'click',()=>{if(Date.now()>=RookUI._modal.unlockAt)closeResultModal()});on(btn,'click',()=>{window.Rook?.hardReset();closeResultModal()})}function trapFocusWithin(container){if(!container)return;const FOCUS='a[href],area[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';const nodes=Array.from(container.querySelectorAll(FOCUS)).filter(el=>el.offsetParent!==null||el===container);if(nodes.length===0)return;const first=nodes[0],last=nodes[nodes.length-1];RookUI._modal.trapHandler=function(e){if(e.key!=='Tab')return;if(e.shiftKey){if(document.activeElement===first){e.preventDefault();last.focus()}}else{if(document.activeElement===last){e.preventDefault();first.focus()}}};on(container,'keydown',RookUI._modal.trapHandler)}function addEscToClose(){RookUI._modal.escHandler=function(e){if(e.key==='Escape'&&Date.now()>=RookUI._modal.unlockAt){closeResultModal()}};on(document,'keydown',RookUI._modal.escHandler)}function openResultModal(title,desc){ensureResultModal();const back=$('rk-modal-back');const modal=back?.querySelector('.rk-modal');const t=$('rk-modal-title');const d=$('rk-modal-desc');const btn=$('rk-modal-newgame');const closeBtn=$('rk-modal-close');if(!back||!modal||!t||!d||!btn||!closeBtn)return;t.textContent=title;d.textContent=desc;RookUI._modal.unlockAt=Date.now()+1000;modal.classList.add('is-locked');if(RookUI._modal.unlockTimer){clearTimeout(RookUI._modal.unlockTimer)}RookUI._modal.unlockTimer=setTimeout(()=>{modal.classList.remove('is-locked')},1000);RookUI._timers.add(RookUI._modal.unlockTimer);RookUI._modal.lastFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;back.style.display='flex';document.body.classList.add('rk-modal-open');btn.focus();trapFocusWithin(modal);addEscToClose()}function closeResultModal(){const back=$('rk-modal-back');const modal=back?.querySelector('.rk-modal');if(back)back.style.display='none';document.body.classList.remove('rk-modal-open');if(modal)modal.classList.remove('is-locked');if(RookUI._modal.unlockTimer){clearTimeout(RookUI._modal.unlockTimer);RookUI._modal.unlockTimer=null}RookUI._modal.trapHandler=null;RookUI._modal.escHandler=null;if(RookUI._modal.lastFocus?.focus){RookUI._modal.lastFocus.focus()}RookUI._modal.lastFocus=null}
/* Bölüm sonu --------------------------------------------------------------- */

/* 6 - Seviye şeritleri --------------------------------------------------- */
function ensureLevelsBar(){const host=$('cm-board');if(!host)return;if(!$('rk-levels')){const bar=document.createElement('div');bar.id='rk-levels';bar.className='rk-levels';for(let i=1;i<=8;i++){const sp=document.createElement('span');sp.className='lvl';sp.dataset.k=String(i);sp.textContent=String(i);bar.appendChild(sp)}host.appendChild(bar)}}function ensureLevelsInline(){if($('rk-levels-inline'))return;const wrap=$('rk-modebar');if(!wrap)return;const box=document.createElement('div');box.id='rk-levels-inline';box.className='rk-levels-inline';for(let i=1;i<=8;i++){const sp=document.createElement('span');sp.className='lvl';sp.dataset.k=String(i);sp.textContent=String(i);box.appendChild(sp)}box.style.display='none';wrap.appendChild(box)}function updateLevelsBars(activeWave){const update=(rootId)=>{const root=$(rootId);if(!root)return;root.querySelectorAll('.lvl').forEach(el=>{const k=parseInt(el.dataset.k,10);el.classList.toggle('active',k===activeWave);el.classList.toggle('done',k<activeWave);el.classList.toggle('todo',k>activeWave)})};update('rk-levels');update('rk-levels-inline')}
/* Bölüm sonu --------------------------------------------------------------- */

/* 7 - Paneller ----------------------------------------------------------- */
function ensureModeBar(){
  if($('rk-modebar'))return;
  const board=$('cm-board');
  if(!board?.parentNode)return;
  
  const modebar=document.createElement('div');
  modebar.id='rk-modebar';
  modebar.className='rk-softbar';
  modebar.style.display='block';
  
  const timebar=document.createElement('div');
  timebar.id='rk-timebar';
  timebar.className='rk-timebar';
  timebar.style.display='block';
  timebar.innerHTML='<div id="rk-timefill" class="rk-timefill"></div>';
  
  modebar.appendChild(timebar);
  insertAfter(board,modebar);
}

function ensureHud(){
  if($('rk-hud'))return;
  const board=$('cm-board');
  if(!board?.parentNode)return;
  const hud=document.createElement('div');
  hud.id='rk-hud';
  hud.className='rk-softbar';
  hud.setAttribute('aria-live','polite');
  hud.innerHTML='<div id="hud-time" class="hud-chip hud-left" aria-label="Süre"><span class="ico">⏱️</span><span class="lbl">Süre</span><span class="val">00:00</span></div><div id="hud-score" class="hud-chip hud-center" aria-label="Skor"><span class="lbl">Skor</span><span class="val">00</span><span class="ico">♟️</span></div><div id="hud-best" class="hud-chip hud-right" aria-label="En Hızlı"><span class="lbl" id="hud-best-label">En Hızlı</span><span class="val">—</span><span class="ico">⏱️</span></div>';
  const modebar=$('rk-modebar');
  if(modebar)insertAfter(modebar,hud);
  else insertAfter(board,hud)
}

function ensureLevelsInline(){
  if($('rk-levels-inline'))return;
  let wrap=$('rk-modebar');
  
  if(!wrap){
    ensureModeBar();
    wrap=$('rk-modebar');
  }
  
  if(!wrap)return;
  
  const box=document.createElement('div');
  box.id='rk-levels-inline';
  box.className='rk-levels-inline';
  for(let i=1;i<=8;i++){
    const sp=document.createElement('span');
    sp.className='lvl';
    sp.dataset.k=String(i);
    sp.textContent=String(i);
    box.appendChild(sp)
  }
  box.style.display='none';
  wrap.appendChild(box)
}

function showTimedBar(){
  const tb=$('rk-timebar'),lv=$('rk-levels-inline');
  if(tb)tb.style.display='block';
  if(lv)lv.style.display='none'
}

function showLevelsBar(){
  const tb=$('rk-timebar'),lv=$('rk-levels-inline');
  if(tb)tb.style.display='none';
  if(lv)lv.style.display='flex'
}
/* Bölüm sonu --------------------------------------------------------------- */

/* 8 - Zaman barı maske yardımcıları -------------------------------------- */
function setTimebarCoverage(cov){const fill=$('rk-timefill');if(!fill)return;const clamped=Math.max(0,Math.min(1,cov));fill.style.transform=`scaleX(${clamped})`}function resetTimebarFull(){setTimebarCoverage(0)}function updateTimebar(){const RK=window.Rook;if(!RK)return;if(RK.st.mode!=='timed')return;const total=60;const left=Math.max(0,RK.st.timeLeft|0);const frac=Math.max(0,Math.min(1,left/total));const coverage=1-frac;setTimebarCoverage(coverage)}
/* Bölüm sonu --------------------------------------------------------------- */

/* 9 - HUD ----------------------------------------------------------------- */
function updateHud(){const RK=window.Rook;const hud=document.getElementById('rk-hud');if(!RK||!hud)return;const $time=document.querySelector('#hud-time .val');const $score=document.querySelector('#hud-score .val');const $best=document.querySelector('#hud-best .val');const $bestIco=document.querySelector('#hud-best .ico');const $bestLbl=document.getElementById('hud-best-label');const bestWrap=document.getElementById('hud-best');if($score)$score.textContent=pad2(RK.st.score|0);if(RK.st.mode==='timed'){if($time)$time.textContent=fmtMMSSDown60(Math.max(0,RK.st.timeLeft|0));if(bestWrap)bestWrap.setAttribute('aria-label','En İyi');if($bestLbl)$bestLbl.textContent='En İyi';if($best)$best.textContent=pad2(RK.st.bestTimed|0);if($bestIco)$bestIco.textContent='♟️'}else{if($time)$time.textContent=fmtMMSS(Math.max(0,RK.st.timeLeft|0));if(bestWrap)bestWrap.setAttribute('aria-label','En Hızlı');if($bestLbl)$bestLbl.textContent='En Hızlı';if($best)$best.textContent=fmtOrDashMMSS(RK.st.bestLevelsTime|0);if($bestIco)$bestIco.textContent='⏱️'}}
/* Bölüm sonu --------------------------------------------------------------- */

/* 10 - Olay köprüleri ---------------------------------------------------- */
const throttledUpdateHud=throttle(updateHud,100);on(document,'rk:timeup',({detail})=>{if(window.Rook?.st.mode==='timed'){const score=detail?.score??(window.Rook.st.score|0);openResultModal('Süre doldu!',`Skor: ${score} ♟️`);rkConfetti(1800,500);throttledUpdateHud()}});on(document,'rk:levels-finished',({detail})=>{const sec=detail?.seconds??0;openResultModal('Tebrikler!',`Süre: ${fmtMMSS(sec)} ⏱️`);rkConfetti(1800,500);throttledUpdateHud()});on(document,'rk:wave',({detail})=>{if(detail?.wave)updateLevelsBars(detail.wave)});on(document,'rk:mode',({detail})=>{const mode=detail?.mode;const overlay=$('rk-levels');if(overlay)overlay.style.display='none';if(mode==='levels')showLevelsBar();else{showTimedBar();resetTimebarFull()}throttledUpdateHud()});on(document,'rk:timer',throttledUpdateHud);on(document,'rk:score',throttledUpdateHud);on(document,'rk:best',throttledUpdateHud);on(document,'rk:bestTime',throttledUpdateHud);on(document,'cm-sound',(e)=>{const onNow=!!(e?.detail?.on);const btnSound=$('cm-sound-toggle');setToggleButtonState(btnSound,{pressed:onNow,title:onNow?'Ses: Açık':'Ses: Kapalı',text:onNow?'🔊':'🔇'})},{passive:true});on(document,'cm-hints',(e)=>{const onNow=!!(e?.detail?.on);const btnHints=$('cm-hints');setToggleButtonState(btnHints,{pressed:onNow,title:onNow?'İpuçları: Açık':'İpuçları: Kapalı'})},{passive:true});on(document,'cm-theme',(e)=>{const t=e?.detail?.theme||window.Rook?.st.theme||'dark';const btnTheme=$('cm-theme-toggle');setToggleButtonState(btnTheme,{title:'Tema Değiştir',text:(t==='light'?'☀️':'🌙')})},{passive:true});on(document,'cm-board',(e)=>{const s=e?.detail?.skin||window.Rook?.st.boardSkin||'classic';const btnBoard=$('cm-board-toggle');if(btnBoard)btnBoard.title=`Tahta Temasını Değiştir (${s})`},{passive:true});on(window,'storage',(e)=>{if(!e?.key)return;if(e.key==='cm-sound'){const onNow=(e.newValue==='on');const btnSound=$('cm-sound-toggle');setToggleButtonState(btnSound,{pressed:onNow,title:onNow?'Ses: Açık':'Ses: Kapalı',text:onNow?'🔊':'🔇'})}if(e.key==='cm-hints'){const onNow=(e.newValue==='on');const btnHints=$('cm-hints');setToggleButtonState(btnHints,{pressed:onNow,title:onNow?'İpuçları: Açık':'İpuçları: Kapalı'})}if(e.key==='cm-theme'){const t=e.newValue||'dark';const btnTheme=$('cm-theme-toggle');setToggleButtonState(btnTheme,{title:'Tema Değiştir',text:(t==='light'?'☀️':'🌙')})}if(e.key==='cm-board'){const s=e.newValue||'classic';const btnBoard=$('cm-board-toggle');if(btnBoard)btnBoard.title=`Tahta Temasını Değiştir (${s})`}},{passive:true});
/* Bölüm sonu --------------------------------------------------------------- */

/* 11 - UI bağlama --------------------------------------------------------- */
on(document,'rk:ready',()=>{const RK=window.Rook;const modeSel=$('rk-mode-select');if(modeSel){const t=modeSel.querySelector('option[value="timed"]');const l=modeSel.querySelector('option[value="levels"]');if(t)t.textContent='⏱️ Zamana Karşı';if(l)l.textContent='🌊 Sekiz Dalga'}ensureResultModal();ensureLevelsBar();const overlay=$('rk-levels');if(overlay)overlay.style.display='none';ensureLevelsInline();ensureHud();if(RK.st.mode==='levels')showLevelsBar();else{showTimedBar();resetTimebarFull()}updateLevelsBars(RK.st.wave||1);updateHud();const sideSel=$('rk-side-select');if(sideSel){sideSel.value=RK.st.side;on(sideSel,'change',e=>{RK.setSide(e.target.value);RK.hardReset()})}if(modeSel){modeSel.value=RK.st.mode;on(modeSel,'change',e=>RK.setMode(e.target.value))}const btnTheme=$('cm-theme-toggle');const btnBoard=$('cm-board-toggle');const btnSound=$('cm-sound-toggle');const btnHints=$('cm-hints');const btnStart=$('rk-start');if(btnTheme){btnTheme.title='Tema Değiştir';btnTheme.textContent=(RK.st.theme==='light'?'☀️':'🌙')}if(btnBoard){btnBoard.title=`Tahta Temasını Değiştir (${RK.st.boardSkin||'classic'})`}if(btnStart)btnStart.title='Başlat';if(btnSound){const onNow=!!RK.st.soundOn;setToggleButtonState(btnSound,{pressed:onNow,title:onNow?'Ses: Açık':'Ses: Kapalı',text:onNow?'🔊':'🔇'})}if(btnHints){const onNow=!!RK.st.hintsOn;setToggleButtonState(btnHints,{pressed:onNow,title:onNow?'İpuçları: Açık':'İpuçları: Kapalı'})}if(hasCMUI()){document.dispatchEvent(new CustomEvent('cm-theme',{detail:{theme:RK.st.theme}}));document.dispatchEvent(new CustomEvent('cm-board',{detail:{skin:RK.st.boardSkin}}))}on(btnTheme,'click',()=>RK.toggleTheme?.());on(btnBoard,'click',()=>RK.cycleBoard?.());on(btnSound,'click',()=>{const onNow=!RK.st.soundOn;RK.setSound(onNow);setToggleButtonState(btnSound,{pressed:onNow,title:onNow?'Ses: Açık':'Ses: Kapalı',text:onNow?'🔊':'🔇'})});on(btnHints,'click',()=>{RK.toggleHints();const onNow=RK.st.hintsOn;setToggleButtonState(btnHints,{pressed:onNow,title:onNow?'İpuçları: Açık':'İpuçları: Kapalı'})});on(btnStart,'click',async()=>{if(RK.st.mode==='timed')resetTimebarFull();updateHud();await rkCountdown(3);RK.start()});if(btnSound)btnSound.setAttribute('aria-pressed',RK.st.soundOn?'true':'false');if(btnHints)btnHints.setAttribute('aria-pressed',RK.st.hintsOn?'true':'false')},{once:true});
/* Bölüm sonu --------------------------------------------------------------- */

/* 12 - Cleanup ve lifecycle management ----------------------------------- */
RookUI.cleanup=function(){this._eventListeners.forEach(({el,ev,fn,opts})=>{try{el.removeEventListener(ev,fn,opts)}catch(err){console.warn(`Failed to remove event listener ${ev}:`,err)}});this._eventListeners.length=0;this._timers.forEach(timerId=>{try{clearTimeout(timerId)}catch(err){console.warn('Failed to clear timer:',err)}});this._timers.clear();this._animationFrames.forEach(frameId=>{try{cancelAnimationFrame(frameId)}catch(err){console.warn('Failed to cancel animation frame:',err)}});this._animationFrames.clear();this._observers.forEach(observer=>{try{observer.disconnect()}catch(err){console.warn('Failed to disconnect observer:',err)}});this._observers.length=0;this._confetti.active.clear();this._modal.lastFocus=null;this._modal.trapHandler=null;this._modal.escHandler=null;if(this._modal.unlockTimer){clearTimeout(this._modal.unlockTimer);this._modal.unlockTimer=null}this._countdown.active=false;this._countdown.resizeHandler=null};on(window,'beforeunload',()=>RookUI.cleanup(),{passive:true});window.RookUI=RookUI})(window,document);
/* Bölüm sonu --------------------------------------------------------------- */
