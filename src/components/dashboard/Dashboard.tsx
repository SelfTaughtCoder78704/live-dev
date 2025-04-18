import { useQuery, useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import ActiveBreakoutSessions from "./ActiveBreakoutSessions";
import RoleSpecificInfo from "./RoleSpecificInfo";
import AccountInformation from "./AccountInformation";
import TeamMembers from "./TeamMembers";
import ClientAccounts from "./ClientAccounts";
import GettingStarted from "./GettingStarted";

type DashboardProps = {
  userRole: string | null;
};

export default function Dashboard({ userRole }: DashboardProps) {
  const dashboardInfo = useQuery(api.myFunctions.getDashboardInfo);
  
  // Add queries for active breakout sessions
  const clientActiveBreakouts = useQuery(api.breakout.getMyActiveBreakouts);
  const sentInvites = useQuery(api.breakout.getMySentInvites, { includeOngoing: true });
  
  if (!dashboardInfo) {
    return (
      <div className="mx-auto p-8">
        <p>loading... (consider a loading skeleton)</p>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto p-8">
      <h1 className="text-4xl font-bold">Dashboard</h1>
      <p>Welcome {dashboardInfo.name || dashboardInfo.viewer || "Anonymous"}!</p>
      
      <ActiveBreakoutSessions 
        userRole={userRole}
        clientActiveBreakouts={clientActiveBreakouts}
        sentInvites={sentInvites}
      />
      
      <RoleSpecificInfo userRole={userRole} />
      
      <AccountInformation dashboardInfo={dashboardInfo} />
      
      {userRole === 'admin' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <TeamMembers teamMembers={dashboardInfo.teamMembers || []} />
          <ClientAccounts clients={dashboardInfo.clients || []} />
        </div>
      )}
      
      <GettingStarted />
    </div>
  );
} 