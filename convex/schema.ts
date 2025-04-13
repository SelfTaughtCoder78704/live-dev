import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

// The schema is normally optional, but Convex Auth
// requires indexes defined on `authTables`.
// The schema provides more precise TypeScript types.
export default defineSchema({
  ...authTables,
  // Add custom fields to the built-in users table
  users: defineTable({
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    role: v.optional(v.string()), // Add role field
    // Keep any fields automatically populated by Convex Auth
    tokenIdentifier: v.optional(v.string()),
  }).index("by_token", ["tokenIdentifier"]),

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
});
