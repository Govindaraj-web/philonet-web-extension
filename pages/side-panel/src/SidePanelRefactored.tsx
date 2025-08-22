import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Eye, FileText, RefreshCw, Upload, CloudUpload, CheckCircle, AlertCircle } from "lucide-react";
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';
import ContentSkeleton from './components/ContentSkeleton';

// Import modular components and hooks
import {
  AuthenticatedTopActionBar,
  ContentRenderer,
  ComposerFooter,
  CommentsDock
} from './components';
import ThoughtRoomsIntegration from './components/ThoughtRoomsIntegration2';
import { PdfUploadModal } from './components/PdfUploadModal';

import {
  useSpeech,
  useMarkdown,
  useSidePanelState,
  useSelection,
  useClickOutside
} from './hooks';
import { clearSelectionHighlight } from './hooks/useSelection';

import { SidePanelProps, MarkdownMeta } from './types';
import { SAMPLE_MARKDOWNS } from './data/sampleContent';
import { philonetAuthStorage } from './storage/auth-storage';
import { 
  generateSummaryAndExtractDetails, 
  fetchWebTopicTagsAndSummary,
  streamWebSummaryFromEvents,
  extractArticleData,
  createPageContentFromUploadedFile,
  extractThumbnailUrl,
  storeWebSummary,
  addToRoom,
  isPdfUrl,
  isLocalFile,
  extractPdfFromUrl,
  streamPdfSummaryFromEvents,
  extractPdfArticleData,
  LocalFileAccessError,
  type PageContent,
  type PdfUploadResponse 
} from './services/gptSummary';
import { formatTimeAgo } from './utils';

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

// Article interface for API response
interface Article {
  article_id: number;
  room_id: number;
  created_at: string;
  is_deleted: boolean;
  pdf: boolean;
  hash?: string; // Add hash field for PDF files
  category: string;
  sparked_by: string | null;
  url: string;
  title: string;
  description: string;
  thumbnail_url: string;
  shared_by: string;
  tags: string[];
  categories: string[];
  summary: string;
  room_name: string;
  room_description: string;
  room_admin: string;
  private_space: boolean;
  spark_owner: string | null;
}

// API Response interface - Updated structure
interface ArticleApiResponse {
  success: boolean;
  count: number;
  message?: string;
  data: Array<{
    article_id: number;
    room_id: number;
    created_at: string;
    is_deleted: boolean;
    pdf: boolean;
    category: string;
    sparked_by: string | null;
    url: string;
    title: string;
    description: string;
    thumbnail_url: string;
    shared_by: string;
    tags: string[];
    categories: string[];
    summary: string;
    room_name: string;
    room_description: string;
    room_admin: string;
    private_space: boolean;
    spark_owner: string | null;
  }>;
}

