# API Documentation - Training Management System

This document describes the API structure implemented in the mock backend. These patterns should be followed when implementing a real backend.

## Base URL
```
Mock: In-memory (no actual HTTP calls)
Real: http://localhost:5000/api
```

## Authentication

### Login
```typescript
POST /auth/login
Body: {
  email: string,
  password: string
}
Response: {
  user: User,
  token: string
}
```

**Example:**
```json
// Request
{
  "email": "admin@dmo.gov",
  "password": "admin123"
}

// Response
{
  "user": {
    "id": "user-1",
    "name": "Dr. Admin Kumar",
    "email": "admin@dmo.gov",
    "role": "master_admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

## Trainings API

### Get All Trainings
```typescript
GET /trainings?status=scheduled&institutionId=inst-1&createdById=user-2
Response: Training[]
```

**Query Parameters:**
- `status`: Filter by status (draft, scheduled, ongoing, completed, cancelled)
- `institutionId`: Filter by institution
- `createdById`: Filter by creator

### Get Training by ID
```typescript
GET /trainings/:id
Response: Training
```

### Create Training
```typescript
POST /trainings
Headers: {
  Authorization: Bearer <token>
}
Body: {
  title: string,
  description: string,
  program: string,
  targetAudience: string,
  date: Date,
  startTime: string,
  endTime: string,
  hallId: string,
  capacity: number,
  trainerId: string,
  requiredInstitutions: string[],
  status: TrainingStatus
}
Response: Training
```

**Example:**
```json
{
  "title": "Emergency Response & First Aid",
  "description": "Comprehensive training on emergency medical response",
  "program": "Emergency Medicine",
  "targetAudience": "Nurses, Paramedics, Medical Officers",
  "date": "2026-02-15T00:00:00.000Z",
  "startTime": "09:00",
  "endTime": "17:00",
  "hallId": "hall-1",
  "capacity": 80,
  "trainerId": "user-2",
  "requiredInstitutions": ["inst-1", "inst-2", "inst-3"],
  "status": "scheduled"
}
```

### Update Training
```typescript
PUT /trainings/:id
Headers: {
  Authorization: Bearer <token>
}
Body: Partial<Training>
Response: Training
```

### Delete Training
```typescript
DELETE /trainings/:id
Headers: {
  Authorization: Bearer <token>
}
Response: { message: "Training deleted successfully" }
```

## Halls API

### Get All Halls
```typescript
GET /halls
Response: Hall[]
```

### Check Hall Availability
```typescript
GET /halls/:id/availability?date=2026-02-15&startTime=09:00&endTime=17:00
Response: {
  available: boolean,
  conflicts: Training[]
}
```

### Get Available Halls
```typescript
GET /halls/available?date=2026-02-15&startTime=09:00&endTime=17:00
Response: Hall[]
```

### Create Hall
```typescript
POST /halls
Headers: {
  Authorization: Bearer <token>
}
Body: {
  name: string,
  location: string,
  capacity: number,
  facilities?: string[]
}
Response: Hall
```

## Nominations API

### Get All Nominations
```typescript
GET /nominations?trainingId=train-1&participantId=user-6&status=nominated
Response: Nomination[]
```

**Query Parameters:**
- `trainingId`: Filter by training
- `participantId`: Filter by participant
- `institutionId`: Filter by institution
- `status`: Filter by status

### Create Nomination
```typescript
POST /nominations
Headers: {
  Authorization: Bearer <token>
}
Body: {
  trainingId: string,
  participantId: string,
  institutionId: string,
  status: "nominated",
  nominatedBy: string
}
Response: Nomination
```

**Example:**
```json
{
  "trainingId": "train-1",
  "participantId": "user-6",
  "institutionId": "inst-1",
  "status": "nominated",
  "nominatedBy": "user-4"
}
```

### Approve Nomination
```typescript
PUT /nominations/:id/approve
Headers: {
  Authorization: Bearer <token>
}
Body: {
  approvedBy: string
}
Response: Nomination
```

### Reject Nomination
```typescript
PUT /nominations/:id/reject
Headers: {
  Authorization: Bearer <token>
}
Body: {
  approvedBy: string,
  rejectionReason: string
}
Response: Nomination
```

## Attendance API

### Get Attendance Records
```typescript
GET /attendance?trainingId=train-1&participantId=user-6
Response: Attendance[]
```

### Mark Attendance
```typescript
POST /attendance
Headers: {
  Authorization: Bearer <token>
}
Body: {
  trainingId: string,
  participantId: string,
  method: "qr" | "manual",
  qrData?: string,
  verifiedBy?: string
}
Response: Attendance
```

**Example:**
```json
{
  "trainingId": "train-1",
  "participantId": "user-6",
  "method": "qr",
  "qrData": "{\"trainingId\":\"train-1\",\"sessionId\":\"session-1\",...}"
}
```

## QR Code API

### Generate QR Code Data
```typescript
POST /qr/generate
Headers: {
  Authorization: Bearer <token>
}
Body: {
  trainingId: string,
  sessionId: string
}
Response: {
  trainingId: string,
  sessionId: string,
  expiryTimestamp: number,
  signature: string
}
```

### Validate QR Code
```typescript
POST /qr/validate
Headers: {
  Authorization: Bearer <token>
}
Body: {
  qrData: QRCodeData,
  participantId: string
}
Response: {
  valid: boolean,
  message: string
}
```

## Analytics API

### Get Dashboard Stats
```typescript
GET /analytics/dashboard/:userId
Headers: {
  Authorization: Bearer <token>
}
Response: {
  totalTrainings: number,
  upcomingTrainings: number,
  completedTrainings: number,
  totalParticipants: number,
  attendanceRate: number,
  trainedStaff: number,
  untrainedStaff: number
}
```

### Get Training Analytics
```typescript
GET /analytics/training/:trainingId
Headers: {
  Authorization: Bearer <token>
}
Response: {
  trainingId: string,
  trainingTitle: string,
  totalNominated: number,
  totalApproved: number,
  totalAttended: number,
  attendanceRate: number,
  byInstitution: Array<{
    institutionId: string,
    institutionName: string,
    nominated: number,
    approved: number,
    attended: number
  }>
}
```

### Get Institution Report
```typescript
GET /analytics/institution/:institutionId
Headers: {
  Authorization: Bearer <token>
}
Response: {
  institutionId: string,
  institutionName: string,
  totalStaff: number,
  trainedStaff: number,
  untrainedStaff: number,
  trainingsByProgram: Array<{
    program: string,
    trainings: number,
    participants: number
  }>
}
```

## Users API

### Get All Users
```typescript
GET /users
Headers: {
  Authorization: Bearer <token>
}
Response: User[]
```

### Get User by ID
```typescript
GET /users/:id
Headers: {
  Authorization: Bearer <token>
}
Response: User
```

### Get Users by Institution
```typescript
GET /users?institutionId=inst-1
Headers: {
  Authorization: Bearer <token>
}
Response: User[]
```

### Create User
```typescript
POST /users
Headers: {
  Authorization: Bearer <token>
}
Body: {
  name: string,
  email: string,
  password: string,
  role: UserRole,
  institutionId?: string,
  phone?: string,
  designation?: string,
  department?: string
}
Response: User
```

### Update User
```typescript
PUT /users/:id
Headers: {
  Authorization: Bearer <token>
}
Body: Partial<User>
Response: User
```

## Institutions API

### Get All Institutions
```typescript
GET /institutions
Response: Institution[]
```

### Create Institution
```typescript
POST /institutions
Headers: {
  Authorization: Bearer <token>
}
Body: {
  name: string,
  type: string,
  location: string,
  contactPerson?: string,
  contactEmail?: string,
  contactPhone?: string
}
Response: Institution
```

## Notifications API

### Get User Notifications
```typescript
GET /notifications?userId=user-1
Headers: {
  Authorization: Bearer <token>
}
Response: Notification[]
```

### Mark as Read
```typescript
PUT /notifications/:id/read
Headers: {
  Authorization: Bearer <token>
}
Response: Notification
```

### Create Notification
```typescript
POST /notifications
Headers: {
  Authorization: Bearer <token>
}
Body: {
  toUserId: string,
  message: string,
  type: NotificationType,
  actionUrl?: string
}
Response: Notification
```

## Error Responses

All API errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {}
  }
}
```

