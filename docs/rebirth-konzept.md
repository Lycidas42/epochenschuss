# Rebirth-Konzept: „Zeitsprung“

Stand: 24.11.2026 · **im Mock-up umgesetzt** · Entscheidungen von Nico eingearbeitet (siehe Abschnitt 8). Werte unten sind die umgesetzten.

## Kurzfassung

Der Spieler kann jederzeit ab einem Rekord von **1 km** einen **Zeitsprung** machen: Er fällt zurück in die Steinzeit, verliert Gold, Ressourcen, Upgrades, Arbeiter und Werkzeug, bekommt dafür aber **Zeitsplitter**. Mit Zeitsplittern kauft er in der **Zeitwerkstatt** permanente Upgrades, die jeden weiteren Durchlauf schneller machen. Je weiter der Rekord im Durchlauf, desto mehr Splitter, aber mit abnehmendem Zuwachs, damit sowohl frühe als auch späte Sprünge sinnvoll sind.

Ziel: Aus einem einzelnen Durchlauf wird eine Schleife mit mehreren Stunden Spielzeit, ohne dass Durchläufe sich wie Wiederholung anfühlen, weil jeder neue Lauf spürbar schneller durch die ersten Zeitalter zieht und neue Möglichkeiten öffnet (früherer Arbeiter-Einsatz, Automatik). Jeder Lauf beginnt in der Steinzeit.

## 1. Die Währung: Zeitsplitter

**Thema:** Die Kanone reißt beim Zeitsprung ein Loch in die Zeit, übrig bleiben leuchtende Splitter. Passt zum Zeitalter-Thema und ist von Gold, Teilen und Sternen optisch klar zu trennen (Farbe: Violett/Türkis).

Name bestätigt.

### Formel

```
Splitter = floor( spK × Rekord_km ^ spExp × (1 + 10 % × Splitterlinse) )
spK = 10, spExp = 0,4, ab 1 km
```

| Rekord im Durchlauf | ca. Zeitalter | Splitter |
|---|---|---|
| 1 km | Eisenzeit | 10 |
| 3 km | Antike | 15 |
| 10 km | Mittelalter | 25 |
| 30 km | Renaissance | 39 |
| 100 km | Industrie | 63 |
| 300 km | Moderne | 97 |
| 1.000 km | Ziel erreicht | 158 (+25 Bonus beim ersten Mal) |

- Maßgeblich ist der **Rekord des aktuellen Durchlaufs**, nicht der Allzeit-Rekord. So lohnt sich jeder Lauf.
- Der Exponent < 1 sorgt dafür, dass ein Lauf bis 1.000 km nur gut 6× so viel bringt wie einer bis 10 km. Kurze Läufe sind also nicht wertlos, lange aber effizienter, sobald die permanenten Upgrades das Durchspielen beschleunigen.
- **Einzige Quelle ist der Zeitsprung.** Challenges geben keine Splitter (entschieden).
- Alle Werte kommen wie bisher in `P` (`spK`, `spExp`, `spMin`, `spWin`) und werden per Bot-Simulation abgestimmt.

### Vorschau statt Überraschung

Im Menü steht immer: „Zeitsprung jetzt: **+15 Zeitsplitter** (nächster Splitter bei 33,1 km)“. Der Spieler entscheidet bewusst, ob er weiterspielt oder springt. Das ist der Kern des Mechanismus.

## 2. Was zurückgesetzt wird und was bleibt

| Wird zurückgesetzt | Bleibt erhalten |
|---|---|
| Gold, alle Teile | Zeitsplitter (unausgegebene) und Zeitwerkstatt-Upgrades |
| Zeitalter, alle Kanonen-Upgrades (Schusskraft, Wucht, Zielhilfe, Glück) | Challenge-Boni und Challenge-Fortschritt |
| Maschinen (Besitz, Stufe, Automatik) | Highscores, Allzeit-Rekord, Statistiken |
| Ressourcen-Seite: Abbau-Fortschritt, Arbeiter | |
| Hindernisse (volle Leben), Schussstärke-Stufen des Laufs, Kanonen-Optik (immer die des aktuellen Zeitalters) | Einstellungen, Ton, Winkel |
| grüne Zone (wird ja schon pro Zeitalter zurückgesetzt) | Anzahl Zeitsprünge, gesamt verdiente Splitter |

Einige Zeitwerkstatt-Upgrades schwächen den Reset gezielt ab (siehe „Erbe“ unten), das ist der wichtigste Fortschritts-Hebel über viele Läufe.

## 3. Abgrenzung zu den Challenge-Boni

Beide Systeme geben permanente Vorteile. Damit sie sich nicht doppeln, bekommen sie klar getrennte Rollen:

| | Challenges | Zeitsprung / Zeitwerkstatt |
|---|---|---|
| Wie bekommt man es? | Einmal eine Aufgabe schaffen (Können, Sonderregeln) | Splitter sammeln und frei ausgeben (Fleiß, Entscheidung) |
| Art des Bonus | Feste, kleine Boni, nicht steigerbar | Stufenweise kaufbar, skaliert mit Investition |
| Schwerpunkt | Schuss-Handwerk: Timing, Perfekt-Bonus, Wucht gegen bestimmte Hindernisse | Wirtschaft, Tempo, Startvorteile, Automatik, Komfort |
| Wahlfreiheit | keine, man bekommt den Bonus | Spieler wählt, worin er investiert |

