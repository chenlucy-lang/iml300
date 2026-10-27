/**
 * end1.js
 *
 * Background: away.png
 * Audio: pour.mp3
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
 * (away.png and pour.mp3 must be in the same folder as end1.html.)
 *
 * Patched: the whole script now waits for the page to finish loading (so it
 * works even if the <script> tag is in <head>), and lines / buttons get their
 * opacity set directly, so they show even if style.css has no .is-visible rule.
 */

(() => {

  const start = () => {

  // ---------------- IMAGE ----------------

  const IMAGE_SRC = 'away.png';

  // Mouse-follow animation
  const DISTANCE = 0.012;
  const EASE = 25;
  const INVERT = false;
  const ZOOM = 1.03;

  // Background swap (only used by a line with data-image)
  const IMAGE_FADE_S = 1.4;



  // ---------------- AUDIO SETTINGS ----------------

  const AUDIO_SRC = 'pour.mp3';
  const AUDIO_LOOP = false;         // true: repeat until the page changes; false: play once
  const AUDIO_FADE_IN_MS = 1400;    // gentle fade-in when it starts
  const AUDIO_VOLUME = 1;           // 0 to 1



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



  // ---------------- AUDIO ----------------
  // pour.mp3 starts on the first mouse movement, tap or click (browsers often
  // block sound until the person interacts with the page).

  const audio = new Audio(AUDIO_SRC);

  audio.loop = AUDIO_LOOP;
  audio.preload = 'auto';
  audio.volume = 0;                 // starts silent, then fades up

  audio.addEventListener('error', () => {
    console.warn('end1.js: Could not load ' + AUDIO_SRC);
  });

  let audioStarted = false;
  let audioPending = false;
  let audioFading = false;


  function fadeInAudio(ms) {

    const t0 = performance.now();

    const timer = setInterval(() => {

      if (audioFading) {
        clearInterval(timer);
        return;
      }

      const p = Math.min(1, (performance.now() - t0) / ms);

      audio.volume = p * AUDIO_VOLUME;

      if (p >= 1) clearInterval(timer);

    }, 30);

  }


  function startAudio() {

    if (audioStarted || audioPending || audioFading) return;

    audioPending = true;

    const p = audio.play();

    if (p && p.then) {

      p.then(() => {

        audioStarted = true;
        audioPending = false;

        fadeInAudio(AUDIO_FADE_IN_MS);

      }).catch(() => {

        // Browser refused sound before a click/tap/key press.
        // Try again on the next movement or click.
        audioPending = false;

      });

    } else {

      audioStarted = true;
      audioPending = false;

      fadeInAudio(AUDIO_FADE_IN_MS);

    }

  }


  // Smoothly lowers the volume to silence over `ms`, then stops the track.
  function fadeOutAudio(ms) {

    audioFading = true;             // stops later movement from restarting it

    const startVol = audio.volume;
    const t0 = performance.now();

    const timer = setInterval(() => {

      const p = Math.min(1, (performance.now() - t0) / ms);

      audio.volume = startVol * (1 - p);

      if (p >= 1) {
        clearInterval(timer);
        audio.pause();
      }

    }, 30);

  }


  window.addEventListener('mousemove', startAudio);
  window.addEventListener('touchstart', startAudio, { passive: true });
  window.addEventListener('touchmove', startAudio, { passive: true });
  window.addEventListener('click', startAudio);   // a click always counts as permission

  startAudio();                                   // try straight away (works if the browser allows it)



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
  //
  // A line with data-image="other.png" swaps the background to that picture when
  // it is clicked past.
  //
  // After the last line, a click fades it out and brings in the .choices buttons
  // (Yes / No). A button with a data-next fades the screen out and goes to that page;
  // a button without one does nothing yet.
  // With no .choices, a data-next on the <main class="lines"> tag is used instead,
  // and with neither, the last line just stays.
  //
  // When the page is left (a button or data-next), pour.mp3 fades out with it.

  const lines = Array.from(document.querySelectorAll('.line'));
  const holder = document.querySelector('.lines[data-next]');
  const NEXT_PAGE = holder && holder.dataset.next;
  const choices = document.querySelector('.choices');

  console.log('end1.js: found ' + lines.length + ' .line element(s)');

  if (!lines.length) {
    console.warn('end1.js: no elements with class "line" found, so there is no text to show.');
  }

  if (lines.length) {

    // Fade length comes from the CSS transition, so it's set in one place.
    // If the CSS has no transition (0s), 1.4s is used.
    const fadeMs = (
      parseFloat(getComputedStyle(lines[0]).transitionDuration) || 1.4
    ) * 1000;

    // Shows or hides an element. Sets the class AND the opacity directly, so it
    // works even if style.css has no .is-visible rule.
    function setVisible(el, on) {

      el.classList.toggle('is-visible', on);
      el.style.transition = 'opacity ' + (fadeMs / 1000) + 's ease';
      el.style.opacity = on ? '1' : '0';

    }

    let index = 0;
    let busy = true;
    let leaving = false;

    // load any swap picture ahead of time so the change is instant when clicked
    lines.forEach(l => {
      if (l.dataset.image) new Image().src = l.dataset.image;
    });

    function show(i) {

      busy = true;
      setVisible(lines[i], true);

      setTimeout(() => {
        busy = false;
      }, fadeMs);

    }

    function goTo(page) {

      if (leaving) return;
      leaving = true;

      fadeOutAudio(fadeMs);                              // sound fades as the screen does

      setTimeout(() => {
        window.location.href = page;
      }, fadeMs);

    }

    function advance() {

      if (busy) return;                                  // ignore clicks mid-fade

      const isLast = index === lines.length - 1;

      if (isLast && !choices && !NEXT_PAGE) return;      // nothing after the last line

      busy = true;
      setVisible(lines[index], false);

      // this line swaps the background as it goes out
      if (lines[index].dataset.image) changeImage(lines[index].dataset.image);

      if (isLast && choices) {                           // last line gone -> Yes / No appear
        setTimeout(() => {
          choices.classList.add('is-visible');
          choices.style.transition = 'opacity ' + (fadeMs / 1000) + 's ease';
          choices.style.opacity = '1';
          choices.style.pointerEvents = 'auto';
        }, fadeMs);
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
          choices.style.opacity = '0';
          choices.style.pointerEvents = 'none';
          goTo(btn.dataset.next);

        });

      });

    }

    window.addEventListener('click', advance);

    setTimeout(() => show(0), 400);

  }

  };

  // run once the page's elements exist
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

})();