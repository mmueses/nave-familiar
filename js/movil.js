/* Móvil: mando del jugador. Recibe "fotos" de la tele (o del juego local en modo solo) y envía movimientos y acciones. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var COLORS = NAVE_COLORS;
  var MAP = NAVE_MAP;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  function hexOf(c) { return COLORS[c] ? COLORS[c].hex : '#999'; }
  function vib(p) { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} }

  // Identidad del jugador (para reconectar tras recargar). Con &tab=1 cada pestaña es un jugador distinto (pruebas).
  var perTab = /[?&]tab=1/.test(location.search);
  var pid = perTab ? sessionStorage.getItem('nave.pid') : store.get('nave.pid');
  if (!pid) {
    pid = 'p' + Math.random().toString(36).slice(2, 10);
    if (perTab) sessionStorage.setItem('nave.pid', pid); else store.set('nave.pid', pid);
  }
  var myColor = parseInt(store.get('nave.color'), 10);
  if (isNaN(myColor)) myColor = Math.floor(Math.random() * COLORS.length);

  var SOLO = /[?&](solo|crear)=1/.test(location.search);   // este móvil crea la partida (y puede invitar a otros)
  var rejoining = false, lastAtSaved = 0;
  // Cuándo recibimos datos de una partida por última vez (con &tab=1, por pestaña, para las pruebas)
  var lastAt = {
    get: function () { try { return perTab ? sessionStorage.getItem('nave.lastAt') : store.get('nave.lastAt'); } catch (e) { return null; } },
    set: function (v) { try { if (perTab) sessionStorage.setItem('nave.lastAt', v); else store.set('nave.lastAt', v); } catch (e) {} }
  };
  var conn = null, code = null, lastData = 0, retryTimer = null, joinedOnce = false, stopRetry = false, connecting = false;
  var s = null;           // última foto recibida
  var screen = null;
  var uiKey = {};
  function changed(k, v) { if (uiKey[k] === v) return false; uiKey[k] = v; return true; }

  // ---------- Pantallas ----------
  var SCREENS = ['sJoin', 'sWait', 'sLobby', 'sIntro', 'sPlay', 'sMeeting', 'sInfo'];
  function show(id) {
    if (screen === id) return;
    screen = id;
    SCREENS.forEach(function (x) { $(x).classList.toggle('hidden', x !== id); });
    var el = $(id); el.classList.remove('enter'); if (id !== 'sPlay') { void el.offsetWidth; el.classList.add('enter'); }
    if (window.FONDO) { if (id === 'sPlay') FONDO.pause(); else FONDO.resume(); }
    if (id !== 'sPlay') { closePanel(); $('mapModal').classList.add('hidden'); resetJoy(); }
    if (id !== 'sMeeting') $('splash').classList.add('hidden');
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
    var n = $('name').value.trim();
    if (!n) { $('name').focus(); return; }
    store.set('nave.name', n);
    if (SOLO) { startSolo(); return; }
    var c = NET.cleanCode($('code').value);
    if (c.length !== 4) { $('joinErr').textContent = t('ph.notFound'); return; }
    if (conn || connecting) return;   // ya conectando (doble toque)
    rejoining = false;
    store.set('nave.code', c);
    code = c; stopRetry = false; joinedOnce = false;
    $('joinErr').textContent = '';
    connect(true);
  };

  // ---------- Conexión ----------
  function xpTotal() { return parseInt(store.get('nave.xp'), 10) || 0; }
  function myLevel() { return AJUSTES.levelInfo(xpTotal()).level; }
  function sendHello() { send({ t: 'hello', pid: pid, name: store.get('nave.name') || $('name').value, color: myColor, lvl: myLevel(), look: myLook() }); }
  function myLook() {
    var l = null;
    try { l = JSON.parse(store.get('nave.look') || 'null'); } catch (e) {}
    if (!l || typeof l !== 'object') l = {};
    if (!l.ch || !LOOKS.find('ch', l.ch)) {   // todos llevan un personaje; si no hay, uno al azar
      var all = LOOKS.LIST.ch; if (all.length) { l.ch = all[Math.floor(Math.random() * all.length)].id; store.set('nave.look', JSON.stringify(l)); }
    }
    return l;
  }
  function send(o) { if (conn) conn.send(o); }
  function connect(first) {
    if (connecting) return;
    connecting = true;
    wait(first ? t('ph.connecting') : t('ph.lost'));
    NET.join(code, {
      onStatus: function (st) { wait(st === 'server' ? t('ph.stServer') : t('ph.stRoom', { code: code })); },
      onOpen: function (w) {
        connecting = false;
        conn = w; lastData = Date.now();
        w.onData = onData;
        w.onClose = function () { if (conn === w) { conn = null; scheduleRetry(); } };
        sendHello();
      },
      onError: function (e) {
        connecting = false;
        if (rejoining && !joinedOnce) {   // la partida de antes ya no existe: pantalla de entrar normal, sin error
          rejoining = false; code = null; lastAt.set('0'); show('sJoin'); return;
        }
        if (first && !joinedOnce) {
          show('sJoin');
          $('joinErr').textContent = e === 'notfound' ? t('ph.notFound') : e === 'blocked' ? t('ph.errBlocked') : t('ph.errServer');
        } else scheduleRetry();
      }
    });
  }
  function scheduleRetry() {
    if (stopRetry || retryTimer || SOLO) return;
    wait(t('ph.lost'));
    retryTimer = setTimeout(function () { retryTimer = null; if (!conn) connect(false); }, 2000);
  }
  setInterval(function () {
    if (!conn || SOLO) return;
    send({ t: 'ping' });
    if (Date.now() - lastData > 10000) conn.close();
  }, 2000);

  function onData(m) {
    lastData = Date.now();
    if (!m) return;
    if (m.t === 'err') {
      stopRetry = true;
      if (rejoining && !joinedOnce) { rejoining = false; var c0 = conn; conn = null; if (c0) c0.close(); lastAt.set('0'); show('sJoin'); return; }
      var c = conn; conn = null; if (c) c.close();
      show('sJoin');
      $('joinErr').textContent = m.e === 'full' ? t('ph.full') : t('ph.inGame');
      return;
    }
    if (m.t === 'hi') { joinedOnce = true; rejoining = false; return; }
    if (m.t === 's') {
      if (!SOLO && Date.now() - lastAtSaved > 5000) { lastAtSaved = Date.now(); lastAt.set(String(lastAtSaved)); }
      onSnap(m);
    }
  }

  // ---------- Crear partida en este móvil: lleva el juego y abre una sala para invitar a otros ----------
  var soloStarted = false, server = null;
  function startSolo() {
    if (soloStarted) return;   // evita dos partidas a la vez si se toca dos veces
    soloStarted = true;
    var g = new NaveGame();
    g.setSettings(AJUSTES.load() || {});
    server = new NaveServer(g, {
      onChange: function () { uiKey.lobby = null; AJUSTES.save(g.settings); },
      onStatus: function () { uiKey.room = null; if (s && s.ph === 'lobby') renderRoom(); },
      onLang: function (l) { I18N.set(l); I18N.apply(); uiKey = {}; }
    });
    var toServer = server.local(function (snap) { onData(snap); });
    conn = { send: toServer, close: function () {} };
    joinedOnce = true;
    sendHello();
    server.open(NET.makeCode());
    window.__game = g; window.__server = server;
  }
  function renderRoom() {
    if (!server) return;
    $('roomBox').classList.remove('hidden');
    var key = server.code + server.status + I18N.lang;
    if (!changed('room', key)) return;
    $('roomCode').textContent = server.code || '····';
    var st = server.status;
    $('roomStatus').textContent = st === 'ready' ? t('ph.roomReady') : st === 'error' ? t('ph.roomError') : st === 'lost' ? t('ph.roomLost') : t('ph.roomOpening');
    $('roomStatus').className = 'roomStatus ' + st;
    var url = location.href.split('#')[0].split('?')[0].replace(/[^\/]*$/, '') + 'movil.html?sala=' + server.code + NET.testParams();
    try { var qr = qrcode(0, 'M'); qr.addData(url); qr.make(); $('roomQr').innerHTML = qr.createImgTag(4, 2); } catch (e) { $('roomQr').innerHTML = ''; }
  }

  // ---------- Recibir el estado ----------
  function onSnap(n) {
    s = n;
    if (n.map) MAP.use(n.map);
    if (n.lang && n.lang !== I18N.lang) { I18N.set(n.lang); I18N.apply(); uiKey = {}; }
    switch (n.ph) {
      case 'lobby': renderLobby(); break;
      case 'spectator': wait(t('ph.inGame')); break;
      case 'intro': renderIntro(); break;
      case 'play': renderPlay(); break;
      case 'meeting': renderMeeting(); break;
      case 'eject': renderEject(); break;
      case 'end': renderEnd(); break;
    }
  }

  // ---------- Sala de espera ----------
  var seenIds = null;
  function renderLobby() {
    show('sLobby');
    renderRoom();
    var me = s.me || { n: '', c: myColor };
    if (changed('lobby', JSON.stringify([s.players, s.host, s.settings, me, I18N.lang]))) {
      myColor = me.c;
      $('meAvatar').innerHTML = '';
      $('meAvatar').appendChild(DRAW.avatarCanvas(hexOf(me.c), 100, { look: me.k }));
      $('meName').textContent = me.n;
      var li = AJUSTES.levelInfo(xpTotal());
      $('meLevelTxt').textContent = t('xp.level', { n: li.level });
      $('meXp').style.width = Math.round(li.into / li.need * 100) + '%';
      var taken = s.players.filter(function (p) { return p.id !== pid; }).map(function (p) { return p.c; });
      buildSwatches($('sw2'), taken);
      var list = $('lobbyList'); list.innerHTML = '';
      s.players.forEach(function (p) {
        var d = document.createElement('div');
        if (seenIds && !seenIds[p.id]) d.className = 'jump';
        if (p.on === false) d.classList.add('off');
        seenIds = seenIds || {}; seenIds[p.id] = 1;
        d.appendChild(DRAW.avatarCanvas(hexOf(p.c), 52, { look: p.k }));
        var nm = document.createElement('span'); nm.textContent = p.n; d.appendChild(nm);
        var lv = document.createElement('span'); lv.className = 'lvl'; lv.textContent = t('xp.short', { n: p.l || 1 }); d.appendChild(lv);
        list.appendChild(d);
      });
      $('hostBox').classList.toggle('hidden', s.host !== pid);
      $('pTotalVal').textContent = s.settings.total;
      seg('pImp', s.settings.impostors); seg('pLang', s.lang); seg('pBot', s.settings.botLevel); seg('pMap', s.settings.map || 'nave');
      if (refreshSettings) refreshSettings();
      var maxI = NaveGame.maxImps(Math.max(s.settings.total, s.players.length));
      var ib = $('pImp').querySelectorAll('button');
      for (var k = 0; k < ib.length; k++) ib[k].disabled = +ib[k].getAttribute('data-v') > maxI;
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
  $('pMinus').onclick = function () { if (s && s.settings) send({ t: 'set', s: { total: s.settings.total - 1 } }); };
  $('pPlus').onclick = function () { if (s && s.settings) send({ t: 'set', s: { total: s.settings.total + 1 } }); };
  bindSeg('pImp', function (v) { send({ t: 'set', s: { impostors: +v } }); });
  bindSeg('pLang', function (v) { send({ t: 'set', s: {}, lang: v }); });
  bindSeg('pBot', function (v) { send({ t: 'set', s: { botLevel: v } }); });
  bindSeg('pMap', function (v) { send({ t: 'set', s: { map: v } }); });
  var refreshSettings = AJUSTES.build($('setPanel'), function () { return (s && s.settings) || NaveGame.defaultSettings(); }, function (ch) { send({ t: 'set', s: ch }); });
  // Armario: elegir sombrero, disfraz y efecto (se desbloquean por nivel)
  var lookTab = 'ch';
  function curLook() { return LOOKS.valid(myLook()); }
  function renderWardrobe() {
    var look = curLook(), lv = myLevel();
    $('lookPreview').innerHTML = '';
    $('lookPreview').appendChild(DRAW.avatarCanvas(hexOf(myColor), 120, { look: look }));
    seg('lookTabs', lookTab);
    var grid = $('lookGrid'); grid.innerHTML = '';
    LOOKS.LIST[lookTab].forEach(function (it) {
      var b = document.createElement('button'); b.className = 'lookItem' + (look[lookTab] === it.id ? ' on' : '');
      var trial = {}; for (var k in look) trial[k] = look[k]; trial[lookTab] = it.id;
      b.appendChild(DRAW.avatarCanvas(hexOf(myColor), 64, { look: trial }));
      var nm = document.createElement('span'); nm.textContent = lookTab === 'ch' ? LOOKS.chName(it.id, I18N.lang) : t('item.' + it.id); b.appendChild(nm);
      if (it.lv > lv) { b.disabled = true; var lk = document.createElement('i'); lk.textContent = t('look.locked', { n: it.lv }); b.appendChild(lk); }
      b.onclick = function () {
        var nl = curLook(); nl[lookTab] = it.id;
        store.set('nave.look', JSON.stringify(nl));
        send({ t: 'look', look: nl });
        uiKey.lobby = null;
        renderWardrobe();
        var pv = $('lookPreview'); pv.classList.remove('swap'); void pv.offsetWidth; pv.classList.add('swap');
      };
      grid.appendChild(b);
    });
  }
  bindSeg('lookTabs', function (v) { lookTab = v; renderWardrobe(); });
  $('btnLook').onclick = function () { renderWardrobe(); $('lookModal').classList.remove('hidden'); };
  $('lookClose').onclick = function () { $('lookModal').classList.add('hidden'); };
  $('btnSettings').onclick = function () { refreshSettings(); $('setModal').classList.remove('hidden'); };
  $('setClose').onclick = function () { $('setModal').classList.add('hidden'); };
  $('btnStart').onclick = function () { send({ t: 'start' }); };

  // ---------- Presentación del papel (secreto), con todos en fila ----------
  function renderIntro() {
    show('sIntro');
    if (!changed('intro', s.me.role + s.me.c + I18N.lang + JSON.stringify(s.lineup))) return;
    var imp = s.me.role === 'imp';
    // El papel solo se ve mientras se mantiene pulsado; el resto de la pantalla es igual para todos
    $('introRole').textContent = imp ? t('ph.imp') : t('ph.crew');
    $('introRole').style.color = imp ? '#ff4d4d' : '#6fd0ff';
    $('introSub').textContent = s.nImp === 1 ? t('tv.thereAre1') : t('tv.thereAreN', { n: s.nImp });
    $('introHint').textContent = imp ? t('ph.impHint') : t('ph.crewHint');
    if (imp && s.me.partners && s.me.partners.length) $('introHint').textContent += ' ' + t('ph.partner', { name: s.me.partners.join(', ') });
    $('introSecret').classList.add('hidden');
    drawLineup(imp);
    vib(120);   // igual para todos
  }
  // Mantener pulsado para ver algo secreto; al soltar se oculta
  function holdToShow(btn, onShow, onHide) {
    function on(e) { e.preventDefault(); try { btn.setPointerCapture(e.pointerId); } catch (x) {} onShow(); }
    function off() { onHide(); }
    btn.addEventListener('pointerdown', on);
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(function (ev) { btn.addEventListener(ev, off); });
    btn.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  }
  holdToShow($('introHold'), function () { $('introSecret').classList.remove('hidden'); }, function () { $('introSecret').classList.add('hidden'); });
  function drawLineup(imp) {
    var cv = $('lineupCv'), dpr = window.devicePixelRatio || 1;
    var W = Math.min(window.innerWidth * 0.92, 640), H = Math.min(window.innerHeight * 0.4, 220);
    cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px';
    var ctx = cv.getContext('2d'); ctx.scale(dpr, dpr);
    var list = s.lineup.slice();
    var meIdx = list.findIndex(function (x) { return x[2]; });
    var me = list.splice(meIdx, 1)[0];
    // los demás detrás, alternando a los lados; yo delante en el centro
    var order = [];
    list.forEach(function (x, i) { if (i % 2) order.push(x); else order.unshift(x); });
    var n = order.length, sc = Math.min(2.2, H / 66);
    order.forEach(function (x, i) {
      var off = i - (n - 1) / 2;
      var px = W / 2 + off * Math.min(70, W / (n + 2)) * (sc / 2);
      DRAW.character(ctx, px, H - 22 * sc - Math.abs(off) * 2, hexOf(x[0]), { scale: sc * 0.8, name: x[1], look: x[3] });
    });
    DRAW.character(ctx, W / 2, H - 17 * sc, hexOf(me[0]), { scale: sc, name: me[1], nameColor: '#ffe66b', look: me[3] });
  }

  // ---------- Partida ----------
  function stationName(sid) {
    var st = MAP.station(sid);
    return t(MAP.room(st.room).name) + ': ' + t(st.name);
  }
  function renderPlay() {
    show('sPlay');
    var me = s.me, imp = me.role === 'imp';
    var tk = JSON.stringify([me.tasks, s.prog, imp, I18N.lang]);
    if (changed('tasks', tk)) {
      var box = $('taskBox');
      box.innerHTML = '';
      var bar = document.createElement('div'); bar.className = 'bar';
      var fill = document.createElement('div'); fill.style.width = Math.round((s.prog || 0) * 100) + '%'; bar.appendChild(fill);
      if (s.prog !== null && s.prog !== undefined) box.appendChild(bar);
      var b = document.createElement('b'); b.textContent = t('ph.myTasks'); box.appendChild(b);
      me.tasks.forEach(function (x) {
        var d = document.createElement('div');
        if (x.length > 2) {   // tarea en varios pasos: «Sala A → Sala B: Nombre (1/2)»
          var a = MAP.station(x[0]), z = MAP.station(x[7]);
          d.textContent = (x[1] ? t(MAP.room(z.room).name) : t(MAP.room(a.room).name) + (x[3] < x[4] - 1 ? ' → ' + t(MAP.room(z.room).name) : '')) + ': ' + t('chain.' + x[5]) + ' (' + Math.min(x[4], x[3] + (x[1] ? 1 : 1)) + '/' + x[4] + ')';
        } else d.textContent = stationName(x[0]);
        if (x[1] && !imp) d.className = 'done';
        box.appendChild(d);
      });
    }
    if (changed('badge', me.ghost + I18N.lang)) {
      $('badge').className = 'rolebadge';
      $('badge').textContent = (me.ghost ? '👻 ' : '🤫 ') + t('ph.myRole');
    }
    if (!$('rolePeek').classList.contains('hidden')) fillPeek();
    $('phLights').classList.toggle('hidden', !(s.dark && !me.ghost));   // lo ven todos, también el impostor
    $('phReactor').classList.toggle('hidden', !s.reactor);
    if (s.reactor) $('phReactor').textContent = t('ph.reactor', { n: s.reactor });
    $('ghostMsg').classList.toggle('hidden', !me.ghost || !!panel);
    $('ventMsg').classList.toggle('hidden', !me.vent);
    // botones: todos ven USAR y AVISAR. Los del impostor solo aparecen cuando se pueden usar
    // (congelar con alguien cerca, rejilla encima de una) y los sabotajes están dentro del mapa.
    var bt = s.b || {}, inVent = !!me.vent, showImp = imp && !me.ghost;
    vis('bUse', !inVent); vis('bRep', !me.ghost && !inVent);
    $('bUse').disabled = !bt.use;
    $('bUse').textContent = bt.use === 'em' ? t('ph.meetingBtn') : t('ph.use');
    $('bRep').disabled = !bt.rep;
    vis('bFrz', showImp && !inVent && !!bt.frz);
    vis('bVent', showImp && !!bt.vent); vis('bNext', showImp && inVent);
    $('sabRow').classList.toggle('hidden', !showImp);
    if (showImp) {
      $('bLights').disabled = !bt.sabL; cd($('bLights'), bt.scd);
      $('bReactor').disabled = !bt.sabR; cd($('bReactor'), bt.scd);
      $('bVent').textContent = inVent ? t('ph.ventExit') : t('ph.vent');
    }
    // minijuego, cámaras o mapa
    if (me.busy && panelSid !== me.busy) openPanel(me.busy);
    else if (!me.busy && panel) closePanel();
    if (panel === 'cam') drawCams();
    if (panel === 'adm') drawAdmin();
  }
  function vis(id, v) { $(id).classList.toggle('hidden', !v); }
  function cd(btn, n) { var c = btn.querySelector('.cd'); c.classList.toggle('hidden', !n); c.textContent = n || ''; }
  function act(a) { send({ t: 'act', a: a }); vib(25); }
  $('bUse').onclick = function () { act('use'); };
  $('bRep').onclick = function () { act('report'); };
  $('bFrz').onclick = function () { act('freeze'); };
  $('bLights').onclick = function () { act('lights'); $('mapModal').classList.add('hidden'); };
  $('bReactor').onclick = function () { act('reactor'); $('mapModal').classList.add('hidden'); };
  // «Mi papel»: mantener pulsado para verlo (y, si eres impostor, cuánto falta para poder congelar)
  function fillPeek() {
    var me = s && s.me; if (!me) return;
    var imp = me.role === 'imp', bt = s.b || {};
    $('peekRole').textContent = (me.ghost ? '👻 ' : '') + (imp ? t('ph.imp') : t('ph.crew'));
    $('peekRole').style.color = imp ? '#ff4d4d' : '#6fd0ff';
    var h = imp ? t('ph.impHint') : t('ph.crewHint');
    if (imp && me.partners && me.partners.length) h += ' ' + t('ph.partner', { name: me.partners.join(', ') });
    if (imp && !me.ghost) h += '\n' + (bt.fcd ? t('ph.peekFrz', { n: bt.fcd }) : t('ph.peekFrzOk')) + '\n' + t('ph.peekSab');
    $('peekHint').textContent = h;
  }
  holdToShow($('badge'), function () { fillPeek(); $('rolePeek').classList.remove('hidden'); }, function () { $('rolePeek').classList.add('hidden'); });
  $('bVent').onclick = function () { act('vent'); };
  $('bNext').onclick = function () { act('ventNext'); };

  // Paneles: minijuego, cámaras, mapa de administración
  var panel = null, panelSid = null, mgClose = null;
  function openPanel(sid) {
    closePanel();
    var st = MAP.station(sid);
    panelSid = sid;
    resetJoy();
    if (st.type === 'cameras') { panel = 'cam'; $('camModal').classList.remove('hidden'); return; }
    if (st.type === 'admin') { panel = 'adm'; $('admModal').classList.remove('hidden'); return; }
    panel = 'mg';
    $('mgModal').classList.remove('hidden');
    var mg = st.type, extra = null;
    (s && s.me && s.me.tasks || []).forEach(function (x) {
      if (x[0] === sid && !x[1] && x.length > 2 && !extra) { mg = x[2]; var z = MAP.station(x[7]); extra = { code: x[6], room: z ? t(MAP.room(z.room).name) : '' }; }
    });
    mgClose = MG.open(mg, $('mgBox'), function () { send({ t: 'done', sid: sid }); closePanel(); }, extra);
  }
  function closePanel() {
    if (mgClose) mgClose();
    mgClose = null; panel = null; panelSid = null;
    ['mgModal', 'camModal', 'admModal'].forEach(function (id) { $(id).classList.add('hidden'); });
  }
  function cancelPanel() { send({ t: 'cancel' }); closePanel(); }
  $('mgClose').onclick = cancelPanel; $('camClose').onclick = cancelPanel; $('admClose').onclick = cancelPanel;

  // Mapa pequeño
  $('btnMap').onclick = function () { $('mapModal').classList.remove('hidden'); };
  $('mapClose').onclick = function () { $('mapModal').classList.add('hidden'); };

  // ---------- Joystick fijo (abajo a la izquierda) ----------
  var joy = { id: null, x: 0, y: 0 }, lastSent = { x: 0, y: 0, t: 0 }, keys = {};
  var zone = $('joyZone'), base = $('joyBase'), knob = $('knob');
  function joyMove(e) {
    var b = base.getBoundingClientRect(), cx = b.left + b.width / 2, cy = b.top + b.height / 2, R = b.width / 2 - 10;
    var dx = e.clientX - cx, dy = e.clientY - cy, m = Math.hypot(dx, dy);
    if (m > R) { dx = dx / m * R; dy = dy / m * R; }
    joy.x = dx / R; joy.y = dy / R;
    if (Math.hypot(joy.x, joy.y) < 0.18) joy.x = joy.y = 0;
    knob.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
  }
  zone.addEventListener('pointerdown', function (e) {
    if (joy.id !== null) return;
    joy.id = e.pointerId;
    try { zone.setPointerCapture(e.pointerId); } catch (er) {}
    base.classList.add('active');
    joyMove(e); e.preventDefault();
  });
  zone.addEventListener('pointermove', function (e) { if (e.pointerId === joy.id) joyMove(e); });
  function endJoy(e) { if (e.pointerId === joy.id) resetJoy(); }
  zone.addEventListener('pointerup', endJoy);
  zone.addEventListener('pointercancel', endJoy);
  function resetJoy() { joy.id = null; joy.x = joy.y = 0; knob.style.transform = 'translate(0,0)'; base.classList.remove('active'); }
  // teclado (para probar desde un ordenador)
  document.addEventListener('keydown', function (e) {
    var k = e.key.toLowerCase();
    keys[k] = true;
    if (screen === 'sPlay' && !panel) {
      if (k === 'e' || k === ' ') act('use');
      if (k === 'r') act('report');
      if (k === 'q') act('freeze');
      if (k === 'v') act('vent');
    }
  });
  document.addEventListener('keyup', function (e) { keys[e.key.toLowerCase()] = false; });
  function inputVec() {
    var x = joy.x, y = joy.y;
    if (keys.arrowleft || keys.a) x = -1; if (keys.arrowright || keys.d) x = 1;
    if (keys.arrowup || keys.w) y = -1; if (keys.arrowdown || keys.s) y = 1;
    if (panel || screen !== 'sPlay') x = y = 0;
    return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
  }
  setInterval(function () {
    if (!conn) return;
    var v = inputVec(), now = Date.now();
    if (v.x !== lastSent.x || v.y !== lastSent.y || ((v.x || v.y) && now - lastSent.t > 500)) {
      send({ t: 'in', x: v.x, y: v.y });
      lastSent = { x: v.x, y: v.y, t: now };
    }
  }, 50);

  // ---------- Dibujo de la partida ----------
  var cv = $('cv'), ctx = cv.getContext('2d');
  var shadeCv = document.createElement('canvas'), sctx = shadeCv.getContext('2d');
  var disp = {};
  var lastFrame = performance.now();
  function smooth(key, x, y, k) {
    var d = disp[key];
    if (!d || Math.hypot(d.x - x, d.y - y) > 140) { d = disp[key] = { x: x, y: y, walk: 0, dir: 1 }; }
    var ox = d.x;
    d.x += (x - d.x) * k; d.y += (y - d.y) * k;
    var moved = Math.hypot(x - d.x, y - d.y);
    if (moved > 0.8) { d.walk += 0.07; if (Math.abs(x - ox) > 0.2) d.dir = x > ox ? 1 : -1; } else d.walk = 0;
    return d;
  }
  function pendingStations() {
    if (!s || !s.me) return [];
    var hl = [];
    if (s.me.role === 'crew' && !s.me.ghost) s.me.tasks.forEach(function (x) { if (!x[1]) hl.push(x[0]); });
    if (s.dark && !s.me.ghost && s.me.role === 'crew') hl.push('lt');
    if (s.reactor && !s.me.ghost && s.me.role === 'crew') hl.push('rx');
    return hl;
  }
  function viewScale(W, H) { return Math.min(W, H) / 430; }
  function drawPlay(time, dt) {
    var dpr = window.devicePixelRatio || 1;
    var W = cv.clientWidth, H = cv.clientHeight;
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
    var k = 1 - Math.exp(-dt * 16);
    var me = smooth('me', s.me.x, s.me.y, k);
    var sc = viewScale(W, H) * dpr;
    var cx = cv.width / 2, cy = cv.height / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b1026'; ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.setTransform(sc, 0, 0, sc, cx - me.x * sc, cy - me.y * sc);
    DRAW.ship(ctx, { t: time, tr: t, highlight: pendingStations(), lightsOut: !!s.dark, reactor: !!s.reactor, res: sc });
    (s.bd || []).forEach(function (b) { DRAW.frozen(ctx, b[0], b[1], hexOf(b[2]), time, b[3]); });
    var seen = {};
    var others = (s.ps || []).map(function (p) {
      var key = p[3] + '#' + p[2];
      seen[key] = 1;
      return { p: p, d: smooth(key, p[0], p[1], k) };
    });
    for (var key in disp) if (key !== 'me' && !seen[key]) delete disp[key];
    // dibujar de arriba a abajo para que los de delante tapen a los de detrás
    var all = others.concat([{ me: true, d: me }]);
    all.sort(function (a, b) { return a.d.y - b.d.y; });
    all.forEach(function (o) {
      if (o.me) {
        if (s.me.vent) return;
        DRAW.character(ctx, me.x, me.y, hexOf(s.me.c), { name: s.me.n, ghost: s.me.ghost, walk: me.walk, dir: me.dir, nameColor: '#ffe66b', look: s.me.k, t: time });
      } else {
        var p = o.p;
        DRAW.character(ctx, o.d.x, o.d.y, hexOf(p[2]), { name: p[3], ghost: !!p[4], walk: o.d.walk, dir: o.d.dir, nameColor: '#fff', look: p[6], t: time });
      }
    });
    // Sombra: lo que no ves queda oscuro; las paredes tapan la vista
    if (!s.me.ghost) {
      if (shadeCv.width !== cv.width || shadeCv.height !== cv.height) { shadeCv.width = cv.width; shadeCv.height = cv.height; }
      sctx.globalCompositeOperation = 'source-over';
      sctx.clearRect(0, 0, shadeCv.width, shadeCv.height);
      sctx.fillStyle = s.dark ? 'rgba(4,6,18,0.9)' : 'rgba(4,6,18,0.62)';
      sctx.fillRect(0, 0, shadeCv.width, shadeCv.height);
      sctx.globalCompositeOperation = 'destination-out';
      var vr = s.vr || 190;
      var pts = DRAW.visibility(me.x, me.y, vr, 220);
      var g = sctx.createRadialGradient(cx, cy, vr * sc * 0.72, cx, cy, vr * sc);
      g.addColorStop(0, 'rgba(0,0,0,1)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      sctx.fillStyle = g;
      sctx.beginPath();
      for (var i = 0; i < pts.length; i += 2) {
        var sx = cx + (pts[i] - me.x) * sc, sy = cy + (pts[i + 1] - me.y) * sc;
        if (i === 0) sctx.moveTo(sx, sy); else sctx.lineTo(sx, sy);
      }
      sctx.closePath(); sctx.fill();
      sctx.globalCompositeOperation = 'source-over';
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(shadeCv, 0, 0);
    }
    if (s.reactor) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = 'rgba(255,0,0,' + (0.12 + 0.1 * Math.sin(time * 8)) + ')';
      ctx.fillRect(0, 0, cv.width, cv.height);
    }
  }
  function fitMap(canvas, ratio) {
    var dpr = window.devicePixelRatio || 1;
    var W = canvas.clientWidth, H = Math.min(W * ratio, window.innerHeight * 0.78);
    canvas.style.height = H + 'px';
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    var c = canvas.getContext('2d');
    var sc = Math.min(canvas.width / (MAP.w + 200), canvas.height / (MAP.h + 160));
    c.setTransform(sc, 0, 0, sc, (canvas.width - MAP.w * sc) / 2, (canvas.height - MAP.h * sc) / 2 + 10 * sc);
    return c;
  }
  // Mapa estilo Among Us: salas en azul semitransparente, "!" amarillas en las tareas pendientes
  function drawMini(time) {
    var c = $('miniCv'), dpr = window.devicePixelRatio || 1;
    var W = c.clientWidth, H = c.clientHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    var x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.clearRect(0, 0, c.width, c.height);
    var sc = Math.min(c.width / (MAP.w + 60), c.height / (MAP.h + 60));
    x.setTransform(sc, 0, 0, sc, (c.width - MAP.w * sc) / 2, (c.height - MAP.h * sc) / 2);
    x.fillStyle = 'rgba(40,60,255,0.72)'; x.strokeStyle = 'rgba(200,215,255,0.95)'; x.lineWidth = 4 / sc * dpr * 0.8;
    x.beginPath();
    MAP.rects.forEach(function (r) { x.rect(r.x, r.y, r.w, r.h); });
    x.fill();
    MAP.rects.forEach(function (r) { x.strokeRect(r.x, r.y, r.w, r.h); });
    x.fillStyle = 'rgba(40,60,255,0.72)';
    MAP.rects.forEach(function (r) { x.fillRect(r.x + 2, r.y + 2, r.w - 4, r.h - 4); });   // tapa las líneas interiores
    (MAP.holes || []).forEach(function (o) { x.clearRect(o.x, o.y, o.w, o.h); x.strokeRect(o.x, o.y, o.w, o.h); });
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.font = 'bold 26px system-ui, sans-serif'; x.lineWidth = 5; x.strokeStyle = 'rgba(0,0,30,0.6)';
    MAP.rooms.forEach(function (r) {
      var lb = t(r.name), cx = r.x + r.w / 2, cy = r.y + r.h / 2;
      x.strokeText(lb, cx, cy); x.fillStyle = '#ffffff'; x.fillText(lb, cx, cy);
    });
    var bounce = Math.sin(time * 5) * 4;
    pendingStations().forEach(function (sid) {
      var st = MAP.station(sid), urgent = sid === 'lt' || sid === 'rx';
      x.beginPath(); x.arc(st.x, st.y - 10 + bounce, 22, 0, Math.PI * 2);
      x.fillStyle = urgent ? '#ff4d4d' : '#f2d63a'; x.fill();
      x.lineWidth = 4; x.strokeStyle = '#5a4a00'; x.stroke();
      x.fillStyle = '#2a2200'; x.font = 'bold 30px system-ui, sans-serif'; x.fillText('!', st.x, st.y - 8 + bounce);
    });
    DRAW.character(x, s.me.x, s.me.y, hexOf(s.me.c), { scale: 1.8, look: s.me.k });
  }
  function drawAdmin() {
    var c = fitMap($('admCv'), 0.56);
    DRAW.ship(c, { t: performance.now() / 1000, tr: t, reactor: !!s.reactor, res: c.getTransform().a });
    c.fillStyle = 'rgba(10,20,40,0.45)'; c.fillRect(-100, -100, MAP.w + 200, MAP.h + 200);
    var counts = s.admin || {};
    MAP.rooms.forEach(function (r) {
      var n = counts[r.id] || 0, cx = r.x + r.w / 2, cy = r.y + r.h / 2 + 10;
      for (var i = 0; i < n; i++) {
        var px = cx + (i - (n - 1) / 2) * 30;
        c.beginPath(); c.arc(px, cy, 12, 0, Math.PI * 2); c.fillStyle = '#ffe66b'; c.fill();
        c.lineWidth = 3; c.strokeStyle = '#7a5a00'; c.stroke();
      }
    });
  }
  var camIdx = 0;
  function camRoomName(cam) { return cam.room === 'hall' ? t('ph.camHall') : (MAP.room(cam.room) ? t(MAP.room(cam.room).name) : ''); }
  $('camPrev').onclick = function () { camIdx = (camIdx + MAP.cameras.length - 1) % MAP.cameras.length; vib(15); };
  $('camNext').onclick = function () { camIdx = (camIdx + 1) % MAP.cameras.length; vib(15); };
  function drawCams() {
    var time = performance.now() / 1000, dpr = window.devicePixelRatio || 1;
    if (camIdx >= MAP.cameras.length) camIdx = 0;
    var cam = MAP.cameras[camIdx], c = $('camCv');
    var W = c.clientWidth, H = c.clientHeight;
    if (c.width !== Math.round(W * dpr) || c.height !== Math.round(H * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    var x = c.getContext('2d');
    x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#000'; x.fillRect(0, 0, c.width, c.height);
    var sc = Math.min(c.width / 680, c.height / 510);
    x.setTransform(sc, 0, 0, sc, c.width / 2 - cam.x * sc, c.height / 2 - cam.y * sc);
    DRAW.ship(x, { t: time, tr: t, lightsOut: !!s.dark, reactor: !!s.reactor, res: sc });
    var feed = (s.cams && s.cams[camIdx]) || { p: [], b: [] };
    feed.b.forEach(function (b) { DRAW.frozen(x, b[0], b[1], hexOf(b[2]), time, b[3]); });
    feed.p.forEach(function (p) { DRAW.character(x, p[0], p[1], hexOf(p[2]), { look: p[3], t: time, name: p[4] }); });
    // fuera del alcance de la cámara: más oscuro
    x.save(); x.beginPath(); x.rect(cam.x - 2000, cam.y - 2000, 4000, 4000);
    var poly = DRAW.visibility(cam.x, cam.y, 390, 160);
    x.moveTo(poly[0], poly[1]); for (var i = 2; i < poly.length; i += 2) x.lineTo(poly[i], poly[i + 1]); x.closePath();
    x.fillStyle = 'rgba(0,0,0,0.55)'; x.fill('evenodd'); x.restore();
    x.setTransform(1, 0, 0, 1, 0, 0);
    x.fillStyle = 'rgba(80,255,140,0.06)';
    for (var y = 0; y < c.height; y += 4) x.fillRect(0, y, c.width, 1);
    x.fillStyle = Math.sin(time * 4) > 0 ? '#ff3b3b' : '#6a1a1a'; x.beginPath(); x.arc(16 * dpr, 16 * dpr, 6 * dpr, 0, Math.PI * 2); x.fill();
    x.font = 'bold ' + (13 * dpr) + 'px system-ui, sans-serif'; x.fillStyle = '#fff'; x.textBaseline = 'middle'; x.fillText('REC', 28 * dpr, 16 * dpr);
    var n = feed.p.length + feed.b.length;
    $('camLabel').textContent = t('ph.camN', { n: camIdx + 1, m: MAP.cameras.length, room: camRoomName(cam) }) + (n ? '  ·  👀 ' + feed.p.length : '');
  }

  // Animación de expulsión (astronauta flotando en el espacio)
  var ejectAnim = null;
  function drawEject(time) {
    var c = $('ejectCv'), dpr = window.devicePixelRatio || 1;
    var W = c.clientWidth, H = c.clientHeight;
    if (c.width !== Math.round(W * dpr)) { c.width = Math.round(W * dpr); c.height = Math.round(H * dpr); }
    var x = c.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.fillStyle = '#05081a'; x.fillRect(0, 0, W, H);
    for (var i = 0; i < 90; i++) {
      var sx = (i * 97 - time * (40 + (i % 5) * 30)) % W; if (sx < 0) sx += W;
      x.fillStyle = 'rgba(255,255,255,' + (0.3 + (i % 4) * 0.2) + ')'; x.fillRect(sx, (i * 53) % H, 2, 2);
    }
    var a = ejectAnim;
    if (a && a.color !== null) {
      var p = Math.min(1, (performance.now() - a.t0) / 6500);
      x.save();
      x.translate(-60 + p * (W + 120), H * 0.45 + Math.sin(p * 6) * 12);
      x.rotate(p * Math.PI * 4);
      DRAW.character(x, 0, 0, hexOf(a.color), { scale: Math.min(3, H / 70), look: a.look });
      x.restore();
    }
  }

  function frame(ms) {
    var dt = Math.min(0.1, (ms - lastFrame) / 1000); lastFrame = ms;
    var time = ms / 1000;
    if (screen === 'sPlay' && s && s.ph === 'play' && s.me && s.me.x != null) {
      drawPlay(time, dt);
      if (!$('mapModal').classList.contains('hidden')) drawMini(time);
    }
    if (screen === 'sInfo' && ejectAnim) drawEject(time);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---------- Reunión ----------
  function rname(id) { return s.roster && s.roster[id] ? s.roster[id].n : '?'; }
  function rlook(id) { return s.roster && s.roster[id] ? s.roster[id].k : null; }
  function rcol(id) { return s.roster && s.roster[id] ? hexOf(s.roster[id].c) : '#999'; }
  // Frases de los bots en la reunión (bocadillos con su personaje)
  var talkKey = '';
  function renderTalk(box, talk, nameOf, lookOf, size) {
    talk = talk || [];
    var k = JSON.stringify(talk) + I18N.lang;
    if (k === talkKey) return;
    var isNew = talk.length > (box.childElementCount - 1);
    talkKey = k;
    box.classList.toggle('hidden', !talk.length);
    box.innerHTML = '';
    var h = document.createElement('div'); h.className = 'talkTitle'; h.textContent = t('talk.title'); box.appendChild(h);
    talk.forEach(function (e, i) {
      var row = document.createElement('div'); row.className = 'talkRow' + (isNew && i === talk.length - 1 ? ' pop' : '');
      var lk = lookOf(e[0]);
      row.appendChild(DRAW.avatarCanvas(lk[0], size, { look: lk[1] }));
      var b = document.createElement('div'); b.className = 'bubble';
      var n = document.createElement('b'); n.textContent = nameOf(e[0]) + ': '; b.appendChild(n);
      b.appendChild(document.createTextNode(NAVE_TALK(e, nameOf)));
      row.appendChild(b); box.appendChild(row);
    });
    box.scrollTop = box.scrollHeight;
  }
  function renderMeeting() {
    show('sMeeting');
    // aviso grande al empezar
    var splash = s.since < 2.5;
    $('splash').classList.toggle('hidden', !splash);
    if (splash && changed('splash', s.reason + s.caller + s.victim + I18N.lang)) {
      $('splashTitle').textContent = s.reason === 'report' ? t('sp.body') : t('sp.meeting');
      $('splash').className = 'splash ' + (s.reason === 'report' ? 'body' : 'meet');
      var art = $('splashArt'); art.innerHTML = '';
      art.appendChild(DRAW.avatarCanvas(rcol(s.caller), 130, { look: rlook(s.caller) }));
      if (s.reason === 'report' && s.victim) art.appendChild(DRAW.avatarCanvas(rcol(s.victim), 130, { frozen: true, look: rlook(s.victim) }));
      vib([200, 80, 200]);
    }
    $('mTimer').textContent = s.left + ' s';
    $('mReason').textContent = s.reason === 'report'
      ? t('tv.reportBy', { name: rname(s.caller), victim: rname(s.victim) })
      : t('tv.buttonBy', { name: rname(s.caller) });
    renderTalk($('phTalk'), s.talk, rname, function (id) { return [rcol(id), rlook(id)]; }, 34);
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
      b.appendChild(DRAW.avatarCanvas(rcol(p.id), 44, { frozen: !p.alive, look: rlook(p.id) }));
      var n = document.createElement('span'); n.style.flex = '1';
      n.textContent = rname(p.id) + (p.id === pid ? ' ★' : '') + '  · ' + t('xp.short', { n: (s.roster[p.id] && s.roster[p.id].l) || 1 });
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
    if (!ejectAnim || ejectAnim.res !== JSON.stringify(r)) ejectAnim = { res: JSON.stringify(r), t0: performance.now(), color: r.ejected ? s.roster[r.ejected].c : null, look: r.ejected ? s.roster[r.ejected].k : null };
    $('ejectCv').classList.remove('hidden');
    $('btnLobby').classList.add('hidden');
    $('xpBox').classList.add('hidden');
    $('infoIcon').textContent = '';
    $('infoTitle').textContent = '';
    var typed = s.since > 2;
    if (r.ejected) {
      $('infoText').textContent = t('tv.ejected', { name: rname(r.ejected) });
      $('infoSub').textContent = typed && r.confirm ? (r.wasImp ? t('tv.wasImp', { name: rname(r.ejected) }) : t('tv.wasNotImp', { name: rname(r.ejected) })) + ' ' + impsLeft(r.impsLeft) : '';
    } else {
      $('infoText').textContent = t('tv.noEject');
      $('infoSub').textContent = typed ? (r.tie ? t('tv.tie') : t('tv.skipped')) + (r.confirm ? ' ' + impsLeft(r.impsLeft) : '') : '';
    }
  }
  function impsLeft(n) { return n === 0 ? t('tv.impsLeft0') : (n === 1 ? t('tv.impsLeft1') : t('tv.impsLeftN', { n: n })); }
  function renderEnd() {
    show('sInfo');
    ejectAnim = null;
    $('ejectCv').classList.add('hidden');
    var r = s.res;
    $('infoIcon').textContent = s.iWon ? '🏆' : '🚀';
    $('infoTitle').textContent = s.iWon ? t('ph.win') : t('ph.lose');
    $('infoTitle').style.color = s.iWon ? '#30a46c' : '#ff6b6b';
    $('infoText').textContent = r.winner === 'crew' ? t('tv.crewWin') : (r.imps.length > 1 ? t('tv.impsWin') : t('tv.impWin'));
    $('infoSub').textContent = t({ tasks: 'tv.reasonTasks', ejected: 'tv.reasonEjected', frozen: 'tv.reasonFrozen', reactor: 'tv.reasonReactor' }[r.reason]) + ' ' +
      t('ph.impWas', { names: r.imps.map(rname).join(', ') });
    $('btnLobby').classList.toggle('hidden', s.host !== pid);
    awardXp();
    if (window.EFX && endFx !== s.res) { endFx = s.res; if (s.iWon) EFX.confetti(); else EFX.snow(); }
  }
  var endFx = null;
  // Experiencia al terminar la partida (se guarda en este móvil)
  function awardXp() {
    var st = s.stats || { tasks: 0, freezes: 0 };
    var key = (server ? 'H' + server.code : code) + ':' + s.gameNo + ':' + s.res.time;
    var gain = 20 + (s.iWon ? 30 : 0) + st.tasks * 4 + st.freezes * 6;
    var before = AJUSTES.levelInfo(xpTotal()).level;
    if (store.get('nave.lastXp') !== key) {
      store.set('nave.lastXp', key);
      store.set('nave.xp', String(xpTotal() + gain));
      store.set('nave.lastGain', String(gain));
      store.set('nave.lastBefore', String(before));
      send({ t: 'lvl', lvl: myLevel() });
    }
    var li = AJUSTES.levelInfo(xpTotal()), g2 = parseInt(store.get('nave.lastGain'), 10) || gain;
    var up = li.level > (parseInt(store.get('nave.lastBefore'), 10) || li.level);
    $('xpBox').classList.remove('hidden');
    $('xpGain').textContent = t('xp.gained', { n: g2 });
    $('xpLevel').textContent = up ? t('xp.levelUp', { n: li.level }) : t('xp.level', { n: li.level });
    $('xpLevel').className = up ? 'levelUp' : '';
    var pct = Math.round(li.into / li.need * 100) + '%';
    if ($('xpFill').dataset.done !== pct) { $('xpFill').dataset.done = pct; $('xpFill').style.width = '0%'; setTimeout(function () { $('xpFill').style.width = pct; }, 250); }
    $('xpNext').textContent = t('xp.next', { n: li.need - li.into, m: li.level + 1 });
  }
  $('btnLobby').onclick = function () { send({ t: 'lobby' }); };

  // ---------- Pantalla encendida ----------
  var wl = null;
  function keepAwake() { try { if (navigator.wakeLock && !wl) navigator.wakeLock.request('screen').then(function (l) { wl = l; l.addEventListener('release', function () { wl = null; }); }).catch(function () {}); } catch (e) {} }
  document.addEventListener('click', keepAwake);
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState !== 'visible') return;
    keepAwake();
    if (SOLO) return;
    // Al volver de otra app o de la pantalla apagada: si la conexión se quedó muda, reconectamos ya (sin esperar 10 s)
    if (conn && Date.now() - lastData > 3000) conn.close();
    else if (!conn && code && !stopRetry) { clearTimeout(retryTimer); retryTimer = null; connect(false); }
  });
  // El móvil que crea la partida la lleva dentro: avisamos antes de cerrarla o recargarla sin querer
  window.addEventListener('beforeunload', function (e) {
    if (SOLO && server && s && s.ph && s.ph !== 'lobby' && s.ph !== 'end' && server.humansCount() > 1) { e.preventDefault(); e.returnValue = ''; return ''; }
  });

  // ---------- Arranque ----------
  I18N.apply();
  show('sJoin');
  var recent = Date.now() - (parseInt(lastAt.get(), 10) || 0) < 10 * 60 * 1000;
  var lastCode = store.get('nave.code');
  if (!SOLO && store.get('nave.name') && lastCode && (q ? lastCode === q[1].toUpperCase() : true) &&
      ((q && sessionStorage.getItem('nave.joined') === lastCode) || recent)) {
    // Estaba en una partida hace menos de 10 minutos: volvemos solos a ella con el mismo jugador
    code = lastCode; rejoining = true; connect(true);
  }
  window.addEventListener('beforeunload', function () { if (joinedOnce && code) try { sessionStorage.setItem('nave.joined', code); } catch (e) {} });

  window.__phone = { get s() { return s; }, send: send, get screen() { return screen; }, pid: pid, act: act };
  if (window.FONDO) FONDO.start({ parade: false });
})();