Regeln für die Umsetzung:

- **Keine identischen Werte in beiden Systemen.** Wenn eine Challenge z. B. „+10 % Perfekt-Bonus“ gibt, gibt es den in der Zeitwerkstatt nicht.
- Wo sich Bereiche berühren (Reichweite, Schaden), rechnen beide **als getrennte Multiplikatoren**, und die Statistik-Ansicht zeigt sie getrennt an („Challenges ×1,15 · Zeitwerkstatt ×1,40“).
- Challenges geben **keine** Zeitsplitter, und Zeitsprung-Upgrades geben keine Challenge-Boni. Die beiden Systeme bleiben vollständig getrennt.
- Später möglich: Challenges, die erst ab X Zeitsprüngen freigeschaltet werden („Erreiche 30 km ohne Maschinen“). Das verbindet beide Systeme, ohne dass sie verschmelzen.

## 4. Die Zeitwerkstatt (permanente Upgrades)

Eigener Tab „Zeitsprung“ im Werkbank-Panel, mit Zeitsprung-Knopf oben und der Zeitwerkstatt darunter. Vier Zweige. Kosten pro Stufe: `Kosten = Basis × 1,5 ^ Stufe` (gerundet). Werte je Stufe stehen in `P` (`wsAder`, `wsLauf` …).

| Zweig | Upgrade | Wirkung pro Stufe | Max | Basis |
|---|---|---|---|---|
| Wirtschaft | Goldader | +40 % Gold | 10 | 2 |
| Wirtschaft | Fleißige Hände | Arbeiter +40 % schneller | 8 | 3 |
| Wirtschaft | Kräftige Schläge | +25 % Abbau pro Klick | 6 | 2 |
| Kanone | Erbstück-Lauf | +12 % Reichweite | 10 | 3 |
| Kanone | Zeitgehärtete Kugeln | +25 % Schaden | 10 | 3 |
| Kanone | Ruhige Hand | grüne Zone +2 Punkte in jedem Zeitalter | 5 | 4 |
| Kanone | Sternenfänger | +1 Stern pro Schuss | 3 | 4 |
| Erbe | Startkapital | Start mit 30 / 90 / 270 / 810 / 2.430 Gold | 5 | 3 |
| Erbe | Stammarbeiter | +1 Arbeiter in jeder freigeschalteten Ressource | 5 | 6 |
| Erbe | Werkzeugkiste | Werkzeug startet eine Stufe höher | 3 | 6 |
| Erbe | Alte Pläne | Kanonen-Upgrades −7 % Gold und Ressourcen | 6 | 5 |
| Zeit | Splitterlinse | +10 % Zeitsplitter | 10 | 5 |
| Zeit | Lange Nächte | Offline-Limit +4 h (8 h → bis 24 h) | 4 | 4 |
| Zeit | Weitblick | Flugbahn-Vorschau +5 % | 4 | 3 |

Gegenüber dem ersten Entwurf geändert:

- **Vorsprung** (Start in späterem Zeitalter) entfällt, entschieden von Nico. Ersatz: **Alte Pläne**.
- **Zeitkapsel** (Gold behalten) entfällt ebenfalls: Behaltenes Gold aus späten Zeitaltern hätte die ersten Zeitalter sofort übersprungen, also praktisch ein Vorsprung.
- Maschinen gibt es nicht mehr, darum beziehen sich die Upgrades auf die Ressourcen-Seite (Arbeiter, Werkzeug, Klicks).
- Startkapital und Werkzeugkiste wirken sofort, wenn man sie direkt nach dem Sprung kauft.
- Die Effekte sind stärker als im Entwurf, weil sich der Zeitsprung in der Simulation sonst nicht gelohnt hat (ohne Sprung war man schneller am Ziel).

### Optional später: Respec

Einmal pro Zeitsprung alle Zeitwerkstatt-Upgrades gegen volle Rückerstattung neu verteilen. Lädt zum Ausprobieren ein, kostet nichts in der Umsetzung.

## 5. Ablauf im Spiel

1. **Freischaltung:** Sobald der Rekord 1 km erreicht (Steinwall der Eisenzeit), erscheint ein Hinweis: „Die Zeit bekommt Risse …“ und der Zeitsprung-Button im Menü wird sichtbar. Vorher bleibt er ganz versteckt.
2. **Vorschau:** Button zeigt die Splitter, die man jetzt bekäme, und den Abstand zum nächsten Splitter.
3. **Bestätigung:** Dialog mit zwei Spalten „Verlierst du“ / „Behältst du“ (wie Tabelle oben, gekürzt) und der Splitter-Zahl groß in der Mitte. Kein versehentliches Auslösen auf dem Handy: Button gedrückt halten (1 s) statt einfach tippen.
4. **Animation:** Die Kanone zerspringt in Splitter, die zum Zähler fliegen, Himmel spult durch die Zeitalter zurück bis zur Steinzeit (2 bis 3 Sekunden, überspringbar).
5. **Zeitwerkstatt öffnet sich direkt**, damit die Splitter gleich ausgegeben werden. Danach geht es mit „Zur Kanone“ weiter.
6. Im HUD steht klein der Zähler der Zeitsprünge („Sprung 4“), in der Kanonen-Optik ggf. ein leuchtender Splitter-Ring als Zeichen für Veteranen.

