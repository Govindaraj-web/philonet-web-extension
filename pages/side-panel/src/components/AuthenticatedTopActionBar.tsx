import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { UserRound, Share2, Bookmark, MoreHorizontal, LogOut, FileText, Eye, Settings, Reply, MessageSquare } from 'lucide-react';
import { Button } from './ui';
import HistoryMenu from './HistoryMenu';
import { HistoryItem } from '../types';
import { useApp } from '../context';

interface AuthenticatedTopActionBarProps {
  showMoreMenu: boolean;
  showHistoryMenu: boolean;
  historyItems: HistoryItem[];
  onToggleMoreMenu: () => void;
  onToggleHistoryMenu: () => void;
  onHistoryItemClick: (url: string) => void;
  onShare?: () => void;
  onSave?: () => void;
  onSummary?: () => void;
  onViewPageData?: () => void;
  onToggleSettings?: () => void;
  onReplyToThoughtDoc?: () => void;
  onToggleThoughtRooms?: () => void;
  useContentScript?: boolean;
  isExtracting?: boolean;
}

const AuthenticatedTopActionBar: React.FC<AuthenticatedTopActionBarProps> = ({
  showMoreMenu,
  showHistoryMenu,
  historyItems,
  onToggleMoreMenu,
  onToggleHistoryMenu,
  onHistoryItemClick,
  onShare,
  onSave,
  onSummary,
  onViewPageData,
  onToggleSettings,
  onReplyToThoughtDoc,
  onToggleThoughtRooms,
  useContentScript = false,
  isExtracting = false
}) => {
  const { user, logout } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    if (showUserMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
    
    return undefined;
  }, [showUserMenu]);

  const handleUserClick = () => {
    setShowUserMenu(!showUserMenu);
  };

  const handleLogout = async () => {
    await logout();
    setShowUserMenu(false);
  };

  const handleViewPageData = async () => {
    // Just call the callback - the parent component will handle data extraction
    onViewPageData?.();
  };

  return (
    <div className="absolute top-0 left-0 right-0 h-[68px] border-b border-philonet-border flex items-center px-4 lg:px-6">
      {/* Left side - User info */}
      <div className="flex items-center gap-3 flex-shrink-0 relative" ref={userMenuRef}>
        <button
          onClick={handleUserClick}
          className="h-8 w-8 rounded-full border border-philonet-border-light bg-philonet-card flex items-center justify-center text-philonet-text-muted hover:border-philonet-blue-500/60 hover:bg-philonet-blue-500/10 transition-all duration-200 group"
          title="User menu"
        >
          {user?.avatar ? (
            <img 
              src={user.avatar} 
              alt={user.name} 
              className="h-full w-full rounded-full object-cover" 
            />
          ) : (
            <UserRound className="h-4 w-4 text-philonet-blue-400" />
          )}
        </button>
        <button
          onClick={handleUserClick}
          className="text-sm font-light tracking-philonet-wide truncate max-w-[120px] md:max-w-[160px] lg:max-w-[200px] hover:text-philonet-blue-400 transition-colors text-left"
          title="User menu"
        >
          {user?.name || 'User'}
        </button>

        {/* User menu dropdown */}
        <AnimatePresence>
          {showUserMenu && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute top-full left-0 mt-2 w-[200px] rounded-philonet-lg border border-philonet-border bg-philonet-card/95 backdrop-blur shadow-xl z-50"
            >
              <div className="p-2">
                <div className="px-3 py-2 border-b border-philonet-border">
                  <p className="text-sm font-medium text-white truncate">{user?.name}</p>
                  <p className="text-xs text-philonet-text-muted truncate">{user?.email}</p>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-philonet-text-secondary hover:text-white hover:bg-philonet-border/30 rounded-lg transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Center - Status Indicator */}
      <div className="flex-1 flex items-center justify-center gap-2">
        {useContentScript && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-green-400 hidden lg:inline"></span>
          </div>
        )}      </div>
      
      {/* Right side - Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-2">
          <Button className="h-9 px-4 text-sm" onClick={onToggleThoughtRooms}>
            <MessageSquare className="h-4 w-4" />
            <span className="ml-2">Thought Rooms</span>
          </Button>
          <Button className="h-9 px-4 text-sm" onClick={onSummary}>
            <FileText className="h-4 w-4" />
            <span className="ml-2">G. summary</span>
          </Button>
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
                    {/* View Page Data button */}
                    <button
                      onClick={handleViewPageData}
                      className="w-full text-left p-3 rounded-lg border border-transparent hover:border-philonet-border-light hover:bg-philonet-panel/60 transition-colors group flex items-center gap-3 mb-2"
                    >
                      <Eye className="h-4 w-4 text-philonet-text-muted group-hover:text-philonet-blue-500" />
                      <span className="text-sm text-philonet-text-primary group-hover:text-white">
                        View Page Data
                      </span>
                    </button>

                    {/* Reply to Thought Doc button */}
                    <button
                      onClick={onReplyToThoughtDoc}
                      className="w-full text-left p-3 rounded-lg border border-transparent hover:border-philonet-border-light hover:bg-philonet-panel/60 transition-colors group flex items-center gap-3 mb-2"
                    >
                      <Reply className="h-4 w-4 text-philonet-text-muted group-hover:text-philonet-blue-500" />
                      <span className="text-sm text-philonet-text-primary group-hover:text-white">
                        Reply to Thought Doc
                      </span>
                    </button>

                    {/* Settings button */}
                    <button
                      onClick={onToggleSettings}
                      className="w-full text-left p-3 rounded-lg border border-transparent hover:border-philonet-border-light hover:bg-philonet-panel/60 transition-colors group flex items-center gap-3 mb-2"
                    >
                      <Settings className="h-4 w-4 text-philonet-text-muted group-hover:text-philonet-blue-500" />
                      <span className="text-sm text-philonet-text-primary group-hover:text-white">
                        Settings
                      </span>
                    </button>
                    
                    <HistoryMenu
                      isOpen={showHistoryMenu}
                      onToggle={onToggleHistoryMenu}
                      historyItems={historyItems}
                      onItemClick={onHistoryItemClick}
                      isMobile={false}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Mobile More button */}
        <div className="md:hidden relative" data-more-menu>
          <Button 
            className="h-9 px-3 text-sm"
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
                  {/* View Page Data button - Mobile */}
                  <button
                    onClick={handleViewPageData}
                    className="w-full text-left p-3 rounded-lg border border-transparent hover:border-philonet-border-light hover:bg-philonet-panel/60 transition-colors group flex items-center gap-3 mb-2"
                  >
                    <Eye className="h-4 w-4 text-philonet-text-muted group-hover:text-philonet-blue-500" />
                    <span className="text-sm text-philonet-text-primary group-hover:text-white">
                      View Page Data
                    </span>
                  </button>

                  {/* Reply to Thought Doc button - Mobile */}
                  <button
                    onClick={onReplyToThoughtDoc}
                    className="w-full text-left p-3 rounded-lg border border-transparent hover:border-philonet-border-light hover:bg-philonet-panel/60 transition-colors group flex items-center gap-3 mb-2"
                  >
                    <Reply className="h-4 w-4 text-philonet-text-muted group-hover:text-philonet-blue-500" />
                    <span className="text-sm text-philonet-text-primary group-hover:text-white">
                      Reply to Thought Doc
                    </span>
                  </button>

                  {/* Settings button - Mobile */}
                  <button
                    onClick={onToggleSettings}
                    className="w-full text-left p-3 rounded-lg border border-transparent hover:border-philonet-border-light hover:bg-philonet-panel/60 transition-colors group flex items-center gap-3 mb-2"
                  >
                    <Settings className="h-4 w-4 text-philonet-text-muted group-hover:text-philonet-blue-500" />
                    <span className="text-sm text-philonet-text-primary group-hover:text-white">
                      Settings
                    </span>
                  </button>
                  
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
  );
};

export default AuthenticatedTopActionBar;
