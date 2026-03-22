import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from 'sonner';
import { Camera, CheckCircle, QrCode, ScanLine, ShieldCheck, XCircle } from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import { attendanceApi } from '../../services/api';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';

const ScanQR: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const isProcessingRef = useRef(false);

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
        aspectRatio: 1,
        showTorchButtonIfSupported: true,
        rememberLastUsedCamera: true,
        videoConstraints: {
          facingMode: 'environment',
        },
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
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Invalid QR code';
      setResult({
        success: false,
        message: errorMsg,
      });
      toast.error(errorMsg);
      stopScanning();
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1500);
    }
  };

  const onScanError = (errorMessage: string) => {
    console.log('Scan error:', errorMessage);
  };

  const handleManualEntry = () => {
    toast.info(t('scanQrPage.manualEntryInfo', 'Manual entry feature coming soon'));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 sm:pb-0">
      <div>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground flex items-center gap-3">
          <ScanLine className="size-8 sm:size-10 text-primary" />
          <span>
            {t('scanQrPage.title1', 'Scan')} <span className="text-primary">{t('scanQrPage.title2', 'QR Code')}</span>
          </span>
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          {t('scanQrPage.subtitle', 'Mark your presence in the system')}
        </p>
      </div>

      <Card className="border-border shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-foreground">
            <QrCode className="size-5 text-primary" />
            {t('scanQrPage.scannerTitle', 'QR Scanner')}
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            {t('scanQrPage.scannerDesc', 'Position the code within the detection field')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6 px-4 sm:px-6">
          {!scanning && !result && (
            <div className="text-center py-16 space-y-6">
              <div className="mx-auto w-24 h-24 bg-primary/10 rounded-3xl flex items-center justify-center">
                <Camera className="size-12 text-primary" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-foreground">
                  {t('scanQrPage.sensorReady', 'Scanner ready')}
                </h3>
                <p className="text-sm text-muted-foreground max-w-[320px] mx-auto">
                  {t('scanQrPage.activateDesc', 'Click below to start scanning the QR code for attendance.')}
                </p>
              </div>
              <Button
                onClick={() => {
                  setResult(null);
                  startScanning();
                }}
                size="lg"
                className="w-full sm:w-auto h-12 px-8 active:scale-95"
              >
                <QrCode className="size-5 mr-3" />
                {t('scanQrPage.initiateScan', 'Start Scanning')}
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
            <Alert
              variant={result.success ? 'default' : 'destructive'}
              className={`${result.success ? 'bg-green-500/10 border-green-500/20 text-green-700 dark:text-green-400' : 'bg-destructive/10 border-destructive/20 text-destructive'} rounded-xl border`}
            >
              {result.success ? <CheckCircle className="size-4" /> : <XCircle className="size-4" />}
              <AlertDescription className="text-sm">{result.message}</AlertDescription>
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

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/20 border-b border-border">
            <CardTitle className="text-base text-foreground">{t('scanQrPage.manualTitle', 'How to scan')}</CardTitle>
            <CardDescription>{t('scanQrPage.scannerDesc', 'Position the code within the detection field')}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
              <li>{t('scanQrPage.instruction1', 'Click "Start Scanning" to activate the camera.')}</li>
              <li>{t('scanQrPage.instruction2', 'Allow camera access when prompted.')}</li>
              <li>{t('scanQrPage.instruction3', 'Hold the QR code steady inside the scan area.')}</li>
              <li>{t('scanQrPage.instruction4', 'Keep the phone stable until the code is detected.')}</li>
              <li>{t('scanQrPage.instruction5', 'Your attendance will be marked immediately after a successful scan.')}</li>
            </ol>

            <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
              <p className="text-sm font-medium text-foreground">{t('scanQrPage.advisoryTitle', 'Important note')}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {t('scanQrPage.advisoryDesc', 'Attendance can only be marked during the active training session. Make sure you are scanning the correct session QR code.')}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader className="bg-muted/20 border-b border-border">
            <CardTitle className="text-base text-foreground flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" />
              {t('scanQrPage.diagnosticsTitle', 'Need help?')}
            </CardTitle>
            <CardDescription>{t('scanQrPage.opticalFailure', 'If the scanner is not working, try these steps.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-2">
              <li>{t('scanQrPage.diag1', 'Verify camera permissions in system settings')}</li>
              <li>{t('scanQrPage.diag2', 'Ensure there is enough light around the QR code')}</li>
              <li>{t('scanQrPage.diag3', 'Check that the QR code is clear and not damaged')}</li>
              <li>{t('scanQrPage.diag4', 'Clean the camera lens and try again')}</li>
            </ul>
            <Button onClick={handleManualEntry} variant="outline" className="w-full h-12">
              {t('scanQrPage.reportAnomaly', 'Need manual help')}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ScanQR;
