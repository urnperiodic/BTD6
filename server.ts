import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface PartyPlayer {
  id: string;
  name: string;
  ws: WebSocket;
  ready: boolean;
  lockedIn: boolean;
  mapVote: string | null;
  loadout: string[];
  hero: string;
  lives: number;
  cash: number;
  eco: number;
}

interface PartyRoom {
  code: string;
  hostId: string;
  mapId: string;
  status: 'lobby' | 'draft' | 'playing' | 'finished';
  round: number;
  createdAt: number;
  players: Map<string, PartyPlayer>;
  customMapData?: unknown;
}

const rooms = new Map<string, PartyRoom>();
const sharedCustomMaps: Array<Record<string, unknown>> = [];

function generateSixDigitCode(): string {
  for (let attempt = 0; attempt < 20; attempt++) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    if (!rooms.has(code)) return code;
  }
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function serializeRoom(room: PartyRoom) {
  const playersList = Array.from(room.players.values()).map((p) => ({
    id: p.id,
    name: p.name,
    ready: p.ready,
    lockedIn: p.lockedIn,
    mapVote: p.mapVote,
    loadout: p.loadout,
    hero: p.hero,
    lives: p.lives,
    cash: p.cash,
    eco: p.eco,
    isHost: p.id === room.hostId,
  }));

  return {
    code: room.code,
    hostId: room.hostId,
    mapId: room.mapId,
    status: room.status,
    round: room.round,
    players: playersList,
    customMapData: room.customMapData ?? null,
  };
}

