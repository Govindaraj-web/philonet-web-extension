import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Code, FileText } from 'lucide-react';
import { Button } from './ui';
import ConversationRoom from './ConversationRoom';
import ConversationMode from './ConversationMode';
import SidePanelWithConversation from './SidePanelWithConversation';

/**
 * Demo component showcasing the WhatsApp Web-style conversation room
 * Use this component to test and demonstrate the conversation features
 */

const ConversationRoomDemo: React.FC = () => {
  const [activeDemo, setActiveDemo] = useState<'basic' | 'integrated' | 'full'>('basic');
  const [selectedThoughtId, setSelectedThoughtId] = useState<string>('thought-1');

  // Sample data for demonstration
  const demoUser = {
    id: 'demo-user',
    name: 'Demo User',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=40&h=40&fit=crop&crop=face'
  };

  const demoArticle = {
    title: 'The Future of Renewable Energy',
    summary: 'An in-depth analysis of renewable energy trends and their impact on global economics.',
    description: 'This comprehensive article explores the rapid advancement of renewable energy technologies...',
    categories: ['Environment', 'Technology'],
    tags: ['renewable', 'energy', 'climate', 'technology'],
    thumbnail_url: 'https://images.unsplash.com/photo-1466611653911-95081537e5b7?w=300&h=200&fit=crop'
  };

  const handleSendMessage = (message: string, thoughtId: string) => {
    console.log('Demo: Message sent', { message, thoughtId });
    // In a real implementation, this would send the message to your backend
  };

  const handleAskAI = (question: string, thoughtId: string) => {
    console.log('Demo: AI question asked', { question, thoughtId });
    // In a real implementation, this would send the question to your AI service
  };

  const handleGenerateContent = () => {
    console.log('Demo: Generate content requested');
    // In a real implementation, this would trigger content generation
  };

  return (
    <div className="h-screen bg-philonet-background">
      {/* Demo Header */}
      <div className="p-4 border-b border-philonet-border bg-philonet-panel">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-medium text-white flex items-center gap-2">
              <FileText className="w-6 h-6 text-philonet-blue-400" />
              Conversation Room Demo
            </h1>
            <p className="text-sm text-philonet-text-secondary mt-1">
              WhatsApp Web-style conversation interface for thought-based discussions
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <a
              href="#documentation"
              className="text-xs text-philonet-blue-400 hover:text-philonet-blue-300 transition-colors"
            >
              📖 Documentation
            </a>
            <a
              href="#integration"
              className="text-xs text-philonet-blue-400 hover:text-philonet-blue-300 transition-colors"
            >
              🔧 Integration Guide
            </a>
          </div>
        </div>

        {/* Demo Mode Toggle */}
        <div className="flex gap-2">
          <Button
            onClick={() => setActiveDemo('basic')}
            className={`h-9 px-4 text-sm ${
              activeDemo === 'basic' 
                ? 'bg-philonet-blue-500 text-white' 
                : 'bg-philonet-card text-philonet-text-muted hover:text-white'
            }`}
          >
            <Play className="w-4 h-4 mr-2" />
            Basic Room
          </Button>
          <Button
            onClick={() => setActiveDemo('integrated')}
            className={`h-9 px-4 text-sm ${
              activeDemo === 'integrated' 
                ? 'bg-philonet-blue-500 text-white' 
                : 'bg-philonet-card text-philonet-text-muted hover:text-white'
            }`}
          >
            <Code className="w-4 h-4 mr-2" />
            Conversation Mode
          </Button>
          <Button
            onClick={() => setActiveDemo('full')}
            className={`h-9 px-4 text-sm ${
              activeDemo === 'full' 
                ? 'bg-philonet-blue-500 text-white' 
                : 'bg-philonet-card text-philonet-text-muted hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4 mr-2" />
            Full Integration
          </Button>
        </div>
      </div>

      {/* Demo Content */}
      <div className="flex-1 overflow-hidden">
        {activeDemo === 'basic' && (
          <motion.div
            key="basic-demo"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
          >
            <ConversationRoom
              selectedThoughtId={selectedThoughtId}
              currentUser={demoUser}
              onThoughtSelect={setSelectedThoughtId}
              onSendMessage={handleSendMessage}
              onAskAI={handleAskAI}
            />
          </motion.div>
        )}

        {activeDemo === 'integrated' && (
          <motion.div
            key="integrated-demo"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
          >
            <ConversationMode
              article={demoArticle}
              user={demoUser}
              onGenerateContent={handleGenerateContent}
            />
          </motion.div>
        )}

        {activeDemo === 'full' && (
          <motion.div
            key="full-demo"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full"
          >
            <SidePanelWithConversation
              article={demoArticle}
              user={demoUser}
              generateContent={handleGenerateContent}
            />
          </motion.div>
        )}
      </div>

      {/* Feature Info Panel */}
      <div className="absolute bottom-4 right-4 max-w-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-philonet-card/95 backdrop-blur-sm border border-philonet-border rounded-lg p-4 shadow-xl"
        >
          <h3 className="text-sm font-medium text-white mb-2">
            {activeDemo === 'basic' && '🎯 Basic Conversation Room'}
            {activeDemo === 'integrated' && '🔧 Conversation Mode Component'}
            {activeDemo === 'full' && '🚀 Full Side Panel Integration'}
          </h3>
          <div className="text-xs text-philonet-text-secondary space-y-1">
            {activeDemo === 'basic' && (
              <>
                <p>• WhatsApp Web-style chat interface</p>
                <p>• Thought starter sidebar with search</p>
                <p>• Message and AI input modes</p>
                <p>• Real-time message status indicators</p>
              </>
            )}
            {activeDemo === 'integrated' && (
              <>
                <p>• Ready-to-use conversation wrapper</p>
                <p>• Generates thought starters from articles</p>
                <p>• Handles no-content state gracefully</p>
                <p>• Easy integration with existing components</p>
              </>
            )}
            {activeDemo === 'full' && (
              <>
                <p>• Complete side panel with mode toggle</p>
                <p>• Smooth transitions between reading/chat</p>
                <p>• Mode indicator and keyboard shortcuts</p>
                <p>• Production-ready integration example</p>
              </>
            )}
          </div>
          
          <div className="mt-3 pt-2 border-t border-philonet-border/50">
            <p className="text-xs text-philonet-text-muted">
              💡 Try sending messages, asking AI questions, and switching between thought rooms
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ConversationRoomDemo;
