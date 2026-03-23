const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bombsEl = document.getElementById('bombs');
const powerEl = document.getElementById('power');
const highEl = document.getElementById('highscore');
const overlay = document.getElementById('overlay');
const panel = document.getElementById('panel');
const startBtn = document.getElementById('startBtn');
const bossWrap = document.querySelector('.boss-wrap');
const bossBar = document.getElementById('bossbar');
const stick = document.getElementById('stick');
const stickKnob = document.getElementById('stickKnob');
const fireBtn = document.getElementById('fireBtn');
const bombBtn = document.getElementById('bombBtn');
const stageNameEl = document.getElementById('stageName');
const weaponNameEl = document.getElementById('weaponName');
const muteBtn = document.getElementById('muteBtn');

const W = canvas.width;
const H = canvas.height;
const keys = new Set();
const touchMove = { x: 0, y: 0, active: false };
let firingTouch = false;

const HIGH_KEY = 'skyraid-highscore';
const MUTE_KEY = 'skyraid-muted';

const images = {
  player: new Image(),
  enemy: new Image(),
  star: new Image(),
  missile: new Image(),
  missileRed: new Image(),
  enemyAlt: new Image(),
  enemyTurret: new Image(),
  boss: new Image(),
};
images.player.src = 'assets/images/player.png';
images.enemy.src = 'assets/images/enemy.png';
images.star.src = 'assets/images/star.svg';
images.missile.src = 'assets/images/missile.svg';
images.missileRed.src = 'assets/images/missile-red.svg';
images.enemyAlt.src = 'assets/images/enemy-alt.svg';
images.enemyTurret.src = 'assets/images/enemy-turret.svg';
images.boss.src = 'assets/images/boss.svg';

const audioCtx = window.AudioContext ? new AudioContext() : null;
let audioUnlocked = false;

const STAGES = [
  {
    id: 1,
    name: 'Emerald Coast',
    subtitle: 'carrier scouts',
    sky: ['#123a62', '#0d2342', '#091421'],
    terrain: 'islands',
    musicHue: 195,
    waves: [
      { gap: 0.95, enemies: ['grunt','grunt','zigzag','grunt','grunt','zigzag'] },
      { gap: 0.9, enemies: ['sweeper','sweeper','zigzag','sweeper','grunt','zigzag'] },
      { gap: 0.86, enemies: ['turret','grunt','turret','zigzag','sweeper'] },
      { gap: 0.84, enemies: ['sweeper','zigzag','sweeper','gunship'] },
    ],
    miniboss: { kind: 'gunshipElite', label: 'Aegis Interceptor' },
    boss: { kind: 'carrier', label: 'Coastbreaker Carrier', hp: 210 },
  },
  {
    id: 2,
    name: 'Storm Front',
    subtitle: 'high-altitude assault',
    sky: ['#1b244e', '#11172f', '#090c15'],
    terrain: 'clouds',
    musicHue: 265,
    waves: [
      { gap: 0.82, enemies: ['zigzag','ace','zigzag','ace','sweeper','ace'] },
      { gap: 0.8, enemies: ['turret','ace','turret','sweeper','ace'] },
      { gap: 0.76, enemies: ['gunship','sweeper','gunship','ace'] },
      { gap: 0.74, enemies: ['ace','ace','zigzag','turret','ace','sweeper'] },
    ],
    miniboss: { kind: 'stormCore', label: 'Tempest Core' },
    boss: { kind: 'dreadnought', label: 'Storm Dreadnought', hp: 260 },
  },
  {
    id: 3,
    name: 'Crimson Furnace',
    subtitle: 'last line of defense',
    sky: ['#411926', '#1f0e16', '#09050a'],
    terrain: 'lava',
    musicHue: 15,
    waves: [
      { gap: 0.72, enemies: ['ace','sweeper','ace','gunship','ace','zigzag'] },
      { gap: 0.7, enemies: ['turret','turret','gunship','ace','sweeper'] },
      { gap: 0.66, enemies: ['gunship','ace','gunship','ace','turret'] },
      { gap: 0.62, enemies: ['ace','ace','sweeper','turret','gunship','ace'] },
    ],
    miniboss: { kind: 'forgeEye', label: 'Forge Eye' },
    boss: { kind: 'overlord', label: 'Iron Overlord', hp: 330 },
  },
];

const state = {
  player: null,
  bullets: [],
  enemyBullets: [],
  missiles: [],
  enemies: [],
  particles: [],
  powerUps: [],
  stars: [],
  score: 0,
  highscore: Number(localStorage.getItem(HIGH_KEY) || 0),
  stageIndex: 0,
  stage: STAGES[0],
  stagePhase: 'menu',
  waveIndex: 0,
  queuedWave: null,
  waveSpawnTimer: 0,
  waveGap: 0.8,
  phaseTimer: 0,
  boss: null,
  overlays: [],
  flash: 0,
  shake: 0,
  muted: localStorage.getItem(MUTE_KEY) === '1',
  terrainOffset: 0,
};
highEl.textContent = state.highscore;
if (muteBtn) muteBtn.textContent = state.muted ? '🔇 Sound Off' : '🔊 Sound On';

let running = false;
let paused = false;
let gameOver = false;
let lastTime = 0;

function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function currentStage() {
  return STAGES[Math.min(state.stageIndex, STAGES.length - 1)];
}

function pushOverlay(text, sub = '', duration = 2.1, tone = 'info') {
  state.overlays.push({ text, sub, duration, max: duration, tone });
}

function shake(amount = 8) {
  state.shake = Math.max(state.shake, amount);
}

function flash(amount = 0.3) {
  state.flash = Math.max(state.flash, amount);
}

function ensureAudio() {
  if (!audioCtx || audioUnlocked) return;
  audioCtx.resume().catch(() => {});
  audioUnlocked = true;
}

function beep({ freq = 440, duration = 0.08, type = 'square', gain = 0.03, slide = 0, detune = 0, when = 0 } = {}) {
  if (!audioCtx || state.muted) return;
  const start = audioCtx.currentTime + when;
  const osc = audioCtx.createOscillator();
  const amp = audioCtx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, start);
  osc.frequency.linearRampToValueAtTime(Math.max(40, freq + slide), start + duration);
  osc.detune.value = detune;
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.01);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  osc.connect(amp);
  amp.connect(audioCtx.destination);
  osc.start(start);
  osc.stop(start + duration + 0.02);
}

