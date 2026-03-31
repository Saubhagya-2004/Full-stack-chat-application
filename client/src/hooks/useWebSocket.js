import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = import.meta.env.VITE_BACKEND_WS_URL;

/**
 * Custom hook that manages a WebSocket connection to the chat server.
 *
 * Exposes:
 *  - messages      : array of message objects  { user, text, time }
 *  - reactions     : object  { "time:index": { "emoji": [users] } }
 *  - isConnected   : boolean
 *  - sendMessage   : (user, text) => void
 *  - sendReaction  : (messageTime, messageIndex, emoji, user) => void
 */
export function useWebSocket(user) {
    const [messages, setMessages] = useState([]);
    const [reactions, setReactions] = useState({});
    const [isConnected, setIsConnected] = useState(false);

    const wsRef = useRef(null);
    const reconnectTimer = useRef(null);
    const reconnectDelay = useRef(1000);   // start at 1 s, doubles each retry
    const isMounted = useRef(true);

    const connect = useCallback(() => {
        if (!isMounted.current) return;

        console.log(`🔌 Connecting to WebSocket: ${WS_URL}`);
        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            if (!isMounted.current) return;
            console.log('✅ WebSocket connected');
            setIsConnected(true);
            reconnectDelay.current = 1000;   // reset backoff on success
        };

        ws.onmessage = (event) => {
            if (!isMounted.current) return;
            let parsed;
            try {
                parsed = JSON.parse(event.data);
            } catch {
                console.error('Failed to parse WS message:', event.data);
                return;
            }

            const { type, payload } = parsed;

            if (type === 'history') {
                // Full history on first connect
                const msgs = (payload.messages || []).filter(m => !m.isSystem);
                setMessages(msgs);
                setReactions(payload.reactions || {});
            }

            else if (type === 'message') {
                // New message broadcast from server
                if (!payload.isSystem) {
                    setMessages(prev => [...prev, payload]);
                }
            }

            else if (type === 'reactions') {
                // Full reactions snapshot after any toggle
                setReactions(payload);
            }

            else if (type === 'error') {
                console.error('Server error:', payload);
            }
        };

        ws.onclose = (event) => {
            if (!isMounted.current) return;
            console.warn(`🔴 WebSocket closed (code ${event.code}). Reconnecting in ${reconnectDelay.current / 1000}s...`);
            setIsConnected(false);
            wsRef.current = null;

            // Exponential backoff reconnect (max 30 s)
            reconnectTimer.current = setTimeout(() => {
                reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30000);
                connect();
            }, reconnectDelay.current);
        };

        ws.onerror = (err) => {
            console.error('WebSocket error:', err);
            ws.close();   // triggers onclose → reconnect
        };
    }, []);

    useEffect(() => {
        isMounted.current = true;
        connect();

        return () => {
            isMounted.current = false;
            clearTimeout(reconnectTimer.current);
            if (wsRef.current) {
                wsRef.current.onclose = null;   // prevent reconnect on intentional unmount
                wsRef.current.close();
            }
        };
    }, [connect]);

    // ── Actions ────────────────────────────────────────────────

    const sendMessage = useCallback((user, text) => {
        if (!text.trim()) return;
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'send', payload: { user, text } }));
        } else {
            console.warn('WebSocket not open — message dropped');
        }
    }, []);

    const sendReaction = useCallback((messageTime, messageIndex, emoji, user) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'react',
                payload: { messageTime, messageIndex, emoji, user },
            }));
        }
    }, []);

    return { messages, reactions, isConnected, sendMessage, sendReaction };
}
