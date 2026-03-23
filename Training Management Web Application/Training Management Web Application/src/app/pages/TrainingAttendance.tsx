import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import {
    ArrowLeft,
    CheckCircle2,
    Clock3,
    FileDown,
    Loader2,
    QrCode,
    ShieldCheck,
    UserCheck,
    UserX,
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceApi, nominationsApi, trainingsApi } from '../../services/api';
import { Attendance, Nomination, Training } from '../../types';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Checkbox } from '../components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { generateAttendanceSheetPdf } from '../../utils/attendanceSheet';
import { getTrainingEndDateTime, getTrainingStartDateTime } from '../../utils/trainingTime';
import LoadingScreen from '../components/LoadingScreen';

const nominationStatusPriority: Record<string, number> = {
    attended: 3,
    approved: 2,
    nominated: 1,
    rejected: 0,
};

const getNominationTimestamp = (nomination: Nomination) =>
    new Date(nomination.approvedAt || nomination.nominatedAt || 0).getTime();

const getNominationTrainingId = (nomination: Nomination) =>
    typeof nomination.trainingId === 'object'
        ? (nomination.trainingId as any)?.id || (nomination.trainingId as any)?._id || ''
        : nomination.trainingId || '';

const dedupeParticipantNominations = (nominations: Nomination[]) => {
    const byParticipant = new Map<string, Nomination>();

    nominations.forEach((nomination) => {
        const participantKey = nomination.participantId || nomination.id;
        const existing = byParticipant.get(participantKey);

        if (!existing) {
            byParticipant.set(participantKey, nomination);
            return;
        }

        const existingPriority = nominationStatusPriority[existing.status] ?? -1;
        const nextPriority = nominationStatusPriority[nomination.status] ?? -1;

        if (nextPriority > existingPriority) {
            byParticipant.set(participantKey, nomination);
            return;
        }

        if (nextPriority === existingPriority && getNominationTimestamp(nomination) > getNominationTimestamp(existing)) {
            byParticipant.set(participantKey, nomination);
        }
    });

    return Array.from(byParticipant.values());
};

