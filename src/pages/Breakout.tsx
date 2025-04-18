import { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useLocalParticipant,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useMutation, useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';

// Import the LiveKit styles
import '@livekit/components-styles';

// Custom video layout component for breakout rooms
function VideoLayout() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false }
  );
  
  // Voice transcription
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();
  
  const updateAllowedToTranscribe = useMutation(api.myFunctions.updateAllowedToTranscribe);
  const [showTranscript, setShowTranscript] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);
  
  // Get local participant to check if microphone is enabled
  const { localParticipant } = useLocalParticipant();
  const isMicrophoneEnabled = localParticipant?.isMicrophoneEnabled;
  
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
      SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
      void updateAllowedToTranscribe({ allowedToTranscribe: true });
      setShowTranscript(true);
    }
  };
  
  // Handle clicks outside of transcript
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close transcript if click outside
      if (showTranscript && 
          transcriptRef.current && 
          !transcriptRef.current.contains(event.target as Node)) {
        setShowTranscript(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showTranscript]);
  
  // Stop listening when component unmounts
  useEffect(() => {
    return () => {
      if (listening) {
        SpeechRecognition.stopListening();
        void updateAllowedToTranscribe({ allowedToTranscribe: false });
      }
    };
  }, [listening, updateAllowedToTranscribe]);
  
  // Show warning if browser doesn't support speech recognition
  if (!browserSupportsSpeechRecognition) {
    console.warn("Browser doesn't support speech recognition");
  }
  
  if (!isMicrophoneAvailable) {
    console.warn("Microphone is not available");
  }
  
  return (
    <div className="h-full relative">
      <GridLayout tracks={tracks} className="w-full h-full">
        <ParticipantTile className="rounded-lg overflow-hidden border-2 border-blue-500" />
      </GridLayout>
      
      {/* Transcript popup */}
      {showTranscript && (
        <div 
          ref={transcriptRef}
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 max-w-lg w-3/4"
        >
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-bold">Live Transcript</h3>
            <div className="flex gap-2">
              <button
                onClick={resetTranscript}
                className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
              >
                Reset
              </button>
              <button
                onClick={() => setShowTranscript(false)}
                className="text-xs bg-gray-300 hover:bg-gray-400 text-gray-800 px-2 py-1 rounded"
              >
                Close
              </button>
            </div>
          </div>
          <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded max-h-32 overflow-y-auto">
            <p className="text-sm">{transcript || "Listening..."}</p>
          </div>
        </div>
      )}
      
      <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50">
        <ControlBar variation="minimal" className="bg-gray-800 bg-opacity-75 rounded-lg p-2" />
        
        {/* Voice transcription button */}
        <button
          onClick={toggleTranscription}
          className={`
            ${listening 
              ? 'bg-red-500 hover:bg-red-600' 
              : isMicrophoneEnabled 
                ? 'bg-purple-500 hover:bg-purple-600' 
                : 'bg-gray-400 relative'
            } 
            text-white font-medium px-4 py-2 ml-2 rounded-md flex items-center
          `}
          disabled={!isMicrophoneEnabled && !listening}
          title={isMicrophoneEnabled ? "Toggle transcription" : "Enable microphone first"}
        >
          {!isMicrophoneEnabled && !listening && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-400 bg-opacity-90 rounded-md">
              <div className="flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1 text-white" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07zM5 8a1 1 0 00-2 0h2zm12 0a1 1 0 10-2 0h2z" clipRule="evenodd" />
                  <path d="M3 4.5L17 18.5" stroke="currentColor" strokeWidth="2"/>
                </svg>
                <span>Transcribe?</span>
              </div>
            </div>
          )}
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
          </svg>
          {listening ? 'Stop Transcribing' : 'Transcribe'}
        </button>
      </div>
    </div>
  );
}

