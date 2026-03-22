import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Building2, Clock, Mail, ShieldCheck, User as UserIcon, UserCheck, UserX } from 'lucide-react';

import { usersApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const UserApprovals: React.FC = () => {
    const { user: currentUser } = useAuth();
    const { t } = useTranslation();
    const [pendingUsers, setPendingUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    if (currentUser?.role !== 'master_admin' && currentUser?.role !== 'medical_officer') {
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
            setPendingUsers((prev) => prev.filter((user) => user.id !== userId));
        } catch (error) {
            toast.error('Failed to approve user');
        }
    };

    const handleReject = async (userId: string) => {
        if (!window.confirm(t('userApprovals.confirmReject', 'Are you sure you want to reject this registration? This will delete the request.'))) {
            return;
        }

        try {
            await usersApi.reject(userId);
            toast.success('User rejected successfully');
            setPendingUsers((prev) => prev.filter((user) => user.id !== userId));
        } catch (error) {
            toast.error('Failed to reject user');
        }
    };

    return (
        <div className="pb-12 space-y-6 text-foreground">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <UserCheck className="size-8 sm:size-10 text-primary" />
                        {t('userApprovals.title', 'User Approvals')}
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        {t('userApprovals.subtitle', 'Review and manage participant registration requests.')}
                    </p>
                </div>
            </div>

            <Card className="border-border shadow-sm overflow-hidden">
                <CardHeader className="pb-5 border-b border-border bg-muted/20">
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                        <Clock className="size-4" />
                        {t('userApprovals.pendingRequestsTitle', 'Pending Requests')}
                    </CardTitle>
                    <CardDescription className="text-sm text-muted-foreground">
                        {pendingUsers.length === 0
                            ? t('userApprovals.noActiveRequests', 'There are no pending requests at the moment.')
                            : t('userApprovals.detectedRequests', {
                                count: pendingUsers.length,
                                defaultValue: '{{count}} registration request(s) are waiting for review.',
                            })}
                    </CardDescription>
                </CardHeader>

                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-primary/10">
                                <Clock className="size-5 text-primary animate-spin" />
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {t('userApprovals.scanning', 'Loading registration requests...')}
                            </p>
                        </div>
                    ) : pendingUsers.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-16 text-center">
                            <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                <UserCheck className="size-8" />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground">
                                {t('userApprovals.clearanceComplete', 'All caught up')}
                            </h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                {t('userApprovals.noEntities', 'There are no pending registration requests right now.')}
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {pendingUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/20 hover:bg-muted/20"
                                >
                                    <div className="flex flex-col gap-5">
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                                    <UserIcon className="size-5" />
                                                </div>
                                                <div className="space-y-1">
                                                    <span className="block text-lg font-semibold text-foreground">{user.name}</span>
                                                    <Badge variant="secondary" className="w-fit capitalize">
                                                        {String(user.role || '').replace('_', ' ')}
                                                    </Badge>
                                                </div>
                                            </div>

                                            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4 text-sm text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    <Mail className="size-4 text-primary/70" />
                                                    <span className="truncate">{user.email}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="size-4 text-primary/70" />
                                                    <span>{user.institution?.name || t('userApprovals.centralCommand', 'Not assigned')}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Clock className="size-4 text-primary/70" />
                                                    <span>{t('userApprovals.initiated', 'Requested on')} {new Date(user.createdAt).toLocaleDateString()}</span>
                                                </div>
                                                {user.designation && (
                                                    <div className="flex items-center gap-2">
                                                        <ShieldCheck className="size-4 text-primary/70" />
                                                        <span>{t('userApprovals.rank', 'Operational Rank')}: {user.designation}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex flex-col sm:flex-row gap-3">
                                            <Button onClick={() => handleApprove(user.id)} className="sm:w-auto">
                                                <UserCheck className="size-4 mr-2" />
                                                {t('userApprovals.grantAccess', 'Approve Request')}
                                            </Button>
                                            <Button onClick={() => handleReject(user.id)} variant="outline" className="sm:w-auto">
                                                <UserX className="size-4 mr-2" />
                                                {t('userApprovals.reject', 'Reject')}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default UserApprovals;
