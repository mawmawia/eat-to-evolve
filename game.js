window.onerror = (m,s,l,c) => { alert(`CRASH\n${m}\n${s}:${l}`); return true; };

const WORLD_WIDTH = 4000, WORLD_HEIGHT = 4000;
let player, entities = [], food = [];
let joystick = {x: 0, y: 0, active: false}, sprinting = false;
let skillCooldowns = [0, 0];

const config = { type: Phaser.AUTO, width: window.innerWidth, height: window.innerHeight, backgroundColor: '#1a4d1a', scene: { preload, create, update } };
const game = new Phaser.Game(config);

function preload() {}
function create() {
  setupJoystick(); setupSkills();
  player = createPlayer(this, "ant");
  for(let i=0;i<50;i++) spawnFood(this);
  updateHUD();
}

function createPlayer(scene, type) {
  const data = CREATURES[type];
  const sprite = scene.add.circle(WORLD_WIDTH/2, WORLD_HEIGHT/2, 20, data.color);
  SKILLS[data.passive].effect({sprite}); // Apply passive
  document.getElementById('skill1').innerHTML = SKILLS[data.skills[0]].icon + '<div class="cooldown" id="cd1"></div>';
  document.getElementById('skill2').innerHTML = SKILLS[data.skills[1]].icon + '<div class="cooldown" id="cd2"></div>';
  return {sprite, type, data, xp: 0, mastery: {acidSpray: 0, leafCamo: 0}, carryMultiplier: 1};
}

function setupJoystick() {
  const joy = document.getElementById('joystick');
  joy.addEventListener('touchstart', e => joystick.active = true);
  joy.addEventListener('touchmove', e => {
    const touch = e.touches[0];
    const rect = joy.getBoundingClientRect();
    let x = touch.clientX - rect.left - 60;
    let y = touch.clientY - rect.top - 60;
    const dist = Math.min(60, Math.sqrt(x*x + y*y));
    const angle = Math.atan2(y,x);
    joystick.x = Math.cos(angle) * dist / 60;
    joystick.y = Math.sin(angle) * dist / 60;
    document.getElementById('stick').style.left = 35 + joystick.x * 35 + 'px';
    document.getElementById('stick').style.top = 35 + joystick.y * 35 + 'px';
  });
  joy.addEventListener('touchend', () => {joystick = {x:0,y:0}; document.getElementById('stick').style.left='35px'; document.getElementById('stick').style.top='35px';});
  document.getElementById('sprintBtn').addEventListener('touchstart', () => sprinting = true);
  document.getElementById('sprintBtn').addEventListener('touchend', () => sprinting = false);
}

function setupSkills() {
  document.getElementById('skill1').addEventListener('touchstart', () => useSkill(0));
  document.getElementById('skill2').addEventListener('touchstart', () => useSkill(1));
}

function useSkill(index) {
  if(skillCooldowns[index] > 0) return;
  const skillName = player.data.skills[index];
  SKILLS[skillName].activate(player, game.scene.scenes[0]);
  skillCooldowns[index] = SKILLS[skillName].cooldown;
}

function update() {
  if(!player) return;
  // Movement
  const speed = sprinting ? player.data.speed * 1.8 : player.data.speed;
  player.sprite.x += joystick.x * speed * 0.016;
  player.sprite.y += joystick.y * speed * 0.016;
  
  // Cooldown UI
  skillCooldowns = skillCooldowns.map(cd => Math.max(0, cd - 0.016));
  document.getElementById('cd1').style.height = (skillCooldowns[0] / SKILLS[player.data.skills[0]].cooldown * 100) + '%';
  document.getElementById('cd2').style.height = (skillCooldowns[1] / SKILLS[player.data.skills[1]].cooldown * 100) + '%';
}

function spawnFood(scene) { food.push(scene.add.circle(Math.random()*WORLD_WIDTH, Math.random()*WORLD_HEIGHT, 8, 0x00ff00)); }
function updateHUD() { document.getElementById('hud').innerText = `Level: 1 | ANT\nXP: ${player.xp}/10\nAcid Lvl: ${Math.floor(player.mastery.acidSpray/50)+1}`; }
