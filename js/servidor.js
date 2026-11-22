/* Servidor de la partida: lo usa la tele o el móvil que crea la sala.
   Lleva el juego, atiende a los móviles conectados y les envía su "foto" del estado. */
(function (root) {
  function NaveServer(game, opts) {
    opts = opts || {};
    this.game = game;
    this.conns = [];
    this.code = null;
    this.net = null;
    this.status = 'opening';          // opening | ready | lost | error
    this.onChange = opts.onChange || function () {};
    this.onStatus = opts.onStatus || function () {};
    this.onLang = opts.onLang || function (l) { I18N.set(l); I18N.apply(); };
    this.onStart = opts.onStart || function () {};
    var self = this, last = performance.now(), lastSend = 0;
    setInterval(function () {
      var now = performance.now();
      var dt = Math.min(0.25, (now - last) / 1000); last = now;
      if (game.phase !== 'lobby') game.tick(dt);
      if (now - lastSend >= 90) { lastSend = now; self.sendAll(); }
      var ms = Date.now();
      self.conns.slice().forEach(function (c) { if (!c.local && ms - c.last > 15000) { c.w.close(); self.drop(c); } });
    }, 40);
  }
  var P = NaveServer.prototype;

  P.setStatus = function (st) { this.status = st; this.onStatus(st); };

  // Abre la sala para que entren otros aparatos
  P.open = function (code) {
    var self = this;
    this.code = code;
    this.setStatus('opening');
    this.net = NET.host(code, {
      onReady: function () { self.setStatus('ready'); self.onChange(); },
      onLost: function () { self.setStatus('lost'); },
      onError: function (type) {
        if (type === 'taken') { self.net.stop(); self.open(NET.makeCode()); return; }
        self.setStatus('error');
      },
      onConn: function (w) { self.attach(w); }
    });
  };

  P.attach = function (w) {
    var self = this, c = { w: w, pid: null, last: Date.now(), local: false };
    this.conns.push(c);
    w.onData = function (m) { c.last = Date.now(); self.handle(c, m); };
    w.onClose = function () { self.drop(c); };
  };

  // Jugador en este mismo aparato (móvil que crea la sala): devuelve la función para enviarle mensajes
  P.local = function (onSnap) {
    var self = this;
    var c = { w: { send: function (o) { onSnap(JSON.parse(JSON.stringify(o))); }, close: function () {} }, pid: null, last: Infinity, local: true };
    this.conns.push(c);
    return function (m) { self.handle(c, m); };
  };

  P.drop = function (c) {
    var i = this.conns.indexOf(c);
    if (i < 0) return;
    this.conns.splice(i, 1);
    if (c.pid && !this.conns.some(function (o) { return o.pid === c.pid; })) this.game.leave(c.pid);
    this.onChange();
  };

  P.handle = function (c, m) {
    if (!m || typeof m !== 'object') return;
    var game = this.game, pid = c.pid, self = this;
    switch (m.t) {
      case 'hello':
        var id = String(m.pid || '').slice(0, 40);
        var r = game.join(id, m.name, m.color, m.lvl);
        if (game.players[id] && m.look && window.LOOKS) game.players[id].look = LOOKS.valid(m.look);
        if (r !== 'ok') { c.w.send({ t: 'err', e: r }); return; }
        c.pid = id;
        this.conns.slice().forEach(function (o) { if (o !== c && o.pid === c.pid) { o.pid = null; o.w.close(); } });
        c.w.send({ t: 'hi', pid: c.pid, code: this.code });
        this.onChange();
        break;
      case 'ping': break;
      case 'look': if (pid && game.players[pid] && window.LOOKS) { game.players[pid].look = LOOKS.valid(m.look); this.onChange(); } break;
      case 'lvl': if (pid && game.players[pid]) game.players[pid].level = Math.max(1, Math.min(999, parseInt(m.lvl, 10) || 1)); this.onChange(); break;
      case 'in': if (pid) game.setInput(pid, m.x, m.y); break;
      case 'act':
        if (!pid) return;
        if (m.a === 'use') game.use(pid);
        else if (m.a === 'freeze') game.freeze(pid);
        else if (m.a === 'report') game.report(pid);
        else if (m.a === 'sabotage' || m.a === 'lights') game.sabotage(pid, 'lights');
        else if (m.a === 'reactor') game.sabotage(pid, 'reactor');
        else if (m.a === 'vent') game.vent(pid);
        else if (m.a === 'ventNext') game.ventNext(pid);
        else if (m.a === 'ready') game.ready(pid);
        break;
      case 'done': if (pid) game.taskDone(pid, m.sid); break;
      case 'cancel': if (pid) game.taskCancel(pid); break;
      case 'vote': if (pid) game.vote(pid, m.v); break;
      case 'set':
        if (pid && pid === game.hostPid()) { game.setSettings(m.s); if (m.lang) this.onLang(m.lang); this.onChange(); }
        break;
      case 'start':
        if (pid && pid === game.hostPid() && game.start()) this.onStart();
        break;
      case 'lobby':
        if (pid && pid === game.hostPid() && game.phase === 'end') game.backToLobby();
        break;
    }
  };

  P.sendAll = function () {
    var game = this.game;
    this.conns.forEach(function (c) { if (c.pid) c.w.send(game.snapshot(c.pid)); });
  };

  P.humansCount = function () { return this.game.humans().length; };

  root.NaveServer = NaveServer;
})(window);
