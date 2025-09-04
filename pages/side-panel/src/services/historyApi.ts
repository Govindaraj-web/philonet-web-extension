import { philonetAuthStorage } from '../storage/auth-storage';
import { HistoryItem } from '../types';

interface RecentlyViewedArticlesResponse {
  success: boolean;
  data: {
    articles: Array<{
      article: {
        id: number;
        title: string;
        url: string;
        summary: string;
        description: string;
        thumbnail_url: string;
        category: string;
        created_at: string;
        comment_count: number;
      };
      room: {
        id: number;
        name: string;
      };
      shared_by: {
        id: string;
        name: string;
        picture: string;
      };
      interaction_summary: {
        last_viewed_at: string;
        first_viewed_at: string;
        view_count: number;
        read_count: number;
        like_count: number;
        share_count: number;
        total_interactions: number;
        interaction_types: string[];
        engagement_score: number;
        time_ago: string;
      };
      user_data: {
        is_bookmarked: boolean;
        reading_progress: number | null;
      };
    }>;
    pagination?: {
      current_page: number;
      total_pages: number;
      total_count: number;
      has_more: boolean;
    };
  };
  message?: string;
}

export interface HistoryApiResult {
  items: HistoryItem[];
  hasMore: boolean;
}

export const fetchRecentlyViewedArticles = async (
  page: number = 1,
  limit: number = 20
): Promise<HistoryApiResult> => {
  try {
    const token = await philonetAuthStorage.getToken();
    
    if (!token) {
      throw new Error('No access token available. Please log in.');
    }

    const response = await fetch(
      `${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/interactions/recently-viewed-articles?page=${page}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data: RecentlyViewedArticlesResponse = await response.json();
    
    if (!data.success || !data.data?.articles) {
      throw new Error(data.message || 'Failed to fetch recently viewed articles');
    }

    // Transform API response to HistoryItem format
    const items = data.data.articles.map(item => ({
      id: item.article.id,
      title: item.article.title,
      url: item.article.url,
      timestamp: new Date(item.interaction_summary.last_viewed_at),
      summary: item.article.summary,
      thumbnail_url: item.article.thumbnail_url,
      category: item.article.category,
      comment_count: item.article.comment_count,
      room: item.room,
      shared_by: item.shared_by,
      interaction_summary: item.interaction_summary,
      user_data: item.user_data,
    }));

    // Determine if there's more data available
    const hasMore = data.data.pagination?.has_more ?? (items.length === limit);

    return {
      items,
      hasMore
    };
  } catch (error) {
    console.error('Error fetching recently viewed articles:', error);
    throw error;
  }
};

export const loadMoreHistory = async (currentItems: HistoryItem[], page: number): Promise<HistoryApiResult> => {
  try {
    const result = await fetchRecentlyViewedArticles(page, 20);
    
    // Filter out duplicates based on article ID
    const existingIds = new Set(currentItems.map(item => item.id));
    const uniqueNewItems = result.items.filter((item: HistoryItem) => !existingIds.has(item.id));
    
    return {
      items: [...currentItems, ...uniqueNewItems],
      hasMore: result.hasMore
    };
  } catch (error) {
    console.error('Error loading more history:', error);
    return {
      items: currentItems,
      hasMore: false
    };
  }
};
