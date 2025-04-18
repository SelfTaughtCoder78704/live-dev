type RoleSpecificInfoProps = {
  userRole: string | null;
};

export default function RoleSpecificInfo({ userRole }: RoleSpecificInfoProps) {
  if (!userRole) return null;
  
  if (userRole === 'admin') {
    return (
      <div className="bg-blue-100 dark:bg-blue-800 p-4 rounded-md border border-blue-300 dark:border-blue-700">
        <p className="font-bold text-blue-800 dark:text-blue-100">Admin Controls</p>
        <p className="text-blue-700 dark:text-blue-200">You have admin privileges on this account.</p>
      </div>
    );
  }
  
  if (userRole === 'client') {
    return (
      <div className="bg-purple-100 dark:bg-purple-800 p-4 rounded-md border border-purple-300 dark:border-purple-700">
        <p className="font-bold text-purple-800 dark:text-purple-100">Client Account</p>
        <p className="text-purple-700 dark:text-purple-200">Thank you for being part of our community. You have access to our interactive features.</p>
      </div>
    );
  }
  
  return null;
} 