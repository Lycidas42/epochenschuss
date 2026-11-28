# Epochenschuss

Kanonen-Spiel im Browser: Schieß so weit wie möglich. Bei **1.000 km** ist das Spiel durchgespielt.
Mobile-first, läuft aber auch am Desktop (Touch, Maus und Tastatur). Statische Dateien ohne Server, also direkt GitHub-Pages-tauglich. Aufbau wie bei Kernwacht.

## Spielablauf

1. Der Schütze steht fest an der Kanone. **Laden** tippen startet die Timing-Leiste.
2. Winkel (10–80°) und **Schussstärke** (20–100 %) einstellen: Regler, Ziehen im Spielfeld oder Pfeiltasten. Die Vorschau zeigt nur das Anfangsstück der Bahn (ca. 35 %, mit Zielhilfe bis 65 %). Die Spur des letzten Schusses blendet nach der Landung aus.
3. Die Timing-Leiste läuft hin und her. Grün = volle Kraft, helle Mitte = „Perfekt! Kritisch“ (+50 % Schaden). Gelb/Rot = schwächerer Schuss.
4. Unterwegs: **Sterne** (Gold), manchmal ein **Ereignis**. Der Vogel kommt nur noch als seltenes Ereignis 🐦 **Schubvogel**: Er kreist schon vor dem Schuss sichtbar an fester Stelle, treffen gibt „MEGA-SCHUB!“.
5. Auslösen im grünen Bereich: kurzer Effekt (Ringe, Strahlen, „IM GRÜNEN!“ bzw. „★ PERFEKT! ★“). Der Schütze zieht je nach Zeitalter an Schleuder/Zugleine, drückt die Lunte oder den Hebel bzw. den Knopf am Pult.
6. Das Geschoss ändert sich je Zeitalter: Stein, Bronzekugel, Eisenbolzen, Granitbrocken, brennender Fels, Kanonenkugel, Stahlgranate, Rakete, Plasma-Rakete (mit Rauch/Feuer/Plasma-Spur).
7. **Munition** wählt man in der Leiste über dem Laden-Knopf (Kauf im Shop, siehe unten).
8. Zoomen per +/−, Mausrad oder zwei Fingern. Spätere Hindernisse sieht man nur als Umriss.

## Hindernisse

- Pro Zeitalter **3 Hindernisse**, jedes aus 3–6 **Teilen**, später mehr: Mauern, Türme, Fahnen, gestapelte Kisten (fallen herunter, wenn die Unterlage zerstört ist), **fliegende Ballons**, **bewegliche Schilde** (hoch/runter) und **fahrende Karren**.
- Jedes Teil hat einen eigenen Lebensbalken. Zerstörte Teile sacken ein, große Brocken und Steinchen fliegen und **bleiben ca. 10 s auf der Bahn liegen**. Ballons **platzen** („PENG!“), die Fetzen flattern herab, der Korb fällt.
- Die Kugel kann über Hindernisse **hinwegfliegen**. Trifft sie ein Teil, ohne es zu zerstören, prallt sie ab; zerstört sie es, fliegt sie gebremst weiter.
- Positionen: erstes Hindernis ab 95 % der Start-Reichweite des Zeitalters (hintere Teile brauchen ein Upgrade), zweites bei ca. 125–145 %, drittes kurz vor der maximalen Reichweite. Challenges geben keine Reichweite mehr, Flieger nur noch kleinen Schub, damit man Hindernisse nicht ohne Upgrades überschießt. Keine Überlappung, und jedes Teil ist mit der voll ausgebauten Kanone erreichbar (wird in `core.js` geprüft).
- Sichtbar: alle Hindernisse des aktuellen Zeitalters + das erste des nächsten (🔒, unverwundbar). Alles danach nur als Umriss.

## Fortschritt

