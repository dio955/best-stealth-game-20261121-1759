// Night Ledger — level data.
// One clear job: the three handcrafted levels as ASCII maps, plus guard patrol
// waypoints and loot positions. Legend: # wall, . floor, C crate (cover),
// B bush (hiding spot), P player spawn, E exit, G guard spawn, o loot dot.
// Every map is fully enclosed by walls; every waypoint sits on a floor tile.

'use strict';

NL.LEVELS = [
  {
    name: 'Ledger Office',
    subtitle: 'Floor 1 — slip past the night clerks',
    map: [
      '##############################',
      '#P....#.......#......o.......#',
      '#.....#.......#..............#',
      '#..C..#...C...#...C....E.....#',
      '#.....#.......#..............#',
      '#.....#.......#.......#......#',
      '#..B......C........C..#....o.#',
      '#.....#.......#..............#',
      '#.....#.......#..............#',
      '#..C..#...B...#....C....G....#',
      '#.....#.......#..............#',
      '#.....#.......#.......#......#',
      '#..o......C........C..#......#',
      '#.....#.......#..............#',
      '#.....#...G...#....C......o..#',
      '#.....#.......#..............#',
      '#..C......B........G......C..#',
      '##############################'
    ],
    // [col, row] tile coordinates, in patrol order.
    waypoints: [
      [[24, 9], [20, 9], [20, 1], [24, 1]],
      [[10, 14], [7, 14], [7, 13], [10, 13]],
      [[19, 16], [19, 15], [25, 15], [25, 16]],
    ]
  },
  {
    name: 'Vault Floor',
    subtitle: 'Floor 2 — crossing patrols, heavier crates',
    map: [
      '##############################',
      '#P....#.......#......o.......#',
      '#.....#.......#..............#',
      '#..C..#...C...#...C....E.....#',
      '#.....#.......#..............#',
      '#..C..#...C...#...C....#..o..#',
      '#..B......C........C..#....o.#',
      '#.....#.......#..............#',
      '#.....#.......#....C.........#',
      '#..C..#...B...#....C....G....#',
      '#.....#.......#..............#',
      '#..o......C........C..#......#',
      '#.....#.......#..............#',
      '#..C......B........G......C..#',
      '#..o..#...G...#....C......o..#',
      '#.....#.......#..............#',
      '#..C......B...G....C......C..#',
      '##############################'
    ],
    waypoints: [
      [[24, 9], [20, 9], [20, 1], [24, 1]],
      [[19, 13], [19, 12], [25, 12], [25, 13]],
      [[10, 14], [7, 14], [7, 12], [10, 12]],
      [[14, 16], [18, 16]],
    ]
  },
  {
    name: 'Rooftop Archive',
    subtitle: 'Floor 3 — the maze of crates and ferns',
    map: [
      '##############################',
      '#P....#..B....#......o.......#',
      '#.....#.......#......o.......#',
      '#..C..#...C...#...C....E.....#',
      '#..B..#.......#..C...........#',
      '#.....#...C...#.......#..o...#',
      '#..C..#...B...#....C....G....#',
      '#.....#.......#..............#',
      '#..o..#...C...#..B......C....#',
      '#..o..#.......#..............#',
      '#..C..#...G...#....C....G....#',
      '#..B..#.......#..............#',
      '#.....#...C...#..o......C....#',
      '#..o..#...G...#....C.........#',
      '#.....#...G...#....C......o..#',
      '#..C..#...B...#..............#',
      '#..B...............C......C..#',
      '##############################'
    ],
    waypoints: [
      [[24, 6], [20, 6], [20, 1], [24, 1]],
      [[10, 10], [7, 10], [7, 9], [10, 9]],
      [[24, 10], [20, 10], [20, 9], [24, 9]],
      [[10, 13], [10, 16], [7, 16], [7, 13]],
      [[10, 14], [10, 16], [7, 16], [7, 14]],
    ]
  }
];

// Parse one level map into a grid the game logic can use.
NL.parseLevel = function (levelIndex) {
  const def = NL.LEVELS[levelIndex];
  const grid = [];
  let playerSpawn = null;
  let exitTile = null;
  const guardSpawns = [];
  const loot = [];
  for (let row = 0; row < NL.ROWS; row++) {
    const line = def.map[row];
    const gridRow = [];
    for (let col = 0; col < NL.COLS; col++) {
      const ch = line[col];
      if (ch === NL.TILE_PLAYER) {
        playerSpawn = { col: col, row: row };
        gridRow.push(NL.TILE_FLOOR);
      } else if (ch === NL.TILE_EXIT) {
        exitTile = { col: col, row: row };
        gridRow.push(NL.TILE_EXIT);
      } else if (ch === NL.TILE_GUARD) {
        guardSpawns.push({ col: col, row: row });
        gridRow.push(NL.TILE_FLOOR);
      } else if (ch === NL.TILE_LOOT) {
        loot.push({ col: col, row: row, taken: false });
        gridRow.push(NL.TILE_FLOOR);
      } else {
        gridRow.push(ch);
      }
    }
    grid.push(gridRow);
  }
  return {
    def: def,
    grid: grid,
    playerSpawn: playerSpawn,
    exitTile: exitTile,
    guardSpawns: guardSpawns,
    loot: loot
  };
};

// Tile character at a tile coordinate, or '#' outside the map.
NL.tileAt = function (grid, col, row) {
  if (col < 0 || col >= NL.COLS || row < 0 || row >= NL.ROWS) return NL.TILE_WALL;
  return grid[row][col];
};

// True when a tile coordinate blocks movement.
NL.isSolidTile = function (grid, col, row) {
  return NL.SOLID_TILES.has(NL.tileAt(grid, col, row));
};

// True when the player standing on this tile is hidden in a bush.
NL.isBushTile = function (grid, col, row) {
  return NL.tileAt(grid, col, row) === NL.TILE_BUSH;
};

// Pixel centre of a tile.
NL.tileCenter = function (col, row) {
  return {
    x: (col + 0.5) * NL.TILE,
    y: NL.MAP_OFFSET_Y + (row + 0.5) * NL.TILE
  };
};

if (typeof module !== 'undefined' && module.exports) module.exports = NL;
