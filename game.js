import Phaser from 'phaser';
import { io } from 'socket.io-client';
import nipplejs from 'nipplejs';

const socket = io(); // NO URL NEEDED - same domain

let myId, players = {}, foods = {};
let playerSprites = new Map();
let foodSprites = new Map();
let glowSprites = new Map();
let cursors;

const config = {
  type: Phaser.AUTO, width: window.innerWidth, height: window.innerHeight,
  backgroundColor: '#3a6b3a', pixelArt: true,
  scene: { preload, create, update }
};
const game = new Phaser.Game(config);

function preload() {
  this.load.spritesheet('ant', 'assets/ant.png', { frameWidth: 32, frameHeight: 32 });
  this.load.spritesheet('cockroach', 'assets/cockroach.png', { frameWidth: 32, frameHeight: 32 });
  ['seed','berry','bug','mushroom','leaf','grass'].forEach(k => this.load.image(k, `assets/${k}.png`));
}

function create() {
  this.add.tileSprite(0, 0, 2000, 2000, 'grass').setOrigin(0);
  this.cameras.main.setBounds(0, 0, 2000, 2000);
  this.anims.create({ key: 'ant_walk', frames: this.anims.generateFrameNumbers('ant', { start: 0, end: 1 }), frameRate: 4, repeat: -1 });
  this.anims.create({ key: 'cockroach_walk', frames: this.anims.generateFrameNumbers('cockroach', { start: 0, end: 1 }), frameRate: 4, repeat: -1 });
  cursors = this.input.keyboard.createCursorKeys();
  if (this.sys.game.device.os.mobile) {
    const joystick = nipplejs.create({ zone: document.body, mode: 'static', position: { left: '15%', bottom: '20%' }, color: 'white' });
    joystick.on('move', (evt, data) => { if (data.vector) socket.emit('move', { dx: data.vector.x, dy: data.vector.y }); });
  }
  socket.on('snapshot', (data) => {
    myId = data.id; players = data.players;
    data.foods.forEach(f => foods[f.id] = f);
    createAllSprites.call(this);
  });
  socket.on('delta', (d) => {
    d.moved?.forEach(m => { if (players[m.id]) Object.assign(players[m.id], m); });
    d.stats?.forEach(s => { if (players[s.id]) Object.assign(players[s.id], s); });
    d.ate?.forEach(fid => { delete foods[fid]; foodSprites.get(fid)?.destroy(); foodSprites.delete(fid); });
    d.spawned?.forEach(f => { foods[f.id] = f; const s = this.add.image(f.x, f.y, f.type).setScale(0.5); foodSprites.set(f.id, s); });
    d.died?.forEach(id => { playerSprites.get(id)?.setAlpha(0.3); if (id === myId) document.getElementById('dead').style.display = 'block'; });
    d.evolved?.forEach(e => { if (players[e.id]) { players[e.id].type = e.type; playerSprites.get(e.id)?.setTexture(e.type); } });
  });
  socket.on('leaderboard', (lb) => {
    document.getElementById('lb-list').innerHTML = lb.map((p, i) => `${i + 1}. ${p.name} - ${p.size}`).join('<br>');
  });
}

function createAllSprites() {
  for (let id in players) { const p = players[id]; const sprite = this.add.sprite(p.x, p.y, p.type).setScale(p.size); sprite.id = id; playerSprites.set(id, sprite); }
  for (let id in foods) { const f = foods[id]; const sprite = this.add.image(f.x, f.y, f.type).setScale(0.5); sprite.id = id; foodSprites.set(id, sprite); }
}

function update() {
  if (!players[myId]) return;
  const me = players[myId];
  this.cameras.main.startFollow(playerSprites.get(myId), true, 0.1, 0.1);
  let dx = 0, dy = 0;
  if (cursors.left.isDown) dx = -1; if (cursors.right.isDown) dx = 1;
  if (cursors.up.isDown) dy = -1; if (cursors.down.isDown) dy = 1;
  if (dx || dy) { const len = Math.hypot(dx, dy); socket.emit('move', { dx: dx / len, dy: dy / len }); }
  playerSprites.forEach((sprite, id) => {
    if (players[id]) {
      sprite.x = players[id].x; sprite.y = players[id].y;
      sprite.setScale(players[id].size); sprite.setAlpha(players[id].dead? 0.3 : 1);
      if (dx || dy) sprite.anims.play(players[id].type + '_walk', true); else sprite.anims.stop();
      if (players[id].level === 9) {
        if(!glowSprites.has(id)) glowSprites.set(id, this.add.circle(0,0, 40, 0xffff00, 0.2).setDepth(-1));
        glowSprites.get(id).setPosition(sprite.x, sprite.y).setVisible(true);
      } else glowSprites.get(id)?.setVisible(false);
    }
  });
  document.getElementById('stats').innerHTML = `Type: ${me.type}<br>Lvl: ${me.level}<br>XP: ${me.xp}/${me.level * 10}<br>Size: ${me.size.toFixed(1)}`;
  if (!me.dead) document.getElementById('dead').style.display = 'none';
}
