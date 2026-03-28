import React, { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Trash2, MapPin, Users, Activity, ShieldCheck, Clock, Settings2, Plus, AlertCircle, CheckCircle2, Calendar, LayoutGrid, List, Search, ChevronLeft, ChevronRight, Sun, Sunset } from 'lucide-react';
import { Hall, HallBlock, Training } from '../../types';
import { hallsApi, hallBlocksApi, trainingsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import LoadingAnimation from '../components/LoadingAnimation';
import { ClockTimePicker } from '../components/ui/clock-time-picker';

// Simple cn helper for conditional classes
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');
const getEntityId = (value: any): string => {
    if (typeof value === 'string' || typeof value === 'number') {
        return String(value);
    }
    return value?.id || value?._id || '';
};
const timeToMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    return (hours * 60) + minutes;
};
const getOverlapMinutes = (slotStart: number, slotEnd: number, eventStart: number, eventEnd: number) =>
    Math.max(0, Math.min(slotEnd, eventEnd) - Math.max(slotStart, eventStart));
type SlotStatus = 'available' | 'partial' | 'booked';

const Halls: React.FC = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    // Permissions: restricted from admin, enabled for program/medical officers per user request
    const isOfficer = user?.role === 'program_officer' || user?.role === 'medical_officer';
    const isAdmin = user?.role === 'master_admin';

    const [halls, setHalls] = useState<Hall[]>([]);
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

    useEffect(() => {
        fetchHalls();
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
        capacity: 50
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
                capacity: hallForm.capacity
            });
            toast.success(t('halls.alerts.createSuccess', 'Sector registered successfully'));
            setShowCreateDialog(false);
            setHallForm({ id: '', name: '', location: '', capacity: 50 });
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
                capacity: hallForm.capacity
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
            capacity: hall.capacity
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

        const getEventsForHallOnDate = (hallId: string, day: number) => {
            const dateKey = format(new Date(year, month, day), 'yyyy-MM-dd');
            const hallTrainings = trainings.filter((training) =>
                getEntityId(training.hallId) === hallId &&
                training.status !== 'cancelled' &&
                format(new Date(training.date), 'yyyy-MM-dd') === dateKey
            );
            const hallBlocks = allBlocks.filter((block) =>
                getEntityId(block.hallId) === hallId &&
                format(new Date(block.date), 'yyyy-MM-dd') === dateKey
            );

            return { trainings: hallTrainings, blocks: hallBlocks };
        };

        const getWindowAnalytics = (
            events: { trainings: Training[]; blocks: HallBlock[] },
            slotStart: string,
            slotEnd: string
        ) => {
            const start = timeToMinutes(slotStart);
            const end = timeToMinutes(slotEnd);
            const duration = Math.max(1, end - start);
            const overlaps = [...events.trainings, ...events.blocks].map((item) =>
                getOverlapMinutes(start, end, timeToMinutes(item.startTime), timeToMinutes(item.endTime))
            );
            const occupiedMinutes = Math.min(duration, overlaps.reduce((sum, minutes) => sum + minutes, 0));
            const occupiedPercent = Math.min(100, Math.round((occupiedMinutes / duration) * 100));
            const availablePercent = 100 - occupiedPercent;
            const status: SlotStatus =
                occupiedPercent === 0 ? 'available' : occupiedPercent >= 100 ? 'booked' : 'partial';

            return { occupiedPercent, availablePercent, status };
        };

        const getSlottedStatus = (day: number, hallId: string) => {
            const events = getEventsForHallOnDate(hallId, day);
            return {
                morning: getWindowAnalytics(events, '09:00', '12:00'),
                evening: getWindowAnalytics(events, '13:00', '17:00')
            };
        };

        if (loadingGrid) return <div className="p-20 text-center"><LoadingAnimation /></div>;

        return (
            <div className="space-y-8">
                <div className="mb-4 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-4">
                        <div>
                            <h3 className="text-2xl font-bold tracking-tight text-foreground">
                                {currentDate.toLocaleString('default', { month: 'long' })} {year}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                                Morning and evening availability for each hall
                            </p>
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" size="icon" onClick={prevMonth} className="size-9 rounded-full border-border bg-secondary/20 hover:bg-secondary/35"><ChevronLeft className="size-4" /></Button>
                            <Button variant="outline" size="icon" onClick={nextMonth} className="size-9 rounded-full border-border bg-secondary/20 hover:bg-secondary/35"><ChevronRight className="size-4" /></Button>
                        </div>
                    </div>

                        <div className="flex flex-wrap gap-2 rounded-2xl border border-border/60 bg-secondary/10 p-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-2 rounded-full bg-background/60 px-3 py-1.5"><div className="size-2 rounded-full bg-emerald-500" /> Morning available</div>
                            <div className="flex items-center gap-2 rounded-full bg-background/60 px-3 py-1.5"><div className="size-2 rounded-full bg-rose-500" /> Morning booked</div>
                            <div className="flex items-center gap-2 rounded-full bg-background/60 px-3 py-1.5"><div className="size-2 rounded-full bg-amber-400" /> Partial window</div>
                            <div className="flex items-center gap-2 rounded-full bg-background/60 px-3 py-1.5"><div className="size-2 rounded-full bg-cyan-400" /> Evening available</div>
                            <div className="flex items-center gap-2 rounded-full bg-background/60 px-3 py-1.5"><div className="size-2 rounded-full bg-rose-400" /> Evening booked</div>
                        </div>
                </div>

                <div className="grid gap-12">
                    {filteredHalls.map((hall) => (
                        <div key={hall.id} className="space-y-4 rounded-3xl border border-border/50 bg-secondary/5 p-5">
                            <div className="flex flex-col gap-3 border-b border-border/60 pb-4 md:flex-row md:items-center md:justify-between">
                                <div className="space-y-2">
                                    <h4 className="flex items-center gap-2 text-xl font-semibold text-foreground">
                                        <MapPin className="size-4 text-primary" />
                                        {hall.name}
                                    </h4>
                                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                                        <span className="rounded-full bg-background/60 px-3 py-1">{hall.location}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-2 rounded-full bg-background/60 px-3 py-1 text-sm text-muted-foreground">
                                        <Users className="size-3.5" />
                                        {hall.capacity} seats
                                    </span>
                                </div>
                            </div>
                            <div className="grid grid-cols-7 gap-2">
                                {['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].map(d => (
                                    <div key={d} className="p-1 text-center text-[11px] font-semibold tracking-[0.16em] text-muted-foreground">{d}</div>
                                ))}
                                {Array.from({ length: firstDayOfMonth(year, month) }).map((_, i) => (
                                    <div key={`empty-${i}`} className="p-4" />
                                ))}
                                {Array.from({ length: daysInMonth(year, month) }).map((_, i) => {
                                    const day = i + 1;
                                    const { morning, evening } = getSlottedStatus(day, hall.id);
                                    const getSlotLabel = (slot: { availablePercent: number; status: SlotStatus }) => {
                                        if (slot.status === 'booked') return 'Booked';
                                        if (slot.status === 'partial') return `${slot.availablePercent}% free`;
                                        return 'Open';
                                    };
                                    const getBarClass = (slot: { status: SlotStatus }, tone: 'morning' | 'evening') => {
                                        if (slot.status === 'booked') {
                                            return tone === 'morning' ? 'bg-rose-500/80' : 'bg-rose-400/85';
                                        }
                                        if (slot.status === 'partial') {
                                            return tone === 'morning' ? 'bg-amber-400/85' : 'bg-sky-400/85';
                                        }
                                        return tone === 'morning' ? 'bg-emerald-500/65' : 'bg-cyan-400/80';
                                    };
                                    const getTextClass = (slot: { status: SlotStatus }, tone: 'morning' | 'evening') => {
                                        if (slot.status === 'booked') return tone === 'morning' ? 'text-rose-500' : 'text-rose-400';
                                        if (slot.status === 'partial') return tone === 'morning' ? 'text-amber-400' : 'text-sky-400';
                                        return tone === 'morning' ? 'text-emerald-400' : 'text-cyan-400';
                                    };
                                    const morningLabel = getSlotLabel(morning);
                                    const eveningLabel = getSlotLabel(evening);
                                    return (
                                        <div 
                                            key={day} 
                                            title={`Day ${day}: Morning ${morningLabel}, Evening ${eveningLabel}`}
                                            className={cn(
                                                "relative h-24 overflow-hidden rounded-2xl border border-border/60 p-3 transition-all group hover:border-primary/30 hover:bg-secondary/20",
                                                morning.status === 'booked' && evening.status === 'booked' ? "bg-rose-500/5" : "bg-secondary/10"
                                            )}
                                        >
                                            <span className="absolute right-3 top-2 text-xs font-semibold text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">{day}</span>
                                            
                                            <div className="mt-6 flex flex-col gap-2.5">
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <Sun className={cn("size-3", getTextClass(morning, 'morning'))} />
                                                        <span className="text-[10px] font-medium text-foreground">Morning</span>
                                                    </div>
                                                    <span className={cn("text-[10px] font-semibold", getTextClass(morning, 'morning'))}>{morningLabel}</span>
                                                </div>
                                                <div className={cn("h-1.5 rounded-full", getBarClass(morning, 'morning'))} />
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <Sunset className={cn("size-3", getTextClass(evening, 'evening'))} />
                                                        <span className="text-[10px] font-medium text-foreground">Evening</span>
                                                    </div>
                                                    <span className={cn("text-[10px] font-semibold", getTextClass(evening, 'evening'))}>{eveningLabel}</span>
                                                </div>
                                                <div className={cn("h-1.5 rounded-full", getBarClass(evening, 'evening'))} />
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
                    <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
                        <MapPin className="size-8 sm:size-10 text-primary" />
                        {t('halls.title', 'DEPLOYMENT HALLS')}
                    </h1>
                    <p className="text-muted-foreground mt-2 text-sm">{t('halls.subtitle', 'Manage halls, schedules, and capacity in one place')}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder={t('halls.searchPlaceholder', 'Search by hall name or location')}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 h-12 rounded-full bg-secondary/20 border-transparent focus-visible:border-primary/40"
                        />
                    </div>
                    
                    <div className="flex bg-secondary/20 p-1 rounded-full border border-border/60">
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setViewMode('list')}
                            className={cn("h-10 px-4 rounded-full text-sm font-medium", viewMode === 'list' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                        >
                            <List className="size-4 mr-2" /> {t('halls.view.list', 'List')}
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setViewMode('grid')}
                            className={cn("h-10 px-4 rounded-full text-sm font-medium", viewMode === 'grid' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                        >
                            <LayoutGrid className="size-4 mr-2" /> {t('halls.view.grid', 'Grid')}
                        </Button>
                    </div>

                    {isAdmin && (
                        <Button
                            onClick={() => setShowCreateDialog(true)}
                            className="rounded-full px-6 bg-foreground text-background hover:bg-white/90 font-semibold"
                        >
                            <Plus className="size-4 mr-2" />
                            {t('halls.registerNew', 'Add New Hall')}
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="rounded-full bg-secondary/15 px-3 py-1.5">
                    {filteredHalls.length} hall{filteredHalls.length === 1 ? '' : 's'} shown
                </span>
                <span className="rounded-full bg-secondary/15 px-3 py-1.5">
                    Switch to grid view for a quick monthly availability overview
                </span>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                    <LoadingAnimation text={t('halls.loading', 'MAP SCAN IN PROGRESS...')} />
                </div>
            ) : viewMode === 'grid' ? (
                <Card className="p-6 border-border/60 bg-card/95 shadow-sm">
                    <MonthlyGridView />
                </Card>
            ) : filteredHalls.length === 0 ? (
                <div className="text-center py-20 bg-secondary/10 rounded-3xl border border-dashed border-border">
                    <Activity className="size-12 mx-auto mb-4 text-muted-foreground/40" />
                    <h3 className="text-xl font-semibold text-foreground">{t('halls.noSectors', 'No sectors found')}</h3>
                    <p className="text-muted-foreground mt-2 text-sm">{t('halls.noSectorsDesc', 'No halls match the current filter.')}</p>
                </div>
            ) : (
                <Card className="overflow-hidden border-border/60 bg-card/95 shadow-sm">
                        <CardHeader className="pb-4 border-b border-border/60 bg-secondary/10">
                            <CardTitle className="text-base font-semibold text-foreground flex items-center gap-2">
                                <ShieldCheck className="size-4" />
                                {t('halls.activeSectors', 'Registered Halls')}
                            </CardTitle>
                        </CardHeader>
                    <CardContent className="pt-6">
                        <Table>
                                <TableHeader>
                                    <TableRow className="hover:bg-transparent border-border/60">
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">{t('halls.table.name', 'Sector Name')}</TableHead>
                                        <TableHead className="text-xs uppercase tracking-wider text-muted-foreground">{t('halls.table.capacity', 'Capacity')}</TableHead>
                                        <TableHead className="text-right text-xs uppercase tracking-wider text-muted-foreground">{t('halls.table.actions', 'Actions')}</TableHead>
                                    </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredHalls.map((hall) => (
                                    <TableRow key={hall.id} className="group border-border/40">
                                        <TableCell className="py-4 font-semibold text-foreground">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3">
                                                    <div className="size-10 rounded-xl bg-secondary/20 flex items-center justify-center text-primary border border-border/60">
                                                        <MapPin className="size-4" />
                                                    </div>
                                                    {hall.name}
                                                </div>
                                                <span className="text-xs text-muted-foreground ml-[3.25rem]">{hall.location}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="size-4 text-primary/70" />
                                                <span className="text-base font-semibold text-foreground">{hall.capacity}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleManageAvailability(hall)}
                                                    className="rounded-full border-border bg-secondary/20 hover:bg-secondary/35 text-foreground font-medium"
                                                >
                                                    <Settings2 className="size-3.5 mr-1.5" />
                                                    Manage schedule
                                                </Button>
                                                {isAdmin && (
                                                    <>
                                                        <Button
                                                            variant="outline"
                                                            size="icon"
                                                            onClick={() => handleEditHall(hall)}
                                                            className="h-9 w-9 rounded-full border-border bg-secondary/20 text-muted-foreground hover:text-foreground hover:bg-secondary/35"
                                                        >
                                                            <Settings2 className="size-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteHall(hall.id, hall.name)}
                                                            className="h-9 w-9 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-full"
                                                        >
                                                            <Trash2 className="size-4" />
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
                            Manage hall schedule: {selectedHall?.name}
                        </DialogTitle>
                        <DialogDescription className="mt-1 text-sm text-muted-foreground">
                            Add weekly availability or set one-off date changes for this hall.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-6" id="availability-controls">
                        {/* Tab Switcher */}
                        <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
                            <button
                                className={cn("flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all", slotType === 'weekly' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
                                onClick={() => setSlotType('weekly')}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Clock className="size-3.5" /> Weekly schedule
                                </div>
                            </button>
                            <button
                                className={cn("flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-all", slotType === 'date' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-muted')}
                                onClick={() => setSlotType('date')}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Calendar className="size-3.5" /> Specific date
                                </div>
                            </button>
                        </div>

                        {/* Action Type Selector (Only for Date Tab) */}
                        {slotType === 'date' && (
                            <div className="flex bg-muted/50 p-1 rounded-xl border border-border w-fit self-center">
                                <button
                                    className={cn("rounded-lg px-4 py-1.5 text-sm font-medium transition-all", actionType === 'available' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-muted-foreground hover:text-foreground')}
                                    onClick={() => setActionType('available')}
                                >
                                    Mark available
                                </button>
                                <button
                                    className={cn("rounded-lg px-4 py-1.5 text-sm font-medium transition-all", actionType === 'block' ? 'bg-destructive/20 text-destructive border border-destructive/30' : 'text-muted-foreground hover:text-white')}
                                    onClick={() => setActionType('block')}
                                >
                                    Block time
                                </button>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-primary/5 p-6 rounded-2xl border border-primary/10">
                            {/* Inputs */}
                            <div className="space-y-4">
                                {slotType === 'weekly' ? (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-foreground">Day of week</Label>
                                        <Select
                                            value={newSlot.dayOfWeek.toString()}
                                            onValueChange={(val) => setNewSlot({ ...newSlot, dayOfWeek: parseInt(val) })}
                                        >
                                            <SelectTrigger className="bg-input/50 border-input text-foreground text-sm">
                                                <SelectValue placeholder="Select day" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover border-border/50 text-foreground text-sm">
                                                {daysOfWeek.map((day, index) => (
                                                    <SelectItem key={index} value={index.toString()}>{day}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-foreground">Date</Label>
                                        <Input
                                            type="date"
                                            value={specificDate}
                                            onChange={(e) => setSpecificDate(e.target.value)}
                                            className="bg-input/50 border-input text-foreground text-sm"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-foreground">Start time</Label>
                                        <ClockTimePicker
                                            value={newSlot.startTime}
                                            onChange={(val) => setNewSlot({ ...newSlot, startTime: val })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium text-foreground">End time</Label>
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
                                        <Label className="text-sm font-medium text-foreground">Reason for blocking</Label>
                                        <Select value={reason} onValueChange={setReason}>
                                            <SelectTrigger className="bg-destructive/5 border-destructive/20 text-foreground text-sm">
                                                <SelectValue placeholder="Select reason" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-popover border-border/50 text-foreground text-sm">
                                                {reasons.map((r) => (
                                                    <SelectItem key={r} value={r}>{r}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    {reason === 'Other' && (
                                        <Input
                                            placeholder={t('halls.form.specifyIntel', 'Type the reason')}
                                            value={customReason}
                                            onChange={(e) => setCustomReason(e.target.value)}
                                            className="bg-input/50 border-input text-foreground text-sm"
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-4 border border-primary/20 rounded-xl bg-primary/5 border-dashed">
                                    <CheckCircle2 className="size-8 text-primary/20 mb-2" />
                                    <p className="text-xs text-primary/60 text-center leading-relaxed">{t('halls.form.defineNew', 'Add a time range to make this hall available for bookings.')}</p>
                                </div>
                            )}
                        </div>

                        <Button
                            className={cn("w-full py-6 text-sm font-semibold transition-all", slotType === 'date' && actionType === 'block' ? 'bg-destructive/20 hover:bg-destructive text-destructive hover:text-white border border-destructive/30' : 'bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30')}
                            onClick={handleAddSlot}
                        >
                            {slotType === 'date' && actionType === 'block' ? (
                                <><AlertCircle className="size-4 mr-2" /> {t('halls.buttons.abortSector', 'Save blocked time')}</>
                            ) : (
                                <><Plus className="size-4 mr-2" /> {t('halls.buttons.commitDeployment', 'Add availability')}</>
                            )}
                        </Button>
                    </div>

                    <div className="space-y-6 pt-2">
                        {/* Weekly Slots Display */}
                        {slotType === 'weekly' && (
                            <div className="border border-border/50 rounded-2xl overflow-hidden bg-muted/20">
                                <div className="bg-primary/10 p-3 text-sm font-semibold text-primary flex items-center gap-2">
                                    <Clock className="size-3" />
                                    {t('halls.availability.recurringTitle', 'Weekly availability')}
                                </div>
                                <div className="divide-y divide-border/20">
                                    {availability.filter(s => !s.specificDate).length === 0 ? (
                                        <div className="p-8 text-center text-sm text-muted-foreground italic opacity-70">{t('halls.availability.noRecurring', 'No weekly availability has been added yet.')}</div>
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
                                <div className="bg-primary/10 p-3 text-sm font-semibold text-primary flex items-center gap-2">
                                    <Calendar className="size-3" />
                                    {t('halls.availability.dateTitle', 'Date-specific changes')}
                                </div>
                                <div className="divide-y divide-border/20">
                                    {availability.filter(s => s.specificDate).length === 0 && blocks.length === 0 ? (
                                        <div className="p-8 text-center text-sm text-muted-foreground italic opacity-70">{t('halls.availability.noDate', 'No one-off date changes have been added yet.')}</div>
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
                <DialogContent className="sm:max-w-[520px] border-border/70 bg-background/95 text-foreground backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
                            <Plus className="size-5 text-primary" />
                            {t('halls.dialog.title', 'Register New Hall')}
                        </DialogTitle>
                        <p className="text-muted-foreground text-sm mt-1">
                            {t('halls.dialog.desc', 'Add a new hall and assign its basic details.')}
                        </p>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="name" className="text-sm font-medium">{t('halls.dialog.name', 'Hall Name')}</Label>
                            <Input
                                id="name"
                                value={hallForm.name}
                                onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
                                placeholder={t('halls.dialog.namePlaceholder', 'E.g. Alpha Wing Conference Hall')}
                                className="h-11 bg-secondary/20 border-transparent focus-visible:border-primary/40"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="location" className="text-sm font-medium">{t('halls.dialog.location', 'Location')}</Label>
                            <Input
                                id="location"
                                value={hallForm.location}
                                onChange={(e) => setHallForm({ ...hallForm, location: e.target.value })}
                                placeholder={t('halls.dialog.locationPlaceholder', 'E.g. Level 3, Section B')}
                                className="h-11 bg-secondary/20 border-transparent focus-visible:border-primary/40"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="capacity" className="text-sm font-medium">{t('halls.dialog.capacity', 'Capacity')}</Label>
                            <Input
                                id="capacity"
                                type="number"
                                value={hallForm.capacity}
                                onChange={(e) => setHallForm({ ...hallForm, capacity: parseInt(e.target.value) })}
                                className="h-11 bg-secondary/20 border-transparent focus-visible:border-primary/40"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleCreateHall}
                            disabled={isSaving}
                            className="w-full h-11 rounded-xl bg-foreground text-background hover:bg-white/90 font-semibold"
                        >
                            {isSaving ? t('halls.dialog.saving', 'Saving...') : t('halls.dialog.submit', 'Create Hall')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Hall Dialog */}
            <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogContent className="sm:max-w-[520px] border-border/70 bg-background/95 text-foreground backdrop-blur-xl">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold tracking-tight flex items-center gap-2">
                            <Settings2 className="size-5 text-primary" />
                            {t('halls.dialog.editTitle', 'Edit Hall')}
                        </DialogTitle>
                        <p className="text-muted-foreground text-sm mt-1">
                            {t('halls.dialog.editDesc', 'Update the hall details.')}
                        </p>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-name" className="text-sm font-medium">{t('halls.dialog.name', 'Hall Name')}</Label>
                            <Input
                                id="edit-name"
                                value={hallForm.name}
                                onChange={(e) => setHallForm({ ...hallForm, name: e.target.value })}
                                className="h-11 bg-secondary/20 border-transparent focus-visible:border-primary/40"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-location" className="text-sm font-medium">{t('halls.dialog.location', 'Location')}</Label>
                            <Input
                                id="edit-location"
                                value={hallForm.location}
                                onChange={(e) => setHallForm({ ...hallForm, location: e.target.value })}
                                className="h-11 bg-secondary/20 border-transparent focus-visible:border-primary/40"
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="edit-capacity" className="text-sm font-medium">{t('halls.dialog.capacity', 'Capacity')}</Label>
                            <Input
                                id="edit-capacity"
                                type="number"
                                value={hallForm.capacity}
                                onChange={(e) => setHallForm({ ...hallForm, capacity: parseInt(e.target.value) })}
                                className="h-11 bg-secondary/20 border-transparent focus-visible:border-primary/40"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            onClick={handleUpdateHall}
                            disabled={isSaving}
                            className="w-full h-11 rounded-xl bg-foreground text-background hover:bg-white/90 font-semibold"
                        >
                            {isSaving ? t('halls.dialog.saving', 'Saving...') : t('halls.dialog.update', 'Update Hall')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default Halls;
