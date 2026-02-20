import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ShieldCheck, UserCog, Users, Database, Cpu, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

const PortalSelection: React.FC = () => {
    const navigate = useNavigate();

    const portals = [
        {
            title: 'ADMIN COMMAND',
            description: 'Strategic oversight for DMO & Central Operations',
            icon: ShieldCheck,
            color: 'text-primary bg-primary/10',
            glow: 'shadow-[0_0_20px_rgba(0,236,255,0.2)]',
            path: '/login/admin',
        },
        {
            title: 'PROGRAM OFFICER',
            description: 'Tactical management of training missions',
            icon: UserCog,
            color: 'text-secondary bg-secondary/10',
            glow: 'shadow-[0_0_20px_rgba(110,64,201,0.2)]',
            path: '/login/officer',
        },
        {
            title: 'FIELD PERSONNEL',
            description: 'Standard medical staff & practitioner access',
            icon: Users,
            color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10',
            glow: 'shadow-[0_0_20px_rgba(52,211,153,0.2)]',
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
                <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px]" />
                <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
                    <div className="bg-primary/20 backdrop-blur-md p-8 rounded-3xl mb-8 border border-primary/30 shadow-[0_0_30px_rgba(0,236,255,0.2)] animate-pulse-glow">
                        <Building2 className="size-20 text-white" />
                    </div>
                    <h1 className="text-6xl font-black tracking-tighter text-center uppercase drop-shadow-lg">
                        DMO <span className="text-primary">CORE</span>
                    </h1>
                    <p className="text-xl font-mono mt-4 tracking-[0.3em] uppercase opacity-90 drop-shadow-md">Training Protocol System</p>
                    <div className="mt-8 h-1 w-32 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
                </div>
            </div>

            {/* Right Column: Portal Selection */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 overflow-y-auto relative bg-background">
                <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />

                {/* Mobile Header */}
                <div className="flex md:hidden flex-col items-center mb-12 relative z-10">
                    <div className="bg-primary/10 text-primary p-5 rounded-2xl mb-6 border border-primary/20 shadow-lg">
                        <Building2 className="size-12" />
                    </div>
                    <h1 className="text-4xl font-black text-foreground text-center tracking-tighter uppercase">DMO CORE</h1>
                    <p className="text-sm font-mono text-primary/70 mt-2 text-center tracking-[0.2em] uppercase">Tactical Entry Point</p>
                </div>

                <div className="w-full max-w-lg space-y-10 relative z-10">
                    <div className="text-center md:text-left">
                        <h2 className="text-xs font-bold tracking-[0.4em] text-primary/60 uppercase mb-3">System Access</h2>
                        <h3 className="text-3xl font-black text-foreground tracking-tight uppercase">Enter Authorized Portal</h3>
                        <p className="text-muted-foreground mt-4 font-mono text-xs uppercase tracking-wider leading-relaxed opacity-70">
                            DEPLOYING DEEP AUTHENTICATION PROTOCOLS. CHOOSE YOUR COMMAND SECTOR TO INITIATE MISSION UPLINK.
                        </p>
                    </div>

                    <div className="space-y-6">
                        {portals.map((portal) => (
                            <Card
                                key={portal.title}
                                className="glass-card group hover:border-primary/50 transition-all cursor-pointer overflow-hidden border-border hover:translate-x-2 bg-card/40"
                                onClick={() => navigate(portal.path)}
                            >
                                <div className="flex items-center p-6 bg-gradient-to-r from-transparent to-primary/[0.02]">
                                    <div className={`p-5 rounded-2xl ${portal.color} border border-current opacity-80 group-hover:opacity-100 transition-all ${portal.glow}`}>
                                        <portal.icon className="size-8" />
                                    </div>
                                    <div className="ml-6 flex-1 text-left">
                                        <h4 className="text-lg font-black text-foreground group-hover:text-primary transition-colors tracking-widest uppercase">
                                            {portal.title}
                                        </h4>
                                        <p className="text-[10px] text-muted-foreground font-mono mt-1 uppercase tracking-wider opacity-60">
                                            {portal.description}
                                        </p>
                                    </div>
                                    <div className="opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-primary">
                                        <ShieldCheck className="size-6 shadow-[0_0_10px_rgba(0,236,255,0.5)]" />
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <div className="pt-12 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
                        <div className="text-center md:text-left font-mono text-[9px] text-muted-foreground/50 uppercase tracking-[0.2em]">
                            &copy; TACTICAL MISSION CONTROL — {new Date().getFullYear()}<br />
                            <span className="opacity-50">ENSURING EXCELLENCE IN FIELD OPERATIONS</span>
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
