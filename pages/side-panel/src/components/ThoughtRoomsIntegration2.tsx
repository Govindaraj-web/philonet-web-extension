import React, { useState } from 'react';
import ConversationDrawer from './ConversationDrawer2';

interface ThoughtRoomsIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  article?: {
    title: string;
    content: string;
    url: string;
  };
  taggedContent?: {
    sourceText: string;
    sourceUrl: string;
    highlightedText: string;
  };
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  onSendMessage: (message: string, thoughtId?: string) => void;
  onAskAI: (question: string, thoughtId?: string) => void;
  onThoughtSelect?: (thoughtId: string) => void;
  currentArticleId?: string; // Add the current article ID from storage
}

const ThoughtRoomsIntegration: React.FC<ThoughtRoomsIntegrationProps> = ({
  isOpen,
  onClose,
  article,
  taggedContent,
  user,
  onSendMessage,
  onAskAI,
  onThoughtSelect,
  currentArticleId
}) => {
  return (
    <ConversationDrawer
      isOpen={isOpen}
      onClose={onClose}
      article={article}
      taggedContent={taggedContent}
      user={user}
      onSendMessage={onSendMessage}
      onAskAI={onAskAI}
      onThoughtSelect={onThoughtSelect}
      currentArticleId={currentArticleId}
    />
  );
};

export default ThoughtRoomsIntegration;
