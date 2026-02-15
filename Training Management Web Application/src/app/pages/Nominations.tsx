import React, { useEffect, useState } from 'react';
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

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
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

        console.log('Nominations diagnostic:', {
          nominationsCount: Array.isArray(nominationsData) ? nominationsData.length : 'NOT_ARRAY',
          trainingsCount: Array.isArray(trainingsData) ? trainingsData.length : 'NOT_ARRAY',
          usersCount: Array.isArray(usersData) ? usersData.length : 'NOT_ARRAY',
          institutionsCount: Array.isArray(institutionsData) ? institutionsData.length : 'NOT_ARRAY'
        });

        setNominations(Array.isArray(nominationsData) ? nominationsData : []);
        setTrainings(Array.isArray(trainingsData) ? trainingsData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);
        setInstitutions(Array.isArray(institutionsData) ? institutionsData : []);
      } catch (error) {
        console.error('Error fetching nominations data:', error);
        toast.error('Strategic synchronization failed. Some intelligence reports may be missing.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getTrainingName = (trainingId: string) => {
    if (!Array.isArray(trainings)) return 'Unknown Training';
    return trainings.find(t => t.id === trainingId)?.title || 'Unknown Training';
  };

  const getTraining = (trainingId: string) => {
    if (!Array.isArray(trainings)) return undefined;
    return trainings.find(t => t.id === trainingId);
  };

  const getParticipantName = (participantId: string) => {
    if (!Array.isArray(users)) return 'Unknown';
    return users.find(u => u.id === participantId)?.name || 'Unknown';
  };

  const getParticipant = (participantId: string) => {
    if (!Array.isArray(users)) return undefined;
    return users.find(u => u.id === participantId);
  };

  const getInstitutionName = (institutionId: string) => {
    if (!Array.isArray(institutions)) return 'Unknown';
    return institutions.find(i => i.id === institutionId)?.name || 'Unknown';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      nominated: 'bg-orange-500/10 text-orange-400 border border-orange-500/30',
      approved: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.1)]',
      rejected: 'bg-destructive/10 text-destructive border border-destructive/20',
      attended: 'bg-primary/10 text-primary border border-primary/30 shadow-[0_0_10px_rgba(0,236,255,0.1)]',
    };
    return variants[status as keyof typeof variants] || variants.nominated;
  };

  const handleApprove = async (nomination: Nomination) => {
    if (!user) return;

    try {
      await nominationsApi.approve(nomination.id, user.id);
      toast.success('Nomination approved successfully!');

      // Refresh nominations
      const updatedNominations = await nominationsApi.getAll(
        user.role === 'institutional_admin' && user.institutionId
          ? { institutionId: user.institutionId }
          : {}
      );
      setNominations(Array.isArray(updatedNominations) ? updatedNominations : []);
    } catch (error: any) {
      toast.error(error.message || 'Error approving nomination');
    }
  };

  const handleRejectClick = (nomination: Nomination) => {
    setSelectedNomination(nomination);
    setRejectionReason('');
    setShowRejectDialog(true);
  };

  const handleRejectConfirm = async () => {
    if (!user || !selectedNomination) return;

    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      await nominationsApi.reject(selectedNomination.id, user.id, rejectionReason);
      toast.success('Nomination rejected');

      // Refresh nominations
      const updatedNominations = await nominationsApi.getAll(
        user.role === 'institutional_admin' && user.institutionId
          ? { institutionId: user.institutionId }
          : {}
      );
      setNominations(Array.isArray(updatedNominations) ? updatedNominations : []);
      setShowRejectDialog(false);
      setSelectedNomination(null);
    } catch (error: any) {
      toast.error(error.message || 'Error rejecting nomination');
    }
  };

  const toggleParticipantSelection = (participantId: string) => {
    setSelectedParticipantIds(prev =>
      prev.includes(participantId)
        ? prev.filter(id => id !== participantId)
        : [...prev, participantId]
    );
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allParticipantIds = (users || [])
        .filter(u => u.role === 'participant')
        .map(u => u.id);
      setSelectedParticipantIds(allParticipantIds);
    } else {
      setSelectedParticipantIds([]);
    }
  };

  const handleNominate = async () => {
    if (!user || !selectedTrainingId || selectedParticipantIds.length === 0) return;

    setLoading(true);
    const results = {
      success: [] as string[],
      failed: [] as { name: string; reason: string }[],
    };

    try {
      // Process nominations one by one to collect individual results
      for (const participantId of selectedParticipantIds) {
        const participant = users.find(u => u.id === participantId);
        const participantName = participant?.name || participantId;

        if (!participant || !participant.institutionId) {
          results.failed.push({
            name: participantName,
            reason: 'No institution assigned',
          });
          continue;
        }

        try {
          await nominationsApi.create({
            trainingId: selectedTrainingId,
            participantId: participantId,
            institutionId: participant.institutionId,
            status: 'nominated' as const,
            nominatedBy: user.id,
          });
          results.success.push(participantName);
        } catch (error: any) {
          const reason = error.response?.data?.message || error.message || 'Unknown error';
          results.failed.push({
            name: participantName,
            reason: reason,
          });
        }
      }

      // Provide comprehensive feedback
      if (results.success.length > 0) {
        toast.success(`Successfully nominated ${results.success.length} participants`);
      }

      if (results.failed.length > 0) {
        // If there are failures, show them in a list
        const failureMessages = results.failed.map(f => `${f.name}: ${f.reason}`).join('\n');
        console.warn('Nomination failures:', failureMessages);

        toast.error(`${results.failed.length} nominations failed`, {
          description: results.failed.slice(0, 3).map(f => f.reason).join(', '),
          duration: 6000,
        });
      }

      if (results.success.length > 0) {
        setShowNominateDialog(false);
        setSelectedTrainingId('');
        setSelectedParticipantIds([]);

        // Refresh nominations
        const updatedNominations = await nominationsApi.getAll(
          user.role === 'institutional_admin' && user.institutionId
            ? { institutionId: user.institutionId }
            : {}
        );
        setNominations(Array.isArray(updatedNominations) ? updatedNominations : []);
      }
    } catch (error: any) {
      console.error('Fatal nomination error:', error);
      toast.error('A fatal error occurred during nomination');
    } finally {
      setLoading(false);
    }
  };

  const safeNominations = Array.isArray(nominations) ? nominations : [];
  const safeUsers = Array.isArray(users) ? users : [];
  const safeTrainings = Array.isArray(trainings) ? trainings : [];

  const filteredNominations = safeNominations.filter(nom => {
    if (!nom) return false;
    const participant = getParticipant(nom.participantId);
    const training = getTraining(nom.trainingId);
    const institution = getInstitutionName(nom.institutionId);

    const searchLower = (searchTerm || '').toLowerCase();

    // Safely check names and titles, defaulting to empty string if missing
    const participantMatch = (participant?.name || '').toLowerCase().includes(searchLower);
    const trainingMatch = (training?.title || '').toLowerCase().includes(searchLower);
    const institutionMatch = (institution || '').toLowerCase().includes(searchLower);

    return participantMatch || trainingMatch || institutionMatch;
  });

  const pendingNominations = filteredNominations.filter(n => n.status === 'nominated');
  const otherNominations = filteredNominations.filter(n => n.status !== 'nominated');

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative size-12 mb-4">
          <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
          <div className="absolute inset-0 border-r-2 border-secondary rounded-full animate-spin [animation-duration:1.5s]" />
        </div>
        <p className="text-primary font-mono text-xs tracking-widest animate-pulse">SYNCHRONIZING MISSION NOMINATIONS...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
        <Users className="size-12 mb-4 text-muted-foreground opacity-20" />
        <h3 className="text-lg font-bold text-muted-foreground tracking-widest uppercase">ACCESS DENIED</h3>
        <p className="text-muted-foreground text-[10px] font-mono uppercase mt-2">Authentication required for mission intel.</p>
      </div>
    );
  }

  const canManageNominations = user.role === 'program_officer' || user.role === 'master_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 md:gap-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-foreground flex items-center gap-3">
            <Users className="size-8 text-primary animate-pulse-glow" />
            NOMINATIONS
            <div className="h-1 w-20 bg-gradient-to-r from-primary to-transparent rounded-full ml-4 hidden md:block" />
          </h1>
          <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-widest opacity-70">
            {canManageNominations
              ? 'Mission Deployment & Personnel Orchestration'
              : 'Your Active Mission Assignments'}
          </p>
        </div>
        {canManageNominations && (
          <Button onClick={() => setShowNominateDialog(true)} className="bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 font-bold tracking-widest text-xs px-6 py-5 rounded-xl transition-all shadow-[0_0_15px_rgba(0,236,255,0.1)]">
            <Users className="size-4 mr-2" />
            NOMINATE PERSONNEL
          </Button>
        )}
      </div>

      {/* Search */}
      <Card className="glass neon-border">
        <CardContent className="p-3">
          <div className="relative">
            <Search className="absolute left-3 top-3.5 size-4 text-primary opacity-40" />
            <Input
              placeholder="FILTER BY PERSONNEL, MISSION, OR SECTOR..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-input/50 border-input focus:border-primary/50 text-foreground font-mono text-xs tracking-wider"
            />
          </div>
        </CardContent>
      </Card>

      {/* Pending Nominations */}
      {canManageNominations && pendingNominations.length > 0 && (
        <Card className="glass-card overflow-hidden">
          <CardHeader className="pb-4 border-b border-orange-500/20 bg-orange-500/5">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-orange-400 tracking-[0.2em] uppercase">
              <Clock className="size-4 animate-pulse" />
              AWAITING COMMAND CLEARANCE ({pendingNominations.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            {pendingNominations.map((nomination) => {
              const participant = getParticipant(nomination.participantId);
              const training = getTraining(nomination.trainingId);

              return (
                <div
                  key={nomination.id}
                  className="flex flex-col md:flex-row items-start md:items-center gap-4 p-5 rounded-2xl bg-orange-500/5 border border-orange-500/10 hover:border-orange-500/30 transition-all group"
                >
                  <div className="flex-shrink-0 size-12 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400 border border-orange-500/20 group-hover:scale-110 transition-transform">
                    <Users className="size-6" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-foreground tracking-wide text-lg">{participant?.name}</h4>
                    <p className="text-xs text-muted-foreground font-mono mt-1 opacity-80 uppercase">
                      RANK: {participant?.designation} • SECTOR: {getInstitutionName(nomination.institutionId)}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <div className="h-px flex-1 bg-border/50" />
                      <p className="text-[10px] font-bold text-primary tracking-widest uppercase">
                        ASSIGNED MISSION: {training?.title}
                      </p>
                      <div className="h-px flex-1 bg-border/50" />
                    </div>
                  </div>
                  {user?.role === 'master_admin' && (
                    <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(nomination)}
                        className="flex-1 md:flex-none bg-emerald-500 text-emerald-950 font-bold tracking-widest text-[10px] px-4 hover:bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.3)]"
                      >
                        <CheckCircle className="size-3 mr-1.5" />
                        APPROVE
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleRejectClick(nomination)}
                        className="flex-1 md:flex-none text-muted-foreground hover:text-destructive hover:bg-destructive/10 font-bold tracking-widest text-[10px]"
                      >
                        <XCircle className="size-3 mr-1.5" />
                        REJECT
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* All Nominations */}
      <Card className="glass-card overflow-hidden">
        <CardHeader className="pb-4 border-b border-primary/10 bg-primary/5">
          <CardTitle className="flex items-center gap-2 text-sm font-bold text-primary tracking-[0.2em] uppercase">
            <Users className="size-4" />
            {canManageNominations ? 'PERSONNEL DEPLOYMENT LOGS' : 'PERSONAL MISSION RECORDS'}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {otherNominations.length === 0 ? (
            <div className="text-center py-20 bg-primary/5 rounded-3xl border border-dashed border-primary/20">
              <Users className="size-12 mx-auto mb-4 text-primary/20" />
              <h3 className="text-lg font-bold text-muted-foreground tracking-widest">NO LOGS ENCOUNTERED</h3>
              <p className="text-muted-foreground text-[10px] font-mono uppercase mt-2">The nomination buffer is currently empty.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {otherNominations.map((nomination) => {
                const participant = getParticipant(nomination.participantId);
                const training = getTraining(nomination.trainingId);

                return (
                  <div
                    key={nomination.id}
                    className="flex flex-col md:flex-row items-start md:items-center gap-4 p-5 rounded-2xl bg-muted/5 border border-border/50 hover:border-primary/20 transition-all group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-foreground tracking-wide text-lg">{participant?.name}</h4>
                          <p className="text-xs text-muted-foreground font-mono mt-1 opacity-80 uppercase">
                            RANK: {participant?.designation} • SECTOR: {getInstitutionName(nomination.institutionId)}
                          </p>
                        </div>
                        <Badge className={`${getStatusBadge(nomination.status)} font-mono text-[10px] tracking-[0.15em] uppercase px-3 py-1 rounded-full`}>
                          {nomination.status}
                        </Badge>
                      </div>

                      <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/10">
                        <p className="text-xs font-bold text-primary tracking-widest uppercase">
                          MISSION: {training?.title}
                        </p>
                        {training && (
                          <div className="flex items-center gap-4 mt-2 text-[10px] font-mono text-muted-foreground">
                            <span className="flex items-center gap-1.5"><Clock className="size-3" /> {safeFormatDate(training.date)}</span>
                            <span className="flex items-center gap-1.5"><Search className="size-3" /> {training.startTime} HRS</span>
                          </div>
                        )}
                      </div>

                      {nomination.rejectionReason && (
                        <div className="mt-3 p-3 rounded-xl bg-destructive/5 border border-destructive/10">
                          <p className="text-[10px] font-bold text-destructive tracking-widest uppercase">REJECTION PROTOCOL REASON:</p>
                          <p className="text-xs text-destructive/80 mt-1 italic">"{nomination.rejectionReason}"</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent className="glass border-primary/20 text-foreground">
          <DialogHeader>
            <DialogTitle className="text-primary tracking-widest font-bold">REJECT NOMINATION</DialogTitle>
            <DialogDescription className="text-muted-foreground font-mono text-xs uppercase">
              Specify the protocol failure reason for this rejection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reason" className="text-[10px] font-bold text-primary uppercase tracking-widest">Rejection Reason</Label>
              <Textarea
                id="reason"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="SPECIFY PROTOCOL FAILURE..."
                rows={4}
                className="bg-input/50 border-input text-foreground font-mono text-xs"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowRejectDialog(false)} className="text-muted-foreground hover:text-foreground">
              CANCEL
            </Button>
            <Button onClick={handleRejectConfirm} className="bg-destructive text-white hover:bg-destructive/80 font-bold tracking-widest">
              CONFIRM REJECTION
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Nominate Dialog */}
      <Dialog open={showNominateDialog} onOpenChange={setShowNominateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nominate Participant</DialogTitle>
            <DialogDescription>
              Select a training and a participant to nominate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="training">Training</Label>
              <select
                id="training"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={selectedTrainingId}
                onChange={(e) => setSelectedTrainingId(e.target.value)}
              >
                <option value="">Select a training</option>
                {safeTrainings.filter(t => t.status !== 'cancelled').map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title} ({safeFormatDate(t.date)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="participant" className="mb-3 block">Participants ({selectedParticipantIds.length} selected)</Label>
              <div className="flex items-center space-x-2 mb-4 p-2 bg-muted/50 rounded-lg">
                <Checkbox
                  id="select-all"
                  checked={selectedParticipantIds.length === safeUsers.filter(u => u.role === 'participant').length && safeUsers.filter(u => u.role === 'participant').length > 0}
                  onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                />
                <label htmlFor="select-all" className="text-sm font-medium leading-none cursor-pointer">SELECT ALL PERSONNEL</label>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {safeUsers.filter(u => u.role === 'participant').map((u) => (
                  <div
                    key={u.id}
                    className={`flex items-center space-x-3 p-3 rounded-xl border transition-all cursor-pointer ${selectedParticipantIds.includes(u.id)
                      ? 'bg-primary/10 border-primary/40'
                      : 'bg-card/50 border-white/5 hover:bg-white/5'
                      }`}
                    onClick={() => toggleParticipantSelection(u.id)}
                  >
                    <Checkbox
                      id={`p-${u.id}`}
                      checked={selectedParticipantIds.includes(u.id)}
                      onCheckedChange={() => toggleParticipantSelection(u.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{u.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono truncate uppercase">{u.designation} • {u.institutionId ? getInstitutionName(u.institutionId) : 'NO SECTOR'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" onClick={() => setShowNominateDialog(false)} className="text-muted-foreground">
              CANCEL
            </Button>
            <Button
              onClick={handleNominate}
              disabled={!selectedTrainingId || selectedParticipantIds.length === 0 || loading}
              className="bg-primary text-primary-foreground font-bold tracking-widest shadow-[0_0_15px_rgba(0,236,255,0.3)]"
            >
              {loading ? <Loader2 className="size-4 animate-spin mr-2" /> : <CheckCircle className="size-4 mr-2" />}
              CONFIRM DEPLOYMENT
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Nominations;
