import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from "framer-motion";
import { UserRound, Share2, Bookmark, MoreHorizontal, LogOut, FileText, Eye, Settings, Reply, MessageSquare, Copy, Check, ExternalLink, Search } from 'lucide-react';
import { Button } from './ui';
import HistoryMenu from './HistoryMenu';
import ShareDropdown from './ShareDropdown';
import { HistoryItem } from '../types';
import { useApp } from '../context';
import { User } from '../services';

// Article interface for API response
interface Article {
  article_id: number;
  room_id: number;
  created_at: string;
  is_deleted: boolean;
  pdf: boolean;
  hash?: string;
  category: string;
  sparked_by: string | null;
  url: string;
  title: string;
  description: string;
  thumbnail_url: string;
  shared_by: string;
  tags: string[];
  categories: string[];
  summary: string;
  room_name: string;
  room_description: string;
  room_admin: string;
  private_space: boolean;
  spark_owner: string | null;
}

interface AuthenticatedTopActionBarProps {
  user?: User;
  article?: Article | null;
  historyItems: HistoryItem[];
  historyLoading?: boolean;
  historyError?: string | null;
  hasMoreHistoryData?: boolean;
  showHistoryMenu: boolean;
  showMoreMenu: boolean;
  onLogout?: () => void;
  onToggleHistoryMenu: () => void;
  onToggleMoreMenu: () => void;
  onLoadHistory?: () => void;
  onLoadMoreHistory?: () => void;
  onOpenHistoryItem?: (url: string) => void;
  onHistoryItemClick?: (url: string) => void;
  onViewPageData?: () => void;
  onToggleSettings?: () => void;
  onReplyToThoughtDoc?: () => void;
  onToggleThoughtRooms?: () => void;
  onToggleSearch?: () => void;
  useContentScript?: boolean;
  isExtracting?: boolean;
  shareUrl?: string;
  articleTitle?: string;
  thoughtRoomsCount?: number;
  fontSize?: 'small' | 'medium' | 'large';
  onFontSizeChange?: (size: 'small' | 'medium' | 'large') => void;
}

