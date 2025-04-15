import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { getAuthUserId } from "@convex-dev/auth/server";

/**
 * Send a breakout room invitation from a team member to a client.
 */
export const sendBreakoutInvite = mutation({
  args: {
    inviteeId: v.id("users"),
    roomName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the current authenticated user ID
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      console.log("sendBreakoutInvite: No authenticated user");
      throw new Error("Unauthorized: Not authenticated");
    }

    console.log("sendBreakoutInvite: User ID", userId);

    // Get sender user record directly by ID
    const sender = await ctx.db.get(userId);
    console.log("sendBreakoutInvite: Sender user", sender?._id, sender?.email, sender?.role);

    if (!sender) {
      console.log("sendBreakoutInvite: Sender not found");
      throw new Error("User not found");
    }

    // Check if sender is an admin or team member
    if (sender.role !== "admin" && sender.role !== "user") {
      console.log("sendBreakoutInvite: Unauthorized role", sender.role);
      throw new Error("Unauthorized: Only team members can send breakout invitations");
    }

    // Get invitee (client) details
    const invitee = await ctx.db.get(args.inviteeId);
    console.log("sendBreakoutInvite: Invitee", invitee?._id, invitee?.email, invitee?.role);

    // Generate a room ID if not provided
    const roomId = args.roomName || `breakout-${Math.random().toString(36).substring(2, 9)}`;
    console.log("sendBreakoutInvite: Room ID", roomId);

    // Set expiration time for invitation
    const now = Date.now();
    const expiresAt = now + 600 * 1000; // 10 minutes instead of 2 minutes

    // Create invitation
    const inviteId = await ctx.db.insert("breakoutInvites", {
      inviterId: sender._id,
      inviteeId: args.inviteeId,
      status: "pending",
      timestamp: now,
      roomId,
      expiresAt,
    });
    console.log("sendBreakoutInvite: Created invite", inviteId, "expires in", Math.floor((expiresAt - now) / 1000), "seconds");

    return {
      inviteId,
      roomId,
      expiresAt,
    };
  },
});

/**
 * Respond to a breakout room invitation (accept or decline).
 */
export const respondToInvite = mutation({
  args: {
    inviteId: v.id("breakoutInvites"),
    response: v.union(v.literal("accept"), v.literal("decline")),
  },
  handler: async (ctx, args) => {
    // Get the current authenticated user ID
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      console.log("respondToInvite: No authenticated user");
      throw new Error("Unauthorized: Not authenticated");
    }

    // Get recipient user record directly by ID
    const recipient = await ctx.db.get(userId);
    console.log("respondToInvite: User found", recipient?._id, recipient?.email);

    if (!recipient) {
      console.log("respondToInvite: User record not found");
      throw new Error("User not found");
    }

    // Get the invitation
    const invitation = await ctx.db.get(args.inviteId);
    if (!invitation) {
      console.log("respondToInvite: Invitation not found", args.inviteId);
      throw new Error("Invitation not found");
    }

    console.log("respondToInvite: Checking invitation", invitation.inviteeId, recipient._id);

    // Check if user is the intended recipient
    if (invitation.inviteeId !== recipient._id) {
      console.log("respondToInvite: User is not the invitation recipient",
        invitation.inviteeId, recipient._id);
      throw new Error("Unauthorized: Not the invitation recipient");
    }

    // Skip expiration check - allow responding to invitations regardless of time
    // We previously had code here to check if invitation has expired

    // Check if invitation is still pending
    if (invitation.status !== "pending") {
      console.log("respondToInvite: Invitation already handled", invitation.status);
      throw new Error(`Invitation already ${invitation.status}`);
    }

    if (args.response === "accept") {
      // Update invitation status for accepted invitations
      await ctx.db.patch(args.inviteId, {
        status: args.response,
      });
      console.log("respondToInvite: Updated invitation status to", args.response);
    } else if (args.response === "decline") {
      // For declined invitations, delete from the database immediately
      await ctx.db.delete(args.inviteId);
      console.log("respondToInvite: Deleted declined invitation");
    }

    return {
      status: args.response,
      roomId: invitation.roomId,
      inviterId: invitation.inviterId,
      inviteeId: invitation.inviteeId,
    };
  },
});

/**
 * Updates the status of an invitation to a specified status.
 * Only the inviter or invitee can update invitation status.
 */
