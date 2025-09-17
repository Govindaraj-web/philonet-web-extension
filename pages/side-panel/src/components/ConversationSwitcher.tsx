import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle,
  X,
  Users,
  Clock,
  ArrowLeft,
  Search,
  Filter,
  MoreHorizontal
} from 'lucide-react';
import { Comment, ConversationMessage } from '../types';
import { cn } from '@extension/ui';

interface ConversationSwitcherProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: ActiveConversation[];
  currentConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onCreateNewConversation?: () => void;
}

export interface ActiveConversation {
  id: string;
  title: string;
  topComment: Comment;
  participantCount: number;
  lastMessage?: ConversationMessage;
  unreadCount: number;
  isActive: boolean;
  createdAt: Date;
  lastActivity: Date;
}

const ConversationSwitcher: React.FC<ConversationSwitcherProps> = ({
  isOpen,
  onClose,
  conversations,
  currentConversationId,
  onSelectConversation,
  onCreateNewConversation
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unread' | 'active'>('all');

  const formatTime = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    return date.toLocaleDateString();
  };

  const filteredConversations = conversations
    .filter(conv => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        return conv.title.toLowerCase().includes(searchLower) ||
               conv.topComment.text.toLowerCase().includes(searchLower) ||
               conv.topComment.author.toLowerCase().includes(searchLower);
      }
      return true;
    })
    .filter(conv => {
      // Type filter
      switch (filterType) {
        case 'unread':
          return conv.unreadCount > 0;
        case 'active':
          return conv.isActive;
        default:
          return true;
      }
    })
    .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime());

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="absolute left-0 top-0 h-full w-full max-w-sm bg-philonet-panel shadow-2xl flex flex-col border-r border-philonet-border"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-philonet-border">
            <div className="flex items-center space-x-3">
              <button
                onClick={onClose}
                className="p-2 hover:bg-philonet-border/30 rounded-philonet transition-colors text-philonet-text-muted hover:text-philonet-text-secondary"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-lg font-light tracking-philonet-wide text-philonet-text-secondary">
                  Conversations
                </h2>
                <p className="text-sm text-philonet-text-muted font-light tracking-philonet-wide">
                  {conversations.length} active thread{conversations.length !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            
            <button
              onClick={onCreateNewConversation}
              className="p-2 hover:bg-philonet-border/30 rounded-philonet transition-colors text-philonet-text-muted hover:text-philonet-text-secondary"
              title="Start new conversation"
            >
              <MessageCircle className="h-5 w-5" />
            </button>
          </div>

          {/* Search and Filters */}
          <div className="p-4 space-y-3 border-b border-philonet-border">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-philonet-text-muted" />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-philonet-card border border-philonet-border rounded-philonet text-sm focus:ring-2 focus:ring-philonet-blue-500 focus:border-philonet-blue-500 text-philonet-text-secondary placeholder-philonet-text-muted font-light tracking-philonet-normal"
              />
            </div>

            {/* Filters */}
            <div className="flex space-x-2">
              {[
                { key: 'all' as const, label: 'All', count: conversations.length },
                { key: 'unread' as const, label: 'Unread', count: conversations.filter(c => c.unreadCount > 0).length },
                { key: 'active' as const, label: 'Active', count: conversations.filter(c => c.isActive).length }
              ].map(filter => (
                <button
                  key={filter.key}
                  onClick={() => setFilterType(filter.key)}
                  className={cn(
                    "px-3 py-1.5 rounded-philonet text-xs font-light tracking-philonet-wide transition-colors",
                    filterType === filter.key
                      ? "bg-philonet-blue-500 text-white"
                      : "bg-philonet-card text-philonet-text-muted hover:bg-philonet-border/30 hover:text-philonet-text-secondary"
                  )}
                >
                  {filter.label}
                  {filter.count > 0 && (
                    <span className={cn(
                      "ml-1 px-1.5 py-0.5 rounded-full text-xs",
                      filterType === filter.key
                        ? "bg-philonet-blue-400 text-blue-100"
                        : "bg-philonet-border text-philonet-text-subtle"
                    )}>
                      {filter.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-philonet-text-muted">
                <div className="text-center">
                  <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-light tracking-philonet-wide">
                    {searchQuery || filterType !== 'all' 
                      ? 'No conversations found' 
                      : 'No active conversations'
                    }
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {filteredConversations.map((conversation) => (
                  <motion.div
                    key={conversation.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ x: 4 }}
                    className={cn(
                      "p-3 rounded-lg cursor-pointer transition-all duration-200",
                      currentConversationId === conversation.id
                        ? "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent"
                    )}
                    onClick={() => {
                      onSelectConversation(conversation.id);
                      onClose();
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      {/* Avatar */}
                      <div className="flex-shrink-0">
                        {conversation.topComment.profilePic ? (
                          <img
                            src={conversation.topComment.profilePic}
                            alt={conversation.topComment.author}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm">
                            {conversation.topComment.author.charAt(0).toUpperCase()}
                          </div>
                        )}
                        
                        {/* Online indicator */}
                        {conversation.isActive && (
                          <div className="absolute -mt-2 -ml-1">
                            <div className="h-3 w-3 bg-green-400 border-2 border-white dark:border-gray-900 rounded-full"></div>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-light tracking-philonet-wide text-philonet-text-secondary truncate">
                            {conversation.title}
                          </h3>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            {conversation.unreadCount > 0 && (
                              <div className="bg-philonet-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-light">
                                {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                              </div>
                            )}
                            <span className="text-xs text-philonet-text-muted font-light">
                              {formatTime(conversation.lastActivity)}
                            </span>
                          </div>
                        </div>

                        <p className="text-sm text-philonet-text-muted truncate mt-1 font-light tracking-philonet-normal">
                          {conversation.lastMessage?.message || conversation.topComment.text}
                        </p>

                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-4 text-xs text-philonet-text-subtle">
                            <div className="flex items-center space-x-1">
                              <Users className="h-3 w-3" />
                              <span className="font-light">{conversation.participantCount}</span>
                            </div>
                            <div className="flex items-center space-x-1">
                              <Clock className="h-3 w-3" />
                              <span className="font-light">Started {formatTime(conversation.createdAt)}</span>
                            </div>
                          </div>

                          <button
                            className="p-1 hover:bg-philonet-border/30 rounded-philonet transition-colors text-philonet-text-muted hover:text-philonet-text-secondary"
                            onClick={(e) => {
                              e.stopPropagation();
                              // TODO: Add conversation options menu
                            }}
                          >
                            <MoreHorizontal className="h-3 w-3" />
                          </button>
                        </div>

                        {/* Tag indicator */}
                        {conversation.topComment.tag?.text && (
                          <div className="mt-2 inline-flex items-center px-2 py-1 rounded-philonet bg-philonet-blue-500/10 text-philonet-blue-400 text-xs border border-philonet-blue-500/30">
                            <span className="truncate max-w-[150px] font-light tracking-philonet-wide">
                              #{conversation.topComment.tag.text}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats Footer */}
          <div className="p-4 border-t border-philonet-border bg-philonet-card">
            <div className="flex items-center justify-between text-xs text-philonet-text-muted">
              <div className="flex items-center space-x-4">
                <span className="font-light tracking-philonet-wide">{conversations.filter(c => c.isActive).length} active</span>
                <span className="font-light tracking-philonet-wide">{conversations.filter(c => c.unreadCount > 0).length} unread</span>
              </div>
              <button className="text-philonet-blue-400 hover:text-philonet-blue-300 font-light tracking-philonet-wide">
                Manage
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ConversationSwitcher;
