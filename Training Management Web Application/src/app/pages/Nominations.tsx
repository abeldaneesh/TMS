import React, { useEffect, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { nominationsApi, trainingsApi, usersApi, institutionsApi } from '../../services/api';
import { Nomination, Training, User, Institution } from '../../types';
import { CheckCircle, XCircle, Clock, Users, Search, Check, Loader2 } from 'lucide-react';
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

const Nominations: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [nominations, setNominations] = useState<Nomination[]>([]);
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNomination, setSelectedNomination] = useState<Nomination | null>(null);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showNominateDialog, setShowNominateDialog] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState('');
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>([]);
  const [busyParticipantIds, setBusyParticipantIds] = useState<string[]>([]);
  const [barebonesMode, setBarebonesMode] = useState(false);

  // Helper functions with extra safety, memoized with useCallback
  const getTrainingName = useCallback((trainingId: any) => {
    const id = typeof trainingId === 'object' ? trainingId?.id || trainingId?._id : trainingId;
    return trainings.find(t => t.id === id || (t as any)._id === id)?.title || 'Unknown Training';
  }, [trainings]);

  const getParticipantName = useCallback((participantId: any) => {
    const id = typeof participantId === 'object' ? participantId?.id || participantId?._id : participantId;
    return users.find(u => u.id === id || (u as any)._id === id)?.name || 'Unknown Personnel';
  }, [users]);

  const getInstitutionName = useCallback((institutionId: any) => {
    const id = typeof institutionId === 'object' ? institutionId?.id || institutionId?._id : institutionId;
    return institutions.find(i => i.id === id || (i as any)._id === id)?.name || 'Unknown Sector';
  }, [institutions]);

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
          user.role === 'institutional_admin' && user.institutionId
            ? { institutionId: user.institutionId }
            : user.role === 'participant'
              ? { participantId: user.id }
              : {}
        ),
        trainingsApi.getAll(
          user.role === 'program_officer' ? { createdById: user.id } : {}
        ),
        usersApi.getAll(),
        institutionsApi.getAll(),
      ]);

      console.log('[NOMINATIONS_SYNC] Fetch complete:', {
        nomCount: Array.isArray(nominationsData) ? nominationsData.length : 'ERR',
        userCount: Array.isArray(usersData) ? usersData.length : 'ERR'
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
    setSelectedParticipantIds(prev =>
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleNominate = async () => {
    if (!user || !selectedTrainingId || selectedParticipantIds.length === 0) return;
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
    const filteredNominations = nominations.filter(nom => {
      const searchLower = (searchTerm || '').toLowerCase();
      const pName = getParticipantName(nom.participantId).toLowerCase();
      const tName = getTrainingName(nom.trainingId).toLowerCase();
      const iName = getInstitutionName(nom.institutionId).toLowerCase();
      return pName.includes(searchLower) || tName.includes(searchLower) || iName.includes(searchLower);
    });

    return (
      <div className="space-y-6 pb-20">
        {/* Toggle for Emergency View (Useful for mobile debugging) */}
        <button
          onClick={() => setBarebonesMode(true)}
          className="fixed bottom-24 right-4 z-50 p-2 bg-secondary/10 text-secondary-foreground text-xs rounded-lg border border-border shadow-sm font-medium"
        >
          Debug View
        </button>

        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-2xl font-semibold text-foreground flex items-center gap-3">
            <Users className="size-6 text-primary" />
            Nominations
          </h1>
          {(user.role === 'program_officer' || user.role === 'master_admin') && (
            <Button
              onClick={() => setShowNominateDialog(true)}
              className="w-full md:w-auto font-medium"
            >
              {t('nominationsProps.nominatePersonnel')}
            </Button>
          )}
        </div>

        <Card className="glass">
          <CardContent className="p-3">
            <div className="relative">
              <Search className="absolute left-3 top-3.5 size-4 text-primary opacity-40" />
              <Input
                placeholder={t('nominationsProps.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {filteredNominations.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              {t('nominationsProps.noNominations')}
            </div>
          ) : (
            filteredNominations.map((nomination) => (
              <Card key={nomination.id} className="glass overflow-hidden border-white/5 hover:border-primary/20 transition-all">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">{getParticipantName(nomination.participantId)}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t('nominationsProps.institution')}: {getInstitutionName(nomination.institutionId)}
                      </p>
                    </div>
                    <Badge className={`font-medium capitalize ${nomination.status === 'approved' ? 'bg-emerald-100 text-emerald-700' :
                      nomination.status === 'rejected' ? 'bg-destructive/10 text-destructive' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                      {t(`common.statuses.${nomination.status}`, { defaultValue: nomination.status })}
                    </Badge>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/50 space-y-1">
                    <p className="font-semibold text-primary">
                      {t('nominationsProps.training')}: {getTrainingName(nomination.trainingId)}
                    </p>
                    {(nomination as any).training?.date && (
                      <p className="text-sm text-muted-foreground">
                        {t('nominationsProps.scheduledFor')}: {safeFormatDate((nomination as any).training.date)}
                      </p>
                    )}
                  </div>

                  {user.role === 'master_admin' && nomination.status === 'nominated' && (
                    <div className="flex gap-2 mt-4">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(nomination)}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      >
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRejectClick(nomination)}
                        className="flex-1 font-medium"
                      >
                        Reject
                      </Button>
                    </div>
                  )}

                  {nomination.rejectionReason && (
                    <p className="mt-3 p-3 bg-destructive/10 text-destructive text-sm rounded-md">
                      {t('nominationsProps.reason')}: {nomination.rejectionReason}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Dialogs - Conditional rendering to avoid mobile portal issues */}
        {showRejectDialog && selectedNomination && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <div className="bg-background border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl">
              <h2 className="text-xl font-semibold mb-4">{t('nominationsProps.rejectNomination')}</h2>
              <textarea
                className="w-full bg-background border border-border rounded-lg p-3 text-sm mb-4 h-32 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder={t('nominationsProps.reasonPlaceholder')}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
              />
              <div className="flex gap-3">
                <Button onClick={() => setShowRejectDialog(false)} variant="outline" className="flex-1">{t('nominationsProps.cancel')}</Button>
                <Button onClick={handleRejectConfirm} variant="destructive" className="flex-1">{t('nominationsProps.confirmRejection')}</Button>
              </div>
            </div>
          </div>
        )}

        {showNominateDialog && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-hidden">
            <div className="bg-background border border-border rounded-xl w-full max-w-lg p-6 shadow-xl max-h-[90vh] flex flex-col">
              <h2 className="text-xl font-semibold mb-6">{t('nominationsProps.nominatePersonnel')}</h2>

              <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">{t('nominationsProps.selectTraining')}</Label>
                  <select
                    className="w-full bg-background border border-input focus:ring-2 focus:ring-primary/50 rounded-lg p-2.5 text-sm"
                    value={selectedTrainingId}
                    onChange={(e) => setSelectedTrainingId(e.target.value)}
                  >
                    <option value="">{t('nominationsProps.selectTrainingPlaceholder')}</option>
                    {trainings.filter(t => {
                      if (t.status === 'cancelled' || t.status === 'completed') return false;

                      // Also filter out if it's past the start time of the training
                      if (t.date && t.startTime) {
                        try {
                          const trainingDateStr = typeof t.date === 'string' ? t.date : new Date(t.date).toISOString().split('T')[0];
                          const trainingDateTime = new Date(`${trainingDateStr}T${t.startTime}`);

                          if (!isNaN(trainingDateTime.getTime()) && new Date() > trainingDateTime) {
                            return false; // It has already started/passed
                          }
                        } catch (e) {
                          // Ignore date parsing errors and just show it
                        }
                      }

                      return true;
                    }).map(t => (
                      <option key={t.id} value={t.id}>{t.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">{t('nominationsProps.selectParticipants')} ({selectedParticipantIds.length})</Label>
                  <div className="space-y-2">
                    {users.filter(u => u.role === 'participant').map(u => {
                      const isBusy = busyParticipantIds.includes(u.id);
                      const isAlreadyAssigned = nominations.some(n => n.trainingId === selectedTrainingId && n.participantId === u.id && n.status !== 'rejected');
                      const isDisabled = isBusy || isAlreadyAssigned;
                      const isSelected = selectedParticipantIds.includes(u.id);

                      return (
                        <div
                          key={u.id}
                          onClick={() => !isDisabled && toggleParticipantSelection(u.id)}
                          className={`p-3 rounded-lg border transition-all flex items-center justify-between gap-3 ${isDisabled
                            ? 'bg-muted/50 border-border opacity-50 cursor-not-allowed'
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
                              <p className={`text-sm font-medium ${isDisabled ? 'text-muted-foreground' : 'text-foreground'}`}>{u.name}</p>
                              <p className="text-xs text-muted-foreground">{u.designation} • {getInstitutionName(u.institutionId)}</p>
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
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-border mt-6">
                <Button onClick={() => setShowNominateDialog(false)} variant="outline" className="flex-1">{t('nominationsProps.cancel')}</Button>
                <Button
                  onClick={handleNominate}
                  disabled={!selectedTrainingId || selectedParticipantIds.length === 0 || loading}
                  className="flex-1"
                >
                  {loading ? t('nominationsProps.submitting') : t('nominationsProps.submitNominations')}
                </Button>
              </div>
            </div>
          </div>
        )}
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
