import React, { useEffect, useState } from 'react';
import { User } from '../../types';
import { useNavigate } from 'react-router-dom';
import { usersApi, BASE_URL } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { AlertTriangle, Briefcase, Building2, Mail, Pencil, Phone, Search, Trash2, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import LoadingScreen from '../components/LoadingScreen';

type ParticipantEditForm = {
    name: string;
    email: string;
    phone: string;
    designation: string;
    department: string;
};

const emptyEditForm: ParticipantEditForm = {
    name: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
};

const normalizePhoneNumber = (value: string) => value.replace(/\D/g, '').slice(0, 10);

const Participants: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t } = useTranslation();
    const [participants, setParticipants] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
    const [editingParticipant, setEditingParticipant] = useState<User | null>(null);
    const [editForm, setEditForm] = useState<ParticipantEditForm>(emptyEditForm);
    const [savingEdit, setSavingEdit] = useState(false);

    const canEditParticipants = user?.role === 'master_admin' || user?.role === 'medical_officer' || user?.role === 'institutional_admin';
    const canDeleteParticipants = user?.role === 'master_admin';

    const fetchParticipants = async () => {
        try {
            setLoading(true);
            const data = await usersApi.getAll({ role: 'participant' });
            const nextParticipants = Array.isArray(data) ? data : [];
            setParticipants(nextParticipants);
            setSelectedParticipantIds((prev) => prev.filter((id) => nextParticipants.some((participant) => participant.id === id)));
            setError(null);
        } catch (error: any) {
            console.error('Failed to fetch participants', error);
            setError(error.message || 'Failed to fetch data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchParticipants();
    }, []);

    const filteredParticipants = participants.filter((participant) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        const institutionName = participant.institution?.name?.toLowerCase() || '';

        return (
            (participant.name && participant.name.toLowerCase().includes(term)) ||
            (participant.email && participant.email.toLowerCase().includes(term)) ||
            (participant.phone && participant.phone.includes(term)) ||
            (participant.designation && participant.designation.toLowerCase().includes(term)) ||
            (participant.department && participant.department.toLowerCase().includes(term)) ||
            institutionName.includes(term)
        );
    });

    const allFilteredSelected = filteredParticipants.length > 0 &&
        filteredParticipants.every((participant) => selectedParticipantIds.includes(participant.id));

    const toggleParticipantSelection = (participantId: string) => {
        setSelectedParticipantIds((prev) =>
            prev.includes(participantId)
                ? prev.filter((id) => id !== participantId)
                : [...prev, participantId]
        );
    };

    const toggleSelectAllFiltered = () => {
        if (allFilteredSelected) {
            setSelectedParticipantIds((prev) => prev.filter((id) => !filteredParticipants.some((participant) => participant.id === id)));
            return;
        }

        setSelectedParticipantIds((prev) => {
            const next = new Set(prev);
            filteredParticipants.forEach((participant) => next.add(participant.id));
            return Array.from(next);
        });
    };

    const openEditDialog = (participant: User) => {
        setEditingParticipant(participant);
        setEditForm({
            name: participant.name || '',
            email: participant.email || '',
            phone: participant.phone || '',
            designation: participant.designation || '',
            department: participant.department || '',
        });
    };

    const closeEditDialog = () => {
        if (savingEdit) return;
        setEditingParticipant(null);
        setEditForm(emptyEditForm);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(t('personnel.alerts.removeParticipantConfirm', { name, defaultValue: `Are you sure you want to remove participant "${name}"? All associated training data for this user will remain in history but they will lose access.` }))) {
            return;
        }

        try {
            await usersApi.delete(id);
            toast.success(t('personnel.alerts.removeSuccess', 'Participant removed successfully'));
            fetchParticipants();
        } catch (error: any) {
            console.error('Failed to delete participant', error);
            toast.error(error.response?.data?.message || t('personnel.alerts.removeFail', 'Failed to remove participant'));
        }
    };

    const handleSaveEdit = async () => {
        if (!editingParticipant) return;

        if (!editForm.name.trim()) {
            toast.error(t('personnel.participants.edit.validationName', 'Name is required'));
            return;
        }

        if (!editForm.email.trim()) {
            toast.error(t('personnel.participants.edit.validationEmail', 'Email is required'));
            return;
        }

        setSavingEdit(true);
        try {
            const updatedParticipant = await usersApi.update(editingParticipant.id, {
                name: editForm.name.trim(),
                email: editForm.email.trim(),
                phone: normalizePhoneNumber(editForm.phone),
                designation: editForm.designation.trim(),
                department: editForm.department.trim(),
            });

            setParticipants((prev) => prev.map((participant) =>
                participant.id === editingParticipant.id
                    ? { ...participant, ...updatedParticipant }
                    : participant
            ));
            toast.success(t('personnel.participants.edit.success', 'Participant updated successfully'));
            closeEditDialog();
        } catch (error: any) {
            console.error('Failed to update participant', error);
            toast.error(error.response?.data?.message || t('personnel.participants.edit.failure', 'Failed to update participant'));
        } finally {
            setSavingEdit(false);
        }
    };

    return (
        <div className="space-y-6 text-foreground">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-bold tracking-tight">{t('personnel.participants.title', 'Participants')}</h2>
                    <span className="rounded-full bg-secondary/30 px-3 py-1 text-sm text-muted-foreground">
                        {t('personnel.participants.active', { count: participants.length, defaultValue: `${participants.length} active` })}
                    </span>
                    <span className="rounded-full border border-border/60 px-3 py-1 text-sm text-muted-foreground">
                        {t('personnel.participants.selectedCount', {
                            count: selectedParticipantIds.length,
                            defaultValue: `${selectedParticipantIds.length} selected`,
                        })}
                    </span>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder={t('personnel.participants.search', 'Search by name, email, designation, department, or institution...')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-background/50 pl-9"
                    />
                </div>
            </div>

            {loading ? (
                <LoadingScreen />
            ) : error ? (
                <div className="flex items-start gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-6 text-destructive">
                    <AlertTriangle className="size-6 shrink-0" />
                    <div>
                        <h3 className="mb-1 text-lg font-bold leading-none">{t('personnel.participants.networkError', 'Network Error')}</h3>
                        <p className="text-sm opacity-90">{error}</p>
                    </div>
                </div>
            ) : participants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/50 bg-secondary/5 py-20 text-center">
                    <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-secondary/20">
                        <Users className="size-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground">{t('personnel.participants.noParticipants', 'No Participants Found')}</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{t('personnel.participants.noParticipantsDesc', 'There are no participants registered in the system yet.')}</p>
                </div>
            ) : (
                <div className="overflow-hidden rounded-2xl border border-border/50 bg-background/30">
                    <div className="flex flex-col gap-2 border-b border-border/40 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                        <span>
                            {t('personnel.participants.showingCount', {
                                count: filteredParticipants.length,
                                defaultValue: `${filteredParticipants.length} participant(s) shown`,
                            })}
                        </span>
                        <span>
                            {t('personnel.participants.bulkHint', {
                                defaultValue: 'Use the row checkboxes to select multiple participants.',
                            })}
                        </span>
                    </div>

                    <Table className="min-w-[980px]">
                        <TableHeader>
                            <TableRow className="border-border/40">
                                <TableHead className="w-14">
                                    <Checkbox
                                        checked={allFilteredSelected}
                                        onCheckedChange={toggleSelectAllFiltered}
                                        aria-label={t('personnel.participants.selectAll', 'Select all participants')}
                                    />
                                </TableHead>
                                <TableHead>{t('personnel.participants.table.name', 'Name')}</TableHead>
                                <TableHead>{t('personnel.participants.table.designation', 'Designation')}</TableHead>
                                <TableHead>{t('personnel.participants.table.department', 'Department')}</TableHead>
                                <TableHead>{t('personnel.participants.table.contact', 'Contact Info')}</TableHead>
                                <TableHead>{t('personnel.participants.table.institution', 'Institution')}</TableHead>
                                <TableHead className="text-right">{t('personnel.participants.table.actions', 'Actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredParticipants.map((participant) => {
                                const isSelected = selectedParticipantIds.includes(participant.id);

                                return (
                                    <TableRow
                                        key={participant.id}
                                        data-state={isSelected ? 'selected' : undefined}
                                        className="cursor-pointer border-border/30"
                                        onClick={() => navigate(`/user/${participant.id}`)}
                                    >
                                        <TableCell
                                            onClick={(event) => event.stopPropagation()}
                                            className="align-top"
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                onCheckedChange={() => toggleParticipantSelection(participant.id)}
                                                aria-label={t('personnel.participants.selectOne', {
                                                    name: participant.name,
                                                    defaultValue: `Select ${participant.name}`,
                                                })}
                                            />
                                        </TableCell>
                                        <TableCell className="min-w-[260px]">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-11 w-11 rounded-xl bg-secondary/50">
                                                    {participant.profilePicture && (
                                                        <AvatarImage
                                                            src={participant.profilePicture.startsWith('http') ? participant.profilePicture : `${BASE_URL}${participant.profilePicture}`}
                                                            alt={participant.name}
                                                        />
                                                    )}
                                                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-secondary/20 font-bold text-primary">
                                                        {participant.name?.charAt(0) || '?'}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="truncate font-semibold text-foreground">{participant.name || t('personnel.officers.misc.unknown', 'Unknown')}</p>
                                                    <p className="truncate text-xs text-muted-foreground">{participant.id}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-[180px]">
                                            <div className="inline-flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2">
                                                <Briefcase className="size-4 text-muted-foreground" />
                                                <span className="text-sm font-medium text-foreground">
                                                    {participant.designation || t('personnel.participants.misc.noOperationalRank', 'No rank assigned')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-[170px] text-sm text-foreground/90">
                                            {participant.department || t('personnel.participants.misc.noDepartment', 'No department assigned')}
                                        </TableCell>
                                        <TableCell className="min-w-[220px]">
                                            <div className="space-y-2">
                                                <div className="flex items-center gap-2 text-sm text-foreground/90">
                                                    <Mail className="size-4 text-muted-foreground" />
                                                    <span className="truncate">{participant.email || t('personnel.participants.misc.noEmail', 'No email')}</span>
                                                </div>
                                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                    <Phone className="size-4" />
                                                    <span>{participant.phone || t('personnel.officers.misc.noPhoneNumber', 'No phone number')}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="min-w-[220px]">
                                            <div className="inline-flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.04] px-3 py-2">
                                                <Building2 className="size-4 text-muted-foreground" />
                                                <span className="text-sm font-medium text-foreground">
                                                    {participant.institution?.name || t('personnel.participants.misc.noInstitution', 'No institution assigned')}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell
                                            className="w-[120px] text-right"
                                            onClick={(event) => event.stopPropagation()}
                                        >
                                            <div className="flex justify-end gap-2">
                                                {canEditParticipants && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditDialog(participant)}
                                                        className="size-9 rounded-full text-muted-foreground hover:bg-white/10 hover:text-foreground"
                                                        title={t('personnel.participants.actions.edit', 'Edit participant')}
                                                    >
                                                        <Pencil className="size-4" />
                                                    </Button>
                                                )}
                                                {canDeleteParticipants && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => handleDelete(participant.id, participant.name)}
                                                        className="size-9 rounded-full text-muted-foreground hover:bg-destructive hover:text-white"
                                                        title={t('personnel.participants.actions.remove', 'Remove participant')}
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            <Dialog open={Boolean(editingParticipant)} onOpenChange={(open) => !open && closeEditDialog()}>
                <DialogContent className="border-border bg-background text-foreground sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>{t('personnel.participants.edit.title', 'Edit Participant')}</DialogTitle>
                        <DialogDescription>
                            {t('personnel.participants.edit.description', 'Update the participant designation, department, and contact information.')}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-2 sm:grid-cols-2">
                        <div className="sm:col-span-2">
                            <Label htmlFor="participant-name">{t('personnel.participants.table.name', 'Name')}</Label>
                            <Input
                                id="participant-name"
                                value={editForm.name}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, name: event.target.value }))}
                                placeholder={t('personnel.participants.edit.namePlaceholder', 'Enter participant name')}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Label htmlFor="participant-email">{t('personnel.participants.edit.email', 'Email')}</Label>
                            <Input
                                id="participant-email"
                                type="email"
                                value={editForm.email}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, email: event.target.value }))}
                                placeholder={t('personnel.participants.edit.emailPlaceholder', 'Enter email address')}
                            />
                        </div>
                        <div>
                            <Label htmlFor="participant-phone">{t('personnel.participants.edit.phone', 'Phone')}</Label>
                            <Input
                                id="participant-phone"
                                value={editForm.phone}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, phone: normalizePhoneNumber(event.target.value) }))}
                                placeholder="9876543210"
                                inputMode="numeric"
                                maxLength={10}
                            />
                        </div>
                        <div>
                            <Label htmlFor="participant-designation">{t('personnel.participants.table.designation', 'Designation')}</Label>
                            <Input
                                id="participant-designation"
                                value={editForm.designation}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, designation: event.target.value }))}
                                placeholder={t('personnel.participants.edit.designationPlaceholder', 'Enter designation')}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Label htmlFor="participant-department">{t('personnel.participants.table.department', 'Department')}</Label>
                            <Input
                                id="participant-department"
                                value={editForm.department}
                                onChange={(event) => setEditForm((prev) => ({ ...prev, department: event.target.value }))}
                                placeholder={t('personnel.participants.edit.departmentPlaceholder', 'Enter department')}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={closeEditDialog} disabled={savingEdit}>
                            {t('common.cancel', 'Cancel')}
                        </Button>
                        <Button onClick={handleSaveEdit} disabled={savingEdit}>
                            {savingEdit ? t('personnel.participants.edit.saving', 'Saving...') : t('personnel.participants.edit.save', 'Save changes')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Participants;
