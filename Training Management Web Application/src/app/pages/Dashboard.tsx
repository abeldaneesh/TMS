import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { analyticsApi, trainingsApi, BASE_URL } from '../../services/api';
import { DashboardStats, Training } from '../../types';
import { safeFormatDate } from '../../utils/date';

import FilterChips from '../components/FilterChips';
import HorizontalScrollList from '../components/HorizontalScrollList';
import MediaCard from '../components/MediaCard';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-lg text-primary animate-pulse font-medium">Loading content...</div>
      </div>
    );
  }

  // Derived data based on filter
  const upcomingTrainings = allTrainings
    .filter(t => t && t.date && new Date(t.date) > new Date() && t.status !== 'cancelled')
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const completedTrainings = allTrainings
    .filter(t => t && t.status === 'completed')
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const activeOrOngoing = allTrainings
    .filter(t => t && t.status === 'ongoing');

  const filters = [
    { value: 'all', label: 'All Activity' },
    { value: 'upcoming', label: 'Upcoming sessions' },
    { value: 'completed', label: 'Past training' },
    { value: 'action', label: 'Action required' },
  ];

  const quickActions = [
    {
      title: 'New Training',
      subtitle: 'Schedule a session',
      iconUrl: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&q=80&w=200&h=200',
      path: '/trainings/create',
      roles: ['master_admin', 'program_officer'],
    },
    {
      title: 'View Personnel',
      subtitle: 'Manage staff',
      iconUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=200&h=200',
      path: '/personnel',
      roles: ['master_admin'],
    },
    {
      title: 'Analytics',
      subtitle: 'System reports',
      iconUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=200&h=200',
      path: '/analytics',
      roles: ['master_admin', 'program_officer'],
    },
    {
      title: 'Settings',
      subtitle: 'App configuration',
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
        {/* Listen Again -> Quick Actions */}
        {user?.role !== 'participant' && (activeFilter === 'all' || activeFilter === 'action') && (
          <HorizontalScrollList
            title="Quick Actions"
            subtitle="Manage your tasks"
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

        {/* Start Radio -> Ongoing Trainings */}
        {activeOrOngoing.length > 0 && (activeFilter === 'all' || activeFilter === 'action') && (
          <HorizontalScrollList
            title="Ongoing Trainings"
            subtitle="Currently active sessions"
          >
            {activeOrOngoing.map(training => (
              <MediaCard
                key={training.id}
                id={training.id}
                title={training.title}
                subtitle={`${safeFormatDate(training.date)} • ${training.program}`}
                statusBadge="LIVE"
                statusColor="bg-red-600 text-white"
                onClick={() => navigate(`/trainings/${training.id}`)}
              />
            ))}
          </HorizontalScrollList>
        )}

        {/* Fresh Finds -> Upcoming Trainings */}
        {upcomingTrainings.length > 0 && (activeFilter === 'all' || activeFilter === 'upcoming') && (
          <HorizontalScrollList
            title="Upcoming Trainings"
            subtitle="Scheduled sessions"
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

        {/* Recommended -> Completed Trainings / Past */}
        {completedTrainings.length > 0 && (activeFilter === 'all' || activeFilter === 'completed') && (
          <HorizontalScrollList
            title="Past Trainings"
            subtitle="Completed sessions"
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

        {/* System Overview Details */}
        {user?.role === 'master_admin' && (activeFilter === 'all') && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">System Overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-secondary/20 p-6 rounded-lg text-center hover:bg-secondary/40 transition-colors">
                <p className="text-4xl font-bold mb-2 text-foreground">{stats.totalTrainings}</p>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Total Sessions</p>
              </div>
              <div className="bg-secondary/20 p-6 rounded-lg text-center hover:bg-secondary/40 transition-colors">
                <p className="text-4xl font-bold mb-2 text-foreground">{stats.attendanceRate}%</p>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Avg Attendance</p>
              </div>
              <div className="bg-secondary/20 p-6 rounded-lg text-center hover:bg-secondary/40 transition-colors">
                <p className="text-4xl font-bold mb-2 text-foreground">{stats.trainedStaff}</p>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Trained Staff</p>
              </div>
              <div className="bg-secondary/20 p-6 rounded-lg text-center hover:bg-secondary/40 transition-colors">
                <p className="text-4xl font-bold mb-2 text-foreground">{stats.untrainedStaff}</p>
                <p className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Pending Staff</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
