import React from 'react';
import { Play, MapPin, BadgeCheck } from 'lucide-react';

interface PinData {
    id: number;
    title?: string;
    locationName?: string;
    duration?: string;
    vibe?: string;
    isVerified?: boolean;
    tier?: 'standard' | 'gold' | 'silver';
}

interface EavesdropScrollProps {
    pins: PinData[];
    onSelectPin: (pinId: number) => void;
}

export function EavesdropScroll({ pins, onSelectPin }: EavesdropScrollProps) {
    if (!pins || pins.length === 0) return null;

    return (
        <div className="absolute bottom-24 left-0 right-0 z-30 px-4">
            <h3 className="text-white/80 text-xs font-bold uppercase tracking-widest mb-2 px-2 drop-shadow-md">
                Live Eavesdrop
            </h3>
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
                {pins.map((pin) => (
                    <div
                        key={pin.id}
                        onClick={() => onSelectPin(pin.id)}
                        className={`min-w-[200px] h-[120px] rounded-2xl p-4 flex flex-col justify-between cursor-pointer transition-all hover:scale-105 active:scale-95 snap-center backdrop-blur-md border ${pin.tier === 'gold'
                                ? 'bg-amber-900/60 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.3)]'
                                : pin.tier === 'silver'
                                    ? 'bg-zinc-800/60 border-zinc-400/50 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                    : 'bg-zinc-900/60 border-zinc-700/50 hover:bg-zinc-800/80'
                            }`}
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${pin.tier === 'gold' ? 'bg-amber-400' : 'bg-cyan-400'} animate-pulse`} />
                                <span className="text-zinc-300 text-xs font-medium truncate max-w-[100px]">
                                    {pin.locationName || "Unknown Location"}
                                </span>
                            </div>
                            {pin.isVerified && <BadgeCheck size={14} className="text-blue-400" />}
                        </div>

                        <div className="space-y-1">
                            <div className="text-white font-bold text-sm truncate">
                                {pin.vibe ? `${pin.vibe} Vibe` : "Voice Drop"}
                            </div>
                            {pin.tier === 'gold' && (
                                <span className="text-[10px] bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30">
                                    Promoted
                                </span>
                            )}
                        </div>

                        <div className="flex items-center justify-between mt-1">
                            <div className="flex items-center gap-1 text-zinc-400 text-xs">
                                <Play size={10} fill="currentColor" />
                                <span>{pin.duration || "0:15"}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
