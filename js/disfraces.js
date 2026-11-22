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
      { id: 'snow', lv: 7 }, { id: 'flames', lv: 9 }, { id: 'stars', lv: 11 }, { id: 'rainbow', lv: 15 }
    ]
  };
  // Personajes (imágenes): todos disponibles desde el principio
  var PD = root.PERSONAJES_DATA || (typeof require !== 'undefined' ? (function () { try { return require('./personajes-data.js'); } catch (e) { return []; } })() : []);
  LIST.ch = PD.map(function (d) { return { id: d[0], lv: 1, es: d[5], en: d[6] }; });
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
      var ok = LIST[k].filter(function (it) { return it.lv <= level; });
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
  function fx(ctx, x, y, look, t, sc) {
    var f = look && look.fx;
    if (!f || f === 'none') return;
    ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
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
  root.LOOKS = { chName: chName, LIST: LIST, find: find, valid: valid, randomFor: randomFor, back: back, body: body, head: head, hat: hat, fx: fx, topOf: topOf, OUT: OUT };
  if (typeof module !== 'undefined') module.exports = root.LOOKS;
})(typeof window !== 'undefined' ? window : globalThis);
