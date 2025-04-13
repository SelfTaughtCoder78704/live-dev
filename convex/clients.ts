import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Add a potential client to the adminClientList (admin only)
export const addPotentialClient = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { email, name, notes }) => {
    // Check if current user is an admin
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can add potential clients");
    }

    // Check if email already exists in the client list
    const existingClient = await ctx.db
      .query("adminClientList")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existingClient) {
      throw new Error("Client with this email already exists");
    }

    // Add the potential client to the list
    await ctx.db.insert("adminClientList", {
      email,
      name,
      notes,
      status: "invited",
      dateAdded: Date.now(),
      invitedBy: userId,
    });

    return { success: true, message: "Potential client added successfully" };
  },
});

// Get all potential clients (admin only)
export const getPotentialClients = query({
  args: {},
  handler: async (ctx) => {
    // Check if current user is an admin
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      return [];
    }

    // Get all potential clients
    const clients = await ctx.db
      .query("adminClientList")
      .collect();

    return clients;
  },
});

// Check if an email is in the client list (for authentication)
export const checkEmailInClientList = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, { email }) => {
    const client = await ctx.db
      .query("adminClientList")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    return !!client;
  },
});

// Check if any potential clients exist in the system
export const clientsExist = query({
  args: {},
  handler: async (ctx) => {
    const clients = await ctx.db
      .query("adminClientList")
      .take(1);

    return clients.length > 0;
  },
});

// Update potential client status
export const updateClientStatus = mutation({
  args: {
    clientId: v.id("adminClientList"),
    status: v.string(),
  },
  handler: async (ctx, { clientId, status }) => {
    // Check if current user is an admin
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can update client status");
    }

    // Update the client's status
    await ctx.db.patch(clientId, { status });
    return { success: true, message: "Client status updated successfully" };
  },
});

// Update potential client information
export const updatePotentialClient = mutation({
  args: {
    clientId: v.id("adminClientList"),
    email: v.string(),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, { clientId, email, name, notes }) => {
    // Check if current user is an admin
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can update potential clients");
    }

    // Update the client
    await ctx.db.patch(clientId, {
      email,
      name,
      notes,
    });

    return { success: true, message: "Client updated successfully" };
  },
});

// Delete a potential client
export const deletePotentialClient = mutation({
  args: {
    clientId: v.id("adminClientList"),
  },
  handler: async (ctx, { clientId }) => {
    // Check if current user is an admin
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Only admins can delete potential clients");
    }

    // Delete the client
    await ctx.db.delete(clientId);
    return { success: true, message: "Client deleted successfully" };
  },
}); 