import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Institution, MyFeedbackSubmission, TrainingFeedback, TrainingFeedbackSummary } from '../../types';
import {
    Calendar, Clock, Users, MapPin, ArrowLeft, Edit, Trash2, CheckCircle, XCircle, MessageSquareMore, Star, TrendingUp, QrCode, Award
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { format } from 'date-fns';
import { toast } from 'sonner';
import AttendanceSessionManager from '../components/AttendanceSessionManager';
import LoadingScreen from '../components/LoadingScreen';
import { generateCertificatePDF } from '../../utils/certificateGenerator';
import { trainingsApi, feedbackApi, institutionsApi } from '../../services/api';
import FeedbackSubmissionDialog from '../components/FeedbackSubmissionDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const getEntityId = (value: any): string => value?.id || value?._id || '';

const normalizeDisplayList = (value: unknown): string[] => {
    if (Array.isArray(value)) {
        return value
            .flatMap((entry) => normalizeDisplayList(entry))
            .filter(Boolean);
    }

    if (typeof value === 'string') {
        return value
            .split(',')
            .map((entry) => entry.trim())
            .filter(Boolean);
    }

    if (value && typeof value === 'object') {
        const name = (value as any).name;
        return typeof name === 'string' && name.trim() ? [name.trim()] : [];
    }

    return [];
};

interface OverviewTileProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    hint?: string;
}

