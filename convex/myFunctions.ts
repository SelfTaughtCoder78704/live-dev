import { v } from "convex/values";
import { query, mutation, action } from "./_generated/server";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

// Write your Convex functions in any file inside this directory (`convex`).
// See https://docs.convex.dev/functions for more.



// Example dashboard info query
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
      notes: null as string | null
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
