import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MoreVertical, 
  Send, 
  Smile, 
  MessageSquare, 
  Users, 
  Clock, 
  CheckCheck, 
  Check,
  UserPlus,
  Archive,
  Pin,
  Volume2,
  UserRound,
  Bot,
  Sparkles,
  Tag,
  Reply,
  Heart,
  ThumbsUp,
  Star,
  Eye,
  EyeOff,
  ExternalLink,
  Quote,
  Circle,
  Dot,
  Activity,
  TrendingUp,
  ArrowLeft,
  CornerUpLeft,
  X,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Type,
  Settings
} from 'lucide-react';
import { cn } from '@extension/ui';
import { Button, Textarea } from './ui';
import { reactToComment, queryAI, addComment } from '../services/thoughtRoomsApi';

interface ThoughtStarter {
  id: string;
  title: string;
  description: string;
  category: string;
  tags: string[];
  lastActivity: string;
  messageCount: number;
  participants: number;
  isActive?: boolean;
  isPinned?: boolean;
  hasUnread?: boolean;
  unreadCount?: number;
  lastMessage?: {
    text: string;
    author: string;
    timestamp: string;
    isRead: boolean;
  };
  thumbnail?: string;
  // Enhanced fields for comprehensive thought display
  taggedContent?: {
    sourceText: string;
    sourceUrl: string;
    highlightedText: string;
  };
  thoughtBody?: string;
  author?: {
    id: string;
    name: string;
    avatar?: string;
    role?: string;
  };
  reactions?: {
    likes: number;
    hearts: number;
    stars: number;
    thumbsUp: number;
  };
  participantsList?: Array<{
    id: string;
    name: string;
    avatar?: string;
    isOnline?: boolean;
    lastSeen?: string;
  }>;
  readStatus?: {
    totalParticipants: number;
    readBy: number;
    unreadBy: number;
  };
}

interface Message {
  id: string;
  text: string;
  author: string;
  timestamp: string;
  isOwn: boolean;
  type: 'text' | 'ai-response' | 'system' | 'thought-starter';
  replyTo?: string;
  replyToMessageId?: string; // Add this for referencing specific message IDs
  replyToContent?: string; // Add this to show preview of replied message
  replyToAuthor?: string; // Add this to show who was replied to
  reactions?: { emoji: string; count: number; users: string[] }[];
  avatar?: string;
  isRead?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
  title?: string; // Add title field for AI assistant responses
  // API integration fields
  comment_id?: number; // The actual comment ID from the API
  articleId?: number; // The article ID for API calls
  parentCommentId?: number; // The parent comment ID for API calls
}

interface ConversationRoomProps {
  thoughtStarters?: ThoughtStarter[];
  selectedThoughtId?: string;
  currentUser?: {
    id: string;
    name: string;
    avatar?: string;
  };
  messages?: Message[]; // Add external messages prop
  isLoadingMessages?: boolean; // Add loading state for messages
  messagesError?: string | null; // Add error state for messages
  // API context for reactions
  articleId?: number; // Article ID for API calls
  parentCommentId?: number; // Parent comment ID for API calls
  articleContent?: string; // Article content for AI queries
  articleTitle?: string; // Article title for display
  onThoughtSelect: (thoughtId: string) => void;
  onSendMessage: (message: string, thoughtId: string, replyToMessageId?: string) => void;
  onAskAI: (question: string, thoughtId: string) => void;
  onClose?: () => void; // Add close function prop for closing the entire drawer
}

/* 
 * REACT ERROR #31 PREVENTION SYSTEM
 * 
 * This system prevents "React Error #31: Objects are not valid as a React child" by:
 * 1. validateAndTransformMessage() - Transforms raw API objects to proper Message format
 * 2. validateThoughtStarter() - Validates and cleans thought starter objects  
 * 3. Comprehensive filtering in JSX render with type guards
 * 4. Detailed logging for debugging raw API object detection
 * 
 * The error occurs when raw API objects with keys like 'message_id', 'user_name', 
 * 'created_at', 'original_content' get passed directly to React components.
 * This system catches and transforms these objects before they reach JSX.
 */

// Validation and transformation function to prevent React error #31
const validateAndTransformMessage = (message: any): Message | null => {
  if (!message || typeof message !== 'object') {
    console.error('🚫 validateAndTransformMessage: Invalid message object:', message);
    return null;
  }

  // Check if this is a raw API object that needs transformation
  if (message.message_id || message.user_name || message.created_at || message.original_content) {
    console.log('🔄 validateAndTransformMessage: Transforming raw API object to Message format:', {
      message_id: message.message_id,
      user_name: message.user_name,
      created_at: message.created_at,
      hasOriginalContent: !!message.original_content
    });
    
    // Transform raw API object to Message format
    try {
      const transformedMessage: Message = {
        id: String(message.message_id || message.comment_id || message.id || `temp-${Date.now()}`),
        text: message.content || message.original_content || message.text || 'No content',
        author: message.user_name || message.author || 'Unknown',
        timestamp: message.created_at || message.timestamp || new Date().toISOString(),
        isOwn: false, // Default to not own for external messages
        type: message.type || 'text',
        // Preserve any additional fields with proper validation
        replyToMessageId: message.replyToMessageId,
        replyToContent: typeof message.replyToContent === 'object' && message.replyToContent 
          ? ((message.replyToContent as any).content || (message.replyToContent as any).text || JSON.stringify(message.replyToContent))
          : (message.replyToContent || undefined),
        replyToAuthor: typeof message.replyToAuthor === 'object' && message.replyToAuthor
          ? ((message.replyToAuthor as any).name || (message.replyToAuthor as any).user_name || 'Someone')
          : (message.replyToAuthor || undefined),
        reactions: message.reactions,
        avatar: message.user_picture || message.avatar,
        comment_id: message.message_id || message.comment_id,
        articleId: message.articleId,
        parentCommentId: message.parentCommentId
      };
      
      console.log('✅ validateAndTransformMessage: Successfully transformed API object to Message:', {
        id: transformedMessage.id,
        author: transformedMessage.author,
        textPreview: transformedMessage.text?.substring(0, 50) + '...'
      });
      
      return transformedMessage;
    } catch (error) {
      console.error('❌ validateAndTransformMessage: Failed to transform API object:', error, message);
      return null;
    }
  }

  // Check if it's already a valid Message object
  if (message.id && message.text && message.author && message.timestamp) {
    // This is already a properly formatted Message, but validate nested objects
    console.log('✅ validateAndTransformMessage: Message already properly formatted:', {
      id: message.id,
      author: message.author,
      textPreview: message.text?.substring(0, 50) + '...'
    });
    
    // Fix any object values in reply fields that should be strings
    const cleanedMessage: Message = {
      ...message,
      replyToContent: typeof message.replyToContent === 'object' && message.replyToContent 
        ? ((message.replyToContent as any).content || (message.replyToContent as any).text || JSON.stringify(message.replyToContent))
        : message.replyToContent,
      replyToAuthor: typeof message.replyToAuthor === 'object' && message.replyToAuthor
        ? ((message.replyToAuthor as any).name || (message.replyToAuthor as any).user_name || 'Someone')
        : message.replyToAuthor,
    };
    
    if (cleanedMessage.replyToContent !== message.replyToContent || cleanedMessage.replyToAuthor !== message.replyToAuthor) {
      console.log('🔧 validateAndTransformMessage: Fixed object values in reply fields:', {
        originalReplyToContent: typeof message.replyToContent,
        cleanedReplyToContent: typeof cleanedMessage.replyToContent,
        originalReplyToAuthor: typeof message.replyToAuthor,
        cleanedReplyToAuthor: typeof cleanedMessage.replyToAuthor
      });
    }
    
    return cleanedMessage as Message;
  }

  console.error('🚫 validateAndTransformMessage: Message missing required fields:', {
    id: message.id,
    text: message.text,
    author: message.author,
    timestamp: message.timestamp,
    hasMessageId: !!message.message_id,
    hasUserName: !!message.user_name,
    hasCreatedAt: !!message.created_at,
    messageKeys: Object.keys(message)
  });
  
  return null;
};

