/* Mapa de la nave: salas, pasillos, estaciones, rejillas de ventilación, cámaras y red de caminos de los bots.
   Coordenadas del "mundo": 1600 x 840. Pasillos de 80 de ancho. */
(function (root) {
  var DEF_NAVE = {
    id: 'nave',
    name: 'map.nave',
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
      { id: 's2',  room: 'cafe',       x: 1020, y: 260, type: 'clean',     name: 'task.cleanWindow' },
      { id: 'em',  room: 'cafe',       x: 910,  y: 140, type: 'emergency', name: 'task.emergency' },
      { id: 'm1',  room: 'medbay',     x: 455,  y: 115, type: 'calibrate', name: 'task.medscan' },
      { id: 'm2',  room: 'medbay',     x: 590,  y: 210, type: 'numbers',   name: 'task.medkit' },
      { id: 'g1',  room: 'green',      x: 1255, y: 115, type: 'fill',      name: 'task.water' },
      { id: 'g2',  room: 'green',      x: 1390, y: 205, type: 'pipes',     name: 'task.irrigation' },
      { id: 's3',  room: 'engines',    x: 330,  y: 365, type: 'calibrate', name: 'task.calibrateEngine' },
      { id: 's5',  room: 'engines',    x: 510,  y: 540, type: 'fill',      name: 'task.fuelEngine' },
      { id: 's6',  room: 'bridge',     x: 1500, y: 380, type: 'maze',      name: 'task.course' },
      { id: 's7',  room: 'bridge',     x: 1370, y: 515, type: 'memory',    name: 'task.starPairs' },
      { id: 's8',  room: 'lab',        x: 650,  y: 635, type: 'sort',      name: 'task.samples' },
      { id: 's9',  room: 'lab',        x: 830,  y: 775, type: 'calibrate', name: 'task.scanner' },
      { id: 's10', room: 'storage',    x: 1050, y: 635, type: 'safe',      name: 'task.safe' },
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
      { id: 'c1', x: 910,  y: 175, room: 'cafe' },  { id: 'c2', x: 420,  y: 440, room: 'engines' },
      { id: 'c3', x: 820,  y: 430, room: 'hall' },  { id: 'c4', x: 740,  y: 700, room: 'lab' },
      { id: 'c5', x: 1140, y: 700, room: 'storage' }, { id: 'c6', x: 1420, y: 440, room: 'bridge' }
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

  // ---------- Segundo mapa: Base Abisal (base submarina con cúpula central y acuario) ----------
  var DEF_ABISAL = {
    id: 'abisal',
    name: 'map.abisal',
    w: 1640,
    h: 880,
    wallFace: 26,
    rooms: [
      { id: 'comms',    name: 'room.comms',    x: 360,  y: 60,  w: 160, h: 150 },
      { id: 'cafe',     name: 'room.cafe',     x: 560,  y: 40,  w: 300, h: 200 },
      { id: 'dorms',    name: 'room.dorms',    x: 900,  y: 60,  w: 190, h: 160 },
      { id: 'oxygen',   name: 'room.oxygen',   x: 1130, y: 60,  w: 180, h: 160 },
      { id: 'sonar',    name: 'room.sonar',    x: 340,  y: 240, w: 200, h: 140 },
      { id: 'biolab',   name: 'room.biolab',   x: 40,   y: 330, w: 240, h: 220 },
      { id: 'robotics', name: 'room.robotics', x: 340,  y: 520, w: 220, h: 160 },
      { id: 'trench',   name: 'room.trench',   x: 40,   y: 640, w: 240, h: 190 },
      { id: 'dome',     name: 'room.dome',     x: 640,  y: 300, w: 360, h: 300 },
      { id: 'foundry',  name: 'room.foundry',  x: 1100, y: 240, w: 200, h: 140 },
      { id: 'storage',  name: 'room.tools',    x: 1080, y: 520, w: 220, h: 160 },
      { id: 'reactor',  name: 'room.geo',      x: 1360, y: 320, w: 240, h: 240 },
      { id: 'pods',     name: 'room.pods',     x: 1360, y: 640, w: 220, h: 200 },
      { id: 'security', name: 'room.emergency', x: 470, y: 720, w: 170, h: 130 },
      { id: 'admin',    name: 'room.command',  x: 700,  y: 700, w: 240, h: 160 },
      { id: 'electrical', name: 'room.electrical', x: 1000, y: 720, w: 180, h: 130 }
    ],
    // Huecos que no se pisan (el acuario en medio de la cúpula)
    holes: [{ x: 720, y: 380, w: 200, h: 140 }],
    corridors: [
      { x: 280,  y: 410, w: 360, h: 80 },  // ala oeste
      { x: 1000, y: 410, w: 360, h: 80 },  // ala este
      { x: 760,  y: 240, w: 80,  h: 60 },  // comedor -> cúpula
      { x: 780,  y: 600, w: 80,  h: 100 }, // cúpula -> mando
      { x: 520,  y: 100, w: 40,  h: 80 },  // comedor -> comunicaciones
      { x: 860,  y: 100, w: 40,  h: 80 },  // comedor -> dormitorios
      { x: 1090, y: 100, w: 40,  h: 80 },  // dormitorios -> oxígeno
      { x: 400,  y: 210, w: 80,  h: 30 },  // comunicaciones -> sónar
      { x: 400,  y: 380, w: 80,  h: 30 },  // sónar -> ala oeste
      { x: 420,  y: 490, w: 80,  h: 30 },  // ala oeste -> robótica
      { x: 120,  y: 550, w: 80,  h: 90 },  // biología -> fosa
      { x: 480,  y: 680, w: 80,  h: 40 },  // robótica -> emergencias
      { x: 280,  y: 750, w: 190, h: 80 },  // fosa -> emergencias
      { x: 640,  y: 750, w: 60,  h: 80 },  // emergencias -> mando
      { x: 940,  y: 750, w: 60,  h: 80 },  // mando -> electricidad
      { x: 1180, y: 220, w: 80,  h: 20 },  // oxígeno -> fundición
      { x: 1160, y: 380, w: 80,  h: 30 },  // fundición -> ala este
      { x: 1140, y: 490, w: 80,  h: 30 },  // ala este -> herramientas
      { x: 1090, y: 680, w: 80,  h: 40 },  // herramientas -> electricidad
      { x: 1440, y: 560, w: 80,  h: 80 },  // reactor -> cápsulas
      { x: 1180, y: 750, w: 180, h: 80 }   // electricidad -> cápsulas
    ],
    stations: [
      { id: 'em',  room: 'cafe',     x: 710,  y: 110, type: 'emergency', name: 'task.emergency' },
      { id: 'k1',  room: 'cafe',     x: 595,  y: 205, type: 'wires',     name: 'task.wires' },
      { id: 'k2',  room: 'cafe',     x: 830,  y: 75,  type: 'clean',     name: 'task.cleanWindow' },
      { id: 'cm',  room: 'comms',    x: 395,  y: 95,  type: 'download',  name: 'task.comms' },
      { id: 'd1',  room: 'dorms',    x: 1055, y: 95,  type: 'safe',      name: 'task.lockers' },
      { id: 'o1',  room: 'oxygen',   x: 1165, y: 95,  type: 'clean',     name: 'task.oxyFilter' },
      { id: 'o2',  room: 'oxygen',   x: 1275, y: 190, type: 'pipes',     name: 'task.oxyPump' },
      { id: 'so',  room: 'sonar',    x: 505,  y: 275, type: 'calibrate', name: 'task.sonar' },
      { id: 'b1',  room: 'biolab',   x: 75,   y: 365, type: 'sort',      name: 'task.samples' },
      { id: 'b2',  room: 'biolab',   x: 245,  y: 515, type: 'fill',      name: 'task.fishFeed' },
      { id: 'ro',  room: 'robotics', x: 375,  y: 645, type: 'wires',     name: 'task.robot' },
      { id: 'tr',  room: 'trench',   x: 245,  y: 795, type: 'asteroids', name: 'task.trench' },
      { id: 'dm',  room: 'dome',     x: 960,  y: 330, type: 'simon',     name: 'task.domeLights' },
      { id: 'dk',  room: 'dome',     x: 680,  y: 570, type: 'card',      name: 'task.card' },
      { id: 'fo',  room: 'foundry',  x: 1135, y: 275, type: 'fill',      name: 'task.forge' },
      { id: 'st',  room: 'storage',  x: 1265, y: 645, type: 'sort',      name: 'task.boxes' },
      { id: 'rx',  room: 'reactor',  x: 1395, y: 355, type: 'reactor',   name: 'task.reactorFix' },
      { id: 'r2',  room: 'reactor',  x: 1565, y: 525, type: 'simon',     name: 'task.startReactor' },
      { id: 'pd',  room: 'pods',     x: 1545, y: 675, type: 'maze',      name: 'task.podPilot' },
      { id: 'cam', room: 'security', x: 545,  y: 750, type: 'cameras',   name: 'task.cameras' },
      { id: 'adm', room: 'admin',    x: 760,  y: 735, type: 'admin',     name: 'task.adminMap' },
      { id: 'a1',  room: 'admin',    x: 905,  y: 735, type: 'memory',    name: 'task.reports' },
      { id: 'lt',  room: 'electrical', x: 1035, y: 750, type: 'lights',  name: 'task.lights' },
      { id: 'e1',  room: 'electrical', x: 1145, y: 820, type: 'wires',   name: 'task.electricWires' }
    ],
    vents: [
      { id: 'vBi', net: 'A', x: 65,   y: 525 }, { id: 'vTr', net: 'A', x: 70,   y: 805 }, { id: 'vSo', net: 'A', x: 365,  y: 360 },
      { id: 'vCa', net: 'B', x: 585,  y: 65  }, { id: 'vCo', net: 'B', x: 495,  y: 190 }, { id: 'vDo', net: 'B', x: 1065, y: 200 },
      { id: 'vOx', net: 'C', x: 1285, y: 85  }, { id: 'vFo', net: 'C', x: 1275, y: 360 }, { id: 'vRe', net: 'C', x: 1575, y: 345 },
      { id: 'vSe', net: 'D', x: 615,  y: 830 }, { id: 'vRo', net: 'D', x: 535,  y: 660 }, { id: 'vDm', net: 'D', x: 965,  y: 575 },
      { id: 'vSt', net: 'E', x: 1105, y: 660 }, { id: 'vEl', net: 'E', x: 1030, y: 830 }, { id: 'vPo', net: 'E', x: 1385, y: 815 }
    ],
    cameras: [
      { id: 'c1', x: 710,  y: 150, room: 'cafe' },  { id: 'c2', x: 160,  y: 450, room: 'biolab' },
      { id: 'c3', x: 450,  y: 450, room: 'hall' },  { id: 'c4', x: 820,  y: 340, room: 'dome' },
      { id: 'c5', x: 1190, y: 450, room: 'hall' },  { id: 'c6', x: 1470, y: 440, room: 'reactor' }
    ],
    spawn: { x: 710, y: 175, r: 70 },
    nodes: {
      cafe: [710, 150], comms: [440, 135], dorms: [995, 140], oxygen: [1220, 140], sonar: [440, 310], biolab: [160, 440],
      robotics: [450, 600], trench: [160, 760], dome: [800, 340], foundry: [1200, 310], storage: [1190, 600], reactor: [1480, 440],
      pods: [1470, 760], admin: [820, 780], security: [555, 785], electrical: [1090, 785],
      jTop: [800, 270], jWc: [450, 450], jEc: [1190, 450], dW: [680, 450], dE: [960, 450], dNW: [680, 340], dNE: [960, 340],
      dSW: [680, 560], dSE: [960, 560], dS: [820, 560], jBot: [820, 650]
    },
    edges: [
      ['cafe', 'comms'], ['cafe', 'dorms'], ['dorms', 'oxygen'], ['cafe', 'jTop'], ['jTop', 'dome'],
      ['comms', 'sonar'], ['sonar', 'jWc'], ['jWc', 'biolab'], ['jWc', 'robotics'], ['jWc', 'dW'],
      ['dW', 'dNW'], ['dNW', 'dome'], ['dome', 'dNE'], ['dNE', 'dE'], ['dE', 'dSE'], ['dSE', 'dS'], ['dS', 'dSW'], ['dSW', 'dW'],
      ['dS', 'jBot'], ['jBot', 'admin'], ['admin', 'security'], ['admin', 'electrical'], ['security', 'robotics'],
      ['security', 'trench'], ['biolab', 'trench'], ['dE', 'jEc'], ['jEc', 'foundry'], ['jEc', 'storage'], ['jEc', 'reactor'],
      ['oxygen', 'foundry'], ['reactor', 'pods'], ['electrical', 'storage'], ['electrical', 'pods']
    ]
  };

  var MAP = {};
  var DEFS = { nave: DEF_NAVE, abisal: DEF_ABISAL };
  MAP.DEFS = DEFS;
  MAP.IDS = ['nave', 'abisal'];
  MAP.TASK_TYPES = ['wires', 'numbers', 'download', 'calibrate', 'card', 'asteroids', 'simon', 'pipes', 'memory', 'fill', 'clean', 'maze', 'sort', 'safe'];

  MAP.inRect = function (x, y) {
    for (var h = 0; h < MAP.holes.length; h++) {
      var o = MAP.holes[h];
      if (x > o.x && x < o.x + o.w && y > o.y && y < o.y + o.h) return false;
    }
    for (var i = 0; i < MAP.rects.length; i++) {
      var r = MAP.rects[i];
      if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return true;
    }
    return false;
  };
  // Rejilla rápida (celdas de 5) para calcular lo que se ve
  var CELL = 5, GW = 0, GH = 0, GRID = null;
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

  // Cambia de mapa. Todos los archivos usan el mismo objeto MAP, así que basta con rellenarlo.
  // Los mapas se diseñan a escala 1 ("base") y se agrandan al usarlos (SCALE). El dibujo se hace en coordenadas base
  // con el lienzo agrandado (MAP.withBase), así que todo se ve igual pero más grande que los personajes.
  var SCALE = { nave: 1.3, abisal: 1.3 };
  function sc(v, k) { return Math.round(v * k); }
  function scaleDef(d, k) {
    function R(r) { var o = {}; for (var q in r) o[q] = r[q]; o.x = sc(r.x, k); o.y = sc(r.y, k); if (r.w != null) { o.w = sc(r.w, k); o.h = sc(r.h, k); } return o; }
    var nodes = {}; for (var n in d.nodes) nodes[n] = [sc(d.nodes[n][0], k), sc(d.nodes[n][1], k)];
    return {
      id: d.id, name: d.name, w: sc(d.w, k), h: sc(d.h, k), wallFace: sc(d.wallFace, k),
      rooms: d.rooms.map(R), corridors: d.corridors.map(R), stations: d.stations.map(R), vents: d.vents.map(R),
      cameras: d.cameras.map(R), holes: (d.holes || []).map(R), labels: d.labels,
      spawn: { x: sc(d.spawn.x, k), y: sc(d.spawn.y, k), r: sc(d.spawn.r, k) }, nodes: nodes, edges: d.edges
    };
  }
  var FIELDS = ['id', 'name', 'w', 'h', 'wallFace', 'rooms', 'corridors', 'stations', 'vents', 'cameras', 'labels', 'spawn', 'nodes', 'edges', 'holes'];
  function load(src) {
    FIELDS.forEach(function (k) { MAP[k] = src[k]; });
    MAP.holes = src.holes || [];
    MAP.rects = MAP.rooms.concat(MAP.corridors);
  }
  var SCALED = {};
  MAP.use = function (id) {
    var d = DEFS[id] || DEF_NAVE;
    if (MAP.id === d.id) return false;
    MAP.scale = SCALE[d.id] || 1;
    MAP.base = d;
    load(SCALED[d.id] || (SCALED[d.id] = scaleDef(d, MAP.scale)));
    GW = Math.ceil(MAP.w / CELL) + 2; GH = Math.ceil(MAP.h / CELL) + 2; GRID = null;
    return true;
  };
  // Dibuja con la geometría base (sin agrandar). El que llama ya ha escalado el lienzo por MAP.scale.
  MAP.withBase = function (fn) {
    var cur = SCALED[MAP.id], k = MAP.scale;
    if (k === 1 || !cur) return fn();
    load(MAP.base); MAP.scale = 1;
    try { return fn(); } finally { load(cur); MAP.scale = k; }
  };
  MAP.use('nave');

  root.NAVE_MAP = MAP;
  if (typeof module !== 'undefined') module.exports = MAP;
})(typeof window !== 'undefined' ? window : globalThis);
