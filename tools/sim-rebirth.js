// Simuliert mehrere Läufe mit Zeitsprung: Bot spielt wie tools/sim.js, springt, wenn die Splitter pro Minute sinken,
// und kauft danach Zeitwerkstatt-Upgrades (immer das günstigste aus einer Prioritätsliste).
// Aufruf: node tools/sim-rebirth.js   (Varianten per JS_P='{"cAge":4}' node tools/sim-rebirth.js)
global.JS_P = process.env.JS_P ? JSON.parse(process.env.JS_P) : undefined;
require('../core.js');
const J = global.JS;
const SHOT_T = 8, HIT = +(process.env.HIT || 0.5), TAPS = +(process.env.TAPS || 3), MAXJ = +(process.env.MAXJ || 30);
let seed = 7;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

function shoot(s) {
  const st = J.stats(s), R = st.range, o = J.nextBlocking(s);
  let d = R, g = 0;
  if (o && o.at <= R) {
    const reach = x => (R * R - x * x) / (2 * R);
    const parts = o.parts.map((p, i) => ({ p, i })).filter(x => s.oh[o.id][x.i] > 0 && x.p.x <= R && J.partLevel(o, s.oh[o.id], x.i) <= reach(x.p.x + x.p.w / 2));
    if (J.obsState(s, o.id) === 'active' && parts.length && rnd() < HIT) {
      const x = parts[0];
      s.oh[o.id][x.i] -= st.dmg * (rnd() < 0.15 ? J.P.crit : 1);
      if (s.oh[o.id][x.i] > 0) d = o.at;
      if (s.oh[o.id][x.i] <= 0) { g += J.P.partGold * J.shotGold(s, o.at); if (J.obsDone(s, o.id)) g += J.P.obsGold * J.shotGold(s, o.at); }
    }
  }
  g += J.shotGold(s, d) * (1 + 0.25 * (1.2 + 0.3 * (st.stars - 3)));
  s.gold += g; s.shots++; s.record = Math.max(s.record, d); s.runRec = Math.max(s.runRec, d);
  if (d >= J.P.goal) s.won = true;
  J.tickRes(s, SHOT_T);
  const ups = J.upgList(s).filter(u => !u.bought && !u.locked).sort((a, b) => a.cost.gold - b.cost.gold);
  const need = ups[0];
  if (need) { const k = Object.keys(need.cost.mats).find(k => s.mats[k] < need.cost.mats[k]); if (k) for (let i = 0; i < TAPS; i++) J.tap(s, J.MATS.findIndex(m => m.id === k)); }
  for (let guard = 0; guard < 20; guard++) {
    if (J.canAgeUp(s)) { J.ageUp(s); continue; }
    const list = J.upgList(s).filter(x => !x.bought && !x.locked).sort((a, b) => a.cost.gold - b.cost.gold);
    const ua = list.find(x => J.canAfford(s, x.cost));
    if (ua) { J.buy(s, ua.key); continue; }
    const nd = list[0]; if (!nd) break;
    let did = false;
    for (const k in nd.cost.mats) {
      if (s.mats[k] >= nd.cost.mats[k]) continue;
      const i = J.MATS.findIndex(m => m.id === k), inf = J.resInfo(s, i);
      if (inf.toolCost < inf.workCost && s.res[i].wk >= 2) did = J.resAction(s, i, 'tool');
      else did = J.resAction(s, i, 'worker');
      if (did) break;
    }
    if (!did) break;
  }
}

const PRIO = ['lauf', 'kugel', 'ader', 'plaene', 'haende', 'stamm', 'linse', 'kapital', 'kiste', 'schlag', 'hand', 'stern', 'naechte', 'blick'];
let s = J.newState(), total = 0, winAt = null, prevN = 0;
const STALL = +(process.env.STALL || 10);
const out = [];
for (let run = 1; run <= MAXJ; run++) {
  let t = 0, ageT = [], lastN = 0, lastT = 0;
  // Läuft, bis es zäh wird: STALL Minuten ohne neuen Splitter (und mindestens so viele wie im letzten Lauf)
  while (true) {
    const a0 = s.age; shoot(s); t += SHOT_T; if (s.age > a0) ageT.push(Math.round(t / 60));
    if (s.won && winAt == null) winAt = total + t;
    const pv = J.jumpPreview(s);
    if (pv.n > lastN) { lastN = pv.n; lastT = t; }
    if (pv.can && pv.n >= prevN && (t - lastT > STALL * 60 || s.runRec >= J.P.goal)) break;
    if (t > 4 * 3600) break;
  }
  prevN = J.jumpPreview(s).base;
  total += t;
  const r = J.rebirth(s);
  out.push(`Lauf ${String(run).padStart(2)}: ${String(Math.round(t / 60)).padStart(3)} min, ${J.AGES[s.age].name.padEnd(11)} Rekord ${J.fmtKm(s.runRec).padStart(9)}, +${r.got} Splitter · gesamt ${(total / 3600).toFixed(1)} h · Aufstiege bei ${ageT.join('/')} min`);
  s = r.s;
  for (let g = 0; g < 50; g++) {
    const c = J.wsList(s).filter(x => !x.maxed && x.cost <= s.meta.sp).sort((a, b) => a.cost * (1 + PRIO.indexOf(a.w.id) * 0.08) - b.cost * (1 + PRIO.indexOf(b.w.id) * 0.08))[0];
    if (!c) break; J.wsBuy(s, c.w.id);
  }
  if (winAt != null && s.meta.winBonus) break;
}
console.log(out.join('\n'));
console.log(winAt ? `1.000 km erreicht nach ${(winAt / 3600).toFixed(1)} h, ${s.meta.jumps} Zeitsprüngen` : 'Ziel nicht erreicht');
console.log('Zeitwerkstatt:', JSON.stringify(s.meta.upg), 'übrig', s.meta.sp);
