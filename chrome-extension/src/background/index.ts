import 'webextension-polyfill';
import { exampleThemeStorage } from '@extension/storage';

exampleThemeStorage.get().then(theme => {
  console.log('theme', theme);
});

console.log('Background loaded');
console.log("Edit 'chrome-extension/src/background/index.ts' and save to reload.");

// Configure side panel behavior to open on action click
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .then(() => {
    console.log('[Background] Side panel behavior set to open on action click');
  })
  .catch((error) => {
    console.error('[Background] Error setting panel behavior:', error);
  });

// Configure side panel to open automatically on action click
// This handles the basic open/close toggle for the extension icon
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .then(() => {
    console.log('[Background] Side panel will open/close automatically on extension icon click');
  })
  .catch((error) => {
    console.error('[Background] Error setting panel behavior:', error);
  });

// Handle keyboard shortcut (Ctrl/Cmd + Shift + P) to toggle side panel
chrome.commands.onCommand.addListener(async (command, tab) => {
  console.log('[Background] Keyboard command triggered:', command, 'for tab:', tab?.id);
  
  if (command === 'toggle-side-panel' && tab?.windowId) {
    try {
      // Keyboard shortcuts have user gesture context, so we can use sidePanel.open directly
      await chrome.sidePanel.open({ windowId: tab.windowId });
      console.log('[Background] Side panel opened via keyboard shortcut');
    } catch (error) {
      console.error('[Background] Error opening side panel via keyboard:', error);
    }
  }
});

// Handle side panel messages 
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  console.log('[Background] Received message:', request);

  if (request.type === 'TRIGGER_EXTENSION_CLICK') {
    console.log('[Background] Extension click trigger requested from content script');
    
    // Content scripts have limitations, but we'll try both open and close
    if (sender.tab?.windowId) {
      const action = request.action || 'open';
      
      if (action === 'close') {
        // Attempt to close by temporarily disabling the side panel
        try {
          await chrome.sidePanel.setOptions({ enabled: false });
          // Small delay to ensure the panel closes
          await new Promise(resolve => setTimeout(resolve, 100));
          await chrome.sidePanel.setOptions({ enabled: true });
          await chrome.storage.local.set({ currentWindowSidePanelOpen: false });
          console.log('[Background] Side panel closed via disable/enable');
          sendResponse({ success: true, action: 'closed' });
        } catch (error) {
          console.error('[Background] Close attempt failed:', error);
          sendResponse({ 
            success: false, 
            error: 'Close action failed - use extension icon',
            requiresUserAction: true,
            action: 'close'
          });
        }
        return true;
      }
      
      // Only handle open action
      chrome.sidePanel.open({ windowId: sender.tab.windowId })
        .then(async () => {
          console.log('[Background] Side panel opened via trigger');
          // Update storage to reflect open state
          await chrome.storage.local.set({ currentWindowSidePanelOpen: true });
          sendResponse({ success: true, action: 'opened' });
        })
        .catch((error) => {
          console.error('[Background] Open trigger failed:', error);
          sendResponse({ success: false, error: error.message });
        });
      
      return true; // Keep the message channel open for async response
    } else {
      sendResponse({ success: false, error: 'No window ID available' });
    }
  }

  if (request.type === 'OPEN_SIDE_PANEL') {
    console.log('[Background] Side panel open request from content script');
    
    if (sender.tab?.windowId) {
      // Try to open the side panel despite user gesture limitations
      chrome.sidePanel.open({ windowId: sender.tab.windowId })
        .then(() => {
          console.log('[Background] Side panel opened successfully from content script');
          sendResponse({ success: true });
        })
        .catch((error) => {
          console.error('[Background] Error opening side panel from content script:', error);
          // Check if it's a user gesture error
          if (error.message && error.message.includes('user gesture')) {
            sendResponse({ 
              success: false, 
              error: 'User gesture required - use extension icon or Ctrl/Cmd+Shift+P',
              guidance: true
            });
          } else {
            sendResponse({ success: false, error: error.message });
          }
        });
      
      return true; // Keep the message channel open for async response
    } else {
      console.error('[Background] No window ID available');
      sendResponse({ success: false, error: 'No window ID available' });
    }
  }

  if (request.type === 'TOGGLE_PHILONET_SIDEPANEL') {
    console.log('[Background] Side panel toggle request from content script');
    
    if (sender.tab?.windowId) {
      // Try to open the side panel
      chrome.sidePanel.open({ windowId: sender.tab.windowId })
        .then(() => {
          console.log('[Background] Side panel opened successfully');
          sendResponse({ success: true, action: 'opened' });
        })
        .catch((error) => {
          console.error('[Background] Error opening side panel:', error);
          // Check if it's a user gesture error
          if (error.message && error.message.includes('user gesture')) {
            sendResponse({ 
              success: false, 
              error: 'User gesture required - use extension icon or Ctrl/Cmd+Shift+P',
              guidance: true
            });
          } else {
            sendResponse({ success: false, error: error.message });
          }
        });
      
      return true; // Keep the message channel open for async response
    } else {
      console.error('[Background] No window ID available for toggle');
      sendResponse({ success: false, error: 'No window ID available' });
    }
  }

  return false; // Don't keep the message channel open
});

console.log('[Background] Side panel listeners initialized - use extension icon or Ctrl/Cmd+Shift+P to toggle');
