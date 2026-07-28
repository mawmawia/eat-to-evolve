# Eat to Evolve

Spawn as an ant. Eat. Grow. Evolve. Dominate.

A real-time top-down multiplayer.io game built with Phaser 3 + Socket.io + Node.js

### How to Play
- **Desktop**: WASD to move
- **Mobile**: Virtual Joystick
- Eat seeds, berries, bugs to gain XP
- Reach Level 10 to evolve Ant → Cockroach
- If you're 20% bigger you can eat other players
- Die → 3s respawn → Try again
- Climb the live leaderboard

### MVP Features v0.1.1
- [x] Server authoritative game logic
- [x] Delta networking: 20fps updates, scales to 100+ players
- [x] Movement, Eating, Growth, Evolution
- [x] Player vs Player predation
- [x] 3 Second Respawn with countdown
- [x] Object pooling + Sprite animations
- [x] "Near Evolution" glow at Level 9
- [x] Grass tilemap + 5 food types

### Run Locally
```bash
# Terminal 1: Server
cd server
npm install
npm run dev

# Terminal 2: Client
cd client
npm install
npm run dev
