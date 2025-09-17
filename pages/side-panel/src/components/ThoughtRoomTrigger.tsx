import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Users, Sparkles, ChevronRight } from 'lucide-react';
import { cn } from '@extension/ui';
import { Button } from './ui';

interface ThoughtRoomTriggerProps {
  article?: any;
  hasNewMessages?: boolean;
  unreadCount?: number;
  onOpenConversation: () => void;
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'floating';
  compact?: boolean;
}

const ThoughtRoomTrigger: React.FC<ThoughtRoomTriggerProps> = ({
  article,
  hasNewMessages = false,
  unreadCount = 0,
  onOpenConversation,
  className = '',
  position = 'top-right',
  compact = false
}) => {
  const [isHovered, setIsHovered] = useState(false);

  // Position styles
  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'floating':
        return 'top-1/2 right-4 transform -translate-y-1/2';
      case 'top-right':
      default:
        return 'top-4 right-4';
    }
  };

  const getThoughtStartersCount = () => {
    if (!article) return 0;
    
    // Base discussion topics
    let count = 2; // Main discussion + Key insights
    
    // Add category-specific topics
    if (article.categories?.includes('Technology')) count++;
    if (article.categories?.includes('Environment')) count++;
    if (article.tags?.length > 0) count++;
    
    return count;
  };

  const thoughtStartersCount = getThoughtStartersCount();

  if (compact) {
    return (
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={onOpenConversation}
        className={cn(
          "relative p-3 bg-philonet-blue-500 hover:bg-philonet-blue-600 text-white rounded-full shadow-lg transition-all duration-200",
          hasNewMessages && "animate-pulse",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <MessageSquare className="w-5 h-5" />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}

        {/* Hover Tooltip */}
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.9 }}
              className="absolute right-full mr-3 top-1/2 transform -translate-y-1/2 bg-philonet-card border border-philonet-border rounded-lg px-3 py-2 shadow-xl whitespace-nowrap z-50"
            >
              <div className="text-sm text-white font-medium">Open Thought Rooms</div>
              {thoughtStartersCount > 0 && (
                <div className="text-xs text-philonet-text-muted">
                  {thoughtStartersCount} discussion topics available
                </div>
              )}
              
              {/* Tooltip Arrow */}
              <div className="absolute left-full top-1/2 transform -translate-y-1/2 border-4 border-transparent border-l-philonet-card" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "absolute z-40",
        getPositionStyles(),
        className
      )}
    >
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onOpenConversation}
        className={cn(
          "group relative bg-philonet-card/95 backdrop-blur-sm border border-philonet-border rounded-xl p-4 shadow-xl transition-all duration-300 hover:shadow-2xl hover:border-philonet-blue-500/50",
          hasNewMessages && "border-philonet-blue-500/70 bg-philonet-blue-500/10"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-philonet-blue-500/20 flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-philonet-blue-400" />
            </div>
            <span className="text-sm font-medium text-white">Thought Rooms</span>
          </div>
          
          <motion.div
            animate={{ x: isHovered ? 3 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronRight className="w-4 h-4 text-philonet-text-muted group-hover:text-philonet-blue-400" />
          </motion.div>
        </div>

        {/* Content */}
        <div className="space-y-2">
          {article ? (
            <>
              <div className="text-xs text-philonet-text-secondary">
                Start conversations about:
              </div>
              <div className="text-xs text-philonet-text-muted line-clamp-2">
                {article.title}
              </div>
              
              {/* Stats */}
              <div className="flex items-center gap-4 pt-2">
                <div className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-philonet-blue-400" />
                  <span className="text-xs text-philonet-text-muted">
                    {thoughtStartersCount} topics
                  </span>
                </div>
                {unreadCount > 0 && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-philonet-blue-400 rounded-full animate-pulse" />
                    <span className="text-xs text-philonet-blue-400 font-medium">
                      {unreadCount} unread
                    </span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-xs text-philonet-text-muted">
              Generate content to start conversations
            </div>
          )}
        </div>

        {/* New Messages Indicator */}
        {hasNewMessages && (
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute -top-1 -right-1 w-3 h-3 bg-philonet-blue-400 rounded-full shadow-lg"
          />
        )}

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </motion.div>
        )}

        {/* Hover Effect */}
        <motion.div
          className="absolute inset-0 bg-philonet-blue-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        />
      </motion.button>
    </motion.div>
  );
};

export default ThoughtRoomTrigger;