- **Kanone = Zeitalter.** Pro Zeitalter 12 Upgrades (4 Linien × 3 Stufen). Aufsteigen geht, sobald **alle Hindernisse des Zeitalters zerstört** sind. Upgrades helfen dabei, sind aber freiwillig (Nico, 2026-11-27). Offene Upgrades des Zeitalters gibt es beim Aufstieg geschenkt, sie zählen also als Basis fürs nächste Zeitalter.
- Jedes Upgrade ändert die Kanone sichtbar: **Schusskraft** = längeres, dickeres Rohr aus edlerem Material (Stufe 3 golden), **Wucht** = andere Munition (Stapel neben der Kanone, Geschoss wird größer), Kimme/Zielfernrohr/Laser (Zielhilfe), Wimpel/Stern/Kleeblatt (Glück). Alle 4 Upgrades gibt es ein **neues Gestell** (Podest, Dreibein, goldene Drehscheibe).
- **Schütze:** je Zeitalter 3 Skins (Mann, Frau, Kind) mit eigener Kleidung. Auswahl im Aufstiegs-Fenster und jederzeit im Kanonen-Tab; bleibt über Zeitsprünge erhalten.
- **Hintergrund und Bahn je Zeitalter:** Vulkan/Steinplatten, Berge/Lehm, Tannen/Bohlenweg, Tempel/Marmor, Burg/Pflaster, Kuppelstadt/Ziegel, Fabriken/Eisenplatten mit Schienen, Hochhäuser/Asphalt, Weltraum-Neonstadt/leuchtendes Plasma-Metall.
- Bei **1.000 km** gibt es eine große Siegesshow: Riesenfeuerwerk, Flugzeug schreibt „Du hast es geschafft!“ in den Himmel, riesiger Smiley mit Krone, Konfetti (antippen überspringt).
- **Zielhilfe gilt nur im aktuellen Zeitalter**: grüne Zone und Vorschau starten nach jedem Aufstieg wieder klein.
- Der **Aufstieg** ist eine kleine Show: alte Kanone glüht und schrumpft, Lichtblitz, neue Kanone springt heraus, großer Titel, Feuerwerk.
- Upgrades kosten Gold + Ressourcen.

## Ressourcen

Eigene Ansicht im Spielfenster (Umschalter **🎯 Kanone / ⛏️ Rohstoffe / 🏋️ Training / 🌾 Farm** oben). Alle 10 Ressourcen gleichzeitig als kleine Kacheln mit animierter Abbaustelle (Wald, Steinbruch, Schmelzofen …): Antippen lässt den Schützen eine deutliche, eigene Bewegung machen (Holz sägen, Stein heben und werfen, Blasebalg drücken, Lore schieben, Seilkurbel drehen, Stahl abschrecken, Pulver sieben, Hebel ziehen, am Pult tippen, Energie lenken), Splitter fliegen, fertige Ressourcen fliegen ins Lager. Klicken wird je Zeitalter schwächer (Steinzeit 10 Tipps = 1 Füllung, danach ×0,7 pro Zeitalter), später tragen Arbeiter und Werkzeug. Bessere 🔨 Werkzeug-Stufen sieht man: Die Arbeiter halten edlere Werkzeuge (Stein/Bronze, Eisen, Stahl, Gold) und tragen andere Helme, die Abbaustelle wächst mit (größerer Wald, Kran am Steinbruch, zweiter Schornstein, Förderturm …). Je Kachel 👷 **Arbeiter** (Gold; hauen, tragen, laufen zurück, auch offline max. 8 h) und 🔨 **Werkzeug** (mehr pro Füllung). Noch nicht erreichte Ressourcen sind ausgegraut. Nicht mehr benötigte Ressourcen (alles außer den beiden des aktuellen Zeitalters) lassen sich per **⇄ Tauschen** in eine der beiden aktuell gebrauchten umtauschen; Kurs 2 × 1,85^(Zeitalter-Abstand). Münze und Ressourcen sind eigene Grafiken statt neuerer Emoji, die ältere Systeme nicht anzeigen.

