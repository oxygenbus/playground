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

const W = canvas.width;
const H = canvas.height;
const keys = new Set();
const touchMove = { x: 0, y: 0, active: false };
let firingTouch = false;

const audio = {
  shoot: new Audio('assets/audio/shoot.ogg'),
  boom: new Audio('assets/audio/boom.ogg'),
  hit: new Audio('assets/audio/hit.ogg'),
};
Object.values(audio).forEach(a => { a.volume = 0.22; a.preload = 'auto'; });

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

const HIGH_KEY = 'skyraid-highscore';
let lastTime = 0;
let running = false;
let paused = false;
let gameOver = false;

const state = {
  player: null,
  bullets: [],
  enemyBullets: [],
  missiles: [],
  enemies: [],
  particles: [],
  stars: [],
  powerUps: [],
  score: 0,
  spawnTimer: 0,
  wave: 1,
  stage: 1,
  stageTimer: 0,
  bossCooldown: 0,
  boss: null,
  highscore: Number(localStorage.getItem(HIGH_KEY) || 0),
  message: '',
  messageTimer: 0,
};
highEl.textContent = state.highscore;

function playSound(name) {
  const src = audio[name];
  if (!src) return;
  const clone = src.cloneNode();
  clone.volume = src.volume;
  clone.play().catch(() => {});
}

function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function resetGame() {
  state.player = {
    x: W / 2 - 24,
    y: H - 120,
    w: 48,
    h: 48,
    speed: 285,
    cooldown: 0,
    lives: 3,
    bombs: 2,
    invuln: 0,
    power: 1,
    missileCooldown: 0,
    missiles: 0,
    missileLevel: 0,
    missileSide: 0,
  };
  state.bullets = [];
  state.enemyBullets = [];
  state.missiles = [];
  state.enemies = [];
  state.particles = [];
  state.powerUps = [];
  state.score = 0;
  state.spawnTimer = 0;
  state.wave = 1;
  state.stage = 1;
  state.stageTimer = 0;
  state.bossCooldown = 6;
  state.boss = null;
  state.message = 'Stage 1';
  state.messageTimer = 2;
  state.stars = Array.from({ length: 90 }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    speed: rand(40, 180),
    size: rand(2, 9),
    rot: Math.random() * Math.PI * 2,
    layer: Math.random(),
  }));
  running = true;
  paused = false;
  gameOver = false;
  overlay.classList.add('hidden');
  updateHud();
  updateBossHud();
}

function updateHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.player.lives;
  bombsEl.textContent = state.player.bombs;
  powerEl.textContent = `${state.player.power}/${state.player.missileLevel}`;
  if (state.score > state.highscore) {
    state.highscore = state.score;
    localStorage.setItem(HIGH_KEY, String(state.highscore));
    highEl.textContent = state.highscore;
  }
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

function explode(x, y, color, count, spread = 220) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = rand(20, spread);
    state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: rand(0.25, 0.8), color, size: rand(2, 5) });
  }
}

function spawnPowerUp(x, y) {
  const roll = Math.random();
  const type = roll < 0.55 ? 'power' : roll < 0.82 ? 'bomb' : 'missile';
  state.powerUps.push({ x, y, w: 24, h: 24, type, speed: 120 });
}

function spawnEnemy() {
  const stage = state.stage;
  const typeRoll = Math.random();
  let type = 'grunt';
  if (stage >= 1 && typeRoll > 0.60) type = 'zigzag';
  if (stage >= 2 && typeRoll > 0.83) type = 'turret';
  if (stage >= 3 && typeRoll > 0.92) type = 'ace';
  const size = type === 'turret' ? 58 : type === 'ace' ? 52 : rand(34, 48);
  state.enemies.push({
    kind: type,
    x: rand(10, W - size - 10),
    y: -size,
    w: size,
    h: size,
    speed: rand(78, 120) + stage * 4,
    hp: type === 'turret' ? 8 : type === 'zigzag' ? 4 : type === 'ace' ? 5 : 2,
    maxHp: type === 'turret' ? 8 : type === 'zigzag' ? 4 : type === 'ace' ? 5 : 2,
    phase: Math.random() * Math.PI * 2,
    fireCooldown: rand(0.8, 1.8),
    skin: Math.random() < 0.5 ? 0 : 1,
  });
}

