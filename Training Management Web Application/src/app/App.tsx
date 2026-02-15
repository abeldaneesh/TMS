import React from 'react';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { Toaster } from './components/ui/sonner';
import Layout from './components/Layout';
import PortalSelection from './pages/PortalSelection';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Trainings from './pages/Trainings';
import TrainingDetails from './pages/TrainingDetails';
import CreateTraining from './pages/CreateTraining';
import MyAttendance from './pages/MyAttendance';

import ScanQR from './pages/ScanQR';
import Reports from './pages/Reports';
import Nominations from './pages/Nominations';
import Analytics from './pages/Analytics';
import HallAvailability from './pages/HallAvailability';
import Register from './pages/Register';
import UserApprovals from './pages/UserApprovals';
import ProgramOfficers from './pages/ProgramOfficers';
import Participants from './pages/Participants';
import Institutions from './pages/Institutions';
import Halls from './pages/Halls';
import Settings from './pages/Settings';
import HallRequests from './pages/HallRequests';
import Personnel from './pages/Personnel';

// Protected Route Component
// Protected Route Component
const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles?: string[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

// Public Route Component (redirect if authenticated)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return !isAuthenticated ? <>{children}</> : <Navigate to="/dashboard" replace />;
};

const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <PortalSelection />
          </PublicRoute>
        }
      />
      <Route
        path="/login/admin"
        element={
          <PublicRoute>
            <Login roleTitle="Admin Login" allowedRoles={['master_admin', 'institutional_admin']} />
          </PublicRoute>
        }
      />
      <Route
        path="/login/officer"
        element={
          <PublicRoute>
            <Login roleTitle="Program Officer Login" allowedRoles={['program_officer']} />
          </PublicRoute>
        }
      />
      <Route
        path="/login/participant"
        element={
          <PublicRoute>
            <Login roleTitle="Participant Login" allowedRoles={['participant']} />
          </PublicRoute>
        }
      />
      <Route
        path="/register"
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainings"
        element={
          <ProtectedRoute>
            <Layout>
              <Trainings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainings/create"
        element={
          <ProtectedRoute>
            <Layout>
              <CreateTraining />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainings/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <TrainingDetails />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/trainings/:id/edit"
        element={
          <ProtectedRoute>
            <Layout>
              <CreateTraining />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hall-availability"
        element={
          <ProtectedRoute>
            <Layout>
              <HallAvailability />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/my-attendance"

        element={
          <ProtectedRoute>
            <Layout>
              <MyAttendance />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/scan-qr"
        element={
          <ProtectedRoute>
            <Layout>
              <ScanQR />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/nominations"
        element={
          <ProtectedRoute>
            <Layout>
              <Nominations />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Layout>
              <Analytics />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/approvals"
        element={
          <ProtectedRoute>
            <Layout>
              <UserApprovals />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/officers"
        element={
          <ProtectedRoute>
            <Layout>
              <ProgramOfficers />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/participants"
        element={
          <ProtectedRoute>
            <Layout>
              <Participants />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/institutions"
        element={
          <ProtectedRoute>
            <Layout>
              <Institutions />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/halls"
        element={
          <ProtectedRoute>
            <Layout>
              <Halls />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/hall-requests"
        element={
          <ProtectedRoute>
            <Layout>
              <HallRequests />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/personnel"
        element={
          <ProtectedRoute allowedRoles={['master_admin', 'institutional_admin']}>
            <Layout>
              <Personnel />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Default Route */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
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