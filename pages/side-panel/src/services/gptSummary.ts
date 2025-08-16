
import { philonetAuthStorage } from "../storage/auth-storage";

// Temporary API configuration until the real config is available
const getApiUrl = (endpoint: string) => `http://localhost:3000/v1/client${endpoint}`;
const API_ENDPOINTS = {
  PARSE: '/parse',
  STORE_SUMMARY: '/store-summary',
  GET_ARTICLE_RECOMMENDATIONS: '/article-recommendations',
  GET_USER_RECOMMENDATIONS: '/user-recommendations',
  UPDATE_USER_VECTOR: '/update-user-vector',
  ADD_TO_ROOM: '/room/addtorooms',
  GET_ARTICLE_DETAILS: '/article-details',
  EXTRACT_ARTICLE: '/extract-article',
  STORE_HIGHLIGHT: '/store-highlight',
  CONTENT_HIGHLIGHTS: '/content-highlights'
};

export const getSummaryStorageKey = () => `gpt_summary_${location.origin}${location.pathname}`;

// Helper function to get access token
const getAccessToken = async (): Promise<string> => {
  const token = await philonetAuthStorage.getToken();
  if (!token) {
    throw new Error('Access token not found. Please log in.');
  }
  return token;
};

// Add custom error types
export class APIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'APIError';
  }
}

export class StreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StreamError';
  }
}

export interface PageContent {
  url: string;
  title: string;
  metaDescription: string;
  headings: string[];
  visibleText: string;
  structuredData: any;
  openGraph: any;
  thumbnailUrl?: string; // Added thumbnailUrl property
}

// Update function signatures to use PageContent
export const streamChatGPTSummary = async (
  pageContent: PageContent,
  onChunk: (chunk: string) => void
) => {
  if (!pageContent?.visibleText?.trim()) {
    throw new Error('Page content cannot be empty');
  }

  const apiKey = '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';

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: 'Summarize the web page content' },
          { role: 'user', content: `Give the content as it is by removing ads or noise to read, just by structuring each paragraphs with titles, dont change anything else, keep tone, narration and wordings also same: ${pageContent.visibleText}` }
        ],
        stream: true,
        deepSummary: true,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new APIError(`OpenAI API error: ${response.statusText}`, response.status);
    }

    if (!response.body) {
      throw new StreamError('Response body is null');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let done = false;
    let buffer = '';

    while (!done) {
      try {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.replace('data: ', '').trim();
              if (data === '[DONE]') return;
              
              try {
                const json = JSON.parse(data);
                const content = json.choices?.[0]?.delta?.content;
                if (content) onChunk(content);
              } catch (e) {
                console.warn('Failed to parse chunk:', e);
              }
            }
          }
        }
      } catch (streamError) {
        let message = 'Stream reading error';
        if (typeof streamError === 'object' && streamError && 'message' in streamError) {
          message = `Stream reading error: ${(streamError as { message?: string }).message}`;
        } else if (typeof streamError === 'string') {
          message = `Stream reading error: ${streamError}`;
        }
        throw new StreamError(message);
      }
    }
  } catch (error) {
    if (error instanceof APIError || error instanceof StreamError) {
      throw error;
    }
    let message = 'Unexpected error';
    if (typeof error === 'object' && error && 'message' in error) {
      message = `Unexpected error: ${(error as { message?: string }).message}`;
    } else if (typeof error === 'string') {
      message = `Unexpected error: ${error}`;
    }
    throw new Error(message);
  }
};

