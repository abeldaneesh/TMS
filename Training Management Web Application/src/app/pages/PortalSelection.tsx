import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Building2, ShieldCheck, UserCog, Users, Database, Cpu, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { motion } from 'framer-motion';

const PortalSelection: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();

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
            color: 'text-secondary bg-secondary/10',
            path: '/login/officer',
        },
        {
            title: t('portalSelection.participantTitle', 'Participant'),
            description: t('portalSelection.participantDesc', 'Access your training records'),
            icon: Users,
            color: 'text-emerald-600 bg-emerald-500/10',
            path: '/login/participant',
        },
    ];

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
                    <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl mb-8 border border-white/20 shadow-2xl">
                        <Building2 className="size-20 text-white" />
                    </div>
                    <h1 className="text-4xl font-semibold tracking-tight text-center text-white">
                        DMO TMS
                    </h1>
                    <p className="text-xl mt-4 font-medium opacity-90 text-center">Training Management System</p>
                    <div className="mt-8 h-1 w-32 bg-primary/50 rounded-full" />
                </div>
            </div>

            {/* Right Column: Portal Selection */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 overflow-y-auto relative bg-background">
                <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />

                {/* Mobile Header */}
                <div className="flex md:hidden flex-col items-center mb-10 relative z-10">
                    <div className="bg-primary/10 text-primary p-5 rounded-2xl mb-4 border border-primary/20 shadow-sm">
                        <Building2 className="size-10" />
                    </div>
                    <h1 className="text-3xl font-bold text-foreground text-center tracking-tight">DMO TMS</h1>
                    <p className="text-sm text-muted-foreground mt-1 text-center font-medium">Training Management System</p>
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
                            <motion.div
                                key={portal.title}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: index * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                            >
                                <Card
                                    className="border bg-card hover:bg-accent transition-all cursor-pointer overflow-hidden shadow-sm hover:shadow-md"
                                    onClick={() => navigate(portal.path)}
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
                            </motion.div>
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
