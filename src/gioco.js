// GPverse — Mare Alto · prototipo giocabile
'use strict';

const VERSIONE = 'V0.3.0';
const CHIAVE_SALVATAGGIO = 'mareAlto.salvataggio';
const OSSIGENO_SECONDI = 22; // quanto si resiste sott'acqua
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

// Cosa si puo' costruire e quanto costa
const RICETTE = [
  { id: 'falo', nome: 'Falò', costo: { legna: 3 }, cosa: 'Cucina pesce e granchio' },
  { id: 'raccoglitore', nome: 'Raccoglitore di pioggia', costo: { rottame: 2, corda: 1 }, cosa: 'Raccoglie acqua da bere' },
  { id: 'coltello', nome: 'Coltello', costo: { rottame: 1, legna: 1 }, cosa: 'Colpi doppi ai granchi', oggetto: true },
  { id: 'baracca', nome: 'Baracca', costo: { rottame: 5, legna: 4, corda: 2 }, cosa: "Dormi al sicuro fino all'alba" },
  { id: 'zattera', nome: 'Zattera', costo: { legna: 8, corda: 4, rottame: 3 }, cosa: 'Naviga verso le altre isole' },
];

const SPRITE = ['sopr_giu', 'sopr_su', 'sopr_sx', 'sopr_dx', 'baracca', 'zattera', 'falo', 'raccoglitore',
  'cassa', 'barile', 'rottami', 'pneumatico', 'legna', 'corda', 'ossa', 'rete',
  'roccia_grande', 'roccia', 'erba', 'cespuglio', 'albero_morto', 'palma', 'alghe', 'corallo',
  'granchio_giu', 'granchio_su', 'granchio_sx', 'granchio_dx', 'granchio_attacco',
  'campanile', 'archi', 'muro', 'palazzo',
  'ic_goccia', 'ic_cibo', 'ic_pesce', 'ic_cocco', 'ic_bottiglia', 'ic_legna', 'ic_rottame', 'ic_corda',
  'ic_coltello', 'ic_tanica', 'ic_benda', 'ic_sole'];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FONT = 'monospace';
const costoTesto = (c) => Object.entries(c).map(([k, n]) => `${n} ${OGGETTI[k].nome.toLowerCase()}`).join(', ');

// ---------------------------------------------------------------- Salvataggi
// Il salvataggio vive nel browser (localStorage) di ogni dispositivo.
// Per passare da PC a telefono si usa il "codice di salvataggio".
function leggiSalvataggio() {
  try { const t = localStorage.getItem(CHIAVE_SALVATAGGIO); return t ? JSON.parse(t) : null; } catch (e) { return null; }
}
function scriviSalvataggio(d) {
  try { localStorage.setItem(CHIAVE_SALVATAGGIO, JSON.stringify(d)); return true; } catch (e) { return false; }
}
function cancellaSalvataggio() { try { localStorage.removeItem(CHIAVE_SALVATAGGIO); } catch (e) { /* niente */ } }
function codiceDa(d) { return 'MAREALTO1:' + btoa(unescape(encodeURIComponent(JSON.stringify(d)))); }
function datiDa(codice) {
  const t = (codice || '').trim();
  if (!t.startsWith('MAREALTO1:')) return null;
  try {
    const d = JSON.parse(decodeURIComponent(escape(atob(t.slice(10)))));
    return d && d.stato && d.pos ? d : null;
  } catch (e) { return null; }
}

// Pannello HTML per esportare/importare il codice (sopra il canvas del gioco)
function apriPannello(game, alCaricamento) {
  const el = document.getElementById('pannello');
  const area = document.getElementById('codice');
  const esito = document.getElementById('esito');
  const d = leggiSalvataggio();
  area.value = d ? codiceDa(d) : '';
  esito.textContent = d ? `Partita al giorno ${d.stato.giorno}. Copia il codice e incollalo sull'altro dispositivo.` : 'Nessuna partita salvata su questo dispositivo. Puoi incollare qui un codice.';
  el.hidden = false;
  game.input.keyboard.enabled = false;
  game.input.keyboard.clearCaptures();
  const chiudi = () => { el.hidden = true; game.input.keyboard.enabled = true; };
  document.getElementById('btnChiudi').onclick = chiudi;
  document.getElementById('btnCopia').onclick = async () => {
    area.select();
    try { await navigator.clipboard.writeText(area.value); esito.textContent = 'Codice copiato.'; }
    catch (e) { esito.textContent = 'Seleziona il testo e copialo a mano.'; }
  };
  document.getElementById('btnCarica').onclick = () => {
    const nuovi = datiDa(area.value);
    if (!nuovi) { esito.textContent = 'Codice non valido: deve iniziare con MAREALTO1:'; return; }
    scriviSalvataggio(nuovi);
    esito.textContent = `Caricata la partita del giorno ${nuovi.stato.giorno}.`;
    chiudi();
    alCaricamento();
  };
}

