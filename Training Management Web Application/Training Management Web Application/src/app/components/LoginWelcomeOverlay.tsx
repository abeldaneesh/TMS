import React, { useEffect, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarDays, ShieldCheck, Sparkles, X } from 'lucide-react';
import { User } from '../../types';
import { Button } from './ui/button';

interface LoginWelcomeOverlayProps {
  user: User | null;
  visible: boolean;
  onClose: () => void;
}

const roleLabelMap: Record<string, string> = {
  master_admin: 'Master Admin',
  institutional_admin: 'Admin',
  program_officer: 'Program Officer',
  medical_officer: 'Medical Officer',
  participant: 'Participant',
};

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
    }, 3600);

    return () => window.clearTimeout(timeoutId);
  }, [visible, onClose]);

  const roleLabel = useMemo(() => {
    if (!user?.role) return 'Team Member';
    return roleLabelMap[user.role] || 'Team Member';
  }, [user?.role]);

  const formattedTime = useMemo(
    () =>
      new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date()),
    []
  );

  if (!user) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[100] flex items-start justify-center px-4 pt-8 sm:pt-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="pointer-events-auto relative w-full max-w-2xl overflow-hidden rounded-[28px] border border-primary/10 bg-background/96 shadow-[0_24px_70px_-32px_rgba(0,0,0,0.72)] backdrop-blur-xl"
            initial={{ opacity: 0, y: -28, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 220, damping: 25 }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.08),transparent_48%)]" />
            <motion.div
              className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(96,165,250,0.85),transparent)]"
              animate={{ opacity: [0.45, 1, 0.45] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />

            <div className="relative rounded-[24px] border border-white/5 bg-secondary/10 px-5 py-5 text-foreground sm:px-7 sm:py-6">
              <div className="flex items-start justify-between gap-4">
                <motion.div
                  className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-primary"
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.08 }}
                >
                  <Sparkles className="size-3.5" />
                  Session Ready
                </motion.div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="size-9 rounded-full text-muted-foreground hover:bg-white/5 hover:text-foreground"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="mt-5 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-3">
                  <motion.p
                    className="text-sm font-medium text-muted-foreground"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 }}
                  >
                    {getGreeting()}
                  </motion.p>
                  <motion.h2
                    className="text-2xl font-semibold tracking-tight sm:text-4xl"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                  >
                    Welcome back, {user.name}.
                  </motion.h2>
                  <motion.p
                    className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.24 }}
                  >
                    Your workspace is ready. Review your schedule, track activity, and continue managing today&apos;s training tasks.
                  </motion.p>
                </div>

                <motion.div
                  className="grid min-w-[220px] grid-cols-1 gap-3 sm:max-w-[260px]"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.28 }}
                >
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Role</p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                      <ShieldCheck className="size-4 text-primary" />
                      {roleLabel}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/70 bg-secondary/20 px-4 py-3">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Signed in</p>
                    <p className="mt-2 flex items-center gap-2 text-sm font-medium text-foreground">
                      <CalendarDays className="size-4 text-primary" />
                      {formattedTime}
                    </p>
                  </div>
                </motion.div>
              </div>

              <div className="mt-5 overflow-hidden rounded-full bg-secondary/30">
                <motion.div
                  className="h-1 rounded-full bg-[linear-gradient(90deg,rgba(37,99,235,0.95),rgba(96,165,250,0.9))]"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 3.2, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default LoginWelcomeOverlay;
