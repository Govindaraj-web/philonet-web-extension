import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, X } from 'lucide-react';
import { Button } from './ui';
import { useApp } from '../context';

// Google Icon SVG component
const GoogleIcon = ({ className = "w-5 h-5" }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none">
    <path 
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" 
      fill="#4285F4"
    />
    <path 
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" 
      fill="#34A853"
    />
    <path 
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" 
      fill="#FBBC05"
    />
    <path 
      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" 
      fill="#EA4335"
    />
  </svg>
);

interface GoogleAuthProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: 'signin' | 'signup';
  onModeChange?: (mode: 'signin' | 'signup') => void;
}

const GoogleAuth: React.FC<GoogleAuthProps> = ({ 
  isOpen, 
  onClose, 
  mode = 'signin',
  onModeChange 
}) => {
  const { login, register, isLoading, error } = useApp();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(mode);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAuthError(null);
      setAuthMode(mode);
    }
  }, [isOpen, mode]);

  // Handle mode changes
  const handleModeChange = (newMode: 'signin' | 'signup') => {
    setAuthMode(newMode);
    setAuthError(null);
    onModeChange?.(newMode);
  };

  // Google OAuth handler
  const handleGoogleAuth = async () => {
    try {
      setIsAuthenticating(true);
      setAuthError(null);

      // Check if we're in a Chrome extension context
      if (typeof chrome !== 'undefined' && chrome.identity) {
        // Use Chrome Identity API for OAuth
        const authUrl = getGoogleAuthUrl();
        
        const redirectUrl = await new Promise<string>((resolve, reject) => {
          chrome.identity.launchWebAuthFlow({
            url: authUrl,
            interactive: true
          }, (responseUrl) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else if (responseUrl) {
              resolve(responseUrl);
            } else {
              reject(new Error('No response URL received'));
            }
          });
        });

        // Extract authorization code from the redirect URL
        const url = new URL(redirectUrl);
        const code = url.searchParams.get('code');
        
        if (!code) {
          throw new Error('No authorization code received from Google');
        }

        // Exchange code for tokens and user info
        const googleUserInfo = await exchangeCodeForUserInfo(code);
        
        if (authMode === 'signin') {
          // For sign-in, we'll use the existing login method but with Google credentials
          // This would typically involve sending the Google token to your backend
          await loginWithGoogle(googleUserInfo);
        } else {
          // For sign-up, register the user with Google info
          await registerWithGoogle(googleUserInfo);
        }

        onClose();
      } else {
        // Fallback for non-extension environments
        throw new Error('Google authentication is only available in the Chrome extension');
      }
    } catch (error) {
      console.error('Google authentication error:', error);
      setAuthError(
        error instanceof Error 
          ? error.message 
          : 'Google authentication failed. Please try again.'
      );
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Generate Google OAuth URL
  const getGoogleAuthUrl = () => {
    const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID || 'your-google-client-id';
    const redirectUri = chrome?.identity?.getRedirectURL?.() || 'https://your-extension-id.chromiumapp.org/';
    const scope = 'openid email profile';
    
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scope,
      access_type: 'offline',
      prompt: 'consent'
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  };

  // Exchange authorization code for user info
  const exchangeCodeForUserInfo = async (code: string) => {
    // This would typically be handled by your backend API
    // For demo purposes, we'll simulate the user info
    return {
      id: 'google_' + Date.now(),
      email: 'user@gmail.com',
      name: 'Google User',
      avatar: 'https://via.placeholder.com/40'
    };
  };

  // Login with Google user info
  const loginWithGoogle = async (googleUser: any) => {
    // In a real implementation, you'd send the Google token to your backend
    // which would verify it and return your app's auth token
    
    // For demo, we'll use the existing login method
    // Your backend would handle Google token verification
    await login(googleUser.email, 'google-oauth-token');
  };

  // Register with Google user info
  const registerWithGoogle = async (googleUser: any) => {
    // In a real implementation, you'd send the Google token to your backend
    // which would create a new user account
    
    // For demo, we'll use the existing register method
    await register(googleUser.name, googleUser.email, 'google-oauth-token');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          transition={{ duration: 0.2, ease: "easeOut" }}
          className="relative w-full max-w-md bg-philonet-panel border border-philonet-border rounded-philonet-lg shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full hover:bg-philonet-card/60 transition-colors text-philonet-text-muted hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Header */}
          <div className="px-6 pt-8 pb-6 text-center border-b border-philonet-border">
            <div className="w-16 h-16 rounded-full bg-philonet-card border border-philonet-border-light mx-auto mb-4 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full bg-philonet-blue-500/20 flex items-center justify-center">
                <span className="text-philonet-blue-400 font-light text-lg">P</span>
              </div>
            </div>
            <h2 className="text-2xl font-light tracking-philonet-wide text-white mb-2">
              {authMode === 'signin' ? 'Welcome back' : 'Join Philonet'}
            </h2>
            <p className="text-philonet-text-tertiary font-light">
              {authMode === 'signin' 
                ? 'Sign in to access your reading history and preferences'
                : 'Create an account to save your reading progress'
              }
            </p>
          </div>

          {/* Auth content */}
          <div className="px-6 py-8">
            {/* Error message */}
            {(authError || error) && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm"
              >
                {authError || error}
              </motion.div>
            )}

            {/* Google Sign-in Button */}
            <Button
              onClick={handleGoogleAuth}
              disabled={isAuthenticating || isLoading}
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border-gray-300 hover:border-gray-400 font-medium tracking-normal transition-all duration-200 flex items-center justify-center gap-3"
            >
              {isAuthenticating ? (
                <Loader2 className="h-5 w-5 animate-spin text-gray-600" />
              ) : (
                <GoogleIcon className="h-5 w-5" />
              )}
              <span>
                {isAuthenticating 
                  ? 'Authenticating...' 
                  : `Continue with Google`
                }
              </span>
            </Button>

            {/* Mode toggle */}
            <div className="mt-6 text-center">
              <span className="text-philonet-text-tertiary text-sm">
                {authMode === 'signin' ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                onClick={() => handleModeChange(authMode === 'signin' ? 'signup' : 'signin')}
                className="text-philonet-blue-400 hover:text-philonet-blue-300 text-sm font-medium transition-colors"
              >
                {authMode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </div>

            {/* Legal text */}
            <div className="mt-6 pt-6 border-t border-philonet-border">
              <p className="text-philonet-text-subtle text-xs leading-relaxed text-center">
                By continuing, you agree to our{' '}
                <a 
                  href="#" 
                  className="text-philonet-blue-400 hover:text-philonet-blue-300 transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  Terms of Service
                </a>
                {' '}and{' '}
                <a 
                  href="#" 
                  className="text-philonet-blue-400 hover:text-philonet-blue-300 transition-colors"
                  onClick={(e) => e.preventDefault()}
                >
                  Privacy Policy
                </a>
                .
              </p>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GoogleAuth;
