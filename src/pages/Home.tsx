import { Link } from "react-router-dom";
import { useConvexAuth } from "convex/react";

export default function Home() {
  const { isAuthenticated } = useConvexAuth();
  
  return (
    <div className="p-8 flex flex-col gap-8 items-center">
      <h1 className="text-4xl font-bold">Home</h1>
      <p>Welcome to our application!</p>
      {isAuthenticated && (
        <Link 
          to="/dashboard"
          className="bg-dark dark:bg-light text-light dark:text-dark px-4 py-2 rounded-md"
        >
          Go to Dashboard
        </Link>
      )}
    </div>
  );
} 