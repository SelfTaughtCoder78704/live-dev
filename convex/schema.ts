import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()), // Add role field
    allowedToTranscribe: v.optional(v.boolean()),
    // Fields automatically populated by Convex Auth are already in authTables
  }).index("by_email", ["email"]),

  // New table for admin-managed team list
  adminTeamList: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    role: v.optional(v.string()),
    status: v.string(), // "invited", "active", etc.
    dateAdded: v.float64(), // Adding timestamp field
    invitedBy: v.id("users")
  }).index("by_email", ["email"]),

  // New table for potential clients
  adminClientList: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.string(), // "invited", "active", etc.
    dateAdded: v.float64(), // timestamp
    invitedBy: v.id("users")
  }).index("by_email", ["email"]),

  // New table for breakout room invitations
  breakoutInvites: defineTable({
    inviterId: v.id("users"),      // User ID of the team member who sent invite
    inviteeId: v.id("users"),      // User ID of the client receiving invite
    status: v.string(),            // "pending", "accepted", "declined", "expired"
    timestamp: v.float64(),        // Creation time
    roomId: v.string(),            // Unique breakout room identifier
    expiresAt: v.float64(),        // When invitation expires
  }).index("by_invitee", ["inviteeId"])
    .index("by_inviter", ["inviterId"])
    .index("by_status", ["status"])
    .index("by_room", ["roomId"]),

  // Table for persistent rooms (like the arena)
  persistentRooms: defineTable({
    name: v.string(),           // Room name used in LiveKit
    type: v.string(),           // "arena" or other types you might add
    createdAt: v.float64(),     // Creation timestamp
    lastActive: v.float64(),    // Last time it was accessed
    createdBy: v.id("users"),   // User who created it (admin)
    isActive: v.boolean(),      // Whether this room is the current active one
  }).index("by_type", ["type"])
    .index("by_active", ["isActive"]),

  // Table for user transcriptions
  transcriptions: defineTable({
    userId: v.id("users"),      // User ID of the speaker
    userEmail: v.string(),      // Email for display/identification
    userName: v.optional(v.string()), // Optional display name
    roomId: v.string(),         // Room where this was spoken (arena or breakout)
    text: v.string(),           // The transcribed text
    timestamp: v.float64(),     // When this was spoken/transcribed
    isFinal: v.boolean(),       // Whether this is a final transcription segment
    messageId: v.optional(v.string()) // For grouping continuous chunks
  }).index("by_room", ["roomId"])
    .index("by_user", ["userId"])
    .index("by_time", ["timestamp"]),
});