const OverviewTile: React.FC<OverviewTileProps> = ({ icon, label, value, hint }) => (
    <div className="rounded-2xl border border-border/70 bg-background/60 p-4 shadow-sm">
        <div className="flex items-start gap-3">
            <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
                <p className="mt-2 text-sm font-semibold leading-5 text-foreground">{value}</p>
                {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
            </div>
        </div>
    </div>
);

interface LogisticsRowProps {
    icon: React.ReactNode;
    label: string;
    value: string;
    helper?: string;
}

const LogisticsRow: React.FC<LogisticsRowProps> = ({ icon, label, value, helper }) => (
    <div className="flex items-start gap-4 rounded-2xl border border-border/60 bg-background/60 p-4 transition-colors hover:bg-background/80">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary">
            {icon}
        </div>
        <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{label}</p>
            <p className="mt-1 text-sm font-semibold leading-6 text-foreground">{value}</p>
            {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
        </div>
    </div>
);

const TrainingDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [training, setTraining] = useState<any | null>(null);
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [isAttendanceSessionActive, setIsAttendanceSessionActive] = useState(false);
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackEntries, setFeedbackEntries] = useState<TrainingFeedback[]>([]);
    const [feedbackSummary, setFeedbackSummary] = useState<TrainingFeedbackSummary>({
        totalResponses: 0,
        averageRating: null,
        commonTopics: []
    });
    const [feedbackSort, setFeedbackSort] = useState<'latest' | 'oldest'>('latest');
    const [feedbackRatingFilter, setFeedbackRatingFilter] = useState<string>('all');
    const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
    const [myFeedbackSubmission, setMyFeedbackSubmission] = useState<MyFeedbackSubmission | null>(null);
    const [showReplacementDialog, setShowReplacementDialog] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [trainingRes, institutionsData] = await Promise.all([
                    api.get(`/trainings/${id}`),
                    institutionsApi.getAll().catch(() => []),
                ]);
                setTraining(trainingRes.data);
                setInstitutions(Array.isArray(institutionsData) ? institutionsData : []);
            } catch (error: any) {
                console.error('Failed to fetch training details:', error);
                if (error.response?.status === 404) {
                    toast.error('This training session no longer exists or was deleted.');
                } else {
                    toast.error('Failed to load training details');
                }
                navigate('/trainings');
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchData();
        }
    }, [id, navigate]);

    useEffect(() => {
        const fetchFeedbackData = async () => {
            if (!id || !training) return;

            const creatorId = typeof training.createdById === 'string'
                ? training.createdById
                : training.createdById?.id || training.createdById?._id;
            const currentUserId = user?.id || (user as any)?.userId;
            const isReviewer = Boolean(
                user?.role === 'master_admin' ||
                ((user?.role === 'program_officer' || user?.role === 'medical_officer') && creatorId === currentUserId)
            );
            const canSubmitFeedback = Boolean(user?.role === 'participant' && training.status === 'completed' && training.userStatus === 'attended');

            try {
                setFeedbackLoading(true);

                const requests: Promise<any>[] = [];
                if (isReviewer) {
                    requests.push(feedbackApi.getByTraining(id));
                } else {
                    requests.push(Promise.resolve(null));
                }

                if (canSubmitFeedback) {
                    requests.push(feedbackApi.getMySubmissions());
                } else {
                    requests.push(Promise.resolve([]));
                }

                const [feedbackResponse, mySubmissions] = await Promise.all(requests);

                if (feedbackResponse) {
                    setFeedbackEntries(feedbackResponse.entries);
                    setFeedbackSummary(feedbackResponse.summary);
                } else {
                    setFeedbackEntries([]);
                    setFeedbackSummary({
                        totalResponses: 0,
                        averageRating: null,
                        commonTopics: []
                    });
                }

                const currentSubmission = Array.isArray(mySubmissions)
                    ? mySubmissions.find((entry: MyFeedbackSubmission) => entry.trainingId === id) || null
                    : null;
                setMyFeedbackSubmission(currentSubmission);
            } catch (error: any) {
                console.error('Failed to fetch feedback data:', error);
                setFeedbackEntries([]);
                setFeedbackSummary({
                    totalResponses: 0,
                    averageRating: null,
                    commonTopics: []
                });
            } finally {
                setFeedbackLoading(false);
            }
        };

        fetchFeedbackData();
    }, [id, training, user]);

    const handleGenerateCertificates = async () => {
        if (!id) return;
        setGenerating(true);
        try {
            await trainingsApi.generateCertificates(id);
            toast.success('Certificates generated and notifications sent!');
            // Refresh training data to see certificatesGenerated: true
            const response = await api.get(`/trainings/${id}`);
            setTraining(response.data);
        } catch (error) {
            console.error('Failed to generate certificates:', error);
            toast.error('Failed to generate certificates');
        } finally {
            setGenerating(false);
        }
    };

    const handleDownloadCertificate = async () => {
        if (!training || !user) return;

        try {
            // Extraction of Hall/Venue name
            const venueName = (training as any).hallId?.name || (training as any).hallId || 'Authorized Training Center';

            await generateCertificatePDF({
                participantName: user.name,
                trainingTitle: training.title,
                programName: training.program,
                date: training.date,
                trainerName: (training as any).creator?.name || 'Authorized Officer',
                institutionName: venueName
            });
            toast.success('Certificate downloaded successfully');
        } catch (error) {
            console.error('Failed to download certificate:', error);
            toast.error('Failed to generate certificate PDF');
        }
    };

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
            if (newStatus === 'cancelled' && (user?.role === 'master_admin' || user?.role === 'program_officer')) {
                setShowReplacementDialog(true);
            }
        } catch (error) {
            console.error('Status update failed:', error);
            toast.error('Failed to update status');
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }

    if (!training) return null;

    const hallName = training.hall?.name || training.hallId?.name || 'Unknown Hall';
    const currentUserId = user?.id || (user as any)?.userId;
    const creatorId = typeof training.createdById === 'string'
        ? training.createdById
        : training.createdById?.id || training.createdById?._id;
    const isOwnerOrAdmin = Boolean(
        user?.role === 'master_admin' ||
        ((user?.role === 'program_officer' || user?.role === 'medical_officer') && creatorId === currentUserId)
    );
    const canViewFeedback = training.status === 'completed' && isOwnerOrAdmin;
    const canSubmitFeedback = Boolean(user?.role === 'participant' && training.status === 'completed' && training.userStatus === 'attended');
    const assignedParticipantsCount = training.assignedParticipantsCount || 0;
    const remainingCapacity = training.remainingCapacity !== undefined ? training.remainingCapacity : training.capacity;
    const statusLabel = training.status
        ? `${training.status.charAt(0).toUpperCase()}${training.status.slice(1)}`
        : 'Draft';
    const formattedFullDate = format(new Date(training.date), 'EEEE, MMMM do, yyyy');
    const formattedShortDate = format(new Date(training.date), 'EEE, MMM d');
    const sessionTime = `${training.startTime} - ${training.endTime}`;
    const filteredFeedbackEntries = feedbackEntries
        .filter((entry) => feedbackRatingFilter === 'all' || String(entry.rating || 'unrated') === feedbackRatingFilter)
        .sort((a, b) => {
            const first = new Date(a.submittedAt).getTime();
            const second = new Date(b.submittedAt).getTime();
            return feedbackSort === 'latest' ? second - first : first - second;
        });
    const targetAudience = normalizeDisplayList(training.targetAudience);
    const requiredInstitutionNames = Array.isArray(training.requiredInstitutions)
        ? training.requiredInstitutions
            .map((entry: any) => {
                if (entry && typeof entry === 'object' && entry.name) return String(entry.name).trim();
                const institution = institutions.find((item) => getEntityId(item) === String(entry));
                return institution?.name?.trim() || '';
            })
            .filter(Boolean)
        : [];
    const formatDateParam = (date: Date | string) => {
        const parsed = new Date(date);
        const year = parsed.getFullYear();
        const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
        const day = `${parsed.getDate()}`.padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const openReplacementFlow = (useSameDay: boolean) => {
        const selectedDate = useSameDay ? formatDateParam(training.date) : undefined;
        navigate(
            useSameDay ? `/trainings/create?date=${selectedDate}` : '/trainings/create',
            {
                state: {
                    prefilledTraining: training,
                    ...(selectedDate ? { selectedDate } : {}),
                },
            }
        );
        setShowReplacementDialog(false);
    };

    return (
        <div className="mx-auto max-w-7xl pb-12 space-y-8 text-foreground">
            <Button variant="ghost" onClick={() => navigate('/trainings')} className="gap-2 text-muted-foreground hover:text-foreground hover:bg-white/5">
                <ArrowLeft className="size-4" /> Back to Library
            </Button>

            <Card className="overflow-hidden border-border bg-card shadow-sm">
                <CardContent className="space-y-8 p-6 sm:p-8">
                    <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                        <div className="max-w-3xl">
                            <div className="mb-4 flex flex-wrap items-center gap-3">
                                <Badge className={`px-3 py-1.5 text-xs uppercase tracking-[0.24em] ${getStatusBadge(training.status)}`}>
                                    {statusLabel}
                                </Badge>
                                <span className="text-sm text-muted-foreground">Session overview</span>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-5xl">{training.title}</h1>
                            <p className="mt-3 text-lg font-medium text-primary sm:text-xl">{training.program}</p>
                            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                                {training.description || 'No description provided.'}
                            </p>
                        </div>

                        <div className="w-full max-w-sm rounded-3xl border border-border/70 bg-background/60 p-5 shadow-sm">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">At a glance</p>
                            <div className="mt-4 space-y-4">
                                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                                    <span className="text-sm text-muted-foreground">Audience</span>
                                    <span className="text-sm font-semibold text-foreground">
                                        {targetAudience.length > 0 ? `${targetAudience.length} groups` : 'General staff'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-3">
                                    <span className="text-sm text-muted-foreground">Institutions</span>
                                    <span className="text-sm font-semibold text-foreground">
                                        {requiredInstitutionNames.length > 0 ? requiredInstitutionNames.length : 'Open access'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between gap-3">
                                    <span className="text-sm text-muted-foreground">Seats remaining</span>
                                    <span className={`text-sm font-semibold ${remainingCapacity === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {remainingCapacity}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                        <OverviewTile
                            icon={<Calendar className="size-4" />}
                            label="Date"
                            value={formattedShortDate}
                            hint={formattedFullDate}
                        />
                        <OverviewTile
                            icon={<Clock className="size-4" />}
                            label="Time"
                            value={sessionTime}
                        />
                        <OverviewTile
                            icon={<MapPin className="size-4" />}
                            label="Venue"
                            value={hallName}
                        />
                        <OverviewTile
                            icon={<Users className="size-4" />}
                            label="Capacity"
                            value={`${assignedParticipantsCount}/${training.capacity} assigned`}
                            hint={`${remainingCapacity} seat${remainingCapacity === 1 ? '' : 's'} remaining`}
                        />
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                {/* Main Details */}
                <Card className="lg:col-span-2 border-border bg-card shadow-sm">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-2xl font-bold">About this Session</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="rounded-3xl border border-border/70 bg-background/50 p-5 sm:p-6">
                            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">Description</h3>
                            <p className="whitespace-pre-wrap text-foreground/90 leading-8">
                                {training.description || 'No description provided.'}
                            </p>
                        </div>

                        <div className="grid gap-6 md:grid-cols-2">
                            <div className="rounded-3xl border border-border/70 bg-background/50 p-5 sm:p-6">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                                        <Users className="size-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Target Audience</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">Who this session is intended for</p>
                                    </div>
                                </div>
                                {targetAudience.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {targetAudience.map((audience) => (
                                            <Badge
                                                key={audience}
                                                variant="outline"
                                                className="border-primary/20 bg-primary/5 px-3 py-1 text-sm font-medium text-foreground"
                                            >
                                                {audience}
                                            </Badge>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="font-medium text-foreground">General staff</p>
                                )}
                            </div>
                            <div className="rounded-3xl border border-border/70 bg-background/50 p-5 sm:p-6">
                                <div className="mb-4 flex items-center gap-3">
                                    <div className="rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary">
                                        <MapPin className="size-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Institutions</h3>
                                        <p className="mt-1 text-sm text-muted-foreground">Required institutions for this session</p>
                                    </div>
                                </div>
                                {requiredInstitutionNames.length > 0 ? (
                                    <div className="space-y-3">
                                        <p className="text-sm font-medium text-foreground">
                                            {requiredInstitutionNames.length} institution{requiredInstitutionNames.length === 1 ? '' : 's'} required
                                        </p>
                                        <div className="flex flex-wrap gap-2">
                                            {requiredInstitutionNames.map((institutionName) => (
                                                <Badge
                                                    key={institutionName}
                                                    variant="outline"
                                                    className="border-white/10 bg-white/5 px-3 py-1 text-sm font-medium text-foreground"
                                                >
                                                    {institutionName}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="font-medium text-foreground">Open to all institutions</p>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Sidebar Details */}
                <div className="self-start space-y-6 lg:sticky lg:top-24">
                    {/* Attendance Session Manager - Visible if owner/admin OR if session is active for participants */}
                    <AttendanceSessionManager
                        trainingId={id!}
                        isOwnerOrAdmin={Boolean(user?.role === 'master_admin' || ((user?.role === 'program_officer' || user?.role === 'medical_officer') && creatorId === currentUserId))}
                        date={training.date}
                        startTime={training.startTime}
                        endTime={training.endTime}
                        onSessionStatusChange={setIsAttendanceSessionActive}
                    />


                    <Card className="border-border bg-card shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg text-foreground">Logistics</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <LogisticsRow icon={<Calendar className="size-5" />} label="Date" value={formattedFullDate} />
                            <LogisticsRow icon={<Clock className="size-5" />} label="Time" value={sessionTime} />
                            <LogisticsRow icon={<MapPin className="size-5" />} label="Venue" value={hallName} />

                            <div className="rounded-2xl border border-border/60 bg-background/60 p-4">
                                <div className="mb-4 flex items-start gap-4">
                                    <div className="rounded-xl border border-primary/20 bg-primary/10 p-2.5 text-primary">
                                        <Users className="size-5" />
                                    </div>
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Capacity</p>
                                        <p className="mt-1 text-sm text-muted-foreground">Current seat allocation</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
                                        <p className="text-xs text-muted-foreground">Total</p>
                                        <p className="mt-1 text-lg font-bold text-foreground">{training.capacity}</p>
                                    </div>
                                    <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
                                        <p className="text-xs text-muted-foreground">Assigned</p>
                                        <p className="mt-1 text-lg font-bold text-blue-400">{assignedParticipantsCount}</p>
                                    </div>
                                    <div className="rounded-xl border border-border/60 bg-card p-3 text-center">
                                        <p className="text-xs text-muted-foreground">Remaining</p>
                                        <p className={`mt-1 text-lg font-bold ${remainingCapacity === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                            {remainingCapacity}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Manage Section - Consolidated for all roles */}
                    {(user?.role === 'participant' || user?.role === 'program_officer' || user?.role === 'medical_officer' || user?.role === 'master_admin') && (
                        <Card className="border-border bg-card shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-lg">Manage</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">
                                    Available actions for this session based on your role and the current training status.
                                </p>

                                <div className="flex flex-col gap-3">
                                    {user?.role === 'participant' && (
                                        <>
                                            {training.userStatus === 'attended' ? (
                                                <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
                                                    <CheckCircle className="size-4 flex-shrink-0" />
                                                    <span className="font-semibold text-sm">Attendance Marked</span>
                                                </div>
                                            ) : (
                                                training.status !== 'completed' && isAttendanceSessionActive && (
                                                    <Button
                                                        className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90"
                                                        onClick={() => navigate('/scan-qr')}
                                                    >
                                                        <QrCode className="mr-3 size-4" /> Scan Attendance QR
                                                    </Button>
                                                )
                                            )}
                                        </>
                                    )}

                                    {user?.role === 'participant' && training.userStatus === 'attended' && training.certificatesGenerated && (
                                        <Button
                                            variant="outline"
                                            className="w-full justify-start border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                            onClick={handleDownloadCertificate}
                                        >
                                            <Award className="mr-3 size-4" /> Download Certificate
                                        </Button>
                                    )}

                                    {canSubmitFeedback && (
                                        myFeedbackSubmission ? (
                                            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-400">
                                                <MessageSquareMore className="mt-0.5 size-4 flex-shrink-0" />
                                                <div>
                                                    <p className="text-sm font-semibold">Feedback submitted</p>
                                                    <p className="text-xs text-emerald-300/90">
                                                        Submitted on {format(new Date(myFeedbackSubmission.submittedAt), 'MMM dd, yyyy')}
                                                    </p>
                                                </div>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="outline"
                                                className="w-full justify-start border-primary/20 text-primary hover:bg-primary/10"
                                                onClick={() => setFeedbackDialogOpen(true)}
                                            >
                                                <MessageSquareMore className="mr-3 size-4" /> Submit Feedback
                                            </Button>
                                        )
                                    )}

                                    {(user?.role === 'program_officer' || user?.role === 'medical_officer' || user?.role === 'master_admin') && (
                                        <Button variant="outline" className="w-full justify-start border-white/10 hover:bg-white/10" onClick={() => navigate(`/trainings/${id}/attendance`)}>
                                            <Users className="mr-3 size-4" /> View Attendance
                                        </Button>
                                    )}

                                    {isOwnerOrAdmin && (
                                        <>
                                            {training.status === 'completed' && !training.certificatesGenerated && (
                                                <Button
                                                    className="w-full justify-start bg-emerald-600 text-white hover:bg-emerald-700"
                                                    onClick={handleGenerateCertificates}
                                                    disabled={generating}
                                                >
                                                    {generating ? (
                                                        <Clock className="mr-3 size-4 animate-spin" />
                                                    ) : (
                                                        <Award className="mr-3 size-4" />
                                                    )}
                                                    Generate Certificates
                                                </Button>
                                            )}

                                            {training.status !== 'completed' && training.status !== 'cancelled' && (
                                                <Button variant="outline" className="w-full justify-start border-white/10 hover:bg-white/10" onClick={() => navigate(`/trainings/${id}/edit`)}>
                                                    <Edit className="mr-3 size-4" /> Edit Training
                                                </Button>
                                            )}

                                            {(training.status === 'scheduled' || training.status === 'ongoing') && (
                                                <>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full justify-start border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
                                                        onClick={() => handleStatusUpdate('completed')}
                                                    >
                                                        <CheckCircle className="mr-3 size-4" /> Mark Completed
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        className="w-full justify-start border-orange-500/20 text-orange-400 hover:bg-orange-500/10 hover:text-orange-300"
                                                        onClick={() => handleStatusUpdate('cancelled')}
                                                    >
                                                        <XCircle className="mr-3 size-4" /> Cancel Training
                                                    </Button>
                                                </>
                                            )}

                                            <Button
                                                variant="outline"
                                                className="w-full justify-start border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                                onClick={handleDelete}
                                            >
                                                <Trash2 className="mr-3 size-4" /> Delete Training
                                            </Button>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {canViewFeedback && (
                <Card className="border-border bg-card">
                    <CardHeader className="gap-4">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-xl text-foreground">
                                    <MessageSquareMore className="size-5 text-primary" />
                                    Participant Feedback
                                </CardTitle>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Review suggestions, future requests, and session arrangement feedback from attendees.
                                </p>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-2">
                                <Select value={feedbackRatingFilter} onValueChange={setFeedbackRatingFilter}>
                                    <SelectTrigger className="w-full min-w-[170px] border-border bg-background">
                                        <SelectValue placeholder="Filter by rating" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All ratings</SelectItem>
                                        <SelectItem value="5">5 stars</SelectItem>
                                        <SelectItem value="4">4 stars</SelectItem>
                                        <SelectItem value="3">3 stars</SelectItem>
                                        <SelectItem value="2">2 stars</SelectItem>
                                        <SelectItem value="1">1 star</SelectItem>
                                        <SelectItem value="unrated">Unrated</SelectItem>
                                    </SelectContent>
                                </Select>

                                <Select value={feedbackSort} onValueChange={(value) => setFeedbackSort(value as 'latest' | 'oldest')}>
                                    <SelectTrigger className="w-full min-w-[170px] border-border bg-background">
                                        <SelectValue placeholder="Sort responses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="latest">Latest first</SelectItem>
                                        <SelectItem value="oldest">Oldest first</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3">
                            <div className="rounded-2xl border border-border bg-background/80 p-5">
                                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Average rating</p>
                                <div className="mt-3 flex items-end gap-2">
                                    <span className="text-3xl font-bold text-foreground">
                                        {feedbackSummary.averageRating ?? '--'}
                                    </span>
                                    <span className="mb-1 flex items-center gap-1 text-sm text-amber-500">
                                        <Star className="size-4 fill-current" />
                                        out of 5
                                    </span>
                                </div>
                            </div>
                            <div className="rounded-2xl border border-border bg-background/80 p-5">
                                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Total responses</p>
                                <p className="mt-3 text-3xl font-bold text-foreground">{feedbackSummary.totalResponses}</p>
                            </div>
                            <div className="rounded-2xl border border-border bg-background/80 p-5">
                                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Common themes</p>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {feedbackSummary.commonTopics.length > 0 ? (
                                        feedbackSummary.commonTopics.map((topic) => (
                                            <Badge key={topic.keyword} variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                                                <TrendingUp className="mr-1 size-3.5" />
                                                {topic.keyword} ({topic.count})
                                            </Badge>
                                        ))
                                    ) : (
                                        <span className="text-sm text-muted-foreground">Themes will appear after responses arrive.</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {feedbackLoading ? (
                            <div className="rounded-2xl border border-dashed border-border bg-background/50 px-6 py-12 text-center text-muted-foreground">
                                Loading feedback...
                            </div>
                        ) : filteredFeedbackEntries.length === 0 ? (
                            <div className="rounded-2xl border border-dashed border-border bg-background/50 px-6 py-12 text-center">
                                <MessageSquareMore className="mx-auto mb-3 size-10 text-muted-foreground/50" />
                                <p className="text-lg font-semibold text-foreground">No feedback received yet</p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Responses from attendees will appear here after they submit feedback.
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4">
                                {filteredFeedbackEntries.map((entry) => (
                                    <div key={entry.id} className="rounded-2xl border border-border bg-background/80 p-5 shadow-sm">
                                        <div className="flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-start sm:justify-between">
                                            <div>
                                                <p className="text-base font-semibold text-foreground">{entry.participantName}</p>
                                                <p className="mt-1 text-sm text-muted-foreground">
                                                    Submitted on {format(new Date(entry.submittedAt), 'MMM dd, yyyy, h:mm a')}
                                                </p>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant="outline" className="border-border bg-card text-foreground">
                                                    {entry.rating ? `${entry.rating} / 5 stars` : 'No rating'}
                                                </Badge>
                                                <Badge
                                                    className={
                                                        entry.sentiment === 'positive'
                                                            ? 'bg-emerald-500/10 text-emerald-500'
                                                            : entry.sentiment === 'negative'
                                                                ? 'bg-rose-500/10 text-rose-500'
                                                                : 'bg-amber-500/10 text-amber-500'
                                                    }
                                                >
                                                    {entry.sentiment}
                                                </Badge>
                                            </div>
                                        </div>

                                        <div className="mt-4 grid gap-4 lg:grid-cols-3">
                                            <div className="rounded-xl border border-border bg-card p-4">
                                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Suggestions</p>
                                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{entry.suggestions}</p>
                                            </div>
                                            <div className="rounded-xl border border-border bg-card p-4">
                                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Future training requests</p>
                                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{entry.futureTrainingRequests}</p>
                                            </div>
                                            <div className="rounded-xl border border-border bg-card p-4">
                                                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">Arrangements</p>
                                                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground">{entry.arrangementsFeedback}</p>
                                                {entry.overallExperience && (
                                                    <div className="mt-4 rounded-lg border border-border bg-background px-3 py-2 text-sm text-muted-foreground">
                                                        Overall experience: <span className="font-medium text-foreground">{entry.overallExperience}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {canSubmitFeedback && !myFeedbackSubmission && (
                <FeedbackSubmissionDialog
                    trainingId={id || ''}
                    trainingTitle={training.title}
                    open={feedbackDialogOpen}
                    onOpenChange={setFeedbackDialogOpen}
                    onSubmitted={(feedback) => {
                        setMyFeedbackSubmission({
                            id: feedback.id,
                            trainingId: feedback.trainingId,
                            submittedAt: feedback.submittedAt,
                            rating: feedback.rating,
                            anonymous: feedback.anonymous
                        });
                    }}
                />
            )}

            <Dialog open={showReplacementDialog} onOpenChange={setShowReplacementDialog}>
                <DialogContent className="border-border bg-background text-foreground">
                    <DialogHeader>
                        <DialogTitle>Create a replacement training?</DialogTitle>
                        <DialogDescription>
                            This training was cancelled. You can create a new session with the same details for the same day or choose another day.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="sm:justify-between">
                        <Button variant="outline" onClick={() => setShowReplacementDialog(false)}>
                            Not now
                        </Button>
                        <div className="flex flex-col-reverse gap-2 sm:flex-row">
                            <Button variant="outline" onClick={() => openReplacementFlow(false)}>
                                Create for another day
                            </Button>
                            <Button onClick={() => openReplacementFlow(true)}>
                                Create for same day
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default TrainingDetails;
