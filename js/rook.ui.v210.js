/* rook.ui.js — v210 */

(function(window,document){'use strict';

/* 1 - Namespace ve cleanup tracking -------------------------------------- */
const RookUI={_listeners:[],_cleanupItems:[]};

const on=(el,ev,fn,opts=false)=>{
  if(!el)return;
  el.addEventListener(ev,fn,opts);
  RookUI._listeners.push({el,ev,fn,opts})
};

const addCleanupItem=(item)=>{RookUI._cleanupItems.push(item)};

const $=(id)=>document.getElementById(id);

const throttle=(func,delay)=>{let timeoutId;let lastExecTime=0;return function(...args){const currentTime=Date.now();if(currentTime-lastExecTime>delay){func.apply(this,args);lastExecTime=currentTime}else{clearTimeout(timeoutId);timeoutId=setTimeout(()=>{func.apply(this,args);lastExecTime=Date.now()},delay-(currentTime-lastExecTime));addCleanupItem(()=>clearTimeout(timeoutId))}}};

// Translation helper
const t=(key,...args)=>window.Rook?.t?.(key,...args)||key;
/* Bölüm sonu --------------------------------------------------------------- */

/* 2 - Önyükleme ve yardımcılar ------------------------------------------- */
function getCardHost(){const board=$('cm-board');const card=board?.closest('.rk-wrap');return card||document.querySelector('.rk-wrap')||document.body}
function insertAfter(ref,node){if(!ref?.parentNode)return;ref.parentNode.insertBefore(node,ref.nextSibling)}
const pad2=(n)=>String((n|0)).padStart(2,'0');
const fmtMMSS=(sec)=>{sec=Math.max(0,sec|0);const m=(sec/60|0),s=sec%60;return pad2(m)+':'+pad2(s)};
const fmtMMSSDown60=(sec)=>{sec=Math.max(0,sec|0);if(sec===60)return'00:60';return'00:'+pad2(sec)};
const fmtOrDashMMSS=(sec)=>(sec&&sec>0)?fmtMMSS(sec):'—';
function setToggleButtonState(btn,{pressed,title,text}){if(!btn)return;if(typeof pressed==='boolean'){btn.setAttribute('aria-pressed',pressed?'true':'false')}if(typeof title==='string')btn.title=title;if(typeof text==='string')btn.textContent=text}
/* Bölüm sonu --------------------------------------------------------------- */

/* 3 - I18N DOM Update System - ENHANCED ----------------------------------- */
function updateI18nAttributes() {
  const elements = document.querySelectorAll('[data-i18n], [data-i18n-title], [data-i18n-aria], [data-i18n-placeholder]');
  
  elements.forEach(el => {
    // Standard text content
    const i18nKey = el.getAttribute('data-i18n');
    if (i18nKey) {
      el.textContent = t(i18nKey);
    }
    
    // Title attribute
    const titleKey = el.getAttribute('data-i18n-title');
    if (titleKey) {
      el.title = t(titleKey);
    }
    
    // Aria-label attribute
    const ariaKey = el.getAttribute('data-i18n-aria');
    if (ariaKey) {
      el.setAttribute('aria-label', t(ariaKey));
    }
    
    // Placeholder attribute
    const placeholderKey = el.getAttribute('data-i18n-placeholder');
    if (placeholderKey) {
      el.setAttribute('placeholder', t(placeholderKey));
    }
  });
}

function updatePageLanguage() {
  const RK = window.Rook;
  if (!RK?.lang) return;
  
  const currentLang = RK.lang.current;
  
  // Update HTML lang attribute
  const htmlEl = document.getElementById('html-root') || document.documentElement;
  if (htmlEl) {
    htmlEl.setAttribute('lang', currentLang);
  }
  
  // Update page title
  const titles = {
    en: 'Rook Training - ChessMate.ink',
    tr: 'Kale Eğitimi - ChessMate.ink',
    de: 'Turm Training - ChessMate.ink'
  };
  
  const titleEl = document.getElementById('page-title');
  if (titleEl && titles[currentLang]) {
    titleEl.textContent = titles[currentLang];
  } else if (titles[currentLang]) {
    document.title = titles[currentLang];
  }
  
  // Update all i18n attributes
  updateI18nAttributes();
}

function updateDynamicTooltips() {
  const RK = window.Rook;
  if (!RK) return;
  
  // Sound button - dynamic based on state
  const btnSound = $('cm-sound-toggle');
  if (btnSound) {
    const isOn = !!RK.st?.soundOn;
    const tooltipKey = isOn ? 'tooltip.sound.on' : 'tooltip.sound.off';
    btnSound.title = t(tooltipKey);
    btnSound.textContent = isOn ? '🔊' : '🔇';
    btnSound.setAttribute('aria-pressed', isOn ? 'true' : 'false');
  }
  
  // Hints button - dynamic based on state
  const btnHints = $('cm-hints');
  if (btnHints) {
    const isOn = !!RK.st?.hintsOn;
    const tooltipKey = isOn ? 'tooltip.hints.on' : 'tooltip.hints.off';
    btnHints.title = t(tooltipKey);
    btnHints.setAttribute('aria-pressed', isOn ? 'true' : 'false');
  }
  
  // Board button - dynamic based on skin
  const btnBoard = $('cm-board-toggle');
  if (btnBoard) {
    const skin = RK.st?.boardSkin || 'classic';
    btnBoard.title = t('tooltip.board') + ` (${skin})`;
  }
  
  // Theme button
  const btnTheme = $('cm-theme-toggle');
  if (btnTheme) {
    const theme = RK.st?.theme || 'dark';
    btnTheme.title = t('tooltip.theme');
    btnTheme.textContent = theme === 'light' ? '☀️' : '🌙';
  }
  
  // Start button
  const btnStart = $('rk-start');
  if (btnStart) {
    btnStart.title = t('tooltip.start');
    // Keep the icon if it exists
    const currentText = btnStart.textContent;
    const hasIcon = currentText.includes('▶');
    btnStart.textContent = hasIcon ? `▶ ${t('btn.start')}` : t('btn.start');
  }
}

function updateModalContent() {
  // Modal close button
  const closeBtn = $('rk-modal-close');
  if (closeBtn) {
    closeBtn.setAttribute('aria-label', t('btn.close'));
  }
  
  // Modal new game button
  const newGameBtn = $('rk-modal-newgame');
  if (newGameBtn) {
    newGameBtn.textContent = t('btn.newgame');
  }
  
  // Update modal title and description if they have static text
  const modalTitle = document.getElementById('rk-modal-title');
  const modalDesc = document.getElementById('rk-modal-desc');
  
  // These will be updated when modals are opened with proper content
  // but we ensure the structure is ready for translations
}
/* Bölüm sonu --------------------------------------------------------------- */

/* 4 - Geri sayım arayüzü ------------------------------------------------- */
let countdownActive = false;

function ensureCountdownDom(){
  let back=$('rk-countdown-back');
  const host=getCardHost();
  if(!back){
    back=document.createElement('div');
    back.id='rk-countdown-back';
    back.setAttribute('aria-hidden','true');
    back.innerHTML='<div id="rk-countdown">3</div>';
    host.appendChild(back)
  }else if(back.parentElement!==host){
    back.remove();
    host.appendChild(back)
  }
  Object.assign(back.style,{position:'absolute',inset:'0',zIndex:'9'});
  return back
}

async function rkCountdown(n=3){
  if(countdownActive)return;
  countdownActive=true;
  try{
    // Geri sayım başladığında ses çal
    if(window.Rook?.playCountdown){
      window.Rook.playCountdown();
    }
    
    const back=ensureCountdownDom();
    const num=$('rk-countdown');
    if(!back||!num)return;
    const setFont=()=>{
      const board=$('cm-board');
      const base=(board&&(board.clientWidth||board.getBoundingClientRect().width))||360;
      num.style.fontSize=Math.max(48,Math.min(140,Math.round(base*0.22)))+'px'
    };
    setFont();
    const resizeHandler=throttle(setFont,100);
    on(window,'resize',resizeHandler,{passive:true});
    document.body.classList.add('rk-count-open');
    back.style.display='flex';
    for(let i=n;i>=1;i--){
      num.textContent=String(i);
      await new Promise(r=>{
        const timeoutId=setTimeout(r,800);
        addCleanupItem(()=>clearTimeout(timeoutId))
      })
    }
    back.style.display='none';
    document.body.classList.remove('rk-count-open')
  }finally{
    countdownActive=false
  }
}
/* Bölüm sonu --------------------------------------------------------------- */

/* 5 - Konfeti efekti ----------------------------------------------------- */
function rkConfetti(duration=1800,fadeMs=500){
  try{
    if(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return
  }catch(_){}
  
  let confettiActive=true;
  addCleanupItem(()=>{confettiActive=false});
  
  try{
    const host=getCardHost();
    const rect=host.getBoundingClientRect();
    const c=document.createElement('canvas');
    c.width=Math.max(1,Math.round(rect.width));
    c.height=Math.max(1,Math.round(rect.height));
    Object.assign(c.style,{position:'absolute',inset:'0',pointerEvents:'none',zIndex:10001});
    host.appendChild(c);
    const ctx=c.getContext('2d');
    const N=Math.floor(Math.min(240,Math.max(140,rect.width/5.5)));
    const colors=['#FFD700','#3AA9FF','#6EE7B7','#FB923C','#A855F7'];
    const P=Array.from({length:N},()=>({
      x:Math.random()*c.width,
      y:-20-Math.random()*c.height*0.3,
      r:3+Math.random()*5,
      vx:(Math.random()-.5)*2,
      vy:2+Math.random()*3,
      a:Math.random()*Math.PI*2,
      va:(Math.random()-.5)*0.2,
      col:colors[(Math.random()*colors.length)|0]
    }));
    const t0=performance.now();
    
    function step(t){
      if(!confettiActive){
        c.remove();
        return
      }
      const dt=t-t0;
      const done=dt>=duration+fadeMs;
      const fading=dt>duration;
      const alpha=fading?Math.max(0,1-(dt-duration)/fadeMs):1;
      ctx.clearRect(0,0,c.width,c.height);
      ctx.save();
      ctx.globalAlpha=alpha;
      for(const p of P){
        p.x+=p.vx;
        p.y+=p.vy;
        p.a+=p.va;
        ctx.save();
        ctx.translate(p.x,p.y);
        ctx.rotate(p.a);
        ctx.fillStyle=p.col;
        ctx.fillRect(-p.r,-p.r,p.r*2,p.r*2);
        ctx.restore()
      }
      ctx.restore();
      if(!done){
        requestAnimationFrame(step)
      }else{
        c.remove();
        confettiActive=false
      }
    }
    requestAnimationFrame(step)
  }catch(err){
    console.warn('Confetti effect failed:',err);
    confettiActive=false
  }
}
/* Bölüm sonu --------------------------------------------------------------- */

/* 6 - Sonuç modali ------------------------------------------------------- */
let modalState={lastFocus:null,trapHandler:null,escHandler:null};

function ensureResultModal(){
  const host=getCardHost();
  let back=$('rk-modal-back');
  if(!back){
    back=document.createElement('div');
    back.id='rk-modal-back';
    back.style.display='none';
    back.innerHTML=`<div class="rk-modal" role="dialog" aria-modal="true" aria-labelledby="rk-modal-title" aria-describedby="rk-modal-desc"><button id="rk-modal-close" class="rk-modal__close" type="button" aria-label="${t('btn.close')}">✕</button><h3 class="rk-modal-title" id="rk-modal-title">${t('modal.timeup.title')}</h3><p class="rk-modal-desc" id="rk-modal-desc">—</p><div class="rk-modal-actions"><button id="rk-modal-newgame" class="rk-btn" type="button">${t('btn.newgame')}</button></div></div>`;
    host.appendChild(back)
  }else if(back.parentElement!==host){
    back.remove();
    host.appendChild(back)
  }
  const btn=$('rk-modal-newgame');
  const closeBtn=$('rk-modal-close');
  on(back,'click',(e)=>{if(e.target===back)closeResultModal()});
  on(closeBtn,'click',closeResultModal);
  on(btn,'click',()=>{window.Rook?.hardReset();closeResultModal()})
}

function trapFocusWithin(container){
  if(!container)return;
  const FOCUS='a[href],area[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  const nodes=Array.from(container.querySelectorAll(FOCUS)).filter(el=>el.offsetParent!==null||el===container);
  if(nodes.length===0)return;
  const first=nodes[0],last=nodes[nodes.length-1];
  modalState.trapHandler=function(e){
    if(e.key!=='Tab')return;
    if(e.shiftKey){
      if(document.activeElement===first){
        e.preventDefault();
        last.focus()
      }
    }else{
      if(document.activeElement===last){
        e.preventDefault();
        first.focus()
      }
    }
  };
  on(container,'keydown',modalState.trapHandler)
}

function addEscToClose(){
  modalState.escHandler=function(e){
    if(e.key==='Escape')closeResultModal()
  };
  on(document,'keydown',modalState.escHandler)
}

function openResultModal(title,desc){
  // Sonuç paneli açılırken ses çal
  if(window.Rook?.playResult){
    window.Rook.playResult();
  }
  
  ensureResultModal();
  const back=$('rk-modal-back');
  const modal=back?.querySelector('.rk-modal');
  const t=$('rk-modal-title');
  const d=$('rk-modal-desc');
  const btn=$('rk-modal-newgame');
  if(!back||!modal||!t||!d||!btn)return;
  t.textContent=title;
  d.textContent=desc;
  modalState.lastFocus=document.activeElement instanceof HTMLElement?document.activeElement:null;
  back.style.display='flex';
  document.body.classList.add('rk-modal-open');
  btn.focus();
  trapFocusWithin(modal);
  addEscToClose()
}

function closeResultModal(){
  const back=$('rk-modal-back');
  if(back)back.style.display='none';
  document.body.classList.remove('rk-modal-open');
  modalState.trapHandler=null;
  modalState.escHandler=null;
  if(modalState.lastFocus?.focus){modalState.lastFocus.focus()}
  modalState.lastFocus=null
}
/* Bölüm sonu --------------------------------------------------------------- */

/* 7 - Seviye şeritleri --------------------------------------------------- */
function updateLevelsBars(activeWave){
  const update=(rootId)=>{
    const root=$(rootId);
    if(!root)return;
    root.querySelectorAll('.lvl').forEach(el=>{
      const k=parseInt(el.dataset.k,10);
      el.classList.toggle('active',k===activeWave);
      el.classList.toggle('done',k<activeWave);
      el.classList.toggle('todo',k>activeWave)
    })
  };
  update('rk-levels-inline')
}
/* Bölüm sonu --------------------------------------------------------------- */

/* 8 - Birleşik alt panel ------------------------------------------------- */
function ensureUnderbar(){
  let underbar = $('rk-underbar');
  const board = $('cm-board');
  if(!board?.parentNode) return;
  
  // Eğer underbar yoksa oluştur
  if(!underbar) {
    underbar = document.createElement('div');
    underbar.id = 'rk-underbar';
    underbar.className = 'rk-underbar';
    underbar.setAttribute('role', 'region');
    underbar.setAttribute('aria-label', t('aria.gameinfo'));
    insertAfter(board, underbar);
  }
  
  // Eğer underbar boşsa içeriği oluştur
  if(underbar.children.length === 0) {
    // ÜSTE SATIR - Zaman barı/Seviyeler (ortalı)
    const centerSection = document.createElement('div'); 
    centerSection.className = 'rk-underbar-center';
    
    // Zaman barı - üstte ortalı
    const timebar = document.createElement('div');
    timebar.id = 'rk-timebar';
    timebar.className = 'rk-timebar';
    timebar.innerHTML = '<div id="rk-timefill" class="rk-timefill"></div>';
    
    // Seviye göstergeleri - üstte ortalı
    const levelsInline = document.createElement('div');
    levelsInline.id = 'rk-levels-inline';
    levelsInline.className = 'rk-levels-inline';
    for(let i = 1; i <= 8; i++) {
      const sp = document.createElement('span');
      sp.className = 'lvl';
      sp.dataset.k = String(i);
      sp.textContent = String(i);
      levelsInline.appendChild(sp);
    }
    levelsInline.style.display = 'none';
    
    centerSection.appendChild(timebar);
    centerSection.appendChild(levelsInline);
    
    // ALT SATIR - HUD elemanları (justify-content: space-between)
    const bottomSection = document.createElement('div');
    bottomSection.className = 'rk-underbar-bottom';
    
    // Sol grup
    const leftSection = document.createElement('div');
    leftSection.className = 'rk-underbar-left';
    
    // Süre - sol tarafta
    const hudTime = document.createElement('div');
    hudTime.id = 'hud-time';
    hudTime.className = 'hud-chip';
    hudTime.setAttribute('aria-label', t('hud.time'));
    hudTime.innerHTML = `<span class="ico">⏱️</span><span class="lbl">${t('hud.time')}</span><span class="val">00:00</span>`;
    leftSection.appendChild(hudTime);
    
    // Orta grup
    const middleSection = document.createElement('div');
    middleSection.className = 'rk-underbar-middle';
    
    // Skor - tam ortada
    const hudScore = document.createElement('div');
    hudScore.id = 'hud-score'; 
    hudScore.className = 'hud-chip';
    hudScore.setAttribute('aria-label', t('hud.score'));
    hudScore.innerHTML = `<span class="lbl">${t('hud.score')}</span><span class="val">00</span><span class="ico">♟️</span>`;
    middleSection.appendChild(hudScore);
    
    // Sağ grup
    const rightSection = document.createElement('div');
    rightSection.className = 'rk-underbar-right';
    
    // En İyi - sağ tarafta
    const hudBest = document.createElement('div');
    hudBest.id = 'hud-best';
    hudBest.className = 'hud-chip';
    hudBest.setAttribute('aria-label', t('hud.best'));  
    hudBest.innerHTML = `<span class="lbl" id="hud-best-label">${t('hud.best')}</span><span class="val">—</span><span class="ico">⏱️</span>`;
    rightSection.appendChild(hudBest);
    
    // Alt satırı oluştur
    bottomSection.appendChild(leftSection);
    bottomSection.appendChild(middleSection); 
    bottomSection.appendChild(rightSection);
    
    // Ana konteynere ekle
    underbar.appendChild(centerSection);  // Üst satır
    underbar.appendChild(bottomSection);  // Alt satır
  }
  
  // Overflow kontrolü
  function checkOverflow(){
    const isOverflowing = underbar.scrollWidth > underbar.clientWidth;
    underbar.classList.toggle('is-overflowing', isOverflowing);
  }
  
  checkOverflow();
  const resizeObserver = new ResizeObserver(throttle(checkOverflow, 100));
  resizeObserver.observe(underbar);
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

/* 9 - Zaman barı maske yardımcıları -------------------------------------- */
function setTimebarCoverage(cov){
  const fill=$('rk-timefill');
  if(!fill)return;
  const clamped=Math.max(0,Math.min(1,cov));
  fill.style.transform=`scaleX(${clamped})`
}

function resetTimebarFull(){setTimebarCoverage(0)}

function updateTimebar(){
  const RK=window.Rook;
  if(!RK)return;
  if(RK.st.mode!=='timed')return;
  const total=60;
  const left=Math.max(0,RK.st.timeLeft|0);
  const frac=Math.max(0,Math.min(1,left/total));
  const coverage=1-frac;
  setTimebarCoverage(coverage)
}
/* Bölüm sonu --------------------------------------------------------------- */

/* 10 - HUD ----------------------------------------------------------------- */
function updateHud(){
  const RK=window.Rook;
  if(!RK)return;
  const $time=document.querySelector('#hud-time .val');
  const $score=document.querySelector('#hud-score .val');
  const $best=document.querySelector('#hud-best .val');
  const $bestIco=document.querySelector('#hud-best .ico');
  const $bestLbl=document.getElementById('hud-best-label');
  const bestWrap=document.getElementById('hud-best');
  
  if($score)$score.textContent=pad2(RK.st.score|0);
  
  if(RK.st.mode==='timed'){
    if($time)$time.textContent=fmtMMSSDown60(Math.max(0,RK.st.timeLeft|0));
    if(bestWrap)bestWrap.setAttribute('aria-label',t('hud.best'));
    if($bestLbl)$bestLbl.textContent=t('hud.best');
    if($best)$best.textContent=pad2(RK.st.bestTimed|0);
    if($bestIco)$bestIco.textContent='♟️'
  }else{
    if($time)$time.textContent=fmtMMSS(Math.max(0,RK.st.timeLeft|0));
    if(bestWrap)bestWrap.setAttribute('aria-label',t('hud.fastest'));
    if($bestLbl)$bestLbl.textContent=t('hud.fastest');
    if($best)$best.textContent=fmtOrDashMMSS(RK.st.bestLevelsTime|0);
    if($bestIco)$bestIco.textContent='⏱️'
  }
}

function updateHudLabels(){
  const $timeLabel=document.querySelector('#hud-time .lbl');
  const $scoreLabel=document.querySelector('#hud-score .lbl');
  const $bestLabel=document.querySelector('#hud-best .lbl');
  const $timeWrap=document.getElementById('hud-time');
  const $scoreWrap=document.getElementById('hud-score');
  const $bestWrap=document.getElementById('hud-best');
  
  if($timeLabel)$timeLabel.textContent=t('hud.time');
  if($scoreLabel)$scoreLabel.textContent=t('hud.score');
  if($timeWrap)$timeWrap.setAttribute('aria-label',t('hud.time'));
  if($scoreWrap)$scoreWrap.setAttribute('aria-label',t('hud.score'));
  
  const RK=window.Rook;
  if(RK?.st.mode==='timed'){
    if($bestLabel)$bestLabel.textContent=t('hud.best');
    if($bestWrap)$bestWrap.setAttribute('aria-label',t('hud.best'));
  }else{
    if($bestLabel)$bestLabel.textContent=t('hud.fastest');
    if($bestWrap)$bestWrap.setAttribute('aria-label',t('hud.fastest'));
  }
}
/* Bölüm sonu --------------------------------------------------------------- */

/* 11 - Olay köprüleri ---------------------------------------------------- */
const throttledUpdateHud=throttle(updateHud,100);

on(document,'rk:timeup',({detail})=>{
  if(window.Rook?.st.mode==='timed'){
    const score=detail?.score??(window.Rook.st.score|0);
    openResultModal(t('modal.timeup.title'),t('modal.timeup.desc',score));
    rkConfetti(1800,500);
    throttledUpdateHud()
  }
});

on(document,'rk:levels-finished',({detail})=>{
  const sec=detail?.seconds??0;
  openResultModal(t('modal.levels.title'),t('modal.levels.desc',fmtMMSS(sec)));
  rkConfetti(1800,500);
  throttledUpdateHud()
});

on(document,'rk:wave',({detail})=>{
  if(detail?.wave)updateLevelsBars(detail.wave)
});

on(document,'rk:mode',({detail})=>{
  const mode=detail?.mode;
  if(mode==='levels')showLevelsBar();
  else{showTimedBar();resetTimebarFull()}
  throttledUpdateHud()
});

// ENHANCED LANGUAGE CHANGE HANDLER
on(document,'cm-lang',()=>{
  // Update page-level elements
  updatePageLanguage();
  
  // Update HUD labels
  updateHudLabels();
  
  // Update all i18n attributes
  updateI18nAttributes();
  
  // Update dynamic tooltips
  updateDynamicTooltips();
  
  // Update modal content
  updateModalContent();
  
  // Update toolbar aria labels
  const toolbar = document.querySelector('.cm-toolbar');
  if (toolbar) {
    toolbar.setAttribute('aria-label', t('aria.toolbar'));
  }
  
  // Update board aria label
  const board = $('cm-board');
  if (board) {
    board.setAttribute('aria-label', t('aria.board'));
  }
  
  // Update underbar aria label
  const underbar = $('rk-underbar');
  if (underbar) {
    underbar.setAttribute('aria-label', t('aria.gameinfo'));
  }
  
  console.log('Language updated to:', window.Rook?.lang?.current);
});

on(document,'rk:timer',throttledUpdateHud);
on(document,'rk:score',throttledUpdateHud);
on(document,'rk:best',throttledUpdateHud);
on(document,'rk:bestTime',throttledUpdateHud);

// ENHANCED STATE CHANGE HANDLERS
on(document,'cm-sound',(e)=>{
  const onNow=!!(e?.detail?.on);
  const btnSound=$('cm-sound-toggle');
  setToggleButtonState(btnSound,{
    pressed:onNow,
    title:onNow?t('tooltip.sound.on'):t('tooltip.sound.off'),
    text:onNow?'🔊':'🔇'
  })
},{passive:true});

on(document,'cm-hints',(e)=>{
  const onNow=!!(e?.detail?.on);
  const btnHints=$('cm-hints');
  setToggleButtonState(btnHints,{
    pressed:onNow,
    title:onNow?t('tooltip.hints.on'):t('tooltip.hints.off')
  })
},{passive:true});

on(document,'cm-theme',(e)=>{
  const theme=e?.detail?.theme||window.Rook?.st.theme||'dark';
  const btnTheme=$('cm-theme-toggle');
  setToggleButtonState(btnTheme,{
    title:t('tooltip.theme'),
    text:(theme==='light'?'☀️':'🌙')
  })
},{passive:true});

on(document,'cm-board',(e)=>{
  const s=e?.detail?.skin||window.Rook?.st.boardSkin||'classic';
  const btnBoard=$('cm-board-toggle');
  if(btnBoard)btnBoard.title=t('tooltip.board')+` (${s})`
},{passive:true});

on(window,'storage',(e)=>{
  if(!e?.key)return;
  if(e.key==='cm-sound'){
    const onNow=(e.newValue==='on');
    const btnSound=$('cm-sound-toggle');
    setToggleButtonState(btnSound,{
      pressed:onNow,
      title:onNow?t('tooltip.sound.on'):t('tooltip.sound.off'),
      text:onNow?'🔊':'🔇'
    })
  }
  if(e.key==='cm-hints'){
    const onNow=(e.newValue==='on');
    const btnHints=$('cm-hints');
    setToggleButtonState(btnHints,{
      pressed:onNow,
      title:onNow?t('tooltip.hints.on'):t('tooltip.hints.off')
    })
  }
  if(e.key==='cm-theme'){
    const theme=e.newValue||'dark';
    const btnTheme=$('cm-theme-toggle');
    setToggleButtonState(btnTheme,{
      title:t('tooltip.theme'),
      text:(theme==='light'?'☀️':'🌙')
    })
  }
  if(e.key==='cm-board'){
    const s=e.newValue||'classic';
    const btnBoard=$('cm-board-toggle');
    if(btnBoard)btnBoard.title=t('tooltip.board')+` (${s})`
  }
},{passive:true});
/* Bölüm sonu --------------------------------------------------------------- */

/* 12 - UI bağlama --------------------------------------------------------- */
function initToolbarScroll(){
  const toolbar=document.querySelector('.cm-toolbar .rk-toolbar--single');
  if(!toolbar)return;
  
  function checkOverflow(){
    const isOverflowing=toolbar.scrollWidth>toolbar.clientWidth;
    toolbar.classList.toggle('is-overflowing',isOverflowing);
    if(isOverflowing){
      toolbar.scrollLeft=0
    }
  }
  
  function addScrollHelpers(){
    on(toolbar,'wheel',(e)=>{
      if(e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)){
        e.preventDefault();
        const delta=e.deltaY||e.deltaX;
        toolbar.scrollLeft+=delta*0.5
      }
    },{passive:false});
    
    on(toolbar,'keydown',(e)=>{
      if(e.key==='ArrowLeft'){
        e.preventDefault();
        toolbar.scrollLeft-=50
      }else if(e.key==='ArrowRight'){
        e.preventDefault();
        toolbar.scrollLeft+=50
      }
    })
  }
  
  checkOverflow();
  addScrollHelpers();
  
  const resizeObserver=new ResizeObserver(throttle(checkOverflow,100));
  resizeObserver.observe(toolbar);
}

on(document,'rk:ready',()=>{
  const RK=window.Rook;
  
  ensureResultModal();
  ensureUnderbar();
  if(RK.st.mode==='levels')showLevelsBar();
  else{showTimedBar();resetTimebarFull()}
  updateLevelsBars(RK.st.wave||1);
  updateHud();
  updateHudLabels();
  
  // ENHANCED INITIAL SETUP
  updatePageLanguage();
  updateI18nAttributes();
  updateDynamicTooltips();
  updateModalContent();
  
  initToolbarScroll();
  
  const sideSel=$('rk-side-select');
  if(sideSel){
    sideSel.value=RK.st.side;
    on(sideSel,'change',e=>{RK.setSide(e.target.value);RK.hardReset()})
  }
  
  const modeSel=$('rk-mode-select');
  if(modeSel){
    modeSel.value=RK.st.mode;
    on(modeSel,'change',e=>RK.setMode(e.target.value))
  }
  
  const btnTheme=$('cm-theme-toggle');
  const btnBoard=$('cm-board-toggle');
  const btnSound=$('cm-sound-toggle');
  const btnHints=$('cm-hints');
  const btnStart=$('rk-start');
  
  if(btnTheme){
    btnTheme.title=t('tooltip.theme');
    btnTheme.textContent=(RK.st.theme==='light'?'☀️':'🌙')
  }
  if(btnBoard){
    btnBoard.title=t('tooltip.board')+` (${RK.st.boardSkin||'classic'})`
  }
  if(btnStart){
    btnStart.title=t('tooltip.start');
    const currentText = btnStart.textContent;
    const hasIcon = currentText.includes('▶');
    btnStart.textContent = hasIcon ? `▶ ${t('btn.start')}` : t('btn.start');
  }
  
  if(btnSound){
    const onNow=!!RK.st.soundOn;
    setToggleButtonState(btnSound,{
      pressed:onNow,
      title:onNow?t('tooltip.sound.on'):t('tooltip.sound.off'),
      text:onNow?'🔊':'🔇'
    })
  }
  if(btnHints){
    const onNow=!!RK.st.hintsOn;
    setToggleButtonState(btnHints,{
      pressed:onNow,
      title:onNow?t('tooltip.hints.on'):t('tooltip.hints.off')
    })
  }
  
  on(btnTheme,'click',()=>RK.toggleTheme?.());
  on(btnBoard,'click',()=>RK.cycleBoard?.());
  on(btnSound,'click',()=>{
    const onNow=!RK.st.soundOn;
    RK.setSound(onNow);
    setToggleButtonState(btnSound,{
      pressed:onNow,
      title:onNow?t('tooltip.sound.on'):t('tooltip.sound.off'),
      text:onNow?'🔊':'🔇'
    })
  });
  on(btnHints,'click',()=>{
    RK.toggleHints();
    const onNow=RK.st.hintsOn;
    setToggleButtonState(btnHints,{
      pressed:onNow,
      title:onNow?t('tooltip.hints.on'):t('tooltip.hints.off')
    })
  });
  on(btnStart,'click',async()=>{
    if(RK.st.mode==='timed')resetTimebarFull();
    updateHud();
    await rkCountdown(3);
    RK.start()
  });
  
  if(btnSound)btnSound.setAttribute('aria-pressed',RK.st.soundOn?'true':'false');
  if(btnHints)btnHints.setAttribute('aria-pressed',RK.st.hintsOn?'true':'false')
},{once:true});
/* Bölüm sonu --------------------------------------------------------------- */

/* 13 - Cleanup ve lifecycle management ----------------------------------- */
RookUI.cleanup=function(){
  this._listeners.forEach(({el,ev,fn,opts})=>{
    try{el.removeEventListener(ev,fn,opts)}catch(err){console.warn(`Failed to remove event listener ${ev}:`,err)}
  });
  this._listeners.length=0;
  
  this._cleanupItems.forEach(item=>{
    try{item()}catch(err){console.warn('Cleanup item failed:',err)}
  });
  this._cleanupItems.length=0;
  
  countdownActive=false;
  modalState.lastFocus=null;
  modalState.trapHandler=null;
  modalState.escHandler=null
};

on(window,'beforeunload',()=>RookUI.cleanup(),{passive:true});
window.RookUI=RookUI;

})(window,document);
/* Bölüm sonu --------------------------------------------------------------- */
