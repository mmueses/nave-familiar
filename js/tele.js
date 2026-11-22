/* Tele: hace de servidor (lleva la partida) y de pantalla común. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var game = new NaveGame();
  var COLORS = NAVE_COLORS;
  var conns = [];        // { w, pid, last }
  var code = null;
  var server = null;
  var lastScreen = null;

  // ---------- Pantallas ----------
  function show(id) {
    ['sConnecting', 'sLobby', 'sIntro', 'sPlay', 'sMeeting', 'sEject', 'sEnd'].forEach(function (s) {
      $(s).classList.toggle('hidden', s !== id);
    });
  }

  // ---------- Sonidos sencillos ----------
  var actx = null;
  function audioOn() {
    if (actx) return;
    try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
  }
  function beep(freqs, dur, type, vol) {
    if (!actx) return;
    var t0 = actx.currentTime;
    freqs.forEach(function (f, i) {
      var o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'square'; o.frequency.value = f;
      g.gain.setValueAtTime(vol || 0.08, t0 + i * dur);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + (i + 1) * dur);
      o.connect(g); g.connect(actx.destination);
      o.start(t0 + i * dur); o.stop(t0 + (i + 1) * dur);
    });
  }
  game.onEvent = function (e) {
    if (e === 'meeting') beep([880, 660, 880, 660], 0.18);
    else if (e === 'lightsOut') beep([300, 200, 150], 0.25, 'sawtooth');
    else if (e === 'lightsOn') beep([500, 800], 0.12, 'sine');
    else if (e === 'task') beep([1200], 0.08, 'sine', 0.04);
    else if (e === 'eject') beep([400, 350, 300, 250], 0.3, 'triangle');
    else if (e === 'end') beep([523, 659, 784, 1046], 0.2, 'triangle', 0.1);
    else if (e === 'intro') beep([392, 523], 0.25, 'triangle');
  };

  // Pantalla siempre encendida
  var wakeLock = null;
  function keepAwake() {
    try { if (navigator.wakeLock && !wakeLock) navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; l.addEventListener('release', function () { wakeLock = null; }); }).catch(function () {}); } catch (e) {}
  }
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') keepAwake(); });
  document.addEventListener('click', function () { audioOn(); keepAwake(); });
  document.addEventListener('keydown', function () { audioOn(); keepAwake(); });

  // ---------- Red ----------
  function phoneUrl() {
    var base = location.href.split('#')[0].split('?')[0].replace(/[^\/]*$/, '');
    return base + 'movil.html?sala=' + code + (NET.local ? '&local=1' : '');
  }
  function startServer(c) {
    code = c;
    try { localStorage.setItem('nave.tvcode', code); } catch (e) {}
    server = NET.host(code, {
      onReady: function () { $('lost').classList.add('hidden'); if (game.phase === 'lobby') renderLobby(true); },
      onLost: function () { $('lost').classList.remove('hidden'); },
      onError: function (type) {
        if (type === 'taken') { server.stop(); startServer(NET.makeCode()); }
      },
      onConn: function (w) {
        var c = { w: w, pid: null, last: Date.now() };
        conns.push(c);
        w.onData = function (m) { c.last = Date.now(); onMsg(c, m); };
        w.onClose = function () { drop(c); };
      }
    });
  }
  function drop(c) {
    var i = conns.indexOf(c);
    if (i < 0) return;
    conns.splice(i, 1);
    if (c.pid && !conns.some(function (o) { return o.pid === c.pid; })) game.leave(c.pid);
    if (game.phase === 'lobby') renderLobby();
  }
  function onMsg(c, m) {
    if (!m || typeof m !== 'object') return;
    var pid = c.pid;
    switch (m.t) {
      case 'hello':
        var r = game.join(String(m.pid || '').slice(0, 40), m.name, m.color);
        if (r !== 'ok') { c.w.send({ t: 'err', e: r }); return; }
        c.pid = String(m.pid).slice(0, 40);
        // cerrar conexiones antiguas del mismo jugador
        conns.slice().forEach(function (o) { if (o !== c && o.pid === c.pid) { o.pid = null; o.w.close(); } });
        c.w.send({ t: 'hi', pid: c.pid, code: code });
        if (game.phase === 'lobby') renderLobby();
        break;
      case 'ping': break;
      case 'in': if (pid) game.setInput(pid, m.x, m.y); break;
      case 'act':
        if (!pid) return;
        if (m.a === 'use') game.use(pid);
        else if (m.a === 'freeze') game.freeze(pid);
        else if (m.a === 'report') game.report(pid);
        else if (m.a === 'sabotage') game.sabotage(pid);
        else if (m.a === 'ready') game.ready(pid);
        break;
      case 'done': if (pid) game.taskDone(pid, m.sid); break;
      case 'cancel': if (pid) game.taskCancel(pid); break;
      case 'vote': if (pid) game.vote(pid, m.v); break;
      case 'set':
        if (pid && pid === game.hostPid()) { game.setSettings(m.s); if (m.lang) setLang(m.lang); renderLobby(); }
        break;
      case 'start':
        if (pid && pid === game.hostPid()) startGame();
        break;
      case 'lobby':
        if (pid && pid === game.hostPid() && game.phase === 'end') game.backToLobby();
        break;
    }
  }
  function sendSnapshots() {
    conns.forEach(function (c) {
      if (!c.pid) return;
      c.w.send(game.snapshot(c.pid));
    });
  }

  // ---------- Sala de espera ----------
  var qrDone = null;
  function renderLobby(force) {
    $('code').textContent = code || '----';
    var url = phoneUrl();
    var shortUrl = url.replace(/^https?:\/\//, '').split('?')[0];
    $('url').textContent = shortUrl;
    if (qrDone !== url && window.qrcode) {
      qrDone = url;
      try {
        var q = qrcode(0, 'M'); q.addData(url); q.make();
        $('qr').innerHTML = q.createImgTag(6, 2);
      } catch (e) { $('qr').textContent = ''; }
    }
    var humans = game.humans();
    var list = $('plist');
    list.innerHTML = '';
    if (!humans.length) {
      var d = document.createElement('div'); d.className = 'muted'; d.style.gridColumn = '1 / -1'; d.style.fontSize = '1.5vw';
      d.textContent = t('tv.noPlayers'); list.appendChild(d);
    }
    humans.forEach(function (h) {
      var card = document.createElement('div');
      card.className = 'pcard' + (h.connected ? '' : ' off');
      card.appendChild(DRAW.avatarCanvas(COLORS[h.color].hex, Math.max(48, Math.round(window.innerWidth * 0.06))));
      var n = document.createElement('div'); n.textContent = h.name; card.appendChild(n);
      list.appendChild(card);
    });
    var bots = Math.max(0, game.settings.total - humans.length);
    $('botsFill').textContent = t('tv.botsFill', { n: bots });
    segOn('setTotal', game.settings.total);
    segOn('setImp', game.settings.impostors);
    segOn('setLang', I18N.lang);
    $('btnStart').disabled = !humans.length;
    if (game.phase === 'lobby') show('sLobby');
  }
  function segOn(id, v) {
    var bs = $(id).querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i].getAttribute('data-v') === String(v));
  }
  function bindSeg(id, fn) {
    var bs = $(id).querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) (function (b) { b.onclick = function () { fn(b.getAttribute('data-v')); renderLobby(); }; })(bs[i]);
  }
  bindSeg('setTotal', function (v) { game.setSettings({ total: +v }); });
  bindSeg('setImp', function (v) { game.setSettings({ impostors: +v }); });
  bindSeg('setLang', function (v) { setLang(v); });
  function setLang(l) { I18N.set(l); I18N.apply(); lastScreen = null; }
  $('btnStart').onclick = function () { startGame(); };
  $('btnFs').onclick = function () {
    var el = document.documentElement;
    try { (el.requestFullscreen || el.webkitRequestFullscreen).call(el); } catch (e) {}
  };
  $('btnAgain').onclick = function () { game.backToLobby(); };
  function startGame() { audioOn(); if (game.start()) lastScreen = null; }

  // ---------- Dibujo del mapa (sin jugadores: así nadie ve quién congela a quién) ----------
  var cv = $('map'), ctx = cv.getContext('2d');
  function resize() {
    var dpr = window.devicePixelRatio || 1;
    cv.width = window.innerWidth * dpr; cv.height = window.innerHeight * dpr;
  }
  window.addEventListener('resize', function () { resize(); if (game.phase === 'lobby') renderLobby(); });
  resize();
  function drawMap(time) {
    var w = cv.width, h = cv.height;
    var s = Math.min(w / 1080, h / 700);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b1026'; ctx.fillRect(0, 0, w, h);
    ctx.setTransform(s, 0, 0, s, (w - 1000 * s) / 2, (h - 600 * s) / 2 + 20 * s);
    DRAW.ship(ctx, { labels: true, t: time, tr: t, lightsOut: game.lightsOut });
    if (game.lightsOut) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(0,0,0,' + (0.55 + 0.1 * Math.sin(time * 3)) + ')';
      ctx.fillRect(0, 0, w, h);
    }
  }

  // ---------- Pantallas de juego ----------
  function name(id) { var p = game.players[id]; return p ? p.name : '?'; }
  function hex(id) { var p = game.players[id]; return p ? COLORS[p.color].hex : '#999'; }

  function renderIntro() {
    var n = game.list().filter(function (p) { return p.role === 'imp'; }).length;
    $('introTitle').textContent = n === 1 ? t('tv.thereAre1') : t('tv.thereAreN', { n: n });
    show('sIntro');
  }
  function renderPlay() {
    show('sPlay');
    $('taskFill').style.width = Math.round(game.taskProgress() * 100) + '%';
    var secs = Math.floor(game.now - game.startedAt);
    $('clock').textContent = Math.floor(secs / 60) + ':' + ('0' + (secs % 60)).slice(-2);
    $('lightsAlert').classList.toggle('hidden', !game.lightsOut);
  }
  function card(p, extra) {
    var ghost = game.isGhost(p);
    var c = document.createElement('div');
    c.className = 'mcard' + (ghost ? ' dead' : '');
    c.appendChild(DRAW.avatarCanvas(COLORS[p.color].hex, Math.max(44, Math.round(window.innerWidth * 0.055)), { frozen: !p.alive && !p.ejected, ghost: p.ejected }));
    var n = document.createElement('div'); n.textContent = p.name; c.appendChild(n);
    if (extra) extra(c);
    return c;
  }
  var meetingKey = '';
  function renderMeeting() {
    var m = game.meeting;
    show('sMeeting');
    $('mReason').textContent = m.reason === 'report'
      ? t('tv.reportBy', { name: name(m.caller), victim: name(m.victim) })
      : t('tv.buttonBy', { name: name(m.caller) });
    $('mPhase').textContent = m.sub === 'discuss' ? t('tv.discuss') : t('tv.vote');
    $('mTimer').textContent = t('tv.secondsLeft', { n: Math.max(0, Math.ceil(m.end - game.now)) });
    var key = m.sub + '|' + game.list().map(function (p) { return p.id + (p.vote !== undefined ? 'v' : '') + (p.ready ? 'r' : ''); }).join(',');
    if (key === meetingKey) return;
    meetingKey = key;
    var grid = $('mGrid'); grid.innerHTML = '';
    game.list().forEach(function (p) {
      grid.appendChild(card(p, function (c) {
        var s = document.createElement('div'); s.className = 'muted'; s.style.fontSize = '1.1vw';
        if (game.isGhost(p)) s.textContent = t('tv.frozen');
        else if (m.sub === 'vote' && p.vote !== undefined) { s.textContent = t('tv.voted'); var tk = document.createElement('span'); tk.className = 'tick'; tk.textContent = '✔'; c.appendChild(tk); }
        else if (m.sub === 'discuss' && p.ready) { var tk2 = document.createElement('span'); tk2.className = 'tick'; tk2.textContent = '✔'; c.appendChild(tk2); }
        c.appendChild(s);
      }));
    });
  }
  var ejectShown = null;
  function renderEject() {
    var r = game.ejectRes;
    if (ejectShown === r) return;
    ejectShown = r;
    show('sEject');
    var stage = $('ejectStage'); stage.innerHTML = '';
    if (r.ejected) {
      var a = DRAW.avatarCanvas(hex(r.ejected), Math.round(window.innerHeight * 0.22));
      stage.appendChild(a);
      $('ejectText').textContent = t('tv.ejected', { name: name(r.ejected) });
      $('ejectSub').textContent = r.wasImp ? t('tv.wasImp', { name: name(r.ejected) }) : t('tv.wasNotImp', { name: name(r.ejected) });
    } else {
      $('ejectText').textContent = t('tv.noEject');
      $('ejectSub').textContent = r.tie ? t('tv.tie') : t('tv.skipped');
    }
    // quién votó a quién (puntitos de color)
    var grid = $('ejectGrid'); grid.innerHTML = '';
    var targets = game.list().filter(function (p) { return r.votes.hasOwnProperty(p.id) || r.counts[p.id]; });
    targets.forEach(function (p) {
      grid.appendChild(card(p, function (c) {
        if (r.ejected === p.id) c.classList.add('out');
        var v = document.createElement('div'); v.className = 'votes';
        for (var id in r.votes) if (r.votes[id] === p.id) { var d = document.createElement('span'); d.style.background = hex(id); v.appendChild(d); }
        c.appendChild(v);
      }));
    });
    var sk = document.createElement('div'); sk.className = 'mcard';
    sk.innerHTML = '<div style="font-size:3vw">⏭</div><div>' + t('tv.skipVotes') + '</div>';
    var v2 = document.createElement('div'); v2.className = 'votes';
    for (var id in r.votes) if (r.votes[id] === 'skip') { var d2 = document.createElement('span'); d2.style.background = hex(id); v2.appendChild(d2); }
    sk.appendChild(v2); grid.appendChild(sk);
  }
  var endShown = null;
  function renderEnd() {
    var r = game.endRes;
    if (endShown === r) return;
    endShown = r;
    show('sEnd');
    var nImp = r.imps.length;
    $('endTitle').textContent = r.winner === 'crew' ? t('tv.crewWin') : (nImp > 1 ? t('tv.impsWin') : t('tv.impWin'));
    $('endTitle').style.color = r.winner === 'crew' ? '#6fb6ff' : '#ff6b6b';
    $('endReason').textContent = t({ tasks: 'tv.reasonTasks', ejected: 'tv.reasonEjected', frozen: 'tv.reasonFrozen' }[r.reason]);
    $('endImpLabel').textContent = nImp > 1 ? t('tv.impsWere') : t('tv.impWas');
    var box = $('endImps'); box.innerHTML = '';
    r.imps.forEach(function (id) { var cc = card(game.players[id]); cc.classList.remove('dead'); cc.style.borderColor = '#e5484d'; box.appendChild(cc); });
    $('endTime').textContent = t('tv.time') + ': ' + Math.floor(r.time / 60) + ':' + ('0' + (r.time % 60)).slice(-2);
    setTimeout(function () { try { $('btnAgain').focus(); } catch (e) {} }, 300);
  }

  // ---------- Bucle principal ----------
  var lastT = performance.now(), lastSend = 0, lastLobbyPaint = 0;
  setInterval(function () {
    var now = performance.now();
    var dt = Math.min(0.25, (now - lastT) / 1000);
    lastT = now;
    if (game.phase !== 'lobby') game.tick(dt);
    if (now - lastSend >= 100) { lastSend = now; sendSnapshots(); }
    // conexiones que han dejado de responder
    var nowMs = Date.now();
    conns.slice().forEach(function (c) { if (nowMs - c.last > 9000) { c.w.close(); drop(c); } });
  }, 50);

  function frame(ms) {
    var time = ms / 1000;
    var ph = game.phase;
    if (ph !== 'lobby') drawMap(time);
    if (ph !== lastScreen) {
      lastScreen = ph;
      meetingKey = ''; ejectShown = null; endShown = null;
      if (ph === 'lobby') { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height); renderLobby(); setTimeout(function () { $('btnStart').focus(); }, 100); }
    }
    if (ph === 'intro') renderIntro();
    else if (ph === 'play') renderPlay();
    else if (ph === 'meeting') renderMeeting();
    else if (ph === 'eject') renderEject();
    else if (ph === 'end') renderEnd();
    requestAnimationFrame(frame);
  }

  // ---------- Arranque ----------
  I18N.apply();
  var saved = null;
  try { saved = localStorage.getItem('nave.tvcode'); } catch (e) {}
  startServer(saved && /^[A-Z]{4}$/.test(saved) ? saved : NET.makeCode());
  requestAnimationFrame(frame);

  // para pruebas automáticas
  window.__game = game;
  window.__conns = conns;
})();
