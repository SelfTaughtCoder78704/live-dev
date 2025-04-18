import { useEffect, useState } from 'react';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { useConvexAuth } from 'convex/react';
import { Link } from 'react-router-dom';
import {
  LiveKitRoom,
  RoomAudioRenderer,
} from '@livekit/components-react';
// Import extracted components
import BreakoutNotifierWithContext from '../components/BreakoutNotifierWithContext';
import BreakoutInvitationNotifier from '../components/BreakoutInvitationNotifier';
import VideoLayout from '../components/VideoLayout';
import ClientActiveBreakouts from '../components/ClientActiveBreakouts';

// Import the LiveKit styles
import '@livekit/components-styles';

export default function Arena() {
  const { isAuthenticated } = useConvexAuth();
  const [token, setToken] = useState('');
  
  // Get the arena room from the database instead of hardcoding
  const arenaRoom = useQuery(api.rooms.getArenaRoom);
  // If there's no arena room in the database, use a fallback name
  const roomName = arenaRoom?.name || 'arena-fallback';
  
  // Allow admins to create an arena room if one doesn't exist
  const createArenaRoom = useMutation(api.rooms.createArenaRoom);
  // Track whether we're creating an arena room
  const [isCreatingArenaRoom, setIsCreatingArenaRoom] = useState(false);
  
  const generateToken = useAction(api.livekit.generateToken);
  const currentUser = useQuery(api.users.getCurrentUser);
  const [error, setError] = useState<string | null>(null);
  const [hasJoined, setHasJoined] = useState(false);
  
  // Check if we're returning from a breakout when the component mounts
  useEffect(() => {
    const returnStatus = sessionStorage.getItem('returning_from_breakout');
    if (returnStatus === 'true') {
      console.log('Detected return from breakout room');
      sessionStorage.removeItem('returning_from_breakout');
      // Auto-join the room when returning from a breakout
      setHasJoined(true);
    }
  }, []);
  
  // If no arena room exists and user is admin, create one
  useEffect(() => {
    async function initializeArenaRoom() {
      if (!arenaRoom && currentUser?.role === 'admin' && !isCreatingArenaRoom) {
        try {
          setIsCreatingArenaRoom(true);
          await createArenaRoom({ name: 'main-arena-permanent' });
        } catch (err) {
          console.error('Error creating arena room:', err);
          setError(err instanceof Error ? err.message : 'Failed to create arena room');
        } finally {
          setIsCreatingArenaRoom(false);
        }
      }
    }
    
    void initializeArenaRoom();
  }, [arenaRoom, currentUser, createArenaRoom, isCreatingArenaRoom]);
  
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
          <p>Please check your configuration or contact an administrator.</p>
        </div>
      </div>
    );
  }

  if (isCreatingArenaRoom) {
    return (
      <div className="p-8 flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Live Arena</h1>
        <p>Initializing arena room... Please wait.</p>
      </div>
    );
  }

  if (!arenaRoom && currentUser?.role === 'admin') {
    return (
      <div className="p-8 flex flex-col gap-4">
        <h1 className="text-3xl font-bold">Live Arena</h1>
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          <p>No arena room has been set up yet.</p>
          <button 
            onClick={() => void createArenaRoom({ name: 'main-arena-permanent' })}
            className="mt-2 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            Create Arena Room
          </button>
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
      
      {/* Always show the invitation notifier outside the LiveKitRoom */}
      <BreakoutInvitationNotifier />
      
      <div className="h-[75vh] bg-gray-100 dark:bg-gray-900 rounded-md overflow-hidden relative">
        <LiveKitRoom
          token={token}
          serverUrl={import.meta.env.VITE_LIVEKIT_WS_URL as string}
          connectOptions={{ autoSubscribe: true }}
          onDisconnected={() => setHasJoined(false)}
        >
          <VideoLayout />
          <RoomAudioRenderer />
          {/* These components will use the handleBeforeBreakout function through context */}
          <BreakoutNotifierWithContext />
          <ClientActiveBreakouts />
        </LiveKitRoom>
      </div>
      
      {/* Add a style for the soft pulse animation */}
      <style>
        {`
          @keyframes pulse-soft {
            0% { opacity: 0.8; }
            50% { opacity: 1; }
            100% { opacity: 0.8; }
          }
          .animate-pulse-soft {
            animation: pulse-soft 2s infinite ease-in-out;
          }
        `}
      </style>
    </div>
  );
} 