## Ereignisse (halten 3–5 Schüsse an)

Bis zu **2 Ereignisse gleichzeitig** (nie zweimal dieselbe Art), z. B. Schubvogel + Rückenwind. Läuft schon eins, kommt mit 20 % Chance pro Schuss ein zweites dazu. Beide Karten stehen untereinander oben links.

Start mit großem Hinweis in der Mitte, danach oben links eine Karte mit Symbol, Wirkung und verbleibenden Schüssen (grün = gut, rot = schlecht). Regen, Nebel und Fallwind sind auch im Bild zu sehen. Boni enden, sobald man sie eingesammelt hat.


Rückenwind/Gegenwind, 🐾 Maulwurf (stößt Kugeln, die auf seinem Hügel landen, wieder hoch), 🌿 Schnapppflanze (fängt tief fliegende Kugeln), ⛈️ Gewitterwolken (bremsen), 🌧️ Regen (Luftwiderstand), ⬇️ Fallwind (mehr Schwerkraft), 🌫️ Nebel (keine Vorschau), 💰 Schatzkiste am Boden, 🎈 Goldballon, ✨ Sternenregen, 🐦 Schubvogel (kreist sichtbar, treffen = Mega-Schub, endet nach dem Treffer).

## Challenges

Jederzeit spielbar, jede mit Mindest-Zeitalter und einem **dauerhaften Bonus**. Geschaffte Challenges sind danach gesperrt. In Challenges zeigt die Vorschau nur ein kurzes Anfangsstück (30 %). In späteren Zeitaltern werden Entfernungen und Ziele mitskaliert. Die aktiven Boni stehen klein oben rechts im Spielfeld (🏆 Challenges, 💠 Zeitwerkstatt).

| Challenge | ab | Aufgabe | Bonus |
|---|---|---|---|
| Zielscheibe | Steinzeit | Landen auf Ziel in 35 m, 3 Versuche | +10 % Schaden |
| Vogelschwarm | Steinzeit | 3 fliegende Ziele, 5 Schüsse | +10 % Gold |
| Punktlandung | Steinzeit | Landen in schmaler Zone bei 50 m, 3 Versuche | +15 % Gold |
| Fahrendes Ziel | Bronzezeit | auf einem hin- und herfahrenden Karren landen, 4 Versuche | +10 % Gold |
| Fernziel | Bronzezeit | Ziel in 300 m, 3 Versuche | +10 % Schaden |
| Turmsturm | Eisenzeit | Turm aus 5 gestapelten Teilen komplett zerstören, 10 Schüsse | +15 % Schaden |
| Ballonjagd | Eisenzeit | 4 Ballons, 6 Schüsse | +10 % Schaden |
| Drachenfest | Antike | 3 auf und ab tanzende Drachen, 6 Schüsse | +10 % Gold |
| Turmspitze | Mittelalter | Fahne auf hohem Turm, 3 Versuche | +15 % Schaden |
| Festungssturm | Renaissance | 8 Teile inkl. wanderndem Schild zerstören, 14 Schüsse | +15 % Schaden |
| Zeppelin-Staffel | Industrie | 5 Zeppeline, 8 Schüsse | +20 % Gold |
| Panzerzug | Industrie | auf schnell fahrendem Zug landen, 4 Versuche | +15 % Gold |
| Bunkerknacker | Moderne | Landen auf dem Bunker, 3 Versuche | +20 % Gold |
| Satellitenjagd | Zukunft | 4 Satelliten, 6 Schüsse | +25 % Schaden |

Höhen-Challenges (Ziele am Boden, auf Podesten und auf Aufzügen, die hoch und runter fahren): Höhenparcours (Steinzeit, +10 % Gold), Stufenziele (Eisenzeit, +10 % Schaden), Aufzugturm (Mittelalter, +15 % Schaden), Dächerjagd (Moderne, +20 % Gold).

## Shop (Gold): Munition und Schreine

