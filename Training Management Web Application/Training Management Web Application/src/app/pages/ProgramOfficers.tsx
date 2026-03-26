import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { useNavigate } from 'react-router-dom';
import { usersApi, BASE_URL } from '../../services/api';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

import { Trash2, AlertTriangle, Users, MapPin, Search } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import LoadingScreen from '../components/LoadingScreen';

const ProgramOfficers: React.FC = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const [officers, setOfficers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const fetchOfficers = async () => {
        try {
            setLoading(true);
            // Fetch all approved users to split by role client-side
            const data = await usersApi.getAll();
            setOfficers(data);
            setError(null);
        } catch (error: any) {
            console.error('Failed to fetch officers', error);
            setError(error.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOfficers();
    }, []);

    const filteredOfficers = officers.filter(officer => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return (
            (officer.name && officer.name.toLowerCase().includes(term)) ||
            (officer.email && officer.email.toLowerCase().includes(term)) ||
            (officer.department && officer.department.toLowerCase().includes(term)) ||
            (officer.phone && officer.phone.includes(term))
        );
    });

    const programOfficers = filteredOfficers.filter(o => o.role === 'program_officer');
    const medicalOfficers = filteredOfficers.filter(o => o.role === 'medical_officer');

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(t('personnel.alerts.removeOfficerConfirm', { name, defaultValue: `Are you sure you want to remove this officer "${name}"?` }))) {
            return;
        }

        try {
            await usersApi.delete(id);
            toast.success(t('personnel.alerts.removeSuccess', 'Officer removed successfully'));
            fetchOfficers(); // Refresh list
        } catch (error: any) {
            console.error('Failed to delete user', error);
            toast.error(error.response?.data?.message || t('personnel.alerts.removeFail', 'Failed to remove user'));
        }
    };

    const OfficerTable = ({ list, title, emptyMessage }: { list: User[], title: string, emptyMessage: string }) => (
        <div className="space-y-4">
            <div className="flex items-center gap-3 px-1">
                <h3 className="text-lg font-bold text-foreground/90">{title}</h3>
                <span className="text-xs font-medium text-muted-foreground bg-secondary/20 px-2 py-0.5 rounded-full">{list.length}</span>
            </div>
            
            {list.length === 0 ? (
                <div className="text-center py-10 bg-secondary/5 rounded-xl border border-dashed border-border/30">
                    <p className="text-muted-foreground text-sm">{emptyMessage}</p>
                </div>
            ) : (
                <div className="flex flex-col">
                    <div className="hidden md:flex items-center px-4 py-2 text-[10px] text-muted-foreground border-b border-border/30 uppercase tracking-widest font-bold">
                        <div className="w-8 mr-4 text-center">#</div>
                        <div className="flex-1 min-w-0 pr-4">{t('personnel.officers.table.details', 'Officer Details')}</div>
                        <div className="w-64 shrink-0 px-4">{t('personnel.officers.table.contact', 'Contact Info')}</div>
                        <div className="w-40 shrink-0 px-4">{t('personnel.officers.table.department', 'Department')}</div>
                        <div className="w-32 shrink-0 px-4">{t('personnel.officers.table.status', 'Status')}</div>
                        <div className="w-20 shrink-0 text-right"></div>
                    </div>

                    {list.map((officer, index) => (
                        <div
                            key={officer.id}
                            onClick={() => navigate(`/user/${officer.id}`)}
                            className="group relative flex flex-col sm:flex-row sm:items-center py-3 px-2 sm:px-4 hover:bg-white/5 rounded-lg transition-colors border-b border-border/10 cursor-pointer"
                        >
                            <div className="flex items-center flex-1 min-w-0">
                                <div className="text-muted-foreground w-8 mr-4 text-center text-sm font-medium hidden md:block">
                                    {index + 1}
                                </div>

                                <Avatar className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg bg-secondary/50 shrink-0 mr-4">
                                    {officer.profilePicture && (
                                        <AvatarImage src={officer.profilePicture.startsWith('http') ? officer.profilePicture : `${BASE_URL}${officer.profilePicture}`} alt={officer.name} />
                                    )}
                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-bold">
                                        {officer.name.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>

                                <div className="flex-1 min-w-0 pr-4">
                                    <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors flex items-center gap-2">
                                        {officer.name}
                                        <span className={`sm:hidden text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${officer.isApproved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                            {officer.isApproved ? t('personnel.officers.status.verified', 'Verified') : t('personnel.officers.status.pending', 'Pending')}
                                        </span>
                                    </h3>
                                    
                                    {/* Mobile Dense Contact Info */}
                                    <div className="flex flex-col mt-1 sm:hidden">
                                        <span className="text-xs text-muted-foreground truncate">{officer.email}</span>
                                        <span className="text-[11px] text-muted-foreground truncate opacity-80">{officer.phone || t('personnel.officers.misc.noPhone', 'No phone')}</span>
                                        <span className="text-[10px] text-muted-foreground truncate bg-secondary/50 px-1.5 py-0.5 rounded-sm inline-flex w-fit items-center gap-1 mt-1.5">
                                            <MapPin className="size-2.5" />
                                            {officer.department || t('personnel.officers.misc.general', 'General')}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden md:flex flex-col justify-center px-4 w-64 shrink-0">
                                <span className="text-sm font-medium text-foreground/90 truncate">{officer.email}</span>
                                <span className="text-xs text-muted-foreground truncate">{officer.phone || t('personnel.officers.misc.noPhoneNumber', 'No phone number')}</span>
                            </div>

                            <div className="hidden md:flex items-center px-4 w-40 shrink-0">
                                <span className="text-xs text-muted-foreground truncate bg-secondary/10 px-2 py-1 rounded-sm flex items-center gap-1 border border-border/10">
                                    <MapPin className="size-3" />
                                    {officer.department || t('personnel.officers.misc.general', 'General')}
                                </span>
                            </div>

                            <div className="hidden lg:flex items-center w-32 shrink-0 px-4">
                                <span className={`text-[10px] font-bold uppercase tracking-tighter ${officer.isApproved ? 'text-emerald-500' : 'text-orange-400'}`}>
                                    {officer.isApproved ? t('personnel.officers.status.verified', 'Verified') : t('personnel.officers.status.pending', 'Pending')}
                                </span>
                            </div>

                            <div className="flex items-center justify-end w-20 shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity absolute right-4 top-4 sm:static sm:right-auto sm:top-auto">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDelete(officer.id, officer.name);
                                    }}
                                    className="text-muted-foreground hover:text-white hover:bg-destructive rounded-full size-8 sm:size-10 z-10"
                                    title={t('personnel.officers.removeOfficer', 'Remove Officer')}
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

    return (
        <div className="space-y-10 text-foreground pb-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">{t('personnel.officers.mainTitle', 'Personnel Directory')}</h2>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <Users className="size-4" />
                        {t('personnel.officers.subtitle', 'Manage all organizational officers')}
                    </p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <Input
                        placeholder={t('personnel.officers.search', 'Search names, emails, departments...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-background/50 border-border/50 focus:border-primary/50 transition-colors"
                    />
                </div>
            </div>

            {loading ? (
                <LoadingScreen />
            ) : error ? (
                <div className="p-6 text-destructive bg-destructive/5 rounded-xl border border-destructive/20 flex items-start gap-4">
                    <AlertTriangle className="size-6 shrink-0" />
                    <div>
                        <h3 className="font-bold text-lg leading-none mb-1">{t('personnel.officers.networkError', 'Network Error')}</h3>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                </div>
            ) : (
                <div className="space-y-12">
                    <OfficerTable 
                        title={t('personnel.officers.programTitle', 'Program Officers')} 
                        list={programOfficers} 
                        emptyMessage={t('personnel.officers.noProgramOfficers', 'No Program Officers found.')}
                    />
                    
                    <OfficerTable 
                        title={t('personnel.officers.medicalTitle', 'Medical Officers')} 
                        list={medicalOfficers} 
                        emptyMessage={t('personnel.officers.noMedicalOfficers', 'No Medical Officers found.')}
                    />
                </div>
            )}
        </div>
    );
};

export default ProgramOfficers;
