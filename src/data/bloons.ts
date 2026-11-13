import { BloonSpec, BloonType, PvPBloonSendSpec } from '../types/game';

export const BLOON_SPECS: Record<BloonType, BloonSpec> = {
  red: {
    type: 'red',
    name: 'Red Bloon',
    hp: 1,
    speed: 1.0,
    rbe: 1,
    cashReward: 1,
    children: [],
    color: '#ef4444',
    accentColor: '#fca5a5',
    radius: 11,
    isMoabClass: false,
    immunities: [],
  },
  blue: {
    type: 'blue',
    name: 'Blue Bloon',
    hp: 1,
    speed: 1.4,
    rbe: 2,
    cashReward: 1,
    children: [{ type: 'red', count: 1 }],
    color: '#3b82f6',
    accentColor: '#93c5fd',
    radius: 12,
    isMoabClass: false,
    immunities: [],
  },
  green: {
    type: 'green',
    name: 'Green Bloon',
    hp: 1,
    speed: 1.8,
    rbe: 3,
    cashReward: 1,
    children: [{ type: 'blue', count: 1 }],
    color: '#22c55e',
    accentColor: '#86efac',
    radius: 12.5,
    isMoabClass: false,
    immunities: [],
  },
  yellow: {
    type: 'yellow',
    name: 'Yellow Bloon',
    hp: 1,
    speed: 3.2,
    rbe: 4,
    cashReward: 1,
    children: [{ type: 'green', count: 1 }],
    color: '#eab308',
    accentColor: '#fef08a',
    radius: 13,
    isMoabClass: false,
    immunities: [],
  },
  pink: {
    type: 'pink',
    name: 'Pink Bloon',
    hp: 1,
    speed: 3.5,
    rbe: 5,
    cashReward: 1,
    children: [{ type: 'yellow', count: 1 }],
    color: '#f472b6',
    accentColor: '#fbcfe8',
    radius: 13.5,
    isMoabClass: false,
    immunities: [],
  },
  black: {
    type: 'black',
    name: 'Black Bloon',
    hp: 1,
    speed: 1.8,
    rbe: 11,
    cashReward: 1,
    children: [{ type: 'pink', count: 2 }],
    color: '#1e293b',
    accentColor: '#64748b',
    radius: 11.5,
    isMoabClass: false,
    immunities: ['explosive'],
  },
  white: {
    type: 'white',
    name: 'White Bloon',
    hp: 1,
    speed: 2.0,
    rbe: 11,
    cashReward: 1,
    children: [{ type: 'pink', count: 2 }],
    color: '#f8fafc',
    accentColor: '#cbd5e1',
    radius: 11.5,
    isMoabClass: false,
    immunities: ['cold'],
  },
  purple: {
    type: 'purple',
    name: 'Purple Bloon',
    hp: 1,
    speed: 3.0,
    rbe: 11,
    cashReward: 1,
    children: [{ type: 'pink', count: 2 }],
    color: '#9333ea',
    accentColor: '#22d3ee',
    radius: 12.5,
    isMoabClass: false,
    immunities: ['energy', 'fire', 'plasma'],
  },
  zebra: {
    type: 'zebra',
    name: 'Zebra Bloon',
    hp: 1,
    speed: 1.8,
    rbe: 23,
    cashReward: 1,
    children: [
      { type: 'black', count: 1 },
      { type: 'white', count: 1 },
    ],
    color: '#e2e8f0',
    accentColor: '#0f172a',
    radius: 13,
    isMoabClass: false,
    immunities: ['explosive', 'cold'],
  },
  lead: {
    type: 'lead',
    name: 'Lead Bloon',
    hp: 1,
    speed: 1.0,
    rbe: 23,
    cashReward: 1,
    children: [{ type: 'black', count: 2 }],
    color: '#64748b',
    accentColor: '#334155',
    radius: 13.5,
    isMoabClass: false,
    immunities: ['sharp', 'energy'],
  },
  rainbow: {
    type: 'rainbow',
    name: 'Rainbow Bloon',
    hp: 1,
    speed: 2.2,
    rbe: 47,
    cashReward: 1,
    children: [{ type: 'zebra', count: 2 }],
    color: '#ec4899',
    accentColor: '#38bdf8',
    radius: 14,
    isMoabClass: false,
    immunities: [],
  },
  ceramic: {
    type: 'ceramic',
    name: 'Ceramic Bloon',
    hp: 10,
    speed: 2.5,
    rbe: 104,
    cashReward: 4,
    children: [{ type: 'rainbow', count: 2 }],
    color: '#c26d2d',
    accentColor: '#9a4f19',
    radius: 14.5,
    isMoabClass: false,
    immunities: [],
  },
  moab: {
    type: 'moab',
    name: 'M.O.A.B.',
    hp: 200,
    speed: 1.0,
    rbe: 616,
    cashReward: 25,
    children: [{ type: 'ceramic', count: 4 }],
    color: '#0284c7',
    accentColor: '#e0f2fe',
    radius: 24,
    isMoabClass: true,
    immunities: ['cold'],
  },
  bfb: {
    type: 'bfb',
    name: 'B.F.B.',
    hp: 700,
    speed: 0.25,
    rbe: 3164,
    cashReward: 50,
    children: [{ type: 'moab', count: 4 }],
    color: '#dc2626',
    accentColor: '#fef2f2',
    radius: 30,
    isMoabClass: true,
    immunities: ['cold'],
  },
  zomg: {
    type: 'zomg',
    name: 'Z.O.M.G.',
    hp: 4000,
    speed: 0.18,
    rbe: 16656,
    cashReward: 100,
    children: [{ type: 'bfb', count: 4 }],
    color: '#16a34a',
    accentColor: '#1e293b',
    radius: 35,
    isMoabClass: true,
    immunities: ['cold'],
  },
  ddt: {
    type: 'ddt',
    name: 'D.D.T.',
    hp: 400,
    speed: 2.6,
    rbe: 816,
    cashReward: 60,
    children: [{ type: 'ceramic', count: 4 }],
    color: '#1e293b',
    accentColor: '#475569',
    radius: 25,
    isMoabClass: true,
    innateCamo: true,
    immunities: ['sharp', 'explosive', 'cold'],
  },
  bad: {
    type: 'bad',
    name: 'B.A.D.',
    hp: 20000,
    speed: 0.18,
    rbe: 55760,
    cashReward: 250,
    children: [
      { type: 'zomg', count: 2 },
      { type: 'ddt', count: 3 },
    ],
    color: '#7e22ce',
    accentColor: '#f0abfc',
    radius: 40,
    isMoabClass: true,
    immunities: ['cold'],
  },
  boss_bloonarius: {
    type: 'boss_bloonarius',
    name: 'Bloonarius the Inflator',
    hp: 4500,
    speed: 0.14,
    rbe: 9999,
    cashReward: 1500,
    children: [{ type: 'moab', count: 2 }],
    color: '#15803d',
    accentColor: '#a855f7',
    radius: 46,
    isMoabClass: true,
    isBoss: true,
    bossSkulls: 4,
    immunities: ['cold'],
  },
  boss_lych: {
    type: 'boss_lych',
    name: 'Gravelord Lych',
    hp: 11000,
    speed: 0.16,
    rbe: 9999,
    cashReward: 2200,
    children: [{ type: 'bfb', count: 2 }],
    color: '#4c1d95',
    accentColor: '#10b981',
    radius: 46,
    isMoabClass: true,
    isBoss: true,
    bossSkulls: 5,
    immunities: ['cold'],
  },
  boss_vortex: {
    type: 'boss_vortex',
    name: 'Vortex: Master of Air',
    hp: 18000,
    speed: 0.21,
    rbe: 9999,
    cashReward: 3000,
    children: [
      { type: 'zomg', count: 1 },
      { type: 'bfb', count: 2 },
    ],
    color: '#0369a1',
    accentColor: '#67e8f9',
    radius: 45,
    isMoabClass: true,
    isBoss: true,
    bossSkulls: 5,
    immunities: ['cold'],
  },
  boss_dreadbloon: {
    type: 'boss_dreadbloon',
    name: 'Dreadbloon: Armored Behemoth',
    hp: 26000,
    speed: 0.12,
    rbe: 9999,
    cashReward: 4000,
    children: [
      { type: 'zomg', count: 2 },
      { type: 'ddt', count: 2 },
    ],
    color: '#78350f',
    accentColor: '#f59e0b',
    radius: 48,
    isMoabClass: true,
    isBoss: true,
    bossSkulls: 5,
    immunities: ['sharp', 'cold'],
  },
};

