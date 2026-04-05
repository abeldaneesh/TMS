import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Phone, Briefcase, ChevronLeft, ShieldCheck, Sun, Moon } from 'lucide-react';
import TmsLogo from '../components/TmsLogo';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { authApi, institutionsApi } from '../../services/api';
import { Institution } from '../../types';
import { toast } from 'sonner';

const operationalRankOptions = [
    'Program Officer',
    'Charge Medical Officer',
    'Block Medical Officer',
    'Health Supervisor',
    'Public Health Nurse Supervisor',
    'Health Inspector',
    'Public Health Nurse',
    'Junior Health Inspector',
    'Junior Public Health Nurse',
    'Mid Level Service Provider',
    'Nursing Officer',
    'Senior Nursing Officer',
    'Pharmacist',
    'Lab Technician',
    'RBSK Nurse',
    'Primary Palliative Nurse',
    'Secondary Palliative Nurse',
    'Physiotherapist',
    'Nursing Assistant',
    'Block Epidemiologist',
    'Entomologist',
    'Data Manager',
    'Ministerial Staff',
    'PH Admins',
    'One Health LSGD Mentor',
] as const;

const normalizePhoneNumber = (value: string) => value.replace(/\D/g, '').slice(0, 10);
const EMAIL_FORMAT_REGEX = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

const getEmailFormatMessage = (value: string) => {
    const email = value.trim().toLowerCase();

    if (!email) {
        return 'Email address is required.';
    }

    const [localPart = '', domain = ''] = email.split('@');
    const domainParts = domain.split('.');
    const hasInvalidDomainPart = domainParts.some((part) => !part || part.startsWith('-') || part.endsWith('-'));

    if (
        !EMAIL_FORMAT_REGEX.test(email)
        || localPart.startsWith('.')
        || localPart.endsWith('.')
        || localPart.includes('..')
        || domainParts.length < 2
        || hasInvalidDomainPart
    ) {
        return 'Enter a valid email address like name@example.com.';
    }

    return '';
};

