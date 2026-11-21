# GPverse — Mare Alto

**Versione: V0.3.0** — prototipo giocabile: naufragio, costruzione, immersioni e salvataggi.

Mare Alto è un survival open world senza storia prefissata. Scegli un sopravvissuto in un'Italia sommersa e ridisegnata, 400 anni nel futuro, e fai quello che vuoi: navigare, commerciare, esplorare le città sommerse, fondare un villaggio o comandare una flotta.

![Riferimento visuale](docs/concept/riferimento-visuale-2d.jpg)

## Il mondo in breve

- Il mare è salito di circa 150 m (l'Onda Lunga) e secoli di terremoti e vulcani (le Grandi Fratture) hanno ridisegnato la mappa.
- Zone di gioco: mare aperto, atolli adattati, Terre Alte (Alpi e Appennino), fratture vulcaniche, rovine sommerse.
- Tono alla Mad Max: il carburante è potere, i mezzi sono di recupero e l'economia è di baratto.
- Le fazioni sono Bruciatori, Signori delle Terre Alte, Flottiglie, Palombari e Figli dell'Onda.

Il documento di design completo è su Claude: *GPverse — Mare Alto · Game Design Document*. La versione giocabile è pubblicata come artifact Claude.

## Come giocare

Online, da PC e telefono: **https://galimbertip.github.io/MareAlto/** (GitHub Pages, ramo `main`). Ogni push su `main` aggiorna il gioco in un paio di minuti.

In locale, dalla cartella del repo avvia un piccolo server:

```
python3 -m http.server 8000
```

Poi apri `http://localhost:8000`. Su Windows usa `py -m http.server 8000`. Aprire direttamente `index.html` col doppio clic non basta, perché il browser blocca il caricamento delle immagini.

| Comando | Tastiera | Telefono |
| --- | --- | --- |
| Muoversi | WASD o frecce | Joystick a sinistra |
| Azione: raccogliere, frugare, bere, cucinare, dormire, pescare | E | AZIONE |
| Costruire | C | COSTRUISCI |
| Colpire | Spazio o clic | COLPISCI |
| Usare un oggetto | 1–9 | Tocca l'oggetto in basso |

## Salvataggi

- Il gioco salva da solo ogni 15 secondi, dopo ogni costruzione, quando dormi e quando chiudi o metti in secondo piano la pagina.
- Il salvataggio resta nel browser del dispositivo: PC e telefono hanno ognuno il suo.
- Per spostare una partita usa **Codice di salvataggio** nella schermata iniziale: copi il codice su un dispositivo, lo incolli sull'altro e premi Carica.
- Se muori, il salvataggio viene cancellato.

## Cosa c'è nella V0.3.0

- Immersioni: in mare cammini finché tocchi il fondo, poi vai sott'acqua. Compare la barra dell'ossigeno (circa 22 secondi d'aria); quando finisce anneghi. Risalendo dove si tocca, l'aria torna in fretta.
- Salvataggio automatico, Continua / Nuova partita, codice di salvataggio per passare da PC a telefono.

## Cosa c'era nella V0.2.0

- Animazione iniziale: la tempesta spezza la tua zattera e ti risvegli su un atollo sconosciuto, senza niente. Si può saltare.
- Sulla spiaggia ci sono i resti del naufragio: casse e barili da frugare (e poi smontare), rottami, corde, reti, legna.
- Costruzione (C o COSTRUISCI): falò, raccoglitore di pioggia, coltello, baracca, zattera.
- La baracca permette di dormire fino all'alba e recuperare salute.
- Suggerimenti che compaiono man mano, senza una storia obbligata.
- Sete, fame e salute; caldo a mezzogiorno; giorno e notte di 4 minuti; granchi più numerosi di notte.
- Pesca in acqua bassa o dalla zattera, cottura al falò (1 legna per pasto).
- Un arcipelago generato da un seme: l'Atollo del Campanile, tre isole più piccole e tre banchi sommersi con le rovine.

## Struttura

- `index.html`: punto di partenza del gioco.
- `src/mondo.js`: generazione del terreno e delle isole.
- `src/gioco.js`: scene, giocatore, granchi, interfaccia.
- `assets/raw/`: i fogli originali generati con Arena AI.
- `assets/sprites/` e `assets/tiles/`: sprite e terreni pronti per il gioco, creati da `scripts/processa_asset.py`.
- `vendor/phaser.min.js`: motore Phaser 3.90, usato se il CDN non è raggiungibile (per esempio offline).

## Stile grafico

È pixel art 2D dettagliata, con vista dall'alto a 3/4 (vedi `docs/STILE.md`).

## Versionamento

Formato **V.maior.minor.patch**, con la versione sempre visibile nel titolo e nella schermata iniziale. Le modifiche sono registrate in `CHANGELOG.md`.
