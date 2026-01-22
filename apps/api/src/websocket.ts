import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

// Store active connections: Map<userId, WebSocket>
// Note: In production, use Redis for scaling multiple instances
const userClients = new Map<string, WebSocket>();

export const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log("Client connected via WS");
    let currentUserId: string | null = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === "IDENTIFY") {
                const { userId } = data.payload;
                currentUserId = userId;
                userClients.set(userId, ws);
                console.log(`WS identified user: ${userId}`);
            }

            if (data.type === "LOCATION_UPDATE") {
                // Broadcast to others (legacy broadcast)
                const update = JSON.stringify({
                    type: "USER_MOVED",
                    payload: data.payload,
                });

                userClients.forEach((client, id) => {
                    if (client !== ws && client.readyState === WebSocket.OPEN) {
                        client.send(update);
                    }
                });
            }
        } catch (e) {
            console.error("WS Message Error", e);
        }
    });

    ws.on('close', () => {
        if (currentUserId) {
            console.log(`User ${currentUserId} disconnected`);
            userClients.delete(currentUserId);
        }
    });
});

/**
 * Send a direct notification to a specific user
 */
export const notifyUser = (userId: string, type: string, payload: any) => {
    const ws = userClients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type, payload }));
    }
};

// We don't need a Hono app for just the WS part in this pattern,
// we just handle the upgrade in index.ts
export const handleUpgrade = (req: any, socket: any, head: any) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
};
