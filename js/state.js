// ════════════════════════════════════════
//  state.js  —  shared game state
// ════════════════════════════════════════

const State = {
  // 'start' | 'playing' | 'paused' | 'gameover'
  phase: 'start',

  score:      0,
  bestScore:  parseInt(localStorage.getItem('skydrift_best') || '0'),
  gameSpeed:  1,

  parachuteOpen: true,   // true = slow, false = fast
  energyMode:    false,
  energyTimer:   0,

  // camera shake
  shakeMag:   0,
  shakeDecay: 0.82,
  shakeX:     0,
  shakeY:     0,

  // timers
  obstacleTimer:   0,
  powerupTimer:    0,
  msgTimer:        0,
  scoreDisplayTimer: 0,

  addShake(mag, decay = 0.82) {
    this.shakeMag  = Math.max(this.shakeMag, mag);
    this.shakeDecay = decay;
  },

  setScore(val) {
    this.score = val;
    if (val > this.bestScore) {
      this.bestScore = val;
      localStorage.setItem('skydrift_best', val);
    }
  },

  reset() {
    this.score           = 0;
    this.gameSpeed       = 1;
    this.parachuteOpen   = true;
    this.energyMode      = false;
    this.energyTimer     = 0;
    this.shakeMag        = 0;
    this.obstacleTimer   = 0;
    this.powerupTimer    = 0;
    this.msgTimer        = 0;
    this.scoreDisplayTimer = 0;
  }
};
