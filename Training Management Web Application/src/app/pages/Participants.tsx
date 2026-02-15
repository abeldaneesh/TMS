
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { User } from '../../types';
import { usersApi } from '../../services/api';

import { Trash2, AlertTriangle, ShieldCheck, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';

const Participants: React.FC = () => {
    const [participants, setParticipants] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchParticipants = async () => {
        try {
            setLoading(true);
            const data = await usersApi.getAll({ role: 'participant' });
            setParticipants(data);
            setError(null);
        } catch (error: any) {
            console.error('Failed to fetch participants', error);
            setError(error.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParticipants();
    }, []);

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to remove participant "${name}"? All associated training data for this user will remain in history but they will lose access.`)) {
            return;
        }

        try {
            await usersApi.delete(id);
            toast.success('Participant removed successfully');
            fetchParticipants(); // Refresh list
        } catch (error: any) {
            console.error('Failed to delete participant', error);
            toast.error(error.response?.data?.message || 'Failed to remove participant');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tighter text-foreground flex items-center gap-3">
                        <Users className="size-8 text-primary animate-pulse-glow" />
                        PARTICIPANTS
                        <div className="h-1 w-20 bg-gradient-to-r from-primary to-transparent rounded-full ml-4 hidden md:block" />
                    </h1>
                    <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-widest opacity-70">Healthcare Personnel Registry & Telemetry</p>
                </div>
            </div>

            <Card className="glass-card overflow-hidden">
                <CardHeader className="pb-4 border-b border-primary/10 bg-primary/5">
                    <CardTitle className="text-sm font-bold text-primary tracking-[0.2em] flex items-center gap-2">
                        <ShieldCheck className="size-4" />
                        VERIFIED MISSION PERSONNEL
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="relative size-12 mb-4">
                                <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
                                <div className="absolute inset-0 border-r-2 border-secondary rounded-full animate-spin [animation-duration:1.5s]" />
                            </div>
                            <p className="text-primary font-mono text-xs tracking-widest animate-pulse">ACCESSING ENCRYPTED REGISTRY...</p>
                        </div>
                    ) : error ? (
                        <div className="p-6 text-destructive bg-destructive/5 rounded-2xl border border-destructive/20 flex items-start gap-4">
                            <AlertTriangle className="size-6 shrink-0" />
                            <div>
                                <h3 className="font-bold text-lg leading-none mb-1">SYSTEM LINK FAILURE</h3>
                                <p className="text-sm opacity-90 font-mono">{error}</p>
                            </div>
                        </div>
                    ) : participants.length === 0 ? (
                        <div className="text-center py-20 bg-primary/5 rounded-3xl border border-dashed border-primary/20">
                            <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 border border-primary/20">
                                <Users className="size-8 text-primary/40" />
                            </div>
                            <h3 className="text-xl font-bold text-foreground">NO PERSONNEL DETECTED</h3>
                            <p className="text-muted-foreground mt-2 font-mono text-xs uppercase tracking-widest">Awaiting recruitment and approval protocols.</p>
                        </div>
                    ) : (
                        <Table className="neon-table">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-primary/10">
                                    <TableHead>PERSONNEL</TableHead>
                                    <TableHead>COMM-LINK / INFO</TableHead>
                                    <TableHead>DEPARTMENT</TableHead>
                                    <TableHead>CLEARANCE</TableHead>
                                    <TableHead className="text-right">ACTIONS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {participants.map((user) => (
                                    <TableRow key={user.id} className="group border-primary/5">
                                        <TableCell className="py-4">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center text-primary font-bold mr-4 border border-primary/30 shadow-[0_0_15px_rgba(0,236,255,0.1)]">
                                                    {user.name.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-foreground tracking-wide">{user.name}</span>
                                                    <span className="text-[10px] text-primary/40 font-mono uppercase tracking-tighter">UID: {user.id.substring(0, 12)}...</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex flex-col">
                                                <span className="text-muted-foreground font-medium text-sm">{user.email}</span>
                                                <span className="text-muted-foreground text-xs font-mono">{user.phone || 'NO LINK DETECTED'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge variant="outline" className="text-secondary border-secondary/30 bg-secondary/5 font-mono text-[10px] tracking-widest uppercase px-2">
                                                {user.department || 'GENERAL'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex items-center">
                                                {user.isApproved ? (
                                                    <Badge className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 font-mono text-[10px] tracking-widest uppercase flex items-center">
                                                        <div className="size-1.5 rounded-full bg-emerald-400 mr-2 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
                                                        ACTIVE
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="secondary" className="bg-orange-500/10 text-orange-400 border border-orange-500/30 px-3 py-1 font-mono text-[10px] tracking-widest uppercase">
                                                        PENDING
                                                    </Badge>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                onClick={() => handleDelete(user.id, user.name)}
                                            >
                                                <Trash2 className="size-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default Participants;
