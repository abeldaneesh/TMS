import React from 'react';

const DoctorLogo: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Whiteboard / Teaching Board */}
            <path
                d="M22 10H42V32H22V10Z"
                fill="currentColor"
                fillOpacity="0.1"
            />
            <path
                d="M22 10H42V32H22V10Z"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinejoin="round"
            />
            {/* Tripod Stand */}
            <path
                d="M28 32L24 42M36 32L40 42M32 32V42"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            {/* Horizontal Text Lines on Board */}
            <path
                d="M26 15H38M26 20H38M26 25H34"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
            />
            {/* Figure (Stick Person) */}
            <circle cx="12" cy="12" r="4" fill="currentColor" />
            <path
                d="M12 17C8 17 6 20 6 24V30"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            <path
                d="M12 17C16 17 18 20 18 24V32M12 28V42M9 42H15"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
            />
            {/* Pointing Stick */}
            <path
                d="M17 22L28 17"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
};

export default DoctorLogo;
