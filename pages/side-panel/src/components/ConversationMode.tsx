import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, FileText, ArrowLeft, Settings } from 'lucide-react';
import { Button } from './ui';
import ConversationRoom from './ConversationRoom';

interface ConversationModeProps {
  // Props from existing SidePanelRefactored
  article?: any;
  user?: any;
  onBack?: () => void;
  onGenerateContent?: () => void;
}

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

const ConversationMode: React.FC<ConversationModeProps> = ({
  article,
  user,
  onBack,
  onGenerateContent
}) => {
  const [selectedThoughtId, setSelectedThoughtId] = useState<string>('thought-1');

  // Generate thought starters based on current article content
  const generateThoughtStarters = (): ThoughtStarter[] => {
    if (!article) {
      return [
        {
          id: 'no-article-1',
          title: 'Share Your Thoughts',
          description: 'What aspects of this page interest you most? Start a discussion about key ideas.',
          category: 'General Discussion',
          tags: ['discussion', 'ideas', 'sharing'],
          lastActivity: 'now',
          messageCount: 0,
          participants: 1,
          isActive: true,
          hasUnread: false
        },
        {
          id: 'no-article-2',
          title: 'Generate Content',
          description: 'Create AI-powered content from this page to start meaningful conversations.',
          category: 'Content Creation',
          tags: ['ai', 'content', 'creation'],
          lastActivity: 'now',
          messageCount: 0,
          participants: 1,
          hasUnread: false
        }
      ];
    }

    // Create thought starters based on article content
    const baseStarters: ThoughtStarter[] = [
      {
        id: 'main-discussion',
        title: `Discussion: ${article.title}`,
        description: article.summary || article.description || 'Share your thoughts on this article\'s main ideas and arguments.',
        category: article.categories?.[0] || 'Discussion',
        tags: article.tags?.slice(0, 3) || ['discussion'],
        lastActivity: '5 min ago',
        messageCount: 8,
        participants: 4,
        isActive: true,
        hasUnread: true,
        unreadCount: 2,
        lastMessage: {
          text: 'I found the data about renewable energy costs particularly striking...',
          author: 'Alex Chen',
          timestamp: '5 min ago',
          isRead: false
        },
        thumbnail: article.thumbnail_url
      },
      {
        id: 'key-insights',
        title: 'Key Insights & Takeaways',
        description: 'What are the most important points from this content? Share what resonated with you.',
        category: 'Analysis',
        tags: ['insights', 'analysis', 'takeaways'],
        lastActivity: '1 hour ago',
        messageCount: 12,
        participants: 6,
        isPinned: true,
        lastMessage: {
          text: 'The section on battery storage was eye-opening',
          author: 'Dr. Sarah Kim',
          timestamp: '1 hour ago',
          isRead: true
        },
        thumbnail: article.thumbnail_url
      },
      {
        id: 'questions-clarification',
        title: 'Questions & Clarifications',
        description: 'Ask questions about confusing points or seek clarification on complex topics.',
        category: 'Q&A',
        tags: ['questions', 'clarification', 'help'],
        lastActivity: '2 hours ago',
        messageCount: 5,
        participants: 3,
        lastMessage: {
          text: 'Can someone explain the methodology used in the study?',
          author: 'Marcus Johnson',
          timestamp: '2 hours ago',
          isRead: true
        }
      }
    ];

    // Add category-specific thought starters
    if (article.categories?.includes('Technology') || article.tags?.includes('ai')) {
      baseStarters.push({
        id: 'tech-implications',
        title: 'Technology Implications',
        description: 'Discuss the technological aspects and their broader implications for society.',
        category: 'Technology',
        tags: ['technology', 'implications', 'future'],
        lastActivity: '3 hours ago',
        messageCount: 7,
        participants: 5,
        lastMessage: {
          text: 'The ethical considerations are fascinating',
          author: 'Tech Enthusiast',
          timestamp: '3 hours ago',
          isRead: true
        }
      });
    }

    if (article.categories?.includes('Environment') || article.tags?.includes('climate')) {
      baseStarters.push({
        id: 'environmental-impact',
        title: 'Environmental Impact',
        description: 'Explore the environmental implications and sustainability aspects discussed.',
        category: 'Environment',
        tags: ['environment', 'sustainability', 'impact'],
        lastActivity: '4 hours ago',
        messageCount: 9,
        participants: 7,
        lastMessage: {
          text: 'We need more policies like this',
          author: 'Green Advocate',
          timestamp: '4 hours ago',
          isRead: true
        }
      });
    }

    return baseStarters;
  };

  const thoughtStarters = generateThoughtStarters();

  const handleThoughtSelect = (thoughtId: string) => {
    setSelectedThoughtId(thoughtId);
    console.log('Selected thought starter:', thoughtId);
  };

  const handleSendMessage = (message: string, thoughtId: string) => {
    console.log('Sending message:', { message, thoughtId });
    // Here you would integrate with your actual messaging system
  };

  const handleAskAI = (question: string, thoughtId: string) => {
    console.log('Asking AI:', { question, thoughtId });
    // Here you would integrate with your AI system
  };

  const handleGenerateContentAction = () => {
    if (onGenerateContent) {
      onGenerateContent();
    }
  };

  return (
    <div className="h-full flex flex-col bg-philonet-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-philonet-border bg-philonet-panel">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button 
              onClick={onBack}
              className="h-9 w-9 p-0 rounded-full"
              title="Back to reading mode"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-philonet-blue-400" />
            <h1 className="text-lg font-medium text-white">Conversation Mode</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!article && (
            <Button
              onClick={handleGenerateContentAction}
              className="h-9 px-4 bg-philonet-blue-500 hover:bg-philonet-blue-600 text-white flex items-center gap-2"
            >
              <FileText className="w-4 h-4" />
              Generate Content
            </Button>
          )}
          <Button className="h-9 w-9 p-0 rounded-full">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {article || thoughtStarters.length > 0 ? (
          <ConversationRoom
            thoughtStarters={thoughtStarters}
            selectedThoughtId={selectedThoughtId}
            currentUser={user || { id: 'user1', name: 'You' }}
            // Add API context props for AI assistant
            articleId={article?.id ? parseInt(article.id, 10) : undefined}
            parentCommentId={selectedThoughtId ? parseInt(selectedThoughtId, 10) : undefined}
            articleContent={article?.content || article?.description || ''}
            onThoughtSelect={handleThoughtSelect}
            onSendMessage={handleSendMessage}
            onAskAI={handleAskAI}
          />
        ) : (
          /* No content state */
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-md mx-auto p-6">
              <MessageSquare className="w-16 h-16 text-philonet-text-muted mx-auto mb-4" />
              <h3 className="text-xl font-medium text-white mb-2">Start a Conversation</h3>
              <p className="text-philonet-text-secondary mb-6">
                Generate content from this page or browse existing discussions to begin.
              </p>
              <Button
                onClick={handleGenerateContentAction}
                className="h-12 px-6 bg-philonet-blue-500 hover:bg-philonet-blue-600 text-white flex items-center gap-2 mx-auto"
              >
                <FileText className="w-5 h-5" />
                Generate Content to Start
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Help Text */}
      {!article && (
        <div className="p-4 bg-philonet-panel/50 border-t border-philonet-border">
          <div className="flex items-start gap-3 text-sm text-philonet-text-muted">
            <MessageSquare className="w-4 h-4 mt-0.5 text-philonet-blue-400 flex-shrink-0" />
            <div>
              <p className="mb-1">
                <strong className="text-philonet-text-secondary">Conversation Mode:</strong> Generate AI-powered content from this page to create engaging discussion topics.
              </p>
              <p>
                Once content is generated, you can start conversations, ask AI questions, and collaborate with others around specific ideas.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConversationMode;
