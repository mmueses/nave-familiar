/* Panel de "Ajustes de partida" (como en Among Us). Lo usan la tele y el móvil que crea la partida. */
(function (root) {
  function fmt(d, v) {
    if (d.fmt === 'x') return v + 'x';
    if (d.fmt === 's') return v + ' s';
    if (d.fmt === 'opt') return t('opt.' + v);
    if (d.fmt === 'yn') return t('yn.' + v);
    return String(v);
  }
  // container: elemento; getSettings(): ajustes actuales; onSet(objeto con el cambio)
  function build(container, getSettings, onSet) {
    container.innerHTML = '';
    var rows = [];
    NaveGame.SETTINGS.forEach(function (d) {
      var row = document.createElement('div'); row.className = 'setRow';
      var lab = document.createElement('span'); lab.textContent = t('set.' + d.k);
      var minus = document.createElement('button'); minus.className = 'sec'; minus.textContent = '−';
      var val = document.createElement('b');
      var plus = document.createElement('button'); plus.className = 'sec'; plus.textContent = '+';
      function step(dir) {
        var cur = getSettings()[d.k], i = d.vals.indexOf(cur);
        var ni = Math.max(0, Math.min(d.vals.length - 1, i + dir));
        if (ni === i) return;
        var ch = {}; ch[d.k] = d.vals[ni]; onSet(ch);
      }
      minus.onclick = function () { step(-1); };
      plus.onclick = function () { step(1); };
      row.appendChild(lab); row.appendChild(minus); row.appendChild(val); row.appendChild(plus);
      container.appendChild(row);
      rows.push({ d: d, val: val, minus: minus, plus: plus });
    });
    var reset = document.createElement('button'); reset.className = 'sec'; reset.textContent = t('set.reset');
    reset.onclick = function () { var ch = {}; NaveGame.SETTINGS.forEach(function (d) { ch[d.k] = d.def; }); onSet(ch); };
    container.appendChild(reset);
    function refresh() {
      var s = getSettings();
      rows.forEach(function (r) {
        var i = r.d.vals.indexOf(s[r.d.k]);
        r.val.textContent = fmt(r.d, s[r.d.k]);
        r.minus.disabled = i <= 0; r.plus.disabled = i >= r.d.vals.length - 1;
      });
    }
    refresh();
    return refresh;
  }
  function load() { try { return JSON.parse(localStorage.getItem('nave.settings') || 'null'); } catch (e) { return null; } }
  function save(s) { try { localStorage.setItem('nave.settings', JSON.stringify(s)); } catch (e) {} }
  // Nivel del jugador: cuánta experiencia hace falta para pasar de cada nivel al siguiente
  function levelInfo(xp) {
    var level = 1, need = 40;
    while (xp >= need && level < 999) { xp -= need; level++; need = 40 + 20 * (level - 1); }
    return { level: level, into: xp, need: need };
  }
  root.AJUSTES = { build: build, load: load, save: save, fmt: fmt, levelInfo: levelInfo };
})(window);
