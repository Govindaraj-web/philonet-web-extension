import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { UserRound, Tag, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { LoaderRing } from './ui';
import { Comment } from '../types';

interface CommentsDockProps {
  isOpen: boolean;
  isMinimized: boolean;
  activeIndex: number;
  dockList: Comment[];
  isLoading?: boolean;
  onNavigate: (index: number) => void;
  onMinimize: () => void;
  onExpand: () => void;
  onNavigateToText?: (text: string) => void;
}

const CommentsDock: React.FC<CommentsDockProps> = ({
  isOpen,
  isMinimized,
  activeIndex,
  dockList,
  isLoading = false,
  onNavigate,
  onMinimize,
  onExpand,
  onNavigateToText
}) => {
  if (!isOpen) return null;

  const wrap = (i: number, n: number) => (i % n + n) % n;

  const currentComment = dockList[activeIndex];

  // Show loading state when loading and no comments
  if (isLoading && dockList.length === 0) {
    return (
      <div className="pointer-events-auto">
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 250, damping: 20 }}
          className="relative w-[320px] rounded-philonet-lg border border-philonet-border bg-philonet-card/95 backdrop-blur p-4 shadow-xl"
          data-thoughts-dock
        >
          {/* Loading content skeleton */}
          <div className="space-y-4">
            {/* Header skeleton */}
            <div className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-full border border-philonet-border-light bg-philonet-card animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <div className="h-3 bg-philonet-border-light rounded animate-pulse w-20 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
                </div>
                <div className="h-2 bg-philonet-border-light rounded animate-pulse w-16 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
                </div>
              </div>
            </div>
            
            {/* Content skeleton */}
            <div className="space-y-2">
              <div className="h-3 bg-philonet-border-light rounded animate-pulse w-full relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
              </div>
              <div className="h-3 bg-philonet-border-light rounded animate-pulse w-4/5 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
              </div>
              <div className="h-3 bg-philonet-border-light rounded animate-pulse w-3/4 relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
              </div>
            </div>
            
            {/* Tag skeleton */}
            <div className="pt-2 border-t border-philonet-border/60">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-philonet-blue-500/5 border border-philonet-blue-500/20">
                <div className="h-3.5 w-3.5 bg-philonet-blue-500/30 rounded animate-pulse relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                </div>
                <div className="h-3 bg-philonet-blue-500/30 rounded animate-pulse w-32 relative overflow-hidden">
                  <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"></div>
                </div>
              </div>
            </div>
            
            {/* Loading indicator with text */}
            <div className="mt-4 flex items-center justify-center gap-3 text-philonet-text-muted">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <LoaderRing value={50} total={100} size={20} stroke={2} />
              </motion.div>
              <motion.span 
                className="text-sm"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                Loading comments...
              </motion.span>
            </div>
          </div>
          
          {/* Navigation controls skeleton */}
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <div className="h-7 w-7 rounded-full border border-philonet-border-light bg-philonet-panel animate-pulse relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
            </div>
            <div className="h-7 w-7 rounded-full border border-philonet-border-light bg-philonet-panel animate-pulse relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
            </div>
            <div className="ml-2">
              <div className="h-[34px] w-[34px] rounded-full border border-philonet-border-light bg-philonet-panel animate-pulse relative overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
              </div>
            </div>
            <div className="ml-2 h-7 w-7 rounded-full border border-philonet-border-light bg-philonet-panel animate-pulse relative overflow-hidden">
              <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/8 to-transparent"></div>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  // Show nothing if no comments and not loading
  if (dockList.length === 0) return null;

  return (
    <div className="pointer-events-auto">
      {!isMinimized ? (
        <motion.div
          key={currentComment?.id || 'empty'}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 250, damping: 20 }}
          className="relative w-[320px] rounded-philonet-lg border border-philonet-border bg-philonet-card/95 backdrop-blur p-4 shadow-xl"
          data-thoughts-dock
        >
          {/* Loading overlay when refreshing thoughts */}
          {isLoading && dockList.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-philonet-card/80 backdrop-blur-sm rounded-philonet-lg flex items-center justify-center z-10"
            >
              <div className="flex items-center gap-2 text-philonet-text-muted">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <LoaderRing value={75} total={100} size={16} stroke={2} />
                </motion.div>
                <span className="text-xs">Refreshing...</span>
              </div>
            </motion.div>
          )}

          {/* Current comment */}
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-full border border-philonet-border-light bg-philonet-card grid place-items-center text-philonet-text-muted overflow-hidden flex-shrink-0">
              {currentComment?.profilePic ? (
                <img 
                  src={currentComment.profilePic} 
                  alt={currentComment.author}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to icon if image fails to load
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.nextElementSibling?.classList.remove('hidden');
                  }}
                />
              ) : (
                <UserRound className="h-4 w-4" />
              )}
              {currentComment?.profilePic && (
                <UserRound className="h-4 w-4 hidden" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <div className="text-sm text-philonet-text-secondary truncate">
                  {currentComment?.author || 'Unknown'}
                </div>
                {isLoading && (
                  <LoaderRing value={50} total={100} size={16} stroke={2} />
                )}
              </div>
              <div className="text-[11px] text-philonet-text-subtle">
                {currentComment?.ts || ''}
              </div>
            </div>
          </div>

          <div className="mt-3 text-[13px] leading-6 text-philonet-text-secondary pr-2">
            {currentComment?.text || ''}
          </div>

          {/* Tagged excerpt */}
          {currentComment?.tag?.text && (
            <div className="mt-3 pt-2 border-t border-philonet-border/60">
              <div 
                className="text-[12px] text-philonet-blue-400 cursor-pointer hover:text-philonet-blue-500 transition-colors flex items-center gap-2 p-2 rounded-lg bg-philonet-blue-500/5 border border-philonet-blue-500/20 hover:bg-philonet-blue-500/10 hover:border-philonet-blue-500/30"
                onClick={() => onNavigateToText && onNavigateToText(currentComment.tag!.text)}
                title="Click to navigate to highlighted text in article"
              >
                <Tag className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate font-medium">
                  "{currentComment.tag.text}"
                </span>
                <span className="text-xs opacity-70 ml-auto flex-shrink-0">📍</span>
              </div>
            </div>
          )}

          {/* Navigation controls */}
          <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
            <button 
              onClick={() => onNavigate(wrap(activeIndex - 1, dockList.length))} 
              className="h-7 w-7 grid place-items-center rounded-full border border-philonet-border-light bg-philonet-panel text-philonet-text-muted hover:text-philonet-blue-500 hover:border-philonet-blue-500 shadow-xl backdrop-blur-sm" 
              aria-label="Previous"
              disabled={dockList.length <= 1}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={() => onNavigate(wrap(activeIndex + 1, dockList.length))} 
              className="h-7 w-7 grid place-items-center rounded-full border border-philonet-border-light bg-philonet-panel text-philonet-text-muted hover:text-philonet-blue-500 hover:border-philonet-blue-500 shadow-xl backdrop-blur-sm" 
              aria-label="Next"
              disabled={dockList.length <= 1}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
            <div className="ml-2">
              <LoaderRing value={activeIndex + 1} total={dockList.length} size={34} stroke={2} />
            </div>
            <button 
              onClick={onMinimize} 
              className="ml-2 h-7 w-7 grid place-items-center rounded-full border border-philonet-border-light bg-philonet-panel text-philonet-text-muted hover:text-philonet-blue-500 hover:border-philonet-blue-500 shadow-xl backdrop-blur-sm" 
              title="Minimize"
              aria-label="Minimize dock"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
          </div>
        </motion.div>
      ) : (
        <AnimatePresence>
          <motion.button
            key="mini"
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            onClick={onExpand}
            className="rounded-full border border-philonet-border bg-philonet-card/90 backdrop-blur px-3 py-2 flex items-center gap-2 shadow-xl min-w-0 max-w-[280px] relative"
            title="Expand"
          >
            {/* Loading overlay for minimized state */}
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-philonet-card/80 backdrop-blur-sm rounded-full flex items-center justify-center"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                >
                  <LoaderRing value={50} total={100} size={16} stroke={2} />
                </motion.div>
              </motion.div>
            )}
            
            <div className="flex-shrink-0">
              <LoaderRing value={activeIndex + 1} total={dockList.length} size={24} stroke={2} />
            </div>
            <div className="h-5 w-[1px] bg-philonet-border flex-shrink-0" />
            
            {/* Small profile picture in minimized state */}
            {currentComment?.profilePic && (
              <>
                <div className="h-4 w-4 rounded-full border border-philonet-border-light bg-philonet-card overflow-hidden flex-shrink-0">
                  <img 
                    src={currentComment.profilePic} 
                    alt={currentComment.author}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                <div className="h-5 w-[1px] bg-philonet-border flex-shrink-0" />
              </>
            )}
            
            <div className="text-xs text-philonet-text-secondary truncate min-w-0">
              {currentComment?.tag?.text ? (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Tag className="h-3 w-3 text-philonet-blue-400 flex-shrink-0" />
                  <span className="text-philonet-blue-400 truncate">{currentComment.tag.text}</span>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span className="text-philonet-text-muted">Thought</span>
                  <span className="text-philonet-blue-400 font-medium">{activeIndex + 1}</span>
                  <span className="text-philonet-text-muted">of</span>
                  <span className="text-philonet-blue-400 font-medium">{dockList.length}</span>
                </div>
              )}
            </div>
          </motion.button>
        </AnimatePresence>
      )}
    </div>
  );
};

export default CommentsDock;
