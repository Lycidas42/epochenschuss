// Epochenschuss – Spielkern ohne DOM (läuft auch in Node, z. B. für tools/sim.js)
(function (root) {
  'use strict';

  // Balancing-Stellschrauben (überschreibbar per root.JS_P für Simulationen)
  const P = Object.assign({
    r0: 0.06,       // Startreichweite in km (45°, volle Stärke, grünes Timing)
    kraftF: 1.25,   // Reichweite je Schusskraft-Stufe
    ageR: 1.6,      // Reichweite je Zeitalter-Aufstieg
    d0: 10, wuchtF: 1.35, ageD: 1.8, crit: 1.5,   // Schaden
    hp0: 28, hpG: 4.95, hpK: 0.45,                // Leben der Hindernis-Teile
    g0: 5, gExp: 0.85, gluckF: 1.12, partGold: 2, obsGold: 6, // Gold
    c0: 13, cAge: 4.85, cStep: 0.22,              // Upgrade-Kosten (Gold)
    n0: 6, nAge: 1.85, nStep: 0.2,                // Upgrade-Kosten (Teile): wächst schneller als früher, damit Arbeiter/Werkzeug nötig bleiben
    tap: 0.1, tapF: 0.7, cycle: 6,                // Ressourcen: Fortschritt je Klick (× tapF je Zeitalter: Klicken hilft vor allem am Anfang), Sekunden je Durchlauf pro Arbeiter
    toolC: 20, toolG: 1.9, workC: 40, workG: 1.6, rAge: 3.9, // Ressourcen-Upgrades (Gold)
    obsX: [0.95, 1.45, 1.85],                      // Hindernis-Positionen relativ zur Reichweite zu Beginn des Zeitalters
    steps: 3,                                     // Stufen je Upgrade-Linie und Zeitalter
    goal: 1000, offlineCap: 8 * 3600,
    spK: 10, spExp: 0.4, spMin: 1, spWin: 25, wsG: 1.5,
    wsAder: 0.4, wsHaende: 0.4, wsSchlag: 0.25, wsLauf: 0.12, wsKugel: 0.25, wsPlaene: 0.07, wsLinse: 0.1, wsVogel: 0.15, // Zeitwerkstatt je Stufe // Zeitsprung: Splitter = spK × Rekord_km^spExp, ab spMin km; Kosten-Wachstum Zeitwerkstatt
  }, root.JS_P || {});

  const LINES = [
    { id: 'kraft', name: 'Schusskraft', eff: '+25 % Reichweite' },
    { id: 'wucht', name: 'Wucht',       eff: '+35 % Schaden an Hindernissen' },
    { id: 'ziel',  name: 'Zielhilfe',   eff: 'Größere grüne Zone, längere Flugbahn-Vorschau (gilt nur in diesem Zeitalter)' },
    { id: 'gluck', name: 'Glück',       eff: '+12 % Gold, mehr Sterne' },
  ];

  // Zeitalter = Level der Kanone. Pro Zeitalter 4 Linien × 3 Stufen = 12 Upgrades und 3 Hindernisse.
  const AGES = [
    { name: 'Steinzeit',   cannon: 'Steinschleuder', flyer: 'Flugsaurier',    obstacles: ['Dornenhecke', 'Steinkreis', 'Mammutzaun'],
      items: ['Elastische Sehne', 'Scharfkantiger Stein', 'Ruhige Hand', 'Hasenpfote'] },
    { name: 'Bronzezeit',  cannon: 'Wurfarm',        flyer: 'Kranich',        obstacles: ['Holzpalisade', 'Grabhügel', 'Bronzetor'],
      items: ['Bronzefeder', 'Bronzekugel', 'Kerbe am Visier', 'Glücksamulett'] },
    { name: 'Eisenzeit',   cannon: 'Balliste',       flyer: 'Rabe',           obstacles: ['Steinwall', 'Wachturm', 'Keltenfestung'],
      items: ['Torsionsseile', 'Eisenbolzen', 'Zielstange', 'Rabenfeder'] },
    { name: 'Antike',      cannon: 'Onager',         flyer: 'Adler',          obstacles: ['Römisches Kastell', 'Aquädukt', 'Legionslager'],
      items: ['Gedrehte Taue', 'Granitkugel', 'Messlatte', 'Lorbeerkranz'] },
    { name: 'Mittelalter', cannon: 'Tribok',         flyer: 'Falke',          obstacles: ['Burgmauer', 'Bergfried', 'Zugbrücke'],
      items: ['Gegengewicht', 'Eisenkugel', 'Peilstab', 'Wappensiegel'] },
    { name: 'Renaissance', cannon: 'Bronzekanone',   flyer: 'Heißluftballon', obstacles: ['Bastion', 'Sternfestung', 'Zitadelle'],
      items: ['Feinpulver', 'Gusseisenkugel', 'Quadrant', 'Kaufmannssiegel'] },
    { name: 'Industrie',   cannon: 'Dampfgeschütz',  flyer: 'Zeppelin',       obstacles: ['Panzerzug', 'Fabrikschlot', 'Stahlbrücke'],
      items: ['Hochdruckkessel', 'Stahlgranate', 'Fernrohr', 'Aktienpaket'] },
    { name: 'Moderne',     cannon: 'Haubitze',       flyer: 'Düsenjet',       obstacles: ['Betonbunker', 'Funkturm', 'Flakstellung'],
      items: ['Treibladung', 'Panzerkern', 'Laserzielgerät', 'Sternenradar'] },
    { name: 'Zukunft',     cannon: 'Railgun',        flyer: 'Drohne',         obstacles: ['Energieschild', 'Laserturm', 'Orbitaltor'],
      items: ['Magnetspulen', 'Plasmakern', 'KI-Zielsystem', 'Quantenglück'] },
  ];

  // Ressourcen. Zeitalter a braucht MATS[a] und MATS[a+1].
  const MATS = [
    { id: 'holz',    name: 'Holz',         icon: '🪵', place: 'Wald' },
    { id: 'stein',   name: 'Stein',        icon: '🪨', place: 'Steinbruch' },
    { id: 'bronze',  name: 'Bronze',       icon: '🥉', place: 'Schmelzofen' },
    { id: 'eisen',   name: 'Eisen',        icon: '⛓️', place: 'Eisenmine' },
    { id: 'seil',    name: 'Seile',        icon: '🪢', place: 'Seilerei' },
    { id: 'stahl',   name: 'Stahl',        icon: '🗡️', place: 'Schmiede' },
    { id: 'pulver',  name: 'Schießpulver', icon: '💥', place: 'Pulvermühle' },
    { id: 'zahnrad', name: 'Zahnräder',    icon: '⚙️', place: 'Dampfwerk' },
    { id: 'chip',    name: 'Elektronik',   icon: '💾', place: 'Chipfabrik' },
    { id: 'plasma',  name: 'Plasma',       icon: '🔮', place: 'Fusionsreaktor' },
  ];
  MATS.forEach((m, i) => { m.age = Math.max(0, i - 1); });

  // ---------- Hindernisse ----------
  // Ein Hindernis besteht aus Teilen (Mauer, Turm, Flaggen …). Maße in Einheiten u = 4 % der Entfernung.
  // kind: wall/tower/block (Bauteile), flag/banner (Fahnen am Mast), balloon (fliegt, an Leine), shield (bewegt sich hoch/runter), cart (fährt hin und her)
  // on: steht auf Teil Nr. on – wird das zerstört, fällt es herunter. mv: Bewegung [ax, ay, Frequenz] in u.
  const KIND_HP = { wall: 1.2, tower: 1.5, block: 0.9, flag: 0.6, banner: 0.7, balloon: 0.5, shield: 1.0, cart: 0.9 };
  const T = (kind, dx, y, w, h, extra) => Object.assign({ kind, dx, y, w, h }, extra || {});
  const TEMPLATES = [
    [T('wall', 0, 0, 1.4, 2.2), T('tower', 1.6, 0, 1.2, 4.4), T('flag', 1.75, 5.6, 1, 1)],
    [T('wall', 0, 0, 1.4, 2), T('block', 0.2, 2, 1, 1, { on: 0 }), T('tower', 1.8, 0, 1.2, 3.8), T('banner', 1.95, 4.9, 1, 1)],
    [T('wall', 0, 0, 1.2, 1.6), T('balloon', 0.8, 4.6, 0.9, 1.1, { mv: [0, 0.5, 1.3] }), T('wall', 1.6, 0, 1.2, 2.4), T('flag', 1.75, 3.3, 0.9, 0.9)],
    [T('tower', 0, 0, 1.2, 4.2), T('flag', 0.15, 5.4, 1, 1), T('shield', 1.45, 2, 0.45, 1.5, { mv: [0, 1.3, 0.8] }), T('wall', 2.1, 0, 1.4, 2.4), T('block', 2.3, 2.4, 1, 1, { on: 3 })],
    [T('wall', 0, 0, 1.6, 1.6), T('block', 0.1, 1.6, 1.4, 1.3, { on: 0 }), T('block', 0.3, 2.9, 1, 1, { on: 1 }), T('tower', 2.3, 0, 1.2, 3.4), T('balloon', 3.9, 5.2, 0.9, 1.1, { mv: [0, 0.6, 1.1] })],
    [T('wall', 0, 0, 1, 1.8), T('block', 0, 1.8, 1, 0.9, { on: 0 }), T('tower', 1.1, 0, 1.3, 4.8), T('banner', 1.25, 5.9, 1, 1), T('cart', 3.2, 0, 1.3, 1, { mv: [0.8, 0, 0.6] }), T('balloon', 2, 7.4, 0.9, 1.1, { mv: [0.7, 0.4, 0.9] })],
  ];
  const ageRange = a => P.r0 * Math.pow(Math.pow(P.kraftF, P.steps) * P.ageR, a);
  const OBS = [];
  AGES.forEach((A, a) => {
    // Positionen von hinten nach vorn: das letzte Hindernis endet vor der maximalen Reichweite, keine Überlappung
    const r = ageRange(a), RmA = r * Math.pow(P.kraftF, P.steps), tpls = [0, 1, 2].map(k => TEMPLATES[a <= 3 ? a + k : 3 + ((a + k) % 3)]);
    const ats = []; let limit = 0.95 * RmA;
    for (let k = 2; k >= 0; k--) {
      const wU = Math.max(...tpls[k].map(t => t.dx + t.w + (t.mv ? t.mv[0] : 0)));
      ats[k] = Math.min(r * P.obsX[k], limit / (1 + 0.04 * wU));
      limit = ats[k] - 0.04 * r;
    }
    A.obstacles.forEach((name, k) => buildObs(A, a, k, name, tpls[k], ats[k], RmA));
  });
  function buildObs(A, a, k, name, tpl, at, RmA) {
    const u = at * 0.04;
    const parts = tpl.map((t, i) => ({ kind: t.kind, x: at + t.dx * u, y: t.y * u, w: t.w * u, h: t.h * u, on: t.on == null ? -1 : t.on,
      mv: t.mv ? { ax: t.mv[0] * u, ay: t.mv[1] * u, f: t.mv[2], ph: (a * 3 + k + i) * 1.7 } : null,
      hp: Math.round(P.hp0 * Math.pow(P.hpG, a) * (1 + P.hpK * k) * KIND_HP[t.kind]) }));
    // Erreichbarkeit sichern: jedes Teil muss mit voll ausgebauter Kanone des Zeitalters treffbar sein
    const Rm = RmA;
    parts.forEach(p => { if (p.on >= 0) return; const xc = p.x + p.w / 2 + (p.mv ? p.mv.ax : 0), lim = 0.8 * (Rm * Rm - xc * xc) / (2 * Rm), top = p.y + p.h + (p.mv ? p.mv.ay : 0);
      if (top > lim) p.y = Math.max(p.mv ? p.mv.ay : 0, p.y - (top - lim)); });
    const end = Math.max(...parts.map(p => p.x + p.w + (p.mv ? p.mv.ax : 0)));
    OBS.push({ id: OBS.length, age: a, k, name, at, end, u, parts, top: Math.max(...parts.map(p => p.y + p.h + (p.mv ? p.mv.ay : 0))) });
  }
  // Standhöhe eines Teils: steht es auf einem zerstörten Teil, rutscht es auf dessen Unterlage
  function partLevel(o, hp, i) {
    const p = o.parts[i];
    if (p.on < 0) return p.y;
    return partLevel(o, hp, p.on) + (hp[p.on] > 0 ? o.parts[p.on].h : 0);
  }
  // Aktuelle Position (links unten) eines Teils zur Zeit t; ys = geglättete Standhöhen (Fall-Animation)
  function partPos(o, i, t, ys) {
    const p = o.parts[i], y = ys && ys[i] != null ? ys[i] : p.y;
    if (!p.mv) return { x: p.x, y };
    const w = Math.sin(t * p.mv.f + p.mv.ph);
    return { x: p.x + p.mv.ax * w, y: y + p.mv.ay * w };
  }

  // ---------- Challenges ----------
  // type 'ground': Landung im Zielbereich [at-w, at+w]. type 'fly': alle Ziele treffen (Radius r).
  // type 'tower': alle Teile eines Turms zerstören (Teile [dx, y, w, h, auf Teil, Art, Bewegung] in Einheiten u). move: Ziel fährt hin und her (Anteil), moveY: Ziel schwebt auf und ab.
  // Positionen gelten für das Zeitalter minAge; in späteren Zeitaltern wird alles mitskaliert (chalFor).
  // Höhen-Challenge: Positionen relativ zur Start-Reichweite des Zeitalters (x, Höhe, Art, obere Höhe beim Aufzug)
  function hz(id, minAge, name, tg, r, tries, bonus, desc) {
    const R = ageRange(minAge);
    return { id, minAge, name, type: 'fly', heights: true, targets: tg.map(t => [t[0] * R, Math.max(t[1] * R, r * R * 1.05), t[2], t[3] != null ? t[3] * R : null]), r: r * R, move: 0, tries, bonus, desc };
  }
  const CHALLENGES = [
    { id: 'scheibe', minAge: 0,  name: 'Zielscheibe',      type: 'ground', at: 0.035, w: 0.0018, tries: 3, bonus: { dmg: 0.10 }, desc: 'Lande auf der Zielscheibe – 3 Versuche.' },
    { id: 'voegel', minAge: 0,   name: 'Vogelschwarm',     type: 'fly', targets: [[0.02, 0.009], [0.03, 0.016], [0.042, 0.007]], r: 0.0017, move: 0.18, tries: 5, bonus: { gold: 0.10 }, desc: 'Triff 3 fliegende Vögel mit 5 Schüssen.' },
    { id: 'landung', minAge: 0,  name: 'Punktlandung',     type: 'ground', at: 0.05, w: 0.0012, tries: 3, bonus: { gold: 0.15 }, desc: 'Lande genau in der Markierung – 3 Versuche.' },
    { id: 'karren', minAge: 1,   name: 'Fahrendes Ziel',   type: 'ground', at: 0.22, w: 0.006, move: 0.3, sp: 0.8, look: 'cart', tries: 4, bonus: { gold: 0.10 }, desc: 'Ein Karren fährt hin und her – lande genau darauf. 4 Versuche.' },
    { id: 'fern', minAge: 1,     name: 'Fernziel',         type: 'ground', at: 0.3, w: 0.008, tries: 3, bonus: { dmg: 0.10 }, desc: 'Ein Ziel weit hinten – 3 Versuche.' },
    { id: 'turmsturm', minAge: 2, name: 'Turmsturm',       type: 'tower', at: 0.4, u: 0.016, hpF: 1.2, tries: 10, bonus: { dmg: 0.15 }, desc: 'Ein Turm aus 5 Teilen: zerstöre alle mit 10 Schüssen.',
      parts: [[0, 0, 2, 1.6, null, 'wall'], [0, 1.6, 2, 1.6, 0, 'block'], [0.2, 3.2, 1.6, 1.4, 1, 'block'], [0.4, 4.6, 1.2, 1.2, 2, 'tower'], [0.5, 6.2, 1, 0.9, 3, 'flag']] },
    { id: 'ballons', minAge: 2,  name: 'Ballonjagd',       type: 'fly', targets: [[1.0, 0.25], [1.3, 0.4], [1.6, 0.18], [1.9, 0.3]], r: 0.055, move: 0.16, tries: 6, bonus: { dmg: 0.10 }, desc: 'Triff 4 Ballons mit 6 Schüssen.' },
    { id: 'drachen', minAge: 3,  name: 'Drachenfest',      type: 'fly', look: 'kite', targets: [[1.5, 0.5], [2.1, 0.8], [2.7, 0.4]], r: 0.05, move: 0.05, moveY: 0.35, tries: 6, bonus: { gold: 0.10 }, desc: 'Drei Drachen tanzen im Wind – triff alle mit 6 Schüssen.' },
    { id: 'turm', minAge: 4,     name: 'Turmspitze',       type: 'fly', targets: [[5, 1.6]], r: 0.14, move: 0, tries: 3, bonus: { dmg: 0.15 }, desc: 'Triff die Fahne auf dem hohen Turm – 3 Versuche.' },
    { id: 'festung', minAge: 5,  name: 'Festungssturm',    type: 'tower', at: 22, u: 0.8, hpF: 1.2, tries: 14, bonus: { dmg: 0.15 }, desc: 'Zwei Türme, eine Mauer und ein wandernder Schild: zerstöre alle 8 Teile mit 14 Schüssen.',
      parts: [[0, 0, 1.4, 3, null, 'tower'], [0.1, 3, 1.2, 1.2, 0, 'block'], [0.25, 4.6, 1, 0.9, 1, 'flag'], [1.6, 0, 2.2, 1.6, null, 'wall'], [2, 1.6, 1.4, 1, 3, 'block'], [4, 0, 1.4, 3.6, null, 'tower'], [4.15, 5, 1, 0.9, 5, 'banner'], [2.4, 3.4, 0.4, 1.3, null, 'shield', [0, 1.2, 0.9]]] },
    { id: 'zeppelin', minAge: 6, name: 'Zeppelin-Staffel', type: 'fly', targets: [[30, 7], [38, 11], [45, 5], [52, 9], [60, 4]], r: 1.3, move: 0.08, tries: 8, bonus: { gold: 0.20 }, desc: 'Triff 5 Zeppeline mit 8 Schüssen.' },
    { id: 'panzerzug', minAge: 6, name: 'Panzerzug',       type: 'ground', at: 70, w: 1.6, move: 0.25, sp: 1.4, look: 'train', tries: 4, bonus: { gold: 0.15 }, desc: 'Ein Panzerzug rast hin und her – lande genau darauf. 4 Versuche.' },
    { id: 'bunker', minAge: 7,   name: 'Bunkerknacker',    type: 'ground', at: 200, w: 4.5, tries: 3, bonus: { gold: 0.20 }, desc: 'Lande genau auf dem Bunker – 3 Versuche.' },
    // Höhen-Challenges: Ziele auf dem Boden ('ground'), auf Podesten ('post') und auf Aufzügen ('lift', fährt von unten nach oben)
    hz('hoehen', 0, 'Höhenparcours', [[0.4, 0, 'ground'], [0.58, 0.2, 'post'], [0.72, 0.03, 'lift', 0.17]], 0.03, 6, { gold: 0.10 }, 'Drei Ziele: eins am Boden, eins auf einem Podest, eins fährt auf und ab. 6 Schüsse.'),
    hz('stufen', 2, 'Stufenziele', [[0.35, 0, 'ground'], [0.5, 0.15, 'post'], [0.65, 0.25, 'post'], [0.8, 0.02, 'lift', 0.12]], 0.028, 7, { dmg: 0.10 }, 'Vier Ziele auf verschiedenen Höhen, das letzte auf einem Aufzug. 7 Schüsse.'),
    hz('aufzug', 4, 'Aufzugturm', [[0.45, 0.05, 'lift', 0.35], [0.62, 0.3, 'post'], [0.78, 0.02, 'lift', 0.18], [0.9, 0, 'ground']], 0.025, 7, { dmg: 0.15 }, 'Zwei Aufzüge, ein hohes Podest und ein Bodenziel. 7 Schüsse.'),
    hz('daecher', 7, 'Dächerjagd', [[0.4, 0.1, 'post'], [0.55, 0.28, 'post'], [0.7, 0.2, 'post'], [0.85, 0.02, 'lift', 0.1]], 0.022, 7, { gold: 0.20 }, 'Ziele auf Dächern verschiedener Höhe, eins auf einem Lastenaufzug. 7 Schüsse.'),
    { id: 'satellit', minAge: 8, name: 'Satellitenjagd',   type: 'fly', targets: [[500, 160], [620, 110], [700, 190], [780, 80]], r: 14, move: 0.06, tries: 6, bonus: { dmg: 0.25 }, desc: 'Triff 4 Satelliten mit 6 Schüssen.' },
  ];
  // Challenge passend zum aktuellen Zeitalter: in späteren Zeitaltern wird alles mitskaliert, damit sie spielbar bleibt
  function chalFor(s, c) {
    const k = s.age > c.minAge ? ageRange(s.age) / ageRange(c.minAge) : 1, m = x => x == null ? x : x * k;
    return Object.assign({}, c, { k, at: m(c.at), w: m(c.w), r: m(c.r), u: m(c.u), targets: c.targets && c.targets.map(t => [t[0] * k, t[1] * k, t[2], t[3] != null ? t[3] * k : null]) });
  }
  const BONUS_NAME = { dmg: 'Schaden', range: 'Reichweite', gold: 'Gold' };
  function bonusText(b) { return Object.keys(b).map(k => '+' + Math.round(b[k] * 100) + ' % ' + BONUS_NAME[k]).join(', '); }
  function chBonus(s, key) { return CHALLENGES.reduce((sum, c) => sum + (s.ch[c.id] && c.bonus[key] ? c.bonus[key] : 0), 0); }

  // ---------- Zeitsprung & Zeitwerkstatt (permanent) ----------
  // Kosten je Stufe = base × wsG^Stufe. Bewusst andere Werte als die Challenges (die geben Schaden/Gold als feste Boni).
  const WORKSHOP = [
    { id: 'ader',    br: 'Wirtschaft', icon: '💰', name: 'Goldader',          max: 10, base: 2, eff: l => '+' + pc(P.wsAder * l) + ' % Gold' },
    { id: 'haende',  br: 'Wirtschaft', icon: '👷', name: 'Fleißige Hände',    max: 8,  base: 3, eff: l => 'Arbeiter +' + pc(P.wsHaende * l) + ' % schneller' },
    { id: 'schlag',  br: 'Wirtschaft', icon: '⛏️', name: 'Kräftige Schläge',  max: 6,  base: 2, eff: l => '+' + pc(P.wsSchlag * l) + ' % Abbau pro Klick' },
    { id: 'lauf',    br: 'Kanone',     icon: '🎯', name: 'Erbstück-Lauf',     max: 10, base: 3, eff: l => '+' + pc(P.wsLauf * l) + ' % Reichweite' },
    { id: 'kugel',   br: 'Kanone',     icon: '💥', name: 'Zeitgehärtete Kugeln', max: 10, base: 3, eff: l => '+' + pc(P.wsKugel * l) + ' % Schaden' },
    { id: 'hand',    br: 'Kanone',     icon: '🟩', name: 'Ruhige Hand',       max: 5,  base: 4, eff: l => 'Grüne Zone +' + 2 * l + ' Punkte in jedem Zeitalter' },
    { id: 'stern',   br: 'Kanone',     icon: '⭐', name: 'Sternenfänger',     max: 3,  base: 4, eff: l => '+' + l + ' Sterne pro Schuss' },
    { id: 'kapital', br: 'Erbe',       icon: '🪙', name: 'Startkapital',      max: 5,  base: 3, eff: l => 'Start mit ' + startGold(l) + ' Gold' },
    { id: 'stamm',   br: 'Erbe',       icon: '🧑‍🔧', name: 'Stammarbeiter',     max: 5,  base: 6, eff: l => '+' + l + ' Arbeiter in jeder freigeschalteten Ressource' },
    { id: 'kiste',   br: 'Erbe',       icon: '🔨', name: 'Werkzeugkiste',     max: 3,  base: 6, eff: l => 'Werkzeug startet auf Stufe ' + (1 + l) },
    { id: 'plaene',  br: 'Erbe',       icon: '📜', name: 'Alte Pläne',        max: 6,  base: 5, eff: l => 'Kanonen-Upgrades −' + pc(P.wsPlaene * l) + ' % Kosten' },
    { id: 'linse',   br: 'Zeit',       icon: '🔮', name: 'Splitterlinse',     max: 10, base: 5, eff: l => '+' + pc(P.wsLinse * l) + ' % Zeitsplitter' },
    { id: 'naechte', br: 'Zeit',       icon: '🌙', name: 'Lange Nächte',      max: 4,  base: 4, eff: l => 'Offline-Limit ' + (8 + 4 * l) + ' h' },
    { id: 'blick',   br: 'Zeit',       icon: '🔭', name: 'Weitblick',         max: 4,  base: 3, eff: l => 'Flugbahn-Vorschau +' + 5 * l + ' %' },
  ];
  function pc(x) { return Math.round(x * 100); }
  function startGold(l) { return l ? Math.round(30 * Math.pow(3, l - 1)) : 0; }
  function newMeta() { return { sp: 0, earned: 0, jumps: 0, upg: {}, winBonus: false, bestRun: 0, skins: {} }; }
  const W = (s, id) => (s && s.meta && s.meta.upg[id]) || 0;
  function wsCost(s, w) { return Math.round(w.base * Math.pow(P.wsG, W(s, w.id))); }
  function wsList(s) { return WORKSHOP.map(w => { const lv = W(s, w.id); return { w, lv, maxed: lv >= w.max, cost: lv >= w.max ? 0 : wsCost(s, w), now: lv ? w.eff(lv) : '–', next: lv < w.max ? w.eff(lv + 1) : null }; }); }
  function wsBuy(s, id) {
    const w = WORKSHOP.find(x => x.id === id); if (!w) return false;
    const lv = W(s, id), c = wsCost(s, w);
    if (lv >= w.max || s.meta.sp < c) return false;
    s.meta.sp -= c; s.meta.upg[id] = lv + 1;
    if (id === 'kiste') s.res.forEach(r => { r.tool = Math.max(r.tool, 1 + lv + 1); }); // gilt sofort
    if (id === 'kapital' && s.age === 0 && s.shots === 0) s.gold += startGold(lv + 1) - startGold(lv); // direkt nach dem Sprung gilt es sofort
    return true;
  }
  // Zeitsplitter, die ein Sprung jetzt bringen würde
  function splitterFor(s, km) {
    if (km < P.spMin) return 0;
    return Math.floor(P.spK * Math.pow(km, P.spExp) * (1 + P.wsLinse * W(s, 'linse')));
  }
  function jumpPreview(s) {
    const km = s.runRec || 0, n = splitterFor(s, km);
    const win = km >= P.goal && !s.meta.winBonus ? P.spWin : 0;
    // nächster Splitter: kleinste Distanz, ab der es einen mehr gibt
    const f = 1 + P.wsLinse * W(s, 'linse'), nextKm = km < P.spMin ? P.spMin : Math.pow((n + 1) / (P.spK * f), 1 / P.spExp);
    return { km, n: n + win, base: n, win, nextKm, can: km >= P.spMin };
  }
  const jumpUnlocked = s => s.meta.jumps > 0 || (s.runRec || 0) >= P.spMin;
  // Zeitsprung: neuer Lauf in der Steinzeit, Meta-Daten bleiben
  function rebirth(s) {
    const pv = jumpPreview(s);
    if (!pv.can) return null;
    const m = s.meta;
    m.sp += pv.n; m.earned += pv.n; m.jumps++; m.bestRun = Math.max(m.bestRun, pv.km);
    if (pv.win) m.winBonus = true;
    const n = newState(m);
    ['name', 'ch', 'st', 'record', 'won', 'angle', 'power'].forEach(k => { if (s[k] !== undefined) n[k] = s[k]; });
    return { s: n, got: pv.n, km: pv.km };
  }

  // ---------- Zustand ----------
  function newState(meta) {
    const s = {
      v: 2, gold: 0, age: 0, won: false, shots: 0, record: 0, runRec: 0, angle: 45, power: 100, meta: meta || newMeta(),
      lv: { kraft: 0, wucht: 0, ziel: 0, gluck: 0 },   // Stufen gesamt
      cur: { kraft: 0, wucht: 0, ziel: 0, gluck: 0 },  // Stufen im aktuellen Zeitalter
      mats: {}, res: [], oh: OBS.map(o => o.parts.map(p => p.hp)), ch: {}, t: Date.now(),
    };
    MATS.forEach(m => { s.mats[m.id] = 0; s.res.push({ tool: 1 + W(s, 'kiste'), wk: 0, p: 0 }); });
    s.gold = startGold(W(s, 'kapital'));
    return s;
  }
  // Ältere Spielstände ohne Zeitsprung-Daten ergänzen
  function migrate(s) {
    if (!s.meta) s.meta = newMeta();
    if (!s.meta.skins) s.meta.skins = {};
    if (s.runRec == null) s.runRec = s.record || 0;
    return s;
  }

  function stats(s) {
    const lv = s.lv;
    return {
      range: P.r0 * Math.pow(P.kraftF, lv.kraft) * Math.pow(P.ageR, s.age) * (1 + chBonus(s, 'range')) * (1 + P.wsLauf * W(s, 'lauf')),
      dmg: P.d0 * Math.pow(P.wuchtF, lv.wucht) * Math.pow(P.ageD, s.age) * (1 + chBonus(s, 'dmg')) * (1 + P.wsKugel * W(s, 'kugel')),
      // Zielhilfe zählt nur im aktuellen Zeitalter: grüne Zone und Vorschau starten jedes Zeitalter klein
      zone: 0.10 + 0.06 * s.cur.ziel + 0.02 * W(s, 'hand'), // Anteil der grünen Zone an der Leiste
      preview: 0.35 + 0.1 * s.cur.ziel + 0.05 * W(s, 'blick'),                  // Anteil der Flugbahn, der vorher gezeigt wird
      chalPreview: 0.3,                                   // in Challenges fest und kürzer
      barSpeed: 0.9,
      goldMult: Math.pow(P.gluckF, lv.gluck) * (1 + chBonus(s, 'gold')) * (1 + P.wsAder * W(s, 'ader')),
      stars: 3 + Math.floor(lv.gluck / 4) + W(s, 'stern'),
      bird: 1 + P.wsVogel * W(s, 'vogel'),             // Stärke des Vogel-Schubs
      // getrennt ausgewiesen: Challenge-Boni und Zeitwerkstatt
      chRange: 1 + chBonus(s, 'range'), chDmg: 1 + chBonus(s, 'dmg'), chGold: 1 + chBonus(s, 'gold'),
      wsRange: 1 + P.wsLauf * W(s, 'lauf'), wsDmg: 1 + P.wsKugel * W(s, 'kugel'), wsGold: 1 + P.wsAder * W(s, 'ader'),
    };
  }

  // Position 0..1 auf der Leiste -> Geschwindigkeitsfaktor q (Reichweite ~ q²) und Kritisch
  function quality(pos, zone) {
    const c = Math.abs(pos - 0.5) * 2, z = zone;
    if (c <= z * 0.3) return { q: 1, crit: true, grade: 'Perfekt! Kritisch' };
    if (c <= z) return { q: 1, crit: false, grade: 'Sehr gut' };
    if (c <= z + 0.3) return { q: 1 - 0.05 * (c - z) / 0.3, crit: false, grade: 'Gut' };
    return { q: 0.95 - 0.2 * (c - z - 0.3) / Math.max(0.01, 0.7 - z), crit: false, grade: 'Schwach' };
  }

  function shotGold(s, d) {
    return Math.max(1, Math.round(P.g0 * Math.pow(Math.max(0, d) * 10, P.gExp) * stats(s).goldMult));
  }

  // Sichtbarkeit: 'done' zerstört · 'active' aktuelles Zeitalter · 'locked' erstes des nächsten (sichtbar, unverwundbar) · 'outline' nur Umriss
  function obsDone(s, id) { return s.oh[id].every(h => h <= 0); }
  function obsState(s, id) {
    const o = OBS[id];
    if (obsDone(s, id)) return 'done';
    if (o.age <= s.age) return 'active';
    if (o.age === s.age + 1 && o.k === 0) return 'locked';
    return 'outline';
  }
  function nextBlocking(s) { for (const o of OBS) if (!obsDone(s, o.id)) return o; return null; }
  function ageObstaclesDone(s) { return OBS.filter(o => o.age === s.age).every(o => obsDone(s, o.id)); }

  // ---------- Upgrades ----------
  function upgCost(a, li, step, s) {
    const idx = li + 4 * step, disc = 1 - P.wsPlaene * W(s, 'plaene');
    const gold = Math.round(P.c0 * Math.pow(P.cAge, a) * (1 + P.cStep * idx) * disc);
    const n = Math.max(1, Math.round(P.n0 * Math.pow(P.nAge, a) * (1 + P.nStep * idx) * disc));
    const mats = {};
    mats[MATS[a].id] = Math.ceil(n * 0.6);
    mats[MATS[a + 1].id] = n;
    return { gold, mats };
  }

  function upgList(s) {
    const a = s.age, out = [];
    for (let step = 0; step < P.steps; step++) {
      LINES.forEach((L, li) => {
        const have = s.cur[L.id];
        out.push({ key: L.id + ':' + step, line: L, li, step, name: AGES[a].items[li] + ' ' + ['I', 'II', 'III', 'IV'][step],
          cost: upgCost(a, li, step, s), bought: have > step, locked: have < step });
      });
    }
    return out;
  }

  function canAfford(s, cost) {
    if (s.gold < cost.gold) return false;
    for (const k in cost.mats) if ((s.mats[k] || 0) < cost.mats[k]) return false;
    return true;
  }
  const upgradesDone = s => LINES.every(L => s.cur[L.id] >= P.steps);
  const canAgeUp = s => s.age < AGES.length - 1 && upgradesDone(s) && ageObstaclesDone(s);

  function buy(s, key) {
    const u = upgList(s).find(x => x.key === key);
    if (!u || u.bought || u.locked || !canAfford(s, u.cost)) return null;
    s.gold -= u.cost.gold;
    for (const k in u.cost.mats) s.mats[k] -= u.cost.mats[k];
    s.cur[u.line.id]++; s.lv[u.line.id]++;
    return u;
  }

  function ageUp(s) {
    if (!canAgeUp(s)) return false;
    s.age++;
    LINES.forEach(L => { s.cur[L.id] = 0; });
    return true;
  }

  // ---------- Ressourcen ----------
  function resInfo(s, i) {
    const mt = MATS[i], r = s.res[i], k = Math.pow(P.rAge, mt.age);
    return {
      mat: mt, st: r, available: s.age >= mt.age,
      yield: r.tool, workers: workers(s, i),
      perMin: workers(s, i) * workSpeed(s) * 60 / P.cycle * r.tool,
      toolCost: Math.round(P.toolC * k * Math.pow(P.toolG, r.tool - 1)),
      workCost: Math.round(P.workC * k * Math.pow(P.workG, r.wk)),
    };
  }
  const workers = (s, i) => s.res[i].wk + (s.age >= MATS[i].age ? W(s, 'stamm') : 0);
  const workSpeed = s => 1 + P.wsHaende * W(s, 'haende');
  function addProgress(s, i, amount) {
    const r = s.res[i];
    r.p += amount;
    if (r.p < 1) return 0;
    const n = Math.floor(r.p);
    r.p -= n;
    s.mats[MATS[i].id] += n * r.tool;
    return n * r.tool;
  }
  const tapPower = s => P.tap * Math.pow(P.tapF, s.age) * (1 + P.wsSchlag * W(s, 'schlag'));
  function tap(s, i) { return resInfo(s, i).available ? addProgress(s, i, tapPower(s)) : 0; }
  function resAction(s, i, act) {
    const inf = resInfo(s, i), r = s.res[i];
    if (!inf.available) return false;
    if (act === 'tool' && s.gold >= inf.toolCost) { s.gold -= inf.toolCost; r.tool++; return true; }
    if (act === 'worker' && s.gold >= inf.workCost) { s.gold -= inf.workCost; r.wk++; return true; }
    return false;
  }
  // Tausch: alte, nicht mehr benötigte Ressourcen gegen die aktuell gebrauchten (Kurs nach Zeitalter, 50 % Gebühr)
  const neededMats = s => [MATS[s.age].id, MATS[Math.min(MATS.length - 1, s.age + 1)].id];
  const canTrade = (s, i) => s.age >= MATS[i].age && !neededMats(s).includes(MATS[i].id);
  function tradeRate(i, j) { return 2 * Math.pow(P.nAge, MATS[j].age - MATS[i].age); } // so viele von i für 1 von j
  function trade(s, i, j) {
    if (!canTrade(s, i) || !neededMats(s).includes(MATS[j].id)) return 0;
    const rate = tradeRate(i, j), have = s.mats[MATS[i].id], n = Math.floor(have / rate);
    if (n < 1) return 0;
    s.mats[MATS[i].id] -= Math.ceil(n * rate); s.mats[MATS[j].id] += n;
    return n;
  }
  function tickRes(s, dt) {
    const got = {};
    const sp = workSpeed(s);
    s.res.forEach((r, i) => { const wk = workers(s, i); if (wk > 0 && s.age >= MATS[i].age) { const n = addProgress(s, i, wk * sp * dt / P.cycle); if (n) got[MATS[i].id] = n; } });
    return got;
  }
  function offline(s, now) {
    const dt = Math.min(P.offlineCap + 4 * 3600 * W(s, 'naechte'), Math.max(0, (now - (s.t || now)) / 1000));
    s.t = now;
    return dt > 5 ? { dt, got: tickRes(s, dt) } : null;
  }

  // ---------- Format ----------
  const nf = (n, dig) => n.toLocaleString('de-DE', { minimumFractionDigits: dig, maximumFractionDigits: dig });
  function fmtKm(d) {
    if (d < 0.1) return nf(d * 1000, 0) + ' m';
    if (d < 1) return nf(d, 2) + ' km';
    if (d < 10) return nf(d, 1) + ' km';
    return nf(Math.round(d), 0) + ' km';
  }
  function fmtNum(n) {
    n = Math.floor(n);
    if (n < 100000) return nf(n, 0);
    if (n < 1e6) return nf(n / 1e3, 0) + ' Tsd.';
    if (n < 1e9) return nf(n / 1e6, n < 1e7 ? 2 : 1) + ' Mio.';
    return nf(n / 1e9, 2) + ' Mrd.';
  }

  root.JS = { WORKSHOP, wsList, wsBuy, wsCost, splitterFor, jumpPreview, jumpUnlocked, rebirth, migrate, newMeta, startGold, workers, P, LINES, AGES, MATS, OBS, CHALLENGES, newState, stats, quality, shotGold, obsState, obsDone, nextBlocking, ageObstaclesDone,
    upgCost, upgList, canAfford, buy, tapPower, upgradesDone, canAgeUp, ageUp, resInfo, tap, resAction, tickRes, canTrade, tradeRate, trade, neededMats, offline, bonusText, chBonus, chalFor, ageRange, partLevel, partPos, fmtKm, fmtNum };
})(typeof window !== 'undefined' ? window : globalThis);