// ---------------------------------------------------------------- Caricamento
class Avvio extends Phaser.Scene {
  constructor() { super('Avvio'); }
  preload() {
    const w = this.scale.width, h = this.scale.height;
    const barra = this.add.rectangle(w / 2 - 150, h / 2, 0, 8, 0x4fb3e8).setOrigin(0, 0.5);
    this.add.text(w / 2, h / 2 - 30, 'Mare Alto', { fontFamily: FONT, fontSize: '22px', color: '#e8d9b0' }).setOrigin(0.5);
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
      this.add.text(w / 2, h * 0.22, 'GPverse', { fontFamily: FONT, fontSize: piccolo ? '16px' : '22px', color: '#4fb3e8' }).setOrigin(0.5);
      this.add.text(w / 2, h * 0.22 + (piccolo ? 34 : 50), 'MARE ALTO', {
        fontFamily: FONT, fontSize: piccolo ? '40px' : '72px', color: '#f0e2b6', stroke: '#2a1408', strokeThickness: 8,
      }).setOrigin(0.5);
      this.add.text(w / 2, h * 0.22 + (piccolo ? 72 : 110), VERSIONE, { fontFamily: FONT, fontSize: '16px', color: '#e8a24f' }).setOrigin(0.5);
      const touch = this.sys.game.device.input.touch;
      const comandi = touch
        ? 'Joystick a sinistra per muoverti\nAZIONE: raccogli, fruga, bevi, cucina, pesca\nCOLPISCI: attacca i granchi\nCOSTRUISCI: falò, raccoglitore, baracca, zattera\nTocca un oggetto in basso per usarlo'
        : 'WASD / frecce: muoviti\nE: raccogli, fruga, bevi, cucina, pesca\nSPAZIO o clic: colpisci\nC: costruisci\n1-9: usa un oggetto dell\'inventario';
      this.add.text(w / 2, h * 0.61, comandi, {
        fontFamily: FONT, fontSize: piccolo ? '12px' : '15px', color: '#d8e6ea', align: 'center', lineSpacing: 6,
      }).setOrigin(0.5);
      const salvato = leggiSalvataggio();
      const bottone = (y, testo, col, fn) => {
        const b = this.add.text(w / 2, y, testo, {
          fontFamily: FONT, fontSize: piccolo ? '16px' : '19px', color: '#ffffff', backgroundColor: col, padding: { x: 16, y: 8 },
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        b.on('pointerdown', fn);
        return b;
      };
      let y = h * 0.8;
      if (salvato) {
        bottone(y, `Continua · giorno ${salvato.stato.giorno}`, '#1f6a4a', () => this.continua());
        y += piccolo ? 46 : 52;
      }
      bottone(y, 'Nuova partita', '#2f5f8a', () => this.nuova());
      this.add.text(w / 2, Math.min(h - 16, y + (piccolo ? 40 : 46)), 'Codice di salvataggio (PC ⇄ telefono)', {
        fontFamily: FONT, fontSize: '13px', color: '#bfe3f0', backgroundColor: '#00000066', padding: { x: 8, y: 4 },
      }).setOrigin(0.5).setInteractive({ useHandCursor: true })
        .on('pointerdown', () => apriPannello(this.game, () => this.scene.restart()));
      if (!touch) this.add.text(w / 2, h - 8, salvato ? 'INVIO: continua' : 'INVIO: nuova partita', { fontFamily: FONT, fontSize: '12px', color: '#9fb8c4' }).setOrigin(0.5, 1);
    };
    disegna();
    this.scale.on('resize', disegna, this);
    this.events.once('shutdown', () => this.scale.off('resize', disegna, this));
    this.input.keyboard.on('keydown-ENTER', () => (leggiSalvataggio() ? this.continua() : this.nuova()));
  }

  continua() { this.scene.start('Gioco', { carica: true }); }

  nuova() {
    const salvato = leggiSalvataggio();
    if (salvato && !this.conferma) {
      this.conferma = true;
      const w = this.scale.width, h = this.scale.height;
      const t = this.add.text(w / 2, h * 0.72, 'La partita salvata verrà persa. Tocca di nuovo "Nuova partita".', {
        fontFamily: FONT, fontSize: '13px', color: '#ffd28a', backgroundColor: '#000000aa', padding: { x: 8, y: 4 }, align: 'center', wordWrap: { width: w - 30 },
      }).setOrigin(0.5);
      this.time.delayedCall(3500, () => { t.destroy(); this.conferma = false; });
      return;
    }
    cancellaSalvataggio();
    this.scene.start('Naufragio');
  }
}

// ---------------------------------------------------------------- Naufragio (animazione iniziale)
class Naufragio extends Phaser.Scene {
  constructor() { super('Naufragio'); }
  create() {
    const w = this.scale.width, h = this.scale.height;
    const cx = w / 2, cy = h * 0.52;
    this.finito = false;
    this.cameras.main.setBackgroundColor('#04121c');

    // mare in tempesta
    this.mare = this.add.tileSprite(0, 0, w, h, 't_profondo').setOrigin(0).setTint(0x3a5a78);
    this.onde = this.add.graphics();
    this.zattera = this.add.image(cx, cy, 'zattera').setScale(1.4);
    this.uomo = this.add.image(cx + 60, cy - 8, 'sopr_giu').setOrigin(0.5, 1).setScale(1.4);
    this.pezzi = ['cassa', 'barile', 'legna', 'corda', 'rottami', 'barile'].map((k) => this.add.image(cx, cy, k).setScale(1.3).setVisible(false));
    this.pioggia = this.add.graphics();
    this.lampo = this.add.rectangle(0, 0, w, h, 0xffffff, 0).setOrigin(0);
    this.buio = this.add.rectangle(0, 0, w, h, 0x000000, 1).setOrigin(0);
    this.testo = this.add.text(cx, h * 0.14, '', {
      fontFamily: FONT, fontSize: w < 600 ? '15px' : '20px', color: '#f0e2b6', align: 'center',
      stroke: '#000000', strokeThickness: 4, wordWrap: { width: Math.min(w - 40, 760) },
    }).setOrigin(0.5);
    const salta = this.add.text(w - 16, h - 16, 'Salta ▶', {
      fontFamily: FONT, fontSize: '15px', color: '#ffffff', backgroundColor: '#00000088', padding: { x: 10, y: 6 },
    }).setOrigin(1, 1).setInteractive();
    salta.on('pointerdown', () => this.fine());
    this.input.keyboard.once('keydown-ENTER', () => this.fine());
    this.input.keyboard.once('keydown-ESC', () => this.fine());

    this.tweens.add({ targets: this.buio, alpha: 0, duration: 1500 });
    this.dondola = this.tweens.add({ targets: [this.zattera, this.uomo], angle: { from: -9, to: 9 }, y: '+=10', yoyo: true, repeat: -1, duration: 900, ease: 'Sine.inOut' });

    const passi = [
      [300, () => this.scrivi('Anno 2426. Da quattro secoli il mare copre l\'Italia.')],
      [4200, () => this.scrivi('Recuperavi rottami tra le rovine sommerse, finché non è arrivata la tempesta.')],
      [7600, () => this.fulmine()],
      [8800, () => this.fulmine()],
      [9400, () => this.rottura()],
      [10400, () => this.scrivi('L\'onda ha spezzato la zattera. Hai perso tutto.')],
      [13800, () => this.scrivi('Poi, il buio.')],
      [15200, () => this.tweens.add({ targets: this.buio, alpha: 1, duration: 1600 })],
      [17200, () => this.fine()],
    ];
    for (const [t, f] of passi) this.time.delayedCall(t, f);
  }

  scrivi(t) {
    this.testo.setText('').setAlpha(1);
    let i = 0;
    this.time.addEvent({ delay: 35, repeat: t.length - 1, callback: () => { this.testo.setText(t.slice(0, ++i)); } });
  }

  fulmine() {
    this.lampo.setAlpha(0.85);
    this.tweens.add({ targets: this.lampo, alpha: 0, duration: 350 });
    this.cameras.main.shake(300, 0.012);
  }

  rottura() {
    this.fulmine();
    this.dondola.stop();
    const z = this.zattera;
    this.tweens.add({ targets: z, angle: 35, alpha: 0, scaleY: 0.4, y: z.y + 50, duration: 1800, ease: 'Quad.in' });
    this.pezzi.forEach((p, i) => {
      const a = (i / this.pezzi.length) * Math.PI * 2;
      p.setPosition(z.x, z.y).setVisible(true);
      this.tweens.add({ targets: p, x: z.x + Math.cos(a) * 220, y: z.y + Math.sin(a) * 140, angle: 200 * (i % 2 ? 1 : -1), duration: 1400, ease: 'Quad.out' });
      this.tweens.add({ targets: p, y: '+=8', yoyo: true, repeat: -1, duration: 700, delay: 1400 });
    });
    // il sopravvissuto cade in acqua e viene trascinato via
    const u = this.uomo;
    this.tweens.add({ targets: u, x: u.x - 160, y: u.y + 120, angle: -20, duration: 1600, ease: 'Quad.out',
      onComplete: () => {
        u.setCrop(0, 0, u.width, u.height * 0.45);
        this.tweens.add({ targets: u, x: '-=400', y: '+=40', duration: 6000 });
      } });
  }

  update(t, dt) {
    if (!this.mare) return;
    const w = this.scale.width, h = this.scale.height;
    this.mare.tilePositionX += dt * 0.08;
    this.mare.tilePositionY -= dt * 0.03;
    // pioggia obliqua
    this.pioggia.clear().lineStyle(1, 0xbfd8e8, 0.45);
    for (let i = 0; i < 140; i++) {
      const x = ((i * 97 + t * 0.9) % (w + 200)) - 100, y = ((i * 53 + t * 1.6) % (h + 100)) - 50;
      this.pioggia.lineBetween(x, y, x - 10, y + 22);
    }
    // creste delle onde
    this.onde.clear().lineStyle(2, 0xd8f0ff, 0.35);
    for (let r = 0; r < 9; r++) {
      const y = (r * 97 + t * 0.04) % h;
      const x = ((r * 211 + t * 0.12) % (w + 300)) - 150;
      this.onde.lineBetween(x, y, x + 60 + r * 4, y - 4);
    }
  }

  fine() {
    if (this.finito) return;
    this.finito = true;
    this.scene.start('Gioco', { intro: true });
  }
}

// ---------------------------------------------------------------- Gioco
class Gioco extends Phaser.Scene {
  constructor() { super('Gioco'); }
  init(dati) {
    this.intro = !!(dati && dati.intro);
    this.salvataggio = dati && dati.carica ? leggiSalvataggio() : null;
  }

