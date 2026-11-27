// Juega partidas enteras solo con bots (1 persona quieta) y cuenta si algún bot vivo pisa un mueble o se atasca.
// Uso: node herramientas/pruebas/simular-partidas.js [mapa] [número de partidas]   (por defecto: nave2 12)
global.window = undefined;
var path = require('path'), J = path.join(__dirname, '..', '..', 'js');
require(path.join(J, 'huellas.js'));
var MAP = require(path.join(J, 'map.js'));
var Game = require(path.join(J, 'game.js')).Game;
var mapa = process.argv[2] || 'nave2', N = +process.argv[3] || 12, res = {}, pisadas = 0, atascos = 0, t0 = Date.now();
for (var g = 0; g < N; g++) {
  var G = new Game(); G.join('h1', 'Prueba', null, 1);
  G.setSettings({ map: mapa, total: 8, botLevel: ['easy', 'normal', 'hard'][g % 3], impostors: 1 + (g % 2) });
  G.start();
  var tt = 0, last = {}, quieto = {};
  while (G.phase !== 'end' && tt < 1200) {
    G.tick(0.05); tt += 0.05;
    if (G.phase === 'play') G.list().forEach(function (p) {
      if (!p.bot || p.vent || G.isGhost(p)) return;
      if (MAP.hitsProp(p.x, p.y)) pisadas++;
      var m = last[p.id] && Math.hypot(p.x - last[p.id][0], p.y - last[p.id][1]); last[p.id] = [p.x, p.y];
      if (p.ai && p.ai.path && p.ai.path.length && m < 0.01) quieto[p.id] = (quieto[p.id] || 0) + 1;
    });
  }
  var r = G.endRes ? G.endRes.winner + '/' + G.endRes.reason : 'sin terminar';
  res[r] = (res[r] || 0) + 1;
  atascos += Object.keys(quieto).filter(function (k) { return quieto[k] > 200; }).length;
}
console.log(mapa, JSON.stringify(res), '· momentos de bots pisando algo:', pisadas, '· bots atascados:', atascos, '·', (Date.now() - t0) / 1000, 's');
