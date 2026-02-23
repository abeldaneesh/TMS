import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '../components/ui/table';
import { Button } from '../components/ui/button';
import { nominationsApi, trainingsApi } from '../../services/api';
import { Nomination, Training } from '../../types';
import { Loader2, UserMinus, ArrowLeft, Users } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';

const TrainingParticipants: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [training, setTraining] = useState<Training | null>(null);
    const [participants, setParticipants] = useState<Nomination[]>([]);
    const [loading, setLoading] = useState(true);

    const checkAuthorization = (t: Training) => {
        if (user?.role === 'master_admin') return true;
        if (user?.role === 'program_officer' && t.createdById === user.id) return true;
        return false;
    };

    const fetchData = async () => {
        if (!id) return;
        setLoading(true);
        try {
            const [trainingData, nominationsData] = await Promise.all([
                trainingsApi.getById(id),
                nominationsApi.getAll({ trainingId: id })
            ]);

            if (!checkAuthorization(trainingData)) {
                toast.error("Not authorized to manage participants for this training.");
                navigate('/trainings');
                return;
            }

            setTraining(trainingData);

            // Only show approved and attended participants
            const activeParticipants = nominationsData.filter(nom =>
                nom.status === 'approved' || nom.status === 'attended'
            );
            setParticipants(activeParticipants);
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('Could not load participants');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [id, user]);

    const handleRemoveParticipant = async (nominationId: string, participantName: string) => {
        if (!window.confirm(`Are you sure you want to completely remove ${participantName} from this training? They will be notified that their status was rejected.`)) {
            return;
        }

        try {
            await nominationsApi.updateStatus(nominationId, 'rejected', 'Removed from training by Administrator/Program Officer');
            toast.success(`Removed ${participantName} from training`);
            fetchData(); // Refresh list
        } catch (error) {
            console.error('Error removing participant:', error);
            toast.error('Failed to remove participant');
        }
    };

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="animate-spin size-8 text-primary" />
            </div>
        );
    }

    if (!training) {
        return <div>Training not found.</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <Button variant="outline" size="icon" onClick={() => navigate('/trainings')}>
                    <ArrowLeft className="size-4" />
                </Button>
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Participants</h1>
                    <p className="text-muted-foreground">{training.title}</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="size-5" />
                        Assigned Personnel
                    </CardTitle>
                    <CardDescription>
                        Total Assigned: {participants.length}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {participants.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground max-w-sm mx-auto">
                            <Users className="size-12 mx-auto mb-4 opacity-20" />
                            <p>No participants are currently assigned to this training session.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Participant</TableHead>
                                        <TableHead>Contact & Role</TableHead>
                                        <TableHead>Institution</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {participants.map((nom) => (
                                        <TableRow key={nom.id}>
                                            <TableCell>
                                                <div className="font-medium">{nom.participant?.name || 'Unknown'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm text-muted-foreground">{nom.participant?.email}</div>
                                                <div className="text-xs text-muted-foreground mt-0.5">{nom.participant?.designation}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{nom.institution?.name || 'N/A'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
                                                    ${nom.status === 'attended' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
                                                        : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'}
                                                `}>
                                                    {nom.status.charAt(0).toUpperCase() + nom.status.slice(1)}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleRemoveParticipant(nom.id, nom.participant?.name || 'Unknown')}
                                                    className="h-8 gap-1.5"
                                                    disabled={nom.status === 'attended'}
                                                    title={nom.status === 'attended' ? "Cannot remove someone who already attended" : "Remove user from training"}
                                                >
                                                    <UserMinus className="size-3.5" />
                                                    <span className="hidden sm:inline">Remove</span>
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default TrainingParticipants;
