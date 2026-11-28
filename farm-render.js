// Epochenschuss – Farm-Welt (Canvas 2D): Hof mit Scheune und Windmühle, Beete, Bauer und Bots
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
  const hsh = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const BOT_COL = { saer: '#5ee07a', giess: '#4bb8ff', ernte: '#ff8a3d', markt: '#ffd23f', saat: '#c9a0ff' };

  function makeFarmRenderer(canvas) {
    const c = canvas.getContext('2d');
    let W = 1, H = 1, dpr = 1;
    const farmer = { x: 0.5, y: 0.3, tx: 0.5, ty: 0.3, act: null, at: 0, face: 1, crop: null };
    const bots = {}; let parts = [], texts = [];

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2.5, window.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    // Beet-Raster: 5 Spalten × 4 Reihen (20 Beete)
    const COLS = 5, ROWS = 4, NP = COLS * ROWS;
    function field() { const top = H * 0.37, fx = W * 0.03, fw = W * 0.94, fh = H - top - 6; return { fx, top, fw, fh, cw: fw / COLS, ch: fh / ROWS }; }
    function slot(i) { const f = field(), col = i % COLS, row = Math.floor(i / COLS); return { x: f.fx + col * f.cw + 3, y: f.top + row * f.ch + 3, w: f.cw - 6, h: f.ch - 6 }; }
    function slotAt(px, py) { for (let i = 0; i < NP; i++) { const b = slot(i); if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return i; } return -1; }

    // ---------- Hintergrund: Himmel, Berge, Felder-Flickenteppich, Hof mit Scheune, Silo, Haus, Windmühle, Tiere ----------
    const HZ = () => H * 0.33; // Hofkante (dahinter Landschaft)
    function tree(x, y, s, col, dark) {
      c.fillStyle = '#6b4423'; c.fillRect(x - s * 0.08, y - s * 0.5, s * 0.16, s * 0.5);
      c.fillStyle = dark; c.beginPath(); c.arc(x, y - s * 0.62, s * 0.36, 0, TAU); c.arc(x - s * 0.24, y - s * 0.48, s * 0.26, 0, TAU); c.arc(x + s * 0.24, y - s * 0.5, s * 0.27, 0, TAU); c.fill();
      c.fillStyle = col; c.beginPath(); c.arc(x - s * 0.05, y - s * 0.68, s * 0.27, 0, TAU); c.arc(x - s * 0.2, y - s * 0.54, s * 0.17, 0, TAU); c.fill();
    }
    function hay(x, y, s) { c.fillStyle = '#d9b24a'; c.beginPath(); c.ellipse(x, y - s * 0.45, s * 0.6, s * 0.5, 0, Math.PI, 0); c.lineTo(x + s * 0.6, y); c.lineTo(x - s * 0.6, y); c.fill(); c.strokeStyle = 'rgba(140,100,30,0.6)'; c.lineWidth = 1; for (let k = -2; k <= 2; k++) { c.beginPath(); c.moveTo(x + k * s * 0.2, y); c.quadraticCurveTo(x + k * s * 0.12, y - s * 0.6, x + k * s * 0.06, y - s * 0.9); c.stroke(); } }
    function hen(x, y, t, k) { const pk = Math.max(0, Math.sin(t * 3 + k * 2)) > 0.8 ? 3 : 0; c.fillStyle = '#fff'; c.beginPath(); c.ellipse(x, y - 4, 5, 3.6, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(x + 4, y - 7 + pk, 2.4, 0, TAU); c.fill(); c.fillStyle = '#e2473b'; c.fillRect(x + 3.5, y - 10 + pk, 2, 1.6); c.fillStyle = '#f2a33a'; c.beginPath(); c.moveTo(x + 6.2, y - 7 + pk); c.lineTo(x + 8, y - 6.4 + pk); c.lineTo(x + 6.2, y - 6 + pk); c.fill(); c.strokeStyle = '#f2a33a'; c.lineWidth = 0.8; c.beginPath(); c.moveTo(x - 1, y - 1); c.lineTo(x - 1, y + 1); c.moveTo(x + 1, y - 1); c.lineTo(x + 1, y + 1); c.stroke(); }
    function cow(x, y, t) { const ch = Math.sin(t * 2) * 0.8; c.fillStyle = '#f4efe0'; rr(c, x - 12, y - 14, 22, 10, 4); c.fill(); c.fillStyle = '#2b2b2b'; c.beginPath(); c.ellipse(x - 5, y - 11, 3, 2.4, 0, 0, TAU); c.ellipse(x + 4, y - 8, 2.5, 2, 0, 0, TAU); c.fill(); c.fillStyle = '#f4efe0'; rr(c, x + 8, y - 15 + ch, 7, 6, 2); c.fill(); c.fillStyle = '#f0a0a0'; rr(c, x + 12, y - 12 + ch, 4, 3, 1.5); c.fill(); c.fillStyle = '#4a4a4a'; [-10, -6, 4, 8].forEach(lx => c.fillRect(x + lx, y - 5, 2, 5)); c.strokeStyle = '#4a4a4a'; c.lineWidth = 1; c.beginPath(); c.moveTo(x - 12, y - 12); c.quadraticCurveTo(x - 15, y - 8 + Math.sin(t * 3) * 2, x - 14, y - 5); c.stroke(); }
    function scene(t) {
      const hz = HZ();
      const g = c.createLinearGradient(0, 0, 0, hz); g.addColorStop(0, '#5fb3ea'); g.addColorStop(0.6, '#a9dcf5'); g.addColorStop(1, '#f2f7dc');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // Sonne mit Schein
      const sx = W * 0.88, sy = H * 0.08, sr = Math.min(W, H) * 0.045; const sg = c.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 4); sg.addColorStop(0, 'rgba(255,246,190,0.9)'); sg.addColorStop(1, 'rgba(255,246,190,0)'); c.fillStyle = sg; c.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8); c.fillStyle = '#fff6c0'; c.beginPath(); c.arc(sx, sy, sr, 0, TAU); c.fill();
      // Wolken
      for (let k = 0; k < 4; k++) { const x = ((t * (4 + k) + k * 190) % (W + 160)) - 80, y = H * (0.05 + (k % 3) * 0.04), s = 9 + k * 2.5; c.fillStyle = 'rgba(160,190,215,0.5)'; c.beginPath(); c.arc(x + 2, y + 3, s, 0, TAU); c.arc(x + s + 2, y + 6, s * 0.8, 0, TAU); c.fill(); c.fillStyle = 'rgba(255,255,255,0.92)'; c.beginPath(); c.arc(x, y, s, 0, TAU); c.arc(x + s, y + 3, s * 0.8, 0, TAU); c.arc(x - s, y + 4, s * 0.7, 0, TAU); c.arc(x + s * 0.3, y - s * 0.5, s * 0.7, 0, TAU); c.fill(); }
      // Vogelschwarm
      c.strokeStyle = 'rgba(60,70,90,0.6)'; c.lineWidth = 1; for (let k = 0; k < 4; k++) { const bx = ((t * 14 + k * 13) % (W + 60)) - 30, by = H * 0.12 + k * 4 + Math.sin(t * 2 + k) * 2, fl = Math.sin(t * 9 + k) * 2; c.beginPath(); c.moveTo(bx - 4, by - fl); c.quadraticCurveTo(bx - 2, by - 1, bx, by); c.quadraticCurveTo(bx + 2, by - 1, bx + 4, by - fl); c.stroke(); }
      // Berge im Dunst
      c.fillStyle = '#a9c3d6'; c.beginPath(); c.moveTo(0, hz * 0.78); for (let x = 0; x <= W; x += 8) c.lineTo(x, hz * (0.55 + 0.12 * Math.sin(x * 0.011 + 1) + 0.06 * Math.sin(x * 0.037))); c.lineTo(W, hz); c.lineTo(0, hz); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.7)'; for (let x = 0; x <= W; x += 8) { const y = hz * (0.55 + 0.12 * Math.sin(x * 0.011 + 1) + 0.06 * Math.sin(x * 0.037)); if (y < hz * 0.5) c.fillRect(x, y, 8, 2.5); }
      // ferne Hügel als Flickenteppich aus Feldern
      const hill = (yb, amp, f, ph) => x => hz * yb + Math.sin(x * f + ph) * hz * amp;
      const h1 = hill(0.74, 0.05, 0.009, 2), h2 = hill(0.86, 0.04, 0.014, 0.5);
      c.fillStyle = '#9cc76f'; c.beginPath(); c.moveTo(0, hz); for (let x = 0; x <= W; x += 6) c.lineTo(x, h1(x)); c.lineTo(W, hz); c.fill();
      const pc = ['#c9d46a', '#8fbf5a', '#d9c26a', '#7fae4f', '#b5cf6a'];
      for (let k = 0; k < 9; k++) { const x0 = k * W / 9, x1 = x0 + W / 9; c.fillStyle = pc[k % 5]; c.globalAlpha = 0.55; c.beginPath(); c.moveTo(x0, h1(x0) + 3); c.lineTo(x1, h1(x1) + 3); c.lineTo(x1, h2(x1)); c.lineTo(x0, h2(x0)); c.fill(); c.globalAlpha = 1; c.strokeStyle = 'rgba(90,120,50,0.35)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x0, h1(x0) + 3); c.lineTo(x0, h2(x0)); c.stroke(); }
      for (let k = 0; k < 7; k++) { const x = (k + 0.4) * W / 7; tree(x, h1(x) + 4, 10 + (k % 3) * 3, '#7fbf5a', '#4f8a3a'); }
      c.fillStyle = '#86b955'; c.beginPath(); c.moveTo(0, hz); for (let x = 0; x <= W; x += 6) c.lineTo(x, h2(x)); c.lineTo(W, hz + 4); c.lineTo(0, hz + 4); c.fill();
      // Hofboden
      const gg = c.createLinearGradient(0, hz, 0, H); gg.addColorStop(0, '#7fb24f'); gg.addColorStop(1, '#5e9a3a'); c.fillStyle = gg; c.fillRect(0, hz, W, H - hz);
      for (let k = 0; k < 60; k++) { c.fillStyle = k % 2 ? 'rgba(40,90,20,0.35)' : 'rgba(200,230,140,0.35)'; c.fillRect(hsh(k) * W, hz + 4 + hsh(k + 99) * (H - hz), 1.5, 3); }
      // Feldweg zur Scheune
      c.fillStyle = '#c9a46a'; c.beginPath(); c.moveTo(W * 0.15, hz); c.quadraticCurveTo(W * 0.22, hz + (H - hz) * 0.05, W * 0.02, H * 0.37); c.lineTo(W * 0.1, H * 0.37); c.quadraticCurveTo(W * 0.26, hz + 3, W * 0.2, hz); c.fill();
      // Silo
      const bx = W * 0.05, by = hz, bw = Math.min(100, W * 0.2), bh = H * 0.19;
      const six = bx + bw + 4, siw = Math.min(22, W * 0.05), sih = bh * 1.35;
      const sgr = c.createLinearGradient(six, 0, six + siw, 0); sgr.addColorStop(0, '#9aa3ad'); sgr.addColorStop(0.45, '#e6ebf0'); sgr.addColorStop(1, '#7d8690'); c.fillStyle = sgr; c.fillRect(six, by - sih, siw, sih);
      c.fillStyle = '#6d7680'; c.beginPath(); c.arc(six + siw / 2, by - sih, siw / 2, Math.PI, 0); c.fill(); c.strokeStyle = 'rgba(60,70,80,0.4)'; c.lineWidth = 1; for (let k = 1; k < 6; k++) { c.beginPath(); c.moveTo(six, by - sih * k / 6); c.lineTo(six + siw, by - sih * k / 6); c.stroke(); }
      // Scheune mit Brettern, Heuluke und Tor
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(bx + bw / 2, by, bw * 0.6, 4, 0, 0, TAU); c.fill();
      const bgr = c.createLinearGradient(bx, 0, bx + bw, 0); bgr.addColorStop(0, '#c4473a'); bgr.addColorStop(1, '#9c3226'); c.fillStyle = bgr; c.fillRect(bx, by - bh, bw, bh);
      c.strokeStyle = 'rgba(80,20,10,0.35)'; c.lineWidth = 1; for (let x = bx + 6; x < bx + bw; x += 6) { c.beginPath(); c.moveTo(x, by - bh); c.lineTo(x, by); c.stroke(); }
      c.fillStyle = '#6e2318'; c.beginPath(); c.moveTo(bx - 7, by - bh + 1); c.lineTo(bx + bw * 0.2, by - bh - bh * 0.42); c.lineTo(bx + bw * 0.8, by - bh - bh * 0.42); c.lineTo(bx + bw + 7, by - bh + 1); c.fill();
      c.fillStyle = '#f4efe0'; c.fillRect(bx - 7, by - bh, bw + 14, 2.5);
      c.fillStyle = '#3a2416'; c.fillRect(bx + bw * 0.4, by - bh - bh * 0.3, bw * 0.2, bh * 0.24); c.fillStyle = '#e2c25a'; c.fillRect(bx + bw * 0.42, by - bh - bh * 0.14, bw * 0.16, bh * 0.08);
      const dx = bx + bw * 0.28, dw = bw * 0.44, dh = bh * 0.66; c.fillStyle = '#7a2a1f'; c.fillRect(dx, by - dh, dw, dh); c.strokeStyle = '#f4efe0'; c.lineWidth = 2; c.strokeRect(dx, by - dh, dw, dh); c.beginPath(); c.moveTo(dx, by - dh); c.lineTo(dx + dw / 2, by); c.lineTo(dx + dw, by - dh); c.moveTo(dx, by); c.lineTo(dx + dw / 2, by - dh); c.lineTo(dx + dw, by); c.moveTo(dx + dw / 2, by - dh); c.lineTo(dx + dw / 2, by); c.stroke();
      c.fillStyle = '#f4efe0'; [bx + 5, bx + bw - 15].forEach(wx => { c.fillRect(wx, by - bh * 0.85, 10, 8); c.fillStyle = '#4a6a8a'; c.fillRect(wx + 1.5, by - bh * 0.85 + 1.5, 7, 5); c.fillStyle = '#f4efe0'; });
      // Wetterhahn
      c.strokeStyle = '#3a3a3a'; c.lineWidth = 1; c.beginPath(); c.moveTo(bx + bw / 2, by - bh - bh * 0.42); c.lineTo(bx + bw / 2, by - bh - bh * 0.62); c.stroke(); c.fillStyle = '#3a3a3a'; c.beginPath(); c.moveTo(bx + bw / 2 - 5, by - bh - bh * 0.62); c.lineTo(bx + bw / 2 + 5, by - bh - bh * 0.66); c.lineTo(bx + bw / 2 + 2, by - bh - bh * 0.58); c.fill();
      // Heuballen und Hühner
      hay(bx + bw + siw + 18, by + 1, 14); hay(bx + bw + siw + 34, by + 1, 11);
      // Marktstand des Händler-Bots
      const mx = W * 0.32, my = hz; c.fillStyle = 'rgba(0,0,0,0.15)'; c.beginPath(); c.ellipse(mx + 16, my, 22, 3, 0, 0, TAU); c.fill(); c.fillStyle = '#8a5a2b'; c.fillRect(mx, my - 20, 3, 20); c.fillRect(mx + 30, my - 20, 3, 20); c.fillStyle = '#a0703c'; rr(c, mx - 3, my - 10, 39, 7, 2); c.fill();
      for (let k = 0; k < 5; k++) { c.fillStyle = k % 2 ? '#fff' : '#e2473b'; c.beginPath(); c.moveTo(mx - 4 + k * 8.2, my - 26); c.lineTo(mx + 4.2 + k * 8.2, my - 26); c.lineTo(mx + 4.2 + k * 8.2, my - 20); c.quadraticCurveTo(mx + k * 8.2, my - 17, mx - 4 + k * 8.2, my - 20); c.fill(); }
      [['#e8792a', 4], ['#f2c14e', 13], ['#e2b64a', 22], ['#ffd23f', 29]].forEach(([cl, ox]) => { c.fillStyle = cl; c.beginPath(); c.arc(mx + ox, my - 12, 3, 0, TAU); c.fill(); });
      // Bauernhaus
      const hx = W * 0.5, hw = Math.min(64, W * 0.14), hh = H * 0.11;
      c.fillStyle = '#efe2c4'; c.fillRect(hx, hz - hh, hw, hh); c.fillStyle = '#7a4a2a'; c.beginPath(); c.moveTo(hx - 5, hz - hh); c.lineTo(hx + hw / 2, hz - hh - hh * 0.7); c.lineTo(hx + hw + 5, hz - hh); c.fill();
      c.fillStyle = '#8a5a2b'; c.fillRect(hx + hw * 0.7, hz - hh - hh * 0.6, 6, hh * 0.35); const sm = (t * 0.6) % 1; c.fillStyle = `rgba(230,230,230,${0.6 * (1 - sm)})`; c.beginPath(); c.arc(hx + hw * 0.7 + 3 + sm * 6, hz - hh - hh * 0.6 - sm * 14, 3 + sm * 4, 0, TAU); c.fill();
      c.fillStyle = '#6b4423'; c.fillRect(hx + hw * 0.42, hz - hh * 0.6, hw * 0.16, hh * 0.6); c.fillStyle = '#ffe9a8'; [hx + hw * 0.12, hx + hw * 0.68].forEach(wx => { c.fillRect(wx, hz - hh * 0.75, hw * 0.18, hh * 0.3); }); c.strokeStyle = '#6b4423'; c.lineWidth = 1; [hx + hw * 0.12, hx + hw * 0.68].forEach(wx => c.strokeRect(wx, hz - hh * 0.75, hw * 0.18, hh * 0.3));
      c.fillStyle = '#e2473b'; for (let k = 0; k < 4; k++) { c.beginPath(); c.arc(hx + 4 + k * (hw - 8) / 3, hz - 1.5, 2, 0, TAU); c.fill(); }
      // Windmühle mit Holzflügeln
      const wx = W * 0.75, wy = hz, wh = H * 0.24;
      const wgr = c.createLinearGradient(wx - 12, 0, wx + 12, 0); wgr.addColorStop(0, '#d8cbad'); wgr.addColorStop(0.5, '#f2e8d0'); wgr.addColorStop(1, '#c4b694'); c.fillStyle = wgr; c.beginPath(); c.moveTo(wx - 13, wy); c.lineTo(wx - 7, wy - wh); c.lineTo(wx + 7, wy - wh); c.lineTo(wx + 13, wy); c.fill();
      c.fillStyle = '#6b4423'; rr(c, wx - 3, wy - 10, 6, 10, 3); c.fill(); c.fillStyle = '#4a6a8a'; c.fillRect(wx - 2, wy - wh * 0.6, 4, 5);
      c.fillStyle = '#7a4a2a'; c.beginPath(); c.moveTo(wx - 10, wy - wh); c.quadraticCurveTo(wx, wy - wh - 16, wx + 10, wy - wh); c.fill();
      c.save(); c.translate(wx, wy - wh + 2); c.rotate(t * 0.8); c.lineWidth = 1;
      for (let k = 0; k < 4; k++) { c.rotate(TAU / 4); c.fillStyle = '#8a5a2b'; c.fillRect(0, -1, wh * 0.6, 2); c.fillStyle = 'rgba(244,239,224,0.95)'; c.fillRect(6, -1, wh * 0.52, 7); c.strokeStyle = '#8a5a2b'; for (let q = 1; q < 5; q++) { c.beginPath(); c.moveTo(6 + q * wh * 0.104, -1); c.lineTo(6 + q * wh * 0.104, 6); c.stroke(); } }
      c.fillStyle = '#5a3a1f'; c.beginPath(); c.arc(0, 0, 3.5, 0, TAU); c.fill(); c.restore();
      // Kuh auf der Weide und Hühner
      cow(W * 0.9, hz + 1, t); cow(W * 0.62, hz - 1, t + 1.3);
      for (let k = 0; k < 3; k++) hen(W * (0.42 + k * 0.035) + Math.sin(t * 0.6 + k) * 4, hz + 1, t, k);
      // Zaun mit Pfosten
      const fy = H * 0.355;
      c.strokeStyle = '#a0703c'; c.lineWidth = 2.5; c.beginPath(); c.moveTo(0, fy); c.lineTo(W, fy); c.moveTo(0, fy - 7); c.lineTo(W, fy - 7); c.stroke();
      for (let x = 6; x < W; x += 24) { c.fillStyle = '#8a5a2b'; rr(c, x, fy - 13, 4, 16, 1.5); c.fill(); c.fillStyle = 'rgba(255,255,255,0.15)'; c.fillRect(x, fy - 13, 1.5, 16); }
      // Blumen am Zaun
      for (let k = 0; k < 14; k++) { const x = hsh(k * 3 + 1) * W, y = fy + 2 + hsh(k * 5) * 3; c.fillStyle = '#4f8a3a'; c.fillRect(x, y - 4, 1, 4); c.fillStyle = ['#ffd23f', '#ff8ab0', '#fff', '#b58cff'][k % 4]; c.beginPath(); c.arc(x + 0.5, y - 5, 1.8, 0, TAU); c.fill(); }
    }

    // ---------- Pflanzen ----------
    function plant(id, x, y, s, t, k) {
      c.save(); c.translate(x, y); c.scale(s, s); const sway = Math.sin(t * 2 + k) * 0.06; c.rotate(sway);
      if (id === 'weizen' || id === 'gold') {
        const col = id === 'gold' ? '#ffd23f' : '#e2b64a';
        c.strokeStyle = id === 'gold' ? '#d9a93a' : '#9aa84a'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -16); c.stroke();
        c.fillStyle = col; for (let q = 0; q < 4; q++) { c.beginPath(); c.ellipse(-1.8, -14 - q * 3, 1.6, 2.4, -0.5, 0, TAU); c.fill(); c.beginPath(); c.ellipse(1.8, -15 - q * 3, 1.6, 2.4, 0.5, 0, TAU); c.fill(); }
        if (id === 'gold') { const tw = Math.sin(t * 5 + k * 2); if (tw > 0.4) { c.fillStyle = `rgba(255,255,255,${tw})`; c.fillRect(-4, -24, 8, 1); c.fillRect(-0.5, -28, 1, 8); } }
      } else if (id === 'mais') {
        c.strokeStyle = '#4f8a3a'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -24); c.stroke();
        c.fillStyle = '#5ea83a'; c.beginPath(); c.moveTo(0, -10); c.quadraticCurveTo(-9, -14, -11, -6); c.quadraticCurveTo(-6, -10, 0, -8); c.fill(); c.beginPath(); c.moveTo(0, -16); c.quadraticCurveTo(9, -20, 11, -12); c.quadraticCurveTo(6, -16, 0, -14); c.fill();
        c.fillStyle = '#f2c14e'; c.beginPath(); c.ellipse(2.5, -15, 2.2, 4.5, 0.3, 0, TAU); c.fill();
        c.strokeStyle = '#c9a46a'; c.lineWidth = 1; c.beginPath(); c.moveTo(0, -24); c.lineTo(-2, -28); c.moveTo(0, -24); c.lineTo(2, -28); c.stroke();
      } else if (id === 'kuerbis') {
        c.strokeStyle = '#4f8a3a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(-8, 0); c.quadraticCurveTo(0, -4, 8, 0); c.stroke();
        c.fillStyle = '#5ea83a'; c.beginPath(); c.ellipse(-6, -3, 3.5, 2.2, -0.4, 0, TAU); c.fill();
        c.fillStyle = '#e8792a'; c.beginPath(); c.ellipse(1, -5, 7, 5.5, 0, 0, TAU); c.fill(); c.strokeStyle = '#b8531a'; c.lineWidth = 1; c.beginPath(); c.ellipse(1, -5, 3, 5.5, 0, 0, TAU); c.stroke();
        c.fillStyle = '#4f6a2a'; c.fillRect(0, -12, 2, 3);
      } else if (id === 'blume') {
        c.strokeStyle = '#4f8a3a'; c.lineWidth = 1.8; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -22); c.stroke();
        c.fillStyle = '#5ea83a'; c.beginPath(); c.ellipse(-4, -9, 4, 2, -0.5, 0, TAU); c.fill();
        c.fillStyle = '#ffd23f'; for (let q = 0; q < 10; q++) { const a = q / 10 * TAU; c.beginPath(); c.ellipse(Math.cos(a) * 5, -24 + Math.sin(a) * 5, 2.6, 1.3, a, 0, TAU); c.fill(); }
        c.fillStyle = '#6b4423'; c.beginPath(); c.arc(0, -24, 3.6, 0, TAU); c.fill();
      }
      c.restore();
    }
    function sprout(x, y, s) { c.save(); c.translate(x, y); c.scale(s, s); c.strokeStyle = '#4f8a3a'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(0, -7); c.stroke(); c.fillStyle = '#6cc04a'; c.beginPath(); c.ellipse(-3, -7, 3, 1.6, -0.4, 0, TAU); c.fill(); c.beginPath(); c.ellipse(3, -8, 3, 1.6, 0.4, 0, TAU); c.fill(); c.restore(); }

    function drawPlot(i, p, f, t, J, st) {
      const b = slot(i);
      if (!p) { // noch kein Beet
        if (i === f.plots.length && i < NP) { // nächstes kaufbares Beet
          const lockAge = J.plotAge(i), lock = st.age < lockAge;
          c.strokeStyle = lock ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.75)'; c.lineWidth = 2; c.setLineDash([5, 4]); rr(c, b.x, b.y, b.w, b.h, 8); c.stroke(); c.setLineDash([]);
          c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = '700 18px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(lock ? '🔒' : '+', b.x + b.w / 2, b.y + b.h / 2 - 6);
          c.font = '600 9px Fredoka, system-ui, sans-serif'; c.fillText(lock ? 'ab ' + J.AGES[lockAge].name : 'Neues Beet', b.x + b.w / 2, b.y + b.h / 2 + 10);
        } else { c.fillStyle = 'rgba(80,120,40,0.35)'; rr(c, b.x, b.y, b.w, b.h, 8); c.fill(); for (let k = 0; k < 5; k++) { c.fillStyle = '#6aa040'; const gx = b.x + hsh(i * 9 + k) * b.w, gy = b.y + hsh(i * 7 + k) * b.h; c.fillRect(gx, gy, 1.5, 4); c.fillRect(gx + 3, gy + 1, 1.5, 3); } }
        return;
      }
      const wet = p.st === 'grow' || p.st === 'ripe';
      c.fillStyle = wet ? '#5a3a22' : '#8a6038'; rr(c, b.x, b.y, b.w, b.h, 8); c.fill();
      c.strokeStyle = wet ? 'rgba(30,15,5,0.45)' : 'rgba(60,35,15,0.4)'; c.lineWidth = 2; for (let r = 1; r < 4; r++) { const yy = b.y + b.h * r / 4; c.beginPath(); c.moveTo(b.x + 6, yy); c.lineTo(b.x + b.w - 6, yy); c.stroke(); }
      c.strokeStyle = 'rgba(255,230,190,0.25)'; c.lineWidth = 1; rr(c, b.x + 1, b.y + 1, b.w - 2, b.h - 2, 7); c.stroke();
      const cols = 3, rows = 2, sc = Math.min(1.1, b.h / 40, b.w / 50);
      const at = (q, fn) => { const cx = b.x + b.w * (q % cols + 0.5) / cols, cy = b.y + b.h * (Math.floor(q / cols) + 0.85) / rows; fn(cx, cy); };
      if (p.st === 'dry') { // gesät, braucht Wasser
        for (let q = 0; q < 6; q++) at(q, (x, y) => { c.fillStyle = '#e8d2a0'; c.beginPath(); c.arc(x, y - 3, 1.6, 0, TAU); c.fill(); });
        const bob = Math.sin(t * 4 + i) * 2; c.fillStyle = 'rgba(255,255,255,0.9)'; rr(c, b.x + b.w / 2 - 11, b.y + 2 + bob, 22, 18, 7); c.fill();
        c.fillStyle = '#4bb8ff'; c.beginPath(); c.moveTo(b.x + b.w / 2, b.y + 5 + bob); c.quadraticCurveTo(b.x + b.w / 2 + 6, b.y + 13 + bob, b.x + b.w / 2, b.y + 17 + bob); c.quadraticCurveTo(b.x + b.w / 2 - 6, b.y + 13 + bob, b.x + b.w / 2, b.y + 5 + bob); c.fill();
      } else if (p.st === 'grow') {
        const cr = J.cropOf(p.crop), k = Math.min(1, p.t / cr.time);
        for (let q = 0; q < 6; q++) at(q, (x, y) => { if (k < 0.45) sprout(x, y, sc * (0.5 + k)); else plant(p.crop, x, y, sc * (0.35 + 0.55 * k), t, q + i); });
        // Fortschrittsbalken
        c.fillStyle = 'rgba(0,0,0,0.45)'; rr(c, b.x + 6, b.y + 4, b.w - 12, 5, 2.5); c.fill(); c.fillStyle = '#5ee07a'; rr(c, b.x + 6, b.y + 4, Math.max(2, (b.w - 12) * k), 5, 2.5); c.fill();
      } else if (p.st === 'ripe') {
        for (let q = 0; q < 6; q++) at(q, (x, y) => plant(p.crop, x, y, sc, t, q + i));
        const pr = 0.6 + 0.4 * Math.sin(t * 5 + i); c.strokeStyle = `rgba(255,230,120,${pr})`; c.lineWidth = 2; rr(c, b.x - 1, b.y - 1, b.w + 2, b.h + 2, 9); c.stroke();
        c.fillStyle = '#fff'; c.font = '700 11px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'top'; c.lineWidth = 3; c.strokeStyle = 'rgba(60,40,10,0.7)'; c.strokeText('Ernten!', b.x + b.w / 2, b.y + 3); c.fillText('Ernten!', b.x + b.w / 2, b.y + 3);
      }
    }

    // ---------- Bauer: Strohhut, kariertes Hemd, Latzhose, Stiefel. Klare Bewegungen je Handgriff ----------
    const ACT_T = 0.95;
    function limb(x1, y1, x2, y2, w, col) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); }
    function arm(sx, sy, an1, an2, col) { // Schulter -> Ellbogen -> Hand; gibt Handposition zurück
      const ex = sx + Math.cos(an1) * 7, ey = sy + Math.sin(an1) * 7, hx = ex + Math.cos(an2) * 7, hy = ey + Math.sin(an2) * 7;
      limb(sx, sy, ex, ey, 4, col); limb(ex, ey, hx, hy, 3.6, col); c.fillStyle = '#f0c79a'; c.beginPath(); c.arc(hx, hy, 2.1, 0, TAU); c.fill(); return [hx, hy];
    }
    function drawFarmer(t) {
      const x = farmer.x * W, y = farmer.y * H, a = farmer.act, p = a ? Math.max(0, Math.min(1, farmer.at / ACT_T)) : 0;
      const moving = Math.hypot(farmer.tx - farmer.x, farmer.ty - farmer.y) > 0.008;
      const S = Math.max(1, Math.min(1.45, H / 230));
      c.save(); c.translate(x, y); c.scale(farmer.face * S, S);
      c.fillStyle = 'rgba(0,0,0,0.22)'; c.beginPath(); c.ellipse(0, 0, 11, 3, 0, 0, TAU); c.fill();
      // Körperhaltung je Handgriff: bend = vorbeugen (rad), squat = in die Knie
      let bend = 0, squat = 0;
      const sw = Math.sin(p * Math.PI);
      if (a === 'sow') { bend = 0.25 * sw; }
      else if (a === 'water') { bend = 0.18 * sw; }
      else if (a === 'harvest') { bend = p < 0.55 ? 0.35 * Math.sin(p / 0.55 * Math.PI / 2) : 0.35 * (1 - (p - 0.55) / 0.45); squat = 3 * sw; }
      else if (a === 'tend') { bend = 0.2 + 0.12 * Math.abs(Math.sin(p * Math.PI * 3)); }
      const st = moving ? Math.sin(t * 14) * 3.5 : 0, bob = moving ? Math.abs(Math.sin(t * 14)) * 1.2 : 0;
      // Beine (Latzhose) und Stiefel
      const hipY = -15 + squat;
      limb(-2, hipY, -3 - st, -2, 4.6, '#3f5a8a'); limb(2, hipY, 3 + st, -2, 4.6, '#35507d');
      c.fillStyle = '#5a3a1f'; rr(c, -6 - st, -3, 6.5, 3.5, 1.5); c.fill(); rr(c, 0.5 + st, -3, 6.5, 3.5, 1.5); c.fill();
      c.save(); c.translate(0, hipY - bob); c.rotate(bend);
      // Rumpf: kariertes Hemd, Latz mit Knöpfen
      c.fillStyle = '#c0392b'; rr(c, -7, -17, 14, 18, 4); c.fill();
      c.strokeStyle = 'rgba(80,10,10,0.45)'; c.lineWidth = 1; for (let k = -5; k <= 5; k += 3.4) { c.beginPath(); c.moveTo(k, -17); c.lineTo(k, 1); c.stroke(); } for (let k = -14; k <= 0; k += 3.4) { c.beginPath(); c.moveTo(-7, k); c.lineTo(7, k); c.stroke(); }
      c.fillStyle = '#3f5a8a'; rr(c, -6, -9, 12, 10, 2); c.fill(); c.fillRect(-5, -17, 2.2, 9); c.fillRect(2.8, -17, 2.2, 9);
      c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(-3.9, -9, 1, 0, TAU); c.arc(3.9, -9, 1, 0, TAU); c.fill(); c.fillStyle = '#35507d'; rr(c, -3, -6, 6, 4, 1); c.fill();
      // Kopf: Gesicht mit Bart, Nase, Auge
      c.fillStyle = '#f0c79a'; c.fillRect(-2, -20, 4, 4); c.beginPath(); c.arc(0.5, -24, 6.5, 0, TAU); c.fill();
      c.fillStyle = '#e0a878'; c.beginPath(); c.arc(6.2, -23, 1.6, 0, TAU); c.fill();
      c.fillStyle = '#8a5a2b'; c.beginPath(); c.moveTo(-3, -21); c.quadraticCurveTo(1, -15.5, 6, -20); c.quadraticCurveTo(2, -19, -3, -21); c.fill();
      c.fillStyle = '#222'; c.beginPath(); c.arc(3.5, -25, 1, 0, TAU); c.fill(); c.strokeStyle = '#6b4423'; c.lineWidth = 0.9; c.beginPath(); c.moveTo(2, -27.3); c.lineTo(5, -27.6); c.stroke();
      // Strohhut mit Band und Flechtmuster
      c.fillStyle = '#e8cf7a'; c.beginPath(); c.ellipse(0.5, -29, 12, 3, -0.05, 0, TAU); c.fill(); c.beginPath(); c.arc(0.5, -30, 6.3, Math.PI, 0); c.fill();
      c.fillStyle = '#c0392b'; c.fillRect(-5.8, -31.2, 12.6, 1.8); c.strokeStyle = 'rgba(150,110,40,0.5)'; c.lineWidth = 0.7; for (let k = -9; k <= 10; k += 3) { c.beginPath(); c.moveTo(k, -30); c.lineTo(k + 1.5, -28); c.stroke(); }
      // Arme und Werkzeug je Handgriff
      const skin = '#c0392b';
      if (a === 'sow') {
        // Saatbeutel umgehängt; Hand greift hinein (p<0.4), dann weiter Wurf nach vorn
        c.fillStyle = '#c9a46a'; rr(c, -9, -8, 8, 9, 2.5); c.fill(); c.strokeStyle = '#8a6a3a'; c.lineWidth = 1; c.beginPath(); c.moveTo(-6, -8); c.lineTo(4, -16); c.stroke();
        const k = p < 0.4 ? p / 0.4 : 1, q = p < 0.4 ? 0 : (p - 0.4) / 0.6;
        const a1 = p < 0.4 ? 1.9 + 0.5 * k : 2.4 - 3.0 * Math.sin(q * Math.PI / 2), a2 = p < 0.4 ? 2.2 : 2.6 - 3.0 * Math.sin(q * Math.PI / 2);
        arm(4, -15, a1, a2, skin); arm(-4, -15, 1.9, 1.6, skin);
      } else if (a === 'water') {
        // Gießkanne mit beiden Händen, wird gekippt, Wasserstrahl
        const tilt = 0.85 * Math.min(1, p * 2.5) * (p > 0.85 ? (1 - p) / 0.15 : 1);
        const [hx, hy] = arm(4, -15, 0.5, 0.3, skin); arm(-4, -15, 0.6, 0.1, skin);
        c.save(); c.translate(hx + 2, hy); c.rotate(tilt);
        c.fillStyle = '#5d8fb5'; rr(c, -3, -6, 13, 10, 3); c.fill(); c.fillStyle = 'rgba(255,255,255,0.3)'; c.fillRect(-1, -5, 2, 8);
        c.strokeStyle = '#5d8fb5'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(10, -2); c.lineTo(19, -9); c.stroke(); c.beginPath(); c.arc(3, -7, 4.5, Math.PI, 0); c.stroke();
        c.fillStyle = '#4a7a9a'; c.beginPath(); c.arc(19.5, -9.5, 2.2, 0, TAU); c.fill(); c.restore();
        if (tilt > 0.45) { const ox = hx + 2 + Math.cos(tilt) * 19.5 + Math.sin(tilt) * 9.5, oy = hy + Math.sin(tilt) * 19.5 - Math.cos(tilt) * 9.5; c.fillStyle = '#7fc8ff'; for (let k = 0; k < 9; k++) { const s2 = ((t * 3 + k / 9) % 1); c.globalAlpha = 0.9 - s2 * 0.4; c.beginPath(); c.arc(ox + s2 * 6 + Math.sin(k * 3) * 1.5, oy + s2 * s2 * 26, 1.3, 0, TAU); c.fill(); } c.globalAlpha = 1; }
      } else if (a === 'harvest') {
        // Sense: weit ausholen, kräftig durchziehen, dann Garbe hochheben
        if (p < 0.7) {
          const q = p / 0.7, sw2 = q < 0.35 ? -2.4 - 0.4 * (q / 0.35) : -2.8 + 3.6 * Math.sin((q - 0.35) / 0.65 * Math.PI / 2);
          const [hx, hy] = arm(4, -15, sw2 + 0.3, sw2, skin); arm(-4, -15, sw2 + 0.6, sw2 + 0.2, skin);
          c.save(); c.translate(hx, hy); c.rotate(sw2 + 0.3); c.strokeStyle = '#8a5a2b'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-8, 0); c.lineTo(16, 0); c.stroke();
          c.fillStyle = '#d8dee8'; c.beginPath(); c.moveTo(16, 0); c.quadraticCurveTo(22, 10, 14, 18); c.quadraticCurveTo(17, 9, 14, 1); c.fill(); c.strokeStyle = '#8a929c'; c.lineWidth = 0.8; c.stroke(); c.restore();
          if (q > 0.45 && q < 0.8) { c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = 2; c.beginPath(); c.arc(4, -8, 22, -0.4, 1.2); c.stroke(); }
        } else {
          const q = (p - 0.7) / 0.3, up = Math.sin(q * Math.PI / 2);
          const [hx, hy] = arm(4, -15, -1.2 - 0.4 * up, -1.5 - 0.3 * up, skin); arm(-4, -15, -1.4 - 0.4 * up, -1.6, skin);
          c.fillStyle = farmer.crop === 'kuerbis' ? '#e8792a' : farmer.crop === 'mais' ? '#f2c14e' : farmer.crop === 'blume' ? '#ffd23f' : farmer.crop === 'gold' ? '#ffd23f' : '#e2b64a';
          if (farmer.crop === 'kuerbis') { c.beginPath(); c.ellipse(hx, hy - 4, 6, 5, 0, 0, TAU); c.fill(); }
          else { for (let k = -2; k <= 2; k++) { c.save(); c.translate(hx, hy); c.rotate(k * 0.15); c.fillRect(-0.8, -14, 1.6, 14); c.beginPath(); c.ellipse(0, -15, 2, 4, 0, 0, TAU); c.fill(); c.restore(); } c.fillStyle = '#c0392b'; c.fillRect(hx - 3, hy - 4, 6, 2); }
        }
      } else if (a === 'tend') {
        // Hacke: dreimal hoch und runter
        const ph = Math.abs(Math.sin(p * Math.PI * 3)), an = -1.9 + 1.7 * (1 - ph);
        const [hx, hy] = arm(4, -15, an + 0.5, an, skin); arm(-4, -15, an + 0.7, an + 0.2, skin);
        c.save(); c.translate(hx, hy); c.rotate(an + 0.4); c.strokeStyle = '#8a5a2b'; c.lineWidth = 2.2; c.beginPath(); c.moveTo(-6, 0); c.lineTo(18, 0); c.stroke(); c.fillStyle = '#8a929c'; c.fillRect(16, -1, 3, 8); c.restore();
      } else {
        // Ruhe / Laufen: Arme schwingen, Hand an der Hüfte
        const as = moving ? Math.sin(t * 14) * 0.5 : Math.sin(t * 2) * 0.05;
        arm(4, -15, 1.45 + as, 1.6 + as, skin); arm(-4, -15, 1.7 - as, 1.6 - as, skin);
      }
      c.restore(); c.restore();
    }
    // ---------- Bots: kleine schwebende Roboter mit Propeller ----------
    function drawBot(id, b, t) {
      const x = b.x * W, y = b.y * H + Math.sin(t * 3 + b.ph) * 2, col = BOT_COL[id];
      c.save(); c.translate(x, y);
      c.fillStyle = 'rgba(0,0,0,0.18)'; c.beginPath(); c.ellipse(0, 14, 7, 2, 0, 0, TAU); c.fill();
      c.strokeStyle = '#555'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(0, -9); c.lineTo(0, -12); c.stroke();
      c.strokeStyle = '#333'; c.lineWidth = 2; const pw = 7 * Math.abs(Math.cos(t * 25)); c.beginPath(); c.moveTo(-pw, -12); c.lineTo(pw, -12); c.stroke();
      c.fillStyle = col; rr(c, -8, -9, 16, 13, 5); c.fill(); c.fillStyle = '#1b2430'; rr(c, -5, -6, 10, 5, 2); c.fill();
      c.fillStyle = '#7ff6ff'; c.fillRect(-3, -5, 2, 2); c.fillRect(1, -5, 2, 2);
      if (id === 'giess' && b.work > 0) { c.fillStyle = '#4bb8ff'; for (let k = 0; k < 3; k++) { c.beginPath(); c.arc(-3 + k * 3, 8 + ((t * 40 + k * 4) % 10), 1.2, 0, TAU); c.fill(); } }
      if (id === 'markt') { c.fillStyle = '#c99a2e'; c.beginPath(); c.arc(0, 7, 3, 0, TAU); c.fill(); }
      c.restore();
    }

    // Auslöser von außen
    function act(i, a, crop, name) {
      const b = slot(i); farmer.tx = (b.x + b.w * 0.18) / W; farmer.ty = (b.y + b.h * 0.95) / H; farmer.act = a; farmer.at = -0.12; farmer.crop = crop; farmer.face = 1;
      fx(i, a, crop, name);
    }
    function fx(i, a, crop, botTxt) {
      const b = slot(i), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      if (a === 'water') for (let k = 0; k < 14; k++) parts.push({ x: cx + (Math.random() - 0.5) * b.w * 0.6, y: b.y - 4, vx: (Math.random() - 0.5) * 20, vy: 60 + Math.random() * 60, r: 1.6, life: 0.5, col: '#4bb8ff' });
      if (a === 'sow') for (let k = 0; k < 10; k++) parts.push({ x: cx, y: cy - 10, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 40, g: 300, r: 1.5, life: 0.6, col: '#e8d2a0' });
      if (a === 'tend') { for (let k = 0; k < 8; k++) parts.push({ x: cx + (Math.random() - 0.5) * b.w * 0.5, y: b.y + b.h * 0.8, vx: (Math.random() - 0.5) * 60, vy: -40 - Math.random() * 50, g: 260, r: 1.6, life: 0.5, col: '#6a4428' }); parts.push({ x: cx, y: b.y + 6, vx: 0, vy: -20, r: 0, life: 0.01, col: '#000' }); texts.push({ x: cx, y: b.y + 4, text: '+Wachstum', life: 0.9, col: '#b6ff9a' }); }
      if (a === 'harvest') { for (let k = 0; k < 12; k++) parts.push({ x: cx, y: cy, vx: (Math.random() - 0.5) * 140, vy: -80 - Math.random() * 80, g: 300, r: 2, life: 0.8, col: crop === 'kuerbis' ? '#e8792a' : crop === 'mais' ? '#f2c14e' : crop === 'blume' ? '#ffd23f' : '#e2b64a' }); texts.push({ x: cx, y: cy - 10, text: '+1 ' + botTxt, life: 1.2, col: '#fff3b0' }); }
    }
    function botAct(id, i, a, crop, name) {
      const b = bots[id]; if (!b) return;
      if (i >= 0) { const s = slot(i); b.tx = (s.x + s.w / 2) / W; b.ty = (s.y + s.h * 0.2) / H; b.work = 0.6; fx(i, a, crop, name); }
    }
    function money(text) { texts.push({ x: W * 0.32 + 15, y: H * 0.2, text, life: 1.6, col: '#ffd23f' }); for (let k = 0; k < 10; k++) parts.push({ x: W * 0.32 + 15, y: H * 0.26, vx: (Math.random() - 0.5) * 80, vy: -60 - Math.random() * 60, g: 260, r: 2.4, life: 0.9, col: '#ffd23f' }); }

    function draw(st, t, dt, J) {
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      const f = st.farm;
      scene(t);
      const order = []; for (let i = 0; i < NP; i++) order.push(i);
      order.forEach(i => drawPlot(i, f.plots[i], f, t, J, st));
      // Bauer bewegt sich zum Beet
      farmer.x += (farmer.tx - farmer.x) * Math.min(1, dt * 7); farmer.y += (farmer.ty - farmer.y) * Math.min(1, dt * 7);
      if (farmer.act) { farmer.at += dt; if (farmer.at > ACT_T) farmer.act = null; }
      // Bots
      J.BOTS.forEach((bd, k) => {
        if (!f.bots[bd.id]) { delete bots[bd.id]; return; }
        const home = bd.id === 'markt' ? [0.32 + 0.045, 0.2] : bd.id === 'saat' ? [0.32 - 0.03, 0.2] : [0.45 + k * 0.08, 0.16];
        const b = bots[bd.id] || (bots[bd.id] = { x: home[0], y: home[1], tx: home[0], ty: home[1], ph: k * 2, work: 0 });
        if (b.work > 0) b.work -= dt; else { b.tx = home[0]; b.ty = home[1]; }
        b.x += (b.tx - b.x) * Math.min(1, dt * 4); b.y += (b.ty - b.y) * Math.min(1, dt * 4);
        drawBot(bd.id, b, t);
      });
      drawFarmer(t);
      parts.forEach(p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += (p.g || 0) * dt; p.life -= dt; c.globalAlpha = Math.max(0, Math.min(1, p.life * 2)); c.fillStyle = p.col; c.beginPath(); c.arc(p.x, p.y, p.r, 0, TAU); c.fill(); });
      parts = parts.filter(p => p.life > 0);
      c.textAlign = 'center'; c.textBaseline = 'middle';
      texts.forEach(tx => { tx.y -= 24 * dt; tx.life -= dt; c.globalAlpha = Math.max(0, Math.min(1, tx.life * 2)); c.font = '700 14px Fredoka, system-ui, sans-serif'; c.lineWidth = 4; c.strokeStyle = 'rgba(0,0,0,0.5)'; c.strokeText(tx.text, tx.x, tx.y); c.fillStyle = tx.col; c.fillText(tx.text, tx.x, tx.y); });
      texts = texts.filter(tx => tx.life > 0); c.globalAlpha = 1;
    }
    return { resize, draw, slotAt, act, botAct, money, fx };
  }
  root.makeFarmRenderer = makeFarmRenderer;
})(window);
