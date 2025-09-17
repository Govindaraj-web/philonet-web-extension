/**
 * Quick Integration Guide for SidePanelRefactored.tsx
 * 
 * Follow these steps to add the conversation room to your existing side panel:
 */

// 1. Add these imports at the top of your SidePanelRefactored.tsx
import { ConversationMode } from './components';
import { MessageSquare, ToggleLeft, ToggleRight } from 'lucide-react';

// 2. Add this state variable near your other useState declarations
const [viewMode, setViewMode] = useState<'reading' | 'conversation'>('reading');

// 3. Add this toggle button to your header (replace or add to your existing header)
const conversationToggle = (
  <div className="flex items-center gap-2">
    <Button
      onClick={() => setViewMode(prev => prev === 'reading' ? 'conversation' : 'reading')}
      className={cn(
        "h-9 px-3 rounded-lg transition-all duration-200",
        viewMode === 'conversation' 
          ? "bg-philonet-blue-500 text-white" 
          : "bg-philonet-card text-philonet-text-muted hover:text-white"
      )}
      title={`Switch to ${viewMode === 'reading' ? 'conversation' : 'reading'} mode`}
    >
      <MessageSquare className="w-4 h-4 mr-2" />
      {viewMode === 'reading' ? 'Chat' : 'Reading'}
    </Button>
  </div>
);

// 4. Wrap your main content area with this conditional rendering
// Replace your main content div with this:
const mainContent = viewMode === 'reading' ? (
  // Your existing content goes here
  <div className="h-full relative">
    {/* All your existing components */}
    <ContentRenderer ref={contentRef}>
      {/* Your existing MetaHeader, ContentSections, etc. */}
    </ContentRenderer>
    
    {/* Your existing ComposerFooter */}
    {article && (
      <div ref={footerRef}>
        <ComposerFooter {...your existing props} />
      </div>
    )}
    
    {/* Your existing CommentsDock */}
    {(article || state.highlightsLoading) && (
      <div className="absolute right-3 z-30" style={{ bottom: state.footerH + 12 }}>
        <CommentsDock {...your existing props} />
      </div>
    )}
  </div>
) : (
  // New conversation mode
  <ConversationMode
    article={article}
    user={user}
    onBack={() => setViewMode('reading')}
    onGenerateContent={generateContent}
  />
);

// 5. Optional: Add keyboard shortcut (add this useEffect)
useEffect(() => {
  const handleKeyPress = (e: KeyboardEvent) => {
    // Ctrl+M to toggle modes
    if (e.key === 'm' && e.ctrlKey) {
      e.preventDefault();
      setViewMode(prev => prev === 'reading' ? 'conversation' : 'reading');
    }
  };
  
  document.addEventListener('keydown', handleKeyPress);
  return () => document.removeEventListener('keydown', handleKeyPress);
}, []);

// 6. Optional: Add smooth transitions
import { AnimatePresence, motion } from 'framer-motion';

const mainContentWithTransition = (
  <AnimatePresence mode="wait">
    <motion.div
      key={viewMode}
      initial={{ opacity: 0, x: viewMode === 'conversation' ? 20 : -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: viewMode === 'conversation' ? -20 : 20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="h-full"
    >
      {mainContent}
    </motion.div>
  </AnimatePresence>
);

/**
 * COMPLETE EXAMPLE INTEGRATION:
 * 
 * Here's how your modified component structure should look:
 */

const SidePanelRefactored: React.FC<SidePanelProps> = ({ user, onAuth, onLogout, apiConfig }) => {
  // ... your existing state variables ...
  const [viewMode, setViewMode] = useState<'reading' | 'conversation'>('reading');

  // ... your existing hooks and functions ...

  return (
    <motion.aside className="h-full relative bg-philonet-background border-l border-philonet-border">
      {/* Header with mode toggle */}
      <div className="p-4 border-b border-philonet-border bg-philonet-panel">
        <div className="flex items-center justify-between">
          {/* Your existing header content */}
          <AuthenticatedTopActionBar {...your existing props} />
          
          {/* Add the conversation toggle */}
          <Button
            onClick={() => setViewMode(prev => prev === 'reading' ? 'conversation' : 'reading')}
            className={cn(
              "h-9 px-3 rounded-lg transition-all duration-200 ml-2",
              viewMode === 'conversation' 
                ? "bg-philonet-blue-500 text-white" 
                : "bg-philonet-card text-philonet-text-muted hover:text-white"
            )}
          >
            <MessageSquare className="w-4 h-4 mr-2" />
            {viewMode === 'reading' ? 'Chat' : 'Reading'}
          </Button>
        </div>
      </div>

      {/* Main content with mode switching */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={viewMode}
            initial={{ opacity: 0, x: viewMode === 'conversation' ? 20 : -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: viewMode === 'conversation' ? -20 : 20 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="h-full"
          >
            {viewMode === 'reading' ? (
              /* Your existing reading mode content */
              <div className="h-full relative">
                {/* Keep all your existing components here */}
              </div>
            ) : (
              /* New conversation mode */
              <ConversationMode
                article={article}
                user={user}
                onBack={() => setViewMode('reading')}
                onGenerateContent={generateContent}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Your existing modals and overlays stay the same */}
    </motion.aside>
  );
};

/**
 * TIPS FOR INTEGRATION:
 * 
 * 1. Start with just the basic toggle - add the useState and button first
 * 2. Test the mode switching before adding animations
 * 3. The ConversationMode component handles its own layout, so you don't need to modify much
 * 4. Your existing article and user data will work perfectly with the conversation room
 * 5. The generateContent function can be your existing content generation logic
 * 6. Consider adding a small indicator showing which mode you're in
 * 7. You can customize the thought starter generation based on your article content
 * 
 * TESTING:
 * 
 * 1. Make sure the toggle button appears and works
 * 2. Verify that conversation mode loads with sample data
 * 3. Test sending messages and asking AI questions (check console logs)
 * 4. Try switching back and forth between modes
 * 5. Test with and without article content
 */
