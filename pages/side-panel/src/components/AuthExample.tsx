import React from 'react';
import { motion } from 'framer-motion';
import { UserRound, Shield, Zap, Globe } from 'lucide-react';
import { useApp } from '../context';
import { Button } from '../components/ui';

/**
 * Example component demonstrating Google Authentication integration
 * This shows how developers can use the authentication system in their own components
 */
const AuthExample: React.FC = () => {
  const { user, isAuthenticated, isLoading, error, login, logout } = useApp();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-2 border-philonet-blue-500 border-t-transparent rounded-full" />
        <span className="ml-3 text-philonet-text-secondary">Loading...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-lg">
        <p className="text-red-400">Authentication Error: {error}</p>
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-philonet-card border border-philonet-border rounded-lg"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-philonet-blue-500/30">
            {user.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-philonet-blue-500/20 flex items-center justify-center">
                <UserRound className="w-6 h-6 text-philonet-blue-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <h3 className="text-lg font-medium text-white mb-1">{user.name}</h3>
            <p className="text-philonet-text-secondary text-sm mb-4">{user.email}</p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
              <div className="flex items-center gap-2 text-philonet-text-tertiary text-sm">
                <Shield className="w-4 h-4 text-green-400" />
                <span>Verified Account</span>
              </div>
              <div className="flex items-center gap-2 text-philonet-text-tertiary text-sm">
                <Zap className="w-4 h-4 text-philonet-blue-400" />
                <span>Premium Features</span>
              </div>
              <div className="flex items-center gap-2 text-philonet-text-tertiary text-sm">
                <Globe className="w-4 h-4 text-philonet-blue-400" />
                <span>Sync Enabled</span>
              </div>
            </div>
            
            <Button
              onClick={logout}
              className="px-4 py-2 bg-transparent border border-philonet-border-light hover:border-red-500/60 hover:bg-red-500/10 text-philonet-text-primary hover:text-red-400 transition-all"
            >
              Sign Out
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-6 border border-philonet-border rounded-lg text-center"
    >
      <div className="w-16 h-16 rounded-full bg-philonet-card border border-philonet-border-light mx-auto mb-4 flex items-center justify-center">
        <UserRound className="w-8 h-8 text-philonet-text-muted" />
      </div>
      
      <h3 className="text-xl font-light text-white mb-2">Welcome to Philonet</h3>
      <p className="text-philonet-text-secondary mb-6">
        Sign in to access personalized reading features, sync your progress across devices, and join the community.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-philonet-blue-500/20 mx-auto mb-2 flex items-center justify-center">
            <Shield className="w-5 h-5 text-philonet-blue-400" />
          </div>
          <p className="text-sm text-philonet-text-tertiary">Secure Authentication</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-philonet-blue-500/20 mx-auto mb-2 flex items-center justify-center">
            <Zap className="w-5 h-5 text-philonet-blue-400" />
          </div>
          <p className="text-sm text-philonet-text-tertiary">Enhanced Features</p>
        </div>
        <div className="text-center">
          <div className="w-10 h-10 rounded-full bg-philonet-blue-500/20 mx-auto mb-2 flex items-center justify-center">
            <Globe className="w-5 h-5 text-philonet-blue-400" />
          </div>
          <p className="text-sm text-philonet-text-tertiary">Cross-device Sync</p>
        </div>
      </div>
      
      <p className="text-philonet-text-subtle text-sm">
        Click on your profile in the top bar to get started.
      </p>
    </motion.div>
  );
};

export default AuthExample;
