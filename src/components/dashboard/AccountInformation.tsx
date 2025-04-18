type AccountInfoData = {
  viewer: string | null;
  role?: string | null;
  name?: string | null;
  profileType?: string | null;
  status?: string | null;
  dateAdded?: number | null;
  notes?: string | null;
};

type AccountInformationProps = {
  dashboardInfo: AccountInfoData;
};

export default function AccountInformation({ dashboardInfo }: AccountInformationProps) {
  // Format date if available
  const formattedDate = dashboardInfo.dateAdded 
    ? new Date(dashboardInfo.dateAdded).toLocaleDateString() 
    : "Not available";
    
  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
      <h2 className="text-xl font-bold mb-2">Account Information</h2>
      <div className="space-y-2">
        <p><span className="font-semibold">Email:</span> {dashboardInfo.viewer || "Not available"}</p>
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
  );
} 