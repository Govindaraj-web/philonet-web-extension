import React, { useState, useEffect, useRef } from 'react';
import { User, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import MentionService, { MentionSuggestion } from '../services/mentionService';

interface MentionSuggestionsProps {
  input: string;
  onUserSelect: (user: MentionSuggestion) => void;
  onPhiloSelect: () => void;
  isVisible: boolean;
  position: { top: number; left: number };
  fontSize?: 'small' | 'medium' | 'large';
  onSuggestionsChange?: (count: number) => void; // New callback for suggestion count changes
}

const MentionSuggestions: React.FC<MentionSuggestionsProps> = ({
  input,
  onUserSelect,
  onPhiloSelect,
  isVisible,
  position,
  fontSize = 'medium',
  onSuggestionsChange
}) => {
  const [suggestions, setSuggestions] = useState<MentionSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const mentionService = useRef(new MentionService());
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Font size utility
  const getFontSizeClasses = () => {
    switch (fontSize) {
      case 'small': return { text: 'text-xs', textSm: 'text-xs', textBase: 'text-sm' };
      case 'large': return { text: 'text-base', textSm: 'text-sm', textBase: 'text-lg' };
      default: return { text: 'text-sm', textSm: 'text-xs', textBase: 'text-base' };
    }
  };

  const fontClasses = getFontSizeClasses();

  useEffect(() => {
    if (!isVisible || !input) {
      setSuggestions([]);
      setSelectedIndex(0);
      return;
    }

    const fetchSuggestions = async () => {
      try {
        setLoading(true);
        
        // Check for @Philo trigger
        const isPhilo = input.toLowerCase().startsWith('@philo');
        
        if (isPhilo) {
          // Add Philo AI suggestion
          const philoSuggestion = [{
            user_id: 'philo-ai',
            name: 'Philo AI',
            display_name: 'Philo AI',
            avatar: '/philonet.png',
            username: 'philo',
            mention: '@Philo',
            display_text: 'Ask Philo AI a question'
          }];
          setSuggestions(philoSuggestion);
          setSelectedIndex(0);
          onSuggestionsChange?.(philoSuggestion.length);
        } else {
          // Fetch user suggestions
          const response = await mentionService.current.getMentionSuggestions({
            input,
            limit: 8
          });
          
          if (response.success) {
            setSuggestions(response.suggestions);
            setSelectedIndex(0);
            onSuggestionsChange?.(response.suggestions.length);
          }
        }
      } catch (error) {
        console.error('Failed to fetch mention suggestions:', error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(fetchSuggestions, 150);
    return () => clearTimeout(debounceTimer);
  }, [input, isVisible]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isVisible || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev === 0 ? suggestions.length - 1 : prev - 1);
        break;
      case 'Enter':
      case 'Tab':
        e.preventDefault();
        handleSelectSuggestion(suggestions[selectedIndex]);
        break;
      case 'Escape':
        e.preventDefault();
        // The parent should handle closing
        break;
    }
  };

  // Scroll selected item into view when selectedIndex changes
  useEffect(() => {
    if (scrollContainerRef.current && isVisible && suggestions.length > 0) {
      const container = scrollContainerRef.current;
      const selectedElement = container.children[selectedIndex] as HTMLElement;
      
      if (selectedElement) {
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.clientHeight;
        const elementTop = selectedElement.offsetTop;
        const elementBottom = elementTop + selectedElement.offsetHeight;
        
        if (elementTop < containerTop) {
          // Scroll up to show the element
          container.scrollTop = elementTop;
        } else if (elementBottom > containerBottom) {
          // Scroll down to show the element
          container.scrollTop = elementBottom - container.clientHeight;
        }
      }
    }
  }, [selectedIndex, isVisible, suggestions.length]);

  useEffect(() => {
    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
    return undefined;
  }, [isVisible, suggestions, selectedIndex]);

  const handleSelectSuggestion = (suggestion: MentionSuggestion) => {
    if (suggestion.user_id === 'philo-ai') {
      onPhiloSelect();
    } else {
      onUserSelect(suggestion);
    }
  };

  if (!isVisible || (!loading && suggestions.length === 0)) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.95 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        className="absolute z-[9999] bg-philonet-card/95 backdrop-blur-md border border-philonet-border rounded-lg shadow-2xl min-w-[280px] max-w-[400px] overflow-hidden"
        style={{
          top: position.top,
          left: position.left,
          right: 'auto',
          bottom: 'auto',
          maxHeight: Math.min(300, suggestions.length * 52 + 58) // More accurate: 52px per item + 58px footer
        }}
      >
        {loading ? (
          <div className="p-3 flex items-center gap-2 text-philonet-text-muted">
            <div className="w-3 h-3 border border-philonet-blue-400 border-t-transparent rounded-full animate-spin"></div>
            <span className={fontClasses.text}>Searching users...</span>
          </div>
        ) : (
          <div className="flex flex-col">
            {/* Scrollable suggestions list */}
            <div 
              ref={scrollContainerRef}
              className="max-h-[240px] overflow-y-auto py-1 scrollbar-thin scrollbar-track-philonet-border/20 scrollbar-thumb-philonet-border/60 hover:scrollbar-thumb-philonet-border/80"
            >
              {suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.user_id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.1, delay: index * 0.02 }}
                className={`flex items-center gap-3 px-3 py-2 cursor-pointer transition-all duration-150 ${
                  index === selectedIndex 
                    ? 'bg-philonet-blue-600/20 border-l-2 border-philonet-blue-400' 
                    : 'hover:bg-philonet-border/30'
                }`}
                onClick={() => handleSelectSuggestion(suggestion)}
              >
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {suggestion.user_id === 'philo-ai' ? (
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                      <Bot className="w-4 h-4 text-white" />
                    </div>
                  ) : (
                    <img
                      src={suggestion.avatar}
                      alt={suggestion.name}
                      className="w-8 h-8 rounded-full border border-philonet-border/50"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(suggestion.name.charAt(0))}&background=4285f4&color=fff&size=32&bold=true`;
                      }}
                    />
                  )}
                  {suggestion.user_id === 'philo-ai' && (
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-philonet-blue-500 rounded-full border border-philonet-card flex items-center justify-center">
                      <div className="w-1 h-1 bg-white rounded-full"></div>
                    </div>
                  )}
                </div>

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className={`font-medium text-white truncate ${fontClasses.textBase}`}>
                    {suggestion.display_text || suggestion.display_name}
                  </div>
                  <div className={`text-philonet-text-muted truncate ${fontClasses.textSm}`}>
                    {suggestion.mention}
                  </div>
                </div>

                {/* Special indicator for Philo AI */}
                {suggestion.user_id === 'philo-ai' && (
                  <div className={`text-philonet-blue-400 font-medium ${fontClasses.textSm}`}>
                    AI
                  </div>
                )}
              </motion.div>
            ))}
            </div>

            {/* Footer with hint */}
            <div className={`px-3 py-2 border-t border-philonet-border/50 bg-philonet-background/30 text-philonet-text-muted ${fontClasses.textSm}`}>
              <div className="flex items-center justify-between">
                <span>Use ↑↓ to navigate</span>
                <span>Enter to select</span>
              </div>
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default MentionSuggestions;
