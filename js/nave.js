/* Dibujo de la nave (escenario). La parte que no se mueve se dibuja una vez y se guarda en una imagen
   (más fluido en los móviles); encima se dibujan cada vez las partes animadas y las estaciones. */
(function (root) {
  var MAP = root.NAVE_MAP;
  var OUT = '#1a1a2e';
  var PAD = 420;

  // ---------- imágenes hechas con IA (por piezas; la forma del mapa sigue en código) ----------
  // Mientras no cargan se usa el dibujo en código. Al cargar se borra la imagen guardada del mapa para redibujarlo.
  var TEX = {};
  function tex(id, src, tileW) {
    var im = new Image(); TEX[id] = { img: im, ok: false, w: tileW };
    im.onload = function () {
      if (tileW === 0) TEX[id].sh = makeShadow(im);   // mueble: preparamos su sombra
      TEX[id].ok = true; for (var k in caches) delete caches[k];
    };
    im.src = src;
  }
  tex('cafe', 'img/mapas/nave-comedor-suelo.webp?v=1', 120);
  tex('pared', 'img/mapas/nave-pared.webp?v=1', -1);   // frente de las paredes de las salas de la Nave (se escala al alto de la pared)
  tex('pared2', 'img/mapas/nave-pared-pasillo.webp?v=1', -1);   // frente de las paredes de los pasillos (más sencilla)
  tex('macizo', 'img/mapas/nave-macizo.webp?v=1', 300);       // A4: encima de las paredes (lo macizo de la nave), cada 300 unidades
  tex('ojo', 'img/mapas/nave-ojo-buey.webp?v=1', -1);           // ojo de buey en las paredes de las salas
  tex('rejilla', 'img/mapas/nave-rejilla.webp?v=1', -1);        // rejillas de ventilación (los dos mapas)
  tex('lampara', 'img/mapas/nave-lampara.webp?v=1', -1);        // lámpara de pared de la Nave
  // img/mapas/nave-puerta.webp queda guardada para las puertas que se cierran (sabotaje de puertas, más adelante)
  // Muebles con imagen: prop(id) carga; drawProp dibuja centrado en x con la base en y y el ancho w
  // Sombra de un mueble: su misma silueta en negro y difuminada (se tumba en el suelo al dibujarla)
  function makeShadow(im) {
    try {
      var cv = document.createElement('canvas'), pad = 12;
      cv.width = im.width + pad * 2; cv.height = im.height + pad * 2;
      var g = cv.getContext('2d');
      if ('filter' in g) g.filter = 'blur(3px)';
      g.drawImage(im, pad, pad);
      g.filter = 'none'; g.globalCompositeOperation = 'source-in'; g.fillStyle = '#000'; g.fillRect(0, 0, cv.width, cv.height);
      cv.pad = pad;
      return cv;
    } catch (e) { return null; }
  }
  function prop(id, file) { tex(id, 'img/mapas/' + file + '?v=2', 0); }
  ['mesa', 'maquina', 'boton', 'papelera', 'planta', 'monitor'].forEach(function (n) { prop('cafe-' + n, 'nave-comedor-' + n + '.webp'); });
  // Fase 2, tanda 1: Reactor, Motores y Enfermería
  tex('reactor', 'img/mapas/nave-reactor-suelo.webp?v=1', 200);
  tex('engines', 'img/mapas/nave-motores-suelo.webp?v=1', 240);
  tex('medbay', 'img/mapas/nave-enfermeria-suelo.webp?v=1', 176);
  ['nucleo', 'consola', 'tanques', 'tubos', 'barril', 'refrigerador'].forEach(function (n) { prop('reactor-' + n, 'nave-reactor-' + n + '.webp'); });
  ['turbina', 'deposito', 'medidores', 'herramientas', 'cajas', 'banco'].forEach(function (n) { prop('motores-' + n, 'nave-motores-' + n + '.webp'); });
  tex('security', 'img/mapas/nave-seguridad-suelo.webp?v=1', 320);
  ['cama', 'escaner', 'armario', 'gotero', 'mesa', 'carrito'].forEach(function (n) { prop('enfermeria-' + n, 'nave-enfermeria-' + n + '.webp'); });
  ['mesa', 'silla', 'servidor', 'archivador', 'cafe', 'taquilla'].forEach(function (n) { prop('seguridad-' + n, 'nave-seguridad-' + n + '.webp'); });
  // 23-11: máquinas de tareas (T1, T2) y muebles de frente (C1-C4) dibujados con Gemini
  var TASK_W = { wires: 38, numbers: 26, download: 44, upload: 44, calibrate: 34, card: 26, simon: 36, pipes: 36, memory: 42, fill: 30,
    clean: 34, maze: 48, sort: 48, safe: 36, reactor: 42, cameras: 62, admin: 52, lights: 32, asteroids: 36 };
  Object.keys(TASK_W).forEach(function (n) { if (n !== 'upload') tex('tarea-' + n, 'img/mapas/tarea-' + n + '.webp?v=1', -1); });
  ['reactor2-tanques', 'reactor2-refrigerador', 'motores2-medidores', 'motores2-deposito', 'enfermeria2-cama', 'enfermeria2-armario',
   'seguridad2-servidor', 'seguridad2-archivador', 'seguridad2-taquilla', 'seguridad2-silla'].forEach(function (n) { tex(n, 'img/mapas/nave-' + n + '.webp?v=1', -1); });
  var R2_PROPS = ['reactor-nucleo', 'reactor2-tanques', 'reactor2-refrigerador'], E2_PROPS = ['motores-turbina', 'motores2-medidores', 'motores2-deposito'];
  var M2_PROPS = ['enfermeria2-cama'], S2_PROPS = ['seguridad2-servidor', 'seguridad2-archivador', 'seguridad2-taquilla', 'seguridad2-silla'];
  var USE_ISO = false;   // muebles en diagonal (isométricos) de B6 y B8: no encajan con la vista de frente del mapa
  var MED_PROPS = ['enfermeria-cama', 'enfermeria-escaner', 'enfermeria-armario', 'enfermeria-gotero', 'enfermeria-carrito'];
  var SEC_PROPS = ['seguridad-mesa', 'seguridad-silla', 'seguridad-servidor', 'seguridad-archivador', 'seguridad-cafe', 'seguridad-taquilla'];
  var REACTOR_PROPS = ['reactor-nucleo', 'reactor-tanques', 'reactor-barril'];
  var ENG_T = null;   // turbina de Motores (dónde se dibuja, para animarla encima)
  var ENGINE_PROPS = ['motores-turbina', 'motores-deposito'];
  function hasProps(list) { for (var i = 0; i < list.length; i++) if (!TEX[list[i]] || !TEX[list[i]].ok) return false; return true; }
  var PROP_SHADOWS = false;   // 23-11: sin sombras pintadas por código (no convencían); el dibujo ya apoya en el suelo
  function drawProp(c, id, x, y, w, shadowOn) {
    var T = TEX[id]; if (!T || !T.ok) return false;
    var h = w * T.img.height / T.img.width;
    if (PROP_SHADOWS && shadowOn !== false && T.sh) {
      // sombra de apoyo: la silueta del objeto aplastada justo debajo de su base (luz desde arriba, como en Among Us)
      var k = w / T.img.width, pad = T.sh.pad * k, sh = (h + pad * 2) * 0.2;
      c.save(); c.globalAlpha = 0.5;
      c.drawImage(T.sh, x - w / 2 - pad * 1.2, y - sh * 0.62, w + pad * 2.4, sh);
      c.restore();
      // oscuridad de contacto justo donde el objeto toca el suelo
      var cy = y - 2, rx = w * 0.42;
      var g = c.createRadialGradient(x, cy, 0, x, cy, rx);
      g.addColorStop(0, 'rgba(0,0,0,0.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.save(); c.translate(x, cy); c.scale(1, 0.16); c.translate(-x, -cy);
      c.fillStyle = g; c.beginPath(); c.arc(x, cy, rx, 0, Math.PI * 2); c.fill(); c.restore();
    }
    c.drawImage(T.img, x - w / 2, y - h, w, h);
    return true;
  }
  var CAFE_PROPS = ['cafe-mesa', 'cafe-maquina', 'cafe-papelera', 'cafe-planta'];
  function texFloor(c, r) {
    var T = MAP.isShip() && TEX[r.id];   // los suelos con imagen son de la Nave
    if (!T || !T.ok || !c.createPattern) return false;
    var pat = c.createPattern(T.img, 'repeat');
    if (!pat) return false;
    var sc = T.w / T.img.width;
    if (pat.setTransform && root.DOMMatrix) pat.setTransform(new DOMMatrix().translateSelf(r.x, r.y).scaleSelf(sc, sc));
    c.fillStyle = pat; c.fillRect(r.x, r.y, r.w, r.h);
    return true;
  }

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
  // ---------- CASCO: la nave entera es un bloque macizo; las salas y pasillos son huecos "sin techo" ----------
  // Contorno exterior en coordenadas base. Todo lo de dentro que no es sala ni pasillo es pared maciza.
  var HULL = {
    nave: [[-15, 300], [390, -12], [1440, -12], [1580, 160], [1580, 330], [1655, 440], [1580, 550], [1600, 750], [1540, 845], [260, 845], [-15, 585]],
    abisal: [[5, 280], [300, -20], [1340, -20], [1635, 275], [1635, 830], [1570, 900], [45, 900], [5, 860]]
  };
  function hullPoly() { return HULL[MAP.id] || HULL.nave; }
  function hullPath(c, rad) {
    var p = hullPoly(), n = p.length;
    c.beginPath();
    c.moveTo((p[0][0] + p[n - 1][0]) / 2, (p[0][1] + p[n - 1][1]) / 2);
    for (var i = 0; i < n; i++) { var a = p[i], b = p[(i + 1) % n]; c.arcTo(a[0], a[1], b[0], b[1], rad == null ? 30 : rad); }
    c.closePath();
  }
  // ¿Está este punto (coordenadas base) dentro del casco? Para que peces y burbujas no se dibujen encima.
  function inHull(x, y) {
    var p = hullPoly(), ins = false;
    for (var i = 0, j = p.length - 1; i < p.length; j = i++) {
      if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) ins = !ins;
    }
    return ins;
  }
  // Dibuja el bloque macizo: chapa por encima de las paredes, tuberías, banda de blindaje y borde exterior.
  function hull(c, sk) {
    var H = (sk && sk.hull) || {};
    var top = H.top || '#434c70', line = H.line || 'rgba(14,18,40,0.55)', hi = H.hi || 'rgba(190,205,255,0.10)';
    hullPath(c); c.fillStyle = top; c.fill();
    c.save(); hullPath(c); c.clip();
    var MT = MAP.isShip() && TEX.macizo && TEX.macizo.ok && c.createPattern ? TEX.macizo : null;
    if (MT) {   // chapa de Gemini (A4): ya trae planchas, remaches, rejillas y tuberías
      var mp = c.createPattern(MT.img, 'repeat'), mk = MT.w / MT.img.width;
      mp.setTransform(new DOMMatrix().scaleSelf(mk, mk)); c.fillStyle = mp; c.fillRect(-200, -200, MAP.w + 400, MAP.h + 400);
      c.fillStyle = 'rgba(8,12,32,0.18)'; c.fillRect(-200, -200, MAP.w + 400, MAP.h + 400);   // un poco más oscura que los suelos
    }
    // planchas de metal (encima de las paredes) con juntas y remaches
    var PW = 64, PH = 44, x, y, i, row = 0;
    if (!MT) for (y = -40; y < MAP.h + 60; y += PH, row++) {
      for (x = -60 - (row % 2) * PW / 2; x < MAP.w + 80; x += PW) {
        var v = rand(x * 0.37 + y * 1.91);
        c.fillStyle = v > 0.66 ? 'rgba(255,255,255,0.045)' : (v < 0.25 ? 'rgba(0,0,0,0.10)' : 'rgba(0,0,0,0)');
        c.fillRect(x, y, PW, PH);
        c.fillStyle = hi; c.fillRect(x + 1, y + 1, PW - 2, 1.5);
        c.fillStyle = line; c.fillRect(x, y, PW, 1.2); c.fillRect(x, y, 1.2, PH);
        c.fillStyle = 'rgba(10,14,30,0.45)';
        c.fillRect(x + 5, y + 5, 2, 2); c.fillRect(x + PW - 7, y + 5, 2, 2); c.fillRect(x + 5, y + PH - 7, 2, 2); c.fillRect(x + PW - 7, y + PH - 7, 2, 2);
        if (v > 0.9) { c.fillStyle = 'rgba(0,0,0,0.25)'; for (i = 0; i < 4; i++) c.fillRect(x + 18, y + 12 + i * 5, PW - 36, 2); }   // rejilla de ventilación pequeña
      }
    }
    // tuberías y cables que recorren el interior de las paredes (las salas las tapan; solo se ven en lo macizo)
    var pipes = H.pipes || ['#6e7aa6', '#9a6a4a', '#5a8a7a'];
    if (!MT) for (i = 0; i < 7; i++) {
      var py = 30 + rand(i + 11) * (MAP.h - 60), col = pipes[i % pipes.length];
      c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(-40, py + 3, MAP.w + 80, 7);
      c.fillStyle = OUT; c.fillRect(-40, py - 1, MAP.w + 80, 9);
      c.fillStyle = col; c.fillRect(-40, py, MAP.w + 80, 7);
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-40, py + 1, MAP.w + 80, 1.5);
      for (x = rand(i) * 80; x < MAP.w + 40; x += 110) { c.fillStyle = OUT; c.fillRect(x - 1, py - 3, 8, 13); c.fillStyle = '#8a94b8'; c.fillRect(x, py - 2, 6, 11); }
    }
    if (!MT) for (i = 0; i < 6; i++) {
      var px2 = 60 + rand(i + 31) * (MAP.w - 120), col2 = pipes[(i + 1) % pipes.length];
      c.fillStyle = OUT; c.fillRect(px2 - 1, -40, 9, MAP.h + 80);
      c.fillStyle = col2; c.fillRect(px2, -40, 7, MAP.h + 80);
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(px2 + 1, -40, 1.5, MAP.h + 80);
    }
    // banda de blindaje por dentro del borde
    hullPath(c); c.lineWidth = 54; c.strokeStyle = OUT; c.stroke();                       // línea oscura del borde interior de la banda
    hullPath(c); c.lineWidth = 50; c.strokeStyle = H.bandHi || '#5a66a0'; c.stroke();      // canto claro
    hullPath(c); c.lineWidth = 46; c.strokeStyle = H.band || '#2a3156'; c.stroke();
    hullPath(c); c.lineWidth = 30; c.setLineDash([3, 37]); c.strokeStyle = 'rgba(160,180,255,0.35)'; c.stroke(); c.setLineDash([]);   // remaches
    c.restore();
    hullPath(c); c.lineWidth = 8; c.strokeStyle = OUT; c.stroke();
    hullPath(c); c.lineWidth = 2.5; c.strokeStyle = H.rim || '#6a76b0'; c.stroke();
  }
  // Borde oscuro entre lo macizo y el suelo de salas y pasillos (incluye el frente de las paredes, que sube F)
  function floorEdges(c) {
    var F = MAP.wallFace;
    c.save(); c.lineJoin = 'miter'; c.strokeStyle = OUT; c.lineWidth = 10;
    c.beginPath(); MAP.rects.forEach(function (r) { c.rect(r.x, r.y - (isHoriz(r) ? F : 0), r.w, r.h + (isHoriz(r) ? F : 0)); }); c.stroke();
    c.restore();
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
  // Motores traseros: dos toberas que salen del casco por detrás
  var ENGINES = [[400, 62], [515, 62]];
  function exteriorStatic(c, sk) {
    var cafe = R('cafe');
    c.lineJoin = 'round';
    ENGINES.forEach(function (e) {
      var cy = e[0], h = e[1];
      // cuerpo del motor
      box(c, -120, cy - h / 2, 130, h, '#39406a', 14, { lw: 4 });
      c.fillStyle = 'rgba(255,255,255,0.10)'; c.fillRect(-112, cy - h / 2 + 6, 112, 6);
      for (var k = 0; k < 3; k++) { c.fillStyle = OUT; c.fillRect(-96 + k * 30, cy - h / 2 + 2, 4, h - 4); c.fillStyle = '#5a66a0'; c.fillRect(-95 + k * 30, cy - h / 2 + 3, 2, h - 6); }
      // tobera
      c.fillStyle = '#242a48'; c.beginPath(); c.moveTo(-120, cy - h / 2 + 6); c.lineTo(-146, cy - h / 2 - 2); c.lineTo(-146, cy + h / 2 + 2); c.lineTo(-120, cy + h / 2 - 6); c.closePath(); c.fill();
      c.strokeStyle = OUT; c.lineWidth = 4; c.stroke();
    });
    hull(c, sk);
    // cabina en el morro, con su cristal
    c.fillStyle = '#7fd8ff'; c.beginPath(); c.moveTo(1592, 392); c.quadraticCurveTo(1646, 440, 1592, 488); c.quadraticCurveTo(1612, 440, 1592, 392); c.closePath(); c.fill();
    c.lineWidth = 3; c.strokeStyle = OUT; c.stroke();
    c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.moveTo(1602, 410); c.quadraticCurveTo(1622, 425, 1626, 440); c.lineTo(1620, 440); c.quadraticCurveTo(1614, 426, 1600, 416); c.closePath(); c.fill();
    // antena encima del Comedor
    c.strokeStyle = OUT; c.lineWidth = 5; c.beginPath(); c.moveTo(cafe.x + 230, cafe.y - 34); c.lineTo(cafe.x + 246, cafe.y - 76); c.stroke();
    c.strokeStyle = '#8a94c8'; c.lineWidth = 2.5; c.stroke();
    // ojos de buey en el blindaje (arriba y abajo)
    var ports = [];
    for (var px = 470; px <= 1390; px += 115) ports.push([px, 8]);
    for (px = 330; px <= 1480; px += 115) ports.push([px, 826]);
    ports.forEach(function (p) {
      circ(c, p[0], p[1], 8, '#0a1030', 2.5);
      circ(c, p[0], p[1], 5.5, 'rgba(120,180,255,0.35)');
      circ(c, p[0] - 2, p[1] - 2, 2, 'rgba(255,255,255,0.7)');
    });
  }
  function exteriorAnim(c, t) {
    var cafe = R('cafe');
    ENGINES.forEach(function (e, k) {
      var cy = e[0], f = 1 + 0.18 * Math.sin(t * 22 + k * 2), x0 = -146;
      var g = c.createLinearGradient(x0, 0, x0 - 95 * f, 0);
      g.addColorStop(0, 'rgba(200,240,255,0.95)'); g.addColorStop(0.25, 'rgba(255,220,120,0.9)'); g.addColorStop(0.6, 'rgba(255,110,40,0.7)'); g.addColorStop(1, 'rgba(255,60,20,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(x0, cy - 26); c.quadraticCurveTo(x0 - 115 * f, cy, x0, cy + 26); c.fill();
    });
    circ(c, cafe.x + 246, cafe.y - 78, 5, Math.sin(t * 3) > 0 ? '#ff5050' : '#702020', 1.5);
  }

  // ---------- PAREDES con frente, carteles y ventanas ----------
  function walls(c, tr, sk) {
    var W = (sk && sk.wall) || {};
    var TH = (sk && sk.theme) || THEME;
    floorEdges(c);
    var F = MAP.wallFace;
    MAP.rects.forEach(function (r) {
      if (!isHoriz(r)) return;
      MAP.topWalls(r).forEach(function (sg, si) {
        var x = sg[0], w = sg[1] - sg[0], y = r.y - F;
        if (w <= 2) return;
        var isRoom = MAP.rooms.indexOf(r) >= 0, PTX = isRoom ? TEX.pared : (TEX.pared2 && TEX.pared2.ok ? TEX.pared2 : TEX.pared);
        var PT = !W.face && PTX && PTX.ok && c.createPattern ? PTX : null;
        if (PT) {
          // pared dibujada con IA (Gemini): se repite a lo largo y ocupa todo el alto del frente
          var pat = c.createPattern(PT.img, 'repeat-x'), k = F / PT.img.height;
          if (pat && pat.setTransform && root.DOMMatrix) {
            pat.setTransform(new DOMMatrix().translateSelf(0, y).scaleSelf(k, k));
            c.fillStyle = pat; c.fillRect(x, y, w, F);
            c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(x, r.y - 2, w, 2);   // pequeña sombra donde la pared toca el suelo
            if (MAP.rooms.indexOf(r) >= 0 && w > 120) {
              // ojos de buey (A3c) o, si no han cargado, ventanitas
              for (var wx2 = x + 24; wx2 < x + w - 50; wx2 += 90) {
                if (TEX.ojo && TEX.ojo.ok) { var d = F - 4; c.drawImage(TEX.ojo.img, wx2 + 15 - d / 2, y + 2, d, d); continue; }
                rr(c, wx2, y + 6, 30, F - 14, 4); c.fillStyle = '#0a1030'; c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke();
                for (var s3 = 0; s3 < 4; s3++) { c.fillStyle = '#fff'; c.fillRect(wx2 + 4 + rand(wx2 + s3) * 22, y + 8 + rand(wx2 * 3 + s3) * (F - 18), 1.5, 1.5); }
              }
            }
            return;
          }
        }
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
  }
  // carteles con el nombre de cada sala (se dibujan después de los pasillos para que nada los tape)
  function signs(c, tr, sk) {
    var F = MAP.wallFace, TH = (sk && sk.theme) || THEME;
    c.textAlign = 'center'; c.textBaseline = 'middle';
    MAP.rooms.forEach(function (r) {
      var segs = MAP.topWalls(r), best = null;
      segs.forEach(function (sg) { if (!best || sg[1] - sg[0] > best[1] - best[0]) best = sg; });
      if (!best) return;
      var label = tr ? tr(r.name) : r.name;
      c.font = 'bold 13px system-ui, sans-serif';
      var tw = c.measureText(label).width + 18, cx = (best[0] + best[1]) / 2, cy = r.y - F / 2;
      if (tw > best[1] - best[0] - 8) { c.font = 'bold 10px system-ui, sans-serif'; tw = c.measureText(label).width + 12; }
      if (tw > best[1] - best[0] - 4) { c.font = 'bold 13px system-ui, sans-serif'; tw = c.measureText(label).width + 18; cx = r.x + r.w / 2; }   // no cabe en ese trozo de pared: cartel centrado sobre la sala (encima de la puerta)
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
    if (texFloor(c, r)) {
      // suelo con imagen: nada más que dibujar
    } else if (r.id === 'cafe') {
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
    box(c, r.x + 70, r.y + 6, 120, 22, '#8a5a3a', 4);
    box(c, r.x + 78, r.y + 2, 18, 18, '#3a3f55', 3, { lw: 1.4 }); box(c, r.x + 104, r.y + 8, 10, 8, '#ffffff', 2, { lw: 1 }); box(c, r.x + 120, r.y + 8, 10, 8, '#ffffff', 2, { lw: 1 });
    if (hasProps(CAFE_PROPS)) {
      // muebles dibujados con IA (Gemini)
      drawProp(c, 'cafe-mesa', r.x + 75, r.y + 205, 88); drawProp(c, 'cafe-mesa', r.x + 225, r.y + 205, 88);
      drawProp(c, 'cafe-maquina', r.x + 242, r.y + 62, 42);
      drawProp(c, 'cafe-planta', r.x + 18, r.y + 44, 34); drawProp(c, 'cafe-planta', r.x + 285, r.y + 60, 28);
      drawProp(c, 'cafe-papelera', r.x + 21, r.y + 234, 24);
    } else {
      table(c, r.x + 75, r.y + 175); table(c, r.x + 225, r.y + 175);
      box(c, r.x + 225, r.y + 8, 34, 46, '#2a3a6a', 4);
      box(c, r.x + 229, r.y + 12, 26, 24, '#5bc0ff', 2, { lw: 1.2 });
      plant(c, r.x + 16, r.y + 20, true); plant(c, r.x + 285, r.y + 40, false);
      box(c, r.x + 10, r.y + 205, 22, 26, '#5a6488', 4); box(c, r.x + 8, r.y + 203, 26, 6, '#7a84a8', 2, { lw: 1.2 });
    }
    // Enfermería: camillas, armario de medicinas, gotero
    r = R('medbay');
    var med2 = hasProps(M2_PROPS);
    if (med2) {   // de frente (C3b): dos camas en fila en el centro (el armario se quitó: salía en diagonal)
      drawProp(c, 'enfermeria2-cama', r.x + 64, r.y + 104, 70);
      drawProp(c, 'enfermeria2-cama', r.x + 138, r.y + 104, 70);
    } else if (USE_ISO && hasProps(MED_PROPS)) {   // muebles de Gemini (B6), en diagonal: desactivados
      drawProp(c, 'enfermeria-gotero', r.x + 52, r.y + 90, 16);     // junto a la primera cama
      drawProp(c, 'enfermeria-cama', r.x + 82, r.y + 92, 54);       // dos camas en fila bajo el monitor
      drawProp(c, 'enfermeria-cama', r.x + 140, r.y + 92, 54);
      drawProp(c, 'enfermeria-escaner', r.x + 30, r.y + 128, 44);    // pared izquierda, lejos de la puerta de abajo
      drawProp(c, 'enfermeria-armario', r.x + 124, r.y + 156, 22);   // pared de abajo, junto a la tarea del botiquín
    } else if (!med2) [r.y + 46, r.y + 90].forEach(function (y) {
      box(c, r.x + 85, y, 72, 26, '#eef0f6', 5);
      box(c, r.x + 137, y + 3, 17, 20, '#ffffff', 4, { lw: 1.2 });
      box(c, r.x + 85, y + 16, 50, 10, '#6fd0e0', 3, { lw: 1.2 });
    });
    if (!med2 && !(USE_ISO && hasProps(MED_PROPS))) {
      box(c, r.x + 172, r.y + 72, 22, 30, '#ffffff', 3); c.fillStyle = '#e5484d'; c.fillRect(r.x + 180, r.y + 78, 6, 16); c.fillRect(r.x + 175, r.y + 83, 16, 6);
      c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(r.x + 70, r.y + 50); c.lineTo(r.x + 70, r.y + 85); c.stroke();
      box(c, r.x + 64, r.y + 44, 12, 14, 'rgba(160,220,255,0.85)', 4, { lw: 1.4 });
    }
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
    var engImg = hasProps(ENGINE_PROPS);
    ENG_T = { x: r.x + 44, b: r.y + 236, w: 70 };
    if (!engImg) { circ(c, r.x + 52 + 3, r.y + 192 + 5, 36, 'rgba(0,0,0,0.3)'); circ(c, r.x + 52, r.y + 192, 36, '#2b2440', 3); }
    var eng2 = hasProps(E2_PROPS);
    if (!eng2) { c.lineWidth = 8; c.strokeStyle = OUT; c.beginPath(); c.moveTo(r.x + 60, r.y + 10); c.lineTo(r.x + r.w - 60, r.y + 10); c.lineTo(r.x + r.w - 60, r.y + 70); c.stroke();
      c.lineWidth = 5; c.strokeStyle = '#d0703a'; c.stroke(); }
    if (eng2) {   // de frente (C2): medidores en la pared de arriba; depósito y turbina abajo a la izquierda
      drawProp(c, 'motores2-medidores', r.x + 104, r.y + 26, 44);
      drawProp(c, 'motores2-deposito', r.x + 18, r.y + 180, 20);
      drawProp(c, 'motores-turbina', ENG_T.x, ENG_T.b, ENG_T.w);
    } else if (engImg) {   // muebles de Gemini (B4)
      drawProp(c, 'motores-deposito', r.x + 18, r.y + 186, 22);     // pared izquierda, junto a la turbina
      drawProp(c, 'motores-turbina', ENG_T.x, ENG_T.b, ENG_T.w);    // esquina de abajo a la izquierda
    } else {
      for (i = 0; i < 3; i++) { circ(c, r.x + 110 + i * 26, r.y + 30, 8, '#eef0f6', 1.6); c.strokeStyle = '#e5484d'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(r.x + 110 + i * 26, r.y + 30); c.lineTo(r.x + 114 + i * 26, r.y + 25); c.stroke(); }
      box(c, r.x + 160, r.y + 140, 50, 40, '#4a4060', 4); box(c, r.x + 166, r.y + 146, 38, 12, '#ff9a4a', 2, { lw: 1 });
    }
    // Reactor: anillo del núcleo y conductos
    r = R('reactor');
    if (!hasProps(REACTOR_PROPS)) {
      circ(c, r.x + 113, r.y + 160, 40, 'rgba(0,0,0,0.3)'); circ(c, r.x + 110, r.y + 155, 40, '#2a2040', 3);
      c.lineWidth = 6; c.strokeStyle = OUT;
      [[r.x + 60, r.y + 40], [r.x + 180, r.y + 60], [r.x + 180, r.y + 190]].forEach(function (p) { c.beginPath(); c.moveTo(r.x + 110, r.y + 155); c.lineTo(p[0], p[1]); c.stroke(); });
      c.lineWidth = 3; c.strokeStyle = '#4a5a8a';
      [[r.x + 60, r.y + 40], [r.x + 180, r.y + 60], [r.x + 180, r.y + 190]].forEach(function (p) { c.beginPath(); c.moveTo(r.x + 110, r.y + 155); c.lineTo(p[0], p[1]); c.stroke(); });
    }
    if (hasProps(R2_PROPS)) {   // de frente (C1): tanques en la pared de arriba, refrigerador en la esquina de abajo a la derecha
      drawProp(c, 'reactor2-tanques', r.x + 110, r.y + 34, 44);
      drawProp(c, 'reactor2-refrigerador', r.x + 184, r.y + 194, 24);
      drawProp(c, 'reactor-nucleo', r.x + 110, r.y + 192, 100);
    } else if (hasProps(REACTOR_PROPS)) {   // muebles de Gemini (B2)
      drawProp(c, 'reactor-tanques', r.x + 22, r.y + 126, 32);     // pared izquierda, entre las dos tareas
      drawProp(c, 'reactor-barril', r.x + 184, r.y + 156, 18);     // pared derecha, bajo la puerta
      drawProp(c, 'reactor-nucleo', r.x + 110, r.y + 192, 100);
    } else circ(c, r.x + 110, r.y + 155, 40, '#2a2040', 3);
    // Seguridad: sillón y archivo de cintas
    r = R('security');
    var sec2 = hasProps(S2_PROPS);
    if (sec2) {   // de frente (C4): servidor en la pared de arriba, silla ante las cámaras, taquilla y archivador en las esquinas de abajo
      drawProp(c, 'seguridad2-servidor', r.x + 98, r.y + 30, 20);
      drawProp(c, 'seguridad2-silla', r.x + 50, r.y + 68, 18);
      drawProp(c, 'seguridad2-taquilla', r.x + 16, r.y + 106, 18);
      drawProp(c, 'seguridad2-archivador', r.x + 154, r.y + 106, 22);
    } else if (USE_ISO && hasProps(SEC_PROPS)) {   // muebles de Gemini (B8), en diagonal: desactivados
      drawProp(c, 'seguridad-servidor', r.x + 98, r.y + 36, 22);    // pared de arriba, entre las cámaras y la rejilla
      drawProp(c, 'seguridad-archivador', r.x + 120, r.y + 34, 16);
      drawProp(c, 'seguridad-silla', r.x + 50, r.y + 72, 18);       // delante de la consola de cámaras
      drawProp(c, 'seguridad-taquilla', r.x + 14, r.y + 106, 18);   // esquinas de abajo, lejos de la puerta
      drawProp(c, 'seguridad-cafe', r.x + 152, r.y + 106, 26);
    } else {
      circ(c, r.x + 50, r.y + 64, 11, '#3a4a7a', 1.8); box(c, r.x + 40, r.y + 72, 20, 8, '#2a3a6a', 3, { lw: 1.4 });
      box(c, r.x + 124, r.y + 58, 34, 34, '#3a3f55', 3); for (i = 0; i < 3; i++) box(c, r.x + 128, r.y + 62 + i * 10, 26, 6, '#1a1a2e', 1, { lw: 0.8 });
    }
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
    if (!hasProps(CAFE_PROPS)) for (i = 0; i < 3; i++) circ(c, r.x + 236 + i * 6, r.y + 44, 2, Math.floor(t * 2 + i) % 3 ? ['#ff6b6b', '#ffe66b', '#57e389'][i] : '#333');
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
    if (ENG_T && hasProps(ENGINE_PROPS)) { cx = ENG_T.x; cy = ENG_T.b - ENG_T.w * 0.42; }
    if (hasProps(ENGINE_PROPS)) {   // estelas girando encima de la turbina dibujada
      c.save(); c.translate(cx, cy); c.scale(1, 0.55); c.rotate(t * 6); c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2.5;
      for (i = 0; i < 3; i++) { c.rotate(Math.PI * 2 / 3); c.beginPath(); c.arc(0, 0, 20, 0, 0.9); c.stroke(); }
      c.restore();
    } else {
      var glow = c.createRadialGradient(cx, cy, 4, cx, cy, 31); glow.addColorStop(0, 'rgba(255,200,100,0.95)'); glow.addColorStop(1, 'rgba(255,90,40,0.15)');
      circ(c, cx, cy, 31, glow);
      c.save(); c.translate(cx, cy); c.rotate(t * 5); c.fillStyle = '#4a4068'; c.strokeStyle = OUT; c.lineWidth = 1.2;
      for (i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.ellipse(14, 0, 14, 5, 0.4, 0, Math.PI * 2); c.fill(); c.stroke(); }
      c.restore(); circ(c, cx, cy, 7, '#c9b8ff', 1.5);
    }
    if (Math.sin(t * 7) > 0.6) for (i = 0; i < 4; i++) { c.fillStyle = '#ffe066'; c.fillRect(r.x + 185 + rand(Math.floor(t * 10) + i) * 20, r.y + 135 - rand(Math.floor(t * 10) + i + 5) * 15, 2, 2); }
    // Reactor: núcleo, energía por los conductos
    r = R('reactor');
    var rcx = r.x + 110, rcy = r.y + 155, alarm = opts.reactor, pulse = 0.5 + 0.5 * Math.sin(t * (alarm ? 10 : 2));
    if (hasProps(REACTOR_PROPS)) {   // brillo que late encima de la cúpula dibujada
      var gy = rcy - 4, gl = c.createRadialGradient(rcx, gy, 2, rcx, gy, 40);
      gl.addColorStop(0, alarm ? 'rgba(255,200,170,' + (0.5 + 0.4 * pulse) + ')' : 'rgba(200,250,255,' + (0.25 + 0.3 * pulse) + ')');
      gl.addColorStop(1, alarm ? 'rgba(255,30,30,0)' : 'rgba(60,180,255,0)');
      c.save(); c.globalCompositeOperation = alarm ? 'source-over' : 'lighter'; c.fillStyle = gl; c.beginPath(); c.ellipse(rcx, gy, 40, 32, 0, 0, Math.PI * 2); c.fill(); c.restore();
      if (alarm) { c.fillStyle = 'rgba(255,40,40,' + (0.25 * pulse) + ')'; c.beginPath(); c.ellipse(rcx, gy, 44, 34, 0, 0, Math.PI * 2); c.fill(); }
    } else {
      var core = c.createRadialGradient(rcx, rcy, 3, rcx, rcy, 32);
      core.addColorStop(0, alarm ? 'rgba(255,240,200,1)' : 'rgba(220,255,255,1)');
      core.addColorStop(1, alarm ? 'rgba(255,40,40,' + (0.35 + 0.5 * pulse) + ')' : 'rgba(60,200,255,' + (0.3 + 0.3 * pulse) + ')');
      circ(c, rcx, rcy, 32, core);
      c.strokeStyle = alarm ? '#ff5050' : '#8a7fb8'; c.lineWidth = 4; circ(c, rcx, rcy, 38); c.stroke();
    }
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

  // ---------- DETALLES GENÉRICOS (los dos mapas) ----------
  // ¿Hay hueco (puerta) justo fuera de este punto del borde?
  function openAt(x, y) { return MAP.inRect(x, y); }
  // Zócalo con lucecitas en los bordes izquierdo, derecho e inferior de cada sala, y columnas en las esquinas
  function roomTrim(c, r, accent) {
    var edges = [
      [r.x, r.y + r.h, r.x + r.w, r.y + r.h, 0, 1],    // abajo
      [r.x, r.y, r.x, r.y + r.h, -1, 0],                // izquierda
      [r.x + r.w, r.y, r.x + r.w, r.y + r.h, 1, 0]      // derecha
    ];
    edges.forEach(function (e) {
      var len = Math.hypot(e[2] - e[0], e[3] - e[1]), dx = (e[2] - e[0]) / len, dy = (e[3] - e[1]) / len, run = null, k;
      function flush(a, b) {
        if (b - a < 6) return;
        var x0 = e[0] + dx * a, y0 = e[1] + dy * a, x1 = e[0] + dx * b, y1 = e[1] + dy * b;
        var bx = Math.min(x0, x1) - (e[4] > 0 ? 7 : 0), by = Math.min(y0, y1) - (e[5] > 0 ? 7 : 0);
        var bw = e[4] ? 7 : Math.abs(x1 - x0), bh = e[5] ? 7 : Math.abs(y1 - y0);
        c.fillStyle = 'rgba(10,14,30,0.35)'; c.fillRect(bx, by, bw, bh);
        c.fillStyle = 'rgba(255,255,255,0.10)';
        if (e[5]) c.fillRect(bx, by, bw, 1.5); else c.fillRect(e[4] > 0 ? bx : bx + bw - 1.5, by, 1.5, bh);
        for (var t = a + 24; t < b - 10; t += 48) {
          var lx = e[0] + dx * t + (e[4] ? -e[4] * 3.5 : 0) + (e[4] < 0 ? 0 : 0), ly = e[1] + dy * t + (e[5] ? -3.5 : 0);
          if (e[4] < 0) lx = e[0] + 3.5;
          circ(c, lx, ly, 1.6, accent || '#7fd8ff');
        }
      }
      for (k = 0; k <= len; k += 4) {
        var px = e[0] + dx * k + e[4] * 3, py = e[1] + dy * k + e[5] * 3;
        var wall = !openAt(px, py);
        if (wall && run === null) run = k;
        if ((!wall || k + 4 > len) && run !== null) { flush(run, wall ? len : k); run = null; }
      }
    });
    [[r.x, r.y + r.h], [r.x + r.w, r.y + r.h]].forEach(function (p, i) {
      if (openAt(p[0] + (i ? 4 : -4), p[1] - 4) || openAt(p[0] + (i ? -4 : 4), p[1] + 4)) return;
      box(c, p[0] - (i ? 11 : 0), p[1] - 11, 11, 11, '#4a5478', 2, { lw: 1.4, flat: false });
      c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(p[0] - (i ? 9 : -2), p[1] - 9, 3, 3);
    });
  }
  // Lámparas de pared en la parte de arriba de salas y pasillos, con su charco de luz en el suelo
  function wallLamps(c, warm) {
    var F = MAP.wallFace;
    MAP.rects.forEach(function (r) {
      var isRoom = MAP.rooms.indexOf(r) >= 0;
      if (!isRoom && r.w < r.h) return;
      var segs = MAP.topWalls(r), best = null;
      segs.forEach(function (sg) { if (!best || sg[1] - sg[0] > best[1] - best[0]) best = sg; });
      var signC = isRoom && best ? (best[0] + best[1]) / 2 : -9999;
      segs.forEach(function (sg) {
        var step = isRoom ? 120 : 150;
        for (var x = sg[0] + 45; x < sg[1] - 30; x += step) {
          if (Math.abs(x - signC) < 80) continue;
          var y = r.y - 4;
          var g = c.createRadialGradient(x, r.y + 6, 2, x, r.y + 16, isRoom ? 60 : 42);
          g.addColorStop(0, warm ? 'rgba(255,236,170,0.32)' : 'rgba(170,240,255,0.30)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          c.fillStyle = g; c.beginPath(); c.ellipse(x, r.y + 14, isRoom ? 56 : 40, isRoom ? 30 : 20, 0, 0, Math.PI * 2); c.fill();
          if (warm && TEX.lampara && TEX.lampara.ok) { var lw2 = 17, lh2 = lw2 * TEX.lampara.img.height / TEX.lampara.img.width; c.drawImage(TEX.lampara.img, x - lw2 / 2, r.y - lh2 - 1, lw2, lh2); continue; }
          c.fillStyle = OUT; c.beginPath(); c.moveTo(x - 9, y - 6); c.lineTo(x + 9, y - 6); c.lineTo(x + 6, y); c.lineTo(x - 6, y); c.closePath(); c.fill();
          c.fillStyle = warm ? '#ffe9a8' : '#bff4ff'; c.beginPath(); c.moveTo(x - 7, y - 5); c.lineTo(x + 7, y - 5); c.lineTo(x + 5, y - 1); c.lineTo(x - 5, y - 1); c.closePath(); c.fill();
          c.fillStyle = '#5d6687'; c.fillRect(x - 1.5, y - F * 0.42 - 6, 3, F * 0.42);
        }
      });
    });
  }
  // ---------- objetos sueltos para decorar ----------
  var ITEMS = {
    barrel: function (c, x, y, col) { circ(c, x + 2, y + 4, 10, 'rgba(0,0,0,0.3)'); circ(c, x, y, 10, col || '#3e7bfa', 2); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 2; c.beginPath(); c.arc(x, y, 6, 0, Math.PI * 2); c.stroke(); circ(c, x - 3, y - 3, 2, 'rgba(255,255,255,0.5)'); },
    barrels: function (c, x, y, col) { ITEMS.barrel(c, x, y, col); ITEMS.barrel(c, x + 20, y + 2, col); ITEMS.barrel(c, x + 10, y + 17, col); },
    toolbox: function (c, x, y) { box(c, x - 14, y - 7, 28, 14, '#e5484d', 3); c.strokeStyle = OUT; c.lineWidth = 2; c.beginPath(); c.moveTo(x - 6, y - 7); c.lineTo(x - 6, y - 11); c.lineTo(x + 6, y - 11); c.lineTo(x + 6, y - 7); c.stroke(); c.fillStyle = '#c0c4d4'; c.fillRect(x - 2, y - 2, 4, 3); },
    locker: function (c, x, y, col) { box(c, x - 10, y - 18, 20, 36, col || '#5a6aa8', 3); c.fillStyle = 'rgba(0,0,0,0.3)'; for (var i = 0; i < 3; i++) c.fillRect(x - 6, y - 13 + i * 3, 12, 1.2); c.fillStyle = '#ffd23f'; c.fillRect(x + 5, y, 2, 5); },
    cooler: function (c, x, y) { box(c, x - 9, y - 6, 18, 22, '#e8ecf6', 3); box(c, x - 7, y - 20, 14, 15, 'rgba(120,200,255,0.8)', 6, { lw: 1.4 }); circ(c, x - 3, y + 2, 1.6, '#3e7bfa'); circ(c, x + 3, y + 2, 1.6, '#e5484d'); },
    chair: function (c, x, y, col) { circ(c, x, y, 8, col || '#3a4a7a', 1.6); box(c, x - 8, y - 12, 16, 6, col || '#2a3a6a', 3, { lw: 1.2 }); },
    beanbag: function (c, x, y, col) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x + 2, y + 4, 15, 10, 0, 0, Math.PI * 2); c.fill(); c.fillStyle = col || '#ff8ab8'; c.beginPath(); c.ellipse(x, y, 15, 11, 0, 0, Math.PI * 2); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.ellipse(x - 4, y - 4, 5, 3, -0.4, 0, Math.PI * 2); c.fill(); },
    lamptable: function (c, x, y) { circ(c, x + 2, y + 3, 11, 'rgba(0,0,0,0.25)'); circ(c, x, y, 11, '#8a6a45', 1.8); circ(c, x, y - 2, 5, '#ffe9a8', 1.2); var g = c.createRadialGradient(x, y - 2, 2, x, y - 2, 26); g.addColorStop(0, 'rgba(255,230,160,0.35)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.beginPath(); c.arc(x, y - 2, 26, 0, Math.PI * 2); c.fill(); },
    screens: function (c, x, y) { box(c, x - 16, y - 4, 32, 12, '#3a3f55', 3); box(c, x - 14, y - 18, 13, 12, '#0e3048', 2, { lw: 1.2 }); box(c, x + 1, y - 18, 13, 12, '#0e3048', 2, { lw: 1.2 }); c.fillStyle = '#5fffc0'; c.fillRect(x - 12, y - 14, 8, 1.5); c.fillRect(x - 12, y - 11, 5, 1.5); c.fillStyle = '#7fd8ff'; c.fillRect(x + 3, y - 15, 9, 6); },
    jar: function (c, x, y, col) { box(c, x - 9, y - 20, 18, 26, col || 'rgba(160,255,200,0.5)', 7, { lw: 1.8 }); box(c, x - 11, y + 4, 22, 6, '#5a6488', 2, { lw: 1.2 }); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(x - 6, y - 16, 2.5, 16); },
    microscope: function (c, x, y) { box(c, x - 16, y - 8, 32, 16, '#eef0f6', 3); box(c, x - 4, y - 18, 8, 16, '#5a6488', 2, { lw: 1.2 }); circ(c, x, y - 18, 3, '#2a2f40', 1); },
    anvil: function (c, x, y) { box(c, x - 6, y - 2, 12, 10, '#3a3f55', 2); c.fillStyle = '#5a6070'; c.beginPath(); c.moveTo(x - 16, y - 10); c.lineTo(x + 12, y - 10); c.lineTo(x + 18, y - 6); c.lineTo(x + 10, y - 2); c.lineTo(x - 12, y - 2); c.closePath(); c.fill(); c.lineWidth = 2; c.strokeStyle = OUT; c.stroke(); },
    parts: function (c, x, y) { box(c, x - 16, y - 10, 32, 20, '#7a7a8a', 3); circ(c, x - 7, y - 2, 4, '#c8ccda', 1.2); circ(c, x + 4, y + 1, 3, '#5bd8ff', 1.2); box(c, x + 6, y - 7, 7, 5, '#f5a524', 1.5, { lw: 1 }); },
    suits: function (c, x, y) { box(c, x - 24, y - 4, 48, 6, '#5a6488', 2, { lw: 1.4 }); ['#ffd23f', '#ff8a4a', '#7fd8ff'].forEach(function (col, i) { var sx = x - 16 + i * 16; circ(c, sx, y - 10, 6, '#c8ccda', 1.6); box(c, sx - 6, y - 4, 12, 16, col, 4, { lw: 1.6 }); circ(c, sx + 1, y - 10, 3, '#2b4f9a'); }); },
    hazard: function (c, x, y, rad) { c.save(); c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.arc(x, y, rad - 9, 0, Math.PI * 2, true); c.clip(); for (var a = 0; a < Math.PI * 2; a += 0.3) { c.fillStyle = (Math.round(a / 0.3) % 2) ? '#f2c53a' : '#1b1b2a'; c.beginPath(); c.moveTo(x, y); c.arc(x, y, rad + 2, a, a + 0.3); c.closePath(); c.fill(); } c.restore(); },
    rug: function (c, x, y, w, h, col) { c.fillStyle = col || 'rgba(160,60,60,0.35)'; rr(c, x, y, w, h, 10); c.fill(); c.strokeStyle = 'rgba(255,255,255,0.25)'; c.lineWidth = 2; rr(c, x + 5, y + 5, w - 10, h - 10, 7); c.stroke(); },
    sign: function (c, x, y, sym) { box(c, x - 11, y - 11, 22, 22, '#f2c53a', 3); c.fillStyle = OUT; c.font = 'bold 14px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sym || '!', x, y + 1); },
    plant: function (c, x, y, big) { plant(c, x, y, big); },
    crate: function (c, x, y, col) { crate(c, x - 12, y - 12, 24, col); }
  };
  function placeItems(c, list) { list.forEach(function (it) { ITEMS[it[0]].apply(null, [c].concat(it.slice(1))); }); }
  // Detalles añadidos a la nave (coordenadas base)
  var NAVE_UNDER = [['hazard', 140, 505, 58], ['rug', 1350, 410, 60, 80, 'rgba(60,120,180,0.25)']];
  var NAVE_OVER = [
    ['barrels', 62, 445, '#e5484d'], ['toolbox', 335, 460],
    ['plant', 597, 338, false], ['locker', 738, 328, '#5a6aa8'], ['chair', 1395, 475, '#8a3a3a'],
    ['screens', 405, 690], ['screens', 707, 640], ['barrels', 1098, 645, '#c08a52'], ['crate', 1480, 625, '#6a7a9a'], ['crate', 1505, 625, '#5a6a8a'],
    ['cooler', 1182, 335], ['sign', 1525, 760, '!']
  ];
  var ABISAL_UNDER = [['rug', 945, 125, 70, 60, 'rgba(255,170,220,0.25)']];
  var ABISAL_OVER = [
    ['screens', 380, 185], ['lamptable', 980, 150], ['beanbag', 945, 165, '#ff8ab8'], ['beanbag', 1015, 168, '#7fc8ff'], ['screens', 1150, 150],
    ['chair', 500, 352, '#2a5a4a'], ['microscope', 75, 445], ['jar', 252, 455, 'rgba(255,200,120,0.5)'], ['parts', 520, 548], ['toolbox', 440, 660],
    ['chair', 250, 668, '#3a4a7a'], ['plant', 658, 345, true], ['anvil', 1185, 352], ['barrels', 1105, 566, '#3e7bfa'],
    ['sign', 1385, 470, '🔥'], ['suits', 1500, 765]
  ];

  function vents(c) {
    MAP.vents.forEach(function (v) {
      if (TEX.rejilla && TEX.rejilla.ok) { var vh = 34 * TEX.rejilla.img.height / TEX.rejilla.img.width; c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(v.x - 15, v.y - vh / 2 + 4, 34, vh); c.drawImage(TEX.rejilla.img, v.x - 17, v.y - vh / 2, 34, vh); return; }
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
    var i, TT = TEX['tarea-' + (s.type === 'upload' ? 'download' : s.type)];
    if (MAP.isShip() && TT && TT.ok) {   // máquina dibujada con Gemini, apoyada 18 por debajo del punto de la tarea
      var tw = TASK_W[s.type] || 36, th = tw * TT.img.height / TT.img.width;
      c.drawImage(TT.img, -tw / 2, 18 - th, tw, th);
      if (s.type === 'reactor' && reactorAlarm && Math.sin(t * 10) > 0) { c.fillStyle = 'rgba(255,40,40,0.45)'; rr(c, -tw / 2, 18 - th, tw, th, 6); c.fill(); }
      if (s.type === 'lights' && lightsOut && Math.sin(t * 8) > 0) { c.fillStyle = 'rgba(255,60,60,0.4)'; rr(c, -tw / 2, 18 - th, tw, th, 4); c.fill(); }
    } else if (s.type === 'emergency' && TEX['cafe-boton'] && TEX['cafe-boton'].ok) {
      drawProp(c, 'cafe-boton', 0, 20, 40);
    } else if (s.type === 'emergency') {
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
    sk.exteriorStatic(c, sk);
    walls(c, tr, sk);
    MAP.rooms.forEach(function (r) { sk.floor(c, r); });
    var TH = sk.theme || THEME;
    MAP.rooms.forEach(function (r) { roomTrim(c, r, TH[r.id] && TH[r.id].accent); });
    MAP.corridors.forEach(function (k2) { (sk.corridor || corridor)(c, k2); });
    doors(c);
    signs(c, tr, sk);
    placeItems(c, MAP.id === 'abisal' ? ABISAL_UNDER : NAVE_UNDER);
    sk.staticDecor(c);
    placeItems(c, MAP.id === 'abisal' ? ABISAL_OVER : NAVE_OVER.filter(function (it) {
      // los detalles antiguos de las salas que ya tienen muebles de Gemini se quitan
      var x = it[1], y = it[2];
      if (it[0] === 'barrels' && x < 230 && hasProps(REACTOR_PROPS)) return false;
      if (it[0] === 'toolbox' && x < 540 && y < 570 && hasProps(ENGINE_PROPS)) return false;
      if ((it[0] === 'plant' || it[0] === 'locker') && x > 580 && x < 750 && y < 360 && hasProps(S2_PROPS)) return false;
      return true;
    }));
    wallLamps(c, MAP.id !== 'abisal');
    vents(c);
    caches[key] = cv;
    return cv;
  }

  // opts: { t, highlight: [ids], lightsOut, reactor, tr, res: píxeles por unidad del mundo }
  function draw(ctx, opts) {
    opts = opts || {};
    var K = MAP.scale || 1;
    if (K !== 1) {
      var o2 = {}; for (var q in opts) o2[q] = opts[q];
      o2.res = (opts.res || 1) * K;
      ctx.save(); ctx.scale(K, K);
      try { MAP.withBase(function () { drawBase(ctx, o2); }); } finally { ctx.restore(); }
      return;
    }
    drawBase(ctx, opts);
  }
  function drawBase(ctx, opts) {
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
    hull: hull, inHull: inHull, hullPath: hullPath,
    U: { rr: rr, circ: circ, shadow: shadow, box: box, shade: shade, unionPath: unionPath, rand: rand, crate: crate, plant: plant, table: table, corridor: corridor }
  };
  if (root.DRAW) root.DRAW.ship = draw;
})(window);
