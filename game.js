window.onerror = (message, source, line, column) => {
  alert(`CRASH\n${message}\n${source}:${line}:${column}`);
  return true;
};

// ===== WORLD SETUP =====
const WORLD_WIDTH = 4000;
const WORLD_HEIGHT = 4000;
let player, entities = [], food = [], props = [];
let joystick = {x: 0, y: 0, active: false}, sprinting = false;
let skillCooldowns = [0, 0];
let sceneRef;

const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    backgroundColor: '#2a5d2a',
    physics: { default: 'arcade' },
    scene: { preload, create, update }
};
const game = new Phaser.Game(config);

function preload() {
    // Load sprites. If they 404, we fallback to colored circles
    this.load.image('grass', 'assets/grass_tile.png');
    this.load.image('ant', 'assets/ant.png');
    this.load.image('lizard', 'assets/lizard.png');
    this.load.image('bird', 'assets/bird.png');
    this.load.image('rock', 'assets/rock.png');
    this.load.image('bush', 'assets/bush.png');
}

function create() {
    sceneRef = this;
    this.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    this.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    setupJoystick();
    setupSkills();
    createWorld(this);
    player = createPlayer(this, "ant");
    this.cameras.main.startFollow(player.sprite, true, 0.08, 0.08);

    for(let i = 0; i < 80; i++) spawnFood(this);
    for(let i = 0; i < 20; i++) spawnBot(this);

    updateHUD();
}

function update(time, delta) {
    if(!player) return;
    const dt = delta / 1000;

    handlePlayerMovement(dt);
    updateCooldowns(dt);
    updateHUD();
}

// ===== PLAYER & CREATURE SYSTEM =====
function createPlayer(scene, type) {
    const data = CREATURES[type];
    const sprite = scene.add.sprite(WORLD_WIDTH/2, WORLD_HEIGHT/2, scene.textures.exists(type)? type : null);
    if(!sprite.texture) sprite.setTexture(null).setFillStyle(data.color).setCircle(20); // fallback circle

    sprite.setDepth(10);
    SKILLS[data.passive].effect({sprite, data}); // Apply passive

    // Set skill icons
    document.querySelector('#s1Wrap.skillIcon').innerText = SKILLS[data.skills[0]].icon;
    document.querySelector('#s2Wrap.skillIcon').innerText = SKILLS[data.skills[1]].icon;

    return {
        sprite, type, data,
        xp: 0, level: 1,
        mastery: {[data.skills[0]]: 0, [data.skills[1]]: 0},
        carryMultiplier: 1
    };
}

function handlePlayerMovement(dt) {
    const speed = sprinting? player.data.speed * 1.8 : player.data.speed;
    player.sprite.x += joystick.x * speed * dt;
    player.sprite.y += joystick.y * speed * dt;
    player.sprite.x = Phaser.Math.Clamp(player.sprite.x, 0, WORLD_WIDTH);
    player.sprite.y = Phaser.Math.Clamp(player.sprite.y, 0, WORLD_HEIGHT);
}

// ===== SKILL SYSTEM =====
function setupSkills() {
    document.getElementById('s1Wrap').addEventListener('touchstart', () => useSkill(0));
    document.getElementById('s2Wrap').addEventListener('touchstart', () => useSkill(1));
    document.getElementById('sprintWrap').addEventListener('touchstart', () => sprinting = true);
    document.getElementById('sprintWrap').addEventListener('touchend', () => sprinting = false);
}

function useSkill(index) {
    if(skillCooldowns[index] > 0 ||!player) return;
    const skillName = player.data.skills[index];
    SKILLS[skillName].activate(player, sceneRef);
    skillCooldowns[index] = SKILLS[skillName].cooldown;
    player.mastery[skillName]++;
}

function updateCooldowns(dt) {
    skillCooldowns[0] = Math.max(0, skillCooldowns[0] - dt);
    skillCooldowns[1] = Math.max(0, skillCooldowns[1] - dt);

    if(player) {
        drawRadialCooldown('cd1', skillCooldowns[0] / SKILLS[player.data.skills[0]].cooldown, Math.ceil(skillCooldowns[0]));
        drawRadialCooldown('cd2', skillCooldowns[1] / SKILLS[player.data.skills[1]].cooldown, Math.ceil(skillCooldowns[1]));
    }
}

