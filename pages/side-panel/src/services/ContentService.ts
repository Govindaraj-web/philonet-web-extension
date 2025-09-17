import { ApiService, ApiConfig } from './ApiService';
import { Comment, AIAnswer, HistoryItem } from '../types';

export interface CreateCommentRequest {
  text: string;
  url: string;
  selectedText?: string;
  metadata?: {
    title?: string;
    description?: string;
    tags?: string[];
  };
}

export interface AIQueryRequest {
  question: string;
  context: {
    url: string;
    title?: string;
    content?: string;
    selectedText?: string;
  };
}

export interface SavePageRequest {
  url: string;
  title: string;
  content: string;
  metadata?: {
    description?: string;
    categories?: string[];
    tags?: string[];
  };
}

export class ContentService extends ApiService {
  constructor(config: ApiConfig) {
    super(config);
  }

  // Comments
  async createComment(commentData: CreateCommentRequest): Promise<Comment> {
    const response = await this.post<Comment>('/comments', commentData);
    return response.data;
  }

  async getComments(url: string): Promise<Comment[]> {
    const response = await this.get<Comment[]>(`/comments?url=${encodeURIComponent(url)}`);
    return response.data;
  }

  async deleteComment(commentId: number): Promise<void> {
    await this.delete(`/comments/${commentId}`);
  }

  // AI Assistant
  async queryAI(queryData: AIQueryRequest): Promise<AIAnswer> {
    const response = await this.post<AIAnswer>('/ai/query', queryData);
    return response.data;
  }

  async getAIHistory(): Promise<AIAnswer[]> {
    const response = await this.get<AIAnswer[]>('/ai/history');
    return response.data;
  }

  // Reading History
  async saveToHistory(pageData: SavePageRequest): Promise<HistoryItem> {
    const response = await this.post<HistoryItem>('/history', pageData);
    return response.data;
  }

  async getHistory(limit = 50): Promise<HistoryItem[]> {
    const response = await this.get<HistoryItem[]>(`/history?limit=${limit}`);
    return response.data;
  }

  async deleteFromHistory(historyId: number): Promise<void> {
    await this.delete(`/history/${historyId}`);
  }

  // Content Analysis
  async analyzeContent(url: string, content: string) {
    const response = await this.post('/analyze', { url, content });
    return response.data;
  }

  // Search
  async searchContent(query: string, filters?: {
    type?: 'comments' | 'history' | 'all';
    dateRange?: { from: Date; to: Date };
    tags?: string[];
  }) {
    const params = new URLSearchParams();
    params.append('q', query);
    
    if (filters?.type) params.append('type', filters.type);
    if (filters?.dateRange) {
      params.append('from', filters.dateRange.from.toISOString());
      params.append('to', filters.dateRange.to.toISOString());
    }
    if (filters?.tags) {
      filters.tags.forEach(tag => params.append('tags', tag));
    }

    const response = await this.get(`/search?${params.toString()}`);
    return response.data;
  }
}
