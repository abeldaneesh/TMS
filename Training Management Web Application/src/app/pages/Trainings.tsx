import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Training, Hall, User } from '../../types';
import { useTranslation } from 'react-i18next';
import {
  Calendar, Clock, Users, MapPin, Plus, Search,
  Edit, Eye, AppWindowMac, PlayCircle, ClipboardList, CheckCircle2, XCircle
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { safeFormatDate } from '../../utils/date';
import { toast } from 'sonner';

import FilterChips from '../components/FilterChips';
import AttendanceListModal from '../components/AttendanceListModal';
import AssignedParticipantsModal from '../components/AssignedParticipantsModal';
import LoadingScreen from '../components/LoadingScreen';

const Trainings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal state
  const [attendanceModalOpen, setAttendanceModalOpen] = useState(false);
  const [participantsModalOpen, setParticipantsModalOpen] = useState(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const [selectedTrainingTitle, setSelectedTrainingTitle] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [trainingsRes, hallsRes, usersRes] = await Promise.all([
          api.get('/trainings', {
            params: user.role === 'program_officer' ? { createdById: user.id } :
              user.role === 'institutional_admin' && user.institutionId ? { institutionId: user.institutionId } :
                {}
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
  }, [user]);

  const getHallName = (hallId: string) => {
    return halls.find(h => h.id === hallId)?.name || 'Unknown Hall';
  };

  const getTrainerName = (trainerId: string) => {
    return trainers.find(t => t.id === trainerId)?.name || 'Unknown Trainer';
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

    return matchesSearch && matchesStatus;
  });

  const handleViewAttendance = (training: Training) => {
    setSelectedTrainingId(training.id);
    setSelectedTrainingTitle(training.title);
    setAttendanceModalOpen(true);
  };

  const handleViewParticipants = (training: Training) => {
    setSelectedTrainingId(training.id);
    setSelectedTrainingTitle(training.title);
    setParticipantsModalOpen(true);
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

      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-3.5 size-5 text-muted-foreground" />
          <Input
            placeholder={t('trainings.searchPlaceholder', 'Search trainings, sectors, or programs...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-12 bg-secondary/30 border-transparent focus:border-[#3d3d3d] rounded-full h-12 text-foreground"
          />
        </div>
      </div>

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

      {/* Trainings List */}
      {filteredTrainings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="bg-secondary/20 size-24 rounded-full flex items-center justify-center mb-6">
            <Calendar className="size-10 text-muted-foreground opacity-50" />
          </div>
          <h3 className="text-2xl font-bold mb-2">{t('trainings.noResults', 'No matching results')}</h3>
          <p className="text-muted-foreground max-w-md mb-8">
            {searchTerm || statusFilter !== 'all'
              ? t('trainings.adjustSearch', 'Try adjusting your search terms or filters to find what you are looking for.')
              : t('trainings.emptyLibrary', 'There are no items in this library yet.')}
          </p>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="hidden md:flex items-center px-4 py-2 text-sm text-muted-foreground border-b border-border/50 uppercase tracking-wider font-medium">
            <div className="w-8 mr-4 text-center">#</div>
            <div className="flex-1 min-w-0 pr-4">{t('trainings.table.title', 'Title')}</div>
            <div className="w-48 shrink-0 px-4 text-right">{t('trainings.table.dateTime', 'Date & Time')}</div>
            <div className="w-32 shrink-0 px-4">{t('trainings.table.status', 'Status')}</div>
            <div className="w-48 shrink-0"></div>
          </div>

          {filteredTrainings.map((training, index) => (
            <div
              key={training.id}
              className="group flex flex-col sm:flex-row sm:items-center py-3 px-2 sm:px-4 hover:bg-white/5 rounded-lg transition-colors border-b border-border/30 cursor-pointer"
              onClick={() => navigate(`/trainings/${training.id}`)}
            >
              <div className="flex items-center flex-1 min-w-0">
                <div className="text-muted-foreground w-8 mr-4 text-center text-sm font-medium hidden md:block">
                  {index + 1}
                </div>

                <div className="relative size-12 sm:size-14 rounded-md bg-secondary/50 shrink-0 overflow-hidden flex items-center justify-center mr-4">
                  <Calendar className="size-6 text-muted-foreground opacity-30 group-hover:opacity-0 transition-opacity" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <PlayCircle className="size-7 text-white fill-current" />
                  </div>
                </div>

                <div className="flex-1 min-w-0 pr-4">
                  <h3 className="text-base font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {training.title}
                  </h3>
                  <p className="text-sm text-muted-foreground truncate mt-0.5">
                    {training.program} • {getHallName(training.hallId)} • {getTrainerName(training.trainerId)}
                  </p>
                </div>
              </div>

              <div className="hidden md:flex flex-col items-end px-4 w-48 shrink-0">
                <span className="text-sm font-medium text-foreground/90">{safeFormatDate(training.date)}</span>
                <span className="text-xs text-muted-foreground">{training.startTime} - {training.endTime}</span>
              </div>

              <div className="hidden lg:flex items-center w-32 shrink-0 px-4">
                <span className={`text-xs font-medium uppercase tracking-wider ${getStatusBadge(training.status)}`}>
                  {training.status}
                </span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end sm:w-48 shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity mt-4 sm:mt-0" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" onClick={() => navigate(`/trainings/${training.id}`)} className="text-muted-foreground hover:text-white hover:bg-white/10 rounded-full size-9" title={t('trainings.actions.details', 'View Details')}>
                  <Eye className="size-4" />
                </Button>

                {(user?.role === 'program_officer' || user?.role === 'master_admin') && (
                  <>
                    <Button variant="ghost" size="icon" onClick={() => handleViewParticipants(training)} className="text-muted-foreground hover:text-white hover:bg-white/10 rounded-full size-9" title={t('trainings.actions.personnel', 'Personnel')}>
                      <Users className="size-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleViewAttendance(training)} className="text-muted-foreground hover:text-white hover:bg-white/10 rounded-full size-9" title={t('trainings.actions.attendance', 'Attendance')}>
                      <ClipboardList className="size-4" />
                    </Button>

                    {((user?.role === 'program_officer' && training.createdById === user.id) || user?.role === 'master_admin') && (
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
          <AssignedParticipantsModal
            isOpen={participantsModalOpen}
            onClose={() => setParticipantsModalOpen(false)}
            trainingId={selectedTrainingId}
            trainingTitle={selectedTrainingTitle}
          />
        </>
      )}

    </div>
  );
};

export default Trainings;
