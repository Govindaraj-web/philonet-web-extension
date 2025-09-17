import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, FileText, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button } from '../components/ui';
import ConversationMode from '../components/ConversationMode';

/**
 * Integration Example: How to add Conversation Room to SidePanelRefactored
 * 
 * This shows how you can modify your existing SidePanelRefactored.tsx to include
 * a toggle between reading mode and conversation mode.
 */

interface SidePanelWithConversationProps {
  // Your existing props from SidePanelRefactored
  user?: any;
  onAuth?: () => void;
  onLogout?: () => void;
  apiConfig?: any;
  article?: any;
  generateContent?: () => void;
}

const SidePanelWithConversation: React.FC<SidePanelWithConversationProps> = ({
  user,
  onAuth,
  onLogout,
  apiConfig,
  article,
  generateContent
}) => {
  const [viewMode, setViewMode] = useState<'reading' | 'conversation'>('reading');

  const toggleMode = () => {
    setViewMode(prev => prev === 'reading' ? 'conversation' : 'reading');
  };

  return (
    <div className="h-full flex flex-col bg-philonet-background">
      {/* Enhanced Header with Mode Toggle */}
      <div className="flex items-center justify-between p-3 border-b border-philonet-border bg-philonet-panel">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-philonet-blue-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-philonet-blue-400" />
            </div>
            <span className="font-medium text-white">Philonet</span>
          </div>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-3 px-3 py-1.5 bg-philonet-card rounded-lg border border-philonet-border">
            <div className="flex items-center gap-2">
              <FileText className={`w-4 h-4 ${viewMode === 'reading' ? 'text-philonet-blue-400' : 'text-philonet-text-muted'}`} />
              <span className={`text-sm ${viewMode === 'reading' ? 'text-white' : 'text-philonet-text-muted'}`}>
                Reading
              </span>
            </div>

            <Button
              onClick={toggleMode}
              className="h-6 w-11 p-0 rounded-full relative bg-philonet-border hover:bg-philonet-blue-500/20 transition-colors"
            >
              <motion.div
                initial={false}
                animate={{ x: viewMode === 'reading' ? 0 : 20 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm"
              />
            </Button>

            <div className="flex items-center gap-2">
              <MessageSquare className={`w-4 h-4 ${viewMode === 'conversation' ? 'text-philonet-blue-400' : 'text-philonet-text-muted'}`} />
              <span className={`text-sm ${viewMode === 'conversation' ? 'text-white' : 'text-philonet-text-muted'}`}>
                Chat
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area with Mode Switching */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {viewMode === 'reading' ? (
            <motion.div
              key="reading-mode"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {/* Your existing SidePanelRefactored content goes here */}
              <div className="h-full flex items-center justify-center bg-philonet-background">
                <div className="text-center max-w-md mx-auto p-6">
                  <FileText className="w-16 h-16 text-philonet-text-muted mx-auto mb-4" />
                  <h3 className="text-xl font-medium text-white mb-2">Reading Mode</h3>
                  <p className="text-philonet-text-secondary mb-6">
                    This is where your existing SidePanelRefactored content would be displayed.
                    Article content, thoughts dock, composer footer, etc.
                  </p>
                  <div className="space-y-3 text-left">
                    <div className="p-3 bg-philonet-card rounded-lg border border-philonet-border">
                      <h4 className="text-sm font-medium text-white mb-1">Components to keep:</h4>
                      <ul className="text-xs text-philonet-text-secondary space-y-1">
                        <li>• ContentRenderer</li>
                        <li>• MetaHeader</li>
                        <li>• ContentSections</li>
                        <li>• ComposerFooter</li>
                        <li>• CommentsDock</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="conversation-mode"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              <ConversationMode
                article={article}
                user={user}
                onBack={() => setViewMode('reading')}
                onGenerateContent={generateContent}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Optional: Mode indicator badge */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className="absolute bottom-4 left-4 z-50"
      >
        <div className="flex items-center gap-2 px-3 py-1.5 bg-philonet-card/90 backdrop-blur-sm border border-philonet-border rounded-full shadow-lg">
          {viewMode === 'reading' ? (
            <FileText className="w-3 h-3 text-philonet-blue-400" />
          ) : (
            <MessageSquare className="w-3 h-3 text-philonet-blue-400" />
          )}
          <span className="text-xs text-philonet-text-secondary capitalize">
            {viewMode} Mode
          </span>
        </div>
      </motion.div>
    </div>
  );
};

export default SidePanelWithConversation;

/**
 * INTEGRATION STEPS:
 * 
 * 1. Add the mode toggle state to your SidePanelRefactored.tsx:
 *    const [viewMode, setViewMode] = useState<'reading' | 'conversation'>('reading');
 * 
 * 2. Import the ConversationMode component:
 *    import { ConversationMode } from './components';
 * 
 * 3. Add the toggle button to your header:
 *    <Button onClick={() => setViewMode(prev => prev === 'reading' ? 'conversation' : 'reading')}>
 *      <MessageSquare className="w-4 h-4" />
 *    </Button>
 * 
 * 4. Wrap your main content with conditional rendering:
 *    {viewMode === 'reading' ? (
 *      // Your existing content
 *    ) : (
 *      <ConversationMode
 *        article={article}
 *        user={user}
 *        onBack={() => setViewMode('reading')}
 *        onGenerateContent={generateContent}
 *      />
 *    )}
 * 
 * 5. Optional: Add keyboard shortcut for quick switching:
 *    useEffect(() => {
 *      const handleKeyPress = (e: KeyboardEvent) => {
 *        if (e.key === 'c' && e.ctrlKey) {
 *          setViewMode(prev => prev === 'reading' ? 'conversation' : 'reading');
 *        }
 *      };
 *      document.addEventListener('keydown', handleKeyPress);
 *      return () => document.removeEventListener('keydown', handleKeyPress);
 *    }, []);
 */
