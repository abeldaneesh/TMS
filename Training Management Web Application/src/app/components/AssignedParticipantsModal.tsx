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
import { nominationsApi } from '../../services/api';
import { Nomination } from '../../types';
import { Loader2, UserX } from 'lucide-react';

interface AssignedParticipantsModalProps {
    isOpen: boolean;
    onClose: () => void;
    trainingId: string;
    trainingTitle: string;
}

const AssignedParticipantsModal: React.FC<AssignedParticipantsModalProps> = ({
    isOpen,
    onClose,
    trainingId,
    trainingTitle,
}) => {
    const [participants, setParticipants] = useState<Nomination[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen && trainingId) {
            const fetchParticipants = async () => {
                setLoading(true);
                try {
                    const data = await nominationsApi.getAll({ trainingId });
                    // Filter for approved or attended participants
                    const assigned = data.filter(nom =>
                        nom.status === 'approved' || nom.status === 'attended'
                    );
                    setParticipants(assigned);
                } catch (error) {
                    console.error('Failed to fetch assigned participants:', error);
                } finally {
                    setLoading(false);
                }
            };

            fetchParticipants();
        }
    }, [isOpen, trainingId]);

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Assigned Participants: {trainingTitle}</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="animate-spin size-8 text-blue-600" />
                    </div>
                ) : participants.length === 0 ? (
                    <div className="text-center p-8 text-gray-500 flex flex-col items-center">
                        <UserX className="size-12 mb-2 text-gray-300" />
                        <p>No participants assigned to this training yet.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Designation</TableHead>
                                <TableHead>Institution</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {participants.map((nom) => (
                                <TableRow key={nom.id}>
                                    <TableCell className="font-medium">
                                        {nom.participant?.name || 'Unknown'}
                                    </TableCell>
                                    <TableCell>{nom.participant?.email || 'N/A'}</TableCell>
                                    <TableCell>{nom.participant?.designation || 'N/A'}</TableCell>
                                    <TableCell>{nom.institution?.name || 'N/A'}</TableCell>
                                    <TableCell className="capitalize">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${nom.status === 'attended'
                                                ? 'bg-blue-100 text-blue-800'
                                                : 'bg-green-100 text-green-800'
                                            }`}>
                                            {nom.status}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default AssignedParticipantsModal;
