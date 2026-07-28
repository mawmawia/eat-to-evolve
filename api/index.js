import { Server } from 'socket.io';
import { v4 as uuid } from 'uuid';

const MAP_SIZE = 2000;
const FOOD_TYPES = ['seed', 'berry', 'bug', 'mushroom', 'leaf'];

let players = {};
let foods = {};

function spawnFood() {
  const id = uuid();
  foods[id] = {
    id,
    x: Math.random() * MAP_SIZE,
    y: Math.random() * MAP_SIZE,
    type: FOOD_TYPES[Math.floor(Math.random() * FOOD_TYPES.length)]
  };
  return foods[id];
}

for(let i = 0; i < 100; i++) spawnFood();

export default function handler(req, res) {
  if (res.socket.server.io) {
    res.end();
    return;
  }
  
  const io = new Server(res.socket.server, { path: '/socket.io' });
  res.socket.server.io = io;

  io.on('connection', (socket) => {
    const id = socket.id;
    players[id] = {
      id, x: MAP_SIZE/2, y: MAP_SIZE/2,
      type: 'ant', level: 1, xp: 0, size: 1,
      speed: 200, dead: false, name: 'Player' + id.slice(0,4)
    };

    socket.emit('snapshot', { id, players, foods: Object.values(foods) });

    socket.on('move', ({ dx, dy }) => {
      const p = players[id];
      if(!p || p.dead) return;
      const speed = p.speed / (p.size * 0.5 + 0.5); // bigger = slower
      p.x += dx * speed * 0.016;
      p.y += dy * speed * 0.016;
      p.x = Math.max(0, Math.min(MAP_SIZE, p.x));
      p.y = Math.max(0, Math.min(MAP_SIZE, p.y));
      socket.broadcast.emit('delta', { moved: [{id, x: p.x, y: p.y}] });
    });

    socket.on('disconnect', () => { delete players[id]; });
  });

  setInterval(() => {
    const moved = [];
    const ate = [];
    const spawned = [];
    const died = [];
    const evolved = [];
    const stats = [];

    for(let pid in players) {
      const p = players[pid];
      if(p.dead) continue;

      for(let fid in foods) {
        const f = foods[fid];
        const dist = Math.hypot(p.x - f.x, p.y - f.y);
        const radius = (p.type === 'ant'? 16 : 28) * p.size;
        if(dist < radius + 8) {
          ate.push(fid);
          delete foods[fid];
          p.xp += 1;
          p.size += 0.05;
          if(p.xp >= p.level * 10) {
            p.level++;
            p.xp = 0;
            if(p.level >= 10 && p.type === 'ant') {
              p.type = 'cockroach';
              evolved.push({id: pid, type: 'cockroach'});
            }
          }
          stats.push({id: pid, level: p.level, xp: p.xp, size: p.size});
          const newFood = spawnFood();
          spawned.push(newFood);
        }
      }

      for(let oid in players) {
        if(pid === oid) continue;
        const o = players[oid];
        if(o.dead) continue;
        const dist = Math.hypot(p.x - o.x, p.y - o.y);
        const pr = (p.type === 'ant'? 16 : 28) * p.size;
        const or = (o.type === 'ant'? 16 : 28) * o.size;
        if(dist < (pr + or) / 2) {
          if(p.size > o.size * 1.2) {
            p.size += o.size * 0.3;
            o.dead = true;
            died.push(oid);
            setTimeout(() => { 
              o.dead = false; 
              o.x = MAP_SIZE/2; 
              o.y = MAP_SIZE/2; 
              o.size = 1; 
              o.level = 1; 
              o.xp = 0; 
              o.type = 'ant';
            }, 3000);
          }
        }
      }
    }

    if(moved.length || ate.length || spawned.length || died.length || evolved.length || stats.length) {
      io.emit('delta', { moved, ate, spawned, died, evolved, stats });
    }

    const lb = Object.values(players).sort((a,b) => b.size - a.size).slice(0, 10);
    io.emit('leaderboard', lb);

  }, 50);

  res.end();
}