  create() {
    this.rng = rngConSeme(20261120);
    this.mondo = new Mondo(20261120);
    const M = this.mondo;

    if (!this.textures.exists('terreno')) {
      const tex = this.textures.createCanvas('terreno', M.L, M.A);
      const img = {};
      for (const k of ['sabbia', 'basso', 'profondo', 'roccia']) img[k] = this.textures.get('t_' + k).getSourceImage();
      M.disegna(tex.getContext(), img);
      tex.refresh();
    }
    this.add.image(0, 0, 'terreno').setOrigin(0).setDepth(-10);

    this.ostacoli = [];
    this.interattivi = [];
    this.granchi = [];
    this.zattera = null;
    this.menuAperto = false;
    this.consigliDati = new Set();
    this.prossimoId = 0;
    this.rimossi = new Set();
    this.costruiti = [];

    this.stato = {
      sete: 85, fame: 75, salute: 80, ossigeno: 100,
      giorno: 1, ora: 0.03,
      inv: {},
      morto: false,
      messaggi: [],
    };

    // punto di approdo: la spiaggia a sud dell'atollo
    const atollo = M.isole[0];
    let approdo = { x: atollo.x, y: atollo.y };
    for (let y = atollo.y; y < atollo.y + 600; y += 4) {
      if (M.campo(atollo.x, y) < 0.18) { approdo = { x: atollo.x, y: y - 6 }; break; }
    }
    this.approdo = approdo;
    this.piazzaMondo();

    const inizio = this.cercaTerra(approdo.x, approdo.y);
    this.giocatore = this.add.image(inizio.x, inizio.y, 'sopr_giu').setOrigin(0.5, 1);
    this.ombra = this.add.ellipse(inizio.x, inizio.y, 26, 9, 0x000000, 0.25);
    this.increspatura = this.add.ellipse(inizio.x, inizio.y, 40, 14).setStrokeStyle(2, 0xffffff, 0.5).setVisible(false);
    this.tweens.add({ targets: this.increspatura, scaleX: 1.25, scaleY: 1.25, alpha: 0.3, yoyo: true, repeat: -1, duration: 600 });
    this.dir = 'giu';
    this.passo = 0;
    this.suZattera = false;
    this.pesca = null;
    this.ultimoColpo = 0;
    this.bloccato = false;
    this.avvisoLargo = 0;

    const cam = this.cameras.main;
    cam.setBounds(0, 0, M.L, M.A);
    cam.startFollow(this.giocatore, true, 0.12, 0.12);
    cam.setRoundPixels(true);
    this.adattaZoom();
    this.scale.on('resize', this.adattaZoom, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.adattaZoom, this));

    this.tasti = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,E,C,SPACE,ESC,ONE,TWO,THREE,FOUR,FIVE,SIX,SEVEN,EIGHT,NINE');
    this.input.keyboard.on('keydown-E', () => this.azione());
    this.input.keyboard.on('keydown-SPACE', () => this.colpisci());
    this.input.keyboard.on('keydown-C', () => this.apriMenu(!this.menuAperto));
    this.input.keyboard.on('keydown-ESC', () => this.apriMenu(false));
    ['ONE', 'TWO', 'THREE', 'FOUR', 'FIVE', 'SIX', 'SEVEN', 'EIGHT', 'NINE'].forEach((k, i) => {
      this.input.keyboard.on('keydown-' + k, () => (this.menuAperto ? this.costruisci(RICETTE[i] && RICETTE[i].id) : this.usaSlot(i)));
    });
    this.input.on('pointerdown', (p) => {
      if (this.sys.game.device.input.touch || this.menuAperto) return;
      if (p.y > this.scale.height - 80) return;
      this.colpisci();
    });
    this.joy = { x: 0, y: 0 };

    this.scene.launch('Interfaccia', { gioco: this });

    this.time.addEvent({ delay: 40000, loop: true, callback: () => {
      for (const o of this.interattivi) if (o.tipo === 'raccoglitore' && o.acqua < 3) o.acqua++;
    } });
    this.time.addEvent({ delay: 15000, loop: true, callback: () => this.generaGranchio() });
    this.time.addEvent({ delay: 30000, loop: true, callback: () => this.generaLegna() });
    this.time.addEvent({ delay: 2500, loop: true, callback: () => this.consigli() });

    if (this.salvataggio) this.applicaSalvataggio(this.salvataggio);
    else if (this.intro) this.risveglio();
    else this.messaggio('Sei sull\'Atollo del Campanile. Non hai niente: fruga tra i resti della zattera.');

    // salvataggio automatico
    this.time.addEvent({ delay: 15000, loop: true, callback: () => this.salva() });
    const nascosto = () => this.salva();
    this.game.events.on('hidden', nascosto);
    window.addEventListener('pagehide', nascosto);
    this.events.once('shutdown', () => { this.game.events.off('hidden', nascosto); window.removeEventListener('pagehide', nascosto); });
  }

  salva() {
    const S = this.stato, g = this.giocatore;
    if (!g || S.morto || this.bloccato) return;
    const legnaExtra = this.interattivi.filter((o) => o.id && o.id[0] === 'd').map((o) => ({ x: Math.round(o.sprite.x), y: Math.round(o.sprite.y) }));
    const aperti = this.interattivi.filter((o) => o.tipo === 'contenitore' && !o.pieno).map((o) => o.id);
    const cocchi = {};
    for (const o of this.interattivi) if (o.tipo === 'palma' && o.cocchi < 2) cocchi[o.id] = o.cocchi;
    scriviSalvataggio({
      versione: VERSIONE, quando: Date.now(),
      stato: { sete: S.sete, fame: S.fame, salute: S.salute, ossigeno: S.ossigeno, giorno: S.giorno, ora: S.ora, inv: S.inv },
      pos: { x: Math.round(g.x), y: Math.round(g.y), dir: this.dir },
      suZattera: this.suZattera,
      zattera: this.zattera ? { x: Math.round(this.zattera.rx), y: Math.round(this.zattera.ry) } : null,
      rimossi: [...this.rimossi], aperti, cocchi, legnaExtra,
      costruiti: this.costruiti.map((c) => ({ id: c.id, x: c.x, y: c.y, acqua: c.ogg ? c.ogg.acqua : undefined })),
      consigli: [...this.consigliDati],
    });
  }

  applicaSalvataggio(d) {
    const S = this.stato, g = this.giocatore;
    Object.assign(S, { sete: d.stato.sete, fame: d.stato.fame, salute: d.stato.salute, ossigeno: d.stato.ossigeno ?? 100,
      giorno: d.stato.giorno, ora: d.stato.ora, inv: { ...d.stato.inv } });
    const rimossi = new Set(d.rimossi || []), aperti = new Set(d.aperti || []);
    for (const o of [...this.interattivi]) {
      if (rimossi.has(o.id)) {
        this.rimossi.add(o.id);
        this.interattivi.splice(this.interattivi.indexOf(o), 1);
        if (o.solido) this.ostacoli.splice(this.ostacoli.indexOf(o.solido), 1);
        o.sprite.destroy();
      } else if (aperti.has(o.id)) { o.pieno = false; o.sprite.setTint(0x9a8f80); }
      if (d.cocchi && d.cocchi[o.id] !== undefined) o.cocchi = d.cocchi[o.id];
    }
    // la legna iniziale non salvata come rimossa resta; quella arrivata dopo viene ricreata
    for (const p of d.legnaExtra || []) this.creaRaccoglibile('legna', 'legna', { x: p.x, y: p.y }, 'd');
    for (const c of d.costruiti || []) {
      if (c.id === 'zattera') continue;
      const ogg = this.creaCostruzione(c.id, { x: c.x, y: c.y }, true);
      if (ogg && c.acqua !== undefined) ogg.acqua = c.acqua;
    }
    if (d.zattera) this.creaCostruzione('zattera', d.zattera, true);
    for (const c of d.consigli || []) this.consigliDati.add(c);
    g.setPosition(d.pos.x, d.pos.y); this.dir = d.pos.dir || 'giu';
    if (d.suZattera && this.zattera) {
      this.suZattera = true; this.ombra.setVisible(false);
    }
    this.cameras.main.fadeIn(800, 0, 0, 0);
    this.messaggio(`Partita ripresa: giorno ${S.giorno}.`);
  }

  // il sopravvissuto si risveglia sdraiato sulla spiaggia
  risveglio() {
    const g = this.giocatore;
    this.bloccato = true;
    g.setAngle(-90).setTint(0xc8b8a8);
    this.cameras.main.fadeIn(2500, 0, 0, 0);
    this.time.delayedCall(1800, () => this.messaggio('Ti risvegli su un atollo sconosciuto.'));
    this.time.delayedCall(3200, () => {
      this.tweens.add({ targets: g, angle: 0, duration: 900, ease: 'Back.out', onComplete: () => {
        g.clearTint(); this.bloccato = false;
        this.messaggio('Il mare ha portato a riva i resti della zattera. Frugali (E).');
      } });
    });
  }

