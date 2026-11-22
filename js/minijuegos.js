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
