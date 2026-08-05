const EVOLUTIONS = {
  ant: { next: "lizard", xpToNext: 10, color: 0x8B4513, hp: 20, speed: 100, level: 1 },
  lizard: { next: "bird", xpToNext: 25, color: 0x228B22, hp: 40, speed: 110, level: 2 },
  bird: { next: "shark", xpToNext: 50, color: 0x87CEEB, hp: 60, speed: 130, level: 3 },
  shark: { next: "crocodile", xpToNext: 100, color: 0x708090, hp: 90, speed: 120, level: 4 },
  crocodile: { next: "lion", xpToNext: 200, color: 0x556B2F, hp: 130, speed: 115, level: 5 },
  lion: { next: "dragon", xpToNext: 400, color: 0xDAA520, hp: 180, speed: 125, level: 6 },
  dragon: { next: null, xpToNext: 0, color: 0xB22222, hp: 250, speed: 140, level: 7 }
};

const BOT_TYPES = {
  coward: { color: 0xFFB6C1, speed: 90 },
  hunter: { color: 0xFF4500, speed: 105 },
  grazer: { color: 0x32CD32, speed: 85 },
  explorer: { color: 0x9370DB, speed: 95 }
};

function createCreatureSprite(scene, type) {
    if (scene.textures.exists(type)) {
        const body = scene.add.image(0, 0, type);
        body.setOrigin(0.5, 0.5);
        return body;
    } else {
        const body = scene.add.container(0, 0);
        const evo = EVOLUTIONS[type];
        const base = scene.add.circle(0, 0, 20, evo.color);
        body.add(base);
        return body;
    }
}

function addIdleAnimation(scene, entity, type) {
  const body = entity.sprite.list[0];
  const bob = { ant: 2, lizard: 3, bird: 4, shark: 1, crocodile: 2, lion: 2, dragon: 3 }[type] || 2;
  scene.tweens.add({
    targets: body, y: -bob, duration: 900 + Math.random() * 200, yoyo: true, repeat: -1, ease: "Sine.easeInOut"
  });
  if(type === 'bird' || type === 'dragon') {
    scene.tweens.add({ targets: body, angle: 5, duration: 400, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
  }
}

function createEntity(scene, x, y, role, type, personality = null, oldData = {}) {
  const evo = EVOLUTIONS[type];
  const body = createCreatureSprite(scene, type);
  const sprite = scene.add.container(x, y, [body]);
  sprite.setSize(128, 128);

  return {
    x, y, vx: 0, vy: 0, sprite, legs: [], role, type, personality,
    level: oldData.level || EVOLUTIONS[type].level,
    xp: oldData.xp || 0, size: oldData.size || 1,
    speed: role === "player"? evo.speed : BOT_TYPES[personality].speed,
    alive: true, nextTurn: 0, sprintReady: true
  };
}

function getEntityLevel(entity) { return EVOLUTIONS[entity.type].level; }
function getEntityColor(entity) { return EVOLUTIONS[entity.type].color; }
