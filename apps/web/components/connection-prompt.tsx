"use client";

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Square, UserPlus, ShieldAlert, Loader2, Play } from 'lucide-react';
import { getUploadUrl, uploadFile, sendConnectionRequest } from '@/lib/api';

interface ConnectionPromptProps {
    receiverId: string;
    onClose: () => void;
}

export function ConnectionPrompt({ receiverId, onClose }: ConnectionPromptProps) {
    const [status, setStatus] = useState<'IDLE' | 'RECORDING' | 'PREVIEW' | 'SENDING' | 'SENT'>('IDLE');
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [previewUrl]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
                setAudioBlob(blob);
                setPreviewUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setStatus('RECORDING');
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 15) { // Max 15 second intro
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);
        } catch (err) {
            console.error(err);
            alert("Could not access microphone");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && status === 'RECORDING') {
            mediaRecorderRef.current.stop();
            setStatus('PREVIEW');
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const sendRequest = async () => {
        if (!audioBlob) return;
        setStatus('SENDING');

        try {
            // 1. Get Upload URL
            const { uploadUrl, url } = await getUploadUrl(audioBlob.type, audioBlob.size);

            // 2. Upload
            await uploadFile(uploadUrl, audioBlob);

            // 3. Send Request
            await sendConnectionRequest(receiverId, url);

            setStatus('SENT');
            setTimeout(onClose, 2000);
        } catch (error: any) {
            console.error(error);
            alert(`Error sending request: ${error.message}`);
            setStatus('PREVIEW');
        }
    };

    return (
        <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-xl shadow-2xl text-white min-w-[280px] space-y-4 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center border-b border-zinc-800 pb-2 mb-1">
                <h3 className="font-bold text-sm flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-400" />
                    Connect?
                </h3>
                <button onClick={onClose} className="text-zinc-500 hover:text-white">&times;</button>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
                Send a brief voice intro (max 15s) to request a connection.
            </p>

            {status === 'IDLE' && (
                <Button
                    size="sm"
                    className="w-full bg-emerald-500 hover:bg-emerald-600 text-black font-bold h-10"
                    onClick={startRecording}
                >
                    <Mic className="w-4 h-4 mr-2" /> Record Voice Intro
                </Button>
            )}

            {status === 'RECORDING' && (
                <div className="space-y-3 text-center">
                    <div className="text-2xl font-mono text-red-500 animate-pulse font-bold">
                        0:{recordingTime.toString().padStart(2, '0')}
                    </div>
                    <Button
                        size="sm"
                        variant="destructive"
                        className="w-full h-10 font-bold"
                        onClick={stopRecording}
                    >
                        <Square className="w-4 h-4 mr-2 fill-white" /> Stop Recording
                    </Button>
                </div>
            )}

            {status === 'PREVIEW' && (
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 border-zinc-700 hover:bg-zinc-800 h-10"
                            onClick={startRecording}
                        >
                            Retake
                        </Button>
                        <Button
                            size="sm"
                            className="flex-1 bg-indigo-600 hover:bg-indigo-500 h-10 font-bold"
                            onClick={sendRequest}
                        >
                            Send Intro
                        </Button>
                    </div>
                </div>
            )}

            {status === 'SENDING' && (
                <div className="flex flex-col items-center justify-center py-4 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-500" />
                    <span className="text-xs text-zinc-400">Uploading intro...</span>
                </div>
            )}

            {status === 'SENT' && (
                <div className="text-center py-4 text-emerald-400 text-sm font-bold flex flex-col items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                        <UserPlus size={18} />
                    </div>
                    Request Sent!
                </div>
            )}

            <div className="border-t border-zinc-800 pt-3">
                <Button size="sm" variant="ghost" className="w-full text-zinc-500 hover:text-red-400 gap-2 h-7 text-[10px] uppercase tracking-wider font-bold">
                    <ShieldAlert className="w-3 h-3" /> Report User
                </Button>
            </div>
        </div>
    );
}
