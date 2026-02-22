import React from 'react';

const DoctorLogo: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 256 256"
            className={className}
        >
            <defs>
                <mask id="docMask">
                    {/* Base: Everything white is kept */}
                    <rect width="256" height="256" fill="white" />

                    {/* Subtract (black) the V-Neck / Shirt Collar area */}
                    <path d="M128 135l-28-14v28l28 36 28-36v-28z" fill="black" stroke="black" strokeWidth="2" strokeLinejoin="round" />

                    {/* Add back (white) the Tie area */}
                    <path d="M128 150l6 16-6 36-6-36z" fill="white" stroke="none" />

                    {/* Subtract Stethoscope Tubing Left */}
                    <path d="M72 165v15c0 14 10 25 24 25" fill="none" stroke="black" strokeWidth="10" strokeLinecap="round" />
                    {/* Subtract Stethoscope Tubing Right */}
                    <path d="M184 165v25c0 14-10 25-24 25" fill="none" stroke="black" strokeWidth="10" strokeLinecap="round" />

                    {/* Subtract Stethoscope Bell Left */}
                    <circle cx="96" cy="216" r="12" fill="none" stroke="black" strokeWidth="10" />
                    {/* Subtract Stethoscope End Right */}
                    <circle cx="160" cy="215" r="6" fill="black" stroke="none" />
                </mask>
            </defs>

            {/* Outer Border */}
            <circle cx="128" cy="128" r="112" fill="none" stroke="currentColor" strokeWidth="16" />

            {/* Masked Doctor Silhouette */}
            <g fill="currentColor" mask="url(#docMask)">
                {/* Head */}
                <path d="M128 128a36 36 0 1 0 0-72 36 36 0 0 0 0 72z" />

                {/* Ears */}
                <circle cx="94" cy="95" r="12" />
                <circle cx="162" cy="95" r="12" />

                {/* Body */}
                <path d="M192 144H64a32 32 0 0 0-32 32v40h192v-40a32 32 0 0 0-32-32z" />
            </g>
        </svg>
    );
};

export default DoctorLogo;
