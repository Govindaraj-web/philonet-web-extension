// API service for thought rooms and conversations
import { philonetAuthStorage } from '../storage/auth-storage';

interface CommentAuthor {
  comment_id: number;
  user_id: string;
  user_name: string;
  user_picture: string;
  original_content: string;
  content: string;
  quote: string;
  edited: boolean;
  minimessage: string;
  created_at: string;
  user_reacted: boolean;
  reaction_type: string | null;
  reactions: Array<{
    type: string;
    count: number;
  }>;
  mentioned_users: any[];
}

interface Comment {
  comment_id: number;
  reaction_type: string | null;
  title: string;
  edited: boolean;
  minimessage: string;
  original_content: string;
  content: string;
  quote: string;
  created_at: string;
  user_id: string;
  user_name: string;
  user_picture: string;
  parent_comment_id: number | null;
  parent_content: string | null;
  parent_user_id: string | null;
  parent_user_name: string | null;
  user_reacted: boolean;
  reactions: Array<{
    type: string;
    count: number;
  }>;
  child_comment_count: number;
  recent_child_comments: CommentAuthor[];
  mentioned_users: any[];
}

interface CommentsResponse {
  comments: Comment[];
  pagination: {
    has_more: boolean;
    next_cursor: string | null;
  };
  focused_comment_id: number | null;
  is_member: boolean;
  is_private: boolean;
  unread_count: number;
  tracking: {
    last_seen_comment_id: number;
  };
  filters: {
    opinion: boolean;
    explore: boolean;
  };
}

interface FetchCommentsParams {
  articleId: number;
  limit?: number;
  cursor?: string;
}

interface FetchSubCommentsParams {
  parentCommentId: number;
  articleId: number;
  limit?: number;
}

interface SubComment {
  comment_id: number;
  reaction_type: string | null;
  title: string;
  edited: boolean;
  emotion: string;
  minimessage: string;
  original_content: string;
  content: string;
  quote: string;
  created_at: string;
  user_id: string;
  user_name: string;
  user_picture: string;
  parent_comment_id: number;
  original_parent_content: string;
  parent_content: string;
  parent_user_id: string;
  parent_user_name: string;
  user_reacted: boolean;
  reactions: Array<{
    type: string;
    count: number;
  }>;
  mentioned_users: any[];
  reply_message_id: number | null;
  reply_message: string | null;
}

interface SubCommentsResponse {
  comments: SubComment[];
}

interface AddCommentParams {
  articleId: string | number;
  content: string;
  title?: string;
  parentCommentId?: string | number;
  replyMessageId?: string | number;
  minimessage?: string;
  quote?: string;
  emotion?: string;
}

interface AddCommentResponse {
  comment: {
    id: number;
    title: string | null;
    content: string;
    quote: string;
    minimessage: string;
    emotion: string | null;
    created_at: string;
    parent_comment_id: number | null;
    reply_message_id: number | null;
    parent_content: string;
    parent_user_id: string;
    parent_user_name: string;
    senderId: string;
    senderName: string;
    profileImage: string;
    reactionCount: number;
    reactions: any[];
    replyCount: number;
    userReacted: boolean;
    userReactionType: string | null;
    status: string;
    reply_message: string | null;
    mentions: any[];
    comment_id: number;
    user_id: string;
    user_picture: string;
    user_name: string;
    original_content: string;
    mentioned_users: any[];
  };
  room_id: number;
}

interface ReactToCommentParams {
  target_type: 'comment';
  target_id: number;
  reaction_type: string;
}

interface ReactToCommentResponse {
  success: boolean;
  message?: string;
  reaction_count?: number;
  user_reacted?: boolean;
}

interface AIQueryParams {
  text: string;
  fast?: boolean;
  stream?: boolean;
}

interface AIQueryResponse {
  summary: string;
  summarymini: string;
}

const getApiUrl = (endpoint: string) => `${process.env.CEB_API_URL || 'http://localhost:3000'}/v1${endpoint}`;

const API_ENDPOINTS = {
  COMMENTS_NEW: '/room/commentsnew',
  SUBCOMMENTS_NEW: '/room/subcommentsnew',
  ADD_COMMENT_NEW: '/room/addcommentnew',
  REACT: '/room/react',
  AI_QUERY: '/users/answerprogemininew'
};

