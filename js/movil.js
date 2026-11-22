/* Móvil: mando del jugador. Recibe "fotos" de la tele y envía movimientos y acciones. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var COLORS = NAVE_COLORS;
  var MAP = NAVE_MAP;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // Identidad del jugador (para reconectar tras recargar). Con &tab=1 cada pestaña es un jugador distinto (pruebas).
  var perTab = /[?&]tab=1/.test(location.search);
  var pid = perTab ? sessionStorage.getItem('nave.pid') : store.get('nave.pid');
  if (!pid) {
    pid = 'p' + Math.random().toString(36).slice(2, 10);
    if (perTab) sessionStorage.setItem('nave.pid', pid); else store.set('nave.pid', pid);
  }
  var myColor = parseInt(store.get('nave.color'), 10);
  if (isNaN(myColor)) myColor = Math.floor(Math.random() * COLORS.length);

  var SOLO = /[?&]solo=1/.test(location.search);
  var conn = null, code = null, lastData = 0, retryTimer = null, joinedOnce = false, stopRetry = false;
  var s = null;           // última foto recibida
  var screen = null;

  // ---------- Pantallas ----------
  var SCREENS = ['sJoin', 'sWait', 'sLobby', 'sIntro', 'sPlay', 'sMeeting', 'sInfo'];
  function show(id) {
    if (screen === id) return;
    screen = id;
    SCREENS.forEach(function (x) { $(x).classList.toggle('hidden', x !== id); });
    if (id !== 'sPlay') { closeMg(); $('mapModal').classList.add('hidden'); resetJoy(); }
  }
  function wait(text) { $('waitText').textContent = text; show('sWait'); }

  // ---------- Formulario de entrada ----------
  function buildSwatches(box, taken) {
    box.innerHTML = '';
    COLORS.forEach(function (c, i) {
      var b = document.createElement('button');
      b.style.background = c.hex;
      b.setAttribute('aria-label', c.id);
      if (i === myColor) b.classList.add('on');
      if (taken && taken.indexOf(i) >= 0) { b.classList.add('taken'); b.disabled = true; }
      b.onclick = function () {
        myColor = i; store.set('nave.color', String(i));
        buildSwatches(box, taken);
        if (conn && box.id === 'sw2') sendHello();
      };
      box.appendChild(b);
    });
  }
  var q = location.search.match(/[?&]sala=([A-Za-z]{4})/);
  $('code').value = q ? q[1].toUpperCase() : (store.get('nave.code') || '');
  $('name').value = store.get('nave.name') || '';
  $('code').addEventListener('input', function () { this.value = NET.cleanCode(this.value); });
  buildSwatches($('sw1'));
  if (SOLO) {
    $('code').classList.add('hidden'); $('codeLabel').classList.add('hidden');
    $('btnJoin').setAttribute('data-i18n', 'ph.play');
    $('waitingTxt').classList.add('hidden'); $('hostHint').classList.add('hidden');
  }
  $('btnJoin').onclick = function () {
    if (SOLO) {
      var nm = $('name').value.trim();
      if (!nm) { $('name').focus(); return; }
      store.set('nave.name', nm);
      startSolo();
      return;
    }
    var c = NET.cleanCode($('code').value);
    var n = $('name').value.trim();
    if (c.length !== 4) { $('joinErr').textContent = t('ph.notFound'); return; }
    if (!n) { $('name').focus(); return; }
    store.set('nave.name', n); store.set('nave.code', c);
    code = c; stopRetry = false; joinedOnce = false;
    $('joinErr').textContent = '';
    connect(true);
  };

  // ---------- Conexión ----------
  function sendHello() {
    send({ t: 'hello', pid: pid, name: store.get('nave.name') || $('name').value, color: myColor });
  }
  function send(o) { if (conn) conn.send(o); }
  function connect(first) {
    wait(first ? t('ph.connecting') : t('ph.lost'));
    NET.join(code, {
      onOpen: function (w) {
        conn = w; lastData = Date.now();
        w.onData = onData;
        w.onClose = function () { if (conn === w) { conn = null; scheduleRetry(); } };
        sendHello();
      },
      onError: function (e) {
        if (first && !joinedOnce) {
          show('sJoin');
          $('joinErr').textContent = e === 'notfound' ? t('ph.notFound') : t('ph.lost');
        } else scheduleRetry();
      }
    });
  }
  function scheduleRetry() {
    if (stopRetry || retryTimer) return;
    wait(t('ph.lost'));
    retryTimer = setTimeout(function () { retryTimer = null; if (!conn) connect(false); }, 2000);
  }
  setInterval(function () {
    if (!conn) return;
    send({ t: 'ping' });
    if (Date.now() - lastData > 6500) conn.close();
  }, 2000);

  function onData(m) {
    lastData = Date.now();
    if (!m) return;
    if (m.t === 'err') {
      stopRetry = true;
      var c = conn; conn = null; if (c) c.close();
      show('sJoin');
      $('joinErr').textContent = m.e === 'full' ? t('ph.full') : t('ph.inGame');
      return;
    }
    if (m.t === 'hi') { joinedOnce = true; return; }
    if (m.t === 's') onSnap(m);
  }

  // ---------- Modo solo: la partida corre en este mismo dispositivo ----------
  function startSolo() {
    var g = new NaveGame();
    g.join(pid, store.get('nave.name'), myColor);
    conn = { send: function (o) { soloMsg(g, o); }, close: function () {} };
    joinedOnce = true;
    var last = performance.now(), lastSnap = 0;
    setInterval(function () {
      var now = performance.now();
      var dt = Math.min(0.25, (now - last) / 1000); last = now;
      if (g.phase !== 'lobby') g.tick(dt);
      if (now - lastSnap >= 100) { lastSnap = now; onData(JSON.parse(JSON.stringify(g.snapshot(pid)))); }
    }, 50);
    window.__game = g;
  }
  function soloMsg(g, m) {
    switch (m.t) {
      case 'hello': g.join(pid, m.name, m.color); break;
      case 'in': g.setInput(pid, m.x, m.y); break;
      case 'act':
        if (m.a === 'use') g.use(pid); else if (m.a === 'freeze') g.freeze(pid);
        else if (m.a === 'report') g.report(pid); else if (m.a === 'sabotage') g.sabotage(pid);
        else if (m.a === 'ready') g.ready(pid);
        break;
      case 'done': g.taskDone(pid, m.sid); break;
      case 'cancel': g.taskCancel(pid); break;
      case 'vote': g.vote(pid, m.v); break;
      case 'set': g.setSettings(m.s); if (m.lang) { I18N.set(m.lang); I18N.apply(); uiKey = {}; } break;
      case 'start': g.start(); break;
      case 'lobby': if (g.phase === 'end') g.backToLobby(); break;
    }
  }

  // ---------- Recibir el estado ----------
  function onSnap(n) {
    var prev = s;
    s = n;
    if (n.lang && n.lang !== I18N.lang) { I18N.set(n.lang); I18N.apply(); uiKey = {}; }
    switch (n.ph) {
      case 'lobby': renderLobby(); break;
      case 'spectator': wait(t('ph.inGame')); break;
      case 'intro': renderIntro(prev); break;
      case 'play': renderPlay(); break;
      case 'meeting': renderMeeting(); break;
      case 'eject': renderEject(); break;
      case 'end': renderEnd(); break;
    }
  }
  var uiKey = {};
  function changed(k, v) { if (uiKey[k] === v) return false; uiKey[k] = v; return true; }

  // ---------- Sala de espera ----------
  function renderLobby() {
    show('sLobby');
    var me = s.me || { n: '', c: myColor };
    if (changed('lobby', JSON.stringify([s.players, s.host, s.settings, me, I18N.lang]))) {
      myColor = me.c;
      $('meAvatar').innerHTML = '';
      $('meAvatar').appendChild(DRAW.avatarCanvas(COLORS[me.c].hex, 90));
      $('meName').textContent = me.n;
      var taken = s.players.filter(function (p) { return p.id !== pid; }).map(function (p) { return p.c; });
      buildSwatches($('sw2'), taken);
      var list = $('lobbyList'); list.innerHTML = '';
      s.players.forEach(function (p) {
        var d = document.createElement('div');
        d.appendChild(DRAW.avatarCanvas(COLORS[p.c].hex, 46));
        var nm = document.createElement('span'); nm.textContent = p.n; d.appendChild(nm);
        list.appendChild(d);
      });
      var isHost = s.host === pid;
      $('hostBox').classList.toggle('hidden', !isHost);
      seg('pTotal', s.settings.total); seg('pImp', s.settings.impostors); seg('pLang', s.lang);
    }
  }
  function seg(id, v) {
    var bs = $(id).querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) bs[i].classList.toggle('on', bs[i].getAttribute('data-v') === String(v));
  }
  function bindSeg(id, fn) {
    var bs = $(id).querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) (function (b) { b.onclick = function () { fn(b.getAttribute('data-v')); }; })(bs[i]);
  }
  bindSeg('pTotal', function (v) { send({ t: 'set', s: { total: +v } }); });
  bindSeg('pImp', function (v) { send({ t: 'set', s: { impostors: +v } }); });
  bindSeg('pLang', function (v) { send({ t: 'set', s: {}, lang: v }); });
  $('btnStart').onclick = function () { send({ t: 'start' }); };

  // ---------- Presentación del papel (secreto) ----------
  function renderIntro(prev) {
    show('sIntro');
    if (!changed('intro', s.me.role + s.me.c + I18N.lang)) return;
    var imp = s.me.role === 'imp';
    $('introAvatar').innerHTML = '';
    $('introAvatar').appendChild(DRAW.avatarCanvas(COLORS[s.me.c].hex, 110));
    $('introRole').textContent = imp ? t('ph.imp') : t('ph.crew');
    $('introRole').style.color = imp ? '#ff6b6b' : '#6fb6ff';
    $('introHint').textContent = imp ? t('ph.impHint') : t('ph.crewHint');
    $('introPartner').textContent = imp && s.me.partners && s.me.partners.length ? t('ph.partner', { name: s.me.partners.join(', ') }) : '';
    $('cover').classList.add('hidden');
    try { navigator.vibrate && navigator.vibrate(imp ? [100, 60, 100] : 120); } catch (e) {}
  }
  $('sIntro').onclick = function () { $('cover').classList.toggle('hidden'); };

  // ---------- Partida ----------
  function stationName(sid) {
    var st = MAP.station(sid);
    var room = MAP.rooms.filter(function (r) { return r.id === st.room; })[0];
    return t(st.name) + ' · ' + t(room.name);
  }
  function renderPlay() {
    show('sPlay');
    var me = s.me, imp = me.role === 'imp';
    // tareas
    var tk = JSON.stringify([me.tasks, s.prog, imp, I18N.lang]);
    if (changed('tasks', tk)) {
      var box = $('taskBox');
      box.innerHTML = '';
      var b = document.createElement('b'); b.textContent = imp ? t('ph.fakeTasks') : t('ph.myTasks'); box.appendChild(b);
      var bar = document.createElement('div'); bar.className = 'bar';
      var fill = document.createElement('div'); fill.style.width = Math.round(s.prog * 100) + '%'; bar.appendChild(fill); box.appendChild(bar);
      me.tasks.forEach(function (x) {
        var d = document.createElement('div');
        d.textContent = (x[1] ? '✔ ' : '• ') + stationName(x[0]);
        if (x[1] && !imp) d.className = 'done';
        box.appendChild(d);
      });
    }
    if (changed('badge', me.role + me.ghost + I18N.lang)) {
      $('badge').className = 'rolebadge ' + me.role;
      $('badge').textContent = (me.ghost ? '👻 ' : '') + (imp ? t('ph.imp') : t('ph.crew'));
    }
    $('phLights').classList.toggle('hidden', !(s.dark && !imp && !me.ghost));
    $('ghostMsg').classList.toggle('hidden', !me.ghost || !!mgClose);
    // botones
    var bt = s.b || {};
    $('bUse').disabled = !bt.use;
    $('bUse').textContent = bt.use === 'em' ? t('ph.meetingBtn') : t('ph.use');
    $('bRep').disabled = !bt.rep;
    $('bRep').classList.toggle('hidden', me.ghost);
    var showImp = imp && !me.ghost;
    $('bFrz').classList.toggle('hidden', !showImp);
    $('bSab').classList.toggle('hidden', !showImp);
    if (showImp) {
      $('bFrz').disabled = !bt.frz;
      cd($('bFrz'), bt.fcd);
      $('bSab').disabled = !bt.sab;
      cd($('bSab'), bt.scd);
    }
    // minijuego
    if (me.busy && mgSid !== me.busy) openMg(me.busy);
    else if (!me.busy && mgClose) closeMg();
  }
  function cd(btn, n) {
    var c = btn.querySelector('.cd');
    c.classList.toggle('hidden', !n);
    c.textContent = n || '';
  }
  function act(a) { send({ t: 'act', a: a }); try { navigator.vibrate && navigator.vibrate(25); } catch (e) {} }
  $('bUse').onclick = function () { act('use'); };
  $('bRep').onclick = function () { act('report'); };
  $('bFrz').onclick = function () { act('freeze'); };
  $('bSab').onclick = function () { act('sabotage'); };

  // Minijuegos
  var mgClose = null, mgSid = null;
  function openMg(sid) {
    closeMg();
    var st = MAP.station(sid);
    mgSid = sid;
    $('mgModal').classList.remove('hidden');
    resetJoy();
    mgClose = MG.open(st.type, $('mgBox'), function () { send({ t: 'done', sid: sid }); closeMg(); });
  }
  function closeMg() {
    if (mgClose) mgClose();
    mgClose = null; mgSid = null;
    $('mgModal').classList.add('hidden');
  }
  $('mgClose').onclick = function () { send({ t: 'cancel' }); closeMg(); };

  // Mapa pequeño
  $('btnMap').onclick = function () { $('mapModal').classList.remove('hidden'); };
  $('mapClose').onclick = function () { $('mapModal').classList.add('hidden'); };

  // ---------- Joystick ----------
  var joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 }, lastSent = { x: 0, y: 0, t: 0 }, keys = {};
  var cv = $('cv');
  cv.addEventListener('pointerdown', function (e) {
    if (joy.id !== null) return;
    joy.id = e.pointerId; joy.ox = e.clientX; joy.oy = e.clientY; joy.x = joy.y = 0;
    var j = $('joy'); j.style.left = e.clientX + 'px'; j.style.top = e.clientY + 'px'; j.classList.remove('hidden');
    $('knob').style.transform = 'translate(0,0)';
    $('joyHint').classList.add('hidden');
    try { cv.setPointerCapture(e.pointerId); } catch (er) {}
    e.preventDefault();
  });
  cv.addEventListener('pointermove', function (e) {
    if (e.pointerId !== joy.id) return;
    var dx = e.clientX - joy.ox, dy = e.clientY - joy.oy, R = 50;
    var m = Math.hypot(dx, dy);
    if (m > R) { dx = dx / m * R; dy = dy / m * R; }
    joy.x = dx / R; joy.y = dy / R;
    if (Math.hypot(joy.x, joy.y) < 0.15) joy.x = joy.y = 0;
    $('knob').style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  });
  function endJoy(e) { if (e.pointerId !== joy.id) return; resetJoy(); }
  cv.addEventListener('pointerup', endJoy);
  cv.addEventListener('pointercancel', endJoy);
  function resetJoy() { joy.id = null; joy.x = joy.y = 0; $('joy').classList.add('hidden'); }
  // teclado (para probar desde un ordenador)
  document.addEventListener('keydown', function (e) {
    keys[e.key.toLowerCase()] = true;
    if (screen === 'sPlay' && !mgClose) {
      var k = e.key.toLowerCase();
      if (k === 'e' || k === ' ') act('use');
      if (k === 'r') act('report');
      if (k === 'q') act('freeze');
      if (k === 'f') act('sabotage');
    }
  });
  document.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  function inputVec() {
    var x = joy.x, y = joy.y;
    if (keys.arrowleft || keys.a) x = -1; if (keys.arrowright || keys.d) x = 1;
    if (keys.arrowup || keys.w) y = -1; if (keys.arrowdown || keys.s) y = 1;
    if (mgClose || screen !== 'sPlay') x = y = 0;
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  }
  setInterval(function () {
    if (!conn) return;
    var v = inputVec(), now = Date.now();
    if (v.x !== lastSent.x || v.y !== lastSent.y || ((v.x || v.y) && now - lastSent.t > 500)) {
      send({ t: 'in', x: v.x, y: v.y });
      lastSent = { x: v.x, y: v.y, t: now };
    }
  }, 60);

  // ---------- Dibujo ----------
  var ctx = cv.getContext('2d');
  var disp = {};       // posiciones suavizadas
  var lastFrame = performance.now();
  function smooth(key, x, y, k) {
    var d = disp[key];
    if (!d || Math.hypot(d.x - x, d.y - y) > 120) { d = disp[key] = { x: x, y: y, walk: 0, dir: 1 }; }
    var ox = d.x;
    d.x += (x - d.x) * k; d.y += (y - d.y) * k;
    var moved = Math.hypot(x - d.x, y - d.y);
    if (moved > 0.8) { d.walk += 0.06; if (Math.abs(x - ox) > 0.2) d.dir = x > ox ? 1 : -1; } else d.walk = 0;
    return d;
  }
  function pendingStations() {
    if (!s || !s.me) return [];
    var hl = [];
    if (s.me.role === 'crew') s.me.tasks.forEach(function (x) { if (!x[1]) hl.push(x[0]); });
    if (s.dark && !s.me.ghost) hl.push('lt');
    return hl;
  }
  function drawPlay(time, dt) {
    var dpr = window.devicePixelRatio || 1;
    var W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var k = 1 - Math.exp(-dt * 14);
    var me = smooth('me', s.me.x, s.me.y, k);
    var sc = Math.min(W, H) / 430 * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b1026'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(sc, 0, 0, sc, cv.width / 2 - me.x * sc, cv.height / 2 - me.y * sc);
    DRAW.ship(ctx, { labels: true, t: time, tr: t, highlight: pendingStations(), lightsOut: !!s.dark });
    (s.bd || []).forEach(function (b) { DRAW.frozen(ctx, b[0], b[1], COLORS[b[2]].hex, time); });
    var seen = {};
    (s.ps || []).forEach(function (p) {
      var key = p[3] + '#' + p[2];
      seen[key] = 1;
      var d = smooth(key, p[0], p[1], k);
      DRAW.character(ctx, d.x, d.y, COLORS[p[2]].hex, { name: p[3], ghost: !!p[4], walk: d.walk, dir: d.dir, nameColor: p[5] ? '#ff6b6b' : '#fff' });
    });
    for (var key in disp) if (key !== 'me' && !seen[key]) delete disp[key];
    DRAW.character(ctx, me.x, me.y, COLORS[s.me.c].hex, { name: s.me.n, ghost: s.me.ghost, walk: me.walk, dir: me.dir, nameColor: '#ffe66b' });
    // oscuridad fuera de la vista
    var r = (s.vr || 175) * sc;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    var g = ctx.createRadialGradient(cv.width / 2, cv.height / 2, r * 0.7, cv.width / 2, cv.height / 2, r);
    g.addColorStop(0, 'rgba(5,8,24,0)');
    g.addColorStop(1, 'rgba(5,8,24,0.97)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cv.width, cv.height);
  }
  var mini = $('miniCv'), mctx = mini.getContext('2d');
  function drawMini(time) {
    var dpr = window.devicePixelRatio || 1;
    var W = mini.clientWidth, H = W * 0.7;
    mini.style.height = H + 'px';
    if (mini.width !== Math.round(W * dpr)) { mini.width = Math.round(W * dpr); mini.height = Math.round(H * dpr); }
    var sc = Math.min(mini.width / (MAP.w + 170), mini.height / (MAP.h + 120));
    mctx.setTransform(sc, 0, 0, sc, (mini.width - MAP.w * sc) / 2, (mini.height - MAP.h * sc) / 2);
    DRAW.ship(mctx, { labels: true, t: time, tr: t, highlight: pendingStations(), lightsOut: !!s.dark });
    var p = 0.6 + 0.4 * Math.sin(time * 6);
    mctx.fillStyle = 'rgba(255,230,107,' + p + ')';
    mctx.beginPath(); mctx.arc(s.me.x, s.me.y, 26, 0, Math.PI * 2); mctx.fill();
    DRAW.character(mctx, s.me.x, s.me.y, COLORS[s.me.c].hex, { scale: 1.3 });
  }
  function frame(ms) {
    var dt = Math.min(0.1, (ms - lastFrame) / 1000); lastFrame = ms;
    if (screen === 'sPlay' && s && s.ph === 'play' && s.me && s.me.x != null) {
      drawPlay(ms / 1000, dt);
      if (!$('mapModal').classList.contains('hidden')) drawMini(ms / 1000);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- Reunión ----------
  function rname(id) { return s.roster && s.roster[id] ? s.roster[id].n : '?'; }
  function rcol(id) { return s.roster && s.roster[id] ? COLORS[s.roster[id].c].hex : '#999'; }
  function renderMeeting() {
    show('sMeeting');
    $('mTimer').textContent = s.left + ' s';
    $('mReason').textContent = s.reason === 'report'
      ? t('tv.reportBy', { name: rname(s.caller), victim: rname(s.victim) })
      : t('tv.buttonBy', { name: rname(s.caller) });
    var meAlive = !s.me.ghost;
    var discuss = s.sub === 'discuss';
    $('mDiscuss').classList.toggle('hidden', !discuss);
    $('mVote').classList.toggle('hidden', discuss);
    if (discuss) {
      $('btnReady').classList.toggle('hidden', !meAlive || !!s.iReady);
      $('readyWait').classList.toggle('hidden', !s.iReady);
      return;
    }
    var key = JSON.stringify([s.players, s.myVote, I18N.lang]);
    if (!changed('vote', key)) return;
    $('voteTitle').textContent = !meAlive ? t('ph.cantVote') : (s.myVote ? t('ph.youVoted') : t('ph.voteNow'));
    var list = $('voteList'); list.innerHTML = '';
    var canVote = meAlive && !s.myVote;
    s.players.forEach(function (p) {
      var b = document.createElement('button');
      if (!p.alive) b.className = 'dead';
      if (s.myVote === p.id) b.classList.add('mine');
      b.appendChild(DRAW.avatarCanvas(rcol(p.id), 40, { frozen: !p.alive }));
      var n = document.createElement('span'); n.style.flex = '1';
      n.textContent = rname(p.id) + (p.id === pid ? ' ★' : '');
      b.appendChild(n);
      if (p.voted) { var v = document.createElement('span'); v.textContent = '✔'; v.style.color = '#30a46c'; b.appendChild(v); }
      b.disabled = !canVote || !p.alive;
      b.onclick = function () { send({ t: 'vote', v: p.id }); };
      list.appendChild(b);
    });
    var sk = document.createElement('button');
    sk.className = 'skip' + (s.myVote === 'skip' ? ' mine' : '');
    sk.textContent = t('ph.skip');
    sk.disabled = !canVote;
    sk.onclick = function () { send({ t: 'vote', v: 'skip' }); };
    list.appendChild(sk);
  }
  $('btnReady').onclick = function () { act('ready'); };

  // ---------- Resultado y final ----------
  function renderEject() {
    show('sInfo');
    var r = s.res;
    $('btnLobby').classList.add('hidden');
    $('infoTitle').textContent = SOLO ? '' : t('ph.lookTv');
    $('infoTitle').style.color = '';
    if (r.ejected) {
      $('infoText').textContent = t('tv.ejected', { name: rname(r.ejected) });
      $('infoSub').textContent = r.wasImp ? t('tv.wasImp', { name: rname(r.ejected) }) : t('tv.wasNotImp', { name: rname(r.ejected) });
    } else {
      $('infoText').textContent = t('tv.noEject');
      $('infoSub').textContent = r.tie ? t('tv.tie') : t('tv.skipped');
    }
  }
  function renderEnd() {
    show('sInfo');
    var r = s.res;
    $('infoTitle').textContent = s.iWon ? t('ph.win') : t('ph.lose');
    $('infoTitle').style.color = s.iWon ? '#30a46c' : '#ff6b6b';
    $('infoText').textContent = r.winner === 'crew' ? t('tv.crewWin') : (r.imps.length > 1 ? t('tv.impsWin') : t('tv.impWin'));
    $('infoSub').textContent = t({ tasks: 'tv.reasonTasks', ejected: 'tv.reasonEjected', frozen: 'tv.reasonFrozen' }[r.reason]) + ' ' +
      t('ph.impWas', { names: r.imps.map(rname).join(', ') });
    $('btnLobby').classList.toggle('hidden', s.host !== pid);
  }
  $('btnLobby').onclick = function () { send({ t: 'lobby' }); };

  // ---------- Pantalla encendida ----------
  var wl = null;
  function keepAwake() { try { if (navigator.wakeLock && !wl) navigator.wakeLock.request('screen').then(function (l) { wl = l; l.addEventListener('release', function () { wl = null; }); }).catch(function () {}); } catch (e) {} }
  document.addEventListener('click', keepAwake);
  document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') { keepAwake(); if (!conn && code && !stopRetry) scheduleRetry(); } });

  // ---------- Arranque ----------
  if (SOLO) { var tvIcon = document.querySelector('#sInfo > div'); if (tvIcon) tvIcon.textContent = '🚀'; }
  I18N.apply();
  show('sJoin');
  // Si ya habíamos entrado antes en esta misma sala (p. ej. al recargar), reconectar solo
  if (q && store.get('nave.name') && store.get('nave.code') === q[1].toUpperCase() && sessionStorage.getItem('nave.joined') === q[1].toUpperCase()) {
    code = q[1].toUpperCase(); connect(false);
  }
  window.addEventListener('beforeunload', function () { if (joinedOnce && code) try { sessionStorage.setItem('nave.joined', code); } catch (e) {} });

  window.__phone = { get s() { return s; }, send: send, get screen() { return screen; }, pid: pid };
})();
