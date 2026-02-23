import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Clerk webhook endpoint — receives user.created, user.updated, user.deleted
http.route({
    path: "/clerk-webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        // In production, you should verify the webhook signature using svix.
        // For development/local, we skip verification.
        const body = await request.json();
        const eventType = body.type as string;
        const data = body.data;

        switch (eventType) {
            case "user.created":
            case "user.updated": {
                const email =
                    data.email_addresses?.[0]?.email_address ?? "no-email@example.com";
                const name =
                    `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() ||
                    email.split("@")[0];
                const imageUrl = data.image_url ?? "";

                await ctx.runMutation(internal.users.upsertUser, {
                    clerkId: data.id,
                    email,
                    name,
                    imageUrl,
                });
                break;
            }
            case "user.deleted": {
                if (data.id) {
                    await ctx.runMutation(internal.users.deleteUser, {
                        clerkId: data.id,
                    });
                }
                break;
            }
        }

        return new Response("OK", { status: 200 });
    }),
});

export default http;
