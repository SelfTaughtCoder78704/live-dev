import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Add a new transcription message
export const addTranscription = mutation({
  args: {
    roomId: v.string(),
    text: v.string(),
    isFinal: v.boolean(),
    messageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get user information
    const user = await ctx.db.get(userId);
    if (!user) return null;

    // Ensure we have an email
    if (!user.email) return null;

    // Create a new transcription entry
    const transcriptionId = await ctx.db.insert("transcriptions", {
      userId,
      userEmail: user.email,
      userName: user.name,
      roomId: args.roomId,
      text: args.text,
      timestamp: Date.now(),
      isFinal: args.isFinal,
      messageId: args.messageId,
    });

    return transcriptionId;
  },
});

// Get all transcriptions for a specific room
export const getTranscriptionsForRoom = query({
  args: {
    roomId: v.string(),
    // Optional pagination
    limit: v.optional(v.number()),
    before: v.optional(v.float64()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Set default limit if not provided
    const limit = args.limit ?? 100;

    // Query builder based on roomId
    let queryBuilder = ctx.db
      .query("transcriptions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId));

    // Add timestamp filter if 'before' is provided
    if (args.before !== undefined) {
      // First get the query with index, then add filter
      queryBuilder = queryBuilder.filter((q) =>
        q.lt(q.field("timestamp"), args.before!)
      );
    }

    // Order by timestamp descending and limit results
    const transcriptions = await queryBuilder
      .order("desc")
      .take(limit);

    // Return transcriptions in chronological order (oldest first)
    return transcriptions.reverse();
  },
});

// Subscribe to real-time transcriptions for a room
export const subscribeToRoomTranscriptions = query({
  args: {
    roomId: v.string(),
    // Limit how many historical messages to return
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get authenticated user
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Set default limit
    const limit = args.limit ?? 50;

    // Get the most recent transcriptions for this room
    const transcriptions = await ctx.db
      .query("transcriptions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(limit);

    // Return in chronological order
    return transcriptions.reverse();
  },
}); 