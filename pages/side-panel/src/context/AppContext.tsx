import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AuthService, ContentService, ApiConfig, User } from '../services';
import { philonetAuthStorage } from '../storage/auth-storage';

// State interface
interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  apiConfig: ApiConfig | null;
  authService: AuthService | null;
  contentService: ContentService | null;
}

// Action types
type AppAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_AUTHENTICATED'; payload: boolean }
  | { type: 'INITIALIZE_SERVICES'; payload: { apiConfig: ApiConfig; authService: AuthService; contentService: ContentService } }
  | { type: 'LOGOUT' };

// Initial state
const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
  apiConfig: null,
  authService: null,
  contentService: null,
};

// Reducer
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    
    case 'SET_USER':
      return { 
        ...state, 
        user: action.payload,
        isAuthenticated: action.payload !== null 
      };
    
    case 'SET_AUTHENTICATED':
      return { ...state, isAuthenticated: action.payload };
    
    case 'INITIALIZE_SERVICES':
      return {
        ...state,
        apiConfig: action.payload.apiConfig,
        authService: action.payload.authService,
        contentService: action.payload.contentService
      };
    
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        isAuthenticated: false
      };
    
    default:
      return state;
  }
}

// Context
interface AppContextType extends AppState {
  dispatch: React.Dispatch<AppAction>;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  initializeServices: (config: ApiConfig) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Provider props
interface AppProviderProps {
  children: ReactNode;
  defaultApiConfig?: ApiConfig;
}

// Provider component
export const AppProvider: React.FC<AppProviderProps> = ({ 
  children, 
  defaultApiConfig 
}) => {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Initialize services
  const initializeServices = (config: ApiConfig) => {
    const authService = new AuthService(config);
    const contentService = new ContentService(config);
    
    dispatch({
      type: 'INITIALIZE_SERVICES',
      payload: { apiConfig: config, authService, contentService }
    });
  };

  // Login function
  const login = async (email: string, password: string) => {
    if (!state.authService) {
      throw new Error('Auth service not initialized');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const authResponse = await state.authService.login({ email, password });
      
      // Store in our custom storage as well
      await philonetAuthStorage.setAuth(authResponse.token, {
        id: authResponse.user.id,
        email: authResponse.user.email,
        name: authResponse.user.name,
        avatar: authResponse.user.avatar
      });
      
      dispatch({ type: 'SET_USER', payload: authResponse.user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Register function
  const register = async (name: string, email: string, password: string) => {
    if (!state.authService) {
      throw new Error('Auth service not initialized');
    }

    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      dispatch({ type: 'SET_ERROR', payload: null });
      
      const authResponse = await state.authService.register({ name, email, password });
      
      // Store in our custom storage as well
      await philonetAuthStorage.setAuth(authResponse.token, {
        id: authResponse.user.id,
        email: authResponse.user.email,
        name: authResponse.user.name,
        avatar: authResponse.user.avatar
      });
      
      dispatch({ type: 'SET_USER', payload: authResponse.user });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed';
      dispatch({ type: 'SET_ERROR', payload: message });
      throw error;
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (state.authService) {
        await state.authService.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear tokens from our custom storage
      await philonetAuthStorage.clearAuth();
      dispatch({ type: 'LOGOUT' });
    }
  };

  // Initialize app on mount
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Use default config or get from extension storage
        let apiConfig = defaultApiConfig;
        
        if (!apiConfig && typeof chrome !== 'undefined' && chrome.storage) {
          const result = await chrome.storage.local.get(['apiConfig']);
          apiConfig = result.apiConfig;
        }

        // Default fallback
        if (!apiConfig) {
          apiConfig = {
            baseUrl: process.env.CEB_API_URL || 'http://localhost:3000',
            timeout: 10000
          };
        }

        initializeServices(apiConfig);

        // Check for existing authentication in our storage
        const authState = await philonetAuthStorage.get();
        console.log('Auth state from storage:', authState);
        
        if (authState.isAuthenticated && authState.token && authState.user) {
          // Convert auth storage user to app user format with all new fields
          const user: User = {
            id: authState.user.id,
            name: authState.user.name,
            email: authState.user.email,
            displayName: authState.user.displayName,
            avatar: authState.user.avatar,
            subscribed: authState.user.subscribed,
            trial: authState.user.trial,
            pro: authState.user.pro,
            private: authState.user.private,
            modelName: authState.user.modelName,
          };
          console.log('Setting user from storage:', user);
          dispatch({ type: 'SET_USER', payload: user });
        } else {
          console.log('No authenticated user found in storage');
          // Fallback: Check for existing user session from AuthService
          const authService = new AuthService(apiConfig);
          const currentUser = await authService.getCurrentUser();
          
          if (currentUser) {
            console.log('Setting user from AuthService:', currentUser);
            dispatch({ type: 'SET_USER', payload: currentUser });
          } else {
            console.log('No user found in AuthService either');
          }
        }
      } catch (error) {
        console.error('App initialization error:', error);
        dispatch({ type: 'SET_ERROR', payload: 'Failed to initialize app' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeApp();
  }, [defaultApiConfig]);

  const contextValue: AppContextType = {
    ...state,
    dispatch,
    login,
    register,
    logout,
    initializeServices,
  };

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// Hook to use app context
export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
