export type BloonType =
  | 'red'
  | 'blue'
  | 'green'
  | 'yellow'
  | 'pink'
  | 'black'
  | 'white'
  | 'purple'
  | 'zebra'
  | 'lead'
  | 'rainbow'
  | 'ceramic'
  | 'moab'
  | 'bfb'
  | 'zomg'
  | 'ddt'
  | 'bad'
  | 'boss_bloonarius'
  | 'boss_lych'
  | 'boss_vortex'
  | 'boss_dreadbloon';

export type DamageType =
  | 'sharp'
  | 'explosive'
  | 'energy'
  | 'plasma'
  | 'fire'
  | 'cold'
  | 'acid'
  | 'normal';

export type TargetPriority = 'first' | 'last' | 'close' | 'strong';

export type MapCategory = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export type EnvironmentalEffectType =
  | 'none'
  | 'lunar_gravity'       // +15% tower range pulse
  | 'volcanic_ash'        // Periodic fire burst scorches track bloons
  | 'glacial_chill'       // Bloons move 12% slower on ice bends, towers slightly chilled
  | 'enchanted_spores'    // Magic & Hero towers attack 15% faster
  | 'sandstorm_gust'      // Desert gusts periodically push standard bloons back
  | 'toxic_acid_vat'      // Acid pool strips Camo/Regrow in center zone
  | 'high_voltage_grid';  // Military & Support towers gain +2 pierce

export interface Point {
  x: number; // Normalized 0..800 canvas coordinate
  y: number; // Normalized 0..520 canvas coordinate
}

export interface MapObstacle {
  id: string;
  x: number;
  y: number;
  radius: number;
  kind: 'rock' | 'ruin' | 'tree' | 'crater' | 'wall';
  blocksSight: boolean;
  removableCost?: number;
}

export interface WaterZone {
  id: string;
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation?: number;
}

export interface GameMap {
  id: string;
  name: string;
  mode: 'pve' | 'pvp' | 'custom';
  category: MapCategory;
  description: string;
  theme: {
    groundColor: string;
    groundAccent: string;
    trackColor: string;
    trackBorder: string;
    waterColor: string;
    foliageColor: string;
  };
  paths: Point[][]; // Supports single or multiple tracks!
  waterZones: WaterZone[];
  obstacles: MapObstacle[];
  environmentalEffect: {
    type: EnvironmentalEffectType;
    name: string;
    description: string;
  };
  author?: string;
}

export interface BloonSpec {
  type: BloonType;
  name: string;
  hp: number; // Layer HP (1 for standard bloons, 10 for ceramic, 200+ for MOABs/Bosses)
  speed: number; // Relative to Red Bloon = 1.0
  rbe: number; // Red Bloon Equivalent damage to lives if leaked
  cashReward: number;
  children: Array<{ type: BloonType; count: number }>;
  color: string;
  accentColor?: string;
  radius: number;
  isMoabClass: boolean;
  isBoss?: boolean;
  bossSkulls?: number;
  immunities: DamageType[];
  innateCamo?: boolean;
}

export interface ActiveBloon {
  id: string;
  type: BloonType;
  baseType: BloonType; // Used for Regrow ceiling
  hp: number;
  maxHp: number;
  pathIndex: number;
  distance: number; // Distance along path in pixels
  x: number;
  y: number;
  angle: number;
  camo: boolean;
  regrow: boolean;
  fortified: boolean;
  regrowTimer: number;
  slowTimer: number;
  slowFactor: number;
  freezeTimer: number;
  glueTimer: number;
  burnTimer: number;
  skullsTriggered: number;
}

export interface UpgradeTierSpec {
  name: string;
  cost: number;
  description: string;
  damageBonus?: number;
  rangeBonus?: number;
  fireRateMultiplier?: number; // e.g., 0.8 = 20% faster cooldown
  pierceBonus?: number;
  projectilesBonus?: number;
  grantsCamo?: boolean;
  damageTypeOverride?: DamageType;
  moabDamageBonus?: number;
  incomeBonus?: number;
  splashRadius?: number;
  slowAmount?: number;
  stripCamoRegrow?: boolean;
  abilityName?: string;
  abilityCooldown?: number;
  abilityDescription?: string;
}

export interface TowerSpec {
  id: string;
  name: string;
  category: 'Hero' | 'Primary' | 'Military' | 'Magic' | 'Support';
  cost: number;
  range: number;
  fireCooldown: number; // Seconds between shots
  damage: number;
  pierce: number;
  projectileSpeed: number;
  projectilesCount: number;
  spreadAngle: number;
  damageType: DamageType;
  canDetectCamo: boolean;
  waterOnly: boolean;
  isPlatform?: boolean; // e.g. Pontoon allows land towers on water
  footprintRadius: number;
  incomePerRound?: number;
  continuousIncomePerSec?: number;
  spawnsTrackSpikes?: boolean;
  buffAura?: {
    rangeMultiplier: number;
    attackSpeedMultiplier: number;
    grantsCamo: boolean;
  };
  color: string;
  secondaryColor: string;
  description: string;
  upgrades: [
    [UpgradeTierSpec, UpgradeTierSpec, UpgradeTierSpec, UpgradeTierSpec, UpgradeTierSpec],
    [UpgradeTierSpec, UpgradeTierSpec, UpgradeTierSpec, UpgradeTierSpec, UpgradeTierSpec],
    [UpgradeTierSpec, UpgradeTierSpec, UpgradeTierSpec, UpgradeTierSpec, UpgradeTierSpec]
  ];
}

export interface PlacedTower {
  id: string;
  specId: string;
  x: number;
  y: number;
  angle: number;
  tiers: [number, number, number]; // e.g., [4, 2, 0]
  targetPriority: TargetPriority;
  totalSpent: number;
  pops: number;
  cashGenerated: number;
  cooldownTimer: number;
  abilityCooldownTimer: number;
}

export interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  moabDamageBonus: number;
  pierce: number;
  damageType: DamageType;
  canHitCamo: boolean;
  splashRadius: number;
  slowAmount: number;
  stripCamoRegrow: boolean;
  color: string;
  radius: number;
  hitBloonIds: Set<string>;
  sourceTowerId: string;
  life: number;
  isRoadSpike?: boolean;
}

export interface VisualEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  text?: string;
  life: number;
  maxLife: number;
  kind: 'pop' | 'explosion' | 'cash' | 'pulse' | 'laser';
  targetX?: number;
  targetY?: number;
}

export interface PvPBloonSendSpec {
  id: string;
  bloonType: BloonType;
  name: string;
  cost: number;
  ecoChange: number; // Positive for standard eco sends, negative for late MOAB rushes
  count: number;
  spacing: number;
  unlockRound: number;
  isGrouped: boolean;
}

export type CampaignDifficulty =
  | 'Easy'
  | 'Medium'
  | 'Hard'
  | 'Impossible'
  | 'Endless'
  | 'Sandbox';

export interface SaveFileState {
  version: string;
  savedAt: string;
  playerName: string;
  completedMaps: Record<string, CampaignDifficulty[]>; // mapId -> difficulties beaten
  customMaps: GameMap[];
  activePvERun: {
    mapId: string;
    customMap?: GameMap;
    difficulty: CampaignDifficulty;
    isSandbox: boolean;
    isEndless: boolean;
    round: number;
    maxRound: number;
    cash: number;
    lives: number;
    manaShield: number;
    towers: PlacedTower[];
    removedObstacleIds: string[];
  } | null;
}
