"use client";

import React, { useState } from 'react';
import { User, Shield, Star, LogOut, X, Camera, Save, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/use-auth';
import Image from 'next/image';

interface ProfileModalProps {
    onClose: () => void;
}

export function ProfileModal({ onClose }: ProfileModalProps) {
    const { user, updateProfile, logout } = useAuth();
    const [username, setUsername] = useState(user?.username || '');
    const [isAnonymous, setIsAnonymous] = useState(user?.isAnonymous || false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        try {
            await updateProfile({ username, isAnonymous });
            onClose();
        } catch (e: any) {
            setError(e.message);
        } finally {
            setIsSaving(false);
        }
    };

    if (!user) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">

                {/* Header/Banner Area */}
                <div className="h-24 bg-gradient-to-r from-emerald-500/20 to-indigo-500/20 relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 rounded-full bg-black/20 hover:bg-black/40 text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Profile Info */}
                <div className="px-6 pb-8 -mt-12 flex flex-col items-center">
                    <div className="relative group">
                        <div className="w-24 h-24 rounded-full border-4 border-zinc-900 bg-zinc-800 overflow-hidden shadow-xl">
                            <Image
                                src={user.avatarUrl || '/avatar.jpg'}
                                alt="Profile"
                                width={96}
                                height={96}
                                className="object-cover w-full h-full"
                            />
                        </div>
                        <button className="absolute bottom-0 right-0 p-2 rounded-full bg-emerald-500 text-zinc-950 border-2 border-zinc-900 hover:scale-110 transition-transform">
                            <Camera size={14} />
                        </button>
                    </div>

                    <h2 className="mt-4 text-xl font-black text-white tracking-tight">{user.username}</h2>
                    <div className="flex items-center gap-1.5 mt-1">
                        <Shield size={14} className="text-emerald-400" />
                        <span className="text-xs font-bold text-emerald-400/80 uppercase tracking-widest">Verified Member</span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 w-full mt-8">
                        <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 flex flex-col items-center">
                            <Star className="text-amber-400 mb-1" size={18} />
                            <span className="text-2xl font-black text-white">{user.reputationScore ?? 100}</span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Reputation</span>
                        </div>
                        <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50 flex flex-col items-center">
                            <User className="text-indigo-400 mb-1" size={18} />
                            <span className="text-2xl font-black text-white">42</span>
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Voice Drops</span>
                        </div>
                    </div>

                    {/* Edit Form */}
                    <div className="w-full mt-8 space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Username</label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                                placeholder="Change your identity..."
                            />
                        </div>

                        {/* Anonymity Toggle */}
                        <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-xl border border-zinc-800">
                            <div className="flex flex-col">
                                <span className="text-xs font-bold text-white uppercase tracking-wider">Anonymous Mode</span>
                                <span className="text-[10px] text-zinc-500 font-medium">Hide your profile from public discovery</span>
                            </div>
                            <button
                                onClick={() => setIsAnonymous(!isAnonymous)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors ${isAnonymous ? 'bg-emerald-500' : 'bg-zinc-800'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-zinc-950 transition-transform ${isAnonymous ? 'translate-x-6' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {error && <p className="text-red-400 text-xs text-center">{error}</p>}

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={handleSave}
                                disabled={isSaving || (username === user.username && isAnonymous === user.isAnonymous)}
                                className="flex-1 bg-white text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-zinc-200 transition-colors disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                                Save Changes
                            </button>
                            <button
                                onClick={() => {
                                    logout();
                                    onClose();
                                }}
                                className="p-3 bg-zinc-800 text-zinc-400 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                title="Log Out"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
