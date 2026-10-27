
(() => {

  //Changeable settings (I have this basically at the top of every js file)

  const IMAGE_SRC = 'away.png';
  const DISTANCE = 0.012;      // how far the picture moves (fraction of the image)
  const EASE = 25;             // how quickly it catches the mouse (higher = snappier)
  const INVERT = false;        // true: moves opposite the mouse
  const ZOOM = 1.03;           // slight zoom so edges never show
  const IMAGE_FADE_S = 1.4;    // background swap (only used by a line with data-image)

  const AUDIO_SRC = 'pour.mp3';
  const AUDIO_LOOP = false;        // true: repeat until the page changes; false: play once
  const AUDIO_FADE_IN_MS = 1400;
  const AUDIO_VOLUME = 1;          //0 to 1


  // run once the page's elements exist, so the <script> tag can go anywhere
    // If the page is still loading, wait for it to finish, then run init().
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

    // init() holds all the real work. It only runs once the page is ready.
  function init() {

    //keeps the text above the canvas (style.css already centres .lines)
    //AI assisted-->I had trouble with the text showing up throughout the coding process
    document.head.insertAdjacentHTML('beforeend', '<style>.lines { z-index: 1; }</style>');


    //background-

    const canvas = document.createElement('canvas');
        // Style the canvas with code instead of CSS:
    Object.assign(canvas.style, {
            // fixed = stays in place; inset 0 = stretch to every edge; 100% = full size 
      position: 'fixed', inset: '0', width: '100%', height: '100%',
      zIndex: '0',            // not -1: that would sit behind <body>'s black background
            // pointerEvents none = clicks pass through to the page; display block = no stray gap.
      pointerEvents: 'none', display: 'block'
    });
        // Put the canvas at the very start of <body> so it sits behind the text
    document.body.prepend(canvas);

    const ctx = canvas.getContext('2d');

    function layout() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
            // Make the canvas as wide as the window, in real pixels.
      canvas.width = Math.round(window.innerWidth * dpr);
            // Make the canvas as tall as the window, in real pixels.
      canvas.height = Math.round(window.innerHeight * dpr);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
    }
    layout();
    window.addEventListener('resize', layout);

    function loadImage(src, done) {
      const im = new Image();
      im.onload = () => done(im);
      im.onerror = () => console.error('end1.js: Could not load ' + src);
      im.src = src;
    }

    let source = null;       // the picture currently shown
    let incoming = null;     // the next picture, while it fades in
    let mix = 0;             // 0..1 progress of that fade
    let changed = false;     // the swap only happens once

    loadImage(IMAGE_SRC, im => { source = im; });

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


    //mouse

    const target = { x: 0, y: 0 };   // -1..1, (0,0) = screen centre
    const cur = { x: 0, y: 0 };      //eased towards the target

    function follow(e) {
      target.x = (e.clientX / window.innerWidth) * 2 - 1;
      target.y = (e.clientY / window.innerHeight) * 2 - 1;
    }
    window.addEventListener('pointermove', follow);   // mouse, touch and pen
    window.addEventListener('pointerdown', follow);


    //animation now

    let last = performance.now();

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

      if (incoming) {                                  // background swap in progress
        mix = Math.min(1, mix + dt / IMAGE_FADE_S);
        if (mix >= 1) { source = incoming; incoming = null; mix = 0; }
      }

      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      draw(source, offX, offY, 1);
      if (incoming) draw(incoming, offX, offY, mix * mix * (3 - 2 * mix));
    })(performance.now());


    //audio
    //to ensure that the audio isn't buggy, i made sure to make it so that it only starts playing when a person interacts with it

    const audio = new Audio(AUDIO_SRC);
    audio.loop = AUDIO_LOOP;
    audio.preload = 'auto';
    audio.volume = 0;                                  // starts silent, then fades up
    audio.addEventListener('error', () => console.warn('end1.js: Could not load ' + AUDIO_SRC));

    let audioStarted = false;
    let leaving = false;
    let fadeTimer = null;

    // fades the volume to `to` over `ms`; fading to 0 also stops the track
    function fadeAudio(to, ms) {
      clearInterval(fadeTimer);
      const from = audio.volume;
      const t0 = performance.now();
      fadeTimer = setInterval(() => {
        const p = Math.min(1, (performance.now() - t0) / ms);
        audio.volume = from + (to - from) * p;
        if (p >= 1) {
          clearInterval(fadeTimer);
          if (to === 0) audio.pause();
        }
      }, 30);
    }

    function startAudio() {
      if (audioStarted || leaving) return;
      audioStarted = true;                             // blocks repeat calls while play() is pending
      audio.play()
        .then(() => { if (!leaving) fadeAudio(AUDIO_VOLUME, AUDIO_FADE_IN_MS); })
        .catch(() => { audioStarted = false; });       // refused: try again on the next move / click
    }

    ['pointermove', 'pointerdown', 'click'].forEach(ev => window.addEventListener(ev, startAudio));
    startAudio();                                      // try straight away (works if the browser allows it)


    //text sequence

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

    // load any swap picture ahead of time so the change is instant when clicked
    lines.forEach(l => { if (l.dataset.image) new Image().src = l.dataset.image; });

    function show(i) {
      busy = true;
      setVisible(lines[i], true);
      setTimeout(() => { busy = false; }, fadeMs);
    }

    // sound and screen fade out together, then the page changes
    function goTo(page) {
      if (leaving) return;
      leaving = true;
      fadeAudio(0, fadeMs);
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