import { useEffect, useRef, useState } from 'react';

const WEBSOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/^http/, 'ws') + '/ws' || 'ws://localhost:3001/ws';

interface LocationUpdate {
    userId: string;
    lat: number;
    lng: number;
}

export function useRealTimeLocation() {
    const ws = useRef<WebSocket | null>(null);
    const [nearbyUsers, setNearbyUsers] = useState<Record<string, LocationUpdate>>({});

    useEffect(() => {
        // Initialize WebSocket
        ws.current = new WebSocket(WEBSOCKET_URL);

        ws.current.onopen = () => {
            console.log('Connected to real-time server');
        };

        ws.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'USER_MOVED') {
                    setNearbyUsers(prev => ({
                        ...prev,
                        [data.payload.userId]: data.payload
                    }));
                }
            } catch (e) {
                console.error('Failed to parse WS message', e);
            }
        };

        return () => {
            ws.current?.close();
        };
    }, []);

    const broadcastLocation = (lat: number, lng: number) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({
                type: 'LOCATION_UPDATE',
                payload: {
                    userId: 'me', // TODO: Replace with actual session ID
                    lat,
                    lng
                }
            }));
        }
    };

    return { nearbyUsers, broadcastLocation };
}