function spawnBoss() {
  state.boss = {
    kind: 'boss',
    x: W / 2 - 70,
    y: -140,
    w: 140,
    h: 120,
    hp: 90,
    maxHp: 90,
    phase: 0,
    fireCooldown: 0.8,
    enter: true,
  };
  state.message = 'WARNING: BOSS APPROACHING';
  state.messageTimer = 3;
  updateBossHud();
}

function shootPlayer() {
  const p = state.player;
  const patterns = {
    1: [{ dx: 0, vx: 0 }],
    2: [{ dx: -10, vx: -35 }, { dx: 10, vx: 35 }],
    3: [{ dx: 0, vx: 0 }, { dx: -16, vx: -45 }, { dx: 16, vx: 45 }],
    4: [{ dx: -18, vx: -70 }, { dx: -6, vx: -20 }, { dx: 6, vx: 20 }, { dx: 18, vx: 70 }],
    5: [{ dx: 0, vx: 0 }, { dx: -20, vx: -90 }, { dx: 20, vx: 90 }, { dx: -8, vx: -35 }, { dx: 8, vx: 35 }],
  };
  for (const b of patterns[Math.min(5, p.power)]) {
    state.bullets.push({ x: p.x + p.w / 2 - 3 + b.dx, y: p.y - 8, w: 6, h: 16, speed: 560, vx: b.vx, friendly: true, damage: 1 });
  }
  playSound('shoot');
}

function shootEnemy(enemy, pattern = 'single') {
  const cx = enemy.x + enemy.w / 2;
  const cy = enemy.y + enemy.h - 4;
  if (pattern === 'spread') {
    [-120, -60, 0, 60, 120].forEach(vx => state.enemyBullets.push({ x: cx, y: cy, w: 10, h: 10, vx: vx * 0.72, vy: 165, color: '#ff9f43' }));
  } else if (pattern === 'fan') {
    [-140, -70, 0, 70, 140].forEach(vx => state.enemyBullets.push({ x: cx, y: cy, w: 8, h: 14, vx: vx * 0.68, vy: 195, color: '#ff5f7a' }));
  } else {
    state.enemyBullets.push({ x: cx, y: cy, w: 6, h: 16, vx: 0, vy: 185, color: '#9b6bff' });
  }
}

function bomb() {
  const p = state.player;
  if (p.bombs <= 0) return;
  p.bombs -= 1;
  state.enemyBullets = [];
  state.missiles = [];
  state.enemies.forEach(e => {
    e.hp -= 999;
    explode(e.x + e.w / 2, e.y + e.h / 2, '#64f0ff', 15);
  });
  if (state.boss) {
    state.boss.hp -= 35;
    explode(state.boss.x + state.boss.w / 2, state.boss.y + state.boss.h / 2, '#ffb347', 36, 300);
  }
  playSound('boom');
  updateHud();
  updateBossHud();
}

function hitPlayer() {
  const p = state.player;
  if (p.invuln > 0) return;
  p.lives -= 1;
  p.invuln = 2.3;
  p.power = Math.max(1, p.power - 1);
  explode(p.x + p.w / 2, p.y + p.h / 2, '#ff6b6b', 24, 300);
  playSound('hit');
  if (p.lives <= 0) {
    running = false;
    gameOver = true;
    overlay.classList.remove('hidden');
    panel.innerHTML = `<h1>Game Over</h1><p>Score: ${state.score}</p><p>High Score: ${state.highscore}</p><p class="hint">Press Enter to restart</p>`;
  }
  updateHud();
}

