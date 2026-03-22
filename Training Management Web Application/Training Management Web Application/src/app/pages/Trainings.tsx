import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Training, Hall, User } from '../../types';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Clock, Users, MapPin, Plus, Search,
  Edit, Eye, AppWindowMac, PlayCircle, ClipboardList, CheckCircle2, XCircle,
  ArrowUpDown, ArrowUp, ArrowDown, CalendarPlus
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { safeFormatDate } from '../../utils/date';
import { toast } from 'sonner';

import FilterChips from '../components/FilterChips';
import AttendanceListModal from '../components/AttendanceListModal';
import LoadingScreen from '../components/LoadingScreen';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';

const Trainings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [ownershipFilter, setOwnershipFilter] = useState<'all' | 'mine'>('all');
  const [sortField, setSortField] = useState<'title' | 'hall' | 'date' | 'status'>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  // Modal state
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const [selectedTrainingTitle, setSelectedTrainingTitle] = useState('');
  const [cancelledTraining, setCancelledTraining] = useState<Training | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [trainingsRes, hallsRes, usersRes] = await Promise.all([
          api.get('/trainings', {
            params: user.role === 'institutional_admin' && user.institutionId ? { institutionId: user.institutionId } : {}
          }),
          api.get('/halls'),
          api.get('/users'),
        ]);

        const rawTrainings = Array.isArray(trainingsRes.data) ? trainingsRes.data : [];
        const adaptedTrainings = rawTrainings.map((t: any) => ({
          ...t,
          requiredInstitutions: t.requiredInstitutions || [],
          targetAudience: t.targetAudience || 'General',
          trainerId: t.trainerId || t.createdById,
        }));

        setTrainings(adaptedTrainings);
        setHalls(Array.isArray(hallsRes.data) ? hallsRes.data : []);
        const rawUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
        setTrainers(rawUsers.filter((u: any) => u.role === 'program_officer'));
      } catch (error) {
        console.error('Error fetching trainings:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Check for search query param from Layout global search
    const searchParams = new URLSearchParams(location.search);
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearchTerm(searchParam);
    }
  }, [user, location.search]);

  const getHallName = (hallId: string) => {
    return halls.find(h => h.id === hallId)?.name || 'Unknown Hall';
  };

  const getTrainerName = (training: Training) => {
    const activeTrainer = trainers.find((trainer) => trainer.id === training.trainerId);
    if (activeTrainer?.name) {
      return activeTrainer.name;
    }

    if (training.creator?.name && training.createdById === training.trainerId) {
      return `${training.creator.name} (Archived)`;
    }

    return 'Trainer (Archived)';
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'text-muted-foreground',
      scheduled: 'text-blue-400',
      ongoing: 'text-emerald-500',
      completed: 'text-purple-400',
      cancelled: 'text-destructive',
    };
    return variants[status as keyof typeof variants] || variants.draft;
  };

  const filteredTrainings = trainings.filter(training => {
    const matchesSearch = training.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.program.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || training.status === statusFilter;
    const matchesOwnership = ownershipFilter === 'all' || training.createdById === user?.id;

    // Convert both to YYYY-MM-DD for accurate comparison if a date is selected
    let matchesDate = true;
    if (dateFilter) {
      const trainingDateObj = new Date(training.date);
      // Ensure we don't have timezone offset issues by comparing the date string parts
      const trainingDateStr = trainingDateObj.toISOString().split('T')[0];
      matchesDate = trainingDateStr === dateFilter;
    }

    return matchesSearch && matchesStatus && matchesOwnership && matchesDate;
  });

  const sortedTrainings = [...filteredTrainings].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'title':
        comparison = a.title.localeCompare(b.title);
        break;
      case 'hall':
        comparison = getHallName(a.hallId).localeCompare(getHallName(b.hallId));
        break;
      case 'date':
        // sort by date then time
        const dateA = new Date(`${a.date}T${a.startTime || '00:00'}`);
        const dateB = new Date(`${b.date}T${b.startTime || '00:00'}`);
        comparison = dateA.getTime() - dateB.getTime();
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: 'title' | 'hall' | 'date' | 'status') => {
    if (field === sortField) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleViewAttendance = (training: Training) => {
    setSelectedTrainingId(training.id);
    setSelectedTrainingTitle(training.title);
    setAttendanceModalOpen(true);
  };

  const handleViewParticipants = (training: Training) => {
    navigate(`/trainings/${training.id}/participants`);
  };

  const formatDateParam = (date: Date | string) => {
    const parsed = new Date(date);
    const year = parsed.getFullYear();
    const month = `${parsed.getMonth() + 1}`.padStart(2, '0');
    const day = `${parsed.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const openReplacementFlow = (training: Training, useSameDay: boolean) => {
    const selectedDate = useSameDay ? formatDateParam(training.date) : undefined;
    navigate(
      useSameDay ? `/trainings/create?date=${selectedDate}` : '/trainings/create',
      {
        state: {
          prefilledTraining: training,
          ...(selectedDate ? { selectedDate } : {}),
        },
      }
    );
    setCancelledTraining(null);
  };

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <div className="pb-12 space-y-6 text-foreground">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <AppWindowMac className="size-8 sm:size-10 text-primary" />
            {t('trainings.exploreLibrary', 'Explore Library')}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {user?.role === 'program_officer'
              ? t('trainings.descOfficer', 'Manage your operational deployments')
              : t('trainings.descAdmin', 'Discover and oversee all training missions')}
          </p>
        </div>
        {(user?.role === 'program_officer' || user?.role === 'master_admin') && (
          <Button onClick={() => navigate('/trainings/create')} className="bg-foreground text-background hover:bg-white/90 font-semibold rounded-full px-6">
            <Plus className="size-5 mr-2" />
            {t('trainings.newMission', 'New Mission')}
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-4 mb-4">
        <div className="relative max-w-md w-full sm:w-2/3">
          <Search className="absolute left-4 top-3.5 size-5 text-muted-foreground" />
          <Input
            placeholder={t('trainings.searchPlaceholder', 'Search trainings, sectors, or programs...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 bg-secondary/30 border-transparent focus:border-[#3d3d3d] rounded-full h-12 text-foreground"
          />
        </div>

        <div className="relative max-w-md w-full sm:w-1/3">
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="bg-secondary/30 border-transparent focus:border-[#3d3d3d] rounded-full h-12 text-foreground px-4 w-full cursor-pointer"
            title={t('trainings.filterByDate', 'Filter by date')}
          />
          {dateFilter && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1.5 size-9 text-muted-foreground hover:bg-transparent hover:text-foreground"
              onClick={() => setDateFilter('')}
              title={t('trainings.clearDate', 'Clear date')}
            >
              <XCircle className="size-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="mb-8">
        {user?.role === 'program_officer' && (
          <FilterChips
            options={[
              { value: 'all', label: t('trainings.scope.all', 'All Trainings') },
              { value: 'mine', label: t('trainings.scope.mine', 'My Trainings') },
            ]}
            selectedValue={ownershipFilter}
            onChange={(value) => setOwnershipFilter(value as 'all' | 'mine')}
          />
        )}
        <FilterChips
          options={[
            { value: 'all', label: t('trainings.filters.all', 'All Deployments') },
            { value: 'draft', label: t('trainings.filters.draft', 'Drafts') },
            { value: 'scheduled', label: t('trainings.filters.scheduled', 'Scheduled') },
            { value: 'ongoing', label: t('trainings.filters.ongoing', 'Active') },
            { value: 'completed', label: t('trainings.filters.completed', 'Completed') },
            { value: 'cancelled', label: t('trainings.filters.cancelled', 'Aborted') }
          ]}
          selectedValue={statusFilter}
          onChange={setStatusFilter}
        />
      </div>

      {/* Trainings List */}
      {sortedTrainings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-secondary/20 size-24 rounded-full flex items-center justify-center mb-6">
            <Calendar className="size-10 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-2xl font-bold mb-2">{t('trainings.noResults', 'No matching results')}</h3>
          <p className="text-muted-foreground max-w-md mb-8">
            {searchTerm || statusFilter !== 'all' || ownershipFilter !== 'all' || dateFilter
              ? t('trainings.adjustSearch', 'Try adjusting your search terms or filters to find what you are looking for.')
              : t('trainings.emptyLibrary', 'There are no items in this library yet.')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="hidden md:flex items-center px-4 py-2 text-sm text-muted-foreground border-b border-border/50 uppercase tracking-wider font-medium">
            <div className="w-8 mr-4 text-center">#</div>
            <div className="flex-1 min-w-0 pr-4 cursor-pointer hover:text-foreground flex items-center gap-1 group/header" onClick={() => handleSort('title')}>
              {t('trainings.table.title', 'Title')}
              {sortField === 'title' ? (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-0 group-hover/header:opacity-50 transition-opacity" />}
            </div>
            <div className="w-48 shrink-0 px-4 cursor-pointer hover:text-foreground flex items-center gap-1 group/header" onClick={() => handleSort('hall')}>
              <span>Hall / Venue</span>
              {sortField === 'hall' ? (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-0 group-hover/header:opacity-50 transition-opacity" />}
            </div>
            <div className="w-48 shrink-0 px-4 text-right flex justify-end cursor-pointer hover:text-foreground gap-1 group/header" onClick={() => handleSort('date')}>
              {sortField === 'date' ? (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-0 group-hover/header:opacity-50 transition-opacity" />}
              <span>{t('trainings.table.dateTime', 'Date & Time')}</span>
            </div>
            <div className="w-32 shrink-0 px-4 cursor-pointer hover:text-foreground flex items-center gap-1 group/header" onClick={() => handleSort('status')}>
              {t('trainings.table.status', 'Status')}
              {sortField === 'status' ? (sortDirection === 'asc' ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : <ArrowUpDown className="size-3 opacity-0 group-hover/header:opacity-50 transition-opacity" />}
            </div>
            <div className="w-48 shrink-0"></div>
          </div>

          {sortedTrainings.map((training, index) => (
            <div
              key={training.id}
              className="group flex flex-col sm:min-h-[84px] sm:flex-row sm:items-center py-3 px-2 sm:px-4 hover:bg-white/5 rounded-lg transition-colors border-b border-border/30 cursor-pointer"
              onClick={() => navigate(`/trainings/${training.id}`)}
            >
              <div className="flex flex-1 items-center min-w-0">
                <div className="text-muted-foreground w-8 mr-4 text-center text-sm font-medium hidden md:block">
                  {index + 1}
                </div>

                <div className="relative size-12 sm:size-14 rounded-md bg-secondary/50 shrink-0 overflow-hidden flex items-center justify-center mr-4">
                  <Calendar className="size-6 text-muted-foreground opacity-30 group-hover:opacity-0 transition-opacity" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="size-7 text-white fill-current" />
                  </div>
                </div>

                <div className="flex min-h-[56px] flex-1 min-w-0 flex-col justify-center pr-4">
                  <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {training.title}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {training.program} • {getTrainerName(training)}
                  </p>
                </div>
              </div>

              <div className="hidden md:flex h-full items-center px-4 w-48 shrink-0">
                <span className="text-sm font-medium text-foreground/90 truncate" title={getHallName(training.hallId)}>
                  {getHallName(training.hallId)}
                </span>
              </div>

              <div className="hidden md:flex h-full flex-col items-end justify-center px-4 w-48 shrink-0">
                <span className="text-sm font-medium text-foreground/90">{safeFormatDate(training.date)}</span>
                <span className="text-xs text-muted-foreground">{training.startTime} - {training.endTime}</span>
              </div>

              <div className="hidden lg:flex h-full items-center w-32 shrink-0 px-4">
                <span className={`text-xs font-medium uppercase tracking-wider ${getStatusBadge(training.status)}`}>
                  {training.status}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end sm:h-full sm:w-48 shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity mt-4 sm:mt-0" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={() => navigate(`/trainings/${training.id}`)} className="text-muted-foreground hover:text-white hover:bg-white/10 rounded-full size-9" title={t('trainings.actions.details', 'View Details')}>
                  <Eye className="size-4" />
                </Button>

                {(user?.role === 'program_officer' || user?.role === 'master_admin') && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate('/trainings/create', { state: { prefilledTraining: training } })}
                      className="text-muted-foreground hover:text-white hover:bg-white/10 rounded-full size-9"
                      title={t('trainings.actions.schedule', 'Schedule Program')}
                    >
                      <CalendarPlus className="size-4" />
                    </Button>

                    <Button variant="ghost" size="icon" onClick={() => handleViewParticipants(training)} className="text-muted-foreground hover:text-white hover:bg-white/10 rounded-full size-9" title={t('trainings.actions.personnel', 'Personnel')}>
                      <Users className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleViewAttendance(training)} className="text-muted-foreground hover:text-white hover:bg-white/10 rounded-full size-9" title={t('trainings.actions.attendance', 'Attendance')}>
                      <ClipboardList className="size-4" />
                    </Button>

                    {((user?.role === 'program_officer' && training.createdById === user.id) || user?.role === 'master_admin') && training.status !== 'completed' && training.status !== 'cancelled' && (
                      <Button variant="ghost" size="icon" onClick={() => navigate(`/trainings/${training.id}/edit`)} className="text-muted-foreground hover:text-white hover:bg-white/10 rounded-full size-9" title={t('trainings.actions.modify', 'Modify')}>
                        <Edit className="size-4" />
                      </Button>
                    )}

                    {((user?.role === 'program_officer' && training.createdById === user.id) || user?.role === 'master_admin') && (training.status === 'scheduled' || training.status === 'ongoing') && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (confirm(t('trainings.confirmComplete', 'Mark completion?'))) {
                              try {
                                await api.patch(`/trainings/${training.id}/status`, { status: 'completed' });
                                setTrainings(trainings.map(t => t.id === training.id ? { ...t, status: 'completed' } : t));
                                toast.success(t('trainings.completedSuccess', 'Completed'));
                              } catch (e) {
                                toast.error('Failed');
                              }
                            }
                          }}
                          className="text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 rounded-full size-9"
                          title={t('trainings.actions.finish', 'Finish')}
                        >
                          <CheckCircle2 className="size-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            if (confirm(t('trainings.confirmAbort', 'Abort mission?'))) {
                              try {
                                await api.patch(`/trainings/${training.id}/status`, { status: 'cancelled' });
                                setTrainings(trainings.map(t => t.id === training.id ? { ...t, status: 'cancelled' } : t));
                                toast.success(t('trainings.abortedSuccess', 'Aborted'));
                                setCancelledTraining({ ...training, status: 'cancelled' });
                              } catch (e) {
                                toast.error('Failed');
                              }
                            }
                          }}
                          className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full size-9"
                          title={t('trainings.actions.abort', 'Abort')}
                        >
                          <XCircle className="size-4" />
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTrainingId && (
        <>
          <AttendanceListModal
            isOpen={attendanceModalOpen}
            onClose={() => setAttendanceModalOpen(false)}
            trainingId={selectedTrainingId}
            trainingTitle={selectedTrainingTitle}
          />
        </>
      )}

      <Dialog open={Boolean(cancelledTraining)} onOpenChange={(open) => !open && setCancelledTraining(null)}>
        <DialogContent className="border-border bg-background text-foreground">
          <DialogHeader>
            <DialogTitle>Create a replacement training?</DialogTitle>
            <DialogDescription>
              {cancelledTraining
                ? `“${cancelledTraining.title}” was cancelled. You can create a replacement session with the same details for the same day or choose another day.`
                : 'Create a replacement session.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button variant="outline" onClick={() => setCancelledTraining(null)}>
              Not now
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                variant="outline"
                onClick={() => cancelledTraining && openReplacementFlow(cancelledTraining, false)}
              >
                Create for another day
              </Button>
              <Button
                onClick={() => cancelledTraining && openReplacementFlow(cancelledTraining, true)}
              >
                Create for same day
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default Trainings;
