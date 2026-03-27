import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsApi, trainingsApi, institutionsApi } from '../../services/api';
import { Training, Institution, TrainingAnalytics } from '../../types';
import { BarChart3, TrendingUp, Users, Calendar, Search, X, CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { safeFormatDate } from '../../utils/date';
import {
  getTrainingDateInputValue,
  getTrainingSearchableDateText,
  getTrainingSortTimestamp,
  normalizeTrainingMatchValue,
} from '../../utils/trainingFilters';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer
} from 'recharts';
import LoadingScreen from '../components/LoadingScreen';

const formatTimeWindow = (startTime?: string, endTime?: string) =>
  startTime && endTime ? `${startTime} - ${endTime}` : '';

const Analytics: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedTraining, setSelectedTraining] = useState('');
  const [trainingSearchTerm, setTrainingSearchTerm] = useState('');
  const [trainingDateFilter, setTrainingDateFilter] = useState('');
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
    return <LoadingScreen />;
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
  const totalStatusCount = statusData.reduce((sum, item) => sum + item.count, 0);
  const leadingStatus = [...statusData].sort((first, second) => second.count - first.count)[0];
  const leadingPercentage = totalStatusCount > 0 && leadingStatus ? Math.round((leadingStatus.count / totalStatusCount) * 100) : 0;
  const searchableTrainings = [...safeTrainings].sort((a, b) => getTrainingSortTimestamp(b) - getTrainingSortTimestamp(a));
  const normalizedTrainingSearch = normalizeTrainingMatchValue(trainingSearchTerm);
  const filteredTrainings = searchableTrainings.filter((training) => {
    const matchesDate = !trainingDateFilter || getTrainingDateInputValue(training.date) === trainingDateFilter;
    if (!matchesDate) return false;

    if (!normalizedTrainingSearch) return true;

    const searchText = [
      training.title,
      training.program,
      training.description,
      getTrainingSearchableDateText(training.date),
      formatTimeWindow(training.startTime, training.endTime),
      training.status,
    ].join(' ');

    return normalizeTrainingMatchValue(searchText).includes(normalizedTrainingSearch);
  });
  const selectedTrainingRecord = safeTrainings.find((training) => training.id === selectedTraining);
  const selectedTrainingPinned = Boolean(
    selectedTrainingRecord && !filteredTrainings.some((training) => training.id === selectedTraining)
  );
  const visibleTrainings = filteredTrainings;

  return (
    <div className="pb-12 space-y-10 text-foreground">
      <div className="relative">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
          {t('analyticsPage.title')}
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t('analyticsPage.subtitle')}
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: t('analyticsPage.totalPrograms'), value: programData.length, icon: BarChart3 },
          { label: t('analyticsPage.totalTrainings'), value: safeTrainings.length, icon: Calendar },
          { label: t('analyticsPage.totalInstitutions'), value: safeInstitutions.length, icon: Users },
          { label: t('analyticsPage.attendanceRate'), value: trainingAnalytics ? `${trainingAnalytics.attendanceRate}%` : '-', icon: TrendingUp },
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
            <CardTitle className="text-foreground text-lg font-semibold">{t('analyticsPage.programDist')}</CardTitle>
            <CardDescription className="text-muted-foreground text-sm">{t('analyticsPage.programDistDesc')}</CardDescription>
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
            <CardTitle className="text-foreground text-lg font-semibold text-left">{t('analyticsPage.trainingStatus')}</CardTitle>
            <CardDescription className="text-muted-foreground text-sm text-left">{t('analyticsPage.trainingStatusDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-[220px_minmax(0,1fr)] md:items-center">
              <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-6 text-left">
                <p className="text-xs font-medium uppercase tracking-[0.24em] text-muted-foreground">Total trainings</p>
                <p className="mt-3 text-5xl font-bold text-foreground">{totalStatusCount}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {leadingStatus && leadingStatus.count > 0
                    ? `${leadingStatus.status} leads with ${leadingStatus.count} trainings`
                    : 'No status data available'}
                </p>
              </div>

              <div className="space-y-4 text-left">
                <div>
                  <div className="mb-2 flex items-center justify-between gap-3 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    <span>Status share</span>
                    <span>{leadingStatus?.status || 'No data'} {leadingPercentage > 0 ? `${leadingPercentage}%` : ''}</span>
                  </div>
                  <div className="flex h-4 overflow-hidden rounded-full bg-white/5">
                    {statusData.map((entry) => {
                      const width = totalStatusCount > 0 ? (entry.count / totalStatusCount) * 100 : 0;
                      return width > 0 ? (
                        <div
                          key={entry.status}
                          className="h-full"
                          style={{ width: `${width}%`, backgroundColor: entry.color }}
                          title={`${entry.status}: ${entry.count} / ${totalStatusCount}`}
                        />
                      ) : null;
                    })}
                  </div>
                </div>

                <div className="grid gap-3">
                  {statusData.map((entry) => {
                    const percentage = totalStatusCount > 0 ? Math.round((entry.count / totalStatusCount) * 100) : 0;
                    return (
                      <div key={entry.status} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <span className="size-3 rounded-full" style={{ backgroundColor: entry.color }} />
                            <div>
                              <p className="text-sm font-semibold text-foreground">{entry.status}</p>
                              <p className="text-xs text-muted-foreground">
                                {entry.count} / {totalStatusCount || 0} trainings
                              </p>
                            </div>
                          </div>
                          <p className="text-lg font-bold text-foreground">{percentage}%</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Training-Specific Analytics */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="border-b border-border/50 pb-6 mb-6">
          <CardTitle className="text-foreground text-xl font-bold">{t('analyticsPage.trainingIntel')}</CardTitle>
          <CardDescription className="text-muted-foreground text-sm">{t('analyticsPage.trainingIntelDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="max-w-3xl space-y-3">
            <Label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Calendar className="size-3" />
              {t('analyticsPage.selectTraining')}
            </Label>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex flex-col gap-3">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-primary/60" />
                  <Input
                    value={trainingSearchTerm}
                    onChange={(e) => setTrainingSearchTerm(e.target.value)}
                    placeholder={t('analyticsPage.trainingSearchPlaceholder', {
                      defaultValue: 'Search training title, program, or date',
                    })}
                    className="h-11 rounded-xl border-white/10 bg-background pl-10"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <div className="relative flex-1">
                    <CalendarDays className="pointer-events-none absolute left-3 top-3.5 size-4 text-primary/60" />
                    <Input
                      type="date"
                      value={trainingDateFilter}
                      onChange={(e) => setTrainingDateFilter(e.target.value)}
                      className="h-11 rounded-xl border-white/10 bg-background pl-10"
                    />
                  </div>

                  {(trainingSearchTerm || trainingDateFilter) && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setTrainingSearchTerm('');
                        setTrainingDateFilter('');
                      }}
                      className="sm:self-stretch"
                    >
                      <X className="mr-2 size-4" />
                      {t('analyticsPage.clearTrainingFilters', { defaultValue: 'Clear filters' })}
                    </Button>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-muted-foreground">
                  {t('analyticsPage.trainingShownCount', {
                    shown: filteredTrainings.length,
                    total: safeTrainings.length,
                    defaultValue: `${filteredTrainings.length} of ${safeTrainings.length} trainings shown`,
                  })}
                </p>
                {selectedTrainingPinned && (
                  <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                    {t('analyticsPage.selectedTrainingPinned', {
                      defaultValue: 'Selected training shown outside current filters',
                    })}
                  </Badge>
                )}
              </div>

              <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                {visibleTrainings.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-muted-foreground">
                    {t('analyticsPage.noTrainingMatches', {
                      defaultValue: 'No trainings matched your search or date filter.',
                    })}
                  </div>
                ) : (
                  visibleTrainings.map((training) => {
                    const isSelected = training.id === selectedTraining;

                    return (
                      <button
                        key={training.id}
                        type="button"
                        onClick={() => setSelectedTraining(training.id)}
                        className={`w-full rounded-xl border p-4 text-left transition-all ${
                          isSelected
                            ? 'border-primary bg-primary/5 shadow-sm'
                            : 'border-white/10 bg-background hover:border-primary/30'
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold text-foreground">{training.title}</p>
                              {isSelected && (
                                <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                                  {t('analyticsPage.selectedTrainingTag', { defaultValue: 'Selected' })}
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {safeFormatDate(training.date, 'MMM dd, yyyy')}
                              {formatTimeWindow(training.startTime, training.endTime) ? ` • ${formatTimeWindow(training.startTime, training.endTime)}` : ''}
                            </p>
                            {(training.program || training.description) && (
                              <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                                {[training.program, training.description].filter(Boolean).join(' • ')}
                              </p>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {training.program && (
                              <Badge variant="outline" className="border-white/10 bg-white/5 text-muted-foreground">
                                {training.program}
                              </Badge>
                            )}
                            <Badge variant="outline" className="border-white/10 bg-white/5 text-muted-foreground capitalize">
                              {training.status}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {trainingAnalytics && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: t('analyticsPage.nominated'), value: trainingAnalytics.totalNominated },
                  { label: t('analyticsPage.approved'), value: trainingAnalytics.totalApproved },
                  { label: t('analyticsPage.attended'), value: trainingAnalytics.totalAttended },
                  { label: t('analyticsPage.rate'), value: `${trainingAnalytics.attendanceRate}%` },
                ].map((stat, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-colors">
                    <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                    <p className="text-2xl font-bold mt-1 text-foreground">{stat.value}</p>
                  </div>
                ))}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-foreground mb-6">
                  {t('analyticsPage.participationByInst')}
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
