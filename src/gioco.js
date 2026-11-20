// GPverse — Mare Alto · prototipo giocabile
'use strict';

const VERSIONE = 'V0.1.0';
const DURATA_GIORNO = 240; // secondi per un giorno completo

const OGGETTI = {
  acqua:   { nome: "Bottiglia d'acqua", icona: 'ic_bottiglia', uso: { sete: 35 } },
  cocco:   { nome: 'Cocco', icona: 'ic_cocco', uso: { fame: 15, sete: 12 } },
  cibo:    { nome: 'Pasto cotto', icona: 'ic_cibo', uso: { fame: 35 } },
  pesce:   { nome: 'Pesce crudo', icona: 'ic_pesce', uso: { fame: 12 }, crudo: true },
  carne:   { nome: 'Polpa di granchio', icona: 'ic_pesce', tinta: 0xff9a7a, uso: { fame: 14 }, crudo: true },
  benda:   { nome: 'Benda', icona: 'ic_benda', uso: { salute: 35 } },
  legna:   { nome: 'Legna', icona: 'ic_legna' },
  rottame: { nome: 'Rottame', icona: 'ic_rottame' },
  corda:   { nome: 'Corda', icona: 'ic_corda' },
  coltello:{ nome: 'Coltello', icona: 'ic_coltello' },
};
const ORDINE_INV = ['acqua', 'cocco', 'cibo', 'pesce', 'carne', 'benda', 'legna', 'rottame', 'corda', 'coltello'];

