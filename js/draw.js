/* Dibujo compartido (tele y móvil): la nave, las estaciones y los personajes. Todo en coordenadas del mundo. */
(function (root) {
  var MAP = root.NAVE_MAP;
  var STARS = [];
  for (var i = 0; i < 140; i++) STARS.push([Math.random() * 1400 - 200, Math.random() * 1000 - 200, Math.random() * 1.6 + 0.3]);

  function rr(ctx, x, y, w, h, r, keepPath) {
    if (!keepPath) ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
  }

  function shade(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    if (f < 0) { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
    else { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
    return 'rgb(' + (r | 0) + ',' + (g | 0) + ',' + (b | 0) + ')';
  }

  // opts: { labels: bool, t: segundos (animación), highlight: [ids de estación], lightsOut: bool, tr: función de textos }
  function ship(ctx, opts) {
    opts = opts || {};
    var t = opts.t || 0;
    // estrellas
    ctx.fillStyle = '#0b1026';
    ctx.fillRect(-400, -400, 1800, 1400);
    STARS.forEach(function (s) {
      ctx.globalAlpha = 0.4 + 0.4 * Math.sin(t * 1.5 + s[0]);
      ctx.fillStyle = '#fff';
      ctx.fillRect(s[0], s[1], s[2], s[2]);
    });
    ctx.globalAlpha = 1;
    // casco exterior
    ctx.fillStyle = '#1c2340';
    ctx.strokeStyle = '#5a6aa0';
    ctx.lineWidth = 6;
    ctx.beginPath();
    MAP.rects.forEach(function (r) { rr(ctx, r.x - 14, r.y - 14, r.w + 28, r.h + 28, 18, true); });
    ctx.fill();
    // suelos de pasillo
    MAP.corridors.forEach(function (r) {
      ctx.fillStyle = '#4b5470';
      ctx.fillRect(r.x, r.y, r.w, r.h);
    });
    // salas
    MAP.rooms.forEach(function (r) {
      ctx.fillStyle = r.floor;
      rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.fill();
      ctx.save();
      rr(ctx, r.x, r.y, r.w, r.h, 10); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (var gx = r.x; gx < r.x + r.w; gx += 24) { ctx.beginPath(); ctx.moveTo(gx, r.y); ctx.lineTo(gx, r.y + r.h); ctx.stroke(); }
      for (var gy = r.y; gy < r.y + r.h; gy += 24) { ctx.beginPath(); ctx.moveTo(r.x, gy); ctx.lineTo(r.x + r.w, gy); ctx.stroke(); }
      ctx.restore();
    });
    // pasillos por encima para "abrir" las puertas
    MAP.corridors.forEach(function (r) {
      ctx.fillStyle = '#4b5470';
      ctx.fillRect(r.x + 1, r.y + 1, r.w - 2, r.h - 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.08)';
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      if (r.w > r.h) { ctx.moveTo(r.x, r.y + r.h / 2); ctx.lineTo(r.x + r.w, r.y + r.h / 2); }
      else { ctx.moveTo(r.x + r.w / 2, r.y); ctx.lineTo(r.x + r.w / 2, r.y + r.h); }
      ctx.stroke();
      ctx.setLineDash([]);
    });
    // nombres de las salas
    if (opts.labels) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = 'bold 18px system-ui, sans-serif';
      MAP.rooms.forEach(function (r) {
        ctx.fillStyle = 'rgba(255,255,255,0.55)';
        ctx.fillText(opts.tr ? opts.tr(r.name) : r.name, r.x + r.w / 2, r.y + (r.id === 'cafe' ? r.h - 18 : 20));
      });
    }
    // estaciones
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
      ctx.fillStyle = '#6b6f80'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#e5484d'; ctx.beginPath(); ctx.arc(0, -2, 12, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.beginPath(); ctx.arc(-4, -6, 4, 0, Math.PI * 2); ctx.fill();
    } else if (s.type === 'lights') {
      ctx.fillStyle = '#2a2f40'; rr(ctx, -14, -18, 28, 36, 4); ctx.fill();
      var on = !lightsOut || (Math.sin(t * 8) > 0);
      ctx.fillStyle = lightsOut ? (on ? '#ff5050' : '#552020') : '#f2d63a';
      for (var i = 0; i < 3; i++) ctx.fillRect(-8, -12 + i * 10, 16, 6);
    } else {
      var col = { wires: '#f5a524', numbers: '#3e7bfa', download: '#30a46c', calibrate: '#8e4ec6' }[s.type] || '#999';
      ctx.fillStyle = '#2a2f40'; rr(ctx, -15, -15, 30, 30, 5); ctx.fill();
      ctx.fillStyle = col; rr(ctx, -10, -10, 20, 20, 3); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = 'bold 14px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText({ wires: '⚡', numbers: '#', download: '↓', calibrate: '◎' }[s.type] || '?', 0, 1);
    }
    ctx.restore();
  }

  // Personaje original: una bolita espacial con antena y ojos grandes.
  // opts: { name, ghost, walk (0..1 fase), dir (-1|1), scale, frozen }
  function character(ctx, x, y, hex, opts) {
    opts = opts || {};
    var sc = opts.scale || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc * (opts.dir || 1), sc);
    if (opts.ghost) ctx.globalAlpha = 0.45;
    var bob = opts.walk ? Math.sin(opts.walk * Math.PI * 2) * 1.5 : 0;
    // sombra
    if (!opts.ghost) { ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(0, 15, 12, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    // pies
    var f = opts.walk ? Math.sin(opts.walk * Math.PI * 2) * 3 : 0;
    ctx.fillStyle = shade(hex, -0.35);
    ctx.beginPath(); ctx.ellipse(-6 + f, 13, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6 - f, 13, 5, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(0, bob);
    // antena
    ctx.strokeStyle = shade(hex, -0.3); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(2, -14); ctx.quadraticCurveTo(4, -22, 8, -24); ctx.stroke();
    ctx.fillStyle = '#ffe66b'; ctx.beginPath(); ctx.arc(8, -24, 3, 0, Math.PI * 2); ctx.fill();
    // cuerpo
    var g = ctx.createRadialGradient(-5, -6, 2, 0, 0, 18);
    g.addColorStop(0, shade(hex, 0.35)); g.addColorStop(1, hex);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(0, 0, 14, 15, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = shade(hex, -0.4); ctx.lineWidth = 1.5; ctx.stroke();
    // ojos
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(-3, -3, 4.2, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(6, -3, 4.2, 5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1b1b2a';
    ctx.beginPath(); ctx.arc(-2, -2, 2.2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, -2, 2.2, 0, Math.PI * 2); ctx.fill();
    // mejillas
    ctx.fillStyle = 'rgba(255,120,150,0.45)';
    ctx.beginPath(); ctx.arc(-7, 4, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(10, 4, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (opts.name) {
      ctx.save();
      ctx.font = 'bold ' + Math.round(11 * sc) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      if (opts.ghost) ctx.globalAlpha = 0.6;
      ctx.strokeText(opts.name, x, y - 28 * sc);
      ctx.fillStyle = opts.nameColor || '#fff';
      ctx.fillText(opts.name, x, y - 28 * sc);
      ctx.restore();
    }
  }

  // Jugador congelado: el personaje dentro de un bloque de hielo
  function frozen(ctx, x, y, hex, t) {
    character(ctx, x, y, hex, {});
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = 'rgba(160,220,255,0.45)';
    ctx.strokeStyle = 'rgba(220,245,255,0.9)';
    ctx.lineWidth = 2;
    rr(ctx, -19, -28, 38, 46, 6); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.beginPath(); ctx.moveTo(-12, -20); ctx.lineTo(-4, -26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-14, -10); ctx.lineTo(-10, -14); ctx.stroke();
    var sp = 0.5 + 0.5 * Math.sin((t || 0) * 4);
    ctx.fillStyle = 'rgba(255,255,255,' + sp + ')';
    ctx.beginPath(); ctx.arc(12, -20, 2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Avatar pequeño para listas (dibuja en su propio canvas)
  function avatarCanvas(hex, size, opts) {
    var c = document.createElement('canvas');
    var dpr = window.devicePixelRatio || 1;
    c.width = size * dpr; c.height = size * dpr;
    c.style.width = size + 'px'; c.style.height = size + 'px';
    var ctx = c.getContext('2d');
    ctx.scale(dpr * size / 50, dpr * size / 50);
    if (opts && opts.frozen) frozen(ctx, 25, 30, hex, 0);
    else character(ctx, 25, 28, hex, { ghost: opts && opts.ghost });
    return c;
  }

  root.DRAW = { ship: ship, character: character, frozen: frozen, avatarCanvas: avatarCanvas, rr: rr };
})(window);
