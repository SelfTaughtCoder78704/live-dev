"use client";

import {
  useConvexAuth,
  useMutation,
  useQuery,
  useAction,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { useAuthActions } from "@convex-dev/auth/react";
import { Routes, Route, Navigate, Link } from "react-router-dom";
import Home from "./pages/Home";
import TeamSignIn from "./pages/TeamSignIn";
import ClientSignIn from "./pages/ClientSignIn";
import TeamManagement from "./pages/TeamManagement";
import ClientManagement from "./pages/ClientManagement";
import Arena from "./pages/Arena";
import Breakout from "./pages/Breakout";
import { useEffect, useState } from "react";

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const checkAndAssignRole = useMutation(api.users.checkAndAssignRole);
  const getUserRole = useQuery(api.users.getCurrentUserRole);
  
  // When authentication state changes, check and get the user's role
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      void checkAndAssignRole().then((role) => {
        if (role) setUserRole(role);
      });
    } else if (!isAuthenticated) {
      setUserRole(null);
    }
  }, [isAuthenticated, isLoading, checkAndAssignRole]);
  
  // Keep role updated from query
  useEffect(() => {
    if (getUserRole !== undefined) {
      setUserRole(getUserRole);
    }
  }, [getUserRole]);
  
  return (
    <>
      <header className="sticky top-0 z-10 bg-light dark:bg-dark p-4 border-b-2 border-slate-200 dark:border-slate-800 flex justify-between">
        <Link to="/" className="font-bold">
          Convex App
        </Link>
        <div className="flex gap-4 items-center">
          <Link to="/" className="hover:underline">
            Home
          </Link>
          <Link to="/arena" className="hover:underline">
            Arena
          </Link>
          {!isAuthenticated && (
            <>
              <Link to="/team-signin" className="hover:underline">
                Team SignIn
              </Link>
              <Link to="/client-signin" className="hover:underline">
                Client Access
              </Link>
            </>
          )}
          {isAuthenticated && (
            <Link to="/dashboard" className="hover:underline">
              Dashboard
            </Link>
          )}
          {isAuthenticated && userRole === 'admin' && (
            <>
              <Link to="/team-management" className="hover:underline">
                Team
              </Link>
              <Link to="/client-management" className="hover:underline">
                Clients
              </Link>
            </>
          )}
          {isAuthenticated && (
            <span className={`${
              userRole === 'admin' ? 'bg-blue-500' : 
              userRole === 'user' ? 'bg-green-500' : 
              userRole === 'client' ? 'bg-purple-500' : 'bg-gray-500'
            } text-white px-2 py-1 rounded text-xs`}>
              {userRole || 'Guest'}
            </span>
          )}
          <SignOutButton />
        </div>
      </header>
      
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/arena" element={<Arena />} />
        <Route path="/breakout" element={<Breakout />} />
        
        {/* Authentication routes */}
        <Route 
          path="/team-signin" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <TeamSignIn />
          } 
        />
        <Route 
          path="/client-signin" 
          element={
            isAuthenticated ? <Navigate to="/dashboard" /> : <ClientSignIn />
          } 
        />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={
            isAuthenticated ? <Content userRole={userRole} /> : <Navigate to="/team-signin" />
          }
        />
        <Route 
          path="/team-management" 
          element={
            isAuthenticated && userRole === 'admin' 
              ? <TeamManagement /> 
              : <Navigate to="/" />
          }
        />
        <Route 
          path="/client-management" 
          element={
            isAuthenticated && userRole === 'admin' 
              ? <ClientManagement /> 
              : <Navigate to="/" />
          }
        />
        
        {/* Redirect old signin path */}
        <Route path="/signin" element={<Navigate to="/team-signin" />} />
      </Routes>
    </>
  );
}

function SignOutButton() {
  const { isAuthenticated } = useConvexAuth();
  const { signOut } = useAuthActions();
  return (
    <>
      {isAuthenticated && (
        <button
          className="bg-slate-200 dark:bg-slate-800 text-dark dark:text-light rounded-md px-2 py-1"
          onClick={() => void signOut()}
        >
          Sign out
        </button>
      )}
    </>
  );
}

