import React from 'react';

const DoctorLogo: React.FC<{ className?: string }> = ({ className }) => {
    return (
        <img src="/logo.png" className={`${className || ''} object-contain`} alt="DMO TMS Logo" />
    );
};

export default DoctorLogo;
