/* Lógica de la partida. Se ejecuta SOLO en la tele (que hace de servidor).
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
    speed: 150, radius: 10,
    useRange: 48, freezeRange: 55, reportRange: 85,
    vision: 175, visionDark: 75, impVision: 210, ghostVision: 280,
    freezeCd: 25, freezeCdStart: 15, sabCd: 40, sabCdStart: 20, meetingCdStart: 12,
    discussTime: 30, voteTime: 35, ejectTime: 7, introTime: 6,
    tasksPerPlayer: 5, maxHumans: 8, maxTotal: 10,
    botTakeover: 15 // segundos desconectado antes de que un bot mueva a ese jugador
  };

  function rnd(a, b) { return a + Math.random() * (b - a); }
  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }

  function Game() {
    this.players = {};       // id -> jugador
    this.order = [];         // orden de llegada
    this.phase = 'lobby';
    this.settings = { total: 8, impostors: 1, botLevel: 'easy' };
    this.now = 0;
    this.bodies = [];
    this.lightsOut = false;
    this.lightsAt = 0;
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
    // quitar bots anteriores
    this.order = this.order.filter(function (id) { if (self.players[id].bot) { delete self.players[id]; return false; } return true; });
    var total = Math.min(CFG.maxTotal, Math.max(this.settings.total, humans.length));
    var names = shuffle(BOT_NAMES.slice());
    var usedNames = humans.map(function (h) { return h.name.toLowerCase(); });
    names = names.filter(function (n) { return usedNames.indexOf(n.toLowerCase()) < 0; });
    for (var i = humans.length; i < total; i++) {
      var id = 'bot' + (++this.botCount);
      this.players[id] = { id: id, name: names.shift() || ('Bot' + i), color: this.freeColor(id), bot: true, connected: true };
      this.order.push(id);
    }
    var all = this.list();
    var nImp = Math.min(this.settings.impostors, Math.max(1, Math.floor((all.length - 1) / 3)));
    var imps = shuffle(all.slice()).slice(0, nImp).map(function (p) { return p.id; });
    var taskIds = MAP.stations.filter(function (s) { return s.type !== 'emergency' && s.type !== 'lights'; }).map(function (s) { return s.id; });

    all.forEach(function (p, idx) {
      p.role = imps.indexOf(p.id) >= 0 ? 'imp' : 'crew';
      p.alive = true;
      p.ejected = false;
      p.input = { x: 0, y: 0 };
      p.busy = null;
      p.meetingsLeft = 1;
      p.freezeAt = 0; p.sabAt = 0;
      p.tasks = shuffle(taskIds.slice()).slice(0, CFG.tasksPerPlayer).map(function (sid) { return { sid: sid, done: false }; });
      p.witness = {};
      p.ai = null;
      p.vote = undefined; p.ready = false;
    });
    this.bodies = [];
    this.lightsOut = false;
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
      p.busy = null;
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
    this.bodies = []; this.lightsOut = false; this.meeting = null;
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
    if (p.busy) return;
    var ix = p.input.x, iy = p.input.y;
    if (!ix && !iy) return;
    var nx = p.x + ix * CFG.speed * dt, ny = p.y + iy * CFG.speed * dt;
    if (MAP.walkable(nx, ny, CFG.radius)) { p.x = nx; p.y = ny; }
    else if (MAP.walkable(nx, p.y, CFG.radius)) { p.x = nx; }
    else if (MAP.walkable(p.x, ny, CFG.radius)) { p.y = ny; }
  };

  G.checkWin = function () {
    if (this.phase === 'end') return true;
    var crew = this.aliveCrew().length, imps = this.aliveImps().length;
    var res = null;
    if (imps === 0) res = { winner: 'crew', reason: 'ejected' };
    else if (this.taskProgress() >= 1) res = { winner: 'crew', reason: 'tasks' };
    else if (imps >= crew) res = { winner: 'imp', reason: 'frozen' };
    if (!res) return false;
    res.imps = this.list().filter(function (p) { return p.role === 'imp'; }).map(function (p) { return p.id; });
    res.time = Math.round(this.now - this.startedAt);
    this.endRes = res;
    this.phase = 'end';
    this.meeting = null;
    this.onEvent('end');
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
    if (s.type === 'emergency') return !ghost && p.meetingsLeft > 0 && this.now >= this.meetingAllowedAt;
    if (s.type === 'lights') return !ghost && this.lightsOut;
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
    p.tasks.forEach(function (t) { if (t.sid === sid) t.done = true; });
    this.onEvent('task');
  };
  G.taskCancel = function (pid) {
    var p = this.players[pid];
    if (p) p.busy = null;
  };

  G.freezeTarget = function (p) {
    if (p.role !== 'imp' || this.isGhost(p) || this.now < p.freezeAt) return null;
    var best = null, bd = CFG.freezeRange;
    this.list().forEach(function (o) {
      if (o.role === 'imp' || !o.alive || o.ejected) return;
      var d = dist(p, o);
      if (d <= bd) { best = o; bd = d; }
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
    // Testigos: quien está vivo y lo ve (lo usan los bots para votar)
    var self = this;
    this.list().forEach(function (o) {
      if (o === p || o === v || self.isGhost(o)) return;
      if (dist(o, v) <= self.visionOf(o)) o.witness[p.id] = true;
    });
    this.onEvent('freeze');
    this.checkWin();
  };
  G.bodyNear = function (p, range) {
    if (this.isGhost(p)) return null;
    for (var i = 0; i < this.bodies.length; i++) if (dist(p, this.bodies[i]) <= range) return this.bodies[i];
    return null;
  };
  G.report = function (pid) {
    var p = this.players[pid];
    if (!p || this.phase !== 'play') return;
    var b = this.bodyNear(p, CFG.reportRange);
    if (b) this.startMeeting('report', p.id, b.id);
  };
  G.canSabotage = function (p) {
    return p.role === 'imp' && !this.isGhost(p) && !this.lightsOut && this.now >= p.sabAt;
  };
  G.sabotage = function (pid) {
    var p = this.players[pid];
    if (!p || this.phase !== 'play' || !this.canSabotage(p)) return;
    this.lightsOut = true;
    this.lightsAt = this.now;
    var self = this;
    this.list().forEach(function (o) { if (o.role === 'imp') o.sabAt = self.now + CFG.sabCd; });
    this.onEvent('lightsOut');
  };

  // ---------- Reuniones y votos ----------
  G.startMeeting = function (reason, callerId, victimId) {
    var self = this;
    this.list().forEach(function (p) { p.busy = null; p.input = { x: 0, y: 0 }; p.vote = undefined; p.ready = false; p.ai = null; });
    this.lightsOut = false;
    var livingHumans = this.list().filter(function (p) { return !self.isGhost(p) && !self.isBotNow(p); }).length;
    this.meeting = {
      reason: reason, caller: callerId, victim: victimId, sub: 'discuss',
      end: this.now + (livingHumans ? CFG.discussTime : 4)
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
      if (this.now >= m.end || allReady) {
        m.sub = 'vote';
        m.voteStart = this.now;
        m.end = this.now + CFG.voteTime;
        voters.forEach(function (p) { if (self.isBotNow(p)) p.voteAt = self.now + rnd(CFG.voteTime * 0.35, CFG.voteTime * 0.75); });
        this.onEvent('voteStart');
      }
      return;
    }
    // votación
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
    var counts = {}, skip = 0, self = this;
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
      // El impostor fácil casi siempre salta o vota a alguien al azar que no sea su compañero
      var crew = candidates.filter(function (o) { return o.role !== 'imp'; });
      return Math.random() < 0.6 || !crew.length ? 'skip' : pick(crew).id;
    }
    // Si vio congelar a alguien, lo vota (casi siempre)
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
  G.nodeFor = function (p) {
    var room = MAP.roomAt(p.x, p.y);
    if (room) return room;
    var best = null, bd = Infinity;
    for (var n in MAP.nodes) {
      var d = Math.hypot(MAP.nodes[n][0] - p.x, MAP.nodes[n][1] - p.y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  };
  G.nearestNodeTo = function (x, y) {
    var room = MAP.roomAt(x, y);
    if (room) return room;
    var best = null, bd = Infinity;
    for (var n in MAP.nodes) {
      var d = Math.hypot(MAP.nodes[n][0] - x, MAP.nodes[n][1] - y);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  };
  // Prepara un camino hasta el punto (x,y)
  G.botGo = function (p, x, y, then) {
    var from = this.nodeFor(p);
    var to = this.nearestNodeTo(x, y);
    var pts = MAP.path(from, to).map(function (n) { return { x: MAP.nodes[n][0], y: MAP.nodes[n][1] }; });
    pts.push({ x: x, y: y });
    p.ai.path = pts;
    p.ai.dest = to;
    p.ai.then = then;
  };
  G.botTick = function (p, dt) {
    if (!p.ai) p.ai = { node: this.nodeFor(p), path: null, wait: this.now + rnd(0.5, 2), then: null };
    var ai = p.ai, self = this;
    var ghost = this.isGhost(p);

    // Haciendo una tarea
    if (p.busy) {
      if (this.now >= ai.busyUntil) this.taskDone(p.id, p.busy);
      return;
    }

    // Ver cuerpos congelados (fácil: no siempre se dan cuenta)
    if (!ghost && ai.then !== 'report' && this.now >= (ai.nextLook || 0)) {
      ai.nextLook = this.now + 1;
      var vis = this.visionOf(p);
      for (var i = 0; i < this.bodies.length; i++) {
        var b = this.bodies[i];
        if (dist(p, b) <= vis && Math.random() < (p.role === 'imp' ? 0.03 : 0.45)) {
          this.botGo(p, b.x, b.y, 'report');
          break;
        }
      }
    }

    // Impostor
    if (p.role === 'imp' && !ghost) {
      if (this.canSabotage(p) && Math.random() < dt * 0.03) this.sabotage(p.id);
      var tgt = this.freezeTarget(p);
      if (tgt && this.aloneWith(p, tgt) && Math.random() < dt * 2) {
        this.freeze(p.id);
        ai.hunt = null;
        ai.path = null; ai.wait = this.now + rnd(0.5, 1.5);
        return;
      }
      if (this.now >= p.freezeAt && !ai.hunt && ai.then !== 'report') {
        var crew = this.aliveCrew();
        if (crew.length) { ai.hunt = { id: pick(crew).id, until: this.now + 20, replan: 0 }; }
      }
      if (ai.hunt) {
        var h = this.players[ai.hunt.id];
        if (!h || !h.alive || h.ejected || this.now > ai.hunt.until) { ai.hunt = null; }
        else if (this.now >= ai.hunt.replan) {
          ai.hunt.replan = this.now + 2.5;
          this.botGo(p, h.x, h.y, 'hunt');
          ai.wait = 0;
        }
      }
    }

    // Arreglar las luces (fácil: tardan un poco y solo va uno)
    if (!ghost && p.role === 'crew' && this.lightsOut && ai.then !== 'lights' && ai.then !== 'report' &&
        this.now - this.lightsAt > 6 && this.lightsFixer() === p) {
      var lt = MAP.station('lt');
      this.botGo(p, lt.x, lt.y, 'lights');
      ai.wait = 0;
    }

    // Esperando
    if (!ai.path && this.now < ai.wait) return;

    // Moverse por el camino
    if (ai.path && ai.path.length) {
      var target = ai.path[0];
      var step = CFG.speed * 0.7 * dt;
      var d = Math.hypot(target.x - p.x, target.y - p.y);
      if (d <= step) {
        p.x = target.x; p.y = target.y;
        ai.path.shift();
        if (ai.path.length === 1) ai.node = ai.dest; // ya en la sala/nodo de destino
      } else {
        p.x += (target.x - p.x) / d * step;
        p.y += (target.y - p.y) / d * step;
      }
      if (ai.path.length) return;
      ai.path = null;
      ai.node = ai.dest;
      this.botArrive(p);
      return;
    }

    // Elegir qué hacer
    this.botChoose(p);
  };
  G.lightsFixer = function () {
    var self = this, best = null, bd = Infinity, lt = MAP.station('lt');
    this.list().forEach(function (o) {
      if (o.role !== 'crew' || self.isGhost(o) || !self.isBotNow(o)) return;
      var d = dist(o, lt);
      if (d < bd) { bd = d; best = o; }
    });
    return best;
  };
  G.aloneWith = function (imp, target) {
    var self = this;
    return !this.list().some(function (o) {
      if (o === imp || o === target || self.isGhost(o) || o.role === 'imp') return false;
      return dist(o, imp) < 170 || dist(o, target) < 170;
    });
  };
  G.botArrive = function (p) {
    var ai = p.ai, then = ai.then;
    ai.then = null;
    if (then === 'report') {
      if (this.bodyNear(p, CFG.reportRange)) { this.report(p.id); return; }
    } else if (then === 'task' || then === 'lights') {
      var s = this.nearStation(p);
      if (s && (s.type !== 'emergency')) {
        p.busy = s.id;
        ai.busyUntil = this.now + (s.type === 'lights' ? rnd(2, 4) : rnd(7, 12));
        return;
      }
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
    var self = this;
    if (p.role === 'crew') {
      var todo = p.tasks.filter(function (t) { return !t.done; });
      if (todo.length && Math.random() < 0.7) {
        // la tarea pendiente más cercana
        todo.sort(function (a, b) { return dist(p, MAP.station(a.sid)) - dist(p, MAP.station(b.sid)); });
        var s = MAP.station(todo[0].sid);
        this.botGo(p, s.x, s.y, 'task');
        return;
      }
    }
    // Pasear (o tareas falsas si es impostor)
    if (p.role === 'imp' && Math.random() < 0.6) {
      var fs = pick(MAP.stations.filter(function (s) { return s.type !== 'emergency'; }));
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
      s.host = this.hostPid();
      s.settings = this.settings;
      s.me = p ? { id: p.id, n: p.name, c: p.color } : null;
      return s;
    }
    s.me = {
      id: p.id, n: p.name, c: p.color, role: p.role, ghost: this.isGhost(p), ejected: !!p.ejected,
      tasks: p.tasks.map(function (t) { return [t.sid, t.done ? 1 : 0]; })
    };
    if (p.role === 'imp') {
      s.me.partners = this.list().filter(function (o) { return o.role === 'imp' && o !== p; }).map(function (o) { return o.name; });
    }
    if (this.phase === 'intro') { s.left = Math.ceil(this.phaseEnd - this.now); return s; }

    if (this.phase === 'play') {
      var vr = this.visionOf(p);
      var ghost = this.isGhost(p);
      s.me.x = Math.round(p.x); s.me.y = Math.round(p.y);
      s.me.busy = p.busy;
      s.vr = vr;
      s.dark = this.lightsOut ? 1 : 0;
      s.prog = Math.round(this.taskProgress() * 100) / 100;
      s.ps = [];
      this.list().forEach(function (o) {
        if (o === p) return;
        var og = self.isGhost(o);
        if (og && (!ghost || o.ejected)) return;      // los fantasmas solo se ven entre fantasmas
        if (!og && !o.alive) return;
        if (dist(p, o) > vr + 20) return;
        s.ps.push([Math.round(o.x), Math.round(o.y), o.color, o.name, og ? 1 : 0, (p.role === 'imp' && o.role === 'imp') ? 1 : 0]);
      });
      s.bd = [];
      this.bodies.forEach(function (b) {
        if (dist(p, b) <= vr + 20) s.bd.push([Math.round(b.x), Math.round(b.y), self.players[b.id].color]);
      });
      var st = this.nearStation(p);
      var ft = this.freezeTarget(p);
      s.b = {
        use: st ? st.id : null,
        rep: this.bodyNear(p, CFG.reportRange) ? 1 : 0,
        frz: ft ? 1 : 0,
        sab: this.canSabotage(p) ? 1 : 0
      };
      if (p.role === 'imp' && !ghost) {
        s.b.fcd = Math.max(0, Math.ceil(p.freezeAt - this.now));
        s.b.scd = this.lightsOut ? 0 : Math.max(0, Math.ceil(p.sabAt - this.now));
      }
      return s;
    }
    if (this.phase === 'meeting') {
      var m = this.meeting;
      s.sub = m.sub;
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
