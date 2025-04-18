"use client";

import {
  useConvexAuth,
  useMutation,
  useQuery,
} from "convex/react";
import { api } from "../convex/_generated/api";
import { Routes, Route, Navigate } from "react-router-dom";
import Home from "./pages/Home";
import TeamSignIn from "./pages/TeamSignIn";
import ClientSignIn from "./pages/ClientSignIn";
import TeamManagement from "./pages/TeamManagement";
import ClientManagement from "./pages/ClientManagement";
import Arena from "./pages/Arena";
import Breakout from "./pages/Breakout";
import Header from "./components/Header";
import Dashboard from "./components/dashboard/Dashboard";
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
      <Header userRole={userRole} isAuthenticated={isAuthenticated} />
      
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
            isAuthenticated ? <Dashboard userRole={userRole} /> : <Navigate to="/team-signin" />
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

