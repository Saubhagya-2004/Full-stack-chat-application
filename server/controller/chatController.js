import { redis, MESSAGES_LIST, REACTIONS_PREFIX } from '../config/redis.js';

// POST /api/send
export const sendMessage = async (req, res) => {
    try {
        const { user, text } = req.body;

        if (!user || !text) {
            return res.status(400).json({ error: 'User and text are required' });
        }

        const message = {
            user,
            text,
            time: Date.now()
        };

        await redis.rpush(MESSAGES_LIST, JSON.stringify(message));
        console.log('✅ Message sent:', message);
        res.json({ success: true, message });
    } catch (err) {
        console.error('❌ Send error:', err);
        res.status(500).json({ error: 'Failed to send message' });
    }
};

// POST /api/react
export const addReaction = async (req, res) => {
    try {
        const { messageTime, messageIndex, emoji, user } = req.body;

        if (!messageTime || messageIndex === undefined || !emoji || !user) {
            return res.status(400).json({ error: 'messageTime, messageIndex, emoji, and user are required' });
        }

        const reactionKey = `${REACTIONS_PREFIX}:${messageTime}:${messageIndex}`;

        const existing = await redis.hget(reactionKey, emoji);
        let users = existing ? (typeof existing === 'string' ? JSON.parse(existing) : existing) : [];

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

        res.json({ success: true, emoji, users });
    } catch (err) {
        console.error('❌ React error:', err);
        res.status(500).json({ error: 'Failed to add reaction' });
    }
};

// GET /api/reactions
export const getReactions = async (req, res) => {
    try {
        const messages = await redis.lrange(MESSAGES_LIST, 0, -1);
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

        res.json(reactions);
    } catch (err) {
        console.error('❌ Get reactions error:', err);
        res.status(500).json({ error: 'Failed to get reactions' });
    }
};

// GET /api/poll
export const pollMessages = async (req, res) => {
    try {
        const lastTime = Number(req.query.lastTime || 0);

        const messages = await redis.lrange(MESSAGES_LIST, 0, -1);
        const newMessages = messages.filter(m => m.time > lastTime);

        if (newMessages.length > 0) {
            return res.json(newMessages);
        }

        const checkInterval = setInterval(async () => {
            try {
                const messages = await redis.lrange(MESSAGES_LIST, 0, -1);
                const newMessages = messages.filter(m => m.time > lastTime);

                if (newMessages.length > 0) {
                    clearInterval(checkInterval);
                    clearTimeout(timeout);
                    res.json(newMessages);
                }
            } catch (err) {
                clearInterval(checkInterval);
                clearTimeout(timeout);
                console.error('Polling check error:', err);
            }
        }, 1000);

        const timeout = setTimeout(() => {
            clearInterval(checkInterval);
            res.json([]);
        }, 25000);

        req.on('close', () => {
            clearInterval(checkInterval);
            clearTimeout(timeout);
        });

    } catch (err) {
        console.error('❌ Poll error:', err);
        res.status(500).json({ error: 'Polling failed' });
    }
};

// GET /api/messages
export const getMessages = async (req, res) => {
    try {
        const messages = await redis.lrange(MESSAGES_LIST, 0, -1);
        res.json(messages);
    } catch (err) {
        console.error('❌ Get messages error:', err);
        res.status(500).json({ error: 'Failed to get messages' });
    }
};

// DELETE /api/messages
export const clearMessages = async (req, res) => {
    try {
        await redis.del(MESSAGES_LIST);
        res.json({ success: true, message: 'All messages cleared' });
    } catch (err) {
        console.error('❌ Clear messages error:', err);
        res.status(500).json({ error: 'Failed to clear messages' });
    }
};

// GET /api/health
export const healthCheck = (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
};
