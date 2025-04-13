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
});
