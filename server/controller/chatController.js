import { redis, MESSAGES_LIST, REACTIONS_PREFIX } from '../config/redis.js';
import { broadcast, sendTo } from '../config/websocket.js';

// ─────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────

/** Fetch all messages from Redis */
async function fetchMessages() {
    return await redis.lrange(MESSAGES_LIST, 0, -1);
}

/** Fetch all reactions for all messages and return as a flat object */
async function fetchAllReactions(messages) {
    const reactions = {};
    for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const reactionKey = `${REACTIONS_PREFIX}:${m.time}:${i}`;
        const data = await redis.hgetall(reactionKey);
        if (data && Object.keys(data).length > 0) {
            const parsed = {};
            for (const [emoji, users] of Object.entries(data)) {
                parsed[emoji] = typeof users === 'string' ? JSON.parse(users) : users;
            }
            reactions[`${m.time}:${i}`] = parsed;
        }
    }
    return reactions;
}

// ─────────────────────────────────────────────────────────────
//  WebSocket connection handler  (main entry point)
// ─────────────────────────────────────────────────────────────

export const handleWebSocketConnection = async (ws) => {
    // 1. Send full history to this client on connect
    try {
        const messages = await fetchMessages();
        const reactions = await fetchAllReactions(messages);
        sendTo(ws, { type: 'history', payload: { messages, reactions } });
    } catch (err) {
        console.error('❌ Failed to send history:', err);
    }

    // 2. Listen for messages from this client
    ws.on('message', async (raw) => {
        let parsed;
        try {
            parsed = JSON.parse(raw.toString());
        } catch {
            return ws.send(JSON.stringify({ type: 'error', payload: 'Invalid JSON' }));
        }

        const { type, payload } = parsed;

        // ── type: "send" ─────────────────────────────────────
        if (type === 'send') {
            const { user, text } = payload || {};
            if (!user || !text) {
                return sendTo(ws, { type: 'error', payload: 'user and text are required' });
            }

            const message = { user, text: text.trim(), time: Date.now() };
            try {
                await redis.rpush(MESSAGES_LIST, JSON.stringify(message));
                console.log('✅ Message saved:', message);
                // Broadcast to ALL clients (including sender)
                broadcast({ type: 'message', payload: message });
            } catch (err) {
                console.error('❌ Send error:', err);
                sendTo(ws, { type: 'error', payload: 'Failed to save message' });
            }
        }

        // ── type: "react" ─────────────────────────────────────
        else if (type === 'react') {
            const { messageTime, messageIndex, emoji, user } = payload || {};
            if (!messageTime || messageIndex === undefined || !emoji || !user) {
                return sendTo(ws, { type: 'error', payload: 'messageTime, messageIndex, emoji, user required' });
            }

            const reactionKey = `${REACTIONS_PREFIX}:${messageTime}:${messageIndex}`;
            try {
                const existing = await redis.hget(reactionKey, emoji);
                let users = existing
                    ? (typeof existing === 'string' ? JSON.parse(existing) : existing)
                    : [];

                // Toggle: remove if present, add if not
                if (users.includes(user)) {
                    users = users.filter(u => u !== user);
                } else {
                    users.push(user);
                }

                if (users.length === 0) {
                    await redis.hdel(reactionKey, emoji);
                } else {
                    await redis.hset(reactionKey, { [emoji]: JSON.stringify(users) });
                }

                // Fetch fresh full reactions and broadcast to everyone
                const messages = await fetchMessages();
                const reactions = await fetchAllReactions(messages);
                broadcast({ type: 'reactions', payload: reactions });
            } catch (err) {
                console.error('❌ React error:', err);
                sendTo(ws, { type: 'error', payload: 'Failed to process reaction' });
            }
        }

        else {
            sendTo(ws, { type: 'error', payload: `Unknown message type: ${type}` });
        }
    });

    ws.on('error', (err) => console.error('WebSocket error:', err));
};

// ─────────────────────────────────────────────────────────────
//  REST fallback handlers (kept for GET endpoints + health)
// ─────────────────────────────────────────────────────────────

export const getMessages = async (req, res) => {
    try {
        const messages = await fetchMessages();
        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get messages' });
    }
};

export const clearMessages = async (req, res) => {
    try {
        await redis.del(MESSAGES_LIST);
        res.json({ success: true, message: 'All messages cleared' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to clear messages' });
    }
};

export const getReactions = async (req, res) => {
    try {
        const messages = await fetchMessages();
        const reactions = await fetchAllReactions(messages);
        res.json(reactions);
    } catch (err) {
        res.status(500).json({ error: 'Failed to get reactions' });
    }
};

export const healthCheck = (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now(), transport: 'websocket' });
};
