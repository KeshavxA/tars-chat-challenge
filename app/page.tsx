"use client";

import { useState } from "react";
import { useUser, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { MessageSquare, ArrowLeft } from "lucide-react";
import Sidebar from "@/components/sidebar";
import type { Id } from "@/convex/_generated/dataModel";

interface SelectedUser {
  id: Id<"users">;
  name: string;
  imageUrl: string;
}

export default function Home() {
  const { isLoaded, isSignedIn } = useUser();
  const convexUser = useQuery(api.users.currentUser);
  const [selectedUser, setSelectedUser] = useState<SelectedUser | null>(null);
  const [showChat, setShowChat] = useState(false);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground animate-pulse">Loading TARS Chat...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center px-6">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-purple-500/10 ring-1 ring-border/30">
            <MessageSquare className="h-10 w-10 text-primary/40" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome to TARS Chat</h1>
          <p className="mt-2 text-sm text-muted-foreground">Please sign in to start chatting</p>
          <a
            href="/sign-in"
            className="mt-4 inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    );
  }

  const handleSelectUser = (userId: Id<"users">, userName: string, userImage: string) => {
    setSelectedUser({ id: userId, name: userName, imageUrl: userImage });
    setShowChat(true);
  };

  const handleBackToSidebar = () => {
    setShowChat(false);
  };

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      <header className="flex-none h-14 border-b border-border/40 bg-background/80 backdrop-blur-xl z-50">
        <div className="flex h-full items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 shadow-lg shadow-blue-500/20">
              <MessageSquare className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              TARS Chat
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {convexUser && (
              <span className="hidden sm:inline text-sm text-muted-foreground">
                {convexUser.name}
              </span>
            )}
            <UserButton
              afterSignOutUrl="/sign-in"
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8 ring-2 ring-border/50",
                },
              }}
            />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside
          className={`
            w-full md:w-80 lg:w-96 flex-none
            transition-transform duration-200 ease-in-out
            ${showChat ? "-translate-x-full md:translate-x-0" : "translate-x-0"}
            absolute md:relative inset-0 top-14 z-30 md:z-auto
          `}
        >
          <Sidebar
            selectedUserId={selectedUser?.id ?? null}
            onSelectUser={handleSelectUser}
          />
        </aside>

        <main
          className={`
            flex-1 flex flex-col min-w-0
            transition-transform duration-200 ease-in-out
            ${!showChat ? "translate-x-full md:translate-x-0" : "translate-x-0"}
            absolute md:relative inset-0 top-14 z-20 md:z-auto
          `}
        >
          {selectedUser ? (
            <ChatPlaceholder
              userName={selectedUser.name}
              userImage={selectedUser.imageUrl}
              onBack={handleBackToSidebar}
            />
          ) : (
            <NoChatSelected />
          )}
        </main>
      </div>
    </div>
  );
}

function ChatPlaceholder({
  userName,
  userImage,
  onBack,
}: {
  userName: string;
  userImage: string;
  onBack: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-background">
      <div className="flex-none flex items-center gap-3 border-b border-border/40 px-4 h-14 bg-card/30">
        <button
          onClick={onBack}
          className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src={userImage}
              alt={userName}
              className="h-8 w-8 rounded-full object-cover ring-2 ring-border/50"
            />
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
          </div>
          <div>
            <p className="text-sm font-semibold">{userName}</p>
            <p className="text-xs text-emerald-500">Online</p>
          </div>
        </div>
      </div>


      <div className="flex flex-1 items-center justify-center">
        <div className="text-center px-6">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10">
            <MessageSquare className="h-8 w-8 text-primary/50" />
          </div>
          <p className="text-base font-semibold text-foreground">
            Chat with {userName}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Messaging will be available in the next phase.
          </p>
        </div>
      </div>
    </div>
  );
}

function NoChatSelected() {
  return (
    <div className="flex h-full items-center justify-center bg-background">
      <div className="text-center px-6">
        <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-500/10 via-violet-500/10 to-purple-500/10 ring-1 ring-border/30">
          <MessageSquare className="h-10 w-10 text-primary/40" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-foreground">
          Welcome to TARS Chat
        </h2>
        <p className="mt-2 max-w-xs mx-auto text-sm text-muted-foreground leading-relaxed">
          Select a contact from the sidebar to start a conversation.
        </p>
        <div className="mt-5 flex items-center justify-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span className="h-1.5 w-1.5 rounded-full bg-violet-500 animate-pulse [animation-delay:150ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 animate-pulse [animation-delay:300ms]" />
        </div>
      </div>
    </div>
  );
}
