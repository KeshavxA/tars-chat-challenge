"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
    ArrowLeft, Send, MessageSquare, Loader2,
    ChevronDown, Trash2, Ban, SmilePlus,
} from "lucide-react";
import type { Id } from "@/convex/_generated/dataModel";

const QUICK_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"];

interface ChatAreaProps {
    conversationId: Id<"conversations"> | null;
    recipientId: Id<"users">;
    recipientName: string;
    recipientImage: string;
    onBack: () => void;
}

export default function ChatArea({
    conversationId,
    recipientId,
    recipientName,
    recipientImage,
    onBack,
}: ChatAreaProps) {
    const messages = useQuery(
        api.messages.getMessages,
        conversationId ? { conversationId } : "skip"
    );
    const typingUsers = useQuery(
        api.typing.getTypingUsers,
        conversationId ? { conversationId } : "skip"
    );
    const reactions = useQuery(
        api.reactions.getReactionsForConversation,
        conversationId ? { conversationId } : "skip"
    );
    const recipientUser = useQuery(api.users.getUserById, { userId: recipientId });

    const sendMessage = useMutation(api.messages.sendMessage);
    const deleteMessage = useMutation(api.messages.deleteMessage);
    const toggleReaction = useMutation(api.reactions.toggleReaction);
    const setTypingMutation = useMutation(api.typing.setTyping);
    const clearTypingMutation = useMutation(api.typing.clearTyping);

    const [newMessage, setNewMessage] = useState("");
    const [isSending, setIsSending] = useState(false);
    const [showNewMessageButton, setShowNewMessageButton] = useState(false);
    const [activeEmojiPicker, setActiveEmojiPicker] = useState<string | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const isNearBottomRef = useRef(true);
    const prevMessageCountRef = useRef(0);

    // ── Smart Auto-Scroll ──────────────────────────────────
    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        setShowNewMessageButton(false);
    }, []);

    const checkIfNearBottom = useCallback(() => {
        const container = scrollContainerRef.current;
        if (!container) return true;
        // Find the actual scrollable viewport inside ScrollArea
        const viewport = container.querySelector("[data-radix-scroll-area-viewport]");
        if (!viewport) return true;
        const { scrollTop, scrollHeight, clientHeight } = viewport;
        return scrollHeight - scrollTop - clientHeight < 100;
    }, []);

    // Track scroll position
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;
        const viewport = container.querySelector("[data-radix-scroll-area-viewport]");
        if (!viewport) return;

        const handleScroll = () => {
            isNearBottomRef.current = checkIfNearBottom();
            if (isNearBottomRef.current) {
                setShowNewMessageButton(false);
            }
        };

        viewport.addEventListener("scroll", handleScroll);
        return () => viewport.removeEventListener("scroll", handleScroll);
    }, [checkIfNearBottom]);

    // Auto-scroll only if near bottom, else show "New messages" button
    useEffect(() => {
        if (!messages) return;
        const newCount = messages.length;
        const hadNewMessages = newCount > prevMessageCountRef.current;
        prevMessageCountRef.current = newCount;

        if (isNearBottomRef.current) {
            scrollToBottom();
        } else if (hadNewMessages) {
            setShowNewMessageButton(true);
        }
    }, [messages, scrollToBottom]);

    // ── Message Sending ────────────────────────────────────
    const handleSend = async () => {
        if (!newMessage.trim() || !conversationId || isSending) return;

        const messageContent = newMessage.trim();
        setNewMessage("");
        setIsSending(true);

        // Reset textarea height
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
            typingTimeoutRef.current = null;
        }
        clearTypingMutation({ conversationId });

        try {
            await sendMessage({ conversationId, content: messageContent });
        } catch (error) {
            console.error("Failed to send message:", error);
            setNewMessage(messageContent);
        } finally {
            setIsSending(false);
            // Re-focus the textarea after sending
            textareaRef.current?.focus();
        }
    };

    // ── Typing Indicator ───────────────────────────────────
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setNewMessage(e.target.value);

        // Auto-resize textarea
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
            textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + "px";
        }

        if (!conversationId) return;

        setTypingMutation({ conversationId });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            clearTypingMutation({ conversationId });
            typingTimeoutRef.current = null;
        }, 2000);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Delete Message ─────────────────────────────────────
    const handleDelete = async (messageId: Id<"messages">) => {
        try {
            await deleteMessage({ messageId });
        } catch (error) {
            console.error("Failed to delete message:", error);
        }
    };

    // ── Reactions ──────────────────────────────────────────
    const handleReaction = async (messageId: Id<"messages">, emoji: string) => {
        try {
            await toggleReaction({ messageId, emoji });
            setActiveEmojiPicker(null);
        } catch (error) {
            console.error("Failed to toggle reaction:", error);
        }
    };

    // ── Helpers ────────────────────────────────────────────
    const getInitials = (name: string) =>
        name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

    const isRecipientOnline = recipientUser?.isOnline ?? false;

    const formatLastSeen = (lastSeen?: number) => {
        if (!lastSeen) return "Offline";
        const diff = Date.now() - lastSeen;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return "Last seen just now";
        if (minutes < 60) return `Last seen ${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `Last seen ${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `Last seen ${days}d ago`;
    };

    const formatTime = (timestamp: number) => {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday =
            date.getDate() === now.getDate() &&
            date.getMonth() === now.getMonth() &&
            date.getFullYear() === now.getFullYear();
        const isSameYear = date.getFullYear() === now.getFullYear();
        const time = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

        if (isToday) return time;
        const month = date.toLocaleDateString([], { month: "short" });
        const day = date.getDate();
        if (isSameYear) return `${month} ${day}, ${time}`;
        return `${month} ${day}, ${date.getFullYear()}, ${time}`;
    };

    // Get reactions for a specific message
    const getMessageReactions = (messageId: string): Array<{ emoji: string; count: number; hasReacted: boolean }> => {
        if (!reactions) return [];
        return (reactions[messageId] as Array<{ emoji: string; count: number; hasReacted: boolean }>) ?? [];
    };

    // ── Render ────────────────────────────────────────────
    return (
        <div className="flex h-full flex-col bg-background overflow-hidden">
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
                        {isRecipientOnline && (
                            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-emerald-500" />
                        )}
                    </div>
                    <div>
                        <p className="text-sm font-semibold">{recipientName}</p>
                        <p className={`text-xs ${isRecipientOnline ? "text-emerald-500" : "text-muted-foreground"}`}>
                            {isRecipientOnline ? "Online" : formatLastSeen(recipientUser?.lastSeen)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 min-h-0 px-4 relative" ref={scrollContainerRef}>
                <div className="py-4 space-y-1">
                    {!messages ? (
                        /* ── Skeleton Loader ── */
                        <div className="flex flex-col gap-3 py-4">
                            {[...Array(6)].map((_, i) => (
                                <div
                                    key={i}
                                    className={`flex ${i % 2 === 0 ? "justify-start" : "justify-end"}`}
                                >
                                    {i % 2 === 0 && (
                                        <div className="mr-2 h-8 w-8 rounded-full bg-muted animate-pulse" />
                                    )}
                                    <div
                                        className={`rounded-2xl animate-pulse ${i % 2 === 0 ? "bg-muted/80" : "bg-primary/20"
                                            }`}
                                        style={{
                                            width: `${120 + Math.random() * 150}px`,
                                            height: `${36 + (i % 3) * 12}px`,
                                        }}
                                    />
                                </div>
                            ))}
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
                            const msgReactions = getMessageReactions(message._id);
                            const hasReactions = msgReactions.length > 0;

                            return (
                                <div
                                    key={message._id}
                                    className={`flex ${message.isCurrentUser ? "justify-end" : "justify-start"} ${isConsecutive ? "mt-0.5" : "mt-3"}`}
                                >
                                    {/* Sender avatar */}
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

                                    <div className={`group relative max-w-[75%] ${message.isCurrentUser ? "items-end" : "items-start"}`}>
                                        {/* Message Bubble */}
                                        {message.isDeleted ? (
                                            <div className="rounded-2xl px-3.5 py-2 text-sm leading-relaxed bg-muted/40 border border-border/30 rounded-br-md">
                                                <p className="italic text-muted-foreground/70 flex items-center gap-1.5">
                                                    <Ban className="h-3.5 w-3.5" />
                                                    This message was deleted
                                                </p>
                                            </div>
                                        ) : (
                                            <>
                                                <div
                                                    className={`rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${message.isCurrentUser
                                                        ? "bg-gradient-to-br from-blue-600 to-violet-600 text-white rounded-br-md"
                                                        : "bg-muted/80 text-foreground rounded-bl-md"
                                                        }`}
                                                >
                                                    <p className="whitespace-pre-wrap break-words">{message.content}</p>
                                                    <p
                                                        className={`mt-1 text-[10px] leading-none ${message.isCurrentUser
                                                            ? "text-white/60 text-right"
                                                            : "text-muted-foreground/60 text-left"
                                                            }`}
                                                    >
                                                        {formatTime(message._creationTime)}
                                                    </p>
                                                </div>

                                                {/* Action buttons (visible on hover) */}
                                                <div
                                                    className={`absolute top-0 ${message.isCurrentUser ? "-left-16" : "-right-16"
                                                        } flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity`}
                                                >
                                                    <button
                                                        onClick={() =>
                                                            setActiveEmojiPicker(
                                                                activeEmojiPicker === message._id ? null : message._id
                                                            )
                                                        }
                                                        className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted/80 transition-colors"
                                                        title="React"
                                                    >
                                                        <SmilePlus className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </button>
                                                    {message.isCurrentUser && (
                                                        <button
                                                            onClick={() => handleDelete(message._id)}
                                                            className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-red-500/10 transition-colors"
                                                            title="Delete message"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                                                        </button>
                                                    )}
                                                </div>

                                                {/* Emoji Picker */}
                                                {activeEmojiPicker === message._id && (
                                                    <div
                                                        className={`absolute z-50 ${message.isCurrentUser ? "right-0" : "left-0"
                                                            } -top-10 flex items-center gap-0.5 rounded-full bg-card border border-border/50 shadow-lg px-1.5 py-1`}
                                                    >
                                                        {QUICK_EMOJIS.map((emoji) => (
                                                            <button
                                                                key={emoji}
                                                                onClick={() => handleReaction(message._id, emoji)}
                                                                className="h-7 w-7 flex items-center justify-center rounded-full hover:bg-muted/80 text-base transition-transform hover:scale-125"
                                                            >
                                                                {emoji}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Reactions display */}
                                                {hasReactions && (
                                                    <div
                                                        className={`flex flex-wrap gap-1 mt-1 ${message.isCurrentUser ? "justify-end" : "justify-start"
                                                            }`}
                                                    >
                                                        {msgReactions.map((reactionData) => (
                                                            <button
                                                                key={reactionData.emoji}
                                                                onClick={() => handleReaction(message._id, reactionData.emoji)}
                                                                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs border transition-colors ${reactionData.hasReacted
                                                                    ? "bg-primary/10 border-primary/30 text-primary"
                                                                    : "bg-muted/50 border-border/50 text-muted-foreground hover:bg-muted/80"
                                                                    }`}
                                                            >
                                                                <span>{reactionData.emoji}</span>
                                                                <span className="text-[10px] font-medium">{reactionData.count}</span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    )}
                    <div ref={messagesEndRef} />
                </div>
            </ScrollArea>

            {/* "New messages" scroll-to-bottom button */}
            {showNewMessageButton && (
                <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-40">
                    <button
                        onClick={scrollToBottom}
                        className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground shadow-lg shadow-primary/25 hover:bg-primary/90 transition-all animate-in slide-in-from-bottom-2"
                    >
                        <ChevronDown className="h-3.5 w-3.5" />
                        New messages
                    </button>
                </div>
            )}

            {/* Typing Indicator */}
            {typingUsers && typingUsers.length > 0 && (
                <div className="flex-none px-4 py-1.5 border-t border-border/20">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-0.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:0ms] [animation-duration:600ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:150ms] [animation-duration:600ms]" />
                            <span className="h-1.5 w-1.5 rounded-full bg-primary/70 animate-bounce [animation-delay:300ms] [animation-duration:600ms]" />
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                            {typingUsers.map((u: { id: string; name: string } | null) => u?.name).join(", ")} is typing...
                        </p>
                    </div>
                </div>
            )}

            {/* Message Input */}
            <div className="flex-none border-t border-border/40 bg-card/30 backdrop-blur-sm p-3">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={textareaRef}
                        id="message-input"
                        placeholder={`Message ${recipientName}...`}
                        value={newMessage}
                        onChange={handleInputChange}
                        onKeyDown={handleKeyDown}
                        disabled={isSending || !conversationId}
                        rows={1}
                        className="flex-1 min-h-[40px] max-h-[120px] overflow-y-auto resize-none rounded-xl border border-border/50 bg-background/60 px-3.5 py-2.5 text-sm leading-relaxed placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
