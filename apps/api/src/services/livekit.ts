import { AccessToken } from 'livekit-server-sdk';

const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';

export const createToken = async (roomName: string, participantName: string, identity: string) => {
    const at = new AccessToken(apiKey, apiSecret, {
        identity: identity,
        name: participantName,
    });

    at.addGrant({ roomJoin: true, room: roomName, canPublish: true, canSubscribe: true });

    return await at.toJwt();
};