function broadcastToRoom(room: PartyRoom, message: Record<string, unknown>, excludePlayerId?: string) {
  const payload = JSON.stringify(message);
  for (const [playerId, player] of room.players.entries()) {
    if (excludePlayerId && playerId === excludePlayerId) continue;
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(payload);
    }
  }
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  app.use(express.json({ limit: '2mb' }));

  // REST Endpoints for Community Custom Map Sharing
  app.get('/api/custom-maps', (_req, res) => {
    res.json({ maps: sharedCustomMaps });
  });

  app.post('/api/custom-maps', (req, res) => {
    const mapObj = req.body?.map;
    if (!mapObj || typeof mapObj !== 'object' || !mapObj.id || !mapObj.name) {
      res.status(400).json({ error: 'Invalid custom map payload' });
      return;
    }
    const existingIdx = sharedCustomMaps.findIndex((m) => m.id === mapObj.id);
    if (existingIdx >= 0) {
      sharedCustomMaps[existingIdx] = mapObj;
    } else {
      sharedCustomMaps.unshift(mapObj);
      if (sharedCustomMaps.length > 50) sharedCustomMaps.pop();
    }
    res.json({ ok: true, map: mapObj, total: sharedCustomMaps.length });
  });

  app.get('/api/rooms/:code', (req, res) => {
    const code = (req.params.code || '').trim();
    const room = rooms.get(code);
    if (!room) {
      res.status(404).json({ error: 'Party room not found' });
      return;
    }
    res.json({ room: serializeRoom(room) });
  });

  // WebSocket Server for 6-digit Party PvP
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomCode: string | null = null;
    let currentPlayerId: string | null = null;

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        const type = msg.type as string;

        if (type === 'create_party') {
          const playerId = String(msg.playerId || `p_${Date.now()}`);
          const playerName = String(msg.playerName || 'Commander').slice(0, 18);
          const mapId = String(msg.mapId || 'pvp_mayan_mirror');
          const loadout = Array.isArray(msg.loadout) ? msg.loadout : ['dart_monkey', 'tack_shooter', 'sniper_monkey'];
          const hero = String(msg.hero || 'hero_quincy');

          const code = generateSixDigitCode();
          const player: PartyPlayer = {
            id: playerId,
            name: playerName,
            ws,
            ready: true,
            lockedIn: false,
            mapVote: mapId,
            loadout,
            hero,
            lives: 150,
            cash: 650,
            eco: 250,
          };

          const room: PartyRoom = {
            code,
            hostId: playerId,
            mapId,
            status: 'lobby',
            round: 1,
            createdAt: Date.now(),
            players: new Map([[playerId, player]]),
            customMapData: msg.customMapData,
          };

          rooms.set(code, room);
          currentRoomCode = code;
          currentPlayerId = playerId;

          ws.send(
            JSON.stringify({
              type: 'party_created',
              room: serializeRoom(room),
              playerId,
            })
          );
          return;
        }

        if (type === 'join_party') {
          const code = String(msg.code || '').trim();
          const room = rooms.get(code);

          if (!room) {
            ws.send(JSON.stringify({ type: 'party_error', message: `No active party found with code ${code}.` }));
            return;
          }

          const playerId = String(msg.playerId || `p_${Date.now()}`);
          const playerName = String(msg.playerName || 'Challenger').slice(0, 18);
          const loadout = Array.isArray(msg.loadout) ? msg.loadout : ['dart_monkey', 'bomb_shooter', 'wizard_monkey'];
          const hero = String(msg.hero || 'hero_quincy');

          // Allow reconnect if player ID already in room, otherwise max 2 players
          if (!room.players.has(playerId) && room.players.size >= 2) {
            ws.send(JSON.stringify({ type: 'party_error', message: `Party ${code} is already full (2/2 players).` }));
            return;
          }

          const player: PartyPlayer = {
            id: playerId,
            name: playerName,
            ws,
            ready: true,
            lockedIn: false,
            mapVote: room.mapId,
            loadout,
            hero,
            lives: 150,
            cash: 650,
            eco: 250,
          };

          room.players.set(playerId, player);
          currentRoomCode = code;
          currentPlayerId = playerId;

          broadcastToRoom(room, {
            type: 'party_updated',
            room: serializeRoom(room),
          });
          return;
        }

        if (!currentRoomCode || !currentPlayerId) return;
        const room = rooms.get(currentRoomCode);
        if (!room) return;
        const sender = room.players.get(currentPlayerId);
        if (!sender) return;

        switch (type) {
          case 'update_lobby': {
            if (Array.isArray(msg.loadout)) sender.loadout = msg.loadout;
            if (msg.hero) sender.hero = String(msg.hero);
            if (typeof msg.ready === 'boolean') sender.ready = msg.ready;
            if (msg.mapVote) sender.mapVote = String(msg.mapVote);
            if (typeof msg.lockedIn === 'boolean') sender.lockedIn = msg.lockedIn;
            if (msg.mapId && currentPlayerId === room.hostId) {
              room.mapId = String(msg.mapId);
              if (msg.customMapData !== undefined) {
                room.customMapData = msg.customMapData;
              }
            }
            broadcastToRoom(room, {
              type: 'party_updated',
              room: serializeRoom(room),
            });
            break;
          }

          case 'start_draft': {
            // Leader starts the Map Vote & Tower Selection phase after 2nd player joins
            if (currentPlayerId !== room.hostId) {
              ws.send(JSON.stringify({ type: 'party_error', message: 'Only the party leader can start.' }));
              return;
            }
            if (room.players.size < 2) {
              ws.send(JSON.stringify({ type: 'party_error', message: 'Waiting for second player to join the 6-digit party.' }));
              return;
            }
            room.status = 'draft';
            for (const p of room.players.values()) {
              p.lockedIn = false;
              if (!p.mapVote) p.mapVote = room.mapId;
            }
            broadcastToRoom(room, {
              type: 'draft_started',
              room: serializeRoom(room),
            });
            break;
          }

          case 'submit_draft': {
            if (Array.isArray(msg.loadout) && msg.loadout.length > 0) {
              sender.loadout = msg.loadout.slice(0, 3);
            }
            if (msg.hero) sender.hero = String(msg.hero);
            if (msg.mapVote) sender.mapVote = String(msg.mapVote);
            if (typeof msg.lockedIn === 'boolean') sender.lockedIn = msg.lockedIn;

            broadcastToRoom(room, {
              type: 'party_updated',
              room: serializeRoom(room),
            });

            // Check if all players (2/2) have locked in their towers & map vote
            const allPlayers = Array.from(room.players.values());
            if (allPlayers.length >= 2 && allPlayers.every((p) => p.lockedIn)) {
              const votes = allPlayers.map((p) => p.mapVote).filter(Boolean) as string[];
              let winningMapId = room.mapId;
              if (votes.length > 0) {
                winningMapId = votes[Math.floor(Math.random() * votes.length)];
              }
              room.mapId = winningMapId;
              room.status = 'playing';
              room.round = 1;
              for (const p of allPlayers) {
                p.lives = 150;
                p.cash = 650;
                p.eco = 250;
              }
              broadcastToRoom(room, {
                type: 'match_started',
                room: serializeRoom(room),
                winningMapId,
                timestamp: Date.now(),
              });
            }
            break;
          }

          case 'start_match': {
            if (room.players.size < 2) {
              ws.send(JSON.stringify({ type: 'party_error', message: 'Waiting for second player to join the 6-digit party.' }));
              return;
            }
            const allPlayers = Array.from(room.players.values());
            const votes = allPlayers.map((p) => p.mapVote).filter(Boolean) as string[];
            if (votes.length > 0) {
              room.mapId = votes[Math.floor(Math.random() * votes.length)];
            }
            room.status = 'playing';
            room.round = 1;
            for (const p of room.players.values()) {
              p.lives = 150;
              p.cash = 650;
              p.eco = 250;
            }
            broadcastToRoom(room, {
              type: 'match_started',
              room: serializeRoom(room),
              winningMapId: room.mapId,
              timestamp: Date.now(),
            });
            break;
          }

          case 'bloon_send': {
            // Forward bloon rush to opponent and update sender eco/cash
            if (typeof msg.eco === 'number') sender.eco = msg.eco;
            if (typeof msg.cash === 'number') sender.cash = msg.cash;
            broadcastToRoom(
              room,
              {
                type: 'opponent_bloon_send',
                fromPlayerId: currentPlayerId,
                sendId: msg.sendId,
                bloonType: msg.bloonType,
                count: msg.count,
                spacing: msg.spacing,
                camo: Boolean(msg.camo),
                regrow: Boolean(msg.regrow),
                fortified: Boolean(msg.fortified),
                senderEco: sender.eco,
                senderCash: sender.cash,
              },
              currentPlayerId
            );
            break;
          }

          case 'board_sync': {
            if (typeof msg.lives === 'number') sender.lives = msg.lives;
            if (typeof msg.cash === 'number') sender.cash = msg.cash;
            if (typeof msg.eco === 'number') sender.eco = msg.eco;
            if (typeof msg.round === 'number' && msg.round > room.round) {
              room.round = msg.round;
            }
            broadcastToRoom(
              room,
              {
                type: 'opponent_board_sync',
                fromPlayerId: currentPlayerId,
                lives: sender.lives,
                cash: sender.cash,
                eco: sender.eco,
                round: room.round,
                towers: msg.towers || [],
                bloons: msg.bloons || [],
                activeBoosts: msg.activeBoosts || {},
              },
              currentPlayerId
            );
            break;
          }

          case 'emote': {
            broadcastToRoom(room, {
              type: 'player_emote',
              fromPlayerId: currentPlayerId,
              emote: String(msg.emote || '👍'),
            });
            break;
          }

          case 'speed_change': {
            const spd = [1, 2, 3].includes(Number(msg.speed)) ? Number(msg.speed) : 1;
            broadcastToRoom(
              room,
              {
                type: 'match_speed_changed',
                fromPlayerId: currentPlayerId,
                playerName: sender.name,
                speed: spd,
              },
              currentPlayerId
            );
            break;
          }

          case 'match_over': {
            room.status = 'finished';
            broadcastToRoom(room, {
              type: 'match_ended',
              winnerId: msg.winnerId,
              reason: msg.reason || 'Lives depleted',
            });
            break;
          }

          case 'leave_party': {
            room.players.delete(currentPlayerId);
            if (room.players.size === 0) {
              rooms.delete(room.code);
            } else {
              const remaining = Array.from(room.players.keys())[0];
              room.hostId = remaining;
              broadcastToRoom(room, {
                type: 'player_left',
                leftPlayerId: currentPlayerId,
                room: serializeRoom(room),
              });
            }
            currentRoomCode = null;
            currentPlayerId = null;
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomCode && currentPlayerId) {
        const room = rooms.get(currentRoomCode);
        if (room) {
          room.players.delete(currentPlayerId);
          if (room.players.size === 0) {
            rooms.delete(currentRoomCode);
          } else {
            const remaining = Array.from(room.players.keys())[0];
            room.hostId = remaining;
            broadcastToRoom(room, {
              type: 'player_left',
              leftPlayerId: currentPlayerId,
              room: serializeRoom(room),
            });
          }
        }
      }
    });
  });

  // Cleanup stale rooms older than 4 hours
  setInterval(() => {
    const cutoff = Date.now() - 4 * 60 * 60 * 1000;
    for (const [code, room] of rooms.entries()) {
      if (room.createdAt < cutoff && room.players.size === 0) {
        rooms.delete(code);
      }
    }
  }, 60_000);

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Bloons TD: Battles & Odyssey server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
