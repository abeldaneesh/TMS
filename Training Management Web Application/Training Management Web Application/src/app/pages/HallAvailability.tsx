import React, { useEffect, useMemo, useState } from 'react';
import { hallsApi, trainingsApi, hallBlocksApi } from '../../services/api';
import { Hall, Training, HallBlock } from '../../types';
import {
  Ban,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  DoorOpen,
  Info,
  LayoutGrid,
  List,
  MapPin,
  Search,
  Sparkles,
  Sun,
  Sunset,
  Users,
  XCircle,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import DateInputWithPickerIcon from '../components/DateInputWithPickerIcon';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { format } from 'date-fns';
import LoadingAnimation from '../components/LoadingAnimation';
import { ClockTimePicker } from '../components/ui/clock-time-picker';
import { Tooltip, TooltipContent, TooltipTrigger } from '../components/ui/tooltip';
import { Progress } from '../components/ui/progress';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

type SlotStatus = 'available' | 'partial' | 'booked';

const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');
const getEntityId = (value: any): string => value?.id || value?._id || value?.toString?.() || '';

const DAY_CARD = 'rounded-[22px] border border-border bg-card/90 backdrop-blur-xl shadow-sm';
const PANEL_CARD = 'rounded-[24px] border border-border bg-card shadow-sm';
const MORNING_SLOT = { start: '10:00', end: '13:30' };
const EVENING_SLOT = { start: '14:00', end: '17:00' };

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const getOverlapMinutes = (startA: number, endA: number, startB: number, endB: number) => {
  const start = Math.max(startA, startB);
  const end = Math.min(endA, endB);
  return Math.max(0, end - start);
};

const getStatusMeta = (status: SlotStatus) => {
  switch (status) {
    case 'available':
      return {
        label: 'Available',
        accent: 'text-emerald-600 dark:text-emerald-300',
        badge: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200',
        glow: 'hover:border-emerald-500/40 hover:shadow-md',
        border: 'border-emerald-500/20',
        progress: 'bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400',
      };
    case 'partial':
      return {
        label: 'Partial',
        accent: 'text-amber-600 dark:text-amber-300',
        badge: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200',
        glow: 'hover:border-amber-500/40 hover:shadow-md',
        border: 'border-amber-500/20',
        progress: 'bg-gradient-to-r from-amber-300 via-orange-300 to-yellow-300',
      };
    default:
      return {
        label: 'Booked',
        accent: 'text-rose-600 dark:text-rose-300',
        badge: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-200',
        glow: 'hover:border-rose-500/40 hover:shadow-md',
        border: 'border-rose-500/20',
        progress: 'bg-gradient-to-r from-rose-400 via-pink-400 to-red-400',
      };
  }
};

const HallAvailability: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const [halls, setHalls] = useState<Hall[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [blocks, setBlocks] = useState<HallBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [availability, setAvailability] = useState<Record<string, boolean>>({});
  const [checking, setChecking] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [blockingHall, setBlockingHall] = useState<Hall | null>(null);
  const [blockReason, setBlockReason] = useState('Maintenance / Repair');
  const [customReason, setCustomReason] = useState('');
  const [isBlocking, setIsBlocking] = useState(false);
  const isMalayalam = i18n.resolvedLanguage?.startsWith('ml') || i18n.language?.startsWith('ml');
  const uiLocale = isMalayalam ? 'ml-IN' : 'en-IN';

  const formatMonthYear = (date: Date) =>
    new Intl.DateTimeFormat(uiLocale, { month: 'long', year: 'numeric' }).format(date);
  const formatMonthDay = (date: Date) =>
    new Intl.DateTimeFormat(uiLocale, { day: '2-digit', month: 'short' }).format(date);
  const formatFullDate = (date: Date) =>
    new Intl.DateTimeFormat(uiLocale, { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Intl.DateTimeFormat(uiLocale, { weekday: 'short' }).format(new Date(2024, 0, 7 + index)),
  );

  const getLocalizedBlockReason = (reason: string) => {
    switch (reason) {
      case 'Meeting / Internal Booking':
        return t('hallAvailability.reasons.internalBooking', { defaultValue: 'Meeting / Internal Booking' });
      case 'Maintenance / Repair':
        return t('hallAvailability.reasons.maintenance', { defaultValue: 'Maintenance / Repair' });
      case 'Cleaning / Sanitization':
        return t('hallAvailability.reasons.cleaning', { defaultValue: 'Cleaning / Sanitization' });
      case 'Inspection / Audit':
        return t('hallAvailability.reasons.inspection', { defaultValue: 'Inspection / Audit' });
      case 'Other':
        return t('hallAvailability.reasons.other', { defaultValue: 'Other' });
      default:
        return reason;
    }
  };

  const reasons = [
    'Meeting / Internal Booking',
    'Maintenance / Repair',
    'Cleaning / Sanitization',
    'Inspection / Audit',
    'Other',
  ];

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [hallsData, trainingsData, blocksData] = await Promise.all([
          hallsApi.getAll().catch((err) => {
            console.error('Halls fetch fail:', err);
            return [];
          }),
          trainingsApi.getAll().catch((err) => {
            console.error('Trainings fetch fail:', err);
            return [];
          }),
          hallBlocksApi.getAll().catch((err) => {
            console.error('Blocks fetch fail:', err);
            return [];
          }),
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
      const availableHalls = await hallsApi.getAvailableHalls(new Date(selectedDate), startTime, endTime);
      const availableIds = availableHalls.map((hall) => hall.id);
      const results: Record<string, boolean> = {};
      halls.forEach((hall) => {
        results[hall.id] = availableIds.includes(hall.id);
      });
      setAvailability(results);
    } catch (error) {
      console.error('Error checking availability:', error);
      toast.error(t('hallAvailability.refreshFail', { defaultValue: 'Unable to refresh hall availability' }));
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (halls.length > 0 && selectedDate && startTime && endTime) {
      checkAvailability();
    }
  }, [halls, selectedDate, startTime, endTime]);

  const filteredHalls = useMemo(() => {
    return halls.filter(
      (hall) =>
        hall.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        hall.location.toLowerCase().includes(searchTerm.toLowerCase()),
    );
  }, [halls, searchTerm]);

  const getEventsForHallOnDate = (hallId: string, dateString = selectedDate) => {
    const dateStr = format(new Date(dateString), 'yyyy-MM-dd');
    const hallTrainings = trainings.filter(
      (training) =>
        getEntityId(training.hallId) === hallId &&
        training.status !== 'cancelled' &&
        format(new Date(training.date), 'yyyy-MM-dd') === dateStr,
    );
    const hallBlocks = blocks.filter(
      (block) => getEntityId(block.hallId) === hallId && format(new Date(block.date), 'yyyy-MM-dd') === dateStr,
    );
    return { trainings: hallTrainings, blocks: hallBlocks };
  };

  const getWindowAnalytics = (events: { trainings: Training[]; blocks: HallBlock[] }, slotStart: string, slotEnd: string) => {
    const start = timeToMinutes(slotStart);
    const end = timeToMinutes(slotEnd);
    const duration = Math.max(1, end - start);
    const overlaps = [...events.trainings, ...events.blocks].map((item) =>
      getOverlapMinutes(start, end, timeToMinutes(item.startTime), timeToMinutes(item.endTime)),
    );
    const busyMinutes = Math.min(duration, overlaps.reduce((sum, minutes) => sum + minutes, 0));
    const occupiedPercent = Math.min(100, Math.round((busyMinutes / duration) * 100));
    const availablePercent = 100 - occupiedPercent;
    const status: SlotStatus =
      occupiedPercent === 0 ? 'available' : occupiedPercent >= 100 ? 'booked' : 'partial';

    return { occupiedPercent, availablePercent, status };
  };

  const getSelectedWindowStatus = (hallId: string): SlotStatus => {
    const events = getEventsForHallOnDate(hallId);
    const selectedWindow = getWindowAnalytics(events, startTime, endTime);
    if (!availability[hallId]) return 'booked';
    return selectedWindow.status;
  };

  const getDayBreakdown = (hallId: string, dateString = selectedDate) => {
    const events = getEventsForHallOnDate(hallId, dateString);
    return {
      morning: getWindowAnalytics(events, MORNING_SLOT.start, MORNING_SLOT.end),
      evening: getWindowAnalytics(events, EVENING_SLOT.start, EVENING_SLOT.end),
      events,
    };
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
        reason: finalReason,
      });
      toast.success(t('hallAvailability.blockSuccess'));
      setShowBlockDialog(false);
      const blocksData = await hallBlocksApi.getAll();
      setBlocks(blocksData);
      checkAvailability();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('hallAvailability.blockFail'));
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
    const todayKey = format(new Date(), 'yyyy-MM-dd');

    const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.35em] text-muted-foreground">{t('hallAvailability.calendarLabel', { defaultValue: 'Availability Calendar' })}</p>
            <h3 className="text-2xl font-semibold text-foreground">
              {formatMonthYear(currentDate)}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={prevMonth}
              className="size-10 rounded-2xl border-border bg-background text-muted-foreground hover:scale-95 hover:bg-accent hover:text-foreground"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={nextMonth}
              className="size-10 rounded-2xl border-border bg-background text-muted-foreground hover:scale-95 hover:bg-accent hover:text-foreground"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>

        <div className="grid gap-10">
          {filteredHalls.map((hall) => (
            <section key={hall.id} className={cn(PANEL_CARD, 'p-6 md:p-8')}>
              <div className="mb-6 flex flex-col gap-3 border-b border-border pb-5 md:flex-row md:items-center md:justify-between">
                <div>
                  <h4 className="flex items-center gap-3 text-xl font-semibold text-foreground">
                    <DoorOpen className="size-5 text-primary" />
                    {hall.name}
                  </h4>
                  <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="size-4 text-muted-foreground" />
                    {hall.location}
                  </p>
                </div>
                <Badge className="w-fit rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                  <Users className="mr-2 size-3.5 text-muted-foreground" />
                  {t('hallAvailability.seats', { count: hall.capacity, defaultValue: `${hall.capacity} seats` })}
                </Badge>
              </div>

              <div className="grid grid-cols-7 gap-3 md:gap-4">
                {weekdayLabels.map((day) => (
                  <div key={day} className="px-1 text-center text-[11px] font-medium uppercase tracking-[0.26em] text-muted-foreground">
                    {day}
                  </div>
                ))}
                {Array.from({ length: firstDayOfMonth(year, month) }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-24" />
                ))}
                {Array.from({ length: daysInMonth(year, month) }).map((_, i) => {
                  const day = i + 1;
                  const cellDate = new Date(year, month, day);
                  const cellKey = format(cellDate, 'yyyy-MM-dd');
                  const isToday = cellKey === todayKey;
                  const breakdown = getDayBreakdown(hall.id, cellKey);
                  const dominantStatus =
                    breakdown.morning.status === 'booked' && breakdown.evening.status === 'booked'
                      ? 'booked'
                      : breakdown.morning.status === 'available' && breakdown.evening.status === 'available'
                        ? 'available'
                        : 'partial';
                  const meta = getStatusMeta(dominantStatus);
                  const allEvents = [...breakdown.events.blocks, ...breakdown.events.trainings];

                  return (
                    <Tooltip key={day}>
                      <TooltipTrigger asChild>
                        <motion.div
                          whileHover={{ scale: 1.03, y: -2 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                          className={cn(
                            DAY_CARD,
                            meta.border,
                            meta.glow,
                            'relative min-h-[110px] cursor-default overflow-hidden p-4 transition-all duration-200',
                            isToday && 'ring-1 ring-primary/50 border-primary/40',
                          )}
                        >
                          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
                          <div className="flex items-start justify-between">
                            <span className="text-sm font-semibold text-foreground">{day}</span>
                            {isToday && (
                              <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-primary">
                                {t('hallAvailability.today', { defaultValue: 'Today' })}
                              </span>
                            )}
                          </div>
                          <div className="mt-5 space-y-3">
                            <div>
                              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <Sun className="size-3.5 text-amber-500 dark:text-amber-300" />
                                  {t('hallAvailability.morning', { defaultValue: 'Morning' })}
                                </span>
                                <span>{t('hallAvailability.freePercent', { count: breakdown.morning.availablePercent, defaultValue: `${breakdown.morning.availablePercent}% free` })}</span>
                              </div>
                              <Progress
                                value={breakdown.morning.availablePercent}
                                className="h-1.5 bg-muted"
                                indicatorClassName={getStatusMeta(breakdown.morning.status).progress}
                              />
                            </div>
                            <div>
                              <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1.5">
                                  <Sunset className="size-3.5 text-violet-500 dark:text-violet-300" />
                                  {t('hallAvailability.evening', { defaultValue: 'Evening' })}
                                </span>
                                <span>{t('hallAvailability.freePercent', { count: breakdown.evening.availablePercent, defaultValue: `${breakdown.evening.availablePercent}% free` })}</span>
                              </div>
                              <Progress
                                value={breakdown.evening.availablePercent}
                                className="h-1.5 bg-muted"
                                indicatorClassName={getStatusMeta(breakdown.evening.status).progress}
                              />
                            </div>
                          </div>
                        </motion.div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-xs rounded-2xl border border-border bg-popover px-4 py-3 text-popover-foreground shadow-xl"
                      >
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{formatFullDate(cellDate)}</p>
                            <p className="mt-1 text-sm font-medium text-foreground">{hall.name}</p>
                          </div>
                          {allEvents.length === 0 ? (
                            <p className="text-sm text-emerald-700 dark:text-emerald-200">{t('hallAvailability.openBothSlots', { defaultValue: 'Open across both standard slots.' })}</p>
                          ) : (
                            <div className="space-y-2">
                              {breakdown.events.blocks.map((block) => (
                                <div key={block.id} className="rounded-xl border border-rose-400/25 bg-rose-500/10 px-3 py-2">
                                  <p className="text-xs font-medium text-rose-700 dark:text-rose-200">{getLocalizedBlockReason(block.reason)}</p>
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    {block.startTime} - {block.endTime}
                                  </p>
                                </div>
                              ))}
                              {breakdown.events.trainings.map((training) => (
                                <div key={training.id} className="rounded-xl border border-border bg-card px-3 py-2">
                                  <p className="text-xs font-medium text-foreground">{training.title}</p>
                                  <p className="mt-1 text-[11px] text-muted-foreground">
                                    {training.startTime} - {training.endTime}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
          <div className="flex items-center justify-center py-24">
        <LoadingAnimation text={t('hallAvailability.loadingView', { defaultValue: 'Loading hall availability...' })} />
      </div>
    );
  }

  return (
    <div className="space-y-8 text-foreground">
      <section className="rounded-[30px] border border-border bg-card p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">{t('hallAvailability.title')}</h1>
              <p className="max-w-xl text-sm leading-6 text-muted-foreground md:text-base">
                {t('hallAvailability.subtitle')}
              </p>
            </div>
          </div>

          <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:w-auto">
            <div className="relative min-w-[280px]">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground transition-colors" />
              <Input
                placeholder={t('hallAvailability.searchPlaceholder', { defaultValue: 'Search halls, wings, or locations' })}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-12 rounded-2xl border border-border bg-background pl-11 text-foreground placeholder:text-muted-foreground shadow-sm transition-all duration-200 focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              />
            </div>

            <div className="inline-flex h-12 items-center rounded-2xl border border-border bg-muted/40 p-1 transition-all duration-200">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('list')}
                className={cn(
                  'h-10 rounded-xl px-4 text-xs font-medium uppercase tracking-[0.24em] transition-all duration-200',
                  viewMode === 'list'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground',
                )}
              >
                <List className="mr-2 size-4" />
                {t('hallAvailability.viewList', { defaultValue: 'List' })}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewMode('grid')}
                className={cn(
                  'h-10 rounded-xl px-4 text-xs font-medium uppercase tracking-[0.24em] transition-all duration-200',
                  viewMode === 'grid'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-background hover:text-foreground',
                )}
              >
                <LayoutGrid className="mr-2 size-4" />
                {t('hallAvailability.viewGrid', { defaultValue: 'Grid' })}
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className={cn(PANEL_CARD, 'p-6 md:p-8')}>
        <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-muted-foreground">{t('hallAvailability.protocolLabel', { defaultValue: 'Availability Protocol' })}</p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">{t('hallAvailability.decisionWindowTitle', { defaultValue: 'Set your decision window' })}</h2>
            <p className="mt-2 max-w-xl text-sm text-muted-foreground">
              {t('hallAvailability.decisionWindowDesc', { defaultValue: 'Pick the time range you want to inspect. Cards update with clearer status signals and more precise booking context.' })}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm text-muted-foreground">
            <Sparkles className="size-4 text-primary" />
            {checking
              ? t('hallAvailability.refreshing', { defaultValue: 'Refreshing availability...' })
              : t('hallAvailability.hallsInView', { count: filteredHalls.length, defaultValue: `${filteredHalls.length} halls in view` })}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">{t('hallAvailability.date')}</Label>
            <DateInputWithPickerIcon
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-12 rounded-2xl border-border bg-background pl-11 text-foreground focus:border-primary/50 focus:ring-2 focus:ring-primary/10"
              buttonClassName="left-4 text-foreground/80 hover:text-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">{t('hallAvailability.startTime')}</Label>
            <div className="rounded-2xl border border-border bg-background px-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
              <div className="flex items-center gap-3">
                <Clock3 className="size-4 text-muted-foreground" />
                <ClockTimePicker value={startTime} onChange={setStartTime} className="border-0 bg-transparent shadow-none" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">{t('hallAvailability.endTime')}</Label>
            <div className="rounded-2xl border border-border bg-background px-3 focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
              <div className="flex items-center gap-3">
                <Clock3 className="size-4 text-muted-foreground" />
                <ClockTimePicker value={endTime} onChange={setEndTime} className="border-0 bg-transparent shadow-none" />
              </div>
            </div>
          </div>

          <div className="flex items-end">
            <Button
              onClick={checkAvailability}
              className="h-12 w-full rounded-2xl bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500 px-6 text-sm font-medium text-white shadow-[0_18px_40px_rgba(79,70,229,0.28)] transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_22px_50px_rgba(59,130,246,0.35)] active:scale-[0.98]"
            >
              {checking ? t('hallAvailability.refreshingShort', { defaultValue: 'Refreshing...' }) : t('hallAvailability.checkAvail')}
            </Button>
          </div>
        </div>
      </section>

      {viewMode === 'grid' ? (
        <MonthlyGridView />
      ) : filteredHalls.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-border bg-card py-20 text-center">
          <Info className="mx-auto mb-4 size-12 text-muted-foreground" />
          <h3 className="text-xl font-semibold text-foreground">{t('hallAvailability.noSearchTitle', { defaultValue: 'No halls match this search' })}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{t('hallAvailability.noSearchDesc', { defaultValue: 'Try a broader keyword or clear the search to see all venue options.' })}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {filteredHalls.map((hall, index) => {
            const events = getEventsForHallOnDate(hall.id);
            const windowStatus = getSelectedWindowStatus(hall.id);
            const windowMeta = getStatusMeta(windowStatus);
            const breakdown = getDayBreakdown(hall.id);
            const eventCount = events.trainings.length + events.blocks.length;
            const statusLabel =
              windowStatus === 'available'
                ? t('hallAvailability.statusAvailableFor', { time: `${startTime} - ${endTime}`, defaultValue: `Available for ${startTime} - ${endTime}` })
                : windowStatus === 'partial'
                  ? t('hallAvailability.statusPartialFor', { time: `${startTime} - ${endTime}`, defaultValue: `Partially busy for ${startTime} - ${endTime}` })
                  : t('hallAvailability.statusBookedFor', { time: `${startTime} - ${endTime}`, defaultValue: `Booked for ${startTime} - ${endTime}` });

            return (
              <motion.article
                key={hall.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.03 }}
                whileHover={{ y: -5 }}
                className={cn(
                  PANEL_CARD,
                  windowMeta.border,
                  windowMeta.glow,
                  'group overflow-hidden p-6 transition-all duration-200',
                )}
              >
                <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-2xl bg-muted ring-1 ring-border">
                        <DoorOpen className={cn('size-5', windowMeta.accent)} />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">{hall.name}</h3>
                        <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="size-4 text-muted-foreground" />
                          {hall.location}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-right">
                    <Badge className={cn('rounded-full border px-3 py-1 text-xs font-medium', windowMeta.badge)}>
                      {windowStatus === 'available' ? (
                        <CheckCircle2 className="mr-2 size-3.5" />
                      ) : (
                        <XCircle className="mr-2 size-3.5" />
                      )}
                      {statusLabel}
                    </Badge>
                    <Badge className="rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-foreground">
                      <Users className="mr-2 size-3.5 text-muted-foreground" />
                      {t('hallAvailability.seats', { count: hall.capacity, defaultValue: `${hall.capacity} seats` })}
                    </Badge>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 rounded-[20px] border border-border bg-background/60 p-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <Sun className="size-4 text-amber-500 dark:text-amber-300" />
                          {t('hallAvailability.morning', { defaultValue: 'Morning' })}
                        </span>
                        <span>{t('hallAvailability.freePercent', { count: breakdown.morning.availablePercent, defaultValue: `${breakdown.morning.availablePercent}% free` })}</span>
                      </div>
                      <Progress
                        value={breakdown.morning.availablePercent}
                        className="h-2 bg-muted"
                        indicatorClassName={getStatusMeta(breakdown.morning.status).progress}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span className="flex items-center gap-2">
                          <Sunset className="size-4 text-violet-500 dark:text-violet-300" />
                          {t('hallAvailability.evening', { defaultValue: 'Evening' })}
                        </span>
                        <span>{t('hallAvailability.freePercent', { count: breakdown.evening.availablePercent, defaultValue: `${breakdown.evening.availablePercent}% free` })}</span>
                      </div>
                      <Progress
                        value={breakdown.evening.availablePercent}
                        className="h-2 bg-muted"
                        indicatorClassName={getStatusMeta(breakdown.evening.status).progress}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-border pt-4 text-sm">
                    <span className="text-muted-foreground">{t('hallAvailability.selectedWindow', { defaultValue: 'Selected window' })}</span>
                    <span className="font-medium text-foreground">
                      {startTime} - {endTime}
                    </span>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{t('hallAvailability.bookingDetails', { defaultValue: 'Booking Details' })}</p>
                    <p className="text-xs text-muted-foreground">{t('hallAvailability.eventsOnDate', { count: eventCount, date: formatMonthDay(new Date(selectedDate)), defaultValue: `${eventCount} events on ${formatMonthDay(new Date(selectedDate))}` })}</p>
                  </div>

                  {eventCount === 0 ? (
                    <div className="rounded-[18px] border border-border bg-background px-4 py-4 text-sm text-muted-foreground">
                      {t('hallAvailability.noBookings', { defaultValue: 'No bookings or operational blocks found for this day.' })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {events.blocks.map((block) => (
                        <div key={block.id} className="rounded-[18px] border border-rose-500/25 bg-rose-500/10 px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-rose-700 dark:text-rose-100">{getLocalizedBlockReason(block.reason)}</p>
                              <p className="mt-1 text-xs text-rose-600 dark:text-rose-200/70">{t('hallAvailability.operationalBlock', { defaultValue: 'Operational block' })}</p>
                            </div>
                            <p className="text-xs font-medium text-rose-700 dark:text-rose-100">
                              {block.startTime} - {block.endTime}
                            </p>
                          </div>
                        </div>
                      ))}

                      {events.trainings.map((training) => (
                        <div key={training.id} className="rounded-[18px] border border-border bg-background px-4 py-3">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p className="text-sm font-medium text-foreground">{training.title}</p>
                              <p className="mt-1 text-xs text-muted-foreground">{training.program}</p>
                            </div>
                            <p className="text-xs font-medium text-muted-foreground">
                              {training.startTime} - {training.endTime}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {user?.role === 'master_admin' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-6 h-11 w-full rounded-2xl border border-rose-500/25 bg-rose-500/10 text-rose-700 transition-all duration-200 hover:scale-[1.01] hover:border-rose-500/40 hover:bg-rose-500/15 hover:text-rose-800 active:scale-[0.98] dark:text-rose-100"
                    onClick={() => {
                      setBlockingHall(hall);
                      setShowBlockDialog(true);
                    }}
                  >
                    <Ban className="mr-2 size-4" />
                    {t('hallAvailability.blockThisHall', { defaultValue: 'Block This Hall' })}
                  </Button>
                )}
              </motion.article>
            );
          })}
        </div>
      )}

      <Dialog open={showBlockDialog} onOpenChange={setShowBlockDialog}>
        <DialogContent className="border-border bg-card text-foreground shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <Ban className="size-5 text-rose-300" />
              {t('hallAvailability.dialogTitle', { defaultValue: 'Block hall availability' })}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {blockingHall?.name} • {formatFullDate(new Date(selectedDate))}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-3">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{t('hallAvailability.start', { defaultValue: 'Start' })}</Label>
                <ClockTimePicker value={startTime} onChange={setStartTime} className="border-border bg-background text-foreground" />
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{t('hallAvailability.end', { defaultValue: 'End' })}</Label>
                <ClockTimePicker value={endTime} onChange={setEndTime} className="border-border bg-background text-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{t('hallAvailability.reason')}</Label>
              <Select value={blockReason} onValueChange={setBlockReason}>
                <SelectTrigger className="border-border bg-background text-foreground">
                  <SelectValue placeholder={t('hallAvailability.selectReason')} />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {getLocalizedBlockReason(reason)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {blockReason === 'Other' && (
              <Input
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder={t('hallAvailability.enterCustomReason', { defaultValue: 'Enter a custom reason' })}
                className="border-border bg-background text-foreground placeholder:text-muted-foreground"
              />
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBlockDialog(false)}
              className="rounded-xl border-border bg-background text-foreground hover:bg-accent"
            >
              {t('hallAvailability.cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={submitBlock}
              disabled={isBlocking}
              className="rounded-xl bg-rose-500 text-white hover:bg-rose-600"
            >
              {isBlocking ? t('hallAvailability.saving', { defaultValue: 'Saving...' }) : t('hallAvailability.confirmBlock', { defaultValue: 'Confirm block' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default HallAvailability;
