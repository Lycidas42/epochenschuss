// Epochenschuss – Steuerung: Zustand, Bedienung, Schuss-Ablauf, Ereignisse, Challenges, Speichern, Spielschleife
(function () {
  'use strict';
  const J = window.JS;
  const $ = q => document.querySelector(q);
  const SAVE = 'jushoot-v2', SCORES = 'jushoot-scores';
  const VERSION = '0.7.4'; // gleich halten mit VERSION in sw.js, wird im Menü angezeigt
  const G = 9.81e-3; // km/s²

  // ---------- Speichern ----------
  function store(key, val) { try { if (val === undefined) return JSON.parse(localStorage.getItem(key) || 'null'); localStorage.setItem(key, JSON.stringify(val)); } catch (e) { return null; } return null; }
  function load() { const s = store(SAVE); return s && s.v === 2 ? J.migrate(s) : null; }
  function save() { s.t = Date.now(); store(SAVE, s); updateScore(); }

  let s = null;
  s = load() || fresh();
  function fresh(name) { const n = J.newState(); n.name = name || (s && s.name) || ''; n.st = { perfect: 0, parts: 0, ups: 0 }; return n; }
  s.st = s.st || { perfect: 0, parts: 0, ups: 0 };
  let sound = store('jushoot-sound') !== false;
  // Entwickler-Version überall außer auf der öffentlichen Seite (github.io): lokal, Claude-Vorschau, Einzeldatei
  const DEV = !/\.github\.io$/i.test(location.hostname);
  // Entwickler-Schalter, bleiben auf dem Gerät gespeichert (öffentlich immer aus)
  const dev = Object.assign({ hitbox: false, fullPreview: false, autoPerfect: false, slowmo: false, info: false, noEvents: false }, DEV ? store('jushoot-dev') || {} : {});
  const away = J.offline(s, Date.now());

  // ---------- Ton (WebAudio, ohne Dateien) ----------
  let ac = null;
  function sfx(type) {
    if (!sound) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
      o.connect(g); g.connect(ac.destination);
      const set = {
        fire: ['sawtooth', 160, 50, 0.25, 0.25], star: ['sine', 880, 1320, 0.12, 0.15], hit: ['square', 120, 60, 0.18, 0.2],
        buy: ['triangle', 520, 780, 0.15, 0.15], land: ['sine', 220, 110, 0.15, 0.2], perfect: ['triangle', 660, 990, 0.2, 0.2],
        up: ['triangle', 330, 990, 0.5, 0.2], boost: ['sine', 300, 700, 0.15, 0.15], click: ['sine', 600, 600, 0.04, 0.08],
        bad: ['sawtooth', 200, 90, 0.25, 0.15], tap: ['triangle', 420, 380, 0.05, 0.1],
      }[type];
      o.type = set[0]; o.frequency.setValueAtTime(set[1], t); o.frequency.exponentialRampToValueAtTime(set[2], t + set[3]);
      g.gain.setValueAtTime(set[4], t); g.gain.exponentialRampToValueAtTime(0.001, t + set[3]);
      o.start(t); o.stop(t + set[3] + 0.02);
    } catch (e) { /* kein Ton */ }
  }

  // ---------- Szene ----------
  const canvas = $('#stage');
  const R = makeRenderer(canvas, J);
  const view = {
    W: 0, H: 0, x0: 60, groundY: 200, scale: 1000, age: s.age, angle: s.angle, phase: 'idle', time: 0, dt: 0, cur: s.cur,
    playerX: 0, pose: 'idle', recoil: 0, flash: 0, ball: null, trail: [], stars: [], flyers: [], obstacles: [], parts: [], texts: [],
    record: s.runRec, lastLand: null, bar: null, preview: [], event: null, chal: null,
    debris: [], ghosts: [], trailA: 1, shake: 0, intro: null, ageFx: null,
  };
  let phase = 'idle', phaseT = 0, shot = null, targetScale = null, zoom = 1, chal = null;
  const hitMap = {}, obsYs = {}; // Treffer-Wackeln und geglättete Standhöhen (Fall-Animation) je Hindernis-Teil

  function layout() {
    const sz = R.resize();
    view.W = sz.W; view.H = sz.H;
    view.groundY = Math.round(sz.H - Math.max(34, sz.H * 0.13));
    view.x0 = Math.round(Math.max(64, Math.min(110, sz.W * 0.12)));
    view.playerX = shootX(); // der Schütze bleibt an der Kanone stehen
  }
  const shootX = () => view.x0 - 30;
  // Schütze während des Zeitsprungs: läuft zur Rakete, klettert die Leiter hoch, verschwindet darin
  function jumpPlayer() {
    view.playerY = 0; view.hidePlayer = false; view.playerX = shootX();
    const r = view.rocket; if (!r) return;
    const t = r.t, tx = r.rx - 16;
    if (t > JT.door) view.playerX = shootX() + (tx - shootX()) * Math.min(1, (t - JT.door) / (JT.walk - JT.door));
    if (t > JT.walk) { view.playerX = tx + 4; view.playerY = Math.min(1, (t - JT.walk) / (JT.climb - JT.walk)) * 52; }
    view.hidePlayer = t > JT.climb;
    view.walking = t > JT.door && t < JT.climb;
  }
  const rad = d => d * Math.PI / 180;

  function syncObstacles() {
    const blk = J.nextBlocking(s);
    let firstOutline = true;
    view.obstacles = J.OBS.map(o => {
      const state = J.obsState(s, o.id);
      if (!obsYs[o.id]) obsYs[o.id] = o.parts.map((p, i) => J.partLevel(o, s.oh[o.id], i));
      const r = { o, state, hp: s.oh[o.id], hit: hitMap[o.id] = hitMap[o.id] || [], ys: obsYs[o.id], blocking: !!blk && blk.id === o.id, firstOutline: false };
      if (state === 'outline' && firstOutline) { r.firstOutline = true; firstOutline = false; }
      return r;
    });
  }

  function fitScale(xMax, yMax) {
    return Math.min((view.W - view.x0 - 36) / Math.max(1e-5, xMax), (view.groundY - 70) / Math.max(1e-5, yMax));
  }
  const vel = (power, q) => Math.sqrt(J.stats(s).range * G) * power / 100 * (q || 1);

  // Automatische Ansicht vor dem Schuss: Flugweite, Sterne, Ereignis und das blockierende Hindernis
  function autoScale() {
    if (chal) {
      const c = chal.c; let xm = 0, ym = 0;
      if (c.type === 'ground') { xm = c.at * (1 + (c.move || 0)) * 1.2; ym = c.at * 0.3; }
      else if (c.type === 'tower') { xm = chal.tower.end * 1.25; ym = Math.max(chal.tower.top * 1.5, xm * 0.25); }
      else c.targets.forEach(t => { xm = Math.max(xm, t[0] * (1 + (c.move || 0)) * 1.15); ym = Math.max(ym, Math.max(t[1], t[3] || 0) * 1.35); });
      return fitScale(xm, ym);
    }
    const st = J.stats(s), v = vel(s.power), a = rad(s.angle);
    const d = v * v * Math.sin(2 * a) / G, apex = v * v * Math.sin(a) ** 2 / (2 * G);
    let xMax = Math.max(d * 1.1, st.range * 0.5), yMax = Math.max(apex * 1.2, st.range * 0.12);
    const blk = J.nextBlocking(s);
    if (blk && blk.at < st.range * 2.2) { xMax = Math.max(xMax, blk.end * 1.12); yMax = Math.max(yMax, blk.top * 1.4); }
    view.stars.forEach(t => { xMax = Math.max(xMax, t.x * 1.08); yMax = Math.max(yMax, t.y * 1.15); });
    const e = view.event;
    if (e && e.type === 'bird' && !e.got) { xMax = Math.max(xMax, e.cx * 1.15); yMax = Math.max(yMax, e.cy * 1.35); }
    if (e && e.type === 'bonusAir') { xMax = Math.max(xMax, e.x * 1.1); yMax = Math.max(yMax, e.y * 1.3); }
    if (e && (e.type === 'bonusGround' || e.type === 'mole' || e.type === 'plant')) xMax = Math.max(xMax, e.at * 1.1);
    if (e && e.type === 'plant') yMax = Math.max(yMax, e.h * 1.6);
    return fitScale(xMax, yMax);
  }
  function zoomLimits() { const a = autoScale(); return [0.6, Math.max(1, a / fitScale(J.P.goal * 1.1, J.P.goal * 0.3))]; }
  function setZoom(z) { const [lo, hi] = zoomLimits(); zoom = Math.max(lo, Math.min(hi, z)); }

  // Flugbahn-Vorschau ab der Mündung (ohne Wind), Länge = Anteil der Flugzeit
  function computePreview() {
    view.preview = [];
    if (phase === 'flight' || phase === 'land' || (view.event && view.event.type === 'fog')) return;
    const st = J.stats(s), v0 = vel(s.power), a = rad(s.angle), m = R.muzzle(s.age, s.angle, s.cur), sc = view.scale;
    const x0 = m.x / sc, y0 = -m.y / sc, vx = v0 * Math.cos(a), vy = v0 * Math.sin(a);
    const T = (vy + Math.sqrt(vy * vy + 2 * G * Math.max(0, y0))) / G, tEnd = T * (dev.fullPreview ? 1 : chal ? st.chalPreview : st.preview); // nur das Anfangsstück, in Challenges kürzer
    const nP = dev.fullPreview ? 40 : 18;
    for (let i = 1; i <= nP; i++) { const t = tEnd * i / nP, y = y0 + vy * t - G * t * t / 2; if (y < 0) break; view.preview.push([x0 + vx * t, y]); }
  }

  function reachNow() { const v = vel(s.power), a = rad(s.angle); return v * v * Math.sin(2 * a) / G; }

  function spawnStars() {
    view.stars = [];
    if (chal) return;
    const st = J.stats(s), lim = st.range * 1.05;
    const n = st.stars * (view.event && view.event.type === 'stars' ? 2 : 1);
    for (let i = 0; i < n; i++) {
      const x = lim * (0.2 + 0.75 * Math.random());
      view.stars.push({ x, y: st.range * (0.03 + 0.3 * Math.random()) * Math.min(1, x / (st.range * 0.5)), got: false });
    }
  }

  // ---------- Ereignisse (halten mehrere Schüsse an) ----------
  const EVENTS = [
    { type: 'wind',        w: 3, good: null,  icon: '💨', name: 'Wind' },
    { type: 'storm',       w: 2, good: false, icon: '⛈️', name: 'Gewitter',     desc: 'Wolken bremsen die Kugel' },
    { type: 'rain',        w: 2, good: false, icon: '🌧️', name: 'Regen',        desc: 'Kugel wird langsamer' },
    { type: 'heavy',       w: 1, good: false, icon: '⬇️', name: 'Fallwind',     desc: 'Kugel sinkt schneller' },
    { type: 'fog',         w: 2, good: false, icon: '🌫️', name: 'Nebel',        desc: 'keine Flugbahn-Vorschau' },
    { type: 'bonusGround', w: 2, good: true,  icon: '💰', name: 'Schatzkiste',  desc: 'dort landen = Bonus-Gold' },
    { type: 'bonusAir',    w: 2, good: true,  icon: '🎈', name: 'Goldballon',   desc: 'treffen = Bonus-Gold' },
    { type: 'stars',       w: 2, good: true,  icon: '✨', name: 'Sternenregen', desc: 'doppelt so viele Sterne' },
    { type: 'mole',        w: 2, good: true,  icon: '🐾', name: 'Maulwurf',     desc: 'stößt gelandete Kugeln wieder hoch' },
    { type: 'plant',       w: 2, good: false, icon: '🌿', name: 'Schnapppflanze', desc: 'fängt tief fliegende Kugeln' },
    { type: 'bird',        w: 3, good: true,  icon: '🐦', name: 'Schubvogel',   desc: 'kreist am Himmel: treffen = Mega-Schub' },
  ];
  let eventCool = 0;
  function spawnEvent(force) {
    view.event = null;
    if (chal) return;
    let ev = EVENTS.find(e => e.type === force);
    if (!ev) {
      if (dev.noEvents || chal || s.shots < 3 || eventCool > 0 || Math.random() > 0.35) { eventCool = Math.max(0, eventCool - 1); return; }
      const luck = 1 + 0.5 * J.W(s, 'glueck'), wt = e => e.w * (e.good ? luck : 1); // Glückskind: gute Ereignisse häufiger
      const tot = EVENTS.reduce((a, e) => a + wt(e), 0);
      let r = Math.random() * tot; ev = EVENTS[0];
      for (const e of EVENTS) { r -= wt(e); if (r <= 0) { ev = e; break; } }
    }
    const st = J.stats(s), lim = st.range;
    const shots = 3 + Math.floor(Math.random() * 3);
    const e = { type: ev.type, icon: ev.icon, name: ev.name, desc: ev.desc, good: ev.good, left: shots, total: shots };
    if (ev.type === 'wind') {
      const k = (0.06 + Math.random() * 0.14) * (Math.random() < 0.5 ? -1 : 1);
      e.wind = k * G; e.good = k > 0; e.name = (k > 0 ? 'Rückenwind' : 'Gegenwind') + (Math.abs(k) > 0.14 ? ' (stark)' : '');
      e.desc = k > 0 ? 'Kugel fliegt weiter →' : 'Kugel wird abgebremst ←';
    } else if (ev.type === 'storm') {
      e.clouds = Array.from({ length: 1 + Math.floor(Math.random() * 2) }, () => { const x = lim * (0.3 + 0.5 * Math.random()); return { x, y: lim * (0.12 + 0.18 * Math.random()), r: lim * 0.07, hit: false }; });
    } else if (ev.type === 'bonusGround') {
      e.at = lim * (0.35 + 0.6 * Math.random()); e.w = e.at * 0.035;
    } else if (ev.type === 'mole') {
      e.at = lim * (0.4 + 0.45 * Math.random()); e.w = lim * 0.045; e.pop = 0;
    } else if (ev.type === 'plant') {
      e.at = lim * (0.5 + 0.38 * Math.random()); e.h = lim * 0.07; e.r = lim * 0.035; e.snap = 0;
    } else if (ev.type === 'bonusAir') {
      e.x = lim * (0.3 + 0.6 * Math.random()); e.y = st.range * (0.06 + 0.22 * Math.random()); e.r = e.x * 0.035;
    } else if (ev.type === 'bird') { // Vogel als seltenes Ereignis (Nico): kreist schon vor dem Schuss sichtbar an fester Stelle
      e.cx = lim * (0.22 + 0.4 * Math.random()); e.cy = lim * (0.07 + 0.16 * Math.random()); e.rad = lim * 0.018;
      e.fly = { x: e.cx, y: e.cy, vx: 1, type: s.age, ph: Math.random() * 6, hit: false, big: true, hover: true };
    }
    e.label = e.icon + ' ' + e.name;
    view.event = e; view.intro = { e, t: 0 };
  }
  // Nach jedem Schuss: Ereignis zählt herunter, eingesammelte Boni enden sofort
  function advanceEvent() {
    const e = view.event;
    if (!e) return spawnEvent();
    e.left--;
    if (e.left <= 0 || e.got) { view.event = null; eventCool = 1; toast(e.icon + ' ' + e.name + ' ist vorbei'); return; }
    if (e.clouds) e.clouds.forEach(cl => { cl.hit = false; });
    e.ate = 0;
  }

  // ---------- Schuss-Ablauf ----------
  function onFire() {
    if (phase === 'idle') { view.lastLand = null; view.trail = []; sfx('click'); startAim(); }
    else if (phase === 'aim') release();
  }

  function startAim() {
    phase = 'aim'; phaseT = 0; view.pose = 'aim';
    // Startpunkt und Richtung zufällig, aber nie direkt im grünen Bereich
    const zone = J.stats(s).zone; let t0, p0;
    do { t0 = Math.random() * 2; p0 = t0 < 1 ? t0 : 2 - t0; } while (Math.abs(p0 - 0.5) * 2 < zone + 0.15);
    view.bar = { pos: p0, zone, t: t0 };
    updateFire();
  }

  function release() {
    const st = J.stats(s), qq = J.quality(dev.autoPerfect ? 0.5 : view.bar.pos, st.zone);
    view.bar = null;
    sfx(qq.crit ? 'perfect' : 'fire');
    if (qq.crit) s.st.perfect++;
    const ammo = J.takeAmmo(s);
    const a = rad(s.angle), v0 = vel(s.power, qq.q) * (ammo === 'pfeil' ? Math.sqrt(0.85) : 1);
    const Rq = v0 * v0 / G;
    const tRef = 2 * v0 * Math.SQRT1_2 / G, tTarget = 1.7 + 0.45 * Math.log10(1 + Rq * 10);
    const m = R.muzzle(s.age, s.angle, s.cur), sc = view.scale, e = view.event || {};
    shot = { inChal: !!chal, ammo, pierced: [], bounces: 0, q: qq.q, crit: qq.crit, v0, ts: tRef / tTarget, starGold: 0, birdGold: 0, bonus: 0, blocked: null,
      predD: Rq * Math.sin(2 * a), predApex: Rq * Math.sin(a) ** 2 / 2,
      g: G * (e.type === 'heavy' ? 1.3 : 1), wind: e.wind || 0, drag: e.type === 'rain' ? 0.5 / tRef : 0 };
    view.ball = { x: m.x / sc, y: -m.y / sc, vx: v0 * Math.cos(a), vy: v0 * Math.sin(a), ammo };
    if (ammo !== 'kugel') renderAmmoBar();
    view.trail = [[view.ball.x, view.ball.y]]; view.trailA = 1; view.preview = [];
    view.recoil = 1; view.flash = 1; view.pose = 'fire'; view.act = 1;
    if (qq.q >= 1) { // Treffer im grünen Bereich: kurzer Effekt an der Mündung
      const mx = view.x0 + m.x, my = view.groundY + m.y;
      view.goodFx = { t: 0, crit: qq.crit, x: mx, y: my };
      for (let k = 0; k < (qq.crit ? 26 : 16); k++) { const an = Math.random() * Math.PI * 2, sp = 120 + Math.random() * 160; view.parts.push({ x: mx, y: my, vx: Math.cos(an) * sp, vy: Math.sin(an) * sp, r: 1.6 + Math.random() * 1.8, life: 0.5 + Math.random() * 0.3, col: qq.crit ? (k % 3 ? '#ffd23f' : '#fff') : (k % 3 ? '#5ee07a' : '#eaffd0'), spark: true }); }
      view.shake = Math.max(view.shake, qq.crit ? 0.25 : 0.12);
    }
    floatText(view.x0 + 10, view.groundY - 90, qq.grade, qq.crit ? '#ffd23f' : qq.q >= 1 ? '#5ee07a' : qq.q > 0.9 ? '#ffd23f' : '#ff8a7a', 18);
    view.flyers = birdFlyers(); // Vogel nur noch als Ereignis „Schubvogel“
    phase = 'flight'; phaseT = 0; updateFire();
  }

  const toScreen = (x, y) => [view.x0 + x * view.scale, view.groundY - y * view.scale];
  const dist2px = (ax, ay, bx, by) => { const [x1, y1] = toScreen(ax, ay), [x2, y2] = toScreen(bx, by); return Math.hypot(x1 - x2, y1 - y2); };

  function block(b, at, msg) {
    shot.blocked = at; b.x = at - 1e-6; b.vx = -Math.abs(b.vx) * 0.06; b.vy = Math.min(b.vy, 0) * 0.3;
    if (msg) floatText(Math.min(view.W - 80, toScreen(at, 0)[0]), view.groundY - 120, msg, '#ffb3aa', 14);
    sfx('bad');
  }

  // Schaden des aktuellen Schusses (Kritisch, Pfeil ×3)
  function shotDmg() { const st = J.stats(s); return st.dmg * (shot.crit ? st.crit : 1) * (shot.ammo === 'pfeil' ? 3 : 1); }
  // Bohrkugel: durchschlägt bis zu 3 Teile, ohne abzuprallen
  function pierce(key) { if (shot.ammo !== 'bohrer' || shot.pierced.length >= 3) return false; shot.pierced.push(key); return true; }
  // Die Kugel fliegt frei über Hindernisse – nur wer ein Teil trifft, macht Schaden
  function checkObstacles(b) {
    const br = 5 / view.scale;
    for (const ob of view.obstacles) {
      const o = ob.o;
      if (ob.state === 'done' || ob.state === 'outline') continue;
      if (b.x < o.at - o.u * 1.5 || b.x > o.end + o.u) continue;
      const hp = s.oh[o.id];
      for (let i = 0; i < o.parts.length; i++) {
        if (hp[i] <= 0 || shot.pierced.includes(o.id + ':' + i)) continue;
        const p = o.parts[i], q = J.partPos(o, i, view.time, ob.ys);
        if (b.x + br < q.x || b.x - br > q.x + p.w || b.y + br < q.y || b.y - br > q.y + p.h) continue;
        if (ob.state === 'locked') { block(b, q.x, '🔒 Erst ab ' + J.AGES[o.age].name); return; }
        if (shot.ammo === 'spreng') { block(b, q.x, '💣 Abgeprallt, kein Schaden'); return; } // Sprengkugel prallt ab, macht aber keinen Schaden (Nico)
        const dmg = shotDmg();
        hp[i] = Math.max(0, hp[i] - dmg);
        ob.hit[i] = 1;
        const [sx, sy] = toScreen(b.x, b.y);
        burst(sx, sy, '#ffb347', 12); sfx('hit');
        floatText(sx, sy - 24, (shot.crit ? 'Kritisch −' : '−') + J.fmtNum(Math.ceil(dmg)), '#ff8a7a', 15);
        if (hp[i] <= 0) {
          destroyFx(o, i, q);
          const g = J.P.partGold * J.shotGold(s, o.at); shot.bonus += g; s.st.parts++;
          floatText(sx, sy - 44, 'Teil zerstört! +' + J.fmtNum(g) + ' Gold', '#ffd23f', 15);
          if (J.obsDone(s, o.id)) {
            const g2 = J.P.obsGold * J.shotGold(s, o.at); shot.bonus += g2;
            floatText(sx, sy - 66, o.name + ' zerstört! +' + J.fmtNum(g2) + ' Gold', '#ffd23f', 17);
            burst(sx, view.groundY - 10, '#8a7a6a', 24); view.shake = 0.5; sfx('up');
          }
          if (!pierce(o.id + ':' + i)) { b.vx *= 0.7; b.vy *= 0.7; }
          syncObstacles();
        } else if (pierce(o.id + ':' + i)) { b.vx *= 0.9; floatText(sx, sy - 44, 'Durchbohrt!', '#c9d4ff', 14); }
        else block(b, q.x, null);
        return;
      }
    }
  }

  // Zerstör-Animation: Teil sackt ein, Trümmer fliegen und bleiben ~10 s auf der Bahn liegen; Ballons platzen
  // Trümmer leben in Weltkoordinaten (km), damit sie beim Zoomen an ihrer Stelle bleiben.
  function destroyFx(o, i, q) {
    const p = o.parts[i], sc = view.scale, [x, y] = toScreen(q.x, q.y + p.h), w = Math.max(3, p.w * sc), h = Math.max(3, p.h * sc);
    const col = R.partColor(o.age, p.kind), G0 = 700 / sc;
    const piece = (px, py, vx, vy, pw, ph, c2, extra) => view.debris.push(Object.assign({ x: q.x + px / sc, y: q.y + p.h - py / sc, vx: vx / sc, vy: -vy / sc, g: G0, w: pw, h: ph, sc0: sc, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12, col: c2, life: 9 + Math.random() * 2, ph: Math.random() * 6 }, extra || {}));
    if (p.kind === 'balloon') { // Peng! Hülle zerreißt in Fetzen, die langsam herabflattern; der Korb fällt
      const cx = w / 2, cy = h * 0.42;
      for (let k = 0; k < 20; k++) { const an = k / 20 * Math.PI * 2; view.parts.push({ x: x + cx, y: y + cy, vx: Math.cos(an) * 260, vy: Math.sin(an) * 260, r: 2, life: 0.35, col: '#fff', spark: true }); }
      view.rings = view.rings || []; view.rings.push({ x: x + cx, y: y + cy, t: 0, col: '255,255,255' });
      floatText(x + cx, y - 10, 'PENG!', '#ffffff', 20);
      for (let k = 0; k < 9; k++) { const an = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 120; piece(cx + Math.cos(an) * w * 0.3, cy + Math.sin(an) * h * 0.3, Math.cos(an) * sp, Math.sin(an) * sp - 60, Math.max(3, w * (0.18 + Math.random() * 0.15)), Math.max(2, h * 0.12), col, { g: G0 * 0.12, flutter: true, shred: true }); }
      piece(w * 0.5, h * 0.9, 0, 0, Math.max(3, w * 0.26), Math.max(2.5, h * 0.15), '#5a3d1f', { vr: 0, rot: 0 });
      return;
    }
    view.ghosts.push({ x, y, w, h, col, kind: p.kind, t: 0 });
    const flag = p.kind === 'flag' || p.kind === 'banner';
    if (flag) { piece(w / 2, h / 2, 40, 120, Math.max(4, w * 0.8), Math.max(3, h * 0.6), col, { g: G0 * 0.3, flutter: true }); piece(0, h, -20, 60, 2, Math.max(6, h * 1.2), '#3b2b1a'); }
    else { // große Brocken + kleine Steinchen
      const nb = Math.min(8, 3 + Math.round(w * h / 400));
      for (let k = 0; k < nb; k++) { const bw = Math.max(3, w * (0.22 + Math.random() * 0.18)), bh = Math.max(3, h * (0.12 + Math.random() * 0.12)); piece(Math.random() * w, Math.random() * h, (Math.random() - 0.35) * 200, 60 + Math.random() * 200, bw, bh, col, { big: true }); }
      for (let k = 0; k < 10; k++) { const sz = 1.5 + Math.random() * 3; piece(Math.random() * w, Math.random() * h, (Math.random() - 0.3) * 300, 80 + Math.random() * 280, sz, sz * 0.8, k % 3 ? col : '#8a7a6a'); }
    }
    for (let k = 0; k < 8; k++) view.parts.push({ x: x + Math.random() * w, y: y + h, vx: (Math.random() - 0.5) * 60, vy: -20 - Math.random() * 40, r: 6 + Math.random() * 8, life: 1.1, col: 'rgba(200,190,170,0.5)', dust: true });
    if (view.debris.length > 320) view.debris.splice(0, view.debris.length - 320);
  }

  function flightStep(dt) {
    const b = view.ball;
    const steps = 12, h = dt * shot.ts / steps;
    for (let k = 0; k < steps && phase === 'flight'; k++) {
      b.vy -= shot.g * h; b.vx += shot.wind * h;
      if (shot.drag) { const f = Math.exp(-shot.drag * h); b.vx *= f; b.vy *= f; }
      b.x += b.vx * h; b.y += b.vy * h;
      if (!chal && shot.blocked == null) checkObstacles(b);
      if (chal && chal.tower && shot.blocked == null) checkChalTower(b);
      // Sterne
      view.stars.forEach(t => {
        if (t.got || dist2px(t.x, t.y, b.x, b.y) > 20) return;
        t.got = true; const g = Math.max(1, Math.round(J.shotGold(s, Math.max(shot.predD, 0.05)) * 0.25));
        shot.starGold += g; const [sx, sy] = toScreen(t.x, t.y); floatText(sx, sy - 14, '+' + J.fmtNum(g) + ' ⭐', '#ffd23f'); burst(sx, sy, '#ffe680', 10); sfx('star');
      });
      // Flieger: Schub + etwas Gold
      view.flyers.forEach(f => {
        if (f.hit || dist2px(f.x, f.y, b.x, b.y) > 32) return;
        // Kräftiger Schub: die Kugel wird nach vorn und oben geschleudert
        const bk = J.stats(s).bird;
        f.hit = true; f.boost = 1; if (view.event && view.event.fly === f) view.event.got = true; b.vx = Math.max(b.vx, 0) * (1 + 0.25 * bk) + shot.v0 * 0.08 * bk; b.vy = Math.max(0, b.vy) * 0.5 + shot.v0 * 0.42 * bk;
        const g = Math.max(1, Math.round(J.shotGold(s, Math.max(shot.predD, 0.05)) * 0.3));
        shot.birdGold += g; shot.birdHit = true; const [fx, fy] = toScreen(f.x, f.y); floatText(fx, fy - 20, 'MEGA-SCHUB! +' + J.fmtNum(g), '#7ff6ff', 19); burst(fx, fy, '#ffffff', 22); burst(fx, fy, '#7ff6ff', 16);
        view.rings = view.rings || []; view.rings.push({ x: fx, y: fy, t: 0, col: '127,246,255' }); view.shake = Math.max(view.shake, 0.3); sfx('boost'); setTimeout(() => sfx('perfect'), 90);
      });
      // Ereignisse
      const e = view.event;
      if (e && e.type === 'storm') e.clouds.forEach(cl => {
        if (cl.hit || Math.hypot(b.x - cl.x, b.y - cl.y) > Math.max(cl.r, 18 / view.scale)) return;
        cl.hit = true; b.vx *= 0.55; b.vy = Math.min(b.vy, 0) * 0.5 - shot.v0 * 0.05;
        const [sx, sy] = toScreen(cl.x, cl.y); floatText(sx, sy - 20, 'Gewitter! Kugel gebremst', '#ffb3aa', 14); sfx('bad');
      });
      if (e && e.type === 'bonusAir' && !e.got && Math.hypot(b.x - e.x, b.y - e.y) < Math.max(e.r, 10 / view.scale)) {
        e.got = true; const g = 8 * J.shotGold(s, Math.max(shot.predD, 0.05)); shot.bonus += g;
        const [sx, sy] = toScreen(e.x, e.y); floatText(sx, sy - 20, 'Goldballon! +' + J.fmtNum(g) + ' Gold', '#ffd23f', 16); burst(sx, sy, '#ffd23f', 18); sfx('perfect');
      }
      if (e && e.type === 'plant' && !shot.caught && b.vy < 0 && Math.abs(b.x - e.at) < Math.max(e.r, 14 / view.scale) && b.y < e.h + Math.max(e.r, 10 / view.scale)) {
        shot.caught = true; e.snap = 1; e.ate = 1;
        const [sx, sy] = toScreen(e.at, e.h); floatText(sx, sy - 30, 'Schnapp! Gefressen', '#ff8a7a', 16); burst(sx, sy, '#5ea83a', 14); sfx('bad');
        b.x = e.at; b.y = 0; b.vx = 0; b.vy = -1e-6; land(); return;
      }
      if (e && e.type === 'mole' && !shot.moled && b.y <= 0 && b.vy < 0 && Math.abs(b.x - e.at) <= Math.max(e.w, 10 / view.scale)) {
        shot.moled = true; e.pop = 1; b.y = 1e-6; b.vy = shot.v0 * 0.38; b.vx = Math.max(b.vx * 0.8, shot.v0 * 0.3);
        const [sx, sy] = toScreen(e.at, 0); floatText(sx, sy - 40, 'Maulwurf! Hoch damit!', '#7ff6ff', 16); burst(sx, sy - 4, '#8a5a2b', 16); sfx('boost');
      }
      if (chal && chal.targets) chal.targets.forEach(t => {
        if (t.hit || Math.hypot(b.x - t.x, b.y - t.y) > Math.max(t.r, 8 / view.scale) + 5 / view.scale) return;
        t.hit = true; const [sx, sy] = toScreen(t.x, t.y); burst(sx, sy, '#ffffff', 14); floatText(sx, sy - 18, 'Treffer!', '#5ee07a', 16); sfx('star');
      });
      if (!s.won && b.x >= J.P.goal) shot.reachedGoal = true;
      if (b.y <= 0 && b.vy < 0 && !shot.caught) groundAmmo(b);
      if (b.y <= 0 && b.vy < 0) { b.y = 0; land(); }
    }
    // Abgas/Rauch/Funken je Zeitalter
    const [bx, by] = toScreen(b.x, b.y), A = s.age;
    if (A >= 4 && by < view.groundY - 4 && Math.random() < 0.9) {
      const sp = A === 4 ? ['#ff8a3d', 0, 0.35, 2.2, false] : A === 5 ? ['rgba(90,90,90,0.5)', 0, 0.7, 4, true] : A === 6 ? ['rgba(235,235,235,0.6)', 0, 0.7, 4, true] : A === 7 ? [Math.random() < 0.5 ? '#ffb347' : 'rgba(120,120,120,0.5)', 0, 0.5, 3, true] : [Math.random() < 0.5 ? '#ff7ad9' : '#7ff6ff', 0, 0.45, 2.2, false];
      view.parts.push({ x: bx + (Math.random() - 0.5) * 3, y: by + (Math.random() - 0.5) * 3, vx: (Math.random() - 0.5) * 30, vy: (Math.random() - 0.5) * 30, r: sp[3], life: sp[2], col: sp[0], dust: sp[4], spark: !sp[4] });
    }
    const lt = view.trail[view.trail.length - 1];
    if (Math.abs(b.x - lt[0]) * view.scale > 3 || Math.abs(b.y - lt[1]) * view.scale > 3) view.trail.push([b.x, b.y]);
    view.flyers.forEach(f => { if (!f.hit && !f.hover) f.x += f.vx * dt; });
    // Kamera folgt: zoomt heraus, falls die Kugel weiter fliegt als erwartet
    const xm = Math.max(shot.blocked || shot.predD, b.x * 1.1);
    targetScale = Math.min(autoScale() / Math.max(1, zoom), fitScale(xm * 1.05, Math.max(shot.predApex * 1.15, b.y * 1.15)));
  }

  // Sprengkugel explodiert am Boden und fliegt weiter, Hüpfkugel springt 3-mal
  function groundAmmo(b) {
    const [sx] = toScreen(b.x, 0), sy = view.groundY - 4;
    if (shot.ammo === 'spreng' && !shot.boomed) {
      // Explodiert immer am Boden; nur ohne Abpraller am Hindernis schleudert sie sich weiter nach vorn
      shot.boomed = true; const fly = shot.blocked == null;
      if (fly) { b.y = 1e-6; b.vy = shot.v0 * 0.55; b.vx = Math.max(Math.abs(b.vx), shot.v0 * 0.55); }
      for (let k = 0; k < 36; k++) { const an = Math.random() * Math.PI, sp = 120 + Math.random() * 260; view.parts.push({ x: sx, y: sy, vx: Math.cos(an) * sp, vy: -Math.sin(an) * sp, r: 2 + Math.random() * 3, life: 0.6 + Math.random() * 0.5, col: k % 3 ? '#ffb347' : '#fff3b0', spark: true }); }
      for (let k = 0; k < 10; k++) view.parts.push({ x: sx + (Math.random() - 0.5) * 30, y: sy - Math.random() * 20, vx: (Math.random() - 0.5) * 60, vy: -30 - Math.random() * 50, r: 8 + Math.random() * 10, life: 1.3, col: 'rgba(70,60,55,0.55)', dust: true });
      view.rings = view.rings || []; view.rings.push({ x: sx, y: sy, t: 0, col: '255,180,80' });
      floatText(sx, sy - 60, fly ? 'BUMM! Weiter geht’s!' : 'BUMM!', '#ffb347', 19); view.shake = Math.max(view.shake, 0.55); sfx('hit'); setTimeout(() => sfx('boost'), 80);
    } else if (shot.ammo === 'huepf' && shot.bounces < 3 && shot.blocked == null) {
      shot.bounces++; b.y = 1e-6; b.vy = Math.abs(b.vy) * 0.62; b.vx *= 0.88;
      burst(sx, sy, '#ff8a5a', 8); floatText(sx, sy - 40, 'Hüpf ' + shot.bounces + '/3', '#ffb3aa', 14); sfx('tap');
    }
  }

  function land() {
    const b = view.ball;
    const d = shot.blocked != null ? shot.blocked : Math.max(0, b.x);
    phase = 'land'; phaseT = 0;
    view.lastLand = { x: d, text: J.fmtKm(d) };
    const [lx] = toScreen(d, 0);
    burst(lx, view.groundY - 4, '#c9a46a', 12); sfx('land');
    if (chal) return landChallenge(d);
    const e = view.event;
    if (e && e.type === 'bonusGround' && !e.got && Math.abs(d - e.at) <= e.w) {
      e.got = true; const g = 10 * J.shotGold(s, d); shot.bonus += g; floatText(lx, view.groundY - 90, 'Schatz! +' + J.fmtNum(g) + ' Gold', '#ffd23f', 17); sfx('perfect');
    }
    const total = (J.shotGold(s, d) + shot.starGold + shot.birdGold + shot.bonus) * (shot.ammo === 'gold' ? 3 : 1);
    s.gold += total; s.shots++;
    const wasOpen = J.jumpUnlocked(s), couldJump = J.jumpPreview(s).can;
    const newRec = d > s.runRec;
    if (newRec) s.runRec = d;
    s.record = Math.max(s.record, d);
    view.record = s.runRec;
    if (!couldJump && J.jumpPreview(s).can) setTimeout(() => startRift(!wasOpen), 1400); // große Animation: Zeitsprung ist jetzt möglich
    floatText(Math.min(view.W - 70, Math.max(70, lx)), view.groundY - 60, '+' + J.fmtNum(total) + ' Gold' + (newRec ? '  Neuer Rekord!' : ''), '#ffd23f', 18);
    if (d >= J.P.goal && !s.won) { s.won = true; s.st.winShots = s.shots; setTimeout(startWinShow, 900); }
    save(); renderAll();
  }

  // Der Schubvogel des Ereignisses (falls aktiv und noch nicht getroffen)
  function birdFlyers() { const e = view.event; return !chal && e && e.type === 'bird' && e.fly && !e.got ? [e.fly] : []; }
  function finishShot() {
    const wasChal = shot && shot.inChal;
    phase = 'idle'; view.ball = null; view.flyers = []; shot = null;
    if (!chal && !wasChal) advanceEvent(); // Challenge-Schüsse zählen nicht für Ereignisse
    spawnStars(); updateFire(); computePreview();
  }

  // ---------- Trainingszentrum: ein Ziel nach dem anderen, jedes gibt zufällig +1 % Schaden, Reichweite oder Gold (dauerhaft) ----------
  const TR_NAMES = ['Strohpuppe', 'Holzscheibe', 'Kistenstapel', 'Hohe Scheibe', 'Puppenpaar'];
  function trainTarget() {
    const st = J.stats(s), n = s.meta.train.n, R = st.range, at = R * (0.4 + 0.4 * Math.random()), u = at * 0.065;
    const reach = x => (R * R - x * x) / (2 * R) * 0.55; // sicher erreichbare Höhe
    const hp0 = st.dmg / st.trDmg * 2.5 * Math.pow(1.07, n), typ = n < 2 ? n : Math.floor(Math.random() * TR_NAMES.length);
    let parts;
    if (typ === 0) parts = [['dummy', 0, 0, 1, 2.4, -1, 1]];
    else if (typ === 1) parts = [['wall', 0, 0, 0.5, 1.8, -1, 0.3], ['target', -0.35, 1.8, 1.2, 1.2, 0, 0.7]];
    else if (typ === 2) parts = [['block', 0, 0, 1.3, 1.1, -1, 0.35], ['block', 0.15, 1.1, 1, 1, 0, 0.35], ['block', 0.3, 2.1, 0.8, 0.8, 1, 0.3]];
    else if (typ === 3) { const y = Math.min(reach(at) / u - 1.4, 4 + Math.random() * 3); parts = [['target', 0, Math.max(1, y), 1.2, 1.2, -1, 1, true]]; }
    else parts = [['dummy', 0, 0, 1, 2.4, -1, 0.5], ['dummy', 1.8, 0, 1, 2.4, -1, 0.5]];
    const ps = parts.map(([kind, dx, y, w, h, on, f, post]) => ({ kind, x: at + dx * u, y: y * u, w: w * u, h: h * u, on, mv: null, hp: Math.max(1, hp0 * f), post: !!post }));
    const o = { id: 'chal', age: s.age, at, u, parts: ps, name: TR_NAMES[typ], end: Math.max(...ps.map(p => p.x + p.w)), top: Math.max(...ps.map(p => p.y + p.h)) };
    chal.tower = o; chal.hp = ps.map(p => p.hp); chal.hit = []; chal.ys = ps.map((p, i) => J.partLevel(o, chal.hp, i)); chal.c.name = o.name;
  }
  function startTraining() {
    if (chal && !chal.train) endChallenge();
    if (chal) return;
    chal = { c: { id: 'train', type: 'tower', name: '', tries: Infinity }, used: 0, train: true, targets: null, ground: null };
    trainTarget();
    pausedEvent = view.event; view.intro = null;
    view.chal = chal; view.event = null; view.stars = []; view.lastLand = null; view.trail = []; zoom = 1;
    computePreview(); renderAll();
    if (!s.meta.train.n) toast('🏋️ <b>Trainingszentrum</b>: Jedes zerstörte Ziel gibt dir dauerhaft +1 % Schaden, Reichweite oder Gold.');
  }
  function trainDone() {
    const k = J.trainReward(s), name = { dmg: 'Schaden', range: 'Reichweite', gold: 'Gold' }[k], ic2 = { dmg: '🔥', range: '🌬️', gold: '💰' }[k];
    const tb = J.trainBonus(s), f = (1 + 0.25 * J.W(s, 'trainer'));
    chal.reward = { t: 0, text: ic2 + ' +' + (Math.round(f * 10) / 10).toString().replace('.', ',') + ' % ' + name, sub: 'Training gesamt: Schaden +' + pctN(tb.dmg) + ' · Reichweite +' + pctN(tb.range) + ' · Gold +' + pctN(tb.gold) };
    sfx('up'); setTimeout(() => sfx('perfect'), 150); view.shake = 0.4; save(); renderHud();
    setTimeout(() => { if (chal && chal.train && phase !== 'flight') { trainTarget(); chal.reward = null; computePreview(); } else if (chal && chal.train) chal.next = true; }, 1600);
  }
  const pctN = v => (Math.round(v * 1000) / 10).toString().replace('.', ',') + ' %';

  // ---------- Challenges ----------
  let pausedEvent = null;
  function startChallenge(id) {
    if (chal && chal.train) setStageView('cannon');
    const c0 = J.CHALLENGES.find(x => x.id === id);
    if (!c0 || phase !== 'idle' || s.age < c0.minAge || s.ch[c0.id]) return;
    const c = J.chalFor(s, c0);
    chal = { c, used: 0, targets: c.type === 'fly' ? c.targets.map(t => ({ x: t[0], y: t[1], bx: t[0], by: t[1], kind: t[2] || null, hi: t[3], r: c.r, hit: false, ph: Math.random() * 6 })) : null,
      ground: c.type === 'ground' ? { at: c.at, w: c.w, x: c.at, move: c.move || 0, sp: c.sp || 1, ph: Math.random() * 6 } : null };
    if (c.type === 'tower') { // Turm aus Teilen: jedes Teil hält etwas mehr aus als ein normaler Treffer
      const u = c.u, hp = c.hpF * J.stats(s).dmg;
      const parts = c.parts.map(([dx, y, w, h, on, kind, mv], i) => ({ kind: kind || 'block', x: c.at + dx * u, y: y * u, w: w * u, h: h * u, on: on == null ? -1 : on, mv: mv ? { ax: mv[0] * u, ay: mv[1] * u, f: mv[2], ph: i } : null, hp }));
      const o = { id: 'chal', age: s.age, at: c.at, u, parts, name: c.name, end: Math.max(...parts.map(p => p.x + p.w)), top: Math.max(...parts.map(p => p.y + p.h + (p.mv ? p.mv.ay : 0))) };
      chal.tower = o; chal.hp = parts.map(p => p.hp); chal.hit = []; chal.ys = parts.map((p, i) => J.partLevel(o, chal.hp, i));
    }
    pausedEvent = view.event; view.intro = null; // laufendes Ereignis pausiert während der Challenge
    view.chal = chal; view.event = null; view.stars = []; view.lastLand = null; view.trail = []; zoom = 1;
    $('#chalExit').hidden = false;
    computePreview(); renderAll();
    toast('Challenge gestartet: <b>' + c.name + '</b>');
  }
  // Treffer an einem Challenge-Turm (wie bei Hindernissen: zerstörte Teile lassen die Kugel weiterfliegen)
  function checkChalTower(b) {
    const o = chal.tower, br = 5 / view.scale;
    if (b.x < o.at - o.u * 1.5 || b.x > o.end + o.u * 2) return;
    for (let i = 0; i < o.parts.length; i++) {
      if (chal.hp[i] <= 0 || shot.pierced.includes('c:' + i)) continue;
      const p = o.parts[i], q = J.partPos(o, i, view.time, chal.ys);
      if (b.x + br < q.x || b.x - br > q.x + p.w || b.y + br < q.y || b.y - br > q.y + p.h) continue;
      if (shot.ammo === 'spreng') { block(b, q.x, '💣 Abgeprallt, kein Schaden'); return; }
      const dmg = shotDmg();
      chal.hp[i] = Math.max(0, chal.hp[i] - dmg); chal.hit[i] = 1;
      const [sx, sy] = toScreen(b.x, b.y); burst(sx, sy, '#ffb347', 12); sfx('hit');
      if (chal.hp[i] <= 0) { destroyFx(o, i, q); floatText(sx, sy - 30, (chal.train ? 'Ziel zerstört!' : 'Teil zerstört! ' + chal.hp.filter(h => h > 0).length + ' übrig'), '#ffd23f', 15); if (!pierce('c:' + i)) { b.vx *= 0.7; b.vy *= 0.7; } if (chal.train && chal.hp.every(h => h <= 0)) trainDone(); }
      else { floatText(sx, sy - 24, '−' + J.fmtNum(Math.ceil(dmg)), '#ff8a7a', 15); if (!pierce('c:' + i)) block(b, q.x, null); }
      return;
    }
  }
  function endChallenge() {
    chal = null; view.chal = null; $('#chalExit').hidden = true; view.lastLand = null; view.trail = [];
    view.event = pausedEvent; pausedEvent = null; view.intro = null; // kein neues Ereignis direkt nach der Challenge
    spawnStars(); computePreview(); renderAll();
  }
  function landChallenge(d) {
    chal.used++;
    if (chal.train) { if (chal.next) { chal.next = false; setTimeout(() => { if (chal && chal.train) { trainTarget(); chal.reward = null; } }, 600); } return; }
    const c = chal.c;
    const gx = chal.ground ? chal.ground.x : 0;
    const ok = c.type === 'ground' ? Math.abs(d - gx) <= c.w : c.type === 'tower' ? chal.hp.every(h => h <= 0) : chal.targets.every(t => t.hit);
    if (c.type === 'ground') floatText(toScreen(d, 0)[0], view.groundY - 70, ok ? 'Volltreffer!' : (d < gx ? 'Zu kurz' : 'Zu weit') + ' (' + J.fmtKm(Math.abs(d - gx)) + ')', ok ? '#5ee07a' : '#ffb3aa', 16);
    if (ok) {
      s.ch[c.id] = true; save(); sfx('up');
      setTimeout(() => { modal(`<h2>🏆 ${esc(c.name)} geschafft!</h2><p>Dauerhafter Bonus: <b>${J.bonusText(c.bonus)}</b></p><button class="btn" data-close style="width:100%">Weiter</button>`); endChallenge(); }, 900);
    } else if (chal.used >= c.tries) {
      setTimeout(() => { modal(`<h2>${esc(c.name)}: nicht geschafft</h2><p class="muted">Keine Versuche mehr. Du kannst es jederzeit erneut versuchen.</p><div class="row"><button class="btn" data-chal="${c.id}">Nochmal</button><button class="btn sec" data-close>Schließen</button></div>`); endChallenge(); }, 900);
    }
  }

  // ---------- Effekte ----------
  function floatText(x, y, text, col, size) { view.texts.push({ x, y, text, col, size, life: 1.6 }); }
  function burst(x, y, col, n) { for (let i = 0; i < n; i++) view.parts.push({ x, y, vx: (Math.random() - 0.5) * 220, vy: -Math.random() * 220, r: 2 + Math.random() * 2.5, life: 0.8 + Math.random() * 0.4, col }); }

  // ---------- Spielschleife ----------
  let last = performance.now(), uiT = 0, saveT = 0, fps = 60;
  function frame(now) {
    const rdt = Math.min(0.05, (now - last) / 1000); last = now;
    const dt = dev.slowmo ? rdt * 0.3 : rdt;
    fps = fps * 0.95 + (1 / Math.max(1e-3, rdt)) * 0.05;
    view.time += dt; view.dt = dt; phaseT += dt;
    const got = J.tickRes(s, dt);
    updateFarmBadge(dt);
    if (s.farm) { const acts = J.tickFarm(s, dt); if (acts.length && stageView === 'farm' && farmR) acts.forEach(a => { if (a.gold) farmR.money('+' + J.fmtNum(a.gold) + ' Gold'); else if (a.i >= 0) farmR.botAct(a.bot, a.i, a.act, a.crop, a.crop ? J.cropOf(a.crop).name : ''); }); }
    if (stageView === 'res') for (const id in got) { const i = J.MATS.findIndex(m => m.id === id); if (tiles[i]) tiles[i].pop(i, got[id], true); }
    jumpPlayer(); view.act = Math.max(0, (view.act || 0) - dt * 2.2); if (view.pose === 'fire' && view.act <= 0) view.pose = 'idle';
    if (phase === 'aim' && view.bar) { view.bar.t += dt * J.stats(s).barSpeed; const f = view.bar.t % 2; view.bar.pos = f < 1 ? f : 2 - f; }
    if (chal && chal.targets) chal.targets.forEach(t => { if (t.kind === 'lift') { t.y = t.by + (t.hi - t.by) * (0.5 + 0.5 * Math.sin(view.time * 1.25 + t.ph)); return; } if (t.kind) return; if (!t.hit) { t.x = t.bx * (1 + (chal.c.move || 0) * Math.sin(view.time * 0.9 + t.ph)); if (chal.c.moveY) t.y = t.by * (1 + chal.c.moveY * Math.sin(view.time * 1.6 + t.ph * 2)); } });
    if (chal && chal.ground && chal.ground.move && !(phase === 'land' && shot && shot.inChal)) { const g = chal.ground; g.x = g.at * (1 + g.move * Math.sin(view.time * g.sp + g.ph)); }
    if (chal && chal.tower) { const o = chal.tower; o.parts.forEach((p, i) => { const tg = J.partLevel(o, chal.hp, i); chal.ys[i] = chal.ys[i] < tg ? tg : Math.max(tg, chal.ys[i] - o.u * 14 * dt); }); chal.hit.forEach((v, i, a) => { a[i] = Math.max(0, (v || 0) - dt * 2); }); }
    if (phase === 'flight') flightStep(dt);
    if (phase === 'ageup' && view.ageFx) ageFxStep(dt);
    if (phase === 'win' && view.winFx) winFxStep(dt);
    if (phase === 'jump') jumpStep();
    if (phase === 'land' && phaseT > 1.3) finishShot();
    const tgt = phase === 'flight' || phase === 'land' ? (targetScale || view.scale) : autoScale() / zoom;
    const ps = view.scale;
    view.scale += (tgt - view.scale) * Math.min(1, dt * (phase === 'flight' ? 3 : 5));
    if (phase !== 'flight' && phase !== 'land' && Math.abs(ps - view.scale) / view.scale > 0.002) computePreview();
    view.recoil = Math.max(0, view.recoil - dt * 3); view.flash = Math.max(0, view.flash - dt * 4);
    for (const id in hitMap) hitMap[id].forEach((v, i, a) => { a[i] = Math.max(0, (v || 0) - dt * 2); });
    view.parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.dust ? -30 : p.spark ? 120 : 500) * dt; if (p.spark) { p.vx *= 1 - dt * 1.5; p.vy *= 1 - dt * 1.5; } if (p.dust) p.r += dt * 14; p.life -= dt; });
    view.debris.forEach(d => {
      d.life -= dt; if (d.rest) return;
      d.vy -= d.g * dt;
      if (d.flutter) { d.vy = Math.max(d.vy, -d.g * 2.2); d.vx *= 1 - dt * 1.2; d.x += Math.sin(view.time * 3 + d.ph) * 18 / d.sc0 * dt; d.rot = Math.sin(view.time * 4 + d.ph) * 0.9; }
      d.x += d.vx * dt; d.y += d.vy * dt; d.rot += d.vr * dt;
      if (d.y <= 0) { d.y = 0; d.vy *= -0.28; d.vx *= 0.45; d.vr *= 0.4; if (Math.abs(d.vy) < d.g * 0.06 || d.flutter) { d.rest = true; d.rot = d.big ? Math.round(d.rot / (Math.PI / 2)) * (Math.PI / 2) + (Math.random() - 0.5) * 0.3 : d.rot; } }
    });
    view.debris = view.debris.filter(d => d.life > 0);
    view.ghosts.forEach(g => { g.t += dt; }); view.ghosts = view.ghosts.filter(g => g.t < 0.6);
    if (view.rings) { view.rings.forEach(r => { r.t += dt; }); view.rings = view.rings.filter(r => r.t < 0.4); }
    view.shake = Math.max(0, view.shake - dt);
    if (view.event && view.event.fly && !view.event.fly.hit) { const e = view.event, f = e.fly, w = view.time * 0.9 + f.ph; f.x = e.cx + Math.cos(w) * e.rad; f.y = e.cy + Math.sin(w) * e.rad * 0.6; f.vx = -Math.sin(w); }
    if (phase !== 'flight' && phase !== 'land') view.flyers = birdFlyers();
    if (view.event) { const e = view.event; if (e.pop) e.pop = Math.max(0, e.pop - dt * 1.2); if (e.snap) e.snap = Math.max(0, e.snap - dt * 0.8); }
    if (view.goodFx) { view.goodFx.t += rdt; if (view.goodFx.t > 0.8) view.goodFx = null; }
    if (view.intro) { view.intro.t += dt; if (view.intro.t > 2.4) view.intro = null; }
    if (chal && chal.reward) chal.reward.t += rdt;
    if (view.riftFx) { view.riftFx.t += rdt; if (view.riftFx.t > 5) view.riftFx = null; }
    view.canJump = phase !== 'jump' && !chal && J.jumpPreview(s).can;
    if (phase !== 'flight' && view.trail.length) { view.trailA -= dt * 0.7; if (view.trailA <= 0) view.trail = []; } // alte Flugspur blendet aus
    // Fall-Animation: Teile auf zerstörten Unterlagen rutschen nach unten
    J.OBS.forEach(o => { const ys = obsYs[o.id]; if (!ys) return; o.parts.forEach((p, i) => { const tgt = J.partLevel(o, s.oh[o.id], i); ys[i] = ys[i] < tgt ? tgt : Math.max(tgt, ys[i] - o.u * 14 * dt); }); });
    view.parts = view.parts.filter(p => p.life > 0);
    view.texts.forEach(t => { t.y -= 26 * dt; t.life -= dt; });
    view.texts = view.texts.filter(t => t.life > 0);
    view.age = view.ageFx && view.ageFx.t < 1.1 ? view.ageFx.from : s.age; view.angle = s.angle; view.phase = phase; view.cur = s.cur; view.dev = dev; view.skins = s.meta.skins; view.trainN = s.meta.train.n;
    if (dev.info) { const st = J.stats(s); view.info = [`${Math.round(fps)} fps · Zoom ×${zoom.toFixed(2)} · ${Math.round(view.scale)} px/km`, `Reichweite ${J.fmtKm(st.range)} · bei ${s.angle}°/${s.power} %: ${J.fmtKm(reachNow())}`, `Schaden ${J.fmtNum(st.dmg)} · Zone ${Math.round(st.zone * 100)} % · Vorschau ${Math.round(st.preview * 100)} %`, `Schüsse ${s.shots} · Ereignis ${view.event ? view.event.type : '–'}`]; } else view.info = null;
    if (onCanvas()) R.draw(view);
    if (stageView === 'res') drawResStage(dt);
    if (stageView === 'farm' && farmR) farmR.draw(s, view.time, dt, J);
    uiT += dt; saveT += dt;
    if (uiT > 0.25) { uiT = 0; tickUI(); }
    if (saveT > 5) { saveT = 0; save(); }
    requestAnimationFrame(frame);
  }

  // ---------- Oberfläche ----------
  const esc = t => String(t).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));
  let tab = 'cannon';
  const ic = i => `<img class="ic" src="${ICONS.iconURL(i)}" alt="">`;
  const COIN = () => ic('coin');
  const icOf = m => ic(J.MATS.indexOf(m));

  function updateFire() {
    const b = $('#fire');
    b.classList.toggle('aim', phase === 'aim');
    b.disabled = !(phase === 'idle' || phase === 'aim');
    b.textContent = phase === 'idle' ? 'Laden' : phase === 'aim' ? 'Auslösen!' : phase === 'ageup' || phase === 'win' ? '🎉' : phase === 'jump' ? '💠' : 'Fliegt …';
  }

  function costHtml(cost) {
    let h = `<span class="cost ${s.gold < cost.gold ? 'miss' : ''}">${COIN()} ${J.fmtNum(cost.gold)}</span>`;
    for (const k in cost.mats) {
      const mt = J.MATS.find(m => m.id === k);
      h += `<span class="cost ${(s.mats[k] || 0) < cost.mats[k] ? 'miss' : ''}">${icOf(mt)} ${J.fmtNum(s.mats[k] || 0)}/${J.fmtNum(cost.mats[k])}</span>`;
    }
    return h;
  }

  function renderHud() {
    $('#gold').textContent = J.fmtNum(s.gold);
    $('#rec').textContent = s.runRec > 0 ? J.fmtKm(s.runRec) : '–';
    const open = J.jumpUnlocked(s);
    $('#spPill').hidden = !open && !s.meta.earned; $('#sp').textContent = J.fmtNum(s.meta.sp);
    $('#jumpTab').hidden = !open;
    $('#jBadge').textContent = open && J.wsList(s).some(x => !x.maxed && x.cost <= s.meta.sp) ? '!' : '';
    $('#ageName').textContent = J.AGES[s.age].name;
    $('#goalFill').style.width = Math.min(100, Math.log10(1 + s.record * 100) / Math.log10(1 + J.P.goal * 100) * 100) + '%';
    $('#goalTxt').textContent = (s.won ? '🏆 ' : '') + J.fmtKm(s.record) + ' / ' + J.fmtKm(J.P.goal);
    const shown = J.MATS.filter((m, i) => s.age >= m.age || s.mats[m.id] > 0);
    const mh = shown.map(m => `<button class="pill" data-mat="${J.MATS.indexOf(m)}" title="${esc(m.name)} – zur Abbaustelle">${icOf(m)} ${J.fmtNum(s.mats[m.id])}</button>`).join('');
    if (mh !== renderHud.mh) { renderHud.mh = mh; $('#mats').innerHTML = mh; }
    const canUp = J.canAgeUp(s);
    $('#cBadge').textContent = canUp ? '!' : '';
    // Aktive Dauer-Boni klein im Spielfeld (Challenges und Zeitwerkstatt)
    const st = J.stats(s), pct = v => '+' + Math.round((v - 1) * 100) + ' %', rows = [];
    const chP = [st.chDmg > 1 && 'Schaden ' + pct(st.chDmg), st.chGold > 1 && 'Gold ' + pct(st.chGold), st.chRange > 1 && 'Reichweite ' + pct(st.chRange)].filter(Boolean);
    const wsP = [st.wsRange > 1 && 'Reichweite ' + pct(st.wsRange), st.wsDmg > 1 && 'Schaden ' + pct(st.wsDmg), st.wsGold > 1 && 'Gold ' + pct(st.wsGold)].filter(Boolean);
    if (chP.length) rows.push(`<span title="Boni aus geschafften Challenges">🏆 ${chP.join(' · ')}</span>`);
    if (wsP.length) rows.push(`<span title="Boni aus der Zeitwerkstatt">💠 ${wsP.join(' · ')}</span>`);
    const shP = [st.shDmg > 1 && 'Schaden ' + pct(st.shDmg), st.shRange > 1 && 'Reichweite ' + pct(st.shRange), st.shGold > 1 && 'Gold ' + pct(st.shGold)].filter(Boolean);
    if (shP.length) rows.push(`<span title="Boni aus Schreinen (dieser Lauf)">⛩️ ${shP.join(' · ')}</span>`);
    const trP = [st.trDmg > 1 && 'Schaden ' + pct(st.trDmg), st.trRange > 1 && 'Reichweite ' + pct(st.trRange), st.trGold > 1 && 'Gold ' + pct(st.trGold)].filter(Boolean);
    if (trP.length) rows.push(`<span title="Boni aus dem Trainingszentrum">🏋️ ${trP.join(' · ')}</span>`);
    const bh = rows.join(''); if (bh !== renderHud.bh) { renderHud.bh = bh; $('#boni').innerHTML = bh; view.boniN = rows.length; }
  }

  function renderCannon() {
    const st = J.stats(s), A = J.AGES[s.age], list = J.upgList(s), last = s.age === J.AGES.length - 1;
    const done = list.filter(u => u.bought).length;
    const obs = J.OBS.filter(o => o.age === s.age), obsDone = obs.filter(o => J.obsDone(s, o.id)).length;
    let h = `<div class="card"><h3>${esc(A.cannon)} <span class="muted">· Level ${s.age + 1} (${esc(A.name)})</span></h3>
      <div class="stats">
        <span>Reichweite (45°, 100 %)</span><b>${J.fmtKm(st.range)}</b>
        <span>Schaden</span><b>${J.fmtNum(st.dmg)}</b>
        <span>Grüne Zone</span><b>${Math.round(st.zone * 100)} %</b>
        <span>Gold-Bonus</span><b>×${st.goldMult.toFixed(2).replace('.', ',')}</b>
      </div>${bonusLine(st)}</div>
      <div class="card"><b>Dein Schütze</b> <span class="muted">· ${esc(A.name)}</span>${skinPicker()}</div>`;
    if (!last) {
      h += `<div class="card ${J.canAgeUp(s) ? 'ready-card' : ''}"><b>Aufstieg zur ${esc(J.AGES[s.age + 1].name)}</b>
        <div class="muted">${J.canAgeUp(s) ? (J.upgradesDone(s) ? 'Alles erledigt!' : 'Alle Hindernisse sind zerstört. Du kannst aufsteigen, offene Upgrades dieses Zeitalters bekommst du dabei geschenkt.') : 'Zerstöre alle Hindernisse dieses Zeitalters. Upgrades helfen dabei, sind aber freiwillig.'}</div>
        <div class="req"><span>Upgrades ${done}/${list.length} (freiwillig)</span><div class="prog"><i style="width:${done / list.length * 100}%"></i></div></div>
        <div class="req"><span>Hindernisse ${obsDone}/${obs.length}</span><div class="prog"><i style="width:${obsDone / obs.length * 100}%"></i></div></div>
        ${J.canAgeUp(s) ? `<button class="btn ready" data-ageup style="width:100%;margin-top:8px">Aufsteigen: ${esc(J.AGES[s.age + 1].cannon)}</button>` : ''}</div>`;
    }
    [...list.filter(u => !u.bought), ...list.filter(u => u.bought)].forEach(u => { // offene zuerst
      const can = J.canAfford(s, u.cost);
      h += `<div class="card upg ${u.bought ? 'done' : ''}"><div class="info"><div class="name">${esc(u.name)}</div>
        <div class="muted">${esc(u.line.name)}: ${esc(u.line.eff)}</div>
        ${u.bought ? '' : `<div class="costs">${costHtml(u.cost)}</div>`}</div>
        ${u.bought ? '<span>✅</span>' : u.locked ? '<span class="muted">erst Stufe ' + ['I', 'II', 'III'][u.step - 1] + '</span>' : `<button class="btn" data-buy="${u.key}" ${can ? '' : 'disabled'}>Kaufen</button>`}
      </div>`;
    });
    h += '<h4 class="sub">Zeitalter</h4>';
    J.AGES.forEach((a, i) => {
      const cls = i < s.age ? 'past' : i === s.age ? 'cur' : 'future', known = i <= s.age + 1;
      h += `<div class="card tl ${cls}"><span class="dot">${i < s.age ? '✓' : i + 1}</span><div><b>${esc(a.name)}</b> · ${esc(known ? a.cannon : '???')}
        <div class="muted">${i <= s.age ? a.obstacles.map(esc).join(', ') : i === s.age + 1 ? esc(a.obstacles[0]) + ', ???' : '???'}</div></div></div>`;
    });
    $('#tab-cannon').innerHTML = h; paintSkins($('#tab-cannon'));
  }

  // ---------- Skins: Mann, Frau, Kind je Zeitalter ----------
  const SKIN_NAMES = ['Mann', 'Frau', 'Kind'];
  function skinPicker() {
    const cur = s.meta.skins[s.age] || 0;
    return `<div class="skins">${SKIN_NAMES.map((n, i) => `<button class="skin ${i === cur ? 'on' : ''}" data-skin="${i}"><canvas data-skinprev="${i}"></canvas><span>${n}</span></button>`).join('')}</div>`;
  }
  function paintSkins(root) { (root || document).querySelectorAll('canvas[data-skinprev]').forEach(cv => R.previewPlayer(cv, s.age, +cv.dataset.skinprev)); }
  function pickSkin(i) {
    s.meta.skins[s.age] = i; save(); sfx('click');
    document.querySelectorAll('.skin').forEach(b => b.classList.toggle('on', +b.dataset.skin === i));
  }

  // Challenge-Boni und Zeitwerkstatt getrennt ausweisen
  const fx = v => '×' + v.toFixed(2).replace('.', ',');
  function bonusLine(st) {
    const ch = [], ws = [];
    if (st.chDmg > 1) ch.push(fx(st.chDmg) + ' Schaden'); if (st.chGold > 1) ch.push(fx(st.chGold) + ' Gold'); if (st.chRange > 1) ch.push(fx(st.chRange) + ' Reichweite');
    if (st.wsRange > 1) ws.push(fx(st.wsRange) + ' Reichweite'); if (st.wsDmg > 1) ws.push(fx(st.wsDmg) + ' Schaden'); if (st.wsGold > 1) ws.push(fx(st.wsGold) + ' Gold');
    const sh = [], tr = [];
    if (st.shDmg > 1) sh.push(fx(st.shDmg) + ' Schaden'); if (st.shRange > 1) sh.push(fx(st.shRange) + ' Reichweite'); if (st.shGold > 1) sh.push(fx(st.shGold) + ' Gold');
    if (st.trDmg > 1) tr.push(fx(st.trDmg) + ' Schaden'); if (st.trRange > 1) tr.push(fx(st.trRange) + ' Reichweite'); if (st.trGold > 1) tr.push(fx(st.trGold) + ' Gold');
    const rows = [ch.length && '🏆 Challenges: ' + ch.join(', '), ws.length && '💠 Zeitwerkstatt: ' + ws.join(', '), sh.length && '⛩️ Schreine: ' + sh.join(', '), tr.length && '🏋️ Training: ' + tr.join(', ')].filter(Boolean);
    return rows.length ? `<div class="bonus-line">${rows.join('<br>')}</div>` : '';
  }

  // ---------- Zeitsprung & Zeitwerkstatt ----------
  const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  function renderJump() {
    const pv = J.jumpPreview(s), m = s.meta;
    let h = `<div class="card sp-card"><div class="muted">Zeitsplitter</div><div class="sp-big">💠 ${J.fmtNum(m.sp)}</div>
      <div class="muted small">${m.jumps ? `Zeitsprünge: ${m.jumps} · insgesamt verdient: ${J.fmtNum(m.earned)}` : 'Noch kein Zeitsprung. Splitter gibt es nur durch einen Zeitsprung.'}</div></div>`;
    h += `<div class="card"><b>Zeitsprung jetzt: +${J.fmtNum(pv.n)} 💠</b>
      <div class="muted">Rekord in diesem Lauf: ${J.fmtKm(pv.km)}${pv.win ? ` · inkl. ${pv.win} Bonus für die ersten 1.000 km` : ''}. Nächster Splitter bei ${J.fmtKm(pv.nextKm)}.</div>
      <div class="keep"><div><b>Verlierst du</b><ul><li>Gold &amp; Ressourcen</li><li>Zeitalter &amp; Kanonen-Upgrades</li><li>Arbeiter &amp; Werkzeug</li><li>Munition &amp; Schreine</li><li>Hindernisse heilen</li></ul></div>
      <div><b>Behältst du</b><ul><li>Zeitsplitter &amp; Zeitwerkstatt</li><li>Challenge-Boni</li><li>Trainings-Boni</li><li>Bestwerte &amp; Statistik</li></ul></div></div>
      <button class="btn jump" data-jumphold ${pv.can && phase === 'idle' && !chal ? '' : 'disabled'}><i></i><span>⏳ Gedrückt halten: Zeitsprung</span></button>
      <div class="muted small" style="margin-top:6px">Dein Schütze steigt in eine Rakete und fliegt zurück an den Anfang der Zeit. Du startest wieder in der Steinzeit. Je weiter du kommst, desto mehr Splitter, aber mit abnehmendem Zuwachs.</div></div>`;
    h += '<h4 class="sub">Zeitwerkstatt (dauerhaft)</h4>';
    let br = '';
    J.wsList(s).forEach(x => {
      if (x.w.br !== br) { br = x.w.br; h += `<div class="muted small" style="margin:10px 2px 4px;font-weight:600">${esc(br)}</div>`; }
      const dots = Array.from({ length: x.w.max }, (_, i) => `<i class="${i < x.lv ? 'on' : ''}"></i>`).join('');
      h += `<div class="card upg ws ${x.maxed ? 'done' : ''}"><div class="info"><div class="name">${x.w.icon} ${esc(x.w.name)}<span class="lv" title="Stufe ${x.lv}/${x.w.max}">${dots}</span></div>
        <div class="muted">${x.lv ? 'Jetzt: ' + esc(x.now) : ''}${x.lv && x.next ? ' · ' : ''}${x.next ? 'Nächste Stufe: ' + esc(x.next) : ' (voll ausgebaut)'}</div></div>
        ${x.maxed ? '<span>✅</span>' : `<button class="btn spb" data-ws="${x.w.id}" ${x.cost <= m.sp ? '' : 'disabled'}>💠 ${J.fmtNum(x.cost)}</button>`}</div>`;
    });
    $('#tab-jump').innerHTML = h;
  }
  // Zeitriss: große Animation, sobald im Lauf ein Zeitsprung möglich wird
  function startRift(first) {
    if (phase === 'jump' || phase === 'win') return;
    if (onCanvas()) { view.riftFx = { t: 0, n: J.jumpPreview(s).n, first }; view.shake = 0.5; }
    [0, 0.25, 0.5, 1.2, 1.6].forEach((d, k) => setTimeout(() => sfx(k < 3 ? 'bad' : k === 3 ? 'up' : 'perfect'), d * 1000));
    setTimeout(() => toast('💠 Die Zeit bekommt Risse … ' + (first ? 'Neuer Bereich: <b>Zeitsprung</b>' : '<b>Zeitsprung</b> ist wieder möglich')), onCanvas() ? 4200 : 0);
    renderHud();
  }
  // Zeitsprung als Show: Rakete landet, der Schütze steigt ein, Countdown, Start, sie verschwindet als Punkt am Himmel
  const JT = { land: 1.2, door: 1.5, walk: 2.6, climb: 3.2, count: 4.3, fly: 6.9, flash: 7.4, done: 8.2 };
  function doJump() {
    if (phase !== 'idle' || chal || !J.jumpPreview(s).can) return;
    if (stageView !== 'cannon') setStageView('cannon');
    phase = 'jump'; phaseT = 0; view.bar = null; view.riftFx = null; updateFire(); zoom = 1;
    view.rocket = { t: 0, rx: Math.min(view.W - 40, view.x0 + 70), said: {} };
    sfx('boost');
  }
  function jumpStep() {
    const r0 = view.rocket; if (!r0) return;
    const t = r0.t = phaseT, gy = view.groundY, say = (k, f) => { if (!r0.said[k]) { r0.said[k] = 1; f(); } };
    if (t < JT.land) { if (Math.random() < 0.8) { const y = gy - 90 * (1 - Math.min(1, t / JT.land)) ** 2 * 3; view.parts.push({ x: r0.rx + (Math.random() - 0.5) * 8, y: y + 8, vx: (Math.random() - 0.5) * 40, vy: 80 + Math.random() * 60, r: 3 + Math.random() * 3, life: 0.5, col: Math.random() < 0.5 ? '#ffb347' : 'rgba(200,200,200,0.6)', dust: Math.random() < 0.5 }); } }
    else say('landed', () => { view.shake = 0.4; burst(r0.rx, gy - 4, '#c9a46a', 18); sfx('hit'); });
    if (t > JT.door) say('door', () => sfx('click'));
    if (t > JT.climb) say('in', () => { sfx('click'); floatText(r0.rx, gy - 150, 'Einsteigen!', '#7ff6ff', 16); });
    [3, 2, 1].forEach((n, k) => { if (t > JT.climb + 0.15 + k * 0.33) say('c' + n, () => { floatText(r0.rx + 40, gy - 120, String(n), '#ffffff', 30); sfx('tap'); }); });
    if (t > JT.count) {
      say('go', () => { floatText(r0.rx + 40, gy - 130, 'START!', '#ffd23f', 30); sfx('up'); view.shake = 0.8; for (let k = 0; k < 16; k++) view.parts.push({ x: r0.rx + (Math.random() - 0.5) * 50, y: gy - 6, vx: (Math.random() - 0.5) * 160, vy: -10 - Math.random() * 40, r: 8 + Math.random() * 10, life: 1.6, col: 'rgba(225,225,225,0.6)', dust: true }); });
      const p = R.rocketPos(view, r0);
      if (p.s > 0.08 && Math.random() < 0.95) view.parts.push({ x: p.x + (Math.random() - 0.5) * 6 * p.s, y: p.y + 30 * p.s, vx: (Math.random() - 0.5) * 30, vy: 20, r: (3 + Math.random() * 4) * Math.max(0.3, p.s), life: 0.9, col: Math.random() < 0.35 ? '#ffb347' : 'rgba(230,230,230,0.55)', dust: true });
    }
    if (t > JT.fly) say('dot', () => sfx('star'));
    if (t > JT.flash) say('flash', () => { const fxEl = $('#jumpFx'); fxEl.hidden = true; void fxEl.offsetWidth; fxEl.hidden = false; sfx('up'); });
    if (t < JT.done) return;
    view.rocket = null;
    const r = J.rebirth(s); if (!r) { phase = 'idle'; updateFire(); return; }
    s = r.s;
    for (const k in obsYs) delete obsYs[k]; for (const k in hitMap) delete hitMap[k];
    view.record = 0; view.lastLand = null; view.trail = []; view.event = null; view.stars = []; zoom = 1;
    phase = 'idle'; resAge = -1;
    setAngle(s.angle || 45); setPower(s.power || 100); syncObstacles(); spawnStars(); computePreview(); updateFire(); save();
    setTimeout(() => { $('#jumpFx').hidden = true; }, 1200);
    document.querySelector('[data-tab=jump]').click();
    modal(`<h2>💠 Zeitsprung geglückt!</h2><p>Du bist zurück in der <b>Steinzeit</b> und hast <b>${J.fmtNum(r.got)} Zeitsplitter</b> mitgebracht (Rekord ${J.fmtKm(r.km)}).</p>
      <p class="muted">Gib sie in der Zeitwerkstatt aus. Die Upgrades dort bleiben für immer.</p><button class="btn" data-close style="width:100%">Zur Zeitwerkstatt</button>`);
  }
  // Gedrückt halten (1 s), damit niemand aus Versehen springt
  let holdT = null;
  function holdStart(b) { b.classList.add('hold'); clearTimeout(holdT); holdT = setTimeout(() => { b.classList.remove('hold'); doJump(); }, 1000); }
  function holdEnd() { clearTimeout(holdT); document.querySelectorAll('.btn.jump.hold').forEach(b => b.classList.remove('hold')); }
  $('#tab-jump').addEventListener('pointerdown', e => { const b = e.target.closest('[data-jumphold]'); if (b && !b.disabled) { e.preventDefault(); holdStart(b); } });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => $('#tab-jump').addEventListener(ev, holdEnd));
  $('#tab-jump').addEventListener('keydown', e => { const b = e.target.closest('[data-jumphold]'); if (b && !b.disabled && (e.key === 'Enter' || e.key === ' ') && !e.repeat) { e.preventDefault(); e.stopPropagation(); holdStart(b); } });
  $('#tab-jump').addEventListener('keyup', e => { if (e.key === 'Enter' || e.key === ' ') holdEnd(); });

  // ---------- Ressourcen-Ansicht im Spielfenster: alle Ressourcen als kleine Kacheln auf einer Seite ----------
  let stageView = 'cannon', resAge = -1;
  const ICONS = makeResRenderer(document.createElement('canvas'), J); // nur für Symbol-Bilder
  const tiles = [];
  function buildResGrid() {
    resAge = s.age;
    $('#resGrid').innerHTML = J.MATS.map((m, i) => { const av = s.age >= m.age; return `<div class="rtile ${av ? '' : 'off'}" data-i="${i}">
      <canvas class="rtc" data-i="${i}" aria-label="${esc(m.place)} – antippen zum Abbauen"></canvas>
      <div class="rt-head"><span>${ic(i)} ${esc(m.name)}</span><b data-cnt="${i}">${J.fmtNum(s.mats[m.id])}</b></div>
      ${av ? `<div class="rt-sub muted small" data-sub="${i}"></div><div class="rt-btns"><button class="btn small" data-ract="worker" data-i="${i}"></button><button class="btn small sec" data-ract="tool" data-i="${i}"></button></div><button class="btn small trade" data-trade="${i}" hidden>⇄ Tauschen</button>` : `<div class="muted small">ab ${esc(J.AGES[m.age].name)}</div>`}</div>`; }).join('');
    tiles.length = 0;
    document.querySelectorAll('#resGrid .rtc').forEach(cv => { const rr = makeResRenderer(cv, J, { compact: true }); rr.resize(); tiles.push(rr); });
    updateResGrid(true);
  }
  function updateResGrid(force) {
    if (resAge !== s.age) return buildResGrid();
    J.MATS.forEach((m, i) => {
      const el = document.querySelector(`[data-cnt="${i}"]`); if (el) el.textContent = J.fmtNum(s.mats[m.id]);
      if (s.age < m.age) return;
      const inf = J.resInfo(s, i), r = s.res[i];
      const sub = document.querySelector(`[data-sub="${i}"]`); if (sub) sub.textContent = r.wk ? '👷 ' + r.wk + ' · ' + J.fmtNum(inf.perMin) + '/min' : 'nur Klicken';
      const w = document.querySelector(`[data-ract="worker"][data-i="${i}"]`), t = document.querySelector(`[data-ract="tool"][data-i="${i}"]`);
      const wh = `👷 ${COIN()} ${J.fmtNum(inf.workCost)}`, th = `🔨 ${COIN()} ${J.fmtNum(inf.toolCost)}`;
      if (w) { if (force || w.dataset.c !== wh) { w.innerHTML = wh; w.dataset.c = wh; } w.disabled = s.gold < inf.workCost; w.title = 'Arbeiter einstellen (' + r.wk + ')'; }
      const tr = document.querySelector(`[data-trade="${i}"]`); if (tr) { tr.hidden = !J.canTrade(s, i); tr.disabled = !J.neededMats(s).some(id => s.mats[m.id] >= J.tradeRate(i, J.MATS.findIndex(x => x.id === id))); }
      if (t) { if (force || t.dataset.c !== th) { t.innerHTML = th; t.dataset.c = th; } t.disabled = s.gold < inf.toolCost; t.title = 'Werkzeug Stufe ' + (r.tool + 1); }
    });
  }
  // Tausch-Dialog: alles von einer alten Ressource in eine der aktuell gebrauchten
  function showTrade(i) {
    const m = J.MATS[i], have = s.mats[m.id];
    const opts = J.neededMats(s).map(id => { const j = J.MATS.findIndex(x => x.id === id), rate = J.tradeRate(i, j), n = Math.floor(have / rate);
      return `<button class="btn" data-dotrade="${i}:${j}" ${n ? '' : 'disabled'} style="width:100%;margin-top:6px">${ic(i)} ${J.fmtNum(Math.ceil(n * rate))} → ${ic(j)} ${J.fmtNum(n)} ${esc(J.MATS[j].name)}</button>
        <div class="muted small">Kurs: ${String(rate.toFixed(1)).replace('.', ',')} ${esc(m.name)} = 1 ${esc(J.MATS[j].name)}</div>`; }).join('');
    modal(`<h2>⇄ ${esc(m.name)} tauschen</h2><p class="muted">${esc(m.name)} brauchst du in der ${esc(J.AGES[s.age].name)} nicht mehr. Tausche deinen Vorrat (${J.fmtNum(have)}) gegen eine Ressource, die du jetzt brauchst. Der Händler behält die Hälfte als Gebühr.</p>${opts}<button class="btn sec" data-close style="width:100%;margin-top:10px">Abbrechen</button>`);
  }
  // ---------- Farm-Welt: säen, gießen, ernten, verkaufen; Beete, Sorten und Bots kaufen ----------
  let farmR = null, farmSig = '';
  const CROP_IC = { weizen: '🌾', mais: '🌽', kuerbis: '🎃', blume: '🌻', gold: '✨' };
  function openFarm() {
    J.farmOf(s);
    if (!farmR) {
      $('#farmView').innerHTML = `<canvas id="farmCv" class="farm-cv" aria-label="Farm – Beete antippen"></canvas><div class="farm-ui" id="farmUi"></div>`;
      farmR = makeFarmRenderer($('#farmCv'));
      $('#farmCv').addEventListener('pointerdown', farmTap);
      $('#farmUi').addEventListener('click', farmClick);
    }
    farmR.resize(); farmSig = ''; renderFarm();
    if (!s.farm.sold && !s.farm.tip) { s.farm.tip = 1; toast('🌾 Willkommen auf der Farm! Tippe ein Beet an: <b>säen</b>, dann <b>gießen</b>, später <b>ernten</b>. Die Ernte verkaufst du unten für Gold.'); }
  }
  function farmTap(e) {
    const r = e.currentTarget.getBoundingClientRect(), i = farmR.slotAt(e.clientX - r.left, e.clientY - r.top), f = s.farm;
    if (i < 0) return;
    if (i >= f.plots.length) { if (i === f.plots.length) { if (J.buyPlot(s)) { sfx('buy'); toast('Neues Beet angelegt (' + f.plots.length + '/' + J.FARM_MAX + ')'); save(); renderFarm(); } else toast('Ein neues Beet kostet ' + COIN() + ' ' + J.fmtNum(J.plotCost(s))); } return; }
    const res = J.farmAct(s, i);
    if (!res) return;
    if (res.err === 'seed') { toast('Kein Saatgut für ' + CROP_IC[f.sel] + ' ' + esc(J.cropOf(f.sel).name) + '. Kauf unten neues.'); sfx('bad'); return; }
    if (res.act === 'wait') { const p = f.plots[i], cr = J.cropOf(p.crop); toast(CROP_IC[p.crop] + ' ' + esc(cr.name) + ' wächst noch ' + Math.ceil(cr.time - p.t) + ' s'); return; }
    farmR.act(i, res.act, res.crop, res.crop ? J.cropOf(res.crop).name : ''); sfx(res.act === 'harvest' ? 'star' : 'tap'); renderFarm();
  }
  function farmClick(e) {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    const f = s.farm, d = b.dataset;
    if (d.fsel) { f.sel = d.fsel; sfx('click'); }
    else if (d.fsell != null) { const g = J.farmSell(s); if (g) { sfx('perfect'); farmR.money('+' + J.fmtNum(g) + ' Gold'); toast('Ernte verkauft: ' + COIN() + ' +' + J.fmtNum(g)); } }
    else if (d.fseed) { if (J.buySeeds(s, d.fseed, +d.n || 1)) sfx('buy'); }
    else if (d.fplot != null) { if (J.buyPlot(s)) sfx('buy'); }
    else if (d.fcrop) { if (J.buyCrop(s, d.fcrop)) { sfx('up'); toast('Neue Sorte: ' + CROP_IC[d.fcrop] + ' <b>' + esc(J.cropOf(d.fcrop).name) + '</b>'); } }
    else if (d.ffert != null) { if (J.buyFert(s)) { sfx('up'); toast('🧪 Dünger Stufe ' + f.fert + ': Pflanzen wachsen ' + Math.round((J.growSpeed(s) - 1) * 100) + ' % schneller'); } }
    else if (d.fbot) { if (J.buyBot(s, d.fbot)) { sfx('up'); const bd = J.BOTS.find(x => x.id === d.fbot); toast('🤖 ' + esc(bd.name) + ' Stufe ' + f.bots[d.fbot]); } }
    save(); farmSig = ''; renderFarm(); renderHud();
  }
  // Roter Hinweis am Farm-Tab, wenn dort etwas zu tun ist (Nico)
  let farmBadgeT = 0, farmBadgeTxt = null;
  function updateFarmBadge(dt) {
    farmBadgeT -= dt; if (farmBadgeT > 0) return; farmBadgeT = 0.5;
    const todo = J.farmTodo(s), el = $('#farmBadge'); if (!el) return;
    const txt = todo.length ? String(todo.length) : '';
    if (txt === farmBadgeTxt) return; farmBadgeTxt = txt;
    el.hidden = !todo.length; el.textContent = txt; el.title = todo.map(x => x.txt).join(', ');
    if (stageView === 'farm') renderFarm();
  }
  function renderFarm() {
    const f = s.farm; if (!f || !farmR) return;
    const val = J.grainValue(s), sig = JSON.stringify([J.farmTodo(s).map(x => x.txt).join(), f.sel, f.seeds, f.grain, f.crops, f.bots, f.plots.length, f.fert, Math.floor(s.gold)]);
    if (sig === farmSig) return; farmSig = sig;
    const mine = J.CROPS.filter(c => f.crops[c.id]);
    const todo = J.farmTodo(s);
    let h = todo.length ? `<div class="farm-todo"><b>Zu tun</b>${todo.map(x => `<div>${x.icon} ${esc(x.txt)}</div>`).join('')}</div>` : '';
    h += `<div class="farm-row">${mine.map(c => `<button class="ammo-chip ${f.sel === c.id ? 'on' : ''}" data-fsel="${c.id}" title="Säen: ${esc(c.name)}">${CROP_IC[c.id]} <span>${f.seeds[c.id] || 0}</span></button>`).join('')}<span class="muted small">Saatgut zum Säen wählen</span></div>`;
    const inv = Object.keys(f.grain).filter(k => f.grain[k] > 0).map(k => CROP_IC[k] + ' ' + f.grain[k]).join(' · ');
    h += `<div class="card farm-store"><div class="info"><b>Lager</b> <span class="muted">${inv || 'noch leer'}</span></div><button class="btn ready-sell" data-fsell ${val >= 1 ? '' : 'disabled'}>Verkaufen ${COIN()} ${J.fmtNum(val)}</button></div>`;
    const cr = J.cropOf(f.sel), sc = J.seedCost(s, f.sel);
    h += `<div class="card upg"><div class="ammo-ic">${CROP_IC[f.sel]}</div><div class="info"><div class="name">Saatgut: ${esc(cr.name)}</div><div class="muted">wächst ${Math.round(cr.time / J.growSpeed(s))} s · bringt je Beet ${COIN()} ${J.fmtNum(Math.max(1, J.sellPrice(s, f.sel)))}</div></div>
      <div class="col-btns"><button class="btn" data-fseed="${f.sel}" data-n="1" ${s.gold >= sc ? '' : 'disabled'}>${J.SEED_PACK}× ${COIN()} ${J.fmtNum(sc)}</button><button class="btn sec" data-fseed="${f.sel}" data-n="4" ${s.gold >= sc * 4 ? '' : 'disabled'}>${J.SEED_PACK * 4}× ${COIN()} ${J.fmtNum(sc * 4)}</button></div></div>`;
    if (f.plots.length < J.FARM_MAX) { const pc = J.plotCost(s); h += `<div class="card upg"><div class="ammo-ic">🟫</div><div class="info"><div class="name">Neues Beet <span class="muted">· ${f.plots.length}/${J.FARM_MAX}</span></div><div class="muted">Mehr Beete, mehr Ernte.</div></div><button class="btn" data-fplot ${s.gold >= pc ? '' : 'disabled'}>${COIN()} ${J.fmtNum(pc)}</button></div>`; }
    { const fl = f.fert || 0, fc = J.fertCost(s);
      h += `<div class="card upg"><div class="ammo-ic">🧪</div><div class="info"><div class="name">Dünger <span class="muted">· ${fl ? 'Stufe ' + fl + '/' + J.FERT_MAX : 'nicht gekauft'}</span></div><div class="muted">Saat wächst schneller: ${fl ? '+' + Math.round(fl * 30) + ' %' : 'normal'}${fl < J.FERT_MAX ? ', nächste Stufe +' + Math.round((fl + 1) * 30) + ' %' : ''}</div></div>
        ${fl >= J.FERT_MAX ? '<span>✅</span>' : `<button class="btn" data-ffert ${s.gold >= fc ? '' : 'disabled'}>${COIN()} ${J.fmtNum(fc)}</button>`}</div>`; }
    h += '<h4 class="sub">Sorten</h4>';
    J.CROPS.forEach(c => {
      if (f.crops[c.id]) return; const cc = J.cropCost(s, c.id);
      h += `<div class="card upg"><div class="ammo-ic">${CROP_IC[c.id]}</div><div class="info"><div class="name">${esc(c.name)}</div><div class="muted">wächst ${Math.round(c.time / J.growSpeed(s))} s · bringt je Beet ${COIN()} ${J.fmtNum(Math.max(1, J.sellPrice(s, c.id)))}</div></div><button class="btn" data-fcrop="${c.id}" ${s.gold >= cc ? '' : 'disabled'}>${COIN()} ${J.fmtNum(cc)}</button></div>`;
    });
    h += '<h4 class="sub">Bots</h4>';
    J.BOTS.forEach(bd => {
      const lv = f.bots[bd.id] || 0, bc = J.botCost(s, bd.id);
      h += `<div class="card upg"><div class="ammo-ic">🤖</div><div class="info"><div class="name">${esc(bd.name)} <span class="muted">· ${lv ? 'Stufe ' + lv : 'nicht gekauft'}</span></div><div class="muted">${esc(bd.desc)}${lv ? ', alle ' + (3 / lv).toFixed(1).replace('.', ',') + ' s' : ''}</div></div>
        ${lv >= 5 ? '<span>✅</span>' : `<button class="btn" data-fbot="${bd.id}" ${s.gold >= bc ? '' : 'disabled'}>${lv ? 'Schneller' : 'Kaufen'} ${COIN()} ${J.fmtNum(bc)}</button>`}</div>`;
    });
    h += `<div class="muted small" style="margin:8px 2px">Die Farm gehört zu diesem Lauf und beginnt nach einem Zeitsprung von vorn. Pflanzen wachsen auch, wenn das Spiel zu ist, Bots arbeiten nur bei geöffnetem Spiel.</div>`;
    $('#farmUi').innerHTML = h;
  }
  const onCanvas = () => stageView === 'cannon' || stageView === 'train';
  function setStageView(v) {
    if (v === 'train' && stageView !== 'train' && phase !== 'idle') { toast('Erst den Schuss abwarten'); return; }
    if (stageView === 'train' && v !== 'train') { if (phase === 'aim') { phase = 'idle'; view.bar = null; updateFire(); } if (chal && chal.train) endChallenge(); }
    stageView = v;
    document.querySelectorAll('.viewsw button').forEach(b => b.classList.toggle('on', b.dataset.view === v));
    $('#cannonView').hidden = !onCanvas(); $('#resView').hidden = v !== 'res'; $('#farmView').hidden = v !== 'farm';
    if (onCanvas()) layout();
    if (v === 'train') startTraining();
    if (v === 'res') { if (resAge !== s.age || !tiles.length) buildResGrid(); tiles.forEach(t => t.resize()); updateResGrid(true); }
    if (v === 'farm') openFarm();
  }
  function drawResStage(dt) {
    tiles.forEach((rr, i) => { const r = s.res[i]; rr.draw({ i, t: view.time, dt, wk: r.wk, tool: r.tool, p: r.p, count: s.mats[J.MATS[i].id], avail: s.age >= J.MATS[i].age, lockName: J.AGES[J.MATS[i].age].name, cycle: J.P.cycle }); });
  }
  $('#resGrid').addEventListener('pointerdown', e => {
    const cv = e.target.closest('.rtc'); if (!cv) return;
    const i = +cv.dataset.i; if (s.age < J.MATS[i].age) return;
    const n = J.tap(s, i); tiles[i].tap(i, n); sfx(n ? 'star' : 'tap'); updateResGrid();
  });
  $('#resGrid').addEventListener('click', e => {
    const tb = e.target.closest('button[data-trade]'); if (tb && !tb.disabled) return showTrade(+tb.dataset.trade);
    const b = e.target.closest('button[data-ract]'); if (!b || b.disabled) return;
    if (J.resAction(s, +b.dataset.i, b.dataset.ract)) { sfx('buy'); save(); updateResGrid(); }
  });
  document.querySelectorAll('.viewsw button').forEach(b => b.addEventListener('click', () => setStageView(b.dataset.view)));
  $('#mats').addEventListener('click', e => { const p = e.target.closest('[data-mat]'); if (!p) return; setStageView('res'); const t = document.querySelector(`.rtile[data-i="${p.dataset.mat}"]`); if (t) t.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });

  function renderChal() {
    let h = '<div class="muted" style="margin-bottom:8px">Challenges kannst du jederzeit spielen. Jede bringt einen dauerhaften Bonus und ist danach abgeschlossen.</div>';
    J.CHALLENGES.forEach(c => {
      const done = !!s.ch[c.id], open = s.age >= c.minAge;
      h += `<div class="card upg ${done ? 'done-soft' : ''}"><div class="info"><div class="name">${done ? '✅ ' : ''}${esc(c.name)}</div>
        <div class="muted">${esc(c.desc)}</div><div class="costs"><span class="cost">Bonus: ${J.bonusText(c.bonus)}</span>${open ? '' : `<span class="cost miss">ab ${esc(J.AGES[c.minAge].name)}</span>`}</div></div>
        ${done ? '<span class="cost ok">Geschafft ✓</span>' : `<button class="btn" data-chal="${c.id}" ${open && phase === 'idle' && (!chal || chal.train) ? '' : 'disabled'}>Starten</button>`}</div>`;
    });
    $('#tab-chal').innerHTML = h;
  }

  // ---------- Bestenliste (auf diesem Gerät) ----------
  function scoreEntry() { return { name: s.name || 'Ich', jumps: s.meta.jumps, dist: s.record, ups: s.st.ups, win: s.st.winShots || null, perfect: s.st.perfect, ch: Object.keys(s.ch).length, parts: s.st.parts, age: s.age }; }
  function updateScore() {
    if (!s.name) return;
    const all = store(SCORES) || {};
    all[s.name] = scoreEntry(); store(SCORES, all);
  }
  const CATS = [
    { key: 'dist', name: 'Weiteste Distanz', fmt: v => J.fmtKm(v), desc: true },
    { key: 'ups', name: 'Meiste Upgrades', fmt: v => J.fmtNum(v), desc: true },
    { key: 'win', name: 'Wenigste Schüsse bis 1.000 km', fmt: v => J.fmtNum(v) + ' Schüsse', desc: false },
    { key: 'perfect', name: 'Meiste perfekte Schüsse', fmt: v => J.fmtNum(v), desc: true },
    { key: 'parts', name: 'Meiste zerstörte Hindernis-Teile', fmt: v => J.fmtNum(v), desc: true },
    { key: 'jumps', name: 'Meiste Zeitsprünge', fmt: v => J.fmtNum(v), desc: true },
    { key: 'ch', name: 'Meiste Challenges', fmt: v => v + '/' + J.CHALLENGES.length, desc: true },
  ];
  function renderScores() {
    let h = `<div class="card"><label class="muted" for="pname">Dein Name in der Bestenliste</label>
      <div class="row" style="margin-top:4px"><input id="pname" class="inp" maxlength="20" value="${esc(s.name || '')}" placeholder="Name eingeben"><button class="btn" data-pname>Speichern</button></div>
      <div class="muted small" style="margin-top:6px">Die Bestenliste liegt vorerst nur auf diesem Gerät. Jeder Spielstand mit eigenem Namen bekommt einen Eintrag (Menü → Neuer Spieler).</div></div>`;
    const all = Object.values(store(SCORES) || {});
    if (s.name) { const me = all.find(e => e.name === s.name); if (me) Object.assign(me, scoreEntry()); else all.push(scoreEntry()); }
    if (!all.length) h += '<div class="card muted">Gib einen Namen ein, dann erscheinen deine Werte hier.</div>';
    CATS.forEach(c => {
      const rows = all.filter(e => e[c.key] != null && e[c.key] > 0).sort((a, b) => c.desc ? b[c.key] - a[c.key] : a[c.key] - b[c.key]).slice(0, 10);
      h += `<div class="card"><b>${c.name}</b>`;
      h += rows.length ? '<ol class="board">' + rows.map(e => `<li class="${e.name === s.name ? 'me' : ''}"><span>${esc(e.name)}</span><b>${c.fmt(e[c.key])}</b></li>`).join('') + '</ol>' : '<div class="muted small">Noch kein Eintrag.</div>';
      h += '</div>';
    });
    $('#tab-scores').innerHTML = h;
  }

  function renderAll() {
    renderHud();
    if (tab === 'cannon') renderCannon(); else if (tab === 'chal') renderChal(); else if (tab === 'jump') renderJump(); else if (tab === 'shop') renderShop(); else renderScores();
    renderAmmoBar();
  }

  // ---------- Shop: Munition und Schreine ----------
  const pctTxt = v => '+' + (Math.round(v * 1000) / 10).toString().replace('.', ',') + ' %';
  function renderShop() {
    let h = '<h4 class="sub" style="margin-top:2px">Munition</h4><div class="muted small" style="margin:-2px 2px 8px">Lade sie unten im Spielfeld in die Kanone. Munition gilt für diesen Lauf.</div>';
    J.AMMO.filter(a => a.price).forEach(a => {
      const c = J.ammoCost(s, a.id), n = s.ammo[a.id] || 0;
      h += `<div class="card upg"><div class="ammo-ic">${a.icon}</div><div class="info"><div class="name">${esc(a.name)} <span class="muted">· Vorrat ${n}</span></div><div class="muted">${esc(a.desc)}</div></div>
        <button class="btn" data-ammo="${a.id}" ${s.gold >= c ? '' : 'disabled'}>${J.AMMO_PACK}× ${COIN()} ${J.fmtNum(c)}</button></div>`;
    });
    const sum = J.shrineSum(s), own = s.shrines.length;
    h += `<h4 class="sub">Schreine</h4><div class="card shrine-sum"><b>⛩️ ${own} ${own === 1 ? 'Schrein' : 'Schreine'} aufgestellt</b><div class="muted">${own ? J.SHRINE.filter(d => sum[d.k] > 0).map(d => d.icon + ' ' + pctTxt(sum[d.k]) + ' ' + d.txt.replace('% ', '')).join(' · ') : 'Schreine verbessern deine Kanone dauerhaft für diesen Lauf. Jeder weitere wird teurer.'}</div></div>`;
    J.shrineOffers(s).forEach((o, i) => {
      const d = J.SHRINE.find(x => x.k === o.k), c = J.shrineCost(s, o);
      h += `<div class="card upg shrine"><canvas class="shrine-cv" data-shrinecv="${o.k}" width="88" height="88"></canvas><div class="info"><div class="name">${esc(d.name)}</div><div class="shrine-eff">${d.icon} ${esc(J.shrineText(o))}</div></div>
        <button class="btn" data-shrine="${i}" ${s.gold >= c ? '' : 'disabled'}>${COIN()} ${J.fmtNum(c)}</button></div>`;
    });
    h += `<button class="btn sec" data-reroll style="width:100%" ${s.gold >= J.rerollCost(s) ? '' : 'disabled'}>🎲 Neue Schreine anbieten · ${COIN()} ${J.fmtNum(J.rerollCost(s))}</button>`;
    $('#tab-shop').innerHTML = h;
    document.querySelectorAll('canvas[data-shrinecv]').forEach(cv => R.drawShrine(cv, cv.dataset.shrinecv, s.age));
  }
  // Munitionsauswahl im Spielfeld (nur sichtbar, wenn Spezialmunition im Vorrat ist)
  function renderAmmoBar() {
    const el = $('#ammoBar'), have = J.AMMO.filter(a => !a.price || (s.ammo[a.id] || 0) > 0);
    const h = have.length > 1 ? have.map(a => `<button class="ammo-chip ${s.ammoSel === a.id ? 'on' : ''}" data-sel="${a.id}" title="${esc(a.name)}: ${esc(a.desc)}">${a.icon} <span>${a.price ? s.ammo[a.id] : '∞'}</span></button>`).join('') : '';
    if (h !== renderAmmoBar.h) { renderAmmoBar.h = h; el.innerHTML = h; el.hidden = !h; if (onCanvas()) layout(); }
  }
  $('#ammoBar').addEventListener('click', e => {
    const b = e.target.closest('[data-sel]'); if (!b) return;
    s.ammoSel = b.dataset.sel; sfx('click'); renderAmmoBar();
    const a = J.AMMO.find(x => x.id === s.ammoSel); if (a.price) toast(a.icon + ' <b>' + esc(a.name) + '</b> geladen: ' + esc(a.desc));
  });

  // Leichte Aktualisierung ohne Neuaufbau
  let sig = '';
  function tickUI() {
    renderHud();
    if (stageView === 'res') updateResGrid();
    if (stageView === 'farm') renderFarm();
    let nsig = tab + '|' + phase + (chal ? 'c' : '');
    if (tab === 'cannon') nsig += J.upgList(s).map(u => J.canAfford(s, u.cost) ? 1 : 0).join('') + J.canAgeUp(s) + Object.values(s.mats).join(',');
    if (tab === 'shop') nsig += J.AMMO.map(a => s.gold >= J.ammoCost(s, a.id) ? 1 : 0).join('') + J.shrineOffers(s).map(o => s.gold >= J.shrineCost(s, o) ? 1 : 0).join('') + s.shrines.length;
    if (tab === 'jump') nsig += s.meta.sp + '|' + J.jumpPreview(s).n + '|' + Math.round(s.runRec * 100);
    if (nsig !== sig && !(tab === 'jump' && document.querySelector('.btn.jump.hold'))) {
      sig = nsig;
      if (tab === 'cannon') renderCannon();
      else if (tab === 'chal') renderChal();
      else if (tab === 'jump') renderJump();
      else if (tab === 'shop') renderShop();
    }
  }

  function toast(t) { const el = $('#toast'); el.innerHTML = t; el.classList.add('show'); clearTimeout(toast.h); toast.h = setTimeout(() => el.classList.remove('show'), 3200); }
  function modal(html) { $('#modalCard').innerHTML = html; $('#modal').hidden = false; }
  function closeModal() { $('#modal').hidden = true; }

  // Aufstieg als kleine Show: Kanone verwandelt sich, Lichtstrahlen, Feuerwerk, großer Titel – danach die Info
  function doAgeUp() {
    if (phase !== 'idle' || !J.ageUp(s)) return;
    const a = J.AGES[s.age];
    if (s.freeUpg) { const n = s.freeUpg; setTimeout(() => toast('🎁 ' + n + ' offene Upgrades geschenkt'), 2600); } s.freeUpg = 0;
    if (chal) endChallenge();
    if (stageView !== 'cannon') setStageView('cannon');
    phase = 'ageup'; phaseT = 0; updateFire(); zoom = 1;
    view.ageFx = { t: 0, from: s.age - 1, to: s.age, name: a.name, cannon: a.cannon, rockets: [], next: 0 };
    view.event = null; view.stars = []; view.preview = []; view.trail = []; view.lastLand = null;
    save(); sig = ''; renderAll();
    [0, 0.15, 0.3, 0.5].forEach((d, k) => setTimeout(() => sfx(k === 3 ? 'up' : 'perfect'), d * 1000));
  }
  function ageFxStep(dt) {
    const f = view.ageFx; f.t += dt;
    if (f.t > 1.1 && !f.boom) { f.boom = true; view.shake = 0.6; sfx('up'); burst(view.x0, view.groundY - 30, '#ffffff', 30); burst(view.x0, view.groundY - 30, '#ffd23f', 30); }
    f.next -= dt;
    if (f.t > 1.0 && f.t < 4.2 && f.next <= 0) { // Raketen starten
      f.next = 0.18 + Math.random() * 0.2;
      f.rockets.push({ x: view.W * (0.15 + Math.random() * 0.75), y: view.groundY, vy: -(view.groundY * (1.3 + Math.random() * 0.5)), ty: view.groundY * (0.15 + Math.random() * 0.35), col: ['#ff5ab4', '#ffd23f', '#5ee07a', '#4be3ff', '#ff8a3d', '#b58cff'][Math.floor(Math.random() * 6)] });
      sfx('boost');
    }
    f.rockets.forEach(r => { r.y += r.vy * dt; if (Math.random() < 0.6) view.parts.push({ x: r.x, y: r.y, vx: 0, vy: 20, r: 1.5, life: 0.3, col: '#ffe9a0', dust: true });
      if (r.y <= r.ty && !r.done) { r.done = true; sfx('star');
        for (let k = 0; k < 42; k++) { const ang = k / 42 * Math.PI * 2, sp = 90 + Math.random() * 110; view.parts.push({ x: r.x, y: r.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40, r: 2 + Math.random() * 1.5, life: 1 + Math.random() * 0.6, col: k % 5 ? r.col : '#fff', spark: true }); } } });
    f.rockets = f.rockets.filter(r => !r.done);
    if (f.t > 5) {
      view.ageFx = null; phase = 'idle'; updateFire();
      syncObstacles(); spawnEvent(); spawnStars(); computePreview(); sig = ''; renderAll();
      modal(`<h2>🎉 ${esc(f.name)}!</h2><p>Deine Kanone ist jetzt ein <b>${esc(f.cannon)}</b>. Wähle, wer in diesem Zeitalter schießt:</p>${skinPicker()}
        <p class="muted">Neue Ressource: ${icOf(J.MATS[s.age + 1])} ${esc(J.MATS[s.age + 1].name)} (${esc(J.MATS[s.age + 1].place)}). Die Zielhilfe beginnt wieder bei Stufe 0. Unterwegs triffst du jetzt auf: ${esc(J.AGES[s.age].flyer)}.</p>
        <button class="btn" data-close style="width:100%">Weiter</button>`); paintSkins($('#modalCard'));
    }
  }

  // Große Siegesshow bei 1.000 km: Riesenfeuerwerk, Flugzeug schreibt in den Himmel, Smiley mit Krone, Konfetti
  function startWinShow() {
    if (phase !== 'idle' && phase !== 'land') return showWin();
    if (stageView !== 'cannon') setStageView('cannon');
    phase = 'win'; phaseT = 0; view.bar = null; updateFire(); closeModal();
    view.winFx = { t: 0, rockets: [], next: 0, conf: [] };
    [0, 0.2, 0.4, 0.7].forEach((d, k) => setTimeout(() => sfx(k === 3 ? 'up' : 'perfect'), d * 1000));
  }
  function winFxStep(dt) {
    const f = view.winFx; f.t += dt; f.next -= dt;
    const cols = ['#ff5ab4', '#ffd23f', '#5ee07a', '#4be3ff', '#ff8a3d', '#b58cff', '#ffffff'];
    if (f.t < 9.2 && f.next <= 0) {
      f.next = 0.07 + Math.random() * 0.14;
      f.rockets.push({ x: view.W * (0.08 + Math.random() * 0.84), y: view.groundY, vy: -(view.groundY * (1.4 + Math.random() * 0.6)), ty: view.groundY * (0.08 + Math.random() * 0.4), col: cols[Math.floor(Math.random() * 6)], big: Math.random() < 0.3 });
      if (Math.random() < 0.4) sfx('boost');
    }
    f.rockets.forEach(r => { r.y += r.vy * dt; if (Math.random() < 0.7) view.parts.push({ x: r.x, y: r.y, vx: 0, vy: 20, r: 1.5, life: 0.3, col: '#ffe9a0', dust: true });
      if (r.y <= r.ty && !r.done) { r.done = true; if (Math.random() < 0.5) sfx('star');
        const n = r.big ? 90 : 50;
        for (let k = 0; k < n; k++) { const ang = k / n * Math.PI * 2, sp = (r.big ? 140 : 90) + Math.random() * 110; view.parts.push({ x: r.x, y: r.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp - 40, r: 2 + Math.random() * 1.6, life: 1.1 + Math.random() * 0.7, col: k % 4 ? r.col : '#fff', spark: true }); } } });
    f.rockets = f.rockets.filter(r => !r.done);
    if (f.conf.length < 140 && f.t > 0.5) for (let k = 0; k < 3; k++) f.conf.push({ x: Math.random() * view.W, y: -10, vx: (Math.random() - 0.5) * 40, vy: 50 + Math.random() * 70, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, col: cols[Math.floor(Math.random() * 7)], w: 4 + Math.random() * 4 });
    f.conf.forEach(p => { p.x += (p.vx + Math.sin(f.t * 3 + p.rot) * 30) * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.y > view.H + 10) { p.y = -10; p.x = Math.random() * view.W; } });
    if (f.t > 4.2 && !f.boom) { f.boom = true; sfx('up'); view.shake = 0.5; }
    if (f.t > 10.5) endWinShow();
  }
  function endWinShow() { if (phase !== 'win') return; view.winFx = null; phase = 'idle'; view.ball = null; view.flyers = []; shot = null; spawnStars(); updateFire(); computePreview(); showWin(); }
  function showWin() {
    modal(`<h2>🏆 Durchgespielt!</h2><p>Du hast <b>${J.fmtKm(J.P.goal)}</b> weit geschossen, nach ${J.fmtNum(s.shots)} Schüssen.</p>
      <p class="muted">Du kannst weiterspielen und deine Werte in der Bestenliste verbessern. Ein Zeitsprung bringt jetzt ${s.meta.winBonus ? '' : J.P.spWin + ' Bonus-Splitter extra, insgesamt '}${J.fmtNum(J.jumpPreview(s).n)} 💠.</p><button class="btn" data-close style="width:100%">Weiter</button>`);
  }

  function showMenu() {
    modal(`<h2>Menü</h2>
      <div class="row"><button class="btn sec" data-menu="sound">Ton: ${sound ? 'an' : 'aus'}</button></div>
      ${DEV ? `<h3 style="margin:14px 0 4px">Testmodus (nur in der Entwickler-Version)</h3>
      <div class="muted">Zum schnellen Durchprobieren aller Zeitalter.</div>
      <div class="row"><button class="btn sec" data-menu="rich">+ Gold &amp; Teile</button><button class="btn sec" data-menu="break">Nächstes Hindernis zerstören</button><button class="btn sec" data-menu="skip">Zeitalter abschließen</button></div>
      <h3 style="margin:14px 0 4px">Entwickler</h3>
      <div class="dev-grid">
        <label>Zeitalter springen <select id="devAge">${J.AGES.map((a, i) => `<option value="${i}" ${i === s.age ? 'selected' : ''}>${i + 1}. ${a.name}</option>`).join('')}</select></label>
        <label>Ereignis auslösen <select id="devEvent"><option value="">– wählen –</option>${EVENTS.map(e => `<option value="${e.type}">${e.icon} ${e.name}</option>`).join('')}</select></label>
      </div>
      <div class="row">
        <button class="btn sec" data-menu="gold10">Gold ×10</button><button class="btn sec" data-menu="mats">+100 alle Teile</button><button class="btn sec" data-menu="hour">+1 Stunde Arbeiter</button>
        <button class="btn sec" data-menu="chAll">Alle Challenges geschafft</button><button class="btn sec" data-menu="chReset">Challenges zurücksetzen</button><button class="btn sec" data-menu="obsReset">Hindernisse des Zeitalters heilen</button>
        <button class="btn sec" data-menu="winshow">Siegesshow ansehen</button><button class="btn sec" data-menu="sp50">+50 Zeitsplitter</button><button class="btn sec" data-menu="wsReset">Zeitwerkstatt zurücksetzen</button>
      </div>
      <div class="dev-toggles">
        ${[['hitbox', 'Trefferzonen anzeigen'], ['fullPreview', 'Ganze Flugbahn zeigen'], ['autoPerfect', 'Immer perfekt auslösen'], ['slowmo', 'Zeitlupe'], ['noEvents', 'Keine Ereignisse'], ['info', 'Debug-Infos']].map(([k, t]) => `<label><input type="checkbox" data-dev="${k}" ${dev[k] ? 'checked' : ''}> ${t}</label>`).join('')}
      </div>` : ''}
      <h3 style="margin:14px 0 4px">Spielstand</h3>
      <div class="row"><button class="btn sec" data-menu="newplayer">Neuer Spieler</button><button class="btn sec" data-menu="reset" style="background:#8f2f25">Neu beginnen</button></div>
      <p class="muted" style="margin-top:14px">Epochenschuss · Version ${VERSION}${DEV ? ' · Entwickler-Version' : ''} · Spielstand liegt nur auf diesem Gerät.</p>
      <button class="btn" data-close style="width:100%;margin-top:6px">Schließen</button>`);
  }

  // ---------- Eingaben ----------
  $('#fire').addEventListener('click', onFire);
  const angleEl = $('#angle'), powerEl = $('#power');
  function setAngle(a) { s.angle = Math.max(10, Math.min(80, Math.round(a))); angleEl.value = s.angle; $('#angTxt').textContent = s.angle + '°'; computePreview(); }
  function setPower(p) { s.power = Math.max(20, Math.min(100, Math.round(p))); powerEl.value = s.power; $('#powTxt').textContent = s.power + ' %'; computePreview(); }
  angleEl.addEventListener('input', () => setAngle(+angleEl.value));
  powerEl.addEventListener('input', () => setPower(+powerEl.value));

  // Zielen per Ziehen, Auslösen per Tippen, Zoomen per Rad / zwei Fingern / Knöpfen
  const pointers = new Map();
  let dragging = false, pinch0 = 0, zoom0 = 1;
  canvas.addEventListener('pointerdown', e => {
    pointers.set(e.pointerId, e);
    if (phase === 'aim') { release(); return; }
    if (phase === 'win' && view.winFx && view.winFx.t > 2.5) { endWinShow(); return; }
    if (phase === 'jump' && phaseT > 0.5 && phaseT < JT.flash) { phaseT = JT.flash - 0.01; return; } // Antippen überspringt die Show
    if (view.riftFx && view.riftFx.t > 1) view.riftFx.t = Math.max(view.riftFx.t, 4.4);
    if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch0 = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); zoom0 = zoom; dragging = false; return; }
    if (phase === 'idle') { dragging = true; canvas.setPointerCapture(e.pointerId); aimAt(e); }
  });
  canvas.addEventListener('pointermove', e => {
    if (!pointers.has(e.pointerId)) return;
    pointers.set(e.pointerId, e);
    if (pointers.size === 2 && pinch0) { const [a, b] = [...pointers.values()]; const d = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY); setZoom(zoom0 * pinch0 / Math.max(10, d)); return; }
    if (dragging) aimAt(e);
  });
  const up = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch0 = 0; dragging = false; };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); if (phase !== 'flight') setZoom(zoom * Math.exp(e.deltaY * 0.0015)); }, { passive: false });
  $('#zOut').addEventListener('click', () => setZoom(zoom * 1.8));
  $('#zIn').addEventListener('click', () => setZoom(zoom / 1.8));
  $('#zReset').addEventListener('click', () => setZoom(1));
  function aimAt(e) {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left - view.x0, y = view.groundY - 20 - (e.clientY - r.top);
    if (x < 5) return;
    setAngle(Math.atan2(y, x) * 180 / Math.PI);
  }
  $('#chalExit').addEventListener('click', () => { if (phase === 'idle' || phase === 'aim') { phase = 'idle'; view.bar = null; updateFire(); endChallenge(); } });

  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') return;
    if (!$('#modal').hidden) { if (e.key === 'Escape' || e.key === 'Enter') closeModal(); return; }
    if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onFire(); }
    if (e.key === 'ArrowUp') { setAngle(s.angle + 1); e.preventDefault(); }
    if (e.key === 'ArrowDown') { setAngle(s.angle - 1); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setPower(s.power + 1); e.preventDefault(); }
    if (e.key === 'ArrowLeft') { setPower(s.power - 1); e.preventDefault(); }
  });

  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    tab = b.dataset.tab;
    document.querySelectorAll('.tabs button').forEach(x => x.classList.toggle('on', x === b));
    document.querySelectorAll('.tab').forEach(x => x.classList.toggle('on', x.id === 'tab-' + tab));
    sig = ''; renderAll();
  }));

  document.querySelector('.panel').addEventListener('click', e => {
    const bt = e.target.closest('button'); if (!bt || bt.disabled) return;
    if (bt.dataset.skin) { pickSkin(+bt.dataset.skin); return; }
    if (bt.dataset.buy) {
      const u = J.buy(s, bt.dataset.buy);
      if (u) { s.st.ups++; sfx('buy'); toast('Gekauft: <b>' + esc(u.name) + '</b>'); computePreview(); save(); sig = ''; renderAll(); }
    } else if (bt.hasAttribute('data-ageup')) doAgeUp();
    else if (bt.dataset.chal) startChallenge(bt.dataset.chal);
    else if (bt.dataset.ammo) { if (J.buyAmmo(s, bt.dataset.ammo)) { const a = J.AMMO.find(x => x.id === bt.dataset.ammo); s.ammoSel = a.id; sfx('buy'); toast(a.icon + ' ' + J.AMMO_PACK + '× ' + esc(a.name) + ' gekauft und geladen'); save(); sig = ''; renderAll(); } }
    else if (bt.dataset.shrine) { const o = J.buyShrine(s, +bt.dataset.shrine); if (o) { sfx('up'); toast('⛩️ Schrein aufgestellt: <b>' + esc(J.shrineText(o)) + '</b>'); computePreview(); save(); sig = ''; renderAll(); } }
    else if (bt.hasAttribute('data-reroll')) { if (J.rerollShrines(s)) { sfx('click'); save(); sig = ''; renderAll(); } }
    else if (bt.dataset.ws) {
      if (J.wsBuy(s, bt.dataset.ws)) { const w = J.WORKSHOP.find(x => x.id === bt.dataset.ws); sfx('buy'); toast('💠 ' + esc(w.name) + ' ' + ROMAN[s.meta.upg[w.id]] ); computePreview(); spawnStars(); save(); sig = ''; renderAll(); updateResGrid(true); }
    }
    else if (bt.hasAttribute('data-pname')) {
      const n = $('#pname').value.trim().slice(0, 20);
      if (n) { s.name = n; save(); toast('Name gespeichert'); renderScores(); }
    }
  });

  $('#btnMenu').addEventListener('click', showMenu);
  $('#modal').addEventListener('change', e => {
    const t = e.target;
    if (!DEV) return;
    if (t.dataset.dev) { dev[t.dataset.dev] = t.checked; store('jushoot-dev', dev); computePreview(); return; }
    if (t.id === 'devEvent' && t.value) { if (chal) endChallenge(); spawnEvent(t.value); spawnStars(); computePreview(); closeModal(); toast('Ereignis: ' + (view.event.label || t.value)); }
    if (t.id === 'devAge') jumpToAge(+t.value);
  });
  // Entwickler: direkt in ein Zeitalter springen (rückwärts = neuer Spielstand mit gleichem Namen)
  function jumpToAge(target) {
    if (phase !== 'idle') return;
    if (chal) endChallenge();
    if (target < s.age) { const keep = { name: s.name, ch: s.ch, meta: s.meta, record: s.record }; s = fresh(keep.name); Object.assign(s, { ch: keep.ch, meta: keep.meta, record: keep.record }); }
    while (s.age < target) {
      J.upgList(s).forEach(u => { if (!u.bought) { s.gold += u.cost.gold; for (const id in u.cost.mats) s.mats[id] += u.cost.mats[id]; } });
      for (let g = 0; g < 20; g++) { const u = J.upgList(s).find(x => !x.bought && !x.locked); if (!u) break; J.buy(s, u.key); }
      J.OBS.filter(o => o.age === s.age).forEach(o => { s.oh[o.id] = s.oh[o.id].map(() => 0); });
      J.ageUp(s);
    }
    view.record = s.record; view.lastLand = null; view.trail = [];
    syncObstacles(); spawnEvent(); spawnStars(); computePreview(); save(); closeModal(); sig = ''; renderAll();
    toast('Zeitalter: ' + J.AGES[s.age].name);
  }
  $('#modal').addEventListener('click', e => {
    if (e.target.id === 'modal' || e.target.closest('[data-close]')) { closeModal(); return; }
    const sk = e.target.closest('[data-skin]'); if (sk) { pickSkin(+sk.dataset.skin); return; }
    const ch = e.target.closest('[data-chal]'); if (ch) { closeModal(); startChallenge(ch.dataset.chal); return; }
    const tdo = e.target.closest('[data-dotrade]'); if (tdo && !tdo.disabled) { const [i, j] = tdo.dataset.dotrade.split(':').map(Number); const n = J.trade(s, i, j); closeModal(); if (n) { sfx('buy'); toast('Getauscht: ' + ic(j) + ' +' + J.fmtNum(n) + ' ' + esc(J.MATS[j].name)); save(); sig = ''; renderAll(); updateResGrid(true); } return; }
    const m = e.target.closest('[data-menu]'); if (!m) return;
    const k = m.dataset.menu;
    if (!DEV && !['sound', 'newplayer', 'reset'].includes(k)) return;
    const cost = J.upgCost(s.age, 3, J.P.steps - 1);
    if (k === 'gold10') { s.gold = Math.max(s.gold * 10, cost.gold * 5); toast('Gold: ' + J.fmtNum(s.gold)); }
    if (k === 'mats') { J.MATS.forEach(mt => { s.mats[mt.id] += Math.max(100, cost.mats[mt.id] || 0); }); toast('Teile aufgefüllt'); }
    if (k === 'hour') { const got = J.tickRes(s, 3600); offlineToast({ got }); }
    if (k === 'chAll') { J.CHALLENGES.forEach(c => { s.ch[c.id] = true; }); toast('Alle Challenge-Boni aktiv'); }
    if (k === 'chReset') { s.ch = {}; toast('Challenges zurückgesetzt'); }
    if (k === 'obsReset') { J.OBS.filter(o => o.age === s.age).forEach(o => { s.oh[o.id] = o.parts.map(p => p.hp); }); syncObstacles(); toast('Hindernisse wiederhergestellt'); }
    if (k === 'sp50') { s.meta.sp += 50; s.meta.earned += 50; toast('+50 Zeitsplitter'); }
    if (k === 'wsReset') { s.meta = J.newMeta(); toast('Zeitwerkstatt und Zeitsplitter zurückgesetzt'); }
    if (['gold10', 'mats', 'hour', 'chAll', 'chReset', 'obsReset', 'sp50', 'wsReset'].includes(k)) { save(); sig = ''; renderAll(); return; }
    if (k === 'winshow') { closeModal(); if (phase === 'idle') { if (chal) endChallenge(); startWinShow(); } return; }
    if (k === 'sound') { sound = !sound; store('jushoot-sound', sound); showMenu(); return; }
    if (k === 'rich') {
      const cost = J.upgCost(s.age, 3, J.P.steps - 1);
      s.gold += cost.gold * 10; for (const id in cost.mats) s.mats[id] += cost.mats[id] * 10;
      toast('Testmodus: Gold und Teile aufgefüllt');
    }
    if (k === 'break') { const o = J.nextBlocking(s); if (o && J.obsState(s, o.id) === 'active') { s.oh[o.id] = s.oh[o.id].map(() => 0); toast(esc(o.name) + ' entfernt'); } else toast('Kein zerstörbares Hindernis'); syncObstacles(); }
    if (k === 'skip') {
      J.upgList(s).forEach(u => { if (!u.bought) { s.gold += u.cost.gold; for (const id in u.cost.mats) s.mats[id] += u.cost.mats[id]; } });
      for (let g = 0; g < 20; g++) { const u = J.upgList(s).find(x => !x.bought && !x.locked); if (!u) break; J.buy(s, u.key); s.st.ups++; }
      J.OBS.filter(o => o.age === s.age).forEach(o => { s.oh[o.id] = s.oh[o.id].map(() => 0); });
      closeModal(); syncObstacles();
      if (J.canAgeUp(s)) doAgeUp(); else { save(); sig = ''; renderAll(); toast('Letztes Zeitalter: alles erledigt'); }
      return;
    }
    if (k === 'reset' || k === 'newplayer') {
      if (m.dataset.sure) {
        s = fresh(k === 'newplayer' ? '' : s.name); setAngle(45); setPower(100); view.record = 0; resAge = -1; view.lastLand = null; view.trail = [];
        if (chal) endChallenge();
        syncObstacles(); spawnEvent(); spawnStars(); save(); closeModal(); sig = '';
        if (k === 'newplayer') { tab = 'scores'; document.querySelector('[data-tab=scores]').click(); } else renderAll();
        return;
      }
      m.dataset.sure = '1'; m.textContent = 'Wirklich? Nochmal tippen'; return;
    }
    closeModal(); save(); sig = ''; renderAll();
  });

  window.addEventListener('resize', () => { if (onCanvas()) layout(); else if (stageView === 'res') tiles.forEach(t => t.resize()); else if (stageView === 'farm' && farmR) farmR.resize(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) save();
    else { const r = J.offline(s, Date.now()); if (r && r.dt > 30) offlineToast(r); }
  });
  window.addEventListener('pagehide', save);
  function offlineToast(r) {
    const parts = Object.keys(r.got).filter(k => r.got[k] > 0).map(k => { const m = J.MATS.find(x => x.id === k); return icOf(m) + ' +' + J.fmtNum(r.got[k]); });
    if (parts.length) toast('Deine Arbeiter waren fleißig: ' + parts.join(' · '));
  }

  // ---------- Start ----------
  $('#coinIc').innerHTML = COIN();
  layout(); setAngle(s.angle || 45); setPower(s.power || 100); syncObstacles(); spawnEvent(); spawnStars();
  view.scale = autoScale(); computePreview(); updateFire(); renderAll();
  if (away && away.dt > 30) offlineToast(away);
  if (s.shots === 0) toast('Tippe <b>Laden</b>, dann im <b style="color:#5ee07a">grünen Bereich</b> auslösen. Triff jedes Teil der Hindernisse.');
  // Nur in der Entwickler-Version: Zugriff für automatische Tests in der Konsole
  if (DEV) window.ES = { spawnEvent, get s() { return s; }, view, J, startChallenge, setStageView, onFire, release, startRift, trainDone: () => trainDone(), setAngle, setPower, jumpToAge, doJump, renderAll, get phase() { return phase; } };
  requestAnimationFrame(frame);
})();
