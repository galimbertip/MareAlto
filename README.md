# GPverse — Mare Alto

**Versione: V0.1.0** — primo prototipo giocabile.

Mare Alto è un survival open world senza storia prefissata. Scegli un sopravvissuto in un'Italia sommersa e ridisegnata, 400 anni nel futuro, e fai quello che vuoi: navigare, commerciare, esplorare le città sommerse, fondare un villaggio o comandare una flotta.

![Riferimento visuale](docs/concept/riferimento-visuale-2d.jpg)

## Il mondo in breve

- Il mare è salito di circa 150 m (l'Onda Lunga) e secoli di terremoti e vulcani (le Grandi Fratture) hanno ridisegnato la mappa.
- Zone di gioco: mare aperto, atolli adattati, Terre Alte (Alpi e Appennino), fratture vulcaniche, rovine sommerse.
- Tono alla Mad Max: il carburante è potere, i mezzi sono di recupero e l'economia è di baratto.
- Le fazioni sono Bruciatori, Signori delle Terre Alte, Flottiglie, Palombari e Figli dell'Onda.

Il documento di design completo è su Claude: *GPverse — Mare Alto · Game Design Document*.

## Come giocare

Il gioco gira nel browser, su PC e su telefono. Dalla cartella del repo avvia un piccolo server:

```
python3 -m http.server 8000
```

Poi apri `http://localhost:8000`. Su Windows usa `py -m http.server 8000`. Aprire direttamente `index.html` col doppio clic non basta, perché il browser blocca il caricamento delle immagini.

| Comando | Tastiera | Telefono |
| --- | --- | --- |
| Muoversi | WASD o frecce | Joystick a sinistra |
| Azione: raccogliere, bere, cucinare, salire sulla zattera, pescare | E | AZIONE |
| Colpire | Spazio o clic | COLPISCI |
| Usare un oggetto | 1–9 | Tocca l'oggetto in basso |

## Cosa c'è nella V0.1.0

- Un arcipelago generato da un seme: l'Atollo del Campanile, tre isole più piccole e tre banchi sommersi con le rovine.
- Sete, fame e salute. Il caldo di mezzogiorno fa venire più sete.
- Ciclo giorno/notte di 4 minuti. Di notte i granchi sono di più e più aggressivi.
- Raccoglitore di acqua piovana, palme da cocco, casse e barili da frugare, legna portata dal mare.
- Pesca dall'acqua bassa o dalla zattera (in acqua profonda si pesca più in fretta).
- Cottura al falò: 1 legna per ogni pasto. Mangiare crudo può farti stare male.
- Granchi giganti da combattere. Il coltello, se lo trovi, raddoppia il danno.
- Zattera per navigare anche in mare aperto.

## Struttura

- `index.html`: punto di partenza del gioco.
- `src/mondo.js`: generazione del terreno e delle isole.
- `src/gioco.js`: scene, giocatore, granchi, interfaccia.
- `assets/raw/`: i fogli originali generati con Arena AI.
- `assets/sprites/` e `assets/tiles/`: sprite e terreni pronti per il gioco, creati da `scripts/processa_asset.py`.
- `vendor/phaser.min.js`: motore Phaser 3.90.

## Stile grafico

È pixel art 2D dettagliata, con vista dall'alto a 3/4 (vedi `docs/STILE.md`).

## Versionamento

Formato **V.maior.minor.patch**, con la versione sempre visibile nel titolo e nella schermata iniziale. Le modifiche sono registrate in `CHANGELOG.md`.
