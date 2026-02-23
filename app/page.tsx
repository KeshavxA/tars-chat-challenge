"use client";

import { useUser, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MessageSquare, Users, Zap } from "lucide-react";

export default function Home() {
  const { user, isLoaded } = useUser();
  const convexUser = useQuery(api.users.currentUser);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <MessageSquare className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">TARS Chat</h1>
          </div>
          <div className="flex items-center gap-4">
            {convexUser && (
              <span className="text-sm text-muted-foreground">
                Welcome, <span className="font-medium text-foreground">{convexUser.name}</span>
              </span>
            )}
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "h-9 w-9",
                },
              }}
            />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 flex-col items-center justify-center px-6">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-yellow-500" />
            Powered by Convex real-time sync
          </div>
          <h2 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
            Real-time messaging,{" "}
            <span className="bg-gradient-to-r from-blue-500 to-violet-500 bg-clip-text text-transparent">
              reimagined
            </span>
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Lightning-fast conversations with your team. Built with Next.js, Convex, and Clerk
            for a seamless real-time experience.
          </p>

          {/* Feature Cards */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="group rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-lg hover:shadow-primary/5">
              <MessageSquare className="mx-auto mb-3 h-8 w-8 text-blue-500 transition-transform group-hover:scale-110" />
              <h3 className="mb-1 font-semibold">Live Chat</h3>
              <p className="text-sm text-muted-foreground">Instant messaging with real-time delivery</p>
            </div>
            <div className="group rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-lg hover:shadow-primary/5">
              <Users className="mx-auto mb-3 h-8 w-8 text-violet-500 transition-transform group-hover:scale-110" />
              <h3 className="mb-1 font-semibold">User Profiles</h3>
              <p className="text-sm text-muted-foreground">Auto-synced from Clerk authentication</p>
            </div>
            <div className="group rounded-xl border border-border/50 bg-card p-6 transition-all hover:border-border hover:shadow-lg hover:shadow-primary/5">
              <Zap className="mx-auto mb-3 h-8 w-8 text-yellow-500 transition-transform group-hover:scale-110" />
              <h3 className="mb-1 font-semibold">Blazing Fast</h3>
              <p className="text-sm text-muted-foreground">Powered by Convex reactive queries</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
