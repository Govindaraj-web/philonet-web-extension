import React, { useState } from 'react';
import { Heart, ThumbsUp, ThumbsDown, Laugh, Angry, Frown } from 'lucide-react';
import { cn } from '@extension/ui';

export type ReactionType = 'like' | 'love' | 'laugh' | 'dislike' | 'angry' | 'sad';

export interface CommentReaction {
  type: ReactionType;
  count: number;
  users: Array<{
    id: string;
    name: string;
    avatar?: string;
  }>;
  userReacted: boolean;
}

interface ReactionButtonProps {
  commentId: number;
  reactions: CommentReaction[];
  onReact: (commentId: number, reactionType: ReactionType) => void;
  onRemoveReaction: (commentId: number, reactionType: ReactionType) => void;
  size?: 'sm' | 'md' | 'lg';
  compact?: boolean;
}

const reactionIcons: Record<ReactionType, React.ComponentType<{ className?: string }>> = {
  like: ThumbsUp,
  love: Heart,
  laugh: Laugh,
  dislike: ThumbsDown,
  angry: Angry,
  sad: Frown,
};

const reactionEmojis: Record<ReactionType, string> = {
  like: '👍',
  love: '❤️',
  laugh: '😂',
  dislike: '👎',
  angry: '😠',
  sad: '😢',
};

const reactionLabels: Record<ReactionType, string> = {
  like: 'Like',
  love: 'Love',
  laugh: 'Laugh',
  dislike: 'Dislike',
  angry: 'Angry',
  sad: 'Sad',
};

const ReactionButton: React.FC<ReactionButtonProps> = ({
  commentId,
  reactions,
  onReact,
  onRemoveReaction,
  size = 'md',
  compact = false
}) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);

  const handleReactionClick = (reactionType: ReactionType) => {
    const existingReaction = reactions.find(r => r.type === reactionType);
    
    if (existingReaction?.userReacted) {
      onRemoveReaction(commentId, reactionType);
    } else {
      onReact(commentId, reactionType);
    }
    
    setShowReactionPicker(false);
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return {
          button: 'h-6 px-2 text-xs',
          icon: 'h-3 w-3',
          emoji: 'text-xs',
          picker: 'gap-1 p-2',
          pickerButton: 'h-6 w-6 text-xs'
        };
      case 'lg':
        return {
          button: 'h-10 px-4 text-base',
          icon: 'h-5 w-5',
          emoji: 'text-lg',
          picker: 'gap-2 p-3',
          pickerButton: 'h-10 w-10 text-lg'
        };
      default:
        return {
          button: 'h-8 px-3 text-sm',
          icon: 'h-4 w-4',
          emoji: 'text-sm',
          picker: 'gap-1.5 p-2.5',
          pickerButton: 'h-8 w-8 text-sm'
        };
    }
  };

  const sizeClasses = getSizeClasses();

  // Get the most prominent reaction (highest count that user has reacted to, or just highest count)
  const prominentReaction = reactions
    .filter(r => r.count > 0)
    .sort((a, b) => {
      if (a.userReacted && !b.userReacted) return -1;
      if (!a.userReacted && b.userReacted) return 1;
      return b.count - a.count;
    })[0];

  const totalReactions = reactions.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="relative">
      {/* Main reaction button */}
      <button
        onClick={() => setShowReactionPicker(!showReactionPicker)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg transition-all duration-200 border",
          sizeClasses.button,
          prominentReaction?.userReacted
            ? "bg-philonet-blue-500/20 border-philonet-blue-500/40 text-philonet-blue-400"
            : "bg-philonet-card/50 border-philonet-border/30 text-philonet-text-muted hover:bg-philonet-card hover:border-philonet-border/50 hover:text-philonet-text-secondary"
        )}
        title={`${totalReactions} reactions`}
      >
        {prominentReaction ? (
          <>
            <span className={sizeClasses.emoji}>
              {reactionEmojis[prominentReaction.type]}
            </span>
            {!compact && totalReactions > 0 && (
              <span className="font-medium">
                {totalReactions}
              </span>
            )}
          </>
        ) : (
          <>
            <Heart className={cn(sizeClasses.icon)} />
            {!compact && <span>React</span>}
          </>
        )}
      </button>

      {/* Reaction picker */}
      {showReactionPicker && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10" 
            onClick={() => setShowReactionPicker(false)}
          />
          
          {/* Picker popup */}
          <div 
            className={cn(
              "absolute bottom-full left-0 mb-2 bg-philonet-card/95 backdrop-blur border border-philonet-border/50 rounded-lg shadow-xl flex z-20",
              sizeClasses.picker
            )}
          >
            {Object.entries(reactionEmojis).map(([type, emoji]) => {
              const reaction = reactions.find(r => r.type === type as ReactionType);
              const isActive = reaction?.userReacted || false;
              const count = reaction?.count || 0;
              
              return (
                <button
                  key={type}
                  onClick={() => handleReactionClick(type as ReactionType)}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-lg transition-all duration-200 relative",
                    sizeClasses.pickerButton,
                    isActive
                      ? "bg-philonet-blue-500/20 border border-philonet-blue-500/40 scale-110"
                      : "hover:bg-philonet-border/30 hover:scale-105"
                  )}
                  title={`${reactionLabels[type as ReactionType]}${count > 0 ? ` (${count})` : ''}`}
                >
                  <span className={sizeClasses.emoji}>{emoji}</span>
                  {count > 0 && (
                    <span className="text-[10px] text-philonet-text-muted font-medium absolute -top-1 -right-1 bg-philonet-card border border-philonet-border rounded-full min-w-[16px] h-4 flex items-center justify-center">
                      {count > 99 ? '99+' : count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Reaction summary (when compact and has reactions) */}
      {compact && totalReactions > 0 && (
        <div className="flex items-center gap-1 mt-1">
          {reactions
            .filter(r => r.count > 0)
            .slice(0, 3)
            .map(reaction => (
              <div
                key={reaction.type}
                className="flex items-center gap-1 text-xs text-philonet-text-muted"
              >
                <span className="text-xs">{reactionEmojis[reaction.type]}</span>
                <span>{reaction.count}</span>
              </div>
            ))}
          {reactions.filter(r => r.count > 0).length > 3 && (
            <span className="text-xs text-philonet-text-muted">+{reactions.filter(r => r.count > 0).length - 3}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default ReactionButton;
