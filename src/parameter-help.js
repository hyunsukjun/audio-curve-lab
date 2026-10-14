// Presentation only: keep curve selection, keyboard transport and DSP untouched.
let current = null;
let timer;
function hide() {
  clearTimeout(timer);
  if (current) current.tip.hidden = true;
  current = null;
}
function show(button, tip) {
  hide();
  const status = tip.querySelector('.helpState');
  if (status) status.textContent = button.dataset.helpState || '';
  tip.hidden = false;
  const rect = button.getBoundingClientRect();
  const bounds = tip.getBoundingClientRect();
  tip.style.left = `${Math.max(12, Math.min(rect.left, innerWidth - bounds.width - 12))}px`;
  tip.style.top = `${Math.max(12, rect.bottom + bounds.height + 8 <= innerHeight - 12 ? rect.bottom + 8 : rect.top - bounds.height - 8)}px`;
  current = { button, tip };
}
for (const button of document.querySelectorAll('[data-parameter-help]')) {
  const tip = document.getElementById(button.getAttribute('aria-describedby'));
  button.addEventListener('pointerenter', event => {
    if (event.pointerType === 'touch') return;
    clearTimeout(timer);
    timer = setTimeout(() => show(button, tip), 500);
  });
  button.addEventListener('pointerleave', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!tip.matches(':hover') && !button.matches(':focus-visible')) hide();
    }, 180);
  });
  button.addEventListener('focus', () => show(button, tip));
  button.addEventListener('click', () => show(button, tip));
  button.addEventListener('blur', hide);
  new MutationObserver(() => {
    if (current?.button === button) {
      if (!button.getClientRects().length) hide();
      else show(button, tip);
    }
  }).observe(button, { attributes: true, attributeFilter: ['data-help-state', 'hidden'], childList: true });
  button.addEventListener('pointerup', event => {
    if (event.pointerType === 'touch') show(button, tip);
  });
  tip.addEventListener('pointerenter', () => clearTimeout(timer));
  tip.addEventListener('pointerleave', () => {
    if (!button.matches(':focus-visible')) hide();
  });
}
document.addEventListener('keydown', event => { if (event.key === 'Escape') hide(); });
document.addEventListener('pointerdown', event => {
  if (current && !current.button.contains(event.target) && !current.tip.contains(event.target)) hide();
});
window.addEventListener('resize', hide);
window.addEventListener('scroll', hide, true);
