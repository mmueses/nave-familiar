/* Dibujo compartido (tele y móvil): la nave, las estaciones y los personajes. Todo en coordenadas del mundo. */
(function (root) {
  var MAP = root.NAVE_MAP;
  var STARS = [];
  for (var i = 0; i < 260; i++) STARS.push([Math.random() * (MAP.w + 800) - 400, Math.random() * (MAP.h + 800) - 400, Math.random() * 1.8 + 0.3]);

  function rr(ctx, x, y, w, h, r, keepPath) {
    if (!keepPath) ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }
  function circle(ctx, x, y, r, fill) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); if (fill) { ctx.fillStyle = fill; ctx.fill(); } }
  function box(ctx, x, y, w, h, fill, r) { ctx.fillStyle = fill; rr(ctx, x, y, w, h, r || 3); ctx.fill(); }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }
  function unionPath(ctx, grow, rad) {
    ctx.beginPath();
    MAP.rects.forEach(function (r) { rr(ctx, r.x - grow, r.y - grow, r.w + grow * 2, r.h + grow * 2, rad, true); });
  }

  // ---------------- Exterior de la nave ----------------
  function exterior(ctx, t) {
    var eng = MAP.room('engines'), br = MAP.room('bridge'), cafe = MAP.room('cafe');
    ctx.lineJoin = 'round';
    // llamas y toberas de los motores
    [eng.y + 50, eng.y + eng.h - 50].forEach(function (cy, k) {
      var f = 1 + 0.15 * Math.sin(t * 20 + k * 2);
      var g = ctx.createLinearGradient(eng.x - 40, 0, eng.x - 40 - 70 * f, 0);
      g.addColorStop(0, 'rgba(255,240,150,0.95)'); g.addColorStop(0.4, 'rgba(255,140,40,0.8)'); g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(eng.x - 40, cy - 18); ctx.quadraticCurveTo(eng.x - 40 - 80 * f, cy, eng.x - 40, cy + 18); ctx.fill();
      ctx.fillStyle = '#39406a';
      ctx.beginPath(); ctx.moveTo(eng.x - 20, cy - 26); ctx.lineTo(eng.x - 44, cy - 20); ctx.lineTo(eng.x - 44, cy + 20); ctx.lineTo(eng.x - 20, cy + 26); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#7f8ac0'; ctx.lineWidth = 3; ctx.stroke();
    });
    // morro (delante del puente)
    ctx.fillStyle = '#232b52'; ctx.strokeStyle = '#7f8ac0'; ctx.lineWidth = 4;
    var cy = br.y + br.h / 2, nx = br.x + br.w + 26;
    ctx.beginPath(); ctx.moveTo(nx, br.y - 10); ctx.quadraticCurveTo(nx + 70, cy, nx, br.y + br.h + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    // alas
    ctx.fillStyle = '#20284c';
    ctx.beginPath(); ctx.moveTo(300, 40); ctx.lineTo(250, -30); ctx.lineTo(400, -30); ctx.lineTo(450, 40); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(560, 715); ctx.lineTo(600, 775); ctx.lineTo(740, 775); ctx.lineTo(680, 715); ctx.closePath(); ctx.fill(); ctx.stroke();
    // antena sobre el comedor
    ctx.strokeStyle = '#7f8ac0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cafe.x + 200, cafe.y - 30); ctx.lineTo(cafe.x + 215, cafe.y - 58); ctx.stroke();
    circle(ctx, cafe.x + 215, cafe.y - 60, 5, Math.sin(t * 3) > 0 ? '#ff5050' : '#702020');
    // casco
    ctx.fillStyle = '#1c2340'; unionPath(ctx, 30, 26); ctx.fill();
    ctx.strokeStyle = '#3d4675'; ctx.lineWidth = 4; ctx.stroke();
    // ojos de buey
    [[cafe.x + 50, cafe.y - 18], [cafe.x + 130, cafe.y - 18], [cafe.x + 210, cafe.y - 18], [720, 718], [800, 718], [340, 718], [440, 718]].forEach(function (p) {
      circle(ctx, p[0], p[1], 8, '#0d1430');
      ctx.strokeStyle = '#9aa5d8'; ctx.lineWidth = 2; ctx.stroke();
      circle(ctx, p[0] - 2, p[1] - 2, 3, 'rgba(160,210,255,0.6)');
    });
  }

  // ---------------- Suelos ----------------
  function floor(ctx, r, t) {
    ctx.save();
    rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.clip();
    ctx.fillStyle = r.floor; ctx.fillRect(r.x, r.y, r.w, r.h);
    var i, j;
    if (r.id === 'cafe') {
      for (i = 0; i < r.w / 26; i++) for (j = 0; j < r.h / 26; j++) if ((i + j) % 2) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(r.x + i * 26, r.y + j * 26, 26, 26); }
    } else if (r.id === 'medbay' || r.id === 'lab') {
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
      for (i = r.x; i < r.x + r.w; i += 20) { ctx.beginPath(); ctx.moveTo(i, r.y); ctx.lineTo(i, r.y + r.h); ctx.stroke(); }
      for (j = r.y; j < r.y + r.h; j += 20) { ctx.beginPath(); ctx.moveTo(r.x, j); ctx.lineTo(r.x + r.w, j); ctx.stroke(); }
    } else if (r.id === 'engines') {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;
      for (i = -r.h; i < r.w; i += 14) { ctx.beginPath(); ctx.moveTo(r.x + i, r.y); ctx.lineTo(r.x + i + r.h, r.y + r.h); ctx.stroke(); }
    } else if (r.id === 'storage') {
      ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 2;
      for (j = r.y; j < r.y + r.h; j += 18) { ctx.beginPath(); ctx.moveTo(r.x, j); ctx.lineTo(r.x + r.w, j); ctx.stroke(); }
    } else if (r.id === 'green') {
      for (i = 0; i < 40; i++) circle(ctx, r.x + (i * 37) % r.w, r.y + (i * 53) % r.h, 2, 'rgba(120,80,40,0.35)');
    } else if (r.id === 'bridge') {
      ctx.strokeStyle = 'rgba(120,220,255,0.12)'; ctx.lineWidth = 2;
      circle(ctx, r.x + r.w / 2 - 10, r.y + r.h / 2, 60); ctx.stroke();
      circle(ctx, r.x + r.w / 2 - 10, r.y + r.h / 2, 35); ctx.stroke();
    }
    ctx.restore();
  }

  // ---------------- Muebles y detalles de cada sala ----------------
  function table(ctx, x, y) {
    [[-26, 0], [26, 0], [0, -24], [0, 24]].forEach(function (o) { circle(ctx, x + o[0], y + o[1], 7, '#6a7090'); });
    circle(ctx, x, y + 3, 20, 'rgba(0,0,0,0.25)');
    circle(ctx, x, y, 20, '#c9cde0');
    circle(ctx, x, y, 14, '#dfe2ef');
    circle(ctx, x - 5, y - 3, 3, '#f5a524'); circle(ctx, x + 6, y + 4, 3, '#e5484d');
  }
  function crate(ctx, x, y, s) {
    box(ctx, x, y, s, s, '#9a6b3a', 2);
    ctx.strokeStyle = '#6b4520'; ctx.lineWidth = 2;
    ctx.strokeRect(x + 2, y + 2, s - 4, s - 4);
    ctx.beginPath(); ctx.moveTo(x + 3, y + 3); ctx.lineTo(x + s - 3, y + s - 3); ctx.moveTo(x + s - 3, y + 3); ctx.lineTo(x + 3, y + s - 3); ctx.stroke();
  }
  function plant(ctx, x, y, t, k) {
    var sw = Math.sin(t * 2 + k) * 2;
    ctx.fillStyle = '#2f8a3a';
    for (var a = 0; a < 5; a++) {
      var ang = a / 5 * Math.PI * 2;
      ctx.beginPath(); ctx.ellipse(x + Math.cos(ang) * 6 + sw * 0.5, y + Math.sin(ang) * 6, 6, 3.5, ang, 0, Math.PI * 2); ctx.fill();
    }
    circle(ctx, x + sw * 0.5, y, 4, '#5fd06a');
    if (k % 2) circle(ctx, x + 3 + sw * 0.5, y - 3, 2.5, '#ff6fa8');
  }
  function lightsRow(ctx, x, y, n, t) {
    for (var i = 0; i < n; i++) circle(ctx, x + i * 8, y, 2.2, (Math.floor(t * 3 + i * 1.7) % 3) ? '#57e389' : '#ff6b6b');
  }
  function decor(ctx, t) {
    var r, i;
    // Comedor
    r = MAP.room('cafe');
    table(ctx, r.x + 62, r.y + 152); table(ctx, r.x + 198, r.y + 152);
    box(ctx, r.x + 222, r.y + 6, 32, 44, '#2a3a6a', 4);            // máquina de bebidas
    box(ctx, r.x + 226, r.y + 10, 24, 22, '#5bc0ff', 2);
    for (i = 0; i < 3; i++) circle(ctx, r.x + 232 + i * 6, r.y + 40, 2, ['#ff6b6b', '#ffe66b', '#57e389'][i]);
    box(ctx, r.x + 8, r.y + 180, 22, 24, '#5a6488', 4);             // papelera
    box(ctx, r.x + 6, r.y + 178, 26, 6, '#7a84a8', 2);
    // Enfermería
    r = MAP.room('medbay');
    [r.y + 8, r.y + 42].forEach(function (y) {
      box(ctx, r.x + 75, y, 70, 26, '#d9dde8', 5);
      box(ctx, r.x + 125, y + 3, 17, 20, '#ffffff', 4);
      box(ctx, r.x + 75, y + 16, 48, 10, '#6fb6ff', 3);
    });
    ctx.fillStyle = 'rgba(229,72,77,0.55)';
    ctx.fillRect(r.x + 30, r.y + 96, 30, 10); ctx.fillRect(r.x + 40, r.y + 86, 10, 30);
    ctx.strokeStyle = 'rgba(80,230,255,0.6)'; ctx.lineWidth = 3;
    circle(ctx, r.x + 40, r.y + 35, 26); ctx.stroke();
    // Invernadero
    r = MAP.room('green');
    box(ctx, r.x + 55, r.y + 14, 80, 22, '#6b4a2a', 4);
    box(ctx, r.x + 20, r.y + 88, 90, 22, '#6b4a2a', 4);
    for (i = 0; i < 4; i++) plant(ctx, r.x + 66 + i * 19, r.y + 25, t, i);
    for (i = 0; i < 4; i++) plant(ctx, r.x + 32 + i * 22, r.y + 99, t, i + 4);
    circle(ctx, r.x + 150, r.y + 24, 15, '#2a5d9a');
    circle(ctx, r.x + 150, r.y + 24, 10, 'rgba(110,190,255,0.8)');
    // Motores: turbina que gira
    r = MAP.room('engines');
    var cx = r.x + 85, cy = r.y + 117;
    circle(ctx, cx, cy, 46, '#2b2440');
    ctx.strokeStyle = '#8a7fb8'; ctx.lineWidth = 4; ctx.stroke();
    var glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 40);
    glow.addColorStop(0, 'rgba(255,190,90,0.95)'); glow.addColorStop(1, 'rgba(255,90,40,0.15)');
    circle(ctx, cx, cy, 40, glow);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 4);
    ctx.fillStyle = '#4a4068';
    for (i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.ellipse(18, 0, 18, 6, 0.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    circle(ctx, cx, cy, 8, '#c9b8ff');
    ctx.fillStyle = '#5b6488'; ctx.fillRect(r.x + 10, r.y + 6, r.w - 20, 7); ctx.fillRect(r.x + r.w - 18, r.y + 6, 7, 60);
    for (i = 0; i < 5; i++) { ctx.fillStyle = i % 2 ? '#1b1b2a' : '#f2d63a'; ctx.fillRect(r.x + 150 + i * 10, r.y + 200, 10, 8); }
    // Puente: ventanal, consola y sillón
    r = MAP.room('bridge');
    ctx.save();
    rr(ctx, r.x + r.w - 26, r.y + 30, 22, r.h - 60, 8); ctx.clip();
    ctx.fillStyle = '#05081a'; ctx.fillRect(r.x + r.w - 26, r.y + 30, 22, r.h - 60);
    for (i = 0; i < 14; i++) circle(ctx, r.x + r.w - 24 + ((i * 7 + t * 30) % 20), r.y + 34 + (i * 29) % (r.h - 66), 1.2, '#fff');
    ctx.restore();
    ctx.strokeStyle = '#9ad8ff'; ctx.lineWidth = 3; rr(ctx, r.x + r.w - 26, r.y + 30, 22, r.h - 60, 8); ctx.stroke();
    ctx.fillStyle = '#34507a';
    ctx.beginPath(); ctx.arc(r.x + 95, r.y + r.h / 2, 52, -1.0, 1.0); ctx.arc(r.x + 95, r.y + r.h / 2, 36, 1.0, -1.0, true); ctx.closePath(); ctx.fill();
    lightsRow(ctx, r.x + 120, r.y + 70, 3, t); lightsRow(ctx, r.x + 124, r.y + 110, 3, t + 1);
    circle(ctx, r.x + 85, r.y + r.h / 2, 12, '#8a3a3a');
    box(ctx, r.x + 70, r.y + r.h / 2 - 12, 8, 24, '#6a2a2a', 3);
    // Laboratorio: mesa con tubos, tanque burbujeante
    r = MAP.room('lab');
    box(ctx, r.x + 20, r.y + 150, 110, 22, '#c9cde0', 4);
    ['#ff6b6b', '#57e389', '#6fb6ff', '#ffe66b', '#c58bff'].forEach(function (c, k) {
      box(ctx, r.x + 30 + k * 20, r.y + 138, 8, 18, 'rgba(255,255,255,0.5)', 3);
      box(ctx, r.x + 30 + k * 20, r.y + 146, 8, 10, c, 2);
    });
    var tx = r.x + 175, ty = r.y + 45;
    box(ctx, tx - 16, ty - 26, 32, 56, 'rgba(120,255,190,0.25)', 12);
    ctx.strokeStyle = '#9ad8ff'; ctx.lineWidth = 2; rr(ctx, tx - 16, ty - 26, 32, 56, 12); ctx.stroke();
    for (i = 0; i < 4; i++) circle(ctx, tx - 6 + (i * 5) % 12, ty + 22 - ((t * 25 + i * 14) % 46), 2.5, 'rgba(220,255,240,0.8)');
    box(ctx, tx - 18, ty + 28, 36, 8, '#5a6488', 3);
    // Almacén: cajas y barriles
    r = MAP.room('storage');
    crate(ctx, r.x + 130, r.y + 10, 32); crate(ctx, r.x + 164, r.y + 10, 32); crate(ctx, r.x + 147, r.y + 44, 30);
    crate(ctx, r.x + 10, r.y + 120, 26);
    [[r.x + 30, r.y + 160], [r.x + 56, r.y + 164]].forEach(function (p) {
      circle(ctx, p[0], p[1], 12, '#3e7bfa'); ctx.strokeStyle = '#2a4fa8'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p[0] - 12, p[1]); ctx.lineTo(p[0] + 12, p[1]); ctx.stroke();
    });
    // Luces de los pasillos
    MAP.corridors.forEach(function (c) {
      var horiz = c.w > c.h, n = Math.floor((horiz ? c.w : c.h) / 70);
      for (var k = 1; k <= n; k++) {
        var on = 0.5 + 0.5 * Math.sin(t * 2 + k);
        var col = 'rgba(255,230,120,' + (0.35 + 0.4 * on) + ')';
        if (horiz) { circle(ctx, c.x + k * 70 - 35, c.y + 4, 2.5, col); circle(ctx, c.x + k * 70 - 35, c.y + c.h - 4, 2.5, col); }
        else { circle(ctx, c.x + 4, c.y + k * 70 - 35, 2.5, col); circle(ctx, c.x + c.w - 4, c.y + k * 70 - 35, 2.5, col); }
      }
    });
  }

  // opts: { labels: bool, t: segundos (animación), highlight: [ids de estación], lightsOut: bool, tr: función de textos }
  function ship(ctx, opts) {
    opts = opts || {};
    var t = opts.t || 0;
    ctx.fillStyle = '#0b1026';
    ctx.fillRect(-500, -500, MAP.w + 1000, MAP.h + 1000);
    STARS.forEach(function (s) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 1.5 + s[0]);
      ctx.fillStyle = '#fff';
      ctx.fillRect(s[0], s[1], s[2], s[2]);
    });
    ctx.globalAlpha = 1;
    exterior(ctx, t);
    // paredes: capa metálica alrededor de salas y pasillos
    ctx.fillStyle = '#8a94b8'; unionPath(ctx, 12, 12); ctx.fill();
    ctx.fillStyle = '#5b6590'; unionPath(ctx, 4, 8); ctx.fill();
    // salas
    MAP.rooms.forEach(function (r) { floor(ctx, r, t); });
    // pasillos (encima, para "abrir" las puertas)
    MAP.corridors.forEach(function (r) {
      ctx.fillStyle = '#4b5470';
      ctx.fillRect(r.x, r.y, r.w, r.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 2;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      if (r.w > r.h) { ctx.moveTo(r.x + 8, r.y + r.h / 2); ctx.lineTo(r.x + r.w - 8, r.y + r.h / 2); }
      else { ctx.moveTo(r.x + r.w / 2, r.y + 8); ctx.lineTo(r.x + r.w / 2, r.y + r.h - 8); }
      ctx.stroke();
      ctx.setLineDash([]);
    });
    decor(ctx, t);
    if (opts.labels) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 17px system-ui, sans-serif';
      var LABELS = { cafe: [600, 234], medbay: [215, 188], green: [960, 188], engines: [145, 456],
                     bridge: [1060, 286], lab: [410, 536], storage: [755, 536] };
      MAP.rooms.forEach(function (r) {
        var p = LABELS[r.id] || [r.x + r.w / 2, r.y + 18];
        var label = opts.tr ? opts.tr(r.name) : r.name;
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeText(label, p[0], p[1]);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(label, p[0], p[1]);
      });
    }
    var hl = opts.highlight || [];
    MAP.stations.forEach(function (s) { station(ctx, s, t, hl.indexOf(s.id) >= 0, opts.lightsOut); });
  }

  function station(ctx, s, t, highlight, lightsOut) {
    ctx.save();
    ctx.translate(s.x, s.y);
    if (highlight) {
      var p = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.strokeStyle = 'rgba(255,230,80,' + (0.5 + 0.5 * p) + ')';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 22 + p * 4, 0, Math.PI * 2); ctx.stroke();
    }
    if (s.type === 'emergency') {
      box(ctx, -20, -20, 40, 40, '#5a6488', 8);
      circle(ctx, 0, 0, 15, '#6b6f80');
      circle(ctx, 0, -2, 11, '#e5484d');
      circle(ctx, -4, -6, 3.5, 'rgba(255,255,255,0.5)');
    } else if (s.type === 'lights') {
      box(ctx, -14, -18, 28, 36, '#2a2f40', 4);
      var on = !lightsOut || (Math.sin(t * 8) > 0);
      ctx.fillStyle = lightsOut ? (on ? '#ff5050' : '#552020') : '#f2d63a';
      for (var i = 0; i < 3; i++) ctx.fillRect(-8, -12 + i * 10, 16, 6);
    } else {
      var col = { wires: '#f5a524', numbers: '#3e7bfa', download: '#30a46c', calibrate: '#8e4ec6' }[s.type] || '#999';
      box(ctx, -15, -15, 30, 30, '#2a2f40', 5);
      box(ctx, -10, -10, 20, 20, col, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText({ wires: '⚡', numbers: '#', download: '↓', calibrate: '◎' }[s.type] || '?', 0, 1);
    }
    ctx.restore();
  }

  // Astronauta original: casco redondo con visera (se le ven los ojos), traje, mochila, brazos y botas.
  // opts: { name, ghost, walk (fase), dir (-1|1), scale }
  function character(ctx, x, y, hex, opts) {
    opts = opts || {};
    var sc = opts.scale || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc * (opts.dir || 1), sc);
    if (opts.ghost) ctx.globalAlpha = 0.45;
    var ph = opts.walk ? opts.walk * Math.PI * 2 : 0;
    var step = opts.walk ? Math.sin(ph) * 3.5 : 0;
    var bob = opts.walk ? Math.abs(Math.sin(ph)) * -1.5 : 0;
    var dark = shade(hex, -0.35), light = shade(hex, 0.35);
    // sombra
    if (!opts.ghost) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 16, 12, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    // piernas y botas
    box(ctx, -8 + step, 5, 7, 9, hex, 3); box(ctx, 1 - step, 5, 7, 9, hex, 3);
    box(ctx, -9 + step, 11, 9, 5, '#e8e8ee', 2); box(ctx, 0 - step, 11, 9, 5, '#e8e8ee', 2);
    ctx.translate(0, bob);
    // mochila (detrás)
    box(ctx, -17, -10, 8, 18, dark, 3);
    box(ctx, -16, -8, 3, 6, light, 1);
    // brazo de atrás
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.ellipse(-10, 0 - step * 0.4, 3.5, 6, 0.3, 0, Math.PI * 2); ctx.fill();
    // cuerpo
    var g = ctx.createLinearGradient(-11, -8, 11, 10);
    g.addColorStop(0, light); g.addColorStop(1, hex);
    ctx.fillStyle = g; rr(ctx, -11, -8, 22, 17, 6); ctx.fill();
    ctx.strokeStyle = dark; ctx.lineWidth = 1.3; ctx.stroke();
    // cinturón y panel del pecho
    ctx.fillStyle = dark; ctx.fillRect(-11, 4, 22, 2.5);
    box(ctx, 1, -4, 8, 6, '#e8e8ee', 1.5);
    circle(ctx, 3.5, -1, 1.2, '#e5484d'); circle(ctx, 6.5, -1, 1.2, '#30a46c');
    // brazo de delante
    ctx.fillStyle = hex;
    ctx.beginPath(); ctx.ellipse(10, 0 + step * 0.4, 3.5, 6, -0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = dark; ctx.stroke();
    circle(ctx, 11, 5 + step * 0.4, 2.8, '#e8e8ee');
    // casco
    var hg = ctx.createRadialGradient(-4, -24, 2, 0, -18, 14);
    hg.addColorStop(0, '#ffffff'); hg.addColorStop(1, '#cfd3e3');
    circle(ctx, 0, -18, 13, hg);
    ctx.strokeStyle = '#8890ad'; ctx.lineWidth = 1.5; ctx.stroke();
    // banda de color del casco
    ctx.strokeStyle = hex; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -18, 11.5, Math.PI * 0.9, Math.PI * 1.35); ctx.stroke();
    // visera redonda con cara
    var vg = ctx.createLinearGradient(0, -27, 0, -9);
    vg.addColorStop(0, '#2a4a8a'); vg.addColorStop(1, '#0f1d40');
    circle(ctx, 3, -17, 9, vg);
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(0.5, -17.5, 2.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6.5, -17.5, 2.2, 2.8, 0, 0, Math.PI * 2); ctx.fill();
    circle(ctx, 1.2, -17, 1.1, '#111'); circle(ctx, 7.2, -17, 1.1, '#111');
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(3, -17, 6.5, Math.PI * 1.1, Math.PI * 1.45); ctx.stroke();
    // antena
    ctx.strokeStyle = '#8890ad'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-6, -29); ctx.lineTo(-8, -35); ctx.stroke();
    circle(ctx, -8, -36, 2.2, hex);
    ctx.restore();
    if (opts.name) {
      ctx.save();
      ctx.font = 'bold ' + Math.round(11 * sc) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      if (opts.ghost) ctx.globalAlpha = 0.6;
      ctx.strokeText(opts.name, x, y - 39 * sc);
      ctx.fillStyle = opts.nameColor || '#fff';
      ctx.fillText(opts.name, x, y - 39 * sc);
      ctx.restore();
    }
  }

  // Jugador congelado: el astronauta dentro de un bloque de hielo
  function frozen(ctx, x, y, hex, t) {
    character(ctx, x, y, hex, {});
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(160,220,255,0.45)';
    ctx.strokeStyle = 'rgba(220,245,255,0.9)';
    ctx.lineWidth = 2;
    rr(ctx, -21, -40, 42, 60, 6); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.moveTo(-14, -30); ctx.lineTo(-5, -37); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-16, -18); ctx.lineTo(-11, -23); ctx.stroke();
    var sp = 0.5 + 0.5 * Math.sin((t || 0) * 4);
    circle(ctx, 13, -30, 2, 'rgba(255,255,255,' + sp + ')');
    ctx.restore();
  }

  // Avatar pequeño para listas (dibuja en su propio canvas)
  function avatarCanvas(hex, size, opts) {
    var c = document.createElement('canvas');
    var dpr = window.devicePixelRatio || 1;
    c.width = size * dpr; c.height = size * dpr;
    c.style.width = size + 'px'; c.style.height = size + 'px';
    var ctx = c.getContext('2d');
    ctx.scale(dpr * size / 64, dpr * size / 64);
    if (opts && opts.frozen) frozen(ctx, 32, 43, hex, 0);
    else character(ctx, 32, 42, hex, { ghost: opts && opts.ghost, scale: 1.15 });
    return c;
  }

  root.DRAW = { ship: ship, character: character, frozen: frozen, avatarCanvas: avatarCanvas, rr: rr };
})(window);
