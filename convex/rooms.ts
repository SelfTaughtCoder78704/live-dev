import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Get the current active arena room or create one if none exists.
 * This is used to ensure we always use the same consistent room for the arena.
 */
export const getArenaRoom = query({
  args: {},
  handler: async (ctx) => {
    // Try to find an existing active arena room
    const existingArena = await ctx.db
      .query("persistentRooms")
      .filter(q =>
        q.and(
          q.eq(q.field("type"), "arena"),
          q.eq(q.field("isActive"), true)
        )
      )
      .first();

    if (existingArena) {
      // Update the lastActive timestamp, this requires a separate mutation call
      return existingArena;
    }

    // If no active arena room is found, return null
    // The UI should handle this by calling createArenaRoom
    return null;
  }
});

/**
 * Create a new arena room and make it the active room.
 * This deactivates any existing arena rooms.
 */
export const createArenaRoom = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Verify user is authenticated
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Not authenticated");
    }

    // Check if user is admin (only admins should create arena rooms)
    const user = await ctx.db.get(userId);
    if (!user || user.role !== "admin") {
      throw new Error("Unauthorized: Only admins can create arena rooms");
    }

    // Deactivate any existing arena rooms
    const existingArenas = await ctx.db
      .query("persistentRooms")
      .filter(q => q.eq(q.field("type"), "arena"))
      .collect();

    for (const arena of existingArenas) {
      await ctx.db.patch(arena._id, { isActive: false });
    }

    // Create new arena room with provided name or default
    const roomName = args.name || "main-arena-permanent";

    const roomId = await ctx.db.insert("persistentRooms", {
      name: roomName,
      type: "arena",
      createdAt: Date.now(),
      lastActive: Date.now(),
      createdBy: userId,
      isActive: true
    });

    return await ctx.db.get(roomId);
  }
});

/**
 * Update the lastActive timestamp of a room.
 */
export const updateRoomActivity = mutation({
  args: {
    roomId: v.id("persistentRooms"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.roomId, {
      lastActive: Date.now()
    });
    return true;
  }
}); 