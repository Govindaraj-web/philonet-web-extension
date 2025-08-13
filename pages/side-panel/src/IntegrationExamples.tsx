// Integration Example: How to use the modular Philonet Side Panel

import React from 'react';
import { AppProvider, useApp } from './context';
import SidePanelRefactored from './SidePanelRefactored';

// Example 1: Basic usage with default configuration
export const BasicExample = () => {
  return (
    <AppProvider>
      <SidePanelRefactored />
    </AppProvider>
  );
};

// Example 2: With custom API configuration
export const CustomApiExample = () => {
  const apiConfig = {
    baseUrl: 'https://your-api.example.com',
    apiKey: 'your-api-key-here',
    timeout: 15000
  };

  return (
    <AppProvider defaultApiConfig={apiConfig}>
      <SidePanelRefactored />
    </AppProvider>
  );
};

// Example 3: With authentication integration
const AuthenticatedSidePanel = () => {
  const { user, isAuthenticated, login, logout } = useApp();

  const handleLogin = async () => {
    try {
      await login('user@example.com', 'password123');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <SidePanelRefactored
      user={user || undefined}
      onAuth={handleLogin}
      onLogout={logout}
    />
  );
};

export const AuthenticatedExample = () => {
  const apiConfig = {
    baseUrl: process.env.REACT_APP_API_URL || 'https://api.philonet.app',
    apiKey: process.env.REACT_APP_API_KEY
  };

  return (
    <AppProvider defaultApiConfig={apiConfig}>
      <AuthenticatedSidePanel />
    </AppProvider>
  );
};

// Example 4: Environment-aware configuration
export const ProductionExample = () => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  const apiConfig = {
    baseUrl: isDevelopment 
      ? 'http://localhost:3001/api' 
      : 'https://api.philonet.app',
    timeout: isDevelopment ? 30000 : 10000,
    ...(isDevelopment && { apiKey: 'dev-key' })
  };

  return (
    <AppProvider defaultApiConfig={apiConfig}>
      <SidePanelRefactored />
    </AppProvider>
  );
};

// Example 5: Extension integration (for browser extension context)
export const ExtensionExample = () => {
  // In a browser extension, you might want to get configuration from extension storage
  React.useEffect(() => {
    const initializeExtension = async () => {
      if (typeof chrome !== 'undefined' && chrome.storage) {
        // Get user preferences from extension storage
        const result = await chrome.storage.local.get(['userPreferences', 'apiConfig']);
        console.log('Extension preferences:', result);
      }
    };

    initializeExtension();
  }, []);

  return (
    <AppProvider>
      <SidePanelRefactored />
    </AppProvider>
  );
};

// How to use in your main app:
/*
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BasicExample } from './IntegrationExamples';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<BasicExample />);
*/
