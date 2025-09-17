
import { philonetAuthStorage } from "../storage/auth-storage";

// API configuration using environment variable
const getApiUrl = (endpoint: string) => `${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/client${endpoint}`;
const API_ENDPOINTS = {
  PARSE: '/parse',
  STORE_SUMMARY: '/store-summary',
  GET_ARTICLE_RECOMMENDATIONS: '/article-recommendations',
  GET_USER_RECOMMENDATIONS: '/user-recommendations',
  UPDATE_USER_VECTOR: '/update-user-vector',
  ADD_TO_ROOM: '/room/addtorooms',
  GET_ARTICLE_DETAILS: '/article-details',
  EXTRACT_ARTICLE: '/extract-article',
  STORE_HIGHLIGHT: '/room/storehighlight',
  CONTENT_HIGHLIGHTS: '/content-highlights'
};

export const getSummaryStorageKey = () => `gpt_summary_${location.origin}${location.pathname}`;

// Formula preprocessing utilities
export const preserveFormulas = (content: string): string => {
  // Protect LaTeX formulas from being mangled
  return content
    // Protect inline math: $formula$
    .replace(/\$([^$\n]+)\$/g, '`MATH_INLINE_START`$1`MATH_INLINE_END`')
    // Protect display math: $$formula$$
    .replace(/\$\$([^$]+)\$\$/g, '`MATH_DISPLAY_START`$1`MATH_DISPLAY_END`')
    // Protect equation environments
    .replace(/\\begin\{equation\}([\s\S]*?)\\end\{equation\}/g, '`EQUATION_START`$1`EQUATION_END`')
    // Protect align environments
    .replace(/\\begin\{align\}([\s\S]*?)\\end\{align\}/g, '`ALIGN_START`$1`ALIGN_END`');
};

export const restoreFormulas = (content: string): string => {
  // Restore protected formulas
  return content
    .replace(/`MATH_INLINE_START`([^`]+)`MATH_INLINE_END`/g, '$$$1$$')
    .replace(/`MATH_DISPLAY_START`([^`]+)`MATH_DISPLAY_END`/g, '$$$$$$\n$1\n$$$$$$')
    .replace(/`EQUATION_START`([^`]+)`EQUATION_END`/g, '\\begin{equation}$1\\end{equation}')
    .replace(/`ALIGN_START`([^`]+)`ALIGN_END`/g, '\\begin{align}$1\\end{align}');
};

// PDF utility functions
export const isPdfUrl = (url: string): boolean => {
  if (!url) return false;
  
  try {
    const urlObj = new URL(url);
    
    // Check file:// URLs for .pdf extension
    if (urlObj.protocol === 'file:') {
      return urlObj.pathname.toLowerCase().endsWith('.pdf');
    }
    
    // Check if URL ends with .pdf
    const urlPath = urlObj.pathname.toLowerCase();
    if (urlPath.endsWith('.pdf')) return true;
    
    // Check for PDF MIME type in the URL (some sites serve PDFs with different extensions)
    if (url.toLowerCase().includes('application/pdf')) return true;
    
    // Check for common PDF URL patterns
    const pdfPatterns = [
      /\.pdf$/i,
      /\.pdf\?/i,
      /\.pdf#/i,
      /\/pdf\//i,
      /pdf.*download/i,
      /download.*pdf/i
    ];
    
    return pdfPatterns.some(pattern => pattern.test(url));
  } catch (error) {
    // If URL parsing fails, fall back to basic pattern matching
    return url.toLowerCase().includes('.pdf');
  }
};

// Helper function to check if URL is a local file
export const isLocalFile = (url: string): boolean => {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'file:';
  } catch (error) {
    return false;
  }
};

