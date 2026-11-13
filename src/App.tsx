import React, { useEffect, useRef, useState } from 'react';
import {
  BloonType,
  CampaignDifficulty,
  GameMap,
  MapCategory,
  SaveFileState,
} from './types/game';
import { PVE_MAPS, PVP_MAPS } from './data/maps';
import { TOWER_SPECS, TOWER_SPEC_MAP, getTowerShortName } from './data/towers';
import { BLOON_SPECS } from './data/bloons';
import { PvEView } from './components/PvEView';
import { PvPView } from './components/PvPView';
import { BloonIcon, TowerPortraitIcon } from './components/GameIcons';
import { CANVAS_HEIGHT, CANVAS_WIDTH, renderGameScene } from './engine/simEngine';
import { createMultiplayerSocket } from './utils/multiplayerTransport';
import {
  Bot,
  Check,
  Copy,
  Download,
  Infinity as InfinityIcon,
  Play,
  Shuffle,
  Swords,
  Trophy,
  Users,
  Wrench,
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'btd_battles_odyssey_save_v1';

// Mini Map Thumbnail Canvas component
const MapThumbnailCanvas: React.FC<{ map: GameMap }> = ({ map }) => {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    const ctx = c.getContext('2d');
    if (!ctx) return;
    renderGameScene(ctx, map, [], [], [], [], { timeSec: 0, isThumbnail: true });
  }, [map]);

  return (
    <canvas
      ref={ref}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      className="w-full h-36 object-cover rounded-lg border-2 border-[#4a210d]"
    />
  );
};

