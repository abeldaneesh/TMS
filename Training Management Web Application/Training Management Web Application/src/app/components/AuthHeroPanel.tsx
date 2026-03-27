import React from 'react';
import TmsLogo from './TmsLogo';

interface AuthHeroPanelProps {
  subtitle?: string;
}

const HERO_IMAGE = '/login-training-hero.svg';

const AuthHeroPanel: React.FC<AuthHeroPanelProps> = ({ subtitle }) => {
  return (
    <div className="hidden md:flex md:w-1/2 relative overflow-hidden isolate">
      <img
        src={HERO_IMAGE}
        alt="Blurred illustration of medical training operations and attendance management"
        className="absolute inset-0 h-full w-full object-cover scale-[1.03]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.18),rgba(15,23,42,0.48))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.22),transparent_28%),linear-gradient(120deg,rgba(7,18,34,0.18),rgba(7,18,34,0.38))]" />

      <div className="relative z-10 flex w-full flex-col items-center justify-center p-12 text-white">
        <div className="mb-6 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-white/85 backdrop-blur-md">
          District Medical Office
        </div>

        <div className="mb-8">
          <TmsLogo className="size-28 text-white" />
        </div>

        <h1
          className="text-center text-4xl font-semibold tracking-tight text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)]"
          style={{ color: '#ffffff' }}
        >
          DMO TMS
        </h1>

        {subtitle && (
          <p
            className="mt-4 max-w-md text-center text-xl font-medium text-white/90 drop-shadow-[0_4px_18px_rgba(0,0,0,0.45)]"
            style={{ color: 'rgba(255,255,255,0.92)' }}
          >
            {subtitle}
          </p>
        )}

        <div className="mt-8 h-1 w-32 rounded-full bg-white/40" />
      </div>
    </div>
  );
};

export default AuthHeroPanel;