function noiseBurst({ duration = 0.15, gain = 0.04, lowpass = 900 } = {}) {
  if (!audioCtx || state.muted) return;
  const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * duration), audioCtx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = audioCtx.createBufferSource();
  const filter = audioCtx.createBiquadFilter();
  const amp = audioCtx.createGain();
  filter.type = 'lowpass';
  filter.frequency.value = lowpass;
  amp.gain.value = gain;
  src.buffer = buffer;
  src.connect(filter);
  filter.connect(amp);
  amp.connect(audioCtx.destination);
  src.start();
}

function sfx(name) {
  if (name === 'shoot') beep({ freq: 740, duration: 0.05, type: 'square', gain: 0.018, slide: 120 });
  else if (name === 'hit') { beep({ freq: 210, duration: 0.11, type: 'sawtooth', gain: 0.045, slide: -80 }); noiseBurst({ duration: 0.08, gain: 0.02, lowpass: 700 }); }
  else if (name === 'enemyHit') beep({ freq: 360, duration: 0.04, type: 'triangle', gain: 0.012, slide: -40 });
  else if (name === 'explode') { beep({ freq: 140, duration: 0.24, type: 'sawtooth', gain: 0.05, slide: -90 }); noiseBurst({ duration: 0.18, gain: 0.05, lowpass: 500 }); }
  else if (name === 'power') { beep({ freq: 540, duration: 0.08, type: 'triangle', gain: 0.03, when: 0 }); beep({ freq: 760, duration: 0.12, type: 'triangle', gain: 0.03, when: 0.07 }); }
  else if (name === 'warn') { beep({ freq: 220, duration: 0.12, type: 'square', gain: 0.03 }); beep({ freq: 180, duration: 0.12, type: 'square', gain: 0.025, when: 0.15 }); }
  else if (name === 'missile') beep({ freq: 180, duration: 0.12, type: 'sawtooth', gain: 0.025, slide: 120 });
  else if (name === 'bossShot') beep({ freq: 280, duration: 0.1, type: 'square', gain: 0.03, slide: -40 });
}

function updateHud() {
  if (!state.player) return;
  scoreEl.textContent = state.score;
  livesEl.textContent = state.player.lives;
  bombsEl.textContent = state.player.bombs;
  powerEl.textContent = `${state.player.power}/${state.player.missileLevel}`;
  stageNameEl.textContent = `${state.stage.id}. ${state.stage.name}`;
  weaponNameEl.textContent = state.player.weapon === 'spread' ? 'Spread' : state.player.weapon === 'pierce' ? 'Pierce' : 'Pulse';
  if (state.score > state.highscore) {
    state.highscore = state.score;
    localStorage.setItem(HIGH_KEY, String(state.highscore));
  }
  highEl.textContent = state.highscore;
}

function updateBossHud() {
  if (state.boss && state.boss.hp > 0) {
    bossWrap.classList.add('show');
    bossBar.style.width = `${(state.boss.hp / state.boss.maxHp) * 100}%`;
  } else {
    bossWrap.classList.remove('show');
    bossBar.style.width = '0%';
  }
}

function resetStars() {
  state.stars = Array.from({ length: 95 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    speed: rand(50, 190),
    size: rand(2, 9),
    rot: Math.random() * Math.PI * 2,
    layer: Math.random(),
  }));
}

function resetGame() {
  state.player = {
    x: W / 2 - 24,
    y: H - 110,
    w: 48,
    h: 48,
    speed: 305,
    cooldown: 0,
    missileCooldown: 0,
    invuln: 0,
    lives: 3,
    bombs: 2,
    power: 1,
    missileLevel: 0,
    weapon: 'pulse',
    optionAngle: 0,
    chargeFlash: 0,
  };
  state.bullets = [];
  state.enemyBullets = [];
  state.missiles = [];
  state.enemies = [];
  state.particles = [];
  state.powerUps = [];
  state.score = 0;
  state.stageIndex = 0;
  state.stage = STAGES[0];
  state.stagePhase = 'intro';
  state.waveIndex = 0;
  state.queuedWave = null;
  state.waveSpawnTimer = 0;
  state.waveGap = 0.8;
  state.phaseTimer = 2.6;
  state.boss = null;
  state.overlays = [];
  state.flash = 0;
  state.shake = 0;
  state.terrainOffset = 0;
  resetStars();
  running = true;
  paused = false;
  gameOver = false;
  overlay.classList.add('hidden');
  state.stage = currentStage();
  pushOverlay(`Stage ${state.stage.id}`, state.stage.name, 2.2, 'stage');
  pushOverlay(state.stage.subtitle.toUpperCase(), 'Sweep the route', 1.6, 'sub');
  updateHud();
  updateBossHud();
}

function particle(x, y, opts = {}) {
  state.particles.push({
    x, y,
    vx: opts.vx ?? rand(-80, 80),
    vy: opts.vy ?? rand(-80, 80),
    life: opts.life ?? rand(0.2, 0.8),
    maxLife: opts.maxLife ?? opts.life ?? 0.6,
    color: opts.color ?? '#fff',
    size: opts.size ?? rand(2, 4),
    glow: opts.glow ?? 0,
    gravity: opts.gravity ?? 0,
  });
}

function burst(x, y, color, count, spread = 180, gravity = 0) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2;
    const speed = rand(25, spread);
    particle(x, y, {
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed,
      color,
      size: rand(2, 5),
      life: rand(0.18, 0.7),
      gravity,
      glow: 8,
    });
  }
}

function ring(x, y, color, radius = 20, count = 24) {
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2;
    particle(x, y, {
      vx: Math.cos(a) * radius * 3,
      vy: Math.sin(a) * radius * 3,
      color,
      size: 3,
      life: 0.35,
      glow: 10,
    });
  }
}

function spawnPowerUp(x, y, forcedType = null) {
  const roll = Math.random();
  const type = forcedType || (roll < 0.36 ? 'power' : roll < 0.58 ? 'bomb' : roll < 0.8 ? 'missile' : roll < 0.92 ? 'weapon' : 'life');
  state.powerUps.push({ x, y, w: 26, h: 26, type, speed: 115, bob: Math.random() * 1000 });
}

