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
import { useMutation } from 'convex/react';
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
  // Use Convex mutation to mark the invitation as completed
  const completeBreakoutInvite = useMutation(api.breakout.completeBreakoutInvite);
  
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
    
    // Set up cleanup function to mark the breakout as completed when navigating away
    return () => {
      if (room) {
        void completeBreakoutInvite({ roomId: room });
      }
    };
  }, [searchParams, completeBreakoutInvite]);
  
  const handleExit = () => {
    // Mark the breakout invitation as completed when manually exiting
    if (roomName) {
      void completeBreakoutInvite({ roomId: roomName })
        .then(() => {
          console.log("Breakout room marked as completed");
          void navigate("/arena");
        })
        .catch(err => {
          console.error("Error completing breakout room:", err);
          void navigate("/arena");
        });
    } else {
      void navigate("/arena");
    }
  };
  
  if (error) {
    return (
      <div className="p-8 flex flex-col gap-4 items-center">
        <h1 className="text-3xl font-bold">Breakout Room</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded max-w-md">
          <p className="font-bold">Error</p>
          <p>{error}</p>
          <button 
            onClick={handleExit}
            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded"
          >
            Return to Arena
          </button>
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
        <button 
          onClick={handleExit}
          className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded"
        >
          Return to Arena
        </button>
      </div>
      
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