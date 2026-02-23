import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Training, Hall, User } from '../../types';
import {
    Calendar, Clock, Users, MapPin, ArrowLeft, Edit, Trash2, CheckCircle, XCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import AttendanceListModal from '../components/AttendanceListModal';
import AttendanceSessionManager from '../components/AttendanceSessionManager';
import { QrCode } from 'lucide-react';
import LoadingScreen from '../components/LoadingScreen';

const TrainingDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [training, setTraining] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);

    useEffect(() => {
        const fetchTraining = async () => {
            try {
                const response = await api.get(`/trainings/${id}`);
                // Adapt response if necessary, though controller seems to return populated objects
                // The controller returns: { ..., hall: { ... }, creator: { ... } } based on my reading
                // But let's handle standard properties.
                setTraining(response.data);
            } catch (error) {
                console.error('Failed to fetch training details:', error);
                toast.error('Failed to load training details');
                navigate('/trainings');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchTraining();
        }
    }, [id, navigate]);

    const getStatusBadge = (status: string) => {
        const variants = {
            draft: 'bg-gray-200 text-gray-800',
            scheduled: 'bg-blue-100 text-blue-800',
            ongoing: 'bg-green-100 text-green-800',
            completed: 'bg-purple-100 text-purple-800',
            cancelled: 'bg-red-100 text-red-800',
        };
        return variants[status as keyof typeof variants] || variants.draft;
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this training? This action cannot be undone.')) return;
        try {
            await api.delete(`/trainings/${id}`);
            toast.success('Training deleted successfully');
            navigate('/trainings');
        } catch (error) {
            console.error('Delete failed:', error);
            toast.error('Failed to delete training');
        }
    };

    const handleStatusUpdate = async (newStatus: 'completed' | 'cancelled') => {
        if (!confirm(`Are you sure you want to mark this training as ${newStatus}?`)) return;
        try {
            await api.patch(`/trainings/${id}/status`, { status: newStatus });
            setTraining({ ...training, status: newStatus });
            toast.success(`Training marked as ${newStatus}`);
        } catch (error) {
            console.error('Status update failed:', error);
            toast.error('Failed to update status');
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }

    if (!training) return null;

    // Helper to get names safely
    const hallName = training.hall?.name || training.hallId?.name || 'Unknown Hall';
    const trainerName = training.creator?.name || training.createdById?.name || 'Unknown Trainer'; // Fallback if regular trainer field logic differs

    // The Training type usually has a `trainerId` which is a User ID.
    // The controller populates `createdById` but seemingly not `trainerId` specifically in the customized transformation?
    // Let's check the controller `getTrainingById`:
    // .populate('hallId').populate('createdById', 'name email')
    // It does NOT populate `trainerId`.
    // So `training.trainerId` will likely just be an ID string.
    // If we want the Trainer Name, we might need to fetch users or reliance on `createdById` if logic assumes creator = trainer often.
    // However, the `Trainings.tsx` list fetches ALL users to find the trainer name. 
    // For this detail page, ideally the backend should populate it, OR we fetch users.
    // For now, I will display the Trainer Name if available in `creator` (if self-taught) or just ID if not, 
    // OR BETTER: I'll quickly fetch the trainer user object if it's just an ID string.

    // Actually, purely to get this reliable without changing backend right now, I'll assume users usually want to see the details.
    // I'll check if I can just fetch the specific user or if I should just show the ID for now/wait. 
    // The `Trainings.tsx` list fetched *all* users. I can do the same here or just fetch the one.
    // Simpler: I'll just show the `createdById` name as "Created By" and maybe `trainerId` if it differs.

    return (
        <div className="pb-12 space-y-8 text-foreground">
            <Button variant="ghost" onClick={() => navigate('/trainings')} className="gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5">
                <ArrowLeft className="size-4" /> Back to Library
            </Button>

            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-foreground">{training.title}</h1>
                    <p className="text-xl text-primary font-medium mt-2">{training.program}</p>
                </div>
                <Badge className={`text-sm px-4 py-1.5 uppercase tracking-widest ${getStatusBadge(training.status)}`}>
                    {training.status}
                </Badge>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Details */}
                <Card className="lg:col-span-2 bg-white/5 border-white/10">
                    <CardHeader>
                        <CardTitle className="text-xl font-bold">About this Session</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Description</h3>
                            <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
                                {training.description || 'No description provided.'}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
                            <div>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Target Audience</h3>
                                <p className="font-medium text-foreground">{training.targetAudience || 'General'}</p>
                            </div>
                            <div>
                                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Institutions</h3>
                                <p className="font-medium text-foreground">{training.requiredInstitutions?.length || 0} Required</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Sidebar Details */}
                <div className="space-y-6">
                    {/* Attendance Session Manager - Visible if owner/admin OR if session is active for participants */}
                    <AttendanceSessionManager
                        trainingId={id!}
                        isOwnerOrAdmin={user?.role === 'master_admin' || (user?.role === 'program_officer' && training.createdById === user.id)}
                    />


                    <Card className="bg-white/5 border-white/10">
                        <CardHeader>
                            <CardTitle className="text-lg text-foreground">Logistics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-start gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                <div className="p-2 bg-secondary/20 rounded-lg text-primary">
                                    <Calendar className="size-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Date</p>
                                    <p className="font-medium text-sm mt-0.5">{format(new Date(training.date), 'EEEE, MMMM do, yyyy')}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                <div className="p-2 bg-secondary/20 rounded-lg text-primary">
                                    <Clock className="size-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Time</p>
                                    <p className="font-medium text-sm mt-0.5">{training.startTime} - {training.endTime}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                <div className="p-2 bg-secondary/20 rounded-lg text-primary">
                                    <MapPin className="size-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Venue</p>
                                    <p className="font-medium text-sm mt-0.5">{hallName}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors">
                                <div className="p-2 bg-secondary/20 rounded-lg text-primary">
                                    <Users className="size-5" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold text-muted-foreground uppercase">Capacity</p>
                                    <p className="font-medium text-sm mt-0.5">{training.capacity} Participants</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Manage Section - Consolidated for all roles */}
                    {(user?.role === 'participant' || user?.role === 'program_officer' || user?.role === 'master_admin') && (
                        <Card className="bg-white/5 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-lg">Manage</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                                {/* Participant specific actions */}
                                {user?.role === 'participant' && (
                                    <Button
                                        className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90"
                                        onClick={() => navigate('/scan-qr')}
                                    >
                                        <QrCode className="size-4 mr-3" /> Scan Attendance QR
                                    </Button>
                                )}

                                {/* Admin/PO actions */}
                                {(user?.role === 'program_officer' || user?.role === 'master_admin') && (
                                    <Button variant="outline" className="w-full justify-start border-white/10 hover:bg-white/10" onClick={() => setAttendanceModalOpen(true)}>
                                        <Users className="size-4 mr-3" /> View Attendance
                                    </Button>
                                )}

                                {(user?.role === 'master_admin' || (user?.role === 'program_officer' && (training.createdById === user.id || training.createdById === (user as any).userId))) && (
                                    <>
                                        <Button variant="outline" className="w-full justify-start border-white/10 hover:bg-white/10" onClick={() => navigate(`/trainings/${id}/edit`)}>
                                            <Edit className="size-4 mr-3" /> Edit Training
                                        </Button>

                                        {(training.status === 'scheduled' || training.status === 'ongoing') && (
                                            <>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start border-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                                    onClick={() => handleStatusUpdate('completed')}
                                                >
                                                    <CheckCircle className="size-4 mr-3" /> Mark Completed
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    className="w-full justify-start border-orange-500/20 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10"
                                                    onClick={() => handleStatusUpdate('cancelled')}
                                                >
                                                    <XCircle className="size-4 mr-3" /> Cancel Training
                                                </Button>
                                            </>
                                        )}

                                        <Button
                                            variant="outline"
                                            className="w-full justify-start border-destructive/20 text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={handleDelete}
                                        >
                                            <Trash2 className="size-4 mr-3" /> Delete Training
                                        </Button>
                                    </>
                                )}
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            <AttendanceListModal
                isOpen={attendanceModalOpen}
                onClose={() => setAttendanceModalOpen(false)}
                trainingId={id || ''}
                trainingTitle={training.title}
            />
        </div>
    );
};

export default TrainingDetails;
