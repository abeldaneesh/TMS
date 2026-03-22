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
import { nominationsApi, trainingsApi } from '../../services/api';
import { Nomination, Training } from '../../types';
import { Loader2, UserMinus, ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import LoadingAnimation from '../components/LoadingAnimation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';

const TrainingParticipants: React.FC = () => {
    const { t } = useTranslation();
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [training, setTraining] = useState<Training | null>(null);
    const [participants, setParticipants] = useState<Nomination[]>([]);
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
            const [trainingData, nominationsData] = await Promise.all([
                trainingsApi.getById(id),
                nominationsApi.getAll({ trainingId: id })
            ]);

            if (!checkAuthorization(trainingData)) {
                toast.error(t('participantsManage.notAuth'));
                navigate('/trainings');
                return;
            }

            setTraining(trainingData);

            // Only show approved and attended participants
            const activeParticipants = nominationsData.filter(nom =>
                nom.status === 'approved' || nom.status === 'attended'
            );
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

    const toggleSelectAll = () => {
        const removableParticipants = participants.filter(nom => nom.status !== 'attended');
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
                                            <TableCell>
                                                <Checkbox
                                                    checked={selectedParticipantIds.includes(nom.id)}
                                                    onCheckedChange={() => toggleParticipantSelection(nom.id)}
                                                    disabled={nom.status === 'attended'}
                                                    aria-label={`Select ${nom.participant?.name}`}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium">{nom.participant?.name || t('participantsManage.unknown')}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-muted-foreground">{nom.participant?.email}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{nom.participant?.designation}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{nom.institution?.name || t('participantsManage.na')}</div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                                                    ${nom.status === 'attended' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}
                                                `}>
                                                    {t(`common.statuses.${nom.status}`, { defaultValue: nom.status.charAt(0).toUpperCase() + nom.status.slice(1) })}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleRemoveParticipant(nom.id, nom.participant?.name || t('participantsManage.unknown'))}
                                                    className="h-8 gap-1.5"
                                                    disabled={nom.status === 'attended'}
                                                    title={nom.status === 'attended' ? t('participantsManage.cannotRemoveAttended') : t('participantsManage.removeUser')}
                                                >
                                                    <UserMinus className="size-3.5" />
                                                    <span className="hidden sm:inline">{t('participantsManage.remove')}</span>
                                                </Button>
                                            </TableCell>
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
