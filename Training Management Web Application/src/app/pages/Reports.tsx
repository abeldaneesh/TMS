import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  trainingsApi, analyticsApi, institutionsApi, nominationsApi,
  attendanceApi, usersApi, hallsApi
} from '../../services/api';
import { Training, Institution, HallBlock } from '../../types';
import { FileText, Download, FileDown, Calendar, Building2, Activity, Database, Cpu, ShieldCheck, Settings2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
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

const Reports: React.FC = () => {
  const { user } = useAuth();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedReport, setSelectedReport] = useState('');
  const [selectedTraining, setSelectedTraining] = useState('');
  const [selectedInstitution, setSelectedInstitution] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      try {
        const [trainingsData, institutionsData] = await Promise.all([
          trainingsApi.getAll(user.role === 'program_officer' ? { createdById: user.id } : {}),
          institutionsApi.getAll(),
        ]);
        setTrainings(Array.isArray(trainingsData) ? trainingsData : []);
        setInstitutions(Array.isArray(institutionsData) ? institutionsData : []);
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load report data');
      }
    };
    fetchData();
  }, [user]);

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

      const analytics = analyticsRes || { totalNominated: 0, totalApproved: 0, totalAttended: 0, attendanceRate: 0 };
      const nominations = Array.isArray(nominationsRes) ? nominationsRes : [];
      const attendanceRecords = Array.isArray(attendanceRes) ? attendanceRes : [];
      const allUsers = Array.isArray(usersRes) ? usersRes : [];
      const halls = Array.isArray(hallsRes) ? hallsRes : [];

      const hall = halls.find(h => h.id === training.hallId || (h as any)._id === training.hallId);
      const trainer = allUsers.find(u => u.id === training.trainerId || (u as any)._id === training.trainerId);

      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.text('Training Report', 14, 20);

      // Training Details
      doc.setFontSize(12);
      doc.text(`Training Title: ${training.title}`, 14, 35);
      doc.setFontSize(10);
      doc.text(`Program Area: ${training.program}`, 14, 42);
      doc.text(`Scheduled Date: ${safeFormatDate(training.date)}`, 14, 49);
      doc.text(`Time Window: ${training.startTime} - ${training.endTime}`, 14, 56);
      doc.text(`Venue: ${hall?.name || 'N/A'}`, 14, 63);
      doc.text(`Trainer: ${trainer?.name || 'N/A'}`, 14, 70);
      doc.text(`Status: ${(training.status || '').toUpperCase()}`, 14, 77);

      // Summary Statistics
      doc.setFontSize(14);
      doc.text('Attendance Analytics', 14, 90);
      doc.setFontSize(10);
      doc.text(`Total Nominated: ${analytics.totalNominated}`, 14, 97);
      doc.text(`Total Approved: ${analytics.totalApproved}`, 14, 104);
      doc.text(`Total Attended: ${analytics.totalAttended}`, 14, 111);
      doc.text(`Attendance Rate: ${analytics.attendanceRate}%`, 14, 118);

      // Participants Table
      const participantData = nominations.map(nom => {
        const participant = allUsers.find(u => u.id === nom.participantId);
        const institution = institutions.find(i => i.id === nom.institutionId);
        const attended = attendanceRecords.some(a => a.participantId === nom.participantId);

        return [
          participant?.name || 'N/A',
          participant?.designation || 'N/A',
          institution?.name || 'N/A',
          nom.status,
          attended ? 'YES' : 'NO',
        ];
      });

      autoTable(doc, {
        startY: 130,
        head: [['Participant Name', 'Designation', 'Institution', 'Status', 'Attended']],
        body: participantData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 80, 150] }, // Professional Navy
      });

      // Download PDF
      const pdfBlob = doc.output('blob');
      await downloadFile(
        pdfBlob,
        `Training_Report_${training.title.replace(/\s+/g, '_')}_${safeFormatDate(new Date(), 'yyyy-MM-dd')}.pdf`,
        'application/pdf'
      );
      toast.success('Report generation complete');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate report PDF');
    }
  };

  const generateTrainingReportCSV = async (trainingId: string) => {
    try {
      const training = trainings.find(t => t.id === trainingId);
      if (!training) return;

      const [nominationsRes, attendanceRes, usersRes] = await Promise.all([
        nominationsApi.getAll({ trainingId }).catch(() => []),
        attendanceApi.getAll({ trainingId }).catch(() => []),
        usersApi.getAll().catch(() => []),
      ]);

      const nominations = Array.isArray(nominationsRes) ? nominationsRes : [];
      const attendanceRecords = Array.isArray(attendanceRes) ? attendanceRes : [];
      const allUsers = Array.isArray(usersRes) ? usersRes : [];

      const csvData = nominations.map(nom => {
        const participant = allUsers.find(u => u.id === nom.participantId);
        const institution = institutions.find(i => i.id === nom.institutionId);
        const attendanceRecord = attendanceRecords.find(a => a.participantId === nom.participantId);

        return {
          'Training Title': training.title,
          'Program': training.program,
          'Date': safeFormatDate(training.date, 'yyyy-MM-dd'),
          'Participant': participant?.name || 'N/A',
          'Designation': participant?.designation || 'N/A',
          'Institution': institution?.name || 'N/A',
          'Phone': participant?.phone || 'N/A',
          'Email': participant?.email || 'N/A',
          'Nomination Status': nom.status,
          'Attended': attendanceRecord ? 'Yes' : 'No',
          'Timestamp': safeFormatDate(attendanceRecord?.timestamp, 'yyyy-MM-dd HH:mm:ss'),
        };
      });

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      await downloadFile(
        blob,
        `Training_Data_${training.title.replace(/\s+/g, '_')}_${safeFormatDate(new Date(), 'yyyy-MM-dd')}.csv`,
        'text/csv'
      );
      toast.success('Report data exported to CSV');
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.error('Failed to export CSV');
    }
  };

  const generateInstitutionReportPDF = async (institutionId: string) => {
    try {
      const institution = institutions.find(i => i.id === institutionId);
      if (!institution) return;

      const report = await analyticsApi.getInstitutionReport(institutionId);

      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.text('Institution Training Report', 14, 20);

      // Institution Details
      doc.setFontSize(12);
      doc.text(`Institution: ${institution.name}`, 14, 35);
      doc.setFontSize(10);
      doc.text(`Type: ${institution.type}`, 14, 42);
      doc.text(`Location: ${institution.location}`, 14, 49);
      doc.text(`Report Date: ${safeFormatDate(new Date())}`, 14, 56);

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
      const programData = report.trainingsByProgram.map(prog => [
        prog.program,
        prog.trainings.toString(),
        prog.participants.toString(),
      ]);

      autoTable(doc, {
        startY: 110,
        head: [['Program Area', 'Trainings', 'Total Participants']],
        body: programData,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [80, 80, 80] },
      });

      const pdfBlob = doc.output('blob');
      await downloadFile(
        pdfBlob,
        `Institution_Report_${institution.name.replace(/\s+/g, '_')}_${safeFormatDate(new Date(), 'yyyy-MM-dd')}.pdf`,
        'application/pdf'
      );
      toast.success('Institution report ready');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate institution report');
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
      doc.text(`Generated: ${safeFormatDate(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 30);
      doc.text(`Authorized Personnel: ${user?.name || 'N/A'}`, 14, 37);

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
        status.toUpperCase(),
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

      const instData = allInstitutions.map(inst => [
        inst.name,
        inst.type.toUpperCase(),
        inst.location,
      ]);

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
        `Global_Summary_${safeFormatDate(new Date(), 'yyyy-MM-dd')}.pdf`,
        'application/pdf'
      );
      toast.success('Global summary report generated');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate summary report');
    }
  };

  const handleGenerateReport = async (format: 'pdf' | 'csv') => {
    if (!selectedReport) {
      toast.error('Please select a report type');
      return;
    }

    setLoading(true);

    try {
      if (selectedReport === 'training') {
        if (!selectedTraining) {
          toast.error('Please select a training');
          return;
        }
        if (format === 'pdf') {
          await generateTrainingReportPDF(selectedTraining);
        } else {
          await generateTrainingReportCSV(selectedTraining);
        }
      } else if (selectedReport === 'institution') {
        if (!selectedInstitution) {
          toast.error('Please select an institution');
          return;
        }
        if (format === 'pdf') {
          await generateInstitutionReportPDF(selectedInstitution);
        }
      } else if (selectedReport === 'district') {
        if (format === 'pdf') {
          await generateDistrictSummaryPDF();
        }
      }
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Activity className="size-8 text-primary" />
            Reports & Analytics
          </h1>
          <p className="text-muted-foreground mt-1 text-sm uppercase tracking-wider opacity-70">Training Program Data & Institutional Metrics</p>
        </div>
      </div>

      <Card className="bg-white/5 border-white/10 overflow-hidden">
        <CardHeader className="border-b border-white/10 bg-white/5 pb-6">
          <CardTitle className="text-sm font-bold text-primary tracking-wider flex items-center gap-2 uppercase">
            <FileText className="size-4" />
            Report Generator
          </CardTitle>
          <CardDescription className="text-muted-foreground text-xs uppercase tracking-wide">
            Select parameters to generate training or institutional reports.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-8 px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                <Settings2 className="size-3" />
                Report Type
              </Label>
              <Select value={selectedReport} onValueChange={(value) => {
                setSelectedReport(value);
                setSelectedTraining('');
                setSelectedInstitution('');
              }}>
                <SelectTrigger className="bg-white/5 border-white/10 text-foreground text-xs py-5">
                  <SelectValue placeholder="Select Report Type..." />
                </SelectTrigger>
                <SelectContent className="bg-background border-white/10 text-foreground text-xs">
                  <SelectItem value="training">TRAINING REPORT</SelectItem>
                  <SelectItem value="institution">INSTITUTION REPORT</SelectItem>
                  {(user?.role === 'master_admin' || user?.role === 'program_officer') && (
                    <SelectItem value="district">DISTRICT SUMMARY</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedReport === 'training' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <Label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                  <Calendar className="size-3" />
                  Select Training
                </Label>
                <Select value={selectedTraining} onValueChange={setSelectedTraining}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-foreground text-xs py-5">
                    <SelectValue placeholder="Identify Training..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/10 text-foreground text-xs">
                    {trainings.map((training) => (
                      <SelectItem key={training.id} value={training.id}>
                        {training.title} — {safeFormatDate(training.date, 'MM/dd/yy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedReport === 'institution' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <Label className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase flex items-center gap-2">
                  <Building2 className="size-3" />
                  Select Institution
                </Label>
                <Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
                  <SelectTrigger className="bg-white/5 border-white/10 text-foreground text-xs py-5">
                    <SelectValue placeholder="Identify Institution..." />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-white/10 text-foreground text-xs">
                    {institutions.map((institution) => (
                      <SelectItem key={institution.id} value={institution.id}>
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
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold tracking-wider text-xs py-6 rounded-xl transition-all"
            >
              {loading ? (
                <Cpu className="size-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="size-4 mr-2" />
              )}
              GENERATE PDF REPORT
            </Button>
            {selectedReport === 'training' && (
              <Button
                onClick={() => handleGenerateReport('csv')}
                disabled={loading}
                variant="outline"
                className="flex-1 bg-white/5 border-white/10 hover:bg-white/10 text-foreground font-bold tracking-wider text-xs py-6 rounded-xl"
              >
                <Download className="size-4 mr-2" />
                EXPORT TO CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/5 border border-white/10 rounded-2xl group hover:border-primary/30 transition-all overflow-hidden">
          <CardContent className="p-8 text-center bg-primary/5">
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20 group-hover:scale-110 transition-all">
              <Calendar className="size-8 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground tracking-wider mb-3 uppercase">TRAINING ANALYTICS</h3>
            <p className="text-xs text-muted-foreground leading-relaxed opacity-70 uppercase tracking-tight">
              Detailed analysis of training sessions, participation rates, and attendance success metrics.
            </p>
          </CardContent>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl group hover:border-secondary/30 transition-all overflow-hidden">
          <CardContent className="p-8 text-center bg-secondary/5">
            <div className="bg-secondary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-secondary/20 group-hover:scale-110 transition-all">
              <Building2 className="size-8 text-secondary" />
            </div>
            <h3 className="text-sm font-bold text-foreground tracking-wider mb-3 uppercase">INSTITUTION DATA</h3>
            <p className="text-xs text-muted-foreground leading-relaxed opacity-70 uppercase tracking-tight">
              Reports on staff training status, program coverage, and preparedness levels across sectors.
            </p>
          </CardContent>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl group hover:border-emerald-500/30 transition-all overflow-hidden">
          <CardContent className="p-8 text-center bg-emerald-500/5">
            <div className="bg-emerald-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 group-hover:scale-110 transition-all">
              <ShieldCheck className="size-8 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-foreground tracking-wider mb-3 uppercase">DISTRICT DATA</h3>
            <p className="text-xs text-muted-foreground leading-relaxed opacity-70 uppercase tracking-tight">
              Consolidated overview of all training activities and professional readiness across the district.
            </p>
          </CardContent>
        </div>
      </div>
    </div>
  );
};

export default Reports;
