import { ApiService, ApiConfig } from './ApiService';
import { Comment, AIAnswer } from '../types';

export interface User {
  id: string;
  name: string;
  email: string;
  displayName?: string;
  avatar?: string;
  subscribed?: boolean;
  trial?: boolean;
  pro?: boolean;
  private?: boolean;
  modelName?: string;
  preferences?: {
    theme?: 'light' | 'dark' | 'auto';
    speechSettings?: {
      rate: number;
      pitch: number;
      volume: number;
      voice?: string;
    };
  };
}

export interface AuthResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export class AuthService extends ApiService {
  constructor(config: ApiConfig) {
    super(config);
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>('/auth/login', credentials);
    
    // Store tokens in extension storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({
        authToken: response.data.token,
        refreshToken: response.data.refreshToken,
        user: response.data.user
      });
    }
    
    return response.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.post<AuthResponse>('/auth/register', userData);
    
    // Store tokens in extension storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({
        authToken: response.data.token,
        refreshToken: response.data.refreshToken,
        user: response.data.user
      });
    }
    
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      await this.post('/auth/logout');
    } finally {
      // Clear tokens from extension storage
      if (typeof chrome !== 'undefined' && chrome.storage) {
        await chrome.storage.local.remove(['authToken', 'refreshToken', 'user']);
      }
    }
  }

  async refreshToken(): Promise<AuthResponse> {
    let refreshToken = '';
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['refreshToken']);
      refreshToken = result.refreshToken;
    }

    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.post<AuthResponse>('/auth/refresh', { 
      refreshToken 
    });
    
    // Update stored tokens
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({
        authToken: response.data.token,
        refreshToken: response.data.refreshToken,
        user: response.data.user
      });
    }
    
    return response.data;
  }

  async getCurrentUser(): Promise<User | null> {
    try {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        const result = await chrome.storage.local.get(['user']);
        return result.user || null;
      }
      return null;
    } catch (error) {
      console.error('Failed to get current user:', error);
      return null;
    }
  }

  async updateUserPreferences(preferences: User['preferences']): Promise<User> {
    const response = await this.put<User>('/user/preferences', preferences);
    
    // Update stored user data
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get(['user']);
      const updatedUser = { ...result.user, preferences: response.data.preferences };
      await chrome.storage.local.set({ user: updatedUser });
    }
    
    return response.data;
  }
}
