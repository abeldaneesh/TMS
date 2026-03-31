import React from 'react';
import TmsLogo from './TmsLogo';

interface AuthHeroPanelProps {
  subtitle?: string;
}

const HERO_IMAGE = '/login-training-hero.svg';

const AuthHeroPanel: React.FC<AuthHeroPanelProps> = ({ subtitle }) => {
  return (
    <div className="hidden md:flex md:w-1/2 relative overflow-hidden isolate bg-slate-100">
      <img
        src={HERO_IMAGE}
        alt="Blurred illustration of medical training operations and attendance management"
        className="absolute inset-0 h-full w-full object-cover scale-[1.02]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(241,245,249,0.58),rgba(226,232,240,0.62))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.18),transparent_34%),linear-gradient(120deg,rgba(255,255,255,0.12),rgba(148,163,184,0.12))]" />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.24),rgba(255,255,255,0.08),rgba(226,232,240,0.22))]" />

      <div className="relative z-10 flex w-full flex-col items-center justify-center p-12 text-slate-900">
        <div className="mb-6 rounded-full border border-slate-300/80 bg-white/75 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 backdrop-blur-md shadow-sm">
          District Medical Office
        </div>

        <div className="mb-8">
          <TmsLogo className="size-28 border border-white/80 shadow-[0_18px_40px_rgba(148,163,184,0.35)]" />
        </div>

        <h1
          className="text-center text-4xl font-semibold tracking-tight text-slate-900"
          style={{ color: '#0f172a' }}
        >
          DMO TMS
        </h1>

        {subtitle && (
          <p
            className="mt-4 max-w-md text-center text-xl font-medium text-slate-700"
            style={{ color: '#334155' }}
          >
            {subtitle}
          </p>
        )}

        <div className="mt-8 h-1 w-32 rounded-full bg-primary/65" />
      </div>
    </div>
  );
};

export default AuthHeroPanel;
