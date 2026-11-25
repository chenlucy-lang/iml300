(function () {
  /* ================= World map (ASCII, animated) ================= */
  // Simplified continent outlines as "lon lat lon lat ..." strings
  var LAND = [
    // North America
    "-168 66 -156 71 -141 70 -128 70 -115 68 -98 68 -95 72 -88 68 -82 69 -81 63 -93 61 -94 58 -90 57 -82 55 -79 52 -78 57 -77 62 -72 61 -65 60 -62 57 -56 52 -60 50 -66 50 -70 47 -65 48 -61 46 -66 44 -70 43 -70 41 -74 40 -76 38 -76 35 -81 31 -80 27 -80 25 -82 26 -83 29 -85 30 -89 30 -90 29 -94 29 -97 27 -97 24 -97 21 -95 18 -91 19 -90 21 -87 21 -88 16 -84 16 -83 11 -81 9 -79 9 -77 8 -78 7 -80 7 -83 8 -86 11 -88 13 -91 14 -94 16 -98 16 -103 18 -105 21 -105 23 -108 25 -111 28 -113 30 -115 32 -113 29 -111 25 -109 23 -111 23 -113 25 -115 28 -116 30 -117 32 -120 34 -122 37 -124 40 -124 46 -124 48 -123 49 -127 51 -130 55 -134 58 -138 59 -144 60 -150 59 -152 58 -157 57 -162 55 -158 58 -162 60 -165 61 -166 63 -161 64 -168 65",
    // Greenland, Baffin, Victoria, Cuba
    "-73 78 -60 82 -30 83 -20 80 -19 76 -22 70 -30 68 -40 65 -43 60 -50 62 -54 67 -58 75 -68 76",
    "-80 73 -72 71 -62 66 -65 63 -72 64 -78 65 -88 70",
    "-118 72 -105 73 -101 69 -115 69",
    "-85 22 -80 23 -74 20 -77 20 -82 22",
    // South America
    "-77 8 -75 11 -71 11 -68 10 -62 10 -60 8 -57 6 -52 5 -50 1 -48 -1 -44 -2 -39 -3 -35 -5 -35 -9 -37 -12 -39 -16 -40 -20 -43 -23 -48 -25 -48 -28 -52 -32 -54 -34 -57 -35 -57 -38 -62 -39 -65 -41 -64 -43 -67 -46 -66 -48 -69 -51 -68 -53 -65 -55 -71 -55 -74 -52 -75 -47 -74 -42 -73 -37 -71 -31 -70 -25 -70 -18 -76 -14 -78 -9 -81 -5 -80 -2 -80 0 -78 2 -77 4 -77 7",
    // Eurasia
    "-9 37 -9 43 -2 43 -1 46 -4 48 -1 48 1 50 4 51 8 53 8 57 10 57 10 55 12 54 19 54 21 57 24 57 23 59 29 60 22 60 21 63 25 65 22 66 17 62 17 60 18 59 16 56 13 55 11 58 8 58 5 59 5 62 10 64 14 67 19 70 26 71 31 70 40 67 41 66 34 66 33 64 38 64 44 66 44 68 53 68 60 69 68 69 67 71 73 72 80 73 87 75 100 77 104 77 113 74 130 71 140 72 150 71 160 69 170 70 180 69 180 65 178 64 172 64 177 62 170 60 164 60 162 56 156 51 156 57 163 62 154 59 143 59 136 54 141 53 141 48 138 46 133 42 130 42 129 40 127 39 129 36 129 35 126 34 126 37 125 38 125 39 121 39 122 40 119 39 118 38 119 37 122 37 120 35 121 32 122 30 121 28 119 25 117 23 114 22 110 21 108 21 106 19 108 15 109 12 105 9 104 10 101 13 100 12 99 10 100 7 102 5 104 1 102 2 100 4 98 8 98 11 98 16 97 17 94 16 94 19 92 21 91 22 89 21 86 20 84 18 82 16 80 15 80 11 79 9 77 8 76 9 75 12 73 16 72 21 70 21 68 23 66 25 61 25 57 25 56 27 54 26 51 28 48 30 50 27 51 24 54 24 56 26 57 24 59 22 58 20 55 17 52 16 45 13 43 13 42 16 39 21 35 28 34 29 34 31 35 33 36 35 34 36 30 36 27 37 26 39 29 41 31 41 35 42 38 41 41 41 40 43 37 45 35 45 33 44 32 46 30 45 29 44 28 43 28 41 26 40 24 40 23 40 24 38 22 36 21 38 19 41 18 42 15 45 13 45 12 44 16 41 18 40 16 38 15 38 16 39 15 40 12 41 10 43 8 44 6 43 3 43 3 42 0 40 0 38 -1 37 -2 36 -4 36 -6 36 -7 37",
    // Africa + Madagascar
    "-5 36 -2 35 3 36 10 37 11 35 10 33 15 32 19 30 20 32 23 32 29 31 32 31 34 29 32 30 33 27 35 24 37 21 38 18 39 15 41 13 43 12 44 10 48 11 51 12 51 10 48 5 44 1 41 -2 39 -5 39 -9 40 -15 35 -20 35 -24 32 -26 32 -29 30 -31 27 -33 22 -34 18 -34 17 -30 15 -26 14 -22 11 -17 13 -12 12 -6 9 -1 9 3 8 4 5 6 1 6 -2 4 -7 4 -12 7 -14 10 -17 14 -16 19 -16 23 -13 27 -10 29 -9 31 -8 33 -6 35",
    "49 -12 50 -15 47 -25 44 -24 43 -21 44 -16",
    // Australia, Tasmania, New Zealand
    "113 -22 114 -26 115 -34 118 -35 123 -34 129 -31 131 -31 135 -34 138 -35 140 -38 144 -38 147 -38 150 -37 153 -31 153 -28 152 -25 149 -21 146 -18 145 -15 143 -14 142 -11 141 -13 141 -17 139 -17 136 -15 137 -12 133 -11 131 -12 129 -15 126 -14 123 -17 122 -18 118 -20",
    "145 -41 148 -41 147 -43 145 -42",
    "172 -34 178 -37 177 -39 175 -41 174 -39 173 -35",
    "172 -40 174 -41 171 -44 169 -46 166 -46 168 -44 171 -41",
    // Japan, Sakhalin
    "130 34 135 34 139 34 140 35 141 38 141 41 140 40 139 38 137 37 136 36 133 35 131 34",
    "140 42 141 45 145 43 143 42",
    "129 33 131 33 132 31 130 31",
    "142 46 143 49 143 54 142 53 142 50",
    // UK, Ireland, Iceland
    "-5 50 1 51 1 52 0 53 -2 55 -2 57 -4 58 -5 58 -6 56 -5 55 -3 54 -3 53 -4 52 -5 51",
    "-10 51 -6 52 -6 54 -8 55 -10 54",
    "-24 65 -22 66 -15 66 -13 65 -18 63 -22 63",
    // Southeast Asia islands
    "109 1 111 2 113 3 115 5 117 7 119 5 117 1 116 -4 114 -4 110 -3 109 -1",
    "95 5 98 4 104 -1 106 -3 105 -6 102 -4 98 0",
    "105 -7 108 -6 114 -8 114 -9 108 -8 106 -7",
    "119 -3 120 0 121 1 125 1 121 -1 123 -4 121 -3 120 -5",
    "131 -1 135 -3 138 -2 141 -3 145 -4 147 -6 150 -10 147 -10 143 -8 141 -9 138 -8 138 -5 134 -3",
    "120 18 122 18 122 16 124 14 122 13 120 14 120 16",
    "122 7 126 8 126 6 124 7",
    "80 9 82 7 81 6 80 6"
  ];
  var TAIWAN  = "120.1 23 120.4 22.2 121 22 121.6 23.5 122 25 121 25.3 120.2 24";
  var CASPIAN = "47 45 50 46 53 45 53 41 54 37 50 37 49 40 47 42";

  var S = 2;                    // mask resolution: pixels per degree
  var MW = 360 * S, MH = 180 * S;
  var LAT0 = 5;                 // latitude shown at the vertical center of the screen
  var RAMP = '.:-=+*#%@';
  var RED = '#ff2a2a';

  function parse(s) {
    var a = s.trim().split(/\s+/).map(Number), p = [];
    for (var i = 0; i < a.length; i += 2) p.push([a[i], a[i + 1]]);
    return p;
  }
  function trace(g, p) {
    g.beginPath();
    p.forEach(function (q, i) {
      var x = (q[0] + 180) * S, y = (90 - q[1]) * S;
      if (i) g.lineTo(x, y); else g.moveTo(x, y);
    });
    g.closePath();
  }
  function makeMask(polys, cut) {
    var c = document.createElement('canvas');
    c.width = MW; c.height = MH;
    var g = c.getContext('2d');
    g.fillStyle = g.strokeStyle = '#000';
    g.lineWidth = S * 0.8;
    g.lineJoin = 'round';
    polys.forEach(function (p) { trace(g, p); g.fill(); g.stroke(); });
    if (cut) {
      g.globalCompositeOperation = 'destination-out';
      trace(g, cut); g.fill(); g.stroke();
    }
    return g.getImageData(0, 0, MW, MH).data;
  }

  var landData = makeMask(LAND.map(parse).concat([parse(TAIWAN)]), parse(CASPIAN));
  var twData = makeMask([parse(TAIWAN)]);

  function hit(data, lon, lat) {
    var x = Math.floor((lon + 180) * S), y = Math.floor((90 - lat) * S);
    if (x < 0 || y < 0 || x >= MW || y >= MH) return false;
    return data[(y * MW + x) * 4 + 3] > 60;
  }
  function hash(a, b, c) {
    var x = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
    return x - Math.floor(x);
  }

  var canvas = document.getElementById('bg');
  // Pin the canvas above the black page background but under all content (z-index 2)
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  var ctx = canvas.getContext('2d');
  var W, H, cw, ch, cols, font, boldFont, cLand, cOcean, tcx, tcy;
  var land = [], ocean = [], tw = [];

  function readColors() {
    var cs = getComputedStyle(document.documentElement);
    cLand = cs.getPropertyValue('--muted').trim() || '#a8a8a8';
    cOcean = cs.getPropertyValue('--ascii').trim() || '#7a7a7a';
  }

  function setup() {
    var dpr = window.devicePixelRatio || 1;
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cw = W < 700 ? 6 : 8;
    ch = Math.round(cw * 1.4);
    cols = Math.ceil(W / cw);
    var rows = Math.ceil(H / ch);
    font = Math.round(cw * 1.4) + 'px ui-monospace,Menlo,Consolas,monospace';
    boldFont = 'bold ' + Math.round(cw * 2.2) + 'px ui-monospace,Menlo,Consolas,monospace';

    var pd = W / 360; // pixels per degree
    var ti = Math.floor((W / 2 + 121 * pd) / cw);
    var tj = Math.floor((H / 2 + (LAT0 - 23.7) * pd) / ch);
    tcx = (ti + 0.5) * cw; tcy = (tj + 0.5) * ch;

    land = []; ocean = []; tw = [];
    for (var j = 0; j < rows; j++) {
      for (var i = 0; i < cols; i++) {
        var x = (i + 0.5) * cw, y = (j + 0.5) * ch;
        var lon = (x - W / 2) / pd, lat = LAT0 - (y - H / 2) / pd;
        var cell = { x: x, y: y, i: i, j: j };

        var isCenter = (i === ti && j === tj);
        var nearTw = isCenter;
        for (var a = -1; a <= 1 && !nearTw; a++) {
          for (var b = -1; b <= 1 && !nearTw; b++) {
            if (hit(twData, lon + a * 0.33 * cw / pd, lat - b * 0.33 * ch / pd)) nearTw = true;
          }
        }

        if (isCenter) tw.push(cell);          // the one red @
        else if (nearTw) { /* leave Taiwan's other cells empty */ }
        else if (hit(landData, lon, lat)) land.push(cell);
        else if (i % 2 === 0 && j % 2 === 0) ocean.push(cell);
      }
    }
  }

  function draw(t) {
    var k, c, v, b, n, lvl, r;
    ctx.clearRect(0, 0, W, H);
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // ocean: faint dots with random glints
    ctx.fillStyle = cOcean;
    for (k = 0; k < ocean.length; k++) {
      c = ocean[k];
      r = hash(c.i, c.j, Math.floor(t * 2));
      ctx.globalAlpha = r > 0.985 ? 0.9 : 0.4;
      ctx.fillText(r > 0.985 ? '+' : '.', c.x, c.y);
    }

    // land: shimmering characters + a sweeping scan band
    var sweep = ((t * 0.1) % 1.3 - 0.15) * cols;
    ctx.fillStyle = cLand;
    for (k = 0; k < land.length; k++) {
      c = land[k];
      v = 0.5 + 0.5 * Math.sin(c.i * 0.22 + c.j * 0.17 + t * 1.4);
      b = Math.max(0, 1 - Math.abs(c.i - sweep) / 7);
      n = hash(c.i, c.j, Math.floor(t * 6));
      lvl = Math.min(1, Math.max(0, v * 0.55 + b * 0.9 + (n > 0.93 ? 0.5 : 0) + 0.1));
      ctx.globalAlpha = 0.3 + 0.7 * lvl;
      ctx.fillText(RAMP[Math.floor(lvl * (RAMP.length - 1))], c.x, c.y);
    }

    // Taiwan: a single red @, pulsing
    ctx.font = boldFont;
    ctx.fillStyle = RED;
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(t * 3);
    for (k = 0; k < tw.length; k++) ctx.fillText('@', tw[k].x, tw[k].y);

    // radar rings from Taiwan
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1.5;
    for (k = 0; k < 2; k++) {
      var age = ((t * 0.5) + k * 0.5) % 1;
      ctx.globalAlpha = (1 - age) * 0.8;
      ctx.beginPath();
      ctx.arc(tcx, tcy, 6 + age * 70, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var last = 0;
  function loop(now) {
    if (now - last >= 33) { last = now; draw(now / 1000); } // ~30 fps
    requestAnimationFrame(loop);
  }

  readColors(); setup();
  if (reduce) draw(0); else requestAnimationFrame(loop);

  var resizeTimer;
  addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { setup(); if (reduce) draw(0); }, 100);
  });

  /* ================= Tilt + glare on the card ================= */
  var card = document.querySelector('.card');
  if (!reduce) {
    var max = 8; // max tilt in degrees

    card.addEventListener('pointermove', function (e) {
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width;
      var py = (e.clientY - r.top) / r.height;
      card.classList.add('active');
      card.style.setProperty('--mx', (px * 100) + '%');
      card.style.setProperty('--my', (py * 100) + '%');
      card.style.transform =
        'perspective(900px) rotateX(' + ((0.5 - py) * max * 2) + 'deg) ' +
        'rotateY(' + ((px - 0.5) * max * 2) + 'deg) scale(1.02)';
    });

    function reset() {
      card.classList.remove('active');
      card.style.transform = '';
    }
    card.addEventListener('pointerleave', reset);
    card.addEventListener('pointercancel', reset);
  }

  /* ================= Moving gray boxes ================= */
  var track = document.getElementById('track');
  var html = '';
  for (var i = 0; i < 24; i++) html += '<div class="box"></div>';
  track.innerHTML = html;
})();