import React from 'react';
import {
  ActiveBloon,
  BloonType,
  DamageType,
  GameMap,
  PlacedTower,
  Point,
  Projectile,
  VisualEffect,
} from '../types/game';
import { BLOON_SPECS } from '../data/bloons';
import { TOWER_SPEC_MAP } from '../data/towers';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 520;

/**
 * Converts a mouse click/move event on a <canvas> into logical 800x520 coordinates
 * using uniform 1:1 aspect-preserving scaling (zero map stretching on any display).
 */
export function clientToLogicalCoords(e: React.MouseEvent<HTMLCanvasElement>): Point {
  const rect = e.currentTarget.getBoundingClientRect();
  const safeW = Math.max(1, rect.width);
  const safeH = Math.max(1, rect.height);
  const scale = Math.min(safeW / CANVAS_WIDTH, safeH / CANVAS_HEIGHT);
  const offsetX = (safeW - CANVAS_WIDTH * scale) * 0.5;
  const offsetY = (safeH - CANVAS_HEIGHT * scale) * 0.5;
  return {
    x: (e.clientX - rect.left - offsetX) / scale,
    y: (e.clientY - rect.top - offsetY) / scale,
  };
}

export interface ComputedTowerStats {
  range: number;
  fireCooldown: number;
  damage: number;
  moabDamageBonus: number;
  pierce: number;
  projectilesCount: number;
  projectileSpeed: number;
  spreadAngle: number;
  damageType: DamageType;
  canDetectCamo: boolean;
  splashRadius: number;
  slowAmount: number;
  stripCamoRegrow: boolean;
  incomePerRound: number;
  abilityName?: string;
  abilityCooldown?: number;
  abilityDescription?: string;
}

export function getPathLength(path: Point[]): number {
  let len = 0;
  for (let i = 0; i < path.length - 1; i++) {
    len += Math.hypot(path[i + 1].x - path[i].x, path[i + 1].y - path[i].y);
  }
  return len;
}

export function getPointAlongPath(
  path: Point[],
  distance: number
): { x: number; y: number; angle: number; completed: boolean } {
  if (path.length === 0) return { x: 0, y: 0, angle: 0, completed: true };
  if (distance <= 0) {
    const angle =
      path.length > 1 ? Math.atan2(path[1].y - path[0].y, path[1].x - path[0].x) : 0;
    return { x: path[0].x, y: path[0].y, angle, completed: false };
  }

  let walked = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const p1 = path[i];
    const p2 = path[i + 1];
    const segLen = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (walked + segLen >= distance) {
      const t = segLen > 0 ? (distance - walked) / segLen : 0;
      const x = p1.x + (p2.x - p1.x) * t;
      const y = p1.y + (p2.y - p1.y) * t;
      const angle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
      return { x, y, angle, completed: false };
    }
    walked += segLen;
  }

  const last = path[path.length - 1];
  const prev = path.length > 1 ? path[path.length - 2] : last;
  return {
    x: last.x,
    y: last.y,
    angle: Math.atan2(last.y - prev.y, last.x - prev.x),
    completed: true,
  };
}

export function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

export function isPointInWater(x: number, y: number, map: GameMap): boolean {
  for (const wz of map.waterZones) {
    const nx = (x - wz.x) / wz.rx;
    const ny = (y - wz.y) / wz.ry;
    if (nx * nx + ny * ny <= 1.0) return true;
  }
  return false;
}

export function isPointOnPontoon(x: number, y: number, towers: PlacedTower[]): boolean {
  for (const t of towers) {
    const spec = TOWER_SPEC_MAP[t.specId];
    if (spec?.isPlatform) {
      const dist = Math.hypot(x - t.x, y - t.y);
      if (dist <= spec.footprintRadius + 8) return true;
    }
  }
  return false;
}

export function canPlaceTowerAt(
  specId: string,
  x: number,
  y: number,
  map: GameMap,
  existingTowers: PlacedTower[],
  removedObstacleIds: string[] = []
): { valid: boolean; reason?: string } {
  const spec = TOWER_SPEC_MAP[specId];
  if (!spec) return { valid: false, reason: 'Unknown tower' };

  if (x < 22 || x > CANVAS_WIDTH - 22 || y < 22 || y > CANVAS_HEIGHT - 22) {
    return { valid: false, reason: 'Out of map bounds' };
  }

  for (const obs of map.obstacles) {
    if (removedObstacleIds.includes(obs.id)) continue;
    const dist = Math.hypot(x - obs.x, y - obs.y);
    if (dist < obs.radius + spec.footprintRadius - 4) {
      return { valid: false, reason: 'Blocked by obstacle' };
    }
  }

  for (const path of map.paths) {
    for (let i = 0; i < path.length - 1; i++) {
      const dist = distanceToSegment(x, y, path[i].x, path[i].y, path[i + 1].x, path[i + 1].y);
      if (dist < 22 + spec.footprintRadius * 0.55) {
        return { valid: false, reason: 'Cannot place directly on Bloon track' };
      }
    }
  }

  const inWater = isPointInWater(x, y, map);
  const onPontoon = isPointOnPontoon(x, y, existingTowers);

  if (spec.waterOnly) {
    if (!inWater) {
      return { valid: false, reason: 'Must be placed in Water' };
    }
  } else {
    if (inWater && !onPontoon) {
      return { valid: false, reason: 'Requires Land or a Portable Pontoon on water' };
    }
  }

  for (const other of existingTowers) {
    const otherSpec = TOWER_SPEC_MAP[other.specId];
    if (!otherSpec) continue;
    if (otherSpec.isPlatform && !spec.isPlatform && !spec.waterOnly) {
      continue;
    }
    const dist = Math.hypot(x - other.x, y - other.y);
    if (dist < spec.footprintRadius + otherSpec.footprintRadius - 5) {
      return { valid: false, reason: 'Too close to another tower' };
    }
  }

  return { valid: true };
}

export function hasLineOfSight(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  map: GameMap,
  removedObstacleIds: string[],
  ignoresObstacles: boolean
): boolean {
  if (ignoresObstacles || map.obstacles.length === 0) return true;
  for (let i = 0; i < map.obstacles.length; i++) {
    const obs = map.obstacles[i];
    if (!obs.blocksSight) continue;
    if (removedObstacleIds.length > 0 && removedObstacleIds.includes(obs.id)) continue;
    const dist = distanceToSegment(obs.x, obs.y, x1, y1, x2, y2);
    if (dist < obs.radius * 0.78) {
      return false;
    }
  }
  return true;
}

