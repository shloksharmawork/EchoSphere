export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function getUploadUrl(contentType: string, fileSize: number) {
    const res = await fetch(`${API_URL}/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ contentType, fileSize })
    });
    if (!res.ok) throw new Error('Failed to get upload URL');
    return res.json();
}

export async function uploadFile(url: string, file: Blob) {
    const res = await fetch(url, {
        method: 'PUT',
        body: file,
        headers: {
            'Content-Type': file.type
        }
    });
    if (!res.ok) throw new Error('Failed to upload file');
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
