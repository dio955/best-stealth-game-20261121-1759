// Night Ledger — guards.
// One clear job: the Guard class. A guard patrols waypoints, watches a vision
// cone, hears noise, and moves through four states: patrol, suspicious,
// alarm (chase), and investigate.

'use strict';

NL.Guard = function (spawnTile, waypointTiles) {
  const start = NL.tileCenter(spawnTile.col, spawnTile.row);
  this.x = start.x;
  this.y = start.y;
  this.waypoints = waypointTiles.map(function (w) {
    return NL.tileCenter(w[0], w[1]);
  });
  this.waypointIndex = 0;
  this.pauseTimer = 0;
  // Facing angle in radians. Start facing along the first patrol leg.
  this.facing = 0;
  if (this.waypoints.length > 1) {
    this.facing = Math.atan2(
      this.waypoints[1].y - this.y,
      this.waypoints[1].x - this.x
    );
  }
  this.state = 'patrol'; // patrol | suspicious | alarm | investigate
  this.detection = 0; // 0..100, shared with the HUD as the max over guards
  this.alarmTimer = 0;
  this.investigateTimer = 0;
  this.investigateTarget = null;
  this.stepTimer = 0;
  this.sawPlayer = false;
};

// Distance from this guard to a point.
NL.Guard.prototype.distanceTo = function (x, y) {
  const dx = x - this.x;
  const dy = y - this.y;
  return Math.sqrt(dx * dx + dy * dy);
};

// True when the straight line from the guard to (x, y) crosses no wall or
// crate tile. Sampled every VIEW_RAY_STEP pixels.
NL.Guard.prototype.hasLineOfSight = function (grid, x, y) {
  const dx = x - this.x;
  const dy = y - this.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return true;
  const steps = Math.ceil(dist / NL.VIEW_RAY_STEP);
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const sx = this.x + dx * t;
    const sy = this.y + dy * t;
    const col = Math.floor(sx / NL.TILE);
    const row = Math.floor((sy - NL.MAP_OFFSET_Y) / NL.TILE);
    if (NL.SIGHT_BLOCKING_TILES.has(NL.tileAt(grid, col, row))) return false;
  }
  return true;
};

// True when the guard can currently see the player. The player is hidden
// inside a bush unless the guard is very close — and very close (within
// HIDE_RADIUS, with line of sight) the guard notices the player from any
// direction: footsteps and breathing give them away, so walking straight
// into a guard's back is never a silent free pass.
NL.Guard.prototype.canSeePlayer = function (grid, player) {
  const dist = this.distanceTo(player.x, player.y);
  if (dist > NL.VIEW_DISTANCE) return false;
  if (dist <= NL.HIDE_RADIUS) return this.hasLineOfSight(grid, player.x, player.y);
  if (player.hidden) return false;
  const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
  let diff = angleToPlayer - this.facing;
  while (diff > Math.PI) diff -= 2 * Math.PI;
  while (diff < -Math.PI) diff += 2 * Math.PI;
  if (Math.abs(diff) > NL.VIEW_HALF_ANGLE) return false;
  return this.hasLineOfSight(grid, player.x, player.y);
};

// A noise at (x, y) with the given radius: investigate it if heard.
NL.Guard.prototype.hearNoise = function (x, y, radius) {
  if (this.state === 'alarm') return;
  if (this.distanceTo(x, y) > radius) return;
  this.state = 'investigate';
  this.investigateTarget = { x: x, y: y };
  this.investigateTimer = NL.GUARD_INVESTIGATE_TIME;
};