Tab **Shop** im Werkbank-Panel. Preise wachsen mit dem Zeitalter (Basis = Gold eines vollen Schusses).

- **Munition** in 5er-Packs, Auswahl in der Leiste über dem Laden-Knopf (normale Kugel unbegrenzt): 🏹 Pfeil (×3 Schaden an Hindernissen, 15 % weniger weit), 💣 Sprengkugel (trifft sie ein Hindernis, macht sie normalen Schaden und explodiert danach: 60 % Flächenschaden an den Teilen daneben; am Boden explodiert sie und schleudert weit nach vorn), 🔩 Bohrkugel (durchbohrt bis zu 3 Teile), 🏀 Hüpfkugel (springt 3-mal weiter), 💰 Goldkugel (dreifaches Gold), 🧲 Magnetkugel (zieht goldene Sterne in der Nähe an).
- **Schreine:** 3 zufällige Angebote (Schaden, Reichweite, Gold, Arbeitstempo, kritischer Schaden; je nach Stärke teurer), neu würfeln kostet Gold. Jeder Schrein macht den nächsten teurer.
- Gekaufte Schreine stehen sichtbar hinter der Kanone (je Art einer, mit Flamme in der Farbe der Wirkung).
- Munition und Schreine gehen beim Zeitsprung verloren.

## Training

Eigene Ansicht: Zielscheiben und Puppen auf dem Übungsplatz abschießen. Jedes zerstörte Ziel gibt zufällig **+1 % Schaden, Reichweite oder Gold**, dauerhaft (bleibt über Zeitsprünge). Die Summe steht in den Bonus-Zeilen (🏋️).

## Farm

Zweite Welt, umschaltbar oben. Per Hand **säen, gießen, ernten** (Beet antippen), Ernte am Marktstand **verkaufen** (viel Gold). Wachsende Beete antippen pflegt sie (Hacke) und beschleunigt das Wachstum um 6 % je Tipp. Kaufen: Saatgut (5er-Packs), neue Beete (3 bis 20, jedes deutlich teurer, ab Beet 7 erst in späteren Zeitaltern, das letzte erst in der Zukunft), neue Sorten (Weizen, Mais, Kürbis, Sonnenblume, Goldähre; länger wachsend, aber lohnender) Bots (Säe-, Gieß-, Ernte-, Händler-Bot und Saatgut-Bot, der das gewählte Saatgut nachkauft) und 🧪 Dünger (5 Stufen, je +30 % Wachstumstempo). Pflanzen wachsen auch offline, Bots arbeiten nur bei offenem Spiel. Die Farm gehört zum Lauf und ist nach einem Zeitsprung weg. Ein roter Zähler am Farm-Tab (auch aus der Kanonen-Ansicht sichtbar) zeigt, wenn etwas zu tun ist: verkaufen, ernten, gießen, säen oder Saatgut nachkaufen. Schritte, die ein gekaufter Bot übernimmt, zählen nicht. In der Farm steht die Liste unter „Zu tun“.

## Zeitsprung (Rebirth)

Sobald ein Zeitsprung möglich ist, reißt ein Zeitriss mit Portal im Himmel auf. Der Zeitsprung selbst ist eine Raketenshow: Der Schütze läuft zur Rakete, steigt ein, Countdown, und die Rakete verschwindet als Punkt im Himmel (antippen überspringt).


Ab einem Rekord von **1 km** im aktuellen Lauf erscheint der Bereich **Zeitsprung** (Tab im Werkbank-Panel, 💠-Zähler oben). Ein Zeitsprung (Knopf 1 Sekunde gedrückt halten) schickt dich zurück in die Steinzeit und bringt **Zeitsplitter**: `10 × Rekord_km^0,4` (1 km = 10, 10 km = 25, 100 km = 63, 1.000 km = 158), beim ersten Lauf bis 1.000 km +25 Bonus.

