export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
console.log("[API] Using URL:", API_URL);

export async function getUploadUrl(contentType: string, fileSize: number) {
    const res = await fetch(`${API_URL}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contentType, fileSize })
    });
    if (!res.ok) {
        const error = new Error(`Failed to get upload URL: ${res.status} ${res.statusText}`) as any;
        error.response = res;
        throw error;
    }
    return res.json();
}

export async function uploadFile(url: string, file: Blob) {
    const res = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {} // No Content-Type to match simplified signature
    });
    if (!res.ok) {
        const text = await res.text().catch(() => "No error body");
        console.error(`[uploadFile] Status: ${res.status}, Body: ${text}`);
        throw new Error(`Failed to upload file: ${res.status} ${res.statusText}`);
    }
}

export async function createPin(data: {
    title?: string;
    audioUrl: string;
    latitude: number;
    longitude: number;
    duration?: number;
    isAnonymous?: boolean;
    voiceMaskingEnabled?: boolean;
}) {
    const res = await fetch(`${API_URL}/pins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
    });
    if (!res.ok) {
        const error = new Error('Failed to create pin') as any;
        error.response = res;
        throw error;
    }
    return res.json();
}

export async function sendConnectionRequest(receiverId: string, audioIntroUrl?: string) {
    const res = await fetch(`${API_URL}/connections/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ receiverId, audioIntroUrl })
    });
    const data = await res.json();
    if (!res.ok) {
        throw new Error(data.error || "Failed to send request");
    }
    return data;
}
