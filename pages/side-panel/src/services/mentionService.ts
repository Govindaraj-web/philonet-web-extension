import { philonetAuthStorage } from '../storage/auth-storage';

export interface TaggableUser {
  user_id: string;
  name: string;
  display_name: string;
  email: string;
  avatar: string;
  username: string;
  tag: string;
  mention?: string;
  display_text?: string;
  source?: 'recent' | 'search';
}

export interface MentionSuggestion {
  user_id: string;
  name: string;
  display_name: string;
  avatar: string;
  username: string;
  mention: string;
  display_text: string;
}

export interface TaggableUsersResponse {
  success: boolean;
  users: TaggableUser[];
  total: number;
  search_term?: string;
}

export interface MentionSuggestionsResponse {
  success: boolean;
  suggestions: MentionSuggestion[];
  input: string;
  total: number;
}

class MentionService {
  private getApiUrl(endpoint: string): string {
    return `${process.env.CEB_API_URL || 'http://localhost:3000'}/v1/interactions${endpoint}`;
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const authData = await philonetAuthStorage.get();
    if (!authData?.token) {
      throw new Error('No authentication token available');
    }

    return {
      'Authorization': `Bearer ${authData.token}`,
      'Content-Type': 'application/json',
    };
  }

  async getTaggableUsers(options: {
    search?: string;
    limit?: number;
    exclude_current?: boolean;
  } = {}): Promise<TaggableUsersResponse> {
    try {
      const { search = '', limit = 10, exclude_current = true } = options;
      const params = new URLSearchParams({
        ...(search && { search }),
        limit: limit.toString(),
        exclude_current: exclude_current.toString(),
      });

      const response = await fetch(this.getApiUrl(`/taggable-users?${params}`), {
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch taggable users:', error);
      throw error;
    }
  }

  async getMentionSuggestions(options: {
    input: string;
    limit?: number;
  }): Promise<MentionSuggestionsResponse> {
    try {
      const { input, limit = 5 } = options;
      
      // Extract search term from @mention input (remove @ symbol)
      const searchTerm = input.startsWith('@') ? input.substring(1) : input;
      
      const params = new URLSearchParams({
        search: searchTerm,
        limit: limit.toString(),
        exclude_current: 'true',
      });

      const response = await fetch(this.getApiUrl(`/taggable-users?${params}`), {
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        // Fallback to mock data for development/testing
        console.warn(`API request failed (${response.status}), using mock data`);
        return this.getMockMentionSuggestions(input, limit);
      }

      const data: TaggableUsersResponse = await response.json();
      
      // Transform TaggableUsersResponse to MentionSuggestionsResponse
      const suggestions: MentionSuggestion[] = data.users.map(user => ({
        user_id: user.user_id,
        name: user.name,
        display_name: user.display_name,
        avatar: user.avatar,
        username: user.username,
        mention: user.tag || `@${user.username}`,
        display_text: user.display_name || user.name
      }));

      return {
        success: true,
        suggestions,
        input,
        total: suggestions.length
      };
    } catch (error) {
      console.error('Failed to fetch mention suggestions:', error);
      // Fallback to mock data
      return this.getMockMentionSuggestions(options.input, options.limit || 5);
    }
  }

  // Mock data for development/testing
  private getMockMentionSuggestions(input: string, limit: number): MentionSuggestionsResponse {
    const mockUsers = [
      {
        user_id: '1',
        name: 'John Doe',
        display_name: 'John Doe',
        avatar: 'https://ui-avatars.com/api/?name=J&background=4285f4&color=fff&size=200&bold=true',
        username: 'johndoe',
        mention: '@johndoe',
        display_text: 'John Doe'
      },
      {
        user_id: '2',
        name: 'Jane Smith',
        display_name: 'Jane Smith',
        avatar: 'https://ui-avatars.com/api/?name=J&background=e91e63&color=fff&size=200&bold=true',
        username: 'janesmith',
        mention: '@janesmith',
        display_text: 'Jane Smith'
      },
      {
        user_id: '3',
        name: 'Mike Johnson',
        display_name: 'Mike Johnson',
        avatar: 'https://ui-avatars.com/api/?name=M&background=ff9800&color=fff&size=200&bold=true',
        username: 'mikejohnson',
        mention: '@mikejohnson',
        display_text: 'Mike Johnson'
      }
    ];

    // Filter users based on input
    const searchTerm = input.replace('@', '').toLowerCase();
    const filtered = mockUsers.filter(user => 
      user.name.toLowerCase().includes(searchTerm) ||
      user.username.toLowerCase().includes(searchTerm)
    ).slice(0, limit);

    return {
      success: true,
      suggestions: filtered,
      input,
      total: filtered.length
    };
  }

  async getAdvancedTaggableUsers(options: {
    search?: string;
    limit?: number;
    include_recent?: boolean;
    context?: string;
  } = {}): Promise<TaggableUsersResponse> {
    try {
      const { search = '', limit = 10, include_recent = true, context = 'comment' } = options;
      const params = new URLSearchParams({
        ...(search && { search }),
        limit: limit.toString(),
        include_recent: include_recent.toString(),
        context,
      });

      const response = await fetch(this.getApiUrl(`/taggable-users-advanced?${params}`), {
        headers: await this.getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch advanced taggable users:', error);
      throw error;
    }
  }

  // Utility method to parse mentions from text
  static parseMentions(text: string): string[] {
    const mentionRegex = /@([a-zA-Z0-9_]+)/g;
    const mentions = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return mentions;
  }

  // Utility method to replace mentions in text
  static replaceMentions(text: string, replacements: { [username: string]: string }): string {
    return text.replace(/@([a-zA-Z0-9_]+)/g, (match, username) => {
      return replacements[username] || match;
    });
  }

  // Utility method to extract current mention being typed
  static getCurrentMention(text: string, cursorPosition: number): { mention: string; startPos: number; endPos: number } | null {
    // Find the @ symbol before cursor position
    let startPos = -1;
    for (let i = cursorPosition - 1; i >= 0; i--) {
      if (text[i] === '@') {
        startPos = i;
        break;
      }
      if (text[i] === ' ' || text[i] === '\n') {
        break;
      }
    }

    if (startPos === -1) return null;

    // Find the end of the mention (space, newline, or end of text)
    let endPos = cursorPosition;
    for (let i = cursorPosition; i < text.length; i++) {
      if (text[i] === ' ' || text[i] === '\n') {
        break;
      }
      endPos = i + 1;
    }

    const mention = text.substring(startPos, endPos);
    return { mention, startPos, endPos };
  }
}

export default MentionService;