function enemyBase(kind, x = rand(20, W - 60), y = -60) {
  const bases = {
    grunt: { w: 42, h: 42, speed: 118, hp: 3, score: 90, fire: 1.8, sprite: 'enemy' },
    zigzag: { w: 42, h: 42, speed: 132, hp: 4, score: 130, fire: 1.45, sprite: 'enemyAlt' },
    sweeper: { w: 48, h: 48, speed: 150, hp: 5, score: 160, fire: 1.25, sprite: 'enemyAlt' },
    turret: { w: 58, h: 58, speed: 72, hp: 9, score: 220, fire: 1.8, sprite: 'enemyTurret' },
    ace: { w: 50, h: 50, speed: 156, hp: 6, score: 200, fire: 1.08, sprite: 'enemyAlt' },
    gunship: { w: 70, h: 62, speed: 84, hp: 18, score: 420, fire: 1.25, sprite: 'boss' },
    gunshipElite: { w: 92, h: 82, speed: 82, hp: 80, score: 1800, fire: 0.8, sprite: 'boss', miniBoss: true },
    stormCore: { w: 98, h: 98, speed: 74, hp: 95, score: 2200, fire: 0.72, sprite: 'boss', miniBoss: true },
    forgeEye: { w: 104, h: 100, speed: 76, hp: 110, score: 2600, fire: 0.7, sprite: 'boss', miniBoss: true },
  };
  const base = bases[kind];
  return {
    kind,
    x, y,
    w: base.w,
    h: base.h,
    speed: base.speed,
    hp: base.hp,
    maxHp: base.hp,
    score: base.score,
    fireCooldown: rand(base.fire * 0.65, base.fire * 1.15),
    sprite: base.sprite,
    phase: Math.random() * Math.PI * 2,
    drift: rand(-1, 1),
    miniBoss: !!base.miniBoss,
    hitFlash: 0,
  };
}

function spawnEnemy(kind, x = rand(20, W - 60), y = -60) {
  state.enemies.push(enemyBase(kind, x, y));
}

function queueWave(index) {
  const wave = state.stage.waves[index];
  state.queuedWave = wave ? [...wave.enemies] : null;
  state.waveGap = wave?.gap ?? 0.75;
  state.waveSpawnTimer = 0.15;
}

function startNextStage() {
  state.stageIndex += 1;
  if (state.stageIndex >= STAGES.length) {
    winGame();
    return;
  }
  state.stage = currentStage();
  state.stagePhase = 'intro';
  state.phaseTimer = 2.7;
  state.waveIndex = 0;
  state.queuedWave = null;
  state.boss = null;
  state.enemyBullets = [];
  state.missiles = [];
  pushOverlay(`Stage ${state.stage.id}`, state.stage.name, 2.1, 'stage');
  pushOverlay(state.stage.subtitle.toUpperCase(), 'Press the attack', 1.6, 'sub');
  sfx('power');
  updateHud();
  updateBossHud();
}

function spawnBoss(kind, label, hp) {
  state.boss = {
    kind,
    label,
    x: W / 2 - 86,
    y: -170,
    w: 172,
    h: kind === 'overlord' ? 142 : 128,
    hp,
    maxHp: hp,
    phase: 0,
    fireCooldown: 0.8,
    altCooldown: 1.8,
    enter: true,
    hitFlash: 0,
  };
  state.stagePhase = 'boss';
  state.phaseTimer = 999;
  pushOverlay('WARNING', label, 2.4, 'warning');
  shake(10);
  flash(0.18);
  sfx('warn');
  updateBossHud();
}

function defeatEnemy(enemy) {
  state.score += enemy.score || 100;
  const cx = enemy.x + enemy.w / 2;
  const cy = enemy.y + enemy.h / 2;
  burst(cx, cy, enemy.miniBoss ? '#ffd166' : '#64f0ff', enemy.miniBoss ? 42 : enemy.kind === 'gunship' ? 22 : 12, enemy.miniBoss ? 320 : 210, 80);
  ring(cx, cy, enemy.miniBoss ? '#ff9f43' : '#8af5ff', enemy.miniBoss ? 36 : 20, enemy.miniBoss ? 36 : 20);
  shake(enemy.miniBoss ? 12 : enemy.kind === 'gunship' ? 8 : 4);
  flash(enemy.miniBoss ? 0.18 : 0.06);
  sfx('explode');
  if (enemy.miniBoss) {
    spawnPowerUp(cx - 12, cy - 12, 'weapon');
    spawnPowerUp(cx + 16, cy - 18, 'missile');
    state.stagePhase = 'bossIntro';
    state.phaseTimer = 2.2;
    pushOverlay('Route Clear', 'Main hostile incoming', 1.8, 'stage');
  } else if (Math.random() < 0.18 || enemy.kind === 'gunship') {
    spawnPowerUp(cx - 12, cy - 12);
  }
  updateHud();
}

function defeatBoss() {
  if (!state.boss) return;
  const b = state.boss;
  state.score += 3200 + state.stage.id * 800;
  for (let i = 0; i < 6; i++) {
    setTimeout(() => {
      burst(b.x + rand(20, b.w - 20), b.y + rand(20, b.h - 20), i % 2 ? '#ff5f7a' : '#ffd166', 30, 320, 60);
    }, i * 100);
  }
  burst(b.x + b.w / 2, b.y + b.h / 2, '#ffb347', 90, 380, 90);
  ring(b.x + b.w / 2, b.y + b.h / 2, '#fff2a0', 54, 48);
  shake(18);
  flash(0.3);
  sfx('explode');
  state.boss = null;
  state.enemyBullets = [];
  state.phaseTimer = 2.8;
  state.stagePhase = 'stageClear';
  state.player.bombs = Math.min(5, state.player.bombs + 1);
  state.player.lives = Math.min(5, state.player.lives + (state.stage.id === STAGES.length ? 0 : 0));
  spawnPowerUp(W / 2 - 50, 160, 'power');
  spawnPowerUp(W / 2 - 12, 180, 'weapon');
  spawnPowerUp(W / 2 + 24, 150, 'missile');
  pushOverlay(`Stage ${state.stage.id} Clear`, 'Rearming', 2.1, 'stage');
  updateHud();
  updateBossHud();
}

