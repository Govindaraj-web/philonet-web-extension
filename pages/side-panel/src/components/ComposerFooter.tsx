import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Bot, Smile, CornerDownLeft, Loader2, MessageCircle } from 'lucide-react';
import { Button, Textarea } from './ui';
import { cn } from '@extension/ui';
import MentionSuggestions from './MentionSuggestions';
import MentionService, { MentionSuggestion } from '../services/mentionService';

interface ComposerFooterProps {
  composerTab: 'thoughts' | 'ai';
  comment: string;
  commentRows: number;
  aiQuestion: string;
  aiBusy: boolean;
  hiLiteText: string;
  isSubmittingComment: boolean;
  onTabChange: (tab: 'thoughts' | 'ai') => void;
  onCommentChange: (value: string) => void;
  onAiQuestionChange: (value: string) => void;
  onSubmitComment: () => void;
  onAskAi: () => void;
  onClearSelection: () => void;
  onInsertEmoji: () => void;
  onNavigateToText?: () => void;
  onNavigateToTaggedText?: (text: string) => void;
  onOpenAskAIDrawer?: (question?: string) => void; // New prop for opening AI drawer
  commentRef: React.RefObject<HTMLTextAreaElement>;
  fontSize?: 'small' | 'medium' | 'large'; // Font size prop
}

