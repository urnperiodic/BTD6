import React, { useEffect, useRef, useState } from 'react';
import {
  ActiveBloon,
  BloonType,
  CampaignDifficulty,
  GameMap,
  PlacedTower,
  Point,
  Projectile,
  SaveFileState,
  TargetPriority,
  VisualEffect,
} from '../types/game';
import { BLOON_SPECS, generateRoundWaves } from '../data/bloons';
import { TOWER_SPECS, TOWER_SPEC_MAP } from '../data/towers';
import {
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  canPlaceTowerAt,
  clientToLogicalCoords,
  computeTowerStats,
  createActiveBloon,
  renderGameScene,
} from '../engine/simEngine';
import { stepGameSimulation } from '../engine/stepSimulation';
import { BloonIcon, TowerPortraitIcon } from './GameIcons';
import { TowerUpgradePanel } from './TowerUpgradePanel';
import { soundFX } from '../utils/sound';
import {
  ArrowLeft,
  Coins,
  Download,
  FastForward,
  Heart,
  Infinity as InfinityIcon,
  Play,
  RotateCcw,
  Settings,
  Skull,
  Upload,
  Volume2,
  VolumeX,
  Wrench,
  Zap,
} from 'lucide-react';

interface PvEViewProps {
  map: GameMap;
  difficulty: CampaignDifficulty;
  loadedSaveRun?: SaveFileState['activePvERun'] | null;
  onBackToMenu: () => void;
  onExportSaveFile: (currentRun: NonNullable<SaveFileState['activePvERun']>) => void;
  onImportSaveFile: (file: File) => void;
  onVictoryUnlock: (mapId: string, difficulty: CampaignDifficulty) => void;
}

const DIFFICULTY_CONFIG: Record<
  CampaignDifficulty,
  { startLives: number; startCash: number; maxRound: number; costMult: number }
> = {
  Easy: { startLives: 200, startCash: 650, maxRound: 40, costMult: 0.85 },
  Medium: { startLives: 150, startCash: 650, maxRound: 60, costMult: 1.0 },
  Hard: { startLives: 100, startCash: 650, maxRound: 80, costMult: 1.08 },
  Impossible: { startLives: 1, startCash: 650, maxRound: 100, costMult: 1.2 },
  Endless: { startLives: 150, startCash: 850, maxRound: 9999, costMult: 1.0 },
  Sandbox: { startLives: 9999, startCash: 50000, maxRound: 9999, costMult: 1.0 },
};

const ALL_SANDBOX_BLOONS: BloonType[] = [
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
  'boss_bloonarius',
  'boss_lych',
  'boss_vortex',
  'boss_dreadbloon',
];

const GAME_SPEED_OPTIONS = [1, 2, 3, 5] as const;

