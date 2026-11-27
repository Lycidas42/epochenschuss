// Epochenschuss – Grafik (Canvas 2D). Alle Platzhalter-Grafiken werden hier per Code gezeichnet.
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;

  // Farbwelt je Zeitalter
  const THEME = [
    { sky: ['#e0663f', '#fcd29a'], hill: ['#7a4a32', '#9c6440'], ground: '#7b7368', ball: '#8c8c8c', sun: '#fff1c1' },
    { sky: ['#5fb0e0', '#f2ead0'], hill: ['#7f9a4a', '#a3b85f'], ground: '#9a6a3e', ball: '#c98a3e', sun: '#fff7d6' },
    { sky: ['#4f6a86', '#c9d3d9'], hill: ['#344c3c', '#4f6b50'], ground: '#4a3a2a', ball: '#5d5f66', sun: '#f4f4ee' },
    { sky: ['#2a8ad6', '#f7efd6'], hill: ['#9a9a5e', '#c3bc82'], ground: '#d9d0bd', ball: '#b8b2a6', sun: '#fff8dc' },
    { sky: ['#46669a', '#d9dee6'], hill: ['#3e5e3e', '#5d7f52'], ground: '#5c574e', ball: '#3f4148', sun: '#fbf6e2' },
    { sky: ['#4a8cc9', '#ffd59a'], hill: ['#8a9a5a', '#c2a96a'], ground: '#8a4630', ball: '#2f2f33', sun: '#fff2cc' },
    { sky: ['#6e6a66', '#c9b591'], hill: ['#4a4540', '#615a52'], ground: '#3a3634', ball: '#26272b', sun: '#f0e2c0' },
    { sky: ['#1f6fd1', '#a9dbff'], hill: ['#3f6b52', '#5b8f6f'], ground: '#3a3d42', ball: '#3c4a3a', sun: '#ffffff' },
    { sky: ['#07051c', '#2b1a66'], hill: ['#22155a', '#35238a'], ground: '#171433', ball: '#7ff6ff', sun: '#ff7ad9' },
  ];

  function niceStep(raw) {
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p;
  }

  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }

  function makeRenderer(canvas, J) {
    let c = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1;
    const clouds = Array.from({ length: 6 }, (_, i) => ({ x: Math.random(), y: 0.08 + Math.random() * 0.35, s: 0.6 + Math.random() * 0.8, v: 0.004 + Math.random() * 0.006 }));

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2.5, window.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
      return { W, H };
    }

    // ---------- Hintergrund: jedes Zeitalter mit eigener Landschaft, Kulisse und Bahn ----------
    const hsh = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
    let bgCache = null; // statischer Teil (Himmel, Kulisse, Hügel, Bahn) als Bild – spart Zeichenarbeit
    function drawSky(v, th) {
      const key = v.age + '|' + W + '|' + H + '|' + v.groundY + '|' + dpr;
      if (!bgCache || bgCache.key !== key) {
        const cv = bgCache && bgCache.cv || document.createElement('canvas');
        cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
        const keep = c; c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
        paintStatic(v, th);
        c = keep; bgCache = { key, cv };
      }
      c.drawImage(bgCache.cv, 0, 0, W, H);
      drawSkyLive(v, th);
    }
    function hills(gy, col, hgt, f, off, jag) {
      c.fillStyle = col; c.beginPath(); c.moveTo(0, gy);
      for (let x = 0; x <= W + 8; x += 8) { const n = Math.sin(x * f + off) * Math.sin(x * f * 0.37 + off); c.lineTo(x, gy - (gy * hgt * 0.35) * (0.6 + 0.4 * n) - (jag ? (hsh(Math.floor(x / 8) + off) - 0.5) * jag : 0)); }
      c.lineTo(W, gy); c.closePath(); c.fill();
    }
    const hillY = (x, gy, hgt, f, off) => gy - (gy * hgt * 0.35) * (0.6 + 0.4 * Math.sin(x * f + off) * Math.sin(x * f * 0.37 + off));
    function paintStatic(v, th) {
      const gy = v.groundY, a = v.age;
      const g = c.createLinearGradient(0, 0, 0, gy);
      g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      if (a === 8) { // Weltraum: Nebel, Sterne, Ringplanet
        [[0.25, 0.3, '#ff3fb4'], [0.7, 0.2, '#3fd7ff']].forEach(([x, y, col]) => { const rg = c.createRadialGradient(W * x, gy * y, 4, W * x, gy * y, W * 0.35); rg.addColorStop(0, col + '55'); rg.addColorStop(1, col + '00'); c.fillStyle = rg; c.fillRect(0, 0, W, gy); });
        for (let i = 0; i < 140; i++) { c.fillStyle = i % 7 ? '#fff' : '#9ff'; c.globalAlpha = 0.25 + hsh(i) * 0.75; const r = hsh(i + 3) < 0.9 ? 1 : 2; c.fillRect(hsh(i + 1) * W, hsh(i + 2) * gy * 0.85, r, r); }
        c.globalAlpha = 1;
        const px = W * 0.78, py = gy * 0.24, pr = Math.min(W, H) * 0.09;
        const pg = c.createLinearGradient(px - pr, py - pr, px + pr, py + pr); pg.addColorStop(0, '#ffb36b'); pg.addColorStop(1, '#a8326e');
        c.fillStyle = pg; c.beginPath(); c.arc(px, py, pr, 0, TAU); c.fill();
        c.strokeStyle = 'rgba(255,220,180,0.75)'; c.lineWidth = 3; c.beginPath(); c.ellipse(px, py, pr * 1.8, pr * 0.42, -0.35, 0, TAU); c.stroke();
        c.fillStyle = '#c9d4ff'; c.beginPath(); c.arc(W * 0.12, gy * 0.18, pr * 0.3, 0, TAU); c.fill();
      } else if (a !== 6) { // Sonne mit Schein
        const sx = W * 0.82, sy = H * 0.16, sr = Math.min(W, H) * 0.06;
        const sg = c.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 3); sg.addColorStop(0, th.sun + 'aa'); sg.addColorStop(1, th.sun + '00');
        c.fillStyle = sg; c.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
        c.fillStyle = th.sun; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
      }
      // Ferne Kulisse
      const far = th.far || th.hill[0];
      switch (a) {
        case 0: { // Vulkan
          const vx = W * 0.62, vh = gy * 0.55;
          c.fillStyle = '#5a3a2e'; c.beginPath(); c.moveTo(vx - gy * 0.7, gy); c.lineTo(vx - 22, gy - vh); c.lineTo(vx + 22, gy - vh); c.lineTo(vx + gy * 0.7, gy); c.fill();
          c.fillStyle = '#ff6a2a'; c.beginPath(); c.moveTo(vx - 22, gy - vh); c.lineTo(vx + 22, gy - vh); c.lineTo(vx + 8, gy - vh + 26); c.lineTo(vx - 4, gy - vh + 40); c.lineTo(vx - 12, gy - vh + 18); c.fill();
          break;
        }
        case 1: case 2: { // Berge mit Schnee
          for (let k = 0; k < 4; k++) {
            const mx = W * (0.15 + k * 0.27), mh = gy * (0.38 + 0.1 * hsh(k + a)), mw = gy * 0.5;
            c.fillStyle = a === 1 ? '#8fa9c2' : '#5c6c7e'; c.beginPath(); c.moveTo(mx - mw, gy); c.lineTo(mx, gy - mh); c.lineTo(mx + mw, gy); c.fill();
            c.fillStyle = '#f4f7fa'; c.beginPath(); c.moveTo(mx - mw * 0.22, gy - mh * 0.78); c.lineTo(mx, gy - mh); c.lineTo(mx + mw * 0.22, gy - mh * 0.78); c.lineTo(mx + 4, gy - mh * 0.72); c.fill();
          }
          break;
        }
        case 3: { // Tempel auf dem Hügel
          const tx = W * 0.6, ty = hillY(tx, gy, 0.55, 0.0045, 30) - 2, tw = Math.max(70, W * 0.12);
          c.fillStyle = '#efe6d2'; c.fillRect(tx - tw / 2, ty - 6, tw, 6); c.fillRect(tx - tw / 2 + 4, ty - 40, tw - 8, 4);
          for (let k = 0; k < 6; k++) c.fillRect(tx - tw / 2 + 6 + k * (tw - 16) / 5, ty - 36, 4, 30);
          c.beginPath(); c.moveTo(tx - tw / 2, ty - 40); c.lineTo(tx, ty - 58); c.lineTo(tx + tw / 2, ty - 40); c.fill();
          break;
        }
        case 4: { // Burg
          const bx = W * 0.58, by = hillY(bx, gy, 0.55, 0.0045, 30), bw = Math.max(90, W * 0.16);
          c.fillStyle = '#6e7480'; c.fillRect(bx - bw / 2, by - 34, bw, 34);
          [[-0.5, 60, 18], [0.5, 60, 18], [0, 82, 22]].forEach(([f, h, w]) => { const x = bx + f * bw - w / 2; c.fillRect(x, by - h, w, h); for (let q = 0; q < 3; q++) c.fillRect(x + q * w / 2.5, by - h - 6, w / 5, 6); c.fillStyle = '#c0392b'; c.beginPath(); c.moveTo(x + w / 2, by - h - 6); c.lineTo(x + w / 2, by - h - 22); c.lineTo(x + w / 2 + 12, by - h - 17); c.lineTo(x + w / 2, by - h - 13); c.fill(); c.fillStyle = '#6e7480'; });
          for (let q = 0; q < 8; q++) c.fillRect(bx - bw / 2 + q * bw / 7.5, by - 40, bw / 16, 6);
          c.fillStyle = '#2b2d33'; c.beginPath(); c.arc(bx, by - 8, 8, Math.PI, 0); c.fillRect(bx - 8, by - 8, 16, 8); c.fill();
          break;
        }
        case 5: { // Stadt mit Kuppeln und Windmühle
          const base = gy - gy * 0.16;
          for (let k = 0; k < 9; k++) { const x = W * (0.3 + k * 0.07), h = 18 + hsh(k) * 30; c.fillStyle = k % 2 ? '#c98f5a' : '#b37a4a'; c.fillRect(x, base - h, W * 0.06, h + gy * 0.16); c.fillStyle = '#8a4a2a'; c.beginPath(); c.moveTo(x - 2, base - h); c.lineTo(x + W * 0.03, base - h - 10); c.lineTo(x + W * 0.06 + 2, base - h); c.fill(); }
          const dx = W * 0.55; c.fillStyle = '#c8673d'; c.beginPath(); c.arc(dx, base - 48, 22, Math.PI, 0); c.fill(); c.fillStyle = '#e8d2b0'; c.fillRect(dx - 24, base - 48, 48, 48); c.fillRect(dx - 2, base - 80, 4, 12);
          break;
        }
        case 6: { // Fabriken mit Schloten
          for (let k = 0; k < 7; k++) { const x = W * (0.25 + k * 0.1), h = 30 + hsh(k + 9) * 40; c.fillStyle = k % 2 ? '#3d3833' : '#4a4540'; c.fillRect(x, gy - h - 20, W * 0.08, h + 20); c.beginPath(); for (let q = 0; q < 3; q++) { c.moveTo(x + q * W * 0.027, gy - h - 20); c.lineTo(x + (q + 1) * W * 0.027, gy - h - 32); c.lineTo(x + (q + 1) * W * 0.027, gy - h - 20); } c.fill();
            if (k % 2 === 0) { c.fillStyle = '#5a3a30'; c.fillRect(x + W * 0.05, gy - h - 90, 9, 70); c.fillStyle = '#8a3a2a'; c.fillRect(x + W * 0.05, gy - h - 84, 9, 4); }
            c.fillStyle = 'rgba(255,190,90,0.5)'; for (let q = 0; q < 3; q++) c.fillRect(x + 4 + q * 10, gy - h + 4, 5, 7); }
          break;
        }
        case 7: { // Hochhäuser
          for (let k = 0; k < 12; k++) { const x = W * (0.2 + k * 0.066), w = W * 0.055, h = 40 + hsh(k + 20) * (gy * 0.35); c.fillStyle = ['#4f6378', '#5d7187', '#3f5266'][k % 3]; c.fillRect(x, gy - h, w, h);
            c.fillStyle = 'rgba(255,240,180,0.55)'; for (let yy = gy - h + 6; yy < gy - 12; yy += 9) for (let xx = x + 3; xx < x + w - 4; xx += 7) if (hsh(xx * 3 + yy) > 0.45) c.fillRect(xx, yy, 3, 4); }
          const tx = W * 0.47; c.strokeStyle = '#7a8a99'; c.lineWidth = 3; c.beginPath(); c.moveTo(tx, gy); c.lineTo(tx, gy - gy * 0.62); c.stroke(); c.fillStyle = '#7a8a99'; c.beginPath(); c.arc(tx, gy - gy * 0.5, 7, 0, TAU); c.fill();
          break;
        }
        case 8: { // Neonstadt mit schwebenden Plattformen
          for (let k = 0; k < 11; k++) { const x = W * (0.22 + k * 0.07), w = W * 0.04, h = 50 + hsh(k + 40) * (gy * 0.4); c.fillStyle = '#1b1450'; c.beginPath(); c.moveTo(x, gy); c.lineTo(x + w * 0.2, gy - h); c.lineTo(x + w * 0.8, gy - h); c.lineTo(x + w, gy); c.fill();
            c.fillStyle = k % 2 ? '#4be3ff' : '#ff5ad9'; c.globalAlpha = 0.7; c.fillRect(x + w * 0.45, gy - h + 4, 2, h - 8); c.fillRect(x + w * 0.2, gy - h - 2, w * 0.6, 2); c.globalAlpha = 1; }
          [[0.35, 0.3], [0.62, 0.42]].forEach(([fx, fy]) => { const x = W * fx, y = gy * fy; c.fillStyle = '#2d2380'; c.beginPath(); c.ellipse(x, y, 34, 7, 0, 0, TAU); c.fill(); c.fillStyle = '#4be3ff'; c.fillRect(x - 24, y + 5, 48, 2); });
          break;
        }
      }
      // Hügel (zwei Ebenen) + Pflanzen/Häuser davor
      hills(gy, th.hill[0], 0.55, 0.0045, 30, a === 0 ? 8 : 0);
      hills(gy, th.hill[1], 0.3, 0.008, 20, 0);
      for (let k = 0; k < 7; k++) {
        const x = (hsh(k + a * 11) * 0.9 + 0.05) * W; if (x < v.x0 + 50) continue; const y = hillY(x, gy, 0.3, 0.008, 20) + 4, s = 0.7 + hsh(k + 5) * 0.6;
        decor(a, x, y, s, k);
      }
      // Bahn
      paintGround(v, th);
    }
    function decor(a, x, y, s, k) {
      c.save(); c.translate(x, y); c.scale(s, s);
      switch (a) {
        case 0: // Farn / Palme
          c.strokeStyle = '#5a3a1f'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(4, -14, 2, -28); c.stroke();
          c.strokeStyle = '#4f7a2a'; c.lineWidth = 3; for (let q = 0; q < 5; q++) { const an = -Math.PI / 2 + (q - 2) * 0.55; c.beginPath(); c.moveTo(2, -28); c.quadraticCurveTo(2 + Math.cos(an) * 10, -28 + Math.sin(an) * 10 - 4, 2 + Math.cos(an) * 18, -28 + Math.sin(an) * 18 + 6); c.stroke(); }
          break;
        case 1: // Rundhütte
          c.fillStyle = '#b08a5a'; c.fillRect(-9, -12, 18, 12); c.fillStyle = '#d9b26a'; c.beginPath(); c.moveTo(-13, -11); c.lineTo(0, -26); c.lineTo(13, -11); c.fill(); c.fillStyle = '#5a3a1f'; c.fillRect(-3, -8, 6, 8); break;
        case 2: case 4: // Tanne
          c.fillStyle = a === 2 ? '#26402e' : '#2f5a36'; for (let q = 0; q < 3; q++) { c.beginPath(); c.moveTo(-11 + q * 2, -6 - q * 9); c.lineTo(0, -22 - q * 9); c.lineTo(11 - q * 2, -6 - q * 9); c.fill(); } c.fillStyle = '#4a3020'; c.fillRect(-2, -6, 4, 6); break;
        case 3: // Zypresse
          c.fillStyle = '#3f5a2e'; c.beginPath(); c.ellipse(0, -18, 5, 18, 0, 0, TAU); c.fill(); break;
        case 5: // Weinberg / Baum
          c.fillStyle = '#6b8a3a'; c.beginPath(); c.arc(0, -14, 9, 0, TAU); c.fill(); c.fillStyle = '#5a3a1f'; c.fillRect(-1.5, -6, 3, 6); break;
        case 6: // Strommast aus Holz
          c.strokeStyle = '#3b2b1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -32); c.moveTo(-8, -28); c.lineTo(8, -28); c.stroke(); break;
        case 7: // Laterne
          c.strokeStyle = '#2a2e33'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -30); c.lineTo(7, -30); c.stroke(); c.fillStyle = '#fff2b0'; c.fillRect(5, -30, 5, 3); break;
        case 8: // Leuchtkristall
          c.fillStyle = k % 2 ? '#4be3ff' : '#ff5ad9'; c.globalAlpha = 0.85; c.beginPath(); c.moveTo(0, 0); c.lineTo(-5, -10); c.lineTo(0, -24); c.lineTo(5, -10); c.closePath(); c.fill(); c.globalAlpha = 1; break;
      }
      c.restore();
    }
    // Die Bahn, auf der die Hindernisse stehen – Material passend zum Zeitalter
    function paintGround(v, th) {
      const gy = v.groundY, a = v.age, h = H - gy;
      c.fillStyle = th.ground; c.fillRect(0, gy, W, h);
      c.save(); c.beginPath(); c.rect(0, gy, W, h); c.clip();
      const line = (col, w) => { c.strokeStyle = col; c.lineWidth = w; };
      switch (a) {
        case 0: { // Steinplatten
          let x = -10;
          for (let row = 0; row < 3; row++) { x = -hsh(row) * 30; const y0 = gy + row * h / 3, rh = h / 3; while (x < W) { const w = 22 + hsh(x + row * 7) * 26; c.fillStyle = ['#8b8175', '#7a7065', '#968b7e'][Math.floor(hsh(x * 1.3 + row) * 3)]; rr(c, x + 1.5, y0 + 1.5, w - 3, rh - 3, 4); c.fill(); c.fillStyle = 'rgba(255,255,255,0.12)'; c.fillRect(x + 4, y0 + 3, w - 10, 2); x += w; } }
          break;
        }
        case 1: { // gestampfter Lehm mit Kieseln und Grasbüscheln
          for (let i = 0; i < W / 6; i++) { c.fillStyle = hsh(i) > 0.5 ? '#b07a48' : '#80562f'; c.beginPath(); c.ellipse(hsh(i + 1) * W, gy + 6 + hsh(i + 2) * (h - 8), 2 + hsh(i + 3) * 3, 1.5 + hsh(i + 4) * 2, 0, 0, TAU); c.fill(); }
          c.fillStyle = '#93b351'; c.fillRect(0, gy, W, 4); for (let x = 0; x < W; x += 9) { c.beginPath(); c.moveTo(x, gy + 3); c.lineTo(x + 2, gy - 3 - hsh(x) * 4); c.lineTo(x + 4, gy + 3); c.fill(); }
          break;
        }
        case 2: { // Bohlenweg aus Holzstämmen
          for (let x = -4; x < W; x += 12) { c.fillStyle = hsh(x) > 0.5 ? '#6b4a2a' : '#5a3d22'; rr(c, x, gy + 1, 11, h * 0.55, 4); c.fill(); c.fillStyle = 'rgba(255,220,170,0.18)'; c.fillRect(x + 2, gy + 3, 2, h * 0.5 - 4); }
          c.fillStyle = '#3a2c1e'; c.fillRect(0, gy + h * 0.55, W, h);
          for (let i = 0; i < W / 10; i++) { c.fillStyle = '#6a6c70'; c.beginPath(); c.arc(hsh(i) * W, gy + h * 0.6 + hsh(i + 9) * h * 0.4, 1.5 + hsh(i + 5) * 2, 0, TAU); c.fill(); }
          break;
        }
        case 3: { // Marmorplatten (Römerstraße)
          const sw = 34;
          for (let row = 0; row < 2; row++) for (let x = row ? -sw / 2 : 0; x < W; x += sw) { const y0 = gy + row * h / 2; c.fillStyle = hsh(x + row) > 0.5 ? '#e6dfcf' : '#d6cdb9'; c.fillRect(x + 1, y0 + 1, sw - 2, h / 2 - 2); line('rgba(150,140,120,0.35)', 1); c.beginPath(); c.moveTo(x + 4, y0 + 4 + hsh(x) * 6); c.quadraticCurveTo(x + sw / 2, y0 + hsh(x + 1) * 10, x + sw - 6, y0 + 8 + hsh(x + 2) * 8); c.stroke(); }
          c.fillStyle = '#b8ae98'; c.fillRect(0, gy, W, 3);
          break;
        }
        case 4: { // Kopfsteinpflaster
          for (let row = 0; row < 4; row++) for (let x = (row % 2) * 7; x < W; x += 14) { const y0 = gy + 2 + row * (h / 4); c.fillStyle = ['#7d776c', '#6a655b', '#8a8478'][Math.floor(hsh(x + row * 3) * 3)]; c.beginPath(); c.ellipse(x + 7, y0 + h / 8, 6, h / 9, 0, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.15)'; c.beginPath(); c.ellipse(x + 5, y0 + h / 10, 3, 1.5, 0, 0, TAU); c.fill(); }
          break;
        }
        case 5: { // Ziegel im Fischgrätmuster
          for (let row = 0; row < 5; row++) for (let x = -20; x < W; x += 16) { const y0 = gy + row * 9; c.save(); c.translate(x + (row % 2) * 8, y0); c.rotate(row % 2 ? 0.5 : -0.5); c.fillStyle = hsh(x + row) > 0.5 ? '#b5603f' : '#9c4f33'; c.fillRect(0, 0, 14, 6); c.restore(); }
          c.fillStyle = '#d9b07a'; c.fillRect(0, gy, W, 3);
          break;
        }
        case 6: { // Eisenplatten mit Nieten und Schienen
          for (let x = 0; x < W; x += 40) { c.fillStyle = hsh(x) > 0.5 ? '#46413d' : '#3d3834'; c.fillRect(x + 1, gy + 1, 38, h - 2); c.fillStyle = '#6a625a'; [[4, 4], [34, 4], [4, h - 6], [34, h - 6]].forEach(([dx, dy]) => { c.beginPath(); c.arc(x + dx, gy + dy, 1.6, 0, TAU); c.fill(); }); }
          c.fillStyle = '#5a4030'; for (let x = 0; x < W; x += 10) c.fillRect(x, gy + 4, 6, 10);
          c.fillStyle = '#a8a29a'; c.fillRect(0, gy + 5, W, 2.5); c.fillRect(0, gy + 11, W, 2.5);
          break;
        }
        case 7: { // Asphalt mit Fahrbahnmarkierung und Bordstein
          c.fillStyle = '#b9bcc2'; c.fillRect(0, gy, W, 5); c.fillStyle = '#8a8e95'; for (let x = 0; x < W; x += 20) c.fillRect(x, gy, 1, 5);
          for (let i = 0; i < W / 3; i++) { c.fillStyle = hsh(i) > 0.5 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.12)'; c.fillRect(hsh(i + 1) * W, gy + 5 + hsh(i + 2) * (h - 5), 2, 1); }
          c.fillStyle = '#f2c14e'; for (let x = 0; x < W; x += 34) c.fillRect(x, gy + 5 + (h - 5) * 0.55, 18, 2.5);
          break;
        }
        default: { // Plasma-Metall: dunkle Platten, leuchtende Fugen
          for (let x = 0; x < W; x += 30) { const pg = c.createLinearGradient(x, gy, x + 30, gy + h); pg.addColorStop(0, '#2a2560'); pg.addColorStop(1, '#141030'); c.fillStyle = pg; c.fillRect(x + 1, gy + 1, 28, h - 2); }
          c.fillStyle = 'rgba(200,220,255,0.25)'; c.fillRect(0, gy + 1, W, 1);
        }
      }
      c.restore();
    }
    // Bewegte Teile: Wolken, Rauch, Funkeln, Blinklichter
    function drawSkyLive(v, th) {
      const gy = v.groundY, a = v.age, t = v.time;
      c.fillStyle = a === 8 ? 'rgba(160,140,255,0.16)' : a === 6 ? 'rgba(90,85,80,0.4)' : a === 2 ? 'rgba(220,228,236,0.85)' : 'rgba(255,255,255,0.7)';
      clouds.forEach(cl => {
        cl.x += cl.v * v.dt; if (cl.x > 1.2) cl.x = -0.2;
        const x = cl.x * W, y = cl.y * gy, s = cl.s * Math.min(40, W * 0.06) * (a === 2 ? 1.3 : 1);
        c.beginPath(); c.arc(x, y, s, 0, TAU); c.arc(x + s, y + s * 0.2, s * 0.8, 0, TAU); c.arc(x - s, y + s * 0.25, s * 0.7, 0, TAU); c.fill();
      });
      if (a === 0) { // Vulkanrauch
        const vx = W * 0.62, vy = gy - gy * 0.55;
        for (let k = 0; k < 6; k++) { const f = ((t * 0.12 + k / 6) % 1); c.fillStyle = `rgba(70,60,60,${0.45 * (1 - f)})`; c.beginPath(); c.arc(vx + f * 40 + Math.sin(f * 6 + k) * 6, vy - f * gy * 0.4, 10 + f * 26, 0, TAU); c.fill(); }
      }
      if (a === 6) { // Schlotrauch
        for (let k = 0; k < 7; k += 2) { const x = W * (0.25 + k * 0.1) + W * 0.05 + 4, h = 30 + hsh(k + 9) * 40, y = gy - h - 90; for (let q = 0; q < 4; q++) { const f = ((t * 0.15 + q / 4 + k * 0.1) % 1); c.fillStyle = `rgba(60,55,50,${0.5 * (1 - f)})`; c.beginPath(); c.arc(x + f * 50, y - f * 50, 6 + f * 18, 0, TAU); c.fill(); } }
      }
      if (a === 7) { const tx = W * 0.47; c.fillStyle = Math.sin(t * 4) > 0 ? '#ff3b30' : '#5a1a1a'; c.beginPath(); c.arc(tx, gy - gy * 0.62, 3, 0, TAU); c.fill(); }
      if (a === 8) { // Funkeln am Himmel
        for (let i = 0; i < 12; i++) { const tw = Math.sin(t * 3 + i * 1.7); if (tw < 0.6) continue; c.fillStyle = `rgba(255,255,255,${(tw - 0.6) * 2.2})`; const x = hsh(i + 70) * W, y = hsh(i + 71) * gy * 0.7; c.fillRect(x - 3, y - 0.5, 6, 1); c.fillRect(x - 0.5, y - 3, 1, 6); }
      }
    }

    function drawGround(v, th) {
      const gy = v.groundY;
      if (v.age === 8) { // leuchtende Fugen pulsieren, Funken laufen über die Bahn
        const p = 0.5 + 0.5 * Math.sin(v.time * 3);
        c.fillStyle = `rgba(75,227,255,${0.55 + 0.35 * p})`; c.fillRect(0, gy, W, 2);
        for (let x = 0; x < W; x += 30) { c.fillStyle = `rgba(75,227,255,${0.25 + 0.3 * Math.sin(v.time * 2 + x * 0.05)})`; c.fillRect(x, gy + 2, 1.5, H - gy); }
        for (let i = 0; i < 8; i++) { const x = ((v.time * 90 * (1 + i % 3) + i * 173) % (W + 40)) - 20; c.fillStyle = i % 2 ? '#ff7ad9' : '#bff8ff'; c.globalAlpha = 0.8; c.fillRect(x, gy + 4 + (i * 7) % Math.max(6, H - gy - 8), 6, 1.5); }
        c.globalAlpha = 1;
      }
      // Lineal mit Kilometern
      const step = niceStep(80 / v.scale);
      c.font = '600 11px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'top';
      for (let k = 0; ; k++) {
        const d = k * step, x = v.x0 + d * v.scale;
        if (x > W + 40) break;
        c.fillStyle = 'rgba(255,255,255,0.9)';
        c.fillRect(x - 1, gy + 5, 2, 9);
        if (k > 0) { const t = J.fmtKm(d); c.lineWidth = 3; c.strokeStyle = 'rgba(0,0,0,0.55)'; c.strokeText(t, x, gy + 16); c.fillText(t, x, gy + 16); }
        for (let j = 1; j < 5; j++) { const xs = x + j * step / 5 * v.scale; c.fillStyle = 'rgba(255,255,255,0.45)'; c.fillRect(xs, gy + 5, 1, 5); }
      }
    }

    function flag(x, gy, col, label, h) {
      c.strokeStyle = '#3b2b1a'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(x, gy); c.lineTo(x, gy - h); c.stroke();
      c.fillStyle = col; c.beginPath(); c.moveTo(x, gy - h); c.lineTo(x + 16, gy - h + 6); c.lineTo(x, gy - h + 12); c.fill();
      if (label) {
        c.font = '700 12px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'bottom';
        const w = c.measureText(label).width + 10;
        c.fillStyle = 'rgba(20,16,10,0.65)'; rr(c, x - w / 2, gy - h - 22, w, 18, 6); c.fill();
        c.fillStyle = '#fff'; c.fillText(label, x, gy - h - 7);
      }
    }

    // ---------- Hindernisse ----------
    // Farben je Zeitalter: Mauer, Turm, Flagge
    const PART_COL = [
      ['#3f6b2a', '#7a5a34', '#d94a3a'], ['#8a5a2b', '#a0703c', '#c98a3e'], ['#8d8a80', '#6d6a62', '#2f6fb2'],
      ['#c9b48a', '#b39a6a', '#a3262a'], ['#7b7d84', '#6a6c73', '#c0392b'], ['#a0583a', '#7a3f28', '#f2c14e'],
      ['#2d2f33', '#4a4540', '#d9473b'], ['#9b9a94', '#7d7c76', '#4a5530'], ['#3b3190', '#2a2366', '#4be3ff'],
    ];
    function label(x, y, text, bg) {
      c.font = '600 11px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const w = c.measureText(text).width + 12;
      c.fillStyle = bg; rr(c, x - w / 2, y - 10, w, 20, 8); c.fill();
      c.fillStyle = '#fff'; c.fillText(text, x, y);
    }
    function partColor(age, kind) {
      const col = PART_COL[age];
      return { wall: col[0], block: col[0], tower: col[1], cart: col[1], shield: '#9aa0a8', flag: col[2], banner: col[2], balloon: col[2] }[kind] || col[0];
    }
    // Ein Teil zeichnen (px,py = links oben in Pixeln)
    function drawPart(p, px, py, pw, ph, col, out, gy) {
      const k = p.kind;
      if (k === 'flag' || k === 'banner') {
        const poleX = k === 'flag' ? px : px + pw / 2;
        c.save(); c.setLineDash([]); c.strokeStyle = out ? 'rgba(255,255,255,0.5)' : '#3b2b1a'; c.lineWidth = Math.max(1, Math.min(3, pw * 0.12));
        c.beginPath(); c.moveTo(poleX, gy); c.lineTo(poleX, py - 2); c.stroke(); c.restore();
        c.beginPath();
        if (k === 'flag') { const wv = Math.sin(performance.now() / 180 + px) * ph * 0.08; c.moveTo(px, py); c.quadraticCurveTo(px + pw * 0.5, py + wv, px + pw, py + ph * 0.5); c.quadraticCurveTo(px + pw * 0.5, py + ph - wv, px, py + ph); c.closePath(); }
        else { c.moveTo(px, py); c.lineTo(px + pw, py); c.lineTo(px + pw, py + ph); c.lineTo(px + pw / 2, py + ph * 0.75); c.lineTo(px, py + ph); c.closePath(); }
        if (out) c.stroke(); else { c.fillStyle = col; c.fill(); }
      } else if (k === 'balloon') {
        c.save(); c.setLineDash([]); c.strokeStyle = out ? 'rgba(255,255,255,0.4)' : 'rgba(60,40,20,0.7)'; c.lineWidth = 1;
        c.beginPath(); c.moveTo(px + pw / 2, py + ph); c.quadraticCurveTo(px + pw * 0.2, (py + ph + gy) / 2, px + pw / 2, gy); c.stroke(); c.restore();
        c.beginPath(); c.ellipse(px + pw / 2, py + ph * 0.42, pw / 2, ph * 0.42, 0, 0, TAU);
        if (out) c.stroke(); else { c.fillStyle = col; c.fill(); c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.arc(px + pw * 0.33, py + ph * 0.25, Math.max(1, pw * 0.12), 0, TAU); c.fill(); c.fillStyle = '#5a3d1f'; c.fillRect(px + pw * 0.38, py + ph * 0.84, pw * 0.24, ph * 0.14); }
      } else if (k === 'shield') {
        c.save(); c.setLineDash([2, 3]); c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; c.beginPath(); c.moveTo(px + pw / 2, gy); c.lineTo(px + pw / 2, py - ph); c.stroke(); c.restore();
        c.beginPath(); c.rect(px, py, pw, ph);
        if (out) c.stroke(); else { c.fillStyle = col; c.fill(); c.fillStyle = 'rgba(255,255,255,0.4)'; c.fillRect(px + pw * 0.15, py + 2, Math.max(1, pw * 0.15), ph - 4); c.fillStyle = '#555'; [0.2, 0.8].forEach(f => { c.beginPath(); c.arc(px + pw / 2, py + ph * f, Math.max(1, pw * 0.1), 0, TAU); c.fill(); }); }
      } else if (k === 'dummy') { // Strohpuppe am Pfahl
        const cx = px + pw / 2;
        c.strokeStyle = out ? 'rgba(255,255,255,0.5)' : '#5a3a1f'; c.lineWidth = Math.max(1.5, pw * 0.12); c.beginPath(); c.moveTo(cx, py + ph); c.lineTo(cx, py + ph * 0.2); c.moveTo(px - pw * 0.1, py + ph * 0.38); c.lineTo(px + pw * 1.1, py + ph * 0.38); c.stroke();
        if (out) return;
        c.fillStyle = '#d9b45a'; rr(c, px + pw * 0.12, py + ph * 0.3, pw * 0.76, ph * 0.45, pw * 0.2); c.fill();
        c.strokeStyle = 'rgba(120,80,20,0.6)'; c.lineWidth = 1; for (let q = 1; q < 4; q++) { c.beginPath(); c.moveTo(px + pw * 0.15, py + ph * (0.3 + q * 0.11)); c.lineTo(px + pw * 0.85, py + ph * (0.32 + q * 0.11)); c.stroke(); }
        c.fillStyle = '#e8cf7a'; c.beginPath(); c.arc(cx, py + ph * 0.17, pw * 0.3, 0, TAU); c.fill();
        c.fillStyle = '#c0392b'; c.beginPath(); c.arc(cx, py + ph * 0.5, pw * 0.16, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(cx, py + ph * 0.5, pw * 0.08, 0, TAU); c.fill();
        c.fillStyle = '#3b2b1a'; c.fillRect(cx - pw * 0.14, py + ph * 0.14, Math.max(1, pw * 0.07), Math.max(1, pw * 0.07)); c.fillRect(cx + pw * 0.07, py + ph * 0.14, Math.max(1, pw * 0.07), Math.max(1, pw * 0.07));
      } else if (k === 'target') { // runde Zielscheibe, bei hohen Scheiben auf einem Pfahl
        const cx = px + pw / 2, cy = py + ph / 2, r = Math.min(pw, ph) / 2;
        if (p.post) { c.fillStyle = out ? 'rgba(255,255,255,0.3)' : '#6b4a2a'; c.fillRect(cx - Math.max(1.5, pw * 0.08), cy, Math.max(3, pw * 0.16), gy - cy); }
        c.beginPath(); c.arc(cx, cy, r, 0, TAU);
        if (out) { c.stroke(); return; }
        ['#e2473b', '#fff', '#e2473b', '#fff', '#ffd23f'].forEach((col, q) => { c.fillStyle = col; c.beginPath(); c.arc(cx, cy, r * (1 - q * 0.19), 0, TAU); c.fill(); });
        c.strokeStyle = '#5a3a1f'; c.lineWidth = Math.max(1, r * 0.1); c.beginPath(); c.arc(cx, cy, r, 0, TAU); c.stroke();
      } else if (k === 'cart') {
        c.beginPath(); c.rect(px, py, pw, ph * 0.75);
        if (out) c.stroke(); else { c.fillStyle = col; c.fill(); c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(px, py + ph * 0.3, pw, Math.max(1, ph * 0.08)); c.fillStyle = '#222'; [0.25, 0.75].forEach(f => { c.beginPath(); c.arc(px + pw * f, py + ph * 0.8, Math.max(1.5, ph * 0.2), 0, TAU); c.fill(); }); }
      } else {
        c.beginPath(); c.rect(px, py, pw, ph);
        if (k === 'tower') { const bw = pw / 5; for (let q = 0; q < 3; q++) c.rect(px + q * 2 * bw, py - bw, bw, bw); }
        if (out) c.stroke(); else {
          c.fillStyle = col; c.fill();
          c.strokeStyle = 'rgba(0,0,0,0.22)'; c.lineWidth = 1;
          if (k === 'block' && pw > 6) { c.strokeRect(px + 1, py + 1, pw - 2, ph - 2); c.beginPath(); c.moveTo(px + 1, py + 1); c.lineTo(px + pw - 1, py + ph - 1); c.moveTo(px + pw - 1, py + 1); c.lineTo(px + 1, py + ph - 1); c.stroke(); }
          else if (ph > 10) { for (let yy = py + ph / 4; yy < py + ph - 1; yy += ph / 4) { c.beginPath(); c.moveTo(px, yy); c.lineTo(px + pw, yy); c.stroke(); } }
          if (k === 'tower' && pw > 8) { c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(px + pw * 0.4, py + ph * 0.2, pw * 0.2, ph * 0.12); }
        }
      }
    }
    function drawObstacle(v, ob) {
      const o = ob.o, st = ob.state, gy = v.groundY, sc = v.scale;
      const X = x => v.x0 + x * sc, Y = y => gy - y * sc;
      const x0 = X(o.at), x1 = X(o.end);
      if (x0 > W + 40) { // außerhalb: Hinweis auf das nächste Hindernis
        if (ob.blocking && st !== 'outline' && v.phase !== 'aim' && v.phase !== 'flight' && !v.chal) {
          const t = '→ ' + (st === 'locked' ? '🔒 ' : '') + o.name + ' bei ' + J.fmtKm(o.at);
          c.font = '600 11px Fredoka, system-ui, sans-serif';
          const w = c.measureText(t).width + 12;
          label(W - w / 2 - 8, 56 + (v.boniN || 0) * 19, t, st === 'locked' ? 'rgba(60,60,70,0.8)' : 'rgba(120,20,20,0.75)');
        }
        return;
      }
      if (st === 'done') {
        if (x0 < v.x0 + 20) return;
        c.fillStyle = 'rgba(70,60,50,0.7)';
        for (let i = 0; i < 5; i++) { c.beginPath(); c.arc(x0 + (x1 - x0) * i / 4, gy - 2, 3 + (i % 2), 0, TAU); c.fill(); }
        return;
      }
      const out = st === 'outline';
      c.save();
      if (out) { c.setLineDash([4, 3]); c.strokeStyle = 'rgba(255,255,255,0.5)'; c.lineWidth = 1.5; }
      if (st === 'locked') c.globalAlpha = 0.75;
      const bars = [];
      // Fahnen/Ballons zuerst (Masten hinter den Mauern), dann Bauteile
      const order = o.parts.map((p, i) => i).sort((a, b) => (['flag', 'banner', 'balloon'].includes(o.parts[a].kind) ? 0 : 1) - (['flag', 'banner', 'balloon'].includes(o.parts[b].kind) ? 0 : 1));
      order.forEach(i => {
        const p = o.parts[i], hp = ob.hp[i];
        if (st === 'active' && hp <= 0) return;
        const q = J.partPos(o, i, v.time, ob.ys);
        const pw = Math.max(2, p.w * sc), ph = Math.max(2, p.h * sc);
        const hit = ob.hit[i] || 0; const px = X(q.x) + (hit > 0 ? Math.sin(hit * 50) * 3 * hit : 0), py = Y(q.y + p.h);
        drawPart(p, px, py, pw, ph, partColor(o.age, p.kind), out, gy);
        if (hit > 0.5 && !out) { c.fillStyle = `rgba(255,255,255,${(hit - 0.5) * 1.2})`; c.fillRect(px, py, pw, ph); }
        if (st === 'active') bars.push([px + pw / 2, py, pw, hp / p.hp]);
      });
      c.restore();
      // Lebensbalken je Teil (immer sichtbar)
      bars.forEach(([cx, top, pw, f]) => {
        const bw = Math.max(10, Math.min(46, pw + 4)), y = top - 8;
        c.fillStyle = 'rgba(0,0,0,0.65)'; rr(c, cx - bw / 2 - 1, y - 1, bw + 2, 6, 3); c.fill();
        c.fillStyle = f > 0.5 ? '#5ee07a' : f > 0.25 ? '#ffc53d' : '#ff5a4f'; rr(c, cx - bw / 2, y, Math.max(1, bw * f), 4, 2); c.fill();
      });
      if (v.dev && v.dev.hitbox) { c.strokeStyle = '#00e5ff'; c.lineWidth = 1; c.setLineDash([]); o.parts.forEach((p, i) => { const q = J.partPos(o, i, v.time, ob.ys); c.strokeRect(X(q.x), Y(q.y + p.h), p.w * sc, p.h * sc); }); }
      const ty = Math.max(30, Y(o.top) - 24), tx = (x0 + x1) / 2;
      if (out) { if (ob.firstOutline) label(tx, ty, '?', 'rgba(40,40,50,0.6)'); return; }
      const alive = ob.hp.filter(h => h > 0).length;
      if (ob.blocking) label(tx, ty, st === 'active' ? o.name + ' · ' + alive + '/' + o.parts.length + ' Teile' : '🔒 ' + o.name + ' · ab ' + J.AGES[o.age].name, st === 'active' ? 'rgba(120,20,20,0.8)' : 'rgba(50,50,60,0.8)');
      else if (st === 'locked') label(tx, ty, '🔒', 'rgba(50,50,60,0.7)');
      else if (st === 'active') label(tx, ty, alive + '/' + o.parts.length, 'rgba(120,20,20,0.6)');
    }
    // Zerstörte Teile: sacken ein und blassen aus; Trümmer drehen sich
    function drawWreckage(v) {
      v.ghosts.forEach(g => {
        const f = g.t / 0.6, sink = g.h * f;
        c.save(); c.globalAlpha = 1 - f; c.beginPath(); c.rect(g.x - 4, g.y - 20, g.w + 8, g.h + 20); c.clip();
        c.translate(g.x + g.w / 2, g.y + sink + g.h); c.rotate((f * 0.3) * (g.w > g.h ? 1 : -1)); c.scale(1 + f * 0.15, 1 - f * 0.4);
        c.fillStyle = g.col; c.fillRect(-g.w / 2, -g.h, g.w, g.h); c.restore();
      });
      v.debris.forEach(d => {
        const f = Math.max(0.25, Math.min(2, v.scale / d.sc0)), w = Math.max(1.5, d.w * f), h = Math.max(1.5, d.h * f);
        const x = v.x0 + d.x * v.scale; if (x < -20 || x > W + 20) return;
        const y = v.groundY - d.y * v.scale - (d.rest ? Math.min(w, h) / 2 : 0);
        c.save(); c.globalAlpha = Math.min(1, d.life / 1.5); c.translate(x, y); c.rotate(d.rot);
        c.fillStyle = d.col;
        if (d.shred) { c.beginPath(); c.moveTo(-w / 2, -h / 2); c.lineTo(w / 2, -h / 3); c.lineTo(w / 3, h / 2); c.lineTo(-w / 2, h / 3); c.closePath(); c.fill(); }
        else { c.fillRect(-w / 2, -h / 2, w, h); if (w > 4) { c.fillStyle = 'rgba(255,255,255,0.18)'; c.fillRect(-w / 2, -h / 2, w, Math.max(1, h * 0.25)); c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 1; c.strokeRect(-w / 2, -h / 2, w, h); } }
        c.restore();
      });
      (v.rings || []).forEach(r => { const a = 1 - r.t / 0.4; c.strokeStyle = `rgba(${r.col},${a})`; c.lineWidth = 3 * a + 1; c.beginPath(); c.arc(r.x, r.y, 6 + r.t * 140, 0, TAU); c.stroke(); });
      c.globalAlpha = 1;
    }

    // ---------- Spieler: 3 Skins je Zeitalter (Mann, Frau, Kind), Zug-/Drückbewegung beim Zünden ----------
    // Kleidung je Zeitalter: Oberteil, Besatz, Beine, Schuhe, Gürtel, Haare
    const OUTFIT = [
      { top: '#8a5a32', trim: '#5a3a1f', leg: '#f0c79a', shoe: null, belt: '#4a2e14', hair: '#3b2414', spots: true },
      { top: '#d8c79f', trim: '#c98a3e', leg: '#6b5537', shoe: '#5a3a1f', belt: '#b8792f', hair: '#2b1a10' },
      { top: '#3f6b4a', trim: '#2f4f8a', leg: '#4a4b50', shoe: '#3b2b1a', belt: '#7a5230', hair: '#a8562a', plaid: true },
      { top: '#f4f1e8', trim: '#a3262a', leg: '#f0c79a', shoe: '#7a5230', belt: '#c9a46a', hair: '#3b2414' },
      { top: '#a7adb7', trim: '#c0392b', leg: '#5a5c63', shoe: '#2b2b2e', belt: '#5a3a1f', hair: '#6b4423', mail: true },
      { top: '#9c2a3a', trim: '#f2c14e', leg: '#2b2240', shoe: '#1b1a19', belt: '#f2c14e', hair: '#5a3a1f' },
      { top: '#33302e', trim: '#8f8a80', leg: '#1f1d1c', shoe: '#111', belt: '#c98a3e', hair: '#2b2b2b' },
      { top: '#5c6b3c', trim: '#3e4a28', leg: '#4a5530', shoe: '#222', belt: '#2f3320', hair: '#4a3020', camo: true },
      { top: '#e9eef7', trim: '#4be3ff', leg: '#c4ccd9', shoe: '#8a94a8', belt: '#3b3190', hair: '#2a2a40' },
    ];
    const ACTION = ['sling', 'rope', 'rope', 'rope', 'rope', 'torch', 'lever', 'rope', 'push'];
    // Arm als zwei Glieder zur Zielhand (einfache Inverse Kinematik)
    function arm(sx, sy, hx, hy, col, w, bend) {
      const L = 8.5, dx = hx - sx, dy = hy - sy, d = Math.min(2 * L - 0.01, Math.hypot(dx, dy)), an = Math.atan2(dy, dx), k = Math.acos(d / (2 * L)) * (bend || 1);
      const ex = sx + Math.cos(an + k) * L, ey = sy + Math.sin(an + k) * L, tx = sx + Math.cos(an) * d, ty = sy + Math.sin(an) * d;
      c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round';
      c.beginPath(); c.moveTo(sx, sy); c.lineTo(ex, ey); c.lineTo(tx, ty); c.stroke();
      return [tx, ty];
    }
    function drawPlayer(v, x, gy, age, t, pose, skin, act) {
      skin = skin || 0; act = act || 0;
      const O = OUTFIT[age], kid = skin === 2, fem = skin === 1, skinCol = age === 8 ? '#f0c79a' : ['#f0c79a', '#e8b98a', '#f3cfa5'][skin];
      const type = ACTION[age];
      // Bewegung: k = Zugstärke 0..1 (schnell ziehen, langsam zurück), aim = bereit machen
      const u = 1 - act, k = pose === 'fire' ? (u < 0.25 ? Math.sin(u / 0.25 * Math.PI / 2) : Math.max(0, 1 - (u - 0.25) / 0.75)) : 0;
      const aim = pose === 'aim' ? 1 : 0, breathe = Math.sin(t * 2.2) * 0.6;
      const push = type === 'push' || type === 'torch' || type === 'lever';
      const lean = push ? 0.05 * aim + 0.22 * k : -0.04 * aim - 0.2 * k + 0.06 * aim;
      c.save(); c.translate(x, gy); if (kid) c.scale(0.8, 0.8);
      // Werkzeug, das zur Zündung gehört (hinter der Figur)
      if (type === 'push') { // Konsole mit Knopf
        c.fillStyle = '#2a2366'; rr(c, 13, -26, 12, 26, 3); c.fill(); c.fillStyle = '#3b3190'; rr(c, 10, -30, 18, 6, 2); c.fill();
        c.fillStyle = k > 0.2 ? '#ff7ad9' : '#e2473b'; c.beginPath(); c.ellipse(19, -31 + k * 2, 4, 2.4, 0, 0, TAU); c.fill();
        c.fillStyle = '#4be3ff'; c.fillRect(15, -20, 8, 2); c.fillStyle = Math.sin(t * 6) > 0 ? '#5ee07a' : '#2a6a3a'; c.fillRect(15, -15, 3, 3);
      }
      if (type === 'lever') { c.fillStyle = '#3b3633'; rr(c, 10, -8, 14, 8, 2); c.fill(); }
      // Beine
      const legCol = O.leg, sw = Math.sin(t * 2) * 0.3;
      c.strokeStyle = legCol; c.lineWidth = 5; c.lineCap = 'round';
      const step = (push ? 3 * k : -3 * k) + (pose === 'walk' ? Math.sin(t * 12) * 4 : 0), step2 = pose === 'walk' ? -step * 2 : step * 0.5;
      c.beginPath(); c.moveTo(-3, -16); c.lineTo(-5 - step, -2); c.moveTo(3, -16); c.lineTo(5 + step2 + sw, -2); c.stroke();
      if (O.shoe) { c.fillStyle = O.shoe; rr(c, -9 - step, -3.5, 7, 4, 2); c.fill(); rr(c, 2 + step2, -3.5, 8, 4, 2); c.fill(); }
      // Oberkörper (lehnt sich beim Ziehen zurück bzw. beim Drücken nach vorn)
      c.save(); c.translate(0, -16); c.rotate(lean); c.translate(0, 16 + breathe * 0.3);
      // Haare hinten (Frau: lang)
      if (fem && age !== 8) { c.fillStyle = O.hair; rr(c, -9, -50, 9, 22, 4); c.fill(); }
      // Körper / Kleid
      c.fillStyle = O.top;
      if (fem && age !== 7 && age !== 8) { c.beginPath(); c.moveTo(-8, -37); c.lineTo(8, -37); c.lineTo(11, -12); c.lineTo(-11, -12); c.closePath(); c.fill(); }
      else { rr(c, -9, -37, 18, 22, 6); c.fill(); }
      // Details
      if (O.spots) { c.fillStyle = '#5a3a1f'; [[-4, -30], [3, -24], [-2, -19], [5, -32]].forEach(([a, b]) => { c.beginPath(); c.arc(a, b, 1.7, 0, TAU); c.fill(); }); c.strokeStyle = '#e8dcc0'; c.lineWidth = 1.5; c.beginPath(); c.arc(0, -38, 5, 0.3, Math.PI - 0.3); c.stroke(); }
      if (O.plaid) { c.strokeStyle = 'rgba(47,79,138,0.7)'; c.lineWidth = 1.5; for (let q = -6; q <= 6; q += 4) { c.beginPath(); c.moveTo(q, -36); c.lineTo(q, -15); c.stroke(); } for (let q = -33; q < -15; q += 5) { c.beginPath(); c.moveTo(-8, q); c.lineTo(8, q); c.stroke(); } c.fillStyle = '#7a5230'; c.beginPath(); c.moveTo(-9, -37); c.lineTo(-2, -37); c.lineTo(-10, -18); c.fill(); }
      if (age === 3) { c.strokeStyle = O.trim; c.lineWidth = 3; c.beginPath(); c.moveTo(-8, -35); c.lineTo(8, -18); c.stroke(); }
      if (O.mail) { c.fillStyle = 'rgba(0,0,0,0.18)'; for (let yy = -35; yy < -15; yy += 3) for (let xx = -7 + (yy % 2); xx < 8; xx += 3) c.fillRect(xx, yy, 1.2, 1.2); c.fillStyle = '#f4f1e8'; rr(c, -5, -34, 10, 18, 2); c.fill(); c.fillStyle = O.trim; c.fillRect(-1.5, -33, 3, 16); c.fillRect(-4.5, -28, 9, 3); }
      if (age === 5) { c.fillStyle = O.trim; [-6, 6].forEach(xx => { c.beginPath(); c.arc(xx, -35, 3.5, 0, TAU); c.fill(); }); c.fillStyle = '#fff'; c.beginPath(); c.ellipse(0, -37, 6, 2, 0, 0, TAU); c.fill(); }
      if (age === 6) { c.fillStyle = '#5a4a40'; c.fillRect(-1, -36, 2, 20); c.fillStyle = O.trim; [-30, -25, -20].forEach(yy => { c.beginPath(); c.arc(3, yy, 1, 0, TAU); c.fill(); }); if (fem) { c.fillStyle = '#e8e0d0'; rr(c, -5, -28, 10, 15, 2); c.fill(); } }
      if (O.camo) { c.fillStyle = '#3e4a28'; [[-5, -31, 4], [3, -24, 3.5], [-2, -20, 3]].forEach(([a, b, r]) => { c.beginPath(); c.ellipse(a, b, r, r * 0.6, 0.5, 0, TAU); c.fill(); }); c.fillStyle = '#2f3320'; c.fillRect(-7, -32, 4, 5); c.fillRect(3, -32, 4, 5); }
      if (age === 8) { c.fillStyle = O.trim; c.fillRect(-4, -31, 8, 3); c.fillStyle = 'rgba(75,227,255,0.5)'; c.fillRect(-8, -22, 16, 1.5); c.fillStyle = '#3b3190'; rr(c, -12, -36, 5, 16, 2); c.fill(); }
      if (O.belt) { c.fillStyle = O.belt; c.fillRect(fem && age !== 7 && age !== 8 ? -9 : -9, -19, 18, 2.5); }
      // Kopf
      const hy = -45;
      c.fillStyle = skinCol; c.beginPath(); c.arc(0, hy, kid ? 9 : 8, 0, TAU); c.fill();
      c.fillStyle = '#222'; c.beginPath(); c.arc(3.2, hy - 1, 1.3, 0, TAU); c.fill();
      c.strokeStyle = 'rgba(60,30,10,0.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(1.5, hy - 3.6); c.lineTo(5, hy - 4.2 + k * 0.8); c.stroke();
      c.strokeStyle = '#8a3a2a'; c.beginPath(); if (k > 0.3) c.arc(4, hy + 3.2, 1.6, 0, TAU); else c.arc(3.5, hy + 2.2, 2, 0.2, Math.PI - 0.6); c.stroke();
      if (fem) { c.fillStyle = 'rgba(255,120,120,0.35)'; c.beginPath(); c.arc(4, hy + 1.5, 1.8, 0, TAU); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(4, hy - 2); c.lineTo(5.6, hy - 2.8); c.stroke(); }
      if (!fem && !kid && [0, 2, 4].includes(age)) { c.fillStyle = O.hair; c.beginPath(); c.moveTo(-3, hy + 2); c.quadraticCurveTo(2, hy + 11, 7, hy + 3); c.lineTo(6, hy + 1); c.quadraticCurveTo(2, hy + 5, -2, hy + 1); c.fill(); }
      // Haare vorne / Kopfbedeckung
      hat(age, hy, O, fem, kid);
      c.restore();
      // Arme: hinterer Arm hält mit, vorderer zieht/drückt
      const sx = 3 + Math.sin(lean) * 16, sy = -31 + (1 - Math.cos(lean)) * 16;
      let hx = 12, hy2 = -22, tool = null;
      if (type === 'sling') { hx = 18 + 2 * aim - 6 * k; hy2 = -36 - 3 * aim - 4 * k; }
      else if (type === 'rope') { hx = 14 + 2 * aim - 12 * k; hy2 = -24 + 2 * k; tool = 'rope'; }
      else if (type === 'torch') { hx = 10 + 4 * aim + 8 * k; hy2 = -28 + 2 * k; tool = 'torch'; }
      else if (type === 'lever') { const la = -0.3 + 0.9 * k; hx = 17 + Math.sin(la) * 26; hy2 = -6 - Math.cos(la) * 26; tool = 'lever'; }
      else { hx = 18 + 1 * aim; hy2 = -36 + 5 * k - 3 * aim * (1 - k); }
      if (tool === 'lever') { const la = -0.3 + 0.9 * k; c.strokeStyle = '#8f8a80'; c.lineWidth = 3; c.beginPath(); c.moveTo(17, -6); c.lineTo(17 + Math.sin(la) * 28, -6 - Math.cos(la) * 28); c.stroke(); c.fillStyle = '#c0392b'; c.beginPath(); c.arc(17 + Math.sin(la) * 28, -6 - Math.cos(la) * 28, 3, 0, TAU); c.fill(); }
      if (tool === 'rope') { // Zugleine zur Kanone
        c.strokeStyle = '#d9c9a0'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(hx, hy2); const tx = 24, ty = -12; c.quadraticCurveTo((hx + tx) / 2, Math.max(hy2, ty) + 6 * (1 - k) * (1 - aim), tx, ty); c.stroke();
      }
      const sleeve = age === 8 ? O.top : age === 0 || age === 3 ? skinCol : O.top;
      arm(sx - 3, sy, hx - 4, hy2 + 2, sleeve, 4, -1);
      const [ax, ay] = arm(sx, sy, hx, hy2, sleeve, 4, -1);
      c.fillStyle = age === 8 ? '#c4ccd9' : skinCol; c.beginPath(); c.arc(ax, ay, 2.6, 0, TAU); c.fill();
      if (tool === 'torch') { // Luntenstock mit glühender Spitze
        c.strokeStyle = '#6b4423'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(ax - 4, ay + 4); c.lineTo(ax + 12, ay - 6); c.stroke();
        const fl = 0.7 + 0.3 * Math.sin(t * 25); c.fillStyle = `rgba(255,160,40,${fl})`; c.beginPath(); c.arc(ax + 13, ay - 7, 3 + k * 2, 0, TAU); c.fill(); c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(ax + 13, ay - 7, 1.4, 0, TAU); c.fill();
      }
      c.restore();
    }
    function hat(age, hy, O, fem, kid) {
      const y = hy - 2;
      switch (age) {
        case 0:
          c.fillStyle = O.hair; c.beginPath(); c.arc(-1, y, 8.6, Math.PI * 0.95, Math.PI * 2.05); c.fill(); for (let q = 0; q < 4; q++) { c.beginPath(); c.moveTo(-8 + q * 4, y - 5); c.lineTo(-6 + q * 4, y - 11 - (q % 2) * 2); c.lineTo(-4 + q * 4, y - 5); c.fill(); }
          if (fem) { c.fillStyle = '#efe6d0'; c.fillRect(-7, y - 6, 6, 2); } else if (!kid) c.fillRect(-9, y, 4, 9);
          break;
        case 1:
          if (fem) { c.fillStyle = O.hair; c.beginPath(); c.arc(0, y, 8.6, Math.PI, 0); c.fill(); c.fillStyle = O.trim; c.fillRect(-8.5, y - 1, 17, 2.2); }
          else { c.fillStyle = O.trim; c.beginPath(); c.moveTo(-9, y + 1); c.lineTo(0, y - (kid ? 11 : 15)); c.lineTo(9, y + 1); c.fill(); c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(-9, y - 1, 18, 2); }
          break;
        case 2:
          if (fem) { c.fillStyle = O.hair; c.beginPath(); c.arc(0, y, 8.8, Math.PI, 0); c.fill(); c.strokeStyle = O.hair; c.lineWidth = 3; c.beginPath(); c.moveTo(-6, y + 2); c.quadraticCurveTo(-10, y + 12, -6, y + 18); c.stroke(); c.fillStyle = '#c9a46a'; c.beginPath(); c.arc(0, y + 12, 3, 0, Math.PI); c.fill(); }
          else { c.fillStyle = '#6d7078'; c.beginPath(); c.arc(0, y - 1, 9, Math.PI, 0); c.fill(); c.fillRect(1, y - 1, 2, 7); c.fillStyle = '#a0a4ac'; c.fillRect(-1, y - 11, 2, 4); }
          break;
        case 3:
          c.fillStyle = O.hair; c.beginPath(); c.arc(0, y, 8.4, Math.PI * 1.05, Math.PI * 1.95); c.fill();
          if (fem) { c.beginPath(); c.arc(-6, y - 5, 4, 0, TAU); c.fill(); c.fillStyle = O.trim; c.fillRect(-9, y - 6, 4, 1.5); }
          else { c.strokeStyle = '#4f8a3a'; c.lineWidth = 3; c.beginPath(); c.arc(0, y + 1, 8.5, Math.PI * 1.05, Math.PI * 1.95); c.stroke(); c.fillStyle = '#6aa84f'; [-6, -2, 2, 6].forEach(xx => { c.beginPath(); c.ellipse(xx, y - 6 + Math.abs(xx) * 0.3, 2, 1, xx * 0.1, 0, TAU); c.fill(); }); }
          break;
        case 4:
          if (fem) { c.fillStyle = '#f4f1e8'; c.beginPath(); c.arc(0, y, 9.5, Math.PI, 0); c.fill(); c.fillRect(-10, y, 5, 14); c.fillStyle = '#2f6fb2'; c.fillRect(-9.5, y - 2, 19, 2); }
          else if (kid) { c.fillStyle = '#c0392b'; c.beginPath(); c.ellipse(0, y - 4, 9, 4, 0, 0, TAU); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-5, y - 7, 1.8, 0, TAU); c.fill(); }
          else { c.fillStyle = '#a7adb7'; rr(c, -9, y - 9, 18, 14, 4); c.fill(); c.fillStyle = '#222'; c.fillRect(0, y - 2, 9, 2); c.fillStyle = O.trim; c.beginPath(); c.ellipse(-2, y - 13, 3, 6, -0.4, 0, TAU); c.fill(); }
          break;
        case 5:
          c.fillStyle = '#2b2240'; c.beginPath(); c.ellipse(0, y - 5, kid ? 9 : 11, 4, 0, 0, TAU); c.fill(); c.fillRect(-6, y - 10, 12, 5);
          c.strokeStyle = fem ? '#ff9ac9' : '#f2f2f2'; c.lineWidth = 2; c.beginPath(); c.moveTo(-4, y - 8); c.quadraticCurveTo(-14, y - 18, -16, y - 10); c.stroke();
          if (fem) { c.fillStyle = O.hair; c.beginPath(); c.arc(-7, y + 3, 4, 0, TAU); c.fill(); }
          break;
        case 6:
          if (fem) { c.fillStyle = '#7a5a4a'; c.beginPath(); c.arc(0, y - 1, 9.5, Math.PI * 0.85, Math.PI * 2.1); c.fill(); c.strokeStyle = '#c98a3e'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(6, y + 1); c.lineTo(4, y + 8); c.stroke(); }
          else if (kid) { c.fillStyle = '#5a5048'; c.beginPath(); c.arc(0, y - 2, 9, Math.PI, 0); c.fill(); c.fillRect(0, y - 3, 12, 2.5); }
          else { c.fillStyle = '#1b1a19'; c.fillRect(-7, y - 19, 14, 14); c.fillRect(-11, y - 6, 22, 3); c.fillStyle = '#8a3a2a'; c.fillRect(-7, y - 9, 14, 2); }
          c.fillStyle = '#c98a3e'; c.beginPath(); c.arc(3, y + 1, 3, 0, TAU); c.fill(); c.fillStyle = '#9fe0ff'; c.beginPath(); c.arc(3, y + 1, 1.8, 0, TAU); c.fill();
          break;
        case 7:
          if (fem) { c.fillStyle = O.hair; c.beginPath(); c.moveTo(-7, y + 1); c.quadraticCurveTo(-15, y + 4, -12, y + 12); c.lineTo(-8, y + 4); c.fill(); }
          c.fillStyle = kid ? '#3e4a28' : '#4a5530'; c.beginPath(); c.arc(0, y - 1, kid ? 9 : 10, Math.PI, 0); c.fill(); c.fillRect(kid ? 0 : -11, y - 2, kid ? 12 : 22, 3);
          if (!kid) { c.strokeStyle = '#2f3320'; c.lineWidth = 1; c.beginPath(); c.moveTo(-8, y - 4); c.lineTo(8, y - 6); c.stroke(); }
          break;
        case 8:
          c.strokeStyle = '#c4ccd9'; c.lineWidth = 3; c.beginPath(); c.arc(0, y + 2, 11, 0, TAU); c.stroke();
          c.fillStyle = 'rgba(75,227,255,0.35)'; c.beginPath(); c.arc(2, y + 2, 7.5, -1.3, 1.3); c.fill();
          if (fem) { c.fillStyle = O.hair; c.beginPath(); c.arc(-3, y - 4, 4, 0, TAU); c.fill(); }
          c.fillStyle = '#ff5ad9'; c.beginPath(); c.arc(-1, y - 9, 1.5, 0, TAU); c.fill(); c.strokeStyle = '#c4ccd9'; c.lineWidth = 1; c.beginPath(); c.moveTo(-1, y - 9); c.lineTo(-3, y - 15); c.stroke();
          break;
      }
    }
    // Vorschau für die Skin-Auswahl (eigenes Canvas)
    function previewPlayer(cv, age, skin) {
      const keep = c, d = 2; cv.width = 84 * d; cv.height = 96 * d;
      c = cv.getContext('2d'); c.setTransform(d * 1.45, 0, 0, d * 1.45, 0, 0);
      const g = c.createLinearGradient(0, 0, 0, 66); g.addColorStop(0, THEME[age].sky[0]); g.addColorStop(1, THEME[age].sky[1]); c.fillStyle = g; c.fillRect(0, 0, 58, 66);
      c.fillStyle = THEME[age].ground; c.fillRect(0, 58, 58, 8);
      drawPlayer({ time: 0 }, 26, 58, age, 0.3, 'idle', skin, 0);
      c = keep;
    }

    // ---------- Kanone je Zeitalter: jedes Upgrade verändert sie sichtbar ----------
    // Schusskraft → längeres, dickeres Rohr aus edlerem Material · Wucht → andere Munition (Stapel neben der Kanone)
    // alle 4 Upgrades → neues Gestell (Holzpodest, Dreibein, goldene Drehscheibe)
    const MUZ = [[0, -38, 0], [0, -16, 34], [0, -22, 40], [0, -18, 38], [0, -46, 42], [0, -16, 42], [0, -18, 46], [0, -16, 56], [0, -18, 58]];
    const LIFT = [0, 5, 9, 12];
    const curOf = cur => cur || { kraft: 0, wucht: 0, ziel: 0, gluck: 0 };
    const standTier = cur => { cur = curOf(cur); return Math.min(3, Math.floor((cur.kraft + cur.wucht + cur.ziel + cur.gluck) / 4)); };
    const lenF = cur => 1 + 0.14 * curOf(cur).kraft;
    // Rohr-Material je Schusskraft-Stufe: [Rohr, Bänder]
    const BAR_MAT = [null, ['#7d8590', '#c9a46a'], ['#5d6a78', '#e0b04a'], ['#d9a93a', '#fff1a8']];
    function drawStand(age, tier, t) {
      if (!tier) return;
      const early = age <= 4, wood = early ? '#7a5230' : '#4a4f57', wood2 = early ? '#5a3a1f' : '#2f3338', h = LIFT[tier];
      if (tier >= 2) { // Dreibein / Stützen
        c.strokeStyle = wood2; c.lineWidth = 4; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-20, 0); c.lineTo(-8, -h); c.moveTo(20, 0); c.lineTo(8, -h); c.moveTo(0, 0); c.lineTo(0, -h); c.stroke();
        c.fillStyle = wood2; [-20, 20].forEach(x => { rr(c, x - 4, -3, 8, 3, 1); c.fill(); });
      }
      c.fillStyle = tier === 3 ? '#c99a2e' : wood; rr(c, -24, -h - 4, 48, tier >= 2 ? 6 : h + 4, 3); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(-22, -h - 3, 44, 1.5);
      if (tier === 1) { c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; for (let x = -16; x < 24; x += 12) { c.beginPath(); c.moveTo(x, -h - 3); c.lineTo(x, 0); c.stroke(); } }
      if (tier === 3) { // goldene Drehscheibe mit Edelsteinen
        c.fillStyle = '#ffe07a'; c.fillRect(-24, -h - 4, 48, 1.5);
        ['#e2473b', '#4be3ff', '#5ee07a'].forEach((col, k) => { c.fillStyle = col; c.beginPath(); c.arc(-14 + k * 14, -h - 1, 2, 0, TAU); c.fill(); });
        c.fillStyle = `rgba(255,240,170,${0.35 + 0.3 * Math.sin(t * 4)})`; c.beginPath(); c.arc(-14 + (Math.floor(t * 1.5) % 3) * 14, -h - 1, 3.2, 0, TAU); c.fill();
      }
    }
    // Munitionsstapel neben der Kanone: zeigt die aktuelle Munition (ändert sich mit Wucht)
    function drawAmmoPile(age, wucht, t) {
      const n = [2, 3, 3, 4][wucht];
      for (let k = 0; k < n; k++) { const row = k >= (n > 3 ? 3 : n) ? 1 : 0, col = row ? k - 3 : k; drawBall(age, wucht, 33 + col * 8 + row * 4, -4 - row * 7, 0.6, 0, t, 0.75); }
    }
    function drawCannon(v, x, gy, age, ang, recoil, cur) {
      cur = curOf(cur);
      const a = -ang * Math.PI / 180, kf = lenF(cur), wf = 1 + 0.1 * cur.kraft, tier = standTier(cur), mat = BAR_MAT[cur.kraft];
      c.save(); c.translate(x, gy);
      drawAmmoPile(age, cur.wucht, v.time);
      drawStand(age, tier, v.time);
      c.translate(0, -LIFT[tier]);
      const barrel = (len, wid, col, pivotY, tip) => {
        len *= kf; wid *= wf;
        c.save(); c.translate(0, pivotY); c.rotate(a); c.translate(-recoil * 6, 0);
        c.fillStyle = mat && age >= 5 ? mat[0] : col; rr(c, -8, -wid / 2, len, wid, wid / 2.5); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(-4, -wid / 2 + 1.5, len - 10, Math.max(1, wid * 0.15));
        if (tip) { c.fillStyle = cur.kraft >= 3 ? '#ffd23f' : tip; c.fillRect(len - 12, -wid / 2 - 1, 5, wid + 2); }
        if (mat) for (let k = 0; k < cur.kraft; k++) { c.fillStyle = mat[1]; c.fillRect(len * (0.18 + k * 0.2), -wid / 2 - 1.5, 3, wid + 3); }
        if (cur.kraft >= 3) { c.fillStyle = `rgba(255,230,120,${0.35 + 0.25 * Math.sin(v.time * 5)})`; c.beginPath(); c.arc(len - 8, 0, wid * 0.7, 0, TAU); c.fill(); }
        c.restore();
      };
      const wheel = (wx, r, col) => { c.fillStyle = col; c.beginPath(); c.arc(wx, -r, r, 0, TAU); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1.5; for (let k = 0; k < 3; k++) { const an = k * Math.PI / 3; c.beginPath(); c.moveTo(wx - Math.cos(an) * r * 0.85, -r - Math.sin(an) * r * 0.85); c.lineTo(wx + Math.cos(an) * r * 0.85, -r + Math.sin(an) * r * 0.85); c.stroke(); } c.fillStyle = 'rgba(0,0,0,0.45)'; c.beginPath(); c.arc(wx, -r, r * 0.3, 0, TAU); c.fill(); };
      switch (age) {
        case 0: { // Steinschleuder: Astgabel + Band (Gabel wächst, Band wird dicker und bunter)
          const fh = 4 * cur.kraft;
          c.strokeStyle = ['#6b4423', '#7a4a20', '#5a3a1f', '#8a5a2b'][cur.kraft]; c.lineWidth = 6 + cur.kraft; c.lineCap = 'round';
          c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -22 - fh * 0.5); c.moveTo(0, -22 - fh * 0.5); c.lineTo(-8, -38 - fh); c.moveTo(0, -22 - fh * 0.5); c.lineTo(9, -38 - fh); c.stroke();
          if (cur.kraft >= 2) { c.strokeStyle = '#c9a46a'; c.lineWidth = 2; c.beginPath(); c.moveTo(-3, -16); c.lineTo(3, -12); c.moveTo(-3, -12); c.lineTo(3, -8); c.stroke(); }
          const pull = 10 + recoil * -8;
          const px = -Math.cos(-a) * pull, py = -38 - fh + Math.sin(-a) * pull;
          c.strokeStyle = ['#3b2b1a', '#8a3a2a', '#c94a3a', '#e0b04a'][cur.kraft]; c.lineWidth = 2 + cur.kraft * 0.7; c.beginPath(); c.moveTo(-8, -38 - fh); c.lineTo(px, py); c.lineTo(9, -38 - fh); c.stroke();
          c.fillStyle = '#5a3a1f'; c.beginPath(); c.arc(px, py, 3, 0, TAU); c.fill();
          break;
        }
        case 1: // Wurfarm auf Holzklotz
          c.fillStyle = '#7a5230'; rr(c, -16, -14, 32, 14, 3); c.fill(); c.fillStyle = 'rgba(0,0,0,0.2)'; c.fillRect(-16, -8, 32, 2);
          barrel(40, 7, '#c98a3e', -16, '#8a5a2b');
          break;
        case 2: // Balliste
          c.strokeStyle = '#5a3d1f'; c.lineWidth = 4; c.beginPath(); c.moveTo(-12, 0); c.lineTo(0, -20); c.lineTo(12, 0); c.stroke();
          barrel(46, 6, '#6b4423', -22, '#5d5f66');
          c.save(); c.translate(0, -22); c.rotate(a); c.strokeStyle = '#3b2b1a'; c.lineWidth = 3 + cur.kraft * 0.6; c.beginPath(); c.moveTo(22 * kf, -16 - cur.kraft * 2); c.quadraticCurveTo(30 * kf, 0, 22 * kf, 16 + cur.kraft * 2); c.stroke();
          c.strokeStyle = '#d9c9a0'; c.lineWidth = 1; c.beginPath(); c.moveTo(22 * kf, -16 - cur.kraft * 2); c.lineTo(-recoil * 6, 0); c.lineTo(22 * kf, 16 + cur.kraft * 2); c.stroke(); c.restore();
          break;
        case 3: // Onager
          c.fillStyle = '#8a5a2b'; c.fillRect(-22, -16, 44, 10); wheel(-14, 7, '#5a3d1f'); wheel(14, 7, '#5a3d1f');
          barrel(42, 6, '#a0703c', -18, null);
          c.save(); c.translate(0, -18); c.rotate(a); c.fillStyle = '#5a3d1f'; c.beginPath(); c.arc(36 * kf, -4, 6 + cur.kraft, 0, TAU); c.fill(); c.restore();
          break;
        case 4: // Tribok
          c.strokeStyle = '#6b4423'; c.lineWidth = 5; c.beginPath(); c.moveTo(-18, 0); c.lineTo(0, -46); c.lineTo(18, 0); c.moveTo(-12, -16); c.lineTo(12, -16); c.stroke();
          c.save(); c.translate(0, -46); c.rotate(a); c.translate(-recoil * 6, 0);
          c.fillStyle = '#8a5a2b'; c.fillRect(-20, -3, 62 * kf, 6); c.fillStyle = cur.kraft >= 2 ? '#3d3f45' : '#555'; c.fillRect(-26 - cur.kraft * 2, -2, 12 + cur.kraft * 4, 16 + cur.kraft * 3); c.restore();
          break;
        case 5: // Bronzekanone auf Lafette
          c.fillStyle = '#6b4423'; c.beginPath(); c.moveTo(-22, 0); c.lineTo(10, -14); c.lineTo(14, -6); c.lineTo(-18, 0); c.fill();
          barrel(48, 13, '#b8792f', -16, '#8f5a1f'); wheel(2, 11, '#4a2e14');
          break;
        case 6: // Dampfgeschütz
          c.fillStyle = '#3b3633'; rr(c, -24, -22, 22, 22, 4); c.fill(); c.fillRect(-20, -38, 6, 16); c.fillStyle = '#8f8a80'; c.fillRect(-24, -14, 22, 2);
          barrel(52, 14, '#26272b', -18, '#8f8a80'); wheel(-12, 9, '#1b1a19'); wheel(10, 9, '#1b1a19');
          c.fillStyle = 'rgba(220,220,220,0.5)'; c.beginPath(); c.arc(-17, -44 - Math.sin(v.time * 2) * 3, 5, 0, TAU); c.arc(-12, -52, 6, 0, TAU); c.fill();
          break;
        case 7: // Haubitze
          c.fillStyle = '#4a5530'; c.beginPath(); c.moveTo(-26, 0); c.lineTo(-4, -14); c.lineTo(24, 0); c.fill();
          barrel(62, 10, '#56633a', -16, '#3e4a28'); c.fillStyle = '#3e4a28'; c.fillRect(-4, -28, 6, 20); wheel(0, 10, '#222');
          break;
        default: { // Railgun
          c.fillStyle = '#2a2366'; rr(c, -20, -16, 40, 16, 4); c.fill(); c.fillStyle = '#4be3ff'; c.fillRect(-16, -10, 8, 3);
          barrel(64, 12, '#dfe6f5', -18, null);
          c.save(); c.translate(0, -18); c.rotate(a); c.fillStyle = cur.kraft >= 2 ? '#ff7ad9' : '#4be3ff'; c.globalAlpha = 0.6 + 0.4 * Math.sin(v.time * 6);
          c.fillRect(4, -7 * wf, 50 * kf, 2); c.fillRect(4, 5 * wf, 50 * kf, 2); c.restore(); c.globalAlpha = 1;
        }
      }
      c.restore();
    }

    // Mündung in Pixel relativ zum Kanonen-Fußpunkt (hängt von Rohrlänge und Gestell ab)
    function muzzle(age, ang, cur) {
      const a = ang * Math.PI / 180, P = MUZ[age], lift = LIFT[standTier(cur)];
      const fork = age === 0 ? 4 * curOf(cur).kraft : 0;
      return { x: P[0] + Math.cos(a) * P[2] * lenF(cur), y: P[1] - lift - fork - Math.sin(a) * P[2] * lenF(cur) };
    }

    // ---------- Geschoss je Zeitalter (Wucht macht es größer und gefährlicher) ----------
    function drawBall(age, wucht, x, y, vx, vy, t, scale) {
      const r = 5.5 * (1 + 0.12 * wucht) * (scale || 1), ang = Math.atan2(-vy, vx || 1e-6);
      c.save(); c.translate(x, y);
      switch (age) {
        case 0: { // grober Stein, dreht sich
          c.rotate(t * 8); c.fillStyle = '#8c8c86'; c.beginPath(); for (let k = 0; k < 7; k++) { const an = k / 7 * TAU, rad = r * (0.8 + 0.3 * hsh(k + wucht)); c.lineTo(Math.cos(an) * rad, Math.sin(an) * rad); } c.closePath(); c.fill();
          c.fillStyle = '#b3b0a6'; c.beginPath(); c.arc(-r * 0.25, -r * 0.3, r * 0.35, 0, TAU); c.fill();
          if (wucht >= 2) { c.fillStyle = '#5a5a55'; for (let k = 0; k < 4; k++) { c.rotate(TAU / 4); c.beginPath(); c.moveTo(r * 0.7, -2); c.lineTo(r * 1.35, 0); c.lineTo(r * 0.7, 2); c.fill(); } }
          break;
        }
        case 1: { // Bronzekugel
          const g = c.createRadialGradient(-r * 0.3, -r * 0.3, 1, 0, 0, r); g.addColorStop(0, '#ffd59a'); g.addColorStop(1, wucht >= 2 ? '#8a4a1a' : '#b8732e');
          c.fillStyle = g; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
          if (wucht >= 1) { c.strokeStyle = '#6b3a12'; c.lineWidth = 1; c.beginPath(); c.arc(0, 0, r * 0.65, 0, TAU); c.stroke(); }
          break;
        }
        case 2: { // Eisenbolzen (Balliste), zeigt in Flugrichtung
          c.rotate(ang); c.fillStyle = '#6b4423'; c.fillRect(-r * 2.2, -1.2, r * 3.2, 2.4);
          c.fillStyle = '#5d5f66'; c.beginPath(); c.moveTo(r * 1.0, -r * 0.55); c.lineTo(r * 2.0 + wucht, 0); c.lineTo(r * 1.0, r * 0.55); c.fill();
          c.fillStyle = '#c9c9c0'; c.beginPath(); c.moveTo(-r * 2.2, 0); c.lineTo(-r * 2.9, -r * 0.6); c.lineTo(-r * 1.8, 0); c.lineTo(-r * 2.9, r * 0.6); c.fill();
          break;
        }
        case 3: { // Granitbrocken mit Rissen
          c.rotate(t * 5); c.fillStyle = '#b8b2a6'; c.beginPath(); c.arc(0, 0, r * 1.1, 0, TAU); c.fill();
          c.fillStyle = '#9a9488'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(Math.cos(k * 1.7) * r * 0.5, Math.sin(k * 1.7) * r * 0.5, r * 0.18, 0, TAU); c.fill(); }
          c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(-r * 0.6, -r * 0.2); c.lineTo(0, r * 0.1); c.lineTo(r * 0.5, -r * 0.4); c.stroke();
          break;
        }
        case 4: { // brennender Felsbrocken
          if (scale !== 0.75) { const fl = 0.7 + 0.3 * Math.sin(t * 30); c.save(); c.rotate(ang + Math.PI); c.fillStyle = `rgba(255,140,40,${0.8 * fl})`; c.beginPath(); c.moveTo(0, -r); c.quadraticCurveTo(r * 3.5, 0, 0, r); c.fill(); c.fillStyle = 'rgba(255,230,120,0.9)'; c.beginPath(); c.moveTo(0, -r * 0.5); c.quadraticCurveTo(r * 2, 0, 0, r * 0.5); c.fill(); c.restore(); }
          c.fillStyle = '#4a4140'; c.beginPath(); c.arc(0, 0, r * 1.05, 0, TAU); c.fill(); c.fillStyle = '#ff8a3d'; c.beginPath(); c.arc(r * 0.2, r * 0.2, r * 0.3, 0, TAU); c.fill();
          break;
        }
        case 5: { // Gusseisen-Kanonenkugel
          const g = c.createRadialGradient(-r * 0.35, -r * 0.35, 1, 0, 0, r); g.addColorStop(0, '#8a8a90'); g.addColorStop(1, '#1f1f22');
          c.fillStyle = g; c.beginPath(); c.arc(0, 0, r * 1.05, 0, TAU); c.fill();
          if (wucht >= 2) { c.strokeStyle = '#3a2a1a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -r); c.quadraticCurveTo(r * 0.6, -r * 1.6, r * 0.2, -r * 2); c.stroke(); c.fillStyle = '#ffb347'; c.beginPath(); c.arc(r * 0.2, -r * 2, 1.6, 0, TAU); c.fill(); }
          break;
        }
        case 6: { // Stahlgranate
          c.rotate(ang); c.fillStyle = '#5a5e66'; rr(c, -r * 1.3, -r * 0.65, r * 2, r * 1.3, 2); c.fill();
          c.fillStyle = '#9aa0a8'; c.beginPath(); c.moveTo(r * 0.7, -r * 0.65); c.quadraticCurveTo(r * 1.9, 0, r * 0.7, r * 0.65); c.fill();
          c.fillStyle = '#c9a46a'; c.fillRect(-r * 1.1, -r * 0.68, 2, r * 1.36);
          break;
        }
        case 7: { // Rakete mit Flossen und Feuerstrahl
          c.rotate(ang);
          if (scale !== 0.75) { const fl = 0.75 + 0.25 * Math.sin(t * 40); c.fillStyle = `rgba(255,170,60,${fl})`; c.beginPath(); c.moveTo(-r * 1.4, -r * 0.4); c.lineTo(-r * (3 + fl), 0); c.lineTo(-r * 1.4, r * 0.4); c.fill(); }
          c.fillStyle = '#56633a'; rr(c, -r * 1.5, -r * 0.5, r * 2.6, r, 3); c.fill();
          c.fillStyle = '#c9cfc0'; c.beginPath(); c.moveTo(r * 1.1, -r * 0.5); c.quadraticCurveTo(r * 2.1, 0, r * 1.1, r * 0.5); c.fill();
          c.fillStyle = '#3e4a28'; c.beginPath(); c.moveTo(-r * 1.5, -r * 0.5); c.lineTo(-r * 1.9, -r * 1.1); c.lineTo(-r * 0.9, -r * 0.5); c.moveTo(-r * 1.5, r * 0.5); c.lineTo(-r * 1.9, r * 1.1); c.lineTo(-r * 0.9, r * 0.5); c.fill();
          break;
        }
        default: { // Plasma-Rakete
          c.rotate(ang);
          const gl = c.createRadialGradient(0, 0, 1, 0, 0, r * 3); gl.addColorStop(0, 'rgba(127,246,255,0.65)'); gl.addColorStop(1, 'rgba(255,122,217,0)');
          c.fillStyle = gl; c.beginPath(); c.arc(0, 0, r * 3, 0, TAU); c.fill();
          if (scale !== 0.75) { const fl = 0.7 + 0.3 * Math.sin(t * 50); c.fillStyle = `rgba(255,122,217,${0.8 * fl})`; c.beginPath(); c.moveTo(-r * 1.2, -r * 0.5); c.lineTo(-r * (3.6 + fl), 0); c.lineTo(-r * 1.2, r * 0.5); c.fill(); c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(-r * 1.2, -r * 0.25); c.lineTo(-r * 2.4, 0); c.lineTo(-r * 1.2, r * 0.25); c.fill(); }
          c.fillStyle = '#e6ecff'; rr(c, -r * 1.3, -r * 0.45, r * 2.2, r * 0.9, 3); c.fill();
          c.fillStyle = '#4be3ff'; c.beginPath(); c.moveTo(r * 0.9, -r * 0.45); c.quadraticCurveTo(r * 2, 0, r * 0.9, r * 0.45); c.fill();
          c.fillStyle = '#ff5ad9'; c.fillRect(-r * 0.6, -r * 0.45, 2, r * 0.9);
        }
      }
      c.restore();
    }

    // ---------- Spezialmunition ----------
    function drawAmmo(id, x, y, vx, vy, t) {
      const ang = Math.atan2(-vy, vx);
      c.save(); c.translate(x, y);
      if (id === 'pfeil') { // Pfeil mit Federn und Metallspitze, zeigt in Flugrichtung
        c.rotate(ang); c.strokeStyle = '#8a5a2b'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(-16, 0); c.lineTo(10, 0); c.stroke();
        c.fillStyle = '#c4ccd9'; c.beginPath(); c.moveTo(16, 0); c.lineTo(8, -4.5); c.lineTo(8, 4.5); c.closePath(); c.fill(); c.strokeStyle = '#6d7078'; c.lineWidth = 1; c.stroke();
        c.fillStyle = '#e2473b'; [-1, 1].forEach(d => { c.beginPath(); c.moveTo(-16, 0); c.lineTo(-10, 0); c.lineTo(-14, d * 6); c.lineTo(-19, d * 6); c.closePath(); c.fill(); });
      } else if (id === 'spreng') { // Bombe mit brennender Lunte
        c.fillStyle = '#1b1a19'; c.beginPath(); c.arc(0, 0, 7.5, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.35)'; c.beginPath(); c.arc(-2.5, -2.5, 2.2, 0, TAU); c.fill();
        c.fillStyle = '#4a4540'; c.fillRect(-2.5, -10, 5, 3.5);
        c.strokeStyle = '#c9a46a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -10); c.quadraticCurveTo(4, -14, 3, -17); c.stroke();
        const fl = 0.6 + 0.4 * Math.sin(t * 40); c.fillStyle = `rgba(255,180,60,${fl})`; c.beginPath(); c.arc(3, -17.5, 3.2, 0, TAU); c.fill(); c.fillStyle = '#fff3b0'; c.beginPath(); c.arc(3, -17.5, 1.3, 0, TAU); c.fill();
      } else if (id === 'bohrer') { // Bohrkugel: Spitze mit Spiralrillen, dreht sich
        c.rotate(ang); const g = c.createLinearGradient(0, -7, 0, 7); g.addColorStop(0, '#e8eef5'); g.addColorStop(1, '#5d6a78'); c.fillStyle = g;
        c.beginPath(); c.moveTo(18, 0); c.lineTo(-6, -7); c.lineTo(-10, 0); c.lineTo(-6, 7); c.closePath(); c.fill();
        c.strokeStyle = 'rgba(30,40,50,0.6)'; c.lineWidth = 1.2; for (let k = 0; k < 4; k++) { const o = ((t * 30 + k * 6) % 24) - 8; c.beginPath(); c.moveTo(o, -6 + Math.max(0, o) * 0.3); c.lineTo(o + 4, 6 - Math.max(0, o) * 0.3); c.stroke(); }
      } else if (id === 'huepf') { // Hüpfkugel: roter Gummiball mit Streifen
        c.rotate(t * 8); c.fillStyle = '#e2473b'; c.beginPath(); c.arc(0, 0, 7.5, 0, TAU); c.fill();
        c.strokeStyle = '#ffd23f'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 7.5, -0.6, 0.6); c.stroke(); c.beginPath(); c.arc(0, 0, 7.5, Math.PI - 0.6, Math.PI + 0.6); c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.45)'; c.beginPath(); c.arc(-2.5, -2.5, 2, 0, TAU); c.fill();
      } else if (id === 'gold') { // Goldkugel mit Funkeln
        const g = c.createRadialGradient(-2, -2, 1, 0, 0, 8); g.addColorStop(0, '#fff6c0'); g.addColorStop(0.5, '#ffd23f'); g.addColorStop(1, '#b8792f'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 7.5, 0, TAU); c.fill();
        const tw = Math.sin(t * 12); if (tw > 0) { c.fillStyle = `rgba(255,255,255,${tw})`; c.fillRect(-10, -0.6, 20, 1.2); c.fillRect(-0.6, -10, 1.2, 20); }
      }
      c.restore();
    }
    // Schrein-Vorschau für den Shop: kleiner Steinaltar mit Symbol-Flamme in der Farbe des Effekts
    function drawShrine(cv, k, age) {
      const keep = c; c = cv.getContext('2d'); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 88, 88);
      const col = { dmg: '#ff6a2a', range: '#7ff6ff', gold: '#ffd23f', work: '#5ee07a', crit: '#b58cff' }[k] || '#fff';
      const g = c.createRadialGradient(44, 34, 2, 44, 34, 40); g.addColorStop(0, col + '88'); g.addColorStop(1, col + '00'); c.fillStyle = g; c.fillRect(0, 0, 88, 88);
      c.fillStyle = '#6d6a62'; rr(c, 18, 66, 52, 12, 3); c.fill(); c.fillStyle = '#8d8a80'; rr(c, 24, 46, 40, 22, 3); c.fill();
      c.fillStyle = '#a7a39a'; rr(c, 14, 40, 60, 8, 3); c.fill();
      c.fillStyle = '#5a3a1f'; [22, 62].forEach(x => c.fillRect(x - 3, 14, 6, 28)); c.fillStyle = '#c0392b'; rr(c, 12, 10, 64, 7, 3); c.fill(); c.fillRect(16, 20, 56, 4);
      c.fillStyle = col; c.beginPath(); c.moveTo(44, 24); c.quadraticCurveTo(54, 34, 44, 42); c.quadraticCurveTo(34, 34, 44, 24); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(44, 36, 3, 0, TAU); c.fill();
      c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(30, 52, 28, 2); c.fillRect(30, 58, 28, 2);
      c = keep;
    }

    // ---------- Flieger ----------
    function drawFlyer(v, f) {
      const x = v.x0 + f.x * v.scale, y = v.groundY - f.y * v.scale;
      if (x < -40 || x > W + 40 || y < -40) return;
      c.save(); c.translate(x, y);
      if (f.big) { // der eine, starke Vogel: leuchtender Schein, damit man ihn gut sieht
        if (!f.hit) { const pr = 0.75 + 0.25 * Math.sin(v.time * 5 + f.ph), g = c.createRadialGradient(0, 0, 4, 0, 0, 34); g.addColorStop(0, `rgba(127,246,255,${0.45 * pr})`); g.addColorStop(1, 'rgba(127,246,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 34, 0, TAU); c.fill();
          c.strokeStyle = `rgba(255,255,255,${0.5 * pr})`; c.lineWidth = 1.5; c.setLineDash([3, 4]); c.beginPath(); c.arc(0, 0, 24 + 3 * pr, 0, TAU); c.stroke(); c.setLineDash([]); }
        c.scale(1.7, 1.7);
      }
      if (f.vx < 0) c.scale(-1, 1);
      if (f.hit) c.globalAlpha = 0.4;
      const flap = Math.sin(v.time * 10 + f.ph) * 6;
      const type = f.type;
      if (type <= 4) { // Vögel / Flugsaurier
        const col = ['#7a4a2a', '#e8e8e8', '#222', '#6b4a2a', '#8a6a4a'][type];
        const sz = type === 0 ? 1.5 : 1;
        c.strokeStyle = col; c.lineWidth = 3 * sz; c.lineCap = 'round';
        c.beginPath(); c.moveTo(-12 * sz, -flap * sz); c.quadraticCurveTo(-5 * sz, -2, 0, 0); c.quadraticCurveTo(5 * sz, -2, 12 * sz, -flap * sz); c.stroke();
        c.fillStyle = col; c.beginPath(); c.ellipse(0, 1, 5 * sz, 3 * sz, 0, 0, TAU); c.fill();
        if (type === 1) { c.strokeStyle = '#e8e8e8'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(4, 0); c.lineTo(12, -4); c.stroke(); }
      } else if (type === 5) { // Heißluftballon
        c.fillStyle = '#d9473b'; c.beginPath(); c.arc(0, -10, 13, 0, TAU); c.fill(); c.fillStyle = '#f2c14e'; c.fillRect(-2, -23, 4, 26);
        c.strokeStyle = '#5a3d1f'; c.lineWidth = 1; c.beginPath(); c.moveTo(-8, 0); c.lineTo(-4, 10); c.moveTo(8, 0); c.lineTo(4, 10); c.stroke();
        c.fillStyle = '#8a5a2b'; c.fillRect(-5, 9, 10, 6);
      } else if (type === 6) { // Zeppelin
        c.fillStyle = '#bfb8a8'; c.beginPath(); c.ellipse(0, 0, 26, 9, 0, 0, TAU); c.fill(); c.fillStyle = '#6b655c'; c.fillRect(-6, 8, 12, 4);
        c.beginPath(); c.moveTo(-24, 0); c.lineTo(-32, -8); c.lineTo(-32, 8); c.fill();
      } else if (type === 7) { // Düsenjet
        c.fillStyle = '#9aa4ad'; c.beginPath(); c.moveTo(18, 0); c.lineTo(-14, -4); c.lineTo(-14, 4); c.fill();
        c.beginPath(); c.moveTo(2, 0); c.lineTo(-8, -12); c.lineTo(-10, 0); c.fill(); c.beginPath(); c.moveTo(-12, 0); c.lineTo(-18, -8); c.lineTo(-16, 0); c.fill();
      } else { // Drohne
        c.fillStyle = '#3b3190'; rr(c, -8, -3, 16, 6, 2); c.fill(); c.strokeStyle = '#7ff6ff'; c.lineWidth = 2;
        [-10, 10].forEach(dx => { c.beginPath(); c.moveTo(dx - 6 * Math.cos(v.time * 30), -6); c.lineTo(dx + 6 * Math.cos(v.time * 30), -6); c.stroke(); });
      }
      c.restore();
    }

    function star(x, y, r, rot, col) {
      c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col; c.beginPath();
      for (let i = 0; i < 10; i++) { const rad = i % 2 ? r * 0.45 : r, a = i * Math.PI / 5 - Math.PI / 2; c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
      c.closePath(); c.fill(); c.strokeStyle = 'rgba(120,70,0,0.6)'; c.lineWidth = 1; c.stroke(); c.restore();
    }

    // ---------- Timing-Leiste ----------
    function drawBar(v) {
      const b = v.bar; if (!b) return;
      const bw = Math.min(W - 40, 420), bh = 22, x = (W - bw) / 2, y = 16;
      c.fillStyle = 'rgba(0,0,0,0.45)'; rr(c, x - 6, y - 6, bw + 12, bh + 12, 12); c.fill();
      // Zonen: rot | gelb | grün | gelb | rot
      const z = b.zone / 2, yz = z + 0.15;
      const seg = [[0, 0.5 - yz, '#e2473b'], [0.5 - yz, 0.5 - z, '#f2c14e'], [0.5 - z, 0.5 + z, '#4ccf6a'], [0.5 + z, 0.5 + yz, '#f2c14e'], [0.5 + yz, 1, '#e2473b']];
      c.save(); rr(c, x, y, bw, bh, 8); c.clip();
      seg.forEach(([a, e, col]) => { c.fillStyle = col; c.fillRect(x + a * bw, y, (e - a) * bw + 0.5, bh); });
      c.fillStyle = 'rgba(255,255,255,0.55)'; c.fillRect(x + (0.5 - z * 0.3) * bw, y, z * 0.6 * bw, bh); // Perfekt-Mitte
      c.restore();
      const mx = x + b.pos * bw;
      c.fillStyle = '#fff'; c.strokeStyle = '#222'; c.lineWidth = 2;
      c.beginPath(); c.moveTo(mx, y + bh + 2); c.lineTo(mx - 7, y + bh + 12); c.lineTo(mx + 7, y + bh + 12); c.closePath(); c.fill(); c.stroke();
      rr(c, mx - 2.5, y - 4, 5, bh + 8, 2); c.fill(); c.stroke();
      c.font = '700 13px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'top';
      c.fillStyle = '#fff'; c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 3;
      const t = 'Jetzt tippen – im Grünen auslösen!';
      c.strokeText(t, W / 2, y + bh + 16); c.fillText(t, W / 2, y + bh + 16);
    }

    // ---------- Anbauteile: Kanone ändert sich mit jedem Upgrade im Zeitalter ----------
    function drawAddons(v, x, gy, age, ang, cur) {
      const a = ang * Math.PI / 180, B = MUZ[age], len = Math.max(26, B[2] * lenF(cur));
      const px = x, py = gy + B[1] - LIFT[standTier(cur)] - (age === 0 ? 4 * cur.kraft : 0), dx = Math.cos(a), dy = -Math.sin(a), nx = -dy, ny = dx; // n = senkrecht (nach oben)
      const at = f => [px + dx * len * f, py + dy * len * f];
      // Zielhilfe: Kimme, Zielfernrohr, Laserpunkt
      if (cur.ziel >= 1) { const [qx, qy] = at(0.85); c.strokeStyle = '#222'; c.lineWidth = 2; c.beginPath(); c.moveTo(qx, qy); c.lineTo(qx - nx * 9, qy - ny * 9); c.stroke(); }
      if (cur.ziel >= 2) { const [q1x, q1y] = at(0.35), [q2x, q2y] = at(0.65); c.strokeStyle = '#1d1d22'; c.lineWidth = 5; c.beginPath(); c.moveTo(q1x - nx * 9, q1y - ny * 9); c.lineTo(q2x - nx * 9, q2y - ny * 9); c.stroke(); c.fillStyle = '#7ff6ff'; c.beginPath(); c.arc(q2x - nx * 9, q2y - ny * 9, 2, 0, TAU); c.fill(); }
      if (cur.ziel >= 3) { const [qx, qy] = at(1); c.strokeStyle = 'rgba(255,40,40,0.7)'; c.lineWidth = 1.5; c.setLineDash([2, 3]); c.beginPath(); c.moveTo(qx, qy); c.lineTo(qx + dx * 40, qy + dy * 40); c.stroke(); c.setLineDash([]); }
      // Glück: Wimpel, Sternanhänger, Kleeblatt
      if (cur.gluck >= 1) { c.strokeStyle = '#3b2b1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x + 16, gy); c.lineTo(x + 16, gy - 30); c.stroke(); c.fillStyle = '#ff5ab4'; c.beginPath(); c.moveTo(x + 16, gy - 30); c.lineTo(x + 28, gy - 26 + Math.sin(v.time * 5) * 1.5); c.lineTo(x + 16, gy - 22); c.fill(); }
      if (cur.gluck >= 2) { const [qx, qy] = at(0.5); c.strokeStyle = '#c9a46a'; c.lineWidth = 1; c.beginPath(); c.moveTo(qx, qy); c.lineTo(qx, qy + 9); c.stroke(); star(qx, qy + 12, 4, Math.sin(v.time * 3) * 0.4, '#ffd23f'); }
      if (cur.gluck >= 3) { c.fillStyle = '#3fae4a'; [[-3, 0], [3, 0], [0, -3], [0, 3]].forEach(([ox, oy]) => { c.beginPath(); c.arc(x + 22 + ox, gy - 6 + oy, 2.6, 0, TAU); c.fill(); }); }
    }

    // ---------- Ereignisse ----------
    function drawEvent(v) {
      const e = v.event; if (!e) return;
      const X = x => v.x0 + x * v.scale, Y = y => v.groundY - y * v.scale;
      if (e.type === 'wind') {
        const dir = Math.sign(e.wind);
        c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 1.5;
        for (let i = 0; i < 14; i++) {
          const x = ((i * 137 + v.time * 160 * dir) % (W + 80) + W + 80) % (W + 80) - 40, y = 40 + (i * 53) % (v.groundY - 80);
          c.beginPath(); c.moveTo(x, y); c.lineTo(x - 22 * dir, y); c.stroke();
        }
      } else if (e.type === 'storm') {
        e.clouds.forEach(cl => {
          const x = X(cl.x), y = Y(cl.y), r = Math.max(18, cl.r * v.scale);
          c.fillStyle = 'rgba(70,72,90,0.75)';
          c.beginPath(); c.arc(x, y, r, 0, TAU); c.arc(x + r * 0.8, y + r * 0.2, r * 0.75, 0, TAU); c.arc(x - r * 0.8, y + r * 0.25, r * 0.7, 0, TAU); c.fill();
          c.strokeStyle = '#ffe14d'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + r * 0.6); c.lineTo(x - 4, y + r * 1.1); c.lineTo(x + 3, y + r * 1.1); c.lineTo(x - 2, y + r * 1.6); c.stroke();
        });
      } else if (e.type === 'bonusGround' && !e.got) {
        const x = X(e.at), w = Math.max(14, e.w * 2 * v.scale), gy = v.groundY;
        c.fillStyle = 'rgba(255,210,63,0.35)'; c.fillRect(x - w / 2, gy - 3, w, 6);
        c.fillStyle = '#8a5a2b'; rr(c, x - 9, gy - 14, 18, 13, 3); c.fill(); c.fillStyle = '#ffd23f'; c.fillRect(x - 9, gy - 10, 18, 2.5); c.fillRect(x - 2, gy - 12, 4, 5);
        if (Math.sin(v.time * 6) > 0) star(x + 10, gy - 18, 3, 0, '#fff6b0');
      } else if (e.type === 'mole') { // Maulwurfshügel; beim Stoß springt der Maulwurf heraus
        const x = X(e.at), gy = v.groundY, w = Math.max(18, e.w * 2 * v.scale), pop = e.pop || 0, jump = Math.sin(pop * Math.PI) * 26;
        c.fillStyle = 'rgba(126,227,255,0.25)'; c.fillRect(x - w / 2, gy - 2, w, 4);
        c.fillStyle = '#6b4423'; c.beginPath(); c.ellipse(x, gy, Math.min(w / 2, 20), 9, 0, Math.PI, 0); c.fill();
        c.fillStyle = '#8a5a2b'; [[-6, -5], [5, -6], [0, -8]].forEach(([dx, dy]) => { c.beginPath(); c.arc(x + dx, gy + dy, 2, 0, TAU); c.fill(); });
        const peek = pop > 0 ? jump + 6 : 3 + Math.max(0, Math.sin(v.time * 1.7)) * 5, my = gy - 6 - peek;
        c.save(); c.beginPath(); c.rect(x - 30, my - 30, 60, gy - 6 - my + 30 + (pop > 0 ? 10 : 0)); c.clip();
        c.fillStyle = '#3b3436'; c.beginPath(); c.ellipse(x, my + 4, 8, 9, 0, 0, TAU); c.fill();
        c.fillStyle = '#ff9ab0'; c.beginPath(); c.arc(x + 7, my + 1, 2.4, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x + 3, my - 2, 1.2, 0, TAU); c.fill(); c.fillStyle = '#111'; c.beginPath(); c.arc(x + 3.2, my - 2, 0.7, 0, TAU); c.fill();
        c.fillStyle = '#f2c4b0'; [-1, 1].forEach(sd => { c.beginPath(); c.ellipse(x + sd * 8, my + 6 - (pop > 0 ? 6 : 0), 3.5, 2, sd * (pop > 0 ? -0.8 : 0.3), 0, TAU); c.fill(); });
        if (pop > 0) { c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(x, my - 12, 3, 0, TAU); c.fill(); }
        c.restore();
        if (pop > 0.5) { c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 2; for (let k = -1; k <= 1; k++) { c.beginPath(); c.moveTo(x + k * 10, gy - 30 - jump); c.lineTo(x + k * 14, gy - 40 - jump); c.stroke(); } }
      } else if (e.type === 'plant') { // Schnapppflanze: Stiel und Fangmaul, schnappt beim Fang zu
        const x = X(e.at), gy = v.groundY, hp = Math.max(30, e.h * v.scale), r = Math.max(12, e.r * v.scale), sway = Math.sin(v.time * 1.5) * 4;
        const hx = x + sway, hy = gy - hp, snap = e.snap || 0, open = snap > 0 ? Math.max(0, 1 - snap * 3) * 0.6 : 0.55 + 0.15 * Math.sin(v.time * 3);
        c.strokeStyle = '#3f7a2a'; c.lineWidth = Math.max(3, r * 0.25); c.beginPath(); c.moveTo(x, gy); c.quadraticCurveTo(x - 10, gy - hp * 0.5, hx, hy + r * 0.4); c.stroke();
        c.fillStyle = '#4f9a3a'; [[-1, 0.35], [1, 0.6]].forEach(([sd, f]) => { c.beginPath(); c.ellipse(x + sd * 9 - 4 * f, gy - hp * f * 0.6, 10, 4, sd * 0.5, 0, TAU); c.fill(); });
        c.save(); c.translate(hx, hy);
        [-1, 1].forEach(sd => { c.save(); c.rotate(sd * open); c.fillStyle = '#4caf50'; c.beginPath(); c.ellipse(r * 0.6, 0, r * 0.75, r * 0.42, 0, sd < 0 ? Math.PI : 0, sd < 0 ? TAU : Math.PI); c.fill();
          c.fillStyle = '#e2473b'; c.beginPath(); c.ellipse(r * 0.6, 0, r * 0.6, r * 0.28, 0, sd < 0 ? Math.PI : 0, sd < 0 ? TAU : Math.PI); c.fill();
          c.fillStyle = '#fff'; for (let k = 0; k < 5; k++) { const tx = r * (0.1 + k * 0.24); c.beginPath(); c.moveTo(tx - 2, 0); c.lineTo(tx, sd * r * 0.38); c.lineTo(tx + 2, 0); c.fill(); } c.restore(); });
        if (e.ate) { c.fillStyle = '#555'; c.beginPath(); c.arc(r * 0.6, 0, 3, 0, TAU); c.fill(); }
        c.restore();
      } else if (e.type === 'bonusAir' && !e.got) {
        const x = X(e.x), y = Y(e.y + Math.sin(v.time * 1.5) * e.r * 0.5), r = Math.max(9, e.r * v.scale);
        c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y + r); c.lineTo(x, y + r + 16); c.stroke();
        c.fillStyle = '#ffd23f'; c.beginPath(); c.ellipse(x, y, r * 0.85, r, 0, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(x - r * 0.3, y - r * 0.35, r * 0.2, 0, TAU); c.fill();
        c.font = `700 ${Math.round(r)}px Fredoka, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#8a5a00'; c.fillText('$', x, y + 1);
      }
    }
    // Wetter über die ganze Szene (Regen, Nebel, Fallwind)
    function drawWeather(v) {
      const e = v.event; if (!e) return;
      if (e.type === 'rain') {
        c.strokeStyle = 'rgba(170,200,255,0.55)'; c.lineWidth = 1.2;
        for (let i = 0; i < 70; i++) { const x = ((i * 71.3 + v.time * 60) % (W + 40)) - 20, y = ((i * 37.7 + v.time * 420) % (v.groundY + 20)) - 20; c.beginPath(); c.moveTo(x, y); c.lineTo(x - 4, y + 12); c.stroke(); }
        c.fillStyle = 'rgba(40,60,90,0.12)'; c.fillRect(0, 0, W, v.groundY);
      } else if (e.type === 'fog') {
        for (let i = 0; i < 6; i++) { const x = ((i * 0.23 + v.time * 0.01 * (1 + i % 3)) % 1.3 - 0.15) * W, y = v.groundY * (0.25 + 0.12 * (i % 5)); const g = c.createRadialGradient(x, y, 10, x, y, W * 0.35); g.addColorStop(0, 'rgba(235,235,240,0.55)'); g.addColorStop(1, 'rgba(235,235,240,0)'); c.fillStyle = g; c.fillRect(0, 0, W, v.groundY); }
      } else if (e.type === 'heavy') {
        c.strokeStyle = 'rgba(255,255,255,0.3)'; c.lineWidth = 1.5;
        for (let i = 0; i < 16; i++) { const x = (i * 97) % W, y = ((i * 53 + v.time * 180) % (v.groundY + 40)) - 30; c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 18); c.moveTo(x - 4, y + 13); c.lineTo(x, y + 18); c.lineTo(x + 4, y + 13); c.stroke(); }
      }
    }
    // Ereignis-Anzeige: Symbol, Name, Wirkung und verbleibende Schüsse – solange es aktiv ist
    function drawEventBadge(v) {
      const e = v.event; if (!e || v.ageFx || v.winFx) return;
      const y = v.bar ? 72 : 8, col = e.good === true ? '#5ee07a' : e.good === false ? '#ff6b5b' : '#7fc8ff';
      c.textAlign = 'left'; c.textBaseline = 'middle';
      c.font = '700 14px Fredoka, system-ui, sans-serif'; const w1 = c.measureText(e.icon + ' ' + e.name).width;
      c.font = '500 11px Fredoka, system-ui, sans-serif'; const w2 = c.measureText(e.desc || '').width;
      const w = Math.min(W - 60, Math.max(w1, w2 + 0, 70 + e.total * 9) + 22), h = 48;
      const pop = view_intro(v) ? 1 + 0.08 * Math.sin(v.time * 14) : 1;
      c.save(); c.translate(8, y); c.scale(pop, pop);
      c.fillStyle = 'rgba(16,12,24,0.82)'; rr(c, 0, 0, w, h, 10); c.fill();
      c.fillStyle = col; rr(c, 0, 0, 5, h, 3); c.fill();
      c.strokeStyle = col; c.globalAlpha = 0.5 + 0.3 * Math.sin(v.time * 4); c.lineWidth = 1.5; rr(c, 0.5, 0.5, w - 1, h - 1, 10); c.stroke(); c.globalAlpha = 1;
      c.font = '700 14px Fredoka, system-ui, sans-serif'; c.fillStyle = '#fff'; c.fillText(e.icon + ' ' + e.name, 13, 12);
      c.font = '500 11px Fredoka, system-ui, sans-serif'; c.fillStyle = '#e8dcc8'; c.fillText(e.desc || '', 13, 27);
      for (let k = 0; k < e.total; k++) { c.fillStyle = k < e.left ? col : 'rgba(255,255,255,0.2)'; rr(c, 13 + k * 9, 36, 7, 6, 2); c.fill(); }
      c.font = '500 10px Fredoka, system-ui, sans-serif'; c.fillStyle = '#cbb'; c.fillText('noch ' + e.left + (e.left === 1 ? ' Schuss' : ' Schüsse'), 18 + e.total * 9, 39);
      c.restore();
    }
    const view_intro = v => v.intro && v.intro.t < 2.4;
    // Großer Hinweis, wenn ein Ereignis beginnt
    function drawEventIntro(v) {
      const it = v.intro; if (!it || v.ageFx || v.chal) return;
      const e = it.e, t = it.t, a = t < 0.25 ? t / 0.25 : t > 1.9 ? Math.max(0, (2.4 - t) / 0.5) : 1;
      const sc = t < 0.25 ? 0.6 + 0.4 * (t / 0.25) + Math.sin(t / 0.25 * Math.PI) * 0.1 : 1;
      const col = e.good === true ? '#5ee07a' : e.good === false ? '#ff6b5b' : '#7fc8ff';
      c.save(); c.globalAlpha = a; c.translate(W / 2, v.groundY * 0.42); c.scale(sc, sc);
      c.font = '700 22px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const w = Math.min(W - 24, Math.max(c.measureText(e.icon + ' ' + e.name).width + 40, 200));
      c.fillStyle = 'rgba(16,12,24,0.85)'; rr(c, -w / 2, -34, w, 68, 16); c.fill(); c.strokeStyle = col; c.lineWidth = 2; rr(c, -w / 2, -34, w, 68, 16); c.stroke();
      c.font = '600 11px Fredoka, system-ui, sans-serif'; c.fillStyle = col; c.fillText('EREIGNIS · ' + e.total + ' SCHÜSSE', 0, -18);
      c.font = '700 22px Fredoka, system-ui, sans-serif'; c.fillStyle = '#fff'; c.fillText(e.icon + ' ' + e.name, 0, 2);
      c.font = '500 12px Fredoka, system-ui, sans-serif'; c.fillStyle = '#e8dcc8'; c.fillText(e.desc || '', 0, 22);
      c.restore();
    }
    // Kurzer Effekt beim Auslösen im grünen Bereich: Ringe, Strahlen, aufblitzende Leiste
    function drawGoodFx(v) {
      const f = v.goodFx; if (!f) return;
      const t = f.t, col = f.crit ? '255,210,63' : '94,224,122';
      c.save(); c.translate(f.x, f.y);
      for (let i = 0; i < (f.crit ? 3 : 2); i++) { const rt = t - i * 0.1; if (rt <= 0) continue; const a = Math.max(0, 1 - rt / 0.55); c.strokeStyle = `rgba(${col},${a})`; c.lineWidth = 5 * a + 1; c.beginPath(); c.arc(0, 0, 8 + rt * 190, 0, TAU); c.stroke(); }
      const ra = Math.max(0, 1 - t / 0.45);
      if (ra > 0) { c.rotate(t * 2); for (let k = 0; k < 12; k++) { c.rotate(TAU / 12); c.fillStyle = `rgba(${col},${0.55 * ra})`; c.beginPath(); c.moveTo(10, -2); c.lineTo(30 + t * 160, 0); c.lineTo(10, 2); c.fill(); } }
      c.restore();
      if (t < 0.5) { // Leiste blitzt oben auf
        const bw = Math.min(W - 40, 420), x = (W - bw) / 2, a = 1 - t / 0.5, sc = 1 + 0.15 * Math.sin(Math.min(1, t / 0.2) * Math.PI);
        c.save(); c.globalAlpha = a; c.translate(W / 2, 27); c.scale(sc, sc);
        c.fillStyle = `rgba(${col},0.9)`; rr(c, -bw / 2, -11, bw, 22, 8); c.fill();
        c.font = '700 15px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#123'; c.fillText(f.crit ? '★ PERFEKT! ★' : 'IM GRÜNEN!', 0, 1);
        c.restore();
        c.fillStyle = `rgba(${col},${0.18 * a})`; c.fillRect(0, 0, W, H);
      }
    }
    // Zeitalter-Aufstieg: Lichtstrahlen, alte Kanone schrumpft im Glühen, neue springt heraus, großer Titel
    function drawAgeFx(v) {
      const f = v.ageFx; if (!f) return;
      const t = f.t, cx = v.x0, cy = v.groundY - 30;
      c.fillStyle = `rgba(10,6,20,${Math.min(0.45, t * 0.6) * (t > 4.4 ? Math.max(0, (5 - t) / 0.6) : 1)})`; c.fillRect(0, 0, W, H);
      if (t > 0.3) { // Strahlen
        c.save(); c.translate(cx, cy); c.rotate(t * 0.4);
        const R = Math.max(W, H) * 1.2, a = Math.min(1, (t - 0.3) * 1.5) * (t > 4.4 ? Math.max(0, (5 - t) / 0.6) : 1);
        for (let k = 0; k < 14; k++) { c.rotate(TAU / 14); c.fillStyle = `rgba(255,220,120,${0.16 * a})`; c.beginPath(); c.moveTo(0, 0); c.lineTo(R, -R * 0.09); c.lineTo(R, R * 0.09); c.closePath(); c.fill(); }
        const g = c.createRadialGradient(0, 0, 4, 0, 0, 90); g.addColorStop(0, `rgba(255,250,210,${0.9 * a})`); g.addColorStop(1, 'rgba(255,220,120,0)'); c.fillStyle = g; c.beginPath(); c.arc(0, 0, 90, 0, TAU); c.fill();
        c.restore();
      }
      // Kanone: vor dem Knall schrumpft die alte (Kanone wird im Hauptbild normal mit to-Alter gezeichnet; hier Overlay)
      if (t > 1.0 && t < 1.5) { c.fillStyle = `rgba(255,255,255,${1 - (t - 1.0) / 0.5})`; c.fillRect(0, 0, W, H); }
      if (t > 1.3) { // Titel
        const k = Math.min(1, (t - 1.3) / 0.35), pop = k < 1 ? 0.3 + 0.7 * k + Math.sin(k * Math.PI) * 0.25 : 1 + Math.sin(t * 3) * 0.02;
        const a = t > 4.4 ? Math.max(0, (5 - t) / 0.6) : 1;
        c.save(); c.globalAlpha = a; c.translate(W / 2, v.groundY * 0.36); c.scale(pop, pop); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '700 14px Fredoka, system-ui, sans-serif'; c.fillStyle = '#ffd23f'; c.fillText('NEUES ZEITALTER', 0, -34);
        const fs = Math.min(46, W / 9); c.font = `700 ${fs}px Fredoka, system-ui, sans-serif`;
        c.lineWidth = 7; c.strokeStyle = 'rgba(60,20,0,0.75)'; c.strokeText(f.name, 0, 4); c.fillStyle = '#fff'; c.fillText(f.name, 0, 4);
        c.font = '600 15px Fredoka, system-ui, sans-serif'; c.lineWidth = 4; c.strokeText('Neue Waffe: ' + f.cannon, 0, 40); c.fillStyle = '#ffe9a0'; c.fillText('Neue Waffe: ' + f.cannon, 0, 40);
        c.restore();
      }
    }

    // ---------- Zeitsprung: Rakete ----------
    const JT = { land: 1.2, door: 1.5, walk: 2.6, climb: 3.2, count: 4.3, fly: 6.9 };
    // Position und Größe der Rakete auf dem Bildschirm (für Rauch in game.js)
    function rocketPos(v, r) {
      const gy = v.groundY, t = r.t;
      if (t < JT.land) { const f = 1 - t / JT.land; return { x: r.rx, y: gy - 90 * f * f * 3, s: 1, a: 0 }; }
      if (t < JT.count) return { x: r.rx, y: gy, s: 1, a: 0, shake: t > JT.climb ? (t - JT.climb) * 1.5 : 0 };
      const p = Math.min(1, (t - JT.count) / (JT.fly - JT.count)), e = p * p * (3 - 2 * p);
      const tx = W * 0.5, ty = Math.max(40, gy * 0.16);
      return { x: r.rx + (tx - r.rx) * Math.pow(p, 1.6), y: gy - (gy - ty) * e, s: Math.max(0.035, 1 - 0.965 * Math.pow(p, 0.9)), a: 0.5 * Math.pow(p, 1.4) };
    }
    function drawRocket(v) {
      const r = v.rocket; if (!r) return;
      const p = rocketPos(v, r), t = r.t, gy = v.groundY;
      if (t > JT.fly) { // nur noch ein funkelnder Punkt am Himmel
        const k = Math.min(1, (t - JT.fly) / 0.5), tw = 1 - k;
        c.fillStyle = `rgba(255,255,255,${tw})`; c.beginPath(); c.arc(p.x, p.y, 2.2, 0, TAU); c.fill();
        c.fillRect(p.x - 12 * tw, p.y - 0.7, 24 * tw, 1.4); c.fillRect(p.x - 0.7, p.y - 12 * tw, 1.4, 24 * tw);
        return;
      }
      c.save(); c.translate(p.x + (p.shake ? Math.sin(t * 80) * p.shake : 0), p.y); c.rotate(p.a); c.scale(p.s, p.s);
      const flying = t < JT.land || t > JT.count;
      if (flying) { // Flamme
        const fl = 0.8 + 0.2 * Math.sin(t * 50), L = (t < JT.land ? 26 : 40) * fl;
        const g = c.createLinearGradient(0, 0, 0, L); g.addColorStop(0, '#fff3b0'); g.addColorStop(0.4, '#ffb347'); g.addColorStop(1, 'rgba(255,90,40,0)');
        c.fillStyle = g; c.beginPath(); c.moveTo(-8, -2); c.quadraticCurveTo(0, L * 1.3, 8, -2); c.fill();
      }
      if (t > JT.door && t < JT.climb + 0.2) { // Leiter
        c.strokeStyle = '#8d939b'; c.lineWidth = 2; c.beginPath(); c.moveTo(-18, 0); c.lineTo(-11, -56); c.moveTo(-12, 0); c.lineTo(-5, -56); for (let k = 1; k < 7; k++) { const yy = -k * 8; c.moveTo(-18 + k * 1, yy); c.lineTo(-12 + k * 1, yy); } c.stroke();
      }
      // Flossen
      c.fillStyle = '#d9473b'; [-1, 1].forEach(d => { c.beginPath(); c.moveTo(d * 9, -22); c.lineTo(d * 20, -2); c.lineTo(d * 20, 4); c.lineTo(d * 9, -4); c.closePath(); c.fill(); });
      // Rumpf
      const bg = c.createLinearGradient(-11, 0, 11, 0); bg.addColorStop(0, '#c9ced6'); bg.addColorStop(0.45, '#ffffff'); bg.addColorStop(1, '#9aa1ab');
      c.fillStyle = bg; c.beginPath(); c.moveTo(-10, -2); c.lineTo(-10, -60); c.quadraticCurveTo(-10, -84, 0, -98); c.quadraticCurveTo(10, -84, 10, -60); c.lineTo(10, -2); c.closePath(); c.fill();
      c.fillStyle = '#d9473b'; c.beginPath(); c.moveTo(-7.5, -76); c.quadraticCurveTo(0, -80, 7.5, -76); c.quadraticCurveTo(6, -88, 0, -98); c.quadraticCurveTo(-6, -88, -7.5, -76); c.fill();
      c.fillStyle = '#5d6a78'; c.fillRect(-10, -8, 20, 4); c.fillStyle = '#d9473b'; c.fillRect(-10, -30, 20, 3);
      c.fillStyle = '#3b3190'; c.fillRect(-1, -28, 2, 20);
      // Fenster mit Schütze
      c.fillStyle = '#8d939b'; c.beginPath(); c.arc(0, -58, 7.5, 0, TAU); c.fill();
      c.fillStyle = '#9fe0ff'; c.beginPath(); c.arc(0, -58, 5.5, 0, TAU); c.fill();
      if (t > JT.climb) { c.fillStyle = '#f0c79a'; c.beginPath(); c.arc(0.5, -57, 3.4, 0, TAU); c.fill(); c.fillStyle = '#222'; c.beginPath(); c.arc(1.8, -57.6, 0.7, 0, TAU); c.fill(); }
      c.fillStyle = 'rgba(255,255,255,0.6)'; c.beginPath(); c.arc(-2, -60.5, 1.6, 0, TAU); c.fill();
      // Tür (offen beim Einsteigen)
      if (t > JT.door && t < JT.climb + 0.1) { c.fillStyle = '#2a2e33'; rr(c, -6, -48, 12, 16, 3); c.fill(); c.fillStyle = '#c9ced6'; rr(c, -15, -48, 9, 16, 2); c.fill(); }
      else { c.strokeStyle = 'rgba(0,0,0,0.25)'; c.lineWidth = 1; rr(c, -6, -48, 12, 16, 3); c.stroke(); }
      c.restore();
      if (t > JT.climb && t < JT.count) { const k = (t - JT.climb) / (JT.count - JT.climb); c.fillStyle = `rgba(255,255,255,${0.25 * k})`; for (let i = 0; i < 4; i++) { c.beginPath(); c.arc(r.rx + (i - 1.5) * 14, gy - 4 - Math.sin(t * 8 + i) * 2, 6 + k * 6, 0, TAU); c.fill(); } }
    }
    // Zeitriss: Risse im Himmel, ein Strudel mit Uhr öffnet sich, Splitter fliegen – „Zeitsprung möglich!“
    const CRACKS = Array.from({ length: 9 }, (_, i) => { const pts = [[0, 0]]; let a = i / 9 * TAU + hsh(i) * 0.5, x = 0, y = 0; for (let k = 0; k < 7; k++) { a += (hsh(i * 13 + k) - 0.5) * 1.1; x += Math.cos(a) * 0.16; y += Math.sin(a) * 0.16; pts.push([x, y]); } return pts; });
    function riftCenter(v) { return [W * 0.6, Math.max(60, v.groundY * 0.3)]; }
    function swirl(cx, cy, R, t, a) {
      const g = c.createRadialGradient(cx, cy, 1, cx, cy, R); g.addColorStop(0, `rgba(255,255,255,${0.95 * a})`); g.addColorStop(0.35, `rgba(181,140,255,${0.85 * a})`); g.addColorStop(0.8, `rgba(60,30,140,${0.7 * a})`); g.addColorStop(1, 'rgba(20,10,60,0)');
      c.fillStyle = g; c.beginPath(); c.arc(cx, cy, R, 0, TAU); c.fill();
      c.save(); c.translate(cx, cy); c.rotate(t * 2.2);
      for (let k = 0; k < 5; k++) { c.rotate(TAU / 5); c.strokeStyle = k % 2 ? `rgba(75,227,255,${0.8 * a})` : `rgba(255,122,217,${0.7 * a})`; c.lineWidth = Math.max(1, R * 0.06); c.beginPath(); for (let q = 0; q <= 20; q++) { const f = q / 20, rr2 = R * 0.95 * f, an = f * 3.2; q ? c.lineTo(Math.cos(an) * rr2, Math.sin(an) * rr2) : c.moveTo(0, 0); } c.stroke(); }
      c.restore();
    }
    function drawRift(v) {
      const f = v.riftFx; if (!f) return;
      const t = f.t, [cx, cy] = riftCenter(v), out = t > 4.2 ? Math.max(0, (5 - t) / 0.8) : 1, D = Math.min(W, H);
      c.fillStyle = `rgba(12,6,30,${Math.min(0.55, t * 0.9) * out})`; c.fillRect(0, 0, W, H);
      // Risse wachsen über den Himmel
      const grow = Math.min(1, t / 1.3);
      c.save(); c.shadowColor = '#7ff6ff'; c.shadowBlur = 12; c.lineCap = 'round'; c.lineJoin = 'round';
      CRACKS.forEach((pts, i) => { const n = Math.max(1, Math.floor(pts.length * grow)); c.strokeStyle = `rgba(${i % 2 ? '200,240,255' : '230,200,255'},${0.95 * out})`; c.lineWidth = 2.6 - i % 3 * 0.6; c.beginPath(); for (let k = 0; k < n; k++) { const x = cx + pts[k][0] * D * 1.5, y = cy + pts[k][1] * D * 1.5; k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); });
      c.restore();
      // Strudel mit Uhr
      if (t > 0.9) {
        const R = D * 0.2 * Math.min(1, (t - 0.9) / 0.8) * (0.95 + 0.05 * Math.sin(t * 6));
        swirl(cx, cy, R, t, out);
        c.save(); c.translate(cx, cy); c.globalAlpha = out;
        c.strokeStyle = 'rgba(255,240,200,0.9)'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, R * 0.62, 0, TAU); c.stroke();
        for (let k = 0; k < 12; k++) { const a = k / 12 * TAU - t * 0.8; c.fillStyle = '#fff3d0'; c.beginPath(); c.arc(Math.cos(a) * R * 0.62, Math.sin(a) * R * 0.62, k % 3 ? 1.5 : 3, 0, TAU); c.fill(); }
        c.lineCap = 'round'; c.strokeStyle = '#ffffff'; c.lineWidth = 3; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(t * 9) * R * 0.45, Math.sin(t * 9) * R * 0.45); c.stroke();
        c.lineWidth = 4; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(-t * 2.5) * R * 0.3, Math.sin(-t * 2.5) * R * 0.3); c.stroke();
        c.restore();
      }
      // Splitter fliegen aus dem Riss
      if (t > 0.3) for (let i = 0; i < 26; i++) { const a = hsh(i + 7) * TAU, sp = 40 + hsh(i + 9) * 160, k = ((t - 0.3) * (0.6 + hsh(i) * 0.6)) % 2.2, x = cx + Math.cos(a) * sp * k, y = cy + Math.sin(a) * sp * k + 20 * k * k;
        c.save(); c.globalAlpha = Math.max(0, 1 - k / 2.2) * out; c.translate(x, y); c.rotate(t * 4 + i); c.fillStyle = i % 2 ? '#bff8ff' : '#e0c8ff'; c.beginPath(); c.moveTo(0, -5); c.lineTo(3, 2); c.lineTo(-3, 3); c.closePath(); c.fill(); c.restore(); }
      // Titel
      if (t > 1.5) {
        const k = Math.min(1, (t - 1.5) / 0.35), pop = k < 1 ? 0.4 + 0.6 * k + Math.sin(k * Math.PI) * 0.25 : 1 + Math.sin(t * 3) * 0.02;
        c.save(); c.globalAlpha = out; c.translate(W / 2, Math.min(H - 60, cy + D * 0.28)); c.scale(pop, pop); c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '700 13px Fredoka, system-ui, sans-serif'; c.fillStyle = '#bff8ff'; c.fillText('DIE ZEIT BEKOMMT RISSE', 0, -22);
        const fs = Math.min(36, W / 11); c.font = `700 ${fs}px Fredoka, system-ui, sans-serif`;
        c.lineWidth = 6; c.strokeStyle = 'rgba(40,10,80,0.85)'; c.strokeText('Zeitsprung möglich!', 0, 6); c.fillStyle = '#fff'; c.fillText('Zeitsprung möglich!', 0, 6);
        c.font = '600 14px Fredoka, system-ui, sans-serif'; c.lineWidth = 4; const sub = '💠 +' + J.fmtNum(f.n) + ' Zeitsplitter warten im Tab „Zeitsprung“';
        c.strokeText(sub, 0, 36); c.fillStyle = '#e0c8ff'; c.fillText(sub, 0, 36);
        c.restore();
      }
    }
    // Kleiner Strudel am Himmel, solange ein Zeitsprung möglich ist
    function drawPortal(v) {
      if (!v.canJump || v.riftFx || v.rocket) return;
      const [cx, cy] = riftCenter(v), R = 13 + Math.sin(v.time * 2) * 1.5;
      c.save(); c.globalAlpha = 0.75; swirl(cx, cy, R, v.time, 1); c.restore();
    }

    // ---------- Siegesshow (1.000 km) ----------
    function drawWinFx(v) {
      const f = v.winFx; if (!f) return;
      const t = f.t, fade = t > 9.8 ? Math.max(0, (10.5 - t) / 0.7) : 1;
      c.fillStyle = `rgba(8,4,24,${Math.min(0.55, t * 0.5) * fade})`; c.fillRect(0, 0, W, H);
      // Flugzeug schreibt mit Rauch in den Himmel
      const text = 'Du hast es geschafft!', fs = Math.max(20, Math.min(54, W / 11)), ty = Math.max(fs, v.groundY * 0.2);
      c.font = `700 ${fs}px Fredoka, system-ui, sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle';
      const tw = c.measureText(text).width, x0 = W / 2 - tw / 2, px = x0 - 60 + (tw + 160) * Math.min(1, Math.max(0, (t - 0.6) / 3.6));
      if (t > 0.6) {
        c.save(); c.globalAlpha = fade; c.beginPath(); c.rect(0, 0, Math.min(W, px - 20), H); c.clip();
        c.lineJoin = 'round'; c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = fs * 0.28; c.strokeText(text, W / 2, ty);
        c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = fs * 0.12; c.strokeText(text, W / 2, ty);
        c.fillStyle = '#fffdf5'; c.fillText(text, W / 2, ty); c.restore();
        if (t < 5) { // Flugzeug mit Rauchfahne
          const py = ty + Math.sin(t * 6) * 4 - fs * 0.1;
          c.save(); c.translate(px, py);
          c.fillStyle = '#e2473b'; rr(c, -26, -6, 46, 12, 6); c.fill(); c.fillStyle = '#fff'; c.fillRect(-20, -1.5, 34, 3);
          c.fillStyle = '#b8322a'; c.beginPath(); c.moveTo(-4, 0); c.lineTo(-14, -22); c.lineTo(-6, -22); c.lineTo(6, 0); c.fill(); c.beginPath(); c.moveTo(-4, 2); c.lineTo(-12, 18); c.lineTo(-6, 18); c.lineTo(4, 2); c.fill();
          c.beginPath(); c.moveTo(-24, -2); c.lineTo(-32, -14); c.lineTo(-26, -14); c.lineTo(-18, -2); c.fill();
          c.fillStyle = '#9fe0ff'; c.beginPath(); c.arc(10, -4, 4, Math.PI, 0); c.fill();
          c.strokeStyle = '#333'; c.lineWidth = 2; c.beginPath(); c.moveTo(22, -8 * Math.cos(t * 60)); c.lineTo(22, 8 * Math.cos(t * 60)); c.stroke();
          c.restore();
          for (let k = 0; k < 6; k++) { c.fillStyle = `rgba(255,255,255,${0.5 - k * 0.08})`; c.beginPath(); c.arc(px - 34 - k * 12, py + Math.sin(t * 8 + k) * 3, 5 + k * 1.5, 0, TAU); c.fill(); }
        }
      }
      // Riesiger Smiley mit Krone steigt auf und hüpft
      if (t > 3.8) {
        const k = Math.min(1, (t - 3.8) / 0.9), ease = 1 - Math.pow(1 - k, 3), bounce = k >= 1 ? Math.abs(Math.sin((t - 4.7) * 3.2)) * 10 : 0;
        const R = Math.min(W * 0.2, v.groundY * 0.28, 150), cx = W / 2, tgt = Math.min(v.groundY - R * 0.6, ty + fs * 0.7 + R * 1.5), cy0 = H + R * 1.2;
        const yy = cy0 + (tgt - cy0) * ease - bounce;
        c.save(); c.globalAlpha = fade; c.translate(cx, yy); c.rotate(Math.sin(t * 2.4) * 0.06);
        const gl = c.createRadialGradient(0, 0, R * 0.8, 0, 0, R * 1.6); gl.addColorStop(0, 'rgba(255,230,120,0.5)'); gl.addColorStop(1, 'rgba(255,230,120,0)'); c.fillStyle = gl; c.beginPath(); c.arc(0, 0, R * 1.6, 0, TAU); c.fill();
        const fg = c.createRadialGradient(-R * 0.3, -R * 0.35, R * 0.1, 0, 0, R); fg.addColorStop(0, '#fff3a0'); fg.addColorStop(1, '#ffc21a');
        c.fillStyle = fg; c.beginPath(); c.arc(0, 0, R, 0, TAU); c.fill(); c.strokeStyle = '#d99a00'; c.lineWidth = R * 0.05; c.stroke();
        const wink = (t % 2.6) > 2.35;
        c.fillStyle = '#3b2400'; c.beginPath(); c.ellipse(-R * 0.35, -R * 0.2, R * 0.1, R * 0.16, 0, 0, TAU); c.fill();
        if (wink) { c.strokeStyle = '#3b2400'; c.lineWidth = R * 0.06; c.beginPath(); c.moveTo(R * 0.22, -R * 0.2); c.lineTo(R * 0.48, -R * 0.2); c.stroke(); } else { c.beginPath(); c.ellipse(R * 0.35, -R * 0.2, R * 0.1, R * 0.16, 0, 0, TAU); c.fill(); }
        c.fillStyle = '#fff'; c.beginPath(); c.arc(-R * 0.32, -R * 0.26, R * 0.035, 0, TAU); c.fill();
        c.fillStyle = 'rgba(255,120,90,0.45)'; [-1, 1].forEach(sd => { c.beginPath(); c.ellipse(sd * R * 0.6, R * 0.12, R * 0.13, R * 0.08, 0, 0, TAU); c.fill(); });
        c.fillStyle = '#7a2a10'; c.beginPath(); c.arc(0, R * 0.08, R * 0.55, 0.15 * Math.PI, 0.85 * Math.PI); c.closePath(); c.fill();
        c.fillStyle = '#ff7a8a'; c.beginPath(); c.ellipse(0, R * 0.5, R * 0.22, R * 0.1, 0, 0, TAU); c.fill();
        // Krone
        c.save(); c.translate(0, -R * 0.92); c.rotate(-0.12);
        const cw = R * 0.95, ch = R * 0.55;
        c.fillStyle = '#ffd23f'; c.strokeStyle = '#b8860b'; c.lineWidth = R * 0.03;
        c.beginPath(); c.moveTo(-cw / 2, 0); c.lineTo(-cw / 2, -ch * 0.7); c.lineTo(-cw / 4, -ch * 0.3); c.lineTo(0, -ch); c.lineTo(cw / 4, -ch * 0.3); c.lineTo(cw / 2, -ch * 0.7); c.lineTo(cw / 2, 0); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#e2b12a'; c.fillRect(-cw / 2, -ch * 0.18, cw, ch * 0.18);
        [['#e2473b', -cw / 4], ['#4be3ff', 0], ['#5ee07a', cw / 4]].forEach(([col, x]) => { c.fillStyle = col; c.beginPath(); c.arc(x, -ch * 0.09, R * 0.06, 0, TAU); c.fill(); });
        [[-cw / 2, -ch * 0.7], [0, -ch], [cw / 2, -ch * 0.7]].forEach(([x, y]) => { c.fillStyle = '#fff6c0'; c.beginPath(); c.arc(x, y, R * 0.05, 0, TAU); c.fill(); });
        const sp = (t * 1.3) % 3; star(-cw / 2 + sp * cw / 2, -ch * 0.75, R * 0.08 * (1 + Math.sin(t * 9) * 0.3), t * 3, '#ffffff');
        c.restore(); c.restore();
      }
      // Konfetti
      f.conf.forEach(p => { c.save(); c.globalAlpha = fade; c.translate(p.x, p.y); c.rotate(p.rot); c.fillStyle = p.col; c.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); c.restore(); });
      if (t > 2.5 && t < 9.8) { c.font = '600 12px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'bottom'; c.fillStyle = 'rgba(255,255,255,0.7)'; c.fillText('Tippen zum Überspringen', W / 2, H - 8); }
    }

    // Untergrund der Höhen-Ziele: Pfosten am Boden, Podest auf Stützen, Aufzug mit Schiene und Seil
    function drawTargetStand(v, t, x, y, r, gy) {
      const wood = '#7a5230', dark = '#4a2e14', metal = v.age >= 6, Y = yy => v.groundY - yy * v.scale;
      if (t.kind === 'ground') {
        c.fillStyle = dark; c.fillRect(x - 2, y + r * 0.8, 4, gy - y - r * 0.8);
        c.fillStyle = wood; c.beginPath(); c.moveTo(x - r * 0.9, gy); c.lineTo(x, y + r * 0.6); c.lineTo(x + r * 0.9, gy); c.lineWidth = 3; c.strokeStyle = wood; c.stroke();
      } else if (t.kind === 'post') {
        const pw = Math.max(10, r * 2.4), top = y + r + 2;
        c.fillStyle = metal ? '#6a6e75' : '#8a6a44'; c.fillRect(x - pw * 0.18, top, pw * 0.36, gy - top);
        c.strokeStyle = metal ? '#4a4e55' : '#5a3d22'; c.lineWidth = 2; c.beginPath();
        for (let yy = top + 6; yy < gy - 4; yy += 10) { c.moveTo(x - pw * 0.18, yy); c.lineTo(x + pw * 0.18, yy + 8); c.moveTo(x + pw * 0.18, yy); c.lineTo(x - pw * 0.18, yy + 8); }
        c.stroke();
        c.fillStyle = metal ? '#8d939b' : '#a0703c'; rr(c, x - pw / 2, top - 2, pw, 6, 2); c.fill();
        c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(x - pw / 2 + 2, top - 1, pw - 4, 1.5);
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x, gy, pw * 0.5, 3, 0, 0, TAU); c.fill();
      } else if (t.kind === 'lift') {
        const yTop = Y(t.hi) - r - 8, pw = Math.max(10, r * 2.4);
        c.fillStyle = metal ? '#4a4e55' : '#5a3d22'; c.fillRect(x - pw / 2 - 3, yTop, 3, gy - yTop); c.fillRect(x + pw / 2, yTop, 3, gy - yTop);
        c.fillStyle = metal ? '#6a6e75' : '#7a5230'; c.fillRect(x - pw / 2 - 5, yTop - 4, pw + 10, 5);
        c.strokeStyle = 'rgba(30,20,10,0.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, yTop); c.lineTo(x, y - r); c.stroke();
        c.fillStyle = '#3b2b1a'; c.beginPath(); c.arc(x, yTop - 1, 3, 0, TAU); c.fill();
        const top = y + r + 2; c.fillStyle = metal ? '#8d939b' : '#a0703c'; rr(c, x - pw / 2, top - 2, pw, 5, 2); c.fill();
        // Pfeile zeigen die Fahrtrichtung
        c.fillStyle = 'rgba(255,255,255,0.7)'; const ay = (yTop + gy) / 2; [-1, 1].forEach(d => { c.beginPath(); c.moveTo(x + pw / 2 + 9, ay + d * 10); c.lineTo(x + pw / 2 + 5, ay + d * 4); c.lineTo(x + pw / 2 + 13, ay + d * 4); c.fill(); });
      }
    }
    // ---------- Challenge-Ziele ----------
    function drawChallenge(v) {
      const ch = v.chal; if (!ch) return;
      const X = x => v.x0 + x * v.scale, Y = y => v.groundY - y * v.scale, gy = v.groundY;
      if (ch.tower) drawObstacle(v, { o: ch.tower, state: 'active', hp: ch.hp, hit: ch.hit, ys: ch.ys, blocking: false });
      if (ch.ground) {
        const x = X(ch.ground.x != null ? ch.ground.x : ch.ground.at), w = Math.max(8, ch.ground.w * 2 * v.scale), look = ch.c.look;
        if (look === 'cart') { // Karren mit Zielscheibe
          c.fillStyle = '#8a5a2b'; rr(c, x - w / 2 - 4, gy - 16, w + 8, 10, 2); c.fill(); c.fillStyle = '#5a3d1f'; [-1, 1].forEach(sd => { c.beginPath(); c.arc(x + sd * (w / 2 - 1), gy - 5, 5, 0, TAU); c.fill(); });
          c.strokeStyle = '#3b2b1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x - w / 2 - 4, gy - 12); c.lineTo(x - w / 2 - 16, gy - 8); c.stroke();
        } else if (look === 'train') { // Panzerzug
          c.fillStyle = '#3d4436'; rr(c, x - w / 2 - 8, gy - 22, w + 16, 16, 3); c.fill(); c.fillStyle = '#2a2e26'; c.fillRect(x - w / 2 - 2, gy - 30, 12, 8); c.fillRect(x + 4, gy - 27, 20, 3);
          c.fillStyle = '#111'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(x - w / 2 - 4 + k * (w + 8) / 3, gy - 5, 4.5, 0, TAU); c.fill(); }
          c.fillStyle = 'rgba(220,220,220,0.5)'; c.beginPath(); c.arc(x - w / 2 + 2, gy - 36 - Math.sin(v.time * 6) * 2, 5, 0, TAU); c.fill();
        }
        const ty = look ? gy - (look === 'train' ? 22 : 16) : gy;
        ['#e2473b', '#fff', '#e2473b'].forEach((col, i) => { c.fillStyle = col; c.fillRect(x - w / 2 + i * w / 6, ty - 4, w - i * w / 3, 8); });
        c.strokeStyle = '#3b2b1a'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, ty); c.lineTo(x, ty - 34); c.stroke();
        c.fillStyle = '#e2473b'; c.beginPath(); c.moveTo(x, ty - 34); c.lineTo(x + 14, ty - 29); c.lineTo(x, ty - 24); c.fill();
      }
      (ch.targets || []).forEach(t => {
        const x = X(t.x), y = Y(t.y), r = Math.max(8, t.r * v.scale);
        if (t.kind) drawTargetStand(v, t, x, y, r, gy);
        if (ch.c.id === 'turm') { c.fillStyle = '#7b7d84'; c.fillRect(x - 6, y + r, 12, gy - y - r); }
        if (ch.c.look === 'kite') { // Drachen mit Schnur und Schwanz
          c.globalAlpha = t.hit ? 0.35 : 1;
          c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x, y + r); c.quadraticCurveTo(x - 30, (y + gy) / 2, x - 50, gy); c.stroke();
          c.strokeStyle = '#ffd23f'; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y + r * 1.3); for (let k = 1; k <= 4; k++) c.lineTo(x + Math.sin(v.time * 5 + k) * 5, y + r * 1.3 + k * 7); c.stroke();
          c.fillStyle = ['#e2473b', '#4be3ff', '#5ee07a'][Math.floor(t.ph) % 3]; c.beginPath(); c.moveTo(x, y - r * 1.3); c.lineTo(x + r, y); c.lineTo(x, y + r * 1.3); c.lineTo(x - r, y); c.closePath(); c.fill();
          c.strokeStyle = 'rgba(0,0,0,0.3)'; c.beginPath(); c.moveTo(x, y - r * 1.3); c.lineTo(x, y + r * 1.3); c.moveTo(x - r, y); c.lineTo(x + r, y); c.stroke(); c.globalAlpha = 1;
          if (t.hit) { c.font = '700 14px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#5ee07a'; c.fillText('✓', x, y); }
          return;
        }
        c.globalAlpha = t.hit ? 0.35 : 1;
        c.fillStyle = '#e2473b'; c.beginPath(); c.arc(x, y, r, 0, TAU); c.fill();
        c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, r * 0.62, 0, TAU); c.fill();
        c.fillStyle = '#e2473b'; c.beginPath(); c.arc(x, y, r * 0.28, 0, TAU); c.fill();
        c.globalAlpha = 1;
        if (t.hit) { c.font = '700 14px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#5ee07a'; c.fillText('✓', x, y); }
      });
      if (ch.train) { // Trainingszentrum: Schild, Zähler und Belohnung
        if (v.phase !== 'aim') label(W / 2 - 30, 58, '🏋️ ' + ch.c.name + ' · Ziel ' + ((v.trainN || 0) + 1), 'rgba(40,90,60,0.88)');
        const rw = ch.reward;
        if (rw && rw.t < 1.6) {
          const k = Math.min(1, rw.t / 0.3), pop = k < 1 ? 0.4 + 0.6 * k + Math.sin(k * Math.PI) * 0.3 : 1, a = rw.t > 1.2 ? (1.6 - rw.t) / 0.4 : 1;
          c.save(); c.globalAlpha = a; c.translate(W / 2, v.groundY * 0.42); c.scale(pop, pop); c.textAlign = 'center'; c.textBaseline = 'middle';
          c.font = `700 ${Math.min(34, W / 11)}px Fredoka, system-ui, sans-serif`; c.lineWidth = 6; c.strokeStyle = 'rgba(10,40,20,0.8)'; c.strokeText(rw.text, 0, 0); c.fillStyle = '#5ee07a'; c.fillText(rw.text, 0, 0);
          c.font = '600 12px Fredoka, system-ui, sans-serif'; c.lineWidth = 4; c.strokeText(rw.sub, 0, 28); c.fillStyle = '#eaffd0'; c.fillText(rw.sub, 0, 28);
          c.restore();
        }
        return;
      }
      const t = ch.c.name + ' · Versuch ' + Math.min(ch.c.tries, ch.used + 1) + '/' + ch.c.tries + (ch.targets ? ' · Ziele ' + ch.targets.filter(x => x.hit).length + '/' + ch.targets.length : '') + (ch.tower ? ' · Teile ' + ch.hp.filter(h => h <= 0).length + '/' + ch.hp.length : '');
      if (v.phase !== 'aim') label(W / 2, 58, '🏆 ' + t, 'rgba(90,40,120,0.85)');
    }

    // ---------- Hauptzeichnung ----------
    function draw(v) {
      const th = THEME[v.age];
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (v.shake > 0) c.translate(Math.sin(v.time * 90) * 6 * v.shake, Math.cos(v.time * 70) * 4 * v.shake);
      drawSky(v, th);
      drawGround(v, th);
      const gy = v.groundY;
      // Ziel und Rekord
      const goalX = v.x0 + J.P.goal * v.scale;
      if (goalX < W - 10) flag(goalX, gy, '#ffd23f', 'Ziel ' + J.fmtKm(J.P.goal), 60);
      if (v.record > 0) { const rx = v.x0 + v.record * v.scale; if (rx < W - 10) flag(rx, gy, '#ff7a3d', 'Rekord', 64); }
      if (!v.chal) v.obstacles.forEach(o => drawObstacle(v, o));
      drawPortal(v);
      drawWreckage(v);
      drawEvent(v);
      drawChallenge(v);
      // Sterne
      v.stars.forEach(s => {
        if (s.got) return;
        const x = v.x0 + s.x * v.scale, y = gy - s.y * v.scale;
        if (x > W + 20 || y < -20) return;
        c.fillStyle = 'rgba(255,230,120,0.25)'; c.beginPath(); c.arc(x, y, 15, 0, TAU); c.fill();
        star(x, y, 10, v.time * 1.5 + s.x, '#ffd23f');
      });
      v.flyers.forEach(f => drawFlyer(v, f));
      // Zielhilfe vor dem Schuss
      const m = muzzle(v.age, v.angle, v.ageFx ? null : v.cur);
      const cx = v.x0, ballOrigin = { x: cx + m.x, y: gy + m.y };
      if (v.phase === 'idle' || v.phase === 'walk' || v.phase === 'aim') {
        const a = v.angle * Math.PI / 180;
        if (v.preview && v.preview.length) { // Flugbahn-Vorschau (Länge hängt von der Zielhilfe ab)
          c.fillStyle = 'rgba(255,255,255,0.85)';
          v.preview.forEach((p, i) => { const x = v.x0 + p[0] * v.scale, y = gy - p[1] * v.scale; c.globalAlpha = 0.9 * (1 - i / v.preview.length) + 0.1; c.beginPath(); c.arc(x, y, 2.4, 0, TAU); c.fill(); });
          c.globalAlpha = 1;
        }
        c.font = '700 12px Fredoka, system-ui, sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'left'; c.textBaseline = 'middle';
        c.fillText(Math.round(v.angle) + '°', ballOrigin.x + Math.cos(a) * 78, ballOrigin.y - Math.sin(a) * 78);
      }
      // Flugspur
      if (v.trail.length > 1) { // Flugspur des letzten Schusses, blendet nach der Landung aus
        c.strokeStyle = `rgba(255,255,255,${0.75 * Math.max(0, Math.min(1, v.trailA))})`; c.lineWidth = 2; c.setLineDash([3, 5]);
        c.beginPath();
        v.trail.forEach((p, i) => { const x = v.x0 + p[0] * v.scale, y = gy - p[1] * v.scale; i ? c.lineTo(x, y) : c.moveTo(x, y); });
        c.stroke(); c.setLineDash([]);
      }
      if (v.lastLand) flag(v.x0 + v.lastLand.x * v.scale, gy, '#4ccf6a', v.lastLand.text, 30);
      // Kanone und Spieler
      drawWeather(v);
      if (v.ageFx) { // alte Kanone schrumpft und glüht, neue springt mit Überschwingen heraus
        const t = v.ageFx.t, old = t < 1.1, k = old ? Math.max(0.05, 1 - Math.max(0, t - 0.4) / 0.7) : Math.min(1, (t - 1.1) / 0.35);
        const sc = old ? k : (k < 1 ? k * 1.25 - Math.max(0, k - 0.8) * 1.25 : 1), age = old ? v.ageFx.from : v.ageFx.to;
        c.save(); c.translate(cx, gy); c.scale(sc, sc); if (old) c.rotate(Math.sin(t * 30) * 0.05 * (t > 0.4 ? 1 : 0)); c.translate(-cx, -gy);
        if (old && t > 0.4) { c.shadowColor = '#fff3b0'; c.shadowBlur = 30; }
        drawCannon(v, cx, gy, age, v.angle, 0, old ? { kraft: 3, wucht: 3, ziel: 3, gluck: 3 } : null); c.restore();
        const pa = t < 1.1 ? v.ageFx.from : v.ageFx.to; drawPlayer(v, v.playerX, gy, pa, v.time, 'idle', (v.skins || {})[pa], 0);
      } else {
        drawCannon(v, cx, gy, v.age, v.angle, v.recoil, v.cur);
        drawAddons(v, cx, gy, v.age, v.angle, v.cur);
        if (!v.hidePlayer) drawPlayer(v, v.playerX, gy - (v.playerY || 0), v.age, v.time, v.walking ? 'walk' : v.pose, (v.skins || {})[v.age], v.act);
      }
      drawRocket(v);
      if (v.flash > 0) {
        c.fillStyle = `rgba(255,220,120,${v.flash})`; c.beginPath(); c.arc(ballOrigin.x, ballOrigin.y, 18 * v.flash + 6, 0, TAU); c.fill();
      }
      // Kugel
      if (v.ball) {
        const bx = v.x0 + v.ball.x * v.scale, by = gy - v.ball.y * v.scale;
        if (v.ball.ammo && v.ball.ammo !== 'kugel') drawAmmo(v.ball.ammo, bx, Math.min(by, gy - 4), v.ball.vx, v.ball.vy, v.time);
        else drawBall(v.age, v.cur ? v.cur.wucht : 0, bx, Math.min(by, gy - 4), v.ball.vx, v.ball.vy, v.time, 1);
        if (by < -8) { // Kugel oberhalb des Bildes: Pfeil
          c.fillStyle = '#fff'; c.beginPath(); c.moveTo(bx, 4); c.lineTo(bx - 6, 14); c.lineTo(bx + 6, 14); c.fill();
          c.font = '600 11px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'top'; c.fillText(J.fmtKm(v.ball.y) + ' hoch', bx, 16);
        }
      }
      // Partikel
      v.parts.forEach(p => { c.globalAlpha = Math.max(0, p.life); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); });
      c.globalAlpha = 1;
      // Schwebende Texte
      c.textAlign = 'center'; c.textBaseline = 'middle';
      v.texts.forEach(t => {
        c.globalAlpha = Math.min(1, t.life * 2);
        c.font = `700 ${t.size || 15}px Fredoka, system-ui, sans-serif`;
        c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.55)'; c.strokeText(t.text, t.x, t.y);
        c.fillStyle = t.col || '#fff'; c.fillText(t.text, t.x, t.y);
      });
      c.globalAlpha = 1;
      // Laufende Distanz während des Flugs
      if (v.ball && v.phase === 'flight') {
        c.font = '700 20px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'top';
        c.lineWidth = 5; c.strokeStyle = 'rgba(0,0,0,0.5)'; const t = J.fmtKm(v.ball.x);
        c.strokeText(t, W / 2, 14); c.fillStyle = '#fff'; c.fillText(t, W / 2, 14);
      }
      drawGoodFx(v);
      drawEventBadge(v);
      drawEventIntro(v);
      drawAgeFx(v);
      drawWinFx(v);
      drawRift(v);
      // Feuerwerk-Funken über dem Overlay
      if (v.ageFx || v.winFx) v.parts.forEach(p => { if (!p.spark) return; c.globalAlpha = Math.max(0, Math.min(1, p.life)); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); });
      c.globalAlpha = 1;
      if (v.info) { const iy = v.groundY - v.info.length * 14 - 10; c.font = '500 11px ui-monospace, Menlo, monospace'; c.textAlign = 'left'; c.textBaseline = 'top'; c.fillStyle = 'rgba(0,0,0,0.6)'; c.fillRect(6, iy, Math.min(W - 12, 330), v.info.length * 14 + 4); c.fillStyle = '#9fffb0'; v.info.forEach((t, i) => c.fillText(t, 10, iy + 2 + i * 14)); }
      drawBar(v);
    }

    return { resize, draw, muzzle, partColor, previewPlayer, drawShrine, rocketPos };
  }

  root.makeRenderer = makeRenderer;
})(window);
