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

export class ThoughtRoomsAPI {
  private baseUrl = 'http://localhost:3000/v1';

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
      const response = await fetch(`${this.baseUrl}/room/commentsnew`, {
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
      const response = await fetch(`${this.baseUrl}/room/subcommentsnew`, {
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

  // Transform API comment to our thought starter format
  transformCommentToThoughtStarter(comment: Comment) {
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
  async fetchConversationThread(articleId: number, parentCommentId: number, limit: number = 10) {
    try {
      console.log('🧵 Fetching conversation thread for comment:', parentCommentId);
      
      // Fetch sub-comments for the specific parent comment
      const subCommentsResponse = await this.fetchSubComments({
        parentCommentId,
        articleId,
        limit
      });

      // Transform sub-comments to message format
      const messages = subCommentsResponse.comments.map(subComment => 
        this.transformSubCommentToMessage(subComment)
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

  // Transform API sub-comment to conversation message format
  transformSubCommentToMessage(subComment: SubComment) {
    return {
      id: subComment.comment_id.toString(),
      text: subComment.content,
      author: subComment.user_name, // ConversationRoom expects string, not object
      timestamp: subComment.created_at,
      isOwn: false, // Add isOwn property that ConversationRoom expects
      type: 'text' as const, // Add type property that ConversationRoom expects
      avatar: subComment.user_picture,
      isRead: true,
      status: 'read' as const,
      reactions: subComment.reactions?.map(reaction => ({
        emoji: this.getEmojiForReactionType(reaction.type),
        count: reaction.count,
        users: [] // We don't have user list data
      })) || [],
      replyTo: subComment.parent_comment_id ? subComment.parent_user_name : undefined,
      quote: subComment.quote || undefined,
      edited: subComment.edited,
      userReacted: subComment.user_reacted,
      reactionType: subComment.reaction_type
    };
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

// Export a convenience function for external use
export const fetchConversationForComment = async (articleId: number, parentCommentId: number, limit: number = 10) => {
  return thoughtRoomsAPI.fetchConversationThread(articleId, parentCommentId, limit);
};

export const thoughtRoomsAPI = new ThoughtRoomsAPI();
