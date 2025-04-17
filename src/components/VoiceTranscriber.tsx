// src/components/VoiceTranscriber.tsx
import React from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';

const VoiceTranscriber: React.FC = () => {
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();
  
  const updateAllowedToTranscribe = useMutation(api.myFunctions.updateAllowedToTranscribe);

  const toggleListening = () => {
    if (listening) {
      SpeechRecognition.stopListening();
      void updateAllowedToTranscribe({ allowedToTranscribe: false });
    } else {
      SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
      void updateAllowedToTranscribe({ allowedToTranscribe: true });
    }
  };

  if (!browserSupportsSpeechRecognition) {
    return <p>Your browser does not support speech recognition.</p>;
  }

  if (!isMicrophoneAvailable) {
    return <p>Microphone access is required for speech recognition.</p>;
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
      <h2 className="text-xl font-bold mb-2">Let AI Listen</h2>
      <p className="mb-2">Microphone: {listening ? 'On' : 'Off'}</p>
      <div className="flex space-x-2">
        <button
          onClick={toggleListening}
          className={`${listening ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'} text-white px-3 py-1 rounded text-sm`}
        >
          {listening ? 'Stop Listening' : 'Start Listening'}
        </button>
        <button
          onClick={resetTranscript}
          className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          Reset Transcript
        </button>
      </div>
      <div className="mt-4 p-2 bg-white dark:bg-gray-700 rounded">
        <p className="text-sm">{transcript}</p>
      </div>
    </div>
  );
};

export default VoiceTranscriber;