export const BLOON_HIERARCHY_ORDER: BloonType[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'pink',
  'black',
  'white',
  'purple',
  'zebra',
  'lead',
  'rainbow',
  'ceramic',
  'moab',
  'bfb',
  'zomg',
  'ddt',
  'bad',
];

// Battles 2 Balanced Bloon Send Grid
export const PVP_BLOON_SENDS: PvPBloonSendSpec[] = [
  { id: 'send_red', bloonType: 'red', name: 'Grouped Reds', cost: 25, ecoChange: 1.5, count: 6, spacing: 0.12, unlockRound: 1, isGrouped: true },
  { id: 'send_blue', bloonType: 'blue', name: 'Grouped Blues', cost: 35, ecoChange: 2.0, count: 6, spacing: 0.12, unlockRound: 1, isGrouped: true },
  { id: 'send_green', bloonType: 'green', name: 'Grouped Greens', cost: 50, ecoChange: 2.4, count: 5, spacing: 0.13, unlockRound: 2, isGrouped: true },
  { id: 'send_yellow', bloonType: 'yellow', name: 'Grouped Yellows', cost: 60, ecoChange: 2.7, count: 4, spacing: 0.14, unlockRound: 3, isGrouped: true },
  { id: 'send_pink', bloonType: 'pink', name: 'Spaced Pinks', cost: 70, ecoChange: 3.0, count: 4, spacing: 0.22, unlockRound: 4, isGrouped: false },
  { id: 'send_white', bloonType: 'white', name: 'Spaced Whites', cost: 65, ecoChange: 2.9, count: 3, spacing: 0.24, unlockRound: 5, isGrouped: false },
  { id: 'send_black', bloonType: 'black', name: 'Grouped Blacks', cost: 80, ecoChange: 3.4, count: 4, spacing: 0.14, unlockRound: 6, isGrouped: true },
  { id: 'send_purple', bloonType: 'purple', name: 'Grouped Purples', cost: 110, ecoChange: 3.8, count: 5, spacing: 0.12, unlockRound: 8, isGrouped: true },
  { id: 'send_zebra', bloonType: 'zebra', name: 'Grouped Zebras', cost: 120, ecoChange: 4.0, count: 3, spacing: 0.16, unlockRound: 9, isGrouped: true },
  { id: 'send_lead', bloonType: 'lead', name: 'Grouped Leads', cost: 150, ecoChange: 4.6, count: 4, spacing: 0.18, unlockRound: 10, isGrouped: true },
  { id: 'send_rainbow', bloonType: 'rainbow', name: 'Grouped Rainbows', cost: 240, ecoChange: 5.5, count: 4, spacing: 0.14, unlockRound: 12, isGrouped: true },
  { id: 'send_ceramic', bloonType: 'ceramic', name: 'Spaced Ceramics', cost: 380, ecoChange: 2.5, count: 2, spacing: 0.3, unlockRound: 13, isGrouped: false },
  { id: 'send_moab', bloonType: 'moab', name: 'M.O.A.B.', cost: 1150, ecoChange: 0, count: 1, spacing: 0.7, unlockRound: 17, isGrouped: false },
  { id: 'send_bfb', bloonType: 'bfb', name: 'B.F.B.', cost: 2400, ecoChange: -45, count: 1, spacing: 0.9, unlockRound: 20, isGrouped: false },
  { id: 'send_zomg', bloonType: 'zomg', name: 'Z.O.M.G.', cost: 5200, ecoChange: -110, count: 1, spacing: 1.0, unlockRound: 22, isGrouped: false },
  { id: 'send_ddt', bloonType: 'ddt', name: 'D.D.T. Rush', cost: 4200, ecoChange: -90, count: 2, spacing: 0.5, unlockRound: 26, isGrouped: true },
  { id: 'send_bad', bloonType: 'bad', name: 'B.A.D.', cost: 14000, ecoChange: -250, count: 1, spacing: 1.2, unlockRound: 30, isGrouped: false },
];

