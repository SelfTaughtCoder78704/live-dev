import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";
import { QueryCtx, MutationCtx } from "./_generated/server";

// Helper query to get a role from team list for an email
export const getTeamMemberRole = query({
  args: { email: v.string() },
  handler: async (ctx, { email }): Promise<string | null> => {
    if (!email) return null;

    const teamMember = await ctx.db
      .query("adminTeamList")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    return teamMember?.role || null;
  }
});

// After a user signs in, check and assign their role
export const checkAndAssignRole = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get the user
    const user = await ctx.db.get(userId);

    // If user already has a role, just return it
    if (user && user.role) {
      return user.role;
    }

    // Check if there's a role set in the team list
    if (user && user.email) {
      // Get the role from team list using internal query
      const teamMember = await ctx.db
        .query("adminTeamList")
        .withIndex("by_email", (q) => q.eq("email", user.email as string))
        .unique();

      if (teamMember?.role) {
        // Use the role from team list
        await ctx.db.patch(userId, { role: teamMember.role });
        return teamMember.role;
      }

      // If not a team member, check if they're a client
      const isClient = await ctx.runMutation(internal.auth.checkAndAssignClientRole, {
        userId,
      });

      if (isClient) {
        // Role is now assigned, get updated user
        const updatedUser = await ctx.db.get(userId);
        return updatedUser?.role || null;
      }
    }

    // Otherwise, assign initial role
    await ctx.runMutation(internal.auth.assignInitialRole, { userId });

    // Get the updated user
    const updatedUser = await ctx.db.get(userId);
    return updatedUser?.role || null;
  },
});

// Get the current user's role
export const getCurrentUserRole = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    return user?.role || null;
  },
});

// Update a user's role (admin only)
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.string(),
  },
  handler: async (ctx, { userId, role }) => {
    // Check if current user is an admin
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const currentUser = await ctx.db.get(currentUserId);
    if (!currentUser || currentUser.role !== "admin") {
      throw new Error("Only admins can update roles");
    }

    // Update the target user's role
    await ctx.db.patch(userId, { role });
    return true;
  },
});

// Add a team member to the adminTeamList (admin only)
export const addTeamMember = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, { email, name, role }) => {
    // Check if current user is an admin
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can add team members");
    }

    // Check if email already exists in the team list
    const existingTeamMember = await ctx.db
      .query("adminTeamList")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existingTeamMember) {
      throw new Error("Team member with this email already exists");
    }

    // Add the team member to the list
    await ctx.db.insert("adminTeamList", {
      email,
      name,
      role,
      status: "invited",
      dateAdded: Date.now(),
      invitedBy: userId,
    });

    return true;
  },
});

// Get all team members from the adminTeamList
export const getTeamMembers = query({
  args: {},
  handler: async (ctx) => {
    // Check if current user is an admin
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      return [];
    }

    // Get all team members
    const teamMembers = await ctx.db
      .query("adminTeamList")
      .collect();

    return teamMembers;
  },
});

// Check if an email is in the team list (for authentication)
export const checkEmailInTeamList = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const teamMember = await ctx.db
      .query("adminTeamList")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    return !!teamMember;
  },
});

// Check if any admin exists in the system
export const adminExists = query({
  args: {},
  handler: async (ctx) => {
    const admins = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .take(1);

    return admins.length > 0;
  },
});

// Check if any team members exist (no auth check)
export const teamMembersExist = query({
  args: {},
  handler: async (ctx) => {
    const teamMembers = await ctx.db
      .query("adminTeamList")
      .take(1);

    return teamMembers.length > 0;
  },
});

// Get all users (admin only)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    // Check if current user is an admin
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      return [];
    }

    // Get all users
    const users = await ctx.db
      .query("users")
      .collect();

    return users.map(user => ({
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role
    }));
  },
});

// Update team member status
export const updateTeamMemberStatus = mutation({
  args: {
    teamMemberId: v.id("adminTeamList"),
    status: v.string(),
  },
  handler: async (ctx, { teamMemberId, status }) => {
    // Check if current user is an admin
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can update team member status");
    }

    // Update the team member's status
    await ctx.db.patch(teamMemberId, { status });
    return true;
  },
});

// Synchronize user roles with team list roles
export const synchronizeUserRoles = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if current user is an admin
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can synchronize user roles");
    }

    // Get all users
    const users = await ctx.db
      .query("users")
      .collect();

    // Get all team members
    const teamMembers = await ctx.db
      .query("adminTeamList")
      .collect();

    // Create a map of email to team member role for quick lookup
    const teamRoles = new Map();
    for (const member of teamMembers) {
      if (member.role) {
        teamRoles.set(member.email, member.role);
      }
    }

    // Update users whose roles don't match their team list role
    const updates = [];
    for (const user of users) {
      if (user.email && teamRoles.has(user.email)) {
        const teamRole = teamRoles.get(user.email);

        // Only update if the roles don't match and there's a team role
        if (teamRole && user.role !== teamRole) {
          updates.push(ctx.db.patch(user._id, { role: teamRole }));
        }
      }
    }

    // Execute all updates
    await Promise.all(updates);

    return {
      synchronized: updates.length,
      message: updates.length > 0
        ? `Synchronized ${updates.length} user roles`
        : "All user roles are already in sync"
    };
  },
});

