import { WebSocketServer, WebSocket } from 'ws';
import { IncomingMessage } from 'http';

// Store active connections
const clients = new Set<WebSocket>();

// Create a WebSocket Server instance (it will be attached to the HTTP server later)
// We export a setup function or the server itself
export const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
    console.log("Client connected via WS");
    clients.add(ws);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());

            if (data.type === "LOCATION_UPDATE") {
                // Broadcast to others
                const update = JSON.stringify({
                    type: "USER_MOVED",
                    payload: data.payload,
                });

                clients.forEach(client => {
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
        console.log("Client disconnected");
        clients.delete(ws);
    });
});

// We don't need a Hono app for just the WS part in this pattern,
// we just handle the upgrade in index.ts
export const handleUpgrade = (req: any, socket: any, head: any) => {
    wss.handleUpgrade(req, socket, head, (ws) => {
        wss.emit('connection', ws, req);
    });
};
