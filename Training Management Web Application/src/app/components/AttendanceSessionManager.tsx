import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { attendanceApi, nominationsApi } from '../../services/api';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Clock, QrCode, StopCircle, PlayCircle, AlertTriangle, Download, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import QRCodeLib from 'qrcode';
import { format } from 'date-fns';

interface AttendanceSessionManagerProps {
    trainingId: string;
    isOwnerOrAdmin: boolean;
}

const AttendanceSessionManager: React.FC<AttendanceSessionManagerProps> = ({ trainingId, isOwnerOrAdmin }) => {
    const { user } = useAuth();
    const [session, setSession] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [duration, setDuration] = useState<number>(30); // Default 30 mins
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [timeLeft, setTimeLeft] = useState<string>('');
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchSession = async () => {

        try {
            const data = await attendanceApi.getSession(trainingId);
            setSession(data);
        } catch (error) {
            console.error('Error fetching session:', error);
            // Ignore 404 (no session yet)
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSession();
        // Poll every 10 seconds to keep synced
        const pollInterval = setInterval(fetchSession, 10000);
        return () => clearInterval(pollInterval);
    }, [trainingId]);

    // Timer Logic
    useEffect(() => {
        if (session?.isActive && session?.endTime) {
            const updateTimer = () => {
                const now = new Date().getTime();
                const end = new Date(session.endTime).getTime();
                const diff = end - now;

                if (diff <= 0) {
                    setTimeLeft('Expired');
                    if (intervalRef.current) clearInterval(intervalRef.current);
                    // Optionally refresh session to see updated state if backend auto-expires (it doesn't auto-update DB but logic expires)
                } else {
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
                    setTimeLeft(`${minutes}m ${seconds}s`);
                }
            };

            updateTimer(); // Initial call
            intervalRef.current = setInterval(updateTimer, 1000);
        } else {
            setTimeLeft('');
            if (intervalRef.current) clearInterval(intervalRef.current);
        }
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [session]);

    // QR Logic
    useEffect(() => {
        const generateQR = async () => {
            if (session?.isActive && session?.qrCodeToken) {
                try {
                    // We encode the Token. 
                    // Or better, a JSON object: { trainingId, token }
                    // The backend verification expects `token` or JSON with `token`.
                    const data = JSON.stringify({
                        trainingId,
                        token: session.qrCodeToken,
                        expiresAt: session.endTime
                    });

                    const url = await QRCodeLib.toDataURL(data, {
                        width: 400,
                        margin: 2
                    });
                    setQrCodeUrl(url);
                } catch (e) {
                    console.error('QR Gen error', e);
                }
            } else {
                setQrCodeUrl('');
            }
        };
        generateQR();
    }, [session, trainingId]);

    const handleStart = async () => {
        try {
            setLoading(true);
            await attendanceApi.startSession(trainingId, duration);
            toast.success('Attendance session started');
            await fetchSession();
        } catch (error) {
            console.error('Start failed', error);
            toast.error('Failed to start session');
        } finally {
            setLoading(false);
        }
    };

    const handleStop = async () => {
        if (!confirm('Are you sure you want to stop the attendance session? QR code will become invalid.')) return;
        try {
            setLoading(true);
            await attendanceApi.stopSession(trainingId);
            toast.success('Attendance session stopped');
            await fetchSession();
        } catch (error) {
            console.error('Stop failed', error);
            toast.error('Failed to stop session');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadQR = async () => {
        if (!qrCodeUrl) return;
        try {
            const link = document.createElement('a');
            link.href = qrCodeUrl;
            link.download = `attendance-qr-${trainingId}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            toast.success('QR Code downloaded successfully');
        } catch (error) {
            console.error('Download failed', error);
            toast.error('Failed to download QR code');
        }
    };

    // If not owner/admin AND no active session, don't show anything
    if (!isOwnerOrAdmin && !session?.isActive) return null;

    return (
        <Card className="glass-card border-primary/20">
            <CardHeader className="pb-3 border-b border-border/50">
                <CardTitle className="flex items-center gap-2 text-primary">
                    <QrCode className="size-5" />
                    Attendance Session
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                    Manage QR code based attendance for this training.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {loading && !session ? (
                    <div className="text-sm text-muted-foreground animate-pulse">Loading session status...</div>
                ) : (
                    <div className="space-y-4">
                        {session?.isActive ? (
                            <div className="flex flex-col items-center space-y-4 p-4 bg-muted/30 rounded-lg border border-border/50 shadow-sm">
                                <div className="text-center">
                                    <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-1">Time Remaining</div>
                                    <div className="text-3xl font-mono font-bold text-primary animate-pulse">
                                        {timeLeft}
                                    </div>
                                    <div className="text-xs text-muted-foreground/70 mt-1">
                                        Ends at {session.endTime ? format(new Date(session.endTime), 'h:mm:ss a') : ''}
                                    </div>
                                </div>

                                {qrCodeUrl && (
                                    <div className="p-2 border border-border/50 rounded bg-white">
                                        <img src={qrCodeUrl} alt="Attendance QR" className="w-64 h-64 object-contain" />
                                    </div>
                                )}
                                <div className="text-xs text-center text-muted-foreground max-w-xs uppercase font-semibold tracking-wider">
                                    {isOwnerOrAdmin
                                        ? "Participants must scan this code physically."
                                        : "Scan this code with your device camera."}
                                </div>

                                {isOwnerOrAdmin && (
                                    <div className="flex gap-2 w-full max-w-xs">
                                        <Button variant="outline" size="sm" onClick={handleDownloadQR} className="flex-1 border-border/50 text-foreground hover:bg-muted font-bold tracking-wider">
                                            <Download className="size-4 mr-2" /> Download
                                        </Button>
                                        <Button variant="destructive" size="sm" onClick={handleStop} className="flex-1">
                                            <StopCircle className="size-4 mr-2" /> Stop
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex flex-col sm:flex-row items-end gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
                                <div className="flex-1 w-full space-y-2">
                                    <Label htmlFor="duration" className="text-muted-foreground">Session Duration (Minutes)</Label>
                                    <div className="flex items-center gap-2">
                                        <Clock className="size-4 text-muted-foreground" />
                                        <Input
                                            id="duration"
                                            type="number"
                                            min="1"
                                            max="120"
                                            value={duration}
                                            onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                                            className="bg-input/50 border-input text-foreground"
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleStart} className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/80 font-bold tracking-wider">
                                    <PlayCircle className="size-4 mr-2" /> Start Session
                                </Button>
                            </div>
                        )}

                        {!session?.isActive && session?.endTime && new Date(session.endTime) < new Date() && (
                            <div className="flex items-center gap-2 text-sm text-yellow-500 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                                <AlertTriangle className="size-4" />
                                <span>Last session ended at {format(new Date(session.endTime), 'h:mm a')}</span>
                            </div>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default AttendanceSessionManager;
