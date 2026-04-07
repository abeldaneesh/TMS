import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Play, X } from 'lucide-react';
import { User } from '../../types';
import { Button } from './ui/button';

interface LoginWelcomeOverlayProps {
  user: User | null;
  visible: boolean;
  onClose: () => void;
}

const WELCOME_VIDEO_PATH = '/welcome-animation.mp4';
const LEGACY_WELCOME_VIDEO_PATH = '/welcome-animation.mp4.mp4';
const MIN_CLOSE_MS = 5000;
const MAX_CLOSE_MS = 10000;

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const LoginWelcomeOverlay: React.FC<LoginWelcomeOverlayProps> = ({ user, visible, onClose }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const minTimerRef = useRef<number | null>(null);
  const minElapsedRef = useRef(false);
  const endedBeforeMinRef = useRef(false);
  const videoFailedRef = useRef(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [playbackBlocked, setPlaybackBlocked] = useState(false);
  const [canDismiss, setCanDismiss] = useState(false);

  const clearTimers = () => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (minTimerRef.current !== null) {
      window.clearTimeout(minTimerRef.current);
      minTimerRef.current = null;
    }
  };

  const tryStartPlayback = () => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    videoElement.muted = false;
    videoElement.volume = 1;

    const playPromise = videoElement.play();

    if (playPromise && typeof playPromise.then === 'function') {
      playPromise
        .then(() => {
          setPlaybackBlocked(false);
        })
        .catch(() => {
          setPlaybackBlocked(true);
        });
    }
  };

  useEffect(() => {
    if (!visible) {
      clearTimers();
      minElapsedRef.current = false;
      endedBeforeMinRef.current = false;
      videoFailedRef.current = false;
      setVideoFailed(false);
      setPlaybackBlocked(false);
      setCanDismiss(false);

      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0;
      }

      return;
    }

    minElapsedRef.current = false;
    endedBeforeMinRef.current = false;
    videoFailedRef.current = false;
    setVideoFailed(false);
    setPlaybackBlocked(false);
    setCanDismiss(false);

    minTimerRef.current = window.setTimeout(() => {
      minElapsedRef.current = true;
      setCanDismiss(true);

      if (endedBeforeMinRef.current || videoFailedRef.current) {
        onClose();
      }
    }, MIN_CLOSE_MS);

    closeTimerRef.current = window.setTimeout(() => {
      onClose();
    }, MAX_CLOSE_MS);

    const playbackStartTimer = window.setTimeout(() => {
      tryStartPlayback();
    }, 80);

    return () => {
      window.clearTimeout(playbackStartTimer);
      clearTimers();
    };
  }, [visible, onClose]);

  const handleVideoEnded = () => {
    if (minElapsedRef.current) {
      onClose();
      return;
    }

    endedBeforeMinRef.current = true;
  };

  const handleVideoError = () => {
    videoFailedRef.current = true;
    setVideoFailed(true);
    endedBeforeMinRef.current = true;

    if (minElapsedRef.current) {
      onClose();
    }
  };

  if (!user) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="fixed inset-0 z-[100] overflow-hidden bg-black"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {!videoFailed ? (
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              autoPlay
              playsInline
              preload="auto"
              disablePictureInPicture
              onEnded={handleVideoEnded}
              onError={handleVideoError}
            >
              <source src={WELCOME_VIDEO_PATH} type="video/mp4" />
              <source src={LEGACY_WELCOME_VIDEO_PATH} type="video/mp4" />
            </video>
          ) : (
            <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.32),transparent_42%),linear-gradient(180deg,#020617_0%,#0f172a_100%)] px-6 text-center sm:px-10">
              <div className="max-w-2xl">
                <motion.p
                  className="text-sm font-medium uppercase tracking-[0.32em] text-sky-200/80"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {getGreeting()}
                </motion.p>
                <motion.h2
                  className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-6xl"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.16 }}
                >
                  Welcome back, {user.name}.
                </motion.h2>
                <motion.p
                  className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-200/85 sm:text-lg"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.22 }}
                >
                  Add your intro video at <span className="font-semibold text-white">{WELCOME_VIDEO_PATH}</span> to show it on the full-screen welcome experience after login.
                </motion.p>
              </div>
            </div>
          )}

          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.32)_0%,rgba(2,6,23,0.04)_34%,rgba(2,6,23,0.62)_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.18),transparent_26%)]" />

          <div className="absolute inset-x-0 top-0 z-20 flex items-start justify-between p-4 sm:p-6">
            <motion.div
              className="max-w-xl text-white"
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-sky-200/85">
                {getGreeting()}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-4xl">
                Welcome back, {user.name}.
              </h2>
            </motion.div>

            <div className="flex items-center gap-2">
              {canDismiss && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="size-9 rounded-full border border-white/15 bg-black/35 text-white hover:bg-black/55 hover:text-white"
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>
          </div>

          {playbackBlocked && !videoFailed && (
            <motion.div
              className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 px-6 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="max-w-md rounded-[28px] border border-white/10 bg-slate-950/85 p-6 text-center text-white shadow-[0_24px_80px_-30px_rgba(0,0,0,0.8)]">
                <p className="text-xs font-medium uppercase tracking-[0.32em] text-sky-200/75">
                  Sound ready
                </p>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight">
                  Tap once to start the welcome video with audio
                </h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Some browsers block automatic audio playback. One tap will start your login welcome video with sound.
                </p>
                <Button
                  type="button"
                  onClick={tryStartPlayback}
                  className="mt-6 inline-flex h-11 items-center gap-2 rounded-full px-6"
                >
                  <Play className="size-4" />
                  Play Welcome Video
                </Button>
              </div>
            </motion.div>
          )}

        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginWelcomeOverlay;
