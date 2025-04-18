import { Link } from "react-router-dom";

export default function GettingStarted() {
  return (
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
  );
} 