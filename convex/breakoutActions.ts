"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { AccessToken } from "livekit-server-sdk";
import { api } from "./_generated/api";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Generate a LiveKit token for a breakout room.
 * This ensures only invited participants can join the room.
 */
export const generateBreakoutRoomToken = action({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    // Get the current authenticated user ID
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthorized: Not authenticated");
    }

    console.log("generateBreakoutRoomToken: identity", identity);

    // Get user ID from auth
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: User ID not found");
    }

    console.log("generateBreakoutRoomToken: userId", userId);

    // Get full user record
    const user = await ctx.runQuery(api.users.getUserById, {
      userId
    });

    if (!user) {
      throw new Error("User not found");
    }

    console.log("generateBreakoutRoomToken: user found", user.email, user.role);

    // Check if user is invited to this room
    const invitation = await ctx.runQuery(api.breakout.checkRoomInvitation, {
      roomId: args.roomId,
      userId: user._id
    });

    if (!invitation) {
      throw new Error("Not invited to this breakout room");
    }

    // Get LiveKit credentials from environment
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error("LiveKit API credentials not configured");
    }

    // Create a new token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: user.email || userId,
      metadata: JSON.stringify({
        name: user.name || user.email || "Unknown",
        role: user.role || "unknown",
      }),
    });

    // Add permissions to join room
    token.addGrant({
      roomJoin: true,
      room: args.roomId,
      canPublish: true,  // All breakout participants can publish
      canSubscribe: true, // All breakout participants can subscribe
    });

    // Generate the JWT token
    return token.toJwt();
  },
});
