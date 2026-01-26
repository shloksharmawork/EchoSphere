"use client";

import React, { useEffect, useState } from 'react';
import { Map, GeolocateControl, NavigationControl, Marker, Popup } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AudioPlayer } from './audio-player';
import { VoiceRecorder } from './voice-recorder';
import { ConnectionPrompt } from './connection-prompt';
import { SafetyActions, BlockUserAction } from './safety-actions';
import { ProfileModal } from './profile-modal';
import { ConnectionsInbox } from './connections-inbox';
import { useAuth } from '../hooks/use-auth';
import { useRealTime } from '../hooks/use-real-time';
import { sendConnectionRequest } from '../lib/api';
import { analyzeVoice, VibeResult } from '../lib/ai-service';
import { VibeRipple } from './ui/vibe-ripple';
import { EavesdropScroll } from './eavesdrop-scroll';
import { deletePin } from '../lib/api';
import { Mic, ArrowRight, User as UserIcon, MessageSquare, Bell, UserPlus, Play, ShieldCheck, Trash2 } from 'lucide-react';
import Image from 'next/image';

interface MapViewProps {
    initialViewState?: {
        longitude: number;
        latitude: number;
        zoom: number;
    };
}

interface Pin {
    id: number;
    location: { type: 'Point', coordinates: [number, number] };
    audioUrl: string;
    isAnonymous: boolean;
    voiceMaskingEnabled: boolean;
    creatorId: string;
    // New fields (mocked for now)
    tier?: 'standard' | 'gold' | 'silver';
    isVerified?: boolean;
    vibe?: string;
    intent?: string;
    locationName?: string;
}

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function MapView({ initialViewState }: MapViewProps) {
    const { user } = useAuth();
    const [viewState, setViewState] = useState(initialViewState || {
        longitude: -122.4,
        latitude: 37.8,
        zoom: 14
    });
    const [pins, setPins] = useState<Pin[]>([]);
    const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
    const [selectedPinVibe, setSelectedPinVibe] = useState<VibeResult | null>(null);
    const [showRecorder, setShowRecorder] = useState(false);
    const [showProfile, setShowProfile] = useState(false);
    const [showInbox, setShowInbox] = useState(false);
    const [showConnectionPrompt, setShowConnectionPrompt] = useState(false);
    const [connectingUserId, setConnectingUserId] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
    const [notifications, setNotifications] = useState<any[]>([]);

    // WebSocket Integration
    const { isConnected, sendLocation } = useRealTime(user, (newPin) => {
        setPins(prev => {
            if (prev.some(p => p.id === newPin.id)) return prev;
            return [newPin, ...prev];
        });
    }, (notification) => {
        console.log("New Notification:", notification);
        setNotifications(prev => [...prev, notification]);
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("EchoSphere", { body: `New connection request from ${notification.sender.username}` });
        }
    });

    // Request Notification Permissions
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Fetch pins when map moves
    const fetchPins = async () => {
        try {
            const res = await fetch(`${API_URL}/pins?lat=${viewState.latitude}&lng=${viewState.longitude}&radius=5000`);
            if (res.ok) {
                const data = await res.json();
                // Augment with mock data for visuals
                const augmentedPins = data.pins.map((p: any) => ({
                    ...p,
                    tier: Math.random() > 0.9 ? 'gold' : Math.random() > 0.8 ? 'silver' : 'standard',
                    isVerified: Math.random() > 0.8,
                    vibe: ["Chill", "Hype", "Mysterious"][Math.floor(Math.random() * 3)],
                    locationName: "Unknown Location" // Placeholder
                }));
                setPins(augmentedPins);
            }
        } catch (e) {
            console.error("Failed to fetch pins", e);
        }
    };

    useEffect(() => {
        fetchPins();
        // We still keep a slow poll as a fallback, but real-time covers instant updates
        const interval = setInterval(fetchPins, 30000);
        return () => clearInterval(interval);
    }, [viewState.latitude, viewState.longitude]);


    // Track User Location for Custom Marker
    useEffect(() => {
        if ("geolocation" in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    const newLocation = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    };
                    setUserLocation(newLocation);

                    // Broadcast location via WebSocket
                    if (isConnected) {
                        sendLocation(newLocation.lat, newLocation.lng);
                    }
                },
                (err) => console.error(err),
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, [isConnected]);

    if (!TOKEN) {
        return <div className="text-white p-10">Mapbox Token Missing</div>;
    }

    return (
        <div className="w-full h-screen relative bg-zinc-950">
            <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/dark-v11" // Sleeker dark mode matching the design
                mapboxAccessToken={TOKEN}
                attributionControl={false}
            >
                {/* Standard Controls */}
                <GeolocateControl
                    position="bottom-right"
                    trackUserLocation={true}
                    showUserLocation={true}
                    positionOptions={{ enableHighAccuracy: true }}
                />
                <NavigationControl position="bottom-right" />

                {/* Custom User Marker */}
                {userLocation && (
                    <Marker
                        longitude={userLocation.lng}
                        latitude={userLocation.lat}
                        anchor="center"
                    >
                        <div className="relative group cursor-pointer" onClick={() => setShowProfile(true)}>
                            <div className="absolute -inset-4 bg-emerald-500/30 rounded-full blur-xl animate-pulse" />
                            <div className="relative w-12 h-12 rounded-full border-2 border-emerald-400 overflow-hidden shadow-[0_0_15px_rgba(52,211,153,0.6)] bg-zinc-800">
                                {user?.avatarUrl ? (
                                    <Image
                                        src={user.avatarUrl}
                                        alt="User"
                                        width={48}
                                        height={48}
                                        className="object-cover w-full h-full"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-emerald-400">
                                        <UserIcon size={24} />
                                    </div>
                                )}
                            </div>
                        </div>
                    </Marker>
                )}

                {/* Voice Pins (Vibe Ripples) */}
                {pins.map(pin => (
                    <Marker
                        key={pin.id}
                        longitude={pin.location.coordinates[0]}
                        latitude={pin.location.coordinates[1]}
                        anchor="center"
                        onClick={(e) => {
                            e.originalEvent.stopPropagation();
                            setSelectedPin(pin);
                            // Trigger AI Analysis on click
                            analyzeVoice(pin.audioUrl).then(setSelectedPinVibe);
                        }}
                    >
                        <div className="cursor-pointer">
                            <VibeRipple
                                variant={pin.tier || 'standard'}
                                isVerified={pin.isVerified}
                                voiceMasking={pin.voiceMaskingEnabled}
                            />
                        </div>
                    </Marker>
                ))}

                {/* Aura Bubble Popup */}
                {selectedPin && (
                    <Popup
                        longitude={selectedPin.location.coordinates[0]}
                        latitude={selectedPin.location.coordinates[1]}
                        anchor="center"
                        onClose={() => {
                            setSelectedPin(null);
                            setSelectedPinVibe(null);
                        }}
                        closeButton={false}
                        className="z-50 aura-popup"
                        maxWidth="300px"
                    >
                        <div className="relative group">
                            {/* Animated Glow / Aura */}
                            <div className="absolute -inset-4 bg-gradient-to-tr from-cyan-500/40 to-purple-600/40 rounded-full blur-2xl animate-pulse" />

                            <div className="relative bg-zinc-950/90 border border-white/10 rounded-[32px] p-6 shadow-2xl backdrop-blur-xl flex flex-col items-center gap-4 text-center min-w-[260px] max-w-[280px]">
                                {/* Header / User Info */}
                                <div className="flex items-center gap-2 mb-1">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${selectedPin.isAnonymous ? 'border-zinc-500 bg-zinc-800' : 'border-indigo-500 bg-indigo-900/50'}`}>
                                        <UserIcon size={14} className="text-white/80" />
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <div className="flex items-center gap-1">
                                            <span className="text-sm font-bold text-white tracking-wide">
                                                {selectedPin.isAnonymous ? 'Anonymous' : 'User'}
                                            </span>
                                            {selectedPin.isVerified && <ShieldCheck size={12} className="text-blue-400" />}
                                        </div>
                                        <span className="text-[10px] text-zinc-400 font-mono">
                                            {selectedPinVibe ? selectedPinVibe.vibe : 'Analysing Vibe...'}
                                        </span>
                                    </div>
                                </div>

                                {/* Visualizer / Waveform Graphic */}
                                <div className="w-full h-12 flex items-center justify-center gap-1">
                                    {[...Array(8)].map((_, i) => (
                                        <div key={i} className="w-1.5 bg-gradient-to-t from-cyan-400 to-purple-500 rounded-full animate-wave" style={{
                                            height: `${Math.random() * 80 + 20}%`,
                                            animationDelay: `${i * 0.1}s`
                                        }} />
                                    ))}
                                </div>

                                {/* Custom Audio Player UI */}
                                <div className="w-full">
                                    <AudioPlayer src={selectedPin.audioUrl} autoplay />
                                </div>

                                {/* Actions */}
                                <div className="flex w-full gap-2 mt-2">
                                    <button
                                        onClick={() => {
                                            if (selectedPin.creatorId) {
                                                setConnectingUserId(selectedPin.creatorId);
                                                setShowConnectionPrompt(true);
                                            }
                                        }}
                                        className="flex-1 py-2 rounded-full bg-white text-black font-bold text-xs hover:bg-zinc-200 transition-colors flex items-center justify-center gap-1"
                                    >
                                        <UserPlus size={14} /> Connect
                                    </button>
                                    <button className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
                                        <MessageSquare size={16} />
                                    </button>
                                    {user && selectedPin.creatorId === user.id && (
                                        <button
                                            onClick={async () => {
                                                if (confirm("Delete this voice drop?")) {
                                                    try {
                                                        await deletePin(selectedPin.id);
                                                        setPins(prev => prev.filter(p => p.id !== selectedPin.id));
                                                        setSelectedPin(null);
                                                    } catch (e) {
                                                        alert("Failed to delete pin");
                                                    }
                                                }
                                            }}
                                            className="p-2 rounded-full bg-red-900/30 text-red-500 hover:bg-red-900/50 transition-colors"
                                            title="Delete Drop"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    )}
                                </div>

                                {selectedPinVibe?.intent && (
                                    <div className="absolute -top-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">
                                        ✨ {selectedPinVibe.intent}
                                    </div>
                                )}
                            </div>
                        </div>
                    </Popup>
                )}
            </Map>

            {/* Header Overlay */}
            <div className="absolute top-6 left-6 right-6 z-10 flex justify-between items-start pointer-events-none">
                <h1 className="text-3xl font-black text-white tracking-tighter drop-shadow-2xl flex items-center gap-2 select-none">
                    EchoSphere Live <span className="text-emerald-400 text-sm font-bold uppercase track-widest px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 backdrop-blur-md">Live</span>
                </h1>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            setShowInbox(true);
                            setNotifications([]);
                        }}
                        className="pointer-events-auto p-3 rounded-full bg-zinc-900/80 border border-zinc-800 text-white backdrop-blur-md hover:bg-zinc-800 transition-colors shadow-xl relative"
                    >
                        <Bell size={24} />
                        {notifications.length > 0 && (
                            <span className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full border-2 border-zinc-900" />
                        )}
                    </button>
                    <button
                        onClick={() => setShowProfile(true)}
                        className="pointer-events-auto p-3 rounded-full bg-zinc-900/80 border border-zinc-800 text-white backdrop-blur-md hover:bg-zinc-800 transition-colors shadow-xl"
                        title="Account"
                    >
                        <UserIcon size={24} />
                    </button>
                </div>
            </div>

            {/* FAB: Drop Voice */}
            <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-20">
                <button
                    onClick={() => setShowRecorder(true)}
                    className="group relative flex items-center justify-center w-16 h-16 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 rounded-full shadow-[0_0_40px_-5px_rgba(16,185,129,0.5)] transition-all hover:scale-105 active:scale-95"
                >
                    <Mic size={28} absoluteStrokeWidth strokeWidth={2.5} />
                    <span className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-zinc-900 text-white text-xs px-3 py-1.5 rounded-lg whitespace-nowrap border border-zinc-800 pointer-events-none">
                        Drop Voice Pin
                    </span>
                </button>
            </div>

            {/* Voice Recorder Overlay */}
            {showRecorder && userLocation && (
                <VoiceRecorder
                    latitude={userLocation.lat}
                    longitude={userLocation.lng}
                    onClose={() => setShowRecorder(false)}
                    onSuccess={() => {
                        setShowRecorder(false);
                        fetchPins();
                    }}
                />
            )}

            {/* Profile Modal Overlay */}
            {showProfile && (
                <ProfileModal onClose={() => setShowProfile(false)} />
            )}

            {showInbox && (
                <ConnectionsInbox onClose={() => setShowInbox(false)} />
            )}

            {showConnectionPrompt && connectingUserId && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <ConnectionPrompt
                        receiverId={connectingUserId}
                        onClose={() => {
                            setShowConnectionPrompt(false);
                            setConnectingUserId(null);
                        }}
                    />
                </div>
            )}

            {/* Eavesdrop Scroll */}
            <EavesdropScroll
                pins={pins}
                onSelectPin={(id) => {
                    const pin = pins.find(p => p.id === id);
                    if (pin) {
                        setSelectedPin(pin);
                        setViewState(prev => ({ ...prev, latitude: pin.location.coordinates[1], longitude: pin.location.coordinates[0], zoom: 16 }));
                        analyzeVoice(pin.audioUrl).then(setSelectedPinVibe);
                    }
                }}
            />
        </div>
    );
}
