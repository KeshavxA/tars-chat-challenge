import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        clerkId: v.string(),
        email: v.string(),
        name: v.string(),
        imageUrl: v.string(),
        isOnline: v.boolean(),
        lastSeen: v.optional(v.number()),
    })
        .index("by_clerkId", ["clerkId"])
        .index("by_email", ["email"]),

    conversations: defineTable({
        participantOne: v.id("users"),
        participantTwo: v.id("users"),
    })
        .index("by_participants", ["participantOne", "participantTwo"]),

    messages: defineTable({
        conversationId: v.id("conversations"),
        senderId: v.id("users"),
        content: v.string(),
    })
        .index("by_conversation", ["conversationId"]),

    typingIndicators: defineTable({
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        lastTyped: v.number(),
    })
        .index("by_conversation", ["conversationId"])
        .index("by_conversation_user", ["conversationId", "userId"]),

    readStatus: defineTable({
        conversationId: v.id("conversations"),
        userId: v.id("users"),
        lastReadTime: v.number(),
    })
        .index("by_conversation_user", ["conversationId", "userId"]),
});
