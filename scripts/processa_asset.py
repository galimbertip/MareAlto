#!/usr/bin/env python3
"""Ritaglia gli sprite dai fogli generati con Arena AI.

Uso: python3 scripts/processa_asset.py
Legge assets/raw/*.png e scrive assets/sprites/*.png e assets/tiles/*.png.
Lo sfondo magenta (o trasparente) viene tolto, ogni pezzo viene separato,
rifilato e ridimensionato alla misura di gioco.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "assets", "raw")
OUT = os.path.join(ROOT, "assets", "sprites")
TILES = os.path.join(ROOT, "assets", "tiles")

# foglio -> lista di (nome, lato, misura). lato 'w' = larghezza, 'h' = altezza, 'm' = lato maggiore.
# I nomi seguono l'ordine di lettura (righe dall'alto, poi da sinistra).
FOGLI = {
    "sopravvissuto": [("sopr_giu", "h", 60), ("sopr_su", "h", 60), ("sopr_sx", "h", 60), ("sopr_dx", "h", 60)],
    "strutture": [("baracca", "w", 180), ("zattera", "w", 170), ("falo", "w", 72), ("raccoglitore", "w", 76)],
    "oggetti": [("cassa", "w", 38), ("barile", "w", 30), ("rottami", "w", 48), ("pneumatico", "w", 40),
                ("legna", "w", 40), ("corda", "w", 36), ("ossa", "w", 46), ("rete", "w", 42)],
    "natura": [("roccia_grande", "w", 96), ("roccia", "w", 52), ("erba", "w", 34), ("cespuglio", "w", 48),
               ("albero_morto", "h", 96), ("palma", "h", 120), ("alghe", "w", 44), ("corallo", "w", 40)],
    "fauna": [("granchio_giu", "w", 44), ("granchio_su", "w", 44), ("granchio_sx", "w", 44),
              ("granchio_dx", "w", 44), ("granchio_attacco", "w", 50)],
    "rovine": [("campanile", "w", 150), ("archi", "w", 230), ("muro", "w", 150), ("palazzo", "w", 160)],
    "icone": [("ic_goccia", "m", 30), ("ic_cibo", "m", 30), ("ic_pesce", "m", 30), ("ic_cocco", "m", 30),
              ("ic_bottiglia", "m", 30), ("ic_legna", "m", 30), ("ic_rottame", "m", 30), ("ic_corda", "m", 30),
              ("ic_coltello", "m", 30), ("ic_tanica", "m", 30), ("ic_benda", "m", 30), ("ic_sole", "m", 30)],
}


# distanza (px) entro cui due macchie sono lo stesso oggetto
RAGGIO = {"oggetti": 10, "fauna": 6, "natura": 8, "rovine": 10, "icone": 8}


def alfa_da_magenta(rgb):
    """Restituisce l'alfa (0-1) togliendo i pixel vicini al magenta e il loro alone."""
    r, g, b = [rgb[..., i].astype(np.float32) for i in range(3)]
    # quanto il pixel "sa di magenta": rosso e blu alti, verde basso
    m = np.minimum(r, b) - g
    alfa = np.clip(1.0 - (m - 60.0) / 120.0, 0, 1)
    return alfa


def despill(rgb, alfa):
    """Toglie la tinta viola dai bordi semitrasparenti."""
    out = rgb.astype(np.float32).copy()
    bordo = (alfa > 0) & (alfa < 1)
    r, g, b = out[..., 0], out[..., 1], out[..., 2]
    r[bordo] = np.minimum(r[bordo], np.maximum(g[bordo] + 40, 0))
    b[bordo] = np.minimum(b[bordo], np.maximum(g[bordo] + 40, 0))
    return np.clip(out, 0, 255).astype(np.uint8)


def carica(nome):
    im = Image.open(os.path.join(RAW, nome + ".png"))
    if im.mode == "RGBA" and np.array(im)[..., 3].min() == 0:
        a = np.array(im)
        return a[..., :3], a[..., 3].astype(np.float32) / 255.0
    rgb = np.array(im.convert("RGB"))
    alfa = alfa_da_magenta(rgb)
    return despill(rgb, alfa), alfa


