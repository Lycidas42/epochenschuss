// Simuliert einen Durchlauf mit einem einfachen Bot (zielt auf erreichbare Hindernis-Teile, kauft das Günstigste).
// Aufruf: node tools/sim.js   (Varianten per JS_P='{"c0":10}' node tools/sim.js)
global.JS_P = process.env.JS_P ? JSON.parse(process.env.JS_P) : undefined;
require('../core.js');
const J = global.JS;
const s = J.newState();
const SHOT_T = 8;           // Sekunden pro Schuss (Zielen, Flug)
const HIT = +(process.env.HIT || 0.5), TAPS = +(process.env.TAPS || 3);
let t = 0, ageStart = 0, ageT = 0, seed = 7, tObs = null, tUp = null, spentC = 0, spentR = 0, tapM = 0, wkM = 0;
const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
const log = [];
while (!s.won && s.shots < 20000) {
  const st = J.stats(s), R = st.range, o = J.nextBlocking(s);
  let d = R, g = 0; // die Kugel fliegt über Hindernisse; nur ein Treffer ohne Zerstörung stoppt sie
  if (o && o.at <= R) {
    const state = J.obsState(s, o.id);
    const reach = x => (R * R - x * x) / (2 * R); // größte erreichbare Höhe bei Entfernung x
    const parts = o.parts.map((p, i) => ({ p, i })).filter(x => s.oh[o.id][x.i] > 0 && x.p.x <= R && J.partLevel(o, s.oh[o.id], x.i) <= reach(x.p.x + x.p.w / 2));
    if (state === 'active' && parts.length && rnd() < HIT) {
      const x = parts[0];
      s.oh[o.id][x.i] -= st.dmg * (rnd() < 0.15 ? J.P.crit : 1);
      if (s.oh[o.id][x.i] > 0) d = o.at;
      if (s.oh[o.id][x.i] <= 0) { g += J.P.partGold * J.shotGold(s, o.at); if (J.obsDone(s, o.id)) g += J.P.obsGold * J.shotGold(s, o.at); }
    }
  }
  if (!o || d >= J.P.goal) { if (R >= J.P.goal) s.won = true; }
  g += J.shotGold(s, d) * (1 + 0.25 * 1.2);
  s.gold += g; s.shots++; s.record = Math.max(s.record, d);
  t += SHOT_T; { const got = J.tickRes(s, SHOT_T); for (const k in got) wkM += got[k]; }
  if (tObs == null && J.ageObstaclesDone(s)) tObs = t - ageT;

  // Klicken auf die knappste Ressource
  const ups = J.upgList(s).filter(u => !u.bought && !u.locked).sort((a, b) => a.cost.gold - b.cost.gold);
  const need = ups[0];
  if (need) { const k = Object.keys(need.cost.mats).find(k => s.mats[k] < need.cost.mats[k]); if (k) for (let i = 0; i < TAPS; i++) tapM += J.tap(s, J.MATS.findIndex(m => m.id === k)); }
  for (let guard = 0; guard < 20; guard++) {
    if (J.canAgeUp(s)) { J.ageUp(s); log.push(`${J.AGES[s.age - 1].name.padEnd(11)}: ${String(s.shots - ageStart).padStart(4)} Schüsse, ${((t - ageT) / 60).toFixed(0).padStart(3)} min (gesamt ${(t / 60).toFixed(0).padStart(3)}), Rekord ${J.fmtKm(s.record).padStart(8)} · Hindernisse fertig ${(tObs / 60).toFixed(0)} min, Upgrades fertig ${(tUp / 60).toFixed(0)} min · Gold Kanone/Ress ${Math.round(100 * spentC / Math.max(1, spentC + spentR))}/${Math.round(100 * spentR / Math.max(1, spentC + spentR))} % · Teile Klick/Arbeiter ${Math.round(100 * tapM / Math.max(1, tapM + wkM))}/${Math.round(100 * wkM / Math.max(1, tapM + wkM))} %`); ageStart = s.shots; ageT = t; tObs = tUp = null; spentC = spentR = tapM = wkM = 0; continue; }
    const list = J.upgList(s).filter(x => !x.bought && !x.locked).sort((a, b) => a.cost.gold - b.cost.gold);
    const ua = list.find(x => J.canAfford(s, x.cost));
    if (ua) { spentC += ua.cost.gold; J.buy(s, ua.key); if (tUp == null && J.upgradesDone(s)) tUp = t - ageT; continue; }
    const nd = list[0]; if (!nd) break;
    let did = false;
    for (const k in nd.cost.mats) {
      if (s.mats[k] >= nd.cost.mats[k]) continue;
      const i = J.MATS.findIndex(m => m.id === k), inf = J.resInfo(s, i);
      const g0 = s.gold;
      if (inf.toolCost < inf.workCost && s.res[i].wk >= 2) did = J.resAction(s, i, 'tool');
      else did = J.resAction(s, i, 'worker');
      spentR += g0 - s.gold;
      if (did) break;
    }
    if (!did) break;
  }
}
log.push(`Ende: ${s.shots} Schüsse, ${(t / 60).toFixed(0)} min, Zeitalter ${J.AGES[s.age].name}, Rekord ${J.fmtKm(s.record)}, Arbeiter ${s.res.map(r => r.wk).join('/')}, Werkzeug ${s.res.map(r => r.tool).join('/')}`);
console.log(log.join('\n'));
