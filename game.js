window.onerror = (message, source, line, column) => {
  alert(`JS CRASH\n${message}\n${source}:${line}:${column}`);
  return true;
};

const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;
let player, entities = [], food = [], gameOver = false;
let foodEaten = 0, enemiesDefeated = 0;
let cursors, wasd, shiftKey; // added wasd

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#1a4d1a',
    physics: { default: 'arcade' },
    scene: { preload, create, update }
};

const game = new Phaser.Game(config);

function preload() {
    // Try to load sprites. If they 404, game still runs with circles from creatures.js fallback
    for (const type in EVOLUTIONS) {
        this.load.image(type, `assets/${type}.png`);
    }
}

function create() {
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    
    // FIX: Arrow keys + WASD separately
    cursors = this.input.keyboard.createCursorKeys();
    wasd = this.input.keyboard.addKeys('W,S,A,D'); // THIS WAS MISSING
    shiftKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SHIFT);

    player = createEntity(this, WORLD_WIDTH/2, WORLD_HEIGHT/2, "player", "ant");
    this.cameras.main.startFollow(player.sprite, true, 0.1, 0.1);
    addIdleAnimation(this, player, "ant");

    for(let i = 0; i < 100; i++) { spawnFood(this); }
    for(let i = 0; i < 30; i++) { spawnBot(this); }
    createGameOverPanel(this);
    updateHUD(); // If this runs, HUD will appear
}

function update() {
    if(gameOver) return;
    handlePlayerMovement(this);
    updateEntities(this);
    checkCollisions(this);
}

function handlePlayerMovement(scene) {
    const speed = shiftKey.isDown ? player.speed * 1.8 : player.speed;
    player.vx = 0; player.vy = 0;
    
    // FIXED: Use both cursors and wasd
    if (cursors.left.isDown || wasd.A.isDown) player.vx = -speed;
    if (cursors.right.isDown || wasd.D.isDown) player.vx = speed;
    if (cursors.up.isDown || wasd.W.isDown) player.vy = -speed;
    if (cursors.down.isDown || wasd.S.isDown) player.vy = speed;
    
    player.sprite.x += player.vx * 0.016; 
    player.sprite.y += player.vy * 0.016;
    player.sprite.x = Phaser.Math.Clamp(player.sprite.x, 0, WORLD_WIDTH);
    player.sprite.y = Phaser.Math.Clamp(player.sprite.y, 0, WORLD_HEIGHT);
}

function spawnFood(scene) {
    const x = Phaser.Math.Between(0, WORLD_WIDTH);
    const y = Phaser.Math.Between(0, WORLD_HEIGHT);
    const f = scene.add.circle(x, y, 8, 0x00ff00).setDepth(5);
    food.push({x, y, sprite: f});
}

function spawnBot(scene) {
    const types = Object.keys(EVOLUTIONS);
    const personalities = Object.keys(BOT_TYPES);
    const type = Phaser.Math.RND.pick(types);
    const personality = Phaser.Math.RND.pick(personalities);
    const x = Phaser.Math.Between(0, WORLD_WIDTH);
    const y = Phaser.Math.Between(0, WORLD_HEIGHT);
    const bot = createEntity(scene, x, y, "bot", type, personality);
    addIdleAnimation(scene, bot, type);
    entities.push(bot);
}

function updateEntities(scene) {
    entities.forEach(e => {
        if(!e.alive) return;
        e.sprite.x += Math.sin(Date.now() * 0.001 + e.x) * 0.5;
        e.sprite.y += Math.cos(Date.now() * 0.001 + e.y) * 0.5;
    });
}

function checkCollisions(scene) {
    food = food.filter(f => {
        if(Phaser.Math.Distance.Between(player.sprite.x, player.sprite.y, f.x, f.y) < 25) {
            f.sprite.destroy();
            player.xp += 1; foodEaten++;
            showFloatingXP(scene, f.x, f.y, 1);
            if(player.xp >= EVOLUTIONS[player.type].xpToNext && EVOLUTIONS[player.type].next) {
                evolveTo(scene, EVOLUTIONS[player.type].next, player.sprite.x, player.sprite.y);
            }
            updateHUD();
            return false;
        }
        return true;
    });
}

function updateHUD() {
    document.getElementById('hud').innerHTML =
        `Level: ${player.level} | ${player.type.toUpperCase()}<br>XP: ${player.xp}/${EVOLUTIONS[player.type].xpToNext}<br>Food: ${foodEaten} | Kills: ${enemiesDefeated}`;
}

function playSfx(name) { /* placeholder */ }
