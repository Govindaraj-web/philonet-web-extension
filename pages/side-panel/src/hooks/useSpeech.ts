import { useState, useEffect, useCallback } from 'react';
import { SpeechState } from '../types';

export function useSpeech() {
  const [speechState, setSpeechState] = useState<SpeechState>({
    isPlaying: false,
    speechUtterance: null,
    speechSupported: false,
    availableVoices: [],
    selectedVoice: null,
  });

  // Find the best voice for reading
  const findBestVoice = useCallback((voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null => {
    if (voices.length === 0) return null;

    // Priority order for voice selection
    const preferredVoices = [
      'Microsoft Aria Online (Natural) - English (United States)',
      'Microsoft Jenny Online (Natural) - English (United States)', 
      'Google UK English Female',
      'Google US English Female',
      'Microsoft Zira - English (United States)',
      'Microsoft David - English (United States)',
      'Alex', // macOS
      'Samantha', // macOS
      'Karen', // macOS
      'Moira', // macOS
      'Ava', // iOS
      'Allison', // iOS
    ];

    // Try to find a preferred voice
    for (const preferredName of preferredVoices) {
      const voice = voices.find(v => v.name.includes(preferredName) || v.name === preferredName);
      if (voice) return voice;
    }

    // Fallback: find any high-quality English voice
    const englishVoices = voices.filter(v => 
      v.lang.startsWith('en') && 
      (v.name.toLowerCase().includes('premium') || 
       v.name.toLowerCase().includes('enhanced') ||
       v.name.toLowerCase().includes('natural') ||
       v.name.toLowerCase().includes('neural'))
    );

    if (englishVoices.length > 0) {
      const femaleVoice = englishVoices.find(v => 
        v.name.toLowerCase().includes('female') ||
        v.name.toLowerCase().includes('aria') ||
        v.name.toLowerCase().includes('jenny') ||
        v.name.toLowerCase().includes('zira') ||
        v.name.toLowerCase().includes('samantha') ||
        v.name.toLowerCase().includes('karen')
      );
      if (femaleVoice) return femaleVoice;
      
      return englishVoices[0];
    }

    const anyEnglishVoice = voices.find(v => v.lang.startsWith('en'));
    return anyEnglishVoice || voices[0];
  }, []);

  // Check for speech synthesis support
  useEffect(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setSpeechState(prev => ({ ...prev, speechSupported: true }));
      
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        const preferredVoice = findBestVoice(voices);
        
        setSpeechState(prev => ({
          ...prev,
          availableVoices: voices,
          selectedVoice: preferredVoice
        }));
        
        console.log('🎤 Available voices:', voices.length, 'Selected:', preferredVoice?.name);
      };

      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, [findBestVoice]);

  const enhanceTextForSpeech = useCallback((text: string) => {
    return text
      .replace(/\b(URL|API|UI|UX|CSS|HTML|JS)\b/g, (match) => {
        const acronyms: { [key: string]: string } = {
          'URL': 'U R L',
          'API': 'A P I', 
          'UI': 'U I',
          'UX': 'U X',
          'CSS': 'C S S',
          'HTML': 'H T M L',
          'JS': 'JavaScript'
        };
        return acronyms[match] || match;
      })
      .replace(/\b(\d+)px\b/g, '$1 pixels')
      .replace(/\b(\d+)ms\b/g, '$1 milliseconds')
      .replace(/\be\.g\./g, 'for example')
      .replace(/\bi\.e\./g, 'that is')
      .replace(/\betc\./g, 'etcetera')
      .replace(/\bvs\./g, 'versus')
      .trim();
  }, []);

  const speak = useCallback((text: string) => {
    if (!speechState.speechSupported || !text) return;

    if (speechState.isPlaying) {
      window.speechSynthesis.cancel();
      setSpeechState(prev => ({ ...prev, isPlaying: false, speechUtterance: null }));
      return;
    }

    const enhancedText = enhanceTextForSpeech(text)
      .replace(/\. /g, '. ')
      .replace(/\! /g, '! ')
      .replace(/\? /g, '? ')
      .replace(/\, /g, ', ')
      .replace(/: /g, ': ')
      .replace(/; /g, '; ');

    const utterance = new SpeechSynthesisUtterance(enhancedText);
    
    if (speechState.selectedVoice) {
      utterance.voice = speechState.selectedVoice;
    }
    
    utterance.rate = 0.85;
    utterance.pitch = 1.0;
    utterance.volume = 0.9;
    
    utterance.onstart = () => {
      setSpeechState(prev => ({ ...prev, isPlaying: true }));
      console.log('🔊 Speech started');
    };
    
    utterance.onend = () => {
      setSpeechState(prev => ({ ...prev, isPlaying: false, speechUtterance: null }));
      console.log('🔊 Speech ended');
    };
    
    utterance.onerror = (event) => {
      setSpeechState(prev => ({ ...prev, isPlaying: false, speechUtterance: null }));
      console.error('🔊 Speech error:', event.error);
    };

    setSpeechState(prev => ({ ...prev, speechUtterance: utterance }));
    window.speechSynthesis.speak(utterance);
  }, [speechState.speechSupported, speechState.isPlaying, speechState.selectedVoice, enhanceTextForSpeech]);

  const stop = useCallback(() => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setSpeechState(prev => ({ ...prev, isPlaying: false, speechUtterance: null }));
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    ...speechState,
    speak,
    stop,
    isSupported: speechState.speechSupported
  };
}
