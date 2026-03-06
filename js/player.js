// ════════════════════════════════════════
//  player.js  —  player entity
//
//  KEY DESIGN:
//  • player.worldY is the player's Y position in WORLD space
//    (increases as the player falls)
//  • Fall speed is UNIFORM — no gravity acceleration.
//    parachute open  → FALL_SLOW  px/s
//    parachute closed → FALL_FAST  px/s
//    Rocket overrides both.
//  • player.x is horizontal screen position (clamped to screen).
//  • vx decays with friction each frame (drift control).
// ════════════════════════════════════════

const Player = (() => {

  // ── Constants ──────────────────────────────────────
  const FALL_SLOW  = 110;   // px/s with parachute open
  const FALL_FAST  = 380;   // px/s with parachute closed
  const FALL_ROCKET = 540;  // px/s during rocket
  const DRAG_X     = 5.0;   // horizontal friction coefficient

  // ── State ───────────────────────────────────────────
  let x       = 0;   // screen X
  let worldY  = 0;   // world Y (camera follows this)
  let vx      = 0;   // horizontal velocity
  let angle   = 0;   // tilt from drift

  // powerup flags
  let shield         = false;
  let rocketActive   = false; let rocketTimer    = 0;
  let destroyerActive= false; let destroyerTimer  = 0;
  let dashShield     = false; let dashTimer       = 0;

  let trail = [];

  function getCanvas() { return document.getElementById('gameCanvas'); }
  function W() { return getCanvas().width; }

  // ── Public API ──────────────────────────────────────

  function init() {
    x      = W() / 2;
    // Camera is already reset to 0, so player starts at screen Y = 28% of canvas
    worldY = getCanvas().height * 0.28;
    vx     = 0; angle = 0;
    shield = false;
    rocketActive = false; rocketTimer = 0;
    destroyerActive = false; destroyerTimer = 0;
    dashShield = false; dashTimer = 0;
    trail = [];
  }

  function addDrift(force) {
    vx += force;
  }

  function update(dt) {
    // ── Vertical (uniform speed) ─────────────────────
    let fallSpeed;
    if (rocketActive) {
      fallSpeed = FALL_ROCKET;
      rocketTimer -= dt;
      if (rocketTimer <= 0) { rocketActive = false; State.energyMode = false; }
    } else {
      fallSpeed = State.parachuteOpen ? FALL_SLOW : FALL_FAST;
    }
    worldY += fallSpeed * dt;

    // ── Horizontal (drift + friction) ────────────────
    vx *= Math.pow(1 - DRAG_X * dt, 2);
    x  += vx * dt;

    // Clamp horizontal to screen with soft bounce
    const margin = 18;
    if (x < margin)       { x = margin;       vx =  Math.abs(vx) * 0.2; }
    if (x > W() - margin) { x = W() - margin; vx = -Math.abs(vx) * 0.2; }

    // ── Tilt from horizontal velocity ────────────────
    angle = vx * 0.0018;

    // ── Trail ────────────────────────────────────────
    const screenY = Camera.toScreenY(worldY);
    trail.push({ x, y: screenY, life: 1 });
    if (trail.length > 24) trail.shift();
    trail.forEach(t => { t.life -= dt * 3.5; });

    // ── Powerup timers ───────────────────────────────
    if (destroyerActive) {
      destroyerTimer -= dt;
      if (destroyerTimer <= 0) { destroyerActive = false; }
    }
    if (dashShield) {
      dashTimer -= dt;
      if (dashTimer <= 0) { dashShield = false; State.energyMode = false; }
    }
  }

  // ── Powerup activation ─────────────────────────────
  function activateShield()    { shield = true; }
  function activateRocket(dur) { rocketActive = true; rocketTimer = dur; }
  function activateDestroyer(dur){ destroyerActive = true; destroyerTimer = dur; }
  function activateDash(dur)   { dashShield = true; dashTimer = dur; }

  function consumeShield() { shield = false; }
  function consumeDash()   { dashShield = false; State.energyMode = false; }

  // ── Drawing ─────────────────────────────────────────
  function draw(ctx) {
    const screenY = Camera.toScreenY(worldY);
    const energy  = State.energyMode;

    ctx.save();

    // Trail
    trail.forEach((t, i) => {
      if (t.life <= 0) return;
      const a = t.life * 0.3;
      const r = rocketActive ? 14 : dashShield ? 10 : 5;
      const col = rocketActive  ? `rgba(255,130,50,${a})`
                : dashShield    ? `rgba(0,230,255,${a})`
                : `rgba(200,230,255,${a * 0.5})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, r * (i / trail.length), 0, Math.PI * 2);
      ctx.fillStyle = col; ctx.fill();
    });

    ctx.translate(x, screenY);
    ctx.rotate(angle);

    // Destroyer aura
    if (destroyerActive) {
      const radius = Obstacles.getDestroyerRadius();
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      g.addColorStop(0,   'rgba(171,71,188,0.04)');
      g.addColorStop(0.65,'rgba(171,71,188,0.10)');
      g.addColorStop(1,   'rgba(171,71,188,0.00)');
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(171,71,188,0.45)';
      ctx.lineWidth = 1.5; ctx.stroke();
    }

    // Shield glow
    if (shield || dashShield) {
      const sc = dashShield ? 'rgba(0,230,255,' : 'rgba(79,195,247,';
      const g  = ctx.createRadialGradient(0, 0, 0, 0, 0, 34);
      g.addColorStop(0,   sc + '0.0)');
      g.addColorStop(0.55, sc + '0.10)');
      g.addColorStop(1,   sc + '0.45)');
      ctx.beginPath(); ctx.arc(0, 0, 32, 0, Math.PI * 2);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = sc + '0.85)';
      ctx.lineWidth = 2; ctx.stroke();
    }

    // Parachute
    if (State.parachuteOpen && !rocketActive) {
      ctx.save(); ctx.translate(0, -22);
      const cg = ctx.createRadialGradient(-2, -4, 2, 0, 0, 22);
      cg.addColorStop(0, energy ? '#ffda00' : '#c8e4f8');
      cg.addColorStop(1, energy ? '#ff6b35' : '#7ec8e3');
      ctx.beginPath();
      ctx.moveTo(-22, 6);
      ctx.bezierCurveTo(-22, -18, 22, -18, 22, 6);
      ctx.bezierCurveTo(14, -2, -14, -2, -22, 6);
      ctx.fillStyle = cg; ctx.fill();
      ctx.strokeStyle = energy ? 'rgba(255,140,50,0.55)' : 'rgba(100,170,230,0.5)';
      ctx.lineWidth = 1; ctx.stroke();
      // Strings
      [[-14, 6], [-6, 4], [6, 4], [14, 6]].forEach(([sx, sy]) => {
        ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(0, 20);
        ctx.strokeStyle = 'rgba(150,200,240,0.45)'; ctx.lineWidth = 0.8; ctx.stroke();
      });
      ctx.restore();
    }

    // Rocket flame
    if (rocketActive) {
      ctx.save(); ctx.translate(0, 22);
      const fl = 10 + Math.random() * 14;
      const fg = ctx.createLinearGradient(0, 0, 0, fl);
      fg.addColorStop(0,   'rgba(255,180,50,0.95)');
      fg.addColorStop(0.5, 'rgba(255,80,20,0.65)');
      fg.addColorStop(1,   'rgba(255,50,0,0)');
      ctx.beginPath();
      ctx.moveTo(-7, 0); ctx.lineTo(7, 0); ctx.lineTo(3, fl); ctx.lineTo(-3, fl);
      ctx.fillStyle = fg; ctx.fill();
      ctx.restore();
    }

    // Body
    const bg = ctx.createLinearGradient(-10, -14, 10, 14);
    if      (rocketActive) { bg.addColorStop(0, '#ff9060'); bg.addColorStop(1, '#ff4020'); }
    else if (dashShield)   { bg.addColorStop(0, '#00e5ff'); bg.addColorStop(1, '#0097a7'); }
    else                   { bg.addColorStop(0, '#e8f4ff'); bg.addColorStop(1, '#a8c8e8'); }
    ctx.beginPath(); ctx.ellipse(0, 2, 10, 14, 0, 0, Math.PI * 2);
    ctx.fillStyle = bg; ctx.fill();

    // Helmet
    ctx.beginPath(); ctx.arc(0, -12, 9, 0, Math.PI * 2);
    ctx.fillStyle = energy ? '#ff9060' : '#c8e0f8'; ctx.fill();
    ctx.strokeStyle = 'rgba(100,150,200,0.45)'; ctx.lineWidth = 1; ctx.stroke();

    // Visor
    ctx.beginPath(); ctx.ellipse(0, -12, 5, 3.5, 0, 0, Math.PI * 2);
    ctx.fillStyle = energy ? 'rgba(255,200,50,0.85)' : 'rgba(50,150,255,0.55)'; ctx.fill();

    ctx.restore();
  }

  // ── Getters ─────────────────────────────────────────
  function getX()        { return x; }
  function getWorldY()   { return worldY; }
  function getScreenY()  { return Camera.toScreenY(worldY); }
  function getVx()       { return vx; }
  function hasShield()   { return shield; }
  function hasRocket()   { return rocketActive; }
  function hasDestroyer(){ return destroyerActive; }
  function hasDash()     { return dashShield; }

  return {
    init, update, draw, addDrift,
    activateShield, activateRocket, activateDestroyer, activateDash,
    consumeShield, consumeDash,
    getX, getWorldY, getScreenY, getVx,
    hasShield, hasRocket, hasDestroyer, hasDash,
  };
})();
