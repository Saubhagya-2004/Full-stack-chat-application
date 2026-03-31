import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import chatRoutes from './routes/chatRoutes.js';
import { initWebSocketServer } from './config/websocket.js';
import { handleWebSocketConnection } from './controller/chatController.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// REST routes (health, GET messages, GET reactions kept as fallbacks)
app.use('/api', chatRoutes);

// Create HTTP server and attach WebSocket server to the same port
const httpServer = http.createServer(app);
const wss = initWebSocketServer(httpServer);

// Hand off every new WS connection to the controller
wss.on('connection', (ws, req) => {
    console.log(`🟢 New WebSocket client connected (${wss.clients.size} total)`);
    handleWebSocketConnection(ws);

    ws.on('close', () => {
        console.log(`🔴 Client disconnected (${wss.clients.size} remaining)`);
    });
});

const PORT = process.env.PORT || 8002;

httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Chat server running on port ${PORT}`);
    console.log('📡 WebSocket + REST API ready');
    console.log('🗄️  Using Upstash Redis');
});

process.on('SIGTERM', () => {
    console.log('SIGTERM received, closing server...');
    httpServer.close(() => process.exit(0));
});
