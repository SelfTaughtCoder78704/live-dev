import { useState, useEffect, useCallback, useMemo } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

type EditingMember = {
  _id: Id<"adminTeamList">;
  email: string;
  name?: string;
  role?: string;
};

type DeleteConfirmType = {
  id: Id<"adminTeamList">;
  email: string;
  isRegistered: boolean;
};

export default function TeamManagement() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("user");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<EditingMember | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<DeleteConfirmType | null>(null);
  const [deleteUserAccount, setDeleteUserAccount] = useState(false);

  // Fetch team members and registered users
  const addTeamMember = useMutation(api.users.addTeamMember);
  const updateTeamMemberStatus = useMutation(api.users.updateTeamMemberStatus);
  const updateTeamMember = useMutation(api.users.updateTeamMember);
  const deleteTeamMemberComplete = useMutation(api.users.deleteTeamMemberComplete);
  const synchronizeRoles = useMutation(api.users.synchronizeUserRoles);
  const teamMembersData = useQuery(api.users.getTeamMembers);
  const usersData = useQuery(api.users.getAllUsers);
  
  // Memoize the data to prevent unnecessary re-renders
  const teamMembers = useMemo(() => teamMembersData || [], [teamMembersData]);
  const users = useMemo(() => usersData || [], [usersData]);

  // Form submission handler for adding a new team member
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    try {
      await addTeamMember({
        email: email.trim(),
        name: name.trim() || undefined,
        role: role || undefined,
      });
      setSuccess(`Added ${email} to the team successfully`);
      setEmail("");
      setName("");
      setRole("user");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add team member");
    }
  };

  // Handle editing a team member
  const handleEdit = (member: EditingMember) => {
    setEditingMember(member);
    setError(null);
  };

  // Cancel editing
  const handleCancelEdit = () => {
    setEditingMember(null);
    setError(null);
  };

  // Save edited team member
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMember) return;

    try {
      setError(null);
      const result = await updateTeamMember({
        teamMemberId: editingMember._id,
        email: editingMember.email,
        name: editingMember.name,
        role: editingMember.role,
      });
      
      setSuccess(result.message);
      setEditingMember(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update team member");
    }
  };

  // Handle deleting a team member
  const handleDelete = async (teamMemberId: Id<"adminTeamList">) => {
    try {
      setError(null);
      const result = await deleteTeamMemberComplete({ 
        teamMemberId, 
        deleteUserAccount 
      });
      setSuccess(result.message);
      setShowDeleteConfirm(null);
      setDeleteUserAccount(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete team member");
      setShowDeleteConfirm(null);
      setDeleteUserAccount(false);
    }
  };

  // Handle role synchronization
  const handleSyncRoles = useCallback(async () => {
    try {
      setSyncMessage("Synchronizing roles...");
      const result = await synchronizeRoles();
      setSyncMessage(result.message);
    } catch (err) {
      setSyncMessage(err instanceof Error ? err.message : "Failed to synchronize roles");
    }
    
    // Clear message after 5 seconds
    setTimeout(() => {
      setSyncMessage(null);
    }, 5000);
  }, [synchronizeRoles]);

  // Update a team member's status
  const handleStatusUpdate = useCallback(async (teamMemberId: Id<"adminTeamList">, status: string) => {
    try {
      await updateTeamMemberStatus({ teamMemberId, status });
      setSuccess("Team member status updated successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }, [updateTeamMemberStatus, setSuccess, setError]);

  // Check if the team member has registered and get user info
  const getTeamMemberUser = useCallback((email: string) => {
    const registeredUser = users.find(user => user.email === email);
    return registeredUser || null;
  }, [users]);

  // Get team member status
  const getTeamMemberStatus = useCallback((email: string) => {
    const isRegistered = users.some(user => user.email === email);
    return isRegistered ? "active" : "invited";
  }, [users]);

  // Auto-update status when a user registers
  useEffect(() => {
    // Only proceed if we have both data sets
    if (teamMembers.length === 0 || users.length === 0) return;
    
    // Find team members who are in users list but still marked as invited
    const needsUpdate = teamMembers.filter(member => 
      member.status === "invited" && 
      users.some(user => user.email === member.email)
    );
    
    // Update their status to active
    needsUpdate.forEach(member => {
      void handleStatusUpdate(member._id, "active");
    });
  }, [teamMembers, users, handleStatusUpdate]);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-4xl font-bold mb-8">Team Management</h1>
      
      {/* Edit Member Modal */}
      {editingMember && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4">Edit Team Member</h2>
            
            <form onSubmit={(e) => { void handleSaveEdit(e); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={editingMember.email}
                  onChange={(e) => setEditingMember({...editingMember, email: e.target.value})}
                  className="w-full p-2 border rounded bg-light dark:bg-dark text-dark dark:text-light"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={editingMember.name || ""}
                  onChange={(e) => setEditingMember({...editingMember, name: e.target.value || undefined})}
                  className="w-full p-2 border rounded bg-light dark:bg-dark text-dark dark:text-light"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={editingMember.role || "user"}
                  onChange={(e) => setEditingMember({...editingMember, role: e.target.value})}
                  className="w-full p-2 border rounded bg-light dark:bg-dark text-dark dark:text-light"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
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
              Are you sure you want to delete team member <span className="font-bold">{showDeleteConfirm.email}</span>?
            </p>
            
            {showDeleteConfirm.isRegistered && (
              <div className="mb-4">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={deleteUserAccount}
                    onChange={(e) => setDeleteUserAccount(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-red-600"
                  />
                  <span className="text-red-600 font-medium">
                    Also delete user account (will remove authentication data)
                  </span>
                </label>
                <p className="text-sm mt-1 text-gray-600 dark:text-gray-400">
                  This user has registered an account. You can delete both their team membership and user account.
                </p>
              </div>
            )}
            
            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => { void handleDelete(showDeleteConfirm.id); }}
                className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600"
              >
                Delete
              </button>
              
              <button
                onClick={() => {
                  setShowDeleteConfirm(null);
                  setDeleteUserAccount(false);
                }}
                className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Add Team Member</h2>
          <button
            type="button"
            onClick={() => { void handleSyncRoles(); }}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600"
          >
            Sync User Roles
          </button>
        </div>
        
        {syncMessage && (
          <div className="bg-purple-100 border border-purple-400 text-purple-700 px-4 py-3 rounded mb-4">
            {syncMessage}
          </div>
        )}
        
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
              placeholder="team.member@example.com"
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
              Role
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full p-2 border rounded bg-light dark:bg-dark text-dark dark:text-light"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Add Team Member
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
        <h2 className="text-2xl font-bold mb-4">Current Team Members</h2>
        
        {teamMembers.length === 0 ? (
          <p className="text-gray-500">No team members added yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-100 dark:bg-gray-700">
                  <th className="px-4 py-2 text-left">Email</th>
                  <th className="px-4 py-2 text-left">Name</th>
                  <th className="px-4 py-2 text-left">Role</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => {
                  // Determine real-time status
                  const realStatus = getTeamMemberStatus(member.email);
                  const needsUpdate = realStatus !== member.status;
                  const user = getTeamMemberUser(member.email);
                  const roleSync = user ? (user.role === member.role) : true;
                  
                  return (
                    <tr key={member._id} className="border-b dark:border-gray-700">
                      <td className="px-4 py-2">{member.email}</td>
                      <td className="px-4 py-2">{member.name || "-"}</td>
                      <td className="px-4 py-2">
                        {member.role || "user"}
                        {!roleSync && user && (
                          <span className="ml-2 bg-orange-200 text-orange-800 px-2 py-1 text-xs rounded-full">
                            User: {user.role}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          member.status === "active" 
                            ? "bg-green-200 text-green-800" 
                            : "bg-yellow-200 text-yellow-800"
                        }`}>
                          {member.status}
                          {needsUpdate && " (updating...)"}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex space-x-2">
                          <button 
                            onClick={() => handleEdit(member)}
                            className="bg-blue-500 text-white px-2 py-1 text-xs rounded"
                          >
                            Edit
                          </button>
                          
                          <button 
                            onClick={() => setShowDeleteConfirm({ id: member._id, email: member.email, isRegistered: users.some(u => u.email === member.email) })}
                            className="bg-red-500 text-white px-2 py-1 text-xs rounded"
                          >
                            Delete
                          </button>
                          
                          {needsUpdate ? (
                            <button 
                              onClick={() => { void handleStatusUpdate(member._id, realStatus); }}
                              className="bg-blue-500 text-white px-2 py-1 text-xs rounded"
                            >
                              Update Status
                            </button>
                          ) : (
                            <button 
                              onClick={() => { 
                                void handleStatusUpdate(
                                  member._id, 
                                  member.status === "active" ? "invited" : "active"
                                ); 
                              }}
                              className="bg-gray-500 text-white px-2 py-1 text-xs rounded"
                            >
                              Toggle Status
                            </button>
                          )}
                          
                          {!roleSync && user && (
                            <button 
                              onClick={() => { void handleSyncRoles(); }}
                              className="bg-orange-500 text-white px-2 py-1 text-xs rounded"
                            >
                              Sync Role
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
} 