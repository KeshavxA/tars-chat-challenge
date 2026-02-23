"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, MessageSquare, Loader2 } from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

interface ChatAreaProps {
    conversationId: Id<"conversations"> | null;
    recipientName: string;
    recipientImage: string;
    onBack: () => void;
}

export default function ChatArea({
    conversationId,
    recipientName,
    recipientImage,
    onBack,
}: ChatAreaProps) {
    const messages = useQuery(
        api.messages.getMessages,
        conversationId ? { conversationId } : "skip"
    );
    const sendMessage = useMutation(api.messages.sendMessage);
    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom when messages change
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const handleSend = async () => {
        if (!newMessage.trim() || !conversationId || isSending) return;

        const messageContent = newMessage.trim();
        setNewMessage("");
        setIsSending(true);

        try {
            await sendMessage({
                conversationId,
                content: messageContent,
            });
        } catch (error) {
            console.error("Failed to send message:", error);
            setNewMessage(messageContent); // Restore message on failure
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getInitials = (name: string) => {
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .slice(0, 2);
    };

    const formatTime = (timestamp: number) => {
        return new Date(timestamp).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="flex h-full flex-col bg-background">
            {/* Chat Header */}
            <div className="flex-none flex items-center gap-3 border-b border-border/40 px-4 h-14 bg-card/30 backdrop-blur-sm">
                <button
                    id="chat-back-button"
                    onClick={onBack}
                    className="md:hidden flex items-center justify-center h-8 w-8 rounded-lg hover:bg-muted transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                </button>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Avatar size="default">
                            <AvatarImage src={recipientImage} alt={recipientName} />
                            <AvatarFallback className="text-xs font-medium bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-primary">
                                {getInitials(recipientName)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                    </div>
                    <div>
                        <p className="text-sm font-semibold">{recipientName}</p>
                        <p className="text-xs text-emerald-500">Online</p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
                <div className="py-4 space-y-1">
                    {!messages ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="h-6 w-6 animate-spin text-primary/50" />
                                <p className="text-xs text-muted-foreground">Loading messages...</p>
                            </div>
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10">
                                <MessageSquare className="h-8 w-8 text-primary/40" />
                            </div>
                            <p className="text-sm font-medium text-foreground">
                                No messages yet
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">
                                Say hello to {recipientName}! 👋
                            </p>
                        </div>
                    ) : (
                        messages.map((message, index) => {
                            const prevMessage = index > 0 ? messages[index - 1] : null;
                            const showAvatar = !prevMessage || prevMessage.isCurrentUser !== message.isCurrentUser;
                            const isConsecutive = prevMessage && prevMessage.isCurrentUser === message.isCurrentUser;

                            return (
                                <div
                                    key={message._id}
                                    className={`flex ${message.isCurrentUser ? "justify-end" : "justify-start"} ${isConsecutive ? "mt-0.5" : "mt-3"}`}
                                >
                                    {/* Sender avatar (received messages only) */}
                                    {!message.isCurrentUser && (
                                        <div className="mr-2 flex-none w-8">
                                            {showAvatar ? (
                                                <Avatar size="sm">
                                                    <AvatarImage src={message.senderImage} alt={message.senderName} />
                                                    <AvatarFallback className="text-[10px] font-medium bg-gradient-to-br from-blue-500/20 to-violet-500/20 text-primary">
                                                        {getInitials(message.senderName)}
                                                    </AvatarFallback>
                                                </Avatar>
                                            ) : null}
                                        </div>
                                    )}

                                    <div
                                        className={`group relative max-w-[75%] ${message.isCurrentUser ? "items-end" : "items-start"}`}
                                    >
                                        <div
                                            className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${message.isCurrentUser
                                                    ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-br-md"
                                                    : "bg-muted/80 text-foreground rounded-bl-md"
                                                }`}
                                        >
                                            {message.content}
                                        </div>
                                        <p
                                            className={`mt-0.5 text-[10px] text-muted-foreground/60 opacity-0 group-hover:opacity-100 transition-opacity ${message.isCurrentUser ? "text-right" : "text-left"
                                                }`}
                                        >
                                            {formatTime(message._creationTime)}
                                        </p>
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="flex-none border-t border-border/40 bg-card/30 backdrop-blur-sm p-3">
                <div className="flex items-center gap-2">
                    <Input
                        id="message-input"
                        placeholder={`Message ${recipientName}...`}
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isSending || !conversationId}
                        className="flex-1 h-10 bg-background/60 border-border/50 focus-visible:border-primary/50 rounded-xl"
                        autoComplete="off"
                    />
                    <button
                        id="send-message-button"
                        onClick={handleSend}
                        disabled={!newMessage.trim() || isSending || !conversationId}
                        className="flex h-10 w-10 flex-none items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-xl hover:shadow-blue-500/30 disabled:opacity-40 disabled:shadow-none disabled:cursor-not-allowed"
                    >
                        {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Send className="h-4 w-4" />
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