function defeatEnemy(enemy) {
  state.score += enemy.kind === 'turret' ? 220 : enemy.kind === 'zigzag' ? 140 : enemy.kind === 'ace' ? 180 : 80;
  explode(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, enemy.kind === 'turret' ? '#ffb347' : '#64f0ff', enemy.kind === 'turret' ? 18 : 10);
  if (Math.random() < 0.16) spawnPowerUp(enemy.x + enemy.w / 2 - 12, enemy.y + enemy.h / 2 - 12);
  playSound('boom');
  updateHud();
}

function update(dt) {
  const p = state.player;
  p.invuln = Math.max(0, p.invuln - dt);
  p.cooldown = Math.max(0, p.cooldown - dt);
  p.missileCooldown = Math.max(0, p.missileCooldown - dt);
  if (state.messageTimer > 0) state.messageTimer -= dt;
  state.stageTimer += dt;
  state.bossCooldown = Math.max(0, state.bossCooldown - dt);
  const STAGE_LENGTH = 28;
  if (!state.boss && state.stageTimer >= STAGE_LENGTH && state.bossCooldown <= 0) {
    spawnBoss();
    state.bossCooldown = 9999;
  }

  let dx = 0, dy = 0;
  if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
  if (keys.has('arrowright') || keys.has('d')) dx += 1;
  if (keys.has('arrowup') || keys.has('w')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) dy += 1;
  if (touchMove.active) {
    dx += touchMove.x;
    dy += touchMove.y;
  }
  const len = Math.hypot(dx, dy) || 1;
  p.x += (dx / len) * p.speed * dt;
  p.y += (dy / len) * p.speed * dt;
  p.x = clamp(p.x, 0, W - p.w);
  p.y = clamp(p.y, 0, H - p.h);

  const wantsFire = keys.has(' ') || keys.has('j') || firingTouch;
  if (wantsFire && p.cooldown <= 0) {
    shootPlayer();
    p.cooldown = 0.16;
  }
  if (p.missileLevel > 0 && p.missileCooldown <= 0) {
    const patterns = {
      1: [-18, 18],
      2: [-22, 22, 0],
      3: [-24, 24, -8, 8],
    };
    const offsets = patterns[p.missileLevel] || patterns[1];
    offsets.forEach((off, idx) => {
      state.missiles.push({
        x: p.x + p.w / 2 - 8 + off,
        y: p.y + 10,
        w: 16,
        h: 24,
        speed: 300,
        vx: off < 0 ? -85 : off > 0 ? 85 : 0,
        drift: off < 0 ? -0.55 : off > 0 ? 0.55 : 0,
        kind: idx % 2 === 0 ? 'blue' : 'red',
        armY: p.y - 110,
      });
    });
    p.missileSide = (p.missileSide + 1) % 2;
    p.missileCooldown = 0.9;
  }

  state.stars.forEach(s => {
    s.y += s.speed * (0.5 + s.layer) * dt;
    s.rot += dt;
    if (s.y > H + 20) {
      s.y = -20;
      s.x = Math.random() * W;
    }
  });

  if (!state.boss) {
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      spawnEnemy();
      state.spawnTimer = Math.max(0.5, 1.05 - state.stage * 0.02) + Math.random() * 0.32;
    }
  }

  state.bullets.forEach(b => {
    b.x += (b.vx || 0) * dt;
    b.y -= b.speed * dt;
  });
  state.bullets = state.bullets.filter(b => b.y + b.h > -30 && b.x > -30 && b.x < W + 30);

  state.missiles.forEach(m => {
    m.y -= m.speed * dt;
    if (m.y > m.armY) {
      m.x += m.vx * dt;
      m.vx *= 0.985;
    } else {
      m.x += m.drift * 28 * dt;
    }
  });

  state.enemyBullets.forEach(b => {
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (intersects(b, p)) {
      b.y = H + 99;
      hitPlayer();
    }
  });
  state.enemyBullets = state.enemyBullets.filter(b => b.y < H + 30 && b.x > -40 && b.x < W + 40);

  for (const enemy of state.enemies) {
    if (enemy.kind === 'zigzag') {
      enemy.y += enemy.speed * dt;
      enemy.x += Math.sin(enemy.y / 45 + enemy.phase) * 110 * dt;
    } else if (enemy.kind === 'turret') {
      enemy.y += enemy.speed * 0.6 * dt;
    } else if (enemy.kind === 'ace') {
      enemy.y += enemy.speed * 0.9 * dt;
      enemy.x += Math.sin(enemy.y / 30 + enemy.phase) * 160 * dt;
    } else {
      enemy.y += enemy.speed * dt;
    }
    enemy.fireCooldown -= dt;
    if (enemy.fireCooldown <= 0 && enemy.y > 40) {
      shootEnemy(enemy, enemy.kind === 'turret' ? 'spread' : 'single');
      enemy.fireCooldown = enemy.kind === 'turret' ? 1.85 : enemy.kind === 'ace' ? rand(1.0, 1.6) : rand(1.6, 2.8);
    }
    if (intersects(enemy, p)) {
      enemy.hp = 0;
      hitPlayer();
    } else if (enemy.y > H + 30) {
      enemy.hp = 0;
    }
  }

  if (state.boss) {
    const b = state.boss;
    if (b.enter) {
      b.y += 90 * dt;
      if (b.y >= 40) b.enter = false;
    } else {
      b.phase += dt;
      b.x = W / 2 - b.w / 2 + Math.sin(b.phase * 0.9) * 85;
      b.fireCooldown -= dt;
      if (b.fireCooldown <= 0) {
        shootEnemy(b, Math.random() < 0.5 ? 'fan' : 'spread');
        b.fireCooldown = 1.15;
      }
    }
  }

  for (const bullet of state.bullets) {
    for (const enemy of state.enemies) {
      if (enemy.hp > 0 && intersects(bullet, enemy)) {
        enemy.hp -= bullet.damage || 1;
        bullet.y = -999;
        explode(bullet.x, bullet.y, '#fff28a', 4, 90);
        if (enemy.hp <= 0) defeatEnemy(enemy);
        break;
      }
    }
    if (state.boss && state.boss.hp > 0 && intersects(bullet, state.boss)) {
      state.boss.hp -= bullet.damage || 1;
      bullet.y = -999;
      explode(bullet.x, bullet.y, '#fff28a', 4, 100);
      if (state.boss.hp <= 0) {
        state.score += 2500;
        explode(state.boss.x + state.boss.w / 2, state.boss.y + state.boss.h / 2, '#ffb347', 80, 360);
        playSound('boom');
        state.boss = null;
        state.stage += 1;
        state.stageTimer = 0;
        state.bossCooldown = 6;
        state.message = `Stage ${state.stage}`;
        state.messageTimer = 2.5;
        p.bombs = Math.min(5, p.bombs + 1);
        spawnPowerUp(W / 2 - 12, 140);
        updateHud();
      }
      updateBossHud();
    }
  }

  for (const m of state.missiles) {
    for (const enemy of state.enemies) {
      if (enemy.hp > 0 && intersects(m, enemy)) {
        enemy.hp -= 3;
        explode(m.x + m.w/2, m.y + m.h/2, '#ffb347', 10, 120);
        m.y = -999;
        if (enemy.hp <= 0) defeatEnemy(enemy);
        break;
      }
    }
    if (state.boss && state.boss.hp > 0 && intersects(m, state.boss)) {
      state.boss.hp -= 4;
      explode(m.x + m.w/2, m.y + m.h/2, '#ffb347', 12, 140);
      m.y = -999;
      if (state.boss.hp <= 0) {
        state.score += 2500;
        explode(state.boss.x + state.boss.w / 2, state.boss.y + state.boss.h / 2, '#ffb347', 80, 360);
        playSound('boom');
        state.boss = null;
        state.stage += 1;
        state.stageTimer = 0;
        state.bossCooldown = 6;
        state.message = `Stage ${state.stage}`;
        state.messageTimer = 2.5;
        p.bombs = Math.min(5, p.bombs + 1);
        spawnPowerUp(W / 2 - 12, 140);
        updateHud();
      }
      updateBossHud();
    }
  }
  state.missiles = state.missiles.filter(m => m.y > -60 && m.y < H + 40 && m.x > -40 && m.x < W + 40);

  state.enemies = state.enemies.filter(e => e.hp > 0 && e.y < H + 60 && e.x > -120 && e.x < W + 120);

  state.powerUps.forEach(item => {
    item.y += item.speed * dt;
    if (intersects(item, p)) {
      item.y = H + 999;
      if (item.type === 'power') p.power = Math.min(5, p.power + 1);
      else if (item.type === 'bomb') p.bombs = Math.min(5, p.bombs + 1);
      else p.missileLevel = Math.min(3, p.missileLevel + 1);
      state.message = item.type === 'power' ? 'Weapon up!' : item.type === 'bomb' ? 'Bomb acquired!' : 'Missiles enhanced!';
      state.messageTimer = 1.2;
      updateHud();
    }
  });
  state.powerUps = state.powerUps.filter(i => i.y < H + 30);

  state.particles.forEach(pt => {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  });
  state.particles = state.particles.filter(pt => pt.life > 0);
}

