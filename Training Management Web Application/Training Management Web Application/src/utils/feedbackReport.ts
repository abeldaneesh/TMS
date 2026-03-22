import { format } from 'date-fns';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Training, TrainingFeedback, TrainingFeedbackSummary } from '../types';
import { downloadFile } from './fileDownloader';

const displayValue = (value: unknown, fallback = 'N/A') => {
    if (value === null || value === undefined) return fallback;
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : fallback;
};

const sanitizeFilePart = (value: string, fallback = 'feedback_report') =>
    displayValue(value, fallback).replace(/[^\w.-]+/g, '_');

const getVenueName = (training: Training | any) =>
    displayValue(training?.hall?.name || training?.hallId?.name || training?.hallId);

const getStatusLabel = (value: string) =>
    displayValue(value, 'unrated')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());

export const generateTrainingFeedbackPdf = async ({
    training,
    entries,
    summary,
    exportedByName,
    ratingFilterLabel,
    sortLabel,
}: {
    training: Training | any;
    entries: TrainingFeedback[];
    summary: TrainingFeedbackSummary;
    exportedByName?: string;
    ratingFilterLabel: string;
    sortLabel: string;
}) => {
    const doc = new jsPDF({ orientation: 'landscape' });
    const formattedDate = training?.date ? format(new Date(training.date), 'EEEE, MMMM d, yyyy') : 'N/A';
    const sessionTime = [displayValue(training?.startTime, ''), displayValue(training?.endTime, '')]
        .filter((entry) => entry && entry !== 'N/A')
        .join(' - ') || 'N/A';

    doc.setFontSize(20);
    doc.text('Training Feedback Report', 14, 18);

    doc.setFontSize(11);
    doc.text(`Training Title: ${displayValue(training?.title)}`, 14, 30);
    doc.text(`Program: ${displayValue(training?.program)}`, 14, 37);
    doc.text(`Date: ${formattedDate}`, 14, 44);
    doc.text(`Time: ${sessionTime}`, 14, 51);
    doc.text(`Venue / Hall: ${getVenueName(training)}`, 14, 58);

    doc.text(`Total Responses: ${summary.totalResponses}`, 210, 30);
    doc.text(`Average Rating: ${summary.averageRating ?? 'N/A'}`, 210, 37);
    doc.text(`Visible Entries: ${entries.length}`, 210, 44);
    doc.text(`Rating Filter: ${ratingFilterLabel}`, 210, 51);
    doc.text(`Sort Order: ${sortLabel}`, 210, 58);
    doc.text(`Exported On: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 210, 65);
    doc.text(`Exported By: ${displayValue(exportedByName, 'DMO TMS')}`, 210, 72);

    if (summary.commonTopics.length > 0) {
        const topicLine = `Common Themes: ${summary.commonTopics
            .map((topic) => `${topic.keyword} (${topic.count})`)
            .join(', ')}`;
        const wrappedTopics = doc.splitTextToSize(topicLine, 268);
        doc.text(wrappedTopics, 14, 68);
    }

    const rows = entries.length > 0
        ? entries.map((entry, index) => ([
            String(index + 1),
            displayValue(entry.participantName, 'Participant'),
            entry.submittedAt ? format(new Date(entry.submittedAt), 'MMM d, yyyy h:mm a') : 'N/A',
            entry.rating ? `${entry.rating} / 5` : 'No rating',
            getStatusLabel(entry.sentiment),
            displayValue(entry.suggestions),
            displayValue(entry.futureTrainingRequests),
            displayValue(entry.arrangementsFeedback),
            displayValue(entry.overallExperience, 'Not provided'),
        ]))
        : [['1', 'No feedback entries match the current filters.', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A', 'N/A']];

    autoTable(doc, {
        startY: summary.commonTopics.length > 0 ? 82 : 78,
        head: [[
            '#',
            'Participant',
            'Submitted',
            'Rating',
            'Sentiment',
            'Suggestions',
            'Future Requests',
            'Arrangements',
            'Overall Experience',
        ]],
        body: rows,
        theme: 'grid',
        styles: {
            fontSize: 8.5,
            cellPadding: 3,
            valign: 'top',
            overflow: 'linebreak',
        },
        headStyles: {
            fillColor: [32, 53, 92],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
        },
        columnStyles: {
            0: { cellWidth: 10, halign: 'center' },
            1: { cellWidth: 28 },
            2: { cellWidth: 28 },
            3: { cellWidth: 18, halign: 'center' },
            4: { cellWidth: 22 },
            5: { cellWidth: 56 },
            6: { cellWidth: 52 },
            7: { cellWidth: 52 },
            8: { cellWidth: 34 },
        },
        margin: { left: 14, right: 14, bottom: 18 },
    });

    const pdfBlob = doc.output('blob');
    await downloadFile(
        pdfBlob,
        `${sanitizeFilePart(training?.title, 'training')}_feedback_report_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        'application/pdf'
    );
};
