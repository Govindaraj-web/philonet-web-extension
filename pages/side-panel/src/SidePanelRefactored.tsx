import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';

// Import modular components and hooks
import {
  AuthenticatedTopActionBar,
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

// PageData interface for web extraction
interface PageData {
  url: string;
  title: string;
  metaDescription: string | null;
  headings: string[];
  visibleText: string;
  structuredData: { tags: string[]; categories: string[] };
  openGraph: Record<string, string>;
  thumbnailUrl: string | null;
  wordCount: number;
  extractedAt: string;
}

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

  // Page data state
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [showPageData, setShowPageData] = useState(false);

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

  // Handle page data viewing
  const handleViewPageData = (data: PageData) => {
    setPageData(data);
    setShowPageData(true);
    console.log('Page data received:', data);
  };

  const closePageDataModal = () => {
    setShowPageData(false);
  };

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
          <AuthenticatedTopActionBar
            showMoreMenu={state.showMoreMenu}
            showHistoryMenu={state.showHistoryMenu}
            historyItems={state.historyItems}
            onToggleMoreMenu={toggleMoreMenu}
            onToggleHistoryMenu={toggleHistoryMenu}
            onHistoryItemClick={openHistoryItem}
            onSummary={() => console.log('Generate summary clicked')}
            onShare={() => console.log('Share clicked')}
            onSave={() => console.log('Save clicked')}
            onViewPageData={handleViewPageData}
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

        {/* Page Data Modal */}
        {showPageData && pageData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closePageDataModal}>
            <div className="bg-philonet-card border border-philonet-border rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Page Data</h2>
                <button 
                  onClick={closePageDataModal}
                  className="text-philonet-text-muted hover:text-white transition-colors"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4 text-sm">
                <div>
                  <h3 className="font-semibold text-philonet-blue-400 mb-2">Basic Info</h3>
                  <div className="space-y-1 text-philonet-text-primary">
                    <p><strong>URL:</strong> <span className="text-philonet-text-secondary break-all">{pageData.url}</span></p>
                    <p><strong>Title:</strong> <span className="text-philonet-text-secondary">{pageData.title}</span></p>
                    <p><strong>Word Count:</strong> <span className="text-philonet-text-secondary">{pageData.wordCount.toLocaleString()}</span></p>
                    <p><strong>Extracted:</strong> <span className="text-philonet-text-secondary">{new Date(pageData.extractedAt).toLocaleString()}</span></p>
                  </div>
                </div>

                {pageData.metaDescription && (
                  <div>
                    <h3 className="font-semibold text-philonet-blue-400 mb-2">Meta Description</h3>
                    <p className="text-philonet-text-secondary">{pageData.metaDescription}</p>
                  </div>
                )}

                {pageData.headings.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-philonet-blue-400 mb-2">Headings</h3>
                    <ul className="space-y-1">
                      {pageData.headings.slice(0, 10).map((heading, index) => (
                        <li key={index} className="text-philonet-text-secondary">• {heading}</li>
                      ))}
                      {pageData.headings.length > 10 && (
                        <li className="text-philonet-text-muted">... and {pageData.headings.length - 10} more</li>
                      )}
                    </ul>
                  </div>
                )}

                {(pageData.structuredData.tags.length > 0 || pageData.structuredData.categories.length > 0) && (
                  <div>
                    <h3 className="font-semibold text-philonet-blue-400 mb-2">Structured Data</h3>
                    {pageData.structuredData.tags.length > 0 && (
                      <div className="mb-2">
                        <strong className="text-philonet-text-primary">Tags:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pageData.structuredData.tags.map((tag, index) => (
                            <span key={index} className="bg-philonet-border px-2 py-1 rounded text-xs text-philonet-text-secondary">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {pageData.structuredData.categories.length > 0 && (
                      <div>
                        <strong className="text-philonet-text-primary">Categories:</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {pageData.structuredData.categories.map((category, index) => (
                            <span key={index} className="bg-philonet-border px-2 py-1 rounded text-xs text-philonet-text-secondary">
                              {category}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {Object.keys(pageData.openGraph).length > 0 && (
                  <div>
                    <h3 className="font-semibold text-philonet-blue-400 mb-2">Open Graph Data</h3>
                    <div className="space-y-1">
                      {Object.entries(pageData.openGraph).map(([key, value]) => (
                        <p key={key} className="text-philonet-text-primary">
                          <strong>{key}:</strong> <span className="text-philonet-text-secondary">{value}</span>
                        </p>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold text-philonet-blue-400 mb-2">Content Preview</h3>
                  <div className="bg-philonet-panel p-3 rounded border max-h-60 overflow-y-auto">
                    <pre className="text-xs text-philonet-text-secondary whitespace-pre-wrap">
                      {pageData.visibleText.slice(0, 2000)}{pageData.visibleText.length > 2000 ? '...' : ''}
                    </pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
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