export class ThoughtRoomsAPI {

  async fetchComments(params: FetchCommentsParams): Promise<CommentsResponse> {
    const { articleId, limit = 10, cursor } = params;
    
    // Get authorization token from storage
    const token = await philonetAuthStorage.getToken();
    if (!token) {
      console.error('🚫 No authorization token found in storage');
      throw new Error('No authorization token found. Please log in.');
    }
    
    console.log('🔐 Using authorization token for API request (length:', token.length, ')');
    
    const requestBody = {
      articleId,
      limit,
      ...(cursor && { cursor })
    };

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.COMMENTS_NEW), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // Add authorization header
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('🚫 Authentication failed - token may be expired');
          throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: CommentsResponse = await response.json();
      console.log('✅ API request successful, received', data.comments?.length || 0, 'comments');
      return data;
    } catch (error) {
      console.error('❌ API request failed:', error);
      throw error;
    }
  }

  async fetchSubComments(params: FetchSubCommentsParams): Promise<SubCommentsResponse> {
    const { parentCommentId, articleId, limit = 10 } = params;
    
    // Get authorization token from storage
    const token = await philonetAuthStorage.getToken();
    if (!token) {
      console.error('🚫 No authorization token found in storage');
      throw new Error('No authorization token found. Please log in.');
    }
    
    console.log('🔐 Fetching sub-comments for parent:', parentCommentId, 'article:', articleId);
    
    const requestBody = {
      parentCommentId,
      articleId,
      limit
    };

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.SUBCOMMENTS_NEW), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('🚫 Authentication failed - token may be expired');
          throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
        }
        throw new Error(`API request failed: ${response.status} ${response.statusText}`);
      }

      const data: SubCommentsResponse = await response.json();
      console.log('✅ Sub-comments API request successful, received', data.comments?.length || 0, 'replies');
      return data;
    } catch (error) {
      console.error('❌ Sub-comments API request failed:', error);
      throw error;
    }
  }

  async addComment(params: AddCommentParams): Promise<AddCommentResponse> {
    const { articleId, content, title, parentCommentId, replyMessageId, minimessage = '', quote, emotion } = params;
    
    // Get authorization token from storage
    const token = await philonetAuthStorage.getToken();
    if (!token) {
      console.error('🚫 No authorization token found in storage');
      throw new Error('No authorization token found. Please log in.');
    }
    
    console.log('💬 Adding comment to article:', articleId, 'parent:', parentCommentId);
    
    const requestBody: any = {
      articleId,
      content,
      minimessage
    };

    // Add optional parameters only if they're provided
    if (title) requestBody.title = title;
    if (parentCommentId) requestBody.parentCommentId = parentCommentId;
    if (replyMessageId) requestBody.replyMessageId = replyMessageId;
    if (quote) requestBody.quote = quote;
    if (emotion) requestBody.emotion = emotion;

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.ADD_COMMENT_NEW), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('🚫 Authentication failed - token may be expired');
          throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
        }
        throw new Error(`Add comment API request failed: ${response.status} ${response.statusText}`);
      }

      const data: AddCommentResponse = await response.json();
      console.log('✅ Comment added successfully, comment ID:', data.comment?.comment_id);
      return data;
    } catch (error) {
      console.error('❌ Add comment API request failed:', error);
      throw error;
    }
  }

  async reactToComment(params: ReactToCommentParams): Promise<ReactToCommentResponse> {
    const { target_type, target_id, reaction_type } = params;
    
    // Get authorization token from storage
    const token = await philonetAuthStorage.getToken();
    if (!token) {
      console.error('🚫 No authorization token found in storage');
      throw new Error('No authorization token found. Please log in.');
    }
    
    console.log('👍 Reacting to comment:', target_id, 'with reaction:', reaction_type);
    
    const requestBody = {
      target_type,
      target_id,
      reaction_type
    };

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.REACT), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('🚫 Authentication failed - token may be expired');
          throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
        }
        throw new Error(`React to comment API request failed: ${response.status} ${response.statusText}`);
      }

      const data: ReactToCommentResponse = await response.json();
      console.log('✅ Reaction toggled successfully for comment:', target_id);
      return data;
    } catch (error) {
      console.error('❌ React to comment API request failed:', error);
      throw error;
    }
  }

  async queryAI(params: AIQueryParams): Promise<AIQueryResponse | ReadableStream> {
    const { text, fast = true, stream = false } = params;
    
    // Get authorization token from storage
    const token = await philonetAuthStorage.getToken();
    if (!token) {
      console.error('🚫 No authorization token found in storage');
      throw new Error('No authorization token found. Please log in.');
    }
    
    console.log('🤖 Querying AI with text prompt (length:', text.length, 'chars), streaming:', stream);
    
    const requestBody = {
      text,
      fast,
      stream
    };

    try {
      const response = await fetch(getApiUrl(API_ENDPOINTS.AI_QUERY), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error('🚫 Authentication failed - token may be expired');
          throw new Error(`Authentication failed: ${response.status} ${response.statusText}`);
        }
        throw new Error(`AI query API request failed: ${response.status} ${response.statusText}`);
      }

      if (stream) {
        // Return the response body for streaming
        console.log('📡 Starting AI streaming response');
        if (!response.body) {
          throw new Error('No response body available for streaming');
        }
        return response.body;
      } else {
        // Traditional non-streaming response
        const data: AIQueryResponse = await response.json();
        
        // Validate the response has the expected structure
        if (!data.summary || typeof data.summary !== 'string') {
          console.error('❌ Invalid AI response structure:', data);
          throw new Error('Invalid response format from AI service');
        }
        
        console.log('✅ AI query completed successfully, summary length:', data.summary.length);
        return data;
      }
    } catch (error) {
      console.error('❌ AI query API request failed:', error);
      throw error;
    }
  }

  // Transform API comment to our thought starter format
  transformCommentToThoughtStarter(comment: Comment, currentUserId?: string) {
    return {
      id: comment.comment_id.toString(),
      title: comment.title || comment.content.substring(0, 100) + (comment.content.length > 100 ? '...' : ''),
      description: comment.content,
      category: 'Discussion',
      tags: this.extractTags(comment.content),
      lastActivity: comment.created_at,
      messageCount: comment.child_comment_count,
      participants: this.countUniqueParticipants(comment.recent_child_comments),
      isActive: true,
      hasUnread: false,
      unreadCount: 0,
      isOwn: currentUserId ? comment.user_id === currentUserId : false, // Detect if thought starter is from current user
      taggedContent: comment.quote ? {
        sourceText: comment.quote,
        sourceUrl: '',
        highlightedText: comment.quote
      } : undefined,
      thoughtBody: comment.content,
      author: {
        id: comment.user_id,
        name: comment.user_name,
        avatar: comment.user_picture,
        role: 'Community Member'
      },
      reactions: {
        likes: this.getReactionCount(comment.reactions, 'love'),
        hearts: this.getReactionCount(comment.reactions, 'heart'),
        stars: this.getReactionCount(comment.reactions, 'star'),
        thumbsUp: this.getReactionCount(comment.reactions, 'celebrate')
      },
      participantsList: this.transformParticipants(comment.recent_child_comments),
      readStatus: {
        totalParticipants: this.countUniqueParticipants(comment.recent_child_comments),
        readBy: Math.floor(this.countUniqueParticipants(comment.recent_child_comments) * 0.7),
        unreadBy: Math.ceil(this.countUniqueParticipants(comment.recent_child_comments) * 0.3)
      },
      lastMessage: comment.recent_child_comments.length > 0 ? {
        text: comment.recent_child_comments[0].content,
        author: comment.recent_child_comments[0].user_name,
        timestamp: comment.recent_child_comments[0].created_at,
        isRead: true
      } : undefined
    };
  }

  // Convenience method to fetch a conversation thread (main comment + sub-comments)
  async fetchConversationThread(articleId: number, parentCommentId: number, limit: number = 10, currentUserId?: string) {
    try {
      console.log('🧵 Fetching conversation thread for comment:', parentCommentId);
      
      // Fetch sub-comments for the specific parent comment
      const subCommentsResponse = await this.fetchSubComments({
        parentCommentId,
        articleId,
        limit
      });

      // Transform sub-comments to message format with current user detection
      const messages = subCommentsResponse.comments.map(subComment => 
        this.transformSubCommentToMessage(subComment, currentUserId, subCommentsResponse.comments)
      );

      console.log('✅ Fetched conversation thread with', messages.length, 'messages');
      
      return {
        parentCommentId,
        messages,
        hasMore: messages.length >= limit
      };
    } catch (error) {
      console.error('❌ Error fetching conversation thread:', error);
      throw error;
    }
  }

  // New method: Fetch only the comments listing (non-blocking)
  async fetchCommentsListingOnly(params: FetchCommentsParams): Promise<CommentsResponse> {
    console.log('📋 Fetching comments listing only (non-blocking)');
    return this.fetchComments(params);
  }

  // New method: Fetch messages for a specific conversation (separate call)
  async fetchConversationMessages(articleId: number, parentCommentId: number, limit: number = 10, currentUserId?: string) {
    try {
      console.log('💬 Fetching messages for conversation:', parentCommentId);
      
      const subCommentsResponse = await this.fetchSubComments({
        parentCommentId,
        articleId,
        limit
      });

      const messages = subCommentsResponse.comments.map(subComment => 
        this.transformSubCommentToMessage(subComment, currentUserId, subCommentsResponse.comments)
      );

      console.log('✅ Fetched', messages.length, 'messages for conversation');
      
      return {
        messages,
        hasMore: messages.length >= limit,
        parentCommentId
      };
    } catch (error) {
      console.error('❌ Error fetching conversation messages:', error);
      throw error;
    }
  }

  // Transform API sub-comment to conversation message format
  transformSubCommentToMessage(subComment: SubComment, currentUserId?: string, allComments?: SubComment[]) {
    // Log when we receive reply information
    if (subComment.reply_message_id || subComment.reply_message) {
      console.log('🔗 Found message with reply data:', {
        comment_id: subComment.comment_id,
        reply_message_id: subComment.reply_message_id,
        reply_message: subComment.reply_message,
        content: subComment.content.substring(0, 50) + '...'
      });
    }

    // Try to find the referenced message content if we have the ID but not the content
    let replyToContent = subComment.reply_message;
    let replyToAuthor = 'Referenced User';
    
    if (subComment.reply_message_id && !subComment.reply_message && allComments) {
      const referencedComment = allComments.find(c => c.comment_id.toString() === subComment.reply_message_id?.toString());
      if (referencedComment) {
        replyToContent = referencedComment.content.substring(0, 100) + (referencedComment.content.length > 100 ? '...' : '');
        replyToAuthor = referencedComment.user_name;
        console.log('🔍 Found referenced message content:', {
          referencedId: subComment.reply_message_id,
          content: replyToContent,
          author: replyToAuthor
        });
      }
    }

    // Check if this is an AI assistant response (has a title)
    const isAIResponse = !!(subComment.title && subComment.title.trim());
    
    // Log AI response detection
    if (isAIResponse) {
      console.log('🤖 Detected AI assistant response:', {
        comment_id: subComment.comment_id,
        title: subComment.title,
        content_preview: subComment.content.substring(0, 50) + '...'
      });
    }
    
    // For AI responses, keep title separate and don't embed it in content
    // The UI will handle displaying the title separately
    const messageText = subComment.content;

    const transformedMessage = {
      id: subComment.comment_id.toString(),
      text: messageText,
      author: isAIResponse ? 'AI Assistant' : subComment.user_name, // Use "AI Assistant" for messages with titles
      timestamp: subComment.created_at,
      isOwn: currentUserId ? subComment.user_id === currentUserId : false, // Detect if message is from current user
      type: isAIResponse ? 'ai-response' as const : 'text' as const, // Set type based on whether it has a title
      avatar: subComment.user_picture,
      isRead: true,
      status: 'read' as const,
      reactions: subComment.reactions?.map(reaction => ({
        emoji: this.getEmojiForReactionType(reaction.type),
        count: reaction.count,
        users: [] // We don't have user list data
      })) || [],
      replyTo: subComment.parent_comment_id ? subComment.parent_user_name : undefined,
      // Add reply information from the API response (keep as strings)
      replyToMessageId: subComment.reply_message_id?.toString(),
      replyToContent: replyToContent || (subComment.reply_message_id ? 'Referenced message' : undefined),
      replyToAuthor: subComment.reply_message_id ? replyToAuthor : undefined,
      quote: subComment.quote || undefined,
      edited: subComment.edited,
      userReacted: subComment.user_reacted,
      reactionType: subComment.reaction_type,
      // Store the original title for reference
      title: isAIResponse ? subComment.title : undefined
    };

    // Log the final transformed message if it has reply data
    if (transformedMessage.replyToMessageId) {
      console.log('🔗 Transformed message with reply data:', {
        id: transformedMessage.id,
        replyToMessageId: transformedMessage.replyToMessageId,
        replyToContent: transformedMessage.replyToContent,
        replyToAuthor: transformedMessage.replyToAuthor,
        hasReplyData: !!(transformedMessage.replyToMessageId || transformedMessage.replyToContent)
      });
    }

    return transformedMessage;
  }

  private getEmojiForReactionType(reactionType: string): string {
    const emojiMap: { [key: string]: string } = {
      'love': '❤️',
      'heart': '💙',
      'star': '⭐',
      'celebrate': '👍',
      'like': '👍',
      'laugh': '😂',
      'surprised': '😮',
      'sad': '😢',
      'angry': '😡'
    };
    return emojiMap[reactionType.toLowerCase()] || '👍';
  }

  private extractTags(content: string): string[] {
    // Simple tag extraction - you can make this more sophisticated
    const words = content.toLowerCase().split(/\s+/);
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those', 'what', 'when', 'where', 'why', 'how'];
    
    return words
      .filter(word => word.length > 3 && !commonWords.includes(word))
      .slice(0, 3);
  }

  private countUniqueParticipants(comments: CommentAuthor[]): number {
    const uniqueUsers = new Set(comments.map(c => c.user_id));
    return uniqueUsers.size;
  }

  private getReactionCount(reactions: Array<{type: string, count: number}>, type: string): number {
    const reaction = reactions.find(r => r.type === type);
    return reaction ? reaction.count : 0;
  }

  private transformParticipants(comments: CommentAuthor[]) {
    const uniqueUsers = new Map();
    
    comments.forEach(comment => {
      if (!uniqueUsers.has(comment.user_id)) {
        uniqueUsers.set(comment.user_id, {
          id: comment.user_id,
          name: comment.user_name,
          avatar: comment.user_picture,
          isOnline: Math.random() > 0.5, // Random online status for demo
          lastSeen: Math.random() > 0.7 ? undefined : `${Math.floor(Math.random() * 60)} min ago`
        });
      }
    });

    return Array.from(uniqueUsers.values()).slice(0, 5);
  }
}

