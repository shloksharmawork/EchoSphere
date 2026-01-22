"use client";

import React, { useState, useEffect } from 'react';
import { User, Check, X, Play, Loader2, MessageSquare, History } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import Image from 'next/image';

interface ConnectionRequest {
    id: number;
    status: string;
    audioIntroUrl: string | null;
    createdAt: string;
    sender: {
        id: string;
        username: string;
        avatarUrl: string | null;
        reputationScore: number;
    };
}

interface ConnectionsInboxProps {
    onClose: () => void;
}

export function ConnectionsInbox({ onClose }: ConnectionsInboxProps) {
    const { user } = useAuth();
    const [requests, setRequests] = useState<ConnectionRequest[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [processingId, setProcessingId] = useState<number | null>(null);

    const fetchRequests = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/connections/requests`, {
                credentials: 'include'
            });
            if (res.ok) {
                const data = await res.json();
                setRequests(data.requests);
            }
        } catch (e) {
            console.error("Failed to fetch requests", e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (requestId: number, action: 'accept' | 'ignore' | 'block') => {
        setProcessingId(requestId);
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/connections/requests/${requestId}/${action}`, {
                method: 'POST',
                credentials: 'include'
            });
            if (res.ok) {
                setRequests(prev => prev.filter(r => r.id !== requestId));
            }
        } catch (e) {
            console.error(`Failed to ${action} request`, e);
        } finally {
            setProcessingId(null);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in">
            <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-[2rem] overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">

                {/* Header */}
                <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 sticky top-0 z-10">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-500/10 rounded-2xl text-indigo-400">
                            <MessageSquare size={22} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight">Connections</h2>
                            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Incoming Requests</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full text-zinc-400 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
                            <Loader2 className="animate-spin mb-4" size={32} />
                            <p className="text-sm font-medium">Scanning waves...</p>
                        </div>
                    ) : requests.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="w-20 h-20 bg-zinc-950 rounded-full flex items-center justify-center mb-4 border border-zinc-800">
                                <History size={32} className="text-zinc-700" />
                            </div>
                            <h3 className="text-white font-bold">No Pending Echos</h3>
                            <p className="text-zinc-500 text-sm max-w-[200px] mt-2">
                                New connection requests will appear here when people echo back.
                            </p>
                        </div>
                    ) : (
                        requests.map(req => (
                            <div key={req.id} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col gap-4 animate-in slide-in-from-bottom-2">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900">
                                        <Image
                                            src={req.sender.avatarUrl || '/avatar.jpg'}
                                            alt={req.sender.username}
                                            width={48}
                                            height={48}
                                            className="object-cover"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-white font-bold">{req.sender.username}</h4>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">
                                                ★ {req.sender.reputationScore}
                                            </span>
                                            <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Sent {new Date(req.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                    {req.audioIntroUrl && (
                                        <button
                                            onClick={() => new Audio(req.audioIntroUrl!).play()}
                                            className="p-3 bg-indigo-500/10 text-indigo-400 rounded-xl hover:bg-indigo-500 hover:text-white transition-all"
                                        >
                                            <Play size={18} fill="currentColor" />
                                        </button>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleAction(req.id, 'accept')}
                                        disabled={processingId === req.id}
                                        className="flex-1 bg-emerald-500 text-zinc-950 font-black py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all disabled:opacity-50"
                                    >
                                        <Check size={18} strokeWidth={3} />
                                        Accept
                                    </button>
                                    <button
                                        onClick={() => handleAction(req.id, 'ignore')}
                                        disabled={processingId === req.id}
                                        className="px-6 bg-zinc-800 text-zinc-400 font-bold py-3 rounded-xl hover:bg-zinc-700 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        Ignore
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer Info */}
                <div className="p-6 bg-zinc-950/50 border-t border-zinc-800 text-center">
                    <p className="text-[10px] font-bold text-zinc-600 uppercase tracking-widest">
                        Connecting builds your Reputation Score
                    </p>
                </div>
            </div>
        </div>
    );
}