export const updateInvitationStatus = mutation({
  args: {
    inviteId: v.id("breakoutInvites"),
    status: v.union(
      v.literal("pending"),
      v.literal("accepted"),
      v.literal("declined"),
      v.literal("completed"),
      v.literal("expired"),
      v.literal("ongoing")
    ),
  },
  handler: async (ctx, args) => {
    // Get the current authenticated user ID
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Not authenticated");
    }

    // Get the invitation
    const invitation = await ctx.db.get(args.inviteId);
    if (!invitation) {
      throw new Error("Invitation not found");
    }

    // Verify that the user is either the inviter or invitee
    if (invitation.inviterId !== userId && invitation.inviteeId !== userId) {
      throw new Error("Unauthorized: Only the inviter or invitee can update this invitation");
    }

    // Update invitation status
    await ctx.db.patch(args.inviteId, { status: args.status });

    return {
      success: true,
      message: `Invitation status updated to ${args.status}`,
      invitation: {
        ...invitation,
        status: args.status
      }
    };
  },
});

/**
 * Expire all pending invitations that have passed their expiration time.
 * This could be run on a schedule or when checking invitations.
 */
export const expireInvitations = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find pending invitations that have expired
    const expiredInvites = await ctx.db
      .query("breakoutInvites")
      .filter(q =>
        q.and(
          q.eq(q.field("status"), "pending"),
          q.lt(q.field("expiresAt"), now)
        )
      )
      .collect();

    // Update each expired invitation
    let count = 0;
    for (const invite of expiredInvites) {
      await ctx.db.patch(invite._id, { status: "expired" });
      count++;
    }

    return { expiredCount: count };
  },
});

/**
 * Get all pending invitations for the current user.
 */
export const getMyPendingInvites = query({
  args: {},
  handler: async (ctx) => {
    // Get the current authenticated user ID
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      console.log("getMyPendingInvites: No authenticated user");
      return [];
    }

    // Get user record directly by ID
    const user = await ctx.db.get(userId);
    console.log("getMyPendingInvites: User found", user?._id, user?.email, user?.role);

    if (!user) {
      console.log("getMyPendingInvites: User record not found");
      return [];
    }

    // Get all pending invitations regardless of expiration time
    const now = Date.now();
    const pendingInvites = await ctx.db
      .query("breakoutInvites")
      .filter(q =>
        q.and(
          q.eq(q.field("inviteeId"), user._id),
          q.eq(q.field("status"), "pending")
        )
      )
      .collect();

    console.log(`getMyPendingInvites: Found ${pendingInvites.length} pending invites for user ${user.email}`);

    // Skip expiration filtering - show all pending invites
    const validInvites = pendingInvites;
    console.log(`getMyPendingInvites: Showing all ${validInvites.length} invites regardless of expiration`);

    // Get user details for each inviter
    const invitesWithDetails = await Promise.all(
      validInvites.map(async (invite) => {
        console.log("getMyPendingInvites: Fetching inviter with ID", invite.inviterId);
        const inviter = await ctx.db.get(invite.inviterId);
        console.log("getMyPendingInvites: Inviter fetch result", inviter ? "Found" : "Not found");
        console.log("getMyPendingInvites: Inviter details", {
          id: inviter?._id,
          name: inviter?.name || "None",
          email: inviter?.email || "None",
          role: inviter?.role || "None",
        });

        return {
          ...invite,
          inviter: inviter ? {
            _id: inviter._id,
            name: inviter.name || "Unknown",
            email: inviter.email || "Unknown",
            role: inviter.role || "Unknown"
          } : { name: "Unknown", email: "Unknown", role: "Unknown" },
          timeRemaining: Math.max(0, Math.floor((invite.expiresAt - now) / 1000))
        };
      })
    );

    return invitesWithDetails;
  },
});

/**
 * Get invitations sent by the current user.
 */
