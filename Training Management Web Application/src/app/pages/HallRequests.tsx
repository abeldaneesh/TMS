import React, { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { hallRequestsApi } from '../../services/api';
import { HallBookingRequest } from '../../types';
import { Check, X, Clock, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import LoadingAnimation from '../components/LoadingAnimation';

const HallRequests: React.FC = () => {
    const { user } = useAuth();
    const [requests, setRequests] = useState<HallBookingRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchRequests = async () => {
        try {
            const data = await hallRequestsApi.getAll();
            setRequests(data);
        } catch (error) {
            console.error('Error fetching requests:', error);
            toast.error('Failed to load hall requests');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, []);

    const handleAction = async (id: string, action: 'approved' | 'rejected') => {
        try {
            await hallRequestsApi.updateStatus(id, action);
            toast.success(`Request ${action} successfully`);
            fetchRequests(); // Refresh list
        } catch (error: any) {
            console.error(`Error ${action} request:`, error);
            toast.error(error.response?.data?.message || `Failed to ${action} request`);
        }
    };

    if (loading) return <div className="flex items-center justify-center min-h-[50vh]"><LoadingAnimation text="Loading Requests..." /></div>;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">Hall Booking Requests</h1>
                <p className="text-gray-500 mt-1">Manage hall approval requests from Program Officers</p>
            </div>

            <div className="grid gap-4">
                {requests.length === 0 ? (
                    <Card>
                        <CardContent className="p-8 text-center text-gray-500">
                            No pending requests found.
                        </CardContent>
                    </Card>
                ) : (
                    requests.map((request) => (
                        <Card key={request.id} className="overflow-hidden">
                            <div className="flex flex-col md:flex-row md:items-center justify-between p-6 gap-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-semibold text-lg">
                                            {(request.trainingId as any)?.title || 'Unknown Training'}
                                        </h3>
                                        <Badge variant={request.status === 'pending' ? 'outline' : request.status === 'approved' ? 'default' : 'destructive'}>
                                            {request.status.toUpperCase()}
                                        </Badge>
                                        {request.priority === 'urgent' && (
                                            <Badge variant="destructive" className="flex items-center gap-1">
                                                <AlertCircle className="size-3" /> Urgent
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="text-sm text-gray-600">
                                        Requested by <strong>{(request.requestedBy as any)?.name}</strong> for <strong>{(request.hallId as any)?.name}</strong>
                                    </p>
                                    <p className="text-sm text-gray-500 flex items-center gap-1">
                                        <Clock className="size-3" />
                                        {new Date((request.trainingId as any)?.date).toLocaleDateString()} | {(request.trainingId as any)?.startTime} - {(request.trainingId as any)?.endTime}
                                    </p>
                                    {request.remarks && (
                                        <div className="mt-2 text-sm bg-gray-50 p-2 rounded">
                                            <span className="font-medium">Remarks:</span> {request.remarks}
                                        </div>
                                    )}
                                </div>

                                {request.status === 'pending' && (
                                    <div className="flex items-center gap-2">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                            onClick={() => handleAction(request.id, 'approved')}
                                        >
                                            <Check className="size-4 mr-1" />
                                            Approve
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                            onClick={() => handleAction(request.id, 'rejected')}
                                        >
                                            <X className="size-4 mr-1" />
                                            Reject
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
};

export default HallRequests;
