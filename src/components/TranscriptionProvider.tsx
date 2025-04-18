import React, { useState, useEffect, ReactNode } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useLocalParticipant } from '@livekit/components-react';
import { TranscriptionContext, TranscriptionContextType } from './TranscriptionContext';

// Provider component props
interface TranscriptionProviderProps {
  children: ReactNode;
  roomId: string;
}

// Provider component
export const TranscriptionProvider: React.FC<TranscriptionProviderProps> = ({ 
  children, 
  roomId 
}) => {
  // Local state
  const [showTranscript, setShowTranscript] = useState(false);
  const [messageId, setMessageId] = useState<string | null>(null);
  
  // LiveKit state
  const { localParticipant } = useLocalParticipant();
  const isMicrophoneEnabled = localParticipant?.isMicrophoneEnabled;

  // Speech recognition
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    interimTranscript,
    finalTranscript,
  } = useSpeechRecognition();

  // Convex mutations
  const updateAllowedToTranscribe = useMutation(api.myFunctions.updateAllowedToTranscribe);
  const addTranscription = useMutation(api.transcriptions.addTranscription);
  const archiveAndReset = useMutation(api.transcriptions.archiveAndResetTranscriptions);
  
  // Get transcriptions for this room
  const transcriptions = useQuery(api.transcriptions.subscribeToRoomTranscriptions, {
    roomId,
    limit: 50,
  }) || [];

  // Toggle voice transcription
  const toggleTranscription = () => {
    // Only allow transcription if microphone is enabled in LiveKit
    if (!isMicrophoneEnabled) {
      alert("Please enable your microphone in the control bar first");
      return;
    }
    
    if (listening) {
      SpeechRecognition.stopListening();
      void updateAllowedToTranscribe({ allowedToTranscribe: false });
    } else {
      // Generate a new message ID for this transcription session
      setMessageId(`msg-${Date.now()}`);
      SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
      void updateAllowedToTranscribe({ allowedToTranscribe: true });
      setShowTranscript(true);
    }
  };
  
  // Archive and reset all transcriptions
  const resetAllTranscriptions = async (): Promise<void> => {
    try {
      // Reset local transcript
      resetTranscript();
      
      // Determine if we're in arena or breakout based on room ID
      const archiveType = roomId.startsWith('breakout') ? 'breakout' : 'arena';
      
      // Call the Convex mutation to archive and reset
      const result = await archiveAndReset({
        roomId,
        archiveType
      });
      
      console.log("Transcriptions archived and reset:", result);
      
      // Show feedback (optional)
      if (result.archivedCount && result.archivedCount > 0) {
        alert(`Archived ${result.archivedCount} messages and cleared transcript.`);
      }
    } catch (error) {
      console.error("Failed to archive transcriptions:", error);
      alert("Error resetting transcriptions. Please try again.");
      throw error;
    }
  };

  // Effect to stop transcription when microphone is disabled
  useEffect(() => {
    if (!isMicrophoneEnabled && listening) {
      console.log("Microphone disabled, stopping transcription");
      SpeechRecognition.stopListening();
      void updateAllowedToTranscribe({ allowedToTranscribe: false });
    }
  }, [isMicrophoneEnabled, listening, updateAllowedToTranscribe]);

  // Effect to save final transcriptions to the database
  useEffect(() => {
    // Only process when we have final transcript and are listening
    if (finalTranscript && listening && messageId) {
      console.log("Saving final transcript:", finalTranscript);
      
      // Send to Convex
      void addTranscription({
        roomId,
        text: finalTranscript,
        isFinal: true,
        messageId,
      });
      
      // Reset the transcript to avoid duplicate submissions
      resetTranscript();
    }
  }, [finalTranscript, listening, addTranscription, roomId, messageId, resetTranscript]);

  // Stop listening when component unmounts
  useEffect(() => {
    return () => {
      if (listening) {
        SpeechRecognition.stopListening();
        void updateAllowedToTranscribe({ allowedToTranscribe: false });
      }
    };
  }, [listening, updateAllowedToTranscribe]);

  // Show warnings if needed
  if (!browserSupportsSpeechRecognition) {
    console.warn("Browser doesn't support speech recognition");
  }

  const contextValue: TranscriptionContextType = {
    transcriptions,
    transcript,
    interimTranscript,
    listening,
    resetTranscript,
    resetAllTranscriptions,
    toggleTranscription,
    showTranscript,
    setShowTranscript,
    isMicrophoneEnabled: !!isMicrophoneEnabled,
  };

  return (
    <TranscriptionContext.Provider value={contextValue}>
      {children}
    </TranscriptionContext.Provider>
  );
}; 