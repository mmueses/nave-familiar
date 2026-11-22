/* Minijuegos de las tareas (en el móvil). MG.open(tipo, contenedor, alTerminar) -> función para cerrar */
(function (root) {
  function el(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var x = a[i]; a[i] = a[j]; a[j] = x; } return a; }
  function vibrate(ms) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) {} }

  function finish(box, done) {
    var m = el('div', 'doneMsg', t('mg.done'));
    box.appendChild(m);
    vibrate(80);
    setTimeout(done, 650);
  }

  var GAMES = {
    wires: function (box, done) {
      var cols = shuffle(['#e5484d', '#3e7bfa', '#f2d63a', '#f76bb5', '#30c06c', '#ff9a3a']).slice(0, 5);
      box.appendChild(el('div', 'help', t('mg.wires')));
      var area = el('div', 'wires');
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      var L = el('div', 'col'), R = el('div', 'col');
      area.appendChild(svg); area.appendChild(L); area.appendChild(R);
      box.appendChild(area);
      var right = shuffle(cols.slice()), sel = null, ok = 0;
      var lb = cols.map(function (c) { var b = el('button'); b.style.background = c; L.appendChild(b); return b; });
      var rbs = right.map(function (c) { var b = el('button'); b.style.background = c; R.appendChild(b); return b; });
      lb.forEach(function (b, i) {
        b.onclick = function () {
          if (b.disabled) return;
          lb.forEach(function (x) { x.classList.remove('sel'); });
          sel = i; b.classList.add('sel');
        };
      });
      rbs.forEach(function (b, j) {
        b.onclick = function () {
          if (sel === null || b.disabled) return;
          if (cols[sel] === right[j]) {
            var a = area.getBoundingClientRect(), p = lb[sel].getBoundingClientRect(), q = b.getBoundingClientRect();
            var line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', p.right - a.left); line.setAttribute('y1', p.top + p.height / 2 - a.top);
            line.setAttribute('x2', q.left - a.left); line.setAttribute('y2', q.top + q.height / 2 - a.top);
            line.setAttribute('stroke', cols[sel]); line.setAttribute('stroke-width', '10'); line.setAttribute('stroke-linecap', 'round');
            svg.appendChild(line);
            lb[sel].disabled = true; b.disabled = true; lb[sel].classList.remove('sel');
            lb[sel].style.opacity = b.style.opacity = '1';
            sel = null; ok++;
            vibrate(20);
            if (ok === cols.length) finish(box, done);
          } else {
            area.classList.remove('shake'); void area.offsetWidth; area.classList.add('shake');
            vibrate(60);
          }
        };
      });
    },

    numbers: function (box, done) {
      box.appendChild(el('div', 'help', t('mg.numbers')));
      var g = el('div', 'grid9');
      box.appendChild(g);
      var next = 1;
      var btns = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]).map(function (n) {
        var b = el('button', '', String(n));
        b.onclick = function () {
          if (n === next) {
            b.classList.add('ok'); next++; vibrate(15);
            if (next === 13) finish(box, done);
          } else if (n >= next) {
            next = 1;
            btns.forEach(function (x) { x.classList.remove('ok'); });
            g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); vibrate(60);
          }
        };
        g.appendChild(b);
        return b;
      });
    },

    download: function (box, done) {
      box.appendChild(el('div', 'help', t('mg.download')));
      var bar = el('div', 'progress'), fill = el('div');
      bar.appendChild(fill); box.appendChild(bar);
      var btn = el('button', 'hold', t('mg.downloadBtn'));
      box.appendChild(btn);
      var down = false, p = 0, last = performance.now(), finished = false;
      function set(v) { down = v; btn.classList.toggle('down', v); }
      btn.addEventListener('pointerdown', function (e) { e.preventDefault(); set(true); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, function () { set(false); }); });
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      (function loop() {
        if (!box.isConnected || finished) return;
        var now = performance.now(), dt = (now - last) / 1000; last = now;
        if (down) p = Math.min(1, p + dt / 4);
        fill.style.width = (p * 100) + '%';
        if (p >= 1) { finished = true; btn.disabled = true; finish(box, done); return; }
        requestAnimationFrame(loop);
      })();
    },

    calibrate: function (box, done) {
      box.appendChild(el('div', 'help', t('mg.calibrate')));
      var cal = el('div', 'cal'), zone = el('div', 'zone'), arrow = el('div', 'arrow');
      cal.appendChild(zone); cal.appendChild(arrow); box.appendChild(cal);
      var dots = el('div', 'dots'), ds = [];
      for (var i = 0; i < 3; i++) { var d = el('span'); dots.appendChild(d); ds.push(d); }
      box.appendChild(dots);
      var btn = el('button', 'big', t('mg.calibrateBtn'));
      box.appendChild(btn);
      var hits = 0, z0 = 0, zw = 0.22, start = performance.now(), speed = 0.9, pos = 0;
      function newZone() { z0 = 0.1 + Math.random() * (0.8 - zw); zone.style.left = (z0 * 100) + '%'; zone.style.width = (zw * 100) + '%'; }
      newZone();
      btn.onclick = function () {
        if (pos >= z0 && pos <= z0 + zw) {
          ds[hits].classList.add('on'); hits++; vibrate(20);
          if (hits === 3) { btn.disabled = true; finish(box, done); return; }
          newZone(); speed += 0.25;
        } else { cal.classList.remove('shake'); void cal.offsetWidth; cal.classList.add('shake'); vibrate(60); }
      };
      (function loop() {
        if (!box.isConnected || hits === 3) return;
        var tt = (performance.now() - start) / 1000;
        pos = 0.5 + 0.5 * Math.sin(tt * speed * 2);
        arrow.style.left = (pos * 100) + '%';
        requestAnimationFrame(loop);
      })();
    },

    // Pasar tarjeta: arrastrarla por el lector a la velocidad adecuada
    card: function (box, done) {
      var help = el('div', 'help', t('mg.card'));
      box.appendChild(help);
      var reader = el('div', 'reader'), cardEl = el('div', 'card', '🪪');
      reader.appendChild(el('div', 'slot')); reader.appendChild(cardEl);
      box.appendChild(reader);
      var msg = el('div', 'help', '');
      box.appendChild(msg);
      var drag = null, finished = false;
      function maxX() { return reader.clientWidth - cardEl.offsetWidth - 8; }
      cardEl.addEventListener('pointerdown', function (e) {
        if (finished) return;
        drag = { sx: e.clientX, t0: performance.now(), x: 0 };
        try { cardEl.setPointerCapture(e.pointerId); } catch (er) {}
        e.preventDefault();
      });
      cardEl.addEventListener('pointermove', function (e) {
        if (!drag) return;
        drag.x = Math.max(0, Math.min(maxX(), e.clientX - drag.sx));
        cardEl.style.transform = 'translateX(' + drag.x + 'px)';
      });
      function end() {
        if (!drag) return;
        var d = drag; drag = null;
        var secs = (performance.now() - d.t0) / 1000;
        if (d.x < maxX() - 6) msg.textContent = t('mg.cardShort');
        else if (secs < 0.45) msg.textContent = t('mg.cardFast');
        else if (secs > 2.2) msg.textContent = t('mg.cardSlow');
        else { finished = true; msg.textContent = ''; finish(box, done); return; }
        vibrate(60);
        cardEl.style.transform = 'translateX(0)';
      }
      cardEl.addEventListener('pointerup', end);
      cardEl.addEventListener('pointercancel', end);
    },

    // Destruir asteroides tocándolos
    asteroids: function (box, done) {
      var left = 12;
      var help = el('div', 'help', t('mg.asteroids', { n: left }));
      box.appendChild(help);
      var cv = el('canvas', 'astro');
      box.appendChild(cv);
      var W = Math.min(380, window.innerWidth - 30), H = Math.min(260, window.innerHeight - 160);
      var dpr = window.devicePixelRatio || 1;
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
      var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
      var rocks = [], booms = [], last = performance.now(), finished = false, spawnT = 0;
      function spawn() { rocks.push({ x: W + 20, y: 20 + Math.random() * (H - 40), r: 14 + Math.random() * 10, vx: -(50 + Math.random() * 60), vy: (Math.random() - 0.5) * 30, a: 0 }); }
      cv.addEventListener('pointerdown', function (e) {
        if (finished) return;
        var b = cv.getBoundingClientRect(), x = e.clientX - b.left, y = e.clientY - b.top;
        booms.push({ x: x, y: y, t: 0.3, hit: false });
        for (var i = 0; i < rocks.length; i++) {
          if (Math.hypot(rocks[i].x - x, rocks[i].y - y) < rocks[i].r + 12) {
            booms[booms.length - 1].hit = true;
            rocks.splice(i, 1); left--; vibrate(20);
            help.textContent = t('mg.asteroids', { n: Math.max(0, left) });
            if (left <= 0) { finished = true; finish(box, done); }
            break;
          }
        }
      });
      (function loop() {
        if (!box.isConnected || finished) return;
        var now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
        spawnT -= dt; if (spawnT <= 0 && rocks.length < 5) { spawn(); spawnT = 0.7; }
        ctx.fillStyle = '#05081a'; ctx.fillRect(0, 0, W, H);
        for (var s = 0; s < 30; s++) { ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.fillRect((s * 53 + now / 30) % W, (s * 37) % H, 1.5, 1.5); }
        rocks = rocks.filter(function (r) { return r.x > -30; });
        rocks.forEach(function (r) {
          r.x += r.vx * dt; r.y += r.vy * dt; r.a += dt;
          ctx.save(); ctx.translate(r.x, r.y); ctx.rotate(r.a);
          ctx.fillStyle = '#8a7a6a'; ctx.beginPath();
          for (var k = 0; k < 8; k++) { var an = k / 8 * Math.PI * 2, rad = r.r * (0.8 + 0.2 * Math.sin(k * 3)); ctx.lineTo(Math.cos(an) * rad, Math.sin(an) * rad); }
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#6a5a4a'; ctx.beginPath(); ctx.arc(r.r * 0.3, -r.r * 0.2, r.r * 0.25, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        });
        booms = booms.filter(function (b) { return b.t > 0; });
        booms.forEach(function (b) {
          b.t -= dt;
          ctx.strokeStyle = b.hit ? 'rgba(255,200,80,' + (b.t / 0.3) + ')' : 'rgba(120,220,255,' + (b.t / 0.3) + ')';
          ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(b.x, b.y, 22 - b.t * 30, 0, Math.PI * 2); ctx.stroke();
        });
        // mira
        ctx.strokeStyle = 'rgba(80,230,120,0.5)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(W / 2, 0); ctx.lineTo(W / 2, H); ctx.moveTo(0, H / 2); ctx.lineTo(W, H / 2); ctx.stroke();
        requestAnimationFrame(loop);
      })();
    },

    // Repetir la secuencia (arrancar el reactor)
    simon: function (box, done) {
      var help = el('div', 'help', t('mg.simon'));
      box.appendChild(help);
      var status = el('div', 'doneMsg small', '');
      box.appendChild(status);
      var g = el('div', 'grid9 simon');
      box.appendChild(g);
      var btns = [];
      for (var i = 0; i < 9; i++) (function (k) { var b = el('button'); b.onclick = function () { press(k); }; g.appendChild(b); btns.push(b); })(i);
      var seq = [], round = 0, pos = 0, playing = false, finished = false;
      for (i = 0; i < 5; i++) seq.push(Math.floor(Math.random() * 9));
      function flash(k, ms) { btns[k].classList.add('lit'); setTimeout(function () { btns[k].classList.remove('lit'); }, ms); }
      function play() {
        playing = true; pos = 0; status.textContent = t('mg.simonWatch');
        var n = 0;
        (function step() {
          if (!box.isConnected) return;
          if (n > round) { playing = false; status.textContent = t('mg.simonYou'); return; }
          flash(seq[n], 420); n++;
          setTimeout(step, 650);
        })();
      }
      function press(k) {
        if (playing || finished) return;
        flash(k, 180);
        if (k !== seq[pos]) { g.classList.remove('shake'); void g.offsetWidth; g.classList.add('shake'); vibrate(60); setTimeout(play, 600); return; }
        pos++; vibrate(15);
        if (pos > round) {
          round++;
          if (round >= seq.length) { finished = true; status.textContent = ''; finish(box, done); return; }
          setTimeout(play, 500);
        }
      }
      setTimeout(play, 500);
    },

    // Arreglar el reactor: mantener la mano en el escáner
    reactor: function (box, done) {
      box.appendChild(el('div', 'help', t('mg.reactor')));
      var bar = el('div', 'progress'), fill = el('div');
      bar.appendChild(fill); box.appendChild(bar);
      var btn = el('button', 'hold hand', t('mg.reactorBtn'));
      box.appendChild(btn);
      var down = false, p = 0, last = performance.now(), finished = false;
      function set(v) { down = v; btn.classList.toggle('down', v); }
      btn.addEventListener('pointerdown', function (e) { e.preventDefault(); set(true); });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, function () { set(false); }); });
      btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
      (function loop() {
        if (!box.isConnected || finished) return;
        var now = performance.now(), dt = (now - last) / 1000; last = now;
        if (down) p = Math.min(1, p + dt / 2.5); else p = Math.max(0, p - dt / 3);
        fill.style.width = (p * 100) + '%';
        if (p >= 1) { finished = true; btn.disabled = true; finish(box, done); return; }
        requestAnimationFrame(loop);
      })();
    },
    lights: function (box, done) {
      box.appendChild(el('div', 'help', t('mg.lights')));
      var row = el('div', 'switches');
      box.appendChild(row);
      var st = [];
      for (var i = 0; i < 5; i++) st.push(Math.random() < 0.4);
      if (st.filter(Boolean).length > 3) st[0] = st[1] = false;
      if (st.every(Boolean)) st[2] = false;
      var finished = false;
      st.forEach(function (on, i) {
        var b = el('button'); b.appendChild(el('i'));
        b.classList.toggle('on', on);
        b.onclick = function () {
          if (finished) return;
          st[i] = !st[i]; b.classList.toggle('on', st[i]); vibrate(15);
          if (st.every(Boolean)) { finished = true; finish(box, done); }
        };
        row.appendChild(b);
      });
    }
  };


  // ---------- utilidades de lienzo ----------
  function canvasBox(box, W, H, cls) {
    var cv = el('canvas', cls || 'mgcv'); box.appendChild(cv);
    var dpr = window.devicePixelRatio || 1;
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    return { cv: cv, ctx: ctx, W: W, H: H, pos: function (e) { var b = cv.getBoundingClientRect(); return { x: (e.clientX - b.left) * W / b.width, y: (e.clientY - b.top) * H / b.height }; } };
  }
  function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  function shakeEl(e) { e.classList.remove('shake'); void e.offsetWidth; e.classList.add('shake'); vibrate(60); }
  function holdButton(btn, onChange) {
    btn.addEventListener('pointerdown', function (e) { e.preventDefault(); onChange(true); btn.classList.add('down'); });
    ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (ev) { btn.addEventListener(ev, function () { onChange(false); btn.classList.remove('down'); }); });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  function sz() { return Math.min(360, window.innerWidth - 40, (window.innerHeight - 190) * 1.0); }

  var MORE = {
    // Tuberías: gira las piezas hasta que el agua pase de izquierda a derecha
    pipes: function (box, done) {
      box.appendChild(el('div', 'help', t('mg.pipes')));
      var N = 5, S = sz(), C = canvasBox(box, S, S), c = C.ctx, cs = S / N;
      // bits: 1 arriba, 2 derecha, 4 abajo, 8 izquierda
      function rot(b) { return ((b << 1) | (b >> 3)) & 15; }
      var grid = [], r0 = Math.floor(Math.random() * N), path = [[r0, 0]], seen = {}; seen[r0 + ',0'] = 1;
      (function walk() {
        var guard = 0;
        while (path[path.length - 1][1] < N - 1 && guard++ < 200) {
          var cur = path[path.length - 1], opts = [[cur[0], cur[1] + 1], [cur[0] - 1, cur[1]], [cur[0] + 1, cur[1]]].filter(function (q) { return q[0] >= 0 && q[0] < N && !seen[q[0] + ',' + q[1]]; });
          if (!opts.length) { path = [[r0, 0]]; seen = {}; seen[r0 + ',0'] = 1; continue; }
          var q = Math.random() < 0.45 ? opts[0] : opts[Math.floor(Math.random() * opts.length)];
          if (q[1] === cur[1] && Math.random() < 0.3 && opts[0][1] > cur[1]) q = opts[0];
          seen[q[0] + ',' + q[1]] = 1; path.push(q);
        }
      })();
      var exitRow = path[path.length - 1][0];
      for (var r = 0; r < N; r++) { grid.push([]); for (var k = 0; k < N; k++) grid[r].push(Math.random() < 0.5 ? 5 : 3); }
      function dirBit(a, b) { if (b[0] < a[0]) return 1; if (b[1] > a[1]) return 2; if (b[0] > a[0]) return 4; return 8; }
      path.forEach(function (p, i) {
        var bits = 0;
        bits |= i === 0 ? 8 : dirBit(p, path[i - 1]);
        bits |= i === path.length - 1 ? 2 : dirBit(p, path[i + 1]);
        grid[p[0]][p[1]] = bits;
      });
      for (r = 0; r < N; r++) for (k = 0; k < N; k++) { var n = Math.floor(Math.random() * 4); for (var m = 0; m < n; m++) grid[r][k] = rot(grid[r][k]); }
      var wet = {}, finished = false;
      function flow() {
        wet = {}; var stack = [];
        if (grid[r0][0] & 8) { stack.push([r0, 0]); wet[r0 + ',0'] = 1; }
        var ok = false;
        while (stack.length) {
          var p = stack.pop(), b = grid[p[0]][p[1]];
          if (p[1] === N - 1 && p[0] === exitRow && (b & 2)) ok = true;
          [[1, -1, 0, 4], [2, 0, 1, 8], [4, 1, 0, 1], [8, 0, -1, 2]].forEach(function (d) {
            var nr = p[0] + d[1], nc = p[1] + d[2];
            if (!(b & d[0]) || nr < 0 || nc < 0 || nr >= N || nc >= N || wet[nr + ',' + nc]) return;
            if (grid[nr][nc] & d[3]) { wet[nr + ',' + nc] = 1; stack.push([nr, nc]); }
          });
        }
        return ok;
      }
      function draw() {
        c.fillStyle = '#10162e'; c.fillRect(0, 0, S, S);
        for (var r = 0; r < N; r++) for (var k = 0; k < N; k++) {
          var x = k * cs, y = r * cs, cx = x + cs / 2, cy = y + cs / 2, b = grid[r][k], w = wet[r + ',' + k];
          rrect(c, x + 3, y + 3, cs - 6, cs - 6, 8); c.fillStyle = '#1e2748'; c.fill();
          c.lineCap = 'round';
          [[1, cx, y + 3], [2, x + cs - 3, cy], [4, cx, y + cs - 3], [8, x + 3, cy]].forEach(function (d) {
            if (!(b & d[0])) return;
            c.strokeStyle = '#0a0e1e'; c.lineWidth = cs * 0.34; c.beginPath(); c.moveTo(cx, cy); c.lineTo(d[1], d[2]); c.stroke();
            c.strokeStyle = w ? '#3ab8ff' : '#8a94b8'; c.lineWidth = cs * 0.22; c.stroke();
          });
          c.fillStyle = w ? '#3ab8ff' : '#8a94b8'; c.beginPath(); c.arc(cx, cy, cs * 0.12, 0, Math.PI * 2); c.fill();
        }
        c.fillStyle = '#3ab8ff'; c.fillRect(0, r0 * cs + cs * 0.4, 5, cs * 0.2);
        c.fillStyle = '#ffe66b'; c.fillRect(S - 5, exitRow * cs + cs * 0.35, 5, cs * 0.3);
      }
      flow(); draw();
      C.cv.addEventListener('pointerdown', function (e) {
        if (finished) return;
        var p = C.pos(e), k = Math.floor(p.x / cs), r = Math.floor(p.y / cs);
        if (r < 0 || k < 0 || r >= N || k >= N) return;
        grid[r][k] = rot(grid[r][k]); vibrate(10);
        var ok = flow(); draw();
        if (ok) { finished = true; finish(box, done); }
      });
    },

    // Memoria: encuentra las parejas
    memory: function (box, done) {
      box.appendChild(el('div', 'help', t('mg.memory')));
      var icons = shuffle(['🐙', '🐠', '🦀', '🐚', '🌟', '🪐', '🍄', '💎', '🦋', '🌈']).slice(0, 8);
      var cards = shuffle(icons.concat(icons)), g = el('div', 'memGrid'), open = [], found = 0, lock = false;
      box.appendChild(g);
      cards.forEach(function (ic) {
        var b = el('button', 'memCard'); b.innerHTML = '<span>' + ic + '</span>';
        b.onclick = function () {
          if (lock || b.classList.contains('up') || b.classList.contains('ok')) return;
          b.classList.add('up'); open.push(b); vibrate(10);
          if (open.length === 2) {
            var a = open[0], c2 = open[1]; open = [];
            if (a.textContent === c2.textContent) { a.classList.add('ok'); c2.classList.add('ok'); found++; if (found === icons.length) finish(box, done); }
            else { lock = true; setTimeout(function () { a.classList.remove('up'); c2.classList.remove('up'); lock = false; }, 750); }
          }
        };
        g.appendChild(b);
      });
    },

    // Llenar justo hasta la franja (2 veces). Si te pasas, se vacía.
    fill: function (box, done) {
      var help = el('div', 'help', t('mg.fill')); box.appendChild(help);
      var W = Math.min(220, window.innerWidth - 60), H = Math.min(240, window.innerHeight - 330);
      var C = canvasBox(box, W, H), c = C.ctx;
      var dots = el('div', 'dots'), ds = []; for (var i = 0; i < 2; i++) { var d = el('span'); dots.appendChild(d); ds.push(d); } box.appendChild(dots);
      var btn = el('button', 'hold', t('mg.fillBtn')); box.appendChild(btn);
      var level = 0, down = false, band = 0, bw = 0.09, rounds = 0, finished = false, last = performance.now(), msg = 0, speed = 0.32;
      function newBand() { band = 0.35 + Math.random() * 0.45; level = 0; }
      newBand();
      holdButton(btn, function (v) {
        if (finished) return;
        if (down && !v) {   // al soltar: comprobar
          if (level >= band && level <= band + bw) { ds[rounds].classList.add('on'); rounds++; vibrate(25); speed += 0.12; if (rounds >= 2) { finished = true; btn.disabled = true; finish(box, done); return; } setTimeout(newBand, 400); }
          else if (level > 0.02) { msg = 1.2; shakeEl(C.cv); setTimeout(function () { level = 0; }, 350); }
        }
        down = v;
      });
      (function loop() {
        if (!box.isConnected || finished) return;
        var now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
        if (down) level = Math.min(1.05, level + dt * speed);
        if (level > 1) { level = 0; down = false; btn.classList.remove('down'); msg = 1.2; shakeEl(C.cv); }
        msg = Math.max(0, msg - dt);
        c.clearRect(0, 0, W, H);
        var tx = W * 0.2, tw = W * 0.6, ty = 10, th = H - 20;
        rrect(c, tx, ty, tw, th, 14); c.fillStyle = '#0d1430'; c.fill();
        c.save(); rrect(c, tx, ty, tw, th, 14); c.clip();
        var ly = ty + th * (1 - Math.min(1, level)), wave = Math.sin(now / 200) * 3;
        var g = c.createLinearGradient(0, ly, 0, ty + th); g.addColorStop(0, '#5bd8ff'); g.addColorStop(1, '#1a6ab0');
        c.fillStyle = g; c.beginPath(); c.moveTo(tx, ly + wave); c.quadraticCurveTo(tx + tw / 2, ly - wave, tx + tw, ly + wave); c.lineTo(tx + tw, ty + th); c.lineTo(tx, ty + th); c.closePath(); c.fill();
        for (var b = 0; b < 5; b++) { c.fillStyle = 'rgba(255,255,255,0.5)'; c.beginPath(); c.arc(tx + 15 + b * tw / 5, ty + th - ((now / 12 + b * 37) % Math.max(1, (ty + th - ly))), 3, 0, Math.PI * 2); c.fill(); }
        c.restore();
        var by = ty + th * (1 - band - bw);
        c.fillStyle = 'rgba(48,220,120,0.35)'; c.fillRect(tx - 14, by, tw + 28, th * bw);
        c.strokeStyle = '#30dc78'; c.lineWidth = 3; c.strokeRect(tx - 14, by, tw + 28, th * bw);
        rrect(c, tx, ty, tw, th, 14); c.lineWidth = 4; c.strokeStyle = '#8a94b8'; c.stroke();
        if (msg > 0) { c.fillStyle = 'rgba(255,90,90,' + Math.min(1, msg) + ')'; c.font = 'bold 18px system-ui'; c.textAlign = 'center'; c.fillText(t('mg.fillMiss'), W / 2, H / 2); }
        requestAnimationFrame(loop);
      })();
    },

    // Limpiar: frota hasta quitar toda la suciedad
    clean: function (box, done) {
      box.appendChild(el('div', 'help', t('mg.clean')));
      var S = sz(), C = canvasBox(box, S, S * 0.8), c = C.ctx, W = S, H = S * 0.8;
      var bar = el('div', 'progress'), fill = el('div'); bar.appendChild(fill); box.appendChild(bar);
      // fondo: ventana con peces/estrellas
      var bg = document.createElement('canvas'); bg.width = C.cv.width; bg.height = C.cv.height;
      var b = bg.getContext('2d'), dpr = window.devicePixelRatio || 1; b.scale(dpr, dpr);
      var gr = b.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#2aa8d8'); gr.addColorStop(1, '#0a3a6a'); b.fillStyle = gr; b.fillRect(0, 0, W, H);
      for (var i = 0; i < 6; i++) { b.font = (22 + i * 3) + 'px system-ui'; b.fillText(['🐠', '🐟', '🐡', '🦑', '🐚', '⭐'][i], 20 + (i * 53) % (W - 40), 40 + (i * 71) % (H - 50)); }
      var dirt = document.createElement('canvas'); dirt.width = C.cv.width; dirt.height = C.cv.height;
      var d = dirt.getContext('2d'); d.scale(dpr, dpr);
      for (i = 0; i < 70; i++) { d.fillStyle = ['rgba(110,80,40,0.95)', 'rgba(70,110,50,0.95)', 'rgba(90,70,60,0.95)'][i % 3]; d.beginPath(); d.arc(Math.random() * W, Math.random() * H, 18 + Math.random() * 34, 0, Math.PI * 2); d.fill(); }
      d.fillStyle = 'rgba(100,90,60,0.85)'; d.fillRect(0, 0, W, H);
      var finished = false, drawing = false;
      function render() { c.clearRect(0, 0, W, H); c.drawImage(bg, 0, 0, W, H); c.drawImage(dirt, 0, 0, W, H); c.lineWidth = 6; c.strokeStyle = '#8a94b8'; c.strokeRect(3, 3, W - 6, H - 6); }
      function measure() {
        var data = d.getImageData(0, 0, dirt.width, dirt.height).data, tot = 0, clean = 0;
        for (var k = 3; k < data.length; k += 4 * 37) { tot++; if (data[k] < 40) clean++; }
        return clean / tot;
      }
      function rub(e) {
        if (!drawing || finished) return;
        var p = C.pos(e);
        d.globalCompositeOperation = 'destination-out'; d.beginPath(); d.arc(p.x, p.y, 20, 0, Math.PI * 2); d.fill(); d.globalCompositeOperation = 'source-over';
        render();
      }
      C.cv.style.touchAction = 'none';
      C.cv.addEventListener('pointerdown', function (e) { drawing = true; try { C.cv.setPointerCapture(e.pointerId); } catch (er) {} rub(e); });
      C.cv.addEventListener('pointermove', rub);
      ['pointerup', 'pointercancel'].forEach(function (ev) { C.cv.addEventListener(ev, function () { drawing = false; }); });
      render();
      var iv = setInterval(function () {
        if (!box.isConnected || finished) { clearInterval(iv); return; }
        var f = measure(); fill.style.width = Math.min(100, f / 0.93 * 100) + '%';
        if (f >= 0.93) { finished = true; clearInterval(iv); finish(box, done); }
      }, 250);
    },

    // Laberinto: lleva la bola hasta la estrella deslizando el dedo
    maze: function (box, done) {
      box.appendChild(el('div', 'help', t('mg.maze')));
      var cols = 7, rows = 7, S = sz(), C = canvasBox(box, S, S), c = C.ctx, cs = S / cols;
      var wall = [], vis = [];
      for (var r = 0; r < rows; r++) { wall.push([]); vis.push([]); for (var k = 0; k < cols; k++) { wall[r].push(15); vis[r].push(false); } }
      var st = [[0, 0]]; vis[0][0] = true;
      while (st.length) {
        var cur = st[st.length - 1], nb = [];
        [[-1, 0, 1, 4], [0, 1, 2, 8], [1, 0, 4, 1], [0, -1, 8, 2]].forEach(function (d) { var nr = cur[0] + d[0], nc = cur[1] + d[1]; if (nr >= 0 && nc >= 0 && nr < rows && nc < cols && !vis[nr][nc]) nb.push([nr, nc, d[2], d[3]]); });
        if (!nb.length) { st.pop(); continue; }
        var n = nb[Math.floor(Math.random() * nb.length)];
        wall[cur[0]][cur[1]] &= ~n[2]; wall[n[0]][n[1]] &= ~n[3]; vis[n[0]][n[1]] = true; st.push([n[0], n[1]]);
      }
      var me = [0, 0], goal = [rows - 1, cols - 1], trail = [[0, 0]], finished = false, active = false;
      function draw() {
        c.fillStyle = '#0d1430'; c.fillRect(0, 0, S, S);
        c.fillStyle = 'rgba(90,216,255,0.18)'; trail.forEach(function (p) { c.fillRect(p[1] * cs + 4, p[0] * cs + 4, cs - 8, cs - 8); });
        c.font = (cs * 0.6) + 'px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('⭐', goal[1] * cs + cs / 2, goal[0] * cs + cs / 2 + 2);
        c.strokeStyle = '#8a94b8'; c.lineWidth = 4; c.lineCap = 'round';
        for (var r = 0; r < rows; r++) for (var k = 0; k < cols; k++) {
          var x = k * cs, y = r * cs, w = wall[r][k];
          c.beginPath();
          if (w & 1) { c.moveTo(x, y); c.lineTo(x + cs, y); }
          if (w & 2) { c.moveTo(x + cs, y); c.lineTo(x + cs, y + cs); }
          if (w & 4) { c.moveTo(x, y + cs); c.lineTo(x + cs, y + cs); }
          if (w & 8) { c.moveTo(x, y); c.lineTo(x, y + cs); }
          c.stroke();
        }
        var g = c.createRadialGradient(me[1] * cs + cs / 2, me[0] * cs + cs / 2, 2, me[1] * cs + cs / 2, me[0] * cs + cs / 2, cs * 0.35);
        g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ff6fa8');
        c.fillStyle = g; c.beginPath(); c.arc(me[1] * cs + cs / 2, me[0] * cs + cs / 2, cs * 0.3, 0, Math.PI * 2); c.fill();
      }
      function tryMove(e) {
        if (!active || finished) return;
        var p = C.pos(e), k = Math.floor(p.x / cs), r = Math.floor(p.y / cs);
        if (r === me[0] && k === me[1]) return;
        var dr = r - me[0], dc = k - me[1];
        if (Math.abs(dr) + Math.abs(dc) !== 1) return;
        var bit = dr === -1 ? 1 : dc === 1 ? 2 : dr === 1 ? 4 : 8;
        if (wall[me[0]][me[1]] & bit) return;
        me = [r, k]; trail.push([r, k]); vibrate(5); draw();
        if (r === goal[0] && k === goal[1]) { finished = true; finish(box, done); }
      }
      C.cv.style.touchAction = 'none';
      C.cv.addEventListener('pointerdown', function (e) { active = true; try { C.cv.setPointerCapture(e.pointerId); } catch (er) {} tryMove(e); });
      C.cv.addEventListener('pointermove', tryMove);
      ['pointerup', 'pointercancel'].forEach(function (ev) { C.cv.addEventListener(ev, function () { active = false; }); });
      draw();
    },

    // Clasificar: toca la caja del mismo color que el objeto (las cajas cambian de sitio)
    sort: function (box, done) {
      var help = el('div', 'help', t('mg.sort', { n: 10 })); box.appendChild(help);
      var KINDS = [{ c: '#e5484d', i: '❤️' }, { c: '#3e7bfa', i: '💧' }, { c: '#f2d63a', i: '⭐' }, { c: '#30c06c', i: '🍀' }];
      var item = el('div', 'sortItem'); box.appendChild(item);
      var bins = el('div', 'sortBins'); box.appendChild(bins);
      var left = 10, cur = null, finished = false;
      function next() {
        cur = KINDS[Math.floor(Math.random() * KINDS.length)];
        item.textContent = cur.i; item.style.borderColor = cur.c;
        item.classList.remove('pop'); void item.offsetWidth; item.classList.add('pop');
        bins.innerHTML = '';
        shuffle(KINDS.slice()).forEach(function (k) {
          var b = el('button', 'sortBin'); b.style.background = k.c;
          b.onclick = function () {
            if (finished) return;
            if (k === cur) { left--; vibrate(15); help.textContent = t('mg.sort', { n: left }); if (left <= 0) { finished = true; finish(box, done); return; } next(); }
            else { shakeEl(bins); left = Math.min(10, left + 1); help.textContent = t('mg.sort', { n: left }); }
          };
          bins.appendChild(b);
        });
      }
      next();
    },

    // Caja fuerte: gira la rueda hasta cada número y espera a que se encienda
    safe: function (box, done) {
      var code = [Math.floor(Math.random() * 40), Math.floor(Math.random() * 40), Math.floor(Math.random() * 40)];
      var help = el('div', 'help', ''); box.appendChild(help);
      var S = Math.min(280, sz()), C = canvasBox(box, S, S), c = C.ctx, cx = S / 2, cy = S / 2, R = S * 0.42;
      var ang = 0, stepI = 0, hold = 0, drag = null, finished = false, last = performance.now();
      function num() { return ((Math.round(-ang / (Math.PI * 2) * 40) % 40) + 40) % 40; }
      function upd() { help.innerHTML = t('mg.safe') + '<br><b class="safeCode">' + code.map(function (n, i) { return i < stepI ? '✅' : (i === stepI ? '<u>' + n + '</u>' : n); }).join(' · ') + '</b>'; }
      upd();
      C.cv.style.touchAction = 'none';
      C.cv.addEventListener('pointerdown', function (e) { var p = C.pos(e); drag = Math.atan2(p.y - cy, p.x - cx); try { C.cv.setPointerCapture(e.pointerId); } catch (er) {} });
      C.cv.addEventListener('pointermove', function (e) { if (drag === null) return; var p = C.pos(e), a = Math.atan2(p.y - cy, p.x - cx), da = a - drag; if (da > Math.PI) da -= Math.PI * 2; if (da < -Math.PI) da += Math.PI * 2; ang += da; drag = a; });
      ['pointerup', 'pointercancel'].forEach(function (ev) { C.cv.addEventListener(ev, function () { drag = null; }); });
      (function loop() {
        if (!box.isConnected || finished) return;
        var now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
        var on = num() === code[stepI];
        hold = on ? hold + dt : 0;
        if (hold > 0.7) { stepI++; hold = 0; vibrate(40); upd(); if (stepI >= 3) { finished = true; finish(box, done); return; } }
        c.clearRect(0, 0, S, S);
        c.fillStyle = '#3a3f55'; c.beginPath(); c.arc(cx, cy, R + 14, 0, Math.PI * 2); c.fill();
        c.lineWidth = 4; c.strokeStyle = '#1a1a2e'; c.stroke();
        c.save(); c.translate(cx, cy); c.rotate(ang);
        c.fillStyle = '#c8ccda'; c.beginPath(); c.arc(0, 0, R, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#1a1a2e'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold ' + Math.round(S * 0.05) + 'px system-ui';
        for (var i = 0; i < 40; i++) {
          var a = i / 40 * Math.PI * 2 - Math.PI / 2;
          c.fillRect(Math.cos(a) * (R - 6) - 1, Math.sin(a) * (R - 6) - 1, 2, 2);
          if (i % 5 === 0) c.fillText(String(i), Math.cos(a) * (R - 20), Math.sin(a) * (R - 20));
        }
        c.fillStyle = '#8a94b8'; c.beginPath(); c.arc(0, 0, R * 0.35, 0, Math.PI * 2); c.fill(); c.stroke();
        c.restore();
        c.fillStyle = on ? '#30dc78' : '#ff5c5c'; c.beginPath(); c.moveTo(cx - 10, 4); c.lineTo(cx + 10, 4); c.lineTo(cx, 20); c.closePath(); c.fill();
        c.fillStyle = on ? 'rgba(48,220,120,' + (0.4 + hold) + ')' : '#2a2f40'; c.beginPath(); c.arc(cx, cy, R * 0.18, 0, Math.PI * 2); c.fill();
        c.fillStyle = '#fff'; c.font = 'bold ' + Math.round(S * 0.09) + 'px system-ui'; c.fillText(String(num()), cx, cy + 1);
        requestAnimationFrame(loop);
      })();
    },

    // --- pasos de tareas largas ---
    upload: function (box, done, x) {
      box.appendChild(el('div', 'help', t('mg.upload')));
      var bar = el('div', 'progress'), fill = el('div'); bar.appendChild(fill); box.appendChild(bar);
      var btn = el('button', 'hold', t('mg.uploadBtn')); box.appendChild(btn);
      var down = false, p = 0, last = performance.now(), finished = false;
      holdButton(btn, function (v) { down = v; });
      (function loop() {
        if (!box.isConnected || finished) return;
        var now = performance.now(), dt = (now - last) / 1000; last = now;
        if (down) p = Math.min(1, p + dt / 5);
        fill.style.width = (p * 100) + '%';
        if (p >= 1) { finished = true; btn.disabled = true; finish(box, done); return; }
        requestAnimationFrame(loop);
      })();
    },
    codeRead: function (box, done, x) {
      box.appendChild(el('div', 'help', t('mg.codeRead', { room: (x && x.room) || '?' })));
      var code = el('div', 'bigCode', (x && x.code ? x.code : '0000').split('').join(' ')); box.appendChild(code);
      var b = el('button', 'big', t('mg.codeOk')); box.appendChild(b);
      b.onclick = function () { b.disabled = true; finish(box, done); };
    },
    codeEnter: function (box, done, x) {
      var target = (x && x.code) || '0000', fails = 0, typed = '';
      var help = el('div', 'help', t('mg.codeEnter')); box.appendChild(help);
      var disp = el('div', 'bigCode', '_ _ _ _'); box.appendChild(disp);
      var g = el('div', 'grid9 keypad'); box.appendChild(g);
      function show() { var s2 = ''; for (var i = 0; i < 4; i++) s2 += (typed[i] || '_') + (i < 3 ? ' ' : ''); disp.textContent = s2; }
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '⌫', '0', '✔'].forEach(function (k) {
        var b = el('button', '', k);
        b.onclick = function () {
          if (k === '⌫') typed = typed.slice(0, -1);
          else if (k === '✔') {
            if (typed === target) { finish(box, done); return; }
            fails++; typed = ''; shakeEl(disp);
            if (fails >= 3) help.textContent = t('mg.codeHint', { code: target });
          } else if (typed.length < 4) typed += k;
          vibrate(10); show();
        };
        g.appendChild(b);
      });
    },
    fuelGet: function (box, done) { GAMESREF.fill(box, done); },
    fuelPour: function (box, done) {
      box.appendChild(el('div', 'help', t('mg.fuelPour')));
      var bar = el('div', 'progress'), fill = el('div'); bar.appendChild(fill); box.appendChild(bar);
      var btn = el('button', 'hold', t('mg.fuelPourBtn')); box.appendChild(btn);
      var down = false, p = 0, last = performance.now(), finished = false;
      holdButton(btn, function (v) { down = v; });
      (function loop() {
        if (!box.isConnected || finished) return;
        var now = performance.now(), dt = (now - last) / 1000; last = now;
        if (down) p = Math.min(1, p + dt / 3.5);
        fill.style.width = (p * 100) + '%';
        if (p >= 1) { finished = true; btn.disabled = true; finish(box, done); return; }
        requestAnimationFrame(loop);
      })();
    }
  };
  var GAMESREF = null;
  root.MG = {
    open: function (type, container, onDone, extra) {
      container.innerHTML = '';
      var box = el('div', 'mg');
      container.appendChild(box);
      var closed = false;
      for (var k in MORE) if (!GAMES[k]) GAMES[k] = MORE[k];
      GAMESREF = GAMES;
      (GAMES[type] || GAMES.download)(box, function () { if (!closed) { closed = true; onDone(); } }, extra);
      return function () { closed = true; container.innerHTML = ''; };
    }
  };
})(window);
