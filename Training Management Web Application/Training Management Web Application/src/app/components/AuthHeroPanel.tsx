import React from 'react';
import { Activity, ShieldCheck, Users } from 'lucide-react';
import TmsLogo from './TmsLogo';

interface AuthHeroPanelProps {
  subtitle?: string;
}

const HERO_IMAGE = '/login-training-hero.svg';

const AuthHeroPanel: React.FC<AuthHeroPanelProps> = ({ subtitle }) => {
  const highlights = [
    {
      icon: ShieldCheck,
      label: 'Protected Access',
      value: 'Role-based entry',
    },
    {
      icon: Users,
      label: 'Unified Workflows',
      value: 'Staff and participants',
    },
    {
      icon: Activity,
      label: 'Operational Visibility',
      value: 'Training oversight',
    },
  ];

  return (
    <div className="relative hidden overflow-hidden isolate border-r border-white/10 bg-slate-950 md:flex md:w-[54%]">
      <img
        src={HERO_IMAGE}
        alt="Blurred illustration of medical training operations and attendance management"
        className="absolute inset-0 h-full w-full object-cover scale-[1.04]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.2),rgba(2,6,23,0.84))]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.2),transparent_30%),radial-gradient(circle_at_75%_15%,rgba(99,102,241,0.24),transparent_28%),linear-gradient(120deg,rgba(2,6,23,0.22),rgba(2,6,23,0.58))]" />
      <div className="absolute inset-y-0 right-0 w-32 bg-[linear-gradient(90deg,transparent,rgba(2,6,23,0.3))]" />

      <div className="relative z-10 flex w-full flex-col justify-between p-12 text-white lg:p-16">
        <div className="max-w-xl">
          <div className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.3em] text-white/80 backdrop-blur-md">
            District Medical Office
          </div>

          <div className="mt-10 flex items-center gap-5">
            <TmsLogo className="size-24 border border-white/40 shadow-[0_22px_55px_rgba(15,23,42,0.45)] lg:size-28" />
            <div className="h-px flex-1 bg-gradient-to-r from-white/40 via-white/10 to-transparent" />
          </div>

          <h1
            className="mt-10 text-5xl font-semibold tracking-[-0.04em] text-white drop-shadow-[0_10px_36px_rgba(0,0,0,0.42)]"
            style={{ color: '#ffffff' }}
          >
            DMO TMS
          </h1>

          {subtitle && (
            <p
              className="mt-4 max-w-lg text-2xl font-medium text-white/90 drop-shadow-[0_4px_18px_rgba(0,0,0,0.35)]"
              style={{ color: 'rgba(255,255,255,0.92)' }}
            >
              {subtitle}
            </p>
          )}

          <p className="mt-6 max-w-xl text-base leading-7 text-white/70">
            Centralized access for training administration, program coordination, participant services, and institutional verification.
          </p>
        </div>

        <div className="mt-12 grid gap-3 sm:grid-cols-3">
          {highlights.map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur-md shadow-[0_16px_40px_rgba(15,23,42,0.18)]"
            >
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-xl bg-white/10 text-white">
                  <item.icon className="size-5" />
                </div>
                <div>
                  <div className="text-xs font-medium uppercase tracking-[0.18em] text-white/55">{item.label}</div>
                  <div className="mt-1 text-sm font-semibold text-white">{item.value}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AuthHeroPanel;