// Function to handle local PDF files using Chrome extension APIs
export const extractLocalPdfFile = async (fileUrl: string): Promise<PdfUploadResponse> => {
  const accessToken = await getAccessToken();
  
  try {
    // Use Chrome extension APIs to access local file
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    console.log('📄 Current tab info:', { id: tab.id, url: tab.url });
    
    if (!tab.id) {
      throw new Error('No active tab found');
    }

    // For local PDFs displayed in browser, we need to use a different approach
    // Check if the current tab is actually displaying the PDF
    if (!tab.url) {
      throw new Error('Current tab has no URL');
    }
    
    console.log('📄 Checking if tab URL starts with file://', tab.url.startsWith('file://'));
    console.log('📄 Checking if fileUrl matches tab URL:', fileUrl === tab.url);
    
    if (!tab.url.startsWith('file://')) {
      throw new Error(`Current tab is not displaying a local file. Tab URL: ${tab.url}, Expected: ${fileUrl}`);
    }

    // Since direct file:// access is restricted, we'll suggest uploading the file
    const fileName = fileUrl.split('/').pop() || 'document.pdf';
    const helpfulError = `� Local PDF Access Restricted

Chrome extensions cannot directly access local files (file:// URLs) due to security restrictions.

To process your PDF "${fileName}", please try one of these options:

1. **Upload Method**: 
   - Copy the PDF file to a location you can upload from
   - Use the "Upload PDF" feature in this extension

2. **Cloud Method**:
   - Upload the PDF to Google Drive, Dropbox, or similar
   - Open it from the cloud service
   - Then generate content from the web URL

3. **Web Server Method**:
   - Place the PDF on a web server
   - Access it via https:// URL

This is a browser security limitation, not an extension bug. Local file access would require installing native software with elevated permissions.

Would you like to try uploading the PDF file instead?`;

    throw new LocalFileAccessError(helpfulError, fileName);

  } catch (error) {
    console.error('Error extracting local PDF:', error);
    // Re-throw the error as-is to preserve the helpful message
    throw error;
  }
};

