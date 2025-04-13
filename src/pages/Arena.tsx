import { useEffect, useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useRoomContext
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useConvexAuth } from 'convex/react';
import { Link } from 'react-router-dom';

// Import the LiveKit styles
import '@livekit/components-styles';

// Custom component for room controls with leave button
function RoomControls() {
  const room = useRoomContext();
  
  const handleLeave = () => {
    if (room) {
      void room.disconnect();
      // Force reload the page to reset the state
      window.location.reload();
    }
  };
  
  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-4 z-50">
      <ControlBar variation="minimal" className="bg-gray-800 bg-opacity-75 rounded-lg p-2" />
      <button 
        onClick={handleLeave}
        className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md"
      >
        Leave Room
      </button>
    </div>
  );
}

// Custom video layout component
function VideoLayout() {
  // Get all camera and screen share tracks
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
        <ParticipantTile className="rounded-lg overflow-hidden border-2 border-gray-700" />
      </GridLayout>
      <RoomControls />
    </div>
  );
}

export default function Arena() {
  const { isAuthenticated } = useConvexAuth();
  const [token, setToken] = useState('');
  const [roomName] = useState('arena'); // Fixed room name for the arena
  const generateToken = useAction(api.livekit.generateToken);
  const currentUser = useQuery(api.users.getCurrentUser);
  const [error, setError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  
  // Generate token but don't join automatically
  useEffect(() => {
    async function getToken() {
      try {
        if (isAuthenticated && currentUser) {
          // For authenticated users - permissions based on role
          const identity = currentUser.email || 'anonymous';
          
          // Determine if the user can publish based on their role
          const canPublish = currentUser.role === 'admin' || 
                            currentUser.role === 'user' || 
                            currentUser.role === 'client';
          
          const newToken = await generateToken({
            identity,
            roomName,
            canPublish, 
            canSubscribe: true, // Everyone can watch
            metadata: JSON.stringify({
              name: currentUser.name || identity,
              role: currentUser.role
            })
          });
          setToken(newToken);
        } else {
          // For public viewers
          const publicId = 'public-' + Math.random().toString(36).substring(2, 7);
          const newToken = await generateToken({
            identity: publicId,
            roomName,
            canPublish: false, // Public users cannot publish
            canSubscribe: true // Public users can watch
          });
          setToken(newToken);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect to LiveKit');
        console.error('Error generating token:', err);
      }
    }
    
    void getToken();
  }, [isAuthenticated, currentUser, generateToken, roomName]);

  // Handler for joining the room (requires user interaction)
  const handleJoinRoom = () => {
    setHasJoined(true);
  };

  // Get user role description for display
  const getUserRoleDescription = () => {
    if (!isAuthenticated) {
      return "You're viewing as a guest. Sign in to participate.";
    }
    
    if (!currentUser) {
      return "Loading user information...";
    }
    
    switch (currentUser.role) {
      case 'admin':
        return "You're logged in as an admin with full access.";
      case 'user':
        return "You're logged in as a team member and can stream.";
      case 'client':
        return "You're logged in as a client and can participate.";
      default:
        return "You're logged in but your role is limited.";
    }
  };

  if (error) {
    return (
      <div className="p-8 flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Live Arena</h1>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p>{error}</p>
          <p>Please check your LiveKit configuration.</p>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="p-8 flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Live Arena</h1>
        <p>Loading arena...</p>
      </div>
    );
  }

  // Show join screen if not joined yet
  if (!hasJoined) {
    return (
      <div className="p-8 flex flex-col gap-4 items-center justify-center">
        <h1 className="text-3xl font-bold mb-4">Live Arena</h1>
        <div className="p-4 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-md mb-4 max-w-md text-center">
          <p className="mb-4">{getUserRoleDescription()}</p>
          
          {!isAuthenticated && (
            <div className="mb-4 flex flex-col gap-2">
              <p className="text-sm">Want to participate in the discussion?</p>
              <div className="flex justify-center gap-2">
                <Link to="/team-signin" className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm">
                  Team Login
                </Link>
                <Link to="/client-signin" className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm">
                  Client Login
                </Link>
              </div>
            </div>
          )}
          
          <button 
            onClick={handleJoinRoom}
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Join Arena
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Live Arena</h1>
      
      <div className="p-2 bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-800 rounded-md">
        <p className="text-sm">{getUserRoleDescription()}</p>
      </div>
      
      <div className="h-[75vh] bg-gray-100 dark:bg-gray-900 rounded-md overflow-hidden relative">
        <LiveKitRoom
          token={token}
          serverUrl={import.meta.env.VITE_LIVEKIT_WS_URL as string}
          connectOptions={{ autoSubscribe: true }}
          onDisconnected={() => setHasJoined(false)}
        >
          <VideoLayout />
          <RoomAudioRenderer />
        </LiveKitRoom>
      </div>
    </div>
  );
} 