def separa(alfa, quanti, raggio=6):
    pieno = alfa > 0.5
    # unisce pezzi vicini (zampe, schegge) dello stesso oggetto
    unito = ndimage.binary_dilation(pieno, iterations=raggio)
    etich, n = ndimage.label(unito)
    scatole = ndimage.find_objects(etich)
    aree = [(np.sum(pieno[s] & (etich[s] == i + 1)), i, s) for i, s in enumerate(scatole)]
    aree.sort(reverse=True)
    scelti = aree[:quanti]
    if len(scelti) < quanti:
        raise SystemExit(f"trovati solo {len(scelti)} pezzi su {quanti}")
    pezzi = []
    for _, i, s in scelti:
        ys, xs = s
        pezzi.append((ys.start, ys.stop, xs.start, xs.stop, i + 1))
    # ordine di lettura: raggruppa per righe usando il centro verticale
    altezza_media = np.mean([p[1] - p[0] for p in pezzi])
    pezzi.sort(key=lambda p: ((p[0] + p[1]) / 2 // (altezza_media * 0.8), (p[2] + p[3]) / 2))
    # riordina per righe robusto: ordina per y, poi spezza quando il salto e' grande
    pezzi.sort(key=lambda p: (p[0] + p[1]) / 2)
    righe, riga = [], [pezzi[0]]
    for p in pezzi[1:]:
        if (p[0] + p[1]) / 2 - (riga[-1][0] + riga[-1][1]) / 2 > altezza_media * 0.5:
            righe.append(riga)
            riga = [p]
        else:
            riga.append(p)
    righe.append(riga)
    ordinati = []
    for r in righe:
        ordinati += sorted(r, key=lambda p: (p[2] + p[3]) / 2)
    return ordinati, etich


def ritaglia(rgb, alfa, etich, pezzo):
    y0, y1, x0, x1, lab = pezzo
    a = alfa[y0:y1, x0:x1] * (etich[y0:y1, x0:x1] == lab)
    # toglie 2 px di bordo per eliminare l'alone viola dello sfondo
    a = a * ndimage.binary_erosion(a > 0.9, iterations=2)
    ys, xs = np.where(a > 0.05)
    a = a[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    c = rgb[y0:y1, x0:x1][ys.min():ys.max() + 1, xs.min():xs.max() + 1]
    rgba = np.dstack([c, (a * 255).astype(np.uint8)])
    return Image.fromarray(rgba, "RGBA")


def ridimensiona(img, lato, misura):
    w, h = img.size
    base = {"w": w, "h": h, "m": max(w, h)}[lato]
    f = misura / base
    nw, nh = max(1, round(w * f)), max(1, round(h * f))
    # premoltiplica per evitare aloni scuri, poi ridimensiona
    a = np.array(img).astype(np.float32) / 255.0
    a[..., :3] *= a[..., 3:4]
    pre = Image.fromarray((a * 255).astype(np.uint8), "RGBA").resize((nw, nh), Image.LANCZOS)
    b = np.array(pre).astype(np.float32) / 255.0
    al = b[..., 3:4]
    b[..., :3] = np.where(al > 0.01, b[..., :3] / np.maximum(al, 1e-3), 0)
    # alfa netto, in stile pixel art
    b[..., 3] = (b[..., 3] > 0.5).astype(np.float32)
    return Image.fromarray(np.clip(b * 255, 0, 255).astype(np.uint8), "RGBA")


def terreni():
    im = np.array(Image.open(os.path.join(RAW, "terreni.png")).convert("RGB"))
    mag = (alfa_da_magenta(im) < 0.5)
    h, w = mag.shape
    # le linee magenta dividono il foglio in 4 quadranti
    col = np.where(mag.mean(axis=0) > 0.5)[0]
    row = np.where(mag.mean(axis=1) > 0.5)[0]
    cx = int(np.median(col[(col > w * 0.3) & (col < w * 0.7)]))
    cy = int(np.median(row[(row > h * 0.3) & (row < h * 0.7)]))
    m = 6
    quad = {
        "sabbia": im[m:cy - m, m:cx - m],
        "basso": im[m:cy - m, cx + m:w - m],
        "profondo": im[cy + m:h - m, m:cx - m],
        "roccia": im[cy + m:h - m, cx + m:w - m],
    }
    for nome, q in quad.items():
        n = 256
        a = np.array(Image.fromarray(q).resize((n, n), Image.LANCZOS)).astype(np.float32)
        # piastrella ripetibile: vicino ai bordi uso la copia spostata di mezzo lato
        # (che si ripete senza cuciture), al centro l'originale, sfumando in mezzo
        spost = np.roll(a, (n // 2, n // 2), axis=(0, 1))
        d = np.minimum(np.arange(n), n - 1 - np.arange(n)) / (n / 2)
        bordo = np.clip(1.0 - np.minimum(d[:, None], d[None, :]) / 0.35, 0, 1)[..., None]
        t = spost * bordo + a * (1 - bordo)
        Image.fromarray(t.astype(np.uint8)).save(os.path.join(TILES, nome + ".png"))
        print("tile", nome, t.shape)


def main():
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(TILES, exist_ok=True)
    terreni()
    for foglio, voci in FOGLI.items():
        rgb, alfa = carica(foglio)
        pezzi, etich = separa(alfa, len(voci), RAGGIO.get(foglio, 6))
        for (nome, lato, misura), p in zip(voci, pezzi):
            img = ridimensiona(ritaglia(rgb, alfa, etich, p), lato, misura)
            img.save(os.path.join(OUT, nome + ".png"))
            print(foglio, nome, img.size)


if __name__ == "__main__":
    main()
