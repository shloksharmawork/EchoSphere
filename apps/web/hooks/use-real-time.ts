import { useEffect, useState, useRef } from 'react';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001/ws';

export function useRealTime(user?: any, onNewPin?: (pin: any) => void, onNotification?: (payload: any) => void) {
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!user) return;

        const connect = () => {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('Connected to EchoSphere WebSocket');
                setIsConnected(true);

                // Identify user
                ws.send(JSON.stringify({
                    type: 'IDENTIFY',
                    payload: { userId: user.id }
                }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'new_pin') {
                        onNewPin?.(data.pin);
                    }
                    if (data.type === 'NOTIFICATION') {
                        onNotification?.(data.payload);
                    }
                    if (data.type === 'USER_MOVED') {
                        // Handle other users moving if we want to show them
                    }
                } catch (e) {
                    console.error('WS Message Error:', e);
                }
            };

            ws.onclose = () => {
                console.log('WebSocket Disconnected. Reconnecting...');
                setIsConnected(false);
                setTimeout(connect, 3000);
            };

            ws.onerror = (err) => {
                console.error('WebSocket Error:', err);
                ws.close();
            };
        };

        connect();

        return () => {
            wsRef.current?.close();
        };
    }, [user?.id]); // Reconnect if user changes

    const sendLocation = (lat: number, lng: number) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
                type: 'LOCATION_UPDATE',
                payload: { lat, lng }
            }));
        }
    };

    return { isConnected, sendLocation };
}
