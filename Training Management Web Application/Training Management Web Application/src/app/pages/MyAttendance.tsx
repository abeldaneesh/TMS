import React, { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
    Eye,
    Calendar,
    Clock,
    MapPin,
    CheckCircle,
    MessageSquareMore,
    Star,
    CalendarCheck,
    QrCode,
    MessageCircleMore,
    History,
    Search,
    X,
    FileDown,
    Download,
    TrendingUp,
} from 'lucide-react';
import { attendanceApi, feedbackApi, nominationsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { MyFeedbackSubmission, Nomination } from '../../types';
import { toast } from 'sonner';
import LoadingScreen from '../components/LoadingScreen';
import FeedbackSubmissionDialog from '../components/FeedbackSubmissionDialog';
import DateInputWithPickerIcon from '../components/DateInputWithPickerIcon';
import { downloadFile } from '../../utils/fileDownloader';
import {
    getTrainingDateInputValue,
    getTrainingSearchableDateText,
    getTrainingSortTimestamp,
    normalizeTrainingMatchValue,
} from '../../utils/trainingFilters';

type AttendanceReportRow = {
    trainingId: string;
    title: string;
    program: string;
    scheduledDate: string;
    venue: string;
    attendanceStatus: 'Attended' | 'Absent' | 'Pending';
    attendanceMethod: string;
    attendanceMarkedAt: string;
    feedbackStatus: string;
    sortTimestamp: number;
};

const getEntityId = (value: any): string => {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    return value?.id || value?._id || '';
};

const sanitizeFilePart = (value: string, fallback = 'attendance') => {
    const normalized = String(value || '').trim().replace(/[^\w.-]+/g, '_');
    return normalized || fallback;
};

const formatDateLabel = (value: Date | string | undefined | null, fallback = 'N/A') => {
    if (!value) return fallback;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : format(parsed, 'MMM dd, yyyy');
};

const formatDateTimeLabel = (value: Date | string | undefined | null, fallback = 'Not marked') => {
    if (!value) return fallback;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : format(parsed, 'MMM dd, yyyy h:mm a');
};

const formatTimeLabel = (value: Date | string | undefined | null, fallback = '') => {
    if (!value) return fallback;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? fallback : format(parsed, 'h:mm a');
};

const getAttendanceHistorySortTimestamp = (record: any) => {
    if (record?.training) {
        return getTrainingSortTimestamp(record.training);
    }

    const timestamp = new Date(record?.timestamp).getTime();
    return Number.isNaN(timestamp) ? 0 : timestamp;
};

const getAttendanceMethodLabel = (record?: any | null) => {
    if (!record) return 'Not attended';
    if (record.attendanceType === 'late') return 'Late manual entry';
    if (record.method === 'qr') return 'QR Scan';
    if (record.method === 'manual') return 'Sign-in Sheet';
    return 'Manual';
};

const MyAttendance: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [participantNominations, setParticipantNominations] = useState<Nomination[]>([]);
    const [submittedFeedback, setSubmittedFeedback] = useState<Record<string, MyFeedbackSubmission>>({});
    const [loading, setLoading] = useState(true);
    const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
    const [selectedTraining, setSelectedTraining] = useState<any | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [exportingFormat, setExportingFormat] = useState<'pdf' | 'csv' | null>(null);

    useEffect(() => {
        let cancelled = false;

        const fetchHistory = async () => {
            if (!user?.id) {
                setLoading(false);
                return;
            }

            setLoading(true);

            const [attendanceResult, feedbackResult, nominationsResult] = await Promise.allSettled([
                attendanceApi.getMyHistory(),
                feedbackApi.getMySubmissions(),
                nominationsApi.getAll({ participantId: user.id }),
            ]);

            if (cancelled) return;

            if (attendanceResult.status === 'fulfilled') {
                setAttendanceHistory(Array.isArray(attendanceResult.value) ? attendanceResult.value : []);
            } else {
                console.error('Failed to fetch attendance history', attendanceResult.reason);
                setAttendanceHistory([]);
                toast.error(t('myAttendance.loadError', 'Failed to load attendance history'));
            }

            if (feedbackResult.status === 'fulfilled') {
                setSubmittedFeedback(
                    feedbackResult.value.reduce((acc, item) => {
                        acc[item.trainingId] = item;
                        return acc;
                    }, {} as Record<string, MyFeedbackSubmission>)
                );
            } else {
                console.error('Failed to fetch feedback submissions', feedbackResult.reason);
                setSubmittedFeedback({});
            }

            if (nominationsResult.status === 'fulfilled') {
                setParticipantNominations(Array.isArray(nominationsResult.value) ? nominationsResult.value : []);
            } else {
                console.error('Failed to fetch participant nominations', nominationsResult.reason);
                setParticipantNominations([]);
            }

            setLoading(false);
        };

        fetchHistory();

        return () => {
            cancelled = true;
        };
    }, [t, user?.id]);

    const validHistory = useMemo(
        () => attendanceHistory.filter((record) => record.training),
        [attendanceHistory]
    );

    const sortedHistory = useMemo(
        () => [...validHistory].sort((a, b) => getAttendanceHistorySortTimestamp(b) - getAttendanceHistorySortTimestamp(a)),
        [validHistory]
    );

    const hasActiveFilters = Boolean(searchTerm.trim() || fromDate || toDate);
    const normalizedSearchTerm = normalizeTrainingMatchValue(searchTerm);

    const filteredHistory = useMemo(() => {
        return sortedHistory.filter((record) => {
            const trainingDate = getTrainingDateInputValue(record.training?.date);
            if (fromDate && trainingDate && trainingDate < fromDate) return false;
            if (toDate && trainingDate && trainingDate > toDate) return false;

            if (!normalizedSearchTerm) return true;

            const searchText = [
                record.training?.title,
                record.training?.program,
                record.training?.hall?.name,
                getTrainingSearchableDateText(record.training?.date),
            ]
                .filter(Boolean)
                .join(' ');

            return normalizeTrainingMatchValue(searchText).includes(normalizedSearchTerm);
        });
    }, [sortedHistory, fromDate, toDate, normalizedSearchTerm]);

    const attendanceByTrainingId = useMemo(() => {
        const records = new Map<string, any>();

        validHistory.forEach((record) => {
            const trainingId = getEntityId(record.training);
            if (!trainingId) return;

            const existingRecord = records.get(trainingId);
            const currentTimestamp = new Date(record.timestamp).getTime();
            const existingTimestamp = existingRecord ? new Date(existingRecord.timestamp).getTime() : 0;

            if (!existingRecord || currentTimestamp >= existingTimestamp) {
                records.set(trainingId, record);
            }
        });

        return records;
    }, [validHistory]);

    const activeNominations = useMemo(() => {
        const records = new Map<string, Nomination>();

        participantNominations.forEach((nomination) => {
            if (nomination.status === 'rejected') return;

            const trainingId = getEntityId(nomination.training) || getEntityId(nomination.trainingId);
            if (!trainingId) return;

            const existingNomination = records.get(trainingId);
            if (!existingNomination || nomination.status === 'attended') {
                records.set(trainingId, nomination);
            }
        });

        return Array.from(records.values());
    }, [participantNominations]);

    const todayKey = getTrainingDateInputValue(new Date());

    const reportRows = useMemo<AttendanceReportRow[]>(() => {
        return activeNominations
            .map((nomination) => {
                const trainingId = getEntityId(nomination.training) || getEntityId(nomination.trainingId);
                const attendanceRecord = attendanceByTrainingId.get(trainingId);
                const training = attendanceRecord?.training || nomination.training;
                const trainingDateKey = getTrainingDateInputValue(training?.date);
                const isPastTraining = Boolean(trainingDateKey && trainingDateKey < todayKey);
                const feedbackStatus = attendanceRecord
                    ? submittedFeedback[trainingId]
                        ? 'Submitted'
                        : training?.status === 'completed'
                            ? 'Pending'
                            : 'Not available'
                    : 'Not available';

                return {
                    trainingId,
                    title: training?.title || t('myAttendance.unknownTraining', 'Unknown Training'),
                    program: training?.program || 'N/A',
                    scheduledDate: formatDateLabel(training?.date),
                    venue: training?.hall?.name || 'N/A',
                    attendanceStatus: attendanceRecord ? 'Attended' : isPastTraining ? 'Absent' : 'Pending',
                    attendanceMethod: getAttendanceMethodLabel(attendanceRecord),
                    attendanceMarkedAt: formatDateTimeLabel(attendanceRecord?.timestamp),
                    feedbackStatus,
                    sortTimestamp: training ? getTrainingSortTimestamp(training as any) : 0,
                };
            })
            .sort((a, b) => b.sortTimestamp - a.sortTimestamp);
    }, [activeNominations, attendanceByTrainingId, submittedFeedback, t, todayKey]);

    const attendanceSummary = useMemo(() => {
        const assignedCount = reportRows.length;
        const attendedCount = reportRows.filter((row) => row.attendanceStatus === 'Attended').length;
        const absentCount = reportRows.filter((row) => row.attendanceStatus === 'Absent').length;
        const pendingCount = reportRows.filter((row) => row.attendanceStatus === 'Pending').length;

        return {
            assignedCount,
            attendedCount,
            absentCount,
            pendingCount,
            attendanceRate: assignedCount > 0 ? Math.round((attendedCount / assignedCount) * 100) : 0,
        };
    }, [reportRows]);

    const qrCount = validHistory.filter((record) => record.method === 'qr').length;
    const feedbackPendingCount = validHistory.filter(
        (record) => record.training?.status === 'completed' && !submittedFeedback[record.training.id]
    ).length;
    const latestAttendance = validHistory.reduce<any | null>((latest, record) => {
        if (!record.timestamp) return latest;
        if (!latest?.timestamp) return record;
        return new Date(record.timestamp).getTime() > new Date(latest.timestamp).getTime() ? record : latest;
    }, null);

    const getMethodBadge = (method: string) => {
        return method === 'qr'
            ? <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{t('myAttendance.methods.qr', 'QR Scan')}</Badge>
            : <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">{t('myAttendance.methods.manual', 'Manual')}</Badge>;
    };

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

    const clearFilters = () => {
        setSearchTerm('');
        setFromDate('');
        setToDate('');
    };

    const handleExportReport = async (formatType: 'pdf' | 'csv') => {
        if (attendanceSummary.assignedCount === 0) {
            toast.error(t('myAttendance.reportUnavailable', 'No attendance summary is available to export yet.'));
            return;
        }

        const generatedOn = new Date();
        const participantName = user?.name || t('myAttendance.participantFallback', 'Participant');
        const exportFileBase = `Attendance_Summary_${sanitizeFilePart(participantName, 'participant')}_${format(generatedOn, 'yyyy-MM-dd')}`;

        try {
            setExportingFormat(formatType);

            if (formatType === 'pdf') {
                const doc = new jsPDF();

                doc.setFontSize(20);
                doc.text('Attendance Summary Report', 14, 20);

                doc.setFontSize(10);
                doc.text(`Participant: ${participantName}`, 14, 32);
                doc.text(`Email: ${user?.email || 'N/A'}`, 14, 39);
                doc.text(`Generated on: ${format(generatedOn, 'MMM dd, yyyy h:mm a')}`, 14, 46);

                doc.setFontSize(13);
                doc.text('Overall Attendance', 14, 58);

                doc.setFontSize(10);
                doc.text(`Assigned trainings: ${attendanceSummary.assignedCount}`, 14, 66);
                doc.text(`Trainings attended: ${attendanceSummary.attendedCount}`, 14, 73);
                doc.text(`Attendance percentage: ${attendanceSummary.attendanceRate}%`, 14, 80);
                doc.text(`Missed trainings: ${attendanceSummary.absentCount}`, 14, 87);
                doc.text(`Upcoming or pending trainings: ${attendanceSummary.pendingCount}`, 14, 94);

                const tableRows = reportRows.map((row) => [
                    row.title,
                    row.scheduledDate,
                    row.attendanceStatus,
                    row.attendanceMethod,
                    row.attendanceMarkedAt,
                    row.feedbackStatus,
                ]);

                autoTable(doc, {
                    startY: 104,
                    head: [['Training', 'Scheduled Date', 'Attendance', 'Method', 'Marked At', 'Feedback']],
                    body: tableRows,
                    theme: 'grid',
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [40, 84, 160] },
                });

                const pdfBlob = doc.output('blob');
                await downloadFile(pdfBlob, `${exportFileBase}.pdf`, 'application/pdf');
            } else {
                const csv = Papa.unparse([
                    ['Attendance Summary Report', ''],
                    ['Participant', participantName],
                    ['Email', user?.email || 'N/A'],
                    ['Generated On', format(generatedOn, 'yyyy-MM-dd HH:mm:ss')],
                    ['Assigned Trainings', String(attendanceSummary.assignedCount)],
                    ['Trainings Attended', String(attendanceSummary.attendedCount)],
                    ['Attendance Percentage', `${attendanceSummary.attendanceRate}%`],
                    ['Missed Trainings', String(attendanceSummary.absentCount)],
                    ['Upcoming or Pending Trainings', String(attendanceSummary.pendingCount)],
                    [],
                    ['Training', 'Program', 'Scheduled Date', 'Venue', 'Attendance', 'Method', 'Marked At', 'Feedback'],
                    ...reportRows.map((row) => [
                        row.title,
                        row.program,
                        row.scheduledDate,
                        row.venue,
                        row.attendanceStatus,
                        row.attendanceMethod,
                        row.attendanceMarkedAt,
                        row.feedbackStatus,
                    ]),
                ]);

                const csvBlob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
                await downloadFile(csvBlob, `${exportFileBase}.csv`, 'text/csv');
            }

            toast.success(t('myAttendance.reportReady', 'Attendance report generated successfully.'));
        } catch (error) {
            console.error('Failed to export attendance report', error);
            toast.error(t('myAttendance.reportError', 'Failed to generate attendance report.'));
        } finally {
            setExportingFormat(null);
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <div className="mx-auto max-w-7xl space-y-8">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('myAttendance.title', 'My Attendance')}</h1>
                <p className="text-muted-foreground">{t('myAttendance.subtitle', 'History of trainings you have attended')}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Attendance rate</p>
                                <p className="mt-3 text-3xl font-bold text-foreground">{attendanceSummary.attendanceRate}%</p>
                            </div>
                            <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                <TrendingUp className="size-5" />
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
                                    {formatDateLabel(latestAttendance?.timestamp, t('myAttendance.notAvailable', 'N/A'))}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {formatTimeLabel(latestAttendance?.timestamp)}
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
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                            <CardTitle className="text-2xl">{t('myAttendance.cardTitle', 'Attended Trainings')}</CardTitle>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Search attended trainings, review attendance details, and export your attendance summary.
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="w-fit border-primary/20 bg-primary/5 text-primary">
                                {hasActiveFilters
                                    ? `${filteredHistory.length} of ${validHistory.length} record${validHistory.length === 1 ? '' : 's'}`
                                    : `${validHistory.length} record${validHistory.length === 1 ? '' : 's'}`}
                            </Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportReport('pdf')}
                                disabled={exportingFormat !== null || attendanceSummary.assignedCount === 0}
                            >
                                <FileDown className="mr-2 size-4" />
                                {exportingFormat === 'pdf' ? 'Generating PDF...' : 'Generate PDF'}
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleExportReport('csv')}
                                disabled={exportingFormat !== null || attendanceSummary.assignedCount === 0}
                            >
                                <Download className="mr-2 size-4" />
                                {exportingFormat === 'csv' ? 'Exporting CSV...' : 'Export CSV'}
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="rounded-2xl border border-border bg-muted/20 p-4">
                        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                                <p className="text-sm font-semibold text-foreground">Overall attendance summary</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    {attendanceSummary.attendedCount} of {attendanceSummary.assignedCount} assigned training
                                    {attendanceSummary.assignedCount === 1 ? '' : 's'} attended, for a total attendance rate of {attendanceSummary.attendanceRate}%.
                                </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                    Attended {attendanceSummary.attendedCount}
                                </Badge>
                                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                                    Missed {attendanceSummary.absentCount}
                                </Badge>
                                <Badge variant="outline" className="border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400">
                                    Pending {attendanceSummary.pendingCount}
                                </Badge>
                            </div>
                        </div>
                    </div>

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
                            <div className="rounded-2xl border border-border bg-background p-4">
                                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
                                    <div className="relative">
                                        <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-primary/60" />
                                        <Input
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            placeholder={t('myAttendance.searchPlaceholder', 'Search by training name, program, or venue')}
                                            className="h-11 rounded-xl bg-input-background pl-10"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">From</p>
                                        <DateInputWithPickerIcon
                                            wrapperClassName="w-full"
                                            value={fromDate}
                                            onChange={(e) => setFromDate(e.target.value)}
                                            className="h-11 rounded-xl bg-input-background"
                                            aria-label="Filter attendance from date"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">To</p>
                                        <DateInputWithPickerIcon
                                            wrapperClassName="w-full"
                                            value={toDate}
                                            onChange={(e) => setToDate(e.target.value)}
                                            className="h-11 rounded-xl bg-input-background"
                                            aria-label="Filter attendance to date"
                                        />
                                    </div>

                                    <Button
                                        type="button"
                                        variant="ghost"
                                        onClick={clearFilters}
                                        disabled={!hasActiveFilters}
                                        className="h-11"
                                    >
                                        <X className="mr-2 size-4" />
                                        {t('myAttendance.clearFilters', 'Clear filters')}
                                    </Button>
                                </div>
                            </div>

                            {filteredHistory.length === 0 ? (
                                <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-4 py-10 text-center">
                                    <p className="text-lg font-semibold text-foreground">
                                        {t('myAttendance.noFilterMatches', 'No trainings matched your current search or date filters.')}
                                    </p>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        {t('myAttendance.adjustFilters', 'Try another training name or widen the selected date range.')}
                                    </p>
                                </div>
                            ) : (
                                <>
                                    <div className="grid gap-4 md:hidden">
                                        {filteredHistory.map((record) => (
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
                                                            {formatDateLabel(record.training?.date, t('myAttendance.notAvailable', 'N/A'))}
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
                                                    <span>Marked via {getAttendanceMethodLabel(record)}</span>
                                                    <span>•</span>
                                                    <span>{formatTimeLabel(record.timestamp, t('myAttendance.notAvailable', 'N/A'))}</span>
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
                                                {filteredHistory.map((record) => (
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
                                                                {formatDateLabel(record.training?.date, t('myAttendance.notAvailable', 'N/A'))}
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
                                                                {formatTimeLabel(record.timestamp, t('myAttendance.notAvailable', 'N/A'))}
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
                                </>
                            )}
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
