import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useMutation, useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';

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
  
  return (
    <div className="h-full relative">
      <GridLayout tracks={tracks} className="w-full h-full">
        <ParticipantTile className="rounded-lg overflow-hidden border-2 border-blue-500" />
      </GridLayout>
      <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50">
        <ControlBar variation="minimal" className="bg-gray-800 bg-opacity-75 rounded-lg p-2" />
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
  
  // State for tracking session ending status
  const [isEndingSession, setIsEndingSession] = useState(false);
  const [endSessionError, setEndSessionError] = useState<string | null>(null);
  
  // Add a query to check if the invitation still exists
  // This acts as a real-time check - when the invitation is deleted by another participant,
  // this component will update and we can close the tab
  const checkInvitationExists = useQuery(
    api.breakout.checkInvitationExists,
    roomName ? { roomId: roomName } : "skip"
  );
  
  // Effect to close the tab when the invitation no longer exists
  // This happens when another participant ends the session
  useEffect(() => {
    // Only run this check if we have a room name and the invitation check has returned
    if (roomName && checkInvitationExists !== undefined) {
      // If checkInvitationExists is false, it means the invitation was deleted
      if (checkInvitationExists === false && !isEndingSession) {
        console.log("Session ended by another participant, closing tab");
        
        // Show a message briefly before closing
        setError("Session ended by another participant. This tab will close.");
        
        // Close the tab after a short delay to allow the message to be seen
        setTimeout(() => {
          window.close();
          
          // Fallback if window.close() is blocked
          setError("Session ended by another participant. Please close this tab.");
        }, 2000);
      }
    }
  }, [roomName, checkInvitationExists, isEndingSession]);
  
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
    
    // Add handler to clean up the session when the tab is closed
    const handleBeforeUnload = () => {
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
      
      // 3. Show a success message briefly before closing
      setError("Session ended successfully. Closing all participant tabs...");
      
      // 4. Close the tab after a short delay
      setTimeout(() => {
        console.log("Session ended, closing tab");
        window.close();
        
        // Fallback in case window.close() doesn't work (some browsers restrict it)
        setError("Session ended. All participants have been notified. Please close this tab.");
        setIsEndingSession(false);
      }, 1500);
    } catch (err) {
      console.error("Error ending breakout session:", err);
      setEndSessionError(err instanceof Error ? err.message : "Failed to end session");
      setIsEndingSession(false);
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
                onClick={() => window.close()}
                className="bg-gray-500 hover:bg-gray-600 text-white font-medium px-4 py-2 rounded"
              >
                Close Tab
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
          <button 
            onClick={() => void handleEndSession()}
            disabled={isEndingSession}
            className={`${
              isEndingSession ? 'bg-gray-500' : 'bg-red-500 hover:bg-red-600'
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