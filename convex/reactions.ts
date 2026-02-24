import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Mutation: toggle a reaction on a message (add if not exists, remove if exists)
export const toggleReaction = mutation({
    args: {
        messageId: v.id("messages"),
        emoji: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        // Check if this user already reacted with this emoji
        const existing = await ctx.db
            .query("reactions")
            .withIndex("by_message_user_emoji", (q) =>
                q
                    .eq("messageId", args.messageId)
                    .eq("userId", currentUser._id)
                    .eq("emoji", args.emoji)
            )
            .unique();

        if (existing) {
            // Remove the reaction
            await ctx.db.delete(existing._id);
            return { action: "removed" };
        } else {
            // Add the reaction
            await ctx.db.insert("reactions", {
                messageId: args.messageId,
                userId: currentUser._id,
                emoji: args.emoji,
            });
            return { action: "added" };
        }
    },
});

// Query: get reactions for messages in a conversation
export const getReactionsForConversation = query({
    args: {
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return {};

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return {};

        // Get all messages in this conversation
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .collect();

        const messageIds = new Set(messages.map((m) => m._id));

        // Get all reactions for these messages
        const allReactions = [];
        for (const messageId of messageIds) {
            const reactions = await ctx.db
                .query("reactions")
                .withIndex("by_message", (q) => q.eq("messageId", messageId))
                .collect();
            allReactions.push(...reactions);
        }

        // Group reactions by messageId -> array of { emoji, count, hasReacted }
        const grouped: Record<
            string,
            Record<string, { count: number; hasReacted: boolean }>
        > = {};

        for (const reaction of allReactions) {
            const msgId = reaction.messageId;
            if (!grouped[msgId]) grouped[msgId] = {};
            if (!grouped[msgId][reaction.emoji]) {
                grouped[msgId][reaction.emoji] = { count: 0, hasReacted: false };
            }
            grouped[msgId][reaction.emoji].count++;
            if (reaction.userId === currentUser._id) {
                grouped[msgId][reaction.emoji].hasReacted = true;
            }
        }

        // Convert to arrays (emojis can't be object keys in Convex return values)
        const result: Record<
            string,
            Array<{ emoji: string; count: number; hasReacted: boolean }>
        > = {};

        for (const [msgId, emojis] of Object.entries(grouped)) {
            result[msgId] = Object.entries(emojis).map(([emoji, data]) => ({
                emoji,
                count: data.count,
                hasReacted: data.hasReacted,
            }));
        }

        return result;
    },
});
