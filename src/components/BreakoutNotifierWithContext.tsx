import { useEffect, useState } from 'react';
import { useAction, useQuery, useMutation } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useConvexAuth } from 'convex/react';
import { useRoomContext } from '@livekit/components-react';

export default function BreakoutNotifierWithContext() {
  const { isAuthenticated } = useConvexAuth();
  const pendingInvites = useQuery(api.breakout.getMyPendingInvites);
  const respondToInvite = useMutation(api.breakout.respondToInvite);
  const generateBreakoutToken = useAction(api.breakoutActions.generateBreakoutRoomToken);
  const [isLoading, setIsLoading] = useState<Record<string, boolean>>({});
  const currentUser = useQuery(api.users.getCurrentUser);
  const [acceptedInvites, setAcceptedInvites] = useState<Record<string, boolean>>({});
  const [isDismissed, setIsDismissed] = useState(false);
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
  
  // If new invites come in, make the component visible again
  useEffect(() => {
    if (pendingInvites && pendingInvites.length > 0) {
      setIsDismissed(false);
    }
  }, [pendingInvites]);
  
  const handleDismiss = () => {
    setIsDismissed(true);
  };
  
  // If not showing the panel but we have invites, show a small indicator
  if (isDismissed && pendingInvites && pendingInvites.length > 0) {
    return (
      <div className="fixed bottom-24 right-4 z-40">
        <button
          onClick={() => setIsDismissed(false)}
          className="bg-blue-500 hover:bg-blue-600 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg"
          title="Show invitations"
        >
          <span className="relative">
            📩
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {pendingInvites.length}
            </span>
          </span>
        </button>
      </div>
    );
  }
  
  // Show placeholder if not authenticated or no invites but only for clients and when user data is available
  if (!isAuthenticated || isDismissed || ((!pendingInvites || pendingInvites.length === 0) && currentUser?.role !== 'client' && Object.keys(acceptedInvites).length === 0)) {
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
        // The invitation is now deleted from the database
        // Just update the UI to remove it locally
        
        // Note: The backend deletion will be reflected in the next query refresh,
        // but we can also remove it from the UI immediately to be responsive
        
        // No action needed here - the query will refresh and the invitation will no longer appear
      }
    } catch (error) {
      console.error("Error responding to invitation:", error);
      alert(error instanceof Error ? error.message : "Failed to respond to invitation");
    } finally {
      setIsLoading(prev => ({ ...prev, [inviteId]: false }));
    }
  };
  
  return (
    <div className="fixed bottom-24 right-4 z-40 flex flex-col gap-2 max-w-sm">
      <div className="flex justify-end mb-1">
        <button 
          onClick={handleDismiss}
          className="text-xs bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 px-2 py-1 rounded hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Dismiss
        </button>
      </div>
      
      {/* Make sure notifications flow upward from the bottom */}
      <div className="flex flex-col-reverse gap-2">
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
    </div>
  );
} 