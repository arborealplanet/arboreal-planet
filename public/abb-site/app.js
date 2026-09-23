const intro = document.getElementById('intro');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const firstVisit = !sessionStorage.getItem('abb-intro-seen');

// Let the finished homepage render first. The curtain is then introduced over
// the already-painted hero instead of hiding a page that is still loading.
if (!intro || reduceMotion || !firstVisit) {
  intro?.remove();
} else {
  const beginReveal = () => {
    sessionStorage.setItem('abb-intro-seen', '1');
    intro.classList.add('is-active');
    window.setTimeout(() => intro.classList.add('is-done'), 3900);
  };
  if (document.readyState === 'complete') window.setTimeout(beginReveal, 120);
  else window.addEventListener('load', () => window.setTimeout(beginReveal, 120), {once:true});
}
