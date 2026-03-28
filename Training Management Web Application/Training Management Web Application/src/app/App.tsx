import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import Layout from './components/Layout';
import PageTransition from './components/PageTransition';
import { AnimatePresence } from 'framer-motion';
import PortalSelection from './pages/PortalSelection';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Trainings from './pages/Trainings';
import TrainingDetails from './pages/TrainingDetails';
import TrainingAttendance from './pages/TrainingAttendance';
import CreateTraining from './pages/CreateTraining';
import MyAttendance from './pages/MyAttendance';
import TrainingParticipants from './pages/TrainingParticipants';
import ScanQR from './pages/ScanQR';
import Reports from './pages/Reports';
import Nominations from './pages/Nominations';
import Analytics from './pages/Analytics';
import HallAvailability from './pages/HallAvailability';
import Register from './pages/Register';
import UserApprovals from './pages/UserApprovals';
import ProgramOfficers from './pages/ProgramOfficers';
import MedicalOfficers from './pages/MedicalOfficers';
import NotificationsMobile from './pages/NotificationsMobile';
import Participants from './pages/Participants';
import Institutions from './pages/Institutions';
import Halls from './pages/Halls';
import Settings from './pages/Settings';
import HallRequests from './pages/HallRequests';
import UserDetails from './pages/UserDetails';

const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const RootRedirect: React.FC = () => {
  const { isAuthenticated } = useAuth();
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
};

const PublicShell: React.FC = () => {
  const location = useLocation();

  return (
    <PublicRoute>
      <AnimatePresence mode="wait" initial={false}>
        <PageTransition key={`${location.pathname}${location.search}`}>
          <Outlet />
        </PageTransition>
      </AnimatePresence>
    </PublicRoute>
  );
};

const ProtectedShell: React.FC = () => (
  <ProtectedRoute>
    <Layout />
  </ProtectedRoute>
);

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />

      <Route element={<PublicShell />}>
        <Route path="/login" element={<PortalSelection />} />
        <Route path="/login/admin" element={<Login roleTitle="Admin Login" allowedRoles={['master_admin', 'institutional_admin']} />} />
        <Route path="/login/officer" element={<Login roleTitle="Program Officer Login" allowedRoles={['program_officer']} />} />
        <Route path="/login/participant" element={<Login roleTitle="Participant Login" allowedRoles={['participant']} />} />
        <Route path="/login/medical_officer" element={<Login roleTitle="Medical Officer Login" allowedRoles={['medical_officer']} />} />
        <Route path="/register" element={<Register />} />
      </Route>

      <Route element={<ProtectedShell />}>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/trainings" element={<Trainings />} />
        <Route path="/trainings/create" element={<CreateTraining />} />
        <Route path="/trainings/:id" element={<TrainingDetails />} />
        <Route path="/trainings/:id/attendance" element={<TrainingAttendance />} />
        <Route path="/trainings/:id/edit" element={<CreateTraining />} />
        <Route path="/trainings/:id/participants" element={<TrainingParticipants />} />
        <Route path="/hall-availability" element={<HallAvailability />} />
        <Route path="/my-attendance" element={<MyAttendance />} />
        <Route path="/notifications-mobile" element={<NotificationsMobile />} />
        <Route path="/scan-qr" element={<ScanQR />} />
        <Route
          path="/nominations"
          element={
            <ProtectedRoute allowedRoles={['medical_officer']}>
              <Nominations />
            </ProtectedRoute>
          }
        />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/admin/approvals" element={<UserApprovals />} />
        <Route path="/officers" element={<Navigate to="/program-officers" replace />} />
        <Route
          path="/program-officers"
          element={
            <ProtectedRoute allowedRoles={['master_admin', 'institutional_admin', 'medical_officer']}>
              <ProgramOfficers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/medical-officers"
          element={
            <ProtectedRoute allowedRoles={['master_admin', 'institutional_admin', 'medical_officer']}>
              <MedicalOfficers />
            </ProtectedRoute>
          }
        />
        <Route path="/participants" element={<Participants />} />
        <Route path="/institutions" element={<Institutions />} />
        <Route path="/halls" element={<Halls />} />
        <Route path="/hall-requests" element={<HallRequests />} />
        <Route path="/settings" element={<Settings />} />
        <Route
          path="/personnel"
          element={
            <Navigate to="/program-officers" replace />
          }
        />
        <Route
          path="/user/:id"
          element={
            <ProtectedRoute allowedRoles={['master_admin', 'institutional_admin', 'medical_officer']}>
              <UserDetails />
            </ProtectedRoute>
          }
        />
      </Route>

      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </BrowserRouter>
    </AuthProvider>
  );
}