// Settings interface
interface Settings {
  autoUpdate: boolean;
  refreshInterval: number;
  enableNotifications: boolean;
  useContentScript: boolean;
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
  const bodyContentRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);

  // State management
  const {
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
  } = useSidePanelState();

  // Speech functionality
  const { isPlaying, isSupported: speechSupported, speak: speakText } = useSpeech();

  // Markdown processing
  const { extractMeta, parseSections, renderHighlighted, getArticleText } = useMarkdown();

  // Page data state
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [showPageData, setShowPageData] = useState(false);
  const [isExtractingPageData, setIsExtractingPageData] = useState(false);
  const [lastFetchedTime, setLastFetchedTime] = useState<Date | null>(null);

  // Settings state
  const [settings, setSettings] = useState<Settings>({
    autoUpdate: true,
    refreshInterval: 5,
    enableNotifications: false,
    useContentScript: true
  });
  const [showSettings, setShowSettings] = useState(false);
  const [currentUrl, setCurrentUrl] = useState<string>('');

  // PDF upload modal state
  const [showPdfUploadModal, setShowPdfUploadModal] = useState(false);
  const [pdfUploadFileName, setPdfUploadFileName] = useState<string>('');

  // Enhanced PDF upload state for drag & drop
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadError, setUploadError] = useState<string>('');

  // Article state
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [showArticleContent, setShowArticleContent] = useState(false);
  
  // Enhanced search state management for text highlighting
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<{
    matches: Element[];
    currentIndex: number;
    totalMatches: number;
  }>({ matches: [], currentIndex: -1, totalMatches: 0 });
  const [isSearchActive, setIsSearchActive] = useState(false);
  
  // Loading overlay state with minimum timer
  const [isLoadingWithMinTimer, setIsLoadingWithMinTimer] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const MIN_LOADING_DURATION = 800; // Minimum 800ms loading display
  
  // Notification state (temporarily disabled)
  const [showNotification, setShowNotification] = useState(false);
  const [notificationTimeout, setNotificationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [timeoutProgress, setTimeoutProgress] = useState(100);
  
  // Content generation streaming state
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const [streamingContent, setStreamingContent] = useState<string>('');
  const [generatedTags, setGeneratedTags] = useState<string[]>([]);
  const [generatedCategories, setGeneratedCategories] = useState<Array<string | [string, number]>>([]);
  const [generatedTitle, setGeneratedTitle] = useState<string>('');
  const [showStreamingProgress, setShowStreamingProgress] = useState(false);
  
  // Thought Rooms drawer state
  const [showThoughtRooms, setShowThoughtRooms] = useState(false);
  
  // Persistent state for parallel operations to prevent data loss during page switches
  const [streamingCompleted, setStreamingCompleted] = useState(false);
  const [extractCompleted, setExtractCompleted] = useState(false);
  const [streamingResult, setStreamingResult] = useState<string>('');
  const [extractResult, setExtractResult] = useState<any>(null);
  
  // Status tracking for content generation flow
  const [contentGenerationStatus, setContentGenerationStatus] = useState<{
    stage: 'idle' | 'checking' | 'extracting' | 'streaming' | 'processing' | 'saving' | 'complete';
    streamingComplete: boolean;
    extractComplete: boolean;
    savingComplete: boolean;
    message?: string;
  }>({
    stage: 'idle',
    streamingComplete: false,
    extractComplete: false,
    savingComplete: false
  });

  // Dynamic content based on article data or fallback to sample (after article state is declared)
  const [sampleIdx] = useState(0);
  
  // Use article data if available, otherwise show encouraging message
  const getContentData = (): { markdownContent: string; meta: MarkdownMeta } => {
    if (article) {
      // Create markdown-like content from article data
      const articleMarkdown = `# ${article.title}

![cover](${article.thumbnail_url})

${article.summary}

## Article Content
${article.description}

## Source
[Read full article](${article.url})
`;
      const articleMeta: MarkdownMeta = {
        title: article.title,
        description: article.summary, // Use summary for header description
        image: article.thumbnail_url,
        categories: article.categories,
        tags: article.tags,
        body: article.description // Use description as the main body content
      };
      
      return {
        markdownContent: articleMarkdown,
        meta: articleMeta
      };
    } else {
      // Return minimal content that won't be rendered - we'll use a custom component instead
      const encouragingMeta: MarkdownMeta = {
        title: "No Article Found",
        description: "Be the first to generate and share content about this topic!",
        image: null,
        categories: [],
        tags: [],
        body: ""
      };
      
      return {
        markdownContent: "",
        meta: encouragingMeta
      };
    }
  };

  const { markdownContent, meta } = getContentData();
  const sections = parseSections(meta.body);

  // Debug logging
  console.log('📝 Using content:', article ? 'REAL ARTICLE DATA' : 'ENCOURAGING MESSAGE');
  console.log('📝 Markdown content loaded:', markdownContent.substring(0, 100) + '...');
  console.log('🏷️ Extracted metadata:', meta);
  console.log('📋 Parsed sections:', sections);
  if (article) {
    console.log('📰 Article data:', article);
  } else {
    console.log('🚀 Showing encouraging content creation message');
  }

  // Debug logging for current state
  console.log('🔍 Current state values:', {
    hiLiteText: state.hiLiteText,
    dockFilterText: state.dockFilterText,
    commentsCount: state.comments.length
  });

  // Selection handling - limited to main article body content only
  useSelection(bodyContentRef as React.RefObject<HTMLElement>, (text: string) => {
    console.log('🔍 useSelection callback triggered with text:', text);
    console.log('📍 bodyContentRef.current:', bodyContentRef.current);
    
    // Validate that the selection is actually from the article body
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      console.log('⚠️ No selection object or ranges available');
      return;
    }
    
    const range = selection.getRangeAt(0);
    const container = range.commonAncestorContainer;
    
    // Log detailed selection information
    console.log('📊 Selection Details:', {
      text: text,
      textLength: text.length,
      startOffset: range.startOffset,
      endOffset: range.endOffset,
      startContainer: range.startContainer,
      endContainer: range.endContainer,
      collapsed: range.collapsed,
      rangeText: range.toString(),
      selectionText: selection.toString()
    });
    
    // Get the full text content of the container for index calculation
    const fullText = bodyContentRef.current?.textContent || '';
    console.log('📝 Full body text length:', fullText.length);
    
    // Try to find the position of selected text within the full text
    const selectionText = selection.toString();
    const selectionIndex = fullText.indexOf(selectionText);
    console.log('📍 Selection position in full text:', {
      startIndex: selectionIndex,
      endIndex: selectionIndex + selectionText.length,
      selectedText: selectionText,
      hasNewlines: selectionText.includes('\n'),
      lineCount: selectionText.split('\n').length
    });
    
    // Check if the selection is within the article body element
    let element = container.nodeType === Node.TEXT_NODE ? container.parentElement : container as Element;
    let isWithinArticleBody = false;
    
    while (element && element !== document.body) {
      if (element === bodyContentRef.current || element.hasAttribute('data-article-body')) {
        isWithinArticleBody = true;
        break;
      }
      element = element.parentElement;
    }
    
    if (!isWithinArticleBody) {
      console.log('⚠️ Selection is not from article body - ignoring');
      return;
    }
    
    // Additional validation: ensure we have meaningful text (removed character limit)
    if (!text || text.trim().length < 1) {
      console.log('⚠️ Selected text is empty:', text);
      return;
    }
    
    // For multi-line selections, preserve the text as-is (don't over-clean)
    const cleanText = text.trim();
    console.log('✅ Valid text selection detected from article body:', {
      originalText: text,
      cleanedText: cleanText,
      isMultiLine: cleanText.includes('\n'),
      preservedLength: cleanText.length
    });
    
    // Update state to tag the selected text
    updateState({ hiLiteText: cleanText, dockFilterText: cleanText });
    console.log('📝 Text selected from article body:', cleanText.substring(0, 100) + (cleanText.length > 100 ? '...' : ''));
    console.log('🏷️ Selection state updated - text should now be tagged');
    
    // Debug current state
    console.log('📊 Current thoughts:', state.comments);
    console.log('🏷️ Available thought tags:', state.comments.map(c => c.tag?.text));
    
    // Check if any thoughts will match this filter
    const matchingComments = state.comments.filter((c) => 
      (c.tag?.text || "").toLowerCase() === cleanText.toLowerCase()
    );
    console.log('🎯 Thoughts that will match this filter:', matchingComments.length);
    
    // Always open dock and show the filter indicator
    updateState({ dockOpen: true });
    
    // If no matching thoughts exist, suggest creating one
    if (matchingComments.length === 0) {
      console.log('💡 No matching thoughts found - opening thought composer');
      updateState({ 
        composerTab: 'thoughts'
        // Removed comment pre-filling since tagged text is displayed separately
      });
      
      // Focus the comment textarea after a brief delay
      setTimeout(() => {
        if (commentRef.current) {
          commentRef.current.focus();
        }
      }, 100);
    }
  });

  // Clear selection when clicking outside comments or dock area
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      
      // Check if click is outside comments dock and composer areas
      const isInComments = target.closest('[data-thoughts-dock]');
      const isInComposer = target.closest('[data-composer-footer]');
      const isInTaggedText = target.closest('[data-tagged-text]');
      
      // If clicked outside these areas and we have selected text, clear it
      if (!isInComments && !isInComposer && !isInTaggedText && state.hiLiteText) {
        console.log('🧹 Clearing selection - clicked outside thoughts/dock area');
        updateState({ hiLiteText: "", dockFilterText: "" });
        
        // Clear visual highlights
        clearSelectionHighlight();
        
        // Also clear browser selection
        const selection = window.getSelection();
        if (selection) {
          selection.removeAllRanges();
        }
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [state.hiLiteText, updateState]);

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

  // Clear search highlights when dock filter changes to avoid conflicts
  useEffect(() => {
    if (state.dockFilterText && isSearchActive) {
      clearSearch();
    }
  }, [state.dockFilterText, isSearchActive]);

  // Page change detection using content script injection
  useEffect(() => {
    if (!settings.autoUpdate) return;

    const setupPageChangeDetection = async () => {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id || !tab.url) return;

        // Always update current URL and extract page data when tab becomes active
        if (tab.url !== currentUrl) {
          console.log('🔄 Tab switched or page changed:', tab.url);
          setCurrentUrl(tab.url);
          
          // Extract page data immediately for the new tab/page
          setTimeout(() => {
            extractPageData();
          }, 500);
        }

        // Extract initial page data if none exists
        if (!pageData) {
          console.log('🔄 Extracting initial page data...');
          setTimeout(() => {
            extractPageData();
          }, 1000); // Give page time to load
        }

        if (settings.useContentScript) {
          // Inject content script to listen for navigation events
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              // Remove any existing listeners to prevent duplicates
              if ((window as any).philonetPageChangeListener) {
                return;
              }

              let lastUrl = window.location.href;
              
              const checkUrlChange = () => {
                const currentUrl = window.location.href;
                if (currentUrl !== lastUrl) {
                  console.log('🔄 Page URL changed:', currentUrl);
                  lastUrl = currentUrl;
                  
                  // Send message to extension about URL change
                  chrome.runtime.sendMessage({
                    type: 'PAGE_URL_CHANGED',
                    url: currentUrl,
                    timestamp: Date.now()
                  }).catch(() => {
                    // Ignore errors if extension context is not available
                  });
                }
              };

              // Override history methods to detect programmatic navigation
              const originalPushState = history.pushState;
              const originalReplaceState = history.replaceState;
              
              history.pushState = function(...args) {
                originalPushState.apply(history, args);
                setTimeout(checkUrlChange, 0);
              };
              
              history.replaceState = function(...args) {
                originalReplaceState.apply(history, args);
                setTimeout(checkUrlChange, 0);
              };

              // Listen for popstate events (back/forward buttons)
              window.addEventListener('popstate', checkUrlChange);

              // Listen for hashchange events
              window.addEventListener('hashchange', checkUrlChange);

              // Periodic check as fallback (less frequent)
              const fallbackInterval = setInterval(checkUrlChange, 2000);

              // Mark that listener is active
              (window as any).philonetPageChangeListener = {
                cleanup: () => {
                  window.removeEventListener('popstate', checkUrlChange);
                  window.removeEventListener('hashchange', checkUrlChange);
                  clearInterval(fallbackInterval);
                  history.pushState = originalPushState;
                  history.replaceState = originalReplaceState;
                  delete (window as any).philonetPageChangeListener;
                }
              };
            }
          });

          console.log('✅ Content script page change detection initialized');
          return;
        } else {
          // Fallback polling method
          const checkPageChange = async () => {
            try {
              const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
              if (currentTab.url && currentTab.url !== currentUrl) {
                console.log('🔄 Page URL changed (polling):', currentTab.url);
                setCurrentUrl(currentTab.url);
                console.log('🔄 Auto-refreshing page data due to URL change...');
                setTimeout(() => {
                  extractPageData();
                  
                  // If the page data modal is currently open, refresh it with new data
                  if (showPageData) {
                    console.log('🔄 Refreshing open page data modal with new data...');
                  }
                }, 500);
                
                if (settings.enableNotifications) {
                  console.log('🔔 Page data updated for:', currentTab.url);
                }
              }
            } catch (error) {
              console.error('Error in polling page change:', error);
            }
          };

          const pollingInterval = setInterval(checkPageChange, settings.refreshInterval * 1000);
          console.log('✅ Polling page change detection initialized');
          
          return () => clearInterval(pollingInterval);
        }
      } catch (error) {
        console.error('❌ Error setting up page change detection:', error);
        return;
      }
    };

    // Setup the detection
    setupPageChangeDetection();

    // Listen for messages from content script
    const handleMessage = (message: any, sender: chrome.runtime.MessageSender) => {
      if (message.type === 'PAGE_URL_CHANGED') {
        console.log('📩 Received page change message:', message.url);
        
        if (message.url !== currentUrl) {
          setCurrentUrl(message.url);
          console.log('🔄 Auto-refreshing page data due to URL change...');
          
          // Auto-refresh page data (removed pageData condition)
          setTimeout(() => {
            extractPageData();
            
            // If the page data modal is currently open, refresh it with new data
            if (showPageData) {
              console.log('🔄 Refreshing open page data modal with new data...');
            }
          }, 500); // Small delay to ensure page is loaded
          
          if (settings.enableNotifications) {
            console.log('🔔 Page data updated for:', message.url);
          }
        }
      }
    };

    // Add message listener
    chrome.runtime.onMessage.addListener(handleMessage);

    // Add tab change listener for when user switches tabs
    const handleTabActivated = async (activeInfo: chrome.tabs.TabActiveInfo) => {
      try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url && tab.url !== currentUrl) {
          console.log('🔄 Tab activated with different URL:', tab.url);
          setCurrentUrl(tab.url);
          
          // Extract page data for the newly activated tab
          setTimeout(() => {
            extractPageData();
          }, 300);
          
          if (settings.enableNotifications) {
            console.log('🔔 Page data updated for activated tab:', tab.url);
          }
        }
      } catch (error) {
        console.error('Error handling tab activation:', error);
      }
    };

    // Add tab updated listener for when tab content changes
    const handleTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
      if (changeInfo.status === 'complete' && tab.active && tab.url && tab.url !== currentUrl) {
        console.log('🔄 Active tab updated:', tab.url);
        setCurrentUrl(tab.url);
        
        // Extract page data for the updated tab
        setTimeout(() => {
          extractPageData();
        }, 300);
        
        if (settings.enableNotifications) {
          console.log('🔔 Page data updated for updated tab:', tab.url);
        }
      }
    };

    // Register tab listeners
    chrome.tabs.onActivated.addListener(handleTabActivated);
    chrome.tabs.onUpdated.addListener(handleTabUpdated);

    return () => {
      // Cleanup message listener
      chrome.runtime.onMessage.removeListener(handleMessage);
      
      // Cleanup tab listeners
      chrome.tabs.onActivated.removeListener(handleTabActivated);
      chrome.tabs.onUpdated.removeListener(handleTabUpdated);
      
      // Cleanup content script listeners
      chrome.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
        if (tab.id) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              if ((window as any).philonetPageChangeListener) {
                (window as any).philonetPageChangeListener.cleanup();
              }
            }
          }).catch(() => {
            // Ignore cleanup errors
          });
        }
      });
    };
  }, [settings.autoUpdate, settings.useContentScript, settings.refreshInterval, settings.enableNotifications, currentUrl, pageData, showPageData]);

  // Check for existing articles when URL changes
  useEffect(() => {
    if (currentUrl && settings.autoUpdate) {
      console.log('🔍 Checking for existing article for URL:', currentUrl);
      checkAndLoadArticle(currentUrl);
    }
    // Reset streaming state when URL changes
    resetStreamingState();
    // Clear any active search highlights when URL changes
    clearSearch();
  }, [currentUrl, settings.autoUpdate]);

  // Auto-hide notifications with timeout - TEMPORARILY DISABLED
  useEffect(() => {
    // Notifications temporarily disabled in favor of loading overlay
    if (false && (article || articleError) && !isLoadingArticle) {
      setShowNotification(true);
      setTimeoutProgress(100);
      
      // Clear existing timeout
      if (notificationTimeout) {
        clearTimeout(notificationTimeout as NodeJS.Timeout);
      }
      
      // Animate progress from 100 to 0 over 5 seconds
      const progressInterval = setInterval(() => {
        setTimeoutProgress(prev => {
          if (prev <= 0) {
            clearInterval(progressInterval);
            return 0;
          }
          return prev - (100 / 50); // 50 steps over 5 seconds (100ms intervals)
        });
      }, 100);
      
      // Set new timeout to hide notification after 5 seconds
      const timeout = setTimeout(() => {
        setShowNotification(false);
        clearInterval(progressInterval);
      }, 5000);
      
      setNotificationTimeout(timeout);
      
      // Store interval reference for cleanup
      return () => {
        clearInterval(progressInterval);
      };
    }
    
    // Cleanup timeout on unmount
    return () => {
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
      }
    };
  }, [article, articleError, isLoadingArticle]);

  // Show notification immediately when loading starts - TEMPORARILY DISABLED
  useEffect(() => {
    // Notifications temporarily disabled in favor of loading overlay
    if (false && isLoadingArticle) {
      setShowNotification(true);
      setTimeoutProgress(100);
      
      // Clear any existing timeout when loading starts
      if (notificationTimeout) {
        clearTimeout(notificationTimeout as NodeJS.Timeout);
        setNotificationTimeout(null);
      }
    }
  }, [isLoadingArticle]);

  // Page data extraction function
  const extractPageData = async () => {
    try {
      setIsExtractingPageData(true);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id || !tab.url) return;

      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const extractUrl = () => window.location.href;
          const extractTitle = () => document.title;
          const extractMetaDescription = () => {
            const meta = document.querySelector('meta[name="description"]');
            return meta ? meta.getAttribute('content') : null;
          };
          const extractHeadings = () => {
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            return Array.from(headings).map(h => h.textContent?.trim() || '').filter(Boolean);
          };
          const extractVisibleText = () => {
            const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: (node) => {
                  const parent = node.parentElement;
                  if (!parent) return NodeFilter.FILTER_REJECT;
                  
                  const style = window.getComputedStyle(parent);
                  if (style.display === 'none' || style.visibility === 'hidden') {
                    return NodeFilter.FILTER_REJECT;
                  }
                  
                  const tagName = parent.tagName.toLowerCase();
                  if (['script', 'style', 'noscript'].includes(tagName)) {
                    return NodeFilter.FILTER_REJECT;
                  }
                  
                  return NodeFilter.FILTER_ACCEPT;
                }
              }
            );
            
            const textNodes: string[] = [];
            let node;
            while (node = walker.nextNode()) {
              const text = node.textContent?.trim();
              if (text && text.length > 3) {
                textNodes.push(text);
              }
            }
            return textNodes.join(' ').substring(0, 5000); // Limit to 5000 chars
          };
          const extractOpenGraph = () => {
            const ogTags = document.querySelectorAll('meta[property^="og:"]');
            const og: Record<string, string> = {};
            ogTags.forEach(tag => {
              const property = tag.getAttribute('property');
              const content = tag.getAttribute('content');
              if (property && content) {
                og[property] = content;
              }
            });
            return og;
          };
          const extractThumbnail = () => {
            const ogImage = document.querySelector('meta[property="og:image"]');
            if (ogImage) {
              return ogImage.getAttribute('content');
            }
            const favicon = document.querySelector('link[rel="icon"], link[rel="shortcut icon"]');
            if (favicon) {
              return favicon.getAttribute('href');
            }
            return null;
          };

          return {
            url: extractUrl(),
            title: extractTitle(),
            metaDescription: extractMetaDescription(),
            headings: extractHeadings(),
            visibleText: extractVisibleText(),
            structuredData: { tags: [], categories: [] },
            openGraph: extractOpenGraph(),
            thumbnailUrl: extractThumbnail(),
            wordCount: extractVisibleText().split(/\s+/).length,
            extractedAt: new Date().toISOString()
          };
        }
      });

      if (results[0]?.result) {
        const pageData = results[0].result;
        setPageData(pageData);
        
        // Update last fetched time
        setLastFetchedTime(new Date());
        
        console.log('📊 Page data extracted:', pageData);
        
        if (settings.enableNotifications) {
          console.log('🔔 Page data extracted for:', pageData.title);
        }
      }
    } catch (error) {
      console.error('❌ Error extracting page data:', error);
    } finally {
      setIsExtractingPageData(false);
    }
  };

  // Article API functions
  const fetchArticle = async (params: { url?: string; hash?: string }): Promise<ArticleApiResponse | null> => {
    try {
      const token = await philonetAuthStorage.getToken();
      console.log('🔐 Retrieved token from storage:', token ? '✅ Token exists' : '❌ No token found');
      
      if (!token) {
        throw new Error('No access token available. Please log in.');
      }

      if (!params.url && !params.hash) {
        throw new Error('Either URL or hash must be provided');
      }

      const logMessage = params.url 
        ? `🌐 Making API call to fetch article for URL: ${params.url}`
        : `📄 Making API call to fetch article for hash: ${params.hash}`;
      console.log(logMessage);

      const response = await fetch(`${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/client/articles`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(params),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ API call failed:', response.status, response.statusText, errorData);
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data: ArticleApiResponse = await response.json();
      console.log('✅ API response received:', data);
      console.log('🔍 API response structure:', {
        success: data.success,
        count: data.count,
        message: data.message,
        hasData: !!data.data,
        dataLength: data.data?.length,
        firstArticleId: data.data?.[0]?.article_id,
        firstArticleTitle: data.data?.[0]?.title,
        firstRoomName: data.data?.[0]?.room_name
      });
      return data;
    } catch (error) {
      console.error('Error fetching article:', error);
      throw error;
    }
  };

  // Loading management with minimum timer
  const startLoadingWithMinTimer = () => {
    setIsLoadingWithMinTimer(true);
    setLoadingStartTime(Date.now());
  };

  const endLoadingWithMinTimer = () => {
    if (loadingStartTime) {
      const elapsed = Date.now() - loadingStartTime;
      const remainingTime = Math.max(0, MIN_LOADING_DURATION - elapsed);
      
      if (remainingTime > 0) {
        setTimeout(() => {
          setIsLoadingWithMinTimer(false);
          setLoadingStartTime(null);
        }, remainingTime);
      } else {
        setIsLoadingWithMinTimer(false);
        setLoadingStartTime(null);
      }
    } else {
      setIsLoadingWithMinTimer(false);
    }
  };

  const checkAndLoadArticle = async (url: string = currentUrl) => {
    if (!url) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      url = tab.url || '';
    }
    
    if (!url) {
      setArticleError('No URL available');
      return;
    }

    try {
      setContentGenerationStatus({
        stage: 'checking',
        streamingComplete: false,
        extractComplete: false,
        savingComplete: false,
        message: 'Checking for existing article...'
      });
      
      setIsLoadingArticle(true);
      startLoadingWithMinTimer();
      setArticleError(null);
      
      const result = await fetchArticle({ url });
      
      // Enhanced debugging for API response
      console.log('🔍 API Response Debug:', {
        result,
        success: result?.success,
        count: result?.count,
        hasData: !!result?.data,
        dataLength: result?.data?.length,
        firstArticle: result?.data?.[0],
        fullData: result?.data
      });
      
      if (result?.success && result?.data && result.data.length > 0) {
        // Use the first article from the array
        const apiArticle = result.data[0];
        const convertedArticle: Article = {
          article_id: apiArticle.article_id,
          room_id: apiArticle.room_id,
          created_at: apiArticle.created_at,
          is_deleted: apiArticle.is_deleted,
          pdf: apiArticle.pdf,
          category: apiArticle.category,
          sparked_by: apiArticle.sparked_by,
          url: apiArticle.url,
          title: apiArticle.title,
          description: apiArticle.description,
          thumbnail_url: apiArticle.thumbnail_url,
          shared_by: apiArticle.shared_by,
          tags: apiArticle.tags,
          categories: apiArticle.categories,
          summary: apiArticle.summary,
          room_name: apiArticle.room_name,
          room_description: apiArticle.room_description,
          room_admin: apiArticle.room_admin,
          private_space: apiArticle.private_space,
          spark_owner: apiArticle.spark_owner
        };
        
        setArticle(convertedArticle);
        // Update the source URL to point to the actual article URL
        updateState({ currentSourceUrl: apiArticle.url });
        
        // Set article ID and fetch highlights for the dock
        await setArticleIdAndRefreshHighlights(apiArticle.article_id.toString());
        
        setContentGenerationStatus({
          stage: 'complete',
          streamingComplete: true,
          extractComplete: true,
          savingComplete: true,
          message: 'Article loaded successfully'
        });
        
        // Auto-hide status after 1.5 seconds
        setTimeout(() => {
          setContentGenerationStatus(prev => 
            prev.stage === 'complete' ? { ...prev, stage: 'idle' } : prev
          );
        }, 1500);
        
        console.log('✅ Article found and converted:', convertedArticle);
        console.log('🔗 Source URL updated to:', apiArticle.url);
      } else {
        setArticle(null);
        clearHighlights();
        // Clear the source URL when no article is found
        updateState({ currentSourceUrl: "" });
        setContentGenerationStatus({
          stage: 'idle',
          streamingComplete: false,
          extractComplete: false,
          savingComplete: false
        });
        if (result?.success) {
          if (!result.data) {
            setArticleError('API response missing data field');
            console.log('📝 API response missing data field for URL:', url);
          } else if (result.data.length === 0) {
            setArticleError('No article found for this page');
            console.log('📝 No articles in response array for URL:', url);
          } else {
            setArticleError('Unknown data structure issue');
            console.log('📝 Unknown data structure issue for URL:', url);
          }
        } else {
          setArticleError(result?.message || 'API response indicates failure');
          console.log('📝 API response success=false for URL:', url, 'Message:', result?.message);
        }
      }
    } catch (error) {
      console.error('❌ Error checking for article:', error);
      setArticle(null);
      clearHighlights();
      // Clear the source URL when there's an error
      updateState({ currentSourceUrl: "" });
      
      setArticleError(error instanceof Error ? error.message : 'Failed to fetch article');
    } finally {
      setIsLoadingArticle(false);
      endLoadingWithMinTimer();
    }
  };

  // PDF content generation function
  const generatePdfContent = async (pdfUrl: string) => {
    try {
      setContentGenerationStatus({
        stage: 'extracting',
        streamingComplete: false,
        extractComplete: false,
        savingComplete: false,
        message: 'Extracting PDF content...'
      });

      console.log('📄 Starting PDF content extraction for:', pdfUrl);

      // Extract PDF content and get hash
      const pdfData: PdfUploadResponse = await extractPdfFromUrl(pdfUrl);
      console.log('📄 PDF extracted successfully:', pdfData);

      // Check if an article already exists for this PDF hash
      setContentGenerationStatus({
        stage: 'checking',
        streamingComplete: false,
        extractComplete: false,
        savingComplete: false,
        message: 'Checking for existing PDF article...'
      });

      try {
        const existingArticleResult = await fetchArticle({ hash: pdfData.metadata.fileHash });
        
        if (existingArticleResult?.success && existingArticleResult?.data && existingArticleResult.data.length > 0) {
          // PDF article already exists, load it instead of generating new content
          const apiArticle = existingArticleResult.data[0];
          const convertedArticle: Article = {
            article_id: apiArticle.article_id,
            room_id: apiArticle.room_id,
            created_at: apiArticle.created_at,
            is_deleted: apiArticle.is_deleted,
            pdf: apiArticle.pdf,
            category: apiArticle.category,
            sparked_by: apiArticle.sparked_by,
            url: apiArticle.url,
            title: apiArticle.title,
            description: apiArticle.description,
            thumbnail_url: apiArticle.thumbnail_url,
            shared_by: apiArticle.shared_by,
            tags: apiArticle.tags,
            categories: apiArticle.categories,
            summary: apiArticle.summary,
            room_name: apiArticle.room_name,
            room_description: apiArticle.room_description,
            room_admin: apiArticle.room_admin,
            private_space: apiArticle.private_space,
            spark_owner: apiArticle.spark_owner
          };
          
          setArticle(convertedArticle);
          updateState({ currentSourceUrl: apiArticle.url });
          
          // Set article ID and fetch highlights for the dock
          await setArticleIdAndRefreshHighlights(apiArticle.article_id.toString());
          
          setContentGenerationStatus({
            stage: 'complete',
            streamingComplete: true,
            extractComplete: true,
            savingComplete: true,
            message: 'Existing PDF article loaded successfully'
          });
          
          // Auto-hide status after 1.5 seconds
          setTimeout(() => {
            setContentGenerationStatus(prev => 
              prev.stage === 'complete' ? { ...prev, stage: 'idle' } : prev
            );
          }, 1500);
          
          console.log('✅ Existing PDF article found and loaded:', convertedArticle);
          return; // Exit early since we found existing content
        }
      } catch (error) {
        console.log('📄 No existing PDF article found, proceeding with generation:', error);
        // Continue with generation if no existing article found
      }

      // Create an initial article with PDF metadata
      const initialArticle: Article = {
        article_id: 0,
        room_id: 0,
        created_at: new Date().toISOString(),
        is_deleted: false,
        pdf: true, // Mark as PDF
        hash: pdfData.metadata.fileHash, // Store PDF hash for auto-save
        category: 'Generated',
        sparked_by: null,
        url: pdfUrl,
        title: pdfData.metadata.title || 'PDF Document',
        description: '', // Will be filled by streaming
        thumbnail_url: pdfData.imageUrl || '',
        shared_by: '',
        tags: [],
        categories: [],
        summary: '', // Will be filled by extract
        room_name: 'Generated Content',
        room_description: 'AI Generated Content Room',
        room_admin: '',
        private_space: false,
        spark_owner: null
      };

      // Update source URL
      updateState({ currentSourceUrl: pdfUrl });

      setContentGenerationStatus({
        stage: 'processing',
        streamingComplete: false,
        extractComplete: false,
        savingComplete: false,
        message: 'Generating content and extracting metadata...'
      });

      // Reset persistent state for new generation
      setStreamingCompleted(false);
      setExtractCompleted(false);
      setStreamingResult('');
      setExtractResult(null);

      // Start streaming PDF summary
      let streamingContent = '';
      const streamingPromise = streamPdfSummaryFromEvents(
        pdfData.metadata.fileHash,
        (chunk: string) => {
          console.log('📝 PDF streaming chunk received:', chunk);
          streamingContent += chunk;
          setStreamingContent(streamingContent);

          // Set initial article when first chunk arrives to remove skeleton
          setArticle(currentArticle => {
            if (!currentArticle) {
              // First chunk - create the initial article
              return {
                ...initialArticle,
                description: streamingContent, // Start with the first chunk
              };
            } else {
              // Update existing article with new streaming content
              return {
                ...currentArticle,
                description: streamingContent, // Update description with streaming content
              };
            }
          });
        }
      );

      // Start extract PDF article data in parallel
      console.log('📄 Starting PDF article extraction with hash:', pdfData.metadata.fileHash);
      console.log('📄 Full PDF data:', pdfData);
      
      if (!pdfData.metadata?.fileHash) {
        console.error('❌ PDF fileHash is missing or undefined:', pdfData.metadata);
        // Set extractComplete to true so we don't wait for it
        setContentGenerationStatus(prev => ({
          ...prev,
          extractComplete: true,
          message: streamingCompleted ? 'Finalizing...' : 'Content streaming in progress...'
        }));
      } else {
        extractPdfArticleData(pdfData.metadata.fileHash).then((extractDetails: any) => {
          console.log('📄 PDF extract article completed:', extractDetails);
          setExtractCompleted(true);
          setExtractResult(extractDetails);

          // Update status for extract completion
          setContentGenerationStatus(prev => ({
            ...prev,
            extractComplete: true,
            message: streamingCompleted ? 'Finalizing...' : 'Content streaming in progress...'
          }));

          // Update the article immediately with extracted metadata
          setArticle(currentArticle => {
          if (!currentArticle) {
            // Extract completed first - create initial article with metadata
            return {
              ...initialArticle,
              title: extractDetails.title || initialArticle.title,
              summary: extractDetails.summary,
              tags: extractDetails.tags,
              categories: extractDetails.categories.map((cat: any) => 
                typeof cat === 'string' ? cat : cat[0]
              )
            };
          } else {
            // Update existing article with extract metadata
            return {
              ...currentArticle,
              title: extractDetails.title || currentArticle.title,
              summary: extractDetails.summary,
              tags: extractDetails.tags,
              categories: extractDetails.categories.map((cat: any) => 
                typeof cat === 'string' ? cat : cat[0]
              )
            };
          }
        });

        // Update state with extract results
        setGeneratedTitle(extractDetails.title);
        setGeneratedTags(extractDetails.tags);
        setGeneratedCategories(extractDetails.categories);

        console.log('✅ PDF extract article metadata updated immediately:', {
          title: extractDetails.title,
          tags: extractDetails.tags,
          categories: extractDetails.categories,
          summary: extractDetails.summary
        });

        // Turn off loading states immediately when extract completes
        if (!streamingCompleted) {
          setIsLoadingArticle(false);
          setIsGeneratingContent(false);
          endLoadingWithMinTimer();
        }

        // Note: Auto-save is now handled by useEffect when both operations complete
      }).catch((error) => {
        console.error('❌ PDF extract article failed:', error);
        setArticleError(error instanceof Error ? error.message : 'Failed to extract PDF metadata');
        
        // Turn off loading states on extract error
        setIsLoadingArticle(false);
        setIsGeneratingContent(false);
        endLoadingWithMinTimer();
      });
      } // Close the else block

      // Handle streaming completion
      streamingPromise.then(() => {
        console.log('✅ PDF streaming content generation completed');
        console.log('📝 Final PDF streamed content length:', streamingContent.length);
        setStreamingCompleted(true);
        setStreamingResult(streamingContent);

        // Update status for streaming completion
        setContentGenerationStatus(prev => ({
          ...prev,
          streamingComplete: true,
          message: extractCompleted ? 'Finalizing...' : 'Extracting metadata...'
        }));

        // Turn off loading states immediately when streaming completes
        if (!extractCompleted) {
          setIsLoadingArticle(false);
          setIsGeneratingContent(false);
          endLoadingWithMinTimer();
        }

        // Note: Auto-save is now handled by useEffect when both operations complete
      }).catch((error) => {
        console.error('❌ PDF streaming failed:', error);
        setArticleError(error instanceof Error ? error.message : 'Failed to generate PDF content');
        
        // Turn off loading states on streaming error
        setIsLoadingArticle(false);
        setIsGeneratingContent(false);
        endLoadingWithMinTimer();
      });

      console.log('🎉 PDF operations started independently - they will update UI when ready');

    } catch (error) {
      console.error('❌ Error generating PDF content:', error);
      setArticle(null);
      clearHighlights();
      updateState({ currentSourceUrl: "" });
      
      // Handle local file access restrictions specially
      if (error instanceof LocalFileAccessError) {
        console.log('🔓 Local PDF detected - setting appropriate error message for UI');
        setArticleError('No article found for this page');
        // Don't show popup modal - let the main UI handle the upload
      } else {
        setArticleError(error instanceof Error ? error.message : 'Failed to process PDF');
      }
      
      // Turn off loading states only on error during PDF setup
      setIsLoadingArticle(false);
      setIsGeneratingContent(false);
      endLoadingWithMinTimer();
    }
    // Note: Loading states are now managed in checkAndSaveToRoom() when both PDF operations complete
  };

  const generateContent = async () => {
    if (!currentUrl) {
      setArticleError('No URL available for content generation');
      return;
    }

    try {
      setContentGenerationStatus({
        stage: 'extracting',
        streamingComplete: false,
        extractComplete: false,
        savingComplete: false,
        message: 'Extracting page content...'
      });
      
      setIsLoadingArticle(true);
      setIsGeneratingContent(true);
      startLoadingWithMinTimer();
      setArticleError(null);
      
      // Reset streaming states
      setStreamingContent('');
      setGeneratedTags([]);
      setGeneratedCategories([]);
      setGeneratedTitle('');

      console.log('🔄 Generate content requested for:', currentUrl);

      // Check if URL is a PDF (including local files)
      const isCurrentUrlPdf = isPdfUrl(currentUrl);
      const isCurrentUrlLocalFile = isLocalFile(currentUrl);
      
      console.log('🔍 URL Analysis:', {
        url: currentUrl,
        isPdf: isCurrentUrlPdf,
        isLocalFile: isCurrentUrlLocalFile,
        shouldUsePdfFlow: isCurrentUrlPdf || isCurrentUrlLocalFile
      });
      
      if (isCurrentUrlPdf || isCurrentUrlLocalFile) {
        console.log('📄 PDF or local file detected, using PDF processing flow');
        await generatePdfContent(currentUrl);
        return;
      }

      // First, extract page data for non-PDF URLs
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id) {
        throw new Error('No active tab found');
      }

      // Extract page data using the same logic from extractPageData
      const results = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const extractUrl = () => window.location.href;
          const extractTitle = () => document.title;
          const extractMetaDescription = () => {
            const meta = document.querySelector('meta[name="description"]');
            return meta ? meta.getAttribute('content') : null;
          };
          const extractHeadings = () => {
            const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
            return Array.from(headings).map(h => h.textContent?.trim() || '').filter(Boolean);
          };
          const extractVisibleText = () => {
            const walker = document.createTreeWalker(
              document.body,
              NodeFilter.SHOW_TEXT,
              {
                acceptNode: (node) => {
                  const parent = node.parentElement;
                  if (!parent) return NodeFilter.FILTER_REJECT;
                  
                  const style = getComputedStyle(parent);
                  if (style.display === 'none' || 
                      style.visibility === 'hidden' || 
                      style.opacity === '0') {
                    return NodeFilter.FILTER_REJECT;
                  }
                  
                  const tagName = parent.tagName.toLowerCase();
                  if (['script', 'style', 'noscript', 'meta', 'link'].includes(tagName)) {
                    return NodeFilter.FILTER_REJECT;
                  }
                  
                  return NodeFilter.FILTER_ACCEPT;
                }
              }
            );
            
            let textContent = '';
            let node;
            while (node = walker.nextNode()) {
              const text = node.textContent?.trim();
              if (text && text.length > 3) {
                textContent += text + ' ';
              }
            }
            return textContent.trim();
          };

          const extractThumbnailUrl = (): string | null => {
            // Try Open Graph image
            const ogImage = document.querySelector('meta[property="og:image"]');
            if (ogImage?.getAttribute('content')) {
              return ogImage.getAttribute('content');
            }

            // YouTube fallback
            if (location.hostname.includes('youtube.com')) {
              const videoId = new URLSearchParams(location.search).get('v');
              if (videoId) {
                return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
              }
            }

            return null;
          };

          return {
            url: extractUrl(),
            title: extractTitle(),
            metaDescription: extractMetaDescription(),
            headings: extractHeadings(),
            visibleText: extractVisibleText(),
            thumbnailUrl: extractThumbnailUrl(),
            structuredData: {},
            openGraph: {}
          };
        }
      });

      if (!results[0]?.result) {
        throw new Error('Failed to extract page data');
      }

      const extractedPageData = results[0].result;
      console.log('📄 Extracted page data:', extractedPageData);

      // Create PageContent object
      const pageContent: PageContent = {
        url: extractedPageData.url,
        title: extractedPageData.title,
        metaDescription: extractedPageData.metaDescription || '',
        headings: extractedPageData.headings || [],
        visibleText: extractedPageData.visibleText || '',
        structuredData: extractedPageData.structuredData || {},
        openGraph: extractedPageData.openGraph || {},
        thumbnailUrl: extractedPageData.thumbnailUrl || undefined
      };

      // Create an initial mock article immediately to update the main content area
      const initialArticle: Article = {
        article_id: 0,
        room_id: 0,
        created_at: new Date().toISOString(),
        is_deleted: false,
        pdf: false,
        category: 'Generated',
        sparked_by: null,
        url: pageContent.url,
        title: pageContent.title || 'Generated Content',
        description: '', // Start with empty description - will be filled by streaming
        thumbnail_url: pageContent.thumbnailUrl || '',
        shared_by: '',
        tags: [],
        categories: [],
        summary: '', // Start with empty summary - will be filled by extract article
        room_name: 'Generated Content',
        room_description: 'AI Generated Content Room',
        room_admin: '',
        private_space: false,
        spark_owner: null
      };

      // Don't set the initial article immediately - let skeleton show during generation
      // setArticle(initialArticle);
      updateState({ currentSourceUrl: pageContent.url });

      // Always use streaming generation regardless of content amount
      console.log('📝 Starting streaming content generation...');
      
      setContentGenerationStatus({
        stage: 'processing',
        streamingComplete: false,
        extractComplete: false,
        savingComplete: false,
        message: 'Generating content and extracting metadata...'
      });
      
      const streamEndpoint = `${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/client/summarize`;
      const extractEndpoint = `${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/client/extractarticle`;
      
      // Start both operations in parallel, but handle them independently
      let streamingContent = '';
      let streamingStarted = false;
      
      // Set up a timeout to show immediate feedback if streaming takes too long to start
      const streamingTimeoutId = setTimeout(() => {
        if (!streamingStarted) {
          console.log('⏰ Streaming taking longer than expected - showing loading feedback');
          setArticle(currentArticle => {
            if (!currentArticle) {
              return {
                ...initialArticle,
                description: '🔄 Connecting to AI service...', // Timeout feedback
              };
            }
            return currentArticle;
          });
        }
      }, 2000); // 2 second timeout
      
      // Start streaming operation
      const streamingPromise = streamWebSummaryFromEvents(
        pageContent,
        streamEndpoint,
        (chunk: string) => {
          console.log('📝 Streaming chunk received:', chunk);
          
          // Clear timeout once streaming starts
          if (!streamingStarted) {
            streamingStarted = true;
            clearTimeout(streamingTimeoutId);
          }
          
          // Handle immediate start signal (empty chunk)
          if (chunk === '' && streamingContent === '') {
            console.log('🚀 Streaming connection established - showing initial feedback');
            
            // Show immediate visual feedback that streaming has started
            setArticle(currentArticle => {
              if (!currentArticle) {
                return {
                  ...initialArticle,
                  description: '✨ Generating content...', // Immediate feedback
                };
              }
              return currentArticle;
            });
            return;
          }
          
          streamingContent += chunk;
          setStreamingContent(streamingContent);
          
          // Set initial article when first chunk arrives to remove skeleton
          setArticle(currentArticle => {
            if (!currentArticle) {
              // First chunk - create the initial article
              return {
                ...initialArticle,
                description: streamingContent, // Start with the first chunk
              };
            } else {
              // Update existing article with new streaming content
              return {
                ...currentArticle,
                description: streamingContent, // Update description (body) with streaming content
              };
            }
          });
        }
      );
      
      // Reset persistent state for new web content generation
      setStreamingCompleted(false);
      setExtractCompleted(false);
      setStreamingResult('');
      setExtractResult(null);
      
      // Start extract operation in parallel - render immediately when ready
      extractArticleData({
        rawText: pageContent.visibleText,
        content: {
          url: pageContent.url,
          title: pageContent.title,
          metaDescription: pageContent.metaDescription,
          headings: pageContent.headings,
          visibleText: pageContent.visibleText,
          structuredData: pageContent.structuredData,
          openGraph: pageContent.openGraph,
          thumbnailUrl: pageContent.thumbnailUrl
        }
      }, extractEndpoint).then((extractDetails: any) => {
        console.log('📄 Extract article completed:', extractDetails);
        setExtractCompleted(true);
        setExtractResult(extractDetails);
        
        // Update status for extract completion
        setContentGenerationStatus(prev => ({
          ...prev,
          extractComplete: true,
          message: streamingCompleted ? 'Finalizing...' : 'Content streaming in progress...'
        }));
        
        // Update the article immediately with extracted metadata
        setArticle(currentArticle => {
          if (!currentArticle) {
            // Extract completed first - create initial article with metadata
            return {
              ...initialArticle,
              title: extractDetails.title || initialArticle.title,
              summary: extractDetails.summary, // Use extracted API summary for header description
              tags: extractDetails.tags,
              categories: extractDetails.categories.map((cat: any) => 
                typeof cat === 'string' ? cat : cat[0]
              )
            };
          } else {
            // Update existing article with extract metadata
            return {
              ...currentArticle,
              title: extractDetails.title || currentArticle.title,
              summary: extractDetails.summary, // Use extracted API summary for header description
              tags: extractDetails.tags,
              categories: extractDetails.categories.map((cat: any) => 
                typeof cat === 'string' ? cat : cat[0]
              )
            };
          }
        });
        
        // Update state with extract results
        setGeneratedTitle(extractDetails.title);
        setGeneratedTags(extractDetails.tags);
        setGeneratedCategories(extractDetails.categories);
        
        console.log('✅ Extract article metadata updated immediately:', {
          title: extractDetails.title,
          tags: extractDetails.tags,
          categories: extractDetails.categories,
          summary: extractDetails.summary
        });
        
        // Turn off loading states immediately when extract completes
        if (!streamingCompleted) {
          setIsLoadingArticle(false);
          setIsGeneratingContent(false);
          endLoadingWithMinTimer();
        }
        
        // Note: Auto-save is now handled by useEffect when both operations complete
      }).catch((error) => {
        console.error('❌ Extract article failed:', error);
        setArticleError(error instanceof Error ? error.message : 'Failed to extract article metadata');
        
        // Turn off loading states on extract error
        setIsLoadingArticle(false);
        setIsGeneratingContent(false);
        endLoadingWithMinTimer();
      });

      // Let streaming continue independently - handle completion separately
      streamingPromise.then(() => {
        console.log('✅ Streaming content generation completed independently');
        console.log('📝 Final streamed content length:', streamingContent.length);
        
        // Clear timeout on successful completion
        clearTimeout(streamingTimeoutId);
        
        setStreamingCompleted(true);
        setStreamingResult(streamingContent);
        
        // Update status for streaming completion
        setContentGenerationStatus(prev => ({
          ...prev,
          streamingComplete: true,
          message: extractCompleted ? 'Finalizing...' : 'Extracting metadata...'
        }));
        
        // Turn off loading states immediately when streaming completes
        if (!extractCompleted) {
          setIsLoadingArticle(false);
          setIsGeneratingContent(false);
          endLoadingWithMinTimer();
        }
        
        // Note: Auto-save is now handled by useEffect when both operations complete
      }).catch((error) => {
        console.error('❌ Streaming failed:', error);
        
        // Clear timeout on error
        clearTimeout(streamingTimeoutId);
        
        setArticleError(error instanceof Error ? error.message : 'Failed to generate streaming content');
        
        // Turn off loading states on streaming error
        setIsLoadingArticle(false);
        setIsGeneratingContent(false);
        endLoadingWithMinTimer();
      });

      console.log('🎉 Both operations started independently - they will update UI when ready');

      // Update the source URL
      updateState({ currentSourceUrl: pageContent.url });

    } catch (error) {
      console.error('❌ Error generating content:', error);
      setArticle(null);
      clearHighlights();
      updateState({ currentSourceUrl: "" });
      
      // Handle local file access restrictions specially
      if (error instanceof LocalFileAccessError) {
        console.log('🔓 Local PDF detected - setting appropriate error message for UI');
        setArticleError('No article found for this page');
        // Don't show popup modal - let the main UI handle the upload
      } else {
        setArticleError(error instanceof Error ? error.message : 'Failed to generate content');
      }
      
      // Turn off loading states only on error during setup
      setIsLoadingArticle(false);
      setIsGeneratingContent(false);
      endLoadingWithMinTimer();
    }
    // Note: Loading states are now managed in checkAndSaveToRoom() when both operations complete
  };

  // Handle page data viewing
  const handleViewPageData = async () => {
    // Extract fresh page data and show modal
    await extractPageData();
    setShowPageData(true);
    console.log('Page data modal opened');
  };

  const closePageDataModal = () => {
    setShowPageData(false);
  };

  // Handle reply to thought doc
  const handleReplyToThoughtDoc = () => {
    // Open the thoughts composer and set it to focus mode
    updateState({ 
      composerTab: 'thoughts',
      comment: '' 
    });
    
    // Focus the comment input after a brief delay
    setTimeout(() => {
      if (commentRef.current) {
        commentRef.current.focus();
        commentRef.current.placeholder = 'Reply to thought document...';
      }
    }, 100);
    
    console.log('Reply to Thought Doc initiated');
  };

  // Handle reply to specific thought
  const handleReplyToThought = (thoughtId: number) => {
    // Find the thought being replied to
    const thought = state.comments.find(c => c.id === thoughtId);
    if (thought) {
      // Open the thoughts composer with reply context
      updateState({ 
        composerTab: 'thoughts',
        comment: `@${thought.author} ` 
      });
      
      // Focus the comment input
      setTimeout(() => {
        if (commentRef.current) {
          commentRef.current.focus();
          commentRef.current.setSelectionRange(commentRef.current.value.length, commentRef.current.value.length);
        }
      }, 100);
      
      console.log(`Replying to thought ${thoughtId} by ${thought.author}`);
    }
  };

  // Auto-refresh modal when pageData changes (if modal is open)
  useEffect(() => {
    if (showPageData && pageData) {
      console.log('🔄 Page data modal automatically refreshed with new data');
    }
  }, [pageData, showPageData]);

  // Auto-save to room when both streaming and extraction are completed
  useEffect(() => {
    const autoSaveToRoom = async () => {
      if (streamingCompleted && extractCompleted && streamingResult && extractResult && currentUrl) {
        try {
          console.log('🔄 Auto-saving to room - both operations completed');
          console.log('📊 Streaming result length:', streamingResult.length);
          console.log('📊 Extract result:', extractResult);
          
          // Check if current context is PDF-related
          const isCurrentUrlPdf = isPdfUrl(currentUrl);
          let pdfHash: string | undefined;
          
          // Get PDF hash from article state if available
          if (isCurrentUrlPdf && article?.pdf && article?.hash) {
            pdfHash = article.hash;
            console.log('📄 Using PDF hash from article state:', pdfHash);
          }
          
          await checkAndSaveToRoom(currentUrl, isCurrentUrlPdf, pdfHash);
          
        } catch (error) {
          console.error('❌ Auto-save to room failed:', error);
          // Don't throw the error to avoid breaking the UI flow
        }
      }
    };

    autoSaveToRoom();
  }, [streamingCompleted, extractCompleted, streamingResult, extractResult, currentUrl, article]);

  // Settings handlers
  const handleSettingsChange = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  const toggleThoughtRooms = () => {
    setShowThoughtRooms(!showThoughtRooms);
  };

  // Handlers
  const handleCommentChange = (value: string) => {
    updateState({ comment: value });
    adjustCommentRows(value);
  };

  const handleCommentSubmit = () => {
    // Use the enhanced function that stores highlights when available
    if (state.hiLiteText && article && bodyContentRef) {
      submitCommentWithHighlight(article, bodyContentRef);
    } else {
      submitComment();
    }
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

  const handleNavigateToText = (text?: string) => {
    const searchText = text || state.hiLiteText;
    if (!searchText || !bodyContentRef.current) {
      console.log('⚠️ Cannot navigate: no search text or body content ref');
      return;
    }

    try {
      console.log('🔍 Navigating to highlighted text:', searchText);

      // Use the enhanced search system for better results
      if (text) {
        // If specific text is provided (from dock), use enhanced search
        performSearch(searchText);
      } else {
        // Fallback to direct navigation for existing highlights
        const bodyElement = bodyContentRef.current;
        let targetElement = findBestTextMatch(bodyElement, searchText);

        if (targetElement) {
          console.log('✅ Found target element, scrolling to position');
          
          // Scroll to the element with better positioning
          targetElement.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest'
          });

          // Enhanced highlight effect with text content highlighting
          highlightTextInElement(targetElement, searchText);
          
          console.log('🎯 Successfully navigated to highlighted text');
        } else {
          console.log('⚠️ Target text not found, scrolling to content start');
          bodyElement.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }
      }
      
    } catch (error) {
      console.error('❌ Error navigating to text:', error);
      // Fallback: scroll to content
      if (bodyContentRef.current) {
        bodyContentRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    }
  };

  // Enhanced text search function with multiple matching strategies
  const findBestTextMatch = (container: Element, searchText: string): Element | null => {
    const targetText = searchText.trim().toLowerCase();
    
    // Strategy 1: Try exact text match first
    let bestMatch = findTextByStrategy(container, searchText, 'exact');
    
    // Strategy 2: If exact match fails, try fuzzy matching
    if (!bestMatch) {
      bestMatch = findTextByStrategy(container, searchText, 'fuzzy');
    }
    
    // Strategy 3: If still no match, try searching for significant words
    if (!bestMatch && searchText.length > 10) {
      const words = searchText.split(/\s+/).filter(word => word.length > 3);
      for (const word of words) {
        bestMatch = findTextByStrategy(container, word, 'word');
        if (bestMatch) break;
      }
    }
    
    // Strategy 4: Try partial matching with substring
    if (!bestMatch) {
      bestMatch = findTextByStrategy(container, searchText, 'partial');
    }
    
    return bestMatch;
  };

  // Helper function to find text using different strategies
  const findTextByStrategy = (container: Element, searchText: string, strategy: 'exact' | 'fuzzy' | 'word' | 'partial'): Element | null => {
    const targetText = searchText.trim().toLowerCase();
    
    // Use TreeWalker for efficient DOM traversal
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let bestMatch = null;
    let bestScore = 0;
    let node;

    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
        const text = (node.textContent || '').toLowerCase();
        let score = 0;
        
        switch (strategy) {
          case 'exact':
            if (text.includes(targetText)) {
              // Higher score for exact matches
              score = targetText.length / text.length;
              if (score > bestScore) {
                bestScore = score;
                bestMatch = node.parentElement;
              }
            }
            break;
            
          case 'fuzzy':
            // Calculate similarity based on word overlap
            const searchWords = targetText.split(/\s+/);
            const textWords = text.split(/\s+/);
            const matchedWords = searchWords.filter(word => 
              textWords.some(textWord => textWord.includes(word) || word.includes(textWord))
            );
            score = matchedWords.length / searchWords.length;
            
            if (score > 0.5 && score > bestScore) {
              bestScore = score;
              bestMatch = node.parentElement;
            }
            break;
            
          case 'word':
            // Single word matching
            if (text.includes(targetText)) {
              score = 0.8; // Good but not as high as exact
              if (score > bestScore) {
                bestScore = score;
                bestMatch = node.parentElement;
              }
            }
            break;
            
          case 'partial':
            // Try matching parts of the search text
            const searchParts = targetText.split(/\s+/);
            let partialMatches = 0;
            for (const part of searchParts) {
              if (part.length > 2 && text.includes(part)) {
                partialMatches++;
              }
            }
            score = partialMatches / searchParts.length;
            
            if (score > 0.3 && score > bestScore) {
              bestScore = score;
              bestMatch = node.parentElement;
            }
            break;
        }
      }
    }

    return bestMatch;
  };

  // Enhanced highlighting function that splits text and inserts highlight spans
  const highlightTextInElement = (element: Element, searchText: string) => {
    const htmlElement = element as HTMLElement;
    const targetText = searchText.trim().toLowerCase();
    
    // Remove any existing highlights first
    removeExistingHighlights(element);
    
    // Apply general element highlight
    const originalStyle = htmlElement.style.cssText;
    htmlElement.style.backgroundColor = 'rgba(59, 130, 246, 0.15)';
    htmlElement.style.transition = 'background-color 0.3s ease';
    htmlElement.style.borderRadius = '4px';
    htmlElement.style.padding = '4px 6px';
    htmlElement.style.boxShadow = '0 0 0 2px rgba(59, 130, 246, 0.3)';
    htmlElement.style.border = '1px solid rgba(59, 130, 246, 0.4)';
    htmlElement.setAttribute('data-philonet-highlighted', 'true');

    // Enhanced text highlighting with text node splitting
    try {
      highlightTextNodes(element, searchText);
    } catch (error) {
      console.warn('Could not highlight specific text, using general highlight:', error);
    }
    
    // Remove highlight after 5 seconds
    setTimeout(() => {
      htmlElement.style.cssText = originalStyle;
      htmlElement.removeAttribute('data-philonet-highlighted');
      removeTextHighlights(element);
    }, 5000);
  };

  // Function to highlight text within text nodes by splitting and inserting spans
  const highlightTextNodes = (element: Element, searchText: string) => {
    const targetText = searchText.trim().toLowerCase();
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      null
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const text = node.textContent.toLowerCase();
        if (text.includes(targetText)) {
          textNodes.push(node);
        }
      }
    }

    // Process text nodes and insert highlight spans
    textNodes.forEach(textNode => {
      const parent = textNode.parentNode;
      if (parent && textNode.textContent) {
        const text = textNode.textContent;
        const lowerText = text.toLowerCase();
        
        // Find all occurrences of the target text
        const highlights = [];
        let startIndex = 0;
        let index;
        
        while ((index = lowerText.indexOf(targetText, startIndex)) !== -1) {
          highlights.push({
            start: index,
            end: index + targetText.length,
            text: text.substring(index, index + targetText.length)
          });
          startIndex = index + targetText.length;
        }
        
        if (highlights.length > 0) {
          // Create document fragment with highlighted text
          const fragment = document.createDocumentFragment();
          let lastEnd = 0;
          
          highlights.forEach(highlight => {
            // Add text before highlight
            if (highlight.start > lastEnd) {
              fragment.appendChild(document.createTextNode(text.substring(lastEnd, highlight.start)));
            }
            
            // Add highlighted text
            const highlightSpan = document.createElement('span');
            highlightSpan.style.backgroundColor = 'rgba(59, 130, 246, 0.6)';
            highlightSpan.style.fontWeight = 'bold';
            highlightSpan.style.borderRadius = '2px';
            highlightSpan.style.padding = '1px 2px';
            highlightSpan.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
            highlightSpan.textContent = highlight.text;
            highlightSpan.className = 'philonet-text-highlight';
            fragment.appendChild(highlightSpan);
            
            lastEnd = highlight.end;
          });
          
          // Add remaining text after last highlight
          if (lastEnd < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastEnd)));
          }
          
          // Replace the original text node with the highlighted fragment
          parent.replaceChild(fragment, textNode);
        }
      }
    });
  };

  // Function to remove existing highlights before applying new ones
  const removeExistingHighlights = (container: Element) => {
    // Remove element-level highlights
    const highlightedElements = container.querySelectorAll('[data-philonet-highlighted]');
    highlightedElements.forEach(el => {
      const htmlEl = el as HTMLElement;
      htmlEl.style.cssText = '';
      htmlEl.removeAttribute('data-philonet-highlighted');
    });
    
    // Remove text-level highlights
    removeTextHighlights(container);
    
    // Remove search highlights
    removeSearchHighlights(container);
  };

  // Function to remove text highlights and merge text nodes
  const removeTextHighlights = (container: Element) => {
    const highlights = container.querySelectorAll('.philonet-text-highlight');
    highlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize(); // Merge adjacent text nodes
      }
    });
  };

  // Enhanced search functionality with state management
  const performSearch = (query: string) => {
    if (!bodyContentRef.current || !query.trim()) {
      clearSearch();
      return;
    }

    setSearchQuery(query);
    setIsSearchActive(true);

    // Clear any existing highlights first
    removeExistingHighlights(bodyContentRef.current);

    const matches = findAllTextMatches(bodyContentRef.current, query);
    setSearchResults({
      matches,
      currentIndex: matches.length > 0 ? 0 : -1,
      totalMatches: matches.length
    });

    // Highlight all matches in the body
    highlightSearchTextInBody(bodyContentRef.current, query);

    // Navigate to first match if available
    if (matches.length > 0) {
      navigateToMatch(matches[0], query);
    }
  };

  const highlightSearchTextInBody = (container: Element, searchText: string) => {
    const targetText = searchText.trim().toLowerCase();
    
    // Find all text nodes in the container
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script, style, and other non-content elements
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          
          const tagName = parent.tagName.toLowerCase();
          if (['script', 'style', 'noscript', 'svg'].includes(tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const textNodes = [];
    let node;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        const text = node.textContent.toLowerCase();
        if (text.includes(targetText)) {
          textNodes.push(node);
        }
      }
    }

    // Process each text node and add highlights
    textNodes.forEach((textNode, nodeIndex) => {
      const parent = textNode.parentNode;
      if (parent && textNode.textContent) {
        const text = textNode.textContent;
        const lowerText = text.toLowerCase();
        
        // Find all occurrences in this text node
        const highlights = [];
        let startIndex = 0;
        let index;
        
        while ((index = lowerText.indexOf(targetText, startIndex)) !== -1) {
          highlights.push({
            start: index,
            end: index + targetText.length,
            text: text.substring(index, index + targetText.length)
          });
          startIndex = index + targetText.length;
        }
        
        if (highlights.length > 0) {
          // Create document fragment with highlighted text
          const fragment = document.createDocumentFragment();
          let lastEnd = 0;
          
          highlights.forEach((highlight, highlightIndex) => {
            // Add text before highlight
            if (highlight.start > lastEnd) {
              fragment.appendChild(document.createTextNode(text.substring(lastEnd, highlight.start)));
            }
            
            // Add highlighted text with improved styling
            const highlightSpan = document.createElement('span');
            highlightSpan.style.backgroundColor = 'rgba(255, 235, 59, 0.9)'; // Bright yellow highlight
            highlightSpan.style.color = '#000'; // Black text for contrast
            highlightSpan.style.fontWeight = '600'; // Semi-bold
            highlightSpan.style.borderRadius = '3px';
            highlightSpan.style.padding = '2px 4px';
            highlightSpan.style.boxShadow = '0 2px 4px rgba(0,0,0,0.15)';
            highlightSpan.style.border = '1px solid rgba(255, 193, 7, 0.8)';
            highlightSpan.style.display = 'inline';
            highlightSpan.style.lineHeight = 'inherit';
            highlightSpan.style.margin = '0 1px';
            highlightSpan.style.transition = 'all 0.2s ease';
            highlightSpan.style.cursor = 'pointer';
            highlightSpan.textContent = highlight.text;
            highlightSpan.className = 'philonet-search-highlight';
            highlightSpan.setAttribute('data-search-text', searchText);
            highlightSpan.setAttribute('data-highlight-index', `${nodeIndex}-${highlightIndex}`);
            highlightSpan.title = `Search match: "${highlight.text}"`;
            
            // Add hover effect
            highlightSpan.addEventListener('mouseenter', () => {
              highlightSpan.style.backgroundColor = 'rgba(255, 193, 7, 1)';
              highlightSpan.style.transform = 'scale(1.02)';
            });
            
            highlightSpan.addEventListener('mouseleave', () => {
              highlightSpan.style.backgroundColor = 'rgba(255, 235, 59, 0.9)';
              highlightSpan.style.transform = 'scale(1)';
            });
            
            fragment.appendChild(highlightSpan);
            
            lastEnd = highlight.end;
          });
          
          // Add remaining text after last highlight
          if (lastEnd < text.length) {
            fragment.appendChild(document.createTextNode(text.substring(lastEnd)));
          }
          
          // Replace the original text node with the highlighted fragment
          parent.replaceChild(fragment, textNode);
        }
      }
    });

    console.log(`🎨 Highlighted ${textNodes.length} text nodes containing "${searchText}"`);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults({ matches: [], currentIndex: -1, totalMatches: 0 });
    setIsSearchActive(false);
    
    // Clear all search highlights from the body
    if (bodyContentRef.current) {
      removeSearchHighlights(bodyContentRef.current);
      removeExistingHighlights(bodyContentRef.current);
    }
  };

  const removeSearchHighlights = (container: Element) => {
    // Remove search-specific highlights
    const searchHighlights = container.querySelectorAll('.philonet-search-highlight');
    searchHighlights.forEach(highlight => {
      const parent = highlight.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(highlight.textContent || ''), highlight);
        parent.normalize(); // Merge adjacent text nodes
      }
    });
  };

  const findAllTextMatches = (container: Element, searchText: string): Element[] => {
    const matches: Element[] = [];
    const targetText = searchText.trim().toLowerCase();
    
    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node;
    while (node = walker.nextNode()) {
      if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
        const text = (node.textContent || '').toLowerCase();
        if (text.includes(targetText)) {
          matches.push(node.parentElement);
        }
      }
    }

    return matches;
  };

  const highlightAllMatches = (matches: Element[], searchText: string) => {
    matches.forEach((element, index) => {
      const htmlElement = element as HTMLElement;
      
      // Apply different highlighting for current vs other matches
      const isCurrent = index === searchResults.currentIndex;
      const bgColor = isCurrent ? 'rgba(59, 130, 246, 0.4)' : 'rgba(59, 130, 246, 0.2)';
      const borderColor = isCurrent ? 'rgba(59, 130, 246, 0.6)' : 'rgba(59, 130, 246, 0.3)';
      
      htmlElement.style.backgroundColor = bgColor;
      htmlElement.style.border = `1px solid ${borderColor}`;
      htmlElement.style.borderRadius = '3px';
      htmlElement.style.padding = '2px 4px';
      htmlElement.setAttribute('data-search-match', index.toString());
      
      // Also highlight the actual text within
      highlightTextNodes(element, searchText);
    });
  };

  const navigateToMatch = (element: Element, searchText: string) => {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
      inline: 'nearest'
    });

    // Temporarily emphasize the current match
    emphasizeCurrentMatch(element, searchText);
  };

  const emphasizeCurrentMatch = (element: Element, searchText: string) => {
    // Find search highlights within this element and emphasize the current one
    const highlights = element.querySelectorAll('.philonet-search-highlight');
    highlights.forEach((highlight, index) => {
      const span = highlight as HTMLElement;
      const isCurrentMatch = element.contains(highlight);
      
      if (isCurrentMatch) {
        // Emphasize current match
        span.style.backgroundColor = 'rgba(255, 87, 34, 0.9)'; // Orange emphasis
        span.style.transform = 'scale(1.05)';
        span.style.transition = 'all 0.3s ease';
        span.style.zIndex = '1000';
        span.style.position = 'relative';
        
        // Reset emphasis after 2 seconds
        setTimeout(() => {
          span.style.backgroundColor = 'rgba(255, 235, 59, 0.8)'; // Back to yellow
          span.style.transform = 'scale(1)';
          span.style.zIndex = 'auto';
          span.style.position = 'static';
        }, 2000);
      }
    });
  };

  const navigateToNextMatch = () => {
    if (searchResults.matches.length === 0) return;
    
    const nextIndex = (searchResults.currentIndex + 1) % searchResults.matches.length;
    setSearchResults(prev => ({ ...prev, currentIndex: nextIndex }));
    
    // Navigate to the next match
    navigateToMatch(searchResults.matches[nextIndex], searchQuery);
  };

  const navigateToPrevMatch = () => {
    if (searchResults.matches.length === 0) return;
    
    const prevIndex = searchResults.currentIndex === 0 
      ? searchResults.matches.length - 1 
      : searchResults.currentIndex - 1;
    setSearchResults(prev => ({ ...prev, currentIndex: prevIndex }));
    
    // Navigate to the previous match
    navigateToMatch(searchResults.matches[prevIndex], searchQuery);
  };

  // Function to get all search highlights in order for better navigation
  const getAllSearchHighlights = (): HTMLElement[] => {
    if (!bodyContentRef.current) return [];
    
    const highlights = Array.from(bodyContentRef.current.querySelectorAll('.philonet-search-highlight')) as HTMLElement[];
    
    // Sort highlights by their position in the document
    return highlights.sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      
      // Sort by top position first, then by left position
      if (Math.abs(aRect.top - bRect.top) > 5) {
        return aRect.top - bRect.top;
      }
      return aRect.left - bRect.left;
    });
  };

  const handleRenderHighlighted = (text: string) => {
    return renderHighlighted(text, state.hiLiteText);
  };

  const handleExtractPageData = () => {
    extractPageData();
  };

  const handleCheckArticle = () => {
    checkAndLoadArticle();
  };

  const handleGenerateContent = () => {
    generateContent();
  };
  
  // Reset streaming content state
  const resetStreamingState = () => {
    setStreamingContent('');
    setGeneratedTags([]);
    setGeneratedCategories([]);
    setGeneratedTitle('');
    setIsGeneratingContent(false);
    
    // Reset persistent streaming state
    setStreamingCompleted(false);
    setExtractCompleted(false);
    setStreamingResult('');
    setExtractResult(null);
    
    setContentGenerationStatus({
      stage: 'idle',
      streamingComplete: false,
      extractComplete: false,
      savingComplete: false
    });
    // Don't clear the source URL since we want to preserve navigation context
  };

  // Shared function to check and save content to room using persistent state
  const checkAndSaveToRoom = async (pageUrl: string, isPdf: boolean = false, pdfHash?: string) => {
    if (streamingCompleted && extractCompleted && streamingResult && extractResult) {
      try {
        setContentGenerationStatus(prev => ({
          ...prev,
          stage: 'saving',
          message: 'Saving to database...'
        }));

        console.log('💾 Both operations completed - saving to room...');
        
        // Get thumbnail URL from multiple sources
        let thumbnailUrl = null;
        
        // Priority 1: Use thumbnail from current article if available
        if (article?.thumbnail_url) {
          thumbnailUrl = article.thumbnail_url;
        }
        // Priority 2: Try to extract from extract result
        else if (extractResult?.metadata?.thumbnail_url) {
          thumbnailUrl = extractResult.metadata.thumbnail_url;
        }
        // Priority 3: Try to extract from page data
        else if (pageData?.thumbnailUrl) {
          thumbnailUrl = pageData.thumbnailUrl;
        }
        
        console.log('🖼️ Thumbnail URL resolution:', {
          articleThumbnail: article?.thumbnail_url,
          extractResultThumbnail: extractResult?.metadata?.thumbnail_url,
          pageDataThumbnail: pageData?.thumbnailUrl,
          finalThumbnail: thumbnailUrl
        });
        
        const addToRoomParams = {
          url: pageUrl,
          title: extractResult.title || 'Generated Content',
          summary: extractResult.summary || 'AI generated summary',
          thumbnail_url: thumbnailUrl,
          tags: extractResult.tags || [],
          categories: extractResult.categories?.map((cat: any) => 
            typeof cat === 'string' ? cat : cat[0]
          ) || [],
          description: streamingResult,
          ...(isPdf && pdfHash ? { hash: pdfHash, pdf: true } : {})
        };

        const saveResult = await addToRoom(addToRoomParams);
        console.log('✅ Successfully saved to room:', saveResult);

        // Set article ID and fetch highlights for the dock
        if (saveResult?.article_id) {
          await setArticleIdAndRefreshHighlights(saveResult.article_id.toString());
        }

        setContentGenerationStatus({
          stage: 'complete',
          streamingComplete: true,
          extractComplete: true,
          savingComplete: true,
          message: 'Content generated and saved successfully!'
        });

        // Auto-hide status after 1.5 seconds
        setTimeout(() => {
          setContentGenerationStatus(prev => 
            prev.stage === 'complete' ? { ...prev, stage: 'idle' } : prev
          );
        }, 1500);

        // Update the article with the saved data if it has an ID
        if (saveResult?.article_id) {
          setArticle(currentArticle => {
            if (!currentArticle) return currentArticle;
            return {
              ...currentArticle,
              article_id: saveResult.article_id,
              room_id: saveResult.room_id || currentArticle.room_id
            };
          });
        }
      } catch (error) {
        console.error('❌ Failed to save to room:', error);
        setContentGenerationStatus(prev => ({
          ...prev,
          stage: 'complete',
          message: 'Content generated but failed to save to database'
        }));
        
        // Auto-hide status after 2 seconds even on error
        setTimeout(() => {
          setContentGenerationStatus(prev => 
            prev.stage === 'complete' ? { ...prev, stage: 'idle' } : prev
          );
        }, 2000);
      }
    } else {
      console.log('💭 Not ready to save yet:', {
        streamingCompleted,
        extractCompleted,
        hasStreamingResult: !!streamingResult,
        hasExtractResult: !!extractResult
      });
    }
  };

  const handleViewArticleContent = () => {
    setShowArticleContent(true);
  };

  const closeArticleContentModal = () => {
    setShowArticleContent(false);
  };

  // PDF Upload Modal handlers
  const handlePdfUploadSuccess = async (pdfData: PdfUploadResponse) => {
    try {
      console.log('📤 PDF uploaded successfully, starting content generation...', pdfData);
      
      // Create a mock article from the uploaded PDF data
      const uploadedPdfArticle: Article = {
        article_id: 0,
        room_id: 0,
        created_at: new Date().toISOString(),
        is_deleted: false,
        pdf: true,
        hash: pdfData.metadata.fileHash, // Store PDF hash for auto-save
        category: 'Generated',
        sparked_by: null,
        url: currentUrl, // Keep the original file:// URL for context
        title: pdfData.metadata.title || 'Uploaded PDF Document',
        description: '', // Will be filled by streaming
        thumbnail_url: pdfData.imageUrl || '',
        shared_by: '',
        tags: [],
        categories: [],
        summary: '', // Will be filled by extract
        room_name: 'Generated Content',
        room_description: 'AI Generated Content Room',
        room_admin: '',
        private_space: false,
        spark_owner: null
      };

      // Start the same PDF processing flow as generatePdfContent, but with uploaded data
      setIsLoadingArticle(true);
      setIsGeneratingContent(true);
      startLoadingWithMinTimer();
      setArticleError(null);
      
      setContentGenerationStatus({
        stage: 'processing',
        streamingComplete: false,
        extractComplete: false,
        savingComplete: false,
        message: 'Generating content from uploaded PDF...'
      });

      
      // Reset persistent state for uploaded PDF generation
      setStreamingCompleted(false);
      setExtractCompleted(false);
      setStreamingResult('');
      setExtractResult(null);

      // Start streaming PDF summary with uploaded data
      let streamingContent = '';
      const streamingPromise = streamPdfSummaryFromEvents(
        pdfData.metadata.fileHash,
        (chunk: string) => {
          console.log('📝 Uploaded PDF streaming chunk received:', chunk);
          streamingContent += chunk;
          setStreamingContent(streamingContent);

          // Set initial article when first chunk arrives to remove skeleton
          setArticle(currentArticle => {
            if (!currentArticle) {
              // First chunk - create the initial article
              return {
                ...uploadedPdfArticle,
                description: streamingContent, // Start with the first chunk
              };
            } else {
              // Update existing article with new streaming content
              return {
                ...currentArticle,
                description: streamingContent, // Update description with streaming content
              };
            }
          });
        }
      );

      // Start extract PDF article data in parallel
      console.log('📄 Starting uploaded PDF article extraction with hash:', pdfData.metadata.fileHash);
      
      extractPdfArticleData(pdfData.metadata.fileHash).then((extractDetails: any) => {
        console.log('📄 Uploaded PDF extract article completed:', extractDetails);
        setExtractCompleted(true);
        setExtractResult(extractDetails);

        // Update status for extract completion
        setContentGenerationStatus(prev => ({
          ...prev,
          extractComplete: true,
          message: streamingCompleted ? 'Finalizing...' : 'Content streaming in progress...'
        }));

        // Update the article immediately with extracted metadata
        setArticle(currentArticle => {
          if (!currentArticle) {
            // Extract completed first - create initial article with metadata
            return {
              ...uploadedPdfArticle,
              title: extractDetails.title || uploadedPdfArticle.title,
              summary: extractDetails.summary,
              tags: extractDetails.tags,
              categories: extractDetails.categories.map((cat: any) => 
                typeof cat === 'string' ? cat : cat[0]
              )
            };
          } else {
            // Update existing article with extract metadata
            return {
              ...currentArticle,
              title: extractDetails.title || currentArticle.title,
              summary: extractDetails.summary,
              tags: extractDetails.tags,
              categories: extractDetails.categories.map((cat: any) => 
                typeof cat === 'string' ? cat : cat[0]
              )
            };
          }
        });

        // Update state with extract results
        setGeneratedTitle(extractDetails.title);
        setGeneratedTags(extractDetails.tags);
        setGeneratedCategories(extractDetails.categories);

        // Turn off loading states immediately when extract completes
        if (!streamingCompleted) {
          setIsLoadingArticle(false);
          setIsGeneratingContent(false);
          endLoadingWithMinTimer();
        }

        // Note: Auto-save is now handled by useEffect when both operations complete
      }).catch((error) => {
        console.error('❌ Uploaded PDF extract article failed:', error);
        setArticleError(error instanceof Error ? error.message : 'Failed to extract uploaded PDF metadata');
        
        // Turn off loading states on extract error
        setIsLoadingArticle(false);
        setIsGeneratingContent(false);
        endLoadingWithMinTimer();
      });

      // Handle streaming completion
      streamingPromise.then(() => {
        console.log('✅ Uploaded PDF streaming content generation completed');
        console.log('📝 Final uploaded PDF streamed content length:', streamingContent.length);
        setStreamingCompleted(true);
        setStreamingResult(streamingContent);

        // Update status for streaming completion
        setContentGenerationStatus(prev => ({
          ...prev,
          streamingComplete: true,
          message: extractCompleted ? 'Finalizing...' : 'Extracting metadata...'
        }));

        // Turn off loading states immediately when streaming completes
        if (!extractCompleted) {
          setIsLoadingArticle(false);
          setIsGeneratingContent(false);
          endLoadingWithMinTimer();
        }

        // Note: Auto-save is now handled by useEffect when both operations complete
      }).catch((error) => {
        console.error('❌ Uploaded PDF streaming failed:', error);
        setArticleError(error instanceof Error ? error.message : 'Failed to generate content from uploaded PDF');
        
        // Turn off loading states on streaming error
        setIsLoadingArticle(false);
        setIsGeneratingContent(false);
        endLoadingWithMinTimer();
      });

      console.log('🎉 Uploaded PDF operations started independently - they will update UI when ready');
      
    } catch (error) {
      console.error('❌ Error processing uploaded PDF:', error);
      setArticleError(error instanceof Error ? error.message : 'Failed to process uploaded PDF');
      setIsLoadingArticle(false);
      setIsGeneratingContent(false);
      endLoadingWithMinTimer();
    }
  };

  const closePdfUploadModal = () => {
    setShowPdfUploadModal(false);
    setPdfUploadFileName('');
  };

  // Helper function to check if we should show PDF upload UI
  const shouldShowPdfUpload = () => {
    return isLocalFile(currentUrl) && isPdfUrl(currentUrl);
  };

  // Direct file upload handler (integrated into main UI)
  const handleDirectFileUpload = async (file: File) => {
    // Reset upload state
    setUploadProgress(0);
    setUploadError('');
    setUploadStatus('idle');

    // Validate file type
    if (!file.type.includes('pdf')) {
      setUploadStatus('error');
      setUploadError('Please select a PDF file');
      return;
    }

    // Validate file size
    if (file.size > 50 * 1024 * 1024) { // 50MB limit
      setUploadStatus('error');
      setUploadError('File size must be less than 50MB');
      return;
    }

    try {
      setUploadStatus('uploading');
      setIsLoadingArticle(true);
      setIsGeneratingContent(true);
      startLoadingWithMinTimer();
      setArticleError(null);

      // Get access token
      const token = await philonetAuthStorage.getToken();
      
      if (!token) {
        throw new Error('No access token available. Please log in.');
      }

      // Create FormData for file upload
      const formData = new FormData();
      formData.append('pdf', file);

      console.log('📤 Uploading PDF file directly:', file.name);

      // Simulate upload progress (since fetch doesn't provide real progress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90; // Keep at 90% until actual upload completes
          }
          return prev + Math.random() * 15;
        });
      }, 200);

      // Upload to extract-pdf-content endpoint
      const response = await fetch(`${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/client/extract-pdf-content`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Upload failed: ${response.status} ${response.statusText}`);
      }

      const pdfData = await response.json();
      console.log('✅ PDF uploaded successfully:', pdfData);
      
      setUploadStatus('success');
      
      // Brief success display before processing
      setTimeout(async () => {
        // Process the uploaded PDF using the existing handlePdfUploadSuccess logic
        await handlePdfUploadSuccess(pdfData);
        
        // Reset upload state after processing starts
        setTimeout(() => {
          setUploadStatus('idle');
          setUploadProgress(0);
        }, 1000);
      }, 500);

    } catch (error) {
      console.error('❌ Direct PDF upload failed:', error);
      setUploadStatus('error');
      setUploadError(error instanceof Error ? error.message : 'Upload failed');
      setArticleError(error instanceof Error ? error.message : 'Upload failed');
      setIsLoadingArticle(false);
      setIsGeneratingContent(false);
      endLoadingWithMinTimer();
      setUploadProgress(0);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set isDragging to false if we're leaving the drag area completely
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type.includes('pdf'));
    
    if (pdfFile) {
      handleDirectFileUpload(pdfFile);
    } else if (files.length > 0) {
      setUploadStatus('error');
      setUploadError('Please drop a PDF file');
    }
  };

  // Notification management functions
  const handleCloseNotification = () => {
    setShowNotification(false);
    setTimeoutProgress(100);
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      setNotificationTimeout(null);
    }
  };

  const pauseNotificationTimeout = () => {
    if (notificationTimeout) {
      clearTimeout(notificationTimeout);
      setNotificationTimeout(null);
    }
  };

  const resumeNotificationTimeout = () => {
    if (!isLoadingArticle && (article || articleError)) {
      // Calculate remaining time based on current progress (5 seconds total)
      const remainingTime = (timeoutProgress / 100) * 5000; // Max 5 seconds total
      
      const progressInterval = setInterval(() => {
        setTimeoutProgress(prev => {
          if (prev <= 0) {
            clearInterval(progressInterval);
            return 0;
          }
          return prev - (100 / 50); // Same as initial: 50 steps over 5 seconds (100ms intervals)
        });
      }, 100);
      
      const timeout = setTimeout(() => {
        setShowNotification(false);
        clearInterval(progressInterval);
      }, remainingTime);
      
      setNotificationTimeout(timeout);
    }
  };

  // Debug function to check auth status
  const debugAuthStatus = async () => {
    try {
      const authState = await philonetAuthStorage.get();
      const token = await philonetAuthStorage.getToken();
      console.log('🔍 Debug Auth Status:', {
        isAuthenticated: authState.isAuthenticated,
        hasToken: !!authState.token,
        tokenFromGet: !!token,
        tokenLength: authState.token?.length || 0,
        tokenPreview: authState.token ? authState.token.substring(0, 20) + '...' : 'None',
        hasUser: !!authState.user,
        userId: authState.user?.id || 'None',
        userEmail: authState.user?.email || 'None'
      });

      // Test if we can successfully call our article API
      if (currentUrl) {
        console.log('🔍 Testing API call with current token for URL:', currentUrl);
        try {
          await checkAndLoadArticle(currentUrl);
          console.log('✅ API call test completed successfully');
        } catch (error) {
          console.error('❌ API call test failed:', error);
        }
      }
    } catch (error) {
      console.error('❌ Debug auth status failed:', error);
    }
  };

  try {
    return (
      <div className="relative w-full h-screen bg-philonet-black text-white overflow-hidden font-inter">
        {/* Main Panel - always visible */}
        <motion.aside
          initial={false}
          animate={{ width: "100%" }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="relative h-screen bg-philonet-panel text-white shadow-2xl overflow-visible w-full max-w-none flex flex-col"
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
            onToggleSettings={toggleSettings}
            onReplyToThoughtDoc={handleReplyToThoughtDoc}
            onToggleThoughtRooms={toggleThoughtRooms}
            useContentScript={settings.useContentScript}
            isExtracting={isExtractingPageData}
          />



          {/* Content Renderer, Skeleton Loading, or Encouraging Message */}
          {article ? (
            // Show article content immediately when available, regardless of highlights loading
            <ContentRenderer
              meta={meta}
              sections={sections}
              comments={state.comments}
              isPlaying={isPlaying}
              speechSupported={speechSupported}
              renderHighlighted={handleRenderHighlighted}
              onToggleSpeech={handleToggleSpeech}
              onOpenSource={openSourcePage}
              contentRef={contentRef as React.RefObject<HTMLDivElement>}
              bodyContentRef={bodyContentRef as React.RefObject<HTMLDivElement>}
              footerH={state.footerH}
              sourceUrl={state.currentSourceUrl}
            />
          ) : (isLoadingWithMinTimer || isLoadingArticle || isGeneratingContent) ? (
            // Show skeleton only when article is still loading (not highlights)
            <div className="absolute left-0 right-0" style={{ top: 68, bottom: state.footerH }}>
              <div className="h-full overflow-y-auto pr-1">
                <ContentSkeleton />
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="max-w-md text-center space-y-8 px-6">
                {/* Icon */}
                <div className="flex justify-center">
                  <div className="w-20 h-20 bg-white/90 border border-white/30 rounded-xl flex items-center justify-center shadow-lg">
                    <img 
                      src="/philonet.png" 
                      alt="Philonet" 
                      className="w-10 h-10"
                    />
                  </div>
                </div>

                {/* Heading */}
                <div className="space-y-3">
                  {shouldShowPdfUpload() ? (
                    <>
                      <h1 className="text-xl font-semibold text-white">
                        Local PDF Detected
                      </h1>
                      <p className="text-philonet-text-secondary">
                        Upload your PDF file to generate and share content about it!
                      </p>
                    </>
                  ) : (
                    <>
                      <h1 className="text-xl font-semibold text-white">
                        No article found for this page?
                      </h1>
                      <p className="text-philonet-text-secondary">
                        Be the first to generate and share content about this topic!
                      </p>
                    </>
                  )}
                </div>

                {/* Generate Button for non-PDF pages */}
                {!shouldShowPdfUpload() && (
                  <motion.button
                    onClick={handleGenerateContent}
                    disabled={isLoadingArticle || isGeneratingContent}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98, y: 0 }}
                    className="group relative w-full bg-gradient-to-r from-philonet-blue-600 via-philonet-blue-600 to-philonet-blue-500 hover:from-philonet-blue-700 hover:via-philonet-blue-700 hover:to-philonet-blue-600 disabled:from-philonet-blue-600/50 disabled:via-philonet-blue-600/50 disabled:to-philonet-blue-500/50 text-white py-4 px-8 rounded-xl font-semibold text-lg shadow-[0_4px_14px_0_rgba(59,130,246,0.4)] hover:shadow-[0_8px_24px_0_rgba(59,130,246,0.5)] active:shadow-[0_2px_8px_0_rgba(59,130,246,0.4)] transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-philonet-blue-500/20"
                  >
                    {isLoadingArticle || isGeneratingContent ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span>{isGeneratingContent ? 'Generating Content...' : 'Loading...'}</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                        <span>Generate Content</span>
                      </>
                    )}
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 overflow-hidden rounded-xl">
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent w-full h-full transform -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out skew-x-12"></div>
                    </div>
                  </motion.button>
                )}

                {/* Enhanced PDF Upload UI for local files */}
                {shouldShowPdfUpload() && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-full space-y-6"
                  >
                    {/* Main upload area */}
                    <div
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      className={`
                        relative group border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 overflow-hidden
                        ${isDragging 
                          ? 'border-blue-400 bg-blue-500/20 scale-105' 
                          : uploadStatus === 'error'
                          ? 'border-red-400/60 bg-red-500/10 hover:border-red-300'
                          : uploadStatus === 'success'
                          ? 'border-green-400/60 bg-green-500/10'
                          : uploadStatus === 'uploading'
                          ? 'border-blue-400/60 bg-blue-500/10'
                          : 'border-blue-500/50 bg-blue-900/10 hover:border-blue-400 hover:bg-blue-500/15'
                        }
                      `}
                    >
                      {/* Background gradient effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/5 via-transparent to-purple-600/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                      
                      {/* Animated background dots */}
                      <div className="absolute inset-0 opacity-20">
                        <div className="absolute top-4 left-4 w-1 h-1 bg-blue-400 rounded-full animate-pulse"></div>
                        <div className="absolute top-8 right-8 w-1 h-1 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
                        <div className="absolute bottom-6 left-6 w-1 h-1 bg-blue-300 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
                        <div className="absolute bottom-4 right-4 w-1 h-1 bg-purple-300 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
                      </div>

                      <div className="relative z-10 space-y-6">
                        {/* Icon area */}
                        <div className="flex justify-center">
                          <motion.div
                            animate={
                              uploadStatus === 'uploading' 
                                ? { scale: [1, 1.1, 1], rotate: [0, 5, -5, 0] }
                                : uploadStatus === 'success'
                                ? { scale: [1, 1.2, 1] }
                                : isDragging
                                ? { scale: 1.2, y: -5 }
                                : { scale: 1, y: 0 }
                            }
                            transition={{ 
                              duration: uploadStatus === 'uploading' ? 2 : 0.3,
                              repeat: uploadStatus === 'uploading' ? Infinity : 0 
                            }}
                            className={`
                              w-16 h-16 rounded-full flex items-center justify-center
                              ${uploadStatus === 'error'
                                ? 'bg-red-500/20 text-red-400'
                                : uploadStatus === 'success'
                                ? 'bg-green-500/20 text-green-400'
                                : uploadStatus === 'uploading'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-blue-500/20 text-blue-400 group-hover:bg-blue-500/30'
                              }
                            `}
                          >
                            {uploadStatus === 'uploading' ? (
                              <CloudUpload className="w-8 h-8" />
                            ) : uploadStatus === 'success' ? (
                              <CheckCircle className="w-8 h-8" />
                            ) : uploadStatus === 'error' ? (
                              <AlertCircle className="w-8 h-8" />
                            ) : (
                              <FileText className="w-8 h-8" />
                            )}
                          </motion.div>
                        </div>

                        {/* Text content */}
                        <div className="space-y-3">
                          <motion.h3 
                            className={`text-xl font-semibold ${
                              uploadStatus === 'error' ? 'text-red-300' :
                              uploadStatus === 'success' ? 'text-green-300' :
                              'text-white'
                            }`}
                            animate={{ opacity: [0.8, 1, 0.8] }}
                            transition={{ duration: 2, repeat: isDragging ? Infinity : 0 }}
                          >
                            {uploadStatus === 'uploading' ? 'Uploading PDF...' :
                             uploadStatus === 'success' ? 'Upload Successful!' :
                             uploadStatus === 'error' ? 'Upload Failed' :
                             isDragging ? 'Drop your PDF here!' : 'Upload your PDF file'}
                          </motion.h3>
                          
                          <p className={`text-sm ${
                            uploadStatus === 'error' ? 'text-red-300/80' :
                            uploadStatus === 'success' ? 'text-green-300/80' :
                            'text-philonet-text-muted'
                          }`}>
                            {uploadStatus === 'uploading' ? 'Processing your file...' :
                             uploadStatus === 'success' ? 'Starting content generation...' :
                             uploadStatus === 'error' ? uploadError :
                             'Chrome can\'t access local files directly. Upload to generate content.'}
                          </p>

                          {/* Upload progress bar */}
                          {uploadStatus === 'uploading' && (
                            <div className="space-y-2">
                              <div className="w-full bg-blue-900/30 rounded-full h-2 overflow-hidden">
                                <motion.div
                                  className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${uploadProgress}%` }}
                                  transition={{ duration: 0.3 }}
                                />
                              </div>
                              <p className="text-xs text-blue-300/70">
                                {Math.round(uploadProgress)}% uploaded
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Action buttons */}
                        {uploadStatus !== 'uploading' && uploadStatus !== 'success' && (
                          <div className="flex flex-col items-center space-y-4">
                            <input
                              type="file"
                              accept=".pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  handleDirectFileUpload(file);
                                }
                              }}
                              className="hidden"
                              id="enhanced-pdf-upload-input"
                            />
                            
                            <motion.label
                              htmlFor="enhanced-pdf-upload-input"
                              whileHover={{ scale: 1.05, y: -2 }}
                              whileTap={{ scale: 0.95 }}
                              className={`
                                cursor-pointer inline-flex items-center gap-3 px-8 py-4 rounded-xl font-semibold text-sm
                                transition-all duration-300 shadow-lg hover:shadow-xl
                                ${uploadStatus === 'error'
                                  ? 'bg-red-600 hover:bg-red-700 text-white border border-red-500/30'
                                  : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border border-blue-500/30'
                                }
                              `}
                            >
                              <Upload className="w-5 h-5" />
                              {uploadStatus === 'error' ? 'Try Again' : 'Choose PDF File'}
                            </motion.label>

                            <div className="flex items-center space-x-2 text-xs text-gray-400">
                              <span>Or drag and drop your file here</span>
                            </div>
                          </div>
                        )}

                        {/* File requirements */}
                        <div className="flex items-center justify-center space-x-6 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                            <span>PDF files only</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <div className="w-1 h-1 bg-gray-500 rounded-full"></div>
                            <span>Up to 50MB</span>
                          </div>
                        </div>
                      </div>

                      {/* Drag overlay */}
                      <AnimatePresence>
                        {isDragging && (
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-blue-500/20 backdrop-blur-sm rounded-2xl border-2 border-blue-400 flex items-center justify-center"
                          >
                            <motion.div
                              animate={{ scale: [1, 1.1, 1] }}
                              transition={{ duration: 1, repeat: Infinity }}
                              className="text-blue-300 text-center"
                            >
                              <Upload className="w-12 h-12 mx-auto mb-2" />
                              <p className="text-lg font-semibold">Drop to upload</p>
                            </motion.div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Success state additional info */}
                    {uploadStatus === 'success' && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-center text-green-400 text-sm"
                      >
                        <CheckCircle className="w-5 h-5 inline mr-2" />
                        PDF uploaded successfully! Content generation starting...
                      </motion.div>
                    )}
                  </motion.div>
                )}

                {/* Features */}
              </div>
            </div>
          )}

          {/* Streaming Content Generation Modal */}
          <AnimatePresence>
            {showStreamingProgress && isGeneratingContent && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 20 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="bg-philonet-card border border-philonet-border rounded-xl shadow-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden"
                >
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 border-2 border-philonet-blue-400/30 border-t-philonet-blue-400 rounded-full animate-spin"></div>
                      <h2 className="text-xl font-semibold text-white">Generating Content</h2>
                    </div>
                  </div>

                  {/* Progress Indicators */}
                  <div className="space-y-4 mb-6">
                    {/* Page Analysis */}
                    <div className="flex items-center gap-3 p-3 bg-philonet-panel/50 rounded-lg border border-philonet-border/50">
                      <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                      <span className="text-sm text-green-400 font-medium">Page analysis completed</span>
                    </div>

                    {/* Content Generation */}
                    <div className="flex items-center gap-3 p-3 bg-philonet-panel/50 rounded-lg border border-philonet-border/50">
                      <div className="w-2 h-2 bg-philonet-blue-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-philonet-blue-400 font-medium">Generating summary...</span>
                    </div>

                    {/* Tag Extraction */}
                    {generatedTags.length > 0 && (
                      <div className="flex items-center gap-3 p-3 bg-philonet-panel/50 rounded-lg border border-philonet-border/50">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                        <span className="text-sm text-yellow-400 font-medium">Extracting tags and categories...</span>
                      </div>
                    )}
                  </div>

                  {/* Generated Content Preview */}
                  {generatedTitle && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-philonet-blue-400 mb-2">Generated Title</h3>
                      <div className="bg-philonet-background/50 border border-philonet-border/50 rounded-lg p-3">
                        <p className="text-white font-medium">{generatedTitle}</p>
                      </div>
                    </div>
                  )}

                  {/* Tags Preview */}
                  {generatedTags.length > 0 && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-philonet-blue-400 mb-2">Tags</h3>
                      <div className="flex flex-wrap gap-2">
                        {generatedTags.slice(0, 6).map((tag, index) => (
                          <span
                            key={index}
                            className="px-2 py-1 bg-philonet-blue-600/20 border border-philonet-blue-500/50 rounded-md text-xs text-philonet-blue-400"
                          >
                            {tag}
                          </span>
                        ))}
                        {generatedTags.length > 6 && (
                          <span className="px-2 py-1 bg-philonet-border/50 rounded-md text-xs text-philonet-text-muted">
                            +{generatedTags.length - 6} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Streaming Content */}
                  {streamingContent && (
                    <div className="mb-4">
                      <h3 className="text-sm font-medium text-philonet-blue-400 mb-2">
                        Generated Summary ({streamingContent.length} characters)
                      </h3>
                      <div className="bg-philonet-background/50 border border-philonet-border/50 rounded-lg p-3 max-h-40 overflow-y-auto philonet-scrollbar">
                        <div className="text-philonet-text-secondary text-sm leading-relaxed whitespace-pre-wrap">
                          {streamingContent}
                          <span className="inline-block w-2 h-4 bg-philonet-blue-400 ml-1 animate-pulse"></span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Progress Message */}
                  <div className="text-center">
                    <p className="text-sm text-philonet-text-muted">
                      Please wait while we analyze and generate content for this page...
                    </p>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Article Status Indicator - Temporarily Hidden */}
          <AnimatePresence>
            {false && showNotification && (article || isLoadingArticle || articleError) && (
              <motion.div
                initial={{ opacity: 0, x: 40, y: 0, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
                exit={{ 
                  opacity: 0, 
                  x: 40, 
                  y: -10, 
                  scale: 0.9,
                  transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
                }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1], type: "spring", stiffness: 300, damping: 30 }}
                className="fixed top-20 right-4 z-20 max-w-xs origin-top-right"
                onMouseEnter={() => {
                  // Pause timeout on hover
                  pauseNotificationTimeout();
                }}
                onMouseLeave={() => {
                  // Resume timeout on mouse leave
                  resumeNotificationTimeout();
                }}
              >
                {isLoadingArticle && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative bg-philonet-card/95 backdrop-blur-md border border-philonet-border shadow-2xl text-white px-4 py-3 rounded-xl text-sm flex items-center gap-3 pr-10"
                  >
                    <div className="w-4 h-4 border-2 border-philonet-blue-400/30 border-t-philonet-blue-400 rounded-full animate-spin"></div>
                    <span className="text-philonet-text">Checking for article...</span>
                    
                    {/* Close Button */}
                    <button
                      onClick={handleCloseNotification}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-philonet-border/50 transition-colors text-philonet-text-muted hover:text-white"
                    >
                      ✕
                    </button>
                  </motion.div>
                )}
                
                {article && !isLoadingArticle && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="relative bg-philonet-card/95 backdrop-blur-md border border-green-500/30 shadow-2xl text-white px-4 py-3 rounded-xl text-sm pr-10"
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="font-semibold text-green-400">Article Found</span>
                    </div>
                    <div className="text-philonet-text-secondary text-xs truncate mb-2">{article?.title}</div>
                    <button
                      onClick={handleViewArticleContent}
                      className="text-green-400 hover:text-green-300 underline text-xs font-medium transition-colors"
                    >
                      View Content →
                    </button>
                    
                    {/* Close Button */}
                    <button
                      onClick={handleCloseNotification}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-philonet-border/50 transition-colors text-philonet-text-muted hover:text-white z-10"
                    >
                      ✕
                    </button>
                    
                    {/* Circular Progress Indicator */}
                    {timeoutProgress > 0 && timeoutProgress < 100 && (
                      <div className="absolute top-1 right-1 w-8 h-8 pointer-events-none">
                        <svg className="w-8 h-8" viewBox="0 0 32 32">
                          <circle
                            cx="16"
                            cy="16"
                            r="14"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            className="text-philonet-border/30"
                          />
                          <circle
                            cx="16"
                            cy="16"
                            r="14"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 14}`}
                            strokeDashoffset={`${2 * Math.PI * 14 * (1 - timeoutProgress / 100)}`}
                            className="text-green-400 transition-all duration-100 ease-linear"
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    )}
                  </motion.div>
                )}
                
                {articleError && !article && !isLoadingArticle && !articleError?.includes('Content generation will be implemented') && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`relative bg-philonet-card/95 backdrop-blur-md border shadow-2xl text-white px-4 py-3 rounded-xl text-sm pr-10 ${
                      articleError?.includes('No article found') 
                        ? 'border-yellow-500/30'
                        : articleError?.includes('Local PDF Access Info') 
                        ? 'border-blue-500/30'
                        : 'border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        articleError?.includes('No article found') 
                          ? 'bg-yellow-400' 
                          : articleError?.includes('Local PDF Access Info')
                          ? 'bg-blue-400'
                          : 'bg-red-400'
                      }`}></div>
                      <span className={`font-semibold ${
                        articleError?.includes('No article found') 
                          ? 'text-yellow-400' 
                          : articleError?.includes('Local PDF Access Info')
                          ? 'text-blue-400'
                          : 'text-red-400'
                      }`}>
                        {articleError?.includes('No article found') 
                          ? 'No Article Found' 
                          : articleError?.includes('Local PDF Access Info')
                          ? 'Local File Information'
                          : 'Error'}
                      </span>
                    </div>
                    <div className="text-philonet-text-muted text-xs mb-2 whitespace-pre-line">
                      {articleError?.includes('Local PDF Access Info') 
                        ? articleError?.replace('Local PDF Access Info: ', '') || ''
                        : articleError}
                    </div>
                    {articleError?.includes('No article found') && !shouldShowPdfUpload() && (
                      <button
                        onClick={handleGenerateContent}
                        className="text-yellow-400 hover:text-yellow-300 underline text-xs font-medium transition-colors"
                      >
                        Generate Content →
                      </button>
                    )}
                    
                    {/* PDF Upload for local files */}
                    {articleError?.includes('No article found') && shouldShowPdfUpload() && (
                      <div className="space-y-2">
                        <p className="text-blue-200 text-xs">
                          Local PDF detected. Upload the file to process it:
                        </p>
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleDirectFileUpload(file);
                            }
                          }}
                          className="block w-full text-xs text-gray-400 
                                   file:mr-2 file:py-1 file:px-2 
                                   file:rounded file:border-0 
                                   file:text-xs file:font-medium 
                                   file:bg-blue-600 file:text-white 
                                   hover:file:bg-blue-700 file:cursor-pointer
                                   bg-transparent"
                        />
                      </div>
                    )}
                    
                    {/* Close Button */}
                    <button
                      onClick={handleCloseNotification}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full hover:bg-philonet-border/50 transition-colors text-philonet-text-muted hover:text-white z-10"
                    >
                      ✕
                    </button>
                    
                    {/* Circular Progress Indicator */}
                    {timeoutProgress > 0 && timeoutProgress < 100 && (
                      <div className="absolute top-1 right-1 w-8 h-8 pointer-events-none">
                        <svg className="w-8 h-8" viewBox="0 0 32 32">
                          <circle
                            cx="16"
                            cy="16"
                            r="14"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            className="text-philonet-border/30"
                          />
                          <circle
                            cx="16"
                            cy="16"
                            r="14"
                            stroke="currentColor"
                            strokeWidth="2"
                            fill="none"
                            strokeDasharray={`${2 * Math.PI * 14}`}
                            strokeDashoffset={`${2 * Math.PI * 14 * (1 - timeoutProgress / 100)}`}
                            className={`transition-all duration-100 ease-linear ${
                              articleError?.includes('No article found') ? 'text-yellow-400' : 'text-red-400'
                            }`}
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Composer Footer - only show when article exists */}
          {article && (
            <div ref={footerRef}>
              <ComposerFooter
                composerTab={state.composerTab}
                comment={state.comment}
                commentRows={state.commentRows}
                aiQuestion={state.aiQuestion}
                aiBusy={state.aiBusy}
                hiLiteText={state.hiLiteText}
                onTabChange={(tab: 'thoughts' | 'ai') => updateState({ composerTab: tab })}
                onCommentChange={handleCommentChange}
                onAiQuestionChange={(value: string) => updateState({ aiQuestion: value })}
                onSubmitComment={handleCommentSubmit}
                onAskAi={handleAskAi}
                onClearSelection={() => {
                  updateState({ hiLiteText: "", dockFilterText: "" });
                  clearSelectionHighlight();
                }}
                onNavigateToText={handleNavigateToText}
                onInsertEmoji={handleInsertEmoji}
                commentRef={commentRef as React.RefObject<HTMLTextAreaElement>}
              />
            </div>
          )}

          {/* Comments Dock - show when article exists or when highlights are loading independently */}
          {(article || state.highlightsLoading) && (
            <div 
              className="absolute right-3 z-30"
              style={{ bottom: state.footerH + 12 }}
            >
              {/* Filter indicator */}
              {state.dockFilterText && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className="mb-2 bg-blue-600/90 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-blue-400/30"
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 bg-blue-300 rounded-full animate-pulse"></span>
                    <span>Filtering by: "{state.dockFilterText.substring(0, 30)}..."</span>
                    <button
                      onClick={() => updateState({ dockFilterText: "", hiLiteText: "" })}
                      className="ml-2 text-blue-200 hover:text-white transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="text-xs text-blue-200 mt-1">
                    {dockList.length} comment{dockList.length !== 1 ? 's' : ''} found
                  </div>
                </motion.div>
              )}

              {/* Highlights loading indicator - separate from article loading */}
              {state.highlightsLoading && article && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className="mb-2 bg-philonet-blue-600/80 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg shadow-lg border border-philonet-blue-400/30"
                >
                  <div className="flex items-center space-x-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-3 h-3 border border-philonet-blue-300 border-t-transparent rounded-full"
                    />
                    <span>Loading highlights...</span>
                  </div>
                </motion.div>
              )}
              <CommentsDock
                isOpen={state.dockOpen}
                isMinimized={state.dockMinimized}
                activeIndex={state.dockActiveIndex}
                dockList={dockList}
                isLoading={state.highlightsLoading}
                onNavigate={handleDockNavigate}
                onMinimize={() => updateState({ dockMinimized: true })}
                onExpand={() => updateState({ dockMinimized: false })}
                onNavigateToText={handleNavigateToText}
                onReplyToThought={handleReplyToThought}
              />
            </div>
          )}

          {/* Subtle Glass Effect Status Indicator - Top Right */}
          <AnimatePresence>
            {contentGenerationStatus.stage !== 'idle' && contentGenerationStatus.stage !== 'complete' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="fixed top-20 right-4 z-40 pointer-events-none"
              >
                <div className="bg-black/20 backdrop-blur-md border border-white/10 rounded-xl px-3 py-2 shadow-lg">
                  <div className="flex items-center gap-2">
                    {/* Animated Status Dot */}
                    <div className="w-2 h-2 bg-philonet-blue-400 rounded-full animate-pulse"></div>
                    
                    {/* Progress Dots */}
                    <div className="flex items-center gap-1">
                      {/* Streaming Progress */}
                      <div className={`w-1 h-1 rounded-full transition-all duration-500 ${
                        contentGenerationStatus.streamingComplete 
                          ? 'bg-green-400 shadow-sm shadow-green-400/50' 
                          : contentGenerationStatus.stage === 'processing'
                            ? 'bg-philonet-blue-400 animate-pulse' 
                            : 'bg-white/20'
                      }`}></div>
                      
                      {/* Extract Progress */}
                      <div className={`w-1 h-1 rounded-full transition-all duration-500 ${
                        contentGenerationStatus.extractComplete 
                          ? 'bg-green-400 shadow-sm shadow-green-400/50' 
                          : contentGenerationStatus.stage === 'processing'
                            ? 'bg-philonet-blue-400 animate-pulse' 
                            : 'bg-white/20'
                      }`}></div>
                      
                      {/* Save Progress */}
                      <div className={`w-1 h-1 rounded-full transition-all duration-500 ${
                        contentGenerationStatus.savingComplete 
                          ? 'bg-green-400 shadow-sm shadow-green-400/50' 
                          : contentGenerationStatus.stage === 'saving'
                            ? 'bg-philonet-blue-400 animate-pulse' 
                            : 'bg-white/20'
                      }`}></div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Success Indicator - Auto disappears */}
          <AnimatePresence>
            {contentGenerationStatus.stage === 'complete' && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -10 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="fixed top-20 right-4 z-40 pointer-events-none"
              >
                <div className="bg-green-500/20 backdrop-blur-md border border-green-400/20 rounded-xl px-3 py-2 shadow-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-xs text-green-400 font-medium">Complete</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 🎯 Thought Rooms Integration */}
          <ThoughtRoomsIntegration
            isOpen={showThoughtRooms}
            onClose={() => setShowThoughtRooms(false)}
            article={article ? {
              title: article.title,
              content: article.description || article.summary,
              url: article.url
            } : {
              title: pageData?.title || document.title || "Current Page",
              content: pageData?.visibleText || "",
              url: currentUrl
            }}
            taggedContent={state.hiLiteText ? {
              sourceText: pageData?.visibleText || article?.description || "",
              sourceUrl: currentUrl,
              highlightedText: state.hiLiteText
            } : undefined}
            user={user}
            currentArticleId={state.currentArticleId} // Pass the article ID from storage
            onSendMessage={(message, thoughtId) => {
              console.log('💬 Conversation message:', message, 'for thought:', thoughtId);
              // You can integrate this with your existing comment system
              // submitComment(message);
            }}
            onAskAI={(question, thoughtId) => {
              console.log('🤖 AI question:', question, 'for thought:', thoughtId);
              // You can integrate this with your existing AI system
              // askAi(question);
            }}
            onThoughtSelect={(thoughtId) => {
              console.log('🎯 Thought selected:', thoughtId);
              // You can integrate this with your existing highlight system
            }}
          />
        </motion.aside>

        {/* Settings Modal */}
        <AnimatePresence>
          {showSettings && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => setShowSettings(false)}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="bg-philonet-card border border-philonet-border rounded-philonet-lg shadow-2xl p-6 max-w-md w-full max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                {/* Header */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                  className="flex items-center justify-between mb-6"
                >
                  <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                    <Settings className="h-5 w-5 text-philonet-blue-400" />
                    Settings
                  </h2>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="text-philonet-text-muted hover:text-white transition-colors p-1 rounded hover:bg-philonet-border/30"
                  >
                    ✕
                  </button>
                </motion.div>

                {/* Settings Content */}
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="space-y-6"
                >
                  {/* Auto Update Setting */}
                  <div className="flex items-center justify-between p-4 bg-philonet-panel/50 rounded-lg border border-philonet-border/50">
                    <div>
                      <label className="text-philonet-text font-medium block">Auto Update</label>
                      <p className="text-xs text-philonet-text-muted mt-1">Automatically update content when page changes</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.autoUpdate}
                        onChange={(e) => handleSettingsChange({ autoUpdate: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-philonet-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-philonet-blue-500"></div>
                    </label>
                  </div>

                  {/* Content Script Setting */}
                  <div className="flex items-center justify-between p-4 bg-philonet-panel/50 rounded-lg border border-philonet-border/50">
                    <div>
                      <label className="text-philonet-text font-medium block">Use Content Script</label>
                      <p className="text-xs text-philonet-text-muted mt-1">Real-time page change detection</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.useContentScript}
                        onChange={(e) => handleSettingsChange({ useContentScript: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-philonet-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-philonet-blue-500"></div>
                    </label>
                  </div>

                  {/* Refresh Interval (when not using content script) */}
                  {!settings.useContentScript && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="p-4 bg-philonet-panel/50 rounded-lg border border-philonet-border/50"
                    >
                      <label className="text-philonet-text font-medium block mb-3">Refresh Interval</label>
                      <div className="flex items-center gap-3">
                        <input
                          type="range"
                          min="1"
                          max="60"
                          value={settings.refreshInterval}
                          onChange={(e) => handleSettingsChange({ refreshInterval: parseInt(e.target.value) })}
                          className="flex-1 h-2 bg-philonet-border rounded-lg appearance-none cursor-pointer slider"
                        />
                        <span className="text-philonet-text-secondary text-sm font-mono min-w-[3rem] text-right">
                          {settings.refreshInterval}s
                        </span>
                      </div>
                      <p className="text-xs text-philonet-text-muted mt-2">How often to check for page changes</p>
                    </motion.div>
                  )}

                  {/* Notifications Setting */}
                  <div className="flex items-center justify-between p-4 bg-philonet-panel/50 rounded-lg border border-philonet-border/50">
                    <div>
                      <label className="text-philonet-text font-medium block">Enable Notifications</label>
                      <p className="text-xs text-philonet-text-muted mt-1">Show console notifications for updates</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.enableNotifications}
                        onChange={(e) => handleSettingsChange({ enableNotifications: e.target.checked })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-philonet-border peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-philonet-blue-500"></div>
                    </label>
                  </div>

                  {/* Status Information */}
                  <div className="pt-4 border-t border-philonet-border/50">
                    <h3 className="text-philonet-text font-medium mb-3">Detection Methods</h3>
                    <div className="space-y-3 text-sm">
                      <div className="flex items-start gap-3 p-3 bg-philonet-background/50 rounded-lg">
                        <div className="w-2 h-2 bg-philonet-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <p className="text-philonet-text-secondary"><strong>Content Script:</strong> Immediate detection via navigation events</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 p-3 bg-philonet-background/50 rounded-lg">
                        <div className="w-2 h-2 bg-philonet-text-muted rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <p className="text-philonet-text-secondary"><strong>Polling:</strong> Checks for changes at regular intervals</p>
                        </div>
                      </div>
                    </div>

                    {/* Active Status */}
                    {settings.useContentScript && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center gap-2 mt-4 p-3 bg-green-900/20 rounded-lg border border-green-700/50"
                      >
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-xs text-green-400 font-medium">Content script navigation detection active</span>
                      </motion.div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex flex-col gap-3 pt-4"
                  >
                    {/* Page Data Extraction */}
                    <button
                      onClick={handleExtractPageData}
                      disabled={isExtractingPageData}
                      className="flex-1 px-4 py-2.5 bg-philonet-blue-600 hover:bg-philonet-blue-700 disabled:bg-philonet-blue-600/50 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                    >
                      {isExtractingPageData ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Extracting...
                        </>
                      ) : (
                        <>
                          <Eye className="w-4 h-4" />
                          Extract Page Data
                        </>
                      )}
                    </button>

                    {/* Article Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={handleCheckArticle}
                        disabled={isLoadingArticle}
                        className="flex-1 px-4 py-2.5 bg-philonet-border hover:bg-philonet-border-light disabled:bg-philonet-border/50 text-philonet-text hover:text-white disabled:text-philonet-text-muted rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        {isLoadingArticle ? (
                          <>
                            <div className="w-4 h-4 border-2 border-philonet-text-muted/30 border-t-philonet-text-muted rounded-full animate-spin"></div>
                            Loading...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="w-4 h-4" />
                            Check Article
                          </>
                        )}
                      </button>

                      <button
                        onClick={debugAuthStatus}
                        className="px-3 py-2.5 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors text-sm font-medium"
                      >
                        🔍
                      </button>

                      {article && (
                        <button
                          onClick={handleViewArticleContent}
                          className="flex-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4 h-4" />
                          View Content
                        </button>
                      )}
                    </div>

                    {/* Generate Content Button (when no article exists) */}
                    {!article && !isLoadingArticle && articleError && articleError.includes('No article found') && !shouldShowPdfUpload() && (
                      <button
                        onClick={handleGenerateContent}
                        className="px-4 py-2.5 bg-philonet-green-600 hover:bg-philonet-green-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Generate Content
                      </button>
                    )}

                    {/* PDF Upload UI (when no article exists and it's a local PDF) */}
                    {!article && !isLoadingArticle && articleError && articleError.includes('No article found') && shouldShowPdfUpload() && (
                      <div className="p-4 bg-philonet-card border border-blue-500/30 rounded-lg space-y-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-3 h-3 rounded-full bg-blue-400"></div>
                          <span className="font-semibold text-blue-400">Local PDF Detected</span>
                        </div>
                        <p className="text-philonet-text-muted text-sm">
                          Chrome can't access local files directly. Upload your PDF file to generate content:
                        </p>
                        <div className="border-2 border-dashed border-gray-600 hover:border-blue-500 rounded-lg p-4 text-center transition-colors">
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                handleDirectFileUpload(file);
                              }
                            }}
                            className="hidden"
                            id="pdf-upload-input"
                          />
                          <label
                            htmlFor="pdf-upload-input"
                            className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                          >
                            <FileText className="w-4 h-4" />
                            Upload PDF File
                          </label>
                          <p className="text-xs text-gray-400 mt-2">
                            PDF files up to 50MB
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Status Display */}
                    {articleError && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`p-3 rounded-lg border text-sm ${
                          articleError.includes('No article found') 
                            ? 'bg-yellow-900/20 border-yellow-700/50 text-yellow-400'
                            : 'bg-red-900/20 border-red-700/50 text-red-400'
                        }`}
                      >
                        {articleError}
                      </motion.div>
                    )}

                    {article && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="p-3 bg-green-900/20 border border-green-700/50 rounded-lg text-sm"
                      >
                        <div className="text-green-400 font-medium mb-2">✅ Article Found</div>
                        <div className="text-green-300 text-xs space-y-1">
                          <p><strong>Title:</strong> {article.title}</p>
                          <p><strong>Room:</strong> {article.room_name}</p>
                        </div>
                      </motion.div>
                    )}

                    {/* Close Button */}
                    <button
                      onClick={() => setShowSettings(false)}
                      className="px-4 py-2.5 bg-philonet-border hover:bg-philonet-border-light text-philonet-text hover:text-white rounded-lg transition-colors text-sm font-medium"
                    >
                      Close
                    </button>
                  </motion.div>
                </motion.div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Page Data Modal */}
        {showPageData && pageData && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={closePageDataModal}>
            <div className="bg-philonet-card border border-philonet-border rounded-lg p-6 max-w-4xl max-h-[90vh] overflow-y-auto m-4" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-white">Page Data</h2>
                  {lastFetchedTime && (
                    <div className="flex items-center gap-2 px-2 py-1 bg-philonet-blue-600/20 border border-philonet-blue-500/50 rounded-md">
                      <span className="text-xs text-philonet-blue-400 font-medium">
                        Last fetched: {formatTimeAgo(lastFetchedTime)}
                      </span>
                    </div>
                  )}
                </div>
                <button 
                  onClick={closePageDataModal}
                  className="px-3 py-2 bg-philonet-border hover:bg-philonet-border-light text-philonet-text hover:text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Close
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

                {pageData.thumbnailUrl && (
                  <div>
                    <h3 className="font-semibold text-philonet-blue-400 mb-2">Thumbnail</h3>
                    <div className="flex items-start gap-3">
                      <img 
                        src={pageData.thumbnailUrl} 
                        alt="Page thumbnail"
                        className="w-16 h-16 object-cover rounded border border-philonet-border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="flex-1">
                        <p className="text-xs text-philonet-text-muted break-all">{pageData.thumbnailUrl}</p>
                      </div>
                    </div>
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

        {/* Article Content Modal */}
        {showArticleContent && article && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={closeArticleContentModal}>
            <div className="bg-philonet-card border border-philonet-border rounded-lg p-6 max-w-5xl max-h-[90vh] overflow-y-auto w-full philonet-scrollbar" onClick={(e) => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <FileText className="h-6 w-6 text-philonet-blue-400" />
                  <h2 className="text-xl font-bold text-white">Article Content</h2>
                  <div className="flex items-center gap-2 px-2 py-1 bg-green-600/20 border border-green-500/50 rounded-md">
                    <span className="text-xs text-green-400 font-medium">
                      Found in {article.room_name}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={closeArticleContentModal}
                  className="px-3 py-2 bg-philonet-border hover:bg-philonet-border-light text-philonet-text hover:text-white rounded-lg transition-colors text-sm font-medium"
                >
                  Close
                </button>
              </div>
              
              <div className="space-y-6">
                {/* Article Header */}
                <div className="pb-4 border-b border-philonet-border/50">
                  <h1 className="text-2xl font-bold text-white mb-3">
                    {article.title}
                  </h1>
                  <div className="flex flex-wrap gap-4 text-sm text-philonet-text-secondary">
                    <span><strong>Created:</strong> {formatTimeAgo(new Date(article.created_at))}</span>
                    <span><strong>Room:</strong> {article.room_name}</span>
                    <span><strong>Article ID:</strong> {article.article_id}</span>
                  </div>
                </div>

                {/* Article Thumbnail */}
                {article.thumbnail_url && (
                  <div className="flex justify-center">
                    <div className="relative">
                      <img 
                        src={article.thumbnail_url} 
                        alt={article.title}
                        className="max-w-md w-full h-auto rounded-lg border border-philonet-border shadow-lg"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Summary */}
                {article.summary && (
                  <div>
                    <h3 className="font-semibold text-philonet-blue-400 mb-3">Summary</h3>
                    <div className="bg-philonet-panel/50 border border-philonet-border/50 rounded-lg p-4">
                      <p className="text-philonet-text-secondary leading-relaxed">{article.summary}</p>
                    </div>
                  </div>
                )}

                {/* Article Description/Content */}
                <div>
                  <h3 className="font-semibold text-philonet-blue-400 mb-3">Content</h3>
                  <div className="bg-philonet-panel/30 border border-philonet-border/50 rounded-lg p-4 max-h-96 overflow-y-auto philonet-scrollbar">
                    <div className="prose prose-invert prose-sm max-w-none">
                      <div className="text-philonet-text-secondary leading-relaxed whitespace-pre-wrap">
                        {article.description}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-philonet-border/50">
                  <div>
                    <h4 className="font-medium text-philonet-text mb-2">Source Information</h4>
                    <div className="space-y-1 text-xs text-philonet-text-muted">
                      <p><strong>URL:</strong> <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-philonet-blue-400 hover:underline break-all">{article.url}</a></p>
                      <p><strong>Room Admin:</strong> {article.room_admin}</p>
                      <p><strong>Shared By:</strong> {article.shared_by}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-philonet-text mb-2">Content Details</h4>
                    <div className="space-y-1 text-xs text-philonet-text-muted">
                      <p><strong>Private Space:</strong> {article.private_space ? 'Yes' : 'No'}</p>
                      <p><strong>PDF:</strong> {article.pdf ? 'Yes' : 'No'}</p>
                      <p><strong>Deleted:</strong> {article.is_deleted ? 'Yes' : 'No'}</p>
                    </div>
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

          /* Custom Slider Styles */
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #1f2937;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          }

          .slider::-webkit-slider-thumb:hover {
            background: #2563eb;
            transform: scale(1.1);
          }

          .slider::-moz-range-thumb {
            height: 16px;
            width: 16px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #1f2937;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
          }
        `}</style>

        {/* PDF Upload Modal */}
        <PdfUploadModal
          isOpen={showPdfUploadModal}
          onClose={closePdfUploadModal}
          onUploadSuccess={handlePdfUploadSuccess}
          fileName={pdfUploadFileName}
        />
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
