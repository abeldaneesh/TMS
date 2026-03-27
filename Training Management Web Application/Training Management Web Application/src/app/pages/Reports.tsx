import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import {
  trainingsApi, analyticsApi, institutionsApi, nominationsApi,
  attendanceApi, usersApi, hallsApi
} from '../../services/api';
import { Training, Institution, Nomination, Attendance, User, Hall } from '../../types';
import { FileText, Download, FileDown, Calendar, Building2, Cpu, ShieldCheck, Settings2, BarChart3, Search, X } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import DateInputWithPickerIcon from '../components/DateInputWithPickerIcon';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Label } from '../components/ui/label';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import Papa from 'papaparse';
import { format } from 'date-fns';
import { safeFormatDate } from '../../utils/date';
import { toast } from 'sonner';
import { downloadFile } from '../../utils/fileDownloader';
import {
  getTrainingDateInputValue,
  getTrainingSearchableDateText,
  getTrainingSortTimestamp,
  normalizeTrainingMatchValue,
} from '../../utils/trainingFilters';

const getEntityId = (value: any): string => {
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  return value?.id || value?._id || '';
};

const asDisplayValue = (value: any, fallback = 'N/A'): string => {
  if (value === null || value === undefined) return fallback;
  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : fallback;
};

const formatExportDate = (value: any, formatStr: string = 'MMM dd, yyyy'): string => {
  const formatted = safeFormatDate(value, formatStr);
  return formatted === 'Invalid Date' ? 'N/A' : formatted;
};

const formatStatusLabel = (value: any, fallback = 'Unknown'): string => {
  const normalized = asDisplayValue(value, fallback).replace(/_/g, ' ').toLowerCase();
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
};

const sanitizeFilePart = (value: string, fallback = 'report'): string =>
  asDisplayValue(value, fallback).replace(/[^\w.-]+/g, '_');

const formatTimeWindow = (startTime: any, endTime: any): string => {
  const start = asDisplayValue(startTime, '');
  const end = asDisplayValue(endTime, '');
  if (start && end) return `${start} - ${end}`;
  return start || end || 'N/A';
};

const formatPhoneForCsv = (value: any): string => {
  const normalized = asDisplayValue(value, '');
  if (!normalized) return 'N/A';
  return /^[\d+\-\s()]+$/.test(normalized) ? `="${normalized}"` : normalized;
};

const getArchivedParticipantLabel = (fullName?: string, isArchived?: boolean) => {
  const baseName = asDisplayValue(fullName, 'Participant (Removed)');
  if (baseName === 'Participant (Removed)') return baseName;
  return isArchived ? `${baseName} (Archived)` : baseName;
};

const getUserInstitutionId = (entry: User): string =>
  getEntityId(entry.institution) || getEntityId(entry.institutionId);

const getAttendanceStatusLabel = (attendanceRecord?: Attendance | null) => {
  if (!attendanceRecord) return 'Absent';
  const isLate = attendanceRecord.attendanceType === 'late';
  const marker = asDisplayValue(attendanceRecord.markedByName, '');
  const markerSuffix = isLate && marker ? ` - Marked by ${marker}` : '';
  const timeSuffix = attendanceRecord.timestamp ? ` at ${formatExportDate(attendanceRecord.timestamp, 'hh:mm a')}` : '';
  if (isLate) return `Present (Late${markerSuffix}${timeSuffix})`;
  if (attendanceRecord.method === 'manual') return 'Present (Manual)';
  if (attendanceRecord.method === 'qr') return 'Present (QR)';
  return 'Present';
};

