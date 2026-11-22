/* Mapa de la nave: salas, pasillos, estaciones de tareas y red de caminos para los bots.
   Coordenadas del "mundo": 1200 x 740. */
(function (root) {
  var MAP = {
    id: 'nave',
    w: 1200,
    h: 740,
    rooms: [
      { id: 'cafe',    name: 'room.cafe',    x: 470, y: 40,  w: 260, h: 210, floor: '#3b4a6b' },
      { id: 'medbay',  name: 'room.medbay',  x: 160, y: 60,  w: 170, h: 140, floor: '#3e5d6e' },
      { id: 'green',   name: 'room.green',   x: 900, y: 60,  w: 170, h: 140, floor: '#3d5a32' },
      { id: 'engines', name: 'room.engines', x: 40,  y: 240, w: 210, h: 230, floor: '#4a3b5c' },
      { id: 'bridge',  name: 'room.bridge',  x: 990, y: 270, w: 170, h: 180, floor: '#2f5560' },
      { id: 'lab',     name: 'room.lab',     x: 300, y: 520, w: 220, h: 180, floor: '#3f5e57' },
      { id: 'storage', name: 'room.storage', x: 680, y: 520, w: 220, h: 180, floor: '#5c4b30' }
    ],
    corridors: [
      { x: 250, y: 330, w: 740, h: 56 },   // pasillo central
      { x: 572, y: 250, w: 56,  h: 80 },   // comedor -> pasillo
      { x: 382, y: 386, w: 56,  h: 134 },  // pasillo -> laboratorio
      { x: 762, y: 386, w: 56,  h: 134 },  // pasillo -> almacén
      { x: 330, y: 105, w: 140, h: 56 },   // enfermería -> comedor
      { x: 730, y: 105, w: 170, h: 56 },   // comedor -> invernadero
      { x: 180, y: 200, w: 56,  h: 40 },   // enfermería -> motores
      { x: 1000, y: 200, w: 56, h: 70 }    // invernadero -> puente
    ],
    // type: wires | numbers | download | calibrate | lights | emergency
    stations: [
      { id: 's1',  room: 'cafe',    x: 505,  y: 75,  type: 'wires',     name: 'task.wires' },
      { id: 's2',  room: 'cafe',    x: 700,  y: 225, type: 'download',  name: 'task.download' },
      { id: 'em',  room: 'cafe',    x: 600,  y: 120, type: 'emergency', name: 'task.emergency' },
      { id: 'm1',  room: 'medbay',  x: 200,  y: 95,  type: 'calibrate', name: 'task.medscan' },
      { id: 'm2',  room: 'medbay',  x: 300,  y: 175, type: 'numbers',   name: 'task.medkit' },
      { id: 'g1',  room: 'green',   x: 935,  y: 95,  type: 'download',  name: 'task.water' },
      { id: 'g2',  room: 'green',   x: 1040, y: 175, type: 'wires',     name: 'task.growlights' },
      { id: 's3',  room: 'engines', x: 75,   y: 275, type: 'calibrate', name: 'task.calibrateEngine' },
      { id: 'lt',  room: 'engines', x: 75,   y: 440, type: 'lights',    name: 'task.lights' },
      { id: 's5',  room: 'engines', x: 220,  y: 440, type: 'wires',     name: 'task.wires' },
      { id: 's6',  room: 'bridge',  x: 1130, y: 310, type: 'numbers',   name: 'task.course' },
      { id: 's7',  room: 'bridge',  x: 1025, y: 425, type: 'download',  name: 'task.download' },
      { id: 's8',  room: 'lab',     x: 335,  y: 555, type: 'numbers',   name: 'task.samples' },
      { id: 's9',  room: 'lab',     x: 490,  y: 670, type: 'calibrate', name: 'task.scanner' },
      { id: 's10', room: 'storage', x: 715,  y: 555, type: 'wires',     name: 'task.boxes' },
      { id: 's11', room: 'storage', x: 870,  y: 670, type: 'download',  name: 'task.fuel' }
    ],
    spawn: { x: 600, y: 180, r: 60 },
    // Red de caminos (bots). Cada sala tiene un nodo central con el mismo id que la sala.
    // Todas las uniones son líneas rectas que no atraviesan paredes.
    nodes: {
      cafe: [600, 145], medbay: [245, 130], green: [985, 130], engines: [145, 357],
      bridge: [1075, 360], lab: [410, 610], storage: [790, 610],
      jL: [410, 358], jMid: [600, 358], jR: [790, 358]
    },
    edges: [
      ['cafe', 'medbay'], ['cafe', 'green'], ['medbay', 'engines'], ['green', 'bridge'],
      ['cafe', 'jMid'], ['jMid', 'jL'], ['jMid', 'jR'], ['jL', 'engines'], ['jR', 'bridge'],
      ['jL', 'lab'], ['jR', 'storage']
    ]
  };

  MAP.rects = MAP.rooms.concat(MAP.corridors);

  MAP.inRect = function (x, y) {
    for (var i = 0; i < MAP.rects.length; i++) {
      var r = MAP.rects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
    }
    return false;
  };
  // Un personaje (radio r) cabe si sus 4 esquinas están dentro de alguna zona transitable.
  MAP.walkable = function (x, y, r) {
    r = r || 10;
    return MAP.inRect(x - r, y - r) && MAP.inRect(x + r, y - r) &&
           MAP.inRect(x - r, y + r) && MAP.inRect(x + r, y + r);
  };
  MAP.roomAt = function (x, y) {
    for (var i = 0; i < MAP.rooms.length; i++) {
      var r = MAP.rooms[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return r.id;
    }
    return null;
  };
  MAP.room = function (id) {
    for (var i = 0; i < MAP.rooms.length; i++) if (MAP.rooms[i].id === id) return MAP.rooms[i];
    return null;
  };
  MAP.station = function (id) {
    for (var i = 0; i < MAP.stations.length; i++) if (MAP.stations[i].id === id) return MAP.stations[i];
    return null;
  };

  // Camino más corto entre dos nodos (Dijkstra sencillo; la red es pequeña).
  MAP.path = function (from, to) {
    var dist = {}, prev = {}, todo = [];
    for (var n in MAP.nodes) { dist[n] = Infinity; todo.push(n); }
    dist[from] = 0;
    while (todo.length) {
      todo.sort(function (a, b) { return dist[a] - dist[b]; });
      var u = todo.shift();
      if (u === to) break;
      MAP.edges.forEach(function (e) {
        var v = e[0] === u ? e[1] : (e[1] === u ? e[0] : null);
        if (!v || todo.indexOf(v) < 0) return;
        var a = MAP.nodes[u], b = MAP.nodes[v];
        var d = dist[u] + Math.hypot(a[0] - b[0], a[1] - b[1]);
        if (d < dist[v]) { dist[v] = d; prev[v] = u; }
      });
    }
    var p = [to];
    while (p[0] !== from) { p.unshift(prev[p[0]]); if (p[0] === undefined) return [from]; }
    return p;
  };

  root.NAVE_MAP = MAP;
  if (typeof module !== 'undefined') module.exports = MAP;
})(typeof window !== 'undefined' ? window : globalThis);
