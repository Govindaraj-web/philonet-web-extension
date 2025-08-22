import { useEffect, useRef, useState } from 'react';

interface WebSocketMessage {
  type: 'message' | 'typing' | 'reaction' | 'user_joined' | 'user_left';
  data: any;
  conversationId: string;
  userId: string;
  timestamp: string;
}

interface UseWebSocketOptions {
  url: string;
  conversationId: string;
  userId: string;
  onMessage?: (message: WebSocketMessage) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

export const useWebSocket = ({
  url,
  conversationId,
  userId,
  onMessage,
  onConnect,
  onDisconnect,
  onError
}: UseWebSocketOptions) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = () => {
    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionError(null);
        reconnectAttemptsRef.current = 0;
        
        // Join the conversation
        ws.send(JSON.stringify({
          type: 'join_conversation',
          conversationId,
          userId
        }));
        
        onConnect?.();
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessage?.(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        onDisconnect?.();
        
        // Attempt to reconnect
        if (reconnectAttemptsRef.current < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttemptsRef.current++;
            connect();
          }, delay);
        } else {
          setConnectionError('Failed to reconnect after multiple attempts');
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionError('Connection error');
        onError?.(error);
      };

    } catch (error) {
      console.error('Error creating WebSocket:', error);
      setConnectionError('Failed to create connection');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    setIsConnected(false);
  };

  const sendMessage = (message: Partial<WebSocketMessage>) => {
    if (wsRef.current && isConnected) {
      const fullMessage: WebSocketMessage = {
        conversationId,
        userId,
        timestamp: new Date().toISOString(),
        ...message
      } as WebSocketMessage;
      
      wsRef.current.send(JSON.stringify(fullMessage));
      return true;
    }
    return false;
  };

  useEffect(() => {
    connect();
    
    return () => {
      disconnect();
    };
  }, [url, conversationId, userId]);

  return {
    isConnected,
    connectionError,
    sendMessage,
    disconnect,
    reconnect: connect
  };
};