  consiglio(id, testo, cond) {
    if (this.consigliDati.has(id) || !cond) return;
    this.consigliDati.add(id);
    this.messaggio(testo);
  }

  consigli() {
    if (this.bloccato || this.stato.morto) return;
    const inv = this.stato.inv, S = this.stato;
    const ha = (t) => this.interattivi.some((o) => o.tipo === t);
    this.consiglio('falo', 'Con 3 legna puoi costruire un falò (C).', (inv.legna || 0) >= 3 && !ha('fuoco'));
    this.consiglio('acqua', 'Hai sete. I cocchi delle palme dissetano; un raccoglitore di pioggia ti darà acqua.', S.sete < 55);
    this.consiglio('racc', 'Con 2 rottami e 1 corda costruisci un raccoglitore di pioggia (C).', (inv.rottame || 0) >= 2 && (inv.corda || 0) >= 1 && !ha('raccoglitore'));
    this.consiglio('pesca', 'Fame? Entra in acqua bassa vicino a riva e pesca (E).', S.fame < 50);
    this.consiglio('baracca', 'La notte arriva: con una baracca puoi dormire al sicuro.', S.ora > 0.45 && !ha('baracca'));
    this.consiglio('zattera', 'Per raggiungere le altre isole serve una zattera: 8 legna, 4 corde, 3 rottami.', ha('baracca') && !this.zattera);
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

  // punto di spiaggia vicino all'approdo (per i resti del naufragio)
  puntoRelitto(raggio) {
    const M = this.mondo, a0 = this.approdo;
    for (let i = 0; i < 400; i++) {
      const a = this.rng() * Math.PI * 2, d = 40 + this.rng() * 230;
      const x = a0.x + Math.cos(a) * d * 1.4, y = a0.y + Math.sin(a) * d * 0.7;
      const f = M.campo(x, y);
      if (!M.terra(x, y) || f > 0.45 || !this.libero(x, y, raggio)) continue;
      if (Math.hypot(x - a0.x, y - a0.y) < 50) continue;
      return { x, y };
    }
    return null;
  }

  sprite(x, y, chiave, oy = 1) {
    return this.add.image(x, y, chiave).setOrigin(0.5, oy).setDepth(y);
  }

  solido(x, y, r) { const o = { x, y, r }; this.ostacoli.push(o); return o; }

  piazzaMondo() {
    const isole = this.mondo.isole;

    // resti del naufragio sulla spiaggia di approdo
    const relitto = [
      ['cassa', 'contenitore', 3], ['barile', 'contenitore', 3],
      ['rottami', 'rottame', 5], ['corda', 'corda', 2], ['legna', 'legna', 3], ['rete', 'rete', 2],
    ];
    for (const [k, tipo, n] of relitto) {
      for (let i = 0; i < n; i++) {
        const p = this.puntoRelitto(18);
        if (!p) continue;
        if (tipo === 'contenitore') this.creaContenitore(k, p);
        else this.creaRaccoglibile(k, tipo, p);
      }
    }

    // casse e barili sulle altre isole
    for (let i = 0; i < 6; i++) {
      const p = this.puntoCasuale(isole[1 + (i % 3)], 0.18, 0.9, 30, 'terra');
      if (p) this.creaContenitore(i % 2 ? 'barile' : 'cassa', p);
    }

    const deco = [
      ['roccia_grande', 5, 0.3, 0.95, 40, true], ['roccia', 10, 0.15, 0.95, 22, true],
      ['palma', 9, 0.15, 0.7, 26, true], ['albero_morto', 4, 0.3, 0.9, 22, true],
      ['erba', 30, 0.14, 0.9, 10, false], ['cespuglio', 14, 0.2, 0.9, 16, false],
      ['ossa', 4, 0.15, 0.6, 18, false], ['pneumatico', 4, 0.13, 0.4, 16, false],
    ];
    for (const [k, n, minF, maxF, r, blocca] of deco) {
      for (let i = 0; i < n; i++) {
        const isola = isole[i % 4];
        const p = this.puntoCasuale(isola, minF, maxF, r, 'terra');
        if (!p) continue;
        const s = this.sprite(p.x, p.y, k);
        if (k === 'erba' || k === 'cespuglio' || k === 'ossa') s.setDepth(p.y - 30);
        if (blocca) this.solido(p.x, p.y - 6, k === 'palma' || k === 'albero_morto' ? 10 : r * 0.8);
        if (k === 'palma') this.interattivi.push({ id: this.nuovoId('i'), tipo: 'palma', x: p.x, y: p.y - 6, r: 44, cocchi: 2, sprite: s });
        if (k === 'erba' || k === 'cespuglio' || k === 'palma') {
          this.tweens.add({ targets: s, angle: { from: -1.5, to: 1.5 }, yoyo: true, repeat: -1, duration: 1800 + this.rng() * 900, ease: 'Sine.inOut' });
        }
      }
    }

    for (let i = 0; i < 6; i++) this.generaLegna(true);
    for (let i = 0; i < 6; i++) {
      const p = this.puntoCasuale(isole[1 + (i % 3)], 0.13, 0.8, 16, 'terra');
      if (p) this.creaRaccoglibile(i % 2 ? 'corda' : 'rottami', i % 2 ? 'corda' : 'rottame', p);
    }

    const rovine = [['campanile', isole[4], 70], ['archi', isole[4], 90], ['palazzo', isole[5], 70],
      ['muro', isole[5], 60], ['muro', isole[6], 60], ['archi', isole[6], 90], ['palazzo', isole[4], 70]];
    for (const [k, isola, r] of rovine) {
      const p = this.puntoCasuale(isola, -0.3, 0.1, r, 'acqua');
      if (!p) continue;
      this.sprite(p.x, p.y, k);
      this.solido(p.x, p.y - r * 0.4, r * 0.75);
    }
    for (let i = 0; i < 26; i++) {
      const p = this.puntoCasuale(isole[4 + (i % 3)], -0.34, 0.11, 10, 'acqua');
      if (p) this.sprite(p.x, p.y, i % 2 ? 'corallo' : 'alghe').setDepth(p.y - 40).setAlpha(0.85);
    }

    for (let i = 0; i < 4; i++) this.generaGranchio(true);
  }

  nuovoId(pref) { return pref + (this.prossimoId++); }

  creaContenitore(k, p) {
    const s = this.sprite(p.x, p.y, k);
    const solido = this.solido(p.x, p.y - 6, 12);
    this.interattivi.push({ id: this.nuovoId('i'), tipo: 'contenitore', chiave: k, x: p.x, y: p.y - 6, r: 40, sprite: s, pieno: true, solido });
  }

  // pref 'i' = oggetto iniziale del mondo, 'd' = arrivato dopo (legna portata dal mare)
  creaRaccoglibile(k, ogg, p, pref = 'i') {
    const s = this.sprite(p.x, p.y, k).setDepth(p.y - 20);
    this.interattivi.push({ id: this.nuovoId(pref), tipo: 'raccogli', ogg, x: p.x, y: p.y - 8, r: 36, sprite: s });
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
    const isola = this.mondo.isole[iniziale ? Math.floor(this.rng() * 4) : (this.rng() < 0.6 ? 0 : Math.floor(this.rng() * 4))];
    const p = this.puntoCasuale(isola, 0.12, 0.3, 16, 'terra');
    if (!p) return;
    this.creaRaccoglibile('legna', 'legna', p, iniziale ? 'i' : 'd');
    if (!iniziale) {
      const s = this.interattivi[this.interattivi.length - 1].sprite;
      s.setAlpha(0); this.tweens.add({ targets: s, alpha: 1, duration: 1200 });
    }
  }

  generaGranchio(iniziale) {
    const max = this.eNotte() ? 12 : 6;
    if (this.granchi.length >= max) return;
    const isola = this.mondo.isole[Math.floor(this.rng() * 4)];
    const p = this.puntoCasuale(isola, 0.1, 0.5, 14, 'terra');
    if (!p) return;
    const lontano = (q) => Math.hypot(p.x - q.x, p.y - q.y) > (iniziale ? 380 : 300);
    if (!lontano(this.giocatore || this.approdo)) return;
    const s = this.add.image(p.x, p.y, 'granchio_giu').setOrigin(0.5, 0.9);
    this.granchi.push({ s, x: p.x, y: p.y, vita: 4, dir: 'giu', meta: null, attesa: 0, carica: 0, pausa: 0, colpito: 0 });
  }

  eNotte() { return this.stato.ora > 0.62 && this.stato.ora < 0.97; }

  // ---------------------------------------------------------- acqua e movimento
  // terra, guado (si tocca il fondo), sotto (sott'acqua: si consuma ossigeno)
  ambiente(x, y) {
    const M = this.mondo, t = M.tipo(x, y);
    if (t === TERRENO.SABBIA || t === TERRENO.ROCCIA) return 'terra';
    if (t === TERRENO.BASSO && M.campo(x, y) > 0) return 'guado';
    return 'sotto';
  }

  puoStare(x, y) {
    const M = this.mondo;
    if (x < 20 || y < 20 || x > M.L - 20 || y > M.A - 20) return false;
    return this.libero(x, y, 8);
  }

  update(t, dtMs) {
    const dt = Math.min(dtMs / 1000, 0.05);
    const S = this.stato;
    if (S.morto) return;

    S.ora += dt / DURATA_GIORNO;
    if (S.ora >= 1) { S.ora -= 1; S.giorno++; this.messaggio(`Alba del giorno ${S.giorno}.`); }
    const amb = this.suZattera ? 'zattera' : this.ambiente(this.giocatore.x, this.giocatore.y);
    const caldo = this.eNotte() ? 0.7 : (S.ora > 0.25 && S.ora < 0.5 ? 1.35 : 1);
    const fatica = amb === 'sotto' ? 1.3 : 1;
    if (!this.bloccato) {
      S.sete = clamp(S.sete - dt * (100 / 330) * caldo * fatica, 0, 100);
      S.fame = clamp(S.fame - dt * (100 / 560) * fatica, 0, 100);
    }
    if (S.sete <= 0) S.salute -= dt * 1.2;
    if (S.fame <= 0) S.salute -= dt * 0.6;
    if (amb === 'sotto') {
      S.ossigeno = clamp(S.ossigeno - dt * 100 / OSSIGENO_SECONDI, 0, 100);
      if (S.ossigeno <= 0) {
        S.salute -= dt * 8;
        if (this.time.now - this.avvisoLargo > 4000) { this.avvisoLargo = this.time.now; this.messaggio('Senza aria! Torna dove tocchi il fondo!'); }
      }
    } else S.ossigeno = clamp(S.ossigeno + dt * 50, 0, 100);
    if (S.sete > 40 && S.fame > 40 && amb !== 'sotto') S.salute += dt * 0.15;
    S.salute = clamp(S.salute, 0, 100);
    if (S.salute <= 0) return this.morte(amb === 'sotto' ? 'annegato' : null);

    const k = this.tasti;
    let vx = 0, vy = 0;
    if (!this.bloccato && !this.menuAperto) {
      vx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
      vy = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
      if (this.joy.x || this.joy.y) { vx = this.joy.x; vy = this.joy.y; }
    }
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
    const g = this.giocatore;
    if (this.bloccato) return;
    const amb = this.ambiente(g.x, g.y);
    const vel = { terra: 125, guado: 75, sotto: 62 }[amb] * dt;
    if (muove) {
      const nx = g.x + vx * vel, ny = g.y + vy * vel;
      if (this.puoStare(nx, g.y)) g.x = nx;
      if (this.puoStare(g.x, ny)) g.y = ny;
      if (Math.abs(vx) > Math.abs(vy)) this.dir = vx > 0 ? 'dx' : 'sx';
      else this.dir = vy > 0 ? 'giu' : 'su';
      this.passo += dt * (amb === 'terra' ? 11 : 6);
    } else this.passo = 0;
    g.setTexture('sopr_' + this.dir);
    const sotto = amb === 'sotto';
    const salto = muove && amb === 'terra' ? Math.abs(Math.sin(this.passo)) * 2.5 : 0;
    const fluttua = sotto ? Math.sin(this.time.now / 350) * 2 : 0;
    // nel guado si vede solo la parte che emerge; sott'acqua il corpo e' blu e sfocato
    const quota = amb === 'guado' ? 0.6 : 1;
    if (quota < 1) g.setCrop(0, 0, g.width, g.height * quota); else g.setCrop();
    g.setDisplayOrigin(g.width / 2, g.height * quota + salto + fluttua);
    g.angle = muove ? Math.sin(this.passo) * (sotto ? 8 : 3) : 0;
    if (sotto) g.setTint(0x6fa8d0).setAlpha(0.6); else if (!this.ferito) g.clearTint().setAlpha(1);
    g.setDepth(sotto ? g.y - 45 : g.y);
    this.ombra.setPosition(g.x, g.y - 1).setVisible(amb === 'terra').setDepth(g.y - 1);
    this.increspatura.setPosition(g.x, g.y).setVisible(amb === 'guado').setDepth(g.y + 1);
    if (sotto) {
      this.tempoBolle = (this.tempoBolle || 0) - dt;
      if (this.tempoBolle <= 0) { this.tempoBolle = 0.35; this.bolla(g.x + (this.rng() - 0.5) * 14, g.y - 34); }
      this.consiglio('ossigeno', "Sei sott'acqua: tieni d'occhio la barra dell'ossigeno.", true);
    }
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
    this.increspatura.setVisible(false);
  }

  bolla(x, y) {
    const b = this.add.circle(x, y, 2 + this.rng() * 2).setStrokeStyle(1, 0xdff6ff, 0.8).setDepth(y + 60);
    this.tweens.add({ targets: b, y: y - 30, x: x + (this.rng() - 0.5) * 10, alpha: 0, duration: 900, onComplete: () => b.destroy() });
  }

  // ---------------------------------------------------------- costruzione
  puoPermettersi(r) {
    return Object.entries(r.costo).every(([k, n]) => (this.stato.inv[k] || 0) >= n);
  }

  apriMenu(aperto) {
    if (this.stato.morto || this.bloccato) return;
    if (aperto && this.suZattera) { this.messaggio('Non puoi costruire sulla zattera.'); return; }
    this.menuAperto = aperto;
    this.joy.x = 0; this.joy.y = 0;
  }

  costruisci(id) {
    const r = RICETTE.find((x) => x.id === id);
    if (!r) return;
    if (!this.puoPermettersi(r)) { this.messaggio(`Per ${r.nome.toLowerCase()} servono: ${costoTesto(r.costo)}.`); return; }
    const g = this.giocatore;
    let p = null;
    if (r.oggetto) {
      p = true;
    } else if (r.id === 'zattera') {
      if (this.zattera) { this.messaggio('Hai già una zattera.'); return; }
      p = this.puntoZatteraVicino();
      if (!p) { this.messaggio('Avvicinati alla riva per varare la zattera.'); return; }
    } else {
      if (this.ambiente(g.x, g.y) !== 'terra') { this.messaggio('Devi essere sulla terraferma per costruire.'); return; }
      const dist = r.id === 'baracca' ? 95 : 55;
      const off = { giu: [0, dist], su: [0, -dist * 0.6], sx: [-dist, 0], dx: [dist, 0] }[this.dir];
      const raggio = r.id === 'baracca' ? 55 : 18;
      const cand = [[g.x + off[0], g.y + off[1]], [g.x, g.y + dist], [g.x + dist, g.y], [g.x - dist, g.y], [g.x, g.y - dist * 0.6]];
      for (const [x, y] of cand) {
        const ok = this.mondo.terra(x, y) && this.mondo.terra(x - raggio, y) && this.mondo.terra(x + raggio, y) &&
          this.libero(x, y, raggio) && Math.hypot(x - g.x, y - g.y) > raggio + 8;
        if (ok) { p = { x, y }; break; }
      }
      if (!p) { this.messaggio('Non c\'è abbastanza spazio libero qui intorno.'); return; }
    }
    for (const [k, n] of Object.entries(r.costo)) this.stato.inv[k] -= n;
    this.menuAperto = false;
    if (r.oggetto) { this.aggiungi(r.id); this.messaggio(`Hai costruito: ${r.nome.toLowerCase()}.`); return; }
    this.creaCostruzione(r.id, p);
    this.messaggio(`Hai costruito: ${r.nome.toLowerCase()}.`);
    this.salva();
  }

  puntoZatteraVicino() {
    const g = this.giocatore;
    for (let d = 40; d <= 220; d += 12) {
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 12) {
        const x = g.x + Math.cos(a) * d, y = g.y + Math.sin(a) * d;
        if (this.zatteraSta(x, y) && this.libero(x, y, 30)) return { x, y };
      }
    }
    return null;
  }

