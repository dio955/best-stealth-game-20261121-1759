// Night Ledger — drawing.
// One clear job: everything on the canvas. Floor, walls, crates, hiding
// bushes, vision cones, guards, the player, the exit, the coin, and the HUD.

'use strict';

NL.Render = (function () {
  const TILE_COLORS = {
    floorA: '#2e2a33',
    floorB: '#2a262e',
    wall: '#17141c',
    wallTop: '#4a4356',
    crate: '#6b4a2b',
    crateTop: '#8a6136',
    bush: '#1e4d2b',
    bushLeaf: '#2f7a44',
    exit: '#1f9d55',
    loot: '#ffd75e'
  };

  function drawFloor(ctx, grid) {
    for (let row = 0; row < NL.ROWS; row++) {
      for (let col = 0; col < NL.COLS; col++) {
        const x = col * NL.TILE;
        const y = NL.MAP_OFFSET_Y + row * NL.TILE;
        ctx.fillStyle = (col + row) % 2 === 0 ? TILE_COLORS.floorA : TILE_COLORS.floorB;
        ctx.fillRect(x, y, NL.TILE, NL.TILE);
      }
    }
  }

  function drawWallsAndCover(ctx, grid) {
    for (let row = 0; row < NL.ROWS; row++) {
      for (let col = 0; col < NL.COLS; col++) {
        const tile = grid[row][col];
        const x = col * NL.TILE;
        const y = NL.MAP_OFFSET_Y + row * NL.TILE;
        if (tile === NL.TILE_WALL) {
          ctx.fillStyle = TILE_COLORS.wall;
          ctx.fillRect(x, y, NL.TILE, NL.TILE);
          ctx.fillStyle = TILE_COLORS.wallTop;
          ctx.fillRect(x, y, NL.TILE, 4);
        } else if (tile === NL.TILE_CRATE) {
          ctx.fillStyle = TILE_COLORS.crate;
          ctx.fillRect(x + 2, y + 2, NL.TILE - 4, NL.TILE - 4);
          ctx.fillStyle = TILE_COLORS.crateTop;
          ctx.fillRect(x + 2, y + 2, NL.TILE - 4, 5);
          ctx.strokeStyle = '#4a3018';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x + 2, y + 2);
          ctx.lineTo(x + NL.TILE - 2, y + NL.TILE - 2);
          ctx.moveTo(x + NL.TILE - 2, y + 2);
          ctx.lineTo(x + 2, y + NL.TILE - 2);
          ctx.stroke();
        } else if (tile === NL.TILE_BUSH) {
          ctx.fillStyle = TILE_COLORS.bush;
          ctx.fillRect(x, y, NL.TILE, NL.TILE);
          ctx.fillStyle = TILE_COLORS.bushLeaf;
          ctx.beginPath();
          ctx.arc(x + 10, y + 12, 8, 0, Math.PI * 2);
          ctx.arc(x + 22, y + 10, 8, 0, Math.PI * 2);
          ctx.arc(x + 16, y + 22, 8, 0, Math.PI * 2);
          ctx.fill();
        } else if (tile === NL.TILE_EXIT) {
          ctx.fillStyle = TILE_COLORS.exit;
          ctx.fillRect(x + 3, y + 3, NL.TILE - 6, NL.TILE - 6);
          ctx.fillStyle = '#d7ffe6';
          ctx.font = 'bold 15px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('EXIT', x + NL.TILE / 2, y + NL.TILE / 2);
        }
      }
    }
  }

  function drawLoot(ctx, loot) {
    ctx.fillStyle = TILE_COLORS.loot;
    for (let i = 0; i < loot.length; i++) {
      if (loot[i].taken) continue;
      const c = NL.tileCenter(loot[i].col, loot[i].row);
      ctx.beginPath();
      ctx.arc(c.x, c.y, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8a6d00';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // A guard's vision cone: translucent yellow, red on alarm.
  function drawCone(ctx, grid, guard) {
    const alarm = guard.state === 'alarm';
    ctx.fillStyle = alarm ? 'rgba(255, 60, 60, 0.30)' : 'rgba(255, 220, 90, 0.22)';
    ctx.beginPath();
    ctx.moveTo(guard.x, guard.y);
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const a = guard.facing - NL.VIEW_HALF_ANGLE +
        (2 * NL.VIEW_HALF_ANGLE * i) / steps;
      let reach = NL.VIEW_DISTANCE;
      // Shorten the ray where a wall or crate blocks it.
      for (let d = NL.VIEW_RAY_STEP; d <= NL.VIEW_DISTANCE; d += NL.VIEW_RAY_STEP) {
        const px = guard.x + Math.cos(a) * d;
        const py = guard.y + Math.sin(a) * d;
        const col = Math.floor(px / NL.TILE);
        const row = Math.floor((py - NL.MAP_OFFSET_Y) / NL.TILE);
        if (NL.SIGHT_BLOCKING_TILES.has(NL.tileAt(grid, col, row))) {
          reach = d;
          break;
        }
      }
      ctx.lineTo(guard.x + Math.cos(a) * reach, guard.y + Math.sin(a) * reach);
    }
    ctx.closePath();
    ctx.fill();
  }

  function drawGuards(ctx, guards) {
    for (let i = 0; i < guards.length; i++) {
      const g = guards[i];
      // Body: dark uniform with a cap brim pointing where the guard faces.
      ctx.fillStyle = '#3d3a4d';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#8f8aa8';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#c9c4de';
      ctx.beginPath();
      ctx.arc(g.x, g.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#c9c4de';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(g.x, g.y);
      ctx.lineTo(g.x + Math.cos(g.facing) * 17, g.y + Math.sin(g.facing) * 17);
      ctx.stroke();
      // State markers: "?" when suspicious, "!" on alarm.
      if (g.state === 'suspicious' || g.state === 'investigate') {
        ctx.fillStyle = '#ffd75e';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('?', g.x, g.y - 14);
      } else if (g.state === 'alarm') {
        ctx.fillStyle = '#ff4d4d';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText('!', g.x, g.y - 14);
      }
      // A thin detection arc above the guard's head.
      if (g.detection > 1) {
        ctx.strokeStyle = g.detection > 70 ? '#ff4d4d' : '#ffd75e';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.x, g.y, 16, -Math.PI / 2, -Math.PI / 2 + (g.detection / 100) * Math.PI * 2);
        ctx.stroke();
      }
    }
  }

  function drawPlayer(ctx, player) {
    // Soft shadow of the coin's target ring while it flies or rings.
    const coin = player.coin;
    if (coin && coin.landed) {
      ctx.strokeStyle = 'rgba(255, 215, 94, ' + Math.max(0, coin.ringTimer) + ')';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(coin.targetX, coin.targetY, NL.COIN_NOISE_RADIUS * (1 - coin.ringTimer * 0.5), 0, Math.PI * 2);
      ctx.stroke();
    }
    const pos = player.coinPosition();
    if (pos) {
      ctx.fillStyle = '#ffd75e';
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Rin: a hooded figure in teal, half-faded while hidden in a bush.
    ctx.globalAlpha = player.hidden ? 0.45 : 1;
    ctx.fillStyle = '#2fa8a0';
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#d8fff9';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#0f3d3a';
    ctx.beginPath();
    ctx.arc(player.x, player.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // A subtle radial light around the player: the dark ledger house at night.
  function drawLighting(ctx, player) {
    const grad = ctx.createRadialGradient(
      player.x, player.y, 90, player.x, player.y, 420
    );
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, NL.MAP_OFFSET_Y, NL.CANVAS_W, NL.ROWS * NL.TILE);
  }

  function drawHud(ctx, state) {
    ctx.fillStyle = '#121017';
    ctx.fillRect(0, 0, NL.CANVAS_W, NL.MAP_OFFSET_Y);
    ctx.fillStyle = '#e8e4f0';
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.levelName, 10, 13);
    const lootText = 'Loot ' + state.lootGot + '/' + state.lootTotal;
    ctx.fillText(lootText, 190, 13);
    ctx.fillText('Coins ' + state.coins, 280, 13);
    ctx.fillText('Lives ' + '\u2764'.repeat(Math.max(0, state.lives)), 350, 13);
    const mm = Math.floor(state.time / 60);
    const ss = String(Math.floor(state.time % 60)).padStart(2, '0');
    ctx.fillText(mm + ':' + ss, 460, 13);
    ctx.fillText('Score ' + state.score, 520, 13);
    // Detection meter bar, green to amber to red.
    const barX = 640;
    const barW = 200;
    const meter = Math.max(0, Math.min(100, state.detection));
    ctx.fillStyle = '#2a2530';
    ctx.fillRect(barX, 6, barW, 12);
    ctx.fillStyle = meter < 40 ? '#3fbf5a' : meter < 75 ? '#e0a030' : '#e04040';
    ctx.fillRect(barX, 6, (barW * meter) / 100, 12);
    ctx.strokeStyle = '#8f8aa8';
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, 6, barW, 12);
    ctx.fillStyle = '#e8e4f0';
    ctx.fillText('SPOTTED', barX + barW + 10, 13);
    if (NL.Audio.isMuted()) ctx.fillText('MUTED', 920 - 46, 13);
  }

  function drawCenterText(ctx, lines, color) {
    ctx.fillStyle = 'rgba(8, 6, 12, 0.82)';
    ctx.fillRect(0, 0, NL.CANVAS_W, NL.CANVAS_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      ctx.fillStyle = line.color || color || '#e8e4f0';
      ctx.font = line.font || '16px sans-serif';
      ctx.fillText(line.text, NL.CANVAS_W / 2, line.y);
    }
  }

  return {
    drawGame: function (ctx, world) {
      drawFloor(ctx, world.grid);
      drawWallsAndCover(ctx, world.grid);
      drawLoot(ctx, world.loot);
      for (let i = 0; i < world.guards.length; i++) {
        drawCone(ctx, world.grid, world.guards[i]);
      }
      drawGuards(ctx, world.guards);
      drawPlayer(ctx, world.player);
      drawLighting(ctx, world.player);
      drawHud(ctx, world.hud);
      // Red edge pulse as the detection meter climbs.
      if (world.hud.detection > 30) {
        const a = ((world.hud.detection - 30) / 70) * 0.35;
        ctx.strokeStyle = 'rgba(255, 40, 40, ' + a.toFixed(2) + ')';
        ctx.lineWidth = 10;
        ctx.strokeRect(5, NL.MAP_OFFSET_Y + 5, NL.CANVAS_W - 10, NL.ROWS * NL.TILE - 10);
      }
      // Level intro toast.
      if (world.toastTimer > 0) {
        ctx.fillStyle = 'rgba(8, 6, 12, 0.75)';
        ctx.fillRect(NL.CANVAS_W / 2 - 230, 90, 460, 54);
        ctx.fillStyle = '#ffd75e';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(world.levelName, NL.CANVAS_W / 2, 108);
        ctx.fillStyle = '#e8e4f0';
        ctx.font = '14px sans-serif';
        ctx.fillText('Reach the green exit unseen', NL.CANVAS_W / 2, 130);
      }
    },

    drawMenu: function (ctx) {
      drawCenterText(ctx, [
        { text: 'NIGHT LEDGER', y: 150, font: 'bold 52px serif', color: '#ffd75e' },
        { text: 'You are Rin, night archivist of the Meridian Ledger House.', y: 210 },
        { text: 'Slip past the guards, pocket the ledger dots, reach the green exit unseen.', y: 238 },
        { text: 'WASD / Arrows — move    Shift — run (louder)', y: 300, font: '15px sans-serif' },
        { text: 'Click — toss a coin to lure a guard    M — mute', y: 326, font: '15px sans-serif' },
        { text: 'Hide in the green bushes. A guard who fills the meter chases you.', y: 352, font: '15px sans-serif' },
        { text: 'Click or press Enter to start', y: 420, font: 'bold 18px sans-serif', color: '#ffd75e' }
      ]);
    },

    drawCaught: function (ctx, lives) {
      drawCenterText(ctx, [
        { text: 'CAUGHT!', y: 220, font: 'bold 44px sans-serif', color: '#ff4d4d' },
        { text: 'The guards drag you back to the door. Lives left: ' + lives, y: 280 },
        { text: 'Press Enter to try the floor again', y: 330, color: '#ffd75e' }
      ]);
    },

    drawLevelClear: function (ctx, info) {
      drawCenterText(ctx, [
        { text: 'FLOOR CLEARED', y: 170, font: 'bold 40px sans-serif', color: '#3fbf5a' },
        { text: info.levelName + ' — unseen' + (info.ghost ? ' (ghost bonus!)' : ''), y: 225 },
        { text: 'Loot ' + info.lootGot + '/' + info.lootTotal + '   Time bonus +' + info.timeBonus, y: 260 },
        { text: 'Score ' + info.score, y: 295, font: 'bold 20px sans-serif' },
        { text: 'Press Enter for the next floor', y: 360, color: '#ffd75e' }
      ]);
    },

    drawGameOver: function (ctx, score) {
      drawCenterText(ctx, [
        { text: 'GAME OVER', y: 220, font: 'bold 44px sans-serif', color: '#ff4d4d' },
        { text: 'The Ledger House keeps its secrets tonight. Score: ' + score, y: 280 },
        { text: 'Press R to play again', y: 330, color: '#ffd75e' }
      ]);
    },

    drawWin: function (ctx, info) {
      drawCenterText(ctx, [
        { text: 'THE LEDGER IS YOURS', y: 150, font: 'bold 40px sans-serif', color: '#ffd75e' },
        { text: 'All three floors crossed unseen. Rin vanishes into the night.', y: 205 },
        { text: 'Loot ' + info.lootGot + '/' + info.lootTotal + '   Ghost bonus ' + info.ghostBonus, y: 250 },
        { text: 'Time ' + info.timeText + '   Final score ' + info.score, y: 285, font: 'bold 20px sans-serif' },
        { text: 'Press R to play again', y: 350, color: '#ffd75e' }
      ]);
    }
  };
})();

if (typeof module !== 'undefined' && module.exports) module.exports = NL;
