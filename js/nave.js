/* Dibujo de la nave (escenario). La parte que no se mueve se dibuja una vez y se guarda en una imagen
   (más fluido en los móviles); encima se dibujan cada vez las partes animadas y las estaciones. */
(function (root) {
  var MAP = root.NAVE_MAP;
  var OUT = '#1a1a2e';
  var PAD = 420;

  // ---------- utilidades ----------
  function rr(c, x, y, w, h, r, keep) {
    if (!keep) c.beginPath();
    r = Math.min(r, w / 2, h / 2);
    c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath();
  }
  function circ(c, x, y, r, fill, lw) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); if (fill) { c.fillStyle = fill; c.fill(); } if (lw) { c.lineWidth = lw; c.strokeStyle = OUT; c.stroke(); } }
  function shadow(c, x, y, w, h, r) { c.fillStyle = 'rgba(0,0,0,0.3)'; rr(c, x + 3, y + 5, w, h, r || 3); c.fill(); }
  function box(c, x, y, w, h, fill, r, opt) {
    opt = opt || {};
    if (!opt.flat && w * h >= 500) shadow(c, x, y, w, h, r);
    c.fillStyle = fill; rr(c, x, y, w, h, r || 3); c.fill();
    if (!opt.flat) { c.lineWidth = opt.lw || 1.8; c.strokeStyle = OUT; c.stroke(); }
  }
  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16), r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; } else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  function unionPath(c, grow, rad, top) {
    c.beginPath();
    MAP.rects.forEach(function (r) { var tg = top || grow; rr(c, r.x - grow, r.y - tg, r.w + grow * 2, r.h + grow + tg, rad, true); });
  }
  function isHoriz(r) { return MAP.rooms.indexOf(r) >= 0 || r.w >= r.h; }
  function R(id) { return MAP.room(id); }
  function rand(i) { var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); }

  // ---------- FONDO: espacio, nebulosa, planeta ----------
  function background(c) {
    c.fillStyle = '#070a1c'; c.fillRect(-PAD, -PAD, MAP.w + PAD * 2, MAP.h + PAD * 2);
    [[200, -150, 520, 'rgba(140,60,200,0.20)'], [1350, 950, 600, 'rgba(40,120,220,0.20)'], [-150, 700, 450, 'rgba(220,70,140,0.14)'], [1750, 150, 420, 'rgba(60,200,180,0.12)']].forEach(function (n) {
      var g = c.createRadialGradient(n[0], n[1], 10, n[0], n[1], n[2]); g.addColorStop(0, n[3]); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = g; c.fillRect(-PAD, -PAD, MAP.w + PAD * 2, MAP.h + PAD * 2);
    });
    for (var i = 0; i < 700; i++) {
      var x = -PAD + rand(i) * (MAP.w + PAD * 2), y = -PAD + rand(i + 999) * (MAP.h + PAD * 2), s = 0.6 + rand(i + 77) * 2;
      c.fillStyle = rand(i + 5) > 0.85 ? '#ffe9b0' : (rand(i + 6) > 0.8 ? '#b0d4ff' : '#ffffff');
      c.globalAlpha = 0.35 + rand(i + 3) * 0.65; c.fillRect(x, y, s, s);
    }
    c.globalAlpha = 1;
    // planeta con anillos
    var px = MAP.w + 230, py = -140, pr = 170;
    var pg = c.createRadialGradient(px - 60, py - 60, 20, px, py, pr);
    pg.addColorStop(0, '#ffb36b'); pg.addColorStop(0.6, '#d0603f'); pg.addColorStop(1, '#4a1a2a');
    circ(c, px, py, pr, pg);
    c.save(); c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.clip();
    for (var b = -4; b < 5; b++) { c.fillStyle = b % 2 ? 'rgba(255,220,180,0.12)' : 'rgba(80,20,30,0.12)'; c.fillRect(px - pr, py + b * 30, pr * 2, 14); }
    c.restore();
    c.save(); c.translate(px, py); c.rotate(-0.35);
    c.strokeStyle = 'rgba(255,220,170,0.55)'; c.lineWidth = 10; c.beginPath(); c.ellipse(0, 0, pr * 1.7, pr * 0.32, 0, 0.15, Math.PI - 0.15); c.stroke();
    c.restore();
    // luna
    var mg = c.createRadialGradient(-230, MAP.h + 60, 5, -220, MAP.h + 70, 75);
    mg.addColorStop(0, '#e8ecf8'); mg.addColorStop(1, '#6a7090');
    circ(c, -220, MAP.h + 70, 75, mg);
    [[-240, MAP.h + 50, 12], [-195, MAP.h + 90, 9], [-230, MAP.h + 105, 7]].forEach(function (k) { circ(c, k[0], k[1], k[2], 'rgba(80,86,120,0.4)'); });
  }

  // ---------- EXTERIOR: casco, alas, toberas ----------
  function exteriorStatic(c) {
    var rear = R('reactor'), br = R('bridge');
    c.lineJoin = 'round';
    [rear.y + 50, rear.y + rear.h - 50].forEach(function (cy) {
      c.fillStyle = '#39406a';
      c.beginPath(); c.moveTo(rear.x - 24, cy - 28); c.lineTo(rear.x - 48, cy - 22); c.lineTo(rear.x - 48, cy + 22); c.lineTo(rear.x - 24, cy + 28); c.closePath(); c.fill();
      c.strokeStyle = OUT; c.lineWidth = 3; c.stroke();
    });
    c.fillStyle = '#28305c'; c.strokeStyle = OUT; c.lineWidth = 4;
    var cy2 = br.y + br.h / 2, nx = br.x + br.w + 30;
    c.beginPath(); c.moveTo(nx, br.y - 10); c.quadraticCurveTo(nx + 85, cy2, nx, br.y + br.h + 10); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#7fd8ff'; c.beginPath(); c.moveTo(nx + 6, cy2 - 40); c.quadraticCurveTo(nx + 50, cy2, nx + 6, cy2 + 40); c.closePath(); c.fill(); c.stroke();
    // alas con franjas
    [[[250, 340], [160, 240], [330, 240], [385, 300]], [[250, 560], [140, 660], [250, 700], [295, 620]], [[900, 840], [930, 910], [1020, 910], [990, 840]]].forEach(function (w) {
      c.fillStyle = '#242c55'; c.beginPath(); c.moveTo(w[0][0], w[0][1]); for (var i = 1; i < 4; i++) c.lineTo(w[i][0], w[i][1]); c.closePath(); c.fill(); c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
      c.strokeStyle = '#e5484d'; c.lineWidth = 3; c.beginPath(); c.moveTo((w[0][0] + w[1][0]) / 2, (w[0][1] + w[1][1]) / 2); c.lineTo((w[3][0] + w[2][0]) / 2, (w[3][1] + w[2][1]) / 2); c.stroke();
    });
    var cafe = R('cafe');
    c.strokeStyle = OUT; c.lineWidth = 4; c.beginPath(); c.moveTo(cafe.x + 230, cafe.y - 40); c.lineTo(cafe.x + 246, cafe.y - 76); c.stroke();
    c.strokeStyle = '#8a94c8'; c.lineWidth = 2; c.stroke();
    // casco con planchas
    c.fillStyle = '#1b2244'; unionPath(c, 34, 26, 48); c.fill();
    c.save(); unionPath(c, 34, 26, 48); c.clip();
    c.strokeStyle = 'rgba(140,160,240,0.1)'; c.lineWidth = 2;
    for (var px = -100; px < MAP.w + 100; px += 60) { c.beginPath(); c.moveTo(px, -100); c.lineTo(px, MAP.h + 100); c.stroke(); }
    for (var py = -100; py < MAP.h + 100; py += 45) { c.beginPath(); c.moveTo(-100, py); c.lineTo(MAP.w + 100, py); c.stroke(); }
    c.fillStyle = 'rgba(160,180,255,0.18)';
    for (px = -100; px < MAP.w + 100; px += 60) for (py = -100; py < MAP.h + 100; py += 45) c.fillRect(px + 4, py + 4, 2, 2);
    c.restore();
    unionPath(c, 34, 26, 48); c.strokeStyle = OUT; c.lineWidth = 6; c.stroke();
    c.strokeStyle = '#5a66a8'; c.lineWidth = 2.5; c.stroke();
    // ojos de buey en el casco
    [[cafe.x + 50, cafe.y - 22], [cafe.x + 130, cafe.y - 22], [cafe.x + 210, cafe.y - 22], [600, 728], [700, 728], [980, 728], [1080, 728], [330, 728], [420, 728], [1290, 708], [1350, 708], [470, 52], [1290, 52]].forEach(function (p) {
      circ(c, p[0], p[1], 9, '#0a1030', 2.5);
      circ(c, p[0], p[1], 6, 'rgba(120,180,255,0.35)');
      circ(c, p[0] - 2, p[1] - 2, 2.5, 'rgba(255,255,255,0.7)');
    });
  }
  function exteriorAnim(c, t) {
    var rear = R('reactor'), cafe = R('cafe');
    [rear.y + 50, rear.y + rear.h - 50].forEach(function (cy, k) {
      var f = 1 + 0.18 * Math.sin(t * 22 + k * 2), x0 = rear.x - 48;
      var g = c.createLinearGradient(x0, 0, x0 - 85 * f, 0);
      g.addColorStop(0, 'rgba(200,240,255,0.95)'); g.addColorStop(0.25, 'rgba(255,220,120,0.9)'); g.addColorStop(0.6, 'rgba(255,110,40,0.7)'); g.addColorStop(1, 'rgba(255,60,20,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(x0, cy - 20); c.quadraticCurveTo(x0 - 100 * f, cy, x0, cy + 20); c.fill();
    });
    circ(c, cafe.x + 246, cafe.y - 78, 5, Math.sin(t * 3) > 0 ? '#ff5050' : '#702020', 1.5);
  }

  // ---------- PAREDES con frente, carteles y ventanas ----------
  function walls(c, tr, sk) {
    var W = (sk && sk.wall) || {};
    var TH = (sk && sk.theme) || THEME;
    c.fillStyle = W.base || '#2a3156'; unionPath(c, 12, 10, 12); c.fill();
    var F = MAP.wallFace;
    MAP.rects.forEach(function (r) {
      if (!isHoriz(r)) return;
      MAP.topWalls(r).forEach(function (sg, si) {
        var x = sg[0], w = sg[1] - sg[0], y = r.y - F;
        if (w <= 2) return;
        var g = c.createLinearGradient(0, y, 0, r.y);
        var wc = W.face || ['#d0d6e8', '#aeb6d0', '#7c86a8'];
        g.addColorStop(0, wc[0]); g.addColorStop(0.35, wc[1]); g.addColorStop(1, wc[2]);
        c.fillStyle = g; c.fillRect(x, y, w, F);
        c.fillStyle = '#e8ecf6'; c.fillRect(x, y, w, 2.5);
        c.fillStyle = '#5d6687'; c.fillRect(x, y + F * 0.42, w, 2);
        c.fillStyle = '#353c5e'; c.fillRect(x, r.y - 3, w, 3);
        for (var px = x + 30; px < x + w - 10; px += 60) { c.fillStyle = 'rgba(40,46,70,0.35)'; c.fillRect(px, y + 3, 2, F - 6); }
        for (var rv = x + 8; rv < x + w - 4; rv += 20) { c.fillStyle = '#6e789a'; c.fillRect(rv, y + F - 8, 2, 2); }
        // ventanas al espacio en salas grandes
        if (MAP.rooms.indexOf(r) >= 0 && w > 120 && W.windows) W.windows(c, x, y, w, F, r);
        else if (MAP.rooms.indexOf(r) >= 0 && w > 120) {
          for (var wx = x + 24; wx < x + w - 50; wx += 90) {
            rr(c, wx, y + 4, 34, F - 10, 4); c.fillStyle = '#0a1030'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
            for (var s2 = 0; s2 < 5; s2++) { c.fillStyle = '#fff'; c.fillRect(wx + 4 + rand(wx + s2) * 26, y + 6 + rand(wx * 3 + s2) * (F - 15), 1.5, 1.5); }
            c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(wx + 3, y + 6, 8, F - 14);
          }
        }
      });
    });
    // carteles con el nombre de cada sala
    c.textAlign = 'center'; c.textBaseline = 'middle';
    MAP.rooms.forEach(function (r) {
      var segs = MAP.topWalls(r), best = null;
      segs.forEach(function (sg) { if (!best || sg[1] - sg[0] > best[1] - best[0]) best = sg; });
      if (!best) return;
      var label = tr ? tr(r.name) : r.name;
      c.font = 'bold 13px system-ui, sans-serif';
      var tw = c.measureText(label).width + 18, cx = (best[0] + best[1]) / 2, cy = r.y - F / 2;
      if (tw > best[1] - best[0] - 8) { c.font = 'bold 10px system-ui, sans-serif'; tw = c.measureText(label).width + 12; }
      rr(c, cx - tw / 2, cy - 9, tw, 18, 5); c.fillStyle = '#16203f'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
      c.strokeStyle = (TH[r.id] && TH[r.id].accent) || '#7fd8ff'; c.lineWidth = 1; rr(c, cx - tw / 2 + 2.5, cy - 6.5, tw - 5, 13, 3); c.stroke();
      c.fillStyle = '#eaf6ff'; c.fillText(label, cx, cy + 0.5);
    });
  }

  // ---------- SUELOS de cada sala ----------
  var THEME = {
    cafe: { a: '#c9b48a', b: '#ab9670', light: 'rgba(255,220,150,0.18)', accent: '#ffcf7a' },
    medbay: { a: '#a9d9d2', b: '#8fc4bd', light: 'rgba(170,255,240,0.18)', accent: '#7fffe0' },
    green: { a: '#4f8f3a', b: '#447d32', light: 'rgba(255,250,170,0.22)', accent: '#b6ff7a' },
    engines: { a: '#4a4458', b: '#3c374a', light: 'rgba(255,150,70,0.16)', accent: '#ff9a4a' },
    reactor: { a: '#3a2f4a', b: '#2d2440', light: 'rgba(120,220,255,0.16)', accent: '#7fd8ff' },
    security: { a: '#2e3550', b: '#283048', light: 'rgba(120,180,255,0.12)', accent: '#6fb6ff' },
    admin: { a: '#8a6a45', b: '#7a5c3a', light: 'rgba(255,220,160,0.16)', accent: '#ffd28a' },
    bridge: { a: '#24415a', b: '#1e384e', light: 'rgba(120,220,255,0.16)', accent: '#7fd8ff' },
    electrical: { a: '#5a5440', b: '#4d4836', light: 'rgba(255,230,120,0.14)', accent: '#ffe066' },
    lab: { a: '#dfe4ee', b: '#cfd6e2', light: 'rgba(200,255,230,0.14)', accent: '#7fffb0' },
    storage: { a: '#7a5a35', b: '#6c4f2e', light: 'rgba(255,210,140,0.14)', accent: '#ffc070' },
    weapons: { a: '#3d3a52', b: '#343147', light: 'rgba(255,120,120,0.12)', accent: '#ff8a8a' }
  };
  function floor(c, r) {
    var T = THEME[r.id] || { a: r.floor, b: r.floor, light: 'rgba(255,255,255,0.1)' };
    r.floorAccent = T.accent;
    c.save(); c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip();
    c.fillStyle = T.a; c.fillRect(r.x, r.y, r.w, r.h);
    var i, j, x, y;
    if (r.id === 'cafe') {
      for (i = 0; i < r.w / 30; i++) for (j = 0; j < r.h / 30; j++) if ((i + j) % 2) { c.fillStyle = T.b; c.fillRect(r.x + i * 30, r.y + j * 30, 30, 30); }
      c.strokeStyle = 'rgba(80,60,30,0.25)'; c.lineWidth = 1;
      for (i = r.x; i < r.x + r.w; i += 30) { c.beginPath(); c.moveTo(i, r.y); c.lineTo(i, r.y + r.h); c.stroke(); }
      for (j = r.y; j < r.y + r.h; j += 30) { c.beginPath(); c.moveTo(r.x, j); c.lineTo(r.x + r.w, j); c.stroke(); }
      // alfombra central redonda
      c.fillStyle = 'rgba(160,60,60,0.35)'; c.beginPath(); c.ellipse(r.x + r.w / 2, r.y + 130, 95, 55, 0, 0, Math.PI * 2); c.fill();
      c.strokeStyle = 'rgba(255,210,140,0.5)'; c.lineWidth = 3; c.beginPath(); c.ellipse(r.x + r.w / 2, r.y + 130, 85, 47, 0, 0, Math.PI * 2); c.stroke();
    } else if (r.id === 'medbay' || r.id === 'lab') {
      c.strokeStyle = r.id === 'lab' ? '#bcc4d4' : '#7fb2ab'; c.lineWidth = 1.2;
      for (i = r.x; i < r.x + r.w; i += 22) { c.beginPath(); c.moveTo(i, r.y); c.lineTo(i, r.y + r.h); c.stroke(); }
      for (j = r.y; j < r.y + r.h; j += 22) { c.beginPath(); c.moveTo(r.x, j); c.lineTo(r.x + r.w, j); c.stroke(); }
      if (r.id === 'medbay') { c.fillStyle = 'rgba(229,72,77,0.55)'; c.fillRect(r.x + 18, r.y + 125, 30, 10); c.fillRect(r.x + 28, r.y + 115, 10, 30); }
      else { c.fillStyle = 'rgba(48,164,108,0.25)'; for (i = 0; i < 6; i++) c.fillRect(r.x + 10 + i * 40, r.y + r.h - 14, 24, 6); }
    } else if (r.id === 'green') {
      for (i = 0; i < 260; i++) { x = r.x + rand(i) * r.w; y = r.y + rand(i + 50) * r.h; c.strokeStyle = rand(i + 9) > 0.5 ? '#5fa84a' : '#3e7a2e'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 1.5, y - 4); c.stroke(); }
      // camino de piedras
      for (i = 0; i < 7; i++) { c.fillStyle = '#9a9488'; c.beginPath(); c.ellipse(r.x + 20 + i * 27, r.y + 82 + Math.sin(i) * 6, 11, 7, 0.3, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.2; c.strokeStyle = 'rgba(26,26,46,0.6)'; c.stroke(); }
    } else if (r.id === 'engines' || r.id === 'weapons') {
      for (i = 0; i < r.w; i += 12) for (j = 0; j < r.h; j += 12) { c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(r.x + i + 3, r.y + j + 3, 5, 2); c.fillRect(r.x + i + 6, r.y + j + 7, 2, 5); }
      if (r.id === 'engines') { c.fillStyle = 'rgba(255,140,60,0.22)'; c.fillRect(r.x, r.y + r.h / 2 - 6, r.w, 12); }
    } else if (r.id === 'reactor') {
      var hs = 18;
      c.strokeStyle = 'rgba(127,216,255,0.28)'; c.lineWidth = 1.5;
      for (j = 0; j < r.h / (hs * 1.5) + 1; j++) for (i = 0; i < r.w / (hs * 1.73) + 1; i++) {
        var hx = r.x + i * hs * 1.73 + (j % 2) * hs * 0.865, hy = r.y + j * hs * 1.5;
        c.beginPath(); for (var k = 0; k < 6; k++) { var a = Math.PI / 6 + k * Math.PI / 3; c.lineTo(hx + Math.cos(a) * hs, hy + Math.sin(a) * hs); } c.closePath(); c.stroke();
      }
    } else if (r.id === 'security') {
      for (i = 0; i < r.w; i += 16) for (j = 0; j < r.h; j += 16) if ((i / 16 + j / 16) % 2) { c.fillStyle = T.b; c.fillRect(r.x + i, r.y + j, 16, 16); }
    } else if (r.id === 'admin' || r.id === 'storage') {
      c.strokeStyle = 'rgba(40,25,10,0.35)'; c.lineWidth = 1.5;
      for (j = r.y; j < r.y + r.h; j += 16) { c.beginPath(); c.moveTo(r.x, j); c.lineTo(r.x + r.w, j); c.stroke(); }
      for (j = 0; j < r.h / 16; j++) for (i = (j % 2) * 45; i < r.w; i += 90) { c.beginPath(); c.moveTo(r.x + i, r.y + j * 16); c.lineTo(r.x + i, r.y + j * 16 + 16); c.stroke(); }
      if (r.id === 'storage') { c.strokeStyle = '#f2c53a'; c.lineWidth = 3; c.setLineDash([12, 8]); c.strokeRect(r.x + 120, r.y + 100, 110, 85); c.setLineDash([]); }
    } else if (r.id === 'bridge') {
      c.strokeStyle = 'rgba(127,216,255,0.2)'; c.lineWidth = 2;
      [40, 70, 95].forEach(function (rad) { circ(c, r.x + 120, r.y + 100, rad); c.stroke(); });
    } else if (r.id === 'electrical') {
      c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1;
      for (j = r.y; j < r.y + r.h; j += 16) { c.beginPath(); c.moveTo(r.x, j); c.lineTo(r.x + r.w, j); c.stroke(); }
      for (i = 0; i < r.w; i += 20) { c.fillStyle = (i / 20) % 2 ? '#1b1b2a' : '#f2c53a'; c.fillRect(r.x + i, r.y + r.h - 10, 20, 10); }
    }
    for (i = 0; i < r.w * r.h / 700; i++) { c.fillStyle = i % 3 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'; c.fillRect(r.x + rand(i * 7 + r.x) * r.w, r.y + rand(i * 3 + r.y) * r.h, 2, 2); }
    var lg = c.createRadialGradient(r.x + r.w / 2, r.y + r.h * 0.45, 8, r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.75);
    lg.addColorStop(0, T.light); lg.addColorStop(0.55, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.36)');
    c.fillStyle = lg; c.fillRect(r.x, r.y, r.w, r.h);
    var sg = c.createLinearGradient(0, r.y, 0, r.y + 20); sg.addColorStop(0, 'rgba(0,0,0,0.4)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sg; c.fillRect(r.x, r.y, r.w, 20);
    c.restore();
  }
  function corridor(c, k) {
    c.fillStyle = '#9a7650'; c.fillRect(k.x, k.y, k.w, k.h);
    var horiz = k.w >= k.h, i;
    c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1;
    if (horiz) for (i = k.y + 7; i < k.y + k.h; i += 7) { c.beginPath(); c.moveTo(k.x, i); c.lineTo(k.x + k.w, i); c.stroke(); }
    else for (i = k.x + 7; i < k.x + k.w; i += 7) { c.beginPath(); c.moveTo(i, k.y); c.lineTo(i, k.y + k.h); c.stroke(); }
    c.fillStyle = '#4c68a6';
    if (horiz) c.fillRect(k.x, k.y + 14, k.w, k.h - 28); else c.fillRect(k.x + 14, k.y, k.w - 28, k.h);
    c.strokeStyle = '#33497a'; c.lineWidth = 2; c.beginPath();
    if (horiz) { c.moveTo(k.x, k.y + 14); c.lineTo(k.x + k.w, k.y + 14); c.moveTo(k.x, k.y + k.h - 14); c.lineTo(k.x + k.w, k.y + k.h - 14); }
    else { c.moveTo(k.x + 14, k.y); c.lineTo(k.x + 14, k.y + k.h); c.moveTo(k.x + k.w - 14, k.y); c.lineTo(k.x + k.w - 14, k.y + k.h); }
    c.stroke();
    // flechas pintadas
    c.fillStyle = 'rgba(255,255,255,0.12)';
    if (horiz && k.w > 200) for (i = k.x + 60; i < k.x + k.w - 40; i += 160) { c.beginPath(); c.moveTo(i, k.y + k.h / 2 - 8); c.lineTo(i + 14, k.y + k.h / 2); c.lineTo(i, k.y + k.h / 2 + 8); c.closePath(); c.fill(); }
    // tubería en el borde
    if (horiz) { c.fillStyle = '#6e789a'; c.fillRect(k.x, k.y + k.h - 5, k.w, 3); c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(k.x, k.y, k.w, 12); }
  }
  function doors(c) {
    MAP.corridors.forEach(function (k) {
      MAP.rooms.forEach(function (r) {
        var edges = [];
        if (k.w < k.h || k.h <= 40) {
          if (Math.abs(k.y + k.h - r.y) < 1 && k.x >= r.x && k.x + k.w <= r.x + r.w) edges.push(['h', k.x, r.y, k.w]);
          if (Math.abs(k.y - (r.y + r.h)) < 1 && k.x >= r.x && k.x + k.w <= r.x + r.w) edges.push(['h', k.x, k.y, k.w]);
        }
        if (k.w >= k.h) {
          if (Math.abs(k.x + k.w - r.x) < 1 && k.y >= r.y && k.y + k.h <= r.y + r.h) edges.push(['v', r.x, k.y, k.h]);
          if (Math.abs(k.x - (r.x + r.w)) < 1 && k.y >= r.y && k.y + k.h <= r.y + r.h) edges.push(['v', k.x, k.y, k.h]);
        }
        edges.forEach(function (e) {
          var i;
          if (e[0] === 'h') {
            for (i = 0; i < e[3]; i += 10) { c.fillStyle = (i / 10) % 2 ? '#1b1b2a' : '#f2c53a'; c.fillRect(e[1] + i, e[2] - 3, 10, 6); }
            box(c, e[1] - 7, e[2] - 9, 9, 18, '#8a94b8', 2, { lw: 1.6 }); box(c, e[1] + e[3] - 2, e[2] - 9, 9, 18, '#8a94b8', 2, { lw: 1.6 });
            circ(c, e[1] - 2.5, e[2] - 4, 1.6, '#57e389'); circ(c, e[1] + e[3] + 2.5, e[2] - 4, 1.6, '#57e389');
          } else {
            for (i = 0; i < e[3]; i += 10) { c.fillStyle = (i / 10) % 2 ? '#1b1b2a' : '#f2c53a'; c.fillRect(e[1] - 3, e[2] + i, 6, 10); }
            box(c, e[1] - 9, e[2] - 7, 18, 9, '#8a94b8', 2, { lw: 1.6 }); box(c, e[1] - 9, e[2] + e[3] - 2, 18, 9, '#8a94b8', 2, { lw: 1.6 });
          }
        });
      });
    });
  }

  // ---------- MUEBLES (fijos) ----------
  function table(c, x, y) {
    [[-28, 0], [28, 0], [0, -26], [0, 26]].forEach(function (o) { circ(c, x + o[0] + 2, y + o[1] + 4, 8, 'rgba(0,0,0,0.25)'); circ(c, x + o[0], y + o[1], 8, '#c0503f', 1.6); circ(c, x + o[0] - 2, y + o[1] - 2, 3, 'rgba(255,255,255,0.3)'); });
    circ(c, x + 3, y + 6, 22, 'rgba(0,0,0,0.3)');
    circ(c, x, y, 22, '#eef0f6', 2.2); circ(c, x, y, 15, '#ffffff');
    box(c, x - 8, y - 5, 10, 8, '#f5a524', 2, { lw: 1 }); circ(c, x + 7, y + 3, 4, '#e5484d', 1); circ(c, x + 6, y - 7, 3, '#57e389', 1);
  }
  function crate(c, x, y, s, col) {
    shadow(c, x, y, s, s, 2);
    c.fillStyle = col || '#b07a42'; rr(c, x, y, s, s, 2); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    c.strokeStyle = 'rgba(60,35,10,0.8)'; c.lineWidth = 2; c.strokeRect(x + 3, y + 3, s - 6, s - 6);
    c.beginPath(); c.moveTo(x + 4, y + 4); c.lineTo(x + s - 4, y + s - 4); c.moveTo(x + s - 4, y + 4); c.lineTo(x + 4, y + s - 4); c.stroke();
  }
  function plant(c, x, y, big) {
    var s = big ? 1.4 : 1;
    box(c, x - 7 * s, y + 2, 14 * s, 10 * s, '#c0603f', 3, { lw: 1.4 });
    c.fillStyle = '#2f8a3a'; c.strokeStyle = OUT; c.lineWidth = 1.2;
    for (var a = 0; a < 6; a++) { var ang = -Math.PI / 2 + (a - 2.5) * 0.45; c.beginPath(); c.ellipse(x + Math.cos(ang) * 8 * s, y - 4 + Math.sin(ang) * 8 * s, 7 * s, 3 * s, ang, 0, Math.PI * 2); c.fill(); c.stroke(); }
  }
  function staticDecor(c) {
    var r, i;
    // Comedor: mesas, barra con cafetera y máquina de bebidas, plantas
    r = R('cafe');
    table(c, r.x + 75, r.y + 175); table(c, r.x + 225, r.y + 175);
    box(c, r.x + 70, r.y + 6, 120, 22, '#8a5a3a', 4);
    box(c, r.x + 78, r.y + 2, 18, 18, '#3a3f55', 3, { lw: 1.4 }); box(c, r.x + 104, r.y + 8, 10, 8, '#ffffff', 2, { lw: 1 }); box(c, r.x + 120, r.y + 8, 10, 8, '#ffffff', 2, { lw: 1 });
    box(c, r.x + 225, r.y + 8, 34, 46, '#2a3a6a', 4);
    box(c, r.x + 229, r.y + 12, 26, 24, '#5bc0ff', 2, { lw: 1.2 });
    plant(c, r.x + 16, r.y + 20, true); plant(c, r.x + 285, r.y + 40, false);
    box(c, r.x + 10, r.y + 205, 22, 26, '#5a6488', 4); box(c, r.x + 8, r.y + 203, 26, 6, '#7a84a8', 2, { lw: 1.2 });
    // Enfermería: camillas, armario de medicinas, gotero
    r = R('medbay');
    [r.y + 46, r.y + 90].forEach(function (y) {
      box(c, r.x + 85, y, 72, 26, '#eef0f6', 5);
      box(c, r.x + 137, y + 3, 17, 20, '#ffffff', 4, { lw: 1.2 });
      box(c, r.x + 85, y + 16, 50, 10, '#6fd0e0', 3, { lw: 1.2 });
    });
    box(c, r.x + 172, r.y + 72, 22, 30, '#ffffff', 3); c.fillStyle = '#e5484d'; c.fillRect(r.x + 180, r.y + 78, 6, 16); c.fillRect(r.x + 175, r.y + 83, 16, 6);
    c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(r.x + 70, r.y + 50); c.lineTo(r.x + 70, r.y + 85); c.stroke();
    box(c, r.x + 64, r.y + 44, 12, 14, 'rgba(160,220,255,0.85)', 4, { lw: 1.4 });
    // Invernadero: jardineras con flores, depósito de agua, árbol
    r = R('green');
    [r.y + 45, r.y + 95].forEach(function (y, row) {
      box(c, r.x + 55, y, 92, 22, '#7a4a2a', 4);
      c.fillStyle = '#4a2e18'; c.fillRect(r.x + 59, y + 4, 84, 14);
      for (i = 0; i < 5; i++) {
        var fx = r.x + 66 + i * 18, fy = y + 9;
        c.fillStyle = '#2f8a3a'; c.strokeStyle = OUT; c.lineWidth = 1;
        for (var a = 0; a < 5; a++) { var an = a / 5 * Math.PI * 2; c.beginPath(); c.ellipse(fx + Math.cos(an) * 5, fy + Math.sin(an) * 5, 5, 2.8, an, 0, Math.PI * 2); c.fill(); c.stroke(); }
        circ(c, fx, fy, 3.2, ['#ff6fa8', '#ffd23f', '#ffffff', '#c58bff', '#ff8a4a'][(i + row) % 5], 1);
      }
    });
    circ(c, r.x + 180, r.y + 58, 14, '#2a5d9a', 2); circ(c, r.x + 180, r.y + 58, 9, 'rgba(110,190,255,0.85)');
    // Motores: base de turbina, tuberías y medidores
    r = R('engines');
    circ(c, r.x + 52 + 3, r.y + 192 + 5, 36, 'rgba(0,0,0,0.3)'); circ(c, r.x + 52, r.y + 192, 36, '#2b2440', 3);
    c.lineWidth = 8; c.strokeStyle = OUT; c.beginPath(); c.moveTo(r.x + 60, r.y + 10); c.lineTo(r.x + r.w - 60, r.y + 10); c.lineTo(r.x + r.w - 60, r.y + 70); c.stroke();
    c.lineWidth = 5; c.strokeStyle = '#d0703a'; c.stroke();
    for (i = 0; i < 3; i++) { circ(c, r.x + 110 + i * 26, r.y + 30, 8, '#eef0f6', 1.6); c.strokeStyle = '#e5484d'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(r.x + 110 + i * 26, r.y + 30); c.lineTo(r.x + 114 + i * 26, r.y + 25); c.stroke(); }
    box(c, r.x + 160, r.y + 140, 50, 40, '#4a4060', 4); box(c, r.x + 166, r.y + 146, 38, 12, '#ff9a4a', 2, { lw: 1 });
    // Reactor: anillo del núcleo y conductos
    r = R('reactor');
    circ(c, r.x + 113, r.y + 160, 40, 'rgba(0,0,0,0.3)'); circ(c, r.x + 110, r.y + 155, 40, '#2a2040', 3);
    c.lineWidth = 6; c.strokeStyle = OUT;
    [[r.x + 60, r.y + 40], [r.x + 180, r.y + 60], [r.x + 180, r.y + 190]].forEach(function (p) { c.beginPath(); c.moveTo(r.x + 110, r.y + 155); c.lineTo(p[0], p[1]); c.stroke(); });
    c.lineWidth = 3; c.strokeStyle = '#4a5a8a';
    [[r.x + 60, r.y + 40], [r.x + 180, r.y + 60], [r.x + 180, r.y + 190]].forEach(function (p) { c.beginPath(); c.moveTo(r.x + 110, r.y + 155); c.lineTo(p[0], p[1]); c.stroke(); });
    circ(c, r.x + 110, r.y + 155, 40, '#2a2040', 3);
    // Seguridad: sillón y archivo de cintas
    r = R('security');
    circ(c, r.x + 50, r.y + 64, 11, '#3a4a7a', 1.8); box(c, r.x + 40, r.y + 72, 20, 8, '#2a3a6a', 3, { lw: 1.4 });
    box(c, r.x + 124, r.y + 58, 34, 34, '#3a3f55', 3); for (i = 0; i < 3; i++) box(c, r.x + 128, r.y + 62 + i * 10, 26, 6, '#1a1a2e', 1, { lw: 0.8 });
    // Administración: archivadores, papeles, planta
    r = R('admin');
    for (i = 0; i < 3; i++) { box(c, r.x + 8, r.y + 8 + i * 28, 22, 24, '#8a8a68', 3); c.fillStyle = '#5a5a40'; c.fillRect(r.x + 15, r.y + 18 + i * 28, 8, 2); }
    plant(c, r.x + 105, r.y + 16, false);
    // Puente: consola curva, sillón, ventanal
    r = R('bridge');
    c.fillStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.arc(r.x + 133, r.y + 105, 52, -1.0, 1.0); c.arc(r.x + 133, r.y + 105, 36, 1.0, -1.0, true); c.closePath(); c.fill();
    c.fillStyle = '#34507a'; c.beginPath(); c.arc(r.x + 130, r.y + 100, 52, -1.0, 1.0); c.arc(r.x + 130, r.y + 100, 36, 1.0, -1.0, true); c.closePath(); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    circ(c, r.x + 115, r.y + 100, 12, '#8a3a3a', 1.8); box(c, r.x + 100, r.y + 88, 8, 24, '#6a2a2a', 3, { lw: 1.4 });
    box(c, r.x + r.w - 28, r.y + 28, 26, r.h - 56, '#0a1030', 8);
    // Electricidad: armarios, generador, bandeja de cables
    r = R('electrical');
    for (i = 0; i < 2; i++) box(c, r.x + 140 + i * 34, r.y + 26, 28, 40, '#3a3f55', 3);
    box(c, r.x + 62, r.y + 100, 44, 28, '#4a5070', 4); circ(c, r.x + 84, r.y + 114, 8, '#2a2f40', 1.4);
    c.lineWidth = 3;
    ['#e5484d', '#3e7bfa', '#f2d63a'].forEach(function (col, k) { c.strokeStyle = col; c.beginPath(); c.moveTo(r.x + 140, r.y + 70 + k * 3); c.bezierCurveTo(r.x + 120, r.y + 95 + k * 8, r.x + 100, r.y + 80, r.x + 84, r.y + 102 + k * 4); c.stroke(); });
    // Laboratorio: mesa con tubos, microscopio, tanque
    r = R('lab');
    box(c, r.x + 70, r.y + 150, 110, 22, '#eef0f6', 4);
    ['#ff6b6b', '#57e389', '#6fb6ff', '#ffe66b', '#c58bff'].forEach(function (col, k) {
      box(c, r.x + 80 + k * 20, r.y + 136, 8, 20, 'rgba(255,255,255,0.7)', 3, { lw: 1.1 });
      box(c, r.x + 80 + k * 20, r.y + 146, 8, 10, col, 2, { flat: true });
    });
    box(c, r.x + 150, r.y + 20, 22, 26, '#5a6488', 3); circ(c, r.x + 161, r.y + 28, 6, '#2a2f40', 1.2);
    box(c, r.x + 189, r.y + 34, 32, 56, 'rgba(120,255,190,0.3)', 12);
    box(c, r.x + 187, r.y + 88, 36, 8, '#5a6488', 3, { lw: 1.2 });
    // Almacén: estanterías, cajas, barriles, cinta transportadora
    r = R('storage');
    box(c, r.x + 160, r.y + 22, 76, 12, '#6a4a2a', 2);
    crate(c, r.x + 168, r.y + 28, 32); crate(c, r.x + 202, r.y + 28, 32, '#c08a52'); crate(c, r.x + 185, r.y + 62, 30, '#9a6a3a');
    crate(c, r.x + 12, r.y + 100, 26, '#c08a52');
    [[r.x + 30, r.y + 165], [r.x + 56, r.y + 170]].forEach(function (p) { circ(c, p[0] + 2, p[1] + 4, 12, 'rgba(0,0,0,0.3)'); circ(c, p[0], p[1], 12, '#3e7bfa', 2); c.strokeStyle = '#2a4fa8'; c.lineWidth = 2; c.beginPath(); c.moveTo(p[0] - 11, p[1]); c.lineTo(p[0] + 11, p[1]); c.stroke(); });
    box(c, r.x + 120, r.y + 120, 110, 24, '#3a3f55', 3);
    // Armas: base de la torreta y ventanal
    r = R('weapons');
    box(c, r.x + r.w - 28, r.y + 18, 26, r.h - 36, '#0a1030', 8);
    circ(c, r.x + 40, r.y + 40, 22, '#1d2a40', 2.2);
  }

  // ---------- partes ANIMADAS ----------
  function animDecor(c, t, opts) {
    var r, i;
    // Comedor: vapor de la cafetera y luces de la máquina
    r = R('cafe');
    for (i = 0; i < 3; i++) { var ph = (t * 0.6 + i / 3) % 1; c.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - ph)) + ')'; c.beginPath(); c.arc(r.x + 87 + Math.sin(t * 2 + i) * 3, r.y + 2 - ph * 22, 3 + ph * 4, 0, Math.PI * 2); c.fill(); }
    for (i = 0; i < 3; i++) circ(c, r.x + 236 + i * 6, r.y + 44, 2, Math.floor(t * 2 + i) % 3 ? ['#ff6b6b', '#ffe66b', '#57e389'][i] : '#333');
    // Enfermería: monitor de corazón
    r = R('medbay');
    box(c, r.x + 95, r.y + 4, 50, 28, '#10241f', 4, { lw: 1.6 });
    c.strokeStyle = '#57e389'; c.lineWidth = 1.6; c.beginPath();
    for (i = 0; i <= 44; i++) { var xx = r.x + 98 + i, pp = ((i / 44) + t * 0.8) % 1, yy = r.y + 18; if (pp > 0.45 && pp < 0.5) yy -= 10; else if (pp >= 0.5 && pp < 0.53) yy += 6; if (i === 0) c.moveTo(xx, yy); else c.lineTo(xx, yy); }
    c.stroke();
    c.strokeStyle = 'rgba(80,230,255,' + (0.4 + 0.3 * Math.sin(t * 3)) + ')'; c.lineWidth = 3; circ(c, r.x + 35, r.y + 35, 27); c.stroke();
    // Invernadero: mariposas
    r = R('green');
    for (i = 0; i < 3; i++) {
      var bx = r.x + 100 + Math.sin(t * 0.7 + i * 2) * 70, by = r.y + 70 + Math.cos(t * 0.9 + i) * 45, fl = Math.abs(Math.sin(t * 12 + i)) * 4 + 1;
      c.fillStyle = ['#ff8ad8', '#ffd23f', '#7fd8ff'][i];
      c.beginPath(); c.ellipse(bx - 3, by, fl, 3.5, 0.3, 0, Math.PI * 2); c.fill(); c.beginPath(); c.ellipse(bx + 3, by, fl, 3.5, -0.3, 0, Math.PI * 2); c.fill();
      c.fillStyle = OUT; c.fillRect(bx - 0.6, by - 3, 1.2, 6);
    }
    // Motores: turbina girando y chispas
    r = R('engines');
    var cx = r.x + 52, cy = r.y + 192;
    var glow = c.createRadialGradient(cx, cy, 4, cx, cy, 31); glow.addColorStop(0, 'rgba(255,200,100,0.95)'); glow.addColorStop(1, 'rgba(255,90,40,0.15)');
    circ(c, cx, cy, 31, glow);
    c.save(); c.translate(cx, cy); c.rotate(t * 5); c.fillStyle = '#4a4068'; c.strokeStyle = OUT; c.lineWidth = 1.2;
    for (i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.ellipse(14, 0, 14, 5, 0.4, 0, Math.PI * 2); c.fill(); c.stroke(); }
    c.restore(); circ(c, cx, cy, 7, '#c9b8ff', 1.5);
    if (Math.sin(t * 7) > 0.6) for (i = 0; i < 4; i++) { c.fillStyle = '#ffe066'; c.fillRect(r.x + 185 + rand(Math.floor(t * 10) + i) * 20, r.y + 135 - rand(Math.floor(t * 10) + i + 5) * 15, 2, 2); }
    // Reactor: núcleo, energía por los conductos
    r = R('reactor');
    var rcx = r.x + 110, rcy = r.y + 155, alarm = opts.reactor, pulse = 0.5 + 0.5 * Math.sin(t * (alarm ? 10 : 2));
    var core = c.createRadialGradient(rcx, rcy, 3, rcx, rcy, 32);
    core.addColorStop(0, alarm ? 'rgba(255,240,200,1)' : 'rgba(220,255,255,1)');
    core.addColorStop(1, alarm ? 'rgba(255,40,40,' + (0.35 + 0.5 * pulse) + ')' : 'rgba(60,200,255,' + (0.3 + 0.3 * pulse) + ')');
    circ(c, rcx, rcy, 32, core);
    c.strokeStyle = alarm ? '#ff5050' : '#8a7fb8'; c.lineWidth = 4; circ(c, rcx, rcy, 38); c.stroke();
    for (i = 0; i < 4; i++) { var ang = t * 1.5 + i * Math.PI / 2; circ(c, rcx + Math.cos(ang) * 46, rcy + Math.sin(ang) * 46, 4, alarm ? '#ff8080' : '#9ad8ff', 1); }
    [[r.x + 60, r.y + 40], [r.x + 180, r.y + 60], [r.x + 180, r.y + 190]].forEach(function (p, k) {
      var f = (t * 0.8 + k * 0.3) % 1;
      circ(c, p[0] + (rcx - p[0]) * f, p[1] + (rcy - p[1]) * f, 2.5, alarm ? '#ff8080' : '#bff4ff');
    });
    // Puente: estrellas por el ventanal, holograma de planeta
    r = R('bridge');
    c.save(); rr(c, r.x + r.w - 26, r.y + 30, 22, r.h - 60, 7); c.clip();
    for (i = 0; i < 16; i++) circ(c, r.x + r.w - 24 + ((i * 7 + t * 40) % 20), r.y + 34 + (i * 29) % (r.h - 66), 1.2, '#fff');
    c.restore();
    var hx = r.x + 60, hy = r.y + 45;
    c.fillStyle = 'rgba(90,220,255,0.15)'; c.beginPath(); c.moveTo(hx - 10, hy + 22); c.lineTo(hx + 10, hy + 22); c.lineTo(hx + 18, hy - 4); c.lineTo(hx - 18, hy - 4); c.fill();
    c.strokeStyle = 'rgba(120,230,255,0.8)'; c.lineWidth = 1.2; circ(c, hx, hy - 6, 12); c.stroke();
    c.beginPath(); c.ellipse(hx, hy - 6, Math.abs(Math.cos(t)) * 12, 12, 0, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.moveTo(hx - 12, hy - 6); c.lineTo(hx + 12, hy - 6); c.stroke();
    for (i = 0; i < 3; i++) circ(c, r.x + 152 + i * 8, r.y + 68, 2.2, (Math.floor(t * 3 + i * 1.7) % 3) ? '#57e389' : '#ff6b6b');
    // Electricidad: chispas en el cable y luces de armarios
    r = R('electrical');
    for (i = 0; i < 2; i++) for (var k2 = 0; k2 < 2; k2++) circ(c, r.x + 146 + i * 34 + k2 * 8, r.y + 36, 2, (Math.floor(t * 3 + i + k2) % 3) ? '#57e389' : '#ff6b6b');
    if (Math.sin(t * 9) > 0.5) { c.strokeStyle = '#fff6a0'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(r.x + 118, r.y + 92); c.lineTo(r.x + 124, r.y + 84); c.lineTo(r.x + 120, r.y + 82); c.lineTo(r.x + 128, r.y + 72); c.stroke(); }
    circ(c, r.x + 84, r.y + 114, 3, Math.sin(t * 6) > 0 ? '#57e389' : '#1c3a26');
    // Laboratorio: burbujas y ADN girando
    r = R('lab');
    var tx = r.x + 205, ty = r.y + 60;
    for (i = 0; i < 5; i++) circ(c, tx - 7 + (i * 5) % 14, ty + 26 - ((t * 25 + i * 11) % 50), 2.5, 'rgba(220,255,240,0.85)');
    for (i = 0; i < 12; i++) {
      var dy = r.y + 70 + i * 6, ph2 = t * 2 + i * 0.6, ax = r.x + 40 + Math.sin(ph2) * 10, bx2 = r.x + 40 - Math.sin(ph2) * 10;
      c.strokeStyle = 'rgba(120,255,200,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(ax, dy); c.lineTo(bx2, dy); c.stroke();
      circ(c, ax, dy, 2.2, '#7fffb0'); circ(c, bx2, dy, 2.2, '#c58bff');
    }
    // Almacén: cinta transportadora con cajas
    r = R('storage');
    c.save(); c.beginPath(); c.rect(r.x + 122, r.y + 122, 106, 20); c.clip();
    c.strokeStyle = '#1a1a2e'; c.lineWidth = 1.5;
    for (i = 0; i < 12; i++) { var lx = r.x + 122 + ((i * 10 + t * 25) % 120); c.beginPath(); c.moveTo(lx, r.y + 122); c.lineTo(lx, r.y + 142); c.stroke(); }
    for (i = 0; i < 3; i++) { var bxx = r.x + 112 + ((i * 45 + t * 25) % 135); crate(c, bxx, r.y + 124, 16, ['#c08a52', '#b07a42', '#d09a62'][i]); }
    c.restore();
    // Armas: asteroides por el ventanal y radar
    r = R('weapons');
    c.save(); rr(c, r.x + r.w - 28, r.y + 18, 26, r.h - 36, 7); c.clip();
    for (i = 0; i < 4; i++) circ(c, r.x + r.w - 15 + Math.sin(t + i) * 5, r.y + 18 + ((t * 25 + i * 37) % (r.h - 36)), 4, '#8a7a6a', 1);
    c.restore();
    var rx2 = r.x + 40, ry2 = r.y + 40;
    c.strokeStyle = 'rgba(87,227,137,0.4)'; c.lineWidth = 1; circ(c, rx2, ry2, 12); c.stroke(); circ(c, rx2, ry2, 18); c.stroke();
    c.strokeStyle = '#57e389'; c.lineWidth = 2; c.beginPath(); c.moveTo(rx2, ry2); c.lineTo(rx2 + Math.cos(t * 2) * 19, ry2 + Math.sin(t * 2) * 19); c.stroke();
    circ(c, rx2 + 8, ry2 - 6, 1.8, Math.sin(t * 2) > 0.8 ? '#ff6b6b' : 'rgba(255,107,107,0.3)');
    // Pasillos: luces que recorren el suelo
    MAP.corridors.forEach(function (k) {
      var horiz = k.w >= k.h, len = horiz ? k.w : k.h, n = Math.floor(len / 40);
      for (var j = 0; j < n; j++) {
        var on2 = ((j - t * 4) % n + n) % n < 1.5;
        var col = on2 ? 'rgba(255,240,150,0.95)' : 'rgba(255,230,120,0.3)';
        if (horiz) { circ(c, k.x + 20 + j * 40, k.y + 16, 2.2, col); circ(c, k.x + 20 + j * 40, k.y + k.h - 16, 2.2, col); }
        else { circ(c, k.x + 16, k.y + 20 + j * 40, 2.2, col); circ(c, k.x + k.w - 16, k.y + 20 + j * 40, 2.2, col); }
      }
    });
  }

  function vents(c) {
    MAP.vents.forEach(function (v) {
      box(c, v.x - 16, v.y - 11, 32, 22, '#2a3048', 4);
      c.strokeStyle = '#11162a'; c.lineWidth = 2.5;
      for (var k = -10; k <= 10; k += 5) { c.beginPath(); c.moveTo(v.x + k, v.y - 7); c.lineTo(v.x + k, v.y + 7); c.stroke(); }
    });
  }

  function station(c, s, t, highlight, lightsOut, reactorAlarm) {
    c.save(); c.translate(s.x, s.y);
    if (highlight) {
      var p = 0.5 + 0.5 * Math.sin(t * 5);
      c.strokeStyle = 'rgba(255,230,80,' + (0.5 + 0.5 * p) + ')'; c.lineWidth = 4;
      c.beginPath(); c.arc(0, 0, 24 + p * 4, 0, Math.PI * 2); c.stroke();
    }
    var i;
    if (s.type === 'emergency') {
      box(c, -22, -22, 44, 44, '#5a6488', 8);
      circ(c, 0, 0, 16, '#6b6f80', 1.6); circ(c, 0, -2, 12, '#e5484d', 1.8); circ(c, -4, -6, 3.5, 'rgba(255,255,255,0.55)');
    } else if (s.type === 'lights') {
      box(c, -14, -18, 28, 36, '#2a2f40', 4);
      var on = !lightsOut || (Math.sin(t * 8) > 0);
      c.fillStyle = lightsOut ? (on ? '#ff5050' : '#552020') : '#f2d63a';
      for (i = 0; i < 3; i++) c.fillRect(-8, -12 + i * 10, 16, 6);
    } else if (s.type === 'reactor') {
      box(c, -16, -18, 32, 36, '#2a2f40', 5);
      var on2 = !reactorAlarm || Math.sin(t * 10) > 0;
      box(c, -11, -13, 22, 26, reactorAlarm ? (on2 ? '#ff5050' : '#702020') : '#2ec5ce', 4, { lw: 1.2 });
      c.fillStyle = 'rgba(255,255,255,0.9)'; c.font = 'bold 15px system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✋', 0, 1);
    } else if (s.type === 'cameras') {
      box(c, -34, -20, 68, 34, '#2a2f40', 5);
      for (var k2 = 0; k2 < 4; k2++) box(c, -30 + k2 * 15.5, -16, 13, 11, Math.sin(t * 3 + k2) > -0.6 ? '#3a8aaa' : '#1a3a4a', 2, { lw: 1 });
      box(c, -30, -2, 60, 10, '#3a4060', 2, { lw: 1 });
      circ(c, 24, 3, 2.5, Math.sin(t * 4) > 0 ? '#ff5050' : '#5a2020');
    } else if (s.type === 'admin') {
      circ(c, 3, 5, 26, 'rgba(0,0,0,0.3)'); circ(c, 0, 0, 26, '#4a5070', 2.2); circ(c, 0, 0, 21, '#1d2a40');
      c.globalAlpha = 0.55 + 0.25 * Math.sin(t * 3); c.fillStyle = '#5bd8ff';
      c.fillRect(-14, -6, 9, 6); c.fillRect(-4, -12, 10, 8); c.fillRect(7, -5, 8, 6); c.fillRect(-10, 4, 8, 6); c.fillRect(3, 4, 9, 6); c.fillRect(-5, -3, 12, 3);
      c.globalAlpha = 1;
    } else if (s.type === 'asteroids') {
      circ(c, 3, 5, 18, 'rgba(0,0,0,0.3)'); circ(c, 0, 0, 18, '#3a4060', 2);
      c.save(); c.rotate(Math.sin(t) * 0.5); box(c, 4, -4, 22, 8, '#8a94b8', 3, { lw: 1.4 }); c.restore();
      circ(c, 0, 0, 10, '#e5484d', 1.6);
    } else taskObject(c, s.type, t);
    c.restore();
  }

  // Objetos de cada tipo de tarea (dibujados, no cuadrados de colores). Centro en (0,0), unos 40 px.
  function taskObject(c, type, t) {
    var i;
    switch (type) {
      case 'wires':   // caja de conexiones abierta con cables
        box(c, -18, -20, 36, 38, '#5a6488', 4);
        box(c, -14, -16, 28, 30, '#1d2236', 3, { lw: 1.2 });
        ['#e5484d', '#3e7bfa', '#f2d63a', '#30c06c'].forEach(function (col, k) {
          c.strokeStyle = col; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-10, -11 + k * 7); c.bezierCurveTo(-2, -11 + k * 7 + 8, 2, -11 + ((k + 2) % 4) * 7 - 6, 10, -11 + ((k + 2) % 4) * 7); c.stroke();
        });
        box(c, 16, -18, 6, 34, '#8a94b8', 2, { lw: 1.2 });   // puerta
        circ(c, 0, -23, 2.2, Math.sin(t * 4) > 0 ? '#ffe066' : '#6a5a20');
        break;
      case 'numbers':   // teclado numérico de pared
        box(c, -15, -20, 30, 40, '#3a3f55', 5);
        box(c, -11, -16, 22, 8, '#5fffc0', 2, { lw: 1 });
        for (i = 0; i < 9; i++) box(c, -11 + (i % 3) * 8, -5 + Math.floor(i / 3) * 7.5, 6, 5.5, i === Math.floor(t * 2) % 9 ? '#ffe066' : '#c8ccda', 1.5, { lw: 0.8 });
        break;
      case 'download': case 'upload':   // ordenador con pantalla y barra
        box(c, -20, 6, 40, 12, '#8a6a45', 3);
        box(c, -16, -20, 32, 24, '#2a2f40', 4);
        box(c, -13, -17, 26, 17, '#0e3048', 2, { lw: 1 });
        c.fillStyle = '#30dc78'; c.fillRect(-10, -8, 20 * ((t * 0.3) % 1), 3);
        c.fillStyle = '#7fd8ff'; c.fillRect(-10, -14, 14, 2); c.fillRect(-10, -11, 9, 2);
        box(c, -10, 9, 20, 6, '#c8ccda', 1.5, { lw: 0.9 });
        break;
      case 'calibrate':   // indicador redondo con aguja
        box(c, -4, 6, 8, 14, '#5a6488', 2);
        circ(c, 2, 2, 19, 'rgba(0,0,0,0.3)');
        circ(c, 0, -2, 19, '#c8ccda', 2.4); circ(c, 0, -2, 15, '#f6f7fb');
        c.strokeStyle = '#30c06c'; c.lineWidth = 4; c.beginPath(); c.arc(0, -2, 11, Math.PI * 1.15, Math.PI * 1.45); c.stroke();
        c.strokeStyle = '#e5484d'; c.beginPath(); c.arc(0, -2, 11, Math.PI * 1.6, Math.PI * 1.9); c.stroke();
        var na = Math.PI * (1.2 + 0.6 * (0.5 + 0.5 * Math.sin(t * 1.3)));
        c.strokeStyle = OUT; c.lineWidth = 2.2; c.beginPath(); c.moveTo(0, -2); c.lineTo(Math.cos(na) * 12, -2 + Math.sin(na) * 12); c.stroke();
        circ(c, 0, -2, 2.5, OUT);
        break;
      case 'card':   // lector de tarjetas
        box(c, -14, -20, 28, 40, '#3a3f55', 5);
        box(c, -9, -14, 18, 5, '#0a0e1e', 2, { lw: 1 });
        box(c, -8, -6, 16, 12, '#2ec5ce', 2, { lw: 1.2 }); c.fillStyle = '#ffffff'; c.fillRect(-5, -3, 6, 2); c.fillRect(-5, 1, 10, 1.5);
        circ(c, 0, 13, 3, Math.sin(t * 3) > 0 ? '#30dc78' : '#1a4a2a', 1.2);
        break;
      case 'simon':   // panel de botones luminosos
        box(c, -18, -18, 36, 36, '#2a2f40', 6);
        for (i = 0; i < 9; i++) { var lit = Math.floor(t * 2.5 + i * 3.7) % 5 === 0; circ(c, -10 + (i % 3) * 10, -10 + Math.floor(i / 3) * 10, 3.6, lit ? ['#ff6b6b', '#ffe066', '#57e389', '#6fb6ff'][i % 4] : '#4a5070', 1); }
        break;
      case 'pipes':   // tuberías con rueda de válvula
        c.lineCap = 'round';
        [[-22, -8, 22, -8], [-22, 10, 0, 10], [0, 10, 0, -8]].forEach(function (l) { c.strokeStyle = OUT; c.lineWidth = 10; c.beginPath(); c.moveTo(l[0], l[1]); c.lineTo(l[2], l[3]); c.stroke(); c.strokeStyle = '#8a94b8'; c.lineWidth = 6; c.stroke(); });
        c.lineCap = 'butt';
        c.save(); c.translate(0, -8); c.rotate(t * 0.8);
        c.strokeStyle = OUT; c.lineWidth = 6; circ(c, 0, 0, 10); c.stroke(); c.strokeStyle = '#e5484d'; c.lineWidth = 3.5; circ(c, 0, 0, 10); c.stroke();
        for (i = 0; i < 4; i++) { c.rotate(Math.PI / 2); c.strokeStyle = '#e5484d'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(10, 0); c.stroke(); }
        c.restore(); circ(c, 0, -8, 3, '#ffd23f', 1.2);
        circ(c, 22, -8, 3, 'rgba(120,200,255,' + (0.5 + 0.5 * Math.sin(t * 5)) + ')');
        break;
      case 'memory':   // pantalla con cartas
        box(c, -19, -18, 38, 30, '#2a2f40', 5);
        for (i = 0; i < 8; i++) box(c, -15 + (i % 4) * 8, -14 + Math.floor(i / 4) * 11, 6, 9, (Math.floor(t * 1.5) + i) % 5 === 0 ? '#ffe066' : '#3a4a9a', 1.5, { lw: 0.8 });
        box(c, -6, 12, 12, 6, '#5a6488', 2, { lw: 1 });
        break;
      case 'fill':   // depósito transparente con nivel de líquido
        box(c, -15, -22, 30, 42, 'rgba(160,220,255,0.35)', 8);
        c.save(); U_rr(c, -13, -20, 26, 38, 6); c.clip();
        var lv = 4 + Math.sin(t * 0.8) * 6, gl = c.createLinearGradient(0, lv - 10, 0, 18); gl.addColorStop(0, '#5bd8ff'); gl.addColorStop(1, '#1a6ab0');
        c.fillStyle = gl; c.beginPath(); c.moveTo(-14, lv); c.quadraticCurveTo(0, lv + Math.sin(t * 4) * 3, 14, lv); c.lineTo(14, 20); c.lineTo(-14, 20); c.closePath(); c.fill();
        for (i = 0; i < 3; i++) circ(c, -6 + i * 6, 16 - ((t * 14 + i * 9) % 20), 1.6, 'rgba(255,255,255,0.7)');
        c.restore();
        c.strokeStyle = '#30dc78'; c.lineWidth = 2; c.beginPath(); c.moveTo(-17, -6); c.lineTo(17, -6); c.stroke();
        box(c, -17, 18, 34, 6, '#5a6488', 2, { lw: 1.2 }); box(c, -17, -25, 34, 5, '#5a6488', 2, { lw: 1.2 });
        break;
      case 'clean':   // ventana o filtro sucio
        box(c, -20, -18, 40, 32, '#8a94b8', 5);
        box(c, -16, -14, 32, 24, '#2a8ab0', 3, { lw: 1.2 });
        [[-8, -6, 6], [5, -2, 7], [-2, 5, 5], [10, 6, 4], [-11, 4, 4]].forEach(function (d) { circ(c, d[0], d[1], d[2], 'rgba(110,80,40,0.85)'); });
        c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(-14, -12, 3, 20);
        box(c, 12, 14, 10, 8, '#ffd23f', 2, { lw: 1 });   // esponja
        break;
      case 'maze':   // consola recreativa con joystick
        box(c, -16, -22, 32, 42, '#6a3a9a', 6);
        box(c, -12, -18, 24, 18, '#0d1430', 3, { lw: 1 });
        c.strokeStyle = '#7fd8ff'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-9, -15); c.lineTo(-9, -6); c.lineTo(0, -6); c.lineTo(0, -12); c.lineTo(8, -12); c.lineTo(8, -3); c.stroke();
        circ(c, -9 + ((t * 6) % 9), -6, 1.8, '#ff6fa8');
        box(c, -3, 6, 6, 8, '#2a2f40', 2, { lw: 1 }); circ(c, Math.sin(t * 3) * 2, 4, 3.5, '#e5484d', 1.2);
        circ(c, 9, 10, 2.5, '#ffe066', 1); circ(c, -9, 10, 2.5, '#57e389', 1);
        break;
      case 'sort':   // cajas de colores para clasificar
        ['#e5484d', '#3e7bfa', '#f2d63a'].forEach(function (col, k) { box(c, -22 + k * 15, -4, 13, 20, col, 3); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(-22 + k * 15, -4, 13, 4); });
        circ(c, -6, -14 + Math.abs(Math.sin(t * 2)) * -4, 5, '#30c06c', 1.4);
        circ(c, 8, -12, 4, '#ff9a3a', 1.2);
        break;
      case 'safe':   // caja fuerte con rueda
        box(c, -19, -20, 38, 40, '#4a5070', 5);
        box(c, -15, -16, 30, 32, '#5a6488', 3, { lw: 1.2 });
        c.save(); c.rotate(Math.sin(t * 0.7) * 2);
        circ(c, -2, 0, 9, '#c8ccda', 1.8); for (i = 0; i < 8; i++) { var aa = i / 8 * Math.PI * 2; c.fillStyle = OUT; c.fillRect(-2 + Math.cos(aa) * 6.5 - 0.8, Math.sin(aa) * 6.5 - 0.8, 1.6, 1.6); }
        c.restore();
        box(c, 9, -6, 4, 12, '#c8ccda', 2, { lw: 1 });
        break;
      default:
        box(c, -15, -15, 30, 30, '#2a2f40', 5);
    }
  }
  function U_rr(c, x, y, w, h, r) { rr(c, x, y, w, h, r); }

  // ---------- imagen guardada de la parte fija ----------
  var caches = {};
  var SKINS = {};
  function skin() { return SKINS[MAP.id] || SKINS.nave; }
  function staticLayer(k, lang, tr) {
    var key = MAP.id + '|' + k + '|' + lang;
    if (caches[key]) return caches[key];
    var cv = document.createElement('canvas');
    cv.width = Math.ceil((MAP.w + PAD * 2) * k); cv.height = Math.ceil((MAP.h + PAD * 2) * k);
    var c = cv.getContext('2d');
    c.setTransform(k, 0, 0, k, PAD * k, PAD * k);
    var sk = skin();
    sk.background(c);
    sk.exteriorStatic(c);
    walls(c, tr, sk);
    MAP.rooms.forEach(function (r) { sk.floor(c, r); });
    MAP.corridors.forEach(function (k2) { (sk.corridor || corridor)(c, k2); });
    doors(c);
    sk.staticDecor(c);
    vents(c);
    caches[key] = cv;
    return cv;
  }

  // opts: { t, highlight: [ids], lightsOut, reactor, tr, res: píxeles por unidad del mundo }
  function draw(ctx, opts) {
    opts = opts || {};
    var t = opts.t || 0;
    var res = opts.res || 1;
    var k = Math.max(0.5, Math.min(2.5, Math.ceil(res * 2) / 2));
    var lang = (root.I18N && root.I18N.lang) || 'es';
    var layer = staticLayer(k, lang, opts.tr);
    var sk = skin();
    ctx.fillStyle = sk.void || '#070a1c'; ctx.fillRect(-PAD * 3, -PAD * 3, MAP.w + PAD * 6, MAP.h + PAD * 6);
    ctx.drawImage(layer, -PAD, -PAD, MAP.w + PAD * 2, MAP.h + PAD * 2);
    sk.exteriorAnim(ctx, t);
    sk.animDecor(ctx, t, opts);
    var hl = opts.highlight || [];
    MAP.stations.forEach(function (s) { station(ctx, s, t, hl.indexOf(s.id) >= 0, opts.lightsOut, opts.reactor); });
  }

  SKINS.nave = { background: background, exteriorStatic: exteriorStatic, exteriorAnim: exteriorAnim, floor: floor, staticDecor: staticDecor, animDecor: animDecor, theme: THEME };
  root.SHIP = {
    draw: draw, SKINS: SKINS, PAD: PAD, OUT: OUT,
    U: { rr: rr, circ: circ, shadow: shadow, box: box, shade: shade, unionPath: unionPath, rand: rand, crate: crate, plant: plant, table: table, corridor: corridor }
  };
  if (root.DRAW) root.DRAW.ship = draw;
})(window);
