import Peer, { DataConnection } from 'peerjs';

interface HostPartyPlayer {
  id: string;
  name: string;
  conn: DataConnection | 'host';
  ready: boolean;
  lockedIn: boolean;
  mapVote: string | null;
  loadout: string[];
  hero: string;
  lives: number;
  cash: number;
  eco: number;
}

interface HostPartyRoom {
  code: string;
  hostId: string;
  mapId: string;
  status: 'lobby' | 'draft' | 'playing' | 'finished';
  round: number;
  createdAt: number;
  players: Map<string, HostPartyPlayer>;
  customMapData?: unknown;
}

const PEER_PREFIX = 'btd6-odyssey-room-';

const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

function generateSixDigitCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Serverless WebRTC (PeerJS) Socket that implements the WebSocket interface
 * so 6-Digit Party Code Multiplayer works on static hosts like GitHub Pages
 * (https://urnperiodic.github.io/BTD6/) without needing a Node.js backend!
 */
export class ServerlessPartySocket {
  public readyState: number = WebSocket.OPEN;
  public onopen: ((ev: Event) => void) | null = null;
  public onerror: ((ev: Event) => void) | null = null;
  public onmessage: ((ev: MessageEvent) => void) | null = null;
  public onclose: ((ev: Event) => void) | null = null;

  private listeners = new Set<(ev: MessageEvent) => void>();
  private peer: Peer | null = null;
  private guestConn: DataConnection | null = null;
  private hostRoom: HostPartyRoom | null = null;
  private localPlayerId: string | null = null;

  constructor() {
    setTimeout(() => {
      this.onopen?.(new Event('open'));
    }, 0);
  }

  public addEventListener(type: string, listener: (ev: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners.add(listener);
    }
  }

  public removeEventListener(type: string, listener: (ev: MessageEvent) => void) {
    if (type === 'message') {
      this.listeners.delete(listener);
    }
  }

  private emitToLocalClient(payload: Record<string, unknown>) {
    const ev = new MessageEvent('message', { data: JSON.stringify(payload) });
    this.onmessage?.(ev);
    for (const fn of this.listeners) {
      fn(ev);
    }
  }

  private cleanupPeer() {
    if (this.guestConn) {
      try {
        this.guestConn.close();
      } catch {
        // ignore
      }
      this.guestConn = null;
    }
    if (this.peer) {
      try {
        this.peer.destroy();
      } catch {
        // ignore
      }
      this.peer = null;
    }
    this.hostRoom = null;
  }

  public close() {
    this.cleanupPeer();
    this.readyState = WebSocket.CLOSED;
    this.onclose?.(new Event('close'));
  }

  public send(raw: string) {
    try {
      const msg = JSON.parse(raw);
      const type = String(msg.type || '');

      if (type === 'create_party') {
        this.startHostRoom(msg);
        return;
      }

      if (type === 'join_party') {
        this.joinHostRoom(msg);
        return;
      }

      // If we are the Host of an active P2P room, handle the message locally
      if (this.hostRoom && this.localPlayerId) {
        this.handleRoomMessage(this.localPlayerId, msg);
        return;
      }

      // If we are a Guest connected to a Host, send over the WebRTC DataConnection
      if (this.guestConn && this.guestConn.open) {
        this.guestConn.send(msg);
      }
    } catch (err) {
      console.error('P2P socket send error:', err);
    }
  }

  private serializeRoom(room: HostPartyRoom) {
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

  private broadcastFromHost(
    room: HostPartyRoom,
    message: Record<string, unknown>,
    excludePlayerId?: string
  ) {
    for (const [pid, player] of room.players.entries()) {
      if (excludePlayerId && pid === excludePlayerId) continue;
      if (player.conn === 'host') {
        this.emitToLocalClient(message);
      } else if (player.conn.open) {
        player.conn.send(message);
      }
    }
  }

  private startHostRoom(msg: Record<string, unknown>, retryCount = 0) {
    this.cleanupPeer();

    const playerId = String(msg.playerId || `p_${Date.now()}`);
    const playerName = String(msg.playerName || 'Commander').slice(0, 18);
    const mapId = String(msg.mapId || 'pvp_mayan_mirror');
    const loadout = Array.isArray(msg.loadout)
      ? (msg.loadout as string[])
      : ['dart_monkey', 'tack_shooter', 'sniper_monkey'];
    const hero = String(msg.hero || 'hero_quincy');
    const code = generateSixDigitCode();

    this.localPlayerId = playerId;

    const peer = new Peer(`${PEER_PREFIX}${code}`, { config: ICE_CONFIG });
    this.peer = peer;

    peer.on('open', () => {
      const hostPlayer: HostPartyPlayer = {
        id: playerId,
        name: playerName,
        conn: 'host',
        ready: true,
        lockedIn: false,
        mapVote: mapId,
        loadout,
        hero,
        lives: 150,
        cash: 650,
        eco: 250,
      };

      const room: HostPartyRoom = {
        code,
        hostId: playerId,
        mapId,
        status: 'lobby',
        round: 1,
        createdAt: Date.now(),
        players: new Map([[playerId, hostPlayer]]),
        customMapData: msg.customMapData,
      };

      this.hostRoom = room;
      this.emitToLocalClient({
        type: 'party_created',
        room: this.serializeRoom(room),
        playerId,
      });
    });

    peer.on('connection', (conn) => {
      let guestPlayerId: string | null = null;

      conn.on('data', (data) => {
        if (!this.hostRoom || typeof data !== 'object' || !data) return;
        const incoming = data as Record<string, unknown>;
        const incType = String(incoming.type || '');

        if (incType === 'join_party') {
          const gId = String(incoming.playerId || `p_${Date.now()}`);
          const gName = String(incoming.playerName || 'Challenger').slice(0, 18);
          const gLoadout = Array.isArray(incoming.loadout)
            ? (incoming.loadout as string[])
            : ['dart_monkey', 'bomb_shooter', 'wizard_monkey'];
          const gHero = String(incoming.hero || 'hero_quincy');

          if (!this.hostRoom.players.has(gId) && this.hostRoom.players.size >= 2) {
            conn.send({
              type: 'party_error',
              message: `Party ${this.hostRoom.code} is already full (2/2 players).`,
            });
            return;
          }

          guestPlayerId = gId;
          const guestPlayer: HostPartyPlayer = {
            id: gId,
            name: gName,
            conn,
            ready: true,
            lockedIn: false,
            mapVote: this.hostRoom.mapId,
            loadout: gLoadout,
            hero: gHero,
            lives: 150,
            cash: 650,
            eco: 250,
          };

          this.hostRoom.players.set(gId, guestPlayer);
          this.broadcastFromHost(this.hostRoom, {
            type: 'party_updated',
            room: this.serializeRoom(this.hostRoom),
          });
          return;
        }

        if (guestPlayerId) {
          this.handleRoomMessage(guestPlayerId, incoming);
        }
      });

      conn.on('close', () => {
        if (this.hostRoom && guestPlayerId && this.hostRoom.players.has(guestPlayerId)) {
          this.hostRoom.players.delete(guestPlayerId);
          this.broadcastFromHost(this.hostRoom, {
            type: 'player_left',
            leftPlayerId: guestPlayerId,
            room: this.serializeRoom(this.hostRoom),
          });
        }
      });
    });

    peer.on('error', (err: { type?: string; message?: string }) => {
      if (err?.type === 'unavailable-id' && retryCount < 4) {
        this.startHostRoom(msg, retryCount + 1);
        return;
      }
      this.emitToLocalClient({
        type: 'party_error',
        message: 'Could not initialize P2P room. Please try again.',
      });
    });
  }

  private joinHostRoom(msg: Record<string, unknown>) {
    this.cleanupPeer();

    const code = String(msg.code || '').trim();
    const playerId = String(msg.playerId || `p_${Date.now()}`);
    this.localPlayerId = playerId;

    const peer = new Peer({ config: ICE_CONFIG });
    this.peer = peer;

    let connected = false;
    const timeoutId = setTimeout(() => {
      if (!connected) {
        this.emitToLocalClient({
          type: 'party_error',
          message: `No active party found with code ${code}. Make sure the host has created the party.`,
        });
        this.cleanupPeer();
      }
    }, 8000);

    peer.on('open', () => {
      const conn = peer.connect(`${PEER_PREFIX}${code}`, { reliable: true });
      this.guestConn = conn;

      conn.on('open', () => {
        connected = true;
        clearTimeout(timeoutId);
        conn.send(msg);
      });

      conn.on('data', (data) => {
        if (typeof data === 'object' && data) {
          this.emitToLocalClient(data as Record<string, unknown>);
        }
      });

      conn.on('close', () => {
        if (connected) {
          this.emitToLocalClient({
            type: 'player_left',
            room: null,
          });
        }
      });

      conn.on('error', () => {
        clearTimeout(timeoutId);
        this.emitToLocalClient({
          type: 'party_error',
          message: `Failed to connect to party ${code}.`,
        });
      });
    });

    peer.on('error', () => {
      clearTimeout(timeoutId);
      if (!connected) {
        this.emitToLocalClient({
          type: 'party_error',
          message: `No active party found with code ${code}.`,
        });
      }
    });
  }

  private handleRoomMessage(senderId: string, msg: Record<string, unknown>) {
    const room = this.hostRoom;
    if (!room) return;
    const sender = room.players.get(senderId);
    if (!sender) return;

    const type = String(msg.type || '');

    switch (type) {
      case 'update_lobby': {
        if (Array.isArray(msg.loadout)) sender.loadout = msg.loadout as string[];
        if (msg.hero) sender.hero = String(msg.hero);
        if (typeof msg.ready === 'boolean') sender.ready = msg.ready;
        if (msg.mapVote) sender.mapVote = String(msg.mapVote);
        if (typeof msg.lockedIn === 'boolean') sender.lockedIn = msg.lockedIn;
        if (msg.mapId && senderId === room.hostId) {
          room.mapId = String(msg.mapId);
          if (msg.customMapData !== undefined) {
            room.customMapData = msg.customMapData;
          }
        }
        this.broadcastFromHost(room, {
          type: 'party_updated',
          room: this.serializeRoom(room),
        });
        break;
      }

      case 'start_draft': {
        if (senderId !== room.hostId) return;
        if (room.players.size < 2) {
          this.emitToLocalClient({
            type: 'party_error',
            message: 'Waiting for second player to join the 6-digit party.',
          });
          return;
        }
        room.status = 'draft';
        for (const p of room.players.values()) {
          p.lockedIn = false;
          if (!p.mapVote) p.mapVote = room.mapId;
        }
        this.broadcastFromHost(room, {
          type: 'draft_started',
          room: this.serializeRoom(room),
        });
        break;
      }

      case 'submit_draft': {
        if (Array.isArray(msg.loadout) && msg.loadout.length > 0) {
          sender.loadout = (msg.loadout as string[]).slice(0, 3);
        }
        if (msg.hero) sender.hero = String(msg.hero);
        if (msg.mapVote) sender.mapVote = String(msg.mapVote);
        if (typeof msg.lockedIn === 'boolean') sender.lockedIn = msg.lockedIn;

        this.broadcastFromHost(room, {
          type: 'party_updated',
          room: this.serializeRoom(room),
        });

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
          this.broadcastFromHost(room, {
            type: 'match_started',
            room: this.serializeRoom(room),
            winningMapId,
            timestamp: Date.now(),
          });
        }
        break;
      }

      case 'bloon_send': {
        if (typeof msg.eco === 'number') sender.eco = msg.eco;
        if (typeof msg.cash === 'number') sender.cash = msg.cash;
        this.broadcastFromHost(
          room,
          {
            type: 'opponent_bloon_send',
            fromPlayerId: senderId,
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
          senderId
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
        this.broadcastFromHost(
          room,
          {
            type: 'opponent_board_sync',
            fromPlayerId: senderId,
            lives: sender.lives,
            cash: sender.cash,
            eco: sender.eco,
            round: room.round,
            towers: msg.towers || [],
            bloons: msg.bloons || [],
            activeBoosts: msg.activeBoosts || {},
          },
          senderId
        );
        break;
      }

      case 'emote': {
        this.broadcastFromHost(room, {
          type: 'player_emote',
          fromPlayerId: senderId,
          emote: String(msg.emote || '👍'),
        });
        break;
      }

      case 'speed_change': {
        const spd = [1, 2, 3].includes(Number(msg.speed)) ? Number(msg.speed) : 1;
        this.broadcastFromHost(
          room,
          {
            type: 'match_speed_changed',
            fromPlayerId: senderId,
            playerName: sender.name,
            speed: spd,
          },
          senderId
        );
        break;
      }

      case 'match_over': {
        room.status = 'finished';
        this.broadcastFromHost(room, {
          type: 'match_ended',
          winnerId: msg.winnerId,
          reason: msg.reason || 'Lives depleted',
        });
        break;
      }

      case 'leave_party': {
        if (senderId === room.hostId) {
          this.broadcastFromHost(
            room,
            {
              type: 'player_left',
              leftPlayerId: senderId,
              room: null,
            },
            senderId
          );
          this.cleanupPeer();
        } else {
          room.players.delete(senderId);
          this.broadcastFromHost(room, {
            type: 'player_left',
            leftPlayerId: senderId,
            room: this.serializeRoom(room),
          });
        }
        break;
      }
    }
  }
}

/**
 * Creates a Multiplayer Socket connection:
 * - Uses Serverless WebRTC (PeerJS) automatically on static hosts like GitHub Pages (*.github.io)
 *   or as an automatic fallback if `/ws` is unreachable, so `wss://urnperiodic.github.io/ws`
 *   never fails!
 */
export function createMultiplayerSocket(): Promise<WebSocket> {
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const isStaticHost =
    host.endsWith('.github.io') ||
    host.endsWith('.pages.dev') ||
    host.endsWith('.vercel.app') ||
    host.endsWith('.netlify.app');

  if (isStaticHost) {
    const p2pSocket = new ServerlessPartySocket() as unknown as WebSocket;
    return Promise.resolve(p2pSocket);
  }

  return new Promise((resolve) => {
    try {
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(`${proto}//${window.location.host}/ws`);
      let settled = false;

      const fallbackToP2P = () => {
        if (settled) return;
        settled = true;
        const p2pSocket = new ServerlessPartySocket() as unknown as WebSocket;
        resolve(p2pSocket);
      };

      const timer = setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          try {
            ws.close();
          } catch {
            // ignore
          }
          fallbackToP2P();
        }
      }, 2200);

      ws.onopen = () => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(ws);
      };

      ws.onerror = () => {
        clearTimeout(timer);
        fallbackToP2P();
      };
    } catch {
      const p2pSocket = new ServerlessPartySocket() as unknown as WebSocket;
      resolve(p2pSocket);
    }
  });
}
