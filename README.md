# 💬 TARS Chat — Real-Time Messaging Application

A full-featured, real-time chat application built as part of the **TARS Chat Challenge**. This project demonstrates modern web development practices with a focus on real-time communication, responsive design, and a polished user experience.

> **🔗 Live Demo:** (https://tars-chat-challenge-sigma.vercel.app/)

---

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) |
| **Language** | TypeScript |
| **Backend / Database** | [Convex](https://convex.dev/) (real-time serverless) |
| **Authentication** | [Clerk](https://clerk.com/) (OAuth + email) |
| **Styling** | [Tailwind CSS v4](https://tailwindcss.com/) |
| **UI Components** | [shadcn/ui](https://ui.shadcn.com/) + Radix Primitives |
| **Icons** | [Lucide React](https://lucide.dev/) |

---

## ✨ Features Implemented

### Core Features

| # | Feature | Status | Description |
|---|---------|--------|-------------|
| 1 | **User Authentication** | ✅ | Clerk-powered sign-up/sign-in with OAuth support. User profiles auto-synced to Convex via webhook. |
| 2 | **User Discovery** | ✅ | Sidebar displays all registered users with search/filter. Click any user to start a conversation. |
| 3 | **1-on-1 Messaging** | ✅ | Real-time direct messaging with deterministic conversation creation (no duplicates). |
| 4 | **Real-Time Updates** | ✅ | Messages, presence, typing indicators, and reactions — all update in real time via Convex subscriptions. |
| 5 | **Online Status** | ✅ | Green dot indicator for online users. Shows relative "Last seen 5m ago" for offline users. Heartbeat-based presence tracking. |
| 6 | **Typing Indicators** | ✅ | Animated bouncing dots with "{name} is typing..." — auto-clears after 2s of inactivity or on message send. |
| 7 | **Unread Message Count** | ✅ | Blue gradient badge on each sidebar contact showing unread count (capped at "9+"). Clears when conversation is opened. |
| 8 | **Message Timestamps** | ✅ | Smart contextual formatting: today → `10:45 AM`, this year → `Feb 24, 10:45 AM`, older → `Feb 24, 2025, 10:45 AM`. |
| 9 | **Responsive Design** | ✅ | Mobile-first layout with sidebar ↔ chat toggle. Desktop shows side-by-side view. |
| 10 | **Smart Auto-Scroll** | ✅ | Only auto-scrolls when near the bottom. Shows a floating "New messages ↓" button when scrolled up reading history. |

### Bonus Features

| # | Feature | Status | Description |
|---|---------|--------|-------------|
| 11 | **Delete Own Messages** | ✅ | Soft-delete with hover-reveal trash icon. Deleted messages show "🚫 This message was deleted" placeholder. |
| 12 | **Message Reactions** | ✅ | React with 👍 ❤️ 😂 😮 😢 🔥 via hover popup. Reaction pills display below messages with count + highlighted state. Toggle on/off. |
| 13 | **Loading & Error States** | ✅ | Skeleton loaders for sidebar (5 user cards) and chat (6 message bubbles). Error recovery restores unsent message text. |
| 14 | **Multi-Line Messages** | ✅ | Press `Shift+Enter` to add new lines in a single message. Auto-resizing textarea (up to 5 lines) with internal scroll. Line breaks preserved in chat bubbles. |
| 15 | **Real-Time Chat Online Status** | ✅ | Chat header shows live online/offline status with green dot and "Last seen Xm ago" for offline users — updates in real time via Convex subscription. |
| 16 | **Auto-Focus Input** | ✅ | Message input automatically re-focuses after every sent message for seamless back-to-back typing. |

---

## 🏗️ Architecture

### Project Structure

```
tars-chat-challenge/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Main chat page (layout + state management)
│   ├── layout.tsx                # Root layout with providers
│   ├── globals.css               # Global styles + theme tokens
│   ├── sign-in/                  # Clerk sign-in page
│   └── sign-up/                  # Clerk sign-up page
│
├── components/
│   ├── chat-area.tsx             # Message display, sending, reactions, delete, auto-scroll
│   ├── sidebar.tsx               # User list, search, unread badges, presence indicators
│   ├── providers.tsx             # Convex + Clerk provider wrapper
│   └── ui/                      # shadcn/ui primitives (avatar, input, scroll-area, etc.)
│
├── convex/                       # Convex backend (serverless functions + schema)
│   ├── schema.ts                 # Database schema (6 tables)
│   ├── users.ts                  # User CRUD + presence mutations
│   ├── conversations.ts          # Conversation creation + queries
│   ├── messages.ts               # Send, delete, read status, unread counts
│   ├── typing.ts                 # Typing indicator mutations + query
│   ├── reactions.ts              # Emoji reaction toggle + conversation query
│   ├── http.ts                   # Clerk webhook handler
│   └── auth.config.ts            # Convex auth configuration
│
├── hooks/
│   └── use-presence.ts           # Online presence heartbeat hook
│
└── lib/
    └── utils.ts                  # Utility functions (cn, etc.)
```

### Database Schema (Convex)

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│      users       │     │  conversations   │     │    messages       │
├──────────────────┤     ├──────────────────┤     ├──────────────────┤
│ clerkId          │     │ participantOne   │────▶│ conversationId   │
│ email            │     │ participantTwo   │     │ senderId         │
│ name             │     └──────────────────┘     │ content          │
│ imageUrl         │                              │ isDeleted?       │
│ isOnline         │     ┌──────────────────┐     └──────────────────┘
│ lastSeen?        │     │ typingIndicators │              │
└──────────────────┘     ├──────────────────┤     ┌────────┴─────────┐
                         │ conversationId   │     │    reactions      │
┌──────────────────┐     │ userId           │     ├──────────────────┤
│   readStatus     │     │ lastTyped        │     │ messageId        │
├──────────────────┤     └──────────────────┘     │ userId           │
│ conversationId   │                              │ emoji            │
│ userId           │                              └──────────────────┘
│ lastReadTime     │
└──────────────────┘
```

### Real-Time Data Flow

```
User types → setTyping mutation → Convex DB update → getTypingUsers subscription → Other user's UI updates
User sends → sendMessage mutation → Convex DB insert → getMessages subscription → All participants see message
User reacts → toggleReaction mutation → Convex DB update → getReactionsForConversation subscription → UI updates
Tab focus  → updatePresence mutation → Convex DB patch → getOtherUsers subscription → Sidebar status updates
```

---

## 🛠️ Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **npm** or **yarn**
- A [Clerk](https://clerk.com/) account (for authentication)
- A [Convex](https://convex.dev/) account (for the backend)

### 1. Clone the Repository

```bash
git clone https://github.com/KeshavxA/tars-chat-challenge.git
cd tars-chat-challenge
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env.local` file based on the example:

```bash
cp .env.local.example .env.local
```

Fill in your keys:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-project.convex.cloud
```

### 4. Set Up Convex

```bash
npx convex dev
```

This will push your schema and functions to the Convex cloud. Keep this running in a separate terminal.

### 5. Set Up Clerk Webhook

In your Clerk Dashboard, create a webhook pointing to your Convex HTTP endpoint:
- **URL:** `https://your-project.convex.site/clerk-webhook`
- **Events:** `user.created`, `user.updated`, `user.deleted`

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎨 Design Decisions

### Why Convex?
Convex provides **real-time subscriptions out of the box** — no WebSocket setup, no polling. Every query automatically updates when underlying data changes, which is perfect for a chat application where latency matters.

### Why Clerk?
Clerk handles the entire auth flow (sign-up, sign-in, session management, user profiles) with minimal configuration. The webhook integration syncs user data to Convex automatically.

### Typing Indicator Strategy
Uses a **timestamp-based approach** with a 2-second TTL. The client sends `setTyping()` on each keystroke (debounced), and `clearTyping()` after 2s of inactivity or on message send. The query filters out stale indicators server-side.

### Unread Count Strategy
A `readStatus` table tracks the last time each user viewed a conversation. Unread count = messages from the other user created after `lastReadTime`. This is recalculated via a real-time Convex query.

### Reactions — Convex ASCII Key Workaround
Convex requires object field names to be ASCII-only. Since emoji characters can't be used as keys, reactions are returned as arrays (`[{ emoji: "❤️", count: 1, hasReacted: true }]`) instead of emoji-keyed objects.

### Multi-Line Messages
Replaced the single-line `<Input>` with an auto-resizing `<textarea>`. Press `Enter` to send, `Shift+Enter` to insert a new line. The textarea grows up to ~5 lines (120px), then scrolls internally. Messages display with `whitespace-pre-wrap` to preserve line breaks.

### Chat Header — Real-Time Online Status
The chat header now queries the recipient's actual `isOnline` status from Convex via a `getUserById` subscription instead of hardcoding "Online". When the user is offline, it shows a relative "Last seen Xm/h/d ago" timestamp in gray.

---

## 📋 Feature Checklist (Challenge Requirements)

- [x] User authentication (Clerk)
- [x] User list / discovery with search
- [x] 1-on-1 direct messaging
- [x] Real-time message updates
- [x] Online/offline presence indicators
- [x] Typing indicators (animated dots)
- [x] Unread message count badges
- [x] Smart message timestamps (today / date / year)
- [x] Responsive mobile & desktop layout
- [x] Smart auto-scroll with "New messages" button
- [x] Delete own messages (soft delete)
- [x] Message reactions (emoji)
- [x] Skeleton loading states
- [x] Multi-line messages (Shift+Enter)
- [x] Real-time online/offline status in chat header
- [x] Auto-focus input after sending

---

## 👨‍💻 Author

**Keshav Sharma**
- GitHub: [@KeshavxA](https://github.com/KeshavxA)

---

Built with ❤️ for the TARS Chat Challenge
