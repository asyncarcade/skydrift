// ════════════════════════════════════════
//  renderer.js  —  background & draw pipeline
// ════════════════════════════════════════

const Renderer = (() => {

  // Cloud and star data (screen-relative, parallax with camera)
  const clouds = Array.from({ length: 6 }, () => ({
    x:     Math.random() * 500,
    baseY: Math.random() * 400,   // offset from a reference point
    w:     55 + Math.random() * 110,
    h:     22 + Math.random() * 38,
    parallax: 0.06 + Math.random() * 0.18, // slower layers = farther
    alpha:    0.18 + Math.random() * 0.38,
  }));

  const stars = Array.from({ length: 55 }, () => ({
    x:        Math.random() * 500,
    baseY:    Math.random() * 300,
    r:        0.5 + Math.random() * 1.8,
    alpha:    0.18 + Math.random() * 0.7,
    parallax: 0.02,
  }));

  function getCanvas() { return document.getElementById('gameCanvas'); }
  function W() { return getCanvas().width; }
  function H() { return getCanvas().height; }

  function drawBackground(ctx) {
    const energy = State.energyMode;
    const camY   = Camera.getWorldY();

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, H());
    if (energy) {
      sky.addColorStop(0,   '#160830');
      sky.addColorStop(0.45,'#2d1654');
      sky.addColorStop(1,   '#4a1e80');
    } else {
      sky.addColorStop(0,   '#162444');
      sky.addColorStop(0.35,'#1e4070');
      sky.addColorStop(0.7, '#3272a8');
      sky.addColorStop(1,   '#5496cc');
    }
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, W(), H());

    // Stars (only visible in top half)
    const starAlphaScale = energy ? 1 : 0.5;
    stars.forEach(s => {
      const rawY = s.baseY - camY * s.parallax;
      const sy   = ((rawY % H()) + H()) % H();
      const sx   = s.x % W();
      if (sy > H() * 0.55) return;
      ctx.beginPath();
      ctx.arc(sx, sy, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.alpha * starAlphaScale})`;
      ctx.fill();
    });

    // Clouds
    clouds.forEach(c => {
      const rawY = c.baseY - camY * c.parallax;
      // Wrap vertically so clouds fill the whole sky as you fall
      const sy   = ((rawY % (H() * 1.5)) + H() * 1.5) % (H() * 1.5) - H() * 0.25;
      const sx   = c.x % W();

      ctx.save();
      ctx.globalAlpha = c.alpha * (energy ? 0.15 : 0.55);
      ctx.fillStyle   = energy ? '#7040b0' : '#ddeeff';
      // 3-puff cloud
      ctx.beginPath(); ctx.ellipse(sx,              sy,           c.w * 0.45, c.h * 0.55, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sx + c.w * 0.28, sy - c.h * 0.18, c.w * 0.35, c.h * 0.45, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(sx - c.w * 0.22, sy - c.h * 0.10, c.w * 0.30, c.h * 0.40, 0, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    });
  }

  // ── Full render frame ───────────────────────────────
  function render(ctx, phase) {
    ctx.save();
    Camera.applyShake(ctx);

    drawBackground(ctx);

    if (phase === 'playing' || phase === 'paused' || phase === 'gameover') {
      Obstacles.draw(ctx);
      Powerups.draw(ctx);
      Particles.draw(ctx);
      Player.draw(ctx);
    }

    ctx.restore();
  }

  // ── Animated preview on start screen ────────────────
  function drawPreview() {
    const pc = document.getElementById('preview-canvas');
    if (!pc) return;
    const cx = pc.getContext('2d');
    const t  = Date.now() / 1000;
    const w  = pc.width, h = pc.height;

    cx.clearRect(0, 0, w, h);

    // sky
    const sg = cx.createLinearGradient(0, 0, 0, h);
    sg.addColorStop(0, '#162444'); sg.addColorStop(1, '#5496cc');
    cx.fillStyle = sg; cx.fillRect(0, 0, w, h);

    // mini cloud
    cx.save(); cx.globalAlpha = 0.4; cx.fillStyle = '#ddeeff';
    cx.beginPath(); cx.ellipse(20, 28, 22, 10, 0, 0, Math.PI * 2); cx.fill();
    cx.beginPath(); cx.ellipse(85, 18, 18, 8, 0, 0, Math.PI * 2); cx.fill();
    cx.restore();

    cx.save(); cx.translate(w / 2, 72 + Math.sin(t * 2) * 6);

    // Parachute
    cx.save(); cx.translate(0, -24);
    const cg = cx.createRadialGradient(-2, -3, 2, 0, 0, 22);
    cg.addColorStop(0, '#c8e4f8'); cg.addColorStop(1, '#7ec8e3');
    cx.beginPath();
    cx.moveTo(-22, 8);
    cx.bezierCurveTo(-22, -16, 22, -16, 22, 8);
    cx.bezierCurveTo(13, -1, -13, -1, -22, 8);
    cx.fillStyle = cg; cx.fill();
    [[-14, 8], [-5, 5], [5, 5], [14, 8]].forEach(([sx, sy]) => {
      cx.beginPath(); cx.moveTo(sx, sy); cx.lineTo(0, 22);
      cx.strokeStyle = 'rgba(150,200,240,0.45)'; cx.lineWidth = 0.8; cx.stroke();
    });
    cx.restore();

    // Body
    const bg = cx.createLinearGradient(-8, -12, 8, 12);
    bg.addColorStop(0, '#e8f4ff'); bg.addColorStop(1, '#a8c8e8');
    cx.beginPath(); cx.ellipse(0, 4, 9, 13, 0, 0, Math.PI * 2); cx.fillStyle = bg; cx.fill();
    cx.beginPath(); cx.arc(0, -10, 9, 0, Math.PI * 2); cx.fillStyle = '#c8e0f8'; cx.fill();
    cx.beginPath(); cx.ellipse(0, -10, 5, 3.5, 0, 0, Math.PI * 2);
    cx.fillStyle = 'rgba(50,150,255,0.55)'; cx.fill();

    cx.restore();
    requestAnimationFrame(drawPreview);
  }

  return { render, drawPreview };
})();
