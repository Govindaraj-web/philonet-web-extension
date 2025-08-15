import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, Eye, FileText, RefreshCw } from "lucide-react";
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

import { SidePanelProps, MarkdownMeta } from './types';
import { SAMPLE_MARKDOWNS } from './data/sampleContent';
import { philonetAuthStorage } from './storage/auth-storage';

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

  // Article state
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  const [articleError, setArticleError] = useState<string | null>(null);
  const [showArticleContent, setShowArticleContent] = useState(false);
  
  // Loading overlay state with minimum timer
  const [isLoadingWithMinTimer, setIsLoadingWithMinTimer] = useState(false);
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null);
  const MIN_LOADING_DURATION = 800; // Minimum 800ms loading display
  
  // Notification state (temporarily disabled)
  const [showNotification, setShowNotification] = useState(false);
  const [notificationTimeout, setNotificationTimeout] = useState<NodeJS.Timeout | null>(null);
  const [timeoutProgress, setTimeoutProgress] = useState(100);

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
        description: article.summary,
        image: article.thumbnail_url,
        categories: article.categories,
        tags: article.tags,
        body: article.description
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
  }, [currentUrl, settings.autoUpdate]);

  // Auto-hide notifications with timeout
  useEffect(() => {
    if ((article || articleError) && !isLoadingArticle) {
      setShowNotification(true);
      setTimeoutProgress(100);
      
      // Clear existing timeout
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
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

  // Show notification immediately when loading starts
  useEffect(() => {
    if (isLoadingArticle) {
      setShowNotification(true);
      setTimeoutProgress(100);
      
      // Clear any existing timeout when loading starts
      if (notificationTimeout) {
        clearTimeout(notificationTimeout);
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
  const fetchArticleByUrl = async (url: string): Promise<ArticleApiResponse | null> => {
    try {
      const token = await philonetAuthStorage.getToken();
      console.log('🔐 Retrieved token from storage:', token ? '✅ Token exists' : '❌ No token found');
      
      if (!token) {
        throw new Error('No access token available. Please log in.');
      }

      console.log('🌐 Making API call to fetch article for URL:', url);
      const response = await fetch('http://localhost:3000/v1/client/articles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ url }),
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
      console.error('Error fetching article by URL:', error);
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
      setIsLoadingArticle(true);
      startLoadingWithMinTimer();
      setArticleError(null);
      
      const result = await fetchArticleByUrl(url);
      
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
        console.log('✅ Article found and converted:', convertedArticle);
        console.log('🔗 Source URL updated to:', apiArticle.url);
      } else {
        setArticle(null);
        // Clear the source URL when no article is found
        updateState({ currentSourceUrl: "" });
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
      // Clear the source URL when there's an error
      updateState({ currentSourceUrl: "" });
      setArticleError(error instanceof Error ? error.message : 'Failed to fetch article');
    } finally {
      setIsLoadingArticle(false);
    }
  };

  const generateContent = async () => {
    if (!currentUrl) {
      setArticleError('No URL available for content generation');
      return;
    }

    try {
      setIsLoadingArticle(true);
      setArticleError(null);
      
      // For now, just show a placeholder
      // This will be implemented later as mentioned in the requirements
      console.log('🔄 Generate content requested for:', currentUrl);
      setArticleError('Content generation will be implemented later');
    } catch (error) {
      console.error('❌ Error generating content:', error);
      setArticleError(error instanceof Error ? error.message : 'Failed to generate content');
    } finally {
      setIsLoadingArticle(false);
    }
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

  // Auto-refresh modal when pageData changes (if modal is open)
  useEffect(() => {
    if (showPageData && pageData) {
      console.log('🔄 Page data modal automatically refreshed with new data');
    }
  }, [pageData, showPageData]);

  // Settings handlers
  const handleSettingsChange = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  const toggleSettings = () => {
    setShowSettings(!showSettings);
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

  const handleExtractPageData = () => {
    extractPageData();
  };

  const handleCheckArticle = () => {
    checkAndLoadArticle();
  };

  const handleGenerateContent = () => {
    generateContent();
  };

  const handleViewArticleContent = () => {
    setShowArticleContent(true);
  };

  const closeArticleContentModal = () => {
    setShowArticleContent(false);
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
            useContentScript={settings.useContentScript}
            isExtracting={isExtractingPageData}
          />

          {/* Content Renderer or Encouraging Message */}
          {article ? (
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
              sourceUrl={state.currentSourceUrl}
            />
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
                  <h1 className="text-xl font-semibold text-white">
                    No article found for this page?
                  </h1>
                  <p className="text-philonet-text-secondary">
                    Be the first to generate and share content about this topic!
                  </p>
                </div>

                {/* Generate Button */}
                <motion.button
                  onClick={handleGenerateContent}
                  disabled={isLoadingArticle}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98, y: 0 }}
                  className="group relative w-full bg-gradient-to-r from-philonet-blue-600 via-philonet-blue-600 to-philonet-blue-500 hover:from-philonet-blue-700 hover:via-philonet-blue-700 hover:to-philonet-blue-600 disabled:from-philonet-blue-600/50 disabled:via-philonet-blue-600/50 disabled:to-philonet-blue-500/50 text-white py-4 px-8 rounded-xl font-semibold text-lg shadow-[0_4px_14px_0_rgba(59,130,246,0.4)] hover:shadow-[0_8px_24px_0_rgba(59,130,246,0.5)] active:shadow-[0_2px_8px_0_rgba(59,130,246,0.4)] transition-all duration-300 disabled:cursor-not-allowed flex items-center justify-center gap-3 border border-philonet-blue-500/20"
                >
                  {isLoadingArticle ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      <span>Generating...</span>
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

                {/* Features */}
              </div>
            </div>
          )}

          {/* Article Status Indicator */}
          <AnimatePresence>
            {showNotification && (article || isLoadingArticle || articleError) && (
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
                    <div className="text-philonet-text-secondary text-xs truncate mb-2">{article.title}</div>
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
                
                {articleError && !article && !isLoadingArticle && !articleError.includes('Content generation will be implemented') && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className={`relative bg-philonet-card/95 backdrop-blur-md border shadow-2xl text-white px-4 py-3 rounded-xl text-sm pr-10 ${
                      articleError.includes('No article found') 
                        ? 'border-yellow-500/30'
                        : 'border-red-500/30'
                    }`}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        articleError.includes('No article found') ? 'bg-yellow-400' : 'bg-red-400'
                      }`}></div>
                      <span className={`font-semibold ${
                        articleError.includes('No article found') ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {articleError.includes('No article found') ? 'No Article Found' : 'Error'}
                      </span>
                    </div>
                    <div className="text-philonet-text-muted text-xs mb-2">{articleError}</div>
                    {articleError.includes('No article found') && (
                      <button
                        onClick={handleGenerateContent}
                        className="text-yellow-400 hover:text-yellow-300 underline text-xs font-medium transition-colors"
                      >
                        Generate Content →
                      </button>
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
                              articleError.includes('No article found') ? 'text-yellow-400' : 'text-red-400'
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
          )}

          {/* Comments Dock - only show when article exists */}
          {article && (
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
          )}
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
                    {!article && !isLoadingArticle && articleError && articleError.includes('No article found') && (
                      <button
                        onClick={handleGenerateContent}
                        className="px-4 py-2.5 bg-philonet-green-600 hover:bg-philonet-green-700 text-white rounded-lg transition-colors text-sm font-medium flex items-center justify-center gap-2"
                      >
                        <FileText className="w-4 h-4" />
                        Generate Content
                      </button>
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
                        Last fetched: {lastFetchedTime.toLocaleTimeString()}
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
                    <span><strong>Created:</strong> {new Date(article.created_at).toLocaleDateString()}</span>
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
