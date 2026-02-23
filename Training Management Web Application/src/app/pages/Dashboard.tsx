import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsApi, trainingsApi, BASE_URL } from '../../services/api';
import { DashboardStats, Training } from '../../types';
import { safeFormatDate } from '../../utils/date';
import { useTranslation } from 'react-i18next';
import LoadingScreen from '../components/LoadingScreen';

import FilterChips from '../components/FilterChips';
import HorizontalScrollList from '../components/HorizontalScrollList';
import MediaCard from '../components/MediaCard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [allTrainings, setAllTrainings] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [statsData, trainingsData] = await Promise.all([
          analyticsApi.getDashboardStats(user.id, user.role),
          trainingsApi.getAll(user.role === 'program_officer' ? { createdById: user.id } : {}),
        ]);

        setStats(statsData);
        setAllTrainings(Array.isArray(trainingsData) ? trainingsData : []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading || !stats) {
    return <LoadingScreen />;
  }

  // Derived data based on filter
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const upcomingTrainings = allTrainings
    .filter(t => {
      if (!t || t.status === 'cancelled') return false;
      // If participant, hide if already attended
      if (user?.role === 'participant' && t.userStatus === 'attended') return false;

      const tDate = new Date(t.date);
      tDate.setHours(0, 0, 0, 0);
      return tDate >= today && t.status === 'scheduled';
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const completedTrainings = allTrainings
    .filter(t => {
      if (!t) return false;
      // If participant, it's completed for them IF they attended OR the training is officially completed
      if (user?.role === 'participant') {
        return t.userStatus === 'attended' || t.status === 'completed';
      }
      return t.status === 'completed';
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeOrOngoing = allTrainings
    .filter(t => {
      if (!t) return false;
      if (user?.role === 'participant' && t.userStatus === 'attended') return false;
      return t.status === 'ongoing';
    });

  const actionRequired = allTrainings
    .filter(t => {
      if (!t) return false;
      if (user?.role === 'participant') {
        // Action: Nominations I haven't attended yet for active trainings
        return (t.status === 'ongoing' || t.status === 'scheduled') && t.userStatus !== 'attended';
      }
      // For PO/Admin, ongoing training is always an action area
      return t.status === 'ongoing';
    });

  const filters = [
    { value: 'all', label: t('dashboard.filters.all', 'All Activity') },
    { value: 'upcoming', label: t('dashboard.filters.upcoming', 'Upcoming sessions') },
    { value: 'completed', label: t('dashboard.filters.completed', 'Past training') },
    { value: 'action', label: t('dashboard.filters.action', 'Action required') },
  ];

  const quickActions = [
    {
      title: t('dashboard.actions.newTraining.title', 'New Training'),
      subtitle: t('dashboard.actions.newTraining.subtitle', 'Schedule a session'),
      iconUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=200&h=200',
      path: '/trainings/create',
      roles: ['master_admin', 'program_officer'],
    },
    {
      title: t('dashboard.actions.viewPersonnel.title', 'View Personnel'),
      subtitle: t('dashboard.actions.viewPersonnel.subtitle', 'Manage staff'),
      iconUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=200&h=200',
      path: '/personnel',
      roles: ['master_admin'],
    },
    {
      title: t('dashboard.actions.analytics.title', 'Analytics'),
      subtitle: t('dashboard.actions.analytics.subtitle', 'System reports'),
      iconUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=200&h=200',
      path: '/analytics',
      roles: ['master_admin', 'program_officer'],
    },
    {
      title: t('dashboard.actions.settings.title', 'Settings'),
      subtitle: t('dashboard.actions.settings.subtitle', 'App configuration'),
      iconUrl: 'https://images.unsplash.com/photo-1496247749665-49cf5b1022e9?auto=format&fit=crop&q=80&w=200&h=200',
      path: '/settings',
      roles: ['master_admin', 'program_officer'],
    },
  ];

  const getProfileAvatarUrl = () => {
    if (!user?.profilePicture) return "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=200&h=200";
    return user.profilePicture.startsWith('http') ? user.profilePicture : `${BASE_URL}${user.profilePicture}`;
  };

  return (
    <div className="pb-12 text-foreground">
      {/* Filters (YouTube Music style pill buttons) */}
      <FilterChips
        options={filters}
        selectedValue={activeFilter}
        onChange={setActiveFilter}
      />

      <div className="space-y-4">
        {/* Quick Actions */}
        {user?.role !== 'participant' && (activeFilter === 'all' || activeFilter === 'action') && quickActions.filter(a => !a.roles || (user?.role && a.roles.includes(user.role))).length > 0 && (
          <HorizontalScrollList
            title={t('dashboard.sections.quickActions.title', 'Quick Actions')}
            subtitle={t('dashboard.sections.quickActions.subtitle', 'Manage your tasks')}
            avatarUrl={getProfileAvatarUrl()}
          >
            {quickActions
              .filter(action => !action.roles || (user?.role && action.roles.includes(user.role)))
              .map((action, i) => (
                <MediaCard
                  key={i}
                  id={`action-${i}`}
                  title={action.title}
                  subtitle={action.subtitle}
                  imageUrl={action.iconUrl}
                  onClick={() => navigate(action.path)}
                />
              ))}
          </HorizontalScrollList>
        )}

        {/* Action Required / Ongoing Trainings */}
        {actionRequired.length > 0 && (activeFilter === 'all' || activeFilter === 'action') && (
          <HorizontalScrollList
            title={activeFilter === 'action' ? t('dashboard.sections.actionRequired.title', 'Action Required') : t('dashboard.sections.ongoing.title', 'Ongoing Trainings')}
            subtitle={activeFilter === 'action' ? t('dashboard.sections.actionRequired.subtitle', 'Items needing your attention') : t('dashboard.sections.ongoing.subtitle', 'Currently active sessions')}
          >
            {actionRequired.map(training => (
              <MediaCard
                key={training.id}
                id={training.id}
                title={training.title}
                subtitle={`${safeFormatDate(training.date)} • ${training.program}`}
                statusBadge={training.status === 'ongoing' ? "LIVE" : (training.userStatus === 'approved' ? "CONFIRMED" : "NOMINATED")}
                statusColor={training.status === 'ongoing' ? "bg-red-600 text-white" : "bg-blue-600 text-white"}
                onClick={() => navigate(`/trainings/${training.id}`)}
              />
            ))}
          </HorizontalScrollList>
        )}

        {/* Upcoming Trainings */}
        {upcomingTrainings.length > 0 && (activeFilter === 'all' || activeFilter === 'upcoming') && (
          <HorizontalScrollList
            title={t('dashboard.sections.upcoming.title', 'Upcoming Trainings')}
            subtitle={t('dashboard.sections.upcoming.subtitle', 'Scheduled sessions')}
          >
            {upcomingTrainings.map(training => (
              <MediaCard
                key={training.id}
                id={training.id}
                title={training.title}
                subtitle={`${safeFormatDate(training.date)} • ${training.capacity} participants`}
                onClick={() => navigate(`/trainings/${training.id}`)}
              />
            ))}
          </HorizontalScrollList>
        )}

        {/* Completed Trainings / Past */}
        {completedTrainings.length > 0 && (activeFilter === 'all' || activeFilter === 'completed') && (
          <HorizontalScrollList
            title={t('dashboard.sections.past.title', 'Past Trainings')}
            subtitle={t('dashboard.sections.past.subtitle', 'Completed sessions')}
          >
            {completedTrainings.map(training => (
              <MediaCard
                key={training.id}
                id={training.id}
                title={training.title}
                subtitle={`${safeFormatDate(training.date)}`}
                onClick={() => navigate(`/trainings/${training.id}`)}
              />
            ))}
          </HorizontalScrollList>
        )}

        {/* Empty States */}
        {activeFilter === 'upcoming' && upcomingTrainings.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
            <p className="text-xl">{t('dashboard.noUpcoming', 'No upcoming sessions scheduled.')}</p>
          </div>
        )}
        {activeFilter === 'completed' && completedTrainings.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
            <p className="text-xl">{t('dashboard.noPast', 'No past training history found.')}</p>
          </div>
        )}
        {activeFilter === 'action' && actionRequired.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
            <p className="text-xl">{t('dashboard.noAction', 'Great job! No urgent actions required.')}</p>
          </div>
        )}
        {activeFilter === 'all' && upcomingTrainings.length === 0 && completedTrainings.length === 0 && actionRequired.length === 0 && (
          <div className="py-20 text-center text-muted-foreground">
            <p className="text-xl">{t('dashboard.noActivity', 'No activity found in your library.')}</p>
          </div>
        )}

        {/* System Overview Details */}
        {user?.role === 'master_admin' && (activeFilter === 'all') && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">{t('dashboard.systemOverview', 'System Overview')}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-secondary/20 p-6 rounded-lg text-center hover:bg-secondary/40 transition-colors">
                <p className="text-4xl font-bold mb-2 text-foreground">{stats.totalTrainings}</p>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{t('dashboard.stats.totalTrainings', 'Total Sessions')}</p>
              </div>
              <div className="bg-secondary/20 p-6 rounded-lg text-center hover:bg-secondary/40 transition-colors">
                <p className="text-4xl font-bold mb-2 text-foreground">{stats.attendanceRate}%</p>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{t('dashboard.stats.avgAttendance', 'Avg Attendance')}</p>
              </div>
              <div className="bg-secondary/20 p-6 rounded-lg text-center hover:bg-secondary/40 transition-colors">
                <p className="text-4xl font-bold mb-2 text-foreground">{stats.trainedStaff}</p>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{t('dashboard.stats.trainedStaff', 'Trained Staff')}</p>
              </div>
              <div className="bg-secondary/20 p-6 rounded-lg text-center hover:bg-secondary/40 transition-colors">
                <p className="text-4xl font-bold mb-2 text-foreground">{stats.untrainedStaff}</p>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">{t('dashboard.stats.pendingStaff', 'Pending Staff')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
