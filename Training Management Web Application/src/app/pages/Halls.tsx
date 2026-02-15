import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Trash2, MapPin, Users, Activity, ShieldCheck, Clock, Settings2, Plus, AlertCircle, CheckCircle2, Calendar } from 'lucide-react';
import { Hall, HallBlock } from '../../types';
import { hallsApi, hallBlocksApi } from '../../services/api';
import { toast } from 'sonner';

const Halls: React.FC = () => {
    const [halls, setHalls] = useState<Hall[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHalls = async () => {
            try {
                const data = await hallsApi.getAll();
                setHalls(data);
            } catch (error) {
                console.error('Failed to fetch halls', error);
            } finally {
                setLoading(false);
            }
        };

        fetchHalls();
    }, []);

    const [selectedHall, setSelectedHall] = useState<Hall | null>(null);
    const [availability, setAvailability] = useState<any[]>([]);
    const [blocks, setBlocks] = useState<HallBlock[]>([]);

    const [showAvailabilityDialog, setShowAvailabilityDialog] = useState(false);
    const [slotType, setSlotType] = useState<'weekly' | 'date'>('weekly'); // Tab switcher
    const [actionType, setActionType] = useState<'available' | 'block'>('available'); // Action type for specific date

    // Form States
    const [specificDate, setSpecificDate] = useState('');
    const [reason, setReason] = useState('');
    const [customReason, setCustomReason] = useState('');

    const [newSlot, setNewSlot] = useState({
        dayOfWeek: 1,
        startTime: '09:00',
        endTime: '17:00'
    });

    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const reasons = [
        'Hall Booked',
        'Maintenance / Repair',
        'Cleaning / Sanitization',
        'Inspection / Audit',
        'Other'
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
            toast.error('Failed to fetch availability details');
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
                        toast.error('Please select a date');
                        return;
                    }
                    payload.specificDate = specificDate;
                }

                await hallsApi.addAvailability(selectedHall.id, payload);
                toast.success('Availability slot added');
            }
            // Logic for Blocking a specific date
            else if (slotType === 'date' && actionType === 'block') {
                if (!specificDate) {
                    toast.error('Please select a date');
                    return;
                }
                const finalReason = reason === 'Other' ? customReason : reason;
                if (!finalReason) {
                    toast.error('Please specify a reason');
                    return;
                }

                await hallBlocksApi.create({
                    hallId: selectedHall.id,
                    date: new Date(specificDate),
                    startTime: newSlot.startTime,
                    endTime: newSlot.endTime,
                    reason: finalReason
                });
                toast.success('Hall blocked successfully');
            }

            // Refresh list
            fetchAvailabilityAndBlocks(selectedHall.id);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || error.message || 'Failed to update availability');
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
            toast.success('Removed successfully');
            fetchAvailabilityAndBlocks(selectedHall.id);
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.message || 'Failed to remove');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold tracking-tighter text-foreground flex items-center gap-3">
                        <MapPin className="size-8 text-primary animate-pulse-glow" />
                        DEPLOYMENT HALLS
                        <div className="h-1 w-20 bg-gradient-to-r from-primary to-transparent rounded-full ml-4 hidden md:block" />
                    </h1>
                    <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-widest opacity-70">Physical Training Sectors & Capacity Oversight</p>
                </div>
            </div>

            <Card className="glass-card overflow-hidden">
                <CardHeader className="pb-4 border-b border-primary/10 bg-primary/5">
                    <CardTitle className="text-sm font-bold text-primary tracking-[0.2em] flex items-center gap-2 uppercase">
                        <ShieldCheck className="size-4" />
                        ACTIVE SECTORS
                    </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <div className="relative size-12 mb-4">
                                <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
                                <div className="absolute inset-0 border-r-2 border-secondary rounded-full animate-spin [animation-duration:1.5s]" />
                            </div>
                            <p className="text-primary font-mono text-xs tracking-widest animate-pulse">MAP SCAN IN PROGRESS...</p>
                        </div>
                    ) : halls.length === 0 ? (
                        <div className="text-center py-20 bg-primary/5 rounded-3xl border border-dashed border-primary/20">
                            <Activity className="size-12 mx-auto mb-4 text-primary/20 animate-pulse" />
                            <h3 className="text-xl font-bold text-foreground tracking-widest uppercase">No Sectors Detected</h3>
                            <p className="text-muted-foreground mt-2 font-mono text-[10px] uppercase tracking-widest">Global sector grid is currently void.</p>
                        </div>
                    ) : (
                        <Table className="neon-table">
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-primary/10">
                                    <TableHead>SECTOR NAME</TableHead>
                                    <TableHead>COORDINATES / LOCATION</TableHead>
                                    <TableHead>CAPACITY</TableHead>
                                    <TableHead className="text-right">ACTIONS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {halls.map((hall) => (
                                    <TableRow key={hall.id} className="group border-primary/5">
                                        <TableCell className="py-4 font-bold text-foreground tracking-wide">
                                            <div className="flex items-center gap-3">
                                                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary border border-primary/20 group-hover:scale-110 transition-transform">
                                                    <MapPin className="size-4" />
                                                </div>
                                                {hall.name}
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 text-muted-foreground font-mono text-xs">
                                            {hall.location}
                                        </TableCell>
                                        <TableCell className="py-4">
                                            <div className="flex items-center gap-2">
                                                <Users className="size-3 text-primary/50" />
                                                <span className="stat-value text-base">{hall.capacity}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-4 text-right">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleManageAvailability(hall)}
                                                className="bg-primary/5 hover:bg-primary text-primary hover:text-primary-foreground border-primary/20 font-bold tracking-widest text-[10px] rounded-lg transition-all"
                                            >
                                                <Settings2 className="size-3 mr-1.5" />
                                                MANAGE AVAILABILITY
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

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

                    <div className="grid gap-6 py-6">
                        {/* Tab Switcher */}
                        <div className="flex bg-muted/50 p-1 rounded-xl border border-border">
                            <button
                                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold tracking-widest uppercase transition-all ${slotType === 'weekly' ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,236,255,0.3)]' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                                onClick={() => setSlotType('weekly')}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Clock className="size-3" />
                                    Weekly Recurring
                                </div>
                            </button>
                            <button
                                className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold tracking-widest uppercase transition-all ${slotType === 'date' ? 'bg-primary text-primary-foreground shadow-[0_0_15px_rgba(0,236,255,0.3)]' : 'text-muted-foreground hover:text-foreground hover:bg-muted'}`}
                                onClick={() => setSlotType('date')}
                            >
                                <div className="flex items-center justify-center gap-2">
                                    <Calendar className="size-3" />
                                    Specific Date
                                </div>
                            </button>
                        </div>

                        {/* Action Type Selector (Only for Date Tab) */}
                        {slotType === 'date' && (
                            <div className="flex bg-muted/50 p-1 rounded-xl border border-border w-fit self-center">
                                <button
                                    className={`py-1.5 px-4 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all ${actionType === 'available' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-muted-foreground hover:text-foreground'}`}
                                    onClick={() => setActionType('available')}
                                >
                                    Set Open
                                </button>
                                <button
                                    className={`py-1.5 px-4 rounded-lg text-[10px] font-bold tracking-widest uppercase transition-all ${actionType === 'block' ? 'bg-destructive/20 text-destructive border border-destructive/30' : 'text-muted-foreground hover:text-white'}`}
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
                                                {days.map((day, index) => (
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
                                        <Input
                                            type="time"
                                            value={newSlot.startTime}
                                            onChange={(e) => setNewSlot({ ...newSlot, startTime: e.target.value })}
                                            className="bg-input/50 border-input text-foreground font-mono text-xs"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="text-[10px] font-bold tracking-widest text-primary/70 uppercase">End Time</Label>
                                        <Input
                                            type="time"
                                            value={newSlot.endTime}
                                            onChange={(e) => setNewSlot({ ...newSlot, endTime: e.target.value })}
                                            className="bg-input/50 border-input text-foreground font-mono text-xs"
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
                                            placeholder="SPECIFY INTEL..."
                                            value={customReason}
                                            onChange={(e) => setCustomReason(e.target.value)}
                                            className="bg-input/50 border-input text-foreground font-mono text-xs"
                                        />
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-4 border border-primary/20 rounded-xl bg-primary/5 border-dashed">
                                    <CheckCircle2 className="size-8 text-primary/20 mb-2" />
                                    <p className="text-[9px] text-primary/40 text-center font-mono leading-tight">DEFINE NEW OPERATIONAL WINDOWS FOR THIS SECTOR.</p>
                                </div>
                            )}
                        </div>

                        <Button
                            className={`w-full py-6 font-bold tracking-[0.2em] text-xs transition-all ${slotType === 'date' && actionType === 'block' ? 'bg-destructive/20 hover:bg-destructive text-destructive hover:text-white border border-destructive/30' : 'bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30'}`}
                            onClick={handleAddSlot}
                        >
                            {slotType === 'date' && actionType === 'block' ? (
                                <><AlertCircle className="size-4 mr-2" /> ABORT SECTOR OPERATION</>
                            ) : (
                                <><Plus className="size-4 mr-2" /> COMMIT DEPLOYMENT SLOT</>
                            )}
                        </Button>
                    </div>

                    <div className="space-y-6 pt-2">
                        {/* Weekly Slots Display */}
                        {slotType === 'weekly' && (
                            <div className="border border-border/50 rounded-2xl overflow-hidden bg-muted/20">
                                <div className="bg-primary/10 p-3 font-bold text-[10px] tracking-[0.2em] uppercase text-primary flex items-center gap-2">
                                    <Clock className="size-3" />
                                    Recurring Operational Protocol
                                </div>
                                <div className="divide-y divide-border/20">
                                    {availability.filter(s => !s.specificDate).length === 0 ? (
                                        <div className="p-8 text-center text-xs text-muted-foreground font-mono italic opacity-50">Zero recurring windows defined.</div>
                                    ) : (
                                        availability.filter(s => !s.specificDate).map((slot) => (
                                            <div key={slot._id || slot.id} className="grid grid-cols-3 p-4 text-xs items-center group hover:bg-muted/50 transition-colors">
                                                <div className="font-bold text-foreground tracking-wide">{days[slot.dayOfWeek]}</div>
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
                                    Deployment Intel Log
                                </div>
                                <div className="divide-y divide-border/20">
                                    {availability.filter(s => s.specificDate).length === 0 && blocks.length === 0 ? (
                                        <div className="p-8 text-center text-xs text-muted-foreground font-mono italic opacity-50">No mission logs for specific dates.</div>
                                    ) : (
                                        <>
                                            {/* Open Slots */}
                                            {availability.filter(s => s.specificDate).map((slot) => (
                                                <div key={slot._id || slot.id} className="grid grid-cols-[1fr_1fr_auto] gap-2 p-4 text-xs items-center bg-emerald-500/[0.03] group hover:bg-emerald-500/[0.07]">
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded text-[9px] tracking-widest uppercase">OPEN</span>
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
                                                            <span className="font-bold text-destructive bg-destructive/10 px-2 py-0.5 rounded text-[9px] tracking-widest uppercase">BLOCKED</span>
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
        </div>
    );
};

export default Halls;