const Reports: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedReport, setSelectedReport] = useState('');
  const [selectedTraining, setSelectedTraining] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [trainingSearchTerm, setTrainingSearchTerm] = useState('');
  const [trainingDateFilter, setTrainingDateFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const currentInstitutionId = getEntityId(user?.institution) || getEntityId(user?.institutionId);
  const isInstitutionScopedUser = user?.role === 'institutional_admin';

  const ensureCurrentInstitutionOption = (items: Institution[]) => {
    if (!currentInstitutionId) return items;
    if (items.some((entry) => getEntityId(entry) === currentInstitutionId)) return items;

    return [
      {
        id: currentInstitutionId,
        name: asDisplayValue(user?.institution?.name, 'My Institution'),
        type: 'institution',
        location: '',
        createdAt: new Date(),
      } as Institution,
      ...items,
    ];
  };

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [trainingsData, institutionsData] = await Promise.all([
          trainingsApi.getAll(user.role === 'program_officer' ? { createdById: user.id } : {}),
          institutionsApi.getAll(),
        ]);
        setTrainings(Array.isArray(trainingsData) ? trainingsData : []);
        setInstitutions(ensureCurrentInstitutionOption(Array.isArray(institutionsData) ? institutionsData : []));

        if (isInstitutionScopedUser && currentInstitutionId) {
          setSelectedInstitution(currentInstitutionId);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        setInstitutions(ensureCurrentInstitutionOption([]));
        toast.error(t('reportsPage.failLoad'));
      }
    };
    fetchData();
  }, [user, currentInstitutionId]);

  useEffect(() => {
    if (isInstitutionScopedUser && currentInstitutionId) {
      setSelectedInstitution(currentInstitutionId);
    }
  }, [isInstitutionScopedUser, currentInstitutionId, selectedReport]);

  useEffect(() => {
    if (selectedReport !== 'training') {
      setTrainingSearchTerm('');
      setTrainingDateFilter('');
    }
  }, [selectedReport]);

  const buildTrainingParticipantRows = (
    nominations: Nomination[],
    attendanceRecords: Attendance[],
    allUsers: User[],
    allInstitutions: Institution[]
  ) => {
    return nominations.map((nomination) => {
      const nominationAny = nomination as any;
      const participant =
        nomination.participant ||
        allUsers.find((entry) => getEntityId(entry) === nomination.participantId);
      const attendanceRecord =
        attendanceRecords.find((entry) => entry.participantId === nomination.participantId) ||
        attendanceRecords.find((entry) => getEntityId(entry.participant) === nomination.participantId);
      const trainingSnapshot = Array.isArray((nominationAny.training as any)?.participantSnapshots)
        ? (nominationAny.training as any).participantSnapshots.find((entry: any) => String(entry.participantId) === String(nomination.participantId))
        : undefined;
      const participantSnapshot =
        nominationAny.participantSnapshot ||
        trainingSnapshot ||
        (attendanceRecord as any)?.participantSnapshot;
      const institution =
        nomination.institution ||
        allInstitutions.find((entry) => getEntityId(entry) === nomination.institutionId) ||
        (participant?.institutionId
          ? allInstitutions.find((entry) => getEntityId(entry) === participant.institutionId)
          : undefined);
      const isArchivedParticipant = Boolean((participant as any)?.isDeleted || participantSnapshot?.isDeleted || (!participant && participantSnapshot));

      return {
        trainingTitle: asDisplayValue((nomination.training as any)?.title) !== 'N/A'
          ? asDisplayValue((nomination.training as any)?.title)
          : asDisplayValue(trainings.find((entry) => getEntityId(entry) === nomination.trainingId)?.title),
        participantName: getArchivedParticipantLabel(participant?.name || participantSnapshot?.fullName, isArchivedParticipant),
        designation: asDisplayValue(participant?.designation || participantSnapshot?.designation || participantSnapshot?.role),
        department: asDisplayValue(participant?.department || participantSnapshot?.department),
        institutionName: asDisplayValue(institution?.name || participantSnapshot?.institutionName),
        institutionType: asDisplayValue(institution?.type),
        phone: asDisplayValue(participant?.phone || participantSnapshot?.phone),
        email: asDisplayValue(participant?.email || participantSnapshot?.email),
        nominationStatus: formatStatusLabel(nomination.status),
        attended: getAttendanceStatusLabel(attendanceRecord),
        attendanceMethod: attendanceRecord
          ? attendanceRecord.attendanceType === 'late'
            ? 'Late Manual Entry'
            : attendanceRecord.method === 'manual'
              ? 'Sign-in Sheet'
              : attendanceRecord.method === 'qr'
                ? 'QR Scan'
                : formatStatusLabel(attendanceRecord.method)
          : 'Not marked',
        attendanceTimestamp: attendanceRecord ? formatExportDate(attendanceRecord.timestamp, 'yyyy-MM-dd HH:mm:ss') : 'Not marked',
        nominatedAt: formatExportDate(nomination.nominatedAt, 'yyyy-MM-dd HH:mm:ss'),
        attendanceType: attendanceRecord?.attendanceType === 'late'
          ? 'Late'
          : attendanceRecord?.method === 'manual'
            ? 'Manual'
            : attendanceRecord?.method === 'qr'
              ? 'QR'
              : attendanceRecord
                ? 'Present'
                : 'Absent',
        attendanceMarkedBy: attendanceRecord?.markedByName || 'N/A',
      };
    });
  };

  const getTrainingAnalyticsSnapshot = (nominations: Nomination[], attendanceRecords: Attendance[]) => {
    const approvedCount = nominations.filter((entry) => ['approved', 'attended'].includes(entry.status)).length;
    const attendedCount = attendanceRecords.length;
    const nominatedCount = nominations.length;

    return {
      totalNominated: nominatedCount,
      totalApproved: approvedCount,
      totalAttended: attendedCount,
      attendanceRate: nominatedCount > 0 ? Math.round((attendedCount / nominatedCount) * 100) : 0,
    };
  };

  const getInstitutionExportData = async (institutionId: string) => {
    const [reportRes, usersRes, nominationsRes] = await Promise.all([
      analyticsApi.getInstitutionReport(institutionId),
      usersApi.getAll().catch(() => []),
      nominationsApi.getAll({ institutionId }).catch(() => []),
    ]);

    const allUsers = Array.isArray(usersRes) ? usersRes : [];
    const nominations = Array.isArray(nominationsRes) ? nominationsRes : [];
    const trainingIds = Array.from(
      new Set(
        nominations
          .map((entry) => getEntityId(entry.trainingId))
          .filter((entry) => entry.length > 0)
      )
    );

    const attendanceResults = await Promise.all(
      trainingIds.map((trainingId) => attendanceApi.getAll({ trainingId }).catch(() => []))
    );

    const trainedParticipantIds = new Set<string>();
    attendanceResults.flat().forEach((attendanceRecord) => {
      const participantId =
        getEntityId(attendanceRecord.participantId) ||
        getEntityId(attendanceRecord.participant);
      if (participantId) trainedParticipantIds.add(participantId);
    });

    const untrainedStaff = allUsers.filter((entry) => {
      const belongsToInstitution = getUserInstitutionId(entry) === institutionId;
      const isInstitutionStaff = entry.role !== 'master_admin' && entry.role !== 'program_officer';
      return belongsToInstitution && isInstitutionStaff && !trainedParticipantIds.has(getEntityId(entry));
    });

    return { report: reportRes, untrainedStaff };
  };

  const generateTrainingReportPDF = async (trainingId: string) => {
    try {
      const training = trainings.find(t => t.id === trainingId);
      if (!training) return;

      const [analyticsRes, nominationsRes, attendanceRes, usersRes, hallsRes] = await Promise.all([
        analyticsApi.getTrainingAnalytics(trainingId).catch(() => null),
        nominationsApi.getAll({ trainingId }).catch(() => []),
        attendanceApi.getAll({ trainingId }).catch(() => []),
        usersApi.getAll().catch(() => []),
        hallsApi.getAll().catch(() => []),
      ]);

      const analyticsResObj = analyticsRes || { totalNominated: 0, totalApproved: 0, totalAttended: 0, attendanceRate: 0 };
      let nominations = Array.isArray(nominationsRes) ? nominationsRes : [];
      let attendanceRecords = Array.isArray(attendanceRes) ? attendanceRes : [];
      const allUsers = Array.isArray(usersRes) ? usersRes : [];
      const halls = Array.isArray(hallsRes) ? hallsRes : [];

      // Filter data only for institution-scoped admins
      if (user?.role === 'institutional_admin' && currentInstitutionId) {
        nominations = nominations.filter((n) => getEntityId(n.institutionId) === currentInstitutionId);
        const institutionalParticipantIds = nominations.map((n) => getEntityId(n.participantId));
        attendanceRecords = attendanceRecords.filter((a) => institutionalParticipantIds.includes(getEntityId(a.participantId)));
      }

      const analytics = user?.role === 'institutional_admin'
        ? getTrainingAnalyticsSnapshot(nominations, attendanceRecords)
        : {
            totalNominated: analyticsResObj.totalNominated ?? nominations.length,
            totalApproved: analyticsResObj.totalApproved ?? nominations.filter((entry: Nomination) => ['approved', 'attended'].includes(entry.status)).length,
            totalAttended: analyticsResObj.totalAttended ?? attendanceRecords.length,
            attendanceRate: analyticsResObj.attendanceRate ?? getTrainingAnalyticsSnapshot(nominations, attendanceRecords).attendanceRate,
          };

      const hall = halls.find((entry) => getEntityId(entry) === training.hallId);
      const trainer = allUsers.find((entry) => getEntityId(entry) === training.trainerId);
      const participantRows = buildTrainingParticipantRows(nominations, attendanceRecords, allUsers, institutions);

      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.text('Training Report', 14, 20);

      // Training Details
      doc.setFontSize(12);
      doc.text(`Training Title: ${asDisplayValue(training.title)}`, 14, 35);
      doc.setFontSize(10);
      doc.text(`Program Area: ${asDisplayValue(training.program)}`, 14, 42);
      doc.text(`Scheduled Date: ${formatExportDate(training.date)}`, 14, 49);
      doc.text(`Time Window: ${asDisplayValue(training.startTime)} - ${asDisplayValue(training.endTime)}`, 14, 56);
      doc.text(`Venue: ${asDisplayValue(hall?.name)}`, 14, 63);
      doc.text(`Trainer: ${asDisplayValue(trainer?.name)}`, 14, 70);
      doc.text(`Status: ${formatStatusLabel(training.status)}`, 14, 77);

      // Summary Statistics
      doc.setFontSize(14);
      doc.text('Attendance Analytics', 14, 90);
      doc.setFontSize(10);
      doc.text(`Total Nominated: ${analytics.totalNominated}`, 14, 97);
      doc.text(`Total Approved: ${analytics.totalApproved}`, 14, 104);
      doc.text(`Total Attended: ${analytics.totalAttended}`, 14, 111);
      doc.text(`Attendance Rate: ${analytics.attendanceRate}%`, 14, 118);

      // Participants Table
      const participantData = participantRows.length > 0
        ? participantRows.map((entry) => [
            entry.participantName,
            entry.designation,
            entry.institutionName,
            entry.nominationStatus,
            entry.attended,
          ])
        : [['No participant records found', 'N/A', 'N/A', 'N/A', 'N/A']];

      autoTable(doc, {
        startY: 130,
        head: [['Participant Name', 'Designation', 'Institution', 'Status', 'Attendance']],
        body: participantData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 80, 150] }, // Professional Navy
      });

      // Download PDF
      const pdfBlob = doc.output('blob');
      await downloadFile(
        pdfBlob,
        `Training_Report_${sanitizeFilePart(training.title, 'training')}_${formatExportDate(new Date(), 'yyyy-MM-dd')}.pdf`,
        'application/pdf'
      );
      toast.success(t('reportsPage.reportReady'));
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(t('reportsPage.failPdf'));
    }
  };

  const generateTrainingReportCSV = async (trainingId: string) => {
    try {
      const training = trainings.find(t => t.id === trainingId);
      if (!training) return;

      const [nominationsRes, attendanceRes, usersRes, hallsRes] = await Promise.all([
        nominationsApi.getAll({ trainingId }).catch(() => []),
        attendanceApi.getAll({ trainingId }).catch(() => []),
        usersApi.getAll().catch(() => []),
        hallsApi.getAll().catch(() => []),
      ]);

      let nominations = Array.isArray(nominationsRes) ? nominationsRes : [];
      let attendanceRecords = Array.isArray(attendanceRes) ? attendanceRes : [];
      const allUsers = Array.isArray(usersRes) ? usersRes : [];
      const halls = Array.isArray(hallsRes) ? hallsRes : [];

      // Filter data only for institution-scoped admins
      if (user?.role === 'institutional_admin' && currentInstitutionId) {
        nominations = nominations.filter((n) => getEntityId(n.institutionId) === currentInstitutionId);
        const institutionalParticipantIds = nominations.map((n) => getEntityId(n.participantId));
        attendanceRecords = attendanceRecords.filter((a) => institutionalParticipantIds.includes(getEntityId(a.participantId)));
      }

      const hall = halls.find((entry) => getEntityId(entry) === training.hallId);
      const trainer = allUsers.find((entry) => getEntityId(entry) === training.trainerId);
      const participantRows = buildTrainingParticipantRows(nominations, attendanceRecords, allUsers, institutions).map((entry) => ({
        'Participant': entry.participantName,
        'Designation': entry.designation,
        'Department': entry.department,
        'Institution': entry.institutionName,
        'Phone': formatPhoneForCsv(entry.phone),
        'Email': entry.email,
        'Nomination': entry.nominationStatus,
        'Attendance': entry.attendanceType === 'Late'
          ? 'Late'
          : entry.attendanceMethod === 'Not marked'
            ? 'Absent'
            : 'Present',
        'Method': entry.attendanceMethod,
        'Attendance At': entry.attendanceTimestamp,
        'Marked By': entry.attendanceMarkedBy,
        'Signature': '',
      }));

      if (participantRows.length === 0) {
        participantRows.push({
          'Participant': 'No participant records found',
          'Designation': 'N/A',
          'Department': 'N/A',
          'Institution': 'N/A',
          'Phone': 'N/A',
          'Email': 'N/A',
          'Nomination': 'N/A',
          'Attendance': 'Absent',
          'Method': 'Not marked',
          'Attendance At': 'Not marked',
          'Marked By': 'N/A',
          'Signature': '',
        });
      }

      const summarySection = Papa.unparse([
        ['Training Report', ''],
        ['Training Title', asDisplayValue(training.title)],
        ['Program', asDisplayValue(training.program)],
        ['Session Date', formatExportDate(training.date, 'yyyy-MM-dd')],
        ['Session Time', formatTimeWindow(training.startTime, training.endTime)],
        ['Venue', asDisplayValue(hall?.name)],
        ['Trainer', asDisplayValue(trainer?.name)],
        ['Generated On', formatExportDate(new Date(), 'yyyy-MM-dd HH:mm:ss')],
      ]);

      const participantSection = Papa.unparse(participantRows);
      const csv = `${summarySection}\r\n\r\n${participantSection}`;
      const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
      await downloadFile(
        blob,
        `Training_Data_${sanitizeFilePart(training.title, 'training')}_${formatExportDate(new Date(), 'yyyy-MM-dd')}.csv`,
        'text/csv'
      );
      toast.success(t('reportsPage.exportedCsv'));
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.error(t('reportsPage.failCsv'));
    }
  };

  const generateInstitutionReportPDF = async (institutionId: string) => {
    try {
      const institution = institutions.find(i => i.id === institutionId);
      if (!institution) return;

      const { report, untrainedStaff } = await getInstitutionExportData(institutionId);

      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.text('Institution Training Report', 14, 20);

      // Institution Details
      doc.setFontSize(12);
      doc.text(`Institution: ${asDisplayValue(institution.name)}`, 14, 35);
      doc.setFontSize(10);
      doc.text(`Type: ${asDisplayValue(institution.type)}`, 14, 42);
      doc.text(`Location: ${asDisplayValue(institution.location)}`, 14, 49);
      doc.text(`Report Date: ${formatExportDate(new Date())}`, 14, 56);

      // Summary Statistics
      doc.setFontSize(14);
      doc.text('Training Summary', 14, 70);
      doc.setFontSize(10);
      doc.text(`Total Staff: ${report.totalStaff}`, 14, 77);
      doc.text(`Trained Staff: ${report.trainedStaff}`, 14, 84);
      doc.text(`Untrained Staff: ${report.untrainedStaff || 0}`, 14, 91);
      const trainingPercentage = (report.totalStaff || 0) > 0
        ? Math.round(((report.trainedStaff || 0) / report.totalStaff) * 100)
        : 0;
      doc.text(`Training Coverage: ${trainingPercentage}%`, 14, 98);

      // Trainings by Program
      const programData = (Array.isArray(report.trainingsByProgram) && report.trainingsByProgram.length > 0)
        ? report.trainingsByProgram.map((prog) => [
            asDisplayValue(prog.program),
            String(prog.trainings ?? 0),
            String(prog.participants ?? 0),
          ])
        : [['No program data found', '0', '0']];

      autoTable(doc, {
        startY: 110,
        head: [['Program Area', 'Trainings', 'Total Participants']],
        body: programData,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [80, 80, 80] },
      });

      const untrainedSectionY = ((doc as any).lastAutoTable?.finalY || 110) + 12;
      doc.setFontSize(14);
      doc.text('Untrained Staff List', 14, untrainedSectionY);

      const untrainedData = untrainedStaff.length > 0
        ? untrainedStaff.map((staff) => [
            asDisplayValue(staff.name),
            asDisplayValue(staff.designation),
            asDisplayValue(staff.department),
            asDisplayValue(staff.email),
          ])
        : [['No untrained staff found', 'N/A', 'N/A', 'N/A']];

      autoTable(doc, {
        startY: untrainedSectionY + 7,
        head: [['Name', 'Designation', 'Department', 'Email']],
        body: untrainedData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [120, 120, 120] },
      });

      const pdfBlob = doc.output('blob');
      await downloadFile(
        pdfBlob,
        `Institution_Report_${sanitizeFilePart(institution.name, 'institution')}_${formatExportDate(new Date(), 'yyyy-MM-dd')}.pdf`,
        'application/pdf'
      );
      toast.success(t('reportsPage.instReady'));
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(t('reportsPage.failInst'));
    }
  };

  const generateInstitutionReportCSV = async (institutionId: string) => {
    try {
      const institution = institutions.find(i => i.id === institutionId);
      if (!institution) return;

      const { report, untrainedStaff } = await getInstitutionExportData(institutionId);
      const baseRow = {
        'Institution': asDisplayValue(institution.name),
        'Type': asDisplayValue(institution.type),
        'Location': asDisplayValue(institution.location),
        'Report Date': formatExportDate(new Date(), 'yyyy-MM-dd'),
        'Total Staff': String(report.totalStaff ?? 0),
        'Trained Staff': String(report.trainedStaff ?? 0),
        'Untrained Staff': String(report.untrainedStaff ?? 0),
        'Training Coverage': `${(report.totalStaff || 0) > 0 ? Math.round(((report.trainedStaff || 0) / report.totalStaff) * 100) : 0}%`,
      };

      const programRows = (Array.isArray(report.trainingsByProgram) && report.trainingsByProgram.length > 0)
        ? report.trainingsByProgram.map((program) => ({
            ...baseRow,
            'Record Type': 'Program Summary',
            'Program Area': asDisplayValue(program.program),
            'Trainings': String(program.trainings ?? 0),
            'Participants': String(program.participants ?? 0),
            'Staff Name': '',
            'Designation': '',
            'Department': '',
            'Email': '',
          }))
        : [{
            ...baseRow,
            'Record Type': 'Program Summary',
            'Program Area': 'No program data found',
            'Trainings': '0',
            'Participants': '0',
            'Staff Name': '',
            'Designation': '',
            'Department': '',
            'Email': '',
          }];

      const untrainedRows = untrainedStaff.length > 0
        ? untrainedStaff.map((staff) => ({
            ...baseRow,
            'Record Type': 'Untrained Staff',
            'Program Area': '',
            'Trainings': '',
            'Participants': '',
            'Staff Name': asDisplayValue(staff.name),
            'Designation': asDisplayValue(staff.designation),
            'Department': asDisplayValue(staff.department),
            'Email': asDisplayValue(staff.email),
          }))
        : [{
            ...baseRow,
            'Record Type': 'Untrained Staff',
            'Program Area': '',
            'Trainings': '',
            'Participants': '',
            'Staff Name': 'No untrained staff found',
            'Designation': '',
            'Department': '',
            'Email': '',
          }];

      const csv = Papa.unparse([...programRows, ...untrainedRows]);
      const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
      await downloadFile(
        blob,
        `Institution_Report_${sanitizeFilePart(institution.name, 'institution')}_${formatExportDate(new Date(), 'yyyy-MM-dd')}.csv`,
        'text/csv'
      );
      toast.success(t('reportsPage.exportedCsv'));
    } catch (error) {
      console.error('Error generating institution CSV:', error);
      toast.error(t('reportsPage.failCsv'));
    }
  };

  const generateDistrictSummaryPDF = async () => {
    try {
      const [allTrainingsRes, allInstitutionsRes, statsRes] = await Promise.all([
        trainingsApi.getAll().catch(() => []),
        institutionsApi.getAll().catch(() => []),
        analyticsApi.getDashboardStats(user!.id, user!.role).catch(() => null),
      ]);

      const allTrainings = Array.isArray(allTrainingsRes) ? allTrainingsRes : [];
      const allInstitutions = Array.isArray(allInstitutionsRes) ? allInstitutionsRes : [];
      const stats = statsRes || {
        totalTrainings: 0,
        upcomingTrainings: 0,
        completedTrainings: 0,
        totalParticipants: 0,
        attendanceRate: 0,
        trainedStaff: 0,
        untrainedStaff: 0
      };

      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.text('Global Training Summary', 14, 20);

      doc.setFontSize(10);
      doc.text(`Generated: ${formatExportDate(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 30);
      doc.text(`Authorized Personnel: ${asDisplayValue(user?.name)}`, 14, 37);

      // Overall Statistics
      doc.setFontSize(14);
      doc.text('District Training Matrix', 14, 50);
      doc.setFontSize(10);
      doc.text(`Total Trainings: ${stats.totalTrainings}`, 14, 57);
      doc.text(`Trainings Completed: ${stats.completedTrainings}`, 14, 64);
      doc.text(`Upcoming Trainings: ${stats.upcomingTrainings}`, 14, 71);
      doc.text(`Active Participants: ${stats.totalParticipants}`, 14, 78);
      doc.text(`Average Attendance Rate: ${stats.attendanceRate}%`, 14, 85);
      doc.text(`Total Trained Staff: ${stats.trainedStaff}`, 14, 92);
      doc.text(`Remaining Staff: ${stats.untrainedStaff}`, 14, 99);

      // Trainings by Status
      const statusCounts = {
        draft: allTrainings.filter(t => t.status === 'draft').length,
        scheduled: allTrainings.filter(t => t.status === 'scheduled').length,
        ongoing: allTrainings.filter(t => t.status === 'ongoing').length,
        completed: allTrainings.filter(t => t.status === 'completed').length,
        cancelled: allTrainings.filter(t => t.status === 'cancelled').length,
      };

      const statusData = Object.entries(statusCounts).map(([status, count]) => [
        formatStatusLabel(status),
        count.toString(),
      ]);

      autoTable(doc, {
        startY: 110,
        head: [['Training Status', 'Count']],
        body: statusData,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [0, 80, 150] },
      });

      // Institutions Summary
      const lastY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text('Registered Institutions', 14, lastY);

      const instData = allInstitutions.length > 0
        ? allInstitutions.map(inst => [
            asDisplayValue(inst.name),
            formatStatusLabel(inst.type),
            asDisplayValue(inst.location),
          ])
        : [['No institutions found', 'N/A', 'N/A']];

      autoTable(doc, {
        startY: lastY + 7,
        head: [['Institution Name', 'Type', 'Location']],
        body: instData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [80, 80, 80] },
      });

      const pdfBlob = doc.output('blob');
      await downloadFile(
        pdfBlob,
        `Global_Summary_${formatExportDate(new Date(), 'yyyy-MM-dd')}.pdf`,
        'application/pdf'
      );
      toast.success(t('reportsPage.globalReady'));
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error(t('reportsPage.failGlobal'));
    }
  };

  const generateDistrictSummaryCSV = async () => {
    try {
      const [allTrainingsRes, allInstitutionsRes, statsRes, usersRes, hallsRes] = await Promise.all([
        trainingsApi.getAll().catch(() => []),
        institutionsApi.getAll().catch(() => []),
        analyticsApi.getDashboardStats(user!.id, user!.role).catch(() => null),
        usersApi.getAll().catch(() => []),
        hallsApi.getAll().catch(() => []),
      ]);

      const allTrainings = Array.isArray(allTrainingsRes) ? allTrainingsRes : [];
      const allInstitutions = Array.isArray(allInstitutionsRes) ? allInstitutionsRes : [];
      const allUsers = Array.isArray(usersRes) ? usersRes : [];
      const allHalls = Array.isArray(hallsRes) ? hallsRes : [];
      const stats = statsRes || {
        totalTrainings: 0,
        upcomingTrainings: 0,
        completedTrainings: 0,
        totalParticipants: 0,
        attendanceRate: 0,
        trainedStaff: 0,
        untrainedStaff: 0,
      };

      const summaryBase = {
        'Generated On': formatExportDate(new Date(), 'yyyy-MM-dd HH:mm:ss'),
        'Generated By': asDisplayValue(user?.name),
        'Total Trainings': String(stats.totalTrainings ?? 0),
        'Completed Trainings': String(stats.completedTrainings ?? 0),
        'Upcoming Trainings': String(stats.upcomingTrainings ?? 0),
        'Total Participants': String(stats.totalParticipants ?? 0),
        'Attendance Rate': `${stats.attendanceRate ?? 0}%`,
        'Trained Staff': String(stats.trainedStaff ?? 0),
        'Untrained Staff': String(stats.untrainedStaff ?? 0),
        'Registered Institutions': String(allInstitutions.length),
      };

      const csvData = allTrainings.length > 0
        ? allTrainings.map((training) => {
            const trainer = allUsers.find((entry) => getEntityId(entry) === training.trainerId);
            const hall = allHalls.find((entry) => getEntityId(entry) === training.hallId);
            return {
              ...summaryBase,
              'Training Title': asDisplayValue(training.title),
              'Program': asDisplayValue(training.program),
              'Date': formatExportDate(training.date, 'yyyy-MM-dd'),
              'Start Time': asDisplayValue(training.startTime),
              'End Time': asDisplayValue(training.endTime),
              'Hall': asDisplayValue(hall?.name),
              'Trainer': asDisplayValue(trainer?.name),
              'Status': formatStatusLabel(training.status),
              'Capacity': String(training.capacity ?? 0),
            };
          })
        : [{
            ...summaryBase,
            'Training Title': 'No trainings found',
            'Program': 'N/A',
            'Date': 'N/A',
            'Start Time': 'N/A',
            'End Time': 'N/A',
            'Hall': 'N/A',
            'Trainer': 'N/A',
            'Status': 'N/A',
            'Capacity': '0',
          }];

      const csv = Papa.unparse(csvData);
      const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' });
      await downloadFile(
        blob,
        `Global_Summary_${formatExportDate(new Date(), 'yyyy-MM-dd')}.csv`,
        'text/csv'
      );
      toast.success(t('reportsPage.exportedCsv'));
    } catch (error) {
      console.error('Error generating district CSV:', error);
      toast.error(t('reportsPage.failCsv'));
    }
  };

  const handleGenerateReport = async (format: 'pdf' | 'csv') => {
    if (!selectedReport) {
      toast.error(t('reportsPage.selectTypeError'));
      return;
    }

    setLoading(true);

    try {
      if (selectedReport === 'training') {
        if (!selectedTraining) {
          toast.error(t('reportsPage.selectTrainingError'));
          return;
        }
        if (format === 'pdf') {
          await generateTrainingReportPDF(selectedTraining);
        } else {
          await generateTrainingReportCSV(selectedTraining);
        }
      } else if (selectedReport === 'institution') {
        if (!selectedInstitution) {
          toast.error(t('reportsPage.selectInstError'));
          return;
        }
        if (format === 'pdf') {
          await generateInstitutionReportPDF(selectedInstitution);
        } else {
          await generateInstitutionReportCSV(selectedInstitution);
        }
      } else if (selectedReport === 'district') {
        if (format === 'pdf') {
          await generateDistrictSummaryPDF();
        } else {
          await generateDistrictSummaryCSV();
        }
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchableTrainings = [...trainings].sort((a, b) => getTrainingSortTimestamp(b) - getTrainingSortTimestamp(a));
  const normalizedTrainingSearch = normalizeTrainingMatchValue(trainingSearchTerm);
  const filteredTrainings = searchableTrainings.filter((training) => {
    const matchesDate = !trainingDateFilter || getTrainingDateInputValue(training.date) === trainingDateFilter;
    if (!matchesDate) return false;

    if (!normalizedTrainingSearch) return true;

    const searchText = [
      training.title,
      training.program,
      training.description,
      getTrainingSearchableDateText(training.date),
      formatTimeWindow(training.startTime, training.endTime),
      training.status,
    ].join(' ');

    return normalizeTrainingMatchValue(searchText).includes(normalizedTrainingSearch);
  });
  const selectedTrainingRecord = trainings.find((training) => training.id === selectedTraining);
  const selectedTrainingPinned = Boolean(
    selectedTrainingRecord && !filteredTrainings.some((training) => training.id === selectedTraining)
  );
  const visibleTrainings = filteredTrainings;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <BarChart3 className="size-8 sm:size-10 text-primary" />
            {t('reportsPage.title', 'Reports & Analytics')}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">{t('reportsPage.subtitle')}</p>
        </div>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20 pb-6">
          <CardTitle className="text-lg text-foreground flex items-center gap-2">
            <FileText className="size-4" />
            {t('reportsPage.generator')}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {t('reportsPage.generatorDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-8 px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                <Settings2 className="size-3" />
                {t('reportsPage.reportType', 'Report Type')}
              </Label>
              <Select value={selectedReport} onValueChange={(value) => {
                setSelectedReport(value);
                setSelectedTraining('');
                setSelectedInstitution(value === 'institution' && isInstitutionScopedUser && currentInstitutionId ? currentInstitutionId : '');
              }}>
                <SelectTrigger className="bg-background text-foreground">
                  <SelectValue placeholder={t('reportsPage.selectType')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="training">{t('reportsPage.typeTraining')}</SelectItem>
                  <SelectItem value="institution">{t('reportsPage.typeInstitution')}</SelectItem>
                  {(user?.role === 'master_admin' || user?.role === 'program_officer') && (
                    <SelectItem value="district">{t('reportsPage.typeDistrict')}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedReport === 'training' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Calendar className="size-3" />
                  {t('reportsPage.selectTraining', 'Select Training')}
                </Label>
                <div className="rounded-2xl border border-border bg-background p-4">
                  <div className="flex flex-col gap-3">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-3.5 size-4 text-primary/60" />
                      <Input
                        value={trainingSearchTerm}
                        onChange={(e) => setTrainingSearchTerm(e.target.value)}
                        placeholder={t('reportsPage.trainingSearchPlaceholder', {
                          defaultValue: 'Search training title, program, or date',
                        })}
                        className="h-11 rounded-xl bg-input-background pl-10"
                      />
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <DateInputWithPickerIcon
                        wrapperClassName="flex-1"
                        value={trainingDateFilter}
                        onChange={(e) => setTrainingDateFilter(e.target.value)}
                        className="h-11 rounded-xl bg-input-background"
                      />
                      {(trainingSearchTerm || trainingDateFilter) && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => {
                            setTrainingSearchTerm('');
                            setTrainingDateFilter('');
                          }}
                          className="sm:self-stretch"
                        >
                          <X className="mr-2 size-4" />
                          {t('reportsPage.clearTrainingFilters', { defaultValue: 'Clear filters' })}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs text-muted-foreground">
                      {filteredTrainings.length} of {trainings.length} training(s) shown
                    </p>
                    {selectedTrainingPinned && (
                      <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary">
                        {t('reportsPage.selectedTrainingPinned', {
                          defaultValue: 'Selected training shown outside current filters',
                        })}
                      </Badge>
                    )}
                  </div>

                  <div className="mt-4 max-h-[320px] space-y-3 overflow-y-auto pr-1 custom-scrollbar">
                    {visibleTrainings.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
                        {t('reportsPage.noTrainingMatches', {
                          defaultValue: 'No trainings matched your search or date filter.',
                        })}
                      </div>
                    ) : (
                      visibleTrainings.map((training) => {
                        const isSelected = training.id === selectedTraining;

                        return (
                          <button
                            key={training.id}
                            type="button"
                            onClick={() => setSelectedTraining(training.id)}
                            className={`w-full rounded-xl border p-4 text-left transition-all ${
                              isSelected
                                ? 'border-primary bg-primary/5 shadow-sm'
                                : 'border-border bg-card hover:border-primary/30'
                            }`}
                          >
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="text-sm font-semibold text-foreground">{training.title}</p>
                                  {isSelected && (
                                    <Badge variant="outline" className="border-primary/20 bg-primary/10 text-primary">
                                      {t('reportsPage.selectedTrainingTag', { defaultValue: 'Selected' })}
                                    </Badge>
                                  )}
                                </div>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {formatExportDate(training.date, 'MMM dd, yyyy')} • {formatTimeWindow(training.startTime, training.endTime)}
                                </p>
                                {(training.program || training.description) && (
                                  <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">
                                    {[training.program, training.description].filter(Boolean).join(' • ')}
                                  </p>
                                )}
                              </div>

                              <div className="flex flex-wrap gap-2">
                                <Badge variant="outline" className="border-border bg-background text-muted-foreground">
                                  {formatStatusLabel(training.status)}
                                </Badge>
                              </div>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            )}

            {selectedReport === 'institution' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <Label className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Building2 className="size-3" />
                  {t('reportsPage.selectInst', 'Select Institution')}
                </Label>
                <Select
                  value={selectedInstitution}
                  onValueChange={setSelectedInstitution}
                  disabled={isInstitutionScopedUser}
                >
                  <SelectTrigger className="bg-background text-foreground">
                    <SelectValue placeholder={t('reportsPage.identifyInst')} />
                  </SelectTrigger>
                  <SelectContent>
                    {institutions.map((institution) => (
                      <SelectItem key={getEntityId(institution)} value={getEntityId(institution)}>
                        {institution.name} ({institution.type.toUpperCase()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row gap-4 pt-4">
            <Button
              onClick={() => handleGenerateReport('pdf')}
              disabled={loading || !selectedReport}
              className="flex-1 h-12"
            >
              {loading ? (
                <Cpu className="size-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="size-4 mr-2" />
              )}
              {t('reportsPage.generatePdf')}
            </Button>
            <Button
              onClick={() => handleGenerateReport('csv')}
              disabled={loading || !selectedReport}
              variant="outline"
              className="flex-1 h-12"
            >
              <Download className="size-4 mr-2" />
              {t('reportsPage.exportCsv')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Calendar className="size-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">{t('reportsPage.trainingAnalytics')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('reportsPage.trainingAnalyticsDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Building2 className="size-8 text-secondary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">{t('reportsPage.instData')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('reportsPage.instDataDesc')}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="p-8 text-center">
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="size-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-3">{t('reportsPage.districtData')}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('reportsPage.districtDataDesc')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Reports;
