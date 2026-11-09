const track    = document.querySelector('.track');
const progress = document.querySelector('.progress');
const stops    = [...document.querySelectorAll('.stop')];

let current = stops[0];
let locked = false;
let lockTimer;

// Center of a button, measured from the left edge of the bar
function stopX(stop) {
  const t = track.getBoundingClientRect();
  const b = stop.querySelector('.btn').getBoundingClientRect();
  return b.left + b.width / 2 - t.left;
}

// Light up one floor and extend the solid line up to it
function setActive(stop) {
  current = stop;
  stops.forEach(s => {
    const on = s === stop;
    s.classList.toggle('active', on);
    if (on) s.setAttribute('aria-current', 'true');
    else s.removeAttribute('aria-current');
  });
  progress.style.width = stopX(stop) + 'px';
}

// Pause scroll tracking briefly so the lit button doesn't flicker during a smooth scroll
function lockScrollTracking() {
  locked = true;
  clearTimeout(lockTimer);
  lockTimer = setTimeout(() => (locked = false), 1000);
}

// Clicking a button goes straight to that floor
stops.forEach(stop => {
  stop.addEventListener('click', () => {
    lockScrollTracking();
    setActive(stop);
  });
});

// Clicking the dragon goes back to the top, on the work floor
document.querySelector('.home-link').addEventListener('click', e => {
  e.preventDefault();
  lockScrollTracking();
  setActive(stops[0]);
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// Scroll tracking: the lit button follows you as you scroll by hand
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting && !locked) {
      // Only light a floor if a button points at this section (the About page has its own button now)
      const match = stops.find(s => s.hash === '#' + e.target.id);
      if (match) setActive(match);
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });
document.querySelectorAll('.content section').forEach(s => io.observe(s));

// Start on the first floor, and keep the line lined up on resize
setActive(stops[0]);
window.addEventListener('resize', () => setActive(current));
window.addEventListener('load', () => setActive(current));