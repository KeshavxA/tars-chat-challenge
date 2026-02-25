import { v } from "convex/values";
import { internalMutation, internalQuery, mutation, query } from "./_generated/server";

// Internal mutation: create or update a user from Clerk webhook data
export const upsertUser = internalMutation({
    args: {
        clerkId: v.string(),
        email: v.string(),
        name: v.string(),
        imageUrl: v.string(),
    },
    handler: async (ctx, args) => {
        const existingUser = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (existingUser) {
            await ctx.db.patch(existingUser._id, {
                email: args.email,
                name: args.name,
                imageUrl: args.imageUrl,
            });
            return existingUser._id;
        }

        return await ctx.db.insert("users", {
            clerkId: args.clerkId,
            email: args.email,
            name: args.name,
            imageUrl: args.imageUrl,
            isOnline: true,
            lastSeen: Date.now(),
        });
    },
});

// Internal mutation: delete a user by Clerk ID
export const deleteUser = internalMutation({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();

        if (user) {
            await ctx.db.delete(user._id);
        }
    },
});

// Internal query: get a user by Clerk ID
export const getUserByClerkId = internalQuery({
    args: { clerkId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", args.clerkId))
            .unique();
    },
});

// Public query: get the current authenticated user
export const currentUser = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;

        return await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();
    },
});

// Public query: get all users
export const getAllUsers = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("users").collect();
    },
});

// Public query: get all users except the currently logged-in user
export const getOtherUsers = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return [];

        const allUsers = await ctx.db.query("users").collect();
        return allUsers.filter((user) => user.clerkId !== identity.subject);
    },
});

// Public query: get a user by their Convex document ID
export const getUserById = query({
    args: { userId: v.id("users") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

// Public mutation: update the current user's online presence
export const updatePresence = mutation({
    args: {
        isOnline: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", identity.subject))
            .unique();

        if (!user) return;

        await ctx.db.patch(user._id, {
            isOnline: args.isOnline,
            lastSeen: Date.now(),
        });
    },
});