export const streamWebSummaryFromEvents = async (
  pageContent: PageContent,
  sseEndpoint: string,
  onChunk: (chunk: string) => void
) => {
  if (!pageContent.visibleText?.trim()) {
    throw new Error('Page content cannot be empty');
  }

  if (!sseEndpoint?.trim()) {
    throw new Error('SSE endpoint URL cannot be empty');
  }

  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Access token not found in storage');
  }

  console.log('Using SSE endpoint:', sseEndpoint);

  try {
    const response = await fetch(sseEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ content: pageContent, stream: true, ignoreCache: true, deep_summary: true }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new StreamError('Response body is null');
    }

    const reader = response.body.getReader();
    console.log(  'Response body reader created', reader);
    const decoder = new TextDecoder('utf-8');
    let done = false;
    let buffer = '';


    while (!done) {
      try {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            const dataLine = line.startsWith('data: ') 
                ? line.slice(6).trim()
                : line.trim();

            // Skip empty lines
            if (!dataLine) continue;

            // Check for [DONE] message
            if (dataLine === '[DONE]') {
              return;
            }

            try {
              const json = JSON.parse(dataLine);
              // Use the correct field for your API
              if (json.text !== undefined) {
                onChunk(json.text);
              } else if (json.content !== undefined) {
                onChunk(json.content);
              }
            } catch (e) {
              console.warn('Failed to parse line:', line);
            }
          }
        }
      } catch (streamError) {
        let message = 'Stream reading error';
        if (typeof streamError === 'object' && streamError && 'message' in streamError) {
          message = `Stream reading error: ${(streamError as { message?: string }).message}`;
        } else if (typeof streamError === 'string') {
          message = `Stream reading error: ${streamError}`;
        }
        throw new StreamError(message);
      }
    }
  } catch (error) {
    if (error instanceof APIError || error instanceof StreamError) {
      throw error;
    }
    let message = 'Unexpected error';
    if (error && typeof error === 'object' && 'message' in error) {
      message = `Unexpected error: ${(error as any).message}`;
    } else if (typeof error === 'string') {
      message = `Unexpected error: ${error}`;
    }
    throw new Error(message);
  }
};

