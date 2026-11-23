/* Disfraces del astronauta (diseños originales). Se desbloquean al subir de nivel.
   Coordenadas del personaje: casco centrado en (0,-18) radio 13; cuerpo de x -11..11, y -8..9; mira a la derecha. */
(function (root) {
  var OUT = '#1a1a2e';
  var LIST = {
    hat: [
      { id: 'none', lv: 1 }, { id: 'cap', lv: 1 }, { id: 'bow', lv: 1 }, { id: 'flower', lv: 2 }, { id: 'party', lv: 2 },
      { id: 'headphones', lv: 3 }, { id: 'cowboy', lv: 4 }, { id: 'chef', lv: 5 }, { id: 'crown', lv: 6 }, { id: 'wizard', lv: 8 },
      { id: 'viking', lv: 10 }, { id: 'halo', lv: 12 }, { id: 'pirate', lv: 14 }
    ],
    suit: [
      { id: 'none', lv: 1 }, { id: 'cat', lv: 1 }, { id: 'bunny', lv: 2 }, { id: 'bear', lv: 3 }, { id: 'bee', lv: 4 },
      { id: 'frog', lv: 5 }, { id: 'fox', lv: 6 }, { id: 'dragon', lv: 8 }, { id: 'unicorn', lv: 10 }, { id: 'penguin', lv: 12 }
    ],
    fx: [
      { id: 'none', lv: 1 }, { id: 'sparkles', lv: 3 }, { id: 'hearts', lv: 4 }, { id: 'bubbles', lv: 5 }, { id: 'leaves', lv: 6 },
      { id: 'snow', lv: 7 }, { id: 'flames', lv: 9 }, { id: 'stars', lv: 11 }, { id: 'rainbow', lv: 15 },
      // Efectos inspirados en los personajes (nivel provisional: de momento todo está desbloqueado, ver UNLOCK_ALL)
      { id: 'electric', lv: 6 }, { id: 'crystals', lv: 5 }, { id: 'gears', lv: 4 }, { id: 'notes', lv: 3 }, { id: 'film', lv: 5 },
      { id: 'static', lv: 4 }, { id: 'galaxy', lv: 12 }, { id: 'fireflies', lv: 6 }, { id: 'spores', lv: 5 }, { id: 'petals', lv: 3 },
      { id: 'sakura', lv: 8 }, { id: 'bees', lv: 7 }, { id: 'sand', lv: 6 }, { id: 'embers', lv: 9 }, { id: 'smoke', lv: 4 },
      { id: 'coins', lv: 10 }, { id: 'gems', lv: 11 }, { id: 'eyes', lv: 8 }, { id: 'slime', lv: 5 }, { id: 'bolts', lv: 6 },
      { id: 'rain', lv: 7 }, { id: 'feathers', lv: 4 }, { id: 'shadow', lv: 13 }, { id: 'runes', lv: 12 }, { id: 'radar', lv: 7 },
      { id: 'jellies', lv: 9 }, { id: 'balloons', lv: 3 }, { id: 'sparks', lv: 8 }, { id: 'planets', lv: 14 }, { id: 'confetti', lv: 2 }
    ]
  };
  // Personajes (imágenes): todos disponibles desde el principio
  var PD = root.PERSONAJES_DATA || (typeof require !== 'undefined' ? (function () { try { return require('./personajes-data.js'); } catch (e) { return []; } })() : []);
  LIST.ch = PD.map(function (d) { return { id: d[0], lv: 1, es: d[5], en: d[6] }; });
  // Mientras se prueban: todo desbloqueado. Para bloquear por nivel, poner UNLOCK_ALL = false
  // (los niveles de cada cosa ya están en «lv»).
  var UNLOCK_ALL = true;
  function unlocked(it, level) { return UNLOCK_ALL || it.lv <= level; }
  function find(slot, id) { var l = LIST[slot] || []; for (var i = 0; i < l.length; i++) if (l[i].id === id) return l[i]; return null; }
  function valid(look) {
    var out = { hat: 'none', suit: 'none', fx: 'none' };
    if (look && typeof look === 'object') ['hat', 'suit', 'fx'].forEach(function (k) { if (find(k, look[k])) out[k] = look[k]; });
    if (look && typeof look === 'object' && find('ch', look.ch)) out.ch = look.ch;
    return out;
  }
  function randomFor(level) {
    var o = {};
    if (LIST.ch.length) o.ch = LIST.ch[Math.floor(Math.random() * LIST.ch.length)].id;
    ['hat', 'suit', 'fx'].forEach(function (k) {
      var ok = LIST[k].filter(function (it) { return unlocked(it, level); });
      o[k] = Math.random() < (k === 'fx' ? 0.25 : 0.55) ? ok[Math.floor(Math.random() * ok.length)].id : 'none';
    });
    return o;
  }

  // ---- utilidades de dibujo con contorno ----
  function path(ctx, fill, lw) { ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = lw || 1.8; ctx.strokeStyle = OUT; ctx.stroke(); }
  function ell(ctx, x, y, rx, ry, rot, fill, lw) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); path(ctx, fill, lw); }
  function poly(ctx, pts, fill, lw) { ctx.beginPath(); ctx.moveTo(pts[0], pts[1]); for (var i = 2; i < pts.length; i += 2) ctx.lineTo(pts[i], pts[i + 1]); ctx.closePath(); path(ctx, fill, lw); }

  // Colores de cada disfraz de animal
  var SUIT = {
    cat: { c: '#f5a524', in: '#ffd6a0' }, bunny: { c: '#f2f2f7', in: '#ffb3c8' }, bear: { c: '#8a5a33', in: '#d9a77a' },
    bee: { c: '#f2d63a', in: '#1a1a2e' }, frog: { c: '#57c14a', in: '#ffffff' }, fox: { c: '#e8743b', in: '#fff3e6' },
    dragon: { c: '#6b4fd8', in: '#ffcf5a' }, unicorn: { c: '#ffffff', in: '#ff9ad5' }, penguin: { c: '#2a2f45', in: '#ffffff' }
  };

  // Detrás del cuerpo: colas y alas
  function back(ctx, look, t) {
    var s = look.suit, S = SUIT[s];
    if (!S) return;
    var sw = Math.sin(t * 4) * 0.15;
    ctx.save();
    if (s === 'cat') { ctx.beginPath(); ctx.moveTo(-14, 4); ctx.quadraticCurveTo(-26, 2 + sw * 10, -22, -10); ctx.lineWidth = 6; ctx.strokeStyle = OUT; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 3.4; ctx.strokeStyle = S.c; ctx.stroke(); }
    else if (s === 'bunny') ell(ctx, -15, 5, 5, 5, 0, S.c);
    else if (s === 'bear') ell(ctx, -14, 6, 3.5, 3.5, 0, S.c);
    else if (s === 'fox') { ctx.rotate(sw); ell(ctx, -20, 1, 10, 5.5, -0.6, S.c); ell(ctx, -26, -4, 4, 3, -0.6, S.in, 1.4); }
    else if (s === 'dragon') {
      ctx.save(); ctx.rotate(sw * 0.5);
      poly(ctx, [-12, -6, -26, -16, -24, -4, -30, -2, -14, 4], S.c);
      ctx.restore();
      poly(ctx, [-12, 6, -22, 10, -28, 6, -22, 4], S.c);
    }
    else if (s === 'unicorn') { ctx.beginPath(); ctx.moveTo(-14, 2); ctx.quadraticCurveTo(-24, 6, -20, 14); ctx.lineWidth = 5; ctx.strokeStyle = '#ff9ad5'; ctx.lineCap = 'round'; ctx.stroke(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#8fd3ff'; ctx.stroke(); }
    else if (s === 'bee') { ell(ctx, -12, -10, 7, 4, -0.8, 'rgba(220,240,255,0.8)', 1.2); ell(ctx, -14, -4, 6, 3.5, -0.3, 'rgba(220,240,255,0.8)', 1.2); }
    else if (s === 'penguin') { /* sin cola */ }
    ctx.restore();
  }
  // Sobre el cuerpo: rayas, barriga...
  function body(ctx, look) {
    var s = look.suit, S = SUIT[s];
    if (!S) return;
    if (s === 'bee') { ctx.fillStyle = OUT; ctx.fillRect(-11, -4, 22, 3); ctx.fillRect(-11, 2, 22, 3); }
    else if (s === 'penguin' || s === 'frog' || s === 'fox' || s === 'bear') { ell(ctx, 1, 1, 6, 6, 0, S.in, 1.2); }
    else if (s === 'dragon') { for (var i = 0; i < 3; i++) poly(ctx, [-11, -6 + i * 5, -15, -4 + i * 5, -11, -2 + i * 5], S.in, 1.1); }
  }
  // Sobre el casco: orejas, cuernos, crin
  function head(ctx, look) {
    var s = look.suit, S = SUIT[s];
    if (!S) return;
    if (s === 'cat' || s === 'fox') {
      poly(ctx, [-11, -25, -8, -38, -2, -29], S.c); poly(ctx, [3, -30, 9, -39, 11, -25], S.c);
      poly(ctx, [-9, -27, -7.5, -34, -4, -29], S.in, 1); poly(ctx, [4.5, -30, 8.5, -35, 9.5, -27], S.in, 1);
    } else if (s === 'bunny') {
      ell(ctx, -5, -38, 3.6, 10, -0.15, S.c); ell(ctx, 5, -38, 3.6, 10, 0.15, S.c);
      ell(ctx, -5, -38, 1.6, 7, -0.15, S.in, 0.8); ell(ctx, 5, -38, 1.6, 7, 0.15, S.in, 0.8);
    } else if (s === 'bear') {
      ell(ctx, -9, -30, 4.5, 4.5, 0, S.c); ell(ctx, 9, -30, 4.5, 4.5, 0, S.c);
      ell(ctx, -9, -30, 2.2, 2.2, 0, S.in, 0.8); ell(ctx, 9, -30, 2.2, 2.2, 0, S.in, 0.8);
    } else if (s === 'bee') {
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(-4, -30); ctx.quadraticCurveTo(-8, -38, -10, -40); ctx.moveTo(4, -30); ctx.quadraticCurveTo(8, -38, 10, -40); ctx.stroke();
      ell(ctx, -10, -40, 2.4, 2.4, 0, OUT, 0.5); ell(ctx, 10, -40, 2.4, 2.4, 0, OUT, 0.5);
    } else if (s === 'frog') {
      ell(ctx, -6, -31, 5, 4.5, 0, S.c); ell(ctx, 8, -31, 5, 4.5, 0, S.c);
      ell(ctx, -6, -31, 2.6, 2.6, 0, '#ffffff', 0.8); ell(ctx, 8, -31, 2.6, 2.6, 0, '#ffffff', 0.8);
      ell(ctx, -5.5, -31, 1.2, 1.2, 0, OUT, 0.3); ell(ctx, 8.5, -31, 1.2, 1.2, 0, OUT, 0.3);
    } else if (s === 'dragon') {
      poly(ctx, [-8, -28, -12, -39, -4, -30], S.in); poly(ctx, [5, -30, 11, -40, 10, -27], S.in);
      for (var i = 0; i < 3; i++) poly(ctx, [-13 + i * 2, -22 - i * 4, -18 + i * 2, -22 - i * 4, -14 + i * 2, -18 - i * 4], S.c, 1.1);
    } else if (s === 'unicorn') {
      poly(ctx, [1, -30, 4, -46, 7, -30], '#ffe066');
      ctx.strokeStyle = '#e0b030'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(2, -34); ctx.lineTo(6, -35); ctx.moveTo(3, -39); ctx.lineTo(5.5, -40); ctx.stroke();
      ['#ff9ad5', '#8fd3ff', '#c39bff'].forEach(function (c, k) { ell(ctx, -10 - k * 2, -26 + k * 6, 4, 6, 0.4, c, 1.2); });
    } else if (s === 'penguin') {
      ctx.save(); ctx.beginPath(); ctx.arc(0, -18, 13.5, Math.PI * 1.02, Math.PI * 1.98); ctx.lineTo(0, -22); ctx.closePath(); path(ctx, S.c, 1.6); ctx.restore();
      poly(ctx, [11, -16, 18, -14, 11, -12], '#f5a524', 1.2);
    }
  }
  // Sombreros
  function hat(ctx, look, hex) {
    var h = look.hat;
    if (!h || h === 'none') return;
    if (h === 'cap') { ctx.beginPath(); ctx.arc(0, -25, 11, Math.PI, 0); ctx.closePath(); path(ctx, '#e5484d'); poly(ctx, [6, -26, 20, -24, 20, -22, 6, -24], '#c0392b'); ell(ctx, 0, -36, 1.8, 1.8, 0, '#ffffff', 1); }
    else if (h === 'bow') { poly(ctx, [0, -31, -9, -37, -9, -26], '#ff6fa8'); poly(ctx, [0, -31, 9, -37, 9, -26], '#ff6fa8'); ell(ctx, 0, -31, 2.8, 2.8, 0, '#ff3d8b'); }
    else if (h === 'flower') { for (var k = 0; k < 5; k++) { var a = k / 5 * Math.PI * 2; ell(ctx, 7 + Math.cos(a) * 4, -31 + Math.sin(a) * 4, 3, 3, 0, '#ffffff', 1.2); } ell(ctx, 7, -31, 2.4, 2.4, 0, '#ffd23f', 1); }
    else if (h === 'party') { poly(ctx, [-8, -27, 0, -50, 8, -27], '#8e4ec6'); ctx.fillStyle = '#ffe066'; for (var d = 0; d < 3; d++) { ctx.beginPath(); ctx.arc(-2 + d * 2, -32 - d * 6, 1.5, 0, 7); ctx.fill(); } ell(ctx, 0, -50, 2.6, 2.6, 0, '#ff6fa8', 1.2); }
    else if (h === 'headphones') { ctx.beginPath(); ctx.arc(0, -18, 15.5, Math.PI * 1.08, Math.PI * 1.92); ctx.lineWidth = 5; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 3; ctx.strokeStyle = '#3e7bfa'; ctx.stroke(); ell(ctx, -14, -18, 3.5, 5.5, 0, '#3e7bfa'); ell(ctx, 14, -18, 3.5, 5.5, 0, '#3e7bfa'); }
    else if (h === 'cowboy') { ell(ctx, 0, -28, 19, 4, 0, '#a0662f'); ctx.beginPath(); ctx.moveTo(-9, -28); ctx.quadraticCurveTo(-9, -42, 0, -40); ctx.quadraticCurveTo(9, -42, 9, -28); ctx.closePath(); path(ctx, '#b87638'); ctx.fillStyle = '#5a3415'; ctx.fillRect(-9, -31, 18, 2.5); }
    else if (h === 'chef') { ctx.fillStyle = '#ffffff'; ell(ctx, -6, -40, 6, 6, 0, '#ffffff'); ell(ctx, 6, -40, 6, 6, 0, '#ffffff'); ell(ctx, 0, -44, 7, 6, 0, '#ffffff'); ctx.beginPath(); ctx.rect(-8, -38, 16, 9); path(ctx, '#ffffff'); }
    else if (h === 'crown') { poly(ctx, [-10, -28, -11, -40, -5, -34, 0, -42, 5, -34, 11, -40, 10, -28], '#ffd23f'); ell(ctx, 0, -32, 1.8, 1.8, 0, '#e5484d', 0.8); ell(ctx, -6, -31, 1.4, 1.4, 0, '#3e7bfa', 0.8); ell(ctx, 6, -31, 1.4, 1.4, 0, '#30a46c', 0.8); }
    else if (h === 'wizard') { ell(ctx, 0, -28, 16, 3.5, 0, '#3b2d8a'); poly(ctx, [-10, -29, 4, -56, 10, -29], '#4a3aa8'); ctx.fillStyle = '#ffe066'; ctx.beginPath(); ctx.arc(1, -38, 2, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(-3, -32, 1.4, 0, 7); ctx.fill(); }
    else if (h === 'viking') { ctx.beginPath(); ctx.arc(0, -26, 12, Math.PI, 0); ctx.closePath(); path(ctx, '#9aa3b5'); poly(ctx, [-11, -28, -20, -40, -14, -26], '#fff4d6'); poly(ctx, [11, -28, 20, -40, 14, -26], '#fff4d6'); ctx.fillStyle = '#6b7385'; ctx.fillRect(-12, -27, 24, 3); }
    else if (h === 'halo') { ctx.beginPath(); ctx.ellipse(0, -38, 11, 3.5, 0, 0, Math.PI * 2); ctx.lineWidth = 4.5; ctx.strokeStyle = OUT; ctx.stroke(); ctx.lineWidth = 2.6; ctx.strokeStyle = '#ffe066'; ctx.stroke(); }
    else if (h === 'pirate') { ctx.beginPath(); ctx.moveTo(-16, -27); ctx.quadraticCurveTo(0, -46, 16, -27); ctx.quadraticCurveTo(0, -32, -16, -27); path(ctx, '#2a2f45'); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -33, 2.4, 0, 7); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.fillRect(-14, -29, 28, 1.6); }
  }
  // ¿El sombrero/disfraz es alto? (para subir el nombre)
  function topOf(look) {
    if (!look) return 37;
    if (look.ch && find('ch', look.ch)) return 46;
    var t = { party: 52, wizard: 58, chef: 51, unicorn: 47, bunny: 49, crown: 43, viking: 42, cowboy: 43, halo: 42, dragon: 42, bee: 43 };
    return Math.max(t[look.hat] || 37, t[look.suit] || 37);
  }
  // Efectos alrededor (en coordenadas del mundo)

  // ---- Efectos inspirados en los personajes ----
  // Cada uno: n partículas, «mov» (rise sube · fall cae · orbit gira · wander revolotea · burst estalla · ring ondas) y dibujo d(ctx, x, y, i, ph, t)
  function star(ctx, x, y, r, pts, inner) { ctx.beginPath(); for (var k = 0; k < pts * 2; k++) { var a = -Math.PI / 2 + k * Math.PI / pts, rr = k % 2 ? r * (inner || 0.45) : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); }
  function glow(ctx, x, y, r, col) { var g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
  // Partículas dibujadas con Gemini (E1 brillos, E2 objetos) en img/efectos.webp: 8×4 casillas de 64 px.
  // 0-3 rayos · 4-7 cristales · 8-11 luciérnagas · 12-15 destellos · 16-19 abejas · 20-23 moneda girando · 24-27 plumas · 28-31 notas
  var SPR = { ok: false };
  if (typeof Image !== 'undefined') { SPR.img = new Image(); SPR.img.onload = function () { SPR.ok = true; }; SPR.img.src = 'img/efectos.webp?v=1'; }
  function spr(c, k, x, y, s, rot, flip) {
    c.save(); c.translate(x, y); if (rot) c.rotate(rot); if (flip) c.scale(-1, 1);
    c.drawImage(SPR.img, (k % 8) * 64, (k >> 3) * 64, 64, 64, -s / 2, -s / 2, s, s); c.restore();
  }
  var NFX = {
    sparkles: { n: 5, mov: 'rise', sd: function (c, x, y, i, ph, t) { spr(c, 12 + i % 4, x, y, 14 * (0.8 + 0.25 * Math.sin(t * 6 + i)), 0); },
      d: function (c, x, y, i) { c.fillStyle = '#ffe066'; star(c, x, y, 3.5, 4, 0.35); c.fill(); } },
    electric: { n: 4, mov: 'orbit', sd: function (c, x, y, i, ph, t) { if (Math.sin(t * 23 + i * 5) < -0.2) return; spr(c, (i + Math.floor(t * 6)) % 4, x, y, 16); }, d: function (c, x, y, i, ph, t) {
      if (Math.sin(t * 23 + i * 5) < -0.2) return;
      c.strokeStyle = i % 2 ? '#7fd8ff' : '#c9f2ff'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(x, y - 5);
      for (var k = 1; k <= 4; k++) c.lineTo(x + (k % 2 ? 2.5 : -2.5), y - 5 + k * 2.6); c.stroke(); glow(c, x, y, 6, 'rgba(120,210,255,0.35)'); } },
    crystals: { n: 5, mov: 'rise', sd: function (c, x, y, i, ph, t) { spr(c, 4 + i % 4, x, y, 15, Math.sin(t * 1.5 + i) * 0.6); }, d: function (c, x, y, i, ph, t) {
      c.save(); c.translate(x, y); c.rotate(t * 1.5 + i); c.fillStyle = ['#b48cff', '#e2c6ff', '#8fd3ff'][i % 3]; c.strokeStyle = '#5a3a9a'; c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(0, -4); c.lineTo(2.2, 0); c.lineTo(0, 4); c.lineTo(-2.2, 0); c.closePath(); c.fill(); c.stroke(); c.restore(); } },
    gears: { n: 3, mov: 'orbit', d: function (c, x, y, i, ph, t) {
      c.save(); c.translate(x, y); c.rotate((i % 2 ? -1 : 1) * t * 2); c.fillStyle = i % 2 ? '#b8bcc8' : '#d8a54a'; c.strokeStyle = '#3a3d4a'; c.lineWidth = 0.7;
      star(c, 0, 0, 4.2, 8, 0.72); c.fill(); c.stroke(); c.fillStyle = '#3a3d4a'; c.beginPath(); c.arc(0, 0, 1.2, 0, 7); c.fill(); c.restore(); } },
    notes: { n: 4, mov: 'rise', sd: function (c, x, y, i, ph, t) { spr(c, 28 + i % 4, x + Math.sin(t * 3 + i) * 2, y, 13, Math.sin(t * 4 + i) * 0.25); }, d: function (c, x, y, i, ph, t) {
      x += Math.sin(t * 3 + i) * 2; c.fillStyle = ['#ffd23f', '#ff8ad8', '#8fd3ff', '#9cf08c'][i % 4]; c.strokeStyle = c.fillStyle; c.lineWidth = 1;
      c.beginPath(); c.ellipse(x, y + 2, 1.8, 1.3, -0.4, 0, 7); c.fill(); c.beginPath(); c.moveTo(x + 1.6, y + 1.8); c.lineTo(x + 1.6, y - 4); c.lineTo(x + 4, y - 3); c.stroke(); } },
    film: { n: 3, mov: 'orbit', d: function (c, x, y, i, ph, t) {
      c.save(); c.translate(x, y); c.rotate(Math.sin(t + i) * 0.4); c.fillStyle = '#26262e'; c.fillRect(-4, -3, 8, 6); c.fillStyle = '#ffe9a6'; c.fillRect(-2.6, -1.8, 5.2, 3.6);
      c.fillStyle = '#dcdcdc'; for (var k = -3; k <= 3; k += 2) { c.fillRect(k - 0.4, -2.8, 0.8, 0.6); c.fillRect(k - 0.4, 2.2, 0.8, 0.6); } c.restore(); } },
    static: { n: 10, mov: 'wander', d: function (c, x, y, i, ph, t) {
      var v = Math.floor((Math.sin(t * 40 + i * 9) + 1) * 110); c.fillStyle = 'rgb(' + v + ',' + v + ',' + v + ')'; c.fillRect(x, y, 1.6, 1.6); } },
    galaxy: { n: 6, mov: 'orbit', d: function (c, x, y, i, ph, t) {
      if (i < 2) { glow(c, x, y, 7, i ? 'rgba(160,90,255,0.45)' : 'rgba(80,140,255,0.4)'); return; }
      c.fillStyle = '#ffffff'; star(c, x, y, 2 + (i % 2), 4, 0.35); c.fill(); } },
    fireflies: { n: 6, mov: 'wander', sd: function (c, x, y, i, ph, t, ang) { var a = (Math.sin(t * 4 + i * 2) + 1) / 2; c.globalAlpha = 0.55 + 0.45 * a; spr(c, 8 + i % 4, x, y, 14, 0, Math.cos(t * 0.9 + i * 1.7) < 0); }, d: function (c, x, y, i, ph, t) {
      var a = (Math.sin(t * 4 + i * 2) + 1) / 2; glow(c, x, y, 5, 'rgba(220,255,90,' + (0.5 * a) + ')'); c.fillStyle = 'rgba(250,255,170,' + (0.4 + a * 0.6) + ')'; c.beginPath(); c.arc(x, y, 1.2, 0, 7); c.fill(); } },
    spores: { n: 7, mov: 'rise', slow: 0.45, d: function (c, x, y, i, ph, t) {
      x += Math.sin(t * 2 + i * 3) * 3; glow(c, x, y, 4, i % 2 ? 'rgba(190,120,255,0.6)' : 'rgba(120,255,200,0.6)'); } },
    petals: { n: 5, mov: 'fall', d: function (c, x, y, i, ph, t) {
      x += Math.sin(t * 2 + i) * 4; c.fillStyle = i % 2 ? '#ff9ac8' : '#ffc2de'; c.beginPath(); c.ellipse(x, y, 3, 1.6, t * 2 + i, 0, 7); c.fill(); } },
    sakura: { n: 4, mov: 'fall', slow: 0.6, d: function (c, x, y, i, ph, t) {
      x += Math.sin(t * 1.5 + i) * 5; c.save(); c.translate(x, y); c.rotate(t + i); c.fillStyle = '#ffd0e4';
      for (var k = 0; k < 5; k++) { c.rotate(Math.PI * 2 / 5); c.beginPath(); c.ellipse(0, -2, 1.3, 2, 0, 0, 7); c.fill(); } c.fillStyle = '#ff7fb0'; c.beginPath(); c.arc(0, 0, 0.9, 0, 7); c.fill(); c.restore(); } },
    bees: { n: 3, mov: 'orbit', fast: 1.8, sd: function (c, x, y, i, ph, t, ang) { spr(c, 16 + ((i + Math.floor(t * 12)) % 2), x, y + Math.sin(t * 9 + i) * 0.8, 14, 0, Math.sin(ang) > 0); }, d: function (c, x, y, i, ph, t) {
      c.fillStyle = 'rgba(255,255,255,0.75)'; c.beginPath(); c.ellipse(x - 1, y - 2.4 + Math.sin(t * 40) * 0.6, 1.6, 1, -0.5, 0, 7); c.ellipse(x + 1, y - 2.4, 1.6, 1, 0.5, 0, 7); c.fill();
      c.fillStyle = '#ffcc1f'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 0.6; c.beginPath(); c.ellipse(x, y, 2.8, 2, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = '#1a1a2e'; c.fillRect(x - 0.6, y - 1.8, 1, 3.6); } },
    sand: { n: 9, mov: 'fall', fast: 1.3, d: function (c, x, y, i, ph, t) { c.fillStyle = i % 2 ? '#e8c06a' : '#f3d792'; c.fillRect(x, y, 1.6, 1.6); c.fillRect(x + 2, y - 3, 1.2, 1.2); } },
    embers: { n: 7, mov: 'rise', fast: 1.4, d: function (c, x, y, i, ph, t) {
      x += Math.sin(t * 5 + i) * 1.5; glow(c, x, y, 3.5, 'rgba(255,120,30,0.7)'); c.fillStyle = '#ffd36b'; c.fillRect(x - 0.6, y - 0.6, 1.2, 1.2); } },
    smoke: { n: 4, mov: 'rise', slow: 0.5, d: function (c, x, y, i, ph, t) {
      c.fillStyle = 'rgba(170,170,185,' + (0.55 * (1 - ph)) + ')'; c.beginPath(); c.arc(x, y, 2.5 + ph * 5, 0, 7); c.fill(); } },
    coins: { n: 4, mov: 'rise', sd: function (c, x, y, i, ph, t) { var f = Math.floor(t * 10 + i * 1.3) % 4; spr(c, 20 + f, x, y, 12, 0, f === 3); }, d: function (c, x, y, i, ph, t) {
      var w = Math.abs(Math.cos(t * 5 + i)) * 2.8 + 0.4; c.fillStyle = '#ffcf3a'; c.strokeStyle = '#a8761a'; c.lineWidth = 0.7; c.beginPath(); c.ellipse(x, y, w, 2.8, 0, 0, 7); c.fill(); c.stroke(); } },
    gems: { n: 5, mov: 'orbit', d: function (c, x, y, i, ph, t) {
      c.fillStyle = ['#ff5c8a', '#5ce1e6', '#9cf08c', '#ffd23f', '#b48cff'][i]; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(x - 2.6, y - 1); c.lineTo(x - 1.4, y - 2.6); c.lineTo(x + 1.4, y - 2.6); c.lineTo(x + 2.6, y - 1); c.lineTo(x, y + 2.8); c.closePath(); c.fill(); c.stroke(); } },
    eyes: { n: 4, mov: 'orbit', slow: 0.5, d: function (c, x, y, i, ph, t) {
      var o = Math.max(0.12, Math.abs(Math.sin(t * 1.3 + i * 2))); c.fillStyle = '#ffffff'; c.strokeStyle = '#1a1a2e'; c.lineWidth = 0.6;
      c.beginPath(); c.ellipse(x, y, 3, 2.2 * o, 0, 0, 7); c.fill(); c.stroke(); if (o > 0.3) { c.fillStyle = '#3e7bfa'; c.beginPath(); c.arc(x + 0.5, y, 1.2, 0, 7); c.fill(); } } },
    slime: { n: 5, mov: 'fall', d: function (c, x, y, i, ph, t) {
      c.fillStyle = i % 2 ? '#6ff2c9' : '#9cf08c'; c.beginPath(); c.moveTo(x, y - 3); c.quadraticCurveTo(x + 2.2, y + 0.5, x, y + 1.8); c.quadraticCurveTo(x - 2.2, y + 0.5, x, y - 3); c.fill(); } },
    bolts: { n: 5, mov: 'orbit', d: function (c, x, y, i, ph, t) {
      c.save(); c.translate(x * (0.6 + 0.4 * Math.abs(Math.sin(t * 2 + i))), y); c.rotate(t * 3 + i); c.fillStyle = '#c6cad6'; c.strokeStyle = '#4a4e5c'; c.lineWidth = 0.6;
      if (i % 2) { star(c, 0, 0, 2.6, 6, 0.86); c.fill(); c.stroke(); c.fillStyle = '#4a4e5c'; c.beginPath(); c.arc(0, 0, 0.9, 0, 7); c.fill(); } else { c.fillRect(-0.7, -3, 1.4, 5); c.strokeRect(-0.7, -3, 1.4, 5); c.fillRect(-1.8, -3.6, 3.6, 1.2); }
      c.restore(); } },
    rain: { n: 7, mov: 'fall', fast: 1.6, cloud: true, d: function (c, x, y, i, ph, t) {
      c.strokeStyle = 'rgba(140,200,255,0.9)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x * 0.8, y); c.lineTo(x * 0.8 - 0.8, y + 3); c.stroke(); } },
    feathers: { n: 3, mov: 'fall', slow: 0.55, sd: function (c, x, y, i, ph, t) { spr(c, 24 + i % 4, x + Math.sin(t * 2 + i * 2) * 6, y, 16, Math.sin(t * 2 + i) * 0.7); }, d: function (c, x, y, i, ph, t) {
      x += Math.sin(t * 2 + i * 2) * 6; c.save(); c.translate(x, y); c.rotate(Math.sin(t * 2 + i) * 0.7); c.fillStyle = ['#f2ead8', '#d9c09a', '#ffd23f'][i % 3];
      c.beginPath(); c.ellipse(0, 0, 1.8, 4.5, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(0, -4.5); c.lineTo(0, 5.5); c.stroke(); c.restore(); } },
    shadow: { n: 5, mov: 'rise', slow: 0.6, d: function (c, x, y, i, ph, t) {
      glow(c, x * 0.7 + Math.sin(t * 2 + i) * 3, y, 6, 'rgba(90,30,150,' + (0.6 * (1 - ph)) + ')'); if (i === 0) { c.fillStyle = '#c69bff'; c.fillRect(x * 0.7 - 2, y, 1.2, 1); c.fillRect(x * 0.7 + 1, y, 1.2, 1); } } },
    runes: { n: 4, mov: 'orbit', slow: 0.6, d: function (c, x, y, i, ph, t) {
      c.strokeStyle = 'rgba(130,255,150,' + (0.55 + 0.45 * Math.sin(t * 3 + i)) + ')'; c.lineWidth = 1; c.beginPath();
      if (i % 4 === 0) { c.moveTo(x - 2, y + 3); c.lineTo(x, y - 3); c.lineTo(x + 2, y + 3); c.moveTo(x - 1, y); c.lineTo(x + 1, y); }
      else if (i % 4 === 1) { c.moveTo(x, y - 3); c.lineTo(x, y + 3); c.moveTo(x, y - 1); c.lineTo(x + 2, y - 3); c.moveTo(x, y + 1); c.lineTo(x - 2, y - 1); }
      else if (i % 4 === 2) { c.arc(x, y, 2.4, 0, 7); c.moveTo(x - 3, y); c.lineTo(x + 3, y); }
      else { c.moveTo(x - 2, y - 3); c.lineTo(x + 2, y - 3); c.lineTo(x - 2, y + 3); c.lineTo(x + 2, y + 3); }
      c.stroke(); } },
    radar: { n: 3, mov: 'ring', d: function (c, x, y, i, ph, t) {
      c.strokeStyle = 'rgba(120,230,255,' + (0.8 * (1 - ph)) + ')'; c.lineWidth = 1.2; c.beginPath(); c.arc(0, -30, 3 + ph * 22, -2.4, -0.7); c.stroke(); } },
    jellies: { n: 3, mov: 'rise', slow: 0.5, d: function (c, x, y, i, ph, t) {
      var p = 1 + Math.sin(t * 4 + i) * 0.15; c.fillStyle = i % 2 ? 'rgba(160,220,255,0.85)' : 'rgba(255,170,230,0.85)'; c.beginPath(); c.ellipse(x, y, 3.2 * p, 2.4 / p, 0, Math.PI, 0); c.fill();
      c.strokeStyle = c.fillStyle; c.lineWidth = 0.6; c.beginPath(); for (var k = -2; k <= 2; k += 2) { c.moveTo(x + k, y); c.quadraticCurveTo(x + k + Math.sin(t * 5 + k) * 1.2, y + 2.5, x + k, y + 5); } c.stroke(); } },
    balloons: { n: 3, mov: 'rise', slow: 0.55, d: function (c, x, y, i, ph, t) {
      x += Math.sin(t * 1.5 + i) * 2; c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(x, y + 3); c.quadraticCurveTo(x + 1, y + 6, x, y + 8); c.stroke();
      c.fillStyle = ['#ff5c5c', '#3e7bfa', '#ffd23f'][i % 3]; c.strokeStyle = 'rgba(0,0,0,0.4)'; c.lineWidth = 0.6; c.beginPath(); c.ellipse(x, y, 2.8, 3.4, 0, 0, 7); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(x - 1, y - 1.3, 0.7, 0, 7); c.fill(); } },
    sparks: { n: 8, mov: 'burst', d: function (c, x, y, i, ph, t) {
      c.strokeStyle = 'rgba(255,' + Math.floor(200 + 55 * (1 - ph)) + ',90,' + (1 - ph) + ')'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(x, y); c.lineTo(x * 0.85, y * 0.85 - 2); c.stroke(); } },
    planets: { n: 3, mov: 'orbit', slow: 0.5, d: function (c, x, y, i, ph, t) {
      c.fillStyle = ['#f0a35a', '#6fb6ff', '#c7a6ff'][i]; c.beginPath(); c.arc(x, y, 2.8, 0, 7); c.fill();
      if (i !== 1) { c.strokeStyle = 'rgba(255,240,200,0.9)'; c.lineWidth = 0.8; c.beginPath(); c.ellipse(x, y, 4.6, 1.3, -0.3, 0, 7); c.stroke(); } } },
    confetti: { n: 9, mov: 'fall', d: function (c, x, y, i, ph, t) {
      c.save(); c.translate(x, y); c.rotate(t * 4 + i); c.fillStyle = ['#ff5c8a', '#ffd23f', '#5ce1e6', '#9cf08c', '#b48cff'][i % 5]; c.fillRect(-1.6, -0.8, 3.2, 1.6); c.restore(); } }
  };
  function drawNFX(ctx, E, t) {
    var sp = E.fast || E.slow || 1;
    if (E.cloud) {   // nubecita encima de la cabeza
      ctx.globalAlpha = 0.95; ctx.fillStyle = '#9aa6bd'; ctx.beginPath(); ctx.arc(-9, -48, 6.5, 0, 7); ctx.arc(0, -51, 8, 0, 7); ctx.arc(9, -47, 6, 0, 7); ctx.fill();
    }
    for (var i = 0; i < E.n; i++) {
      var ph = (t * 0.6 * sp + i / E.n) % 1, ang = i * (Math.PI * 2 / E.n) + t * 0.9 * sp, x, y;
      var side = i % 2 ? 1 : -1;   // a los lados del personaje, para que se vean
      if (E.mov === 'rise') { x = side * (15 + (i % 3) * 5); y = -2 - ph * 46; ctx.globalAlpha = Math.sin(ph * Math.PI); }
      else if (E.mov === 'fall') { x = side * (14 + ((i >> 1) % 3) * 6); y = -50 + ph * 58; ctx.globalAlpha = Math.sin(ph * Math.PI); }
      else if (E.mov === 'orbit') { x = Math.cos(ang) * 26; y = -18 + Math.sin(ang) * 11; ctx.globalAlpha = 0.95; }
      else if (E.mov === 'wander') { x = Math.sin(t * 0.9 * sp + i * 1.7) * 26; y = -20 + Math.cos(t * 1.3 * sp + i * 2.9) * 20; ctx.globalAlpha = 1; }
      else if (E.mov === 'burst') { var a = i * (Math.PI * 2 / E.n) + Math.floor(t * 0.8) * 0.7, r = 14 + ph * 22; x = Math.cos(a) * r; y = -18 + Math.sin(a) * r; ctx.globalAlpha = 1; }
      else { x = 0; y = 0; ctx.globalAlpha = 1; }
      var S = 1.45;   // partículas más grandes
      ctx.save(); ctx.scale(S, S); ((E.sd && SPR.ok) ? E.sd : E.d)(ctx, x / S, y / S, i, ph, t, ang); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  // top: altura del personaje con imagen (los efectos se pensaron para el astronauta, de unos 38 de alto)
  function fx(ctx, x, y, look, t, sc, top) {
    var f = look && look.fx;
    if (!f || f === 'none') return;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
    if (NFX[f]) {
      var k = top ? Math.max(1, top / 40) * 1.1 : 1;
      ctx.translate(0, 10); ctx.scale(k, k); ctx.translate(0, -10);
      drawNFX(ctx, NFX[f], t); ctx.restore(); return;
    }
    for (var i = 0; i < 5; i++) {
      var ph = (t * 0.6 + i / 5) % 1, ang = i * 1.3 + t * 0.4;
      var px = Math.cos(ang) * (14 + i * 2), py = -10 - ph * 34;
      ctx.globalAlpha = Math.sin(ph * Math.PI) * 0.9;
      if (f === 'sparkles') { ctx.fillStyle = '#ffe066'; ctx.beginPath(); for (var k = 0; k < 4; k++) { var a = k * Math.PI / 2; ctx.lineTo(px + Math.cos(a) * 3.5, py + Math.sin(a) * 3.5); ctx.lineTo(px + Math.cos(a + 0.78) * 1.2, py + Math.sin(a + 0.78) * 1.2); } ctx.fill(); }
      else if (f === 'hearts') { ctx.fillStyle = '#ff5c8a'; ctx.beginPath(); ctx.moveTo(px, py + 2.5); ctx.bezierCurveTo(px - 4, py - 1, px - 2, py - 4, px, py - 2); ctx.bezierCurveTo(px + 2, py - 4, px + 4, py - 1, px, py + 2.5); ctx.fill(); }
      else if (f === 'bubbles') { ctx.strokeStyle = '#8fd3ff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(px, py, 2.5 + (i % 2), 0, 7); ctx.stroke(); }
      else if (f === 'leaves') { ctx.fillStyle = i % 2 ? '#57c14a' : '#99d52a'; ctx.beginPath(); ctx.ellipse(px, py, 3.5, 1.8, ang, 0, 7); ctx.fill(); }
      else if (f === 'snow') { ctx.strokeStyle = '#e6f6ff'; ctx.lineWidth = 1; for (var k2 = 0; k2 < 3; k2++) { var a2 = k2 * Math.PI / 3; ctx.beginPath(); ctx.moveTo(px - Math.cos(a2) * 3, py - Math.sin(a2) * 3); ctx.lineTo(px + Math.cos(a2) * 3, py + Math.sin(a2) * 3); ctx.stroke(); } }
      else if (f === 'flames') { var fy = 14 - ph * 20; ctx.fillStyle = i % 2 ? '#ff8a2a' : '#ffd23f'; ctx.beginPath(); ctx.moveTo(px * 0.8, fy + 3); ctx.quadraticCurveTo(px * 0.8 - 3, fy, px * 0.8, fy - 5); ctx.quadraticCurveTo(px * 0.8 + 3, fy, px * 0.8, fy + 3); ctx.fill(); }
      else if (f === 'stars') { ctx.fillStyle = '#ffffff'; ctx.beginPath(); for (var k3 = 0; k3 < 5; k3++) { var a3 = -Math.PI / 2 + k3 * 2 * Math.PI / 5; ctx.lineTo(px + Math.cos(a3) * 3, py + Math.sin(a3) * 3); ctx.lineTo(px + Math.cos(a3 + 0.63) * 1.3, py + Math.sin(a3 + 0.63) * 1.3); } ctx.fill(); }
      else if (f === 'rainbow') { ctx.fillStyle = ['#ff5c5c', '#ffb13d', '#ffe066', '#57c14a', '#3e7bfa'][i]; ctx.beginPath(); ctx.arc(px, py, 2.4, 0, 7); ctx.fill(); }
    }
    ctx.restore();
  }

  function chName(id, lang) { var it = find('ch', id); return it ? (lang === 'en' ? it.en : it.es) : id; }
  root.LOOKS = { UNLOCK_ALL: UNLOCK_ALL, unlocked: unlocked, chName: chName, LIST: LIST, find: find, valid: valid, randomFor: randomFor, back: back, body: body, head: head, hat: hat, fx: fx, topOf: topOf, OUT: OUT };
  if (typeof module !== 'undefined') module.exports = root.LOOKS;
})(typeof window !== 'undefined' ? window : globalThis);
