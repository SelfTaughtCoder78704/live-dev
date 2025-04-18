import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";

type BreakoutSession = {
  _id: { toString: () => string };
  roomId: string;
  timestamp?: number;
  status?: string;
};

type ActiveBreakoutSessionsProps = {
  userRole: string | null;
  clientActiveBreakouts?: BreakoutSession[];
  sentInvites?: BreakoutSession[];
};

export default function ActiveBreakoutSessions({
  userRole,
  clientActiveBreakouts,
  sentInvites,
}: ActiveBreakoutSessionsProps) {
  const generateBreakoutToken = useAction(api.breakoutActions.generateBreakoutRoomToken);
  const [isJoining, setIsJoining] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  // Function to join a breakout room
  const joinBreakoutRoom = async (roomId: string, inviteId: string) => {
    try {
      setIsJoining(prev => ({ ...prev, [inviteId]: true }));
      
      // Generate token and open the room
      const token = await generateBreakoutToken({ roomId });
      
      // Create the breakout URL
      const breakoutUrl = `/breakout?room=${roomId}&token=${encodeURIComponent(token)}`;
      
      // Use navigate instead of window.open
      void navigate(breakoutUrl);
    } catch (error) {
      console.error("Error joining breakout room:", error);
      alert(`Error joining breakout: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsJoining(prev => ({ ...prev, [inviteId]: false }));
    }
  };

  // Check if there are active breakouts
  const hasActiveBreakouts = 
    (userRole === 'client' && clientActiveBreakouts && clientActiveBreakouts.length > 0) ||
    (userRole !== 'client' && sentInvites && sentInvites.filter(i => i.status === "accept" || i.status === "ongoing").length > 0);

  if (!hasActiveBreakouts) {
    return null;
  }

  return (
    <div className="bg-green-100 dark:bg-green-800 p-4 rounded-md border border-green-300 dark:border-green-700">
      <h2 className="text-xl font-bold mb-2">Active Breakout Sessions</h2>
      <div className="space-y-2">
        {userRole === 'client' && clientActiveBreakouts && clientActiveBreakouts.map(breakout => (
          <div key={breakout._id.toString()} className="flex items-center justify-between bg-white dark:bg-gray-700 p-2 rounded">
            <div>
              <p className="font-medium">Active Breakout Session</p>
              {breakout.timestamp && (
                <p className="text-xs text-gray-500">
                  Created {new Date(breakout.timestamp).toLocaleString()}
                </p>
              )}
            </div>
            <button
              onClick={() => void joinBreakoutRoom(breakout.roomId, breakout._id.toString())}
              disabled={isJoining[breakout._id.toString()]}
              className={`${
                isJoining[breakout._id.toString()] ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
              } text-white px-3 py-1 rounded text-sm`}
            >
              {isJoining[breakout._id.toString()] ? 'Joining...' : 'Rejoin Session'}
            </button>
          </div>
        ))}
        
        {userRole !== 'client' && sentInvites && sentInvites
          .filter(invite => invite.status === "accept" || invite.status === "ongoing")
          .map(invite => (
            <div key={invite._id.toString()} className="flex items-center justify-between bg-white dark:bg-gray-700 p-2 rounded">
              <div>
                <p className="font-medium">Active Breakout Session</p>
                <span className={`text-xs ${
                  invite.status === "ongoing" ? "text-green-600 dark:text-green-400" : "text-gray-500"
                }`}>
                  {invite.status === "ongoing" ? "In Progress" : "Accepted"}
                  {invite.timestamp && ` • ${new Date(invite.timestamp).toLocaleString()}`}
                </span>
              </div>
              <button
                onClick={() => void joinBreakoutRoom(invite.roomId, invite._id.toString())}
                disabled={isJoining[invite._id.toString()]}
                className={`${
                  isJoining[invite._id.toString()] ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                } text-white px-3 py-1 rounded text-sm`}
              >
                {isJoining[invite._id.toString()] ? 'Joining...' : 'Rejoin Session'}
              </button>
            </div>
          ))
        }
      </div>
    </div>
  );
} 