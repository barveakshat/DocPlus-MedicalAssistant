import { WebSocketServer, WebSocket as WsWebSocket } from 'ws';
import { IncomingMessage } from 'http';

interface Client {
  ws: WsWebSocket;
  userId: string;
  sessionId: string;
  joinedAt: Date;
}

interface ChatMessage {
  type: 'message' | 'typing' | 'read';
  sessionId: string;
  senderId: string;
  content?: string;
  messageId?: string;
  messageType?: 'text' | 'image' | 'file';
  attachmentName?: string;
  attachmentMimeType?: string;
  attachmentSize?: number;
  attachmentPath?: string;
  timestamp: string;
}

/**
 * WebSocket connection manager.
 * Groups clients into "rooms" by sessionId for doctor-patient chat.
 */
export class WebSocketManager {
  private rooms: Map<string, Client[]> = new Map();
  private wss: WebSocketServer;

  constructor(wss: WebSocketServer) {
    this.wss = wss;
    this.setupConnectionHandler();
  }

  private setupConnectionHandler() {
    this.wss.on('connection', (ws: WsWebSocket, req: IncomingMessage) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const sessionId = url.searchParams.get('sessionId');
      const userId = url.searchParams.get('userId');

      if (!sessionId || !userId) {
        ws.close(4001, 'Missing sessionId or userId query parameter');
        return;
      }

      const client: Client = {
        ws,
        userId,
        sessionId,
        joinedAt: new Date(),
      };

      // Add client to room
      this.addToRoom(sessionId, client);

      // Handle incoming messages
      ws.on('message', (data: Buffer) => {
        try {
          const message: ChatMessage = JSON.parse(data.toString());
          message.sessionId = sessionId;
          message.senderId = userId;
          message.timestamp = new Date().toISOString();

          // Broadcast to other clients in the same room
          this.broadcastToRoom(sessionId, message, userId);
        } catch (err) {
          console.error('Invalid WebSocket message format:', err);
        }
      });

      // Handle disconnect
      ws.on('close', () => {
        this.removeFromRoom(sessionId, client);
      });

      ws.on('error', (err) => {
        console.error(`WebSocket error for user ${userId} in session ${sessionId}:`, err.message);
        this.removeFromRoom(sessionId, client);
      });

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'connected',
        sessionId,
        userId,
        timestamp: new Date().toISOString(),
      }));
    });
  }

  private addToRoom(sessionId: string, client: Client) {
    if (!this.rooms.has(sessionId)) {
      this.rooms.set(sessionId, []);
    }

    // Remove any existing connection for this user in this room (prevents duplicates)
    const room = this.rooms.get(sessionId)!;
    const existingIndex = room.findIndex(c => c.userId === client.userId);
    if (existingIndex !== -1) {
      room[existingIndex].ws.close(4002, 'Replaced by new connection');
      room.splice(existingIndex, 1);
    }

    room.push(client);
  }

  private removeFromRoom(sessionId: string, client: Client) {
    const room = this.rooms.get(sessionId);
    if (!room) return;

    const index = room.findIndex(c => c.ws === client.ws);
    if (index !== -1) {
      room.splice(index, 1);
    }

    // Clean up empty rooms
    if (room.length === 0) {
      this.rooms.delete(sessionId);
    }
  }

  private broadcastToRoom(sessionId: string, message: ChatMessage, excludeUserId: string) {
    const room = this.rooms.get(sessionId);
    if (!room) return;

    const payload = JSON.stringify(message);

    for (const client of room) {
      if (client.userId !== excludeUserId && client.ws.readyState === WsWebSocket.OPEN) {
        client.ws.send(payload);
      }
    }
  }

  getStats() {
    return {
      totalRooms: this.rooms.size,
      totalConnections: Array.from(this.rooms.values()).reduce((sum, room) => sum + room.length, 0),
      rooms: Array.from(this.rooms.entries()).map(([id, clients]) => ({
        sessionId: id,
        clients: clients.length,
      })),
    };
  }
}
