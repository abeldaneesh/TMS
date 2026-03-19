import React from 'react';

const TmsLogo: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <img 
            src="/tms-logo.jpg" 
            alt="TMS Logo" 
            className={`object-contain ${className || ''}`} 
        />
    );
};

export default TmsLogo;
