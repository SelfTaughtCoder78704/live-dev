import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.

// Dashboard info query with team members and clients info
export const getDashboardInfo = query({
  args: {},
  handler: async (ctx) => {
    // Get current user info
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const email = user.email;
    let profileData = {
      viewer: email || null,
      role: user.role || null,
      name: user.name || null,
      profileType: null as string | null,
      dateAdded: null as number | null,
      status: null as string | null,
      notes: null as string | null,
      teamMembers: [] as any[],
      clients: [] as any[]
    };

    // If we have an email, check for additional profile data
    if (email) {
      // Check if user is a team member
      if (user.role === "admin" || user.role === "user") {
        const teamMember = await ctx.db
          .query("adminTeamList")
          .withIndex("by_email", (q) => q.eq("email", email))
          .unique();

        if (teamMember) {
          profileData = {
            ...profileData,
            profileType: "team",
            name: user.name || teamMember.name || null,
            status: teamMember.status,
            dateAdded: teamMember.dateAdded || null
          };
        }

        // If admin or user, fetch active team members (only admins can see all members)
        if (user.role === "admin") {
          const allTeamMembers = await ctx.db
            .query("adminTeamList")
            .collect();

          // Get all registered users to cross-reference with team members
          const allUsers = await ctx.db
            .query("users")
            .collect();

          const usersByEmail = new Map(
            allUsers.map(user => [user.email, user])
          );

          profileData.teamMembers = allTeamMembers.map(member => ({
            _id: member._id,
            email: member.email,
            name: member.name,
            role: member.role || "member",
            status: member.status,
            isRegistered: !!usersByEmail.get(member.email),
            dateAdded: member.dateAdded
          }));

          // Also fetch clients
          const allClients = await ctx.db
            .query("adminClientList")
            .collect();

          profileData.clients = allClients.map(client => ({
            _id: client._id,
            email: client.email,
            name: client.name,
            status: client.status,
            isRegistered: !!usersByEmail.get(client.email),
            dateAdded: client.dateAdded
          }));
        }
      }
      // Check if user is a client
      else if (user.role === "client") {
        const client = await ctx.db
          .query("adminClientList")
          .withIndex("by_email", (q) => q.eq("email", email))
          .unique();

        if (client) {
          profileData = {
            ...profileData,
            profileType: "client",
            name: user.name || client.name || null,
            status: client.status,
            dateAdded: client.dateAdded,
            notes: client.notes || null
          };
        }
      }
    }

    return profileData;
  },
});
