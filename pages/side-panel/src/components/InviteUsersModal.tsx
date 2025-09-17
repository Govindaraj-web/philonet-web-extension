import React, { useState, useEffect, useMemo } from 'react';
import { Users, X, Check, Loader2, Search, UserPlus, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@extension/ui';
import { fetchTopFriends, TopFriend, inviteUser } from '../services/thoughtRoomsApi';
import MentionService, { TaggableUser } from '../services/mentionService';

interface InviteUsersModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: number;
  parentCommentId?: number;
  articleTitle?: string;
}

const InviteUsersModal: React.FC<InviteUsersModalProps> = ({
  isOpen,
  onClose,
  articleId,
  parentCommentId,
  articleTitle
}) => {
  const [friends, setFriends] = useState<TopFriend[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<TaggableUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invitingUsers, setInvitingUsers] = useState<Set<string>>(new Set());
  const [invitedUsers, setInvitedUsers] = useState<Set<string>>(new Set());
  const [toastMessage, setToastMessage] = useState<string>('');
  const [showToast, setShowToast] = useState(false);
  
  const mentionService = useMemo(() => new MentionService(), []);

  // Load friends when modal opens
  useEffect(() => {
    if (isOpen && friends.length === 0) {
      loadFriends();
    }
  }, [isOpen]);

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

  const showToastMessage = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleInviteUser = async (user: TopFriend) => {
    if (invitingUsers.has(user.user_id) || invitedUsers.has(user.user_id)) {
      return;
    }

    setInvitingUsers(prev => new Set(prev).add(user.user_id));

    try {
      await inviteUser({
        articleId,
        userId: user.user_id,
        commentid: parentCommentId
      });

      setInvitedUsers(prev => new Set(prev).add(user.user_id));
      showToastMessage(`Invitation sent to ${user.name}`);
    } catch (error) {
      console.error('Failed to invite user:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send invitation';
      showToastMessage(`Failed to invite ${user.name}: ${errorMessage}`);
    } finally {
      setInvitingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(user.user_id);
        return newSet;
      });
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-philonet-card border border-philonet-border rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 border-b border-philonet-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <UserPlus className="w-5 h-5 text-philonet-blue-400" />
              <div>
                <h3 className="text-lg font-medium text-philonet-text-primary">Invite to Room</h3>
                {articleTitle && (
                  <p className="text-sm text-philonet-text-muted truncate max-w-64">
                    {articleTitle}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
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
                placeholder="Search users to invite..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(
                  "w-full pl-10 py-2.5 bg-philonet-background/50 border border-philonet-border rounded-lg text-philonet-text-primary placeholder:text-philonet-text-muted focus:border-philonet-blue-400 focus:outline-none focus:bg-philonet-background/80 transition-all duration-200",
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

          {/* Content */}
          <div className="flex-1 overflow-y-auto philonet-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-philonet-blue-400" />
                <span className="ml-2 text-philonet-text-secondary">
                  Loading users...
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
                  {searchQuery.trim() ? 'No users found' : 'No users available to invite'}
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
                {displayUsers.map((user, index) => {
                  const isInviting = invitingUsers.has(user.user_id);
                  const isInvited = invitedUsers.has(user.user_id);
                  
                  return (
                    <motion.div
                      key={user.user_id}
                      variants={{
                        hidden: { opacity: 0, x: -10 },
                        visible: { opacity: 1, x: 0 }
                      }}
                      whileHover={{ x: 2, scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border",
                        isInvited 
                          ? 'bg-green-500/10 border-green-500/30 cursor-default' 
                          : isInviting
                          ? 'bg-philonet-blue-500/10 border-philonet-blue-500/30 cursor-default'
                          : 'hover:bg-philonet-border/30 border-transparent hover:border-philonet-blue-400/30'
                      )}
                      onClick={() => !isInviting && !isInvited && handleInviteUser(user)}
                    >
                      {/* Profile Picture */}
                      <div className="relative flex-shrink-0">
                        {user.display_pic ? (
                          <img
                            src={user.display_pic}
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover border border-philonet-border"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-philonet-blue-500 to-philonet-blue-400 flex items-center justify-center text-white font-medium">
                            {user.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                        
                        {/* Online indicator */}
                        {user.is_online && (
                          <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 border-philonet-card"></div>
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-philonet-text-primary font-medium truncate">
                          {user.name}
                        </div>
                        <div className="text-xs text-philonet-text-muted">
                          {typeof user.interaction_count === 'number' 
                            ? `${user.interaction_count} interactions`
                            : user.interaction_count
                          }
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex-shrink-0">
                        {isInvited ? (
                          <div className="flex items-center gap-2 text-green-400 text-sm font-medium">
                            <Check className="w-4 h-4" />
                            Invited
                          </div>
                        ) : isInviting ? (
                          <div className="flex items-center gap-2 text-philonet-blue-400 text-sm">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Inviting...
                          </div>
                        ) : (
                          <button
                            className="flex items-center gap-2 px-3 py-1.5 bg-philonet-blue-500 hover:bg-philonet-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
                            title={`Invite ${user.name} to room`}
                          >
                            <Send className="w-3 h-3" />
                            Invite
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-philonet-border flex items-center justify-between flex-shrink-0">
            <div className="text-sm text-philonet-text-secondary">
              {invitedUsers.size > 0 
                ? `${invitedUsers.size} invitation${invitedUsers.size > 1 ? 's' : ''} sent`
                : 'Select users to invite to the room'
              }
            </div>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-philonet-border hover:bg-philonet-border-light text-philonet-text-primary rounded-lg transition-colors"
            >
              Done
            </button>
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
            <div className="bg-philonet-card border border-philonet-border rounded-lg shadow-xl px-4 py-3 flex items-center gap-3 backdrop-blur-sm max-w-sm">
              <div className="p-1 bg-philonet-blue-500/20 rounded-full">
                <Check className="h-3 w-3 text-philonet-blue-400" />
              </div>
              <span className="text-sm text-philonet-text-primary font-medium">{toastMessage}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
};

export default InviteUsersModal;
