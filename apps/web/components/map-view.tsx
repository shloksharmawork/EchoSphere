"use client";

import React, { useEffect, useState } from 'react';
import { Map, GeolocateControl, NavigationControl, Marker, Popup, useControl } from 'react-map-gl/mapbox';
import 'mapbox-gl/dist/mapbox-gl.css';
import { AudioPlayer } from './audio-player';
import { VoiceRecorder } from './voice-recorder';
import { Mic, ArrowRight, User } from 'lucide-react';
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
}

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function MapView({ initialViewState }: MapViewProps) {
    const [viewState, setViewState] = useState(initialViewState || {
        longitude: -122.4,
        latitude: 37.8,
        zoom: 14
    });
    const [pins, setPins] = useState<Pin[]>([]);
    const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
    const [showRecorder, setShowRecorder] = useState(false);
    const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

    // Fetch pins when map moves
    const fetchPins = async () => {
        try {
            const res = await fetch(`${API_URL}/pins?lat=${viewState.latitude}&lng=${viewState.longitude}&radius=5000`);
            if (res.ok) {
                const data = await res.json();
                setPins(data.pins);
            }
        } catch (e) {
            console.error("Failed to fetch pins", e);
        }
    };

    useEffect(() => {
        fetchPins();
        const interval = setInterval(fetchPins, 10000);
        return () => clearInterval(interval);
    }, [viewState.latitude, viewState.longitude]);


    // Track User Location for Custom Marker
    useEffect(() => {
        if ("geolocation" in navigator) {
            const watchId = navigator.geolocation.watchPosition(
                (pos) => {
                    setUserLocation({
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                },
                (err) => console.error(err),
                { enableHighAccuracy: true }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    if (!TOKEN) {
        return <div className="text-white p-10">Mapbox Token Missing</div>;
    }

    return (
        <div className="w-full h-screen relative bg-zinc-950">
            <Map
                {...viewState}
                onMove={evt => setViewState(evt.viewState)}
                style={{ width: '100%', height: '100%' }}
                mapStyle="mapbox://styles/mapbox/navigation-night-v1" // Richer dark aesthetic
                mapboxAccessToken={TOKEN}
                attributionControl={false}
            >
                {/* Standard Controls */}
                <GeolocateControl position="bottom-right" />
                <NavigationControl position="bottom-right" />

                {/* Custom User Marker */}
                {userLocation && (
                    <Marker
                        longitude={userLocation.lng}
                        latitude={userLocation.lat}
                        anchor="center"
                    >
                        <div className="relative group cursor-pointer">
                            <div className="absolute -inset-4 bg-emerald-500/30 rounded-full blur-xl animate-pulse" />
                            <div className="relative w-12 h-12 rounded-full border-2 border-emerald-400 overflow-hidden shadow-[0_0_15px_rgba(52,211,153,0.6)]">
                                <Image
                                    src="/avatar.jpg"
                                    alt="User"
                                    width={48}
                                    height={48}
                                    className="object-cover w-full h-full"
                                />
                            </div>
                            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-zinc-900/80 text-white text-[10px] px-2 py-0.5 rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-zinc-700">
                                You
                            </div>
                        </div>
                    </Marker>
                )}

                {/* Voice Pins */}
                {pins.map(pin => (
                    <Marker
                        key={pin.id}
                        longitude={pin.location.coordinates[0]}
                        latitude={pin.location.coordinates[1]}
                        anchor="bottom"
                        onClick={(e) => {
                            e.originalEvent.stopPropagation();
                            setSelectedPin(pin);
                        }}
                    >
                        <div className={`w-10 h-10 rounded-full border-2 border-white/90 shadow-lg flex items-center justify-center cursor-pointer transition-all hover:scale-110 hover:-translate-y-1 ${pin.isAnonymous ? 'bg-zinc-600' : 'bg-emerald-500'} backdrop-blur-sm`}>
                            {pin.voiceMaskingEnabled ? (
                                <div className="w-4 h-4 rounded-sm bg-white/80" />
                            ) : (
                                <div className="w-3 h-3 bg-white rounded-full animate-bounce" />
                            )}
                        </div>
                    </Marker>
                ))}

                {/* Popup Player */}
                {selectedPin && (
                    <Popup
                        longitude={selectedPin.location.coordinates[0]}
                        latitude={selectedPin.location.coordinates[1]}
                        anchor="top"
                        onClose={() => setSelectedPin(null)}
                        closeButton={false}
                        className="z-50"
                        offset={20}
                    >
                        <div className="bg-zinc-900/95 border border-zinc-700/50 p-3 rounded-xl shadow-2xl text-white min-w-[240px] backdrop-blur-md">
                            <div className="flex justify-between items-center mb-3 border-b border-zinc-800 pb-2">
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${selectedPin.isAnonymous ? 'bg-zinc-500' : 'bg-emerald-500'}`} />
                                    <span className="text-xs font-mono text-zinc-300 font-medium tracking-wide">
                                        {selectedPin.isAnonymous ? 'ANONYMOUS' : 'USER DROP'}
                                        {selectedPin.voiceMaskingEnabled && ' • MASKED'}
                                    </span>
                                </div>
                                <button onClick={() => setSelectedPin(null)} className="text-zinc-500 hover:text-white transition-colors">&times;</button>
                            </div>
                            <AudioPlayer src={selectedPin.audioUrl} autoplay />
                        </div>
                    </Popup>
                )}
            </Map>

            {/* Header Overlay */}
            <div className="absolute top-6 left-6 z-10 pointer-events-none select-none">
                <h1 className="text-3xl font-black text-white tracking-tighter drop-shadow-2xl flex items-center gap-2">
                    EchoSphere <span className="text-emerald-400 text-sm font-bold uppercase track-widest px-2 py-0.5 bg-emerald-500/10 rounded-full border border-emerald-500/20 backdrop-blur-md">Live</span>
                </h1>
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
        </div>
    );
}
