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
      var cols = ['#e5484d', '#3e7bfa', '#f2d63a', '#f76bb5'];
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
      var btns = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).map(function (n) {
        var b = el('button', '', String(n));
        b.onclick = function () {
          if (n === next) {
            b.classList.add('ok'); next++; vibrate(15);
            if (next === 10) finish(box, done);
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
      var left = 8;
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
      for (i = 0; i < 4; i++) seq.push(Math.floor(Math.random() * 9));
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

  root.MG = {
    open: function (type, container, onDone) {
      container.innerHTML = '';
      var box = el('div', 'mg');
      container.appendChild(box);
      var closed = false;
      (GAMES[type] || GAMES.download)(box, function () { if (!closed) { closed = true; onDone(); } });
      return function () { closed = true; container.innerHTML = ''; };
    }
  };
})(window);