### Common Error Codes

- `UNAUTHORIZED` (401): Invalid or missing token
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `VALIDATION_ERROR` (400): Invalid input data
- `CONFLICT` (409): Resource conflict (e.g., hall booking overlap)
- `INTERNAL_ERROR` (500): Server error

**Example:**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Hall is not available for the selected time slot",
    "details": {
      "hallId": "hall-1",
      "conflicts": [
        {
          "trainingId": "train-2",
          "title": "Existing Training",
          "time": "09:00 - 12:00"
        }
      ]
    }
  }
}
```

## Rate Limiting

For production implementation:
- Rate limit: 100 requests per minute per IP
- Burst: 20 requests per second
- Headers included in response:
  - `X-RateLimit-Limit`: Maximum requests
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## Sample cURL Commands

### Login
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@dmo.gov",
    "password": "admin123"
  }'
```

### Get Trainings
```bash
curl -X GET http://localhost:5000/api/trainings \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Create Training
```bash
curl -X POST http://localhost:5000/api/trainings \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "New Training",
    "description": "Training description",
    "program": "Emergency Medicine",
    "targetAudience": "All Staff",
    "date": "2026-03-01",
    "startTime": "09:00",
    "endTime": "17:00",
    "hallId": "hall-1",
    "capacity": 50,
    "trainerId": "user-2",
    "requiredInstitutions": ["inst-1"],
    "status": "scheduled"
  }'
```

### Mark Attendance
```bash
curl -X POST http://localhost:5000/api/attendance \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "trainingId": "train-1",
    "participantId": "user-6",
    "method": "qr",
    "qrData": "QR_CODE_STRING"
  }'
```

## Implementation Notes

### JWT Token Structure
```json
{
  "userId": "user-1",
  "email": "admin@dmo.gov",
  "role": "master_admin",
  "iat": 1234567890,
  "exp": 1234654290
}
```

### Password Hashing
Use bcrypt with salt rounds = 10

### Input Validation
Use Joi or Zod for schema validation

### Database Models (Mongoose Example)

```javascript
// Training Schema
const TrainingSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  program: { type: String, required: true },
  targetAudience: { type: String, required: true },
  date: { type: Date, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  hallId: { type: mongoose.Schema.Types.ObjectId, ref: 'Hall', required: true },
  capacity: { type: Number, required: true },
  trainerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdById: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  requiredInstitutions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Institution' }],
  status: { 
    type: String, 
    enum: ['draft', 'scheduled', 'ongoing', 'completed', 'cancelled'],
    default: 'draft'
  }
}, { timestamps: true });
```

---

**Note:** This API documentation describes the mock implementation. For production, implement proper error handling, validation, authentication, and authorization middleware.
