const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bombsEl = document.getElementById('bombs');
const overlay = document.getElementById('overlay');

const keys = new Set();
const audio = {
  shoot: new Audio('assets/audio/shoot.ogg'),
  boom: new Audio('assets/audio/boom.ogg'),
  hit: new Audio('assets/audio/hit.ogg'),
};
Object.values(audio).forEach(a => { a.volume = 0.25; a.preload = 'auto'; });

const images = {
  player: new Image(),
  enemy: new Image(),
  star: new Image(),
};
images.player.src = 'assets/images/player.svg';
images.enemy.src = 'assets/images/enemy.svg';
images.star.src = 'assets/images/star.svg';

const W = canvas.width;
const H = canvas.height;
let lastTime = 0;
let running = false;
let gameOver = false;

const state = {
  player: null,
  bullets: [],
  enemies: [],
  particles: [],
  stars: [],
  score: 0,
  spawnTimer: 0,
  wave: 1,
};

function resetGame() {
  state.player = { x: W / 2 - 24, y: H - 120, w: 48, h: 48, speed: 320, cooldown: 0, lives: 3, bombs: 2, invuln: 0 };
  state.bullets = [];
  state.enemies = [];
  state.particles = [];
  state.score = 0;
  state.spawnTimer = 0;
  state.wave = 1;
  state.stars = Array.from({ length: 70 }, () => ({ x: Math.random() * W, y: Math.random() * H, speed: 40 + Math.random() * 120, size: 2 + Math.random() * 8, rot: Math.random() * Math.PI * 2 }));
  running = true;
  gameOver = false;
  overlay.classList.add('hidden');
  updateHud();
}

function updateHud() {
  scoreEl.textContent = state.score;
  livesEl.textContent = state.player.lives;
  bombsEl.textContent = state.player.bombs;
}

function playSound(name) {
  const src = audio[name];
  if (!src) return;
  const clone = src.cloneNode();
  clone.volume = src.volume;
  clone.play().catch(() => {});
}

function spawnEnemy() {
  const size = 34 + Math.random() * 30;
  const elite = Math.random() < Math.min(0.08 + state.wave * 0.01, 0.22);
  state.enemies.push({
    x: Math.random() * (W - size),
    y: -size,
    w: size,
    h: size,
    speed: 120 + Math.random() * 120 + state.wave * 10,
    hp: elite ? 5 : 2,
    maxHp: elite ? 5 : 2,
    phase: Math.random() * Math.PI * 2,
    elite,
  });
}

function shoot() {
  state.bullets.push({ x: state.player.x + state.player.w / 2 - 3, y: state.player.y - 8, w: 6, h: 16, speed: 520 });
  playSound('shoot');
}

function bomb() {
  if (state.player.bombs <= 0) return;
  state.player.bombs -= 1;
  state.enemies.forEach(e => explode(e.x + e.w / 2, e.y + e.h / 2, e.elite ? '#ffb347' : '#64f0ff', 12));
  state.score += state.enemies.reduce((sum, e) => sum + (e.elite ? 250 : 100), 0);
  state.enemies = [];
  playSound('boom');
  updateHud();
}

function explode(x, y, color, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 220;
    state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, life: 0.3 + Math.random() * 0.6, color, size: 2 + Math.random() * 4 });
  }
}

function hitPlayer() {
  if (state.player.invuln > 0) return;
  state.player.lives -= 1;
  state.player.invuln = 2;
  explode(state.player.x + state.player.w / 2, state.player.y + state.player.h / 2, '#ff6b6b', 24);
  playSound('hit');
  if (state.player.lives <= 0) {
    running = false;
    gameOver = true;
    overlay.classList.remove('hidden');
    overlay.querySelector('.panel').innerHTML = `<h1>Game Over</h1><p>Score: ${state.score}</p><p>Press Enter to restart</p>`;
  }
  updateHud();
}

