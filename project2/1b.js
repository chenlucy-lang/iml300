/**
 * 1b.js — full-screen dark.png that moves with the mouse (same as 1a.js), plus:
 *   - the music from 1a carries over (picks up where 1a left off, fading in)
 *   - after the LAST line has appeared, pressing the mouse summons flames
 *   - pressing in the CENTRE of the screen also slowly fades the background to lit.png
 *   - once the background is fully lit, the next lines of text appear (any line marked
 *     data-requires="lit" in 1b.html waits for that), and after the last one a click
 *     moves on to the page named in data-next
 *
 * Usage:  <script src="1b.js"></script>
 * (dark.png and lit.png must sit next to your HTML file.)
 *
 * The flames follow the structure of your p5 sketch (a `systems` list,
 * a ParticleSystem with addParticle() / display(), and a press that pushes a
 * new system at the mouse) but run on a plain canvas, so no p5 library is
 * needed. The soft flame sprite is drawn in code instead of loading texture.png.
 */
(() => {
  const IMAGE_SRC = 'dark.png';
  const LIT_SRC = 'lit.png';

  // ---- tweakables ---------------------------------------------------------
  const DISTANCE = 0.012;  // max travel in each direction (fraction of the image)
  const EASE = 25;         // how quickly it catches up to the mouse (higher = snappier)
  const INVERT = false;    // false: image follows the mouse, true: moves opposite (parallax)
  const ZOOM = 1.03;       // slight zoom so edges never show while moving (keep > 1 + DISTANCE*2)

  const LIT_FADE_S = 2;        // seconds for the background to fade from dark.png to lit.png
  const CENTER_RADIUS = 0.15;  // "centre of the screen": circle, as a fraction of the shorter side
  const FLAME_SECONDS = 9;     // how long each flame keeps burning before dying down
  const FLAME_RATE = 190;      // flame particles per second, per flame
  const MAX_FLAMES = 12;       // oldest flame is removed past this many
  // -------------------------------------------------------------------------

  // ===== background: dark.png (and lit.png faded in on top) ================
  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    zIndex: '0', pointerEvents: 'none', display: 'block',
  });
  document.body.prepend(canvas);

  const gl = canvas.getContext('webgl', { antialias: false });
  if (!gl) { console.warn('1b.js: WebGL not supported'); return; }

  const VERT = `
    attribute vec2 p;
    varying vec2 vUv;
    void main(){ vUv = p * 0.5 + 0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(p, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uImage;    // dark.png
    uniform sampler2D uImage2;   // lit.png
    uniform vec2 uScale;
    uniform vec2 uScale2;
    uniform vec2 uOffset;
    uniform float uZoom;
    uniform float uMix;          // 0 = dark, 1 = lit

    void main(){
      vec2 base = (vUv - 0.5) / uZoom;
      vec3 a = texture2D(uImage,  base * uScale  + 0.5 + uOffset).rgb;
      vec3 b = texture2D(uImage2, base * uScale2 + 0.5 + uOffset).rgb;
      gl_FragColor = vec4(mix(a, b, uMix), 1.0);
    }
  `;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  gl.useProgram(prog);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  ['uImage', 'uImage2', 'uScale', 'uScale2', 'uOffset', 'uZoom', 'uMix']
    .forEach(n => (U[n] = gl.getUniformLocation(prog, n)));
  gl.uniform1i(U.uImage, 0);
  gl.uniform1i(U.uImage2, 1);
  gl.uniform1f(U.uZoom, ZOOM);
  gl.uniform2f(U.uOffset, 0, 0);
  gl.uniform1f(U.uMix, 0);

  function makeTexture(unit) {
    const t = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    // 1x1 black placeholder until the real image arrives
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]));
    return t;
  }
  const tex = makeTexture(0);
  const tex2 = makeTexture(1);

  let aspect1 = 1, aspect2 = 1;
  let ready = false, litReady = false;

  function coverScale(aspect) {            // "object-fit: cover" as uv scale
    const sa = window.innerWidth / window.innerHeight;
    return sa > aspect ? [1, aspect / sa] : [sa / aspect, 1];
  }

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    const s1 = coverScale(aspect1), s2 = coverScale(aspect2);
    gl.uniform2f(U.uScale, s1[0], s1[1]);
    gl.uniform2f(U.uScale2, s2[0], s2[1]);
    sizeFlameCanvas();
  }

  function loadInto(unit, texture, src, done) {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, im);
      done(im.naturalWidth / im.naturalHeight);
      layout();
    };
    im.onerror = () => console.warn('1b.js: could not load ' + src);
    im.src = src;
  }
  loadInto(0, tex, IMAGE_SRC, a => { aspect1 = a; ready = true; });
  loadInto(1, tex2, LIT_SRC, a => { aspect2 = a; litReady = true; });

  // ===== flames (canvas on top of the image, under the text) ===============
  const flameCanvas = document.createElement('canvas');
  Object.assign(flameCanvas.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    zIndex: '1', pointerEvents: 'none', display: 'block',
  });
  canvas.after(flameCanvas);
  const fctx = flameCanvas.getContext('2d');
  let dpr = 1;

  function sizeFlameCanvas() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    flameCanvas.width = Math.round(window.innerWidth * dpr);
    flameCanvas.height = Math.round(window.innerHeight * dpr);
  }

  const rand = (a, b) => a + Math.random() * (b - a);
  const unit = () => Math.min(window.innerWidth, window.innerHeight);

  // soft glowing sprites, white-yellow (young) -> orange -> deep red (old)
  const STOPS = [[0, [255, 246, 210]], [0.3, [255, 176, 60]], [0.65, [232, 76, 18]], [1, [110, 18, 8]]];
  function flameColor(t) {
    for (let i = 1; i < STOPS.length; i++) {
      if (t <= STOPS[i][0]) {
        const [t0, c0] = STOPS[i - 1], [t1, c1] = STOPS[i];
        const k = (t - t0) / (t1 - t0);
        return c0.map((v, j) => Math.round(v + (c1[j] - v) * k));
      }
    }
    return STOPS[STOPS.length - 1][1];
  }
  const SPRITE_COUNT = 24;
  const sprites = [];
  for (let n = 0; n < SPRITE_COUNT; n++) {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d');
    const [r, gr, b] = flameColor(n / (SPRITE_COUNT - 1));
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, `rgba(${r},${gr},${b},1)`);
    grad.addColorStop(0.35, `rgba(${r},${gr},${b},0.55)`);
    grad.addColorStop(1, `rgba(${r},${gr},${b},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    sprites.push(c);
  }

  class Particle {
    constructor(origin) {
      const u = unit();
      this.u = u;
      this.x = origin.x + rand(-1, 1) * u * 0.012;
      this.y = origin.y;
      this.vx = rand(-1, 1) * u * 0.03;        // px / second
      this.vy = -rand(0.27, 0.62) * u;         // rises
      this.life = 0;
      this.maxLife = rand(0.42, 0.7);          // seconds
      this.size0 = u * rand(0.07, 0.11);
      this.phase = rand(0, Math.PI * 2);
    }
    update(dt) {
      this.life += dt;
      // gentle flicker sideways while rising
      this.x += this.vx * dt + Math.sin(this.life * 15 + this.phase) * this.u * 0.05 * dt;
      this.y += this.vy * dt;
    }
    isDead() { return this.life >= this.maxLife; }
    display(ctx) {
      const p = this.life / this.maxLife;      // 0 young -> 1 dead
      const size = this.size0 * (1 - 0.7 * p);
      ctx.globalAlpha = Math.pow(1 - p, 1.2) * 0.5;
      ctx.drawImage(sprites[Math.min(SPRITE_COUNT - 1, Math.floor(p * SPRITE_COUNT))],
        this.x - size / 2, this.y - size / 2, size, size);
    }
  }

  class ParticleSystem {
    constructor(origin) {
      this.origin = origin;
      this.particles = [];
      this.age = 0;
      this.carry = 0;
    }
    addParticle(dt) {                          // emits while the flame is still burning
      this.age += dt;
      if (this.age >= FLAME_SECONDS) return;
      const dying = FLAME_SECONDS - this.age;  // last 2s: dies down
      const strength = dying < 2 ? dying / 2 : 1;
      this.carry += FLAME_RATE * strength * dt;
      while (this.carry >= 1) { this.particles.push(new Particle(this.origin)); this.carry -= 1; }
    }
    display(ctx, dt) {
      for (const p of this.particles) { p.update(dt); p.display(ctx); }
      this.particles = this.particles.filter(p => !p.isDead());
    }
    isDone() { return this.age >= FLAME_SECONDS && this.particles.length === 0; }
  }

  let systems = [];
  let flamesEnabled = false;   // switched on when the last line appears
  let lighting = false;        // true once the centre has been pressed
  let litMix = 0;
  let litDone = false;         // true once the background is fully lit
  let onLitDone = () => {};    // the text sequence hooks in here

  // "mousePressed": pointerdown covers mouse and touch
  window.addEventListener('pointerdown', e => {
    if (!flamesEnabled) return;
    systems.push(new ParticleSystem({ x: e.clientX, y: e.clientY }));
    if (systems.length > MAX_FLAMES) systems.shift();

    const dx = e.clientX - window.innerWidth / 2;
    const dy = e.clientY - window.innerHeight / 2;
    if (Math.hypot(dx, dy) <= CENTER_RADIUS * unit()) lighting = true;
  });

  window.addEventListener('resize', layout);
  layout();

  // ===== mouse movement of the image ========================================
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

  // ===== audio: carries over from 1a ========================================
  const AUDIO_SRC = '1amix.mp3';
  const AUDIO_LOOP = true;          // keep playing until the page changes
  const AUDIO_FADE_IN_MS = 1400;    // fade-in when picking up from 1a
  const audio = new Audio(AUDIO_SRC);
  audio.loop = AUDIO_LOOP;
  audio.preload = 'auto';

  let audioStarted = false;
  let audioPending = false;
  let audioFading = false;

  // 1a.js leaves the music position in sessionStorage when it changes page
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem('bellAudio'));
    sessionStorage.removeItem('bellAudio');
  } catch (e) {}
  const carryOver = !!(saved && saved.playing);

  if (carryOver) {
    audio.volume = 0;               // starts silent, then fades up
    audio.addEventListener('loadedmetadata', () => {
      try { audio.currentTime = saved.t % (audio.duration || Infinity); } catch (e) {}
    });
  }

  function fadeInAudio(ms) {
    const t0 = performance.now();
    const timer = setInterval(() => {
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
      p.then(() => {
        audioStarted = true; audioPending = false;
        if (carryOver) fadeInAudio(AUDIO_FADE_IN_MS);
      })
       // Browsers can refuse sound before a click/tap/key press; if so,
       // just try again on the next movement or click.
       .catch(() => { audioPending = false; });
    } else {
      audioStarted = true; audioPending = false;
    }
  }

  window.addEventListener('mousemove', startAudio);
  window.addEventListener('touchmove', startAudio, { passive: true });
  window.addEventListener('click', startAudio);   // click always counts as a permission gesture
  if (carryOver) startAudio();                    // try straight away; retries on the next move/click

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

  // ===== draw loop ==========================================================
  let lastT = performance.now();
  let flamesDrawn = false;
  (function frame(now) {
    requestAnimationFrame(frame);
    now = now || performance.now();
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;

    // --- flames (this is the sketch's draw(): add a particle, then display) ---
    if (systems.length) {
      fctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      fctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      fctx.globalCompositeOperation = 'lighter';       // additive glow
      for (const s of systems) { s.addParticle(dt); s.display(fctx, dt); }
      fctx.globalAlpha = 1;
      systems = systems.filter(s => !s.isDone());
      flamesDrawn = true;
    } else if (flamesDrawn) {
      fctx.setTransform(1, 0, 0, 1, 0, 0);
      fctx.clearRect(0, 0, flameCanvas.width, flameCanvas.height);
      flamesDrawn = false;
    }

    // --- background ---
    if (!ready) return;

    // slow, eased fade dark.png -> lit.png
    if (lighting && litReady) litMix = Math.min(1, litMix + dt / LIT_FADE_S);
    if (litMix >= 1 && !litDone) { litDone = true; onLitDone(); }
    gl.uniform1f(U.uMix, litMix * litMix * (3 - 2 * litMix));

    // smooth, frame-rate independent easing toward the mouse
    const k = 1 - Math.exp(-EASE * dt);
    cur.x += (target.x - cur.x) * k;
    cur.y += (target.y - cur.y) * k;

    // shifting the sample point opposite to the mouse makes the image follow it
    const dir = INVERT ? 1 : -1;
    gl.uniform2f(U.uOffset, dir * cur.x * DISTANCE, dir * cur.y * DISTANCE);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  })(performance.now());

  // ===== text sequence (reactions only; the words live in 1b.html) ==========
  // Every element with class "line" is one screen of text, in page order.
  //  - Click / tap: fade the current line out, fade the next one in.
  //  - When the last line BEFORE the gate appears, flames switch on (press the mouse).
  //  - A line marked data-requires="lit" is the gate: clicks can't reach it. It comes in by
  //    itself once the background has fully faded to lit.png. Flames stop once the words begin,
  //    so clicking through the text doesn't light new ones.
  //  - Click after the very last line: fade out and go to data-next
  //    (if there is no data-next, the last line just stays on screen).
  const lines = Array.from(document.querySelectorAll('.line'));
  const holder = document.querySelector('[data-next]');
  const NEXT_PAGE = holder && holder.dataset.next;

  const gate = lines.findIndex(l => l.dataset.requires === 'lit');   // -1 = no gate
  const flameIndex = gate === -1 ? lines.length - 1 : gate - 1;      // flames switch on here

  if (!lines.length) flamesEnabled = true;

  if (lines.length) {
    // fade length comes from the CSS transition, so it's set in one place
    const fadeMs = (parseFloat(getComputedStyle(lines[0]).transitionDuration) || 1.4) * 1000;
    let index = 0;
    let busy = true;

    function show(i) {
      busy = true;
      lines[i].classList.add('is-visible');
      if (i === flameIndex) flamesEnabled = true;       // flames allowed
      if (gate !== -1 && i === gate) flamesEnabled = false;   // words begin: no more new flames
      setTimeout(() => { busy = false; checkGate(); }, fadeMs);
    }

    // fade the current line out, then show the next one (or leave the page)
    function step() {
      busy = true;
      const isLast = index === lines.length - 1;
      lines[index].classList.remove('is-visible');
      if (isLast) fadeOutAudio(fadeMs);                 // music fades with the last line
      setTimeout(() => {
        index++;
        if (index < lines.length) show(index);
        else {
          // remember where the music is so the next page can pick it up
          try {
            sessionStorage.setItem('bellAudio', JSON.stringify({ t: audio.currentTime, playing: audioStarted }));
          } catch (e) {}
          window.location.href = NEXT_PAGE;
        }
      }, fadeMs);
    }

    function advance() {                                // a click / tap
      if (busy) return;                                 // ignore clicks mid-fade
      if (index === lines.length - 1 && !NEXT_PAGE) return;   // nothing after the last line
      if (gate !== -1 && index + 1 === gate) return;    // waiting for the lit fade, not a click
      step();
    }

    // the gate line comes in on its own once the background is fully lit
    function checkGate() {
      if (gate !== -1 && litDone && !busy && index + 1 === gate) step();
    }
    onLitDone = checkGate;

    window.addEventListener('click', advance);
    setTimeout(() => show(0), 400);
  }
})();