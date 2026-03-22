# Training Management Web Application (DMO)

A comprehensive web application for streamlining planning, coordination, and monitoring of training programs under a District Medical Office.

## Features

### 🎯 Core Modules

- **Training Scheduling** - Conflict-free scheduling with real-time hall availability
- **Participant Nomination** - Institution-based nomination and approval workflow
- **QR-Based Attendance** - Automated attendance tracking with QR code scanning
- **Analytics & Dashboards** - Comprehensive metrics and visualizations
- **Automated Reporting** - PDF and CSV export capabilities

### 👥 User Roles

1. **Master Admin** - Full system access, district-level oversight
2. **Program Officer** - Create/manage trainings, approve nominations
3. **Institutional Admin** - Nominate participants, view institution reports
4. **Training Participant** - View trainings, scan QR for attendance

## Tech Stack

### Frontend
- React 18.3.1 with TypeScript
- Vite 6.3.5 (Build tool)
- React Router DOM 7.13.0 (Routing)
- TailwindCSS 4.1.12 (Styling)
- Recharts 2.15.2 (Charts & Analytics)
- Shadcn UI Components

### QR Code & Reports
- qrcode 1.5.4 (QR generation)
- html5-qrcode 2.3.8 (QR scanning)
- jsPDF 4.1.0 (PDF generation)
- jspdf-autotable 5.0.7 (PDF tables)
- PapaParse 5.5.3 (CSV export)

### Backend (Mock Implementation)
This is a **frontend-only demo** with mock API services that simulate:
- Authentication (JWT-style)
- Database operations (in-memory)
- Role-based access control
- Business logic validation

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or pnpm

### Installation & Running Locally (Windows)

1. **Clone or extract the project**
   ```bash
   cd training-management-dmo
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Create environment file** (optional)
   ```bash
   copy .env.example .env
   ```

4. **Start development server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

5. **Open your browser**
   ```
   http://localhost:5173
   ```

### Demo User Accounts

Login with these credentials to test different roles:

| Role | Email | Password |
|------|-------|----------|
| **Master Admin** | admin@dmo.gov | admin123 |
| **Program Officer** | priya@dmo.gov | officer123 |
| **Institutional Admin** | anjali@hospital1.gov | inst123 |
| **Participant** | kavita@hospital1.gov | part123 |

## Project Structure

```
training-management-dmo/
├── src/
│   ├── app/
│   │   ├── components/
│   │   │   ├── ui/           # Reusable UI components
│   │   │   └── Layout.tsx    # Main layout with navigation
│   │   ├── pages/
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Trainings.tsx
│   │   │   ├── CreateTraining.tsx
│   │   │   ├── QRAttendance.tsx
│   │   │   ├── ScanQR.tsx
│   │   │   ├── Nominations.tsx
│   │   │   └── Reports.tsx
│   │   └── App.tsx           # Main app with routing
│   ├── contexts/
│   │   └── AuthContext.tsx   # Authentication context
│   ├── services/
│   │   └── mockApi.ts        # Mock API services
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── utils/
│   │   └── mockData.ts       # Mock database data
│   └── styles/               # Global styles
├── .env.example              # Environment variables template
├── package.json
└── README.md
```

## Key Functionalities

### 1. Training Scheduling
- Create trainings with date, time, venue, capacity
- Real-time hall availability checking
- Conflict detection for hall bookings
- Multi-institution assignment

### 2. Nomination Management
- Institution admins nominate staff
- Program officers approve/reject nominations
- Capacity enforcement
- Status tracking (nominated → approved → attended)

### 3. QR-Based Attendance
- Officers generate unique QR codes per training
- Participants scan QR to mark attendance
- Time-window validation
- Duplicate prevention
- Signature verification

### 4. Analytics & Reports

**Dashboards:**
- Training statistics (total, upcoming, completed)
- Attendance rates
- Staff training coverage
- Monthly trends

**Reports (PDF/CSV):**
- Training Report: Participants, attendance, outcomes
- Institution Report: Staff training status by program
- District Summary: Complete district overview

### 5. Role-Based Access Control

Each role has specific permissions:
- **Master Admin**: Full access to all modules
- **Program Officer**: Training CRUD, nominations, QR generation
- **Institutional Admin**: View trainings, nominate staff, institution reports
- **Participant**: View assigned trainings, scan QR, attendance history

## Mock Data

The application includes comprehensive mock data:
- 10 users across all roles
- 5 institutions (hospitals, PHCs, CHCs)
- 5 halls with varying capacities
- 6 sample trainings
- Multiple nominations and attendance records
- Notifications

## API Structure

All mock APIs follow RESTful patterns:

```typescript
// Authentication
authApi.login(email, password)

// Trainings
trainingsApi.getAll(filters?)
trainingsApi.create(data)
trainingsApi.update(id, data)

// Nominations
nominationsApi.getAll(filters?)
nominationsApi.approve(id, approvedBy)
nominationsApi.reject(id, approvedBy, reason)

// Attendance
attendanceApi.markAttendance(data)

// Analytics
analyticsApi.getDashboardStats(userId, role)
analyticsApi.getTrainingAnalytics(trainingId)
analyticsApi.getInstitutionReport(institutionId)

// QR Code
qrApi.generateQRData(trainingId, sessionId)
qrApi.validateQRData(qrData, participantId)
```

## Building for Production

```bash
npm run build
# or
pnpm build
```

The built files will be in the `dist/` directory.

## Future Enhancements (Backend Integration)

To convert this to a full-stack application:

1. **Backend Setup**
   - Set up Node.js + Express server
   - Configure MongoDB with Mongoose
   - Implement JWT authentication
   - Add input validation (Joi/Zod)

2. **API Migration**
   - Replace mock APIs with real HTTP requests
   - Use axios or fetch
   - Add error handling and retry logic

3. **Additional Features**
   - Email notifications (Nodemailer)
   - SMS notifications (Twilio)
   - File uploads (Multer)
   - Real-time updates (Socket.io)
   - Certificate generation
   - Advanced analytics

4. **Security**
   - HTTPS enforcement
   - Rate limiting
   - CORS configuration
   - Data encryption
   - Input sanitization

## Browser Compatibility

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Camera Requirements for QR Scanning

- HTTPS connection (or localhost)
- Camera permissions granted
- Modern browser with MediaDevices API support

## License

This is a demonstration project for educational purposes.

## Support

For issues or questions:
- Review the mock data in `/src/utils/mockData.ts`
- Check the API implementation in `/src/services/mockApi.ts`
- Verify role-based routing in `/src/app/App.tsx`

## Screenshots

### Login Page
- Quick demo account buttons for easy testing
- Role-based authentication

### Dashboard
- Stats cards with key metrics
- Training status visualization
- Upcoming trainings list
- Monthly trends charts

### Training Management
- Create/edit trainings with hall availability
- Conflict-free scheduling
- Multi-institution assignment
- Status management

### QR Attendance
- Generate unique QR codes
- Download QR images
- Real-time scanning
- Attendance validation

### Reports
- PDF/CSV export options
- Training reports
- Institution reports
- District summaries

---

**Note**: This is a frontend demonstration with mock backend. For production use, integrate with a real backend API following the patterns established in the mock services.
