import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import { attendanceApi, nominationsApi, trainingsApi } from '../../services/api';
import { Attendance, Nomination, Training } from '../../types';
import { UserMinus, ArrowLeft, Users, Clock3, UserCheck, FileDown } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import LoadingAnimation from '../components/LoadingAnimation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
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

const TrainingParticipants: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [training, setTraining] = useState<Training | null>(null);
    const [participants, setParticipants] = useState<Nomination[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<Attendance[]>([]);
    const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    const checkAuthorization = (t: Training) => {
        if (user?.role === 'master_admin') return true;
        if (user?.role === 'program_officer' && t.createdById === user.id) return true;
        return false;
    };

    const fetchData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [trainingData, nominationsData, attendanceData] = await Promise.all([
                trainingsApi.getById(id),
                nominationsApi.getAll({ trainingId: id }),
                attendanceApi.getAll({ trainingId: id }).catch(() => []),
            ]);

            if (!checkAuthorization(trainingData)) {
                toast.error(t('participantsManage.notAuth'));
                navigate('/trainings');
                return;
            }

            setTraining(trainingData);
            setAttendanceRecords(Array.isArray(attendanceData) ? attendanceData : []);

            // The API call is already scoped to this training.
            // Keep all assigned participants visible except those explicitly removed/rejected.
            const activeParticipants = dedupeParticipantNominations(nominationsData.filter((nom) =>
                nom.status !== 'rejected'
            ));
            setParticipants(activeParticipants);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error(t('participantsManage.couldNotLoad'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id, user]);

    const handleRemoveParticipant = async (nominationId: string, participantName: string) => {
        if (!window.confirm(t('participantsManage.confirmRemove', { name: participantName }))) {
            return;
        }

        try {
            await nominationsApi.updateStatus(nominationId, 'rejected', 'Removed from training by Administrator/Program Officer');
            toast.success(t('participantsManage.removedSuccess', { name: participantName }));
            fetchData(); // Refresh list
        } catch (error) {
            console.error('Error removing participant:', error);
            toast.error(t('participantsManage.failedRemove'));
        }
    };

    const handleBulkRemove = async () => {
        if (!window.confirm(t('participantsManage.bulkRemoveConfirm', { count: selectedParticipantIds.length }))) {
            return;
        }

        setLoading(true);
        try {
            const result = await nominationsApi.bulkReject(selectedParticipantIds, user?.id || '', 'Removed from training by Administrator/Program Officer');
            if (result.failed === 0) {
                toast.success(t('participantsManage.bulkRemoveSuccess', { count: result.success }));
            } else {
                toast.warning(t('participantsManage.bulkRemovePartial', { success: result.success, failed: result.failed }));
            }
            setSelectedParticipantIds([]);
            fetchData();
        } catch (error) {
            console.error('Error in bulk remove:', error);
            toast.error(t('participantsManage.failedRemove'));
        } finally {
            setLoading(false);
        }
    };

    const toggleParticipantSelection = (id: string) => {
        setSelectedParticipantIds(prev =>
            prev.includes(id) ? prev.filter(nomId => nomId !== id) : [...prev, id]
        );
    };

    const hasAttendanceRecord = (participantId?: string) =>
        Boolean(
            participantId &&
            attendanceRecords.some((record) => record.participantId === participantId)
        );

    const getAttendanceRecord = (participantId?: string) =>
        attendanceRecords.find((record) => participantId && record.participantId === participantId);

    const getEffectiveParticipantStatus = (nomination: Nomination) => {
        if (hasAttendanceRecord(nomination.participantId)) {
            return 'attended';
        }
        return nomination.status === 'attended' ? 'approved' : nomination.status;
    };

    const getParticipantName = (nomination: Nomination) => {
        const baseName = nomination.participant?.name || nomination.participantSnapshot?.fullName;
        if (baseName) {
            return nomination.participantSnapshot?.isDeleted || (!nomination.participant && nomination.participantSnapshot)
                ? `${baseName} (Archived)`
                : baseName;
        }
        return 'Participant (Removed)';
    };

    const getParticipantEmail = (nomination: Nomination) =>
        nomination.participant?.email || nomination.participantSnapshot?.email || t('participantsManage.na');

    const getParticipantDesignation = (nomination: Nomination) =>
        nomination.participant?.designation || nomination.participantSnapshot?.designation || nomination.participantSnapshot?.role || t('participantsManage.na');

    const getParticipantInstitution = (nomination: Nomination) =>
        nomination.institution?.name || nomination.participantSnapshot?.institutionName || t('participantsManage.na');

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

    const canMarkLateAttendance = (() => {
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
        const lateWindowHours = training.lateAttendanceWindowHours || 4;
        const lateWindowEnd = new Date(sessionEnd.getTime() + lateWindowHours * 60 * 60 * 1000);
        const now = new Date();
        return now > sessionEnd && now <= lateWindowEnd;
    })();

    const handleGenerateAttendanceSheet = async () => {
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

    const handleBulkManualAttendance = async () => {
        const selectedNominations = participants.filter((nom) => selectedParticipantIds.includes(nom.id) && nom.participantId && !hasAttendanceRecord(nom.participantId));
        if (selectedNominations.length === 0) {
            toast.error('Select at least one participant who has not already been marked present.');
            return;
        }

        const participantLabel = selectedNominations.length === 1
            ? selectedNominations[0].participant?.name || 'this participant'
            : `${selectedNominations.length} participants`;

        if (!window.confirm(`Are you sure you want to mark ${participantLabel} from the sign-in sheet?`)) {
            return;
        }

        setLoading(true);
        try {
            const result = await attendanceApi.markManualAttendance(
                id || '',
                selectedNominations.map((nom) => nom.participantId)
            );
            toast.success(
                result.markedCount > 0
                    ? `Manual attendance marked for ${result.markedCount} participant${result.markedCount === 1 ? '' : 's'}.`
                    : 'No eligible participants were marked from the sign-in sheet.'
            );
            setSelectedParticipantIds([]);
            fetchData();
        } catch (error: any) {
            console.error('Error marking manual attendance:', error);
            toast.error(error?.response?.data?.message || 'Failed to mark manual attendance');
        } finally {
            setLoading(false);
        }
    };

    const handleBulkLateAttendance = async () => {
        const selectedNominations = participants.filter((nom) => selectedParticipantIds.includes(nom.id) && nom.participantId);
        if (selectedNominations.length === 0) return;

        const participantLabel = selectedNominations.length === 1
            ? selectedNominations[0].participant?.name || 'this participant'
            : `${selectedNominations.length} participants`;

        if (!window.confirm(`Are you sure you want to mark ${participantLabel} as late?`)) {
            return;
        }

        setLoading(true);
        try {
            const result = await attendanceApi.markLateAttendance(
                id || '',
                selectedNominations.map((nom) => nom.participantId)
            );
            toast.success(
                result.markedCount > 0
                    ? `Late attendance marked for ${result.markedCount} participant${result.markedCount === 1 ? '' : 's'}.`
                    : 'No eligible participants were marked late.'
            );
            setSelectedParticipantIds([]);
            fetchData();
        } catch (error: any) {
            console.error('Error marking late attendance:', error);
            toast.error(error?.response?.data?.message || 'Failed to mark late attendance');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelectAll = () => {
        const removableParticipants = participants.filter(nom => getEffectiveParticipantStatus(nom) !== 'attended');
        if (selectedParticipantIds.length === removableParticipants.length) {
            setSelectedParticipantIds([]);
        } else {
            setSelectedParticipantIds(removableParticipants.map(nom => nom.id));
        }
    };

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <LoadingAnimation text={t('trainingParticipantsProps.loading')} />
            </div>
        );
    }

    if (!training) {
        return <div>{t('participantsManage.notFound')}</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/trainings')}>
                    <ArrowLeft className="size-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{t('participantsManage.title')}</h1>
                    <p className="text-muted-foreground">{training.title}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <CardTitle className="flex items-center gap-2">
                                <Users className="size-5" />
                                {t('participantsManage.assignedPersonnel')}
                            </CardTitle>
                            <CardDescription>
                                {t('participantsManage.totalAssigned')}: {participants.length}
                            </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {canGenerateAttendanceSheet && (
                                <Button
                                    variant="outline"
                                    onClick={handleGenerateAttendanceSheet}
                                    className="font-medium"
                                    disabled={loading}
                                >
                                    <FileDown className="mr-2 size-4" />
                                    Generate Attendance Sheet
                                </Button>
                            )}
                            {canMarkManualAttendance && selectedParticipantIds.length > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={handleBulkManualAttendance}
                                    className="border-emerald-500/30 bg-emerald-500/10 font-medium text-emerald-500 hover:bg-emerald-500/15 hover:text-emerald-400"
                                    disabled={loading}
                                >
                                    <UserCheck className="mr-2 size-4" />
                                    Mark from Sign-in Sheet ({selectedParticipantIds.length})
                                </Button>
                            )}
                            {canMarkLateAttendance && selectedParticipantIds.length > 0 && (
                                <Button
                                    variant="outline"
                                    onClick={handleBulkLateAttendance}
                                    className="border-amber-500/30 bg-amber-500/10 font-medium text-amber-500 hover:bg-amber-500/15 hover:text-amber-400"
                                    disabled={loading}
                                >
                                    <Clock3 className="mr-2 size-4" />
                                    Mark Late Attendance ({selectedParticipantIds.length})
                                </Button>
                            )}
                            {selectedParticipantIds.length > 0 && (
                                <Button
                                    variant="destructive"
                                    onClick={handleBulkRemove}
                                    className="font-medium"
                                    disabled={loading}
                                >
                                    {t('participantsManage.bulkRemove', { count: selectedParticipantIds.length })}
                                </Button>
                            )}
                        </div>
                    </div>
                    {canMarkLateAttendance && (
                        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
                            Late attendance is active. Program Officers can mark approved participants as present after the QR window closes.
                        </div>
                    )}
                    {canGenerateAttendanceSheet && (
                        <div className="rounded-2xl border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-muted-foreground">
                            Use <span className="font-medium text-foreground">Generate Attendance Sheet</span> before or during the session for offline signatures. After the training begins, you can use <span className="font-medium text-foreground">Mark from Sign-in Sheet</span> to record signed attendance.
                        </div>
                    )}
                </CardHeader>
                <CardContent>
                    {participants.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground max-w-sm mx-auto">
                            <Users className="size-12 mx-auto mb-4 opacity-20" />
                            <p>{t('participantsManage.noParticipants')}</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">
                                            <Checkbox
                                                checked={
                                                    participants.filter(nom => nom.status !== 'attended').length > 0 &&
                                                    selectedParticipantIds.length === participants.filter(nom => nom.status !== 'attended').length
                                                }
                                                onCheckedChange={toggleSelectAll}
                                                aria-label={t('participantsManage.selectAll')}
                                            />
                                        </TableHead>
                                        <TableHead>{t('participantsManage.colParticipant')}</TableHead>
                                        <TableHead>{t('participantsManage.colContactRole')}</TableHead>
                                        <TableHead>{t('participantsManage.colInstitution')}</TableHead>
                                        <TableHead>{t('participantsManage.colStatus')}</TableHead>
                                        <TableHead className="text-right">{t('participantsManage.colActions')}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {participants.map((nom) => (
                                        <TableRow key={nom.id} className={selectedParticipantIds.includes(nom.id) ? "bg-muted/50" : ""}>
                                            {(() => {
                                                const effectiveStatus = getEffectiveParticipantStatus(nom);
                                                const isAttended = effectiveStatus === 'attended';
                                                const attendanceRecord = getAttendanceRecord(nom.participantId);
                                                const isLateAttendance = attendanceRecord?.attendanceType === 'late';
                                                const isManualAttendance = attendanceRecord?.method === 'manual' && attendanceRecord?.attendanceType !== 'late';
                                                const statusLabel = isLateAttendance
                                                    ? 'Present (Late)'
                                                    : isManualAttendance
                                                        ? 'Present (Manual)'
                                                        : isAttended
                                                            ? 'Present (QR)'
                                                            : t(`common.statuses.${effectiveStatus}`, { defaultValue: effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1) });
                                                return (
                                                    <>
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedParticipantIds.includes(nom.id)}
                                                    onCheckedChange={() => toggleParticipantSelection(nom.id)}
                                                    disabled={isAttended}
                                                    aria-label={`Select ${nom.participant?.name}`}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{getParticipantName(nom)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-muted-foreground">{getParticipantEmail(nom)}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{getParticipantDesignation(nom)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{getParticipantInstitution(nom)}</div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                                                    ${isLateAttendance ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                                        : isManualAttendance ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300'
                                                        : isAttended ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}
                                                `}>
                                                    {statusLabel}
                                                </span>
                                                {(isLateAttendance || isManualAttendance) && attendanceRecord?.markedByName && (
                                                    <div className="mt-1 text-xs text-muted-foreground">
                                                        Marked by {attendanceRecord.markedByName}
                                                        {attendanceRecord.timestamp ? ` at ${new Date(attendanceRecord.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}` : ''}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    {canMarkManualAttendance && !isAttended && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={async () => {
                                                                const participantLabel = getParticipantName(nom);
                                                                if (!window.confirm(`Are you sure you want to mark ${participantLabel} from the sign-in sheet?`)) {
                                                                    return;
                                                                }
                                                                try {
                                                                    await attendanceApi.markManualAttendance(id || '', [nom.participantId]);
                                                                    toast.success('Manual attendance marked successfully.');
                                                                    fetchData();
                                                                } catch (error: any) {
                                                                    toast.error(error?.response?.data?.message || 'Failed to mark manual attendance');
                                                                }
                                                            }}
                                                            className="h-8 gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/15 hover:text-emerald-400"
                                                        >
                                                            <UserCheck className="size-3.5" />
                                                            <span className="hidden sm:inline">Mark from Sheet</span>
                                                        </Button>
                                                    )}
                                                    {canMarkLateAttendance && !isAttended && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={async () => {
                                                                const participantLabel = getParticipantName(nom);
                                                                if (!window.confirm(`Are you sure you want to mark ${participantLabel} as late?`)) {
                                                                    return;
                                                                }
                                                                try {
                                                                    await attendanceApi.markLateAttendance(id || '', [nom.participantId]);
                                                                    toast.success('Late attendance marked successfully.');
                                                                    fetchData();
                                                                } catch (error: any) {
                                                                    toast.error(error?.response?.data?.message || 'Failed to mark late attendance');
                                                                }
                                                            }}
                                                            className="h-8 gap-1.5 border-amber-500/30 bg-amber-500/10 text-amber-500 hover:bg-amber-500/15 hover:text-amber-400"
                                                        >
                                                            <UserCheck className="size-3.5" />
                                                            <span className="hidden sm:inline">Mark Late Attendance</span>
                                                        </Button>
                                                    )}
                                                    <Button
                                                        variant="destructive"
                                                        size="sm"
                                                        onClick={() => handleRemoveParticipant(nom.id, getParticipantName(nom))}
                                                        className="h-8 gap-1.5"
                                                        disabled={isAttended}
                                                        title={isAttended ? t('participantsManage.cannotRemoveAttended') : t('participantsManage.removeUser')}
                                                    >
                                                        <UserMinus className="size-3.5" />
                                                        <span className="hidden sm:inline">{t('participantsManage.remove')}</span>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                                    </>
                                                );
                                            })()}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TrainingParticipants;