  creaCostruzione(id, p, subito) {
    let s, ogg = null;
    switch (id) {
      case 'falo':
        s = this.sprite(p.x, p.y + 10, 'falo', 0.7);
        this.solido(p.x, p.y + 4, 16);
        ogg = { tipo: 'fuoco', x: p.x, y: p.y + 4, r: 50, sprite: s };
        break;
      case 'raccoglitore':
        s = this.sprite(p.x, p.y + 20, 'raccoglitore');
        this.solido(p.x + 10, p.y + 12, 14);
        ogg = { tipo: 'raccoglitore', x: p.x + 10, y: p.y + 12, r: 48, acqua: 1, sprite: s };
        break;
      case 'baracca':
        s = this.sprite(p.x, p.y + 45, 'baracca');
        this.solido(p.x - 10, p.y + 18, 48); this.solido(p.x + 35, p.y + 25, 28);
        ogg = { tipo: 'baracca', x: p.x, y: p.y + 55, r: 70, sprite: s };
        break;
      case 'zattera':
        this.zattera = this.add.image(p.x, p.y, 'zattera').setOrigin(0.5, 0.75).setDepth(p.y);
        this.zattera.rx = p.x; this.zattera.ry = p.y;
        s = this.zattera;
        break;
    }
    if (ogg) this.interattivi.push(ogg);
    if (id !== 'zattera') this.costruiti.push({ id, x: Math.round(p.x), y: Math.round(p.y), ogg });
    const anima = () => {
      if (id === 'falo') this.tweens.add({ targets: s, scaleY: 1.04, yoyo: true, repeat: -1, duration: 260 });
      if (id === 'zattera') this.tweens.add({ targets: s, angle: { from: -1, to: 1 }, yoyo: true, repeat: -1, duration: 2200, ease: 'Sine.inOut' });
    };
    if (subito) anima();
    else {
      // compare "montandosi" dal basso
      s.setScale(1, 0.1).setAlpha(0.3);
      this.tweens.add({ targets: s, scaleY: 1, alpha: 1, duration: 450, ease: 'Back.out', onComplete: anima });
    }
    return ogg;
  }

