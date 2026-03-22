import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from './ui/table';
import api from '../../services/api';
import { Attendance } from '../../types';
import { format } from 'date-fns';
import { Loader2, UserX } from 'lucide-react';

interface AttendanceListModalProps {
    isOpen: boolean;
    onClose: () => void;
    trainingId: string;
    trainingTitle: string;
}

const AttendanceListModal: React.FC<AttendanceListModalProps> = ({
    isOpen,
    onClose,
    trainingId,
    trainingTitle,
}) => {
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && trainingId) {
            const fetchAttendance = async () => {
                setLoading(true);
                try {
                    const { data } = await api.get(`/attendance/${trainingId}`);
                    setAttendances(data);
                } catch (error) {
                    console.error('Failed to fetch attendance:', error);
                } finally {
                    setLoading(false);
                }
            };

            fetchAttendance();
        }
    }, [isOpen, trainingId]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Attendance: {trainingTitle}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin size-8 text-blue-600" />
                    </div>
                ) : attendances.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 flex flex-col items-center">
                        <UserX className="size-12 mb-2 text-gray-300" />
                        <p>No attendance records found for this training.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead>Time</TableHead>
                                <TableHead>Method</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {attendances.map((record) => (
                                <TableRow key={record.id}>
                                    <TableCell className="font-medium">
                                        {record.participant?.name || 'Unknown'}
                                    </TableCell>
                                    <TableCell>{record.participant?.email || 'N/A'}</TableCell>
                                    <TableCell>{record.participant?.designation || 'N/A'}</TableCell>
                                    <TableCell>
                                        {record.timestamp
                                            ? format(new Date(record.timestamp), 'PP p')
                                            : 'N/A'}
                                    </TableCell>
                                    <TableCell className="capitalize">{record.method}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AttendanceListModal;