export interface WaveGroup {
  type: BloonType;
  count: number;
  spacing: number;
  delay: number;
  camo?: boolean;
  regrow?: boolean;
  fortified?: boolean;
}

export function generateRoundWaves(round: number, isPvE: boolean): WaveGroup[] {
  const waves: WaveGroup[] = [];

  if (round === 1) {
    waves.push({ type: 'red', count: 20, spacing: 0.42, delay: 0 });
  } else if (round === 2) {
    waves.push({ type: 'red', count: 35, spacing: 0.32, delay: 0 });
  } else if (round === 3) {
    waves.push({ type: 'red', count: 15, spacing: 0.3, delay: 0 });
    waves.push({ type: 'blue', count: 8, spacing: 0.4, delay: 1.8 });
  } else if (round === 4) {
    waves.push({ type: 'blue', count: 25, spacing: 0.3, delay: 0 });
    waves.push({ type: 'red', count: 15, spacing: 0.22, delay: 2.5 });
  } else if (round === 5) {
    waves.push({ type: 'blue', count: 15, spacing: 0.28, delay: 0 });
    waves.push({ type: 'green', count: 12, spacing: 0.34, delay: 1.5 });
  } else if (round <= 10) {
    waves.push({ type: 'green', count: 15 + round * 2, spacing: 0.26, delay: 0 });
    waves.push({ type: 'yellow', count: 6 + round, spacing: 0.32, delay: 2, regrow: round >= 8 });
    if (round === 10) {
      waves.push({ type: 'blue', count: 50, spacing: 0.13, delay: 2.5 });
    }
  } else if (round <= 20) {
    waves.push({ type: 'yellow', count: 20, spacing: 0.22, delay: 0 });
    waves.push({ type: 'pink', count: 15, spacing: 0.2, delay: 1.8, regrow: round % 2 === 0 });
    if (round >= 12) {
      waves.push({ type: 'white', count: 10, spacing: 0.28, delay: 2.8, camo: round === 14 });
      waves.push({ type: 'black', count: 10, spacing: 0.28, delay: 3.4 });
    }
    if (round >= 16) {
      waves.push({ type: 'purple', count: 12, spacing: 0.22, delay: 4.2 });
    }
    if (round === 20) {
      waves.push({ type: 'black', count: 12, spacing: 0.18, delay: 0.8, camo: true });
    }
  } else if (round <= 39) {
    waves.push({ type: 'zebra', count: 12 + (round - 20), spacing: 0.2, delay: 0, regrow: round % 3 === 0 });
    if (round >= 24) {
      waves.push({ type: 'green', count: 8, spacing: 0.28, delay: 1.0, camo: true });
    }
    if (round >= 25) {
      waves.push({ type: 'purple', count: 18, spacing: 0.16, delay: 2.0 });
    }
    if (round >= 28) {
      waves.push({ type: 'lead', count: 6 + Math.floor((round - 28) / 2), spacing: 0.38, delay: 2.8, fortified: round >= 35 });
    }
    if (round >= 32) {
      waves.push({ type: 'rainbow', count: 10 + (round - 30), spacing: 0.22, delay: 3.4, camo: round === 33 || round === 37 });
    }
    if (round >= 38) {
      waves.push({ type: 'ceramic', count: 6, spacing: 0.35, delay: 4.6, regrow: true });
    }
  } else if (round === 40) {
    waves.push({ type: 'ceramic', count: 8, spacing: 0.28, delay: 0 });
    waves.push({ type: 'moab', count: 1, spacing: 0.8, delay: 2 });
    if (isPvE) {
      waves.push({ type: 'boss_bloonarius', count: 1, spacing: 1.5, delay: 3.5 });
    }
  } else if (round < 60) {
    const scale = round - 40;
    waves.push({ type: 'rainbow', count: 15 + scale, spacing: 0.16, delay: 0, regrow: true });
    waves.push({ type: 'ceramic', count: 8 + Math.floor(scale * 0.8), spacing: 0.24, delay: 1.4, fortified: round >= 48, camo: round % 3 === 0 });
    waves.push({ type: 'lead', count: 10, spacing: 0.2, delay: 2.8, camo: round >= 51, fortified: true });
    waves.push({ type: 'moab', count: 1 + Math.floor(scale / 4), spacing: 1.4, delay: 4.2, fortified: round >= 54 });
  } else if (round === 60) {
    waves.push({ type: 'bfb', count: 1, spacing: 1.5, delay: 0, fortified: false });
    waves.push({ type: 'moab', count: 3, spacing: 0.9, delay: 2.8, fortified: true });
    if (isPvE) {
      waves.push({ type: 'boss_lych', count: 1, spacing: 1.5, delay: 4.5 });
    }
  } else if (round < 80) {
    const scale = round - 60;
    if (round === 63 || round === 76 || round === 78) {
      // Iconic BTD6 ceramic rush rounds!
      waves.push({ type: 'ceramic', count: 40, spacing: 0.07, delay: 0, regrow: round === 76 });
      waves.push({ type: 'ceramic', count: 40, spacing: 0.07, delay: 3.5, camo: round === 78 });
    } else {
      waves.push({ type: 'ceramic', count: 18 + scale, spacing: 0.13, delay: 0, fortified: true });
      waves.push({ type: 'moab', count: 3 + Math.floor(scale / 3), spacing: 0.85, delay: 1.6, fortified: round >= 70 });
      waves.push({ type: 'bfb', count: 1 + Math.floor(scale / 6), spacing: 1.8, delay: 3.6 });
    }
  } else if (round === 80) {
    waves.push({ type: 'zomg', count: 1, spacing: 2.0, delay: 0 });
    waves.push({ type: 'bfb', count: 2, spacing: 1.4, delay: 3.0, fortified: true });
    if (isPvE) {
      waves.push({ type: 'boss_vortex', count: 1, spacing: 1.5, delay: 4.5 });
    }
  } else if (round < 100) {
    const scale = round - 80;
    waves.push({ type: 'bfb', count: 2 + Math.floor(scale / 4), spacing: 1.1, delay: 0, fortified: round >= 88 });
    waves.push({ type: 'zomg', count: 1 + Math.floor(scale / 6), spacing: 2.0, delay: 2.2 });
    if (round >= 90) {
      waves.push({ type: 'ddt', count: 3 + Math.floor((round - 90) * 0.7), spacing: 0.5, delay: 3.8, fortified: round >= 95 });
    }
  } else if (round === 100) {
    waves.push({ type: 'bad', count: 1, spacing: 2.4, delay: 0, fortified: false });
    waves.push({ type: 'ddt', count: 4, spacing: 0.5, delay: 3.5, fortified: true });
    if (isPvE) {
      waves.push({ type: 'boss_dreadbloon', count: 1, spacing: 2.0, delay: 5.0 });
    }
  } else {
    // Endless Freeplay Mode (Round 101+)
    const freeplayScale = round - 100;
    waves.push({
      type: 'ddt',
      count: 4 + Math.floor(freeplayScale * 0.8),
      spacing: Math.max(0.25, 0.6 - freeplayScale * 0.01),
      delay: 0,
      fortified: true,
    });
    waves.push({
      type: 'zomg',
      count: 2 + Math.floor(freeplayScale * 0.5),
      spacing: 1.5,
      delay: 3,
      fortified: true,
    });
    waves.push({
      type: 'bad',
      count: 1 + Math.floor(freeplayScale / 4),
      spacing: 2.8,
      delay: 6,
      fortified: freeplayScale >= 10,
    });
    if (round % 20 === 0) {
      const bosses: BloonType[] = ['boss_bloonarius', 'boss_lych', 'boss_vortex', 'boss_dreadbloon'];
      const bossChoice = bosses[Math.floor(round / 20) % bosses.length];
      waves.push({
        type: bossChoice,
        count: 1,
        spacing: 3.0,
        delay: 8,
        fortified: true,
      });
    }
  }

  return waves;
}
