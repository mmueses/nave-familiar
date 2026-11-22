/* Lógica de la partida. Se ejecuta en la tele (que hace de servidor) o en el propio móvil (modo solo).
   No toca la pantalla: la tele la dibuja y los móviles reciben "fotos" (snapshots) del estado. */
(function (root) {
  var MAP = root.NAVE_MAP || require('./map.js');

  var COLORS = [
    { id: 'red', hex: '#e5484d' }, { id: 'blue', hex: '#3e7bfa' }, { id: 'green', hex: '#30a46c' },
    { id: 'pink', hex: '#f76bb5' }, { id: 'orange', hex: '#f5a524' }, { id: 'yellow', hex: '#f2d63a' },
    { id: 'purple', hex: '#8e4ec6' }, { id: 'cyan', hex: '#2ec5ce' }, { id: 'white', hex: '#e8e8ee' },
    { id: 'lime', hex: '#99d52a' }
  ];
  var BOT_NAMES = ['Robi', 'Luna', 'Chispa', 'Nube', 'Pixel', 'Cometa', 'Tornillo', 'Estrella', 'Bolita', 'Rayo'];

  var CFG = {
    speed: 190, radius: 10,
    useRange: 48, freezeRange: 55, reportRange: 85, ventRange: 42,
    vision: 190, visionDark: 80, impVision: 230, ghostVision: 300, camRange: 190,
    freezeCd: 25, freezeCdStart: 15, sabCd: 40, sabCdStart: 20, meetingCdStart: 12,
    reactorTime: 45,
    splashTime: 2.5, discussTime: 30, voteTime: 35, ejectTime: 8, introTime: 6,
    tasksPerPlayer: 5, maxHumans: 8, maxTotal: 10,
    botTakeover: 15 // segundos desconectado antes de que un bot mueva a ese jugador
  };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function Game() {
    this.players = {};
    this.order = [];
    this.phase = 'lobby';
    this.settings = { total: 8, impostors: 1, botLevel: 'easy' };
    this.now = 0;
    this.bodies = [];
    this.lightsOut = false;
    this.lightsAt = 0;
    this.reactorAt = 0;      // 0 = sin sabotaje del reactor; si no, momento en que se sobrecalienta
    this.reactorStart = 0;
    this.meeting = null;
    this.ejectRes = null;
    this.endRes = null;
    this.onEvent = function () {};
    this.botCount = 0;
  }
  var G = Game.prototype;

  // ---------- Sala de espera ----------
  G.humans = function () {
    var self = this;
    return this.order.map(function (id) { return self.players[id]; }).filter(function (p) { return p && !p.bot; });
  };
  G.list = function () {
    var self = this;
    return this.order.map(function (id) { return self.players[id]; }).filter(Boolean);
  };
  G.hostPid = function () {
    var h = this.humans().filter(function (p) { return p.connected; });
    return h.length ? h[0].id : null;
  };
  G.colorTaken = function (c, exceptId) {
    for (var id in this.players) if (id !== exceptId && this.players[id].color === c) return true;
    return false;
  };
  G.freeColor = function (exceptId) {
    for (var c = 0; c < COLORS.length; c++) if (!this.colorTaken(c, exceptId)) return c;
    return 0;
  };

  // Devuelve 'ok' | 'full' | 'inGame'
  G.join = function (pid, name, color) {
    var p = this.players[pid];
    name = String(name || '').trim().slice(0, 12) || ('Jugador' + (this.humans().length + 1));
    if (p) {
      p.connected = true;
      p.discAt = 0;
      if (this.phase === 'lobby') {
        p.name = name;
        if (typeof color === 'number' && color >= 0 && color < COLORS.length && !this.colorTaken(color, pid)) p.color = color;
      }
      return 'ok';
    }
    if (this.phase !== 'lobby') return 'inGame';
    if (this.humans().length >= CFG.maxHumans) return 'full';
    if (!(typeof color === 'number' && color >= 0 && color < COLORS.length) || this.colorTaken(color, pid)) color = this.freeColor(pid);
    this.players[pid] = { id: pid, name: name, color: color, bot: false, connected: true, discAt: 0 };
    this.order.push(pid);
    return 'ok';
  };

  G.leave = function (pid) {
    var p = this.players[pid];
    if (!p) return;
    if (this.phase === 'lobby') {
      delete this.players[pid];
      this.order = this.order.filter(function (id) { return id !== pid; });
    } else {
      p.connected = false;
      p.discAt = this.now;
      p.input = { x: 0, y: 0 };
    }
  };

  G.setSettings = function (s) {
    if (!s || this.phase !== 'lobby') return;
    if (s.total === 7 || s.total === 8) this.settings.total = s.total;
    if (s.impostors === 1 || s.impostors === 2) this.settings.impostors = s.impostors;
  };

  // ---------- Empezar ----------
  G.start = function () {
    if (this.phase !== 'lobby') return false;
    var humans = this.humans();
    if (!humans.length) return false;
    var self = this;
    this.order = this.order.filter(function (id) { if (self.players[id].bot) { delete self.players[id]; return false; } return true; });
    var total = Math.min(CFG.maxTotal, Math.max(this.settings.total, humans.length));
    var usedNames = humans.map(function (h) { return h.name.toLowerCase(); });
    var names = shuffle(BOT_NAMES.slice()).filter(function (n) { return usedNames.indexOf(n.toLowerCase()) < 0; });
    for (var i = humans.length; i < total; i++) {
      var id = 'bot' + (++this.botCount);
      this.players[id] = { id: id, name: names.shift() || ('Bot' + i), color: this.freeColor(id), bot: true, connected: true };
      this.order.push(id);
    }
    var all = this.list();
    var nImp = Math.min(this.settings.impostors, Math.max(1, Math.floor((all.length - 1) / 3)));
    var imps = shuffle(all.slice()).slice(0, nImp).map(function (p) { return p.id; });
    var taskIds = MAP.stations.filter(function (s) { return MAP.TASK_TYPES.indexOf(s.type) >= 0; }).map(function (s) { return s.id; });

    all.forEach(function (p) {
      p.role = imps.indexOf(p.id) >= 0 ? 'imp' : 'crew';
      p.alive = true;
      p.ejected = false;
      p.input = { x: 0, y: 0 };
      p.busy = null;
      p.vent = null;
      p.meetingsLeft = 1;
      p.freezeAt = 0; p.sabAt = 0;
      p.tasks = shuffle(taskIds.slice()).slice(0, CFG.tasksPerPlayer).map(function (sid) { return { sid: sid, done: false }; });
      p.witness = {};
      p.ai = null;
      p.vote = undefined; p.ready = false;
    });
    this.bodies = [];
    this.lightsOut = false; this.reactorAt = 0;
    this.meeting = null; this.ejectRes = null; this.endRes = null;
    this.placeAtSpawn();
    this.resetCooldowns(CFG.freezeCdStart, CFG.sabCdStart);
    this.startedAt = this.now;
    this.phase = 'intro';
    this.phaseEnd = this.now + CFG.introTime;
    this.onEvent('intro');
    return true;
  };

  G.placeAtSpawn = function () {
    var all = this.list();
    all.forEach(function (p, i) {
      var a = (i / all.length) * Math.PI * 2;
      p.x = MAP.spawn.x + Math.cos(a) * MAP.spawn.r;
      p.y = MAP.spawn.y + Math.sin(a) * MAP.spawn.r * 0.6;
      p.input = { x: 0, y: 0 };
      p.busy = null; p.vent = null;
      p.ai = null;
    });
  };
  G.resetCooldowns = function (fz, sab) {
    var self = this;
    this.list().forEach(function (p) {
      if (p.role === 'imp') { p.freezeAt = self.now + fz; p.sabAt = self.now + sab; }
    });
    this.meetingAllowedAt = this.now + CFG.meetingCdStart;
  };

  G.backToLobby = function () {
    var self = this;
    this.order = this.order.filter(function (id) {
      var p = self.players[id];
      if (p.bot || !p.connected) { delete self.players[id]; return false; }
      return true;
    });
    this.phase = 'lobby';
    this.bodies = []; this.lightsOut = false; this.reactorAt = 0; this.meeting = null;
    this.onEvent('lobby');
  };

  // ---------- Utilidades ----------
  G.isGhost = function (p) { return !p.alive || p.ejected; };
  G.isBotNow = function (p) { return p.bot || (!p.connected && this.now - p.discAt > CFG.botTakeover); };
  G.visionOf = function (p) {
    if (this.isGhost(p)) return CFG.ghostVision;
    if (p.role === 'imp') return CFG.impVision;
    return this.lightsOut ? CFG.visionDark : CFG.vision;
  };
  // ¿p puede ver el punto q? (distancia + sin paredes en medio; los fantasmas ven a través de las paredes)
  G.sees = function (p, q, extra) {
    var r = this.visionOf(p) + (extra || 0);
    if (dist(p, q) > r) return false;
    if (this.isGhost(p)) return true;
    return MAP.clear(p.x, p.y, q.x, q.y);
  };
  G.aliveCrew = function () { return this.list().filter(function (p) { return p.alive && !p.ejected && p.role === 'crew'; }); };
  G.aliveImps = function () { return this.list().filter(function (p) { return p.alive && !p.ejected && p.role === 'imp'; }); };
  G.taskProgress = function () {
    var total = 0, done = 0;
    this.list().forEach(function (p) {
      if (p.role !== 'crew') return;
      p.tasks.forEach(function (t) { total++; if (t.done) done++; });
    });
    return total ? done / total : 0;
  };
  G.crisis = function () { return this.reactorAt > 0; };

  // ---------- Bucle ----------
  G.tick = function (dt) {
    this.now += dt;
    var self = this;
    if (this.phase === 'intro') {
      if (this.now >= this.phaseEnd) { this.phase = 'play'; this.onEvent('play'); }
    } else if (this.phase === 'play') {
      this.list().forEach(function (p) {
        if (self.phase !== 'play') return;
        if (self.isBotNow(p)) self.botTick(p, dt);
        else self.moveHuman(p, dt);
      });
      if (this.phase === 'play' && this.reactorAt && this.now >= this.reactorAt) this.finish({ winner: 'imp', reason: 'reactor' });
      if (this.phase === 'play') this.checkWin();
    } else if (this.phase === 'meeting') {
      this.meetingTick();
    } else if (this.phase === 'eject') {
      if (this.now >= this.phaseEnd) {
        if (!this.checkWin()) {
          this.bodies = [];
          this.placeAtSpawn();
          this.resetCooldowns(CFG.freezeCd * 0.6, CFG.sabCdStart);
          this.phase = 'play';
          this.onEvent('play');
        }
      }
    }
  };

  G.moveHuman = function (p, dt) {
    if (p.busy || p.vent) return;
    var ix = p.input.x, iy = p.input.y;
    if (!ix && !iy) return;
    var nx = p.x + ix * CFG.speed * dt, ny = p.y + iy * CFG.speed * dt;
    if (MAP.walkable(nx, ny, CFG.radius)) { p.x = nx; p.y = ny; }
    else if (MAP.walkable(nx, p.y, CFG.radius)) { p.x = nx; }
    else if (MAP.walkable(p.x, ny, CFG.radius)) { p.y = ny; }
  };

  G.finish = function (res) {
    res.imps = this.list().filter(function (p) { return p.role === 'imp'; }).map(function (p) { return p.id; });
    res.time = Math.round(this.now - this.startedAt);
    this.endRes = res;
    this.phase = 'end';
    this.meeting = null;
    this.reactorAt = 0; this.lightsOut = false;
    this.onEvent('end');
  };
  G.checkWin = function () {
    if (this.phase === 'end') return true;
    var crew = this.aliveCrew().length, imps = this.aliveImps().length;
    var res = null;
    if (imps === 0) res = { winner: 'crew', reason: 'ejected' };
    else if (this.taskProgress() >= 1) res = { winner: 'crew', reason: 'tasks' };
    else if (imps >= crew) res = { winner: 'imp', reason: 'frozen' };
    if (!res) return false;
    this.finish(res);
    return true;
  };

  // ---------- Acciones de los jugadores ----------
  G.setInput = function (pid, x, y) {
    var p = this.players[pid];
    if (!p || !p.input) return;
    x = +x || 0; y = +y || 0;
    var m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    p.input = { x: x, y: y };
  };

  G.nearStation = function (p) {
    if (p.vent) return null;
    var best = null, bd = CFG.useRange, self = this;
    MAP.stations.forEach(function (s) {
      var d = dist(p, s);
      if (d > bd) return;
      if (!self.stationUsable(p, s)) return;
      best = s; bd = d;
    });
    return best;
  };
  G.stationUsable = function (p, s) {
    var ghost = this.isGhost(p);
    if (s.type === 'emergency') return !ghost && p.meetingsLeft > 0 && this.now >= this.meetingAllowedAt && !this.crisis();
    if (s.type === 'lights') return !ghost && this.lightsOut;
    if (s.type === 'reactor') return !ghost && p.role === 'crew' && this.crisis();
    if (s.type === 'cameras' || s.type === 'admin') return !ghost;
    if (p.role !== 'crew') return false;
    for (var i = 0; i < p.tasks.length; i++) if (p.tasks[i].sid === s.id && !p.tasks[i].done) return true;
    return false;
  };

  G.use = function (pid) {
    var p = this.players[pid];
    if (!p || this.phase !== 'play' || p.busy) return;
    var s = this.nearStation(p);
    if (!s) return;
    if (s.type === 'emergency') { p.meetingsLeft--; this.startMeeting('button', p.id, null); return; }
    p.busy = s.id;
    p.input = { x: 0, y: 0 };
  };
  G.taskDone = function (pid, sid) {
    var p = this.players[pid];
    if (!p || p.busy !== sid) return;
    p.busy = null;
    var s = MAP.station(sid);
    if (!s) return;
    if (s.type === 'lights') { if (this.lightsOut) { this.lightsOut = false; this.onEvent('lightsOn'); } return; }
    if (s.type === 'reactor') { if (this.reactorAt) { this.reactorAt = 0; this.onEvent('reactorOff'); } return; }
    if (s.type === 'cameras' || s.type === 'admin') return;
    p.tasks.forEach(function (t) { if (t.sid === sid) t.done = true; });
    this.onEvent('task');
  };
  G.taskCancel = function (pid) {
    var p = this.players[pid];
    if (p) p.busy = null;
  };

  G.freezeTarget = function (p) {
    if (p.role !== 'imp' || this.isGhost(p) || p.vent || this.now < p.freezeAt) return null;
    var best = null, bd = CFG.freezeRange;
    this.list().forEach(function (o) {
      if (o.role === 'imp' || !o.alive || o.ejected) return;
      var d = dist(p, o);
      if (d <= bd && MAP.clear(p.x, p.y, o.x, o.y)) { best = o; bd = d; }
    });
    return best;
  };
  G.freeze = function (pid) {
    var p = this.players[pid];
    if (!p || this.phase !== 'play') return;
    var v = this.freezeTarget(p);
    if (!v) return;
    v.alive = false;
    v.busy = null;
    v.input = { x: 0, y: 0 };
    v.ai = null;
    this.bodies.push({ id: v.id, x: v.x, y: v.y });
    p.freezeAt = this.now + CFG.freezeCd;
    var self = this;
    this.list().forEach(function (o) {
      if (o === p || o === v || self.isGhost(o)) return;
      if (self.sees(o, v) && self.sees(o, p)) o.witness[p.id] = true;
    });
    this.onEvent('freeze');
    this.checkWin();
  };
  G.bodyNear = function (p, range) {
    if (this.isGhost(p) || p.vent) return null;
    for (var i = 0; i < this.bodies.length; i++) {
      var b = this.bodies[i];
      if (dist(p, b) <= range && MAP.clear(p.x, p.y, b.x, b.y)) return b;
    }
    return null;
  };
  G.report = function (pid) {
    var p = this.players[pid];
    if (!p || this.phase !== 'play') return;
    var b = this.bodyNear(p, CFG.reportRange);
    if (b) this.startMeeting('report', p.id, b.id);
  };

  // Sabotajes: 'lights' (apagón) o 'reactor' (cuenta atrás)
  G.canSabotage = function (p, kind) {
    if (p.role !== 'imp' || this.isGhost(p) || this.now < p.sabAt || this.lightsOut || this.reactorAt) return false;
    return kind === 'lights' || kind === 'reactor';
  };
  G.sabotage = function (pid, kind) {
    var p = this.players[pid];
    kind = kind || 'lights';
    if (!p || this.phase !== 'play' || !this.canSabotage(p, kind)) return;
    if (kind === 'lights') { this.lightsOut = true; this.lightsAt = this.now; this.onEvent('lightsOut'); }
    else { this.reactorStart = this.now; this.reactorAt = this.now + CFG.reactorTime; this.onEvent('reactorOn'); }
    var self = this;
    this.list().forEach(function (o) { if (o.role === 'imp') o.sabAt = self.now + CFG.sabCd; });
  };

  // Rejillas de ventilación (solo impostor vivo)
  G.ventNear = function (p) {
    if (p.role !== 'imp' || this.isGhost(p) || p.busy) return null;
    var best = null, bd = CFG.ventRange;
    MAP.vents.forEach(function (v) { var d = dist(p, v); if (d <= bd) { best = v; bd = d; } });
    return best;
  };
  G.vent = function (pid) {
    var p = this.players[pid];
    if (!p || this.phase !== 'play') return;
    if (p.vent) { p.vent = null; this.onEvent('vent'); return; }   // salir
    var v = this.ventNear(p);
    if (!v) return;
    p.vent = v.id; p.x = v.x; p.y = v.y; p.input = { x: 0, y: 0 };
    this.onEvent('vent');
  };
  G.ventNext = function (pid) {
    var p = this.players[pid];
    if (!p || !p.vent) return;
    var cur = MAP.vent(p.vent);
    var net = MAP.vents.filter(function (v) { return v.net === cur.net; });
    var nx = net[(net.indexOf(cur) + 1) % net.length];
    p.vent = nx.id; p.x = nx.x; p.y = nx.y;
  };

  // ---------- Reuniones y votos ----------
  G.startMeeting = function (reason, callerId, victimId) {
    var self = this;
    this.list().forEach(function (p) { p.busy = null; p.vent = null; p.input = { x: 0, y: 0 }; p.vote = undefined; p.ready = false; p.ai = null; });
    this.lightsOut = false;
    this.reactorAt = 0;
    var livingHumans = this.list().filter(function (p) { return !self.isGhost(p) && !self.isBotNow(p); }).length;
    this.meeting = {
      reason: reason, caller: callerId, victim: victimId, sub: 'discuss', startedAt: this.now,
      end: this.now + CFG.splashTime + (livingHumans ? CFG.discussTime : 4)
    };
    this.phase = 'meeting';
    this.onEvent('meeting');
  };
  G.voters = function () {
    var self = this;
    return this.list().filter(function (p) { return !self.isGhost(p); });
  };
  G.ready = function (pid) {
    var p = this.players[pid];
    if (p && this.phase === 'meeting' && this.meeting.sub === 'discuss' && !this.isGhost(p)) p.ready = true;
  };
  G.vote = function (pid, target) {
    var p = this.players[pid];
    var m = this.meeting;
    if (!p || this.phase !== 'meeting' || m.sub !== 'vote' || this.isGhost(p) || p.vote !== undefined) return;
    if (target !== 'skip') {
      var t = this.players[target];
      if (!t || this.isGhost(t)) return;
    }
    p.vote = target;
    this.onEvent('vote');
  };
  G.meetingTick = function () {
    var m = this.meeting, self = this;
    var voters = this.voters();
    var humansAlive = voters.filter(function (p) { return !self.isBotNow(p); });
    if (m.sub === 'discuss') {
      var allReady = humansAlive.length > 0 && humansAlive.every(function (p) { return p.ready; });
      if (this.now >= m.end || (allReady && this.now - m.startedAt > CFG.splashTime)) {
        m.sub = 'vote';
        m.voteStart = this.now;
        m.end = this.now + CFG.voteTime;
        voters.forEach(function (p) { if (self.isBotNow(p)) p.voteAt = self.now + rnd(CFG.voteTime * 0.35, CFG.voteTime * 0.75); });
        this.onEvent('voteStart');
      }
      return;
    }
    var humansDone = humansAlive.every(function (p) { return p.vote !== undefined; });
    voters.forEach(function (p) {
      if (!self.isBotNow(p) || p.vote !== undefined) return;
      if (humansDone && p.voteAt > self.now + 2.5) p.voteAt = self.now + rnd(0.5, 2.5);
      if (self.now >= p.voteAt) self.vote(p.id, self.botVote(p));
    });
    var allVoted = voters.every(function (p) { return p.vote !== undefined; });
    if (allVoted || this.now >= m.end) this.tally();
  };
  G.tally = function () {
    var counts = {}, skip = 0;
    this.voters().forEach(function (p) {
      if (p.vote === undefined) return;
      if (p.vote === 'skip') skip++; else counts[p.vote] = (counts[p.vote] || 0) + 1;
    });
    var best = null, bestN = 0, tie = false;
    for (var id in counts) {
      if (counts[id] > bestN) { best = id; bestN = counts[id]; tie = false; }
      else if (counts[id] === bestN) tie = true;
    }
    var res = { counts: counts, skip: skip, ejected: null, tie: false, skipped: false };
    if (!best || skip >= bestN) res.skipped = true;
    else if (tie) res.tie = true;
    else {
      res.ejected = best;
      var e = this.players[best];
      e.ejected = true;
      res.wasImp = e.role === 'imp';
    }
    res.impsLeft = this.aliveImps().length;
    res.votes = {};
    this.voters().forEach(function (p) { res.votes[p.id] = p.vote === undefined ? null : p.vote; });
    this.ejectRes = res;
    this.meeting = null;
    this.phase = 'eject';
    this.phaseEnd = this.now + CFG.ejectTime;
    this.onEvent('eject');
  };

  G.botVote = function (p) {
    var self = this;
    var candidates = this.voters().filter(function (o) { return o !== p; });
    if (p.role === 'imp') {
      var crew = candidates.filter(function (o) { return o.role !== 'imp'; });
      return Math.random() < 0.6 || !crew.length ? 'skip' : pick(crew).id;
    }
    for (var id in p.witness) {
      var w = this.players[id];
      if (w && !this.isGhost(w) && Math.random() < 0.85) return id;
    }
    // Sigue a lo que han votado las personas (así cuenta lo que habláis en voz alta)
    var hv = {};
    this.voters().forEach(function (o) {
      if (!self.isBotNow(o) && o.vote && o.vote !== 'skip' && o.vote !== p.id) hv[o.vote] = (hv[o.vote] || 0) + 1;
    });
    var top = null, topN = 0;
    for (var k in hv) if (hv[k] > topN) { top = k; topN = hv[k]; }
    if (top && Math.random() < 0.65) return top;
    return Math.random() < 0.75 || !candidates.length ? 'skip' : pick(candidates).id;
  };

  // ---------- Bots (nivel fácil) ----------
  G.nearestNodeTo = function (x, y) {
    var room = MAP.roomAt(x, y);
    if (room) return room;
    var best = null, bd = Infinity;
    for (var n in MAP.nodes) {
      var d = Math.hypot(MAP.nodes[n][0] - x, MAP.nodes[n][1] - y);
      if (d < bd && MAP.clear(x, y, MAP.nodes[n][0], MAP.nodes[n][1])) { bd = d; best = n; }
    }
    return best || 'cafe';
  };
  // Prepara un camino hasta el punto (x,y). then: qué hacer al llegar; sid: estación objetivo
  G.botGo = function (p, x, y, then, sid) {
    var from = this.nearestNodeTo(p.x, p.y);
    var to = this.nearestNodeTo(x, y);
    var pts = MAP.path(from, to).map(function (n) { return { x: MAP.nodes[n][0], y: MAP.nodes[n][1] }; });
    pts.push({ x: x, y: y });
    p.ai.path = pts;
    p.ai.then = then;
    p.ai.sid = sid || null;
  };
  G.botTick = function (p, dt) {
    if (!p.ai) p.ai = { path: null, wait: this.now + rnd(0.5, 2), then: null };
    var ai = p.ai, self = this;
    var ghost = this.isGhost(p);

    if (p.busy) {
      if (this.now >= ai.busyUntil) this.taskDone(p.id, p.busy);
      return;
    }
    // Dentro de una rejilla: esperar, saltar a otra y salir
    if (p.vent) {
      if (this.now >= ai.ventUntil) {
        if (Math.random() < 0.7) { var hops = 1 + Math.floor(Math.random() * 2); while (hops--) this.ventNext(p.id); }
        this.vent(p.id);
        ai.path = null; ai.wait = this.now + rnd(0.5, 1.5);
      }
      return;
    }

    // Ver cuerpos congelados (fácil: no siempre se dan cuenta)
    if (!ghost && ai.then !== 'report' && this.now >= (ai.nextLook || 0)) {
      ai.nextLook = this.now + 1;
      for (var i = 0; i < this.bodies.length; i++) {
        var b = this.bodies[i];
        if (this.sees(p, b) && Math.random() < (p.role === 'imp' ? 0.03 : 0.45)) {
          this.botGo(p, b.x, b.y, 'report');
          break;
        }
      }
    }

    // Impostor
    if (p.role === 'imp' && !ghost) {
      if (this.canSabotage(p, 'lights') && Math.random() < dt * 0.03) this.sabotage(p.id, Math.random() < 0.35 ? 'reactor' : 'lights');
      var tgt = this.freezeTarget(p);
      if (tgt && this.aloneWith(p, tgt) && Math.random() < dt * 2) {
        this.freeze(p.id);
        ai.hunt = null;
        // a veces huye por una rejilla
        var near = null, nd = 260;
        MAP.vents.forEach(function (v) { var d = dist(p, v); if (d < nd && MAP.clear(p.x, p.y, v.x, v.y)) { nd = d; near = v; } });
        if (near && Math.random() < 0.6) { ai.path = [{ x: near.x, y: near.y }]; ai.then = 'vent'; ai.sid = null; }
        else { ai.path = null; ai.wait = this.now + rnd(0.5, 1.5); }
        return;
      }
      if (this.now >= p.freezeAt && !ai.hunt && ai.then !== 'report' && ai.then !== 'vent') {
        var crew = this.aliveCrew();
        if (crew.length) ai.hunt = { id: pick(crew).id, until: this.now + 20, replan: 0 };
      }
      if (ai.hunt && ai.then !== 'vent') {
        var h = this.players[ai.hunt.id];
        if (!h || !h.alive || h.ejected || this.now > ai.hunt.until) ai.hunt = null;
        else if (this.now >= ai.hunt.replan) {
          ai.hunt.replan = this.now + 2.5;
          this.botGo(p, h.x, h.y, 'hunt');
          ai.wait = 0;
        }
      }
    }

    // Arreglar sabotajes (fácil: tardan un poco)
    if (!ghost && p.role === 'crew' && ai.then !== 'fix' && ai.then !== 'report') {
      var fixSid = null;
      if (this.reactorAt && this.now - this.reactorStart > 4 && this.fixers('rx', 2).indexOf(p) >= 0) fixSid = 'rx';
      else if (this.lightsOut && this.now - this.lightsAt > 6 && this.fixers('lt', 1).indexOf(p) >= 0) fixSid = 'lt';
      if (fixSid) {
        var fs = MAP.station(fixSid);
        this.botGo(p, fs.x, fs.y, 'fix', fixSid);
        ai.wait = 0;
      }
    }

    if (!ai.path && this.now < ai.wait) return;

    if (ai.path && ai.path.length) {
      var target = ai.path[0];
      var step = CFG.speed * 0.7 * dt;
      var d = Math.hypot(target.x - p.x, target.y - p.y);
      if (d <= step) { p.x = target.x; p.y = target.y; ai.path.shift(); }
      else { p.x += (target.x - p.x) / d * step; p.y += (target.y - p.y) / d * step; }
      if (ai.path.length) return;
      ai.path = null;
      this.botArrive(p);
      return;
    }
    this.botChoose(p);
  };
  // Los n tripulantes bot vivos más cercanos a una estación
  G.fixers = function (sid, n) {
    var self = this, s = MAP.station(sid);
    return this.list().filter(function (o) { return o.role === 'crew' && !self.isGhost(o) && self.isBotNow(o); })
      .sort(function (a, b) { return dist(a, s) - dist(b, s); }).slice(0, n);
  };
  G.aloneWith = function (imp, target) {
    var self = this;
    return !this.list().some(function (o) {
      if (o === imp || o === target || self.isGhost(o) || o.role === 'imp') return false;
      return self.sees(o, imp) || self.sees(o, target);
    });
  };
  G.botArrive = function (p) {
    var ai = p.ai, then = ai.then, sid = ai.sid;
    ai.then = null; ai.sid = null;
    if (then === 'report') {
      if (this.bodyNear(p, CFG.reportRange)) { this.report(p.id); return; }
    } else if (then === 'task' || then === 'fix') {
      var s = MAP.station(sid);
      if (s && dist(p, s) <= CFG.useRange && this.stationUsable(p, s)) {
        p.busy = s.id;
        ai.busyUntil = this.now + (then === 'fix' ? rnd(2, 3.5) : rnd(7, 12));
        return;
      }
    } else if (then === 'vent') {
      if (this.ventNear(p)) { this.vent(p.id); ai.ventUntil = this.now + rnd(1.5, 3.5); return; }
    } else if (then === 'fake') {
      ai.wait = this.now + rnd(3, 6);
      return;
    } else if (then === 'hunt') {
      ai.wait = this.now + 0.3;
      return;
    }
    ai.wait = this.now + rnd(3, 8);
  };
  G.botChoose = function (p) {
    if (p.role === 'crew') {
      var todo = p.tasks.filter(function (t) { return !t.done; });
      if (todo.length && Math.random() < 0.7) {
        todo.sort(function (a, b) { return dist(p, MAP.station(a.sid)) - dist(p, MAP.station(b.sid)); });
        var s = MAP.station(todo[0].sid);
        this.botGo(p, s.x, s.y, 'task', s.id);
        return;
      }
    }
    if (p.role === 'imp' && Math.random() < 0.6) {
      var fs = pick(MAP.stations.filter(function (s) { return MAP.TASK_TYPES.indexOf(s.type) >= 0; }));
      this.botGo(p, fs.x + rnd(-10, 10), fs.y + rnd(-10, 10), 'fake');
      return;
    }
    var r = pick(MAP.rooms);
    this.botGo(p, r.x + rnd(30, r.w - 30), r.y + rnd(30, r.h - 30), 'wander');
  };

  // ---------- Lo que ve cada móvil ----------
  G.roster = function () {
    var out = {};
    this.list().forEach(function (p) { out[p.id] = { n: p.name, c: p.color, b: p.bot ? 1 : 0 }; });
    return out;
  };
  G.snapshot = function (pid) {
    var p = this.players[pid];
    var self = this;
    var s = { t: 's', ph: this.phase, lang: root.I18N ? root.I18N.lang : 'es' };
    s.host = this.hostPid();
    if (this.phase === 'lobby' || !p || !p.role) {
      s.ph = this.phase === 'lobby' ? 'lobby' : 'spectator';
      s.players = this.humans().map(function (h) { return { id: h.id, n: h.name, c: h.color, on: h.connected }; });
      s.settings = this.settings;
      s.me = p ? { id: p.id, n: p.name, c: p.color } : null;
      return s;
    }
    s.me = {
      id: p.id, n: p.name, c: p.color, role: p.role, ghost: this.isGhost(p), ejected: !!p.ejected,
      tasks: p.tasks.map(function (t) { return [t.sid, t.done ? 1 : 0]; })
    };
    if (p.role === 'imp') s.me.partners = this.list().filter(function (o) { return o.role === 'imp' && o !== p; }).map(function (o) { return o.name; });
    if (this.phase === 'intro') {
      s.left = Math.ceil(this.phaseEnd - this.now);
      s.nImp = this.list().filter(function (o) { return o.role === 'imp'; }).length;
      // en fila: el tripulante ve a todos; el impostor, solo a los impostores
      s.lineup = this.list().filter(function (o) { return p.role === 'crew' || o.role === 'imp'; }).map(function (o) { return [o.color, o.name, o === p ? 1 : 0]; });
      return s;
    }

    if (this.phase === 'play') {
      var vr = this.visionOf(p);
      var ghost = this.isGhost(p);
      s.me.x = Math.round(p.x); s.me.y = Math.round(p.y);
      s.me.busy = p.busy;
      s.me.vent = p.vent;
      s.vr = vr;
      s.dark = this.lightsOut ? 1 : 0;
      s.reactor = this.reactorAt ? Math.max(0, Math.ceil(this.reactorAt - this.now)) : 0;
      s.prog = Math.round(this.taskProgress() * 100) / 100;
      s.ps = [];
      this.list().forEach(function (o) {
        if (o === p || o.vent) return;
        var og = self.isGhost(o);
        if (og && (!ghost || o.ejected)) return;
        if (!og && !o.alive) return;
        if (!self.sees(p, o, 25)) return;
        s.ps.push([Math.round(o.x), Math.round(o.y), o.color, o.name, og ? 1 : 0, (p.role === 'imp' && o.role === 'imp') ? 1 : 0]);
      });
      s.bd = [];
      this.bodies.forEach(function (b) { if (self.sees(p, b, 25)) s.bd.push([Math.round(b.x), Math.round(b.y), self.players[b.id].color]); });
      // cámaras y mapa de administración (solo mientras se usan)
      if (p.busy === 'cam') {
        s.cams = MAP.cameras.map(function (c) {
          var list = [];
          self.list().forEach(function (o) {
            if (o.vent || self.isGhost(o) || dist(o, c) > CFG.camRange || !MAP.clear(c.x, c.y, o.x, o.y)) return;
            list.push([Math.round(o.x), Math.round(o.y), o.color]);
          });
          var bodies = self.bodies.filter(function (b) { return dist(b, c) <= CFG.camRange && MAP.clear(c.x, c.y, b.x, b.y); })
            .map(function (b) { return [Math.round(b.x), Math.round(b.y), self.players[b.id].color]; });
          return { p: list, b: bodies };
        });
      }
      if (p.busy === 'adm') {
        var counts = {};
        this.list().forEach(function (o) {
          if (o.vent || self.isGhost(o)) return;
          var r = MAP.roomAt(o.x, o.y); if (r) counts[r] = (counts[r] || 0) + 1;
        });
        this.bodies.forEach(function (b) { var r = MAP.roomAt(b.x, b.y); if (r) counts[r] = (counts[r] || 0) + 1; });
        s.admin = counts;
      }
      var st = this.nearStation(p);
      var ft = this.freezeTarget(p);
      var vn = this.ventNear(p);
      s.b = {
        use: st ? st.id : null,
        rep: this.bodyNear(p, CFG.reportRange) ? 1 : 0,
        frz: ft ? 1 : 0,
        sabL: this.canSabotage(p, 'lights') ? 1 : 0,
        sabR: this.canSabotage(p, 'reactor') ? 1 : 0,
        vent: p.vent ? 2 : (vn ? 1 : 0)
      };
      if (p.role === 'imp' && !ghost) {
        s.b.fcd = Math.max(0, Math.ceil(p.freezeAt - this.now));
        s.b.scd = (this.lightsOut || this.reactorAt) ? 0 : Math.max(0, Math.ceil(p.sabAt - this.now));
      }
      return s;
    }
    if (this.phase === 'meeting') {
      var m = this.meeting;
      s.sub = m.sub;
      s.since = Math.round((this.now - m.startedAt) * 10) / 10;
      s.left = Math.max(0, Math.ceil(m.end - this.now));
      s.reason = m.reason;
      s.caller = m.caller;
      s.victim = m.victim;
      s.roster = this.roster();
      s.players = this.list().map(function (o) {
        return { id: o.id, alive: !self.isGhost(o), voted: o.vote !== undefined ? 1 : 0, ready: o.ready ? 1 : 0 };
      });
      s.myVote = p.vote === undefined ? null : p.vote;
      s.iReady = p.ready ? 1 : 0;
      return s;
    }
    if (this.phase === 'eject') {
      s.res = this.ejectRes; s.roster = this.roster();
      s.since = Math.round((CFG.ejectTime - (this.phaseEnd - this.now)) * 10) / 10;
      return s;
    }
    if (this.phase === 'end') {
      s.res = this.endRes; s.roster = this.roster();
      s.iWon = (this.endRes.winner === 'crew') === (p.role === 'crew') ? 1 : 0;
      return s;
    }
    return s;
  };

  root.NaveGame = Game;
  root.NAVE_COLORS = COLORS;
  root.NAVE_CFG = CFG;
  if (typeof module !== 'undefined') module.exports = { Game: Game, COLORS: COLORS, CFG: CFG };
})(typeof window !== 'undefined' ? window : globalThis);
