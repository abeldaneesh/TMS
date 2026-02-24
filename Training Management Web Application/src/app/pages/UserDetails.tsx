import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { User, Nomination, Attendance } from '../../types';
import { usersApi, nominationsApi, attendanceApi, BASE_URL } from '../../services/api';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, Mail, Phone, MapPin, Shield, Calendar, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import LoadingScreen from '../components/LoadingScreen';
import { format } from 'date-fns';

const UserDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const [user, setUser] = useState<User | null>(null);
    const [nominations, setNominations] = useState<Nomination[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserData = async () => {
            if (!id) return;

            try {
                setLoading(true);
                // Fetch basic user profile
                const userData = await usersApi.getById(id);
                setUser(userData);

                // If participant, fetch their training history
                if (userData.role === 'participant') {
                    const [nomsData, attData] = await Promise.all([
                        nominationsApi.getAll({ participantId: id }),
                        attendanceApi.getAll({ participantId: id })
                    ]);

                    // Filter out records where the training has been deleted
                    const validNoms = Array.isArray(nomsData) ? nomsData.filter(nom => nom.trainingId && typeof nom.trainingId === 'object' && 'title' in nom.trainingId) : [];
                    const validAtt = Array.isArray(attData) ? attData.filter(att => att.trainingId && typeof att.trainingId === 'object' && 'title' in att.trainingId) : [];

                    setNominations(validNoms);
                    setAttendance(validAtt);
                }

                setError(null);
            } catch (err: any) {
                console.error('Failed to fetch user details:', err);
                setError(err.message || 'Failed to fetch user data');
            } finally {
                setLoading(false);
            }
        };

        fetchUserData();
    }, [id]);

    if (loading) return <LoadingScreen />;

    if (error || !user) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-background h-screen">
                <div className="bg-destructive/10 text-destructive p-4 rounded-full mb-4">
                    <XCircle className="size-12" />
                </div>
                <h2 className="text-2xl font-bold mb-2">User Not Found</h2>
                <p className="text-muted-foreground mb-6">{error || 'The requested user could not be found.'}</p>
                <Button onClick={() => navigate(-1)} variant="outline">
                    <ArrowLeft className="mr-2 size-4" /> Go Back
                </Button>
            </div>
        );
    }

    const getRoleBadgeColor = (role: string) => {
        switch (role) {
            case 'master_admin':
            case 'institutional_admin': return 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800';
            case 'program_officer': return 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800';
            case 'participant': return 'bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800';
            default: return 'bg-secondary/20 text-foreground border-border';
        }
    };

    const formatRoleName = (role: string) => {
        return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto pb-10">
            {/* Header / Back Action */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(-1)}
                    className="text-muted-foreground hover:text-foreground -ml-2"
                >
                    <ArrowLeft className="size-4 mr-2" />
                    Back to List
                </Button>
            </div>

            {/* Profile Overview Card */}
            <Card className="overflow-hidden border-border/50 shadow-sm">
                <div className="h-32 bg-gradient-to-r from-primary/20 via-primary/10 to-transparent w-full"></div>
                <CardContent className="p-6 pt-0 relative sm:px-10">
                    <div className="flex flex-col sm:flex-row gap-6 items-start sm:items-end -mt-12 sm:-mt-16 mb-4">
                        <Avatar className="size-24 sm:size-32 border-4 border-background shadow-lg bg-secondary">
                            {user.profilePicture && (
                                <AvatarImage src={user.profilePicture.startsWith('http') ? user.profilePicture : `${BASE_URL}${user.profilePicture}`} alt={user.name} />
                            )}
                            <AvatarFallback className="text-4xl bg-gradient-to-br from-primary/20 to-secondary/20 text-primary font-bold">
                                {user.name ? user.name.charAt(0).toUpperCase() : '?'}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-1 mb-2">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
                                {user.name}
                                {user.isApproved && (
                                    <span title="Verified User">
                                        <CheckCircle2 className="size-6 text-emerald-500" />
                                    </span>
                                )}
                            </h1>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                    <Shield className="size-3.5" /> ID: <span className="font-mono text-xs">{user.id}</span>
                                </span>
                            </div>
                        </div>

                        <div className="mb-2 w-full sm:w-auto flex flex-col items-start sm:items-end gap-2">
                            <span className={`px-3 py-1 rounded-full border text-xs font-medium uppercase tracking-wider ${getRoleBadgeColor(user.role)}`}>
                                {formatRoleName(user.role)}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${user.isApproved ? 'bg-emerald-500/10 text-emerald-500' : 'bg-orange-500/10 text-orange-500'}`}>
                                {user.isApproved ? 'Active Account' : 'Pending Approval'}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-6 border-t border-border/50 mt-6">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-secondary/30 rounded-lg shrink-0">
                                <Mail className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Email Address</p>
                                <p className="text-sm font-medium">{user.email}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-secondary/30 rounded-lg shrink-0">
                                <Phone className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Phone Number</p>
                                <p className="text-sm font-medium">{user.phone || 'Not provided'}</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-secondary/30 rounded-lg shrink-0">
                                <MapPin className="size-5 text-muted-foreground" />
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Department / Location</p>
                                <p className="text-sm font-medium">{user.department || 'General'}</p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Participant Specific Data (Nominations & Attendance History) */}
            {user.role === 'participant' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Nominations History */}
                    <Card className="border-border/50 shadow-sm flex flex-col h-full">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Calendar className="size-5 text-primary" /> Training Nominations
                            </CardTitle>
                            <CardDescription>Recent programs this user was nominated for</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            {nominations.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-secondary/5 rounded-xl border border-dashed border-border/50">
                                    <Calendar className="size-8 text-muted-foreground/50 mb-3" />
                                    <p className="text-muted-foreground text-sm">No training nominations found for this user.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {nominations.map((nom, idx) => (
                                        <div key={nom.id || idx} className="flex items-start justify-between p-3 rounded-lg border border-border/40 bg-card hover:bg-accent/50 transition-colors">
                                            <div>
                                                <p className="font-medium text-sm text-foreground line-clamp-1">
                                                    {nom.trainingId && typeof nom.trainingId === 'object' && 'title' in nom.trainingId ? (nom.trainingId as any).title : 'Deleted / Unknown Training'}
                                                </p>
                                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                                    <span>{nom.nominatedAt ? format(new Date(nom.nominatedAt), 'MMM d, yyyy') : 'Date unavailable'}</span>
                                                </div>
                                            </div>
                                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0
                                                ${nom.status === 'approved' ? 'bg-emerald-500/10 text-emerald-500' :
                                                    nom.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                                                        'bg-orange-500/10 text-orange-500'}`
                                            }>
                                                {nom.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Attendance History */}
                    <Card className="border-border/50 shadow-sm flex flex-col h-full">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Clock className="size-5 text-primary" /> Attendance Records
                            </CardTitle>
                            <CardDescription>Recent session attendance logs</CardDescription>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                            {attendance.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-secondary/5 rounded-xl border border-dashed border-border/50">
                                    <Clock className="size-8 text-muted-foreground/50 mb-3" />
                                    <p className="text-muted-foreground text-sm">No attendance records found for this user.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {attendance.slice(0, 5).map((record, idx) => (
                                        <div key={record.id || idx} className="flex items-start justify-between p-3 rounded-lg border border-border/40 bg-card hover:bg-accent/50 transition-colors">
                                            <div>
                                                <p className="font-medium text-sm text-foreground line-clamp-1">
                                                    {record.trainingId && typeof record.trainingId === 'object' && 'title' in record.trainingId ? (record.trainingId as any).title : 'Deleted / Unknown Training'}
                                                </p>
                                                <div className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                                                    <span>{record.timestamp ? format(new Date(record.timestamp), 'MMM d, yyyy • h:mm a') : 'Date unavailable'}</span>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 bg-emerald-500/10 text-emerald-500 flex items-center gap-1">
                                                <CheckCircle2 className="size-3" /> Present
                                            </span>
                                        </div>
                                    ))}
                                    {attendance.length > 5 && (
                                        <p className="text-xs text-center text-muted-foreground pt-2">Showing 5 most recent records</p>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default UserDetails;
