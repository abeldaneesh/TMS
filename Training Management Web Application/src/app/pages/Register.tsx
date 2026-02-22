import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Phone, Briefcase, ChevronLeft, ShieldCheck, Sun, Moon } from 'lucide-react';
import DoctorLogo from '../components/DoctorLogo';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { authApi, usersApi } from '../../services/api';
import { toast } from 'sonner';

const Register: React.FC = () => {
    const [searchParams] = useSearchParams();
    const roleParam = searchParams.get('role') || 'participant';
    const displayRole = roleParam === 'program_officer' ? 'Program Officer' : 'Field Personnel';
    const { t, i18n } = useTranslation();
    const { theme, toggleTheme } = useTheme();

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        institutionId: '',
        designation: '',
        phone: '',
        department: '',
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [otp, setOtp] = useState('');
    const [emailVerified, setEmailVerified] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const navigate = useNavigate();

    // Redirect if admin role is manually entered in URL
    useEffect(() => {
        if (roleParam === 'master_admin' || roleParam === 'institutional_admin') {
            navigate('/login');
        }
    }, [roleParam, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSelectChange = (value: string) => {
        setFormData({ ...formData, institutionId: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        if (!formData.email.toLowerCase().endsWith('@gmail.com')) {
            toast.error('Only Google (@gmail.com) email addresses are allowed.');
            return;
        }

        if (formData.password.length < 8) {
            toast.error('Password must be at least 8 characters long.');
            return;
        }

        if (!emailVerified) {
            toast.error('Please verify your email address before registering.');
            return;
        }

        setLoading(true);
        try {
            const { confirmPassword, ...registerData } = formData;
            const res = await authApi.register({ ...registerData, role: roleParam });
            setSuccess(true);
            toast.success('Registration request submitted');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const handleSendOtp = async () => {
        if (!formData.email.toLowerCase().endsWith('@gmail.com')) {
            toast.error('Only Google (@gmail.com) email addresses are allowed.');
            return;
        }
        setSendingOtp(true);
        try {
            await authApi.sendOtp({ email: formData.email });
            setShowOtpInput(true);
            toast.success('Verification code sent to your email.');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to send verification code');
        } finally {
            setSendingOtp(false);
        }
    };

    const handleVerifyInlineOtp = async () => {
        if (otp.length < 6) return;
        setLoading(true);
        try {
            await authApi.verifyOtp({ email: formData.email, otp });
            setEmailVerified(true);
            toast.success('Email verified successfully!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="min-h-screen bg-background flex items-center justify-center p-4 relative"
            >
                {/* Floating Action Buttons */}
                <div className="absolute top-4 right-4 z-50 flex gap-2">
                    <Button variant="outline" size="icon" className="bg-background/80 backdrop-blur-md rounded-full shadow-md" onClick={() => i18n.changeLanguage(i18n.language.startsWith('ml') ? 'en' : 'ml')}>
                        <span className="text-lg">🌐</span>
                    </Button>
                    <Button variant="outline" size="icon" className="bg-background/80 backdrop-blur-md rounded-full shadow-md" onClick={toggleTheme}>
                        {theme === 'dark' ? <Sun className="size-5 text-yellow-500" /> : <Moon className="size-5 text-slate-700" />}
                    </Button>
                </div>
                <Card className="w-full max-w-md border bg-card text-center shadow-lg relative z-10 overflow-hidden">
                    <div className="relative z-10 flex flex-col items-center justify-center w-full p-10 bg-primary/5 rounded-t-xl">
                        <div className="bg-primary/10 p-6 rounded-2xl mb-6">
                            <DoctorLogo className="size-16 text-primary" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight text-center text-foreground">{t('auth.register.title', 'Request Received')}</h1>
                        <CardDescription className="mt-2 text-sm text-muted-foreground text-center">
                            {t('auth.register.subtitle', 'Your registration request has been submitted successfully.')}
                        </CardDescription>
                    </div>
                    <CardContent className="space-y-6 pt-6 mb-2">
                        <div className="p-4 bg-muted/50 rounded-lg border border-border">
                            <p className="text-sm font-medium text-foreground">
                                {t('auth.register.status', 'Status:')} <span className="text-primary">{t('auth.register.pending', 'Pending Approval')}</span>
                            </p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {t('auth.register.desc', 'You will gain access to the system once an administrator validates your request.')}
                        </p>
                    </CardContent>
                    <CardFooter className="pb-8 px-6">
                        <Button className="w-full h-11" onClick={() => navigate('/login')}>
                            {t('auth.register.return', 'Back to Login')}
                        </Button>
                    </CardFooter>
                </Card>
            </motion.div>
        );
    }



    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="min-h-screen bg-background flex items-center justify-center p-4 py-8 relative"
        >
            <Card className="w-full max-w-2xl border bg-card shadow-lg relative z-10 overflow-hidden">
                <CardHeader className="space-y-4 pb-6">
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="text-muted-foreground hover:text-foreground p-2 transition-colors">
                            <ChevronLeft className="size-5" />
                        </Link>
                        <div>
                            <CardTitle className="text-2xl font-bold text-foreground tracking-tight">Register ({displayRole})</CardTitle>
                            <CardDescription className="text-muted-foreground mt-1 text-sm">
                                Create your account to access the training management system
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-medium">{t('auth.register.fullName', 'Full Name')}</Label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-3 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="name"
                                        placeholder="John Doe"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="pl-10 h-11 bg-background"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email with Inline Verification */}
                            <div className="space-y-2 col-span-1 md:col-span-2 lg:col-span-1">
                                <Label htmlFor="email" className="text-sm font-medium">{t('auth.register.email', 'Email Address')}</Label>
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 relative">
                                        <div className="relative group flex-1">
                                            <Mail className="absolute left-3 top-3 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                            <Input
                                                id="email"
                                                type="email"
                                                placeholder="name@example.com"
                                                value={formData.email}
                                                onChange={handleChange}
                                                disabled={emailVerified || sendingOtp}
                                                className={`pl-10 h-11 bg-background ${emailVerified ? 'border-green-500 bg-green-50/50' : ''}`}
                                                required
                                            />
                                        </div>
                                        {emailVerified ? (
                                            <Button type="button" variant="outline" className="h-11 bg-green-50 text-green-600 hover:text-green-700 hover:bg-green-100 border-green-200 pointer-events-none w-[120px]">
                                                <ShieldCheck className="mr-2 h-4 w-4" /> Verified
                                            </Button>
                                        ) : (
                                            <Button
                                                type="button"
                                                onClick={handleSendOtp}
                                                disabled={sendingOtp || !formData.email || emailVerified}
                                                className="h-11 w-[120px]"
                                            >
                                                {sendingOtp ? 'Sending...' : 'Send Code'}
                                            </Button>
                                        )}
                                    </div>

                                    {!emailVerified && showOtpInput && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            className="flex gap-2"
                                        >
                                            <Input
                                                id="otp"
                                                type="text"
                                                placeholder="Enter 6-digit code"
                                                value={otp}
                                                onChange={(e) => setOtp(e.target.value)}
                                                maxLength={6}
                                                className="h-11 bg-background text-center tracking-widest font-mono font-bold flex-1"
                                                required
                                            />
                                            <Button
                                                type="button"
                                                onClick={handleVerifyInlineOtp}
                                                disabled={loading || otp.length < 6}
                                                className="h-11 w-[120px] bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                {loading ? '...' : 'Verify'}
                                            </Button>
                                        </motion.div>
                                    )}
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <Label htmlFor="password" title="Password" className="text-sm font-medium">{t('auth.register.password', 'Password')}</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="pl-10 h-11 bg-background"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" title="Confirm Password" className="text-sm font-medium">{t('auth.register.confirmPassword', 'Confirm Password')}</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="pl-10 h-11 bg-background"
                                        required
                                    />
                                </div>
                            </div>


                            {/* Designation */}
                            <div className="space-y-2">
                                <Label htmlFor="designation" className="text-sm font-medium">{t('auth.register.designation', 'Designation')}</Label>
                                <div className="relative group">
                                    <Briefcase className="absolute left-3 top-3 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="designation"
                                        placeholder="Medical Officer"
                                        value={formData.designation}
                                        onChange={handleChange}
                                        className="pl-10 h-11 bg-background"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-sm font-medium">{t('auth.register.phone', 'Phone Number')}</Label>
                                <div className="relative group">
                                    <Phone className="absolute left-3 top-3 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="phone"
                                        placeholder="+91 XXXXXXXXXX"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="pl-10 h-11 bg-background"
                                    />
                                </div>
                            </div>

                            {/* Department */}
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="department" className="text-sm font-medium">{t('auth.register.department', 'Department')}</Label>
                                <Input
                                    id="department"
                                    placeholder="Pediatrics"
                                    value={formData.department}
                                    onChange={handleChange}
                                    className="h-11 bg-background"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-11" disabled={loading}>
                            {loading ? t('auth.register.creating', 'Creating Account...') : t('auth.register.register', 'Register')}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center border-t border-border p-6 bg-muted/20">
                    <p className="text-sm text-muted-foreground">
                        {t('auth.register.existing', 'Already have an account?')}
                        <Link to="/login" className="text-primary hover:underline ml-1 font-medium">
                            {t('auth.register.authenticate', 'Sign in')}
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </motion.div>
    );
};

export default Register;
