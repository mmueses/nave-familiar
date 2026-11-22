/* Mapa de la nave: salas, pasillos, estaciones, rejillas de ventilación, cámaras y red de caminos de los bots.
   Coordenadas del "mundo": 1600 x 840. Pasillos de 80 de ancho. */
(function (root) {
  var MAP = {
    id: 'nave',
    w: 1600,
    h: 840,
    wallFace: 26,   // alto del "frente" de las paredes (solo dibujo)
    rooms: [
      { id: 'reactor',    name: 'room.reactor',    x: 30,   y: 350, w: 200, h: 200, floor: '#4a2f3a' },
      { id: 'engines',    name: 'room.engines',    x: 300,  y: 330, w: 240, h: 240, floor: '#4a3b5c' },
      { id: 'medbay',     name: 'room.medbay',     x: 420,  y: 80,  w: 200, h: 160, floor: '#3e5d6e' },
      { id: 'security',   name: 'room.security',   x: 580,  y: 250, w: 170, h: 110, floor: '#3a3f55' },
      { id: 'cafe',       name: 'room.cafe',       x: 760,  y: 50,  w: 300, h: 240, floor: '#3b4a6b' },
      { id: 'admin',      name: 'room.admin',      x: 1080, y: 250, w: 170, h: 110, floor: '#4a4a35' },
      { id: 'green',      name: 'room.green',      x: 1220, y: 80,  w: 200, h: 160, floor: '#3d5a32' },
      { id: 'bridge',     name: 'room.bridge',     x: 1340, y: 340, w: 200, h: 200, floor: '#2f5560' },
      { id: 'electrical', name: 'room.electrical', x: 300,  y: 640, w: 210, h: 160, floor: '#4d4630' },
      { id: 'lab',        name: 'room.lab',        x: 620,  y: 600, w: 240, h: 200, floor: '#3f5e57' },
      { id: 'storage',    name: 'room.storage',    x: 1020, y: 600, w: 240, h: 200, floor: '#5c4b30' },
      { id: 'weapons',    name: 'room.weapons',    x: 1360, y: 600, w: 180, h: 180, floor: '#3b3550' }
    ],
    corridors: [
      { x: 540,  y: 390, w: 800, h: 80 },  // pasillo central
      { x: 230,  y: 390, w: 70,  h: 80 },  // reactor -> motores
      { x: 870,  y: 290, w: 80,  h: 100 }, // comedor -> pasillo
      { x: 640,  y: 360, w: 80,  h: 30 },  // seguridad -> pasillo
      { x: 1130, y: 360, w: 80,  h: 30 },  // administración -> pasillo
      { x: 700,  y: 470, w: 80,  h: 130 }, // pasillo -> laboratorio
      { x: 1100, y: 470, w: 80,  h: 130 }, // pasillo -> almacén
      { x: 620,  y: 130, w: 140, h: 80 },  // enfermería -> comedor
      { x: 1060, y: 130, w: 160, h: 80 },  // comedor -> invernadero
      { x: 440,  y: 240, w: 80,  h: 90 },  // enfermería -> motores
      { x: 1340, y: 240, w: 80,  h: 100 }, // invernadero -> puente
      { x: 380,  y: 570, w: 80,  h: 70 },  // motores -> electricidad
      { x: 510,  y: 680, w: 110, h: 80 },  // electricidad -> laboratorio
      { x: 1410, y: 540, w: 80,  h: 60 },  // puente -> armas
      { x: 1260, y: 660, w: 100, h: 80 }   // almacén -> armas
    ],
    // Tipos de tarea (minijuegos): wires, numbers, download, calibrate, card, asteroids, simon
    // Especiales: emergency (reunión), lights (luces), reactor (arreglar reactor), cameras, admin
    stations: [
      { id: 's1',  room: 'cafe',       x: 800,  y: 95,  type: 'wires',     name: 'task.wires' },
      { id: 's2',  room: 'cafe',       x: 1020, y: 260, type: 'download',  name: 'task.download' },
      { id: 'em',  room: 'cafe',       x: 910,  y: 140, type: 'emergency', name: 'task.emergency' },
      { id: 'm1',  room: 'medbay',     x: 455,  y: 115, type: 'calibrate', name: 'task.medscan' },
      { id: 'm2',  room: 'medbay',     x: 590,  y: 210, type: 'numbers',   name: 'task.medkit' },
      { id: 'g1',  room: 'green',      x: 1255, y: 115, type: 'download',  name: 'task.water' },
      { id: 'g2',  room: 'green',      x: 1390, y: 205, type: 'wires',     name: 'task.growlights' },
      { id: 's3',  room: 'engines',    x: 330,  y: 365, type: 'calibrate', name: 'task.calibrateEngine' },
      { id: 's5',  room: 'engines',    x: 510,  y: 540, type: 'download',  name: 'task.fuelEngine' },
      { id: 's6',  room: 'bridge',     x: 1500, y: 380, type: 'numbers',   name: 'task.course' },
      { id: 's7',  room: 'bridge',     x: 1370, y: 515, type: 'download',  name: 'task.download' },
      { id: 's8',  room: 'lab',        x: 650,  y: 635, type: 'numbers',   name: 'task.samples' },
      { id: 's9',  room: 'lab',        x: 830,  y: 775, type: 'calibrate', name: 'task.scanner' },
      { id: 's10', room: 'storage',    x: 1050, y: 635, type: 'wires',     name: 'task.boxes' },
      { id: 's11', room: 'storage',    x: 1230, y: 775, type: 'download',  name: 'task.fuel' },
      { id: 'lt',  room: 'electrical', x: 330,  y: 670, type: 'lights',    name: 'task.lights' },
      { id: 'e1',  room: 'electrical', x: 480,  y: 775, type: 'wires',     name: 'task.electricWires' },
      { id: 'rx',  room: 'reactor',    x: 60,   y: 380, type: 'reactor',   name: 'task.reactorFix' },
      { id: 'r1',  room: 'reactor',    x: 60,   y: 520, type: 'simon',     name: 'task.startReactor' },
      { id: 'cam', room: 'security',   x: 630,  y: 280, type: 'cameras',   name: 'task.cameras' },
      { id: 'adm', room: 'admin',      x: 1140, y: 290, type: 'admin',     name: 'task.adminMap' },
      { id: 'a1',  room: 'admin',      x: 1225, y: 290, type: 'card',      name: 'task.card' },
      { id: 'w1',  room: 'weapons',    x: 1450, y: 690, type: 'asteroids', name: 'task.asteroids' }
    ],
    // Rejillas de ventilación (solo el impostor). Las de la misma red están conectadas.
    vents: [
      { id: 'vR',  net: 'A', x: 190,  y: 380 }, { id: 'vE',  net: 'A', x: 510,  y: 365 }, { id: 'vEl', net: 'A', x: 330,  y: 775 },
      { id: 'vM',  net: 'B', x: 590,  y: 120 }, { id: 'vS',  net: 'B', x: 725,  y: 285 }, { id: 'vL',  net: 'B', x: 650,  y: 775 },
      { id: 'vC',  net: 'C', x: 1020, y: 145 }, { id: 'vA',  net: 'C', x: 1232, y: 345 }, { id: 'vG',  net: 'C', x: 1245, y: 215 },
      { id: 'vB',  net: 'D', x: 1505, y: 500 }, { id: 'vW',  net: 'D', x: 1395, y: 750 }, { id: 'vSt', net: 'D', x: 1120, y: 780 }
    ],
    // Cámaras de seguridad (se ven desde la sala de Seguridad)
    cameras: [
      { id: 'c1', x: 265,  y: 430 }, { id: 'c2', x: 800,  y: 430 },
      { id: 'c3', x: 1260, y: 430 }, { id: 'c4', x: 565,  y: 720 }
    ],
    labels: {
      reactor: [130, 372], engines: [420, 352], medbay: [520, 100], security: [622, 345], cafe: [910, 276],
      admin: [1155, 352], green: [1335, 100], bridge: [1440, 360], electrical: [405, 656], lab: [740, 618],
      storage: [1140, 618], weapons: [1450, 620]
    },
    spawn: { x: 910, y: 200, r: 70 },
    // Red de caminos (bots). Todas las uniones son líneas rectas que no atraviesan paredes.
    nodes: {
      reactor: [130, 430], engines: [420, 430], medbay: [480, 160], security: [680, 330], cafe: [910, 170],
      admin: [1170, 335], green: [1380, 160], bridge: [1400, 430], electrical: [420, 720], lab: [740, 700],
      storage: [1140, 700], weapons: [1450, 700],
      mDoor: [480, 285], jSec: [680, 430], jL: [740, 430], jMid: [910, 430], jR: [1140, 430], jAdm: [1170, 430]
    },
    edges: [
      ['cafe', 'medbay'], ['cafe', 'green'], ['medbay', 'mDoor'], ['mDoor', 'engines'], ['green', 'bridge'], ['cafe', 'jMid'],
      ['engines', 'jSec'], ['jSec', 'jL'], ['jL', 'jMid'], ['jMid', 'jR'], ['jR', 'jAdm'], ['jAdm', 'bridge'],
      ['jSec', 'security'], ['jAdm', 'admin'], ['jL', 'lab'], ['jR', 'storage'],
      ['reactor', 'engines'], ['engines', 'electrical'], ['electrical', 'lab'], ['bridge', 'weapons'], ['storage', 'weapons']
    ]
  };

  MAP.rects = MAP.rooms.concat(MAP.corridors);
  MAP.TASK_TYPES = ['wires', 'numbers', 'download', 'calibrate', 'card', 'asteroids', 'simon'];

  MAP.inRect = function (x, y) {
    for (var i = 0; i < MAP.rects.length; i++) {
      var r = MAP.rects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
    }
    return false;
  };
  // Rejilla rápida (celdas de 5) para calcular lo que se ve
  var CELL = 5, GW = Math.ceil(MAP.w / CELL) + 2, GH = Math.ceil(MAP.h / CELL) + 2, GRID = null;
  MAP.open = function (x, y) {
    if (!GRID) {
      GRID = new Uint8Array(GW * GH);
      for (var gy = 0; gy < GH; gy++) for (var gx = 0; gx < GW; gx++) GRID[gy * GW + gx] = MAP.inRect(gx * CELL + CELL / 2, gy * CELL + CELL / 2) ? 1 : 0;
    }
    var cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
    if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return false;
    return GRID[cy * GW + cx] === 1;
  };
  // ¿Hay línea de visión entre dos puntos? (sin paredes en medio)
  MAP.clear = function (ax, ay, bx, by) {
    var d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 6);
    for (var i = 1; i < n; i++) {
      if (!MAP.open(ax + (bx - ax) * i / n, ay + (by - ay) * i / n)) return false;
    }
    return true;
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
  MAP.vent = function (id) {
    for (var i = 0; i < MAP.vents.length; i++) if (MAP.vents[i].id === id) return MAP.vents[i];
    return null;
  };
  // Tramos del borde superior de una sala/pasillo que son pared (sin hueco de puerta)
  MAP.topWalls = function (r) {
    var segs = [[r.x, r.x + r.w]];
    MAP.rects.forEach(function (o) {
      if (o === r) return;
      if (!(o.y < r.y && o.y + o.h >= r.y)) return;   // algo que toca el borde superior desde arriba
      var a = Math.max(o.x, r.x), b = Math.min(o.x + o.w, r.x + r.w);
      if (b <= a) return;
      var out = [];
      segs.forEach(function (sg) {
        if (b <= sg[0] || a >= sg[1]) { out.push(sg); return; }
        if (a > sg[0]) out.push([sg[0], a]);
        if (b < sg[1]) out.push([b, sg[1]]);
      });
      segs = out;
    });
    return segs;
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