const SPRITE = ['sopr_giu', 'sopr_su', 'sopr_sx', 'sopr_dx', 'baracca', 'zattera', 'falo', 'raccoglitore',
  'cassa', 'barile', 'rottami', 'pneumatico', 'legna', 'corda', 'ossa', 'rete',
  'roccia_grande', 'roccia', 'erba', 'cespuglio', 'albero_morto', 'palma', 'alghe', 'corallo',
  'granchio_giu', 'granchio_su', 'granchio_sx', 'granchio_dx', 'granchio_attacco',
  'campanile', 'archi', 'muro', 'palazzo',
  'ic_goccia', 'ic_cibo', 'ic_pesce', 'ic_cocco', 'ic_bottiglia', 'ic_legna', 'ic_rottame', 'ic_corda',
  'ic_coltello', 'ic_tanica', 'ic_benda', 'ic_sole'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- Caricamento
class Avvio extends Phaser.Scene {
  constructor() { super('Avvio'); }
  preload() {
    const w = this.scale.width, h = this.scale.height;
    const barra = this.add.rectangle(w / 2 - 150, h / 2, 0, 8, 0x4fb3e8).setOrigin(0, 0.5);
    this.add.text(w / 2, h / 2 - 30, 'Mare Alto', { fontFamily: 'monospace', fontSize: '22px', color: '#e8d9b0' }).setOrigin(0.5);
    this.load.on('progress', (p) => { barra.width = 300 * p; });
    for (const s of SPRITE) this.load.image(s, `assets/sprites/${s}.png`);
    for (const t of ['sabbia', 'basso', 'profondo', 'roccia']) this.load.image('t_' + t, `assets/tiles/${t}.png`);
    this.load.image('copertina', 'docs/concept/riferimento-visuale-2d.jpg');
  }
  create() { this.scene.start('Titolo'); }
}

// ---------------------------------------------------------------- Titolo
class Titolo extends Phaser.Scene {
  constructor() { super('Titolo'); }
  create() {
    const disegna = () => {
      this.children.removeAll(true);
      const w = this.scale.width, h = this.scale.height;
      const img = this.add.image(w / 2, h / 2, 'copertina');
      img.setScale(Math.max(w / img.width, h / img.height));
      this.add.rectangle(0, 0, w, h, 0x061018, 0.55).setOrigin(0);
      const piccolo = w < 600;
      this.add.text(w / 2, h * 0.24, 'GPverse', { fontFamily: 'monospace', fontSize: piccolo ? '16px' : '22px', color: '#4fb3e8' }).setOrigin(0.5);
      this.add.text(w / 2, h * 0.24 + (piccolo ? 34 : 50), 'MARE ALTO', {
        fontFamily: 'monospace', fontSize: piccolo ? '40px' : '72px', color: '#f0e2b6', stroke: '#2a1408', strokeThickness: 8,
      }).setOrigin(0.5);
      this.add.text(w / 2, h * 0.24 + (piccolo ? 72 : 110), VERSIONE, { fontFamily: 'monospace', fontSize: '16px', color: '#e8a24f' }).setOrigin(0.5);
      const touch = this.sys.game.device.input.touch;
      const comandi = touch
        ? 'Joystick a sinistra per muoverti\nAZIONE: raccogli, bevi, cucina, sali sulla zattera, pesca\nCOLPISCI: attacca i granchi\nTocca un oggetto in basso per usarlo'
        : 'WASD / frecce: muoviti\nE: raccogli, bevi, cucina, sali sulla zattera, pesca\nSPAZIO o clic: colpisci\n1-9: usa un oggetto dell\'inventario';
      this.add.text(w / 2, h * 0.62, comandi, {
        fontFamily: 'monospace', fontSize: piccolo ? '12px' : '15px', color: '#d8e6ea', align: 'center', lineSpacing: 6,
      }).setOrigin(0.5);
      const invito = this.add.text(w / 2, h * 0.86, touch ? 'Tocca per iniziare' : 'Premi INVIO o clicca per iniziare', {
        fontFamily: 'monospace', fontSize: piccolo ? '16px' : '20px', color: '#ffffff',
      }).setOrigin(0.5);
      this.tweens.add({ targets: invito, alpha: 0.3, yoyo: true, repeat: -1, duration: 700 });
    };
    disegna();
    this.scale.on('resize', disegna, this);
    this.events.once('shutdown', () => this.scale.off('resize', disegna, this));
    const parti = () => { this.scene.start('Gioco'); };
    this.input.keyboard.once('keydown-ENTER', parti);
    this.input.once('pointerdown', parti);
  }
}

// ---------------------------------------------------------------- Gioco
class Gioco extends Phaser.Scene {
  constructor() { super('Gioco'); }

  create() {
    this.rng = rngConSeme(20261120);
    this.mondo = new Mondo(20261120);
    const M = this.mondo;

    // terreno disegnato una volta su un canvas
    if (!this.textures.exists('terreno')) {
      const tex = this.textures.createCanvas('terreno', M.L, M.A);
      const img = {};
      for (const k of ['sabbia', 'basso', 'profondo', 'roccia']) img[k] = this.textures.get('t_' + k).getSourceImage();
      M.disegna(tex.getContext(), img);
      tex.refresh();
    }
    this.add.image(0, 0, 'terreno').setOrigin(0).setDepth(-10);

    this.ostacoli = [];   // cerchi {x, y, r} che bloccano il passaggio
    this.interattivi = []; // oggetti con cui premere E
    this.granchi = [];

    this.stato = {
      sete: 100, fame: 100, salute: 100,
      giorno: 1, ora: 0.08, // 0 = alba
      inv: { acqua: 1, cocco: 1 },
      morto: false,
      messaggi: [],
    };

    this.piazzaMondo();

    // giocatore
    const inizio = this.cercaTerra(1520, 1260, 0.3);
    this.giocatore = this.add.image(inizio.x, inizio.y, 'sopr_giu').setOrigin(0.5, 1);
    this.ombra = this.add.ellipse(inizio.x, inizio.y, 26, 9, 0x000000, 0.25);
    this.dir = 'giu';
    this.passo = 0;
    this.suZattera = false;
    this.pesca = null;
    this.ultimoColpo = 0;

    // camera
    const cam = this.cameras.main;
    cam.setBounds(0, 0, M.L, M.A);
    cam.startFollow(this.giocatore, true, 0.12, 0.12);
    cam.setRoundPixels(true);
    this.adattaZoom();
    this.scale.on('resize', this.adattaZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.adattaZoom, this));

    // comandi
    this.tasti = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,SPACE,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE');
    this.input.keyboard.on('keydown-E', () => this.azione());
    this.input.keyboard.on('keydown-SPACE', () => this.colpisci());
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'].forEach((k, i) => {
      this.input.keyboard.on('keydown-' + k, () => this.usaSlot(i));
    });
    this.input.on('pointerdown', (p) => {
      if (this.sys.game.device.input.touch) return; // su touch si usa il pulsante
      if (p.y > this.scale.height - 80) return; // barra inventario
      this.colpisci();
    });
    this.joy = { x: 0, y: 0 }; // impostato dalla scena Interfaccia

    this.scene.launch('Interfaccia', { gioco: this });
    this.messaggio('Sei sull\'Atollo del Campanile. Trova acqua e cibo.');

    this.time.addEvent({ delay: 40000, loop: true, callback: () => {
      if (this.raccoglitore.acqua < 3) this.raccoglitore.acqua++;
    } });
    this.time.addEvent({ delay: 15000, loop: true, callback: () => this.generaGranchio() });
    this.time.addEvent({ delay: 30000, loop: true, callback: () => this.generaLegna() });
  }

  adattaZoom() {
    const w = this.scale.width, h = this.scale.height;
    const z = clamp(Math.round(Math.min(w, h) / 420 * 2) / 2, 1, 2.5);
    this.cameras.main.setZoom(z);
  }

  messaggio(t) {
    this.stato.messaggi.push({ testo: t, tempo: this.time.now });
    if (this.stato.messaggi.length > 4) this.stato.messaggi.shift();
  }

  // ---------------------------------------------------------- piazzamento
  libero(x, y, r) {
    for (const o of this.ostacoli) if (Math.hypot(o.x - x, o.y - y) < o.r + r) return false;
    return true;
  }

  // punto di terra vicino a (x, y) entro una distanza relativa dal centro dell'isola
  cercaTerra(x, y) {
    if (this.mondo.terra(x, y) && this.libero(x, y, 14)) return { x, y };
    for (let d = 16; d < 600; d += 16) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
        const px = x + Math.cos(a) * d, py = y + Math.sin(a) * d;
        if (this.mondo.terra(px, py) && this.libero(px, py, 14)) return { x: px, y: py };
      }
    }
    return { x, y };
  }

  puntoCasuale(isola, minF, maxF, raggio, tipo) {
    const M = this.mondo;
    for (let i = 0; i < 400; i++) {
      const a = this.rng() * Math.PI * 2, d = Math.sqrt(this.rng()) * isola.r;
      const x = isola.x + Math.cos(a) * d, y = isola.y + Math.sin(a) * d;
      const f = M.campo(x, y);
      if (f < minF || f > maxF) continue;
      if (tipo === 'terra' && !M.terra(x, y)) continue;
      if (tipo === 'acqua' && M.tipo(x, y) !== TERRENO.BASSO) continue;
      if (!this.libero(x, y, raggio)) continue;
      return { x, y };
    }
    return null;
  }

  sprite(x, y, chiave, oy = 1) {
    return this.add.image(x, y, chiave).setOrigin(0.5, oy).setDepth(y);
  }

  solido(x, y, r) { this.ostacoli.push({ x, y, r }); }

  piazzaMondo() {
    const M = this.mondo, isole = M.isole;
    const atollo = isole[0];

    // accampamento al centro dell'atollo
    const c = this.cercaTerra(atollo.x - 40, atollo.y - 80);
    this.sprite(c.x, c.y + 40, 'baracca');
    this.solido(c.x - 10, c.y + 15, 50); this.solido(c.x + 35, c.y + 20, 30);
    const fuoco = this.sprite(c.x + 20, c.y + 115, 'falo', 0.7);
    this.solido(c.x + 20, c.y + 108, 16);
    this.tweens.add({ targets: fuoco, scaleY: 1.04, yoyo: true, repeat: -1, duration: 260 });
    this.interattivi.push({ tipo: 'fuoco', x: c.x + 20, y: c.y + 108, r: 50 });
    const rc = this.sprite(c.x + 115, c.y + 70, 'raccoglitore');
    this.solido(c.x + 125, c.y + 62, 14);
    this.raccoglitore = { tipo: 'raccoglitore', x: c.x + 125, y: c.y + 62, r: 48, acqua: 2, sprite: rc };
    this.interattivi.push(this.raccoglitore);

    // casse e barili da frugare
    const contenitori = [['cassa', 4], ['barile', 4]];
    for (const [k, n] of contenitori) {
      for (let i = 0; i < n; i++) {
        const isola = i === 0 ? atollo : isole[1 + (i % 3)];
        const p = this.puntoCasuale(isola, 0.18, 0.9, 30, 'terra');
        if (!p) continue;
        const s = this.sprite(p.x, p.y, k);
        this.solido(p.x, p.y - 6, 14);
        this.interattivi.push({ tipo: 'contenitore', x: p.x, y: p.y - 6, r: 40, sprite: s, pieno: true });
      }
    }

    // decorazioni dell'atollo e delle isole
    const deco = [
      ['roccia_grande', 5, 0.3, 0.95, 40, true], ['roccia', 10, 0.15, 0.95, 22, true],
      ['palma', 9, 0.15, 0.7, 26, true], ['albero_morto', 4, 0.3, 0.9, 22, true],
      ['erba', 30, 0.14, 0.9, 10, false], ['cespuglio', 14, 0.2, 0.9, 16, false],
      ['ossa', 4, 0.15, 0.6, 18, false], ['pneumatico', 4, 0.13, 0.4, 16, false],
      ['rete', 4, 0.12, 0.3, 16, false],
    ];
    for (const [k, n, minF, maxF, r, blocca] of deco) {
      for (let i = 0; i < n; i++) {
        const isola = isole[i % 4];
        const p = this.puntoCasuale(isola, minF, maxF, r, 'terra');
        if (!p) continue;
        const s = this.sprite(p.x, p.y, k);
        if (k === 'erba' || k === 'cespuglio' || k === 'rete' || k === 'ossa') s.setDepth(p.y - 30);
        if (blocca) this.solido(p.x, p.y - 6, k === 'palma' || k === 'albero_morto' ? 10 : r * 0.8);
        if (k === 'palma') this.interattivi.push({ tipo: 'palma', x: p.x, y: p.y - 6, r: 44, cocchi: 2, sprite: s });
        if (k === 'erba' || k === 'cespuglio' || k === 'palma') {
          this.tweens.add({ targets: s, angle: { from: -1.5, to: 1.5 }, yoyo: true, repeat: -1, duration: 1800 + this.rng() * 900, ease: 'Sine.inOut' });
        }
      }
    }

    // risorse da raccogliere
    for (let i = 0; i < 8; i++) this.generaLegna(true);
    const risorse = [['rottami', 'rottame', 5], ['corda', 'corda', 3]];
    for (const [k, ogg, n] of risorse) {
      for (let i = 0; i < n; i++) {
        const p = this.puntoCasuale(isole[i % 4], 0.13, 0.8, 16, 'terra');
        if (!p) continue;
        const s = this.sprite(p.x, p.y, k).setDepth(p.y - 20);
        this.interattivi.push({ tipo: 'raccogli', ogg, x: p.x, y: p.y - 8, r: 36, sprite: s });
      }
    }

    // rovine sui banchi sommersi
    const rovine = [['campanile', isole[4], 70], ['archi', isole[4], 90], ['palazzo', isole[5], 70],
      ['muro', isole[5], 60], ['muro', isole[6], 60], ['archi', isole[6], 90], ['palazzo', isole[4], 70]];
    for (const [k, isola, r] of rovine) {
      const p = this.puntoCasuale(isola, -0.3, 0.1, r, 'acqua');
      if (!p) continue;
      this.sprite(p.x, p.y, k);
      this.solido(p.x, p.y - r * 0.4, r * 0.75);
    }
    for (let i = 0; i < 26; i++) {
      const isola = isole[4 + (i % 3)];
      const p = this.puntoCasuale(isola, -0.34, 0.11, 10, 'acqua');
      if (p) this.sprite(p.x, p.y, i % 2 ? 'corallo' : 'alghe').setDepth(p.y - 40).setAlpha(0.85);
    }

    // zattera ormeggiata a sud dell'atollo
    let zp = null;
    for (let y = atollo.y + 150; y < atollo.y + 700 && !zp; y += 8) {
      if (M.tipo(atollo.x, y) === TERRENO.BASSO && this.zatteraSta(atollo.x, y + 40)) zp = { x: atollo.x, y: y + 40 };
    }
    zp = zp || { x: atollo.x, y: atollo.y + 450 };
    this.zattera = this.add.image(zp.x, zp.y, 'zattera').setOrigin(0.5, 0.75).setDepth(zp.y);
    this.zattera.rx = zp.x; this.zattera.ry = zp.y;
    this.tweens.add({ targets: this.zattera, angle: { from: -1, to: 1 }, yoyo: true, repeat: -1, duration: 2200, ease: 'Sine.inOut' });

    for (let i = 0; i < 5; i++) this.generaGranchio(true);
  }

  zatteraSta(x, y) {
    const M = this.mondo;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 4) {
      if (!M.acqua(x + Math.cos(a) * 62, y + Math.sin(a) * 26)) return false;
    }
    return M.acqua(x, y);
  }

  generaLegna(iniziale) {
    const n = this.interattivi.filter((o) => o.tipo === 'raccogli' && o.ogg === 'legna').length;
    if (n >= 12) return;
    const isola = this.mondo.isole[Math.floor(this.rng() * 4)];
    const p = this.puntoCasuale(isola, 0.12, 0.3, 16, 'terra'); // sulla riva: la porta il mare
    if (!p) return;
    const s = this.sprite(p.x, p.y, 'legna').setDepth(p.y - 20);
    this.interattivi.push({ tipo: 'raccogli', ogg: 'legna', x: p.x, y: p.y - 8, r: 36, sprite: s });
    if (!iniziale) { s.setAlpha(0); this.tweens.add({ targets: s, alpha: 1, duration: 1200 }); }
  }

  generaGranchio(iniziale) {
    const notte = this.eNotte();
    const max = notte ? 12 : 7;
    if (this.granchi.length >= max) return;
    const isola = this.mondo.isole[Math.floor(this.rng() * 4)];
    const p = this.puntoCasuale(isola, 0.1, 0.5, 14, 'terra');
    if (!p) return;
    if (!iniziale && this.giocatore && Math.hypot(p.x - this.giocatore.x, p.y - this.giocatore.y) < 300) return;
    const s = this.add.image(p.x, p.y, 'granchio_giu').setOrigin(0.5, 0.9);
    this.granchi.push({ s, x: p.x, y: p.y, vita: 4, dir: 'giu', meta: null, attesa: 0, carica: 0, pausa: 0, colpito: 0 });
  }

  eNotte() { return this.stato.ora > 0.62 && this.stato.ora < 0.97; }

  // ---------------------------------------------------------- movimento
  puoStare(x, y) {
    if (!this.mondo.aPiedi(x, y) || !this.mondo.aPiedi(x - 8, y) || !this.mondo.aPiedi(x + 8, y)) return false;
    return this.libero(x, y, 8);
  }

  update(t, dtMs) {
    const dt = Math.min(dtMs / 1000, 0.05);
    const S = this.stato;
    if (S.morto) return;

    // tempo e bisogni
    S.ora += dt / DURATA_GIORNO;
    if (S.ora >= 1) { S.ora -= 1; S.giorno++; this.messaggio(`Alba del giorno ${S.giorno}.`); }
    const caldo = this.eNotte() ? 0.7 : (S.ora > 0.25 && S.ora < 0.5 ? 1.35 : 1);
    S.sete = clamp(S.sete - dt * (100 / 330) * caldo, 0, 100);
    S.fame = clamp(S.fame - dt * (100 / 560), 0, 100);
    if (S.sete <= 0) S.salute -= dt * 1.2;
    if (S.fame <= 0) S.salute -= dt * 0.6;
    if (S.sete > 40 && S.fame > 40) S.salute += dt * 0.15;
    S.salute = clamp(S.salute, 0, 100);
    if (S.salute <= 0) return this.morte();

    // direzione dai tasti o dal joystick
    const k = this.tasti;
    let vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
    let vy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    if (this.joy.x || this.joy.y) { vx = this.joy.x; vy = this.joy.y; }
    const len = Math.hypot(vx, vy);
    if (len > 1) { vx /= len; vy /= len; }
    const muove = len > 0.15;
    if (muove && this.pesca) { this.pesca = null; this.messaggio('Hai smesso di pescare.'); }

    if (this.suZattera) this.muoviZattera(vx, vy, dt, muove);
    else this.muoviGiocatore(vx, vy, dt, muove);

    this.aggiornaPesca(dt);
    this.aggiornaGranchi(dt);
    this.aggiornaPalme(dt);
  }

  muoviGiocatore(vx, vy, dt, muove) {
    const g = this.giocatore, M = this.mondo;
    const inAcqua = M.tipo(g.x, g.y) === TERRENO.BASSO;
    const vel = (inAcqua ? 70 : 125) * dt;
    if (muove) {
      const nx = g.x + vx * vel, ny = g.y + vy * vel;
      if (this.puoStare(nx, g.y)) g.x = nx;
      if (this.puoStare(g.x, ny)) g.y = ny;
      if (Math.abs(vx) > Math.abs(vy)) this.dir = vx > 0 ? 'dx' : 'sx';
      else this.dir = vy > 0 ? 'giu' : 'su';
      this.passo += dt * (inAcqua ? 7 : 11);
    } else this.passo = 0;
    g.setTexture('sopr_' + this.dir);
    // passo: piccolo saltello e oscillazione
    const salto = muove ? Math.abs(Math.sin(this.passo)) * 2.5 : 0;
    g.setDisplayOrigin(g.width / 2, g.height + salto);
    g.angle = muove ? Math.sin(this.passo) * 3 : 0;
    // in acqua bassa si vede solo la parte alta
    if (inAcqua) g.setCrop(0, 0, g.width, g.height * 0.72); else g.setCrop();
    g.setDepth(g.y);
    this.ombra.setPosition(g.x, g.y - 1).setVisible(!inAcqua).setDepth(g.y - 1);
  }

  muoviZattera(vx, vy, dt, muove) {
    const z = this.zattera, g = this.giocatore;
    if (muove) {
      const vel = 165 * dt;
      const nx = z.rx + vx * vel, ny = z.ry + vy * vel;
      if (this.zatteraSta(nx, z.ry) && this.libero(nx, z.ry, 30)) z.rx = nx;
      if (this.zatteraSta(z.rx, ny) && this.libero(z.rx, ny, 30)) z.ry = ny;
      if (Math.abs(vx) > 0.2) z.flipX = vx < 0;
    }
    z.setPosition(z.rx, z.ry).setDepth(z.ry);
    g.setPosition(z.rx + (z.flipX ? -48 : 48), z.ry - 4).setDepth(z.ry + 1);
  }

  // ---------------------------------------------------------- azioni
  vicino() {
    const g = this.giocatore;
    let migliore = null, dmin = Infinity;
    for (const o of this.interattivi) {
      if (o.tipo === 'raccogli' && o.preso) continue;
      const d = Math.hypot(o.x - g.x, o.y - g.y);
      if (d < o.r && d < dmin) { dmin = d; migliore = o; }
    }
    return migliore;
  }

  // testo del suggerimento per l'azione E
  suggerimento() {
    if (this.stato.morto) return '';
    const inv = this.stato.inv;
    if (this.pesca) return 'Stai pescando...';
    if (this.suZattera) {
      return this.puntoSbarco() ? 'E: scendi a terra · E lontano dalla riva: pesca' : 'E: pesca dalla zattera';
    }
    const o = this.vicino();
    if (o) {
      switch (o.tipo) {
        case 'raccoglitore': return o.acqua > 0 ? `E: bevi acqua piovana (${o.acqua})` : 'Raccoglitore vuoto: piove ogni tanto';
        case 'fuoco': {
          const crudo = inv.pesce ? 'pesce' : inv.carne ? 'polpa di granchio' : null;
          if (!crudo) return 'Falò: porta pesce o granchio da cucinare';
          return inv.legna ? `E: cucina ${crudo} (usa 1 legna)` : 'Serve 1 legna per cucinare';
        }
        case 'palma': return o.cocchi > 0 ? 'E: raccogli un cocco' : 'Palma senza cocchi';
        case 'contenitore': return o.pieno ? 'E: fruga' : 'Vuoto';
        case 'raccogli': return 'E: raccogli ' + OGGETTI[o.ogg].nome.toLowerCase();
      }
    }
    const g = this.giocatore;
    if (Math.hypot(this.zattera.rx - g.x, this.zattera.ry - g.y) < 120) return 'E: sali sulla zattera';
    if (this.mondo.tipo(g.x, g.y) === TERRENO.BASSO) return 'E: pesca';
    return '';
  }

  aggiungi(ogg, n = 1) {
    const inv = this.stato.inv;
    inv[ogg] = (inv[ogg] || 0) + n;
  }

  azione() {
    if (this.stato.morto) return;
    const g = this.giocatore, inv = this.stato.inv;
    if (this.pesca) return;
    if (this.suZattera) {
      const p = this.puntoSbarco();
      if (p) {
        this.suZattera = false;
        g.setPosition(p.x, p.y).setAngle(0);
        this.ombra.setVisible(true);
        this.messaggio('Sei sceso a terra.');
      } else this.iniziaPesca(true);
      return;
    }
    const o = this.vicino();
    if (o) {
      switch (o.tipo) {
        case 'raccoglitore':
          if (o.acqua > 0) { o.acqua--; this.stato.sete = clamp(this.stato.sete + 30, 0, 100); this.messaggio('Hai bevuto acqua piovana. +30 sete'); }
          return;
        case 'fuoco': {
          const crudo = inv.pesce ? 'pesce' : inv.carne ? 'carne' : null;
          if (crudo && inv.legna) {
            inv[crudo]--; inv.legna--; this.aggiungi('cibo');
            this.messaggio('Hai cucinato un pasto caldo.');
          }
          return;
        }
        case 'palma':
          if (o.cocchi > 0) { o.cocchi--; o.ricresce = o.ricresce || 0; this.aggiungi('cocco'); this.messaggio('Hai raccolto un cocco.'); }
          return;
        case 'contenitore':
          if (o.pieno) {
            o.pieno = false; o.sprite.setTint(0x9a8f80);
            const r = this.rng();
            const ogg = !inv.coltello && r < 0.3 ? 'coltello' : r < 0.6 ? 'acqua' : r < 0.85 ? 'benda' : 'corda';
            this.aggiungi(ogg);
            this.messaggio('Hai trovato: ' + OGGETTI[ogg].nome.toLowerCase() + (ogg === 'coltello' ? ' (colpi più forti)' : ''));
          }
          return;
        case 'raccogli':
          o.preso = true; this.aggiungi(o.ogg);
          this.tweens.add({ targets: o.sprite, alpha: 0, y: o.sprite.y - 12, duration: 250, onComplete: () => o.sprite.destroy() });
          this.interattivi.splice(this.interattivi.indexOf(o), 1);
          this.messaggio('+1 ' + OGGETTI[o.ogg].nome.toLowerCase());
          return;
      }
    }
    if (Math.hypot(this.zattera.rx - g.x, this.zattera.ry - g.y) < 120) {
      this.suZattera = true;
      this.ombra.setVisible(false);
      g.setCrop(); g.setTexture('sopr_giu'); g.angle = 0; this.dir = 'giu';
      g.setDisplayOrigin(g.width / 2, g.height);
      this.messaggio('Sei sulla zattera. Puoi andare anche in mare aperto.');
      return;
    }
    if (this.mondo.tipo(g.x, g.y) === TERRENO.BASSO) this.iniziaPesca(false);
  }

  puntoSbarco() {
    const z = this.zattera, M = this.mondo;
    for (let d = 50; d <= 150; d += 10) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
        const x = z.rx + Math.cos(a) * d, y = z.ry + Math.sin(a) * d;
        if (M.terra(x, y) && this.puoStare(x, y)) return { x, y };
      }
    }
    return null;
  }

  iniziaPesca(daZattera) {
    const profondo = daZattera && this.mondo.tipo(this.zattera.rx, this.zattera.ry) === TERRENO.PROFONDO;
    this.pesca = { tempo: 0, durata: (profondo ? 2.5 : 4) + this.rng() * 3 };
    this.messaggio(profondo ? 'Getti la lenza in acqua profonda...' : 'Getti la lenza...');
  }

  aggiornaPesca(dt) {
    if (!this.pesca) return;
    this.pesca.tempo += dt;
    if (this.pesca.tempo >= this.pesca.durata) {
      this.pesca = null;
      if (this.rng() < 0.8) { this.aggiungi('pesce'); this.messaggio('Hai preso un pesce!'); }
      else this.messaggio('Il pesce è scappato.');
    }
  }

  aggiornaPalme(dt) {
    for (const o of this.interattivi) {
      if (o.tipo !== 'palma' || o.cocchi >= 2) continue;
      o.ricresce = (o.ricresce || 0) + dt;
      if (o.ricresce > 120) { o.cocchi++; o.ricresce = 0; }
    }
  }

  colpisci() {
    if (this.stato.morto || this.suZattera) return;
    const ora = this.time.now;
    if (ora - this.ultimoColpo < 400) return;
    this.ultimoColpo = ora;
    const g = this.giocatore;
    const off = { giu: [0, 18], su: [0, -30], sx: [-24, -10], dx: [24, -10] }[this.dir];
    const cx = g.x + off[0], cy = g.y + off[1];
    // effetto del colpo
    const arco = this.add.arc(cx, cy - 10, 16, 0, 360, false, 0xffffff, 0.35).setDepth(99999);
    this.tweens.add({ targets: arco, scale: 1.6, alpha: 0, duration: 180, onComplete: () => arco.destroy() });
    const danno = this.stato.inv.coltello ? 2 : 1;
    for (const c of this.granchi) {
      if (Math.hypot(c.x - cx, c.y - cy) < 40) {
        c.vita -= danno; c.colpito = 0.25;
        const ang = Math.atan2(c.y - g.y, c.x - g.x);
        this.spingi(c, Math.cos(ang) * 12, Math.sin(ang) * 12);
        c.pausa = 0.5;
        if (c.vita <= 0) this.uccidiGranchio(c);
        break;
      }
    }
  }

  spingi(c, dx, dy) {
    if (this.mondo.aPiedi(c.x + dx, c.y) && this.libero(c.x + dx, c.y, 8)) c.x += dx;
    if (this.mondo.aPiedi(c.x, c.y + dy) && this.libero(c.x, c.y + dy, 8)) c.y += dy;
  }

  uccidiGranchio(c) {
    this.granchi.splice(this.granchi.indexOf(c), 1);
    this.tweens.add({ targets: c.s, alpha: 0, angle: 180, duration: 400, onComplete: () => c.s.destroy() });
    this.aggiungi('carne');
    this.messaggio('Granchio sconfitto: +1 polpa di granchio');
  }

  aggiornaGranchi(dt) {
    const g = this.giocatore, M = this.mondo;
    for (const c of this.granchi) {
      const dx = g.x - c.x, dy = g.y - c.y, d = Math.hypot(dx, dy);
      c.colpito = Math.max(0, c.colpito - dt);
      c.pausa = Math.max(0, c.pausa - dt);
      const caccia = !this.suZattera && d < (this.eNotte() ? 200 : 130);
      let vx = 0, vy = 0;
      if (c.carica > 0) {
        c.carica -= dt;
        if (c.carica <= 0) {
          if (d < 38 && !this.suZattera) {
            this.stato.salute = clamp(this.stato.salute - 9, 0, 100);
            this.cameras.main.shake(120, 0.004);
            g.setTint(0xff7777); this.time.delayedCall(150, () => g.clearTint());
          }
          c.attesa = 1.2;
        }
      } else if (c.pausa > 0) {
        // fermo dopo un colpo
      } else if (caccia) {
        if (d < 30 && c.attesa <= 0) { c.carica = 0.45; }
        else if (d > 24) { vx = dx / d; vy = dy / d; }
      } else {
        if (!c.meta || c.attesaMeta <= 0) {
          c.meta = { x: c.x + (this.rng() - 0.5) * 160, y: c.y + (this.rng() - 0.5) * 120 };
          c.attesaMeta = 2 + this.rng() * 3;
        }
        c.attesaMeta -= dt;
        const mx = c.meta.x - c.x, my = c.meta.y - c.y, md = Math.hypot(mx, my);
        if (md > 6) { vx = mx / md * 0.45; vy = my / md * 0.45; }
      }
      c.attesa = Math.max(0, c.attesa - dt);
      const vel = 62 * dt;
      const nx = c.x + vx * vel, ny = c.y + vy * vel;
      // i granchi stanno sulla terra e sulla riva
      const ok = (x, y) => M.tipo(x, y) !== TERRENO.PROFONDO && M.campo(x, y) > -0.1 && this.libero(x, y, 8);
      if (ok(nx, c.y)) c.x = nx; else if (c.meta) c.attesaMeta = 0;
      if (ok(c.x, ny)) c.y = ny; else if (c.meta) c.attesaMeta = 0;
      if (Math.abs(vx) > 0.05 || Math.abs(vy) > 0.05) {
        c.dir = Math.abs(vx) > Math.abs(vy) ? (vx > 0 ? 'dx' : 'sx') : (vy > 0 ? 'giu' : 'su');
        c.passo = (c.passo || 0) + dt * 14;
      }
      c.s.setTexture(c.carica > 0 ? 'granchio_attacco' : 'granchio_' + c.dir);
      c.s.setPosition(c.x, c.y - Math.abs(Math.sin(c.passo || 0)) * 1.5).setDepth(c.y);
      c.s.setAlpha(c.colpito > 0 ? 0.6 : 1);
    }
  }

  // ---------------------------------------------------------- inventario
  slotVisibili() { return ORDINE_INV.filter((k) => this.stato.inv[k] > 0); }

  usaSlot(i) {
    const k = this.slotVisibili()[i];
    if (k) this.usa(k);
  }

  usa(k) {
    const S = this.stato, o = OGGETTI[k];
    if (S.morto || !o.uso || !(S.inv[k] > 0)) {
      if (o && !o.uso) this.messaggio(o.nome + ': servirà per costruire (prossime versioni).');
      return;
    }
    S.inv[k]--;
    for (const [stat, v] of Object.entries(o.uso)) S[stat] = clamp(S[stat] + v, 0, 100);
    let t = 'Hai usato: ' + o.nome.toLowerCase();
    if (o.crudo && this.rng() < 0.35) { S.salute = clamp(S.salute - 12, 0, 100); t += '. Era crudo: ti senti male (-12 salute)'; }
    this.messaggio(t);
  }

  morte() {
    const S = this.stato;
    S.morto = true;
    const causa = S.sete <= 0 ? 'Sei morto di sete' : S.fame <= 0 ? 'Sei morto di fame' : 'Sei morto per le ferite';
    this.giocatore.setTint(0x777777).setAngle(90);
    this.time.delayedCall(900, () => {
      this.scene.stop('Interfaccia');
      this.scene.start('Fine', { causa, giorni: S.giorno });
    });
  }
}