function drawBackground() {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#12345a');
  grad.addColorStop(0.55, '#0b2340');
  grad.addColorStop(1, '#08111f');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  const t = performance.now() * 0.03;
  ctx.fillStyle = 'rgba(28, 95, 58, 0.22)';
  for (let i = 0; i < 6; i++) {
    const y = ((i * 170) + t * (0.8 + i * 0.08)) % (H + 140) - 140;
    ctx.beginPath();
    ctx.moveTo(0, y + 70);
    ctx.quadraticCurveTo(W * 0.25, y, W * 0.5, y + 55);
    ctx.quadraticCurveTo(W * 0.75, y + 110, W, y + 30);
    ctx.lineTo(W, y + 160);
    ctx.lineTo(0, y + 160);
    ctx.closePath();
    ctx.fill();
  }

  ctx.strokeStyle = 'rgba(120,190,255,0.05)';
  for (let y = 0; y < H; y += 56) {
    ctx.beginPath();
    ctx.moveTo(0, (y + t) % (H + 56));
    ctx.lineTo(W, (y + t) % (H + 56));
    ctx.stroke();
  }

  state.stars.forEach(s => {
    if (images.star.complete && images.star.naturalWidth) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = 0.25 + s.layer * 0.6;
      ctx.drawImage(images.star, -s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(s.x, s.y, 2, 2);
    }
  });
}

