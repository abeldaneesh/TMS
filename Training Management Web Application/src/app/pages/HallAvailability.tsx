import React, { useEffect, useState } from 'react';
import { hallsApi, trainingsApi, hallBlocksApi } from '../../services/api';
import { Hall, Training, HallBlock } from '../../types';
import { DoorOpen, Calendar, Clock, CheckCircle, XCircle, Search, Ban } from 'lucide-react';
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

const HallAvailability: React.FC = () => {
  const [halls, setHalls] = useState<Hall[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [blocks, setBlocks] = useState<HallBlock[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hallsData, trainingsData] = await Promise.all([
          hallsApi.getAll(),
          trainingsApi.getAll(),
        ]);
        setHalls(hallsData);
        setTrainings(trainingsData);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Fetch blocks when halls or date changes
  useEffect(() => {
    const fetchBlocks = async () => {
      if (halls.length === 0) return;
      try {
        const allBlocks: HallBlock[] = [];
        // Ideally backend should support fetching all blocks for a date range/all halls
        // But for now, we can fetch per hall or just fetch all if endpoint supports
        // hallBlocksApi.getAll(hallId)
        // We'll iterate for now, or improve backend to get all blocks
        // Actually, fetching per hall in a loop is okay for small number of halls.
        // Better: Update backend to get ALL blocks. But time constraints.
        // Let's iterate.
        const promises = halls.map(h => hallBlocksApi.getAll(h.id, selectedDate));
        const results = await Promise.all(promises);
        results.forEach(r => allBlocks.push(...r));
        setBlocks(allBlocks);
      } catch (error) {
        console.error('Error fetching blocks:', error);
      }
    };
    if (halls.length > 0) {
      fetchBlocks();
    }
  }, [halls, selectedDate]);

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
    if (halls.length > 0) {
      checkAvailability();
    }
  }, [halls]);

  const getEventsForHallOnDate = (hallId: string) => {
    const hallTrainings = trainings.filter(t => {
      if (t.hallId !== hallId) return false;
      if (t.status === 'cancelled') return false;
      const trainingDate = new Date(t.date).toDateString();
      const checkDate = new Date(selectedDate).toDateString();
      return trainingDate === checkDate;
    });

    const hallBlocks = blocks.filter(b => {
      if (b.hallId !== hallId) return false;
      const blockDate = new Date(b.date).toDateString();
      const checkDate = new Date(selectedDate).toDateString();
      return blockDate === checkDate;
    });

    return { trainings: hallTrainings, blocks: hallBlocks };
  };

  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockingHall, setBlockingHall] = useState<Hall | null>(null);
  const [blockReason, setBlockReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [blockDate, setBlockDate] = useState(selectedDate);
  const [blockStartTime, setBlockStartTime] = useState(startTime);
  const [blockEndTime, setBlockEndTime] = useState(endTime);
  const [blocking, setBlocking] = useState(false);

  const { user } = useAuth(); // Need auth for role check

  const reasons = [
    'Hall Booked (Internal/External)',
    'Reserved for Furnishing / Setup',
    'Maintenance / Repair',
    'Cleaning / Sanitization',
    'Inspection / Audit',
    'Other'
  ];

  const handleBlockClick = (hall: Hall) => {
    setBlockingHall(hall);
    setBlockDate(selectedDate);
    setBlockStartTime(startTime);
    setBlockEndTime(endTime);
    setBlockReason(reasons[0]);
    setShowBlockDialog(true);
  };

  const submitBlock = async () => {
    if (!blockingHall || !user) return;

    setBlocking(true);
    try {
      const finalReason = blockReason === 'Other' ? customReason : blockReason;
      if (!finalReason) {
        toast.error('Please specify a reason');
        setBlocking(false);
        return;
      }

      await hallBlocksApi.create({
        hallId: blockingHall.id,
        date: new Date(blockDate),
        startTime: blockStartTime,
        endTime: blockEndTime,
        reason: finalReason
      });

      toast.success('Hall blocked successfully');
      setShowBlockDialog(false);
      // Refresh blocks
      // Ideally checking availability refresh everything
      // But we need to refresh blocks explicitly
      const newBlocks = await hallBlocksApi.getAll(blockingHall.id, selectedDate);
      setBlocks(prev => [...prev.filter(b => b.hallId !== blockingHall.id), ...newBlocks]);
      checkAvailability(); // Re-check availability

    } catch (error: any) {
      console.error('Error blocking hall:', error);
      toast.error(error.response?.data?.message || 'Failed to block hall');
    } finally {
      setBlocking(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingAnimation text={'Loading hall availability...'} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Hall Availability</h1>
        <p className="text-gray-500 mt-1">Check venue availability for training sessions</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="size-5" />
            Check Availability
          </CardTitle>
          <CardDescription>
            Select date and time to check which halls are available
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <Button
              onClick={checkAvailability}
              disabled={checking}
              className="gap-2"
            >
              <Search className="size-4" />
              {checking ? 'Checking...' : 'Check Availability'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Hall Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {halls.map((hall) => {
          const isAvailable = availability[hall.id];
          const hallEvents = getEventsForHallOnDate(hall.id);

          return (
            <Card key={hall.id} className={isAvailable ? 'border-green-200' : 'border-red-200'}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <DoorOpen className="size-5 text-gray-600" />
                    <CardTitle className="text-lg">{hall.name}</CardTitle>
                  </div>
                  {isAvailable ? (
                    <CheckCircle className="size-6 text-green-600" />
                  ) : (
                    <XCircle className="size-6 text-red-600" />
                  )}
                </div>
                <CardDescription>{hall.location}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Capacity</span>
                  <Badge variant="outline">{hall.capacity} people</Badge>
                </div>

                {hall.facilities && hall.facilities.length > 0 && (
                  <div>
                    <p className="text-sm text-gray-600 mb-2">Facilities</p>
                    <div className="flex flex-wrap gap-1">
                      {hall.facilities.map((facility, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {facility}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Status</span>
                    <Badge className={isAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {isAvailable ? 'Available' : 'Booked'}
                    </Badge>
                  </div>

                  {/* Events List */}
                  {(hallEvents.trainings.length > 0 || hallEvents.blocks.length > 0) && (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-medium text-gray-600">Schedule on {format(new Date(selectedDate), 'MMM dd')}:</p>

                      {hallEvents.blocks.map((block) => (
                        <div key={block.id} className="text-xs p-2 bg-red-50 border border-red-100 rounded">
                          <div className="flex items-center gap-1 text-red-700 font-medium mb-1">
                            <Ban className="size-3" />
                            <span>Blocked: {block.reason}</span>
                          </div>
                          <div className="flex items-center gap-2 text-red-600">
                            <Clock className="size-3" />
                            <span>{block.startTime} - {block.endTime}</span>
                          </div>
                        </div>
                      ))}

                      {hallEvents.trainings.map((training) => (
                        <div key={training.id} className="text-xs p-2 bg-gray-50 rounded">
                          <p className="font-medium">{training.title}</p>
                          <div className="flex items-center gap-2 text-gray-600 mt-1">
                            <Clock className="size-3" />
                            <span>{training.startTime} - {training.endTime}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Admin Action: Block Hall */}
                  {user?.role === 'master_admin' && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => handleBlockClick(hall)}
                    >
                      <Ban className="size-4 mr-2" />
                      Block Hall
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div>
              <p className="text-3xl font-bold text-blue-600">{halls.length}</p>
              <p className="text-sm text-gray-600 mt-1">Total Halls</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-green-600">
                {Object.values(availability).filter(v => v).length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Available</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-red-600">
                {Object.values(availability).filter(v => !v).length}
              </p>
              <p className="text-sm text-gray-600 mt-1">Booked</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Block Hall Dialog */}
      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Block Hall - {blockingHall?.name}</DialogTitle>
            <DialogDescription>
              Mark this hall as unavailable for a specific period.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={blockDate} onChange={(e) => setBlockDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Start Time</Label>
                <Input type="time" value={blockStartTime} onChange={(e) => setBlockStartTime(e.target.value)} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input type="time" value={blockEndTime} onChange={(e) => setBlockEndTime(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Reason</Label>
              <Select value={blockReason} onValueChange={(val: any) => setBlockReason(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map(r => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {blockReason === 'Other' && (
              <div>
                <Label>Custom Reason</Label>
                <Input
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Enter reason..."
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBlockDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={submitBlock} disabled={blocking}>
              {blocking ? 'Blocking...' : 'Block Hall'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HallAvailability;
