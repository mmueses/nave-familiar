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
  function box(ctx, x, y, w, h, fill, r, flat) {
    if (!flat && w * h >= 700) { ctx.fillStyle = 'rgba(0,0,0,0.28)'; rr(ctx, x + 3, y + 5, w, h, r || 3); ctx.fill(); }
    ctx.fillStyle = fill; rr(ctx, x, y, w, h, r || 3); ctx.fill();
    if (!flat) { ctx.lineWidth = 1.6; ctx.strokeStyle = '#1a1a2e'; ctx.stroke(); }
  }
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

  // (El dibujo de la nave está en js/nave.js)

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
    var dark = shade(hex, -0.32), darker = shade(hex, -0.5), light = shade(hex, 0.3);
    if (!opts.ghost) { ctx.fillStyle = 'rgba(0,0,0,0.32)'; ctx.beginPath(); ctx.ellipse(0, 16.5, 13, 4, 0, 0, Math.PI * 2); ctx.fill(); }
    if (look && L) L.back(ctx, look, T);
    // ---- piernas: pernera, rodillera y bota ----
    [[-8 + step, 1], [1 - step, -1]].forEach(function (lg) {
      var lx = lg[0];
      rr(ctx, lx, 3.5, 7.5, 10, 3); ol(ctx, lg[1] > 0 ? dark : hex, 1.8);
      rr(ctx, lx + 1, 6, 5.5, 3, 1.4); ol(ctx, light, 1);
      rr(ctx, lx - 1.2, 10.5, 9.8, 5.6, 2.6); ol(ctx, '#eef0f6', 1.8);
      ctx.fillStyle = '#9aa0b8'; ctx.fillRect(lx - 0.8, 14.2, 9, 1.6);
    });
    ctx.translate(0, bob);
    // ---- mochila con botellas de oxígeno ----
    rr(ctx, -19, -11, 10, 21, 4); ol(ctx, darker, 2);
    rr(ctx, -21.5, -9, 5, 16, 2.5); ol(ctx, '#c8ccda', 1.5);
    ctx.fillStyle = '#ffffff'; ctx.fillRect(-20.5, -7.5, 1.4, 11);
    circle(ctx, -14, -7, 1.3, Math.sin(T * 3) > 0 ? '#57e389' : '#1d4a2c');
    // ---- brazo de atrás ----
    ctx.beginPath(); ctx.ellipse(-10.5, 0.5 - step * 0.4, 3.8, 6.4, 0.3, 0, Math.PI * 2); ol(ctx, darker, 1.7);
    // ---- torso con sombra en dos tonos ----
    rr(ctx, -12, -9, 24, 18.5, 6.5); ol(ctx, hex, 2.4);
    ctx.save(); rr(ctx, -12, -9, 24, 18.5, 6.5); ctx.clip();
    ctx.fillStyle = dark; ctx.beginPath(); ctx.moveTo(-12, 2); ctx.quadraticCurveTo(0, 6, 12, 1); ctx.lineTo(12, 10); ctx.lineTo(-12, 10); ctx.fill();
    ctx.fillStyle = dark; ctx.fillRect(-12, -9, 4, 19);
    ctx.fillStyle = light; ctx.beginPath(); ctx.ellipse(-3, -6, 6, 2.2, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    rr(ctx, -12, -9, 24, 18.5, 6.5); ctx.lineWidth = 2.4; ctx.strokeStyle = OUT; ctx.stroke();
    // costura y cinturón con hebilla
    ctx.strokeStyle = 'rgba(26,26,46,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-2, -7); ctx.lineTo(-2, 3); ctx.stroke();
    rr(ctx, -12, 3.5, 24, 3.2, 1); ol(ctx, darker, 1.2);
    rr(ctx, -1.8, 3, 4.6, 4.2, 1); ol(ctx, '#ffd23f', 1);
    // panel del pecho con luces
    rr(ctx, 2, -5.5, 8.5, 6.5, 1.6); ol(ctx, '#e6e9f2', 1.3);
    circle(ctx, 4.3, -2.2, 1.25, '#ff5c5c'); circle(ctx, 7.2, -2.2, 1.25, Math.sin(T * 4) > -0.3 ? '#57e389' : '#1d4a2c');
    ctx.fillStyle = '#3e7bfa'; ctx.fillRect(3.3, 0, 5.5, 1);
    if (look && L) L.body(ctx, look);
    // ---- brazo de delante con guante ----
    ctx.beginPath(); ctx.ellipse(10.5, 0.5 + step * 0.4, 3.8, 6.4, -0.3, 0, Math.PI * 2); ol(ctx, hex, 1.7);
    ctx.beginPath(); ctx.ellipse(11.3, 4 + step * 0.4, 3.5, 1.5, -0.3, 0, Math.PI * 2); ol(ctx, light, 1);
    ctx.beginPath(); ctx.arc(11.6, 6.6 + step * 0.4, 3, 0, Math.PI * 2); ol(ctx, '#eef0f6', 1.5);
    // ---- cuello ----
    rr(ctx, -8.5, -8.5, 17, 4, 2); ol(ctx, '#8a90a8', 1.6);
    // ---- casco ----
    ctx.beginPath(); ctx.arc(0, -18.5, 13.2, 0, Math.PI * 2); ol(ctx, '#f6f7fb', 2.4);
    ctx.save(); ctx.beginPath(); ctx.arc(0, -18.5, 13.2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#cfd4e4'; ctx.beginPath(); ctx.arc(-5, -12, 13, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f6f7fb'; ctx.beginPath(); ctx.arc(-1, -22, 12.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.beginPath(); ctx.ellipse(-6, -26, 3.2, 1.6, -0.6, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, -18.5, 13.2, 0, Math.PI * 2); ctx.lineWidth = 2.4; ctx.strokeStyle = OUT; ctx.stroke();
    // franja de color del casco
    ctx.strokeStyle = OUT; ctx.lineWidth = 4.6; ctx.beginPath(); ctx.arc(0, -18.5, 10.6, Math.PI * 0.95, Math.PI * 1.32); ctx.stroke();
    ctx.strokeStyle = hex; ctx.lineWidth = 2.8; ctx.stroke();
    // ---- visera de cristal (reflejos, sin cara) ----
    ctx.beginPath(); ctx.arc(3.2, -17.5, 9.2, 0, Math.PI * 2);
    var vg = ctx.createLinearGradient(0, -27, 3, -8);
    vg.addColorStop(0, '#16224a'); vg.addColorStop(0.55, '#2b4f9a'); vg.addColorStop(0.8, '#6a7fd0'); vg.addColorStop(1, '#f2a35e');
    ctx.fillStyle = vg; ctx.fill(); ctx.lineWidth = 2.2; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(3.2, -17.5, 9.2, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.beginPath(); ctx.ellipse(6, -14, 9, 4, -0.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.92)'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(3.2, -17.5, 6.6, Math.PI * 1.1, Math.PI * 1.42); ctx.stroke();
    ctx.lineWidth = 1.3; ctx.beginPath(); ctx.arc(3.2, -17.5, 6.6, Math.PI * 1.52, Math.PI * 1.62); ctx.stroke();
    circle(ctx, 8.6, -22, 1.2, 'rgba(255,255,255,0.9)');
    var hasHead = look && ((look.suit && look.suit !== 'none') || (look.hat && look.hat !== 'none'));
    if (!hasHead) {
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.9;
      ctx.beginPath(); ctx.moveTo(-6, -30.5); ctx.lineTo(-8.5, -37); ctx.stroke();
      ctx.beginPath(); ctx.arc(-8.7, -38, 2.5, 0, Math.PI * 2); ol(ctx, hex, 1.3);
    }
    if (look && L) { L.head(ctx, look); L.hat(ctx, look, hex); }
    ctx.restore();
    if (look && L && !opts.ghost) L.fx(ctx, x, y, look, T, sc);
    if (opts.name) {
      var top = (look && L ? L.topOf(look) : 38) + 3;
      ctx.save();
      ctx.font = 'bold ' + Math.round(11 * sc) + 'px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.lineWidth = 3.2; ctx.strokeStyle = 'rgba(0,0,0,0.8)';
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

  root.DRAW = { ship: function (c, o) { return root.SHIP.draw(c, o); }, character: character, frozen: frozen, avatarCanvas: avatarCanvas, rr: rr, visibility: visibility };
})(window);
