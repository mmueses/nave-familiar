# Zona de choque de cada mueble = la huella que deja en el SUELO (26-11, regla del usuario).
# - Base redonda (papelera, maceta, cúpula...): se mide la curva del borde de abajo del dibujo y se
#   completa el óvalo entero. Ese óvalo es lo que choca.
# - Base recta (máquina, taquilla...): rectángulo que sale de la línea de abajo, con un fondo
#   proporcional al ancho.
# Todo lo que queda por encima de la huella no choca: el mueble tapa al personaje que pasa por detrás.
# Cada pieza tiene una lista de 'formas' (elipse o caja con 'caja': [izq, arriba, der, abajo], o
# poligono con 'puntos'), en fracciones de la imagen; el mueble se dibuja con su base en (x, y) y ancho w.
import json, sys, glob, os
from PIL import Image
FONDO_CAJA = 0.45      # fondo de un rectángulo = 45 % de su ancho
# Ajustes a mano por pieza (se aplican después del cálculo): forma forzada y/o fondo
AJUSTES = {
    # Máquinas de las tareas (tarea-*.webp)
    'tarea-admin': {'formas': [{'tipo': 'elipse', 'caja': [0.0, 0.44, 1.0, 0.86]}]},   # mesa holográfica: el disco de arriba, bajado al suelo
    'tarea-fill': {'formas': [{'tipo': 'elipse', 'caja': [0.0, 0.70, 0.95, 1.0]}]},    # tanque sobre patas: el tanque, bajado al suelo
    'tarea-sort': {'formas': [{'tipo': 'caja', 'caja': [0.03, 0.60, 0.97, 1.0]}]},     # mesa de muestras
    'tarea-wires': {'formas': [{'tipo': 'caja', 'caja': [0.0, 0.88, 0.95, 1.0]}]},     # caja de cables: panel plano
    'tarea-calibrate': {'forma': 'caja', 'fondo': 0.2}, 'tarea-card': {'forma': 'caja', 'fondo': 0.2},   # paneles planos: franja fina
    'tarea-clean': {'forma': 'caja', 'fondo': 0.15}, 'tarea-lights': {'forma': 'caja', 'fondo': 0.2},
    'tarea-memory': {'forma': 'caja', 'fondo': 0.2}, 'tarea-numbers': {'forma': 'caja', 'fondo': 0.2},
    'tarea-pipes': {'forma': 'caja', 'fondo': 0.2}, 'tarea-simon': {'forma': 'caja', 'fondo': 0.2},
    'reactor-nucleo': {'formas': [{'tipo': 'elipse', 'caja': [0.0, 0.30, 1.0, 1.0]}]},   # cúpula: aprobada así por el usuario
    'seguridad2-silla': {'forma': 'elipse', 'fondo': 0.45},   # patas en estrella
    'seguridad-silla': {'forma': 'elipse', 'fondo': 0.45},
    # 'zona': trozo del dibujo (rectángulos sin solaparse, en fracciones) que se pinta con el orden de ESA forma;
    # lo que no está en ninguna zona va con la primera forma (el tablero con su pata).
    # Mesa: el tablero y el asiento de cada taburete, bajados hasta el suelo (borde de abajo = el de la base de su pata)
    'comedor-mesa': {'formas': [
        {'tipo': 'elipse', 'caja': [0.115, 0.33, 0.90, 0.835]},   # tablero bajado al suelo
        {'tipo': 'elipse', 'caja': [0.0, 0.319, 0.252, 0.511], 'zona': [[0.0, 0.10, 0.125, 0.53], [0.125, 0.42, 0.19, 0.53]]},  # asiento del taburete de atrás, izquierda, bajado al suelo y centrado en su pata
        {'tipo': 'elipse', 'caja': [0.74, 0.319, 0.994, 0.511], 'zona': [[0.875, 0.10, 1.0, 0.53], [0.81, 0.42, 0.875, 0.53]]},  # asiento del taburete de atrás, derecha, bajado al suelo y centrado en su pata
        {'tipo': 'elipse', 'caja': [0.054, 0.809, 0.308, 1.0], 'zona': [[0.05, 0.57, 0.31, 1.0]]},  # asiento del taburete de delante, izquierda, bajado al suelo y centrado en su pata
        {'tipo': 'elipse', 'caja': [0.704, 0.809, 0.958, 1.0], 'zona': [[0.70, 0.57, 0.96, 1.0]]},  # asiento del taburete de delante, derecha, bajado al suelo y centrado en su pata
        ]},
    # Máquina expendedora (está girada): el suelo es un paralelogramo en perspectiva.
    # Esquinas de abajo medidas en el dibujo: delante-izquierda, delante-derecha, atrás-derecha; la 4.ª se completa.
    'comedor-maquina': {'formas': [{'tipo': 'poligono', 'puntos': [[0.02, 0.831], [0.64, 0.995], [0.993, 0.84], [0.373, 0.676]]}]},
    # Turbina: el óvalo del marco de arriba, bajado hasta el borde de abajo de la máquina
    'motores-turbina': {'formas': [{'tipo': 'elipse', 'caja': [0.06, 0.37, 0.96, 0.95]}]},
    'enfermeria2-cama': {'forma': 'caja', 'fondo': 0.30},
    'enfermeria-cama': {'forma': 'caja', 'fondo': 0.30},
}
def perfil(m, W, H):
    px = m.load(); low = {}
    for x in range(W):
        for y in range(H - 1, -1, -1):
            if px[x, y]: low[x] = y; break
    return low
