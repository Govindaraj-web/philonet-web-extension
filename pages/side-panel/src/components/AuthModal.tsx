import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { UserRound, LogOut } from 'lucide-react';
import { Button } from './ui';
import { useApp } from '../context';
import GoogleAuth from './GoogleAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
}

const AuthModal: React.FC<AuthModalProps> = ({ 
  isOpen, 
  onClose, 
  initialMode = 'signin' 
}) => {
  const { user, isAuthenticated, logout } = useApp();
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode);

  // If user is authenticated, show user profile instead
  if (isAuthenticated && user) {
    return (
      <AnimatePresence>
        {isOpen && (
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
              {/* User Profile */}
              <div className="px-6 py-8">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 rounded-full bg-philonet-card border border-philonet-border-light mx-auto mb-4 flex items-center justify-center overflow-hidden">
                    {user.avatar ? (
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <UserRound className="h-8 w-8 text-philonet-text-muted" />
                    )}
                  </div>
                  <h2 className="text-xl font-light tracking-philonet-wide text-white mb-1">
                    {user.name}
                  </h2>
                  <p className="text-philonet-text-tertiary text-sm">
                    {user.email}
                  </p>
                </div>

                {/* User actions */}
                <div className="space-y-3">
                  <Button
                    onClick={() => {
                      logout();
                      onClose();
                    }}
                    className="w-full h-11 bg-transparent border-philonet-border-light hover:border-red-500/60 hover:bg-red-500/10 text-white hover:text-red-400 transition-all duration-200 flex items-center justify-center gap-3"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Sign out</span>
                  </Button>
                  
                  <Button
                    onClick={onClose}
                    className="w-full h-11 bg-philonet-card hover:bg-philonet-card/80 border-philonet-border-light hover:border-philonet-blue-500/60 text-philonet-text-primary hover:text-white transition-all duration-200"
                  >
                    Continue reading
                  </Button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

  // Show Google Auth modal for unauthenticated users
  return (
    <GoogleAuth
      isOpen={isOpen}
      onClose={onClose}
      mode={authMode}
      onModeChange={setAuthMode}
    />
  );
};

export default AuthModal;