// MOBILE LEGENDS STYLE RADIAL COOLDOWN
function drawRadialCooldown(canvasId, percent, number) {
    const canvas = document.getElementById(canvasId);
    if(!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width = canvas.offsetWidth * 2; // for retina
    const h = canvas.height = canvas.offsetHeight * 2;
    canvas.style.width = canvas.offsetWidth + 'px';
    canvas.style.height = canvas.offsetHeight + 'px';
    ctx.scale(2,2);

    ctx.clearRect(0,0,w/2,h/2);
    if(percent <= 0.001) return;

    const cx = w/4, cy = h/4, r = w/4;
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, -Math.PI/2, -Math.PI/2 + Math.PI*2*percent);
    ctx.lineTo(cx, cy);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number > 0? number : '', cx, cy);
}

// ===== WORLD GENERATION =====
function createWorld(scene) {
    // Tiled grass background
    for(let x = 0; x < WORLD_WIDTH; x += 256) {
        for(let y = 0; y < WORLD_HEIGHT; y += 256) {
            scene.add.image(x, y, 'grass').setOrigin(0);
        }
    }
    // Props
    for(let i = 0; i < 200; i++) {
        const type = Phaser.Math.RND.pick(['rock', 'bush']);
        const prop = scene.add.image(Phaser.Math.Between(0,WORLD_WIDTH), Phaser.Math.Between(0,WORLD_HEIGHT), type);
        prop.setScale(Phaser.Math.FloatBetween(0.8, 1.2));
        props.push(prop);
    }
}

function spawnFood(scene) {
    const f = scene.add.circle(Phaser.Math.Between(0,WORLD_WIDTH), Phaser.Math.Between(0,WORLD_HEIGHT), 8, 0x00ff00).setDepth(5);
    food.push(f);
}

function spawnBot(scene) {
    const type = Phaser.Math.RND.pick(Object.keys(CREATURES));
    const bot = scene.add.sprite(Phaser.Math.Between(0,WORLD_WIDTH), Phaser.Math.Between(0,WORLD_HEIGHT), type);
    bot.setScale(0.8);
    entities.push(bot);
}

// ===== UI =====
function updateHUD() {
    if(!player) return;
    const masteryLvl = Math.floor(player.mastery[player.data.skills[1]] / 50) + 1;
    document.getElementById('hud').innerHTML =
        `LVL ${player.level} ${player.type.toUpperCase()}<br>XP: ${player.xp}/10<br>${SKILLS[player.data.skills[1]].name} Lvl: ${masteryLvl}`;
}

// ===== JOYSTICK =====
function setupJoystick() {
    const joy = document.getElementById('joystick');
    const stick = document.getElementById('stick');
    const radius = 70;

    const move = (x, y) => {
        let dx = x - radius;
        let dy = y - radius;
        const dist = Math.min(radius, Math.sqrt(dx*dx + dy*dy));
        const angle = Math.atan2(dy,dx);
        joystick.x = Math.cos(angle) * dist / radius;
        joystick.y = Math.sin(angle) * dist / radius;
        stick.style.left = (radius - 30 + joystick.x * (radius-30)) + 'px';
        stick.style.top = (radius - 30 + joystick.y * (radius-30)) + 'px';
    }

    joy.addEventListener('touchstart', e => { joystick.active = true; move(e.touches[0].clientX - joy.getBoundingClientRect().left, e.touches[0].clientY - joy.getBoundingClientRect().top); });
    joy.addEventListener('touchmove', e => { move(e.touches[0].clientX - joy.getBoundingClientRect().left, e.touches[0].clientY - joy.getBoundingClientRect().top); });
    joy.addEventListener('touchend', () => { joystick = {x:0,y:0}; stick.style.left='40px'; stick.style.top='40px'; });
          }
