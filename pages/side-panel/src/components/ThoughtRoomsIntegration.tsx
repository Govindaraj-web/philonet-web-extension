import React, { useState } from 'react';
import ConversationDrawer from './ConversationDrawer';
import ThoughtRoomTrigger from './ThoughtRoomTrigger';

interface ThoughtRoomsIntegrationProps {
  article?: any;
  user?: any;
  // Trigger configuration
  triggerPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'floating';
  triggerCompact?: boolean;
  showTrigger?: boolean;
  // Drawer configuration
  drawerPosition?: 'right' | 'left' | 'center';
  drawerSize?: 'small' | 'medium' | 'large' | 'full';
  // Data and callbacks
  hasNewMessages?: boolean;
  unreadCount?: number;
  selectedThoughtId?: string;
  onThoughtSelect?: (thoughtId: string) => void;
  onSendMessage?: (message: string, thoughtId: string) => void;
  onAskAI?: (question: string, thoughtId: string) => void;
  // Events
  onConversationOpen?: () => void;
  onConversationClose?: () => void;
}

const ThoughtRoomsIntegration: React.FC<ThoughtRoomsIntegrationProps> = ({
  article,
  user,
  triggerPosition = 'top-right',
  triggerCompact = false,
  showTrigger = true,
  drawerPosition = 'right',
  drawerSize = 'large',
  hasNewMessages = false,
  unreadCount = 0,
  selectedThoughtId,
  onThoughtSelect,
  onSendMessage,
  onAskAI,
  onConversationOpen,
  onConversationClose
}) => {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleOpenConversation = () => {
    setIsDrawerOpen(true);
    if (onConversationOpen) {
      onConversationOpen();
    }
  };

  const handleCloseConversation = () => {
    setIsDrawerOpen(false);
    if (onConversationClose) {
      onConversationClose();
    }
  };

  const handleSendMessage = (message: string, thoughtId: string) => {
    console.log('Message sent:', { message, thoughtId });
    if (onSendMessage) {
      onSendMessage(message, thoughtId);
    }
  };

  const handleAskAI = (question: string, thoughtId: string) => {
    console.log('AI question asked:', { question, thoughtId });
    if (onAskAI) {
      onAskAI(question, thoughtId);
    }
  };

  const handleThoughtSelect = (thoughtId: string) => {
    console.log('Thought selected:', thoughtId);
    if (onThoughtSelect) {
      onThoughtSelect(thoughtId);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {showTrigger && (
        <ThoughtRoomTrigger
          article={article}
          hasNewMessages={hasNewMessages}
          unreadCount={unreadCount}
          onOpenConversation={handleOpenConversation}
          position={triggerPosition}
          compact={triggerCompact}
        />
      )}

      {/* Conversation Drawer */}
      <ConversationDrawer
        isOpen={isDrawerOpen}
        onClose={handleCloseConversation}
        article={article}
        user={user}
        selectedThoughtId={selectedThoughtId}
        onThoughtSelect={handleThoughtSelect}
        onSendMessage={handleSendMessage}
        onAskAI={handleAskAI}
        position={drawerPosition}
        size={drawerSize}
      />
    </>
  );
};

export default ThoughtRoomsIntegration;
