import { useState } from 'react';
import { useAction, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Id } from '../../convex/_generated/dataModel';
import { useConvexAuth } from 'convex/react';
import { useRoomContext } from '@livekit/components-react';

export default function ClientActiveBreakouts() {
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(api.users.getCurrentUser);
  const activeBreakouts = useQuery(api.breakout.getMyActiveBreakouts);
  const generateBreakoutToken = useAction(api.breakoutActions.generateBreakoutRoomToken);
  const [isJoining, setIsJoining] = useState<Record<string, boolean>>({});
  const room = useRoomContext();
  
  // Only show for authenticated clients with active breakouts
  if (!isAuthenticated || !currentUser || currentUser.role !== 'client' || !activeBreakouts || activeBreakouts.length === 0) {
    return null;
  }
  
  const joinBreakoutRoom = async (roomId: string, inviteId: Id<"breakoutInvites">) => {
    try {
      setIsJoining(prev => ({ ...prev, [inviteId]: true }));
      
      // Generate token and open the room
      const token = await generateBreakoutToken({ roomId });
      
      // Disconnect from the Arena before opening breakout room
      if (room) {
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
    } finally {
      setIsJoining(prev => ({ ...prev, [inviteId]: false }));
    }
  };
  
  return (
    <div className="fixed bottom-24 left-4 z-40">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-3 max-w-xs">
        <h3 className="text-sm font-bold mb-2 border-b pb-1">Your Active Breakout Rooms</h3>
        <ul className="space-y-2">
          {activeBreakouts.map(breakout => (
            <li key={breakout._id.toString()} className="flex flex-col">
              <span className="text-sm font-medium">
                Session with {breakout.inviter.name !== "Unknown" 
                  ? breakout.inviter.name 
                  : breakout.inviter.email !== "Unknown" 
                    ? breakout.inviter.email 
                    : "Team Member"}
              </span>
              <button
                onClick={() => void joinBreakoutRoom(breakout.roomId, breakout._id)}
                disabled={isJoining[breakout._id.toString()]}
                className={`mt-1 text-xs ${
                  isJoining[breakout._id.toString()] 
                    ? 'bg-gray-400' 
                    : 'bg-blue-500 hover:bg-blue-600'
                } text-white px-2 py-1 rounded flex justify-center items-center`}
              >
                {isJoining[breakout._id.toString()] ? (
                  <>
                    <span className="animate-spin inline-block h-3 w-3 border-t-2 border-b-2 border-white rounded-full mr-1"></span>
                    Joining...
                  </>
                ) : 'Return to Breakout'}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
} 