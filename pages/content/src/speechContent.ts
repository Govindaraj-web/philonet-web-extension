/**
 * Content script for handling speech synthesis in webpage context
 * This runs in the webpage context where Speech Synthesis API has better support
 */

interface SpeechMessage {
  action: 'speak' | 'stop' | 'test';
  text?: string;
  options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voiceName?: string;
  };
}

interface SpeechResponse {
  success: boolean;
  error?: string;
  message?: string;
  availableVoices?: string[];
}

class ContentSpeechHandler {
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private isPlaying: boolean = false;

  constructor() {
    this.setupMessageListener();
    console.log('🎤 Content speech handler initialized');
  }

  private setupMessageListener(): void {
    chrome.runtime.onMessage.addListener((message: SpeechMessage, sender, sendResponse) => {
      if (message.action) {
        this.handleSpeechMessage(message)
          .then(response => sendResponse(response))
          .catch(error => sendResponse({ 
            success: false, 
            error: error instanceof Error ? error.message : 'Unknown error' 
          }));
        return true; // Keep the message channel open for async response
      }
      return false; // Return false for messages we don't handle
    });
  }

  private async handleSpeechMessage(message: SpeechMessage): Promise<SpeechResponse> {
    try {
      switch (message.action) {
        case 'speak':
          return await this.speak(message.text || '', message.options);
        case 'stop':
          return this.stop();
        case 'test':
          return await this.speak('Testing speech synthesis from content script', {
            rate: 0.8,
            pitch: 1.0,
            volume: 0.9
          });
        default:
          return { success: false, error: 'Unknown action' };
      }
    } catch (error) {
      console.error('🎤 Error in handleSpeechMessage:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private async speak(text: string, options?: SpeechMessage['options']): Promise<SpeechResponse> {
    if (!('speechSynthesis' in window)) {
      return { success: false, error: 'Speech synthesis not supported in this context' };
    }

    if (!text) {
      return { success: false, error: 'No text provided' };
    }

    try {
      // Cancel any existing speech
      this.stop();

      // Wait a bit for clean state
      await new Promise(resolve => setTimeout(resolve, 100));

      const utterance = new SpeechSynthesisUtterance(text);
      
      // Apply options
      if (options) {
        if (options.rate) utterance.rate = options.rate;
        if (options.pitch) utterance.pitch = options.pitch;
        if (options.volume) utterance.volume = options.volume;
        
        if (options.voiceName) {
          const voices = speechSynthesis.getVoices();
          const voice = voices.find(v => v.name === options.voiceName);
          if (voice) utterance.voice = voice;
        }
      }

      return new Promise<SpeechResponse>((resolve) => {
        let resolved = false;

        const resolveOnce = (response: SpeechResponse) => {
          if (!resolved) {
            resolved = true;
            resolve(response);
          }
        };

        utterance.onstart = () => {
          console.log('🔊 Content script speech started');
          this.isPlaying = true;
          resolveOnce({ success: true, message: 'Speech started successfully' });
        };

        utterance.onend = () => {
          console.log('🔊 Content script speech ended');
          this.isPlaying = false;
          this.currentUtterance = null;
          if (!resolved) {
            resolveOnce({ success: true, message: 'Speech completed' });
          }
        };

        utterance.onerror = (event) => {
          console.error('🔊 Content script speech error:', event.error);
          this.isPlaying = false;
          this.currentUtterance = null;
          resolveOnce({ 
            success: false, 
            error: `Speech synthesis error: ${event.error}` 
          });
        };

        this.currentUtterance = utterance;
        speechSynthesis.speak(utterance);

        // Fallback timeout in case events don't fire
        setTimeout(() => {
          if (!resolved) {
            const speaking = speechSynthesis.speaking;
            resolveOnce({ 
              success: speaking, 
              message: speaking ? 'Speech initiated (timeout fallback)' : 'Speech may not have started' 
            });
          }
        }, 1000);
      });

    } catch (error) {
      console.error('🎤 Error in content script speak:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error in speak' 
      };
    }
  }

  private stop(): SpeechResponse {
    try {
      if (speechSynthesis) {
        speechSynthesis.cancel();
      }
      this.isPlaying = false;
      this.currentUtterance = null;
      console.log('🔊 Content script speech stopped');
      return { success: true, message: 'Speech stopped' };
    } catch (error) {
      console.error('🎤 Error stopping speech:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error stopping speech' 
      };
    }
  }
}

// Initialize the content speech handler
new ContentSpeechHandler();
