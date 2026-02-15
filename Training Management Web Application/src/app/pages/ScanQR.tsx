import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceApi } from '../../services/api';
import { QrCode, CheckCircle, XCircle, Camera } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { toast } from 'sonner';

const ScanQR: React.FC = () => {
  const { user } = useAuth();
  const [scanning, setScanning] = useState(false);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

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
        message: 'Attendance marked successfully!',
      });
      toast.success('Attendance marked successfully!');
      stopScanning();
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message || 'Invalid QR code';
      setResult({
        success: false,
        message: errorMsg,
      });
      toast.error(errorMsg);
      stopScanning();
    }
  };

  const onScanError = (errorMessage: string) => {
    // Ignore scanning errors (too frequent)
    console.log('Scan error:', errorMessage);
  };

  const handleManualEntry = () => {
    toast.info('Manual entry feature coming soon');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Scan QR Code</h1>
        <p className="text-gray-500 mt-1">Scan the training QR code to mark your attendance</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="size-5" />
            QR Scanner
          </CardTitle>
          <CardDescription>Position the QR code within the scanning area</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!scanning && !result && (
            <div className="text-center py-12 space-y-4">
              <div className="mx-auto w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
                <Camera className="size-12 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-2">Ready to scan</h3>
                <p className="text-sm text-gray-600">
                  Click the button below to start scanning the QR code
                </p>
              </div>
              <Button
                onClick={() => {
                  setResult(null);
                  startScanning();
                }}
                size="lg"
              >
                <QrCode className="size-5 mr-2" />
                Start Scanning
              </Button>
            </div>
          )}

          {scanning && (
            <div className="space-y-4">
              <div id="qr-reader" className="w-full" />
              <Button onClick={stopScanning} variant="outline" className="w-full">
                Stop Scanning
              </Button>
            </div>
          )}

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              {result.success ? <CheckCircle className="size-4" /> : <XCircle className="size-4" />}
              <AlertDescription>{result.message}</AlertDescription>
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
                Scan Another
              </Button>
              <Button onClick={() => setResult(null)} variant="outline" className="flex-1">
                Close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Instructions</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
            <li>Click "Start Scanning" to activate your device camera</li>
            <li>Allow camera permissions when prompted</li>
            <li>Position the QR code within the scanning box</li>
            <li>Hold steady until the code is scanned</li>
            <li>Your attendance will be marked automatically</li>
          </ol>

          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> You can only mark attendance during the active attendance session.
              Make sure you are at the correct training venue.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Having trouble scanning?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-gray-600">If you're unable to scan the QR code:</p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 ml-2">
            <li>Ensure your camera has permission to access</li>
            <li>Check that there's adequate lighting</li>
            <li>Make sure the QR code is clearly visible and not damaged</li>
            <li>Try cleaning your camera lens</li>
          </ul>
          <Button onClick={handleManualEntry} variant="outline" className="w-full mt-4">
            Report Issue / Request Manual Entry
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ScanQR;
