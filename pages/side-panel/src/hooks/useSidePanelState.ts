import { useState, useEffect, useCallback } from 'react';
import { Comment, AIAnswer, HistoryItem, SidePanelState } from '../types';

const INITIAL_COMMENTS: Comment[] = [
  { 
    id: 1, 
    author: "You", 
    text: "Great design principles for modern reading interfaces.", 
    ts: new Date().toLocaleTimeString(), 
    tag: { text: "Philonet emphasizes clarity, legibility, and rhythm" } 
  },
];

const INITIAL_HISTORY: HistoryItem[] = [
  { id: 1, title: "Philonet Interface Overview", url: "https://example.com/philonet-interface-overview", timestamp: new Date() },
  { id: 2, title: "Design Systems Guide", url: "https://example.com/design-systems", timestamp: new Date(Date.now() - 3600000) },
  { id: 3, title: "Reading Experience Best Practices", url: "https://example.com/reading-ux", timestamp: new Date(Date.now() - 7200000) }
];

export function useSidePanelState() {
  const [state, setState] = useState<SidePanelState>({
    comment: "",
    commentRows: 1,
    comments: INITIAL_COMMENTS,
    composerTab: "comments",
    aiQuestion: "",
    aiBusy: false,
    aiAnswers: [],
    hiLiteText: "",
    dockFilterText: "",
    dockOpen: true,
    dockActiveIndex: 0,
    dockMinimized: false,
    currentSourceUrl: "https://example.com/philonet-interface-overview",
    historyItems: INITIAL_HISTORY,
    showHistoryMenu: false,
    showMoreMenu: false,
    footerH: 172,
  });

  // Comment actions
  const submitComment = useCallback(() => {
    const text = state.comment.trim();
    if (!text) return;
    
    const newComment: Comment = { 
      id: Date.now(), 
      author: "You", 
      text, 
      ts: new Date().toLocaleTimeString(), 
      tag: state.hiLiteText ? { text: state.hiLiteText } : null 
    };
    
    setState(prev => ({
      ...prev,
      comments: [newComment, ...prev.comments],
      comment: "",
      commentRows: 1,
    }));
  }, [state.comment, state.hiLiteText]);

  const adjustCommentRows = useCallback((value: string) => {
    const lines = value.split(/\n/).length;
    const approx = Math.ceil((value.length || 0) / 60);
    const target = Math.min(6, Math.max(1, lines + approx - 1));
    setState(prev => ({ ...prev, commentRows: target }));
  }, []);

  // AI actions
  const synthesizeAiAnswer = useCallback((q: string, meta: any, sections: any) => {
    const bullets = (sections.details || "").match(/^[-*]\s.+/gm) || [];
    const cats = meta.categories?.join(", ") || "Uncategorized";
    const tags = meta.tags?.join(", ") || "—";
    const title = meta.title || "Untitled";
    const tableMention = /\|.+\|/.test(sections.rest || meta.body) ? "It also includes a table." : "";
    
    return `**Draft answer**

You're asking: _${q}_.

**Context from ${title}**
- Categories: ${cats}
- Tags: ${tags}  
- Key points: ${bullets.slice(0,3).map((b: string) => b.replace(/^[-*]\s/, '')).join('; ') || 'n/a'}

${tableMention}

If you want, I can focus on introduction, details, or conclusion.`;
  }, []);

  const askAi = useCallback((meta: any, sections: any) => {
    const q = state.aiQuestion.trim();
    if (!q) return;
    
    setState(prev => ({ ...prev, aiBusy: true }));
    
    const ans = synthesizeAiAnswer(q, meta, sections);
    const newAnswer: AIAnswer = { id: Date.now(), q, a: ans };
    
    setState(prev => ({
      ...prev,
      aiAnswers: [newAnswer, ...prev.aiAnswers],
      aiQuestion: "",
      aiBusy: false,
    }));
  }, [state.aiQuestion, synthesizeAiAnswer]);

  // Dock management
  const gotoDockIndex = useCallback((nextIndex: number, dockList: Comment[]) => {
    if (dockList.length === 0) return;
    const i = Math.min(Math.max(0, nextIndex), dockList.length - 1);
    setState(prev => ({ ...prev, dockActiveIndex: i }));
  }, []);

  // Menu toggles
  const toggleHistoryMenu = useCallback(() => {
    setState(prev => ({ ...prev, showHistoryMenu: !prev.showHistoryMenu }));
  }, []);

  const toggleMoreMenu = useCallback(() => {
    setState(prev => ({ ...prev, showMoreMenu: !prev.showMoreMenu }));
  }, []);

  // Navigation
  const openSourcePage = useCallback(() => {
    if (state.currentSourceUrl) {
      window.open(state.currentSourceUrl, '_blank', 'noopener,noreferrer');
      console.log('🔗 Opening source URL:', state.currentSourceUrl);
    }
  }, [state.currentSourceUrl]);

  const openHistoryItem = useCallback((url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
    setState(prev => ({ 
      ...prev, 
      showHistoryMenu: false, 
      showMoreMenu: false 
    }));
    console.log('📚 Opening history item:', url);
  }, []);

  // Update single state properties
  const updateState = useCallback((updates: Partial<SidePanelState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  return {
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
  };
}
