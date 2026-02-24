import React from 'react';
import LoadingAnimation from './LoadingAnimation';

const LoadingScreen: React.FC = () => {
    return (
        <div className="fixed inset-0 z-[9999] h-[100dvh] w-screen flex flex-col items-center justify-center bg-background overflow-hidden">
            {/* Background Layer to match the previous dark mode feel if enabled */}
            <div className="absolute inset-0 bg-background pointer-events-none" />

            <LoadingAnimation />
        </div>
    );
};

export default LoadingScreen;
