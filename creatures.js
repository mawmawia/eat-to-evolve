// SKILL DEFINITIONS - Add new skills here once
const SKILLS = {
  leafCamo: {
    name: "Leaf Camo", icon: "🍃", cooldown: 15,
    activate: (player, scene) => {
      player.sprite.setAlpha(0.2);
      scene.time.delayedCall(5000, () => player.sprite.setAlpha(1));
      showFloatingXP(scene, player.sprite.x, player.sprite.y, "HIDDEN");
    }
  },
  acidSpray: {
    name: "Acid Spray", icon: "🧪", cooldown: 8,
    activate: (player, scene) => {
      const acid = scene.add.circle(player.sprite.x, player.sprite.y, 60, 0x00ff00, 0.3).setDepth(10);
      scene.tweens.add({targets: acid, alpha: 0, duration: 1000, onComplete: () => acid.destroy()});
      // Damage enemies in radius here
      player.mastery.acidSpray++;
    }
  },
  superStrength: {
    name: "Super Strength", passive: true,
    effect: (player) => { player.carryMultiplier = 3; }
  }
};

// CREATURE DEFINITIONS - Add new creatures here
const CREATURES = {
  ant: {
    hp: 20, speed: 100, color: 0x8B4513,
    passive: "superStrength",
    skills: ["leafCamo", "acidSpray"],
    nextEvolutions: ["lizard", "beetle"] // BRANCHING
  },
  lizard: {
    hp: 40, speed: 110, color: 0x228B22,
    passive: "wallClimb",
    skills: ["tongueGrab", "tailDrop"],
    nextEvolutions: ["bird", "crocodile"]
  },
  bird: {
    hp: 60, speed: 130, color: 0x87CEEB,
    passive: "fly",
    skills: ["diveBomb", "eagleVision"],
    nextEvolutions: ["dragon"]
  }
};

const BOT_TYPES = { coward: {color: 0xFFB6C1}, hunter: {color: 0xFF4500} };
