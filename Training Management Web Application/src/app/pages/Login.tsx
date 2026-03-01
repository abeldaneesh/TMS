import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../contexts/ThemeContext';
import { Mail, Lock, AlertCircle, ArrowLeft, ShieldCheck, Database, Cpu, Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import DoctorLogo from '../components/DoctorLogo';
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
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password, allowedRoles);
      navigate('/dashboard');
    } catch (err: any) {
      let message = t('auth.invalidCredentials', 'Invalid email or password');
      if (err.message === 'UNAUTHORIZED_ROLE') {
        message = `Access Denied: You are not authorized to access the ${roleTitle} portal.`;
      } else if (err.response?.data?.message) {
        message = err.response.data.message;
      } else if (err.message === 'Network Error') {
        message = t('auth.networkError', 'Network Error: Cannot connect to server. Check IP and Wifi.');
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="min-h-screen flex flex-col md:flex-row bg-background"
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

      {/* Left Column */}
      <div className="hidden md:flex md:w-1/2 relative overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1562774053-701939374585?q=80&w=1986&auto=format&fit=crop"
          alt="Institutional Campus"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />
        <div className="relative z-10 flex flex-col items-center justify-center w-full p-12 text-white">
          <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl mb-8 border border-white/20 shadow-2xl">
            <DoctorLogo className="size-20 text-white" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-center text-white">
            DMO TMS
          </h1>
        </div>
      </div>

      {/* Right Column: Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 md:p-12 overflow-y-auto relative bg-background text-foreground">
        <div className="w-full max-w-md relative z-10">
          <Button variant="ghost" className="mb-6 -ml-2 text-muted-foreground hover:text-foreground" onClick={() => navigate('/login')}>
            <ArrowLeft className="size-4 mr-2" />
            {t('auth.goBack', 'Back')}
          </Button>

          <Card className="border shadow-lg bg-card">
            <CardHeader className="space-y-1 text-center pb-6 pt-8">
              <div className="flex justify-center mb-2">
                <div className="bg-primary/10 text-primary p-3 rounded-full">
                  <ShieldCheck className="size-8" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold tracking-tight">{roleTitle}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <Alert variant="destructive" className="bg-destructive/10 border-destructive/20 text-destructive">
                    <AlertCircle className="size-4" />
                    <AlertDescription className="text-sm">{error}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email" className="font-medium text-sm">{t('auth.email', 'Email Address')}</Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-3 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-11 bg-background"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="font-medium text-sm">{t('auth.password', 'Password')}</Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-3 size-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 h-11 bg-background"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 font-medium mt-2" disabled={loading}>
                  {loading ? t('auth.signingIn', 'Signing in...') : t('auth.signIn', 'Sign In')}
                </Button>
              </form>

              {(!allowedRoles || (!allowedRoles.includes('master_admin') && !allowedRoles.includes('institutional_admin'))) && (
                <div className="mt-8 pt-6 border-t border-border text-center">
                  <p className="text-sm text-muted-foreground">
                    {t('auth.noAccount', "Don't have an account?")}{' '}
                    <Link
                      to={`/register?role=${allowedRoles?.includes('program_officer') ? 'program_officer' : 'participant'}`}
                      className="text-primary font-medium hover:underline transition-colors ml-1"
                    >
                      {t('auth.requestAccess', 'Request Access')}
                    </Link>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </motion.div>
  );
};

export default Login;