// ---------------------------------------------------------------- Interfaccia
class Interfaccia extends Phaser.Scene {
  constructor() { super('Interfaccia'); }
  init(dati) { this.gioco = dati.gioco; }

  create() {
    this.buio = this.add.rectangle(0, 0, 10, 10, 0x0a1430, 0).setOrigin(0);
    this.g = this.add.graphics();
    const stile = { fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 };
    this.icone = ['ic_goccia', 'ic_cibo', 'ic_benda'].map((k) => this.add.image(0, 0, k).setScale(0.7));
    this.etichette = ['Sete', 'Fame', 'Salute'].map((t) => this.add.text(0, 0, t, stile));
    this.testoGiorno = this.add.text(0, 0, '', { ...stile, fontSize: '15px' }).setOrigin(1, 0);
    this.testoVersione = this.add.text(0, 0, 'Mare Alto ' + VERSIONE, { ...stile, fontSize: '11px', color: '#e8a24f' }).setOrigin(1, 0);
    this.sole = this.add.image(0, 0, 'ic_sole').setScale(0.7);
    this.prompt = this.add.text(0, 0, '', { ...stile, fontSize: '15px', backgroundColor: '#00000088', padding: { x: 8, y: 4 } }).setOrigin(0.5, 1);
    this.log = this.add.text(0, 0, '', { ...stile, fontSize: '12px', lineSpacing: 2 });
    this.slot = [];
    for (let i = 0; i < 10; i++) {
      const box = this.add.rectangle(0, 0, 44, 44, 0x12303f, 0.85).setStrokeStyle(1, 0x6aa8c0).setInteractive();
      const ic = this.add.image(0, 0, 'ic_cocco');
      const n = this.add.text(0, 0, '', { ...stile, fontSize: '12px' }).setOrigin(1, 1);
      const tasto = this.add.text(0, 0, '', { ...stile, fontSize: '10px', color: '#bcd' });
      box.on('pointerdown', (p, lx, ly, ev) => { ev.stopPropagation(); this.gioco.usaSlot(i); });
      this.slot.push({ box, ic, n, tasto });
    }
    this.touch = this.sys.game.device.input.touch;
    if (this.touch) this.creaComandiTouch();
    this.disponi();
    this.scale.on('resize', this.disponi, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.disponi, this));
  }

  creaComandiTouch() {
    this.joyBase = this.add.circle(0, 0, 56, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.35);
    this.joyPomo = this.add.circle(0, 0, 24, 0xffffff, 0.35);
    this.btnAzione = this.add.circle(0, 0, 34, 0x2f8fbf, 0.75).setInteractive();
    this.btnAzioneT = this.add.text(0, 0, 'AZIONE', { fontFamily: 'monospace', fontSize: '11px', color: '#fff' }).setOrigin(0.5);
    this.btnColpo = this.add.circle(0, 0, 28, 0xbf5a2f, 0.75).setInteractive();
    this.btnColpoT = this.add.text(0, 0, 'COLPISCI', { fontFamily: 'monospace', fontSize: '10px', color: '#fff' }).setOrigin(0.5);
    this.btnAzione.on('pointerdown', () => this.gioco.azione());
    this.btnColpo.on('pointerdown', () => this.gioco.colpisci());
    this.joyId = null;
    this.input.addPointer(2);
    this.input.on('pointerdown', (p) => {
      if (p.x < this.scale.width * 0.45 && p.y > this.scale.height * 0.35 && this.joyId === null) {
        this.joyId = p.id; this.joyBase.setPosition(p.x, p.y); this.joyPomo.setPosition(p.x, p.y);
      }
    });
    this.input.on('pointermove', (p) => {
      if (p.id !== this.joyId) return;
      let dx = p.x - this.joyBase.x, dy = p.y - this.joyBase.y;
      const d = Math.hypot(dx, dy), max = 50;
      if (d > max) { dx = dx / d * max; dy = dy / d * max; }
      this.joyPomo.setPosition(this.joyBase.x + dx, this.joyBase.y + dy);
      this.gioco.joy.x = dx / max; this.gioco.joy.y = dy / max;
    });
    const rilascia = (p) => {
      if (p.id !== this.joyId) return;
      this.joyId = null; this.gioco.joy.x = 0; this.gioco.joy.y = 0;
      this.joyPomo.setPosition(this.joyBase.x, this.joyBase.y);
    };
    this.input.on('pointerup', rilascia);
    this.input.on('pointerupoutside', rilascia);
  }

  disponi() {
    const w = this.scale.width, h = this.scale.height;
    this.buio.setSize(w, h);
    this.icone.forEach((ic, i) => ic.setPosition(20, 22 + i * 24));
    this.etichette.forEach((t, i) => t.setPosition(36, 14 + i * 24));
    this.testoGiorno.setPosition(w - 12, 10);
    this.testoVersione.setPosition(w - 12, 32);
    this.sole.setPosition(w - 12 - 120, 20);
    this.log.setPosition(12, 92);
    this.prompt.setPosition(w / 2, h - 64);
    this.ySlot = h - 30;
    if (this.touch) {
      this.joyBase.setPosition(90, h - 120); this.joyPomo.setPosition(90, h - 120);
      this.btnAzione.setPosition(w - 60, h - 130); this.btnAzioneT.setPosition(w - 60, h - 130);
      this.btnColpo.setPosition(w - 130, h - 90); this.btnColpoT.setPosition(w - 130, h - 90);
    }
  }

  update() {
    const G = this.gioco, S = G.stato;
    if (!S) return;
    const w = this.scale.width, h = this.scale.height;
    // barre
    this.g.clear();
    const valori = [[S.sete, 0x4fb3e8], [S.fame, 0xe8a24f], [S.salute, 0xd9534f]];
    valori.forEach(([v, col], i) => {
      const y = 28 + i * 24;
      this.g.fillStyle(0x0b1d26, 0.8).fillRect(94, y - 13, 104, 10);
      this.g.fillStyle(v < 20 ? 0xff3333 : col, 1).fillRect(96, y - 11, v, 6);
    });
    // ora del giorno
    const notte = G.eNotte();
    this.testoGiorno.setText(`Giorno ${S.giorno} · ${notte ? 'notte' : S.ora < 0.12 ? 'alba' : S.ora > 0.52 ? 'tramonto' : 'giorno'}`);
    this.sole.setPosition(w - 12 - this.testoGiorno.width - 16, 20).setAlpha(notte ? 0.3 : 1);
    // buio: cresce al tramonto, cala all'alba
    const o = S.ora;
    let a = 0;
    if (o > 0.52 && o < 0.66) a = (o - 0.52) / 0.14;
    else if (o >= 0.66 && o < 0.9) a = 1;
    else if (o >= 0.9) a = 1 - (o - 0.9) / 0.1;
    this.buio.setFillStyle(o > 0.52 && o < 0.62 ? 0x3a1a30 : 0x0a1430, a * 0.55);
    // suggerimento
    const s = G.suggerimento();
    this.prompt.setText(s).setVisible(!!s);
    if (G.pesca) {
      const p = G.pesca.tempo / G.pesca.durata;
      this.g.fillStyle(0x000000, 0.6).fillRect(w / 2 - 60, h - 100, 120, 8);
      this.g.fillStyle(0x4fb3e8, 1).fillRect(w / 2 - 59, h - 99, 118 * p, 6);
    }
    // messaggi recenti
    S.messaggi = S.messaggi.filter((m) => G.time.now - m.tempo < 6000);
    this.log.setText(S.messaggi.map((m) => m.testo).join('\n'));
    // inventario
    const voci = G.slotVisibili();
    const lato = 46, tot = voci.length * lato;
    const x0 = w / 2 - tot / 2 + lato / 2;
    this.prompt.setY(h - (voci.length ? 62 : 16));
    this.slot.forEach((sl, i) => {
      const k = voci[i];
      const vis = !!k;
      sl.box.setVisible(vis); sl.ic.setVisible(vis); sl.n.setVisible(vis); sl.tasto.setVisible(vis && !this.touch);
      if (!vis) return;
      const x = x0 + i * lato, y = this.ySlot;
      const ogg = OGGETTI[k];
      sl.box.setPosition(x, y).setStrokeStyle(1, ogg.uso ? 0x9ad0e0 : 0x56707a);
      sl.ic.setTexture(ogg.icona).setPosition(x, y);
      if (ogg.tinta) sl.ic.setTint(ogg.tinta); else sl.ic.clearTint();
      sl.n.setText(String(S.inv[k])).setPosition(x + 20, y + 21);
      sl.tasto.setText(String(i + 1)).setPosition(x - 19, y - 21);
    });
  }
}

