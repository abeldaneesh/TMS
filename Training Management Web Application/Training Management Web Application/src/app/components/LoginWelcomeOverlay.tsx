import React, { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { User } from '../../types';
import { Button } from './ui/button';

interface LoginWelcomeOverlayProps {
  user: User | null;
  visible: boolean;
  onClose: () => void;
}

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const LoginWelcomeOverlay: React.FC<LoginWelcomeOverlayProps> = ({ user, visible, onClose }) => {
  useEffect(() => {
    if (!visible) return;

    const timeoutId = window.setTimeout(() => {
      onClose();
    }, 3200);

    return () => window.clearTimeout(timeoutId);
  }, [visible, onClose]);

  if (!user) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden px-4 py-6 sm:px-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/58 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="absolute left-1/2 top-1/2 size-[24rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-3xl"
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.55, ease: 'easeOut' }}
          />

          <motion.div
            className="relative z-10 w-full max-w-2xl overflow-hidden rounded-[30px] border border-border bg-background/96 shadow-[0_30px_90px_-28px_rgba(0,0,0,0.82)]"
            initial={{ opacity: 0, y: 22, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 210, damping: 24 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.09),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(37,99,235,0.05),transparent_30%)]" />
            <motion.div
              className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(59,130,246,0.72),transparent)]"
              animate={{ opacity: [0.35, 0.8, 0.35] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative px-6 py-6 text-foreground sm:px-8 sm:py-8">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="size-9 rounded-full text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="pb-3 pt-2 text-center">
                <motion.p
                  className="text-sm font-medium text-muted-foreground"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {getGreeting()}
                </motion.p>
                <motion.h2
                  className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-5xl"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16 }}
                >
                  Welcome back, {user.name}.
                </motion.h2>
                <motion.p
                  className="mx-auto mt-4 max-w-xl text-sm leading-7 text-muted-foreground sm:text-base"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                >
                  Your workspace is ready.
                </motion.p>
              </div>

              <div className="mt-5">
                <div className="overflow-hidden rounded-full bg-secondary/35">
                  <motion.div
                    className="h-1.5 rounded-full bg-[linear-gradient(90deg,rgba(37,99,235,0.95),rgba(96,165,250,0.9))]"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: 3, ease: 'linear' }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginWelcomeOverlay;
