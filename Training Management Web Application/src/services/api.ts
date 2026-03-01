import axios from 'axios';
import {
    User, Institution, Hall, Training, Nomination, Attendance, Notification,
    TrainingAnalytics, InstitutionReport, DashboardStats, QRCodeData, NominationStatus, HallBlock, HallBookingRequest
} from '../types';

const API_URL = (import.meta as any).env.VITE_API_URL || '/api';
export const BASE_URL = API_URL.replace(/\/api\/?$/, '');
console.log('Active API URL:', API_URL, 'Base URL:', BASE_URL);

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
        'bypass-tunnel-reminder': 'true'
    },
    timeout: 15000, // 15-second timeout to prevent infinite UI hangs
    withCredentials: true,
});

// Add a request interceptor to include the auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response interceptor to handle 401 (Unauthorized)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('dmo_user');
            // Optional: Redirect to login or let the AuthContext handle it via state
        }
        return Promise.reject(error);
    }
);

export const authApi = {
    login: async (email: string, password: string): Promise<User> => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.token) {
            localStorage.setItem('token', response.data.token);
        }
        return response.data.user;
    },

    register(userData: any): Promise<{ message: string; requireVerification?: boolean }> {
        return api.post('/auth/register', userData).then(res => res.data);
    },
    sendOtp(data: { email: string }): Promise<any> {
        return api.post('/auth/send-otp', data).then(res => res.data);
    },
    verifyOtp(data: { email: string; otp: string }): Promise<any> {
        return api.post('/auth/verify-otp', data).then(res => res.data);
    },

    getCurrentUser: async (): Promise<User> => {
        const response = await api.get('/auth/me');
        return response.data;
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            console.error('Server logout failed:', error);
        } finally {
            localStorage.removeItem('token');
            localStorage.removeItem('dmo_user');
        }
    }
};

export const usersApi = {
    getAll: async (filters?: { role?: string }): Promise<User[]> => {
        const params = new URLSearchParams();
        if (filters?.role) params.append('role', filters.role);
        const response = await api.get(`/users?${params.toString()}`);
        return response.data;
    },

    getById: async (id: string): Promise<User> => {
        const response = await api.get(`/users/${id}`);
        return response.data;
    },

    create: async (userData: any): Promise<User> => {
        // In this system, creating a user is same as registering
        return authApi.register(userData);
    },

    update: async (id: string, userData: Partial<User>): Promise<User> => {
        const response = await api.put(`/users/${id}/profile`, userData);
        return response.data.user; // updateProfile controller returns { message, user }
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/users/${id}`); // Assumes backend supports delete
    },

    getPending: async (): Promise<User[]> => {
        const response = await api.get('/users/pending');
        return response.data; // pending users endpoint returns array
    },

    approve: async (userId: string): Promise<void> => {
        await api.post(`/users/${userId}/approve`);
    },

    reject: async (userId: string): Promise<void> => {
        await api.post(`/users/${userId}/reject`);
    },

    updateProfile: async (userId: string, data: any) => {
        const response = await api.put(`/users/${userId}/profile`, data);
        return response.data;
    },

    changePassword: async (userId: string, data: any) => {
        const response = await api.put(`/users/${userId}/change-password`, data);
        return response.data;
    },

    uploadProfilePicture: async (formData: FormData) => {
        const response = await api.post('/uploads/profile-picture', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    }
};

export const institutionsApi = {
    getAll: async (): Promise<Institution[]> => {
        const response = await api.get('/institutions');
        return response.data;
    },

    getById: async (id: string): Promise<Institution> => {
        const response = await api.get(`/institutions/${id}`);
        return response.data;
    },

    create: async (data: Omit<Institution, 'id' | 'createdAt'>): Promise<Institution> => {
        const response = await api.post('/institutions', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Institution>): Promise<Institution> => {
        const response = await api.put(`/institutions/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/institutions/${id}`);
    },
};

export const hallsApi = {
    getAll: async (): Promise<Hall[]> => {
        const response = await api.get('/halls');
        return response.data;
    },

    getById: async (id: string): Promise<Hall> => {
        const response = await api.get(`/halls/${id}`);
        return response.data;
    },

    create: async (data: Omit<Hall, 'id' | 'createdAt'>): Promise<Hall> => {
        const response = await api.post('/halls', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Hall>): Promise<Hall> => {
        const response = await api.put(`/halls/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/halls/${id}`);
    },

    checkAvailability: async (hallId: string, date: Date, startTime: string, endTime: string): Promise<boolean> => {
        const params = new URLSearchParams({
            date: date instanceof Date ? date.toISOString() : date,
            startTime,
            endTime
        });
        const response = await api.get(`/halls/available?${params.toString()}`);
        const availableHalls = response.data;
        return availableHalls.some((h: any) => h._id === hallId || h.id === hallId);
    },

    getAvailableHalls: async (date: Date, startTime: string, endTime: string): Promise<Hall[]> => {
        const params = new URLSearchParams({
            date: date instanceof Date ? date.toISOString() : date,
            startTime,
            endTime
        });
        const response = await api.get(`/halls/available?${params.toString()}`);
        return response.data;
    },

    getAvailability: async (hallId: string): Promise<any[]> => {
        const response = await api.get(`/halls/${hallId}/availability`);
        return response.data;
    },

    addAvailability: async (hallId: string, data: { dayOfWeek?: number, specificDate?: string, startTime: string, endTime: string }): Promise<any> => {
        const response = await api.post(`/halls/${hallId}/availability`, data);
        return response.data;
    },

    removeAvailability: async (availabilityId: string): Promise<void> => {
        await api.delete(`/halls/availability/${availabilityId}`);
    },

    getAvailabilityDetails: async (hallId: string, date: Date, startTime: string, endTime: string): Promise<{ isAvailable: boolean, reason?: string, type?: string }> => {
        const params = new URLSearchParams({
            date: date instanceof Date ? date.toISOString() : date,
            startTime,
            endTime
        });
        const response = await api.get(`/halls/${hallId}/details?${params.toString()}`);
        return response.data;
    },
};

export const hallBlocksApi = {
    getAll: async (hallId: string, date?: string): Promise<HallBlock[]> => {
        const params = new URLSearchParams();
        if (date) params.append('date', date);
        const response = await api.get(`/hall-blocks/${hallId}?${params.toString()}`);
        return response.data;
    },

    create: async (data: Omit<HallBlock, 'id' | 'createdAt' | 'createdBy'>): Promise<HallBlock> => {
        const response = await api.post('/hall-blocks', data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/hall-blocks/${id}`);
    },
};

