# Calcula la "huella" (parte que choca) de cada mueble a partir de la transparencia de su imagen.
# Regla (26-11, usuario): los personajes andan por el suelo, nunca por encima de los muebles.
# Choca casi todo el dibujo; solo queda libre una franja arriba (TOP) para que el personaje pueda
# meterse un poco "detrás" y el mueble le tape los pies.
# Resultado en fracciones de la imagen: el mueble se dibuja con su base en (x, y) y ancho w.
import json, sys, glob, os
from PIL import Image
TOP = 0.22   # parte de arriba del dibujo que no choca
ESPECIALES = {  # forma propia
    'reactor-nucleo': {'forma': 'elipse', 'huella': [0.0, 0.30, 1.0, 1.0]},   # cúpula: circunferencia algo más amplia que la base
}
out = {}
for f in sorted(glob.glob(sys.argv[1] + '/nave-*.webp')):
    n = os.path.basename(f)[5:-5]
    if 'suelo' in n or n in ('pared', 'pared-pasillo', 'macizo', 'ojo-buey', 'rejilla', 'lampara', 'puerta'): continue
    im = Image.open(f).convert('RGBA'); W, H = im.size; a = im.getchannel('A')
    m = a.point(lambda v: 255 if v > 40 else 0)
    bb = m.getbbox()
    if not bb: continue
    l, t, r, b = bb
    top = t + TOP * (b - t)
    band = m.crop((0, int(top), W, b)).getbbox()
    bl, br = (band[0], band[2]) if band else (l, r)
    e = {'ancho': W, 'alto': H, 'forma': 'caja',
         'huella': [round(bl / W, 3), round(top / H, 3), round(br / W, 3), round(b / H, 3)]}
    if n in ESPECIALES: e.update(ESPECIALES[n])
    out[n] = e
print(json.dumps(out, indent=1, ensure_ascii=False))