export const PvEView: React.FC<PvEViewProps> = ({
  map,
  difficulty,
  loadedSaveRun,
  onBackToMenu,
  onExportSaveFile,
  onImportSaveFile,
  onVictoryUnlock,
}) => {
  const diffCfg = DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG.Medium;
  const isSandbox = loadedSaveRun?.isSandbox ?? difficulty === 'Sandbox';
  const [isEndless, setIsEndless] = useState<boolean>(
    loadedSaveRun?.isEndless ?? difficulty === 'Endless'
  );

  const [round, setRound] = useState<number>(loadedSaveRun?.round ?? 1);
  const [maxRound] = useState<number>(loadedSaveRun?.maxRound ?? diffCfg.maxRound);
  const [cash, setCash] = useState<number>(loadedSaveRun?.cash ?? diffCfg.startCash);
  const [lives, setLives] = useState<number>(loadedSaveRun?.lives ?? diffCfg.startLives);
  const [manaShield, setManaShield] = useState<number>(loadedSaveRun?.manaShield ?? 14);

  const [towers, setTowers] = useState<PlacedTower[]>(loadedSaveRun?.towers ?? []);
  const [removedObstacleIds, setRemovedObstacleIds] = useState<string[]>(
    loadedSaveRun?.removedObstacleIds ?? []
  );

  const [selectedShopSpecId, setSelectedShopSpecId] = useState<string | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);
  const [selectedObstacleId, setSelectedObstacleId] = useState<string | null>(null);

  const [roundActive, setRoundActive] = useState<boolean>(false);
  const [gameSpeed, setGameSpeed] = useState<1 | 2 | 3 | 5>(1);
  const [autoStart, setAutoStart] = useState<boolean>(false);
  const [towerBoostTimer, setTowerBoostTimer] = useState<number>(0);

  // Sandbox Admin Controls State (only available in Sandbox mode!)
  const [showAdminPanel, setShowAdminPanel] = useState<boolean>(isSandbox);
  const [adminCamo, setAdminCamo] = useState<boolean>(false);
  const [adminRegrow, setAdminRegrow] = useState<boolean>(false);
  const [adminFortified, setAdminFortified] = useState<boolean>(false);
  const [adminBatchCount, setAdminBatchCount] = useState<number>(1);
  const [adminRoundInput, setAdminRoundInput] = useState<string>('40');

  // Modals
  const [showSaveFilesModal, setShowSaveFilesModal] = useState<boolean>(false);
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [victoryModalOpen, setVictoryModalOpen] = useState<boolean>(false);
  const [gameOverModalOpen, setGameOverModalOpen] = useState<boolean>(false);
  const [muted, setMuted] = useState<boolean>(soundFX.muted);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Active Boss tracking for top-center HUD
  const [activeBossState, setActiveBossState] = useState<{
    name: string;
    type: BloonType;
    hp: number;
    maxHp: number;
    skulls: number;
  } | null>(null);

  // Mutable simulation refs for 60fps canvas loop (zero lag!)
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const bloonsRef = useRef<ActiveBloon[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const effectsRef = useRef<VisualEffect[]>([]);
  const spawnQueueRef = useRef<
    Array<{
      spawnTime: number;
      type: BloonType;
      camo?: boolean;
      regrow?: boolean;
      fortified?: boolean;
    }>
  >([]);
  const waveElapsedRef = useRef<number>(0);
  const envTimerRef = useRef<number>(0);
  const hoverPointRef = useRef<Point | null>(null);

  const cashRef = useRef<number>(cash);
  cashRef.current = cash;
  const livesRef = useRef<number>(lives);
  livesRef.current = lives;
  const manaShieldRef = useRef<number>(manaShield);
  manaShieldRef.current = manaShield;

  const towersRef = useRef<PlacedTower[]>(towers);
  towersRef.current = towers;
  const removedObsRef = useRef<string[]>(removedObstacleIds);
  removedObsRef.current = removedObstacleIds;
  const roundRef = useRef<number>(round);
  roundRef.current = round;
  const roundActiveRef = useRef<boolean>(roundActive);
  roundActiveRef.current = roundActive;
  const gameSpeedRef = useRef<number>(gameSpeed);
  gameSpeedRef.current = gameSpeed;
  const autoStartRef = useRef<boolean>(autoStart);
  autoStartRef.current = autoStart;
  const towerBoostRef = useRef<number>(towerBoostTimer);
  towerBoostRef.current = towerBoostTimer;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const triggerBanner = (msg: string) => {
    setStatusBanner(msg);
    setTimeout(() => {
      setStatusBanner((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Start a round wave
  const startNextRound = (targetRoundNum?: number) => {
    const r = targetRoundNum ?? roundRef.current;
    const waveGroups = generateRoundWaves(r, true);
    const queue: typeof spawnQueueRef.current = [];

    for (const grp of waveGroups) {
      for (let i = 0; i < grp.count; i++) {
        queue.push({
          spawnTime: grp.delay + i * grp.spacing,
          type: grp.type,
          camo: grp.camo,
          regrow: grp.regrow,
          fortified: grp.fortified,
        });
      }
    }
    queue.sort((a, b) => a.spawnTime - b.spawnTime);
    spawnQueueRef.current = queue;
    waveElapsedRef.current = 0;
    roundActiveRef.current = true;
    setRoundActive(true);
  };

  // Sandbox Admin: Spawn Bloons immediately
  const handleSandboxSendBloon = (type: BloonType) => {
    const roundScale = roundRef.current > 80 ? 1 + (roundRef.current - 80) * 0.12 : 1;
    for (let i = 0; i < adminBatchCount; i++) {
      spawnQueueRef.current.push({
        spawnTime: waveElapsedRef.current + i * 0.16,
        type,
        camo: adminCamo,
        regrow: adminRegrow,
        fortified: adminFortified,
      });
    }
    if (!roundActiveRef.current && spawnQueueRef.current.length > 0) {
      const item = spawnQueueRef.current.shift()!;
      bloonsRef.current.push(
        createActiveBloon(item.type, 0, 0, map, {
          camo: item.camo,
          regrow: item.regrow,
          fortified: item.fortified,
          roundScale,
        })
      );
    }
  };

  // Main 60FPS Game Loop (with throttled React HUD updates to prevent slowdown!)
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();
    let hudSyncAccumulator = 0;
    let pendingCashDelta = 0;

    const loop = (now: number) => {
      const rawDt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      const speedMult = gameSpeedRef.current;
      const dt = rawDt * speedMult;
      hudSyncAccumulator += rawDt;

      if (towerBoostRef.current > 0) {
        towerBoostRef.current = Math.max(0, towerBoostRef.current - rawDt);
      }

      // Process wave spawn queue
      if (spawnQueueRef.current.length > 0) {
        waveElapsedRef.current += dt;
        const roundScale = roundRef.current > 80 ? 1 + (roundRef.current - 80) * 0.12 : 1;
        let pathCounter = 0;
        while (
          spawnQueueRef.current.length > 0 &&
          spawnQueueRef.current[0].spawnTime <= waveElapsedRef.current
        ) {
          const item = spawnQueueRef.current.shift()!;
          const pathIdx = pathCounter % map.paths.length;
          pathCounter++;
          if (bloonsRef.current.length < 480) {
            bloonsRef.current.push(
              createActiveBloon(item.type, pathIdx, 0, map, {
                camo: item.camo,
                regrow: item.regrow,
                fortified: item.fortified,
                roundScale,
              })
            );
          }
        }
      }

      // Step simulation (for 3x and 5x speed, sub-step in 2 chunks so fast projectiles never tunnel!)
      const subSteps = speedMult >= 3 ? 2 : 1;
      const subDt = dt / subSteps;

      for (let s = 0; s < subSteps; s++) {
        const res = stepGameSimulation(
          {
            map,
            towers: towersRef.current,
            bloons: bloonsRef.current,
            projectiles: projectilesRef.current,
            effects: effectsRef.current,
            removedObstacleIds: removedObsRef.current,
            round: roundRef.current,
            speedMultiplier: speedMult,
            bloonBoostActive: false,
            towerBoostActive: towerBoostRef.current > 0,
            envTimer: envTimerRef.current,
          },
          subDt,
          s === 0
        );
        envTimerRef.current = res.newEnvTimer;
        pendingCashDelta += res.cashEarned;

        if (res.livesLost > 0) {
          let dmg = res.livesLost;
          if (manaShieldRef.current > 0) {
            const absorbed = Math.min(manaShieldRef.current, dmg);
            manaShieldRef.current -= absorbed;
            dmg -= absorbed;
            setManaShield(manaShieldRef.current);
          }
          if (dmg > 0) {
            livesRef.current = Math.max(0, livesRef.current - dmg);
            setLives(livesRef.current);
            if (livesRef.current === 0 && !isSandbox) {
              setGameOverModalOpen(true);
              roundActiveRef.current = false;
              setRoundActive(false);
            }
          }
        }
      }

      // Sync Cash & Boss HP to React HUD at ~10Hz (every 100ms) so React never lags the 60fps canvas!
      if (hudSyncAccumulator >= 0.1) {
        hudSyncAccumulator = 0;
        if (pendingCashDelta > 0) {
          const added = pendingCashDelta;
          pendingCashDelta = 0;
          setCash((c) => c + added);
        }
        setTowerBoostTimer(towerBoostRef.current);

        const bossBloon = bloonsRef.current.find((b) => BLOON_SPECS[b.type]?.isBoss);
        if (bossBloon) {
          const bSpec = BLOON_SPECS[bossBloon.type];
          setActiveBossState({
            name: bSpec.name,
            type: bossBloon.type,
            hp: Math.max(0, Math.round(bossBloon.hp)),
            maxHp: bossBloon.maxHp,
            skulls: bSpec.bossSkulls || 5,
          });
        } else {
          setActiveBossState((prev) => (prev !== null ? null : prev));
        }
      }

      // Check Round Completion
      if (
        roundActiveRef.current &&
        spawnQueueRef.current.length === 0 &&
        bloonsRef.current.length === 0
      ) {
        roundActiveRef.current = false;
        setRoundActive(false);

        let roundIncome = 100 + roundRef.current + pendingCashDelta;
        pendingCashDelta = 0;
        for (const t of towersRef.current) {
          const st = computeTowerStats(t, towersRef.current, map);
          if (st.incomePerRound > 0) {
            roundIncome += st.incomePerRound;
            t.cashGenerated += st.incomePerRound;
          }
        }
        setCash((c) => c + roundIncome);
        manaShieldRef.current = Math.min(25, manaShieldRef.current + 5);
        setManaShield(manaShieldRef.current);

        const finishedRound = roundRef.current;
        if (finishedRound === maxRound && !isEndless && !isSandbox) {
          onVictoryUnlock(map.id, difficulty);
          setVictoryModalOpen(true);
        } else {
          const nextR = finishedRound + 1;
          roundRef.current = nextR;
          setRound(nextR);
          if (autoStartRef.current) {
            setTimeout(() => startNextRound(nextR), 280);
          }
        }
      }

      // Render Canvas
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          renderGameScene(
            ctx,
            map,
            towersRef.current,
            bloonsRef.current,
            projectilesRef.current,
            effectsRef.current,
            {
              selectedTowerId,
              placingTowerSpecId: selectedShopSpecId,
              hoverPoint: hoverPointRef.current,
              removedObstacleIds: removedObsRef.current,
              timeSec: now / 1000,
            }
          );
        }
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [map, selectedTowerId, selectedShopSpecId, isEndless, isSandbox, maxRound]);

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    hoverPointRef.current = clientToLogicalCoords(e);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = clientToLogicalCoords(e);

    // 1. Place a new tower
    if (selectedShopSpecId) {
      const spec = TOWER_SPEC_MAP[selectedShopSpecId];
      if (!spec) return;
      const actualCost = Math.round(spec.cost * diffCfg.costMult);
      if (cash < actualCost) {
        triggerBanner(`Not enough cash! Need $${actualCost.toLocaleString()}`);
        return;
      }

      const check = canPlaceTowerAt(spec.id, pt.x, pt.y, map, towers, removedObstacleIds);
      if (!check.valid) {
        triggerBanner(check.reason || 'Cannot place tower here');
        return;
      }

      const newTower: PlacedTower = {
        id: `tw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        specId: spec.id,
        x: pt.x,
        y: pt.y,
        angle: 0,
        tiers: [0, 0, 0],
        targetPriority: 'first',
        totalSpent: actualCost,
        pops: 0,
        cashGenerated: 0,
        cooldownTimer: 0.1,
        abilityCooldownTimer: 0,
      };

      soundFX.playPlaceTower();
      setCash((c) => c - actualCost);
      setTowers((prev) => [...prev, newTower]);
      setSelectedShopSpecId(null);
      setSelectedTowerId(newTower.id);
      setSelectedObstacleId(null);
      return;
    }

    // 2. Click existing tower
    for (let i = towers.length - 1; i >= 0; i--) {
      const t = towers[i];
      const spec = TOWER_SPEC_MAP[t.specId];
      const r = (spec?.footprintRadius || 18) + 7;
      if (Math.hypot(pt.x - t.x, pt.y - t.y) <= r) {
        setSelectedTowerId(t.id);
        setSelectedObstacleId(null);
        return;
      }
    }

    // 3. Click removable obstacle
    for (const obs of map.obstacles) {
      if (removedObstacleIds.includes(obs.id)) continue;
      if (Math.hypot(pt.x - obs.x, pt.y - obs.y) <= obs.radius + 5) {
        setSelectedObstacleId(obs.id);
        setSelectedTowerId(null);
        return;
      }
    }

    setSelectedTowerId(null);
    setSelectedObstacleId(null);
  };

  const handleUpgradeTower = (towerId: string, pathIndex: 0 | 1 | 2, cost: number) => {
    if (cash < cost) return;
    soundFX.playUpgrade();
    setCash((c) => c - cost);
    setTowers((prev) =>
      prev.map((t) => {
        if (t.id !== towerId) return t;
        const nextTiers: [number, number, number] = [...t.tiers] as [number, number, number];
        nextTiers[pathIndex] += 1;
        return {
          ...t,
          tiers: nextTiers,
          totalSpent: t.totalSpent + cost,
        };
      })
    );
  };

  const handleSellTower = (towerId: string, refund: number) => {
    setCash((c) => c + refund);
    setTowers((prev) => prev.filter((t) => t.id !== towerId));
    setSelectedTowerId(null);
  };

  const handleChangePriority = (towerId: string, priority: TargetPriority) => {
    setTowers((prev) =>
      prev.map((t) => (t.id === towerId ? { ...t, targetPriority: priority } : t))
    );
  };

  const handleTriggerAbility = (towerId: string) => {
    const targetTower = towers.find((t) => t.id === towerId);
    if (!targetTower || targetTower.abilityCooldownTimer > 0) return;
    const stats = computeTowerStats(targetTower, towers, map);
    const cd = stats.abilityCooldown || 25;

    setTowers((prev) =>
      prev.map((t) => (t.id === towerId ? { ...t, abilityCooldownTimer: cd } : t))
    );

    if (
      targetTower.specId === 'sniper_monkey' ||
      targetTower.specId === 'banana_farm' ||
      targetTower.specId === 'druid'
    ) {
      const cashDrop = targetTower.specId === 'banana_farm' ? 2500 : 1100;
      setCash((c) => c + cashDrop);
      if (targetTower.specId === 'druid') {
        livesRef.current += 10;
        setLives(livesRef.current);
      }
      triggerBanner(`${stats.abilityName}: +$${cashDrop.toLocaleString()} Cash!`);
    } else if (targetTower.specId === 'ice_monkey' || targetTower.specId === 'ninja_monkey') {
      for (const b of bloonsRef.current) {
        b.slowFactor = 0.25;
        b.slowTimer = 8.0;
      }
      triggerBanner(`${stats.abilityName}: All Bloons slowed!`);
    } else {
      for (const b of bloonsRef.current) {
        b.hp -= 450;
      }
      effectsRef.current.push({
        id: `fx_abil_${Date.now()}`,
        x: CANVAS_WIDTH / 2,
        y: CANVAS_HEIGHT / 2,
        radius: 320,
        color: 'rgba(250, 204, 21, 0.45)',
        life: 0.45,
        maxLife: 0.45,
        kind: 'explosion',
      });
      triggerBanner(`${stats.abilityName} Activated!`);
    }
  };

  const handleExportCurrentSave = () => {
    onExportSaveFile({
      mapId: map.id,
      customMap: map.mode === 'custom' ? map : undefined,
      difficulty,
      isSandbox,
      isEndless,
      round,
      maxRound,
      cash,
      lives,
      manaShield,
      towers,
      removedObstacleIds,
    });
    triggerBanner('Save file downloaded! Load it on any device to resume.');
  };

  const selectedTower = towers.find((t) => t.id === selectedTowerId) || null;
  const selectedObstacle =
    map.obstacles.find((o) => o.id === selectedObstacleId && !removedObstacleIds.includes(o.id)) ||
    null;

  const activeShopSpec = selectedShopSpecId
    ? TOWER_SPEC_MAP[selectedShopSpecId]
    : selectedTower
      ? TOWER_SPEC_MAP[selectedTower.specId]
      : TOWER_SPECS[4];

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#1b120c] flex flex-col select-none">
      <div className="flex-1 flex min-h-0 relative">
        {/* CENTER / LEFT GAMEPORT */}
        <div className="flex-1 relative bg-[#1e4620] overflow-hidden">
          <canvas
            ref={canvasRef}
            onMouseMove={handleCanvasMouseMove}
            onClick={handleCanvasClick}
            className="w-full h-full block cursor-crosshair"
          />

          {/* TOP-LEFT HUD: Heart Lives (+Mana Shield) & Coin Cash */}
          <div className="absolute top-3 left-4 flex items-start gap-6 pointer-events-none">
            <div className="flex items-center gap-2">
              <div className="relative flex flex-col items-center">
                <div className="w-11 h-11 rounded-full bg-gradient-to-b from-cyan-300 to-blue-600 p-0.5 shadow-lg flex items-center justify-center border-2 border-white">
                  <Heart className="w-6 h-6 text-red-500 fill-red-500 drop-shadow" />
                </div>
                {manaShield > 0 && (
                  <span className="font-display font-bold text-sm text-cyan-300 btd-text-stroke -mt-1">
                    +{manaShield}
                  </span>
                )}
              </div>
              <span className="font-display font-bold text-3xl text-white btd-text-stroke tracking-tight">
                {lives.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-11 h-11 rounded-full bg-gradient-to-b from-amber-300 to-amber-600 border-2 border-amber-100 shadow-lg flex items-center justify-center">
                <Coins className="w-6 h-6 text-amber-950 fill-amber-200" />
              </div>
              <span className="font-display font-bold text-3xl text-white btd-text-stroke tracking-tight">
                ${cash.toLocaleString()}
              </span>
            </div>
          </div>

          {/* TOP-CENTER BOSS HEALTH BAR WITH SKULL MILESTONES */}
          {activeBossState && (
            <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-full max-w-md px-3 pointer-events-none">
              <div className="flex items-center gap-2">
                <div className="w-14 h-14 rounded-full bg-purple-950 border-2 border-emerald-400 shadow-xl flex items-center justify-center shrink-0">
                  <BloonIcon type={activeBossState.type} size={42} />
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between text-xs font-display font-bold text-white btd-text-stroke-sm mb-0.5">
                    <div className="flex items-center gap-1 text-sky-300">
                      <span>★</span>
                      <span className="text-slate-400">★★★★</span>
                      <span className="ml-1 text-emerald-300 uppercase">{activeBossState.name}</span>
                    </div>
                    <span className="font-mono-num text-sm">
                      {activeBossState.hp.toLocaleString()} / {activeBossState.maxHp.toLocaleString()}
                    </span>
                  </div>

                  <div className="relative h-6 rounded-lg bg-slate-900/90 border-2 border-sky-400 overflow-hidden shadow-lg">
                    <div
                      className="h-full bg-gradient-to-r from-red-600 via-amber-400 to-lime-400 transition-all duration-150"
                      style={{
                        width: `${Math.min(
                          100,
                          Math.max(0, (activeBossState.hp / activeBossState.maxHp) * 100)
                        )}%`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-evenly px-4">
                      {Array.from({ length: activeBossState.skulls }).map((_, idx) => (
                        <div
                          key={idx}
                          className="w-5 h-5 rounded-full bg-slate-950/85 border border-amber-200/70 flex items-center justify-center shadow"
                        >
                          <Skull className="w-3.5 h-3.5 text-amber-100" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TOP-RIGHT HUD: ROUND COUNTER + SETTINGS GEAR (And Sandbox Admin button ONLY when in Sandbox mode!) */}
          <div className="absolute top-3 right-4 flex items-center gap-2.5">
            <div className="text-right mr-1">
              <div className="text-xs font-display font-bold uppercase text-amber-200 btd-text-stroke-sm leading-none">
                {isEndless ? 'ENDLESS ROUND' : isSandbox ? 'SANDBOX ROUND' : 'ROUND'}
              </div>
              <div className="font-display font-bold text-3xl text-white btd-text-stroke leading-none">
                {round}
                {!isEndless && !isSandbox && (
                  <span className="text-lg text-amber-200">/{maxRound}</span>
                )}
              </div>
            </div>

            {isSandbox && (
              <button
                onClick={() => setShowAdminPanel((v) => !v)}
                className={`px-3 py-2 rounded-xl border-2 font-display font-bold text-xs flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 ${
                  showAdminPanel
                    ? 'bg-amber-400 border-white text-slate-950'
                    : 'bg-purple-700 hover:bg-purple-600 border-purple-300 text-white'
                }`}
              >
                <Wrench className="w-4 h-4" />
                <span>Admin Panel</span>
              </button>
            )}

            <button
              onClick={() => setShowSettingsModal(true)}
              aria-label="Open Game Settings"
              className="w-11 h-11 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 border-2 border-sky-100 shadow-lg flex items-center justify-center text-white transition-transform active:scale-95"
            >
              <Settings className="w-6 h-6" />
            </button>
          </div>

          {statusBanner && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-slate-950/90 border border-amber-400 text-amber-200 font-display font-bold text-sm shadow-xl pointer-events-none">
              {statusBanner}
            </div>
          )}

          {selectedShopSpecId && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-xl bg-slate-950/90 border-2 border-emerald-400 text-white font-display text-sm flex items-center gap-3 shadow-xl">
              <span>
                Click on valid terrain to place{' '}
                <strong className="text-emerald-300">
                  {TOWER_SPEC_MAP[selectedShopSpecId]?.name}
                </strong>
              </span>
              <button
                onClick={() => setSelectedShopSpecId(null)}
                className="px-2.5 py-0.5 rounded bg-red-600 text-xs font-bold uppercase"
              >
                Cancel
              </button>
            </div>
          )}

          {selectedObstacle && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 wood-panel rounded-xl px-4 py-2.5 flex items-center gap-4 text-white shadow-2xl">
              <div>
                <div className="font-display font-bold text-sm uppercase">
                  Remove {selectedObstacle.kind} Obstacle?
                </div>
                <div className="text-xs text-amber-100">
                  Clears space for towers and opens Line-of-Sight.
                </div>
              </div>
              <button
                onClick={() => {
                  const cost = selectedObstacle.removableCost || 500;
                  if (cash < cost) {
                    triggerBanner(`Need $${cost} to remove obstacle`);
                    return;
                  }
                  setCash((c) => c - cost);
                  setRemovedObstacleIds((prev) => [...prev, selectedObstacle.id]);
                  setSelectedObstacleId(null);
                  soundFX.playUpgrade();
                }}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs uppercase"
              >
                Remove ${selectedObstacle.removableCost || 500}
              </button>
              <button
                onClick={() => setSelectedObstacleId(null)}
                className="px-2 py-1 text-xs text-amber-200 hover:text-white"
              >
                Cancel
              </button>
            </div>
          )}

          {/* SANDBOX ADMIN CONTROLS PANEL (Only in Sandbox Mode!) */}
          {isSandbox && showAdminPanel && (
            <div className="absolute bottom-16 left-4 z-20 w-[440px] max-w-[92vw] wood-panel rounded-2xl p-3.5 text-white shadow-2xl">
              <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-[#6b3518]">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-300" />
                  <h3 className="font-display font-bold text-sm uppercase tracking-wide btd-text-stroke-sm">
                    Sandbox Admin Controls
                  </h3>
                </div>
                <button
                  onClick={() => setShowAdminPanel(false)}
                  className="text-xs text-amber-200 hover:text-white font-bold px-2 py-0.5 rounded bg-black/30"
                >
                  Minimize
                </button>
              </div>

              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                <button
                  onClick={() => setCash((c) => c + 10000)}
                  className="py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 border border-emerald-300 font-display font-bold text-xs"
                >
                  +$10,000 Cash
                </button>
                <button
                  onClick={() => setCash((c) => c + 100000)}
                  className="py-1.5 px-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-xs"
                >
                  +$100,000 Cash
                </button>
                <button
                  onClick={() => {
                    livesRef.current = 9999;
                    setLives(9999);
                    manaShieldRef.current = 25;
                    setManaShield(25);
                  }}
                  className="py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 border border-rose-300 font-display font-bold text-xs"
                >
                  Set 9,999 Lives
                </button>
                <button
                  onClick={() => {
                    bloonsRef.current = [];
                    spawnQueueRef.current = [];
                  }}
                  className="py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 font-display font-bold text-xs"
                >
                  Clear Bloons
                </button>
                <button
                  onClick={() => {
                    setTowers([]);
                    setSelectedTowerId(null);
                  }}
                  className="py-1.5 px-2 rounded-lg bg-red-700 hover:bg-red-600 font-display font-bold text-xs"
                >
                  Clear Towers
                </button>
                <button
                  onClick={() => {
                    setTowers((prev) =>
                      prev.map((t) => ({ ...t, abilityCooldownTimer: 0 }))
                    );
                  }}
                  className="py-1.5 px-2 rounded-lg bg-sky-600 hover:bg-sky-500 font-display font-bold text-xs"
                >
                  Reset Cooldowns
                </button>
              </div>

              <div className="flex items-center gap-2 mb-2.5 bg-black/25 p-1.5 rounded-lg">
                <span className="text-xs font-bold text-amber-200">Set Round:</span>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={adminRoundInput}
                  onChange={(e) => setAdminRoundInput(e.target.value)}
                  className="w-20 px-2 py-1 rounded bg-slate-900 border border-amber-500/50 text-white font-mono-num text-xs"
                />
                <button
                  onClick={() => {
                    const parsed = Math.max(1, Math.min(999, Number(adminRoundInput) || 1));
                    roundRef.current = parsed;
                    setRound(parsed);
                    triggerBanner(`Round set to ${parsed}`);
                  }}
                  className="px-2.5 py-1 rounded bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
                >
                  Apply
                </button>

                <div className="ml-auto flex items-center gap-1">
                  {[1, 5, 20].map((cnt) => (
                    <button
                      key={cnt}
                      onClick={() => setAdminBatchCount(cnt)}
                      className={`px-2 py-0.5 rounded text-xs font-mono-num font-bold ${
                        adminBatchCount === cnt
                          ? 'bg-amber-400 text-slate-950'
                          : 'bg-slate-800 text-amber-200'
                      }`}
                    >
                      x{cnt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setAdminCamo((v) => !v)}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold uppercase border ${
                    adminCamo
                      ? 'bg-emerald-500 text-slate-950 border-white'
                      : 'bg-black/30 text-amber-100 border-amber-900'
                  }`}
                >
                  Camo {adminCamo ? '✓' : ''}
                </button>
                <button
                  onClick={() => setAdminRegrow((v) => !v)}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold uppercase border ${
                    adminRegrow
                      ? 'bg-pink-500 text-white border-white'
                      : 'bg-black/30 text-amber-100 border-amber-900'
                  }`}
                >
                  Regrow {adminRegrow ? '✓' : ''}
                </button>
                <button
                  onClick={() => setAdminFortified((v) => !v)}
                  className={`flex-1 py-1 rounded-lg text-xs font-bold uppercase border ${
                    adminFortified
                      ? 'bg-orange-500 text-slate-950 border-white'
                      : 'bg-black/30 text-amber-100 border-amber-900'
                  }`}
                >
                  Fortified {adminFortified ? '✓' : ''}
                </button>
              </div>

              <div className="text-[11px] text-amber-200 mb-1 font-semibold">
                Click any Bloon or Boss below to spawn on track:
              </div>
              <div className="grid grid-cols-7 gap-1.5 max-h-40 overflow-y-auto pr-1">
                {ALL_SANDBOX_BLOONS.map((bType) => {
                  const bSpec = BLOON_SPECS[bType];
                  return (
                    <button
                      key={bType}
                      onClick={() => handleSandboxSendBloon(bType)}
                      title={`Send ${bSpec.name} (HP: ${bSpec.hp})`}
                      className="wood-panel-dark hover:border-amber-300 rounded-lg p-1 flex flex-col items-center justify-center transition-transform active:scale-90"
                    >
                      <BloonIcon
                        type={bType}
                        size={26}
                        camo={adminCamo}
                        regrow={adminRegrow}
                        fortified={adminFortified}
                      />
                      <span className="text-[9px] font-bold text-amber-100 truncate w-full text-center mt-0.5">
                        {bSpec.name.replace('Bloon', '').replace('the Inflator', '').trim()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SELECTED TOWER UPGRADE INSPECTOR OVERLAY */}
          {selectedTower && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-30 w-full max-w-3xl px-3">
              <TowerUpgradePanel
                tower={selectedTower}
                allTowers={towers}
                map={map}
                cash={cash}
                costMultiplier={diffCfg.costMult}
                onUpgrade={handleUpgradeTower}
                onSell={handleSellTower}
                onChangePriority={handleChangePriority}
                onTriggerAbility={handleTriggerAbility}
                onClose={() => setSelectedTowerId(null)}
              />
            </div>
          )}

          {/* BOTTOM-LEFT ABILITIES / BACK STRIP */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2 z-10">
            <button
              onClick={onBackToMenu}
              className="w-10 h-10 rounded-full bg-sky-500 hover:bg-sky-400 border-2 border-white shadow-lg flex items-center justify-center text-white"
              title="Return to Main Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {towers
              .filter((t) => computeTowerStats(t, towers, map).abilityName)
              .map((t) => {
                const st = computeTowerStats(t, towers, map);
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTriggerAbility(t.id)}
                    disabled={t.abilityCooldownTimer > 0}
                    className={`px-2.5 py-1.5 rounded-xl border-2 flex items-center gap-1.5 text-xs font-display font-bold shadow-lg ${
                      t.abilityCooldownTimer > 0
                        ? 'bg-slate-800/90 border-slate-500 text-slate-400'
                        : 'bg-amber-400 hover:bg-amber-300 border-white text-slate-950'
                    }`}
                  >
                    <Zap className="w-4 h-4 fill-current" />
                    <span>
                      {t.abilityCooldownTimer > 0
                        ? `${Math.ceil(t.abilityCooldownTimer)}s`
                        : st.abilityName}
                    </span>
                  </button>
                );
              })}
          </div>
        </div>

        {/* RIGHT SIDEBAR: WOODEN TOWER SHOP */}
        <aside className="w-56 md:w-60 wood-panel flex flex-col justify-between p-2.5 shrink-0 z-20">
          {/* Top Green "SAVE FILES" Button (Replaced "UPGRADES" as requested!) */}
          <div>
            <button
              onClick={() => setShowSaveFilesModal(true)}
              className="w-full py-2 rounded-xl bg-gradient-to-b from-[#65e424] to-[#3ca30d] hover:from-[#7bf03b] hover:to-[#47bd12] border-2 border-white shadow-md font-display font-bold text-base text-white uppercase tracking-wider btd-text-stroke-sm transition-transform active:scale-95"
            >
              SAVE FILES
            </button>
            <div className="text-center font-display font-bold text-xs uppercase text-amber-100 btd-text-stroke-sm py-1.5 truncate">
              {activeShopSpec?.name || 'MONKEY TOWERS'}
            </div>
          </div>

          {/* 2-Column Scrollable Monkey Grid */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-2 py-1 pr-0.5">
            {TOWER_SPECS.map((spec) => {
              const actualCost = Math.round(spec.cost * diffCfg.costMult);
              const canAfford = cash >= actualCost;
              const isSelected = selectedShopSpecId === spec.id;

              const catBg =
                spec.category === 'Hero'
                  ? 'from-amber-400 to-orange-600'
                  : spec.category === 'Primary'
                    ? 'from-sky-400 to-blue-600'
                    : spec.category === 'Military'
                      ? 'from-lime-400 to-emerald-700'
                      : spec.category === 'Magic'
                        ? 'from-purple-400 to-indigo-700'
                        : 'from-amber-300 to-amber-700';

              return (
                <button
                  key={spec.id}
                  onClick={() => {
                    setSelectedShopSpecId(isSelected ? null : spec.id);
                    setSelectedTowerId(null);
                  }}
                  title={`${spec.name}: ${spec.description}`}
                  className={`group relative rounded-xl p-1.5 flex flex-col items-center justify-between border-2 transition-transform active:scale-95 bg-gradient-to-b ${catBg} ${
                    isSelected
                      ? 'border-yellow-200 ring-2 ring-yellow-300 scale-[1.03]'
                      : canAfford
                        ? 'border-[#4a210d] hover:border-amber-200'
                        : 'border-[#361607] opacity-65'
                  }`}
                >
                  {spec.waterOnly && (
                    <span className="absolute top-1 right-1 text-[9px] font-bold px-1 rounded bg-sky-900/80 text-sky-200">
                      H2O
                    </span>
                  )}
                  <TowerPortraitIcon specId={spec.id} size={46} />
                  <span className="text-[10px] font-display font-bold text-white btd-text-stroke-sm truncate w-full text-center mt-0.5">
                    {spec.name.replace(' (Water)', '').replace(' (Platform)', '')}
                  </span>
                  <span
                    className={`font-display font-bold text-sm btd-text-stroke-sm leading-none ${
                      canAfford ? 'text-white' : 'text-red-300'
                    }`}
                  >
                    ${actualCost.toLocaleString()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Bottom Controls: 1x, 2x, 3x, 5x Speed Selector + Auto-Start on Start Button + Monkey Boost */}
          <div className="pt-2 space-y-1.5">
            {/* Speed Bar (1x, 2x, 3x, 5x) & Auto-Start Toggle right above Start Button */}
            <div className="flex items-center gap-1 bg-[#4a210d] p-1 rounded-xl border border-[#361607]">
              {GAME_SPEED_OPTIONS.map((spd) => (
                <button
                  key={spd}
                  onClick={() => setGameSpeed(spd)}
                  className={`flex-1 py-1 rounded-lg font-display font-bold text-xs transition-colors ${
                    gameSpeed === spd
                      ? 'bg-amber-400 text-slate-950 shadow'
                      : 'text-amber-100/80 hover:text-white'
                  }`}
                >
                  {spd}x
                </button>
              ))}
              <button
                onClick={() => setAutoStart((a) => !a)}
                title="Toggle Auto-Start Rounds"
                className={`px-2 py-1 rounded-lg font-display font-bold text-[10px] uppercase border transition-colors ${
                  autoStart
                    ? 'bg-[#65e424] border-white text-slate-950 shadow'
                    : 'bg-black/35 border-amber-900/60 text-amber-200'
                }`}
              >
                Auto {autoStart ? 'ON' : 'OFF'}
              </button>
            </div>

            {/* Boost + Start Round Row */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  if (towerBoostTimer > 0) return;
                  if (cash < 150 && !isSandbox) {
                    triggerBanner('Monkey Boost costs $150!');
                    return;
                  }
                  if (!isSandbox) setCash((c) => c - 150);
                  towerBoostRef.current = 12;
                  setTowerBoostTimer(12);
                  soundFX.playUpgrade();
                  triggerBanner('Monkey Boost Activated! +65% Attack Speed for 12s!');
                }}
                title="Monkey Boost ($150): Supercharges all Monkey attack speed for 12s!"
                className={`w-14 h-14 rounded-2xl border-2 border-white shadow-lg flex flex-col items-center justify-center transition-transform active:scale-95 shrink-0 ${
                  towerBoostTimer > 0
                    ? 'bg-amber-300 animate-pulse text-slate-950'
                    : 'bg-gradient-to-b from-yellow-300 to-amber-500 hover:from-yellow-200 hover:to-amber-400 text-white'
                }`}
              >
                <Zap className="w-7 h-7 fill-current drop-shadow" />
                {towerBoostTimer > 0 && (
                  <span className="text-[10px] font-mono-num font-bold text-slate-950">
                    {Math.ceil(towerBoostTimer)}s
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  if (!roundActive) {
                    startNextRound();
                  } else {
                    const nextIdx =
                      (GAME_SPEED_OPTIONS.indexOf(gameSpeed) + 1) % GAME_SPEED_OPTIONS.length;
                    setGameSpeed(GAME_SPEED_OPTIONS[nextIdx]);
                  }
                }}
                className="flex-1 h-14 rounded-2xl bg-gradient-to-b from-[#65e424] to-[#3ca30d] hover:from-[#7bf03b] hover:to-[#47bd12] border-2 border-white shadow-lg flex flex-col items-center justify-center text-white transition-transform active:scale-95"
              >
                {!roundActive ? (
                  <>
                    <Play className="w-7 h-7 fill-white drop-shadow" />
                    <span className="text-[10px] font-display font-bold uppercase btd-text-stroke-sm">
                      Start R{round} {autoStart ? '(Auto)' : ''}
                    </span>
                  </>
                ) : (
                  <>
                    <FastForward className="w-7 h-7 fill-yellow-300 text-yellow-300 drop-shadow" />
                    <span className="text-[10px] font-display font-bold uppercase btd-text-stroke-sm">
                      Playing ({gameSpeed}x)
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* SAVE FILES MODAL (Opened by the top-right "SAVE FILES" button!) */}
      {showSaveFilesModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="wood-panel rounded-2xl max-w-md w-full p-5 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#6b3518]">
              <h2 className="font-display font-bold text-xl uppercase btd-text-stroke">
                Cross-Device Save Files
              </h2>
              <button
                onClick={() => setShowSaveFilesModal(false)}
                className="px-2.5 py-1 rounded-lg bg-[#5c2c12] hover:bg-[#783918] text-sm font-bold"
              >
                Close
              </button>
            </div>

            <div className="wood-panel-dark p-4 rounded-xl space-y-3">
              <div className="font-display font-bold text-sm text-amber-300">
                Save or Load Your Run (.btdsave.json)
              </div>
              <p className="text-xs text-amber-100/85">
                Download your active PvE game state (Map: <strong>{map.name}</strong>, Round{' '}
                <strong>{round}</strong>, Cash <strong>${cash.toLocaleString()}</strong>, and{' '}
                <strong>{towers.length}</strong> placed towers) to resume on any device later.
              </p>

              <div className="flex flex-col gap-2.5 pt-1">
                <button
                  onClick={() => {
                    handleExportCurrentSave();
                    setShowSaveFilesModal(false);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-b from-[#65e424] to-[#3ca30d] border-2 border-white text-white font-display font-bold text-sm uppercase btd-text-stroke-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <Download className="w-4 h-4" />
                  Download Save File (.btdsave.json)
                </button>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 border-2 border-white text-white font-display font-bold text-sm uppercase btd-text-stroke-sm flex items-center justify-center gap-2 shadow-lg"
                >
                  <Upload className="w-4 h-4" />
                  Load Save File from Device
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,.btdsave"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      onImportSaveFile(f);
                      setShowSaveFilesModal(false);
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4">
          <div className="wood-panel rounded-2xl max-w-md w-full p-5 text-white shadow-2xl">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#6b3518]">
              <h2 className="font-display font-bold text-xl uppercase btd-text-stroke">
                Game Settings
              </h2>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-2.5 py-1 rounded-lg bg-[#5c2c12] hover:bg-[#783918] text-sm font-bold"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between wood-panel-dark p-3 rounded-xl">
                <span className="font-display font-bold text-sm">Sound Effects</span>
                <button
                  onClick={() => {
                    soundFX.muted = !muted;
                    setMuted(soundFX.muted);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 text-slate-950 font-bold text-xs flex items-center gap-1.5"
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  {muted ? 'Muted' : 'Active'}
                </button>
              </div>

              <div className="flex items-center justify-between wood-panel-dark p-3 rounded-xl">
                <span className="font-display font-bold text-sm">Auto-Start Rounds</span>
                <button
                  onClick={() => setAutoStart((a) => !a)}
                  className={`px-3 py-1.5 rounded-lg font-bold text-xs ${
                    autoStart ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-200'
                  }`}
                >
                  {autoStart ? 'Enabled' : 'Disabled'}
                </button>
              </div>

              <button
                onClick={onBackToMenu}
                className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 border-2 border-red-900 font-display font-bold text-sm uppercase"
              >
                Return to Main Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY MODAL */}
      {victoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="wood-panel rounded-2xl max-w-md w-full p-6 text-center text-white shadow-2xl">
            <div className="text-amber-300 font-display font-bold text-3xl uppercase btd-text-stroke mb-2">
              VICTORY!
            </div>
            <p className="text-sm text-amber-100 mb-5">
              You conquered <strong>{map.name}</strong> on <strong>{difficulty}</strong> difficulty
              (Round {maxRound})!
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  setIsEndless(true);
                  setVictoryModalOpen(false);
                  roundRef.current += 1;
                  setRound(roundRef.current);
                  triggerBanner('Entered Endless Freeplay Mode! Rounds scale infinitely!');
                }}
                className="w-full py-3 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 border-2 border-white font-display font-bold text-base uppercase flex items-center justify-center gap-2 shadow-lg"
              >
                <InfinityIcon className="w-5 h-5" />
                Continue in Endless Mode
              </button>
              <button
                onClick={handleExportCurrentSave}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-200 font-display font-bold text-sm uppercase flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" />
                Download Victory Save File
              </button>
              <button
                onClick={onBackToMenu}
                className="w-full py-2.5 rounded-xl bg-[#5c2c12] hover:bg-[#783918] font-display font-bold text-sm uppercase"
              >
                Return to Main Hub
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {gameOverModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="wood-panel rounded-2xl max-w-md w-full p-6 text-center text-white shadow-2xl">
            <div className="text-red-400 font-display font-bold text-3xl uppercase btd-text-stroke mb-2">
              DEFEAT — ROUND {round}
            </div>
            <p className="text-sm text-amber-100 mb-5">
              The Bloons broke through your defenses on {map.name}.
            </p>
            <div className="flex flex-col gap-2.5">
              <button
                onClick={() => {
                  bloonsRef.current = [];
                  spawnQueueRef.current = [];
                  livesRef.current = diffCfg.startLives;
                  setLives(diffCfg.startLives);
                  manaShieldRef.current = 14;
                  setManaShield(14);
                  setCash((c) => c + 1500);
                  setGameOverModalOpen(false);
                }}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-display font-bold text-base uppercase flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                Retry Round {round} (+$1,500 Bonus)
              </button>
              <button
                onClick={onBackToMenu}
                className="w-full py-2.5 rounded-xl bg-[#5c2c12] hover:bg-[#783918] font-display font-bold text-sm uppercase"
              >
                Return to Main Hub
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
