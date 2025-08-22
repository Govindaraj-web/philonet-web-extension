# WhatsApp Web-Style Conversation Room

A modern, WhatsApp Web-inspired conversation interface for engaging discussions around thought starters and article content.

## 🎯 Features

### Left Sidebar - Thought Starters
- **Search functionality** - Find thought rooms by title, description, or tags
- **Visual indicators** - Unread counts, pinned conversations, activity status
- **Rich previews** - Thumbnails, last messages, participant counts
- **Category organization** - Organized by topic categories with colored tags
- **Real-time updates** - Last activity times and message counts

### Right Panel - Conversation Interface
- **WhatsApp-style messaging** - Familiar chat interface with message bubbles
- **Message status indicators** - Sending, sent, delivered, read states
- **Dual input modes**:
  - 📝 **Message Mode** - Regular chat messaging with emoji support
  - 🤖 **AI Mode** - Ask AI questions about the content
- **Message reactions** - React to messages with emojis
- **Typing indicators** - See when others are typing
- **Rich message types** - Text, AI responses, system messages, thought starters

## 🎨 Design Features

### Visual Design
- **Dark theme** - Consistent with Philonet's design system
- **Smooth animations** - Framer Motion transitions and micro-interactions
- **Responsive layout** - Adapts to different screen sizes
- **Glass morphism** - Subtle backdrop blur effects
- **Color-coded elements** - Different colors for message types and statuses

### User Experience
- **Intuitive navigation** - Easy switching between thought rooms
- **Real-time feedback** - Immediate visual feedback for all actions
- **Keyboard shortcuts** - Enter to send, Shift+Enter for new lines
- **Auto-scroll** - Automatically scrolls to new messages
- **Message grouping** - Messages grouped by sender and time

## 🚀 Integration Guide

### Basic Integration

```tsx
import { ConversationRoom } from './components';

const MyComponent = () => {
  const [selectedThoughtId, setSelectedThoughtId] = useState('thought-1');
  
  return (
    <ConversationRoom
      thoughtStarters={thoughtStarters}
      selectedThoughtId={selectedThoughtId}
      currentUser={{ id: 'user1', name: 'John Doe' }}
      onThoughtSelect={(thoughtId) => setSelectedThoughtId(thoughtId)}
      onSendMessage={(message, thoughtId) => console.log('Send:', message)}
      onAskAI={(question, thoughtId) => console.log('Ask AI:', question)}
    />
  );
};
```

### Full Integration with Mode Switching

```tsx
import { ConversationMode } from './components';

const SidePanelWithChat = () => {
  const [viewMode, setViewMode] = useState<'reading' | 'conversation'>('reading');
  
  return (
    <div className="h-full">
      {/* Toggle Button */}
      <button onClick={() => setViewMode(prev => 
        prev === 'reading' ? 'conversation' : 'reading'
      )}>
        {viewMode === 'reading' ? 'Switch to Chat' : 'Back to Reading'}
      </button>
      
      {/* Content */}
      {viewMode === 'reading' ? (
        <YourExistingContent />
      ) : (
        <ConversationMode
          article={article}
          user={user}
          onBack={() => setViewMode('reading')}
          onGenerateContent={generateContent}
        />
      )}
    </div>
  );
};
```

## 📝 TypeScript Interfaces

### ThoughtStarter
```tsx
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
}
```

### Message
```tsx
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
```

## 🛠️ Customization Options

### Theme Customization
The conversation room uses Philonet's design tokens. You can customize:

```css
/* Custom color overrides */
.conversation-room {
  --message-bubble-own: #3b82f6;
  --message-bubble-other: #374151;
  --ai-message-bubble: rgba(59, 130, 246, 0.2);
  --unread-indicator: #3b82f6;
}
```

### Message Types
Extend the message types by modifying the `type` field:

```tsx
type MessageType = 
  | 'text' 
  | 'ai-response' 
  | 'system' 
  | 'thought-starter'
  | 'image'      // Add custom types
  | 'file'
  | 'poll';
```

### Custom Thought Starter Generation
Generate thought starters based on your content:

```tsx
const generateThoughtStarters = (article: Article): ThoughtStarter[] => {
  return [
    {
      id: 'main-discussion',
      title: `Discussion: ${article.title}`,
      description: article.summary,
      category: article.categories[0],
      tags: article.tags,
      // ... other properties
    },
    // Add more based on content analysis
  ];
};
```

## 🎯 Use Cases

### 1. Article Discussions
- Generate thought starters from article content
- Facilitate focused discussions on specific topics
- Enable AI-powered Q&A about the content

### 2. Learning Communities
- Create study groups around specific topics
- Ask AI for clarifications and explanations
- Share insights and takeaways

### 3. Research Collaboration
- Discuss research papers and findings
- Collaborate on analysis and interpretation
- Generate research questions with AI

### 4. Content Analysis
- Break down complex content into discussion topics
- Explore different perspectives and viewpoints
- Use AI to provide additional context

## 🔄 State Management

The conversation room manages several types of state:

```tsx
// UI State
const [selectedThoughtId, setSelectedThoughtId] = useState<string>();
const [searchQuery, setSearchQuery] = useState('');
const [inputMode, setInputMode] = useState<'message' | 'ai'>('message');

// Message State
const [messages, setMessages] = useState<Message[]>([]);
const [messageText, setMessageText] = useState('');
const [aiQuestion, setAiQuestion] = useState('');

// Interaction State
const [isTyping, setIsTyping] = useState(false);
const [showEmojiPicker, setShowEmojiPicker] = useState(false);
```

## 🚀 Future Enhancements

### Planned Features
- **Voice messages** - Record and send voice notes
- **File sharing** - Share documents and images
- **Message threading** - Reply to specific messages
- **User presence** - See who's online and typing
- **Message search** - Search through conversation history
- **Mention system** - @mention specific users
- **Message editing** - Edit sent messages
- **Message pinning** - Pin important messages
- **Custom emoji reactions** - Add custom emoji sets
- **Message translation** - Auto-translate messages

### API Integration
- **Real-time messaging** - WebSocket or Server-Sent Events
- **Message persistence** - Save messages to database
- **User authentication** - Integrate with your auth system
- **Push notifications** - Notify users of new messages
- **Message moderation** - Content filtering and reporting

## 📱 Mobile Responsiveness

The conversation room is designed to work well on mobile devices:

- **Touch-friendly** - Large touch targets for mobile
- **Responsive layout** - Adapts to different screen sizes
- **Gesture support** - Swipe gestures for navigation
- **Virtual keyboard** - Proper handling of mobile keyboards

## ⚡ Performance Considerations

- **Virtual scrolling** - Efficient rendering of large message lists
- **Message pagination** - Load older messages on demand
- **Image lazy loading** - Optimize image loading
- **Debounced search** - Prevent excessive API calls
- **Optimistic updates** - Immediate UI feedback

## 🔗 Dependencies

The conversation room requires:

- `react` - Core React library
- `framer-motion` - Animations and transitions
- `lucide-react` - Icon library
- Your existing UI components (`Button`, `Textarea`, etc.)

## 📄 License

This component follows the same license as your Philonet project.