// ---------------------------------------------------------------- Fine
class Fine extends Phaser.Scene {
  constructor() { super('Fine'); }
  init(d) { this.dati = d; }
  create() {
    const w = this.scale.width, h = this.scale.height;
    this.add.rectangle(0, 0, w, h, 0x05080c, 0.85).setOrigin(0);
    this.add.text(w / 2, h * 0.38, this.dati.causa, { fontFamily: 'monospace', fontSize: '30px', color: '#e8a24f' }).setOrigin(0.5);
    const g = this.dati.giorni;
    this.add.text(w / 2, h * 0.5, `Sei sopravvissuto ${g} ${g === 1 ? 'giorno' : 'giorni'} sul Mare Alto.`, { fontFamily: 'monospace', fontSize: '16px', color: '#d8e6ea' }).setOrigin(0.5);
    this.add.text(w / 2, h * 0.64, 'Tocca o premi INVIO per ricominciare', { fontFamily: 'monospace', fontSize: '15px', color: '#ffffff' }).setOrigin(0.5);
    const di = () => { this.scene.stop('Gioco'); this.scene.start('Gioco'); };
    this.time.delayedCall(600, () => {
      this.input.keyboard.once('keydown-ENTER', di);
      this.input.once('pointerdown', di);
    });
  }
}

// ---------------------------------------------------------------- Avvio di Phaser
window.addEventListener('load', () => {
  document.title = 'GPverse — Mare Alto ' + VERSIONE;
  window.mareAlto = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'gioco',
    backgroundColor: '#0d3550',
    pixelArt: true,
    scale: { mode: Phaser.Scale.RESIZE, width: window.innerWidth, height: window.innerHeight },
    input: { activePointers: 3 },
    scene: [Avvio, Titolo, Gioco, Interfaccia, Fine],
  });
});
