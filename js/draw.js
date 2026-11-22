/* Dibujo compartido (tele y móvil): la nave, las estaciones y los personajes. Todo en coordenadas del mundo. */
(function (root) {
  var MAP = root.NAVE_MAP;
  var STARS = [];
  for (var i = 0; i < 320; i++) STARS.push([Math.random() * (MAP.w + 800) - 400, Math.random() * (MAP.h + 800) - 400, Math.random() * 1.8 + 0.3]);

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
  function unionPath(ctx, grow, rad, top) {
    ctx.beginPath();
    MAP.rects.forEach(function (r) { var tg = top || grow; rr(ctx, r.x - grow, r.y - tg, r.w + grow * 2, r.h + grow + tg, rad, true); });
  }
  function isHoriz(r) { return MAP.rooms.indexOf(r) >= 0 || r.w >= r.h; }

  // ---------------- Exterior de la nave ----------------
  function exterior(ctx, t) {
    var rear = MAP.room('reactor'), br = MAP.room('bridge'), cafe = MAP.room('cafe');
    ctx.lineJoin = 'round';
    [rear.y + 50, rear.y + rear.h - 50].forEach(function (cy, k) {
      var f = 1 + 0.15 * Math.sin(t * 20 + k * 2);
      var x0 = rear.x - 44;
      var g = ctx.createLinearGradient(x0, 0, x0 - 75 * f, 0);
      g.addColorStop(0, 'rgba(255,240,150,0.95)'); g.addColorStop(0.4, 'rgba(255,140,40,0.8)'); g.addColorStop(1, 'rgba(255,60,20,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.moveTo(x0, cy - 20); ctx.quadraticCurveTo(x0 - 90 * f, cy, x0, cy + 20); ctx.fill();
      ctx.fillStyle = '#39406a';
      ctx.beginPath(); ctx.moveTo(rear.x - 24, cy - 28); ctx.lineTo(x0 - 4, cy - 22); ctx.lineTo(x0 - 4, cy + 22); ctx.lineTo(rear.x - 24, cy + 28); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#7f8ac0'; ctx.lineWidth = 3; ctx.stroke();
    });
    ctx.fillStyle = '#232b52'; ctx.strokeStyle = '#7f8ac0'; ctx.lineWidth = 4;
    var cy = br.y + br.h / 2, nx = br.x + br.w + 30;
    ctx.beginPath(); ctx.moveTo(nx, br.y - 10); ctx.quadraticCurveTo(nx + 80, cy, nx, br.y + br.h + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#20284c';
    ctx.beginPath(); ctx.moveTo(250, 340); ctx.lineTo(170, 250); ctx.lineTo(330, 250); ctx.lineTo(380, 300); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(250, 560); ctx.lineTo(150, 650); ctx.lineTo(250, 690); ctx.lineTo(290, 620); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(900, 830); ctx.lineTo(930, 900); ctx.lineTo(1020, 900); ctx.lineTo(990, 830); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#7f8ac0'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cafe.x + 230, cafe.y - 40); ctx.lineTo(cafe.x + 245, cafe.y - 72); ctx.stroke();
    circle(ctx, cafe.x + 245, cafe.y - 74, 5, Math.sin(t * 3) > 0 ? '#ff5050' : '#702020');
    ctx.fillStyle = '#161c36'; unionPath(ctx, 34, 26, 48); ctx.fill();
    ctx.strokeStyle = '#3d4675'; ctx.lineWidth = 4; ctx.stroke();
  }

  // ---------------- Paredes: cuerpo oscuro + "frente" visible en el borde superior ----------------
  function walls(ctx) {
    ctx.fillStyle = '#262c4a'; unionPath(ctx, 12, 10, 12); ctx.fill();
    var F = MAP.wallFace;
    MAP.rects.forEach(function (r) {
      if (!isHoriz(r)) return;
      MAP.topWalls(r).forEach(function (sg) {
        var x = sg[0], w = sg[1] - sg[0], y = r.y - F;
        if (w <= 2) return;
        var g = ctx.createLinearGradient(0, y, 0, r.y);
        g.addColorStop(0, '#c3c9dc'); g.addColorStop(0.35, '#a6aec8'); g.addColorStop(1, '#7a83a3');
        ctx.fillStyle = g; ctx.fillRect(x, y, w, F);
        ctx.fillStyle = '#5d6687'; ctx.fillRect(x, y + F * 0.42, w, 2);
        ctx.fillStyle = '#3b4262'; ctx.fillRect(x, r.y - 3, w, 3);
        ctx.fillStyle = '#e4e8f2'; ctx.fillRect(x, y, w, 2);
        for (var px = x + 40; px < x + w - 20; px += 70) {
          ctx.fillStyle = 'rgba(40,46,70,0.35)'; ctx.fillRect(px, y + 2, 2, F - 5);
          if (((px / 70) | 0) % 3 === 0) { box(ctx, px + 14, y + 6, 22, 11, '#3b4262', 2); box(ctx, px + 16, y + 8, 18, 7, '#5a7bb0', 1); }
        }
      });
    });
  }

  // ---------------- Suelos ----------------
  function floor(ctx, r, t) {
    ctx.save();
    ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
    ctx.fillStyle = r.floor; ctx.fillRect(r.x, r.y, r.w, r.h);
    var i, j;
    if (r.id === 'cafe') {
      for (i = 0; i < r.w / 30; i++) for (j = 0; j < r.h / 30; j++) if ((i + j) % 2) { ctx.fillStyle = 'rgba(255,255,255,0.05)'; ctx.fillRect(r.x + i * 30, r.y + j * 30, 30, 30); }
    } else if (r.id === 'medbay' || r.id === 'lab') {
      ctx.strokeStyle = 'rgba(255,255,255,0.10)'; ctx.lineWidth = 1;
      for (i = r.x; i < r.x + r.w; i += 22) { ctx.beginPath(); ctx.moveTo(i, r.y); ctx.lineTo(i, r.y + r.h); ctx.stroke(); }
      for (j = r.y; j < r.y + r.h; j += 22) { ctx.beginPath(); ctx.moveTo(r.x, j); ctx.lineTo(r.x + r.w, j); ctx.stroke(); }
    } else if (r.id === 'engines') {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 2;
      for (i = -r.h; i < r.w; i += 14) { ctx.beginPath(); ctx.moveTo(r.x + i, r.y); ctx.lineTo(r.x + i + r.h, r.y + r.h); ctx.stroke(); }
    } else if (r.id === 'storage') {
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2;
      for (j = r.y; j < r.y + r.h; j += 20) { ctx.beginPath(); ctx.moveTo(r.x, j); ctx.lineTo(r.x + r.w, j); ctx.stroke(); }
      for (j = 0; j < r.h / 20; j++) for (i = (j % 2) * 40; i < r.w; i += 80) { ctx.beginPath(); ctx.moveTo(r.x + i, r.y + j * 20); ctx.lineTo(r.x + i, r.y + j * 20 + 20); ctx.stroke(); }
    } else if (r.id === 'green') {
      for (i = 0; i < 50; i++) circle(ctx, r.x + (i * 37) % r.w, r.y + (i * 53) % r.h, 2, 'rgba(120,80,40,0.35)');
    } else if (r.id === 'reactor') {
      ctx.strokeStyle = 'rgba(255,120,120,0.12)'; ctx.lineWidth = 2;
      for (i = 1; i < 6; i++) { circle(ctx, r.x + 110, r.y + 155, i * 24); ctx.stroke(); }
    } else if (r.id === 'electrical') {
      ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
      for (j = r.y; j < r.y + r.h; j += 16) { ctx.beginPath(); ctx.moveTo(r.x, j); ctx.lineTo(r.x + r.w, j); ctx.stroke(); }
      for (i = 0; i < r.w; i += 20) { ctx.fillStyle = (i / 20) % 2 ? 'rgba(0,0,0,0.3)' : 'rgba(242,214,58,0.3)'; ctx.fillRect(r.x + i, r.y + r.h - 10, 20, 10); }
    } else if (r.id === 'bridge') {
      ctx.strokeStyle = 'rgba(120,220,255,0.12)'; ctx.lineWidth = 2;
      circle(ctx, r.x + 120, r.y + 100, 70); ctx.stroke();
      circle(ctx, r.x + 120, r.y + 100, 40); ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255,255,255,0.07)'; ctx.lineWidth = 1;
      for (i = r.x; i < r.x + r.w; i += 18) { ctx.beginPath(); ctx.moveTo(i, r.y); ctx.lineTo(i, r.y + r.h); ctx.stroke(); }
      for (j = r.y; j < r.y + r.h; j += 18) { ctx.beginPath(); ctx.moveTo(r.x, j); ctx.lineTo(r.x + r.w, j); ctx.stroke(); }
    }
    // sombra suave bajo la pared de arriba
    var sg = ctx.createLinearGradient(0, r.y, 0, r.y + 18);
    sg.addColorStop(0, 'rgba(0,0,0,0.35)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = sg; ctx.fillRect(r.x, r.y, r.w, 18);
    ctx.restore();
  }
  // Pasillos: suelo de madera en los bordes y alfombra azul en el centro
  function corridorFloor(ctx, c) {
    ctx.fillStyle = '#9a7650'; ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
    var horiz = c.w >= c.h, k;
    if (horiz) for (k = c.y + 7; k < c.y + c.h; k += 7) { ctx.beginPath(); ctx.moveTo(c.x, k); ctx.lineTo(c.x + c.w, k); ctx.stroke(); }
    else for (k = c.x + 7; k < c.x + c.w; k += 7) { ctx.beginPath(); ctx.moveTo(k, c.y); ctx.lineTo(k, c.y + c.h); ctx.stroke(); }
    ctx.fillStyle = '#4c68a6';
    if (horiz) ctx.fillRect(c.x, c.y + 14, c.w, c.h - 28); else ctx.fillRect(c.x + 14, c.y, c.w - 28, c.h);
    ctx.strokeStyle = '#33497a'; ctx.lineWidth = 2;
    ctx.beginPath();
    if (horiz) { ctx.moveTo(c.x, c.y + 14); ctx.lineTo(c.x + c.w, c.y + 14); ctx.moveTo(c.x, c.y + c.h - 14); ctx.lineTo(c.x + c.w, c.y + c.h - 14); }
    else { ctx.moveTo(c.x + 14, c.y); ctx.lineTo(c.x + 14, c.y + c.h); ctx.moveTo(c.x + c.w - 14, c.y); ctx.lineTo(c.x + c.w - 14, c.y + c.h); }
    ctx.stroke();
    if (horiz) { var sg = ctx.createLinearGradient(0, c.y, 0, c.y + 14); sg.addColorStop(0, 'rgba(0,0,0,0.35)'); sg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = sg; ctx.fillRect(c.x, c.y, c.w, 14); }
  }

  // ---------------- Muebles y detalles ----------------
  function table(ctx, x, y) {
    [[-28, 0], [28, 0], [0, -26], [0, 26]].forEach(function (o) { circle(ctx, x + o[0], y + o[1], 8, '#6a7090'); });
    circle(ctx, x, y + 4, 22, 'rgba(0,0,0,0.25)');
    circle(ctx, x, y, 22, '#c9cde0');
    circle(ctx, x, y, 15, '#dfe2ef');
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
  function windowStrip(ctx, x, y, w, h, t, rocks) {
    ctx.save();
    rr(ctx, x, y, w, h, 8); ctx.clip();
    ctx.fillStyle = '#05081a'; ctx.fillRect(x, y, w, h);
    for (var i = 0; i < 16; i++) circle(ctx, x + 3 + ((i * 7 + t * 30) % (w - 4)), y + 4 + (i * 29) % (h - 8), 1.2, '#fff');
    if (rocks) for (i = 0; i < 4; i++) circle(ctx, x + w / 2 + Math.sin(t + i) * 5, y + ((t * 25 + i * 37) % h), 4, '#8a7a6a');
    ctx.restore();
    ctx.strokeStyle = '#9ad8ff'; ctx.lineWidth = 3; rr(ctx, x, y, w, h, 8); ctx.stroke();
  }
  function decor(ctx, t, opts) {
    var r, i;
    // Comedor
    r = MAP.room('cafe');
    table(ctx, r.x + 75, r.y + 175); table(ctx, r.x + 225, r.y + 175);
    box(ctx, r.x + 225, r.y + 8, 34, 46, '#2a3a6a', 4);
    box(ctx, r.x + 229, r.y + 12, 26, 24, '#5bc0ff', 2);
    for (i = 0; i < 3; i++) circle(ctx, r.x + 236 + i * 6, r.y + 44, 2, ['#ff6b6b', '#ffe66b', '#57e389'][i]);
    box(ctx, r.x + 10, r.y + 205, 22, 26, '#5a6488', 4);
    box(ctx, r.x + 8, r.y + 203, 26, 6, '#7a84a8', 2);
    // Enfermería
    r = MAP.room('medbay');
    [r.y + 46, r.y + 90].forEach(function (y) {
      box(ctx, r.x + 85, y, 72, 26, '#d9dde8', 5);
      box(ctx, r.x + 137, y + 3, 17, 20, '#ffffff', 4);
      box(ctx, r.x + 85, y + 16, 50, 10, '#6fb6ff', 3);
    });
    ctx.fillStyle = 'rgba(229,72,77,0.55)';
    ctx.fillRect(r.x + 18, r.y + 125, 30, 10); ctx.fillRect(r.x + 28, r.y + 115, 10, 30);
    ctx.strokeStyle = 'rgba(80,230,255,0.6)'; ctx.lineWidth = 3;
    circle(ctx, r.x + 35, r.y + 35, 27); ctx.stroke();
    // Invernadero
    r = MAP.room('green');
    box(ctx, r.x + 55, r.y + 45, 92, 22, '#6b4a2a', 4);
    box(ctx, r.x + 55, r.y + 95, 92, 22, '#6b4a2a', 4);
    for (i = 0; i < 5; i++) plant(ctx, r.x + 64 + i * 19, r.y + 56, t, i);
    for (i = 0; i < 5; i++) plant(ctx, r.x + 64 + i * 19, r.y + 106, t, i + 5);
    circle(ctx, r.x + 180, r.y + 58, 13, '#2a5d9a');
    circle(ctx, r.x + 180, r.y + 58, 9, 'rgba(110,190,255,0.8)');
    // Motores: turbina que gira y tuberías
    r = MAP.room('engines');
    var cx = r.x + 52, cy = r.y + 192;
    circle(ctx, cx, cy, 36, '#2b2440');
    ctx.strokeStyle = '#8a7fb8'; ctx.lineWidth = 4; ctx.stroke();
    var glow = ctx.createRadialGradient(cx, cy, 4, cx, cy, 31);
    glow.addColorStop(0, 'rgba(255,190,90,0.95)'); glow.addColorStop(1, 'rgba(255,90,40,0.15)');
    circle(ctx, cx, cy, 31, glow);
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 4);
    ctx.fillStyle = '#4a4068';
    for (i = 0; i < 6; i++) { ctx.rotate(Math.PI / 3); ctx.beginPath(); ctx.ellipse(14, 0, 14, 5, 0.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
    circle(ctx, cx, cy, 7, '#c9b8ff');
    ctx.fillStyle = '#5b6488'; ctx.fillRect(r.x + 60, r.y + 6, r.w - 120, 8);
    ctx.fillStyle = '#7c86a8'; for (i = 0; i < 4; i++) ctx.fillRect(r.x + 80 + i * 26, r.y + 4, 6, 12);
    // Reactor: núcleo que brilla (rojo y parpadeando si está saboteado)
    r = MAP.room('reactor');
    var rcx = r.x + 110, rcy = r.y + 155, alarm = opts.reactor;
    var pulse = 0.5 + 0.5 * Math.sin(t * (alarm ? 10 : 2));
    circle(ctx, rcx, rcy, 38, '#2a2040');
    ctx.strokeStyle = alarm ? '#ff5050' : '#8a7fb8'; ctx.lineWidth = 4; ctx.stroke();
    var core = ctx.createRadialGradient(rcx, rcy, 3, rcx, rcy, 30);
    core.addColorStop(0, alarm ? 'rgba(255,240,200,1)' : 'rgba(200,255,255,1)');
    core.addColorStop(1, alarm ? 'rgba(255,40,40,' + (0.3 + 0.5 * pulse) + ')' : 'rgba(60,200,255,' + (0.25 + 0.3 * pulse) + ')');
    circle(ctx, rcx, rcy, 30, core);
    for (i = 0; i < 4; i++) { var ang = t * 1.5 + i * Math.PI / 2; circle(ctx, rcx + Math.cos(ang) * 44, rcy + Math.sin(ang) * 44, 4, alarm ? '#ff8080' : '#9ad8ff'); }
    // Seguridad: sillón
    r = MAP.room('security');
    circle(ctx, r.x + 50, r.y + 64, 11, '#3a4a7a'); box(ctx, r.x + 40, r.y + 72, 20, 8, '#2a3a6a', 3);
    // Administración: archivadores
    r = MAP.room('admin');
    for (i = 0; i < 3; i++) box(ctx, r.x + 8, r.y + 8 + i * 28, 22, 24, '#6a6a50', 3);
    // Puente: ventanal, consola y sillón
    r = MAP.room('bridge');
    windowStrip(ctx, r.x + r.w - 26, r.y + 30, 22, r.h - 60, t, false);
    ctx.fillStyle = '#34507a';
    ctx.beginPath(); ctx.arc(r.x + 130, r.y + 100, 52, -1.0, 1.0); ctx.arc(r.x + 130, r.y + 100, 36, 1.0, -1.0, true); ctx.closePath(); ctx.fill();
    lightsRow(ctx, r.x + 152, r.y + 68, 3, t); lightsRow(ctx, r.x + 156, r.y + 126, 3, t + 1);
    circle(ctx, r.x + 115, r.y + 100, 12, '#8a3a3a');
    box(ctx, r.x + 100, r.y + 88, 8, 24, '#6a2a2a', 3);
    // Electricidad: armarios, cables y generador
    r = MAP.room('electrical');
    for (i = 0; i < 2; i++) {
      box(ctx, r.x + 140 + i * 34, r.y + 26, 28, 40, '#3a3f55', 3);
      lightsRow(ctx, r.x + 146 + i * 34, r.y + 36, 2, t + i);
      ctx.fillStyle = '#f2d63a'; ctx.beginPath(); ctx.moveTo(r.x + 154 + i * 34, r.y + 44); ctx.lineTo(r.x + 148 + i * 34, r.y + 56); ctx.lineTo(r.x + 156 + i * 34, r.y + 54); ctx.lineTo(r.x + 152 + i * 34, r.y + 62); ctx.lineTo(r.x + 160 + i * 34, r.y + 50); ctx.lineTo(r.x + 154 + i * 34, r.y + 52); ctx.closePath(); ctx.fill();
    }
    ctx.lineWidth = 3;
    ['#e5484d', '#3e7bfa', '#f2d63a'].forEach(function (c, k) {
      ctx.strokeStyle = c; ctx.beginPath(); ctx.moveTo(r.x + 140, r.y + 70 + k * 3); ctx.bezierCurveTo(r.x + 110, r.y + 95 + k * 8, r.x + 80, r.y + 80, r.x + 55, r.y + 102 + k * 4); ctx.stroke();
    });
    box(ctx, r.x + 40, r.y + 100, 44, 28, '#4a5070', 4); circle(ctx, r.x + 62, r.y + 114, 8, '#2a2f40'); circle(ctx, r.x + 62, r.y + 114, 3, Math.sin(t * 6) > 0 ? '#57e389' : '#1c3a26');
    // Laboratorio: mesa con tubos, tanque burbujeante
    r = MAP.room('lab');
    box(ctx, r.x + 70, r.y + 150, 110, 22, '#c9cde0', 4);
    ['#ff6b6b', '#57e389', '#6fb6ff', '#ffe66b', '#c58bff'].forEach(function (c, k) {
      box(ctx, r.x + 80 + k * 20, r.y + 138, 8, 18, 'rgba(255,255,255,0.5)', 3);
      box(ctx, r.x + 80 + k * 20, r.y + 146, 8, 10, c, 2);
    });
    var tx = r.x + 205, ty = r.y + 60;
    box(ctx, tx - 16, ty - 26, 32, 56, 'rgba(120,255,190,0.25)', 12);
    ctx.strokeStyle = '#9ad8ff'; ctx.lineWidth = 2; rr(ctx, tx - 16, ty - 26, 32, 56, 12); ctx.stroke();
    for (i = 0; i < 4; i++) circle(ctx, tx - 6 + (i * 5) % 12, ty + 22 - ((t * 25 + i * 14) % 46), 2.5, 'rgba(220,255,240,0.8)');
    box(ctx, tx - 18, ty + 28, 36, 8, '#5a6488', 3);
    // Almacén: cajas y barriles
    r = MAP.room('storage');
    crate(ctx, r.x + 168, r.y + 28, 32); crate(ctx, r.x + 202, r.y + 28, 32); crate(ctx, r.x + 185, r.y + 62, 30);
    crate(ctx, r.x + 12, r.y + 100, 26);
    [[r.x + 30, r.y + 165], [r.x + 56, r.y + 170]].forEach(function (p) {
      circle(ctx, p[0], p[1], 12, '#3e7bfa'); ctx.strokeStyle = '#2a4fa8'; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p[0] - 12, p[1]); ctx.lineTo(p[0] + 12, p[1]); ctx.stroke();
    });
    // Armas: ventanal con asteroides
    r = MAP.room('weapons');
    windowStrip(ctx, r.x + r.w - 26, r.y + 20, 22, r.h - 40, t, true);
  }

  function vents(ctx) {
    MAP.vents.forEach(function (v) {
      box(ctx, v.x - 16, v.y - 11, 32, 22, '#2a3048', 4);
      ctx.strokeStyle = '#7f8ac0'; ctx.lineWidth = 2; rr(ctx, v.x - 16, v.y - 11, 32, 22, 4); ctx.stroke();
      ctx.strokeStyle = '#11162a'; ctx.lineWidth = 2.5;
      for (var k = -10; k <= 10; k += 5) { ctx.beginPath(); ctx.moveTo(v.x + k, v.y - 7); ctx.lineTo(v.x + k, v.y + 7); ctx.stroke(); }
    });
  }

  // opts: { labels, t, highlight: [ids], lightsOut, reactor, tr }
  function ship(ctx, opts) {
    opts = opts || {};
    var t = opts.t || 0;
    ctx.fillStyle = '#0b1026';
    ctx.fillRect(-600, -600, MAP.w + 1200, MAP.h + 1200);
    STARS.forEach(function (s) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 1.5 + s[0]);
      ctx.fillStyle = '#fff';
      ctx.fillRect(s[0], s[1], s[2], s[2]);
    });
    ctx.globalAlpha = 1;
    exterior(ctx, t);
    walls(ctx);
    MAP.rooms.forEach(function (r) { floor(ctx, r, t); });
    MAP.corridors.forEach(function (c) { corridorFloor(ctx, c); });
    decor(ctx, t, opts);
    vents(ctx);
    if (opts.labels) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 17px system-ui, sans-serif';
      MAP.rooms.forEach(function (r) {
        var p = MAP.labels[r.id] || [r.x + r.w / 2, r.y + 18];
        var label = opts.tr ? opts.tr(r.name) : r.name;
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(0,0,0,0.5)'; ctx.strokeText(label, p[0], p[1]);
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.fillText(label, p[0], p[1]);
      });
    }
    var hl = opts.highlight || [];
    MAP.stations.forEach(function (s) { station(ctx, s, t, hl.indexOf(s.id) >= 0, opts.lightsOut, opts.reactor); });
  }

  function station(ctx, s, t, highlight, lightsOut, reactorAlarm) {
    ctx.save();
    ctx.translate(s.x, s.y);
    if (highlight) {
      var p = 0.5 + 0.5 * Math.sin(t * 5);
      ctx.strokeStyle = 'rgba(255,230,80,' + (0.5 + 0.5 * p) + ')';
      ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(0, 0, 24 + p * 4, 0, Math.PI * 2); ctx.stroke();
    }
    if (s.type === 'emergency') {
      box(ctx, -22, -22, 44, 44, '#5a6488', 8);
      circle(ctx, 0, 0, 16, '#6b6f80');
      circle(ctx, 0, -2, 12, '#e5484d');
      circle(ctx, -4, -6, 3.5, 'rgba(255,255,255,0.5)');
    } else if (s.type === 'lights') {
      box(ctx, -14, -18, 28, 36, '#2a2f40', 4);
      var on = !lightsOut || (Math.sin(t * 8) > 0);
      ctx.fillStyle = lightsOut ? (on ? '#ff5050' : '#552020') : '#f2d63a';
      for (var i = 0; i < 3; i++) ctx.fillRect(-8, -12 + i * 10, 16, 6);
    } else if (s.type === 'reactor') {
      box(ctx, -16, -18, 32, 36, '#2a2f40', 5);
      var on2 = !reactorAlarm || Math.sin(t * 10) > 0;
      box(ctx, -11, -13, 22, 26, reactorAlarm ? (on2 ? '#ff5050' : '#702020') : '#2ec5ce', 4);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = 'bold 15px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✋', 0, 1);
    } else if (s.type === 'cameras') {
      box(ctx, -34, -20, 68, 34, '#2a2f40', 5);
      for (var k2 = 0; k2 < 4; k2++) box(ctx, -30 + k2 * 15.5, -16, 13, 11, Math.sin(t * 3 + k2) > -0.6 ? '#3a7a9a' : '#1a3a4a', 2);
      box(ctx, -30, -2, 60, 10, '#3a4060', 2);
      circle(ctx, 24, 3, 2.5, Math.sin(t * 4) > 0 ? '#ff5050' : '#5a2020');
    } else if (s.type === 'admin') {
      circle(ctx, 0, 0, 26, '#4a5070');
      circle(ctx, 0, 0, 21, '#1d2a40');
      ctx.globalAlpha = 0.55 + 0.25 * Math.sin(t * 3);
      ctx.fillStyle = '#5bd8ff';
      ctx.fillRect(-14, -6, 9, 6); ctx.fillRect(-4, -12, 10, 8); ctx.fillRect(7, -5, 8, 6); ctx.fillRect(-10, 4, 8, 6); ctx.fillRect(3, 4, 9, 6); ctx.fillRect(-5, -3, 12, 3);
      ctx.globalAlpha = 1;
    } else if (s.type === 'asteroids') {
      circle(ctx, 0, 0, 18, '#3a4060');
      ctx.save(); ctx.rotate(Math.sin(t) * 0.5);
      box(ctx, 4, -4, 22, 8, '#8a94b8', 3);
      ctx.restore();
      circle(ctx, 0, 0, 10, '#e5484d');
    } else {
      var col = { wires: '#f5a524', numbers: '#3e7bfa', download: '#30a46c', calibrate: '#8e4ec6', card: '#2ec5ce', simon: '#e5484d' }[s.type] || '#999';
      box(ctx, -15, -15, 30, 30, '#2a2f40', 5);
      box(ctx, -10, -10, 20, 20, col, 3);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText({ wires: '⚡', numbers: '#', download: '↓', calibrate: '◎', card: '▭', simon: '▦' }[s.type] || '?', 0, 1);
    }
    ctx.restore();
  }

  // Astronauta original, estilo dibujo: contorno grueso y colores planos. opts.look = { hat, suit, fx }
  var OUT = '#1a1a2e';
  function ol(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw || 2; ctx.strokeStyle = OUT; ctx.stroke(); }
  function character(ctx, x, y, hex, opts) {
    opts = opts || {};
    var sc = opts.scale || 1, L = window.LOOKS, look = opts.look || null, T = opts.t || (performance.now() / 1000);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc * (opts.dir || 1), sc);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (opts.ghost) ctx.globalAlpha = 0.45;
    var ph = opts.walk ? opts.walk * Math.PI * 2 : 0;
    var step = opts.walk ? Math.sin(ph) * 3.5 : 0;
    var bob = opts.walk ? Math.abs(Math.sin(ph)) * -1.5 : 0;
    var dark = shade(hex, -0.3), light = shade(hex, 0.25);
    if (!opts.ghost) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 16, 12, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    if (look && L) L.back(ctx, look, T);
    // piernas y botas
    rr(ctx, -8 + step, 4, 7, 10, 3); ol(ctx, hex, 1.8);
    rr(ctx, 1 - step, 4, 7, 10, 3); ol(ctx, hex, 1.8);
    rr(ctx, -9.5 + step, 10.5, 9.5, 5.5, 2.5); ol(ctx, '#e8e8ee', 1.8);
    rr(ctx, -0.5 - step, 10.5, 9.5, 5.5, 2.5); ol(ctx, '#e8e8ee', 1.8);
    ctx.translate(0, bob);
    // mochila
    rr(ctx, -18, -10, 9, 19, 3.5); ol(ctx, dark);
    ctx.fillStyle = light; ctx.fillRect(-16.5, -8, 2.5, 6);
    // brazo de atrás
    ctx.beginPath(); ctx.ellipse(-10, 0 - step * 0.4, 3.6, 6.2, 0.3, 0, Math.PI * 2); ol(ctx, dark, 1.6);
    // cuerpo (color plano con una banda de sombra)
    rr(ctx, -11.5, -8.5, 23, 18, 6); ol(ctx, hex, 2.2);
    ctx.save(); rr(ctx, -11.5, -8.5, 23, 18, 6); ctx.clip();
    ctx.fillStyle = dark; ctx.fillRect(-11.5, 4, 23, 6);
    ctx.fillStyle = light; ctx.fillRect(-8, -6.5, 4, 3);
    ctx.restore();
    rr(ctx, -11.5, -8.5, 23, 18, 6); ctx.lineWidth = 2.2; ctx.strokeStyle = OUT; ctx.stroke();
    rr(ctx, 1, -4.5, 8, 6.5, 1.5); ol(ctx, '#e8e8ee', 1.3);
    circle(ctx, 3.5, -1.3, 1.2, '#e5484d'); circle(ctx, 6.5, -1.3, 1.2, '#30a46c');
    if (look && L) L.body(ctx, look);
    // brazo de delante y guante
    ctx.beginPath(); ctx.ellipse(10, 0 + step * 0.4, 3.6, 6.2, -0.3, 0, Math.PI * 2); ol(ctx, hex, 1.6);
    ctx.beginPath(); ctx.arc(11, 5.5 + step * 0.4, 2.9, 0, Math.PI * 2); ol(ctx, '#e8e8ee', 1.4);
    // casco
    ctx.beginPath(); ctx.arc(0, -18, 13, 0, Math.PI * 2); ol(ctx, '#f4f5fa', 2.4);
    ctx.save(); ctx.beginPath(); ctx.arc(0, -18, 13, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#d3d7e6'; ctx.beginPath(); ctx.arc(-4, -12, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f4f5fa'; ctx.beginPath(); ctx.arc(-2, -21, 12, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, -18, 13, 0, Math.PI * 2); ctx.lineWidth = 2.4; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.strokeStyle = hex; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, -18, 10.5, Math.PI * 0.95, Math.PI * 1.3); ctx.stroke();
    // visera con cara
    ctx.beginPath(); ctx.arc(3, -17, 9, 0, Math.PI * 2); ol(ctx, '#1d3466', 2);
    ctx.fillStyle = '#2c4f94'; ctx.beginPath(); ctx.arc(1, -19, 7, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0.5, -17.5, 2.3, 2.9, 0, 0, Math.PI * 2); ol(ctx, '#ffffff', 0.9);
    ctx.beginPath(); ctx.ellipse(6.5, -17.5, 2.3, 2.9, 0, 0, Math.PI * 2); ol(ctx, '#ffffff', 0.9);
    circle(ctx, 1.2, -17, 1.15, '#111'); circle(ctx, 7.2, -17, 1.15, '#111');
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(3, -17, 6.3, Math.PI * 1.12, Math.PI * 1.45); ctx.stroke();
    var hasHead = look && ((look.suit && look.suit !== 'none') || (look.hat && look.hat !== 'none'));
    if (!hasHead) {
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-6, -30); ctx.lineTo(-8, -36); ctx.stroke();
      ctx.beginPath(); ctx.arc(-8, -37, 2.4, 0, Math.PI * 2); ol(ctx, hex, 1.3);
    }
    if (look && L) { L.head(ctx, look); L.hat(ctx, look, hex); }
    ctx.restore();
    if (look && L && !opts.ghost) L.fx(ctx, x, y, look, T, sc);
    if (opts.name) {
      var top = (look && L ? L.topOf(look) : 37) + 3;
      ctx.save();
      ctx.font = 'bold ' + Math.round(11 * sc) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)';
      if (opts.ghost) ctx.globalAlpha = 0.6;
      ctx.strokeText(opts.name, x, y - top * sc);
      ctx.fillStyle = opts.nameColor || '#fff';
      ctx.fillText(opts.name, x, y - top * sc);
      ctx.restore();
    }
  }

  function frozen(ctx, x, y, hex, t, look) {
    character(ctx, x, y, hex, { look: look, t: 0 });
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(160,220,255,0.5)';
    ctx.strokeStyle = '#1a1a2e';
    ctx.lineWidth = 2.2;
    rr(ctx, -21, -42, 42, 62, 6); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-14, -32); ctx.lineTo(-5, -39); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-16, -20); ctx.lineTo(-11, -25); ctx.stroke();
    var sp = 0.5 + 0.5 * Math.sin((t || 0) * 4);
    circle(ctx, 13, -32, 2, 'rgba(255,255,255,' + sp + ')');
    ctx.restore();
  }

  function avatarCanvas(hex, size, opts) {
    var c = document.createElement('canvas');
    var dpr = window.devicePixelRatio || 1;
    c.width = size * dpr; c.height = size * dpr;
    c.style.width = size + 'px'; c.style.height = size + 'px';
    var ctx = c.getContext('2d');
    ctx.scale(dpr * size / 64, dpr * size / 64);
    var look = opts && opts.look;
    if (opts && opts.frozen) { ctx.translate(32, 50); ctx.scale(0.82, 0.82); frozen(ctx, 0, 0, hex, 0, look); }
    else {
      var tall = look && window.LOOKS ? window.LOOKS.topOf(look) : 37;
      var s = Math.min(1.1, 52 / (tall + 18));
      character(ctx, 32, 60 - 17 * s, hex, { ghost: opts && opts.ghost, scale: s, look: look, t: 0.3 });
    }
    return c;
  }

  // Polígono de lo que se ve desde (x,y) con radio r: rayos que se paran en las paredes
  function visibility(x, y, r, rays) {
    rays = rays || 200;
    var pts = [];
    for (var i = 0; i < rays; i++) {
      var a = i / rays * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a), d = 0;
      while (d < r) {
        d += 5;
        if (!MAP.open(x + dx * d, y + dy * d)) { d += (dy < -0.5 ? MAP.wallFace + 6 : 14); break; }   // un poco más para ver la pared
      }
      if (d > r) d = r;
      pts.push(x + dx * d, y + dy * d);
    }
    return pts;
  }

  root.DRAW = { ship: ship, character: character, frozen: frozen, avatarCanvas: avatarCanvas, rr: rr, visibility: visibility };
})(window);
