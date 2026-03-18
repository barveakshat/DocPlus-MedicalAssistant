import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketMessage {
  type: 'message' | 'typing' | 'read' | 'connected';
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

interface UseWebSocketReturn {
  sendWsMessage: (payload: {
    content?: string;
    messageId?: string;
    messageType?: 'text' | 'image' | 'file';
    attachmentName?: string | null;
    attachmentMimeType?: string | null;
    attachmentSize?: number | null;
    attachmentPath?: string | null;
  }) => void;
  sendTypingIndicator: () => void;
  isConnected: boolean;
  onMessage: (callback: (message: WebSocketMessage) => void) => void;
}

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3001/ws';
const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 30000;

/**
 * Client-side WebSocket hook for doctor-patient real-time messaging.
 * Handles connection, automatic reconnection with exponential backoff,
 * and message broadcasting.
 */
export const useWebSocket = (sessionId: string | null, userId: string | null): UseWebSocketReturn => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const messageCallbackRef = useRef<((message: WebSocketMessage) => void) | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (!sessionId || !userId) return;

    // Don't create a new connection if one already exists
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return;
    }

    const url = `${WS_URL}?sessionId=${encodeURIComponent(sessionId)}&userId=${encodeURIComponent(userId)}`;

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        setIsConnected(true);
        reconnectAttemptRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          if (messageCallbackRef.current) {
            messageCallbackRef.current(message);
          }
        } catch (err) {
          console.error('Invalid WebSocket message:', err);
        }
      };

      ws.onclose = (event) => {
        setIsConnected(false);
        wsRef.current = null;

        // Don't reconnect if the close was intentional (code 4002 = replaced by new connection)
        if (event.code === 4001 || event.code === 4002) return;

        // Exponential backoff reconnection
        const delay = Math.min(
          RECONNECT_DELAY_MS * Math.pow(2, reconnectAttemptRef.current),
          MAX_RECONNECT_DELAY_MS
        );
        reconnectAttemptRef.current++;

        reconnectTimerRef.current = setTimeout(connect, delay);
      };

      ws.onerror = () => {
        // The onclose handler will fire after onerror, which handles reconnection
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('WebSocket connection error:', err);
    }
  }, [sessionId, userId]);

  // Connect/disconnect on sessionId/userId change
  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      setIsConnected(false);
    };
  }, [connect]);

  const sendWsMessage = useCallback((payload: {
    content?: string;
    messageId?: string;
    messageType?: 'text' | 'image' | 'file';
    attachmentName?: string | null;
    attachmentMimeType?: string | null;
    attachmentSize?: number | null;
    attachmentPath?: string | null;
  }) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'message',
        content: payload.content,
        messageId: payload.messageId,
        messageType: payload.messageType,
        attachmentName: payload.attachmentName,
        attachmentMimeType: payload.attachmentMimeType,
        attachmentSize: payload.attachmentSize,
        attachmentPath: payload.attachmentPath,
      }));
    }
  }, []);

  const sendTypingIndicator = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'typing',
      }));
    }
  }, []);

  const onMessage = useCallback((callback: (message: WebSocketMessage) => void) => {
    messageCallbackRef.current = callback;
  }, []);

  return {
    sendWsMessage,
    sendTypingIndicator,
    isConnected,
    onMessage,
  };
};