- **Verloren:** Gold, Ressourcen, Zeitalter, Kanonen-Upgrades, Arbeiter, Werkzeug, Hindernis-Schäden, Munition, Schreine, Farm.
- **Bleibt:** Zeitsplitter, Zeitwerkstatt, Challenge-Boni, Trainings-Boni, Bestwerte und Statistik (Allzeit-Rekord im Fortschrittsbalken, 🏁 zeigt den Rekord des aktuellen Laufs).
- **Zeitwerkstatt** (dauerhaft, Kosten = Basis × 1,5^Stufe): Wirtschaft (Goldader +40 % Gold, Fleißige Hände +40 % Arbeitstempo, Kräftige Schläge +25 % pro Klick), Kanone (Scharfes Auge: mehr kritischer Schaden, Vogelflüsterer: mehr Vogel-Schub, Erbstück-Lauf +12 % Reichweite, Zeitgehärtete Kugeln +25 % Schaden, Ruhige Hand +2 Punkte grüne Zone, Sternenfänger +1 Stern), Erbe (Startkapital, Stammarbeiter, Werkzeugkiste, Alte Pläne −7 % Upgrade-Kosten, Schreinsegen), Zeit (Splitterlinse +10 % Splitter, Lange Nächte +4 h Offline, Weitblick +5 % Vorschau, Glückskind: gute Ereignisse häufiger, Trainingseifer, Challenge-Meister), Munition (Munitionsvorrat, Gummikern: Hüpfkugel +1 Sprung, Stahlspitzen: Pfeil +0,5× Schaden, Doppelzünder: Sprengkugel +15 % Flächenschaden und größerer Radius, Diamantbohrer: +1 durchbohrtes Teil, Goldguss: Goldkugel +1× Gold), Farm (Grüner Daumen +25 % Ernte, Ewiger Dünger +15 % Wachstum, Großer Acker +1 Startbeet, Erbsaat: weitere Sorten von Anfang an, Saatbeutel: Start-Saatgut und −10 % Saatgutpreis, Stamm-Bots: Bots von Anfang an). Werte je Stufe.
- Challenges geben keine Splitter, und die Zeitwerkstatt gibt keine Challenge-Boni. Im Kanonen-Tab werden beide Boni getrennt angezeigt.
- Jeder Lauf beginnt in der Steinzeit, außer mit ⏳ **Zeitreise-Start** (Zeitwerkstatt, Zweig Zeit, 5 Stufen, teuer: 25/60/140/300/600 Splitter): Start in Bronzezeit bis Renaissance, Hindernisse davor gelten als zerstört, Upgrades davor als gekauft, dazu Startgold. Kanonen-Optik ist immer die des aktuellen Zeitalters.
- Konzept und Entscheidungen: `docs/rebirth-konzept.md`.

## Bestenliste

Kategorien: weiteste Distanz, meiste Zeitsprünge, meiste Upgrades, wenigste Schüsse bis 1.000 km, meiste perfekte Schüsse, meiste zerstörte Hindernis-Teile, meiste Challenges. **Vorerst nur auf dem Gerät** (localStorage, ein Eintrag pro Spielername). Eine echte Online-Bestenliste braucht ein Backend, z. B. Supabase wie bei Kernwacht.

## Menü

- Testmodus: Gold & Teile, nächstes Hindernis zerstören, Zeitalter abschließen.
- Entwickler: Siegesshow ansehen, +50 Zeitsplitter, Zeitwerkstatt zurücksetzen, Zeitalter springen, Ereignis auslösen, Gold ×10, +100 Teile, +1 Stunde Arbeiter, Challenges alle geschafft/zurücksetzen, Hindernisse heilen; Schalter für Trefferzonen, ganze Flugbahn, immer perfekt, Zeitlupe, keine Ereignisse, Debug-Infos.

## Balancing

