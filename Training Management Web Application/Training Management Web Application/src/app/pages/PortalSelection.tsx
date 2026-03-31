import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Activity, ArrowRight, Cpu, Database, ShieldCheck, UserCog, Users } from 'lucide-react';
import { Card } from '../components/ui/card';
import { motion } from 'framer-motion';
import AuthHeroPanel from '../components/AuthHeroPanel';
import TmsLogo from '../components/TmsLogo';

const PortalSelection: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [activePortalPath, setActivePortalPath] = useState<string | null>(null);

    const portals = [
        {
            title: t('portalSelection.adminTitle', 'Administrator'),
            description: t('portalSelection.adminDesc', 'System settings & oversight'),
            detail: t('portalSelection.adminDetail', 'Governance controls, reporting access, and platform administration.'),
            icon: ShieldCheck,
            color: 'text-primary bg-primary/10',
            tag: t('portalSelection.adminTag', 'Oversight'),
            path: '/login/admin',
        },
        {
            title: t('portalSelection.officerTitle', 'Program Officer'),
            description: t('portalSelection.officerDesc', 'Manage training programs'),
            detail: t('portalSelection.officerDetail', 'Scheduling, nominations, attendance, and program delivery workflows.'),
            icon: UserCog,
            color: 'text-blue-600 bg-blue-500/10',
            tag: t('portalSelection.officerTag', 'Operations'),
            path: '/login/officer',
        },
        {
            title: t('portalSelection.participantTitle', 'Participant'),
            description: t('portalSelection.participantDesc', 'Access your training records'),
            detail: t('portalSelection.participantDetail', 'View assignments, certificates, attendance, and personal training history.'),
            icon: Users,
            color: 'text-emerald-600 bg-emerald-500/10',
            tag: t('portalSelection.participantTag', 'Self Service'),
            path: '/login/participant',
        },
        {
            title: t('portalSelection.moTitle', 'Medical Officer'),
            description: t('portalSelection.moDesc', 'Verify and manage institution personnel'),
            detail: t('portalSelection.moDetail', 'Institution verification, personnel records, and registration review.'),
            icon: Database,
            color: 'text-violet-600 bg-violet-500/10',
            tag: t('portalSelection.moTag', 'Verification'),
            path: '/login/medical_officer',
        },
    ];

    const accessHighlights = [
        {
            icon: ShieldCheck,
            title: t('portalSelection.highlightSecureTitle', 'Secure Access'),
            text: t('portalSelection.highlightSecureText', 'Role-based sign-in for authorized teams.'),
        },
        {
            icon: Database,
            title: t('portalSelection.highlightRecordsTitle', 'Protected Records'),
            text: t('portalSelection.highlightRecordsText', 'Training and personnel data managed centrally.'),
        },
        {
            icon: Activity,
            title: t('portalSelection.highlightWorkflowTitle', 'Operational Continuity'),
            text: t('portalSelection.highlightWorkflowText', 'Built for daily program and attendance workflows.'),
        },
    ];

    const handlePortalClick = (path: string) => {
        if (activePortalPath) return;
        setActivePortalPath(path);
        setTimeout(() => {
            navigate(path);
        }, 240);
    };

    return (
        <div className="min-h-screen flex flex-col md:flex-row bg-background text-foreground transition-colors duration-300">
            {/* Left Column: Background Image (Desktop only) */}
            <AuthHeroPanel subtitle={t('portalSelection.heroSubtitle', 'Training Management System')} />

            {/* Right Column: Portal Selection */}
            <div className="relative flex-1 overflow-y-auto bg-background">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(79,70,229,0.12),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(14,165,233,0.08),transparent_24%)] pointer-events-none" />
                <div className="absolute inset-0 cyber-grid opacity-[0.06] pointer-events-none" />
                <div className="relative mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-6 py-10 sm:px-8 md:px-12 lg:px-14">

                    {/* Mobile Header */}
                    <div className="relative z-10 mb-8 flex flex-col rounded-[2rem] border border-white/10 bg-slate-950/80 px-6 py-7 shadow-[0_28px_80px_rgba(2,6,23,0.32)] backdrop-blur-xl md:hidden">
                        <div className="flex items-center gap-4">
                            <TmsLogo className="size-16 border border-white/30 shadow-[0_16px_36px_rgba(15,23,42,0.35)]" />
                            <div>
                                <div className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/60">District Medical Office</div>
                                <h1
                                    className="mt-2 text-3xl font-semibold tracking-tight text-white"
                                    style={{ color: '#ffffff' }}
                                >
                                    DMO TMS
                                </h1>
                            </div>
                        </div>
                        <p
                            className="mt-4 max-w-sm text-sm leading-6 text-white/80"
                            style={{ color: 'rgba(255,255,255,0.86)' }}
                        >
                            {t('portalSelection.mobileIntro', 'Secure access to training administration, program delivery, and participant services.')}
                        </p>
                    </div>

                    <div className="relative z-10 space-y-8">
                        <motion.div
                            className="rounded-[2rem] border border-border/70 bg-card/80 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur-xl sm:p-8"
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4 }}
                        >
                            <div className="flex flex-col gap-6">
                                <div className="space-y-3 text-center md:text-left">
                                    <div className="inline-flex items-center rounded-full border border-primary/15 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-primary/80">
                                        {t('portalSelection.badge', 'Secure Access')}
                                    </div>
                                    <h3 className="text-3xl font-bold tracking-tight text-foreground">
                                        {t('portalSelection.title', 'Select Portal')}
                                    </h3>
                                    <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                                        {t('portalSelection.desc', 'Choose your role to access the training management portal.')}
                                    </p>
                                </div>

                                <div className="grid gap-3 sm:grid-cols-3">
                                    {accessHighlights.map((item) => (
                                        <div
                                            key={item.title}
                                            className="rounded-2xl border border-border/70 bg-background/80 p-4"
                                        >
                                            <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                <item.icon className="size-5" />
                                            </div>
                                            <div className="mt-4 text-sm font-semibold text-foreground">{item.title}</div>
                                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.text}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>

                        <div className="space-y-4">
                            {portals.map((portal, index) => (
                                <motion.button
                                    key={portal.title}
                                    type="button"
                                    initial={{ opacity: 0, y: 15 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.3, delay: index * 0.08 }}
                                    whileHover={activePortalPath ? undefined : { scale: 1.008, y: -2 }}
                                    whileTap={activePortalPath ? undefined : { scale: 0.988 }}
                                    onClick={() => handlePortalClick(portal.path)}
                                    disabled={Boolean(activePortalPath)}
                                    className="group relative block w-full text-left"
                                >
                                    <motion.div
                                        initial={false}
                                        animate={activePortalPath === portal.path
                                            ? { opacity: [0, 0.7, 0], scale: [0.98, 1.02, 1.035] }
                                            : { opacity: 0, scale: 0.98 }}
                                        transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                                        className="pointer-events-none absolute inset-0 rounded-[1.75rem] bg-primary/10 ring-1 ring-primary/30"
                                    />
                                    <Card
                                        className="cursor-pointer overflow-hidden rounded-[1.75rem] border-border/70 bg-card/90 shadow-[0_20px_70px_rgba(15,23,42,0.08)] transition-all hover:border-primary/25 hover:bg-card"
                                        style={{
                                            transform: activePortalPath === portal.path ? 'scale(0.972)' : 'scale(1)',
                                            opacity: activePortalPath && activePortalPath !== portal.path ? 0.62 : 1,
                                            transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                                        }}
                                    >
                                        <div className="flex items-start gap-4 p-5 sm:p-6">
                                            <div className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${portal.color} ring-1 ring-black/5 transition-colors`}>
                                                <portal.icon className="size-6" />
                                            </div>
                                            <div className="min-w-0 flex-1 text-left">
                                                <div className="flex flex-wrap items-center gap-3">
                                                    <h4 className="text-xl font-semibold text-foreground transition-colors group-hover:text-primary">
                                                        {portal.title}
                                                    </h4>
                                                    <span className="rounded-full border border-border/80 bg-muted/60 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                                                        {portal.tag}
                                                    </span>
                                                </div>
                                                <p className="mt-1.5 text-sm font-medium text-foreground/80">
                                                    {portal.description}
                                                </p>
                                                <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                                                    {portal.detail}
                                                </p>
                                            </div>
                                            <div className="hidden sm:flex">
                                                <div className="flex size-11 items-center justify-center rounded-full border border-border/80 bg-background/80 text-muted-foreground transition-all group-hover:border-primary/25 group-hover:text-primary">
                                                    <ArrowRight className="size-4" />
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                </motion.button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-4 border-t border-border/70 pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                            <div className="space-y-1 text-center sm:text-left">
                                <div>{t('portalSelection.supportText', 'Need help accessing the platform? Contact the DMO system administrator.')}</div>
                                <div>
                                    &copy; {new Date().getFullYear()} DMO. {t('portalSelection.footerText', 'All rights reserved.')}
                                </div>
                            </div>
                            <div className="flex items-center justify-center gap-3 text-muted-foreground/40">
                                <Database className="size-3.5" />
                                <Cpu className="size-3.5" />
                                <Activity className="size-3.5" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortalSelection;