export default function App() {
  // Active View State
  const [activeView, setActiveView] = useState<'hub' | 'pve_play' | 'pvp_play'>('hub');
  const [hubTab, setHubTab] = useState<'pvp' | 'pve' | 'info'>('pvp');

  // Player Profile & Save File State
  const [playerId] = useState<string>(() => `plr_${Math.random().toString(36).slice(2, 9)}`);
  const [playerName, setPlayerName] = useState<string>('MARTINI');
  const [completedMaps, setCompletedMaps] = useState<Record<string, CampaignDifficulty[]>>({});
  const [customMaps, setCustomMaps] = useState<GameMap[]>([]);
  const [savedPvERun, setSavedPvERun] = useState<SaveFileState['activePvERun']>(null);

  // PvE Selection State
  const [selectedPvECategory, setSelectedPvECategory] = useState<MapCategory | 'All'>('All');
  const [selectedPvEMapId, setSelectedPvEMapId] = useState<string>(PVE_MAPS[0].id);
  const [selectedDifficulty, setSelectedDifficulty] = useState<CampaignDifficulty>('Medium');
  const [resumeLoadedRun, setResumeLoadedRun] = useState<SaveFileState['activePvERun']>(null);

  // PvP Selection & WebSocket Party State
  const [selectedPvPMapId, setSelectedPvPMapId] = useState<string>(PVP_MAPS[0].id);
  const [myMapVote, setMyMapVote] = useState<string>(PVP_MAPS[0].id);
  const [myDraftLocked, setMyDraftLocked] = useState<boolean>(false);
  const [aiDraftPhase, setAiDraftPhase] = useState<boolean>(false);
  const [aiVotedMapId, setAiVotedMapId] = useState<string>(PVP_MAPS[1]?.id || PVP_MAPS[0].id);
  const [selectedHero, setSelectedHero] = useState<string>('hero_quincy');
  const [selectedLoadout, setSelectedLoadout] = useState<string[]>([
    'dartling_gunner',
    'druid',
    'monkey_sub',
  ]);
  const [pvpIsAiPractice, setPvpIsAiPractice] = useState<boolean>(true);
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [activePartyRoom, setActivePartyRoom] = useState<{
    code: string;
    hostId: string;
    mapId: string;
    status: 'lobby' | 'draft' | 'playing' | 'finished' | string;
    players: Array<{
      id: string;
      name: string;
      isHost: boolean;
      lockedIn?: boolean;
      mapVote?: string | null;
      hero?: string;
      loadout?: string[];
    }>;
  } | null>(null);
  const [partyStatusMsg, setPartyStatusMsg] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const wsRef = useRef<WebSocket | null>(null);
  const saveFileInputRef = useRef<HTMLInputElement | null>(null);

  // Load persisted local profile on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SaveFileState>;
        if (parsed.playerName) setPlayerName(parsed.playerName);
        if (parsed.completedMaps) setCompletedMaps(parsed.completedMaps);
        if (parsed.customMaps) setCustomMaps(parsed.customMaps);
        if (parsed.activePvERun) setSavedPvERun(parsed.activePvERun);
      }
    } catch {
      // Ignore corrupt local storage
    }
  }, []);

  // Persist profile changes to localStorage
  const persistState = (
    nextCompleted = completedMaps,
    nextCustomMaps = customMaps,
    nextActiveRun = savedPvERun
  ) => {
    const payload: SaveFileState = {
      version: '1.0.0',
      savedAt: new Date().toISOString(),
      playerName,
      completedMaps: nextCompleted,
      customMaps: nextCustomMaps,
      activePvERun: nextActiveRun,
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
    return payload;
  };

  // Connect Multiplayer Socket (WebSocket on Node server, or Serverless WebRTC P2P on GitHub Pages)
  const ensureWebSocket = async (): Promise<WebSocket> => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      return wsRef.current;
    }
    const ws = await createMultiplayerSocket();
    wsRef.current = ws;

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data);
        if (msg.type === 'party_created' || msg.type === 'party_updated') {
          setActivePartyRoom(msg.room);
          setPartyStatusMsg(null);
        } else if (msg.type === 'draft_started') {
          setActivePartyRoom(msg.room);
          setMyDraftLocked(false);
          setPartyStatusMsg(null);
          setHubTab('pvp');
        } else if (msg.type === 'party_error') {
          setPartyStatusMsg(msg.message || 'Party error');
        } else if (msg.type === 'match_started') {
          setActivePartyRoom(msg.room);
          const winMap = msg.winningMapId || msg.room?.mapId;
          if (winMap) setSelectedPvPMapId(winMap);
          setMyDraftLocked(false);
          setAiDraftPhase(false);
          setPvpIsAiPractice(false);
          setActiveView('pvp_play');
        } else if (msg.type === 'player_left') {
          setActivePartyRoom(msg.room);
          setMyDraftLocked(false);
          setPartyStatusMsg('Other player left the party.');
        }
      } catch (e) {
        console.error(e);
      }
    };

    return ws;
  };

  const handleCreateSixDigitParty = async () => {
    try {
      setPartyStatusMsg('Creating 6-digit party room...');
      const ws = await ensureWebSocket();
      ws.send(
        JSON.stringify({
          type: 'create_party',
          playerId,
          playerName,
          mapId: myMapVote,
          hero: selectedHero,
          loadout: selectedLoadout,
        })
      );
    } catch {
      setPartyStatusMsg('Could not connect to multiplayer WebSocket server.');
    }
  };

  const handleJoinSixDigitParty = async () => {
    const cleanCode = joinCodeInput.trim();
    if (!/^\d{6}$/.test(cleanCode)) {
      setPartyStatusMsg('Please enter a valid 6-digit numeric party code.');
      return;
    }
    try {
      setPartyStatusMsg(`Joining party ${cleanCode}...`);
      const ws = await ensureWebSocket();
      ws.send(
        JSON.stringify({
          type: 'join_party',
          code: cleanCode,
          playerId,
          playerName,
          hero: selectedHero,
          loadout: selectedLoadout,
        })
      );
    } catch {
      setPartyStatusMsg('Could not connect to multiplayer WebSocket server.');
    }
  };

  // Party Leader starts the Map Vote & Tower Selection phase after 2nd player joins
  const handleLeaderStartDraft = () => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ type: 'start_draft' }));
  };

  // Sync map vote, towers, and lock-in status during the Draft phase
  const syncDraftSelection = (
    nextVote: string,
    nextHero: string,
    nextLoadout: string[],
    nextLocked: boolean
  ) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && activePartyRoom) {
      wsRef.current.send(
        JSON.stringify({
          type: 'submit_draft',
          mapVote: nextVote,
          hero: nextHero,
          loadout: nextLoadout,
          lockedIn: nextLocked,
        })
      );
    }
  };

  const handleVoteMap = (mapId: string) => {
    setMyMapVote(mapId);
    syncDraftSelection(mapId, selectedHero, selectedLoadout, myDraftLocked);
  };

  const handleToggleLockInDraft = () => {
    if (aiDraftPhase) {
      // Resolve vote between player's voted map and AI's voted map
      const pool = [myMapVote, aiVotedMapId];
      const winningMap = pool[Math.floor(Math.random() * pool.length)] || myMapVote;
      setSelectedPvPMapId(winningMap);
      setAiDraftPhase(false);
      setPvpIsAiPractice(true);
      setActiveView('pvp_play');
      return;
    }
    const nextLocked = !myDraftLocked;
    setMyDraftLocked(nextLocked);
    syncDraftSelection(myMapVote, selectedHero, selectedLoadout, nextLocked);
  };

  const handleLeaveParty = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'leave_party' }));
    }
    setActivePartyRoom(null);
    setMyDraftLocked(false);
    setPartyStatusMsg(null);
  };

  // Toggle a monkey in the 3-slot PvP Loadout (during Draft phase)
  const toggleLoadoutMonkey = (specId: string) => {
    const spec = TOWER_SPEC_MAP[specId];
    if (!spec) return;
    if (spec.category === 'Hero') {
      setSelectedHero(specId);
      syncDraftSelection(myMapVote, specId, selectedLoadout, myDraftLocked);
      return;
    }
    setSelectedLoadout((prev) => {
      let next = prev;
      if (prev.includes(specId)) {
        next = prev.length > 1 ? prev.filter((id) => id !== specId) : prev;
      } else if (prev.length >= 3) {
        next = [...prev.slice(1), specId];
      } else {
        next = [...prev, specId];
      }
      syncDraftSelection(myMapVote, selectedHero, next, myDraftLocked);
      return next;
    });
  };

  // Export Save File (.btdsave.json)
  const handleExportSaveFile = (activeRun?: SaveFileState['activePvERun']) => {
    const runToSave = activeRun !== undefined ? activeRun : savedPvERun;
    if (activeRun) setSavedPvERun(activeRun);
    const fullState = persistState(completedMaps, customMaps, runToSave);
    const blob = new Blob([JSON.stringify(fullState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bloons_odyssey_${playerName.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.btdsave.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import Save File (.btdsave.json)
  const handleImportSaveFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as SaveFileState;
        if (parsed.playerName) setPlayerName(parsed.playerName);
        if (parsed.completedMaps) setCompletedMaps(parsed.completedMaps);
        if (Array.isArray(parsed.customMaps)) setCustomMaps(parsed.customMaps);
        if (parsed.activePvERun) {
          setSavedPvERun(parsed.activePvERun);
          setResumeLoadedRun(parsed.activePvERun);
          setSelectedPvEMapId(parsed.activePvERun.mapId);
          const importedMode: CampaignDifficulty = parsed.activePvERun.isSandbox
            ? 'Sandbox'
            : parsed.activePvERun.isEndless
              ? 'Endless'
              : parsed.activePvERun.difficulty;
          setSelectedDifficulty(importedMode);
          setActiveView('pve_play');
        }
        persistState(
          parsed.completedMaps || completedMaps,
          parsed.customMaps || customMaps,
          parsed.activePvERun ?? null
        );
      } catch {
        setPartyStatusMsg('Invalid .btdsave.json file.');
      }
    };
    reader.readAsText(file);
  };

  // Resolve active map objects
  const allPvEMaps = [...PVE_MAPS, ...customMaps];
  const allPvPMaps = [...PVP_MAPS, ...customMaps];
  const currentPvEMap =
    resumeLoadedRun?.customMap ||
    allPvEMaps.find((m) => m.id === selectedPvEMapId) ||
    PVE_MAPS[0];
  const currentPvPMap =
    allPvPMaps.find((m) => m.id === selectedPvPMapId) || PVP_MAPS[0];

  // 1. Active PvE Gameplay Screen (Image 2 UI)
  if (activeView === 'pve_play') {
    return (
      <PvEView
        map={currentPvEMap}
        difficulty={selectedDifficulty}
        loadedSaveRun={resumeLoadedRun}
        onBackToMenu={() => {
          setResumeLoadedRun(null);
          setActiveView('hub');
        }}
        onExportSaveFile={(run) => handleExportSaveFile(run)}
        onImportSaveFile={handleImportSaveFile}
        onVictoryUnlock={(mapId, diff) => {
          setCompletedMaps((prev) => {
            const list = prev[mapId] || [];
            const next = list.includes(diff) ? list : [...list, diff];
            const updated = { ...prev, [mapId]: next };
            persistState(updated, customMaps, savedPvERun);
            return updated;
          });
        }}
      />
    );
  }

  // 2. Active PvP Gameplay Screen (Image 1 UI)
  if (activeView === 'pvp_play') {
    const oppPlayer = activePartyRoom?.players.find((p) => p.id !== playerId);
    const opponentDisplayName = pvpIsAiPractice
      ? 'BISH_BASH_BOSH (AI)'
      : oppPlayer?.name || 'CHALLENGER';

    return (
      <PvPView
        map={currentPvPMap}
        playerName={playerName}
        opponentName={opponentDisplayName}
        playerHero={selectedHero}
        playerLoadout={selectedLoadout}
        isAiPractice={pvpIsAiPractice}
        partyCode={activePartyRoom?.code}
        wsRef={wsRef}
        playerId={playerId}
        onExitMatch={() => {
          setActiveView('hub');
        }}
      />
    );
  }

  // Filter PvE Maps by selected category
  const filteredPvEMaps = allPvEMaps.filter((m) => {
    if (selectedPvECategory === 'All') return true;
    return m.category === selectedPvECategory;
  });

  // 3. Main Hub Screen
  return (
    <div className="min-h-screen bg-[#16100b] text-slate-100 flex flex-col">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 wood-panel border-b-4 border-[#4a210d]">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setHubTab('pvp');
          }}
          className="font-display font-bold text-xl tracking-wide text-white btd-text-stroke whitespace-nowrap shrink-0"
        >
          BLOONS TD: BATTLES & ODYSSEY
        </a>

        {/* Zone 2: Concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-display font-bold text-amber-100">
          <button
            onClick={() => setHubTab('pvp')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              hubTab === 'pvp' ? 'text-yellow-300 underline underline-offset-4' : ''
            }`}
          >
            1v1 with a Friend
          </button>
          <button
            onClick={() => setHubTab('pve')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              hubTab === 'pve' ? 'text-yellow-300 underline underline-offset-4' : ''
            }`}
          >
            PVE (BTD6)
          </button>
          <button
            onClick={() => setHubTab('info')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 ${
              hubTab === 'info' ? 'text-yellow-300 underline underline-offset-4' : ''
            }`}
          >
            Info
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action (Cross-Device Save File Manager) */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => saveFileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-display font-bold uppercase text-slate-950 bg-gradient-to-b from-amber-300 to-amber-500 hover:from-amber-200 hover:to-amber-400 border-2 border-white rounded-xl shadow whitespace-nowrap shrink-0"
          >
            Load / Export Save File
          </button>
          <input
            ref={saveFileInputRef}
            type="file"
            accept=".json,.btdsave"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleImportSaveFile(f);
            }}
          />
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-[1380px] w-full mx-auto px-4 md:px-6 py-6 space-y-6">
        {/* Mode Switcher Bar + Player Name + Save File Quick Actions */}
        <div className="wood-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setHubTab('pvp')}
              className={`px-5 py-2.5 rounded-xl font-display font-bold text-sm uppercase border-2 flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap ${
                hubTab === 'pvp'
                  ? 'bg-gradient-to-b from-red-500 to-red-700 border-yellow-300 text-white shadow-lg'
                  : 'bg-[#5c2c12] border-[#3b1b0a] text-amber-100 hover:text-white'
              }`}
            >
              <Swords className="w-4 h-4" />
              1v1 with a Friend
            </button>
            <button
              onClick={() => setHubTab('pve')}
              className={`px-5 py-2.5 rounded-xl font-display font-bold text-sm uppercase border-2 flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap ${
                hubTab === 'pve'
                  ? 'bg-gradient-to-b from-[#65e424] to-[#3ca30d] border-yellow-300 text-white shadow-lg'
                  : 'bg-[#5c2c12] border-[#3b1b0a] text-amber-100 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4" />
              PVE (BTD6)
            </button>
            <button
              onClick={() => setHubTab('info')}
              className={`px-4 py-2.5 rounded-xl font-display font-bold text-sm uppercase border-2 flex items-center gap-2 transition-transform active:scale-95 whitespace-nowrap ${
                hubTab === 'info'
                  ? 'bg-sky-600 border-yellow-300 text-white shadow-lg'
                  : 'bg-[#5c2c12] border-[#3b1b0a] text-amber-100 hover:text-white'
              }`}
            >
              Info
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 bg-[#4a210d] px-3 py-1.5 rounded-xl border border-[#361607]">
              <span className="text-xs font-bold text-amber-200 uppercase">Name:</span>
              <input
                type="text"
                maxLength={16}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value.toUpperCase())}
                className="w-28 bg-transparent font-display font-bold text-sm text-white focus:outline-none border-b border-amber-400/50"
              />
            </div>

            {savedPvERun && (
              <button
                onClick={() => {
                  setResumeLoadedRun(savedPvERun);
                  setSelectedPvEMapId(savedPvERun.mapId);
                  const savedMode: CampaignDifficulty = savedPvERun.isSandbox
                    ? 'Sandbox'
                    : savedPvERun.isEndless
                      ? 'Endless'
                      : savedPvERun.difficulty;
                  setSelectedDifficulty(savedMode);
                  setActiveView('pve_play');
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs uppercase flex items-center gap-1.5 shadow whitespace-nowrap"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                Resume Saved Run (R{savedPvERun.round})
              </button>
            )}

            <button
              onClick={() => handleExportSaveFile()}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-200 text-white font-display font-bold text-xs uppercase flex items-center gap-1.5 shadow whitespace-nowrap"
              title="Download cross-device .btdsave.json file"
            >
              <Download className="w-3.5 h-3.5" />
              Download Save
            </button>
          </div>
        </div>

        {/* ==================== TAB 1: 1V1 WITH A FRIEND (PVP) ==================== */}
        {hubTab === 'pvp' && (
          <>
            {activePartyRoom?.status !== 'draft' && !aiDraftPhase ? (
              /* STAGE 1: PARTY LOBBY (Wait for 2nd Player & Leader Starts) */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left 7 Columns: 6-Digit WebSocket Party Lobby */}
                <div className="lg:col-span-7 wood-panel rounded-2xl p-6 space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-display font-bold text-2xl uppercase text-white btd-text-stroke">
                        1v1 With a Friend (6-Digit Party)
                      </h2>
                      <p className="text-xs text-amber-100/90 mt-0.5">
                        Create a 6-digit party code for your friend to join. Once both players are in the party and the leader starts, you will vote on the map and select your towers!
                      </p>
                    </div>
                    <Users className="w-8 h-8 text-amber-300 shrink-0" />
                  </div>

                  {partyStatusMsg && (
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-amber-400 text-amber-200 text-xs font-semibold">
                      {partyStatusMsg}
                    </div>
                  )}

                  {!activePartyRoom ? (
                    <div className="space-y-4">
                      <button
                        onClick={handleCreateSixDigitParty}
                        className="w-full py-3.5 rounded-xl bg-gradient-to-b from-[#65e424] to-[#3ca30d] hover:from-[#7bf03b] hover:to-[#47bd12] border-2 border-white font-display font-bold text-base uppercase text-white btd-text-stroke-sm shadow-lg transition-transform active:scale-95"
                      >
                        Create Party (Generate 6-Digit Code)
                      </button>

                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          maxLength={6}
                          placeholder="Enter Friend's 6-Digit Code (e.g. 482910)"
                          value={joinCodeInput}
                          onChange={(e) => setJoinCodeInput(e.target.value.replace(/\D/g, ''))}
                          className="flex-1 px-4 py-3 rounded-xl bg-[#361607] border-2 border-[#6b3518] text-white font-mono-num font-bold text-base tracking-widest placeholder:text-amber-200/40 focus:outline-none focus:border-amber-300"
                        />
                        <button
                          onClick={handleJoinSixDigitParty}
                          className="px-6 py-3 rounded-xl bg-gradient-to-b from-sky-400 to-blue-600 hover:from-sky-300 hover:to-blue-500 border-2 border-white font-display font-bold text-sm uppercase text-white btd-text-stroke-sm shadow-lg whitespace-nowrap"
                        >
                          Join Party
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="wood-panel-dark rounded-xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold uppercase text-amber-200">
                          Active 6-Digit Party Code:
                        </span>
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(activePartyRoom.code);
                            setCopiedCode(true);
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="px-3 py-1 rounded-lg bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1"
                        >
                          {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {copiedCode ? 'Copied' : 'Copy Code'}
                        </button>
                      </div>

                      <div className="py-3 rounded-xl bg-black/40 border border-amber-500/40 text-center font-mono-num font-bold text-4xl tracking-[0.28em] text-yellow-300">
                        {activePartyRoom.code}
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-bold text-amber-200 uppercase">
                          Party Members ({activePartyRoom.players.length}/2):
                        </div>
                        {activePartyRoom.players.map((p) => (
                          <div
                            key={p.id}
                            className="px-3.5 py-2 rounded-lg bg-black/30 flex items-center justify-between text-sm font-bold"
                          >
                            <span>
                              {p.name} {p.id === playerId ? '(You)' : ''}
                            </span>
                            <span className="text-emerald-400 text-xs uppercase">
                              {p.isHost ? 'Party Leader' : 'Joined · Ready'}
                            </span>
                          </div>
                        ))}
                        {activePartyRoom.players.length < 2 && (
                          <div className="px-3.5 py-3 rounded-lg bg-black/20 border border-dashed border-amber-500/40 text-xs text-amber-200/80 text-center">
                            Waiting for Player 2 to join with code <strong>{activePartyRoom.code}</strong>...
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2.5 pt-2">
                        {activePartyRoom.hostId === playerId ? (
                          <button
                            onClick={handleLeaderStartDraft}
                            disabled={activePartyRoom.players.length < 2}
                            className="flex-1 py-3 rounded-xl bg-gradient-to-b from-[#65e424] to-[#3ca30d] disabled:opacity-50 border-2 border-white font-display font-bold text-sm uppercase text-white btd-text-stroke-sm shadow-lg"
                          >
                            {activePartyRoom.players.length < 2
                              ? 'Waiting for 2nd Player to Join...'
                              : 'Start Match (Map Vote & Select Towers)'}
                          </button>
                        ) : (
                          <div className="flex-1 py-3 px-4 rounded-xl bg-black/40 border border-amber-400/50 text-center font-display font-bold text-xs uppercase text-amber-200">
                            Waiting for Party Leader to Start Map Vote & Tower Selection...
                          </div>
                        )}
                        <button
                          onClick={handleLeaveParty}
                          className="px-4 py-3 rounded-xl bg-red-700 hover:bg-red-600 text-xs font-bold uppercase text-white"
                        >
                          Leave
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Right 5 Columns: Solo Practice vs AI Opponent */}
                <div className="lg:col-span-5 wood-panel rounded-2xl p-6 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h3 className="font-display font-bold text-xl uppercase text-amber-300 btd-text-stroke-sm">
                        Solo Practice vs AI Opponent
                      </h3>
                      <Bot className="w-7 h-7 text-sky-300 shrink-0" />
                    </div>
                    <p className="text-xs text-amber-100/90 leading-relaxed">
                      Practice 1v1 Battles 2 against an AI opponent! Starting a practice match also takes you through the Map Vote and Tower Selection draft before battle begins.
                    </p>
                  </div>

                  <div className="wood-panel-dark rounded-xl p-4 space-y-2 text-xs text-amber-100/90">
                    <div className="font-display font-bold text-amber-300 uppercase">
                      How 1v1 Party Match Flow Works:
                    </div>
                    <div>1. Host creates a 6-digit Party Code and Friend joins (2/2).</div>
                    <div>2. Party Leader clicks Start to open the Pre-Match Draft.</div>
                    <div>3. Both players vote on the Arena Map & pick 1 Hero + 3 Towers.</div>
                    <div>4. Once locked in, the winning voted map launches immediately!</div>
                  </div>

                  <button
                    onClick={() => {
                      const randAiMap =
                        allPvPMaps[Math.floor(Math.random() * allPvPMaps.length)]?.id ||
                        PVP_MAPS[0].id;
                      setAiVotedMapId(randAiMap);
                      setMyDraftLocked(false);
                      setAiDraftPhase(true);
                    }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-b from-amber-400 to-orange-600 hover:from-amber-300 hover:to-orange-500 border-2 border-white font-display font-bold text-base uppercase text-white btd-text-stroke-sm shadow-lg flex items-center justify-center gap-2 transition-transform active:scale-95"
                  >
                    <Swords className="w-5 h-5" />
                    Practice vs AI (Map Vote & Tower Select)
                  </button>
                </div>
              </div>
            ) : (
              /* STAGE 2: PRE-MATCH MAP VOTE & TOWER SELECTION (After 2nd Player Joins & Leader Starts) */
              <div className="space-y-5">
                {/* Draft Status Header Bar */}
                <div className="wood-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 border-2 border-yellow-300">
                  <div>
                    <div className="text-xs font-bold uppercase text-amber-300">
                      {aiDraftPhase
                        ? 'Solo Practice Pre-Match Draft'
                        : `Party ${activePartyRoom?.code} · Pre-Match Map Vote & Tower Selection`}
                    </div>
                    <h2 className="font-display font-bold text-2xl uppercase text-white btd-text-stroke">
                      Vote on the Map & Select Your Towers
                    </h2>
                  </div>

                  {/* Player Ready Badges */}
                  <div className="flex flex-wrap items-center gap-3">
                    {aiDraftPhase ? (
                      <>
                        <div className="px-3.5 py-2 rounded-xl bg-black/40 border border-amber-400/50 text-xs font-bold">
                          <span className="text-white">{playerName} (You): </span>
                          <span className="text-amber-300">Voting & Picking</span>
                        </div>
                        <div className="px-3.5 py-2 rounded-xl bg-black/40 border border-emerald-400/50 text-xs font-bold">
                          <span className="text-white">BISH_BASH_BOSH (AI): </span>
                          <span className="text-emerald-400">Locked In ✓</span>
                        </div>
                      </>
                    ) : (
                      activePartyRoom?.players.map((p) => (
                        <div
                          key={p.id}
                          className={`px-3.5 py-2 rounded-xl border text-xs font-bold ${
                            p.lockedIn
                              ? 'bg-emerald-950/80 border-emerald-400 text-emerald-300'
                              : 'bg-black/40 border-amber-400/50 text-amber-200'
                          }`}
                        >
                          <span className="text-white">
                            {p.name} {p.id === playerId ? '(You)' : ''}:{' '}
                          </span>
                          <span>{p.lockedIn ? 'LOCKED IN ✓' : 'Choosing Map & Towers...'}</span>
                        </div>
                      ))
                    )}

                    <button
                      onClick={() => {
                        if (aiDraftPhase) {
                          setAiDraftPhase(false);
                        } else {
                          handleLeaveParty();
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl bg-red-700 hover:bg-red-600 text-white font-display font-bold text-xs uppercase"
                    >
                      Cancel
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left 7 Columns: Arena Map Vote */}
                  <div className="lg:col-span-7 wood-panel rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-display font-bold text-xl uppercase text-white btd-text-stroke">
                          1. Vote for Arena Map
                        </h3>
                        <p className="text-xs text-amber-100/90">
                          Click a map to cast your vote. Majority vote wins (1–1 split is decided by random tiebreaker)!
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          const rand = allPvPMaps[Math.floor(Math.random() * allPvPMaps.length)];
                          if (rand) handleVoteMap(rand.id);
                        }}
                        className="px-3.5 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs uppercase flex items-center gap-1.5 shadow"
                      >
                        <Shuffle className="w-4 h-4" />
                        Vote Random Map
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[540px] overflow-y-auto pr-1">
                      {allPvPMaps.map((m) => {
                        const isMyVote = myMapVote === m.id;
                        const oppPlayer = activePartyRoom?.players.find((p) => p.id !== playerId);
                        const oppVotedThis = aiDraftPhase
                          ? aiVotedMapId === m.id
                          : oppPlayer?.mapVote === m.id;
                        const totalVotes = (isMyVote ? 1 : 0) + (oppVotedThis ? 1 : 0);

                        return (
                          <button
                            key={m.id}
                            onClick={() => handleVoteMap(m.id)}
                            className={`text-left rounded-xl p-2.5 transition-all flex flex-col justify-between border-2 relative ${
                              isMyVote
                                ? 'bg-[#6b3518] border-yellow-300 ring-2 ring-yellow-300 shadow-xl'
                                : oppVotedThis
                                  ? 'bg-[#4e2610] border-sky-400'
                                  : 'wood-panel-dark hover:border-amber-400/60'
                            }`}
                          >
                            <div>
                              <div className="relative">
                                <MapThumbnailCanvas map={m} />
                                {totalVotes > 0 && (
                                  <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-slate-950/90 border border-yellow-300 font-display font-bold text-[11px] text-yellow-300 shadow">
                                    {totalVotes} {totalVotes === 1 ? 'VOTE' : 'VOTES'}
                                  </div>
                                )}
                              </div>
                              <div className="mt-2 flex items-center justify-between gap-1">
                                <h4 className="font-display font-bold text-sm text-white truncate">
                                  {m.name}
                                </h4>
                                <span className="text-[10px] font-bold text-amber-300 shrink-0">
                                  {m.category}
                                </span>
                              </div>
                              <p className="text-[11px] text-amber-100/80 line-clamp-2 mt-0.5">
                                {m.description}
                              </p>
                            </div>

                            {/* Voter Badges */}
                            <div className="mt-2 pt-1.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-1 text-[10px] font-bold">
                              {isMyVote ? (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500 text-slate-950">
                                  YOUR VOTE ✓
                                </span>
                              ) : (
                                <span className="text-amber-200/60">Click to Vote</span>
                              )}
                              {oppVotedThis && (
                                <span className="px-1.5 py-0.5 rounded bg-sky-400 text-slate-950">
                                  {aiDraftPhase ? 'AI VOTE' : `${oppPlayer?.name || 'FRIEND'}'S VOTE`}
                                </span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Right 5 Columns: Select Your Towers (1 Hero + 3 Monkeys) & Lock In */}
                  <div className="lg:col-span-5 wood-panel rounded-2xl p-5 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-display font-bold text-xl uppercase text-white btd-text-stroke">
                            2. Select Your Towers
                          </h3>
                          <p className="text-xs text-amber-100/90">
                            Choose 1 Hero and 3 Monkeys for your match loadout.
                          </p>
                        </div>
                      </div>

                      {/* Active 4 Slots */}
                      <div className="grid grid-cols-4 gap-2 wood-panel-dark p-2.5 rounded-xl">
                        {[selectedHero, ...selectedLoadout].map((id, idx) => {
                          const sp = TOWER_SPEC_MAP[id];
                          if (!sp) return null;
                          return (
                            <div
                              key={`${id}_${idx}`}
                              className="rounded-xl bg-[#b86b43] border-2 border-yellow-300 p-1.5 flex flex-col items-center text-center"
                            >
                              <span className="text-[9px] font-bold uppercase text-amber-200">
                                {idx === 0 ? 'HERO' : `TOWER ${idx}`}
                              </span>
                              <TowerPortraitIcon specId={id} size={42} />
                              <span className="text-[10px] font-display font-bold text-white truncate w-full mt-0.5">
                                {getTowerShortName(sp)}
                              </span>
                              <span className="text-[10px] font-mono-num text-amber-300 font-bold">
                                ${sp.cost}
                              </span>
                            </div>
                          );
                        })}
                      </div>

                      {/* Full Roster Picker */}
                      <div className="grid grid-cols-4 sm:grid-cols-5 gap-1.5 max-h-64 overflow-y-auto pr-1">
                        {TOWER_SPECS.map((sp) => {
                          const inDeck = sp.id === selectedHero || selectedLoadout.includes(sp.id);
                          return (
                            <button
                              key={sp.id}
                              onClick={() => toggleLoadoutMonkey(sp.id)}
                              title={`${sp.name}: ${sp.description}`}
                              className={`relative rounded-lg p-1.5 flex flex-col items-center border transition-transform active:scale-95 ${
                                inDeck
                                  ? 'bg-emerald-600/80 border-yellow-300 ring-1 ring-yellow-300'
                                  : 'bg-[#4a210d] hover:bg-[#5c2c12] border-[#361607]'
                              }`}
                            >
                              {sp.waterOnly && (
                                <span className="absolute top-0.5 right-0.5 text-[7px] font-bold px-1 rounded bg-sky-900/90 text-sky-200">
                                  H2O
                                </span>
                              )}
                              <TowerPortraitIcon specId={sp.id} size={34} />
                              <span className="text-[9px] font-bold text-white truncate w-full text-center mt-0.5">
                                {getTowerShortName(sp)}
                              </span>
                              <span className="text-[8px] font-mono-num text-amber-300">
                                {sp.category === 'Hero' ? 'HERO' : `$${sp.cost}`}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Lock In / Ready Button */}
                    <div className="pt-3 border-t border-[#6b3518] space-y-2">
                      <button
                        onClick={handleToggleLockInDraft}
                        className={`w-full py-4 rounded-xl border-2 border-white font-display font-bold text-lg uppercase text-white btd-text-stroke shadow-xl transition-transform active:scale-95 ${
                          myDraftLocked
                            ? 'bg-gradient-to-b from-amber-500 to-orange-700'
                            : 'bg-gradient-to-b from-[#65e424] to-[#3ca30d] hover:from-[#7bf03b] hover:to-[#47bd12]'
                        }`}
                      >
                        {aiDraftPhase
                          ? 'Lock In Vote & Start Battle!'
                          : myDraftLocked
                            ? 'Locked In ✓ (Waiting for Friend... Click to Edit)'
                            : 'Lock In Map Vote & Towers!'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ==================== TAB 2: PVE BTD6 CAMPAIGNS & SANDBOX ==================== */}
        {hubTab === 'pve' && (
          <div className="space-y-5">
            {/* Top Controls: 6 Distinct PvE Modes (Easy, Medium, Hard, Impossible, Endless, Sandbox) + Launch Button */}
            <div className="wood-panel rounded-2xl p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
              {/* 6 Distinct PvE Modes */}
              <div className="lg:col-span-9 space-y-2">
                <div className="text-xs font-display font-bold uppercase text-amber-200">
                  1. Select PvE Game Mode (4 Campaigns, Endless Mode, or Sandbox Mode):
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                  {(
                    [
                      { diff: 'Easy', rounds: '40 Rounds', lives: '200 Lives', color: 'from-emerald-400 to-green-700' },
                      { diff: 'Medium', rounds: '60 Rounds', lives: '150 Lives', color: 'from-sky-400 to-blue-700' },
                      { diff: 'Hard', rounds: '80 Rounds', lives: '100 Lives', color: 'from-amber-400 to-orange-700' },
                      { diff: 'Impossible', rounds: '100 Rounds', lives: '1 Life!', color: 'from-rose-500 to-red-900' },
                      { diff: 'Endless', rounds: '∞ Rounds', lives: '150 Lives', color: 'from-cyan-400 to-indigo-800' },
                      { diff: 'Sandbox', rounds: 'Admin Controls', lives: '9,999 Lives', color: 'from-purple-500 to-fuchsia-900' },
                    ] as const
                  ).map((item) => {
                    const active = selectedDifficulty === item.diff;
                    return (
                      <button
                        key={item.diff}
                        onClick={() => setSelectedDifficulty(item.diff)}
                        className={`p-3 rounded-xl border-2 text-left transition-transform active:scale-95 bg-gradient-to-b ${item.color} ${
                          active
                            ? 'border-yellow-300 ring-2 ring-yellow-300 scale-[1.02] shadow-lg'
                            : 'border-[#3b1b0a] opacity-80 hover:opacity-100'
                        }`}
                      >
                        <div className="font-display font-bold text-sm text-white uppercase btd-text-stroke-sm flex items-center justify-between gap-1">
                          <span>{item.diff}</span>
                          {item.diff === 'Endless' && <InfinityIcon className="w-3.5 h-3.5 text-cyan-200 shrink-0" />}
                          {item.diff === 'Sandbox' && <Wrench className="w-3.5 h-3.5 text-amber-200 shrink-0" />}
                        </div>
                        <div className="text-[10px] font-bold text-white/95 mt-0.5">
                          {item.rounds}
                        </div>
                        <div className="text-[10px] font-semibold text-white/80">
                          {item.lives}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Launch Button */}
              <div className="lg:col-span-3 flex flex-col justify-end">
                <button
                  onClick={() => {
                    setResumeLoadedRun(null);
                    setActiveView('pve_play');
                  }}
                  className="w-full py-4 rounded-xl bg-gradient-to-b from-[#65e424] to-[#3ca30d] hover:from-[#7bf03b] hover:to-[#47bd12] border-2 border-white font-display font-bold text-base uppercase text-white btd-text-stroke shadow-xl flex flex-col items-center justify-center gap-0.5 transition-transform active:scale-95"
                >
                  <div className="flex items-center gap-2">
                    <Play className="w-5 h-5 fill-white" />
                    <span>Play {selectedDifficulty}</span>
                  </div>
                  <span className="text-[11px] text-amber-100 font-semibold truncate max-w-full px-2">
                    Map: {currentPvEMap.name}
                  </span>
                </button>
              </div>
            </div>

            {/* Map Category Filter Bar + Random Map Button */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 bg-[#361607] p-1.5 rounded-xl border-2 border-[#6b3518]">
                {(['All', 'Beginner', 'Intermediate', 'Advanced', 'Expert'] as const).map(
                  (cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedPvECategory(cat)}
                      className={`px-4 py-1.5 rounded-lg font-display font-bold text-xs uppercase transition-colors ${
                        selectedPvECategory === cat
                          ? 'bg-amber-400 text-slate-950 shadow'
                          : 'text-amber-100 hover:text-white'
                      }`}
                    >
                      {cat}
                    </button>
                  )
                )}
              </div>

              <button
                onClick={() => {
                  const pool = filteredPvEMaps.length > 0 ? filteredPvEMaps : allPvEMaps;
                  const rand = pool[Math.floor(Math.random() * pool.length)];
                  if (rand) setSelectedPvEMapId(rand.id);
                }}
                className="px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-display font-bold text-xs uppercase flex items-center gap-1.5 shadow"
              >
                <Shuffle className="w-4 h-4" />
                Random Map Selection
              </button>
            </div>

            {/* 12+ Original PvE Maps Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredPvEMaps.map((m) => {
                const isSelected = m.id === selectedPvEMapId;
                const medals = completedMaps[m.id] || [];

                return (
                  <div
                    key={m.id}
                    onClick={() => setSelectedPvEMapId(m.id)}
                    className={`cursor-pointer rounded-2xl p-3 flex flex-col justify-between transition-all border-2 ${
                      isSelected
                        ? 'wood-panel border-yellow-300 ring-2 ring-yellow-300 scale-[1.01]'
                        : 'wood-panel-dark hover:border-amber-400/70'
                    }`}
                  >
                    <div>
                      <MapThumbnailCanvas map={m} />
                      <div className="mt-2.5 flex items-center justify-between gap-2">
                        <h3 className="font-display font-bold text-base text-white truncate">
                          {m.name}
                        </h3>
                        <span className="text-xs font-bold text-amber-300 shrink-0">
                          {m.category}
                        </span>
                      </div>
                      <p className="text-xs text-amber-100/85 mt-1 line-clamp-2">
                        {m.description}
                      </p>
                    </div>

                    <div className="mt-3 pt-2 border-t border-white/10 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-sky-300 font-semibold">
                        <span>Env: {m.environmentalEffect.name}</span>
                        <span>{m.paths.length} Path(s)</span>
                      </div>

                      {/* Earned Campaign Medals */}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-amber-200/80">Medals:</span>
                        <div className="flex items-center gap-1">
                          {(['Easy', 'Medium', 'Hard', 'Impossible'] as const).map((d) => (
                            <span
                              key={d}
                              title={`${d} Medal`}
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                medals.includes(d)
                                  ? 'bg-amber-400 text-slate-950'
                                  : 'bg-black/35 text-slate-500'
                              }`}
                            >
                              {d[0]}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ==================== TAB 3: INFO ==================== */}
        {hubTab === 'info' && (
          <div className="wood-panel rounded-2xl p-5 space-y-4">
            <div>
              <h2 className="font-display font-bold text-2xl uppercase text-white btd-text-stroke">
                Info
              </h2>
              <p className="text-xs text-amber-100/90">
                All standard, elemental, fortified, camo, regrow, MOAB-class, and Boss Bloons included in the simulation engine.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {(Object.keys(BLOON_SPECS) as BloonType[]).map((bKey) => {
                const sp = BLOON_SPECS[bKey];
                return (
                  <div key={bKey} className="wood-panel-dark rounded-xl p-3 flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-black/35 flex items-center justify-center shrink-0">
                      <BloonIcon type={bKey} size={38} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display font-bold text-sm text-white truncate">
                          {sp.name}
                        </h3>
                        <span className="text-xs font-mono-num text-amber-300 font-bold">
                          HP {sp.hp.toLocaleString()}
                        </span>
                      </div>
                      <div className="text-[11px] text-amber-100/85 mt-0.5">
                        Speed: {sp.speed}x · RBE: {sp.rbe.toLocaleString()}
                      </div>
                      {sp.immunities.length > 0 ? (
                        <div className="text-[10px] text-rose-300 font-semibold mt-1">
                          Immune to: {sp.immunities.join(', ')}
                        </div>
                      ) : (
                        <div className="text-[10px] text-emerald-300 font-semibold mt-1">
                          Vulnerable to all weapon types
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
