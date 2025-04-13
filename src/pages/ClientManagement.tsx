import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type EditingClient = {
  _id: Id<"adminClientList">;
  email: string;
  name?: string;
  notes?: string;
};

type DeleteConfirmType = {
  id: Id<"adminClientList">;
  email: string;
};

export default function ClientManagement() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [editingClient, setEditingClient] = useState<EditingClient | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmType | null>(null);

  // Fetch clients
  const addPotentialClient = useMutation(api.clients.addPotentialClient);
  const updateClientStatus = useMutation(api.clients.updateClientStatus);
  const updatePotentialClient = useMutation(api.clients.updatePotentialClient);
  const deletePotentialClient = useMutation(api.clients.deletePotentialClient);
  const clientsData = useQuery(api.clients.getPotentialClients);
  
  // Form submission handler for adding a new client
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    try {
      const result = await addPotentialClient({
        email: email.trim(),
        name: name.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      
      setSuccess(result.message);
      setEmail("");
      setName("");
      setNotes("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add potential client");
    }
  };

  // Handle editing a client
  const handleEdit = (client: EditingClient) => {
    setEditingClient(client);
    setError(null);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingClient(null);
    setError(null);
  };

  // Save edited client
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    try {
      setError(null);
      const result = await updatePotentialClient({
        clientId: editingClient._id,
        email: editingClient.email,
        name: editingClient.name,
        notes: editingClient.notes,
      });
      
      setSuccess(result.message);
      setEditingClient(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update potential client");
    }
  };

  // Handle deleting a client
  const handleDelete = async (clientId: Id<"adminClientList">) => {
    try {
      setError(null);
      const result = await deletePotentialClient({ clientId });
      setSuccess(result.message);
      setShowDeleteConfirm(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete potential client");
      setShowDeleteConfirm(null);
    }
  };

  // Update client status
  const handleStatusUpdate = async (clientId: Id<"adminClientList">, status: string) => {
    try {
      const result = await updateClientStatus({ clientId, status });
      setSuccess(result.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Potential Clients Management</h1>
      
      {/* Edit Client Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Edit Potential Client</h2>
            
            <form onSubmit={(e) => { void handleSaveEdit(e); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={editingClient.email}
                  onChange={(e) => setEditingClient({...editingClient, email: e.target.value})}
                  className="w-full p-2 border rounded bg-light dark:bg-dark text-dark dark:text-light"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={editingClient.name || ""}
                  onChange={(e) => setEditingClient({...editingClient, name: e.target.value || undefined})}
                  className="w-full p-2 border rounded bg-light dark:bg-dark text-dark dark:text-light"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  value={editingClient.notes || ""}
                  onChange={(e) => setEditingClient({...editingClient, notes: e.target.value || undefined})}
                  className="w-full p-2 border rounded bg-light dark:bg-dark text-dark dark:text-light"
                  rows={3}
                />
              </div>
              
              <div className="flex space-x-2 pt-2">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                >
                  Save Changes
                </button>
                
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-red-600">Confirm Delete</h2>
            
            <p className="mb-4">
              Are you sure you want to delete potential client <span className="font-bold">{showDeleteConfirm.email}</span>?
            </p>
            
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => { void handleDelete(showDeleteConfirm.id); }}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Delete
              </button>
              
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-8">
        <h2 className="text-2xl font-bold mb-4">Add Potential Client</h2>
        
        <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border rounded bg-light dark:bg-dark text-dark dark:text-light"
              placeholder="client@example.com"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded bg-light dark:bg-dark text-dark dark:text-light"
              placeholder="John Doe"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border rounded bg-light dark:bg-dark text-dark dark:text-light"
              placeholder="Additional information about the client"
              rows={3}
            />
          </div>
          
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Potential Client
          </button>
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
              {success}
            </div>
          )}
        </form>
      </div>
      
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-4">Current Potential Clients</h2>
        
        {!clientsData || clientsData.length === 0 ? (
          <p className="text-gray-500">No potential clients added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Date Added</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clientsData.map((client) => (
                  <tr key={client._id} className="border-b dark:border-gray-700">
                    <td className="px-4 py-2">{client.email}</td>
                    <td className="px-4 py-2">{client.name || "-"}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        client.status === "active" 
                          ? "bg-green-200 text-green-800" 
                          : "bg-yellow-200 text-yellow-800"
                      }`}>
                        {client.status}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {new Date(client.dateAdded).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEdit(client)}
                          className="bg-blue-500 text-white px-2 py-1 text-xs rounded"
                        >
                          Edit
                        </button>
                        
                        <button 
                          onClick={() => setShowDeleteConfirm({ id: client._id, email: client.email })}
                          className="bg-red-500 text-white px-2 py-1 text-xs rounded"
                        >
                          Delete
                        </button>
                        
                        <button 
                          onClick={() => { 
                            void handleStatusUpdate(
                              client._id, 
                              client.status === "active" ? "invited" : "active"
                            ); 
                          }}
                          className="bg-gray-500 text-white px-2 py-1 text-xs rounded"
                        >
                          Toggle Status
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 