import { useState, useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function ClientSignIn() {
  return (
    <div className="p-8 flex flex-col gap-8 items-center">
      <div className="flex flex-col items-center">
        <h1 className="text-4xl font-bold text-purple-600 dark:text-purple-400">Client Access</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">For authorized clients only</p>
      </div>
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border-t-4 border-purple-600">
        <SignInForm />
      </div>
      <Link 
        to="/" 
        className="text-purple-600 dark:text-purple-400 underline hover:no-underline"
      >
        Back to Home
      </Link>
    </div>
  );
}

function SignInForm() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [wrongPortal, setWrongPortal] = useState<string | null>(null);
  
  // Check if any admins exist (required for the system to be functional)
  const hasAdmin = useQuery(api.users.adminExists) || false;
  
  // Check if the email is in the client list (only when we have an email)
  const isInClientList = useQuery(
    api.clients.checkEmailInClientList,
    email.trim() ? { email: email.trim() } : "skip"
  );
  
  // Check if the email is a registered team member (wrong portal)
  const isRegisteredTeamMember = useQuery(
    api.users.isRegisteredTeamMember,
    email.trim() ? { email: email.trim() } : "skip"
  );
  
  // Clear wrong portal message when email changes
  useEffect(() => {
    if (email.trim() === "") {
      setWrongPortal(null);
    }
  }, [email]);
  
  // Handle sign in separately from sign up
  const handleSignIn = async () => {
    try {
      setIsChecking(true);
      setWrongPortal(null);
      
      // Check if this email is registered as a team member
      if (isRegisteredTeamMember === true) {
        setWrongPortal("team");
        setIsChecking(false);
        return;
      }
      
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("flow", "signIn");
      
      await signIn("password", formData);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("InvalidAccountId") || 
            error.message.includes("Invalid identity") ||
            error.message.includes("doesn't exist")) {
          setError("Account not found. Please check your credentials or contact your administrator.");
        } else if (error.message.includes("password")) {
          setError("Incorrect password. Please try again.");
        } else {
          setError(error.message);
        }
      } else {
        setError("Failed to sign in. Please try again or contact support.");
      }
    } finally {
      setIsChecking(false);
    }
  };

  // Handle sign up separately
  const handleSignUp = async () => {
    try {
      setIsChecking(true);
      setWrongPortal(null);
      
      // Check if this email is registered as a team member
      if (isRegisteredTeamMember === true) {
        setWrongPortal("team");
        setIsChecking(false);
        return;
      }
      
      // Verify email is in client list
      if (isInClientList !== true) {
        setError("This email is not authorized to sign up. Please contact your administrator.");
        setIsChecking(false);
        return;
      }
      
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("flow", "signUp");
      
      await signIn("password", formData);
    } catch (error) {
      setError(error instanceof Error ? 
        error.message : "Failed to sign up");
    } finally {
      setIsChecking(false);
    }
  };
  
  // Main form submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (flow === "signIn") {
      void handleSignIn();
    } else {
      void handleSignUp();
    }
  };

  // Check if current email can sign up
  const emailCanSignUp = isInClientList === true;
  
  // Display wrong portal message
  const renderWrongPortalMessage = () => {
    if (wrongPortal === "team") {
      return (
        <div className="bg-indigo-100 border border-indigo-400 text-indigo-700 px-4 py-3 rounded flex flex-col gap-2">
          <p><strong>This appears to be a team member account.</strong></p>
          <p>Please use the Team SignIn portal instead.</p>
          <Link 
            to="/team-signin" 
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-3 py-1 rounded text-center"
          >
            Go to Team Login
          </Link>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-8 w-96 mx-auto">
      <p>Sign in to access premium features as a client</p>
      
      {/* Wrong portal message */}
      {renderWrongPortalMessage()}
      
      {/* Registration status messages */}
      {!hasAdmin && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          System setup is not complete. Please check back later.
        </div>
      )}
      
      {/* Email verification status */}
      {flow === "signUp" && hasAdmin && email && !wrongPortal && (
        <div className={isInClientList === true 
          ? "bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded" 
          : "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"}>
          {isInClientList === true
            ? "✓ Email verified. You can sign up."
            : "⚠️ Email not on the client list. Please contact an administrator."}
        </div>
      )}
      
      {/* Only show form if not redirecting to a different portal */}
      {!wrongPortal && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => handleSubmit(e)}
        >
          <input
            className="bg-light dark:bg-dark text-dark dark:text-light rounded-md p-2 border-2 border-slate-200 dark:border-slate-800"
            type="email"
            name="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            className="bg-light dark:bg-dark text-dark dark:text-light rounded-md p-2 border-2 border-slate-200 dark:border-slate-800"
            type="password"
            name="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            className="bg-purple-600 hover:bg-purple-700 text-white rounded-md p-2"
            type="submit"
            disabled={isChecking || (flow === "signUp" && !emailCanSignUp)}
          >
            {isChecking ? "Checking..." : flow === "signIn" ? "Sign in" : "Sign up"}
          </button>
          
          {/* Sign-up/sign-in toggle */}
          <div className="flex flex-row gap-2">
            <span>
              {flow === "signIn"
                ? "Don't have an account?"
                : "Already have an account?"}
            </span>
            <span
              className="text-purple-600 dark:text-purple-400 underline hover:no-underline cursor-pointer"
              onClick={() => {
                setError(null);
                setFlow(flow === "signIn" ? "signUp" : "signIn");
              }}
            >
              {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
            </span>
          </div>
          
          {error && (
            <div className="bg-red-500/20 border-2 border-red-500/50 rounded-md p-2">
              <p className="text-dark dark:text-light font-mono text-xs">
                Error: {error}
              </p>
            </div>
          )}
        </form>
      )}
    </div>
  );
} 