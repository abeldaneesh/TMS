import React from 'react';
import { motion, useReducedMotion } from 'framer-motion';

interface PageTransitionProps {
    children: React.ReactNode;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => {
    const prefersReducedMotion = useReducedMotion();

    const transition = prefersReducedMotion
        ? { duration: 0.16, ease: 'linear' as const }
        : { duration: 0.32, ease: [0.4, 0, 0.2, 1] as const };

    return (
        <motion.div
            initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.992 }}
            animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.998 }}
            transition={transition}
            className="relative h-full w-full origin-center transform-gpu will-change-transform"
        >
            <div className="relative z-10 h-full">{children}</div>

            <motion.div
                initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0.12 }}
                animate={{ opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={transition}
                className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
            >
                <div className="absolute inset-0 bg-gradient-to-b from-background/18 via-background/8 to-transparent" />
                <motion.div
                    initial={prefersReducedMotion ? { opacity: 0 } : { x: '-110%', opacity: 0 }}
                    animate={prefersReducedMotion ? { opacity: 0 } : { x: '240%', opacity: [0, 0.18, 0] }}
                    transition={{
                        duration: prefersReducedMotion ? 0.16 : 0.6,
                        ease: [0.4, 0, 0.2, 1],
                    }}
                    className="absolute inset-y-0 w-1/4 bg-gradient-to-r from-transparent via-primary/10 to-transparent transform-gpu"
                />
            </motion.div>
        </motion.div>
    );
};

export default PageTransition;
