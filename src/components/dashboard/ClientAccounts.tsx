import { Link } from "react-router-dom";

type Client = {
  _id: string;
  name?: string;
  email: string;
  isRegistered: boolean;
};

type ClientAccountsProps = {
  clients: Client[];
};

export default function ClientAccounts({ clients }: ClientAccountsProps) {
  if (!clients || clients.length === 0) {
    return (
      <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
        <h2 className="text-xl font-bold mb-4">Client Accounts</h2>
        <p className="text-gray-500">No clients added yet.</p>
        <div className="mt-4">
          <Link 
            to="/client-management" 
            className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
          >
            Manage Clients →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-md">
      <h2 className="text-xl font-bold mb-4">Client Accounts</h2>
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
            {clients.map((client) => (
              <tr key={client._id} className="border-b border-gray-300 dark:border-gray-700">
                <td className="px-4 py-2">{client.name || "—"}</td>
                <td className="px-4 py-2">{client.email}</td>
                <td className="px-4 py-2">
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                    client.isRegistered 
                      ? "bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100" 
                      : "bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100"
                  }`}>
                    {client.isRegistered ? "Active" : "Invited"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-4">
        <Link 
          to="/client-management" 
          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
        >
          Manage Clients →
        </Link>
      </div>
    </div>
  );
} 