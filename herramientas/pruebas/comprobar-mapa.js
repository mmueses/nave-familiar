// Comprueba un mapa con muebles que chocan (p. ej. la Nave (pruebas)).
// Uso: node herramientas/pruebas/comprobar-mapa.js [mapa]      (por defecto: nave2)
// Mira: apariciones encima de un mueble, tareas que no se alcanzan, rejillas tapadas,
// y caminos de bots entre todas las salas (que existan y que no pisen nada).
var path = require('path'), J = path.join(__dirname, '..', '..', 'js');
require(path.join(J, 'huellas.js'));
var MAP = require(path.join(J, 'map.js'));
var id = process.argv[2] || 'nave2';
MAP.use(id);
console.log('Mapa', id, '— cosas que chocan:', (MAP.drawables || []).length, '· formas:', MAP.obstacles.length);
var mal = 0;
for (var i = 0; i < 8; i++) {
  var a = i / 8 * Math.PI * 2, x = MAP.spawn.x + Math.cos(a) * MAP.spawn.r, y = MAP.spawn.y + Math.sin(a) * MAP.spawn.r * 0.6;
  if (!MAP.walkable(x, y, 10)) mal++;
}
console.log('Apariciones encima de algo (el juego las aparta solo):', mal, 'de 8');
var sp = MAP.nearestWalkable(MAP.spawn.x, MAP.spawn.y, 10), problemas = 0;
MAP.stations.forEach(function (s) {
  var p = MAP.findPath(sp.x, sp.y, s.x, s.y), e = p && p[p.length - 1], d = e ? Math.hypot(e.x - s.x, e.y - s.y) : 999;
  if (d > 54) { problemas++; console.log('  TAREA QUE NO SE ALCANZA:', s.id, s.room, 'se queda a', Math.round(d)); }
});
console.log('Tareas:', MAP.stations.length, '· con problema:', problemas);
MAP.vents.forEach(function (v) { if (!MAP.walkable(v.x, v.y, 10)) console.log('  REJILLA TAPADA:', v.id); });
var nodes = Object.keys(MAP.nodes), fallos = 0, n = 0, t0 = Date.now();
nodes.forEach(function (a) { nodes.forEach(function (b) {
  n++; var A = MAP.nearestWalkable(MAP.nodes[a][0], MAP.nodes[a][1], 10), p = MAP.findPath(A.x, A.y, MAP.nodes[b][0], MAP.nodes[b][1]);
  if (!p) { fallos++; console.log('  SIN CAMINO', a, '→', b); return; }
  var cur = A;
  p.forEach(function (q) { var d = Math.hypot(q.x - cur.x, q.y - cur.y), k = Math.ceil(d / 3);
    for (var i = 1; i <= k; i++) if (MAP.hitsProp(cur.x + (q.x - cur.x) * i / k, cur.y + (q.y - cur.y) * i / k)) { fallos++; console.log('  CAMINO PISA ALGO', a, '→', b); break; }
    cur = q; });
}); });
console.log('Caminos de bots:', n, '· fallos:', fallos, '·', Math.round((Date.now() - t0) / n), 'ms cada uno');
