import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from './ui/table';
import { attendanceApi, nominationsApi, trainingsApi } from '../../services/api';
import { Attendance, Nomination, Training } from '../../types';
import { format } from 'date-fns';
import { CalendarClock, CheckCircle2, Clock3, FileDown, Loader2, QrCode, ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { generateAttendanceSheetPdf } from '../../utils/attendanceSheet';

const nominationStatusPriority: Record<string, number> = {
    attended: 3,
    approved: 2,
    nominated: 1,
    rejected: 0,
};

const getNominationTimestamp = (nomination: Nomination) =>
    new Date(nomination.approvedAt || nomination.nominatedAt || 0).getTime();

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

interface AttendanceListModalProps {
    isOpen: boolean;
    onClose: () => void;
    trainingId: string;
    trainingTitle: string;
}

const AttendanceListModal: React.FC<AttendanceListModalProps> = ({
    isOpen,
    onClose,
    trainingId,
    trainingTitle,
}) => {
    const { user } = useAuth();
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [participants, setParticipants] = useState<Nomination[]>([]);
    const [training, setTraining] = useState<Training | null>(null);
    const [selectedManualParticipantIds, setSelectedManualParticipantIds] = useState<string[]>([]);
    const [selectedLateParticipantIds, setSelectedLateParticipantIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAttendance = async () => {
        if (!trainingId) return;

        setLoading(true);
        try {
            const [attendanceData, nominationsData, trainingData] = await Promise.all([
                attendanceApi.getAll({ trainingId }),
                nominationsApi.getAll({ trainingId }).catch(() => []),
                trainingsApi.getById(trainingId).catch(() => null),
            ]);
            setAttendances(attendanceData);
            setParticipants(
                Array.isArray(nominationsData)
                    ? dedupeParticipantNominations(nominationsData.filter((nom) => nom.status === 'approved' || nom.status === 'attended' || nom.status === 'nominated'))
                    : []
            );
            setTraining(trainingData);
            setSelectedManualParticipantIds([]);
            setSelectedLateParticipantIds([]);
        } catch (error) {
            console.error('Failed to fetch attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen && trainingId) {
            fetchAttendance();
        }
    }, [isOpen, trainingId]);

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

    const trainingStart = training
        ? (() => {
            const start = new Date(training.date);
            const [hours = '0', minutes = '0'] = String(training.startTime || '0:0').split(':');
            start.setHours(Number(hours), Number(minutes), 0, 0);
            return start;
        })()
        : null;

    const canGenerateAttendanceSheet = Boolean(training && canManageAttendance && training.status !== 'completed');
    const canMarkManualAttendance = Boolean(training && canManageAttendance && training.status !== 'completed' && trainingStart && new Date() >= trainingStart);

    const canManageLateAttendance = (() => {
        if (!training) return false;
        if (training.status === 'completed') return false;
        if (!canManageAttendance) return false;
        const sessionEnd = training.attendanceSession?.endTime
            ? new Date(training.attendanceSession.endTime)
            : (() => {
                const end = new Date(training.date);
                const [hours = '0', minutes = '0'] = String(training.endTime || '0:0').split(':');
                end.setHours(Number(hours), Number(minutes), 0, 0);
                return end;
            })();
        const windowHours = training.lateAttendanceWindowHours || 4;
        const windowEnd = new Date(sessionEnd.getTime() + windowHours * 60 * 60 * 1000);
        const now = new Date();
        return now > sessionEnd && now <= windowEnd;
    })();

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
        if (participantIds.length === 0) return;
        const label = participantIds.length === 1 ? 'this participant' : `${participantIds.length} participants`;
        if (!window.confirm(`Are you sure you want to mark ${label} from the sign-in sheet?`)) return;

        try {
            setLoading(true);
            const result = await attendanceApi.markManualAttendance(trainingId, participantIds);
            toast.success(
                result.markedCount > 0
                    ? `Manual attendance marked for ${result.markedCount} participant${result.markedCount === 1 ? '' : 's'}.`
                    : 'No eligible participants were marked from the sign-in sheet.'
            );
            await fetchAttendance();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to mark manual attendance');
        } finally {
            setLoading(false);
        }
    };

    const markLateAttendance = async (participantIds: string[]) => {
        if (participantIds.length === 0) return;
        const label = participantIds.length === 1 ? 'this participant' : `${participantIds.length} participants`;
        if (!window.confirm(`Are you sure you want to mark ${label} as late?`)) return;

        try {
            setLoading(true);
            const result = await attendanceApi.markLateAttendance(trainingId, participantIds);
            toast.success(
                result.markedCount > 0
                    ? `Late attendance marked for ${result.markedCount} participant${result.markedCount === 1 ? '' : 's'}.`
                    : 'No eligible participants were marked late.'
            );
            await fetchAttendance();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Failed to mark late attendance');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-h-[85vh] max-w-4xl overflow-y-auto border-border bg-background p-0 text-foreground">
                <DialogHeader className="border-b border-border px-6 py-5">
                    <DialogTitle className="text-2xl font-bold tracking-tight">
                        Attendance Overview
                    </DialogTitle>
                    <DialogDescription className="text-sm text-muted-foreground">
                        Review who checked in for <span className="font-medium text-foreground">{trainingTitle}</span> and how their attendance was recorded.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 px-6 py-10 text-center">
                        <Loader2 className="size-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Loading attendance records...</p>
                    </div>
                ) : (
                    <div className="space-y-6 px-6 py-6">
                        {canGenerateAttendanceSheet && (
                            <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-foreground">Attendance Sheet</p>
                                        <p className="mt-1 text-sm text-muted-foreground">
                                            Generate a printable sign-in sheet before the session or while it is running, then use it as an offline fallback for missed QR check-ins.
                                        </p>
                                    </div>
                                    <Button onClick={generateAttendanceSheet} variant="outline" className="font-medium">
                                        <FileDown className="mr-2 size-4" />
                                        Generate Attendance Sheet
                                    </Button>
                                </div>
                            </div>
                        )}

                        {canMarkManualAttendance && (
                            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-emerald-500">Mark from Sign-in Sheet</p>
                                        <p className="mt-1 text-sm text-emerald-500/90">
                                            Use the signed attendance sheet to mark participants who were present but did not complete QR check-in.
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 hover:text-emerald-400"
                                        disabled={selectedManualParticipantIds.length === 0 || loading}
                                        onClick={() => markManualAttendance(selectedManualParticipantIds)}
                                    >
                                        <UserCheck className="mr-2 size-4" />
                                        Mark from Sign-in Sheet
                                    </Button>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    {eligibleManualParticipants.length === 0 ? (
                                        <div className="text-sm text-muted-foreground">All approved participants already have attendance recorded.</div>
                                    ) : (
                                        eligibleManualParticipants.map((nomination) => (
                                            <label
                                                key={`manual-${nomination.id}`}
                                                className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-500/20 bg-background/60 p-3"
                                            >
                                                <Checkbox
                                                    checked={selectedManualParticipantIds.includes(nomination.participantId)}
                                                    onCheckedChange={() => toggleManualParticipant(nomination.participantId)}
                                                    aria-label={`Select ${nomination.participant?.name || 'participant'} for manual attendance`}
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-foreground">{nomination.participant?.name || 'Participant'}</p>
                                                    <p className="text-xs text-muted-foreground">{nomination.participant?.designation || 'Designation not available'}</p>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {canManageLateAttendance && (
                            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                                    <div>
                                        <p className="text-sm font-semibold text-amber-500">Mark Late Attendance</p>
                                        <p className="mt-1 text-sm text-amber-500/90">
                                            The QR window is closed. You can still mark approved participants as present within the allowed late-attendance period.
                                        </p>
                                    </div>
                                    <Button
                                        variant="outline"
                                        className="border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 hover:text-amber-400"
                                        disabled={selectedLateParticipantIds.length === 0 || loading}
                                        onClick={() => markLateAttendance(selectedLateParticipantIds)}
                                    >
                                        <Clock3 className="mr-2 size-4" />
                                        Mark Late Attendance
                                    </Button>
                                </div>

                                <div className="mt-4 grid gap-3 md:grid-cols-2">
                                    {eligibleLateParticipants.length === 0 ? (
                                        <div className="text-sm text-muted-foreground">No eligible participants are pending late attendance.</div>
                                    ) : (
                                        eligibleLateParticipants.map((nomination) => (
                                            <label
                                                key={nomination.id}
                                                className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-500/20 bg-background/60 p-3"
                                            >
                                                <Checkbox
                                                    checked={selectedLateParticipantIds.includes(nomination.participantId)}
                                                    onCheckedChange={() => toggleLateParticipant(nomination.participantId)}
                                                    aria-label={`Select ${nomination.participant?.name || 'participant'} for late attendance`}
                                                />
                                                <div className="min-w-0">
                                                    <p className="text-sm font-medium text-foreground">{nomination.participant?.name || 'Participant'}</p>
                                                    <p className="text-xs text-muted-foreground">{nomination.participant?.designation || 'Designation not available'}</p>
                                                </div>
                                            </label>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                            <div className="rounded-2xl border border-border bg-card p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Total marked</p>
                                        <p className="mt-3 text-3xl font-bold text-foreground">{attendances.length}</p>
                                    </div>
                                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                        <CheckCircle2 className="size-5" />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">QR check-ins</p>
                                        <p className="mt-3 text-3xl font-bold text-foreground">{qrCount}</p>
                                    </div>
                                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                        <QrCode className="size-5" />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Manual sign-ins</p>
                                        <p className="mt-3 text-3xl font-bold text-foreground">{manualCount}</p>
                                    </div>
                                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                        <ShieldCheck className="size-5" />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Late entries</p>
                                        <p className="mt-3 text-3xl font-bold text-foreground">{lateCount}</p>
                                    </div>
                                    <div className="rounded-xl bg-amber-500/10 p-2 text-amber-500">
                                        <Clock3 className="size-5" />
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-2xl border border-border bg-card p-4">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">Latest check-in</p>
                                        <p className="mt-3 text-sm font-semibold text-foreground">
                                            {latestAttendance?.timestamp ? format(new Date(latestAttendance.timestamp), 'MMM d, yyyy h:mm a') : 'N/A'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl bg-primary/10 p-2 text-primary">
                                        <CalendarClock className="size-5" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-card">
                            <div className="flex items-center justify-between border-b border-border px-4 py-4">
                                <div>
                                    <h3 className="text-base font-semibold text-foreground">Participant list</h3>
                                    <p className="text-sm text-muted-foreground">All attendance entries recorded for this session.</p>
                                </div>
                                <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                                    {attendances.length} record{attendances.length === 1 ? '' : 's'}
                                </Badge>
                            </div>

                            {attendances.length === 0 ? (
                                <div className="flex min-h-[220px] flex-col items-center justify-center px-6 py-10 text-center">
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
                            <div className="md:hidden">
                                <div className="space-y-3 p-4">
                                    {attendances.map((record) => (
                                        <div key={record.id} className="rounded-2xl border border-border bg-background/70 p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                                                    {getInitials(record.participant?.name)}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <p className="text-sm font-semibold text-foreground">
                                                            {record.participant?.name || 'Unknown'}
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            <Badge variant="outline" className="border-border bg-card text-foreground">
                                                                {getMethodLabel(record.method)}
                                                            </Badge>
                                                            <Badge className={record.attendanceType === 'late' ? 'bg-amber-500/15 text-amber-500' : record.method === 'manual' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}>
                                                                {getAttendanceTypeLabel(record)}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <p className="mt-1 text-sm text-muted-foreground">
                                                        {record.participant?.designation || 'Designation not available'}
                                                    </p>
                                                    <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                                                        <p>{record.participant?.email || 'No email available'}</p>
                                                        <p>{record.timestamp ? format(new Date(record.timestamp), 'PPP p') : 'Time not available'}</p>
                                                        {(record.attendanceType === 'late' || record.method === 'manual') && record.markedByName && (
                                                            <p>Marked by {record.markedByName}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="hidden overflow-x-auto md:block">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="border-border hover:bg-transparent">
                                            <TableHead className="pl-6">Participant</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Designation</TableHead>
                                            <TableHead>Checked in</TableHead>
                                            <TableHead>Type</TableHead>
                                            <TableHead className="pr-6">Method</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {attendances.map((record) => (
                                            <TableRow key={record.id} className="border-border">
                                                <TableCell className="pl-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                                            {getInitials(record.participant?.name)}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium text-foreground">{record.participant?.name || 'Unknown'}</p>
                                                            <p className="text-xs text-muted-foreground">ID: {record.participantId || 'N/A'}</p>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {record.participant?.email || 'N/A'}
                                                </TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {record.participant?.designation || 'N/A'}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-sm text-foreground">
                                                    {record.timestamp ? format(new Date(record.timestamp), 'PPP') : 'N/A'}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {record.timestamp ? format(new Date(record.timestamp), 'p') : ''}
                                                    </div>
                                                    {(record.attendanceType === 'late' || record.method === 'manual') && record.markedByName && (
                                                        <div className="text-xs text-muted-foreground">
                                                            Marked by {record.markedByName}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge className={record.attendanceType === 'late' ? 'bg-amber-500/15 text-amber-500' : record.method === 'manual' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-blue-500/15 text-blue-400'}>
                                                        {getAttendanceTypeLabel(record)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="pr-6">
                                                    <Badge variant="outline" className="border-border bg-background text-foreground">
                                                        {getMethodLabel(record.method)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            </>
                            )}
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AttendanceListModal;
