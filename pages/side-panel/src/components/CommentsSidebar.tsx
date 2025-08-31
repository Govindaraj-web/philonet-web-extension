import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MessageSquare, 
  Clock, 
  Pin,
  Users,
  MoreVertical,
  CheckCircle2,
  Circle
} from 'lucide-react';
import { Comment } from '../types';
import { cn } from '@extension/ui';

interface CommentsSidebarProps {
  comments: Comment[];
  selectedCommentId?: number | null;
  onSelectComment: (comment: Comment) => void;
  onCreateNewConversation?: () => void;
  onNavigateToTaggedText?: (text: string) => void;
  className?: string;
}

interface CommentPreviewProps {
  comment: Comment;
  isSelected: boolean;
  onClick: () => void;
  onNavigateToTaggedText?: (text: string) => void;
  hasUnreadMessages?: boolean;
  lastMessageTime?: string;
  participantCount?: number;
}

const CommentPreview: React.FC<CommentPreviewProps> = ({
  comment,
  isSelected,
  onClick,
  onNavigateToTaggedText,
  hasUnreadMessages = false,
  lastMessageTime,
  participantCount = 1
}) => {
  const truncateText = (text: string, maxLength: number = 50) => {
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <motion.div
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "p-3 cursor-pointer transition-all duration-200 border-b border-philonet-border/30",
        isSelected 
          ? "bg-philonet-blue-500/20 border-l-4 border-l-philonet-blue-400" 
          : "hover:bg-philonet-card/50"
      )}
    >
      <div className="flex items-start space-x-3">
        {/* Profile Picture */}
        <div className="flex-shrink-0 relative">
          {comment.profilePic ? (
            <img
              src={comment.profilePic}
              alt={comment.author}
              className="w-12 h-12 rounded-full object-cover border border-philonet-border"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-philonet-blue-500 to-philonet-blue-400 flex items-center justify-center text-white font-light text-sm">
              {comment.author.charAt(0).toUpperCase()}
            </div>
          )}
          
          {/* Online status indicator */}
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-philonet-panel"></div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <span className="font-light tracking-philonet-wide text-philonet-text-secondary text-sm">
                {comment.author}
              </span>
              {comment.author === "You" && (
                <span className="text-philonet-text-muted text-xs">(You)</span>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {lastMessageTime && (
                <span className="text-philonet-text-muted text-xs">
                  {lastMessageTime}
                </span>
              )}
              {hasUnreadMessages && (
                <div className="w-2 h-2 bg-philonet-blue-400 rounded-full"></div>
              )}
            </div>
          </div>

          {/* Last message preview */}
          <p className="text-philonet-text-tertiary text-sm leading-relaxed mb-2">
            {truncateText(comment.text)}
          </p>

          {/* Tag if present */}
          {comment.tag?.text && (
            <div 
              className="inline-flex items-center px-2 py-0.5 rounded-full bg-philonet-blue-500/10 border border-philonet-blue-500/20 mb-2 cursor-pointer hover:bg-philonet-blue-500/20 hover:border-philonet-blue-500/30 transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                onNavigateToTaggedText?.(comment.tag!.text);
              }}
              title="Click to highlight this text in the article"
            >
              <span className="text-xs text-philonet-blue-400 font-light tracking-philonet-wide">
                {truncateText(comment.tag.text, 30)}
              </span>
            </div>
          )}

          {/* Footer info */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 text-xs text-philonet-text-muted">
              {participantCount > 1 && (
                <div className="flex items-center space-x-1">
                  <Users className="w-3 h-3" />
                  <span>{participantCount}</span>
                </div>
              )}
              {comment.replyCount && comment.replyCount > 0 && (
                <div className="flex items-center space-x-1">
                  <MessageSquare className="w-3 h-3" />
                  <span>{comment.replyCount} replies</span>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-1">
              {hasUnreadMessages ? (
                <Circle className="w-3 h-3 text-philonet-blue-400" />
              ) : (
                <CheckCircle2 className="w-3 h-3 text-philonet-text-muted" />
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const CommentsSidebar: React.FC<CommentsSidebarProps> = ({ 
  comments, 
  selectedCommentId, 
  onSelectComment, 
  onCreateNewConversation,
  onNavigateToTaggedText,
  className = '' 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'unread' | 'recent'>('all');

  const filteredComments = comments.filter(comment => {
    const matchesSearch = comment.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         comment.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (comment.tag?.text && comment.tag.text.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    
    switch (filter) {
      case 'unread':
        // For demo purposes, assume first 2 comments have unread messages
        return comments.indexOf(comment) < 2;
      case 'recent':
        // Show comments from today/yesterday
        return comment.ts.includes('hour') || comment.ts.includes('minute');
      default:
        return true;
    }
  });

  return (
    <div className={cn("h-full bg-philonet-card border-r border-philonet-border flex flex-col", className)}>
      {/* Header */}
      <div className="p-4 border-b border-philonet-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-light tracking-philonet-wide text-philonet-text-secondary">
            Conversations
          </h2>
          <button 
            onClick={onCreateNewConversation}
            className="w-8 h-8 rounded-full bg-philonet-blue-500 hover:bg-philonet-blue-600 flex items-center justify-center transition-colors"
          >
            <MessageSquare className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-philonet-text-muted" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-philonet-panel border border-philonet-border rounded-philonet pl-10 pr-4 py-2 text-sm text-philonet-text-secondary placeholder-philonet-text-muted focus:outline-none focus:border-philonet-blue-500/50 transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex space-x-1">
          {[
            { key: 'all', label: 'All', count: comments.length },
            { key: 'unread', label: 'Unread', count: 2 },
            { key: 'recent', label: 'Recent', count: comments.filter(c => c.ts.includes('hour') || c.ts.includes('minute')).length }
          ].map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFilter(key as any)}
              className={cn(
                "flex-1 px-3 py-1.5 rounded-philonet text-xs font-light tracking-philonet-wide transition-colors",
                filter === key
                  ? "bg-philonet-blue-500/20 text-philonet-blue-400 border border-philonet-blue-500/30"
                  : "bg-philonet-panel/50 text-philonet-text-muted hover:text-philonet-text-secondary hover:bg-philonet-panel"
              )}
            >
              {label} {count > 0 && `(${count})`}
            </button>
          ))}
        </div>
      </div>

      {/* Comments List */}
      <div className="flex-1 overflow-y-auto philonet-scrollbar">
        <AnimatePresence mode="popLayout">
          {filteredComments.length > 0 ? (
            filteredComments.map((comment, index) => (
              <CommentPreview
                key={comment.id}
                comment={comment}
                isSelected={selectedCommentId === comment.id}
                onClick={() => onSelectComment(comment)}
                onNavigateToTaggedText={onNavigateToTaggedText}
                hasUnreadMessages={index < 2} // For demo purposes
                lastMessageTime={comment.ts}
                participantCount={Math.floor(Math.random() * 4) + 2}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-8 text-center"
            >
              <MessageSquare className="w-12 h-12 text-philonet-text-muted mx-auto mb-4" />
              <p className="text-philonet-text-muted font-light">
                {searchQuery ? 'No conversations match your search' : 'No conversations yet'}
              </p>
              {!searchQuery && (
                <button
                  onClick={onCreateNewConversation}
                  className="mt-4 px-4 py-2 bg-philonet-blue-500 hover:bg-philonet-blue-600 text-white rounded-philonet text-sm font-light tracking-philonet-wide transition-colors"
                >
                  Start a conversation
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Stats */}
      <div className="p-3 border-t border-philonet-border">
        <div className="flex items-center justify-between text-xs text-philonet-text-muted">
          <span>{filteredComments.length} conversations</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span>Online</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommentsSidebar;
