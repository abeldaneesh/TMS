import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { safeFormatDate } from './date';
import { downloadFile } from './fileDownloader';

interface CertificateData {
    participantName: string;
    trainingTitle: string;
    programName: string;
    date: Date | string;
    trainerName: string;
    institutionName: string;
}

export const generateCertificatePDF = async (data: CertificateData) => {
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // --- Formal Background ---
    // Ivory / Cream Background
    doc.setFillColor(253, 252, 240);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // --- Elegant Borders ---
    // Outer Navy Border
    doc.setDrawColor(0, 32, 96); // Navy blue
    doc.setLineWidth(1.5);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20, 'S');

    // Inner Gold Border
    doc.setDrawColor(184, 134, 11); // Dark gold
    doc.setLineWidth(0.5);
    doc.rect(13, 13, pageWidth - 26, pageHeight - 26, 'S');

    // Ornamental Corners (Traditional)
    doc.setDrawColor(184, 134, 11);
    doc.setLineWidth(1);
    const cornerSize = 15;
    // Top Left
    doc.line(10, 10 + cornerSize, 10 + cornerSize, 10);
    // Top Right
    doc.line(pageWidth - 10, 10 + cornerSize, pageWidth - 10 - cornerSize, 10);
    // Bottom Left
    doc.line(10, pageHeight - 10 - cornerSize, 10 + cornerSize, pageHeight - 10);
    // Bottom Right
    doc.line(pageWidth - 10, pageHeight - 10 - cornerSize, pageWidth - 10 - cornerSize, pageHeight - 10);

    // --- Header ---
    doc.setTextColor(0, 32, 96); // Navy
    doc.setFont('times', 'bold');
    doc.setFontSize(44);
    doc.text('CERTIFICATE', pageWidth / 2, 45, { align: 'center' });

    doc.setFontSize(22);
    doc.text('OF APPRECIATION', pageWidth / 2, 58, { align: 'center' });

    // --- Content ---
    doc.setFont('times', 'italic');
    doc.setFontSize(16);
    doc.setTextColor(60, 60, 60);
    doc.text('This is to certify that', pageWidth / 2, 80, { align: 'center' });

    // Participant Name
    doc.setFont('times', 'bold');
    doc.setFontSize(36);
    doc.setTextColor(0, 32, 96);
    doc.text(data.participantName, pageWidth / 2, 105, { align: 'center' });

    // Achievement text
    doc.setFont('times', 'italic');
    doc.setFontSize(16);
    doc.setTextColor(60, 60, 60);
    doc.text('has successfully completed the training program on', pageWidth / 2, 125, { align: 'center' });

    // Training Title
    doc.setFont('times', 'bold');
    doc.setFontSize(30);
    doc.setTextColor(139, 101, 8); // Deep Gold/Brown
    doc.text(data.trainingTitle.toUpperCase(), pageWidth / 2, 142, { align: 'center' });

    // Program and Location
    doc.setFont('times', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(80, 80, 80);
    doc.text(`Conducted under the ${data.programName} program`, pageWidth / 2, 154, { align: 'center' });
    doc.text(`at ${data.institutionName}`, pageWidth / 2, 162, { align: 'center' });

    // Date
    doc.setFont('times', 'italic');
    doc.text(`Presented on this day, ${safeFormatDate(data.date, 'MMMM do, yyyy')}`, pageWidth / 2, 172, { align: 'center' });

    // --- Signatures ---
    const sigLineY = 192;
    const sigWidth = 70;

    // Left Signature (Trainer)
    doc.setDrawColor(0, 32, 96, 0.3);
    doc.line(pageWidth / 4 - sigWidth / 2, sigLineY, pageWidth / 4 + sigWidth / 2, sigLineY);
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 32, 96);
    doc.text(data.trainerName, pageWidth / 4, sigLineY + 6, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('Program Officer', pageWidth / 4, sigLineY + 11, { align: 'center' });

    // Right Signature (Official)
    doc.setDrawColor(0, 32, 96, 0.3);
    doc.line((pageWidth * 3) / 4 - sigWidth / 2, sigLineY, (pageWidth * 3) / 4 + sigWidth / 2, sigLineY);
    doc.setFont('times', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 32, 96);
    doc.text('Training Management System', (pageWidth * 3) / 4, sigLineY + 6, { align: 'center' });
    doc.setFont('times', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text('DMO Verification Authority', (pageWidth * 3) / 4, sigLineY + 11, { align: 'center' });

    // Final Touch: Gold Seal representation (Circle)
    doc.setDrawColor(184, 134, 11);
    doc.setLineWidth(0.5);
    doc.circle(pageWidth / 2, 188, 10, 'S');
    doc.setFontSize(8);
    doc.text('OFFICIAL', pageWidth / 2, 187, { align: 'center' });
    doc.text('SEAL', pageWidth / 2, 191, { align: 'center' });

    // Download PDF
    const pdfBlob = doc.output('blob');
    const fileName = `Certificate_${data.participantName.replace(/\s+/g, '_')}_${data.trainingTitle.replace(/\s+/g, '_')}.pdf`;

    await downloadFile(
        pdfBlob,
        fileName,
        'application/pdf'
    );
};