const ConversationRoom: React.FC<ConversationRoomProps> = ({
  thoughtStarters = [],
  selectedThoughtId,
  currentUser = { id: 'user1', name: 'You', avatar: undefined },
  messages: externalMessages = [], // Add external messages prop
  isLoadingMessages = false, // Add loading state prop
  messagesError = null, // Add error state prop
  articleId, // Add API context props
  parentCommentId, // Add API context props
  articleContent = '', // Add article content for AI queries
  articleTitle, // Add article title for display
  onThoughtSelect,
  onSendMessage,
  onAskAI,
  onClose // Add close function prop
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [inputMode, setInputMode] = useState<'message' | 'ai'>('message');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isHeaderShrunk, setIsHeaderShrunk] = useState(false);
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(false);
  const [isReferenceVisible, setIsReferenceVisible] = useState(true);
  const [isLeftSidebarHovered, setIsLeftSidebarHovered] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputAreaRef = useRef<HTMLDivElement>(null);

  // Available reactions - organized by category
  const reactionCategories = {
    popular: ['👍', '❤️', '😂', '😮', '😢', '😡'],
    faces: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '🥲', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '🥸', '😎', '🤓', '🧐'],
    hands: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👏', '🙌', '👐', '🤲', '🤝', '🙏'],
    hearts: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝'],
    animals: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🙈', '🙉', '🙊'],
    objects: ['💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '👁️‍🗨️', '🗨️', '🗯️', '💭', '💤', '🔥', '⭐', '🌟', '✨', '⚡', '☄️']
  };

  const [selectedReactionCategory, setSelectedReactionCategory] = useState<keyof typeof reactionCategories | 'recent'>('popular');
  const [recentEmojis, setRecentEmojis] = useState<string[]>([]);
  const [showSendEffect, setShowSendEffect] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, emoji: string}>>([]);
  const [reactionError, setReactionError] = useState<string | null>(null);
  const [successPulse, setSuccessPulse] = useState<string | null>(null);

  // Font sizing system - WhatsApp-like font preferences
  type FontSize = 'small' | 'medium' | 'large' | 'extra-large';
  const [fontSize, setFontSize] = useState<FontSize>('medium');
  
  // Font size configurations similar to WhatsApp
  const fontSizeConfig = {
    small: {
      messageText: 'text-sm', // 14px
      userName: 'text-xs', // 12px
      timestamp: 'text-xs', // 12px
      thoughtBody: 'text-xs', // 12px
      aiResponse: 'text-sm', // 14px
      headerTitle: 'text-base', // 16px
      leading: 'leading-normal', // 1.5
    },
    medium: {
      messageText: 'text-base', // 16px (default)
      userName: 'text-sm', // 14px
      timestamp: 'text-xs', // 12px
      thoughtBody: 'text-sm', // 14px
      aiResponse: 'text-base', // 16px
      headerTitle: 'text-lg', // 18px
      leading: 'leading-relaxed', // 1.6
    },
    large: {
      messageText: 'text-lg', // 18px
      userName: 'text-base', // 16px
      timestamp: 'text-sm', // 14px
      thoughtBody: 'text-base', // 16px
      aiResponse: 'text-lg', // 18px
      headerTitle: 'text-xl', // 20px
      leading: 'leading-relaxed', // 1.6
    },
    'extra-large': {
      messageText: 'text-xl', // 20px
      userName: 'text-lg', // 18px
      timestamp: 'text-base', // 16px
      thoughtBody: 'text-lg', // 18px
      aiResponse: 'text-xl', // 20px
      headerTitle: 'text-2xl', // 24px
      leading: 'leading-loose', // 1.75
    }
  };

  // Helper to get font class
  const getFontClass = (element: keyof typeof fontSizeConfig.medium): string => {
    return fontSizeConfig[fontSize][element];
  };

  // Save font preference to localStorage
  useEffect(() => {
    const savedFontSize = localStorage.getItem('philonet-font-size') as FontSize;
    if (savedFontSize && fontSizeConfig[savedFontSize]) {
      setFontSize(savedFontSize);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('philonet-font-size', fontSize);
    
    // Add a subtle flash animation to indicate font size change
    const fontButton = document.querySelector('[title*="Text size"]');
    if (fontButton) {
      fontButton.classList.add('animate-pulse');
      setTimeout(() => {
        fontButton.classList.remove('animate-pulse');
      }, 1000);
    }
  }, [fontSize]);

  // Keyboard shortcuts for font size changes (Ctrl + Plus/Minus)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && (e.key === '=' || e.key === '+')) {
        e.preventDefault();
        const sizes: FontSize[] = ['small', 'medium', 'large', 'extra-large'];
        const currentIndex = sizes.indexOf(fontSize);
        if (currentIndex < sizes.length - 1) {
          setFontSize(sizes[currentIndex + 1]);
        }
      } else if (e.ctrlKey && e.key === '-') {
        e.preventDefault();
        const sizes: FontSize[] = ['small', 'medium', 'large', 'extra-large'];
        const currentIndex = sizes.indexOf(fontSize);
        if (currentIndex > 0) {
          setFontSize(sizes[currentIndex - 1]);
        }
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault();
        setFontSize('medium'); // Reset to default
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [fontSize]);

  // Close reaction picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showReactionPicker && !target.closest('.reaction-picker')) {
        setShowReactionPicker(null);
      }
      if (showEmojiPicker && !target.closest('.emoji-picker-container') && !target.closest('button[title="Add emoji"]')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showReactionPicker, showEmojiPicker]);

  // Prevent any unwanted form submissions or page navigation
  useEffect(() => {
    const preventNavigation = (e: Event): boolean => {
      // Only prevent if this comes from our conversation input area
      const target = e.target as HTMLElement;
      const conversationForm = target?.closest?.('form');
      if (conversationForm && conversationForm.closest('.conversation-room')) {
        console.log('Preventing form submission from conversation room');
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      return true;
    };

    const preventBeforeUnload = (e: BeforeUnloadEvent): string | undefined => {
      // Only prevent if we're in the middle of sending a message
      const pendingMessages = document.querySelectorAll('[data-status="sending"]');
      if (pendingMessages.length > 0) {
        console.log('Preventing page unload due to pending messages');
        e.preventDefault();
        e.returnValue = '';
        return '';
      }
      return undefined;
    };

    // Only add form prevention, not general document prevention
    window.addEventListener('beforeunload', preventBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', preventBeforeUnload);
    };
  }, []);

  // Play sound effect function
  const playSound = (soundType: 'send' | 'success' | 'celebration') => {
    try {
      // Create audio context for better sound synthesis
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      if (soundType === 'send') {
        // Swoosh sound for sending
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.3);
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.3);
      } else if (soundType === 'success') {
        // Success chime
        const oscillator1 = audioContext.createOscillator();
        const oscillator2 = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator1.connect(gainNode);
        oscillator2.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator1.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
        oscillator2.frequency.setValueAtTime(659.25, audioContext.currentTime); // E5
        
        gainNode.gain.setValueAtTime(0.05, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator1.start(audioContext.currentTime);
        oscillator2.start(audioContext.currentTime);
        oscillator1.stop(audioContext.currentTime + 0.5);
        oscillator2.stop(audioContext.currentTime + 0.5);
      } else if (soundType === 'celebration') {
        // Celebration sound with multiple tones
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5
        frequencies.forEach((freq, index) => {
          setTimeout(() => {
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(freq, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.03, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
          }, index * 100);
        });
      }
    } catch (error) {
      console.log('Audio not supported or blocked:', error);
    }
  };

  // Create particle effect
  const createParticles = (centerX: number, centerY: number) => {
    const newParticles = [];
    const emojis = ['✨', '🎉', '💫', '⭐', '🌟', '💥'];
    
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * 2 * Math.PI;
      const velocity = 50 + Math.random() * 30;
      const emoji = emojis[Math.floor(Math.random() * emojis.length)];
      
      newParticles.push({
        id: Date.now() + i,
        x: centerX + Math.cos(angle) * velocity,
        y: centerY + Math.sin(angle) * velocity,
        emoji
      });
    }
    
    setParticles(newParticles);
    
    // Clear particles after animation
    setTimeout(() => {
      setParticles([]);
    }, 1000);
  };

  // Map emoji to API reaction type
  const getReactionTypeFromEmoji = (emoji: string): string => {
    const emojiToReactionMap: { [key: string]: string } = {
      '❤️': 'love',
      '💙': 'heart',
      '👍': 'celebrate',
      '😂': 'laugh',
      '😮': 'surprised',
      '😢': 'sad',
      '😡': 'angry',
      '⭐': 'star',
      '🔥': 'like'
    };
    return emojiToReactionMap[emoji] || 'like'; // Default to 'like' if emoji not found
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    // Add to recent emojis
    setRecentEmojis(prev => {
      const filtered = prev.filter(e => e !== emoji);
      return [emoji, ...filtered].slice(0, 8); // Keep only 8 recent emojis
    });

    // Find the message to get the comment_id - look in current messages state
    const message = messages.find(msg => msg.id === messageId);
    if (!message) {
      console.error('❌ Message not found:', {
        messageId,
        availableMessages: messages.map(m => ({ id: m.id, comment_id: m.comment_id }))
      });
      return;
    }

    // Try to get comment_id, fallback to parsing the message id if it's numeric
    let commentId = message.comment_id;
    if (!commentId) {
      // Try to parse message id as number (in case the API returns comment_id as string id)
      const parsedId = parseInt(message.id);
      if (!isNaN(parsedId)) {
        commentId = parsedId;
        console.log('🔄 Using parsed message ID as comment_id:', commentId);
      }
    }

    if (!commentId) {
      console.error('❌ No comment_id available for message:', {
        messageId,
        message: {
          id: message.id,
          comment_id: message.comment_id,
          author: message.author,
          text: message.text.substring(0, 50) + '...'
        }
      });
      // Still allow local UI update for better UX
      updateReactionLocally(messageId, emoji, true);
      return;
    }

    // Optimistic update - update UI immediately
    const existingReaction = message.reactions?.find(r => r.emoji === emoji);
    const isCurrentlyReacted = existingReaction?.users?.includes(currentUser.id) ?? false;
    updateReactionLocally(messageId, emoji, !isCurrentlyReacted);

    try {
      // Call the API to toggle reaction
      const reactionType = getReactionTypeFromEmoji(emoji);
      console.log('🔄 Toggling reaction:', {
        messageId,
        comment_id: commentId,
        emoji,
        reactionType
      });

      const result = await reactToComment({
        target_type: 'comment',
        target_id: commentId,
        reaction_type: reactionType
      });

      console.log('✅ Reaction API response:', result);

      // Update state with API response (this will override the optimistic update)
      updateReactionFromAPI(messageId, emoji, result);

    } catch (error) {
      console.error('❌ Failed to toggle reaction:', error);
      // Revert optimistic update on error
      updateReactionLocally(messageId, emoji, isCurrentlyReacted);
      setReactionError('Failed to update reaction. Please try again.');
      // Clear error after 3 seconds
      setTimeout(() => setReactionError(null), 3000);
    }

    setShowReactionPicker(null);
  };

  // Helper function for optimistic local updates
  const updateReactionLocally = (messageId: string, emoji: string, shouldAddReaction: boolean) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => {
        if (msg.id === messageId) {
          const existingReactions = msg.reactions || [];
          const existingReaction = existingReactions.find(r => r.emoji === emoji);
          
          if (shouldAddReaction) {
            if (existingReaction) {
              // Increment count and add user
              return {
                ...msg,
                reactions: existingReactions.map(r => 
                  r.emoji === emoji ? { 
                    ...r, 
                    count: r.count + 1,
                    users: r.users?.includes(currentUser.id) ? r.users : [...(r.users || []), currentUser.id]
                  } : r
                )
              } as Message;
            } else {
              // Add new reaction
              return {
                ...msg,
                reactions: [...existingReactions, { 
                  emoji, 
                  count: 1, 
                  users: [currentUser.id] 
                }]
              } as Message;
            }
          } else {
            // Remove reaction
            if (existingReaction) {
              const newCount = Math.max(0, existingReaction.count - 1);
              if (newCount === 0) {
                return {
                  ...msg,
                  reactions: existingReactions.filter(r => r.emoji !== emoji)
                } as Message;
              } else {
                return {
                  ...msg,
                  reactions: existingReactions.map(r => 
                    r.emoji === emoji ? { 
                      ...r, 
                      count: newCount,
                      users: (r.users || []).filter(userId => userId !== currentUser.id)
                    } : r
                  )
                } as Message;
              }
            }
          }
        }
        return msg;
      })
    );
  };

  // Helper function to update from API response
  const updateReactionFromAPI = (messageId: string, emoji: string, apiResult: any) => {
    setMessages(prevMessages => 
      prevMessages.map(msg => {
        if (msg.id === messageId) {
          const existingReactions = msg.reactions || [];
          const existingReaction = existingReactions.find(r => r.emoji === emoji);
          
          if (apiResult.user_reacted) {
            // User added reaction
            if (existingReaction) {
              // Update existing reaction
              return {
                ...msg,
                reactions: existingReactions.map(r => 
                  r.emoji === emoji ? { 
                    ...r, 
                    count: apiResult.reaction_count || r.count,
                    users: r.users?.includes(currentUser.id) ? r.users : [...(r.users || []), currentUser.id]
                  } : r
                )
              } as Message;
            } else {
              // Add new reaction
              return {
                ...msg,
                reactions: [...existingReactions, { 
                  emoji, 
                  count: apiResult.reaction_count || 1, 
                  users: [currentUser.id] 
                }]
              } as Message;
            }
          } else {
            // User removed reaction
            if (existingReaction) {
              const newCount = apiResult.reaction_count !== undefined ? apiResult.reaction_count : Math.max(0, existingReaction.count - 1);
              if (newCount === 0) {
                return {
                  ...msg,
                  reactions: existingReactions.filter(r => r.emoji !== emoji)
                } as Message;
              } else {
                return {
                  ...msg,
                  reactions: existingReactions.map(r => 
                    r.emoji === emoji ? { 
                      ...r, 
                      count: newCount,
                      users: (r.users || []).filter(userId => userId !== currentUser.id)
                    } : r
                  )
                } as Message;
              }
            }
          }
        }
        return msg;
      })
    );
  };

  // Insert emoji at cursor position
  const insertEmojiAtCursor = (emoji: string) => {
    // Add to recent emojis
    setRecentEmojis(prev => {
      const filtered = prev.filter(e => e !== emoji);
      return [emoji, ...filtered].slice(0, 8); // Keep only 8 recent emojis
    });

    const textArea = messageInputRef.current;
    if (textArea && inputMode === 'message') {
      const start = textArea.selectionStart;
      const end = textArea.selectionEnd;
      const currentValue = messageText;
      const newValue = currentValue.substring(0, start) + emoji + currentValue.substring(end);
      
      setMessageText(newValue);
      
      // Set cursor position after emoji
      setTimeout(() => {
        textArea.selectionStart = textArea.selectionEnd = start + emoji.length;
        textArea.focus();
      }, 0);
    } else if (inputMode === 'ai') {
      setAiQuestion(prev => prev + emoji);
    }
    setShowEmojiPicker(false);
  };

  const [messages, setMessages] = useState<Message[]>(() => {
    // Use external messages if provided, otherwise start with empty array
    if (externalMessages && externalMessages.length > 0) {
      console.log('🔄 ConversationRoom: Using external messages:', externalMessages.length);
      return externalMessages;
    } else {
      console.log('📭 ConversationRoom: No external messages provided, starting with empty conversation');
      return [];
    }
  });

  // Update messages when external messages change
  useEffect(() => {
    if (externalMessages && externalMessages.length > 0) {
      console.log('📨 ConversationRoom: External messages updated, merging with local messages:', externalMessages.length);
      
      // Log messages to check for comment_id field
      const messagesWithCommentId = externalMessages.filter(msg => msg.comment_id);
      const messagesWithoutCommentId = externalMessages.filter(msg => !msg.comment_id);
      
      console.log('✅ Messages with comment_id:', messagesWithCommentId.length);
      console.log('❌ Messages without comment_id:', messagesWithoutCommentId.length);
      
      if (messagesWithoutCommentId.length > 0) {
        console.warn('⚠️ Some messages missing comment_id:', messagesWithoutCommentId.map(m => ({
          id: m.id,
          author: m.author,
          text: m.text.substring(0, 30) + '...'
        })));
      }
      
      // Log any messages that have reply data
      const messagesWithReplies = externalMessages.filter(msg => msg.replyToMessageId || msg.replyToContent);
      if (messagesWithReplies.length > 0) {
        console.log('🔗 Found messages with reply data:', messagesWithReplies.map(msg => ({
          id: msg.id,
          replyToMessageId: msg.replyToMessageId,
          replyToContent: msg.replyToContent,
          author: msg.author,
          text: msg.text.substring(0, 50) + '...'
        })));
      }
      
      // Log AI assistant messages to detect unwanted auto-generation
      const aiMessages = externalMessages.filter(msg => msg.author === 'AI Assistant' || msg.type === 'ai-response');
      if (aiMessages.length > 0) {
        console.log('🤖 AI messages detected in external messages:', aiMessages.map(msg => ({
          id: msg.id,
          author: msg.author,
          type: msg.type,
          text: msg.text.substring(0, 50) + '...',
          timestamp: msg.timestamp
        })));
      }
      
      // Log each message to see what fields are available
      externalMessages.forEach(msg => {
        if (msg.replyToMessageId) {
          console.log('🔗 Message with replyToMessageId found:', {
            messageId: msg.id,
            author: msg.author,
            text: msg.text.substring(0, 30) + '...',
            replyToMessageId: msg.replyToMessageId,
            replyToContent: msg.replyToContent,
            replyToAuthor: msg.replyToAuthor,
            comment_id: msg.comment_id
          });
        }
      });
      
      // Merge external messages with any local pending messages
      setMessages(prevMessages => {
        const pendingMessages = prevMessages.filter(msg => 
          (msg.status === 'sending' || msg.status === 'sent') && 
          (msg.isOwn && !externalMessages.some(extMsg => extMsg.id === msg.id))
        );
        
        // Filter out any unwanted AI messages that might have been auto-generated
        const filteredExternalMessages = externalMessages.filter(msg => {
          // If this is an AI message, check if we recently sent a normal message that might have triggered it
          if (msg.author === 'AI Assistant' || msg.type === 'ai-response') {
            const messageTime = new Date(msg.timestamp).getTime();
            
            // Check for recent normal messages in local state (within 2 minutes)
            const recentNormalMessages = prevMessages.filter(prevMsg => 
              prevMsg.isOwn && 
              prevMsg.type !== 'ai-response' && 
              new Date(prevMsg.timestamp).getTime() > messageTime - 120000 // Increased to 2 minutes
            );
            
            // Also check for recent normal messages in the external messages themselves
            const recentExternalNormalMessages = externalMessages.filter(extMsg => 
              extMsg.author !== 'AI Assistant' && 
              extMsg.type !== 'ai-response' &&
              new Date(extMsg.timestamp).getTime() > messageTime - 120000 // Within 2 minutes
            );
            
            // Check for very recent user activity (within 10 seconds) that might trigger auto-AI
            const hasVeryRecentUserActivity = [
              ...prevMessages.filter(prevMsg => 
                prevMsg.isOwn && 
                prevMsg.type !== 'ai-response' &&
                new Date(prevMsg.timestamp).getTime() > messageTime - 10000 // Within 10 seconds
              ),
              ...externalMessages.filter(extMsg => 
                extMsg.author !== 'AI Assistant' && 
                extMsg.type !== 'ai-response' &&
                new Date(extMsg.timestamp).getTime() > messageTime - 10000 // Within 10 seconds
              )
            ].length > 0;
            
            if (recentNormalMessages.length > 0 || recentExternalNormalMessages.length > 0 || hasVeryRecentUserActivity) {
              console.warn('🚫 ConversationRoom: Filtering out potentially auto-generated AI message:', {
                aiMessageId: msg.id,
                aiText: msg.text?.substring(0, 50) + '...',
                aiTimestamp: msg.timestamp,
                hasVeryRecentUserActivity,
                recentNormalMessages: recentNormalMessages.map(m => ({
                  id: m.id,
                  text: m.text?.substring(0, 30) + '...',
                  timestamp: m.timestamp
                })),
                recentExternalNormalMessages: recentExternalNormalMessages.map(m => ({
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
        
        // Combine filtered external messages with pending local messages
        const mergedMessages = [...filteredExternalMessages, ...pendingMessages];
        
        // Sort by timestamp to maintain chronological order
        return mergedMessages.sort((a, b) => 
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        );
      });
    } else if (externalMessages && externalMessages.length === 0) {
      console.log('📭 ConversationRoom: External messages cleared, keeping only local pending messages');
      
      // Keep only local pending messages when external messages are cleared
      setMessages(prevMessages => 
        prevMessages.filter(msg => 
          msg.status === 'sending' || msg.status === 'sent' ||
          (msg.isOwn && msg.status && msg.status !== 'delivered')
        )
      );
    }
  }, [externalMessages]);

  // Remove fallback to mock data - show empty state instead
  // Add defensive validation to prevent React error #31
  const validateThoughtStarter = (thought: any, index: number) => {
    // Check if this is a raw API object
    if (!thought || typeof thought !== 'object') {
      console.error('❌ validateThoughtStarter: Invalid thought starter type:', typeof thought);
      return null;
    }
    
    if (thought.message_id || thought.user_name || thought.created_at || thought.original_content) {
      console.warn('⚠️ validateThoughtStarter: Raw API object detected, filtering out:', {
        message_id: thought.message_id,
        user_name: thought.user_name,
        created_at: thought.created_at,
        hasOriginalContent: !!thought.original_content,
        allKeys: Object.keys(thought)
      });
      return null;
    }
    
    // Ensure required fields exist and are valid
    try {
      const validatedThought = {
        ...thought,
        id: thought.id || `fallback-thought-${index}`,
        title: thought.title || 'Untitled Thought',
        description: thought.description || '',
        category: thought.category || 'general',
        tags: Array.isArray(thought.tags) ? thought.tags : [],
        lastActivity: thought.lastActivity || new Date().toISOString(),
        messageCount: typeof thought.messageCount === 'number' ? thought.messageCount : 0,
        participants: typeof thought.participants === 'number' ? thought.participants : 1,
        reactions: (thought.reactions && typeof thought.reactions === 'object' && !thought.reactions.message_id) 
          ? thought.reactions 
          : { likes: 0, hearts: 0, stars: 0, thumbsUp: 0 },
        author: (thought.author && typeof thought.author === 'object') 
          ? thought.author 
          : { id: 'unknown', name: 'Anonymous' }
      };
      
      console.log('✅ validateThoughtStarter: Validated thought starter:', {
        id: validatedThought.id,
        title: validatedThought.title,
        messageCount: validatedThought.messageCount
      });
      
      return validatedThought;
    } catch (error) {
      console.error('❌ validateThoughtStarter: Failed to validate thought starter:', error, thought);
      return null;
    }
  };

  const displayThoughtStarters = thoughtStarters.length > 0 
    ? thoughtStarters.map(validateThoughtStarter).filter(Boolean)
    : [];
  const selectedThought = displayThoughtStarters.find(t => t.id === selectedThoughtId) || displayThoughtStarters[0];

  // Auto-hide reference after 5 seconds
  useEffect(() => {
    // Reset visibility when selectedThought changes
    if (selectedThought?.taggedContent && !isReferenceVisible) {
      setIsReferenceVisible(true);
    }
  }, [selectedThought?.id]);

  useEffect(() => {
    // Start 5-second timer when reference becomes visible
    if (selectedThought?.taggedContent && isReferenceVisible) {
      const timer = setTimeout(() => {
        setIsReferenceVisible(false);
      }, 5000);

      return () => clearTimeout(timer);
    }
    return () => {}; // Return empty cleanup function when no timer is set
  }, [selectedThought?.taggedContent, isReferenceVisible]);

  // Filter thought starters based on search
  const filteredThoughts = displayThoughtStarters.filter(thought =>
    thought.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thought.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (thought.tags && Array.isArray(thought.tags) && 
     thought.tags.some((tag: string) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  );

  // Handle header shrinking on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (messagesContainerRef.current) {
        const scrollTop = messagesContainerRef.current.scrollTop;
        setIsHeaderShrunk(scrollTop > 100);
      }
    };

    const container = messagesContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
    
    return () => {}; // Return empty cleanup function when container is not available
  }, []);

  // Auto-scroll to bottom when messages are loaded or new messages arrive
  useEffect(() => {
    // Scroll to bottom when messages are first loaded or when new messages arrive
    if (messages.length > 0) {
      // Use requestAnimationFrame for smoother scrolling
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      });
    }
  }, [messages.length]); // Trigger on message count change

  // Additional effect to scroll to bottom when conversation changes (first time loading)
  useEffect(() => {
    // When selectedThought changes and we have messages, scroll to bottom
    if (messages.length > 0) {
      // Use timeout to ensure DOM has updated
      setTimeout(() => {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
      }, 50); // Reduced timeout for faster response
    }
  }, [selectedThoughtId, messages.length]);

  // Effect to scroll to bottom when messages finish loading for the first time
  useEffect(() => {
    // When loading finishes and we have messages, scroll to the most recent
    if (!isLoadingMessages && messages.length > 0) {
      setTimeout(() => {
        requestAnimationFrame(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        });
      }, 100); // Reduced timeout for faster response
    }
  }, [isLoadingMessages, messages.length]);

  // Cleanup effect for stuck "sending" messages
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      setMessages(prevMessages => {
        const now = Date.now();
        return prevMessages.map(msg => {
          // If a message has been "sending" for more than 10 seconds, mark it as failed
          if (msg.status === 'sending') {
            const messageTime = new Date(msg.timestamp).getTime();
            if (now - messageTime > 10000) { // 10 seconds
              console.warn('Message stuck in sending state, marking as failed:', msg.id);
              return {
                ...msg,
                status: 'sent',
                text: `${msg.text} ⚠️ Send timeout`
              };
            }
          }
          return msg;
        });
      });
    }, 5000); // Check every 5 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

  // Auto-collapse expanded header after inactivity
  useEffect(() => {
    if (isHeaderExpanded) {
      const timer = setTimeout(() => {
        setIsHeaderExpanded(false);
      }, 10000); // Auto-collapse after 10 seconds

      return () => clearTimeout(timer);
    }
    return undefined; // Return undefined when header is not expanded
  }, [isHeaderExpanded]);

  // Handle sending messages
  const handleSendMessage = async (event?: React.MouseEvent | React.KeyboardEvent | React.FormEvent) => {
    if (!messageText.trim() || !selectedThought) return;

    // Prevent any form submission or navigation
    event?.preventDefault?.();
    event?.stopPropagation?.();
    
    // Prevent default browser behavior
    if (typeof window !== 'undefined' && window.event) {
      window.event.preventDefault?.();
      window.event.stopPropagation?.();
    }

    console.log('📤 Sending message (seamless mode):', messageText);

    // Trigger special effects
    setShowSendEffect(true);
    playSound('send');
    
    // Create particle effect at send button location
    const sendButton = document.querySelector('button[title="Send message"]') as HTMLElement;
    if (sendButton) {
      const rect = sendButton.getBoundingClientRect();
      createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    const messageTextToSend = messageText; // Store the message text before clearing
    const replyingToMessage = replyingTo ? messages.find(m => m.id === replyingTo) : null;
    const tempId = `temp-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      text: messageTextToSend,
      author: currentUser.name,
      timestamp: new Date().toISOString(),
      isOwn: true,
      type: 'text',
      status: 'sending',
      ...(replyingToMessage && {
        replyToMessageId: replyingToMessage.id,
        replyToContent: replyingToMessage.text,
        replyToAuthor: replyingToMessage.author
      })
    };

    // Add message to UI immediately for seamless experience
    setMessages(prev => [...prev, newMessage]);
    
    // Clear input and reply state immediately
    setMessageText('');
    setReplyingTo(null);

    // Reset send effect
    setTimeout(() => {
      setShowSendEffect(false);
    }, 600);

    try {
      // Add the message as a comment using the existing API (like AI messages do)
      if (articleId && parentCommentId) {
        console.log('📤 Adding message as comment via API:', {
          articleId,
          parentCommentId,
          contentLength: messageTextToSend.length,
          replyToMessageId: replyingToMessage?.id
        });
        await addComment({
          articleId,
          parentCommentId,
          content: messageTextToSend,
          title: `Message from ${currentUser.name}`,
          minimessage: messageTextToSend.length > 50 ? messageTextToSend.substring(0, 47) + '...' : messageTextToSend,
          ...(replyingToMessage && {
            replyMessageId: parseInt(replyingToMessage.id, 10)
          })
        });
        console.log('✅ Message added to conversation successfully via API');
      } else {
        console.warn('⚠️ Skipping API call for message - missing context:', {
          articleId,
          parentCommentId
        });
      }

      // Update status to sent immediately for better UX (optimistic update)
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'sent' } : msg
        ));
        playSound('success');
        setSuccessPulse(tempId);
        setTimeout(() => setSuccessPulse(null), 800);
      }, 300);

      // Call the parent handler to refresh messages (significantly delayed to avoid duplicate messages)
      setTimeout(() => {
        try {
          console.log('🔄 Calling parent onSendMessage for normal message refresh (final delayed call)');
          onSendMessage(messageTextToSend, selectedThought.id, replyingToMessage?.id);
        } catch (error) {
          console.error('Error in parent onSendMessage:', error);
        }
      }, 3000); // Increased to 3 seconds to ensure no conflicts with server processing

      // Mark as delivered after a reasonable delay (simulating real send)
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'delivered' } : msg
        ));
        
        // Play celebration sound for longer messages (more than 20 characters)
        if (messageTextToSend.length > 20) {
          playSound('celebration');
          // Extra sparkle effect for long messages
          setTimeout(() => {
            const messageElement = document.querySelector(`[data-message-id="${tempId}"]`) as HTMLElement;
            if (messageElement) {
              const rect = messageElement.getBoundingClientRect();
              createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }
          }, 100);
        }
      }, 600);

    } catch (error) {
      console.error('Error sending message:', error);
      // Update message status to failed
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, status: 'sent', text: `${msg.text} ❌ Failed to send` } : msg
      ));
    }
  };

  // Handle AI questions
  const handleAskAI = async (event?: React.MouseEvent | React.KeyboardEvent | React.FormEvent) => {
    if (!aiQuestion.trim() || !selectedThought) return;

    // Prevent any form submission or navigation
    event?.preventDefault?.();
    event?.stopPropagation?.();
    
    // Prevent default browser behavior
    if (typeof window !== 'undefined' && window.event) {
      window.event.preventDefault?.();
      window.event.stopPropagation?.();
    }

    console.log('🤖 Asking AI:', aiQuestion);
    console.log('📄 Available context:', {
      articleId,
      parentCommentId,
      articleContentLength: articleContent?.length || 0,
      selectedThoughtId: selectedThought?.id
    });
    setIsGeneratingAI(true);
    setAiError(null);

    // Trigger special effects for AI questions
    setShowSendEffect(true);
    playSound('send');
    
    // Create particle effect at send button location
    const sendButton = document.querySelector('button[title="Send message"]') as HTMLElement;
    if (sendButton) {
      const rect = sendButton.getBoundingClientRect();
      createParticles(rect.left + rect.width / 2, rect.top + rect.height / 2);
    }

    const questionToSend = aiQuestion; // Store before clearing
    
    // Add the user's question to UI immediately for better UX
    const questionMessageId = `question-${Date.now()}`;
    const questionMessage: Message = {
      id: questionMessageId,
      text: `🤖 ${questionToSend}`,
      author: currentUser.name,
      timestamp: new Date().toISOString(),
      isOwn: true,
      type: 'text',
      status: 'sending'
    };

    // Add question to UI immediately
    setMessages(prev => [...prev, questionMessage]);
    
    // Clear input and reset mode immediately for better UX
    setAiQuestion('');
    setInputMode('message');

    // Reset send effect
    setTimeout(() => {
      setShowSendEffect(false);
    }, 600);

    try {
      // Create a comprehensive prompt that includes the question and article context
      const promptText = `Question: ${questionToSend}

Article Context: ${articleContent || 'No article content available'}

Please provide a detailed analysis and answer to the question based on the article context provided above.`;

      // Query AI with the formatted prompt
      const aiResponse = await queryAI({
        text: promptText,
        fast: true
      });

      if (aiResponse.summary && articleId && parentCommentId) {
        // Update question message status to sent
        setMessages(prev => prev.map(msg => 
          msg.id === questionMessageId ? { ...msg, status: 'sent' } : msg
        ));

        // Add the AI response to local UI immediately for better UX
        const aiMessageId = `ai-${Date.now()}`;
        const aiMessage: Message = {
          id: aiMessageId,
          text: aiResponse.summary,
          author: 'AI Assistant',
          timestamp: new Date().toISOString(),
          isOwn: false,
          type: 'ai-response',
          status: 'delivered'
        };

        // Add AI message to UI immediately
        setMessages(prev => [...prev, aiMessage]);

        // Add the AI response as a comment using the existing API
        await addComment({
          articleId,
          parentCommentId,
          content: aiResponse.summary,
          title: questionToSend,
          minimessage: aiResponse.summarymini || `AI generated response (${aiResponse.summary.split(' ').length} words)`
        });

        console.log('✅ AI response added to conversation successfully');
        playSound('success');
        
        // Call the parent handler to refresh messages
        setTimeout(() => {
          try {
            onAskAI(questionToSend, selectedThought.id);
          } catch (error) {
            console.error('Error in parent onAskAI:', error);
          }
        }, 0);
      } else {
        const missingContext = [];
        if (!aiResponse.summary) missingContext.push('AI response summary');
        if (!articleId) missingContext.push('article ID');
        if (!parentCommentId) missingContext.push('parent comment ID');
        
        throw new Error(`Missing required context: ${missingContext.join(', ')}`);
      }

    } catch (error) {
      console.error('❌ Error generating AI response:', error);
      
      // Update question message to show error
      setMessages(prev => prev.map(msg => 
        msg.id === questionMessageId ? { 
          ...msg, 
          status: 'sent', 
          text: `${msg.text} ❌ AI request failed` 
        } : msg
      ));
      
      setAiError(error instanceof Error ? error.message : 'Failed to generate AI response');
      playSound('send'); // Use 'send' instead of 'error' as it's not in the valid types
      
      // Show error to user for a few seconds
      setTimeout(() => {
        setAiError(null);
      }, 5000);
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor(diff / (1000 * 60));

    if (hours > 24) {
      return date.toLocaleDateString();
    } else if (hours > 0) {
      return `${hours}h ago`;
    } else if (minutes > 0) {
      return `${minutes}m ago`;
    } else {
      return 'now';
    }
  };

  // Function to detect and format links in text
  const formatTextWithLinks = (text: string) => {
    // URL regex pattern - more comprehensive
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
    
    // Split by new lines first to preserve line breaks
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      if (line.trim() === '') {
        return <br key={`br-${lineIndex}`} />;
      }
      
      const parts = line.split(urlRegex);
      
      const formattedLine = parts.map((part, partIndex) => {
        if (urlRegex.test(part)) {
          let href = part;
          // Add protocol if missing
          if (!part.startsWith('http')) {
            href = part.startsWith('www.') ? `https://${part}` : `https://${part}`;
          }
          
          // Truncate long URLs for display
          const displayText = part.length > 50 ? `${part.substring(0, 47)}...` : part;
          
          return (
            <a
              key={`${lineIndex}-${partIndex}`}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all transition-all duration-200 font-medium underline underline-offset-2"
              style={{
                color: '#60A5FA',
                textDecorationColor: 'rgba(96, 165, 250, 0.7)'
              }}
              title={part}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#93C5FD';
                e.currentTarget.style.textDecorationColor = '#93C5FD';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = '#60A5FA';
                e.currentTarget.style.textDecorationColor = 'rgba(96, 165, 250, 0.7)';
              }}
            >
              {displayText}
            </a>
          );
        }
        return part;
      });
      
      return (
        <span key={lineIndex}>
          {formattedLine}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      );
    });
  };

  // Enhanced markdown formatter specifically for AI assistant responses
  const formatAIMarkdown = (text: string) => {
    const lines = text.split('\n');
    const result: React.ReactElement[] = [];
    let inCodeBlock = false;
    let currentCodeBlock: string[] = [];
    let codeLanguage = '';
    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Handle code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          // End code block
          result.push(
            <div key={`code-${i}`} className="my-4 rounded-xl overflow-hidden border border-blue-500/20 relative group bg-gradient-to-br from-gray-900/80 to-gray-950/90 shadow-xl">
              <div className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 px-4 py-3 text-xs font-mono text-blue-300 border-b border-blue-500/20 flex items-center justify-between backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-400/70"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-400/70"></div>
                    <div className="w-2 h-2 rounded-full bg-green-400/70"></div>
                  </div>
                  <span className="text-blue-200 font-medium">{getLanguageLabel(codeLanguage)}</span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(currentCodeBlock.join('\n'));
                    // Show copy feedback
                    const btn = document.activeElement as HTMLButtonElement;
                    if (btn) {
                      const originalText = btn.textContent;
                      btn.textContent = 'Copied!';
                      btn.className = btn.className.replace('text-blue-200', 'text-green-300');
                      setTimeout(() => {
                        btn.textContent = originalText;
                        btn.className = btn.className.replace('text-green-300', 'text-blue-200');
                      }, 1500);
                    }
                  }}
                  className="opacity-70 hover:opacity-100 transition-all duration-200 px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg text-xs text-blue-200 hover:text-white font-medium border border-blue-500/30 hover:border-blue-400/50 hover:scale-105"
                  title="Copy code to clipboard"
                >
                  Copy
                </button>
              </div>
              <pre className="bg-gradient-to-br from-gray-900/90 to-gray-950/95 p-4 overflow-x-auto relative">
                <code className={`text-sm font-mono leading-relaxed ${getLanguageClass(codeLanguage)}`}>
                  {highlightCode(currentCodeBlock.join('\n'), codeLanguage)}
                </code>
              </pre>
            </div>
          );
          currentCodeBlock = [];
          inCodeBlock = false;
          codeLanguage = '';
        } else {
          // Start code block
          inCodeBlock = true;
          codeLanguage = line.substring(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        currentCodeBlock.push(line);
        continue;
      }

      // Handle tables
      if (line.includes('|') && !inTable) {
        // Start of table
        const headers = line.split('|').map(h => h.trim()).filter(h => h);
        if (headers.length > 1) {
          tableHeaders = headers;
          inTable = true;
          continue;
        }
      }

      if (inTable) {
        if (line.includes('|')) {
          if (line.includes('---') || line.includes(':-:') || line.includes(':--')) {
            // Table separator line, skip
            continue;
          }
          const cells = line.split('|').map(c => c.trim()).filter(c => c);
          if (cells.length > 0) {
            tableRows.push(cells);
            continue;
          }
        } else {
          // End of table
          result.push(
            <div key={`table-${i}`} className="my-4 overflow-hidden rounded-xl border border-blue-500/20 shadow-lg">
              <table className="w-full bg-gradient-to-br from-blue-950/20 to-indigo-950/20">
                <thead className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-b border-blue-500/20">
                  <tr>
                    {tableHeaders.map((header, idx) => (
                      <th key={idx} className="px-4 py-3 text-left text-sm font-semibold text-blue-200 border-r border-blue-500/20 last:border-r-0">
                        {formatInlineMarkdown(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className="hover:bg-blue-500/5 transition-colors border-b border-blue-500/10 last:border-b-0">
                      {row.map((cell, cellIdx) => (
                        <td key={cellIdx} className="px-4 py-3 text-sm text-gray-200 border-r border-blue-500/10 last:border-r-0">
                          {formatInlineMarkdown(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
          inTable = false;
          tableHeaders = [];
          tableRows = [];
          // Continue processing current line
        }
      }

      // Handle different markdown elements
      if (line.trim() === '') {
        result.push(<div key={`space-${i}`} className="h-3" />);
        continue;
      }

      // Headers with enhanced styling
      if (line.startsWith('# ')) {
        result.push(
          <div key={`h1-wrapper-${i}`} className="my-6">
            <h1 className="text-2xl font-bold text-transparent bg-gradient-to-r from-blue-200 to-indigo-200 bg-clip-text mb-4 pb-3 border-b-2 border-gradient-to-r from-blue-500/50 to-transparent relative">
              {line.substring(2)}
              <div className="absolute bottom-0 left-0 w-1/3 h-0.5 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"></div>
            </h1>
          </div>
        );
        continue;
      }

      if (line.startsWith('## ')) {
        result.push(
          <h2 key={`h2-${i}`} className="text-xl font-semibold text-transparent bg-gradient-to-r from-blue-200 to-indigo-200 bg-clip-text mb-3 mt-6 relative pl-4">
            <div className="absolute left-0 top-1 w-1 h-6 bg-gradient-to-b from-blue-500 to-indigo-500 rounded-full"></div>
            {line.substring(3)}
          </h2>
        );
        continue;
      }

      if (line.startsWith('### ')) {
        result.push(
          <h3 key={`h3-${i}`} className="text-lg font-medium text-blue-200 mb-2 mt-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
            {line.substring(4)}
          </h3>
        );
        continue;
      }

      // Enhanced lists with better styling
      if (line.match(/^[\s]*[-*+]\s/)) {
        const listItem = line.replace(/^[\s]*[-*+]\s/, '');
        const isTaskList = listItem.startsWith('[ ]') || listItem.startsWith('[x]');
        const isCompleted = listItem.startsWith('[x]');
        
        if (isTaskList) {
          const taskText = listItem.substring(3).trim();
          result.push(
            <div key={`task-${i}`} className="flex items-start gap-3 mb-2 group">
              <div className={`mt-1.5 w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                isCompleted 
                  ? 'bg-green-500/20 border-green-400 text-green-300' 
                  : 'border-blue-400/50 hover:border-blue-400'
              }`}>
                {isCompleted && <span className="text-xs">✓</span>}
              </div>
              <span className={`text-gray-200 ${isCompleted ? 'line-through opacity-70' : ''}`}>
                {formatInlineMarkdown(taskText)}
              </span>
            </div>
          );
        } else {
          result.push(
            <div key={`list-${i}`} className="flex items-start gap-3 mb-2">
              <div className="mt-2 w-1.5 h-1.5 rounded-full bg-gradient-to-r from-blue-400 to-indigo-400 flex-shrink-0"></div>
              <span className="text-gray-200">{formatInlineMarkdown(listItem)}</span>
            </div>
          );
        }
        continue;
      }

      if (line.match(/^[\s]*\d+\.\s/)) {
        const number = line.match(/^[\s]*(\d+)\./)?.[1] || '1';
        const listItem = line.replace(/^[\s]*\d+\.\s/, '');
        result.push(
          <div key={`numlist-${i}`} className="flex items-start gap-3 mb-2">
            <div className="flex items-center justify-center min-w-[24px] h-6 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-full border border-blue-400/30">
              <span className="text-xs font-bold text-blue-300">{number}</span>
            </div>
            <span className="text-gray-200">{formatInlineMarkdown(listItem)}</span>
          </div>
        );
        continue;
      }

      // Enhanced blockquotes with different types
      if (line.startsWith('> ')) {
        const content = line.substring(2);
        const isWarning = content.toLowerCase().includes('warning') || content.toLowerCase().includes('caution');
        const isInfo = content.toLowerCase().includes('note') || content.toLowerCase().includes('info');
        const isTip = content.toLowerCase().includes('tip') || content.toLowerCase().includes('hint');
        
        let borderColor = 'border-blue-500/50';
        let bgColor = 'bg-blue-500/5';
        let iconColor = 'text-blue-400';
        let icon = '💭';
        
        if (isWarning) {
          borderColor = 'border-yellow-500/50';
          bgColor = 'bg-yellow-500/5';
          iconColor = 'text-yellow-400';
          icon = '⚠️';
        } else if (isInfo) {
          borderColor = 'border-cyan-500/50';
          bgColor = 'bg-cyan-500/5';
          iconColor = 'text-cyan-400';
          icon = 'ℹ️';
        } else if (isTip) {
          borderColor = 'border-green-500/50';
          bgColor = 'bg-green-500/5';
          iconColor = 'text-green-400';
          icon = '💡';
        }
        
        result.push(
          <div key={`quote-${i}`} className={`border-l-4 ${borderColor} pl-4 pr-4 py-3 my-3 ${bgColor} rounded-r-lg backdrop-blur-sm relative overflow-hidden`}>
            <div className="flex items-start gap-3">
              <span className={`text-lg ${iconColor} flex-shrink-0 mt-0.5`}>{icon}</span>
              <div className="italic text-gray-300 leading-relaxed">
                {formatInlineMarkdown(content)}
              </div>
            </div>
          </div>
        );
        continue;
      }

      // Enhanced horizontal rules
      if (line.trim() === '---' || line.trim() === '***') {
        result.push(
          <div key={`hr-${i}`} className="my-6 flex items-center">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full mx-4"></div>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"></div>
          </div>
        );
        continue;
      }

      // Regular paragraphs with enhanced spacing
      result.push(
        <p key={`p-${i}`} className="text-gray-200 mb-3 leading-relaxed text-base">
          {formatInlineMarkdown(line)}
        </p>
      );
    }

    return <div className="space-y-1 animate-fadeIn">{result}</div>;
  };

  // Helper functions for enhanced code highlighting
  const getLanguageLabel = (lang: string): string => {
    const labels: { [key: string]: string } = {
      'js': 'JavaScript',
      'javascript': 'JavaScript',
      'ts': 'TypeScript',
      'typescript': 'TypeScript',
      'py': 'Python',
      'python': 'Python',
      'java': 'Java',
      'cpp': 'C++',
      'c': 'C',
      'html': 'HTML',
      'css': 'CSS',
      'json': 'JSON',
      'xml': 'XML',
      'sql': 'SQL',
      'bash': 'Bash',
      'shell': 'Shell',
      'php': 'PHP',
      'ruby': 'Ruby',
      'go': 'Go',
      'rust': 'Rust',
      'swift': 'Swift',
      'kotlin': 'Kotlin',
      'dart': 'Dart',
      'yaml': 'YAML',
      'yml': 'YAML'
    };
    return labels[lang.toLowerCase()] || (lang || 'Code');
  };

  const getLanguageClass = (lang: string): string => {
    const classes: { [key: string]: string } = {
      'javascript': 'text-yellow-200',
      'typescript': 'text-blue-200',
      'python': 'text-green-200',
      'java': 'text-orange-200',
      'html': 'text-red-200',
      'css': 'text-purple-200',
      'json': 'text-indigo-200'
    };
    return classes[lang.toLowerCase()] || 'text-gray-200';
  };

  const highlightCode = (code: string, language: string): React.ReactNode => {
    // Basic syntax highlighting for common languages
    if (!language) return code;
    
    // For now, return the code as-is but with proper formatting
    // In a real implementation, you might use a library like Prism.js or highlight.js
    return (
      <span className="block whitespace-pre-wrap">{code}</span>
    );
  };

  // Helper function to format inline markdown (bold, italic, code, links) with enhanced features
  const formatInlineMarkdown = (text: string) => {
    const parts: (string | React.ReactElement)[] = [];
    let remaining = text;
    let keyCounter = 0;

    // Handle inline code first (highest priority)
    remaining = remaining.replace(/`([^`]+)`/g, (match, code) => {
      const key = `CODE_${keyCounter++}`;
      parts.push(
        <code key={key} className="bg-gradient-to-r from-gray-800/90 to-gray-700/90 text-blue-300 px-2 py-1 rounded-md text-sm font-mono border border-blue-500/20 shadow-sm hover:shadow-md transition-all duration-200 hover:bg-gradient-to-r hover:from-gray-700/90 hover:to-gray-600/90">
          {code}
        </code>
      );
      return `__PLACEHOLDER_${key}__`;
    });

    // Handle strikethrough
    remaining = remaining.replace(/~~([^~]+)~~/g, (match, strike) => {
      const key = `STRIKE_${keyCounter++}`;
      parts.push(<span key={key} className="line-through text-gray-400">{strike}</span>);
      return `__PLACEHOLDER_${key}__`;
    });

    // Handle bold text with enhanced styling
    remaining = remaining.replace(/\*\*([^*]+)\*\*/g, (match, bold) => {
      const key = `BOLD_${keyCounter++}`;
      parts.push(
        <strong key={key} className="font-bold text-transparent bg-gradient-to-r from-blue-100 to-indigo-100 bg-clip-text drop-shadow-sm">
          {bold}
        </strong>
      );
      return `__PLACEHOLDER_${key}__`;
    });

    // Handle italic text with enhanced styling
    remaining = remaining.replace(/\*([^*]+)\*/g, (match, italic) => {
      const key = `ITALIC_${keyCounter++}`;
      parts.push(<em key={key} className="italic text-blue-100 font-medium">{italic}</em>);
      return `__PLACEHOLDER_${key}__`;
    });

    // Handle highlighted text (using ==text==)
    remaining = remaining.replace(/==([^=]+)==/g, (match, highlight) => {
      const key = `HIGHLIGHT_${keyCounter++}`;
      parts.push(
        <mark key={key} className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-100 px-1 py-0.5 rounded border border-yellow-500/30">
          {highlight}
        </mark>
      );
      return `__PLACEHOLDER_${key}__`;
    });

    // Handle markdown links with enhanced styling
    remaining = remaining.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, linkText, url) => {
      const key = `LINK_${keyCounter++}`;
      const isExternal = url.startsWith('http') || url.startsWith('www');
      parts.push(
        <a 
          key={key} 
          href={url} 
          target={isExternal ? "_blank" : "_self"}
          rel={isExternal ? "noopener noreferrer" : undefined}
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-all duration-200 hover:bg-blue-500/10 px-1 py-0.5 rounded group relative"
          title={url}
        >
          <span className="relative z-10">{linkText}</span>
          {isExternal && (
            <span className="inline-block ml-1 opacity-70 group-hover:opacity-100 transition-opacity">
              <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </span>
          )}
        </a>
      );
      return `__PLACEHOLDER_${key}__`;
    });

    // Handle auto-detected URLs with enhanced styling
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)/g;
    remaining = remaining.replace(urlRegex, (match) => {
      const key = `URL_${keyCounter++}`;
      let href = match;
      if (!match.startsWith('http')) {
        href = match.startsWith('www.') ? `https://${match}` : `https://${match}`;
      }
      const displayText = match.length > 50 ? `${match.substring(0, 47)}...` : match;
      
      parts.push(
        <a 
          key={key} 
          href={href} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-all duration-200 hover:bg-blue-500/10 px-1 py-0.5 rounded break-all group relative"
          title={match}
        >
          <span className="relative z-10">{displayText}</span>
          <span className="inline-block ml-1 opacity-70 group-hover:opacity-100 transition-opacity">
            <svg className="w-3 h-3 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </span>
        </a>
      );
      return `__PLACEHOLDER_${key}__`;
    });

    // Handle email addresses
    remaining = remaining.replace(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/g, (match, email) => {
      const key = `EMAIL_${keyCounter++}`;
      parts.push(
        <a 
          key={key} 
          href={`mailto:${email}`}
          className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors"
        >
          {email}
        </a>
      );
      return `__PLACEHOLDER_${key}__`;
    });

    // Handle math expressions (basic LaTeX-style)
    remaining = remaining.replace(/\$\$([^$]+)\$\$/g, (match, math) => {
      const key = `MATH_${keyCounter++}`;
      parts.push(
        <span key={key} className="inline-block bg-gray-800/70 text-purple-300 px-2 py-1 rounded font-mono text-sm border border-purple-500/20">
          {math}
        </span>
      );
      return `__PLACEHOLDER_${key}__`;
    });

    // Handle inline math
    remaining = remaining.replace(/\$([^$]+)\$/g, (match, math) => {
      const key = `IMATH_${keyCounter++}`;
      parts.push(
        <span key={key} className="bg-gray-800/50 text-purple-300 px-1 py-0.5 rounded font-mono text-sm">
          {math}
        </span>
      );
      return `__PLACEHOLDER_${key}__`;
    });

    // Split the remaining text and replace placeholders
    const segments = remaining.split(/(__PLACEHOLDER_[^_]+__)/);
    
    return segments.map((segment, index) => {
      if (segment.startsWith('__PLACEHOLDER_')) {
        const key = segment.replace(/__PLACEHOLDER_([^_]+)__/, '$1');
        const foundPart = parts.find(part => React.isValidElement(part) && part.key === key);
        return foundPart || segment;
      }
      return segment === '' ? null : segment;
    }).filter(Boolean);
  };

  // Message status icon
  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-philonet-accent-muted" />;
      default:
        return null;
    }
  };

  // Smart hover handler that avoids message input area
  const handleSidebarMouseEnter = (e: React.MouseEvent) => {
    if (!inputAreaRef.current) {
      setIsLeftSidebarHovered(true);
      return;
    }

    const inputAreaRect = inputAreaRef.current.getBoundingClientRect();
    const mouseY = e.clientY;
    
    // Only allow hover expansion if mouse is not near the input area
    // Add some buffer (50px) above and below the input area
    const buffer = 50;
    const isNearInputArea = mouseY >= (inputAreaRect.top - buffer) && mouseY <= (inputAreaRect.bottom + buffer);
    
    if (!isNearInputArea) {
      setIsLeftSidebarHovered(true);
    }
  };

  const handleSidebarMouseLeave = () => {
    setIsLeftSidebarHovered(false);
  };

  // Telegram-style user color generation
  const getUserColor = (username: string): string => {
    const colors = [
      '#FF6B6B', // Red
      '#4ECDC4', // Teal  
      '#45B7D1', // Blue
      '#96CEB4', // Green
      '#FECA57', // Yellow
      '#FF9FF3', // Pink
      '#54A0FF', // Light Blue
      '#5F27CD', // Purple
      '#00D2D3', // Cyan
      '#FF9F43', // Orange
      '#10AC84', // Emerald
      '#EE5A24', // Orange Red
    ];
    
    let hash = 0;
    for (let i = 0; i < username.length; i++) {
      hash = username.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    return colors[Math.abs(hash) % colors.length];
  };

  // Safety check - this should be handled by parent component, but just in case
  if (displayThoughtStarters.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-philonet-background">
        <div className="text-center max-w-sm px-6">
          <div className="w-16 h-16 mx-auto mb-4 bg-philonet-blue-500 bg-opacity-10 rounded-full flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-philonet-blue-500" />
          </div>
          <h3 className="text-lg font-medium text-philonet-text-primary mb-2">
            No Conversations Yet
          </h3>
          <p className="text-philonet-text-secondary leading-relaxed">
            Be the first to start a conversation! Go to the article page and share your thoughts to begin engaging with other readers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-philonet-background relative conversation-room">
      {/* Particle Effect Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50">
        <AnimatePresence>
          {particles.map((particle) => (
            <motion.div
              key={particle.id}
              className="absolute text-2xl select-none"
              initial={{ 
                x: particle.x - 50, 
                y: particle.y - 50, 
                scale: 0,
                opacity: 1,
                rotate: 0
              }}
              animate={{ 
                x: particle.x + (Math.random() - 0.5) * 100,
                y: particle.y - 100 - Math.random() * 50,
                scale: [0, 1.2, 0.8, 0],
                opacity: [1, 1, 0.8, 0],
                rotate: 360
              }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ 
                duration: 1,
                ease: "easeOut",
                times: [0, 0.2, 0.8, 1]
              }}
            >
              {particle.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Left Sidebar - Collapsible Thought Starters */}
      <div 
        className={cn(
          "border-r border-philonet-border transition-all duration-500 ease-in-out sidebar-background relative group",
          selectedThought ? "hidden sm:block" : "w-full",
          // Responsive behavior: collapsed when conversation selected, expandable on hover
          selectedThought 
            ? (isLeftSidebarHovered 
                ? "sm:w-[300px] md:w-[350px] sm:min-w-[300px] md:min-w-[350px] sm:max-w-[300px] md:max-w-[350px]"
                : "sm:w-[60px] md:w-[60px] sm:min-w-[60px] md:min-w-[60px] sm:max-w-[60px] md:max-w-[60px]")
            : "sm:w-1/2 md:w-1/3 sm:min-w-[280px] md:min-w-[320px] sm:max-w-[350px] md:max-w-[400px]"
        )}
        onMouseEnter={selectedThought ? handleSidebarMouseEnter : undefined}
        onMouseLeave={selectedThought ? handleSidebarMouseLeave : undefined}
      >
        {/* Adaptive Header - Collapsed/Expanded States */}
        <div className="p-2 border-b border-philonet-border bg-philonet-background overflow-hidden">
          {/* Collapsed State - Icon Strip */}
          {selectedThought && !isLeftSidebarHovered ? (
            <div className="flex flex-col items-center space-y-2 relative">
              {/* Hamburger/Conversations Icon */}
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-philonet-blue-500 to-philonet-blue-600 flex items-center justify-center hover:scale-105 transition-transform cursor-pointer">
                <MessageSquare className="w-4 h-4 text-white" />
              </div>
              
              {/* Conversation Count Indicator */}
              {filteredThoughts.length > 0 && (
                <div className="w-6 h-6 bg-philonet-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">
                    {filteredThoughts.length > 9 ? '9+' : filteredThoughts.length}
                  </span>
                </div>
              )}
              
              {/* Active Indicator */}
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              
              {/* Expand Hint */}
              <div className="absolute -right-1 top-1/2 transform -translate-y-1/2 text-philonet-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronDown className="w-3 h-3 rotate-90" />
              </div>
              
              {/* Smart hover zone indicator */}
              <div className="absolute -right-2 top-2 text-xs text-philonet-blue-400/60 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                Hover above chat
              </div>
              
              {/* Search Icon (collapsed) */}
              <div className="w-6 h-6 rounded-md bg-philonet-card hover:bg-philonet-border flex items-center justify-center transition-colors cursor-pointer mt-auto">
                <Search className="w-3 h-3 text-philonet-text-muted" />
              </div>
            </div>
          ) : (
            /* Expanded State - Full Header */
            <>
              {/* Article Reference styled like conversation item */}
              {(articleContent || articleTitle) && (
                <div className="mb-3 p-3 bg-philonet-card/30 rounded-lg border border-philonet-border/50 hover:border-philonet-blue-500/40 transition-all duration-200 cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-philonet-blue-500 to-philonet-blue-600 flex items-center justify-center flex-shrink-0">
                      📄
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className={cn("font-semibold text-philonet-text-primary line-clamp-1", getFontClass('userName'))}>
                          {articleTitle || 'Article Discussion'}
                        </h3>
                        <div className="w-1 h-1 bg-philonet-blue-500 rounded-full animate-pulse"></div>
                      </div>
                      {articleContent && (
                        <p className={cn("text-philonet-text-secondary line-clamp-2 mb-1", getFontClass('timestamp'), getFontClass('leading'))}>
                          {articleContent.substring(0, 80)}{articleContent.length > 80 && '...'}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-philonet-text-muted">
                        {articleId && <span>ID: {articleId}</span>}
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          Active
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onClose ? onClose() : onThoughtSelect('');
                      }}
                      className="sm:hidden p-1.5 hover:bg-philonet-border rounded-md transition-colors flex-shrink-0"
                      title="Close conversations"
                    >
                      <X className="w-4 h-4 text-philonet-text-secondary" />
                    </button>
                  </div>
                </div>
              )}

              {/* Compact Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-philonet-text-muted" />
                <input
                  type="text"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-philonet-card border border-philonet-border rounded-lg text-philonet-text-primary placeholder:text-philonet-text-muted focus:outline-none focus:border-philonet-blue-500 transition-colors text-sm"
                />
              </div>
            </>
          )}
        </div>

        {/* Adaptive Thought Starters List */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {selectedThought && !isLeftSidebarHovered ? (
            /* Collapsed State - Compact Vertical Stack */
            <div className="p-2 space-y-2">
              {filteredThoughts.slice(0, 6).map((thought, index) => (
                <motion.div
                  key={thought.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.2 }}
                  className={cn(
                    "relative w-10 h-10 mx-auto rounded-lg cursor-pointer transition-all duration-200 group flex-shrink-0",
                    "hover:scale-110 hover:shadow-md",
                    selectedThought?.id === thought.id 
                      ? "ring-2 ring-philonet-blue-500 bg-philonet-blue-500/10 shadow-md scale-105" 
                      : "hover:ring-1 hover:ring-philonet-blue-300 hover:bg-philonet-card/30"
                  )}
                  onClick={() => onThoughtSelect(thought.id)}
                  title={`${thought.author?.name || 'Anonymous'}: ${(thought.title || thought.thoughtBody || '').substring(0, 60)}${(thought.title || thought.thoughtBody || '').length > 60 ? '...' : ''}`}
                >
                  {/* Avatar or Initial */}
                  <div className="w-full h-full rounded-lg overflow-hidden">
                    {thought.author?.avatar ? (
                      <img
                        src={thought.author.avatar}
                        alt={thought.author.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div 
                        className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ backgroundColor: getUserColor(thought.author?.name || 'Anonymous') }}
                      >
                        {(thought.author?.name || 'A').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  
                  {/* Unified Indicator - combines message count and status */}
                  <div className="absolute -top-1 -right-1">
                    {thought.messageCount > 0 && (
                      <div className="w-4 h-4 bg-philonet-blue-500 rounded-full flex items-center justify-center border border-philonet-background">
                        <span className="text-xs font-bold text-white leading-none">
                          {thought.messageCount > 9 ? '9' : thought.messageCount}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  {/* Status Dot */}
                  <div className="absolute -bottom-0.5 -right-0.5">
                    {thought.hasUnread ? (
                      <div className="w-2.5 h-2.5 bg-red-400 rounded-full border border-philonet-background animate-pulse"></div>
                    ) : thought.isActive ? (
                      <div className="w-2.5 h-2.5 bg-green-400 rounded-full border border-philonet-background"></div>
                    ) : null}
                  </div>
                  
                  {/* Enhanced Hover Tooltip */}
                  <div className="absolute left-12 top-0 bg-philonet-background/95 backdrop-blur-sm border border-philonet-border rounded-lg p-3 shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-50 w-56 transform group-hover:translate-x-1">
                    <div className="flex items-start gap-2 mb-2">
                      <div 
                        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: getUserColor(thought.author?.name || 'Anonymous') }}
                      >
                        {(thought.author?.name || 'A').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium text-philonet-text-primary truncate">
                          {thought.author?.name || 'Anonymous'}
                        </div>
                        <div className="text-xs text-philonet-text-muted">2h ago</div>
                      </div>
                    </div>
                    <div className="text-xs text-philonet-text-secondary line-clamp-3 mb-2 leading-relaxed">
                      {thought.title || thought.thoughtBody || 'No content'}
                    </div>
                    {thought.taggedContent && (
                      <div className="text-xs text-philonet-blue-400 mb-2 italic line-clamp-2">
                        "{thought.taggedContent.highlightedText}"
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-xs text-philonet-text-muted">
                      <span>{thought.messageCount} msgs</span>
                      <span>•</span>
                      <span>{thought.participants} people</span>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {/* More Conversations Indicator - Cleaner Design */}
              {filteredThoughts.length > 6 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  className="w-10 h-6 mx-auto rounded-md bg-philonet-card/50 border border-philonet-border/50 flex items-center justify-center mt-2 hover:bg-philonet-border/50 transition-colors cursor-pointer"
                  title={`${filteredThoughts.length - 6} more conversations`}
                >
                  <span className="text-xs font-medium text-philonet-text-muted">
                    +{filteredThoughts.length - 6}
                  </span>
                </motion.div>
              )}
              
              {/* Scroll Indicator */}
              {filteredThoughts.length > 6 && (
                <div className="w-1 h-8 mx-auto bg-gradient-to-b from-transparent via-philonet-border to-transparent rounded-full opacity-30"></div>
              )}
            </div>
          ) : (
            /* Expanded State - Full Cards with Smooth Layout */
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="space-y-0"
            >
              {filteredThoughts.map((thought, index) => (
                <motion.div
                  key={thought.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                  whileHover={{ x: 2, transition: { duration: 0.15 } }}
                  className={cn(
                    "p-3 border-b border-philonet-border cursor-pointer transition-all duration-200 relative",
                    "hover:bg-philonet-card/30",
                    selectedThought?.id === thought.id 
                      ? "bg-philonet-blue-500/10 border-l-3 border-l-philonet-blue-500 shadow-sm" 
                      : "hover:border-l-2 hover:border-l-philonet-blue-300/50"
                  )}
                  onClick={() => onThoughtSelect(thought.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Enhanced User Avatar with color coding */}
                    <div className="flex-shrink-0">
                      {thought.author?.avatar ? (
                        <div className="relative">
                          <img
                            src={thought.author.avatar}
                            alt={thought.author.name}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-philonet-border"
                          />
                          {thought.isActive && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-philonet-background"></div>
                          )}
                        </div>
                      ) : (
                        <div 
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-medium text-sm relative"
                          style={{ 
                            backgroundColor: getUserColor(thought.author?.name || 'Anonymous')
                          }}
                        >
                          {(thought.author?.name || 'A').charAt(0).toUpperCase()}
                          {thought.isActive && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border-2 border-philonet-background"></div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      {/* Enhanced Header with better typography */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span 
                          className="text-sm font-medium truncate"
                          style={{ color: getUserColor(thought.author?.name || 'Anonymous') }}
                        >
                          {thought.author?.name || 'Anonymous'}
                        </span>
                        <span className="text-xs text-philonet-text-muted">•</span>
                        <span className="text-xs text-philonet-text-muted">2h ago</span>
                        <span className="text-xs text-philonet-blue-400 font-medium">💭 2.14m</span>
                      </div>

                      {/* Enhanced Discussion Title */}
                      <h3 className={cn(
                        "text-sm font-medium text-philonet-text-primary mb-2 leading-relaxed transition-all duration-300 break-words",
                        isLeftSidebarHovered ? "line-clamp-3" : "line-clamp-2"
                      )}>
                        {thought.thoughtBody || thought.title}
                        {/* Show expandable indicator if content is long */}
                        {((thought.thoughtBody && thought.thoughtBody.length > 150) || 
                          (thought.taggedContent && thought.taggedContent.highlightedText.length > 100)) && (
                          <span 
                            className="ml-1 text-philonet-blue-400 opacity-60"
                            title="Click to expand and view full content"
                          >
                            <Maximize2 className="w-3 h-3 inline" />
                          </span>
                        )}
                      </h3>

                      {/* Refined Selected Text Preview - Telegram style */}
                      {thought.taggedContent && (
                        <div className={cn(
                          "text-xs mb-2 transition-all duration-300 break-words leading-relaxed",
                          "border-l-2 border-philonet-blue-500 pl-3 py-1.5 bg-philonet-background bg-opacity-40",
                          isLeftSidebarHovered ? "line-clamp-4" : "line-clamp-2"
                        )}>
                          <span className="text-philonet-text-muted opacity-60 mr-1">"</span>
                          <span className="text-philonet-text-secondary font-normal inline">
                            {thought.taggedContent.highlightedText}
                          </span>
                          <span className="text-philonet-text-muted opacity-60 ml-1">"</span>
                        </div>
                      )}

                      {/* Enhanced Stats */}
                      <div className="flex items-center gap-3 text-xs text-philonet-text-muted">
                        <span className="flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" />
                          <span className="font-medium">{thought.reactions?.likes || 0}</span>
                        </span>
                        <span className="font-medium">{thought.messageCount} msgs</span>
                        <span className="font-medium">{thought.participants} people</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>

      {/* Right Panel - Conversation */}
      <div className={cn(
        "flex flex-col min-w-0 overflow-hidden relative",
        selectedThought ? "w-full sm:flex-1" : "hidden sm:flex sm:flex-1"
      )}>
        {selectedThought ? (
          <>
            {/* Floating Mobile Back Button */}
            <button
              onClick={() => onThoughtSelect('')}
              className="sm:hidden fixed top-4 left-4 z-50 p-2 bg-philonet-background/80 backdrop-blur-sm hover:bg-philonet-card rounded-full shadow-lg border border-philonet-border transition-all"
              title="Back to conversations"
            >
              <ArrowLeft className="w-5 h-5 text-philonet-text-primary" />
            </button>
            
            {/* Enhanced Conversation Header */}
            <div className={cn(
              "p-2 sm:p-3 border-b border-philonet-border bg-philonet-background transition-all duration-300",
              isHeaderShrunk ? "py-2" : "py-3 sm:py-4"
            )}>
              <div className="flex items-start justify-between mb-3">
                <div 
                  className={cn(
                    "flex items-start gap-3 flex-1 transition-colors duration-200",
                    // Make clickable if there's expandable content
                    ((selectedThought.thoughtBody && selectedThought.thoughtBody.length > 150) || 
                     (selectedThought.taggedContent && selectedThought.taggedContent.highlightedText.length > 100))
                      ? "cursor-pointer hover:bg-philonet-card hover:bg-opacity-30 rounded-lg p-2 -m-2 focus:outline-none focus:ring-2 focus:ring-philonet-blue-500 focus:ring-opacity-50"
                      : ""
                  )}
                  onClick={() => {
                    // Only expand if there's content worth expanding
                    if ((selectedThought.thoughtBody && selectedThought.thoughtBody.length > 150) || 
                        (selectedThought.taggedContent && selectedThought.taggedContent.highlightedText.length > 100)) {
                      setIsHeaderExpanded(!isHeaderExpanded);
                    }
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && 
                        ((selectedThought.thoughtBody && selectedThought.thoughtBody.length > 150) || 
                         (selectedThought.taggedContent && selectedThought.taggedContent.highlightedText.length > 100))) {
                      e.preventDefault();
                      setIsHeaderExpanded(!isHeaderExpanded);
                    }
                  }}
                  tabIndex={
                    ((selectedThought.thoughtBody && selectedThought.thoughtBody.length > 150) || 
                     (selectedThought.taggedContent && selectedThought.taggedContent.highlightedText.length > 100))
                      ? 0 : -1
                  }
                  role={
                    ((selectedThought.thoughtBody && selectedThought.thoughtBody.length > 150) || 
                     (selectedThought.taggedContent && selectedThought.taggedContent.highlightedText.length > 100))
                      ? "button" : undefined
                  }
                  aria-label={
                    ((selectedThought.thoughtBody && selectedThought.thoughtBody.length > 150) || 
                     (selectedThought.taggedContent && selectedThought.taggedContent.highlightedText.length > 100))
                      ? (isHeaderExpanded ? "Collapse conversation details" : "Expand conversation details")
                      : undefined
                  }
                  title={
                    ((selectedThought.thoughtBody && selectedThought.thoughtBody.length > 150) || 
                     (selectedThought.taggedContent && selectedThought.taggedContent.highlightedText.length > 100))
                      ? (isHeaderExpanded ? "Click to collapse" : "Click to expand full content")
                      : undefined
                  }
                >
                  {selectedThought.author?.avatar ? (
                    <div className="relative">
                      <img
                        src={selectedThought.author.avatar}
                        alt={selectedThought.author.name}
                        className="w-12 h-12 rounded-xl object-cover ring-2 ring-philonet-blue-500"
                      />
                      {selectedThought.isActive && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-philonet-background animate-pulse"></div>
                      )}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-philonet-blue-500 to-philonet-blue-600 flex items-center justify-center ring-2 ring-philonet-blue-500">
                      💭
                      {selectedThought.isActive && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-philonet-background animate-pulse"></div>
                      )}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn("font-semibold text-white leading-tight", getFontClass('headerTitle'))}>{selectedThought.author?.name || 'Anonymous'}</h3>
                      {selectedThought.taggedContent && !isReferenceVisible && (
                        <div className="flex items-center gap-1 text-xs text-philonet-text-muted bg-philonet-card px-2 py-1 rounded-md" title="Reference hidden - click eye icon to view">
                          <EyeOff className="w-3 h-3" />
                          <span>ref hidden</span>
                        </div>
                      )}
                      <span className="text-xs text-philonet-text-muted">•</span>
                      <span className="text-xs text-philonet-text-muted">2h ago</span>
                      <span className="text-xs text-philonet-blue-400 font-medium">💭 2.14m</span>
                    </div>

                    {/* Compact Thought Body Preview */}
                    {selectedThought.thoughtBody && (
                      <p className={cn(
                        "text-philonet-text-secondary mb-1 break-words overflow-hidden transition-all duration-300",
                        getFontClass('thoughtBody'),
                        getFontClass('leading'),
                        isHeaderExpanded ? 'line-clamp-none' : 'line-clamp-2'
                      )}>
                        {selectedThought.thoughtBody}
                      </p>
                    )}

                    {/* Simplified Stats */}
                    <div className="flex items-center gap-4 text-sm text-philonet-text-muted mb-1">
                      <span className="flex items-center gap-1.5 font-medium">
                        <MessageSquare className="w-4 h-4 text-philonet-blue-400" />
                        {selectedThought.messageCount}
                      </span>
                      <span className="flex items-center gap-1.5 font-medium">
                        <Users className="w-4 h-4 text-philonet-blue-400" />
                        {selectedThought.participants}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-3">
                  {/* Reference visibility toggle button - only show if there's tagged content */}
                  {selectedThought.taggedContent && (
                    <Button 
                      onClick={() => setIsReferenceVisible(!isReferenceVisible)}
                      className="h-9 w-9 p-0 rounded-full bg-philonet-card hover:bg-philonet-border border-0 transition-all"
                      title={isReferenceVisible ? "Hide reference" : "View reference"}
                    >
                      {isReferenceVisible ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                  
                  {/* Expand/Collapse Header Button */}
                  <Button 
                    onClick={() => setIsHeaderExpanded(!isHeaderExpanded)}
                    className="h-9 w-9 p-0 rounded-full bg-philonet-card hover:bg-philonet-border border-0 transition-all"
                    title={isHeaderExpanded ? "Collapse details" : "Expand details"}
                  >
                    {isHeaderExpanded ? (
                      <Minimize2 className="w-4 h-4" />
                    ) : (
                      <Maximize2 className="w-4 h-4" />
                    )}
                  </Button>

                  {/* Font Size Picker */}
                  <div className="relative">
                    <Button 
                      onClick={() => {
                        const sizes: FontSize[] = ['small', 'medium', 'large', 'extra-large'];
                        const currentIndex = sizes.indexOf(fontSize);
                        const nextIndex = (currentIndex + 1) % sizes.length;
                        setFontSize(sizes[nextIndex]);
                      }}
                      className="h-9 w-9 p-0 rounded-full bg-philonet-card hover:bg-philonet-border border-0 transition-all relative"
                      title={`Text size: ${fontSize} (click to change)`}
                    >
                      <Type className="w-4 h-4" />
                      {/* Font size indicator with subscript */}
                      <span className={cn(
                        "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center text-[8px] font-bold border transition-all duration-200",
                        fontSize === 'small' ? "bg-green-500 text-white border-green-400" :
                        fontSize === 'medium' ? "bg-philonet-blue-500 text-white border-philonet-blue-400" :
                        fontSize === 'large' ? "bg-orange-500 text-white border-orange-400" :
                        "bg-red-500 text-white border-red-400"
                      )}>
                        {fontSize === 'small' ? 'S' : fontSize === 'medium' ? 'M' : fontSize === 'large' ? 'L' : 'XL'}
                      </span>
                    </Button>
                  </div>
                  
                  {/* Close conversation button - moved to rightmost position */}
                  <Button 
                    onClick={() => onClose ? onClose() : onThoughtSelect('')}
                    className="hidden sm:flex h-9 w-9 p-0 rounded-full bg-philonet-card hover:bg-red-500/20 border-0 transition-all items-center justify-center"
                    title="Close conversation"
                  >
                    <X className="w-4 h-4 text-philonet-text-secondary hover:text-red-400 transition-colors" />
                  </Button>
                </div>
              </div>

              {/* Expandable Tagged Content Section with smooth animation */}
              <AnimatePresence>
                {selectedThought.taggedContent && isReferenceVisible && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ 
                      height: "auto",
                      opacity: 1 
                    }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="mb-3 overflow-hidden"
                  >
                    <div className="p-3 bg-philonet-card border-l-4 border-philonet-blue-500 rounded-r-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Quote className="w-3.5 h-3.5 text-philonet-blue-500 flex-shrink-0" />
                        <span className="text-xs font-medium text-philonet-blue-500 uppercase tracking-wide">Referenced</span>
                      </div>
                      <blockquote className={cn(
                        "text-philonet-text-secondary break-words overflow-hidden transition-all duration-300",
                        getFontClass('thoughtBody'),
                        getFontClass('leading'),
                        isHeaderExpanded ? 'line-clamp-none' : 'line-clamp-2'
                      )}>
                        <span className="text-philonet-text-muted opacity-60">"</span>
                        {selectedThought.taggedContent.highlightedText}
                        <span className="text-philonet-text-muted opacity-60">"</span>
                      </blockquote>
                      
                      {/* Show additional details when expanded */}
                      <AnimatePresence>
                        {isHeaderExpanded && selectedThought.taggedContent.sourceUrl && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="mt-3 pt-3 border-t border-philonet-border"
                          >
                            <div className="flex items-center gap-2 text-xs text-philonet-text-muted">
                              <ExternalLink className="w-3 h-3" />
                              <a 
                                href={selectedThought.taggedContent.sourceUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="hover:text-philonet-blue-400 transition-colors truncate"
                              >
                                View source
                              </a>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-4 philonet-scrollbar min-w-0 message-background"
            >
              {isLoadingMessages ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-philonet-text-secondary"></div>
                  <span className="ml-3 text-philonet-text-secondary">Loading conversation...</span>
                </div>
              ) : messagesError ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-red-400 text-center">
                    <p>{messagesError}</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="mt-2 px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white text-sm"
                    >
                      Retry
                    </button>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center max-w-sm">
                    <div className="w-12 h-12 mx-auto mb-4 bg-philonet-blue-500 bg-opacity-10 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-6 h-6 text-philonet-blue-500" />
                    </div>
                    <h3 className="text-base font-medium text-philonet-text-primary mb-2">
                      Start the Conversation
                    </h3>
                    <p className="text-sm text-philonet-text-secondary mb-4 leading-relaxed">
                      Be the first to join this conversation! Share your thoughts and engage with the community.
                    </p>
                  </div>
                </div>
              ) : (
                messages
                  .map(validateAndTransformMessage) // Transform raw API objects first
                  .filter((message): message is Message => { // Type guard to ensure non-null Message
                    // Filter out null values from transformation failures
                    if (!message) {
                      return false;
                    }
                    
                    // All transformed messages should have these fields by now
                    if (!message.id || !message.text || !message.author || !message.timestamp) {
                      console.error('❌ Transformed message still missing required fields:', {
                        id: message.id,
                        text: message.text,
                        author: message.author,
                        timestamp: message.timestamp,
                        message
                      });
                      return false;
                    }
                    
                    return true;
                  })
                  .map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ 
                    opacity: 0, 
                    y: message.isOwn ? 30 : 20,
                    scale: message.isOwn ? 0.9 : 1
                  }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    scale: 1
                  }}
                  transition={{
                    type: "spring",
                    stiffness: message.isOwn ? 400 : 300,
                    damping: message.isOwn ? 25 : 20,
                    duration: message.isOwn ? 0.6 : 0.3
                  }}
                  className={cn(
                    "flex gap-3 min-w-0 w-full",
                    message.isOwn ? "justify-end" : "justify-start"
                  )}
                >
                  {!message.isOwn && (
                    <div className="flex-shrink-0">
                      {message.avatar ? (
                        <img
                          src={message.avatar}
                          alt={message.author}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20"
                        />
                      ) : message.type === 'ai-response' ? (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-[#3772FF]/30" style={{ backgroundColor: '#3772FF' }}>
                          <Bot className="w-4 h-4 text-white" />
                        </div>
                      ) : message.type === 'thought-starter' ? (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-[#3772FF]/30" style={{ backgroundColor: '#3772FF' }}>
                          <Sparkles className="w-4 h-4 text-white" />
                        </div>
                      ) : (
                        <div 
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-sm ring-1 ring-white/20"
                          style={{ 
                            backgroundColor: getUserColor(message.author)
                          }}
                        >
                          {message.author.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={cn(
                      "max-w-[85%] sm:max-w-[75%] md:max-w-[70%] space-y-1 min-w-0 relative",
                      message.isOwn ? "items-end" : "items-start"
                    )}
                  >
                    {!message.isOwn && (
                      <div className="flex items-center gap-2 mb-2">
                        <span 
                          className={cn("font-semibold break-words overflow-hidden text-white", getFontClass('userName'))}
                          style={{ color: getUserColor(message.author) }}
                        >
                          {message.author}
                        </span>
                        <span className={cn("font-normal", getFontClass('timestamp'))} style={{ color: '#E5E7EB' }}>
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    )}

                    <div
                      data-message-id={message.id}
                      data-status={message.status}
                      className={cn(
                        "px-4 py-3 group relative min-w-0 transition-all duration-200",
                        message.isOwn
                          ? "text-white rounded-2xl rounded-br-md ml-8 shadow-lg border border-[#3772FF]/20"
                          : message.type === 'ai-response'
                          ? "bg-[#3A3A3A] text-white rounded-2xl rounded-bl-md mr-8 shadow-lg border border-[#3772FF]/10"
                          : message.type === 'thought-starter'
                          ? "bg-[#3A3A3A] text-white rounded-2xl rounded-bl-md mr-8 shadow-lg border border-[#3772FF]/10"
                          : "bg-[#3A3A3A] text-white rounded-2xl rounded-bl-md mr-8 shadow-lg border border-gray-600/20",
                        successPulse === message.id && "animate-pulse",
                        message.isOwn && message.status === 'sending' && "scale-105"
                      )}
                      style={{
                        backgroundColor: message.isOwn ? '#3772FF' : undefined,
                        ...(message.isOwn && message.status === 'sending' ? {
                          boxShadow: "0 0 20px rgba(55, 114, 255, 0.4), 0 4px 12px rgba(55, 114, 255, 0.2)",
                          transform: "scale(1.02)"
                        } : {}),
                        ...(successPulse === message.id ? {
                          boxShadow: "0 0 30px rgba(34, 197, 94, 0.6), 0 4px 16px rgba(34, 197, 94, 0.3)",
                          borderColor: "rgba(34, 197, 94, 0.5)"
                        } : {})
                      }}
                    >
                      {/* WhatsApp-style Reply indicator inside message - shows when message is replying to another */}
                      {(message.replyToMessageId || message.replyToContent) && (() => {
                        // Log when reply indicator is being rendered
                        console.log('🔗 Rendering reply indicator for message:', {
                          messageId: message.id,
                          replyToMessageId: message.replyToMessageId,
                          replyToContent: typeof message.replyToContent === 'object' ? '[OBJECT]' : message.replyToContent,
                          replyToAuthor: typeof message.replyToAuthor === 'object' ? '[OBJECT]' : message.replyToAuthor,
                          replyToContentType: typeof message.replyToContent,
                          replyToAuthorType: typeof message.replyToAuthor
                        });
                        
                        // Ensure replyToContent is a string, not an object
                        const safeReplyToContent = typeof message.replyToContent === 'object' && message.replyToContent
                          ? ((message.replyToContent as any).content || (message.replyToContent as any).text || 'Referenced content')
                          : (typeof message.replyToContent === 'string' ? message.replyToContent : undefined);
                        
                        // Ensure replyToAuthor is a string, not an object  
                        const safeReplyToAuthor = typeof message.replyToAuthor === 'object' && message.replyToAuthor
                          ? ((message.replyToAuthor as any).name || (message.replyToAuthor as any).user_name || 'Someone')
                          : (typeof message.replyToAuthor === 'string' ? message.replyToAuthor : undefined);
                        
                        // Log if we had to fix any object values
                        if (typeof message.replyToContent === 'object' || typeof message.replyToAuthor === 'object') {
                          console.log('🔧 Fixed object values in reply fields before rendering:', {
                            messageId: message.id,
                            originalContentType: typeof message.replyToContent,
                            originalAuthorType: typeof message.replyToAuthor,
                            safeContent: safeReplyToContent?.substring(0, 50) + '...',
                            safeAuthor: safeReplyToAuthor
                          });
                        }
                        
                        // Try to find the referenced message in the current messages array
                        const referencedMessage = message.replyToMessageId 
                          ? messages.find(m => m.id === message.replyToMessageId)
                          : undefined;
                        
                        const displayContent = safeReplyToContent 
                          || (referencedMessage?.text ? 
                              referencedMessage.text.substring(0, 80) + (referencedMessage.text.length > 80 ? '...' : '') :
                              'Referenced message')
                          || 'Referenced message';
                          
                        // Final safety check - ensure displayContent is always a string
                        const safeDisplayContent = typeof displayContent === 'string' 
                          ? displayContent 
                          : JSON.stringify(displayContent);
                        
                        const displayAuthor = safeReplyToAuthor 
                          || referencedMessage?.author 
                          || 'someone';
                        
                        // Final safety check - ensure displayAuthor is always a string  
                        const safeDisplayAuthor = typeof displayAuthor === 'string' 
                          ? displayAuthor 
                          : JSON.stringify(displayAuthor);
                        
                        // Get user color for the referenced author
                        const referencedAuthorColor = referencedMessage ? getUserColor(referencedMessage.author) : getUserColor(safeDisplayAuthor);
                        
                        return (
                          <motion.div
                            initial={{ opacity: 0, height: 0, scale: 0.95 }}
                            animate={{ opacity: 1, height: "auto", scale: 1 }}
                            transition={{ duration: 0.2, ease: "easeOut" }}
                            className={cn(
                              "relative px-3 py-2.5 mb-3 rounded-xl cursor-pointer whatsapp-text transition-all duration-200 border-l-4 shadow-sm",
                              "hover:shadow-md hover:-translate-y-0.5",
                              message.isOwn 
                                ? "bg-gradient-to-r from-black/10 via-black/15 to-black/10 backdrop-blur-sm border-l-white/70 hover:border-l-white/90" 
                                : "bg-gradient-to-r from-white/5 via-white/10 to-white/5 backdrop-blur-sm hover:bg-white/15"
                            )}
                            style={{
                              borderLeftColor: message.isOwn ? 'rgba(255, 255, 255, 0.7)' : referencedAuthorColor,
                              boxShadow: message.isOwn 
                                ? '0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
                                : `0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 ${referencedAuthorColor}20`
                            }}
                            onClick={() => {
                              // Scroll to the referenced message
                              if (message.replyToMessageId) {
                                const referencedElement = document.querySelector(`[data-message-id="${message.replyToMessageId}"]`);
                                if (referencedElement) {
                                  referencedElement.scrollIntoView({ 
                                    behavior: 'smooth', 
                                    block: 'center' 
                                  });
                                  // Add a brief highlight effect
                                  referencedElement.classList.add('flash-highlight');
                                  setTimeout(() => {
                                    referencedElement.classList.remove('flash-highlight');
                                  }, 2000);
                                } else {
                                  console.log('❌ Could not find referenced message element:', message.replyToMessageId);
                                }
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                if (message.replyToMessageId) {
                                  const referencedElement = document.querySelector(`[data-message-id="${message.replyToMessageId}"]`);
                                  if (referencedElement) {
                                    referencedElement.scrollIntoView({ 
                                      behavior: 'smooth', 
                                      block: 'center' 
                                    });
                                    referencedElement.classList.add('flash-highlight');
                                    setTimeout(() => {
                                      referencedElement.classList.remove('flash-highlight');
                                    }, 2000);
                                  }
                                }
                              }
                            }}
                            tabIndex={0}
                            role="button"
                            aria-label="Navigate to referenced message"
                            title="Click to view referenced message"
                          >
                            {/* Enhanced WhatsApp-style author name with user color */}
                            <div className="flex items-center justify-between mb-2">
                              <span 
                                className={cn("font-semibold truncate tracking-tight", getFontClass('userName'))}
                                style={{ 
                                  color: message.isOwn ? 'rgba(255, 255, 255, 0.95)' : referencedAuthorColor,
                                  textShadow: message.isOwn ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none'
                                }}
                              >
                                {safeDisplayAuthor}
                              </span>
                              <div className={cn(
                                "w-1 h-1 rounded-full flex-shrink-0 ml-2",
                                message.isOwn ? "bg-white/40" : "bg-current opacity-40"
                              )} 
                              style={{ backgroundColor: message.isOwn ? 'rgba(255, 255, 255, 0.4)' : referencedAuthorColor + '66' }} />
                            </div>
                            
                            {/* Enhanced WhatsApp-style message content preview */}
                            <p className={cn(
                              "line-clamp-2 break-words font-light tracking-wide",
                              getFontClass('thoughtBody'),
                              getFontClass('leading'),
                              message.isOwn 
                                ? "text-white/85" 
                                : "text-white/90"
                            )}
                            style={{
                              textShadow: message.isOwn ? '0 1px 2px rgba(0, 0, 0, 0.2)' : 'none'
                            }}>
                              "{safeDisplayContent}"
                            </p>
                            
                            {/* Subtle scroll indicator */}
                            <div className="whatsapp-scroll-indicator">
                              <div className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                message.isOwn ? "bg-white/30" : "bg-current opacity-30"
                              )} 
                              style={{ backgroundColor: message.isOwn ? 'rgba(255, 255, 255, 0.3)' : referencedAuthorColor + '4D' }} />
                            </div>
                          </motion.div>
                        );
                      })()}
                      
                      {/* Enhanced message content with proper markdown rendering for AI responses */}
                      {message.type === 'ai-response' ? (
                        <motion.div 
                          className="ai-response-wrapper mt-2"
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                        >
                          {/* AI Response Header with enhanced animation */}
                          <motion.div 
                            className="flex items-center gap-2 mb-3 text-blue-300"
                            initial={{ x: -20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.2, duration: 0.4 }}
                          >
                            <motion.div
                              animate={{ 
                                rotate: [0, 360],
                                scale: [1, 1.1, 1]
                              }}
                              transition={{ 
                                rotate: { duration: 2, repeat: Infinity, ease: "linear" },
                                scale: { duration: 1, repeat: Infinity, ease: "easeInOut" }
                              }}
                            >
                              <Bot className="w-4 h-4" />
                            </motion.div>
                            <span className="text-sm font-medium gradient-text">AI Assistant</span>
                            <motion.div 
                              className="flex-1 h-px bg-gradient-to-r from-blue-500/50 to-transparent"
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ delay: 0.4, duration: 0.6 }}
                              style={{ transformOrigin: 'left' }}
                            ></motion.div>
                          </motion.div>
                          
                          {/* AI Response Content with enhanced styling and animation */}
                          <motion.div 
                            className={cn("ai-response-content bg-gradient-to-br from-blue-950/30 via-blue-900/20 to-indigo-950/20 border border-blue-500/20 rounded-xl p-4 shadow-lg backdrop-blur-sm relative overflow-hidden", getFontClass('aiResponse'))}
                            initial={{ y: 20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ delay: 0.3, duration: 0.6 }}
                          >
                            {/* Animated background gradient */}
                            <motion.div
                              className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5"
                              animate={{
                                x: ['-100%', '100%']
                              }}
                              transition={{
                                duration: 3,
                                repeat: Infinity,
                                ease: "linear"
                              }}
                              style={{ background: 'linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.1), transparent)' }}
                            />
                            <div className={cn("relative z-10", getFontClass('aiResponse'), getFontClass('leading'))}>
                              {/* Display title as question if available */}
                              {message.title && (
                                <div className="mb-4 pb-3 border-b border-blue-500/20">
                                  <div className="flex items-start gap-2 mb-2">
                                    <span className="text-blue-300 mt-1 flex-shrink-0">❓</span>
                                    <h3 className={cn("font-semibold text-transparent bg-gradient-to-r from-blue-200 to-indigo-200 bg-clip-text leading-tight", getFontClass('headerTitle'))}>
                                      {message.title}
                                    </h3>
                                  </div>
                                </div>
                              )}
                              <div className={cn(getFontClass('aiResponse'))}>
                                {formatAIMarkdown(message.text)}
                              </div>
                            </div>
                          </motion.div>
                        </motion.div>
                      ) : (
                        <div className={cn(
                          "break-words overflow-wrap-anywhere font-normal",
                          getFontClass('messageText'),
                          getFontClass('leading')
                        )}>
                          {formatTextWithLinks(message.text)}
                        </div>
                      )}
                      
                      {/* Message timestamp for own messages */}
                      {message.isOwn && (
                        <div className={cn("mt-2.5 text-right", getFontClass('timestamp'))} style={{ color: '#E5E7EB' }}>
                          {formatTime(message.timestamp)}
                        </div>
                      )}
                      
                      {/* Philonet-themed Message Actions - Positioned at right end of message */}
                      <div className={cn(
                        "absolute -top-12 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center gap-1 z-30",
                        "right-0"
                      )}>
                        {/* Quick Reactions - Philonet theme */}
                        <div className="flex bg-philonet-background border border-philonet-border rounded-full shadow-xl p-1">
                          <button
                            onClick={() => handleAddReaction(message.id, '👍')}
                            className="w-8 h-8 hover:bg-philonet-card rounded-full flex items-center justify-center transition-colors text-lg"
                            title="Like"
                          >
                            👍
                          </button>
                          <button
                            onClick={() => handleAddReaction(message.id, '❤️')}
                            className="w-8 h-8 hover:bg-philonet-card rounded-full flex items-center justify-center transition-colors text-lg"
                            title="Love"
                          >
                            ❤️
                          </button>
                          <button
                            onClick={() => handleAddReaction(message.id, '😂')}
                            className="w-8 h-8 hover:bg-philonet-card rounded-full flex items-center justify-center transition-colors text-lg"
                            title="Laugh"
                          >
                            😂
                          </button>
                          <button
                            onClick={() => {
                              console.log('More reactions button clicked for message:', message.id);
                              console.log('Current showReactionPicker state:', showReactionPicker);
                              const newState = showReactionPicker === message.id ? null : message.id;
                              console.log('Setting showReactionPicker to:', newState);
                              setShowReactionPicker(newState);
                            }}
                            className="w-8 h-8 hover:bg-philonet-card rounded-full flex items-center justify-center transition-colors"
                            title="More reactions"
                          >
                            <Smile className="w-4 h-4 text-philonet-text-secondary" />
                          </button>
                        </div>
                        
                        {/* Reply Button - Center aligned with emoji picker */}
                        <button
                          onClick={() => setReplyingTo(message.id)}
                          className="w-10 h-10 bg-philonet-background hover:bg-philonet-card rounded-full flex items-center justify-center transition-colors shadow-xl border border-philonet-border"
                          title="Reply"
                        >
                          <CornerUpLeft className="w-4 h-4 text-philonet-text-secondary" />
                        </button>
                      </div>
                    </div>

                    {/* Philonet-themed Reaction Picker - Better positioned and styled */}
                    {showReactionPicker === message.id && (
                      <div className="reaction-picker absolute -top-44 left-0 right-0 bg-gradient-to-br from-philonet-background to-philonet-card rounded-2xl p-4 shadow-2xl border-2 border-philonet-blue-500 z-50 max-w-xs mx-auto backdrop-blur-sm">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-medium text-white">Add Reaction</span>
                          <button
                            onClick={() => setShowReactionPicker(null)}
                            className="w-6 h-6 rounded-full bg-philonet-border hover:bg-philonet-text-muted transition-colors flex items-center justify-center"
                          >
                            <X className="w-3 h-3 text-white" />
                          </button>
                        </div>
                        
                        {/* Category Tabs */}
                        <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-hide">
                          {recentEmojis.length > 0 && (
                            <button
                              onClick={() => setSelectedReactionCategory('recent')}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
                                selectedReactionCategory === 'recent'
                                  ? 'bg-philonet-blue-500 text-white shadow-md'
                                  : 'bg-philonet-card text-philonet-text-secondary hover:bg-philonet-blue-500 hover:text-white'
                              }`}
                            >
                              🕐 Recent
                            </button>
                          )}
                          {Object.keys(reactionCategories).map((category) => (
                            <button
                              key={category}
                              onClick={() => setSelectedReactionCategory(category as keyof typeof reactionCategories)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
                                selectedReactionCategory === category
                                  ? 'bg-philonet-blue-500 text-white shadow-md'
                                  : 'bg-philonet-card text-philonet-text-secondary hover:bg-philonet-blue-500 hover:text-white'
                              }`}
                            >
                              {category === 'popular' && '⭐'}
                              {category === 'faces' && '😊'}
                              {category === 'hands' && '👋'}
                              {category === 'hearts' && '❤️'}
                              {category === 'animals' && '🐶'}
                              {category === 'objects' && '🔥'}
                              {' '}
                              {category.charAt(0).toUpperCase() + category.slice(1)}
                            </button>
                          ))}
                        </div>
                        
                        {/* Emoji Grid */}
                        <div className="grid grid-cols-8 gap-2 max-h-32 overflow-y-auto scrollbar-hide">
                          {(selectedReactionCategory === 'recent' ? recentEmojis : reactionCategories[selectedReactionCategory as keyof typeof reactionCategories] || []).map((emoji: string) => (
                            <button
                              key={emoji}
                              onClick={() => {
                                handleAddReaction(message.id, emoji);
                                setShowReactionPicker(null);
                              }}
                              className="p-2 hover:bg-philonet-blue-500 hover:scale-110 rounded-xl transition-all duration-200 text-lg flex items-center justify-center transform bg-philonet-card border border-philonet-border hover:border-philonet-blue-500 h-10 w-10"
                              title={emoji}
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
                        
                        {/* Arrow pointing to message */}
                        <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-gradient-to-br from-philonet-background to-philonet-card border-r-2 border-b-2 border-philonet-blue-500 rotate-45"></div>
                      </div>
                    )}

                    {/* Philonet-themed Message reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {message.reactions.map((reaction, index) => {
                          const isUserReaction = reaction.users?.includes(currentUser.id);
                          return (
                            <motion.button
                              key={index}
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ 
                                scale: 0.95,
                                transition: { duration: 0.1 }
                              }}
                              onClick={() => {
                                handleAddReaction(message.id, reaction.emoji);
                              }}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-sm transition-all duration-200 shadow-sm cursor-pointer group relative overflow-hidden ${
                                isUserReaction 
                                  ? 'bg-philonet-blue-500 border-2 border-philonet-blue-400 text-white' 
                                  : 'bg-philonet-card border border-philonet-border hover:bg-philonet-blue-500 hover:border-philonet-blue-500'
                              }`}
                              title={`React with ${reaction.emoji} (${reaction.count})${isUserReaction ? ' - You reacted' : ''}`}
                            >
                              {/* Ripple effect on click */}
                              <motion.div
                                className="absolute inset-0 bg-philonet-blue-400 rounded-full opacity-0"
                                whileTap={{
                                  scale: [0, 1],
                                  opacity: [0.5, 0],
                                }}
                                transition={{ duration: 0.3 }}
                              />
                              <motion.span 
                                className={`text-base group-hover:scale-110 transition-transform duration-200 relative z-10 ${
                                  isUserReaction ? 'drop-shadow-sm' : ''
                                }`}
                                whileTap={{ 
                                  scale: [1, 1.3, 1],
                                  rotate: [0, 15, -15, 0]
                                }}
                                transition={{ 
                                  duration: 0.4,
                                  ease: "easeInOut"
                                }}
                                key={`${reaction.emoji}-${reaction.count}`} // This will trigger animation when count changes
                              >
                                {reaction.emoji}
                              </motion.span>
                              <motion.span 
                                className={`text-xs font-medium transition-colors duration-200 relative z-10 ${
                                  isUserReaction 
                                    ? 'text-white' 
                                    : 'text-philonet-text-secondary group-hover:text-white'
                                }`}
                                whileTap={{ 
                                  scale: [1, 1.2, 1]
                                }}
                                transition={{ 
                                  duration: 0.3,
                                  ease: "easeInOut"
                                }}
                                key={`count-${reaction.count}`} // This will trigger animation when count changes
                              >
                                {reaction.count}
                              </motion.span>
                            </motion.button>
                          );
                        })}
                      </div>
                    )}

                    {message.isOwn && (
                      <div className="flex items-center justify-end gap-2 text-xs" style={{ color: '#E5E7EB' }}>
                        <span>{formatTime(message.timestamp)}</span>
                        {getStatusIcon(message.status)}
                      </div>
                    )}
                  </div>

                  {message.isOwn && (
                    <div className="flex-shrink-0">
                      {currentUser.avatar ? (
                        <img
                          src={currentUser.avatar}
                          alt={currentUser.name}
                          className="w-8 h-8 rounded-full object-cover ring-1 ring-white/20"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full flex items-center justify-center ring-1 ring-white/20" style={{ backgroundColor: '#3772FF' }}>
                          <UserRound className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </div>
                  )}
                </motion.div>
              )))
            }
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div ref={inputAreaRef} className="p-3 border-t border-philonet-border bg-philonet-background mt-auto relative">
              {/* Hover-disabled zone indicator - subtle line */}
              {selectedThought && (
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-philonet-blue-500/30 to-transparent opacity-60"></div>
              )}
              {/* Error Display */}
              {reactionError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm"
                >
                  {reactionError}
                </motion.div>
              )}
              
              {/* AI Error Display */}
              {aiError && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-3 p-3 bg-gradient-to-r from-red-500/10 to-orange-500/10 backdrop-blur-sm border border-red-500/20 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Bot className="w-5 h-5 text-red-400" />
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full"></div>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-red-300">AI Assistant Error</span>
                      </div>
                      <p className="text-xs text-red-400/80">{aiError}</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* AI Loading Display */}
              {isGeneratingAI && (
                <motion.div 
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-3 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm border border-purple-500/20 rounded-xl"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-purple-400/30 border-t-purple-400"></div>
                      <Bot className="absolute inset-0 m-auto w-3 h-3 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-purple-300">AI Assistant</span>
                        <div className="flex gap-1">
                          <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce"></div>
                          <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-1 h-1 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                      <p className="text-xs text-purple-400/80">Analyzing content and generating response...</p>
                    </div>
                  </div>
                </motion.div>
              )}
              


              {/* Enhanced WhatsApp-style Reply indicator */}
              {replyingTo && (
                <motion.div 
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="flex items-start gap-3 p-4 rounded-xl mb-3 border-l-4 shadow-lg backdrop-blur-md transition-all duration-200 hover:shadow-xl"
                  style={{
                    background: 'linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(37, 211, 102, 0.12) 100%)',
                    borderLeftColor: '#25d366',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                  }}
                >
                  <div className="flex-1 whatsapp-text min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className={cn("font-semibold text-green-400 tracking-tight", getFontClass('userName'))}>
                        {messages.find(m => m.id === replyingTo)?.author}
                      </span>
                      <div className="w-1 h-1 rounded-full bg-green-400/40 flex-shrink-0" />
                    </div>
                    <p className={cn(
                      "text-gray-200 line-clamp-2 font-light tracking-wide",
                      getFontClass('thoughtBody'),
                      getFontClass('leading')
                    )}>
                      "{messages.find(m => m.id === replyingTo)?.text.substring(0, 100)}{(messages.find(m => m.id === replyingTo)?.text.length || 0) > 100 && '...'}"
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="w-7 h-7 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-all duration-200 flex items-center justify-center flex-shrink-0 group"
                    title="Cancel reply"
                  >
                    <X className="w-4 h-4 text-gray-400 group-hover:text-red-400 transition-colors" />
                  </button>
                </motion.div>
              )}

              {/* Input Controls */}
              <div className="flex items-center gap-3">
                {/* Compact Mode Switcher - icon only */}
                <Button
                  type="button"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInputMode(inputMode === 'message' ? 'ai' : 'message');
                  }}
                  className={cn(
                    "h-10 w-10 rounded-full transition-all duration-300 flex-shrink-0 relative overflow-hidden border-2",
                    inputMode === 'ai' 
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 border-purple-400 shadow-lg shadow-purple-500/25" 
                      : "bg-philonet-blue-500 border-philonet-blue-400 shadow-lg shadow-philonet-blue-500/25"
                  )}
                  title={`${inputMode === 'ai' ? 'AI Assistant' : 'Chat Messages'} - Click to switch to ${inputMode === 'message' ? 'AI Assistant' : 'Chat Messages'}`}
                >
                  <motion.div
                    key={inputMode}
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                    className="relative z-10"
                  >
                    {inputMode === 'ai' ? (
                      <Bot className="w-4 h-4 text-white" />
                    ) : (
                      <MessageSquare className="w-4 h-4 text-white" />
                    )}
                  </motion.div>
                </Button>

                <div className="flex-1">
                  {inputMode === 'message' ? (
                    <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-philonet-card rounded-2xl border border-philonet-border focus-within:border-philonet-blue-500 relative">
                      {/* Subtle mode indicator */}
                      <div className="absolute -top-1 left-3 px-2 py-0.5 bg-philonet-blue-500 text-white text-xs font-medium rounded-full opacity-75">
                        💬
                      </div>
                      <Textarea
                        ref={messageInputRef}
                        placeholder="Type a message..."
                        value={messageText}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMessageText(e.target.value)}
                        rows={1}
                        className="flex-1 bg-transparent text-white resize-none max-h-32 min-h-[2rem]"
                        onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            e.stopPropagation();
                            if (messageText.trim()) {
                              handleSendMessage();
                            }
                          }
                        }}
                      />
                      <Button
                        type="button"
                        className="h-8 w-8 p-0 rounded-full flex-shrink-0"
                        onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowEmojiPicker(!showEmojiPicker);
                        }}
                        title="Add emoji"
                      >
                        <Smile className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="relative">
                      <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl border border-purple-500/30 focus-within:border-purple-500/50 transition-all duration-200">
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="relative">
                            <Bot className="w-4 h-4 text-purple-400 flex-shrink-0" />
                            <div className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-purple-400 rounded-full animate-pulse"></div>
                          </div>
                        </div>
                        <Textarea
                          placeholder="Ask AI about this topic..."
                          value={aiQuestion}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiQuestion(e.target.value)}
                          rows={1}
                          className="flex-1 bg-transparent text-white placeholder:text-purple-300/60 resize-none max-h-32 min-h-[2rem] border-none focus:ring-0"
                          onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              e.stopPropagation();
                              if (aiQuestion.trim()) {
                                handleAskAI();
                              }
                            }
                          }}
                        />
                      </div>
                      {/* Compact AI mode indicator */}
                      <div className="absolute -top-1 left-3 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-medium rounded-full opacity-90">
                        🤖 AI
                      </div>
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (inputMode === 'message' && messageText.trim() && !isGeneratingAI) {
                      handleSendMessage();
                    } else if (inputMode === 'ai' && aiQuestion.trim() && !isGeneratingAI) {
                      handleAskAI();
                    }
                  }}
                  disabled={
                    isGeneratingAI || 
                    (inputMode === 'message' ? !messageText.trim() : !aiQuestion.trim())
                  }
                  title={inputMode === 'ai' ? "Send AI question" : "Send message"}
                  className={cn(
                    "h-10 w-10 rounded-full disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 relative overflow-hidden transition-all duration-300",
                    inputMode === 'ai' 
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/25"
                      : "bg-philonet-blue-500 hover:bg-philonet-blue-600",
                    showSendEffect && (inputMode === 'ai' 
                      ? "scale-110 shadow-lg shadow-purple-500/50" 
                      : "scale-110 shadow-lg shadow-philonet-blue-500/50")
                  )}
                >
                  {/* Ripple effect */}
                  <motion.div
                    key={showSendEffect ? 'active' : 'inactive'}
                    className="absolute inset-0 bg-white rounded-full"
                    initial={{ scale: 0, opacity: 0.8 }}
                    animate={showSendEffect ? { scale: 2, opacity: 0 } : { scale: 0, opacity: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                  />
                  {/* Pulse effect */}
                  <motion.div
                    className={cn(
                      "absolute inset-0 rounded-full",
                      inputMode === 'ai' ? "bg-purple-300" : "bg-philonet-blue-300"
                    )}
                    animate={showSendEffect ? {
                      scale: [1, 1.5, 1],
                      opacity: [0.5, 0, 0.5]
                    } : {}}
                    transition={{ duration: 0.8, repeat: showSendEffect ? 2 : 0 }}
                  />
                  <motion.div
                    className="relative z-10"
                    animate={showSendEffect ? {
                      rotate: [0, 360],
                      scale: [1, 1.2, 1]
                    } : {}}
                    transition={{ duration: 0.6 }}
                  >
                    {isGeneratingAI ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Send className="w-4 h-4 text-white" />
                    )}
                  </motion.div>
                </Button>
              </div>

              {/* Philonet-themed Emoji Picker for Input */}
              {showEmojiPicker && (
                <div className="emoji-picker-container absolute bottom-20 left-3 right-3 bg-philonet-background rounded-xl p-4 border border-philonet-border shadow-2xl z-20">
                  <div className="flex gap-1 mb-3 overflow-x-auto scrollbar-hide">
                    {recentEmojis.length > 0 && (
                      <button
                        onClick={() => setSelectedReactionCategory('recent')}
                        className={`px-3 py-2 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
                          selectedReactionCategory === 'recent'
                            ? 'bg-philonet-blue-500 text-white shadow-sm'
                            : 'bg-philonet-card text-philonet-text-secondary hover:bg-philonet-border hover:text-white'
                        }`}
                      >
                        🕐 Recent
                      </button>
                    )}
                    {Object.keys(reactionCategories).map((category) => (
                      <button
                        key={category}
                        onClick={() => setSelectedReactionCategory(category as keyof typeof reactionCategories)}
                        className={`px-3 py-2 rounded-full text-xs font-medium transition-colors flex-shrink-0 ${
                          selectedReactionCategory === category
                            ? 'bg-philonet-blue-500 text-white shadow-sm'
                            : 'bg-philonet-card text-philonet-text-secondary hover:bg-philonet-border hover:text-white'
                        }`}
                      >
                        {category === 'popular' && '⭐'}
                        {category === 'faces' && '😊'}
                        {category === 'hands' && '👋'}
                        {category === 'hearts' && '❤️'}
                        {category === 'animals' && '🐶'}
                        {category === 'objects' && '🔥'}
                        {' '}
                        {category}
                      </button>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-8 gap-2 max-h-40 overflow-y-auto scrollbar-hide">
                    {(selectedReactionCategory === 'recent' ? recentEmojis : reactionCategories[selectedReactionCategory as keyof typeof reactionCategories] || []).map((emoji: string) => (
                      <button
                        key={emoji}
                        onClick={() => insertEmojiAtCursor(emoji)}
                        className="p-2 hover:bg-philonet-card rounded-lg transition-all duration-200 text-xl flex items-center justify-center hover:scale-110 transform h-10 w-10"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              <AnimatePresence>
                {isTyping && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="mt-2 text-sm text-philonet-text-muted flex items-center gap-2"
                  >
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-philonet-blue-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-philonet-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-philonet-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span>Someone is typing...</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </>
        ) : (
          /* No conversation selected */
          <div className="flex-1 flex items-center justify-center bg-philonet-background">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 text-philonet-text-muted mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Select a Thought Room</h3>
              <p className="text-philonet-text-secondary">
                Choose a conversation from the left to begin chatting
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Custom Scrollbar Styles */}
      <style>{`
        /* Minimal sidebar pattern */
        .sidebar-background {
          background-color: var(--philonet-background);
          background-image: 
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 25px,
              rgba(255, 255, 255, 0.008) 25px,
              rgba(255, 255, 255, 0.008) 26px
            );
        }
        
        /* WhatsApp/Telegram-style patterned background */
        .message-background {
          background-color: #0D1117;
          background-image: 
            /* Main geometric pattern */
            repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(255, 255, 255, 0.02) 10px,
              rgba(255, 255, 255, 0.02) 11px
            ),
            repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 10px,
              rgba(255, 255, 255, 0.015) 10px,
              rgba(255, 255, 255, 0.015) 11px
            ),
            /* Diamond pattern overlay */
            repeating-conic-gradient(
              from 45deg at 50% 50%,
              transparent 0deg,
              rgba(55, 114, 255, 0.008) 90deg,
              transparent 180deg,
              rgba(55, 114, 255, 0.008) 270deg,
              transparent 360deg
            );
          background-size: 30px 30px, 30px 30px, 60px 60px;
          background-position: 0 0, 0 0, 15px 15px;
        }
        
        .philonet-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        
        .philonet-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .philonet-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }
        
        .philonet-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        /* Flash highlight effect for referenced messages */
        .flash-highlight {
          animation: flashHighlight 2s ease-in-out;
        }

        @keyframes flashHighlight {
          0% { 
            box-shadow: 0 0 0 rgba(55, 114, 255, 0.6);
            background-color: rgba(55, 114, 255, 0.1);
          }
          25% { 
            box-shadow: 0 0 20px rgba(55, 114, 255, 0.8);
            background-color: rgba(55, 114, 255, 0.2);
          }
          50% { 
            box-shadow: 0 0 15px rgba(55, 114, 255, 0.6);
            background-color: rgba(55, 114, 255, 0.15);
          }
          75% { 
            box-shadow: 0 0 10px rgba(55, 114, 255, 0.4);
            background-color: rgba(55, 114, 255, 0.1);
          }
          100% { 
            box-shadow: 0 0 0 rgba(55, 114, 255, 0);
            background-color: transparent;
          }
        }

        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .line-clamp-3 {
          display: -webkit-box;
          -webkit-line-clamp: 3;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .overflow-wrap-anywhere {
          overflow-wrap: anywhere;
          word-break: break-word;
          hyphens: auto;
        }

        /* Ensure links break properly on all browsers */
        a {
          word-break: break-all;
          overflow-wrap: anywhere;
        }

        /* WhatsApp-style animations */
        .hover\:scale-110:hover {
          transform: scale(1.1);
        }

        /* AI Mode Enhancements */
        .ai-mode-gradient {
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
          animation: aiGlow 3s ease-in-out infinite alternate;
        }

        @keyframes aiGlow {
          0% { 
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.2);
          }
          100% { 
            box-shadow: 0 0 30px rgba(236, 72, 153, 0.3);
          }
        }

        .ai-pulse {
          animation: aiPulse 2s ease-in-out infinite;
        }

        @keyframes aiPulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 0.8;
          }
          50% { 
            transform: scale(1.05);
            opacity: 1;
          }
        }

        .ai-gradient-text {
          background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Message bubble styling improvements */
        .group:hover .message-actions {
          opacity: 1;
          visibility: visible;
        }

        .message-actions {
          opacity: 0;
          visibility: hidden;
          transition: opacity 0.2s ease, visibility 0.2s ease;
        }

        /* Modern high-contrast dark theme bubble effects */
        .group {
          transition: all 0.2s ease;
        }

        .group:hover {
          transform: translateY(-1px);
        }

        /* Enhanced shadows for the new color scheme */
        .group div[style*="#3772FF"] {
          box-shadow: 0 4px 12px rgba(55, 114, 255, 0.2), 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .group div[style*="#3772FF"]:hover {
          box-shadow: 0 6px 16px rgba(55, 114, 255, 0.25), 0 4px 8px rgba(0, 0, 0, 0.4);
        }

        .group div[class*="bg-[#3A3A3A]"] {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(255, 255, 255, 0.05);
        }

        .group div[class*="bg-[#3A3A3A]"]:hover {
          box-shadow: 0 6px 16px rgba(0, 0, 0, 0.5), 0 4px 8px rgba(255, 255, 255, 0.08);
        }

        /* Subtle inner glow for better definition */
        .group div[class*="rounded-2xl"] {
          position: relative;
        }

        .group div[class*="rounded-2xl"]:before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: inherit;
          padding: 1px;
          background: linear-gradient(135deg, rgba(255,255,255,0.05), transparent, rgba(255,255,255,0.01));
          mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
          mask-composite: xor;
          pointer-events: none;
        }

        /* High-contrast link styling */
        .group a {
          color: #60A5FA !important;
          transition: all 0.2s ease;
          border-radius: 4px;
          padding: 1px 4px;
          text-decoration-color: rgba(96, 165, 250, 0.6);
        }

        .group a:hover {
          color: #93C5FD !important;
          background: rgba(96, 165, 250, 0.15);
          text-decoration-color: #93C5FD;
        }

        /* Enhanced message text contrast */
        .group div[class*="bg-[#3A3A3A]"] {
          color: #FFFFFF;
        }

        .group div[style*="#3772FF"] {
          color: #FFFFFF;
        }

        /* Better text readability */
        .group div[class*="text-[16px]"] {
          font-weight: 400;
          letter-spacing: 0.01em;
        }

        /* Special send effect animations */
        @keyframes messageSuccess {
          0% { transform: scale(1); }
          50% { transform: scale(1.05); box-shadow: 0 0 30px rgba(34, 197, 94, 0.8); }
          100% { transform: scale(1); }
        }

        @keyframes sendButtonPulse {
          0% { transform: scale(1); box-shadow: 0 0 0 rgba(55, 114, 255, 0); }
          50% { transform: scale(1.1); box-shadow: 0 0 20px rgba(55, 114, 255, 0.6); }
          100% { transform: scale(1); box-shadow: 0 0 0 rgba(55, 114, 255, 0); }
        }

        @keyframes particleFloat {
          0% { transform: translateY(0) scale(0) rotate(0deg); opacity: 1; }
          25% { transform: translateY(-20px) scale(1.2) rotate(90deg); opacity: 1; }
          75% { transform: translateY(-60px) scale(0.8) rotate(270deg); opacity: 0.8; }
          100% { transform: translateY(-100px) scale(0) rotate(360deg); opacity: 0; }
        }

        /* Enhanced hover effects with sound-like visual feedback */
        .send-button-active {
          animation: sendButtonPulse 0.6s ease-out;
        }

        .message-success {
          animation: messageSuccess 0.8s ease-out;
        }

        /* Ripple effect for successful actions */
        @keyframes ripple {
          0% { transform: scale(0); opacity: 1; }
          100% { transform: scale(4); opacity: 0; }
        }

        .ripple-effect::before {
          content: '';
          position: absolute;
          top: 50%;
          left: 50%;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: rgba(34, 197, 94, 0.6);
          transform: translate(-50%, -50%) scale(0);
          animation: ripple 0.6s linear;
        }

        /* Subtle screen shake for haptic feedback simulation */
        @keyframes screenShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-1px); }
          75% { transform: translateX(1px); }
        }

        .shake-screen {
          animation: screenShake 0.3s ease-in-out;
        }

        /* Glowing effect for successful messages */
        @keyframes messageGlow {
          0% { box-shadow: 0 0 5px rgba(34, 197, 94, 0.3); }
          50% { box-shadow: 0 0 20px rgba(34, 197, 94, 0.6), 0 0 30px rgba(34, 197, 94, 0.4); }
          100% { box-shadow: 0 0 5px rgba(34, 197, 94, 0.3); }
        }

        .glow-success {
          animation: messageGlow 1s ease-in-out;
        }

        /* Enhanced WhatsApp-style reply indicators */
        .whatsapp-reply {
          border-left: 4px solid #25d366;
          background: linear-gradient(135deg, rgba(37, 211, 102, 0.08) 0%, rgba(37, 211, 102, 0.12) 100%);
          border-radius: 12px;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          backdrop-filter: blur(8px);
          box-shadow: 0 2px 8px rgba(37, 211, 102, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .whatsapp-reply:hover {
          background: linear-gradient(135deg, rgba(37, 211, 102, 0.12) 0%, rgba(37, 211, 102, 0.18) 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(37, 211, 102, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        .whatsapp-reply-own {
          border-left: 4px solid rgba(255, 255, 255, 0.7);
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.08) 0%, rgba(0, 0, 0, 0.12) 100%);
          backdrop-filter: blur(8px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .whatsapp-reply-own:hover {
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.12) 0%, rgba(0, 0, 0, 0.18) 100%);
          transform: translateY(-1px);
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.15);
        }

        /* Enhanced WhatsApp-style in-message reply indicators */
        .whatsapp-reply-in-message {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.1) 100%);
          backdrop-filter: blur(12px);
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
          border-radius: 12px;
        }

        .whatsapp-reply-in-message:hover {
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.15) 100%);
          transform: translateY(-2px);
        }

        .whatsapp-reply-in-message-own {
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.1) 0%, rgba(0, 0, 0, 0.15) 100%);
          backdrop-filter: blur(10px);
        }

        .whatsapp-reply-in-message-own:hover {
          background: linear-gradient(135deg, rgba(0, 0, 0, 0.15) 0%, rgba(0, 0, 0, 0.25) 100%);
          transform: translateY(-2px);
        }

        /* Enhanced WhatsApp-style text */
        .whatsapp-text {
          font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.4;
          word-wrap: break-word;
          overflow-wrap: break-word;
          letter-spacing: 0.2px;
        }

        /* Enhanced WhatsApp-style animations */
        .whatsapp-fade-in {
          animation: whatsappFadeIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes whatsappFadeIn {
          from {
            opacity: 0;
            transform: translateY(8px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* Enhanced reply hover effects */
        .whatsapp-reply-hover {
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .whatsapp-reply-hover:hover {
          transform: translateY(-2px);
        }

        /* Enhanced left border styles */
        .border-l-4 {
          border-left-width: 4px;
        }

        /* Enhanced WhatsApp-style reply slide animation */
        @keyframes whatsappReplySlide {
          from {
            opacity: 0;
            transform: translateX(-12px) scale(0.96);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }

        .whatsapp-reply-slide {
          animation: whatsappReplySlide 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        /* Enhanced pulse effect for new replies */
        @keyframes whatsappPulse {
          0% {
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.4);
          }
          50% {
            box-shadow: 0 0 0 8px rgba(37, 211, 102, 0.1);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(37, 211, 102, 0);
          }
        }

        .whatsapp-pulse {
          animation: whatsappPulse 1.5s ease-out;
        }

        /* Enhanced scroll indicator */
        .whatsapp-scroll-indicator {
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
          opacity: 0.6;
          transition: opacity 0.2s ease;
        }

        .whatsapp-reply-hover:hover .whatsapp-scroll-indicator {
          opacity: 1;
        }

        /* AI Response Enhanced Styling */
        .ai-response-content {
          position: relative;
          overflow: hidden;
        }

        .ai-response-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.05) 0%, rgba(99, 102, 241, 0.02) 100%);
          pointer-events: none;
        }

        /* Font size responsive AI content */
        .ai-response-content.text-sm p { font-size: 0.875rem; line-height: 1.5; }
        .ai-response-content.text-sm h1 { font-size: 1.25rem; }
        .ai-response-content.text-sm h2 { font-size: 1.125rem; }
        .ai-response-content.text-sm h3 { font-size: 1rem; }
        .ai-response-content.text-sm code { font-size: 0.75rem; }

        .ai-response-content.text-base p { font-size: 1rem; line-height: 1.6; }
        .ai-response-content.text-base h1 { font-size: 1.5rem; }
        .ai-response-content.text-base h2 { font-size: 1.25rem; }
        .ai-response-content.text-base h3 { font-size: 1.125rem; }
        .ai-response-content.text-base code { font-size: 0.875rem; }

        .ai-response-content.text-lg p { font-size: 1.125rem; line-height: 1.6; }
        .ai-response-content.text-lg h1 { font-size: 1.75rem; }
        .ai-response-content.text-lg h2 { font-size: 1.5rem; }
        .ai-response-content.text-lg h3 { font-size: 1.25rem; }
        .ai-response-content.text-lg code { font-size: 1rem; }

        .ai-response-content.text-xl p { font-size: 1.25rem; line-height: 1.75; }
        .ai-response-content.text-xl h1 { font-size: 2rem; }
        .ai-response-content.text-xl h2 { font-size: 1.75rem; }
        .ai-response-content.text-xl h3 { font-size: 1.5rem; }
        .ai-response-content.text-xl code { font-size: 1.125rem; }

        .ai-response-content code {
          position: relative;
          z-index: 1;
        }

        .ai-response-content pre {
          position: relative;
          z-index: 1;
          scrollbar-width: thin;
          scrollbar-color: rgba(59, 130, 246, 0.3) transparent;
        }

        .ai-response-content pre::-webkit-scrollbar {
          height: 6px;
        }

        .ai-response-content pre::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.2);
          border-radius: 3px;
        }

        .ai-response-content pre::-webkit-scrollbar-thumb {
          background: rgba(59, 130, 246, 0.4);
          border-radius: 3px;
        }

        .ai-response-content pre::-webkit-scrollbar-thumb:hover {
          background: rgba(59, 130, 246, 0.6);
        }

        /* Enhanced animations and effects */
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes slideInFromLeft {
          from {
            opacity: 0;
            transform: translateX(-20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }

        @keyframes bounceIn {
          0% {
            opacity: 0;
            transform: scale(0.3);
          }
          50% {
            opacity: 1;
            transform: scale(1.05);
          }
          70% {
            transform: scale(0.9);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes shimmer {
          0% {
            background-position: -200px 0;
          }
          100% {
            background-position: calc(200px + 100%) 0;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.6s ease-out;
        }

        .animate-slideInFromLeft {
          animation: slideInFromLeft 0.4s ease-out;
        }

        .animate-bounceIn {
          animation: bounceIn 0.8s ease-out;
        }

        /* Enhanced code block styling */
        .ai-response-content pre {
          background: linear-gradient(135deg, rgba(17, 24, 39, 0.9) 0%, rgba(31, 41, 55, 0.8) 100%);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(59, 130, 246, 0.1);
        }

        .ai-response-content code {
          background: transparent;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        /* Table hover effects */
        .ai-response-content table tbody tr:hover {
          background: rgba(59, 130, 246, 0.08);
          transform: translateX(2px);
          transition: all 0.2s ease;
        }

        /* Link hover effects */
        .ai-response-content a {
          position: relative;
          overflow: hidden;
        }

        .ai-response-content a::before {
          content: '';
          position: absolute;
          top: 0;
          left: -100%;
          width: 100%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(59, 130, 246, 0.2), transparent);
          transition: left 0.5s;
        }

        .ai-response-content a:hover::before {
          left: 100%;
        }

        /* Blockquote enhanced styling */
        .ai-response-content blockquote {
          position: relative;
          overflow: hidden;
        }

        .ai-response-content blockquote::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          bottom: 0;
          width: 4px;
          background: linear-gradient(to bottom, #3b82f6, #6366f1);
          animation: shimmer 2s infinite;
        }

        /* List item animations */
        .ai-response-content li {
          animation: slideInFromLeft 0.3s ease-out;
          animation-fill-mode: both;
        }

        .ai-response-content li:nth-child(1) { animation-delay: 0.1s; }
        .ai-response-content li:nth-child(2) { animation-delay: 0.2s; }
        .ai-response-content li:nth-child(3) { animation-delay: 0.3s; }
        .ai-response-content li:nth-child(4) { animation-delay: 0.4s; }
        .ai-response-content li:nth-child(5) { animation-delay: 0.5s; }

        /* Enhanced task list styling */
        .ai-response-content .task-list-item {
          position: relative;
          padding-left: 2rem;
        }

        .ai-response-content .task-list-item input[type="checkbox"] {
          position: absolute;
          left: 0;
          top: 0.25rem;
          width: 1rem;
          height: 1rem;
          accent-color: #3b82f6;
        }

        /* Math expression styling */
        .ai-response-content .math {
          background: linear-gradient(135deg, rgba(147, 51, 234, 0.1) 0%, rgba(79, 70, 229, 0.1) 100%);
          border: 1px solid rgba(147, 51, 234, 0.2);
          border-radius: 6px;
          padding: 0.25rem 0.5rem;
          font-family: 'JetBrains Mono', 'Fira Code', monospace;
          color: #c4b5fd;
        }

        /* Gradient text effects */
        .gradient-text {
          background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #34d399 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        /* Copy button enhanced styling */
        .copy-button {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.2) 0%, rgba(99, 102, 241, 0.2) 100%);
          backdrop-filter: blur(4px);
          border: 1px solid rgba(59, 130, 246, 0.3);
          transition: all 0.3s ease;
        }

        .copy-button:hover {
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.3) 0%, rgba(99, 102, 241, 0.3) 100%);
          border-color: rgba(59, 130, 246, 0.5);
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
        }
      `}</style>
    </div>
  );
};

export default ConversationRoom;
