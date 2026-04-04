import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsApi, trainingsApi, nominationsApi, usersApi, institutionsApi, BASE_URL } from '../../services/api';
import { DashboardStats, Institution, Nomination, Training, User } from '../../types';
import { safeFormatDate } from '../../utils/date';
import { getTrainingStatusPresentation } from '../../utils/trainingStatus';
import { useTranslation } from 'react-i18next';
import LoadingScreen from '../components/LoadingScreen';

import FilterChips from '../components/FilterChips';
import HorizontalScrollList from '../components/HorizontalScrollList';
import MediaCard from '../components/MediaCard';
import { Calendar } from '../components/ui/calendar';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar as CalendarIcon, CalendarPlus, Plus, Search, UserPlus, Users, X } from 'lucide-react';

const getEntityId = (value: unknown) => {
  if (value && typeof value === 'object') {
    return String((value as { id?: string; _id?: string }).id || (value as { id?: string; _id?: string })._id || '');
  }
  return String(value || '');
};

const normalizeStringList = (value: string[] | string | undefined) =>
  Array.isArray(value) ? value.filter(Boolean).map(String) : value ? [String(value)] : [];

const normalizeAudienceList = (value: string[] | string | undefined) =>
  normalizeStringList(value).flatMap((item) =>
    item.split(',').map((part) => part.trim()).filter(Boolean)
  );

