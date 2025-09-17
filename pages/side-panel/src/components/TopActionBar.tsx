import React, { useState } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { UserRound, Share2, Bookmark, MoreHorizontal, LogIn } from 'lucide-react';
import { Button } from './ui';
import HistoryMenu from './HistoryMenu';
import AuthModal from './AuthModal';
import { HistoryItem } from '../types';
import { useApp } from '../context';

interface TopActionBarProps {
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
  showMoreMenu,
  showHistoryMenu,
  historyItems,
  onToggleMoreMenu,
  onToggleHistoryMenu,
  onHistoryItemClick,
  onShare,
  onSave
}) => {
  const { user, isAuthenticated } = useApp();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleUserClick = () => {
    setShowAuthModal(true);
  };

  const handleCloseAuth = () => {
    setShowAuthModal(false);
  };

  return (
    <>
      <div className="absolute top-0 left-0 right-0 h-[68px] border-b border-philonet-border flex items-center justify-between px-4 lg:px-6">
        {/* Left side - User info */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleUserClick}
            className="h-8 w-8 rounded-full border border-philonet-border-light bg-philonet-card flex items-center justify-center text-philonet-text-muted hover:border-philonet-blue-500/60 hover:bg-philonet-blue-500/10 transition-all duration-200 group"
            title={isAuthenticated ? "View profile" : "Sign in"}
          >
            {isAuthenticated && user?.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.name} 
                className="h-full w-full rounded-full object-cover" 
              />
            ) : isAuthenticated ? (
              <UserRound className="h-4 w-4 text-philonet-blue-400" />
            ) : (
              <LogIn className="h-4 w-4 group-hover:text-philonet-blue-400 transition-colors" />
            )}
          </button>
          <button
            onClick={handleUserClick}
            className="text-sm font-light tracking-philonet-wide truncate max-w-[120px] md:max-w-[160px] lg:max-w-[200px] hover:text-philonet-blue-400 transition-colors text-left"
            title={isAuthenticated ? "View profile" : "Sign in"}
          >
            {isAuthenticated && user ? user.name : "Sign in"}
          </button>
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

      {/* Authentication Modal */}
      <AuthModal
        isOpen={showAuthModal}
        onClose={handleCloseAuth}
        initialMode="signin"
      />
    </>
  );
};

export default TopActionBar;
