/* Fondo animado de menús: estrellas que titilan y se mueven, nebulosas, estrellas fugaces y
   (opcional) personajes que pasan flotando; de vez en cuando uno se queda congelado en un bloque de hielo.
   FONDO.start({ parade: true }) · FONDO.pause() · FONDO.resume() */
(function (root) {
  var cv, ctx, W = 0, H = 0, dpr = 1, running = false, raf = 0, last = 0, opts = {};
  var stars = [], shooting = [], walkers = [], nebula = null, sheet = null, sheetOk = false, SPR = [];
  var nextShoot = 2, nextWalker = 0.5, sparks = [];

  function rand(a, b) { return a + Math.random() * (b - a); }
  function setup() {
    cv = document.createElement('canvas'); cv.id = 'fondoCv';
    cv.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(cv, document.body.firstChild);
    ctx = cv.getContext('2d');
    window.addEventListener('resize', resize);
    resize();
    var data = root.PERSONAJES_DATA || [];
    SPR = data.map(function (d) { return { x: d[1], y: d[2], w: d[3], h: d[4] }; });
    if (data.length) { sheet = new Image(); sheet.onload = function () { sheetOk = true; }; sheet.src = 'img/personajes.webp'; }
  }
  function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth; H = window.innerHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    stars = [];
    var n = Math.round(W * H / 2600);
    for (var i = 0; i < n; i++) stars.push({ x: Math.random() * W, y: Math.random() * H, r: rand(0.4, 1.8), z: rand(0.2, 1), tw: rand(0, 6.28), sp: rand(1, 3), c: Math.random() < 0.15 ? '#ffe9b0' : (Math.random() < 0.2 ? '#b0d4ff' : '#ffffff') });
    buildNebula();
  }
  function buildNebula() {
    nebula = document.createElement('canvas'); nebula.width = Math.max(1, Math.round(W / 2)); nebula.height = Math.max(1, Math.round(H / 2));
    var c = nebula.getContext('2d'), w = nebula.width, h = nebula.height;
    var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0d0a2e'); g.addColorStop(0.55, '#100c34'); g.addColorStop(1, '#060818');
    c.fillStyle = g; c.fillRect(0, 0, w, h);
    [[0.15, 0.2, 0.55, 'rgba(160,70,220,0.35)'], [0.9, 0.35, 0.5, 'rgba(40,140,255,0.30)'], [0.5, 0.95, 0.6, 'rgba(255,90,170,0.22)'], [0.75, 0.75, 0.35, 'rgba(60,220,200,0.18)']].forEach(function (n) {
      var r = Math.max(w, h) * n[2], gr = c.createRadialGradient(w * n[0], h * n[1], 4, w * n[0], h * n[1], r);
      gr.addColorStop(0, n[3]); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h);
    });
  }
  // personaje que cruza la pantalla
  function newWalker() {
    if (!SPR.length) return;
    var dir = Math.random() < 0.5 ? 1 : -1, size = rand(70, 110) * Math.min(1.4, Math.max(0.8, Math.min(W, H) / 420));
    var lane = opts.lane || [0.78, 0.95];
    walkers.push({
      s: SPR[Math.floor(Math.random() * SPR.length)], dir: dir, x: dir > 0 ? -80 : W + 80, y: H * rand(lane[0], lane[1]),
      v: rand(40, 75) * dir, size: size, t: rand(0, 10), freezeAt: Math.random() < 0.45 ? rand(0.25, 0.75) : -1, ice: 0, state: 'walk'
    });
  }
  function drawWalker(w, dt) {
    if (w.state === 'walk') {
      w.x += w.v * dt; w.t += dt;
      var prog = w.dir > 0 ? w.x / W : 1 - w.x / W;
      if (w.freezeAt > 0 && prog > w.freezeAt) { w.state = 'freezing'; w.ice = 0; w.freezeAt = -1; }
    } else if (w.state === 'freezing') { w.ice += dt * 2.2; if (w.ice >= 1) { w.state = 'frozen'; w.hold = 1.6; } }
    else if (w.state === 'frozen') { w.hold -= dt; if (w.hold <= 0) { w.state = 'walk'; burst(w); w.ice = 0; } }
    var s = w.s, k = w.size / 124, ww = s.w * k, hh = s.h * k;
    var bob = w.state === 'walk' ? -Math.abs(Math.sin(w.t * 6)) * 6 : 0;
    var x = w.x, y = w.y;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(x, y + 2, ww * 0.35, 6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.translate(x, y + bob); ctx.scale(w.dir, 1);
    ctx.rotate(w.state === 'walk' ? Math.sin(w.t * 6) * 0.05 : 0);
    if (sheetOk) ctx.drawImage(sheet, s.x, s.y, s.w, s.h, -ww / 2, -hh, ww, hh);
    ctx.restore();
    if (w.state !== 'walk') {   // bloque de hielo que crece
      var a = Math.min(1, w.ice), bh = (hh + 16) * a;
      ctx.save();
      ctx.fillStyle = 'rgba(170,225,255,0.45)'; ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 3;
      rr(ctx, x - ww / 2 - 8, y + 6 - bh, ww + 16, bh, 10); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 3;
      if (a > 0.6) { ctx.beginPath(); ctx.moveTo(x - ww / 2, y - hh * 0.7); ctx.lineTo(x - ww / 2 + 12, y - hh * 0.8); ctx.stroke(); }
      ctx.restore();
    }
  }
  function burst(w) {
    for (var i = 0; i < 14; i++) sparks.push({ x: w.x + rand(-20, 20), y: w.y - rand(10, w.size * 0.8), vx: rand(-120, 120), vy: rand(-160, 20), life: 1, c: Math.random() < 0.5 ? '#bff4ff' : '#ffffff' });
  }
  function rr(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  function frame(now) {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016); last = now;
    var t = now / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(nebula, 0, 0, W, H);
    // estrellas
    for (var i = 0; i < stars.length; i++) {
      var s = stars[i];
      s.x -= s.z * 6 * dt; if (s.x < -2) s.x = W + 2;
      ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * s.sp + s.tw)) * s.z;
      ctx.fillStyle = s.c; ctx.fillRect(s.x, s.y, s.r * (0.6 + s.z), s.r * (0.6 + s.z));
    }
    ctx.globalAlpha = 1;
    // estrellas fugaces
    nextShoot -= dt;
    if (nextShoot <= 0) { nextShoot = rand(2.5, 6); shooting.push({ x: rand(W * 0.2, W * 1.1), y: rand(-20, H * 0.4), vx: -rand(380, 620), vy: rand(160, 280), life: 1 }); }
    shooting = shooting.filter(function (p) { return p.life > 0; });
    shooting.forEach(function (p) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt * 0.9;
      var g = ctx.createLinearGradient(p.x, p.y, p.x - p.vx * 0.18, p.y - p.vy * 0.18);
      g.addColorStop(0, 'rgba(255,255,255,' + p.life + ')'); g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.strokeStyle = g; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.18, p.y - p.vy * 0.18); ctx.stroke();
    });
    // personajes
    if (opts.parade) {
      nextWalker -= dt;
      if (nextWalker <= 0 && walkers.length < (W > 700 ? 4 : 2)) { newWalker(); nextWalker = rand(2.5, 5); }
      walkers = walkers.filter(function (w) { return w.x > -120 && w.x < W + 120; });
      walkers.sort(function (a, b) { return a.y - b.y; }).forEach(function (w) { drawWalker(w, dt); });
    }
    sparks = sparks.filter(function (p) { return p.life > 0; });
    sparks.forEach(function (p) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 400 * dt; p.life -= dt * 1.4; ctx.globalAlpha = Math.max(0, p.life); ctx.fillStyle = p.c; ctx.fillRect(p.x, p.y, 4, 4); });
    ctx.globalAlpha = 1;
  }

  root.FONDO = {
    start: function (o) { opts = o || {}; if (!cv) setup(); this.resume(); },
    pause: function () { running = false; cancelAnimationFrame(raf); if (cv) cv.style.visibility = 'hidden'; },
    resume: function () { if (!cv) return; cv.style.visibility = 'visible'; if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); },
    set: function (o) { for (var k in o) opts[k] = o[k]; }
  };
})(window);