export default function Breakout() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Use Convex mutations and actions
  const completeBreakoutInvite = useMutation(api.breakout.completeBreakoutInvite);
  const cleanupBreakoutRoom = useAction(api.breakoutActions.cleanupBreakoutRoom);
  
  // Get the current user to check their role
  const currentUser = useQuery(api.users.getCurrentUser);
  
  // State for tracking session ending status
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [endSessionError, setEndSessionError] = useState<string | null>(null);
  // Add cleanup state tracking
  const [cleanupInitiated, setCleanupInitiated] = useState(false);
  
  // Add a query to check if the invitation still exists
  // This acts as a real-time check - when the invitation is deleted by another participant,
  // this component will update and we can close the tab
  const checkInvitationExists = useQuery(
    api.breakout.checkInvitationExists,
    roomName ? { roomId: roomName } : "skip"
  );
  
  // Effect to navigate back to arena when the invitation no longer exists
  // This happens when another participant ends the session
  useEffect(() => {
    // Only run this check if we have a room name and the invitation check has returned
    if (roomName && checkInvitationExists !== undefined) {
      // If checkInvitationExists is false, it means the invitation was deleted
      if (checkInvitationExists === false && !isEndingSession) {
        console.log("Session ended by another participant, navigating back to arena");
        
        // Show a message briefly before navigating
        setError("Session ended by another participant. Returning to Arena...");
        
        // Navigate back to arena after a short delay to allow the message to be seen
        setTimeout(() => {
          void navigate("/arena");
        }, 2000);
      }
    }
  }, [roomName, checkInvitationExists, isEndingSession, navigate]);
  
  // Function to check and mark cleanup as initiated
  const initiateCleanup = () => {
    if (cleanupInitiated) {
      console.log("Cleanup already initiated, skipping duplicate call");
      return false;
    }
    
    // Mark as initiated in both state and sessionStorage for persistence
    setCleanupInitiated(true);
    if (roomName) {
      sessionStorage.setItem(`cleanup_${roomName}`, 'true');
    }
    return true;
  };
  
  // Check on mount if cleanup was already initiated (e.g., from another event)
  useEffect(() => {
    if (roomName) {
      const alreadyCleaning = sessionStorage.getItem(`cleanup_${roomName}`) === 'true';
      if (alreadyCleaning) {
        console.log("Found existing cleanup in progress");
        setCleanupInitiated(true);
      }
    }
  }, [roomName]);
  
  useEffect(() => {
    // Extract room ID and token from URL parameters
    const room = searchParams.get('room');
    const paramToken = searchParams.get('token');
    
    if (!room || !paramToken) {
      setError("Missing room ID or token. This breakout session is invalid.");
      return;
    }
    
    setRoomName(room);
    setToken(paramToken);
    
    // Add handler to clean up the session when the tab is closed (but not when navigating)
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // Check if cleanup already initiated
      if (sessionStorage.getItem(`cleanup_${room}`) === 'true') {
        console.log("Cleanup already initiated, skipping duplicate");
        return;
      }
      
      // Mark as initiated
      sessionStorage.setItem(`cleanup_${room}`, 'true');
      
      // Try to end the session when the user closes the tab
      // This runs synchronously so we can't use async/await here
      try {
        // Make a best effort to mark the session as completed
        if (room) {
          // This might not complete if the tab is closed immediately
          void completeBreakoutInvite({ roomId: room });
          void cleanupBreakoutRoom({ roomId: room });
        }
      } catch (e) {
        console.error("Error cleaning up on tab close:", e);
      }
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [searchParams, completeBreakoutInvite, cleanupBreakoutRoom]);
  
  const handleExit = () => {
    // Just navigate back to arena without ending the session
    void navigate("/arena");
  };
  
  const handleEndSession = async () => {
    if (!roomName) {
      void navigate("/arena");
      return;
    }
    
    // Check if cleanup already initiated
    if (!initiateCleanup()) {
      console.log("Session end already in progress");
      return;
    }
    
    setIsEndingSession(true);
    setEndSessionError(null);
    
    // First, show a message to indicate we're ending the session for all participants
    setError("Ending session for all participants...");
    
    try {
      // 1. Mark the invitation as completed in our database
      // Note: The completeBreakoutInvite function is now responsible for 
      // directly deleting the completed invitations
      const completeResult = await completeBreakoutInvite({ roomId: roomName });
      console.log("Breakout room marked as completed:", completeResult);
      
      // 2. Delete the LiveKit room
      const cleanupResult = await cleanupBreakoutRoom({ roomId: roomName });
      console.log("LiveKit room cleanup result:", cleanupResult);
      
      if (!cleanupResult.success) {
        console.warn("LiveKit room cleanup failed, but session was marked as completed:", cleanupResult.error);
      }
      
      // 3. Show a success message briefly before navigating
      setError("Session ended successfully. Returning to Arena...");
      
      // 4. Navigate back to arena after a short delay
      setTimeout(() => {
        console.log("Session ended, navigating back to arena");
        void navigate("/arena");
      }, 1500);
    } catch (err) {
      console.error("Error ending breakout session:", err);
      setEndSessionError(err instanceof Error ? err.message : "Failed to end session");
      setIsEndingSession(false);
      
      // Reset cleanup state so user can try again
      setCleanupInitiated(false);
      if (roomName) {
        sessionStorage.removeItem(`cleanup_${roomName}`);
      }
    }
  };
  
  if (error) {
    return (
      <div className="p-8 flex flex-col gap-4 items-center">
        <h1 className="text-3xl font-bold">Breakout Room</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <div className="mt-4 flex gap-2 justify-center">
            <button 
              onClick={handleExit}
              className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded"
            >
              Return to Arena
            </button>
            {error.includes("Session ended") && (
              <button 
                onClick={() => void navigate("/arena")}
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded"
              >
                Return to Arena
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }
  
  if (!token || !roomName) {
    return (
      <div className="p-8 flex flex-col gap-4 items-center">
        <h1 className="text-3xl font-bold">Breakout Room</h1>
        <p>Loading breakout session...</p>
      </div>
    );
  }
  
  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Breakout Room</h1>
        <div className="flex gap-2">
          <button 
            onClick={handleExit}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded"
          >
            Return to Arena
          </button>
          {/* Only show End Session button for non-client roles (admin or user) */}
          {currentUser && currentUser.role !== 'client' && (
            <button 
              onClick={() => void handleEndSession()}
              disabled={isEndingSession || cleanupInitiated}
              className={`${
                isEndingSession || cleanupInitiated ? 'bg-gray-500' : 'bg-red-500 hover:bg-red-600'
              } text-white font-medium px-4 py-2 rounded flex items-center gap-1`}
            >
              {isEndingSession ? (
                <>
                  <span className="animate-spin inline-block h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                  Ending...
                </>
              ) : (
                'End Session'
              )}
            </button>
          )}
        </div>
      </div>
      
      {endSessionError && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p className="font-bold">Error ending session</p>
          <p>{endSessionError}</p>
        </div>
      )}
      
      <div className="h-[80vh] bg-gray-100 dark:bg-gray-900 rounded-md overflow-hidden">
        <LiveKitRoom
          token={token}
          serverUrl={import.meta.env.VITE_LIVEKIT_WS_URL as string}
          connectOptions={{ autoSubscribe: true }}
          onDisconnected={handleExit}
        >
          <VideoLayout />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
} 