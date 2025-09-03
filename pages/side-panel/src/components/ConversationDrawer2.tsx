import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageSquare } from 'lucide-react';
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
      
      console.log('✅ Successfully fetched comments:', {
        count: response.comments?.length || 0,
        hasComments: !!response.comments
      });
      
      // Get current user ID for ownership detection
      const currentUserId = await getCurrentUserId();
      console.log('👤 Current user ID for thought starter ownership detection:', currentUserId);
      
      const transformedThoughts = response.comments.map(comment => 
        thoughtRoomsAPI.transformCommentToThoughtStarter(comment, currentUserId || undefined)
      );
      
      console.log('🔄 Transformed thoughts:', {
        count: transformedThoughts.length,
        firstThoughtId: transformedThoughts[0]?.id,
        hasTransformed: transformedThoughts.length > 0
      });
      setThoughtStarters(transformedThoughts);
      
      // Log the structure of the first thought starter for debugging
      if (transformedThoughts.length > 0) {
        console.log('📋 First thought starter structure - id:', transformedThoughts[0].id, 'title:', transformedThoughts[0].title?.substring(0, 50) + '...');
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
      
      console.log('✅ Successfully fetched conversation thread:', {
        messagesCount: conversationData.messages?.length || 0,
        hasMore: conversationData.hasMore,
        parentCommentId: conversationData.parentCommentId
      });
      
      // First, validate and transform messages to ensure they have the correct structure
      const validatedMessages = conversationData.messages.map((message: any, index: number) => {
        // Check if this is a raw API object that hasn't been transformed
        if (message.message_id || message.user_name || message.created_at) {
          console.warn('⚠️ Found untransformed API message object, transforming:', {
            message_id: message.message_id,
            user_name: message.user_name,
            content: message.content?.substring(0, 50) + '...'
          });
          
          // Transform raw API object to expected message format
          return {
            id: message.message_id?.toString() || message.id?.toString() || `msg-${index}`,
            text: message.content || message.text || '',
            author: message.user_name || message.author || 'Unknown User',
            timestamp: message.created_at || message.timestamp || new Date().toISOString(),
            isOwn: false, // We'll set this correctly later if we have user info
            type: message.title ? 'ai-response' as const : 'text' as const,
            avatar: message.user_picture || message.avatar || undefined,
            isRead: true,
            status: 'read' as const,
            reactions: [],
            replyToMessageId: message.reply_message_id?.toString() || message.replyToMessageId,
            replyToContent: message.reply_message || message.replyToContent,
            replyToAuthor: message.reply_author || message.replyToAuthor,
            quote: message.quote,
            title: message.title || undefined
          };
        }
        
        // Message is already in the correct format, return as-is
        return message;
      });

      // Filter out potentially auto-generated AI responses that follow normal messages too closely
      const filteredMessages = validatedMessages.filter((message: any, index: number) => {
        // If this is an AI message, check if it was created immediately after a normal message
        if (message.author === 'AI Assistant' || message.type === 'ai-response') {
          const messageTime = new Date(message.timestamp).getTime();
          
          // Look for recent normal messages from users (not AI) within the last 2 minutes
          const recentNormalMessages = validatedMessages.filter((prevMsg: any, prevIndex: number) => 
            prevIndex < index && // Previous message
            prevMsg.author !== 'AI Assistant' && 
            prevMsg.type !== 'ai-response' &&
            new Date(prevMsg.timestamp).getTime() > messageTime - 120000 // Within 2 minutes (increased from 30 seconds)
          );
          
          // Also check for AI responses that were created too quickly after ANY user message
          const hasVeryRecentUserActivity = validatedMessages.some((prevMsg: any, prevIndex: number) => 
            prevIndex < index && // Previous message
            prevMsg.author !== 'AI Assistant' && 
            prevMsg.type !== 'ai-response' &&
            new Date(prevMsg.timestamp).getTime() > messageTime - 10000 // Within 10 seconds
          );
          
          if (recentNormalMessages.length > 0 || hasVeryRecentUserActivity) {
            console.warn('🚫 Filtering out potentially auto-generated AI response:', {
              aiMessageId: message.id,
              aiText: message.text?.substring(0, 50) + '...',
              aiTimestamp: message.timestamp,
              hasVeryRecentUserActivity,
              recentNormalMessages: recentNormalMessages.map((m: any) => ({
                id: m.id,
                author: m.author,
                text: m.text?.substring(0, 30) + '...',
                timestamp: m.timestamp
              }))
            });
            return false; // Filter out this AI message
          }
        }
        return true; // Keep all other messages
      });
      
      console.log('📝 Filtered messages:', {
        original: conversationData.messages.length,
        filtered: filteredMessages.length,
        removed: conversationData.messages.length - filteredMessages.length
      });
      
      // Final validation to ensure all messages have the required fields
      const finalValidatedMessages = filteredMessages.map((message: any, index: number) => {
        if (!message.id || !message.text || !message.author || !message.timestamp) {
          console.error('❌ Invalid message structure detected:', {
            index,
            id: message.id,
            text: message.text,
            author: message.author,
            timestamp: message.timestamp,
            fullMessage: message
          });
          
          // Return a safe fallback message
          return {
            id: message.id || `fallback-${index}`,
            text: message.text || message.content || 'Message content unavailable',
            author: message.author || message.user_name || 'Unknown User',
            timestamp: message.timestamp || message.created_at || new Date().toISOString(),
            isOwn: false,
            type: 'text' as const,
            avatar: message.avatar || message.user_picture,
            isRead: true,
            status: 'read' as const,
            reactions: []
          };
        }
        return message;
      });
      
      // Store conversation details for this specific thought
      setConversationDetails(prev => ({
        ...prev,
        [thoughtId]: {
          parentCommentId,
          messages: finalValidatedMessages, // Use fully validated messages
          hasMore: conversationData.hasMore,
          loadedAt: new Date().toISOString()
        }
      }));
      
      console.log('📊 Updated conversation details for thought:', thoughtId, 'with', finalValidatedMessages.length, 'messages');
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
  const handleSendMessage = async (message: string, thoughtId?: string, replyToMessageId?: string) => {
    if (!message.trim()) {
      console.warn('⚠️ Cannot send empty message');
      return;
    }

    const articleId = getArticleId();
    console.log('💬 Sending normal message (not AI):', message, 'to thought:', thoughtId, 'article:', articleId);

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
        ...(replyToMessageId && { replyMessageId: replyToMessageId }), // Keep as string, don't parse as int
        // Add tagged content as quote if available
        ...(taggedContent?.highlightedText && { quote: taggedContent.highlightedText })
        // Note: Server may auto-generate AI responses, but client-side filtering will handle this
      };

      console.log('📤 Sending comment with params (normal message):', addCommentParams);

      const response = await addComment(addCommentParams);
      console.log('✅ Comment sent successfully (normal message):', {
        success: !!response,
        commentId: (response as any)?.comment_id || (response as any)?.id || 'unknown'
      });

      // Call the original onSendMessage callback for any additional handling
      onSendMessage(message, thoughtId);

      // Delay the refresh to avoid conflicts with optimistic updates in ConversationRoom
      console.log('⏳ Delaying conversation refresh to avoid conflicts with optimistic updates...');
      setTimeout(async () => {
        try {
          // Refresh the conversation thread to show the new message
          if (isReply && parentCommentId) {
            console.log('🔄 Refreshing conversation thread after normal message (delayed)');
            await fetchConversationThread(thoughtId, parentCommentId);
          } else {
            // If it's a new top-level comment, refresh the entire thought starters list
            console.log('🔄 Refreshing thought starters after normal comment (delayed)');
            await fetchThoughtRoomData(articleId);
          }
        } catch (refreshError) {
          console.error('❌ Error during delayed refresh:', refreshError);
        }
      }, 2000); // 2 second delay to allow optimistic updates to complete

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

  // Handle AI questions - separate from normal messages
  const handleAskAI = async (question: string, thoughtId?: string) => {
    if (!question.trim()) {
      console.warn('⚠️ Cannot send empty AI question');
      return;
    }

    const articleId = getArticleId();
    console.log('🤖 Asking AI question:', question, 'to thought:', thoughtId, 'article:', articleId);

    // Call the original onAskAI callback - this should trigger the AI logic in ConversationRoom
    onAskAI(question, thoughtId);

    // Note: No immediate refresh needed here as ConversationRoom handles AI responses
    // and will call the parent onSendMessage handler when appropriate
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
              y: 0
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
            className={`relative flex flex-col bg-philonet-background border border-philonet-border ${
              isMobile ? 'rounded-xl mx-2' : 'rounded-lg'
            } overflow-hidden`}
            style={{ 
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
              width: `${drawerWidth}px`,
              height: 'calc(100vh - 2rem)',
              maxHeight: 'calc(100vh - 2rem)',
              minHeight: '400px',
              pointerEvents: 'auto'
            }}
          >
            {/* Content Area with clean styling - now full height */}
            <AnimatePresence mode="wait">
              <motion.div
                key="content"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ 
                  duration: 0.2,
                  ease: "easeInOut"
                }}
                className="flex-1 overflow-hidden bg-philonet-background"
                style={{ minHeight: 0 }}
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
                      thoughtStarters={
                        // Validate thoughtStarters to prevent React error #31
                        thoughtStarters.map((thought, index) => {
                          // Check if this is a raw API object that hasn't been transformed
                          if (thought.message_id || thought.user_name || thought.created_at) {
                            console.warn('⚠️ Found untransformed thought starter API object, transforming:', {
                              message_id: thought.message_id,
                              user_name: thought.user_name,
                              content: thought.content?.substring(0, 50) + '...'
                            });
                            
                            // Transform raw API object to expected thought starter format
                            return {
                              id: thought.message_id?.toString() || thought.comment_id?.toString() || thought.id || `thought-${index}`,
                              title: thought.content || thought.title || 'Untitled Thought',
                              description: thought.content || thought.description || '',
                              category: 'general',
                              tags: [],
                              lastActivity: thought.created_at || thought.lastActivity || new Date().toISOString(),
                              messageCount: 0,
                              participants: 1,
                              isActive: false,
                              isPinned: false,
                              hasUnread: false,
                              unreadCount: 0,
                              thumbnail: thought.user_picture,
                              thoughtBody: thought.content || '',
                              author: {
                                id: thought.user_id?.toString() || 'unknown',
                                name: thought.user_name || 'Anonymous',
                                avatar: thought.user_picture,
                                role: 'user'
                              },
                              reactions: {
                                likes: 0,
                                hearts: 0,
                                stars: 0,
                                thumbsUp: 0
                              },
                              participantsList: [],
                              readStatus: {
                                totalParticipants: 1,
                                readBy: 0,
                                unreadBy: 1
                              },
                              taggedContent: thought.quote ? {
                                sourceText: thought.quote,
                                sourceUrl: '',
                                highlightedText: thought.quote
                              } : undefined
                            };
                          }
                          
                          // Ensure reactions object is properly structured
                          if (thought.reactions && typeof thought.reactions === 'object') {
                            // Check if reactions contains raw API data
                            if (thought.reactions.message_id || thought.reactions.user_name) {
                              console.warn('⚠️ Found raw API data in thought.reactions, fixing:', thought.reactions);
                              thought.reactions = {
                                likes: 0,
                                hearts: 0,
                                stars: 0,
                                thumbsUp: 0
                              };
                            }
                          }
                          
                          // Thought is already in the correct format, return as-is
                          return thought;
                        }).filter(Boolean) // Remove any null/undefined entries
                      }
                      selectedThoughtId={selectedThoughtId || (thoughtStarters.length > 0 ? thoughtStarters[0]?.id : "1")}
                      currentUser={user}
                      messages={
                        // Pass conversation messages for the selected thought with final validation
                        (() => {
                          const currentThoughtId = selectedThoughtId || (thoughtStarters.length > 0 ? thoughtStarters[0]?.id : null);
                          const rawMessages = currentThoughtId 
                            ? conversationDetails[currentThoughtId]?.messages || []
                            : [];
                          
                          // Final validation to prevent React error #31
                          return rawMessages.map((msg: any, index: number) => {
                            // Check if this is still a raw API object that somehow wasn't transformed
                            if (!msg || typeof msg !== 'object') {
                              console.error('❌ Invalid message type detected:', typeof msg, msg);
                              return {
                                id: `error-${index}`,
                                text: 'Message unavailable',
                                author: 'System',
                                timestamp: new Date().toISOString(),
                                isOwn: false,
                                type: 'text' as const,
                                isRead: true,
                                status: 'read' as const,
                                reactions: []
                              };
                            }
                            
                            // Ensure all required fields exist
                            const validatedMsg = {
                              id: msg.id || msg.message_id?.toString() || `msg-${index}`,
                              text: msg.text || msg.content || '',
                              author: msg.author || msg.user_name || 'Unknown User',
                              timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
                              isOwn: Boolean(msg.isOwn),
                              type: msg.type || (msg.title ? 'ai-response' as const : 'text' as const),
                              avatar: msg.avatar || msg.user_picture,
                              isRead: Boolean(msg.isRead !== false), // Default to true
                              status: msg.status || 'read' as const,
                              reactions: Array.isArray(msg.reactions) ? msg.reactions : [],
                              replyToMessageId: msg.replyToMessageId || msg.reply_message_id?.toString(),
                              replyToContent: msg.replyToContent || msg.reply_message,
                              replyToAuthor: msg.replyToAuthor || msg.reply_author,
                              quote: msg.quote,
                              title: msg.title
                            };
                            
                            // Double-check that we have valid strings for required fields
                            if (!validatedMsg.id || !validatedMsg.author || !validatedMsg.timestamp) {
                              console.error('❌ Message missing required fields after validation:', validatedMsg);
                              validatedMsg.id = validatedMsg.id || `fallback-${index}`;
                              validatedMsg.author = validatedMsg.author || 'Unknown User';
                              validatedMsg.timestamp = validatedMsg.timestamp || new Date().toISOString();
                            }
                            
                            return validatedMsg;
                          }).filter(Boolean); // Remove any null/undefined entries
                        })()
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
                      // Add API context props for AI assistant
                      articleId={getArticleId()}
                      parentCommentId={(() => {
                        const currentThoughtId = selectedThoughtId || (thoughtStarters.length > 0 ? thoughtStarters[0]?.id : undefined);
                        return currentThoughtId ? parseInt(currentThoughtId, 10) : undefined;
                      })()}
                      articleContent={article?.content || ''}
                      onSendMessage={(message: string, thoughtId: string, replyToMessageId?: string) => handleSendMessage(message, thoughtId, replyToMessageId)}
                      onAskAI={(question: string, thoughtId: string) => handleAskAI(question, thoughtId)}
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
                      onClose={onClose} // Pass the drawer close function to ConversationRoom
                    />
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ConversationDrawer;
