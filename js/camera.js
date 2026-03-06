// ════════════════════════════════════════
//  camera.js  —  world-space camera
//
//  The world scrolls DOWNWARD infinitely.
//  camera.worldY tracks how far down we've scrolled.
//  Everything is drawn at:  screenY = worldY_of_object - camera.worldY
//
//  The player is always rendered near the TOP THIRD of the screen.
//  Obstacles and powerups spawn at (screen Y + camera.worldY) so
//  they appear below the player in world space.
// ════════════════════════════════════════

const Camera = (() => {
  // How far down the world we've scrolled (metres × PIXELS_PER_METRE)
  let worldY = 0;

  // Target screen position of the player (kept in upper third)
  const PLAYER_SCREEN_Y_RATIO = 0.28; // player sits at 28% from top

  function getCanvas() { return document.getElementById('gameCanvas'); }

  function targetPlayerScreenY() {
    return getCanvas().height * PLAYER_SCREEN_Y_RATIO;
  }

  // Convert a world-Y coordinate to screen-Y
  function toScreenY(wy) {
    return wy - worldY;
  }

  // Convert a screen-Y coordinate to world-Y
  function toWorldY(sy) {
    return sy + worldY;
  }

  // Called each frame: smoothly follow the player's world position
  // so the player stays at PLAYER_SCREEN_Y_RATIO of the canvas height.
  function followPlayer(playerWorldY) {
    const desired = playerWorldY - targetPlayerScreenY();
    // Snap instantly (no lag) — clean vertical scroll
    worldY = desired;
  }

  // Apply shake offset to context before drawing world
  function applyShake(ctx) {
    const { shakeMag, shakeDecay } = State;
    if (shakeMag > 0) {
      State.shakeX = (Math.random() - 0.5) * shakeMag * 2;
      State.shakeY = (Math.random() - 0.5) * shakeMag * 2;
      State.shakeMag *= shakeDecay;
      if (State.shakeMag < 0.4) { State.shakeMag = 0; State.shakeX = 0; State.shakeY = 0; }
    }
    ctx.translate(State.shakeX, State.shakeY);
  }

  function getWorldY() { return worldY; }

  function reset() { worldY = 0; }

  return { followPlayer, toScreenY, toWorldY, applyShake, getWorldY, reset };
})();
