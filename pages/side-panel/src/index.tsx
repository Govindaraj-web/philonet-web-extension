import React from 'react';
import { createRoot } from 'react-dom/client';
import SidePanel from './SidePanel';

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
  
  console.log('🎨 Rendering SidePanel component...');
  root.render(
    <React.StrictMode>
      <SidePanel />
    </React.StrictMode>
  );
  console.log('✅ SidePanel rendered successfully!');
};

console.log('📋 DOM ready state:', document.readyState);
init();
