import React, { useState } from 'react';
import { useApp } from '../context';
import { LoadingSpinner } from '@extension/ui';
import WelcomePage from './WelcomePage';
import SidePanelRefactored from '../SidePanelRefactored';
import { philonetAuthStorage } from '../storage/auth-storage';

const AuthenticatedSidePanel: React.FC = () => {
  const { isAuthenticated, isLoading, user, dispatch } = useApp();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  console.log('AuthenticatedSidePanel render:', { 
    isAuthenticated, 
    isLoading, 
    user, 
    isAuthenticating 
  });

  // Handle Google authentication from welcome page
  const handleGoogleAuth = async () => {
    try {
      console.log('Starting Google authentication...');
      setIsAuthenticating(true);

      // Check if we're in a Chrome extension context
      if (typeof chrome !== 'undefined' && chrome.identity) {
        console.log('Chrome identity API available');
        
        // Use Chrome's built-in OAuth flow for extensions
        const token = await new Promise<string>((resolve, reject) => {
          console.log('Calling chrome.identity.getAuthToken...');
          chrome.identity.getAuthToken({ 
            interactive: true
          }, (result) => {
            console.log('getAuthToken result:', result);
            if (chrome.runtime.lastError) {
              console.error('Chrome runtime error:', chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message));
            } else if (typeof result === 'string') {
              resolve(result);
            } else if (result && typeof result === 'object' && 'token' in result && result.token) {
              resolve(result.token);
            } else {
              reject(new Error('No token received from Google'));
            }
          });
        });

        console.log('Received Google token:', token);

        // Exchange token for user info with your backend
        
        const apiUrl = process.env.CEB_API_URL || 'http://localhost:3000';
                  console.log('Using API URL:', apiUrl);

        const response = await fetch(`${apiUrl}/v1/auth/extension`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            token: token
          })
        });

        if (!response.ok) {
          throw new Error(`Authentication failed: ${response.status}`);
        }

        const authData = await response.json();
        
        console.log('Auth response:', authData);
        
        // Store token and user data in extension storage
        await philonetAuthStorage.setAuth(authData.accessToken, {
          id: authData.user.user_id,
          email: authData.user.email,
          name: authData.user.name,
          displayName: authData.user.display_name,
          avatar: authData.user.display_pic || authData.user.picture,
          subscribed: authData.user.subscribed,
          trial: authData.user.trial,
          pro: authData.user.pro,
          private: authData.user.private,
          modelName: authData.user.model_name
        });

        // Update app context with the user data
        dispatch({ 
          type: 'SET_USER', 
          payload: {
            id: authData.user.user_id,
            email: authData.user.email,
            name: authData.user.name,
            displayName: authData.user.display_name,
            avatar: authData.user.display_pic || authData.user.picture,
            subscribed: authData.user.subscribed,
            trial: authData.user.trial,
            pro: authData.user.pro,
            private: authData.user.private,
            modelName: authData.user.model_name
          }
        });
      } else {
        throw new Error('Google authentication is only available in the Chrome extension');
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      
      // Provide more specific error messages for common OAuth issues
      let errorMessage = 'Google authentication failed. Please try again.';
      
      if (error instanceof Error) {
        const errorText = error.message.toLowerCase();
        
        if (errorText.includes('bad client id') || errorText.includes('invalid client')) {
          errorMessage = 'Google OAuth configuration error. The client ID is invalid or expired. Please contact support or check the extension configuration.';
        } else if (errorText.includes('oauth2 request failed')) {
          errorMessage = 'Google OAuth service error. Please check your internet connection and try again.';
        } else if (errorText.includes('user denied')) {
          errorMessage = 'Google authentication was cancelled. Please try again and allow access to continue.';
        } else {
          errorMessage = error.message;
        }
      }
      
      console.error(`Authentication failed: ${errorMessage}`);
      // Authentication failed - user can try again
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="w-full h-screen bg-black flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  // Show welcome page if not authenticated
  if (!isAuthenticated) {
    console.log('Showing welcome page');
    return (
      <WelcomePage 
        onAuthClick={handleGoogleAuth}
        isAuthenticating={isAuthenticating}
      />
    );
  }

  // Show the main side panel when authenticated
  return (
    <SidePanelRefactored 
      user={user}
      onAuth={() => {}}
      onLogout={() => {}}
      apiConfig={null}
    />
  );
};

export default AuthenticatedSidePanel;