const Register: React.FC = () => {
    const [searchParams] = useSearchParams();
    const roleParam = searchParams.get('role') || 'participant';
    const isParticipantRegistration = roleParam === 'participant';
    const displayRole = roleParam === 'program_officer' ? 'Program Officer'
        : roleParam === 'medical_officer' ? 'Medical Officer'
            : 'Field Personnel';
    const { t, i18n } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const isDarkMode = theme === 'dark';

    const pageBackgroundClass = isDarkMode
        ? 'bg-background'
        : 'bg-[radial-gradient(circle_at_top,rgba(79,70,229,0.08),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#f3f6fb_100%)]';

    const floatingButtonClass = isDarkMode
        ? 'bg-background/80 backdrop-blur-md rounded-full shadow-md'
        : 'bg-white/90 border-slate-200 text-slate-700 backdrop-blur-md rounded-full shadow-sm shadow-slate-200/80';

    const authCardClass = isDarkMode
        ? 'w-full max-w-md border bg-card text-center shadow-lg relative z-10 overflow-hidden'
        : 'w-full max-w-md border border-slate-200/90 bg-white text-center shadow-[0_24px_55px_-24px_rgba(15,23,42,0.30)] relative z-10 overflow-hidden';

    const registerCardClass = isDarkMode
        ? 'w-full max-w-2xl border bg-card shadow-lg relative z-10 overflow-hidden'
        : 'w-full max-w-2xl border border-slate-200/90 bg-white shadow-[0_24px_55px_-24px_rgba(15,23,42,0.30)] relative z-10 overflow-hidden';

    const inputClass = isDarkMode
        ? 'pl-10 h-11 bg-background'
        : 'pl-10 h-11 bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:border-primary/40';

    const plainInputClass = isDarkMode
        ? 'h-11 bg-background'
        : 'h-11 bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:border-primary/40';

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
    const [emailServerError, setEmailServerError] = useState('');
    const [institutions, setInstitutions] = useState<Institution[]>([]);
    const navigate = useNavigate();
    const normalizedEmail = formData.email.trim().toLowerCase();
    const emailFormatMessage = formData.email ? getEmailFormatMessage(formData.email) : '';
    const emailValidationMessage = emailFormatMessage || emailServerError;

    useEffect(() => {
        const fetchInstitutions = async () => {
            try {
                const data = await institutionsApi.getAll();
                setInstitutions(data);
            } catch (error) {
                console.error('Failed to fetch institutions');
            }
        };
        fetchInstitutions();
    }, []);

    // Redirect if admin role is manually entered in URL
    useEffect(() => {
        if (roleParam === 'master_admin' || roleParam === 'institutional_admin') {
            navigate('/login');
        }
    }, [roleParam, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { id, value } = e.target;

        if (id === 'email') {
            const normalizedValue = value.trim().toLowerCase();
            setEmailVerified(false);
            setShowOtpInput(false);
            setOtp('');
            setEmailServerError('');
            setFormData({
                ...formData,
                email: normalizedValue,
            });
            return;
        }

        setFormData({
            ...formData,
            [id]: id === 'phone' ? normalizePhoneNumber(value) : value,
        });
    };

    const handleSelectChange = (field: 'institutionId' | 'designation') => (value: string) => {
        setFormData({ ...formData, [field]: value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast.error('Passwords do not match');
            return;
        }

        const emailMessage = getEmailFormatMessage(formData.email);
        if (emailMessage) {
            setEmailServerError(emailMessage);
            toast.error(emailMessage);
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

        if (formData.phone && formData.phone.length !== 10) {
            toast.error('Phone number must be exactly 10 digits.');
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
        const emailMessage = getEmailFormatMessage(formData.email);
        if (emailMessage) {
            setEmailServerError(emailMessage);
            toast.error(emailMessage);
            return;
        }

        setSendingOtp(true);
        setEmailServerError('');
        try {
            await authApi.sendOtp({ email: normalizedEmail });
            setShowOtpInput(true);
            toast.success('Verification code sent to your email.');
        } catch (err: any) {
            const message = err.response?.data?.message || 'Failed to send verification code';
            setEmailServerError(message);
            toast.error(message);
        } finally {
            setSendingOtp(false);
        }
    };

    const handleVerifyInlineOtp = async () => {
        if (otp.length < 6) return;
        setLoading(true);
        try {
            await authApi.verifyOtp({ email: normalizedEmail, otp });
            setEmailVerified(true);
            setEmailServerError('');
            toast.success('Email verified successfully!');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Invalid OTP');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className={`min-h-screen flex items-center justify-center p-4 relative ${pageBackgroundClass}`}>
                {/* Floating Action Buttons */}
                <div className="absolute top-4 right-4 z-50 flex gap-2">
                    <Button variant="outline" size="icon" className={floatingButtonClass} onClick={() => i18n.changeLanguage(i18n.language.startsWith('ml') ? 'en' : 'ml')}>
                        <span className="text-lg">🌐</span>
                    </Button>
                    <Button variant="outline" size="icon" className={floatingButtonClass} onClick={toggleTheme}>
                        {theme === 'dark' ? <Sun className="size-5 text-yellow-500" /> : <Moon className="size-5 text-slate-700" />}
                    </Button>
                </div>
                {!isDarkMode && <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.94))]" />}
                <Card className={authCardClass}>
                    <div className="relative z-10 flex flex-col items-center justify-center w-full p-10 bg-primary/5 rounded-t-xl">
                        <div className="mb-6">
                            <TmsLogo className="size-24 text-primary" />
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
            </div>
        );
    }



    return (
        <div className={`min-h-screen flex items-center justify-center p-4 py-8 relative ${pageBackgroundClass}`}>
            {!isDarkMode && <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.72),rgba(255,255,255,0.94))]" />}
            <Card className={registerCardClass}>
                <CardHeader className="space-y-4 pb-6">
                    <div className="flex items-center gap-4">
                        <Link to="/login" className={isDarkMode ? 'text-muted-foreground hover:text-foreground p-2 transition-colors' : 'text-slate-500 hover:text-slate-900 p-2 transition-colors'}>
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
                                        className={inputClass}
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
                                                aria-invalid={!!emailValidationMessage}
                                                className={`${inputClass} ${emailVerified ? 'border-green-500 bg-green-50/50' : ''}`}
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
                                                disabled={sendingOtp || !normalizedEmail || !!emailFormatMessage || emailVerified}
                                                className="h-11 w-[120px]"
                                            >
                                                {sendingOtp ? 'Sending...' : 'Send Code'}
                                            </Button>
                                        )}
                                    </div>

                                    {!emailVerified && emailValidationMessage && (
                                        <p className="text-sm text-destructive">{emailValidationMessage}</p>
                                    )}

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
                                                className={`${isDarkMode ? 'h-11 bg-background' : 'h-11 bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:border-primary/40'} text-center tracking-widest font-mono font-bold flex-1`}
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
                                        className={inputClass}
                                        required
                                    />
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" title="Verify Password" className="text-sm font-medium">{t('auth.register.confirmPassword', 'Verify Password')}</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className={inputClass}
                                        required
                                    />
                                </div>
                            </div>


                            {/* Institution */}
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="institutionId" className="text-sm font-medium">{t('auth.register.institution', 'Institution')}</Label>
                                <Select onValueChange={handleSelectChange('institutionId')} value={formData.institutionId}>
                                    <SelectTrigger className={plainInputClass}>
                                        <SelectValue placeholder="Select your institution" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {institutions.length > 0 ? (
                                            institutions.map((inst) => (
                                                <SelectItem key={inst.id} value={inst.id}>
                                                    {inst.name}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-4 text-center text-sm text-muted-foreground">
                                                No institutions found
                                            </div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            {isParticipantRegistration && (
                                <div className="space-y-2">
                                    <Label htmlFor="designation" className="text-sm font-medium">{t('auth.register.designation', 'Designation')}</Label>
                                    <div className="relative">
                                        <Briefcase className="absolute left-3 top-3 size-4 text-muted-foreground z-10 pointer-events-none" />
                                        <Select onValueChange={handleSelectChange('designation')} value={formData.designation}>
                                            <SelectTrigger className={isDarkMode ? 'pl-10 h-11 bg-background' : 'pl-10 h-11 bg-slate-50 border-slate-200 focus-visible:bg-white focus-visible:border-primary/40'}>
                                                <SelectValue placeholder="Select operational rank" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {operationalRankOptions.map((rank) => (
                                                    <SelectItem key={rank} value={rank}>
                                                        {rank}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}

                            {/* Phone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-sm font-medium">{t('auth.register.phone', 'Phone Number')}</Label>
                                <div className="relative group">
                                    <Phone className="absolute left-3 top-3 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="phone"
                                        placeholder="9876543210"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className={inputClass}
                                        inputMode="numeric"
                                        maxLength={10}
                                        pattern="\d{10}"
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
                                    className={plainInputClass}
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
        </div>
    );
};

export default Register;
