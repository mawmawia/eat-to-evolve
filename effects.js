function createEvolutionParticles(scene, x, y, color) {
  for(let i = 0; i < 40; i++) {
    const angle = (Math.PI * 2 * i) / 40;
    const speed = Phaser.Math.Between(100, 250);
    const p = scene.add.circle(x, y, 4, color).setDepth(50);
    scene.tweens.add({ targets: p, x: x + Math.cos(angle) * speed, y: y + Math.sin(angle) * speed, alpha: 0, scale: 0.2, duration: 600, ease: 'Power2', onComplete: () => p.destroy() });
  }
}
function showFloatingXP(scene, x, y, amount) {
  const txt = scene.add.text(x, y, `+${amount} XP`, { fontSize: "16px", fontWeight: "bold", color: "#ffff00", stroke: "#000", strokeThickness: 4 }).setOrigin(0.5).setDepth(100);
  scene.tweens.add({ targets: txt, y: y - 50, alpha: 0, scale: 1.2, duration: 800, ease: 'Power1', onComplete: () => txt.destroy() });
}
function hitFlash(sprite) { sprite.setTint(0xff0000); sprite.scene.time.delayedCall(100, () => sprite.clearTint()); }
function showLevelUp(scene) {
  const txt = scene.add.text(player.x, player.y - 80, "LEVEL UP!", { fontSize: "24px", color: "#00ff00", stroke: "#000", strokeThickness: 5 }).setOrigin(0.5).setDepth(100);
  scene.tweens.add({ targets: txt, y: txt.y - 40, alpha: 0, duration: 900, onComplete: () => txt.destroy() });
}
function createGameOverPanel(scene) {
  window.gameOverSequence = () => {
    gameOver = true; playSfx("gameover");
    const panel = scene.add.rectangle(WORLD_WIDTH/2, WORLD_HEIGHT/2, 400, 300, 0x000, 0.8).setScrollFactor(0).setDepth(200);
    const txt = scene.add.text(WORLD_WIDTH/2, WORLD_HEIGHT/2 - 50, "GAME OVER", { fontSize: "32px", color: "#fff" }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    const stats = scene.add.text(WORLD_WIDTH/2, WORLD_HEIGHT/2, `Reached: ${player.type}\nLevel: ${player.level}\nFood: ${foodEaten}\nKills: ${enemiesDefeated}`, { fontSize: "20px", color: "#fff", align: "center" }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
    const btn = scene.add.text(WORLD_WIDTH/2, WORLD_HEIGHT/2 + 80, "RESTART", { fontSize: "24px", backgroundColor: "#4CAF50", padding: 10 }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setInteractive();
    btn.on('pointerdown', () => window.location.reload());
  }
}
function evolveTo(scene, newType, x, y) {
  const evo = EVOLUTIONS[newType];
  const oldData = player? {xp: player.xp, size: player.size, level: player.level} : {};
  if (player && player.sprite) {
    playSfx("evolve"); scene.cameras.main.flash(250, 255, 255, 255); scene.cameras.main.shake(300, 0.01);
    const ring = scene.add.circle(x, y, 10, 0xffffff, 0).setStrokeStyle(8, evo.color);
    scene.tweens.add({ targets: ring, scale: 10, alpha: 0, duration: 600, ease: 'Power2', onComplete: () => ring.destroy() });
    createEvolutionParticles(scene, x, y, evo.color);
    const txt = scene.add.text(x, y - 60, "EVOLVED!", { fontSize: "36px", fontWeight: "bold", color: "#ffff00", stroke: "#000", strokeThickness: 6 }).setOrigin(0.5).setDepth(100);
    scene.tweens.add({ targets: txt, y: y - 140, alpha: 0, scale: 1.4, duration: 1000, ease: 'Power2', onComplete: () => txt.destroy() });
    scene.tweens.add({ targets: player.sprite, scale: 0.2, alpha: 0, duration: 250, onComplete: () => player.sprite.destroy() });
  }
  player = createEntity(scene, x, y, "player", newType, null, oldData);
  player.hp = evo.hp; player.maxHp = evo.hp; player.type = newType;
  player.level = oldData.level || EVOLUTIONS[newType].level;
  scene.cameras.main.startFollow(player.sprite, true, 0.1, 0.1);
  addIdleAnimation(scene, player, newType);
  player.sprite.setScale(0.5);
  scene.tweens.add({ targets: player.sprite, scale: 1.3, duration: 250, ease: "Back.Out", onComplete: () => { scene.tweens.add({ targets: player.sprite, scale: 1, duration: 200 }) }});
  updateHUD();
}
