import React from "react";
import { BadgeCheck, ShieldCheck } from "lucide-react";

interface VibeRippleProps {
    variant?: "standard" | "gold" | "silver";
    isVerified?: boolean;
    voiceMasking?: boolean;
}

export function VibeRipple({
    variant = "standard",
    isVerified = false,
    voiceMasking = false,
}: VibeRippleProps) {
    // Color Definitions
    const colors = {
        standard: "bg-cyan-500 shadow-[0_0_30px_rgba(6,182,212,0.6)]",
        gold: "bg-amber-400 shadow-[0_0_40px_rgba(251,191,36,0.8)] border-amber-200",
        silver: "bg-zinc-100 shadow-[0_0_30px_rgba(255,255,255,0.7)] border-zinc-300",
    };

    const rippleColors = {
        standard: "border-cyan-400/30",
        gold: "border-amber-400/40",
        silver: "border-white/40",
    };

    const baseClasses = `w-10 h-10 rounded-full flex items-center justify-center relative transition-transform hover:scale-110 duration-300 ${colors[variant]}`;

    return (
        <div className="relative flex items-center justify-center">
            {/* Outer Ripple Animation (Keep it subtle but visible) */}
            <div
                className={`absolute -inset-8 rounded-full border-2 ${rippleColors[variant]} opacity-0 animate-ping delay-75`}
            />
            <div
                className={`absolute -inset-16 rounded-full border ${rippleColors[variant]} opacity-0 animate-ping duration-[3000ms]`}
            />

            {/* Main Pin Body */}
            <div className={baseClasses}>
                {/* Core Dot / Icon */}
                <div className="w-3 h-3 bg-white rounded-full animate-pulse" />

                {/* Verification Badge (Absolute positioned) */}
                {isVerified && (
                    <div className="absolute -top-3 -right-3 bg-blue-500 text-white rounded-full p-0.5 border-2 border-zinc-900 shadow-sm z-10">
                        <BadgeCheck size={14} fill="currentColor" className="text-white" />
                    </div>
                )}
            </div>

            {/* Label for Voice Masking (Optional Indicator) */}
            {voiceMasking && (
                <div className="absolute -bottom-6 bg-zinc-900/80 text-[10px] text-white px-2 py-0.5 rounded-full border border-zinc-700 backdrop-blur-sm whitespace-nowrap">
                    👻 Masked
                </div>
            )}
        </div>
    );
}
