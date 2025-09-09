import { t } from '@extension/i18n';
import { ToggleButton } from '@extension/ui';
import { useEffect, useState, useRef } from 'react';

export default function App() {
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [buttonText, setButtonText] = useState('Open');
  const currentStateRef = useRef(false);

  useEffect(() => {
    console.log('[CEB] Content ui all loaded');
    
    // Check initial side panel state
    const checkPanelState = async () => {
      try {
        // Always start with closed state since we can't reliably detect open state
        // The extension icon with setPanelBehavior handles the actual toggle
        setIsPanelOpen(false);
        setButtonText('Open');
        currentStateRef.current = false;
        console.log('[CEB] Initial panel state set to closed (safe default)');
      } catch (error) {
        console.error('[CEB] Error checking panel state:', error);
      }
    };
    
    checkPanelState();
    
    // Periodic state verification to catch any drift
    const stateVerificationInterval = setInterval(async () => {
      try {
        const result = await chrome.storage.local.get('currentWindowSidePanelOpen');
        const storageState = result.currentWindowSidePanelOpen || false;
        
        if (storageState !== currentStateRef.current) {
          console.log(`[CEB] State drift detected! UI: ${currentStateRef.current}, Storage: ${storageState}. Syncing...`);
          setIsPanelOpen(storageState);
          setButtonText(storageState ? 'Close' : 'Open');
          currentStateRef.current = storageState;
        }
      } catch (error) {
        // Silently fail - this is just a background sync
      }
    }, 2000); // Check every 2 seconds
    
    // Listen for storage changes to update button state
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.currentWindowSidePanelOpen) {
        const isOpen = changes.currentWindowSidePanelOpen.newValue || false;
        setIsPanelOpen(isOpen);
        setButtonText(isOpen ? 'Close' : 'Open');
        currentStateRef.current = isOpen;
        console.log('[CEB] Panel state changed:', isOpen);
      }
    };
    
    chrome.storage.onChanged.addListener(handleStorageChange);
    
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
    
    return () => {
      clearInterval(stateVerificationInterval);
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.onMessage) {
        chrome.runtime.onMessage.removeListener(handleMessage);
        console.log('[CEB] Message listener removed');
      }
      if (chrome.storage && chrome.storage.onChanged) {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      }
    };
  }, []);

  const toggleSidePanel = async () => {
    try {
      const action = isPanelOpen ? 'close' : 'open';
      console.log(`[CEB] Attempting to ${action} side panel...`);
      
      // Check if Chrome runtime is available
      if (!chrome?.runtime?.sendMessage) {
        console.error('[CEB] Chrome runtime not available');
        fallbackToGuidance(action);
        return;
      }
      
      // Add timeout to handle unresponsive background script
      let responseReceived = false;
      const timeoutId = setTimeout(() => {
        if (!responseReceived) {
          console.warn('[CEB] Background script response timeout, falling back to guidance');
          fallbackToGuidance(action);
        }
      }, 3000); // 3 second timeout
      
      try {
        chrome.runtime.sendMessage({ 
          type: 'TRIGGER_EXTENSION_CLICK', 
          action: action
        }, (response) => {
          responseReceived = true;
          clearTimeout(timeoutId);
          
          if (chrome.runtime.lastError) {
            console.error('[CEB] Extension click trigger failed:', chrome.runtime.lastError);
            fallbackToGuidance(action);
            return;
          } else if (response && response.success) {
          console.log(`[CEB] Side panel ${action}ed successfully`);
          
          // Wait a bit for the storage to be updated by background script
          setTimeout(async () => {
            try {
              // Check the actual storage state instead of assuming
              const result = await chrome.storage.local.get('currentWindowSidePanelOpen');
              const actualState = result.currentWindowSidePanelOpen || false;
              
              console.log(`[CEB] Storage state after ${action}:`, actualState);
              
              // Update UI to match storage state
              setIsPanelOpen(actualState);
              setButtonText(actualState ? 'Close' : 'Open');
              currentStateRef.current = actualState;
              
            } catch (error) {
              console.error('[CEB] Error checking storage state:', error);
              // Fallback to toggling local state
              setIsPanelOpen(!isPanelOpen);
              setButtonText(!isPanelOpen ? 'Close' : 'Open');
              currentStateRef.current = !isPanelOpen;
            }
          }, 200);
          
          } else {
            console.error('[CEB] Extension click trigger failed:', response?.error);
            fallbackToGuidance(action);
          }
        });
      } catch (messageError) {
        responseReceived = true;
        clearTimeout(timeoutId);
        console.error('[CEB] Error sending message to background script:', messageError);
        fallbackToGuidance(action);
      }
        
    } catch (error) {
      console.error('[CEB] Error in toggleSidePanel:', error);
      fallbackToGuidance(isPanelOpen ? 'close' : 'open');
    }
  };  const fallbackToGuidance = (action: string = 'open') => {
    console.log(`[CEB] ${action} action failed - user should use extension icon or Ctrl+Shift+P`);
  };

  const handleListenToPage = () => {
    try {
      // Get page content for TTS
      const title = document.title || "Current Page";
      const description = document.querySelector('meta[name="description"]')?.getAttribute('content') || 
                         document.querySelector('meta[property="og:description"]')?.getAttribute('content') || '';
      
      // Extract main content from common article selectors
      const contentSelectors = [
        'article',
        '[role="main"]',
        'main',
        '.content',
        '.post-content',
        '.article-content',
        '.entry-content',
        'h1, h2, h3, p'
      ];
      
      let articleText = '';
      for (const selector of contentSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          articleText = Array.from(elements)
            .slice(0, 20) // Limit to first 20 elements to avoid too much content
            .map(el => el.textContent?.trim())
            .filter(text => text && text.length > 10)
            .join('. ');
          break;
        }
      }
      
      const contentToRead = [title, description, articleText]
        .filter(Boolean)
        .join('. ')
        .slice(0, 8000); // Limit to reasonable length for TTS
      
      if ('speechSynthesis' in window) {
        // Stop any current speech
        window.speechSynthesis.cancel();
        
        if (contentToRead.trim()) {
          // Create and configure speech
          const utterance = new SpeechSynthesisUtterance(contentToRead);
          utterance.rate = 0.9;
          utterance.pitch = 1;
          utterance.volume = 0.8;
          
          // Speak the content
          window.speechSynthesis.speak(utterance);
          
          console.log('[CEB] Started text-to-speech for page content');
        } else {
          console.log('[CEB] No content found to read');
        }
      } else {
        alert('Text-to-speech is not supported in your browser');
      }
    } catch (error) {
      console.error('[CEB] Error in text-to-speech:', error);
    }
  };

  return (
    <>
      {/* Floating trigger button with enhanced visibility */}
      <div 
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          zIndex: 2147483647,
          backgroundColor: '#ffffff',
          border: `3px solid ${isPanelOpen ? '#dc2626' : '#3b82f6'}`,
          borderRadius: '50%',
          padding: '12px',
          boxShadow: `0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px ${isPanelOpen ? 'rgba(220, 38, 38, 0.5)' : 'rgba(59, 130, 246, 0.5)'}`,
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          width: '60px',
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: 'scale(1)',
          animation: isPanelOpen ? 'pulseClose 2s infinite' : 'pulseOpen 2s infinite'
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleSidePanel();
        }}
        title={`${buttonText} Philonet Side Panel`}
        onMouseEnter={(e) => {
          const bgColor = isPanelOpen ? '#fef2f2' : '#f0f9ff';
          e.currentTarget.style.backgroundColor = bgColor;
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = `0 6px 25px rgba(0, 0, 0, 0.4), 0 0 0 2px ${isPanelOpen ? 'rgba(220, 38, 38, 0.8)' : 'rgba(59, 130, 246, 0.8)'}`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#ffffff';
          e.currentTarget.style.transform = 'scale(1)';
          const borderColor = isPanelOpen ? 'rgba(220, 38, 38, 0.5)' : 'rgba(59, 130, 246, 0.5)';
          e.currentTarget.style.boxShadow = `0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px ${borderColor}`;
        }}
      >
        <img 
          src={chrome.runtime.getURL('philonet.png')} 
          alt="P" 
          style={{
            width: '44px',
            height: '44px',
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
        />
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes pulseOpen {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 4px rgba(59, 130, 246, 0.3);
          }
        }
        @keyframes pulseClose {
          0%, 100% {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 1px rgba(220, 38, 38, 0.5);
          }
          50% {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3), 0 0 0 4px rgba(220, 38, 38, 0.3);
          }
        }
      `}</style>
    </>
  );
}
