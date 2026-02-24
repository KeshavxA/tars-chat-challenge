"use client";

import { useState, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Users, UserRoundSearch } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

function formatLastSeen(timestamp: number): string {
    const now = Date.now();
    const diffMs = now - timestamp;
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    if (diffHour < 24) return `${diffHour}h ago`;
    if (diffDay < 7) return `${diffDay}d ago`;
    return new Date(timestamp).toLocaleDateString();
}

interface SidebarProps {
    selectedUserId: Id<"users"> | null;
    onSelectUser: (userId: Id<"users">, userName: string, userImage: string) => void;
}

export default function Sidebar({ selectedUserId, onSelectUser }: SidebarProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const users = useQuery(api.users.getOtherUsers);
    const unreadCounts = useQuery(api.messages.getUnreadCounts) ?? {};
    const conversationMap = useQuery(api.conversations.getConversationMap) ?? {};

    const filteredUsers = useMemo(() => {
        if (!users) return [];
        if (!searchQuery.trim()) return users;
        const query = searchQuery.toLowerCase();
        return users.filter((user) => user.name.toLowerCase().includes(query));
    }, [users, searchQuery]);

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <div className="flex h-full flex-col border-r border-border/40 bg-card/50">
            <div className="flex-none p-4 pb-3">
                <div className="mb-3 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600">
                        <Users className="h-4 w-4 text-white" />
                    </div>
                    <h2 className="text-base font-semibold tracking-tight">Contacts</h2>
                    {users && (
                        <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-xs font-medium text-primary">
                            {users.length}
                        </span>
                    )}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        id="user-search"
                        placeholder="Search users..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-9 pl-9 text-sm bg-background/60 border-border/50 focus-visible:border-primary/50"
                    />
                </div>
            </div>

            <ScrollArea className="flex-1 px-2">
                {!users ? (
                    <div className="flex flex-col gap-1 px-1 py-2">
                        {[...Array(5)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5 animate-pulse">
                                <div className="h-9 w-9 rounded-full bg-muted flex-none" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-3.5 w-24 rounded bg-muted" />
                                    <div className="h-2.5 w-16 rounded bg-muted/60" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <EmptyState searchQuery={searchQuery} />
                ) : (
                    <div className="flex flex-col gap-0.5 pb-2">
                        {filteredUsers.map((user) => (
                            <button
                                key={user._id}
                                id={`user-${user._id}`}
                                onClick={() => onSelectUser(user._id, user.name, user.imageUrl)}
                                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all duration-200 cursor-pointer ${selectedUserId === user._id
                                    ? "bg-gradient-to-r from-primary/15 to-primary/5 shadow-sm shadow-primary/10 ring-1 ring-primary/20 border-l-2 border-primary"
                                    : "hover:bg-muted/80 hover:shadow-sm hover:scale-[1.01] active:scale-[0.99]"
                                    }`}
                            >
                                <div className="relative flex-none">
                                    <Avatar size="default">
                                        <AvatarImage src={user.imageUrl} alt={user.name} />
                                        <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-primary">
                                            {getInitials(user.name)}
                                        </AvatarFallback>
                                    </Avatar>
                                    {user.isOnline && (
                                        <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />
                                    )}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p
                                        className={`truncate text-sm font-medium transition-colors ${selectedUserId === user._id
                                            ? "bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent"
                                            : "text-foreground group-hover:text-foreground"
                                            }`}
                                    >
                                        {user.name}
                                    </p>
                                    <p className="truncate text-xs text-muted-foreground">
                                        {user.isOnline ? (
                                            <span className="text-emerald-500">Online</span>
                                        ) : user.lastSeen ? (
                                            <span>Last seen {formatLastSeen(user.lastSeen)}</span>
                                        ) : (
                                            "Offline"
                                        )}
                                    </p>
                                </div>

                                {(() => {
                                    const convId = conversationMap[user._id];
                                    const unread = convId ? unreadCounts[convId] ?? 0 : 0;

                                    if (unread > 0 && selectedUserId !== user._id) {
                                        return (
                                            <span className="flex-none inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-violet-600 px-1.5 text-[10px] font-bold text-white shadow-sm shadow-blue-500/30">
                                                {unread > 9 ? "9+" : unread}
                                            </span>
                                        );
                                    }

                                    if (selectedUserId === user._id) {
                                        return (
                                            <div className="h-2 w-2 flex-none rounded-full bg-primary animate-pulse shadow-sm shadow-primary/50" />
                                        );
                                    }

                                    return null;
                                })()}
                            </button>
                        ))}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
}

function EmptyState({ searchQuery }: { searchQuery: string }) {
    return (
        <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80">
                <UserRoundSearch className="h-7 w-7 text-muted-foreground/60" />
            </div>
            {searchQuery.trim() ? (
                <>
                    <p className="text-sm font-medium text-foreground">No users found</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        No users matching &ldquo;
                        <span className="font-medium text-foreground/80">{searchQuery}</span>
                        &rdquo;. Try a different search.
                    </p>
                </>
            ) : (
                <>
                    <p className="text-sm font-medium text-foreground">No contacts yet</p>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        When other users sign up, they&apos;ll appear here automatically.
                    </p>
                </>
            )}
        </div>
    );
}
