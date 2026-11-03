import React, { useEffect, useRef, useState } from 'react';
import {
  ActiveBloon,
  BloonType,
  GameMap,
  PlacedTower,
  Point,
  Projectile,
  PvPBloonSendSpec,
  TargetPriority,
  VisualEffect,
} from '../types/game';
import { PVP_BLOON_SENDS, generateRoundWaves } from '../data/bloons';
import { TOWER_SPEC_MAP } from '../data/towers';
import {
  canPlaceTowerAt,
  clientToLogicalCoords,
  createActiveBloon,
  renderGameScene,
} from '../engine/simEngine';
import { stepGameSimulation } from '../engine/stepSimulation';
import { BloonIcon, TowerPortraitIcon } from './GameIcons';
import { TowerUpgradePanel } from './TowerUpgradePanel';
import { soundFX } from '../utils/sound';
import { Flag, Lock, MessageSquare, Repeat, Skull } from 'lucide-react';

interface PvPViewProps {
  map: GameMap;
  playerName: string;
  opponentName: string;
  playerHero: string;
  playerLoadout: string[];
  isAiPractice: boolean;
  partyCode?: string | null;
  wsRef?: React.MutableRefObject<WebSocket | null>;
  playerId: string;
  onExitMatch: () => void;
}

interface QueuedBloonSendItem {
  queueId: string;
  sendSpec: PvPBloonSendSpec;
  remainingCount: number;
  totalCount: number;
  camo: boolean;
  regrow: boolean;
  fortified: boolean;
}

const MAX_SEND_QUEUE_SLOTS = 7;