const TrainingAttendance: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [participants, setParticipants] = useState<Nomination[]>([]);
    const [training, setTraining] = useState<Training | null>(null);
    const [selectedManualParticipantIds, setSelectedManualParticipantIds] = useState<string[]>([]);
    const [selectedLateParticipantIds, setSelectedLateParticipantIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    const fetchAttendance = async () => {
        if (!id) return;

        setLoading(true);
        try {
            const [attendanceData, nominationsData, trainingData] = await Promise.all([
                attendanceApi.getAll({ trainingId: id }),
                nominationsApi.getAll({ trainingId: id }).catch(() => []),
                trainingsApi.getById(id),
            ]);

            setAttendances(Array.isArray(attendanceData) ? attendanceData : []);
            setParticipants(
                Array.isArray(nominationsData)
                    ? dedupeParticipantNominations(
                        nominationsData.filter((nomination) =>
                            getNominationTrainingId(nomination) === id &&
                            (nomination.status === 'approved' || nomination.status === 'attended' || nomination.status === 'nominated')
                        )
                    )
                    : []
            );
            setTraining(trainingData || null);
            setSelectedManualParticipantIds([]);
            setSelectedLateParticipantIds([]);
        } catch (error: any) {
            console.error('Failed to fetch attendance:', error);
            toast.error(error?.response?.data?.message || 'Failed to load attendance overview');
            navigate(id ? `/trainings/${id}` : '/trainings');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAttendance();
    }, [id]);

    const qrCount = attendances.filter((record) => record.method === 'qr').length;
    const manualCount = attendances.filter((record) => record.method === 'manual' && record.attendanceType !== 'late').length;
    const lateCount = attendances.filter((record) => record.attendanceType === 'late').length;
    const latestAttendance = attendances.reduce<Attendance | null>((latest, current) => {
        if (!current.timestamp) return latest;
        if (!latest?.timestamp) return current;
        return new Date(current.timestamp).getTime() > new Date(latest.timestamp).getTime() ? current : latest;
    }, null);

    const getMethodLabel = (method?: Attendance['method']) => {
        if (method === 'qr') return 'QR Scan';
        if (method === 'manual') return 'Sign-in Sheet';
        if (method === 'digital') return 'Digital';
        return 'Unknown';
    };

    const getAttendanceTypeLabel = (record: Attendance) => {
        if (record.attendanceType === 'late') return 'Present (Late)';
        if (record.method === 'manual') return 'Present (Manual)';
        if (record.method === 'qr') return 'Present (QR)';
        return 'Present';
    };

    const getInitials = (name?: string) =>
        (name || 'Unknown')
            .split(' ')
            .map((part) => part[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);

    const hasAttendanceRecord = (participantId?: string) =>
        Boolean(participantId && attendances.some((record) => record.participantId === participantId));

    const canManageAttendance = Boolean(
        training &&
        (user?.role === 'master_admin' || (user?.role === 'program_officer' && training.createdById === user.id))
    );

    const trainingStart = training ? getTrainingStartDateTime(training) : null;

    const canGenerateAttendanceSheet = Boolean(training && canManageAttendance && training.status !== 'completed');
    const canMarkManualAttendance = Boolean(training && canManageAttendance && training.status !== 'completed' && trainingStart && new Date() >= trainingStart);

    const canManageLateAttendance = useMemo(() => {
        if (!training || !canManageAttendance) return false;
        if (training.status === 'completed') return false;
        const sessionEnd = getTrainingEndDateTime(training);
        const windowHours = training.lateAttendanceWindowHours || 4;
        const windowEnd = new Date(sessionEnd.getTime() + windowHours * 60 * 60 * 1000);
        const now = new Date();
        return now >= sessionEnd && now <= windowEnd;
    }, [training, canManageAttendance]);

    const eligibleManualParticipants = participants.filter((nomination) => nomination.participantId && !hasAttendanceRecord(nomination.participantId));
    const eligibleLateParticipants = participants.filter((nomination) => nomination.participantId && !hasAttendanceRecord(nomination.participantId));

    const toggleManualParticipant = (participantId: string) => {
        setSelectedManualParticipantIds((prev) =>
            prev.includes(participantId) ? prev.filter((entry) => entry !== participantId) : [...prev, participantId]
        );
    };

    const toggleLateParticipant = (participantId: string) => {
        setSelectedLateParticipantIds((prev) =>
            prev.includes(participantId) ? prev.filter((entry) => entry !== participantId) : [...prev, participantId]
        );
    };

    const generateAttendanceSheet = async () => {
        if (!training) return;

        try {
            await generateAttendanceSheetPdf({
                training,
                participants,
                generatedByName: user?.name,
            });
            toast.success('Attendance sheet generated successfully.');
        } catch (error) {
            console.error('Error generating attendance sheet:', error);
            toast.error('Failed to generate attendance sheet');
        }
    };

    const markManualAttendance = async (participantIds: string[]) => {
        if (!id || participantIds.length === 0) return;
        const label = participantIds.length === 1 ? 'this participant' : `${participantIds.length} participants`;
        if (!window.confirm(`Are you sure you want to mark ${label} from the sign-in sheet?`)) return;

        try {
            setSubmitting(true);
            const result = await attendanceApi.markManualAttendance(id, participantIds);
            toast.success(
                result.markedCount > 0
                    ? `Manual attendance marked for ${result.markedCount} participant${result.markedCount === 1 ? '' : 's'}.`
                    : 'No eligible participants were marked from the sign-in sheet.'
            );
            await fetchAttendance();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to mark manual attendance');
        } finally {
            setSubmitting(false);
        }
    };

    const markLateAttendance = async (participantIds: string[]) => {
        if (!id || participantIds.length === 0) return;
        const label = participantIds.length === 1 ? 'this participant' : `${participantIds.length} participants`;
        if (!window.confirm(`Are you sure you want to mark ${label} as late?`)) return;

        try {
            setSubmitting(true);
            const result = await attendanceApi.markLateAttendance(id, participantIds);
            toast.success(
                result.markedCount > 0
                    ? `Late attendance marked for ${result.markedCount} participant${result.markedCount === 1 ? '' : 's'}.`
                    : 'No eligible participants were marked late.'
            );
            await fetchAttendance();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to mark late attendance');
        } finally {
            setSubmitting(false);
        }
    };

    const summaryCards = [
        {
            label: 'Total marked',
            value: attendances.length,
            icon: CheckCircle2,
            accentClass: 'bg-primary/10 text-primary',
        },
        {
            label: 'QR check-ins',
            value: qrCount,
            icon: QrCode,
            accentClass: 'bg-primary/10 text-primary',
        },
        {
            label: 'Manual sign-ins',
            value: manualCount,
            icon: ShieldCheck,
            accentClass: 'bg-emerald-500/10 text-emerald-400',
        },
        {
            label: 'Late entries',
            value: lateCount,
            icon: Clock3,
            accentClass: 'bg-amber-500/10 text-amber-500',
        },
    ];

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <div className="pb-12 space-y-6 text-foreground">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="space-y-3">
                    <Button
                        variant="outline"
                        className="w-fit border-white/10 hover:bg-white/10"
                        onClick={() => navigate(training ? `/trainings/${training.id}` : '/trainings')}
                    >
                        <ArrowLeft className="mr-2 size-4" />
                        Back to Training
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Attendance Overview</h1>
                        <p className="mt-2 text-sm text-muted-foreground">
                            Review who checked in for <span className="font-medium text-foreground">{training?.title || 'this training'}</span> and manage manual attendance in one place.
                        </p>
                    </div>
                </div>

                {training && (
                    <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[460px]">
                        <div className="rounded-2xl border border-border bg-card px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Session date</p>
                            <p className="mt-2 text-sm font-semibold text-foreground">{format(new Date(training.date), 'MMM d, yyyy')}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Time</p>
                            <p className="mt-2 text-sm font-semibold text-foreground">{training.startTime} - {training.endTime}</p>
                        </div>
                        <div className="rounded-2xl border border-border bg-card px-4 py-3">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Status</p>
                            <p className="mt-2 text-sm font-semibold capitalize text-foreground">{training.status}</p>
                        </div>
                    </div>
                )}
            </div>

            <div className="grid gap-4 lg:grid-cols-4">
                {summaryCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <div key={card.label} className="rounded-2xl border border-border bg-card p-5">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">{card.label}</p>
                                    <p className="mt-3 text-3xl font-bold text-foreground">{card.value}</p>
                                </div>
                                <div className={`rounded-xl p-2 ${card.accentClass}`}>
                                    <Icon className="size-5" />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.85fr)]">
                <div className="space-y-6">
                    {canGenerateAttendanceSheet && (
                        <section className="rounded-3xl border border-primary/15 bg-primary/5 p-6">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="max-w-2xl">
                                    <h2 className="text-xl font-semibold text-foreground">Attendance Sheet</h2>
                                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                                        Generate the printable sign-in sheet before the session or while it is running so offline attendance can still be captured cleanly.
                                    </p>
                                </div>
                                <Button onClick={generateAttendanceSheet} variant="outline" className="font-medium md:shrink-0">
                                    <FileDown className="mr-2 size-4" />
                                    Generate Attendance Sheet
                                </Button>
                            </div>
                        </section>
                    )}

                    {canMarkManualAttendance && (
                        <section className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-6">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="max-w-2xl">
                                    <h2 className="text-xl font-semibold text-emerald-400">Mark from Sign-in Sheet</h2>
                                    <p className="mt-2 text-sm leading-6 text-emerald-100/85">
                                        Select participants who signed the physical sheet but missed QR check-in, then confirm to record manual attendance.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/15 hover:text-emerald-300 md:shrink-0"
                                    disabled={selectedManualParticipantIds.length === 0 || submitting}
                                    onClick={() => markManualAttendance(selectedManualParticipantIds)}
                                >
                                    <UserCheck className="mr-2 size-4" />
                                    Mark from Sheet
                                </Button>
                            </div>

                            <div className="mt-5">
                                {eligibleManualParticipants.length === 0 ? (
                                    <div className="rounded-2xl border border-emerald-500/15 bg-background/40 px-4 py-4 text-sm text-muted-foreground">
                                        All assigned participants already have attendance recorded.
                                    </div>
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {eligibleManualParticipants.map((nomination) => (
                                            <label
                                                key={`manual-${nomination.id}`}
                                                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-emerald-500/20 bg-background/60 p-4"
                                            >
                                                <Checkbox
                                                    checked={selectedManualParticipantIds.includes(nomination.participantId)}
                                                    onCheckedChange={() => toggleManualParticipant(nomination.participantId)}
                                                    aria-label={`Select ${nomination.participant?.name || 'participant'} for manual attendance`}
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-base font-semibold text-foreground">{nomination.participant?.name || 'Participant'}</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">{nomination.participant?.designation || 'Designation not available'}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {canManageLateAttendance && (
                        <section className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-6">
                            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                                <div className="max-w-2xl">
                                    <h2 className="text-xl font-semibold text-amber-400">Mark Late Attendance</h2>
                                    <p className="mt-2 text-sm leading-6 text-amber-100/85">
                                        The QR window is closed, but you can still record late attendance for assigned participants during the allowed grace period.
                                    </p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="border-amber-500/30 bg-amber-500/10 text-amber-400 hover:bg-amber-500/15 hover:text-amber-300 md:shrink-0"
                                    disabled={selectedLateParticipantIds.length === 0 || submitting}
                                    onClick={() => markLateAttendance(selectedLateParticipantIds)}
                                >
                                    <Clock3 className="mr-2 size-4" />
                                    Mark Late Attendance
                                </Button>
                            </div>

                            <div className="mt-5">
                                {eligibleLateParticipants.length === 0 ? (
                                    <div className="rounded-2xl border border-amber-500/15 bg-background/40 px-4 py-4 text-sm text-muted-foreground">
                                        No eligible participants are pending late attendance.
                                    </div>
                                ) : (
                                    <div className="grid gap-3 md:grid-cols-2">
                                        {eligibleLateParticipants.map((nomination) => (
                                            <label
                                                key={`late-${nomination.id}`}
                                                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-amber-500/20 bg-background/60 p-4"
                                            >
                                                <Checkbox
                                                    checked={selectedLateParticipantIds.includes(nomination.participantId)}
                                                    onCheckedChange={() => toggleLateParticipant(nomination.participantId)}
                                                    aria-label={`Select ${nomination.participant?.name || 'participant'} for late attendance`}
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-base font-semibold text-foreground">{nomination.participant?.name || 'Participant'}</p>
                                                    <p className="mt-1 text-sm text-muted-foreground">{nomination.participant?.designation || 'Designation not available'}</p>
                                                </div>
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>

                <aside className="space-y-6">
                    <section className="rounded-3xl border border-border bg-card p-6">
                        <div className="flex items-center justify-between gap-3">
                            <div>
                                <h2 className="text-xl font-semibold text-foreground">Session summary</h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    A quick read on the latest attendance activity for this training.
                                </p>
                            </div>
                            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                                {attendances.length} record{attendances.length === 1 ? '' : 's'}
                            </Badge>
                        </div>

                        <div className="mt-6 space-y-4">
                            <div className="rounded-2xl border border-border bg-background/60 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Latest check-in</p>
                                <p className="mt-3 text-sm font-semibold text-foreground">
                                    {latestAttendance?.timestamp ? format(new Date(latestAttendance.timestamp), 'MMM d, yyyy h:mm a') : 'No attendance yet'}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {latestAttendance?.participant?.name
                                        ? `${latestAttendance.participant.name} was the most recent participant recorded.`
                                        : 'The most recent attendance entry will appear here.'}
                                </p>
                            </div>

                            <div className="rounded-2xl border border-border bg-background/60 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Manual access</p>
                                <p className="mt-3 text-sm font-semibold text-foreground">
                                    {canMarkManualAttendance ? 'Available now' : 'Locked until session start'}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Manual attendance opens once the scheduled start time is reached.
                                </p>
                            </div>

                            <div className="rounded-2xl border border-border bg-background/60 p-4">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Late window</p>
                                <p className="mt-3 text-sm font-semibold text-foreground">
                                    {canManageLateAttendance ? 'Late marking is active' : 'Late marking not active'}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    Late attendance becomes available after the QR window closes and only for the configured grace period.
                                </p>
                            </div>
                        </div>
                    </section>
                </aside>
            </div>

            <section className="rounded-3xl border border-border bg-card">
                <div className="flex flex-col gap-3 border-b border-border px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">Recorded attendance</h2>
                        <p className="mt-2 text-sm text-muted-foreground">All attendance entries recorded for this training session.</p>
                    </div>
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                        {attendances.length} record{attendances.length === 1 ? '' : 's'}
                    </Badge>
                </div>

                {attendances.length === 0 ? (
                    <div className="flex min-h-[260px] flex-col items-center justify-center px-6 py-12 text-center">
                        <div className="rounded-full border border-border bg-card p-4">
                            <UserX className="size-10 text-muted-foreground/60" />
                        </div>
                        <p className="mt-4 text-lg font-semibold text-foreground">No attendance records yet</p>
                        <p className="mt-2 max-w-md text-sm text-muted-foreground">
                            Attendance entries will appear here once participants check in for this training.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="space-y-3 p-4 md:hidden">
                            {attendances.map((record) => (
                                <div key={record.id} className="rounded-2xl border border-border bg-background/70 p-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                            {getInitials(record.participant?.name)}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <p className="text-sm font-semibold text-foreground">{record.participant?.name || 'Unknown'}</p>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant="outline" className="border-border bg-card text-foreground">
                                                        {getMethodLabel(record.method)}
                                                    </Badge>
                                                    <Badge className={record.attendanceType === 'late' ? 'bg-amber-500/15 text-amber-500' : record.method === 'manual' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}>
                                                        {getAttendanceTypeLabel(record)}
                                                    </Badge>
                                                </div>
                                            </div>
                                            <div className="mt-3 grid gap-2 text-sm text-muted-foreground">
                                                <p>Email: {record.participant?.email || 'N/A'}</p>
                                                <p>Designation: {record.participant?.designation || 'N/A'}</p>
                                                <p>Time: {record.timestamp ? format(new Date(record.timestamp), 'MMM d, yyyy h:mm a') : 'Not available'}</p>
                                                {(record.attendanceType === 'late' || record.method === 'manual') && record.markedByName && (
                                                    <p>Marked by {record.markedByName}</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="hidden overflow-x-auto md:block">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Participant</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Designation</TableHead>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead>Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attendances.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                                        {getInitials(record.participant?.name)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-foreground">{record.participant?.name || 'Unknown'}</p>
                                                        <p className="text-xs text-muted-foreground">ID: {record.participantId}</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>{record.participant?.email || 'N/A'}</TableCell>
                                            <TableCell>{record.participant?.designation || 'N/A'}</TableCell>
                                            <TableCell>{record.timestamp ? format(new Date(record.timestamp), 'MMM d, yyyy h:mm a') : 'Not available'}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="border-border bg-card text-foreground">
                                                    {getMethodLabel(record.method)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <Badge className={record.attendanceType === 'late' ? 'bg-amber-500/15 text-amber-500' : record.method === 'manual' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}>
                                                        {getAttendanceTypeLabel(record)}
                                                    </Badge>
                                                    {(record.attendanceType === 'late' || record.method === 'manual') && record.markedByName && (
                                                        <p className="text-xs text-muted-foreground">Marked by {record.markedByName}</p>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </>
                )}
            </section>

            {submitting && (
                <div className="fixed bottom-6 right-6 z-50 rounded-full border border-border bg-card px-4 py-2 shadow-lg">
                    <div className="flex items-center gap-2 text-sm text-foreground">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        Updating attendance...
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrainingAttendance;