  // ---------------------------------------------------------- azioni
  vicino() {
    const g = this.giocatore;
    let migliore = null, dmin = Infinity;
    for (const o of this.interattivi) {
      const d = Math.hypot(o.x - g.x, o.y - g.y);
      if (d < o.r && d < dmin) { dmin = d; migliore = o; }
    }
    return migliore;
  }

  vicinoZattera() {
    const z = this.zattera, g = this.giocatore;
    return z && Math.hypot(z.rx - g.x, z.ry - g.y) < 120;
  }

  suggerimento() {
    if (this.stato.morto || this.bloccato || this.menuAperto) return '';
    const inv = this.stato.inv;
    if (this.pesca) return 'Stai pescando...';
    if (this.suZattera) return this.puntoSbarco() ? 'E: scendi a terra' : 'E: pesca dalla zattera';
    const o = this.vicino();
    if (o) {
      switch (o.tipo) {
        case 'raccoglitore': return o.acqua > 0 ? `E: bevi acqua piovana (${o.acqua})` : 'Raccoglitore vuoto: si riempie con la pioggia';
        case 'fuoco': {
          const crudo = inv.pesce ? 'pesce' : inv.carne ? 'polpa di granchio' : null;
          if (!crudo) return 'Falò: porta pesce o granchio da cucinare';
          return inv.legna ? `E: cucina ${crudo} (usa 1 legna)` : 'Serve 1 legna per cucinare';
        }
        case 'baracca': return this.puoDormire() ? "E: dormi fino all'alba" : 'Baracca: potrai dormire al tramonto';
        case 'palma': return o.cocchi > 0 ? 'E: raccogli un cocco' : 'Palma senza cocchi';
        case 'contenitore': return o.pieno ? 'E: fruga' : (o.chiave === 'barile' ? 'E: smonta per ricavare rottami' : 'E: smonta per ricavare legna');
        case 'raccogli': return o.ogg === 'rete' ? 'E: recupera la corda dalla rete' : 'E: raccogli ' + OGGETTI[o.ogg].nome.toLowerCase();
      }
    }
    if (this.vicinoZattera()) return 'E: sali sulla zattera';
    if (this.ambiente(this.giocatore.x, this.giocatore.y) === 'guado') return 'E: pesca';
    return '';
  }

  puoDormire() { const o = this.stato.ora; return o > 0.5 || o < 0.02; }

  aggiungi(ogg, n = 1) {
    const inv = this.stato.inv;
    inv[ogg] = (inv[ogg] || 0) + n;
  }

  rimuovi(o) {
    if (o.id && o.id[0] === 'i') this.rimossi.add(o.id);
    const i = this.interattivi.indexOf(o);
    if (i >= 0) this.interattivi.splice(i, 1);
    if (o.solido) this.ostacoli.splice(this.ostacoli.indexOf(o.solido), 1);
    this.tweens.add({ targets: o.sprite, alpha: 0, y: o.sprite.y - 12, duration: 250, onComplete: () => o.sprite.destroy() });
  }

  azione() {
    if (this.stato.morto || this.bloccato || this.menuAperto || this.pesca) return;
    const g = this.giocatore, inv = this.stato.inv;
    if (this.suZattera) {
      const p = this.puntoSbarco();
      if (p) {
        this.suZattera = false;
        g.setPosition(p.x, p.y).setAngle(0);
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
        case 'baracca':
          if (this.puoDormire()) this.dormi();
          return;
        case 'palma':
          if (o.cocchi > 0) { o.cocchi--; this.aggiungi('cocco'); this.messaggio('Hai raccolto un cocco.'); }
          return;
        case 'contenitore':
          if (o.pieno) {
            o.pieno = false; o.sprite.setTint(0x9a8f80);
            const r = this.rng();
            const ogg = o.chiave === 'barile'
              ? (r < 0.45 ? 'acqua' : r < 0.75 ? 'corda' : 'rottame')
              : (r < 0.35 ? 'benda' : r < 0.6 ? 'acqua' : r < 0.85 ? 'corda' : 'rottame');
            this.aggiungi(ogg);
            this.messaggio('Hai trovato: ' + OGGETTI[ogg].nome.toLowerCase());
          } else {
            this.aggiungi(o.chiave === 'barile' ? 'rottame' : 'legna', 2);
            this.messaggio(o.chiave === 'barile' ? 'Hai smontato il barile: +2 rottame' : 'Hai smontato la cassa: +2 legna');
            this.rimuovi(o);
          }
          return;
        case 'raccogli': {
          const quanti = o.ogg === 'rete' || o.ogg === 'rottame' ? 2 : 1;
          const ogg = o.ogg === 'rete' ? 'corda' : o.ogg;
          this.aggiungi(ogg, quanti);
          this.messaggio(`+${quanti} ${OGGETTI[ogg].nome.toLowerCase()}`);
          this.rimuovi(o);
          return;
        }
      }
    }
    if (this.vicinoZattera()) {
      this.suZattera = true;
      this.ombra.setVisible(false);
      g.setCrop(); g.setTexture('sopr_giu'); g.angle = 0; this.dir = 'giu';
      g.setDisplayOrigin(g.width / 2, g.height);
      this.messaggio('Sei sulla zattera. Puoi andare anche in mare aperto.');
      return;
    }
    if (this.ambiente(g.x, g.y) === 'guado') this.iniziaPesca(false);
  }

