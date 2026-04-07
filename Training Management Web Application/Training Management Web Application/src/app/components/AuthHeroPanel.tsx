import React from 'react';
import TmsLogo from './TmsLogo';

interface AuthHeroPanelProps {
  subtitle?: string;
  blendWithPage?: boolean;
}

const AuthHeroPanel: React.FC<AuthHeroPanelProps> = ({ subtitle }) => {
  return (
    <div className="hidden md:flex relative z-10 w-1/2 flex-col items-center justify-center p-12">
      {/* Soft translucent surface to anchor the text while feeling perfectly blended */}
      <div className="relative flex w-full max-w-sm flex-col items-center justify-center rounded-3xl pb-8">
        <div 
          className="absolute inset-0 bg-white/40 dark:bg-slate-950/50 blur-2xl rounded-full" 
          aria-hidden="true"
        />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-6 rounded-full border border-slate-200/50 dark:border-slate-700/50 bg-white/50 dark:bg-slate-800/60 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600 dark:text-slate-300 shadow-sm backdrop-blur-md">
            District Medical Office
          </div>

          <div className="mb-8">
            <TmsLogo className="size-28 xl:size-32 shadow-xl ring-1 ring-black/5 dark:ring-white/10" />
          </div>

          <h1 className="text-center text-4xl xl:text-5xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
            DMO TMS
          </h1>

          {subtitle && (
            <p className="mt-4 max-w-xs text-center text-lg font-medium text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}

          <div className="mt-10 h-1.5 w-20 rounded-full bg-primary/40 dark:bg-primary/60" />
        </div>
      </div>
    </div>
  );
};

export default AuthHeroPanel;
