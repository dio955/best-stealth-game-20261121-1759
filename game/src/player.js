// Night Ledger — the player.
// One clear job: Rin, the night archivist. WASD / arrow-key movement with
// wall sliding, Shift to run (louder), and mouse-click coin tosses that lure
// guards away with a noise.

'use strict';

NL.Player = function (spawnTile) {
  const start = NL.tileCenter(spawnTile.col, spawnTile.row);
  this.x = start.x;
  this.y = start.y;
  this.radius = NL.PLAYER_RADIUS;
  this.coins = NL.COINS_PER_LEVEL;
  this.hidden = false; // standing in a bush
  this.moving = false;
  this.running = false;
  this.stepTimer = 0;
  // The coin currently arcing through the air, or null.
  this.coin = null;
};

// Try to move by (dx, dy), sliding along walls: attempt the full move, then
// each axis on its own, so the player glides around corners.
NL.Player.prototype.tryMove = function (grid, dx, dy) {
  if (!this.collides(grid, this.x + dx, this.y + dy)) {
    this.x += dx;
    this.y += dy;
    return;
  }
  if (dx !== 0 && !this.collides(grid, this.x + dx, this.y)) this.x += dx;
  if (dy !== 0 && !this.collides(grid, this.x, this.y + dy)) this.y += dy;
};

// True when a circle at (x, y) overlaps any solid tile.
NL.Player.prototype.collides = function (grid, x, y) {
  const r = this.radius;
  const minCol = Math.floor((x - r) / NL.TILE);
  const maxCol = Math.floor((x + r) / NL.TILE);
  const minRow = Math.floor((y - r - NL.MAP_OFFSET_Y) / NL.TILE);
  const maxRow = Math.floor((y + r - NL.MAP_OFFSET_Y) / NL.TILE);
  for (let row = minRow; row <= maxRow; row++) {
    for (let col = minCol; col <= maxCol; col++) {
      if (!NL.isSolidTile(grid, col, row)) continue;
      const tileLeft = col * NL.TILE;
      const tileTop = NL.MAP_OFFSET_Y + row * NL.TILE;
      const nearestX = Math.max(tileLeft, Math.min(x, tileLeft + NL.TILE));
      const nearestY = Math.max(tileTop, Math.min(y, tileTop + NL.TILE));
      const ddx = x - nearestX;
      const ddy = y - nearestY;
      if (ddx * ddx + ddy * ddy < r * r) return true;
    }
  }
  return false;
};

// Toss a coin toward (tx, ty) on the canvas. Returns false when out of coins
// or one is already in the air.
NL.Player.prototype.tossCoin = function (tx, ty) {
  if (this.coins <= 0 || this.coin) return false;
  this.coins--;
  this.coin = {
    startX: this.x,
    startY: this.y,
    targetX: tx,
    targetY: ty,
    t: 0,
    duration: 0.45,
    landed: false,
    ringTimer: 0
  };
  return true;
};

// Update movement, hiding, and the coin's flight. `keys` is a Set of pressed
// key codes; `guards` hear the coin land and the player's running feet.
NL.Player.prototype.update = function (dt, grid, keys, guards) {
  let mx = 0;
  let my = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) my -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) my += 1;
  this.moving = mx !== 0 || my !== 0;
  this.running = this.moving && (keys.has('ShiftLeft') || keys.has('ShiftRight'));

  if (this.moving) {
    const len = Math.sqrt(mx * mx + my * my);
    const speed = this.running ? NL.PLAYER_RUN_SPEED : NL.PLAYER_WALK_SPEED;
    this.tryMove(grid, (mx / len) * speed * dt, (my / len) * speed * dt);
    // Footsteps, and running is loud enough for nearby guards to hear.
    this.stepTimer -= dt;
    if (this.stepTimer <= 0) {
      this.stepTimer = this.running ? 0.28 : 0.42;
      NL.Audio.footstep(this.running);
      if (this.running) {
        for (let i = 0; i < guards.length; i++) {
          guards[i].hearNoise(this.x, this.y, NL.RUN_NOISE_RADIUS);
        }
      }
    }
  } else {
    this.stepTimer = 0;
  }

  // Hiding: standing on a bush tile conceals the player from vision.
  const col = Math.floor(this.x / NL.TILE);
  const row = Math.floor((this.y - NL.MAP_OFFSET_Y) / NL.TILE);
  this.hidden = NL.isBushTile(grid, col, row);

  // Coin flight: an arc that lands with a ping and a noise guards can hear.
  if (this.coin) {
    const c = this.coin;
    if (!c.landed) {
      c.t += dt / c.duration;
      if (c.t >= 1) {
        c.t = 1;
        c.landed = true;
        c.ringTimer = 0.8;
        NL.Audio.coin();
        for (let i = 0; i < guards.length; i++) {
          guards[i].hearNoise(c.targetX, c.targetY, NL.COIN_NOISE_RADIUS);
        }
      }
    } else {
      c.ringTimer -= dt;
      if (c.ringTimer <= 0) this.coin = null;
    }
  }
};

// Current coin position for drawing, or null when no coin is flying.
NL.Player.prototype.coinPosition = function () {
  const c = this.coin;
  if (!c || c.landed) return null;
  const t = c.t;
  const x = c.startX + (c.targetX - c.startX) * t;
  const y = c.startY + (c.targetY - c.startY) * t;
  // Hop upward mid-flight so the arc reads on screen.
  const hop = Math.sin(t * Math.PI) * 26;
  return { x: x, y: y - hop };
};

if (typeof module !== 'undefined' && module.exports) module.exports = NL;
