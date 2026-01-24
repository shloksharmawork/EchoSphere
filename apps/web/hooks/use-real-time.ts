import { useEffect, useState, useRef } from 'react';

import { API_URL } from '../lib/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || (API_URL.startsWith('https')
    ? API_URL.replace('https', 'wss').replace(/\/$/, '') + '/ws'
    : API_URL.replace('http', 'ws').replace(/\/$/, '') + '/ws');

export function useRealTime(user?: any, onNewPin?: (pin: any) => void, onNotification?: (payload: any) => void) {
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    useEffect(() => {
        if (!user) return;

        let isMounted = true;
        let reconnectTimeout: NodeJS.Timeout;

        const connect = () => {
            if (!isMounted) return;

            console.log('Attempting WebSocket connection to:', WS_URL);
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                if (!isMounted) {
                    ws.close();
                    return;
                }
                console.log('Connected to EchoSphere WebSocket');
                setIsConnected(true);

                ws.send(JSON.stringify({
                    type: 'IDENTIFY',
                    payload: { userId: user.id }
                }));
            };

            ws.onmessage = (event) => {
                if (!isMounted) return;
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'new_pin') {
                        onNewPin?.(data.pin);
                    }
                    if (data.type === 'NOTIFICATION') {
                        onNotification?.(data.payload);
                    }
                } catch (e) {
                    console.error('WS Message Error:', e);
                }
            };

            ws.onclose = () => {
                if (!isMounted) return;
                console.log('WebSocket Disconnected. Reconnecting in 3s...');
                setIsConnected(false);
                reconnectTimeout = setTimeout(connect, 3000);
            };

            ws.onerror = (err) => {
                // Only log error if we are still intending to be connected
                if (isMounted) {
                    console.error('WebSocket Connection Error');
                }
                ws.close();
            };
        };

        connect();

        return () => {
            isMounted = false;
            clearTimeout(reconnectTimeout);
            if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
                wsRef.current.close();
            }
        };
    }, [user?.id]);

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