// Update a team member's information
export const updateTeamMember = mutation({
  args: {
    teamMemberId: v.id("adminTeamList"),
    email: v.optional(v.string()),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
  },
  handler: async (ctx, { teamMemberId, email, name, role }) => {
    // Check if current user is an admin
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can update team members");
    }

    // Get the current team member
    const teamMember = await ctx.db.get(teamMemberId);
    if (!teamMember) {
      throw new Error("Team member not found");
    }

    // If email is changing, check if it's already used
    if (email && email !== teamMember.email) {
      const existingTeamMember = await ctx.db
        .query("adminTeamList")
        .withIndex("by_email", (q) => q.eq("email", email))
        .unique();

      if (existingTeamMember) {
        throw new Error("Another team member with this email already exists");
      }
    }

    // Update fields
    const updates: {
      email?: string;
      name?: string;
      role?: string;
    } = {};

    if (email) updates.email = email;
    if (name !== undefined) updates.name = name;
    if (role) updates.role = role;

    // Skip update if no changes
    if (Object.keys(updates).length === 0) {
      return { success: true, message: "No changes to apply" };
    }

    // Apply update
    await ctx.db.patch(teamMemberId, updates);

    // If a user exists with this email, we should check if their role needs updating too
    if (role) {
      const userEmail = email || teamMember.email;
      const existingUser = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), userEmail))
        .unique();

      if (existingUser) {
        await ctx.db.patch(existingUser._id, { role });
      }
    }

    return {
      success: true,
      message: "Team member updated successfully"
    };
  },
});


// Delete a user's account completely (admin only)
export const deleteUserAccount = mutation({
  args: {
    userEmail: v.string(),
  },
  handler: async (ctx, { userEmail }) => {
    // Check if current user is an admin
    const adminId = await getAuthUserId(ctx);
    if (!adminId) throw new Error("Not authenticated");

    const admin = await ctx.db.get(adminId);
    if (!admin || admin.role !== "admin") {
      throw new Error("Only admins can delete user accounts");
    }

    // Get the user by email
    const userToDelete = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), userEmail))
      .unique();

    if (!userToDelete) {
      throw new Error("User not found");
    }

    // Prevent deleting yourself
    if (userToDelete._id === adminId) {
      throw new Error("You cannot delete your own account");
    }

    // Check if this is the only admin
    if (userToDelete.role === "admin") {
      const adminCount = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (adminCount.length <= 1) {
        throw new Error("Cannot delete the only admin account");
      }
    }

    // 1. Find and delete from authAccounts
    const authAccount = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("userId"), userToDelete._id))
      .first();

    if (authAccount) {
      await ctx.db.delete(authAccount._id);
    }

    // 2. Delete from users table
    await ctx.db.delete(userToDelete._id);

    // 3. Remove from team list if present
    const teamMember = await ctx.db
      .query("adminTeamList")
      .withIndex("by_email", (q) => q.eq("email", userEmail))
      .unique();

    if (teamMember) {
      await ctx.db.delete(teamMember._id);
    }

    return {
      success: true,
      message: "User account completely deleted"
    };
  },
});

// Delete a team member with option to delete user account
export const deleteTeamMemberComplete = mutation({
  args: {
    teamMemberId: v.id("adminTeamList"),
    deleteUserAccount: v.optional(v.boolean()),
  },
  handler: async (ctx, { teamMemberId, deleteUserAccount }) => {
    // Check if current user is an admin
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can delete team members");
    }

    // Get the team member
    const teamMember = await ctx.db.get(teamMemberId);
    if (!teamMember) {
      throw new Error("Team member not found");
    }

    // Check if this is the only admin
    if (teamMember.role === "admin") {
      const adminCount = await ctx.db
        .query("adminTeamList")
        .filter((q) => q.eq(q.field("role"), "admin"))
        .collect();

      if (adminCount.length <= 1) {
        throw new Error("Cannot delete the only admin");
      }
    }

    // If deleteUserAccount is true, also delete the user account if it exists
    if (deleteUserAccount) {
      const userToDelete = await ctx.db
        .query("users")
        .filter((q) => q.eq(q.field("email"), teamMember.email))
        .unique();

      if (userToDelete) {
        // Check if this is the only admin user
        if (userToDelete.role === "admin") {
          const adminUsersCount = await ctx.db
            .query("users")
            .filter((q) => q.eq(q.field("role"), "admin"))
            .collect();

          if (adminUsersCount.length <= 1) {
            throw new Error("Cannot delete the only admin user account");
          }
        }

        // Find and delete from authAccounts
        const authAccount = await ctx.db
          .query("authAccounts")
          .filter((q) => q.eq(q.field("userId"), userToDelete._id))
          .first();

        if (authAccount) {
          await ctx.db.delete(authAccount._id);
        }

        // Delete from users table
        await ctx.db.delete(userToDelete._id);
      }
    }

    // Delete the team member
    await ctx.db.delete(teamMemberId);

    return {
      success: true,
      message: deleteUserAccount
        ? "Team member and user account deleted successfully"
        : "Team member deleted successfully"
    };
  },
});

// Get current user data
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    return {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
  },
});

// Check if an email is registered as a team member
export const isRegisteredTeamMember = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    // First check if the email exists in the team list
    const teamMember = await ctx.db
      .query("adminTeamList")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!teamMember) {
      return false; // Not in team list
    }

    // Check if they have a user account
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();

    // Determine if they're registered and have a team role
    return !!user && (user.role === "admin" || user.role === "user");
  },
});

// Check if an email is registered as a client
export const isRegisteredClient = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    // First check if the email exists in the client list
    const client = await ctx.db
      .query("adminClientList")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (!client) {
      return false; // Not in client list
    }

    // Check if they have a user account
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), email))
      .first();

    // Determine if they're registered and have a client role
    return !!user && user.role === "client";
  },
});

// Get the appropriate login path for a user based on their role
export const getCorrectLoginPath = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    // Determine the correct login path based on the role
    if (user.role === "client") {
      return "/client-signin";
    } else if (user.role === "admin" || user.role === "user") {
      return "/team-signin";
    }

    // If no specific role or unknown role, default to team signin
    return "/team-signin";
  },
});

// Add a function to get a user by ID
export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
}); 