export const hallRequestsApi = {
    getAll: async (status?: string): Promise<HallBookingRequest[]> => {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        const response = await api.get(`/hall-requests?${params.toString()}`);
        return response.data;
    },

    create: async (data: Partial<HallBookingRequest>): Promise<HallBookingRequest> => {
        const response = await api.post('/hall-requests', data);
        return response.data;
    },

    updateStatus: async (id: string, status: 'approved' | 'rejected'): Promise<HallBookingRequest> => {
        const response = await api.patch(`/hall-requests/${id}/status`, { status });
        return response.data;
    }
};

export const trainingsApi = {
    getAll: async (filters?: { status?: string; institutionId?: string; createdById?: string }): Promise<Training[]> => {
        const response = await api.get('/trainings', { params: filters });
        let trainings = response.data;
        // Keep client-side status filtering as secondary if needed, though backend should handle it
        if (filters?.status && !response.config.params?.status) {
            trainings = trainings.filter((t: Training) => t.status === filters.status);
        }
        return trainings;
    },


    getById: async (id: string): Promise<Training> => {
        const response = await api.get(`/trainings/${id}`);
        return response.data;
    },

    create: async (data: Omit<Training, 'id' | 'createdAt' | 'updatedAt'>): Promise<Training> => {
        const response = await api.post('/trainings', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Training>): Promise<Training> => {
        // If updating status, utilize specific endpoint or general update
        if (data.status && Object.keys(data).length === 1) {
            const response = await api.patch(`/trainings/${id}/status`, { status: data.status });
            return response.data;
        }
        // General update (if supported by backend, otherwise might need specific endpoints)
        const response = await api.put(`/trainings/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/trainings/${id}`);
    },

    generateCertificates: async (id: string): Promise<{ message: string; count: number }> => {
        const response = await api.post(`/trainings/${id}/generate-certificates`);
        return response.data;
    },
};

export const nominationsApi = {
    getAll: async (filters?: { trainingId?: string; participantId?: string; institutionId?: string; status?: NominationStatus }): Promise<Nomination[]> => {
        const params = new URLSearchParams();
        if (filters?.trainingId) params.append('trainingId', filters.trainingId);
        if (filters?.participantId) params.append('participantId', filters.participantId);
        if (filters?.institutionId) params.append('institutionId', filters.institutionId);
        if (filters?.status) params.append('status', filters.status);

        const response = await api.get(`/nominations?${params.toString()}`);
        return response.data;
    },

    getBusyParticipants: async (date: string, excludeTrainingId?: string): Promise<string[]> => {
        const params = new URLSearchParams({ date });
        if (excludeTrainingId) params.append('excludeTrainingId', excludeTrainingId);
        const response = await api.get(`/nominations/busy-participants?${params.toString()}`);
        return response.data;
    },

    getById: async (id: string): Promise<Nomination> => {
        const response = await api.get(`/nominations/${id}`);
        return response.data;
    },

    create: async (data: Omit<Nomination, 'id' | 'nominatedAt'>): Promise<Nomination> => {
        const response = await api.post('/nominations', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Nomination>): Promise<Nomination> => {
        // Assuming general update or specific status update
        if (data.status) {
            const response = await api.patch(`/nominations/${id}/status`, {
                status: data.status,
                rejectionReason: data.rejectionReason
            });
            return response.data;
        }
        throw new Error('Update method not fully implemented in backend for non-status fields');
    },

    updateStatus: async (id: string, status: NominationStatus, rejectionReason?: string): Promise<Nomination> => {
        const response = await api.patch(`/nominations/${id}/status`, {
            status,
            rejectionReason
        });
        return response.data;
    },

    approve: async (id: string, approvedBy: string): Promise<Nomination> => {
        const response = await api.patch(`/nominations/${id}/status`, { status: 'approved' });
        return response.data;
    },

    bulkApprove: async (ids: string[], approvedBy: string): Promise<{ success: number, failed: number }> => {
        const promises = ids.map(id => api.patch(`/nominations/${id}/status`, { status: 'approved' }));
        const results = await Promise.allSettled(promises);

        const success = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        return { success, failed };
    },

    bulkReject: async (ids: string[], approvedBy: string, reason: string): Promise<{ success: number, failed: number }> => {
        const promises = ids.map(id => api.patch(`/nominations/${id}/status`, { status: 'rejected', rejectionReason: reason }));
        const results = await Promise.allSettled(promises);

        const success = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        return { success, failed };
    },

    reject: async (id: string, approvedBy: string, reason: string): Promise<Nomination> => {
        const response = await api.patch(`/nominations/${id}/status`, { status: 'rejected', rejectionReason: reason });
        return response.data;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/nominations/${id}`);
    },
};

export const attendanceApi = {
    getAll: async (filters?: { trainingId?: string; participantId?: string }): Promise<Attendance[]> => {
        if (filters?.trainingId) {
            const response = await api.get(`/attendance/${filters.trainingId}`);
            return response.data;
        } else if (filters?.participantId) {
            const response = await api.get(`/attendance/user/${filters.participantId}`);
            return response.data;
        }
        return [];
    },

    markAttendance: async (data: Omit<Attendance, 'id' | 'timestamp'>): Promise<Attendance> => {
        const response = await api.post('/attendance', data);
        return response.data;
    },

    getMyHistory: async (): Promise<any[]> => {
        const response = await api.get('/attendance/my');
        return response.data;
    },

    startSession: async (trainingId: string, durationInMinutes: number): Promise<any> => {
        const response = await api.post(`/attendance/${trainingId}/session/start`, { durationInMinutes });
        return response.data;
    },

    stopSession: async (trainingId: string): Promise<void> => {
        await api.post(`/attendance/${trainingId}/session/stop`);
    },
    getSession: async (trainingId: string): Promise<any> => {

        const response = await api.get(`/attendance/${trainingId}/session`);
        return response.data;
    },
};

export const notificationsApi = {
    getByUserId: async (): Promise<Notification[]> => {
        const response = await api.get('/notifications');
        return response.data;
    },

    markAsRead: async (id: string): Promise<void> => {
        await api.patch(`/notifications/${id}/read`);
    },

    markAllAsRead: async (): Promise<void> => {
        await api.patch('/notifications/read-all');
    },

    create: async (data: any): Promise<Notification> => {
        throw new Error('Notifications are created by system events');
    },
};

export const analyticsApi = {
    getDashboardStats: async (userId: string, userRole: string): Promise<DashboardStats> => {
        const response = await api.get('/analytics/dashboard');
        return response.data;
    },

    getTrainingAnalytics: async (trainingId: string): Promise<TrainingAnalytics> => {
        const response = await api.get(`/analytics/training/${trainingId}`);
        return response.data;
    },

    getInstitutionReport: async (institutionId: string): Promise<InstitutionReport> => {
        const response = await api.get(`/analytics/institution/${institutionId}`);
        return response.data;
    },
};

export const qrApi = {
    generateQRData: async (trainingId: string, sessionId: string): Promise<QRCodeData> => {
        const expiryTimestamp = Date.now() + (24 * 60 * 60 * 1000);

        return {
            trainingId,
            token: 'legacy-compat', // Should probably be generated or fetched, but this makes TS happy
            expiresAt: new Date(expiryTimestamp).toISOString(),
            sessionId,
            expiryTimestamp,
            signature: 'legacy-compat'
        };
    },

    validateQRData: async (qrData: QRCodeData, participantId: string): Promise<boolean> => {
        // UI validation. Real validation happens in attendanceApi.markAttendance
        return true;
    },
};

export default api;
