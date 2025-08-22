// Example of how to integrate WebSocket into ConversationRoom component

import { useWebSocket } from '../hooks/useWebSocket';

// Inside your ConversationRoom component, replace the current message handling with:

const ConversationRoom: React.FC<ConversationRoomProps> = ({
  thoughtStarters = [],
  selectedThoughtId,
  currentUser = { id: 'user1', name: 'You', avatar: undefined },
  // Remove these props as they'll be handled by WebSocket:
  // messages: externalMessages = [],
  // isLoadingMessages = false,
  // messagesError = null,
  onThoughtSelect,
  // These can be simplified or removed:
  // onSendMessage,
  // onAskAI
}) => {
  // Replace external message state with local WebSocket-managed state
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [messagesError, setMessagesError] = useState<string | null>(null);

  // WebSocket connection
  const {
    isConnected,
    connectionError,
    sendMessage: sendWebSocketMessage,
  } = useWebSocket({
    url: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:8080/ws',
    conversationId: selectedThoughtId || '',
    userId: currentUser.id,
    onMessage: (wsMessage) => {
      switch (wsMessage.type) {
        case 'message':
          // Add new message from WebSocket
          setMessages(prev => [...prev, wsMessage.data]);
          break;
        case 'typing':
          // Handle typing indicators
          setTypingUsers(prev => ({
            ...prev,
            [wsMessage.userId]: wsMessage.data.isTyping
          }));
          break;
        case 'reaction':
          // Handle reactions
          setMessages(prev => prev.map(msg => 
            msg.id === wsMessage.data.messageId 
              ? { ...msg, reactions: wsMessage.data.reactions }
              : msg
          ));
          break;
        case 'user_joined':
        case 'user_left':
          // Handle user presence
          break;
      }
    },
    onConnect: () => {
      setIsLoadingMessages(false);
      setMessagesError(null);
    },
    onDisconnect: () => {
      setMessagesError('Disconnected from server');
    },
    onError: () => {
      setMessagesError('Connection error');
    }
  });

  // Simplified message sending - no need for complex state management
  const handleSendMessage = async (event?: React.MouseEvent | React.KeyboardEvent | React.FormEvent) => {
    if (!messageText.trim() || !selectedThought || !isConnected) return;

    event?.preventDefault?.();
    event?.stopPropagation?.();

    const messageTextToSend = messageText;
    const newMessage: Message = {
      id: `temp-${Date.now()}`, // Temporary ID until server confirms
      text: messageTextToSend,
      author: currentUser.name,
      timestamp: new Date().toISOString(),
      isOwn: true,
      type: 'text',
      status: 'sending'
    };

    // Optimistic update
    setMessages(prev => [...prev, newMessage]);
    setMessageText('');

    // Send via WebSocket
    const success = sendWebSocketMessage({
      type: 'message',
      data: {
        text: messageTextToSend,
        conversationId: selectedThought.id,
        tempId: newMessage.id
      }
    });

    if (!success) {
      // Failed to send, update message status
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id 
          ? { ...msg, status: 'sent', text: `${msg.text} ❌ Failed to send` }
          : msg
      ));
    }

    // Effects and sounds...
    setShowSendEffect(true);
    playSound('send');
    // ... rest of effects
  };

  // The rest of your component remains mostly the same...
};

// Benefits of this approach:
// 1. Real-time messaging
// 2. Simplified state management
// 3. Automatic message ordering by server
// 4. Live typing indicators
// 5. Instant reactions
// 6. User presence (online/offline status)
// 7. Message delivery confirmations
// 8. Automatic reconnection on network issues
