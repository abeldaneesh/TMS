import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Eye, Calendar, Clock, MapPin, CheckCircle } from 'lucide-react';
import { attendanceApi } from '../../services/api';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import LoadingScreen from '../components/LoadingScreen';

const MyAttendance: React.FC = () => {
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const data = await attendanceApi.getMyHistory();
                setAttendanceHistory(data);
            } catch (error) {
                console.error('Failed to fetch attendance history', error);
                toast.error('Failed to load attendance history');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, []);

    const getMethodBadge = (method: string) => {
        return method === 'qr'
            ? <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">QR Scan</Badge>
            : <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">Manual</Badge>;
    };

    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold">My Attendance</h1>
                <p className="text-gray-500 mt-1">History of trainings you have attended</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Attended Trainings</CardTitle>
                </CardHeader>
                <CardContent>
                    {attendanceHistory.length === 0 ? (
                        <div className="text-center py-12">
                            <CheckCircle className="size-12 mx-auto text-gray-300 mb-3" />
                            <p className="text-gray-500">No attendance records found.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Training</TableHead>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>Venue</TableHead>
                                        <TableHead>Method</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {attendanceHistory.map((record) => (
                                        <TableRow key={record.id}>
                                            <TableCell>
                                                <div className="font-medium text-base">
                                                    {record.training?.title || 'Unknown Training'}
                                                </div>
                                                <div className="text-sm text-gray-500">
                                                    {record.training?.program}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <Calendar className="size-4 text-gray-400" />
                                                    {record.training?.date ? format(new Date(record.training.date), 'MMM dd, yyyy') : 'N/A'}
                                                </div>
                                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                                    <Clock className="size-4 text-gray-400" />
                                                    {record.training?.startTime} - {record.training?.endTime}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <MapPin className="size-4 text-gray-400" />
                                                    {record.training?.hall?.name || 'Unknown Hall'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {getMethodBadge(record.method)}
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {format(new Date(record.timestamp), 'h:mm a')}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {record.training && (
                                                    <Button variant="ghost" size="sm" onClick={() => navigate(`/trainings/${record.training.id}`)}>
                                                        <Eye className="size-4 mr-2" />
                                                        View Details
                                                    </Button>
                                                )}
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

export default MyAttendance;
