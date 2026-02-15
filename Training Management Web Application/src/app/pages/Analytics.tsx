import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsApi, trainingsApi, institutionsApi } from '../../services/api';
import { Training, Institution, TrainingAnalytics } from '../../types';
import { BarChart3, TrendingUp, Users, Calendar } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { safeFormatDate } from '../../utils/date';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell
} from 'recharts';

const Analytics: React.FC = () => {
  const { user } = useAuth();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedTraining, setSelectedTraining] = useState('');
  const [trainingAnalytics, setTrainingAnalytics] = useState<TrainingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [trainingsData, institutionsData] = await Promise.all([
          trainingsApi.getAll(),
          institutionsApi.getAll(),
        ]);
        const cleanTrainings = Array.isArray(trainingsData) ? trainingsData : [];
        const cleanInstitutions = Array.isArray(institutionsData) ? institutionsData : [];

        setTrainings(cleanTrainings);
        setInstitutions(cleanInstitutions);

        if (cleanTrainings.length > 0) {
          setSelectedTraining(cleanTrainings[0].id);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!selectedTraining) return;

      try {
        const analytics = await analyticsApi.getTrainingAnalytics(selectedTraining);
        setTrainingAnalytics(analytics);
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };
    fetchAnalytics();
  }, [selectedTraining]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-primary animate-pulse-glow">DECRYPTING ANALYTICS...</div>
      </div>
    );
  }

  const programData = Array.isArray(trainings) ? trainings.reduce((acc, training) => {
    if (!training || !training.program) return acc;
    const existing = acc.find(item => item.program === training.program);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ program: training.program, count: 1 });
    }
    return acc;
  }, [] as { program: string; count: number }[]) : [];

  const statusData = [
    { status: 'Scheduled', count: (Array.isArray(trainings) ? trainings : []).filter(t => t.status === 'scheduled').length, color: '#00ecff' },
    { status: 'Completed', count: (Array.isArray(trainings) ? trainings : []).filter(t => t.status === 'completed').length, color: '#6e40c9' },
    { status: 'Ongoing', count: (Array.isArray(trainings) ? trainings : []).filter(t => t.status === 'ongoing').length, color: '#238636' },
    { status: 'Cancelled', count: (Array.isArray(trainings) ? trainings : []).filter(t => t.status === 'cancelled').length, color: '#f85149' },
  ];

  return (
    <div className="space-y-10">
      <div className="relative">
        <h1 className="text-4xl font-extrabold tracking-tighter text-foreground uppercase">
          SYSTEM <span className="text-primary italic">ANALYTICS</span>
        </h1>
        <p className="text-primary/60 font-mono text-xs uppercase tracking-[0.3em] mt-2">
          Real-time metrics and mission distribution
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Programs', value: programData.length, icon: BarChart3, color: 'text-primary bg-primary/10' },
          { label: 'Total Missions', value: trainings.length, icon: Calendar, color: 'text-secondary bg-secondary/10' },
          { label: 'Units Linked', value: institutions.length, icon: Users, color: 'text-green-400 bg-green-400/10' },
          { label: 'Sync Status', value: trainingAnalytics ? `${trainingAnalytics.attendanceRate}%` : '-', icon: TrendingUp, color: 'text-accent bg-accent/10' },
        ].map((stat, i) => (
          <Card key={i} className="neon-border overflow-hidden group">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">{stat.label}</p>
                  <p className="text-3xl font-black mt-2 text-foreground group-hover:text-primary transition-colors">{stat.value}</p>
                </div>
                <div className={`${stat.color} p-3 rounded-xl border border-border/50 backdrop-blur-md shadow-sm`}>
                  <stat.icon className="size-6 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="neon-border">
          <CardHeader>
            <CardTitle className="text-foreground uppercase text-lg font-black">PROGRAM DISTRIBUTION</CardTitle>
            <CardDescription className="text-muted-foreground font-mono text-[10px] uppercase">Concentration of active sectors</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={programData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="program" stroke="var(--muted-foreground)" fontSize={10} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(13, 17, 23, 0.9)', borderColor: 'rgba(0, 236, 255, 0.2)', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="count" fill="#00ecff" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="neon-border text-center">
          <CardHeader>
            <CardTitle className="text-foreground uppercase text-lg font-black text-left">STATUS TELEMETRY</CardTitle>
            <CardDescription className="text-muted-foreground font-mono text-[10px] uppercase text-left">Operational state of all missions</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ status, count }) => count > 0 ? `${status}: ${count}` : null}
                  outerRadius={100}
                  innerRadius={70}
                  paddingAngle={8}
                  dataKey="count"
                  stroke="none"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(13, 17, 23, 0.9)', borderColor: 'rgba(110, 64, 201, 0.2)', borderRadius: '12px', color: '#fff' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Training-Specific Analytics */}
      <Card className="neon-border">
        <CardHeader className="border-b border-border/50 pb-8 mb-8">
          <CardTitle className="text-foreground uppercase text-xl font-black italic">MISSION-SPECIFIC INTEL</CardTitle>
          <CardDescription className="text-muted-foreground font-mono text-[10px] uppercase">Detailed telemetry for deep-dive analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-10">
          <div className="max-w-md">
            <label className="text-[10px] font-mono text-primary uppercase tracking-widest mb-2 block">SELECT TARGET SYSTEM</label>
            <Select value={selectedTraining} onValueChange={setSelectedTraining}>
              <SelectTrigger className="glass border-border/50 hover:border-primary/50 transition-colors h-12 rounded-xl text-foreground">
                <SelectValue placeholder="Choose a target training" />
              </SelectTrigger>
              <SelectContent className="glass border-primary/20">
                {trainings.map((training) => (
                  <SelectItem key={training.id} value={training.id} className="hover:bg-primary/10 transition-colors">
                    {training.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {trainingAnalytics && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Nominated', value: trainingAnalytics.totalNominated, color: 'bg-muted/50 border-l-muted' },
                  { label: 'Approved', value: trainingAnalytics.totalApproved, color: 'bg-primary/10 border-l-primary' },
                  { label: 'Attended', value: trainingAnalytics.totalAttended, color: 'bg-secondary/10 border-l-secondary' },
                  { label: 'Engagement', value: `${trainingAnalytics.attendanceRate}%`, color: 'bg-green-500/10 border-l-green-400' },
                ].map((stat, i) => (
                  <div key={i} className={`p-4 glass rounded-2xl border-l-4 transition-transform hover:scale-105 duration-300 ${stat.color}`}>
                    <p className="text-[10px] font-mono text-muted-foreground uppercase opacity-60">{stat.label}</p>
                    <p className="text-2xl font-black mt-1 text-foreground">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-sm font-mono text-primary uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                  <span className="size-2 bg-primary rounded-full animate-pulse shadow-[0_0_8px_rgba(0,236,255,1)]" />
                  Unit Participation Matrix
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={trainingAnalytics.byInstitution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="institutionName" stroke="var(--muted-foreground)" fontSize={10} angle={-30} textAnchor="end" height={100} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(13, 17, 23, 0.9)', borderColor: 'rgba(0, 236, 255, 0.2)', borderRadius: '12px', color: '#fff' }}
                    />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', fontFamily: 'monospace' }} />
                    <Bar dataKey="nominated" fill="rgba(255,255,255,0.1)" radius={[4, 4, 0, 0]} barSize={20} name="NOMINATED" />
                    <Bar dataKey="approved" fill="#00ecff" radius={[4, 4, 0, 0]} barSize={20} name="APPROVED" />
                    <Bar dataKey="attended" fill="#6e40c9" radius={[4, 4, 0, 0]} barSize={20} name="ATTENDED" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Analytics;
