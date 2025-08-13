import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';

// Import modular components and hooks
import {
  TopActionBar,
  ContentRenderer,
  ComposerFooter,
  CommentsDock
} from './components';

import {
  useSpeech,
  useMarkdown,
  useSidePanelState,
  useSelection,
  useClickOutside
} from './hooks';

import { SidePanelProps } from './types';
import { SAMPLE_MARKDOWNS } from './data/sampleContent';

const SidePanel: React.FC<SidePanelProps> = ({
  user,
  onAuth,
  onLogout,
  apiConfig
}) => {
  console.log('🔧 SidePanel component initializing...');
  
  // Refs
  const contentRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // State management
  const {
    state,
    updateState,
    submitComment,
    adjustCommentRows,
    askAi,
    gotoDockIndex,
    toggleHistoryMenu,
    toggleMoreMenu,
    openSourcePage,
    openHistoryItem,
  } = useSidePanelState();

  // Speech functionality
  const { isPlaying, isSupported: speechSupported, speak: speakText } = useSpeech();

  // Markdown processing
  const { extractMeta, parseSections, renderHighlighted, getArticleText } = useMarkdown();

  // Sample content
  const [sampleIdx] = useState(0);
  const markdownContent = SAMPLE_MARKDOWNS[sampleIdx].md;
  const meta = extractMeta(markdownContent);
  const sections = parseSections(meta.body);

  console.log('📝 Markdown content loaded:', markdownContent.substring(0, 100) + '...');
  console.log('🏷️ Extracted metadata:', meta);
  console.log('📋 Parsed sections:', sections);

  // Selection handling
  useSelection(contentRef, (text: string) => {
    updateState({ hiLiteText: text, dockFilterText: text });
  });

  // Click outside handling for menus
  useClickOutside(state.showHistoryMenu, '[data-history-menu]', () => {
    updateState({ showHistoryMenu: false });
  });

  useClickOutside(state.showMoreMenu, '[data-more-menu]', () => {
    updateState({ showMoreMenu: false });
  });

  // Measure footer height
  useEffect(() => {
    if (!footerRef.current) return;
    const ro = new ResizeObserver(() => {
      const h = footerRef.current?.getBoundingClientRect().height || 172;
      updateState({ footerH: Math.round(h) });
    });
    ro.observe(footerRef.current);
    return () => ro.disconnect();
  }, [updateState]);

  // Dock list computation
  const dockList = state.dockFilterText
    ? state.comments.filter((c) => 
        (c.tag?.text || "").toLowerCase() === state.dockFilterText.toLowerCase()
      )
    : state.comments;

  useEffect(() => {
    if (dockList.length === 0) { 
      updateState({ dockActiveIndex: 0 });
      return; 
    }
    updateState({ 
      dockActiveIndex: Math.min(Math.max(0, state.dockActiveIndex), dockList.length - 1) 
    });
  }, [state.dockFilterText, state.comments, state.dockActiveIndex, updateState]);

  // Handlers
  const handleCommentChange = (value: string) => {
    updateState({ comment: value });
    adjustCommentRows(value);
  };

  const handleCommentSubmit = () => {
    submitComment();
    if (commentRef.current) commentRef.current.focus();
  };

  const handleInsertEmoji = () => {
    const ta = commentRef.current;
    const start = ta?.selectionStart ?? state.comment.length;
    const end = ta?.selectionEnd ?? state.comment.length;
    const next = state.comment.slice(0, start) + '😊' + state.comment.slice(end);
    updateState({ comment: next });
    requestAnimationFrame(() => {
      if (ta) { 
        const pos = start + 2; 
        ta.setSelectionRange(pos, pos); 
        ta.focus(); 
      }
    });
  };

  const handleToggleSpeech = () => {
    const text = getArticleText(meta, sections);
    speakText(text);
  };

  const handleAskAi = () => {
    askAi(meta, sections);
  };

  const handleDockNavigate = (index: number) => {
    gotoDockIndex(index, dockList);
  };

  const handleRenderHighlighted = (text: string) => {
    return renderHighlighted(text, state.hiLiteText);
  };

  try {
    return (
      <div className="relative w-full h-screen bg-philonet-black text-white overflow-hidden font-inter">
        {/* Main Panel - always visible */}
        <motion.aside
          initial={false}
          animate={{ width: "100%" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-screen bg-philonet-panel text-white shadow-2xl overflow-visible w-full max-w-none"
          aria-label="Philonet side panel"
        >
          {/* Top Action Bar */}
          <TopActionBar
            userName={user?.name}
            userAvatar={user?.avatar}
            showMoreMenu={state.showMoreMenu}
            showHistoryMenu={state.showHistoryMenu}
            historyItems={state.historyItems}
            onToggleMoreMenu={toggleMoreMenu}
            onToggleHistoryMenu={toggleHistoryMenu}
            onHistoryItemClick={openHistoryItem}
            onShare={() => console.log('Share clicked')}
            onSave={() => console.log('Save clicked')}
          />

          {/* Content Renderer */}
          <ContentRenderer
            meta={meta}
            sections={sections}
            comments={state.comments}
            isPlaying={isPlaying}
            speechSupported={speechSupported}
            renderHighlighted={handleRenderHighlighted}
            onToggleSpeech={handleToggleSpeech}
            onOpenSource={openSourcePage}
            contentRef={contentRef}
            footerH={state.footerH}
          />

          {/* Composer Footer */}
          <div ref={footerRef}>
            <ComposerFooter
              composerTab={state.composerTab}
              comment={state.comment}
              commentRows={state.commentRows}
              aiQuestion={state.aiQuestion}
              aiBusy={state.aiBusy}
              hiLiteText={state.hiLiteText}
              onTabChange={(tab: 'comments' | 'ai') => updateState({ composerTab: tab })}
              onCommentChange={handleCommentChange}
              onAiQuestionChange={(value: string) => updateState({ aiQuestion: value })}
              onSubmitComment={handleCommentSubmit}
              onAskAi={handleAskAi}
              onClearSelection={() => updateState({ hiLiteText: "" })}
              onInsertEmoji={handleInsertEmoji}
              commentRef={commentRef}
            />
          </div>

          {/* Comments Dock */}
          <div 
            className="absolute right-3 z-30"
            style={{ bottom: state.footerH + 12 }}
          >
            <CommentsDock
              isOpen={state.dockOpen}
              isMinimized={state.dockMinimized}
              activeIndex={state.dockActiveIndex}
              dockList={dockList}
              onNavigate={handleDockNavigate}
              onMinimize={() => updateState({ dockMinimized: true })}
              onExpand={() => updateState({ dockMinimized: false })}
            />
          </div>
        </motion.aside>
        
        {/* Custom Scrollbar Styles */}
        <style>{`
          .philonet-scrollbar::-webkit-scrollbar {
            width: 8px;
          }
          
          .philonet-scrollbar::-webkit-scrollbar-track {
            background: #1f2937;
            border-radius: 4px;
          }
          
          .philonet-scrollbar::-webkit-scrollbar-thumb {
            background: #374151;
            border-radius: 4px;
            border: 1px solid #1f2937;
          }
          
          .philonet-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #4b5563;
          }
          
          .philonet-scrollbar::-webkit-scrollbar-corner {
            background: #1f2937;
          }
          
          /* For Firefox */
          .philonet-scrollbar {
            scrollbar-width: thin;
            scrollbar-color: #374151 #1f2937;
          }
        `}</style>
      </div>
    );
  } catch (error) {
    console.error('❌ SidePanel render error:', error);
    return (
      <div className="w-full h-screen bg-red-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl mb-4">SidePanel Error</h1>
          <p className="text-sm">Check console for details</p>
          <pre className="text-xs mt-2 bg-red-800 p-2 rounded">{String(error)}</pre>
        </div>
      </div>
    );
  }
};

export default withErrorBoundary(withSuspense(SidePanel, <LoadingSpinner />), ErrorDisplay);
