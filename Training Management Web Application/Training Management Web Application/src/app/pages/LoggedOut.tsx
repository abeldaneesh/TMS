import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import AuthHeroPanel from '../components/AuthHeroPanel';
import TmsLogo from '../components/TmsLogo';
import { Button } from '../components/ui/button';

const LoggedOut: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground">
      <AuthHeroPanel subtitle="Training Management System" />

      <div className="relative flex-1 overflow-hidden bg-background">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_32%)]" />
        <div className="absolute inset-0 cyber-grid opacity-[0.04] pointer-events-none" />

        <div className="relative z-10 flex min-h-screen items-center justify-center p-6 sm:p-8 md:p-12">
          <motion.div
            className="w-full max-w-xl rounded-[28px] border border-border bg-card p-8 shadow-[0_28px_90px_-32px_rgba(15,23,42,0.45)] sm:p-10"
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
          >
            <div className="flex flex-col items-center text-center">
              <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                <TmsLogo className="size-14 text-primary" />
              </div>

              <motion.h1
                className="mt-8 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
              >
                Thanks for using DMO TMS
              </motion.h1>

              <motion.p
                className="mt-4 max-w-md text-base leading-8 text-muted-foreground sm:text-lg"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.18 }}
              >
                You have been signed out successfully.
              </motion.p>

              <motion.div
                className="mt-10"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.24 }}
              >
                <Button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="h-12 rounded-xl px-6 text-base font-medium"
                >
                  Sign in again
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default LoggedOut;
