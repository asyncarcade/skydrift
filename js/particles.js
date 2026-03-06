// ════════════════════════════════════════
//  particles.js  —  burst particle FX
// ════════════════════════════════════════

const Particles = (() => {
  let list = [];

  function spawn(x, y, color, count = 8) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 55 + Math.random() * 130;
      list.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        r: 2.5 + Math.random() * 4,
      });
    }
  }

  function update(dt) {
    list.forEach(p => {
      p.x    += p.vx * dt;
      p.y    += p.vy * dt;
      p.vx   *= 0.90;
      p.vy   *= 0.90;
      p.life -= dt * 2.2;
    });
    list = list.filter(p => p.life > 0);
  }

  function draw(ctx) {
    list.forEach(p => {
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.fill();
      ctx.restore();
    });
  }

  function reset() { list = []; }

  return { spawn, update, draw, reset };
})();
