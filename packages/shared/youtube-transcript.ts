/**
 * YouTube Transcript and Caption Extraction Utilities
 * Provides functionality to extract transcripts/captions with timestamps
 * and enable navigation to specific video frames
 */

export interface TranscriptSegment {
  text: string;
  startTime: number;
  duration: number;
  formattedTime: string;
}

export interface YoutubeTranscriptData {
  transcriptText: string;
  segments: TranscriptSegment[];
  comments: string[];
  videoId: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
}

// Helper: Normalize and filter tags with multilingual support
export function normalizeAndFilterTags(tags: string[], language = 'en'): string[] {
  const normalized = tags
    .map((tag) => tag.toLowerCase().trim())
    .filter((tag) => {
      // More permissive regex for non-Latin scripts
      const latinPattern = /^[a-zA-Z0-9\s\-_]+$/;
      const unicodePattern = /^[\p{L}\p{N}\s\-_]+$/u; // Unicode letters and numbers
      
      const isValidPattern = latinPattern.test(tag) || unicodePattern.test(tag);
      return tag.length >= 2 && tag.length <= 30 && !isStopWord(tag, language) && isValidPattern;
    })
    .map((tag) => {
      // Capitalize properly for different scripts
      if (/^[a-zA-Z0-9\s\-_]+$/.test(tag)) {
        // Latin script - capitalize each word
        return tag
          .split(' ')
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      } else {
        // Non-Latin script - preserve original case but trim
        return tag.trim();
      }
    });
  return [...new Set(normalized)].slice(0, 15);
}

function isStopWord(word: string, language: string): boolean {
  const stopWords = {
    en: ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should'],
    es: ['el', 'la', 'de', 'que', 'y', 'a', 'en', 'un', 'es', 'se', 'no', 'te', 'lo', 'le', 'da', 'su', 'por', 'son', 'con', 'para', 'al', 'del', 'las', 'los'],
    fr: ['le', 'de', 'et', 'à', 'un', 'il', 'être', 'et', 'en', 'avoir', 'que', 'pour', 'dans', 'ce', 'son', 'une', 'sur', 'avec', 'ne', 'se', 'pas', 'tout'],
  };
  
  return stopWords[language as keyof typeof stopWords]?.includes(word.toLowerCase()) || false;
}

export function normalizeYouTubeUrl(url: string): string {
  // Convert youtu.be URLs to youtube.com format
  if (url.includes('youtu.be/')) {
    const videoId = url.split('youtu.be/')[1].split('?')[0].split('&')[0];
    return `https://www.youtube.com/watch?v=${videoId}`;
  }
  return url;
}

export function extractVideoId(url: string): string | null {
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/;
  const match = url.match(youtubeRegex);
  return match ? match[1] : null;
}