Das Grundspiel ist bewusst härter, damit der Zeitsprung der Kern ist. Stand Runde 4: Hindernisse haben mehr Leben (hp0 28, ×4,95 je Zeitalter), Kanonen-Upgrades sind günstiger (c0 13, ×4,85 je Zeitalter), Ressourcen-Upgrades teurer (Arbeiter 40, Werkzeug 20, ×3,9 je Zeitalter) und Upgrades brauchen mehr Teile (×1,85 je Zeitalter). So fließen je nach Zeitalter etwa 25–45 % des Goldes in Arbeiter/Werkzeug.

- `node tools/sim.js` (ein Lauf ohne Zeitsprung) zeigt je Zeitalter, wann Hindernisse und Upgrades fertig sind, wie sich das Gold auf Kanone/Ressourcen verteilt und wie viel vom Klicken kommt: ca. **5,3 Stunden** bis 1.000 km (Stand 0.7.2: Aufstieg ohne Pflicht-Upgrades, offene Upgrades geschenkt).
- `node tools/sim-rebirth.js`: ca. **4,8 Stunden und 3 Zeitsprünge** bis 1.000 km.
- Alle Werte in `core.js` (`P`), auch die Zeitwerkstatt-Effekte (`wsAder`, `wsLauf` …).

## Dateien

| Datei | Inhalt |
| --- | --- |
| `index.html` | Markup und Styles |
| `core.js` | Spielkern ohne DOM: Zeitalter, Upgrades, Ressourcen, Zeitsprung/Zeitwerkstatt, Balancing (`P`) |
| `game.js` | Steuerung: Schuss-Ablauf, Physik, Oberfläche, Speichern, Spielschleife |
| `render.js` | Grafik (Canvas 2D): Kanonen, Schütze, Hindernisse, Vogel, Himmel, Ereignisse, Munition, Schreine, Training, Aufstiegs-Show, Zeitriss und Rakete |
| `res-render.js` | Ressourcen-Ansicht: Abbaustellen, Ressourcen-Grafiken, Tippbewegungen, Arbeiter, Lager |
| `farm-render.js` | Farm-Ansicht: Beete, Bauer, Bots, Scheune, Markt |
| `tools/sim.js` | Bot-Simulation für das Balancing (`HIT=0.5 TAPS=3 node tools/sim.js`) |
| `tools/sim-rebirth.js` | Bot-Simulation mit Zeitsprüngen (`STALL=8 node tools/sim-rebirth.js`) |
| `docs/rebirth-konzept.md` | Konzept Zeitsprung / Zeitwerkstatt |
| `tools/build-single.js` | Baut `dist/epochenschuss.html` (Einzeldatei) und `dist/artifact.html` |
| `manifest.webmanifest`, `icons/` | Web-App-Manifest und Icons (Homescreen, Favicon); Vorlage `icons/icon.svg` |
| `sw.js` | Service Worker: online immer neueste Version, offline aus dem Cache |

## Veröffentlichen (GitHub Pages)

Live unter **https://lycidas42.github.io/epochenschuss/**. Pages veröffentlicht direkt den Branch `main` (Ordner `/`), es gibt keinen Build-Schritt.

- **Zwei Varianten aus demselben Code:** Auf `*.github.io` läuft die öffentliche Version ohne Test- und Entwickler-Menü (Entwickler-Schalter sind dort immer aus). Überall sonst (lokal per `npx http-server`, Claude-Vorschau, `dist/`-Einzeldatei) ist es die Entwickler-Version mit allen Werkzeugen. Gesteuert über `DEV` am Anfang von `game.js`.
- Bei jeder Veröffentlichung `VERSION` in `sw.js` **und** `game.js` erhöhen (wird im ⚙️-Menü angezeigt), damit installierte Apps alte Dateien verwerfen.
- Neue Dateien, die offline gebraucht werden, in `sw.js` unter `APP` eintragen.
- Spielstände liegen im `localStorage` des Geräts unter `jushoot-v2` (Bestenliste `jushoot-scores`). Die Schlüssel stammen aus dem Arbeitstitel und bleiben so, damit vorhandene Spielstände erhalten bleiben.