function shootPlayer() {
  const p = state.player;
  const cx = p.x + p.w / 2;
  const baseY = p.y - 6;
  if (p.weapon === 'spread') {
    const lanes = [
      { dx: -18, vx: -160 },
      { dx: -7, vx: -60 },
      { dx: 0, vx: 0 },
      { dx: 7, vx: 60 },
      { dx: 18, vx: 160 },
    ].slice(0, Math.min(5, p.power + 1));
    lanes.forEach(b => state.bullets.push({ x: cx - 3 + b.dx, y: baseY, w: 6, h: 16, speed: 580, vx: b.vx, damage: 1, color: '#ffe86b' }));
  } else if (p.weapon === 'pierce') {
    const shots = Math.min(3, Math.ceil(p.power / 2));
    for (let i = 0; i < shots; i++) {
      const off = (i - (shots - 1) / 2) * 12;
      state.bullets.push({ x: cx - 4 + off, y: baseY - 4, w: 8, h: 24, speed: 650, vx: 0, damage: 2, pierce: 2, color: '#8df0ff' });
    }
  } else {
    const patterns = {
      1: [{ dx: 0, vx: 0 }],
      2: [{ dx: -10, vx: -28 }, { dx: 10, vx: 28 }],
      3: [{ dx: 0, vx: 0 }, { dx: -15, vx: -45 }, { dx: 15, vx: 45 }],
      4: [{ dx: -18, vx: -60 }, { dx: -6, vx: -12 }, { dx: 6, vx: 12 }, { dx: 18, vx: 60 }],
      5: [{ dx: 0, vx: 0 }, { dx: -20, vx: -72 }, { dx: 20, vx: 72 }, { dx: -8, vx: -26 }, { dx: 8, vx: 26 }],
    };
    for (const b of patterns[Math.min(5, p.power)]) {
      state.bullets.push({ x: cx - 3 + b.dx, y: baseY, w: 6, h: 16, speed: 600, vx: b.vx, damage: 1, color: '#ffe86b' });
    }
  }
  p.chargeFlash = 0.16;
  particle(cx, p.y + 8, { vx: 0, vy: -60, color: '#7ef7ff', size: 5, life: 0.12, glow: 12 });
  sfx('shoot');
}

function spawnMissiles() {
  const p = state.player;
  if (p.missileLevel <= 0) return;
  const sets = {
    1: [-18, 18],
    2: [-22, 22, 0],
    3: [-26, 26, -8, 8],
  };
  (sets[p.missileLevel] || sets[1]).forEach((off, idx) => {
    state.missiles.push({
      x: p.x + p.w / 2 - 8 + off,
      y: p.y + 8,
      w: 16,
      h: 24,
      speed: 290,
      vx: off === 0 ? 0 : off < 0 ? -72 : 72,
      armY: p.y - 120,
      drift: off < 0 ? -0.5 : off > 0 ? 0.5 : 0,
      kind: idx % 2 === 0 ? 'blue' : 'red',
      damage: 4,
    });
  });
  sfx('missile');
}

function fireEnemyBullet(x, y, vx, vy, color = '#ff6b9b', size = 8) {
  state.enemyBullets.push({ x, y, w: size, h: size, vx, vy, color });
}

function aimedShot(enemy, speed = 180, spread = 0, count = 1, color = '#ff5f7a') {
  const px = state.player.x + state.player.w / 2;
  const py = state.player.y + state.player.h / 2;
  const ex = enemy.x + enemy.w / 2;
  const ey = enemy.y + enemy.h / 2;
  const angle = Math.atan2(py - ey, px - ex);
  const start = -spread * (count - 1) / 2;
  for (let i = 0; i < count; i++) {
    const a = angle + start + spread * i;
    fireEnemyBullet(ex, ey, Math.cos(a) * speed, Math.sin(a) * speed, color, count > 1 ? 9 : 8);
  }
}

function radialShot(enemy, count = 10, speed = 155, color = '#ff9f43') {
  const ex = enemy.x + enemy.w / 2;
  const ey = enemy.y + enemy.h / 2;
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2 + enemy.phase * 0.7;
    fireEnemyBullet(ex, ey, Math.cos(a) * speed, Math.sin(a) * speed, color, 10);
  }
}

function bomb() {
  const p = state.player;
  if (p.bombs <= 0 || !running || paused) return;
  p.bombs -= 1;
  state.enemyBullets = [];
  burst(p.x + p.w / 2, p.y, '#7ef7ff', 45, 320, 40);
  ring(p.x + p.w / 2, p.y, '#ffffff', 64, 40);
  state.enemies.forEach(e => { e.hp -= e.miniBoss ? 30 : 999; e.hitFlash = 0.2; });
  if (state.boss) {
    state.boss.hp -= 42;
    state.boss.hitFlash = 0.25;
  }
  shake(16);
  flash(0.26);
  sfx('explode');
  updateHud();
  updateBossHud();
}

function hitPlayer() {
  const p = state.player;
  if (!p || p.invuln > 0) return;
  p.lives -= 1;
  p.invuln = 2.2;
  p.power = Math.max(1, p.power - 1);
  p.missileLevel = Math.max(0, p.missileLevel - 1);
  if (p.weapon !== 'pulse' && Math.random() < 0.5) p.weapon = 'pulse';
  burst(p.x + p.w / 2, p.y + p.h / 2, '#ff7a7a', 28, 280, 80);
  ring(p.x + p.w / 2, p.y + p.h / 2, '#ffd0d0', 28, 22);
  flash(0.22);
  shake(10);
  sfx('hit');
  updateHud();
  if (p.lives <= 0) loseGame();
}

function loseGame() {
  running = false;
  gameOver = true;
  overlay.classList.remove('hidden');
  panel.innerHTML = `
    <h1>Mission Failed</h1>
    <p>Score: <strong>${state.score}</strong></p>
    <p>High Score: <strong>${state.highscore}</strong></p>
    <p class="hint">Enter or tap to launch again</p>
    <button id="startBtn2">Retry</button>
  `;
  const btn = document.getElementById('startBtn2');
  if (btn) btn.addEventListener('click', startGame);
}

function winGame() {
  running = false;
  gameOver = true;
  overlay.classList.remove('hidden');
  panel.innerHTML = `
    <h1>Sky Secured</h1>
    <p>You cleared all ${STAGES.length} stages.</p>
    <p>Score: <strong>${state.score}</strong></p>
    <p>High Score: <strong>${state.highscore}</strong></p>
    <p class="hint">Enter or tap to run it back</p>
    <button id="startBtn2">Play Again</button>
  `;
  const btn = document.getElementById('startBtn2');
  if (btn) btn.addEventListener('click', startGame);
}

