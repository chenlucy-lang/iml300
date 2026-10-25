/**
 * mouse-move.js — shared full-screen image that moves up/down/left/right
 * with the mouse (or a finger on touch screens).
 *
 * Reference it from any HTML file:
 *
 *   <script src="mouse-move.js" data-image="bell.png"></script>
 *
 * Optional settings, all set on that same script tag:
 *   data-image     image to show                      (default "bell.png")
 *   data-distance  max travel each direction          (default 0.012)
 *   data-ease      how fast it catches the mouse      (default 25, higher = snappier)
 *   data-zoom      zoom so edges never show           (default 1.03, keep > 1 + distance*2)
 *   data-invert    "true" = move opposite the mouse   (default "false")
 *
 * Example:
 *   <script src="mouse-move.js" data-image="bells2.png" data-distance="0.02" data-zoom="1.06"></script>
 *
 * The canvas is fixed full-screen behind everything (z-index 0), so put page
 * content above it with z-index: 1 or higher.
 */
(() => {
  // ---- settings (read from the <script> tag that loaded this file) --------
  const me = document.currentScript;
  const opt = (name, fallback) => (me && me.dataset[name] !== undefined ? me.dataset[name] : fallback);

  const IMAGE_SRC = opt('image', 'bell.png');
  const DISTANCE = parseFloat(opt('distance', '0.012'));
  const EASE = parseFloat(opt('ease', '25'));
  const ZOOM = parseFloat(opt('zoom', '1.03'));
  const INVERT = opt('invert', 'false') === 'true';
  // -------------------------------------------------------------------------

  const canvas = document.createElement('canvas');
  Object.assign(canvas.style, {
    position: 'fixed', inset: '0', width: '100%', height: '100%',
    zIndex: '0', pointerEvents: 'none', display: 'block',
  });
  document.body.prepend(canvas);

  const gl = canvas.getContext('webgl', { antialias: false });
  if (!gl) { console.warn('mouse-move.js: WebGL not supported'); return; }

  const VERT = `
    attribute vec2 p;
    varying vec2 vUv;
    void main(){ vUv = p * 0.5 + 0.5; vUv.y = 1.0 - vUv.y; gl_Position = vec4(p, 0.0, 1.0); }
  `;

  const FRAG = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D uImage;
    uniform vec2 uScale;
    uniform vec2 uOffset;
    uniform float uZoom;

    void main(){
      vec2 iuv = ((vUv - 0.5) / uZoom) * uScale + 0.5;
      iuv += uOffset;
      gl_FragColor = vec4(texture2D(uImage, iuv).rgb, 1.0);
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
  ['uImage', 'uScale', 'uOffset', 'uZoom'].forEach(n => (U[n] = gl.getUniformLocation(prog, n)));
  gl.uniform1f(U.uZoom, ZOOM);
  gl.uniform2f(U.uOffset, 0, 0);

  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  let imgAspect = 1, ready = false;

  function layout() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
    // "object-fit: cover"
    const sa = window.innerWidth / window.innerHeight;
    gl.uniform2f(U.uScale, sa > imgAspect ? 1 : sa / imgAspect, sa > imgAspect ? imgAspect / sa : 1);
  }

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = () => {
    imgAspect = img.naturalWidth / img.naturalHeight;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
    ready = true;
    layout();
  };
  img.onerror = () => console.warn('mouse-move.js: could not load ' + IMAGE_SRC);
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

  let lastT = performance.now();
  (function frame(now) {
    requestAnimationFrame(frame);
    if (!ready) return;
    const dt = Math.min(0.05, ((now || performance.now()) - lastT) / 1000);
    lastT = now || performance.now();

    // smooth, frame-rate independent easing toward the mouse
    const k = 1 - Math.exp(-EASE * dt);
    cur.x += (target.x - cur.x) * k;
    cur.y += (target.y - cur.y) * k;

    // shifting the sample point opposite to the mouse makes the image follow it
    const dir = INVERT ? 1 : -1;
    gl.uniform2f(U.uOffset, dir * cur.x * DISTANCE, dir * cur.y * DISTANCE);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  })(performance.now());
})();