import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  MessageSquare, 
  ChevronLeft,
  Pin,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { cn } from '@extension/ui';
import { Button } from './ui';
import ConversationRoom from './ConversationRoom';

interface ConversationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  article?: any;
  user?: any;
  selectedThoughtId?: string;
  onThoughtSelect?: (thoughtId: string) => void;
  onSendMessage?: (message: string, thoughtId: string) => void;
  onAskAI?: (question: string, thoughtId: string) => void;
  // Drawer positioning
  position?: 'right' | 'left' | 'center';
  size?: 'small' | 'medium' | 'large' | 'full';
}

const ConversationDrawer: React.FC<ConversationDrawerProps> = ({
  isOpen,
  onClose,
  article,
  user,
  selectedThoughtId,
  onThoughtSelect,
  onSendMessage,
  onAskAI,
  position = 'right',
  size = 'large'
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  // Size configurations
  const sizeConfig = {
    small: { width: '400px', height: '60%' },
    medium: { width: '600px', height: '70%' },
    large: { width: '800px', height: '80%' },
    full: { width: '95%', height: '90%' }
  };

  // Position configurations
  const getPositionStyles = () => {
    const config = sizeConfig[size];
    
    switch (position) {
      case 'left':
        return {
          left: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: config.width,
          height: config.height
        };
      case 'center':
        return {
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: config.width,
          height: config.height
        };
      case 'right':
      default:
        return {
          right: '20px',
          top: '50%',
          transform: 'translateY(-50%)',
          width: config.width,
          height: config.height
        };
    }
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Handle drag functionality
  const handleDragStart = (e: React.MouseEvent) => {
    if (!drawerRef.current) return;
    
    setIsDragging(true);
    const rect = drawerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleDragMove = (e: MouseEvent) => {
    if (!isDragging || !drawerRef.current) return;
    
    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;
    
    drawerRef.current.style.left = `${newX}px`;
    drawerRef.current.style.top = `${newY}px`;
    drawerRef.current.style.right = 'auto';
    drawerRef.current.style.transform = 'none';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleDragEnd);
      
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleDragEnd);
      };
    }
    
    return () => {}; // Return empty cleanup function when not dragging
  }, [isDragging, dragOffset]);

  // Animation variants
  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
  };

  const drawerVariants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      x: position === 'left' ? -100 : position === 'right' ? 100 : 0,
      y: position === 'center' ? -50 : 0
    },
    visible: {
      opacity: 1,
      scale: 1,
      x: 0,
      y: 0
    },
    minimized: {
      scale: 0.8,
      opacity: 0.9
    }
  };

  const handleThoughtSelect = (thoughtId: string) => {
    if (onThoughtSelect) {
      onThoughtSelect(thoughtId);
    }
  };

  const handleSendMessage = (message: string, thoughtId: string) => {
    if (onSendMessage) {
      onSendMessage(message, thoughtId);
    }
  };

  const handleAskAI = (question: string, thoughtId: string) => {
    if (onAskAI) {
      onAskAI(question, thoughtId);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/95 backdrop-blur-sm z-[100]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            variants={drawerVariants}
            initial="hidden"
            animate={isMinimized ? "minimized" : "visible"}
            exit="hidden"
            transition={{ 
              type: "spring", 
              stiffness: 300, 
              damping: 30,
              duration: 0.3
            }}
            className="fixed z-[101] bg-philonet-background border border-philonet-border rounded-xl shadow-2xl overflow-hidden"
            style={getPositionStyles()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Header */}
            <div 
              className="flex items-center justify-between p-4 bg-philonet-panel border-b border-philonet-border cursor-move"
              onMouseDown={handleDragStart}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-philonet-blue-500/20 flex items-center justify-center">
                  <MessageSquare className="w-4 h-4 text-philonet-blue-400" />
                </div>
                <div>
                  <h2 className="text-lg font-medium text-white">Thought Rooms</h2>
                  <p className="text-xs text-philonet-text-muted">
                    {article ? `Discussing: ${article.title?.substring(0, 40)}...` : 'Start a conversation'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Minimize/Maximize Button */}
                <Button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-philonet-card"
                  title={isMinimized ? "Maximize" : "Minimize"}
                >
                  {isMinimized ? (
                    <Maximize2 className="w-4 h-4" />
                  ) : (
                    <Minimize2 className="w-4 h-4" />
                  )}
                </Button>

                {/* Pin Button */}
                <Button
                  onClick={() => {/* Handle pin functionality */}}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-philonet-card"
                  title="Pin drawer"
                >
                  <Pin className="w-4 h-4" />
                </Button>

                {/* Close Button */}
                <Button
                  onClick={onClose}
                  className="h-8 w-8 p-0 rounded-lg hover:bg-red-500/20 hover:text-red-400"
                  title="Close conversation room"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Drawer Content */}
            <AnimatePresence>
              {!isMinimized && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex-1 overflow-hidden"
                  style={{ height: 'calc(100% - 80px)' }}
                >
                  <ConversationRoom
                    thoughtStarters={[]} // Will use default generated ones
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
                </motion.div>
              )}
            </AnimatePresence>

            {/* Resize Handle */}
            <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-philonet-text-muted/20 hover:bg-philonet-blue-400/50 transition-colors" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ConversationDrawer;