export function computeTowerStats(
  tower: PlacedTower,
  allTowers: PlacedTower[],
  map: GameMap,
  globalBuffActive: boolean = false
): ComputedTowerStats {
  const spec = TOWER_SPEC_MAP[tower.specId];
  if (!spec) {
    return {
      range: 100,
      fireCooldown: 1,
      damage: 1,
      moabDamageBonus: 0,
      pierce: 1,
      projectilesCount: 1,
      projectileSpeed: 400,
      spreadAngle: 0.1,
      damageType: 'sharp',
      canDetectCamo: false,
      splashRadius: 0,
      slowAmount: 0,
      stripCamoRegrow: false,
      incomePerRound: 0,
    };
  }

  let range = spec.range;
  let fireCooldown = spec.fireCooldown;
  let damage = spec.damage;
  let moabDamageBonus = 0;
  let pierce = spec.pierce;
  let projectilesCount = spec.projectilesCount;
  let damageType: DamageType = spec.damageType;
  let canDetectCamo = spec.canDetectCamo;
  let splashRadius = 0;
  let slowAmount = 0;
  let stripCamoRegrow = false;
  let incomePerRound = spec.incomePerRound || 0;
  let abilityName: string | undefined;
  let abilityCooldown: number | undefined;
  let abilityDescription: string | undefined;

  for (let pathIdx = 0; pathIdx < 3; pathIdx++) {
    const tierCount = tower.tiers[pathIdx];
    for (let t = 0; t < tierCount; t++) {
      const upg = spec.upgrades[pathIdx][t];
      if (!upg) continue;
      if (upg.rangeBonus) range += upg.rangeBonus;
      if (upg.fireRateMultiplier) fireCooldown *= upg.fireRateMultiplier;
      if (upg.damageBonus) damage += upg.damageBonus;
      if (upg.moabDamageBonus) moabDamageBonus += upg.moabDamageBonus;
      if (upg.pierceBonus) pierce += upg.pierceBonus;
      if (upg.projectilesBonus) projectilesCount += upg.projectilesBonus;
      if (upg.damageTypeOverride) damageType = upg.damageTypeOverride;
      if (upg.grantsCamo) canDetectCamo = true;
      if (upg.splashRadius && upg.splashRadius > splashRadius) splashRadius = upg.splashRadius;
      if (upg.slowAmount && upg.slowAmount > slowAmount) slowAmount = upg.slowAmount;
      if (upg.stripCamoRegrow) stripCamoRegrow = true;
      if (upg.incomeBonus) incomePerRound += upg.incomeBonus;
      if (upg.abilityName) {
        abilityName = upg.abilityName;
        abilityCooldown = upg.abilityCooldown || 25;
        abilityDescription = upg.abilityDescription;
      }
    }
  }

  if (map.environmentalEffect.type === 'lunar_gravity') {
    range *= 1.15;
  } else if (
    map.environmentalEffect.type === 'enchanted_spores' &&
    (spec.category === 'Magic' || spec.category === 'Hero')
  ) {
    fireCooldown *= 0.85;
  } else if (
    map.environmentalEffect.type === 'high_voltage_grid' &&
    (spec.category === 'Military' || spec.category === 'Support')
  ) {
    pierce += 2;
  }

  for (let i = 0; i < allTowers.length; i++) {
    const other = allTowers[i];
    if (other.id === tower.id) continue;
    const otherSpec = TOWER_SPEC_MAP[other.specId];
    if (!otherSpec) continue;

    if (otherSpec.buffAura) {
      const villageRange =
        otherSpec.range + (other.tiers[0] >= 1 ? 28 : 0) + (other.tiers[0] >= 3 ? 20 : 0);
      const dist = Math.hypot(tower.x - other.x, tower.y - other.y);
      if (dist <= villageRange) {
        range *= otherSpec.buffAura.rangeMultiplier;
        fireCooldown /= otherSpec.buffAura.attackSpeedMultiplier;
        if (other.tiers[0] >= 2) fireCooldown *= 0.85;
        if (other.tiers[1] >= 2) canDetectCamo = true;
        if (other.tiers[1] >= 3) damageType = 'normal';
      }
    } else if (otherSpec.isPlatform && other.tiers[0] >= 3) {
      const dist = Math.hypot(tower.x - other.x, tower.y - other.y);
      if (dist <= otherSpec.footprintRadius + 20) {
        canDetectCamo = true;
      }
    }
  }

  if (globalBuffActive) {
    fireCooldown *= 0.6;
  }

  return {
    range,
    fireCooldown: Math.max(0.04, fireCooldown),
    damage,
    moabDamageBonus,
    pierce,
    projectilesCount,
    projectileSpeed: spec.projectileSpeed,
    spreadAngle: spec.spreadAngle,
    damageType,
    canDetectCamo,
    splashRadius,
    slowAmount,
    stripCamoRegrow,
    incomePerRound,
    abilityName,
    abilityCooldown,
    abilityDescription,
  };
}

let bloonIdSeq = 1;

export function createActiveBloon(
  type: BloonType,
  pathIndex: number,
  distance: number,
  map: GameMap,
  options?: { camo?: boolean; regrow?: boolean; fortified?: boolean; roundScale?: number }
): ActiveBloon {
  const spec = BLOON_SPECS[type];
  const path = map.paths[pathIndex % map.paths.length] || map.paths[0];
  const pos = getPointAlongPath(path, distance);

  const isFortified = Boolean(options?.fortified);
  const roundScale = options?.roundScale || 1;
  const fortMult =
    isFortified && (spec.isMoabClass || type === 'ceramic' || type === 'lead') ? 2.0 : 1.0;
  const maxHp = Math.max(1, Math.round(spec.hp * fortMult * (spec.isMoabClass ? roundScale : 1)));

  return {
    id: `b_${++bloonIdSeq}`,
    type,
    baseType: type,
    hp: maxHp,
    maxHp,
    pathIndex: pathIndex % map.paths.length,
    distance,
    x: pos.x,
    y: pos.y,
    angle: pos.angle,
    camo: Boolean(options?.camo || spec.innateCamo),
    regrow: Boolean(options?.regrow),
    fortified: isFortified,
    regrowTimer: 0,
    slowTimer: 0,
    slowFactor: 1,
    freezeTimer: 0,
    glueTimer: 0,
    burnTimer: 0,
    skullsTriggered: 0,
  };
}

// Offscreen Background Cache per canvas to make 60fps rendering ultra-fast even with 1,000+ bloons!
const bgCacheMap = new WeakMap<
  HTMLCanvasElement,
  { key: string; offscreen: HTMLCanvasElement }
>();

