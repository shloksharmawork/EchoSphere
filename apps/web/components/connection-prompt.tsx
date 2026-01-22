"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, UserPlus, ShieldAlert } from 'lucide-react';

interface ConnectionPromptProps {
    onClose: () => void;
}

export function ConnectionPrompt({ onClose }: ConnectionPromptProps) {
    const [status, setStatus] = useState<'IDLE' | 'RECORDING' | 'SENT'>('IDLE');

    const sendRequest = async () => {
        // Mock sending request
        setStatus('SENT');
        setTimeout(onClose, 2000);
    };

    return (
        <div className="bg-zinc-900 border border-zinc-700 p-4 rounded-lg shadow-xl text-white min-w-[250px] space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-emerald-400" />
                Connect?
            </h3>
            <p className="text-xs text-zinc-400">
                Send a brief voice intro to request a connection.
            </p>

            {status === 'IDLE' && (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" className="w-full gap-2" onClick={() => setStatus('RECORDING')}>
                        <Mic className="w-3 h-3" /> Record Intro
                    </Button>
                </div>
            )}

            {status === 'RECORDING' && (
                <Button size="sm" className="w-full bg-red-500 hover:bg-red-600 animate-pulse" onClick={sendRequest}>
                    Stop & Send
                </Button>
            )}

            {status === 'SENT' && (
                <div className="text-center text-emerald-400 text-xs font-bold">
                    Request Sent!
                </div>
            )}

            <div className="border-t border-zinc-800 pt-2 mt-2">
                <Button size="sm" variant="ghost" className="w-full text-red-400 hover:text-red-300 gap-2 h-6 text-xs">
                    <ShieldAlert className="w-3 h-3" /> Report User
                </Button>
            </div>
        </div>
    );
}
