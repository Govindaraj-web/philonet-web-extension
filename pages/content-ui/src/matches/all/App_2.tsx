import { t } from '@extension/i18n';
import { ToggleButton } from '@extension/ui';
import { useEffect, useState } from 'react';

export default function App() {
  const [sidePanelOpen, setSidePanelOpen] = useState(false);

  useEffect(() => {
    console.log('[CEB] Content ui all loaded');
    
    // Listen for messages from background script or popup to toggle side panel
    const handleMessage = (request: any, sender: chrome.runtime.MessageSender, sendResponse: (response?: any) => void): boolean => {
      console.log('[CEB] Received message:', request);
      
      if (request?.type === 'TOGGLE_PHILONET_SIDEPANEL') {
        console.log('[CEB] Toggling side panel via message');
        toggleSidePanel();
        sendResponse({ success: true });
        return true; // Keep the message channel open for async response
      }
      
      return false; // Don't keep the message channel open for other messages
    };
    
    // Make sure we're listening for chrome extension messages
    if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
      chrome.runtime.onMessage.addListener(handleMessage);
      console.log('[CEB] Message listener added');
    } else {
      console.warn('[CEB] Chrome runtime not available');
    }
    
    // Listen for keyboard shortcut (Ctrl/Cmd + Shift + P)
    const handleKeydown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'P') {
        event.preventDefault();
        console.log('[CEB] Keyboard shortcut triggered');
        toggleSidePanel();
      }
    };
    
    document.addEventListener('keydown', handleKeydown);
    
    return () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(handleMessage);
        console.log('[CEB] Message listener removed');
      }
      document.removeEventListener('keydown', handleKeydown);
    };
  }, []);

  const toggleSidePanel = () => {
    console.log('[CEB] Toggling custom side panel...');
    setSidePanelOpen(prev => {
      const newState = !prev;
      console.log('[CEB] Side panel state changed to:', newState);
      return newState;
    });
  };

  // Shadow DOM component that renders the full Philonet side panel
  const PhilonetShadowPanel = () => {
    const [shadowContainer, setShadowContainer] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
      if (!sidePanelOpen) {
        if (shadowContainer) {
          shadowContainer.remove();
          setShadowContainer(null);
        }
        return;
      }

      // Create shadow container
      const container = document.createElement('div');
      container.style.cssText = `
        position: fixed;
        top: 0;
        right: 0;
        width: 100%;
        height: 100%;
        pointer-events: none;
        z-index: 2147483647;
      `;

      // Create shadow root for style isolation
      const shadow = container.attachShadow({ mode: 'open' });
      
      // Add Philonet CSS styles (comprehensive design system from SidePanel)
      const style = document.createElement('style');
      style.textContent = `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600&display=swap');

        /* Reset and base styles */
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        .philonet-panel {
          position: fixed;
          top: 0;
          right: 0;
          width: 400px;
          height: 100vh;
          background: #0a0a0a;
          color: rgba(255, 255, 255, 0.95);
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', 'Roboto', sans-serif;
          font-weight: 300;
          transform: translateX(0);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }

        /* Top Action Bar */
        .philonet-header {
          border-bottom: 1px solid #262626;
          background: #0a0a0a;
          padding: 0;
          flex-shrink: 0;
        }

        .philonet-action-bar {
          height: 68px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          gap: 12px;
        }

        .philonet-user-info {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex-shrink: 1;
        }

        .philonet-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid #404040;
          background: #0b0b0b;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a3a3a3;
          flex-shrink: 0;
        }

        .philonet-username {
          font-size: 14px;
          font-weight: 300;
          letter-spacing: 0.12em;
          color: rgba(255, 255, 255, 0.9);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 140px;
        }

        .philonet-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .philonet-action-btn {
          height: 36px;
          padding: 0 12px;
          border-radius: 20px;
          border: 1px solid #404040;
          background: transparent;
          color: rgba(255, 255, 255, 0.9);
          font-size: 12px;
          font-weight: 300;
          letter-spacing: 0.12em;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .philonet-action-btn:hover {
          color: #3b82f6;
          border-color: #3b82f6;
        }

        .philonet-action-btn span {
          display: none;
        }

        @media (min-width: 420px) {
          .philonet-action-btn span {
            display: inline;
          }
        }

        .philonet-close-btn {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: 1px solid #404040;
          background: transparent;
          color: #a3a3a3;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .philonet-close-btn:hover {
          background: #262626;
          color: rgba(255, 255, 255, 0.9);
          border-color: #3b82f6;
        }

        /* Content area */
        .philonet-content {
          flex: 1;
          overflow-y: auto;
          padding: 0;
        }

        .philonet-content::-webkit-scrollbar {
          width: 6px;
        }

        .philonet-content::-webkit-scrollbar-track {
          background: transparent;
        }

        .philonet-content::-webkit-scrollbar-thumb {
          background: #262626;
          border-radius: 3px;
        }

        .philonet-content::-webkit-scrollbar-thumb:hover {
          background: #404040;
        }

        /* Brand Header */
        .philonet-brand-header {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 24px;
          padding: 24px 20px 16px;
          border-bottom: 1px solid rgba(38, 38, 38, 0.3);
        }

        .philonet-brand-logo {
          width: 32px;
          height: 32px;
          object-contain: contain;
        }

        .philonet-brand-title {
          font-size: 20px;
          font-weight: 300;
          letter-spacing: 0.12em;
          color: rgba(96, 165, 250, 0.9);
          margin: 0;
        }

        .philonet-brand-subtitle {
          font-size: 12px;
          color: #a3a3a3;
          letter-spacing: 0.12em;
          margin: 0;
        }

        /* Cover Image */
        .philonet-cover-container {
          margin: 0 20px 20px;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid #262626;
        }

        .philonet-cover-image {
          width: 100%;
          height: 180px;
          object-fit: cover;
          display: block;
        }

        /* Article Header */
        .philonet-article-header {
          padding: 0 20px 24px;
        }

        .philonet-article-title {
          font-size: 28px;
          font-weight: 300;
          letter-spacing: 0.14em;
          color: rgba(255, 255, 255, 0.95);
          line-height: 1.2;
          margin: 0 0 12px 0;
        }

        @media (min-width: 768px) {
          .philonet-article-title {
            font-size: 32px;
          }
        }

        .philonet-article-description {
          font-size: 15px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 300;
          letter-spacing: 0.06em;
          max-width: 70ch;
          margin: 0 0 16px 0;
        }

        /* Meta Tags */
        .philonet-meta-tags {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          gap: 8px;
        }

        .philonet-tag-group {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          gap: 8px;
          color: #a3a3a3;
        }

        .philonet-tag {
          border-radius: 50px;
          border: 1px solid #404040;
          padding: 4px 12px;
          font-size: 12px;
          font-weight: 300;
          letter-spacing: 0.14em;
          color: #a3a3a3;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .philonet-tag:hover {
          color: #3b82f6;
          border-color: #3b82f6;
        }

        /* Article Content */
        .philonet-article-content {
          padding: 0 20px 24px;
        }

        .philonet-section {
          margin-bottom: 32px;
        }

        .philonet-section-title {
          font-size: 20px;
          font-weight: 300;
          letter-spacing: 0.12em;
          color: rgba(255, 255, 255, 0.9);
          margin: 0 0 12px 0;
        }

        .philonet-section-text {
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 300;
          letter-spacing: 0.04em;
          margin: 0;
        }

        .philonet-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .philonet-list li {
          font-size: 14px;
          line-height: 1.6;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 300;
          letter-spacing: 0.04em;
          margin-bottom: 8px;
          padding-left: 16px;
          position: relative;
        }

        .philonet-list li::before {
          content: '•';
          color: #404040;
          position: absolute;
          left: 0;
        }

        /* Table */
        .philonet-table-container {
          margin: 24px 0;
          border-radius: 20px;
          overflow: hidden;
          border: 1px solid #262626;
        }

        .philonet-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }

        .philonet-table th {
          background: #0b0b0b;
          color: rgba(255, 255, 255, 0.9);
          font-weight: 400;
          letter-spacing: 0.06em;
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #262626;
        }

        .philonet-table td {
          background: #0a0a0a;
          color: rgba(255, 255, 255, 0.85);
          font-weight: 300;
          letter-spacing: 0.04em;
          padding: 12px 16px;
          border-bottom: 1px solid #1a1a1a;
        }

        .philonet-table tr:last-child td {
          border-bottom: none;
        }

        /* Comments Section */
        .philonet-comments-section {
          margin-top: 48px;
          padding-top: 24px;
          border-top: 1px solid #262626;
        }

        .philonet-comments-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
        }

        .philonet-comments-title {
          font-size: 18px;
          font-weight: 300;
          letter-spacing: 0.14em;
          color: rgba(255, 255, 255, 0.9);
          margin: 0;
        }

        .philonet-comments-count {
          font-size: 12px;
          color: #a3a3a3;
          letter-spacing: 0.12em;
        }

        .philonet-comment {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          border-radius: 16px;
          border: 1px solid #262626;
          background: rgba(11, 11, 11, 0.6);
          transition: all 0.2s;
        }

        .philonet-comment:hover {
          border-color: #404040;
        }

        .philonet-comment-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 1px solid #404040;
          background: #0b0b0b;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a3a3a3;
          font-size: 12px;
          flex-shrink: 0;
        }

        .philonet-comment-content {
          min-width: 0;
          flex: 1;
        }

        .philonet-comment-meta {
          font-size: 12px;
          color: #737373;
          letter-spacing: 0.12em;
          margin-bottom: 4px;
        }

        .philonet-comment-tag {
          font-size: 11px;
          color: rgba(96, 165, 250, 0.9);
          margin-bottom: 4px;
        }

        .philonet-comment-text {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.85);
          line-height: 1.5;
          font-weight: 300;
          letter-spacing: 0.04em;
        }

        /* Footer Composer */
        .philonet-footer {
          border-top: 1px solid #262626;
          background: #0a0a0a;
          padding: 12px 16px;
          flex-shrink: 0;
        }

        .philonet-tabs {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .philonet-tab {
          height: 32px;
          padding: 0 12px;
          border-radius: 50px;
          border: 1px solid #404040;
          background: transparent;
          color: #a3a3a3;
          font-size: 12px;
          letter-spacing: 0.14em;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .philonet-tab:hover {
          color: rgba(255, 255, 255, 0.9);
          border-color: #3b82f6;
        }

        .philonet-tab-active {
          color: #3b82f6;
          border-color: #3b82f6;
        }

        .philonet-composer {
          margin-top: 8px;
        }

        .philonet-composer-content {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .philonet-composer-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 1px solid #404040;
          background: #0b0b0b;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #a3a3a3;
          flex-shrink: 0;
        }

        .philonet-composer-input-container {
          flex: 1;
          min-width: 0;
          position: relative;
        }

        .philonet-composer-input {
          width: 100%;
          background: #0b0b0b;
          border: 1px solid #404040;
          border-radius: 50px;
          padding: 12px 60px 12px 16px;
          color: rgba(255, 255, 255, 0.95);
          font-size: 14px;
          font-family: inherit;
          font-weight: 300;
          letter-spacing: 0.04em;
          resize: none;
          transition: all 0.2s;
        }

        .philonet-composer-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .philonet-composer-input::placeholder {
          color: #525252;
        }

        .philonet-composer-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          position: absolute;
          right: 8px;
          top: 50%;
          transform: translateY(-50%);
        }

        .philonet-composer-emoji,
        .philonet-composer-submit {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #737373;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 14px;
        }

        .philonet-composer-emoji:hover,
        .philonet-composer-submit:hover {
          color: #3b82f6;
          background: rgba(59, 130, 246, 0.1);
        }

        .philonet-composer-footer {
          display: flex;
          justify-content: flex-end;
          margin-top: 4px;
        }

        .philonet-char-count {
          font-size: 11px;
          color: #737373;
        }

        /* Animation */
        .philonet-animate-in {
          animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        /* Responsive adjustments */
        @media (min-width: 480px) {
          .philonet-panel {
            width: 420px;
          }
        }

        /* Text selection styling */
        *::selection {
          background: rgba(59, 130, 246, 0.2);
        }
      `;

      // Sample markdown content from SidePanel
      const sampleMarkdown = `# The Humane Interface of Philonet

![cover](https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=1200&q=80)

A minimalist, high-contrast reading surface with humane spacing and subtle blue affordances.

**Categories:** Design, Systems, Product
**Tags:** philonet, ui, reading, dark-mode

## Introduction
Philonet emphasizes clarity, legibility, and rhythm in digital reading experiences.

## Details
- Lightweight typography with generous scale
- Neutral grays for clear hierarchy
- Blue accents for interactive elements
- Responsive layout patterns

## Conclusion
Design for the eyes first, then optimize for everything else.

| Element   | Purpose         | Implementation |
|-----------|-----------------|----------------|
| Spacing   | Comfort         | 8px grid       |
| Contrast  | Readability     | WCAG AA        |
| Motion    | Feedback        | Subtle spring  |
`;

      // Parse the markdown content (simplified version)
      const parseMarkdown = (md: string) => {
        const lines = md.split('\n');
        let title = '', description = '', categories: string[] = [], tags: string[] = [], body = '';
        
        // Extract title
        const titleMatch = lines.find((line: string) => line.startsWith('# '));
        if (titleMatch) title = titleMatch.replace('# ', '');
        
        // Extract description (first paragraph after title)
        const descIndex = lines.findIndex((line: string) => line.trim() && !line.startsWith('#') && !line.startsWith('!') && !line.startsWith('**'));
        if (descIndex > -1) description = lines[descIndex];
        
        // Extract categories and tags
        const catMatch = lines.find((line: string) => line.startsWith('**Categories:**'));
        if (catMatch) categories = catMatch.replace('**Categories:**', '').split(',').map((c: string) => c.trim());
        
        const tagMatch = lines.find((line: string) => line.startsWith('**Tags:**'));
        if (tagMatch) tags = tagMatch.replace('**Tags:**', '').split(',').map((t: string) => t.trim());
        
        // Extract body content
        const bodyStart = lines.findIndex((line: string) => line.startsWith('## Introduction'));
        if (bodyStart > -1) body = lines.slice(bodyStart).join('\n');
        
        return { title, description, categories, tags, body };
      };
      
      const meta = parseMarkdown(sampleMarkdown);
      
      // Create the panel HTML with actual SidePanel content
      const panel = document.createElement('div');
      panel.className = 'philonet-panel philonet-animate-in';
      panel.innerHTML = `
        <!-- Top Action Bar -->
        <div class="philonet-header">
          <div class="philonet-action-bar">
            <div class="philonet-user-info">
              <div class="philonet-avatar">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <span class="philonet-username">Philonet User</span>
            </div>
            <div class="philonet-actions">
              <button class="philonet-action-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m15 5 4 4L7 21l-4 1 1-4L16 6"/>
                </svg>
                <span>Share</span>
              </button>
              <button class="philonet-action-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
                </svg>
                <span>Save</span>
              </button>
              <button class="philonet-action-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="1"/>
                  <circle cx="19" cy="12" r="1"/>
                  <circle cx="5" cy="12" r="1"/>
                </svg>
                <span>More</span>
              </button>
            </div>
            <button class="philonet-close-btn" onclick="this.dispatchEvent(new CustomEvent('close-panel', { bubbles: true }))">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="m18 6-12 12"/>
                <path d="m6 6 12 12"/>
              </svg>
            </button>
          </div>
        </div>

        <!-- Content Area -->
        <div class="philonet-content">
          <!-- Philonet Header -->
          <div class="philonet-brand-header">
            <img src="${chrome.runtime.getURL('philonet.png')}" alt="Philonet" class="philonet-brand-logo" onerror="this.style.display='none'">
            <div>
              <h1 class="philonet-brand-title">Philonet</h1>
              <p class="philonet-brand-subtitle">Knowledge Network</p>
            </div>
          </div>

          <!-- Cover Image -->
          <div class="philonet-cover-container">
            <img src="https://images.unsplash.com/photo-1526378722484-bd91ca387e72?w=1200&q=80" 
                 alt="${meta.title}" 
                 class="philonet-cover-image"
                 onerror="this.parentElement.style.display='none'">
          </div>

          <!-- Article Header -->
          <div class="philonet-article-header">
            <h2 class="philonet-article-title">${meta.title}</h2>
            <p class="philonet-article-description">${meta.description}</p>
            
            <!-- Categories & Tags -->
            <div class="philonet-meta-tags">
              ${meta.categories.length > 0 ? `
                <div class="philonet-tag-group">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                  ${meta.categories.map((cat: string) => `<span class="philonet-tag">${cat}</span>`).join('')}
                </div>
              ` : ''}
              
              ${meta.tags.length > 0 ? `
                <div class="philonet-tag-group">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 7V5C3 3.89543 3.89543 3 5 3H8.5L10 5H19C20.1046 5 21 5.89543 21 7V11"/>
                  </svg>
                  ${meta.tags.map((tag: string) => `<span class="philonet-tag">#${tag.replace(/^#/, '')}</span>`).join('')}
                </div>
              ` : ''}
            </div>
          </div>

          <!-- Article Content -->
          <div class="philonet-article-content">
            <div class="philonet-section">
              <h3 class="philonet-section-title">Introduction</h3>
              <p class="philonet-section-text">Philonet emphasizes clarity, legibility, and rhythm in digital reading experiences.</p>
            </div>

            <div class="philonet-section">
              <h3 class="philonet-section-title">Details</h3>
              <ul class="philonet-list">
                <li>Lightweight typography with generous scale</li>
                <li>Neutral grays for clear hierarchy</li>
                <li>Blue accents for interactive elements</li>
                <li>Responsive layout patterns</li>
              </ul>
            </div>

            <div class="philonet-section">
              <h3 class="philonet-section-title">Conclusion</h3>
              <p class="philonet-section-text">Design for the eyes first, then optimize for everything else.</p>
            </div>

            <!-- Implementation Table -->
            <div class="philonet-table-container">
              <table class="philonet-table">
                <thead>
                  <tr>
                    <th>Element</th>
                    <th>Purpose</th>
                    <th>Implementation</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Spacing</td>
                    <td>Comfort</td>
                    <td>8px grid</td>
                  </tr>
                  <tr>
                    <td>Contrast</td>
                    <td>Readability</td>
                    <td>WCAG AA</td>
                  </tr>
                  <tr>
                    <td>Motion</td>
                    <td>Feedback</td>
                    <td>Subtle spring</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Recent Comments -->
            <div class="philonet-comments-section">
              <div class="philonet-comments-header">
                <h4 class="philonet-comments-title">Recent Comments</h4>
                <span class="philonet-comments-count">1 comment</span>
              </div>
              <div class="philonet-comment">
                <div class="philonet-comment-avatar">Y</div>
                <div class="philonet-comment-content">
                  <div class="philonet-comment-meta">You • ${new Date().toLocaleTimeString()}</div>
                  <div class="philonet-comment-tag">Tagged excerpt: "Philonet emphasizes clarity, legibility, and rhythm"</div>
                  <div class="philonet-comment-text">Great design principles for modern reading interfaces.</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Composer Footer -->
        <div class="philonet-footer">
          <!-- Tabs -->
          <div class="philonet-tabs">
            <button class="philonet-tab philonet-tab-active" data-tab="comments">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
              Comments
            </button>
            <button class="philonet-tab" data-tab="ai">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect width="16" height="16" x="4" y="4" rx="2"/>
                <rect width="6" height="6" x="9" y="9" rx="1"/>
                <path d="m15 2 5 5m-5 0v6h6"/>
              </svg>
              Ask AI
            </button>
          </div>

          <!-- Comment Composer -->
          <div class="philonet-composer">
            <div class="philonet-composer-content">
              <div class="philonet-composer-avatar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="philonet-composer-input-container">
                <textarea 
                  class="philonet-composer-input" 
                  placeholder="Add a comment…"
                  rows="1"
                ></textarea>
                <div class="philonet-composer-actions">
                  <button class="philonet-composer-emoji">😊</button>
                  <button class="philonet-composer-submit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="m3 8 4-4 4 4"/>
                      <path d="M7 4v16"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="philonet-composer-footer">
              <span class="philonet-char-count">280 characters left</span>
            </div>
          </div>
        </div>
      `;

      // Add event listeners
      panel.addEventListener('close-panel', () => {
        setSidePanelOpen(false);
      });

      // Add interactive functionality for tabs and composer
      const commentTab = panel.querySelector('[data-tab="comments"]');
      const aiTab = panel.querySelector('[data-tab="ai"]');
      const composerInput = panel.querySelector('.philonet-composer-input');
      const submitButton = panel.querySelector('.philonet-composer-submit');
      const charCount = panel.querySelector('.philonet-char-count');

      // Tab switching
      if (commentTab && aiTab) {
        commentTab.addEventListener('click', () => {
          commentTab.classList.add('philonet-tab-active');
          aiTab.classList.remove('philonet-tab-active');
        });

        aiTab.addEventListener('click', () => {
          aiTab.classList.add('philonet-tab-active');
          commentTab.classList.remove('philonet-tab-active');
        });
      }

      // Character count and input handling
      if (composerInput && charCount) {
        composerInput.addEventListener('input', (e) => {
          const input = e.target as HTMLTextAreaElement;
          const remaining = Math.max(0, 280 - input.value.length);
          charCount.textContent = `${remaining} characters left`;
          
          // Auto-resize textarea
          input.style.height = 'auto';
          input.style.height = input.scrollHeight + 'px';
        });

        composerInput.addEventListener('keydown', (e) => {
          const keyEvent = e as KeyboardEvent;
          if (keyEvent.key === 'Enter' && !keyEvent.shiftKey) {
            keyEvent.preventDefault();
            const input = keyEvent.target as HTMLTextAreaElement;
            if (input.value.trim()) {
              console.log('[Philonet] Comment submitted:', input.value);
              input.value = '';
              input.style.height = 'auto';
              charCount.textContent = '280 characters left';
            }
          }
        });
      }

      // Submit button
      if (submitButton && composerInput) {
        submitButton.addEventListener('click', () => {
          const input = composerInput as HTMLTextAreaElement;
          if (input.value.trim()) {
            console.log('[Philonet] Comment submitted:', input.value);
            input.value = '';
            input.style.height = 'auto';
            if (charCount) charCount.textContent = '280 characters left';
          }
        });
      }
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .philonet-section-icon {
          font-size: 18px;
          color: #3b82f6;
        }

        .philonet-cards {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .philonet-card {
          background: #111111;
          border: 1px solid #262626;
          border-radius: 8px;
          padding: 16px;
          transition: all 0.2s;
          cursor: pointer;
        }

        .philonet-card:hover {
          background: #161616;
          border-color: #3b82f6;
          transform: translateY(-1px);
        }

        .philonet-card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .philonet-card-title {
          font-size: 14px;
          font-weight: 600;
          color: #ffffff;
        }

        .philonet-card-badge {
          background: #3b82f6;
          color: #ffffff;
          font-size: 10px;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: 4px;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .philonet-card-description {
          font-size: 13px;
          color: #a3a3a3;
          line-height: 1.4;
          margin-bottom: 12px;
        }

        .philonet-card-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .philonet-tag {
          background: #262626;
          color: #a3a3a3;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 12px;
          border: 1px solid transparent;
          transition: all 0.2s;
        }

        .philonet-tag:hover {
          background: #3b82f6;
          color: #ffffff;
          border-color: #3b82f6;
        }

        .philonet-input {
          width: 100%;
          background: #111111;
          border: 1px solid #262626;
          border-radius: 8px;
          padding: 12px;
          color: #ffffff;
          font-size: 14px;
          transition: all 0.2s;
          resize: none;
        }

        .philonet-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .philonet-input::placeholder {
          color: #525252;
        }

        .philonet-footer {
          padding: 16px 24px;
          border-top: 1px solid #262626;
          background: #0f0f0f;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .philonet-footer-text {
          font-size: 12px;
          color: #737373;
        }

        .philonet-footer-actions {
          display: flex;
          gap: 8px;
        }

        .philonet-btn {
          background: #3b82f6;
          color: #ffffff;
          border: none;
          border-radius: 6px;
          padding: 8px 16px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          text-transform: uppercase;
          letter-spacing: 0.02em;
        }

        .philonet-btn:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .philonet-btn-secondary {
          background: transparent;
          color: #737373;
          border: 1px solid #262626;
        }

        .philonet-btn-secondary:hover {
          background: #262626;
          color: #ffffff;
        }

        .philonet-animate-in {
          animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `;

      // Create the panel HTML
      const panel = document.createElement('div');
      panel.className = 'philonet-panel philonet-animate-in';
      panel.innerHTML = `
        <div class="philonet-header">
          <div class="philonet-logo">
            <img src="${chrome.runtime.getURL('philonet.png')}" alt="Philonet" onerror="this.style.display='none'">
            <div class="philonet-title">Philonet</div>
          </div>
          <button class="philonet-close-btn" onclick="this.dispatchEvent(new CustomEvent('close-panel', { bubbles: true }))">
            ✕
          </button>
        </div>

        <div class="philonet-content">
          <div class="philonet-hero">
            <div class="philonet-hero-content">
              <h2>Welcome to Philonet</h2>
              <p>A humane interface for digital reading and knowledge exploration</p>
              <div class="philonet-features">
                <div class="philonet-feature">
                  <span class="philonet-feature-icon">🚀</span>
                  <div class="philonet-feature-text">Fast Access</div>
                </div>
                <div class="philonet-feature">
                  <span class="philonet-feature-icon">🔒</span>
                  <div class="philonet-feature-text">Isolated</div>
                </div>
                <div class="philonet-feature">
                  <span class="philonet-feature-icon">⌨️</span>
                  <div class="philonet-feature-text">Shortcuts</div>
                </div>
                <div class="philonet-feature">
                  <span class="philonet-feature-icon">🎨</span>
                  <div class="philonet-feature-text">Elegant</div>
                </div>
              </div>
            </div>
          </div>

          <div class="philonet-section">
            <h3>
              <span class="philonet-section-icon">📚</span>
              Reading Tools
            </h3>
            <div class="philonet-cards">
              <div class="philonet-card">
                <div class="philonet-card-header">
                  <div class="philonet-card-title">Page Analysis</div>
                  <div class="philonet-card-badge">AI</div>
                </div>
                <div class="philonet-card-description">
                  Intelligent content analysis and summarization for better comprehension.
                </div>
                <div class="philonet-card-tags">
                  <div class="philonet-tag">Smart</div>
                  <div class="philonet-tag">Summary</div>
                  <div class="philonet-tag">Insights</div>
                </div>
              </div>
              <div class="philonet-card">
                <div class="philonet-card-header">
                  <div class="philonet-card-title">Highlight & Notes</div>
                  <div class="philonet-card-badge">Pro</div>
                </div>
                <div class="philonet-card-description">
                  Capture important passages and add personal annotations.
                </div>
                <div class="philonet-card-tags">
                  <div class="philonet-tag">Capture</div>
                  <div class="philonet-tag">Annotate</div>
                  <div class="philonet-tag">Organize</div>
                </div>
              </div>
            </div>
          </div>

          <div class="philonet-section">
            <h3>
              <span class="philonet-section-icon">💭</span>
              Ask Questions
            </h3>
            <textarea 
              class="philonet-input" 
              placeholder="What would you like to know about this page?"
              rows="3"
            ></textarea>
          </div>

          <div class="philonet-section">
            <h3>
              <span class="philonet-section-icon">🔖</span>
              Quick Actions
            </h3>
            <div class="philonet-cards">
              <div class="philonet-card">
                <div class="philonet-card-header">
                  <div class="philonet-card-title">Save to Library</div>
                </div>
                <div class="philonet-card-description">
                  Add this page to your personal knowledge library for future reference.
                </div>
              </div>
              <div class="philonet-card">
                <div class="philonet-card-header">
                  <div class="philonet-card-title">Share Insights</div>
                </div>
                <div class="philonet-card-description">
                  Share your highlights and notes with others or export them.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="philonet-footer">
          <div class="philonet-footer-text">
            Ctrl/Cmd + Shift + P to toggle
          </div>
          <div class="philonet-footer-actions">
            <button class="philonet-btn philonet-btn-secondary">Settings</button>
            <button class="philonet-btn">Get Started</button>
          </div>
        </div>
      `;

      // Add event listeners
      panel.addEventListener('close-panel', () => {
        setSidePanelOpen(false);
      });

      // Append to shadow DOM
      shadow.appendChild(style);
      shadow.appendChild(panel);
      
      // Add to document
      document.body.appendChild(container);
      setShadowContainer(container);

      return () => {
        if (container.parentNode) {
          container.parentNode.removeChild(container);
        }
      };
    }, [sidePanelOpen]);

    return null;
  };

  return (
    <>
      {/* Debug info */}
      <div style={{
        position: 'fixed',
        top: '10px',
        left: '10px',
        background: 'green',
        color: 'white',
        padding: '4px 8px',
        fontSize: '12px',
        zIndex: 2147483647,
        borderRadius: '4px',
        fontFamily: 'Arial, sans-serif'
      }}>
        Philonet Shadow Panel Ready - {sidePanelOpen ? 'OPEN' : 'CLOSED'}
      </div>

      {/* Shadow DOM Side Panel */}
      <PhilonetShadowPanel />

      {/* Floating trigger button with enhanced visibility */}
      <div 
        style={{
          position: 'fixed',
          top: '60px',
          right: '20px',
          zIndex: 2147483647,
          backgroundColor: '#ffffff',
          border: '3px solid #3b82f6',
          borderRadius: '50%',
          padding: '12px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.5)',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'scale(1)',
          animation: 'pulse 2s infinite'
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          console.log('[CEB] Button clicked! Opening side panel...');
          toggleSidePanel();
        }}
        title="Toggle Philonet Side Panel"
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f0f9ff';
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 6px 25px rgba(0, 0, 0, 0.4), 0 0 0 2px rgba(59, 130, 246, 0.8)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#ffffff';
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.5)';
        }}
      >
        <img 
          src={chrome.runtime.getURL('philonet.png')} 
          alt="P" 
          style={{
            width: '36px',
            height: '36px',
            objectFit: 'contain',
            pointerEvents: 'none'
          }}
          onError={(e) => {
            console.error('[CEB] Image failed to load, using fallback');
            const target = e.currentTarget as HTMLImageElement;
            target.style.display = 'none';
            const parent = target.parentElement!;
            parent.innerHTML = '<div style="color: #3b82f6; font-weight: bold; font-size: 24px; pointer-events: none;">P</div>';
          }}
          onLoad={() => {
            console.log('[CEB] Philonet image loaded successfully');
          }}
        />
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 4px rgba(59, 130, 246, 0.3);
          }
        }
      `}</style>
    </>
  );
}
