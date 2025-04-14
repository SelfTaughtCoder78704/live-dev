import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Create the standard authentication handlers
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});

// Internal mutation to assign a role based on whether this is the first user
export const assignInitialRole = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Get the user to check their email
    const user = await ctx.db.get(userId);
    if (!user) return; // Safety check

    // Check if there are any other users with roles
    const existingUsers = await ctx.db
      .query("users")
      .filter((q) => q.neq(q.field("role"), undefined))
      .collect();

    // If this is the first user, make them an admin
    if (existingUsers.length === 0) {
      await ctx.db.patch(userId, { role: "admin" });
      return;
    }

    // Check if there's a role assigned in the team list
    if (user.email) {
      const teamMember = await ctx.db
        .query("adminTeamList")
        .withIndex("by_email", (q) => q.eq("email", user.email as string))
        .unique();

      if (teamMember?.role) {
        // Use the role from team list
        await ctx.db.patch(userId, { role: teamMember.role });
        return;
      }
    }

    // Otherwise, make them a standard user
    await ctx.db.patch(userId, { role: "user" });
  },
});

// Function to check if a user is in the client list and assign the client role
export const checkAndAssignClientRole = internalMutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // Get the user to check their email
    const user = await ctx.db.get(userId);
    if (!user || !user.email) return false;

    // Check if the email is in the client list
    const client = await ctx.db
      .query("adminClientList")
      .withIndex("by_email", (q) => q.eq("email", user.email as string))
      .unique();

    if (client) {
      // Assign the client role
      await ctx.db.patch(userId, { role: "client" });

      // Update the client status to active
      await ctx.db.patch(client._id, { status: "active" });

      return true;
    }

    return false;
  },
});
