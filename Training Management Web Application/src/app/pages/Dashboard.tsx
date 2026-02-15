import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsApi, trainingsApi } from '../../services/api';
import { DashboardStats, Training } from '../../types';
import {
  Calendar, Users, CheckCircle, TrendingUp,
  Clock, AlertCircle, Award, ShieldCheck, Activity, Zap, History as HistoryIcon, BarChart3, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [upcomingTrainings, setUpcomingTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [statsData, allTrainings] = await Promise.all([
          analyticsApi.getDashboardStats(user.id, user.role),
          trainingsApi.getAll(user.role === 'program_officer' ? { createdById: user.id } : {}),
        ]);

        setStats(statsData);

        // Get upcoming trainings (next 5)
        const upcoming = allTrainings
          .filter(t => new Date(t.date) > new Date() && t.status !== 'cancelled')
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .slice(0, 5);

        setUpcomingTrainings(upcoming);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-primary animate-pulse-glow">QUANTIZING SYSTEM DATA...</div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Trainings',
      value: stats.totalTrainings,
      icon: Calendar,
      color: 'bg-primary/20 text-primary shadow-[0_0_15px_rgba(0,236,255,0.2)]',
      description: 'System-wide records',
    },
    {
      title: 'Active Sessions',
      value: stats.upcomingTrainings,
      icon: Clock,
      color: 'bg-secondary/20 text-secondary shadow-[0_0_15px_rgba(110,64,201,0.2)]',
      description: 'Scheduled operations',
    },
    {
      title: 'Successful Missions',
      value: stats.completedTrainings,
      icon: CheckCircle,
      color: 'bg-green-500/20 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.2)]',
      description: 'Verified completions',
    },
    {
      title: 'Engagement Sync',
      value: `${stats.attendanceRate}%`,
      icon: TrendingUp,
      color: 'bg-accent/20 text-accent shadow-[0_0_15px_rgba(31,111,235,0.2)]',
      description: 'Participation metrics',
    },
  ];

  const trainingStaffData = [
    { name: 'Trained', value: stats.trainedStaff, color: '#00ecff' },
    { name: 'Untrained', value: stats.untrainedStaff, color: '#f85149' },
  ];

  const monthlyData = [
    { month: 'Jan', trainings: 5, attendance: 85 },
    { month: 'Feb', trainings: 8, attendance: 90 },
    { month: 'Mar', trainings: 3, attendance: 75 },
    { month: 'Apr', trainings: 6, attendance: 80 },
    { month: 'May', trainings: 9, attendance: 95 },
  ];

  const getStatusBadge = (status: string) => {
    const variants = {
      draft: 'bg-white/5 text-white/40 border-white/5',
      scheduled: 'bg-primary/10 text-primary border-primary/20 shadow-[0_0_10px_rgba(0,236,255,0.1)]',
      ongoing: 'bg-green-500/10 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]',
      completed: 'bg-secondary/10 text-secondary border-secondary/20 shadow-[0_0_10px_rgba(110,64,201,0.1)]',
      cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return variants[status as keyof typeof variants] || variants.draft;
  };

  const quickActions = [
    {
      title: 'New Mission',
      desc: 'Initiate a new training protocol',
      icon: Calendar,
      color: 'text-primary',
      path: '/trainings/create',
      roles: ['master_admin', 'program_officer'],
    },
    {
      title: 'View Personnel',
      desc: 'Access all operative profiles',
      icon: Users,
      color: 'text-secondary',
      path: '/personnel',
      roles: ['master_admin'],
    },
    {
      title: 'Analytics Report',
      desc: 'Generate system performance data',
      icon: BarChart3,
      color: 'text-emerald-500',
      path: '/analytics',
      roles: ['master_admin', 'program_officer'],
    },
    {
      title: 'System Settings',
      desc: 'Configure operational parameters',
      icon: Award,
      color: 'text-orange-500',
      path: '/settings',
      roles: ['master_admin', 'program_officer'],
    },
  ];

  return (
    <div className="space-y-10">
      <div className="relative">
        <h1 className="text-4xl font-extrabold tracking-tighter text-foreground uppercase">
          OPERATIONAL <span className="text-primary italic">DASHBOARD</span>
        </h1>
        <p className="text-primary/60 font-mono text-xs uppercase tracking-[0.3em] mt-2">
          Authorized personnel: {user?.name} | Access Level: <span className="text-secondary">{user?.role?.toUpperCase()}</span>
        </p>
      </div>



      {/* Main Content Grid - Operational Controls (Hidden for Participants) */}
      {user?.role !== 'participant' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Quick Actions Panel */}
          <div className="lg:col-span-2 space-y-8">
            <h2 className="text-xl font-black text-foreground uppercase tracking-widest flex items-center gap-3">
              <Zap className="size-5 text-primary" />
              Mission Protocols
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {quickActions
                .filter(action => !action.roles || (user?.role && action.roles.includes(user.role)))
                .map((action) => (
                  <Card
                    key={action.title}
                    className="glass-card p-6 cursor-pointer group hover:bg-primary/5 border-border hover:border-primary/50 transition-all hover:translate-x-1 relative overflow-hidden bg-card/40"
                    onClick={() => navigate(action.path)}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />

                    <div className="flex items-start justify-between relative z-10">
                      <div className="space-y-3">
                        <div className={`p-3 rounded-lg w-fit ${action.color} bg-opacity-10 border border-current`}>
                          <action.icon className="size-6" />
                        </div>
                        <div>
                          <h3 className="font-bold text-foreground uppercase tracking-wide group-hover:text-primary transition-colors">
                            {action.title}
                          </h3>
                          <p className="text-xs text-muted-foreground font-mono mt-1 uppercase">
                            {action.desc}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </Card>
                ))}
            </div>


          </div>

          {/* System Stats Sidebar */}
          <div className="space-y-8">
            <h2 className="text-xl font-black text-foreground uppercase tracking-widest flex items-center gap-3">
              <BarChart3 className="size-5 text-secondary" />
              System Metrics
            </h2>

            <Card className="glass-card border-border overflow-hidden bg-card/40">
              <div className="p-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20" />
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono uppercase text-muted-foreground">
                    <span>Server Load</span>
                    <span className="text-primary">34%</span>
                  </div>
                  <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
                    <div className="h-full w-1/3 bg-primary/50 shadow-[0_0_10px_rgba(0,236,255,0.5)]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono uppercase text-muted-foreground">
                    <span>Memory Usage</span>
                    <span className="text-secondary">62%</span>
                  </div>
                  <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
                    <div className="h-full w-[62%] bg-secondary/50 shadow-[0_0_10px_rgba(110,64,201,0.5)]" />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-mono uppercase text-muted-foreground">
                    <span>Active Nodes</span>
                    <span className="text-emerald-500">12/12</span>
                  </div>
                  <div className="h-1 bg-muted/50 rounded-full overflow-hidden">
                    <div className="h-full w-full bg-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-border">
                  <div className="text-center p-4 bg-muted/30 rounded-lg border border-border">
                    <div className="text-2xl font-black text-foreground font-mono">1,420</div>
                    <div className="text-[10px] text-muted-foreground uppercase tracking-widest mt-1">Total Active Personnels</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="neon-border group overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Icon className="size-20 -mr-6 -mt-6" />
              </div>
              <CardContent className="p-6 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{stat.title}</p>
                    <p className="text-4xl font-black mt-2 text-foreground group-hover:text-primary transition-colors">{stat.value}</p>
                    <p className="text-[10px] text-primary/40 mt-1 uppercase font-mono">{stat.description}</p>
                  </div>
                  <div className={`${stat.color} p-3 rounded-2xl border border-white/5 backdrop-blur-md`}>
                    <Icon className="size-6 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Staff Training Status */}
        <Card className="neon-border">
          <CardHeader>
            <CardTitle className="text-foreground">FORCE READINESS</CardTitle>
            <CardDescription className="text-muted-foreground font-mono text-[10px] uppercase">Personnel Training Distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-center gap-10">
              <div className="flex-1 w-full min-h-[220px]">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={trainingStaffData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={10}
                      dataKey="value"
                      stroke="none"
                    >
                      {trainingStaffData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} className="drop-shadow-[0_0_10px_rgba(0,0,0,0.5)]" />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: 'rgba(13, 17, 23, 0.9)', borderColor: 'rgba(0, 236, 255, 0.2)', borderRadius: '12px', color: '#fff' }}
                      itemStyle={{ color: '#00ecff' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-6 w-full sm:w-auto">
                <div className="glass p-4 rounded-2xl border-l-4 border-l-primary w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-primary uppercase">Trained</span>
                  </div>
                  <p className="text-3xl font-black text-foreground">{stats.trainedStaff}</p>
                </div>
                <div className="glass p-4 rounded-2xl border-l-4 border-l-destructive w-full">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-destructive uppercase">Pending</span>
                  </div>
                  <p className="text-3xl font-black text-foreground">{stats.untrainedStaff}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Monthly Trainings */}
        <Card className="neon-border">
          <CardHeader>
            <CardTitle className="text-foreground">TEMPORAL ANALYTICS</CardTitle>
            <CardDescription className="text-muted-foreground font-mono text-[10px] uppercase">Mission Frequency and Engagement</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="month" stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(13, 17, 23, 0.9)', borderColor: 'rgba(110, 64, 201, 0.2)', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="trainings" fill="#6e40c9" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Trainings */}
      <Card className="neon-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-foreground uppercase text-xl font-black">
            <Clock className="size-6 text-primary animate-pulse-glow" />
            PENDING DEPLOYMENTS
          </CardTitle>
          <CardDescription className="text-muted-foreground font-mono text-[10px] uppercase">Active mission manifest</CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingTrainings.length === 0 ? (
            <div className="text-center py-20 glass rounded-3xl border-dashed border-primary/20">
              <AlertCircle className="size-16 mx-auto mb-4 text-primary/20" />
              <p className="text-muted-foreground font-mono text-sm uppercase">NO PENDING DEPLOYMENTS DETECTED</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {upcomingTrainings.map((training) => (
                <div
                  key={training.id}
                  className="flex items-start gap-4 p-5 glass rounded-2xl border border-white/5 hover:border-primary/30 transition-all group relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-2 opacity-5">
                    <Calendar className="size-16" />
                  </div>
                  <div className="flex-shrink-0 bg-primary/10 text-primary p-3 rounded-xl shadow-[0_0_10px_rgba(0,236,255,0.1)]">
                    <Calendar className="size-6" />
                  </div>
                  <div className="flex-1 min-w-0 z-10">
                    <div className="flex items-start justify-between gap-2">
                      <div className="truncate">
                        <h4 className="font-bold text-foreground uppercase tracking-tight truncate group-hover:text-primary transition-colors">{training.title}</h4>
                        <p className="text-[10px] text-muted-foreground font-mono uppercase mt-1 opacity-60">{training.program}</p>
                      </div>
                      <Badge className={`${getStatusBadge(training.status)} shadow-sm uppercase text-[9px] font-bold tracking-widest h-5 px-2`}>
                        {training.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-y-2 gap-x-4 mt-5">
                      <span className="flex items-center gap-2 text-[10px] text-primary/70 font-mono uppercase tracking-tighter">
                        <Calendar className="size-3" />
                        {format(new Date(training.date), 'MMM dd, yyyy')}
                      </span>
                      <span className="flex items-center gap-2 text-[10px] text-secondary/70 font-mono uppercase tracking-tighter">
                        <Clock className="size-3" />
                        {training.startTime} - {training.endTime}
                      </span>
                      <span className="flex items-center gap-2 text-[10px] text-white/40 font-mono uppercase tracking-tighter col-span-2">
                        <Users className="size-3" />
                        PERSONNEL CAPACITY: {training.capacity}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Footer */}
      {user?.role === 'master_admin' && (
        <Card className="bg-gradient-to-br from-[#0d1117] via-[#050505] to-[#0d1117] border-primary/20 text-foreground overflow-hidden relative">
          <div className="absolute inset-0 cyber-grid opacity-10" />
          <CardContent className="p-8 relative z-10">
            <div className="flex flex-col sm:flex-row items-center gap-8">
              <div className="bg-primary/20 p-5 rounded-full shadow-[0_0_30px_rgba(0,236,255,0.3)] animate-pulse-glow">
                <Award className="size-12 text-primary" />
              </div>
              <div className="flex-1 w-full text-center sm:text-left">
                <h3 className="text-2xl font-black italic tracking-tighter uppercase underline decoration-primary/40 decoration-4 underline-offset-8 mb-4">SYSTEM SYNERGY INDEX</h3>
                <div className="flex items-end gap-2 mb-2">
                  <span className="text-5xl font-black text-primary">{stats.attendanceRate}%</span>
                  <span className="text-[10px] text-muted-foreground font-mono uppercase mb-2 tracking-widest">Global engagement verified</span>
                </div>
                <Progress value={stats.attendanceRate} className="h-2.5 bg-white/5" indicatorClassName="bg-gradient-to-r from-primary to-secondary shadow-[0_0_10px_rgba(0,236,255,0.5)]" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;
