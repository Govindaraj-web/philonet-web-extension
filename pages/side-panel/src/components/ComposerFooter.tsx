import React from 'react';
import { MessageSquare, Bot, Smile, CornerDownLeft, Loader2 } from 'lucide-react';
import { Button, Textarea } from './ui';
import { cn } from '@extension/ui';

interface ComposerFooterProps {
  composerTab: 'comments' | 'ai';
  comment: string;
  commentRows: number;
  aiQuestion: string;
  aiBusy: boolean;
  hiLiteText: string;
  onTabChange: (tab: 'comments' | 'ai') => void;
  onCommentChange: (value: string) => void;
  onAiQuestionChange: (value: string) => void;
  onSubmitComment: () => void;
  onAskAi: () => void;
  onClearSelection: () => void;
  onInsertEmoji: () => void;
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
  commentRef
}) => {
  return (
    <div className="absolute bottom-0 left-0 right-0 border-t border-philonet-border bg-philonet-panel px-4 py-3 md:px-6 md:py-4">
      {/* Tabs */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => onTabChange("comments")}
          className={cn(
            'rounded-full border tracking-philonet-wider flex items-center h-9 px-4 text-sm md:h-10 md:px-5 md:text-base',
            composerTab === 'comments' 
              ? 'text-philonet-blue-500 border-philonet-blue-500' 
              : 'text-philonet-text-muted border-philonet-border-light'
          )}
        >
          <MessageSquare className="inline mr-2 h-4 w-4 md:h-5 md:w-5" />
          <span className="hidden sm:inline">Comments</span>
        </button>
        <button
          onClick={() => onTabChange("ai")}
          className={cn(
            'rounded-full border tracking-philonet-wider flex items-center h-9 px-4 text-sm md:h-10 md:px-5 md:text-base',
            composerTab === 'ai' 
              ? 'text-philonet-blue-500 border-philonet-blue-500' 
              : 'text-philonet-text-muted border-philonet-border-light'
          )}
        >
          <Bot className="inline mr-2 h-4 w-4 md:h-5 md:w-5" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </div>

      {/* Selection tag */}
      {hiLiteText && (
        <div className="mb-2 flex items-center gap-2 text-sm">
          <span className="px-2 py-1 rounded-full border border-philonet-blue-500/60 text-philonet-blue-400 bg-philonet-blue-500/10 truncate max-w-[80%]" title={hiLiteText}>
            Tagged: "{hiLiteText}"
          </span>
          <button 
            onClick={onClearSelection} 
            className="text-philonet-text-muted hover:text-philonet-blue-500 text-sm"
          >
            Clear
          </button>
        </div>
      )}

      {/* Content */}
      {composerTab === 'comments' ? (
        <div>
          <div className="rounded-full border border-philonet-border-light bg-philonet-card focus-within:border-philonet-blue-500 flex items-center px-4 py-2 md:px-5 md:py-3">
            <Textarea
              ref={commentRef}
              placeholder="Add a comment…"
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
          </div>
          <Textarea
            placeholder="Ask a question about this document…"
            value={aiQuestion}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onAiQuestionChange(e.target.value)}
            rows={3}
            className="bg-transparent text-sm md:text-base"
            onKeyDown={(e: React.KeyboardEvent<HTMLTextAreaElement>) => { 
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { 
                e.preventDefault(); 
                onAskAi(); 
              } 
            }}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-philonet-text-muted text-sm md:text-base">Press Cmd/Ctrl+Enter to ask</span>
            <Button 
              disabled={!aiQuestion.trim() || aiBusy} 
              onClick={onAskAi} 
              className="h-10 px-4 md:h-11 md:px-5"
            >
              {aiBusy ? (
                <Loader2 className="animate-spin h-4 w-4 md:h-5 md:w-5" />
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
