/**
 * 3a.js — full-screen path.png that moves up/down/left/right with the mouse
 * (same movement as the other pages), with tam.mp3 playing.
 * After the line marked data-video in 3a.html, step.mp4 fades in on loop and moves with the mouse too.
 *
 * Usage:  <script src="3a.js"></script>
 * (path.png, tam.mp3 and step.mp4 must sit next to your HTML file, or change the paths below.)
 */
(() => {
  const IMAGE_SRC = 'path.png';

  //tweakables 
  const DISTANCE = 0.012;  // max travel in each direction (fraction of the image)
  const EASE = 25;         // how quickly it catches up to the mouse (higher = snappier)
  const INVERT = false;    // false: image follows the mouse, true: moves opposite (parallax)
  const ZOOM = 1.03;       // slight zoom so edges never show while moving (keep > 1 + DISTANCE*2)

  // Plain 2D canvas (not WebGL): works for any image size and also when the page
  // is opened straight from disk, where WebGL would refuse to use the image.
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    zIndex: '0', pointerEvents: 'none', display: 'block',
  });
  document.body.prepend(canvas);

  const ctx = canvas.getContext('2d');
  const MAX_SIDE = 4096;            // very large images are shrunk once, so drawing stays smooth

  let source = null;                // what we draw from (the image, or a shrunk copy of it)
  let ready = false;

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }

  const img = new Image();
  img.onload = () => {
    const w = img.naturalWidth, h = img.naturalHeight;
    source = img;
    if (Math.max(w, h) > MAX_SIDE) {
      const k = MAX_SIDE / Math.max(w, h);
      const c = document.createElement('canvas');
      c.width = Math.round(w * k);
      c.height = Math.round(h * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      source = c;
    }
    ready = true;
    layout();
  };
  img.onerror = () => console.error(
    '3a.js: could not load image "' + IMAGE_SRC + '" (looked for ' + img.src + '). ' +
    'Check the file name, capitalisation and that it is in the same folder as 3a.html.');
  img.src = IMAGE_SRC;

  window.addEventListener('resize', layout);
  layout();

  // mouse position normalised to -1..1 (0,0 = screen centre)
  const target = { x: 0, y: 0 };
  const cur = { x: 0, y: 0 };

  function setTarget(clientX, clientY) {
    target.x = (clientX / window.innerWidth) * 2 - 1;
    target.y = (clientY / window.innerHeight) * 2 - 1;
  }
  window.addEventListener('mousemove', e => setTarget(e.clientX, e.clientY));
  window.addEventListener('touchmove', e => {
    const t = e.touches[0]; if (t) setTarget(t.clientX, t.clientY);
  }, { passive: true });

  function draw(offX, offY) {
    const iw = source.width, ih = source.height;
    const imgAspect = iw / ih;
    const screenAspect = canvas.width / canvas.height;

    // fraction of the image visible with "object-fit: cover", then zoomed in
    const fx = (screenAspect > imgAspect ? 1 : screenAspect / imgAspect) / ZOOM;
    const fy = (screenAspect > imgAspect ? imgAspect / screenAspect : 1) / ZOOM;

    // source rectangle in image pixels, centred and shifted by the mouse offset
    const sw = fx * iw, sh = fy * ih;
    const sx = (0.5 + offX) * iw - sw / 2;
    const sy = (0.5 + offY) * ih - sh / 2;

    ctx.fillStyle = '#000';                       // shows through any transparent parts of the png
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  }

  // ---- audio: carn.mp3, starts on the first mouse movement ----------------
  const AUDIO_SRC = 'tam.mp3';
  const AUDIO_LOOP = true;          // keep playing until the page changes
  const AUDIO_FADE_IN_MS = 1400;    // gentle fade-in when it starts
  const audio = new Audio(AUDIO_SRC);
  audio.loop = AUDIO_LOOP;
  audio.preload = 'auto';
  audio.volume = 0;                 // starts silent, then fades up

  let audioStarted = false;
  let audioPending = false;
  let audioFading = false;

  function fadeInAudio(ms) {
    const t0 = performance.now();
    const timer = setInterval(() => {
      if (audioFading) { clearInterval(timer); return; }
      const p = Math.min(1, (performance.now() - t0) / ms);
      audio.volume = p;
      if (p >= 1) clearInterval(timer);
    }, 30);
  }

  function startAudio() {
    if (audioStarted || audioPending || audioFading) return;
    audioPending = true;
    const p = audio.play();
    if (p && p.then) {
      p.then(() => { audioStarted = true; audioPending = false; fadeInAudio(AUDIO_FADE_IN_MS); })
       // Browsers can refuse sound before a click/tap/key press; if so,
       // just try again on the next movement or click.
       .catch(() => { audioPending = false; });
    } else {
      audioStarted = true; audioPending = false; fadeInAudio(AUDIO_FADE_IN_MS);
    }
  }

  window.addEventListener('mousemove', startAudio);
  window.addEventListener('touchmove', startAudio, { passive: true });
  window.addEventListener('click', startAudio);   // click always counts as a permission gesture
  startAudio();                                   // try straight away (works if the browser allows it)

  // Smoothly lowers the volume to silence over `ms`, then stops the track.
  function fadeOutAudio(ms) {
    audioFading = true;                    // stops later movement from restarting it
    const startVol = audio.volume;
    const t0 = performance.now();
    const timer = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      audio.volume = startVol * (1 - p);
      if (p >= 1) { clearInterval(timer); audio.pause(); }
    }, 30);
  }

  // ---- video: step.mp4, fades in on loop after the line marked data-video ---
  // In 3a.html:  <p class="line" data-video="step.mp4">...</p>
  // Once that line has been clicked past, the video fades in over the picture, loops,
  // and drifts with the mouse like the picture does. Clicks go straight through it.
  const VIDEO_MUTED = false;        // true = silent video (its sound is on by default)
  const VIDEO_FADE_S = 1.4;         // fade-in time
  const video = document.createElement('video');
  video.loop = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.muted = VIDEO_MUTED;
  Object.assign(video.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%', objectFit: 'cover',
    zIndex: '0', pointerEvents: 'none', opacity: '0',
    transition: 'opacity ' + VIDEO_FADE_S + 's ease', willChange: 'transform',
  });
  canvas.after(video);              // above the picture, below the text

  const videoLine = document.querySelector('.line[data-video]');
  if (videoLine) video.src = videoLine.dataset.video;   // start loading right away
  let videoOn = false;

  function startVideo() {
    if (videoOn || !videoLine) return;
    videoOn = true;
    const p = video.play();
    // if the browser refuses sound, still show it (silent)
    if (p && p.catch) p.catch(() => { video.muted = true; video.play().catch(() => {}); });
    video.style.opacity = '1';
  }

  // the video's sound fades out together with the music when leaving the page
  function fadeOutVideo(ms) {
    const startVol = video.volume;
    const t0 = performance.now();
    const timer = setInterval(() => {
      const p = Math.min(1, (performance.now() - t0) / ms);
      video.volume = startVol * (1 - p);
      if (p >= 1) { clearInterval(timer); video.pause(); }
    }, 30);
  }

  let lastT = performance.now();
  (function frame(now) {
    requestAnimationFrame(frame);
    if (!ready) return;
    now = now || performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    // smooth, frame-rate independent easing toward the mouse
    const k = 1 - Math.exp(-EASE * dt);
    cur.x += (target.x - cur.x) * k;
    cur.y += (target.y - cur.y) * k;

    // sampling the image opposite to the mouse makes the image follow it
    const dir = INVERT ? 1 : -1;
    draw(dir * cur.x * DISTANCE, dir * cur.y * DISTANCE);

    // the video drifts the same way the picture does
    if (videoOn) {
      const mx = -dir * cur.x * DISTANCE * window.innerWidth;
      const my = -dir * cur.y * DISTANCE * window.innerHeight;
      video.style.transform = 'translate(' + mx.toFixed(1) + 'px,' + my.toFixed(1) + 'px) scale(' + ZOOM + ')';
    }
  })(performance.now());

  // ---- text sequence (reactions only; the words live in 3a.html) ----------
  // Every element with class "line" is one screen of text, in page order.
  // Click / tap: fade the current line out, fade the next one in.
  // A line with data-video starts the video when it is clicked past.
  // Click after the last line: the text, the music and the video's sound fade out,
  // then it goes to the page named in data-next (3b.html). With no data-next, the
  // last line just stays on screen.
  // With no lines at all, this does nothing.
  const lines = Array.from(document.querySelectorAll('.line'));
  const holder = document.querySelector('[data-next]');
  const NEXT_PAGE = holder && holder.dataset.next;   // set in 3a.html: data-next="3b.html"

  if (lines.length) {
    // fade length comes from the CSS transition, so it's set in one place
    const fadeMs = (parseFloat(getComputedStyle(lines[0]).transitionDuration) || 1.4) * 1000;
    let index = 0;
    let busy = true;

    function show(i) {
      busy = true;
      lines[i].classList.add('is-visible');
      setTimeout(() => (busy = false), fadeMs);
    }

    function advance() {
      if (busy) return;                // ignore clicks mid-fade
      const isLast = index === lines.length - 1;
      if (isLast && !NEXT_PAGE) return;   // no page after this one yet
      busy = true;
      lines[index].classList.remove('is-visible');
      if (lines[index].dataset.video) startVideo();   // video comes in as this line goes out
      if (isLast) { fadeOutAudio(fadeMs); fadeOutVideo(fadeMs); }   // sound fades with the last line
      setTimeout(() => {
        index++;
        if (index < lines.length) show(index);
        else {
          // remember where the music is so the next page can pick it up
          try {
            sessionStorage.setItem('stepAudio', JSON.stringify({ t: audio.currentTime, playing: audioStarted }));
          } catch (e) {}
          window.location.href = NEXT_PAGE;
        }
      }, fadeMs);
    }

    window.addEventListener('click', advance);
    setTimeout(() => show(0), 400);
  }
})();