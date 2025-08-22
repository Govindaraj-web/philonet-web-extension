import React from 'react';
import { MessageSquare, Bot, Smile, CornerDownLeft, Loader2, MessageCircle } from 'lucide-react';
import { Button, Textarea } from './ui';
import { cn } from '@extension/ui';

interface ComposerFooterProps {
  composerTab: 'thoughts' | 'ai';
  comment: string;
  commentRows: number;
  aiQuestion: string;
  aiBusy: boolean;
  hiLiteText: string;
  onTabChange: (tab: 'thoughts' | 'ai') => void;
  onCommentChange: (value: string) => void;
  onAiQuestionChange: (value: string) => void;
  onSubmitComment: () => void;
  onAskAi: () => void;
  onClearSelection: () => void;
  onInsertEmoji: () => void;
  onNavigateToText?: () => void;
  commentRef: React.RefObject<HTMLTextAreaElement>;
}

const ComposerFooter: React.FC<ComposerFooterProps> = ({
  composerTab,
  comment,
  commentRows,
  aiQuestion,
  aiBusy,
  hiLiteText,
  onTabChange,
  onCommentChange,
  onAiQuestionChange,
  onSubmitComment,
  onAskAi,
  onClearSelection,
  onInsertEmoji,
  onNavigateToText,
  commentRef
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 border-t border-philonet-border bg-philonet-panel px-4 py-3 md:px-6 md:py-4" data-composer-footer>
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
              onClick={onNavigateToText}
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
              placeholder="Add a thought…"
              value={comment}
              rows={commentRows}
              className="flex-1 text-sm md:text-base"
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onCommentChange(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { 
                if (e.key === 'Enter' && !e.shiftKey) { 
                  e.preventDefault(); 
                  onSubmitComment(); 
                } 
              }}
            />
            <button
              type="button"
              title="Insert emoji"
              className="ml-2 rounded-full grid place-items-center text-philonet-text-subtle hover:text-philonet-blue-500 h-9 w-9 md:h-10 md:w-10"
              onClick={onInsertEmoji}
            >
              <Smile className="h-5 w-5 md:h-6 md:w-6" />
            </button>
            <Button 
              disabled={!comment.trim()} 
              onClick={onSubmitComment} 
              className="ml-1 h-10 px-4 md:h-11 md:px-5"
            >
              <CornerDownLeft className="h-4 w-4 md:h-5 md:w-5" />
            </Button>
          </div>
          <div className="mt-2 flex justify-end">
            <span className="text-philonet-text-subtle text-sm md:text-base">
              {Math.max(0, 280 - comment.length)} characters left
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
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onAiQuestionChange(e.target.value)}
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
    </div>
  );
};

export default ComposerFooter;
