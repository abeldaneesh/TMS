import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { nominationsApi, trainingsApi, usersApi, institutionsApi } from '../../services/api';
import { Nomination, Training, User, Institution } from '../../types';
import { CheckCircle, XCircle, Clock, Users, Search, CalendarDays, Building2, Briefcase, Sparkles, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { format } from 'date-fns';
import { toast } from 'sonner';
import LoadingScreen from '../components/LoadingScreen';
import FilterChips from '../components/FilterChips';
import { getTrainingStartDateTime } from '../../utils/trainingTime';
import {
  getTrainingDateInputValue,
  getTrainingSearchableDateText,
  getTrainingSortTimestamp,
  normalizeTrainingMatchValue,
} from '../../utils/trainingFilters';

const safeFormatDate = (date: any, formatStr: string = 'MMM dd, yyyy') => {
  if (!date) return 'N/A';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return 'Invalid Date';
    return format(d, formatStr);
  } catch (e) {
    return 'Invalid Date';
  }
};

const normalizePhoneNumber = (value: string) => value.replace(/\D/g, '').slice(0, 10);
const getEntityId = (value: any) => typeof value === 'object' ? value?.id || value?._id || '' : value || '';
const normalizeStringList = (value: string[] | string | undefined) =>
  Array.isArray(value) ? value.filter(Boolean).map(String) : value ? [String(value)] : [];
const normalizeAudienceList = (value: string[] | string | undefined) =>
  normalizeStringList(value).flatMap((item) =>
    item.split(',').map((part) => part.trim()).filter(Boolean)
  );
const formatSessionWindow = (startTime?: string, endTime?: string, fallbackLabel: string = 'Time not set') =>
  startTime && endTime ? `${startTime} - ${endTime}` : fallbackLabel;

type NominationDisplayStatus = 'assigned' | 'attended' | 'rejected';
const getNominationDisplayStatus = (status: Nomination['status']): NominationDisplayStatus => {
  if (status === 'attended') return 'attended';
  if (status === 'rejected') return 'rejected';
  return 'assigned';
};
const getNominationDisplayLabel = (
  status: Nomination['status'],
  t: (key: string, options?: any) => string,
) => {
  const displayStatus = getNominationDisplayStatus(status);
  if (displayStatus === 'assigned') return t('nominationsProps.assigned', { defaultValue: 'Assigned' });
  if (displayStatus === 'attended') return t('nominationsProps.attended', { defaultValue: 'Attended' });
  return t('nominationsProps.rejected', { defaultValue: 'Rejected' });
};
const getNominationStatusClass = (status: Nomination['status']) => {
  const displayStatus = getNominationDisplayStatus(status);
  switch (displayStatus) {
    case 'assigned':
      return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    case 'attended':
      return 'bg-sky-500/10 text-sky-400 border-sky-500/20';
    case 'rejected':
      return 'bg-destructive/10 text-destructive border-destructive/20';
  }
};

