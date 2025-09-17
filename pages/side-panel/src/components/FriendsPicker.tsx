import React, { useState, useEffect, useMemo } from 'react';
import { Users, X, Check, Loader2, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@extension/ui';
import { fetchTopFriends, TopFriend } from '../services/thoughtRoomsApi';
import MentionService, { TaggableUser } from '../services/mentionService';

interface FriendsPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onFriendsSelect: (friends: TopFriend[]) => void;
  selectedFriends?: TopFriend[];
}

const FriendsPicker: React.FC<FriendsPickerProps> = ({
  isOpen,
  onClose,
  onFriendsSelect,
  selectedFriends = []
}) => {
  const [friends, setFriends] = useState<TopFriend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TaggableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localSelectedFriends, setLocalSelectedFriends] = useState<TopFriend[]>(selectedFriends);
  
  const mentionService = useMemo(() => new MentionService(), []);

  // Load friends when modal opens
  useEffect(() => {
    if (isOpen && friends.length === 0) {
      loadFriends();
    }
  }, [isOpen]);

  // Update local selected friends when prop changes
  useEffect(() => {
    setLocalSelectedFriends(selectedFriends);
  }, [selectedFriends]);

  // Search users with debounce
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim()) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }

      setSearchLoading(true);
      try {
        const response = await mentionService.getTaggableUsers({ search: searchQuery });
        setSearchResults(response.users);
      } catch (error) {
        console.error('Error searching users:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    };

    // Show loading immediately when typing
    if (searchQuery.trim()) {
      setSearchLoading(true);
    }

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, mentionService]);

  const loadFriends = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchTopFriends();
      setFriends(response.data || []);
    } catch (err) {
      console.error('Failed to load friends:', err);
      setError(err instanceof Error ? err.message : 'Failed to load friends');
    } finally {
      setLoading(false);
    }
  };

  // Convert TaggableUser to TopFriend for consistency
  const convertToTopFriend = (user: TaggableUser): TopFriend => ({
    user_id: user.user_id,
    name: user.name,
    display_pic: user.avatar, // TaggableUser uses 'avatar' field
    interaction_count: 0 // Search results don't have interaction count
  });

  // Combined list of top friends and search results
  const displayUsers = useMemo(() => {
    if (searchQuery.trim()) {
      // Show search results
      return searchResults.map(convertToTopFriend);
    }
    // Show top friends
    return friends;
  }, [friends, searchResults, searchQuery]);

  const toggleFriend = (friend: TopFriend) => {
    setLocalSelectedFriends(prev => {
      const isSelected = prev.some(f => f.user_id === friend.user_id);
      if (isSelected) {
        return prev.filter(f => f.user_id !== friend.user_id);
      } else {
        return [...prev, friend];
      }
    });
  };

  const handleConfirm = () => {
    onFriendsSelect(localSelectedFriends);
    onClose();
  };

  const handleCancel = () => {
    setLocalSelectedFriends(selectedFriends); // Reset to original selection
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={handleCancel}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-philonet-card border border-philonet-border rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-philonet-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-philonet-blue-400" />
              <h3 className="text-lg font-medium text-philonet-text-primary">Invite Friends</h3>
            </div>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-philonet-border/30 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-philonet-border flex-shrink-0">
            <div className="relative">
              <Search className={cn(
                "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors",
                searchQuery.trim() ? "text-philonet-blue-400" : "text-philonet-text-muted"
              )} />
              <input
                type="text"
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-10 py-2 bg-white/5 border border-philonet-border rounded-lg text-white placeholder:text-philonet-text-muted focus:border-philonet-blue-400 focus:outline-none focus:bg-white/10 transition-all duration-200",
                  searchLoading ? "pr-12" : "pr-4"
                )}
              />
              {searchLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                >
                  <Loader2 className="w-4 h-4 animate-spin text-philonet-blue-400" />
                </motion.div>
              )}
            </div>
            {searchLoading && searchQuery.trim() && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="mt-2 text-xs text-philonet-blue-400 flex items-center gap-1"
              >
                <div className="w-2 h-2 bg-philonet-blue-400 rounded-full animate-pulse"></div>
                Searching for "{searchQuery}"...
              </motion.div>
            )}
          </div>

          {/* Selected Users Display */}
          {localSelectedFriends.length > 0 && (
            <div className="px-4 py-3 border-b border-philonet-border bg-philonet-blue-500/10 flex-shrink-0">
              <div className="text-xs text-philonet-blue-400 mb-2 font-medium">
                Selected ({localSelectedFriends.length})
              </div>
              <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto philonet-scrollbar">
                {localSelectedFriends.map((friend) => (
                  <div
                    key={friend.user_id}
                    className="flex items-center gap-2 bg-philonet-blue-500/20 border border-philonet-blue-500/30 rounded-full px-3 py-1.5 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {friend.display_pic ? (
                        <img
                          src={friend.display_pic}
                          alt={friend.name}
                          className="w-5 h-5 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-5 h-5 rounded-full bg-gradient-to-br from-philonet-blue-500 to-philonet-blue-400 flex items-center justify-center text-white text-xs font-medium">
                          {friend.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="text-philonet-text-primary font-medium">
                        {friend.name}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleFriend(friend)}
                      className="ml-1 text-philonet-blue-400 hover:text-philonet-blue-300 transition-colors"
                      title="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Content */}
          <div className="flex-1 overflow-y-auto philonet-scrollbar min-h-0">
            {(loading || (searchLoading && searchQuery.trim())) ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-philonet-blue-400" />
                <span className="ml-2 text-philonet-text-secondary">
                  {searchQuery.trim() ? 'Searching users...' : 'Loading friends...'}
                </span>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-red-400 mb-4">{error}</p>
                <button
                  onClick={loadFriends}
                  className="px-4 py-2 bg-philonet-blue-500 text-white rounded-lg hover:bg-philonet-blue-600 transition-colors"
                >
                  Retry
                </button>
              </div>
            ) : displayUsers.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="p-8 text-center"
              >
                <Users className="w-12 h-12 text-philonet-text-muted mx-auto mb-4" />
                <p className="text-philonet-text-secondary">
                  {searchQuery.trim() ? 'No users found' : 'No friends available to add'}
                </p>
              </motion.div>
            ) : (
              <motion.div 
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: {
                      delayChildren: 0.1,
                      staggerChildren: 0.05
                    }
                  }
                }}
                className="p-4 space-y-2"
              >
                {displayUsers.map((friend, index) => {
                  const isSelected = localSelectedFriends.some(f => f.user_id === friend.user_id);
                  
                  return (
                    <motion.div
                      key={friend.user_id}
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      whileHover={{ x: 2, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        isSelected 
                          ? 'bg-philonet-blue-500/20 border border-philonet-blue-500/30' 
                          : 'hover:bg-philonet-border/30'
                      }`}
                      onClick={() => toggleFriend(friend)}
                    >
                      {/* Profile Picture */}
                      <div className="relative flex-shrink-0">
                        {friend.display_pic ? (
                          <img
                            src={friend.display_pic}
                            alt={friend.name}
                            className="w-10 h-10 rounded-full object-cover border border-philonet-border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-philonet-blue-500 to-philonet-blue-400 flex items-center justify-center text-white font-medium">
                            {friend.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        
                        {/* Online indicator */}
                        {friend.is_online && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-philonet-card"></div>
                        )}
                      </div>

                      {/* Friend Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-philonet-text-primary font-medium truncate">
                          {friend.name}
                        </div>
                        <div className="text-xs text-philonet-text-muted">
                          {friend.interaction_count} interactions
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      <div className={`flex-shrink-0 transition-colors ${
                        isSelected 
                          ? 'text-philonet-blue-400' 
                          : 'text-philonet-text-muted'
                      }`}>
                        <Check className="w-5 h-5" />
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>

          {/* Footer */}
          {!loading && !error && displayUsers.length > 0 && (
            <div className="p-4 border-t border-philonet-border flex items-center justify-between flex-shrink-0">
              <div className="text-sm text-philonet-text-secondary">
                {localSelectedFriends.length > 0 
                  ? `${localSelectedFriends.length} friend${localSelectedFriends.length > 1 ? 's' : ''} selected`
                  : 'No friends selected'
                }
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 text-philonet-text-secondary hover:text-philonet-text-primary rounded-lg hover:bg-philonet-border/30 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="px-4 py-2 bg-philonet-blue-500 text-white rounded-lg hover:bg-philonet-blue-600 transition-colors"
                >
                  Invite Friends
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FriendsPicker;