## 6. Spielziel und Tempo

Heute ist das Spiel nach ca. 30 Minuten bei 1.000 km durch. **Entschieden: Variante A.**

- **A, gewählt:** Grund-Balancing etwas härter machen, sodass der erste Lauf ohne Zeitsprung etwa in der Renaissance/Industrie (30 bis 90 km) zäh wird. 1.000 km sind dann nach etwa 5 bis 8 Zeitsprüngen in rund 3 bis 4 Stunden erreichbar. Zeitsprung wird so zum Kern des Spiels.
- ~~B:~~ (verworfen) Balancing lassen wie es ist, Zeitsprung ist ein Endgame nach dem ersten Sieg („Neues Spiel+“). Einfacher, aber die Rebirth-Upgrades verkürzen dann nur ein Spiel, das schon durch ist.

Ergebnis der Bot-Simulation (8 Sekunden pro Schuss, trifft 50 % der Teile, springt, wenn 8 Minuten lang kein neuer Splitter dazukommt):

| Lauf | Dauer | erreicht | Splitter |
|---|---|---|---|
| 1 | ca. 65 min | Mittelalter, 7 km | 21 |
| 2 | ca. 75 min | Industrie, 78 km | 57 |
| 3 | ca. 100 min | Zukunft, 930 km | 169 |
| 4 | ca. 60 min | 1.000 km, Sieg | 215 |

- **Mit Zeitsprung: ca. 5 Stunden, 4 bis 5 Sprünge** bis 1.000 km.
- **Ohne Zeitsprung: ca. 7,2 Stunden.** Der Sprung lohnt sich also deutlich, ist aber nicht zwingend.
- Das ist länger als die ursprünglich angepeilten 3 bis 4 Stunden. Weil jeder Lauf in der Steinzeit beginnt, dauert ein Lauf auch mit vielen Upgrades noch eine knappe Stunde. Stellschrauben, falls es kürzer werden soll: `cAge` (Kosten je Zeitalter, jetzt 5,4) senken oder `spK` und die `ws…`-Werte erhöhen.

Faustregel: Ein neuer Lauf sollte den Rekord des vorigen in **höchstens der Hälfte der Zeit** wieder erreichen. Sonst fühlt sich der Sprung wie Strafe an.

### Nach dem Sieg

- Weiter springen bleibt möglich, um die Zeitwerkstatt zu füllen und Highscores zu jagen (schnellster Lauf bis 1.000 km, wenigste Schüsse).
- Optional: **„Zeitsturm“-Stufen** als freiwillige Schwierigkeit (Hindernisse ×2 Leben je Stufe, dafür +50 % Splitter). Damit gibt es ein Langzeitziel, ohne neue Zeitalter bauen zu müssen.

## 7. Technische Umsetzung

- `core.js`: `s.meta = { sp, earned, jumps, upg, winBonus, bestRun }` bleibt beim Sprung erhalten, `newState(meta)` baut einen frischen Lauf darum herum. `s.runRec` ist der Rekord des Laufs, `s.record` der Allzeit-Rekord.
- `rebirth(s)`, `jumpPreview(s)`, `wsList/wsBuy`, `WORKSHOP` in `core.js`, ohne DOM, damit die Simulation es nutzt.
- `stats(s)` rechnet Challenge-Boni und Zeitwerkstatt als getrennte Faktoren und gibt beide einzeln zurück (Anzeige im Kanonen-Tab).
- Spielstand bleibt `v: 2`, ältere Stände bekommen per `migrate()` ein leeres `meta`, der bisherige Rekord zählt als Lauf-Rekord.
- `tools/sim-rebirth.js` simuliert mehrere Läufe mit Sprüngen und Zeitwerkstatt-Käufen.
- Entwickler-Menü: +50 Zeitsplitter, Zeitwerkstatt zurücksetzen.

## 8. Entscheidungen (Nico, 24.11.2026)

1. **Name:** Zeitsprung / Zeitsplitter, bestätigt.
2. **Spielziel:** Variante A. Grundspiel wird härter, Zeitsprung ist der Kern, 1.000 km nach etwa 5 bis 8 Sprüngen.
3. **Kanonen-Optik:** Vorerst keine Skin-Sammlung. Die Kanone zeigt immer die Optik des aktuellen Zeitalters.
4. **Challenges:** geben keine Zeitsplitter.
5. **Vorsprung:** Vorerst kein Start in einem späteren Zeitalter.

Offen für später: Respec, Zeitsturm-Stufen, Skin-Sammlung, Vorsprung.
