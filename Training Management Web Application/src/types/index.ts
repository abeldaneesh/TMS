// Type definitions for the Training Management System

export type UserRole = 'master_admin' | 'program_officer' | 'institutional_admin' | 'participant';

export interface User {
  id: string;
  name: string;
  email: string;
  password: string; // hashed in real implementation
  role: UserRole;
  institutionId?: string;
  phone?: string;
  designation?: string;
  department?: string;
  profilePicture?: string;
  createdAt: Date;
  isApproved?: boolean;
}

export interface Institution {
  id: string;
  name: string;
  type: string;
  location: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
}

export interface Hall {
  id: string;
  name: string;
  location: string;
  capacity: number;
  facilities?: string[];
  createdAt: Date;
}

export interface HallBlock {
  id: string;
  hallId: string;
  date: Date;
  startTime: string;
  endTime: string;
  reason: string;
  createdBy: string;
  createdAt: Date;
}

export interface HallBookingRequest {
  id: string;
  trainingId: string | Training;
  hallId: string | Hall;
  requestedBy: string | User;
  status: 'pending' | 'approved' | 'rejected';
  priority: 'normal' | 'urgent';
  remarks?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type TrainingStatus = 'draft' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled';

export interface Training {
  id: string;
  title: string;
  description: string;
  program: string;
  targetAudience: string;
  date: Date;
  startTime: string;
  endTime: string;
  hallId: string;
  capacity: number;
  trainerId: string;
  createdById: string;
  requiredInstitutions: string[];
  status: TrainingStatus;
  attendanceSession?: {
    isActive: boolean;
    startTime?: Date | string;
    endTime?: Date | string;
    startedBy?: string;
    qrCodeToken?: string;
  };
  userStatus?: string | null;
  certificatesGenerated?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type NominationStatus = 'nominated' | 'approved' | 'rejected' | 'attended';

export interface Nomination {
  id: string;
  trainingId: string;
  participantId: string;
  institutionId: string;
  status: NominationStatus;
  nominatedBy: string;
  nominatedAt: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  participant?: User;
  training?: Training;
  institution?: Institution;
}


export interface Attendance {
  id: string;
  trainingId: string;
  participantId: string;
  timestamp: Date;
  method: 'qr' | 'manual' | 'digital';
  verifiedBy?: string;
  qrData?: string;
  participant?: User;
}

export type NotificationType = 'info' | 'success' | 'warning' | 'error';

export interface Notification {
  id: string;
  toUserId: string;
  message: string;
  type: NotificationType;
  read: boolean;
  createdAt: Date;
  actionUrl?: string;
}

export interface QRCodeData {
  trainingId: string;
  token: string;
  expiresAt?: Date | string;
  // Legacy fields for compatibility if needed
  sessionId?: string;
  expiryTimestamp?: number;
  signature?: string;
}

export interface DashboardStats {
  totalTrainings: number;
  upcomingTrainings: number;
  completedTrainings: number;
  totalParticipants: number;
  attendanceRate: number;
  trainedStaff: number;
  untrainedStaff: number;
}

export interface TrainingAnalytics {
  trainingId: string;
  trainingTitle: string;
  totalNominated: number;
  totalApproved: number;
  totalAttended: number;
  attendanceRate: number;
  byInstitution: {
    institutionId: string;
    institutionName: string;
    nominated: number;
    approved: number;
    attended: number;
  }[];
}

export interface InstitutionReport {
  institutionId: string;
  institutionName: string;
  totalStaff: number;
  trainedStaff: number;
  untrainedStaff: number;
  trainingsByProgram: {
    program: string;
    trainings: number;
    participants: number;
  }[];
}

export interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  isAuthenticated: boolean;
  updateUser: (userData: User) => void;
}
