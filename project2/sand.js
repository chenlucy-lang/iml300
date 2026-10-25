/* sand.js: a sheer plume of sand that blows from your cursor in the direction you drag.
   The effect lives inside the poster frame, so it never draws outside Title.png.
   Press and hold, then drag: sand streams out of the cursor along your drag direction,
   curving as you change direction. Release and it settles/fades. Pressing without
   dragging blows it in the last drag direction (right, to start).
   The canvas ignores the mouse, so buttons still work.
   sand.mp3 plays (looping) while you hold the mouse down on the poster, and fades out on release.
   pour.mp3 plays (looping) while you are actually dragging, and fades out when you stop moving. */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  // ---- Tweak these ----
  const SPAWN_RATE = 1800;   // grains per second (higher = denser plume)
  const MAX_GRAINS = 2500;
  const SPREAD = 0.16;       // plume width in radians (smaller = tighter beam)
  const NOZZLE = 12;         // px, how wide the plume is at the cursor
  const SPEED_MIN = 600;     // px per second
  const SPEED_MAX = 1500;
  const LIFE_MIN = 0.7;      // seconds a grain lasts (controls plume length)
  const LIFE_MAX = 1.5;
  const TURN = 0.35;         // 0-1, how quickly the wind follows your drag direction
  const HAZE = 1;            // 0 = grains only, 1 = default, 2 = thicker veil
  const COLORS = ['232,201,143', '217,178,122', '242,220,174']; // sand tones
  const AUDIO_SRC = 'sand.mp3';
  const VOLUME = 0.8;        // 0-1
  const FADE_IN = 0.15;      // seconds
  const FADE_OUT = 0.4;      // seconds
  const POUR_SRC = 'pour.mp3';
  const POUR_VOLUME = 0.8;   // 0-1
  const DRAG_HOLD = 150;     // ms you can stay still before the pour sound counts as "stopped dragging"
  // ---------------------

  const TAU = Math.PI * 2;
  const rand = (a, b) => a + Math.random() * (b - a);

  // The canvas sits inside the poster frame (same exact size and shape as Title.png).
  // The poster frame has overflow: hidden, so nothing can show outside the poster.
  const poster = document.querySelector('.frame');
  if (!poster) return;

  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'absolute', inset: '0', width: '100%', height: '100%',
    pointerEvents: 'none', zIndex: '6',
  });
  poster.appendChild(canvas);
  document.body.style.touchAction = 'none'; // lets touch drags work too
  const ctx = canvas.getContext('2d');

  let W = 0, H = 0;   // poster size in px; all coordinates below are relative to the poster
  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = poster.clientWidth;
    H = poster.clientHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  addEventListener('resize', resize);
  if (window.ResizeObserver) new ResizeObserver(resize).observe(poster);

  // Pointer position relative to the poster's top-left corner
  function local(e) {
    const r = poster.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  const isInside = () => pos.x >= 0 && pos.x <= W && pos.y >= 0 && pos.y <= H;

  const grains = [];
  const puffs = [];            // big, very faint soft clouds that make it sheer
  const pos = { x: W / 2, y: H / 2 };
  const dir = { x: 1, y: 0 };  // current wind direction (unit vector)
  let drag = 0;                // 0-1, how fast you are dragging
  let pressed = false;
  let ramp = 0;
  let lastMoveT = 0;
  let lastDragT = -1e9;        // last time the mouse actually moved while pressed
  let last = 0;
  let spawnAcc = 0;
  let puffAcc = 0;
  let raf = null;

  // ---- Sounds ----
  // makeSound returns a function: call it with true to fade the sound in, false to fade it out.
  function makeSound(src, volume, fadeIn, fadeOut) {
    const el = new Audio(src);
    el.loop = true;
    el.preload = 'auto';
    el.volume = 0;
    // If the file can't be found or decoded, say exactly which URL failed
    el.addEventListener('error', () =>
      console.warn(`sand.js: could not load ${el.src}. Open that address in a tab: if it isn't your audio, the file name or folder is wrong.`));

    let fadeRaf = null;
    let on = false;

    function fadeTo(target, secs, then) {
      cancelAnimationFrame(fadeRaf);
      const from = el.volume;
      const t0 = performance.now();
      const step = (now) => {
        const k = Math.min(1, (now - t0) / (secs * 1000));
        el.volume = from + (target - from) * k;
        if (k < 1) fadeRaf = requestAnimationFrame(step);
        else if (then) then();
      };
      fadeRaf = requestAnimationFrame(step);
    }

    return function set(want) {
      if (want === on) return;
      on = want;
      if (want) {
        if (el.paused) el.currentTime = 0;
        el.play().catch((err) =>             // a missing file is also reported by the error listener above
          console.warn(`sand.js: ${src} would not play (${err.name}: ${err.message})`));
        fadeTo(volume, fadeIn);
      } else {
        fadeTo(0, fadeOut, () => { if (!on) el.pause(); });
      }
    };
  }

  const setSand = makeSound(AUDIO_SRC, VOLUME, FADE_IN, FADE_OUT);
  const setPour = makeSound(POUR_SRC, POUR_VOLUME, 0.1, 0.25);

  function updateSound() {
    const onPoster = pressed && isInside();  // same rule as the sand itself
    setSand(onPoster);                                                       // holding the mouse down
    setPour(onPoster && performance.now() - lastDragT < DRAG_HOLD);          // actually dragging
  }

  function emitGrain() {
    if (grains.length >= MAX_GRAINS) return;
    const ang = Math.atan2(dir.y, dir.x) + (Math.random() + Math.random() - 1) * SPREAD;
    const sp = rand(SPEED_MIN, SPEED_MAX) * (0.75 + 0.5 * drag);
    const c = Math.cos(ang), s = Math.sin(ang);
    const off = rand(-1, 1) * NOZZLE;
    const along = rand(0, 24);
    grains.push({
      x: pos.x - s * off + c * along,
      y: pos.y + c * off + s * along,
      vx: c * sp, vy: s * sp,
      nx: -s, ny: c,                              // sideways, for the wobble
      size: rand(0.6, 2.2),
      a: rand(0.2, 0.7),
      amp: rand(6, 30), f: rand(1, 4), ph: rand(0, TAU),
      t: 0, life: rand(LIFE_MIN, LIFE_MAX),
      color: COLORS[(Math.random() * COLORS.length) | 0],
    });
  }

  function emitPuff() {
    if (puffs.length >= 80) return;
    const ang = Math.atan2(dir.y, dir.x) + (Math.random() * 2 - 1) * 0.25;
    const sp = rand(120, 320) * (0.8 + 0.6 * drag);
    const along = rand(0, 50), side = rand(-10, 10);
    puffs.push({
      x: pos.x + dir.x * along - dir.y * side,
      y: pos.y + dir.y * along + dir.x * side,
      vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp,
      r0: rand(25, 45), r1: rand(70, 130),
      t: 0, life: rand(0.9, 1.5),
    });
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    updateSound();                                 // lets the pour sound stop when you hold still
    ramp = pressed ? Math.min(1, ramp + dt / 0.15) : 0;
    drag *= Math.exp(-dt * 3);                     // eases off when you stop moving

    if (pressed && isInside()) {
      spawnAcc += SPAWN_RATE * ramp * (0.7 + 0.6 * drag) * dt;
      while (spawnAcc >= 1) { emitGrain(); spawnAcc -= 1; }
      if (HAZE > 0) {
        puffAcc += 28 * ramp * dt;
        while (puffAcc >= 1) { emitPuff(); puffAcc -= 1; }
      }
    }

    ctx.clearRect(0, 0, W, H);

    // Soft sheer clouds
    for (let i = puffs.length - 1; i >= 0; i--) {
      const p = puffs[i];
      p.t += dt;
      if (p.t >= p.life) { puffs.splice(i, 1); continue; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const k = p.t / p.life;
      const r = p.r0 + (p.r1 - p.r0) * k;
      const a = 0.07 * HAZE * Math.sin(Math.PI * k);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      g.addColorStop(0, `rgba(${COLORS[0]},${a})`);
      g.addColorStop(1, `rgba(${COLORS[0]},0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, TAU);
      ctx.fill();
    }

    // Grains, drawn as short streaks along their direction of travel
    ctx.lineCap = 'butt';
    for (let i = grains.length - 1; i >= 0; i--) {
      const p = grains[i];
      p.t += dt;
      if (p.t >= p.life) { grains.splice(i, 1); continue; }

      const wob = Math.sin(p.t * p.f + p.ph) * p.amp;
      p.x += (p.vx + p.nx * wob) * dt;
      p.y += (p.vy + p.ny * wob) * dt;

      if (p.x < -30 || p.x > W + 30 || p.y < -30 || p.y > H + 30) {
        grains.splice(i, 1);
        continue;
      }
      const k = p.t / p.life;
      const alpha = p.a * (1 - k) * Math.min(1, k * 10);
      ctx.strokeStyle = `rgba(${p.color},${alpha})`;
      ctx.lineWidth = p.size;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - p.vx * 0.012, p.y - p.vy * 0.012);
      ctx.stroke();
    }

    if (!pressed && grains.length === 0 && puffs.length === 0) {
      ctx.clearRect(0, 0, W, H);
      raf = null;
      return;
    }
    raf = requestAnimationFrame(frame);
  }

  // Mouse pressed: start the sand and the sound
  function mousePressed(e) {
    const m = local(e);
    pos.x = m.x;
    pos.y = m.y;
    lastMoveT = performance.now();
    pressed = true;
    updateSound();
    if (isInside()) for (let i = 0; i < 150; i++) emitGrain();  // instant first puff
    if (raf === null) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  // Mouse moved: steer the wind while pressed, and stop/resume the sound at the poster edge
  function mouseMoved(e) {
    const now = performance.now();
    const m = local(e);
    if (pressed) {
      const dx = m.x - pos.x;
      const dy = m.y - pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 1.5) {
        // Turn the wind toward the drag direction
        dir.x += (dx / dist - dir.x) * TURN;
        dir.y += (dy / dist - dir.y) * TURN;
        const m = Math.hypot(dir.x, dir.y) || 1;
        dir.x /= m;
        dir.y /= m;
        // Faster drags blow harder
        const secs = Math.max(now - lastMoveT, 1) / 1000;
        const target = Math.min(1, dist / secs / 1500);
        drag += (target - drag) * 0.3;
        lastDragT = now;                     // you are dragging right now
      }
    }
    pos.x = m.x;
    pos.y = m.y;
    lastMoveT = now;
    updateSound();                           // stops if you drag off the poster, resumes if you return
  }

  // Mouse released: stop the sand and fade out the sound
  function mouseReleased() {
    pressed = false;
    updateSound();
  }

  addEventListener('pointerdown', mousePressed);
  addEventListener('pointermove', mouseMoved);
  addEventListener('pointerup', mouseReleased);
  addEventListener('pointercancel', mouseReleased);
  addEventListener('blur', mouseReleased);
})();