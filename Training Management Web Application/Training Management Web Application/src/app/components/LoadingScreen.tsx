import React from 'react';
import { createPortal } from 'react-dom';
import LoadingAnimation from './LoadingAnimation';

interface LoadingScreenProps {
    fullscreen?: boolean;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ fullscreen = false }) => {
    if (!fullscreen) {
        return (
            <div className="flex min-h-[60vh] w-full items-center justify-center">
                <LoadingAnimation />
            </div>
        );
    }

    const content = (
        <div className="fixed inset-0 z-[9999] h-[100dvh] w-[100vw] bg-background overflow-hidden">
            <div className="absolute inset-0 bg-background pointer-events-none" />

            <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform-gpu">
                <LoadingAnimation />
            </div>
        </div>
    );

    if (typeof document === 'undefined') {
        return content;
    }

    return createPortal(content, document.body);
};

export default LoadingScreen;
