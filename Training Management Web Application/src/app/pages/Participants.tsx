import React, { useState, useEffect } from 'react';
import { User } from '../../types';
import { usersApi, BASE_URL } from '../../services/api';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';

import { Trash2, AlertTriangle, Users, MapPin } from 'lucide-react';
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
        <div className="space-y-6 text-foreground">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold tracking-tight">Participants</h2>
                <span className="text-sm text-muted-foreground bg-secondary/30 px-3 py-1 rounded-full">{participants.length} active</span>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <div className="text-lg text-primary animate-pulse font-medium">Loading participants...</div>
                </div>
            ) : error ? (
                <div className="p-6 text-destructive bg-destructive/5 rounded-xl border border-destructive/20 flex items-start gap-4">
                    <AlertTriangle className="size-6 shrink-0" />
                    <div>
                        <h3 className="font-bold text-lg leading-none mb-1">Network Error</h3>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                </div>
            ) : participants.length === 0 ? (
                <div className="text-center py-20 bg-secondary/5 rounded-2xl border border-dashed border-border/50">
                    <div className="bg-secondary/20 size-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="size-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">No Participants Found</h3>
                    <p className="text-muted-foreground mt-2 text-sm">There are no participants registered in the system yet.</p>
                </div>
            ) : (
                <div className="flex flex-col">
                    <div className="hidden md:flex items-center px-4 py-2 text-sm text-muted-foreground border-b border-border/50 uppercase tracking-wider font-medium">
                        <div className="w-8 mr-4 text-center">#</div>
                        <div className="flex-1 min-w-0 pr-4">Participant Details</div>
                        <div className="w-64 shrink-0 px-4">Contact Info</div>
                        <div className="w-40 shrink-0 px-4">Department</div>
                        <div className="w-32 shrink-0 px-4">Status</div>
                        <div className="w-20 shrink-0 text-right"></div>
                    </div>

                    {participants.map((user, index) => (
                        <div
                            key={user.id}
                            className="group relative flex flex-col sm:flex-row sm:items-center py-3 px-2 sm:px-4 hover:bg-white/5 rounded-lg transition-colors border-b border-border/30"
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
                                    <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors flex items-center gap-2">
                                        {user.name || 'Unknown'}
                                        <span className={`sm:hidden text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${user.isApproved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                            {user.isApproved ? 'Active' : 'Pending'}
                                        </span>
                                    </h3>

                                    <p className="text-sm text-muted-foreground truncate opacity-0 group-hover:opacity-100 hidden sm:block transition-opacity">
                                        ID: {(user.id || 'N/A')}
                                    </p>

                                    {/* Mobile Dense Contact Info */}
                                    <div className="flex flex-col mt-1 sm:hidden">
                                        <span className="text-xs text-muted-foreground truncate">{user.email}</span>
                                        <span className="text-[11px] text-muted-foreground truncate opacity-80">{user.phone || 'No phone'}</span>
                                        <span className="text-[10px] text-muted-foreground truncate bg-secondary/50 px-1.5 py-0.5 rounded-sm inline-flex w-fit items-center gap-1 mt-1.5">
                                            <MapPin className="size-2.5" />
                                            {user.department || 'General'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="hidden md:flex flex-col justify-center px-4 w-64 shrink-0">
                                <span className="text-sm font-medium text-foreground/90 truncate">{user.email}</span>
                                <span className="text-xs text-muted-foreground truncate">{user.phone || 'No phone number'}</span>
                            </div>

                            <div className="hidden md:flex items-center px-4 w-40 shrink-0">
                                <span className="text-xs text-muted-foreground truncate bg-secondary/30 px-2 py-1 rounded-sm flex items-center gap-1">
                                    <MapPin className="size-3" />
                                    {user.department || 'General'}
                                </span>
                            </div>

                            <div className="hidden lg:flex items-center w-32 shrink-0 px-4">
                                <span className={`text-xs font-medium uppercase tracking-wider ${user.isApproved ? 'text-emerald-500' : 'text-orange-400'}`}>
                                    {user.isApproved ? 'Active' : 'Pending'}
                                </span>
                            </div>

                            <div className="flex items-center justify-end w-20 shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity absolute right-4 top-4 sm:static sm:right-auto sm:top-auto">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(user.id, user.name)}
                                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full size-8 sm:size-10"
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