function applyPowerUp(item) {
  const p = state.player;
  if (item.type === 'power') {
    p.power = Math.min(5, p.power + 1);
    pushOverlay('Weapon Up', 'Main cannon boosted', 1.1, 'sub');
  } else if (item.type === 'bomb') {
    p.bombs = Math.min(5, p.bombs + 1);
    pushOverlay('Bomb Stock', 'Payload replenished', 1.1, 'sub');
  } else if (item.type === 'missile') {
    p.missileLevel = Math.min(3, p.missileLevel + 1);
    pushOverlay('Missiles Online', 'Tracking support added', 1.1, 'sub');
  } else if (item.type === 'weapon') {
    const order = ['pulse', 'spread', 'pierce'];
    p.weapon = order[(order.indexOf(p.weapon) + 1) % order.length];
    pushOverlay('Weapon Swap', p.weapon === 'spread' ? 'Spread cannon' : p.weapon === 'pierce' ? 'Pierce lance' : 'Pulse blaster', 1.2, 'sub');
  } else if (item.type === 'life') {
    p.lives = Math.min(5, p.lives + 1);
    pushOverlay('Rescue Drone', '1UP secured', 1.2, 'sub');
  }
  burst(item.x + 13, item.y + 13, '#aef7ff', 18, 160, 20);
  sfx('power');
  updateHud();
}

function bossBehavior(dt) {
  const b = state.boss;
  if (!b) return;
  b.hitFlash = Math.max(0, b.hitFlash - dt);
  if (b.enter) {
    b.y += 88 * dt;
    if (b.y >= 34) b.enter = false;
    return;
  }
  b.phase += dt;
  if (b.kind === 'carrier') {
    b.x = W / 2 - b.w / 2 + Math.sin(b.phase * 0.95) * 85;
    b.fireCooldown -= dt;
    b.altCooldown -= dt;
    if (b.fireCooldown <= 0) {
      aimedShot(b, 180, 0.16, 5, '#ff8c69');
      b.fireCooldown = 1.05;
      sfx('bossShot');
    }
    if (b.altCooldown <= 0) {
      radialShot(b, 12, 135, '#a77bff');
      b.altCooldown = 2.8;
      sfx('bossShot');
    }
  } else if (b.kind === 'dreadnought') {
    b.x = W / 2 - b.w / 2 + Math.sin(b.phase * 0.62) * 100;
    b.fireCooldown -= dt;
    b.altCooldown -= dt;
    if (b.fireCooldown <= 0) {
      aimedShot(b, 215, 0.11, 7, '#ff5f7a');
      b.fireCooldown = 0.92;
      sfx('bossShot');
    }
    if (b.altCooldown <= 0) {
      radialShot(b, 16, 155, '#ffd166');
      b.altCooldown = 2.45;
      sfx('bossShot');
    }
  } else if (b.kind === 'overlord') {
    b.x = W / 2 - b.w / 2 + Math.sin(b.phase * 0.8) * 110;
    b.fireCooldown -= dt;
    b.altCooldown -= dt;
    if (b.fireCooldown <= 0) {
      aimedShot(b, 235, 0.08, 9, '#ff6b9b');
      b.fireCooldown = 0.78;
      sfx('bossShot');
    }
    if (b.altCooldown <= 0) {
      radialShot(b, 18, 175, '#ffb347');
      b.altCooldown = 1.95;
      sfx('bossShot');
    }
  }
  if (intersects(b, state.player)) hitPlayer();
}

function updateStageFlow(dt) {
  state.phaseTimer -= dt;
  if (state.stagePhase === 'intro') {
    if (state.phaseTimer <= 0) {
      state.stagePhase = 'waves';
      queueWave(0);
    }
  } else if (state.stagePhase === 'waves') {
    if (state.queuedWave) {
      state.waveSpawnTimer -= dt;
      if (state.waveSpawnTimer <= 0) {
        const kind = state.queuedWave.shift();
        spawnEnemy(kind);
        state.waveSpawnTimer = state.waveGap;
        if (!state.queuedWave.length) state.queuedWave = null;
      }
    } else if (state.enemies.length === 0) {
      state.waveIndex += 1;
      if (state.waveIndex < state.stage.waves.length) {
        state.phaseTimer = 0.9;
        state.stagePhase = 'between';
      } else {
        const mid = state.stage.miniboss;
        state.stagePhase = 'minibossIntro';
        state.phaseTimer = 1.8;
        pushOverlay('Heavy Contact', mid.label, 1.6, 'warning');
        sfx('warn');
      }
    }
  } else if (state.stagePhase === 'between') {
    if (state.phaseTimer <= 0) {
      state.stagePhase = 'waves';
      queueWave(state.waveIndex);
    }
  } else if (state.stagePhase === 'minibossIntro') {
    if (state.phaseTimer <= 0) {
      spawnEnemy(state.stage.miniboss.kind, W / 2 - 46, -120);
      state.stagePhase = 'miniboss';
    }
  } else if (state.stagePhase === 'bossIntro') {
    if (state.phaseTimer <= 0) {
      const boss = state.stage.boss;
      spawnBoss(boss.kind, boss.label, boss.hp);
    }
  } else if (state.stagePhase === 'stageClear') {
    if (state.phaseTimer <= 0) startNextStage();
  }
}

