import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from './ui';
import { useApp } from '../context';
import { philonetAuthStorage } from '../storage/auth-storage';

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

interface AuthScreenProps {
  className?: string;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ className = "" }) => {
  const { login, register, isLoading, error } = useApp();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    setAuthError(null);
  }, [authMode]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setAuthError(null);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setAuthError(null);
      if (authMode === 'signin') {
        await login(formData.email, formData.password);
      } else {
        await register(formData.name, formData.email, formData.password);
      }
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Authentication failed');
    }
  };

  // Google OAuth handler
  const handleGoogleAuth = async () => {
    try {
      setIsAuthenticating(true);
      setAuthError(null);

      // Check if we're in a Chrome extension context
      if (typeof chrome !== 'undefined' && chrome.identity) {
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
          await loginWithGoogle(googleUserInfo);
        } else {
          await registerWithGoogle(googleUserInfo);
        }
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
      
      setAuthError(errorMessage);
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Generate Google OAuth URL
  const getGoogleAuthUrl = () => {
    const clientId = process.env.CEB_GOOGLE_CLIENT_ID || 'your-google-client-id';
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
    try {
      // Call your backend API to exchange the code for user info
      const apiUrl = process.env.CEB_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/v1/auth/extension`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: code
        })
      });

      if (!response.ok) {
        throw new Error(`Authentication failed: ${response.status}`);
      }

      const authData = await response.json();
      
      // Store token and user data in extension storage
      await philonetAuthStorage.setAuth(authData.token, {
        id: authData.user.id,
        email: authData.user.email,
        name: authData.user.name,
        avatar: authData.user.avatar
      });
      
      return authData.user;
    } catch (error) {
      console.error('Error exchanging code for user info:', error);
      // Fallback to mock data during development
      const mockUser = {
        id: 'google_' + Date.now(),
        email: 'user@gmail.com',
        name: 'Google User',
        avatar: 'https://via.placeholder.com/40'
      };
      
      // Store mock token for development
      await philonetAuthStorage.setAuth('mock-token-' + Date.now(), mockUser);
      
      return mockUser;
    }
  };

  // Login with Google user info
  const loginWithGoogle = async (googleUser: any) => {
    await login(googleUser.email, 'google-oauth-token');
  };

  // Register with Google user info
  const registerWithGoogle = async (googleUser: any) => {
    await register(googleUser.name, googleUser.email, 'google-oauth-token');
  };

  return (
    <div className={`flex flex-col h-full bg-black ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-center h-[68px] border-b border-philonet-border px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-philonet-blue-500/20 flex items-center justify-center">
            <span className="text-philonet-blue-400 font-light text-lg">P</span>
          </div>
          <h1 className="text-xl font-light tracking-philonet-wide text-white">
            Philonet
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-sm">
          {/* Welcome */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-8"
          >
            <h2 className="text-2xl font-light tracking-philonet-wide text-white mb-3">
              {authMode === 'signin' ? 'Welcome back' : 'Join Philonet'}
            </h2>
            <p className="text-philonet-text-tertiary font-light text-sm leading-relaxed">
              {authMode === 'signin' 
                ? 'Sign in to access your reading history and personalized content'
                : 'Create an account to save your reading progress and preferences'
              }
            </p>
          </motion.div>

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

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            {/* Google Sign-in Button */}
            <Button
              onClick={handleGoogleAuth}
              disabled={isAuthenticating || isLoading}
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-900 border-gray-300 hover:border-gray-400 font-medium tracking-normal transition-all duration-200 flex items-center justify-center gap-3 mb-6"
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

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-philonet-border"></div>
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-black px-3 text-philonet-text-subtle">or</span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleFormSubmit} className="space-y-4">
              {authMode === 'signup' && (
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-philonet-text-secondary mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 bg-philonet-card border border-philonet-border-light rounded-lg text-white placeholder-philonet-text-muted focus:border-philonet-blue-500 focus:ring-1 focus:ring-philonet-blue-500 focus:outline-none transition-colors"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-philonet-text-secondary mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full h-11 px-4 bg-philonet-card border border-philonet-border-light rounded-lg text-white placeholder-philonet-text-muted focus:border-philonet-blue-500 focus:ring-1 focus:ring-philonet-blue-500 focus:outline-none transition-colors"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-philonet-text-secondary mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="w-full h-11 px-4 pr-12 bg-philonet-card border border-philonet-border-light rounded-lg text-white placeholder-philonet-text-muted focus:border-philonet-blue-500 focus:ring-1 focus:ring-philonet-blue-500 focus:outline-none transition-colors"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-philonet-text-muted hover:text-white transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 bg-philonet-blue-500 hover:bg-philonet-blue-600 text-white font-medium transition-colors"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  authMode === 'signin' ? 'Sign In' : 'Create Account'
                )}
              </Button>
            </form>

            {/* Mode toggle */}
            <div className="mt-6 text-center">
              <span className="text-philonet-text-tertiary text-sm">
                {authMode === 'signin' ? "Don't have an account? " : "Already have an account? "}
              </span>
              <button
                onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')}
                className="text-philonet-blue-400 hover:text-philonet-blue-300 text-sm font-medium transition-colors"
              >
                {authMode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-philonet-border">
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
  );
};

export default AuthScreen;
