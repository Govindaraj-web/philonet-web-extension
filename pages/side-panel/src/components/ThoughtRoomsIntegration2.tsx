import React, { useState } from 'react';
import ConversationDrawer from './ConversationDrawer2';

interface ThoughtRoomsIntegrationProps {
  isOpen: boolean;
  onClose: () => void;
  article?: {
    title: string;
    content: string;
    url: string;
    article_id?: number; // Add article_id for API calls
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
  // Parallel conversation loading state
  conversationCount?: number;
  isLoadingConversations?: boolean;
  conversationsPreloaded?: boolean;
  // Refresh functionality
  refreshTrigger?: number; // Add refresh trigger to force data refresh
  onRefreshConversations?: () => void;
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
  currentArticleId,
  conversationCount = 0,
  isLoadingConversations = false,
  conversationsPreloaded = false,
  refreshTrigger = 0,
  onRefreshConversations
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
      conversationCount={conversationCount}
      isLoadingConversations={isLoadingConversations}
      conversationsPreloaded={conversationsPreloaded}
      refreshTrigger={refreshTrigger}
      onRefreshConversations={onRefreshConversations}
    />
  );
};

export default ThoughtRoomsIntegration;
