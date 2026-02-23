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

    // --- Decorative Background / Border ---
    // Dark base
    doc.setFillColor(10, 11, 14);
    doc.rect(0, 0, pageWidth, pageHeight, 'F');

    // Cyberpunk Border
    doc.setDrawColor(0, 236, 255); // Primary Cyan
    doc.setLineWidth(1);
    doc.rect(5, 5, pageWidth - 10, pageHeight - 10, 'S');

    doc.setDrawColor(110, 64, 201); // Secondary Purple
    doc.setLineWidth(0.5);
    doc.rect(7, 7, pageWidth - 14, pageHeight - 14, 'S');

    // Corner accents
    const accentSize = 20;
    doc.setDrawColor(0, 236, 255);
    doc.setLineWidth(2);
    // Top Left
    doc.line(5, 5, 5 + accentSize, 5);
    doc.line(5, 5, 5, 5 + accentSize);
    // Bottom Right
    doc.line(pageWidth - 5, pageHeight - 5, pageWidth - 5 - accentSize, pageHeight - 5);
    doc.line(pageWidth - 5, pageHeight - 5, pageWidth - 5, pageHeight - 5 - accentSize);

    // --- Content ---

    // Header
    doc.setTextColor(0, 236, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(40);
    doc.text('CERTIFICATE', pageWidth / 2, 45, { align: 'center' });

    doc.setFontSize(20);
    doc.setTextColor(255, 255, 255);
    doc.text('OF PARTICIPATION', pageWidth / 2, 58, { align: 'center' });

    // "This is to certify that"
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(150, 150, 150);
    doc.text('This mission debrief confirms that', pageWidth / 2, 80, { align: 'center' });

    // Participant Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(32);
    doc.setTextColor(255, 255, 255);
    doc.text(data.participantName.toUpperCase(), pageWidth / 2, 100, { align: 'center' });

    // Separator line
    doc.setDrawColor(255, 255, 255, 0.2);
    doc.line(pageWidth / 4, 108, (pageWidth * 3) / 4, 108);

    // Achievement text
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.setTextColor(150, 150, 150);
    doc.text('has successfully completed the strategic training mission', pageWidth / 2, 125, { align: 'center' });

    // Training Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.setTextColor(0, 236, 255);
    doc.text(data.trainingTitle.toUpperCase(), pageWidth / 2, 140, { align: 'center' });

    // Program and Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(150, 150, 150);
    doc.text(`Program Sector: ${data.programName} | Verified on: ${safeFormatDate(data.date, 'MMMM do, yyyy')}`, pageWidth / 2, 150, { align: 'center' });

    // Location / Institution
    doc.text(`Sector Node: ${data.institutionName}`, pageWidth / 2, 158, { align: 'center' });

    // Signatures
    const sigLineY = 185;
    const sigWidth = 60;

    // Trainer Signature
    doc.setDrawColor(0, 236, 255, 0.5);
    doc.line(pageWidth / 4 - sigWidth / 2, sigLineY, pageWidth / 4 + sigWidth / 2, sigLineY);
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(data.trainerName, pageWidth / 4, sigLineY + 5, { align: 'center' });
    doc.setTextColor(100, 100, 100);
    doc.text('Commanding Officer', pageWidth / 4, sigLineY + 10, { align: 'center' });

    // System Verification
    doc.setDrawColor(110, 64, 201, 0.5);
    doc.line((pageWidth * 3) / 4 - sigWidth / 2, sigLineY, (pageWidth * 3) / 4 + sigWidth / 2, sigLineY);
    doc.setTextColor(255, 255, 255);
    doc.text('DMO TMS CORE', (pageWidth * 3) / 4, sigLineY + 5, { align: 'center' });
    doc.setTextColor(100, 100, 100);
    doc.text('Automated Verification', (pageWidth * 3) / 4, sigLineY + 10, { align: 'center' });

    // Download PDF
    const pdfBlob = doc.output('blob');
    const fileName = `Certificate_${data.participantName.replace(/\s+/g, '_')}_${data.trainingTitle.replace(/\s+/g, '_')}.pdf`;

    await downloadFile(
        pdfBlob,
        fileName,
        'application/pdf'
    );
};
