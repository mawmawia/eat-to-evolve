import Phaser from 'phaser';
import { io } from 'socket.io-client';
import nipplejs from 'nipplejs';

const socket = io(); // same domain on Vercel

let myId, players = {}, foods = {};
let playerSprites = new Map();
let foodSprites = new Map();
let cursors;

const config = {
  type: Phaser.AUTO, 
  width: window.innerWidth, 
  height: window.innerHeight,
  backgroundColor: '#2d5a2d',
  physics: { default: 'arcade' },
  scene: { create, update }
};

const game = new Phaser.Game(config);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight);
});

function create() {
  this.cameras.main.setBounds(0, 0, 2000, 2000);
  
  cursors = this.input.keyboard.createCursorKeys();
  
  // Mobile joystick
  if (this.sys.game.device.os.mobile) {
    const joystick = nipplejs.create({ 
      zone: document.body, 
      mode: 'static', 
      position: { left: '15%', bottom: '20%' }, 
      color: 'white',
      size: 100
    });
    joystick.on('move', (evt, data) => { 
      if (data.vector) socket.emit('move', { dx: data.vector.x, dy: data.vector.y }); 
    });
  }

  socket.on('snapshot', (data) => {
    myId = data.id; 
    players = data.players;
    data.foods.forEach(f => foods[f.id] = f);
    createAllSprites.call(this);
  });

  socket.on('delta', (d) => {
    d.moved?.forEach(m => { if (players[m.id]) Object.assign(players[m.id], m); });
    d.stats?.forEach(s => { if (players[s.id]) Object.assign(players[s.id], s); });
    d.ate?.forEach(fid => { delete foods[fid]; foodSprites.get(fid)?.destroy(); foodSprites.delete(fid); });
    d.spawned?.forEach(f => { 
      foods[f.id] = f; 
      const color = {seed:0x8B4513, berry:0xFF0000, bug:0x00FF00, mushroom:0xFF69B4, leaf:0x228B22}[f.type];
      const s = this.add.circle(f.x, f.y, 8, color).setStrokeStyle(1, 0x000); 
      foodSprites.set(f.id, s); 
    });
    d.died?.forEach(id => { playerSprites.get(id)?.setAlpha(0.3); if (id === myId) document.getElementById('dead').style.display = 'block'; });
    d.evolved?.forEach(e => { 
      if (players[e.id]) { 
        players[e.id].type = e.type;
        const sprite = playerSprites.get(e.id);
        if(sprite) {
          sprite.setFillStyle(0x222); // cockroach = dark
          sprite.setRadius(28 * players[e.id].size); // bigger
        }
      } 
    });
  });

  socket.on('leaderboard', (lb) => {
    document.getElementById('lb-list').innerHTML = lb.map((p, i) => `${i + 1}. ${p.name} - ${p.size.toFixed(1)}`).join('<br>');
  });
}

function createAllSprites() {
  for (let id in players) { 
    const p = players[id];
    const color = p.type === 'ant'? 0xD2691E : 0x222; // brown ant, black roach
    const radius = p.type === 'ant'? 16 : 28;
    const sprite = this.add.circle(p.x, p.y, radius * p.size, color).setStrokeStyle(2, 0x000);
    sprite.id = id; 
    playerSprites.set(id, sprite); 
  }
  
  const foodColors = {seed:0x8B4513, berry:0xFF0000, bug:0x00FF00, mushroom:0xFF69B4, leaf:0x228B22};
  for (let id in foods) { 
    const f = foods[id]; 
    const sprite = this.add.circle(f.x, f.y, 8, foodColors[f.type]).setStrokeStyle(1, 0x000); 
    foodSprites.set(f.id, sprite); 
  }
}

function update() {
  if (!players[myId]) return;
  const me = players[myId];
  const mySprite = playerSprites.get(myId);
  if(mySprite) this.cameras.main.startFollow(mySprite, true, 0.1, 0.1);

  let dx = 0, dy = 0;
  if (cursors.left.isDown) dx = -1; if (cursors.right.isDown) dx = 1;
  if (cursors.up.isDown) dy = -1; if (cursors.down.isDown) dy = 1;
  if (dx || dy) { const len = Math.hypot(dx, dy); socket.emit('move', { dx: dx / len, dy: dy / len }); }

  playerSprites.forEach((sprite, id) => {
    if (players[id]) {
      sprite.x = players[id].x; 
      sprite.y = players[id].y;
      const baseRadius = players[id].type === 'ant'? 16 : 28;
      sprite.setRadius(baseRadius * players[id].size); 
      sprite.setAlpha(players[id].dead? 0.3 : 1);
    }
  });
  
  if(me) {
    document.getElementById('ui').innerHTML = `Type: ${me.type}<br>Lvl: ${me.level}<br>XP: ${me.xp}/${me.level * 10}<br>Size: ${me.size.toFixed(1)}`;
    if (!me.dead) document.getElementById('dead').style.display = 'none';
  }
}