function update(dt) {
  const p = state.player;
  if (!p) return;
  state.flash = Math.max(0, state.flash - dt * 0.9);
  state.shake = Math.max(0, state.shake - dt * 18);
  state.terrainOffset += dt * (80 + state.stage.id * 14);
  p.invuln = Math.max(0, p.invuln - dt);
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.missileCooldown = Math.max(0, p.missileCooldown - dt);
  p.chargeFlash = Math.max(0, p.chargeFlash - dt);
  p.optionAngle += dt * 2.3;

  updateStageFlow(dt);

  let dx = 0, dy = 0;
  if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
  if (keys.has('arrowright') || keys.has('d')) dx += 1;
  if (keys.has('arrowup') || keys.has('w')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) dy += 1;
  if (touchMove.active) { dx += touchMove.x; dy += touchMove.y; }
  const len = Math.hypot(dx, dy) || 1;
  p.x += (dx / len) * p.speed * dt;
  p.y += (dy / len) * p.speed * dt;
  p.x = clamp(p.x, 0, W - p.w);
  p.y = clamp(p.y, 0, H - p.h);

  const wantsFire = keys.has(' ') || keys.has('j') || firingTouch;
  if (wantsFire && p.cooldown <= 0) {
    shootPlayer();
    p.cooldown = p.weapon === 'pierce' ? 0.24 : 0.14;
  }
  if (p.missileLevel > 0 && p.missileCooldown <= 0) {
    spawnMissiles();
    p.missileCooldown = 0.92 - p.missileLevel * 0.07;
  }

  state.stars.forEach(s => {
    s.y += s.speed * (0.6 + s.layer) * dt;
    s.rot += dt;
    if (s.y > H + 16) { s.y = -20; s.x = Math.random() * W; }
  });

  state.bullets.forEach(b => {
    b.x += (b.vx || 0) * dt;
    b.y -= b.speed * dt;
  });
  state.bullets = state.bullets.filter(b => b.y > -40 && b.x > -40 && b.x < W + 40);

  state.missiles.forEach(m => {
    const targets = [...state.enemies];
    if (state.boss) targets.push(state.boss);
    let nearest = null;
    let best = Infinity;
    for (const t of targets) {
      if (!t || t.hp <= 0) continue;
      const tx = t.x + t.w / 2;
      const ty = t.y + t.h / 2;
      const d = Math.hypot(tx - m.x, ty - m.y);
      if (ty < m.y && d < best) { best = d; nearest = t; }
    }
    if (m.y > m.armY) {
      m.y -= m.speed * 0.92 * dt;
      m.x += m.vx * dt;
      m.vx *= 0.985;
    } else if (nearest) {
      const ax = nearest.x + nearest.w / 2 - m.x;
      const ay = nearest.y + nearest.h / 2 - m.y;
      const d = Math.hypot(ax, ay) || 1;
      m.x += (ax / d) * 200 * dt;
      m.y += (ay / d) * 200 * dt;
    } else {
      m.y -= m.speed * dt;
      m.x += m.drift * 30 * dt;
    }
  });
  state.missiles = state.missiles.filter(m => m.y > -80 && m.x > -60 && m.x < W + 60);

  state.enemyBullets.forEach(b => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (intersects(b, p)) {
      b.y = H + 200;
      hitPlayer();
    }
  });
  state.enemyBullets = state.enemyBullets.filter(b => b.y < H + 40 && b.x > -50 && b.x < W + 50);

  state.enemies.forEach(enemy => {
    enemy.hitFlash = Math.max(0, enemy.hitFlash - dt);
    enemy.fireCooldown -= dt;
    if (enemy.kind === 'zigzag') {
      enemy.y += enemy.speed * dt;
      enemy.x += Math.sin(enemy.phase + enemy.y / 38) * 115 * dt;
    } else if (enemy.kind === 'sweeper') {
      enemy.y += enemy.speed * 0.8 * dt;
      enemy.x += Math.cos(enemy.phase + enemy.y / 50) * 175 * dt;
    } else if (enemy.kind === 'turret') {
      enemy.y += enemy.speed * dt * 0.55;
    } else if (enemy.kind === 'ace') {
      enemy.y += enemy.speed * dt;
      enemy.x += Math.sin(enemy.phase + enemy.y / 30) * 150 * dt;
    } else if (enemy.kind === 'gunship') {
      enemy.y += enemy.speed * dt * 0.68;
      enemy.x += Math.sin(enemy.phase + enemy.y / 65) * 70 * dt;
    } else if (enemy.miniBoss) {
      if (enemy.y < 70) enemy.y += 80 * dt;
      else enemy.x = W / 2 - enemy.w / 2 + Math.sin((performance.now() / 1000) * 0.9) * 90;
    } else {
      enemy.y += enemy.speed * dt;
    }

    if (enemy.fireCooldown <= 0 && enemy.y > 24) {
      if (enemy.kind === 'turret') aimedShot(enemy, 165, 0.18, 5, '#ff9f43');
      else if (enemy.kind === 'ace') aimedShot(enemy, 205, 0.09, 3, '#ff5f7a');
      else if (enemy.kind === 'sweeper') aimedShot(enemy, 175, 0.3, 3, '#a77bff');
      else if (enemy.kind === 'gunship') radialShot(enemy, 8, 135, '#ff9f43');
      else if (enemy.kind === 'gunshipElite') { aimedShot(enemy, 190, 0.18, 7, '#ff5f7a'); radialShot(enemy, 10, 120, '#ffd166'); }
      else if (enemy.kind === 'stormCore') { radialShot(enemy, 14, 148, '#a77bff'); aimedShot(enemy, 200, 0.08, 5, '#ff6b9b'); }
      else if (enemy.kind === 'forgeEye') { radialShot(enemy, 16, 165, '#ff9f43'); aimedShot(enemy, 215, 0.06, 7, '#ff5f7a'); }
      else aimedShot(enemy, 175, 0, 1, '#9b6bff');
      enemy.fireCooldown = enemy.miniBoss ? rand(0.65, 1.1) : enemy.kind === 'gunship' ? 1.5 : rand(1.0, 2.1);
      sfx('bossShot');
    }

    if (intersects(enemy, p)) {
      enemy.hp = 0;
      hitPlayer();
    }
  });

  bossBehavior(dt);

  for (const bullet of state.bullets) {
    let consumed = false;
    for (const enemy of state.enemies) {
      if (enemy.hp > 0 && intersects(bullet, enemy)) {
        enemy.hp -= bullet.damage || 1;
        enemy.hitFlash = 0.08;
        burst(bullet.x, bullet.y, '#fff29a', 5, 95);
        sfx('enemyHit');
        if (!bullet.pierce) { bullet.y = -999; consumed = true; }
        else bullet.pierce -= 1;
        if (enemy.hp <= 0) defeatEnemy(enemy);
        if (consumed) break;
      }
    }
    if (state.boss && state.boss.hp > 0 && intersects(bullet, state.boss)) {
      state.boss.hp -= bullet.damage || 1;
      state.boss.hitFlash = 0.1;
      burst(bullet.x, bullet.y, '#fff29a', 5, 110);
      sfx('enemyHit');
      if (!bullet.pierce) bullet.y = -999; else bullet.pierce -= 1;
      if (state.boss.hp <= 0) defeatBoss();
      updateBossHud();
    }
  }

  for (const m of state.missiles) {
    let hit = false;
    for (const enemy of state.enemies) {
      if (enemy.hp > 0 && intersects(m, enemy)) {
        enemy.hp -= m.damage;
        enemy.hitFlash = 0.14;
        burst(m.x + 8, m.y + 10, '#ffb347', 12, 150);
        shake(4);
        if (enemy.hp <= 0) defeatEnemy(enemy);
        hit = true;
        break;
      }
    }
    if (!hit && state.boss && state.boss.hp > 0 && intersects(m, state.boss)) {
      state.boss.hp -= m.damage + 1;
      state.boss.hitFlash = 0.16;
      burst(m.x + 8, m.y + 10, '#ffb347', 14, 160);
      shake(5);
      if (state.boss.hp <= 0) defeatBoss();
      updateBossHud();
      hit = true;
    }
    if (hit) m.y = -999;
  }

  state.enemies = state.enemies.filter(e => e.hp > 0 && e.y < H + 120 && e.x > -160 && e.x < W + 160);

  state.powerUps.forEach(item => {
    item.y += item.speed * dt;
    item.x += Math.sin((performance.now() + item.bob) / 250) * 18 * dt;
    if (intersects(item, p)) {
      applyPowerUp(item);
      item.y = H + 200;
    }
  });
  state.powerUps = state.powerUps.filter(i => i.y < H + 40);

  state.particles.forEach(pt => {
    pt.vy += pt.gravity * dt;
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  });
  state.particles = state.particles.filter(pt => pt.life > 0);

  state.overlays.forEach(o => o.duration -= dt);
  state.overlays = state.overlays.filter(o => o.duration > 0);

  updateHud();
  updateBossHud();
}

