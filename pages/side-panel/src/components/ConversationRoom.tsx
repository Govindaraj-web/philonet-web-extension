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
            // Increment count
            return {
              ...msg,
              reactions: existingReactions.map(r => 
                r.emoji === emoji ? { ...r, count: r.count + 1 } : r
              )
            } as Message;
          } else {
            // Add new reaction
            return {
              ...msg,
              reactions: [...existingReactions, { emoji, count: 1, users: ['currentUser'] }]
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

  // Initialize messages from external prop or fall back to demo messages
  const getDemoMessages = (): Message[] => [
    {
      id: '1',
      text: 'What\'s the hardest language you\'ve learnt/you\'re learning? 🤔',
      author: 'Mehul Aryanraj',
      timestamp: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      isOwn: false,
      type: 'thought-starter',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop&crop=face',
      isRead: true,
      status: 'read'
    },
    {
      id: '2',
      text: 'Rust for sure! The ownership model and borrowing concepts took me months to really understand. But once it clicked, it completely changed how I think about memory management.',
      author: 'Sarah Chen',
      timestamp: new Date(Date.now() - 6900000).toISOString(),
      isOwn: false,
      type: 'text',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b3e9?w=40&h=40&fit=crop&crop=face',
      reactions: [
        { emoji: '👍', count: 8, users: ['user1', 'user2', 'user3'] },
        { emoji: '💯', count: 3, users: ['user4', 'user5'] }
      ],
      isRead: true,
      status: 'read'
    },
    {
      id: '3',
      text: 'Haskell was my biggest challenge. The functional programming paradigm was so different from imperative languages. Monads still give me nightmares sometimes 😅',
      author: 'Alex Rodriguez',
      timestamp: new Date(Date.now() - 6300000).toISOString(),
      isOwn: false,
      type: 'text',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop&crop=face',
      reactions: [{ emoji: '😂', count: 12, users: ['user1', 'user2', 'user3', 'user4'] }],
      isRead: true,
      status: 'read'
    },
    {
      id: '4',
      text: 'Assembly language was brutal when I had to learn it for embedded systems. Every single instruction matters and debugging is like solving puzzles blindfolded.',
      author: currentUser?.name || 'You',
      timestamp: new Date(Date.now() - 5400000).toISOString(),
      isOwn: true,
      type: 'text',
      reactions: [
        { emoji: '🔥', count: 5, users: ['user1', 'user2'] },
        { emoji: '💪', count: 7, users: ['user3', 'user4', 'user5'] }
      ],
      isRead: true,
      status: 'read'
    },
    {
      id: '5',
      text: 'Based on your experiences, it seems like languages with paradigm shifts (functional programming, memory management concepts, low-level control) tend to be the most challenging. These often require unlearning previous assumptions about programming.',
      author: 'AI Assistant',
      timestamp: new Date(Date.now() - 4800000).toISOString(),
      isOwn: false,
      type: 'ai-response',
      isRead: true,
      status: 'read'
    },
    {
      id: '6',
      text: 'C++ templates and metaprogramming... still learning after 5 years. The error messages alone could fill a book 📚',
      author: 'David Kim',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      isOwn: false,
      type: 'text',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&crop=face',
      reactions: [{ emoji: '📚', count: 4, users: ['user1', 'user2'] }],
      isRead: true,
      status: 'read'
    },
    {
      id: '7',
      text: 'Prolog was mind-bending. Logic programming is so different from everything else.\n\nYou have to think backwards from the solution.\n\nCheck out this resource: https://www.linkedin.com/learning/courses/advanced-prolog-programming',
      author: 'Priya Sharma',
      timestamp: new Date(Date.now() - 1200000).toISOString(), // 20 minutes ago
      isOwn: false,
      type: 'text',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=40&h=40&fit=crop&crop=face',
      reactions: [{ emoji: '🤯', count: 6, users: ['user1', 'user2', 'user3'] }],
      isRead: true,
      status: 'read'
    }
  ];

  const [messages, setMessages] = useState<Message[]>(() => {
    // Use external messages if provided and not empty, otherwise fall back to demo messages
    if (externalMessages && externalMessages.length > 0) {
      console.log('🔄 ConversationRoom: Using external messages:', externalMessages.length);
      return externalMessages;
    } else {
      console.log('🎭 ConversationRoom: Using demo messages (no external messages provided)');
      return getDemoMessages();
    }
  });

  // Update messages when external messages change
  useEffect(() => {
    if (externalMessages && externalMessages.length > 0) {
      console.log('📨 ConversationRoom: External messages updated, setting new messages:', externalMessages.length);
      setMessages(externalMessages);
    }
  }, [externalMessages]);

  // Sample thought starters data
  const defaultThoughtStarters: ThoughtStarter[] = [
    {
      id: 'thought-1',
      title: 'Renewable Energy Future',
      description: 'Discussion on the transition to renewable energy sources and their economic impact',
      category: 'Environment',
      tags: ['energy', 'economics', 'environment'],
      lastActivity: '2 min ago',
      messageCount: 12,
      participants: 4,
      isActive: true,
      hasUnread: true,
      unreadCount: 3,
      lastMessage: {
        text: 'The battery storage costs have really...',
        author: 'Alex Chen',
        timestamp: '2 min ago',
        isRead: false
      },
      thumbnail: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=60&h=60&fit=crop',
      taggedContent: {
        sourceText: 'renewable energy sources have become 85% cheaper over the past decade',
        sourceUrl: 'https://example.com/energy-report-2024',
        highlightedText: '85% cheaper over the past decade'
      },
      thoughtBody: 'This represents a major inflection point in global energy markets. The cost reduction combined with improving storage technology creates a compelling economic case for transition.',
      author: {
        id: 'user-alex',
        name: 'Alex Chen',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=40&h=40&fit=crop',
        role: 'Energy Analyst'
      },
      reactions: {
        likes: 8,
        hearts: 3,
        stars: 2,
        thumbsUp: 12
      },
      participantsList: [
        { id: 'user-alex', name: 'Alex Chen', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop', isOnline: true },
        { id: 'user-sarah', name: 'Sarah Kim', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=32&h=32&fit=crop', isOnline: true },
        { id: 'user-mike', name: 'Mike Johnson', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop', isOnline: false, lastSeen: '1h ago' },
        { id: 'user-emma', name: 'Emma Wilson', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop', isOnline: true }
      ],
      readStatus: {
        totalParticipants: 4,
        readBy: 1,
        unreadBy: 3
      }
    },
    {
      id: 'thought-2',
      title: 'AI Ethics in Healthcare',
      description: 'Exploring the ethical implications of AI in medical diagnosis and treatment',
      category: 'Technology',
      tags: ['ai', 'ethics', 'healthcare'],
      lastActivity: '1 hour ago',
      messageCount: 8,
      participants: 6,
      isPinned: true,
      lastMessage: {
        text: 'Privacy concerns are definitely valid',
        author: 'Dr. Sarah Kim',
        timestamp: '1 hour ago',
        isRead: true
      },
      thumbnail: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=60&h=60&fit=crop',
      taggedContent: {
        sourceText: 'AI diagnostic systems can process medical images 40x faster than human radiologists',
        sourceUrl: 'https://example.com/ai-healthcare-study',
        highlightedText: '40x faster than human radiologists'
      },
      thoughtBody: 'While the efficiency gains are impressive, we need robust frameworks to ensure AI recommendations don\'t override critical human judgment in complex cases.',
      author: {
        id: 'user-sarah',
        name: 'Dr. Sarah Kim',
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=40&h=40&fit=crop',
        role: 'Medical Ethicist'
      },
      reactions: {
        likes: 15,
        hearts: 7,
        stars: 5,
        thumbsUp: 18
      },
      participantsList: [
        { id: 'user-sarah', name: 'Dr. Sarah Kim', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=32&h=32&fit=crop', isOnline: true },
        { id: 'user-david', name: 'Dr. David Lee', avatar: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=32&h=32&fit=crop', isOnline: true },
        { id: 'user-lisa', name: 'Lisa Wong', avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=32&h=32&fit=crop', isOnline: false, lastSeen: '30m ago' },
        { id: 'user-james', name: 'James Brown', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop', isOnline: true },
        { id: 'user-maria', name: 'Maria Garcia', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=32&h=32&fit=crop', isOnline: false, lastSeen: '2h ago' },
        { id: 'user-tom', name: 'Tom Anderson', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop', isOnline: true }
      ],
      readStatus: {
        totalParticipants: 6,
        readBy: 4,
        unreadBy: 2
      }
    },
    {
      id: 'thought-3',
      title: 'Future of Work',
      description: 'How remote work and automation are reshaping traditional employment',
      category: 'Society',
      tags: ['work', 'automation', 'remote'],
      lastActivity: '3 hours ago',
      messageCount: 15,
      participants: 8,
      lastMessage: {
        text: 'Companies need to adapt quickly',
        author: 'Marcus Johnson',
        timestamp: '3 hours ago',
        isRead: true
      },
      thumbnail: 'https://images.unsplash.com/photo-1553877522-43269d4ea984?w=60&h=60&fit=crop',
      taggedContent: {
        sourceText: '40% of jobs could be automated within the next 15 years according to recent studies',
        sourceUrl: 'https://example.com/automation-future-report',
        highlightedText: '40% of jobs could be automated within the next 15 years'
      },
      thoughtBody: 'The key isn\'t just technological capability, but social and economic readiness. We need to rethink education, social safety nets, and what "work" means in an automated world.',
      author: {
        id: 'user-marcus',
        name: 'Marcus Johnson',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=40&h=40&fit=crop',
        role: 'Future of Work Researcher'
      },
      reactions: {
        likes: 22,
        hearts: 4,
        stars: 8,
        thumbsUp: 19
      },
      participantsList: [
        { id: 'user-marcus', name: 'Marcus Johnson', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=32&h=32&fit=crop', isOnline: true },
        { id: 'user-anna', name: 'Anna Smith', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop', isOnline: false, lastSeen: '1h ago' },
        { id: 'user-kevin', name: 'Kevin Park', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop', isOnline: true },
        { id: 'user-rachel', name: 'Rachel Davis', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b789?w=32&h=32&fit=crop', isOnline: true },
        { id: 'user-chris', name: 'Chris Wilson', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=32&h=32&fit=crop', isOnline: false, lastSeen: '45m ago' },
        { id: 'user-jenny', name: 'Jenny Liu', avatar: 'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=32&h=32&fit=crop', isOnline: true },
        { id: 'user-alex2', name: 'Alex Thompson', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop', isOnline: true },
        { id: 'user-sofia', name: 'Sofia Rodriguez', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=32&h=32&fit=crop', isOnline: false, lastSeen: '2h ago' }
      ],
      readStatus: {
        totalParticipants: 8,
        readBy: 5,
        unreadBy: 3
      }
    }
  ];

  const displayThoughtStarters = thoughtStarters.length > 0 ? thoughtStarters : defaultThoughtStarters;
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

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle sending messages
  const handleSendMessage = () => {
    if (!messageText.trim() || !selectedThought) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      author: currentUser.name,
      timestamp: new Date().toISOString(),
      isOwn: true,
      type: 'text',
      status: 'sending'
    };

    setMessages(prev => [...prev, newMessage]);
    onSendMessage(messageText, selectedThought.id);
    setMessageText('');

    // Simulate message status updates
    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, status: 'sent' } : msg
      ));
    }, 500);

    setTimeout(() => {
      setMessages(prev => prev.map(msg => 
        msg.id === newMessage.id ? { ...msg, status: 'delivered' } : msg
      ));
    }, 1000);
  };

  // Handle AI questions
  const handleAskAI = () => {
    if (!aiQuestion.trim() || !selectedThought) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: `🤖 ${aiQuestion}`,
      author: currentUser.name,
      timestamp: new Date().toISOString(),
      isOwn: true,
      type: 'text',
      status: 'sent'
    };

    setMessages(prev => [...prev, userMessage]);
    onAskAI(aiQuestion, selectedThought.id);
    setAiQuestion('');
    setInputMode('message');

    // Simulate AI response
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
    }, 1500);
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
              className="text-blue-300 hover:text-blue-200 underline break-all"
              title={part}
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

  return (
    <div className="flex h-full bg-philonet-background">
      {/* Left Sidebar - Thought Starters - Hidden on mobile when conversation is selected */}
      <div 
        className={cn(
          "border-r border-philonet-border bg-philonet-background transition-all duration-300 ease-in-out",
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
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-philonet-border bg-philonet-background">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-philonet-blue-400" />
              Conversations
              {selectedThought && (
                <span className={cn(
                  "text-xs text-philonet-text-muted transition-opacity duration-300",
                  isLeftSidebarHovered ? "opacity-0" : "opacity-60"
                )}>
                  (hover to expand)
                </span>
              )}
            </h2>
            <Button className="h-8 w-8 p-0 rounded-full bg-philonet-blue-500 hover:bg-philonet-blue-600 border-0">
              <UserPlus className="w-4 h-4 text-philonet-blue-400" />
            </Button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-philonet-text-muted" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-philonet-card border border-philonet-border rounded-lg text-white placeholder:text-philonet-text-muted focus:outline-none focus:border-philonet-blue-500"
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
                "p-3 border-b border-philonet-border cursor-pointer transition-all duration-200 hover:bg-philonet-card",
                selectedThought?.id === thought.id && 
                "bg-philonet-blue-500 border-r-2 border-r-philonet-blue-500"
              )}
              onClick={() => onThoughtSelect(thought.id)}
            >
              <div className="flex items-start gap-3">
                {/* User Avatar */}
                <div className="flex-shrink-0">
                  {thought.author?.avatar ? (
                    <img
                      src={thought.author.avatar}
                      alt={thought.author.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-philonet-card flex items-center justify-center">
                      <span className="text-sm">💭</span>
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Header */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-white truncate">
                      {thought.author?.name || 'Anonymous'}
                    </span>
                    <span className="text-xs text-philonet-text-muted">•</span>
                    <span className="text-xs text-philonet-text-muted">2h ago</span>
                    <span className="text-xs text-philonet-blue-400">💭 2.14m</span>
                    {thought.isActive && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse ml-auto"></div>
                    )}
                  </div>

                  {/* Discussion Title */}
                  <h3 className={cn(
                    "text-sm font-medium text-white mb-2 leading-relaxed transition-all duration-300 break-words",
                    isLeftSidebarHovered ? "line-clamp-3" : "line-clamp-2"
                  )}>
                    {thought.thoughtBody || thought.title}
                  </h3>

                  {/* Selected Text Preview */}
                  {thought.taggedContent && (
                    <div className={cn(
                      "text-xs text-philonet-text-secondary mb-2 italic transition-all duration-300 break-words",
                      isLeftSidebarHovered ? "line-clamp-3" : "line-clamp-1"
                    )}>
                      "{thought.taggedContent.highlightedText}"
                    </div>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-3 text-xs text-philonet-text-muted">
                    <span className="flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      {thought.reactions?.likes || 0}
                    </span>
                    <span>{thought.messageCount} msgs</span>
                    <span>{thought.participants} people</span>
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
                      {selectedThought.isActive && (
                        <span className="px-2 py-1 bg-green-400 text-philonet-background rounded-full text-xs font-medium flex items-center gap-1">
                          <Activity className="w-3 h-3" />
                          Live
                        </span>
                      )}
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
                  <Button className="h-9 w-9 p-0 rounded-full bg-philonet-blue-500 hover:bg-philonet-blue-600 border-0 transition-all">
                    <Activity className="w-4 h-4 text-philonet-blue-400" />
                  </Button>
                  <Button className="h-9 w-9 p-0 rounded-full bg-philonet-card hover:bg-philonet-border border-0 transition-all">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Compact Tagged Content Section */}
              {selectedThought.taggedContent && (
                <div className="mb-2 p-2 bg-philonet-blue-500 rounded-lg border border-philonet-blue-500">
                  <div className="flex items-center gap-2 mb-1">
                    <Quote className="w-3 h-3 text-philonet-blue-400 flex-shrink-0" />
                    <span className="text-xs font-medium text-philonet-blue-400">Selected Text</span>
                  </div>
                  <blockquote className="text-xs text-philonet-text leading-relaxed italic line-clamp-2 break-words overflow-hidden">
                    "{selectedThought.taggedContent.highlightedText}"
                  </blockquote>
                </div>
              )}
            </div>

            {/* Messages Area */}
            <div 
              ref={messagesContainerRef}
              className="flex-1 overflow-y-auto overflow-x-hidden p-3 sm:p-4 space-y-4 philonet-scrollbar bg-philonet-background min-w-0"
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
                <div className="flex items-center justify-center py-8">
                  <div className="text-philonet-text-secondary text-center">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
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
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : message.type === 'ai-response' ? (
                        <div className="w-8 h-8 rounded-full bg-philonet-blue-500 flex items-center justify-center">
                          <Bot className="w-4 h-4 text-philonet-blue-400" />
                        </div>
                      ) : message.type === 'thought-starter' ? (
                        <div className="w-8 h-8 rounded-full bg-yellow-500 flex items-center justify-center">
                          <Sparkles className="w-4 h-4 text-yellow-400" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-philonet-card flex items-center justify-center">
                          <UserRound className="w-4 h-4 text-philonet-text-muted" />
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
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-philonet-text-secondary break-words overflow-hidden">
                          {message.author}
                        </span>
                        <span className="text-xs text-philonet-text-muted">
                          {formatTime(message.timestamp)}
                        </span>
                      </div>
                    )}

                    <div
                      className={cn(
                        "p-3 rounded-2xl group relative min-w-0",
                        message.isOwn
                          ? "bg-philonet-blue-500 text-white rounded-br-md"
                          : message.type === 'ai-response'
                          ? "bg-philonet-blue-500 text-white border border-philonet-blue-500 rounded-bl-md"
                          : message.type === 'thought-starter'
                          ? "bg-yellow-500 text-philonet-background border border-yellow-500 rounded-bl-md"
                          : "bg-philonet-card text-white border border-philonet-border rounded-bl-md"
                      )}
                    >
                      <div className="text-sm leading-relaxed break-words overflow-wrap-anywhere">
                        {formatTextWithLinks(message.text)}
                      </div>
                      
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
                        {message.reactions.map((reaction, index) => (
                          <button
                            key={index}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-philonet-card border border-philonet-border rounded-full text-sm hover:bg-philonet-border transition-colors shadow-sm"
                          >
                            <span className="text-base">{reaction.emoji}</span>
                            <span className="text-xs font-medium text-philonet-text-secondary">{reaction.count}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {message.isOwn && (
                      <div className="flex items-center justify-end gap-2 text-xs text-philonet-text-muted">
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
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-philonet-card flex items-center justify-center">
                          <UserRound className="w-4 h-4 text-philonet-text-muted" />
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
                  onClick={() => setInputMode('message')}
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
                  onClick={() => setInputMode('ai')}
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
                            handleSendMessage();
                          }
                        }}
                      />
                      <Button
                        className="h-8 w-8 p-0 rounded-full flex-shrink-0"
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
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
                            handleAskAI();
                          }
                        }}
                      />
                    </div>
                  )}
                </div>

                <Button
                  onClick={inputMode === 'message' ? handleSendMessage : handleAskAI}
                  disabled={inputMode === 'message' ? !messageText.trim() : !aiQuestion.trim()}
                  className="h-10 w-10 rounded-full bg-philonet-blue-500 hover:bg-philonet-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send className="w-4 h-4 text-white" />
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
      `}</style>
    </div>
  );
};

export default ConversationRoom;
