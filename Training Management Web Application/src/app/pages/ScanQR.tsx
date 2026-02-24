import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceApi } from '../../services/api';
import { QrCode, CheckCircle, XCircle, Camera } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const ScanQR: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const isProcessingRef = useRef(false);

  // Initialize / cleanup scanner based on scanning state
  useEffect(() => {
    if (!scanning) {
      if (scanner) {
        scanner.clear();
        setScanner(null);
      }
      return;
    }

    setResult(null);

    const qrScanner = new Html5QrcodeScanner(
      'qr-reader',
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        rememberLastUsedCamera: true,
        videoConstraints: {
          facingMode: "environment"
        }
      },
      false
    );

    qrScanner.render(onScanSuccess, onScanError);
    setScanner(qrScanner);

    return () => {
      qrScanner.clear();
      setScanner(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const startScanning = () => {
    setScanning(true);
  };

  const stopScanning = () => {
    setScanning(false);
  };

  const onScanSuccess = async (decodedText: string) => {
    if (isProcessingRef.current) return;
    isProcessingRef.current = true;

    try {
      // The backend now handles all validation (token, expiry, session status, date)
      let trainingIdToUse = '';
      try {
        const parsed = JSON.parse(decodedText);
        trainingIdToUse = parsed.trainingId;
      } catch (e) {
        throw new Error('Invalid QR code format');
      }

      if (!trainingIdToUse) {
        throw new Error('Training ID not found in QR code');
      }

      await attendanceApi.markAttendance({
        trainingId: trainingIdToUse,
        participantId: user!.id,
        method: 'qr',
        qrData: decodedText,
      });

      setResult({
        success: true,
        message: t('scanQrPage.success', 'Attendance marked successfully!'),
      });
      toast.success(t('scanQrPage.success', 'Attendance marked successfully!'));
      stopScanning();
      stopScanning();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Invalid QR code';
      setResult({
        success: false,
        message: errorMsg,
      });
      toast.error(errorMsg);
      stopScanning();
    } finally {
      // Keep it true slightly longer to ensure the scanner actually stops
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1500);
    }
  };

  const onScanError = (errorMessage: string) => {
    // Ignore scanning errors (too frequent)
    console.log('Scan error:', errorMessage);
  };

  const handleManualEntry = () => {
    toast.info(t('scanQrPage.manualEntryInfo', 'Manual entry feature coming soon'));
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12 sm:pb-0">
      <div className="text-center sm:text-left">
        <h1 className="text-3xl font-black uppercase tracking-tight text-foreground">{t('scanQrPage.title1', 'Scan')} <span className="text-primary">{t('scanQrPage.title2', 'QR Code')}</span></h1>
        <p className="text-muted-foreground mt-2 font-mono text-xs uppercase tracking-widest">{t('scanQrPage.subtitle', 'Mark your presence in the system')}</p>
      </div>

      <Card className="glass-card border-primary/20 overflow-hidden bg-card/40">
        <CardHeader className="text-center sm:text-left border-b border-white/5 bg-white/5">
          <CardTitle className="flex items-center justify-center sm:justify-start gap-2 text-foreground uppercase tracking-widest">
            <QrCode className="size-5 text-primary" />
            {t('scanQrPage.scannerTitle', 'QR Scanner')}
          </CardTitle>
          <CardDescription className="text-muted-foreground font-mono text-[10px] uppercase">
            {t('scanQrPage.scannerDesc', 'Position the code within the detection field')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 px-4 sm:px-6">
          {!scanning && !result && (
            <div className="text-center py-16 space-y-6">
              <div className="mx-auto w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center border border-primary/20 shadow-[0_0_30px_rgba(0,236,255,0.1)] group">
                <Camera className="size-12 text-primary group-hover:scale-110 transition-transform" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-foreground">{t('scanQrPage.sensorReady', 'SENSOR READY')}</h3>
                <p className="text-sm text-muted-foreground font-mono uppercase tracking-tighter max-w-[280px] mx-auto">
                  {t('scanQrPage.activateDesc', 'Click below to activate the optical imaging system')}
                </p>
              </div>
              <Button
                onClick={() => {
                  setResult(null);
                  startScanning();
                }}
                size="lg"
                className="w-full sm:w-auto h-14 px-8 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(0,236,255,0.2)] active:scale-95"
              >
                <QrCode className="size-5 mr-3" />
                {t('scanQrPage.initiateScan', 'INITIATE SCAN')}
              </Button>
            </div>
          )}

          {scanning && (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full" />
              <Button onClick={stopScanning} variant="outline" className="w-full">
                {t('scanQrPage.stopScanning', 'Stop Scanning')}
              </Button>
            </div>
          )}

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'} className={`${result.success ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-destructive/10 border-destructive/20 text-destructive'} rounded-xl border`}>
              {result.success ? <CheckCircle className="size-4" /> : <XCircle className="size-4" />}
              <AlertDescription className="font-mono text-[10px] uppercase tracking-wider">{result.message}</AlertDescription>
            </Alert>
          )}

          {result && (
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setResult(null);
                  startScanning();
                }}
                className="flex-1"
              >
                {t('scanQrPage.scanAnother', 'Scan Another')}
              </Button>
              <Button onClick={() => setResult(null)} variant="outline" className="flex-1">
                {t('scanQrPage.close', 'Close')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="glass-card border-border bg-card/40">
        <CardHeader className="bg-white/5 border-b border-white/5">
          <CardTitle className="text-foreground uppercase tracking-widest text-sm">{t('scanQrPage.manualTitle', 'Operation Manual')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <ol className="list-decimal list-inside space-y-3 text-xs text-muted-foreground font-mono uppercase tracking-tighter">
            <li>{t('scanQrPage.instruction1', 'Click "INITIATE SCAN" to activate primary sensor')}</li>
            <li>{t('scanQrPage.instruction2', 'Grant security clearance for camera access')}</li>
            <li>{t('scanQrPage.instruction3', 'Align QR certificate within the capture frame')}</li>
            <li>{t('scanQrPage.instruction4', 'Maintain steady handshake until data syncs')}</li>
            <li>{t('scanQrPage.instruction5', 'Attendance log will be updated in real-time')}</li>
          </ol>

          <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
            <p className="text-[10px] text-primary font-bold uppercase tracking-widest">
              {t('scanQrPage.advisoryTitle', 'MISSION ADVISORY:')}
            </p>
            <p className="text-[10px] text-muted-foreground mt-1 uppercase leading-relaxed">
              {t('scanQrPage.advisoryDesc', 'Data uplink is only active during the scheduled session window. Ensure GPS coordinates match the training objective site.')}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="glass-card border-border bg-card/40">
        <CardHeader className="bg-white/5 border-b border-white/5">
          <CardTitle className="text-foreground uppercase tracking-widest text-sm">{t('scanQrPage.diagnosticsTitle', 'System Diagnostics')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">{t('scanQrPage.opticalFailure', 'In case of optical failure:')}</p>
          <ul className="list-disc list-inside text-xs text-muted-foreground space-y-2 ml-2 font-mono uppercase tracking-tighter">
            <li>{t('scanQrPage.diag1', 'Verify camera permissions in system settings')}</li>
            <li>{t('scanQrPage.diag2', 'Ensure adequate photon levels (environmental lighting)')}</li>
            <li>{t('scanQrPage.diag3', 'Inspect physical QR medium for data corruption')}</li>
            <li>{t('scanQrPage.diag4', 'Recalibrate lens (clean with soft cloth)')}</li>
          </ul>
          <Button onClick={handleManualEntry} variant="outline" className="w-full mt-4 h-12 border-primary/20 text-primary hover:bg-primary/10 font-bold uppercase tracking-widest text-[10px] rounded-xl">
            {t('scanQrPage.reportAnomaly', 'REPORT SYSTEM ANOMALY')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanQR;
