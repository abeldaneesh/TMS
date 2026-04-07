import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { User } from '../../types';
import { Button } from './ui/button';

interface LoginWelcomeOverlayProps {
  user: User | null;
  visible: boolean;
  onClose: () => void;
}

const WELCOME_VIDEO_PATH = '/welcome-animation.mp4';
const LEGACY_WELCOME_VIDEO_PATH = '/welcome-animation.mp4.mp4';
const MIN_CLOSE_MS = 3200;
const MAX_CLOSE_MS = 15000;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const LoginWelcomeOverlay: React.FC<LoginWelcomeOverlayProps> = ({ user, visible, onClose }) => {
  const closeTimerRef = useRef<number | null>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [progressDurationMs, setProgressDurationMs] = useState(MAX_CLOSE_MS);

  const clearCloseTimer = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const scheduleClose = (durationMs: number) => {
    clearCloseTimer();
    setProgressDurationMs(durationMs);
    closeTimerRef.current = window.setTimeout(() => {
      onClose();
    }, durationMs);
  };

  useEffect(() => {
    if (!visible) {
      clearCloseTimer();
      setVideoFailed(false);
      setProgressDurationMs(MAX_CLOSE_MS);
      return;
    }

    // Keep a hard timeout so the overlay never gets stuck open if the media stalls.
    scheduleClose(MAX_CLOSE_MS);

    return clearCloseTimer;
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

            <div className="relative text-foreground">
              <div className="absolute right-4 top-4 z-20 sm:right-5 sm:top-5">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="size-9 rounded-full border border-white/15 bg-black/35 text-white hover:bg-black/55 hover:text-white"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="relative aspect-[16/9] w-full overflow-hidden bg-slate-950">
                {!videoFailed ? (
                  <>
                    <video
                      className="h-full w-full object-cover"
                      autoPlay
                      muted
                      playsInline
                      preload="auto"
                      onEnded={onClose}
                      onError={() => {
                        setVideoFailed(true);
                        scheduleClose(MIN_CLOSE_MS);
                      }}
                      onLoadedMetadata={(event) => {
                        const seconds = event.currentTarget.duration;
                        if (!Number.isFinite(seconds) || seconds <= 0) {
                          return;
                        }

                        const durationMs = Math.min(
                          Math.max(Math.round(seconds * 1000), MIN_CLOSE_MS),
                          MAX_CLOSE_MS,
                        );
                        scheduleClose(durationMs);
                      }}
                    >
                      <source src={WELCOME_VIDEO_PATH} type="video/mp4" />
                      <source src={LEGACY_WELCOME_VIDEO_PATH} type="video/mp4" />
                    </video>

                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.18)_0%,rgba(2,6,23,0.08)_38%,rgba(2,6,23,0.72)_100%)]" />
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.28),transparent_45%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-6 text-center sm:px-10">
                    <div className="max-w-xl">
                      <motion.p
                        className="text-sm font-medium uppercase tracking-[0.28em] text-sky-200/80"
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        {getGreeting()}
                      </motion.p>
                      <motion.h2
                        className="mt-4 text-3xl font-semibold tracking-tight text-white sm:text-5xl"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.16 }}
                      >
                        Welcome back, {user.name}.
                      </motion.h2>
                      <motion.p
                        className="mx-auto mt-4 max-w-lg text-sm leading-7 text-slate-200/85 sm:text-base"
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.22 }}
                      >
                        Add your custom intro video at <span className="font-semibold text-white">{WELCOME_VIDEO_PATH}</span> to replace this fallback welcome screen.
                      </motion.p>
                    </div>
                  </div>
                )}

                {!videoFailed && (
                  <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
                    <motion.div
                      className="max-w-xl"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.18 }}
                    >
                      <p className="text-xs font-medium uppercase tracking-[0.28em] text-sky-200/85">
                        {getGreeting()}
                      </p>
                      <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                        Welcome back, {user.name}.
                      </h2>
                    </motion.div>
                  </div>
                )}
              </div>

              <div className="px-6 py-5 sm:px-8">
                <div className="overflow-hidden rounded-full bg-secondary/35">
                  <motion.div
                    key={progressDurationMs}
                    className="h-1.5 rounded-full bg-[linear-gradient(90deg,rgba(37,99,235,0.95),rgba(96,165,250,0.9))]"
                    initial={{ width: '100%' }}
                    animate={{ width: '0%' }}
                    transition={{ duration: progressDurationMs / 1000, ease: 'linear' }}
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
