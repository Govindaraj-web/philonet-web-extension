import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  Globe,
  ExternalLink,
  QrCode,
  LinkIcon
} from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string;
  articleTitle?: string;
  articleDescription?: string;
}

const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  shareUrl,
  articleTitle = "Current Page",
  articleDescription = ""
}) => {
  const [copied, setCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // Reset states when modal opens
  useEffect(() => {
    if (isOpen) {
      setCopied(false);
      setShowToast(false);
    }
  }, [isOpen]);

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToastMessage('Share link copied to clipboard!');
      setTimeout(() => setCopied(false), 3000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      // Fallback for older browsers
      try {
        const textArea = document.createElement('textarea');
        textArea.value = shareUrl;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        showToastMessage('Share link copied to clipboard!');
        setTimeout(() => setCopied(false), 3000);
      } catch (fallbackError) {
        showToastMessage('Failed to copy link. Please copy manually.');
      }
    }
  };

  const handleOpenInNewTab = () => {
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
    showToastMessage('Opening share link in new tab');
  };

  const generateQRCode = () => {
    // For now, we'll use a simple QR code service
    // In production, you might want to use a dedicated QR code library
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(shareUrl)}`;
    return qrCodeUrl;
  };

  const [showQRCode, setShowQRCode] = useState(false);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-philonet-card border border-philonet-border rounded-philonet-lg shadow-2xl max-w-lg w-full mx-4 lg:mx-0 overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-philonet-border">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-philonet-blue-500/10 rounded-lg">
                <Share2 className="h-5 w-5 text-philonet-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-white truncate">
                  Share Link
                </h2>
                <p className="text-sm text-philonet-text-muted truncate">
                  {articleTitle}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-philonet-text-muted hover:text-white transition-colors p-2 rounded-lg hover:bg-philonet-panel ml-3 flex-shrink-0"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Article Description */}
            {articleDescription && (
              <div className="p-4 bg-philonet-bg/30 border border-philonet-border/50 rounded-lg">
                <p className="text-sm text-philonet-text-secondary line-clamp-3">
                  {articleDescription}
                </p>
              </div>
            )}

            {/* Share URL Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-philonet-blue-400" />
                <span className="text-sm font-medium text-white">
                  Share URL
                </span>
              </div>
              
              <div className="space-y-3">
                {/* URL Input with Copy Button */}
                <div className="flex items-center gap-3 p-4 bg-philonet-bg/50 border border-philonet-border/70 rounded-lg hover:border-philonet-blue-400/30 transition-colors">
                  <Globe className="h-4 w-4 text-philonet-text-muted flex-shrink-0" />
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 bg-transparent text-sm text-philonet-text truncate outline-none cursor-default select-all"
                    onClick={(e) => e.currentTarget.select()}
                  />
                  <button
                    onClick={handleCopyUrl}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all flex-shrink-0 ${
                      copied
                        ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                        : 'bg-philonet-blue-500 hover:bg-philonet-blue-600 text-white hover:shadow-lg hover:scale-105 active:scale-95'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={handleOpenInNewTab}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-philonet-panel hover:bg-philonet-panel-light border border-philonet-border/70 hover:border-philonet-blue-400/50 text-white text-sm font-medium rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Link
                  </button>
                  
                  <button
                    onClick={() => setShowQRCode(!showQRCode)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-philonet-blue-500/10 hover:bg-philonet-blue-500/20 border border-philonet-blue-400/30 hover:border-philonet-blue-400/50 text-philonet-blue-400 hover:text-philonet-blue-300 text-sm font-medium rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <QrCode className="h-4 w-4" />
                    QR Code
                  </button>
                </div>

                {/* QR Code Section */}
                <AnimatePresence>
                  {showQRCode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 bg-white rounded-lg border border-philonet-border/50 text-center">
                        <img
                          src={generateQRCode()}
                          alt="QR Code for share link"
                          className="w-48 h-48 mx-auto rounded-lg"
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling!.classList.remove('hidden');
                          }}
                        />
                        <div className="hidden text-philonet-text-muted text-sm mt-2">
                          QR Code unavailable
                        </div>
                        <p className="text-xs text-philonet-text-muted mt-2">
                          Scan with your phone to open the link
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-philonet-blue-500/5 border border-philonet-blue-400/20 rounded-lg">
                <Globe className="h-4 w-4 text-philonet-blue-400 flex-shrink-0" />
                <p className="text-sm text-philonet-blue-200">
                  Anyone with this link can view the shared content
                </p>
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full px-6 py-3 bg-philonet-border hover:bg-philonet-border-light text-white text-base font-medium rounded-lg transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Done
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-60"
          >
            <div className="bg-philonet-card border border-philonet-border rounded-lg shadow-xl px-4 py-3 flex items-center gap-3 backdrop-blur-sm">
              <div className="p-1 bg-green-500/20 rounded-full">
                <Check className="h-3 w-3 text-green-400" />
              </div>
              <span className="text-sm text-white font-medium">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default ShareModal;

  // Handle click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadData = async () => {
    setLoadingRooms(true);
    setLoadingFriends(true);
    
    try {
      const [roomsData, friendsData] = await Promise.all([
        shareService.getRooms(),
        shareService.getFriends()
      ]);
      setRooms(roomsData);
      setFriends(friendsData);
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoadingRooms(false);
      setLoadingFriends(false);
    }
  };

  const generateSuggestions = () => {
    // Mock suggestions - in a real app, this would be based on recent collaborators, frequent contacts, etc.
    const mockSuggestions: SuggestionItem[] = [
      { id: 'friend-1', name: 'Alice Johnson', username: '@alice', type: 'user', isOnline: true },
      { id: 'room-1', name: 'Design Team', username: 'design-team', type: 'room' },
      { id: 'friend-2', name: 'Bob Smith', username: '@bob', type: 'user', isOnline: false },
      { id: 'room-2', name: 'Product Discussion', username: 'product', type: 'room' },
    ];
    setSuggestions(mockSuggestions);
  };

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      showToastMessage('Link copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy URL:', err);
      showToastMessage('Failed to copy link');
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setShowAutocomplete(value.length > 0);
  };

  const handleSelectUser = (item: SuggestionItem) => {
    // Check if user is already selected
    if (selectedUsers.some(user => user.id === item.id)) {
      showToastMessage(`${item.name} already selected`);
      return;
    }

    setSelectedUsers(prev => [...prev, item]);
    setSearchQuery('');
    // Keep dropdown open for multi-selection
    showToastMessage(`Added ${item.name}`);
  };

  const handleRemoveUser = (userId: string) => {
    const user = selectedUsers.find(u => u.id === userId);
    setSelectedUsers(prev => prev.filter(user => user.id !== userId));
    showToastMessage(`Removed ${user?.name}`);
  };

  const handleSend = () => {
    if (selectedUsers.length === 0) {
      showToastMessage('Please select at least one person or group');
      return;
    }
    
    showToastMessage(`Shared with ${selectedUsers.length} recipient${selectedUsers.length > 1 ? 's' : ''}!`);
    setTimeout(() => onClose(), 1500);
  };

  const filteredAutocomplete = [...rooms, ...friends]
    .filter(item => {
      const name = 'name' in item ? item.name : '';
      const username = 'username' in item ? item.username : '';
      const description = 'description' in item ? item.description : '';
      
      return (
        name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    })
    .map(item => ({
      id: `${'memberCount' in item ? 'room' : 'friend'}-${item.id}`,
      name: item.name,
      username: 'username' in item ? item.username : `${item.memberCount} members`,
      type: ('memberCount' in item ? 'room' : 'user') as 'user' | 'room',
      isOnline: 'isOnline' in item ? item.isOnline : undefined,
      isPrivate: 'isPrivate' in item ? item.isPrivate : undefined,
    }))
    .slice(0, 8); // Limit results

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="bg-philonet-card border border-philonet-border rounded-philonet-lg shadow-2xl max-w-2xl w-full mx-4 lg:mx-0 h-[75vh] flex flex-col overflow-hidden relative"
          onClick={(e) => e.stopPropagation()}
        >
          <style>{`
            .custom-scrollbar {
              scrollbar-width: thin;
              scrollbar-color: rgba(99, 102, 241, 0.5) transparent;
            }
            .custom-scrollbar::-webkit-scrollbar {
              width: 6px;
            }
            .custom-scrollbar::-webkit-scrollbar-track {
              background: transparent;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb {
              background-color: rgba(99, 102, 241, 0.5);
              border-radius: 3px;
            }
            .custom-scrollbar::-webkit-scrollbar-thumb:hover {
              background-color: rgba(99, 102, 241, 0.7);
            }
          `}</style>
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-philonet-border">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="p-2 bg-philonet-blue-500/10 rounded-lg">
                <Share2 className="h-5 w-5 text-philonet-blue-400" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-lg font-semibold text-white truncate">
                  Share "{articleTitle}"
                </h2>
                <p className="text-sm text-philonet-text-muted">
                  {selectedUsers.length > 0 
                    ? `${selectedUsers.length} recipient${selectedUsers.length > 1 ? 's' : ''} selected`
                    : 'Send to people and groups'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-3 flex-shrink-0">
              {selectedUsers.length > 0 && (
                <button
                  onClick={handleSend}
                  className="px-5 py-2 bg-gradient-to-r from-philonet-blue-500 to-philonet-blue-600 hover:from-philonet-blue-600 hover:to-philonet-blue-700 text-white text-sm font-medium rounded-lg transition-all hover:shadow-md transform hover:scale-[1.02] active:scale-[0.98]"
                >
                  Send
                </button>
              )}
              <button
                onClick={onClose}
                className="text-philonet-text-muted hover:text-white transition-colors p-2 rounded-lg hover:bg-philonet-panel"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 space-y-8 overflow-y-auto custom-scrollbar">
            {/* Add People and Groups */}
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <label className="text-base font-medium text-philonet-text">
                  Recipients ({selectedUsers.length})
                </label>
                {selectedUsers.length > 0 && (
                  <button
                    onClick={() => {
                      setSelectedUsers([]);
                      showToastMessage('Cleared all recipients');
                    }}
                    className="text-sm text-philonet-text-muted hover:text-philonet-blue-400 transition-colors flex items-center gap-1.5"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                )}
              </div>
              
              {/* Selected Users */}
              {selectedUsers.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-3"
                >
                  <div className="text-base font-medium text-philonet-text">
                    Selected ({selectedUsers.length})
                  </div>
                  
                  <div className="bg-philonet-bg/50 rounded-lg p-4 border border-philonet-border/50 max-h-[30vh] overflow-y-auto custom-scrollbar">
                    <div className="flex flex-wrap gap-2.5">
                      <AnimatePresence mode="popLayout">
                        {selectedUsers.slice(0, 20).map((user, index) => (
                          <motion.div
                            key={user.id}
                            initial={{ opacity: 0, scale: 0.8, x: -10 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.8, x: -10 }}
                            transition={{ duration: 0.15, delay: index * 0.02 }}
                            layout
                            className="flex items-center gap-2.5 bg-philonet-panel px-3 py-2 rounded-lg border border-philonet-border/70 text-sm group hover:bg-philonet-panel-light transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="relative">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-philonet-blue-400 to-philonet-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                  {user.name.charAt(0)}
                                </div>
                                {user.type === 'user' && user.isOnline && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border border-philonet-panel" />
                                )}
                              </div>
                              <span className="text-philonet-text font-medium max-w-28 truncate">
                                {user.name}
                              </span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRemoveUser(user.id);
                              }}
                              className="text-philonet-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </motion.div>
                        ))}
                        
                        {selectedUsers.length > 20 && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex items-center gap-2.5 bg-philonet-text-muted/10 px-3 py-2 rounded-lg text-sm text-philonet-text-muted"
                          >
                            <Users className="h-4 w-4" />
                            +{selectedUsers.length - 20} more
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                    
                    {selectedUsers.length > 20 && (
                      <div className="mt-5 pt-5 border-t border-philonet-border/50">
                        <details className="group">
                          <summary className="cursor-pointer text-sm text-philonet-blue-400 hover:text-philonet-blue-300 transition-colors select-none">
                            View all {selectedUsers.length} recipients
                          </summary>
                          <div className="mt-4 space-y-2.5 max-h-48 overflow-y-auto custom-scrollbar">
                            {selectedUsers.slice(20).map((user) => (
                              <div
                                key={user.id}
                                className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-philonet-panel/50 hover:bg-philonet-panel transition-colors"
                              >
                                <div className="flex items-center gap-2.5">
                                  <div className="relative">
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-philonet-blue-400 to-philonet-blue-600 flex items-center justify-center text-white text-xs font-medium">
                                      {user.name.charAt(0)}
                                    </div>
                                    {user.type === 'user' && user.isOnline && (
                                      <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
                                    )}
                                  </div>
                                  <span className="text-philonet-text font-medium truncate">
                                    {user.name}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleRemoveUser(user.id)}
                                  className="text-philonet-text-muted hover:text-red-400 transition-colors"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </details>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
              
              <div className="relative">
                <div className="flex items-center gap-3">
                  <div className="flex-1 relative">
                    <UserPlus className="absolute left-4 h-5 w-5 text-philonet-text-muted" />
                    <input
                      ref={searchInputRef}
                      type="text"
                      placeholder="Enter names, emails, or groups..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      onFocus={() => setShowAutocomplete(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && filteredAutocomplete.length > 0) {
                          handleSelectUser(filteredAutocomplete[0]);
                        }
                      }}
                      className="w-full pl-12 pr-4 py-3 bg-philonet-panel border border-philonet-border rounded-lg text-white placeholder-philonet-text-muted focus:outline-none focus:border-philonet-blue-400 focus:ring-1 focus:ring-philonet-blue-400/20 text-base transition-all"
                    />
                  </div>
                  <button
                    onClick={() => {
                      if (searchQuery.trim()) {
                        // Create a new user from email/name input
                        const newUser: SuggestionItem = {
                          id: `manual-${Date.now()}`,
                          name: searchQuery.includes('@') ? searchQuery.split('@')[0] : searchQuery,
                          username: searchQuery.includes('@') ? searchQuery : `@${searchQuery}`,
                          type: 'user'
                        };
                        handleSelectUser(newUser);
                      } else {
                        showToastMessage('Enter a name or email to invite');
                        searchInputRef.current?.focus();
                      }
                    }}
                    className="px-4 py-3 bg-philonet-blue-500/10 hover:bg-philonet-blue-500/20 border border-philonet-blue-400/30 hover:border-philonet-blue-400/50 text-philonet-blue-400 hover:text-philonet-blue-300 rounded-lg transition-all flex items-center gap-2 text-base font-medium"
                    title="Send invite"
                  >
                    <UserPlus className="h-5 w-5" />
                    Invite
                  </button>
                </div>

                {/* Autocomplete Dropdown */}
                <AnimatePresence>
                  {showAutocomplete && (searchQuery.length > 0 ? filteredAutocomplete.length > 0 : suggestions.length > 0) && (
                    <motion.div
                      ref={autocompleteRef}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 right-0 mt-1 bg-philonet-card border border-philonet-border rounded-lg shadow-xl z-10 max-h-80 overflow-y-auto custom-scrollbar"
                    >
                      {(searchQuery.length > 0 ? filteredAutocomplete : suggestions).map((item) => {
                        const isSelected = selectedUsers.some(user => user.id === item.id);
                        return (
                          <button
                            key={item.id}
                            onClick={() => handleSelectUser(item)}
                            disabled={isSelected}
                            className={`w-full px-4 py-3 text-left transition-colors first:rounded-t-lg last:rounded-b-lg group relative ${
                              isSelected 
                                ? 'bg-philonet-blue-500/10 opacity-60 cursor-default' 
                                : 'hover:bg-philonet-panel/50 cursor-pointer'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className="relative">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  isSelected 
                                    ? 'bg-philonet-blue-500/30' 
                                    : 'bg-gradient-to-br from-philonet-blue-400 to-philonet-blue-600'
                                }`}>
                                  {isSelected ? (
                                    <Check className="h-4 w-4 text-philonet-blue-400" />
                                  ) : (
                                    <span className="text-white text-xs font-semibold">
                                      {item.name.charAt(0).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                {item.type === 'user' && item.isOnline && !isSelected && (
                                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-400 rounded-full border-2 border-philonet-card" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm font-medium truncate transition-colors ${
                                  isSelected 
                                    ? 'text-philonet-blue-300' 
                                    : 'text-white group-hover:text-philonet-blue-300'
                                }`}>
                                  {item.name}
                                  {isSelected && <span className="ml-2 text-xs">(selected)</span>}
                                </p>
                                <p className="text-xs text-philonet-text-muted truncate">
                                  {item.username}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quick Suggestions */}
              {searchQuery.length === 0 && !showAutocomplete && suggestions.length > 0 && selectedUsers.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-3"
                >
                  <div className="flex items-center">
                    <p className="text-sm text-philonet-text-muted font-medium">Suggested</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.slice(0, 6).map((item) => (
                      <motion.button
                        key={item.id}
                        onClick={() => handleSelectUser(item)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-2 px-3 py-2 bg-philonet-panel hover:bg-philonet-panel-light border border-philonet-border/70 rounded-lg text-sm transition-all hover:border-philonet-blue-400/50 group"
                      >
                        <div className="relative">
                          <div className="w-5 h-5 bg-gradient-to-br from-philonet-blue-400 to-philonet-blue-600 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-semibold">
                              {item.name.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          {item.type === 'user' && item.isOnline && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full border border-philonet-panel" />
                          )}
                        </div>
                        <span className="text-white font-medium group-hover:text-philonet-blue-300 transition-colors">
                          {item.name}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Share Link */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-philonet-blue-400" />
                <span className="text-sm font-medium text-philonet-text-muted">
                  Share Link
                </span>
              </div>
              
              <div className="flex items-center gap-2 p-3 bg-philonet-bg/50 border border-philonet-border/70 rounded-lg hover:border-philonet-blue-400/30 transition-colors">
                <Globe className="h-4 w-4 text-philonet-text-muted flex-shrink-0" />
                <input
                  type="text"
                  value={shareUrl}
                  readOnly
                  className="flex-1 bg-transparent text-sm text-philonet-text truncate outline-none cursor-default"
                />
                <button
                  onClick={handleCopyUrl}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all flex-shrink-0 ${
                    copied
                      ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                      : 'bg-philonet-blue-500 hover:bg-philonet-blue-600 text-white hover:shadow-sm'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy
                    </>
                  )}
                </button>
              </div>
              
              <p className="text-sm text-philonet-text-muted">
                Anyone with this link can view the content
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-philonet-bg/50 hover:bg-philonet-panel/50 border border-philonet-border/70 text-white text-base font-medium rounded-lg transition-all hover:border-philonet-border-light"
              >
                {selectedUsers.length > 0 ? 'Done' : 'Cancel'}
              </button>
              {selectedUsers.length === 0 && (
                <button
                  onClick={handleSend}
                  disabled
                  className="flex-1 px-6 py-3 bg-philonet-border/30 text-philonet-text-muted text-base font-medium rounded-lg cursor-not-allowed"
                >
                  Send
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Toast Notification */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-60"
          >
            <div className="bg-philonet-card border border-philonet-border rounded-lg shadow-lg px-4 py-3 flex items-center gap-2">
              <Check className="h-4 w-4 text-green-400" />
              <span className="text-sm text-white">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default ShareModal;
