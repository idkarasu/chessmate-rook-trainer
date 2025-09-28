/* rook.ui.events.js — v301 */

(function(window,document){'use strict';

const { on, $, throttle, t, fmtMMSS, setToggleButtonState, updateI18nAttributes, updateDynamicTooltips, updateModalContent, updatePageLanguage, updateHudLabels, updateComboDisplay, animateComboChange, updateLevelsBars, showTimedBar, showLevelsBar, resetTimebarFull, updateHud } = window.RookUICore || {};

/* 1 - Olay köprüleri ------------------------------------------------------- */
const throttledUpdateHud=throttle(updateHud,100);
const throttledUpdateCombo=throttle(updateComboDisplay,50);

on(document,'rk:timeup',({detail})=>{
  if(window.Rook?.st.mode==='timed'){
    const score=detail?.score??(window.Rook.st.score|0);
    window.RookUIAnimations?.openResultModal(t('modal.timeup.title'),t('modal.timeup.desc',score));
    window.RookUIAnimations?.rkConfetti(1800,500);
    throttledUpdateHud()
  }
},{passive:true});

on(document,'rk:levels-finished',({detail})=>{
  const sec=detail?.seconds??0;
  window.RookUIAnimations?.openResultModal(t('modal.levels.title'),t('modal.levels.desc',fmtMMSS(sec)));
  window.RookUIAnimations?.rkConfetti(1800,500);
  throttledUpdateHud()
},{passive:true});

on(document,'rk:wave',({detail})=>{
  if(detail?.wave)updateLevelsBars(detail.wave)
},{passive:true});

on(document,'rk:mode',({detail})=>{
  const mode=detail?.mode;
  if(mode==='levels')showLevelsBar();
  else{showTimedBar();resetTimebarFull()}
  throttledUpdateHud()
},{passive:true});

on(document,'rk:combo-change',({detail})=>{
  const combo = detail?.combo || 0;
  const isNew = detail?.isNew || false;
  const isBreak = detail?.isBreak || false;
  
  updateComboDisplay();
  animateComboChange(combo, isNew, isBreak);
},{passive:true});

on(document,'rk:combo',({detail})=>{
  throttledUpdateCombo();
},{passive:true});

on(document,'rk:combo-break',()=>{
  const hudCombo = $('hud-combo');
  if(hudCombo) {
    hudCombo.classList.add('combo-break-effect');
    setTimeout(() => hudCombo.classList.remove('combo-break-effect'), 600);
  }
},{passive:true});

on(document,'cm-lang',()=>{
  updatePageLanguage();
  updateHudLabels();
  updateI18nAttributes();
  updateDynamicTooltips();
  updateModalContent();
  
  const toolbar = document.querySelector('.cm-toolbar');
  if (toolbar) {
    toolbar.setAttribute('aria-label', t('aria.toolbar'));
  }
  
  const board = $('cm-board');
  if (board) {
    board.setAttribute('aria-label', t('aria.board'));
  }
  
  const underbar = $('rk-underbar');
  if (underbar) {
    underbar.setAttribute('aria-label', t('aria.gameinfo'));
  }
  
  const hudCombo = $('hud-combo');
  if(hudCombo && window.Rook?.st?.combo > 1) {
    hudCombo.setAttribute('aria-label', `Combo: ${window.Rook.st.combo} kez`);
  }
  
  console.log('Language updated to:', window.Rook?.lang?.current);
},{passive:true});

on(document,'rk:timer',throttledUpdateHud,{passive:true});
on(document,'rk:score',throttledUpdateHud,{passive:true});
on(document,'rk:best',throttledUpdateHud,{passive:true});
on(document,'rk:bestTime',throttledUpdateHud,{passive:true});

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

/* 2 - UI bağlama ---------------------------------------------------------- */
on(document,'rk:ready',()=>{
  const RK=window.Rook;
  
  window.RookUIAnimations?.ensureResultModal();
  window.RookUICore?.ensureUnderbar();
  if(RK.st.mode==='levels')showLevelsBar();
  else{showTimedBar();resetTimebarFull()}
  updateLevelsBars(RK.st.wave||1);
  updateHud();
  updateHudLabels();
  
  updateComboDisplay();
  
  updatePageLanguage();
  updateI18nAttributes();
  updateDynamicTooltips();
  updateModalContent();
  
  window.RookUICore?.initToolbarScroll();
  
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
    await window.RookUIAnimations?.rkCountdown(3);
    RK.start()
  });
  
  if(btnSound)btnSound.setAttribute('aria-pressed',RK.st.soundOn?'true':'false');
  if(btnHints)btnHints.setAttribute('aria-pressed',RK.st.hintsOn?'true':'false')
},{once:true});
/* Bölüm sonu --------------------------------------------------------------- */

on(window,'beforeunload',()=>window.RookUI?.cleanup(),{passive:true});

})(window,document);
/* Bölüm sonu --------------------------------------------------------------- */
