// ════════════════════════════════════════
//  obstacles.js  —  obstacle spawning,
//  updating, drawing, and collision
//
//  All obstacles live in WORLD space (worldY).
//  They are drawn at Camera.toScreenY(worldY).
//  Obstacles spawn BELOW the camera's bottom edge
//  so the player always "falls into" them.
// ════════════════════════════════════════

const Obstacles = (() => {

  const TYPES = ['rock', 'crate', 'bird', 'door', 'cannon', 'laser'];
  let list = [];
  let destroyerRadius = 80;

  // Hit cooldown: prevents the same obstacle triggering game-over
  // multiple times across consecutive frames during the death animation.
  let hitCooldown = 0;

  function getCanvas() { return document.getElementById('gameCanvas'); }
  function W()  { return getCanvas().width; }
  function H()  { return getCanvas().height; }

  // ── Helpers ────────────────────────────────────────
  function pastel() {
    return `hsl(${Math.floor(Math.random() * 360)},45%,72%)`;
  }

  // Spawn Y is always below the visible screen in world space
  function spawnWorldY() {
    return Camera.getWorldY() + H() * (0.9 + Math.random() * 0.35);
  }

  // ── Spawn ──────────────────────────────────────────
  function spawn() {
    const type     = TYPES[Math.floor(Math.random() * TYPES.length)];
    const fromLeft = Math.random() < 0.5;
    const speed    = (60 + Math.random() * 110) * State.gameSpeed * (fromLeft ? 1 : -1);

    const base = {
      type,
      worldY: spawnWorldY(),
      x:      fromLeft ? -60 : W() + 60,
      w: 40,  h: 40,
      vx:     speed,
      alive:  true,
      timer:  0,
      phase:  Math.random() * Math.PI * 2,
      color:  pastel(),
    };

    if (type === 'laser') {
      Object.assign(base, {
        x:             0,
        w:             W(),
        h:             14,
        vx:            0,
        on:            false,
        laserTimer:    0,
        laserInterval: 0.9 + Math.random() * 1.1,
      });
    } else if (type === 'door') {
      Object.assign(base, {
        w:            68,
        h:            90,
        vx:           (30 + Math.random() * 40) * (fromLeft ? 1 : -1) * State.gameSpeed,
        gapOpen:      false,
        openTimer:    0,
        openInterval: 1.6 + Math.random() * 1.4,
      });
    } else if (type === 'cannon') {
      Object.assign(base, {
        vx:            (20 + Math.random() * 40) * (fromLeft ? 1 : -1) * State.gameSpeed,
        shootTimer:    0,
        shootInterval: 2.0 + Math.random() * 2.0,
        projectiles:   [],
      });
    } else if (type === 'bird') {
      base.vx = speed * 1.3;
    }

    list.push(base);
  }

  // ── Update ─────────────────────────────────────────
  function update(dt) {
    if (hitCooldown > 0) hitCooldown -= dt;

    destroyerRadius = 88 + Math.sin(Date.now() * 0.005) * 10;

    list.forEach(obs => {
      if (!obs.alive) return;
      obs.timer += dt;
      obs.x     += obs.vx * dt;

      if (obs.type === 'door') {
        obs.openTimer += dt;
        if (obs.openTimer >= obs.openInterval) {
          obs.gapOpen   = !obs.gapOpen;
          obs.openTimer = 0;
        }
      }

      if (obs.type === 'cannon') {
        obs.shootTimer += dt;
        if (obs.shootTimer >= obs.shootInterval) {
          obs.shootTimer = 0;
          Audio.sfx.cannon();
          obs.projectiles.push({
            x:      obs.x,
            worldY: obs.worldY + obs.h / 2,
            vy:     200 + Math.random() * 100,
            alive:  true,
            r:      6,
          });
        }
        obs.projectiles.forEach(p => {
          p.worldY += p.vy * dt;
          if (Camera.toScreenY(p.worldY) > H() + 50) p.alive = false;
        });
        obs.projectiles = obs.projectiles.filter(p => p.alive);
      }

      if (obs.type === 'laser') {
        obs.laserTimer += dt;
        if (obs.laserTimer >= obs.laserInterval) {
          obs.on         = !obs.on;
          obs.laserTimer = 0;
          if (obs.on) Audio.sfx.laser();
        }
      }

      if (obs.type === 'bird') {
        obs.worldY += Math.sin(obs.timer * 2.2 + obs.phase) * 30 * dt;
      }

      // ── Culling ──────────────────────────────────
      // Offscreen horizontally (not laser — it spans full width)
      if (obs.type !== 'laser' && (obs.x < -240 || obs.x > W() + 240)) {
        obs.alive = false;
        return;
      }
      // Scrolled above visible area — destroy regardless of type
      // Use a comfortable margin so nothing lingers off-screen above the player
      if (Camera.toScreenY(obs.worldY) < -120) {
        obs.alive = false;
        return;
      }

      // ── Destroyer aura ───────────────────────────
      if (Player.hasDestroyer() && obs.type !== 'laser' && obs.type !== 'door') {
        const dx = obs.x - Player.getX();
        const dy = Camera.toScreenY(obs.worldY) - Player.getScreenY();
        if (Math.sqrt(dx * dx + dy * dy) < destroyerRadius + obs.w / 2) {
          Particles.spawn(obs.x, Camera.toScreenY(obs.worldY), '#ab47bc', 12);
          obs.alive = false;
          State.addShake(5);
          Audio.sfx.destroy();
        }
      }
    });

    list = list.filter(o => o.alive);
  }

  // ── Draw ───────────────────────────────────────────
  function draw(ctx) {
    list.forEach(obs => {
      if (!obs.alive) return;
      const sy = Camera.toScreenY(obs.worldY);

      // Only draw if on screen
      if (sy < -120 || sy > H() + 120) return;

      ctx.save();

      if (obs.type === 'rock') {
        ctx.translate(obs.x, sy);
        ctx.rotate(obs.timer * 0.55);
        ctx.beginPath();
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * Math.PI * 2;
          const r = (obs.w / 2) * (0.75 + (i % 3 === 0 ? 0.25 : 0));
          i === 0 ? ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
                  : ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fillStyle   = obs.color; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 2; ctx.stroke();

      } else if (obs.type === 'crate') {
        ctx.translate(obs.x, sy);
        ctx.fillStyle = obs.color;
        ctx.fillRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
        ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
        ctx.strokeRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
        ctx.strokeStyle = 'rgba(0,0,0,0.14)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-obs.w / 2, 0); ctx.lineTo(obs.w / 2, 0); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, -obs.h / 2); ctx.lineTo(0, obs.h / 2); ctx.stroke();

      } else if (obs.type === 'bird') {
        ctx.translate(obs.x, sy);
        const wing = Math.sin(obs.timer * 9) * 11;
        ctx.strokeStyle = '#5d4037'; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(-15, wing); ctx.quadraticCurveTo(0, -5, 15, wing); ctx.stroke();
        ctx.fillStyle = '#5d4037';
        ctx.beginPath(); ctx.ellipse(0, 0, 8, 5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ff6f00';
        ctx.beginPath(); ctx.moveTo(7, -1); ctx.lineTo(11, 0); ctx.lineTo(7, 1); ctx.fill();

      } else if (obs.type === 'door') {
        ctx.translate(obs.x, sy);
        // gapH = gap size; 0 when closed (fully solid), 44 when open
        const gapH   = obs.gapOpen ? 44 : 0;
        const panelH = (obs.h - gapH) / 2;
        ctx.fillStyle = obs.color;
        // Top panel: from top of door down by panelH
        ctx.fillRect(-obs.w / 2, -obs.h / 2,              obs.w, panelH);
        // Bottom panel: from (top + panelH + gapH) down by panelH
        ctx.fillRect(-obs.w / 2, -obs.h / 2 + panelH + gapH, obs.w, panelH);
        ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2;
        ctx.strokeRect(-obs.w / 2, -obs.h / 2, obs.w, obs.h);
        ctx.save(); ctx.globalAlpha = 0.28; ctx.fillStyle = '#f4dca8';
        for (let i = 0; i < 4; i++) ctx.fillRect(-obs.w / 2 + i * 16, -obs.h / 2, 9, panelH);
        ctx.restore();

      } else if (obs.type === 'cannon') {
        ctx.translate(obs.x, sy);
        ctx.fillStyle = '#78909c';
        ctx.fillRect(-obs.w / 2, -10, obs.w * 0.65, 20);
        ctx.beginPath(); ctx.arc(0, 0, obs.w / 2, 0, Math.PI * 2);
        ctx.fillStyle = '#90a4ae'; ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.28)'; ctx.lineWidth = 2; ctx.stroke();
        // Projectiles in absolute coords (ctx is translated to cannon centre)
        obs.projectiles.forEach(p => {
          const psy2 = Camera.toScreenY(p.worldY);
          ctx.beginPath(); ctx.arc(p.x - obs.x, psy2 - sy, p.r, 0, Math.PI * 2);
          ctx.fillStyle = '#ff7043'; ctx.fill();
        });

      } else if (obs.type === 'laser') {
        if (obs.on) {
          const alpha = 0.55 + Math.sin(obs.timer * 22) * 0.25;
          ctx.fillStyle = `rgba(255,70,70,${alpha})`;
          ctx.fillRect(0, sy - obs.h / 2, W(), obs.h);
          const lg = ctx.createLinearGradient(0, sy - 24, 0, sy + 24);
          lg.addColorStop(0,   'rgba(255,70,70,0)');
          lg.addColorStop(0.5, `rgba(255,100,100,${alpha * 0.45})`);
          lg.addColorStop(1,   'rgba(255,70,70,0)');
          ctx.fillStyle = lg;
          ctx.fillRect(0, sy - 24, W(), 48);
        } else {
          ctx.globalAlpha = 0.10;
          ctx.fillStyle   = 'rgba(255,80,80,0.3)';
          ctx.fillRect(0, sy - obs.h / 2, W(), obs.h);
          ctx.globalAlpha = 1;
        }
      }

      ctx.restore();
    });
  }

  // ── Collision detection ─────────────────────────────
  //
  //  Rules:
  //  1. Skip if hitCooldown active (already processed a hit this window).
  //  2. Skip any obstacle that is not on screen — if it can't be seen,
  //     the player cannot be touching it.
  //  3. Per-type hitbox: AABB for box-shaped, radius for cannon/projectiles,
  //     vertical strip for laser, gap-aware for door.
  //
  function checkCollisions() {
    if (hitCooldown > 0) return;

    const px  = Player.getX();
    const psy = Player.getScreenY();
    const pr  = 13; // player hit radius (tight but fair)

    for (const obs of list) {
      if (!obs.alive) continue;

      const sy = Camera.toScreenY(obs.worldY);

      // ── Screen-bounds guard ──────────────────────────
      // An obstacle that is not visible cannot be hitting the player.
      if (obs.type !== 'laser') {
        if (obs.x + obs.w / 2 < 0 || obs.x - obs.w / 2 > W()) continue;
        if (sy  + obs.h / 2 < 0 || sy  - obs.h / 2 > H()) continue;
      } else {
        // Laser: full-width, only vertical check needed
        if (sy + obs.h / 2 < 0 || sy - obs.h / 2 > H()) continue;
      }

      let hit = false;

      if (obs.type === 'laser') {
        // Deadly only when ON. Simple vertical overlap.
        if (obs.on && Math.abs(psy - sy) < obs.h / 2 + pr) hit = true;

      } else if (obs.type === 'door') {
        // Horizontal overlap check
        const inX = (px + pr) > (obs.x - obs.w / 2) &&
                    (px - pr) < (obs.x + obs.w / 2);
        if (inX) {
          if (obs.gapOpen) {
            // Gap is open — safe zone is the middle 44px gap.
            // panelH = (90 - 44) / 2 = 23
            const gapH      = 44;
            const panelH    = (obs.h - gapH) / 2;           // 23
            const gapTop    = sy - obs.h / 2 + panelH;      // screen Y of gap top
            const gapBottom = gapTop + gapH;                 // screen Y of gap bottom
            // Hit if player overlaps with either solid panel
            if ((psy - pr) < gapTop || (psy + pr) > gapBottom) hit = true;
          } else {
            // Door fully closed — whole height is solid
            if (Math.abs(psy - sy) < obs.h / 2 + pr) hit = true;
          }
        }

      } else if (obs.type === 'cannon') {
        // Cannon body (circle)
        const dx = px - obs.x, dy = psy - sy;
        if (Math.sqrt(dx * dx + dy * dy) < pr + obs.w / 2) hit = true;
        // Cannon projectiles
        if (!hit) {
          for (const p of obs.projectiles) {
            const pdx = px  - p.x;
            const pdy = psy - Camera.toScreenY(p.worldY);
            if (Math.sqrt(pdx * pdx + pdy * pdy) < pr + p.r) { hit = true; break; }
          }
        }

      } else {
        // rock, crate, bird — AABB
        const dx = Math.abs(px - obs.x);
        const dy = Math.abs(psy - sy);
        if (dx < pr + obs.w / 2 && dy < pr + obs.h / 2) hit = true;
      }

      if (hit) {
        hitCooldown = 0.35;
        handleHit(obs);
        return; // at most one hit per frame
      }
    }
  }

  function handleHit(obs) {
    if (Player.hasRocket()) {
      Particles.spawn(obs.x, Camera.toScreenY(obs.worldY), '#ff7043', 16);
      if (obs.type !== 'laser') obs.alive = false;
      State.addShake(10);
      Audio.sfx.destroy();
      return;
    }

    if (Player.hasShield()) {
      Particles.spawn(obs.x, Camera.toScreenY(obs.worldY), '#4fc3f7', 12);
      if (obs.type !== 'laser') obs.alive = false;
      State.addShake(7);
      Audio.sfx.destroy();
      Player.consumeShield();
      Game.updatePowerupHUD();
      return;
    }

    if (Player.hasDash()) {
      Particles.spawn(obs.x, Camera.toScreenY(obs.worldY), '#00e5ff', 14);
      if (obs.type !== 'laser') obs.alive = false;
      State.addShake(8);
      Audio.sfx.dash();
      Player.addDrift(obs.x < Player.getX() ? 420 : -420);
      Player.consumeDash();
      Game.updatePowerupHUD();
      return;
    }

    // No protection — game over
    Audio.sfx.hit();
    Particles.spawn(Player.getX(), Player.getScreenY(), '#ff6b6b', 22);
    State.addShake(18);
    Game.triggerGameOver();
  }

  // ── Dash-shield proximity auto-dodge ─────────────
  function checkDashProximity() {
    if (!Player.hasDash()) return;
    const px      = Player.getX();
    const psy     = Player.getScreenY();
    const detectR = 70;

    for (const obs of list) {
      if (!obs.alive || obs.type === 'laser') continue;
      const sy = Camera.toScreenY(obs.worldY);
      // Only trigger on obstacles that are on screen
      if (sy + obs.h / 2 < 0 || sy - obs.h / 2 > H()) continue;

      const dx = obs.x - px, dy = sy - psy;
      if (Math.sqrt(dx * dx + dy * dy) < detectR + obs.w / 2) {
        Particles.spawn(obs.x, sy, '#00e5ff', 14);
        obs.alive = false;
        State.addShake(8);
        Audio.sfx.dash();
        Player.addDrift(obs.x < px ? 380 : -380);
        break;
      }
    }
  }

  function reset() {
    list        = [];
    hitCooldown = 0;
  }

  function getDestroyerRadius() { return destroyerRadius; }
  function getAll()              { return list; }

  return { spawn, update, draw, checkCollisions, checkDashProximity, reset, getDestroyerRadius, getAll };
})();
