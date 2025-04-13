import { useEffect, useState, useRef } from 'react';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import {
  LiveKitRoom,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  ControlBar,
  useTracks,
  useRoomContext,
  useParticipants
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useConvexAuth } from 'convex/react';
import { Link } from 'react-router-dom';

// Import the LiveKit styles
import '@livekit/components-styles';

// Create separate components for inside and outside LiveKitRoom

// For inside LiveKitRoom - can use room context
function BreakoutNotifierWithContext() {
  const { isAuthenticated } = useConvexAuth();
  const pendingInvites = useQuery(api.breakout.getMyPendingInvites);
  const respondToInvite = useMutation(api.breakout.respondToInvite);
  const generateBreakoutToken = useAction(api.breakoutActions.generateBreakoutRoomToken);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const currentUser = useQuery(api.users.getCurrentUser);
  const [acceptedInvites, setAcceptedInvites] = useState<Record<string, boolean>>({});
  const room = useRoomContext(); // This is safe inside LiveKitRoom
  
  // Force refresh of invitations every 5 seconds
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  useEffect(() => {
    // Set up a timer to refresh invitations
    const intervalId = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 5000);
    
    // Log for debugging
    console.log("Invitation check - User:", currentUser?.email, "Role:", currentUser?.role);
    console.log("Pending invites:", pendingInvites);
    
    return () => clearInterval(intervalId);
  }, [refreshTrigger, currentUser, pendingInvites]);
  
  // Show placeholder if not authenticated or no invites but only for clients and when user data is available
  if (!isAuthenticated || ((!pendingInvites || pendingInvites.length === 0) && currentUser?.role !== 'client' && Object.keys(acceptedInvites).length === 0)) {
    return null;
  }
  
  const handleResponse = async (inviteId: Id<"breakoutInvites">, response: "accept" | "decline") => {
    try {
      setIsLoading(prev => ({ ...prev, [inviteId]: true }));
      
      console.log("Responding to invitation", inviteId, "with", response);
      const result = await respondToInvite({ inviteId, response });
      console.log("Response result:", result);
      
      // If accepted, generate token and join the breakout room
      if (response === "accept" && result) {
        try {
          console.log("Generating token for room", result.roomId);
          const token = await generateBreakoutToken({ roomId: result.roomId });
          console.log("Token generated successfully");
          
          // Disconnect from the Arena before opening breakout room
          if (room) {
            console.log("Disconnecting from Arena");
            await room.disconnect();
          }
          
          // Open the breakout room in a new window
          const breakoutUrl = `/breakout?room=${result.roomId}&token=${encodeURIComponent(token)}`;
          window.open(breakoutUrl, '_blank');
          
          // Reload the page to reset state
          window.location.reload();
          
          // Mark this invitation as accepted
          setAcceptedInvites(prev => ({ ...prev, [inviteId.toString()]: true }));
        } catch (tokenError) {
          console.error("Error generating breakout token:", tokenError);
          alert("Could not generate breakout room token. Please try again later.");
        }
      } else if (response === "decline") {
        // Remove this invitation from the UI after declining
        setAcceptedInvites(prev => {
          const updated = { ...prev };
          delete updated[inviteId.toString()];
          return updated;
        });
      }
    } catch (error) {
      console.error("Error responding to invitation:", error);
      alert(error instanceof Error ? error.message : "Failed to respond to invitation");
    } finally {
      setIsLoading(prev => ({ ...prev, [inviteId]: false }));
    }
  };
  
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {/* Show accepted invitations */}
      {Object.keys(acceptedInvites).length > 0 && (
        <div className="bg-green-50 dark:bg-green-900 border-l-4 border-green-500 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-green-700 dark:text-green-300">Breakout Room Joined</p>
          <p className="text-sm text-green-600 dark:text-green-400">
            You've joined a breakout room in a new window
          </p>
          <button 
            onClick={() => setAcceptedInvites({})}
            className="mt-2 text-xs bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-100 px-2 py-1 rounded"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {(!pendingInvites || pendingInvites.length === 0) ? (
        // Debug placeholder for clients - will help verify the component is rendering
        currentUser?.role === 'client' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border-l-4 border-gray-500">
            <p className="text-sm">No pending invitations</p>
            <p className="text-xs text-gray-500">User: {currentUser.email}</p>
            <p className="text-xs text-gray-500">Role: {currentUser.role}</p>
          </div>
        )
      ) : (
        pendingInvites.map(invite => (
          <div 
            key={invite._id} 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border-l-4 border-blue-500 animate-pulse-soft"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold">Breakout Room Invitation</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  From: {invite.inviter.name !== "Unknown" 
                    ? invite.inviter.name 
                    : invite.inviter.email !== "Unknown" 
                      ? invite.inviter.email 
                      : "Team Member"}
                </p>
                {invite.inviter.role && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {invite.inviter.role === "admin" ? "Administrator" : "Team Member"}
                  </p>
                )}
              </div>
              <div className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                {invite.timeRemaining}s
              </div>
            </div>
            
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => void handleResponse(invite._id, "accept")}
                disabled={isLoading[invite._id.toString()]}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                {isLoading[invite._id.toString()] ? "..." : "Accept"}
              </button>
              <button
                onClick={() => void handleResponse(invite._id, "decline")}
                disabled={isLoading[invite._id.toString()]}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded text-sm"
              >
                {isLoading[invite._id.toString()] ? "..." : "Decline"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// For outside LiveKitRoom - cannot use room context
function BreakoutInvitationNotifier() {
  const { isAuthenticated } = useConvexAuth();
  const pendingInvites = useQuery(api.breakout.getMyPendingInvites);
  const respondToInvite = useMutation(api.breakout.respondToInvite);
  const generateBreakoutToken = useAction(api.breakoutActions.generateBreakoutRoomToken);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const currentUser = useQuery(api.users.getCurrentUser);
  const [acceptedInvites, setAcceptedInvites] = useState<Record<string, boolean>>({});
  
  // Force refresh of invitations every 5 seconds
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  useEffect(() => {
    // Set up a timer to refresh invitations
    const intervalId = setInterval(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 5000);
    
    // Log for debugging
    console.log("Invitation check - User:", currentUser?.email, "Role:", currentUser?.role);
    console.log("Pending invites:", pendingInvites);
    
    return () => clearInterval(intervalId);
  }, [refreshTrigger, currentUser, pendingInvites]);
  
  // Show placeholder if not authenticated or no invites but only for clients and when user data is available
  if (!isAuthenticated || ((!pendingInvites || pendingInvites.length === 0) && currentUser?.role !== 'client' && Object.keys(acceptedInvites).length === 0)) {
    return null;
  }
  
  const handleResponse = async (inviteId: Id<"breakoutInvites">, response: "accept" | "decline") => {
    try {
      setIsLoading(prev => ({ ...prev, [inviteId]: true }));
      
      console.log("Responding to invitation", inviteId, "with", response);
      const result = await respondToInvite({ inviteId, response });
      console.log("Response result:", result);
      
      // If accepted, generate token and join the breakout room
      if (response === "accept" && result) {
        try {
          console.log("Generating token for room", result.roomId);
          const token = await generateBreakoutToken({ roomId: result.roomId });
          console.log("Token generated successfully");
          
          // Open the breakout room in a new window
          const breakoutUrl = `/breakout?room=${result.roomId}&token=${encodeURIComponent(token)}`;
          window.open(breakoutUrl, '_blank');
          
          // Reload the page to reset state
          window.location.reload();
          
          // Mark this invitation as accepted
          setAcceptedInvites(prev => ({ ...prev, [inviteId.toString()]: true }));
        } catch (tokenError) {
          console.error("Error generating breakout token:", tokenError);
          alert("Could not generate breakout room token. Please try again later.");
        }
      } else if (response === "decline") {
        // Remove this invitation from the UI after declining
        setAcceptedInvites(prev => {
          const updated = { ...prev };
          delete updated[inviteId.toString()];
          return updated;
        });
      }
    } catch (error) {
      console.error("Error responding to invitation:", error);
      alert(error instanceof Error ? error.message : "Failed to respond to invitation");
    } finally {
      setIsLoading(prev => ({ ...prev, [inviteId]: false }));
    }
  };
  
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
      {/* Show accepted invitations */}
      {Object.keys(acceptedInvites).length > 0 && (
        <div className="bg-green-50 dark:bg-green-900 border-l-4 border-green-500 rounded-lg shadow-lg p-3">
          <p className="font-semibold text-green-700 dark:text-green-300">Breakout Room Joined</p>
          <p className="text-sm text-green-600 dark:text-green-400">
            You've joined a breakout room in a new window
          </p>
          <button 
            onClick={() => setAcceptedInvites({})}
            className="mt-2 text-xs bg-green-200 dark:bg-green-700 text-green-800 dark:text-green-100 px-2 py-1 rounded"
          >
            Dismiss
          </button>
        </div>
      )}
      
      {(!pendingInvites || pendingInvites.length === 0) ? (
        // Debug placeholder for clients - will help verify the component is rendering
        currentUser?.role === 'client' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border-l-4 border-gray-500">
            <p className="text-sm">No pending invitations</p>
            <p className="text-xs text-gray-500">User: {currentUser.email}</p>
            <p className="text-xs text-gray-500">Role: {currentUser.role}</p>
          </div>
        )
      ) : (
        pendingInvites.map(invite => (
          <div 
            key={invite._id} 
            className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 border-l-4 border-blue-500 animate-pulse-soft"
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <p className="font-semibold">Breakout Room Invitation</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  From: {invite.inviter.name !== "Unknown" 
                    ? invite.inviter.name 
                    : invite.inviter.email !== "Unknown" 
                      ? invite.inviter.email 
                      : "Team Member"}
                </p>
                {invite.inviter.role && (
                  <p className="text-xs text-gray-500 dark:text-gray-500">
                    {invite.inviter.role === "admin" ? "Administrator" : "Team Member"}
                  </p>
                )}
              </div>
              <div className="text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 px-2 py-1 rounded">
                {invite.timeRemaining}s
              </div>
            </div>
            
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => void handleResponse(invite._id, "accept")}
                disabled={isLoading[invite._id.toString()]}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-sm"
              >
                {isLoading[invite._id.toString()] ? "..." : "Accept"}
              </button>
              <button
                onClick={() => void handleResponse(invite._id, "decline")}
                disabled={isLoading[invite._id.toString()]}
                className="flex-1 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 px-3 py-1 rounded text-sm"
              >
                {isLoading[invite._id.toString()] ? "..." : "Decline"}
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

// Custom component for room controls with leave button
function RoomControls() {
  const room = useRoomContext();
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const [showInviteMenu, setShowInviteMenu] = useState(false);
  const [showBreakoutsMenu, setShowBreakoutsMenu] = useState(false);
  const [invitingEmail, setInvitingEmail] = useState<string | null>(null);
  const [activeBreakouts, setActiveBreakouts] = useState<Record<string, {roomId: string, invitee: string}>>({});
  
  const inviteMenuRef = useRef<HTMLDivElement>(null);
  const breakoutsMenuRef = useRef<HTMLDivElement>(null);
  
  // Handle clicks outside of menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close invite menu if click outside
      if (showInviteMenu && 
          inviteMenuRef.current && 
          !inviteMenuRef.current.contains(event.target as Node)) {
        setShowInviteMenu(false);
      }
      
      // Close breakouts menu if click outside
      if (showBreakoutsMenu && 
          breakoutsMenuRef.current && 
          !breakoutsMenuRef.current.contains(event.target as Node)) {
        setShowBreakoutsMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInviteMenu, showBreakoutsMenu]);
  
  // Get actual LiveKit participants
  const participants = useParticipants();
  
  // Add Convex mutation to send invitations
  const sendInvite = useMutation(api.breakout.sendBreakoutInvite);
  const generateBreakoutToken = useAction(api.breakoutActions.generateBreakoutRoomToken);
  
  // Monitor sent invitations that have been accepted
  const sentInvites = useQuery(api.breakout.getMySentInvites, { includeExpired: false });
  
  // We need to get the full user data by email when sending invites
  // This will return null when invitingEmail is null
  const userToInvite = useQuery(
    api.breakout.getUserByEmail, 
    invitingEmail ? { email: invitingEmail } : "skip"
  );
  
  // Check if user is admin or team member
  const canInviteToBreakout = isAuthenticated && 
    currentUser && 
    (currentUser.role === 'admin' || currentUser.role === 'user');
  
  // Filter to only include client participants
  const clientParticipants = participants.filter(participant => {
    try {
      if (!participant.metadata) return false;
      const metadata = JSON.parse(participant.metadata);
      return metadata.role === 'client';
    } catch (e) {
      console.error('Error parsing metadata:', e);
      return false;
    }
  });
  
  // Check sent invitations for accepted ones and track them
  useEffect(() => {
    if (sentInvites) {
      const acceptedInvites = sentInvites.filter(invite => invite.status === "accept");
      
      if (acceptedInvites.length > 0) {
        console.log("Found accepted invitations:", acceptedInvites);
        
        // Update our active breakout rooms
        const newActiveBreakouts: Record<string, {roomId: string, invitee: string}> = {};
        
        acceptedInvites.forEach(invite => {
          newActiveBreakouts[invite._id.toString()] = {
            roomId: invite.roomId,
            invitee: invite.invitee.name !== "Unknown" ? invite.invitee.name : invite.invitee.email
          };
        });
        
        setActiveBreakouts(newActiveBreakouts);
      }
    }
  }, [sentInvites]);
  
  // Function to join a breakout room as admin/team member
  const joinBreakoutRoom = async (roomId: string) => {
    try {
      console.log("Joining breakout room", roomId);
      const token = await generateBreakoutToken({ roomId });
      console.log("Admin/team token generated successfully");
      
      // Disconnect from the Arena before opening breakout room
      if (room) {
        console.log("Disconnecting from Arena");
        await room.disconnect();
      }
      
      // Open the breakout room in a new window
      const breakoutUrl = `/breakout?room=${roomId}&token=${encodeURIComponent(token)}`;
      window.open(breakoutUrl, '_blank');
      
      // Reload the page to reset state
      window.location.reload();
    } catch (error) {
      console.error("Error joining breakout room:", error);
      alert(`Error joining breakout: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  const handleLeave = () => {
    if (room) {
      void room.disconnect();
      // Force reload the page to reset the state
      window.location.reload();
    }
  };

  // Function to start the invitation process
  const startInvite = (email: string) => {
    setInvitingEmail(email);
  };

  // Watch for user data and send invite when it's available
  useEffect(() => {
    const sendInvitation = async () => {
      if (userToInvite && invitingEmail && currentUser) {
        try {
          // Generate a unique room name
          const roomName = `breakout-${Math.random().toString(36).substring(2, 7)}`;
          
          console.log("Sending invitation from", currentUser.name || currentUser.email);
          
          // Send the invitation
          await sendInvite({
            inviteeId: userToInvite._id as Id<"users">,
            roomName
          });
          
          // Close the menu after successful invitation
          setShowInviteMenu(false);
          setInvitingEmail(null);
          
          // Show success message
          alert(`Invitation sent to ${invitingEmail}`);
        } catch (error) {
          alert(`Error sending invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setInvitingEmail(null);
        }
      }
    };
    
    if (userToInvite && invitingEmail && currentUser) {
      void sendInvitation();
    }
  }, [userToInvite, invitingEmail, sendInvite, currentUser]);
  
  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-4 z-50">
      <ControlBar variation="minimal" className="bg-gray-800 bg-opacity-75 rounded-lg p-2" />
      
      {/* Active breakout rooms - only shown to admin/user roles */}
      {canInviteToBreakout && Object.keys(activeBreakouts).length > 0 && (
        <div className="relative mr-2">
          <button
            onClick={() => setShowBreakoutsMenu(!showBreakoutsMenu)}
            className="bg-green-500 hover:bg-green-600 text-white font-medium px-4 py-2 rounded-md relative"
          >
            Active Breakouts
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-5 h-5 flex items-center justify-center rounded-full">
              {Object.keys(activeBreakouts).length}
            </span>
          </button>
          
          {showBreakoutsMenu && (
            <div 
              ref={breakoutsMenuRef}
              className="absolute bottom-full mb-2 right-0 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 min-w-[220px] max-h-[300px] overflow-y-auto"
            >
              <h3 className="text-sm font-bold mb-2 border-b pb-1">Active Breakout Rooms</h3>
              <ul className="space-y-2">
                {Object.entries(activeBreakouts).map(([id, { roomId, invitee }]) => (
                  <li key={id} className="flex flex-col">
                    <span className="text-sm font-medium">Session with {invitee}</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">{roomId.slice(0, 10)}...</span>
                      <button
                        onClick={() => void joinBreakoutRoom(roomId)}
                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                      >
                        Join
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
      
      {/* Breakout room invitation controls - only shown to admin/user roles */}
      {canInviteToBreakout && (
        <div className="relative">
          <button
            onClick={() => setShowInviteMenu(!showInviteMenu)}
            className="bg-blue-500 hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md"
          >
            Breakout
          </button>
          
          {showInviteMenu && (
            <div 
              ref={inviteMenuRef}
              className="absolute bottom-full mb-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 min-w-[200px] max-h-[300px] overflow-y-auto"
            >
              <h3 className="text-sm font-bold mb-2 border-b pb-1">Invite to Breakout Room</h3>
              
              {clientParticipants.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400">No clients available to invite</p>
              ) : (
                <ul className="space-y-1">
                  {clientParticipants.map((participant) => {
                    const meta = participant.metadata ? JSON.parse(participant.metadata) : {};
                    const email = meta.email || participant.identity;
                    const isLoading = email === invitingEmail;
                    
                    return (
                      <li key={participant.sid} className="flex justify-between items-center">
                        <span className="text-sm">{meta.name || participant.identity}</span>
                        <button
                          className={`text-xs ${
                            isLoading ? 'bg-gray-500' : 'bg-blue-500 hover:bg-blue-600'
                          } text-white px-2 py-1 rounded`}
                          onClick={() => {
                            if (!isLoading && email) {
                              startInvite(email);
                            }
                          }}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Sending...' : 'Invite'}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
      
      <button 
        onClick={handleLeave}
        className="bg-red-500 hover:bg-red-600 text-white font-medium px-4 py-2 rounded-md"
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
          {/* Also keep it inside LiveKitRoom in case this is required for proper LiveKit context */}
          <BreakoutNotifierWithContext />
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