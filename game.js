const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const stolenEl = document.getElementById('stolen');
const healthEl = document.getElementById('health');
const restartBtn = document.getElementById('restart');

const keys = new Set();
let pointer = { x: canvas.width / 2, y: canvas.height / 2 };
let lastShot = 0;

const state = {
  score: 0,
  stolen: 0,
  health: 100,
  playing: true,
};

const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 22,
  speed: 220,
  angle: 0,
  hurtTimer: 0,
};

const fly = createFly();
const enemies = [];
const projectiles = [];
let enemySpawnTimer = 4;
let enemySpawnInterval = 6;

function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

function createFly() {
  return {
    x: randomRange(80, canvas.width - 80),
    y: randomRange(80, canvas.height - 80),
    radius: 10,
    direction: Math.random() * Math.PI * 2,
    speed: 90,
    changeDirectionTimer: randomRange(1.8, 3.5),
  };
}

function spawnEnemy() {
  const edge = Math.floor(Math.random() * 4);
  let x, y;
  switch (edge) {
    case 0:
      x = -30;
      y = randomRange(0, canvas.height);
      break;
    case 1:
      x = canvas.width + 30;
      y = randomRange(0, canvas.height);
      break;
    case 2:
      x = randomRange(0, canvas.width);
      y = -30;
      break;
    default:
      x = randomRange(0, canvas.width);
      y = canvas.height + 30;
      break;
  }
  enemies.push({
    x,
    y,
    radius: 20,
    speed: randomRange(70, 110),
    wobble: Math.random() * Math.PI * 2,
    wobbleSpeed: randomRange(2, 3.4),
    wobbleDistance: randomRange(8, 16),
  });
}

function shoot() {
  if (!state.playing) return;
  const now = performance.now();
  if (now - lastShot < 280) return;
  lastShot = now;
  const angle = Math.atan2(pointer.y - player.y, pointer.x - player.x) || player.angle;
  const speed = 520;
  projectiles.push({
    x: player.x,
    y: player.y,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    radius: 6,
    life: 1.2,
  });
}

function updatePointer(evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  pointer = {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY,
  };
}

function resetGame() {
  state.score = 0;
  state.stolen = 0;
  state.health = 100;
  state.playing = true;
  player.x = canvas.width / 2;
  player.y = canvas.height / 2;
  player.angle = 0;
  player.hurtTimer = 0;
  enemies.length = 0;
  projectiles.length = 0;
  Object.assign(fly, createFly());
  enemySpawnTimer = 3.5;
  enemySpawnInterval = 6;
  restartBtn.classList.add('hidden');
}

window.addEventListener('keydown', (evt) => {
  if (evt.key === ' ' || evt.code === 'Space') {
    evt.preventDefault();
    shoot();
    return;
  }
  keys.add(evt.key.toLowerCase());
});

window.addEventListener('keyup', (evt) => {
  keys.delete(evt.key.toLowerCase());
});

canvas.addEventListener('mousemove', updatePointer);
canvas.addEventListener('mousedown', (evt) => {
  updatePointer(evt);
  shoot();
});

canvas.addEventListener('touchstart', (evt) => {
  const touch = evt.changedTouches[0];
  updatePointer({ clientX: touch.clientX, clientY: touch.clientY });
  shoot();
});

canvas.addEventListener('touchmove', (evt) => {
  const touch = evt.changedTouches[0];
  updatePointer({ clientX: touch.clientX, clientY: touch.clientY });
});

restartBtn.addEventListener('click', resetGame);

