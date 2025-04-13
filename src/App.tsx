"use client";

import {
  useConvexAuth,
  useMutation,
  useQuery,
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

  return (
    <div className="flex flex-col gap-8 max-w-lg mx-auto p-8">
      <h1 className="text-4xl font-bold">Dashboard</h1>
      <p>Welcome {dashboardInfo.name || dashboardInfo.viewer || "Anonymous"}!</p>
      
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

