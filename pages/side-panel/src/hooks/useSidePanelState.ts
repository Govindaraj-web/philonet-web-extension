import { useState, useEffect, useCallback } from 'react';
import { Comment, AIAnswer, HistoryItem, SidePanelState, HighlightsResponse } from '../types';
import { storeSmartHighlight, fetchHighlightsByArticleId } from '../services/gptSummary';
import { fetchRecentlyViewedArticles, loadMoreHistory } from '../services/historyApi';
import { formatTimeAgo } from '../utils';

const INITIAL_COMMENTS: Comment[] = [
  {
    id: 1,
    author: "Alex Chen",
    text: "This is a fantastic breakdown of the concepts! The way you explained the technical implementation makes it much easier to understand. I've been struggling with this exact problem for weeks.",
    ts: "2 hours ago",
    tag: { text: "implementation details" },
    profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=b6e3f4",
    likeCount: 24,
    isLiked: false,
    replyCount: 8,
    reactions: [
      {
        type: "like",
        count: 12,
        users: [
          { id: "user1", name: "Jamie Kim", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jamie&backgroundColor=c0aede" },
          { id: "user2", name: "Sarah Thompson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=ffd93d" },
          { id: "user3", name: "Mike Johnson" }
        ],
        userReacted: false
      },
      {
        type: "love",
        count: 8,
        users: [
          { id: "user4", name: "Emma Wilson" },
          { id: "user5", name: "David Brown" }
        ],
        userReacted: true
      },
      {
        type: "celebrate",
        count: 3,
        users: [
          { id: "user6", name: "Lisa Garcia" }
        ],
        userReacted: false
      }
    ],
    replies: [
      {
        id: 11,
        author: "Jamie Kim",
        text: "I agree! This helped me solve a similar issue.",
        ts: "1 hour ago",
        profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jamie&backgroundColor=c0aede",
        likeCount: 3,
        isLiked: false,
        replyCount: 0,
        reactions: [
          {
            type: "like",
            count: 5,
            users: [
              { id: "user1", name: "Alex Chen" },
              { id: "user2", name: "Sarah Thompson" }
            ],
            userReacted: false
          }
        ]
      },
      {
        id: 12,
        author: "You",
        text: "Thanks for the feedback! I'm glad it was helpful.",
        ts: "30 minutes ago",
        likeCount: 1,
        isLiked: false,
        replyCount: 0,
        reactions: [
          {
            type: "heart",
            count: 2,
            users: [
              { id: "user1", name: "Alex Chen" }
            ],
            userReacted: false
          }
        ]
      }
    ]
  },
  {
    id: 2,
    author: "Sarah Thompson",
    text: "Great insights! I particularly appreciate the practical examples you provided. Could you share more about the edge cases you mentioned?",
    ts: "5 hours ago",
    tag: { text: "practical examples" },
    profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=ffd93d",
    likeCount: 12,
    isLiked: true,
    replyCount: 3,
    reactions: [
      {
        type: "thinking",
        count: 6,
        users: [
          { id: "user1", name: "Alex Chen" },
          { id: "user3", name: "Mike Johnson" }
        ],
        userReacted: true
      },
      {
        type: "clap",
        count: 4,
        users: [
          { id: "user4", name: "Emma Wilson" }
        ],
        userReacted: false
      }
    ],
    replies: [
      {
        id: 21,
        author: "Mike Rodriguez",
        text: "I'd love to hear about those edge cases too!",
        ts: "4 hours ago",
        profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike&backgroundColor=6bcf7f",
        likeCount: 2,
        isLiked: false,
        replyCount: 0,
        reactions: [
          {
            type: "wow",
            count: 3,
            users: [
              { id: "user2", name: "Sarah Thompson" }
            ],
            userReacted: false
          },
          {
            type: "thinking",
            count: 2,
            users: [
              { id: "user1", name: "Alex Chen" }
            ],
            userReacted: true
          }
        ]
      }
    ]
  },
  {
    id: 3,
    author: "Mike Rodriguez",
    text: "Quick question about the performance implications mentioned here. Have you run any benchmarks?",
    ts: "1 day ago",
    tag: { text: "performance implications" },
    profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Mike&backgroundColor=6bcf7f",
    likeCount: 6,
    isLiked: false,
    replyCount: 1,
    reactions: [
      {
        type: "thinking",
        count: 8,
        users: [
          { id: "user1", name: "Alex Chen" },
          { id: "user2", name: "Sarah Thompson" },
          { id: "user4", name: "Emma Wilson" }
        ],
        userReacted: true
      },
      {
        type: "fire",
        count: 3,
        users: [
          { id: "user5", name: "David Park" }
        ],
        userReacted: false
      }
    ],
    replies: []
  },
  {
    id: 4,
    author: "Emma Wilson",
    text: "This article is exactly what I needed for my current project! The step-by-step approach is perfect. Thank you for sharing this detailed explanation.",
    ts: "3 days ago",
    tag: { text: "step-by-step approach" },
    profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emma&backgroundColor=ff6b6b",
    likeCount: 18,
    isLiked: false,
    replyCount: 5,
    reactions: [
      {
        type: "love",
        count: 14,
        users: [
          { id: "user1", name: "Alex Chen" },
          { id: "user2", name: "Sarah Thompson" },
          { id: "user3", name: "Mike Rodriguez" },
          { id: "user5", name: "David Park" }
        ],
        userReacted: false
      },
      {
        type: "celebrate",
        count: 7,
        users: [
          { id: "user6", name: "Lisa Garcia" },
          { id: "user7", name: "Tom Anderson" }
        ],
        userReacted: true
      },
      {
        type: "clap",
        count: 5,
        users: [
          { id: "user8", name: "Jenny Smith" }
        ],
        userReacted: false
      }
    ],
    replies: []
  },
  {
    id: 5,
    author: "David Park",
    text: "Interesting perspective on this topic. I've been following this field for years and this adds a fresh angle.",
    ts: "1 week ago",
    profilePic: "https://api.dicebear.com/7.x/avataaars/svg?seed=David&backgroundColor=74c0fc",
    likeCount: 9,
    isLiked: false,
    replyCount: 2,
    reactions: [
      {
        type: "wow",
        count: 6,
        users: [
          { id: "user1", name: "Alex Chen" },
          { id: "user4", name: "Emma Wilson" }
        ],
        userReacted: false
      },
      {
        type: "thinking",
        count: 4,
        users: [
          { id: "user2", name: "Sarah Thompson" },
          { id: "user3", name: "Mike Rodriguez" }
        ],
        userReacted: true
      },
      {
        type: "care",
        count: 2,
        users: [
          { id: "user6", name: "Lisa Garcia" }
        ],
        userReacted: false
      }
    ],
    replies: []
  }
];

const INITIAL_HISTORY: HistoryItem[] = [];

export function useSidePanelState() {
  const [state, setState] = useState<SidePanelState>({
    comment: "",
    commentRows: 1,
    comments: INITIAL_COMMENTS,
    composerTab: "thoughts",
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
    historyLoading: false,
    historyError: null,
    historyPage: 1,
    hasMoreHistoryData: true,
    showHistoryMenu: false,
    showMoreMenu: false,
    footerH: 172,
    highlights: [],
    highlightsLoading: false,
    currentArticleId: undefined,
    highlightsResponse: undefined,
    // Content overlay for tagged text highlighting
    showContentOverlay: false,
    overlayTaggedText: "",
    // Comment submission loading state
    isSubmittingComment: false,
  });

  // Comment actions
  const submitComment = useCallback(async (
    selectedFriends: any[] = [],
    skipStateManagement: boolean = false
  ) => {
    const text = state.comment.trim();
    if (!text) return;
    
    // Only manage loading state if not being managed by parent
    if (!skipStateManagement) {
      if (state.isSubmittingComment) return;
      setState(prev => ({ ...prev, isSubmittingComment: true }));
    }
    
    const newComment: Comment = { 
      id: Date.now(), 
      author: "You", 
      text, 
      ts: formatTimeAgo(new Date()), 
      tag: state.hiLiteText ? { text: state.hiLiteText } : null 
    };
    
    try {
      // Store highlight if there's tagged text and selected friends
      if (state.hiLiteText && (selectedFriends.length > 0 || state.hiLiteText)) {
        console.log('💾 Storing highlight with invited users:', selectedFriends.map(f => f.user_id));
        
        const highlightData = {
          content: state.hiLiteText, // Use highlighted text as content for simple comments
          highlighted_text: state.hiLiteText,
          start_index: 0,
          end_index: state.hiLiteText.length,
          message: text, // The comment text becomes the message
          url: state.currentSourceUrl || window.location.href,
          is_private: false,
          invited_users: selectedFriends.map(friend => friend.user_id), // Array of user ID strings
          article_id: state.currentArticleId // Include article_id if available
        };
        
        const result = await storeSmartHighlight(highlightData);
        console.log('✅ Highlight stored successfully with invited users:', result);
      }
      
      // Only update UI state if managing state locally
      if (!skipStateManagement) {
        setState(prev => ({
          ...prev,
          comments: [newComment, ...prev.comments],
          comment: "",
          commentRows: 1,
          isSubmittingComment: false,
        }));
      }
      
    } catch (error) {
      console.error('❌ Failed to store highlight with invited users:', error);
      // Only reset loading state on error if managing state locally
      if (!skipStateManagement) {
        setState(prev => ({
          ...prev,
          comments: [newComment, ...prev.comments],
          comment: "",
          commentRows: 1,
          isSubmittingComment: false,
        }));
      }
    }
  }, [state.comment, state.hiLiteText, state.isSubmittingComment, state.currentSourceUrl, state.currentArticleId]);

  // Enhanced comment submission with highlight storage
  const submitCommentWithHighlight = useCallback(async (
    article?: any, 
    bodyContentRef?: React.RefObject<HTMLDivElement | null>,
    selectedFriends: any[] = [],
    skipStateManagement: boolean = false
  ) => {
    const text = state.comment.trim();
    if (!text) return;
    
    // Only manage loading state if not being managed by parent
    if (!skipStateManagement) {
      if (state.isSubmittingComment) return;
      setState(prev => ({ ...prev, isSubmittingComment: true }));
    }
    
    const newComment: Comment = { 
      id: Date.now(), 
      author: "You", 
      text, 
      ts: formatTimeAgo(new Date()), 
      tag: state.hiLiteText ? { text: state.hiLiteText } : null 
    };
    
    // Store highlight to backend if there's highlighted text and we have article/content data
    if (state.hiLiteText && article && bodyContentRef?.current) {
      try {
        console.log('💾 Storing highlight to backend:', state.hiLiteText);
        
        // Get the full text content and find the position of highlighted text
        const fullText = bodyContentRef.current.textContent || '';
        const startIndex = fullText.indexOf(state.hiLiteText);
        const endIndex = startIndex + state.hiLiteText.length;
        
        const highlightData = {
          content: fullText,
          highlighted_text: state.hiLiteText,
          start_index: startIndex,
          end_index: endIndex,
          message: text, // The comment text becomes the message
          url: article.url || state.currentSourceUrl,
          is_private: false, // Default to public, could be made configurable
          invited_users: selectedFriends.map(friend => friend.user_id), // Array of user ID strings
          article_id: state.currentArticleId // Include article_id if available
        };
        
        console.log('📝 Highlight data being sent:', highlightData);
        
        const result = await storeSmartHighlight(highlightData);
        console.log('✅ Highlight stored successfully:', result);
        
        // Only manage UI state if managing state locally
        if (!skipStateManagement) {
          setState(prev => ({
            ...prev,
            comment: "",
            commentRows: 1,
            isSubmittingComment: false,
          }));
          
          // Refresh highlights after successful storage - this will add the comment from backend
          if (state.currentArticleId) {
            await refreshHighlights(state.currentArticleId);
          }
        }
        
      } catch (error) {
        console.error('❌ Failed to store highlight:', error);
        // Only reset loading state on error if managing state locally
        if (!skipStateManagement) {
          setState(prev => ({
            ...prev,
            comments: [newComment, ...prev.comments],
            comment: "",
            commentRows: 1,
            isSubmittingComment: false,
          }));
        }
      }
    } else if (!skipStateManagement) {
      // No highlight to store, just add comment locally (only if managing state)
      setState(prev => ({
        ...prev,
        comments: [newComment, ...prev.comments],
        comment: "",
        commentRows: 1,
        isSubmittingComment: false,
      }));
    }
  }, [state.comment, state.hiLiteText, state.currentSourceUrl, state.currentArticleId, state.isSubmittingComment]);

  // Function to fetch and refresh highlights from the backend
  const refreshHighlights = useCallback(async (articleId: string) => {
    try {
      setState(prev => ({ ...prev, highlightsLoading: true, dockOpen: true }));
      console.log('🔄 Fetching highlights for article:', articleId);
      
      const response: HighlightsResponse = await fetchHighlightsByArticleId(articleId);
      console.log('📥 Received highlights response:', response);
      
      // Convert highlights to comments for the dock display
      const highlightComments: Comment[] = (response.highlights || []).map((highlight, index) => ({
        id: parseInt(highlight.id) || Date.now() + index,
        author: highlight.user_name || 'Unknown',
        text: highlight.message || 'No comment',
        ts: formatTimeAgo(new Date(highlight.created_at)),
        tag: highlight.highlighted_text ? { text: highlight.highlighted_text } : null,
        profilePic: highlight.user_profile_pic || undefined,
        // Map mentioned_users from API to mentionedUsers for dock display
        mentionedUsers: highlight.mentioned_users ? highlight.mentioned_users.map(user => ({
          id: user.user_id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          mention: user.mention || `@${user.username || user.name}`
        })) : undefined
      }));
      
      console.log('🔄 Converted highlights to comments:', highlightComments);

      setState(prev => ({
        ...prev,
        highlights: response.highlights || [],
        highlightsResponse: response,
        highlightsLoading: false,
        currentArticleId: articleId,
        comments: highlightComments, // Replace comments with converted highlights
      }));
      
    } catch (error) {
      console.error('❌ Failed to fetch highlights:', error);
      setState(prev => ({ 
        ...prev, 
        highlightsLoading: false,
        highlights: [],
        highlightsResponse: undefined,
        comments: [], // Clear comments on error
      }));
    }
  }, []);

  // Function to clear highlights and comments (when no article is loaded)
  const clearHighlights = useCallback(() => {
    console.log('🧹 Clearing highlights and comments');
    setState(prev => ({
      ...prev,
      highlights: [],
      highlightsResponse: undefined,
      comments: [],
      currentArticleId: undefined,
      highlightsLoading: false,
    }));
  }, []);

  // Function to set article ID and fetch highlights (called after addToRoom)
  const setArticleIdAndRefreshHighlights = useCallback(async (articleId: string) => {
    console.log('🆔 Setting article ID and refreshing highlights:', articleId);
    setState(prev => ({ ...prev, currentArticleId: articleId }));
    await refreshHighlights(articleId);
  }, [refreshHighlights]);

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

  // History actions
  const loadHistory = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, historyLoading: true, historyError: null }));
      const result = await fetchRecentlyViewedArticles(1, 20);
      setState(prev => ({
        ...prev,
        historyItems: result.items,
        hasMoreHistoryData: result.hasMore,
        historyLoading: false,
        historyPage: 1
      }));
    } catch (error) {
      console.error('Error loading history:', error);
      setState(prev => ({
        ...prev,
        historyLoading: false,
        historyError: error instanceof Error ? error.message : 'Failed to load history'
      }));
    }
  }, []);

  const loadMoreHistoryItems = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, historyLoading: true }));
      const nextPage = state.historyPage + 1;
      const result = await loadMoreHistory(state.historyItems, nextPage);
      setState(prev => ({
        ...prev,
        historyItems: result.items,
        hasMoreHistoryData: result.hasMore,
        historyLoading: false,
        historyPage: nextPage
      }));
    } catch (error) {
      console.error('Error loading more history:', error);
      setState(prev => ({
        ...prev,
        historyLoading: false,
        historyError: error instanceof Error ? error.message : 'Failed to load more history'
      }));
    }
  }, [state.historyItems, state.historyPage]);

  // Load history when component mounts
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  return {
    state,
    updateState,
    submitComment,
    submitCommentWithHighlight,
    adjustCommentRows,
    askAi,
    gotoDockIndex,
    toggleHistoryMenu,
    toggleMoreMenu,
    openSourcePage,
    openHistoryItem,
    refreshHighlights,
    clearHighlights,
    setArticleIdAndRefreshHighlights,
    loadHistory,
    loadMoreHistoryItems,
  };
}
