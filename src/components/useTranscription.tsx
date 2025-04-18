import { useContext } from 'react';
import { TranscriptionContext } from './TranscriptionContext';

// Custom hook to use the context
export const useTranscription = () => {
  const context = useContext(TranscriptionContext);
  if (context === undefined) {
    throw new Error('useTranscription must be used within a TranscriptionProvider');
  }
  return context;
}; 