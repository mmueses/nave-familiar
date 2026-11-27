# Hoja con cada pieza (mueble o máquina) y su zona de choque en rojo; las 'zona' de los muebles compuestos en azul.
# Uso: python3 herramientas/pruebas/ver-huellas.py [salida.png] [filtro]
#   p. ej.  python3 herramientas/pruebas/ver-huellas.py /tmp/huellas.png comedor
# Sirve para revisar a ojo (y enseñar al usuario) las zonas antes de meterlas en el juego.
import json, sys, os
from PIL import Image, ImageDraw
RAIZ = os.path.join(os.path.dirname(__file__), '..', '..')
H = json.load(open(os.path.join(RAIZ, 'datos', 'huellas.json')))
salida = sys.argv[1] if len(sys.argv) > 1 else '/tmp/huellas.png'
filtro = sys.argv[2] if len(sys.argv) > 2 else ''
tiles = []
for n in sorted(H):
    if filtro not in n: continue
    f = os.path.join(RAIZ, 'img', 'mapas', (n if n.startswith('tarea') else 'nave-' + n) + '.webp')
    im = Image.open(f).convert('RGBA'); k = 220 / im.height; im = im.resize((max(1, int(im.width * k)), 220))
    bg = Image.new('RGBA', (max(im.width, 170), 250), (70, 80, 100, 255)); bg.alpha_composite(im); d = ImageDraw.Draw(bg); W, Hh = im.size
    for fm in H[n]['formas']:
        if fm['tipo'] == 'poligono':
            pts = [(a * W, b * Hh) for a, b in fm['puntos']]; d.line(pts + [pts[0]], fill=(255, 30, 30, 255), width=4)
        else:
            c = fm['caja']; (d.ellipse if fm['tipo'] == 'elipse' else d.rectangle)([c[0] * W, c[1] * Hh, c[2] * W, c[3] * Hh], outline=(255, 30, 30, 255), width=4)
        for z in fm.get('zona', []):
            d.rectangle([z[0] * W, z[1] * Hh, z[2] * W, z[3] * Hh], outline=(40, 140, 255, 255), width=2)
    d.text((4, 228), n, fill=(255, 255, 255, 255)); tiles.append(bg)
cols = 7; filas = (len(tiles) + cols - 1) // cols; cw = max(t.width for t in tiles)
out = Image.new('RGB', (cols * (cw + 8), filas * 258), (20, 20, 28))
for i, t in enumerate(tiles): out.paste(t, ((i % cols) * (cw + 8), (i // cols) * 258))
out.save(salida); print(salida, len(tiles), 'piezas')
