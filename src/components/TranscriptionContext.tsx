import { createContext } from 'react';

// Define types for our context
export interface TranscriptionContextType {
  transcriptions: Transcription[];
  transcript: string;
  interimTranscript: string;
  listening: boolean;
  resetTranscript: () => void;
  resetAllTranscriptions: () => Promise<void>;
  toggleTranscription: () => void;
  showTranscript: boolean;
  setShowTranscript: React.Dispatch<React.SetStateAction<boolean>>;
  isMicrophoneEnabled: boolean;
}

export interface Transcription {
  _id: string;
  userId: string;
  userEmail: string;
  userName?: string;
  roomId: string;
  text: string;
  timestamp: number;
  isFinal: boolean;
  messageId?: string;
}

// Create context
export const TranscriptionContext = createContext<TranscriptionContextType | undefined>(undefined); 