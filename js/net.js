/* Conexión entre la tele y los móviles.
   - Normal: PeerJS (WebRTC). La tele registra "navefam-v1-<CÓDIGO>" en la centralita gratuita de PeerJS
     y los móviles se conectan directamente a ella. Sin el código no se puede entrar.
   - Pruebas: añadir ?local=1 a la dirección. Usa BroadcastChannel (pestañas del mismo navegador). */
(function (root) {
  var PREFIX = 'navefam-v1-';
  var LOCAL = /[?&]local=1/.test(location.search);
  var ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; // sin I ni O para no confundir

  function makeCode() {
    var s = '';
    for (var i = 0; i < 4; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return s;
  }
  function cleanCode(c) { return String(c || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); }

  // Envoltorio común de una conexión: { send(obj), close(), onData, onClose }
  function Wrap(sendFn, closeFn) {
    var w = { onData: function () {}, onClose: function () {}, closed: false };
    w.send = function (o) { if (!w.closed) { try { sendFn(o); } catch (e) {} } };
    w.close = function () { if (w.closed) return; w.closed = true; try { closeFn(); } catch (e) {} w.onClose(); };
    w._data = function (d) { if (!w.closed) w.onData(d); };
    w._closed = function () { if (w.closed) return; w.closed = true; w.onClose(); };
    return w;
  }

  // ---------------- TELE (anfitrión) ----------------
  function host(code, h) {
    if (LOCAL) return hostLocal(code, h);
    var peer = null, stopped = false;
    function open() {
      peer = new Peer(PREFIX + code, { debug: 1 });
      peer.on('open', function () { h.onReady(code); });
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
        if (err.type === 'unavailable-id') { h.onError('taken'); return; }
        if (err.type === 'peer-unavailable') return; // no afecta a la tele
        h.onLost && h.onLost();
        // reintento completo si la centralita no responde
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
    return { code: code, stop: function () { stopped = true; if (peer) peer.destroy(); } };
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
        w.onClose = function () {};
        conns[id] = w;
        ch.postMessage({ k: 'welcome', to: id });
        h.onConn(w);
      } else if (m.k === 'msg' && conns[m.from]) conns[m.from]._data(m.d);
      else if (m.k === 'bye' && conns[m.from]) { conns[m.from]._closed(); delete conns[m.from]; }
    };
    setTimeout(function () { h.onReady(code); }, 50);
    return { code: code, stop: function () { ch.close(); } };
  }

  // ---------------- MÓVIL ----------------
  // h: onOpen(conn), onError('notfound'|'network')
  function join(code, h) {
    if (LOCAL) return joinLocal(code, h);
    var peer = new Peer({ debug: 1 });
    var done = false;
    var timer = setTimeout(function () { if (!done) { done = true; h.onError('network'); try { peer.destroy(); } catch (e) {} } }, 15000);
    peer.on('open', function () {
      var c = peer.connect(PREFIX + code, { serialization: 'json', reliable: true });
      var w = Wrap(function (o) { c.send(o); }, function () { try { c.close(); } catch (e) {} setTimeout(function () { peer.destroy(); }, 100); });
      c.on('open', function () { if (done) return; done = true; clearTimeout(timer); h.onOpen(w); });
      c.on('data', function (d) { w._data(d); });
      c.on('close', function () { w._closed(); try { peer.destroy(); } catch (e) {} });
      c.on('error', function () { w._closed(); });
    });
    peer.on('error', function (err) {
      if (done) return;
      done = true; clearTimeout(timer);
      h.onError(err.type === 'peer-unavailable' ? 'notfound' : 'network');
      try { peer.destroy(); } catch (e) {}
    });
  }

  function joinLocal(code, h) {
    var ch = new BroadcastChannel('nave-' + code);
    var id = 'c' + Math.random().toString(36).slice(2, 9);
    var w = null;
    var t = setTimeout(function () { if (!w) { ch.close(); h.onError('notfound'); } }, 2000);
    ch.onmessage = function (ev) {
      var m = ev.data;
      if (m.to !== id) return;
      if (m.k === 'welcome' && !w) {
        clearTimeout(t);
        w = Wrap(function (o) { ch.postMessage({ k: 'msg', from: id, to: 'host', d: o }); },
                 function () { ch.postMessage({ k: 'bye', from: id, to: 'host' }); ch.close(); });
        h.onOpen(w);
      } else if (m.k === 'msg' && w) w._data(m.d);
      else if (m.k === 'bye' && w) { w._closed(); ch.close(); }
    };
    ch.postMessage({ k: 'hello', from: id, to: 'host' });
  }

  root.NET = { host: host, join: join, makeCode: makeCode, cleanCode: cleanCode, local: LOCAL };
})(window);