function drawTerrain() {
  const [c1, c2, c3] = state.stage.sky;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.55, c2);
  grad.addColorStop(1, c3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  if (state.stage.terrain === 'islands') {
    ctx.fillStyle = 'rgba(38, 110, 72, 0.24)';
    for (let i = 0; i < 6; i++) {
      const y = ((i * 160) + state.terrainOffset * (0.8 + i * 0.06)) % (H + 180) - 180;
      ctx.beginPath();
      ctx.moveTo(0, y + 90);
      ctx.quadraticCurveTo(W * 0.2, y, W * 0.5, y + 65);
      ctx.quadraticCurveTo(W * 0.75, y + 130, W, y + 40);
      ctx.lineTo(W, y + 180);
      ctx.lineTo(0, y + 180);
      ctx.closePath();
      ctx.fill();
    }
  } else if (state.stage.terrain === 'clouds') {
    for (let i = 0; i < 9; i++) {
      const y = ((i * 120) + state.terrainOffset * (0.9 + i * 0.03)) % (H + 140) - 140;
      ctx.fillStyle = i % 2 ? 'rgba(220,230,255,0.08)' : 'rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.ellipse((i * 70) % W, y + 30, 80, 28, 0, 0, Math.PI * 2);
      ctx.ellipse(((i * 70) + 140) % W, y + 58, 100, 32, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (state.stage.terrain === 'lava') {
    for (let i = 0; i < 8; i++) {
      const y = ((i * 110) + state.terrainOffset) % (H + 140) - 140;
      ctx.fillStyle = 'rgba(255,90,40,0.12)';
      ctx.beginPath();
      ctx.moveTo(0, y + 100);
      ctx.quadraticCurveTo(W * 0.3, y + 10, W * 0.55, y + 85);
      ctx.quadraticCurveTo(W * 0.75, y + 130, W, y + 30);
      ctx.lineTo(W, y + 170);
      ctx.lineTo(0, y + 170);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,200,120,0.08)';
      ctx.stroke();
    }
  }

  ctx.strokeStyle = 'rgba(180,220,255,0.05)';
  for (let y = 0; y < H; y += 56) {
    const py = (y + state.terrainOffset * 0.7) % (H + 56);
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(W, py);
    ctx.stroke();
  }

  state.stars.forEach(s => {
    if (images.star.complete && images.star.naturalWidth) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = 0.25 + s.layer * 0.5;
      ctx.drawImage(images.star, -s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    } else {
      ctx.globalAlpha = 0.4 + s.layer * 0.4;
      ctx.fillStyle = '#fff';
      ctx.fillRect(s.x, s.y, 2, 2);
    }
  });
  ctx.globalAlpha = 1;
}

function drawShip(obj, image, fallbackColor, rotation = 0) {
  if (image?.complete && image.naturalWidth) {
    ctx.save();
    ctx.translate(obj.x + obj.w / 2, obj.y + obj.h / 2);
    ctx.rotate(rotation);
    ctx.drawImage(image, -obj.w / 2, -obj.h / 2, obj.w, obj.h);
    ctx.restore();
  } else {
    ctx.fillStyle = fallbackColor;
    ctx.beginPath();
    ctx.moveTo(obj.x + obj.w / 2, obj.y);
    ctx.lineTo(obj.x + obj.w, obj.y + obj.h);
    ctx.lineTo(obj.x, obj.y + obj.h);
    ctx.closePath();
    ctx.fill();
  }
}

function drawEntityHealth(entity) {
  if (!entity.maxHp || entity.maxHp <= 10) return;
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fillRect(entity.x, entity.y - 8, entity.w, 4);
  ctx.fillStyle = entity.miniBoss ? '#ffd166' : '#7ef29a';
  ctx.fillRect(entity.x, entity.y - 8, entity.w * (entity.hp / entity.maxHp), 4);
}

function draw() {
  const shakeX = state.shake ? rand(-state.shake, state.shake) : 0;
  const shakeY = state.shake ? rand(-state.shake, state.shake) : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawTerrain();

  state.powerUps.forEach(i => {
    const glow = 8 + Math.sin((performance.now() + i.bob) / 140) * 4;
    ctx.save();
    ctx.shadowBlur = glow;
    ctx.shadowColor = i.type === 'bomb' ? '#ff7f50' : i.type === 'missile' ? '#ffd166' : i.type === 'weapon' ? '#ff6bff' : i.type === 'life' ? '#7ef29a' : '#64f0ff';
    ctx.fillStyle = i.type === 'power' ? '#64f0ff' : i.type === 'bomb' ? '#ff7f50' : i.type === 'missile' ? '#ffd166' : i.type === 'weapon' ? '#f19cff' : '#7ef29a';
    ctx.beginPath();
    ctx.arc(i.x + 13, i.y + 13, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#051018';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(i.type === 'power' ? 'P' : i.type === 'bomb' ? 'B' : i.type === 'missile' ? 'M' : i.type === 'weapon' ? 'W' : '1', i.x + 13, i.y + 18);
  });

  state.bullets.forEach(b => {
    ctx.fillStyle = b.color || '#ffe86b';
    ctx.shadowBlur = 10;
    ctx.shadowColor = b.color || '#ffe86b';
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });
  ctx.shadowBlur = 0;

  state.enemyBullets.forEach(b => {
    ctx.fillStyle = b.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = b.color;
    ctx.beginPath();
    ctx.arc(b.x + b.w / 2, b.y + b.h / 2, b.w / 2 + 1.3, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.shadowBlur = 0;

  state.missiles.forEach(m => {
    const img = m.kind === 'red' ? images.missileRed : images.missile;
    if (img.complete && img.naturalWidth) ctx.drawImage(img, m.x, m.y, m.w, m.h);
    else { ctx.fillStyle = m.kind === 'red' ? '#ff7f90' : '#ffd166'; ctx.fillRect(m.x, m.y, m.w, m.h); }
    ctx.fillStyle = 'rgba(255,190,110,0.55)';
    ctx.fillRect(m.x + m.w / 2 - 2, m.y + m.h, 4, 10);
  });

  state.enemies.forEach(e => {
    const img = e.sprite === 'enemyTurret' ? images.enemyTurret : e.sprite === 'boss' ? images.boss : e.sprite === 'enemyAlt' ? images.enemyAlt : images.enemy;
    ctx.save();
    if (e.hitFlash > 0) {
      ctx.globalAlpha = 0.8 + Math.sin(performance.now() / 25) * 0.2;
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#ffffff';
    }
    drawShip(e, img, e.miniBoss ? '#ffd166' : '#ff5f7a', e.kind === 'ace' ? Math.PI : 0);
    ctx.restore();
    drawEntityHealth(e);
  });

  if (state.boss) {
    ctx.save();
    if (state.boss.hitFlash > 0) {
      ctx.globalAlpha = 0.75 + Math.sin(performance.now() / 20) * 0.25;
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#fff';
    } else {
      ctx.shadowBlur = 22;
      ctx.shadowColor = 'rgba(255,95,122,0.28)';
    }
    drawShip(state.boss, images.boss, '#ff3c6f');
    ctx.restore();
  }

  const p = state.player;
  if (p) {
    const ox1 = Math.cos(p.optionAngle) * 18;
    const ox2 = Math.cos(p.optionAngle + Math.PI) * 18;
    ctx.fillStyle = 'rgba(100,240,255,0.28)';
    ctx.beginPath();
    ctx.arc(p.x + p.w / 2 + ox1, p.y + p.h / 2 + 12, 6, 0, Math.PI * 2); ctx.fill();
    if (p.power >= 3) { ctx.beginPath(); ctx.arc(p.x + p.w / 2 + ox2, p.y + p.h / 2 + 12, 6, 0, Math.PI * 2); ctx.fill(); }
    ctx.save();
    if (p.invuln > 0) ctx.globalAlpha = 0.45 + Math.sin(performance.now() / 40) * 0.25;
    ctx.shadowBlur = p.chargeFlash > 0 ? 18 : 10;
    ctx.shadowColor = '#64f0ff';
    drawShip(p, images.player, '#64f0ff', -Math.PI / 4);
    ctx.restore();
    ctx.fillStyle = 'rgba(100,240,255,0.45)';
    ctx.fillRect(p.x + p.w / 2 - 4, p.y + p.h - 4, 8, 14);
  }

  state.particles.forEach(pt => {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    if (pt.glow) {
      ctx.shadowBlur = pt.glow;
      ctx.shadowColor = pt.color;
    }
    ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
  });
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();

  if (state.flash > 0) {
    ctx.fillStyle = `rgba(255,255,255,${state.flash})`;
    ctx.fillRect(0, 0, W, H);
  }

  const activeOverlay = state.overlays[0];
  if (activeOverlay) {
    const alpha = Math.min(1, activeOverlay.duration / 0.45, activeOverlay.max ? (activeOverlay.max - activeOverlay.duration + 0.3) / 0.45 : 1);
    ctx.save();
    ctx.globalAlpha = clamp(alpha, 0, 1);
    ctx.textAlign = 'center';
    ctx.fillStyle = activeOverlay.tone === 'warning' ? '#ffcf7c' : '#ffffff';
    ctx.font = '800 30px Inter, system-ui, sans-serif';
    ctx.fillText(activeOverlay.text, W / 2, 120);
    if (activeOverlay.sub) {
      ctx.fillStyle = '#b8e8ff';
      ctx.font = '600 16px Inter, system-ui, sans-serif';
      ctx.fillText(activeOverlay.sub, W / 2, 146);
    }
    ctx.restore();
  }

  if (paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.font = '800 34px Inter, system-ui, sans-serif';
    ctx.fillText('PAUSED', W / 2, H / 2 - 12);
    ctx.font = '600 15px Inter, system-ui, sans-serif';
    ctx.fillText('P to resume • Enter to restart • M to mute', W / 2, H / 2 + 18);
  }
}

function loop(ts) {
  const dt = Math.min(0.033, (ts - lastTime) / 1000 || 0);
  lastTime = ts;
  if (running && !paused) update(dt);
  draw();
  requestAnimationFrame(loop);
}

function startGame() {
  ensureAudio();
  resetGame();
}

function toggleMute() {
  state.muted = !state.muted;
  localStorage.setItem(MUTE_KEY, state.muted ? '1' : '0');
  if (muteBtn) muteBtn.textContent = state.muted ? '🔇 Sound Off' : '🔊 Sound On';
}

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys.add(key);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
  if (key === 'enter' && !running) startGame();
  else if (key === 'enter' && paused) startGame();
  if (key === 'p' && running) paused = !paused;
  if (key === 'b' && running && !paused) bomb();
  if (key === 'm') toggleMute();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

if (startBtn) startBtn.addEventListener('click', startGame);
if (muteBtn) muteBtn.addEventListener('click', () => { ensureAudio(); toggleMute(); });
if (overlay) overlay.addEventListener('click', (e) => {
  if (!running && (e.target === overlay || e.target === panel)) startGame();
});

function updateStick(clientX, clientY) {
  const rect = stick.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const len = Math.hypot(dx, dy);
  const max = rect.width * 0.32;
  if (len > max) {
    dx = (dx / len) * max;
    dy = (dy / len) * max;
  }
  stickKnob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  touchMove.x = dx / max;
  touchMove.y = dy / max;
  touchMove.active = true;
}

function resetStick() {
  stickKnob.style.transform = 'translate(-50%, -50%)';
  touchMove.x = 0;
  touchMove.y = 0;
  touchMove.active = false;
}

stick.addEventListener('pointerdown', (e) => { ensureAudio(); stick.setPointerCapture(e.pointerId); updateStick(e.clientX, e.clientY); });
stick.addEventListener('pointermove', (e) => { if (e.pressure > 0) updateStick(e.clientX, e.clientY); });
stick.addEventListener('pointerup', resetStick);
stick.addEventListener('pointercancel', resetStick);
fireBtn.addEventListener('pointerdown', () => { ensureAudio(); firingTouch = true; if (!running) startGame(); });
fireBtn.addEventListener('pointerup', () => { firingTouch = false; });
fireBtn.addEventListener('pointercancel', () => { firingTouch = false; });
bombBtn.addEventListener('pointerdown', () => { ensureAudio(); if (running) bomb(); else startGame(); });

requestAnimationFrame(loop);
