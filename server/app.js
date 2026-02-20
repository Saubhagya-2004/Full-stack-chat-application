import express from 'express';
import cors from 'cors';
import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Connect to Upstash Redis using REST API (correct approach)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const MESSAGES_LIST = 'chat:messages';

// Test Redis connection
redis.ping().then(() => {
  console.log('✅ Connected to Upstash Redis');
}).catch((err) => {
  console.error('❌ Redis connection failed:', err);
});

// POST /api/send - Send a new message
app.post('/api/send', async (req, res) => {
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

    // Store message in Redis list
    await redis.rpush(MESSAGES_LIST, JSON.stringify(message));

    console.log('✅ Message sent:', message);
    res.json({ success: true, message });
  } catch (err) {
    console.error('❌ Send error:', err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// GET /api/poll - Long polling endpoint
app.get('/api/poll', async (req, res) => {
  try {
    const lastTime = Number(req.query.lastTime || 0);
    
    // Get all messages from Redis (Upstash auto-parses JSON)
    const messages = await redis.lrange(MESSAGES_LIST, 0, -1);
    const newMessages = messages.filter(m => m.time > lastTime);

    if (newMessages.length > 0) {
      return res.json(newMessages);
    }

    // Simple polling with timeout
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
});

// GET /api/messages - Get all messages
app.get('/api/messages', async (req, res) => {
  try {
    // Upstash REST API automatically parses JSON stored values
    const messages = await redis.lrange(MESSAGES_LIST, 0, -1);
    res.json(messages);
  } catch (err) {
    console.error('❌ Get messages error:', err);
    res.status(500).json({ error: 'Failed to get messages' });
  }
});

// DELETE /api/messages - Clear all messages
app.delete('/api/messages', async (req, res) => {
  try {
    await redis.del(MESSAGES_LIST);
    res.json({ success: true, message: 'All messages cleared' });
  } catch (err) {
    console.error('❌ Clear messages error:', err);
    res.status(500).json({ error: 'Failed to clear messages' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Root endpoint
app.get('/api', (req, res) => {
  res.json({ message: 'Chat API is running' });
});

const PORT = process.env.PORT ;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Chat server running on port ${PORT}`);
  console.log('📡 Using Upstash Redis REST API');
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing server...');
  process.exit(0);
});
