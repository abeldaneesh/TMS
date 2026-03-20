import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Eye, Calendar, Clock, MapPin, CheckCircle, MessageSquareMore, Star } from 'lucide-react';
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

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">{t('myAttendance.title', 'My Attendance')}</h1>
                <p className="mt-1 text-muted-foreground">{t('myAttendance.subtitle', 'History of trainings you have attended')}</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('myAttendance.cardTitle', 'Attended Trainings')}</CardTitle>
                </CardHeader>
                <CardContent>
                    {validHistory.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle className="size-12 mx-auto mb-3 text-muted-foreground/40" />
                            <p className="text-muted-foreground">{t('myAttendance.noRecords', 'No attendance records found.')}</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>{t('myAttendance.table.training', 'Training')}</TableHead>
                                        <TableHead>{t('myAttendance.table.dateTime', 'Date & Time')}</TableHead>
                                        <TableHead>{t('myAttendance.table.venue', 'Venue')}</TableHead>
                                        <TableHead>{t('myAttendance.table.method', 'Method')}</TableHead>
                                        <TableHead className="text-right">{t('myAttendance.table.actions', 'Actions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {validHistory.map((record) => (
                                        <TableRow key={record.id}>
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
                                                                    <MessageSquareMore className="size-4 mr-2" />
                                                                    Give Feedback
                                                                </Button>
                                                            )
                                                        )}
                                                        <Button variant="ghost" size="sm" onClick={() => navigate(`/trainings/${record.training.id}`)}>
                                                            <Eye className="size-4 mr-2" />
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
