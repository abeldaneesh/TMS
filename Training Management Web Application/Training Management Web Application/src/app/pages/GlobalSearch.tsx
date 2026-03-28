import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AppWindowMac, ChevronRight, FileText, Search, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';
import { Training, User } from '../../types';
import { safeFormatDate } from '../../utils/date';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import LoadingScreen from '../components/LoadingScreen';

type ReportResult = {
    id: string;
    title: string;
    description: string;
    path: string;
    keywords: string;
};

const normalizeValue = (value?: string) => (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
const getEntityId = (value: any) => value?.id || value?._id || '';

const GlobalSearch: React.FC = () => {
    const { user } = useAuth();
    const { t } = useTranslation();
    const location = useLocation();
    const navigate = useNavigate();

    const [draftQuery, setDraftQuery] = useState('');
    const [trainings, setTrainings] = useState<Training[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);

    const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
    const query = searchParams.get('q') || '';
    const normalizedQuery = normalizeValue(query);
    const canSearchUsers = user?.role === 'master_admin' || user?.role === 'institutional_admin' || user?.role === 'medical_officer';

    useEffect(() => {
        setDraftQuery(query);
    }, [query]);

    useEffect(() => {
        if (!user || !normalizedQuery) {
            setTrainings([]);
            setUsers([]);
            setLoading(false);
            return;
        }

        let cancelled = false;

        const fetchSearchData = async () => {
            setLoading(true);

            const trainingParams =
                user.role === 'institutional_admin' && user.institutionId
                    ? { institutionId: user.institutionId }
                    : {};

            const requests: Promise<any>[] = [
                api.get('/trainings', { params: trainingParams }),
            ];

            if (canSearchUsers) {
                requests.push(api.get('/users'));
            }

            const results = await Promise.allSettled(requests);
            if (cancelled) return;

            const trainingsResult = results[0];
            if (trainingsResult.status === 'fulfilled') {
                const trainingData = Array.isArray(trainingsResult.value.data) ? trainingsResult.value.data : [];
                setTrainings(trainingData);
            } else {
                console.error('Failed to fetch trainings for global search', trainingsResult.reason);
                setTrainings([]);
            }

            if (canSearchUsers) {
                const usersResult = results[1];
                if (usersResult?.status === 'fulfilled') {
                    setUsers(Array.isArray(usersResult.value.data) ? usersResult.value.data : []);
                } else {
                    console.error('Failed to fetch users for global search', usersResult && 'reason' in usersResult ? usersResult.reason : null);
                    setUsers([]);
                }
            } else {
                setUsers([]);
            }

            setLoading(false);
        };

        fetchSearchData();

        return () => {
            cancelled = true;
        };
    }, [canSearchUsers, normalizedQuery, user]);

    const handleSubmitSearch = (event: React.FormEvent) => {
        event.preventDefault();
        const trimmed = draftQuery.trim();
        if (!trimmed) return;
        navigate(`/search?q=${encodeURIComponent(trimmed)}`);
    };

    const reportResults = useMemo<ReportResult[]>(() => {
        const items: ReportResult[] = [
            {
                id: 'reports-home',
                title: 'Reports & Analytics',
                description: 'Open the report generator and export center.',
                path: '/reports',
                keywords: 'reports analytics exports pdf csv generator summary dashboard',
            },
            {
                id: 'training-reports',
                title: 'Training Reports',
                description: 'Generate attendance and session reports for trainings.',
                path: '/reports?type=training',
                keywords: 'training report attendance session participant pdf csv',
            },
            {
                id: 'institution-reports',
                title: 'Institution Reports',
                description: 'Review institution-level training coverage and exports.',
                path: '/reports?type=institution',
                keywords: 'institution report staff coverage participation export',
            },
        ];

        if (user?.role === 'master_admin' || user?.role === 'program_officer') {
            items.push({
                id: 'district-summary',
                title: 'District Summary Reports',
                description: 'Open district-wide analytics and summary exports.',
                path: '/reports?type=district',
                keywords: 'district summary reports analytics overall totals',
            });
        }

        if (user?.role === 'participant') {
            items.push({
                id: 'attendance-summary',
                title: 'My Attendance Report',
                description: 'View and export your attendance totals and percentage.',
                path: '/my-attendance',
                keywords: 'my attendance report percentage summary total participant',
            });
        }

        return items.filter((item) => normalizeValue(`${item.title} ${item.description} ${item.keywords}`).includes(normalizedQuery));
    }, [normalizedQuery, user?.role]);

    const trainingResults = useMemo(() => {
        if (!normalizedQuery) return [];

        return trainings
            .filter((training) => {
                const searchableText = [
                    training.title,
                    training.program,
                    training.description,
                    safeFormatDate(training.date),
                    training.status,
                ].join(' ');

                return normalizeValue(searchableText).includes(normalizedQuery);
            })
            .slice(0, 8);
    }, [normalizedQuery, trainings]);

    const userResults = useMemo(() => {
        if (!normalizedQuery || !canSearchUsers) return [];

        return users
            .filter((entry) => {
                const searchableText = [
                    entry.name,
                    entry.email,
                    entry.department,
                    entry.designation,
                    entry.role,
                ].join(' ');

                return normalizeValue(searchableText).includes(normalizedQuery);
            })
            .slice(0, 8);
    }, [canSearchUsers, normalizedQuery, users]);

    const totalResults = trainingResults.length + userResults.length + reportResults.length;

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <div className="mx-auto max-w-6xl space-y-8 pb-12">
            <div className="space-y-2">
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('globalSearch.title', 'Global Search')}</h1>
                <p className="text-sm text-muted-foreground">
                    {t('globalSearch.subtitle', 'Search trainings, users, and reports from one place.')}
                </p>
            </div>

            <Card className="border-border bg-card shadow-sm">
                <CardContent className="p-5">
                    <form onSubmit={handleSubmitSearch} className="flex flex-col gap-3 md:flex-row">
                        <div className="relative flex-1">
                            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                value={draftQuery}
                                onChange={(e) => setDraftQuery(e.target.value)}
                                placeholder={t('globalSearch.placeholder', 'Search trainings, users, reports')}
                                className="h-12 rounded-full bg-secondary/30 pl-11"
                            />
                        </div>
                        <Button type="submit" className="h-12 rounded-full px-6">
                            <Search className="mr-2 size-4" />
                            {t('globalSearch.searchButton', 'Search')}
                        </Button>
                    </form>

                    {normalizedQuery ? (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                                {totalResults} result{totalResults === 1 ? '' : 's'}
                            </Badge>
                            {!canSearchUsers && (
                                <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                                    User results are available for admin roles
                                </Badge>
                            )}
                        </div>
                    ) : (
                        <p className="mt-4 text-sm text-muted-foreground">
                            {t('globalSearch.emptyState', 'Type a keyword to search across trainings, users, and reports.')}
                        </p>
                    )}
                </CardContent>
            </Card>

            {normalizedQuery && totalResults === 0 && (
                <Card className="border-border bg-card shadow-sm">
                    <CardContent className="py-14 text-center">
                        <p className="text-lg font-semibold text-foreground">{t('globalSearch.noResultsTitle', 'No results found')}</p>
                        <p className="mt-2 text-sm text-muted-foreground">
                            {t('globalSearch.noResultsBody', 'Try a different training title, user name, email, or report keyword.')}
                        </p>
                    </CardContent>
                </Card>
            )}

            {trainingResults.length > 0 && (
                <Card className="border-border bg-card shadow-sm">
                    <CardHeader className="border-b border-border pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <AppWindowMac className="size-5 text-primary" />
                            Trainings
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {trainingResults.map((training) => (
                            <button
                                key={getEntityId(training)}
                                type="button"
                                onClick={() => navigate(`/trainings/${getEntityId(training)}`)}
                                className="flex w-full items-center justify-between gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-muted/30"
                            >
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground">{training.title}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {training.program} • {safeFormatDate(training.date)} • {training.status}
                                    </p>
                                </div>
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                            </button>
                        ))}
                    </CardContent>
                </Card>
            )}

            {userResults.length > 0 && (
                <Card className="border-border bg-card shadow-sm">
                    <CardHeader className="border-b border-border pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <Users className="size-5 text-primary" />
                            Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {userResults.map((entry) => (
                            <button
                                key={getEntityId(entry)}
                                type="button"
                                onClick={() => navigate(`/user/${getEntityId(entry)}`)}
                                className="flex w-full items-center justify-between gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-muted/30"
                            >
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground">{entry.name}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        {entry.email} • {(entry.designation || entry.role || 'User').replace(/_/g, ' ')}
                                    </p>
                                </div>
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                            </button>
                        ))}
                    </CardContent>
                </Card>
            )}

            {reportResults.length > 0 && (
                <Card className="border-border bg-card shadow-sm">
                    <CardHeader className="border-b border-border pb-4">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <FileText className="size-5 text-primary" />
                            Reports
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        {reportResults.map((report) => (
                            <button
                                key={report.id}
                                type="button"
                                onClick={() => navigate(report.path)}
                                className="flex w-full items-center justify-between gap-4 border-b border-border px-5 py-4 text-left transition-colors last:border-b-0 hover:bg-muted/30"
                            >
                                <div className="min-w-0">
                                    <p className="font-semibold text-foreground">{report.title}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{report.description}</p>
                                </div>
                                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                            </button>
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default GlobalSearch;
