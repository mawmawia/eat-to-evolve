import { Server } from 'socket.io';
import { v4 as uuid } from 'uuid';

const WORLD_SIZE = 2000, FOOD_COUNT = 300, EVOLVE_LVL = 10, EAT_SIZE_DIFF = 1.2, RESPAWN_TIME = 3000, TICK_RATE = 50;

let players = {};
let foods = new Map();

function spawnFood(n = 1) {
  const spawned = [];
  for (let i = 0; i < n; i++) {
    const id = uuid();
    const food = { id, x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, type: ['seed', 'berry', 'bug', 'mushroom', 'leaf'][Math.floor(Math.random() * 5)] };
    foods.set(id, food);
    spawned.push(food);
  }
  return spawned;
}
spawnFood(FOOD_COUNT);

export default function handler(req, res) {
  if (res.socket.server.io) {
    res.end();
    return;
  }

  const io = new Server(res.socket.server, { path: '/socket.io' });
  res.socket.server.io = io;

  io.on('connection', (socket) => {
    players[socket.id] = { id: socket.id, x: Math.random() * WORLD_SIZE, y: Math.random() * WORLD_SIZE, size: 1.0, xp: 0, level: 1, type: 'ant', name: 'Ant' + Math.floor(Math.random() * 1000), speed: 2.5, dead: false };
    socket.emit('snapshot', { id: socket.id, players, foods: Array.from(foods.values()), WORLD_SIZE });

    socket.on('move', (data) => {
      const p = players[socket.id];
      if (!p || p.dead) return;
      let mag = Math.hypot(data.dx, data.dy);
      if(mag > 1.01) { data.dx /= mag; data.dy /= mag; }
      p.x += data.dx * p.speed; p.y += data.dy * p.speed;
      p.x = Math.max(0, Math.min(WORLD_SIZE, p.x)); p.y = Math.max(0, Math.min(WORLD_SIZE, p.y));
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
  });

  // Game Loop
  setInterval(() => {
    const delta = { moved: [], ate: [], spawned: [], died: [], evolved: [], stats: [] };
    for (let id in players) {
      const p = players[id]; if (p.dead) continue;
      for (let [fid, f] of foods) {
        if (Math.hypot(p.x - f.x, p.y - f.y) < p.size * 10) {
          foods.delete(fid); delta.ate.push(fid);
          const newFoods = spawnFood(1); delta.spawned.push(...newFoods);
          p.xp += 1; p.size += 0.02;
          delta.stats.push({id: p.id, xp: p.xp, level: p.level, size: p.size});
          if (p.xp >= p.level * 10) {
            p.level++; p.xp = 0;
            if (p.level >= EVOLVE_LVL && p.type === 'ant') {
              p.type = 'cockroach'; p.size *= 1.8; p.speed *= 1.3;
              delta.evolved.push({ id: p.id, type: 'cockroach' });
              delta.stats.push({id: p.id, size: p.size, speed: p.speed});
            }
          }
        }
      }
    }
    const arr = Object.values(players).filter(p =>!p.dead);
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        const a = arr[i], b = arr[j];
        if (Math.hypot(a.x - b.x, a.y - b.y) < (a.size + b.size) * 5) {
          if (a.size > b.size * EAT_SIZE_DIFF) killPlayer(b, delta);
          else if (b.size > a.size * EAT_SIZE_DIFF) killPlayer(a, delta);
        }
      }
    }
    Object.values(players).forEach(p => delta.moved.push({id:p.id,x:p.x,y:p.y}));
    if (Object.values(delta).some(arr => arr.length > 0)) io.emit('delta', delta);
  }, TICK_RATE);

  setInterval(() => {
    const lb = Object.values(players).filter(p =>!p.dead).sort((a, b) => b.size - a.size).slice(0, 10).map(p => ({ name: p.name, size: Math.floor(p.size * 10), type: p.type }));
    io.emit('leaderboard', lb);
  }, 500);

  function killPlayer(p, delta) {
    p.dead = true; delta.died.push(p.id);
    setTimeout(() => {
      p.dead = false; p.x = Math.random() * WORLD_SIZE; p.y = Math.random() * WORLD_SIZE;
      p.size = 1.0; p.xp = 0; p.level = 1; p.type = 'ant'; p.speed = 2.5;
    }, RESPAWN_TIME);
  }
  res.end();
}
