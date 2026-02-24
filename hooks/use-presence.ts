"use client";

import { useEffect, useRef } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

const HEARTBEAT_INTERVAL = 60_000; // 1 minute

/**
 * Hook that manages user online presence.
 * - Sends a heartbeat every 60 seconds to keep the user "online"
 * - Sets the user offline when the tab is hidden or the window is closed
 * - Sets the user back online when the tab becomes visible again
 */
export function usePresence(isAuthenticated: boolean) {
    const updatePresence = useMutation(api.users.updatePresence);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (!isAuthenticated) return;

        // Go online immediately
        updatePresence({ isOnline: true });

        // Set up heartbeat interval
        intervalRef.current = setInterval(() => {
            updatePresence({ isOnline: true });
        }, HEARTBEAT_INTERVAL);

        // Handle visibility change (tab switching)
        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                updatePresence({ isOnline: true });
            } else {
                updatePresence({ isOnline: false });
            }
        };

        // Handle tab/window close
        const handleBeforeUnload = () => {
            updatePresence({ isOnline: false });
        };

        // Handle window focus/blur
        const handleFocus = () => {
            updatePresence({ isOnline: true });
        };

        const handleBlur = () => {
            updatePresence({ isOnline: false });
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("beforeunload", handleBeforeUnload);
        window.addEventListener("focus", handleFocus);
        window.addEventListener("blur", handleBlur);

        return () => {
            // Clear heartbeat
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }

            // Set offline on cleanup
            updatePresence({ isOnline: false });

            // Remove event listeners
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("beforeunload", handleBeforeUnload);
            window.removeEventListener("focus", handleFocus);
            window.removeEventListener("blur", handleBlur);
        };
    }, [isAuthenticated, updatePresence]);
}