function Content({ userRole }: { userRole: string | null }) {
  const dashboardInfo = useQuery(api.myFunctions.getDashboardInfo);
  
  // Add queries for active breakout sessions
  const clientActiveBreakouts = useQuery(api.breakout.getMyActiveBreakouts);
  const sentInvites = useQuery(api.breakout.getMySentInvites, { includeOngoing: true });
  
  // Function to generate token and join breakout room
  const generateBreakoutToken = useAction(api.breakoutActions.generateBreakoutRoomToken);
  const [isJoining, setIsJoining] = useState<Record<string, boolean>>({});
  
  // Function to join a breakout room
  const joinBreakoutRoom = async (roomId: string, inviteId: string) => {
    try {
      setIsJoining(prev => ({ ...prev, [inviteId]: true }));
      
      // Generate token and open the room
      const token = await generateBreakoutToken({ roomId });
      
      // Open the breakout room in a new window
      const breakoutUrl = `/breakout?room=${roomId}&token=${encodeURIComponent(token)}`;
      window.open(breakoutUrl, '_blank');
    } catch (error) {
      console.error("Error joining breakout room:", error);
      alert(`Error joining breakout: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIsJoining(prev => ({ ...prev, [inviteId]: false }));
    }
  };

  if (!dashboardInfo) {
    return (
      <div className="mx-auto p-8">
        <p>loading... (consider a loading skeleton)</p>
      </div>
    );
  }

  // Format date if available
  const formattedDate = dashboardInfo.dateAdded 
    ? new Date(dashboardInfo.dateAdded).toLocaleDateString() 
    : "Not available";
    
  // Get active breakouts based on user role
  const hasActiveBreakouts = 
    (userRole === 'client' && clientActiveBreakouts && clientActiveBreakouts.length > 0) ||
    (userRole !== 'client' && sentInvites && sentInvites.filter(i => i.status === "accept" || i.status === "ongoing").length > 0);

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto p-8">
      <h1 className="text-4xl font-bold">Dashboard</h1>
      <p>Welcome {dashboardInfo.name || dashboardInfo.viewer || "Anonymous"}!</p>
      
      {/* Active Breakout Sessions Section */}
      {hasActiveBreakouts && (
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
      )}
      
      {/* Role-specific content */}
      {userRole === 'admin' && (
        <div className="bg-blue-100 dark:bg-blue-800 p-4 rounded-md border border-blue-300 dark:border-blue-700">
          <p className="font-bold text-blue-800 dark:text-blue-100">Admin Controls</p>
          <p className="text-blue-700 dark:text-blue-200">You have admin privileges on this account.</p>
        </div>
      )}
      
      {userRole === 'client' && (
        <div className="bg-purple-100 dark:bg-purple-800 p-4 rounded-md border border-purple-300 dark:border-purple-700">
          <p className="font-bold text-purple-800 dark:text-purple-100">Client Account</p>
          <p className="text-purple-700 dark:text-purple-200">Thank you for being part of our community. You have access to our interactive features.</p>
        </div>
      )}
      
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
        <h2 className="text-xl font-bold mb-2">Account Information</h2>
        <div className="space-y-2">
          <p><span className="font-semibold">Email:</span> {dashboardInfo.viewer}</p>
          <p><span className="font-semibold">Role:</span> {dashboardInfo.role || "Not assigned"}</p>
          <p><span className="font-semibold">Name:</span> {dashboardInfo.name || "Not provided"}</p>
          
          {dashboardInfo.profileType && (
            <>
              <p>
                <span className="font-semibold">Account Type:</span> 
                <span className={`${dashboardInfo.profileType === 'client' ? 'text-purple-600' : 'text-blue-600'} ml-1`}>
                  {dashboardInfo.profileType === 'client' ? 'Client' : 'Team Member'}
                </span>
              </p>
              {dashboardInfo.status && (
                <p><span className="font-semibold">Status:</span> {dashboardInfo.status}</p>
              )}
              {dashboardInfo.dateAdded && (
                <p><span className="font-semibold">Added on:</span> {formattedDate}</p>
              )}
            </>
          )}
          
          {/* Show notes for clients */}
          {dashboardInfo.profileType === 'client' && dashboardInfo.notes && (
            <div className="mt-2 border-t pt-2 border-gray-300 dark:border-gray-700">
              <p className="font-semibold mb-1">Notes:</p>
              <p className="text-sm italic">{dashboardInfo.notes}</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Only show team and client lists to admins */}
      {userRole === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Team Members Section */}
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
            <h2 className="text-xl font-bold mb-4">Active Team Members</h2>
            {dashboardInfo.teamMembers && dashboardInfo.teamMembers.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-200 dark:bg-gray-700">
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardInfo.teamMembers.map((member: any) => (
                      <tr key={member._id} className="border-b border-gray-300 dark:border-gray-700">
                        <td className="px-4 py-2">{member.name || "—"}</td>
                        <td className="px-4 py-2">{member.email}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                            member.isRegistered 
                              ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100" 
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                          }`}>
                            {member.isRegistered ? "Active" : "Invited"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No team members added yet.</p>
            )}
            <div className="mt-4">
              <Link 
                to="/team-management" 
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Manage Team →
              </Link>
            </div>
          </div>
          
          {/* Clients Section */}
          <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
            <h2 className="text-xl font-bold mb-4">Client Accounts</h2>
            {dashboardInfo.clients && dashboardInfo.clients.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-200 dark:bg-gray-700">
                      <th className="px-4 py-2 text-left">Name</th>
                      <th className="px-4 py-2 text-left">Email</th>
                      <th className="px-4 py-2 text-left">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dashboardInfo.clients.map((client: any) => (
                      <tr key={client._id} className="border-b border-gray-300 dark:border-gray-700">
                        <td className="px-4 py-2">{client.name || "—"}</td>
                        <td className="px-4 py-2">{client.email}</td>
                        <td className="px-4 py-2">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                            client.isRegistered 
                              ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100" 
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                          }`}>
                            {client.isRegistered ? "Active" : "Invited"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No clients added yet.</p>
            )}
            <div className="mt-4">
              <Link 
                to="/client-management" 
                className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
              >
                Manage Clients →
              </Link>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
        <h2 className="text-xl font-bold mb-2">Getting Started</h2>
        <p>
          This is your dashboard. You have access to features based on your role.
        </p>
        <div className="mt-4">
          <Link 
            to="/arena" 
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded inline-block"
          >
            Enter Live Arena
          </Link>
        </div>
      </div>
    </div>
  );
}

