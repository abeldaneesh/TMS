import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Building2, Mail, Lock, AlertCircle, ArrowLeft, ShieldCheck, Database, Cpu } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';

interface LoginProps {
  roleTitle?: string;
  allowedRoles?: string[];
}

const Login: React.FC<LoginProps> = ({ roleTitle = 'Sign In', allowedRoles }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, logout } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const loggedInUser = await login(email, password);

      // Role Verification
      if (allowedRoles && loggedInUser && !allowedRoles.includes(loggedInUser.role)) {
        logout(); // Logout immediately
        setError(`Access Denied: You are not authorized to access the ${roleTitle} portal.`);
        return;
      }

      navigate('/dashboard');
    } catch (err: any) {
      let message = 'Invalid email or password';
      if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.message === 'Network Error') {
        message = 'Network Error: Cannot connect to server. Check IP and Wifi.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background transition-colors duration-300">
      {/* Left Column: Background Image (Desktop only) */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1986&auto=format&fit=crop"
          alt="Institutional Campus"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-primary/20 backdrop-blur-[2px]" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
          <div className="bg-primary/20 backdrop-blur-md p-8 rounded-3xl mb-8 border border-primary/30 shadow-[0_0_30px_rgba(0,236,255,0.2)] animate-pulse-glow">
            <Building2 className="size-20 text-white" />
          </div>
          <h1 className="text-6xl font-black tracking-tighter text-center uppercase drop-shadow-lg">
            DMO <span className="text-primary">CORE</span>
          </h1>
          <p className="text-xl font-mono mt-4 tracking-[0.3em] uppercase opacity-90 drop-shadow-md">Security Uplink Phase</p>
          <div className="mt-8 h-1 w-32 bg-gradient-to-r from-transparent via-primary to-transparent rounded-full" />
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 overflow-y-auto relative bg-background text-foreground">
        <div className="absolute inset-0 cyber-grid opacity-10 pointer-events-none" />

        <div className="w-full max-w-md relative z-10">
          <Button variant="ghost" className="mb-6 -ml-2 text-primary/60 hover:text-primary font-mono text-xs uppercase tracking-widest" onClick={() => navigate('/login')}>
            <ArrowLeft className="size-4 mr-2" />
            BACK TO DEPLOYMENT ZONE
          </Button>

          <Card className="glass-card overflow-hidden border-border shadow-lg bg-card/40">
            <CardHeader className="space-y-4 text-center pb-8 border-b border-border bg-muted/20">
              <div className="flex justify-center">
                <div className="bg-primary/10 text-primary p-5 rounded-2xl border border-primary/20 shadow-[0_0_20px_rgba(0,236,255,0.1)]">
                  <ShieldCheck className="size-8" />
                </div>
              </div>
              <div>
                <CardTitle className="text-3xl font-black tracking-tight text-foreground uppercase">{roleTitle}</CardTitle>
                <CardDescription className="text-primary/60 pt-2 font-mono text-[10px] uppercase tracking-widest">
                  INITIATING SECURE ENCRYPTED HANDSHAKE
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive rounded-xl">
                    <AlertCircle className="size-4" />
                    <AlertDescription className="font-mono text-[10px] uppercase">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-3">
                  <Label htmlFor="email" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Command Identity (Email)</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3.5 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="IDENTITY@DMO.GOV"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12 bg-input/50 border-input focus:border-primary/50 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label htmlFor="password" title="Password" className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-1">Access Protocol (Password)</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3.5 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-12 bg-input/50 border-input focus:border-primary/50 focus:ring-primary/20 text-foreground placeholder:text-muted-foreground/50 rounded-xl"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-[0.98]" disabled={loading}>
                  {loading ? 'AUTORIZING...' : 'EXECUTE LOGIN'}
                </Button>
              </form>

              {(!allowedRoles || (!allowedRoles.includes('master_admin') && !allowedRoles.includes('institutional_admin'))) && (
                <div className="mt-10 pt-6 border-t border-border text-center">
                  <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    NEW FIELD OPERATIVE?{' '}
                    <Link
                      to={`/register?role=${allowedRoles?.includes('program_officer') ? 'program_officer' : 'participant'}`}
                      className="text-primary font-black hover:underline transition-colors ml-2"
                    >
                      REQUEST ACCESS
                    </Link>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="mt-12 flex items-center justify-center gap-6 opacity-30">
            <div className="flex items-center gap-2 font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
              <Database className="size-3" /> NODE_0{import.meta.env.VITE_API_URL ? '1' : '0'}
            </div>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2 font-mono text-[9px] text-muted-foreground uppercase tracking-widest">
              <Cpu className="size-3" /> V_4.0_STABLE
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
