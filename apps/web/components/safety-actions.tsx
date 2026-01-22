"use client";

import React, { useState } from 'react';
import { ShieldAlert, UserX, Flag, CheckCircle2 } from 'lucide-react';

interface SafetyActionsProps {
    targetType: 'PIN' | 'USER';
    targetId: string;
    onActionComplete?: () => void;
}

export function SafetyActions({ targetType, targetId, onActionComplete }: SafetyActionsProps) {
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const handleReport = async (reason: string) => {
        setStatus('loading');
        try {
            const res = await fetch(`${API_URL}/safety/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ targetType, targetId, reason }),
            });
            if (res.ok) {
                setStatus('success');
                setTimeout(() => {
                    setStatus('idle');
                    onActionComplete?.();
                }, 2000);
            } else {
                setStatus('error');
            }
        } catch (e) {
            setStatus('error');
        }
    };

    if (status === 'success') {
        return (
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-medium py-2 animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 size={14} />
                <span>Report Submitted</span>
            </div>
        );
    }

    return (
        <div className="flex gap-2 mt-4 pt-3 border-t border-zinc-800/50">
            <button
                onClick={() => handleReport('INAPPROPRIATE_CONTENT')}
                disabled={status === 'loading'}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-800/50 hover:bg-red-500/10 hover:text-red-400 text-zinc-400 text-[10px] font-bold uppercase tracking-wider transition-all border border-zinc-700/50 disabled:opacity-50"
            >
                <Flag size={12} />
                Report
            </button>
        </div>
    );
}

export function BlockUserAction({ userId, onBlock }: { userId: string; onBlock?: () => void }) {
    const [loading, setLoading] = useState(false);
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

    const handleBlock = async () => {
        if (!confirm("Are you sure you want to block this user? You won't see their pins anymore.")) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/safety/block`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ blockedId: userId }),
            });
            if (res.ok) {
                onBlock?.();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <button
            onClick={handleBlock}
            disabled={loading}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-zinc-800/50 hover:bg-orange-500/10 hover:text-orange-400 text-zinc-400 text-[10px] font-bold uppercase tracking-wider transition-all border border-zinc-700/50 disabled:opacity-50"
        >
            <UserX size={12} />
            Block User
        </button>
    );
}
