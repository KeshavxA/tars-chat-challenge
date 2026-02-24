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
                    isDeleted: message.isDeleted ?? false,
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

// Mutation: soft-delete a message (only the sender can delete)
export const deleteMessage = mutation({
    args: {
        messageId: v.id("messages"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) throw new Error("Not authenticated");

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) throw new Error("User not found");

        const message = await ctx.db.get(args.messageId);
        if (!message) throw new Error("Message not found");

        // Only the sender can delete their own messages
        if (message.senderId !== currentUser._id) {
            throw new Error("You can only delete your own messages");
        }

        await ctx.db.patch(args.messageId, {
            isDeleted: true,
        });
    },
});

// Mutation: mark a conversation as read by the current user
export const markAsRead = mutation({
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

        // Check for existing read status
        const existing = await ctx.db
            .query("readStatus")
            .withIndex("by_conversation_user", (q) =>
                q.eq("conversationId", args.conversationId).eq("userId", currentUser._id)
            )
            .unique();

        if (existing) {
            await ctx.db.patch(existing._id, {
                lastReadTime: Date.now(),
            });
        } else {
            await ctx.db.insert("readStatus", {
                conversationId: args.conversationId,
                userId: currentUser._id,
                lastReadTime: Date.now(),
            });
        }
    },
});

// Query: get unread message counts for all conversations the user is in
export const getUnreadCounts = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return {};

        const currentUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!currentUser) return {};

        // Get all conversations this user is in
        const allConversations = await ctx.db.query("conversations").collect();
        const myConversations = allConversations.filter(
            (c) =>
                c.participantOne === currentUser._id ||
                c.participantTwo === currentUser._id
        );

        const counts: Record<string, number> = {};

        for (const conv of myConversations) {
            // Get the user's read status for this conversation
            const readStatus = await ctx.db
                .query("readStatus")
                .withIndex("by_conversation_user", (q) =>
                    q.eq("conversationId", conv._id).eq("userId", currentUser._id)
                )
                .unique();

            const lastReadTime = readStatus?.lastReadTime ?? 0;

            // Get messages in this conversation sent by the OTHER user after lastReadTime
            const messages = await ctx.db
                .query("messages")
                .withIndex("by_conversation", (q) =>
                    q.eq("conversationId", conv._id)
                )
                .collect();

            const unread = messages.filter(
                (m) =>
                    m.senderId !== currentUser._id &&
                    m._creationTime > lastReadTime
            ).length;

            if (unread > 0) {
                counts[conv._id] = unread;
            }
        }

        return counts;
    },
});
