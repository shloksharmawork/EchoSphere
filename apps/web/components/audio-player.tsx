"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2 } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
    autoplay?: boolean;
}

export function AudioPlayer({ src, autoplay = false }: AudioPlayerProps) {
    const [isPlaying, setIsPlaying] = useState(autoplay);
    const audioRef = useRef<HTMLAudioElement>(null);

    const togglePlay = () => {
        if (!audioRef.current) return;

        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    return (
        <div className="flex items-center gap-2 bg-zinc-800 p-2 rounded-lg border border-zinc-700 min-w-[200px]">
            <audio
                ref={audioRef}
                src={src}
                autoPlay={autoplay}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => {
                    setIsPlaying(false);
                    if (audioRef.current) audioRef.current.currentTime = 0;
                }}
                className="hidden"
            />

            <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 hover:bg-zinc-700 text-emerald-400"
                onClick={togglePlay}
            >
                {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </Button>

            <div className="h-1 flex-1 bg-zinc-700 rounded-full overflow-hidden">
                {/* Visualizer could go here, for now just an animated bar when playing */}
                <div className={`h-full bg-emerald-500 transition-all duration-300 ${isPlaying ? 'w-full animate-[pulse_2s_infinite]' : 'w-0'}`} />
            </div>

            <Volume2 className="h-4 w-4 text-zinc-500" />
        </div>
    );
}
