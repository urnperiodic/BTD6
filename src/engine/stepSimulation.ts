import {
  ActiveBloon,
  BloonType,
  DamageType,
  GameMap,
  PlacedTower,
  Projectile,
  VisualEffect,
} from '../types/game';
import { BLOON_HIERARCHY_ORDER, BLOON_SPECS } from '../data/bloons';
import { TOWER_SPEC_MAP } from '../data/towers';
import {
  computeTowerStats,
  createActiveBloon,
  getPointAlongPath,
  hasLineOfSight,
} from './simEngine';
import { soundFX } from '../utils/sound';

export interface SimStepState {
  map: GameMap;
  towers: PlacedTower[];
  bloons: ActiveBloon[];
  projectiles: Projectile[];
  effects: VisualEffect[];
  removedObstacleIds: string[];
  round: number;
  speedMultiplier: number;
  bloonBoostActive: boolean;
  towerBoostActive: boolean;
  envTimer: number;
  isPvP?: boolean;
}

export interface SimStepResult {
  cashEarned: number;
  livesLost: number;
  bossSkullTriggered: boolean;
  newEnvTimer: number;
}

let projIdCounter = 1;
let fxIdCounter = 1;

export function stepGameSimulation(
  state: SimStepState,
  dt: number,
  playSounds: boolean = true
): SimStepResult {
  let cashEarned = 0;
  let livesLost = 0;
  let bossSkullTriggered = false;
  const { map, towers, bloons, projectiles, effects, removedObstacleIds } = state;

  const roundScale = state.round > 80 ? 1 + (state.round - 80) * 0.12 : 1.0;
  let envTimer = state.envTimer + dt;

  // 1. Environmental Map Effects (every 8 seconds)
  if (envTimer >= 8.0) {
    envTimer = 0;
    const envType = map.environmentalEffect.type;
    if (envType === 'volcanic_ash') {
      for (let i = 0; i < bloons.length; i++) {
        const b = bloons[i];
        const dx = b.x - 400;
        const dy = b.y - 260;
        if (b.type !== 'purple' && dx * dx + dy * dy < 25600) {
          b.hp -= 2;
        }
      }
      if (effects.length < 70) {
        effects.push({
          id: `fx_${++fxIdCounter}`,
          x: 400,
          y: 260,
          radius: 150,
          color: 'rgba(234, 88, 12, 0.35)',
          life: 0.45,
          maxLife: 0.45,
          kind: 'explosion',
        });
      }
    } else if (envType === 'toxic_acid_vat') {
      for (let i = 0; i < bloons.length; i++) {
        const b = bloons[i];
        const dx = b.x - 400;
        const dy = b.y - 260;
        if (dx * dx + dy * dy < 32400) {
          b.camo = false;
          b.regrow = false;
        }
      }
    } else if (envType === 'sandstorm_gust') {
      for (let i = 0; i < bloons.length; i++) {
        const b = bloons[i];
        const spec = BLOON_SPECS[b.type];
        if (!spec.isMoabClass) {
          b.distance = Math.max(0, b.distance - 18);
        }
      }
    }
  }

  // 2. Move Bloons, Regrow logic, and Leak check
  const chillMultiplier = map.environmentalEffect.type === 'glacial_chill' ? 0.88 : 1.0;
  const boostMult = state.bloonBoostActive ? 1.3 : 1.0;
  const basePxPerSec = 52;

  for (let i = bloons.length - 1; i >= 0; i--) {
    const b = bloons[i];
    if (b.hp <= 0) {
      bloons.splice(i, 1);
      continue;
    }
    const spec = BLOON_SPECS[b.type];
    if (!spec) continue;

    if (b.slowTimer > 0) {
      b.slowTimer -= dt;
      if (b.slowTimer <= 0) b.slowFactor = 1.0;
    }

    if (b.regrow && !spec.isMoabClass) {
      b.regrowTimer += dt;
      if (b.regrowTimer >= 2.4) {
        b.regrowTimer = 0;
        const currIdx = BLOON_HIERARCHY_ORDER.indexOf(b.type);
        const baseIdx = BLOON_HIERARCHY_ORDER.indexOf(b.baseType);
        if (currIdx >= 0 && baseIdx > currIdx) {
          const nextType = BLOON_HIERARCHY_ORDER[currIdx + 1];
          const nextSpec = BLOON_SPECS[nextType];
          b.type = nextType;
          b.hp = nextSpec.hp * (b.fortified && (nextType === 'ceramic' || nextType === 'lead') ? 2 : 1);
          b.maxHp = b.hp;
        }
      }
    }

    const moveDist = spec.speed * basePxPerSec * b.slowFactor * chillMultiplier * boostMult * dt;
    b.distance += moveDist;

    const path = map.paths[b.pathIndex % map.paths.length] || map.paths[0];
    const pos = getPointAlongPath(path, b.distance);
    b.x = pos.x;
    b.y = pos.y;
    b.angle = pos.angle;

    if (pos.completed) {
      livesLost += spec.rbe;
      bloons.splice(i, 1);
    }
  }

  // 3. Towers Target & Fire Projectiles (Zero-Allocation Single-Pass Target Finder!)
  for (let tIdx = 0; tIdx < towers.length; tIdx++) {
    const tower = towers[tIdx];
    const spec = TOWER_SPEC_MAP[tower.specId];
    if (!spec) continue;

    if (tower.abilityCooldownTimer > 0) {
      tower.abilityCooldownTimer = Math.max(0, tower.abilityCooldownTimer - dt);
    }

    const stats = computeTowerStats(tower, towers, map, state.towerBoostActive);

    if (bloons.length > 0 && spec.continuousIncomePerSec) {
      tower.cooldownTimer -= dt;
      if (tower.cooldownTimer <= 0) {
        tower.cooldownTimer = 3.2;
        const rate = state.isPvP ? 0.16 : 0.09;
        const bonus = Math.max(15, Math.round(stats.incomePerRound * rate));
        cashEarned += bonus;
        tower.cashGenerated += bonus;
        if (effects.length < 70) {
          effects.push({
            id: `fx_${++fxIdCounter}`,
            x: tower.x,
            y: tower.y - 10,
            radius: 10,
            color: '#fde047',
            text: `+$${bonus}`,
            life: 0.9,
            maxLife: 0.9,
            kind: 'cash',
          });
        }
      }
      continue;
    }

    if (stats.damage <= 0 && !spec.spawnsTrackSpikes) continue;

    tower.cooldownTimer -= dt;
    if (tower.cooldownTimer > 0) continue;

    if (spec.spawnsTrackSpikes) {
      if (bloons.length === 0 || projectiles.length > 220) continue;
      let bestTrackPt: { x: number; y: number } | null = null;
      let bestDistSq = Infinity;
      const rangeSq = stats.range * stats.range;

      for (const path of map.paths) {
        for (let d = 24; d < 880; d += 36) {
          const pt = getPointAlongPath(path, d);
          if (pt.completed) break;
          const dx = pt.x - tower.x;
          const dy = pt.y - tower.y;
          const dSq = dx * dx + dy * dy;
          if (dSq <= rangeSq && dSq < bestDistSq) {
            bestDistSq = dSq;
            bestTrackPt = {
              x: pt.x + (Math.random() - 0.5) * 10,
              y: pt.y + (Math.random() - 0.5) * 10,
            };
          }
        }
      }

      if (bestTrackPt) {
        tower.cooldownTimer = stats.fireCooldown;
        projectiles.push({
          id: `spike_${++projIdCounter}`,
          x: bestTrackPt.x,
          y: bestTrackPt.y,
          vx: 0,
          vy: 0,
          damage: stats.damage,
          moabDamageBonus: stats.moabDamageBonus,
          pierce: stats.pierce,
          damageType: stats.damageType,
          canHitCamo: true,
          splashRadius: stats.splashRadius,
          slowAmount: 0,
          stripCamoRegrow: false,
          color: '#cbd5e1',
          radius: 9,
          hitBloonIds: new Set(),
          sourceTowerId: tower.id,
          life: 14.0,
          isRoadSpike: true,
        });
      }
      continue;
    }

    // Fast O(N) single-pass target selection (no sorting or array allocation!)
    const ignoresObstacles = spec.id === 'wizard_monkey' && tower.tiers[0] >= 1;
    const rangeSq = stats.range * stats.range;
    const isIceNova = spec.id === 'ice_monkey' && tower.tiers[2] < 3;

    let bestTarget: ActiveBloon | null = null;
    let bestScore = -Infinity;

    for (let bIdx = 0; bIdx < bloons.length; bIdx++) {
      const b = bloons[bIdx];
      if (b.hp <= 0) continue;
      if (b.camo && !stats.canDetectCamo) continue;

      const dx = b.x - tower.x;
      const dy = b.y - tower.y;
      const dSq = dx * dx + dy * dy;
      if (dSq > rangeSq) continue;

      if (!hasLineOfSight(tower.x, tower.y, b.x, b.y, map, removedObstacleIds, ignoresObstacles)) {
        continue;
      }

      if (isIceNova) {
        bestTarget = b;
        break;
      }

      let score = 0;
      if (tower.targetPriority === 'first') {
        score = b.distance;
      } else if (tower.targetPriority === 'last') {
        score = -b.distance;
      } else if (tower.targetPriority === 'close') {
        score = -dSq;
      } else {
        // Strong
        score = (BLOON_SPECS[b.type]?.rbe || 1) * 10000 + b.distance;
      }

      if (score > bestScore) {
        bestScore = score;
        bestTarget = b;
      }
    }

    if (!bestTarget) continue;

    tower.cooldownTimer = stats.fireCooldown;

    if (isIceNova) {
      if (effects.length < 70) {
        effects.push({
          id: `fx_${++fxIdCounter}`,
          x: tower.x,
          y: tower.y,
          radius: stats.range,
          color: 'rgba(186, 230, 253, 0.35)',
          life: 0.22,
          maxLife: 0.22,
          kind: 'explosion',
        });
      }
      let hitCount = 0;
      for (let bIdx = bloons.length - 1; bIdx >= 0; bIdx--) {
        const b = bloons[bIdx];
        if (b.hp <= 0 || (b.camo && !stats.canDetectCamo)) continue;
        const dx = b.x - tower.x;
        const dy = b.y - tower.y;
        if (dx * dx + dy * dy <= rangeSq) {
          applyDamageToBloon(
            b,
            stats.damage,
            stats.moabDamageBonus,
            stats.damageType,
            stats.slowAmount || 0.45,
            stats.stripCamoRegrow,
            tower,
            bloons,
            effects,
            map,
            roundScale,
            playSounds,
            (c) => (cashEarned += c),
            () => (bossSkullTriggered = true)
          );
          hitCount++;
          if (hitCount >= stats.pierce) break;
        }
      }
      continue;
    }

    const baseAngle = Math.atan2(bestTarget.y - tower.y, bestTarget.x - tower.x);
    tower.angle = baseAngle;

    if (projectiles.length > 260) continue;

    const count = stats.projectilesCount;
    for (let p = 0; p < count; p++) {
      let ang = baseAngle;
      if (spec.id === 'tack_shooter') {
        ang = (p * Math.PI * 2) / count;
      } else if (count > 1) {
        const offset = (p - (count - 1) / 2) * (stats.spreadAngle / Math.max(1, count - 1));
        ang = baseAngle + offset;
      }

      projectiles.push({
        id: `proj_${++projIdCounter}`,
        x: tower.x + Math.cos(ang) * 14,
        y: tower.y + Math.sin(ang) * 14,
        vx: Math.cos(ang) * stats.projectileSpeed,
        vy: Math.sin(ang) * stats.projectileSpeed,
        damage: stats.damage,
        moabDamageBonus: stats.moabDamageBonus,
        pierce: stats.pierce,
        damageType: stats.damageType,
        canHitCamo: stats.canDetectCamo,
        splashRadius: stats.splashRadius,
        slowAmount: stats.slowAmount,
        stripCamoRegrow: stats.stripCamoRegrow,
        color:
          stats.damageType === 'plasma'
            ? '#c084fc'
            : stats.damageType === 'fire' || stats.damageType === 'explosive'
              ? '#f97316'
              : stats.damageType === 'energy'
                ? '#38bdf8'
                : spec.secondaryColor,
        radius: stats.splashRadius > 0 ? 5.5 : 4,
        hitBloonIds: new Set(),
        sourceTowerId: tower.id,
        life: 1.35,
      });
    }
  }

  // 4. Advance Projectiles & Fast Squared-Distance Bloon Collisions
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const proj = projectiles[i];
    proj.life -= dt;
    if (proj.life <= 0 || proj.pierce <= 0) {
      projectiles.splice(i, 1);
      continue;
    }

    proj.x += proj.vx * dt;
    proj.y += proj.vy * dt;

    const sourceTower = towers.find((t) => t.id === proj.sourceTowerId);

    for (let j = bloons.length - 1; j >= 0; j--) {
      const b = bloons[j];
      if (!b || b.hp <= 0 || proj.hitBloonIds.has(b.id)) continue;
      if (b.camo && !proj.canHitCamo) continue;

      const bSpec = BLOON_SPECS[b.type];
      const hitDist = (bSpec?.radius || 12) + proj.radius + 4;
      const dx = b.x - proj.x;
      const dy = b.y - proj.y;
      if (dx * dx + dy * dy <= hitDist * hitDist) {
        proj.hitBloonIds.add(b.id);
        proj.pierce -= 1;

        if (proj.splashRadius > 0) {
          if (effects.length < 70) {
            effects.push({
              id: `fx_${++fxIdCounter}`,
              x: proj.x,
              y: proj.y,
              radius: proj.splashRadius,
              color: 'rgba(251, 146, 60, 0.5)',
              life: 0.2,
              maxLife: 0.2,
              kind: 'explosion',
            });
          }
          const splashSq = proj.splashRadius * proj.splashRadius;
          let splashHits = 0;
          const len = bloons.length;
          for (let k = 0; k < len; k++) {
            const sb = bloons[k];
            if (!sb || sb.hp <= 0) continue;
            const sdx = sb.x - proj.x;
            const sdy = sb.y - proj.y;
            if (sdx * sdx + sdy * sdy <= splashSq) {
              applyDamageToBloon(
                sb,
                proj.damage,
                proj.moabDamageBonus,
                proj.damageType,
                proj.slowAmount,
                proj.stripCamoRegrow,
                sourceTower,
                bloons,
                effects,
                map,
                roundScale,
                playSounds,
                (c) => (cashEarned += c),
                () => (bossSkullTriggered = true)
              );
              splashHits++;
              if (splashHits >= 24) break;
            }
          }
          proj.pierce = 0;
          break;
        } else {
          applyDamageToBloon(
            b,
            proj.damage,
            proj.moabDamageBonus,
            proj.damageType,
            proj.slowAmount,
            proj.stripCamoRegrow,
            sourceTower,
            bloons,
            effects,
            map,
            roundScale,
            playSounds,
            (c) => (cashEarned += c),
            () => (bossSkullTriggered = true)
          );
          if (proj.pierce <= 0) break;
        }
      }
    }
  }

  // Sweep popped bloons in a single clean pass
  for (let i = bloons.length - 1; i >= 0; i--) {
    if (bloons[i].hp <= 0) {
      bloons.splice(i, 1);
    }
  }

  // 5. Decay Visual Effects
  for (let i = effects.length - 1; i >= 0; i--) {
    effects[i].life -= dt;
    if (effects[i].life <= 0) {
      effects.splice(i, 1);
    }
  }

  return {
    cashEarned,
    livesLost,
    bossSkullTriggered,
    newEnvTimer: envTimer,
  };
}