function getVisualExtendedPath(path: Point[]): Point[] {
  if (path.length < 2) return path;
  const pts = path.map((p) => ({ x: p.x, y: p.y }));

  // Extend start point if near map edge so road reaches any wider/taller display border seamlessly
  const p0 = pts[0];
  const p1 = pts[1];
  if (
    p0.x <= 18 ||
    p0.x >= CANVAS_WIDTH - 18 ||
    p0.y <= 18 ||
    p0.y >= CANVAS_HEIGHT - 18
  ) {
    const dx = p0.x - p1.x;
    const dy = p0.y - p1.y;
    const len = Math.hypot(dx, dy) || 1;
    pts[0] = {
      x: p0.x + (dx / len) * 650,
      y: p0.y + (dy / len) * 650,
    };
  }

  // Extend end point if near map edge
  const lastIdx = pts.length - 1;
  const pLast = pts[lastIdx];
  const pPrev = pts[lastIdx - 1];
  if (
    pLast.x <= 18 ||
    pLast.x >= CANVAS_WIDTH - 18 ||
    pLast.y <= 18 ||
    pLast.y >= CANVAS_HEIGHT - 18
  ) {
    const dx = pLast.x - pPrev.x;
    const dy = pLast.y - pPrev.y;
    const len = Math.hypot(dx, dy) || 1;
    pts[lastIdx] = {
      x: pLast.x + (dx / len) * 650,
      y: pLast.y + (dy / len) * 650,
    };
  }

  return pts;
}

