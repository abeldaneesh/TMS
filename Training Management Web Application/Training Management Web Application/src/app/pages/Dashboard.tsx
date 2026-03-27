import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsApi, trainingsApi, BASE_URL } from '../../services/api';
import { DashboardStats, Training } from '../../types';
import { safeFormatDate } from '../../utils/date';
import { useTranslation } from 'react-i18next';
import LoadingScreen from '../components/LoadingScreen';

import FilterChips from '../components/FilterChips';
import HorizontalScrollList from '../components/HorizontalScrollList';
import MediaCard from '../components/MediaCard';
import { Calendar } from '../components/ui/calendar';
import { Button } from '../components/ui/button';
import { Calendar as CalendarIcon, CalendarPlus, Plus, X } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allTrainings, setAllTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const isMalayalam = i18n.resolvedLanguage?.startsWith('ml') || i18n.language?.startsWith('ml');

  const formatDateParam = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [statsData, trainingsData] = await Promise.all([
          analyticsApi.getDashboardStats(user.id, user.role),
          trainingsApi.getAll(user.role === 'program_officer' ? { createdById: user.id } : {}),
        ]);

        setStats(statsData);
        setAllTrainings(Array.isArray(trainingsData) ? trainingsData : []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading || !stats) {
    return <LoadingScreen />;
  }

  // Derived data based on filter
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const normalizeDate = (date: Date | string) => {
    const normalized = new Date(date);
    normalized.setHours(0, 0, 0, 0);
    return normalized;
  };

  const selectedDateValue = selectedDate ? normalizeDate(selectedDate) : undefined;
  const selectedDateIsPast = Boolean(selectedDateValue && selectedDateValue < today);
  const selectedDateIsToday = Boolean(selectedDateValue && selectedDateValue.getTime() === today.getTime());

  const upcomingTrainings = allTrainings
    .filter(t => {
      if (!t || t.status === 'cancelled') return false;
      // If participant, hide if already attended
      if (user?.role === 'participant' && t.userStatus === 'attended') return false;

      const tDate = normalizeDate(t.date);

      if (selectedDateValue) {
        // Only scheduled sessions should appear in the upcoming bucket for the selected day.
        return tDate.getTime() === selectedDateValue.getTime() && selectedDateValue >= today && t.status === 'scheduled';
      }

      return tDate >= today && t.status === 'scheduled';
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const completedTrainings = allTrainings
    .filter(t => {
      if (!t || t.status === 'cancelled') return false;
      const tDate = normalizeDate(t.date);

      if (selectedDateValue && tDate.getTime() !== selectedDateValue.getTime()) {
        return false;
      }

      // If participant, it's completed for them IF they attended OR the training is officially completed
      if (user?.role === 'participant') {
        return t.userStatus === 'attended' || t.status === 'completed';
      }

      if (selectedDateValue) {
        // When a past day is selected, every non-cancelled session from that date belongs in past sessions.
        return selectedDateIsPast || t.status === 'completed';
      }

      return t.status === 'completed';
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeOrOngoing = allTrainings
    .filter(t => {
      if (!t || t.status === 'cancelled') return false;
      if (user?.role === 'participant' && t.userStatus === 'attended') return false;

      return t.status === 'ongoing';
    });

  const selectedDateActiveTrainings = allTrainings
    .filter(t => {
      if (!selectedDateValue || !t || t.status === 'cancelled') return false;
      if (user?.role === 'participant' && t.userStatus === 'attended') return false;

      const tDate = normalizeDate(t.date);
      return tDate.getTime() === selectedDateValue.getTime() && selectedDateIsToday && t.status === 'ongoing';
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const actionRequired = allTrainings
    .filter(t => {
      if (!t) return false;
      if (user?.role === 'participant') {
        // Action: Nominations I haven't attended yet for active trainings
        return (t.status === 'ongoing' || t.status === 'scheduled') && t.userStatus !== 'attended';
      }

      if (selectedDate) {
        const tDate = new Date(t.date);
        tDate.setHours(0, 0, 0, 0);
        const sDate = new Date(selectedDate);
        sDate.setHours(0, 0, 0, 0);
        return tDate.getTime() === sDate.getTime();
      }

      // For PO/Admin, action is required if:
      // 1. It's ongoing (needs completion)
      // 2. It's scheduled but the date is in the past (needs status update)
      const tDate = new Date(t.date);
      tDate.setHours(0, 0, 0, 0);
      const isPast = tDate < today;

      return t.status === 'ongoing' || (t.status === 'scheduled' && isPast);
    });

  const hasTrainingsOnSelectedDate =
    selectedDateActiveTrainings.length > 0 || upcomingTrainings.length > 0 || completedTrainings.length > 0;
  const canCreateTraining = user?.role === 'master_admin' || user?.role === 'program_officer';
  const showDashboardCalendar =
    user?.role === 'medical_officer' ||
    user?.role === 'program_officer' ||
    user?.role === 'master_admin';

  const handleDateSelect = (date?: Date) => {
    setSelectedDate(date);
  };

  const handleCreateTrainingForDate = () => {
    if (!selectedDate || !canCreateTraining || selectedDateIsPast) return;
    navigate(`/trainings/create?date=${formatDateParam(selectedDate)}`, {
      state: { selectedDate: formatDateParam(selectedDate) },
    });
  };

  const filters = [
    { value: 'all', label: t('dashboard.filters.all', 'All Activity') },
    { value: 'upcoming', label: t('dashboard.filters.upcoming', 'Upcoming sessions') },
    { value: 'completed', label: t('dashboard.filters.completed', 'Past training') },
    { value: 'action', label: t('dashboard.filters.action', 'Action required') },
  ];

  const quickActions = [
    {
      title: t('dashboard.actions.newTraining.title', 'New Training'),
      subtitle: t('dashboard.actions.newTraining.subtitle', 'Schedule a session'),
      iconUrl: 'https://images.unsplash.com/photo-1531496730074-83b638c0a7ac?auto=format&fit=crop&q=80&w=200&h=200',
      path: '/trainings/create',
      roles: ['master_admin', 'program_officer'],
    },
    {
      title: t('dashboard.actions.viewPersonnel.title', 'View Personnel'),
      subtitle: t('dashboard.actions.viewPersonnel.subtitle', 'Manage staff'),
      iconUrl: 'https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&q=80&w=200&h=200',
      path: '/personnel',
      roles: ['master_admin'],
    },
    {
      title: t('dashboard.actions.analytics.title', 'Analytics'),
      subtitle: t('dashboard.actions.analytics.subtitle', 'System reports'),
      iconUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=200&h=200',
      path: '/analytics',
      roles: ['master_admin', 'program_officer'],
    },
    {
      title: t('dashboard.actions.settings.title', 'Settings'),
      subtitle: t('dashboard.actions.settings.subtitle', 'App configuration'),
      iconUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=200&h=200',
      path: '/settings',
      roles: ['master_admin', 'program_officer'],
    },
  ];

  const getProfileAvatarUrl = () => {
    if (!user?.profilePicture) return "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200&h=200";
    return user.profilePicture.startsWith('http') ? user.profilePicture : `${BASE_URL}${user.profilePicture}`;
  };

  const calendarPanel = (
    <div className="bg-secondary/10 p-4 rounded-2xl border border-secondary/20 glassmorphism-light">
      <div className="flex items-center gap-2 mb-4 px-2">
        <CalendarIcon className="size-5 text-primary" />
        <h3 className="font-bold text-lg">{t('dashboard.calendar.title', 'Event Calendar')}</h3>
      </div>
      <Calendar
        mode="single"
        selected={selectedDate}
        onSelect={handleDateSelect}
        formatters={
          isMalayalam
            ? {
                formatCaption: (date) =>
                  new Intl.DateTimeFormat('ml-IN', { month: 'long', year: 'numeric' }).format(date),
                formatWeekdayName: (date) =>
                  new Intl.DateTimeFormat('ml-IN', { weekday: 'short' }).format(date),
              }
            : undefined
        }
        className="rounded-md border-0 bg-transparent flex justify-center"
      />
      <p className="text-xs text-muted-foreground mt-4 px-2 italic text-center">
        {t('dashboard.calendar.hint', 'Select a date to filter training sessions.')}
      </p>
    </div>
  );

  return (
    <div className="pb-12 text-foreground">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
        {/* Main Content Area */}
        <div className="min-w-0 flex-1 space-y-8">
          {/* Filters (YouTube Music style pill buttons) */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <FilterChips
              options={filters}
              selectedValue={activeFilter}
              onChange={setActiveFilter}
            />
            {selectedDate && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedDate(undefined)}
                className="text-primary hover:text-primary/80 flex items-center gap-2"
              >
                <X className="size-4" />
                {t('dashboard.clearFilter', 'Clear Date Filter')}
              </Button>
            )}
          </div>

          {showDashboardCalendar && (
            <div className="lg:hidden">
              {calendarPanel}
            </div>
          )}

          <div className="space-y-4">
            {/* Quick Actions */}
            {user?.role !== 'participant' && (activeFilter === 'all' || activeFilter === 'action') && !selectedDate && quickActions.filter(a => !a.roles || (user?.role && a.roles.includes(user.role))).length > 0 && (
              <HorizontalScrollList
                title={t('dashboard.sections.quickActions.title', 'Quick Actions')}
                subtitle={t('dashboard.sections.quickActions.subtitle', 'Manage your tasks')}
              >
                {quickActions
                  .filter(action => !action.roles || (user?.role && action.roles.includes(user.role)))
                  .map((action, i) => (
                    <MediaCard
                      key={i}
                      id={`action-${i}`}
                      title={action.title}
                      subtitle={action.subtitle}
                      imageUrl={action.iconUrl}
                      onClick={() => navigate(action.path)}
                    />
                  ))}
              </HorizontalScrollList>
            )}

            {selectedDate && (
              <div className="mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-4">
                  <CalendarIcon className="size-5 text-primary" />
                  {t('dashboard.trainingsOn', 'Trainings on')} {selectedDate.toLocaleDateString(isMalayalam ? 'ml-IN' : 'en-IN')}
                </h2>
                {!hasTrainingsOnSelectedDate && (
                  <div
                    className={`rounded-2xl border-2 border-dashed p-8 transition-all ${
                      canCreateTraining && !selectedDateIsPast
                        ? 'border-primary/20 bg-primary/5 hover:border-primary/35 hover:bg-primary/10 cursor-pointer'
                        : 'border-secondary/30 text-muted-foreground'
                    }`}
                    onClick={() => {
                      if (canCreateTraining && !selectedDateIsPast) {
                        handleCreateTrainingForDate();
                      }
                    }}
                    role={canCreateTraining && !selectedDateIsPast ? 'button' : undefined}
                    tabIndex={canCreateTraining && !selectedDateIsPast ? 0 : -1}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && canCreateTraining && !selectedDateIsPast) {
                        e.preventDefault();
                        handleCreateTrainingForDate();
                      }
                    }}
                  >
                    <div className="mx-auto flex max-w-md flex-col items-center text-center">
                      <div className="mb-4 flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                        <CalendarPlus className="size-7" />
                      </div>
                      <p className="text-xl font-semibold text-foreground">
                        {t('dashboard.noTrainingsOnDate', 'No trainings scheduled for this date.')}
                      </p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {selectedDateIsPast
                          ? t('dashboard.pastDateCreateDisabled', 'Training creation is disabled for past dates.')
                          : canCreateTraining
                            ? t('dashboard.createTrainingForDate', 'Create a new training session for this date.')
                            : t('dashboard.noCreatePermissionForDate', 'You do not have permission to create a training session for this date.')}
                      </p>
                      <Button
                        type="button"
                        className="mt-5 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCreateTrainingForDate();
                        }}
                        disabled={!canCreateTraining || selectedDateIsPast}
                        title={
                          selectedDateIsPast
                            ? t('dashboard.cannotCreatePastDate', 'Cannot create a training for a past date')
                            : !canCreateTraining
                              ? t('dashboard.noCreatePermission', 'You do not have permission to create trainings')
                              : t('dashboard.createTrainingForDate', 'Create a training for this date')
                        }
                      >
                        <Plus className="mr-2 size-4" />
                        {t('dashboard.createTraining', 'Create Training')}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Required / Ongoing Trainings */}
            {(selectedDate ? selectedDateActiveTrainings.length > 0 : actionRequired.length > 0) && (activeFilter === 'all' || activeFilter === 'action') && (
              <HorizontalScrollList
                title={selectedDate ? t('dashboard.sections.activeOnDate.title', 'Active Sessions') : (activeFilter === 'action' ? t('dashboard.sections.actionRequired.title', 'Action Required') : t('dashboard.sections.ongoing.title', 'Ongoing Trainings'))}
                subtitle={selectedDate ? t('dashboard.sections.activeOnDate.subtitle', 'Sessions for the selected day') : (activeFilter === 'action' ? t('dashboard.sections.actionRequired.subtitle', 'Items needing your attention') : t('dashboard.sections.ongoing.subtitle', 'Currently active sessions'))}
              >
                {(selectedDate ? selectedDateActiveTrainings : actionRequired).map(training => (
                  <MediaCard
                    key={training.id}
                    id={training.id}
                    title={training.title}
                    subtitle={`${safeFormatDate(training.date)} • ${training.program}`}
                    statusBadge={training.status === 'ongoing' ? "LIVE" : (training.userStatus === 'approved' ? "CONFIRMED" : "NOMINATED")}
                    statusColor={training.status === 'ongoing' ? "bg-red-600 text-white" : "bg-blue-600 text-white"}
                    onClick={() => navigate(`/trainings/${training.id}`)}
                  />
                ))}
              </HorizontalScrollList>
            )}

            {/* Upcoming Trainings */}
            {upcomingTrainings.length > 0 && (activeFilter === 'all' || activeFilter === 'upcoming') && (
              <HorizontalScrollList
                title={selectedDate ? t('dashboard.sections.upcomingOnDate.title', 'Scheduled Sessions') : t('dashboard.sections.upcoming.title', 'Upcoming Trainings')}
                subtitle={selectedDate ? t('dashboard.sections.upcomingOnDate.subtitle', 'Upcoming on this day') : t('dashboard.sections.upcoming.subtitle', 'Scheduled sessions')}
              >
                {upcomingTrainings.map(training => (
                  <MediaCard
                    key={training.id}
                    id={training.id}
                    title={training.title}
                    subtitle={`${safeFormatDate(training.date)} • ${training.capacity} participants`}
                    onClick={() => navigate(`/trainings/${training.id}`)}
                  />
                ))}
              </HorizontalScrollList>
            )}

            {/* Completed Trainings / Past */}
            {completedTrainings.length > 0 && (activeFilter === 'all' || activeFilter === 'completed') && (
              <HorizontalScrollList
                title={selectedDate ? t('dashboard.sections.pastOnDate.title', 'Past Sessions') : t('dashboard.sections.past.title', 'Past Trainings')}
                subtitle={selectedDate ? t('dashboard.sections.pastOnDate.subtitle', 'Completed on this day') : t('dashboard.sections.past.subtitle', 'Completed sessions')}
              >
                {completedTrainings.map(training => (
                  <MediaCard
                    key={training.id}
                    id={training.id}
                    title={training.title}
                    subtitle={`${safeFormatDate(training.date)}`}
                    onClick={() => navigate(`/trainings/${training.id}`)}
                  />
                ))}
              </HorizontalScrollList>
            )}

            {/* Empty States */}
            {activeFilter === 'upcoming' && upcomingTrainings.length === 0 && !selectedDate && (
              <div className="py-20 text-center text-muted-foreground">
                <p className="text-xl">{t('dashboard.noUpcoming', 'No upcoming sessions scheduled.')}</p>
              </div>
            )}
            {activeFilter === 'completed' && completedTrainings.length === 0 && !selectedDate && (
              <div className="py-20 text-center text-muted-foreground">
                <p className="text-xl">{t('dashboard.noPast', 'No past training history found.')}</p>
              </div>
            )}
            {activeFilter === 'action' && actionRequired.length === 0 && !selectedDate && (
              <div className="py-20 text-center text-muted-foreground">
                <p className="text-xl">{t('dashboard.noAction', 'Great job! No urgent actions required.')}</p>
              </div>
            )}
            {activeFilter === 'all' && upcomingTrainings.length === 0 && completedTrainings.length === 0 && actionRequired.length === 0 && !selectedDate && (
              <div className="py-20 text-center text-muted-foreground">
                <p className="text-xl">{t('dashboard.noActivity', 'No activity found in your library.')}</p>
              </div>
            )}

            {/* System Overview Details */}
            {user?.role === 'master_admin' && (activeFilter === 'all') && !selectedDate && (
              <div className="mt-12">
                <h2 className="text-2xl font-bold mb-6">{t('dashboard.systemOverview', 'System Overview')}</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-secondary/20 p-6 rounded-lg text-center hover:bg-secondary/40 transition-colors">
                    <p className="text-4xl font-bold mb-2 text-foreground">{stats.totalTrainings}</p>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{t('dashboard.stats.totalTrainings', 'Total Sessions')}</p>
                  </div>
                  <div className="bg-secondary/20 p-6 rounded-lg text-center hover:bg-secondary/40 transition-colors">
                    <p className="text-4xl font-bold mb-2 text-foreground">{stats.attendanceRate}%</p>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{t('dashboard.stats.avgAttendance', 'Avg Attendance')}</p>
                  </div>
                  <div className="bg-secondary/20 p-6 rounded-lg text-center hover:bg-secondary/40 transition-colors">
                    <p className="text-4xl font-bold mb-2 text-foreground">{stats.trainedStaff}</p>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{t('dashboard.stats.trainedStaff', 'Trained Staff')}</p>
                  </div>
                  <div className="bg-secondary/20 p-6 rounded-lg text-center hover:bg-secondary/40 transition-colors">
                    <p className="text-4xl font-bold mb-2 text-foreground">{stats.untrainedStaff}</p>
                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{t('dashboard.stats.pendingStaff', 'Pending Staff')}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Calendar - Only for Admin/PO */}
        {showDashboardCalendar && (
          <div className="hidden lg:block lg:w-80 lg:shrink-0">
            <div className="space-y-6 lg:sticky lg:top-24">
              {calendarPanel}
            
              {/* Quick Stats Summary in Sidebar */}
              <div className="bg-primary/5 p-6 rounded-2xl border border-primary/10">
                <h4 className="font-semibold text-sm uppercase tracking-wider text-primary mb-4">{t('dashboard.sidebar.summary', 'My Summary')}</h4>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('dashboard.sidebar.active', 'Active Now')}</span>
                    <span className="font-bold">{activeOrOngoing.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('dashboard.sidebar.upcoming', 'Scheduled')}</span>
                    <span className="font-bold">{upcomingTrainings.length}</span>
                  </div>
                  <div className="h-px bg-primary/10 w-full" />
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t('dashboard.sidebar.welcome', 'Welcome back!')} {user?.name}. {t('dashboard.sidebar.instruction', 'Use the calendar to browse your schedule.')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
