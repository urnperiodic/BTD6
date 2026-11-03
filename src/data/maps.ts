import { GameMap } from '../types/game';

/**
 * Authentic Bloons TD 6 PvE Maps (Beginner, Intermediate, Advanced, Expert)
 * & Bloons TD Battles 2 PvP Arena Maps
 * Coordinate space: 800 x 520
 */
export const PVE_MAPS: GameMap[] = [
  // ================= BEGINNER (4 MAPS) =================
  {
    id: 'pve_monkey_meadow_odyssey',
    name: 'Monkey Meadow',
    mode: 'pve',
    category: 'Beginner',
    description:
      'The quintessential BTD6 Beginner map! A winding dirt path snakes across open sunny pastures with no water and wide sightlines.',
    theme: {
      groundColor: '#569c30',
      groundAccent: '#488726',
      trackColor: '#c9a675',
      trackBorder: '#8c693e',
      waterColor: '#2998d6',
      foliageColor: '#245c17',
    },
    paths: [
      [
        { x: 0, y: 215 },
        { x: 350, y: 215 },
        { x: 350, y: 85 },
        { x: 205, y: 85 },
        { x: 205, y: 395 },
        { x: 475, y: 395 },
        { x: 475, y: 155 },
        { x: 645, y: 155 },
        { x: 645, y: 315 },
        { x: 350, y: 315 },
        { x: 350, y: 520 },
      ],
    ],
    waterZones: [],
    obstacles: [
      { id: 'obs1', x: 95, y: 95, radius: 34, kind: 'tree', blocksSight: true, removableCost: 300 },
      { id: 'obs2', x: 725, y: 95, radius: 36, kind: 'tree', blocksSight: true, removableCost: 300 },
      { id: 'obs3', x: 720, y: 435, radius: 34, kind: 'rock', blocksSight: true, removableCost: 300 },
    ],
    environmentalEffect: {
      type: 'none',
      name: 'Sunny Meadow',
      description: 'Classic BTD6 open pasture with pure land placement and long loops.',
    },
  },
  {
    id: 'pve_timber_loop',
    name: 'Logs',
    mode: 'pve',
    category: 'Beginner',
    description:
      'The longest map in Bloons TD 6! Bloons criss-cross horizontally and vertically under hollowed log bridges around a central pond.',
    theme: {
      groundColor: '#3f6e28',
      groundAccent: '#32591e',
      trackColor: '#8d6e53',
      trackBorder: '#5c432d',
      waterColor: '#1d84b5',
      foliageColor: '#1e3b11',
    },
    paths: [
      [
        { x: 200, y: 520 },
        { x: 200, y: 75 },
        { x: 600, y: 75 },
        { x: 600, y: 445 },
        { x: 105, y: 445 },
        { x: 105, y: 165 },
        { x: 700, y: 165 },
        { x: 700, y: 345 },
        { x: 105, y: 345 },
        { x: 105, y: 255 },
        { x: 400, y: 255 },
        { x: 400, y: 0 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 495, y: 255, rx: 58, ry: 52 },
    ],
    obstacles: [
      { id: 'obs1', x: 300, y: 120, radius: 26, kind: 'wall', blocksSight: true, removableCost: 350 },
      { id: 'obs2', x: 500, y: 120, radius: 26, kind: 'wall', blocksSight: true, removableCost: 350 },
      { id: 'obs3', x: 300, y: 395, radius: 26, kind: 'wall', blocksSight: true, removableCost: 350 },
      { id: 'obs4', x: 500, y: 395, radius: 26, kind: 'wall', blocksSight: true, removableCost: 350 },
    ],
    environmentalEffect: {
      type: 'none',
      name: 'Swamp Canopy',
      description: 'Massive multi-pass grid ideal for late-game freeplay and high-pierce towers.',
    },
  },
  {
    id: 'pve_lotus_lagoon',
    name: 'Cubism',
    mode: 'pve',
    category: 'Beginner',
    description:
      'BTD6’s famous geometric abstract art map! Features sharp angular intersections, overlapping triangles, and two prism pools.',
    theme: {
      groundColor: '#e9963e',
      groundAccent: '#d97724',
      trackColor: '#475569',
      trackBorder: '#1e293b',
      waterColor: '#06b6d4',
      foliageColor: '#7c2d12',
    },
    paths: [
      [
        { x: 0, y: 95 },
        { x: 260, y: 380 },
        { x: 125, y: 455 },
        { x: 55, y: 270 },
        { x: 445, y: 75 },
        { x: 720, y: 225 },
        { x: 550, y: 455 },
        { x: 260, y: 220 },
        { x: 525, y: 95 },
        { x: 390, y: 440 },
        { x: 800, y: 290 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 195, y: 215, rx: 56, ry: 46, rotation: -0.35 },
      { id: 'w2', x: 635, y: 315, rx: 52, ry: 44, rotation: 0.4 },
    ],
    obstacles: [],
    environmentalEffect: {
      type: 'enchanted_spores',
      name: 'Prismatic Resonance',
      description: 'Zero line-of-sight blockers and +15% faster Magic & Hero attacks.',
    },
  },
  {
    id: 'pve_in_the_loop',
    name: 'In The Loop',
    mode: 'pve',
    category: 'Beginner',
    description:
      'Bloons march down from the top-left and loop around overlapping park rings beside a corner pond and picnic grove.',
    theme: {
      groundColor: '#4ea135',
      groundAccent: '#3d8a27',
      trackColor: '#d6bfa3',
      trackBorder: '#9c8265',
      waterColor: '#0ea5e9',
      foliageColor: '#1f5414',
    },
    paths: [
      [
        { x: 150, y: 0 },
        { x: 150, y: 340 },
        { x: 460, y: 340 },
        { x: 460, y: 110 },
        { x: 255, y: 110 },
        { x: 255, y: 435 },
        { x: 675, y: 435 },
        { x: 675, y: 215 },
        { x: 360, y: 215 },
        { x: 360, y: 340 },
        { x: 0, y: 340 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 565, y: 330, rx: 62, ry: 50 },
    ],
    obstacles: [
      { id: 'obs1', x: 585, y: 110, radius: 34, kind: 'tree', blocksSight: true, removableCost: 350 },
      { id: 'obs2', x: 80, y: 440, radius: 32, kind: 'tree', blocksSight: true, removableCost: 350 },
    ],
    environmentalEffect: {
      type: 'none',
      name: 'Park Breeze',
      description: 'Tight overlapping rings reward Tack Shooters, Ice Monkeys, and Villages.',
    },
  },

  // ================= INTERMEDIATE (4 MAPS) =================
  {
    id: 'pve_lunar_craters',
    name: 'Moon Landing',
    mode: 'pve',
    category: 'Intermediate',
    description:
      'Bloons loop inside three deep lunar impact craters! Crater walls block direct line-of-sight from outside—Mortars and Wizards excel.',
    theme: {
      groundColor: '#94a3b8',
      groundAccent: '#64748b',
      trackColor: '#cbd5e1',
      trackBorder: '#475569',
      waterColor: '#38bdf8',
      foliageColor: '#334155',
    },
    paths: [
      [
        { x: 0, y: 260 },
        { x: 120, y: 260 },
        // Crater 1 loop (left-top)
        { x: 145, y: 115 },
        { x: 265, y: 95 },
        { x: 305, y: 185 },
        { x: 210, y: 245 },
        { x: 145, y: 165 },
        // Move to Crater 2 (bottom-center)
        { x: 315, y: 335 },
        { x: 345, y: 445 },
        { x: 465, y: 445 },
        { x: 495, y: 345 },
        { x: 400, y: 295 },
        { x: 335, y: 375 },
        // Move to Crater 3 (right-top)
        { x: 505, y: 195 },
        { x: 545, y: 95 },
        { x: 665, y: 115 },
        { x: 675, y: 225 },
        { x: 565, y: 245 },
        { x: 535, y: 155 },
        // Exit right
        { x: 685, y: 260 },
        { x: 800, y: 260 },
      ],
    ],
    waterZones: [],
    obstacles: [
      { id: 'obs1', x: 220, y: 70, radius: 28, kind: 'rock', blocksSight: true, removableCost: 500 },
      { id: 'obs2', x: 295, y: 240, radius: 28, kind: 'rock', blocksSight: true, removableCost: 500 },
      { id: 'obs3', x: 405, y: 475, radius: 28, kind: 'rock', blocksSight: true, removableCost: 500 },
      { id: 'obs4', x: 605, y: 70, radius: 28, kind: 'rock', blocksSight: true, removableCost: 500 },
    ],
    environmentalEffect: {
      type: 'lunar_gravity',
      name: 'Low-Gravity Pulse',
      description: 'Reduced lunar gravity increases all tower attack ranges by +15%.',
    },
  },
  {
    id: 'pve_sunken_temple',
    name: 'Chutes',
    mode: 'pve',
    category: 'Intermediate',
    description:
      'Two criss-crossing Aztec stone chutes funnel Bloons past twin temple statues and river pools in a fast X-pattern!',
    theme: {
      groundColor: '#3b7a47',
      groundAccent: '#2b5e36',
      trackColor: '#94a3b8',
      trackBorder: '#475569',
      waterColor: '#0891b2',
      foliageColor: '#13381c',
    },
    paths: [
      [
        { x: 235, y: 0 },
        { x: 235, y: 120 },
        { x: 545, y: 260 },
        { x: 255, y: 400 },
        { x: 255, y: 520 },
      ],
      [
        { x: 565, y: 0 },
        { x: 565, y: 120 },
        { x: 255, y: 260 },
        { x: 545, y: 400 },
        { x: 545, y: 520 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 105, y: 260, rx: 68, ry: 115 },
      { id: 'w2', x: 695, y: 260, rx: 68, ry: 115 },
    ],
    obstacles: [
      { id: 'obs1', x: 245, y: 260, radius: 34, kind: 'ruin', blocksSight: true, removableCost: 550 },
      { id: 'obs2', x: 555, y: 260, radius: 34, kind: 'ruin', blocksSight: true, removableCost: 550 },
    ],
    environmentalEffect: {
      type: 'enchanted_spores',
      name: 'Temple Leylines',
      description: 'Remove the twin temple statues to open prime center placements; Magic/Hero +15% speed.',
    },
  },
  {
    id: 'pve_sandstorm_oasis',
    name: 'Streambed',
    mode: 'pve',
    category: 'Intermediate',
    description:
      'A dry canyon streambed winding around a giant fossilized Ammonite shell obstacle and a prehistoric watering hole.',
    theme: {
      groundColor: '#c29958',
      groundAccent: '#a87e3e',
      trackColor: '#8c6239',
      trackBorder: '#593b1d',
      waterColor: '#0284c7',
      foliageColor: '#4d6b2c',
    },
    paths: [
      [
        { x: 0, y: 390 },
        { x: 210, y: 390 },
        { x: 165, y: 145 },
        { x: 350, y: 95 },
        { x: 535, y: 155 },
        { x: 575, y: 325 },
        { x: 380, y: 385 },
        { x: 340, y: 255 },
        { x: 700, y: 225 },
        { x: 700, y: 520 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 560, y: 440, rx: 78, ry: 46 },
    ],
    obstacles: [
      { id: 'obs1', x: 445, y: 245, radius: 42, kind: 'rock', blocksSight: true, removableCost: 500 },
      { id: 'obs2', x: 95, y: 245, radius: 32, kind: 'tree', blocksSight: true, removableCost: 400 },
    ],
    environmentalEffect: {
      type: 'sandstorm_gust',
      name: 'Canyon Headwind',
      description: 'Periodic canyon gusts slightly slow non-MOAB bloons along the streambed.',
    },
  },
  {
    id: 'pve_cracked_chasm',
    name: 'Cracked',
    mode: 'pve',
    category: 'Intermediate',
    description:
      'A fractured wasteland split by a flooded tectonic chasm and a giant boulder sitting right in the prime loop!',
    theme: {
      groundColor: '#857558',
      groundAccent: '#6b5c42',
      trackColor: '#57534e',
      trackBorder: '#292524',
      waterColor: '#0ea5e9',
      foliageColor: '#3f6212',
    },
    paths: [
      [
        { x: 0, y: 120 },
        { x: 290, y: 120 },
        { x: 290, y: 295 },
        { x: 135, y: 295 },
        { x: 135, y: 425 },
        { x: 645, y: 425 },
        { x: 645, y: 130 },
        { x: 470, y: 130 },
        { x: 470, y: 315 },
        { x: 645, y: 315 },
        { x: 645, y: 520 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 380, y: 220, rx: 42, ry: 125 },
    ],
    obstacles: [
      { id: 'obs1', x: 210, y: 205, radius: 38, kind: 'rock', blocksSight: true, removableCost: 500 },
      { id: 'obs2', x: 555, y: 220, radius: 34, kind: 'rock', blocksSight: true, removableCost: 500 },
    ],
    environmentalEffect: {
      type: 'none',
      name: 'Tectonic Rift',
      description: 'Central flooded fault line supports Monkey Subs and Buccaneers right between the loops.',
    },
  },

  // ================= ADVANCED (4 MAPS) =================
  {
    id: 'pve_toxic_spillway',
    name: 'Another Brick',
    mode: 'pve',
    category: 'Advanced',
    description:
      'A towering brick wall splits the map in two! Bloons snake along the left courtyard while removable brick pallets fill the right.',
    theme: {
      groundColor: '#6b7280',
      groundAccent: '#4b5563',
      trackColor: '#9ca3af',
      trackBorder: '#374151',
      waterColor: '#0284c7',
      foliageColor: '#334155',
    },
    paths: [
      [
        { x: 95, y: 520 },
        { x: 95, y: 90 },
        { x: 325, y: 90 },
        { x: 325, y: 245 },
        { x: 195, y: 245 },
        { x: 195, y: 390 },
        { x: 325, y: 390 },
        { x: 325, y: 520 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 625, y: 395, rx: 68, ry: 52 },
    ],
    obstacles: [
      // The iconic unremovable brick wall down x=415
      { id: 'obs_wall_1', x: 415, y: 75, radius: 34, kind: 'wall', blocksSight: true, removableCost: 99999 },
      { id: 'obs_wall_2', x: 415, y: 170, radius: 34, kind: 'wall', blocksSight: true, removableCost: 99999 },
      { id: 'obs_wall_3', x: 415, y: 265, radius: 34, kind: 'wall', blocksSight: true, removableCost: 99999 },
      { id: 'obs_wall_4', x: 415, y: 360, radius: 34, kind: 'wall', blocksSight: true, removableCost: 99999 },
      { id: 'obs_wall_5', x: 415, y: 455, radius: 34, kind: 'wall', blocksSight: true, removableCost: 99999 },
      // Removable brick stacks on the right side
      { id: 'obs_pallet_1', x: 535, y: 150, radius: 38, kind: 'wall', blocksSight: true, removableCost: 1000 },
      { id: 'obs_pallet_2', x: 675, y: 225, radius: 38, kind: 'wall', blocksSight: true, removableCost: 1000 },
    ],
    environmentalEffect: {
      type: 'none',
      name: 'Brick Sightline Barrier',
      description: 'The central brick wall blocks direct line-of-sight unless towers lob over obstacles.',
    },
  },
  {
    id: 'pve_glacial_permafrost',
    name: 'Cornfield',
    mode: 'pve',
    category: 'Advanced',
    description:
      'Only a tiny central dirt patch is clear at the start! Pay cash to harvest the surrounding cornfields or go for "No Harvest"!',
    theme: {
      groundColor: '#ca8a04',
      groundAccent: '#a16207',
      trackColor: '#78350f',
      trackBorder: '#451a03',
      waterColor: '#0284c7',
      foliageColor: '#713f12',
    },
    paths: [
      [
        { x: 0, y: 245 },
        { x: 260, y: 245 },
        { x: 260, y: 155 },
        { x: 510, y: 155 },
        { x: 510, y: 360 },
        { x: 205, y: 360 },
        { x: 205, y: 80 },
        { x: 660, y: 80 },
        { x: 660, y: 445 },
        { x: 80, y: 445 },
        { x: 80, y: 245 },
      ],
    ],
    waterZones: [],
    obstacles: [
      // Surrounding harvestable corn patches leaving the central (385, 255) plot open!
      { id: 'corn_1', x: 135, y: 155, radius: 42, kind: 'tree', blocksSight: true, removableCost: 1000 },
      { id: 'corn_2', x: 350, y: 112, radius: 34, kind: 'tree', blocksSight: true, removableCost: 1000 },
      { id: 'corn_3', x: 585, y: 185, radius: 44, kind: 'tree', blocksSight: true, removableCost: 1000 },
      { id: 'corn_4', x: 585, y: 335, radius: 44, kind: 'tree', blocksSight: true, removableCost: 1000 },
      { id: 'corn_5', x: 360, y: 405, radius: 34, kind: 'tree', blocksSight: true, removableCost: 1000 },
      { id: 'corn_6', x: 135, y: 360, radius: 42, kind: 'tree', blocksSight: true, removableCost: 1000 },
    ],
    environmentalEffect: {
      type: 'sandstorm_gust',
      name: 'Bumper Crop',
      description: 'Start on the central plot (like Ultra-Juggernaut!) and harvest corn patches to expand.',
    },
  },
  {
    id: 'pve_cyber_grid',
    name: 'Off The Coast',
    mode: 'pve',
    category: 'Advanced',
    description:
      'Bloons march along a curved tropical coastline split diagonally between sandy land on the left and deep ocean on the right.',
    theme: {
      groundColor: '#e2c07d',
      groundAccent: '#cfb87c',
      trackColor: '#8c7a6b',
      trackBorder: '#473c33',
      waterColor: '#0284c7',
      foliageColor: '#15803d',
    },
    paths: [
      [
        { x: 0, y: 315 },
        { x: 255, y: 215 },
        { x: 475, y: 135 },
        { x: 495, y: 365 },
        { x: 295, y: 415 },
        { x: 295, y: 520 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 645, y: 260, rx: 120, ry: 215 },
      { id: 'w2', x: 465, y: 455, rx: 105, ry: 55 },
    ],
    obstacles: [
      { id: 'obs1', x: 135, y: 115, radius: 38, kind: 'tree', blocksSight: true, removableCost: 750 },
      { id: 'obs2', x: 635, y: 165, radius: 36, kind: 'ruin', blocksSight: true, removableCost: 900 },
    ],
    environmentalEffect: {
      type: 'high_voltage_grid',
      name: 'Naval Armada',
      description: 'Ideal for Sub Commander and Carrier Flagship; Military & Support towers gain +2 pierce.',
    },
  },
  {
    id: 'pve_peninsula_outpost',
    name: 'Peninsula',
    mode: 'pve',
    category: 'Advanced',
    description:
      'Flooded ocean waves surround a narrow rocky causeway! Land space is scarce until you clear the mossy rocks or deploy naval fleets.',
    theme: {
      groundColor: '#475569',
      groundAccent: '#334155',
      trackColor: '#94a3b8',
      trackBorder: '#1e293b',
      waterColor: '#0369a1',
      foliageColor: '#166534',
    },
    paths: [
      [
        { x: 0, y: 165 },
        { x: 455, y: 165 },
        { x: 565, y: 260 },
        { x: 455, y: 360 },
        { x: 195, y: 360 },
        { x: 195, y: 520 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 260, y: 72, rx: 210, ry: 52 },
      { id: 'w2', x: 675, y: 260, rx: 92, ry: 185 },
      { id: 'w3', x: 445, y: 450, rx: 160, ry: 52 },
    ],
    obstacles: [
      { id: 'obs1', x: 325, y: 260, radius: 36, kind: 'rock', blocksSight: true, removableCost: 750 },
      { id: 'obs2', x: 95, y: 280, radius: 34, kind: 'tree', blocksSight: true, removableCost: 650 },
    ],
    environmentalEffect: {
      type: 'glacial_chill',
      name: 'Ocean Spray',
      description: 'Chilled sea spray slows Bloons by 12% along the rocky causeway.',
    },
  },

  // ================= EXPERT (4 MAPS) =================
  {
    id: 'pve_dark_citadel',
    name: 'Dark Castle',
    mode: 'pve',
    category: 'Expert',
    description:
      'The fan-favorite BTD6 Expert map! Four forest paths on the left merge onto a single stone bridge crossing the castle moat into the gate.',
    theme: {
      groundColor: '#27362a',
      groundAccent: '#1c281f',
      trackColor: '#78716c',
      trackBorder: '#44403c',
      waterColor: '#1e3a8a',
      foliageColor: '#0f1f13',
    },
    paths: [
      [
        { x: 0, y: 65 },
        { x: 185, y: 155 },
        { x: 345, y: 260 },
        { x: 800, y: 260 },
      ],
      [
        { x: 0, y: 195 },
        { x: 185, y: 225 },
        { x: 345, y: 260 },
        { x: 800, y: 260 },
      ],
      [
        { x: 0, y: 325 },
        { x: 185, y: 295 },
        { x: 345, y: 260 },
        { x: 800, y: 260 },
      ],
      [
        { x: 0, y: 455 },
        { x: 185, y: 365 },
        { x: 345, y: 260 },
        { x: 800, y: 260 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 555, y: 115, rx: 52, ry: 88 },
      { id: 'w2', x: 555, y: 405, rx: 52, ry: 88 },
    ],
    obstacles: [
      // Removable forest trees on the left
      { id: 'obs_tree_1', x: 245, y: 95, radius: 38, kind: 'tree', blocksSight: true, removableCost: 1000 },
      { id: 'obs_tree_2', x: 95, y: 260, radius: 34, kind: 'tree', blocksSight: true, removableCost: 1000 },
      { id: 'obs_tree_3', x: 245, y: 425, radius: 38, kind: 'tree', blocksSight: true, removableCost: 1000 },
      // Castle rampart towers on the right
      { id: 'obs_castle_1', x: 705, y: 120, radius: 44, kind: 'ruin', blocksSight: false, removableCost: 2000 },
      { id: 'obs_castle_2', x: 705, y: 400, radius: 44, kind: 'ruin', blocksSight: false, removableCost: 2000 },
    ],
    environmentalEffect: {
      type: 'none',
      name: 'Castle Siege',
      description: 'Four converging lanes merge at the moat bridge—Spike Factories and Subs shine here!',
    },
  },
  {
    id: 'pve_volcanic_caldera',
    name: 'Infernal',
    mode: 'pve',
    category: 'Expert',
    description:
      'Two symmetrical volcanic rock loops cross over a lake of magma with tiny obsidian islands in the middle and on the flanks!',
    theme: {
      groundColor: '#2a1210',
      groundAccent: '#1c0a08',
      trackColor: '#573630',
      trackBorder: '#f97316',
      waterColor: '#0284c7',
      foliageColor: '#7c2d12',
    },
    paths: [
      [
        { x: 0, y: 170 },
        { x: 245, y: 170 },
        { x: 315, y: 335 },
        { x: 555, y: 335 },
        { x: 555, y: 170 },
        { x: 800, y: 170 },
      ],
      [
        { x: 800, y: 350 },
        { x: 555, y: 350 },
        { x: 485, y: 185 },
        { x: 245, y: 185 },
        { x: 245, y: 350 },
        { x: 0, y: 350 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 400, y: 110, rx: 65, ry: 40 },
      { id: 'w2', x: 400, y: 410, rx: 65, ry: 40 },
    ],
    obstacles: [
      { id: 'obs1', x: 135, y: 80, radius: 36, kind: 'crater', blocksSight: true, removableCost: 1500 },
      { id: 'obs2', x: 665, y: 80, radius: 36, kind: 'crater', blocksSight: true, removableCost: 1500 },
      { id: 'obs3', x: 135, y: 440, radius: 36, kind: 'crater', blocksSight: true, removableCost: 1500 },
      { id: 'obs4', x: 665, y: 440, radius: 36, kind: 'crater', blocksSight: true, removableCost: 1500 },
    ],
    environmentalEffect: {
      type: 'volcanic_ash',
      name: 'Magma Plume',
      description: 'Periodic volcanic flares scorch non-Purple bloons near the central island.',
    },
  },
  {
    id: 'pve_bloody_puddles_x',
    name: '#Ouch',
    mode: 'pve',
    category: 'Expert',
    description:
      'BTD6’s legendary 4-way urban intersection! Two horizontal and two vertical tracks cross straight over a central courtyard pool.',
    theme: {
      groundColor: '#475569',
      groundAccent: '#334155',
      trackColor: '#1e293b',
      trackBorder: '#94a3b8',
      waterColor: '#0ea5e9',
      foliageColor: '#1e293b',
    },
    paths: [
      // Vertical Left
      [
        { x: 270, y: 0 },
        { x: 270, y: 520 },
      ],
      // Vertical Right
      [
        { x: 530, y: 520 },
        { x: 530, y: 0 },
      ],
      // Horizontal Top
      [
        { x: 0, y: 175 },
        { x: 800, y: 175 },
      ],
      // Horizontal Bottom
      [
        { x: 800, y: 345 },
        { x: 0, y: 345 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 400, y: 260, rx: 78, ry: 48 },
    ],
    obstacles: [
      { id: 'obs1', x: 130, y: 85, radius: 32, kind: 'wall', blocksSight: true, removableCost: 1000 },
      { id: 'obs2', x: 670, y: 85, radius: 32, kind: 'wall', blocksSight: true, removableCost: 1000 },
      { id: 'obs3', x: 130, y: 435, radius: 32, kind: 'wall', blocksSight: true, removableCost: 1000 },
      { id: 'obs4', x: 670, y: 435, radius: 32, kind: 'wall', blocksSight: true, removableCost: 1000 },
    ],
    environmentalEffect: {
      type: 'high_voltage_grid',
      name: 'Crossfire Intersection',
      description: 'Four ultra-short straight streets; Military & Support towers gain +2 pierce.',
    },
  },
  {
    id: 'pve_muddy_puddles',
    name: 'Muddy Puddles',
    mode: 'pve',
    category: 'Expert',
    description:
      'Four parallel winding dirt tracks cut vertically across a rain-soaked battlefield dotted with puddles and boulders.',
    theme: {
      groundColor: '#4d5d2b',
      groundAccent: '#3b4820',
      trackColor: '#7c5836',
      trackBorder: '#4f361f',
      waterColor: '#2563eb',
      foliageColor: '#263012',
    },
    paths: [
      [
        { x: 130, y: 0 },
        { x: 165, y: 175 },
        { x: 110, y: 345 },
        { x: 145, y: 520 },
      ],
      [
        { x: 310, y: 520 },
        { x: 280, y: 345 },
        { x: 335, y: 175 },
        { x: 300, y: 0 },
      ],
      [
        { x: 490, y: 0 },
        { x: 525, y: 175 },
        { x: 470, y: 345 },
        { x: 505, y: 520 },
      ],
      [
        { x: 670, y: 520 },
        { x: 640, y: 345 },
        { x: 695, y: 175 },
        { x: 660, y: 0 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 225, y: 260, rx: 38, ry: 44 },
      { id: 'w2', x: 585, y: 260, rx: 38, ry: 44 },
    ],
    obstacles: [
      { id: 'obs1', x: 400, y: 145, radius: 32, kind: 'rock', blocksSight: true, removableCost: 1000 },
      { id: 'obs2', x: 400, y: 375, radius: 32, kind: 'rock', blocksSight: true, removableCost: 1000 },
    ],
    environmentalEffect: {
      type: 'sandstorm_gust',
      name: 'Muddy Trenches',
      description: 'Deep mud slightly slows standard bloons across all four parallel lanes.',
    },
  },
];

/**
 * 8 Authentic Bloons TD Battles 2 PvP Arena Maps
 * Specifically designed for Battles 2 Split-Screen Dual Canvas play
 */
export const PVP_MAPS: GameMap[] = [
  {
    id: 'pvp_mayan_mirror',
    name: 'Mayan (Arena)',
    mode: 'pvp',
    category: 'Beginner',
    description:
      'The iconic Battles 2 jungle temple map! Features an S-curve stone causeway wrapping around a central Mayan pyramid and river pools.',
    theme: {
      groundColor: '#22c55e',
      groundAccent: '#16a34a',
      trackColor: '#94a3b8',
      trackBorder: '#475569',
      waterColor: '#0ea5e9',
      foliageColor: '#14532d',
    },
    paths: [
      [
        { x: 640, y: 0 },
        { x: 480, y: 85 },
        { x: 185, y: 165 },
        { x: 185, y: 295 },
        { x: 615, y: 295 },
        { x: 615, y: 425 },
        { x: 210, y: 425 },
        { x: 0, y: 315 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 560, y: 175, rx: 78, ry: 46 },
      { id: 'w2', x: 135, y: 445, rx: 68, ry: 40 },
    ],
    obstacles: [
      { id: 'obs1', x: 375, y: 225, radius: 44, kind: 'ruin', blocksSight: true, removableCost: 500 },
    ],
    environmentalEffect: {
      type: 'none',
      name: 'Tournament Standard',
      description: 'Official Battles 2 competitive arena with balanced choke points.',
    },
  },
  {
    id: 'pvp_koru_lagoon',
    name: 'Koru (Arena)',
    mode: 'pvp',
    category: 'Intermediate',
    description:
      'Bloons coil tightly around a central hollow tree stump and crescent swamp lagoon—famous for punishing Purple and Rainbow rushes!',
    theme: {
      groundColor: '#4d7c0f',
      groundAccent: '#3f6212',
      trackColor: '#a8a29e',
      trackBorder: '#57534e',
      waterColor: '#0284c7',
      foliageColor: '#1a2e05',
    },
    paths: [
      [
        { x: 0, y: 95 },
        { x: 650, y: 95 },
        { x: 650, y: 430 },
        { x: 145, y: 430 },
        { x: 145, y: 195 },
        { x: 525, y: 195 },
        { x: 525, y: 335 },
        { x: 265, y: 335 },
        { x: 265, y: 520 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 385, y: 265, rx: 68, ry: 38 },
    ],
    obstacles: [
      { id: 'obs1', x: 545, y: 265, radius: 34, kind: 'tree', blocksSight: true, removableCost: 450 },
    ],
    environmentalEffect: {
      type: 'none',
      name: 'Tournament Standard',
      description: 'Classic Battles 2 spiral track.',
    },
  },
  {
    id: 'pvp_docks_bay',
    name: 'Docks (Arena)',
    mode: 'pvp',
    category: 'Beginner',
    description:
      'Battles 2’s longest map! Wooden shipyard piers wind past cargo containers and sprawling harbor water for late-game BAD showdowns.',
    theme: {
      groundColor: '#78350f',
      groundAccent: '#451a03',
      trackColor: '#a16207',
      trackBorder: '#713f12',
      waterColor: '#0369a1',
      foliageColor: '#1e293b',
    },
    paths: [
      [
        { x: 0, y: 80 },
        { x: 695, y: 80 },
        { x: 695, y: 255 },
        { x: 115, y: 255 },
        { x: 115, y: 440 },
        { x: 800, y: 440 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 395, y: 168, rx: 195, ry: 42 },
      { id: 'w2', x: 455, y: 348, rx: 195, ry: 44 },
    ],
    obstacles: [
      { id: 'obs1', x: 645, y: 348, radius: 34, kind: 'wall', blocksSight: true, removableCost: 450 },
      { id: 'obs2', x: 155, y: 168, radius: 32, kind: 'wall', blocksSight: true, removableCost: 450 },
    ],
    environmentalEffect: {
      type: 'none',
      name: 'Harbor Calm',
      description: 'Extended pier length and abundant water favor Merchantmen and late-game eco.',
    },
  },
  {
    id: 'pvp_in_the_wall',
    name: 'In The Wall (Arena)',
    mode: 'pvp',
    category: 'Intermediate',
    description:
      'A massive brick fortification spans the arena! Bloons wind through narrow archways around sight-blocking brick walls and twin moats.',
    theme: {
      groundColor: '#57534e',
      groundAccent: '#44403c',
      trackColor: '#a8a29e',
      trackBorder: '#292524',
      waterColor: '#0284c7',
      foliageColor: '#292524',
    },
    paths: [
      [
        { x: 0, y: 135 },
        { x: 275, y: 135 },
        { x: 275, y: 385 },
        { x: 525, y: 385 },
        { x: 525, y: 135 },
        { x: 800, y: 135 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 145, y: 355, rx: 64, ry: 54 },
      { id: 'w2', x: 655, y: 355, rx: 64, ry: 54 },
    ],
    obstacles: [
      { id: 'obs1', x: 400, y: 155, radius: 42, kind: 'wall', blocksSight: true, removableCost: 500 },
      { id: 'obs2', x: 400, y: 265, radius: 42, kind: 'wall', blocksSight: true, removableCost: 500 },
    ],
    environmentalEffect: {
      type: 'none',
      name: 'Tournament Standard',
      description: 'Clear the brick wall segments or place towers in the U-bends.',
    },
  },
  {
    id: 'pvp_glacier_pass',
    name: 'Glacier Pass (Arena)',
    mode: 'pvp',
    category: 'Intermediate',
    description:
      'Frozen mountain switchbacks wind around an icy central meltwater channel and snow-covered boulders.',
    theme: {
      groundColor: '#cbd5e1',
      groundAccent: '#94a3b8',
      trackColor: '#64748b',
      trackBorder: '#334155',
      waterColor: '#0284c7',
      foliageColor: '#475569',
    },
    paths: [
      [
        { x: 0, y: 150 },
        { x: 275, y: 150 },
        { x: 275, y: 390 },
        { x: 535, y: 390 },
        { x: 535, y: 130 },
        { x: 800, y: 130 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 405, y: 255, rx: 56, ry: 95 },
    ],
    obstacles: [
      { id: 'obs1', x: 135, y: 335, radius: 36, kind: 'rock', blocksSight: true, removableCost: 500 },
      { id: 'obs2', x: 665, y: 335, radius: 36, kind: 'rock', blocksSight: true, removableCost: 500 },
    ],
    environmentalEffect: {
      type: 'glacial_chill',
      name: 'Frostbite Air',
      description: 'Bloons move 12% slower on the icy mountain switchbacks.',
    },
  },
  {
    id: 'pvp_basalt_columns',
    name: 'Basalt Columns (Arena)',
    mode: 'pvp',
    category: 'Advanced',
    description:
      'Dual crisscrossing volcanic tracks wrap around a central hexagonal water pool and dark basalt rock columns.',
    theme: {
      groundColor: '#334155',
      groundAccent: '#1e293b',
      trackColor: '#475569',
      trackBorder: '#f97316',
      waterColor: '#0284c7',
      foliageColor: '#0f172a',
    },
    paths: [
      [
        { x: 145, y: 0 },
        { x: 285, y: 185 },
        { x: 515, y: 335 },
        { x: 145, y: 520 },
      ],
      [
        { x: 655, y: 0 },
        { x: 515, y: 185 },
        { x: 285, y: 335 },
        { x: 655, y: 520 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 400, y: 260, rx: 66, ry: 66 },
    ],
    obstacles: [
      { id: 'obs1', x: 155, y: 260, radius: 38, kind: 'rock', blocksSight: true, removableCost: 600 },
      { id: 'obs2', x: 645, y: 260, radius: 38, kind: 'rock', blocksSight: true, removableCost: 600 },
    ],
    environmentalEffect: {
      type: 'volcanic_ash',
      name: 'Thermal Draft',
      description: 'Periodic volcanic heat pulses near the center basalt pool.',
    },
  },
  {
    id: 'pvp_star_station',
    name: 'Star (Arena)',
    mode: 'pvp',
    category: 'Expert',
    description:
      'Battles 2’s iconic 5-pointed Moroccan Star track! Bloons trace sharp interlocking star angles flanked by twin oasis pools.',
    theme: {
      groundColor: '#d97706',
      groundAccent: '#b45309',
      trackColor: '#fde68a',
      trackBorder: '#78350f',
      waterColor: '#06b6d4',
      foliageColor: '#451a03',
    },
    paths: [
      [
        { x: 0, y: 205 },
        { x: 625, y: 205 },
        { x: 215, y: 455 },
        { x: 400, y: 65 },
        { x: 585, y: 455 },
        { x: 175, y: 205 },
        { x: 800, y: 205 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 115, y: 365, rx: 56, ry: 46 },
      { id: 'w2', x: 685, y: 365, rx: 56, ry: 46 },
    ],
    obstacles: [
      { id: 'obs1', x: 235, y: 105, radius: 30, kind: 'rock', blocksSight: true, removableCost: 600 },
      { id: 'obs2', x: 565, y: 105, radius: 30, kind: 'rock', blocksSight: true, removableCost: 600 },
    ],
    environmentalEffect: {
      type: 'lunar_gravity',
      name: 'Starlight Alignment',
      description: 'Intersecting star vertices reward high-pierce towers; +15% tower range.',
    },
  },
  {
    id: 'pvp_dino_graveyard',
    name: 'Dino Graveyard (Arena)',
    mode: 'pvp',
    category: 'Advanced',
    description:
      'Bloons loop through an arid badlands excavation site past giant prehistoric ribcage fossils and tar pits.',
    theme: {
      groundColor: '#c2854c',
      groundAccent: '#a36832',
      trackColor: '#e2cba4',
      trackBorder: '#784920',
      waterColor: '#0891b2',
      foliageColor: '#5c3412',
    },
    paths: [
      [
        { x: 0, y: 365 },
        { x: 245, y: 365 },
        { x: 245, y: 115 },
        { x: 555, y: 115 },
        { x: 555, y: 415 },
        { x: 385, y: 415 },
        { x: 385, y: 245 },
        { x: 800, y: 245 },
      ],
    ],
    waterZones: [
      { id: 'w1', x: 685, y: 390, rx: 62, ry: 50 },
    ],
    obstacles: [
      { id: 'obs1', x: 395, y: 175, radius: 36, kind: 'ruin', blocksSight: true, removableCost: 550 },
      { id: 'obs2', x: 120, y: 215, radius: 34, kind: 'rock', blocksSight: true, removableCost: 550 },
    ],
    environmentalEffect: {
      type: 'sandstorm_gust',
      name: 'Badlands Dust',
      description: 'Periodic desert gusts slightly slow non-MOAB bloons.',
    },
  },
];

export const ALL_MAPS: GameMap[] = [...PVE_MAPS, ...PVP_MAPS];
