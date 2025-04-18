import React, { useRef, useEffect } from 'react';
import { useTranscription } from './useTranscription';

interface TranscriptionListProps {
  containerClassName?: string;
}

const TranscriptionList: React.FC<TranscriptionListProps> = ({ 
  containerClassName = 'bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 max-w-lg w-full' 
}) => {
  const { 
    transcriptions, 
    transcript,
    interimTranscript,
    listening, 
    resetAllTranscriptions,
    showTranscript,
    setShowTranscript 
  } = useTranscription();
  
  const transcriptRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [transcriptions, transcript, interimTranscript]);
  
  // If transcript isn't being shown, don't render
  if (!showTranscript) {
    return null;
  }

  // Format timestamp to readable time
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  // Group transcriptions by user and time (within 30 seconds)
  const groupTranscriptions = () => {
    if (!transcriptions.length) return [];
    
    const grouped = [];
    let currentGroup = {
      userId: transcriptions[0].userId,
      userName: transcriptions[0].userName || transcriptions[0].userEmail.split('@')[0],
      messages: [{ text: transcriptions[0].text, timestamp: transcriptions[0].timestamp }],
      firstTimestamp: transcriptions[0].timestamp
    };
    
    for (let i = 1; i < transcriptions.length; i++) {
      const current = transcriptions[i];
      const prevTimestamp = currentGroup.messages[currentGroup.messages.length - 1].timestamp;
      
      // If same user and within 30 seconds, add to current group
      if (current.userId === currentGroup.userId && 
          current.timestamp - prevTimestamp < 30000) {
        currentGroup.messages.push({
          text: current.text,
          timestamp: current.timestamp
        });
      } else {
        // Start a new group
        grouped.push(currentGroup);
        currentGroup = {
          userId: current.userId,
          userName: current.userName || current.userEmail.split('@')[0],
          messages: [{ text: current.text, timestamp: current.timestamp }],
          firstTimestamp: current.timestamp
        };
      }
    }
    
    // Add the last group
    grouped.push(currentGroup);
    return grouped;
  };
  
  const groupedTranscriptions = groupTranscriptions();
  
  return (
    <div 
      ref={transcriptRef}
      className={containerClassName}
    >
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-sm font-bold">Live Transcript</h3>
        <div className="flex gap-2">
          <button
            onClick={() => void resetAllTranscriptions()}
            className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
          >
            Reset All
          </button>
          <button
            onClick={() => setShowTranscript(false)}
            className="text-xs bg-gray-300 hover:bg-gray-400 text-gray-800 px-2 py-1 rounded"
          >
            Close
          </button>
        </div>
      </div>
      
      <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded max-h-64 overflow-y-auto">
        {/* Historical transcriptions */}
        {groupedTranscriptions.length > 0 ? (
          groupedTranscriptions.map((group) => (
            <div key={`${group.userId}-${group.firstTimestamp}`} className="mb-3">
              <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
                <span className="font-semibold">{group.userName}</span>
                <span>{formatTime(group.firstTimestamp)}</span>
              </div>
              <div className="pl-2 border-l-2 border-blue-400">
                {group.messages.map((msg, msgIndex) => (
                  <p key={`${group.userId}-${msg.timestamp}-${msgIndex}`} className="text-sm mb-1">
                    {msg.text}
                  </p>
                ))}
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 italic">No transcriptions yet...</p>
        )}
        
        {/* Current user's live transcript */}
        {listening && (transcript || interimTranscript) && (
          <div className="mt-2 border-t pt-2 border-gray-300 dark:border-gray-600">
            <div className="flex justify-between items-center text-xs text-gray-500 mb-1">
              <span className="font-semibold">You (live)</span>
              <span>{formatTime(Date.now())}</span>
            </div>
            <div className="pl-2 border-l-2 border-green-400">
              <p className="text-sm">{transcript}</p>
              {interimTranscript && (
                <p className="text-sm text-gray-500 italic">{interimTranscript}</p>
              )}
            </div>
          </div>
        )}
        
        {/* Auto-scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
};

export default TranscriptionList; 