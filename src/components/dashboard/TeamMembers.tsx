import { Link } from "react-router-dom";

type TeamMember = {
  _id: string;
  name?: string;
  email: string;
  isRegistered: boolean;
};

type TeamMembersProps = {
  teamMembers: TeamMember[];
};

export default function TeamMembers({ teamMembers }: TeamMembersProps) {
  if (!teamMembers || teamMembers.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
        <h2 className="text-xl font-bold mb-4">Active Team Members</h2>
        <p className="text-gray-500">No team members added yet.</p>
        <div className="mt-4">
          <Link 
            to="/team-management" 
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            Manage Team →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
      <h2 className="text-xl font-bold mb-4">Active Team Members</h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-gray-200 dark:bg-gray-700">
              <th className="px-4 py-2 text-left">Name</th>
              <th className="px-4 py-2 text-left">Email</th>
              <th className="px-4 py-2 text-left">Status</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers.map((member) => (
              <tr key={member._id} className="border-b border-gray-300 dark:border-gray-700">
                <td className="px-4 py-2">{member.name || "—"}</td>
                <td className="px-4 py-2">{member.email}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                    member.isRegistered 
                      ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100" 
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                  }`}>
                    {member.isRegistered ? "Active" : "Invited"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <Link 
          to="/team-management" 
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          Manage Team →
        </Link>
      </div>
    </div>
  );
} 