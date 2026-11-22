/* Mapa "Ciudadela de los Eones": el fondo es la imagen de la familia (img/ciudadela.webp).
   Aquí solo se añaden los carteles de las salas (tapan donde estaban los textos de la imagen) y algunos brillos animados. */
(function (root) {
  var MAP = root.NAVE_MAP, S = root.SHIP;
  if (!S) return;
  var U = S.U, K = 1.6;
  // [sala, x0, y0, x1, y1] en coordenadas de la imagen (donde estaban sus textos)
  var SIGNS = [
    ['topdock', 218, 86, 394, 154], ['dome', 413, 66, 612, 134], ['crystal', 781, 56, 1002, 126], ['forge', 1008, 112, 1150, 158],
    ['treasury', 1158, 234, 1314, 300], ['observatory', 60, 324, 252, 394], ['platform', 620, 326, 784, 380], ['voidlib', 400, 424, 576, 492],
    ['tower', 214, 460, 408, 528], ['dock', 140, 558, 312, 624], ['garden', 610, 600, 794, 668], ['alchemy', 828, 534, 1036, 602],
    ['sages', 1034, 474, 1172, 542]
  ];
  function wrap(c, text, maxW) {
    var words = text.split(' '), lines = [''];
    words.forEach(function (w) { var l = lines[lines.length - 1]; var tr = l ? l + ' ' + w : w; if (c.measureText(tr).width > maxW && l) lines.push(w); else lines[lines.length - 1] = tr; });
    return lines;
  }
  function decorate(c, tr) {
    SIGNS.forEach(function (s) {
      var r = MAP.room(s[0]); if (!r) return;
      var x = s[1] * K, y = s[2] * K, w = (s[3] - s[1]) * K, h = (s[4] - s[2]) * K;
      var label = tr ? tr(r.name) : r.name;
      c.font = 'bold 26px system-ui, sans-serif';
      var lines = wrap(c, label, w - 30);
      var bh = Math.max(h * 0.7, lines.length * 30 + 16), by = y + (h - bh) / 2;
      U.rr(c, x + 4, by + 6, w, bh, 14); c.fillStyle = 'rgba(0,0,0,0.45)'; c.fill();
      var g = c.createLinearGradient(0, by, 0, by + bh); g.addColorStop(0, '#3a2f5c'); g.addColorStop(1, '#221a3a');
      U.rr(c, x, by, w, bh, 14); c.fillStyle = g; c.fill(); c.lineWidth = 4; c.strokeStyle = '#1a1a2e'; c.stroke();
      U.rr(c, x + 5, by + 5, w - 10, bh - 10, 10); c.lineWidth = 2.5; c.strokeStyle = '#c9a8ff'; c.stroke();
      c.fillStyle = '#f4ecff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      lines.forEach(function (ln, i) { c.fillText(ln, x + w / 2, by + bh / 2 + (i - (lines.length - 1) / 2) * 30); });
    });
  }
  function animDecor(c, t, opts) {
    var i;
    // destellos de los cristales y del portal
    [[891, 175, '#ff9ad8'], [1090, 455, '#7ffff0'], [1235, 395, '#7fff9a'], [488, 548, '#d07fff'], [705, 98, '#9fd8ff']].forEach(function (p, k) {
      var x = p[0] * K, y = p[1] * K, a = 0.25 + 0.2 * Math.sin(t * 2 + k);
      var g = c.createRadialGradient(x, y, 2, x, y, 70); g.addColorStop(0, p[2]); g.addColorStop(1, 'rgba(0,0,0,0)');
      c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, 70, 0, Math.PI * 2); c.fill(); c.globalAlpha = 1;
    });
    // chispas que suben en la forja
    for (i = 0; i < 8; i++) { var ph = (t * 0.6 + i / 8) % 1; U.circ(c, (1075 + Math.sin(i * 2.3) * 30) * K, (255 - ph * 60) * K, 2.5, 'rgba(255,190,80,' + (1 - ph) + ')'); }
    // lucecitas del jardín
    for (i = 0; i < 10; i++) { U.circ(c, (630 + (i * 37) % 150) * K, (530 + (i * 53) % 120) * K + Math.sin(t * 2 + i) * 6, 2.5, 'rgba(160,255,180,' + (0.4 + 0.4 * Math.sin(t * 3 + i)) + ')'); }
    // rombo de la plataforma de invocación
    c.strokeStyle = 'rgba(200,140,255,' + (0.35 + 0.25 * Math.sin(t * 2)) + ')'; c.lineWidth = 5;
    c.beginPath(); c.moveTo(600 * K, 368 * K); c.lineTo(700 * K, 330 * K); c.lineTo(800 * K, 368 * K); c.lineTo(700 * K, 410 * K); c.closePath(); c.stroke();
    if (opts.reactor) { c.fillStyle = 'rgba(255,40,40,' + (0.15 + 0.1 * Math.sin(t * 10)) + ')'; c.fillRect(985 * K, 170 * K, 175 * K, 160 * K); }
  }
  S.SKINS.ciudadela = { void: '#100f1c', image: true, decorate: decorate, animDecor: animDecor };
})(window);