const Nominations: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | NominationDisplayStatus>('all');
  const [selectedNomination, setSelectedNomination] = useState<Nomination | null>(null);
  const [selectedNominationIds, setSelectedNominationIds] = useState<string[]>([]);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showNominateDialog, setShowNominateDialog] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [busyParticipantIds, setBusyParticipantIds] = useState<string[]>([]);
  const [participantSearchTerm, setParticipantSearchTerm] = useState('');
  const [trainingSearchTerm, setTrainingSearchTerm] = useState('');
  const [trainingDateFilter, setTrainingDateFilter] = useState('');
  const [barebonesMode, setBarebonesMode] = useState(false);

  // Manual Add State
  const [showAddParticipantDialog, setShowAddParticipantDialog] = useState(false);
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    email: '',
    phone: '',
    designation: '',
    department: '',
  });
  const sessionWindowFallback = t('nominationsProps.timeNotSet', { defaultValue: 'Time not set' });

  // Helper functions with extra safety, memoized with useCallback
  const getTrainingName = useCallback((trainingId: any) => {
    const id = typeof trainingId === 'object' ? trainingId?.id || trainingId?._id : trainingId;
    return trainings.find(t => t.id === id || (t as any)._id === id)?.title || t('nominationsProps.unknownTraining', { defaultValue: 'Unknown Training' });
  }, [t, trainings]);

  const getParticipantName = useCallback((participantId: any) => {
    const id = typeof participantId === 'object' ? participantId?.id || participantId?._id : participantId;
    return users.find(u => u.id === id || (u as any)._id === id)?.name || t('nominationsProps.unknownPersonnel', { defaultValue: 'Unknown Personnel' });
  }, [t, users]);

  const getParticipantRecord = useCallback((participantId: any) => {
    const id = typeof participantId === 'object' ? participantId?.id || participantId?._id : participantId;
    return users.find(u => u.id === id || (u as any)._id === id);
  }, [users]);

  const getTrainingRecord = useCallback((trainingId: any) => {
    const id = typeof trainingId === 'object' ? trainingId?.id || trainingId?._id : trainingId;
    return trainings.find(t => t.id === id || (t as any)._id === id);
  }, [trainings]);

  const getInstitutionName = useCallback((institutionId: any) => {
    const id = typeof institutionId === 'object' ? institutionId?.id || institutionId?._id : institutionId;
    return institutions.find(i => i.id === id || (i as any)._id === id)?.name || t('nominationsProps.unknownInstitution', { defaultValue: 'Unknown Institution' });
  }, [institutions, t]);

  const fetchData = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      console.log('[NOMINATIONS_SYNC] Starting data fetch...');
      const [nominationsData, trainingsData, usersData, institutionsData] = await Promise.all([
        nominationsApi.getAll(
          user.role === 'participant'
            ? { participantId: user.id }
            : {}
        ),
        trainingsApi.getAll(
          // Fetch all trainings to ensure historical nominations can resolve their titles/dates
          {}
        ),
        usersApi.getAll(),
        institutionsApi.getAll(),
      ]);

      console.log('[NOMINATIONS_SYNC] Sync result:', {
        nominations: Array.isArray(nominationsData) ? nominationsData.length : 0,
        users: Array.isArray(usersData) ? usersData.length : 0
      });

      // Sort nominations: Pending first, then newest first
      const sortedNominations = Array.isArray(nominationsData)
        ? [...nominationsData].sort((a, b) => {
          // 1. Pending status first
          if (a.status === 'nominated' && b.status !== 'nominated') return -1;
          if (a.status !== 'nominated' && b.status === 'nominated') return 1;

          // 2. Newest date first
          const dateA = new Date(a.nominatedAt || 0).getTime();
          const dateB = new Date(b.nominatedAt || 0).getTime();
          return dateB - dateA;
        })
        : [];

      setNominations(sortedNominations);
      setTrainings(Array.isArray(trainingsData) ? trainingsData : []);
      setUsers(Array.isArray(usersData) ? usersData : []);
      setInstitutions(Array.isArray(institutionsData) ? institutionsData : []);
    } catch (error) {
      console.error('[NOMINATIONS_SYNC] Fatal fetch error:', error);
      toast.error(t('nominationsProps.syncFailed'));
    } finally {
      setLoading(false);
    }
  }, [user]); // Depend on user to refetch if user changes

  useEffect(() => {
    fetchData();
  }, [fetchData]); // Call fetchData when the memoized function changes (which is only when user changes)

  useEffect(() => {
    const fetchBusyParticipants = async () => {
      if (!selectedTrainingId) {
        setBusyParticipantIds([]);
        return;
      }

      const training = trainings.find(t => t.id === selectedTrainingId);
      if (training && training.date) {
        try {
          // Get the date string in a format the backend can parse
          const dateStr = typeof training.date === 'string' ? training.date : new Date(training.date).toISOString();
          const busyIds = await nominationsApi.getBusyParticipants(dateStr, selectedTrainingId);
          setBusyParticipantIds(busyIds);

          // Remove any selected participants that are now found to be busy
          setSelectedParticipantIds(prev => prev.filter(id => !busyIds.includes(id)));
        } catch (error) {
          console.error('Failed to fetch busy participants:', error);
          toast.error(t('nominationsProps.checkAvailFail'));
          setBusyParticipantIds([]);
        }
      } else {
        setBusyParticipantIds([]);
      }
    };

    fetchBusyParticipants();
  }, [selectedTrainingId, trainings]);

  useEffect(() => {
    if (!showNominateDialog) {
      setParticipantSearchTerm('');
      setTrainingSearchTerm('');
      setTrainingDateFilter('');
    }
  }, [showNominateDialog]);

  const handleApprove = async (nomination: Nomination) => {
    if (!user) return;
    try {
      await nominationsApi.approve(nomination.id, user.id);
      toast.success(t('nominationsProps.nomApproved'));
      fetchData(); // Refresh UI smoothly
    } catch (error: any) {
      toast.error(error.message || t('nominationsProps.errorApproving'));
    }
  };

  const handleBulkApprove = async () => {
    if (!user || selectedNominationIds.length === 0) return;
    setLoading(true);
    try {
      const result = await nominationsApi.bulkApprove(selectedNominationIds, user.id);
      if (result.failed === 0) {
        toast.success(t('nominationsProps.bulkApproveSuccess', { count: result.success }));
      } else {
        toast.warning(t('nominationsProps.bulkApprovePartial', { success: result.success, failed: result.failed }));
      }
      setSelectedNominationIds([]);
      fetchData();
    } catch (error: any) {
      toast.error(t('nominationsProps.errorApproving'));
    } finally {
      setLoading(false);
    }
  };

  const toggleNominationSelection = (id: string) => {
    setSelectedNominationIds(prev =>
      prev.includes(id) ? prev.filter(nomId => nomId !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = (filteredNominations: Nomination[]) => {
    const pendingNominations = filteredNominations.filter(nom => nom.status === 'nominated');
    if (selectedNominationIds.length === pendingNominations.length) {
      // Deselect all
      setSelectedNominationIds([]);
    } else {
      // Select all pending
      setSelectedNominationIds(pendingNominations.map(nom => nom.id));
    }
  };

  const handleRejectClick = (nomination: Nomination) => {
    setSelectedNomination(nomination);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!user || !selectedNomination) return;
    try {
      await nominationsApi.reject(selectedNomination.id, user.id, rejectionReason);
      toast.success(t('nominationsProps.nomRejected'));
      setShowRejectDialog(false);
      fetchData(); // Refresh UI smoothly
    } catch (error: any) {
      toast.error(error.message || t('nominationsProps.errorRejecting'));
    }
  };

  const toggleParticipantSelection = (participantId: string) => {
    setSelectedParticipantIds(prev => {
      // If we are unselecting, always allow it
      if (prev.includes(participantId)) {
        return prev.filter(id => id !== participantId);
      }

      // If we are selecting, check capacity
      const training = trainings.find(t => t.id === selectedTrainingId);
      if (training) {
        // Count how many people are already nominated (excluding rejected)
        const currentValidNominationsCount = nominations.filter(
          (n) => getEntityId(n.trainingId) === selectedTrainingId && n.status !== 'rejected'
        ).length;

        const allowedNew = training.capacity - currentValidNominationsCount;

        if (prev.length >= allowedNew) {
          toast.warning(t('nominationsProps.capacityReached', { capacity: training.capacity }));
          return prev; // Do not add the new participant
        }
      }

      return [...prev, participantId];
    });
  };

  const handleTrainingSelection = (trainingId: string) => {
    setSelectedTrainingId(trainingId);
    setSelectedParticipantIds([]);
    setParticipantSearchTerm('');
  };

  const handleNominate = async () => {
    if (!user || !selectedTrainingId || selectedParticipantIds.length === 0) return;
    const selectedTrainingRecord = trainings.find((training) => training.id === selectedTrainingId);
    if (selectedTrainingRecord && new Date() >= getTrainingStartDateTime(selectedTrainingRecord)) {
      toast.error(t('nominationsProps.nominationClosed', { defaultValue: 'Nominations close once the training start time is reached' }));
      return;
    }
    setLoading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const pId of selectedParticipantIds) {
        const participant = users.find(u => u.id === pId);
        if (participant) {
          try {
            await nominationsApi.create({
              trainingId: selectedTrainingId,
              participantId: pId,
              institutionId: participant.institutionId || '',
              status: 'nominated',
              nominatedBy: user.id
            });
            successCount++;
          } catch (error: any) {
            failCount++;
            const errorMsg = error.response?.data?.message || `Failed to nominate ${participant.name || 'Personnel'}`;
            toast.error(errorMsg, {
              description: "Duplicate or conflicting entry detected.",
              duration: 5000
            });
          }
        }
      }

      if (successCount > 0) {
        toast.success(t('nominationsProps.nomSuccess', { count: successCount }));
        setShowNominateDialog(false);
        fetchData(); // Refresh UI smoothly
      } else if (failCount > 0) {
        // All failed
        toast.error(t('nominationsProps.missionAborted'), {
          description: t('nominationsProps.missionAbortedDesc')
        });
      }
    } catch (error: any) {
      toast.error(t('nominationsProps.globalError'));
    } finally {
      setLoading(false);
    }
  };

  const handleManualAddSubmit = async () => {
    if (!newParticipant.name || !newParticipant.email) {
      toast.error(t('nominationsProps.nameEmailRequired', { defaultValue: 'Name and Email are required' }));
      return;
    }
    if (newParticipant.phone && newParticipant.phone.length !== 10) {
      toast.error(t('nominationsProps.phoneDigits', { defaultValue: 'Phone number must be exactly 10 digits' }));
      return;
    }
    setLoading(true);
    try {
      await usersApi.createManualParticipant(newParticipant);
      toast.success(t('nominationsProps.participantAdded', { defaultValue: 'Participant added successfully' }));
      setShowAddParticipantDialog(false);
      setNewParticipant({ name: '', email: '', phone: '', designation: '', department: '' });
      fetchData(); // Refresh list to show new user immediately
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || t('nominationsProps.addError', { defaultValue: 'Failed to add participant' });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <div className="p-8 text-center text-muted-foreground">{t('nominationsProps.accessDenied')}</div>;
  }

  // BAREBONES EMERGENCY VIEW FOR MOBILE DEBUGGING
  if (barebonesMode) {
    return (
      <div className="p-4 bg-muted text-foreground overflow-auto h-screen">
        <h1 className="text-lg font-semibold border-b border-border pb-2 mb-4">{t('nominationsProps.debugList')}</h1>
        <button
          onClick={() => setBarebonesMode(false)}
          className="mb-4 p-2 border border-border rounded hover:bg-muted-foreground/10"
        >
          {t('nominationsProps.exitDebug')}
        </button>
        <div className="space-y-4">
          <p>{t('nominationsProps.personnel')}: {user.name} ({user.role})</p>
          <p>{t('nominationsProps.totalRecords')}: {nominations.length}</p>
          <div className="mt-4 border-t border-green-900 pt-4">
            {nominations.map(n => (
              <div key={n.id} className="mb-4 pb-4 border-b border-green-900">
                <p>{t('nominationsProps.participant')}: {getParticipantName(n.participantId)}</p>
                <p>{t('nominationsProps.training')}: {getTrainingName(n.trainingId)}</p>
                <p>{t('nominationsProps.status')}: {n.status}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Main component render logic
  try {
    const selectedTraining = trainings.find((training) => training.id === selectedTrainingId);
    const selectedTrainingInstitutionIds = normalizeStringList(selectedTraining?.requiredInstitutions);
    const selectedTrainingAudience = normalizeAudienceList(selectedTraining?.targetAudience);
    const currentUserInstitutionId = getEntityId(user.institutionId);
    const filteredNominations = nominations.filter(nom => {
      const searchLower = (searchTerm || '').toLowerCase();
      const pName = getParticipantName(nom.participantId).toLowerCase();
      const tName = getTrainingName(nom.trainingId).toLowerCase();
      const iName = getInstitutionName(nom.institutionId).toLowerCase();
      
      const matchesSearch = pName.includes(searchLower) || tName.includes(searchLower) || iName.includes(searchLower);
      const matchesStatus = statusFilter === 'all' || getNominationDisplayStatus(nom.status) === statusFilter;
      
      // Safety check: ensure the nomination is relevant to the user's role/scope
      if (user.role === 'participant') {
        if (getEntityId(nom.participantId) !== user.id) return false;
      } else if (user.role === 'institutional_admin') {
        const nomParticipant = getParticipantRecord(nom.participantId);
        if (nomParticipant && getEntityId(nomParticipant.institutionId) !== currentUserInstitutionId) {
          if (getEntityId(nom.nominatedBy) !== user.id) return false;
        }
      }
      
      return matchesSearch && matchesStatus;
    });

    // Dynamic summary based on what's visible to the current user
    const nominationSummary = {
      total: filteredNominations.length,
      assigned: filteredNominations.filter((nomination) => getNominationDisplayStatus(nomination.status) === 'assigned').length,
      attended: filteredNominations.filter((nomination) => nomination.status === 'attended' || (nomination as any).attended === true).length,
      rejected: filteredNominations.filter((nomination) => nomination.status === 'rejected').length,
    };

    const trainingAssignmentCounts = nominations.reduce<Record<string, number>>((acc, nomination) => {
      if (nomination.status === 'rejected') return acc;

      const trainingId = getEntityId(nomination.trainingId);
      if (!trainingId) return acc;

      acc[trainingId] = (acc[trainingId] || 0) + 1;
      return acc;
    }, {});

    const selectableTrainings = trainings.filter((training) => {
      if (training.status === 'cancelled' || training.status === 'completed') return false;

      if (user.role === 'institutional_admin' && currentUserInstitutionId) {
        const trainingInstitutionIds = normalizeStringList(training.requiredInstitutions);
        if (trainingInstitutionIds.length > 0 && !trainingInstitutionIds.includes(currentUserInstitutionId)) {
          return false;
        }
      }

      if (training.date && training.startTime) {
        try {
          if (new Date() >= getTrainingStartDateTime(training)) {
            return false;
          }
        } catch (e) {
          // Ignore date parsing errors and just show it
        }
      }

      return true;
    }).sort((a, b) => {
      return getTrainingSortTimestamp(a) - getTrainingSortTimestamp(b);
    });

    const normalizedTrainingSearch = normalizeTrainingMatchValue(trainingSearchTerm);
    const matchingSelectableTrainings = selectableTrainings.filter((training) => {
      const matchesDate = !trainingDateFilter || getTrainingDateInputValue(training.date) === trainingDateFilter;
      if (!matchesDate) return false;

      if (!normalizedTrainingSearch) return true;

      const searchText = [
        training.title,
        training.program,
        training.description,
        getTrainingSearchableDateText(training.date),
        formatSessionWindow(training.startTime, training.endTime, sessionWindowFallback),
        ...normalizeAudienceList(training.targetAudience),
        ...normalizeStringList(training.requiredInstitutions).map((institutionId) => getInstitutionName(institutionId)),
      ].join(' ');

      return normalizeTrainingMatchValue(searchText).includes(normalizedTrainingSearch);
    });
    const selectedTrainingIsSelectable = Boolean(
      selectedTraining && selectableTrainings.some((training) => training.id === selectedTrainingId)
    );
    const selectedTrainingPinned = Boolean(
      selectedTrainingIsSelectable &&
      selectedTraining &&
      !matchingSelectableTrainings.some((training) => training.id === selectedTrainingId)
    );
    const filteredSelectableTrainings = matchingSelectableTrainings;

    const selectedTrainingNominations = nominations
      .filter((nomination) => getEntityId(nomination.trainingId) === selectedTrainingId)
      .sort((a, b) => new Date(b.nominatedAt || 0).getTime() - new Date(a.nominatedAt || 0).getTime());
    const selectedTrainingAssignedCount = trainingAssignmentCounts[selectedTrainingId] || 0;
    const selectedTrainingRemainingSeats = selectedTraining
      ? Math.max(0, selectedTraining.capacity - selectedTrainingAssignedCount)
      : 0;
    const selectedTrainingInstitutionNames = selectedTrainingInstitutionIds
      .map((institutionId) => institutions.find((institution) => institution.id === institutionId)?.name || '')
      .filter(Boolean);
    const selectedAudienceTokens = selectedTrainingAudience
      .map((audience) => normalizeTrainingMatchValue(audience))
      .filter(Boolean);
    const selectedTrainingExistingParticipantIds = new Set(
      selectedTrainingNominations
        .filter((nomination) => nomination.status !== 'rejected')
        .map((nomination) => getEntityId(nomination.participantId))
    );

    const eligibleParticipants = users.filter((participant) => {
      if (!selectedTraining) return false;

      const participantInstitutionId = getEntityId(participant.institutionId);
      const participantDesignation = normalizeTrainingMatchValue(participant.designation);

      if (user.role === 'institutional_admin' && participantInstitutionId !== currentUserInstitutionId) {
        return false;
      }

      const matchesInstitution =
        selectedTrainingInstitutionIds.length === 0 || 
        selectedTrainingInstitutionIds.includes(participantInstitutionId);
        
      const matchesAudience =
        selectedAudienceTokens.length === 0 || 
        (participantDesignation && selectedAudienceTokens.includes(participantDesignation));

      return matchesInstitution && matchesAudience;
    });

    const participantSearchLower = participantSearchTerm.trim().toLowerCase();
    const filteredEligibleParticipants = [...eligibleParticipants]
      .sort((first, second) => {
        const firstAssigned = selectedTrainingExistingParticipantIds.has(first.id);
        const secondAssigned = selectedTrainingExistingParticipantIds.has(second.id);
        const firstBusy = busyParticipantIds.includes(first.id);
        const secondBusy = busyParticipantIds.includes(second.id);

        const firstRank = firstAssigned ? 2 : firstBusy ? 1 : 0;
        const secondRank = secondAssigned ? 2 : secondBusy ? 1 : 0;

        if (firstRank !== secondRank) return firstRank - secondRank;
        return first.name.localeCompare(second.name);
      })
      .filter((participant) => {
        if (!participantSearchLower) return true;
        const searchFields = [
          participant.name,
          participant.designation,
          getInstitutionName(participant.institutionId),
          participant.department,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchFields.includes(participantSearchLower);
      });
    const readyParticipantsCount = filteredEligibleParticipants.filter(
      (participant) => !busyParticipantIds.includes(participant.id) && !selectedTrainingExistingParticipantIds.has(participant.id)
    ).length;

    const hasFilters = Boolean(searchTerm.trim()) || statusFilter !== 'all';
    const statusOptions = [
      { value: 'all', label: `${t('nominationsProps.all', { defaultValue: 'All' })} (${nominationSummary.total})` },
      { value: 'assigned', label: `${t('nominationsProps.assigned', { defaultValue: 'Assigned' })} (${nominationSummary.assigned})` },
      { value: 'attended', label: `${t('nominationsProps.attended', { defaultValue: 'Attended' })} (${nominationSummary.attended})` },
      { value: 'rejected', label: `${t('nominationsProps.rejected', { defaultValue: 'Rejected' })} (${nominationSummary.rejected})` },
    ];

    return (
      <div className="space-y-8 pb-20">
        <section className="rounded-[28px] border border-border bg-card/70 p-6 shadow-sm backdrop-blur-sm sm:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{t('nominationsProps.hubLabel', { defaultValue: 'Nomination Hub' })}</p>
              <h1 className="mt-3 flex items-center gap-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                <Users className="size-8 text-primary" />
                {t('nominationsProps.title')}
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
                {t('nominationsProps.pageIntro', { defaultValue: 'Review previous nominations, track approval progress, and nominate the right personnel without losing context.' })}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              {selectedNominationIds.length > 0 && user.role === 'master_admin' && (
                <Button
                  onClick={handleBulkApprove}
                  className="w-full font-medium bg-emerald-600 hover:bg-emerald-700 text-white sm:w-auto"
                  disabled={loading}
                >
                  {t('nominationsProps.bulkApprove', { count: selectedNominationIds.length })}
                </Button>
              )}
              {(user.role === 'program_officer' || user.role === 'master_admin' || user.role === 'medical_officer' || user.role === 'institutional_admin') && (
                <>
                  <Button
                    onClick={() => setShowNominateDialog(true)}
                    className="w-full gap-2 font-medium sm:w-auto"
                  >
                    <Sparkles className="size-4" />
                    {t('nominationsProps.nominatePersonnel')}
                  </Button>
                  {(user.role === 'medical_officer' || user.role === 'institutional_admin') && (
                    <Button
                      onClick={() => setShowAddParticipantDialog(true)}
                      variant="outline"
                      className="w-full gap-2 font-medium border-primary/20 hover:bg-primary/5 text-primary sm:w-auto"
                    >
                      <UserPlus className="size-4" />
                      {t('nominationsProps.addParticipantManually', { defaultValue: '+ Add Participant' })}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <Card className="border-border bg-background/80">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{t('nominationsProps.summaryTotal', { defaultValue: 'Total nominations' })}</p>
                <p className="mt-3 text-3xl font-semibold text-foreground">{nominationSummary.total}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('nominationsProps.summaryTotalDesc', { defaultValue: 'All historical nomination records visible to your role.' })}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-background/80">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{t('nominationsProps.summaryAssigned', { defaultValue: 'Assigned personnel' })}</p>
                <p className="mt-3 text-3xl font-semibold text-emerald-400">{nominationSummary.assigned}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('nominationsProps.summaryAssignedDesc', { defaultValue: 'Personnel you have already nominated for upcoming sessions.' })}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-background/80">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{t('nominationsProps.summaryAttended', { defaultValue: 'Attended' })}</p>
                <p className="mt-3 text-3xl font-semibold text-sky-400">{nominationSummary.attended}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('nominationsProps.summaryAttendedDesc', { defaultValue: 'Nominees who completed attendance for their training.' })}</p>
              </CardContent>
            </Card>
            <Card className="border-border bg-background/80">
              <CardContent className="p-5">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">{t('nominationsProps.summaryRejected', { defaultValue: 'Rejected' })}</p>
                <p className="mt-3 text-3xl font-semibold text-destructive">{nominationSummary.rejected}</p>
                <p className="mt-2 text-sm text-muted-foreground">{t('nominationsProps.summaryRejectedDesc', { defaultValue: 'Entries that need replacement or follow-up.' })}</p>
              </CardContent>
            </Card>
          </div>
        </section>

        <Card className="border-border bg-card/70 backdrop-blur-sm">
          <CardContent className="space-y-5 p-4 sm:p-5">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 size-4 text-primary opacity-50" />
              <Input
                placeholder={t('nominationsProps.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-11 pl-10 bg-background"
              />
            </div>

            <div>
              <FilterChips
                options={statusOptions}
                selectedValue={statusFilter}
                onChange={(value) => setStatusFilter(value as 'all' | NominationDisplayStatus)}
              />
            </div>

            <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                {t('nominationsProps.shownCount', {
                  count: filteredNominations.length,
                  defaultValue: `${filteredNominations.length} nominations shown`,
                })}
                {hasFilters ? ` ${t('nominationsProps.shownCountFiltered', { defaultValue: 'for the current filter set.' })}` : '.'}
              </p>
              {user.role === 'master_admin' && nominations.some((nom) => nom.status === 'nominated') && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="selectAllNominations"
                    checked={
                      filteredNominations.filter((nom) => nom.status === 'nominated').length > 0 &&
                      selectedNominationIds.length === filteredNominations.filter((nom) => nom.status === 'nominated').length
                    }
                    onCheckedChange={() => toggleSelectAll(filteredNominations)}
                  />
                  <label htmlFor="selectAllNominations" className="cursor-pointer font-medium leading-none">
                    {t('nominationsProps.selectAll')}
                  </label>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {nominationSummary.total === 0 ? (
            <Card className="border-dashed border-border bg-card/50">
              <CardContent className="flex flex-col items-center px-6 py-20 text-center">
                <Users className="mb-4 size-12 text-primary/60" />
                <h2 className="text-2xl font-semibold text-foreground">{t('nominationsProps.noNominationsYetTitle', { defaultValue: 'No nominations yet' })}</h2>
                <p className="mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
                  {t('nominationsProps.noNominationsYetDesc', { defaultValue: 'Start by choosing a training session and assigning eligible personnel. Once nominations are created, this page will keep the full history in one place.' })}
                </p>
                {(user.role === 'program_officer' || user.role === 'master_admin' || user.role === 'medical_officer' || user.role === 'institutional_admin') && (
                  <Button onClick={() => setShowNominateDialog(true)} className="mt-6 gap-2">
                    <Sparkles className="size-4" />
                    {t('nominationsProps.nominatePersonnel')}
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : filteredNominations.length === 0 ? (
            <Card className="border-dashed border-border bg-card/50">
              <CardContent className="px-6 py-16 text-center">
                <Search className="mx-auto mb-4 size-10 text-muted-foreground/60" />
                <h2 className="text-xl font-semibold text-foreground">{t('nominationsProps.noFilterResultsTitle', { defaultValue: 'No nominations match these filters' })}</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  {t('nominationsProps.noFilterResultsDesc', { defaultValue: 'Try a different search term or switch the status filter to see more records.' })}
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredNominations.map((nomination) => {
              const linkedTraining = (nomination as any).training || getTrainingRecord(nomination.trainingId);
              const participant = getParticipantRecord(nomination.participantId);

              return (
                <Card key={nomination.id} className="overflow-hidden border-border bg-card/70 transition-all hover:border-primary/20 hover:bg-card/90">
                  <CardContent className="p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="flex min-w-0 gap-4">
                        {user.role === 'master_admin' && nomination.status === 'nominated' && (
                          <div className="pt-1">
                            <Checkbox
                              checked={selectedNominationIds.includes(nomination.id)}
                              onCheckedChange={() => toggleNominationSelection(nomination.id)}
                            />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <h3 className="truncate text-lg font-semibold text-foreground">{getParticipantName(nomination.participantId)}</h3>
                              <p className="mt-1 text-sm text-muted-foreground">
                                {participant?.designation || t('nominationsProps.personnelFallback', { defaultValue: 'Personnel' })} • {getInstitutionName(nomination.institutionId)}
                              </p>
                            </div>
                            <Badge className={`w-fit border font-medium capitalize ${getNominationStatusClass(nomination.status)}`}>
                              {getNominationDisplayLabel(nomination.status, t)}
                            </Badge>
                          </div>

                          <div className="mt-4 grid gap-3 md:grid-cols-3">
                            <div className="rounded-xl border border-border bg-background/80 p-4">
                              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                <Briefcase className="size-3.5" />
                                {t('nominationsProps.training')}
                              </p>
                              <p className="mt-3 text-sm font-medium text-foreground">{getTrainingName(nomination.trainingId)}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/80 p-4">
                              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                <CalendarDays className="size-3.5" />
                                {t('nominationsProps.scheduledFor')}
                              </p>
                              <p className="mt-3 text-sm font-medium text-foreground">
                                {linkedTraining?.date ? safeFormatDate(linkedTraining.date, 'MMM dd, yyyy') : t('nominationsProps.dateNotAvailable', { defaultValue: 'Date not available' })}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">{formatSessionWindow(linkedTraining?.startTime, linkedTraining?.endTime, sessionWindowFallback)}</p>
                            </div>
                            <div className="rounded-xl border border-border bg-background/80 p-4">
                              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                                <Clock className="size-3.5" />
                                {t('nominationsProps.nominatedOn', { defaultValue: 'Nominated on' })}
                              </p>
                              <p className="mt-3 text-sm font-medium text-foreground">{safeFormatDate(nomination.nominatedAt, 'MMM dd, yyyy')}</p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {nomination.approvedAt
                                  ? t('nominationsProps.reviewedOn', {
                                      date: safeFormatDate(nomination.approvedAt, 'MMM dd, yyyy'),
                                      defaultValue: `Reviewed ${safeFormatDate(nomination.approvedAt, 'MMM dd, yyyy')}`,
                                    })
                                  : t('nominationsProps.awaitingReview', { defaultValue: 'Awaiting review' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {user.role === 'master_admin' && nomination.status === 'nominated' && (
                      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                        <Button
                          size="sm"
                          onClick={() => handleApprove(nomination)}
                          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                        >
                          {t('nominationsProps.approve')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRejectClick(nomination)}
                          className="flex-1 font-medium"
                        >
                          {t('nominationsProps.reject')}
                        </Button>
                      </div>
                    )}

                    {nomination.rejectionReason && (
                      <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
                        <span className="font-medium">{t('nominationsProps.reason')}:</span> {nomination.rejectionReason}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Dialogs - Conditional rendering to avoid mobile portal issues */}
        <Dialog open={showRejectDialog && Boolean(selectedNomination)} onOpenChange={setShowRejectDialog}>
          <DialogContent className="border-border bg-background text-foreground sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('nominationsProps.rejectNomination')}</DialogTitle>
              <DialogDescription>
                {t('nominationsProps.rejectNominationDesc', { defaultValue: 'Provide a reason so the personnel can understand why this nomination was rejected.' })}
              </DialogDescription>
            </DialogHeader>
            <Textarea
              className="min-h-32"
              placeholder={t('nominationsProps.reasonPlaceholder')}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
            <DialogFooter>
              <Button onClick={() => setShowRejectDialog(false)} variant="outline">
                {t('nominationsProps.cancel')}
              </Button>
              <Button onClick={handleRejectConfirm} variant="destructive">
                {t('nominationsProps.confirmRejection')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showNominateDialog} onOpenChange={setShowNominateDialog}>
          <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden border-border bg-background p-0 text-foreground sm:max-w-5xl xl:max-w-6xl">
            <DialogHeader className="border-b border-border px-6 py-5 sm:px-8">
              <DialogTitle>{t('nominationsProps.nominatePersonnel')}</DialogTitle>
              <DialogDescription>
                {t('nominationsProps.nominateDialogDesc', { defaultValue: 'Choose a training session, review who has already been nominated, then select the next eligible personnel.' })}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-6 sm:px-8">
              <div className="space-y-6">
                <div>
                  <Label className="mb-2 block text-sm font-medium text-foreground">{t('nominationsProps.selectTraining')}</Label>
                  <div className="rounded-2xl border border-border bg-card/70 p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                      <div className="relative flex-1">
                        <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-primary/60" />
                        <Input
                          value={trainingSearchTerm}
                          onChange={(e) => setTrainingSearchTerm(e.target.value)}
                          placeholder={t('nominationsProps.trainingSearchPlaceholder', {
                            defaultValue: 'Search title, program, institution, or audience',
                          })}
                          className="h-11 rounded-xl bg-background pl-10"
                        />
                      </div>
                      <div className="relative w-full lg:w-[210px]">
                        <CalendarDays className="pointer-events-none absolute left-3 top-3.5 size-4 text-primary/60" />
                        <Input
                          type="date"
                          value={trainingDateFilter}
                          onChange={(e) => setTrainingDateFilter(e.target.value)}
                          className="h-11 rounded-xl bg-background pl-10"
                        />
                      </div>
                      {(trainingSearchTerm || trainingDateFilter) && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="lg:self-stretch"
                          onClick={() => {
                            setTrainingSearchTerm('');
                            setTrainingDateFilter('');
                          }}
                        >
                          {t('nominationsProps.clearTrainingFilters', { defaultValue: 'Clear filters' })}
                        </Button>
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {t('nominationsProps.sessionsShown', {
                          shown: filteredSelectableTrainings.length,
                          total: selectableTrainings.length,
                          defaultValue: `${filteredSelectableTrainings.length} of ${selectableTrainings.length} session(s) shown`,
                        })}
                      </p>
                      {selectedTrainingPinned && (
                        <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                          {t('nominationsProps.selectedTrainingPinned', {
                            defaultValue: 'Selected session pinned outside current filters',
                          })}
                        </Badge>
                      )}
                    </div>

                    <div className="mt-4 grid max-h-[280px] gap-3 overflow-y-auto pr-1 custom-scrollbar">
                      {filteredSelectableTrainings.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-6 text-sm text-muted-foreground">
                          {selectableTrainings.length === 0
                            ? t('nominationsProps.noTrainingsAvailable', {
                              defaultValue: 'No upcoming training sessions are currently available for nomination.',
                            })
                            : t('nominationsProps.noTrainingMatches', {
                              defaultValue: 'No training sessions matched your search or date filter.',
                            })}
                        </div>
                      ) : (
                        filteredSelectableTrainings.map((training) => {
                          const trainingId = training.id;
                          const trainingAssignedCount = trainingAssignmentCounts[trainingId] || 0;
                          const trainingRemainingSeats = Math.max(0, training.capacity - trainingAssignedCount);
                          const isSelected = trainingId === selectedTrainingId;
                          const trainingInstitutions = normalizeStringList(training.requiredInstitutions)
                            .map((institutionId) => getInstitutionName(institutionId))
                            .filter(Boolean);
                          const trainingAudience = normalizeAudienceList(training.targetAudience);

                          return (
                            <button
                              key={trainingId}
                              type="button"
                              onClick={() => handleTrainingSelection(trainingId)}
                              className={`rounded-xl border p-4 text-left transition-all ${
                                isSelected
                                  ? 'border-primary bg-primary/5 shadow-sm'
                                  : 'border-border bg-background hover:border-primary/30'
                              }`}
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-sm font-semibold text-foreground">{training.title}</p>
                                    {isSelected && (
                                      <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                                        {t('nominationsProps.selectedTrainingTag', { defaultValue: 'Selected' })}
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {safeFormatDate(training.date, 'MMM dd, yyyy')} • {formatSessionWindow(training.startTime, training.endTime, sessionWindowFallback)}
                                  </p>
                                  {(training.program || training.description) && (
                                    <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                                      {[training.program, training.description].filter(Boolean).join(' • ')}
                                    </p>
                                  )}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                                    {t('nominationsProps.seatsLeft', { count: trainingRemainingSeats, defaultValue: `${trainingRemainingSeats} seats left` })}
                                  </Badge>
                                  <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                                    {t('nominationsProps.assignedCount', { count: trainingAssignedCount, defaultValue: `${trainingAssignedCount} assigned` })}
                                  </Badge>
                                </div>
                              </div>

                              <div className="mt-3 flex flex-wrap gap-2">
                                {trainingAudience.slice(0, 2).map((audience) => (
                                  <Badge
                                    key={`${trainingId}-audience-${audience}`}
                                    variant="outline"
                                    className="max-w-full whitespace-normal break-words border-primary/20 bg-primary/5 text-primary"
                                  >
                                    {audience}
                                  </Badge>
                                ))}
                                {trainingInstitutions.slice(0, 2).map((institutionName) => (
                                  <Badge
                                    key={`${trainingId}-institution-${institutionName}`}
                                    variant="outline"
                                    className="max-w-full whitespace-normal break-words border-border bg-background text-foreground"
                                  >
                                    {institutionName}
                                  </Badge>
                                ))}
                                {trainingAudience.length > 2 && (
                                  <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                                    {t('nominationsProps.extraAudience', { count: trainingAudience.length - 2, defaultValue: `+${trainingAudience.length - 2} audience` })}
                                  </Badge>
                                )}
                                {trainingInstitutions.length > 2 && (
                                  <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                                    {t('nominationsProps.extraInstitutions', { count: trainingInstitutions.length - 2, defaultValue: `+${trainingInstitutions.length - 2} institutions` })}
                                  </Badge>
                                )}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>

                {selectedTraining && (
                  <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,0.9fr)]">
                    <Card className="border-border bg-card/70 shadow-sm">
                      <CardContent className="p-5">
                        <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{t('nominationsProps.selectedTraining', { defaultValue: 'Selected training' })}</p>
                        <div className="mt-3 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                          <div>
                            <h3 className="text-xl font-semibold text-foreground">{selectedTraining.title}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {t('nominationsProps.selectedTrainingDesc', { defaultValue: 'Review session details before choosing personnel.' })}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                              {t('nominationsProps.seatsLeft', { count: selectedTrainingRemainingSeats, defaultValue: `${selectedTrainingRemainingSeats} seats left` })}
                            </Badge>
                            <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                              {t('nominationsProps.alreadyAssignedCount', { count: selectedTrainingAssignedCount, defaultValue: `${selectedTrainingAssignedCount} already assigned` })}
                            </Badge>
                          </div>
                        </div>

                        <div className="mt-5 grid gap-3 md:grid-cols-2 2xl:grid-cols-4">
                          <div className="rounded-xl border border-border bg-background/80 p-4">
                            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                              <CalendarDays className="size-3.5" />
                              {t('nominationsProps.schedule', { defaultValue: 'Schedule' })}
                            </p>
                            <p className="mt-3 text-sm font-medium text-foreground">{safeFormatDate(selectedTraining.date, 'MMM dd, yyyy')}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{formatSessionWindow(selectedTraining.startTime, selectedTraining.endTime, sessionWindowFallback)}</p>
                          </div>
                          <div className="rounded-xl border border-border bg-background/80 p-4">
                            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                              <Users className="size-3.5" />
                              {t('nominationsProps.capacity', { defaultValue: 'Capacity' })}
                            </p>
                            <p className="mt-3 text-sm font-medium text-foreground">
                              {t('nominationsProps.capacitySummary', {
                                assigned: selectedTrainingAssignedCount,
                                total: selectedTraining.capacity,
                                defaultValue: `${selectedTrainingAssignedCount} assigned / ${selectedTraining.capacity} total`,
                              })}
                            </p>
                            <p className="mt-1 text-xs text-muted-foreground">{t('nominationsProps.remainingSeats', { count: selectedTrainingRemainingSeats, defaultValue: `${selectedTrainingRemainingSeats} seat(s) remaining` })}</p>
                          </div>
                          <div className="rounded-xl border border-border bg-background/80 p-4">
                            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                              <Briefcase className="size-3.5" />
                              {t('nominationsProps.targetAudience', { defaultValue: 'Target audience' })}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {selectedTrainingAudience.length > 0 ? (
                                selectedTrainingAudience.slice(0, 4).map((audience) => (
                                  <Badge
                                    key={audience}
                                    variant="outline"
                                    className="max-w-full whitespace-normal break-words border-primary/20 bg-primary/5 py-1 text-left text-primary"
                                    title={audience}
                                  >
                                    {audience}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">{t('nominationsProps.openToAllDesignations', { defaultValue: 'Open to all designations' })}</span>
                              )}
                              {selectedTrainingAudience.length > 4 && (
                                <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                                  {t('nominationsProps.moreCount', { count: selectedTrainingAudience.length - 4, defaultValue: `+${selectedTrainingAudience.length - 4} more` })}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="rounded-xl border border-border bg-background/80 p-4">
                            <p className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                              <Building2 className="size-3.5" />
                              {t('nominationsProps.institutions', { defaultValue: 'Institutions' })}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {selectedTrainingInstitutionNames.length > 0 ? (
                                selectedTrainingInstitutionNames.slice(0, 3).map((institutionName) => (
                                  <Badge
                                    key={institutionName}
                                    variant="outline"
                                    className="max-w-full whitespace-normal break-words border-border bg-background py-1 text-left text-foreground"
                                    title={institutionName}
                                  >
                                    {institutionName}
                                  </Badge>
                                ))
                              ) : (
                                <span className="text-sm text-muted-foreground">{t('nominationsProps.openToAllInstitutions', { defaultValue: 'Open to all institutions' })}</span>
                              )}
                              {selectedTrainingInstitutionNames.length > 3 && (
                                <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                                  {t('nominationsProps.moreCount', { count: selectedTrainingInstitutionNames.length - 3, defaultValue: `+${selectedTrainingInstitutionNames.length - 3} more` })}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-border bg-card/70 shadow-sm">
                      <CardContent className="flex h-full flex-col p-5">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">{t('nominationsProps.previousNominations', { defaultValue: 'Previous nominations' })}</p>
                            <p className="mt-3 text-3xl font-semibold text-foreground">{selectedTrainingNominations.length}</p>
                            <p className="mt-1 text-sm text-muted-foreground">{t('nominationsProps.sessionRecords', { defaultValue: 'Existing records for this session.' })}</p>
                          </div>
                          <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                            {t('nominationsProps.latestFirst', { defaultValue: 'Latest first' })}
                          </Badge>
                        </div>

                        <div className="mt-4 flex-1 space-y-2 overflow-y-auto pr-1 custom-scrollbar max-h-[320px] xl:max-h-[420px]">
                          {selectedTrainingNominations.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-6 text-sm text-muted-foreground">
                              {t('nominationsProps.noPreviousNominations', { defaultValue: 'No previous nominations for this training yet.' })}
                            </div>
                          ) : (
                            selectedTrainingNominations.map((nomination) => (
                              <div key={nomination.id} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/80 px-3 py-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-foreground">{getParticipantName(nomination.participantId)}</p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    {safeFormatDate(nomination.nominatedAt, 'MMM dd, yyyy')}
                                  </p>
                                </div>
                                <Badge className={`border text-xs capitalize ${getNominationStatusClass(nomination.status)}`}>
                                  {getNominationDisplayLabel(nomination.status, t)}
                                </Badge>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>

              <Card className="border-border bg-card/70 shadow-sm">
                <CardContent className="p-5">
                <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <Label className="block text-sm font-medium text-foreground">
                    {t('nominationsProps.selectParticipants')} ({selectedParticipantIds.length})
                  </Label>
                  {selectedTraining && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      <Badge variant="outline" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                        {t('nominationsProps.readyCount', { count: readyParticipantsCount, defaultValue: `${readyParticipantsCount} ready` })}
                      </Badge>
                      <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                        {t('nominationsProps.busyCount', { count: busyParticipantIds.length, defaultValue: `${busyParticipantIds.length} busy` })}
                      </Badge>
                      <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                        {t('nominationsProps.alreadyAssignedCount', { count: selectedTrainingAssignedCount, defaultValue: `${selectedTrainingAssignedCount} already assigned` })}
                      </Badge>
                    </div>
                  )}
                </div>

                {selectedTraining && (
                  <div className="relative mb-3">
                    <Search className="absolute left-3 top-3.5 size-4 text-primary/60" />
                    <Input
                      value={participantSearchTerm}
                      onChange={(e) => setParticipantSearchTerm(e.target.value)}
                      placeholder={t('nominationsProps.participantSearchPlaceholder', { defaultValue: 'Search personnel by name, designation, or institution' })}
                      className="h-11 rounded-xl bg-background pl-10"
                    />
                  </div>
                )}

                <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1 custom-scrollbar xl:max-h-[420px]">
                  {!selectedTraining && (
                    <p className="text-sm text-muted-foreground">
                      {t('nominationsProps.selectTrainingFirst', { defaultValue: 'Select a training session to view eligible participants.' })}
                    </p>
                  )}
                  {selectedTraining && eligibleParticipants.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      {t('nominationsProps.noEligibleParticipants', { defaultValue: 'No participants match the selected institutions and target audience for this training.' })}
                    </p>
                  )}
                  {selectedTraining && eligibleParticipants.length > 0 && filteredEligibleParticipants.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('nominationsProps.noPersonnelSearchMatches', { defaultValue: 'No personnel matched your search.' })}</p>
                  )}
                  {filteredEligibleParticipants.map((participant) => {
                    const isBusy = busyParticipantIds.includes(participant.id);
                    const isAlreadyAssigned = selectedTrainingExistingParticipantIds.has(participant.id);
                    const isDisabled = isBusy || isAlreadyAssigned;
                    const isSelected = selectedParticipantIds.includes(participant.id);

                    return (
                      <div
                        key={participant.id}
                        onClick={() => !isDisabled && toggleParticipantSelection(participant.id)}
                        className={`rounded-xl border p-3 transition-all flex items-center justify-between gap-3 ${isDisabled
                          ? 'bg-muted/40 border-border opacity-60 cursor-not-allowed'
                          : isSelected
                            ? 'bg-primary/5 border-primary shadow-sm cursor-pointer'
                            : 'bg-background border-border cursor-pointer hover:border-primary/30'
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <Checkbox
                            checked={isSelected}
                            disabled={isDisabled}
                            className={isDisabled ? 'opacity-50' : ''}
                          />
                          <div>
                            <p className={`text-sm font-medium ${isDisabled ? 'text-muted-foreground' : 'text-foreground'}`}>{participant.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {participant.designation || t('nominationsProps.participantLabel', { defaultValue: 'Participant' })} • {getInstitutionName(participant.institutionId)}
                            </p>
                          </div>
                        </div>

                        {isAlreadyAssigned ? (
                          <Badge variant="secondary" className="text-xs bg-primary/20 text-primary hover:bg-primary/20">
                            {t('nominationsProps.alreadyAssigned')}
                          </Badge>
                        ) : isBusy ? (
                          <Badge variant="secondary" className="text-xs">
                            {t('nominationsProps.busy')}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                            {t('nominationsProps.ready', { defaultValue: 'Ready' })}
                          </Badge>
                        )}
                      </div>
                    );
                  })}
                </div>
                </CardContent>
              </Card>
            </div>

            <DialogFooter className="border-t border-border px-6 py-4 sm:px-8">
              <Button onClick={() => setShowNominateDialog(false)} variant="outline">
                {t('nominationsProps.cancel')}
              </Button>
              <Button
                onClick={handleNominate}
                disabled={!selectedTrainingId || selectedParticipantIds.length === 0 || loading}
              >
                {loading
                  ? t('nominationsProps.submitting')
                  : `${t('nominationsProps.submitNominations')} (${selectedParticipantIds.length})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={showAddParticipantDialog} onOpenChange={setShowAddParticipantDialog}>
          <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden border-border bg-background text-foreground sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t('nominationsProps.addNewPersonnel', { defaultValue: 'Add New Personnel' })}</DialogTitle>
              <DialogDescription>
                {t('nominationsProps.addNewPersonnelDesc', { defaultValue: 'Add a participant manually when they are not yet available in the personnel list.' })}
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
              <div>
                <Label className="text-sm font-medium text-foreground mb-1 block">{t('nominationsProps.fullName', { defaultValue: 'Full Name *' })}</Label>
                <Input
                  placeholder={t('nominationsProps.fullNamePlaceholder', { defaultValue: 'e.g. Dr. John Doe' })}
                  value={newParticipant.name}
                  onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground mb-1 block">{t('nominationsProps.emailAddress', { defaultValue: 'Email Address *' })}</Label>
                <Input
                  type="email"
                  placeholder={t('nominationsProps.emailPlaceholder', { defaultValue: 'john@example.com' })}
                  value={newParticipant.email}
                  onChange={(e) => setNewParticipant({ ...newParticipant, email: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground mb-1 block">{t('nominationsProps.phoneNumber', { defaultValue: 'Phone Number' })}</Label>
                <Input
                  placeholder="9876543210"
                  value={newParticipant.phone}
                  onChange={(e) => setNewParticipant({ ...newParticipant, phone: normalizePhoneNumber(e.target.value) })}
                  inputMode="numeric"
                  maxLength={10}
                  pattern="\d{10}"
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground mb-1 block">{t('nominationsProps.designation', { defaultValue: 'Designation' })}</Label>
                <Input
                  placeholder={t('nominationsProps.designationPlaceholder', { defaultValue: 'e.g. Senior Medical Officer' })}
                  value={newParticipant.designation}
                  onChange={(e) => setNewParticipant({ ...newParticipant, designation: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-sm font-medium text-foreground mb-1 block">{t('nominationsProps.department', { defaultValue: 'Department' })}</Label>
                <Input
                  placeholder={t('nominationsProps.departmentPlaceholder', { defaultValue: 'e.g. Cardiology' })}
                  value={newParticipant.department}
                  onChange={(e) => setNewParticipant({ ...newParticipant, department: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="border-t border-border pt-6">
              <Button onClick={() => setShowAddParticipantDialog(false)} variant="outline">
                {t('nominationsProps.cancel')}
              </Button>
              <Button
                onClick={handleManualAddSubmit}
                disabled={!newParticipant.name || !newParticipant.email || loading}
              >
                {loading ? t('nominationsProps.saving', { defaultValue: 'Saving...' }) : t('nominationsProps.saveParticipant', { defaultValue: 'Save Participant' })}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  } catch (err: any) {
    return (
      <div className="p-8 text-center bg-destructive/5 m-6 rounded-xl border border-destructive/20">
        <XCircle className="size-12 mx-auto mb-4 text-destructive" />
        <h2 className="text-lg font-semibold text-foreground">{t('nominationsProps.errorLoading')}</h2>
        <p className="text-sm mt-2 text-muted-foreground">{err?.message || t('nominationsProps.unexpectedError')}</p>
        <Button onClick={fetchData} variant="outline" className="mt-6">{t('nominationsProps.retry')}</Button>
      </div>
    );
  }
};

export default Nominations;