const normalizePhoneNumber = (value: string) => value.replace(/\D/g, '').slice(0, 10);

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [dashboardTrainings, setDashboardTrainings] = useState<Training[]>([]);
  const [calendarTrainings, setCalendarTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [participants, setParticipants] = useState<User[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [showNominateDialog, setShowNominateDialog] = useState(false);
  const [showAddParticipantDialog, setShowAddParticipantDialog] = useState(false);
  const [selectedNominationTraining, setSelectedNominationTraining] = useState<Training | null>(null);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [busyParticipantIds, setBusyParticipantIds] = useState<string[]>([]);
  const [participantSearchTerm, setParticipantSearchTerm] = useState('');
  const [nominationLoading, setNominationLoading] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    phone: '',
    designation: '',
    institutionId: '',
  });
  const isMalayalam = i18n.resolvedLanguage?.startsWith('ml') || i18n.language?.startsWith('ml');

  const formatDateParam = (date: Date) => {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      const dashboardTrainingsPromise = trainingsApi.getAll(
        user.role === 'program_officer' ? { createdById: user.id } : {}
      );
      const calendarTrainingsPromise =
        user.role === 'program_officer' ? trainingsApi.getAll({}) : dashboardTrainingsPromise;

      const nominationPromise = user.role === 'medical_officer' ? nominationsApi.getAll() : Promise.resolve([]);
      const participantPromise = user.role === 'medical_officer' ? usersApi.getAll({ role: 'participant' }) : Promise.resolve([]);
      const institutionPromise = user.role === 'medical_officer' ? institutionsApi.getAll() : Promise.resolve([]);

      const [statsData, trainingsData, visibleCalendarTrainings, nominationData, participantData, institutionData] = await Promise.all([
        analyticsApi.getDashboardStats(user.id, user.role),
        dashboardTrainingsPromise,
        calendarTrainingsPromise,
        nominationPromise,
        participantPromise,
        institutionPromise,
      ]);

      setStats(statsData);
      setDashboardTrainings(Array.isArray(trainingsData) ? trainingsData : []);
      setCalendarTrainings(Array.isArray(visibleCalendarTrainings) ? visibleCalendarTrainings : []);
      setNominations(Array.isArray(nominationData) ? nominationData : []);
      setParticipants(Array.isArray(participantData) ? participantData : []);
      setInstitutions(Array.isArray(institutionData) ? institutionData : []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

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

  const buildTrainingBuckets = (trainings: Training[]) => {
    const upcomingTrainings = trainings
      .filter(t => {
        if (!t || t.status === 'cancelled') return false;
        if (user?.role === 'participant' && t.userStatus === 'attended') return false;

        const tDate = normalizeDate(t.date);
        const statusPresentation = getTrainingStatusPresentation(t);

        if (selectedDateValue) {
          return tDate.getTime() === selectedDateValue.getTime() && selectedDateValue >= today && statusPresentation === 'scheduled';
        }

        return tDate >= today && statusPresentation === 'scheduled';
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const completedTrainings = trainings
      .filter(t => {
        if (!t || t.status === 'cancelled') return false;
        const tDate = normalizeDate(t.date);
        const statusPresentation = getTrainingStatusPresentation(t);

        if (selectedDateValue && tDate.getTime() !== selectedDateValue.getTime()) {
          return false;
        }

        if (user?.role === 'participant') {
          return t.userStatus === 'attended' || statusPresentation === 'completed';
        }

        if (selectedDateValue) {
          return selectedDateIsPast || statusPresentation === 'completed';
        }

        return statusPresentation === 'completed';
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const activeOrOngoing = trainings.filter(t => {
      if (!t || t.status === 'cancelled') return false;
      if (user?.role === 'participant' && t.userStatus === 'attended') return false;

      return getTrainingStatusPresentation(t) === 'ongoing';
    });

    const selectedDateActiveTrainings = trainings
      .filter(t => {
        if (!selectedDateValue || !t || t.status === 'cancelled') return false;
        if (user?.role === 'participant' && t.userStatus === 'attended') return false;

        const tDate = normalizeDate(t.date);
        return tDate.getTime() === selectedDateValue.getTime() && selectedDateIsToday && getTrainingStatusPresentation(t) === 'ongoing';
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const actionRequired = trainings.filter(t => {
      if (!t) return false;
      const statusPresentation = getTrainingStatusPresentation(t);

      if (user?.role === 'participant') {
        return (statusPresentation === 'ongoing' || statusPresentation === 'scheduled') && t.userStatus !== 'attended';
      }

      if (selectedDate) {
        const tDate = new Date(t.date);
        tDate.setHours(0, 0, 0, 0);
        const sDate = new Date(selectedDate);
        sDate.setHours(0, 0, 0, 0);
        return tDate.getTime() === sDate.getTime();
      }

      const tDate = new Date(t.date);
      tDate.setHours(0, 0, 0, 0);
      const isPast = tDate < today;

      return statusPresentation === 'ongoing' || statusPresentation === 'overdue' || (statusPresentation === 'scheduled' && isPast);
    });

    return {
      upcomingTrainings,
      completedTrainings,
      activeOrOngoing,
      selectedDateActiveTrainings,
      actionRequired,
    };
  };

  const ownTrainingBuckets = buildTrainingBuckets(dashboardTrainings);
  const selectedDateTrainingBuckets =
    selectedDate && user?.role === 'program_officer'
      ? buildTrainingBuckets(calendarTrainings)
      : ownTrainingBuckets;

  const upcomingTrainings = selectedDate ? selectedDateTrainingBuckets.upcomingTrainings : ownTrainingBuckets.upcomingTrainings;
  const completedTrainings = selectedDate ? selectedDateTrainingBuckets.completedTrainings : ownTrainingBuckets.completedTrainings;
  const activeOrOngoing = ownTrainingBuckets.activeOrOngoing;
  const selectedDateActiveTrainings = selectedDate ? selectedDateTrainingBuckets.selectedDateActiveTrainings : ownTrainingBuckets.selectedDateActiveTrainings;
  const actionRequired = ownTrainingBuckets.actionRequired;

  const hasTrainingsOnSelectedDate =
    selectedDateActiveTrainings.length > 0 || upcomingTrainings.length > 0 || completedTrainings.length > 0;
  const canCreateTraining = user?.role === 'master_admin' || user?.role === 'program_officer';
  const isMedicalOfficer = user?.role === 'medical_officer';
  const showDashboardCalendar =
    user?.role === 'medical_officer' ||
    user?.role === 'program_officer' ||
    user?.role === 'master_admin';
  const ongoingDashboardTrainings = selectedDate ? selectedDateActiveTrainings : activeOrOngoing;
  const selectedTrainingInstitutionIds = normalizeStringList(selectedNominationTraining?.requiredInstitutions);
  const selectedTrainingAudience = normalizeAudienceList(selectedNominationTraining?.targetAudience);
  const selectedAudienceTokens = selectedTrainingAudience.map((item) => item.toLowerCase());
  const selectedTrainingNominations = nominations.filter(
    (nomination) => getEntityId(nomination.trainingId) === selectedNominationTraining?.id
  );
  const selectedTrainingExistingParticipantIds = new Set(
    selectedTrainingNominations
      .filter((nomination) => nomination.status !== 'rejected')
      .map((nomination) => getEntityId(nomination.participantId))
  );
  const selectedTrainingAssignedCount = selectedTrainingNominations.filter(
    (nomination) => nomination.status === 'nominated' || nomination.status === 'approved' || nomination.status === 'attended'
  ).length;
  const selectedTrainingRemainingSeats = selectedNominationTraining
    ? Math.max(0, selectedNominationTraining.capacity - selectedTrainingAssignedCount)
    : 0;
  const selectedTrainingInstitutionOptions = (
    selectedTrainingInstitutionIds.length > 0
      ? institutions.filter((institution) => selectedTrainingInstitutionIds.includes(institution.id))
      : institutions
  ).sort((left, right) => left.name.localeCompare(right.name));
  const eligibleParticipants = participants.filter((participant) => {
    if (!selectedNominationTraining) return false;

    const participantInstitutionId = getEntityId(participant.institutionId);
    const participantDesignation = String(participant.designation || '').trim().toLowerCase();

    const matchesInstitution =
      selectedTrainingInstitutionIds.length === 0 || selectedTrainingInstitutionIds.includes(participantInstitutionId);
    const matchesAudience =
      selectedAudienceTokens.length === 0 || (participantDesignation && selectedAudienceTokens.includes(participantDesignation));

    return matchesInstitution && matchesAudience;
  });
  const filteredEligibleParticipants = eligibleParticipants
    .filter((participant) => {
      const searchValue = participantSearchTerm.trim().toLowerCase();
      if (!searchValue) return true;

      const participantInstitutionName = institutions.find((institution) => institution.id === getEntityId(participant.institutionId))?.name || '';
      return [
        participant.name,
        participant.phone,
        participant.designation,
        participantInstitutionName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(searchValue);
    })
    .sort((first, second) => {
      const firstAssigned = selectedTrainingExistingParticipantIds.has(first.id);
      const secondAssigned = selectedTrainingExistingParticipantIds.has(second.id);
      const firstBusy = busyParticipantIds.includes(first.id);
      const secondBusy = busyParticipantIds.includes(second.id);
      const firstRank = firstAssigned ? 2 : firstBusy ? 1 : 0;
      const secondRank = secondAssigned ? 2 : secondBusy ? 1 : 0;

      if (firstRank !== secondRank) return firstRank - secondRank;
      return first.name.localeCompare(second.name);
    });
  const readyParticipantsCount = filteredEligibleParticipants.filter(
    (participant) => !busyParticipantIds.includes(participant.id) && !selectedTrainingExistingParticipantIds.has(participant.id)
  ).length;

  const handleDateSelect = (date?: Date) => {
    setSelectedDate(date);
  };

  useEffect(() => {
    const fetchBusyParticipants = async () => {
      if (!selectedNominationTraining) {
        setBusyParticipantIds([]);
        return;
      }

      try {
        const busyIds = await nominationsApi.getBusyParticipants(
          typeof selectedNominationTraining.date === 'string'
            ? selectedNominationTraining.date
            : new Date(selectedNominationTraining.date).toISOString(),
          selectedNominationTraining.id
        );
        setBusyParticipantIds(Array.isArray(busyIds) ? busyIds : []);
      } catch (error) {
        console.error('Failed to fetch busy participants:', error);
        setBusyParticipantIds([]);
      }
    };

    if (showNominateDialog) {
      fetchBusyParticipants();
    }
  }, [selectedNominationTraining, showNominateDialog]);

  useEffect(() => {
    if (!showNominateDialog) {
      setSelectedParticipantIds([]);
      setParticipantSearchTerm('');
      setBusyParticipantIds([]);
      setSelectedNominationTraining(null);
    }
  }, [showNominateDialog]);

  const openNominationModal = (training: Training) => {
    setSelectedNominationTraining(training);
    setSelectedParticipantIds([]);
    setParticipantSearchTerm('');
    setNewParticipant({
      name: '',
      phone: '',
      designation: '',
      institutionId: normalizeStringList(training.requiredInstitutions)[0] || '',
    });
    setShowNominateDialog(true);
  };

  const toggleParticipantSelection = (participantId: string) => {
    if (!selectedNominationTraining) return;

    setSelectedParticipantIds((previousIds) => {
      if (previousIds.includes(participantId)) {
        return previousIds.filter((id) => id !== participantId);
      }

      if (selectedTrainingRemainingSeats <= previousIds.length) {
        toast.warning(t('dashboard.nomination.capacityReached', { defaultValue: 'This training has no seats left.' }));
        return previousIds;
      }

      return [...previousIds, participantId];
    });
  };

  const handleNominateParticipants = async () => {
    if (!user || !selectedNominationTraining || selectedParticipantIds.length === 0) return;

    setNominationLoading(true);
    let successCount = 0;

    try {
      for (const participantId of selectedParticipantIds) {
        const participant = participants.find((entry) => entry.id === participantId);
        if (!participant) continue;

        await nominationsApi.create({
          trainingId: selectedNominationTraining.id,
          participantId,
          institutionId: getEntityId(participant.institutionId),
          status: 'nominated',
          nominatedBy: user.id,
        });
        successCount += 1;
      }

      toast.success(
        t('dashboard.nomination.success', {
          count: successCount,
          defaultValue: `${successCount} participant(s) nominated successfully.`,
        })
      );
      setSelectedParticipantIds([]);
      await fetchDashboardData();
      setShowNominateDialog(false);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('dashboard.nomination.failed', { defaultValue: 'Failed to nominate participant(s).' }));
    } finally {
      setNominationLoading(false);
    }
  };

  const handleCreateAndNominate = async () => {
    if (!user || !selectedNominationTraining) return;
    if (!newParticipant.name.trim() || !newParticipant.phone.trim() || !newParticipant.designation.trim() || !newParticipant.institutionId) {
      toast.error(t('dashboard.nomination.newParticipantRequired', {
        defaultValue: 'Name, phone, designation, and institution are required.',
      }));
      return;
    }

    if (normalizePhoneNumber(newParticipant.phone).length !== 10) {
      toast.error(t('dashboard.nomination.phoneDigits', { defaultValue: 'Phone number must be exactly 10 digits.' }));
      return;
    }

    setNominationLoading(true);
    try {
      const createResponse = await usersApi.createManualParticipant({
        name: newParticipant.name.trim(),
        phone: normalizePhoneNumber(newParticipant.phone),
        designation: newParticipant.designation.trim(),
        institutionId: newParticipant.institutionId,
      });

      const createdParticipant = createResponse?.user;
      if (!createdParticipant?.id) {
        throw new Error('Participant creation response was incomplete.');
      }

      await nominationsApi.create({
        trainingId: selectedNominationTraining.id,
        participantId: createdParticipant.id,
        institutionId: newParticipant.institutionId,
        status: 'nominated',
        nominatedBy: user.id,
      });

      toast.success(t('dashboard.nomination.createAndNominateSuccess', {
        defaultValue: 'New participant created and nominated successfully.',
      }));
      setShowAddParticipantDialog(false);
      setNewParticipant({
        name: '',
        phone: '',
        designation: '',
        institutionId: normalizeStringList(selectedNominationTraining.requiredInstitutions)[0] || '',
      });
      await fetchDashboardData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || error.message || t('dashboard.nomination.createAndNominateFailed', {
        defaultValue: 'Failed to create and nominate participant.',
      }));
    } finally {
      setNominationLoading(false);
    }
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
      path: '/program-officers',
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
            {(selectedDate ? selectedDateActiveTrainings.length > 0 : (isMedicalOfficer ? ongoingDashboardTrainings.length > 0 : actionRequired.length > 0)) && (activeFilter === 'all' || activeFilter === 'action') && (
              <HorizontalScrollList
                title={
                  isMedicalOfficer
                    ? t('dashboard.sections.ongoing.title', 'Ongoing Trainings')
                    : selectedDate
                      ? t('dashboard.sections.activeOnDate.title', 'Active Sessions')
                      : (activeFilter === 'action' ? t('dashboard.sections.actionRequired.title', 'Action Required') : t('dashboard.sections.ongoing.title', 'Ongoing Trainings'))
                }
                subtitle={
                  isMedicalOfficer
                    ? t('dashboard.sections.ongoing.subtitle', 'Currently active sessions')
                    : selectedDate
                      ? t('dashboard.sections.activeOnDate.subtitle', 'Sessions for the selected day')
                      : (activeFilter === 'action' ? t('dashboard.sections.actionRequired.subtitle', 'Items needing your attention') : t('dashboard.sections.ongoing.subtitle', 'Currently active sessions'))
                }
              >
                {(isMedicalOfficer ? ongoingDashboardTrainings : (selectedDate ? selectedDateActiveTrainings : actionRequired)).map(training => (
                  (() => {
                    const statusPresentation = getTrainingStatusPresentation(training);

                    return (
                      <MediaCard
                        key={training.id}
                        id={training.id}
                        title={training.title}
                        subtitle={`${safeFormatDate(training.date)} • ${training.program}`}
                        statusBadge={
                          statusPresentation === 'ongoing'
                            ? 'LIVE'
                            : statusPresentation === 'overdue'
                              ? 'UPDATE'
                              : training.userStatus === 'approved'
                                ? 'CONFIRMED'
                                : 'NOMINATED'
                        }
                        statusColor={
                          statusPresentation === 'ongoing'
                            ? 'bg-red-600 text-white'
                            : statusPresentation === 'overdue'
                              ? 'bg-amber-500 text-black'
                              : 'bg-blue-600 text-white'
                        }
                        onClick={() => isMedicalOfficer ? openNominationModal(training) : navigate(`/trainings/${training.id}`)}
                      />
                    );
                  })()
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
            {activeFilter === 'action' && (isMedicalOfficer ? ongoingDashboardTrainings.length === 0 : actionRequired.length === 0) && !selectedDate && (
              <div className="py-20 text-center text-muted-foreground">
                <p className="text-xl">
                  {isMedicalOfficer
                    ? t('dashboard.noOngoing', 'No ongoing trainings available right now.')
                    : t('dashboard.noAction', 'Great job! No urgent actions required.')}
                </p>
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

      <Dialog open={showNominateDialog} onOpenChange={setShowNominateDialog}>
        <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden border-border bg-background p-0 text-foreground sm:max-w-5xl">
          <DialogHeader className="border-b border-border px-6 py-5 sm:px-8">
            <DialogTitle>{t('dashboard.nomination.title', { defaultValue: 'Nominate Participants' })}</DialogTitle>
            <DialogDescription>
              {selectedNominationTraining
                ? t('dashboard.nomination.descriptionSelected', {
                    title: selectedNominationTraining.title,
                    defaultValue: `Nominate personnel for ${selectedNominationTraining.title}.`,
                  })
                : t('dashboard.nomination.description', {
                    defaultValue: 'Select existing participants or create a new participant and nominate them instantly.',
                  })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
            {selectedNominationTraining && (
              <div className="space-y-6">
                <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-sm">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        {t('dashboard.nomination.selectedTraining', { defaultValue: 'Selected training' })}
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-foreground">{selectedNominationTraining.title}</h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {safeFormatDate(selectedNominationTraining.date)} • {selectedNominationTraining.startTime} - {selectedNominationTraining.endTime}
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                        {t('dashboard.nomination.remainingSeats', {
                          count: selectedTrainingRemainingSeats,
                          defaultValue: `${selectedTrainingRemainingSeats} seats left`,
                        })}
                      </Badge>
                      <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                        {t('dashboard.nomination.assignedCount', {
                          count: selectedTrainingAssignedCount,
                          defaultValue: `${selectedTrainingAssignedCount} already assigned`,
                        })}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-4 md:grid-cols-3">
                    <div className="rounded-xl border border-border bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        {t('dashboard.nomination.program', { defaultValue: 'Program' })}
                      </p>
                      <p className="mt-3 text-sm font-medium text-foreground">{selectedNominationTraining.program}</p>
                    </div>
                    <div className="rounded-xl border border-border bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        {t('dashboard.nomination.targetAudience', { defaultValue: 'Target audience' })}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedTrainingAudience.length > 0 ? (
                          selectedTrainingAudience.map((audience) => (
                            <Badge key={audience} variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                              {audience}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {t('dashboard.nomination.openAudience', { defaultValue: 'Open to all designations' })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="rounded-xl border border-border bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        {t('dashboard.nomination.institutions', { defaultValue: 'Institutions' })}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {selectedTrainingInstitutionOptions.length > 0 ? (
                          selectedTrainingInstitutionOptions.map((institution) => (
                            <Badge key={institution.id} variant="outline" className="border-border bg-background text-foreground">
                              {institution.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {t('dashboard.nomination.openInstitutions', { defaultValue: 'Open to all institutions' })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card/70 p-5 shadow-sm">
                  <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <Label className="text-sm font-medium text-foreground">
                        {t('dashboard.nomination.selectParticipants', { defaultValue: 'Select existing participants' })} ({selectedParticipantIds.length})
                      </Label>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {t('dashboard.nomination.readySummary', {
                          count: readyParticipantsCount,
                          defaultValue: `${readyParticipantsCount} eligible participant(s) ready for nomination.`,
                        })}
                      </p>
                    </div>

                    <Button type="button" variant="outline" onClick={() => setShowAddParticipantDialog(true)}>
                      <UserPlus className="mr-2 size-4" />
                      {t('dashboard.nomination.createAndNominate', { defaultValue: 'Create & Nominate' })}
                    </Button>
                  </div>

                  <div className="relative mb-4">
                    <Search className="absolute left-3 top-3.5 size-4 text-primary/60" />
                    <Input
                      value={participantSearchTerm}
                      onChange={(e) => setParticipantSearchTerm(e.target.value)}
                      placeholder={t('dashboard.nomination.searchParticipants', {
                        defaultValue: 'Search by name, phone, designation, or institution',
                      })}
                      className="h-11 rounded-xl bg-background pl-10"
                    />
                  </div>

                  <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-scrollbar">
                    {eligibleParticipants.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-6 text-sm text-muted-foreground">
                        {t('dashboard.nomination.noEligibleParticipants', {
                          defaultValue: 'No existing participants match this training’s institution and designation requirements.',
                        })}
                      </div>
                    )}

                    {eligibleParticipants.length > 0 && filteredEligibleParticipants.length === 0 && (
                      <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-6 text-sm text-muted-foreground">
                        {t('dashboard.nomination.noSearchMatches', {
                          defaultValue: 'No participants matched your search.',
                        })}
                      </div>
                    )}

                    {filteredEligibleParticipants.map((participant) => {
                      const participantInstitutionId = getEntityId(participant.institutionId);
                      const participantInstitutionName =
                        institutions.find((institution) => institution.id === participantInstitutionId)?.name ||
                        participant.institution?.name ||
                        t('dashboard.nomination.unknownInstitution', { defaultValue: 'Unknown institution' });
                      const isBusy = busyParticipantIds.includes(participant.id);
                      const isAssigned = selectedTrainingExistingParticipantIds.has(participant.id);
                      const isDisabled = isBusy || isAssigned;
                      const isSelected = selectedParticipantIds.includes(participant.id);

                      return (
                        <div
                          key={participant.id}
                          onClick={() => !isDisabled && toggleParticipantSelection(participant.id)}
                          className={`flex items-center justify-between gap-3 rounded-xl border p-3 transition-all ${
                            isDisabled
                              ? 'cursor-not-allowed border-border bg-muted/40 opacity-60'
                              : isSelected
                                ? 'cursor-pointer border-primary bg-primary/5 shadow-sm'
                                : 'cursor-pointer border-border bg-background hover:border-primary/30'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Checkbox checked={isSelected} disabled={isDisabled} />
                            <div>
                              <p className={`text-sm font-medium ${isDisabled ? 'text-muted-foreground' : 'text-foreground'}`}>
                                {participant.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {[participant.phone, participant.designation, participantInstitutionName].filter(Boolean).join(' • ')}
                              </p>
                            </div>
                          </div>

                          {isAssigned ? (
                            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                              {t('dashboard.nomination.alreadyAssigned', { defaultValue: 'Already assigned' })}
                            </Badge>
                          ) : isBusy ? (
                            <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                              {t('dashboard.nomination.busy', { defaultValue: 'Busy' })}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                              {t('dashboard.nomination.ready', { defaultValue: 'Ready' })}
                            </Badge>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="border-t border-border px-6 py-4 sm:px-8">
            <Button onClick={() => setShowNominateDialog(false)} variant="outline">
              {t('dashboard.nomination.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button
              onClick={handleNominateParticipants}
              disabled={!selectedNominationTraining || selectedParticipantIds.length === 0 || nominationLoading}
            >
              {nominationLoading
                ? t('dashboard.nomination.submitting', { defaultValue: 'Submitting...' })
                : t('dashboard.nomination.submit', {
                    count: selectedParticipantIds.length,
                    defaultValue: `Nominate (${selectedParticipantIds.length})`,
                  })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddParticipantDialog} onOpenChange={setShowAddParticipantDialog}>
        <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden border-border bg-background text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dashboard.nomination.addParticipantTitle', { defaultValue: 'Create & Nominate Participant' })}</DialogTitle>
            <DialogDescription>
              {t('dashboard.nomination.addParticipantDesc', {
                defaultValue: 'Add a new participant and nominate them immediately for the selected training.',
              })}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            <div>
              <Label className="mb-1 block text-sm font-medium text-foreground">
                {t('dashboard.nomination.fullName', { defaultValue: 'Name *' })}
              </Label>
              <Input
                value={newParticipant.name}
                onChange={(e) => setNewParticipant((previous) => ({ ...previous, name: e.target.value }))}
                placeholder={t('dashboard.nomination.fullNamePlaceholder', { defaultValue: 'Enter participant name' })}
              />
            </div>
            <div>
              <Label className="mb-1 block text-sm font-medium text-foreground">
                {t('dashboard.nomination.phone', { defaultValue: 'Phone *' })}
              </Label>
              <Input
                value={newParticipant.phone}
                onChange={(e) => setNewParticipant((previous) => ({ ...previous, phone: normalizePhoneNumber(e.target.value) }))}
                placeholder="9876543210"
                inputMode="numeric"
                maxLength={10}
              />
            </div>
            <div>
              <Label className="mb-1 block text-sm font-medium text-foreground">
                {t('dashboard.nomination.designation', { defaultValue: 'Designation *' })}
              </Label>
              <Input
                value={newParticipant.designation}
                onChange={(e) => setNewParticipant((previous) => ({ ...previous, designation: e.target.value }))}
                placeholder={t('dashboard.nomination.designationPlaceholder', { defaultValue: 'Enter designation' })}
              />
            </div>
            <div>
              <Label className="mb-1 block text-sm font-medium text-foreground">
                {t('dashboard.nomination.institutionField', { defaultValue: 'Institution *' })}
              </Label>
              <Select
                value={newParticipant.institutionId}
                onValueChange={(value) => setNewParticipant((previous) => ({ ...previous, institutionId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('dashboard.nomination.selectInstitution', { defaultValue: 'Select institution' })} />
                </SelectTrigger>
                <SelectContent>
                  {selectedTrainingInstitutionOptions.map((institution) => (
                    <SelectItem key={institution.id} value={institution.id}>
                      {institution.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="border-t border-border pt-6">
            <Button onClick={() => setShowAddParticipantDialog(false)} variant="outline">
              {t('dashboard.nomination.cancel', { defaultValue: 'Cancel' })}
            </Button>
            <Button onClick={handleCreateAndNominate} disabled={nominationLoading}>
              {nominationLoading
                ? t('dashboard.nomination.saving', { defaultValue: 'Saving...' })
                : t('dashboard.nomination.createAndNominate', { defaultValue: 'Create & Nominate' })}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
