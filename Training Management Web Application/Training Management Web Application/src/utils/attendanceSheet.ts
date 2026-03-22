import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Nomination, Training } from '../types';
import { downloadFile } from './fileDownloader';

const displayValue = (value: any, fallback = 'N/A') => {
    if (value === null || value === undefined) return fallback;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : fallback;
};

const getTrainingVenue = (training: Training | any) =>
    displayValue(training?.hall?.name || training?.hallId?.name || training?.venue);

const getProgramOfficerName = (training: Training | any, fallbackName?: string) =>
    displayValue(
        training?.creator?.name ||
        training?.createdBy?.name ||
        training?.trainer?.name ||
        training?.trainerId?.name ||
        fallbackName,
        'Program Officer'
    );

const getParticipantName = (nomination: Nomination | any) =>
    displayValue(
        nomination?.participant?.name ||
        nomination?.participantSnapshot?.fullName ||
        nomination?.participantSnapshot?.name,
        'Participant'
    );

const getParticipantDesignation = (nomination: Nomination | any) =>
    displayValue(
        nomination?.participant?.designation ||
        nomination?.participantSnapshot?.designation ||
        nomination?.participantSnapshot?.role
    );

const getParticipantInstitution = (nomination: Nomination | any) =>
    displayValue(
        nomination?.institution?.name ||
        nomination?.participantSnapshot?.institutionName
    );

const sanitizeFilePart = (value: string, fallback = 'attendance_sheet') =>
    displayValue(value, fallback).replace(/[^\w.-]+/g, '_');

export const generateAttendanceSheetPdf = async ({
    training,
    participants,
    generatedByName,
}: {
    training: Training | any;
    participants: Nomination[];
    generatedByName?: string;
}) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const formattedDate = training?.date ? format(new Date(training.date), 'EEEE, MMMM d, yyyy') : 'N/A';
    const sessionTime = [displayValue(training?.startTime, ''), displayValue(training?.endTime, '')]
        .filter((entry) => entry !== 'N/A' && entry !== '')
        .join(' - ') || 'N/A';

    doc.setFontSize(20);
    doc.text('Training Attendance Sign-In Sheet', 14, 18);

    doc.setFontSize(11);
    doc.text(`Training Title: ${displayValue(training?.title)}`, 14, 30);
    doc.text(`Date: ${formattedDate}`, 14, 37);
    doc.text(`Time: ${sessionTime}`, 14, 44);
    doc.text(`Venue / Hall: ${getTrainingVenue(training)}`, 14, 51);
    doc.text(`Trainer / Program Officer: ${getProgramOfficerName(training, generatedByName)}`, 14, 58);
    doc.text(`Participants: ${participants.length}`, 220, 30);
    doc.text(`Generated On: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 220, 37);

    const rows = participants.length > 0
        ? participants.map((nomination, index) => ([
            String(index + 1),
            getParticipantName(nomination),
            getParticipantDesignation(nomination),
            getParticipantInstitution(nomination),
            '',
        ]))
        : [['1', 'No participants assigned', 'N/A', 'N/A', '']];

    autoTable(doc, {
        startY: 68,
        head: [['S/N', 'Participant Name', 'Designation / Role', 'Institution', 'Signature']],
        body: rows,
        theme: 'grid',
        styles: {
            fontSize: 10,
            cellPadding: 4,
            valign: 'middle',
            minCellHeight: 16,
        },
        headStyles: {
            fillColor: [32, 53, 92],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { cellWidth: 14, halign: 'center' },
            1: { cellWidth: 74 },
            2: { cellWidth: 60 },
            3: { cellWidth: 74 },
            4: { cellWidth: 58 },
        },
        margin: { left: 14, right: 14, bottom: 18 },
    });

    const footerY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 12 : 190;
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text('Use this sheet as an offline fallback for attendance capture. Manual entries should be entered into the system after the session if QR check-in was missed.', 14, footerY);

    const pdfBlob = doc.output('blob');
    await downloadFile(
        pdfBlob,
        `${sanitizeFilePart(training?.title, 'training')}_attendance_sheet_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        'application/pdf'
    );
};
