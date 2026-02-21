import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
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
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tighter text-foreground flex items-center gap-3">
                        <Building2 className="size-6 md:size-8 text-primary animate-pulse-glow" />
                        {t('institutions.title', 'INSTITUTIONS')}
                        <div className="h-1 w-20 bg-gradient-to-r from-primary to-transparent rounded-full ml-4 hidden md:block" />
                    </h1>
                    <p className="text-muted-foreground mt-1 font-mono text-[10px] md:text-xs uppercase tracking-widest opacity-70">{t('institutions.subtitle', 'Sector Registry & Organizational Matrix')}</p>
                </div>
                {isMasterAdmin && (
                    <Button
                        onClick={() => setShowCreateDialog(true)}
                        className="w-full md:w-auto bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-widest uppercase rounded-xl border border-primary/20 shadow-[0_0_20px_rgba(0,236,255,0.2)]"
                    >
                        <Plus className="size-4 mr-2" />
                        {t('institutions.registerNew', 'REGISTER NEW INSTITUTION')}
                    </Button>
                )}
            </div>

            <Card className="glass-card overflow-hidden">
                <CardHeader className="pb-4 border-b border-primary/10 bg-primary/5">
                    <CardTitle className="text-sm font-bold text-primary tracking-[0.2em] flex items-center gap-2 uppercase">
                        <ShieldCheck className="size-4" />
                        {t('institutions.verified', 'VERIFIED SECTORS')}
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="relative size-12 mb-4">
                                <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
                                <div className="absolute inset-0 border-r-2 border-secondary rounded-full animate-spin [animation-duration:1.5s]" />
                            </div>
                            <p className="text-primary font-mono text-xs tracking-widest animate-pulse">{t('institutions.loading', 'ACCESSING SECTOR DATABASE...')}</p>
                        </div>
                    ) : institutions.length === 0 ? (
                        <div className="text-center py-20 bg-primary/5 rounded-3xl border border-dashed border-primary/20">
                            <Activity className="size-12 mx-auto mb-4 text-primary/20 animate-pulse" />
                            <h3 className="text-xl font-bold text-foreground tracking-widest uppercase">{t('institutions.noSectors', 'No Sectors Detected')}</h3>
                            <p className="text-muted-foreground mt-2 font-mono text-[10px] uppercase tracking-widest">{t('institutions.noSectorsDesc', 'The institutional grid is currently offline.')}</p>
                        </div>
                    ) : (
                        <Table className="neon-table">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-primary/10">
                                    <TableHead>{t('institutions.table.name', 'SECTOR / NAME')}</TableHead>
                                    <TableHead>{t('institutions.table.classification', 'CLASSIFICATION')}</TableHead>
                                    <TableHead>{t('institutions.table.location', 'COORDINATES / LOCATION')}</TableHead>
                                    <TableHead className="text-right">{t('institutions.table.actions', 'ACTIONS')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {institutions.map((institution) => (
                                    <TableRow key={institution.id} className="group border-primary/5">
                                        <TableCell className="py-4 font-bold text-foreground tracking-wide">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                                                    <Building2 className="size-4" />
                                                </div>
                                                {institution.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <Badge variant="outline" className="text-secondary border-secondary/30 bg-secondary/5 font-mono text-[10px] tracking-widest uppercase px-3">
                                                {institution.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-4 text-muted-foreground font-mono text-xs">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="size-3 text-primary/50" />
                                                {institution.location}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            {isMasterAdmin && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDeleteInstitution(institution.id, institution.name)}
                                                    className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                                                >
                                                    <Trash2 className="size-3" />
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

            {/* Create Institution Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[425px] glass border-primary/20 text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <Plus className="size-5 text-primary" />
                            {t('institutions.dialog.title', 'REGISTER INSTITUTION')}
                        </DialogTitle>
                        <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest mt-1">
                            {t('institutions.dialog.desc', 'Establish a new organizational entity.')}
                        </p>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">{t('institutions.dialog.name', 'Institution Name')}</Label>
                            <Input
                                id="name"
                                value={newInstitutionForm.name}
                                onChange={(e) => setNewInstitutionForm({ ...newInstitutionForm, name: e.target.value })}
                                placeholder={t('institutions.dialog.namePlaceholder', 'E.g. City General Hospital')}
                                className="bg-input/50 border-input text-foreground font-mono text-xs"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="type" className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">{t('institutions.dialog.classification', 'Classification')}</Label>
                            <Select
                                value={newInstitutionForm.type}
                                onValueChange={(val) => setNewInstitutionForm({ ...newInstitutionForm, type: val })}
                            >
                                <SelectTrigger className="bg-input/50 border-input text-foreground font-mono text-xs">
                                    <SelectValue placeholder={t('institutions.dialog.classificationPlaceholder', 'Select type')} />
                                </SelectTrigger>
                                <SelectContent className="bg-popover border-border/50 text-foreground font-mono text-xs">
                                    <SelectItem value="Medical College">{t('institutions.dialog.types.medicalCollege', 'Medical College')}</SelectItem>
                                    <SelectItem value="Hospital">{t('institutions.dialog.types.hospital', 'Hospital')}</SelectItem>
                                    <SelectItem value="Research Center">{t('institutions.dialog.types.researchCenter', 'Research Center')}</SelectItem>
                                    <SelectItem value="Other">{t('institutions.dialog.types.other', 'Other')}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="location" className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">{t('institutions.dialog.location', 'Coordinates / Location')}</Label>
                            <Input
                                id="location"
                                value={newInstitutionForm.location}
                                onChange={(e) => setNewInstitutionForm({ ...newInstitutionForm, location: e.target.value })}
                                placeholder={t('institutions.dialog.locationPlaceholder', 'E.g. Sector 5, North')}
                                className="bg-input/50 border-input text-foreground font-mono text-xs"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleCreateInstitution}
                            disabled={isSaving}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-widest uppercase py-6"
                        >
                            {isSaving ? t('institutions.dialog.saving', 'UPLOADING INTEL...') : t('institutions.dialog.submit', 'COMMIT TO REGISTRY')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Institutions;
