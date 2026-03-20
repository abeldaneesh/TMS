import React, { useEffect, useState, useMemo } from 'react';
import { hallsApi, trainingsApi, hallBlocksApi } from '../../services/api';
import { Hall, Training, HallBlock } from '../../types';
import { DoorOpen, Calendar, Clock, CheckCircle, XCircle, Search, Ban, LayoutGrid, List, ChevronLeft, ChevronRight, MapPin, Users, Sun, Sunset, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { format } from 'date-fns';
import LoadingAnimation from '../components/LoadingAnimation';
import { ClockTimePicker } from '../components/ui/clock-time-picker';

// Simple cn helper for conditional classes
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

const HallAvailability: React.FC = () => {
    const { user } = useAuth();
    const isOfficer = user?.role === 'program_officer' || user?.role === 'medical_officer' || user?.role === 'master_admin';

    const [halls, setHalls] = useState<Hall[]>([]);
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [blocks, setBlocks] = useState<HallBlock[]>([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [searchTerm, setSearchTerm] = useState('');

    // List view filters
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [startTime, setStartTime] = useState('09:00');
    const [endTime, setEndTime] = useState('17:00');
    const [availability, setAvailability] = useState<Record<string, boolean>>({});
    const [checking, setChecking] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [hallsData, trainingsData, blocksData] = await Promise.all([
                    hallsApi.getAll().catch(err => { console.error('Halls fetch fail:', err); return []; }),
                    trainingsApi.getAll().catch(err => { console.error('Trainings fetch fail:', err); return []; }),
                    hallBlocksApi.getAll().catch(err => { console.error('Blocks fetch fail:', err); return []; })
                ]);
                setHalls(hallsData);
                setTrainings(trainingsData);
                setBlocks(blocksData);
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const checkAvailability = async () => {
        if (!selectedDate || !startTime || !endTime) return;
        setChecking(true);
        try {
            const availableHalls = await hallsApi.getAvailableHalls(
                new Date(selectedDate),
                startTime,
                endTime
            );
            const availableIds = availableHalls.map(h => h.id);
            const results: Record<string, boolean> = {};
            halls.forEach(hall => {
                results[hall.id] = availableIds.includes(hall.id);
            });
            setAvailability(results);
        } catch (error) {
            console.error('Error checking availability:', error);
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        if (halls.length > 0) checkAvailability();
    }, [halls, selectedDate, startTime, endTime]);

    const filteredHalls = useMemo(() => {
        return halls.filter(hall => 
            hall.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            hall.location.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [halls, searchTerm]);

    const getEventsForHallOnDate = (hallId: string) => {
        const dateStr = format(new Date(selectedDate), 'yyyy-MM-dd');
        const hallTrainings = trainings.filter(t => 
            t.hallId === hallId && 
            t.status !== 'cancelled' && 
            format(new Date(t.date), 'yyyy-MM-dd') === dateStr
        );
        const hallBlocks = blocks.filter(b => 
            b.hallId === hallId && 
            format(new Date(b.date), 'yyyy-MM-dd') === dateStr
        );
        return { trainings: hallTrainings, blocks: hallBlocks };
    };

    // Blocking Dialog State
    const [showBlockDialog, setShowBlockDialog] = useState(false);
    const [blockingHall, setBlockingHall] = useState<Hall | null>(null);
    const [blockReason, setBlockReason] = useState('Maintenance / Repair');
    const [customReason, setCustomReason] = useState('');
    const [isBlocking, setIsBlocking] = useState(false);

    const reasons = [
        'Meeting / Internal Booking',
        'Maintenance / Repair',
        'Cleaning / Sanitization',
        'Inspection / Audit',
        'Other'
    ];

    const handleBlockClick = (hall: Hall) => {
        setBlockingHall(hall);
        setShowBlockDialog(true);
    };

    const handleCellClick = (hallId: string, day: number) => {
        if (user?.role !== 'master_admin') return;
        const hall = halls.find(h => h.id === hallId);
        if (hall) {
            setBlockingHall(hall);
            setShowBlockDialog(true);
        }
    };

    const submitBlock = async () => {
        if (!blockingHall || !user) return;
        setIsBlocking(true);
        try {
            const finalReason = blockReason === 'Other' ? customReason : blockReason;
            await hallBlocksApi.create({
                hallId: blockingHall.id,
                date: new Date(selectedDate),
                startTime,
                endTime,
                reason: finalReason
            });
            toast.success('Hall blocked successfully');
            setShowBlockDialog(false);
            // Refresh blocks
            const blocksData = await hallBlocksApi.getAll();
            setBlocks(blocksData);
            checkAvailability();
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to block hall');
        } finally {
            setIsBlocking(false);
        }
    };

    const MonthlyGridView: React.FC = () => {
        const [currentDate, setCurrentDate] = useState(new Date());
        const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
        const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
        const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

        const getSlottedStatus = (day: number, hallId: string) => {
            const date = new Date(year, month, day);
            const dateStr = format(date, 'yyyy-MM-dd');

            const dayTrainings = trainings.filter(t => 
                t.hallId === hallId && 
                format(new Date(t.date), 'yyyy-MM-dd') === dateStr &&
                t.status !== 'cancelled'
            );

            const dayBlocks = blocks.filter(b => 
                b.hallId === hallId && 
                format(new Date(b.date), 'yyyy-MM-dd') === dateStr
            );

            const morningOccupied = dayTrainings.some(t => t.startTime < '13:30' && t.endTime > '10:00') ||
                                    dayBlocks.some(b => b.startTime < '13:30' && b.endTime > '10:00');
            
            const afternoonOccupied = dayTrainings.some(t => t.startTime >= '13:30' || t.endTime > '14:00') ||
                                       dayBlocks.some(b => b.startTime >= '13:30' || b.endTime > '14:00');

            return {
                morning: morningOccupied ? 'booked' : 'available',
                afternoon: afternoonOccupied ? 'booked' : 'available'
            };
        };

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
                                        {hall.capacity} CAPACITY
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
                                        <div key={day} className="relative p-3 h-20 border border-primary/10 rounded-xl bg-primary/5 hover:bg-primary/10 transition-all group overflow-hidden">
                                            <span className="absolute top-1 right-2 text-[10px] font-bold font-mono opacity-30">{day}</span>
                                            <div className="flex flex-col gap-2 mt-4">
                                                <div className="flex items-center justify-between gap-1">
                                                    <div className="flex items-center gap-1.5 min-w-[30px]">
                                                        <Sun className={cn("size-2.5", morning === 'available' ? "text-emerald-500" : "text-rose-500")} />
                                                        <span className={cn("text-[8px] font-bold tracking-tighter uppercase", morning === 'available' ? "text-emerald-500" : "text-rose-500")}>AM</span>
                                                    </div>
                                                    <div className={cn("h-1 flex-1 rounded-full", morning === 'available' ? "bg-emerald-500/20" : "bg-rose-500/60")} />
                                                </div>
                                                <div className="flex items-center justify-between gap-1">
                                                    <div className="flex items-center gap-1.5 min-w-[30px]">
                                                        <Sunset className={cn("size-2.5", afternoon === 'available' ? "text-emerald-500" : "text-rose-500")} />
                                                        <span className={cn("text-[8px] font-bold tracking-tighter uppercase", afternoon === 'available' ? "text-emerald-500" : "text-rose-500")}>PM</span>
                                                    </div>
                                                    <div className={cn("h-1 flex-1 rounded-full", afternoon === 'available' ? "bg-emerald-500/20" : "bg-rose-500/60")} />
                                                </div>
                                            </div>
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

    if (loading) return <div className="flex items-center justify-center py-20"><LoadingAnimation text="Scanning Venue Grid..." /></div>;

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tighter flex items-center gap-3 uppercase">
                        <Calendar className="size-8 text-primary" />
                        Hall Availability
                    </h1>
                    <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-widest opacity-70">Check and Manage Sector Occupancy</p>
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                    <div className="relative group flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder="Filter halls or location..."
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
                            <List className="size-3 mr-2" /> LIST
                        </Button>
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => setViewMode('grid')}
                            className={cn("h-8 px-3 rounded-lg text-[10px] font-bold tracking-widest uppercase", viewMode === 'grid' ? "bg-primary text-primary-foreground" : "text-muted-foreground")}
                        >
                            <LayoutGrid className="size-3 mr-2" /> GRID
                        </Button>
                    </div>
                </div>
            </div>

            {viewMode === 'list' && (
                <Card className="glass-card mb-6 border-primary/20 bg-primary/5">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-sm font-bold text-primary tracking-[0.2em] flex items-center gap-2 uppercase">
                            <Clock className="size-4" />
                            AVAILABILITY PROTOCOL
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold font-mono uppercase tracking-widest text-primary/70">Date</Label>
                                <Input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => setSelectedDate(e.target.value)}
                                    className="bg-background/50 border-primary/10 text-xs font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold font-mono uppercase tracking-widest text-primary/70">Start Time</Label>
                                <ClockTimePicker value={startTime} onChange={setStartTime} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold font-mono uppercase tracking-widest text-primary/70">End Time</Label>
                                <ClockTimePicker value={endTime} onChange={setEndTime} />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {viewMode === 'grid' ? (
                <Card className="glass-card p-6">
                    <MonthlyGridView />
                </Card>
            ) : filteredHalls.length === 0 ? (
                <div className="text-center py-20 bg-primary/5 rounded-3xl border border-dashed border-primary/20">
                    <Info className="size-12 mx-auto mb-4 text-primary/20 animate-pulse" />
                    <h3 className="text-xl font-bold text-foreground tracking-widest uppercase">No Halls Detected</h3>
                    <p className="text-muted-foreground mt-2 font-mono text-[10px] uppercase tracking-widest">Sector search returned zero results.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredHalls.map((hall) => {
                        const isAvailable = availability[hall.id];
                        const events = getEventsForHallOnDate(hall.id);

                        return (
                            <Card key={hall.id} className={cn("glass-card transition-all group overflow-hidden", isAvailable ? 'border-emerald-500/20' : 'border-rose-500/20')}>
                                <CardHeader className={cn("pb-4", isAvailable ? "bg-emerald-500/5" : "bg-rose-500/5")}>
                                    <div className="flex items-start justify-between">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2">
                                                <DoorOpen className={cn("size-4", isAvailable ? "text-emerald-500" : "text-rose-500")} />
                                                <CardTitle className="text-lg font-bold group-hover:text-primary transition-colors">{hall.name}</CardTitle>
                                            </div>
                                            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono uppercase tracking-wider">
                                                <MapPin className="size-3" />
                                                {hall.location}
                                            </div>
                                        </div>
                                        <div className={cn("p-1.5 rounded-lg border", isAvailable ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" : "bg-rose-500/10 border-rose-500/20 text-rose-500")}>
                                            {isAvailable ? <CheckCircle className="size-5" /> : <XCircle className="size-5" />}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                            <Users className="size-3 text-primary/50" />
                                            CAPACITY
                                        </div>
                                        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px] px-2 py-0">
                                            {hall.capacity} SEATS
                                        </Badge>
                                    </div>

                                    {(events.trainings.length > 0 || events.blocks.length > 0) && (
                                        <div className="space-y-3 pt-4 border-t border-border/50">
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                                                <Info className="size-3" />
                                                Daily Intel: {format(new Date(selectedDate), 'MMM dd')}
                                            </p>

                                            {events.blocks.map((block) => (
                                                <div key={block.id} className="p-2.5 rounded-xl bg-rose-500/5 border border-rose-500/10 space-y-1">
                                                    <div className="flex items-center gap-2 text-rose-500 font-bold text-[10px] uppercase">
                                                        <Ban className="size-3" />
                                                        BLOCKED: {block.reason}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-muted-foreground font-mono text-[9px]">
                                                        <Clock className="size-3" /> {block.startTime} — {block.endTime}
                                                    </div>
                                                </div>
                                            ))}

                                            {events.trainings.map((training) => (
                                                <div key={training.id} className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 space-y-1">
                                                    <div className="font-bold text-[10px] uppercase truncate">{training.title}</div>
                                                    <div className="flex items-center gap-2 text-muted-foreground font-mono text-[9px]">
                                                        <Clock className="size-3" /> {training.startTime} — {training.endTime}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {user?.role === 'master_admin' && (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="w-full mt-4 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white border-rose-500/20 text-[10px] font-bold tracking-[0.2em] uppercase rounded-xl transition-all"
                                            onClick={() => handleBlockClick(hall)}
                                        >
                                            <Ban className="size-3 mr-2" />
                                            Abort Sector Ops
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            {/* Block Hall Dialog */}
            <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
                <DialogContent className="glass border-rose-500/20">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-500">
                            <Ban className="size-5" />
                            ABORT SECTOR OPERATION
                        </DialogTitle>
                        <DialogDescription className="font-mono text-[10px] uppercase tracking-widest">
                            {blockingHall?.name} — {format(new Date(selectedDate), 'MMM dd, yyyy')}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-6 py-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Start Intel</Label>
                                <ClockTimePicker value={startTime} onChange={setStartTime} />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/70">End Intel</Label>
                                <ClockTimePicker value={endTime} onChange={setEndTime} />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold uppercase tracking-widest text-primary/70">Reason for Abort</Label>
                            <Select value={blockReason} onValueChange={setBlockReason}>
                                <SelectTrigger className="bg-background/50 border-input font-mono text-xs">
                                    <SelectValue placeholder="Select protocol" />
                                </SelectTrigger>
                                <SelectContent>
                                    {reasons.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {blockReason === 'Other' && (
                            <Input
                                value={customReason}
                                onChange={(e) => setCustomReason(e.target.value)}
                                placeholder="Specify custom Intel..."
                                className="bg-background/50 font-mono text-xs"
                            />
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowBlockDialog(false)} className="rounded-xl font-bold tracking-widest uppercase">Recall</Button>
                        <Button variant="destructive" onClick={submitBlock} disabled={isBlocking} className="rounded-xl font-bold tracking-widest uppercase">
                            {isBlocking ? 'Synchronizing...' : 'Commit Abort'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default HallAvailability;
