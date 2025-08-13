import React from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { UserRound, Share2, Bookmark, MoreHorizontal } from 'lucide-react';
import { Button } from './ui';
import HistoryMenu from './HistoryMenu';
import { HistoryItem } from '../types';

interface TopActionBarProps {
  userName?: string;
  userAvatar?: string;
  showMoreMenu: boolean;
  showHistoryMenu: boolean;
  historyItems: HistoryItem[];
  onToggleMoreMenu: () => void;
  onToggleHistoryMenu: () => void;
  onHistoryItemClick: (url: string) => void;
  onShare?: () => void;
  onSave?: () => void;
}

const TopActionBar: React.FC<TopActionBarProps> = ({
  userName = "Philonet User",
  userAvatar,
  showMoreMenu,
  showHistoryMenu,
  historyItems,
  onToggleMoreMenu,
  onToggleHistoryMenu,
  onHistoryItemClick,
  onShare,
  onSave
}) => {
  return (
    <div className="absolute top-0 left-0 right-0 h-[68px] border-b border-philonet-border flex items-center justify-between px-4 lg:px-6">
      {/* Left side - User info */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="h-8 w-8 rounded-full border border-philonet-border-light bg-philonet-card flex items-center justify-center text-philonet-text-muted">
          {userAvatar ? (
            <img src={userAvatar} alt={userName} className="h-full w-full rounded-full object-cover" />
          ) : (
            <UserRound className="h-4 w-4" />
          )}
        </div>
        <span className="text-sm font-light tracking-philonet-wide truncate max-w-[120px] md:max-w-[160px] lg:max-w-[200px]">
          {userName}
        </span>
      </div>
      
      {/* Right side - Action buttons */}
      <div className="flex items-center gap-2">
        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-2">
          <Button className="h-9 px-4 text-sm" onClick={onShare}>
            <Share2 className="h-4 w-4" />
            <span className="ml-2">Share</span>
          </Button>
          <Button className="h-9 px-4 text-sm" onClick={onSave}>
            <Bookmark className="h-4 w-4" />
            <span className="ml-2">Save</span>
          </Button>
          <div className="relative" data-more-menu>
            <Button 
              className="h-9 px-4 text-sm"
              onClick={onToggleMoreMenu}
              title="More options"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="ml-2">More</span>
            </Button>
            
            {/* More dropdown */}
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute top-full right-0 mt-2 w-[200px] rounded-philonet-lg border border-philonet-border bg-philonet-card/95 backdrop-blur shadow-xl z-50"
                >
                  <div className="p-2">
                    <HistoryMenu
                      isOpen={showHistoryMenu}
                      onToggle={onToggleHistoryMenu}
                      historyItems={historyItems}
                      onItemClick={onHistoryItemClick}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        
        {/* Mobile buttons */}
        <div className="md:hidden flex items-center gap-1.5">
          <Button className="h-9 w-9 p-0" title="Share" onClick={onShare}>
            <Share2 className="h-4 w-4" />
          </Button>
          <Button className="h-9 w-9 p-0" title="Save" onClick={onSave}>
            <Bookmark className="h-4 w-4" />
          </Button>
          <div className="relative" data-more-menu>
            <Button 
              className="h-9 w-9 p-0" 
              title="More options"
              onClick={onToggleMoreMenu}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
            
            {/* Mobile More dropdown */}
            <AnimatePresence>
              {showMoreMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute top-full right-0 mt-2 w-[200px] rounded-philonet-lg border border-philonet-border bg-philonet-card/95 backdrop-blur shadow-xl z-50"
                >
                  <div className="p-2">
                    <HistoryMenu
                      isOpen={showHistoryMenu}
                      onToggle={onToggleHistoryMenu}
                      historyItems={historyItems}
                      onItemClick={onHistoryItemClick}
                      isMobile={true}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopActionBar;