export const getMySentInvites = query({
  args: {
    includeExpired: v.optional(v.boolean()),
    includeCompleted: v.optional(v.boolean()),
    includeOngoing: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Get the current authenticated user ID
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get user record directly by ID
    const user = await ctx.db.get(userId);

    if (!user) {
      return [];
    }

    // Get invitations sent by this user
    let invitesQuery = ctx.db
      .query("breakoutInvites")
      .filter(q => q.eq(q.field("inviterId"), user._id));

    // Filter out expired/declined if requested
    if (!args.includeExpired) {
      invitesQuery = invitesQuery.filter(q =>
        q.neq(q.field("status"), "expired")
      );
    }

    // Filter out completed invitations unless requested
    if (!args.includeCompleted) {
      invitesQuery = invitesQuery.filter(q =>
        q.neq(q.field("status"), "completed")
      );
    }

    // Filter out ongoing invitations unless requested
    if (!args.includeOngoing) {
      invitesQuery = invitesQuery.filter(q =>
        q.neq(q.field("status"), "ongoing")
      );
    }

    const sentInvites = await invitesQuery.collect();

    console.log(`getMySentInvites: Found ${sentInvites.length} invites`);

    // Get user details for each invitee
    const invitesWithDetails = await Promise.all(
      sentInvites.map(async (invite) => {
        const invitee = await ctx.db.get(invite.inviteeId);
        return {
          ...invite,
          invitee: invitee ? {
            _id: invitee._id,
            name: invitee.name || "Unknown",
            email: invitee.email || "Unknown",
          } : { name: "Unknown", email: "Unknown" },
          status: invite.status
        };
      })
    );

    return invitesWithDetails;
  },
});

/**
 * Check if any users are in a specific breakout room.
 */
export const getBreakoutRoomParticipants = query({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    // Find accepted invitations for this room
    const acceptedInvites = await ctx.db
      .query("breakoutInvites")
      .filter(q =>
        q.and(
          q.eq(q.field("roomId"), args.roomId),
          q.eq(q.field("status"), "accept")
        )
      )
      .collect();

    // Get all user IDs involved
    const userIds = new Set<Id<"users">>();
    acceptedInvites.forEach(invite => {
      userIds.add(invite.inviterId);
      userIds.add(invite.inviteeId);
    });

    // Get user details
    const users = await Promise.all(
      Array.from(userIds).map(userId => ctx.db.get(userId))
    );

    // Filter out any nulls and map to the format we want
    return users
      .filter(Boolean)
      .map(user => ({
        _id: user!._id,
        name: user!.name || "Unknown",
        email: user!.email || "Unknown",
        role: user!.role || "Unknown",
      }));
  },
});

/**
 * Helper query for the breakout room token action.
 * Gets user by email.
 */
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.email))
      .first();
  },
});

/**
 * Helper query for the breakout room token action.
 * Checks if a user is invited to a specific room.
 */
export const checkRoomInvitation = query({
  args: {
    roomId: v.string(),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    console.log("checkRoomInvitation: Checking if user", args.userId, "has access to room", args.roomId);

    // Check for both pending, accepted, and ongoing invitations
    const invitation = await ctx.db
      .query("breakoutInvites")
      .filter((q) =>
        q.and(
          q.eq(q.field("roomId"), args.roomId),
          q.or(
            q.eq(q.field("inviterId"), args.userId),
            q.eq(q.field("inviteeId"), args.userId)
          ),
          q.or(
            q.eq(q.field("status"), "accept"),
            q.eq(q.field("status"), "pending"),
            q.eq(q.field("status"), "ongoing")
          )
        )
      )
      .first();

    console.log("checkRoomInvitation: Result", invitation?._id, invitation?.status);

    return invitation;
  },
});

/**
 * Mark a breakout invitation as completed
 */
export const completeBreakoutInvite = mutation({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the current authenticated user ID
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      console.log("completeBreakoutInvite: No authenticated user");
      throw new Error("Unauthorized: Not authenticated");
    }

    // Find all accepted or ongoing invitations for this room
    const invites = await ctx.db
      .query("breakoutInvites")
      .filter((q) =>
        q.and(
          q.eq(q.field("roomId"), args.roomId),
          q.or(
            q.eq(q.field("status"), "accept"),
            q.eq(q.field("status"), "ongoing")
          )
        )
      )
      .collect();

    if (invites.length === 0) {
      throw new Error(`No active invitations found for room ${args.roomId}`);
    }

    // Check if user is a participant in any of these invitations
    const userIsParticipant = invites.some(
      invite => invite.inviterId === userId || invite.inviteeId === userId
    );

    if (!userIsParticipant) {
      throw new Error("Unauthorized: Only participants can complete breakout invitations");
    }

    console.log(`completeBreakoutInvite: Found ${invites.length} active invites for room ${args.roomId}`);

    // Delete all invitations instead of just marking them as completed
    let deleted = 0;
    for (const invite of invites) {
      await ctx.db.delete(invite._id);
      deleted++;
      console.log(`completeBreakoutInvite: Deleted invite ${invite._id}`);
    }

    return { success: true, deleted };
  },
});

