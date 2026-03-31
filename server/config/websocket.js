import { WebSocketServer } from 'ws';

let wss = null;

export function initWebSocketServer(httpServer) {
    wss = new WebSocketServer({ server: httpServer });
    console.log('🔌 WebSocket server attached to HTTP server');
    return wss;
}

/**
 * Broadcast a JS object (auto-serialised to JSON) to every connected client.
 */
export function broadcast(data) {
    if (!wss) return;
    const json = JSON.stringify(data);
    wss.clients.forEach((client) => {
        if (client.readyState === 1) {   // 1 = OPEN
            client.send(json);
        }
    });
}

/**
 * Send a JS object to a single WebSocket client.
 */
export function sendTo(ws, data) {
    if (ws.readyState === 1) {
        ws.send(JSON.stringify(data));
    }
}

export { wss };
