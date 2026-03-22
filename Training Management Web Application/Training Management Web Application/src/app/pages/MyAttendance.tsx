import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Eye, Calendar, Clock, MapPin, CheckCircle, MessageSquareMore, Star, CalendarCheck, QrCode, MessageCircleMore, History } from 'lucide-react';
import { attendanceApi, feedbackApi } from '../../services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import LoadingScreen from '../components/LoadingScreen';
import FeedbackSubmissionDialog from '../components/FeedbackSubmissionDialog';
import { MyFeedbackSubmission } from '../../types';

const MyAttendance: React.FC = () => {
    const { t } = useTranslation();
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [submittedFeedback, setSubmittedFeedback] = useState<Record<string, MyFeedbackSubmission>>({});
    const [loading, setLoading] = useState(true);
    const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
    const [selectedTraining, setSelectedTraining] = useState<any | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await attendanceApi.getMyHistory();
                setAttendanceHistory(data);
            } catch (error) {
                console.error('Failed to fetch attendance history', error);
                toast.error(t('myAttendance.loadError', 'Failed to load attendance history'));
            }

            try {
                const feedback = await feedbackApi.getMySubmissions();
                setSubmittedFeedback(
                    feedback.reduce((acc, item) => {
                        acc[item.trainingId] = item;
                        return acc;
                    }, {} as Record<string, MyFeedbackSubmission>)
                );
            } catch (error) {
                console.error('Failed to fetch feedback submissions', error);
                setSubmittedFeedback({});
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const getMethodBadge = (method: string) => {
        return method === 'qr'
            ? <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{t('myAttendance.methods.qr', 'QR Scan')}</Badge>
            : <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">{t('myAttendance.methods.manual', 'Manual')}</Badge>;
    };

    if (loading) {
        return <LoadingScreen />;
    }

    const validHistory = attendanceHistory.filter(record => record.training);
    const qrCount = validHistory.filter((record) => record.method === 'qr').length;
    const feedbackPendingCount = validHistory.filter(
        (record) => record.training?.status === 'completed' && !submittedFeedback[record.training.id]
    ).length;
    const latestAttendance = validHistory.reduce<any | null>((latest, record) => {
        if (!record.timestamp) return latest;
        if (!latest?.timestamp) return record;
        return new Date(record.timestamp).getTime() > new Date(latest.timestamp).getTime() ? record : latest;
    }, null);

    const handleFeedbackSubmitted = (trainingId: string, feedback: MyFeedbackSubmission) => {
        setSubmittedFeedback((prev) => ({
            ...prev,
            [trainingId]: feedback
        }));
    };

    const openFeedbackDialog = (record: any) => {
        setSelectedTraining(record.training);
        setFeedbackDialogOpen(true);
    };

    const getMethodLabel = (method: string) => {
        if (method === 'qr') return t('myAttendance.methods.qr', 'QR Scan');
        return t('myAttendance.methods.manual', 'Manual');
    };

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('myAttendance.title', 'My Attendance')}</h1>
                <p className="text-muted-foreground">{t('myAttendance.subtitle', 'History of trainings you have attended')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border bg-card shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Sessions attended</p>
                                <p className="mt-3 text-3xl font-bold text-foreground">{validHistory.length}</p>
                            </div>
                            <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                <CalendarCheck className="size-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">QR check-ins</p>
                                <p className="mt-3 text-3xl font-bold text-foreground">{qrCount}</p>
                            </div>
                            <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                <QrCode className="size-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Feedback pending</p>
                                <p className="mt-3 text-3xl font-bold text-foreground">{feedbackPendingCount}</p>
                            </div>
                            <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                <MessageCircleMore className="size-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border bg-card shadow-sm">
                    <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Latest attendance</p>
                                <p className="mt-3 text-sm font-semibold text-foreground">
                                    {latestAttendance?.timestamp
                                        ? format(new Date(latestAttendance.timestamp), 'MMM dd, yyyy')
                                        : t('myAttendance.notAvailable', 'N/A')}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {latestAttendance?.timestamp ? format(new Date(latestAttendance.timestamp), 'h:mm a') : ''}
                                </p>
                            </div>
                            <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                <History className="size-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border bg-card shadow-sm">
                <CardHeader className="gap-3 border-b border-border pb-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <CardTitle className="text-2xl">{t('myAttendance.cardTitle', 'Attended Trainings')}</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Review your completed attendance records, give feedback, or open training details.
                            </p>
                        </div>
                        <Badge variant="outline" className="w-fit border-primary/20 bg-primary/5 text-primary">
                            {validHistory.length} record{validHistory.length === 1 ? '' : 's'}
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent>
                    {validHistory.length === 0 ? (
                        <div className="py-16 text-center">
                            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full border border-border bg-card">
                                <CheckCircle className="size-8 text-muted-foreground/40" />
                            </div>
                            <p className="text-lg font-semibold text-foreground">{t('myAttendance.noRecords', 'No attendance records found.')}</p>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Your attended sessions will appear here once attendance is recorded.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid gap-4 md:hidden">
                                {validHistory.map((record) => (
                                    <div key={record.id} className="rounded-2xl border border-border bg-background/60 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <p className="text-lg font-semibold text-foreground">
                                                    {record.training?.title || t('myAttendance.unknownTraining', 'Unknown Training')}
                                                </p>
                                                <p className="mt-1 text-sm text-muted-foreground">{record.training?.program}</p>
                                            </div>
                                            {getMethodBadge(record.method)}
                                        </div>

                                        <div className="mt-4 grid gap-3 text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Calendar className="size-4" />
                                                <span>
                                                    {record.training?.date ? format(new Date(record.training.date), 'MMM dd, yyyy') : t('myAttendance.notAvailable', 'N/A')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <Clock className="size-4" />
                                                <span>{record.training?.startTime} - {record.training?.endTime}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <MapPin className="size-4" />
                                                <span>{record.training?.hall?.name || t('myAttendance.unknownHall', 'Unknown Hall')}</span>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                            <span>Marked via {getMethodLabel(record.method)}</span>
                                            <span>•</span>
                                            <span>{format(new Date(record.timestamp), 'h:mm a')}</span>
                                        </div>

                                        {record.training && (
                                            <div className="mt-5 flex flex-col gap-2">
                                                {record.training.status === 'completed' && (
                                                    submittedFeedback[record.training.id] ? (
                                                        <Badge variant="outline" className="w-fit gap-1 border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-600 dark:text-emerald-400">
                                                            <Star className="size-3.5 fill-current" />
                                                            Feedback Submitted
                                                        </Badge>
                                                    ) : (
                                                        <Button variant="outline" size="sm" className="justify-start" onClick={() => openFeedbackDialog(record)}>
                                                            <MessageSquareMore className="mr-2 size-4" />
                                                            Give Feedback
                                                        </Button>
                                                    )
                                                )}
                                                <Button variant="ghost" size="sm" className="justify-start" onClick={() => navigate(`/trainings/${record.training.id}`)}>
                                                    <Eye className="mr-2 size-4" />
                                                    {t('myAttendance.viewDetails', 'View Details')}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="hidden rounded-2xl border border-border md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-border hover:bg-transparent">
                                            <TableHead>{t('myAttendance.table.training', 'Training')}</TableHead>
                                            <TableHead>{t('myAttendance.table.dateTime', 'Date & Time')}</TableHead>
                                            <TableHead>{t('myAttendance.table.venue', 'Venue')}</TableHead>
                                            <TableHead>{t('myAttendance.table.method', 'Method')}</TableHead>
                                            <TableHead className="text-right">{t('myAttendance.table.actions', 'Actions')}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {validHistory.map((record) => (
                                            <TableRow key={record.id} className="border-border">
                                                <TableCell>
                                                    <div className="font-medium text-base">
                                                        {record.training?.title || t('myAttendance.unknownTraining', 'Unknown Training')}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground">
                                                        {record.training?.program}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <Calendar className="size-4 text-muted-foreground" />
                                                        {record.training?.date ? format(new Date(record.training.date), 'MMM dd, yyyy') : t('myAttendance.notAvailable', 'N/A')}
                                                    </div>
                                                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                                                        <Clock className="size-4 text-muted-foreground" />
                                                        {record.training?.startTime} - {record.training?.endTime}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <MapPin className="size-4 text-muted-foreground" />
                                                        {record.training?.hall?.name || t('myAttendance.unknownHall', 'Unknown Hall')}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getMethodBadge(record.method)}
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        {format(new Date(record.timestamp), 'h:mm a')}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {record.training && (
                                                        <div className="flex justify-end gap-2">
                                                            {record.training.status === 'completed' && (
                                                                submittedFeedback[record.training.id] ? (
                                                                    <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-emerald-600 dark:text-emerald-400">
                                                                        <Star className="size-3.5 fill-current" />
                                                                        Feedback Submitted
                                                                    </Badge>
                                                                ) : (
                                                                    <Button variant="outline" size="sm" onClick={() => openFeedbackDialog(record)}>
                                                                        <MessageSquareMore className="mr-2 size-4" />
                                                                        Give Feedback
                                                                    </Button>
                                                                )
                                                            )}
                                                            <Button variant="ghost" size="sm" onClick={() => navigate(`/trainings/${record.training.id}`)}>
                                                                <Eye className="mr-2 size-4" />
                                                                {t('myAttendance.viewDetails', 'View Details')}
                                                            </Button>
                                                        </div>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {selectedTraining && (
                <FeedbackSubmissionDialog
                    trainingId={selectedTraining.id}
                    trainingTitle={selectedTraining.title}
                    open={feedbackDialogOpen}
                    onOpenChange={setFeedbackDialogOpen}
                    onSubmitted={(feedback) => handleFeedbackSubmitted(selectedTraining.id, {
                        id: feedback.id,
                        trainingId: feedback.trainingId,
                        submittedAt: feedback.submittedAt,
                        rating: feedback.rating,
                        anonymous: feedback.anonymous
                    })}
                />
            )}
        </div>
    );
};

export default MyAttendance;
