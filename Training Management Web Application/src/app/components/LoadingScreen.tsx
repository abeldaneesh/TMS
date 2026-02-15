import React from 'react';
import { Loader2 } from 'lucide-react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none" />
            <div className="absolute inset-0 bg-radial-gradient from-primary/10 via-transparent to-transparent opacity-40 pointer-events-none" />

            {/* Animated Logo Container */}
            <div className="relative mb-8">
                {/* Outer Glow Ring */}
                <div className="absolute inset-0 rounded-2xl bg-primary/20 blur-2xl animate-pulse" />

                {/* Logo Frame */}
                <div className="relative bg-card/40 backdrop-blur-xl border border-primary/30 p-6 rounded-2xl shadow-2xl glow-primary">
                    <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
                        <div className="relative">
                            <path
                                className="text-primary size-12 animate-pulse"
                                d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"
                            />
                            {/* SVG for a custom futuristic logo icon (Building/Tech themed) */}
                            <svg
                                className="size-12 text-primary"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <rect x="3" y="11" width="18" height="10" rx="2" />
                                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                <path d="M12 15v2" />
                                <circle cx="12" cy="15" r="4" className="animate-pulse" strokeDasharray="4 4" />
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Scanning Line Animation */}
                <div className="absolute -left-10 -right-10 top-1/2 h-0.5 bg-primary/40 blur-sm animate-[scan_2s_ease-in-out_infinite]" />
            </div>

            {/* Text & Progress */}
            <div className="flex flex-col items-center">
                <h2 className="text-2xl font-black text-foreground tracking-[0.2em] mb-2 uppercase flex items-center gap-2">
                    DMO <span className="text-primary italic">SYSTEMS</span>
                </h2>
                <div className="flex items-center gap-3 text-muted-foreground font-mono text-[10px] uppercase tracking-widest opacity-70">
                    <Loader2 className="size-3 animate-spin text-primary" />
                    <span>Initializing Secure Connection...</span>
                </div>
            </div>

            {/* Bottom Version Tag */}
            <div className="absolute bottom-10 font-mono text-[8px] text-muted-foreground uppercase tracking-[0.4em] opacity-40">
                PROTCOL_VERSION V4.0.2
            </div>

            <style>{`
                @keyframes scan {
                    0% { transform: translateY(-30px); opacity: 0; }
                    50% { opacity: 1; }
                    100% { transform: translateY(30px); opacity: 0; }
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;
