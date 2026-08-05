const config = { type: Phaser.AUTO, width: window.innerWidth, height: window.innerHeight, backgroundColor: '#1a4d1a', physics: { default: 'arcade' }, scene: { preload, create, update }};
const game = new Phaser.Game(config);
let player, bots = [], food = [], sfx = {}; 
let gameOver = false, foodEaten = 0, enemiesDefeated = 0, lastMinimapUpdate = 0;
const WORLD_WIDTH = 2400, WORLD_HEIGHT = 2400;
let minimap, minimapGfx;

const BIOMES = [
  { name: 'grass', color: 0x1a4d1a, weight: 50, yMin: 0, yMax: 800 },
  { name: 'rock', color: 0x4a4a4a, weight: 25, yMin: 800, yMax: 1600 },
  { name: 'water', color: 0x1e4d6d, weight: 15, yMin: 1600, yMax: 2000 },
  { name: 'volcano', color: 0x6d1e1e, weight: 10, yMin: 2000, yMax: 2400 }
];

function pickBiome() {
  const totalWeight = BIOMES.reduce((sum, b) => sum + b.weight, 0);
  let r = Phaser.Math.Between(0, totalWeight);
  for(const biome of BIOMES) { r -= biome.weight; if(r <= 0) return biome; }
  return BIOMES[0];
}

function preload() {
  ['ant','lizard','bird','shark','crocodile','lion','dragon'].forEach(c => this.load.image(c, `assets/${c}.png`));
  this.load.audio('eat', 'assets/sfx/eat.wav'); this.load.audio('xp', 'assets/sfx/xp.wav');
  this.load.audio('hit', 'assets/sfx/hit.wav'); this.load.audio('hurt', 'assets/sfx/hurt.wav');
  this.load.audio('evolve', 'assets/sfx/evolve.wav'); this.load.audio('levelup', 'assets/sfx/levelup.wav');
  this.load.audio('sprint', 'assets/sfx/sprint.wav'); this.load.audio('gameover', 'assets/sfx/gameover.wav');
}

function create() {
  const scene = this;
  scene.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  scene.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  scene.cameras.main.setDeadzone(180, 120);

  sfx.eat = scene.sound.add('eat', {volume: 0.35}); sfx.xp = scene.sound.add('xp', {volume: 0.25});
  sfx.hit = scene.sound.add('hit', {volume: 0.50}); sfx.hurt = scene.sound.add('hurt', {volume: 0.50});
  sfx.evolve = scene.sound.add('evolve', {volume: 0.75}); sfx.levelup = scene.sound.add('levelup', {volume: 0.60});
  sfx.sprint = scene.sound.add('sprint', {volume: 0.30}); sfx.gameover = scene.sound.add('gameover', {volume: 0.80});

  evolveTo(scene, 'ant', WORLD_WIDTH/2, WORLD_HEIGHT/2);
  for(let i=0; i<60; i++) spawnBot(scene);
  for(let i=0; i<150; i++) spawnFood(scene);
  this.cursors = this.input.keyboard.createCursorKeys();
  setupControls();
  createMinimap(scene);
  createGameOverPanel(scene);
}

function playSfx(name) { // Anti machine-gun
  const sound = sfx[name]; if (!sound) return;
  if (sound.isPlaying) { sound.stop(); }
  sound.play();
}

function update(time, delta) {
  if(gameOver) return;
  const dt = delta / 1000;
  handleInput();
  updateEntity(player, dt);
  bots.forEach(b => { if(b.alive) {updateAI(b, dt); updateEntity(b, dt);} });
  checkCollisions();
  updateHUD();
  if(time - lastMinimapUpdate > 200) { updateMinimap(game.scene.scenes[0]); lastMinimapUpdate = time; }
}

// All other functions: updateEntity, checkCollisions, gainXP, spawnBot, spawnFood, createMinimap, updateMinimap, evolveTo, hitFlash, showFloatingXP, showLevelUp, createGameOverPanel
// are the same as v4.5.1 with playSfx() calls added:
function gainXP(amount, source) {
  player.xp += amount;
  if(source === 'food') { foodEaten++; playSfx("eat"); }
  if(source === 'enemy') { enemiesDefeated++; player.size += 0.03; }
  playSfx("xp"); showFloatingXP(game.scene.scenes[0], player.x, player.y - 30, amount);
  const oldLevel = player.level;
  while (player.xp >= EVOLUTIONS[player.type].xpToNext && EVOLUTIONS[player.type].next) {
    const evo = EVOLUTIONS[player.type]; player.xp -= evo.xpToNext; player.level++;
    evolveTo(game.scene.scenes[0], evo.next, player.x, player.y);
  }
  if(player.level > oldLevel) { playSfx("levelup"); showLevelUp(game.scene.scenes[0]); }
}
