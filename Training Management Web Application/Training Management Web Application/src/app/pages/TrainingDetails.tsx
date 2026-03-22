import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { MyFeedbackSubmission, TrainingFeedback, TrainingFeedbackSummary } from '../../types';
import {
    Calendar, Clock, Users, MapPin, ArrowLeft, Edit, Trash2, CheckCircle, XCircle, MessageSquareMore, Star, TrendingUp, QrCode, Award
} from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { format } from 'date-fns';
import { toast } from 'sonner';
import AttendanceListModal from '../components/AttendanceListModal';
import AttendanceSessionManager from '../components/AttendanceSessionManager';
import LoadingScreen from '../components/LoadingScreen';
import { generateCertificatePDF } from '../../utils/certificateGenerator';
import { trainingsApi, feedbackApi } from '../../services/api';
import FeedbackSubmissionDialog from '../components/FeedbackSubmissionDialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

const TrainingDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [training, setTraining] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);
    const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const trainingRes = await api.get(`/trainings/${id}`);
                setTraining(trainingRes.data);
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
    const filteredFeedbackEntries = feedbackEntries
        .filter((entry) => feedbackRatingFilter === 'all' || String(entry.rating || 'unrated') === feedbackRatingFilter)
        .sort((a, b) => {
            const first = new Date(a.submittedAt).getTime();
            const second = new Date(b.submittedAt).getTime();
            return feedbackSort === 'latest' ? second - first : first - second;
        });

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
                        isOwnerOrAdmin={Boolean(user?.role === 'master_admin' || ((user?.role === 'program_officer' || user?.role === 'medical_officer') && creatorId === currentUserId))}
                        date={training.date}
                        startTime={training.startTime}
                        endTime={training.endTime}
                        onSessionStatusChange={setIsAttendanceSessionActive}
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
                                <div className="w-full">
                                    <p className="text-xs font-semibold text-muted-foreground uppercase mb-1">Capacity</p>
                                    <div className="flex justify-between items-center bg-white/5 rounded p-2">
                                        <div className="text-center px-2 border-r border-white/10 w-1/3">
                                            <p className="text-xs text-muted-foreground">Total</p>
                                            <p className="font-bold text-sm">{training.capacity}</p>
                                        </div>
                                        <div className="text-center px-2 border-r border-white/10 w-1/3">
                                            <p className="text-xs text-muted-foreground">Assigned</p>
                                            <p className="font-bold text-sm text-blue-400">{training.assignedParticipantsCount || 0}</p>
                                        </div>
                                        <div className="text-center px-2 w-1/3">
                                            <p className="text-xs text-muted-foreground">Remaining</p>
                                            <p className={`font-bold text-sm ${training.remainingCapacity === 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {training.remainingCapacity !== undefined ? training.remainingCapacity : training.capacity}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Manage Section - Consolidated for all roles */}
                    {(user?.role === 'participant' || user?.role === 'program_officer' || user?.role === 'medical_officer' || user?.role === 'master_admin') && (
                        <Card className="bg-white/5 border-white/10">
                            <CardHeader>
                                <CardTitle className="text-lg">Manage</CardTitle>
                            </CardHeader>
                            <CardContent className="flex flex-col gap-3">
                                {/* Participant specific actions */}
                                {user?.role === 'participant' && (
                                    <>
                                        {training.userStatus === 'attended' ? (
                                            <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
                                                <CheckCircle className="size-4 flex-shrink-0" />
                                                <span className="font-semibold text-sm">Attendance Marked</span>
                                            </div>
                                        ) : (
                                            training.status !== 'completed' && isAttendanceSessionActive && (
                                                <Button
                                                    className="w-full justify-start bg-primary text-primary-foreground hover:bg-primary/90"
                                                    onClick={() => navigate('/scan-qr')}
                                                >
                                                    <QrCode className="size-4 mr-3" /> Scan Attendance QR
                                                </Button>
                                            )
                                        )}
                                    </>
                                )}

                                {/* Participant Download Certificate */}
                                {user?.role === 'participant' && training.userStatus === 'attended' && training.certificatesGenerated && (
                                    <Button
                                        variant="outline"
                                        className="w-full justify-start border-emerald-500/20 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                                        onClick={handleDownloadCertificate}
                                    >
                                        <Award className="size-4 mr-3" /> Download Certificate
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
                                            <MessageSquareMore className="size-4 mr-3" /> Submit Feedback
                                        </Button>
                                    )
                                )}

                                {/* Admin/PO actions */}
                                {(user?.role === 'program_officer' || user?.role === 'medical_officer' || user?.role === 'master_admin') && (
                                    <Button variant="outline" className="w-full justify-start border-white/10 hover:bg-white/10" onClick={() => setAttendanceModalOpen(true)}>
                                        <Users className="size-4 mr-3" /> View Attendance
                                    </Button>
                                )}

                                {isOwnerOrAdmin && (
                                    <>
                                        {/* Generate Certificates Button for PO */}
                                        {training.status === 'completed' && !training.certificatesGenerated && (
                                            <Button
                                                className="w-full justify-start bg-emerald-600 text-white hover:bg-emerald-700"
                                                onClick={handleGenerateCertificates}
                                                disabled={generating}
                                            >
                                                {generating ? (
                                                    <Clock className="size-4 mr-3 animate-spin" />
                                                ) : (
                                                    <Award className="size-4 mr-3" />
                                                )}
                                                Generate Certificates
                                            </Button>
                                        )}

                                        {training.status !== 'completed' && training.status !== 'cancelled' && (
                                            <Button variant="outline" className="w-full justify-start border-white/10 hover:bg-white/10" onClick={() => navigate(`/trainings/${id}/edit`)}>
                                                <Edit className="size-4 mr-3" /> Edit Training
                                            </Button>
                                        )}

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

            <AttendanceListModal
                isOpen={attendanceModalOpen}
                onClose={() => setAttendanceModalOpen(false)}
                trainingId={id || ''}
                trainingTitle={training.title}
            />

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
        </div>
    );
};

export default TrainingDetails;
