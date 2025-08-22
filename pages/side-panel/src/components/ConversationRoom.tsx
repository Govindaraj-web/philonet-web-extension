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
  X
} from 'lucide-react';
import { cn } from '@extension/ui';
import { Button, Textarea } from './ui';

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
  reactions?: { emoji: string; count: number; users: string[] }[];
  avatar?: string;
  isRead?: boolean;
  status?: 'sending' | 'sent' | 'delivered' | 'read';
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
  onThoughtSelect: (thoughtId: string) => void;
  onSendMessage: (message: string, thoughtId: string) => void;
  onAskAI: (question: string, thoughtId: string) => void;
}

const ConversationRoom: React.FC<ConversationRoomProps> = ({
  thoughtStarters = [],
  selectedThoughtId,
  currentUser = { id: 'user1', name: 'You', avatar: undefined },
  messages: externalMessages = [], // Add external messages prop
  isLoadingMessages = false, // Add loading state prop
  messagesError = null, // Add error state prop
  onThoughtSelect,
  onSendMessage,
  onAskAI
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [messageText, setMessageText] = useState('');
  const [aiQuestion, setAiQuestion] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [inputMode, setInputMode] = useState<'message' | 'ai'>('message');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isHeaderShrunk, setIsHeaderShrunk] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showReactionPicker, setShowReactionPicker] = useState<string | null>(null);
  
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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
  const [isLeftSidebarHovered, setIsLeftSidebarHovered] = useState(false);
  const [showSendEffect, setShowSendEffect] = useState(false);
  const [particles, setParticles] = useState<Array<{id: number, x: number, y: number, emoji: string}>>([]);
  const [successPulse, setSuccessPulse] = useState<string | null>(null);

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

  const handleAddReaction = (messageId: string, emoji: string) => {
    // Add to recent emojis
    setRecentEmojis(prev => {
      const filtered = prev.filter(e => e !== emoji);
      return [emoji, ...filtered].slice(0, 8); // Keep only 8 recent emojis
    });

    setMessages(prevMessages => 
      prevMessages.map(msg => {
        if (msg.id === messageId) {
          const existingReactions = msg.reactions || [];
          const existingReaction = existingReactions.find(r => r.emoji === emoji);
          
          if (existingReaction) {
            // Increment count and add current user to users array
            return {
              ...msg,
              reactions: existingReactions.map(r => 
                r.emoji === emoji ? { 
                  ...r, 
                  count: r.count + 1,
                  users: [...(r.users || []), currentUser.id]
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
        }
        return msg;
      })
    );
    setShowReactionPicker(null);
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
      
      // Merge external messages with any local pending messages
      setMessages(prevMessages => {
        const pendingMessages = prevMessages.filter(msg => 
          (msg.status === 'sending' || msg.status === 'sent') && 
          (msg.isOwn && !externalMessages.some(extMsg => extMsg.id === msg.id))
        );
        
        // Combine external messages with pending local messages
        const mergedMessages = [...externalMessages, ...pendingMessages];
        
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
  const displayThoughtStarters = thoughtStarters.length > 0 ? thoughtStarters : [];
  const selectedThought = displayThoughtStarters.find(t => t.id === selectedThoughtId) || displayThoughtStarters[0];

  // Filter thought starters based on search
  const filteredThoughts = displayThoughtStarters.filter(thought =>
    thought.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thought.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    thought.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
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
    const tempId = `temp-${Date.now()}`;
    const newMessage: Message = {
      id: tempId,
      text: messageTextToSend,
      author: currentUser.name,
      timestamp: new Date().toISOString(),
      isOwn: true,
      type: 'text',
      status: 'sending'
    };

    // Add message to UI immediately for seamless experience
    setMessages(prev => [...prev, newMessage]);
    
    // Clear input immediately
    setMessageText('');

    // Reset send effect
    setTimeout(() => {
      setShowSendEffect(false);
    }, 600);

    try {
      // Update status to sent immediately for better UX (optimistic update)
      setTimeout(() => {
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...msg, status: 'sent' } : msg
        ));
        playSound('success');
        setSuccessPulse(tempId);
        setTimeout(() => setSuccessPulse(null), 800);
      }, 300);

      // Call the parent handler in a non-blocking way
      const sendPromise = new Promise<void>((resolve, reject) => {
        setTimeout(() => {
          try {
            onSendMessage(messageTextToSend, selectedThought.id);
            resolve();
          } catch (error) {
            console.error('Error in parent onSendMessage:', error);
            reject(error);
          }
        }, 0);
      });

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

      // Wait for send completion in background
      await sendPromise;

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

    console.log('🤖 Asking AI (seamless mode):', aiQuestion);

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
    const userMessage: Message = {
      id: Date.now().toString(),
      text: `🤖 ${questionToSend}`,
      author: currentUser.name,
      timestamp: new Date().toISOString(),
      isOwn: true,
      type: 'text',
      status: 'sent'
    };

    // Add message to UI immediately
    setMessages(prev => [...prev, userMessage]);
    
    // Clear input and reset mode immediately
    setAiQuestion('');
    setInputMode('message');

    // Reset send effect
    setTimeout(() => {
      setShowSendEffect(false);
    }, 600);

    try {
      // Call the parent handler in a non-blocking way
      setTimeout(() => {
        try {
          onAskAI(questionToSend, selectedThought.id);
        } catch (error) {
          console.error('Error in parent onAskAI:', error);
        }
      }, 0);

      // Play success sound for AI question
      setTimeout(() => {
        playSound('success');
        setSuccessPulse(userMessage.id);
        setTimeout(() => setSuccessPulse(null), 800);
      }, 300);

      // Simulate AI response with special sound (keep this for demo purposes)
      setTimeout(() => {
        const aiResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: 'Let me analyze that question based on the article content...',
          author: 'AI Assistant',
          timestamp: new Date().toISOString(),
          isOwn: false,
          type: 'ai-response',
          status: 'delivered'
        };
        setMessages(prev => [...prev, aiResponse]);
        // Play a different sound for AI response
        playSound('celebration');
      }, 1500);

    } catch (error) {
      console.error('Error sending AI question:', error);
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

      {/* Left Sidebar - Thought Starters - Hidden on mobile when conversation is selected */}
      <div 
        className={cn(
          "border-r border-philonet-border transition-all duration-300 ease-in-out sidebar-background",
          selectedThought ? "hidden sm:block" : "w-full",
          selectedThought && !isLeftSidebarHovered 
            ? "sm:w-[300px] md:w-[320px] sm:min-w-[300px] md:min-w-[320px] sm:max-w-[300px] md:max-w-[320px]"
            : selectedThought && isLeftSidebarHovered
            ? "sm:w-[450px] md:w-[500px] sm:min-w-[450px] md:min-w-[500px] sm:max-w-[450px] md:max-w-[500px]"
            : "sm:w-1/2 md:w-1/3 sm:min-w-[280px] md:min-w-[320px] sm:max-w-[350px] md:max-w-[400px]"
        )}
        onMouseEnter={() => setIsLeftSidebarHovered(true)}
        onMouseLeave={() => setIsLeftSidebarHovered(false)}
      >
        {/* Enhanced Header with Telegram-style typography */}
        <div className="p-4 border-b border-philonet-border bg-philonet-background relative z-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-philonet-text-primary flex items-center gap-3">
              <TrendingUp className="w-6 h-6 text-philonet-blue-500" />
              Conversations
            </h2>
          </div>

          {/* Enhanced Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-philonet-text-muted" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-philonet-card border border-philonet-border rounded-lg text-philonet-text-primary placeholder:text-philonet-text-muted focus:outline-none focus:border-philonet-blue-500 transition-colors"
            />
          </div>
        </div>

        {/* Thought Starters List */}
        <div className="overflow-y-auto flex-1 philonet-scrollbar">
          {filteredThoughts.map((thought) => (
            <motion.div
              key={thought.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{ scale: 1.01, transition: { duration: 0.15 } }}
              className={cn(
                "p-3 border-b border-philonet-border cursor-pointer transition-all duration-200",
                "hover:bg-philonet-card hover:bg-opacity-50",
                selectedThought?.id === thought.id 
                  ? "bg-philonet-blue-500 bg-opacity-15 border-l-4 border-l-philonet-blue-500" 
                  : ""
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
        </div>
      </div>

      {/* Right Panel - Conversation */}
      <div className={cn(
        "flex flex-col min-w-0 overflow-hidden",
        selectedThought ? "w-full sm:flex-1" : "hidden sm:flex sm:flex-1"
      )}>
        {selectedThought ? (
          <>
            {/* Enhanced Conversation Header */}
            <div className={cn(
              "p-3 sm:p-4 border-b border-philonet-border bg-philonet-background transition-all duration-300",
              isHeaderShrunk ? "py-2" : "py-3 sm:py-4"
            )}>
              {/* Mobile back button */}
              <div className="flex items-center gap-3 mb-3 sm:hidden">
                <button
                  onClick={() => onThoughtSelect('')}
                  className="p-2 hover:bg-philonet-border rounded-lg transition-colors"
                >
                  <ArrowLeft className="w-5 h-5 text-philonet-text-secondary" />
                </button>
                <span className="text-sm text-philonet-text-muted">Back to discussions</span>
              </div>
              
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-start gap-3 flex-1">
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
                      <h3 className="font-semibold text-white text-lg leading-tight">{selectedThought.author?.name || 'Anonymous'}</h3>
                      <span className="text-xs text-philonet-text-muted">•</span>
                      <span className="text-xs text-philonet-text-muted">2h ago</span>
                      <span className="text-xs text-philonet-blue-400 font-medium">💭 2.14m</span>
                    </div>

                    {/* Thought Body Preview */}
                    {selectedThought.thoughtBody && (
                      <p className="text-sm text-philonet-text-secondary line-clamp-2 mb-2 leading-relaxed break-words overflow-hidden">
                        {selectedThought.thoughtBody}
                      </p>
                    )}

                    {/* Simplified Stats - Focus on Upvotes */}
                    <div className="flex items-center gap-4 text-sm text-philonet-text-muted mb-2">
                      <span className="flex items-center gap-1.5 font-medium text-green-400">
                        <ThumbsUp className="w-4 h-4" />
                        {selectedThought.reactions?.likes || 256}
                      </span>
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
                  <Button className="h-9 w-9 p-0 rounded-full bg-philonet-card hover:bg-philonet-border border-0 transition-all">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Refined Tagged Content Section - Telegram style */}
              {selectedThought.taggedContent && (
                <div className="mb-3 p-3 bg-philonet-card border-l-4 border-philonet-blue-500 rounded-r-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Quote className="w-3.5 h-3.5 text-philonet-blue-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-philonet-blue-500 uppercase tracking-wide">Referenced</span>
                  </div>
                  <blockquote className="text-sm text-philonet-text-secondary leading-relaxed line-clamp-2 break-words overflow-hidden">
                    <span className="text-philonet-text-muted opacity-60">"</span>
                    {selectedThought.taggedContent.highlightedText}
                    <span className="text-philonet-text-muted opacity-60">"</span>
                  </blockquote>
                </div>
              )}
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
                messages.map((message) => (
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
                          className="text-[14px] font-semibold break-words overflow-hidden text-white"
                          style={{ color: getUserColor(message.author) }}
                        >
                          {message.author}
                        </span>
                        <span className="text-xs font-normal" style={{ color: '#E5E7EB' }}>
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
                      <div className="text-[16px] leading-[1.6] break-words overflow-wrap-anywhere font-normal">
                        {formatTextWithLinks(message.text)}
                      </div>
                      
                      {/* Message timestamp for own messages */}
                      {message.isOwn && (
                        <div className="text-xs mt-2.5 text-right" style={{ color: '#E5E7EB' }}>
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
              ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-philonet-border bg-philonet-background mt-auto relative">
              {/* Mode Toggle */}
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInputMode('message');
                  }}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm transition-colors",
                    inputMode === 'message'
                      ? "bg-philonet-blue-500 text-white"
                      : "bg-philonet-card text-philonet-text-muted hover:text-white"
                  )}
                >
                  <MessageSquare className="w-4 h-4 inline mr-1" />
                  Message
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setInputMode('ai');
                  }}
                  className={cn(
                    "px-3 py-1 rounded-full text-sm transition-colors",
                    inputMode === 'ai'
                      ? "bg-philonet-blue-500 text-white"
                      : "bg-philonet-card text-philonet-text-muted hover:text-white"
                  )}
                >
                  <Bot className="w-4 h-4 inline mr-1" />
                  Ask AI
                </button>
              </div>

              {/* Philonet-themed Reply indicator */}
              {replyingTo && (
                <div className="flex items-start gap-3 p-3 bg-philonet-card rounded-lg border-l-4 border-philonet-blue-500 mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <CornerUpLeft className="w-4 h-4 text-philonet-blue-400" />
                      <span className="text-sm font-medium text-philonet-blue-400">
                        Replying to {messages.find(m => m.id === replyingTo)?.author}
                      </span>
                    </div>
                    <p className="text-sm text-philonet-text-secondary line-clamp-2">
                      {messages.find(m => m.id === replyingTo)?.text.substring(0, 100)}
                      {(messages.find(m => m.id === replyingTo)?.text.length || 0) > 100 && '...'}
                    </p>
                  </div>
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="w-8 h-8 hover:bg-philonet-border rounded-full transition-colors flex items-center justify-center flex-shrink-0"
                  >
                    <X className="w-4 h-4 text-philonet-text-muted" />
                  </button>
                </div>
              )}

              {/* Input Controls */}
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  {inputMode === 'message' ? (
                    <div className="flex items-center gap-2 p-2.5 sm:p-3 bg-philonet-card rounded-2xl border border-philonet-border focus-within:border-philonet-blue-500">
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
                    <div className="flex items-center gap-2 p-3 bg-philonet-blue-500 rounded-2xl border border-philonet-blue-500 focus-within:border-philonet-blue-500">
                      <Bot className="w-5 h-5 text-philonet-blue-400 flex-shrink-0" />
                      <Textarea
                        placeholder="Ask AI about this topic..."
                        value={aiQuestion}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAiQuestion(e.target.value)}
                        rows={1}
                        className="flex-1 bg-transparent text-white resize-none max-h-32 min-h-[2rem]"
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
                  )}
                </div>

                <Button
                  type="button"
                  onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (inputMode === 'message' && messageText.trim()) {
                      handleSendMessage();
                    } else if (inputMode === 'ai' && aiQuestion.trim()) {
                      handleAskAI();
                    }
                  }}
                  disabled={inputMode === 'message' ? !messageText.trim() : !aiQuestion.trim()}
                  title="Send message"
                  className={cn(
                    "h-10 w-10 rounded-full bg-philonet-blue-500 hover:bg-philonet-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 relative overflow-hidden transition-all duration-300",
                    showSendEffect && "scale-110 shadow-lg shadow-philonet-blue-500/50"
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
                    className="absolute inset-0 bg-philonet-blue-300 rounded-full"
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
                    <Send className="w-4 h-4 text-white" />
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
      `}</style>
    </div>
  );
};

export default ConversationRoom;
