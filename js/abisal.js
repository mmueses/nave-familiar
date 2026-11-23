/* Dibujo del mapa "Base Abisal": base submarina en el fondo del mar, con cúpula central y acuario.
   Usa las herramientas de nave.js (SHIP.U) y se registra como un "aspecto" más (SHIP.SKINS.abisal). */
(function (root) {
  var MAP = root.NAVE_MAP, S = root.SHIP;
  if (!S) return;
  var U = S.U, OUT = S.OUT, PAD = S.PAD;
  var rr = U.rr, circ = U.circ, box = U.box, rand = U.rand, crate = U.crate, plant = U.plant, table = U.table, shadow = U.shadow;
  function R(id) { return MAP.room(id); }
  function hole() { return MAP.holes[0]; }

  var THEME = {
    cafe:     { a: '#c8b488', b: '#a99468', light: 'rgba(255,220,150,0.20)', accent: '#ffcf7a' },
    comms:    { a: '#2c3d5a', b: '#26354f', light: 'rgba(120,200,255,0.16)', accent: '#7fd8ff' },
    dorms:    { a: '#6a5a8a', b: '#5d4f7c', light: 'rgba(255,200,255,0.14)', accent: '#e3a8ff' },
    oxygen:   { a: '#9fd8cf', b: '#88c4bb', light: 'rgba(200,255,250,0.20)', accent: '#7fffe0' },
    sonar:    { a: '#1f3a4f', b: '#1a3245', light: 'rgba(90,255,180,0.14)', accent: '#57e389' },
    biolab:   { a: '#e3eaf0', b: '#d2dbe4', light: 'rgba(160,240,255,0.18)', accent: '#7fe8ff' },
    robotics: { a: '#5a6070', b: '#4c5262', light: 'rgba(255,200,120,0.12)', accent: '#ffb347' },
    trench:   { a: '#1a2638', b: '#152031', light: 'rgba(80,140,255,0.16)', accent: '#6fb6ff' },
    dome:     { a: '#7aa6b8', b: '#6b96a8', light: 'rgba(160,240,255,0.22)', accent: '#7fe8ff' },
    foundry:  { a: '#4a3a34', b: '#3e302b', light: 'rgba(255,130,60,0.22)', accent: '#ff8a4a' },
    storage:  { a: '#8a6a45', b: '#7a5c3a', light: 'rgba(255,220,160,0.16)', accent: '#ffd28a' },
    reactor:  { a: '#4a2a2a', b: '#3d2222', light: 'rgba(255,120,60,0.20)', accent: '#ff7a4a' },
    pods:     { a: '#4a5068', b: '#3f455c', light: 'rgba(255,240,150,0.14)', accent: '#ffe066' },
    security: { a: '#2e3550', b: '#283048', light: 'rgba(120,180,255,0.12)', accent: '#6fb6ff' },
    admin:    { a: '#2a4a6a', b: '#24405e', light: 'rgba(120,220,255,0.18)', accent: '#7fd8ff' },
    electrical: { a: '#5a5440', b: '#4d4836', light: 'rgba(255,230,120,0.14)', accent: '#ffe066' }
  };

  // ---------- FONDO: mar profundo, rayos de luz, rocas y corales ----------
  function background(c) {
    var X0 = -PAD, Y0 = -PAD, WW = MAP.w + PAD * 2, HH = MAP.h + PAD * 2;
    var g = c.createLinearGradient(0, Y0, 0, Y0 + HH);
    g.addColorStop(0, '#0f4a6e'); g.addColorStop(0.45, '#08304e'); g.addColorStop(1, '#03142a');
    c.fillStyle = g; c.fillRect(X0, Y0, WW, HH);
    // rayos de luz desde la superficie
    for (var i = 0; i < 7; i++) {
      var x = X0 + 150 + i * 330 + rand(i) * 80;
      var lg = c.createLinearGradient(0, Y0, 0, Y0 + HH * 0.8);
      lg.addColorStop(0, 'rgba(160,230,255,0.16)'); lg.addColorStop(1, 'rgba(160,230,255,0)');
      c.fillStyle = lg; c.beginPath(); c.moveTo(x, Y0); c.lineTo(x + 90, Y0); c.lineTo(x + 280, Y0 + HH * 0.8); c.lineTo(x + 120, Y0 + HH * 0.8); c.closePath(); c.fill();
    }
    // partículas flotando (nieve marina)
    for (i = 0; i < 500; i++) {
      c.fillStyle = 'rgba(200,240,255,' + (0.15 + rand(i + 3) * 0.4) + ')';
      c.fillRect(X0 + rand(i) * WW, Y0 + rand(i + 999) * HH, 1 + rand(i + 7) * 1.5, 1 + rand(i + 7) * 1.5);
    }
    // ballena lejana (silueta)
    c.save(); c.globalAlpha = 0.18; c.fillStyle = '#9fd4ff';
    c.translate(MAP.w + 120, -200);
    c.beginPath(); c.ellipse(0, 0, 210, 55, -0.08, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.moveTo(195, -10); c.lineTo(290, -60); c.lineTo(270, 0); c.lineTo(290, 50); c.closePath(); c.fill();
    c.beginPath(); c.ellipse(-40, 50, 60, 14, 0.5, 0, Math.PI * 2); c.fill();
    c.restore();
    // fondo marino rocoso abajo y a los lados
    c.fillStyle = '#1d2433';
    c.beginPath(); c.moveTo(X0, MAP.h + 140);
    for (i = 0; i <= 24; i++) c.lineTo(X0 + i * WW / 24, MAP.h + 120 + Math.sin(i * 1.7) * 40 + rand(i) * 50);
    c.lineTo(X0 + WW, Y0 + HH); c.lineTo(X0, Y0 + HH); c.closePath(); c.fill();
    c.lineWidth = 4; c.strokeStyle = OUT; c.stroke();
    // corales y algas en el fondo
    for (i = 0; i < 26; i++) {
      var cx = X0 + 40 + i * (WW - 80) / 25 + rand(i + 40) * 30, cy = MAP.h + 150 + rand(i + 9) * 60;
      if (i % 3 === 0) kelp(c, cx, cy, 70 + rand(i) * 80);
      else coral(c, cx, cy, ['#ff6fa8', '#ffb347', '#c58bff', '#57e3c9'][i % 4], 0.8 + rand(i + 2) * 0.6);
    }
    // rocas a los lados
    [[-260, 200, 120], [-220, 620, 90], [MAP.w + 230, 520, 130], [MAP.w + 200, 900, 90], [-300, 1000, 140]].forEach(function (k, j) { rock(c, k[0], k[1], k[2], j); });
  }
  function rock(c, x, y, s, j) {
    c.fillStyle = '#323a52'; c.beginPath();
    for (var a = 0; a < 9; a++) { var an = a / 9 * Math.PI * 2, rad = s * (0.7 + rand(j * 10 + a) * 0.35); c.lineTo(x + Math.cos(an) * rad, y + Math.sin(an) * rad * 0.7); }
    c.closePath(); c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.08)'; c.beginPath(); c.ellipse(x - s * 0.2, y - s * 0.25, s * 0.35, s * 0.15, -0.3, 0, Math.PI * 2); c.fill();
  }
  function kelp(c, x, y, h) {
    c.strokeStyle = OUT; c.lineWidth = 7; c.beginPath(); c.moveTo(x, y);
    c.bezierCurveTo(x - 20, y - h * 0.3, x + 20, y - h * 0.6, x - 5, y - h); c.stroke();
    c.strokeStyle = '#3e9a4a'; c.lineWidth = 4; c.stroke();
    for (var k = 1; k < 5; k++) { var py = y - h * k / 5; c.fillStyle = '#4fb85a'; c.beginPath(); c.ellipse(x + (k % 2 ? 8 : -8), py, 9, 4, k % 2 ? 0.6 : -0.6, 0, Math.PI * 2); c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke(); }
  }
  function coral(c, x, y, col, s) {
    c.lineCap = 'round';
    [[0, -40], [-18, -28], [16, -30], [-8, -50], [10, -48]].forEach(function (b) {
      c.strokeStyle = OUT; c.lineWidth = 8 * s; c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + b[0] * 0.3 * s, y + b[1] * 0.5 * s, x + b[0] * s, y + b[1] * s); c.stroke();
      c.strokeStyle = col; c.lineWidth = 5 * s; c.stroke();
    });
    c.lineCap = 'butt';
  }
  function crystal(c, x, y, h, col) {
    c.fillStyle = col || '#9fd8ff'; c.beginPath(); c.moveTo(x - h * 0.22, y); c.lineTo(x - h * 0.18, y - h * 0.7); c.lineTo(x, y - h); c.lineTo(x + h * 0.18, y - h * 0.7); c.lineTo(x + h * 0.22, y); c.closePath(); c.fill();
    c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.moveTo(x - h * 0.1, y - 2); c.lineTo(x - h * 0.08, y - h * 0.68); c.lineTo(x, y - h * 0.92); c.lineTo(x, y - 2); c.closePath(); c.fill();
  }

  // ---------- EXTERIOR: casco de roca y metal, cristales de hielo, focos ----------
  function exteriorStatic(c, sk) {
    // roca sobre la que está la base
    c.fillStyle = '#2a2f45';
    U.unionPath(c, 60, 50, 50); c.fill();
    c.lineWidth = 5; c.strokeStyle = OUT; c.stroke();
    // cristales azules por el borde de abajo
    for (var i = 0; i < 34; i++) {
      var x = 30 + i * (MAP.w - 60) / 33, y = MAP.h + 40 + rand(i) * 16;
      if (MAP.inRect(x, MAP.h - 60) || rand(i + 3) > 0.5) crystal(c, x, y + 10, 24 + rand(i + 5) * 28, rand(i + 8) > 0.6 ? '#c9b8ff' : '#9fd8ff');
    }
    // casco: toda la base es un bloque macizo; las salas y pasillos son huecos sin techo
    S.hull(c, sk || S.SKINS.abisal);
    // antena en comunicaciones
    var cm = R('comms');
    c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(cm.x + 40, cm.y - 40); c.lineTo(cm.x + 20, cm.y - 95); c.stroke();
    c.strokeStyle = '#9ab0c8'; c.lineWidth = 2.5; c.stroke();
    c.fillStyle = '#c8d4e4'; c.beginPath(); c.ellipse(cm.x + 20, cm.y - 100, 22, 10, -0.4, 0, Math.PI); c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
    // focos exteriores
    [[R('cafe').x - 20, R('cafe').y - 30], [R('oxygen').x + R('oxygen').w + 20, R('oxygen').y - 20], [R('biolab').x - 30, R('biolab').y + 20], [R('reactor').x + R('reactor').w + 30, R('reactor').y + 20], [R('pods').x + R('pods').w + 30, R('pods').y + 150]].forEach(function (p) {
      circ(c, p[0], p[1], 10, '#3a4a66', 2.5); circ(c, p[0], p[1], 5, '#fff6c0');
    });
  }
  function exteriorAnim(c, t) {
    var i;
    // burbujas que suben
    for (i = 0; i < 40; i++) {
      var x = -200 + rand(i) * (MAP.w + 400), sp = 30 + rand(i + 4) * 40;
      var y = MAP.h + 250 - ((t * sp + rand(i + 9) * 1500) % (MAP.h + 650));
      if (S.inHull(x, y) || S.inHull(x - 12, y - 12) || S.inHull(x + 12, y + 12)) continue;   // solo por fuera de la base
      c.strokeStyle = 'rgba(200,240,255,0.6)'; c.lineWidth = 1.5; circ(c, x + Math.sin(t * 2 + i) * 4, y, 2 + rand(i + 2) * 4); c.stroke();
    }
    // peces nadando alrededor
    for (i = 0; i < 6; i++) {
      var dir = i % 2 ? 1 : -1, span = MAP.w + 900;
      var fx = dir > 0 ? -450 + ((t * (40 + i * 7) + i * 300) % span) : MAP.w + 450 - ((t * (40 + i * 7) + i * 300) % span);
      var fy = [-170, -260, MAP.h + 90, -120, MAP.h + 60, -320][i] + Math.sin(t + i) * 12;
      fish(c, fx, fy, ['#ffb347', '#ff6fa8', '#7fd8ff', '#ffe066', '#57e3c9', '#c58bff'][i], dir, 1 + (i % 3) * 0.3, t);
    }
    // medusa
    jelly(c, -160 + Math.sin(t * 0.4) * 30, 340 - ((t * 12) % 300) + 150, t, '#ff9ad8');
    jelly(c, MAP.w + 150 + Math.sin(t * 0.5) * 25, 250 + Math.sin(t * 0.3) * 60, t + 1, '#9ad8ff');
    // luces de los focos
    [[R('cafe').x - 20, R('cafe').y - 30], [R('pods').x + R('pods').w + 30, R('pods').y + 150]].forEach(function (p, k) {
      var a = 0.12 + 0.05 * Math.sin(t * 2 + k);
      var g = c.createRadialGradient(p[0], p[1], 5, p[0], p[1], 120); g.addColorStop(0, 'rgba(255,250,200,' + a * 2 + ')'); g.addColorStop(1, 'rgba(255,250,200,0)');
      c.fillStyle = g; c.beginPath(); c.arc(p[0], p[1], 120, 0, Math.PI * 2); c.fill();
    });
  }
  function fish(c, x, y, col, dir, s, t) {
    c.save(); c.translate(x, y); c.scale(dir * s, s);
    var wag = Math.sin(t * 10 + x * 0.01) * 0.3;
    c.fillStyle = col; c.beginPath(); c.moveTo(-12, 0); c.lineTo(-22, -8 + wag * 6); c.lineTo(-22, 8 + wag * 6); c.closePath(); c.fill(); c.lineWidth = 1.5; c.strokeStyle = OUT; c.stroke();
    c.beginPath(); c.ellipse(0, 0, 14, 8, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(2, -3, 7, 2.5, 0, 0, Math.PI * 2); c.fill();
    circ(c, 7, -2, 2, '#fff'); circ(c, 7.5, -2, 1, OUT);
    c.restore();
  }
  function jelly(c, x, y, t, col) {
    var p = Math.sin(t * 2) * 0.12;
    c.save(); c.globalAlpha = 0.8;
    c.strokeStyle = col; c.lineWidth = 2;
    for (var k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + k * 7, y); c.quadraticCurveTo(x + k * 7 + Math.sin(t * 3 + k) * 6, y + 25, x + k * 6, y + 45); c.stroke(); }
    c.fillStyle = col; c.beginPath(); c.ellipse(x, y, 22 * (1 + p), 16 * (1 - p), 0, Math.PI, 0); c.closePath(); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.4)'; c.beginPath(); c.ellipse(x - 7, y - 8, 6, 3, -0.4, 0, Math.PI * 2); c.fill();
    c.restore();
  }

  // ---------- paredes: ventanas redondas que dan al mar ----------
  function windows(c, x, y, w, F, r) {
    for (var wx = x + 30; wx < x + w - 30; wx += 80) {
      var cx = wx + 12, cy = y + F / 2;
      circ(c, cx, cy, F / 2 - 2, '#0b3a5a', 2.5);
      c.fillStyle = 'rgba(80,200,255,0.25)'; c.beginPath(); c.arc(cx, cy, F / 2 - 5, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(cx - 3, cy - 3, 2.5, 0, Math.PI * 2); c.fill();
      c.strokeStyle = '#d8b25a'; c.lineWidth = 1.5; circ(c, cx, cy, F / 2 - 2); c.stroke();
    }
  }

  // ---------- SUELOS ----------
  function grid(c, r, step, col, lw) {
    c.strokeStyle = col; c.lineWidth = lw || 1;
    for (var i = r.x; i < r.x + r.w; i += step) { c.beginPath(); c.moveTo(i, r.y); c.lineTo(i, r.y + r.h); c.stroke(); }
    for (var j = r.y; j < r.y + r.h; j += step) { c.beginPath(); c.moveTo(r.x, j); c.lineTo(r.x + r.w, j); c.stroke(); }
  }
  function checker(c, r, step, col) {
    for (var i = 0; i < r.w / step; i++) for (var j = 0; j < r.h / step; j++) if ((i + j) % 2) { c.fillStyle = col; c.fillRect(r.x + i * step, r.y + j * step, step, step); }
  }
  function planks(c, r) {
    c.strokeStyle = 'rgba(40,25,10,0.35)'; c.lineWidth = 1.5;
    for (var j = r.y; j < r.y + r.h; j += 16) { c.beginPath(); c.moveTo(r.x, j); c.lineTo(r.x + r.w, j); c.stroke(); }
    for (j = 0; j < r.h / 16; j++) for (var i = (j % 2) * 45; i < r.w; i += 90) { c.beginPath(); c.moveTo(r.x + i, r.y + j * 16); c.lineTo(r.x + i, r.y + j * 16 + 16); c.stroke(); }
  }
  function grating(c, r) {
    for (var i = 0; i < r.w; i += 12) for (var j = 0; j < r.h; j += 12) { c.fillStyle = 'rgba(0,0,0,0.22)'; c.fillRect(r.x + i + 3, r.y + j + 3, 5, 2); c.fillRect(r.x + i + 6, r.y + j + 7, 2, 5); }
  }
  function hexes(c, r, col) {
    var hs = 18, i, j;
    c.strokeStyle = col; c.lineWidth = 1.5;
    for (j = 0; j < r.h / (hs * 1.5) + 1; j++) for (i = 0; i < r.w / (hs * 1.73) + 1; i++) {
      var hx = r.x + i * hs * 1.73 + (j % 2) * hs * 0.865, hy = r.y + j * hs * 1.5;
      c.beginPath(); for (var k = 0; k < 6; k++) { var a = Math.PI / 6 + k * Math.PI / 3; c.lineTo(hx + Math.cos(a) * hs, hy + Math.sin(a) * hs); } c.closePath(); c.stroke();
    }
  }
  function stripes(c, x, y, w, h) {
    c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
    for (var i = -h; i < w; i += 20) { c.fillStyle = '#f2c53a'; c.beginPath(); c.moveTo(x + i, y + h); c.lineTo(x + i + 10, y + h); c.lineTo(x + i + 10 + h, y); c.lineTo(x + i + h, y); c.closePath(); c.fill(); }
    c.restore();
  }
  function floor(c, r) {
    var T = THEME[r.id] || { a: '#556', b: '#445', light: 'rgba(255,255,255,0.1)' };
    c.save(); c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip();
    c.fillStyle = T.a; c.fillRect(r.x, r.y, r.w, r.h);
    var i;
    switch (r.id) {
      case 'cafe':
        checker(c, r, 30, T.b); grid(c, r, 30, 'rgba(80,60,30,0.25)');
        c.fillStyle = 'rgba(40,120,160,0.35)'; c.beginPath(); c.ellipse(r.x + 150, r.y + 70, 80, 40, 0, 0, Math.PI * 2); c.fill();
        c.strokeStyle = 'rgba(160,240,255,0.55)'; c.lineWidth = 3; c.beginPath(); c.ellipse(r.x + 150, r.y + 70, 70, 33, 0, 0, Math.PI * 2); c.stroke();
        break;
      case 'comms': case 'security':
        checker(c, r, 16, T.b); break;
      case 'dorms':
        grid(c, r, 24, 'rgba(255,255,255,0.06)');
        c.fillStyle = 'rgba(255,170,220,0.25)'; rr(c, r.x + 50, r.y + 60, 90, 60, 14); c.fill();
        break;
      case 'oxygen': case 'robotics':
        grating(c, r); if (r.id === 'oxygen') grid(c, r, 22, 'rgba(60,140,130,0.35)', 1.2);
        break;
      case 'sonar':
        c.strokeStyle = 'rgba(87,227,137,0.25)'; c.lineWidth = 2;
        [30, 55, 80].forEach(function (rad) { circ(c, r.x + 100, r.y + 75, rad); c.stroke(); });
        break;
      case 'biolab':
        grid(c, r, 22, '#bcc8d4', 1.2);
        break;
      case 'trench':
        grid(c, r, 20, 'rgba(120,170,255,0.1)');
        break;
      case 'dome':
        grid(c, r, 30, 'rgba(255,255,255,0.12)', 1.2);
        c.fillStyle = 'rgba(255,255,255,0.08)'; for (i = 0; i < 12; i++) c.fillRect(r.x + 15 + i * 28, r.y + 12, 14, 4);
        break;
      case 'foundry':
        grating(c, r); c.fillStyle = 'rgba(255,120,40,0.18)'; c.fillRect(r.x, r.y + r.h - 30, r.w, 30);
        break;
      case 'storage':
        planks(c, r); break;
      case 'reactor':
        hexes(c, r, 'rgba(255,140,80,0.3)'); break;
      case 'pods':
        grid(c, r, 20, 'rgba(0,0,0,0.18)'); stripes(c, r.x, r.y + r.h - 12, r.w, 12); break;
      case 'admin':
        grid(c, r, 24, 'rgba(127,216,255,0.14)'); break;
      case 'electrical':
        grid(c, r, 16, 'rgba(0,0,0,0.18)');
        for (i = 0; i < r.w; i += 20) { c.fillStyle = (i / 20) % 2 ? '#1b1b2a' : '#f2c53a'; c.fillRect(r.x + i, r.y + r.h - 10, 20, 10); }
        break;
    }
    for (i = 0; i < r.w * r.h / 700; i++) { c.fillStyle = i % 3 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.06)'; c.fillRect(r.x + rand(i * 7 + r.x) * r.w, r.y + rand(i * 3 + r.y) * r.h, 2, 2); }
    var lg = c.createRadialGradient(r.x + r.w / 2, r.y + r.h * 0.45, 8, r.x + r.w / 2, r.y + r.h / 2, Math.max(r.w, r.h) * 0.75);
    lg.addColorStop(0, T.light); lg.addColorStop(0.55, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,0.36)');
    c.fillStyle = lg; c.fillRect(r.x, r.y, r.w, r.h);
    var sg = c.createLinearGradient(0, r.y, 0, r.y + 20); sg.addColorStop(0, 'rgba(0,0,0,0.4)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = sg; c.fillRect(r.x, r.y, r.w, 20);
    c.restore();
  }
  // Pasillos: suelo metálico azul con bandas de luz
  function corridor(c, k) {
    c.fillStyle = '#3d6378'; c.fillRect(k.x, k.y, k.w, k.h);
    var horiz = k.w >= k.h, i;
    c.strokeStyle = 'rgba(0,0,0,0.2)'; c.lineWidth = 1;
    if (horiz) for (i = k.x + 10; i < k.x + k.w; i += 10) { c.beginPath(); c.moveTo(i, k.y); c.lineTo(i, k.y + k.h); c.stroke(); }
    else for (i = k.y + 10; i < k.y + k.h; i += 10) { c.beginPath(); c.moveTo(k.x, i); c.lineTo(k.x + k.w, i); c.stroke(); }
    c.fillStyle = '#2c4d60';
    if (horiz) { c.fillRect(k.x, k.y, k.w, 10); c.fillRect(k.x, k.y + k.h - 10, k.w, 10); }
    else { c.fillRect(k.x, k.y, 10, k.h); c.fillRect(k.x + k.w - 10, k.y, 10, k.h); }
    c.fillStyle = 'rgba(127,232,255,0.35)';
    if (horiz) { c.fillRect(k.x, k.y + 10, k.w, 2); c.fillRect(k.x, k.y + k.h - 12, k.w, 2); }
    else { c.fillRect(k.x + 10, k.y, 2, k.h); c.fillRect(k.x + k.w - 12, k.y, 2, k.h); }
    if (horiz) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(k.x, k.y, k.w, 6); }
  }

  // ---------- muebles fijos ----------
  function tank(c, x, y, w, h, col) {
    box(c, x, y, w, h, col || 'rgba(120,220,255,0.45)', 8);
    c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(x + 4, y + 6, 4, h - 12);
    box(c, x - 2, y + h - 4, w + 4, 8, '#5a6488', 3, { lw: 1.2 });
    box(c, x - 2, y - 4, w + 4, 7, '#5a6488', 3, { lw: 1.2 });
  }
  function bunk(c, x, y) {
    box(c, x, y, 64, 30, '#3a3f60', 4);
    box(c, x + 3, y + 3, 58, 24, '#e8e2f6', 4, { lw: 1.2 });
    box(c, x + 44, y + 5, 14, 20, '#ffffff', 4, { lw: 1 });
    box(c, x + 3, y + 14, 38, 13, ['#ff8ab8', '#7fc8ff', '#ffd27a'][Math.floor(x / 10) % 3], 3, { lw: 1 });
  }
  function console2(c, x, y, w, col) {
    box(c, x, y, w, 20, '#2a3150', 4);
    for (var i = 0; i < w / 14 - 1; i++) box(c, x + 5 + i * 14, y + 4, 10, 7, col || '#3a8aaa', 2, { lw: 0.8 });
  }
  function staticDecor(c) {
    var r, i;
    // Comedor: mesas, barra, máquina de bebidas
    r = R('cafe');
    table(c, r.x + 70, r.y + 110); table(c, r.x + 230, r.y + 140);
    box(c, r.x + 110, r.y + 6, 110, 22, '#8a5a3a', 4);
    box(c, r.x + 118, r.y + 2, 18, 18, '#3a3f55', 3, { lw: 1.4 }); box(c, r.x + 146, r.y + 8, 10, 8, '#ffffff', 2, { lw: 1 }); box(c, r.x + 162, r.y + 8, 10, 8, '#ffffff', 2, { lw: 1 });
    box(c, r.x + 228, r.y + 6, 30, 42, '#2a5a7a', 4); box(c, r.x + 232, r.y + 10, 22, 20, '#5bd8ff', 2, { lw: 1.2 });
    plant(c, r.x + 285, r.y + 185, true);
    // Comunicaciones: pantallas y antena
    r = R('comms');
    console2(c, r.x + 70, r.y + 8, 80, '#3aaa8a');
    box(c, r.x + 110, r.y + 90, 40, 46, '#3a3f55', 4); for (i = 0; i < 3; i++) box(c, r.x + 114, r.y + 96 + i * 13, 32, 8, '#1a1a2e', 1, { lw: 0.8 });
    // Dormitorios: literas y taquillas
    r = R('dorms');
    bunk(c, r.x + 10, r.y + 12); bunk(c, r.x + 10, r.y + 118); bunk(c, r.x + 110, r.y + 120);
    for (i = 0; i < 3; i++) box(c, r.x + 82 + i * 22, r.y + 6, 18, 34, ['#6a7aa8', '#7a6aa8', '#6a9aa8'][i], 3);
    // Oxígeno: depósitos y plantas purificadoras
    r = R('oxygen');
    tank(c, r.x + 50, r.y + 70, 30, 60); tank(c, r.x + 90, r.y + 70, 30, 60); tank(c, r.x + 130, r.y + 20, 28, 50, 'rgba(160,255,220,0.5)');
    plant(c, r.x + 20, r.y + 140, false); plant(c, r.x + 150, r.y + 140, false);
    // Sónar: pantalla redonda
    r = R('sonar');
    circ(c, r.x + 103, r.y + 80, 40, 'rgba(0,0,0,0.3)'); circ(c, r.x + 100, r.y + 75, 40, '#0f2a24', 3);
    console2(c, r.x + 20, r.y + 112, 60, '#3aaa6a');
    // Biología: piscina con peces, tubos de muestras, peceras
    r = R('biolab');
    circ(c, r.x + 123, r.y + 128, 50, 'rgba(0,0,0,0.3)'); circ(c, r.x + 120, r.y + 122, 50, '#c8d4e0', 3); circ(c, r.x + 120, r.y + 122, 42, '#2a8ab0');
    tank(c, r.x + 190, r.y + 20, 30, 56); tank(c, r.x + 150, r.y + 20, 28, 40, 'rgba(255,170,220,0.45)');
    box(c, r.x + 20, r.y + 190, 90, 20, '#eef0f6', 4);
    ['#ff6b6b', '#57e389', '#6fb6ff', '#ffe66b'].forEach(function (col, k) { box(c, r.x + 30 + k * 20, r.y + 178, 8, 18, 'rgba(255,255,255,0.7)', 3, { lw: 1 }); box(c, r.x + 30 + k * 20, r.y + 187, 8, 9, col, 2, { flat: true }); });
    // Taller de robots: mesa de trabajo, brazo robótico, robot a medio montar
    r = R('robotics');
    box(c, r.x + 60, r.y + 20, 110, 30, '#7a7a8a', 4);
    box(c, r.x + 150, r.y + 90, 50, 50, '#8a94b8', 10); circ(c, r.x + 175, r.y + 105, 8, '#5bd8ff', 1.6); box(c, r.x + 160, r.y + 120, 30, 10, '#5a6488', 3, { lw: 1 });
    circ(c, r.x + 40, r.y + 100, 18, '#4a4a5a', 2.5);
    // Observatorio de la fosa: gran ventana en el suelo al abismo
    r = R('trench');
    box(c, r.x + 50, r.y + 40, 140, 100, '#020814', 18, { lw: 3 });
    var tg = c.createRadialGradient(r.x + 120, r.y + 90, 5, r.x + 120, r.y + 90, 80); tg.addColorStop(0, 'rgba(40,90,180,0.6)'); tg.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = tg; rr(c, r.x + 50, r.y + 40, 140, 100, 18); c.fill();
    c.strokeStyle = '#d8b25a'; c.lineWidth = 2; rr(c, r.x + 55, r.y + 45, 130, 90, 14); c.stroke();
    c.strokeStyle = 'rgba(255,255,255,0.15)'; c.lineWidth = 2; c.beginPath(); c.moveTo(r.x + 120, r.y + 40); c.lineTo(r.x + 120, r.y + 140); c.moveTo(r.x + 50, r.y + 90); c.lineTo(r.x + 190, r.y + 90); c.stroke();
    // Cúpula: acuario en el centro
    var hl = hole();
    c.fillStyle = 'rgba(0,0,0,0.35)'; rr(c, hl.x - 6, hl.y - 2, hl.w + 14, hl.h + 14, 20); c.fill();
    rr(c, hl.x - 8, hl.y - 8, hl.w + 16, hl.h + 16, 22); c.fillStyle = '#8aa4c0'; c.fill(); c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    var ag = c.createLinearGradient(0, hl.y, 0, hl.y + hl.h); ag.addColorStop(0, '#2aa8d8'); ag.addColorStop(1, '#0a4a7a');
    rr(c, hl.x, hl.y, hl.w, hl.h, 16); c.fillStyle = ag; c.fill(); c.lineWidth = 2.5; c.strokeStyle = OUT; c.stroke();
    c.save(); rr(c, hl.x, hl.y, hl.w, hl.h, 16); c.clip();
    c.fillStyle = '#e8d29a'; c.beginPath(); c.moveTo(hl.x, hl.y + hl.h); for (i = 0; i <= 10; i++) c.lineTo(hl.x + i * hl.w / 10, hl.y + hl.h - 18 - Math.sin(i * 1.3) * 6); c.lineTo(hl.x + hl.w, hl.y + hl.h); c.closePath(); c.fill();
    coral(c, hl.x + 30, hl.y + hl.h - 10, '#ff6fa8', 0.7); coral(c, hl.x + 160, hl.y + hl.h - 12, '#ffb347', 0.8); kelp(c, hl.x + 95, hl.y + hl.h - 8, 70); kelp(c, hl.x + 130, hl.y + hl.h - 10, 55);
    for (i = 0; i < 4; i++) rock(c, hl.x + 55 + i * 40, hl.y + hl.h - 10, 9, i + 20);
    c.restore();
    // bancos alrededor
    [[R('dome').x + 120, R('dome').y + 12], [R('dome').x + 120, R('dome').y + R('dome').h - 26]].forEach(function (p) { box(c, p[0], p[1], 50, 14, '#5a6488', 4); box(c, p[0] + 70, p[1], 50, 14, '#5a6488', 4); });
    // Fundición: horno y crisol
    r = R('foundry');
    box(c, r.x + 70, r.y + 10, 70, 60, '#3a3030', 6); box(c, r.x + 82, r.y + 30, 46, 32, '#1a0a0a', 6, { lw: 1.6 });
    crate(c, r.x + 160, r.y + 80, 28, '#7a7a8a'); crate(c, r.x + 20, r.y + 90, 24, '#8a7a6a');
    // Herramientas: estanterías y cajas
    r = R('storage');
    box(c, r.x + 20, r.y + 10, 120, 16, '#6a4a2a', 2);
    for (i = 0; i < 5; i++) box(c, r.x + 26 + i * 22, r.y + 2, 6, 18, ['#e5484d', '#3e7bfa', '#f5a524', '#30a46c', '#8e4ec6'][i], 2, { lw: 1 });
    crate(c, r.x + 30, r.y + 90, 32); crate(c, r.x + 64, r.y + 100, 28, '#c08a52'); crate(c, r.x + 150, r.y + 40, 30, '#9a6a3a');
    box(c, r.x + 110, r.y + 120, 70, 26, '#3a3f55', 4);
    // Reactor geotérmico: pozo de magma y tuberías
    r = R('reactor');
    circ(c, r.x + 123, r.y + 128, 48, 'rgba(0,0,0,0.3)'); circ(c, r.x + 120, r.y + 122, 48, '#2a1a1a', 3);
    c.lineWidth = 8; c.strokeStyle = OUT;
    [[r.x + 60, r.y + 220], [r.x + 200, r.y + 40], [r.x + 220, r.y + 200]].forEach(function (p) { c.beginPath(); c.moveTo(r.x + 120, r.y + 122); c.lineTo(p[0], p[1]); c.stroke(); });
    c.lineWidth = 4; c.strokeStyle = '#8a5a4a';
    [[r.x + 60, r.y + 220], [r.x + 200, r.y + 40], [r.x + 220, r.y + 200]].forEach(function (p) { c.beginPath(); c.moveTo(r.x + 120, r.y + 122); c.lineTo(p[0], p[1]); c.stroke(); });
    circ(c, r.x + 120, r.y + 122, 48, '#2a1a1a', 3);
    // Cápsulas de escape
    r = R('pods');
    [[r.x + 40, r.y + 50], [r.x + 110, r.y + 50], [r.x + 40, r.y + 130]].forEach(function (p) {
      circ(c, p[0] + 3, p[1] + 5, 26, 'rgba(0,0,0,0.3)'); circ(c, p[0], p[1], 26, '#e8ecf6', 2.5); circ(c, p[0], p[1], 14, '#5bd8ff', 2); circ(c, p[0] - 4, p[1] - 4, 4, 'rgba(255,255,255,0.7)');
      c.fillStyle = '#e5484d'; c.fillRect(p[0] - 20, p[1] + 16, 40, 4);
    });
    // Control de emergencias: sillón y armario
    r = R('security');
    circ(c, r.x + 90, r.y + 70, 11, '#3a4a7a', 1.8);
    box(c, r.x + 120, r.y + 60, 34, 40, '#3a3f55', 3); circ(c, r.x + 137, r.y + 72, 6, '#e5484d', 1.4);
    // Centro de mando: mesa holográfica
    r = R('admin');
    box(c, r.x + 80, r.y + 70, 80, 50, '#1d2a40', 10); box(c, r.x + 86, r.y + 76, 68, 38, '#0e3048', 8, { lw: 1.2 });
    for (i = 0; i < 4; i++) circ(c, r.x + 70 + i * 34, r.y + 140, 8, '#3a4a7a', 1.6);
    // Electricidad: armarios y cables
    r = R('electrical');
    for (i = 0; i < 2; i++) box(c, r.x + 70 + i * 34, r.y + 8, 28, 40, '#3a3f55', 3);
    c.lineWidth = 3;
    ['#e5484d', '#3e7bfa', '#f2d63a'].forEach(function (col, k) { c.strokeStyle = col; c.beginPath(); c.moveTo(r.x + 84, r.y + 50 + k * 3); c.bezierCurveTo(r.x + 90, r.y + 80 + k * 8, r.x + 120, r.y + 70, r.x + 150, r.y + 90 + k * 4); c.stroke(); });
    box(c, r.x + 140, r.y + 80, 30, 24, '#4a5070', 4);
  }

  // ---------- partes animadas ----------
  function animDecor(c, t, opts) {
    var r, i;
    // Comedor: vapor
    r = R('cafe');
    for (i = 0; i < 3; i++) { var ph = (t * 0.6 + i / 3) % 1; c.fillStyle = 'rgba(255,255,255,' + (0.5 * (1 - ph)) + ')'; c.beginPath(); c.arc(r.x + 127 + Math.sin(t * 2 + i) * 3, r.y + 2 - ph * 20, 3 + ph * 4, 0, Math.PI * 2); c.fill(); }
    // Comunicaciones: pantallas parpadeando y ondas
    r = R('comms');
    for (i = 0; i < 4; i++) box(c, r.x + 75 + i * 14, r.y + 12, 10, 7, Math.sin(t * 3 + i * 1.3) > 0 ? '#5fffc0' : '#1a5a4a', 2, { lw: 0.8 });
    c.strokeStyle = 'rgba(127,216,255,' + (0.6 - ((t * 0.8) % 1) * 0.6) + ')'; c.lineWidth = 2; circ(c, r.x + 40, r.y + 80, 8 + ((t * 0.8) % 1) * 22); c.stroke();
    // Dormitorios: luz de lectura
    r = R('dorms');
    circ(c, r.x + 66, r.y + 20, 3, Math.sin(t * 0.8) > 0 ? '#ffe9a0' : '#6a5a3a');
    // Oxígeno: burbujas en los depósitos
    r = R('oxygen');
    [[r.x + 65, r.y + 125], [r.x + 105, r.y + 125], [r.x + 144, r.y + 66]].forEach(function (p, k) {
      for (i = 0; i < 3; i++) circ(c, p[0] - 5 + i * 5, p[1] - ((t * 18 + i * 13 + k * 7) % 50), 2, 'rgba(230,255,250,0.85)');
    });
    // Sónar: barrido verde y puntos
    r = R('sonar');
    var sx = r.x + 100, sy = r.y + 75;
    c.save(); c.beginPath(); c.arc(sx, sy, 37, 0, Math.PI * 2); c.clip();
    for (i = 0; i < 12; i++) { var an = t * 2 - i * 0.06; c.strokeStyle = 'rgba(87,227,137,' + (0.6 - i * 0.05) + ')'; c.lineWidth = 3; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(an) * 37, sy + Math.sin(an) * 37); c.stroke(); }
    [[12, -14], [-20, 8], [6, 20]].forEach(function (d, k) { var a2 = Math.atan2(d[1], d[0]); var diff = ((t * 2 - a2) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2); circ(c, sx + d[0], sy + d[1], 2.5, 'rgba(160,255,190,' + Math.max(0.1, 1 - diff) + ')'); });
    c.restore();
    // Biología: peces en la piscina
    r = R('biolab');
    c.save(); c.beginPath(); c.arc(r.x + 120, r.y + 122, 42, 0, Math.PI * 2); c.clip();
    for (i = 0; i < 3; i++) { var a3 = t * (0.8 + i * 0.3) + i * 2; fish(c, r.x + 120 + Math.cos(a3) * 24, r.y + 122 + Math.sin(a3) * 18, ['#ffb347', '#ff6fa8', '#ffe066'][i], -Math.sin(a3) > 0 ? 1 : -1, 0.7, t); }
    c.restore();
    c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 1.5; circ(c, r.x + 120, r.y + 122, 20 + ((t * 10) % 20)); c.stroke();
    // Taller: brazo robótico moviéndose
    r = R('robotics');
    var bx = r.x + 40, by = r.y + 100, a1 = -0.6 + Math.sin(t * 1.2) * 0.6, a2b = 0.9 + Math.sin(t * 1.7) * 0.5;
    var ex = bx + Math.cos(a1) * 34, ey = by + Math.sin(a1) * 34, hx = ex + Math.cos(a1 + a2b) * 26, hy = ey + Math.sin(a1 + a2b) * 26;
    c.lineCap = 'round'; c.strokeStyle = OUT; c.lineWidth = 10; c.beginPath(); c.moveTo(bx, by); c.lineTo(ex, ey); c.lineTo(hx, hy); c.stroke();
    c.strokeStyle = '#f5a524'; c.lineWidth = 6; c.stroke(); c.lineCap = 'butt';
    circ(c, ex, ey, 5, '#5a6488', 1.5); circ(c, hx, hy, 4, '#8a94b8', 1.5);
    if (Math.sin(t * 9) > 0.7) for (i = 0; i < 4; i++) circ(c, hx + (rand(Math.floor(t * 20) + i) - 0.5) * 14, hy + (rand(Math.floor(t * 20) + i + 3) - 0.5) * 14, 1.5, '#fff6a0');
    circ(c, r.x + 175, r.y + 105, 5, Math.sin(t * 4) > 0 ? '#5bd8ff' : '#1a4a6a');
    // Fosa: luz de pez abisal que pasa por la ventana
    r = R('trench');
    c.save(); rr(c, r.x + 50, r.y + 40, 140, 100, 18); c.clip();
    var ax = r.x + 40 + ((t * 18) % 180), ay = r.y + 95 + Math.sin(t) * 18;
    var glow = c.createRadialGradient(ax + 20, ay - 18, 1, ax + 20, ay - 18, 22); glow.addColorStop(0, 'rgba(200,255,240,0.95)'); glow.addColorStop(1, 'rgba(120,255,220,0)');
    c.fillStyle = glow; c.beginPath(); c.arc(ax + 20, ay - 18, 22, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(30,60,90,0.9)'; c.beginPath(); c.ellipse(ax, ay, 18, 11, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = 'rgba(120,200,220,0.7)'; c.lineWidth = 1; c.beginPath(); c.moveTo(ax + 8, ay - 9); c.quadraticCurveTo(ax + 14, ay - 22, ax + 20, ay - 18); c.stroke();
    for (i = 0; i < 6; i++) circ(c, r.x + 60 + rand(i) * 120, r.y + 50 + rand(i + 4) * 80, 1, 'rgba(160,220,255,' + (0.3 + 0.3 * Math.sin(t * 2 + i)) + ')');
    c.restore();
    // Cúpula: peces, burbujas y un submarino en el acuario
    var hl = hole();
    c.save(); rr(c, hl.x, hl.y, hl.w, hl.h, 16); c.clip();
    var sbx = hl.x - 40 + ((t * 15) % (hl.w + 80)), sby = hl.y + 50 + Math.sin(t * 0.7) * 8;
    c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(sbx, sby, 24, 11, 0, 0, Math.PI * 2); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
    box(c, sbx - 6, sby - 18, 14, 9, '#ffd23f', 3, { lw: 1.6 });
    circ(c, sbx + 8, sby, 4, '#5bd8ff', 1.4); circ(c, sbx - 4, sby, 4, '#5bd8ff', 1.4);
    c.save(); c.translate(sbx - 26, sby); c.rotate(t * 8); c.fillStyle = '#8a94b8'; c.fillRect(-1.5, -6, 3, 12); c.restore();
    for (i = 0; i < 5; i++) { var fa = t * (0.5 + i * 0.15) + i * 1.7; fish(c, hl.x + hl.w / 2 + Math.cos(fa) * (60 + i * 6), hl.y + 70 + Math.sin(fa * 1.3) * 30, ['#ffb347', '#ff6fa8', '#7fd8ff', '#ffe066', '#57e3c9'][i], -Math.sin(fa) > 0 ? 1 : -1, 0.6, t); }
    for (i = 0; i < 8; i++) { c.strokeStyle = 'rgba(220,250,255,0.7)'; c.lineWidth = 1.2; circ(c, hl.x + 20 + i * 24, hl.y + hl.h - ((t * 20 + i * 17) % hl.h), 2.5); c.stroke(); }
    var shine = c.createLinearGradient(hl.x, hl.y, hl.x + hl.w, hl.y + hl.h); shine.addColorStop(0, 'rgba(255,255,255,0.18)'); shine.addColorStop(0.3, 'rgba(255,255,255,0)'); shine.addColorStop(1, 'rgba(255,255,255,0.05)');
    c.fillStyle = shine; c.fillRect(hl.x, hl.y, hl.w, hl.h);
    c.restore();
    // Fundición: fuego del horno
    r = R('foundry');
    var fg = c.createRadialGradient(r.x + 105, r.y + 50, 2, r.x + 105, r.y + 50, 24); fg.addColorStop(0, 'rgba(255,240,160,1)'); fg.addColorStop(0.5, 'rgba(255,140,40,' + (0.7 + 0.3 * Math.sin(t * 9)) + ')'); fg.addColorStop(1, 'rgba(200,40,20,0.2)');
    c.fillStyle = fg; rr(c, r.x + 84, r.y + 32, 42, 28, 5); c.fill();
    for (i = 0; i < 4; i++) { var sp = (t * 0.9 + i / 4) % 1; circ(c, r.x + 95 + i * 7 + Math.sin(t * 3 + i) * 4, r.y + 30 - sp * 26, 1.8, 'rgba(255,200,80,' + (1 - sp) + ')'); }
    // Reactor geotérmico: magma burbujeando
    r = R('reactor');
    var mx = r.x + 120, my = r.y + 122, alarm = opts.reactor, pulse = 0.5 + 0.5 * Math.sin(t * (alarm ? 10 : 2));
    var mg = c.createRadialGradient(mx, my, 3, mx, my, 40);
    mg.addColorStop(0, 'rgba(255,250,200,1)'); mg.addColorStop(0.4, alarm ? 'rgba(255,60,40,1)' : 'rgba(255,150,40,1)'); mg.addColorStop(1, alarm ? 'rgba(160,0,0,' + (0.5 + 0.4 * pulse) + ')' : 'rgba(180,40,20,' + (0.5 + 0.3 * pulse) + ')');
    circ(c, mx, my, 40, mg);
    for (i = 0; i < 5; i++) { var bp = (t * 0.7 + i / 5) % 1; circ(c, mx + Math.cos(i * 1.7) * 22 * (1 - bp), my + Math.sin(i * 1.7) * 18 * (1 - bp), 2 + bp * 5, 'rgba(255,220,120,' + (1 - bp) * 0.8 + ')'); }
    c.strokeStyle = alarm ? '#ff5050' : '#c86a3a'; c.lineWidth = 4; circ(c, mx, my, 45); c.stroke();
    for (i = 0; i < 3; i++) { var vp = (t * 0.4 + i / 3) % 1; c.fillStyle = 'rgba(220,220,230,' + 0.3 * (1 - vp) + ')'; c.beginPath(); c.arc(mx - 20 + i * 20, my - 50 - vp * 40, 8 + vp * 10, 0, Math.PI * 2); c.fill(); }
    // Cápsulas: luces de listo
    r = R('pods');
    [[r.x + 40, r.y + 50], [r.x + 110, r.y + 50], [r.x + 40, r.y + 130]].forEach(function (p, k) { circ(c, p[0] + 18, p[1] - 18, 3, Math.floor(t * 2 + k) % 2 ? '#57e389' : '#1a4a2a'); });
    // Control de emergencias: luz giratoria
    r = R('security');
    var la = t * 4;
    c.fillStyle = 'rgba(255,60,60,0.18)'; c.beginPath(); c.moveTo(r.x + 137, r.y + 72); c.arc(r.x + 137, r.y + 72, 50, la, la + 0.6); c.closePath(); c.fill();
    // Centro de mando: holograma del mapa
    r = R('admin');
    c.save(); c.globalAlpha = 0.55 + 0.25 * Math.sin(t * 3); c.fillStyle = '#5bd8ff';
    var hx2 = r.x + 92, hy2 = r.y + 82;
    c.fillRect(hx2 + 2, hy2 + 10, 12, 8); c.fillRect(hx2 + 20, hy2 + 2, 16, 10); c.fillRect(hx2 + 42, hy2 + 8, 12, 8); c.fillRect(hx2 + 22, hy2 + 16, 14, 10); c.fillRect(hx2 + 8, hy2 + 22, 10, 4);
    c.restore();
    c.strokeStyle = 'rgba(127,216,255,0.5)'; c.lineWidth = 1; c.beginPath(); c.moveTo(r.x + 86, r.y + 76 + ((t * 20) % 38)); c.lineTo(r.x + 154, r.y + 76 + ((t * 20) % 38)); c.stroke();
    // Electricidad: chispa
    r = R('electrical');
    for (i = 0; i < 2; i++) circ(c, r.x + 78 + i * 34, r.y + 18, 2, (Math.floor(t * 3 + i) % 3) ? '#57e389' : '#ff6b6b');
    if (Math.sin(t * 9) > 0.5) { c.strokeStyle = '#fff6a0'; c.lineWidth = 1.6; c.beginPath(); c.moveTo(r.x + 118, r.y + 72); c.lineTo(r.x + 124, r.y + 64); c.lineTo(r.x + 120, r.y + 62); c.lineTo(r.x + 128, r.y + 52); c.stroke(); }
    // Pasillos: luces azules que recorren el suelo
    MAP.corridors.forEach(function (k) {
      var horiz = k.w >= k.h, len = horiz ? k.w : k.h, n = Math.floor(len / 40);
      for (var j = 0; j < n; j++) {
        var on2 = ((j - t * 4) % n + n) % n < 1.5;
        var col = on2 ? 'rgba(160,250,255,0.95)' : 'rgba(127,232,255,0.3)';
        if (horiz) { circ(c, k.x + 20 + j * 40, k.y + 16, 2.2, col); circ(c, k.x + 20 + j * 40, k.y + k.h - 16, 2.2, col); }
        else { circ(c, k.x + 16, k.y + 20 + j * 40, 2.2, col); circ(c, k.x + k.w - 16, k.y + 20 + j * 40, 2.2, col); }
      }
    });
  }

  S.SKINS.abisal = {
    void: '#03142a', background: background, exteriorStatic: exteriorStatic, exteriorAnim: exteriorAnim,
    floor: floor, corridor: corridor, staticDecor: staticDecor, animDecor: animDecor, theme: THEME,
    hull: { top: '#35506a', band: '#1e3a52', bandHi: '#4f86a8', rim: '#5aa0c8', line: 'rgba(8,20,36,0.55)', pipes: ['#5a8aa6', '#8a7a5a', '#4a9a8a'] },
    wall: { base: '#1e3a52', face: ['#c8e0ee', '#9cc0d6', '#5f86a0'], windows: windows }
  };
})(window);
