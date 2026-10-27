/**
 * end1.js
 *
 * Background: away.png
 *
 * The image follows the mouse with smooth easing (same as 3c.js, but with no
 * particle reaction in the middle).
 *
 * Text: the .line elements in end1.html fade in one at a time (click to move on).
 * A line with data-image="other.png" swaps the background to that image (a slow
 * crossfade) when it is clicked past. After the last line, Yes / No buttons
 * (.choices in end1.html) appear if the page has them.
 *
 * Usage:
 * <script src="end1.js"></script>
 */

(() => {

  // ---------------- IMAGE ----------------

  const IMAGE_SRC = 'away.png';


  // ---------------- SETTINGS ----------------

  // Mouse-follow animation
  const DISTANCE = 0.012;
  const EASE = 25;
  const INVERT = false;
  const ZOOM = 1.03;

  // Background swap (only used by a line with data-image)
  const IMAGE_FADE_S = 1.4;



  // ---------------- PAGE STACKING FIX ----------------
  // Keeps the text above the canvas. (style.css already makes .lines fixed and
  // centred, so only z-index is set here. Setting position: relative here would
  // pull the text out of the centre and up to the top of the page.)

  const styleFix = document.createElement('style');
  styleFix.textContent = `
    .lines {
      z-index: 1;
    }
  `;
  document.head.appendChild(styleFix);


  // ---------------- CANVAS ----------------

  const canvas = document.createElement('canvas');

  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    // 0, not -1: style.css gives <body> a black background, and a canvas at -1
    // sits BEHIND that background, so the image would never be visible.
    zIndex: '0',
    pointerEvents: 'none',
    display: 'block'
  });

  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');

  let source = null;            // the picture currently shown
  let incoming = null;          // the next picture, while it fades in
  let mix = 0;                  // 0..1 progress of that fade
  let changed = false;          // the swap only happens once
  let ready = false;
  let dpr = 1;



  // ---------------- RESIZE ----------------

  function layout() {

    dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

  }


  // ---------------- LOAD IMAGE ----------------

  const img = new Image();

  img.onload = () => {

    source = img;
    ready = true;

    layout();

  };

  img.onerror = () => {
    console.error('end1.js: Could not load ' + IMAGE_SRC);
  };

  img.src = IMAGE_SRC;


  window.addEventListener('resize', layout);


  // ---------------- MOUSE POSITION ----------------

  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };

  function setTarget(clientX, clientY) {

    target.x = (clientX / window.innerWidth) * 2 - 1;
    target.y = (clientY / window.innerHeight) * 2 - 1;

  }

  window.addEventListener('mousemove', e => {
    setTarget(e.clientX, e.clientY);
  });

  window.addEventListener('touchstart', e => {

    const t = e.touches[0];

    if (t) {
      setTarget(t.clientX, t.clientY);
    }

  }, { passive: true });

  window.addEventListener('touchmove', e => {

    const t = e.touches[0];

    if (t) {
      setTarget(t.clientX, t.clientY);
    }

  }, { passive: true });

  // ---------------- DRAW IMAGE ----------------

  function drawSource(src, offX, offY, alpha) {

    const iw = src.width;
    const ih = src.height;

    const imgAspect = iw / ih;
    const screenAspect = canvas.width / canvas.height;

    const fx = (
      screenAspect > imgAspect
        ? 1
        : screenAspect / imgAspect
    ) / ZOOM;

    const fy = (
      screenAspect > imgAspect
        ? imgAspect / screenAspect
        : 1
    ) / ZOOM;

    const sw = fx * iw;
    const sh = fy * ih;

    const sx = (0.5 + offX) * iw - sw / 2;
    const sy = (0.5 + offY) * ih - sh / 2;

    ctx.globalAlpha = alpha;

    ctx.drawImage(
      src,
      sx,
      sy,
      sw,
      sh,
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.globalAlpha = 1;

  }

  function drawImage(offX, offY) {

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawSource(source, offX, offY, 1);

    // while swapping, the new picture fades in on top (eased)
    if (incoming && mix > 0) {
      drawSource(incoming, offX, offY, mix * mix * (3 - 2 * mix));
    }

  }


  // ---------------- SWAP THE BACKGROUND ----------------

  function changeImage(src) {

    if (changed) return;
    changed = true;

    const im = new Image();

    im.onload = () => {
      incoming = im;        // the frame loop fades it in
      mix = 0;
    };

    im.onerror = () => {
      console.error('end1.js: Could not load ' + src);
    };

    im.src = src;

  }


  // ---------------- ANIMATION LOOP ----------------

  let lastT = performance.now();

  function frame(now) {

    requestAnimationFrame(frame);

    if (!ready) return;

    const dt = Math.min(
      0.05,
      (now - lastT) / 1000
    );

    lastT = now;


    // Smooth mouse-follow movement
    const k = 1 - Math.exp(-EASE * dt);

    cur.x += (target.x - cur.x) * k;
    cur.y += (target.y - cur.y) * k;


    // Calculate image movement
    const dir = INVERT ? 1 : -1;

    const offX = dir * cur.x * DISTANCE;
    const offY = dir * cur.y * DISTANCE;


    // Advance the background swap
    if (incoming) {

      mix = Math.min(1, mix + dt / IMAGE_FADE_S);

      if (mix >= 1) {
        source = incoming;
        incoming = null;
        mix = 0;
      }

    }


    // Draw background image
    drawImage(offX, offY);

  }


  requestAnimationFrame(frame);


  // ---------------- TEXT SEQUENCE ----------------
  // Every element with class "line" is one screen of text, in page order.
  // The first one fades in by itself; a click fades it out and brings in the next.
  // Without this, the lines stay invisible (style.css starts them at opacity 0).
  //
  // A line with data-image="other.png" swaps the background to that picture when
  // it is clicked past.
  //
  // After the last line, a click fades it out and brings in the .choices buttons
  // (Yes / No). A button with a data-next fades the screen out and goes to that page;
  // a button without one does nothing yet.
  // With no .choices, a data-next on the <main class="lines"> tag is used instead,
  // and with neither, the last line just stays.

  const lines = Array.from(document.querySelectorAll('.line'));
  const holder = document.querySelector('.lines[data-next]');
  const NEXT_PAGE = holder && holder.dataset.next;
  const choices = document.querySelector('.choices');

  if (lines.length) {

    // Fade length comes from the CSS transition, so it's set in one place
    const fadeMs = (
      parseFloat(getComputedStyle(lines[0]).transitionDuration) || 1.4
    ) * 1000;

    let index = 0;
    let busy = true;
    let leaving = false;

    // load any swap picture ahead of time so the change is instant when clicked
    lines.forEach(l => {
      if (l.dataset.image) new Image().src = l.dataset.image;
    });

    function show(i) {

      busy = true;
      lines[i].classList.add('is-visible');

      setTimeout(() => {
        busy = false;
      }, fadeMs);

    }

    function goTo(page) {

      if (leaving) return;
      leaving = true;

      setTimeout(() => {
        window.location.href = page;
      }, fadeMs);

    }

    function advance() {

      if (busy) return;                                  // ignore clicks mid-fade

      const isLast = index === lines.length - 1;

      if (isLast && !choices && !NEXT_PAGE) return;      // nothing after the last line

      busy = true;
      lines[index].classList.remove('is-visible');

      // this line swaps the background as it goes out
      if (lines[index].dataset.image) changeImage(lines[index].dataset.image);

      if (isLast && choices) {                           // last line gone -> Yes / No appear
        setTimeout(() => choices.classList.add('is-visible'), fadeMs);
        return;                                          // stays busy: the buttons take over
      }

      if (isLast) {
        goTo(NEXT_PAGE);
        return;
      }

      setTimeout(() => {
        index++;
        show(index);
      }, fadeMs);

    }

    // Buttons only react once they are showing
    if (choices) {

      choices.querySelectorAll('.choice').forEach(btn => {

        btn.addEventListener('click', () => {

          if (!choices.classList.contains('is-visible')) return;
          if (!btn.dataset.next) return;                 // e.g. No: nothing yet

          choices.classList.remove('is-visible');
          goTo(btn.dataset.next);

        });

      });

    }

    window.addEventListener('click', advance);

    setTimeout(() => show(0), 400);

  }

})();