export const fetchWebTopicTagsAndSummary = async (
  pageContent: PageContent,
  apiEndpoint: string = getApiUrl(API_ENDPOINTS.PARSE),
  streamSummaryEndpoint?: string,
  onSummaryChunk?: (chunk: string) => void
): Promise<{
  tags: string[];
  title: string;
  categories: Array<string | [string, number]>;
  summary: string;
  metadata?: any;
}> => {
  // If content is not present, generate summary using streaming first
  if (!pageContent.visibleText?.trim()) {
    if (!streamSummaryEndpoint) {
      throw new Error('Page content is empty and no streaming endpoint provided for summary generation');
    }
    
    if (!onSummaryChunk) {
      throw new Error('Page content is empty and no summary chunk handler provided');
    }

    // Generate summary using streaming
    let generatedSummary = '';
    const chunkHandler = (chunk: string) => {
      generatedSummary += chunk;
      onSummaryChunk(chunk);
    };

    try {
      // Create a minimal page content for streaming
      const minimalPageContent: PageContent = {
        ...pageContent,
        visibleText: pageContent.title || pageContent.metaDescription || 'No content available'
      };

      await streamWebSummaryFromEvents(minimalPageContent, streamSummaryEndpoint, chunkHandler);

      // Update pageContent with generated summary
      pageContent = {
        ...pageContent,
        visibleText: generatedSummary
      };
    } catch (error) {
      throw new Error(`Failed to generate summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Proceed with normal parsing now that we have content
  const accessToken = await getAccessToken();
  if (!accessToken) {
    throw new Error('Access token not found in localStorage');
  }

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ content: pageContent }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();
  return {
    tags: data.tags || [],
    categories: data.categories || [],
    summary: data.summary || '',
    title: data.title || '',
    metadata: data.metadata,
  };
};

/**
 * Generates a streaming summary and extracts page details in parallel.
 * This function runs both operations simultaneously for better performance.
 */
export const generateSummaryAndExtractDetails = async (
  pageContent: PageContent,
  streamSummaryEndpoint: string,
  extractEndpoint: string = getApiUrl(API_ENDPOINTS.EXTRACT_ARTICLE),
  onSummaryChunk?: (chunk: string) => void
): Promise<{
  tags: string[];
  title: string;
  categories: Array<string | [string, number]>;
  summary: string;
  metadata?: any;
  streamedSummary: string;
}> => {
  let streamedSummary = '';
  
  // Generate summary using streaming
  const chunkHandler = (chunk: string) => {
    streamedSummary += chunk;
    if (onSummaryChunk) {
      onSummaryChunk(chunk);
    }
  };

  try {
    // Use existing content if available, otherwise use minimal content for streaming
    const contentForStreaming: PageContent = pageContent.visibleText?.trim() 
      ? pageContent 
      : {
          ...pageContent,
          visibleText: pageContent.title || pageContent.metaDescription || 'Generate summary for this page'
        };

    // Start both operations in parallel
    const streamingPromise = streamWebSummaryFromEvents(contentForStreaming, streamSummaryEndpoint, chunkHandler);
    
    // Start extractarticle in parallel using the original page content
    const extractPromise = extractArticleData({
      rawText: contentForStreaming.visibleText,
      content: {
        url: contentForStreaming.url,
        title: contentForStreaming.title,
        metaDescription: contentForStreaming.metaDescription,
        headings: contentForStreaming.headings,
        visibleText: contentForStreaming.visibleText,
        structuredData: contentForStreaming.structuredData,
        openGraph: contentForStreaming.openGraph,
        thumbnailUrl: contentForStreaming.thumbnailUrl
      }
    }, extractEndpoint);

    // Wait for both to complete
    const [_, extractDetails] = await Promise.all([streamingPromise, extractPromise]);

    return {
      tags: extractDetails.tags,
      title: extractDetails.title,
      categories: extractDetails.categories,
      summary: extractDetails.summary,
      metadata: extractDetails.metadata,
      streamedSummary
    };
  } catch (error) {
    throw new Error(`Failed to generate summary and extract details: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Creates a PageContent object from uploaded file content.
 * This allows uploaded files to be processed by the same summarization pipeline.
 */
export function createPageContentFromUploadedFile(
  filename: string,
  content: string,
  uploadUrl: string
): PageContent {
  return {
    url: uploadUrl,
    title: filename,
    metaDescription: `Uploaded file: ${filename}`,
    headings: extractHeadingsFromContent(content),
    visibleText: content,
    structuredData: {},
    openGraph: {
      title: filename,
      description: `Uploaded file: ${filename}`,
    },
    thumbnailUrl: undefined,
  };
}

/**
 * Helper function to extract potential headings from text content
 */
function extractHeadingsFromContent(content: string): string[] {
  const headings: string[] = [];
  
  // Extract markdown headings
  const markdownHeadingRegex = /^#+\s+(.+)$/gm;
  let match;
  while ((match = markdownHeadingRegex.exec(content)) !== null) {
    headings.push(match[1].trim());
  }
  
  // Extract lines that might be headings (short lines followed by empty lines)
  const lines = content.split('\n');
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i].trim();
    const nextLine = lines[i + 1]?.trim();
    
    // Potential heading: short line (< 80 chars) followed by empty line
    if (line.length > 0 && line.length < 80 && nextLine === '' && !line.includes('.')) {
      headings.push(line);
    }
  }
  
  return headings.slice(0, 10); // Limit to first 10 headings
}

export const extractThumbnailUrl = (): string | null => {
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
}

// Additional function to render summary with thumbnail
export function renderSummaryWithThumbnail(pageContent: PageContent) {
  const container = document.createElement('div');
  container.className = 'gpt-summary-container';

  // Thumbnail
  if (pageContent.thumbnailUrl) {
    const thumbnailDiv = document.createElement('div');
    thumbnailDiv.className = 'gpt-summary-thumbnail';
    thumbnailDiv.style.marginBottom = '8px';

    const img = document.createElement('img');
    img.src = pageContent.thumbnailUrl;
    img.alt = 'Thumbnail';
    img.style.maxWidth = '120px';
    img.style.maxHeight = '80px';
    img.style.borderRadius = '6px';
    img.style.boxShadow = '0 1px 4px rgba(0,0,0,0.08)';
    img.onerror = () => { img.onerror = null; img.src = `${location.origin}/favicon.ico`; };

    thumbnailDiv.appendChild(img);
    container.appendChild(thumbnailDiv);
  }

  // Title
  const titleElement = document.createElement('h2');
  titleElement.className = 'gpt-summary-title';
  titleElement.textContent = pageContent.title || 'No title available';
  container.appendChild(titleElement);

  // Summary
  const summaryElement = document.createElement('div');
  summaryElement.className = 'gpt-summary-content';
  summaryElement.innerHTML = pageContent.visibleText || 'No content available';
  container.appendChild(summaryElement);

  return container;
}

/**
 * Stores a summary to the backend API.
 * @param params Object containing all required fields for the API.
 * @param apiEndpoint Optional override for the API endpoint.
 */
export async function storeWebSummary(
  params: {
    url: string;
    title: string;
    thumbnailUrl?: string | null;
    description: string;
    tags: string[];
    categories: Array<string | [string, number]>;
    summary: string;
  },
  apiEndpoint: string = getApiUrl(API_ENDPOINTS.STORE_SUMMARY)
): Promise<any> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  const payload = {
    content: {
      url: params.url,
      title: params.title,
      thumbnailUrl: params.thumbnailUrl ?? undefined,
      description: params.description,
      tags: params.tags,
      categories: params.categories,
      summary: params.summary,
    }
  };

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches article recommendations related to the currently viewed article.
 * @param articleId The ID of the current article.
 * @param apiEndpoint Optional override for the API endpoint.
 * @returns An array of recommended articles or any response shape from the backend.
 */
export async function fetchArticleRecommendations(
  article_id: string,
  apiEndpoint: string = getApiUrl(API_ENDPOINTS.GET_ARTICLE_RECOMMENDATIONS)
): Promise<any> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  const payload = { article_id };

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches user recommendations from the backend API.
 * @param apiEndpoint Optional override for the API endpoint.
 * @returns An array of recommended items or any response shape from the backend.
 */
export async function fetchUserArticleRecommendations(
  apiEndpoint: string = getApiUrl(API_ENDPOINTS.GET_USER_RECOMMENDATIONS)
): Promise<any> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    // No body needed for this endpoint
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Sends a user event to update the user vector in the backend.
 * @param user_id The user's ID.
 * @param article_id The article's ID.
 * @param event_type The type of event (e.g., "view", "like").
 * @param apiEndpoint Optional override for the API endpoint.
 * @returns The backend response.
 */
export async function sendUserVectorEvent(
  article_id: string,
  event_type: string,
  apiEndpoint: string = getApiUrl(API_ENDPOINTS.UPDATE_USER_VECTOR)
): Promise<any> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  const payload = {
    article_id,
    event_type,
  };

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Adds an article to a room via the backend API, supporting all possible fields.
 * @param params Object containing all allowed fields for the API.
 * @param apiEndpoint Optional override for the API endpoint.
 */
export async function addToRoom(
  params: {
    url: string;
    title: string;
    summary: string;
    thumbnail_url?: string | null;
    tags?: string[];
    categories?: string[];
    category?: string;
    description: string;
  },
  apiEndpoint: string = 'http://localhost:3000/v1/room/addtorooms'
): Promise<any> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  // Only include allowed fields
  const payload: any = {};
  if (params.url) payload.url = params.url;
  if (params.title) payload.title = params.title;
  if (params.summary) payload.summary = params.summary;
  if (params.thumbnail_url !== undefined) payload.thumbnail_url = params.thumbnail_url;
  if (params.tags) payload.tags = params.tags;
  if (params.categories) payload.categories = params.categories;
  if (params.category) payload.category = params.category;
  if (params.description) payload.description = params.description;

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches detailed information about an article from the backend API.
 * @param articleId The ID of the article to fetch details for.
 * @param apiEndpoint Optional override for the API endpoint.
 * @returns The API response containing article details, taggable users, room details, and people.
 */
export async function getArticleDetails(
  articleId: number | string,
  apiEndpoint: string = getApiUrl(API_ENDPOINTS.GET_ARTICLE_DETAILS)
): Promise<{
  article: {
    article_id: number;
    content: string;
    thumbnail_url: string;
    url: string;
    category: string;
    room_id: number;
    room_name: string;
    title: string;
    member_count: number;
    is_member: boolean;
    is_guest: boolean;
    is_private: boolean;
    summary: string;
    verifieddata: any;
  };
  taggable_users: Array<{
    user_id: string;
    name: string;
    display_pic: string;
  }>;
  room_details: {
    room_id: number;
    room_name: string;
    admin_id: string;
    admin_name: string;
    admin_picture: string;
    member_count: number;
  };
  people: Array<{
    user_id: string;
    name: string;
    display_pic: string;
    joined_at: string;
    is_guest: boolean;
    stats: {
      articles_shared: number;
      comments_count: number;
      reactions_count: number;
    };
  }>;
}> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  const payload = { articleId };

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}


/**
 * Extracts article data (tags, summary, etc.) from raw text and content using the backend API.
 * @param params Object containing rawText and content (similar to /parse).
 * @param apiEndpoint Optional override for the API endpoint.
 * @returns The API response with tags, summary, title, categories, suggestions, etc.
 */
export async function extractArticleData(
  params: {
    rawText: string;
    content: {
      url: string;
      title: string;
      metaDescription?: string;
      headings?: string[];
      visibleText?: string;
      structuredData?: any;
      openGraph?: any;
      thumbnailUrl?: string;
    };
  },
  apiEndpoint: string = getApiUrl(API_ENDPOINTS.EXTRACT_ARTICLE)
): Promise<{
  tags: string[];
  title: string;
  obscene: boolean;
  summary: string;
  category: string;
  metadata: any;
  realtime: boolean;
  sensitive: boolean;
  categories: string[];
  suggestions: string[];
  socialSearch: string;
}> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}



