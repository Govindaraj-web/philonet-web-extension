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
      
      // Add Philonet CSS styles
      const style = document.createElement('style');
      style.textContent = `
        /* Philonet Design System */
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
          border-left: 1px solid #262626;
          pointer-events: auto;
          display: flex;
          flex-direction: column;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #ffffff;
          transform: translateX(0);
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: -8px 0 32px rgba(0, 0, 0, 0.5);
        }

        .philonet-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #262626;
          background: #0f0f0f;
        }

        .philonet-logo {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .philonet-logo img {
          width: 24px;
          height: 24px;
          border-radius: 4px;
        }

        .philonet-title {
          font-size: 18px;
          font-weight: 600;
          color: #ffffff;
          letter-spacing: -0.01em;
        }

        .philonet-close-btn {
          background: none;
          border: none;
          color: #737373;
          cursor: pointer;
          padding: 8px;
          border-radius: 6px;
          font-size: 16px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .philonet-close-btn:hover {
          background: #262626;
          color: #ffffff;
        }

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

        .philonet-hero {
          position: relative;
          background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
          padding: 32px 24px;
          text-align: center;
        }

        .philonet-hero::before {
          content: '';
          position: absolute;
          inset: 0;
          background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse"><path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(255,255,255,0.03)" stroke-width="1"/></pattern></defs><rect width="100" height="100" fill="url(%23grid)"/></svg>');
          opacity: 0.5;
        }

        .philonet-hero-content {
          position: relative;
          z-index: 1;
        }

        .philonet-hero h2 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 8px;
          color: #ffffff;
          letter-spacing: -0.02em;
        }

        .philonet-hero p {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
          line-height: 1.5;
          margin-bottom: 20px;
        }

        .philonet-features {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }

        .philonet-feature {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          padding: 12px;
          text-align: center;
          transition: all 0.2s;
        }

        .philonet-feature:hover {
          background: rgba(255, 255, 255, 0.15);
          transform: translateY(-1px);
        }

        .philonet-feature-icon {
          font-size: 20px;
          margin-bottom: 4px;
          display: block;
        }

        .philonet-feature-text {
          font-size: 11px;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.9);
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .philonet-section {
          padding: 24px;
          border-bottom: 1px solid #1a1a1a;
        }

        .philonet-section:last-child {
          border-bottom: none;
        }

        .philonet-section h3 {
          font-size: 16px;
          font-weight: 600;
          color: #ffffff;
          margin-bottom: 16px;
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
