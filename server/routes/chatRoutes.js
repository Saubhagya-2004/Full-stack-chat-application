import { Router } from 'express';
import {
    sendMessage,
    addReaction,
    getReactions,
    pollMessages,
    getMessages,
    clearMessages,
    healthCheck,
} from '../controller/chatController.js';

const router = Router();

// Message routes
router.post('/send', sendMessage);
router.get('/poll', pollMessages);
router.get('/messages', getMessages);
router.delete('/messages', clearMessages);

// Reaction routes
router.post('/react', addReaction);
router.get('/reactions', getReactions);

// Health & info
router.get('/health', healthCheck);
router.get('/', (req, res) => res.json({ message: 'Chat API is running' }));

export default router;