/**
 * Stores a smart highlight to the backend API.
 * @param params Object containing all required fields for the API.
 * @param apiEndpoint Optional override for the API endpoint.
 */
export async function storeSmartHighlight(
  params: {
    content: string;
    highlighted_text: string;
    start_index: number;
    end_index: number;
    message: string;
    url: string;
    is_private: boolean;
    invited_users: string[];
  },
  apiEndpoint: string = getApiUrl(API_ENDPOINTS.STORE_HIGHLIGHT)
): Promise<any> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  const payload = {
    content: params.content,
    highlighted_text: params.highlighted_text,
    start_index: params.start_index,
    end_index: params.end_index,
    message: params.message,
    url: params.url,
    is_private: params.is_private,
    invited_users: params.invited_users,
  };

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches stored highlights for a given content/article.
 * @param params Object containing content, articleId, sparkId, page, and limit.
 * @param apiEndpoint Optional override for the API endpoint.
 * @returns The API response with highlights.
 */
export async function fetchContentHighlights(
  params: {
    content: string;
    articleId?: string;
    sparkId?: string;
    page?: number;
    limit?: number;
  },
  apiEndpoint: string = getApiUrl(API_ENDPOINTS.CONTENT_HIGHLIGHTS)
): Promise<any> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  const payload: any = {
    content: params.content,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  };
  if (params.articleId) payload.articleId = params.articleId;
  if (params.sparkId) payload.sparkId = params.sparkId;

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetches stored highlights for a given articleId and content.
 * @param params Object containing articleId, content, page, and limit.
 * @param apiEndpoint Optional override for the API endpoint.
 * @returns The API response with highlights.
 */
export async function getStoredHighlights(
  params: {
    articleId: string;
    content: string;
    page?: number;
    limit?: number;
  },
  apiEndpoint: string = getApiUrl(API_ENDPOINTS.CONTENT_HIGHLIGHTS)
): Promise<any> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  const payload = {
    articleId: params.articleId,
    content: params.content,
    page: params.page ?? 1,
    limit: params.limit ?? 20,
  };

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}



export async function summarizePdfFile(
  file: File | Blob,
  apiEndpoint: string = 'http://localhost:3000/v1/client/summarize-pdf'
): Promise<any> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  const formData = new FormData();
  formData.append('pdf', file);

  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      // Do not set Content-Type; browser will set it with boundary for multipart/form-data
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}
