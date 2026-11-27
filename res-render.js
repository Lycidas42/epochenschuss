// Epochenschuss – Ressourcen-Ansicht (großes Bild im Spielfenster): Abbaustelle, Schütze mit Werkzeug, Arbeiter, Lager-Stapel
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
  const lerp = (a, b, f) => a + (b - a) * Math.max(0, Math.min(1, f));

  function makeResRenderer(canvas, J, opt) {
    const compact = !!(opt && opt.compact); // kleine Kachel: alle Ressourcen auf einer Seite
    let c = canvas.getContext('2d');
    let W = 1, H = 1, dpr = 1, pulse = 0, shake = 0, lastI = -1;
    let chips = [], pops = [], texts = [], smoke = [];

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2.5, window.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }

    const SKY = [['#9fd3f0', '#e8f6d8'], ['#b9c6d1', '#efe7d6'], ['#f0a868', '#fde3b0'], ['#7c8a99', '#cfd6dc'], ['#e9c98f', '#fbf0d8'],
      ['#6b5a55', '#c9a88a'], ['#c8b88a', '#f1e6c4'], ['#8a8a8e', '#d9c7a8'], ['#6fa8dc', '#dff0fb'], ['#140d33', '#3a2a7a']];
    const GROUND = ['#5f8a3a', '#8a8070', '#7a5a34', '#5a4a38', '#a08a5a', '#4e4232', '#8f9a55', '#3d3530', '#606a70', '#1f1a40'];
    const CHIP = [['#8a5a2b', '#3f8a3a', '#d9a86a'], ['#9a978c', '#c9c5b8', '#6d6a62'], ['#ffb347', '#ff6a2a', '#d0873a'], ['#5d5f66', '#a0533a', '#2a2a2e'],
      ['#c9a46a', '#e8d2a0', '#8a6a3a'], ['#ffc04d', '#ff8a2a', '#fff2a0'], ['#333', '#777', '#c9b48a'], ['#b0aaa0', '#ffffff', '#8f8a80'],
      ['#4be3ff', '#2f6b3a', '#ffd23f'], ['#ff7ad9', '#7ff6ff', '#ffffff']];

    // ---------- Die Ressource selbst ----------
    function item(i, x, y, r, rot) {
      c.save(); c.translate(x, y); c.rotate(rot || 0);
      switch (i) {
        case 0: // Holzstamm
          c.fillStyle = '#8a5a2b'; rr(c, -r, -r * 0.42, r * 1.8, r * 0.84, r * 0.3); c.fill();
          c.strokeStyle = '#6b4423'; c.lineWidth = Math.max(1, r * 0.08); c.beginPath(); c.moveTo(-r * 0.7, -r * 0.15); c.lineTo(r * 0.3, -r * 0.15); c.moveTo(-r * 0.5, r * 0.15); c.lineTo(r * 0.5, r * 0.15); c.stroke();
          c.fillStyle = '#e2b77a'; c.beginPath(); c.ellipse(r * 0.8, 0, r * 0.3, r * 0.42, 0, 0, TAU); c.fill();
          c.strokeStyle = '#b07f45'; c.beginPath(); c.ellipse(r * 0.8, 0, r * 0.15, r * 0.22, 0, 0, TAU); c.stroke(); break;
        case 1: // Steinblock
          c.fillStyle = '#8d8a80'; c.beginPath(); c.moveTo(-r, -r * 0.3); c.lineTo(-r * 0.4, -r * 0.75); c.lineTo(r * 0.8, -r * 0.6); c.lineTo(r, r * 0.4); c.lineTo(r * 0.2, r * 0.75); c.lineTo(-r * 0.9, r * 0.5); c.closePath(); c.fill();
          c.fillStyle = '#b5b1a5'; c.beginPath(); c.moveTo(-r, -r * 0.3); c.lineTo(-r * 0.4, -r * 0.75); c.lineTo(r * 0.8, -r * 0.6); c.lineTo(r * 0.2, -r * 0.1); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(r * 0.2, -r * 0.1); c.lineTo(r * 0.2, r * 0.75); c.stroke(); break;
        case 2: // Bronzebarren
          c.fillStyle = '#a8662a'; c.beginPath(); c.moveTo(-r, r * 0.45); c.lineTo(r, r * 0.45); c.lineTo(r * 0.7, -r * 0.4); c.lineTo(-r * 0.7, -r * 0.4); c.closePath(); c.fill();
          c.fillStyle = '#e09a4a'; c.beginPath(); c.moveTo(-r * 0.7, -r * 0.4); c.lineTo(r * 0.7, -r * 0.4); c.lineTo(r * 0.55, -r * 0.05); c.lineTo(-r * 0.55, -r * 0.05); c.closePath(); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(-r * 0.4, -r * 0.33, r * 0.5, r * 0.08); break;
        case 3: // Eisenerz
          c.fillStyle = '#4e5056'; c.beginPath(); for (let k = 0; k < 9; k++) { const a = k / 9 * TAU, rad = r * (0.75 + 0.25 * Math.sin(k * 2.7)); c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad * 0.85); } c.closePath(); c.fill();
          c.fillStyle = '#b8603e'; [[-0.3, -0.2], [0.3, 0.1], [0, 0.4], [0.4, -0.35]].forEach(([a, b]) => { c.beginPath(); c.arc(a * r, b * r, r * 0.13, 0, TAU); c.fill(); });
          c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(-r * 0.35, -r * 0.4, r * 0.12, 0, TAU); c.fill(); break;
        case 4: // Seilrolle
          c.strokeStyle = '#c9a46a'; c.lineWidth = r * 0.24; [0.85, 0.55, 0.25].forEach(f => { c.beginPath(); c.arc(0, 0, r * f, 0, TAU); c.stroke(); });
          c.strokeStyle = '#8a6a3a'; c.lineWidth = 1; [0.85, 0.55].forEach(f => { c.beginPath(); c.arc(0, 0, r * f, 0.3, 1.4); c.stroke(); });
          c.strokeStyle = '#c9a46a'; c.lineWidth = r * 0.2; c.beginPath(); c.moveTo(r * 0.8, r * 0.2); c.quadraticCurveTo(r * 1.2, r * 0.7, r * 0.9, r); c.stroke(); break;
        case 5: // Stahlbarren
          c.fillStyle = '#7f8c99'; rr(c, -r * 1.1, -r * 0.3, r * 2.2, r * 0.6, r * 0.12); c.fill();
          c.fillStyle = '#c8d4df'; c.fillRect(-r, -r * 0.22, r * 2, r * 0.14);
          c.fillStyle = 'rgba(255,255,255,0.8)'; c.fillRect(-r * 0.6, -r * 0.2, r * 0.5, r * 0.06); break;
        case 6: // Pulverfass
          c.fillStyle = '#7a5230'; c.beginPath(); c.ellipse(0, 0, r * 0.75, r, 0, 0, TAU); c.fill();
          c.fillStyle = '#3b2b1a'; c.fillRect(-r * 0.74, -r * 0.55, r * 1.48, r * 0.14); c.fillRect(-r * 0.74, r * 0.4, r * 1.48, r * 0.14);
          c.fillStyle = '#222'; c.font = `700 ${Math.round(r * 0.7)}px Fredoka, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('✸', 0, 0); break;
        case 7: { // Zahnrad
          c.fillStyle = '#9a958c';
          c.beginPath(); for (let k = 0; k < 16; k++) { const a = k / 16 * TAU, rad = k % 2 ? r * 0.72 : r; c.lineTo(Math.cos(a - 0.12) * rad, Math.sin(a - 0.12) * rad); c.lineTo(Math.cos(a + 0.12) * rad, Math.sin(a + 0.12) * rad); } c.closePath(); c.fill();
          c.fillStyle = '#6d6a62'; c.beginPath(); c.arc(0, 0, r * 0.5, 0, TAU); c.fill(); c.fillStyle = '#3d3530'; c.beginPath(); c.arc(0, 0, r * 0.2, 0, TAU); c.fill(); break;
        }
        case 8: { // Chip: schwarzes Gehäuse, goldene Beinchen, Leiterbahnen, leuchtender Kern
          c.fillStyle = '#e6b93a'; for (let k = 0; k < 4; k++) { const o = -r * 0.54 + k * r * 0.36; c.fillRect(o - r * 0.06, -r * 0.98, r * 0.12, r * 1.96); c.fillRect(-r * 0.98, o - r * 0.06, r * 1.96, r * 0.12); }
          const cg = c.createLinearGradient(-r, -r, r, r); cg.addColorStop(0, '#3a3f4a'); cg.addColorStop(1, '#111318');
          c.fillStyle = cg; rr(c, -r * 0.78, -r * 0.78, r * 1.56, r * 1.56, r * 0.14); c.fill();
          c.strokeStyle = 'rgba(201,168,74,0.75)'; c.lineWidth = Math.max(0.6, r * 0.05); c.beginPath(); c.moveTo(-r * 0.6, -r * 0.4); c.lineTo(-r * 0.3, -r * 0.4); c.lineTo(-r * 0.3, -r * 0.2); c.moveTo(r * 0.6, r * 0.45); c.lineTo(r * 0.25, r * 0.45); c.lineTo(r * 0.25, r * 0.25); c.stroke();
          const gg = c.createRadialGradient(0, 0, r * 0.05, 0, 0, r * 0.4); gg.addColorStop(0, '#ffffff'); gg.addColorStop(0.4, '#4be3ff'); gg.addColorStop(1, '#1b4a6a');
          c.fillStyle = gg; rr(c, -r * 0.32, -r * 0.32, r * 0.64, r * 0.64, r * 0.06); c.fill();
          c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-r * 0.7, -r * 0.7, r * 1.4, r * 0.12);
          break;
        }
        default: { // Plasma-Kugel
          const g = c.createRadialGradient(0, 0, r * 0.1, 0, 0, r * 1.3);
          g.addColorStop(0, '#ffffff'); g.addColorStop(0.3, '#7ff6ff'); g.addColorStop(0.65, 'rgba(255,122,217,0.8)'); g.addColorStop(1, 'rgba(255,122,217,0)');
          c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 1.3, 0, TAU); c.fill();
        }
      }
      c.restore();
    }

    // ---------- Abbaustelle (Ursprung = Bodenmitte, Einheit ≈ 1 px bei Maßstab 1) ----------
    function site(i, t, hit) {
      const sh = hit > 0 ? Math.sin(hit * 60) * 3 * hit : 0;
      c.save(); c.translate(sh, 0);
      switch (i) {
        case 0: { // Wald: zwei Bäume
          c.fillStyle = '#2f6a2a'; [[-46, -64, 22], [-58, -50, 16], [-34, -50, 16]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill(); });
          c.fillStyle = '#5a3a1f'; c.fillRect(-50, -40, 8, 40);
          c.fillStyle = '#6b4423'; c.fillRect(-9, -78, 18, 78); c.fillStyle = '#5a3a1f'; c.fillRect(-4, -60, 3, 30);
          const sw = Math.sin(t * 1.3) * 2;
          c.fillStyle = '#3f8a3a'; [[0, -104, 30], [-22, -84, 22], [22, -84, 22], [0, -80, 24]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x + sw, y, r, 0, TAU); c.fill(); });
          c.fillStyle = '#5fae4a'; [[-8, -112, 10], [14, -92, 8]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x + sw, y, r, 0, TAU); c.fill(); });
          c.fillStyle = '#d9a86a'; c.beginPath(); c.moveTo(-9, -20); c.lineTo(-2, -16); c.lineTo(-9, -12); c.fill(); // Kerbe
          break;
        }
        case 1: // Steinbruch: Felswand mit Rissen
          c.fillStyle = '#7d7a70'; c.beginPath(); c.moveTo(-70, 0); c.lineTo(-62, -70); c.lineTo(-30, -96); c.lineTo(10, -88); c.lineTo(46, -100); c.lineTo(64, -60); c.lineTo(70, 0); c.closePath(); c.fill();
          c.fillStyle = '#9a978c'; c.beginPath(); c.moveTo(-62, -70); c.lineTo(-30, -96); c.lineTo(10, -88); c.lineTo(0, -60); c.lineTo(-40, -50); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 2; c.beginPath(); c.moveTo(-20, -40); c.lineTo(-10, -20); c.lineTo(-16, 0); c.moveTo(20, -70); c.lineTo(28, -40); c.lineTo(22, -24); c.stroke();
          c.fillStyle = '#b5b1a5'; [[-48, -10, 10], [40, -8, 8]].forEach(([x, y, r]) => { c.beginPath(); c.arc(x, y, r, Math.PI, 0); c.fill(); });
          break;
        case 2: { // Schmelzofen: gemauerte Kuppel, Feuer im Maul, Schornstein mit Funken, Tiegel gießt Bronze in Formen
          const fl = 0.75 + 0.25 * Math.sin(t * 11) + hit * 0.5;
          c.fillStyle = '#5a3020'; c.fillRect(14, -128, 18, 70); c.fillStyle = '#7a4030'; c.fillRect(12, -132, 22, 8);
          for (let yy = -124; yy < -60; yy += 8) { c.fillStyle = 'rgba(0,0,0,0.18)'; c.fillRect(14, yy, 18, 1.5); }
          // Kuppel aus Ziegeln
          const dg = c.createRadialGradient(-6, -40, 6, 0, -20, 62); dg.addColorStop(0, '#c0714a'); dg.addColorStop(1, '#7a3a22');
          c.fillStyle = dg; c.beginPath(); c.moveTo(-56, 0); c.quadraticCurveTo(-58, -76, 0, -80); c.quadraticCurveTo(58, -76, 56, 0); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(40,15,5,0.35)'; c.lineWidth = 1.2;
          for (let r = 0; r < 6; r++) { const yy = -8 - r * 12, half = 54 - r * r * 1.3; c.beginPath(); c.moveTo(-half, yy); c.lineTo(half, yy); c.stroke(); for (let q = -half + ((r % 2) * 7); q < half; q += 14) { c.beginPath(); c.moveTo(q, yy); c.lineTo(q, yy + 12); c.stroke(); } }
          // glühendes Maul mit Flammen
          c.fillStyle = '#2a1208'; c.beginPath(); c.moveTo(-24, 0); c.lineTo(-24, -22); c.arc(0, -22, 24, Math.PI, 0); c.lineTo(24, 0); c.fill();
          const g = c.createRadialGradient(0, -8, 2, 0, -8, 30); g.addColorStop(0, `rgba(255,250,200,${Math.min(1, fl)})`); g.addColorStop(0.5, 'rgba(255,150,40,0.95)'); g.addColorStop(1, 'rgba(200,40,10,0.9)');
          c.fillStyle = g; c.beginPath(); c.moveTo(-19, 0); c.lineTo(-19, -20); c.arc(0, -20, 19, Math.PI, 0); c.lineTo(19, 0); c.fill();
          for (let k = 0; k < 5; k++) { const fx = -14 + k * 7, fh = 14 + 10 * Math.abs(Math.sin(t * 7 + k * 1.9)) + hit * 12; c.fillStyle = k % 2 ? 'rgba(255,230,120,0.9)' : 'rgba(255,120,30,0.85)'; c.beginPath(); c.moveTo(fx - 5, 0); c.quadraticCurveTo(fx, -fh * 1.2, fx + 5, 0); c.fill(); }
          c.fillStyle = 'rgba(255,140,40,0.25)'; c.beginPath(); c.ellipse(0, 2, 50 + hit * 10, 6, 0, 0, TAU); c.fill();
          // Tiegel kippt und gießt in Formen
          const tilt = 0.5 + 0.25 * Math.sin(t * 0.9) + hit * 0.3;
          c.strokeStyle = '#3b3633'; c.lineWidth = 3; c.beginPath(); c.moveTo(62, 0); c.lineTo(62, -46); c.lineTo(48, -46); c.stroke();
          c.save(); c.translate(50, -44); c.rotate(-tilt); c.fillStyle = '#4a4540'; c.beginPath(); c.moveTo(-12, -10); c.lineTo(12, -10); c.lineTo(9, 8); c.lineTo(-9, 8); c.fill(); c.fillStyle = '#ffb347'; c.fillRect(-11, -10, 22, 3); c.restore();
          const sx0 = 50 - Math.cos(tilt) * 12, sy0 = -44 - Math.sin(tilt) * 10;
          c.strokeStyle = `rgba(255,${170 + Math.round(hit * 60)},60,0.95)`; c.lineWidth = 3; c.beginPath(); c.moveTo(sx0, sy0); c.quadraticCurveTo(sx0 - 4, -24, sx0 - 2, -9); c.stroke();
          c.fillStyle = '#3b3633'; c.fillRect(30, -9, 34, 9);
          [34, 46].forEach(mx => { c.fillStyle = '#e09a4a'; c.fillRect(mx, -8, 10, 4); c.fillStyle = 'rgba(255,240,160,0.8)'; c.fillRect(mx + 2, -8, 4, 1.5); });
          break;
        }
        case 3: { // Eisenmine mit Lore
          c.fillStyle = '#6d6a62'; c.beginPath(); c.moveTo(-80, 0); c.quadraticCurveTo(-40, -120, 30, -100); c.quadraticCurveTo(80, -80, 90, 0); c.fill();
          c.fillStyle = '#1b1a19'; c.beginPath(); c.moveTo(-26, 0); c.lineTo(-26, -40); c.arc(0, -40, 26, Math.PI, 0); c.lineTo(26, 0); c.fill();
          c.strokeStyle = '#7a5230'; c.lineWidth = 6; c.beginPath(); c.moveTo(-28, 0); c.lineTo(-28, -50); c.lineTo(28, -50); c.lineTo(28, 0); c.stroke();
          c.strokeStyle = '#555'; c.lineWidth = 2; c.beginPath(); c.moveTo(-10, -2); c.lineTo(90, -2); c.stroke();
          const cx = 10 + 50 * (0.5 + 0.5 * Math.sin(t * 0.8));
          c.fillStyle = '#5d5f66'; c.beginPath(); c.moveTo(cx - 16, -24); c.lineTo(cx + 16, -24); c.lineTo(cx + 12, -6); c.lineTo(cx - 12, -6); c.fill();
          c.fillStyle = '#2a2a2e'; [-8, 8].forEach(d => { c.beginPath(); c.arc(cx + d, -5, 4, 0, TAU); c.fill(); });
          c.fillStyle = '#4e5056'; c.beginPath(); c.arc(cx - 5, -26, 6, Math.PI, 0); c.arc(cx + 6, -26, 5, Math.PI, 0); c.fill();
          break;
        }
        case 4: { // Seilerei: Spinnrad mit Strängen
          c.strokeStyle = '#7a5230'; c.lineWidth = 5; c.beginPath(); c.moveTo(-50, 0); c.lineTo(-40, -60); c.moveTo(-30, 0); c.lineTo(-40, -60); c.stroke();
          c.save(); c.translate(-40, -60); c.rotate(t * 2 + hit * 3); c.strokeStyle = '#8a5a2b'; c.lineWidth = 4; c.beginPath(); c.arc(0, 0, 26, 0, TAU); c.stroke();
          for (let k = 0; k < 6; k++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, 0); c.lineTo(26, 0); c.stroke(); } c.restore();
          c.strokeStyle = '#c9a46a'; c.lineWidth = 3; for (let k = 0; k < 3; k++) { c.beginPath(); c.moveTo(-40, -62 + k * 3); c.quadraticCurveTo(10, -50 + k * 3 + Math.sin(t * 3 + k) * 3, 60, -40 + k * 3); c.stroke(); }
          c.strokeStyle = '#7a5230'; c.lineWidth = 5; c.beginPath(); c.moveTo(60, 0); c.lineTo(60, -46); c.stroke();
          break;
        }
        case 5: { // Schmiede: Esse + Amboss
          c.fillStyle = '#5a4a40'; c.fillRect(-70, -60, 40, 60); c.fillStyle = '#3b3633'; c.fillRect(-64, -90, 14, 30);
          const g = c.createRadialGradient(-50, -30, 2, -50, -30, 18); g.addColorStop(0, `rgba(255,230,140,${0.8 + hit * 0.2})`); g.addColorStop(1, 'rgba(255,90,20,0.2)');
          c.fillStyle = g; c.fillRect(-64, -40, 28, 18);
          c.fillStyle = '#3a3a40'; c.beginPath(); c.moveTo(-14, -40); c.lineTo(34, -40); c.lineTo(26, -30); c.lineTo(8, -30); c.lineTo(12, -12); c.lineTo(20, 0); c.lineTo(-12, 0); c.lineTo(-4, -12); c.lineTo(0, -30); c.lineTo(-20, -34); c.closePath(); c.fill();
          c.fillStyle = `rgb(255,${150 + Math.round(hit * 80)},60)`; c.fillRect(0, -46, 22, 6);
          break;
        }
        case 6: { // Pulvermühle: Mühle mit Flügeln
          c.fillStyle = '#c9b48a'; c.beginPath(); c.moveTo(-22, 0); c.lineTo(-16, -80); c.lineTo(16, -80); c.lineTo(22, 0); c.fill();
          c.fillStyle = '#8a5a2b'; c.beginPath(); c.moveTo(-20, -80); c.lineTo(0, -98); c.lineTo(20, -80); c.fill();
          c.fillStyle = '#5a3d1f'; c.fillRect(-6, -18, 12, 18);
          c.save(); c.translate(0, -82); c.rotate(t * 1.2 + hit * 2); c.fillStyle = '#efe6d0'; c.strokeStyle = '#6b4423'; c.lineWidth = 2;
          for (let k = 0; k < 4; k++) { c.rotate(Math.PI / 2); c.fillRect(4, -5, 46, 10); c.strokeRect(4, -5, 46, 10); } c.restore();
          item(6, 40, -12, 11, 0); item(6, 58, -12, 11, 0); item(6, 49, -32, 11, 0);
          break;
        }
        case 7: { // Dampfwerk: Kessel + großes Zahnrad
          c.fillStyle = '#3b3633'; rr(c, -70, -56, 60, 56, 10); c.fill(); c.fillStyle = '#26272b'; c.fillRect(-56, -96, 12, 40);
          c.fillStyle = '#8f8a80'; c.fillRect(-70, -40, 60, 4); c.fillRect(-70, -20, 60, 4);
          c.save(); c.translate(26, -46); c.rotate(t * 0.9 + hit); item(7, 0, 0, 40, 0); c.restore();
          c.save(); c.translate(64, -18); c.rotate(-t * 1.8 - hit * 2); item(7, 0, 0, 18, 0); c.restore();
          break;
        }
        case 8: { // Chipfabrik: Reinraum mit Glasfront, Platine an der Wand, Roboterarm setzt Chips auf das Band
          c.fillStyle = '#c8d3e6'; c.fillRect(-78, -96, 122, 96); c.fillStyle = '#9fb3c8'; c.fillRect(-80, -102, 126, 8);
          const ig = c.createLinearGradient(0, -88, 0, -30); ig.addColorStop(0, '#163a5a'); ig.addColorStop(1, '#0d2238');
          c.fillStyle = ig; c.fillRect(-72, -88, 110, 56);
          // Platine mit leuchtenden Leiterbahnen
          c.fillStyle = '#1f5a34'; c.fillRect(-66, -82, 46, 44);
          c.strokeStyle = '#c9a84a'; c.lineWidth = 1.2;
          [[-62, -76, -40, -76, -40, -60], [-62, -66, -50, -66, -50, -46], [-30, -80, -30, -70, -24, -70], [-60, -44, -36, -44, -36, -54]].forEach(([a1, b1, a2, b2, a3, b3]) => { c.beginPath(); c.moveTo(a1, b1); c.lineTo(a2, b2); c.lineTo(a3, b3); c.stroke(); });
          const pulseX = -62 + ((t * 30) % 22); c.fillStyle = '#7ff6ff'; c.beginPath(); c.arc(pulseX, -76, 2, 0, TAU); c.fill();
          c.fillStyle = '#111'; rr(c, -48, -66, 14, 14, 2); c.fill(); c.fillStyle = `rgba(75,227,255,${0.5 + 0.5 * Math.sin(t * 5) + hit * 0.5})`; c.fillRect(-45, -63, 8, 8);
          // Hologramm eines Chips
          c.save(); c.translate(8, -66); c.rotate(Math.sin(t * 1.2) * 0.3); c.globalAlpha = 0.55 + 0.2 * Math.sin(t * 4); c.strokeStyle = '#4be3ff'; c.lineWidth = 1.2; c.strokeRect(-12, -12, 24, 24); c.strokeRect(-6, -6, 12, 12);
          for (let k = -9; k <= 9; k += 6) { c.beginPath(); c.moveTo(k, -12); c.lineTo(k, -16); c.moveTo(k, 12); c.lineTo(k, 16); c.stroke(); } c.restore(); c.globalAlpha = 1;
          c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.moveTo(-72, -88); c.lineTo(-52, -88); c.lineTo(-80, -32); c.lineTo(-72, -32); c.fill();
          // Fließband mit Rollen
          c.fillStyle = '#3b4a6a'; c.fillRect(-14, -22, 96, 8); c.fillStyle = '#26324a'; for (let k = 0; k < 6; k++) { c.beginPath(); c.arc(-8 + k * 17, -14, 3, 0, TAU); c.fill(); }
          c.fillStyle = '#26324a'; c.fillRect(-10, -14, 4, 14); c.fillRect(72, -14, 4, 14);
          for (let k = 0; k < 4; k++) { const x = -8 + ((t * 18 + k * 22) % 84); item(8, x, -28, 6, 0); }
          // Roboterarm
          const ra = Math.sin(t * 2 + hit * 2) * 0.5, rb = 0.9 + Math.sin(t * 2 + 1) * 0.4;
          c.fillStyle = '#e8ecf2'; rr(c, 40, -10, 18, 10, 3); c.fill();
          c.save(); c.translate(49, -10); c.rotate(-1.9 + ra); c.fillStyle = '#ff9d4d'; rr(c, 0, -3, 30, 6, 3); c.fill(); c.translate(30, 0); c.fillStyle = '#e8ecf2'; c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill(); c.rotate(rb); c.fillStyle = '#ff9d4d'; rr(c, 0, -2.5, 22, 5, 2.5); c.fill();
          c.strokeStyle = '#5d6a78'; c.lineWidth = 2; c.beginPath(); c.moveTo(22, -4); c.lineTo(27, -6); c.moveTo(22, 4); c.lineTo(27, 6); c.stroke(); c.restore();
          if (hit > 0.2) { c.fillStyle = `rgba(127,246,255,${hit * 0.6})`; c.beginPath(); c.arc(-26, -60, 30 * hit, 0, TAU); c.fill(); }
          break;
        }
        default: { // Fusionsreaktor
          const p = 0.6 + 0.4 * Math.sin(t * 3) + hit * 0.4;
          c.fillStyle = '#2a2366'; rr(c, -60, -20, 120, 20, 6); c.fill();
          c.strokeStyle = '#3b3190'; c.lineWidth = 14; c.beginPath(); c.ellipse(0, -66, 52, 22, 0, 0, TAU); c.stroke();
          c.strokeStyle = `rgba(127,246,255,${0.5 + 0.4 * p})`; c.lineWidth = 3; c.beginPath(); c.ellipse(0, -66, 52, 22, 0, 0, TAU); c.stroke();
          c.fillStyle = '#3b3190'; c.fillRect(-48, -60, 10, 42); c.fillRect(38, -60, 10, 42);
          item(9, 0, -66, 18 + p * 4, 0);
        }
      }
      c.restore();
    }

    // ---------- Figur mit passender Bewegung je Ressource ----------
    // Bewegungsart je Ressource: Holz hacken, Stein pickeln, Blasebalg treten, Lore schieben, Kurbel drehen,
    // Hammer auf Amboss, Mörser stampfen, Hebel ziehen, Tippen am Pult, Energie bündeln
    const MOTION = ['chop', 'pick', 'bellows', 'push', 'crank', 'hammer', 'pestle', 'lever', 'type', 'channel'];
    const TOOLS = { chop: 'axe', pick: 'pick', hammer: 'hammer', pestle: 'pestle' };
    // Ruhe / Ausholen / Treffer: [Neigung, vordere Hand x,y, hintere Hand x,y, Werkzeugwinkel]
    const POSE = {
      chop:    [[0, 9, -22, 5, -22, 0.9], [-0.18, -6, -40, -4, -38, -2.5], [0.16, 17, -27, 13, -27, 0.05]],
      pick:    [[0, 9, -24, 5, -24, 1.1], [-0.12, 2, -52, 0, -50, -1.9], [0.28, 16, -22, 12, -22, 0.95]],
      hammer:  [[0, 10, -26, 6, -24, 0.8], [-0.08, 6, -48, 4, -30, -1.6], [0.2, 17, -22, 8, -24, 0.9]],
      pestle:  [[0, 13, -28, 10, -28, 1.57], [-0.04, 13, -42, 10, -42, 1.57], [0.18, 13, -22, 10, -22, 1.57]],
      bellows: [[0.02, 13, -26, 10, -26, 0], [-0.04, 13, -34, 10, -34, 0], [0.22, 15, -17, 12, -17, 0]],
      push:    [[0.1, 15, -26, 12, -27, 0], [-0.04, 11, -26, 9, -26, 0], [0.32, 21, -24, 18, -25, 0]],
      crank:   [[0.04, 20, -28, 18, -27, 0], [0.04, 20, -28, 18, -27, 0], [0.1, 20, -28, 18, -27, 0]],
      lever:   [[0, 17, -34, 14, -32, 0], [-0.06, 15, -42, 12, -40, 0], [0.2, 20, -15, 17, -16, 0]],
      type:    [[0.06, 15, -25, 12, -25, 0], [0.06, 15, -30, 12, -22, 0], [0.1, 16, -22, 13, -29, 0]],
      channel: [[0, 9, -20, 5, -20, 0], [-0.12, 7, -54, 3, -52, 0], [0.12, 22, -38, 19, -36, 0]],
    };
    const mix = (a, b, f) => a.map((v, i) => v + (b[i] - v) * f);
    function poseAt(type, k) { const P = POSE[type]; return k < 0 ? mix(P[0], P[1], -k) : mix(P[0], P[2], k); }
    // Ablauf eines Schlags (u 0..1): ausholen, zuschlagen, zurück in die Ruhe
    function strokeK(u) { if (u <= 0 || u >= 1) return 0; if (u < 0.3) return -Math.sin(u / 0.3 * Math.PI / 2); if (u < 0.45) return -1 + 2 * (u - 0.3) / 0.15; return 1 - (u - 0.45) / 0.55; }
    function limb(sx, sy, hx, hy, col) {
      const L = 8.5, dx = hx - sx, dy = hy - sy, d = Math.min(2 * L - 0.01, Math.hypot(dx, dy)), an = Math.atan2(dy, dx), k = -Math.acos(d / (2 * L));
      c.strokeStyle = col; c.lineWidth = 4; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(an + k) * L, sy + Math.sin(an + k) * L); c.lineTo(sx + Math.cos(an) * d, sy + Math.sin(an) * d); c.stroke();
      return [sx + Math.cos(an) * d, sy + Math.sin(an) * d];
    }
    function drawTool(tool, x, y, ang) {
      c.save(); c.translate(x, y); c.rotate(ang);
      c.strokeStyle = '#7a5230'; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath(); c.moveTo(-4, 0); c.lineTo(tool === 'hammer' ? 16 : 24, 0); c.stroke();
      c.fillStyle = '#9aa0a8';
      if (tool === 'axe') { c.beginPath(); c.moveTo(18, -1); c.lineTo(24, -11); c.quadraticCurveTo(30, -4, 27, 4); c.lineTo(20, 3); c.closePath(); c.fill(); c.fillStyle = '#d9dee5'; c.fillRect(25, -8, 2, 10); }
      else if (tool === 'pick') { c.strokeStyle = '#9aa0a8'; c.lineWidth = 3.5; c.beginPath(); c.moveTo(20, -12); c.quadraticCurveTo(27, 0, 20, 12); c.stroke(); }
      else if (tool === 'hammer') { c.fillStyle = '#5d5f66'; c.fillRect(12, -7, 9, 14); c.fillStyle = '#8a8d94'; c.fillRect(12, -7, 9, 3); }
      else if (tool === 'pestle') { c.fillStyle = '#c9b48a'; c.beginPath(); c.ellipse(24, 0, 5, 3.5, 0, 0, TAU); c.fill(); }
      c.restore();
    }
    // Werkstation vor der Figur (Blasebalg, Lore, Kurbel, Mörser, Hebel, Pult)
    function station(type, k, t) {
      const hit = Math.max(0, k);
      if (type === 'bellows') { const sq = 1 - 0.5 * hit; c.fillStyle = '#6b4423'; c.beginPath(); c.moveTo(6, -4); c.lineTo(30, -4 - 2 * sq); c.lineTo(30, -4 - 10 * sq); c.lineTo(6, -4 - 12 * sq); c.closePath(); c.fill(); c.fillStyle = '#a0703c'; c.fillRect(4, -6 - 12 * sq, 14, 3); c.fillStyle = '#5d5f66'; c.fillRect(30, -9, 10, 3); }
      else if (type === 'push') { const x = 22 + hit * 8; c.fillStyle = '#5d5f66'; c.beginPath(); c.moveTo(x, -22); c.lineTo(x + 26, -22); c.lineTo(x + 22, -6); c.lineTo(x + 4, -6); c.fill(); c.fillStyle = '#2a2a2e'; [x + 7, x + 19].forEach(wx => { c.beginPath(); c.arc(wx, -4, 4, 0, TAU); c.fill(); }); c.fillStyle = '#4e5056'; c.beginPath(); c.arc(x + 9, -23, 6, Math.PI, 0); c.arc(x + 18, -23, 5, Math.PI, 0); c.fill(); c.fillStyle = '#b8603e'; c.beginPath(); c.arc(x + 12, -25, 1.6, 0, TAU); c.fill(); }
      else if (type === 'crank') { c.fillStyle = '#7a5230'; c.fillRect(20, -28, 4, 28); c.strokeStyle = '#5a3a1f'; c.lineWidth = 2.5; c.beginPath(); c.arc(22, -28, 7, 0, TAU); c.stroke(); }
      else if (type === 'pestle') { c.fillStyle = '#6b4423'; c.fillRect(6, -10, 16, 10); c.fillStyle = '#9a958c'; c.beginPath(); c.moveTo(4, -18); c.lineTo(24, -18); c.lineTo(20, -10); c.lineTo(8, -10); c.fill(); c.fillStyle = '#222'; c.fillRect(7, -18, 14, 2); if (hit > 0.6) { c.fillStyle = 'rgba(60,60,60,0.5)'; c.beginPath(); c.arc(14, -22, 6 * hit, 0, TAU); c.fill(); } }
      else if (type === 'lever') { c.fillStyle = '#3b3633'; rr(c, 14, -10, 18, 10, 2); c.fill(); }
      else if (type === 'type') { c.fillStyle = '#3b4a6a'; c.fillRect(20, -16, 4, 16); c.fillStyle = '#1b1d22'; c.save(); c.translate(14, -20); c.rotate(-0.25); rr(c, 0, 0, 20, 5, 2); c.fill(); c.restore(); c.fillStyle = '#1b1d22'; rr(c, 22, -40, 16, 14, 2); c.fill(); c.fillStyle = hit > 0.3 ? '#bff8ff' : '#4be3ff'; c.fillRect(24, -38, 12, 10); c.fillStyle = '#1b1d22'; for (let q = 0; q < 3; q++) c.fillRect(25, -36 + q * 3, 4 + ((q * 5 + Math.floor(t * 6)) % 7), 1); }
    }
    function figure(x, gy, s, type, k, shirt, carryItem, walk, t) {
      c.save(); c.translate(x, gy); c.scale(s, s);
      const sw = walk ? Math.sin(walk * 14) * 5 : 0;
      if (carryItem == null && !walk) station(type, k, t || 0);
      c.strokeStyle = '#3a2a1c'; c.lineWidth = 5; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-3, -16); c.lineTo(-3 + sw, -1); c.moveTo(3, -16); c.lineTo(3 - sw + (k > 0 ? 2 * k : 0), -1); c.stroke();
      const P = carryItem == null ? poseAt(type, k) : [0];
      c.save(); c.translate(0, -16); c.rotate(P[0]); c.translate(0, 16);
      c.fillStyle = shirt; rr(c, -9, -38, 18, 24, 6); c.fill(); c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(-9, -20, 18, 3);
      c.fillStyle = '#f0c79a'; c.beginPath(); c.arc(0, -46, 8, 0, TAU); c.fill();
      c.fillStyle = '#ffc53d'; c.beginPath(); c.arc(0, -48, 9, Math.PI, 0); c.fill(); c.fillRect(-10, -49, 20, 3); // Helm
      c.fillStyle = '#222'; c.beginPath(); c.arc(3, -46, 1.3, 0, TAU); c.fill();
      c.strokeStyle = '#8a3a2a'; c.lineWidth = 1; c.beginPath(); if (k > 0.5) c.arc(4, -42, 1.4, 0, TAU); else c.arc(3.5, -43, 1.8, 0.2, Math.PI - 0.6); c.stroke();
      c.restore();
      const shx = 3 + Math.sin(P[0]) * 18, shy = -33 + (1 - Math.cos(P[0])) * 18;
      if (carryItem != null) { item(carryItem, 0, -60, 9, 0); limb(shx - 6, shy, -5, -54, '#f0c79a'); limb(shx, shy, 5, -54, '#f0c79a'); c.restore(); return; }
      let fx = P[1], fy = P[2], bx = P[3], by = P[4];
      if (type === 'crank') { const a = (t || 0) * 2 + Math.max(0, k) * 6; fx = 22 + Math.cos(a) * 7; fy = -28 + Math.sin(a) * 7; bx = fx - 2; by = fy + 1; c.strokeStyle = '#5a3a1f'; c.lineWidth = 2; c.beginPath(); c.moveTo(22, -28); c.lineTo(fx, fy); c.stroke(); }
      if (type === 'lever') { c.strokeStyle = '#8f8a80'; c.lineWidth = 3; c.beginPath(); c.moveTo(23, -8); c.lineTo(fx, fy); c.stroke(); c.fillStyle = '#c0392b'; c.beginPath(); c.arc(fx, fy, 3, 0, TAU); c.fill(); }
      const tool = TOOLS[type];
      limb(shx - 4, shy, bx, by, '#e2b688');
      if (tool) drawTool(tool, fx, fy, P[5]);
      const [hx, hy] = limb(shx, shy, fx, fy, '#f0c79a');
      c.fillStyle = '#f0c79a'; c.beginPath(); c.arc(hx, hy, 2.4, 0, TAU); c.fill();
      if (type === 'channel') { // Energie zwischen den Händen
        const p = 0.5 + 0.5 * Math.sin((t || 0) * 8) + Math.max(0, k);
        const g = c.createRadialGradient(hx, hy - 4, 1, hx, hy - 4, 8 + 6 * p); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.4, 'rgba(127,246,255,0.7)'); g.addColorStop(1, 'rgba(255,122,217,0)');
        c.fillStyle = g; c.beginPath(); c.arc(hx, hy - 4, 8 + 6 * p, 0, TAU); c.fill();
        if (k > 0.2) { c.strokeStyle = `rgba(191,248,255,${k})`; c.lineWidth = 2 + 2 * k; c.beginPath(); c.moveTo(hx, hy - 4); for (let q = 1; q <= 5; q++) c.lineTo(hx + q * 14, hy - 4 - 14 * q * 0.5 + (q % 2 ? 4 : -4)); c.stroke(); }
      }
      c.restore();
    }

    // ---------- Der Schütze beim Abbauen: je Ressource eine eigene, deutlich sichtbare Bewegung (kein Draufhauen) ----------
    // u = 0..1 Fortschritt der Aktion (ca. 0,75 s); ohne Antippen leichte Ruhebewegung
    const ACT = ['saw', 'lift', 'bellows', 'cart', 'crank', 'quench', 'sieve', 'lever', 'type', 'channel'];
    const ACT_DUR = 0.75;
    function body(lean, crouch, step, shirt) {
      c.strokeStyle = '#3a2a1c'; c.lineWidth = 5; c.lineCap = 'round';
      const kh = 16 - crouch * 6; // Knie beugen
      c.beginPath(); c.moveTo(-3, -kh); c.lineTo(-5 - step - crouch * 3, -kh / 2); c.lineTo(-4 - step, -1); c.moveTo(3, -kh); c.lineTo(5 + step + crouch * 3, -kh / 2); c.lineTo(4 + step, -1); c.stroke();
      c.save(); c.translate(0, -kh); c.rotate(lean); c.translate(0, kh);
      const y0 = -kh + 16; c.translate(0, -y0 + 0);
      c.fillStyle = shirt; rr(c, -9, -38 + (16 - kh), 18, 24, 6); c.fill(); c.fillStyle = 'rgba(0,0,0,0.15)'; c.fillRect(-9, -20 + (16 - kh), 18, 3);
      const hy = -46 + (16 - kh);
      c.fillStyle = '#f0c79a'; c.beginPath(); c.arc(0, hy, 8, 0, TAU); c.fill();
      c.fillStyle = '#ffc53d'; c.beginPath(); c.arc(0, hy - 2, 9, Math.PI, 0); c.fill(); c.fillRect(-10, hy - 3, 20, 3);
      c.fillStyle = '#222'; c.beginPath(); c.arc(3, hy, 1.3, 0, TAU); c.fill();
      c.strokeStyle = '#8a3a2a'; c.lineWidth = 1; c.beginPath(); c.arc(3.5, hy + 3, 1.8, 0.2, Math.PI - 0.6); c.stroke();
      c.restore();
      const sy0 = -33 + (16 - kh);
      return [3 + Math.sin(lean) * (33 - sy0 - 17 + 18) * 0.55, sy0 + (1 - Math.cos(lean)) * 18];
    }
    function hands(sx, sy, fx, fy, bx, by) { limb(sx - 4, sy, bx, by, '#e2b688'); const [hx, hy] = limb(sx, sy, fx, fy, '#f0c79a'); c.fillStyle = '#f0c79a'; c.beginPath(); c.arc(hx, hy, 2.4, 0, TAU); c.fill(); return [hx, hy]; }
    function doer(i, x, gy, s, u, t) {
      const a = ACT[i], on = u > 0 && u < 1, w = on ? Math.sin(u * Math.PI) : 0, idle = Math.sin(t * 2) * 0.03;
      c.save(); c.translate(x, gy); c.scale(s, s);
      if (a === 'saw') { // Holz sägen: Sägebock mit Stamm, Säge fährt hin und her, Scheibe fällt ab
        c.fillStyle = '#5a3a1f'; c.save(); c.translate(30, 0); [[-10, 1], [10, -1]].forEach(([dx, d]) => { c.beginPath(); c.moveTo(dx - 5 * d, 0); c.lineTo(dx, -16); c.lineTo(dx + 2, -16); c.lineTo(dx - 3 * d + 2, 0); c.fill(); }); c.restore();
        c.fillStyle = '#8a5a2b'; rr(c, 12, -24, 40, 9, 4); c.fill(); c.fillStyle = '#e2b77a'; c.beginPath(); c.ellipse(52, -19.5, 3, 4.5, 0, 0, TAU); c.fill();
        if (on && u > 0.75) { const f = (u - 0.75) / 0.25; c.save(); c.translate(54 + f * 6, -19 + f * f * 18); c.rotate(f * 2); c.fillStyle = '#8a5a2b'; rr(c, -3, -4.5, 6, 9, 2); c.fill(); c.fillStyle = '#e2b77a'; c.fillRect(-3, -4, 1.5, 8); c.restore(); }
        const sx2 = on ? Math.sin(u * TAU * 3) * 9 : 0, [shx, shy] = body(0.12 + Math.abs(sx2) * 0.005, 0.2, 0, '#7b5230');
        const hx = 18 + sx2, hy = -26;
        c.save(); c.translate(hx, hy); c.fillStyle = '#c4ccd9'; c.beginPath(); c.moveTo(2, -1); c.lineTo(30, 4); c.lineTo(30, 7); c.lineTo(2, 4); c.closePath(); c.fill();
        c.strokeStyle = '#8d939b'; c.lineWidth = 0.8; c.beginPath(); for (let q = 4; q < 30; q += 3) { c.moveTo(q, 4 + q * 0.1); c.lineTo(q + 1.5, 6 + q * 0.1); } c.stroke(); c.fillStyle = '#7a5230'; rr(c, -4, -3, 7, 8, 2); c.fill(); c.restore();
        hands(shx, shy, hx, hy + 1, hx - 3, hy + 3);
      } else if (a === 'lift') { // Stein aufheben, hochstemmen, zum Lager werfen
        const cr = !on ? 0 : u < 0.3 ? u / 0.3 : u < 0.55 ? 1 - (u - 0.3) / 0.25 : 0;
        const up = !on ? 0 : u < 0.3 ? 0 : u < 0.55 ? (u - 0.3) / 0.25 : u < 0.7 ? 1 : 0;
        const thr = on && u >= 0.55 && u < 0.75 ? (u - 0.55) / 0.2 : 0;
        const [shx, shy] = body(-0.1 * up + 0.35 * thr + 0.25 * cr, cr, 0, '#7b5230');
        const sy = -6 - up * 52 + cr * 4, sx2 = 10 + thr * 16;
        if (on && u < 0.7) item(1, sx2 + 4, sy - 2, 9, u * 2);
        else if (!on) item(1, 18, -6, 8, 0);
        hands(shx, shy, sx2 + 8, sy + 4, sx2, sy + 4);
      } else if (a === 'bellows') { // Blasebalg mit beiden Armen kräftig zusammendrücken (zweimal)
        const sq = on ? Math.abs(Math.sin(u * TAU)) : 0.1 + Math.sin(t * 2) * 0.05;
        c.fillStyle = '#6b4423'; c.beginPath(); c.moveTo(10, -6); c.lineTo(40, -6 - 2); c.lineTo(40, -6 - 16 + sq * 10); c.lineTo(10, -6 - 26 + sq * 16); c.closePath(); c.fill();
        c.strokeStyle = '#3b2414'; c.lineWidth = 1; for (let q = 1; q < 4; q++) { c.beginPath(); c.moveTo(10 + q * 7, -6 - q * 0.5); c.lineTo(10 + q * 7, -6 - 26 + sq * 16 + q * 2.5); c.stroke(); }
        c.fillStyle = '#a0703c'; c.save(); c.translate(10, -32 + sq * 16); c.rotate(-0.25 + sq * 0.35); c.fillRect(-4, -2, 26, 4); c.restore();
        c.fillStyle = '#5d5f66'; c.fillRect(40, -12, 12, 4);
        if (on && sq > 0.6) { c.fillStyle = `rgba(255,200,120,${sq - 0.4})`; for (let q = 0; q < 3; q++) { c.beginPath(); c.arc(56 + q * 5, -10 + (q - 1) * 3, 2 + q, 0, TAU); c.fill(); } }
        const [shx, shy] = body(0.25 + sq * 0.2, 0.3 * sq, 0, '#7b5230');
        hands(shx, shy, 14, -34 + sq * 16, 10, -33 + sq * 16);
      } else if (a === 'cart') { // Lore auf Schienen weit hinausschieben und zurückziehen
        const d = on ? Math.sin(u * Math.PI) * 26 : 0;
        c.fillStyle = '#5a4a3a'; c.fillRect(10, -2, 70, 2); for (let q = 12; q < 80; q += 8) c.fillRect(q, -2, 3, 3);
        const x2 = 18 + d; c.fillStyle = '#5d5f66'; c.beginPath(); c.moveTo(x2, -24); c.lineTo(x2 + 28, -24); c.lineTo(x2 + 24, -7); c.lineTo(x2 + 4, -7); c.fill();
        c.fillStyle = '#4e5056'; c.beginPath(); c.arc(x2 + 10, -25, 6, Math.PI, 0); c.arc(x2 + 19, -25, 5, Math.PI, 0); c.fill(); c.fillStyle = '#b8603e'; c.beginPath(); c.arc(x2 + 13, -27, 1.6, 0, TAU); c.fill();
        c.fillStyle = '#2a2a2e'; [x2 + 8, x2 + 20].forEach(wx => { c.save(); c.translate(wx, -5); c.rotate(d * 0.3); c.beginPath(); c.arc(0, 0, 4, 0, TAU); c.fill(); c.fillStyle = '#8a8d94'; c.fillRect(-0.7, -4, 1.4, 8); c.fillStyle = '#2a2a2e'; c.restore(); });
        c.save(); c.translate(d * 0.85, 0); const [shx, shy] = body(0.38, 0.15, on ? Math.sin(u * TAU * 2) * 3 : 0, '#7b5230'); hands(shx, shy, x2 - d * 0.85 + 2, -22, x2 - d * 0.85, -18); c.restore();
      } else if (a === 'crank') { // großes Seilrad zwei volle Umdrehungen kurbeln, Seil wickelt sich auf
        const an = (on ? u * TAU * 2 : 0) + t * 0.3;
        c.fillStyle = '#7a5230'; c.fillRect(30, -34, 4, 34); c.fillRect(48, -34, 4, 34);
        c.save(); c.translate(41, -32); c.rotate(an); c.strokeStyle = '#8a5a2b'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 14, 0, TAU); c.stroke(); c.lineWidth = 2; for (let q = 0; q < 4; q++) { c.rotate(TAU / 4); c.beginPath(); c.moveTo(0, 0); c.lineTo(14, 0); c.stroke(); } c.restore();
        c.fillStyle = '#c9a46a'; c.beginPath(); c.arc(41, -32, 5 + (on ? u * 2 : 0), 0, TAU); c.fill();
        c.strokeStyle = '#c9a46a'; c.lineWidth = 2; c.beginPath(); c.moveTo(41, -27); c.quadraticCurveTo(55, -10, 70, 0); c.stroke();
        const hx = 41 + Math.cos(an) * 14 - 14, hy = -32 + Math.sin(an) * 14;
        c.strokeStyle = '#5a3a1f'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(41 + Math.cos(an) * 14, -32 + Math.sin(an) * 14); c.lineTo(hx + 2, hy); c.stroke();
        const [shx, shy] = body(0.12 + Math.cos(an) * 0.08, 0.1, 0, '#7b5230'); hands(shx, shy, hx, hy, hx - 2, hy + 1);
      } else if (a === 'quench') { // glühenden Stahl mit der Zange in den Wassereimer tauchen: Dampf zischt
        c.fillStyle = '#6b4423'; rr(c, 30, -16, 22, 16, 3); c.fill(); c.fillStyle = '#4bb8ff'; c.fillRect(32, -14, 18, 4); c.fillStyle = '#3b2414'; c.fillRect(30, -10, 22, 2);
        const dip = !on ? 0 : u < 0.35 ? u / 0.35 : u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35;
        const hx = 22 + dip * 4, hy = -36 + dip * 22, glow = !on ? 1 : u < 0.5 ? 1 : Math.max(0, 1 - (u - 0.5) * 4);
        c.strokeStyle = '#3d3f45'; c.lineWidth = 2; c.beginPath(); c.moveTo(hx, hy); c.lineTo(hx + 12, hy + 6); c.moveTo(hx, hy + 2); c.lineTo(hx + 12, hy + 7); c.stroke();
        c.fillStyle = glow > 0 ? `rgb(255,${Math.round(120 + 100 * (1 - glow))},${Math.round(60 + 120 * (1 - glow))})` : '#9aa6b2'; c.save(); c.translate(hx + 14, hy + 7); c.rotate(0.45); c.fillRect(-2, -2, 14, 4); c.restore();
        if (on && u > 0.38) for (let q = 0; q < 4; q++) { const f = ((u - 0.38) * 2 + q * 0.25) % 1; c.fillStyle = `rgba(240,240,240,${0.6 * (1 - f)})`; c.beginPath(); c.arc(38 + q * 4 + f * 6, -18 - f * 30, 3 + f * 8, 0, TAU); c.fill(); }
        const [shx, shy] = body(0.15 + dip * 0.2, 0.2 * dip, 0, '#7b5230'); hands(shx, shy, hx, hy, hx - 3, hy + 2);
      } else if (a === 'sieve') { // Pulver sieben: Sieb kräftig hin und her schütteln, schwarzes Pulver rieselt
        const sh = on ? Math.sin(u * TAU * 4) * 7 : 0;
        c.fillStyle = '#6b4423'; rr(c, 22, -12, 26, 12, 3); c.fill(); c.fillStyle = '#222'; c.beginPath(); c.ellipse(35, -12, 12, 3, 0, 0, TAU); c.fill();
        const sx2 = 24 + sh; c.strokeStyle = '#a0703c'; c.lineWidth = 3; c.beginPath(); c.ellipse(sx2 + 11, -30, 13, 4, 0, 0, TAU); c.stroke(); c.strokeStyle = 'rgba(60,60,60,0.8)'; c.lineWidth = 0.8; c.beginPath(); for (let q = -10; q <= 10; q += 3) { c.moveTo(sx2 + 11 + q, -33); c.lineTo(sx2 + 11 + q, -27); } c.stroke();
        if (on) { c.fillStyle = '#222'; for (let q = 0; q < 10; q++) { const f = ((u * 3 + q / 10) % 1); c.fillRect(sx2 + 3 + (q * 7) % 18, -28 + f * 16, 1.5, 1.5); } }
        const [shx, shy] = body(0.1, 0.1, 0, '#7b5230'); hands(shx, shy, sx2, -30, sx2 - 2, -29);
      } else if (a === 'lever') { // großen Hebel mit ganzem Körpergewicht herunterziehen
        const la = !on ? -0.5 : u < 0.4 ? -0.5 + 1.5 * (u / 0.4) : u < 0.6 ? 1 : 1 - 1.5 * (u - 0.6) / 0.4;
        c.fillStyle = '#3b3633'; rr(c, 22, -12, 22, 12, 2); c.fill(); c.fillStyle = '#5a5550'; c.beginPath(); c.arc(33, -12, 5, Math.PI, 0); c.fill();
        const ex = 33 - Math.sin(-la) * 34, ey = -12 - Math.cos(la) * 34;
        c.strokeStyle = '#8f8a80'; c.lineWidth = 4; c.beginPath(); c.moveTo(33, -12); c.lineTo(ex, ey); c.stroke(); c.fillStyle = '#c0392b'; c.beginPath(); c.arc(ex, ey, 4, 0, TAU); c.fill();
        if (on && u > 0.38 && u < 0.62) { c.strokeStyle = '#ffd23f'; c.lineWidth = 2; for (let q = 0; q < 3; q++) { c.beginPath(); c.moveTo(46, -20 + q * 6); c.lineTo(54, -22 + q * 6); c.stroke(); } }
        const [shx, shy] = body(0.1 + 0.3 * Math.max(0, la), 0.35 * Math.max(0, la), 0, '#7b5230'); hands(shx, shy, ex - 2, ey + 1, ex - 4, ey + 2);
      } else if (a === 'type') { // am Pult schnell tippen, Bildschirm läuft, ein Chip fährt heraus
        c.fillStyle = '#3b4a6a'; c.fillRect(30, -18, 4, 18); c.fillStyle = '#1b1d22'; c.save(); c.translate(18, -22); c.rotate(-0.2); rr(c, 0, 0, 26, 6, 2); c.fill(); c.restore();
        c.fillStyle = '#1b1d22'; rr(c, 30, -48, 24, 20, 3); c.fill(); c.fillStyle = on ? '#bff8ff' : '#4be3ff'; c.fillRect(32, -46, 20, 16);
        c.fillStyle = '#1b1d22'; for (let q = 0; q < 4; q++) c.fillRect(33, -44 + q * 3.5, 4 + ((q * 5 + Math.floor((on ? u * 30 : 0) + t * 3)) % 12), 1.2);
        if (on && u > 0.5) { const f = (u - 0.5) / 0.5; item(8, 56 + f * 6, -30 + f * 4, 5, 0); }
        const tp = on ? Math.abs(Math.sin(u * TAU * 5)) : 0;
        const [shx, shy] = body(0.12, 0.05, 0, '#7b5230'); hands(shx, shy, 26, -26 + (tp > 0.5 ? 3 : 0), 20, -25 + (tp <= 0.5 ? 3 : 0));
      } else { // Plasma: Arme heben, Energie sammeln, Strahl in den Reaktor
        const up = on ? Math.min(1, u / 0.4) : 0, beam = on && u > 0.4 ? Math.sin((u - 0.4) / 0.6 * Math.PI) : 0;
        const [shx, shy] = body(-0.05 + 0.15 * beam, 0, 0, '#7b5230');
        const hx = 10 + 10 * beam, hy = -22 - 30 * up + 14 * beam;
        const [qx, qy] = hands(shx, shy, hx, hy, hx - 4, hy + 1);
        const g = c.createRadialGradient(qx, qy - 4, 1, qx, qy - 4, 8 + 10 * (up + beam)); g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(0.4, 'rgba(127,246,255,0.7)'); g.addColorStop(1, 'rgba(255,122,217,0)');
        c.fillStyle = g; c.beginPath(); c.arc(qx, qy - 4, 8 + 10 * (up + beam), 0, TAU); c.fill();
        if (beam > 0.1) { c.strokeStyle = `rgba(191,248,255,${beam})`; c.lineWidth = 2 + 4 * beam; c.beginPath(); c.moveTo(qx, qy - 4); for (let q = 1; q <= 6; q++) c.lineTo(qx + q * 13, qy - 4 - q * 6 + (q % 2 ? 4 : -4) * Math.sin(t * 30)); c.stroke(); }
      }
      c.restore();
    }
    let actT = -1;

    function geom(i) {
      const s = compact ? Math.max(0.3, Math.min(1.6, Math.min(W / 250, (H - 16) / 140))) : Math.max(0.6, Math.min(2.2, Math.min(W / 330, (H - 40) / 210)));
      const gy = compact ? Math.min(H - 8, H * 0.5 + 75 * s) : H - Math.max(26, H * 0.16), sx = W * (compact ? 0.44 : 0.47);
      return { s, gy, sx, px: sx - 80 * s, pile: sx + 104 * s, hx: sx - 38 * s, hy: gy - 34 * s };
    }

    function tap(i, gain) {
      pulse = 1; shake = 0.25; actT = 0;
      const g = geom(i), col = CHIP[i];
      if (i === 0) for (let k = 0; k < 6; k++) chips.push({ x: g.sx + (Math.random() - 0.5) * 50 * g.s, y: g.gy - (90 + Math.random() * 30) * g.s, vx: (Math.random() - 0.5) * 60, vy: 10, r: 3 * g.s, col: k % 2 ? '#5fae4a' : '#3f8a3a', life: 1.4, leaf: true, delay: 0.12 });
      for (let k = 0; k < 9; k++) chips.push({ delay: 0.13, x: g.hx, y: g.hy, vx: (Math.random() - 0.2) * 260 * g.s, vy: (-60 - Math.random() * 220) * g.s, r: (2 + Math.random() * 3) * g.s, col: col[k % 3], life: 0.6 + Math.random() * 0.4 });
      if (i === 5) for (let k = 0; k < 10; k++) chips.push({ x: g.hx, y: g.hy, vx: (Math.random() - 0.5) * 380, vy: -Math.random() * 300, r: 1.5, col: '#fff2a0', life: 0.4 });
      if (gain) pop(i, gain, false);
    }
    function pop(i, n, auto) {
      const g = geom(i), k = Math.min(5, Math.max(1, n));
      for (let j = 0; j < k; j++) pops.push({ i, x0: auto ? g.sx + 40 * g.s : g.hx, y0: auto ? g.gy - 30 * g.s : g.hy, t: -j * 0.08, rot: Math.random() * 6 });
      texts.push({ x: compact ? W / 2 : g.pile, y: compact ? H * 0.4 : g.gy - 80 * g.s, text: '+' + J.fmtNum(n) + ' ' + J.MATS[i].name, life: 1.4 });
    }

    function draw(st) {
      const i = st.i, t = st.t, dt = st.dt;
      if (i !== lastI) { chips = []; pops = []; texts = []; smoke = []; lastI = i; }
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const g = geom(i), s = g.s;
      pulse = Math.max(0, pulse - dt * 3); shake = Math.max(0, shake - dt);
      // Himmel, Hügel, Boden
      const sky = c.createLinearGradient(0, 0, 0, g.gy); sky.addColorStop(0, SKY[i][0]); sky.addColorStop(1, SKY[i][1]);
      c.fillStyle = sky; c.fillRect(0, 0, W, H);
      if (i === 9) { c.fillStyle = '#fff'; for (let k = 0; k < 40; k++) { c.globalAlpha = 0.3 + (k % 4) * 0.15; c.fillRect((k * 97.3) % W, (k * 41.7) % (g.gy * 0.8), 1.5, 1.5); } c.globalAlpha = 1; }
      c.fillStyle = 'rgba(255,255,255,0.18)'; c.beginPath(); c.moveTo(0, g.gy);
      for (let x = 0; x <= W; x += 10) c.lineTo(x, g.gy - 40 * s - 18 * s * Math.sin(x * 0.012 + i));
      c.lineTo(W, g.gy); c.fill();
      c.fillStyle = GROUND[i]; c.fillRect(0, g.gy, W, H - g.gy);
      c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, g.gy, W, 4);
      if (!st.avail) c.filter = 'grayscale(1)';
      // Rauch (Ofen, Schmiede, Dampfwerk)
      if (st.avail && [2, 5, 7].includes(i) && Math.random() < dt * 4) { const sxp = { 2: 29, 5: -57, 7: -50 }[i], syp = { 2: -112, 5: -92, 7: -98 }[i]; smoke.push({ x: g.sx + sxp * s, y: g.gy + syp * s, r: 6 * s, life: 2.2 }); }
      smoke.forEach(p => { p.y -= 22 * s * dt; p.x += 8 * s * dt; p.r += 6 * s * dt; p.life -= dt; c.fillStyle = `rgba(220,220,220,${Math.max(0, p.life / 2.2) * 0.45})`; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); });
      smoke = smoke.filter(p => p.life > 0);
      // Lager-Stapel
      const n = Math.min(15, Math.ceil(Math.sqrt(st.count) * 1.4));
      let k = 0;
      for (let row = 0; row < 5 && k < n; row++) for (let col = 0; col < 5 - row && k < n; col++, k++) item(i, g.pile + (col - (4 - row) / 2) * 17 * s, g.gy - 8 * s - row * 14 * s, 8 * s, 0);
      c.font = `700 ${Math.round(12 * s)}px Fredoka, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillStyle = 'rgba(0,0,0,0.55)';
      if (!compact) c.fillText('Lager: ' + J.fmtNum(st.count), g.pile, g.gy + 6);
      // Abbaustelle
      c.save(); c.translate(g.sx + (shake > 0 ? Math.sin(shake * 80) * 2 : 0), g.gy); c.scale(s, s); site(i, t, pulse); c.restore();
      // Arbeiter: hauen an der Stelle, tragen zum Lager, laufen zurück
      const wn = st.avail ? Math.min(8, st.wk) : 0;
      for (let w = 0; w < wn; w++) {
        const ph = ((t / st.cycle) + w / wn) % 1, slot = g.sx + (36 + (w % 4) * 10) * s;
        if (ph < 0.55) figure(slot, g.gy, s * 0.72, MOTION[i], strokeK((t * 0.9 + w * 0.37) % 1), '#3a6ea5', null, 0, t);
        else if (ph < 0.8) figure(lerp(slot, g.pile - 30 * s, (ph - 0.55) / 0.25), g.gy, s * 0.72, MOTION[i], 0, '#3a6ea5', i, t + w, t);
        else { c.save(); const x = lerp(g.pile - 30 * s, slot, (ph - 0.8) / 0.2); c.translate(x, 0); c.scale(-1, 1); c.translate(-x, 0); figure(x, g.gy, s * 0.72, MOTION[i], 0, '#3a6ea5', null, t + w, t); c.restore(); }
      }
      if (st.wk > 8) { c.font = `700 ${Math.round(11 * s)}px Fredoka, system-ui, sans-serif`; c.fillStyle = '#fff'; c.textAlign = 'left'; c.fillText('+' + (st.wk - 8) + ' Arbeiter', g.sx + 30 * s, g.gy + 6); }
      // Der Schütze baut selbst ab
      if (actT >= 0) { actT += dt; if (actT > ACT_DUR) actT = -1; }
      doer(i, g.px, g.gy, s, actT >= 0 ? actT / ACT_DUR : 0, t);
      c.filter = 'none';
      // Splitter und fliegende Ressourcen
      chips.forEach(p => { if (p.delay > 0) { p.delay -= dt; return; } p.x += p.vx * dt + (p.leaf ? Math.sin(t * 6 + p.y) * 20 * dt : 0); p.y += p.vy * dt; p.vy += (p.leaf ? 40 : 700) * dt; p.life -= dt; if (p.y > g.gy) { p.y = g.gy; p.vy *= -0.3; p.vx *= 0.5; } c.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); c.fillStyle = p.col; c.fillRect(p.x - p.r / 2, p.y - p.r / 2, p.r, p.r); });
      chips = chips.filter(p => p.life > 0); c.globalAlpha = 1;
      pops.forEach(p => {
        p.t += dt; if (p.t < 0) return;
        const f = Math.min(1, p.t / 0.7), x = lerp(p.x0, g.pile, f), y = lerp(p.y0, g.gy - 40 * s, f) - Math.sin(f * Math.PI) * 70 * s;
        item(p.i, x, y, 10 * s * (1 + 0.3 * Math.sin(f * Math.PI)), p.rot + f * 6);
      });
      pops = pops.filter(p => p.t < 0.7);
      texts.forEach(tx => { tx.y -= 24 * dt; tx.life -= dt; c.globalAlpha = Math.max(0, Math.min(1, tx.life * 2)); c.font = `700 ${compact ? 12 : Math.round(15 * Math.min(1.4, s))}px Fredoka, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.strokeText(tx.text, tx.x, tx.y); c.fillStyle = '#ffd23f'; c.fillText(tx.text, tx.x, tx.y); });
      texts = texts.filter(tx => tx.life > 0); c.globalAlpha = 1;
      if (compact) { // dünner Balken oben, Sperre als kurzer Hinweis
        c.fillStyle = 'rgba(0,0,0,0.5)'; rr(c, 6, 6, W - 12, 9, 5); c.fill();
        if (st.avail) { c.fillStyle = '#5ee07a'; rr(c, 6, 6, Math.max(0, (W - 12) * st.p), 9, 5); c.fill(); }
        else { c.fillStyle = 'rgba(20,14,8,0.6)'; c.fillRect(0, 0, W, H); c.font = '700 14px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff'; c.fillText('🔒 ab ' + st.lockName, W / 2, H / 2); }
        return;
      }
      // Fortschritt oben
      const bw = Math.min(W - 32, 380), bx = (W - bw) / 2, by = 14;
      c.fillStyle = 'rgba(0,0,0,0.45)'; rr(c, bx - 6, by - 6, bw + 12, 46, 12); c.fill();
      c.font = '700 13px Fredoka, system-ui, sans-serif'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = '#fff';
      c.fillText(J.MATS[i].place + (st.avail ? ' – tippe zum Abbauen' : ''), bx, by);
      c.textAlign = 'right'; c.fillStyle = '#ffd23f'; c.fillText(st.avail ? '+' + st.tool + ' je Füllung' : '', bx + bw, by);
      c.fillStyle = '#1a120b'; rr(c, bx, by + 20, bw, 14, 7); c.fill();
      if (st.avail) { c.fillStyle = '#5ee07a'; rr(c, bx, by + 20, Math.max(0, bw * st.p), 14, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fillRect(bx + 4, by + 22, Math.max(0, bw * st.p - 8), 3); }
      if (!st.avail) {
        c.fillStyle = 'rgba(20,14,8,0.55)'; c.fillRect(0, 0, W, H);
        c.font = '700 18px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#fff';
        c.fillText('🔒 ' + J.MATS[i].name + ' gibt es ab der ' + st.lockName, W / 2, H / 2);
      }
    }

    // Eigene Symbol-Bilder (statt neuerer Emoji, die nicht jedes System kennt)
    const iconCache = {};
    function iconURL(i) {
      if (iconCache[i]) return iconCache[i];
      const cv = document.createElement('canvas'); cv.width = cv.height = 64;
      const keep = c; c = cv.getContext('2d');
      if (i === 'coin') {
        c.fillStyle = '#b8860b'; c.beginPath(); c.arc(32, 34, 26, 0, TAU); c.fill();
        c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(32, 31, 26, 0, TAU); c.fill();
        c.strokeStyle = '#e0a800'; c.lineWidth = 4; c.beginPath(); c.arc(32, 31, 18, 0, TAU); c.stroke();
        c.fillStyle = '#fff6b0'; c.beginPath(); c.ellipse(22, 20, 7, 4, -0.6, 0, TAU); c.fill();
      } else item(i, 32, 32, [0, 5].includes(i) ? 24 : 26, i === 0 ? -0.6 : i === 5 ? -0.5 : 0);
      c = keep;
      return (iconCache[i] = cv.toDataURL());
    }

    return { resize, draw, tap, pop, iconURL };
  }
  root.makeResRenderer = makeResRenderer;
})(window);
