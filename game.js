const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#1a4d1a',
  scene: { preload, create, update },
  physics: { default: 'arcade' }
};

const game = new Phaser.Game(config);

// --- GAME STATE ---
let player, bots = [], food = [], cursors, joystick = {x:0,y:0};
let gameOver = false, score = 0, highScore = localStorage.getItem('e2e_highscore') || 0;
let hudText, gameOverText, restartBtn;

// --- EVOLUTION DATA ---
const EVOLUTION = {
  ant: { maxLevel: 10, next: 'cockroach', xpToNext: 10 },
  cockroach: { maxLevel: 20, next: null, xpToNext: 20 }
};

const BOT_TYPES = {
  hunter: { color: 0xff4444, speed: 180 },
  coward: { color: 0xffff44, speed: 220 },
  grazer: { color: 0x44ff44, speed: 140 },
  explorer: { color: 0x44ffff, speed: 160 }
};

// --- FOOD TYPES ---
const FOOD_TYPES = {
  leaf: { color: 0x228B22 },
  mushroom: { color: 0xD2691E },
  bug: { color: 0x8B4513 },
  berry: { color: 0xFF0000 },
  seed: { color: 0xA0522D }
};

function preload() {}

function create() {
  const scene = this;
  
  // Spawn player as ANT
  player = createEntity(400, 300, 'player', 'ant');
  
  // Spawn 15 bots
  for(let i=0; i<15; i++) {
    const type = Phaser.Math.RND.pick(Object.keys(BOT_TYPES));
    bots.push(createEntity(
      Phaser.Math.Between(100, 700), 
      Phaser.Math.Between(100, 500), 
      'bot', 'ant', type
    ));
  }
  
  // Spawn 30 food
  for(let i=0; i<30; i++) spawnFood();
  
  // Input
  cursors = this.input.keyboard.createCursorKeys();
  setupJoystick();
  
  // HUD
  hudText = this.add.text(16, 16, '', { fontSize: '18px', fill: '#fff', backgroundColor: '#0008', padding: 8 });
  gameOverText = this.add.text(400, 300, '', { fontSize: '32px', fill: '#ff0' }).setOrigin(0.5).setVisible(false);
  restartBtn = this.add.text(400, 350, 'PLAY AGAIN', { fontSize: '24px', fill: '#0f0', backgroundColor: '#000' })
   .setOrigin(0.5).setInteractive().setVisible(false)
   .on('pointerdown', () => location.reload());
  
  showTutorial();
}

function createEntity(x, y, role, type, personality=null) {
  const scene = game.scene.scenes[0];
  const color = role==='player'?0x8B4513:BOT_TYPES[personality].color;
  
  // --- ANT SPRITE: 3 circles + 6 legs in a Container ---
  const tail = scene.add.circle(-10, 0, 6, color);
  const body = scene.add.circle(0, 0, 8, color);
  const head = scene.add.circle(10, 0, 5, color);
  
  const legs = [];
  for(let i=-1;i<=1;i++){
    legs.push(scene.add.line(0,0,-6,i*5,-14,i*8,0x000000).setLineWidth(2));
    legs.push(scene.add.line(0,0,6,i*5,14,i*8,0x000).setLineWidth(2));
  }
  
  const sprite = scene.add.container(x,y,[tail,body,head,...legs]);
  
  return { 
    x, y, vx:0, vy:0, sprite, 
    role, type, personality, 
    level:1, xp:0, size:1, 
    speed: role==='player'?200:BOT_TYPES[personality].speed, 
    alive:true,
    parts: {tail, body, head} // save parts for cockroach evolution
  };
}

function createFood(x, y) {
  const scene = game.scene.scenes[0];
  const type = Phaser.Math.RND.pick(Object.keys(FOOD_TYPES));
  const color = FOOD_TYPES[type].color;
  let sprite;
  
  // --- FOOD SPRITES ---
  if(type === 'leaf') sprite = scene.add.ellipse(0, 0, 12, 8, color);
  else if(type === 'mushroom') {
    sprite = scene.add.container(0,0);
    sprite.add(scene.add.circle(0, -4, 6, color)); // cap
    sprite.add(scene.add.rectangle(0, 2, 4, 6, 0xffffff)); // stem
  }
  else if(type === 'bug') {
    sprite = scene.add.container(0,0);
    sprite.add(scene.add.ellipse(0, 0, 8, 4, color));
    for(let i=-1;i<=1;i++) sprite.add(scene.add.line(0,0,-4,i*2,-6,i*3,0x000).setLineWidth(1));
  }
  else if(type === 'berry') {
    sprite = scene.add.container(0,0);
    sprite.add(scene.add.circle(0, 0, 5, color));
    sprite.add(scene.add.circle(0, -4, 2, 0x00ff00)); // leaf top
  }
  else { // seed
    sprite = scene.add.ellipse(0, 0, 6, 10, color);
  }
  
  sprite.x = x; sprite.y = y;
  return { x, y, sprite, type };
}

function spawnFood() {
  food.push(createFood(Phaser.Math.Between(50, 750), Phaser.Math.Between(50, 550)));
}

function update() {
  if(gameOver) return;
  
  handleInput();
  updateEntity(player);
  bots.forEach(b => { updateAI(b); updateEntity(b); });
  checkCollisions();
  updateHUD();
}

