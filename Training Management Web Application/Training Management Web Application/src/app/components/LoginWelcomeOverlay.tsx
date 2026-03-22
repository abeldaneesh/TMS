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
    }, 3200);

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

  const initials = user.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

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
            className="relative z-10 w-full max-w-3xl overflow-hidden rounded-[32px] border border-border bg-background/96 shadow-[0_30px_90px_-28px_rgba(0,0,0,0.82)]"
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
              <div className="flex items-start justify-between gap-4">
                <motion.div
                  className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/8 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary"
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
                  className="size-9 rounded-full text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                >
                  <X className="size-4" />
                </Button>
              </div>

              <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-end">
                <div className="space-y-4">
                  <motion.p
                    className="text-sm font-medium text-muted-foreground"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.12 }}
                  >
                    {getGreeting()}
                  </motion.p>
                  <motion.h2
                    className="max-w-xl text-3xl font-semibold tracking-tight text-foreground sm:text-5xl"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.18 }}
                  >
                    Welcome back, {user.name}.
                  </motion.h2>
                  <motion.p
                    className="max-w-xl text-base leading-8 text-muted-foreground"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.24 }}
                  >
                    Your workspace is ready. Review your schedule, track activity, and continue managing today&apos;s training tasks.
                  </motion.p>

                  <motion.div
                    className="flex flex-wrap gap-3 pt-1"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Workspace</p>
                      <p className="mt-2 text-sm font-medium text-foreground">Dashboard ready</p>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-3">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Focus</p>
                      <p className="mt-2 text-sm font-medium text-foreground">Today&apos;s training flow</p>
                    </div>
                  </motion.div>
                </div>

                <motion.div
                  className="grid grid-cols-1 gap-4"
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.28 }}
                >
                  <div className="rounded-[26px] border border-border bg-secondary/20 p-5">
                    <div className="flex items-center gap-4">
                      <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-lg font-semibold text-primary">
                        {initials}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-foreground">{user.name}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">{roleLabel}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Role</p>
                      <p className="mt-3 flex items-center gap-2 text-base font-medium text-foreground">
                        <ShieldCheck className="size-4 text-primary" />
                        {roleLabel}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-border bg-secondary/20 px-4 py-4">
                      <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground">Signed in</p>
                      <p className="mt-3 flex items-center gap-2 text-base font-medium text-foreground">
                        <CalendarDays className="size-4 text-primary" />
                        {formattedTime}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-4">
                    <p className="text-[11px] uppercase tracking-[0.24em] text-primary/80">Status</p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">
                      Everything is loaded. You can start reviewing sessions as soon as this intro fades.
                    </p>
                  </div>
                </motion.div>
              </div>

              <div className="mt-7">
                <div className="mb-3 flex items-center justify-between text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  <span>Preparing workspace</span>
                  <span>{formattedTime}</span>
                </div>
                <div className="overflow-hidden rounded-full bg-secondary/40">
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
