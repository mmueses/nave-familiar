/* Camino de "rebote": los mensajes de la partida pasan por servidores MQTT públicos, cifrados con el código de sala.
   No necesita conexión directa entre aparatos (sirve aunque el router la impida o un aparato use datos móviles).
   Cliente MQTT 3.1.1 mínimo sobre WebSocket: CONNECT, SUBSCRIBE, PUBLISH (QoS 0) y PING. */
(function (root) {
  var enc = new TextEncoder(), dec = new TextDecoder();
  var BROKERS = ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];

  function str(s) { var b = enc.encode(s); return concat([new Uint8Array([b.length >> 8, b.length & 255]), b]); }
  function concat(list) {
    var n = 0; list.forEach(function (a) { n += a.length; });
    var out = new Uint8Array(n), o = 0; list.forEach(function (a) { out.set(a, o); o += a.length; }); return out;
  }
  function packet(type, body) {
    var len = body.length, lb = [];
    do { var d = len % 128; len = Math.floor(len / 128); if (len > 0) d |= 128; lb.push(d); } while (len > 0);
    return concat([new Uint8Array([type]), new Uint8Array(lb), body]);
  }

  // Una conexión a un servidor MQTT. on: { open(), msg(topic, bytes), close() }
  function Client(url, on) {
    var self = this, ws, buf = new Uint8Array(0), ping = null, pid = 1, closed = false;
    this.ok = false;
    try { ws = new WebSocket(url, ['mqtt']); } catch (e) { setTimeout(function () { on.close(); }, 10); this.ws = null; return; }
    this.ws = ws;
    ws.binaryType = 'arraybuffer';
    ws.onopen = function () {
      var id = 'tso' + Math.random().toString(36).slice(2, 12);
      ws.send(packet(0x10, concat([str('MQTT'), new Uint8Array([4, 2, 0, 30]), str(id)])));
    };
    ws.onmessage = function (ev) {
      buf = concat([buf, new Uint8Array(ev.data)]);
      for (;;) {
        if (buf.length < 2) return;
        var mul = 1, len = 0, i = 1, d;
        do { if (i >= buf.length) return; d = buf[i++]; len += (d & 127) * mul; mul *= 128; } while (d & 128);
        if (buf.length < i + len) return;
        var type = buf[0] >> 4, body = buf.subarray(i, i + len);
        buf = buf.slice(i + len);
        if (type === 2) {   // CONNACK
          if (body[1] !== 0) { self.close(); return; }
          self.ok = true;
          ping = setInterval(function () { try { ws.send(new Uint8Array([0xC0, 0])); } catch (e) {} }, 20000);
          on.open();
        } else if (type === 3) {   // PUBLISH (QoS 0)
          var tl = (body[0] << 8) | body[1];
          on.msg(dec.decode(body.subarray(2, 2 + tl)), body.slice(2 + tl));
        }
      }
    };
    ws.onclose = ws.onerror = function () { if (closed) return; closed = true; self.ok = false; clearInterval(ping); on.close(); };
    this.sub = function (topic) {
      var p = pid++;
      try { ws.send(packet(0x82, concat([new Uint8Array([p >> 8, p & 255]), str(topic), new Uint8Array([0])]))); } catch (e) {}
    };
    this.pub = function (topic, bytes) { try { ws.send(packet(0x30, concat([str(topic), bytes]))); } catch (e) {} };
    this.close = function () { if (closed) return; closed = true; self.ok = false; clearInterval(ping); try { ws.close(); } catch (e) {} on.close(); };
  }

  // Clave y temas a partir del código de sala (los que no saben el código no pueden leer los mensajes)
  function keys(app, code) {
    var sub = crypto.subtle;
    return sub.digest('SHA-256', enc.encode(app + '|' + code)).then(function (h) {
      var hex = Array.prototype.map.call(new Uint8Array(h), function (b) { return ('0' + b.toString(16)).slice(-2); }).join('');
      return sub.importKey('raw', enc.encode(app + '#' + code + '#clave'), 'PBKDF2', false, ['deriveKey']).then(function (base) {
        return sub.deriveKey({ name: 'PBKDF2', salt: enc.encode(hex.slice(0, 16)), iterations: 20000, hash: 'SHA-256' },
          base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      }).then(function (key) { return { base: 'tso1/' + hex.slice(16, 40), key: key }; });
    });
  }
  function seal(key, obj) {
    var iv = crypto.getRandomValues(new Uint8Array(12));
    return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(JSON.stringify(obj)))
      .then(function (c) { return concat([iv, new Uint8Array(c)]); });
  }
  function open(key, bytes) {
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: bytes.subarray(0, 12) }, key, bytes.subarray(12))
      .then(function (p) { return JSON.parse(dec.decode(p)); });
  }
  // Envíos en orden (el cifrado es asíncrono)
  function Sender(cli, topic, key) {
    var q = Promise.resolve();
    return function (obj) { q = q.then(function () { return seal(key, obj); }).then(function (b) { cli.pub(topic, b); }).catch(function () {}); };
  }

  root.REBOTE = { Client: Client, keys: keys, seal: seal, open: open, Sender: Sender, BROKERS: BROKERS };
})(window);
