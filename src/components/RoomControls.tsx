import { useEffect, useState, useRef } from 'react';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useConvexAuth } from 'convex/react';
import { useRoomContext, useParticipants, ControlBar, useLocalParticipant } from '@livekit/components-react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { useNavigate } from 'react-router-dom';

export default function RoomControls() {
  const room = useRoomContext();
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const [showInviteMenu, setShowInviteMenu] = useState(false);
  const [showBreakoutsMenu, setShowBreakoutsMenu] = useState(false);
  const [invitingEmail, setInvitingEmail] = useState<string | null>(null);
  const [activeBreakouts, setActiveBreakouts] = useState<Record<string, {roomId: string, invitee: string, status: string}>>({});
  const [showTranscript, setShowTranscript] = useState(false);
  
  // Voice transcription
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    isMicrophoneAvailable,
  } = useSpeechRecognition();
  
  const updateAllowedToTranscribe = useMutation(api.myFunctions.updateAllowedToTranscribe);
  
  // Get local participant to check if microphone is enabled
  const { localParticipant } = useLocalParticipant();
  const isMicrophoneEnabled = localParticipant?.isMicrophoneEnabled;
  
  const inviteMenuRef = useRef<HTMLDivElement>(null);
  const breakoutsMenuRef = useRef<HTMLDivElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);
  
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
  }, [showInviteMenu, showBreakoutsMenu, showTranscript]);
  
  // Stop listening when component unmounts
  useEffect(() => {
    return () => {
      if (listening) {
        SpeechRecognition.stopListening();
        void updateAllowedToTranscribe({ allowedToTranscribe: false });
      }
    };
  }, [listening, updateAllowedToTranscribe]);
  
  // Get actual LiveKit participants
  const participants = useParticipants();
  
  // Add Convex mutation to send invitations
  const sendInvite = useMutation(api.breakout.sendBreakoutInvite);
  const generateBreakoutToken = useAction(api.breakoutActions.generateBreakoutRoomToken);
  const updateInvitationStatus = useMutation(api.breakout.updateInvitationStatus);
  
  // Get all invitations sent by this user
  const sentInvites = useQuery(api.breakout.getMySentInvites, {
    includeOngoing: true,
  });
  
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
      // Include both accepted and ongoing invitations
      const activeInvites = sentInvites.filter(invite => 
        invite.status === "accept" || invite.status === "ongoing"
      );
      
      if (activeInvites.length > 0) {
        console.log("Found active invitations:", activeInvites);
        
        // Update our active breakout rooms
        const newActiveBreakouts: Record<string, {roomId: string, invitee: string, status: string}> = {};
        
        activeInvites.forEach(invite => {
          newActiveBreakouts[invite._id.toString()] = {
            roomId: invite.roomId,
            invitee: invite.invitee.name !== "Unknown" ? invite.invitee.name : invite.invitee.email,
            status: invite.status
          };
        });
        
        setActiveBreakouts(newActiveBreakouts);
      }
    }
  }, [sentInvites]);
  
  // Add useNavigate hook
  const navigate = useNavigate();
  
  // Function to join a breakout room as admin/team member
  const joinBreakoutRoom = async (roomId: string) => {
    try {
      console.log("Joining breakout room", roomId);
      
      // Find the invitation for this room
      const inviteId = Object.entries(activeBreakouts).find(
        ([_, data]) => data.roomId === roomId
      )?.[0];
      
      if (inviteId) {
        // Update the invitation status to "ongoing"
        await updateInvitationStatus({
          inviteId: inviteId as any, // Need to cast to Id<"breakoutInvites">
          status: "ongoing"
        });
        
        console.log("Updated invitation status to ongoing");
      }
      
      // Generate token and open the room
      const token = await generateBreakoutToken({ roomId });
      console.log("Admin/team token generated successfully");
      
      // Disconnect from the Arena before opening breakout room
      if (room) {
        console.log("Disconnecting from Arena");
        await room.disconnect();
      }
      
      // Set flag that we'll be returning to Arena later
      sessionStorage.setItem('returning_from_breakout', 'true');
      
      // Create the breakout URL
      const breakoutUrl = `/breakout?room=${roomId}&token=${encodeURIComponent(token)}`;
      
      // Use navigate instead of window.open
      void navigate(breakoutUrl);
      
      // No need for page reload since we're navigating away
    } catch (error) {
      console.error("Error joining breakout room:", error);
      alert(`Error joining breakout: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };
  
  const handleLeave = () => {
    if (room) {
      void room.disconnect();
      // Navigate to homepage instead of reloading
      void navigate('/');
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
  
  // Show warning if browser doesn't support speech recognition
  if (!browserSupportsSpeechRecognition) {
    console.warn("Browser doesn't support speech recognition");
  }
  
  if (!isMicrophoneAvailable) {
    console.warn("Microphone is not available");
  }
  
  return (
    <div className="fixed bottom-4 left-0 right-0 flex justify-center gap-4 z-50">
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
          text-white font-medium px-4 py-2 rounded-md flex items-center
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
      
      {/* Transcript popup */}
      {showTranscript && (
        <div 
          ref={transcriptRef}
          className="absolute bottom-16 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 max-w-lg w-full"
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
                {Object.entries(activeBreakouts).map(([id, { roomId, invitee, status }]) => (
                  <li key={id} className="flex flex-col">
                    <span className="text-sm font-medium">Session with {invitee}</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className={`text-xs ${
                        status === "ongoing" 
                          ? "text-green-500" 
                          : "text-gray-500"
                      }`}>
                        {status === "ongoing" ? "In Progress" : "Waiting to Join"}
                      </span>
                      <button
                        onClick={() => void joinBreakoutRoom(roomId)}
                        className="text-xs bg-blue-500 hover:bg-blue-600 text-white px-2 py-1 rounded"
                      >
                        {status === "ongoing" ? "Rejoin" : "Join"}
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
            className="bg-blue-500 h-full hover:bg-blue-600 text-white font-medium px-4 py-2 rounded-md"
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