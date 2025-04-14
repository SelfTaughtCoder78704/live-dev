"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { AccessToken } from "livekit-server-sdk";

/**
 * Generate a LiveKit access token for joining a room.
 * This handles authentication and permissions for users in LiveKit rooms.
 */
export const generateToken = action({
  args: {
    // The user's identity (usually email or username)
    identity: v.string(),
    // The room name they want to join
    roomName: v.string(),
    // Optional metadata as a JSON string
    metadata: v.optional(v.string()),
    // Whether the user can publish video/audio (stream)
    canPublish: v.optional(v.boolean()),
    // Whether the user can subscribe to others' streams
    canSubscribe: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log(ctx.auth.getUserIdentity());
    // Get LiveKit credentials from environment
    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;

    if (!apiKey || !apiSecret) {
      throw new Error("LiveKit API credentials not configured");
    }

    // Create a new token
    const token = new AccessToken(apiKey, apiSecret, {
      identity: args.identity,
      metadata: args.metadata,
    });

    // Add permissions to join room
    token.addGrant({
      roomJoin: true,
      room: args.roomName,
      canPublish: args.canPublish ?? false,
      canSubscribe: args.canSubscribe ?? true,
    });

    // Generate the JWT token
    return token.toJwt();
  },
}); 