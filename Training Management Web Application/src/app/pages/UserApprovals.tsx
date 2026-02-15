import React, { useState, useEffect } from 'react';
import { usersApi } from '../../services/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { UserCheck, UserX, Clock, Building2, Mail, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const UserApprovals: React.FC = () => {
    const { user: currentUser } = useAuth();
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Only master_admin can access this
    if (currentUser?.role !== 'master_admin') {
        return <Navigate to="/dashboard" replace />;
    }

    const fetchPendingUsers = async () => {
        try {
            setLoading(true);
            const data = await usersApi.getPending();
            setPendingUsers(data);
        } catch (error) {
            toast.error('Failed to fetch pending users');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPendingUsers();
    }, []);

    const handleApprove = async (userId: string) => {
        try {
            await usersApi.approve(userId);
            toast.success('User approved successfully');
            setPendingUsers(pendingUsers.filter(u => u.id !== userId));
        } catch (error) {
            toast.error('Failed to approve user');
        }
    };

    const handleReject = async (userId: string) => {
        if (!window.confirm('Are you sure you want to reject this registration? This will delete the request.')) return;
        try {
            await usersApi.reject(userId);
            toast.success('User rejected successfully');
            setPendingUsers(pendingUsers.filter(u => u.id !== userId));
        } catch (error) {
            toast.error('Failed to reject user');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tighter text-white flex items-center gap-3">
                        <UserCheck className="size-8 text-primary animate-pulse-glow" />
                        USER APPROVALS
                        <div className="h-1 w-20 bg-gradient-to-r from-primary to-transparent rounded-full ml-4 hidden md:block" />
                    </h1>
                    <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-widest opacity-70">Security Clearance & Personnel Verification</p>
                </div>
            </div>

            <Card className="glass-card overflow-hidden">
                <CardHeader className="pb-4 border-b border-primary/10 bg-primary/5">
                    <CardTitle className="text-sm font-bold text-primary tracking-[0.2em] flex items-center gap-2">
                        <Clock className="size-4" />
                        PENDING ACCESS REQUESTS
                    </CardTitle>
                    <CardDescription className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
                        {pendingUsers.length === 0
                            ? "NO ACTIVE REQUESTS IN BUFFER."
                            : `DETECTED ${pendingUsers.length} PENDING AUTHORIZATION REQUEST(S).`}
                    </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="relative size-12 mb-4">
                                <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
                                <div className="absolute inset-0 border-r-2 border-secondary rounded-full animate-spin [animation-duration:1.5s]" />
                            </div>
                            <p className="text-primary font-mono text-xs tracking-widest animate-pulse">SCANNING ENCRYPTED REQUESTS...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingUsers.map((user) => (
                                <div key={user.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/10 hover:border-primary/30 hover:bg-white/[0.07] transition-all group">
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                                <UserIcon className="size-5" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-bold text-lg text-white tracking-wide">{user.name}</span>
                                                <Badge variant="outline" className="w-fit text-[10px] font-mono tracking-widest uppercase border-primary/30 text-primary bg-primary/5 px-2">
                                                    {user.role}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-xs font-mono text-muted-foreground">
                                            <div className="flex items-center gap-2 group-hover:text-primary/70 transition-colors">
                                                <Mail className="size-3.5 text-primary/40" />
                                                <span className="truncate max-w-[200px]">{user.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 group-hover:text-primary/70 transition-colors">
                                                <Building2 className="size-3.5 text-primary/40" />
                                                {user.institution?.name || 'CENTRAL COMMAND'}
                                            </div>
                                            <div className="flex items-center gap-2 group-hover:text-primary/70 transition-colors">
                                                <Clock className="size-3.5 text-primary/40" />
                                                INITIATED: {new Date(user.createdAt).toLocaleDateString()}
                                            </div>
                                            {user.designation && (
                                                <div className="flex items-center gap-2 group-hover:text-primary/70 transition-colors">
                                                    <span className="text-primary/40 font-bold uppercase text-[9px]">RANK:</span>
                                                    {user.designation}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 mt-5 md:mt-0">
                                        <Button
                                            onClick={() => handleApprove(user.id)}
                                            className="bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 flex gap-2 items-center font-bold tracking-widest text-xs px-6 py-5 rounded-xl transition-all shadow-[0_0_15px_rgba(0,236,255,0.1)] hover:shadow-[0_0_20px_rgba(0,236,255,0.3)]"
                                        >
                                            <UserCheck className="size-4" />
                                            GRANT ACCESS
                                        </Button>
                                        <Button
                                            onClick={() => handleReject(user.id)}
                                            variant="ghost"
                                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex gap-2 items-center font-bold tracking-widest text-xs px-4 py-5 rounded-xl transition-all"
                                        >
                                            <UserX className="size-4" />
                                            REJECT
                                        </Button>
                                    </div>
                                </div>
                            ))}

                            {!loading && pendingUsers.length === 0 && (
                                <div className="text-center py-20 bg-primary/5 rounded-3xl border border-dashed border-primary/20">
                                    <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
                                        <UserCheck className="size-10 text-primary/40" />
                                    </div>
                                    <h3 className="text-xl font-bold text-white tracking-widest">CLEARANCE COMPLETE</h3>
                                    <p className="text-muted-foreground mt-2 font-mono text-xs uppercase tracking-widest">No unauthorized entities detected in the perimeter.</p>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default UserApprovals;
