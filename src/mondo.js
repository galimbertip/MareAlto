// GPverse — Mare Alto · generazione del mondo (terreno, isole, rumore)
'use strict';

const TERRENO = { PROFONDO: 0, BASSO: 1, SABBIA: 2, ROCCIA: 3 };

// Generatore pseudo-casuale con seme (mulberry32): stesso seme, stesso mondo.
function rngConSeme(seme) {
  let a = seme >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(x, y, seme) {
  let h = Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seme | 0, 982451653);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967295;
}

function rumoreValore(x, y, seme) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seme), b = hash2(xi + 1, yi, seme);
  const c = hash2(xi, yi + 1, seme), d = hash2(xi + 1, yi + 1, seme);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

// Rumore frattale in [-1, 1]
function fbm(x, y, seme) {
  return (
    rumoreValore(x / 220, y / 220, seme) * 0.5 +
    rumoreValore(x / 90, y / 90, seme + 7) * 0.3 +
    rumoreValore(x / 36, y / 36, seme + 13) * 0.2
  ) * 2 - 1;
}

class Mondo {
  constructor(seme) {
    this.seme = seme;
    this.L = 3200;   // larghezza in px
    this.A = 2400;   // altezza in px
    this.CELLA = 16; // cella di collisione
    this.cols = Math.ceil(this.L / this.CELLA);
    this.righe = Math.ceil(this.A / this.CELLA);

    // Isole: x, y, raggio, picco. Un picco basso crea un banco di acqua bassa.
    this.isole = [
      { x: 1520, y: 1180, r: 360, p: 1.0, nome: 'Atollo del Campanile' },
      { x: 2380, y: 700, r: 150, p: 0.9 },
      { x: 780, y: 1760, r: 120, p: 0.9 },
      { x: 2440, y: 1720, r: 190, p: 0.95 },
      // banchi sommersi con le rovine
      { x: 1050, y: 640, r: 260, p: 0.1 },
      { x: 2050, y: 1560, r: 230, p: 0.1 },
      { x: 600, y: 1150, r: 180, p: 0.08 },
    ];

    this.griglia = new Uint8Array(this.cols * this.righe);
    for (let r = 0; r < this.righe; r++) {
      for (let c = 0; c < this.cols; c++) {
        const x = c * this.CELLA + this.CELLA / 2, y = r * this.CELLA + this.CELLA / 2;
        this.griglia[r * this.cols + c] = this.tipoDaCampo(x, y);
      }
    }
  }

  // Valore del "campo terra": > 0.12 sabbia, > -0.35 acqua bassa, sotto mare profondo
  campo(x, y) {
    let f = -1;
    for (const i of this.isole) {
      const d = Math.hypot(x - i.x, y - i.y);
      const v = (1 - d / i.r) * i.p;
      if (v > f) f = v;
    }
    // bordo del mondo: mare profondo
    const bordo = Math.min(x, y, this.L - x, this.A - y);
    if (bordo < 200) f -= (200 - bordo) / 100;
    return f + fbm(x, y, this.seme) * 0.2;
  }

  tipoDaCampo(x, y) {
    const f = this.campo(x, y);
    if (f > 0.12) {
      if (f > 0.42 && fbm(x + 999, y - 333, this.seme + 3) > 0.45) return TERRENO.ROCCIA;
      return TERRENO.SABBIA;
    }
    if (f > -0.35) return TERRENO.BASSO;
    return TERRENO.PROFONDO;
  }

  tipo(x, y) {
    const c = Math.floor(x / this.CELLA), r = Math.floor(y / this.CELLA);
    if (c < 0 || r < 0 || c >= this.cols || r >= this.righe) return TERRENO.PROFONDO;
    return this.griglia[r * this.cols + c];
  }

  aPiedi(x, y) { return this.tipo(x, y) !== TERRENO.PROFONDO; }
  acqua(x, y) { const t = this.tipo(x, y); return t === TERRENO.BASSO || t === TERRENO.PROFONDO; }
  terra(x, y) { const t = this.tipo(x, y); return t === TERRENO.SABBIA || t === TERRENO.ROCCIA; }

  // Disegna il terreno su un canvas usando le texture come motivi ripetuti
  disegna(ctx, img) {
    const P = {};
    for (const k of ['sabbia', 'basso', 'profondo', 'roccia']) P[k] = ctx.createPattern(img[k], 'repeat');
    const S = 4; // risoluzione del disegno
    const cols = Math.ceil(this.L / S), righe = Math.ceil(this.A / S);
    const campo = new Float32Array(cols * righe);
    const tipo = new Uint8Array(cols * righe);
    for (let r = 0; r < righe; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * S + S / 2, y = r * S + S / 2;
        campo[r * cols + c] = this.campo(x, y);
        tipo[r * cols + c] = this.tipoDaCampo(x, y);
      }
    }
    ctx.fillStyle = P.profondo;
    ctx.fillRect(0, 0, this.L, this.A);
    for (let r = 0; r < righe; r++) {
      for (let c = 0; c < cols; c++) {
        const i = r * cols + c, f = campo[i], t = tipo[i];
        const x = c * S, y = r * S;
        if (t === TERRENO.PROFONDO) {
          if (f > -0.5) { // sfumatura verso l'acqua bassa
            ctx.globalAlpha = (f + 0.5) / 0.15 * 0.6;
            ctx.fillStyle = P.basso; ctx.fillRect(x, y, S, S);
            ctx.globalAlpha = 1;
          }
          continue;
        }
        if (t === TERRENO.BASSO) {
          ctx.fillStyle = P.basso; ctx.fillRect(x, y, S, S);
          if (f < -0.2) { // piu' scuro verso il largo
            ctx.globalAlpha = (-0.2 - f) / 0.15 * 0.55;
            ctx.fillStyle = P.profondo; ctx.fillRect(x, y, S, S);
            ctx.globalAlpha = 1;
          }
          continue;
        }
        ctx.fillStyle = t === TERRENO.ROCCIA ? P.roccia : P.sabbia;
        ctx.fillRect(x, y, S, S);
        if (t === TERRENO.SABBIA && f < 0.2) { // sabbia bagnata sulla riva
          ctx.fillStyle = 'rgba(80,50,25,0.18)'; ctx.fillRect(x, y, S, S);
        }
      }
    }
    // schiuma: celle d'acqua che toccano la terra
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    for (let r = 1; r < righe - 1; r++) {
      for (let c = 1; c < cols - 1; c++) {
        const i = r * cols + c;
        if (tipo[i] !== TERRENO.BASSO) continue;
        const vicini = [i - 1, i + 1, i - cols, i + cols];
        if (vicini.some((j) => tipo[j] >= TERRENO.SABBIA)) ctx.fillRect(c * S, r * S, S, S);
      }
    }
  }
}
