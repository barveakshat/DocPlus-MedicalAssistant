import { useState, useCallback, useRef, useEffect } from 'react';

// Extend Window to include webkitSpeechRecognition
interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message: string;
}

/**
 * Robust voice chat hook using browser-native Web Speech API.
 * Handles Chrome's aggressive restarts and correctly accumulates transcript.
 */
export const useVoiceChat = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<any>(null);
  
  // Refs for tracking state across render cycles and Chrome restarts
  const gotResultRef = useRef(false);
  const isManuallyStoppedRef = useRef(false);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      isManuallyStoppedRef.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  /**
   * Start listening to the user's voice.
   * @param onResult - called with the final transcript when speech is recognized
   * @param onEnd - called when recognition ends without a result
   */
  const startListening = useCallback((
    onResult: (text: string) => void,
    onEnd?: () => void
  ) => {
    const hasSTT = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    if (!hasSTT) return;

    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    gotResultRef.current = false;
    isManuallyStoppedRef.current = false;
    
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let noSpeechTimer: ReturnType<typeof setTimeout> | null = null;
    
    // Accumulate transcripts across Chrome's internal restarts
    let accumulatedFinal = '';
    let currentFinal = '';
    let currentInterim = '';

    const handleStopAndCommit = () => {
      if (gotResultRef.current || isManuallyStoppedRef.current) return;
      
      const fullText = (accumulatedFinal + ' ' + currentFinal + ' ' + currentInterim).replace(/\s+/g, ' ').trim();
      
      gotResultRef.current = true;
      if (silenceTimer) clearTimeout(silenceTimer);
      if (noSpeechTimer) clearTimeout(noSpeechTimer);
      
      recognition.stop();
      
      if (fullText) {
        onResult(fullText);
      } else {
        onEnd?.();
      }
    };

    recognition.onstart = () => {
      if (isManuallyStoppedRef.current) return;
      setIsListening(true);
      
      // Fallback: if no speech at all after 10 seconds, just close
      if (!noSpeechTimer) {
         noSpeechTimer = setTimeout(() => {
           handleStopAndCommit();
         }, 10000);
      }
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      if (isManuallyStoppedRef.current) return;
      
      if (noSpeechTimer) {
        clearTimeout(noSpeechTimer);
        noSpeechTimer = null;
      }

      currentFinal = '';
      currentInterim = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          currentFinal += result[0].transcript;
        } else {
          currentInterim += result[0].transcript;
        }
      }

      const displayTranscript = (accumulatedFinal + ' ' + currentFinal + ' ' + currentInterim).replace(/\s+/g, ' ').trim();
      setTranscript(displayTranscript);

      // Start silence timer since user is dictating
      if (silenceTimer) clearTimeout(silenceTimer);
      silenceTimer = setTimeout(() => {
        handleStopAndCommit();
      }, 2000); // 2 seconds of silence commits the text
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      // Chrome throws 'network' or 'no-speech' if it detects silence or rate-limits aggressive restarts
      if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'network') {
        // Let onend try to restart it
        return;
      }
      console.error('Speech recognition error:', event.error);
      handleStopAndCommit();
    };

    recognition.onend = () => {
      if (gotResultRef.current || isManuallyStoppedRef.current) {
        setIsListening(false);
        if (silenceTimer) clearTimeout(silenceTimer);
        if (noSpeechTimer) clearTimeout(noSpeechTimer);
        return;
      }

      // We haven't committed yet. Chrome stopped listening (pause or no-speech error).
      // Accumulate what we had, since event.results gets wiped on restart
      if (currentFinal || currentInterim) {
        accumulatedFinal = (accumulatedFinal + ' ' + currentFinal + ' ' + currentInterim).trim();
        currentFinal = '';
        currentInterim = '';
      }

      // Try to restart if we aren't done (keeps continuous stream alive)
      // ADD A SMALL DELAY TO PREVENT CHROME 'NETWORK' RATE LIMIT/DDOS PROTECTION
      setTimeout(() => {
        if (!isManuallyStoppedRef.current && !gotResultRef.current) {
          try {
            recognition.start();
          } catch {
            handleStopAndCommit();
          }
        }
      }, 250);
    };

    setTranscript('');
    recognitionRef.current = recognition;
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    isManuallyStoppedRef.current = true;
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    startListening,
    stopListening,
  };
};
