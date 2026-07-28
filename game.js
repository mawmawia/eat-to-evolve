const MAP_SIZE = 2000;
const FOOD_COUNT = 180;
const BOT_COUNT = 15;
const TUTORIAL_STEPS = [
  "Move to the green food",
  "Eat food to grow bigger", 
  "Avoid bigger creatures",
  "Reach Level 10 to evolve into Cockroach"
];
const FOOD_TYPES = { seed:0x8B4513, berry:0xFF0000, bug:0x00FF00, mushroom:0xFF69B4, leaf:0x228B22 };
const BOT_TYPES = {
  grazer: { color:0x90EE90, aggression: 0.1, foodBias: 0.9, fleeSize: 1.5, name:"Grazer" },
  hunter: { color:0xFF6B6B, aggression: 0.9, foodBias: 0.3, fleeSize: 2.0, name:"Hunter" },
  coward: { color:0xFFE66D, aggression: 0.0, foodBias: 0.7, fleeSize: 1.1, name:"Coward" },
  explorer: { color:0x4ECDC4, aggression: 0.4, foodBias: 0.5, fleeSize: 1.8, name:"Explorer" }
};

let game, player, bots = [], foods = [], cursors, joystick;
let tutorialStep = 0, hasSeenTutorial = localStorage.getItem('tutorialDone') === '1';
let sessionStart = 0;

// PHASER CONFIG
const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#2d5a2d',
  scene: { create, update }
};

window.onload = () => {
  document.getElementById('highscore').innerText = parseFloat(localStorage.getItem('highscore') || 0).toFixed(1);
  document.getElementById('btn-play').onclick = startGame;
  document.getElementById('btn-retry').onclick = startGame;
  document.getElementById('btn-menu').onclick = () => location.reload();
  document.getElementById('tutorial').onclick = nextTutorialStep;
  document.getElementById('btn-friends').onclick = () => alert("Coming in v0.2!");
  game = new Phaser.Game(config);
}

function startGame() {
  document.getElementById('menu').style.display = 'none';
  document.getElementById('ui').style.display = 'block';
  document.getElementById('gameover').style.display = 'none';
  sessionStart = Date.now();

  if (!hasSeenTutorial) {
    document.getElementById('tutorial').style.display = 'block';
    tutorialStep = 0;
    updateTutorial();
  }
  if(game.scene.scenes[0]) game.scene.scenes[0].scene.restart();
}

function create() {
  this.cameras.main.setBounds(0, 0, MAP_SIZE, MAP_SIZE);
  this.add.grid(0, 0, MAP_SIZE, MAP_SIZE, 100, 100, 0x000, 0.1);

  // PLAYER
  player = createEntity(MAP_SIZE/2, MAP_SIZE/2, 'player', 'ant');

  // BOTS
  bots = [];
  const personalities = Object.keys(BOT_TYPES);
  for(let i=0; i<BOT_COUNT; i++) {
    const type = personalities[Math.floor(Math.random() * 4)];
    bots.push(createEntity(Math.random()*MAP_SIZE, Math.random()*MAP_SIZE, 'bot', 'ant', type));
  }

  // FOOD
  foods = [];
  for(let i=0; i<FOOD_COUNT; i++) spawnFood.call(this);

  // INPUT
  cursors = this.input.keyboard.createCursorKeys();
  if (this.sys.game.device.os.mobile) {
    joystick = nipplejs.create({ zone: document.body, mode: 'static', position: { left: '15%', bottom: '15%' }, color: 'rgba(255,255,255,0.3)', size: 120 });
  }
}

function update() {
  if (!player.alive) return;
  const dt = 0.016;

  // PLAYER INPUT
  let dx = 0, dy = 0;
  if (cursors.left.isDown) dx = -1; if (cursors.right.isDown) dx = 1;
  if (cursors.up.isDown) dy = -1; if (cursors.down.isDown) dy = 1;
  if (joystick && joystick.data) { dx = joystick.data.vector.x; dy = joystick.data.vector.y; }
  if (dx || dy) { const len = Math.hypot(dx, dy); player.vx = dx/len; player.vy = dy/len; } else { player.vx = 0; player.vy = 0; }

  // UPDATE ALL
  updateEntity(player, dt);
  bots.forEach(bot => updateBot(bot, dt));

  // CAMERA
  this.cameras.main.startFollow(player.sprite, true, 0.08, 0.08);

  // CHECK EVOLUTION
  if (player.level >= 10 && player.type === 'ant') evolve(player);
  if (player.alive) updateUI();
}

function createEntity(x, y, role, type, personality=null) {
  const baseRadius = type === 'ant'? 16 : 28;
  const color = role==='player'?0xD2691E:BOT_TYPES[personality].color;
  const sprite = game.scene.scenes[0].add.circle(x, y, baseRadius, color).setStrokeStyle(2, 0x000);
  return { x, y, vx:0, vy:0, sprite, role, type, personality, level:1, xp:0, size:1, speed: role==='player'?200:150+Math.random()*30, alive:true };
}

