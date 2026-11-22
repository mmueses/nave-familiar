/* Mapa de la nave: salas, pasillos, estaciones de tareas y red de caminos para los bots.
   Coordenadas del "mundo": 1000 x 600. */
(function (root) {
  var MAP = {
    id: 'nave',
    w: 1000,
    h: 600,
    rooms: [
      { id: 'cafe',    name: 'room.cafe',    x: 380, y: 40,  w: 240, h: 190, floor: '#3b4a6b' },
      { id: 'engines', name: 'room.engines', x: 40,  y: 190, w: 190, h: 220, floor: '#4a3b5c' },
      { id: 'bridge',  name: 'room.bridge',  x: 770, y: 190, w: 190, h: 220, floor: '#2f5560' },
      { id: 'lab',     name: 'room.lab',     x: 230, y: 430, w: 220, h: 140, floor: '#2f5a45' },
      { id: 'storage', name: 'room.storage', x: 550, y: 430, w: 220, h: 140, floor: '#5c4b30' }
    ],
    corridors: [
      { x: 230, y: 272, w: 540, h: 56 },   // pasillo central horizontal
      { x: 472, y: 230, w: 56,  h: 42 },   // comedor -> pasillo
      { x: 312, y: 328, w: 56,  h: 102 },  // pasillo -> laboratorio
      { x: 632, y: 328, w: 56,  h: 102 }   // pasillo -> almacén
    ],
    // type: wires | numbers | download | calibrate | lights | emergency
    stations: [
      { id: 's1',  room: 'cafe',    x: 420, y: 80,  type: 'wires',     name: 'task.wires' },
      { id: 's2',  room: 'cafe',    x: 590, y: 195, type: 'download',  name: 'task.download' },
      { id: 'em',  room: 'cafe',    x: 500, y: 115, type: 'emergency', name: 'task.emergency' },
      { id: 's3',  room: 'engines', x: 80,  y: 230, type: 'calibrate', name: 'task.calibrateEngine' },
      { id: 'lt',  room: 'engines', x: 85,  y: 375, type: 'lights',    name: 'task.lights' },
      { id: 's5',  room: 'engines', x: 195, y: 375, type: 'wires',     name: 'task.wires' },
      { id: 's6',  room: 'bridge',  x: 920, y: 235, type: 'numbers',   name: 'task.course' },
      { id: 's7',  room: 'bridge',  x: 815, y: 380, type: 'download',  name: 'task.download' },
      { id: 's8',  room: 'lab',     x: 270, y: 470, type: 'numbers',   name: 'task.samples' },
      { id: 's9',  room: 'lab',     x: 415, y: 540, type: 'calibrate', name: 'task.scanner' },
      { id: 's10', room: 'storage', x: 590, y: 470, type: 'wires',     name: 'task.boxes' },
      { id: 's11', room: 'storage', x: 735, y: 540, type: 'download',  name: 'task.fuel' }
    ],
    spawn: { x: 500, y: 150, r: 55 },
    // Red de caminos (bots). Cada sala tiene un nodo central con el mismo id que la sala.
    nodes: {
      cafe: [500, 135], cafeDoor: [500, 255], jMid: [500, 300], jLeft: [340, 300], jRight: [660, 300],
      engDoor: [250, 300], engines: [135, 300], brDoor: [750, 300], bridge: [865, 300],
      labDoor: [340, 410], lab: [340, 500], stDoor: [660, 410], storage: [660, 500]
    },
    edges: [
      ['cafe', 'cafeDoor'], ['cafeDoor', 'jMid'], ['jMid', 'jLeft'], ['jMid', 'jRight'],
      ['jLeft', 'engDoor'], ['engDoor', 'engines'], ['jRight', 'brDoor'], ['brDoor', 'bridge'],
      ['jLeft', 'labDoor'], ['labDoor', 'lab'], ['jRight', 'stDoor'], ['stDoor', 'storage']
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
