/**
 * 1a.js — full-screen bell.png that moves with the mouse.
 *
 * Includes:
 * - Smooth mouse-follow background animation
 * - 1amix.mp3 playing (fades in, loops, fades out after the last line)
 * - Text appearing line by line
 * - Click to advance text
 * - Fade-in and fade-out transitions
 * - Navigation to the next HTML page
 *
 * Usage: <script src="1a.js"></script>
 *
 * bell.png and 1amix.mp3 must be in the same folder as your HTML file.
 */

(() => {

  // ---------------- IMAGE ----------------

  const IMAGE_SRC = 'bell.png';


  // ---------------- SETTINGS ----------------

  const DISTANCE = 0.012;
  const EASE = 25;
  const INVERT = false;
  const ZOOM = 1.03;


  // ---------------- CANVAS ----------------

  const canvas = document.createElement('canvas');

  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100%',
    height: '100%',
    zIndex: '0',
    pointerEvents: 'none',
    display: 'block'
  });

  document.body.prepend(canvas);


  // ---------------- AUDIO ----------------
  // 1amix.mp3 starts on the first mouse movement, tap or click (browsers often
  // block sound until the person interacts with the page).
  // Set up before WebGL so the music still plays even if WebGL isn't available.

  const AUDIO_SRC = '1amix.mp3';
  const AUDIO_LOOP = true;          // keep playing until the page changes
  const AUDIO_FADE_IN_MS = 1400;    // gentle fade-in when it starts
  const AUDIO_VOLUME = 1;           // 0 to 1

  const audio = new Audio(AUDIO_SRC);

  audio.loop = AUDIO_LOOP;
  audio.preload = 'auto';
  audio.volume = 0;                 // starts silent, then fades up

  audio.addEventListener('error', () => {
    console.warn('1a.js: could not load ' + AUDIO_SRC);
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

    audioFading = true;               // stops later movement from restarting it

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
  window.addEventListener('touchmove', startAudio, { passive: true });
  window.addEventListener('click', startAudio);   // a click always counts as permission

  startAudio();                                   // try straight away (works if the browser allows it)


  // ---------------- WEBGL ----------------

  const gl = canvas.getContext('webgl', {
    antialias: false
  });

  if (!gl) {
    console.warn('1a.js: WebGL not supported');
    return;
  }


  // ---------------- SHADERS ----------------

  const VERT = `
    attribute vec2 p;
    varying vec2 vUv;

    void main() {
      vUv = p * 0.5 + 0.5;
      vUv.y = 1.0 - vUv.y;
      gl_Position = vec4(p, 0.0, 1.0);
    }
  `;

  const FRAG = `
    precision highp float;

    varying vec2 vUv;

    uniform sampler2D uImage;
    uniform vec2 uScale;
    uniform vec2 uOffset;
    uniform float uZoom;

    void main() {

      vec2 iuv = ((vUv - 0.5) / uZoom) * uScale + 0.5;

      iuv += uOffset;

      gl_FragColor = vec4(texture2D(uImage, iuv).rgb, 1.0);

    }
  `;


  // ---------------- COMPILE SHADERS ----------------

  function compile(type, src) {

    const shader = gl.createShader(type);

    gl.shaderSource(shader, src);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }

    return shader;

  }


  // ---------------- WEBGL PROGRAM ----------------

  const prog = gl.createProgram();

  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));

  gl.linkProgram(prog);
  gl.useProgram(prog);


  // ---------------- GEOMETRY ----------------

  const buf = gl.createBuffer();

  gl.bindBuffer(gl.ARRAY_BUFFER, buf);

  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([
      -1, -1,
       1, -1,
      -1,  1,
       1,  1
    ]),
    gl.STATIC_DRAW
  );

  const loc = gl.getAttribLocation(prog, 'p');

  gl.enableVertexAttribArray(loc);

  gl.vertexAttribPointer(
    loc,
    2,
    gl.FLOAT,
    false,
    0,
    0
  );


  // ---------------- UNIFORMS ----------------

  const U = {};

  ['uImage', 'uScale', 'uOffset', 'uZoom'].forEach(n => {
    U[n] = gl.getUniformLocation(prog, n);
  });

  gl.uniform1f(U.uZoom, ZOOM);
  gl.uniform2f(U.uOffset, 0, 0);


  // ---------------- TEXTURE ----------------

  const tex = gl.createTexture();

  gl.bindTexture(gl.TEXTURE_2D, tex);

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MIN_FILTER,
    gl.LINEAR
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_MAG_FILTER,
    gl.LINEAR
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_S,
    gl.CLAMP_TO_EDGE
  );

  gl.texParameteri(
    gl.TEXTURE_2D,
    gl.TEXTURE_WRAP_T,
    gl.CLAMP_TO_EDGE
  );


  // ---------------- IMAGE LOADING ----------------

  let imgAspect = 1;
  let ready = false;

  function layout() {

    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);

    gl.viewport(
      0,
      0,
      canvas.width,
      canvas.height
    );

    const sa = window.innerWidth / window.innerHeight;

    gl.uniform2f(
      U.uScale,
      sa > imgAspect ? 1 : sa / imgAspect,
      sa > imgAspect ? imgAspect / sa : 1
    );

  }


  const img = new Image();

  img.crossOrigin = 'anonymous';

  img.onload = () => {

    imgAspect = img.naturalWidth / img.naturalHeight;

    gl.bindTexture(gl.TEXTURE_2D, tex);

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGB,
      gl.RGB,
      gl.UNSIGNED_BYTE,
      img
    );

    ready = true;

    layout();

  };

  img.onerror = () => {
    console.warn('1a.js: could not load ' + IMAGE_SRC);
  };

  img.src = IMAGE_SRC;


  window.addEventListener('resize', layout);

  layout();


  // ---------------- MOUSE POSITION ----------------

  const target = {
    x: 0,
    y: 0
  };

  const cur = {
    x: 0,
    y: 0
  };


  function setTarget(clientX, clientY) {

    target.x = (clientX / window.innerWidth) * 2 - 1;

    target.y = (clientY / window.innerHeight) * 2 - 1;

  }


  window.addEventListener('mousemove', e => {
    setTarget(e.clientX, e.clientY);
  });


  window.addEventListener('touchmove', e => {

    const t = e.touches[0];

    if (t) {
      setTarget(t.clientX, t.clientY);
    }

  }, { passive: true });


  // ---------------- BACKGROUND ANIMATION ----------------

  let lastT = performance.now();

  function frame(now) {

    requestAnimationFrame(frame);

    if (!ready) return;

    const dt = Math.min(
      0.05,
      (now - lastT) / 1000
    );

    lastT = now;


    // Smooth mouse-follow easing
    const k = 1 - Math.exp(-EASE * dt);

    cur.x += (target.x - cur.x) * k;

    cur.y += (target.y - cur.y) * k;


    // Image movement direction
    const dir = INVERT ? 1 : -1;

    gl.uniform2f(
      U.uOffset,
      dir * cur.x * DISTANCE,
      dir * cur.y * DISTANCE
    );


    // Draw image
    gl.drawArrays(
      gl.TRIANGLE_STRIP,
      0,
      4
    );

  }


  requestAnimationFrame(frame);


  // ---------------- TEXT SEQUENCE ----------------

  // Get all text lines from HTML
  const lines = Array.from(
    document.querySelectorAll('.line')
  );

  // Get next page
  const holder = document.querySelector('[data-next]');

  const NEXT_PAGE = holder
    ? holder.dataset.next
    : null;


  if (lines.length > 0) {

    // Fade duration in milliseconds
    const FADE_DURATION = 1400;

    let index = 0;

    let busy = true;


    // ---------------- SHOW TEXT ----------------

    function showLine(i) {

      busy = true;

      // Make current line visible
      lines[i].classList.add('is-visible');

      // Wait until fade-in finishes
      setTimeout(() => {

        busy = false;

      }, FADE_DURATION);

    }


    // ---------------- ADVANCE TEXT ----------------

    function advanceLine() {

      // Prevent clicking during transitions
      if (busy) return;

      const isLast = index === lines.length - 1;

      // Stay on final line if no next page exists
      if (
        isLast &&
        !NEXT_PAGE
      ) {
        return;
      }

      busy = true;

      // Fade out current line
      lines[index].classList.remove('is-visible');

      // Music fades out with the last line
      if (isLast) fadeOutAudio(FADE_DURATION);


      setTimeout(() => {

        index++;

        // Show next line
        if (index < lines.length) {

          showLine(index);

        } else if (NEXT_PAGE) {

          // Navigate to next page
          window.location.href = NEXT_PAGE;

        }

      }, FADE_DURATION);

    }


    // ---------------- CLICK EVENT ----------------

    window.addEventListener(
      'click',
      advanceLine
    );


    // ---------------- FIRST LINE ----------------

    // Automatically show first line after 400ms
    setTimeout(() => {

      showLine(0);
    }, 400);
  }
})();