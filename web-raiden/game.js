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
      { gap: 0.86, formation: 'vee', enemies: ['grunt','grunt','zigzag','grunt','zigzag','grunt'] },
      { gap: 0.78, formation: 'leftHook', enemies: ['sweeper','grunt','zigzag','sweeper','grunt','zigzag'] },
      { gap: 0.72, formation: 'wall', enemies: ['turret','grunt','turret','zigzag','grunt','zigzag'] },
      { gap: 0.7, formation: 'arc', enemies: ['sweeper','zigzag','gunship','grunt','sweeper'] },
    ],
    miniboss: { kind: 'gunshipElite', label: 'Aegis Interceptor' },
    boss: { kind: 'carrier', label: 'Coastbreaker Carrier', hp: 190 },
  },
  {
    id: 2,
    name: 'Sunset Straits',
    subtitle: 'convoy interdiction',
    sky: ['#4a254d', '#251436', '#0a0a16'],
    terrain: 'islands',
    musicHue: 320,
    waves: [
      { gap: 0.82, formation: 'rightHook', enemies: ['zigzag','grunt','zigzag','sweeper','grunt','zigzag'] },
      { gap: 0.76, formation: 'columns', enemies: ['turret','sweeper','grunt','turret','grunt','zigzag'] },
      { gap: 0.72, formation: 'vee', enemies: ['ace','zigzag','sweeper','ace','zigzag'] },
      { gap: 0.68, formation: 'arc', enemies: ['gunship','grunt','ace','zigzag','sweeper'] },
    ],
    miniboss: { kind: 'gunshipElite', label: 'Harrier Command Ship' },
    boss: { kind: 'carrier', label: 'Redwake Flag Carrier', hp: 235 },
  },
  {
    id: 3,
    name: 'Storm Front',
    subtitle: 'high-altitude assault',
    sky: ['#1b244e', '#11172f', '#090c15'],
    terrain: 'clouds',
    musicHue: 265,
    waves: [
      { gap: 0.74, formation: 'arc', enemies: ['zigzag','ace','zigzag','sweeper','ace','zigzag'] },
      { gap: 0.7, formation: 'staggered', enemies: ['turret','ace','sweeper','ace','zigzag','ace'] },
      { gap: 0.66, formation: 'centerRush', enemies: ['gunship','sweeper','ace','grunt','ace'] },
      { gap: 0.64, formation: 'columns', enemies: ['ace','zigzag','turret','ace','sweeper','zigzag'] },
    ],
    miniboss: { kind: 'stormCore', label: 'Tempest Core' },
    boss: { kind: 'dreadnought', label: 'Storm Dreadnought', hp: 275 },
  },
  {
    id: 4,
    name: 'Midnight Rail',
    subtitle: 'fortress approach corridor',
    sky: ['#172136', '#0b1220', '#04070e'],
    terrain: 'clouds',
    musicHue: 220,
    waves: [
      { gap: 0.68, formation: 'columns', enemies: ['ace','sweeper','ace','zigzag','ace','sweeper'] },
      { gap: 0.64, formation: 'wall', enemies: ['turret','gunship','grunt','turret','ace','grunt'] },
      { gap: 0.62, formation: 'leftHook', enemies: ['sweeper','ace','sweeper','ace','gunship','ace'] },
      { gap: 0.58, formation: 'centerRush', enemies: ['turret','ace','zigzag','ace','turret','ace'] },
    ],
    miniboss: { kind: 'stormCore', label: 'Blackout Reactor' },
    boss: { kind: 'dreadnought', label: 'Nightspike Arsenal', hp: 325 },
  },
  {
    id: 5,
    name: 'Ashen Rift',
    subtitle: 'thermal defense belt',
    sky: ['#412114', '#22110f', '#090506'],
    terrain: 'lava',
    musicHue: 24,
    waves: [
      { gap: 0.62, formation: 'arc', enemies: ['ace','sweeper','gunship','ace','zigzag','sweeper'] },
      { gap: 0.6, formation: 'columns', enemies: ['turret','gunship','ace','sweeper','grunt','turret'] },
      { gap: 0.56, formation: 'wall', enemies: ['gunship','ace','turret','ace','gunship','zigzag'] },
      { gap: 0.54, formation: 'centerRush', enemies: ['ace','sweeper','turret','gunship','ace','turret'] },
    ],
    miniboss: { kind: 'forgeEye', label: 'Forge Eye' },
    boss: { kind: 'overlord', label: 'Molten Bastion', hp: 380 },
  },
  {
    id: 6,
    name: 'Crimson Furnace',
    subtitle: 'reactor crown breach',
    sky: ['#411926', '#1f0e16', '#09050a'],
    terrain: 'lava',
    musicHue: 15,
    waves: [
      { gap: 0.58, formation: 'staggered', enemies: ['ace','sweeper','ace','gunship','zigzag','ace','sweeper'] },
      { gap: 0.56, formation: 'wall', enemies: ['turret','gunship','ace','sweeper','turret','ace'] },
      { gap: 0.52, formation: 'columns', enemies: ['gunship','ace','turret','gunship','ace','turret'] },
      { gap: 0.5, formation: 'centerRush', enemies: ['ace','sweeper','turret','gunship','ace','sweeper','turret'] },
    ],
    miniboss: { kind: 'forgeEye', label: 'Smelter Citadel Eye' },
    boss: { kind: 'overlord', label: 'Iron Overlord', hp: 445 },
  },
  {
    id: 7,
    name: 'Void Apex',
    subtitle: 'final command citadel',
    sky: ['#1a1337', '#0a0b18', '#020206'],
    terrain: 'voidstorm',
    musicHue: 280,
    waves: [
      { gap: 0.54, formation: 'arc', enemies: ['ace','gunship','ace','sweeper','ace','turret','gunship'] },
      { gap: 0.5, formation: 'wall', enemies: ['turret','ace','gunship','turret','ace','sweeper','turret'] },
      { gap: 0.48, formation: 'columns', enemies: ['gunship','ace','sweeper','gunship','ace','turret','ace'] },
      { gap: 0.46, formation: 'centerRush', enemies: ['ace','sweeper','turret','gunship','ace','turret','gunship'] },
    ],
    miniboss: { kind: 'forgeEye', label: 'Apex Warden' },
    boss: { kind: 'overlord', label: 'Celestial Tyrant', hp: 520 },
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
  stageTransition: 0,
  stageTransitionMode: 'none',
  bossBanner: 0,
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
function playerHitbox() {
  const p = state.player;
  return { x: p.x + 14, y: p.y + 10, w: p.w - 28, h: p.h - 22 };
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
  state.stars = Array.from({ length: 130 }, () => ({
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
    y: H - 120,
    w: 48,
    h: 48,
    speed: 340,
    cooldown: 0,
    missileCooldown: 0,
    invuln: 0,
    lives: 4,
    bombs: 3,
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
  state.stageTransition = 1.8;
  state.stageTransitionMode = 'stage';
  state.bossBanner = 0;
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
  const type = forcedType || (roll < 0.34 ? 'power' : roll < 0.58 ? 'bomb' : roll < 0.8 ? 'missile' : roll < 0.9 ? 'weapon' : 'life');
  state.powerUps.push({ x, y, w: 28, h: 28, type, speed: 95, bob: Math.random() * 1000 });
}

function enemyBase(kind, x = rand(20, W - 60), y = -60) {
  const bases = {
    grunt: { w: 42, h: 42, speed: 108, hp: 2, score: 90, fire: 2.25, sprite: 'enemy' },
    zigzag: { w: 42, h: 42, speed: 120, hp: 3, score: 130, fire: 1.8, sprite: 'enemyAlt' },
    sweeper: { w: 48, h: 48, speed: 132, hp: 4, score: 160, fire: 1.65, sprite: 'enemyAlt' },
    turret: { w: 58, h: 58, speed: 62, hp: 7, score: 220, fire: 2.2, sprite: 'enemyTurret' },
    ace: { w: 50, h: 50, speed: 142, hp: 5, score: 200, fire: 1.42, sprite: 'enemyAlt' },
    gunship: { w: 70, h: 62, speed: 76, hp: 14, score: 420, fire: 1.55, sprite: 'boss' },
    gunshipElite: { w: 92, h: 82, speed: 74, hp: 60, score: 1800, fire: 1.02, sprite: 'boss', miniBoss: true },
    stormCore: { w: 98, h: 98, speed: 68, hp: 78, score: 2200, fire: 0.96, sprite: 'boss', miniBoss: true },
    forgeEye: { w: 104, h: 100, speed: 70, hp: 96, score: 2600, fire: 0.92, sprite: 'boss', miniBoss: true },
  };
  const base = bases[kind];
  return {
    kind,
    x, y,
    w: base.w,
    h: base.h,
    speed: base.speed,
    hp: base.hp + Math.max(0, state.stage.id - 1) * (base.miniBoss ? 4 : 0),
    maxHp: base.hp + Math.max(0, state.stage.id - 1) * (base.miniBoss ? 4 : 0),
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

function expandWaveEntries(wave) {
  if (!wave) return null;
  const formation = wave.formation || 'random';
  const laneXs = [84, 156, 228, 300, 372, 444, 516, 588, 648];
  const entries = wave.enemies.map((kind, i) => {
    const t = wave.enemies.length <= 1 ? 0.5 : i / (wave.enemies.length - 1);
    let x = rand(28, W - 88);
    let y = -60 - i * 24;
    let delay = 0;
    if (formation === 'line') {
      x = lerp(110, W - 110, t) - 22;
    } else if (formation === 'vee') {
      const mid = (wave.enemies.length - 1) / 2;
      const dist = Math.abs(i - mid);
      x = W / 2 - 30 + (i < mid ? -1 : 1) * dist * 62;
      y -= dist * 22;
    } else if (formation === 'wall') {
      x = laneXs[i % laneXs.length] - 22;
      y = -70 - Math.floor(i / laneXs.length) * 64;
      delay = Math.floor(i / laneXs.length) * 0.12;
    } else if (formation === 'leftHook') {
      x = 56 + i * 60;
      y -= i * 18;
    } else if (formation === 'rightHook') {
      x = W - 96 - i * 60;
      y -= i * 18;
    } else if (formation === 'columns') {
      x = i % 2 === 0 ? 150 + Math.floor(i / 2) * 76 : W - 220 - Math.floor(i / 2) * 76;
      y = -70 - Math.floor(i / 2) * 56;
      delay = (i % 2) * 0.1;
    } else if (formation === 'arc') {
      x = lerp(100, W - 100, t) - 22;
      y -= Math.sin(t * Math.PI) * 78;
    } else if (formation === 'centerRush') {
      x = W / 2 - 24 + (i % 2 === 0 ? -1 : 1) * (30 + Math.floor(i / 2) * 40);
      y -= Math.floor(i / 2) * 34;
      delay = 0.05 * i;
    } else if (formation === 'staggered') {
      x = laneXs[(i * 2) % laneXs.length] - 22;
      y = -70 - i * 34;
      delay = (i % 2) * 0.08;
    }
    return { kind, x: clamp(x, 18, W - 90), y, delay };
  });
  return entries;
}

function queueWave(index) {
  const wave = state.stage.waves[index];
  state.queuedWave = expandWaveEntries(wave);
  state.waveGap = wave?.gap ?? 0.9;
  state.waveSpawnTimer = 0.18;
}

function startNextStage() {
  state.stageIndex += 1;
  if (state.stageIndex >= STAGES.length) {
    winGame();
    return;
  }
  state.stage = currentStage();
  state.stagePhase = 'intro';
  state.phaseTimer = 2.9;
  state.stageTransition = 1.9;
  state.stageTransitionMode = 'stage';
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
    w: kind === 'carrier' ? 190 : kind === 'dreadnought' ? 206 : 220,
    h: kind === 'overlord' ? 166 : kind === 'dreadnought' ? 146 : 136,
    hp,
    maxHp: hp,
    phase: 0,
    fireCooldown: Math.max(0.5, 0.8 - state.stage.id * 0.03),
    altCooldown: Math.max(1.1, 1.8 - state.stage.id * 0.05),
    enter: true,
    hitFlash: 0,
  };
  state.stagePhase = 'boss';
  state.phaseTimer = 999;
  state.bossBanner = 2.8;
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
    spawnPowerUp(cx - 18, cy - 16, 'weapon');
    spawnPowerUp(cx + 14, cy - 20, 'missile');
    spawnPowerUp(cx - 2, cy + 6, 'bomb');
    state.stagePhase = 'bossIntro';
    state.phaseTimer = 2.2;
    pushOverlay('Route Clear', 'Main hostile incoming', 1.8, 'stage');
  } else if (Math.random() < 0.32 || enemy.kind === 'gunship') {
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
  if (state.stage.id < STAGES.length) state.player.lives = Math.min(5, state.player.lives + 1);
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
  p.invuln = 3.2;
  p.power = Math.max(1, p.power - (p.power >= 4 ? 1 : 0));
  p.missileLevel = Math.max(0, p.missileLevel - (p.missileLevel >= 2 ? 1 : 0));
  if (p.weapon !== 'pulse' && Math.random() < 0.25) p.weapon = 'pulse';
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
    <div class="eyebrow">campaign lost • enemy command survives</div>
    <h1>Mission Failed</h1>
    <p>Your squadron was downed before the last objective was secured.</p>
    <p>Score: <strong>${state.score}</strong></p>
    <p>High Score: <strong>${state.highscore}</strong></p>
    <p class="hint">Enter or click to launch again</p>
    <div class="actions"><button id="startBtn2">Retry Sortie</button></div>
  `;
  const btn = document.getElementById('startBtn2');
  if (btn) btn.addEventListener('click', startGame);
}

function winGame() {
  running = false;
  gameOver = true;
  overlay.classList.remove('hidden');
  const accuracyBonus = state.player ? state.player.lives * 250 + state.player.bombs * 150 : 0;
  const campaignTotal = state.score + accuracyBonus;
  if (campaignTotal > state.highscore) {
    state.highscore = campaignTotal;
    localStorage.setItem(HIGH_KEY, String(state.highscore));
  }
  panel.innerHTML = `
    <div class="eyebrow">campaign complete • seven stages cleared</div>
    <h1>Sky Secured</h1>
    <p>The Celestial Tyrant is gone. Allied carriers now control the corridor from Emerald Coast to Void Apex.</p>
    <div class="controls endcards">
      <div><strong>Final Score</strong><span>${state.score}</span></div>
      <div><strong>Campaign Bonus</strong><span>${accuracyBonus}</span></div>
      <div><strong>Final Total</strong><span>${campaignTotal}</span></div>
      <div><strong>High Score</strong><span>${state.highscore}</span></div>
    </div>
    <p class="hint">Desktop arcade run complete — Enter or click to fly it again</p>
    <div class="actions"><button id="startBtn2">New Campaign</button></div>
  `;
  highEl.textContent = state.highscore;
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
  const stageBoost = Math.max(0, state.stage.id - 1);
  if (b.kind === 'carrier') {
    b.x = W / 2 - b.w / 2 + Math.sin(b.phase * (0.95 + stageBoost * 0.02)) * 125;
    b.fireCooldown -= dt;
    b.altCooldown -= dt;
    if (b.fireCooldown <= 0) {
      aimedShot(b, 150 + stageBoost * 4, 0.12, 4 + Math.floor(stageBoost / 2), '#ff8c69');
      b.fireCooldown = Math.max(0.78, 1.22 - stageBoost * 0.04);
      sfx('bossShot');
    }
    if (b.altCooldown <= 0) {
      radialShot(b, 10 + stageBoost, 118 + stageBoost * 3, '#a77bff');
      b.altCooldown = Math.max(1.9, 3.2 - stageBoost * 0.12);
      sfx('bossShot');
    }
  } else if (b.kind === 'dreadnought') {
    b.x = W / 2 - b.w / 2 + Math.sin(b.phase * (0.62 + stageBoost * 0.03)) * 150;
    b.fireCooldown -= dt;
    b.altCooldown -= dt;
    if (b.fireCooldown <= 0) {
      aimedShot(b, 175 + stageBoost * 5, 0.09, 5 + Math.floor(stageBoost / 2), '#ff5f7a');
      b.fireCooldown = Math.max(0.7, 1.08 - stageBoost * 0.04);
      sfx('bossShot');
    }
    if (b.altCooldown <= 0) {
      radialShot(b, 12 + stageBoost, 132 + stageBoost * 3, '#ffd166');
      b.altCooldown = Math.max(1.7, 2.9 - stageBoost * 0.1);
      sfx('bossShot');
    }
  } else if (b.kind === 'overlord') {
    b.x = W / 2 - b.w / 2 + Math.sin(b.phase * (0.8 + stageBoost * 0.035)) * 170;
    b.fireCooldown -= dt;
    b.altCooldown -= dt;
    if (b.fireCooldown <= 0) {
      aimedShot(b, 192 + stageBoost * 6, 0.06, 6 + Math.floor(stageBoost / 2), '#ff6b9b');
      b.fireCooldown = Math.max(0.56, 0.98 - stageBoost * 0.035);
      sfx('bossShot');
    }
    if (b.altCooldown <= 0) {
      radialShot(b, 14 + stageBoost, 145 + stageBoost * 3, '#ffb347');
      b.altCooldown = Math.max(1.45, 2.35 - stageBoost * 0.08);
      sfx('bossShot');
    }
  }
  if (intersects(b, playerHitbox())) hitPlayer();
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
        const entry = state.queuedWave.shift();
        spawnEnemy(entry.kind, entry.x, entry.y);
        state.waveSpawnTimer = state.waveGap + (entry.delay || 0);
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
  state.stageTransition = Math.max(0, state.stageTransition - dt);
  state.bossBanner = Math.max(0, state.bossBanner - dt);
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
    p.cooldown = p.weapon === 'pierce' ? 0.22 : 0.13;
  }
  if (p.missileLevel > 0 && p.missileCooldown <= 0) {
    spawnMissiles();
    p.missileCooldown = 0.82 - p.missileLevel * 0.07;
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

  const pHitbox = playerHitbox();
  state.enemyBullets.forEach(b => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (intersects(b, pHitbox)) {
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
      if (enemy.y < 76) enemy.y += 80 * dt;
      else enemy.x = W / 2 - enemy.w / 2 + Math.sin((performance.now() / 1000) * (0.9 + state.stage.id * 0.03)) * (90 + state.stage.id * 8);
    } else {
      enemy.y += enemy.speed * dt;
    }

    if (enemy.fireCooldown <= 0 && enemy.y > 24) {
      if (enemy.kind === 'turret') aimedShot(enemy, 140 + state.stage.id * 3, 0.16, 3, '#ff9f43');
      else if (enemy.kind === 'ace') aimedShot(enemy, 175 + state.stage.id * 3, 0.08, 2, '#ff5f7a');
      else if (enemy.kind === 'sweeper') aimedShot(enemy, 152 + state.stage.id * 2, 0.22, 2, '#a77bff');
      else if (enemy.kind === 'gunship') radialShot(enemy, 6 + Math.floor(state.stage.id / 3), 118 + state.stage.id * 2, '#ff9f43');
      else if (enemy.kind === 'gunshipElite') { aimedShot(enemy, 165 + state.stage.id * 4, 0.15, 5, '#ff5f7a'); radialShot(enemy, 8 + Math.floor(state.stage.id / 2), 108 + state.stage.id * 2, '#ffd166'); }
      else if (enemy.kind === 'stormCore') { radialShot(enemy, 10 + Math.floor(state.stage.id / 2), 126 + state.stage.id * 2, '#a77bff'); aimedShot(enemy, 172 + state.stage.id * 4, 0.07, 4 + Math.floor(state.stage.id / 3), '#ff6b9b'); }
      else if (enemy.kind === 'forgeEye') { radialShot(enemy, 12 + Math.floor(state.stage.id / 2), 138 + state.stage.id * 2, '#ff9f43'); aimedShot(enemy, 182 + state.stage.id * 4, 0.05, 5 + Math.floor(state.stage.id / 3), '#ff5f7a'); }
      else aimedShot(enemy, 150 + state.stage.id * 2, 0, 1, '#9b6bff');
      enemy.fireCooldown = enemy.miniBoss ? rand(0.85, 1.28) : enemy.kind === 'gunship' ? 1.75 : rand(1.2, 2.3);
      sfx('bossShot');
    }

    if (intersects(enemy, pHitbox)) {
      if (!enemy.miniBoss && enemy.kind !== 'gunship') enemy.hp = 0;
      else enemy.hp -= enemy.miniBoss ? 12 : 8;
      enemy.hitFlash = 0.2;
      hitPlayer();
      if (enemy.hp <= 0) defeatEnemy(enemy);
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
  const stage = state.stage;
  const [c1, c2, c3] = stage.sky;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.55, c2);
  grad.addColorStop(1, c3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const sunX = W * (0.18 + stage.id * 0.09);
  const sunY = H * (0.12 + (stage.id % 3) * 0.04);
  const sun = ctx.createRadialGradient(sunX, sunY, 20, sunX, sunY, 180);
  sun.addColorStop(0, stage.terrain === 'lava' ? 'rgba(255,214,120,0.32)' : stage.terrain === 'voidstorm' ? 'rgba(175,120,255,0.2)' : 'rgba(255,255,255,0.16)');
  sun.addColorStop(0.4, stage.terrain === 'lava' ? 'rgba(255,110,40,0.18)' : stage.terrain === 'voidstorm' ? 'rgba(110,70,255,0.12)' : 'rgba(100,180,255,0.08)');
  sun.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, W, H);

  ctx.fillStyle = 'rgba(255,255,255,0.04)';
  for (let i = 0; i < 5; i++) {
    const bandY = (i * 180 + state.terrainOffset * (0.12 + i * 0.04)) % (H + 220) - 180;
    ctx.fillRect(0, bandY, W, 1);
  }

  if (stage.terrain === 'islands') {
    for (let i = 0; i < 7; i++) {
      const y = ((i * 154) + state.terrainOffset * (0.7 + i * 0.05)) % (H + 220) - 220;
      ctx.fillStyle = i % 2 ? 'rgba(42, 126, 88, 0.26)' : 'rgba(24, 74, 120, 0.22)';
      ctx.beginPath();
      ctx.moveTo(0, y + 105);
      ctx.quadraticCurveTo(W * 0.16, y + 10, W * 0.36, y + 76);
      ctx.quadraticCurveTo(W * 0.56, y + 138, W * 0.8, y + 44);
      ctx.quadraticCurveTo(W * 0.92, y + 16, W, y + 84);
      ctx.lineTo(W, y + 196);
      ctx.lineTo(0, y + 196);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(190, 255, 220, 0.05)';
      ctx.fillRect(0, y + 104, W, 2);
    }
    for (let i = 0; i < 11; i++) {
      const y = ((i * 92) + state.terrainOffset * (1.16 + i * 0.02)) % (H + 120) - 120;
      ctx.strokeStyle = 'rgba(160, 220, 255, 0.09)';
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.quadraticCurveTo(W * 0.34, y + 16, W * 0.68, y - 12);
      ctx.quadraticCurveTo(W * 0.86, y - 24, W, y + 8);
      ctx.stroke();
    }
  } else if (stage.terrain === 'clouds') {
    for (let i = 0; i < 12; i++) {
      const y = ((i * 96) + state.terrainOffset * (0.85 + i * 0.02)) % (H + 160) - 160;
      const xShift = ((i * 130) % W);
      ctx.fillStyle = i % 3 === 0 ? 'rgba(255,255,255,0.08)' : 'rgba(194,210,255,0.07)';
      ctx.beginPath();
      ctx.ellipse((xShift + 40) % W, y + 30, 90, 26, 0, 0, Math.PI * 2);
      ctx.ellipse((xShift + 140) % W, y + 52, 135, 32, 0, 0, Math.PI * 2);
      ctx.ellipse((xShift + 250) % W, y + 28, 82, 24, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      ctx.fillRect(0, y + 84, W, 1);
    }
    for (let i = 0; i < 6; i++) {
      const boltY = ((i * 160) + state.terrainOffset * 1.8) % (H + 240) - 180;
      const boltX = 80 + ((i * 117 + stage.id * 43) % (W - 160));
      ctx.strokeStyle = 'rgba(184, 204, 255, 0.12)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(boltX, boltY);
      ctx.lineTo(boltX - 18, boltY + 30);
      ctx.lineTo(boltX + 10, boltY + 54);
      ctx.lineTo(boltX - 10, boltY + 92);
      ctx.stroke();
    }
    ctx.lineWidth = 1;
  } else if (stage.terrain === 'lava') {
    for (let i = 0; i < 9; i++) {
      const y = ((i * 102) + state.terrainOffset * (0.95 + i * 0.04)) % (H + 180) - 160;
      ctx.fillStyle = i % 2 ? 'rgba(255,88,40,0.14)' : 'rgba(120,30,22,0.18)';
      ctx.beginPath();
      ctx.moveTo(0, y + 112);
      ctx.quadraticCurveTo(W * 0.22, y + 16, W * 0.5, y + 92);
      ctx.quadraticCurveTo(W * 0.72, y + 152, W, y + 46);
      ctx.lineTo(W, y + 196);
      ctx.lineTo(0, y + 196);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,215,140,0.07)';
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,208,120,0.08)';
      for (let v = 0; v < 4; v++) {
        const ventX = 70 + ((i * 83 + v * 146) % (W - 140));
        ctx.fillRect(ventX, y + 28 + v * 14, 10, 26);
      }
    }
  } else if (stage.terrain === 'voidstorm') {
    for (let i = 0; i < 11; i++) {
      const y = ((i * 92) + state.terrainOffset * (1.02 + i * 0.04)) % (H + 220) - 180;
      const purple = 80 + i * 10;
      ctx.fillStyle = `rgba(${purple}, 80, 255, 0.09)`;
      ctx.beginPath();
      ctx.moveTo(0, y + 64);
      ctx.quadraticCurveTo(W * 0.2, y - 18, W * 0.48, y + 74);
      ctx.quadraticCurveTo(W * 0.72, y + 148, W, y + 22);
      ctx.lineTo(W, y + 196);
      ctx.lineTo(0, y + 196);
      ctx.closePath();
      ctx.fill();
    }
    for (let i = 0; i < 22; i++) {
      const x = ((i * 61) + state.terrainOffset * 0.6) % W;
      const y = ((i * 89) + state.terrainOffset * 1.35) % (H + 120) - 60;
      ctx.fillStyle = 'rgba(208, 162, 255, 0.15)';
      ctx.fillRect(x, y, 2, 28);
      ctx.fillStyle = 'rgba(92, 212, 255, 0.12)';
      ctx.fillRect(x + 10, y + 14, 2, 18);
    }
  }

  for (let i = 0; i < 4; i++) {
    const bandY = (i * 210 + state.terrainOffset * (0.22 + i * 0.06)) % (H + 180) - 120;
    const band = ctx.createLinearGradient(0, bandY, 0, bandY + 120);
    band.addColorStop(0, 'rgba(255,255,255,0)');
    band.addColorStop(0.5, stage.terrain === 'lava' ? 'rgba(255,150,90,0.09)' : stage.terrain === 'clouds' ? 'rgba(170,180,255,0.08)' : stage.terrain === 'voidstorm' ? 'rgba(180,90,255,0.1)' : 'rgba(110,255,220,0.08)');
    band.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = band;
    ctx.fillRect(0, bandY, W, 120);
  }

  state.stars.forEach(s => {
    if (images.star.complete && images.star.naturalWidth) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = 0.18 + s.layer * (stage.terrain === 'voidstorm' ? 0.65 : 0.42);
      ctx.drawImage(images.star, -s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    } else {
      ctx.globalAlpha = 0.3 + s.layer * 0.4;
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
    ctx.font = '800 32px Inter, system-ui, sans-serif';
    ctx.fillText(activeOverlay.text, W / 2, 132);
    if (activeOverlay.sub) {
      ctx.fillStyle = '#b8e8ff';
      ctx.font = '600 17px Inter, system-ui, sans-serif';
      ctx.fillText(activeOverlay.sub, W / 2, 160);
    }
    ctx.restore();
  }

  if (state.stageTransition > 0) {
    const t = clamp(state.stageTransition / 1.9, 0, 1);
    const leftW = W * (0.5 * t);
    const rightW = W * (0.5 * t);
    ctx.fillStyle = 'rgba(2, 6, 14, 0.82)';
    ctx.fillRect(0, 0, leftW, H);
    ctx.fillRect(W - rightW, 0, rightW, H);
    ctx.strokeStyle = 'rgba(120, 224, 255, 0.35)';
    ctx.strokeRect(leftW - 2, 0, 2, H);
    ctx.strokeRect(W - rightW, 0, 2, H);
    ctx.fillStyle = `rgba(255,255,255,${0.08 + t * 0.14})`;
    ctx.fillRect(0, H * 0.48, W, 2);
  }

  if (state.bossBanner > 0 && state.boss) {
    const t = clamp(state.bossBanner / 2.8, 0, 1);
    const slide = (1 - t) * 60;
    ctx.save();
    ctx.globalAlpha = clamp(1 - Math.max(0, (0.34 - t) / 0.34), 0, 1);
    const bannerY = 208 + slide;
    const bannerH = 76;
    const grad = ctx.createLinearGradient(0, bannerY, W, bannerY + bannerH);
    grad.addColorStop(0, 'rgba(255,72,110,0.05)');
    grad.addColorStop(0.18, 'rgba(255,92,120,0.74)');
    grad.addColorStop(0.82, 'rgba(255,170,92,0.76)');
    grad.addColorStop(1, 'rgba(255,170,92,0.06)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, bannerY, W, bannerH);
    ctx.strokeStyle = 'rgba(255,242,180,0.32)';
    ctx.strokeRect(0, bannerY + 1, W, bannerH - 2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff4cf';
    ctx.font = '700 14px Inter, system-ui, sans-serif';
    ctx.fillText('BOSS APPROACH', W / 2, bannerY + 24);
    ctx.font = '900 30px Inter, system-ui, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(state.boss.label, W / 2, bannerY + 54);
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
  if (!stick || !stickKnob) return;
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
  if (stickKnob) stickKnob.style.transform = 'translate(-50%, -50%)';
  touchMove.x = 0;
  touchMove.y = 0;
  touchMove.active = false;
}

if (stick && stickKnob) {
  stick.addEventListener('pointerdown', (e) => { ensureAudio(); stick.setPointerCapture(e.pointerId); updateStick(e.clientX, e.clientY); });
  stick.addEventListener('pointermove', (e) => { if (e.pressure > 0) updateStick(e.clientX, e.clientY); });
  stick.addEventListener('pointerup', resetStick);
  stick.addEventListener('pointercancel', resetStick);
}
if (fireBtn) {
  fireBtn.addEventListener('pointerdown', () => { ensureAudio(); firingTouch = true; if (!running) startGame(); });
  fireBtn.addEventListener('pointerup', () => { firingTouch = false; });
  fireBtn.addEventListener('pointercancel', () => { firingTouch = false; });
}
if (bombBtn) bombBtn.addEventListener('pointerdown', () => { ensureAudio(); if (running) bomb(); else startGame(); });

requestAnimationFrame(loop);
