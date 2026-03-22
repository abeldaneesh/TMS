import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Institution } from '../../types';
import { institutionsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, MapPin, Activity, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import LoadingAnimation from '../components/LoadingAnimation';

const Institutions: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const isMasterAdmin = user?.role === 'master_admin';

    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [newInstitutionForm, setNewInstitutionForm] = useState({
        name: '',
        type: 'Medical College',
        location: ''
    });

    const fetchInstitutions = async () => {
        setLoading(true);
        try {
            const data = await institutionsApi.getAll();
            setInstitutions(data);
        } catch (error) {
            console.error('Failed to fetch institutions', error);
            toast.error(t('institutions.alerts.loadFail', 'Failed to load institutions'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInstitutions();
    }, []);

    const handleCreateInstitution = async () => {
        if (!newInstitutionForm.name || !newInstitutionForm.location) {
            toast.error(t('institutions.alerts.nameLocationRequired', 'Institution name and location are required'));
            return;
        }

        setIsSaving(true);
        try {
            await institutionsApi.create({
                name: newInstitutionForm.name,
                type: newInstitutionForm.type,
                location: newInstitutionForm.location
            });
            toast.success(t('institutions.alerts.createSuccess', 'Institution registered successfully'));
            setShowCreateDialog(false);
            setNewInstitutionForm({ name: '', type: 'Medical College', location: '' });
            fetchInstitutions();
        } catch (error: any) {
            toast.error(error.response?.data?.message || t('institutions.alerts.createFail', 'Failed to create institution'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeleteInstitution = async (id: string, name: string) => {
        if (!window.confirm(t('institutions.alerts.deleteConfirm', { name, defaultValue: `Are you sure you want to terminate institution ${name}? This cannot be undone.` }))) return;

        try {
            await institutionsApi.delete(id);
            toast.success(t('institutions.alerts.deleteSuccess', 'Institution removed from registry'));
            fetchInstitutions();
        } catch (error: any) {
            toast.error(error.response?.data?.message || t('institutions.alerts.deleteFail', 'Failed to delete institution'));
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <Building2 className="size-8 sm:size-10 text-primary" />
                        {t('institutions.title', 'INSTITUTIONS')}
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">
                        {t('institutions.subtitle', 'Sector Registry & Organizational Matrix')}
                    </p>
                </div>
                {isMasterAdmin && (
                    <Button
                        onClick={() => setShowCreateDialog(true)}
                        className="w-full md:w-auto rounded-full px-6 bg-foreground text-background hover:bg-white/90 font-semibold"
                    >
                        <Plus className="size-4 mr-2" />
                        {t('institutions.registerNew', 'Register New Institution')}
                    </Button>
                )}
            </div>

            <Card className="overflow-hidden border-border/60 bg-card/95 shadow-sm">
                <CardHeader className="pb-4 border-b border-border/60 bg-secondary/10">
                    <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                        <ShieldCheck className="size-4" />
                        {t('institutions.verified', 'Verified Institutions')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <LoadingAnimation text={t('institutions.loading', 'Loading institutions...')} />
                        </div>
                    ) : institutions.length === 0 ? (
                        <div className="text-center py-20 rounded-3xl border border-dashed border-border bg-secondary/10">
                            <Activity className="size-12 mx-auto mb-4 text-muted-foreground/40" />
                            <h3 className="text-xl font-semibold text-foreground">{t('institutions.noSectors', 'No institutions found')}</h3>
                            <p className="text-muted-foreground mt-2 text-sm">{t('institutions.noSectorsDesc', 'The institutional registry is currently empty.')}</p>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-border/60">
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">{t('institutions.table.name', 'Sector / Name')}</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">{t('institutions.table.classification', 'Classification')}</TableHead>
                                    <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">{t('institutions.table.location', 'Coordinates / Location')}</TableHead>
                                    <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground">{t('institutions.table.actions', 'Actions')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {institutions.map((institution) => (
                                    <TableRow key={institution.id} className="group border-border/40">
                                        <TableCell className="py-4 font-semibold text-foreground">
                                            <div className="flex items-center gap-3">
                                                <div className="size-10 rounded-xl bg-secondary/20 flex items-center justify-center text-primary border border-border/60">
                                                    <Building2 className="size-4" />
                                                </div>
                                                {institution.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge variant="outline" className="text-foreground border-border bg-secondary/20 text-[11px] font-medium px-3 py-1 rounded-full">
                                                {institution.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4 text-muted-foreground text-sm">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="size-3.5 text-primary/70" />
                                                {institution.location}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            {isMasterAdmin && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteInstitution(institution.id, institution.name)}
                                                    className="h-9 w-9 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-full transition-all"
                                                >
                                                    <Trash2 className="size-4" />
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[480px] border-border/70 bg-background/95 text-foreground backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
                            <Plus className="size-5 text-primary" />
                            {t('institutions.dialog.title', 'Register Institution')}
                        </DialogTitle>
                        <p className="text-muted-foreground text-sm mt-1">
                            {t('institutions.dialog.desc', 'Add a new institution to the registry.')}
                        </p>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-sm font-medium">{t('institutions.dialog.name', 'Institution Name')}</Label>
                            <Input
                                id="name"
                                value={newInstitutionForm.name}
                                onChange={(e) => setNewInstitutionForm({ ...newInstitutionForm, name: e.target.value })}
                                placeholder={t('institutions.dialog.namePlaceholder', 'E.g. City General Hospital')}
                                className="h-11 bg-secondary/20 border-transparent focus-visible:border-primary/40"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="type" className="text-sm font-medium">{t('institutions.dialog.classification', 'Classification')}</Label>
                            <Select
                                value={newInstitutionForm.type}
                                onValueChange={(val) => setNewInstitutionForm({ ...newInstitutionForm, type: val })}
                            >
                                <SelectTrigger className="h-11 bg-secondary/20 border-transparent focus:border-primary/40">
                                    <SelectValue placeholder={t('institutions.dialog.classificationPlaceholder', 'Select type')} />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border/50 text-foreground">
                                    <SelectItem value="Medical College">{t('institutions.dialog.types.medicalCollege', 'Medical College')}</SelectItem>
                                    <SelectItem value="Hospital">{t('institutions.dialog.types.hospital', 'Hospital')}</SelectItem>
                                    <SelectItem value="Research Center">{t('institutions.dialog.types.researchCenter', 'Research Center')}</SelectItem>
                                    <SelectItem value="Other">{t('institutions.dialog.types.other', 'Other')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="location" className="text-sm font-medium">{t('institutions.dialog.location', 'Coordinates / Location')}</Label>
                            <Input
                                id="location"
                                value={newInstitutionForm.location}
                                onChange={(e) => setNewInstitutionForm({ ...newInstitutionForm, location: e.target.value })}
                                placeholder={t('institutions.dialog.locationPlaceholder', 'E.g. Sector 5, North')}
                                className="h-11 bg-secondary/20 border-transparent focus-visible:border-primary/40"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleCreateInstitution}
                            disabled={isSaving}
                            className="w-full h-11 rounded-xl bg-foreground text-background hover:bg-white/90 font-semibold"
                        >
                            {isSaving ? t('institutions.dialog.saving', 'Saving...') : t('institutions.dialog.submit', 'Create Institution')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Institutions;
