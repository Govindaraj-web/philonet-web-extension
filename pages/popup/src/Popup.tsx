import '@src/Popup.css';
import { t } from '@extension/i18n';
import { PROJECT_URL_OBJECT, useStorage, withErrorBoundary, withSuspense } from '@extension/shared';
import { exampleThemeStorage } from '@extension/storage';
import { cn, ErrorDisplay, LoadingSpinner, ToggleButton } from '@extension/ui';

const notificationOptions = {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon-34.png'),
  title: 'Injecting content script error',
  message: 'You cannot inject script here!',
} as const;

const Popup = () => {
  const { isLight } = useStorage(exampleThemeStorage);
  const logo = isLight ? 'popup/logo_vertical.svg' : 'popup/logo_vertical_dark.svg';

  const goGithubSite = () => chrome.tabs.create(PROJECT_URL_OBJECT);

  const injectContentScript = async () => {
    const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });

    if (tab.url!.startsWith('about:') || tab.url!.startsWith('chrome:')) {
      chrome.notifications.create('inject-error', notificationOptions);
    }

    await chrome.scripting
      .executeScript({
        target: { tabId: tab.id! },
        files: ['/content-runtime/example.iife.js', '/content-runtime/all.iife.js'],
      })
      .catch(err => {
        // Handling errors related to other paths
        if (err.message.includes('Cannot access a chrome:// URL')) {
          chrome.notifications.create('inject-error', notificationOptions);
        }
      });
  };

  const openSidePanel = async () => {
    try {
      console.log('[Popup] Opening side panel...');
      
      // Get the current active tab
      const [tab] = await chrome.tabs.query({ currentWindow: true, active: true });
      console.log('[Popup] Current tab:', tab);
      
      if (!tab || !tab.id) {
        console.error('[Popup] No active tab found');
        chrome.notifications.create('sidepanel-error', {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icon-34.png'),
          title: 'Side panel error',
          message: 'No active tab found!',
        });
        return;
      }
      
      // Check if the tab is a valid web page (not chrome:// pages)
      if (!tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:') || tab.url.startsWith('moz-extension://') || tab.url.startsWith('chrome-extension://')) {
        console.error('[Popup] Cannot open side panel on this page:', tab.url);
        chrome.notifications.create('inject-error', {
          type: 'basic',
          iconUrl: chrome.runtime.getURL('icon-34.png'),
          title: 'Cannot open side panel',
          message: 'Side panel cannot be opened on this page!',
        });
        return;
      }

      console.log('[Popup] Opening side panel for windowId:', tab.windowId);
      
      // Popup context has user gesture, so we can call sidePanel.open directly
      await chrome.sidePanel.open({ windowId: tab.windowId });
      console.log('[Popup] Side panel opened successfully');
      
      // Close popup after opening side panel
      window.close();
      
    } catch (err) {
      console.error('[Popup] Error opening side panel:', err);
      chrome.notifications.create('sidepanel-error', {
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icon-34.png'),
        title: 'Side panel error',
        message: 'Could not open side panel. Please try again.',
      });
    }
  };

  return (
    <div className={cn('App', isLight ? 'bg-slate-50' : 'bg-gray-800')}>
      <header className={cn('App-header', isLight ? 'text-gray-900' : 'text-gray-100')}>
        <button onClick={goGithubSite}>
          <img src={chrome.runtime.getURL(logo)} className="App-logo" alt="logo" />
        </button>
        <p>
          Edit <code>pages/popup/src/Popup.tsx</code>
        </p>
        <div className="flex flex-col gap-2">
          <button
            className={cn(
              'rounded px-4 py-2 font-bold shadow hover:scale-105 transition-transform flex items-center gap-2',
              isLight ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-blue-600 text-white hover:bg-blue-700',
            )}
            onClick={openSidePanel}>
            <img 
              src={chrome.runtime.getURL('philonet.png')} 
              alt="Philonet" 
              width="16" 
              height="16" 
              className="w-4 h-4"
            />
            Open Philonet Side Panel
          </button>
          <button
            className={cn(
              'rounded px-4 py-1 font-bold shadow hover:scale-105',
              isLight ? 'bg-blue-200 text-black' : 'bg-gray-700 text-white',
            )}
            onClick={injectContentScript}>
            {t('injectButton')}
          </button>
        </div>
        <ToggleButton>{t('toggleTheme')}</ToggleButton>
      </header>
    </div>
  );
};

export default withErrorBoundary(withSuspense(Popup, <LoadingSpinner />), ErrorDisplay);
