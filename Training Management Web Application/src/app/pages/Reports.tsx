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
        setTrainings(trainingsData);
        setInstitutions(institutionsData);
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

      const [analytics, nominations, attendanceRecords, allUsers, halls] = await Promise.all([
        analyticsApi.getTrainingAnalytics(trainingId),
        nominationsApi.getAll({ trainingId }),
        attendanceApi.getAll({ trainingId }),
        usersApi.getAll(),
        hallsApi.getAll(),
      ]);

      const hall = halls.find(h => h.id === training.hallId);
      const trainer = allUsers.find(u => u.id === training.trainerId);

      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.text('Training Mission Report', 14, 20);

      // Training Details
      doc.setFontSize(12);
      doc.text(`Mission Objective: ${training.title}`, 14, 35);
      doc.setFontSize(10);
      doc.text(`Program Sector: ${training.program}`, 14, 42);
      doc.text(`Deployment Date: ${training.date ? format(new Date(training.date), 'MMM dd, yyyy') : 'N/A'}`, 14, 49);
      doc.text(`Operational Window: ${training.startTime} - ${training.endTime}`, 14, 56);
      doc.text(`Sector Location: ${hall?.name || 'N/A'}`, 14, 63);
      doc.text(`Commanding Officer: ${trainer?.name || 'N/A'}`, 14, 70);
      doc.text(`Mission Status: ${training.status.toUpperCase()}`, 14, 77);

      // Summary Statistics
      doc.setFontSize(14);
      doc.text('Performance Analytics', 14, 90);
      doc.setFontSize(10);
      doc.text(`Total Personnel Nominated: ${analytics.totalNominated}`, 14, 97);
      doc.text(`Total Deployments Approved: ${analytics.totalApproved}`, 14, 104);
      doc.text(`Total Personnel Present: ${analytics.totalAttended}`, 14, 111);
      doc.text(`Operational Coverage: ${analytics.attendanceRate}%`, 14, 118);

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
        head: [['Personnel Name', 'Specialization', 'Sector', 'Status', 'Attended']],
        body: participantData,
        theme: 'grid',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 236, 255] },
      });

      // Download PDF
      const pdfBlob = doc.output('blob');
      await downloadFile(
        pdfBlob,
        `Mission_Report_${training.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        'application/pdf'
      );
      toast.success('Mission Intel PDF processing complete!');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Mission Debrief PDF formation failed');
    }
  };

  const generateTrainingReportCSV = async (trainingId: string) => {
    try {
      const training = trainings.find(t => t.id === trainingId);
      if (!training) return;

      const [nominations, attendanceRecords, allUsers] = await Promise.all([
        nominationsApi.getAll({ trainingId }),
        attendanceApi.getAll({ trainingId }),
        usersApi.getAll(),
      ]);

      const csvData = nominations.map(nom => {
        const participant = allUsers.find(u => u.id === nom.participantId);
        const institution = institutions.find(i => i.id === nom.institutionId);
        const attendanceRecord = attendanceRecords.find(a => a.participantId === nom.participantId);

        return {
          'Mission Title': training.title,
          'Sector': training.program,
          'Date': training.date ? format(new Date(training.date), 'yyyy-MM-dd') : 'N/A',
          'Personnel': participant?.name || 'N/A',
          'Specialization': participant?.designation || 'N/A',
          'Organization': institution?.name || 'N/A',
          'Contact': participant?.phone || 'N/A',
          'Comm Link': participant?.email || 'N/A',
          'Nomination Status': nom.status,
          'Deployment Confirmed': attendanceRecord ? 'Yes' : 'No',
          'Timestamp': attendanceRecord ? format(new Date(attendanceRecord.timestamp), 'yyyy-MM-dd HH:mm:ss') : 'N/A',
        };
      });

      const csv = Papa.unparse(csvData);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      await downloadFile(
        blob,
        `Mission_Data_${training.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.csv`,
        'text/csv'
      );
      toast.success('Mission Data CSV exported!');
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast.error('CSV data extraction failed');
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
      doc.text('Sector Personnel Report', 14, 20);

      // Institution Details
      doc.setFontSize(12);
      doc.text(`Sector: ${institution.name}`, 14, 35);
      doc.setFontSize(10);
      doc.text(`Classification: ${institution.type}`, 14, 42);
      doc.text(`Coordinates: ${institution.location}`, 14, 49);
      doc.text(`Audit Date: ${format(new Date(), 'MMM dd, yyyy')}`, 14, 56);

      // Summary Statistics
      doc.setFontSize(14);
      doc.text('Capability Matrix', 14, 70);
      doc.setFontSize(10);
      doc.text(`Total Staff Complement: ${report.totalStaff}`, 14, 77);
      doc.text(`Trained Personnel: ${report.trainedStaff}`, 14, 84);
      doc.text(`Awaiting Deployment: ${report.untrainedStaff}`, 14, 91);
      const trainingPercentage = report.totalStaff > 0
        ? Math.round((report.trainedStaff / report.totalStaff) * 100)
        : 0;
      doc.text(`Sector Preparedness: ${trainingPercentage}%`, 14, 98);

      // Trainings by Program
      const programData = report.trainingsByProgram.map(prog => [
        prog.program,
        prog.trainings.toString(),
        prog.participants.toString(),
      ]);

      autoTable(doc, {
        startY: 110,
        head: [['Mission Sector', 'Operations', 'Personnel Count']],
        body: programData,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [110, 64, 201] },
      });

      const pdfBlob = doc.output('blob');
      await downloadFile(
        pdfBlob,
        `Sector_Report_${institution.name.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        'application/pdf'
      );
      toast.success('Sector Audit PDF formation complete');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Sector Report generation offline');
    }
  };

  const generateDistrictSummaryPDF = async () => {
    try {
      const [allTrainings, allInstitutions, stats] = await Promise.all([
        trainingsApi.getAll(),
        institutionsApi.getAll(),
        analyticsApi.getDashboardStats(user!.id, user!.role),
      ]);

      const doc = new jsPDF();

      // Title
      doc.setFontSize(20);
      doc.text('Global Mission Summary', 14, 20);

      doc.setFontSize(10);
      doc.text(`Audit Timestamp: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, 14, 30);
      doc.text(`Authorized Officer: ${user?.name}`, 14, 37);

      // Overall Statistics
      doc.setFontSize(14);
      doc.text('District Operations Matrix', 14, 50);
      doc.setFontSize(10);
      doc.text(`Total Missions: ${stats.totalTrainings}`, 14, 57);
      doc.text(`Missions Completed: ${stats.completedTrainings}`, 14, 64);
      doc.text(`Missions Scheduled: ${stats.upcomingTrainings}`, 14, 71);
      doc.text(`Active Personnel: ${stats.totalParticipants}`, 14, 78);
      doc.text(`Average Mission Success: ${stats.attendanceRate}%`, 14, 85);
      doc.text(`Combat Ready Staff: ${stats.trainedStaff}`, 14, 92);
      doc.text(`Reserve Personnel: ${stats.untrainedStaff}`, 14, 99);

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
        head: [['Deployment Protocol', 'Count']],
        body: statusData,
        theme: 'grid',
        styles: { fontSize: 10 },
        headStyles: { fillColor: [0, 236, 255] },
      });

      // Institutions Summary
      const lastY = (doc as any).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text('Verified Sectors', 14, lastY);

      const instData = allInstitutions.map(inst => [
        inst.name,
        inst.type.toUpperCase(),
        inst.location,
      ]);

      autoTable(doc, {
        startY: lastY + 7,
        head: [['Sector Identifier', 'Classification', 'Coordinates']],
        body: instData,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [110, 64, 201] },
      });

      const pdfBlob = doc.output('blob');
      await downloadFile(
        pdfBlob,
        `Global_Summary_${format(new Date(), 'yyyy-MM-dd')}.pdf`,
        'application/pdf'
      );
      toast.success('Global Intel Deep Link established');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Global Intel formation failed');
    }
  };

  const handleGenerateReport = async (format: 'pdf' | 'csv') => {
    if (!selectedReport) {
      toast.error('SELECT DEBRIEFING PROTOCOL');
      return;
    }

    setLoading(true);

    try {
      if (selectedReport === 'training') {
        if (!selectedTraining) {
          toast.error('IDENTIFY MISSION TARGET');
          return;
        }
        if (format === 'pdf') {
          await generateTrainingReportPDF(selectedTraining);
        } else {
          await generateTrainingReportCSV(selectedTraining);
        }
      } else if (selectedReport === 'institution') {
        if (!selectedInstitution) {
          toast.error('IDENTIFY SECTOR TARGET');
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
          <h1 className="text-3xl font-extrabold tracking-tighter text-foreground flex items-center gap-3">
            <Activity className="size-8 text-primary animate-pulse-glow" />
            MISSION DEBRIEFS
            <div className="h-1 w-20 bg-gradient-to-r from-primary to-transparent rounded-full ml-4 hidden md:block" />
          </h1>
          <p className="text-muted-foreground mt-1 font-mono text-xs uppercase tracking-widest opacity-70">Strategic Analytics & Tactical Data Export</p>
        </div>
        <div className="hidden md:flex items-center gap-4 text-[10px] font-mono text-primary/40 uppercase">
          <div className="flex items-center gap-2">
            <Cpu className="size-3" />
            Core Linked
          </div>
          <div className="flex items-center gap-2">
            <Database className="size-3" />
            Archive Sync
          </div>
        </div>
      </div>

      <Card className="glass-card neon-border overflow-hidden">
        <CardHeader className="border-b border-primary/10 bg-primary/5 pb-6">
          <CardTitle className="text-sm font-bold text-primary tracking-[0.2em] flex items-center gap-2 uppercase">
            <FileText className="size-4" />
            INTEL GENERATOR
          </CardTitle>
          <CardDescription className="text-muted-foreground font-mono text-[10px] uppercase tracking-wider">
            Define extraction parameters for mission intelligence.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-8 pt-8 px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold tracking-widest text-primary/70 uppercase flex items-center gap-2">
                <Settings2 className="size-3" />
                Debriefing Protocol
              </Label>
              <Select value={selectedReport} onValueChange={(value) => {
                setSelectedReport(value);
                setSelectedTraining('');
                setSelectedInstitution('');
              }}>
                <SelectTrigger className="bg-input/50 border-input text-foreground font-mono text-xs py-5">
                  <SelectValue placeholder="CHOOSE DEBRIEFER..." />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border/50 text-foreground font-mono text-xs">
                  <SelectItem value="training">MISSION REPORT</SelectItem>
                  <SelectItem value="institution">SECTOR REPORT</SelectItem>
                  {(user?.role === 'master_admin' || user?.role === 'program_officer') && (
                    <SelectItem value="district">GLOBAL SUMMARY</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {selectedReport === 'training' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <Label className="text-[10px] font-bold tracking-widest text-primary/70 uppercase flex items-center gap-2">
                  <Calendar className="size-3" />
                  Mission Target
                </Label>
                <Select value={selectedTraining} onValueChange={setSelectedTraining}>
                  <SelectTrigger className="bg-input/50 border-input text-foreground font-mono text-xs py-5">
                    <SelectValue placeholder="IDENTIFY MISSION..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/50 text-foreground font-mono text-xs">
                    {trainings.map((training) => (
                      <SelectItem key={training.id} value={training.id}>
                        {training.title.toUpperCase()} — {training.date ? format(new Date(training.date), 'MM.dd.yy') : 'DATE N/A'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedReport === 'institution' && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-4 duration-300">
                <Label className="text-[10px] font-bold tracking-widest text-secondary/70 uppercase flex items-center gap-2">
                  <Building2 className="size-3" />
                  Sector Target
                </Label>
                <Select value={selectedInstitution} onValueChange={setSelectedInstitution}>
                  <SelectTrigger className="bg-input/50 border-input text-foreground font-mono text-xs py-5">
                    <SelectValue placeholder="IDENTIFY SECTOR..." />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border/50 text-foreground font-mono text-xs">
                    {institutions.map((institution) => (
                      <SelectItem key={institution.id} value={institution.id}>
                        {institution.name.toUpperCase()} ({institution.type.toUpperCase()})
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
              className="flex-1 bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/20 font-bold tracking-[0.2em] text-xs py-6 rounded-xl transition-all shadow-[0_0_15px_rgba(0,236,255,0.1)] group"
            >
              {loading ? (
                <Cpu className="size-4 mr-2 animate-spin" />
              ) : (
                <FileDown className="size-4 mr-2 group-hover:scale-110 transition-transform" />
              )}
              FORMATION PDF DEBRIEF
            </Button>
            {selectedReport === 'training' && (
              <Button
                onClick={() => handleGenerateReport('csv')}
                disabled={loading}
                variant="outline"
                className="flex-1 bg-input/50 border-input hover:border-primary/50 text-foreground font-bold tracking-[0.2em] text-xs py-6 rounded-xl group"
              >
                <Download className="size-4 mr-2 group-hover:translate-y-0.5 transition-transform" />
                EXTRACT DATA GRID (CSV)
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card group hover:border-primary/30 transition-all">
          <CardContent className="p-8 text-center bg-primary/[0.03]">
            <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-primary/20 group-hover:scale-110 group-hover:bg-primary/20 transition-all">
              <Calendar className="size-8 text-primary shadow-[0_0_10px_rgba(0,236,255,0.3)]" />
            </div>
            <h3 className="text-sm font-bold text-foreground tracking-widest mb-3 uppercase">MISSION INTEL</h3>
            <p className="text-[10px] text-muted-foreground font-mono leading-relaxed opacity-60 uppercase">
              DEEP ANALYSIS OF MISSION COORDINATES, PERSONNEL DEPLOYMENT, AND ATTENDANCE SUCCESS VECTORS.
            </p>
          </CardContent>
        </div>

        <div className="glass-card group hover:border-secondary/30 transition-all">
          <CardContent className="p-8 text-center bg-secondary/[0.03]">
            <div className="bg-secondary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-secondary/20 group-hover:scale-110 group-hover:bg-secondary/20 transition-all">
              <Building2 className="size-8 text-secondary shadow-[0_0_10px_rgba(110,64,201,0.3)]" />
            </div>
            <h3 className="text-sm font-bold text-foreground tracking-widest mb-3 uppercase">SECTOR AUDIT</h3>
            <p className="text-[10px] text-muted-foreground font-mono leading-relaxed opacity-60 uppercase">
              CAPABILITY MATRICES AND PREPAREDNESS RATIOS ACROSS SPECIFIC ORGANIZATIONAL DEPLOYMENT SECTORS.
            </p>
          </CardContent>
        </div>

        <div className="glass-card group hover:border-emerald-500/30 transition-all">
          <CardContent className="p-8 text-center bg-emerald-500/[0.03]">
            <div className="bg-emerald-500/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-emerald-500/20 group-hover:scale-110 group-hover:bg-emerald-500/20 transition-all">
              <ShieldCheck className="size-8 text-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.3)]" />
            </div>
            <h3 className="text-sm font-bold text-foreground tracking-widest mb-3 uppercase">GLOBAL INTEL</h3>
            <p className="text-[10px] text-muted-foreground font-mono leading-relaxed opacity-60 uppercase">
              TOTAL OPERATIONAL OVERVIEW OF DISTRICT-WIDE MISSION SUCCESS AND PERSONNEL READINESS.
            </p>
          </CardContent>
        </div>
      </div>
    </div>
  );
};

export default Reports;
