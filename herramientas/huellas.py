# Calcula la "huella" (parte que choca) de cada mueble a partir de la transparencia de su imagen.
# Resultado en fracciones de la imagen: el mueble se dibuja con su base en (x, y) y ancho w.
import json, sys, glob, os
from PIL import Image
out = {}
for f in sorted(glob.glob(sys.argv[1] + '/nave-*.webp')):
    n = os.path.basename(f)[5:-5]
    if 'suelo' in n or n in ('pared', 'pared-pasillo', 'macizo', 'ojo-buey', 'rejilla', 'lampara', 'puerta'): continue
    im = Image.open(f).convert('RGBA'); W, H = im.size; a = im.getchannel('A')
    bb = a.point(lambda v: 255 if v > 40 else 0).getbbox()
    if not bb: continue
    l, t, r, b = bb
    oh, ow = b - t, r - l
    depth = min(0.45 * oh, 0.55 * ow)          # fondo de la huella: menos que el alto del dibujo
    # ancho real en la franja de abajo (por si el mueble es más estrecho abajo, p. ej. patas)
    band = a.crop((0, int(b - depth), W, b)).point(lambda v: 255 if v > 40 else 0).getbbox()
    bl, br = (band[0], band[2]) if band else (l, r)
    out[n] = {'ancho': W, 'alto': H,
              'huella': [round(bl / W, 3), round((b - depth) / H, 3), round(br / W, 3), round(b / H, 3)]}
print(json.dumps(out, indent=1, ensure_ascii=False))
