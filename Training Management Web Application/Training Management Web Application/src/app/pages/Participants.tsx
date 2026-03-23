import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { useNavigate } from 'react-router-dom';
import { usersApi, BASE_URL } from '../../services/api';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

import { Trash2, AlertTriangle, Users, Search, Briefcase, Building2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import LoadingScreen from '../components/LoadingScreen';

const Participants: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [participants, setParticipants] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchParticipants = async () => {
        try {
            setLoading(true);
            const data = await usersApi.getAll({ role: 'participant' });
            setParticipants(Array.isArray(data) ? data : []);
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

    const filteredParticipants = participants.filter((user) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const institutionName = user.institution?.name?.toLowerCase() || '';

        return (
            (user.name && user.name.toLowerCase().includes(term)) ||
            (user.email && user.email.toLowerCase().includes(term)) ||
            (user.phone && user.phone.includes(term)) ||
            (user.designation && user.designation.toLowerCase().includes(term)) ||
            institutionName.includes(term)
        );
    });

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(t('personnel.alerts.removeParticipantConfirm', { name, defaultValue: `Are you sure you want to remove participant "${name}"? All associated training data for this user will remain in history but they will lose access.` }))) {
            return;
        }

        try {
            await usersApi.delete(id);
            toast.success(t('personnel.alerts.removeSuccess', 'Participant removed successfully'));
            fetchParticipants(); // Refresh list
        } catch (error: any) {
            console.error('Failed to delete participant', error);
            toast.error(error.response?.data?.message || t('personnel.alerts.removeFail', 'Failed to remove participant'));
        }
    };

    return (
        <div className="space-y-6 text-foreground">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-4 gap-4">
                <div className="flex items-center gap-3">
                    <h2 className="text-xl font-bold tracking-tight">{t('personnel.participants.title', 'Participants')}</h2>
                    <span className="text-sm text-muted-foreground bg-secondary/30 px-3 py-1 rounded-full">{t('personnel.participants.active', { count: participants.length, defaultValue: `${participants.length} active` })}</span>
                </div>
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder={t('personnel.participants.search', 'Search by name, email, rank, or institution...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-background/50"
                    />
                </div>
            </div>

            {loading ? (
                <LoadingScreen />
            ) : error ? (
                <div className="p-6 text-destructive bg-destructive/5 rounded-xl border border-destructive/20 flex items-start gap-4">
                    <AlertTriangle className="size-6 shrink-0" />
                    <div>
                        <h3 className="font-bold text-lg leading-none mb-1">{t('personnel.participants.networkError', 'Network Error')}</h3>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                </div>
            ) : participants.length === 0 ? (
                <div className="text-center py-20 bg-secondary/5 rounded-2xl border border-dashed border-border/50">
                    <div className="bg-secondary/20 size-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="size-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{t('personnel.participants.noParticipants', 'No Participants Found')}</h3>
                    <p className="text-muted-foreground mt-2 text-sm">{t('personnel.participants.noParticipantsDesc', 'There are no participants registered in the system yet.')}</p>
                </div>
            ) : (
                <div className="flex flex-col">
                    <div className="hidden md:flex items-center px-4 py-2 text-sm text-muted-foreground border-b border-border/50 uppercase tracking-wider font-medium">
                        <div className="w-8 mr-4 text-center">#</div>
                        <div className="flex-1 min-w-0 pr-4">{t('personnel.participants.table.details', 'Participant Details')}</div>
                        <div className="w-64 shrink-0 px-4">{t('personnel.participants.table.contact', 'Contact Info')}</div>
                        <div className="w-64 shrink-0 px-4">{t('personnel.participants.table.operationalRank', 'Operational Rank')}</div>
                        <div className="w-72 shrink-0 px-4">{t('personnel.participants.table.institution', 'Institution')}</div>
                        <div className="w-20 shrink-0 text-right"></div>
                    </div>

                    {filteredParticipants
                        .map((user, index) => (
                            <div
                                key={user.id}
                                onClick={() => navigate(`/user/${user.id}`)}
                                className="group relative flex flex-col sm:flex-row sm:items-center py-3 px-2 sm:px-4 hover:bg-white/5 rounded-lg transition-colors border-b border-border/30 cursor-pointer"
                            >
                                <div className="flex items-center flex-1 min-w-0">
                                    <div className="text-muted-foreground w-8 mr-4 text-center text-sm font-medium hidden md:block">
                                        {index + 1}
                                    </div>

                                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-secondary/50 shrink-0 mr-4">
                                        {user.profilePicture && (
                                            <AvatarImage src={user.profilePicture.startsWith('http') ? user.profilePicture : `${BASE_URL}${user.profilePicture}`} alt={user.name} />
                                        )}
                                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-bold">
                                            {user.name && user.name.length > 0 ? user.name.charAt(0) : '?'}
                                        </AvatarFallback>
                                    </Avatar>

                                    <div className="flex-1 min-w-0 pr-4">
                                        <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                                            {user.name || t('personnel.officers.misc.unknown', 'Unknown')}
                                        </h3>

                                        <p className="text-sm text-muted-foreground truncate opacity-0 group-hover:opacity-100 hidden sm:block transition-opacity">
                                            {t('personnel.officers.misc.id', 'ID:')} {(user.id || 'N/A')}
                                        </p>

                                        {/* Mobile Dense Contact Info */}
                                        <div className="flex flex-col mt-1 sm:hidden">
                                            <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                                            <span className="text-[11px] text-muted-foreground truncate opacity-80">{user.phone || t('personnel.officers.misc.noPhone', 'No phone')}</span>
                                            <div className="mt-2 flex flex-wrap gap-1.5">
                                                <span className="text-[10px] text-muted-foreground truncate bg-secondary/50 px-2 py-1 rounded-md inline-flex w-fit items-center gap-1.5">
                                                    <Briefcase className="size-3" />
                                                    {user.designation || t('personnel.participants.misc.noOperationalRank', 'No rank assigned')}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground truncate bg-secondary/50 px-2 py-1 rounded-md inline-flex w-fit items-center gap-1.5">
                                                    <Building2 className="size-3" />
                                                    {user.institution?.name || t('personnel.participants.misc.noInstitution', 'No institution assigned')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="hidden md:flex flex-col justify-center px-4 w-64 shrink-0">
                                    <span className="text-sm font-medium text-foreground/90 truncate">{user.email}</span>
                                    <span className="text-xs text-muted-foreground truncate">{user.phone || t('personnel.officers.misc.noPhoneNumber', 'No phone number')}</span>
                                </div>

                                <div className="hidden md:flex px-4 w-64 shrink-0">
                                    <div className="flex w-full items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.04] px-3 py-2.5">
                                        <div className="rounded-xl bg-white/5 p-2 text-muted-foreground">
                                            <Briefcase className="size-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                                                {t('personnel.participants.table.operationalRank', 'Operational Rank')}
                                            </p>
                                            <p className="truncate text-sm font-semibold text-foreground">
                                                {user.designation || t('personnel.participants.misc.noOperationalRank', 'No rank assigned')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="hidden lg:flex px-4 w-72 shrink-0">
                                    <div className="flex w-full items-start gap-3 rounded-2xl border border-white/5 bg-white/[0.04] px-3 py-2.5">
                                        <div className="rounded-xl bg-white/5 p-2 text-muted-foreground">
                                            <Building2 className="size-4" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                                                {t('personnel.participants.table.institution', 'Institution')}
                                            </p>
                                            <p className="truncate text-sm font-semibold text-foreground">
                                                {user.institution?.name || t('personnel.participants.misc.noInstitution', 'No institution assigned')}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-end w-20 shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity absolute right-4 top-4 sm:static sm:right-auto sm:top-auto">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDelete(user.id, user.name);
                                        }}
                                        className="text-muted-foreground hover:text-white hover:bg-destructive rounded-full size-8 sm:size-10 z-10"
                                        title="Remove Participant"
                                    >
                                        <Trash2 className="size-4" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
};

export default Participants;
