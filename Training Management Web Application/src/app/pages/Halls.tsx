import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Trash2, MapPin, Users, Activity, ShieldCheck, Clock, Settings2, Plus, AlertCircle, CheckCircle2, Calendar, LayoutGrid, List, Search, ChevronLeft, ChevronRight, Sun, Sunset } from 'lucide-react';
import { Hall, HallBlock, User, Training } from '../../types';
import { hallsApi, hallBlocksApi, usersApi, trainingsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import LoadingAnimation from '../components/LoadingAnimation';
import { ClockTimePicker } from '../components/ui/clock-time-picker';

// Simple cn helper for conditional classes
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

const Halls: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    // Permissions: restricted from admin, enabled for program/medical officers per user request
    const isOfficer = user?.role === 'program_officer' || user?.role === 'medical_officer';
    const isAdmin = user?.role === 'master_admin';

    const [halls, setHalls] = useState<Hall[]>([]);
    const [officers, setOfficers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

    const fetchHalls = async () => {
        setLoading(true);
        try {
            const data = await hallsApi.getAll();
            setHalls(data);
        } catch (error) {
            console.error('Failed to fetch halls', error);
            toast.error(t('halls.alerts.loadFail', 'Failed to load sectors'));
        } finally {
            setLoading(false);
        }
    };

    const fetchOfficers = async () => {
        try {
            const data = await usersApi.getAll({ role: 'program_officer' });
            setOfficers(data);
        } catch (error) {
            console.error('Failed to fetch officers');
        }
    };

    useEffect(() => {
        fetchHalls();
        fetchOfficers();
    }, []);

    const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
    const [availability, setAvailability] = useState<any[]>([]);
    const [blocks, setBlocks] = useState<HallBlock[]>([]);

    const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [slotType, setSlotType] = useState<'weekly' | 'date'>('weekly'); // Tab switcher
    const [actionType, setActionType] = useState<'available' | 'block'>('available'); // Action type for specific date

    // Form States
    const [specificDate, setSpecificDate] = useState('');
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');

    const [newSlot, setNewSlot] = useState({
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '13:30'
    });

    const [hallForm, setHallForm] = useState({
        id: '',
        name: '',
        location: '',
        capacity: 50,
        programOfficerId: ''
    });

    const filteredHalls = useMemo(() => {
        return halls.filter(hall => 
            hall.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            hall.location.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [halls, searchTerm]);

    const handleCreateHall = async () => {
        if (!hallForm.name || !hallForm.location) {
            toast.error(t('halls.alerts.nameLocationRequired', 'Sector name and location are required'));
            return;
        }

        setIsSaving(true);
        try {
            await hallsApi.create({
                name: hallForm.name,
                location: hallForm.location,
                capacity: hallForm.capacity,
                programOfficerId: hallForm.programOfficerId
            });
            toast.success(t('halls.alerts.createSuccess', 'Sector registered successfully'));
            setShowCreateDialog(false);
            setHallForm({ id: '', name: '', location: '', capacity: 50, programOfficerId: '' });
            fetchHalls();
        } catch (error: any) {
            toast.error(error.response?.data?.message || t('halls.alerts.createFail', 'Failed to create sector'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateHall = async () => {
        if (!hallForm.id) return;
        setIsSaving(true);
        try {
            await hallsApi.update(hallForm.id, {
                name: hallForm.name,
                location: hallForm.location,
                capacity: hallForm.capacity,
                programOfficerId: hallForm.programOfficerId
            });
            toast.success(t('halls.alerts.updateSuccess', 'Sector updated successfully'));
            setShowEditDialog(false);
            fetchHalls();
        } catch (error: any) {
            toast.error(error.response?.data?.message || t('halls.alerts.updateFail', 'Failed to update sector'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleEditHall = (hall: Hall) => {
        setHallForm({
            id: hall.id,
            name: hall.name,
            location: hall.location,
            capacity: hall.capacity,
            programOfficerId: hall.programOfficerId || ''
        });
        setShowEditDialog(true);
    };

    const handleDeleteHall = async (id: string, name: string) => {
        if (!window.confirm(t('halls.alerts.deleteConfirm', { name, defaultValue: `Are you sure you want to terminate sector ${name}? This cannot be undone.` }))) return;

        try {
            await hallsApi.delete(id);
            toast.success(t('halls.alerts.deleteSuccess', 'Sector terminated from registry'));
            fetchHalls();
        } catch (error: any) {
            toast.error(error.response?.data?.message || t('halls.alerts.deleteFail', 'Failed to delete sector'));
        }
    };

    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const reasons = [
        t('halls.reasons.booked', 'Hall Booked'),
        t('halls.reasons.maintenance', 'Maintenance / Repair'),
        t('halls.reasons.cleaning', 'Cleaning / Sanitization'),
        t('halls.reasons.inspection', 'Inspection / Audit'),
        t('halls.reasons.other', 'Other')
    ];

    const fetchAvailabilityAndBlocks = async (hallId: string) => {
        try {
            const [availData, blocksData] = await Promise.all([
                hallsApi.getAvailability(hallId),
                hallBlocksApi.getAll(hallId)
            ]);
            setAvailability(availData);
            setBlocks(blocksData);
        } catch (error) {
            console.error('Failed to fetch data', error);
            toast.error(t('halls.alerts.fetchAvailFail', 'Failed to fetch availability details'));
        }
    };

    const handleManageAvailability = async (hall: Hall) => {
        setSelectedHall(hall);
        fetchAvailabilityAndBlocks(hall.id);
        setShowAvailabilityDialog(true);
        // Reset states
        setSlotType('weekly');
        setActionType('available');
        setSpecificDate('');
        setReason(reasons[0]);
        setCustomReason('');
    };

    const handleAddSlot = async () => {
        if (!selectedHall) return;
        try {
            // Logic for Weekly & Specific Date Open Slots
            if (slotType === 'weekly' || (slotType === 'date' && actionType === 'available')) {
                const payload: any = {
                    startTime: newSlot.startTime,
                    endTime: newSlot.endTime
                };

                if (slotType === 'weekly') {
                    payload.dayOfWeek = newSlot.dayOfWeek;
                } else {
                    if (!specificDate) {
                        toast.error(t('halls.alerts.selectDate', 'Please select a date'));
                        return;
                    }
                    payload.specificDate = specificDate;
                }

                await hallsApi.addAvailability(selectedHall.id, payload);
                toast.success(t('halls.alerts.slotAdded', 'Availability slot added'));
            }
            // Logic for Blocking a specific date
            else if (slotType === 'date' && actionType === 'block') {
                if (!specificDate) {
                    toast.error(t('halls.alerts.selectDate', 'Please select a date'));
                    return;
                }
                const finalReason = reason === t('halls.reasons.other', 'Other') ? customReason : reason;
                if (!finalReason) {
                    toast.error(t('halls.alerts.specifyReason', 'Please specify a reason'));
                    return;
                }

                await hallBlocksApi.create({
                    hallId: selectedHall.id,
                    date: new Date(specificDate),
                    startTime: newSlot.startTime,
                    endTime: newSlot.endTime,
                    reason: finalReason
                });
                toast.success(t('halls.alerts.hallBlocked', 'Hall blocked successfully'));
            }

            // Refresh list
            fetchAvailabilityAndBlocks(selectedHall.id);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || error.message || t('halls.alerts.updateFail', 'Failed to update availability'));
        }
    };

    const handleRemoveSlot = async (id: string, type: 'availability' | 'block') => {
        if (!selectedHall) return;
        try {
            if (type === 'availability') {
                await hallsApi.removeAvailability(id);
            } else {
                await hallBlocksApi.delete(id);
            }
            toast.success(t('halls.alerts.removeSuccess', 'Removed successfully'));
            fetchAvailabilityAndBlocks(selectedHall.id);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || t('halls.alerts.removeFail', 'Failed to remove'));
        }
    };

    const MonthlyGridView: React.FC = () => {
        const [currentDate, setCurrentDate] = useState(new Date());
        const [trainings, setTrainings] = useState<Training[]>([]);
        const [allBlocks, setAllBlocks] = useState<HallBlock[]>([]);
        const [loadingGrid, setLoadingGrid] = useState(false);

        const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
        const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

        useEffect(() => {
            const fetchData = async () => {
                setLoadingGrid(true);
                try {
                    const [trainingsData, blocksData] = await Promise.all([
                        trainingsApi.getAll(),
                        hallBlocksApi.getAll()
                    ]);
                    setTrainings(trainingsData);
                    setAllBlocks(blocksData);
                } catch (error) {
                    console.error('Failed to fetch grid data', error);
                } finally {
                    setLoadingGrid(false);
                }
            };
            fetchData();
        }, [currentDate]);

        const getSlottedStatus = (day: number, hallId: string) => {
            const date = new Date(year, month, day);
            const dateStr = date.toISOString().split('T')[0];

            // Filter for this hall and date
            const dayTrainings = trainings.filter(t => 
                t.hallId === hallId && 
                new Date(t.date).toISOString().split('T')[0] === dateStr &&
                t.status !== 'cancelled'
            );

            const dayBlocks = allBlocks.filter(b => 
                b.hallId === hallId && 
                new Date(b.date).toISOString().split('T')[0] === dateStr
            );

            // Morning: 10:00 - 13:30
            // Afternoon: 14:00 - 17:30
            const morningOccupied = dayTrainings.some(t => t.startTime < '13:30' && t.endTime > '10:00') ||
                                    dayBlocks.some(b => b.startTime < '13:30' && b.endTime > '10:00');
            
            const afternoonOccupied = dayTrainings.some(t => t.startTime >= '13:30' || t.endTime > '14:00') ||
                                       dayBlocks.some(b => b.startTime >= '13:30' || b.endTime > '14:00');

            return {
                morning: morningOccupied ? 'booked' : 'available',
                afternoon: afternoonOccupied ? 'booked' : 'available'
            };
        };

        if (loadingGrid) return <div className="p-20 text-center"><LoadingAnimation /></div>;

        return (
            <div className="space-y-8">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                        <h3 className="text-xl font-bold text-primary tracking-widest uppercase">
                            {currentDate.toLocaleString('default', { month: 'long' })} {year}
                        </h3>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={prevMonth} className="size-8 rounded-full border-primary/20 bg-primary/5"><ChevronLeft className="size-4" /></Button>
                            <Button variant="outline" size="icon" onClick={nextMonth} className="size-8 rounded-full border-primary/20 bg-primary/5"><ChevronRight className="size-4" /></Button>
                        </div>
                    </div>
                    
                    <div className="hidden md:flex flex-wrap gap-4 text-[9px] font-mono uppercase tracking-widest text-muted-foreground bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                        <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-emerald-500" /> Morning Available</div>
                        <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-rose-500" /> Morning Booked</div>
                        <div className="flex items-center gap-2 border-l border-primary/10 pl-4"><div className="size-2 rounded-full bg-emerald-500/60" /> Afternoon Available</div>
                        <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-rose-500/60" /> Afternoon Booked</div>
                    </div>
                </div>

                <div className="grid gap-12">
                    {filteredHalls.map((hall) => (
                        <div key={hall.id} className="space-y-4">
                            <div className="flex items-center justify-between px-2 pb-2 border-b border-primary/10">
                                <h4 className="font-bold text-foreground flex items-center gap-2">
                                    <MapPin className="size-4 text-primary" />
                                    {hall.name}
                                </h4>
                                <div className="flex items-center gap-4">
                                    <span className="text-[10px] font-mono text-muted-foreground uppercase flex items-center gap-2">
                                        <Users className="size-3" />
                                        {hall.capacity} {t('halls.grid.capacity', 'CAPACITY')}
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                    <div key={d} className="text-[10px] text-center font-bold text-primary/60 p-1 tracking-[0.2em]">{d}</div>
                                ))}
                                {Array.from({ length: firstDayOfMonth(year, month) }).map((_, i) => (
                                    <div key={`empty-${i}`} className="p-4" />
                                ))}
                                {Array.from({ length: daysInMonth(year, month) }).map((_, i) => {
                                    const day = i + 1;
                                    const { morning, afternoon } = getSlottedStatus(day, hall.id);
                                    return (
                                        <div 
                                            key={day} 
                                            className={cn(
                                                "relative p-3 h-20 border border-primary/10 rounded-xl transition-all group hover:bg-primary/10 cursor-pointer overflow-hidden",
                                                morning === 'booked' && afternoon === 'booked' ? "bg-rose-500/5" : "bg-primary/5"
                                            )}
                                        >
                                            <span className="absolute top-1 right-2 text-[10px] font-bold font-mono opacity-30 group-hover:opacity-100 transition-opacity">{day}</span>
                                            
                                            <div className="flex flex-col gap-2 mt-4">
                                                <div className="flex items-center justify-between gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Sun className={cn("size-2.5", morning === 'available' ? "text-emerald-500" : "text-rose-500")} />
                                                        <span className={cn("text-[8px] font-bold tracking-tighter uppercase", morning === 'available' ? "text-emerald-500" : "text-rose-500")}>AM</span>
                                                    </div>
                                                    <div className={cn("h-1 flex-1 rounded-full", morning === 'available' ? "bg-emerald-500/20" : "bg-rose-500/60")} />
                                                </div>
                                                <div className="flex items-center justify-between gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Sunset className={cn("size-2.5", afternoon === 'available' ? "text-emerald-500" : "text-rose-500")} />
                                                        <span className={cn("text-[8px] font-bold tracking-tighter uppercase", afternoon === 'available' ? "text-emerald-500" : "text-rose-500")}>PM</span>
                                                    </div>
                                                    <div className={cn("h-1 flex-1 rounded-full", afternoon === 'available' ? "bg-emerald-500/20" : "bg-rose-500/60")} />
                                                </div>
                                            </div>
                                            
                                            {/* Hover indicator */}
                                            <div className="absolute inset-x-0 bottom-0 h-0.5 bg-primary transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300" />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tighter text-foreground flex items-center gap-3">
                        <MapPin className="size-6 md:size-8 text-primary animate-pulse-glow" />
                        {t('halls.title', 'DEPLOYMENT HALLS')}
                        <div className="h-1 w-20 bg-gradient-to-r from-primary to-transparent rounded-full ml-4 hidden md:block" />
                    </h1>
                    <p className="text-muted-foreground mt-1 font-mono text-[10px] md:text-xs uppercase tracking-widest opacity-70">{t('halls.subtitle', 'Physical Training Sectors & Capacity Oversight')}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder={t('halls.searchPlaceholder', 'Filter sectors...')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 bg-background/50 border-border/50 focus:border-primary/50"
                        />
                    </div>
                    
                    <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setViewMode('list')}
                            className={cn("h-8 px-3 rounded-lg text-[10px] font-bold tracking-widest uppercase", viewMode === 'list' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                        >
                            <List className="size-3 mr-2" /> {t('halls.view.list', 'LIST')}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setViewMode('grid')}
                            className={cn("h-8 px-3 rounded-lg text-[10px] font-bold tracking-widest uppercase", viewMode === 'grid' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                        >
                            <LayoutGrid className="size-3 mr-2" /> {t('halls.view.grid', 'GRID')}
                        </Button>
                    </div>

                    {isAdmin && (
                        <Button
                            onClick={() => setShowCreateDialog(true)}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-widest uppercase rounded-xl border border-primary/20 shadow-[0_0_20px_rgba(0,236,255,0.2)]"
                        >
                            <Plus className="size-4 mr-2" />
                            {t('halls.registerNew', 'REGISTER NEW SECTOR')}
                        </Button>
                    )}
                </div>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <LoadingAnimation text={t('halls.loading', 'MAP SCAN IN PROGRESS...')} />
                </div>
            ) : viewMode === 'grid' ? (
                <Card className="glass-card p-6">
                    <MonthlyGridView />
                </Card>
            ) : filteredHalls.length === 0 ? (
                <div className="text-center py-20 bg-primary/5 rounded-3xl border border-dashed border-primary/20">
                    <Activity className="size-12 mx-auto mb-4 text-primary/20 animate-pulse" />
                    <h3 className="text-xl font-bold text-foreground tracking-widest uppercase">{t('halls.noSectors', 'No Sectors Detected')}</h3>
                    <p className="text-muted-foreground mt-2 font-mono text-[10px] uppercase tracking-widest">{t('halls.noSectorsDesc', 'Global sector grid is currently void or filtered.')}</p>
                </div>
            ) : (
                <Card className="glass-card overflow-hidden">
                    <CardHeader className="pb-4 border-b border-primary/10 bg-primary/5">
                        <CardTitle className="text-sm font-bold text-primary tracking-[0.2em] flex items-center gap-2 uppercase">
                            <ShieldCheck className="size-4" />
                            {t('halls.activeSectors', 'ACTIVE SECTORS')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <Table className="neon-table">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-primary/10">
                                    <TableHead>{t('halls.table.name', 'SECTOR NAME')}</TableHead>
                                    <TableHead>{t('halls.table.officer', 'PROGRAM OFFICER')}</TableHead>
                                    <TableHead>{t('halls.table.capacity', 'CAPACITY')}</TableHead>
                                    <TableHead className="text-right">{t('halls.table.actions', 'ACTIONS')}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredHalls.map((hall) => (
                                    <TableRow key={hall.id} className="group border-primary/5">
                                        <TableCell className="py-4 font-bold text-foreground tracking-wide">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                                                        <MapPin className="size-4" />
                                                    </div>
                                                    {hall.name}
                                                </div>
                                                <span className="text-[9px] text-muted-foreground ml-11 font-mono uppercase opacity-50">{hall.location}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            {hall.programOfficer ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="size-6 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                                                        {hall.programOfficer.name.charAt(0)}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium">{hall.programOfficer.name}</span>
                                                        <span className="text-[9px] text-muted-foreground font-mono">{hall.programOfficer.email}</span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] italic text-muted-foreground opacity-50">Not Assigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="size-3 text-primary/50" />
                                                <span className="stat-value text-base">{hall.capacity}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleManageAvailability(hall)}
                                                    className="bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground border-primary/20 font-bold tracking-widest text-[10px] rounded-lg transition-all"
                                                >
                                                    <Settings2 className="size-3 mr-1.5" />
                                                    AVAILABILITY
                                                </Button>
                                                {isAdmin && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => handleEditHall(hall)}
                                                            className="h-8 w-8 text-primary/60 hover:text-primary hover:bg-primary/10 rounded-lg border-primary/10"
                                                        >
                                                            <Settings2 className="size-3" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteHall(hall.id, hall.name)}
                                                            className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                        >
                                                            <Trash2 className="size-3" />
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Availability Dialog */}
            <Dialog open={showAvailabilityDialog} onOpenChange={setShowAvailabilityDialog}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto glass border-primary/20 text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <Settings2 className="size-5 text-primary" />
                            MANAGE AVAILABILITY: {selectedHall?.name}
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest mt-1">
                            Define weekly operating protocols or specific overrides.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-6" id="availability-controls">
                        {/* Tab Switcher */}
                        <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
                            <button
                                className={cn("flex-1 py-2 px-4 rounded-lg text-xs font-bold tracking-widest uppercase transition-all", slotType === 'weekly' ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,236,255,0.3)]' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
                                onClick={() => setSlotType('weekly')}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Clock className="size-3" /> Weekly Recurring
                                </div>
                            </button>
                            <button
                                className={cn("flex-1 py-2 px-4 rounded-lg text-xs font-bold tracking-widest uppercase transition-all", slotType === 'date' ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,236,255,0.3)]' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
                                onClick={() => setSlotType('date')}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Calendar className="size-3" /> Specific Date
                                </div>
                            </button>
                        </div>

                        {/* Action Type Selector (Only for Date Tab) */}
                        {slotType === 'date' && (
                            <div className="flex bg-muted/50 p-1 rounded-xl border border-border w-fit self-center">
                                <button
                                    className={cn("py-1.5 px-4 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all", actionType === 'available' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-muted-foreground hover:text-foreground')}
                                    onClick={() => setActionType('available')}
                                >
                                    Set Open
                                </button>
                                <button
                                    className={cn("py-1.5 px-4 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all", actionType === 'block' ? 'bg-destructive/20 text-destructive border border-destructive/30' : 'text-muted-foreground hover:text-white')}
                                    onClick={() => setActionType('block')}
                                >
                                    Block / Close
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-primary/5 p-6 rounded-2xl border border-primary/10">
                            {/* Inputs */}
                            <div className="space-y-4">
                                {slotType === 'weekly' ? (
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">Day of Week</Label>
                                        <Select
                                            value={newSlot.dayOfWeek.toString()}
                                            onValueChange={(val) => setNewSlot({ ...newSlot, dayOfWeek: parseInt(val) })}
                                        >
                                            <SelectTrigger className="bg-input/50 border-input text-foreground font-mono text-xs">
                                                <SelectValue placeholder="Select day" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover border-border/50 text-foreground font-mono text-xs">
                                                {daysOfWeek.map((day, index) => (
                                                    <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">Mission Date</Label>
                                        <Input
                                            type="date"
                                            value={specificDate}
                                            onChange={(e) => setSpecificDate(e.target.value)}
                                            className="bg-input/50 border-input text-foreground font-mono text-xs"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">Start Time</Label>
                                        <ClockTimePicker
                                            value={newSlot.startTime}
                                            onChange={(val) => setNewSlot({ ...newSlot, startTime: val })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">End Time</Label>
                                        <ClockTimePicker
                                            value={newSlot.endTime}
                                            onChange={(val) => setNewSlot({ ...newSlot, endTime: val })}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Blocking Reason (Only if Blocking) */}
                            {slotType === 'date' && actionType === 'block' ? (
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-widest text-destructive/70 uppercase">Abortion Reason</Label>
                                        <Select value={reason} onValueChange={setReason}>
                                            <SelectTrigger className="bg-destructive/5 border-destructive/20 text-foreground font-mono text-xs">
                                                <SelectValue placeholder="Select reason" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover border-border/50 text-foreground font-mono text-xs">
                                                {reasons.map((r) => (
                                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {reason === 'Other' && (
                                        <Input
                                            placeholder={t('halls.form.specifyIntel', 'SPECIFY INTEL...')}
                                            value={customReason}
                                            onChange={(e) => setCustomReason(e.target.value)}
                                            className="bg-input/50 border-input text-foreground font-mono text-xs"
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-4 border border-primary/20 rounded-xl bg-primary/5 border-dashed">
                                    <CheckCircle2 className="size-8 text-primary/20 mb-2" />
                                    <p className="text-[9px] text-primary/40 text-center font-mono leading-tight">{t('halls.form.defineNew', 'DEFINE NEW OPERATIONAL WINDOWS FOR THIS SECTOR.')}</p>
                                </div>
                            )}
                        </div>

                        <Button
                            className={cn("w-full py-6 font-bold tracking-[0.2em] text-xs transition-all", slotType === 'date' && actionType === 'block' ? 'bg-destructive/20 hover:bg-destructive text-destructive hover:text-white border border-destructive/30' : 'bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30')}
                            onClick={handleAddSlot}
                        >
                            {slotType === 'date' && actionType === 'block' ? (
                                <><AlertCircle className="size-4 mr-2" /> {t('halls.buttons.abortSector', 'ABORT SECTOR OPERATION')}</>
                            ) : (
                                <><Plus className="size-4 mr-2" /> {t('halls.buttons.commitDeployment', 'COMMIT DEPLOYMENT SLOT')}</>
                            )}
                        </Button>
                    </div>

                    <div className="space-y-6 pt-2">
                        {/* Weekly Slots Display */}
                        {slotType === 'weekly' && (
                            <div className="border border-border/50 rounded-2xl overflow-hidden bg-muted/20">
                                <div className="bg-primary/10 p-3 font-bold text-[10px] tracking-[0.2em] uppercase text-primary flex items-center gap-2">
                                    <Clock className="size-3" />
                                    {t('halls.availability.recurringTitle', 'Recurring Operational Protocol')}
                                </div>
                                <div className="divide-y divide-border/20">
                                    {availability.filter(s => !s.specificDate).length === 0 ? (
                                        <div className="p-8 text-center text-xs text-muted-foreground font-mono italic opacity-50">{t('halls.availability.noRecurring', 'Zero recurring windows defined.')}</div>
                                    ) : (
                                        availability.filter(s => !s.specificDate).map((slot) => (
                                            <div key={slot._id || slot.id} className="grid grid-cols-3 p-4 text-xs items-center group hover:bg-muted/50 transition-colors">
                                                <div className="font-bold text-foreground tracking-wide">{daysOfWeek[slot.dayOfWeek]}</div>
                                                <div className="font-mono text-primary/80">{slot.startTime} — {slot.endTime}</div>
                                                <div className="text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveSlot(slot._id || slot.id, 'availability')}>
                                                        <Trash2 className="size-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Specific Date Slots & Blocks Display */}
                        {slotType === 'date' && (
                            <div className="border border-border/50 rounded-2xl overflow-hidden bg-muted/20">
                                <div className="bg-primary/10 p-3 font-bold text-[10px] tracking-[0.2em] uppercase text-primary flex items-center gap-2">
                                    <Calendar className="size-3" />
                                    {t('halls.availability.dateTitle', 'Deployment Intel Log')}
                                </div>
                                <div className="divide-y divide-border/20">
                                    {availability.filter(s => s.specificDate).length === 0 && blocks.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-muted-foreground font-mono italic opacity-50">{t('halls.availability.noDate', 'No mission logs for specific dates.')}</div>
                                    ) : (
                                        <>
                                            {/* Open Slots */}
                                            {availability.filter(s => s.specificDate).map((slot) => (
                                                <div key={slot._id || slot.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 p-4 text-xs items-center bg-emerald-500/[0.03] group hover:bg-emerald-500/[0.07]">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[9px] tracking-widest uppercase">{t('halls.availability.open', 'OPEN')}</span>
                                                        <span className="text-foreground font-mono">{new Date(slot.specificDate).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="font-mono text-emerald-400/80">{slot.startTime} — {slot.endTime}</div>
                                                    <div className="text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveSlot(slot._id || slot.id, 'availability')}>
                                                            <Trash2 className="size-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                            {/* Blocked Slots */}
                                            {blocks.map((block) => (
                                                <div key={block.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 p-4 text-xs items-center bg-destructive/[0.03] group hover:bg-destructive/[0.07]">
                                                    <div className="flex flex-col">
                                                        <div className="flex items-center gap-3 mb-1">
                                                            <span className="font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded text-[9px] tracking-widest uppercase">{t('halls.availability.blocked', 'BLOCKED')}</span>
                                                            <span className="text-foreground font-mono">{new Date(block.date).toLocaleDateString()}</span>
                                                        </div>
                                                        <div className="text-[9px] text-destructive/60 font-mono uppercase tracking-tighter truncate max-w-[200px]">{block.reason}</div>
                                                    </div>
                                                    <div className="font-mono text-destructive/80">{block.startTime} — {block.endTime}</div>
                                                    <div className="text-right">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/40 hover:text-destructive hover:bg-destructive/10" onClick={() => handleRemoveSlot(block.id, 'block')}>
                                                            <Trash2 className="size-3" />
                                                        </Button>
                                                    </div>
                                                </div>
                                            ))}
                                        </>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Hall Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[425px] glass border-primary/20 text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <Plus className="size-5 text-primary" />
                            {t('halls.dialog.title', 'REGISTER NEW SECTOR')}
                        </DialogTitle>
                        <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest mt-1">
                            {t('halls.dialog.desc', 'Establish a new geographical training zone.')}
                        </p>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">{t('halls.dialog.name', 'Sector Name')}</Label>
                            <Input
                                id="name"
                                value={hallForm.name}
                                onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
                                placeholder={t('halls.dialog.namePlaceholder', 'E.g. Alpha Wing Conference Hall')}
                                className="bg-input/50 border-input text-foreground font-mono text-xs"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="location" className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">{t('halls.dialog.location', 'Coordinates / Location')}</Label>
                            <Input
                                id="location"
                                value={hallForm.location}
                                onChange={(e) => setHallForm({ ...hallForm, location: e.target.value })}
                                placeholder={t('halls.dialog.locationPlaceholder', 'E.g. Level 3, Section B')}
                                className="bg-input/50 border-input text-foreground font-mono text-xs"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="capacity" className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">{t('halls.dialog.capacity', 'Maximum Capacity')}</Label>
                            <Input
                                id="capacity"
                                type="number"
                                value={hallForm.capacity}
                                onChange={(e) => setHallForm({ ...hallForm, capacity: parseInt(e.target.value) })}
                                className="bg-input/50 border-input text-foreground font-mono text-xs"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">Assign Program Officer</Label>
                            <Select 
                                value={hallForm.programOfficerId} 
                                onValueChange={(val) => setHallForm({ ...hallForm, programOfficerId: val })}
                            >
                                <SelectTrigger className="bg-input/50 border-input text-foreground font-mono text-xs">
                                    <SelectValue placeholder="Select Officer (Optional)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {officers.map(off => (
                                        <SelectItem key={off.id} value={off.id}>{off.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleCreateHall}
                            disabled={isSaving}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-widest uppercase py-6"
                        >
                            {isSaving ? t('halls.dialog.saving', 'SYCHRONIZING...') : t('halls.dialog.submit', 'COMMIT TO GRID')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Hall Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[425px] glass border-primary/20 text-foreground">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold tracking-tight flex items-center gap-2">
                            <Settings2 className="size-5 text-primary" />
                            {t('halls.dialog.editTitle', 'MODIFY SECTOR CONFIG')}
                        </DialogTitle>
                        <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest mt-1">
                            {t('halls.dialog.editDesc', 'Update geographical or personnel assignments.')}
                        </p>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name" className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">{t('halls.dialog.name', 'Sector Name')}</Label>
                            <Input
                                id="edit-name"
                                value={hallForm.name}
                                onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
                                className="bg-input/50 border-input text-foreground font-mono text-xs"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-location" className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">{t('halls.dialog.location', 'Coordinates / Location')}</Label>
                            <Input
                                id="edit-location"
                                value={hallForm.location}
                                onChange={(e) => setHallForm({ ...hallForm, location: e.target.value })}
                                className="bg-input/50 border-input text-foreground font-mono text-xs"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-capacity" className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">{t('halls.dialog.capacity', 'Maximum Capacity')}</Label>
                            <Input
                                id="edit-capacity"
                                type="number"
                                value={hallForm.capacity}
                                onChange={(e) => setHallForm({ ...hallForm, capacity: parseInt(e.target.value) })}
                                className="bg-input/50 border-input text-foreground font-mono text-xs"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">Assign Program Officer</Label>
                            <Select 
                                value={hallForm.programOfficerId || "none"} 
                                onValueChange={(val) => setHallForm({ ...hallForm, programOfficerId: val === 'none' ? '' : val })}
                            >
                                <SelectTrigger className="bg-input/50 border-input text-foreground font-mono text-xs">
                                    <SelectValue placeholder="Select Officer" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {officers.map(off => (
                                        <SelectItem key={off.id} value={off.id}>{off.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleUpdateHall}
                            disabled={isSaving}
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold tracking-widest uppercase py-6"
                        >
                            {isSaving ? t('halls.dialog.saving', 'SYCHRONIZING...') : t('halls.dialog.update', 'UPDATE CONFIG')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Halls;