function applyDamageToBloon(
  bloon: ActiveBloon,
  baseDamage: number,
  moabBonus: number,
  damageType: DamageType,
  slowAmount: number,
  stripCamoRegrow: boolean,
  sourceTower: PlacedTower | undefined,
  bloonsArray: ActiveBloon[],
  effects: VisualEffect[],
  map: GameMap,
  roundScale: number,
  playSounds: boolean,
  onCash: (amount: number) => void,
  onBossSkull: () => void
) {
  if (bloon.hp <= 0) return;
  const spec = BLOON_SPECS[bloon.type];
  if (!spec) return;

  if (stripCamoRegrow && !spec.innateCamo) {
    bloon.camo = false;
    bloon.regrow = false;
  }

  if (spec.immunities.includes(damageType)) {
    if (playSounds && (bloon.type === 'lead' || bloon.type === 'ddt')) {
      soundFX.playLeadClank();
    }
    return;
  }

  if (slowAmount > 0 && bloon.type !== 'bad') {
    const effectiveSlow = spec.isMoabClass ? slowAmount * 0.45 : slowAmount;
    bloon.slowFactor = Math.min(bloon.slowFactor, Math.max(0.25, 1 - effectiveSlow));
    bloon.slowTimer = 2.5;
  }

  const totalDamage = baseDamage + (spec.isMoabClass ? moabBonus : 0);
  bloon.hp -= totalDamage;
  if (sourceTower) {
    sourceTower.pops += totalDamage;
  }

  // Boss Skull Milestones
  if (spec.isBoss && spec.bossSkulls) {
    const pctRemaining = Math.max(0, bloon.hp / bloon.maxHp);
    const skullsPassed = Math.floor((1 - pctRemaining) * spec.bossSkulls);
    while (bloon.skullsTriggered < skullsPassed && bloon.skullsTriggered < spec.bossSkulls) {
      bloon.skullsTriggered += 1;
      onBossSkull();
      if (playSounds) soundFX.playBossSkull();
      const minionType: BloonType =
        bloon.type === 'boss_bloonarius'
          ? 'ceramic'
          : bloon.type === 'boss_lych'
            ? 'moab'
            : bloon.type === 'boss_vortex'
              ? 'rainbow'
              : 'lead';
      const minionCount = minionType === 'moab' ? 1 : minionType === 'ceramic' ? 3 : 4;
      for (let m = 0; m < minionCount; m++) {
        bloonsArray.push(
          createActiveBloon(
            minionType,
            bloon.pathIndex,
            Math.max(0, bloon.distance - m * 18 + 20),
            map,
            {
              fortified: bloon.type === 'boss_dreadbloon',
              regrow: bloon.type === 'boss_lych',
              roundScale,
            }
          )
        );
      }
      if (bloon.type === 'boss_lych') {
        for (let m = 0; m < 2; m++) {
          bloonsArray.push(
            createActiveBloon('rainbow', bloon.pathIndex, Math.max(0, bloon.distance - m * 14), map, {
              regrow: true,
              roundScale,
            })
          );
        }
      }
    }
  }

  if (bloon.hp <= 0) {
    if (playSounds) soundFX.playPop();
    onCash(spec.cashReward);

    if (effects.length < 60) {
      effects.push({
        id: `fx_${++fxIdCounter}`,
        x: bloon.x,
        y: bloon.y,
        radius: spec.radius,
        color: spec.color,
        life: 0.14,
        maxLife: 0.14,
        kind: 'pop',
      });
    }

    const leftoverDamage = Math.abs(bloon.hp);

    // Cap active bloons at 450 so extreme ceramic/rainbow floods never lag the browser
    if (bloonsArray.length < 450) {
      for (const childGroup of spec.children) {
        for (let c = 0; c < childGroup.count; c++) {
          const child = createActiveBloon(
            childGroup.type,
            bloon.pathIndex,
            Math.max(0, bloon.distance - c * 10),
            map,
            {
              camo: bloon.camo,
              regrow: bloon.regrow,
              fortified: bloon.fortified,
              roundScale,
            }
          );
          child.baseType = bloon.baseType;
          bloonsArray.push(child);

          if (leftoverDamage > 0 && !spec.isMoabClass && childGroup.count === 1) {
            applyDamageToBloon(
              child,
              leftoverDamage,
              0,
              'normal',
              0,
              false,
              sourceTower,
              bloonsArray,
              effects,
              map,
              roundScale,
              false,
              onCash,
              onBossSkull
            );
          }
        }
      }
    }
  }
}
