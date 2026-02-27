import { Redis } from '@upstash/redis';
import dotenv from 'dotenv';

dotenv.config();

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const MESSAGES_LIST = 'chat:messages';
const REACTIONS_PREFIX = 'chat:reactions';

// Test Redis connection
redis.ping().then(() => {
    console.log('✅ Connected to Upstash Redis');
}).catch((err) => {
    console.error('❌ Redis connection failed:', err);
});

export { redis, MESSAGES_LIST, REACTIONS_PREFIX };