function getOrBuildBackgroundCache(
  targetCanvas: HTMLCanvasElement,
  map: GameMap,
  physW: number,
  physH: number,
  dpr: number,
  scale: number,
  offsetX: number,
  offsetY: number
): HTMLCanvasElement {
  const cacheKey = `${map.id}_${physW}x${physH}`;
  const existing = bgCacheMap.get(targetCanvas);
  if (existing && existing.key === cacheKey) {
    return existing.offscreen;
  }

  const offscreen = document.createElement('canvas');
  offscreen.width = physW;
  offscreen.height = physH;
  const ctx = offscreen.getContext('2d')!;
  ctx.save();
  ctx.scale(dpr, dpr);

  const cssW = physW / dpr;
  const cssH = physH / dpr;

  // 1. Fill full viewport canvas with map ground color (zero black bars)
  ctx.fillStyle = map.theme.groundColor;
  ctx.fillRect(0, 0, cssW, cssH);

  // Enter uniform 1:1 logical world space (800x520 centered, zero stretching!)
  ctx.save();
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  const minWorldX = -offsetX / scale;
  const maxWorldX = CANVAS_WIDTH + offsetX / scale;
  const minWorldY = -offsetY / scale;
  const maxWorldY = CANVAS_HEIGHT + offsetY / scale;

  // Ground accent patches across full visible logical bounds
  ctx.fillStyle = map.theme.groundAccent;
  for (let i = 0; i < 24; i++) {
    const gx = minWorldX + ((i * 197 + 65) % Math.max(800, maxWorldX - minWorldX));
    const gy = minWorldY + ((i * 139 + 45) % Math.max(520, maxWorldY - minWorldY));
    const r1 = 46 + (i % 3) * 16;
    const r2 = 28 + (i % 2) * 14;
    ctx.beginPath();
    ctx.ellipse(gx, gy, r1, r2, (i * 0.5) % Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  // 1b. Iconic BTD6 / Battles 2 Map-Specific Ground Landmarks (Underneath Water & Tracks)
  if (map.id === 'pve_lotus_lagoon') {
    // CUBISM: Vibrant geometric stained-glass color triangles
    const cubismPolys: Array<{ color: string; pts: Array<[number, number]> }> = [
      { color: '#facc15', pts: [[-120, -80], [340, -80], [180, 260], [-120, 180]] },
      { color: '#ec4899', pts: [[340, -80], [920, -80], [560, 240], [180, 260]] },
      { color: '#8b5cf6', pts: [[-120, 180], [260, 230], [160, 600], [-120, 600]] },
      { color: '#14b8a6', pts: [[260, 230], [580, 210], [450, 600], [160, 600]] },
      { color: '#f97316', pts: [[580, 210], [920, -80], [920, 600], [450, 600]] },
    ];
    for (const poly of cubismPolys) {
      ctx.fillStyle = poly.color;
      ctx.beginPath();
      ctx.moveTo(poly.pts[0][0], poly.pts[0][1]);
      for (let k = 1; k < poly.pts.length; k++) {
        ctx.lineTo(poly.pts[k][0], poly.pts[k][1]);
      }
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'rgba(15, 23, 42, 0.28)';
      ctx.stroke();
    }
  } else if (map.id === 'pve_lunar_craters') {
    // MOON LANDING: Three massive circular lunar craters where the track loops inside!
    const craters = [
      { x: 215, y: 165, r: 92 },
      { x: 412, y: 375, r: 92 },
      { x: 605, y: 168, r: 92 },
    ];
    for (const cr of craters) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(cr.x, cr.y, cr.r + 16, 0, Math.PI * 2);
      ctx.fillStyle = '#475569';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cr.x, cr.y, cr.r, 0, Math.PI * 2);
      ctx.fillStyle = '#64748b';
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = '#334155';
      ctx.stroke();
      ctx.restore();
    }
  } else if (map.id === 'pve_volcanic_caldera') {
    // INFERNAL: Glowing lava lake surround with dark basalt islands
    const lavaGrad = ctx.createRadialGradient(400, 260, 40, 400, 260, 500);
    lavaGrad.addColorStop(0, '#ea580c');
    lavaGrad.addColorStop(0.55, '#991b1b');
    lavaGrad.addColorStop(1, '#2a1210');
    ctx.fillStyle = lavaGrad;
    ctx.fillRect(minWorldX, minWorldY, maxWorldX - minWorldX, maxWorldY - minWorldY);

    // Central & flank basalt islands for tower placement
    const islands = [
      { x: 400, y: 260, rx: 68, ry: 44 },
      { x: 135, y: 260, rx: 64, ry: 48 },
      { x: 665, y: 260, rx: 64, ry: 48 },
    ];
    for (const isl of islands) {
      ctx.beginPath();
      ctx.ellipse(isl.x, isl.y, isl.rx, isl.ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#292524';
      ctx.fill();
      ctx.lineWidth = 4;
      ctx.strokeStyle = '#f97316';
      ctx.stroke();
    }
  } else if (map.id === 'pve_cyber_grid') {
    // OFF THE COAST: Diagonal sandy beach shoreline on the left, ocean surf on the right
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.moveTo(520, minWorldY);
    ctx.lineTo(maxWorldX, minWorldY);
    ctx.lineTo(maxWorldX, maxWorldY);
    ctx.lineTo(350, maxWorldY);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(224, 242, 254, 0.65)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(520, minWorldY);
    ctx.lineTo(350, maxWorldY);
    ctx.stroke();
  } else if (map.id === 'pvp_docks_bay') {
    // DOCKS: Horizontal wooden deck plank lines across the shipyard pier
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
    ctx.lineWidth = 2;
    for (let py = 0; py <= 520; py += 22) {
      ctx.beginPath();
      ctx.moveTo(minWorldX, py);
      ctx.lineTo(maxWorldX, py);
      ctx.stroke();
    }
  }

  // Grass tufts & wildflowers across full visible logical bounds
  if (map.id !== 'pve_lotus_lagoon' && map.id !== 'pve_volcanic_caldera') {
    for (let i = 0; i < 36; i++) {
      const tx = minWorldX + 20 + ((i * 113 + 43) % Math.max(760, maxWorldX - minWorldX - 40));
      const ty = minWorldY + 20 + ((i * 151 + 29) % Math.max(480, maxWorldY - minWorldY - 40));
      ctx.strokeStyle = 'rgba(255,255,255,0.13)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - 3, ty - 6);
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx + 3, ty - 5);
      ctx.stroke();

      if (i % 4 === 0) {
        ctx.fillStyle = i % 8 === 0 ? '#fde047' : '#f8fafc';
        ctx.beginPath();
        ctx.arc(tx, ty - 7, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // 2. Water Zones (1:1 uniform aspect ratio — never stretched!)
  for (const wz of map.waterZones) {
    ctx.save();
    ctx.translate(wz.x, wz.y);
    if (wz.rotation) ctx.rotate(wz.rotation);

    const rx = wz.rx;
    const ry = wz.ry;

    ctx.beginPath();
    ctx.ellipse(0, 3, rx + 9, ry + 9, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.fill();

    ctx.beginPath();
    ctx.ellipse(0, 0, rx + 7, ry + 7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#d4b483';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#9c7a4c';
    ctx.stroke();

    const wGrad = ctx.createRadialGradient(-rx * 0.2, -ry * 0.2, 6, 0, 0, Math.max(rx, ry));
    wGrad.addColorStop(0, '#38bdf8');
    wGrad.addColorStop(0.7, map.theme.waterColor);
    wGrad.addColorStop(1, '#0369a1');

    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fillStyle = wGrad;
    ctx.fill();

    ctx.lineWidth = 2.8;
    ctx.strokeStyle = 'rgba(224, 242, 254, 0.55)';
    ctx.stroke();

    // Lilypad
    ctx.fillStyle = '#22c55e';
    ctx.beginPath();
    ctx.arc(-rx * 0.42, -ry * 0.25, 7, 0.2, Math.PI * 1.85);
    ctx.lineTo(-rx * 0.42, -ry * 0.25);
    ctx.fill();
    ctx.restore();
  }

  // 3. Bloon Tracks (1:1 uniform aspect ratio + extended to outer screen edges)
  for (const path of map.paths) {
    if (path.length < 2) continue;
    const drawPts = getVisualExtendedPath(path);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(drawPts[0].x, drawPts[0].y + 3);
    for (let i = 1; i < drawPts.length; i++) {
      ctx.lineTo(drawPts[i].x, drawPts[i].y + 3);
    }
    ctx.lineWidth = 46;
    ctx.strokeStyle = 'rgba(0,0,0,0.32)';
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(drawPts[0].x, drawPts[0].y);
    for (let i = 1; i < drawPts.length; i++) {
      ctx.lineTo(drawPts[i].x, drawPts[i].y);
    }
    ctx.lineWidth = 43;
    ctx.strokeStyle = map.theme.trackBorder;
    ctx.stroke();

    ctx.lineWidth = 34;
    ctx.strokeStyle = map.theme.trackColor;
    ctx.stroke();

    ctx.lineWidth = 20;
    ctx.strokeStyle = 'rgba(0,0,0,0.08)';
    ctx.stroke();

    // Stepping stones or highway dashes (#Ouch) along the playable path
    const totalLen = getPathLength(path);
    for (let d = 22; d < totalLen - 16; d += 32) {
      const pt = getPointAlongPath(path, d);
      ctx.save();
      ctx.translate(pt.x, pt.y);
      ctx.rotate(pt.angle);
      if (map.id === 'pve_bloody_puddles_x') {
        // #OUCH: Yellow street center-line road dashes
        ctx.fillStyle = '#facc15';
        ctx.fillRect(-7, -1.8, 14, 3.6);
      } else {
        ctx.fillStyle = 'rgba(255,255,255,0.14)';
        ctx.beginPath();
        ctx.ellipse(0, -5, 4.5, 2.8, 0, 0, Math.PI * 2);
        ctx.ellipse(3.5, 5, 4, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }

    // Entrance Chevron
    const startInfo = getPointAlongPath(path, 18);
    ctx.save();
    ctx.translate(startInfo.x, startInfo.y);
    ctx.rotate(startInfo.angle);
    ctx.fillStyle = '#4ade80';
    ctx.strokeStyle = '#052e16';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(9, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // 3b. Over-Track Landmarks (Logs hollow log bridges, Dark Castle moat bridge & gate)
  if (map.id === 'pve_timber_loop') {
    // LOGS: Iconic brown hollow logs spanning over the track intersections
    const logBridges = [
      { x: 200, y: 165, w: 54, h: 28, rot: 0 },
      { x: 600, y: 165, w: 54, h: 28, rot: 0 },
      { x: 200, y: 345, w: 54, h: 28, rot: 0 },
      { x: 600, y: 345, w: 54, h: 28, rot: 0 },
      { x: 400, y: 75, w: 28, h: 54, rot: 0 },
      { x: 400, y: 165, w: 28, h: 54, rot: 0 },
    ];
    for (const lg of logBridges) {
      ctx.save();
      ctx.translate(lg.x, lg.y);
      ctx.fillStyle = '#5c3412';
      ctx.strokeStyle = '#291505';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-lg.w / 2, -lg.h / 2, lg.w, lg.h, 6);
      ctx.fill();
      ctx.stroke();
      // Wood bark grain lines
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-lg.w * 0.35, 0);
      ctx.lineTo(lg.w * 0.35, 0);
      ctx.stroke();
      ctx.restore();
    }
  } else if (map.id === 'pve_dark_citadel') {
    // DARK CASTLE: Stone bridge railings over the moat & right-side Castle Gatehouse
    ctx.save();
    ctx.fillStyle = '#475569';
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    // Bridge parapets across moat (x=490..620)
    ctx.fillRect(495, 226, 120, 10);
    ctx.strokeRect(495, 226, 120, 10);
    ctx.fillRect(495, 284, 120, 10);
    ctx.strokeRect(495, 284, 120, 10);
    // Castle wall & portcullis arch on right edge
    ctx.fillStyle = '#334155';
    ctx.fillRect(745, 40, 55, 440);
    ctx.strokeRect(745, 40, 55, 440);
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(765, 260, 28, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // 4. Outer Canopy Border along top/bottom/sides of the viewport
  ctx.fillStyle = map.theme.foliageColor;
  for (let x = minWorldX; x <= maxWorldX + 40; x += 40) {
    ctx.beginPath();
    ctx.arc(x, minWorldY + 3, 17, 0, Math.PI * 2);
    ctx.arc(x, maxWorldY - 3, 17, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore(); // exit world transform
  ctx.restore(); // exit dpr transform
  bgCacheMap.set(targetCanvas, { key: cacheKey, offscreen });
  return offscreen;
}

/**
 * High-FPS 2D Canvas Renderer:
 * Uses uniform 1:1 aspect-ratio scaling (`scale = Math.min(cssW / 800, cssH / 520)`)
 * with centered camera offsets (`offsetX, offsetY`) so the map, tracks, ponds,
 * towers, and bloons NEVER stretch when the display changes!
 */
export function renderGameScene(
  ctx: CanvasRenderingContext2D,
  map: GameMap,
  towers: PlacedTower[],
  bloons: ActiveBloon[],
  projectiles: Projectile[],
  effects: VisualEffect[],
  options: {
    selectedTowerId?: string | null;
    placingTowerSpecId?: string | null;
    hoverPoint?: Point | null;
    removedObstacleIds?: string[];
    timeSec: number;
    isThumbnail?: boolean;
  }
) {
  const canvas = ctx.canvas;
  const dpr =
    !options.isThumbnail && typeof window !== 'undefined'
      ? Math.min(2, window.devicePixelRatio || 1)
      : 1;
  const rect = !options.isThumbnail ? canvas.getBoundingClientRect() : null;

  if (rect && rect.width > 0 && rect.height > 0) {
    const targetW = Math.round(rect.width * dpr);
    const targetH = Math.round(rect.height * dpr);
    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }
  }

  const cssW = rect && rect.width > 0 ? rect.width : CANVAS_WIDTH;
  const cssH = rect && rect.height > 0 ? rect.height : CANVAS_HEIGHT;

  // Uniform 1:1 scale so the map NEVER stretches as the display changes!
  const scale = Math.min(cssW / CANVAS_WIDTH, cssH / CANVAS_HEIGHT);
  const offsetX = (cssW - CANVAS_WIDTH * scale) * 0.5;
  const offsetY = (cssH - CANVAS_HEIGHT * scale) * 0.5;

  const removedObstacleIds = options.removedObstacleIds || [];

  // 1. Blit Cached Static Map Layer (1 drawImage call!)
  const bgCache = getOrBuildBackgroundCache(
    canvas,
    map,
    canvas.width,
    canvas.height,
    dpr,
    scale,
    offsetX,
    offsetY
  );
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(bgCache, 0, 0);

  // Apply uniform 1:1 world transform for all dynamic elements
  ctx.scale(dpr, dpr);
  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Animated water ripple ring
  const pulse = (Math.sin(options.timeSec * 2.0) + 1) * 0.5;
  for (let i = 0; i < map.waterZones.length; i++) {
    const wz = map.waterZones[i];
    ctx.beginPath();
    ctx.ellipse(
      wz.x,
      wz.y,
      wz.rx * (0.4 + pulse * 0.3),
      wz.ry * (0.4 + pulse * 0.3),
      0,
      0,
      Math.PI * 2
    );
    ctx.strokeStyle = 'rgba(255,255,255,0.24)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  // 2. Obstacles (1:1 un-stretched geometry with map-authentic visuals)
  for (let i = 0; i < map.obstacles.length; i++) {
    const obs = map.obstacles[i];
    if (removedObstacleIds.length > 0 && removedObstacleIds.includes(obs.id)) continue;
    ctx.save();
    ctx.translate(obs.x, obs.y);

    const r = obs.radius;
    ctx.beginPath();
    ctx.ellipse(4, 6, r * 1.05, r * 0.9, 0, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.36)';
    ctx.fill();

    if (map.id === 'pve_glacial_permafrost' && obs.kind === 'tree') {
      // CORNFIELD: Golden harvestable corn patch rows!
      ctx.fillStyle = '#eab308';
      ctx.strokeStyle = '#713f12';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-r * 0.92, -r * 0.78, r * 1.84, r * 1.56, 8);
      ctx.fill();
      ctx.stroke();

      for (let cx = -r * 0.6; cx <= r * 0.6; cx += r * 0.4) {
        for (let cy = -r * 0.45; cy <= r * 0.45; cy += r * 0.45) {
          ctx.fillStyle = '#15803d';
          ctx.beginPath();
          ctx.arc(cx, cy, 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fde047';
          ctx.beginPath();
          ctx.arc(cx, cy - 1, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (
      (map.id === 'pve_toxic_spillway' || map.id === 'pvp_in_the_wall') &&
      obs.kind === 'wall'
    ) {
      // ANOTHER BRICK / IN THE WALL: Red-clay brick masonry wall/pallet
      ctx.fillStyle = '#b91c1c';
      ctx.strokeStyle = '#450a0a';
      ctx.lineWidth = 2.8;
      ctx.beginPath();
      ctx.roundRect(-r * 0.85, -r * 0.85, r * 1.7, r * 1.7, 5);
      ctx.fill();
      ctx.stroke();

      // Mortar lines
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-r * 0.8, -r * 0.25);
      ctx.lineTo(r * 0.8, -r * 0.25);
      ctx.moveTo(-r * 0.8, r * 0.25);
      ctx.lineTo(r * 0.8, r * 0.25);
      ctx.moveTo(0, -r * 0.8);
      ctx.lineTo(0, -r * 0.25);
      ctx.moveTo(-r * 0.35, -r * 0.25);
      ctx.lineTo(-r * 0.35, r * 0.25);
      ctx.moveTo(r * 0.35, r * 0.25);
      ctx.lineTo(r * 0.35, r * 0.8);
      ctx.stroke();
    } else if (map.id === 'pve_sandstorm_oasis' && obs.kind === 'rock') {
      // STREAMBED: Giant spiral Ammonite shell fossil
      ctx.fillStyle = '#e7e5e4';
      ctx.strokeStyle = '#57534e';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.strokeStyle = '#78716c';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let a = 0; a < Math.PI * 3.5; a += 0.25) {
        const sr = (a / (Math.PI * 3.5)) * (r * 0.82);
        const sx = Math.cos(a) * sr;
        const sy = Math.sin(a) * sr;
        if (a === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    } else if (obs.kind === 'tree') {
      ctx.fillStyle = '#14532d';
      ctx.strokeStyle = '#052e16';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#16a34a';
      ctx.beginPath();
      ctx.arc(-r * 0.3, -r * 0.2, r * 0.52, 0, Math.PI * 2);
      ctx.arc(r * 0.28, -r * 0.15, r * 0.48, 0, Math.PI * 2);
      ctx.arc(0, r * 0.3, r * 0.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#4ade80';
      ctx.beginPath();
      ctx.arc(-r * 0.15, -r * 0.15, r * 0.4, 0, Math.PI * 2);
      ctx.fill();
    } else if (obs.kind === 'ruin' || obs.kind === 'wall') {
      ctx.fillStyle = map.id === 'pvp_docks_bay' ? '#2563eb' : '#64748b';
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.roundRect(-r * 0.9, -r * 0.7, r * 1.8, r * 1.4, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = map.id === 'pvp_docks_bay' ? '#60a5fa' : '#94a3b8';
      ctx.beginPath();
      ctx.roundRect(-r * 0.62, -r * 0.42, r * 1.24, r * 0.84, 4);
      ctx.fill();
    } else if (obs.kind === 'crater') {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#64748b';
      ctx.fill();
      ctx.lineWidth = 3.5;
      ctx.strokeStyle = '#334155';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(2, 3, r * 0.68, 0, Math.PI * 2);
      ctx.fillStyle = map.id === 'pve_volcanic_caldera' ? '#ea580c' : '#1e293b';
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = '#64748b';
      ctx.fill();
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = '#1e293b';
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(-r * 0.25, -r * 0.25, r * 0.55, r * 0.42, -0.4, 0, Math.PI * 2);
      ctx.fillStyle = '#94a3b8';
      ctx.fill();
    }
    ctx.restore();
  }

  // 3. Hover Preview & Selected Range
  if (options.placingTowerSpecId && options.hoverPoint) {
    const spec = TOWER_SPEC_MAP[options.placingTowerSpecId];
    if (spec) {
      const check = canPlaceTowerAt(
        spec.id,
        options.hoverPoint.x,
        options.hoverPoint.y,
        map,
        towers,
        removedObstacleIds
      );
      ctx.save();
      ctx.translate(options.hoverPoint.x, options.hoverPoint.y);
      ctx.beginPath();
      ctx.arc(0, 0, Math.min(spec.range, 360), 0, Math.PI * 2);
      ctx.fillStyle = check.valid ? 'rgba(255, 255, 255, 0.18)' : 'rgba(239, 68, 68, 0.24)';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = check.valid ? 'rgba(255, 255, 255, 0.85)' : '#ef4444';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, spec.footprintRadius, 0, Math.PI * 2);
      ctx.fillStyle = check.valid ? spec.color : '#ef4444';
      ctx.fill();
      ctx.restore();
    }
  }

  if (options.selectedTowerId) {
    const sel = towers.find((t) => t.id === options.selectedTowerId);
    if (sel) {
      const stats = computeTowerStats(sel, towers, map);
      const rEff = Math.min(stats.range, 360);
      ctx.save();
      ctx.translate(sel.x, sel.y);
      ctx.beginPath();
      ctx.arc(0, 0, rEff, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.fill();
      ctx.lineWidth = 2.2;
      ctx.setLineDash([7, 5]);
      ctx.strokeStyle = '#facc15';
      ctx.stroke();
      ctx.restore();
    }
  }

  // 4. Placed Towers (1:1 un-stretched Monkeys & Machines)
  for (let i = 0; i < towers.length; i++) {
    const tower = towers[i];
    const spec = TOWER_SPEC_MAP[tower.specId];
    if (!spec) continue;
    const maxTier = Math.max(tower.tiers[0], tower.tiers[1], tower.tiers[2]);
    const r = spec.footprintRadius;

    ctx.save();
    ctx.translate(tower.x, tower.y);

    if (spec.isPlatform) {
      ctx.fillStyle = '#b45309';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-r, -r, r * 2, r * 2, 6);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      continue;
    }

    ctx.beginPath();
    ctx.arc(2, 4, r + 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,0,0,0.36)';
    ctx.fill();

    if (maxTier >= 3) {
      ctx.beginPath();
      ctx.arc(0, 0, r + 5, 0, Math.PI * 2);
      ctx.strokeStyle = maxTier === 5 ? '#facc15' : maxTier === 4 ? '#38bdf8' : '#c084fc';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    if (spec.id === 'tack_shooter') {
      for (let n = 0; n < 8; n++) {
        ctx.save();
        ctx.rotate((n * Math.PI) / 4);
        ctx.fillStyle = '#94a3b8';
        ctx.strokeStyle = '#0f172a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.roundRect(r * 0.55, -3.5, 9, 7, 1.5);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fillStyle = tower.tiers[0] >= 4 ? '#ea580c' : '#ec4899';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#1e130c';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, r * 0.52, 0, Math.PI * 2);
      ctx.fillStyle = '#cbd5e1';
      ctx.fill();
      ctx.stroke();
    } else if (spec.id === 'banana_farm') {
      ctx.fillStyle = '#78350f';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      for (let a = 0; a < 6; a++) {
        ctx.save();
        ctx.rotate((a * Math.PI) / 3);
        ctx.fillStyle = a % 2 === 0 ? '#16a34a' : '#22c55e';
        ctx.beginPath();
        ctx.ellipse(11, 0, 13, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (spec.id === 'spike_factory') {
      ctx.fillStyle = '#cbd5e1';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
      ctx.fill();
    } else if (spec.id === 'monkey_village') {
      ctx.fillStyle = '#d97706';
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.arc(0, 0, 6.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (spec.id === 'bomb_shooter') {
      ctx.rotate(tower.angle);
      ctx.fillStyle = '#92400e';
      ctx.strokeStyle = '#1e130c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.roundRect(-8, -r - 2, 16, 6, 2);
      ctx.roundRect(-8, r - 4, 16, 6, 2);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.roundRect(-r * 0.85, -r * 0.65, r * 2.05, r * 1.3, 8);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#ef4444';
      ctx.fillRect(r * 0.3, -r * 0.6, 5, r * 1.2);
    } else {
      ctx.rotate(tower.angle);

      if (spec.id === 'monkey_buccaneer') {
        ctx.fillStyle = '#78350f';
        ctx.strokeStyle = '#271206';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(r * 1.35, 0);
        ctx.quadraticCurveTo(r * 0.5, -r * 0.95, -r * 1.1, -r * 0.75);
        ctx.lineTo(-r * 1.1, r * 0.75);
        ctx.quadraticCurveTo(r * 0.5, r * 0.95, r * 1.35, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (spec.id === 'monkey_sub') {
        ctx.fillStyle = '#eab308';
        ctx.strokeStyle = '#422006';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(0, 0, r * 1.25, r * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }

      ctx.fillStyle = spec.secondaryColor;
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      if (spec.id === 'dartling_gunner') {
        ctx.beginPath();
        ctx.roundRect(4, -7, r + 11, 14, 3);
        ctx.fill();
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.roundRect(2, r * 0.45, r + 8, 6, 3);
        ctx.fill();
        ctx.stroke();
      }

      const furColor = spec.id === 'ice_monkey' ? '#38bdf8' : '#92400e';
      const skinColor = spec.id === 'ice_monkey' ? '#bae6fd' : '#f59e0b';

      // Monkey Ears
      ctx.fillStyle = furColor;
      ctx.strokeStyle = '#1e130c';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(-1, -r * 0.82, 5, 0, Math.PI * 2);
      ctx.arc(-1, r * 0.82, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      // Monkey Head
      ctx.beginPath();
      ctx.arc(0, 0, r * 0.82, 0, Math.PI * 2);
      ctx.fillStyle = furColor;
      ctx.fill();
      ctx.lineWidth = 2.4;
      ctx.strokeStyle = '#1e130c';
      ctx.stroke();

      // Face Muzzle
      ctx.beginPath();
      ctx.ellipse(r * 0.22, 0, r * 0.5, r * 0.62, 0, 0, Math.PI * 2);
      ctx.fillStyle = skinColor;
      ctx.fill();

      if (spec.category !== 'Primary' || maxTier >= 1) {
        ctx.beginPath();
        ctx.arc(-r * 0.15, 0, r * 0.68, Math.PI * 0.55, Math.PI * 1.45);
        ctx.closePath();
        ctx.fillStyle = spec.color;
        ctx.fill();
        ctx.stroke();
      }

      // Eyes
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(r * 0.34, -4, 3.2, 0, Math.PI * 2);
      ctx.arc(r * 0.34, 4, 3.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0f172a';
      ctx.beginPath();
      ctx.arc(r * 0.42, -4, 1.7, 0, Math.PI * 2);
      ctx.arc(r * 0.42, 4, 1.7, 0, Math.PI * 2);
      ctx.fill();
    }

    if (maxTier > 0) {
      ctx.rotate(-tower.angle);
      ctx.font = 'bold 9.5px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
      ctx.fillRect(-16, r + 2, 32, 11);
      ctx.fillStyle = maxTier === 5 ? '#facc15' : '#f8fafc';
      ctx.fillText(tower.tiers.join('-'), 0, r + 10.5);
    }

    ctx.restore();
  }

  // 5. Projectiles & Road Spikes
  for (let i = 0; i < projectiles.length; i++) {
    const proj = projectiles[i];
    ctx.save();
    ctx.translate(proj.x, proj.y);
    if (proj.isRoadSpike) {
      ctx.strokeStyle = proj.damageType === 'normal' ? '#f97316' : '#e2e8f0';
      ctx.lineWidth = 2.2;
      for (let s = 0; s < 5; s++) {
        const ang = (s * Math.PI * 2) / 5;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ang) * 8, Math.sin(ang) * 8);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, proj.radius, 0, Math.PI * 2);
      ctx.fillStyle = proj.color;
      ctx.fill();
    }
    ctx.restore();
  }

  // 6. Bloons, MOABs, and Boss Bloons (1:1 un-stretched!)
  for (let i = 0; i < bloons.length; i++) {
    const bloon = bloons[i];
    const spec = BLOON_SPECS[bloon.type];
    if (!spec) continue;

    ctx.save();
    ctx.translate(bloon.x, bloon.y);

    if (spec.isMoabClass) {
      ctx.rotate(bloon.angle);
      const rx = spec.radius * 1.35;
      const ry = spec.radius * 0.85;

      ctx.fillStyle = spec.accentColor || '#1e293b';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-rx * 0.65, 0);
      ctx.lineTo(-rx * 1.15, -ry * 1.15);
      ctx.lineTo(-rx * 0.9, 0);
      ctx.lineTo(-rx * 1.15, ry * 1.15);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fillStyle = spec.color;
      ctx.fill();
      ctx.lineWidth = bloon.fortified ? 4.5 : 2.5;
      ctx.strokeStyle = bloon.fortified ? '#d97706' : '#0f172a';
      ctx.stroke();

      ctx.strokeStyle = spec.accentColor || '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(-rx * 0.7, -ry * 0.45);
      ctx.lineTo(rx * 0.7, -ry * 0.25);
      ctx.moveTo(-rx * 0.7, ry * 0.45);
      ctx.lineTo(rx * 0.7, ry * 0.25);
      ctx.stroke();

      if (bloon.fortified) {
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(-rx * 0.2, -ry * 0.92);
        ctx.lineTo(-rx * 0.2, ry * 0.92);
        ctx.moveTo(rx * 0.3, -ry * 0.85);
        ctx.lineTo(rx * 0.3, ry * 0.85);
        ctx.stroke();
      }

      if (spec.isBoss) {
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.ellipse(rx * 0.35, -ry * 0.35, 9, 4.5, 0.3, 0, Math.PI * 2);
        ctx.ellipse(rx * 0.35, ry * 0.35, 9, 4.5, -0.3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (bloon.hp < bloon.maxHp && !spec.isBoss) {
        ctx.rotate(-bloon.angle);
        const w = 36;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.fillRect(-w / 2, -spec.radius - 11, w, 5);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(-w / 2, -spec.radius - 11, w * Math.max(0, bloon.hp / bloon.maxHp), 5);
      }
    } else {
      const r = spec.radius;

      const traceBloonPath = (scaleMul: number = 1) => {
        const sr = r * scaleMul;
        ctx.beginPath();
        if (bloon.regrow) {
          // Pronounced, unmistakable BTD Heart Shape with deep top cleft & wide upper lobes
          ctx.moveTo(0, -sr * 0.42);
          ctx.bezierCurveTo(
            -sr * 0.55,
            -sr * 1.32,
            -sr * 1.42,
            -sr * 0.55,
            -sr * 0.95,
            sr * 0.18
          );
          ctx.bezierCurveTo(
            -sr * 0.62,
            sr * 0.68,
            -sr * 0.2,
            sr * 0.95,
            0,
            sr * 1.18
          );
          ctx.bezierCurveTo(
            sr * 0.2,
            sr * 0.95,
            sr * 0.62,
            sr * 0.68,
            sr * 0.95,
            sr * 0.18
          );
          ctx.bezierCurveTo(
            sr * 1.42,
            -sr * 0.55,
            sr * 0.55,
            -sr * 1.32,
            0,
            -sr * 0.42
          );
          ctx.closePath();
        } else {
          ctx.ellipse(0, 0, sr * 0.88, sr * 1.05, 0, 0, Math.PI * 2);
        }
      };

      // 1. Base Fill (Metallic brushed steel for Lead, striped/multi-color for Rainbow/Zebra, or spec color)
      traceBloonPath(1);
      if (bloon.type === 'lead') {
        const metalGrad = ctx.createRadialGradient(
          -r * 0.35,
          -r * 0.38,
          r * 0.1,
          0,
          0,
          r * 1.15
        );
        metalGrad.addColorStop(0, '#f8fafc');
        metalGrad.addColorStop(0.28, '#cbd5e1');
        metalGrad.addColorStop(0.62, '#64748b');
        metalGrad.addColorStop(0.88, '#334155');
        metalGrad.addColorStop(1, '#0f172a');
        ctx.fillStyle = metalGrad;
      } else if (bloon.type === 'rainbow') {
        const rbGrad = ctx.createLinearGradient(-r, -r, r, r);
        rbGrad.addColorStop(0, '#ef4444');
        rbGrad.addColorStop(0.25, '#facc15');
        rbGrad.addColorStop(0.5, '#22c55e');
        rbGrad.addColorStop(0.75, '#3b82f6');
        rbGrad.addColorStop(1, '#a855f7');
        ctx.fillStyle = rbGrad;
      } else if (bloon.type === 'zebra') {
        const zbGrad = ctx.createLinearGradient(-r, 0, r, 0);
        zbGrad.addColorStop(0, '#0f172a');
        zbGrad.addColorStop(0.33, '#f8fafc');
        zbGrad.addColorStop(0.66, '#0f172a');
        zbGrad.addColorStop(1, '#f8fafc');
        ctx.fillStyle = zbGrad;
      } else {
        ctx.fillStyle = spec.color;
      }
      ctx.fill();

      // 2. Clipped Interior Details (Metallic Lead plates & rivets, Camo woodland blotches, Ceramic cracks)
      ctx.save();
      traceBloonPath(1);
      ctx.clip();

      if (bloon.type === 'lead') {
        // Metallic welded seam band across the metal bloon
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.moveTo(-r * 1.2, -r * 0.25);
        ctx.quadraticCurveTo(0, r * 0.22, r * 1.2, -r * 0.25);
        ctx.stroke();

        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(-r * 1.2, -r * 0.32);
        ctx.quadraticCurveTo(0, r * 0.15, r * 1.2, -r * 0.32);
        ctx.stroke();

        // Steel rivets / bolts around the metal shell
        const rivetCoords = [
          [-r * 0.55, -r * 0.48],
          [r * 0.52, -r * 0.48],
          [-r * 0.62, r * 0.22],
          [0, r * 0.38],
          [r * 0.62, r * 0.22],
          [0, -r * 0.68],
        ];
        for (let rv = 0; rv < rivetCoords.length; rv++) {
          const [rx, ry] = rivetCoords[rv];
          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(rx, ry, 2.3, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#f1f5f9';
          ctx.beginPath();
          ctx.arc(rx - 0.5, ry - 0.5, 1.4, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      if (bloon.camo) {
        // High-visibility multi-tone woodland camouflage pattern
        ctx.fillStyle = 'rgba(20, 83, 45, 0.82)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.42, -r * 0.38, r * 0.58, r * 0.34, -0.45, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(15, 23, 42, 0.78)';
        ctx.beginPath();
        ctx.ellipse(r * 0.45, -r * 0.15, r * 0.52, r * 0.3, 0.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(63, 98, 18, 0.85)';
        ctx.beginPath();
        ctx.ellipse(-r * 0.25, r * 0.38, r * 0.62, r * 0.32, 0.3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(132, 204, 22, 0.72)';
        ctx.beginPath();
        ctx.ellipse(r * 0.25, r * 0.52, r * 0.45, r * 0.26, -0.35, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = 'rgba(5, 46, 22, 0.82)';
        ctx.beginPath();
        ctx.ellipse(0, -r * 0.05, r * 0.4, r * 0.24, 0.2, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      // 3. Inner Regrow Heart Contour so Heart shape is extra unmistakable
      if (bloon.regrow) {
        traceBloonPath(0.76);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
        ctx.stroke();
      }

      // 4. Outer Border (Fortified orange band, Purple energy glow, Metal iron rim, or Camo tactical rim)
      traceBloonPath(1);
      ctx.lineWidth = bloon.fortified ? 3.8 : bloon.type === 'lead' ? 2.6 : 2.0;
      ctx.strokeStyle = bloon.fortified
        ? '#f97316'
        : bloon.type === 'purple'
          ? '#22d3ee'
          : bloon.type === 'lead'
            ? '#0f172a'
            : '#0f172a';
      ctx.stroke();

      if (bloon.camo) {
        // Dashed green/lime tactical camo ring on the border
        ctx.save();
        traceBloonPath(1);
        ctx.lineWidth = 2.2;
        ctx.setLineDash([4, 4]);
        ctx.strokeStyle = '#84cc16';
        ctx.stroke();
        ctx.restore();
      }

      // 5. Specular 3D Shine (Dual lobe shine for Heart Regrow, oval shine for standard)
      ctx.fillStyle = bloon.type === 'lead' ? 'rgba(255, 255, 255, 0.75)' : 'rgba(255, 255, 255, 0.48)';
      if (bloon.regrow) {
        ctx.beginPath();
        ctx.ellipse(-r * 0.45, -r * 0.48, r * 0.18, r * 0.26, -0.35, 0, Math.PI * 2);
        ctx.ellipse(r * 0.42, -r * 0.48, r * 0.14, r * 0.2, 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.ellipse(-r * 0.32, -r * 0.35, r * 0.22, r * 0.35, -0.4, 0, Math.PI * 2);
        ctx.fill();
      }

      // 6. Bottom Bloon Tie Knot
      const knotY = bloon.regrow ? r * 1.16 : r * 1.02;
      ctx.fillStyle = bloon.type === 'lead' ? '#475569' : spec.color;
      ctx.beginPath();
      ctx.moveTo(-2.8, knotY);
      ctx.lineTo(2.8, knotY);
      ctx.lineTo(0, knotY + r * 0.2);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  // 7. Visual Effects
  for (let i = 0; i < effects.length; i++) {
    const fx = effects[i];
    const progress = 1 - fx.life / fx.maxLife;
    ctx.save();
    ctx.translate(fx.x, fx.y);
    if (fx.kind === 'explosion') {
      ctx.beginPath();
      ctx.arc(0, 0, fx.radius * (0.4 + progress * 0.6), 0, Math.PI * 2);
      ctx.fillStyle = fx.color;
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.fill();
    } else if (fx.kind === 'pop') {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.globalAlpha = Math.max(0, 1 - progress);
      for (let s = 0; s < 6; s++) {
        const a = (s * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * 5, Math.sin(a) * 5);
        ctx.lineTo(Math.cos(a) * (11 + progress * 5), Math.sin(a) * (11 + progress * 5));
        ctx.stroke();
      }
    } else if (fx.kind === 'cash' && fx.text) {
      ctx.font = 'bold 13px "Fredoka", sans-serif';
      ctx.fillStyle = '#fde047';
      ctx.strokeStyle = '#0f172a';
      ctx.lineWidth = 3;
      ctx.globalAlpha = Math.max(0, 1 - progress);
      ctx.strokeText(fx.text, -14, -progress * 22);
      ctx.fillText(fx.text, -14, -progress * 22);
    }
    ctx.restore();
  }

  ctx.restore();
}
