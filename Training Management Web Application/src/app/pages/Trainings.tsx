import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Training, Hall, User } from '../../types';
import {
  Calendar, Clock, Users, MapPin, Plus, Search, Filter,
  Edit, Trash2, Eye
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { format } from 'date-fns';
import { safeFormatDate } from '../../utils/date';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';

import AttendanceListModal from '../components/AttendanceListModal';
import AssignedParticipantsModal from '../components/AssignedParticipantsModal';


const Trainings: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [halls, setHalls] = useState<Hall[]>([]);
  const [trainers, setTrainers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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

        // Adapt real API data to frontend types (handling missing fields)
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
      draft: 'bg-muted/10 text-muted-foreground border border-muted/20',
      scheduled: 'bg-primary/10 text-primary border border-primary/30 shadow-[0_0_10px_rgba(0,236,255,0.1)]',
      ongoing: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-[0_0_10px_rgba(52,211,153,0.1)]',
      completed: 'bg-secondary/10 text-secondary border border-secondary/30 shadow-[0_0_10px_rgba(110,64,201,0.1)]',
      cancelled: 'bg-destructive/10 text-destructive border border-destructive/20',
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <div className="relative size-12 mb-4">
          <div className="absolute inset-0 border-t-2 border-primary rounded-full animate-spin" />
          <div className="absolute inset-0 border-r-2 border-secondary rounded-full animate-spin [animation-duration:1.5s]" />
        </div>
        <p className="text-primary font-mono text-xs tracking-widest animate-pulse">ACCESSING MISSION DATABASE...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tighter text-foreground flex items-center gap-3">
            <Calendar className="size-8 text-primary animate-pulse-glow" />
            TRAINING MISSIONS
            <div className="h-1 w-20 bg-gradient-to-r from-primary to-transparent rounded-full ml-4 hidden md:block" />
          </h1>
          <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-widest opacity-70">
            {user?.role === 'program_officer'
              ? 'Operational Deployment & Briefing Management'
              : 'Central Training Repository & Mission Oversight'}
          </p>
        </div>
        {(user?.role === 'program_officer' || user?.role === 'master_admin') && (
          <Button onClick={() => navigate('/trainings/create')} className="bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 font-bold tracking-widest text-xs px-6 py-5 rounded-xl transition-all shadow-[0_0_15px_rgba(0,236,255,0.1)]">
            <Plus className="size-4 mr-2" />
            INITIATE MISSION
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="glass neon-border overflow-hidden">
        <CardContent className="p-4 bg-primary/5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-3.5 size-4 text-primary opacity-40" />
              <Input
                placeholder="FILTER MISSIONS BY TITLE, SECTOR, OR OBJECTIVE..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-input/50 border-input focus:border-primary/50 text-foreground font-mono text-xs tracking-wider"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-input/50 border-input focus:ring-primary/50 text-foreground font-mono text-xs tracking-wider">
                <SelectValue placeholder="STATUS FILTER" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border/50 text-foreground font-mono text-xs">
                <SelectItem value="all">ALL DEPLOYMENTS</SelectItem>
                <SelectItem value="draft">DRAFT PROTOCOL</SelectItem>
                <SelectItem value="scheduled">SCHEDULED</SelectItem>
                <SelectItem value="ongoing">ACTIVE MISSION</SelectItem>
                <SelectItem value="completed">COMPLETED</SelectItem>
                <SelectItem value="cancelled">ABORTED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Trainings List */}
      {filteredTrainings.length === 0 ? (
        <Card className="glass-card">
          <CardContent className="p-20 text-center">
            <div className="bg-primary/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border border-primary/20">
              <Calendar className="size-10 text-primary/40 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold text-foreground tracking-widest mb-2">NO MISSIONS DETECTED</h3>
            <p className="text-muted-foreground font-mono text-[10px] uppercase tracking-widest mb-6">
              {searchTerm || statusFilter !== 'all'
                ? 'ADJUST FREQUENCY FILTERS TO LOCATE HIDDEN OBJECTIVES.'
                : 'COMMENCE BY DEFINING NEW OPERATIONAL OBJECTIVES.'}
            </p>
            {(user?.role === 'program_officer' || user?.role === 'master_admin') && (
              <Button onClick={() => navigate('/trainings/create')} className="bg-primary/20 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30 font-bold tracking-widest text-xs px-8 py-5 rounded-xl transition-all">
                <Plus className="size-4 mr-2" />
                INITIATE FIRST MISSION
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {filteredTrainings.map((training) => (
            <Card key={training.id} className="glass-card hover:border-primary/40 transition-all group overflow-hidden">
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row items-stretch">
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">{training.title}</h3>
                        <p className="text-xs text-primary/70 font-mono font-bold tracking-widest mt-1 uppercase">{training.program}</p>
                      </div>
                      <Badge className={`${getStatusBadge(training.status)} font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1 rounded-sm`}>
                        {training.status}
                      </Badge>
                    </div>

                    <p className="text-muted-foreground text-sm leading-relaxed mb-6 opacity-80">{training.description}</p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-[11px] font-mono tracking-wider">
                      <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary/50 group-hover:text-primary border border-border group-hover:border-primary/20">
                          <Calendar className="size-4 flex-shrink-0" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-primary/40 font-bold">DATE:</span>
                          <span>{safeFormatDate(training.date)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary/50 group-hover:text-primary border border-border group-hover:border-primary/20">
                          <Clock className="size-4 flex-shrink-0" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-primary/40 font-bold">TIMEFRAME:</span>
                          <span>{training.startTime} - {training.endTime}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className="size-8 rounded-lg bg-primary/5 flex items-center justify-center text-primary/50 group-hover:text-primary border border-border group-hover:border-primary/20">
                          <MapPin className="size-4 flex-shrink-0" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-primary/40 font-bold">SECTOR:</span>
                          <span className="truncate max-w-[120px]">{getHallName(training.hallId)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-muted-foreground group-hover:text-foreground transition-colors">
                        <div className="size-8 rounded-lg bg-muted/50 flex items-center justify-center text-primary/50 group-hover:text-primary border border-border group-hover:border-primary/20">
                          <Users className="size-4 flex-shrink-0" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] text-primary/40 font-bold">CAPACITY:</span>
                          <span className="stat-value text-base">{training.capacity}</span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-3">
                      <Badge variant="outline" className="text-[9px] font-mono tracking-widest text-secondary border-secondary/30 bg-secondary/5 px-2 py-1">
                        OFFICER: {getTrainerName(training.trainerId)}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] font-mono tracking-widest text-primary border-primary/30 bg-primary/5 px-2 py-1">
                        TARGET: {training.targetAudience}
                      </Badge>
                      <Badge variant="outline" className="text-[9px] font-mono tracking-widest text-muted-foreground border-muted bg-muted/50 px-2 py-1">
                        {training.requiredInstitutions.length} SECTOR(S)
                      </Badge>
                    </div>
                  </div>

                  <div className="w-full md:w-56 bg-primary/[0.03] border-l border-white/5 p-6 flex flex-col gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/trainings/${training.id}`)}
                      className="w-full justify-start font-bold tracking-widest text-[10px] py-4 bg-primary/5 border-primary/10 hover:border-primary/50 text-foreground"
                    >
                      <Eye className="size-3 mr-2 text-primary" />
                      VIEW INTEL
                    </Button>

                    {(user?.role === 'program_officer' || user?.role === 'master_admin') && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewParticipants(training)}
                          className="w-full justify-start font-bold tracking-widest text-[10px] py-4 bg-primary/5 border-primary/10 hover:border-primary/50 text-foreground"
                        >
                          <Users className="size-3 mr-2 text-primary" />
                          PERSONNEL
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewAttendance(training)}
                          className="w-full justify-start font-bold tracking-widest text-[10px] py-4 bg-primary/5 border-primary/10 hover:border-primary/50 text-foreground"
                        >
                          <Users className="size-3 mr-2 text-primary" />
                          ATTENDANCE
                        </Button>
                      </>
                    )}


                    {((user?.role === 'program_officer' && training.createdById === user.id) ||
                      user?.role === 'master_admin') && (
                        <div className="mt-auto pt-4 border-t border-white/5 flex flex-col gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate(`/trainings/${training.id}/edit`)}
                            className="w-full justify-start font-bold tracking-widest text-[10px] py-3 bg-primary/5 border-primary/10 hover:border-primary/50 text-foreground/70"
                          >
                            <Edit className="size-3 mr-2" />
                            MODIFY
                          </Button>

                          {(training.status === 'scheduled' || training.status === 'ongoing') && (
                            <div className="grid grid-cols-2 gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 font-bold tracking-widest text-[9px] py-3 h-auto"
                                onClick={async () => {
                                  if (confirm('MARK MISSION AS COMPLETE?')) {
                                    try {
                                      await api.patch(`/trainings/${training.id}/status`, { status: 'completed' });
                                      setTrainings(trainings.map(t => t.id === training.id ? { ...t, status: 'completed' } : t));
                                      toast.success('Mission marked as complete');
                                    } catch (e) {
                                      toast.error('Status update failed');
                                    }
                                  }
                                }}
                              >
                                FINISH
                              </Button>

                              <Button
                                variant="outline"
                                size="sm"
                                className="text-orange-400 border-orange-500/20 hover:bg-orange-500/10 font-bold tracking-widest text-[9px] py-3 h-auto"
                                onClick={async () => {
                                  if (confirm('ABORT MISSION PROTOCOL?')) {
                                    try {
                                      await api.patch(`/trainings/${training.id}/status`, { status: 'cancelled' });
                                      setTrainings(trainings.map(t => t.id === training.id ? { ...t, status: 'cancelled' } : t));
                                      toast.success('Mission protocol aborted');
                                    } catch (e) {
                                      toast.error('Status update failed');
                                    }
                                  }
                                }}
                              >
                                ABORT
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                  </div>
                </div>
              </CardContent>
            </Card>
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
