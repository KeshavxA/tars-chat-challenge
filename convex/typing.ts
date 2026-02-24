import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const TYPING_TIMEOUT = 2000; // 2 seconds

// Mutation: set the current user as typing in a conversation
export const setTyping = mutation({
    args: {
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return;

        // Check if a typing indicator already exists for this user + conversation
        const existing = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversation_user", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", currentUser._id)
            )
            .unique();

        if (existing) {
            // Update the timestamp
            await ctx.db.patch(existing._id, {
                lastTyped: Date.now(),
            });
        } else {
            // Create a new typing indicator
            await ctx.db.insert("typingIndicators", {
                conversationId: args.conversationId,
                userId: currentUser._id,
                lastTyped: Date.now(),
            });
        }
    },
});

// Mutation: clear the current user's typing indicator
export const clearTyping = mutation({
    args: {
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return;

        const existing = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversation_user", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", currentUser._id)
            )
            .unique();

        if (existing) {
            await ctx.db.delete(existing._id);
        }
    },
});

// Query: get who is currently typing in a conversation (excluding the current user)
export const getTypingUsers = query({
    args: {
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return [];

        const now = Date.now();

        // Get all typing indicators for this conversation
        const indicators = await ctx.db
            .query("typingIndicators")
            .withIndex("by_conversation", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .collect();

        // Filter: only active (within timeout) and not the current user
        const activeTypers = indicators.filter(
            (ind) =>
                ind.userId !== currentUser._id &&
                now - ind.lastTyped < TYPING_TIMEOUT
        );

        // Enrich with user names
        const typingUsers = await Promise.all(
            activeTypers.map(async (ind) => {
                const user = await ctx.db.get(ind.userId);
                return user ? { id: user._id, name: user.name } : null;
            })
        );

        return typingUsers.filter(Boolean);
    },
});