// Export convenience functions for external use
export const fetchConversationForComment = async (articleId: number, parentCommentId: number, limit: number = 10, currentUserId?: string) => {
  return thoughtRoomsAPI.fetchConversationThread(articleId, parentCommentId, limit, currentUserId);
};

// New: Export non-blocking API functions
export const fetchCommentsListingOnly = async (params: FetchCommentsParams) => {
  return thoughtRoomsAPI.fetchCommentsListingOnly(params);
};

export const fetchConversationMessages = async (articleId: number, parentCommentId: number, limit: number = 10, currentUserId?: string) => {
  return thoughtRoomsAPI.fetchConversationMessages(articleId, parentCommentId, limit, currentUserId);
};

// Export add comment function
export const addComment = async (params: AddCommentParams) => {
  return thoughtRoomsAPI.addComment(params);
};

// Export react to comment function
export const reactToComment = async (params: ReactToCommentParams) => {
  return thoughtRoomsAPI.reactToComment(params);
};

// Export AI query function
export const queryAI = async (params: AIQueryParams) => {
  return thoughtRoomsAPI.queryAI(params);
};

export const thoughtRoomsAPI = new ThoughtRoomsAPI();

// Export types for external use
export type { AddCommentParams, AddCommentResponse, ReactToCommentParams, ReactToCommentResponse, AIQueryParams, AIQueryResponse };
