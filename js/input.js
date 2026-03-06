// ════════════════════════════════════════
//  input.js  —  tap vs swipe, keyboard
//
//  TAP  (distance < TAP_THRESHOLD px AND held < TAP_MAX_MS)
//       → toggles parachute
//
//  SWIPE (distance >= TAP_THRESHOLD)
//       → applies horizontal drift to player
//         vertical component is intentionally ignored so the
//         player's fall speed is purely parachute-controlled.
// ════════════════════════════════════════

const Input = (() => {
  const TAP_THRESHOLD = 14;   // px — below this it's a tap
  const TAP_MAX_MS    = 280;  // ms — held longer = not a tap

  let touchStartX = 0, touchStartY = 0, touchStartT = 0;
  let pointerActive = false;

  function getWrapper() { return document.getElementById('game-wrapper'); }

  // ── Tap handler ──────────────────────────────────
  function onTap() {
    if (State.phase !== 'playing') return;
    State.parachuteOpen = !State.parachuteOpen;
    if (State.parachuteOpen) Audio.sfx.paraOpen();
    else                     Audio.sfx.paraClose();
    updateParaIndicator();
  }

  // ── Swipe handler ────────────────────────────────
  function onSwipe(dx, dy) {
    if (State.phase !== 'playing') return;
    const dist  = Math.sqrt(dx * dx + dy * dy);
    // Only horizontal drift; clamp force
    const force = Math.min(dist * 3.5, 400);
    const dirX  = dx / dist; // normalised horizontal direction
    Player.addDrift(dirX * force);
    Audio.sfx.dash();
  }

  // ── Touch events ──────────────────────────────────
  function onTouchStart(e) {
    e.preventDefault();
    Audio.unlock();
    if (State.phase !== 'playing') return;
    const t = e.touches[0];
    touchStartX = t.clientX;
    touchStartY = t.clientY;
    touchStartT = Date.now();
    pointerActive = true;
  }

  function onTouchEnd(e) {
    e.preventDefault();
    if (!pointerActive || State.phase !== 'playing') { pointerActive = false; return; }
    pointerActive = false;
    const t    = e.changedTouches[0];
    const dx   = t.clientX - touchStartX;
    const dy   = t.clientY - touchStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const held = Date.now() - touchStartT;

    if (dist < TAP_THRESHOLD && held < TAP_MAX_MS) {
      onTap();
    } else if (dist >= TAP_THRESHOLD) {
      onSwipe(dx, dy);
    }
  }

  // ── Mouse events (desktop) ───────────────────────
  let mouseStartX = 0, mouseStartY = 0, mouseStartT = 0, mouseActive = false;

  function onMouseDown(e) {
    Audio.unlock();
    if (State.phase !== 'playing') return;
    mouseStartX = e.clientX;
    mouseStartY = e.clientY;
    mouseStartT = Date.now();
    mouseActive = true;
  }

  function onMouseUp(e) {
    if (!mouseActive || State.phase !== 'playing') { mouseActive = false; return; }
    mouseActive = false;
    const dx   = e.clientX - mouseStartX;
    const dy   = e.clientY - mouseStartY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const held = Date.now() - mouseStartT;

    if (dist < TAP_THRESHOLD && held < TAP_MAX_MS) {
      onTap();
    } else if (dist >= TAP_THRESHOLD) {
      onSwipe(dx, dy);
    }
  }

  // ── Keyboard ────────────────────────────────────
  function onKeyDown(e) {
    if (State.phase !== 'playing') return;
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        onTap();
        break;
      case 'ArrowLeft': case 'KeyA':
        Player.addDrift(-220);
        break;
      case 'ArrowRight': case 'KeyD':
        Player.addDrift(220);
        break;
      case 'KeyP': case 'Escape':
        Game.togglePause();
        break;
    }
  }

  // ── Register listeners ───────────────────────────
  function init() {
    const wrapper = getWrapper();
    wrapper.addEventListener('touchstart', onTouchStart, { passive: false });
    wrapper.addEventListener('touchend',   onTouchEnd,   { passive: false });
    wrapper.addEventListener('mousedown',  onMouseDown);
    wrapper.addEventListener('mouseup',    onMouseUp);
    window.addEventListener('keydown',     onKeyDown);
  }

  return { init };
})();

// Helper — keeps parachute indicator in sync
function updateParaIndicator() {
  const el    = document.getElementById('parachute-indicator');
  const label = document.getElementById('para-label');
  const icon  = document.getElementById('para-icon');
  if (State.parachuteOpen) {
    el.classList.remove('closed');
    label.textContent = 'OPEN';
    icon.textContent  = '🪂';
  } else {
    el.classList.add('closed');
    label.textContent = 'CLOSED';
    icon.textContent  = '🚫';
  }
}
