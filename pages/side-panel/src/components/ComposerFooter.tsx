import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Bot, Smile, CornerDownLeft, Loader2, MessageCircle, AlertCircle, Users, ToggleLeft, ToggleRight } from 'lucide-react';
import { Button, Textarea } from './ui';
import { cn } from '@extension/ui';
import { motion, AnimatePresence } from 'framer-motion';
import MentionSuggestions from './MentionSuggestions';
import MentionService, { MentionSuggestion } from '../services/mentionService';
import FriendsPicker from './FriendsPicker';
import { TopFriend } from '../services/thoughtRoomsApi';

interface ComposerFooterProps {
  composerTab: 'thoughts' | 'ai';
  comment: string;
  commentRows: number;
  aiQuestion: string;
  aiBusy: boolean;
  hiLiteText: string;
  isSubmittingComment: boolean;
  isConversationStarter: boolean; // New prop for conversation starter toggle
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
  onToggleConversationStarter: (enabled: boolean) => void; // New prop for conversation starter toggle
  onSelectedFriendsChange?: (friends: TopFriend[]) => void; // New prop for selected friends callback
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
  isConversationStarter,
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
  onToggleConversationStarter,
  onSelectedFriendsChange,
  commentRef,
  fontSize = 'medium'
}) => {
  // Mention suggestions state
  const [showMentions, setShowMentions] = useState(false);
  const [mentionInput, setMentionInput] = useState('');
  const [mentionPosition, setMentionPosition] = useState({ top: 0, left: 0 });
  const [currentMention, setCurrentMention] = useState<{ mention: string; startPos: number; endPos: number } | null>(null);
  
  // Validation state for thought submission
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [showValidationMessage, setShowValidationMessage] = useState(false);
  
  // Friends picker state
  const [showFriendsPicker, setShowFriendsPicker] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<TopFriend[]>([]);
  
  // Success animation state
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  
  // Local loading state for immediate UI feedback
  const [isLocalSubmitting, setIsLocalSubmitting] = useState(false);

  // Listen for success events
  useEffect(() => {
    const handleSuccess = (event: CustomEvent) => {
      const { isConversationStarter, mentionCount, friendCount } = event.detail || {};
      
      // Reset local loading state
      setIsLocalSubmitting(false);
      
      setShowSuccessAnimation(true);
      
      // Set contextual success message
      
      if (isConversationStarter) {
        setSuccessMessage(
          friendCount > 0 
            ? `Shared with ${friendCount} friend${friendCount > 1 ? 's' : ''}! 🎉`
            : 'Conversation started! 💫'
        );
      } else {
        setSuccessMessage(
          friendCount > 0 
            ? `Thought posted & ${friendCount} friend${friendCount > 1 ? 's' : ''} invited! 🎯`
            : 'Thought posted! ✨'
        );
      }
      
      // Reset animation and message after duration
      setTimeout(() => {
        setShowSuccessAnimation(false);
        setSuccessMessage('');
      }, 2500);
    };

    window.addEventListener('commentSubmitSuccess' as any, handleSuccess);
    return () => window.removeEventListener('commentSubmitSuccess' as any, handleSuccess);
  }, [selectedFriends.length]);
  
  // Reset local loading state when global loading state changes
  useEffect(() => {
    if (!isSubmittingComment && isLocalSubmitting) {
      // Small delay to ensure smooth transition
      setTimeout(() => {
        setIsLocalSubmitting(false);
      }, 100);
    }
  }, [isSubmittingComment, isLocalSubmitting]);
  
  const composerRef = useRef<HTMLDivElement>(null);

  // Validation function for thought submission
  const validateThoughtSubmission = (): { isValid: boolean; message: string } => {
    // Check if comment is empty or only whitespace
    if (!comment.trim()) {
      return {
        isValid: false,
        message: 'Please enter some content for your thought before posting.'
      };
    }

    // Check if there's no tagged content
    if (!hiLiteText || !hiLiteText.trim()) {
      return {
        isValid: false,
        message: 'Please select some text from the article first to create a meaningful thought with context.'
      };
    }

    // All validation passed - @mentions are optional
    return { isValid: true, message: '' };
  };

  // Enhanced submit handler with validation
  const handleSubmitWithValidation = () => {
    const validation = validateThoughtSubmission();
    
    if (!validation.isValid) {
      setValidationMessage(validation.message);
      setShowValidationMessage(true);
      
      // Auto-hide validation message after 5 seconds
      setTimeout(() => {
        setShowValidationMessage(false);
      }, 5000);
      
      return;
    }

    // Clear any existing validation messages
    setShowValidationMessage(false);
    setValidationMessage('');
    
    // Set local loading state immediately for instant UI feedback
    setIsLocalSubmitting(true);
    
    // Proceed with submission
    onSubmitComment();
  };

  // Hide validation message when user addresses the validation issues
  useEffect(() => {
    if (showValidationMessage && comment.trim() && hiLiteText && hiLiteText.trim()) {
      setShowValidationMessage(false);
    }
  }, [comment, hiLiteText, showValidationMessage]);

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

  // Handle friends selection
  const handleFriendsSelect = (friends: TopFriend[]) => {
    setSelectedFriends(friends);
    // Just store the selected friends - don't add @mentions to the comment automatically
    // The mentions will be sent to the API when the comment is submitted
    
    // Notify parent component about selected friends
    onSelectedFriendsChange?.(friends);
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
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
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
        
        {/* Top Right Controls - Add Friends & Conversation Starter */}
        <div className="flex items-center gap-2">
          {/* Add Friends Button - functional in both conversation starter and regular modes */}
          <button
            type="button"
            onClick={() => setShowFriendsPicker(true)}
            className={cn(
              'rounded-full border tracking-philonet-wider flex items-center h-8 px-3 text-xs font-semibold transition-all duration-200',
              selectedFriends.length > 0 
                ? 'text-white bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105' 
                : 'text-philonet-text-muted border-philonet-border-light hover:text-blue-400 hover:border-blue-500/50'
            )}
            title={
              isConversationStarter 
                ? "Add friends to mention and invite" 
                : "Add friends to invite to this highlight"
            }
            disabled={isSubmittingComment}
          >
            <Users className={cn('h-3 w-3 mr-1.5', selectedFriends.length > 0 ? 'text-white' : 'text-philonet-text-muted')} />
            <span className="hidden sm:inline">
              {selectedFriends.length > 0 
                ? `${selectedFriends.length} friend${selectedFriends.length > 1 ? 's' : ''}` 
                : 'Add friends'
              }
            </span>
          </button>

          {/* Conversation Starter Toggle */}
          <button
            type="button"
            onClick={() => onToggleConversationStarter?.(!isConversationStarter)}
            className={cn(
              'rounded-full border tracking-philonet-wider flex items-center h-8 px-3 text-xs font-semibold transition-all duration-200',
              isConversationStarter 
                ? 'text-white bg-gradient-to-r from-blue-500 to-blue-600 border-blue-400 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:scale-105' 
                : 'text-philonet-text-muted border-philonet-border-light hover:text-blue-400 hover:border-blue-500/50'
            )}
            title={`${isConversationStarter ? 'Disable' : 'Enable'} conversation starter`}
            disabled={isSubmittingComment}
          >
            {isConversationStarter ? (
              <ToggleRight className="h-3 w-3 mr-1.5 text-white" />
            ) : (
              <ToggleLeft className="h-3 w-3 mr-1.5 text-philonet-text-muted" />
            )}
            <span className="hidden sm:inline">Starter</span>
          </button>
        </div>
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
          {/* Success Message */}
          <AnimatePresence>
            {showSuccessAnimation && successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -5, scale: 0.95 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="mb-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm px-4 py-2 rounded-lg shadow-lg border border-green-400/30 flex items-center gap-2 backdrop-blur-sm"
              >
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                <span className="font-medium">{successMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div 
            className={`relative bg-philonet-card/20 focus-within:bg-philonet-card/40 flex items-center px-4 py-2 md:px-5 md:py-3 ${commentRows > 1 ? 'rounded-xl' : 'rounded-full'} transition-all duration-200 cursor-text`}
            style={{
              // Force no outlines on all children
              outline: 'none',
              border: 'none',
            }}
            onClick={(e) => {
              // If user clicks on the container (padding area), focus the textarea
              if (e.target === e.currentTarget && commentRef.current) {
                commentRef.current.focus();
              }
            }}
          >
            {/* Validation Hint - Top Right Corner */}
            <AnimatePresence>
              {showValidationMessage && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 5 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 5 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="absolute -top-12 right-2 z-50 bg-amber-500/95 text-amber-50 text-xs px-3 py-1.5 rounded-lg shadow-lg border border-amber-400/30 flex items-center gap-1.5 backdrop-blur-sm max-w-64"
                >
                  <AlertCircle className="w-3 h-3 flex-shrink-0" />
                  <span className="flex-1 text-wrap">
                    {!comment.trim() 
                      ? "Enter some content" 
                      : !hiLiteText || !hiLiteText.trim()
                        ? "Select text from article first"
                        : "Validation error"
                    }
                  </span>
                  <button
                    onClick={() => setShowValidationMessage(false)}
                    className="w-3 h-3 rounded-full hover:bg-amber-400/30 flex items-center justify-center transition-colors ml-1"
                    title="Dismiss"
                  >
                    <span className="text-[10px] leading-none">×</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            
            <Textarea
              ref={commentRef}
              placeholder={
                isSubmittingComment 
                  ? (isConversationStarter ? "Sharing with friends..." : "Submitting your thought...")
                  : "Add a thought… (type @ to mention users)"
              }
              value={comment}
              rows={commentRows}
              className={`flex-1 text-sm md:text-base min-h-[32px] py-1 ${isSubmittingComment ? 'opacity-70' : ''}`}
              style={{
                outline: 'none !important',
                border: 'none !important',
                boxShadow: 'none !important',
                WebkitAppearance: 'none',
              }}
              disabled={isSubmittingComment}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleTextChange(e.target.value, true)}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { 
                if (e.key === 'Enter' && !e.shiftKey && !isSubmittingComment && !showMentions) { 
                  e.preventDefault(); 
                  handleSubmitWithValidation(); 
                } 
              }}
              onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                // Force remove any focus styles
                e.target.style.outline = 'none';
                e.target.style.border = 'none';
                e.target.style.boxShadow = 'none';
              }}
              onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
                // Ensure styles remain removed
                e.target.style.outline = 'none';
                e.target.style.border = 'none';
                e.target.style.boxShadow = 'none';
              }}
            />
            <motion.button
              type="button"
              title="Insert emoji"
              whileTap={{ scale: 0.9 }}
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 400, damping: 17 }}
              className={`ml-2 rounded-full grid place-items-center text-philonet-text-subtle hover:text-philonet-blue-500 hover:bg-philonet-blue-500/10 h-9 w-9 md:h-10 md:w-10 transition-colors duration-200 ${isSubmittingComment ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => {
                if ('vibrate' in navigator && !isSubmittingComment) {
                  navigator.vibrate(30);
                }
                onInsertEmoji();
              }}
              disabled={isSubmittingComment}
            >
              <Smile className="h-5 w-5 md:h-6 md:w-6" />
            </motion.button>
            <Button 
              disabled={(isSubmittingComment || isLocalSubmitting) || !comment.trim() || (!hiLiteText || !hiLiteText.trim())} 
              onClick={() => {
                // Add haptic feedback on click
                if ('vibrate' in navigator && !(isSubmittingComment || isLocalSubmitting)) {
                  navigator.vibrate(50);
                }
                handleSubmitWithValidation();
              }} 
              className={cn(
                "ml-1 h-10 px-4 md:h-11 md:px-5 transition-all duration-200",
                (isSubmittingComment || isLocalSubmitting)
                  ? "opacity-70 cursor-not-allowed bg-philonet-blue-500/50"
                  : !comment.trim() || (!hiLiteText || !hiLiteText.trim())
                    ? "opacity-50 cursor-not-allowed" 
                    : "hover:scale-105 hover:shadow-lg hover:bg-philonet-blue-500 hover:border-philonet-blue-400 active:scale-95 active:shadow-xl",
                showSuccessAnimation && "bg-green-500 text-white scale-105 shadow-lg animate-pulse"
              )}
              title={
                (isSubmittingComment || isLocalSubmitting)
                  ? (isConversationStarter ? "Sharing with friends..." : "Submitting thought...")
                  : !comment.trim() 
                    ? "Please enter some content"
                    : !hiLiteText || !hiLiteText.trim()
                      ? "Please select text from the article first"
                      : (isConversationStarter ? "Share with friends" : "Post your thought")
              }
              onMouseDown={() => {
                // Add slight haptic feedback on mouse down for desktop
                if ('vibrate' in navigator && !(isSubmittingComment || isLocalSubmitting)) {
                  navigator.vibrate(25);
                }
              }}
            >
              {(isSubmittingComment || isLocalSubmitting) ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white" />
                  <span className="hidden sm:inline ml-2 text-white">
                    {isConversationStarter ? "Sharing..." : "Posting..."}
                  </span>
                </>
              ) : (
                <CornerDownLeft className="h-4 w-4 md:h-5 md:w-5" />
              )}
            </Button>
          </div>
          
          <div className="mt-2 flex justify-end">
            <span className="text-philonet-text-subtle text-sm md:text-base">
              {isSubmittingComment 
                ? (isConversationStarter ? "Sharing with friends..." : "Submitting thought...") 
                : `${Math.max(0, 280 - comment.length)} characters left`
              }
            </span>
          </div>
        </div>
      ) : (
        <div className="rounded-philonet-lg bg-philonet-card/20 focus-within:bg-philonet-card/40 transition-all duration-200 p-3 md:p-4">
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
            style={{
              outline: 'none !important',
              border: 'none !important',
              boxShadow: 'none !important',
              WebkitAppearance: 'none',
            }}
            disabled={aiBusy}
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { 
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !aiBusy) { 
                e.preventDefault(); 
                onAskAi(); 
              } 
            }}
            onFocus={(e: React.FocusEvent<HTMLTextAreaElement>) => {
              // Force remove any focus styles
              e.target.style.outline = 'none';
              e.target.style.border = 'none';
              e.target.style.boxShadow = 'none';
            }}
            onBlur={(e: React.FocusEvent<HTMLTextAreaElement>) => {
              // Ensure styles remain removed
              e.target.style.outline = 'none';
              e.target.style.border = 'none';
              e.target.style.boxShadow = 'none';
            }}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-philonet-text-muted text-sm md:text-base">
              {aiBusy ? "AI is thinking..." : "Press Cmd/Ctrl+Enter to ask"}
            </span>
            <Button 
              disabled={!aiQuestion.trim() || aiBusy} 
              onClick={() => {
                // Add haptic feedback on click
                if ('vibrate' in navigator) {
                  navigator.vibrate(50);
                }
                onAskAi();
              }} 
              className={cn(
                "h-10 px-4 md:h-11 md:px-5 transition-all duration-200",
                !aiQuestion.trim() || aiBusy
                  ? "opacity-50 cursor-not-allowed" 
                  : "hover:scale-105 hover:shadow-lg hover:bg-philonet-blue-500 hover:border-philonet-blue-400 active:scale-95"
              )}
              onMouseDown={() => {
                // Add slight haptic feedback on mouse down for desktop
                if ('vibrate' in navigator && !aiBusy) {
                  navigator.vibrate(25);
                }
              }}
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

      {/* Friends Picker Modal */}
      <FriendsPicker
        isOpen={showFriendsPicker}
        onClose={() => setShowFriendsPicker(false)}
        onFriendsSelect={handleFriendsSelect}
        selectedFriends={selectedFriends}
      />
    </div>
  );
};

export default ComposerFooter;