export const PvPView: React.FC<PvPViewProps> = ({
  map,
  playerName,
  opponentName,
  playerHero,
  playerLoadout,
  isAiPractice,
  partyCode,
  wsRef,
  playerId,
  onExitMatch,
}) => {
  // Player State
  const [lives, setLives] = useState<number>(150);
  const [cash, setCash] = useState<number>(650);
  const [eco, setEco] = useState<number>(250);
  const [round, setRound] = useState<number>(1);
  const maxRound = 40;

  // Opponent State
  const [oppLives, setOppLives] = useState<number>(150);
  const [oppCash, setOppCash] = useState<number>(650);
  const [oppEco, setOppEco] = useState<number>(250);

  // Player Towers & Selection
  const [towers, setTowers] = useState<PlacedTower[]>([]);
  const [oppTowers, setOppTowers] = useState<PlacedTower[]>([]);
  const [selectedShopSpecId, setSelectedShopSpecId] = useState<string | null>(null);
  const [selectedTowerId, setSelectedTowerId] = useState<string | null>(null);

  // Modifiers for Bloon Sends
  const [sendCamo, setSendCamo] = useState<boolean>(false);
  const [sendRegrow, setSendRegrow] = useState<boolean>(false);
  const [sendFortified, setSendFortified] = useState<boolean>(false);

  // Auto-Sender State for Bloons!
  const [autoSendSpecId, setAutoSendSpecId] = useState<string | null>(null);

  // Player's Outgoing Bloon Send Queue (Displayed vertically covering the ENTIRE middle bar!)
  const [playerSendQueue, setPlayerSendQueue] = useState<QueuedBloonSendItem[]>([]);
  const playerSendQueueRef = useRef<QueuedBloonSendItem[]>([]);
  playerSendQueueRef.current = playerSendQueue;

  // Boosts
  const [bloonBoostCharges, setBloonBoostCharges] = useState<number>(3);
  const [towerBoostCharges, setTowerBoostCharges] = useState<number>(3);
  const [bloonBoostTimer, setBloonBoostTimer] = useState<number>(0);
  const [towerBoostTimer, setTowerBoostTimer] = useState<number>(0);

  // Emotes & Match End
  const [showEmotePicker, setShowEmotePicker] = useState<boolean>(false);
  const [activeEmoteBubble, setActiveEmoteBubble] = useState<{
    who: 'self' | 'opponent';
    emote: string;
  } | null>(null);
  const [matchResult, setMatchResult] = useState<{
    winner: 'self' | 'opponent';
    reason: string;
  } | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);

  // Canvas & Simulation Refs
  const leftCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rightCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const playerBloonsRef = useRef<ActiveBloon[]>([]);
  const playerProjRef = useRef<Projectile[]>([]);
  const playerFxRef = useRef<VisualEffect[]>([]);

  const oppBloonsRef = useRef<ActiveBloon[]>([]);
  const oppProjRef = useRef<Projectile[]>([]);
  const oppFxRef = useRef<VisualEffect[]>([]);

  const towersRef = useRef<PlacedTower[]>(towers);
  towersRef.current = towers;
  const oppTowersRef = useRef<PlacedTower[]>(oppTowers);
  oppTowersRef.current = oppTowers;

  const cashRef = useRef<number>(cash);
  cashRef.current = cash;
  const ecoRef = useRef<number>(eco);
  ecoRef.current = eco;
  const livesRef = useRef<number>(lives);
  livesRef.current = lives;
  const oppLivesRef = useRef<number>(oppLives);
  oppLivesRef.current = oppLives;
  const oppCashRef = useRef<number>(oppCash);
  oppCashRef.current = oppCash;
  const oppEcoRef = useRef<number>(oppEco);
  oppEcoRef.current = oppEco;
  const roundRef = useRef<number>(round);
  roundRef.current = round;
  const matchResultRef = useRef(matchResult);
  matchResultRef.current = matchResult;

  const autoSendSpecIdRef = useRef<string | null>(autoSendSpecId);
  autoSendSpecIdRef.current = autoSendSpecId;
  const sendCamoRef = useRef<boolean>(sendCamo);
  sendCamoRef.current = sendCamo;
  const sendRegrowRef = useRef<boolean>(sendRegrow);
  sendRegrowRef.current = sendRegrow;
  const sendFortifiedRef = useRef<boolean>(sendFortified);
  sendFortifiedRef.current = sendFortified;

  const selectedShopSpecIdRef = useRef<string | null>(selectedShopSpecId);
  selectedShopSpecIdRef.current = selectedShopSpecId;
  const selectedTowerIdRef = useRef<string | null>(selectedTowerId);
  selectedTowerIdRef.current = selectedTowerId;

  const bloonBoostTimerRef = useRef<number>(bloonBoostTimer);
  bloonBoostTimerRef.current = bloonBoostTimer;
  const towerBoostTimerRef = useRef<number>(towerBoostTimer);
  towerBoostTimerRef.current = towerBoostTimer;
  const oppTowerBoostTimerRef = useRef<number>(0);
  const oppBloonBoostTimerRef = useRef<number>(0);

  const hoverPointRef = useRef<Point | null>(null);
  const fullDeckIds = [playerHero, ...playerLoadout];

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => {
      setStatusToast((prev) => (prev === msg ? null : prev));
    }, 2400);
  };

  // Immediately broadcast our board state to our opponent (called on tower actions & periodically)
  const broadcastBoardSync = (overrideTowers?: PlacedTower[]) => {
    if (isAiPractice || !wsRef?.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const activeTowers = overrideTowers ?? towersRef.current;
    wsRef.current.send(
      JSON.stringify({
        type: 'board_sync',
        lives: livesRef.current,
        cash: cashRef.current,
        eco: ecoRef.current,
        round: roundRef.current,
        towers: activeTowers,
        bloons: playerBloonsRef.current.slice(0, 120),
        activeBoosts: {
          towerBoost: towerBoostTimerRef.current > 0,
          bloonBoost: bloonBoostTimerRef.current > 0,
        },
      })
    );
  };

  // Listen to WebSocket / P2P events when in a real 6-digit Party match
  useEffect(() => {
    if (isAiPractice || !wsRef?.current) return;
    const ws = wsRef.current;

    const onMessage = (ev: MessageEvent) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'opponent_bloon_send') {
          const bType = msg.bloonType as BloonType;
          const cnt = Number(msg.count) || 1;
          const spacing = Number(msg.spacing) || 0.2;
          if (typeof msg.senderEco === 'number') {
            oppEcoRef.current = msg.senderEco;
            setOppEco(msg.senderEco);
          }
          if (typeof msg.senderCash === 'number') {
            oppCashRef.current = msg.senderCash;
            setOppCash(msg.senderCash);
          }

          // Spawn incoming opponent rush on Player's Left Canvas
          for (let i = 0; i < cnt; i++) {
            setTimeout(() => {
              if (playerBloonsRef.current.length < 450) {
                playerBloonsRef.current.push(
                  createActiveBloon(bType, 0, 0, map, {
                    camo: Boolean(msg.camo),
                    regrow: Boolean(msg.regrow),
                    fortified: Boolean(msg.fortified),
                  })
                );
              }
            }, i * spacing * 1000);
          }
        } else if (msg.type === 'opponent_board_sync') {
          if (typeof msg.lives === 'number') {
            oppLivesRef.current = msg.lives;
            setOppLives(msg.lives);
          }
          if (typeof msg.eco === 'number') {
            oppEcoRef.current = msg.eco;
            setOppEco(msg.eco);
          }
          if (typeof msg.cash === 'number') {
            oppCashRef.current = msg.cash;
            setOppCash(msg.cash);
          }
          if (msg.activeBoosts && typeof msg.activeBoosts === 'object') {
            oppTowerBoostTimerRef.current = msg.activeBoosts.towerBoost ? 1.0 : 0;
            oppBloonBoostTimerRef.current = msg.activeBoosts.bloonBoost ? 1.0 : 0;
          }
          if (Array.isArray(msg.towers)) {
            // Merge with local oppTowersRef so existing towers preserve smooth firing cooldowns & turret angles
            const prevMap = new Map<string, PlacedTower>(
              oppTowersRef.current.map((t) => [t.id, t])
            );
            const mergedTowers: PlacedTower[] = (msg.towers as PlacedTower[]).map((incomingTw) => {
              const existing = prevMap.get(incomingTw.id);
              if (existing) {
                return {
                  ...incomingTw,
                  angle: existing.angle,
                  cooldownTimer: existing.cooldownTimer,
                };
              }
              return { ...incomingTw };
            });
            oppTowersRef.current = mergedTowers;
            setOppTowers(mergedTowers);
          }
          if (Array.isArray(msg.bloons)) {
            oppBloonsRef.current = (msg.bloons as ActiveBloon[]).map((b) => ({ ...b }));
          }
        } else if (msg.type === 'player_emote') {
          setActiveEmoteBubble({ who: 'opponent', emote: msg.emote });
          setTimeout(() => setActiveEmoteBubble(null), 3000);
        } else if (msg.type === 'match_ended') {
          const won = msg.winnerId === playerId;
          setMatchResult({
            winner: won ? 'self' : 'opponent',
            reason: msg.reason || (won ? 'Opponent Defeated!' : 'Your Lives Reached 0!'),
          });
        } else if (msg.type === 'player_left') {
          setMatchResult({
            winner: 'self',
            reason: 'Opponent disconnected from the party!',
          });
        }
      } catch (e) {
        console.error(e);
      }
    };

    ws.addEventListener('message', onMessage);
    // Send initial board sync as soon as match starts
    broadcastBoardSync();
    return () => ws.removeEventListener('message', onMessage);
  }, [isAiPractice, wsRef, map, playerId]);

  const spawnNaturalWaveOnBothBoards = (r: number) => {
    const groups = generateRoundWaves(r, false);
    for (const grp of groups) {
      for (let i = 0; i < grp.count; i++) {
        const delayMs = (grp.delay + i * grp.spacing) * 1000;
        setTimeout(() => {
          if (matchResultRef.current) return;
          if (playerBloonsRef.current.length < 450) {
            playerBloonsRef.current.push(
              createActiveBloon(grp.type, 0, 0, map, {
                camo: grp.camo,
                regrow: grp.regrow,
                fortified: grp.fortified,
              })
            );
          }
          if (oppBloonsRef.current.length < 450) {
            oppBloonsRef.current.push(
              createActiveBloon(grp.type, 0, 0, map, {
                camo: grp.camo,
                regrow: grp.regrow,
                fortified: grp.fortified,
              })
            );
          }
        }, delayMs);
      }
    }
  };

  useEffect(() => {
    spawnNaturalWaveOnBothBoards(1);
  }, []);

  // Queue a Bloon Send into the Player's Center Send Queue
  const tryEnqueueBloonSend = (sendSpec: PvPBloonSendSpec, silent: boolean = false): boolean => {
    if (roundRef.current < sendSpec.unlockRound) return false;
    if (playerSendQueueRef.current.length >= MAX_SEND_QUEUE_SLOTS) {
      if (!silent) showToast('Send Queue full (7/7)!');
      return false;
    }

    const cFlag = sendCamoRef.current;
    const rFlag = sendRegrowRef.current;
    const fFlag = sendFortifiedRef.current;
    const modMult = (cFlag ? 1.4 : 1.0) * (rFlag ? 1.3 : 1.0) * (fFlag ? 1.6 : 1.0);
    const finalCost = Math.round(sendSpec.cost * modMult);

    if (cashRef.current < finalCost) {
      if (!silent) showToast(`Need $${finalCost} to send ${sendSpec.name}`);
      return false;
    }

    cashRef.current -= finalCost;
    setCash(cashRef.current);

    const nextEco = Math.max(50, +(ecoRef.current + sendSpec.ecoChange).toFixed(1));
    ecoRef.current = nextEco;
    setEco(nextEco);

    const newItem: QueuedBloonSendItem = {
      queueId: `sq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      sendSpec,
      remainingCount: sendSpec.count,
      totalCount: sendSpec.count,
      camo: cFlag,
      regrow: rFlag,
      fortified: fFlag,
    };

    const updatedQueue = [...playerSendQueueRef.current, newItem];
    playerSendQueueRef.current = updatedQueue;
    setPlayerSendQueue(updatedQueue);

    if (!isAiPractice && wsRef?.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'bloon_send',
          sendId: sendSpec.id,
          bloonType: sendSpec.bloonType,
          count: sendSpec.count,
          spacing: sendSpec.spacing,
          camo: cFlag,
          regrow: rFlag,
          fortified: fFlag,
          eco: nextEco,
          cash: cashRef.current,
        })
      );
    }

    return true;
  };

  // Main 60FPS Dual-Canvas Loop + Center Send Queue Dispatcher + Auto-Sender!
  useEffect(() => {
    let animId: number;
    let lastTime = performance.now();
    let ecoTimer = 0;
    let roundTimer = 0;
    let aiActionTimer = 0;
    let wsSyncTimer = 0;
    let hudSyncTimer = 0;
    let sendDrainTimer = 0;
    let autoSendTimer = 0;
    let pEnvTimer = 0;
    let oEnvTimer = 0;
    let pendingPlayerCash = 0;
    let pendingOppCash = 0;

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (!matchResultRef.current) {
        // 1. Drain Player's Outgoing Send Queue onto Opponent's Board!
        if (playerSendQueueRef.current.length > 0) {
          const head = playerSendQueueRef.current[0];
          sendDrainTimer += dt;
          if (sendDrainTimer >= head.sendSpec.spacing) {
            sendDrainTimer = 0;
            if (oppBloonsRef.current.length < 450) {
              oppBloonsRef.current.push(
                createActiveBloon(head.sendSpec.bloonType, 0, 0, map, {
                  camo: head.camo,
                  regrow: head.regrow,
                  fortified: head.fortified,
                })
              );
            }
            head.remainingCount -= 1;
            if (head.remainingCount <= 0) {
              const nextQ = playerSendQueueRef.current.slice(1);
              playerSendQueueRef.current = nextQ;
              setPlayerSendQueue(nextQ);
            } else {
              setPlayerSendQueue([...playerSendQueueRef.current]);
            }
          }
        }

        // 2. Auto-Sender for Bloons: automatically keeps queuing the selected Auto-Send bloon!
        if (autoSendSpecIdRef.current) {
          autoSendTimer += dt;
          if (
            autoSendTimer >= 0.35 &&
            playerSendQueueRef.current.length < MAX_SEND_QUEUE_SLOTS
          ) {
            autoSendTimer = 0;
            const targetSpec = PVP_BLOON_SENDS.find((s) => s.id === autoSendSpecIdRef.current);
            if (targetSpec) {
              tryEnqueueBloonSend(targetSpec, true);
            }
          }
        }

        // 3. Battles 2 Eco Payout every 6.0 seconds
        ecoTimer += dt;
        if (ecoTimer >= 6.0) {
          ecoTimer = 0;
          cashRef.current += Math.round(ecoRef.current);
          setCash(cashRef.current);
          if (isAiPractice) {
            oppCashRef.current += Math.round(oppEcoRef.current);
            setOppCash(oppCashRef.current);
          }
        }

        // 4. Round Progression every 22 seconds
        roundTimer += dt;
        if (roundTimer >= 22.0) {
          roundTimer = 0;
          const nextR = Math.min(maxRound, roundRef.current + 1);
          roundRef.current = nextR;
          setRound(nextR);
          spawnNaturalWaveOnBothBoards(nextR);
        }

        if (bloonBoostTimerRef.current > 0) {
          bloonBoostTimerRef.current = Math.max(0, bloonBoostTimerRef.current - dt);
        }
        if (towerBoostTimerRef.current > 0) {
          towerBoostTimerRef.current = Math.max(0, towerBoostTimerRef.current - dt);
        }

        // 5. Step Player Simulation (Left Canvas)
        const pRes = stepGameSimulation(
          {
            map,
            towers: towersRef.current,
            bloons: playerBloonsRef.current,
            projectiles: playerProjRef.current,
            effects: playerFxRef.current,
            removedObstacleIds: [],
            round: roundRef.current,
            speedMultiplier: 1.0,
            bloonBoostActive: oppBloonBoostTimerRef.current > 0,
            towerBoostActive: towerBoostTimerRef.current > 0,
            envTimer: pEnvTimer,
          },
          dt,
          true
        );
        pEnvTimer = pRes.newEnvTimer;
        pendingPlayerCash += pRes.cashEarned;

        if (pRes.livesLost > 0) {
          const nextL = Math.max(0, livesRef.current - pRes.livesLost);
          livesRef.current = nextL;
          setLives(nextL);
          if (nextL <= 0 && !matchResultRef.current) {
            setMatchResult({ winner: 'opponent', reason: 'Your defenses were overrun!' });
            if (!isAiPractice && wsRef?.current?.readyState === WebSocket.OPEN) {
              wsRef.current.send(
                JSON.stringify({
                  type: 'match_over',
                  winnerId: 'opponent',
                  reason: `${playerName}'s lives dropped to 0!`,
                })
              );
            }
          }
        }

        // 6. Step Opponent Simulation (Right Canvas) at 60FPS in BOTH AI Practice and 1v1 Multiplayer!
        const oRes = stepGameSimulation(
          {
            map,
            towers: oppTowersRef.current,
            bloons: oppBloonsRef.current,
            projectiles: oppProjRef.current,
            effects: oppFxRef.current,
            removedObstacleIds: [],
            round: roundRef.current,
            speedMultiplier: 1.0,
            bloonBoostActive: bloonBoostTimerRef.current > 0,
            towerBoostActive: oppTowerBoostTimerRef.current > 0,
            envTimer: oEnvTimer,
          },
          dt,
          false
        );
        oEnvTimer = oRes.newEnvTimer;

        if (isAiPractice) {
          pendingOppCash += oRes.cashEarned;

          if (oRes.livesLost > 0) {
            const nextOppL = Math.max(0, oppLivesRef.current - oRes.livesLost);
            oppLivesRef.current = nextOppL;
            setOppLives(nextOppL);
            if (nextOppL <= 0 && !matchResultRef.current) {
              setMatchResult({
                winner: 'self',
                reason: `${opponentName} leaked too many Bloons!`,
              });
            }
          }

          aiActionTimer += dt;
          if (aiActionTimer >= 2.8) {
            aiActionTimer = 0;
            runAiDecisionTick();
          }
        } else {
          // Real-time 1v1 Multiplayer Sync (~7Hz continuous + immediate on tower actions)
          wsSyncTimer += dt;
          if (wsSyncTimer >= 0.15) {
            wsSyncTimer = 0;
            broadcastBoardSync();
          }
        }

        // Throttled HUD Cash & Boost Sync (10Hz) so React never slows down dense waves
        hudSyncTimer += dt;
        if (hudSyncTimer >= 0.1) {
          hudSyncTimer = 0;
          setBloonBoostTimer(bloonBoostTimerRef.current);
          setTowerBoostTimer(towerBoostTimerRef.current);
          if (pendingPlayerCash > 0) {
            cashRef.current += pendingPlayerCash;
            pendingPlayerCash = 0;
            setCash(cashRef.current);
          }
          if (pendingOppCash > 0) {
            oppCashRef.current += pendingOppCash;
            pendingOppCash = 0;
            setOppCash(oppCashRef.current);
          }
        }
      }

      // Render Left Canvas (Player)
      if (leftCanvasRef.current) {
        const lCtx = leftCanvasRef.current.getContext('2d');
        if (lCtx) {
          renderGameScene(
            lCtx,
            map,
            towersRef.current,
            playerBloonsRef.current,
            playerProjRef.current,
            playerFxRef.current,
            {
              selectedTowerId: selectedTowerIdRef.current,
              placingTowerSpecId: selectedShopSpecIdRef.current,
              hoverPoint: hoverPointRef.current,
              timeSec: now / 1000,
            }
          );
        }
      }

      // Render Right Canvas (Opponent)
      if (rightCanvasRef.current) {
        const rCtx = rightCanvasRef.current.getContext('2d');
        if (rCtx) {
          renderGameScene(
            rCtx,
            map,
            oppTowersRef.current,
            oppBloonsRef.current,
            oppProjRef.current,
            oppFxRef.current,
            {
              timeSec: now / 1000,
            }
          );
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [map, isAiPractice]);

  const runAiDecisionTick = () => {
    const aiCash = oppCashRef.current;
    const aiTowers = oppTowersRef.current;
    const r = roundRef.current;

    const desiredTowers = Math.min(9, 2 + Math.floor(r / 3));
    if (aiTowers.length < desiredTowers && aiCash >= 380) {
      const aiPool = [
        'hero_quincy',
        'dartling_gunner',
        'bomb_shooter',
        'wizard_monkey',
        'ninja_monkey',
      ];
      const chosenId = aiTowers.length === 0 ? 'hero_quincy' : aiPool[aiTowers.length % aiPool.length];
      const spec = TOWER_SPEC_MAP[chosenId];
      if (spec && aiCash >= spec.cost) {
        for (let attempt = 0; attempt < 25; attempt++) {
          const tx = 140 + Math.random() * 520;
          const ty = 100 + Math.random() * 320;
          const check = canPlaceTowerAt(chosenId, tx, ty, map, aiTowers, []);
          if (check.valid) {
            const newAiTower: PlacedTower = {
              id: `ai_tw_${Date.now()}_${Math.random()}`,
              specId: chosenId,
              x: tx,
              y: ty,
              angle: 0,
              tiers: [0, 0, 0],
              targetPriority: 'first',
              totalSpent: spec.cost,
              pops: 0,
              cashGenerated: 0,
              cooldownTimer: 0.2,
              abilityCooldownTimer: 0,
            };
            oppCashRef.current -= spec.cost;
            setOppCash(oppCashRef.current);
            setOppTowers((prev) => [...prev, newAiTower]);
            return;
          }
        }
      }
    }

    if (aiTowers.length > 0 && aiCash >= 550) {
      const targetTw = aiTowers[Math.floor(Math.random() * aiTowers.length)];
      const spec = TOWER_SPEC_MAP[targetTw.specId];
      if (spec) {
        const pathIdx = (targetTw.tiers[0] <= targetTw.tiers[1] ? 0 : 1) as 0 | 1;
        const nextTier = targetTw.tiers[pathIdx];
        if (nextTier < 4) {
          const upgCost = spec.upgrades[pathIdx][nextTier].cost;
          if (aiCash >= upgCost) {
            oppCashRef.current -= upgCost;
            setOppCash(oppCashRef.current);
            setOppTowers((prev) =>
              prev.map((t) => {
                if (t.id !== targetTw.id) return t;
                const nextTiers: [number, number, number] = [...t.tiers] as [number, number, number];
                nextTiers[pathIdx] += 1;
                return { ...t, tiers: nextTiers, totalSpent: t.totalSpent + upgCost };
              })
            );
            return;
          }
        }
      }
    }

    // AI sends bloons to Player's board (Not added to Player's middle send queue!)
    const unlockedSends = PVP_BLOON_SENDS.filter((s) => s.unlockRound <= r && s.cost <= aiCash);
    if (unlockedSends.length > 0 && Math.random() < 0.65) {
      const choice =
        unlockedSends[
          Math.min(unlockedSends.length - 1, Math.floor(Math.random() * unlockedSends.length))
        ];
      oppCashRef.current -= choice.cost;
      setOppCash(oppCashRef.current);
      oppEcoRef.current = Math.max(100, +(oppEcoRef.current + choice.ecoChange).toFixed(1));
      setOppEco(oppEcoRef.current);

      for (let i = 0; i < choice.count; i++) {
        setTimeout(() => {
          if (matchResultRef.current || playerBloonsRef.current.length >= 450) return;
          playerBloonsRef.current.push(
            createActiveBloon(choice.bloonType, 0, 0, map, {
              camo: r >= 12 && Math.random() < 0.25,
              regrow: r >= 9 && Math.random() < 0.25,
              fortified: r >= 18 && Math.random() < 0.3,
            })
          );
        }, i * choice.spacing * 1000);
      }
    }
  };

  const handleLeftCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pt = clientToLogicalCoords(e);

    if (selectedShopSpecId) {
      const spec = TOWER_SPEC_MAP[selectedShopSpecId];
      if (!spec) return;
      if (cashRef.current < spec.cost) {
        showToast(`Need $${spec.cost} to place ${spec.name}`);
        return;
      }

      const check = canPlaceTowerAt(spec.id, pt.x, pt.y, map, towers, []);
      if (!check.valid) {
        showToast(check.reason || 'Cannot place here');
        return;
      }

      const newTower: PlacedTower = {
        id: `pvp_tw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        specId: spec.id,
        x: pt.x,
        y: pt.y,
        angle: 0,
        tiers: [0, 0, 0],
        targetPriority: 'first',
        totalSpent: spec.cost,
        pops: 0,
        cashGenerated: 0,
        cooldownTimer: 0.1,
        abilityCooldownTimer: 0,
      };

      soundFX.playPlaceTower();
      cashRef.current -= spec.cost;
      setCash(cashRef.current);
      const nextTowers = [...towersRef.current, newTower];
      towersRef.current = nextTowers;
      setTowers(nextTowers);
      setSelectedShopSpecId(null);
      setSelectedTowerId(newTower.id);
      broadcastBoardSync(nextTowers);
      return;
    }

    for (let i = towers.length - 1; i >= 0; i--) {
      const t = towers[i];
      const spec = TOWER_SPEC_MAP[t.specId];
      if (Math.hypot(pt.x - t.x, pt.y - t.y) <= (spec?.footprintRadius || 18) + 6) {
        setSelectedTowerId(t.id);
        return;
      }
    }

    setSelectedTowerId(null);
  };

  const handleUpgradeTower = (towerId: string, pathIndex: 0 | 1 | 2, cost: number) => {
    if (cashRef.current < cost) return;
    soundFX.playUpgrade();
    cashRef.current -= cost;
    setCash(cashRef.current);
    const nextTowers = towersRef.current.map((t) => {
      if (t.id !== towerId) return t;
      const nextTiers: [number, number, number] = [...t.tiers] as [number, number, number];
      nextTiers[pathIndex] += 1;
      return { ...t, tiers: nextTiers, totalSpent: t.totalSpent + cost };
    });
    towersRef.current = nextTowers;
    setTowers(nextTowers);
    broadcastBoardSync(nextTowers);
  };

  const handleSellTower = (towerId: string, refund: number) => {
    cashRef.current += refund;
    setCash(cashRef.current);
    const nextTowers = towersRef.current.filter((t) => t.id !== towerId);
    towersRef.current = nextTowers;
    setTowers(nextTowers);
    setSelectedTowerId(null);
    broadcastBoardSync(nextTowers);
  };

  const handleChangePriority = (towerId: string, priority: TargetPriority) => {
    const nextTowers = towersRef.current.map((t) =>
      t.id === towerId ? { ...t, targetPriority: priority } : t
    );
    towersRef.current = nextTowers;
    setTowers(nextTowers);
    broadcastBoardSync(nextTowers);
  };

  const selectedTower = towers.find((t) => t.id === selectedTowerId) || null;

  return (
    <div className="h-screen w-screen overflow-hidden bg-[#b86b43] flex flex-col select-none border-4 border-[#6b3518]">
      {/* TOP BATTLES 2 HUD BAR */}
      <header className="h-12 px-3 bg-[#9a5430] border-b-4 border-[#5c2c12] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-[230px]">
          <div className="relative flex-1 h-7 rounded-lg bg-[#4a210d] border-2 border-[#361607] overflow-hidden flex items-center px-2.5 shadow-inner">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-600 via-amber-500 to-lime-500 transition-all duration-200"
              style={{ width: `${Math.min(100, (lives / 150) * 100)}%` }}
            />
            <span className="relative z-10 font-display font-bold text-sm uppercase text-white btd-text-stroke-sm truncate">
              {playerName}
            </span>
            <span className="relative z-10 ml-auto font-display font-bold text-base text-white btd-text-stroke-sm">
              {lives}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-[#5c2c12] px-4 py-1 rounded-xl border-2 border-[#3b1b0a] shadow">
          <div className="flex items-center gap-1.5">
            <span className="w-5 h-5 rounded-full bg-amber-400 border border-amber-950 flex items-center justify-center text-[11px] font-bold text-amber-950">
              $
            </span>
            <span className="font-display font-bold text-lg text-white btd-text-stroke-sm font-mono-num">
              {cash.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-1" title="Eco income received every 6 seconds">
            <span className="font-display font-bold text-lg text-[#4ade80] btd-text-stroke-sm font-mono-num">
              {Math.round(eco)}
            </span>
            <span className="text-[#4ade80] text-xs font-bold btd-text-stroke-sm">▲</span>
          </div>

          <div className="font-display font-bold text-base text-white uppercase tracking-wide btd-text-stroke-sm px-2">
            ROUND {round}/{maxRound}
          </div>

          <div className="flex items-center gap-1">
            <Skull className="w-4 h-4 text-amber-300" />
            <span className="font-display font-bold text-lg text-white btd-text-stroke-sm font-mono-num">
              {oppLives}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 min-w-[230px]">
          <div className="relative flex-1 h-7 rounded-lg bg-[#4a210d] border-2 border-[#361607] overflow-hidden flex items-center px-2.5 shadow-inner">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-lime-400 via-yellow-400 to-red-500 transition-all duration-200"
              style={{ width: `${Math.min(100, (oppLives / 150) * 100)}%` }}
            />
            <span className="relative z-10 font-display font-bold text-base text-white btd-text-stroke-sm">
              {oppLives}
            </span>
            <span className="relative z-10 ml-auto font-display font-bold text-sm uppercase text-white btd-text-stroke-sm truncate">
              {opponentName}
            </span>
          </div>
        </div>
      </header>

      {/* MAIN BATTLES 2 3-COLUMN ARENA */}
      <div className="flex-1 flex min-h-0 relative">
        {/* LEFT SIDEBAR: Loadout Monkeys + Boosts */}
        <aside className="w-36 bg-[#b86b43] border-r-4 border-[#6b3518] p-2 flex flex-col justify-between shrink-0 z-20">
          <div className="flex gap-1.5 flex-1 min-h-0">
            <div className="w-7 bg-[#7c3d1c] rounded-lg border-2 border-[#4a210d] flex flex-col items-center py-1.5 gap-2">
              <div className="w-5 h-5 rounded-full bg-amber-500/80 border border-amber-200 flex items-center justify-center text-[10px] font-bold">
                🔥
              </div>
              {partyCode && (
                <div
                  className="mt-auto mb-1 text-[9px] font-mono-num font-bold text-amber-200 [writing-mode:vertical-rl] rotate-180"
                  title="Active 6-digit Party Code"
                >
                  CODE {partyCode}
                </div>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-2 overflow-y-auto">
              {fullDeckIds.map((specId) => {
                const spec = TOWER_SPEC_MAP[specId];
                if (!spec) return null;
                const canAfford = cash >= spec.cost;
                const isSelected = selectedShopSpecId === spec.id;

                return (
                  <button
                    key={spec.id}
                    onClick={() => {
                      setSelectedShopSpecId(isSelected ? null : spec.id);
                      setSelectedTowerId(null);
                    }}
                    className={`rounded-xl p-1.5 flex flex-col items-center justify-between border-2 transition-transform active:scale-95 ${
                      isSelected
                        ? 'bg-amber-200 border-yellow-400 ring-2 ring-yellow-300'
                        : 'bg-[#d6cbb9] hover:bg-[#e5dccb] border-[#5c2c12]'
                    }`}
                  >
                    <TowerPortraitIcon specId={spec.id} size={46} />
                    <span className="text-[10px] font-display font-bold text-slate-900 truncate w-full text-center">
                      {spec.name.split(' ')[0]}
                    </span>
                    <div className="w-full rounded bg-[#4a210d] px-1 py-0.5 flex items-center justify-center gap-1">
                      <span className="w-3 h-3 rounded-full bg-amber-400 text-[8px] font-bold text-slate-950 flex items-center justify-center">
                        $
                      </span>
                      <span
                        className={`font-display font-bold text-xs leading-none ${
                          canAfford ? 'text-amber-300' : 'text-red-400'
                        }`}
                      >
                        {spec.cost}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-2 grid grid-cols-2 gap-1.5">
            <button
              onClick={() => {
                if (bloonBoostCharges <= 0 || bloonBoostTimerRef.current > 0) return;
                setBloonBoostCharges((c) => c - 1);
                bloonBoostTimerRef.current = 10;
                setBloonBoostTimer(10);
                broadcastBoardSync();
                showToast('Bloon Boost Activated! Sent bloons move 30% faster!');
              }}
              disabled={bloonBoostCharges <= 0}
              className="h-14 rounded-xl bg-gradient-to-b from-sky-500 to-blue-700 hover:from-sky-400 hover:to-blue-600 border-2 border-[#3b1b0a] shadow-md flex flex-col items-center justify-center relative active:scale-95 disabled:opacity-50"
              title="Bloon Boost: Speeds up bloons on opponent's side!"
            >
              <BloonIcon type="red" size={26} />
              <span className="absolute bottom-0.5 right-1.5 font-display font-bold text-sm text-white btd-text-stroke-sm">
                {bloonBoostCharges}
              </span>
            </button>

            <button
              onClick={() => {
                if (towerBoostCharges <= 0 || towerBoostTimerRef.current > 0) return;
                setTowerBoostCharges((c) => c - 1);
                towerBoostTimerRef.current = 10;
                setTowerBoostTimer(10);
                soundFX.playUpgrade();
                broadcastBoardSync();
                showToast('Tower Boost Activated! Monkeys attack 40% faster!');
              }}
              disabled={towerBoostCharges <= 0}
              className="h-14 rounded-xl bg-gradient-to-b from-sky-500 to-blue-700 hover:from-sky-400 hover:to-blue-600 border-2 border-[#3b1b0a] shadow-md flex flex-col items-center justify-center relative active:scale-95 disabled:opacity-50"
              title="Monkey Boost: Increases all your tower attack speeds!"
            >
              <TowerPortraitIcon specId="dart_monkey" size={28} />
              <span className="absolute bottom-0.5 right-1.5 font-display font-bold text-sm text-white btd-text-stroke-sm">
                {towerBoostCharges}
              </span>
            </button>
          </div>
        </aside>

        {/* CENTER SPLIT-SCREEN DUAL CANVASES */}
        <div className="flex-1 flex min-w-0 relative bg-[#0c1a0e]">
          {/* Left Player Canvas */}
          <div className="flex-1 relative overflow-hidden border-4 border-[#e2d5c1]">
            <canvas
              ref={leftCanvasRef}
              onMouseMove={(e) => {
                hoverPointRef.current = clientToLogicalCoords(e);
              }}
              onClick={handleLeftCanvasClick}
              className="w-full h-full block cursor-crosshair"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/55 text-[11px] font-display font-bold text-emerald-300 pointer-events-none">
              YOUR SIDE ({towers.length} Towers)
            </div>

            {activeEmoteBubble?.who === 'self' && (
              <div className="absolute bottom-14 right-6 bg-white text-slate-950 px-3 py-1.5 rounded-2xl border-2 border-slate-900 font-display font-bold text-lg shadow-xl animate-bounce">
                {activeEmoteBubble.emote}
              </div>
            )}
          </div>

          {/* CENTER DIVIDER: FULL-HEIGHT VERTICAL BLOON SEND QUEUE (ONLY shows bloons YOU send, covering the entire middle area!) */}
          <div className="w-12 bg-gradient-to-r from-[#8c4b2b] via-[#b86b43] to-[#8c4b2b] border-x-2 border-[#4a210d] relative flex flex-col items-center justify-between py-2 z-20 shrink-0">
            {/* Full-Height Vertical Stack of Your Sent Bloon Batches */}
            <div className="flex-1 w-full px-1 flex flex-col gap-1.5 overflow-hidden">
              {Array.from({ length: MAX_SEND_QUEUE_SLOTS }).map((_, slotIdx) => {
                const item = playerSendQueue[slotIdx];
                if (!item) {
                  return (
                    <div
                      key={slotIdx}
                      className="flex-1 rounded-lg bg-black/20 border border-[#5c2c12]/60 flex items-center justify-center"
                    />
                  );
                }

                const pct = Math.max(0, (item.remainingCount / item.totalCount) * 100);
                return (
                  <div
                    key={item.queueId}
                    className="flex-1 relative rounded-lg bg-slate-900/95 border-2 border-sky-400 shadow-md overflow-hidden flex flex-col items-center justify-center p-0.5"
                  >
                    {/* Progress fill covering the slot as bloons spawn */}
                    <div
                      className="absolute inset-x-0 bottom-0 bg-sky-500/35 transition-all duration-150"
                      style={{ height: `${pct}%` }}
                    />
                    <div className="relative z-10 flex flex-col items-center">
                      <BloonIcon
                        type={item.sendSpec.bloonType}
                        size={24}
                        camo={item.camo}
                        regrow={item.regrow}
                        fortified={item.fortified}
                      />
                      <span className="font-display font-bold text-[10px] text-white btd-text-stroke-sm leading-none">
                        x{item.remainingCount}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Center Emote Button & Surrender Flag Button */}
            <div className="flex flex-col items-center gap-1.5 pt-2 shrink-0">
              {showEmotePicker && (
                <div className="bg-slate-900/95 border-2 border-amber-400 rounded-xl p-1.5 flex gap-1 shadow-xl mb-1">
                  {['👍', '😎', '🔥', '😱', '🎯'].map((em) => (
                    <button
                      key={em}
                      onClick={() => {
                        setShowEmotePicker(false);
                        setActiveEmoteBubble({ who: 'self', emote: em });
                        setTimeout(() => setActiveEmoteBubble(null), 3000);
                        if (!isAiPractice && wsRef?.current?.readyState === WebSocket.OPEN) {
                          wsRef.current.send(JSON.stringify({ type: 'emote', emote: em }));
                        }
                      }}
                      className="w-8 h-8 rounded hover:bg-slate-700 text-lg flex items-center justify-center"
                    >
                      {em}
                    </button>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowEmotePicker((v) => !v)}
                className="w-9 h-9 rounded-full bg-gradient-to-b from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 border-2 border-slate-950 shadow-lg flex items-center justify-center text-white active:scale-95"
                title="Send Emote"
              >
                <MessageSquare className="w-4 h-4 fill-white" />
              </button>

              <button
                onClick={() => {
                  setMatchResult({ winner: 'opponent', reason: 'You surrendered the match.' });
                  if (!isAiPractice && wsRef?.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(
                      JSON.stringify({
                        type: 'match_over',
                        winnerId: 'opponent',
                        reason: `${playerName} surrendered!`,
                      })
                    );
                  }
                }}
                className="w-9 h-9 rounded-full bg-gradient-to-b from-red-500 to-red-700 hover:from-red-400 hover:to-red-600 border-2 border-slate-950 shadow-lg flex items-center justify-center text-white active:scale-95"
                title="Surrender Match"
              >
                <Flag className="w-4 h-4 fill-white" />
              </button>
            </div>
          </div>

          {/* Right Opponent Canvas */}
          <div className="flex-1 relative overflow-hidden border-4 border-[#e2d5c1]">
            <canvas ref={rightCanvasRef} className="w-full h-full block" />
            <div className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/55 text-[11px] font-display font-bold text-amber-300 pointer-events-none">
              {opponentName.toUpperCase()} ({oppTowers.length} Towers · Eco {Math.round(oppEco)})
            </div>

            {activeEmoteBubble?.who === 'opponent' && (
              <div className="absolute bottom-14 left-6 bg-white text-slate-950 px-3 py-1.5 rounded-2xl border-2 border-slate-900 font-display font-bold text-lg shadow-xl animate-bounce">
                {activeEmoteBubble.emote}
              </div>
            )}
          </div>

          {statusToast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 px-4 py-1.5 rounded-xl bg-slate-950/90 border border-amber-400 text-amber-200 font-display font-bold text-xs shadow-xl pointer-events-none">
              {statusToast}
            </div>
          )}

          {selectedTower && (
            <div className="absolute bottom-3 left-3 z-30 w-[520px] max-w-[90%]">
              <TowerUpgradePanel
                tower={selectedTower}
                allTowers={towers}
                map={map}
                cash={cash}
                onUpgrade={handleUpgradeTower}
                onSell={handleSellTower}
                onChangePriority={handleChangePriority}
                onClose={() => setSelectedTowerId(null)}
              />
            </div>
          )}
        </div>

        {/* RIGHT SIDEBAR: AUTO-SENDER + MODIFIERS + 2-COLUMN BLOON SEND GRID */}
        <aside className="w-48 bg-[#b86b43] border-l-4 border-[#6b3518] p-2 flex flex-col justify-between shrink-0 z-20">
          {/* Auto-Sender Header Control */}
          <div className="mb-1.5 bg-[#4a210d] rounded-xl p-1.5 border border-[#361607]">
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1 text-[10px] font-display font-bold uppercase text-amber-200">
                <Repeat className="w-3.5 h-3.5 text-lime-400" />
                <span>Auto-Sender</span>
              </div>
              {autoSendSpecId ? (
                <button
                  onClick={() => setAutoSendSpecId(null)}
                  className="px-2 py-0.5 rounded bg-red-600 hover:bg-red-500 text-[9px] font-bold uppercase text-white"
                >
                  Stop Auto
                </button>
              ) : (
                <span className="text-[9px] text-amber-200/70">Click AUTO on bloon</span>
              )}
            </div>
          </div>

          {/* Bloon Modifier Toggles (Regrow R8+, Camo R12+, Fortified R18+) */}
          <div className="grid grid-cols-3 gap-1 mb-1.5">
            <button
              onClick={() => round >= 8 && setSendRegrow((v) => !v)}
              disabled={round < 8}
              className={`py-1 rounded-lg text-[10px] font-display font-bold uppercase border ${
                round < 8
                  ? 'bg-slate-800/60 border-slate-700 text-slate-400'
                  : sendRegrow
                    ? 'bg-pink-500 border-white text-white shadow'
                    : 'bg-[#5c2c12] border-[#3b1b0a] text-amber-100'
              }`}
            >
              Regrow
            </button>
            <button
              onClick={() => round >= 12 && setSendCamo((v) => !v)}
              disabled={round < 12}
              className={`py-1 rounded-lg text-[10px] font-display font-bold uppercase border ${
                round < 12
                  ? 'bg-slate-800/60 border-slate-700 text-slate-400'
                  : sendCamo
                    ? 'bg-emerald-500 border-white text-slate-950 shadow'
                    : 'bg-[#5c2c12] border-[#3b1b0a] text-amber-100'
              }`}
            >
              Camo
            </button>
            <button
              onClick={() => round >= 18 && setSendFortified((v) => !v)}
              disabled={round < 18}
              className={`py-1 rounded-lg text-[10px] font-display font-bold uppercase border ${
                round < 18
                  ? 'bg-slate-800/60 border-slate-700 text-slate-400'
                  : sendFortified
                    ? 'bg-orange-500 border-white text-slate-950 shadow'
                    : 'bg-[#5c2c12] border-[#3b1b0a] text-amber-100'
              }`}
            >
              Fort
            </button>
          </div>

          {/* 2-Column Bloon Send Buttons with per-bloon AUTO toggle! */}
          <div className="flex-1 overflow-y-auto grid grid-cols-2 gap-1.5 pr-0.5">
            {PVP_BLOON_SENDS.map((sendSpec) => {
              const unlocked = round >= sendSpec.unlockRound;
              const modMult =
                (sendCamo ? 1.4 : 1.0) * (sendRegrow ? 1.3 : 1.0) * (sendFortified ? 1.6 : 1.0);
              const finalCost = Math.round(sendSpec.cost * modMult);
              const canAfford = cash >= finalCost;
              const isAutoActive = autoSendSpecId === sendSpec.id;

              if (!unlocked) {
                return (
                  <div
                    key={sendSpec.id}
                    title={`Unlocks on Round ${sendSpec.unlockRound}`}
                    className="h-16 rounded-xl bg-gradient-to-b from-sky-600/60 to-blue-800/60 border-2 border-[#4a210d] flex flex-col items-center justify-center opacity-75"
                  >
                    <Lock className="w-5 h-5 text-amber-300" />
                    <span className="text-[10px] font-display font-bold text-amber-100 mt-0.5">
                      R{sendSpec.unlockRound}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={sendSpec.id}
                  className={`h-16 rounded-xl p-1 border-2 flex flex-col justify-between relative transition-transform bg-gradient-to-b from-sky-400 to-blue-600 ${
                    isAutoActive
                      ? 'border-lime-300 ring-2 ring-lime-400'
                      : canAfford
                        ? 'border-[#3b1b0a]'
                        : 'border-red-900 opacity-75'
                  }`}
                >
                  {/* Main Click Area to Send Batch */}
                  <button
                    onClick={() => tryEnqueueBloonSend(sendSpec, false)}
                    className="w-full h-full flex flex-col justify-between text-left active:scale-95"
                  >
                    <div className="flex items-center justify-between w-full">
                      <BloonIcon
                        type={sendSpec.bloonType}
                        size={22}
                        camo={sendCamo}
                        regrow={sendRegrow}
                        fortified={sendFortified}
                      />
                      <span className="font-display font-bold text-xs text-white btd-text-stroke-sm">
                        x{sendSpec.count}
                      </span>
                    </div>

                    <div className="w-full flex flex-col items-end leading-none">
                      <span
                        className={`text-[10px] font-display font-bold btd-text-stroke-sm ${
                          sendSpec.ecoChange >= 0 ? 'text-[#4ade80]' : 'text-red-400'
                        }`}
                      >
                        {sendSpec.ecoChange >= 0
                          ? `▲ ${sendSpec.ecoChange}`
                          : `▼ ${Math.abs(sendSpec.ecoChange)}`}
                      </span>

                      <div className="flex items-center gap-0.5">
                        <span className="w-3 h-3 rounded-full bg-amber-400 text-[8px] font-bold text-slate-950 flex items-center justify-center">
                          $
                        </span>
                        <span
                          className={`font-display font-bold text-xs btd-text-stroke-sm ${
                            canAfford ? 'text-white' : 'text-red-400'
                          }`}
                        >
                          {finalCost >= 1000 ? `${(finalCost / 1000).toFixed(1)}K` : finalCost}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Mini AUTO Toggle Pill in Bottom-Left of Card */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setAutoSendSpecId(isAutoActive ? null : sendSpec.id);
                    }}
                    title="Toggle continuous Auto-Send for this bloon"
                    className={`absolute bottom-1 left-1 px-1 py-0.5 rounded text-[8px] font-display font-bold uppercase border ${
                      isAutoActive
                        ? 'bg-[#65e424] border-white text-slate-950 shadow'
                        : 'bg-slate-950/75 border-white/30 text-amber-200 hover:text-white'
                    }`}
                  >
                    {isAutoActive ? 'AUTO ✓' : 'AUTO'}
                  </button>
                </div>
              );
            })}
          </div>
        </aside>
      </div>

      {/* MATCH OVER MODAL */}
      {matchResult && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="wood-panel rounded-2xl max-w-md w-full p-6 text-center text-white shadow-2xl">
            <div
              className={`font-display font-bold text-4xl uppercase btd-text-stroke mb-2 ${
                matchResult.winner === 'self' ? 'text-amber-300' : 'text-red-400'
              }`}
            >
              {matchResult.winner === 'self' ? 'VICTORY!' : 'DEFEAT!'}
            </div>
            <p className="text-sm text-amber-100 mb-6">{matchResult.reason}</p>
            <button
              onClick={onExitMatch}
              className="w-full py-3 rounded-xl bg-gradient-to-b from-[#65e424] to-[#3ca30d] border-2 border-white font-display font-bold text-base uppercase text-white btd-text-stroke-sm shadow-lg"
            >
              Return to PvP Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