export function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export async function fetchYouTubeCaptionsFromPage(videoUrl: string): Promise<YoutubeTranscriptData> {
  // Normalize YouTube URL if needed
  videoUrl = normalizeYouTubeUrl(videoUrl);
  const videoId = extractVideoId(videoUrl);

  // Helper to recursively find a key in nested objects/arrays
  function findKeyWithPath(data: any, targetKey: string, path = ''): [string, any] | null {
    if (typeof data === 'object' && data !== null && !Array.isArray(data)) {
      for (const key in data) {
        const value = data[key];
        const currentPath = path ? `${path}->${key}` : key;
        if (key === targetKey) {
          return [currentPath, value];
        }
        const result = findKeyWithPath(value, targetKey, currentPath);
        if (result !== null) return result;
      }
    } else if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        const currentPath = `${path}[${i}]`;
        const result = findKeyWithPath(data[i], targetKey, currentPath);
        if (result !== null) return result;
      }
    }
    return null;
  }

  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  };
  
  const response = await fetch(videoUrl, { 
    headers: headers,
    redirect: 'follow'
  });
  const html = await response.text();

  // Extract ytInitialData JSON
  let initialData = null;
  let match = html.match(/var ytInitialData\s*=\s*(\{.*?\});/s);
  if (match) {
    try {
      initialData = JSON.parse(match[1]);
    } catch (e) {
      initialData = null;
    }
  }

  // Extract ytInitialPlayerResponse JSON
  let playerResponse = null;
  match = html.match(/var ytInitialPlayerResponse\s*=\s*(\{.*?\});/s);
  if (match) {
    try {
      playerResponse = JSON.parse(match[1]);
    } catch (e) {
      playerResponse = null;
    }
  }

  // Extract ytcfg data
  const context: any = {};
  const ytcfgMatch = html.match(/ytcfg\.set\(({.*?})\);/s);
  if (ytcfgMatch) {
    try {
      const ytcfgData = JSON.parse(ytcfgMatch[1]);
      context.client = {
        hl: ytcfgData.HL,
        gl: ytcfgData.GL,
        visitorData: ytcfgData.VISITOR_DATA,
        userAgent: headers['User-Agent'],
        clientName: ytcfgData.INNERTUBE_CONTEXT_CLIENT_NAME,
        clientVersion: ytcfgData.INNERTUBE_CONTEXT_CLIENT_VERSION,
        osName: 'Windows',
        osVersion: '10.0',
        originalUrl: videoUrl,
        platform: 'DESKTOP',
        utcOffsetMinutes: 330,
        userInterfaceTheme: 'USER_INTERFACE_THEME_LIGHT',
      };
    } catch (e) { }
  }

  // Add responseContext if available
  if (playerResponse && playerResponse.responseContext) {
    context.responseContext = playerResponse.responseContext;
  }

  // Extract externalVideoId
  let externalVideoId = null;
  const videoIdMatch = html.match(/"videoId":"(.*?)"/);
  if (videoIdMatch) {
    externalVideoId = videoIdMatch[1];
  }

  // Extract params from getTranscriptEndpoint
  let paramsValue = null;
  if (initialData) {
    const result = findKeyWithPath(initialData, 'getTranscriptEndpoint');
    if (result && typeof result[1] === 'object') {
      paramsValue = result[1].params;
    }
  }

  const ytData = {
    context,
    params: paramsValue,
    externalVideoId,
  };

  // Step 2: Send ytData as payload to YouTube transcript endpoint
  const transcriptUrl = 'https://www.youtube.com/youtubei/v1/get_transcript?prettyPrint=false';
  const postHeaders = {
    'Content-Type': 'application/json',
  };
  
  const transcriptResp = await fetch(transcriptUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: postHeaders,
    body: JSON.stringify(ytData),
  });

  const respJson = await transcriptResp.json();

  // Step 3: Safely navigate to the initialSegments list
  let segments: any[] = [];
  try {
    segments =
      respJson.actions[0].updateEngagementPanelAction.content.transcriptRenderer.content.transcriptSearchPanelRenderer.body
        .transcriptSegmentListRenderer.initialSegments;
  } catch (e) {
    console.log('Could not find transcript segments in the response.');
    return { 
      transcriptText: '', 
      segments: [], 
      comments: [], 
      videoId, 
      videoUrl,
      thumbnailUrl: getYouTubeThumbnailUrl(videoId)
    };
  }

  // Step 4: Process segments with timestamps
  const processedSegments: TranscriptSegment[] = [];
  const transcriptText = segments
    .reduce((acc, seg) => {
      const renderer = seg.transcriptSegmentRenderer || {};
      const textRuns = renderer.snippet?.runs || [];
      const text = textRuns.map((run: any) => run.text || '').join('');
      const startTimeMs = parseInt(renderer.startMs || '0');
      const startTime = startTimeMs / 1000;
      const duration = parseFloat(renderer.endMs || '0') / 1000 - startTime;
      
      if (text.trim()) {
        processedSegments.push({
          text: text.trim(),
          startTime,
          duration,
          formattedTime: formatTime(startTime)
        });
      }
      
      return acc + ' ' + text;
    }, '')
    .trim();

  // --- Add: Fetch comments using continuation token ---
  let comments: string[] = [];
  if (initialData && context) {
    const continuationToken = findCommentsContinuationToken(initialData);
    if (continuationToken) {
      console.log('Found continuation token for more comments:', continuationToken);
    } else {
      console.log('No continuation token found for more comments.');
    }
    comments = await fetchMoreCommentsLimited(context, continuationToken, 5);
  }

  // Return transcript data with segments and comments
  return { 
    transcriptText, 
    segments: processedSegments, 
    comments, 
    videoId, 
    videoUrl,
    thumbnailUrl: getYouTubeThumbnailUrl(videoId)
  };
}

