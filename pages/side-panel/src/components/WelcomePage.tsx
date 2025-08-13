import React from 'react';
import { motion } from 'framer-motion';
import { Button } from './ui';

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

interface WelcomePageProps {
  onAuthClick: () => void;
  isAuthenticating?: boolean;
}

const WelcomePage: React.FC<WelcomePageProps> = ({ 
  onAuthClick, 
  isAuthenticating = false 
}) => {
  return (
    <div className="flex flex-col min-h-screen w-full bg-black">
      {/* Header */}
      <div className="flex items-center justify-center h-[68px] border-b border-philonet-border px-6 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6">
            <img 
              src="philonet.png" 
              alt="Philonet" 
              className="w-full h-full object-contain opacity-80"
            />
          </div>
          <h1 className="text-lg font-light tracking-philonet-wide text-philonet-text-secondary">
            Philonet
          </h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-6 overflow-y-auto min-h-0">
        <div className="w-full max-w-sm text-center space-y-6">
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <div className="w-20 h-20 mx-auto">
              <img 
                src={chrome.runtime.getURL('philonet.png')} 
                alt="Philonet Logo" 
                className="w-full h-full object-contain"
              />
            </div>
          </motion.div>

          {/* Welcome Text */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <h2 className="text-xl font-light tracking-philonet-wide text-white mb-3">
              Welcome to Philonet
            </h2>
            <p className="text-philonet-text-secondary font-light text-sm leading-relaxed">
              Your thinking layer over the internet — capture sparks as you browse, share ideas, and connect with like-minded people while learning what matters to you.
            </p>
          </motion.div>

          {/* Features */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="space-y-3"
          >
            <div className="text-left space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-philonet-blue-400 mt-1.5 flex-shrink-0"></div>
                <p className="text-philonet-text-tertiary text-xs leading-relaxed">
                  <span className="text-philonet-text-secondary font-medium">Spark Anywhere</span> — Share moments and ideas as you explore the web
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-philonet-blue-400 mt-1.5 flex-shrink-0"></div>
                <p className="text-philonet-text-tertiary text-xs leading-relaxed">
                  <span className="text-philonet-text-secondary font-medium">Only What Matters</span> — A feed shaped by your interests
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-philonet-blue-400 mt-1.5 flex-shrink-0"></div>
                <p className="text-philonet-text-tertiary text-xs leading-relaxed">
                  <span className="text-philonet-text-secondary font-medium">Better Learning</span> — Turn discoveries into lasting knowledge
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-philonet-blue-400 mt-1.5 flex-shrink-0"></div>
                <p className="text-philonet-text-tertiary text-xs leading-relaxed">
                  <span className="text-philonet-text-secondary font-medium">Real Connections</span> — Engage with communities that inspire you
                </p>
              </div>
            </div>
          </motion.div>

          {/* Get Started Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
            className="space-y-3"
          >
            <button
              onClick={onAuthClick}
              disabled={isAuthenticating}
              className="w-full h-10 bg-white hover:bg-gray-50 text-gray-900 border border-gray-300 hover:border-gray-400 font-medium tracking-normal transition-all duration-200 flex items-center justify-center gap-3 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthenticating ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-600 border-t-transparent" />
              ) : (
                <GoogleIcon className="h-4 w-4" />
              )}
              <span className="text-sm">
                {isAuthenticating 
                  ? 'Setting up your account...' 
                  : 'Continue with Google'
                }
              </span>
            </button>
            
            <p className="text-philonet-text-subtle text-xs leading-relaxed">
              Sign in to save your progress and unlock personalized features
            </p>
          </motion.div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-3 border-t border-philonet-border flex-shrink-0">
        <p className="text-philonet-text-subtle text-xs leading-relaxed text-center">
          By continuing, you agree to our{' '}
          <a 
            href="#" 
            className="text-philonet-blue-400 hover:text-philonet-blue-300 transition-colors underline"
            onClick={(e) => e.preventDefault()}
          >
            Terms
          </a>
          {' '}and{' '}
          <a 
            href="#" 
            className="text-philonet-blue-400 hover:text-philonet-blue-300 transition-colors underline"
            onClick={(e) => e.preventDefault()}
          >
            Privacy Policy
          </a>
        </p>
      </div>
    </div>
  );
};

export default WelcomePage;
