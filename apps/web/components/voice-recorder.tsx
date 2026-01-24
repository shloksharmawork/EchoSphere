"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Send, Loader2, RefreshCw } from 'lucide-react';
import { getUploadUrl, uploadFile, createPin } from '../lib/api';
import { applyVoiceMasking } from '../lib/voice-processing';

interface VoiceRecorderProps {
    latitude: number;
    longitude: number;
    onClose: () => void;
    onSuccess: () => void;
}

export function VoiceRecorder({ latitude, longitude, onClose, onSuccess }: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [isAnonymous, setIsAnonymous] = useState(false);
    const [voiceMaskingEnabled, setVoiceMaskingEnabled] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const [isProcessing, setIsProcessing] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    // Effect to handle voice masking preview when the toggle is flipped
    useEffect(() => {
        if (!audioBlob) return;

        const updatePreview = async () => {
            if (voiceMaskingEnabled) {
                setIsProcessing(true);
                try {
                    const masked = await applyVoiceMasking(audioBlob);
                    const url = URL.createObjectURL(masked);
                    setPreviewUrl(url);
                } catch (e) {
                    console.error("Masking failed", e);
                } finally {
                    setIsProcessing(false);
                }
            } else {
                setPreviewUrl(URL.createObjectURL(audioBlob));
            }
        };

        updatePreview();
    }, [voiceMaskingEnabled, audioBlob]);

    const [mimeType, setMimeType] = useState<string>("");

    useEffect(() => {
        const types = [
            "audio/webm;codecs=opus",
            "audio/webm",
            "audio/mp4",
            "audio/ogg;codecs=opus"
        ];
        const supported = types.find(type => MediaRecorder.isTypeSupported(type));
        if (supported) {
            setMimeType(supported);
        } else {
            console.warn("No supported audio mime-type found, falling back to default");
        }
    }, []);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const options = mimeType ? { mimeType } : undefined;
            const mediaRecorder = new MediaRecorder(stream, options);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = () => {
                const type = mimeType || 'audio/webm';
                const blob = new Blob(chunksRef.current, { type });
                setAudioBlob(blob);
                setPreviewUrl(URL.createObjectURL(blob));
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingTime(0);

            timerRef.current = setInterval(() => {
                setRecordingTime(prev => {
                    if (prev >= 60) { // Max 60 seconds
                        stopRecording();
                        return prev;
                    }
                    return prev + 1;
                });
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            alert("Could not access microphone. Please allow permissions.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const handleDrop = async () => {
        if (!audioBlob) return;
        setIsUploading(true);

        try {
            let blobToUpload = audioBlob;

            // Apply masking if enabled before upload
            if (voiceMaskingEnabled) {
                console.log("[VoiceRecorder] Applying voice masking...");
                setIsProcessing(true);
                blobToUpload = await applyVoiceMasking(audioBlob);
                setIsProcessing(false);
            }

            // 1. Get Upload URL
            console.log("[VoiceRecorder] Requesting upload URL...");
            const { uploadUrl, url, isMock } = await getUploadUrl(
                blobToUpload.type,
                blobToUpload.size
            );
            console.log(`[VoiceRecorder] Got upload URL. Mock: ${isMock}, URL for Pin: ${url}`);

            // 2. Upload to Storage (Skip if Mock)
            if (!isMock) {
                console.log("[VoiceRecorder] Uploading file to storage...");
                await uploadFile(uploadUrl, blobToUpload);
                console.log("[VoiceRecorder] File uploaded successfully.");
            } else {
                console.log("[VoiceRecorder] Skipping S3 upload (Mock Storage)");
            }

            // 3. Create Pin
            console.log("[VoiceRecorder] Creating pin in database...");
            const pinResult = await createPin({
                audioUrl: url,
                latitude,
                longitude,
                duration: recordingTime,
                isAnonymous,
                voiceMaskingEnabled,
                title: isAnonymous ? "Anonymous Drop" : "Voice Drop"
            });
            console.log("[VoiceRecorder] Pin created successfully:", pinResult);

            onSuccess();
        } catch (error: any) {
            console.error("[VoiceRecorder] ERROR:", error);
            // If the error has a response property (like from fetch), try to log it
            if (error.response) {
                try {
                    const errorData = await error.response.json();
                    console.error("[VoiceRecorder] API Error Response:", errorData);
                    alert(`Failed to drop voice: ${errorData.message || errorData.error || error.message}`);
                } catch (e) {
                    alert(`Failed to drop voice: ${error.message}`);
                }
            } else {
                alert(`Failed to drop voice: ${error.message || 'Check console for details'}`);
            }
        } finally {
            setIsUploading(false);
            setIsProcessing(false);
        }
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 w-[90%] max-w-md bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-xl z-50 animate-in fade-in slide-in-from-bottom-10">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-white">Record Voice Drop</h3>
                <button onClick={onClose} className="text-zinc-500 hover:text-white">&times;</button>
            </div>

            <div className="flex flex-col items-center justify-center space-y-6">

                {/* Visualizer / Timer */}
                <div className="relative w-full h-24 bg-zinc-950 rounded-lg flex items-center justify-center overflow-hidden border border-zinc-800">
                    <div className="text-4xl font-mono text-emerald-500 font-bold z-10">
                        {formatTime(recordingTime)}
                    </div>
                    {isRecording && (
                        <div className="absolute inset-0 bg-emerald-500/10 animate-pulse" />
                    )}
                </div>

                {/* Controls */}
                {!audioBlob ? (
                    <button
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${isRecording
                            ? 'bg-red-500 hover:bg-red-600 shadow-[0_0_20px_rgba(239,68,68,0.5)]'
                            : 'bg-emerald-500 hover:bg-emerald-600 shadow-[0_0_20px_rgba(16,185,129,0.5)]'
                            }`}
                    >
                        {isRecording ? <Square fill="white" className="text-white" /> : <Mic className="text-white w-8 h-8" />}
                    </button>
                ) : (
                    <div className="flex gap-4">
                        <button
                            onClick={() => {
                                setAudioBlob(null);
                                setPreviewUrl(null);
                            }}
                            className="p-4 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white"
                        >
                            <RefreshCw size={20} />
                        </button>
                        <button
                            onClick={() => {
                                const audio = new Audio(previewUrl!);
                                audio.play();
                            }}
                            disabled={isProcessing}
                            className="p-4 rounded-full bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-50"
                        >
                            {isProcessing ? <Loader2 size={20} className="animate-spin" /> : <Play fill="white" size={20} />}
                        </button>
                    </div>
                )}

                {/* Settings */}
                {audioBlob && (
                    <div className="w-full space-y-3">
                        <label className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800 cursor-pointer">
                            <span className="text-zinc-300 text-sm">Anonymous Drop</span>
                            <input
                                type="checkbox"
                                checked={isAnonymous}
                                onChange={(e) => setIsAnonymous(e.target.checked)}
                                className="accent-emerald-500 w-4 h-4"
                            />
                        </label>
                        <label className="flex items-center justify-between p-3 bg-zinc-950 rounded-lg border border-zinc-800 cursor-pointer">
                            <span className="text-zinc-300 text-sm">Voice Masking (Pitch Shift)</span>
                            <input
                                type="checkbox"
                                checked={voiceMaskingEnabled}
                                onChange={(e) => setVoiceMaskingEnabled(e.target.checked)}
                                className="accent-emerald-500 w-4 h-4"
                            />
                        </label>
                    </div>
                )}

                {/* Submit Action */}
                {audioBlob && (
                    <button
                        onClick={handleDrop}
                        disabled={isUploading || isProcessing}
                        className="w-full py-4 bg-emerald-500 hovered:bg-emerald-600 text-black font-bold rounded-xl flex items-center justify-center gap-2 transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                    >
                        {isUploading || isProcessing ? (
                            <>
                                <Loader2 className="animate-spin" /> {isProcessing ? 'Processing...' : 'Uploading...'}
                            </>
                        ) : (
                            <>
                                <Send size={20} /> Drop Pin Here
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
}