// True when a circle of the guard's radius at (x, y) overlaps a solid tile.
// Guards are physical: they cannot walk through walls or crates, so a player
// who breaks line of sight around a corner can actually escape a chase.
NL.Guard.prototype.collidesAt = function (grid, x, y) {
  const r = 12;
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

// Walk toward (tx, ty) at `speed` px/s for this frame, facing the movement,
// sliding along walls like the player does. Returns true when the target is
// reached. Sets this.blocked when a wall stopped the guard this frame.
NL.Guard.prototype.moveToward = function (grid, tx, ty, speed, dt) {
  const dx = tx - this.x;
  const dy = ty - this.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1) return true;
  const step = Math.min(dist, speed * dt);
  const nx = this.x + (dx / dist) * step;
  const ny = this.y + (dy / dist) * step;
  this.blocked = false;
  if (!this.collidesAt(grid, nx, ny)) {
    this.x = nx;
    this.y = ny;
  } else if (!this.collidesAt(grid, nx, this.y)) {
    this.x = nx;
  } else if (!this.collidesAt(grid, this.x, ny)) {
    this.y = ny;
  } else {
    this.blocked = true;
  }
  this.facing = Math.atan2(dy, dx);
  return dist - step < 2;
};

// Play a footstep tick on a stride timer, louder when the player is near.
NL.Guard.prototype.updateSteps = function (dt, player) {
  this.stepTimer -= dt;
  if (this.stepTimer <= 0) {
    this.stepTimer = 0.45;
    NL.Audio.guardStep(this.distanceTo(player.x, player.y));
  }
};

NL.Guard.prototype.update = function (dt, grid, player) {
  const visible = this.canSeePlayer(grid, player);
  this.sawPlayer = visible;

  // Detection meter: rises fast when seen, faster up close; decays otherwise.
  if (visible) {
    const dist = this.distanceTo(player.x, player.y);
    const rate = dist < NL.DETECTION_CLOSE_RANGE
      ? NL.DETECTION_RISE_CLOSE
      : NL.DETECTION_RISE;
    this.detection = Math.min(100, this.detection + rate * dt);
  } else {
    this.detection = Math.max(0, this.detection - NL.DETECTION_DECAY * dt);
  }

  // Full meter trips the alarm.
  if (this.detection >= 100 && this.state !== 'alarm') {
    this.state = 'alarm';
    this.alarmTimer = NL.GUARD_CHASE_TIME;
    NL.Audio.alarm();
  }

  if (this.state === 'alarm') {
    this.alarmTimer -= dt;
    this.moveToward(grid, player.x, player.y, NL.GUARD_CHASE_SPEED, dt);
    this.updateSteps(dt, player);
    // Lose the player for the whole chase: give up and cool down.
    if (this.alarmTimer <= 0) {
      this.state = 'patrol';
      this.detection = 50;
    }
    return;
  }

  if (this.state === 'investigate' && this.investigateTarget) {
    const arrived = this.moveToward(
      grid,
      this.investigateTarget.x,
      this.investigateTarget.y,
      NL.GUARD_PATROL_SPEED * 1.4,
      dt
    );
    this.updateSteps(dt, player);
    // A wall between the guard and the noise counts as arriving: the guard
    // searches on the spot instead of pushing against the wall forever.
    if (arrived || this.blocked) {
      this.investigateTimer -= dt;
      // Look around while searching.
      this.facing += dt * 1.5;
      if (this.investigateTimer <= 0) {
        this.state = 'patrol';
        this.investigateTarget = null;
      }
    }
    return;
  }

  if (this.detection >= NL.SUSPICIOUS_THRESHOLD) {
    // Suspicious: creep toward the player, but never faster than a walk.
    this.state = 'suspicious';
    this.moveToward(grid, player.x, player.y, NL.GUARD_SUSPICIOUS_SPEED, dt);
    this.updateSteps(dt, player);
    if (this.detection < NL.SUSPICIOUS_THRESHOLD) this.state = 'patrol';
    return;
  }

  // Patrol: walk the waypoint loop, pausing briefly at each one.
  this.state = 'patrol';
  if (this.pauseTimer > 0) {
    this.pauseTimer -= dt;
    return;
  }
  const target = this.waypoints[this.waypointIndex];
  const arrived = this.moveToward(grid, target.x, target.y, NL.GUARD_PATROL_SPEED, dt);
  this.updateSteps(dt, player);
  if (arrived) {
    this.waypointIndex = (this.waypointIndex + 1) % this.waypoints.length;
    this.pauseTimer = NL.GUARD_WAYPOINT_PAUSE;
  }
};

if (typeof module !== 'undefined' && module.exports) module.exports = NL;
