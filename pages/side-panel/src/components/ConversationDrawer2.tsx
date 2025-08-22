import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Maximize2, MessageSquare } from 'lucide-react';
import ConversationRoom from './ConversationRoom';
import { thoughtRoomsAPI } from '../services/thoughtRoomsApi';

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
  
  const drawerRef = useRef<HTMLDivElement>(null);

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
      
      const transformedThoughts = response.comments.map(comment => 
        thoughtRoomsAPI.transformCommentToThoughtStarter(comment)
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
      const conversationData = await thoughtRoomsAPI.fetchConversationThread(articleId, parentCommentId, 20);
      
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
      }
    }
    
    // Default article ID for testing - you might want to handle this differently
    console.warn('⚠️ No article ID found in storage or URL, using default ID for testing');
    return 5598;
  };

  // Fetch conversations when drawer opens or when article ID changes
  useEffect(() => {
    console.log('🔄 useEffect triggered:', { isOpen, currentArticleId, article: !!article });
    if (isOpen && (currentArticleId || article)) {
      const articleId = getArticleId();
      console.log('🚀 Triggering fetchThoughtRoomData with articleId:', articleId);
      
      // Only fetch if we don't already have data or if the article ID changed
      if (thoughtStarters.length === 0 || !isLoadingThoughts) {
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
  }, [loadingConversations, conversationErrors, conversationDetails]);

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
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0"
            style={{ 
              backgroundColor: 'rgba(0, 0, 0, 1)', // Fully opaque black
              pointerEvents: 'auto' 
            }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            initial={{ 
              opacity: 0,
              scale: 0.95
            }}
            animate={{ 
              opacity: 1,
              scale: 1,
              height: isMinimized ? '60px' : 'calc(100vh - 2rem)'
            }}
            exit={{ 
              opacity: 0,
              scale: 0.95
            }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 200,
              opacity: { duration: 0.2 },
              scale: { duration: 0.2 }
            }}
            className={`relative border-2 shadow-2xl flex flex-col overflow-hidden ${
              isMobile ? 'rounded-2xl mx-2' : 'rounded-xl'
            }`}
            style={{ 
              backgroundColor: '#0b0b0b', // philonet-card color
              borderColor: '#262626', // philonet-border color
              width: `${drawerWidth}px`,
              height: isMinimized ? '60px' : 'calc(100vh - 2rem)',
              maxHeight: 'calc(100vh - 2rem)',
              minHeight: isMinimized ? '60px' : '400px',
              pointerEvents: 'auto'
            }}
          >
            {/* Header */}
            <div 
              className="flex items-center justify-between p-3 border-b-2"
              style={{ 
                backgroundColor: '#0b0b0b', // philonet-card color 
                borderColor: '#262626' // philonet-border color
              }}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">💭</span>
                <h2 className="text-lg font-semibold text-philonet-text">
                  Conversations
                </h2>
                {article && (
                  <span className="text-sm text-philonet-text-secondary truncate max-w-[200px]">
                    • {article.title}
                  </span>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-2 hover:bg-philonet-border rounded-lg transition-colors"
                  title={isMinimized ? "Maximize" : "Minimize"}
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4 text-philonet-text-secondary" />
                  ) : (
                    <Minus className="w-4 h-4 text-philonet-text-secondary" />
                  )}
                </button>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-philonet-border rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4 text-philonet-text-secondary" />
                </button>
              </div>
            </div>

            {/* Content */}
            {!isMinimized && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="flex-1 overflow-hidden h-full"
              >
                {isLoadingThoughts ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-400"></div>
                    <span className="ml-3 text-gray-400">Loading conversations...</span>
                  </div>
                ) : thoughtsError ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-red-400 text-center">
                      <p>{thoughtsError}</p>
                      <button 
                        onClick={() => fetchThoughtRoomData(getArticleId())}
                        className="mt-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white text-sm"
                      >
                        Retry
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    {/* Main loading progress section */}
                    <div className="p-3 border-b border-gray-600 bg-gray-900 text-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          {thoughtStarters.length > 0 ? (
                            <span className="text-green-400">✅ {thoughtStarters.length} discussions loaded</span>
                          ) : (
                            <span className="text-gray-400">📋 No discussions found</span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">
                          {Object.keys(conversationDetails).length > 0 && (
                            <span>{Object.keys(conversationDetails).length} conversations loaded</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Debug section for conversation state */}
                    {(Object.keys(loadingConversations).some(key => loadingConversations[key]) || 
                      Object.keys(conversationDetails).length > 0 || 
                      Object.keys(conversationErrors).length > 0) && (
                      <div className="p-4 border-b border-gray-600 bg-gray-800 text-sm">
                        {Object.entries(loadingConversations).filter(([_, isLoading]) => isLoading).map(([thoughtId]) => (
                          <div key={thoughtId} className="text-blue-400">🔄 Loading conversation for thought {thoughtId}...</div>
                        ))}
                        {Object.entries(conversationErrors).map(([thoughtId, error]) => (
                          <div key={thoughtId} className="text-red-400">❌ {error} (thought {thoughtId})</div>
                        ))}
                        {Object.entries(conversationDetails).map(([thoughtId, details]) => (
                          <div key={thoughtId} className="text-green-400">
                            ✅ Loaded {details.messages?.length || 0} messages for thought {thoughtId}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Debug test button */}
                    {thoughtStarters.length > 0 && (
                      <div className="p-2 border-b border-gray-600 bg-gray-700 text-xs flex gap-2">
                        <button
                          onClick={() => {
                            const firstThought = thoughtStarters[0];
                            if (firstThought) {
                              console.log('🧪 Testing conversation fetch for first thought:', firstThought);
                              fetchConversationThread(firstThought.id, parseInt(firstThought.id, 10));
                            }
                          }}
                          className="px-2 py-1 bg-blue-600 hover:bg-blue-500 rounded text-white text-xs"
                        >
                          🧪 Test Sub-Comments API
                        </button>
                        <button
                          onClick={() => {
                            console.log('🔄 Refreshing discussions...');
                            const articleId = getArticleId();
                            fetchThoughtRoomData(articleId);
                          }}
                          className="px-2 py-1 bg-green-600 hover:bg-green-500 rounded text-white text-xs"
                        >
                          🔄 Refresh Discussions
                        </button>
                      </div>
                    )}
                    
                    <ConversationRoom
                      thoughtStarters={thoughtStarters.length > 0 ? thoughtStarters : []}
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
                      onSendMessage={(message: string, thoughtId: string) => onSendMessage(message, thoughtId)}
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
