import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Mutation: get or create a 1-on-1 conversation between two users
export const getOrCreateConversation = mutation({
    args: {
        otherUserId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        // Get the current user from the database
        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        // Ensure consistent ordering: smaller ID is always participantOne
        const [participantOne, participantTwo] =
            currentUser._id < args.otherUserId
                ? [currentUser._id, args.otherUserId]
                : [args.otherUserId, currentUser._id];

        // Check if a conversation already exists
        const existing = await ctx.db
            .query("conversations")
            .withIndex("by_participants", (q) =>
                q.eq("participantOne", participantOne).eq("participantTwo", participantTwo)
            )
            .unique();

        if (existing) return existing._id;

        // Create a new conversation
        return await ctx.db.insert("conversations", {
            participantOne,
            participantTwo,
        });
    },
});

// Query: get all conversations for the current user
export const getMyConversations = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return [];

        // Get all conversations — need to check both participant fields
        const allConversations = await ctx.db.query("conversations").collect();

        return allConversations.filter(
            (c) =>
                c.participantOne === currentUser._id ||
                c.participantTwo === currentUser._id
        );
    },
});

// Query: get all conversations for the current user as a map of otherUserId -> conversationId
export const getConversationMap = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return {};

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return {};

        const allConversations = await ctx.db.query("conversations").collect();
        const myConversations = allConversations.filter(
            (c) =>
                c.participantOne === currentUser._id ||
                c.participantTwo === currentUser._id
        );

        const map: Record<string, string> = {};
        for (const conv of myConversations) {
            const otherUserId =
                conv.participantOne === currentUser._id
                    ? conv.participantTwo
                    : conv.participantOne;
            map[otherUserId] = conv._id;
        }

        return map;
    },
});