/**
 * Complete all ongoing invitations for a room
 */
export const completeAllOngoingInvites = mutation({
  args: {
    roomId: v.id("breakoutRooms"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Not authenticated");
    }

    // Check if the user has access to this room (sent the invite or was invited)
    const invites = await ctx.db
      .query("breakoutInvites")
      .filter((q) =>
        q.and(
          q.eq(q.field("roomId"), args.roomId),
          q.eq(q.field("status"), "ongoing")
        )
      )
      .collect();

    if (!invites.some((invite) => invite.inviterId === userId || invite.inviteeId === userId)) {
      throw new Error("Unauthorized: Not a participant in this room");
    }

    // Mark all ongoing invitations for this room as completed
    for (const invite of invites) {
      await ctx.db.patch(invite._id, { status: "completed" });
    }

    return { success: true, count: invites.length };
  },
});

/**
 * Get all invitations with ongoing status for a specific room
 */
export const getOngoingInvites = query({
  args: {
    roomId: v.id("breakoutRooms"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Unauthorized: Not authenticated");
    }

    return await ctx.db
      .query("breakoutInvites")
      .filter(q =>
        q.and(
          q.eq(q.field("roomId"), args.roomId),
          q.eq(q.field("status"), "ongoing")
        )
      )
      .collect();
  }
});

/**
 * Check if a user is the inviter for any invitation to a specific room.
 * Used for authorizing access to breakout rooms.
 */
export const checkRoomInviter = query({
  args: {
    roomId: v.string(),
    userId: v.id("users")
  },
  handler: async (ctx, args) => {
    console.log("checkRoomInviter: Checking if user", args.userId, "is inviter for room", args.roomId);

    // Check for invitations where the user is the inviter
    const invitation = await ctx.db
      .query("breakoutInvites")
      .filter((q) =>
        q.and(
          q.eq(q.field("roomId"), args.roomId),
          q.eq(q.field("inviterId"), args.userId),
          // Include any status that would allow accessing the room
          q.or(
            q.eq(q.field("status"), "accept"),
            q.eq(q.field("status"), "ongoing")
          )
        )
      )
      .first();

    console.log("checkRoomInviter: Result", invitation?._id, invitation?.status);

    return invitation;
  }
});

/**
 * Get active breakout invitations for the current user (as invitee).
 * This allows clients to see and rejoin breakout rooms they've been invited to.
 */
export const getMyActiveBreakouts = query({
  args: {},
  handler: async (ctx) => {
    // Get the current authenticated user ID
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    // Get user record
    const user = await ctx.db.get(userId);
    if (!user) {
      return [];
    }

    // Get invitations where this user is the invitee and status is accept or ongoing
    const activeInvites = await ctx.db
      .query("breakoutInvites")
      .filter(q =>
        q.and(
          q.eq(q.field("inviteeId"), user._id),
          q.or(
            q.eq(q.field("status"), "accept"),
            q.eq(q.field("status"), "ongoing")
          )
        )
      )
      .collect();

    console.log(`getMyActiveBreakouts: Found ${activeInvites.length} active invites for user ${user.email}`);

    // Get user details for each inviter
    const invitesWithDetails = await Promise.all(
      activeInvites.map(async (invite) => {
        const inviter = await ctx.db.get(invite.inviterId);
        return {
          ...invite,
          inviter: inviter ? {
            _id: inviter._id,
            name: inviter.name || "Unknown",
            email: inviter.email || "Unknown",
            role: inviter.role || "Unknown"
          } : { name: "Unknown", email: "Unknown", role: "Unknown" }
        };
      })
    );

    return invitesWithDetails;
  },
});

/**
 * Check if any invitations exist for a given room ID.
 * This is used to detect when a session has been ended by another participant.
 */
export const checkInvitationExists = query({
  args: {
    roomId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if any invitations exist for this room
    const invites = await ctx.db
      .query("breakoutInvites")
      .filter(q => q.eq(q.field("roomId"), args.roomId))
      .first();

    // Return true if invitations exist, false otherwise
    return invites !== null;
  },
});
