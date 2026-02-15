import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Building2, Mail, Lock, User, Phone, Briefcase, ChevronLeft, ShieldCheck } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { usersApi } from '../../services/api';
import { toast } from 'sonner';

const Register: React.FC = () => {
    const [searchParams] = useSearchParams();
    const roleParam = searchParams.get('role') || 'participant';
    const displayRole = roleParam === 'program_officer' ? 'Program Officer' : 'Field Personnel';

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
            toast.error('PASSWORDS DO NOT MATCH');
            return;
        }

        setLoading(true);
        try {
            const { confirmPassword, ...registerData } = formData;
            await usersApi.create({ ...registerData, role: roleParam });
            setSuccess(true);
            toast.success('REGISTRATION PROTOCOL INITIATED');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'REGISTRATION FAILED');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4 relative">
                <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
                <Card className="w-full max-w-md glass-card text-center border-border shadow-lg relative z-10 bg-card/40">
                    <CardHeader>
                        <div className="mx-auto bg-primary/10 text-primary p-5 rounded-full w-fit mb-6 border border-primary/20 shadow-lg glow-primary">
                            <ShieldCheck className="size-12" />
                        </div>
                        <CardTitle className="text-3xl font-black tracking-tight text-foreground uppercase leading-none">Access Requested</CardTitle>
                        <CardDescription className="text-primary/70 mt-4 font-mono text-xs uppercase tracking-widest leading-relaxed">
                            YOUR OPERATIVE CREDENTIALS HAVE BEEN TRANSMITTED.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="p-4 bg-muted/50 rounded-xl border border-border">
                            <p className="text-sm text-foreground/80 font-mono uppercase tracking-tight">
                                STATUS: <span className="text-primary font-bold">PENDING_APPROVAL</span>
                            </p>
                        </div>
                        <p className="text-xs text-muted-foreground font-mono uppercase leading-relaxed">
                            YOU WILL GAIN SYSTEM CLEARANCE ONCE A COMMAND ADMINISTRATOR VALIDATES YOUR REQUEST.
                        </p>
                    </CardContent>
                    <CardFooter>
                        <Button className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-xl transition-all" variant="outline" onClick={() => navigate('/login')}>
                            RETURN TO ENTRY
                        </Button>
                    </CardFooter>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4 py-16 relative">
            <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />
            <div className="absolute inset-0 bg-radial-gradient from-primary/5 via-transparent to-transparent opacity-30 pointer-events-none" />

            <Card className="w-full max-w-2xl glass-card border-border shadow-2xl relative z-10 overflow-hidden bg-card/40">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />

                <CardHeader className="space-y-4 pb-8">
                    <div className="flex items-center gap-4">
                        <Link to="/login" className="bg-muted/50 p-2 rounded-lg text-primary hover:bg-primary/10 transition-colors border border-border">
                            <ChevronLeft className="size-5" />
                        </Link>
                        <div>
                            <CardTitle className="text-3xl font-black text-foreground uppercase tracking-tight">{displayRole}</CardTitle>
                            <CardDescription className="text-primary/60 font-mono text-[10px] uppercase tracking-[0.2em] mt-1">
                                REGISTRATION PROTOCOL — {roleParam === 'program_officer' ? 'COMMAND_UNIT' : 'FIELD_OPERATIVE'}
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-6">
                            {/* Name */}
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Full Identity</Label>
                                <div className="relative group">
                                    <User className="absolute left-3 top-3.5 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="name"
                                        placeholder="DR. NAME"
                                        value={formData.name}
                                        onChange={handleChange}
                                        className="pl-10 h-12 bg-input/50 border-input focus:border-primary/50 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Email */}
                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Direct Uplink (Email)</Label>
                                <div className="relative group">
                                    <Mail className="absolute left-3 top-3.5 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="ID@HEALTH.GOV"
                                        value={formData.email}
                                        onChange={handleChange}
                                        className="pl-10 h-12 bg-input/50 border-input focus:border-primary/50 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Password */}
                            <div className="space-y-2">
                                <Label htmlFor="password" title="Password" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Access Cipher</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3.5 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.password}
                                        onChange={handleChange}
                                        className="pl-10 h-12 bg-input/50 border-input focus:border-primary/50 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Confirm Password */}
                            <div className="space-y-2">
                                <Label htmlFor="confirmPassword" title="Confirm Password" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Verify Cipher</Label>
                                <div className="relative group">
                                    <Lock className="absolute left-3 top-3.5 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="confirmPassword"
                                        type="password"
                                        placeholder="••••••••"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        className="pl-10 h-12 bg-input/50 border-input focus:border-primary/50 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Institution */}
                            <div className="space-y-2">
                                <Label htmlFor="institutionId" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Sector / Station</Label>
                                <Select onValueChange={handleSelectChange} required>
                                    <SelectTrigger className="h-12 bg-input/50 border-input text-foreground rounded-xl focus:ring-primary/20">
                                        <SelectValue placeholder="SELECT STATION" />
                                    </SelectTrigger>
                                    <SelectContent className="glass-card border-primary/20">
                                        <SelectItem value="inst-1">DISTRICT GENERAL HOSPITAL</SelectItem>
                                        <SelectItem value="inst-2">COMMUNITY HEALTH CENTER - NORTH</SelectItem>
                                        <SelectItem value="inst-3">PRIMARY HEALTH CENTER - EAST</SelectItem>
                                        <SelectItem value="inst-4">PRIMARY HEALTH CENTER - WEST</SelectItem>
                                        <SelectItem value="inst-5">URBAN HEALTH CENTER - SOUTH</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Designation */}
                            <div className="space-y-2">
                                <Label htmlFor="designation" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Operational Rank</Label>
                                <div className="relative group">
                                    <Briefcase className="absolute left-3 top-3.5 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="designation"
                                        placeholder="MEDICAL OFFICER"
                                        value={formData.designation}
                                        onChange={handleChange}
                                        className="pl-10 h-12 bg-input/50 border-input focus:border-primary/50 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Phone */}
                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Comm Link (Phone)</Label>
                                <div className="relative group">
                                    <Phone className="absolute left-3 top-3.5 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                    <Input
                                        id="phone"
                                        placeholder="+91-XXXXXXXXXX"
                                        value={formData.phone}
                                        onChange={handleChange}
                                        className="pl-10 h-12 bg-input/50 border-input focus:border-primary/50 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
                                    />
                                </div>
                            </div>

                            {/* Department */}
                            <div className="space-y-2">
                                <Label htmlFor="department" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Division</Label>
                                <Input
                                    id="department"
                                    placeholder="EMERGENCY / PEDIATRICS"
                                    value={formData.department}
                                    onChange={handleChange}
                                    className="h-12 bg-input/50 border-input focus:border-primary/50 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
                                />
                            </div>
                        </div>

                        <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-xl transition-all shadow-md" disabled={loading}>
                            {loading ? 'TRANSMITTING...' : 'INITIATE REQUEST'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="justify-center border-t border-border p-6 bg-muted/20">
                    <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                        EXISTING OPERATIVE?{' '}
                        <Link to="/login" className="text-primary font-black hover:underline ml-2">
                            AUTHENTICATE
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
};

export default Register;
