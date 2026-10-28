/**
 * 3c.js
 *
 * Background: eyes.png, follows the mouse with smooth easing.
 * Moving the mouse toward the centre scatters the picture into particles
 * (a distortion / blur); moving away, or leaving the window, restores it.
 *
 * Text: the .line elements in 3c.html fade in one at a time (click to move on).
 *   - a line with data-image="other.png" swaps the background (slow crossfade)
 *     when it is clicked past
 *   - after the last line, the .choices buttons (Yes / No) appear if the page has them;
 *     a button with data-next fades the screen out and goes to that page
 *   - with no .choices, data-next on <main class="lines"> is used instead
 *
 * Usage:  <script src="3c.js"></script>   (anywhere in the page)
 * The particle effect needs the page served from a local web server (browsers block
 * reading image pixels from file://); without one, everything else still works.
 */
(() => {

  const IMAGE_SRC = 'eyes.png';

  // mouse-follow
  const DISTANCE = 0.012;      // how far the picture moves (fraction of the image)
  const EASE = 25;             // how quickly it catches the mouse (higher = snappier)
  const INVERT = false;        // true: moves opposite the mouse
  const ZOOM = 1.03;           // slight zoom so edges never show

  // background swap (only used by a line with data-image)
  const IMAGE_FADE_S = 1.4;

  // particle blur near the centre
  const BLUR_RADIUS = 0.42;        // how close to the centre the mouse must be (0..1)
  const BLUR_FADE = 0.8;           // strength of the effect
  const PARTICLE_SIZE = 3;         // CSS pixels (scaled by the screen's pixel ratio)
  const PARTICLE_SPACING = 5;      // gap between particles, in CSS pixels
  const PARTICLE_MOVEMENT = 19;    // how wildly they jitter
  const RETURN_SPEED = 0.1;        // how quickly they settle back
  const MAX_PARTICLES = 30000;     // cap, for performance


  // run once the page's elements exist, so the <script> tag can go anywhere
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {

    // keeps the text above the canvas (style.css already centres .lines)
    document.head.insertAdjacentHTML('beforeend', '<style>.lines { z-index: 1; }</style>');


    // ---------------- BACKGROUND ----------------

    const canvas = document.createElement('canvas');
    Object.assign(canvas.style, {
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      zIndex: '0',            // not -1: that would sit behind <body>'s black background
      pointerEvents: 'none', display: 'block'
    });
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');
    let dpr = 1;

    let source = null;           // the picture currently shown
    let incoming = null;         // the next picture, while it fades in
    let mix = 0;                 // 0..1 progress of that fade
    let changed = false;         // the swap only happens once
    let particles = [];

    function layout() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(window.innerWidth * dpr);
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      if (source) createParticles();
    }

    function loadImage(src, done) {
      const im = new Image();
      im.onload = () => done(im);
      im.onerror = () => console.error('3c.js: Could not load ' + src);
      im.src = src;
    }

    loadImage(IMAGE_SRC, im => { source = im; createParticles(); });

    function changeImage(src) {
      if (changed) return;
      changed = true;
      loadImage(src, im => { incoming = im; mix = 0; });
    }

    // draws the part of the picture that is visible ("cover" fit, zoomed, shifted by the mouse)
    function draw(src, offX, offY, alpha) {
      const cw = canvas.width, ch = canvas.height;
      const scale = Math.max(cw / src.width, ch / src.height) * ZOOM;
      const sw = cw / scale, sh = ch / scale;

      ctx.globalAlpha = alpha;
      ctx.drawImage(src,
        (0.5 + offX) * src.width - sw / 2,
        (0.5 + offY) * src.height - sh / 2,
        sw, sh, 0, 0, cw, ch);
      ctx.globalAlpha = 1;
    }


    // ---------------- PARTICLES ----------------

    // one particle per sampled pixel of the picture, remembering its colour and home position
    function createParticles() {

      particles = [];

      const w = canvas.width, h = canvas.height;

      // the picture as it looks "at rest", at screen size
      const off = document.createElement('canvas');
      off.width = w;
      off.height = h;
      const offCtx = off.getContext('2d');

      const scale = Math.max(w / source.width, h / source.height) * ZOOM;
      const drawW = source.width * scale, drawH = source.height * scale;
      offCtx.drawImage(source, (w - drawW) / 2, (h - drawH) / 2, drawW, drawH);

      let pixels;
      try {
        pixels = offCtx.getImageData(0, 0, w, h).data;
      } catch (err) {
        // file:// or cross-origin: the picture still shows, only the particles are off
        console.warn('3c.js: Could not read image pixels, particle effect disabled. ' +
          'Serve the page from a local web server.', err);
        return;
      }

      const spacing = Math.max(PARTICLE_SPACING * dpr, Math.sqrt((w * h) / MAX_PARTICLES));

      for (let y = 0; y < h; y += spacing) {
        for (let x = 0; x < w; x += spacing) {
          const i = (Math.floor(y) * w + Math.floor(x)) * 4;
          if (pixels[i + 3] < 10) continue;                 // skip transparent pixels
          particles.push({
            ox: x, oy: y,                                   // home position
            x, y, vx: 0, vy: 0,                             // current position and velocity
            color: `rgba(${pixels[i]},${pixels[i + 1]},${pixels[i + 2]},${pixels[i + 3] / 255})`
          });
        }
      }
    }

    // 0 when the mouse is away from the centre (or outside the window), up to BLUR_FADE at the centre
    function blurIntensity() {
      if (!pointerInside) return 0;
      const t = Math.max(0, Math.min(1, 1 - Math.hypot(target.x, target.y) / BLUR_RADIUS));
      return t * t * (3 - 2 * t) * BLUR_FADE;
    }

    function drawParticles(intensity, offX, offY) {

      if (intensity <= 0.001) return;

      const shiftX = -offX * canvas.width;
      const shiftY = -offY * canvas.height;
      const size = PARTICLE_SIZE * dpr * intensity;

      for (const p of particles) {

        // random jitter, stronger near the centre
        p.vx += (Math.random() - 0.5) * PARTICLE_MOVEMENT * intensity;
        p.vy += (Math.random() - 0.5) * PARTICLE_MOVEMENT * intensity;
        p.x += p.vx * intensity;
        p.y += p.vy * intensity;

        // drift back home, with friction
        p.x += (p.ox - p.x) * RETURN_SPEED;
        p.y += (p.oy - p.y) * RETURN_SPEED;
        p.vx *= 0.85;
        p.vy *= 0.85;

        ctx.fillStyle = p.color;
        ctx.fillRect(p.x + shiftX - size / 2, p.y + shiftY - size / 2, size, size);
      }
    }


    // ---------------- MOUSE ----------------

    const target = { x: 0, y: 0 };   // -1..1, (0,0) = screen centre
    const cur = { x: 0, y: 0 };      // eased towards the target

    // false until the pointer is in the window, so the effect doesn't fire on load,
    // after the mouse leaves, or after a finger lifts
    let pointerInside = false;

    function follow(p) {                                // p: a mouse event or a touch point
      target.x = (p.clientX / window.innerWidth) * 2 - 1;
      target.y = (p.clientY / window.innerHeight) * 2 - 1;
      pointerInside = true;
    }
    const touchFollow = e => { if (e.touches[0]) follow(e.touches[0]); };

    window.addEventListener('mousemove', follow);
    window.addEventListener('touchstart', touchFollow, { passive: true });
    window.addEventListener('touchmove', touchFollow, { passive: true });
    window.addEventListener('touchend', () => { pointerInside = false; });
    window.addEventListener('touchcancel', () => { pointerInside = false; });
    document.documentElement.addEventListener('mouseleave', () => { pointerInside = false; });

    layout();
    window.addEventListener('resize', layout);


    // ---------------- ANIMATION LOOP ----------------

    let last = performance.now();
    let blur = 0;                    // eased blur intensity

    (function frame(now) {
      requestAnimationFrame(frame);
      if (!source) return;

      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      const k = 1 - Math.exp(-EASE * dt);
      cur.x += (target.x - cur.x) * k;
      cur.y += (target.y - cur.y) * k;

      const dir = INVERT ? 1 : -1;
      const offX = dir * cur.x * DISTANCE;
      const offY = dir * cur.y * DISTANCE;

      blur += (blurIntensity() - blur) * 0.08;

      if (incoming) {                                  // background swap in progress
        mix = Math.min(1, mix + dt / IMAGE_FADE_S);
        if (mix >= 1) {
          source = incoming;
          incoming = null;
          mix = 0;
          createParticles();                           // the particles now use the new picture
        }
      }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      draw(source, offX, offY, 1);
      if (incoming) draw(incoming, offX, offY, mix * mix * (3 - 2 * mix));
      drawParticles(blur, offX, offY);
    })(performance.now());


    // ---------------- TEXT SEQUENCE ----------------

    const lines = Array.from(document.querySelectorAll('.line'));
    const choices = document.querySelector('.choices');
    const holder = document.querySelector('.lines[data-next]');
    const NEXT_PAGE = holder && holder.dataset.next;

    if (!lines.length) return;

    // fade length comes from the CSS transition (1.4s if there isn't one)
    const fadeMs = (parseFloat(getComputedStyle(lines[0]).transitionDuration) || 1.4) * 1000;

    // shows or hides an element; sets the class AND the style directly, so it works
    // even if style.css has no .is-visible rule
    function setVisible(el, on) {
      el.classList.toggle('is-visible', on);
      el.style.transition = 'opacity ' + (fadeMs / 1000) + 's ease';
      el.style.opacity = on ? '1' : '0';
      if (el === choices) el.style.pointerEvents = on ? 'auto' : 'none';
    }

    let index = 0;
    let busy = true;
    let leaving = false;

    // load any swap picture ahead of time so the change is instant when clicked
    lines.forEach(l => { if (l.dataset.image) new Image().src = l.dataset.image; });

    function show(i) {
      busy = true;
      setVisible(lines[i], true);
      setTimeout(() => { busy = false; }, fadeMs);
    }

    function goTo(page) {
      if (leaving) return;
      leaving = true;
      setTimeout(() => { window.location.href = page; }, fadeMs);
    }

    function advance() {
      if (busy) return;                                // ignore clicks mid-fade

      const isLast = index === lines.length - 1;
      if (isLast && !choices && !NEXT_PAGE) return;    // nothing after the last line

      busy = true;                                     // stays busy after the last line
      setVisible(lines[index], false);

      if (lines[index].dataset.image) changeImage(lines[index].dataset.image);

      if (!isLast) {
        setTimeout(() => show(++index), fadeMs);
      } else if (choices) {
        setTimeout(() => setVisible(choices, true), fadeMs);   // Yes / No appear
      } else {
        goTo(NEXT_PAGE);
      }
    }

    // buttons only react once they are showing; one without data-next does nothing yet
    if (choices) {
      choices.querySelectorAll('.choice').forEach(btn => {
        btn.addEventListener('click', () => {
          if (!choices.classList.contains('is-visible') || !btn.dataset.next) return;
          setVisible(choices, false);
          goTo(btn.dataset.next);
        });
      });
    }

    window.addEventListener('click', advance);
    setTimeout(() => show(0), 400);

  }

})(); 