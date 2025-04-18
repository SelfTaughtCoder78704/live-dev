import { Link } from "react-router-dom";
import { useConvexAuth } from "convex/react";
import SignOutButton from "./SignOutButton";

type HeaderProps = {
  userRole: string | null;
  isAuthenticated: boolean;
};

export default function Header({ userRole, isAuthenticated }: HeaderProps) {
  return (
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
  );
} 