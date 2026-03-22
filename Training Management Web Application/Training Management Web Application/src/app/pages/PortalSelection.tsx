import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck, UserCog, Users, Database, Cpu, Activity } from 'lucide-react';
import { Card } from '../components/ui/card';
import { motion } from 'framer-motion';
import TmsLogo from '../components/TmsLogo';

const PortalSelection: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [activePortalPath, setActivePortalPath] = useState<string | null>(null);

    const portals = [
        {
            title: t('portalSelection.adminTitle', 'Administrator'),
            description: t('portalSelection.adminDesc', 'System settings & oversight'),
            icon: ShieldCheck,
            color: 'text-primary bg-primary/10',
            path: '/login/admin',
        },
        {
            title: t('portalSelection.officerTitle', 'Program Officer'),
            description: t('portalSelection.officerDesc', 'Manage training programs'),
            icon: UserCog,
            color: 'text-blue-600 bg-blue-500/10',
            path: '/login/officer',
        },
        {
            title: t('portalSelection.participantTitle', 'Participant'),
            description: t('portalSelection.participantDesc', 'Access your training records'),
            icon: Users,
            color: 'text-emerald-600 bg-emerald-500/10',
            path: '/login/participant',
        },
        {
            title: t('portalSelection.moTitle', 'Medical Officer'),
            description: t('portalSelection.moDesc', 'Verify and manage institution personnel'),
            icon: Database,
            color: 'text-purple-600 bg-purple-500/10',
            path: '/login/medical_officer',
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
            <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
                <img
                    src="https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1986&auto=format&fit=crop"
                    alt="Institutional Campus"
                    className="absolute inset-0 w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
                <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
                    <div className="mb-8">
                        <TmsLogo className="size-28 text-white" />
                    </div>
                    <h1
                        className="text-4xl font-semibold tracking-tight text-center text-white drop-shadow-[0_6px_24px_rgba(0,0,0,0.65)]"
                        style={{ color: '#ffffff' }}
                    >
                        DMO TMS
                    </h1>
                    <p
                        className="text-xl mt-4 font-medium opacity-90 text-center text-white drop-shadow-[0_4px_18px_rgba(0,0,0,0.5)]"
                        style={{ color: '#ffffff' }}
                    >
                        Training Management System
                    </p>
                    <div className="mt-8 h-1 w-32 bg-primary/50 rounded-full" />
                </div>
            </div>

            {/* Right Column: Portal Selection */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 overflow-y-auto relative bg-background">
                <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />

                {/* Mobile Header */}
                <div className="flex md:hidden flex-col items-center mb-10 relative z-10 rounded-3xl bg-slate-950/55 px-8 py-6 backdrop-blur-sm">
                    <div className="mb-4">
                        <TmsLogo className="size-16" />
                    </div>
                    <h1
                        className="text-3xl font-bold text-white text-center tracking-tight drop-shadow-[0_6px_24px_rgba(0,0,0,0.65)]"
                        style={{ color: '#ffffff' }}
                    >
                        DMO TMS
                    </h1>
                    <p
                        className="text-sm text-white/80 mt-1 text-center font-medium drop-shadow-[0_4px_18px_rgba(0,0,0,0.5)]"
                        style={{ color: 'rgba(255,255,255,0.92)' }}
                    >
                        Training Management System
                    </p>
                </div>

                <div className="w-full max-w-lg space-y-8 relative z-10">
                    <motion.div
                        className="text-center md:text-left space-y-2"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                    >
                        <h3 className="text-2xl font-bold text-foreground tracking-tight">{t('portalSelection.title', 'Select Portal')}</h3>
                        <p className="text-muted-foreground text-sm">
                            {t('portalSelection.desc', 'Choose your role to access the training management portal.')}
                        </p>
                    </motion.div>

                    <div className="space-y-4">
                        {portals.map((portal, index) => (
                            <motion.button
                                key={portal.title}
                                type="button"
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                whileHover={activePortalPath ? undefined : { scale: 1.01, y: -2 }}
                                whileTap={activePortalPath ? undefined : { scale: 0.985 }}
                                onClick={() => handlePortalClick(portal.path)}
                                disabled={Boolean(activePortalPath)}
                                className="group relative block w-full text-left"
                            >
                                <motion.div
                                    initial={false}
                                    animate={activePortalPath === portal.path
                                        ? { opacity: [0, 0.55, 0], scale: [0.98, 1.015, 1.03] }
                                        : { opacity: 0, scale: 0.98 }}
                                    transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
                                    className="pointer-events-none absolute inset-0 rounded-2xl bg-primary/10 ring-1 ring-primary/30"
                                />
                                <Card
                                    className="border bg-card hover:bg-accent transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                                    style={{
                                        transform: activePortalPath === portal.path ? 'scale(0.97)' : 'scale(1)',
                                        opacity: activePortalPath && activePortalPath !== portal.path ? 0.7 : 1,
                                        transition: 'transform 220ms cubic-bezier(0.4, 0, 0.2, 1), opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                >
                                    <div className="flex items-center p-5">
                                        <div className={`p-4 rounded-xl ${portal.color} transition-colors`}>
                                            <portal.icon className="size-6" />
                                        </div>
                                        <div className="ml-5 flex-1 text-left">
                                            <h4 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                                                {portal.title}
                                            </h4>
                                            <p className="text-sm text-muted-foreground mt-0.5">
                                                {portal.description}
                                            </p>
                                        </div>
                                    </div>
                                </Card>
                            </motion.button>
                        ))}
                    </div>

                    <div className="pt-10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-muted-foreground">
                        <div className="text-center md:text-left">
                            &copy; {new Date().getFullYear()} DMO. {t('portalSelection.footerText', 'All rights reserved.')}
                        </div>
                        <div className="flex items-center gap-3 text-muted-foreground/30">
                            <Database className="size-3" />
                            <Cpu className="size-3" />
                            <Activity className="size-3" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortalSelection;