export const extractPdfFromUrl = async (url: string): Promise<PdfUploadResponse> => {
  // Check if this is a local file
  if (isLocalFile(url)) {
    return extractLocalPdfFile(url);
  }
  
  // Handle remote URLs
  const accessToken = await getAccessToken();
  
  // First fetch the PDF content
  const pdfResponse = await fetch(url);
  if (!pdfResponse.ok) {
    throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText}`);
  }
  
  const pdfBlob = await pdfResponse.blob();
  
  // Create form data for upload
  const formData = new FormData();
  const filename = url.split('/').pop() || 'document.pdf';
  formData.append('pdf', pdfBlob, filename);
  
  // Upload and extract PDF content
  const response = await fetch(`${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/client/extract-pdf-content`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
  }

  const pdfResult = await response.json() as PdfUploadResponse;
  console.log('📄 Remote PDF extraction result:', pdfResult);
  
  // Ensure we have the required metadata structure
  if (!pdfResult.metadata?.fileHash) {
    console.error('❌ Remote PDF response missing fileHash:', pdfResult);
    throw new Error('Remote PDF processing failed: missing fileHash in response');
  }
  
  return pdfResult;
};

export const streamPdfSummaryFromEvents = async (
  pdfHash: string,
  onChunk: (chunk: string) => void
): Promise<void> => {
  const accessToken = await getAccessToken();

  const response = await fetch(`${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/client/pdfsummary`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ 
      pdfHash, 
      stream: true, 
      ignoreCache: false
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (!response.body) {
    throw new StreamError('Response body is null');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let done = false;
  let buffer = '';
  let accumulatedContent = '';

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
            // Apply formula restoration to final content
            const restoredContent = restoreFormulas(accumulatedContent);
            if (restoredContent !== accumulatedContent) {
              // If formulas were restored, send the corrected content
              onChunk(restoredContent);
            }
            return;
          }

          try {
            const json = JSON.parse(dataLine);
            let chunkContent = '';
            
            // Use the correct field for your API
            if (json.text !== undefined) {
              chunkContent = json.text;
            } else if (json.content !== undefined) {
              chunkContent = json.content;
            }
            
            if (chunkContent) {
              accumulatedContent += chunkContent;
              onChunk(chunkContent);
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
};

export const extractPdfArticleData = async (
  pdfHash: string
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
}> => {
  const accessToken = await getAccessToken();

  const response = await fetch(`${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/client/extractpdfarticle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ pdfHash }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
};

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

export class LocalFileAccessError extends Error {
  constructor(message: string, public fileName: string) {
    super(message);
    this.name = 'LocalFileAccessError';
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

export interface PdfUploadResponse {
  success: boolean;
  summary: string;
  imageUrl: string;
  metadata: {
    title: string;
    pageCount: number;
    wordCount: number;
    originalName: string;
    fileSize: number;
    pdfUrl: string;
    fileHash: string;
    accessCount: number;
    cacheHit: string;
    firstCached: string;
    lastAccessed: string;
  };
}

export interface PdfHashRequest {
  pdfHash: string;
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
      body: JSON.stringify({ content: pageContent, stream: true, ignoreCache: false, deep_summary: false }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    if (!response.body) {
      throw new StreamError('Response body is null');
    }

    const reader = response.body.getReader();
    console.log('Response body reader created', reader);
    const decoder = new TextDecoder('utf-8');
    let done = false;
    let buffer = '';

    // Send an immediate signal that streaming has started
    // This provides immediate visual feedback to users
    onChunk('');


    while (!done) {
      try {
        const { value, done: streamDone } = await reader.read();
        done = streamDone;
        if (value) {
          buffer += decoder.decode(value, { stream: !done });
          
          // Process buffer more aggressively to reduce perceived delay
          // Split on both \n and \r\n to handle different line endings
          const lines = buffer.split(/\r?\n/);
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
                // Immediately send any non-empty content
                if (json.text.length > 0) {
                  onChunk(json.text);
                }
              } else if (json.content !== undefined) {
                // Immediately send any non-empty content
                if (json.content.length > 0) {
                  onChunk(json.content);
                }
              }
            } catch (e) {
              console.warn('Failed to parse line:', line);
            }
          }
          
          // Also check if there's partial data in the buffer that looks like JSON
          // This helps handle cases where the buffer contains incomplete JSON
          if (buffer.trim() && !buffer.includes('\n')) {
            try {
              const json = JSON.parse(buffer.trim());
              if (json.text !== undefined && json.text.length > 0) {
                onChunk(json.text);
                buffer = '';
              } else if (json.content !== undefined && json.content.length > 0) {
                onChunk(json.content);
                buffer = '';
              }
            } catch (e) {
              // Not a complete JSON yet, keep buffering
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
    hash?: string;
    pdf?: boolean;
  },
  apiEndpoint: string = `${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/room/addtorooms`
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
  if (params.hash) payload.hash = params.hash;
  if (params.pdf !== undefined) payload.pdf = params.pdf;

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
 * Joins a room as a guest for a specific article.
 * @param articleId The ID of the article to join the room for.
 * @param apiEndpoint Optional override for the API endpoint.
 * @returns The API response containing success status, message, and article details.
 */
export async function joinRoomAsGuest(
  articleId: number | string,
  apiEndpoint: string = `${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/room/article/join-as-guest`
): Promise<{
  success: boolean;
  message: string;
  article: {
    article_id: number;
    title: string;
    room_id: number;
    room_name: string;
  };
}> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  const payload = {
    articleId: Number(articleId)
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
    article_id?: string;
  },
  apiEndpoint: string = `${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/room/storehighlight`
): Promise<any> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  const payload: any = {
    content: params.content,
    highlighted_text: params.highlighted_text,
    start_index: params.start_index,
    end_index: params.end_index,
    message: params.message,
    url: params.url,
    is_private: params.is_private,
    invited_users: params.invited_users,
    conversation_starter: false
  };

  // Add article_id to payload if provided
  if (params.article_id) {
    payload.article_id = params.article_id;
  }

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
  apiEndpoint: string = `${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/room/contenthighlights`
): Promise<any> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  const payload: any = {
    content: "test content",
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
  apiEndpoint: string = `${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/room/contenthighlights`
): Promise<any> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  const payload = {
    articleId: params.articleId,
    content: "test content",
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

/**
 * Fetches stored highlights for a specific article ID to display in the side panel dock.
 * @param articleId The ID of the article to fetch highlights for.
 * @param page Optional page number for pagination (default: 1).
 * @param limit Optional limit for number of highlights to fetch (default: 20).
 * @param apiEndpoint Optional override for the API endpoint.
 * @returns The API response with highlights for the article.
 */
export async function fetchHighlightsByArticleId(
  articleId: string,
  page: number = 1,
  limit: number = 20,
  apiEndpoint: string = `${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/room/contenthighlights`
): Promise<any> {
  // Fetch access token from philonetAuthStorage
  const accessToken = await getAccessToken();
  if (!accessToken) {
    // Token validation is handled in getAccessToken()
  }

  let payload: any = {
    articleId,
    page,
    limit,
  };
payload["content"] = "test content";
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
  apiEndpoint: string = `${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/client/summarize-pdf`
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
