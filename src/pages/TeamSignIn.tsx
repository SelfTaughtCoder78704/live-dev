import { useState, useEffect } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Link } from "react-router-dom";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function TeamSignIn() {
  return (
    <div className="p-8 flex flex-col gap-8 items-center">
      <div className="flex flex-col items-center">
        <h1 className="text-4xl font-bold text-blue-600 dark:text-blue-400">Team SignIn</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">For authorized team members only</p>
      </div>
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-lg shadow-lg p-6 border-t-4 border-blue-600">
        <SignInForm />
      </div>
      <Link 
        to="/" 
        className="text-blue-600 dark:text-blue-400 underline hover:no-underline"
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
  
  // System status queries
  const hasAdmin = useQuery(api.users.adminExists) || false;
  const teamMembersExist = useQuery(api.users.teamMembersExist) || false;
  
  // Only run these queries when we have an email
  const isInTeamList = useQuery(
    api.users.checkEmailInTeamList,
    email.trim() ? { email: email.trim() } : "skip"
  );
  
  // Check if the email is a registered client (wrong portal)
  const isRegisteredClient = useQuery(
    api.users.isRegisteredClient,
    email.trim() ? { email: email.trim() } : "skip"
  );
  
  // Clear wrong portal message when email changes
  useEffect(() => {
    if (email.trim() === "") {
      setWrongPortal(null);
    }
  }, [email]);
  
  // Determine if signup should be visible at all
  const showSignUpOption = !hasAdmin || teamMembersExist;
  
  // Force sign-in flow if signup is not available
  useEffect(() => {
    if (!showSignUpOption && flow === "signUp") {
      setFlow("signIn");
    }
  }, [showSignUpOption, flow]);

  // Handle sign in separately from sign up
  const handleSignIn = async () => {
    try {
      setIsChecking(true);
      setWrongPortal(null);
      
      // Check if this email is registered as a client
      if (isRegisteredClient === true) {
        setWrongPortal("client");
        setIsChecking(false);
        return;
      }
      
      // For sign-in, we should allow the attempt to proceed without pre-checking
      // The Convex backend will handle authentication correctly
      const formData = new FormData();
      formData.set("email", email);
      formData.set("password", password);
      formData.set("flow", "signIn");
      
      await signIn("password", formData);
    } catch (error) {
      // Handle specific errors with custom messages
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
      
      // Check if this email is registered as a client
      if (isRegisteredClient === true) {
        setWrongPortal("client");
        setIsChecking(false);
        return;
      }
      
      // First admin can always sign up
      if (!hasAdmin) {
        const formData = new FormData();
        formData.set("email", email);
        formData.set("password", password);
        formData.set("flow", "signUp");
        
        await signIn("password", formData);
        return;
      }
      
      // For subsequent users, check if email is in team list
      if (isInTeamList !== true) {
        setError("This email is not authorized to sign up. Please contact your administrator.");
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
  const emailCanSignUp = !hasAdmin || isInTeamList === true;
  
  // Display wrong portal message
  const renderWrongPortalMessage = () => {
    if (wrongPortal === "client") {
      return (
        <div className="bg-amber-100 border border-amber-400 text-amber-700 px-4 py-3 rounded flex flex-col gap-2">
          <p><strong>This appears to be a client account.</strong></p>
          <p>Please use the Client Access portal instead.</p>
          <Link 
            to="/client-signin" 
            className="bg-amber-500 hover:bg-amber-600 text-white px-3 py-1 rounded text-center"
          >
            Go to Client Login
          </Link>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex flex-col gap-8 w-96 mx-auto">
      <p>Log in to access your team's content</p>
      
      {/* Wrong portal message */}
      {renderWrongPortalMessage()}
      
      {/* Registration status messages */}
      {!hasAdmin && (
        <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded">
          No admin has registered yet. The first user to sign up will become admin.
        </div>
      )}
      
      {hasAdmin && !teamMembersExist && (
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
          Registration is currently closed. Please contact an administrator for access.
        </div>
      )}
      
      {/* Show email verification status when typing in signup mode */}
      {flow === "signUp" && hasAdmin && email && !wrongPortal && (
        <div className={isInTeamList === true 
          ? "bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded" 
          : "bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded"}>
          {isInTeamList === true
            ? "✓ Email verified. You can sign up."
            : "⚠️ Email not found in team list. Please contact your administrator."}
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
            className="bg-dark dark:bg-light text-light dark:text-dark rounded-md p-2"
            type="submit"
            disabled={isChecking || (flow === "signUp" && hasAdmin && !emailCanSignUp)}
          >
            {isChecking ? "Checking..." : flow === "signIn" ? "Sign in" : "Sign up"}
          </button>
          
          {/* Only show sign-up/sign-in toggle when appropriate */}
          {(showSignUpOption || flow === "signIn") && (
            <div className="flex flex-row gap-2">
              <span>
                {flow === "signIn"
                  ? "Don't have an account?"
                  : "Already have an account?"}
              </span>
              <span
                className="text-dark dark:text-light underline hover:no-underline cursor-pointer"
                onClick={() => {
                  setError(null);
                  setFlow(flow === "signIn" ? "signUp" : "signIn");
                }}
              >
                {flow === "signIn" ? "Sign up instead" : "Sign in instead"}
              </span>
            </div>
          )}
          
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