out = {}
for f in sorted(glob.glob(sys.argv[1] + '/nave-*.webp') + glob.glob(sys.argv[1] + '/tarea-*.webp')):
    b0 = os.path.basename(f)[:-5]
    n = b0[5:] if b0.startswith('nave-') else b0          # 'nave-reactor-nucleo' -> 'reactor-nucleo'; 'tarea-wires' se queda
    if 'suelo' in n or n in ('pared', 'pared-pasillo', 'macizo', 'ojo-buey', 'rejilla', 'lampara', 'puerta'): continue
    im = Image.open(f).convert('RGBA'); W, H = im.size
    m = im.getchannel('A').point(lambda v: 255 if v > 40 else 0)
    bb = m.getbbox()
    if not bb: continue
    l, t, r, b = bb
    low = perfil(m, W, H)
    # franja de abajo (último 15 % del alto): su ancho es el ancho de la base
    band = m.crop((0, int(b - 0.15 * (b - t)), W, b)).getbbox()
    bl, br = (band[0], band[2]) if band else (l, r)
    cx, a = (bl + br) / 2, (br - bl) / 2
    # ajuste de la curva de abajo: y = cy + k*sqrt(1-u^2)  (k > 0 si es redonda)
    pts = [(x, low[x]) for x in range(int(bl + a * 0.1), int(br - a * 0.1)) if x in low]
    S = [(1 - ((x - cx) / a) ** 2) ** 0.5 for x, _ in pts]; Y = [y for _, y in pts]
    nS = len(S); ms = sum(S) / nS; my = sum(Y) / nS
    var = sum((s - ms) ** 2 for s in S) or 1e-9
    k = sum((s - ms) * (y - my) for s, y in zip(S, Y)) / var
    redonda = k / a > 0.12
    aj = AJUSTES.get(n, {})
    forma = aj.get('forma', 'elipse' if redonda else 'caja')
    if 'fondo' in aj: alto = aj['fondo'] * 2 * a
    elif forma == 'elipse': alto = max(2 * k, 0.35 * 2 * a)        # cilindros de base casi plana: óvalo mínimo
    elif (b - t) > 1.4 * 2 * a: alto = 0.75 * 2 * a                # muebles altos y estrechos (taquilla, servidor...)
    else: alto = FONDO_CAJA * 2 * a
    alto = min(alto, 0.9 * (b - t))
    caja = [round(bl / W, 3), round((b - alto) / H, 3), round(br / W, 3), round(b / H, 3)]
    out[n] = {'ancho': W, 'alto': H, 'formas': aj.get('formas') or [{'tipo': forma, 'caja': caja}]}
if '--js' in sys.argv:   # versión para el juego: js/huellas.js
    print('/* Generado por herramientas/huellas.py --js (no editar a mano). Zonas de choque de los muebles. */')
    print('(typeof window !== "undefined" ? window : globalThis).HUELLAS = ' + json.dumps(out, separators=(',', ':')) + ';')
else:
    print(json.dumps(out, indent=1, ensure_ascii=False))
