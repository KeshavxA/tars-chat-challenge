import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Query: get all messages for a specific conversation (real-time)
export const getMessages = query({
    args: {
        conversationId: v.id("conversations"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        // Verify the user is a participant of this conversation
        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) return [];

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return [];

        if (
            conversation.participantOne !== currentUser._id &&
            conversation.participantTwo !== currentUser._id
        ) {
            return [];
        }

        // Get all messages for this conversation, ordered by creation time
        const messages = await ctx.db
            .query("messages")
            .withIndex("by_conversation", (q) =>
                q.eq("conversationId", args.conversationId)
            )
            .collect();

        // Enrich messages with sender info
        const enrichedMessages = await Promise.all(
            messages.map(async (message) => {
                const sender = await ctx.db.get(message.senderId);
                return {
                    ...message,
                    senderName: sender?.name ?? "Unknown",
                    senderImage: sender?.imageUrl ?? "",
                    isCurrentUser: message.senderId === currentUser._id,
                };
            })
        );

        return enrichedMessages;
    },
});

// Mutation: send a message in a conversation
export const sendMessage = mutation({
    args: {
        conversationId: v.id("conversations"),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        // Verify the user is a participant
        const conversation = await ctx.db.get(args.conversationId);
        if (!conversation) throw new Error("Conversation not found");

        if (
            conversation.participantOne !== currentUser._id &&
            conversation.participantTwo !== currentUser._id
        ) {
            throw new Error("Not authorized");
        }

        // Validate content
        const content = args.content.trim();
        if (!content) throw new Error("Message cannot be empty");

        // Insert the message
        return await ctx.db.insert("messages", {
            conversationId: args.conversationId,
            senderId: currentUser._id,
            content,
        });
    },
});
