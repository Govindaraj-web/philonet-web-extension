import React from 'react';
import { createRoot } from 'react-dom/client';
import { AppProvider } from './context';
import SidePanelRefactored from './SidePanelRefactored';

import './index.css';

console.log('🚀 Side panel index.tsx loading...');

const init = () => {
  console.log('🔍 Looking for #app-container...');
  const appContainer = document.querySelector('#app-container');
  if (!appContainer) {
    console.error('❌ Cannot find #app-container element!');
    throw new Error('Can not find #app-container');
  }
  console.log('✅ Found #app-container:', appContainer);
  
  console.log('🌱 Creating React root...');
  const root = createRoot(appContainer);
  
  // API configuration for the side panel
  const apiConfig = {
    baseUrl: process.env.REACT_APP_API_URL || 'https://api.philonet.app',
    timeout: 10000
  };
  
  console.log('🎨 Rendering SidePanel component...');
  root.render(
    <React.StrictMode>
      <AppProvider defaultApiConfig={apiConfig}>
        <SidePanelRefactored />
      </AppProvider>
    </React.StrictMode>
  );
  console.log('✅ SidePanel rendered successfully!');
};

console.log('📋 DOM ready state:', document.readyState);
init();