const AuthenticatedTopActionBar: React.FC<AuthenticatedTopActionBarProps> = ({
  showMoreMenu,
  showHistoryMenu,
  historyItems,
  historyLoading,
  historyError,
  hasMoreHistoryData,
  onToggleMoreMenu,
  onToggleHistoryMenu,
  onHistoryItemClick,
  onLoadHistory,
  onLoadMoreHistory,
  onViewPageData,
  onToggleSettings,
  onReplyToThoughtDoc,
  onToggleThoughtRooms,
  onToggleSearch,
  useContentScript = false,
  isExtracting = false,
  article = null,
  shareUrl = "",
  articleTitle = "",
  thoughtRoomsCount = 0,
  fontSize = 'medium',
  onFontSizeChange
}) => {
  const { user, logout } = useApp();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showShareDropdown, setShowShareDropdown] = useState(false);
  const [showMobileShareOptions, setShowMobileShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Debug article state changes
  useEffect(() => {
    console.log('🔍 AuthenticatedTopActionBar - article prop changed:', {
      article,
      hasArticle: !!article,
      articleId: article?.article_id,
      shouldEnableButtons: article && article.article_id > 0
    });
  }, [article]);

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

  const toggleShareDropdown = () => {
    setShowShareDropdown(!showShareDropdown);
  };

  const toggleMobileShareOptions = () => {
    if (article && article.article_id > 0) {
      setShowMobileShareOptions(!showMobileShareOptions);
    }
  };

  const handleMobileCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
    }
  };

  const handleMobileOpenInNewTab = () => {
    window.open(shareUrl, '_blank');
    setShowMobileShareOptions(false);
    onToggleMoreMenu(); // Close the more menu
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
        )}
      </div>
      
      {/* Right side - Action buttons */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-2">
          {/* Show Thought Rooms and Share buttons when article exists (enabled when article_id > 0) */}
          {article && (
            <>
              <div className="relative">
                <Button 
                  className={`h-9 px-4 text-sm transition-all duration-300 ${
                    article.article_id > 0 
                      ? 'opacity-100 cursor-pointer' 
                      : 'opacity-50 cursor-wait'
                  }`}
                  onClick={article.article_id > 0 ? onToggleThoughtRooms : undefined}
                  disabled={article.article_id <= 0}
                  title={
                    article.article_id > 0 
                      ? "Open Thought Rooms for discussions" 
                      : "Thought Rooms will be available after saving article..."
                  }
                >
                  <MessageSquare className="h-4 w-4" />
                  <span className="ml-2">Conversation Rooms</span>
                  {article.article_id <= 0 && (
                    <div className="ml-2 w-3 h-3 border border-philonet-text-muted/30 border-t-philonet-text-muted rounded-full animate-spin"></div>
                  )}
                </Button>
                {/* Conversation count badge - only show when enabled */}
                {article.article_id > 0 && thoughtRoomsCount > 0 && (
                  <div className="absolute -top-1 -right-1 h-5 w-5 bg-philonet-blue-500 text-white text-xs rounded-full flex items-center justify-center shadow-sm border border-philonet-card">
                    {thoughtRoomsCount > 99 ? '99+' : thoughtRoomsCount}
                  </div>
                )}
              </div>
              <div className={`transition-all duration-300 ${
                article.article_id > 0 
                  ? 'opacity-100' 
                  : 'opacity-50 cursor-wait'
              }`}>
                <ShareDropdown
                  shareUrl={shareUrl}
                  articleTitle={articleTitle}
                  isOpen={article.article_id > 0 ? showShareDropdown : false}
                  onToggle={article.article_id > 0 ? toggleShareDropdown : () => {}}
                />
              </div>
            </>
          )}
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

                    {/* Search button - only show when article exists */}
                    {article && (
                      <button
                        onClick={onToggleSearch}
                        className="w-full text-left p-3 rounded-lg border border-transparent hover:border-philonet-border-light hover:bg-philonet-panel/60 transition-colors group flex items-center gap-3 mb-2"
                      >
                        <Search className="h-4 w-4 text-philonet-text-muted group-hover:text-philonet-blue-500" />
                        <span className="text-sm text-philonet-text-primary group-hover:text-white">
                          Search Content
                        </span>
                        <span className="text-xs text-philonet-text-muted ml-auto">
                          Ctrl+F
                        </span>
                      </button>
                    )}

                    {/* Font Size picker - only show when article exists */}
                    {article && onFontSizeChange && (
                      <div className="p-3 rounded-lg border border-transparent hover:border-philonet-border-light hover:bg-philonet-panel/60 transition-colors group mb-2">
                        <div className="flex items-center gap-3 mb-2">
                          <FileText className="h-4 w-4 text-philonet-text-muted group-hover:text-philonet-blue-500" />
                          <span className="text-sm text-philonet-text-primary group-hover:text-white">
                            Font Size
                          </span>
                          <span className="text-xs text-philonet-text-muted ml-auto flex items-center">
                            <span className="text-base font-medium">A</span>
                            <span className="text-xs ml-0.5 mb-1">a</span>
                          </span>
                        </div>
                        <div className="flex items-center bg-black/20 rounded-lg p-0.5 backdrop-blur-sm border border-white/10">
                          {(['small', 'medium', 'large'] as const).map((size) => (
                            <button
                              key={size}
                              onClick={() => onFontSizeChange(size)}
                              className={`flex-1 px-2 py-1 text-xs rounded-md transition-all duration-200 font-medium relative ${
                                fontSize === size
                                  ? 'bg-philonet-blue-500 text-white border-philonet-blue-500 shadow-lg transform scale-105'
                                  : 'text-philonet-text-muted hover:bg-white/10 hover:text-white'
                              }`}
                              title={`${size.charAt(0).toUpperCase() + size.slice(1)} text size`}
                            >
                              <span className={size === 'small' ? 'text-xs' : size === 'large' ? 'text-sm' : 'text-xs'}>
                                {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                              </span>
                              {fontSize === size && (
                                <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}


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
                      onItemClick={onHistoryItemClick || (() => {})}
                      loading={historyLoading}
                      error={historyError}
                      onLoadMore={onLoadMoreHistory}
                      hasMoreData={hasMoreHistoryData}
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
                  {/* Mobile Thought Rooms and Share buttons - only show when article exists */}
                  {article && (
                    <>
                      {/* Thought Rooms button - Mobile */}
                      <button
                        onClick={article.article_id > 0 ? onToggleThoughtRooms : undefined}
                        disabled={article.article_id <= 0}
                        className={`w-full text-left p-3 rounded-lg border border-transparent hover:border-philonet-border-light hover:bg-philonet-panel/60 transition-colors group flex items-center gap-3 mb-2 ${
                          article.article_id > 0 
                            ? 'cursor-pointer' 
                            : 'cursor-wait opacity-50'
                        }`}
                        title={
                          article.article_id > 0 
                            ? "Open Thought Rooms for discussions" 
                            : "Thought Rooms will be available after saving article..."
                        }
                      >
                        <MessageSquare className="h-4 w-4 text-philonet-text-muted group-hover:text-philonet-blue-500" />
                        <span className="text-sm text-philonet-text-primary group-hover:text-white">
                          Conversation Rooms
                        </span>
                        {article.article_id <= 0 && (
                          <div className="ml-auto w-3 h-3 border border-philonet-text-muted/30 border-t-philonet-text-muted rounded-full animate-spin"></div>
                        )}
                        {article.article_id > 0 && thoughtRoomsCount > 0 && (
                          <div className="ml-auto h-4 w-4 bg-philonet-blue-500 text-white text-xs rounded-full flex items-center justify-center">
                            {thoughtRoomsCount > 9 ? '9+' : thoughtRoomsCount}
                          </div>
                        )}
                      </button>

                      {/* Share button - Mobile */}
                      <button
                        onClick={article.article_id > 0 ? toggleMobileShareOptions : undefined}
                        disabled={article.article_id <= 0}
                        className={`w-full text-left p-3 rounded-lg border border-transparent hover:border-philonet-border-light hover:bg-philonet-panel/60 transition-colors group flex items-center gap-3 mb-2 ${
                          article.article_id > 0 
                            ? 'cursor-pointer' 
                            : 'cursor-wait opacity-50'
                        }`}
                        title={
                          article.article_id > 0 
                            ? "Share article" 
                            : "Share will be available after saving article..."
                        }
                      >
                        <Share2 className="h-4 w-4 text-philonet-text-muted group-hover:text-philonet-blue-500" />
                        <span className="text-sm text-philonet-text-primary group-hover:text-white">
                          Share Article
                        </span>
                        {article.article_id <= 0 && (
                          <div className="ml-auto w-3 h-3 border border-philonet-text-muted/30 border-t-philonet-text-muted rounded-full animate-spin"></div>
                        )}
                      </button>

                      {/* Mobile Share Options - Show when share is expanded */}
                      {showMobileShareOptions && article.article_id > 0 && (
                        <div className="ml-4 mr-2 mb-2 border-l border-philonet-border pl-4">
                          {/* Copy URL option */}
                          <button
                            onClick={handleMobileCopyUrl}
                            className="w-full text-left p-2 rounded-lg border border-transparent hover:border-philonet-border-light hover:bg-philonet-panel/60 transition-colors group flex items-center gap-3 mb-1"
                          >
                            {copied ? (
                              <Check className="h-3 w-3 text-green-400" />
                            ) : (
                              <Copy className="h-3 w-3 text-philonet-text-muted group-hover:text-philonet-blue-500" />
                            )}
                            <span className="text-xs text-philonet-text-primary group-hover:text-white">
                              {copied ? 'Copied!' : 'Copy Link'}
                            </span>
                          </button>
                          
                          {/* Open in new tab option */}
                          <button
                            onClick={handleMobileOpenInNewTab}
                            className="w-full text-left p-2 rounded-lg border border-transparent hover:border-philonet-border-light hover:bg-philonet-panel/60 transition-colors group flex items-center gap-3"
                          >
                            <ExternalLink className="h-3 w-3 text-philonet-text-muted group-hover:text-philonet-blue-500" />
                            <span className="text-xs text-philonet-text-primary group-hover:text-white">
                              Open in New Tab
                            </span>
                          </button>
                        </div>
                      )}
                    </>
                  )}

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

                  {/* Search button - Mobile - only show when article exists */}
                  {article && (
                    <button
                      onClick={onToggleSearch}
                      className="w-full text-left p-3 rounded-lg border border-transparent hover:border-philonet-border-light hover:bg-philonet-panel/60 transition-colors group flex items-center gap-3 mb-2"
                    >
                      <Search className="h-4 w-4 text-philonet-text-muted group-hover:text-philonet-blue-500" />
                      <span className="text-sm text-philonet-text-primary group-hover:text-white">
                        Search Content
                      </span>
                      <span className="text-xs text-philonet-text-muted ml-auto">
                        Ctrl+F
                      </span>
                    </button>
                  )}

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
                    onItemClick={onHistoryItemClick || (() => {})}
                    loading={historyLoading}
                    error={historyError}
                    onLoadMore={onLoadMoreHistory}
                    hasMoreData={hasMoreHistoryData}
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