function handleInput() {
  let dx=0, dy=0;
  if(cursors.left.isDown) dx=-1;
  if(cursors.right.isDown) dx=1;
  if(cursors.up.isDown) dy=-1;
  if(cursors.down.isDown) dy=1;
  dx += joystick.x; dy += joystick.y;
  
  player.vx = dx * player.speed;
  player.vy = dy * player.speed;
}

function updateAI(bot) {
  const dist = Phaser.Math.Distance.Between(player.x, player.y, bot.x, bot.y);
  if(bot.personality === 'hunter' && dist < 200) {
    bot.vx = (player.x - bot.x) * 0.05;
    bot.vy = (player.y - bot.y) * 0.05;
  } else if(bot.personality === 'coward' && dist < 150) {
    bot.vx = (bot.x - player.x) * 0.05;
    bot.vy = (bot.y - player.y) * 0.05;
  } else {
    bot.vx = Math.sin(Date.now()*0.001 + bot.x)*0.5;
    bot.vy = Math.cos(Date.now()*0.001 + bot.y)*0.5;
  }
}

function updateEntity(e) {
  if(!e.alive) return;
  e.x += e.vx * 0.016;
  e.y += e.vy * 0.016;
  e.sprite.x = e.x;
  e.sprite.y = e.y;
  
  // --- MAKE IT FACE WHERE IT MOVES ---
  if(e.vx || e.vy){
    e.sprite.rotation = Math.atan2(e.vy, e.vx);
  }
  
  // Scale with size
  e.sprite.setScale(e.size);
  
  // Keep in bounds
  e.x = Phaser.Math.Clamp(e.x, 20, 780);
  e.y = Phaser.Math.Clamp(e.y, 20, 580);
}

function checkCollisions() {
  // Player eats food
  food = food.filter(f => {
    if(Phaser.Math.Distance.Between(player.x, player.y, f.x, f.y) < 15 * player.size) {
      f.sprite.destroy();
      gainXP(player, 1);
      score += 10;
      spawnFood();
      return false;
    }
    return true;
  });
  
  // Player vs bots
  bots.forEach(b => {
    if(!b.alive) return;
    const dist = Phaser.Math.Distance.Between(player.x, player.y, b.x, b.y);
    const mySize = 8 * player.size;
    const botSize = 8 * b.size;
    if(dist < mySize + botSize) {
      if(player.size > b.size) {
        b.alive = false; b.sprite.destroy();
        gainXP(player, 3);
        score += 50;
      } else {
        gameOverSequence();
      }
    }
  });
}

function gainXP(entity, amount) {
  entity.xp += amount;
  const evo = EVOLUTION[entity.type];
  if(entity.xp >= evo.xpToNext && entity.level < evo.maxLevel) {
    entity.level++; entity.xp = 0; entity.size += 0.15;
    
    // --- COCKROACH EVOLUTION ---
    if(entity.level === 10 && evo.next) {
      entity.type = 'cockroach';
      // make it dark and bigger
      entity.parts.tail.setFillStyle(0x222);
      entity.parts.body.setFillStyle(0x222);
      entity.parts.head.setFillStyle(0x222222);
      entity.sprite.setScale(entity.size * 1.3);
      showEvolveText();
    }
  }
}

function updateHUD() {
  hudText.setText(`Type: ${player.type}\nLevel: ${player.level} / ${EVOLUTION[player.type].maxLevel}\nSize: ${player.size.toFixed(1)}\nXP: ${player.xp}/${EVOLUTION[player.type].xpToNext}\nScore: ${score}`);
}

function showEvolveText() {
  const txt = game.scene.scenes[0].add.text(400, 200, 'EVOLVED TO COCKROACH!', { fontSize: '28px', fill: '#FFD700' }).setOrigin(0.5);
  game.scene.scenes[0].time.delayedCall(2000, () => txt.destroy());
}

function showTutorial() {
  const txt = game.scene.scenes[0].add.text(400, 300, 'Reach Level 10 to evolve into Cockroach\nClick to continue', { fontSize: '20px', fill: '#fff', align: 'center' }).setOrigin(0.5).setBackgroundColor('#000a').setPadding(16);
  game.scene.scenes[0].input.once('pointerdown', () => txt.destroy());
}

function gameOverSequence() {
  gameOver = true;
  highScore = Math.max(highScore, score);
  localStorage.setItem('e2e_highscore', highScore);
  gameOverText.setText(`GAME OVER\nScore: ${score}`).setVisible(true);
  restartBtn.setVisible(true);
}

function setupJoystick() {
  const joy = document.createElement('div');
  joy.style = 'position:fixed;bottom:40px;left:40px;width:100px;height:100px;border:2px solid #fff;border-radius:50%;opacity:0.5;z-index:1000';
  document.body.appendChild(joy);
  joy.addEventListener('touchmove', e => {
    const t = e.touches[0];
    const rect = joy.getBoundingClientRect();
    joystick.x = (t.clientX - rect.left - 50) / 50;
    joystick.y = (t.clientY - rect.top - 50) / 50;
  });
  joy.addEventListener('touchend', () => { joystick.x=0; joystick.y=0; });
    }