const ComposerFooter: React.FC<ComposerFooterProps> = ({
  composerTab,
  comment,
  commentRows,
  aiQuestion,
  aiBusy,
  hiLiteText,
  isSubmittingComment,
  onTabChange,
  onCommentChange,
  onAiQuestionChange,
  onSubmitComment,
  onAskAi,
  onClearSelection,
  onInsertEmoji,
  onNavigateToText,
  onNavigateToTaggedText,
  onOpenAskAIDrawer,
  commentRef,
  fontSize = 'medium'
}) => {
  // Mention suggestions state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionInput, setMentionInput] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [currentMention, setCurrentMention] = useState<{ mention: string; startPos: number; endPos: number } | null>(null);
  
  const composerRef = useRef<HTMLDivElement>(null);

  // Handle mention detection and suggestions
  const handleTextChange = (value: string, isCommentTab = true) => {
    if (isCommentTab) {
      onCommentChange(value);
    } else {
      onAiQuestionChange(value);
    }

    // Only handle mentions in the thoughts tab
    if (!isCommentTab) {
      setShowMentions(false);
      return;
    }

    const textarea = commentRef.current;
    if (!textarea) return;

    const cursorPosition = textarea.selectionStart;
    const mention = MentionService.getCurrentMention(value, cursorPosition);

    if (mention && mention.mention.length > 1) {
      setCurrentMention(mention);
      setMentionInput(mention.mention);
      setShowMentions(true);
      
      // Calculate position for suggestions dropdown (will be updated when suggestions load)
      updateMentionPosition(textarea, mention.startPos);
    } else {
      setShowMentions(false);
      setCurrentMention(null);
      setMentionInput('');
    }
  };

  // Handle suggestion count changes to update positioning
  const handleSuggestionsChange = (count: number) => {
    if (commentRef.current && currentMention) {
      updateMentionPositionWithCount(commentRef.current, currentMention.startPos, count);
    }
  };

  const updateMentionPosition = (textarea: HTMLTextAreaElement, mentionStart: number) => {
    updateMentionPositionWithCount(textarea, mentionStart, 3); // Default estimate
  };

  const updateMentionPositionWithCount = (textarea: HTMLTextAreaElement, mentionStart: number, suggestionCount: number) => {
    // Get the rectangle of the composer footer and textarea
    const composerRect = composerRef.current?.getBoundingClientRect();
    const textareaRect = textarea.getBoundingClientRect();
    
    if (composerRect && textareaRect) {
      const left = 8; // Small left margin from composer edge
      
      // Calculate accurate height based on actual suggestion count
      const itemHeight = 52; // Height per suggestion item
      const footerHeight = 50; // Footer with navigation hints
      const padding = 8; // Top and bottom padding
      const actualHeight = Math.min(300, suggestionCount * itemHeight + footerHeight + padding);
      
      const gapAbove = 8; // Gap between dropdown and textarea
      
      // Position above the textarea using actual content height
      const top = textareaRect.top - composerRect.top - actualHeight - gapAbove;
      
      // If calculated top is negative (not enough space), force it to show above anyway
      const finalTop = top < 0 ? -actualHeight - 20 : top;
      
      setMentionPosition({ top: finalTop, left });
    }
  };

  const handleUserSelect = (user: MentionSuggestion) => {
    if (!currentMention || !commentRef.current) return;

    const textarea = commentRef.current;
    const { startPos, endPos } = currentMention;
    
    // Preserve existing content by only replacing the @mention part
    const beforeMention = comment.substring(0, startPos);
    const afterMention = comment.substring(endPos);
    const newValue = beforeMention + user.mention + ' ' + afterMention;
    
    onCommentChange(newValue);
    setShowMentions(false);
    setCurrentMention(null);
    
    // Set cursor position after the mention
    setTimeout(() => {
      const newCursorPos = startPos + user.mention.length + 1;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
      textarea.focus();
    }, 0);
  };

  const handlePhiloSelect = () => {
    if (!currentMention || !commentRef.current) return;

    // Replace @Philo with nothing and open AI drawer with the rest as question
    const textarea = commentRef.current;
    const { startPos, endPos } = currentMention;
    const textAfterMention = comment.substring(endPos).trim();
    
    // Preserve existing content by only removing the @Philo mention
    const beforeMention = comment.substring(0, startPos);
    const afterMention = comment.substring(endPos);
    const newComment = (beforeMention + afterMention).trim();
    
    onCommentChange(newComment);
    
    setShowMentions(false);
    setCurrentMention(null);
    
    // Open AI drawer with the question
    if (onOpenAskAIDrawer) {
      onOpenAskAIDrawer(textAfterMention || undefined);
    }
    
    // Focus back on textarea
    setTimeout(() => {
      textarea.focus();
    }, 100);
  };

  // Handle clicking outside to close mentions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showMentions && composerRef.current && !composerRef.current.contains(event.target as Node)) {
        setShowMentions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showMentions]);
  return (
    <div ref={composerRef} className="absolute bottom-0 left-0 right-0 border-t border-philonet-border bg-philonet-panel px-4 py-3 md:px-6 md:py-4 overflow-visible" data-composer-footer>
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => onTabChange("thoughts")}
          className={cn(
            'rounded-full border tracking-philonet-wider flex items-center h-9 px-4 text-sm md:h-10 md:px-5 md:text-base font-semibold transition-all duration-200',
            composerTab === 'thoughts' 
              ? 'text-white bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105' 
              : 'text-philonet-text-muted border-philonet-border-light hover:text-blue-400 hover:border-blue-500/50'
          )}
        >
          <MessageCircle className="inline mr-2 h-4 w-4 md:h-5 md:w-5" />
          <span className="hidden sm:inline">Thoughts</span>
        </button>
        <button
          onClick={() => onTabChange("ai")}
          className={cn(
            'rounded-full border tracking-philonet-wider flex items-center h-9 px-4 text-sm md:h-10 md:px-5 md:text-base font-semibold transition-all duration-200',
            composerTab === 'ai' 
              ? 'text-white bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105' 
              : 'text-philonet-text-muted border-philonet-border-light hover:text-blue-400 hover:border-blue-500/50'
          )}
        >
          <Bot className="inline mr-2 h-4 w-4 md:h-5 md:w-5" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </div>

      {/* Selection tag */}
      {hiLiteText && (
        <div className="mb-3 text-sm" data-tagged-text>
          <div className="flex items-start gap-2">
            <div 
              className="flex-1 px-3 py-2 rounded-lg border cursor-pointer min-h-0 transition-all duration-200 hover:shadow-sm" 
              style={{
                borderColor: 'rgba(203, 163, 57, 0.6)',
                color: '#CBA339',
                backgroundColor: 'rgba(203, 163, 57, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(203, 163, 57, 0.2)';
                e.currentTarget.style.borderColor = 'rgba(203, 163, 57, 0.8)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'rgba(203, 163, 57, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(203, 163, 57, 0.6)';
              }} 
              onClick={() => onNavigateToTaggedText?.(hiLiteText)}
              title="Click to navigate to highlighted text in article"
            >
              <div className="text-xs mb-1 flex items-center gap-1" style={{ color: '#CBA339' }}>
                <span>Tagged text:</span>
                <span className="text-xs opacity-70">📍 Click to navigate</span>
              </div>
              <div className="text-sm leading-relaxed max-h-16 overflow-y-auto whitespace-pre-wrap break-words scrollbar-thin scrollbar-track-transparent" 
                style={{ 
                  scrollbarColor: 'rgba(203, 163, 57, 0.3) transparent'
                }}>
                "{hiLiteText}"
              </div>
            </div>
            <button 
              onClick={onClearSelection} 
              className="text-philonet-text-muted text-sm px-2 py-1 rounded transition-colors flex-shrink-0 self-start hover:text-[#CBA339] hover:bg-[#CBA339]/10"
              title="Clear selection"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Content */}
      {composerTab === 'thoughts' ? (
        <div>
          <div className="rounded-full border border-philonet-border-light bg-philonet-card focus-within:border-philonet-blue-500 flex items-center px-4 py-2 md:px-5 md:py-3">
            <Textarea
              ref={commentRef}
              placeholder={isSubmittingComment ? "Submitting your thought..." : "Add a thought… (type @ to mention users)"}
              value={comment}
              rows={commentRows}
              className={`flex-1 text-sm md:text-base ${isSubmittingComment ? 'opacity-70' : ''}`}
              disabled={isSubmittingComment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleTextChange(e.target.value, true)}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { 
                if (e.key === 'Enter' && !e.shiftKey && !isSubmittingComment && !showMentions) { 
                  e.preventDefault(); 
                  onSubmitComment(); 
                } 
              }}
            />
            <button
              type="button"
              title="Insert emoji"
              className={`ml-2 rounded-full grid place-items-center text-philonet-text-subtle hover:text-philonet-blue-500 h-9 w-9 md:h-10 md:w-10 ${isSubmittingComment ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={onInsertEmoji}
              disabled={isSubmittingComment}
            >
              <Smile className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <Button 
              disabled={!comment.trim() || isSubmittingComment} 
              onClick={onSubmitComment} 
              className="ml-1 h-10 px-4 md:h-11 md:px-5"
            >
              {isSubmittingComment ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline ml-2">Posting...</span>
                </>
              ) : (
                <CornerDownLeft className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </Button>
          </div>
          <div className="mt-2 flex justify-end">
            <span className="text-philonet-text-subtle text-sm md:text-base">
              {isSubmittingComment ? "Submitting thought..." : `${Math.max(0, 280 - comment.length)} characters left`}
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-philonet-lg border border-philonet-blue-500/40 bg-philonet-card/60 shadow-[0_0_0_1px_rgba(59,130,246,0.25)_inset] p-3 md:p-4">
          <div className="mb-2 flex items-center gap-2 text-philonet-text-muted tracking-philonet-wider text-sm md:text-base">
            <Bot className="h-4 w-4 md:h-5 md:w-5" />
            <span>ASK AI</span>
            {aiBusy && (
              <span className="text-xs text-philonet-blue-400 ml-2">
                🤖 Processing...
              </span>
            )}
          </div>
          <Textarea
            placeholder={aiBusy ? "AI is processing your question..." : "Ask a question about this document…"}
            value={aiQuestion}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleTextChange(e.target.value, false)}
            rows={3}
            className={`bg-transparent text-sm md:text-base ${aiBusy ? 'opacity-70' : ''}`}
            disabled={aiBusy}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { 
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !aiBusy) { 
                e.preventDefault(); 
                onAskAi(); 
              } 
            }}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-philonet-text-muted text-sm md:text-base">
              {aiBusy ? "AI is thinking..." : "Press Cmd/Ctrl+Enter to ask"}
            </span>
            <Button 
              disabled={!aiQuestion.trim() || aiBusy} 
              onClick={onAskAi} 
              className="h-10 px-4 md:h-11 md:px-5"
            >
              {aiBusy ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline ml-2">Thinking...</span>
                </>
              ) : (
                <>
                  <Bot className="mr-2 h-4 w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Ask</span>
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Mention Suggestions */}
      <MentionSuggestions
        input={mentionInput}
        onUserSelect={handleUserSelect}
        onPhiloSelect={handlePhiloSelect}
        isVisible={showMentions}
        position={mentionPosition}
        fontSize={fontSize}
        onSuggestionsChange={handleSuggestionsChange}
      />
    </div>
  );
};

export default ComposerFooter;