document.addEventListener('visibilitychange', () => {
  if (document.hidden) keys.clear();
});

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distanceSquared(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function handlePlayerMovement(dt) {
  if (!state.playing) return;
  let inputX = 0;
  let inputY = 0;
  if (keys.has('arrowup') || keys.has('w')) inputY -= 1;
  if (keys.has('arrowdown') || keys.has('s')) inputY += 1;
  if (keys.has('arrowleft') || keys.has('a')) inputX -= 1;
  if (keys.has('arrowright') || keys.has('d')) inputX += 1;

  if (inputX !== 0 || inputY !== 0) {
    const length = Math.hypot(inputX, inputY);
    inputX /= length;
    inputY /= length;
    player.x += inputX * player.speed * dt;
    player.y += inputY * player.speed * dt;
  }

  player.x = clamp(player.x, player.radius, canvas.width - player.radius);
  player.y = clamp(player.y, player.radius, canvas.height - player.radius);
  player.angle = Math.atan2(pointer.y - player.y, pointer.x - player.x);

  if (player.hurtTimer > 0) {
    player.hurtTimer -= dt;
  }
}

function updateFly(dt) {
  fly.changeDirectionTimer -= dt;
  if (fly.changeDirectionTimer <= 0) {
    fly.direction = Math.random() * Math.PI * 2;
    fly.changeDirectionTimer = randomRange(1.3, 2.8);
  }
  fly.x += Math.cos(fly.direction) * fly.speed * dt;
  fly.y += Math.sin(fly.direction) * fly.speed * dt;
  fly.x = clamp(fly.x, fly.radius, canvas.width - fly.radius);
  fly.y = clamp(fly.y, fly.radius, canvas.height - fly.radius);

  // Bounce softly off walls
  if (fly.x === fly.radius || fly.x === canvas.width - fly.radius) {
    fly.direction = Math.PI - fly.direction + randomRange(-0.4, 0.4);
  }
  if (fly.y === fly.radius || fly.y === canvas.height - fly.radius) {
    fly.direction = -fly.direction + randomRange(-0.4, 0.4);
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i -= 1) {
    const shot = projectiles[i];
    shot.x += shot.vx * dt;
    shot.y += shot.vy * dt;
    shot.life -= dt;
    if (
      shot.life <= 0 ||
      shot.x < -50 ||
      shot.x > canvas.width + 50 ||
      shot.y < -50 ||
      shot.y > canvas.height + 50
    ) {
      projectiles.splice(i, 1);
    }
  }
}

function updateEnemies(dt) {
  enemySpawnTimer -= dt;
  if (enemySpawnTimer <= 0 && state.playing) {
    spawnEnemy();
    enemySpawnInterval = Math.max(2.4, enemySpawnInterval * 0.95);
    enemySpawnTimer = enemySpawnInterval;
  }

  for (let i = enemies.length - 1; i >= 0; i -= 1) {
    const enemy = enemies[i];
    enemy.wobble += enemy.wobbleSpeed * dt;
    const targetX = fly.x + Math.cos(enemy.wobble) * enemy.wobbleDistance;
    const targetY = fly.y + Math.sin(enemy.wobble) * enemy.wobbleDistance;
    const angle = Math.atan2(targetY - enemy.y, targetX - enemy.x);
    enemy.x += Math.cos(angle) * enemy.speed * dt;
    enemy.y += Math.sin(angle) * enemy.speed * dt;

    // Collision with fly
    if (distanceSquared(enemy.x, enemy.y, fly.x, fly.y) <= (enemy.radius + fly.radius) ** 2) {
      state.stolen += 1;
      Object.assign(fly, createFly());
      enemies.splice(i, 1);
      continue;
    }

    // Collision with player
    if (
      state.playing &&
      distanceSquared(enemy.x, enemy.y, player.x, player.y) <= (enemy.radius + player.radius) ** 2
    ) {
      if (player.hurtTimer <= 0) {
        state.health -= 20;
        player.hurtTimer = 1.2;
        if (state.health <= 0) {
          state.health = 0;
          state.playing = false;
          restartBtn.classList.remove('hidden');
        }
      }
    }

    // Projectiles
    for (let j = projectiles.length - 1; j >= 0; j -= 1) {
      const shot = projectiles[j];
      if (distanceSquared(enemy.x, enemy.y, shot.x, shot.y) <= (enemy.radius + shot.radius) ** 2) {
        enemies.splice(i, 1);
        projectiles.splice(j, 1);
        state.score += 1;
        break;
      }
    }
  }
}

function checkPlayerEatFly() {
  if (!state.playing) return;
  if (distanceSquared(player.x, player.y, fly.x, fly.y) <= (player.radius + fly.radius) ** 2) {
    state.score += 1;
    Object.assign(fly, createFly());
    if (state.health < 100) {
      state.health = clamp(state.health + 8, 0, 100);
    }
  }
}

function updateUI() {
  scoreEl.textContent = state.score;
  stolenEl.textContent = state.stolen;
  healthEl.textContent = Math.round(state.health);
}

function drawWebBackground() {
  ctx.save();
  ctx.strokeStyle = 'rgba(180, 200, 255, 0.15)';
  ctx.lineWidth = 1;
  ctx.translate(canvas.width / 2, canvas.height / 2);
  const rings = 6;
  for (let r = 1; r <= rings; r += 1) {
    ctx.beginPath();
    ctx.arc(0, 0, (canvas.width / 2) * (r / rings), 0, Math.PI * 2);
    ctx.stroke();
  }
  const strands = 12;
  for (let s = 0; s < strands; s += 1) {
    const angle = (Math.PI * 2 * s) / strands;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * canvas.width, Math.sin(angle) * canvas.width);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFly() {
  ctx.save();
  ctx.translate(fly.x, fly.y);
  ctx.fillStyle = '#9be2ff';
  ctx.beginPath();
  ctx.ellipse(-5, -3, 6, 10, Math.PI / 4, 0, Math.PI * 2);
  ctx.ellipse(5, -3, 6, 10, -Math.PI / 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2736';
  ctx.beginPath();
  ctx.arc(0, 0, fly.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f7f9ff';
  ctx.beginPath();
  ctx.arc(3, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSpider(spider, color = '#f4f7ff', angry = false) {
  ctx.save();
  ctx.translate(spider.x, spider.y);
  ctx.rotate(spider.angle || 0);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  // Body
  ctx.beginPath();
  ctx.arc(0, 0, spider.radius, 0, Math.PI * 2);
  ctx.fill();

  // Head
  ctx.beginPath();
  ctx.arc(spider.radius * 0.7, 0, spider.radius * 0.55, 0, Math.PI * 2);
  ctx.fillStyle = angry ? '#ff6b6b' : color;
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#101524';
  ctx.beginPath();
  ctx.arc(spider.radius * 0.9, -spider.radius * 0.2, spider.radius * 0.2, 0, Math.PI * 2);
  ctx.arc(spider.radius * 0.9, spider.radius * 0.2, spider.radius * 0.2, 0, Math.PI * 2);
  ctx.fill();

  // Legs
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  const legSpan = spider.radius * 1.6;
  for (let i = -2; i <= 1; i += 1) {
    const offset = i * 0.5;
    ctx.beginPath();
    ctx.moveTo(-spider.radius * 0.3, offset * spider.radius);
    ctx.quadraticCurveTo(-legSpan, offset * spider.radius * 1.4, -legSpan, offset * spider.radius * 1.9);
    ctx.stroke();
  }

  ctx.restore();
}

function drawProjectiles() {
  ctx.fillStyle = '#8ed0ff';
  projectiles.forEach((shot) => {
    ctx.beginPath();
    ctx.arc(shot.x, shot.y, shot.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawHealthOverlay() {
  if (player.hurtTimer > 0 && Math.floor(player.hurtTimer * 10) % 2 === 0) {
    ctx.fillStyle = 'rgba(255, 80, 80, 0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  if (!state.playing) {
    ctx.fillStyle = 'rgba(5, 8, 15, 0.7)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('¡La telaraña cayó!', canvas.width / 2, canvas.height / 2 - 30);
    ctx.font = '24px "Segoe UI", sans-serif';
    ctx.fillText('Haz clic en Reiniciar para seguir defendiendo tu cena.', canvas.width / 2, canvas.height / 2 + 14);
  }
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawWebBackground();
  drawFly();
  enemies.forEach((enemy) => {
    const dx = fly.x - enemy.x;
    const dy = fly.y - enemy.y;
    const angle = Math.atan2(dy, dx);
    drawSpider({ ...enemy, angle }, '#ffb4b4', true);
  });
  drawProjectiles();
  drawSpider(player, '#f4f7ff', false);
  drawHealthOverlay();
}

let lastTime = performance.now();
function gameLoop(timestamp) {
  const dt = (timestamp - lastTime) / 1000;
  lastTime = timestamp;

  handlePlayerMovement(dt);
  updateFly(dt);
  updateProjectiles(dt);
  updateEnemies(dt);
  checkPlayerEatFly();
  updateUI();
  render();

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
