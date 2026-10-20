/* tilt.js: pointer-driven tilt for the hero poster.
   Applies the transform directly to .hero-img and eases toward the target
   every frame, so no CSS transition or :has() zones are needed. */
(() => {
  const img = document.querySelector('.hero .hero-img');
  if (!img) return;

  const MAX_TILT = 3;     // degrees at the window edge
  const EASE = 0.1;       // 0-1, lower = floatier, higher = snappier
  const ZOOM_PER_DEG = 0.008; // extra zoom per degree of tilt, keeps edges hidden
  const EPSILON = 0.001;  // stop animating when this close to the target

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let frame = null;

  function render() {
    current.x += (target.x - current.x) * EASE;
    current.y += (target.y - current.y) * EASE;

    const settled =
      Math.abs(target.x - current.x) < EPSILON &&
      Math.abs(target.y - current.y) < EPSILON;

    if (settled) {
      current.x = target.x;
      current.y = target.y;
    }

    // Zoom scales with the current tilt: exactly 1 when flat (whole poster visible)
    const zoom = 1 + ZOOM_PER_DEG * (Math.abs(current.x) + Math.abs(current.y));
    img.style.transform =
      `scale(${zoom}) rotateX(${current.x}deg) rotateY(${current.y}deg)`;

    frame = settled ? null : requestAnimationFrame(render);
  }

  function setTarget(x, y) {
    if (reduceMotion) return;
    target.x = x;
    target.y = y;
    if (frame === null) frame = requestAnimationFrame(render);
  }

  function reset() {
    setTarget(0, 0);
  }

  window.addEventListener('pointermove', (e) => {
    const nx = (e.clientX / innerWidth) * 2 - 1;   // -1 (left)  to 1 (right)
    const ny = (e.clientY / innerHeight) * 2 - 1;  // -1 (top)   to 1 (bottom)
    setTarget(-ny * MAX_TILT, nx * MAX_TILT);
  });

  // Return to flat when the pointer leaves, a touch ends, or the window loses focus
  document.documentElement.addEventListener('pointerleave', reset);
  window.addEventListener('pointerup', (e) => {
    if (e.pointerType !== 'mouse') reset();
  });
  window.addEventListener('pointercancel', reset);
  window.addEventListener('blur', reset);
})();