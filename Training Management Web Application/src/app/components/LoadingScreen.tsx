import React from 'react';

const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background overflow-hidden relative">
            {/* Background Layer to match the previous dark mode feel if enabled */}
            <div className="absolute inset-0 bg-background pointer-events-none" />

            {/* Loading Symbols Container */}
            <div className="relative flex items-center justify-center mb-6">

                {/* Circle */}
                <svg className="loading-symbol" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="14" className="stroke" pathLength="100" />
                    <circle cx="16" cy="26" r="1.5" className="dot delay-0" />
                </svg>

                {/* Triangle */}
                <svg className="loading-symbol triangle-symbol" viewBox="0 0 32 32">
                    <path d="M 16 3 L 29 27 L 3 27 Z" className="stroke" pathLength="100" />
                    <circle cx="16" cy="23" r="1.5" className="dot delay-1" />
                </svg>

                {/* Square */}
                <svg className="loading-symbol square-symbol" viewBox="0 0 32 32">
                    <rect x="3" y="3" width="26" height="26" rx="1.5" className="stroke" pathLength="100" />
                    <circle cx="16" cy="25" r="1.5" className="dot delay-2" />
                </svg>

            </div>

            <style>{`
                .loading-symbol {
                    width: 32px;
                    height: 32px;
                    margin: 0 12px;
                    overflow: visible;
                }
                
                .loading-symbol .stroke {
                    stroke: currentColor;
                    stroke-width: 2.2;
                    stroke-linecap: round;
                    stroke-linejoin: round;
                    fill: none;
                    stroke-dasharray: 100 100;
                    stroke-dashoffset: 100;
                    color: hsl(var(--foreground));
                    opacity: 0.8;
                }

                .loading-symbol.triangle-symbol .stroke {
                    animation: draw-triangle 2.2s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
                }
                
                .loading-symbol:not(.triangle-symbol) .stroke {
                    animation: draw 2.2s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
                }

                .loading-symbol .dot {
                    fill: hsl(var(--primary));
                    animation: bounce 2.2s cubic-bezier(0.4, 0.0, 0.2, 1) infinite;
                    transform-origin: center;
                }

                .triangle-symbol .stroke { animation-delay: 0.15s; }
                .triangle-symbol .dot { animation-delay: 0.15s; }
                
                .square-symbol .stroke { animation-delay: 0.3s; }
                .square-symbol .dot { animation-delay: 0.3s; }

                @keyframes draw {
                    0% {
                        stroke-dashoffset: 100;
                    }
                    35%, 65% {
                        stroke-dashoffset: 0;
                    }
                    100% {
                        stroke-dashoffset: -100;
                    }
                }

                @keyframes draw-triangle {
                    0% {
                        stroke-dashoffset: 100;
                    }
                    35%, 65% {
                        stroke-dashoffset: 0;
                    }
                    100% {
                        stroke-dashoffset: -100;
                    }
                }

                @keyframes bounce {
                    0%, 20%, 80%, 100% {
                        transform: translateY(0);
                        opacity: 1;
                    }
                    50% {
                        transform: translateY(-8px);
                        opacity: 0.5;
                    }
                }
            `}</style>
        </div>
    );
};

export default LoadingScreen;
