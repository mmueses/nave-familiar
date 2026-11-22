/* Conexión entre la pantalla que crea la sala (tele o móvil) y los móviles que entran.
   - Normal: PeerJS (WebRTC). El anfitrión registra "navefam-v1-<CÓDIGO>" en la centralita gratuita de PeerJS
     y los móviles se conectan directamente a él. Sin el código no se puede entrar.
   - Pruebas en un navegador: ?local=1 (BroadcastChannel entre pestañas).
   - Pruebas con centralita propia: ?peerhost=127.0.0.1&peerport=9000 */
(function (root) {
  var PREFIX = 'navefam-v1-';
  var Q = location.search;
  var LOCAL = /[?&]local=1/.test(Q);
  var ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I ni O para no confundir

  function param(name) { var m = Q.match(new RegExp('[?&]' + name + '=([^&]+)')); return m ? decodeURIComponent(m[1]) : null; }
  function peerOpts() {
    var o = { debug: 1, config: { iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'turn:eu-0.turn.peerjs.com:3478', username: 'peerjs', credential: 'peerjsp' },
      { urls: 'turn:us-0.turn.peerjs.com:3478', username: 'peerjs', credential: 'peerjsp' }
    ] } };
    var h = param('peerhost');
    if (h) { o.host = h; o.port = +(param('peerport') || 9000); o.path = '/'; o.secure = false; o.config = { iceServers: [] }; }
    return o;
  }
  function makeCode() {
    var s = '';
    for (var i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return s;
  }
  function cleanCode(c) { return String(c || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); }
  // Parámetros de prueba que hay que conservar en los enlaces (QR, etc.)
  function testParams() {
    var out = [];
    ['local', 'peerhost', 'peerport'].forEach(function (k) { var v = param(k); if (v) out.push(k + '=' + encodeURIComponent(v)); });
    return out.length ? '&' + out.join('&') : '';
  }

  function Wrap(sendFn, closeFn) {
    var w = { onData: function () {}, onClose: function () {}, closed: false };
    w.send = function (o) { if (!w.closed) { try { sendFn(o); } catch (e) {} } };
    w.close = function () { if (w.closed) return; w.closed = true; try { closeFn(); } catch (e) {} w.onClose(); };
    w._data = function (d) { if (!w.closed) w.onData(d); };
    w._closed = function () { if (w.closed) return; w.closed = true; w.onClose(); };
    return w;
  }

  // ---------------- ANFITRIÓN por PeerJS ----------------
  // h: onReady(code), onConn(w), onError('taken'|'server'), onLost()
  function peerHost(code, h) {
    if (typeof Peer === 'undefined') { setTimeout(function () { h.onError('server'); }, 10); return { code: code, stop: function () {} }; }
    var peer = null, stopped = false, ready = false;
    var firstTimer = setTimeout(function () { if (!ready && !stopped) h.onError('server'); }, 12000);
    function open() {
      peer = new Peer(PREFIX + code, peerOpts());
      peer.on('open', function () { ready = true; clearTimeout(firstTimer); h.onReady(code); });
      peer.on('connection', function (c) {
        var w = Wrap(function (o) { c.send(o); }, function () { c.close(); });
        c.on('data', function (d) { w._data(d); });
        c.on('close', function () { w._closed(); });
        c.on('error', function () { w._closed(); });
        if (c.open) h.onConn(w); else c.on('open', function () { h.onConn(w); });
      });
      peer.on('disconnected', function () {
        if (stopped) return;
        h.onLost && h.onLost();
        setTimeout(function () { if (!stopped && peer && !peer.destroyed) try { peer.reconnect(); } catch (e) {} }, 2000);
      });
      peer.on('error', function (err) {
        if (stopped) return;
        if (err.type === 'unavailable-id') { clearTimeout(firstTimer); h.onError('taken'); return; }
        if (err.type === 'peer-unavailable') return;
        h.onLost && h.onLost();
        if (['network', 'server-error', 'socket-error', 'socket-closed'].indexOf(err.type) >= 0) {
          setTimeout(function () {
            if (stopped) return;
            if (peer && !peer.destroyed && peer.disconnected) { try { peer.reconnect(); } catch (e) {} }
            else if (!peer || peer.destroyed) open();
          }, 3000);
        }
      });
    }
    open();
    return { code: code, stop: function () { stopped = true; clearTimeout(firstTimer); if (peer) peer.destroy(); } };
  }

  function hostLocal(code, h) {
    var ch = new BroadcastChannel('nave-' + code);
    var conns = {};
    ch.onmessage = function (ev) {
      var m = ev.data;
      if (m.to !== 'host') return;
      if (m.k === 'hello') {
        if (conns[m.from]) conns[m.from]._closed();
        var id = m.from;
        var w = Wrap(function (o) { ch.postMessage({ k: 'msg', to: id, d: o }); },
                     function () { ch.postMessage({ k: 'bye', to: id }); });
        conns[id] = w;
        ch.postMessage({ k: 'welcome', to: id });
        h.onConn(w);
      } else if (m.k === 'msg' && conns[m.from]) conns[m.from]._data(m.d);
      else if (m.k === 'bye' && conns[m.from]) { conns[m.from]._closed(); delete conns[m.from]; }
    };
    setTimeout(function () { h.onReady(code); }, 50);
    return { code: code, stop: function () { ch.close(); } };
  }

  // ---------------- MÓVIL QUE ENTRA por PeerJS ----------------
  // h: onStatus('server'|'room'), onOpen(conn), onError('server'|'notfound'|'blocked'). Devuelve { cancel }
  function peerJoin(code, h) {
    if (typeof Peer === 'undefined') { setTimeout(function () { h.onError('server'); }, 10); return { cancel: function () {} }; }
    var done = false, peer;
    function fail(type) { if (done) return; done = true; clearTimeout(timer); h.onError(type); try { peer.destroy(); } catch (e) {} }
    h.onStatus && h.onStatus('server');
    var timer = setTimeout(function () { fail('server'); }, 12000);
    peer = new Peer(peerOpts());
    peer.on('open', function () {
      if (done) return;
      clearTimeout(timer);
      h.onStatus && h.onStatus('room');
      // si la sala existe pero no llega a abrirse el canal, es que la red bloquea la conexión directa
      timer = setTimeout(function () { fail('blocked'); }, 15000);
      var c = peer.connect(PREFIX + code, { serialization: 'json', reliable: true });
      var w = Wrap(function (o) { c.send(o); }, function () { try { c.close(); } catch (e) {} setTimeout(function () { try { peer.destroy(); } catch (e) {} }, 100); });
      c.on('open', function () { if (done) return; done = true; clearTimeout(timer); h.onOpen(w); });
      c.on('data', function (d) { w._data(d); });
      c.on('close', function () { w._closed(); try { peer.destroy(); } catch (e) {} });
      c.on('error', function () { w._closed(); });
    });
    peer.on('error', function (err) {
      if (err.type === 'peer-unavailable') fail('notfound');
      else if (!done) fail(err.type === 'webrtc' || err.type === 'negotiation-failed' ? 'blocked' : 'server');
    });
    return { cancel: function () { if (done) return; done = true; clearTimeout(timer); try { peer.destroy(); } catch (e) {} } };
  }


  // ---------------- Respaldo: Trystero (Nostr y WebTorrent) ----------------
  // Los móviles se encuentran a través de servidores públicos de Nostr o de WebTorrent (hay muchos;
  // basta con que funcione uno). Después la partida va directa de móvil a móvil, cifrada.
  // En la sala solo hay un anfitrión: avisa con {k:'host'} a cada uno que llega; el que entra contesta {k:'join'}.
  var APP = 'mmueses.github.io/nave-familiar';
  function tryCfg(kind, code) {
    var cfg = { appId: APP, identity: 'none', password: 'tso-' + code,
      rtcConfig: { iceServers: peerOpts().config.iceServers } };
    var urls = param(kind === 'nostr' ? 'nostrurl' : 'trkurl');   // pruebas con servidores propios
    if (urls) cfg.relayConfig = { urls: urls.split(','), redundancy: urls.split(',').length };
    return cfg;
  }
  function tryOk(kind) { return !!(root.TRY && root.TRY[kind]); }
  function openSockets(kind) {
    try { var s = root.TRY[kind].sockets(), n = 0; for (var k in s) if (s[k] && s[k].readyState === 1) n++; return n; } catch (e) { return 0; }
  }
  function tryHost(kind, code, h) {
    if (!tryOk(kind)) { setTimeout(function () { h.onError('server'); }, 10); return { stop: function () {} }; }
    var room, act, peers = {}, stopped = false, ready = false;
    try { room = root.TRY[kind].joinRoom(tryCfg(kind, code), 'sala-' + code); act = room.makeAction('m'); }
    catch (e) { setTimeout(function () { h.onError('server'); }, 10); return { stop: function () {} }; }
    function sendTo(pid, o) { try { act.send(o, { target: pid }); } catch (e) {} }
    var hello = {};
    room.onPeerJoin(function (c) {
      var pid = c.peerId, n = 0;
      // insistimos unas veces por si el primer aviso se pierde mientras se abre el canal
      hello[pid] = setInterval(function () { if (peers[pid] || ++n > 6) { clearInterval(hello[pid]); return; } sendTo(pid, { k: 'host' }); }, 1500);
      sendTo(pid, { k: 'host' });
    });
    act.onMessage(function (m, c) {
      var pid = c.peerId;
      if (!m || typeof m !== 'object') return;
      if (m.k === 'join') {
        if (peers[pid]) peers[pid]._closed();
        var w = Wrap(function (o) { sendTo(pid, { k: 'd', d: o }); }, function () { sendTo(pid, { k: 'bye' }); delete peers[pid]; });
        peers[pid] = w;
        h.onConn(w);
      } else if (m.k === 'd' && peers[pid]) peers[pid]._data(m.d);
      else if (m.k === 'bye' && peers[pid]) { peers[pid]._closed(); delete peers[pid]; }
    });
    room.onPeerLeave(function (c) { clearInterval(hello[c.peerId]); if (peers[c.peerId]) { peers[c.peerId]._closed(); delete peers[c.peerId]; } });
    // ¿llegamos a algún servidor público?
    var tries = 0;
    var poll = setInterval(function () {
      if (stopped) return;
      var ok = openSockets(kind) > 0;
      if (ok && !ready) { ready = true; h.onReady(code); }
      else if (!ok && ready) { ready = false; h.onLost && h.onLost(); }
      else if (!ok && !ready && ++tries === 8) h.onError('server');
    }, 1500);
    return { stop: function () { stopped = true; clearInterval(poll); for (var k in hello) clearInterval(hello[k]); try { room.leave(); } catch (e) {} } };
  }
  function tryJoin(kind, code, h) {
    if (!tryOk(kind)) { setTimeout(function () { h.onError('server'); }, 10); return { cancel: function () {} }; }
    var room, act, hostId = null, w = null, done = false, saidRoom = false;
    try { room = root.TRY[kind].joinRoom(tryCfg(kind, code), 'sala-' + code); act = room.makeAction('m'); }
    catch (e) { setTimeout(function () { h.onError('server'); }, 10); return { cancel: function () {} }; }
    function leave() { setTimeout(function () { try { room.leave(); } catch (e) {} }, 200); }
    var poll = setInterval(function () { if (!saidRoom && openSockets(kind) > 0) { saidRoom = true; h.onStatus && h.onStatus('room'); } }, 700);
    act.onMessage(function (m, c) {
      if (!m || typeof m !== 'object') return;
      if (m.k === 'host') {
        if (done) { if (c.peerId === hostId) try { act.send({ k: 'join' }, { target: hostId }); } catch (e) {} return; }
        done = true; hostId = c.peerId; clearInterval(poll);
        try { act.send({ k: 'join' }, { target: hostId }); } catch (e) {}
        w = Wrap(function (o) { act.send({ k: 'd', d: o }, { target: hostId }); }, function () { try { act.send({ k: 'bye' }, { target: hostId }); } catch (e) {} leave(); });
        h.onOpen(w);
      } else if (c.peerId === hostId && w) {
        if (m.k === 'd') w._data(m.d);
        else if (m.k === 'bye') { w._closed(); leave(); }
      }
    });
    room.onPeerLeave(function (c) { if (c.peerId === hostId && w) { w._closed(); leave(); } });
    return { cancel: function () { if (done) return; done = true; clearInterval(poll); leave(); } };
  }


  // ---------------- Rebote por MQTT (sin conexión directa) ----------------
  function brokers() { var u = param('mqtturl'); return u ? u.split(',') : (root.REBOTE ? REBOTE.BROKERS : []); }
  function mqttHost(code, h) {
    if (!root.REBOTE || !root.crypto || !crypto.subtle) { setTimeout(function () { h.onError('server'); }, 10); return { stop: function () {} }; }
    var stopped = false, clis = [], peers = {}, K = null, ready = false, fails = 0;
    function status() {
      var any = clis.some(function (c) { return c.ok; });
      if (any && !ready) { ready = true; h.onReady(code); }
      else if (!any && ready) { ready = false; h.onLost && h.onLost(); }
    }
    function connect(url) {
      if (stopped) return;
      var cli = new REBOTE.Client(url, {
        open: function () { cli.sub(K.base + '/h'); status(); },
        msg: function (topic, bytes) {
          REBOTE.open(K.key, bytes).then(function (m) {
            if (!m || typeof m.from !== 'string') return;
            var cid = m.from.slice(0, 20), p = peers[cid];
            if (m.k === 'join') {
              if (p && !p.w.closed && p.cli !== cli) return;    // ya entró por otro servidor
              if (!p || p.w.closed) {
                var send = REBOTE.Sender(cli, K.base + '/c/' + cid, K.key);
                var w = Wrap(function (o) { send({ k: 'd', d: o }); }, function () { send({ k: 'bye' }); delete peers[cid]; });
                p = peers[cid] = { w: w, cli: cli, send: send };
                h.onConn(w);
              }
              p.send({ k: 'host' });
            } else if (p && p.cli === cli) {
              if (m.k === 'd') p.w._data(m.d);
              else if (m.k === 'bye') { p.w._closed(); delete peers[cid]; }
            }
          }).catch(function () {});
        },
        close: function () {
          clis = clis.filter(function (c) { return c !== cli; }); status();
          for (var id in peers) if (peers[id].cli === cli) { peers[id].w._closed(); delete peers[id]; }
          if (!stopped) { if (++fails >= brokers().length && !ready) h.onError('server'); setTimeout(function () { connect(url); }, 5000); }
        }
      });
      clis.push(cli);
    }
    REBOTE.keys(APP, code).then(function (k) { K = k; brokers().forEach(connect); }).catch(function () { h.onError('server'); });
    return { stop: function () { stopped = true; clis.slice().forEach(function (c) { c.close(); }); } };
  }
  function mqttJoin(code, h) {
    if (!root.REBOTE || !root.crypto || !crypto.subtle) { setTimeout(function () { h.onError('server'); }, 10); return { cancel: function () {} }; }
    var cid = 'c' + Math.random().toString(36).slice(2, 12), clis = [], K = null, done = false, w = null, chosen = null, timer = null, gone = 0;
    function closeOthers() { clis.forEach(function (c) { if (c !== chosen) c.close(); }); }
    REBOTE.keys(APP, code).then(function (k) {
      K = k;
      brokers().forEach(function (url) {
        var send = null;
        var cli = new REBOTE.Client(url, {
          open: function () {
            cli.sub(K.base + '/c/' + cid);
            send = REBOTE.Sender(cli, K.base + '/h', K.key);
            cli.send = send;
            h.onDiag && h.onDiag('srvOk');
            if (!done) send({ from: cid, k: 'join' });
          },
          msg: function (topic, bytes) {
            REBOTE.open(K.key, bytes).then(function (m) {
              if (!m) return;
              if (m.k === 'host' && !done) {
                done = true; chosen = cli; clearInterval(timer); closeOthers();
                w = Wrap(function (o) { send({ from: cid, k: 'd', d: o }); }, function () { send({ from: cid, k: 'bye' }); setTimeout(function () { cli.close(); }, 300); });
                h.onOpen(w);
              } else if (cli === chosen && w) {
                if (m.k === 'd') w._data(m.d);
                else if (m.k === 'bye') { w._closed(); cli.close(); }
              }
            }).catch(function () {});
          },
          close: function () {
            if (cli === chosen && w) w._closed();
            if (!done && ++gone >= brokers().length) h.onError('server');
          }
        });
        clis.push(cli);
      });
      // insistimos con «quiero entrar» por si el anfitrión aún no estaba escuchando
      timer = setInterval(function () { if (done) return; clis.forEach(function (c) { if (c.ok && c.send) c.send({ from: cid, k: 'join' }); }); }, 1500);
    }).catch(function () { h.onError('server'); });
    return { cancel: function () { if (done) return; done = true; clearInterval(timer); clis.forEach(function (c) { c.close(); }); } };
  }

  // ---------------- Todos los caminos a la vez ----------------
  // ?via=peer,nostr,torrent para elegir caminos (pruebas). Por defecto, los tres.
  function vias() {
    var v = param('via');
    return v ? v.split(',') : ['peer', 'nostr', 'torrent', 'mqtt'];
  }
  function host(code, h) {
    if (LOCAL) return hostLocal(code, h);
    var list = vias(), st = {}, nets = [], stopped = false;
    function recompute() {
      var any = list.some(function (k) { return st[k] === 'ready'; });
      if (any) { if (!recompute.was) { recompute.was = true; h.onReady(code); } return; }
      if (recompute.was) { recompute.was = false; h.onLost && h.onLost(); }
      if (list.every(function (k) { return st[k] === 'error'; })) h.onError('server');
    }
    list.forEach(function (k) {
      var hh = {
        onReady: function () { st[k] = 'ready'; recompute(); },
        onLost: function () { st[k] = 'lost'; recompute(); },
        onError: function (type) {
          if (stopped) return;
          if (type === 'taken') { stopped = true; nets.forEach(function (n) { n.stop(); }); h.onError('taken'); return; }
          st[k] = 'error'; recompute();
        },
        onConn: function (w) { h.onConn(w); }
      };
      nets.push(k === 'peer' ? peerHost(code, hh) : k === 'mqtt' ? mqttHost(code, hh) : tryHost(k, code, hh));
    });
    return { code: code, vias: st, stop: function () { stopped = true; nets.forEach(function (n) { n.stop(); }); } };
  }
  // Diagnóstico por camino: srv (buscando servidores) · srvOk (servidores bien, buscando la sala) · ok
  //   noRoom (la sala no existe) · noDirect (sala encontrada, sin conexión directa) · noHost (sin respuesta del anfitrión) · noSrv
  function join(code, h) {
    if (LOCAL) return joinLocal(code, h);
    var list = vias(), errs = {}, tries = {}, done = false, saidRoom = false, diag = {};
    list.forEach(function (k) { diag[k] = 'srv'; });
    function setDiag(k, v) { if (diag[k] === 'ok') return; diag[k] = v; h.onDiag && h.onDiag(diag); }
    h.onStatus && h.onStatus('server');
    h.onDiag && h.onDiag(diag);
    var timer = setTimeout(function () {
      list.forEach(function (k) { if (diag[k] === 'srvOk' || diag[k] === 'srv') setDiag(k, diag[k] === 'srvOk' ? 'noHost' : 'noSrv'); });
      finish(errs.peer === 'blocked' ? 'blocked' : (errs.peer === 'notfound' || saidRoom ? 'notfound' : 'server'));
    }, 25000);
    function finish(type) {
      if (done) return; done = true; clearTimeout(timer); clearTimeout(mqttLater);
      for (var k in tries) tries[k].cancel();
      h.onError(type, diag);
    }
    function start(k) {
      if (done || tries[k]) return;
      var hh = {
        onStatus: function (st) {
          if (st === 'room') { setDiag(k, 'srvOk'); if (!saidRoom) { saidRoom = true; h.onStatus && h.onStatus('room'); } }
        },
        onDiag: function (v) { if (v === 'srvOk' && !saidRoom) { saidRoom = true; h.onStatus && h.onStatus('room'); } setDiag(k, v); },
        onOpen: function (w) {
          if (done) { w.close(); return; }
          done = true; clearTimeout(timer); clearTimeout(mqttLater);
          diag[k] = 'ok';
          for (var x in tries) if (x !== k) tries[x].cancel();
          h.onVia && h.onVia(k);
          h.onOpen(w);
        },
        onError: function (type) {
          errs[k] = type;
          setDiag(k, type === 'notfound' ? 'noRoom' : type === 'blocked' ? 'noDirect' : 'noSrv');
          if (done) return;
          // un camino que falla no basta: los otros aún pueden encontrar la sala
          if (list.every(function (x) { return errs[x]; })) finish(errs.peer === 'blocked' ? 'blocked' : (errs.peer || type));
        }
      };
      tries[k] = k === 'peer' ? peerJoin(code, hh) : k === 'mqtt' ? mqttJoin(code, hh) : tryJoin(k, code, hh);
    }
    // los caminos directos primero; el rebote (más lento en partida) solo si a los 4 s no ha conectado ninguno
    list.forEach(function (k) { if (k !== 'mqtt') start(k); });
    var mqttLater = list.indexOf('mqtt') >= 0 ? setTimeout(function () { start('mqtt'); }, list.length === 1 ? 0 : 4000) : 0;
  }

  function joinLocal(code, h) {
    var ch = new BroadcastChannel('nave-' + code);
    var id = 'c' + Math.random().toString(36).slice(2, 9);
    var w = null;
    h.onStatus && h.onStatus('room');
    var tm = setTimeout(function () { if (!w) { ch.close(); h.onError('notfound'); } }, 2000);
    ch.onmessage = function (ev) {
      var m = ev.data;
      if (m.to !== id) return;
      if (m.k === 'welcome' && !w) {
        clearTimeout(tm);
        w = Wrap(function (o) { ch.postMessage({ k: 'msg', from: id, to: 'host', d: o }); },
                 function () { ch.postMessage({ k: 'bye', from: id, to: 'host' }); ch.close(); });
        h.onOpen(w);
      } else if (m.k === 'msg' && w) w._data(m.d);
      else if (m.k === 'bye' && w) { w._closed(); ch.close(); }
    };
    ch.postMessage({ k: 'hello', from: id, to: 'host' });
  }

  root.NET = { host: host, join: join, makeCode: makeCode, cleanCode: cleanCode, local: LOCAL, testParams: testParams };
})(window);
