import React from 'react';
import { motion } from 'framer-motion';

interface PageTransitionProps {
    children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            className="relative w-full h-full transform-gpu will-change-transform"
        >
            <div className="relative z-10 h-full">{children}</div>

            <motion.div
                initial={{ opacity: 0.14 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
            >
                <div className="absolute inset-0 bg-background/20" />
                <motion.div
                    initial={{ x: '-120%', opacity: 0 }}
                    animate={{ x: '320%', opacity: [0, 0.35, 0] }}
                    transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
                    className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-primary/12 to-transparent transform-gpu"
                />
            </motion.div>
        </motion.div>
    );
};

export default PageTransition;