function drawShip(obj, image, fallbackColor, rotation = 0) {
  if (image.complete && image.naturalWidth) {
    if (rotation !== 0) {
      ctx.save();
      ctx.translate(obj.x + obj.w / 2, obj.y + obj.h / 2);
      ctx.rotate(rotation);
      ctx.drawImage(image, -obj.w / 2, -obj.h / 2, obj.w, obj.h);
      ctx.restore();
    } else {
      ctx.drawImage(image, obj.x, obj.y, obj.w, obj.h);
    }
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

function draw() {
  drawBackground();

  state.powerUps.forEach(i => {
    ctx.fillStyle = i.type === 'power' ? '#64f0ff' : i.type === 'bomb' ? '#ff7f50' : '#ffd166';
    ctx.beginPath();
    ctx.arc(i.x + 12, i.y + 12, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#031018';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(i.type === 'power' ? 'P' : i.type === 'bomb' ? 'B' : 'M', i.x + 12, i.y + 17);
  });

  state.bullets.forEach(b => {
    ctx.fillStyle = '#ffe86b';
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  state.enemyBullets.forEach(b => {
    ctx.fillStyle = b.color;
    if (b.color === '#ff9f43') {
      ctx.beginPath();
      ctx.arc(b.x + b.w/2, b.y + b.h/2, b.w/2 + 1, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(b.x, b.y, b.w, b.h);
    }
  });

  state.missiles.forEach(m => {
    const img = m.kind === 'red' ? images.missileRed : images.missile;
    if (img.complete && img.naturalWidth) {
      ctx.drawImage(img, m.x, m.y, m.w, m.h);
    } else {
      ctx.fillStyle = m.kind === 'red' ? '#ff7f90' : '#ffd166';
      ctx.fillRect(m.x, m.y, m.w, m.h);
    }
  });

  state.enemies.forEach(e => {
    let enemyImage = images.enemy;
    if (e.kind === 'turret') enemyImage = images.enemyTurret;
    else if (e.kind === 'zigzag') enemyImage = e.skin ? images.enemyAlt : images.enemy;
    else if (e.kind === 'ace') enemyImage = images.enemyAlt;
    else enemyImage = e.skin ? images.enemyAlt : images.enemy;
    drawShip(e, enemyImage, e.kind === 'turret' ? '#ff9f43' : e.kind === 'ace' ? '#ffd166' : '#ff5f7a');
    if (e.kind !== 'grunt') {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(e.x, e.y - 7, e.w, 4);
      ctx.fillStyle = '#7ef29a';
      ctx.fillRect(e.x, e.y - 7, e.w * (e.hp / e.maxHp), 4);
    }
  });

  if (state.boss) {
    ctx.save();
    ctx.shadowBlur = 18;
    ctx.shadowColor = 'rgba(255,95,122,.35)';
    drawShip(state.boss, images.boss, '#ff3c6f');
    ctx.restore();
  }

  const p = state.player;
  if (p) {
    ctx.save();
    if (p.invuln > 0) ctx.globalAlpha = 0.45 + Math.sin(performance.now() / 40) * 0.25;
    drawShip(p, images.player, '#64f0ff', -Math.PI / 4);
    ctx.restore();
  }

  state.particles.forEach(pt => {
    ctx.globalAlpha = Math.max(pt.life, 0);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
  });
  ctx.globalAlpha = 1;

  if (state.messageTimer > 0 && state.message) {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 26px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(state.message, W / 2, 120);
  }
}

function loop(ts) {
  const dt = Math.min(0.033, (ts - lastTime) / 1000 || 0);
  lastTime = ts;
  if (running && !paused) update(dt);
  draw();
  if (paused) {
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', W / 2, H / 2);
    ctx.font = '16px sans-serif';
    ctx.fillText('Press P to resume', W / 2, H / 2 + 28);
  }
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys.add(key);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
  if (key === 'enter' && !running) startGame();
  if (key === 'p' && running) paused = !paused;
  if (key === 'b' && running && !paused) bomb();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

function startGame() {
  resetGame();
}

if (startBtn) startBtn.addEventListener('click', startGame);
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
stick.addEventListener('pointerdown', (e) => { stick.setPointerCapture(e.pointerId); updateStick(e.clientX, e.clientY); });
stick.addEventListener('pointermove', (e) => { if (e.pressure > 0) updateStick(e.clientX, e.clientY); });
stick.addEventListener('pointerup', resetStick);
stick.addEventListener('pointercancel', resetStick);
fireBtn.addEventListener('pointerdown', () => { firingTouch = true; if (!running) startGame(); });
fireBtn.addEventListener('pointerup', () => { firingTouch = false; });
fireBtn.addEventListener('pointercancel', () => { firingTouch = false; });
bombBtn.addEventListener('pointerdown', () => { if (running) bomb(); else startGame(); });

requestAnimationFrame(loop);
