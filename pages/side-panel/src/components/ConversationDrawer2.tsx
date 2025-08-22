import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Maximize2, MessageSquare } from 'lucide-react';
import ConversationRoom from './ConversationRoom';
import { thoughtRoomsAPI, addComment } from '../services/thoughtRoomsApi';
import { philonetAuthStorage } from '../storage/auth-storage';

interface ConversationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  article?: {
    title: string;
    content: string;
    url: string;
  };
  taggedContent?: {
    sourceText: string;
    sourceUrl: string;
    highlightedText: string;
  };
  user?: {
    id: string;
    name: string;
    avatar?: string;
  };
  onSendMessage: (message: string, thoughtId?: string) => void;
  onAskAI: (question: string, thoughtId?: string) => void;
  onThoughtSelect?: (thoughtId: string) => void;
  currentArticleId?: string; // Add the current article ID from storage
}

const ConversationDrawer: React.FC<ConversationDrawerProps> = ({
  isOpen,
  onClose,
  article,
  taggedContent,
  user,
  onSendMessage,
  onAskAI,
  onThoughtSelect,
  currentArticleId
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [sidePanelWidth, setSidePanelWidth] = useState(400);
  const [drawerWidth, setDrawerWidth] = useState(480);
  const [isMobile, setIsMobile] = useState(false);
  const [thoughtStarters, setThoughtStarters] = useState<any[]>([]);
  const [isLoadingThoughts, setIsLoadingThoughts] = useState(false);
  const [thoughtsError, setThoughtsError] = useState<string | null>(null);
  
  // Separate state for individual conversation details
  const [conversationDetails, setConversationDetails] = useState<{[key: string]: any}>({});
  const [loadingConversations, setLoadingConversations] = useState<{[key: string]: boolean}>({});
  const [conversationErrors, setConversationErrors] = useState<{[key: string]: string}>({});
  const [selectedThoughtId, setSelectedThoughtId] = useState<string | null>(null);
  
  // State for tracking message sending
  const [sendingMessage, setSendingMessage] = useState(false);
  const [sendingError, setSendingError] = useState<string | null>(null);
  
  const drawerRef = useRef<HTMLDivElement>(null);

  // Get current user ID from auth storage
  const getCurrentUserId = async (): Promise<string | null> => {
    try {
      const authState = await philonetAuthStorage.get();
      return authState.user?.id || null;
    } catch (error) {
      console.error('❌ Failed to get current user ID:', error);
      return null;
    }
  };

  // Function to fetch thought room conversations
  const fetchThoughtRoomData = async (articleId: number) => {
    if (!articleId) {
      console.warn('⚠️ No article ID provided for thought room data fetch');
      return;
    }
    
    console.log('🔄 Fetching thought room data for article ID:', articleId);
    setIsLoadingThoughts(true);
    setThoughtsError(null);
    
    try {
      const response = await thoughtRoomsAPI.fetchComments({
        articleId,
        limit: 10
      });
      
      console.log('✅ Successfully fetched comments:', response);
      
      // Get current user ID for ownership detection
      const currentUserId = await getCurrentUserId();
      console.log('👤 Current user ID for thought starter ownership detection:', currentUserId);
      
      const transformedThoughts = response.comments.map(comment => 
        thoughtRoomsAPI.transformCommentToThoughtStarter(comment, currentUserId || undefined)
      );
      
      console.log('🔄 Transformed thoughts:', transformedThoughts);
      setThoughtStarters(transformedThoughts);
      
      // Log the structure of the first thought starter for debugging
      if (transformedThoughts.length > 0) {
        console.log('📋 First thought starter structure:', transformedThoughts[0]);
        console.log('🆔 First thought starter ID:', transformedThoughts[0].id, 'type:', typeof transformedThoughts[0].id);
      }
      
      // Enhance thought starters with loading and conversation states
      const enhancedThoughts = transformedThoughts.map(thought => ({
        ...thought,
        isLoadingConversation: loadingConversations[thought.id] || false,
        conversationError: conversationErrors[thought.id] || null,
        conversationDetails: conversationDetails[thought.id] || null,
        hasLoadedConversation: !!conversationDetails[thought.id]
      }));
      
      setThoughtStarters(enhancedThoughts);
    } catch (error) {
      console.error('❌ Error fetching thought room data:', error);
      
      // Check if it's an authentication error
      if (error instanceof Error && error.message.includes('authorization token')) {
        setThoughtsError('Authentication required. Please log in to view conversations.');
      } else if (error instanceof Error && error.message.includes('401')) {
        setThoughtsError('Authentication expired. Please log in again.');
      } else {
        setThoughtsError('Failed to load conversations. Please try again.');
      }
      
      // Fallback to demo data
      setThoughtStarters([]);
    } finally {
      setIsLoadingThoughts(false);
    }
  };

  // Function to fetch conversation thread (replies) for a specific thought starter
  const fetchConversationThread = async (thoughtId: string, parentCommentId: number) => {
    if (!parentCommentId) {
      console.warn('⚠️ No parent comment ID provided for conversation thread');
      return;
    }

    const articleId = getArticleId();
    console.log('🧵 Starting conversation thread fetch:', {
      thoughtId,
      parentCommentId,
      articleId
    });
    
    // Set loading state for this specific conversation
    setLoadingConversations(prev => ({ ...prev, [thoughtId]: true }));
    setConversationErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[thoughtId];
      return newErrors;
    });

    try {
      console.log('📞 Calling thoughtRoomsAPI.fetchConversationThread...');
      
      // Get current user ID for message ownership detection
      const currentUserId = await getCurrentUserId();
      console.log('👤 Current user ID for ownership detection:', currentUserId);
      
      const conversationData = await thoughtRoomsAPI.fetchConversationThread(
        articleId, 
        parentCommentId, 
        20, 
        currentUserId || undefined
      );
      
      console.log('✅ Successfully fetched conversation thread:', conversationData);
      
      // Store conversation details for this specific thought
      setConversationDetails(prev => ({
        ...prev,
        [thoughtId]: {
          parentCommentId,
          messages: conversationData.messages,
          hasMore: conversationData.hasMore,
          loadedAt: new Date().toISOString()
        }
      }));
      
      console.log('📊 Updated conversation details for thought:', thoughtId, 'with', conversationData.messages.length, 'messages');
    } catch (error) {
      console.error('❌ Error fetching conversation thread:', error);
      
      let errorMessage = 'Failed to load conversation. Please try again.';
      if (error instanceof Error && error.message.includes('authorization token')) {
        errorMessage = 'Authentication required. Please log in to view conversation.';
      } else if (error instanceof Error && error.message.includes('401')) {
        errorMessage = 'Authentication expired. Please log in again.';
      }
      
      setConversationErrors(prev => ({ ...prev, [thoughtId]: errorMessage }));
    } finally {
      setLoadingConversations(prev => ({ ...prev, [thoughtId]: false }));
      console.log('🏁 Finished conversation thread fetch for thought:', thoughtId);
    }
  };

  // Get article ID from storage (passed via props) or fallback
  const getArticleId = () => {
    console.log('🔍 Getting article ID - currentArticleId:', currentArticleId, 'article?.url:', article?.url);
    
    if (currentArticleId) {
      console.log('📦 Using article ID from storage:', currentArticleId);
      return parseInt(currentArticleId, 10);
    }
    
    // Fallback: try to extract from URL if currentArticleId is not available
    if (article?.url) {
      const urlMatch = article.url.match(/\/article\/(\d+)/);
      if (urlMatch) {
        console.log('🔗 Extracted article ID from URL:', urlMatch[1]);
        return parseInt(urlMatch[1], 10);
      } else {
        console.warn('⚠️ Could not extract article ID from URL pattern:', article.url);
      }
    }
    
    // Default article ID for testing - you might want to handle this differently
    console.warn('⚠️ No article ID found in storage or URL, using default ID for testing');
    return 5598;
  };

  // Handle sending a new message/comment
  const handleSendMessage = async (message: string, thoughtId?: string) => {
    if (!message.trim()) {
      console.warn('⚠️ Cannot send empty message');
      return;
    }

    const articleId = getArticleId();
    console.log('💬 Sending message:', message, 'to thought:', thoughtId, 'article:', articleId);

    setSendingMessage(true);
    setSendingError(null);

    try {
      // Determine if this is a reply to a specific thought or a new top-level comment
      const isReply = thoughtId && thoughtId !== 'new';
      const parentCommentId = isReply ? parseInt(thoughtId, 10) : undefined;

      const addCommentParams = {
        articleId,
        content: message,
        ...(parentCommentId && { parentCommentId }),
        // Add tagged content as quote if available
        ...(taggedContent?.highlightedText && { quote: taggedContent.highlightedText })
      };

      console.log('📤 Sending comment with params:', addCommentParams);

      const response = await addComment(addCommentParams);
      console.log('✅ Comment sent successfully:', response);

      // Call the original onSendMessage callback for any additional handling
      onSendMessage(message, thoughtId);

      // Refresh the conversation thread to show the new message
      if (isReply && parentCommentId) {
        console.log('🔄 Refreshing conversation thread after new message');
        await fetchConversationThread(thoughtId, parentCommentId);
      } else {
        // If it's a new top-level comment, refresh the entire thought starters list
        console.log('🔄 Refreshing thought starters after new comment');
        await fetchThoughtRoomData(articleId);
      }

    } catch (error) {
      console.error('❌ Failed to send message:', error);
      
      // Show user-friendly error message
      let errorMessage = 'Failed to send message. Please try again.';
      if (error instanceof Error && error.message.includes('authorization token')) {
        errorMessage = 'Authentication required. Please log in to send messages.';
      } else if (error instanceof Error && error.message.includes('401')) {
        errorMessage = 'Authentication expired. Please log in again.';
      }
      
      setSendingError(errorMessage);
      
      // Still call the original callback even if sending failed
      onSendMessage(message, thoughtId);
    } finally {
      setSendingMessage(false);
    }
  };

  // Track the last fetched article ID to detect changes
  const [lastFetchedArticleId, setLastFetchedArticleId] = useState<number | null>(null);

  // Clear data when drawer is closed to ensure fresh data when reopening
  useEffect(() => {
    if (!isOpen) {
      console.log('🚪 Drawer closed - clearing conversation data for fresh start');
      setThoughtStarters([]);
      setConversationDetails({});
      setLoadingConversations({});
      setConversationErrors({});
      setSelectedThoughtId(null);
      setLastFetchedArticleId(null);
    }
  }, [isOpen]);

  // Fetch conversations when drawer opens or when article ID changes
  useEffect(() => {
    console.log('🔄 useEffect triggered:', { isOpen, currentArticleId, article: !!article });
    if (isOpen && (currentArticleId || article)) {
      const articleId = getArticleId();
      console.log('🚀 Triggering fetchThoughtRoomData with articleId:', articleId);
      
      // Check if article ID has changed
      const hasArticleChanged = lastFetchedArticleId !== null && lastFetchedArticleId !== articleId;
      
      if (hasArticleChanged) {
        console.log('📄 Article changed from', lastFetchedArticleId, 'to', articleId, '- clearing existing data');
        // Clear existing data when article changes
        setThoughtStarters([]);
        setConversationDetails({});
        setLoadingConversations({});
        setConversationErrors({});
        setSelectedThoughtId(null);
      }
      
      // Fetch if we don't have data, article changed, or not currently loading
      if (thoughtStarters.length === 0 || hasArticleChanged || !isLoadingThoughts) {
        setLastFetchedArticleId(articleId);
        fetchThoughtRoomData(articleId);
      } else {
        console.log('⏭️ Skipping fetch - data already loaded or currently loading');
      }
    }
  }, [isOpen, currentArticleId]); // Removed 'article' dependency to prevent multiple calls

  // Update thought starters when conversation states change
  useEffect(() => {
    if (thoughtStarters.length > 0) {
      console.log('🔄 Updating thought starters with conversation states');
      const enhancedThoughts = thoughtStarters.map(thought => ({
        ...thought,
        isLoadingConversation: loadingConversations[thought.id] || false,
        conversationError: conversationErrors[thought.id] || null,
        conversationDetails: conversationDetails[thought.id] || null,
        hasLoadedConversation: !!conversationDetails[thought.id]
      }));
      
      // Only update if there's actually a change to avoid infinite loops
      const hasChanges = enhancedThoughts.some((thought, index) => {
        const current = thoughtStarters[index];
        return (
          thought.isLoadingConversation !== current.isLoadingConversation ||
          thought.conversationError !== current.conversationError ||
          thought.hasLoadedConversation !== current.hasLoadedConversation
        );
      });
      
      if (hasChanges) {
        console.log('📊 Found changes in conversation states, updating thought starters');
        setThoughtStarters(enhancedThoughts);
      }
    }
  }, [loadingConversations, conversationErrors, conversationDetails, lastFetchedArticleId]);

  // Set initial selected thought ID when thought starters are loaded
  useEffect(() => {
    if (thoughtStarters.length > 0 && !selectedThoughtId) {
      const firstThoughtId = thoughtStarters[0]?.id;
      if (firstThoughtId) {
        console.log('🎯 Setting initial selected thought ID:', firstThoughtId);
        setSelectedThoughtId(firstThoughtId);
        
        // Auto-load conversation for the first thought if not already loaded
        const parentCommentId = parseInt(firstThoughtId, 10);
        if (!conversationDetails[firstThoughtId] && !loadingConversations[firstThoughtId] && !isNaN(parentCommentId)) {
          console.log('🚀 Auto-loading conversation for first thought');
          fetchConversationThread(firstThoughtId, parentCommentId);
        }
      }
    }
  }, [thoughtStarters, selectedThoughtId, conversationDetails, loadingConversations]);

  // Detect side panel width dynamically and calculate responsive drawer size
  useEffect(() => {
    const updateResponsiveSize = () => {
      const viewportWidth = window.innerWidth;
      const isMobileView = viewportWidth <= 768;
      
      setIsMobile(isMobileView);
      
      // Find the side panel element
      const sidePanel = document.querySelector('aside') || 
                       document.querySelector('.h-full.relative.bg-philonet-background') ||
                       document.querySelector('[data-side-panel]');
      
      if (sidePanel) {
        const rect = sidePanel.getBoundingClientRect();
        setSidePanelWidth(rect.width);
        // For side panel mode: use full width of the side panel
        setDrawerWidth(rect.width);
      } else {
        // Fallback if side panel not found
        setDrawerWidth(isMobileView ? Math.min(viewportWidth - 16, 400) : 400);
      }
    };

    // Initial detection
    updateResponsiveSize();

    // Setup resize observer to track side panel width changes
    const resizeObserver = new ResizeObserver(updateResponsiveSize);
    const sidePanel = document.querySelector('aside') || 
                     document.querySelector('.h-full.relative.bg-philonet-background');
    
    if (sidePanel) {
      resizeObserver.observe(sidePanel);
    }

    // Also listen for window resize
    window.addEventListener('resize', updateResponsiveSize);

    // Cleanup
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateResponsiveSize);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-4"
          style={{ pointerEvents: 'none' }}
        >
          {/* Enhanced Backdrop with Telegram-style simplicity */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-philonet-black bg-opacity-60"
            style={{ 
              backdropFilter: 'blur(4px)',
              pointerEvents: 'auto' 
            }}
            onClick={onClose}
          />

          {/* Enhanced Drawer with Telegram-inspired clean design */}
          <motion.div
            ref={drawerRef}
            initial={{ 
              opacity: 0,
              scale: 0.96,
              y: 8
            }}
            animate={{ 
              opacity: 1,
              scale: 1,
              y: 0,
              height: isMinimized ? '60px' : 'calc(100vh - 2rem)'
            }}
            exit={{ 
              opacity: 0,
              scale: 0.96,
              y: 8
            }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 200,
              duration: 0.3
            }}
            className={`relative flex flex-col overflow-hidden bg-philonet-background border border-philonet-border ${
              isMobile ? 'rounded-xl mx-2' : 'rounded-lg'
            }`}
            style={{ 
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              width: `${drawerWidth}px`,
              height: isMinimized ? '60px' : 'calc(100vh - 2rem)',
              maxHeight: 'calc(100vh - 2rem)',
              minHeight: isMinimized ? '60px' : '400px',
              pointerEvents: 'auto'
            }}
          >
            {/* Header - Telegram-inspired clean design */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-philonet-border bg-philonet-background">
              <div className="flex items-center gap-3">
                {/* Clean icon without glow effects - Telegram style */}
                <MessageSquare className="w-5 h-5 text-philonet-blue-500" />
                
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-medium text-philonet-text-primary">
                    Conversations
                  </h2>
                  {article && (
                    <>
                      <span className="text-sm text-philonet-text-muted">on</span>
                      {/* Clean article thumbnail - Telegram style */}
                      <div className="w-5 h-5 rounded overflow-hidden bg-philonet-border flex-shrink-0">
                        {article.url ? (
                          <img
                            src={`https://www.google.com/s2/favicons?domain=${new URL(article.url).hostname}&sz=64`}
                            alt="Site favicon"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              if (target.src.includes('google.com')) {
                                target.src = `https://favicon.yandex.net/favicon/${new URL(article.url).hostname}`;
                              } else {
                                target.style.display = 'none';
                                target.nextElementSibling?.classList.remove('hidden');
                              }
                            }}
                          />
                        ) : null}
                        {/* Simple fallback - no gradients */}
                        <div className="w-full h-full bg-philonet-border flex items-center justify-center hidden">
                          <span className="text-xs text-philonet-text-muted">📄</span>
                        </div>
                      </div>
                      
                      <span className="text-sm text-philonet-text-secondary truncate max-w-[160px]">
                        {article.title}
                      </span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Clean control buttons - Telegram style */}
              <div className="flex items-center">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-philonet-border rounded-md transition-colors duration-150"
                  title={isMinimized ? "Maximize" : "Minimize"}
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4 text-philonet-text-muted" />
                  ) : (
                    <Minus className="w-4 h-4 text-philonet-text-muted" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-philonet-border rounded-md transition-colors duration-150 ml-1"
                  title="Close"
                >
                  <X className="w-4 h-4 text-philonet-text-muted" />
                </button>
              </div>
            </div>

            {/* Content Area with Telegram-inspired clean styling */}
            {!isMinimized && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="flex-1 overflow-hidden h-full bg-philonet-background"
              >
                {isLoadingThoughts ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center space-y-3">
                      {/* Clean loading spinner - Telegram style */}
                      <div className="w-8 h-8 border-2 border-philonet-border border-t-philonet-blue-500 rounded-full animate-spin"></div>
                      <span className="text-philonet-text-secondary text-sm">Loading conversations...</span>
                    </div>
                  </div>
                ) : thoughtsError ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="text-center max-w-xs">
                      <div className="w-12 h-12 bg-red-500 bg-opacity-15 rounded-lg flex items-center justify-center mx-auto mb-3">
                        <X className="w-6 h-6 text-red-400" />
                      </div>
                      <p className="text-red-400 mb-4 text-sm leading-relaxed">{thoughtsError}</p>
                      <button 
                        onClick={() => fetchThoughtRoomData(getArticleId())}
                        className="px-4 py-2 bg-philonet-blue-500 hover:bg-philonet-blue-600 rounded-md text-philonet-text-primary text-sm font-medium transition-colors duration-150"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                ) : thoughtStarters.length === 0 ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center max-w-sm px-6">
                      <div className="w-16 h-16 mx-auto mb-4 bg-philonet-blue-500 bg-opacity-10 rounded-full flex items-center justify-center">
                        <MessageSquare className="w-8 h-8 text-philonet-blue-500" />
                      </div>
                      <h3 className="text-lg font-medium text-philonet-text-primary mb-2">
                        No Conversations Yet
                      </h3>
                      <p className="text-philonet-text-secondary mb-4 leading-relaxed">
                        Be the first to start a conversation! Go to the article page and share your thoughts to begin engaging with other readers.
                      </p>
                      <button
                        onClick={onClose}
                        className="px-4 py-2 bg-philonet-blue-500 hover:bg-philonet-blue-600 rounded-md text-white text-sm font-medium transition-colors duration-150"
                      >
                        Go to Article
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col bg-philonet-background">
                    
                    {/* Error notification for message sending */}
                    {sendingError && (
                      <div className="mx-4 mt-2 mb-2 p-3 bg-red-500 bg-opacity-10 border border-red-500 border-opacity-20 rounded-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <X className="w-4 h-4 text-red-400 mr-2" />
                            <span className="text-red-400 text-sm">{sendingError}</span>
                          </div>
                          <button
                            onClick={() => setSendingError(null)}
                            className="text-red-400 hover:text-red-300 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    )}
                    
                    <ConversationRoom
                      thoughtStarters={thoughtStarters}
                      selectedThoughtId={selectedThoughtId || (thoughtStarters.length > 0 ? thoughtStarters[0]?.id : "1")}
                      currentUser={user}
                      messages={
                        // Pass conversation messages for the selected thought
                        selectedThoughtId 
                          ? conversationDetails[selectedThoughtId]?.messages || []
                          : thoughtStarters.length > 0 
                          ? conversationDetails[thoughtStarters[0]?.id]?.messages || []
                          : []
                      }
                      isLoadingMessages={
                        // Show loading if sub-comments are being loaded for the current thought
                        selectedThoughtId 
                          ? loadingConversations[selectedThoughtId] || false
                          : thoughtStarters.length > 0 
                          ? loadingConversations[thoughtStarters[0]?.id] || false
                          : false
                      }
                      messagesError={
                        // Show error if sub-comments failed to load for the current thought
                        selectedThoughtId 
                          ? conversationErrors[selectedThoughtId] || null
                          : thoughtStarters.length > 0 
                          ? conversationErrors[thoughtStarters[0]?.id] || null
                          : null
                      }
                      onSendMessage={(message: string, thoughtId: string) => handleSendMessage(message, thoughtId)}
                      onAskAI={(question: string, thoughtId: string) => onAskAI(question, thoughtId)}
                      onThoughtSelect={(thoughtId: string) => {
                        console.log('🎯 Thought selected:', thoughtId);
                        console.log('📋 Available thought starters:', thoughtStarters);
                        
                        // Set the selected thought ID
                        setSelectedThoughtId(thoughtId);
                        
                        // Find the selected thought starter to get its comment ID
                        const selectedThought = thoughtStarters.find(thought => thought.id === thoughtId);
                        console.log('🔍 Found selected thought:', selectedThought);
                        
                        if (selectedThought) {
                          const parentCommentId = parseInt(selectedThought.id, 10);
                          console.log('🎯 Extracted parent comment ID:', parentCommentId);
                          
                          // Check if we already have this conversation loaded
                          if (!conversationDetails[thoughtId] && !loadingConversations[thoughtId]) {
                            console.log('🚀 Fetching conversation thread for new selection');
                            fetchConversationThread(thoughtId, parentCommentId);
                          } else if (conversationDetails[thoughtId]) {
                            console.log('✅ Conversation already loaded for:', thoughtId);
                          } else {
                            console.log('⏳ Conversation currently loading for:', thoughtId);
                          }
                        } else {
                          console.warn('⚠️ Could not find thought starter with ID:', thoughtId);
                        }
                        
                        // Call the original onThoughtSelect if provided
                        if (onThoughtSelect) {
                          onThoughtSelect(thoughtId);
                        }
                      }}
                    />
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConversationDrawer;
