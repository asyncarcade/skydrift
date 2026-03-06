// ════════════════════════════════════════
//  powerups.js  —  collectible powerups
// ════════════════════════════════════════

const Powerups = (() => {

  const TYPES  = ['shield', 'rocket', 'destroyer', 'dash'];
  const COLORS = { shield: '#4fc3f7', rocket: '#ff7043', destroyer: '#ab47bc', dash: '#26c6da' };
  const ICONS  = { shield: '🛡',      rocket: '🚀',     destroyer: '💥',     dash: '⚡' };

  let list = [];

  function getCanvas() { return document.getElementById('gameCanvas'); }
  function W() { return getCanvas().width; }
  function H() { return getCanvas().height; }

  function spawn() {
    const type = TYPES[Math.floor(Math.random() * TYPES.length)];
    list.push({
      type,
      x:      40 + Math.random() * (W() - 80),
      worldY: Camera.getWorldY() + H() * (0.75 + Math.random() * 0.45),
      r:      19,
      alive:  true,
      bob:    Math.random() * Math.PI * 2,
      timer:  0,
    });
  }

  function update(dt) {
    list.forEach(p => {
      p.timer += dt;
      p.bob   += dt * 2.2;
      if (Camera.toScreenY(p.worldY) < -60) p.alive = false;
    });
    list = list.filter(p => p.alive);

    // Pickup collision
    const px  = Player.getX();
    const psy = Player.getScreenY();
    const pr  = 18;

    list.forEach(p => {
      if (!p.alive) return;
      const sy = Camera.toScreenY(p.worldY) + Math.sin(p.bob) * 5;
      const dx = p.x - px, dy = sy - psy;
      if (Math.sqrt(dx * dx + dy * dy) < pr + p.r) {
        collect(p);
        p.alive = false;
      }
    });
  }

  function collect(p) {
    Particles.spawn(p.x, Camera.toScreenY(p.worldY), COLORS[p.type], 14);
    Audio.sfx.collect();

    switch (p.type) {
      case 'shield':
        Player.activateShield();
        Game.showMsg('🛡️ SHIELD ON!', COLORS.shield);
        break;
      case 'rocket':
        Player.activateRocket(3.5);
        State.energyMode  = true;
        State.energyTimer = 3.5;
        State.parachuteOpen = false;
        updateParaIndicator();
        Audio.sfx.rocket();
        State.addShake(6);
        Game.showMsg('🚀 ROCKET DASH!', COLORS.rocket);
        break;
      case 'destroyer':
        Player.activateDestroyer(5);
        State.energyMode  = true;
        State.energyTimer = 5;
        Audio.sfx.destroy();
        Game.showMsg('💥 DESTROYER!', COLORS.destroyer);
        break;
      case 'dash':
        Player.activateDash(6);
        State.energyMode  = true;
        State.energyTimer = 6;
        Game.showMsg('⚡ DASH SHIELD!', COLORS.dash);
        break;
    }
    Game.updatePowerupHUD();
  }

  function draw(ctx) {
    list.forEach(p => {
      if (!p.alive) return;
      const sy = Camera.toScreenY(p.worldY) + Math.sin(p.bob) * 5;
      if (sy < -50 || sy > getCanvas().height + 50) return;

      ctx.save();
      ctx.translate(p.x, sy);

      const glow = 0.45 + Math.sin(p.timer * 4) * 0.45;
      const col  = COLORS[p.type];

      // Outer glow
      const gr = ctx.createRadialGradient(0, 0, p.r * 0.4, 0, 0, p.r * 2);
      gr.addColorStop(0, col + '44');
      gr.addColorStop(1, col + '00');
      ctx.beginPath(); ctx.arc(0, 0, p.r * 2, 0, Math.PI * 2);
      ctx.fillStyle = gr; ctx.fill();

      // Circle
      ctx.beginPath(); ctx.arc(0, 0, p.r, 0, Math.PI * 2);
      ctx.fillStyle = col + '28'; ctx.fill();
      ctx.strokeStyle = col;
      ctx.lineWidth = 2.2 + Math.sin(p.timer * 4) * 0.5;
      ctx.stroke();

      // Icon
      ctx.font = `${p.r}px serif`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(ICONS[p.type], 0, 1);

      ctx.restore();
    });
  }

  function reset() { list = []; }

  return { spawn, update, draw, reset };
})();