function updateEntity(e, dt) {
  if (!e.alive) return;
  e.x += e.vx * e.speed * dt; e.y += e.vy * e.speed * dt;
  e.x = Phaser.Math.Clamp(e.x, 0, MAP_SIZE); e.y = Phaser.Math.Clamp(e.y, 0, MAP_SIZE);
  e.sprite.x = e.x; e.sprite.y = e.y;
  const radius = (e.type==='ant'?16:28) * e.size;
  e.sprite.setRadius(radius);

  // EAT FOOD
  if (e.role!== 'food') {
    for(let i=foods.length-1; i>=0; i--) {
      const f = foods[i];
      if (Phaser.Math.Distance.Between(e.x, e.y, f.x, f.y) < radius + 8) {
        e.xp += 1; e.size += 0.04;
        if (e.xp >= e.level * 10) { e.level++; e.xp = 0; }
        f.sprite.destroy(); foods.splice(i,1); spawnFood.call(game.scene.scenes[0]);
      }
    }
  }

  // PVP
  const others = e.role==='player'?bots:[player,...bots.filter(b=>b!==e)];
  for(const o of others) {
    if (!o.alive) continue;
    const dist = Phaser.Math.Distance.Between(e.x, e.y, o.x, o.y);
    const oRadius = (o.type==='ant'?16:28) * o.size;
    if (dist < (radius + oRadius)/2) {
      if (e.size > o.size * 1.15) { // EAT
        e.size += o.size * 0.2; e.xp += 2; o.alive = false; o.sprite.destroy();
        if (o.role==='player') gameOver();
      } else if (o.size > e.size * 1.15 && e.role==='player') { // BE EATEN
        gameOver();
      }
    }
  }
}

function updateBot(bot, dt) {
  if (!bot.alive) return;
  const p = BOT_TYPES[bot.personality];
  let targetX = bot.x + (Math.random()-0.5)*50, targetY = bot.y + (Math.random()-0.5)*50;

  // 1. FLEE if threat is close
  const threat = [player,...bots].find(o => o!==bot && o.alive && o.size > bot.size * p.fleeSize && Phaser.Math.Distance.Between(bot.x,bot.y,o.x,o.y) < 300);
  if (threat) {
    const angle = Phaser.Math.Angle.Between(bot.x, bot.y, threat.x, threat.y);
    targetX = bot.x - Math.cos(angle)*400; targetY = bot.y - Math.sin(angle)*400;
  }
  // 2. HUNT if aggressive
  else if (p.aggression > 0.5 && Math.random() < p.aggression) {
    const prey = [player,...bots].find(o => o!==bot && o.alive && o.size < bot.size * 0.85 && Phaser.Math.Distance.Between(bot.x,bot.y,o.x,o.y) < 400);
    if (prey) { targetX = prey.x; targetY = prey.y; }
  }
  // 3. SEEK FOOD
  else if (p.foodBias > 0.3 && Math.random() < p.foodBias) {
    const food = foods.reduce((a,b) => Phaser.Math.Distance.Between(bot.x,bot.y,a.x,a.y) < Phaser.Math.Distance.Between(bot.x,bot.y,b.x,b.y)?a:b, foods[0]);
    if (food) { targetX = food.x; targetY = food.y; }
  }

  const dx = targetX - bot.x, dy = targetY - bot.y;
  const len = Math.hypot(dx, dy);
  bot.vx = len?dx/len:0; bot.vy = len?dy/len:0;
  updateEntity(bot, dt);

  if (bot.level >= 10 && bot.type === 'ant') evolve(bot);
}

function evolve(e) {
  e.type = 'cockroach';
  e.speed += 40;
  e.sprite.setFillStyle(e.role==='player'?0x333:BOT_TYPES[e.personality].color);
  e.sprite.setStrokeStyle(3, 0xFFD700); // golden outline for evolved
}

function spawnFood() {
  const types = Object.keys(FOOD_TYPES);
  const type = types[Math.floor(Math.random()*5)];
  const sprite = this.add.circle(Math.random()*MAP_SIZE, Math.random()*MAP_SIZE, 8, FOOD_TYPES[type]).setStrokeStyle(1,0x000);
  foods.push({x:sprite.x, y:sprite.y, sprite, type});
}

function updateUI() {
  document.getElementById('ui-type').innerText = player.type === 'ant' ? 'Ant' : 'Cockroach';
  document.getElementById('ui-lvl').innerText = player.level;
  document.getElementById('ui-size').innerText = player.size.toFixed(1);
  document.getElementById('xp-fill').style.width = Math.min(100, player.xp/(player.level*10)*100) + '%';
}

function nextTutorialStep() {
  tutorialStep++;
  if (tutorialStep >= TUTORIAL_STEPS.length) {
    document.getElementById('tutorial').style.display = 'none';
    hasSeenTutorial = true; localStorage.setItem('tutorialDone', '1');
  } else updateTutorial();
}
function updateTutorial() {
  document.getElementById('tut-step').innerText = TUTORIAL_STEPS[tutorialStep];
}

function gameOver() {
  if(!player.alive) return;
  player.alive = false;
  const sessionTime = ((Date.now() - sessionStart)/1000).toFixed(0);
  
  const highscore = Math.max(parseFloat(localStorage.getItem('highscore')||0), player.size);
  localStorage.setItem('highscore', highscore);

  console.log("METRICS:", { sessionSeconds: sessionTime, finalSize: player.size.toFixed(1), reachedCockroach: player.level>=10 });

  document.getElementById('final-size').innerText = player.size.toFixed(1);
  document.getElementById('final-lvl').innerText = player.level;
  document.getElementById('final-time').innerText = sessionTime;
  document.getElementById('gameover').style.display = 'block';
  document.getElementById('ui').style.display = 'none';
  document.getElementById('highscore').innerText = highscore.toFixed(1);
}
