/**
 * Speech synthesis fallback for Chrome extension context
 * This uses message passing to execute speech synthesis in the active tab's context
 * where it's more likely to work properly
 */

export interface SpeechMessage {
  action: 'speak' | 'stop' | 'test';
  text?: string;
  options?: {
    rate?: number;
    pitch?: number;
    volume?: number;
    voiceName?: string;
  };
}

export interface SpeechResponse {
  success: boolean;
  error?: string;
  message?: string;
  availableVoices?: string[];
}

export class SpeechFallback {
  private static instance: SpeechFallback;
  private isEnabled: boolean = false;

  private constructor() {
    this.checkAvailability();
  }

  public static getInstance(): SpeechFallback {
    if (!SpeechFallback.instance) {
      SpeechFallback.instance = new SpeechFallback();
    }
    return SpeechFallback.instance;
  }

  private async checkAvailability(): Promise<void> {
    try {
      // Check if we can access chrome.tabs API
      this.isEnabled = !!(chrome?.tabs?.query);
      console.log('🎤 SpeechFallback availability:', this.isEnabled);
    } catch (error) {
      console.warn('🎤 SpeechFallback not available:', error);
      this.isEnabled = false;
    }
  }

  public async speakInActiveTab(text: string, options?: SpeechMessage['options']): Promise<SpeechResponse> {
    if (!this.isEnabled) {
      return { success: false, error: 'Speech fallback not available' };
    }

    try {
      // Get the active tab
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!activeTab?.id) {
        return { success: false, error: 'No active tab found' };
      }

      // Inject speech synthesis script into the active tab
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: 'speak',
        text,
        options
      } as SpeechMessage);

      return response as SpeechResponse;
    } catch (error) {
      console.error('🎤 Error in speakInActiveTab:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  public async stopSpeechInActiveTab(): Promise<SpeechResponse> {
    if (!this.isEnabled) {
      return { success: false, error: 'Speech fallback not available' };
    }

    try {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!activeTab?.id) {
        return { success: false, error: 'No active tab found' };
      }

      const response = await chrome.tabs.sendMessage(activeTab.id, {
        action: 'stop'
      } as SpeechMessage);

      return response as SpeechResponse;
    } catch (error) {
      console.error('🎤 Error in stopSpeechInActiveTab:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  public async testSpeechInActiveTab(): Promise<SpeechResponse> {
    return this.speakInActiveTab('Testing speech synthesis from Chrome extension', {
      rate: 0.8,
      pitch: 1.0,
      volume: 0.9
    });
  }
}

export const speechFallback = SpeechFallback.getInstance();