function findCommentsContinuationToken(obj: any): string | null {
  // Search for continuation token in comment section
  if (typeof obj !== 'object' || obj === null) return null;
  if (obj.continuationCommand && obj.continuationCommand.request === 'CONTINUATION_REQUEST_TYPE_WATCH_NEXT') {
    return obj.continuationCommand.token;
  }
  for (const key in obj) {
    const result = findCommentsContinuationToken(obj[key]);
    if (result) return result;
  }
  return null;
}

function extractContinuationToken(jsonData: any): string | null {
  let continuationToken = null;
  const endpoints = jsonData.onResponseReceivedEndpoints || [];
  for (const endpoint of endpoints) {
    const reloadCmd = endpoint.reloadContinuationItemsCommand;
    if (reloadCmd) {
      const items = reloadCmd.continuationItems || [];
      for (const item of items) {
        if (item.continuationItemRenderer) {
          continuationToken = item.continuationItemRenderer.continuationEndpoint?.continuationCommand?.token;
          if (continuationToken) {
            break;
          }
        }
      }
      if (continuationToken) {
        break;
      }
    }
  }
  return continuationToken;
}

async function fetchMoreCommentsLimited(context: any, continuationToken: string | null, maxIterations = 5): Promise<string[]> {
  let token = continuationToken;
  let iteration = 0;
  const uniqueComments = new Set<string>(); // Use Set to store unique comments

  while (token && iteration < maxIterations) {
    const url = 'https://www.youtube.com/youtubei/v1/next?prettyPrint=false';
    const payload = {
      context,
      continuation: token,
    };

    const resp = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();

    try {
      const actions = data.onResponseReceivedEndpoints || [];
      const mutations = data.frameworkUpdates?.entityBatchUpdate?.mutations || [];

      for (const mutation of mutations) {
        const payload = mutation.payload || {};
        const comment = payload.commentEntityPayload;
        if (comment) {
          const content = comment.properties?.content?.content;
          if (content) {
            uniqueComments.add(content); // Add to Set (automatically handles duplicates)
          }
        }
      }

      token = extractContinuationToken(data);
    } catch (e) {
      console.log('Could not extract more comments from continuation response.');
      break;
    }
    iteration++;
  }
  return Array.from(uniqueComments); // Convert Set back to array before returning
}

/**
 * Generate YouTube URL with timestamp for navigation
 */
export function generateYouTubeTimestampUrl(videoUrl: string, timeInSeconds: number): string {
  const url = new URL(normalizeYouTubeUrl(videoUrl));
  url.searchParams.set('t', Math.floor(timeInSeconds).toString() + 's');
  return url.toString();
}

/**
 * Check if URL is a YouTube video
 */
export function isYouTubeVideo(url: string): boolean {
  return /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)/.test(url);
}

/**
 * Generate YouTube thumbnail URL for a video
 */
export function getYouTubeThumbnailUrl(videoId: string | null): string | null {
  if (!videoId) return null;
  
  // YouTube thumbnail URLs in order of preference (highest quality first)
  // maxresdefault.jpg - 1920x1080 (if available)
  // hqdefault.jpg - 480x360 (high quality default)
  // mqdefault.jpg - 320x180 (medium quality)
  // default.jpg - 120x90 (lowest quality)
  
  // Use maxresdefault for best quality - if it doesn't exist, YouTube will serve hqdefault
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}
