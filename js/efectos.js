/* Efectos de menús: confeti, nieve/escarcha. EFX.confetti(), EFX.snow() */
(function (root) {
  function layer(n, make, ms) {
    var L = document.createElement('div'); L.className = 'fxLayer'; document.body.appendChild(L);
    for (var i = 0; i < n; i++) L.appendChild(make(i));
    setTimeout(function () { if (L.parentNode) L.parentNode.removeChild(L); }, ms || 6000);
  }
  var COLS = ['#ff6b6b', '#ffe66b', '#57e389', '#6fb6ff', '#c58bff', '#ff9ad8', '#ffb347'];
  root.EFX = {
    confetti: function () {
      layer(40, function () {
        var e = document.createElement('i');
        e.style.left = (Math.random() * 100) + 'vw'; e.style.background = COLS[Math.floor(Math.random() * COLS.length)];
        e.style.setProperty('--dx', (Math.random() * 40 - 20) + 'vw'); e.style.setProperty('--r', (Math.random() * 1440 - 720) + 'deg');
        e.style.animationDuration = (2 + Math.random() * 1.6) + 's'; e.style.animationDelay = (Math.random() * 0.8) + 's';
        return e;
      });
    },
    snow: function () {
      layer(80, function () {
        var e = document.createElement('i'); e.className = 'snow';
        e.style.left = (Math.random() * 100) + 'vw'; var s = 5 + Math.random() * 9; e.style.width = e.style.height = s + 'px';
        e.style.setProperty('--dx', (Math.random() * 20 - 10) + 'vw'); e.style.setProperty('--r', '0deg');
        e.style.animationDuration = (3.5 + Math.random() * 3) + 's'; e.style.animationDelay = (Math.random() * 2) + 's';
        return e;
      }, 8000);
    }
  };
})(window);
