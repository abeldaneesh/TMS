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
        setTrainingAnalytics(analytics && typeof analytics === 'object' ? analytics : null);
      } catch (error) {
        console.error('Error fetching analytics:', error);
        setTrainingAnalytics(null);
      }
    };
    fetchAnalytics();
  }, [selectedTraining]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-primary animate-pulse font-medium">Loading analytics...</div>
      </div>
    );
  }

  const safeTrainings = Array.isArray(trainings) ? trainings.filter(Boolean) : [];
  const safeInstitutions = Array.isArray(institutions) ? institutions.filter(Boolean) : [];

  const programData = safeTrainings.reduce((acc, training) => {
    if (!training || !training.program) return acc;
    const existing = acc.find(item => item.program === training.program);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ program: training.program, count: 1 });
    }
    return acc;
  }, [] as { program: string; count: number }[]);

  const statusData = [
    { status: 'Scheduled', count: safeTrainings.filter(t => t.status === 'scheduled').length, color: '#00ecff' },
    { status: 'Completed', count: safeTrainings.filter(t => t.status === 'completed').length, color: '#6e40c9' },
    { status: 'Ongoing', count: safeTrainings.filter(t => t.status === 'ongoing').length, color: '#238636' },
    { status: 'Cancelled', count: safeTrainings.filter(t => t.status === 'cancelled').length, color: '#f85149' },
  ];

  return (
    <div className="pb-12 space-y-10 text-foreground">
      <div className="relative">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
          Platform Analytics
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Overview of training programs and engagement
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Programs', value: programData.length, icon: BarChart3 },
          { label: 'Total Trainings', value: safeTrainings.length, icon: Calendar },
          { label: 'Total Institutions', value: safeInstitutions.length, icon: Users },
          { label: 'Attendance Rate', value: trainingAnalytics ? `${trainingAnalytics.attendanceRate}%` : '-', icon: TrendingUp },
        ].map((stat, i) => (
          <Card key={i} className="bg-white/5 border-white/10 overflow-hidden group hover:bg-white/10 transition-colors">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <p className="text-3xl font-bold mt-2 text-foreground group-hover:text-primary transition-colors">{stat.value}</p>
                </div>
                <div className="text-muted-foreground p-3 rounded-full bg-white/5 group-hover:text-primary transition-colors">
                  <stat.icon className="size-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-foreground text-lg font-semibold">Program Distribution</CardTitle>
            <CardDescription className="text-muted-foreground text-sm">Trainings categorized by program</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={programData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                <XAxis dataKey="program" stroke="var(--muted-foreground)" fontSize={10} angle={-45} textAnchor="end" height={80} />
                <YAxis stroke="var(--muted-foreground)" fontSize={10} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: 'rgba(13, 17, 23, 0.9)', borderColor: 'rgba(0, 236, 255, 0.2)', borderRadius: '12px', color: '#fff' }}
                />
                <Bar dataKey="count" fill="#ff0000" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10 text-center">
          <CardHeader>
            <CardTitle className="text-foreground text-lg font-semibold text-left">Training Status</CardTitle>
            <CardDescription className="text-muted-foreground text-sm text-left">Current status of all scheduled trainings</CardDescription>
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
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="border-b border-border/50 pb-6 mb-6">
          <CardTitle className="text-foreground text-xl font-bold">Training Specific Intel</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">Detailed telemetry for deep-dive analysis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="max-w-md">
            <label className="text-sm font-medium text-muted-foreground mb-2 block">Select Training</label>
            <Select value={selectedTraining} onValueChange={setSelectedTraining}>
              <SelectTrigger className="bg-white/5 border-white/10 hover:border-white/20 transition-colors h-12 rounded-lg text-foreground">
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
                  { label: 'Nominated', value: trainingAnalytics.totalNominated },
                  { label: 'Approved', value: trainingAnalytics.totalApproved },
                  { label: 'Attended', value: trainingAnalytics.totalAttended },
                  { label: 'Rate', value: `${trainingAnalytics.attendanceRate}%` },
                ].map((stat, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1 text-foreground">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  Participation by Institution
                </h3>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={trainingAnalytics.byInstitution}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" vertical={false} />
                    <XAxis dataKey="institutionName" stroke="var(--muted-foreground)" fontSize={10} angle={-30} textAnchor="end" height={100} axisLine={false} tickLine={false} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={10} axisLine={false} tickLine={false} />
                    <Tooltip
                      cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      contentStyle={{ backgroundColor: 'rgba(13, 17, 23, 0.9)', borderColor: 'rgba(0, 236, 255, 0.2)', borderRadius: '12px', color: '#fff' }}
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px', fontSize: '12px', color: 'rgba(255,255,255,0.6)' }} />
                    <Bar dataKey="nominated" fill="rgba(255,255,255,0.2)" radius={[4, 4, 0, 0]} barSize={20} name="Nominated" />
                    <Bar dataKey="approved" fill="#aaaaaa" radius={[4, 4, 0, 0]} barSize={20} name="Approved" />
                    <Bar dataKey="attended" fill="#ff0000" radius={[4, 4, 0, 0]} barSize={20} name="Attended" />
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
