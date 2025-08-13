export interface AuthState {
  token: string | null;
  user: {
    id: string;
    email: string;
    name: string;
    displayName?: string;
    avatar?: string;
    subscribed?: boolean;
    trial?: boolean;
    pro?: boolean;
    private?: boolean;
    modelName?: string;
  } | null;
  isAuthenticated: boolean;
}

const STORAGE_KEY = 'philonet-auth-storage';

export const philonetAuthStorage = {
  // Get current auth state
  get: async (): Promise<AuthState> => {
    if (typeof chrome !== 'undefined' && chrome.storage) {
      const result = await chrome.storage.local.get([STORAGE_KEY]);
      return result[STORAGE_KEY] || {
        token: null,
        user: null,
        isAuthenticated: false,
      };
    }
    return {
      token: null,
      user: null,
      isAuthenticated: false,
    };
  },
  
  // Set user and token after successful authentication
  setAuth: async (token: string, user: AuthState['user']) => {
    const authState: AuthState = {
      token,
      user,
      isAuthenticated: true,
    };
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [STORAGE_KEY]: authState });
    }
  },
  
  // Clear auth data on logout
  clearAuth: async () => {
    const authState: AuthState = {
      token: null,
      user: null,
      isAuthenticated: false,
    };
    
    if (typeof chrome !== 'undefined' && chrome.storage) {
      await chrome.storage.local.set({ [STORAGE_KEY]: authState });
    }
  },
  
  // Get current token
  getToken: async (): Promise<string | null> => {
    const state = await philonetAuthStorage.get();
    return state.token;
  },
  
  // Check if user is authenticated
  isLoggedIn: async (): Promise<boolean> => {
    const state = await philonetAuthStorage.get();
    return state.isAuthenticated && state.token !== null;
  },
};
