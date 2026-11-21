// Night Ledger — game loop and state.
// One clear job: states (menu / playing / caught / levelclear / gameover /
// win), level flow, scoring, loot pickup, catching, and the ?level= param.

'use strict';

(function () {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = NL.CANVAS_W;
  canvas.height = NL.CANVAS_H;

  const keys = new Set();
  let state = 'menu'; // menu | playing | caught | levelclear | gameover | win
  let levelIndex = 0;
  let world = null;
  let lives = NL.LIVES_START;
  let score = 0;
  let totalLootGot = 0;
  let totalLoot = 0;
  let totalGhostBonus = 0;
  let totalTime = 0;
  let levelTime = 0;
  let levelAlarmed = false;
  let levelClearInfo = null;
  let winInfo = null;
  let lastTimestamp = 0;

  function startLevel(index) {
    levelIndex = index;
    const parsed = NL.parseLevel(index);
    const player = new NL.Player(parsed.playerSpawn);
    const guards = parsed.guardSpawns.map(function (spawn, i) {
      return new NL.Guard(spawn, parsed.def.waypoints[i] || [spawn]);
    });
    world = {
      grid: parsed.grid,
      loot: parsed.loot,
      exitTile: parsed.exitTile,
      player: player,
      guards: guards,
      levelName: parsed.def.name,
      toastTimer: 3,
      hud: {
        levelName: (index + 1) + ' — ' + parsed.def.name,
        lootGot: 0,
        lootTotal: parsed.loot.length,
        coins: player.coins,
        lives: lives,
        time: 0,
        score: score,
        detection: 0
      }
    };
    levelTime = 0;
    levelAlarmed = false;
    state = 'playing';
  }

  function startGame(fromLevel) {
    lives = NL.LIVES_START;
    score = 0;
    totalLootGot = 0;
    totalLoot = 0;
    totalGhostBonus = 0;
    totalTime = 0;
    for (let i = 0; i < NL.LEVELS.length; i++) {
      totalLoot += NL.parseLevel(i).loot.length;
    }
    startLevel(fromLevel || 0);
  }

  function levelTimeText(t) {
    const mm = Math.floor(t / 60);
    const ss = String(Math.floor(t % 60)).padStart(2, '0');
    return mm + ':' + ss;
  }

  function onCaught() {
    lives--;
    NL.Audio.caught();
    if (lives <= 0) {
      state = 'gameover';
    } else {
      state = 'caught';
    }
  }

  function onLevelClear() {
    const par = NL.LEVEL_PAR_SECONDS[levelIndex];
    const timeBonus = Math.max(0, Math.round((par - levelTime) * NL.SCORE_TIME_BONUS));
    const lootBonus = world.hud.lootGot * NL.SCORE_LOOT;
    const ghost = !levelAlarmed;
    const ghostBonus = ghost ? NL.SCORE_GHOST_BONUS : 0;
    score += timeBonus + lootBonus + ghostBonus;
    totalLootGot += world.hud.lootGot;
    totalGhostBonus += ghostBonus;
    totalTime += levelTime;
    NL.Audio.win();
    levelClearInfo = {
      levelName: world.levelName,
      ghost: ghost,
      lootGot: world.hud.lootGot,
      lootTotal: world.hud.lootTotal,
      timeBonus: timeBonus,
      score: score
    };
    state = 'levelclear';
  }

  function onWin() {
    winInfo = {
      lootGot: totalLootGot,
      lootTotal: totalLoot,
      ghostBonus: totalGhostBonus,
      timeText: levelTimeText(totalTime),
      score: score
    };
    state = 'win';
  }

  function updatePlaying(dt) {
    const player = world.player;
    player.update(dt, world.grid, keys, world.guards);
    let maxDetection = 0;
    let caught = false;
    for (let i = 0; i < world.guards.length; i++) {
      const g = world.guards[i];
      g.update(dt, world.grid, player);
      if (g.detection > maxDetection) maxDetection = g.detection;
      if (g.state === 'alarm') levelAlarmed = true;
      if (g.distanceTo(player.x, player.y) < NL.GUARD_CATCH_DISTANCE) caught = true;
    }
    levelTime += dt;
    world.hud.detection = maxDetection;
    world.hud.time = levelTime;
    world.hud.score = score;
    world.hud.coins = player.coins;
    world.hud.lives = lives;
    if (world.toastTimer > 0) world.toastTimer -= dt;

    // Loot pickup.
    const pCol = Math.floor(player.x / NL.TILE);
    const pRow = Math.floor((player.y - NL.MAP_OFFSET_Y) / NL.TILE);
    for (let i = 0; i < world.loot.length; i++) {
      const dot = world.loot[i];
      if (dot.taken) continue;
      if (dot.col === pCol && dot.row === pRow) {
        dot.taken = true;
        world.hud.lootGot++;
        NL.Audio.pickup();
      }
    }

    if (caught) {
      onCaught();
      return;
    }

    // Exit: stepping on the E tile with no active alarm clears the level.
    if (pCol === world.exitTile.col && pRow === world.exitTile.row) {
      if (levelIndex >= NL.LEVELS.length - 1) {
        // Last level: count its own clear first, then win.
        onLevelClear();
        if (state === 'levelclear') {
          levelClearInfo = null;
          onWin();
        }
      } else {
        onLevelClear();
      }
    }
  }

  function frame(timestamp) {
    const dt = Math.min(0.05, (timestamp - lastTimestamp) / 1000 || 0.016);
    lastTimestamp = timestamp;
    if (state === 'playing' && world) {
      updatePlaying(dt);
      NL.Render.drawGame(ctx, world);
    } else if (state === 'menu') {
      NL.Render.drawMenu(ctx);
    } else if (state === 'caught') {
      if (world) NL.Render.drawGame(ctx, world);
      NL.Render.drawCaught(ctx, lives);
    } else if (state === 'levelclear') {
      if (world) NL.Render.drawGame(ctx, world);
      NL.Render.drawLevelClear(ctx, levelClearInfo);
    } else if (state === 'gameover') {
      NL.Render.drawGameOver(ctx, score);
    } else if (state === 'win') {
      NL.Render.drawWin(ctx, winInfo);
    }
    requestAnimationFrame(frame);
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) * (NL.CANVAS_W / rect.width),
      y: (event.clientY - rect.top) * (NL.CANVAS_H / rect.height)
    };
  }

  window.addEventListener('keydown', function (event) {
    NL.Audio.unlock();
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].indexOf(event.code) !== -1) {
      event.preventDefault();
    }
    if (event.code === 'KeyM') {
      NL.Audio.toggleMute();
      return;
    }
    keys.add(event.code);
    if (event.code === 'Enter' || event.code === 'Space') {
      if (state === 'menu') {
        NL.Audio.click();
        startGame(startLevelParam());
      } else if (state === 'caught') {
        NL.Audio.click();
        startLevel(levelIndex);
      } else if (state === 'levelclear') {
        NL.Audio.click();
        startLevel(levelIndex + 1);
      }
    }
    if (event.code === 'KeyR') {
      if (state === 'gameover' || state === 'win') {
        NL.Audio.click();
        startGame(0);
      }
    }
  });

  window.addEventListener('keyup', function (event) {
    keys.delete(event.code);
  });

  canvas.addEventListener('mousedown', function (event) {
    NL.Audio.unlock();
    if (state === 'menu') {
      NL.Audio.click();
      startGame(startLevelParam());
      return;
    }
    if (state === 'playing' && world) {
      const p = canvasPoint(event);
      world.player.tossCoin(p.x, p.y);
    }
  });

  // ?level=1|2|3 starts directly at that level (for testing and screenshots).
  function startLevelParam() {
    const params = new URLSearchParams(window.location.search);
    const n = parseInt(params.get('level') || '1', 10);
    if (n >= 1 && n <= NL.LEVELS.length) return n - 1;
    return 0;
  }

  // Menu backdrop: draw once before the loop starts so the first frame is set.
  NL.Render.drawMenu(ctx);
  requestAnimationFrame(frame);
})();
