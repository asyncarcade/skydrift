// ════════════════════════════════════════
//  game.js  —  main loop, game flow, UI
// ════════════════════════════════════════

const Game = (() => {

  const canvas  = document.getElementById('gameCanvas');
  const ctx     = canvas.getContext('2d');
  const wrapper = document.getElementById('game-wrapper');

  let lastTime = 0;

  // ── Canvas resize ──────────────────────────────────
  function resize() {
    canvas.width  = wrapper.clientWidth;
    canvas.height = wrapper.clientHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // ── HUD helpers ────────────────────────────────────
  function updateScoreHUD() {
    const sv = document.getElementById('score-value');
    sv.textContent = State.score + 'm';
    sv.classList.toggle('energized', State.energyMode);
    document.getElementById('best-value').textContent =
      Math.max(State.score, State.bestScore) + 'm';
  }

  function updatePowerupHUD() {
    const map = {
      shield:    [document.getElementById('pu-shield'),    Player.hasShield()],
      rocket:    [document.getElementById('pu-rocket'),    Player.hasRocket()],
      destroyer: [document.getElementById('pu-destroyer'), Player.hasDestroyer()],
      dash:      [document.getElementById('pu-dash'),      Player.hasDash()],
    };
    Object.values(map).forEach(([el, active]) => {
      el.classList.toggle('active', active);
    });
    // Energy flash overlay
    document.getElementById('energy-flash').classList.toggle('active', State.energyMode);
  }

  function showMsg(text, color = '#fff') {
    const el = document.getElementById('game-msg');
    el.textContent  = text;
    el.style.color  = color;
    el.style.textShadow = `0 0 18px ${color}`;
    el.style.opacity    = '1';
    State.msgTimer      = 1.9;
  }

  // ── Game flow ──────────────────────────────────────
  // Reload the page on every (re)start for a guaranteed clean state.
  function startGame() {
    window.location.reload();
  }

  // Called once automatically on first load to begin the actual session.
  function beginPlay() {
    hide('start-screen');
    hide('gameover-screen');
    hide('pause-overlay');

    State.reset();
    Camera.reset();
    Player.init();
    Obstacles.reset();
    Powerups.reset();
    Particles.reset();

    Camera.followPlayer(Player.getWorldY());

    State.parachuteOpen = true;
    updateParaIndicator();
    updatePowerupHUD();
    updateScoreHUD();
    document.getElementById('best-value').textContent = State.bestScore + 'm';
    document.getElementById('game-msg').style.opacity = '0';

    lastTime = 0;
    State.phase = 'playing';
    Audio.unlock();
    Audio.startDrone();

    const hint = document.getElementById('touch-hint');
    hint.style.opacity = '1';
    setTimeout(() => { hint.style.opacity = '0'; }, 4500);
  }

  function triggerGameOver() {
    State.phase = 'gameover';
    Audio.stopDrone();

    setTimeout(() => {
      document.getElementById('go-score').textContent = State.score;
      document.getElementById('go-best').textContent  =
        State.score >= State.bestScore
          ? '🏆 NEW BEST!'
          : `Best: ${State.bestScore}m`;
      show('gameover-screen');
    }, 650);
  }

  function togglePause() {
    if (State.phase === 'playing') {
      State.phase = 'paused';
      show('pause-overlay');
    } else if (State.phase === 'paused') {
      resumeGame();
    }
  }

  function resumeGame() {
    State.phase = 'playing';
    hide('pause-overlay');
  }

  function goToMenu() {
    State.phase = 'start';
    Audio.stopDrone();
    hide('gameover-screen');
    hide('pause-overlay');
    show('start-screen');
  }

  // ── Utility ────────────────────────────────────────
  function show(id) { document.getElementById(id).classList.remove('hidden'); }
  function hide(id) { document.getElementById(id).classList.add('hidden'); }

  // ── Main update ────────────────────────────────────
  function update(dt) {
    // Energy mode countdown
    if (State.energyMode) {
      State.energyTimer -= dt;
      if (State.energyTimer <= 0) State.energyMode = false;
    }

    // Update player position first
    Player.update(dt);

    // Camera follows player immediately after player moves
    // so all screen-Y conversions this frame are accurate
    Camera.followPlayer(Player.getWorldY());

    // Score = world distance in metres
    const metres = Math.floor(Camera.getWorldY() / 60);
    State.setScore(metres);
    State.gameSpeed = 1 + metres / 350;

    // Spawn timers
    State.obstacleTimer += dt;
    const spawnInterval = Math.max(0.55, 2.2 - metres * 0.003);
    if (State.obstacleTimer >= spawnInterval) {
      State.obstacleTimer = 0;
      Obstacles.spawn();
    }

    State.powerupTimer += dt;
    if (State.powerupTimer >= 6 + Math.random() * 5) {
      State.powerupTimer = 0;
      Powerups.spawn();
    }

    // Update world entities
    Obstacles.update(dt);
    Powerups.update(dt);
    Particles.update(dt);

    // Collision checks — camera is in sync so screen-Y is correct
    Obstacles.checkCollisions();
    Obstacles.checkDashProximity();

    // HUD updates (throttled)
    State.scoreDisplayTimer += dt;
    if (State.scoreDisplayTimer >= 0.08) {
      State.scoreDisplayTimer = 0;
      updateScoreHUD();
      updatePowerupHUD();
    }

    // Message fade
    if (State.msgTimer > 0) {
      State.msgTimer -= dt;
      if (State.msgTimer <= 0) document.getElementById('game-msg').style.opacity = '0';
    }
  }

  // ── Main loop ──────────────────────────────────────
  function loop(ts) {
    // When lastTime is 0 (fresh start or restart), skip the first dt calculation
    // to avoid a huge spike from accumulated idle time
    const dt = lastTime === 0 ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;

    if (State.phase === 'playing') update(dt);

    Renderer.render(ctx, State.phase);
    requestAnimationFrame(loop);
  }

  // ── Wire up UI buttons ─────────────────────────────
  function initUI() {
    // "DIVE IN" on the start screen begins the session directly (no reload needed on first launch)
    document.getElementById('start-btn') .addEventListener('click', beginPlay);
    // Retry / menu always reload for a clean slate
    document.getElementById('retry-btn') .addEventListener('click', startGame);
    document.getElementById('menu-btn')  .addEventListener('click', startGame);
    document.getElementById('resume-btn').addEventListener('click', resumeGame);
    document.getElementById('quit-btn')  .addEventListener('click', startGame);
    document.getElementById('pause-btn') .addEventListener('click', () => {
      if (State.phase === 'playing') togglePause();
    });
    document.getElementById('how-btn')   .addEventListener('click', () => show('howto-overlay'));
    document.getElementById('howto-close').addEventListener('click', () => hide('howto-overlay'));
    document.getElementById('best-value').textContent = State.bestScore + 'm';
  }

  // ── Boot ───────────────────────────────────────────
  function init() {
    initUI();
    Input.init();
    Renderer.drawPreview();
    requestAnimationFrame(loop);
  }

  return { init, startGame, beginPlay, triggerGameOver, togglePause, showMsg, updatePowerupHUD };
})();

// Boot on DOM ready
document.addEventListener('DOMContentLoaded', () => Game.init());
