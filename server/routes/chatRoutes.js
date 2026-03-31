import { Router } from 'express';
import {
    getMessages,
    clearMessages,
    getReactions,
    healthCheck,
} from '../controller/chatController.js';

const router = Router();

// REST fallback endpoints (GET only — sending/reacting is now via WebSocket)
router.get('/messages', getMessages);
router.delete('/messages', clearMessages);
router.get('/reactions', getReactions);
router.get('/health', healthCheck);
router.get('/', (req, res) => res.json({ message: 'Chat API running — use WebSocket for real-time' }));

export default router;
