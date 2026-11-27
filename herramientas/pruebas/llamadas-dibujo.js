// Dibuja un mapa con un lienzo falso y escribe cada imagen que pinta (y dónde).
// Sirve para comprobar que un cambio NO altera otro mapa (p. ej. la 🚀 Nave congelada):
//   git stash; node herramientas/pruebas/llamadas-dibujo.js nave > /tmp/antes.txt; git stash pop
//   node herramientas/pruebas/llamadas-dibujo.js nave > /tmp/despues.txt; diff /tmp/antes.txt /tmp/despues.txt
// (La línea final «frontProps N» es solo informativa.)
var path = require('path'), J = path.join(__dirname, '..', '..', 'js');
var mapa = process.argv[2] || 'nave', log = [];
function ctx() {
  return new Proxy({}, { get: function (t, k) {
    if (k in t) return t[k]; if (k === 'canvas') return { width: 1, height: 1 };
    if (k === 'createPattern' || k === 'createRadialGradient' || k === 'createLinearGradient') return function () { return { addColorStop: function () {}, setTransform: function () {} }; };
    if (k === 'measureText') return function () { return { width: 10 }; };
    if (k === 'getTransform') return function () { return { a: 1 }; };
    return function () { if (k === 'drawImage') { var a = [].slice.call(arguments); log.push('img ' + (a[0] && a[0].src || 'canvas') + ' ' + a.slice(1).map(Math.round).join(',')); } };
  }, set: function (t, k, v) { t[k] = v; return true; } });
}
global.window = global; global.performance = { now: function () { return 0; } }; global.I18N = { lang: 'es' };
global.DOMMatrix = function () { var m = {}; ['scaleSelf', 'translateSelf', 'rotateSelf', 'multiplySelf'].forEach(function (k) { m[k] = function () { return m; }; }); return m; };
global.document = { createElement: function () { return { getContext: ctx, width: 0, height: 0 }; } };
global.Image = function () { var o = { complete: true, naturalWidth: 100, width: 100, height: 120 }; setTimeout(function () { o.onload && o.onload(); }, 0); return o; };
require(path.join(J, 'huellas.js')); require(path.join(J, 'map.js')); require(path.join(J, 'nave.js'));
setTimeout(function () {
  NAVE_MAP.use(mapa);
  SHIP.draw(ctx(), { t: 1, tr: function (k) { return k; }, res: 1 });
  if (SHIP.frontProps) log.push('frontProps ' + SHIP.frontProps([]).length);
  console.log(log.join('\n'));
}, 50);
