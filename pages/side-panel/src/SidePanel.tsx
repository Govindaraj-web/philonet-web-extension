import React from "react";
import { AppProvider } from './context';
import AuthenticatedSidePanel from './components/AuthenticatedSidePanel';
import { withErrorBoundary, withSuspense } from '@extension/shared';
import { ErrorDisplay, LoadingSpinner } from '@extension/ui';

// Main SidePanel component with Google authentication integrated
const SidePanel: React.FC = () => {
  const apiConfig = {
    baseUrl: process.env.CEB_API_URL || 'http://localhost:3000',
    timeout: 10000
  };

  return (
    <AppProvider defaultApiConfig={apiConfig}>
      <AuthenticatedSidePanel />
    </AppProvider>
  );
};

export default withErrorBoundary(withSuspense(SidePanel, <LoadingSpinner />), ErrorDisplay);

// Note: This SidePanel includes the complete modular architecture with:
// ✅ Google OAuth authentication integration
// ✅ Modular components for easy maintenance
// ✅ Custom hooks for reusable logic  
// ✅ Service layer ready for API integration
// ✅ Context providers for global state
// ✅ TypeScript types for better development experience
// ✅ Utility functions for common operations
// ✅ Authentication and user management
// ✅ Extensible architecture for future features
//
// ⚠️ IMPORTANT: Google authentication requires Chrome extension environment
// The Google OAuth flow uses chrome.identity API which is only available in Chrome extensions.
// Users can sign in with Google by clicking on the user icon/name in the top left.
// Outside of Chrome extension context, Google auth will show an appropriate error message.
