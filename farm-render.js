// Epochenschuss – Farm-Welt (Canvas 2D): Hof mit Scheune und Windmühle, Beete, Bauer und Bots
(function (root) {
  'use strict';
  const TAU = Math.PI * 2;
  function rr(c, x, y, w, h, r) { c.beginPath(); c.roundRect ? c.roundRect(x, y, w, h, r) : c.rect(x, y, w, h); }
  const hsh = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const BOT_COL = { saer: '#5ee07a', giess: '#4bb8ff', ernte: '#ff8a3d', markt: '#ffd23f' };

  function makeFarmRenderer(canvas) {
    const c = canvas.getContext('2d');
    let W = 1, H = 1, dpr = 1;
    const farmer = { x: 0.5, y: 0.3, tx: 0.5, ty: 0.3, act: null, at: 0, face: 1 };
    const bots = {}; let parts = [], texts = [];

    function resize() {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2.5, window.devicePixelRatio || 1);
      W = Math.max(1, r.width); H = Math.max(1, r.height);
      canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    }
    // Beet-Raster: 4 Spalten × 3 Reihen
    function field() { const top = H * 0.38, fx = W * 0.05, fw = W * 0.9, fh = H - top - 8; return { fx, top, fw, fh, cw: fw / 4, ch: fh / 3 }; }
    function slot(i) { const f = field(), col = i % 4, row = Math.floor(i / 4); return { x: f.fx + col * f.cw + 4, y: f.top + row * f.ch + 4, w: f.cw - 8, h: f.ch - 8 }; }
    function slotAt(px, py) { for (let i = 0; i < 12; i++) { const b = slot(i); if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) return i; } return -1; }

    // ---------- Hintergrund ----------
    function scene(t) {
      const g = c.createLinearGradient(0, 0, 0, H * 0.4); g.addColorStop(0, '#8fd0f5'); g.addColorStop(1, '#e6f6d4');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = '#fff6c0'; c.beginPath(); c.arc(W * 0.86, H * 0.1, Math.min(W, H) * 0.06, 0, TAU); c.fill();
      c.fillStyle = 'rgba(255,255,255,0.8)'; for (let k = 0; k < 3; k++) { const x = ((t * 6 + k * 170) % (W + 120)) - 60, y = H * (0.07 + k * 0.05), s = 12 + k * 3; c.beginPath(); c.arc(x, y, s, 0, TAU); c.arc(x + s, y + 3, s * 0.8, 0, TAU); c.arc(x - s, y + 4, s * 0.7, 0, TAU); c.fill(); }
      // Hügel
      c.fillStyle = '#9cc96a'; c.beginPath(); c.moveTo(0, H * 0.33); for (let x = 0; x <= W; x += 10) c.lineTo(x, H * 0.27 + Math.sin(x * 0.012) * H * 0.04); c.lineTo(W, H); c.lineTo(0, H); c.fill();
      c.fillStyle = '#7fb24f'; c.fillRect(0, H * 0.33, W, H);
      // Scheune
      const bx = W * 0.07, by = H * 0.33, bw = Math.min(90, W * 0.2), bh = H * 0.2;
      c.fillStyle = '#b8402f'; c.fillRect(bx, by - bh, bw, bh); c.fillStyle = '#7a2a1f'; c.beginPath(); c.moveTo(bx - 6, by - bh); c.lineTo(bx + bw / 2, by - bh - bh * 0.55); c.lineTo(bx + bw + 6, by - bh); c.fill();
      c.fillStyle = '#f4efe0'; c.fillRect(bx + bw * 0.3, by - bh * 0.62, bw * 0.4, bh * 0.62); c.strokeStyle = '#b8402f'; c.lineWidth = 2; c.beginPath(); c.moveTo(bx + bw * 0.3, by - bh * 0.62); c.lineTo(bx + bw * 0.7, by); c.moveTo(bx + bw * 0.7, by - bh * 0.62); c.lineTo(bx + bw * 0.3, by); c.stroke();
      c.fillStyle = '#f4efe0'; c.beginPath(); c.arc(bx + bw / 2, by - bh - bh * 0.22, 4, 0, TAU); c.fill();
      // Marktstand des Händler-Bots
      const mx = W * 0.32, my = H * 0.33; c.fillStyle = '#8a5a2b'; c.fillRect(mx, my - 18, 3, 18); c.fillRect(mx + 30, my - 18, 3, 18); c.fillRect(mx - 2, my - 9, 37, 5);
      for (let k = 0; k < 5; k++) { c.fillStyle = k % 2 ? '#fff' : '#e2473b'; c.fillRect(mx - 3 + k * 8, my - 24, 8, 7); }
      // Windmühle
      const wx = W * 0.72, wy = H * 0.33, wh = H * 0.24;
      c.fillStyle = '#e8dcc0'; c.beginPath(); c.moveTo(wx - 12, wy); c.lineTo(wx - 7, wy - wh); c.lineTo(wx + 7, wy - wh); c.lineTo(wx + 12, wy); c.fill();
      c.fillStyle = '#7a4a2a'; c.beginPath(); c.moveTo(wx - 10, wy - wh); c.lineTo(wx, wy - wh - 10); c.lineTo(wx + 10, wy - wh); c.fill();
      c.save(); c.translate(wx, wy - wh + 2); c.rotate(t * 0.8); c.fillStyle = '#f4efe0'; c.strokeStyle = '#7a4a2a'; c.lineWidth = 1;
      for (let k = 0; k < 4; k++) { c.rotate(TAU / 4); c.fillRect(2, -3, wh * 0.55, 6); c.strokeRect(2, -3, wh * 0.55, 6); }
      c.fillStyle = '#5a3a1f'; c.beginPath(); c.arc(0, 0, 3, 0, TAU); c.fill(); c.restore();
      // Zaun
      c.strokeStyle = '#a0703c'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, H * 0.355); c.lineTo(W, H * 0.355); c.moveTo(0, H * 0.335); c.lineTo(W, H * 0.335); c.stroke();
      c.fillStyle = '#8a5a2b'; for (let x = 6; x < W; x += 22) c.fillRect(x, H * 0.32, 3, H * 0.05);
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

    function drawPlot(i, p, f, t, J) {
      const b = slot(i);
      if (!p) { // noch kein Beet
        if (i === f.plots.length && i < 12) { // nächstes kaufbares Beet
          c.strokeStyle = 'rgba(255,255,255,0.75)'; c.lineWidth = 2; c.setLineDash([5, 4]); rr(c, b.x, b.y, b.w, b.h, 8); c.stroke(); c.setLineDash([]);
          c.fillStyle = 'rgba(255,255,255,0.85)'; c.font = '700 22px Fredoka, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('+', b.x + b.w / 2, b.y + b.h / 2 - 6);
          c.font = '600 10px Fredoka, system-ui, sans-serif'; c.fillText('Neues Beet', b.x + b.w / 2, b.y + b.h / 2 + 12);
        } else { c.fillStyle = 'rgba(80,120,40,0.35)'; rr(c, b.x, b.y, b.w, b.h, 8); c.fill(); for (let k = 0; k < 5; k++) { c.fillStyle = '#6aa040'; const gx = b.x + hsh(i * 9 + k) * b.w, gy = b.y + hsh(i * 7 + k) * b.h; c.fillRect(gx, gy, 1.5, 4); c.fillRect(gx + 3, gy + 1, 1.5, 3); } }
        return;
      }
      const wet = p.st === 'grow' || p.st === 'ripe';
      c.fillStyle = wet ? '#5a3a22' : '#8a6038'; rr(c, b.x, b.y, b.w, b.h, 8); c.fill();
      c.strokeStyle = wet ? 'rgba(30,15,5,0.45)' : 'rgba(60,35,15,0.4)'; c.lineWidth = 2; for (let r = 1; r < 4; r++) { const yy = b.y + b.h * r / 4; c.beginPath(); c.moveTo(b.x + 6, yy); c.lineTo(b.x + b.w - 6, yy); c.stroke(); }
      c.strokeStyle = 'rgba(255,230,190,0.25)'; c.lineWidth = 1; rr(c, b.x + 1, b.y + 1, b.w - 2, b.h - 2, 7); c.stroke();
      const cols = 3, rows = 2, sc = Math.min(1.2, b.h / 38);
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

    // ---------- Bauer (mit Strohhut) ----------
    function drawFarmer(t) {
      const x = farmer.x * W, y = farmer.y * H, a = farmer.act, k = a ? Math.min(1, farmer.at / 0.55) : 0, sw = Math.sin(k * Math.PI);
      const moving = Math.hypot(farmer.tx - farmer.x, farmer.ty - farmer.y) > 0.01;
      c.save(); c.translate(x, y); c.scale(farmer.face, 1);
      c.fillStyle = 'rgba(0,0,0,0.2)'; c.beginPath(); c.ellipse(0, 0, 10, 3, 0, 0, TAU); c.fill();
      const st = moving ? Math.sin(t * 14) * 3 : 0;
      c.strokeStyle = '#3f5a8a'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(-2, -14); c.lineTo(-3 - st, -1); c.moveTo(2, -14); c.lineTo(3 + st, -1); c.stroke();
      c.fillStyle = '#c0392b'; rr(c, -7, -30, 14, 17, 4); c.fill(); c.fillStyle = '#3f5a8a'; c.fillRect(-6, -22, 12, 9); c.fillRect(-5, -30, 2, 9); c.fillRect(3, -30, 2, 9);
      c.fillStyle = '#f0c79a'; c.beginPath(); c.arc(0, -36, 6.5, 0, TAU); c.fill(); c.fillStyle = '#222'; c.beginPath(); c.arc(2.5, -37, 1, 0, TAU); c.fill();
      c.fillStyle = '#e8cf7a'; c.beginPath(); c.ellipse(0, -41, 11, 3, 0, 0, TAU); c.fill(); c.beginPath(); c.arc(0, -42, 6, Math.PI, 0); c.fill(); c.fillStyle = '#c0392b'; c.fillRect(-6, -43, 12, 1.6);
      // Arm mit Werkzeug je Handgriff
      c.strokeStyle = '#f0c79a'; c.lineWidth = 3.5;
      if (a === 'water') { // Gießkanne kippen, Wasser fließt
        const tilt = 0.9 * sw; c.beginPath(); c.moveTo(3, -26); c.lineTo(10, -20); c.stroke();
        c.save(); c.translate(12, -20); c.rotate(tilt); c.fillStyle = '#5d8fb5'; rr(c, -4, -5, 11, 9, 2); c.fill(); c.strokeStyle = '#5d8fb5'; c.lineWidth = 2; c.beginPath(); c.moveTo(7, -2); c.lineTo(14, -7); c.stroke(); c.beginPath(); c.arc(1, -6, 4, Math.PI, 0); c.stroke(); c.restore();
      } else if (a === 'harvest') { // Sichel schwingen
        const an = -1.6 + 2.4 * sw; c.beginPath(); c.moveTo(3, -26); c.lineTo(3 + Math.cos(an) * 9, -24 + Math.sin(an) * 9); c.stroke();
        c.save(); c.translate(3 + Math.cos(an) * 9, -24 + Math.sin(an) * 9); c.rotate(an); c.strokeStyle = '#6b4423'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(6, 0); c.stroke(); c.strokeStyle = '#c4ccd9'; c.lineWidth = 2; c.beginPath(); c.arc(9, -4, 5, 1.2, -1.6, true); c.stroke(); c.restore();
      } else if (a === 'sow') { // Saat werfen: Arm schwingt nach vorn
        const an = -2.2 + 2 * sw; c.beginPath(); c.moveTo(3, -26); c.lineTo(3 + Math.cos(an) * 10, -24 + Math.sin(an) * 10); c.stroke();
        c.fillStyle = '#c9a46a'; rr(c, -9, -24, 7, 8, 2); c.fill();
      } else { c.beginPath(); c.moveTo(3, -26); c.lineTo(8, -15); c.stroke(); }
      c.restore();
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
      const b = slot(i); farmer.tx = (b.x + b.w / 2 - 14) / W; farmer.ty = (b.y + b.h * 0.9) / H; farmer.act = a; farmer.at = 0; farmer.face = farmer.tx >= farmer.x ? 1 : -1;
      fx(i, a, crop, name);
    }
    function fx(i, a, crop, botTxt) {
      const b = slot(i), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      if (a === 'water') for (let k = 0; k < 14; k++) parts.push({ x: cx + (Math.random() - 0.5) * b.w * 0.6, y: b.y - 4, vx: (Math.random() - 0.5) * 20, vy: 60 + Math.random() * 60, r: 1.6, life: 0.5, col: '#4bb8ff' });
      if (a === 'sow') for (let k = 0; k < 10; k++) parts.push({ x: cx, y: cy - 10, vx: (Math.random() - 0.5) * 120, vy: -40 - Math.random() * 40, g: 300, r: 1.5, life: 0.6, col: '#e8d2a0' });
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
      const order = []; for (let i = 0; i < 12; i++) order.push(i);
      order.forEach(i => drawPlot(i, f.plots[i], f, t, J));
      // Bauer bewegt sich zum Beet
      farmer.x += (farmer.tx - farmer.x) * Math.min(1, dt * 7); farmer.y += (farmer.ty - farmer.y) * Math.min(1, dt * 7);
      if (farmer.act) { farmer.at += dt; if (farmer.at > 0.6) farmer.act = null; }
      // Bots
      J.BOTS.forEach((bd, k) => {
        if (!f.bots[bd.id]) { delete bots[bd.id]; return; }
        const home = bd.id === 'markt' ? [0.32 + 0.045, 0.2] : [0.45 + k * 0.08, 0.16];
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