function intersects(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function update(dt) {
  const p = state.player;
  p.invuln = Math.max(0, p.invuln - dt);
  p.cooldown = Math.max(0, p.cooldown - dt);

  let dx = 0, dy = 0;
  if (keys.has('arrowleft') || keys.has('a')) dx -= 1;
  if (keys.has('arrowright') || keys.has('d')) dx += 1;
  if (keys.has('arrowup') || keys.has('w')) dy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) dy += 1;
  const len = Math.hypot(dx, dy) || 1;
  p.x += (dx / len) * p.speed * dt;
  p.y += (dy / len) * p.speed * dt;
  p.x = Math.max(0, Math.min(W - p.w, p.x));
  p.y = Math.max(0, Math.min(H - p.h, p.y));

  if ((keys.has(' ') || keys.has('j')) && p.cooldown <= 0) {
    shoot();
    p.cooldown = 0.17;
  }

  state.spawnTimer -= dt;
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    const base = Math.max(0.22, 0.75 - state.wave * 0.02);
    state.spawnTimer = base + Math.random() * 0.25;
    state.wave = 1 + Math.floor(state.score / 1500);
  }

  state.stars.forEach(s => {
    s.y += s.speed * dt;
    s.rot += dt;
    if (s.y > H + 20) {
      s.y = -20;
      s.x = Math.random() * W;
    }
  });

  state.bullets.forEach(b => b.y -= b.speed * dt);
  state.bullets = state.bullets.filter(b => b.y + b.h > -20);

  state.enemies.forEach(e => {
    e.y += e.speed * dt;
    e.x += Math.sin((e.y / 60) + e.phase) * 50 * dt;
    if (intersects(e, p)) {
      e.hp = 0;
      hitPlayer();
    }
    if (e.y > H + 40) {
      e.hp = 0;
      hitPlayer();
    }
  });

  for (const b of state.bullets) {
    for (const e of state.enemies) {
      if (e.hp > 0 && intersects(b, e)) {
        e.hp -= 1;
        b.y = -999;
        explode(b.x, b.y, '#fff28a', 4);
        if (e.hp <= 0) {
          state.score += e.elite ? 250 : 100;
          explode(e.x + e.w / 2, e.y + e.h / 2, e.elite ? '#ff9f43' : '#64f0ff', e.elite ? 20 : 10);
          playSound('boom');
        }
        updateHud();
        break;
      }
    }
  }

  state.bullets = state.bullets.filter(b => b.y > -50);
  state.enemies = state.enemies.filter(e => e.hp > 0);

  state.particles.forEach(pt => {
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
  });
  state.particles = state.particles.filter(pt => pt.life > 0);
}

function drawBackground() {
  ctx.fillStyle = '#07111f';
  ctx.fillRect(0, 0, W, H);
  state.stars.forEach(s => {
    if (images.star.complete && images.star.naturalWidth) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.globalAlpha = 0.5;
      ctx.drawImage(images.star, -s.size / 2, -s.size / 2, s.size, s.size);
      ctx.restore();
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect(s.x, s.y, 2, 2);
    }
  });
}

function drawPlayer() {
  const p = state.player;
  ctx.save();
  if (p.invuln > 0) ctx.globalAlpha = 0.5 + Math.sin(performance.now() / 60) * 0.2;
  if (images.player.complete && images.player.naturalWidth) {
    ctx.drawImage(images.player, p.x, p.y, p.w, p.h);
  } else {
    ctx.fillStyle = '#64f0ff';
    ctx.beginPath();
    ctx.moveTo(p.x + p.w / 2, p.y);
    ctx.lineTo(p.x + p.w, p.y + p.h);
    ctx.lineTo(p.x, p.y + p.h);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function draw() {
  drawBackground();

  state.bullets.forEach(b => {
    ctx.fillStyle = '#ffe86b';
    ctx.fillRect(b.x, b.y, b.w, b.h);
  });

  state.enemies.forEach(e => {
    if (images.enemy.complete && images.enemy.naturalWidth) {
      ctx.drawImage(images.enemy, e.x, e.y, e.w, e.h);
    } else {
      ctx.fillStyle = e.elite ? '#ff7f50' : '#ff4d6d';
      ctx.fillRect(e.x, e.y, e.w, e.h);
    }
    if (e.elite) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(e.x, e.y - 8, e.w, 4);
      ctx.fillStyle = '#7ef29a';
      ctx.fillRect(e.x, e.y - 8, e.w * (e.hp / e.maxHp), 4);
    }
  });

  drawPlayer();

  state.particles.forEach(pt => {
    ctx.globalAlpha = Math.max(pt.life, 0);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x, pt.y, pt.size, pt.size);
    ctx.globalAlpha = 1;
  });
}

function loop(ts) {
  const dt = Math.min(0.033, (ts - lastTime) / 1000 || 0);
  lastTime = ts;
  if (running) update(dt);
  draw();
  requestAnimationFrame(loop);
}

window.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  keys.add(key);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) e.preventDefault();
  if (key === 'enter' && !running) resetGame();
  if (key === 'b' && running) bomb();
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));

requestAnimationFrame(loop);