  dormi() {
    this.bloccato = true;
    const cam = this.cameras.main;
    cam.fadeOut(900, 0, 0, 0);
    cam.once('camerafadeoutcomplete', () => {
      const S = this.stato;
      if (S.ora > 0.5) S.giorno++;
      S.ora = 0.03;
      S.sete = clamp(S.sete - 20, 0, 100); S.fame = clamp(S.fame - 15, 0, 100); S.salute = clamp(S.salute + 25, 0, 100);
      // i granchi notturni tornano in mare
      for (const c of this.granchi.splice(4)) c.s.destroy();
      this.messaggio(`Hai dormito fino all'alba del giorno ${S.giorno}.`);
      cam.fadeIn(1200, 0, 0, 0);
      this.bloccato = false;
      this.salva();
    });
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
      if (this.rng() < 0.75) { this.aggiungi('pesce'); this.messaggio('Hai preso un pesce!'); }
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
    if (this.stato.morto || this.suZattera || this.bloccato || this.menuAperto) return;
    const ora = this.time.now;
    if (ora - this.ultimoColpo < 400) return;
    this.ultimoColpo = ora;
    const g = this.giocatore;
    const off = { giu: [0, 18], su: [0, -30], sx: [-24, -10], dx: [24, -10] }[this.dir];
    const cx = g.x + off[0], cy = g.y + off[1];
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
    const ambG = this.ambiente(g.x, g.y);
    // sott'acqua i granchi non ti raggiungono
    const raggiungibile = !this.suZattera && !this.bloccato && (ambG === 'terra' || ambG === 'guado');
    for (const c of this.granchi) {
      const dx = g.x - c.x, dy = g.y - c.y, d = Math.hypot(dx, dy);
      c.colpito = Math.max(0, c.colpito - dt);
      c.pausa = Math.max(0, c.pausa - dt);
      const caccia = raggiungibile && d < (this.eNotte() ? 200 : 130);
      let vx = 0, vy = 0;
      if (c.carica > 0) {
        c.carica -= dt;
        if (c.carica <= 0) {
          if (d < 38 && raggiungibile) {
            this.stato.salute = clamp(this.stato.salute - 9, 0, 100);
            this.cameras.main.shake(120, 0.004);
            this.ferito = true; g.setTint(0xff7777); this.time.delayedCall(150, () => { this.ferito = false; g.clearTint(); });
          }
          c.attesa = 1.2;
        }
      } else if (c.pausa > 0) {
        // fermo dopo un colpo
      } else if (caccia) {
        if (d < 30 && c.attesa <= 0) c.carica = 0.45;
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
    if (S.morto || !(S.inv[k] > 0)) return;
    if (!o.uso) {
      this.messaggio(k === 'coltello' ? 'Il coltello è sempre in mano: colpi doppi.' : o.nome + ': serve per costruire (C).');
      return;
    }
    S.inv[k]--;
    for (const [stat, v] of Object.entries(o.uso)) S[stat] = clamp(S[stat] + v, 0, 100);
    let t = 'Hai usato: ' + o.nome.toLowerCase();
    if (o.crudo && this.rng() < 0.35) { S.salute = clamp(S.salute - 12, 0, 100); t += '. Era crudo: ti senti male (-12 salute)'; }
    this.messaggio(t);
  }

  morte(motivo) {
    const S = this.stato;
    S.morto = true;
    this.menuAperto = false;
    cancellaSalvataggio();
    const causa = motivo === 'annegato' ? 'Sei annegato'
      : S.sete <= 0 ? 'Sei morto di sete' : S.fame <= 0 ? 'Sei morto di fame' : 'Sei morto per le ferite';
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
    this.velo = this.add.rectangle(0, 0, 10, 10, 0x1a6a9a, 0).setOrigin(0);
    this.buio = this.add.rectangle(0, 0, 10, 10, 0x0a1430, 0).setOrigin(0);
    this.g = this.add.graphics();
    const stile = { fontFamily: FONT, fontSize: '13px', color: '#ffffff', stroke: '#000000', strokeThickness: 3 };
    this.stile = stile;
    this.icone = ['ic_goccia', 'ic_cibo', 'ic_benda'].map((k) => this.add.image(0, 0, k).setScale(0.7));
    this.etichette = ['Sete', 'Fame', 'Salute'].map((t) => this.add.text(0, 0, t, stile));
    this.etOssigeno = this.add.text(0, 0, 'Ossigeno', { ...stile, color: '#bff0ff' });
    this.testoGiorno = this.add.text(0, 0, '', { ...stile, fontSize: '15px' }).setOrigin(1, 0);
    this.testoVersione = this.add.text(0, 0, 'Mare Alto ' + VERSIONE, { ...stile, fontSize: '11px', color: '#e8a24f' }).setOrigin(1, 0);
    this.sole = this.add.image(0, 0, 'ic_sole').setScale(0.7);
    this.prompt = this.add.text(0, 0, '', { ...stile, fontSize: '15px', backgroundColor: '#00000088', padding: { x: 8, y: 4 } }).setOrigin(0.5, 1);
    this.log = this.add.text(0, 0, '', { ...stile, fontSize: '12px', lineSpacing: 2, wordWrap: { width: 360 } });
    this.slot = [];
    for (let i = 0; i < 10; i++) {
      const box = this.add.rectangle(0, 0, 44, 44, 0x12303f, 0.85).setStrokeStyle(1, 0x6aa8c0).setInteractive();
      const ic = this.add.image(0, 0, 'ic_cocco');
      const n = this.add.text(0, 0, '', { ...stile, fontSize: '12px' }).setOrigin(1, 1);
      const tasto = this.add.text(0, 0, '', { ...stile, fontSize: '10px', color: '#bcd' });
      box.on('pointerdown', (p, lx, ly, ev) => { ev.stopPropagation(); if (!this.gioco.menuAperto) this.gioco.usaSlot(i); });
      this.slot.push({ box, ic, n, tasto });
    }
    this.creaMenu();
    this.touch = this.sys.game.device.input.touch;
    if (this.touch) this.creaComandiTouch();
    else {
      this.btnCostruisci = this.add.text(0, 0, 'C: costruisci', { ...stile, fontSize: '13px', backgroundColor: '#5a3a1a', padding: { x: 8, y: 5 } })
        .setOrigin(1, 1).setInteractive({ useHandCursor: true });
      this.btnCostruisci.on('pointerdown', (p, lx, ly, ev) => { ev.stopPropagation(); this.gioco.apriMenu(!this.gioco.menuAperto); });
    }
    this.disponi();
    this.scale.on('resize', this.disponi, this);
    this.events.once('shutdown', () => this.scale.off('resize', this.disponi, this));
  }

  creaMenu() {
    this.menu = this.add.container(0, 0).setVisible(false).setDepth(10);
    this.menuFondo = this.add.rectangle(0, 0, 10, 10, 0x0b1d26, 0.94).setOrigin(0).setStrokeStyle(2, 0xc8a060);
    this.menuTitolo = this.add.text(0, 0, 'Costruisci', { ...this.stile, fontSize: '18px', color: '#f0e2b6' });
    this.menuChiudi = this.add.text(0, 0, '✕', { ...this.stile, fontSize: '20px' }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.menuChiudi.on('pointerdown', () => this.gioco.apriMenu(false));
    this.menu.add([this.menuFondo, this.menuTitolo, this.menuChiudi]);
    this.righe = RICETTE.map((r, i) => {
      const fondo = this.add.rectangle(0, 0, 400, 62, 0x163848, 0.9).setOrigin(0).setInteractive({ useHandCursor: true });
      const nome = this.add.text(0, 0, `${i + 1}. ${r.nome}`, { ...this.stile, fontSize: '15px' });
      const cosa = this.add.text(0, 0, r.cosa, { ...this.stile, fontSize: '11px', color: '#9fc3d0' });
      const costo = this.add.text(0, 0, '', { ...this.stile, fontSize: '12px', align: 'right' }).setOrigin(1, 0);
      fondo.on('pointerdown', () => this.gioco.costruisci(r.id));
      this.menu.add([fondo, nome, cosa, costo]);
      return { r, fondo, nome, cosa, costo };
    });
  }

  creaComandiTouch() {
    this.joyBase = this.add.circle(0, 0, 56, 0xffffff, 0.12).setStrokeStyle(2, 0xffffff, 0.35);
    this.joyPomo = this.add.circle(0, 0, 24, 0xffffff, 0.35);
    const bottone = (col, r, testo, fn) => {
      const c = this.add.circle(0, 0, r, col, 0.78).setInteractive();
      const t = this.add.text(0, 0, testo, { fontFamily: FONT, fontSize: testo.length > 8 ? '9px' : '10px', color: '#fff' }).setOrigin(0.5);
      c.on('pointerdown', (p, lx, ly, ev) => { ev.stopPropagation(); fn(); });
      return { c, t };
    };
    this.btnAzione = bottone(0x2f8fbf, 34, 'AZIONE', () => this.gioco.azione());
    this.btnColpo = bottone(0xbf5a2f, 28, 'COLPISCI', () => this.gioco.colpisci());
    this.btnCostr = bottone(0x8a6a2a, 32, 'COSTRUISCI', () => this.gioco.apriMenu(!this.gioco.menuAperto));
    this.joyId = null;
    this.input.addPointer(2);
    this.input.on('pointerdown', (p) => {
      if (this.gioco.menuAperto) return;
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
    this.velo.setSize(w, h);
    this.etOssigeno.setPosition(12, 86);
    this.icone.forEach((ic, i) => ic.setPosition(20, 22 + i * 24));
    this.etichette.forEach((t, i) => t.setPosition(36, 14 + i * 24));
    this.testoGiorno.setPosition(w - 12, 10);
    this.testoVersione.setPosition(w - 12, 32);
    this.log.setPosition(12, 112).setWordWrapWidth(Math.min(w - 24, 420));
    this.ySlot = h - 30;
    if (this.touch) {
      this.joyBase.setPosition(90, h - 140); this.joyPomo.setPosition(90, h - 140);
      const pos = (b, x, y) => { b.c.setPosition(x, y); b.t.setPosition(x, y); };
      pos(this.btnAzione, w - 58, h - 150);
      pos(this.btnColpo, w - 130, h - 108);
      pos(this.btnCostr, w - 52, h - 232);
    } else {
      this.btnCostruisci.setPosition(w - 12, h - 10);
    }
    // menu di costruzione al centro
    const mw = Math.min(w - 24, 460), mh = 56 + RICETTE.length * 68;
    this.menu.setPosition(Math.round((w - mw) / 2), Math.round(Math.max(8, (h - mh) / 2 - 20)));
    this.menuFondo.setSize(mw, mh);
    this.menuTitolo.setPosition(14, 12);
    this.menuChiudi.setPosition(mw - 12, 8);
    this.righe.forEach((r, i) => {
      const y = 46 + i * 68;
      r.fondo.setPosition(8, y).setSize(mw - 16, 62);
      r.fondo.input.hitArea.setTo(0, 0, mw - 16, 62);
      r.nome.setPosition(16, y + 8);
      r.cosa.setPosition(16, y + 34);
      r.costo.setPosition(mw - 18, y + 6);
    });
  }

  update() {
    const G = this.gioco, S = G.stato;
    if (!S) return;
    const w = this.scale.width, h = this.scale.height;
    this.g.clear();
    const valori = [[S.sete, 0x4fb3e8], [S.fame, 0xe8a24f], [S.salute, 0xd9534f]];
    valori.forEach(([v, col], i) => {
      const y = 28 + i * 24;
      this.g.fillStyle(0x0b1d26, 0.8).fillRect(94, y - 13, 104, 10);
      this.g.fillStyle(v < 20 ? 0xff3333 : col, 1).fillRect(96, y - 11, v, 6);
    });
    // ossigeno: compare solo sott'acqua o mentre si riprende fiato
    const sotto = !G.suZattera && G.giocatore && G.ambiente(G.giocatore.x, G.giocatore.y) === 'sotto';
    const mostraOss = sotto || S.ossigeno < 100;
    this.etOssigeno.setVisible(mostraOss);
    if (mostraOss) {
      const lamp = S.ossigeno < 25 && Math.floor(G.time.now / 250) % 2 === 0;
      this.g.fillStyle(0x0b1d26, 0.8).fillRect(94, 89, 104, 10);
      this.g.fillStyle(lamp ? 0xff3333 : 0xbff0ff, 1).fillRect(96, 91, S.ossigeno, 6);
    }
    this.velo.setAlpha(1).setFillStyle(0x1a6a9a, sotto ? 0.28 : 0);
    const notte = G.eNotte();
    this.testoGiorno.setText(`Giorno ${S.giorno} · ${notte ? 'notte' : S.ora < 0.12 ? 'alba' : S.ora > 0.52 ? 'tramonto' : 'giorno'}`);
    this.sole.setPosition(w - 12 - this.testoGiorno.width - 16, 20).setAlpha(notte ? 0.3 : 1);
    const o = S.ora;
    let a = 0;
    if (o > 0.52 && o < 0.66) a = (o - 0.52) / 0.14;
    else if (o >= 0.66 && o < 0.9) a = 1;
    else if (o >= 0.9) a = 1 - (o - 0.9) / 0.1;
    this.buio.setFillStyle(o > 0.52 && o < 0.62 ? 0x3a1a30 : 0x0a1430, a * 0.55);
    const s = G.suggerimento();
    this.prompt.setText(s).setVisible(!!s);
    if (G.pesca) {
      const p = G.pesca.tempo / G.pesca.durata;
      this.g.fillStyle(0x000000, 0.6).fillRect(w / 2 - 60, h - 100, 120, 8);
      this.g.fillStyle(0x4fb3e8, 1).fillRect(w / 2 - 59, h - 99, 118 * p, 6);
    }
    S.messaggi = S.messaggi.filter((m) => G.time.now - m.tempo < 7000);
    this.log.setText(S.messaggi.map((m) => m.testo).join('\n'));
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
    // menu costruzione
    this.menu.setVisible(G.menuAperto);
    if (G.menuAperto) {
      for (const r of this.righe) {
        const ok = G.puoPermettersi(r.r);
        const giaZattera = r.r.id === 'zattera' && G.zattera;
        r.fondo.setFillStyle(ok && !giaZattera ? 0x1f5a3a : 0x163848, 0.9);
        r.costo.setText(giaZattera ? 'già costruita' : Object.entries(r.r.costo).map(([k, n]) => `${S.inv[k] || 0}/${n} ${OGGETTI[k].nome.toLowerCase()}`).join('\n'));
        r.costo.setColor(ok && !giaZattera ? '#9be89b' : '#e8a0a0');
      }
    }
  }
}

// ---------------------------------------------------------------- Fine
class Fine extends Phaser.Scene {
  constructor() { super('Fine'); }
  init(d) { this.dati = d; }
  create() {
    const w = this.scale.width, h = this.scale.height;
    this.add.rectangle(0, 0, w, h, 0x05080c, 0.85).setOrigin(0);
    this.add.text(w / 2, h * 0.38, this.dati.causa, { fontFamily: FONT, fontSize: w < 600 ? '22px' : '30px', color: '#e8a24f' }).setOrigin(0.5);
    const g = this.dati.giorni;
    this.add.text(w / 2, h * 0.5, `Sei sopravvissuto ${g} ${g === 1 ? 'giorno' : 'giorni'} sul Mare Alto.`, { fontFamily: FONT, fontSize: '16px', color: '#d8e6ea', align: 'center', wordWrap: { width: w - 40 } }).setOrigin(0.5);
    this.add.text(w / 2, h * 0.64, 'Tocca o premi INVIO per ricominciare', { fontFamily: FONT, fontSize: '15px', color: '#ffffff' }).setOrigin(0.5);
    const di = () => { this.scene.start('Gioco', { intro: false }); };
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
    scene: [Avvio, Titolo, Naufragio, Gioco, Interfaccia, Fine],
  });
});
