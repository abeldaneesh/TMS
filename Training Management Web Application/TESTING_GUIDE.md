# Testing Guide - Training Management System

This guide covers testing strategies and sample test cases for the Training Management System.

## Testing Framework (For Production)

### Recommended Stack
- **Frontend:** Jest + React Testing Library
- **Backend:** Jest + Supertest
- **E2E:** Cypress or Playwright
- **Coverage:** Istanbul/NYC

## Unit Test Examples

### 1. Authentication API Tests

```typescript
// tests/services/authApi.test.ts
import { authApi } from '../../src/services/mockApi';

describe('Authentication API', () => {
  describe('login', () => {
    test('should login with valid credentials', async () => {
      const result = await authApi.login('admin@dmo.gov', 'admin123');
      
      expect(result).toBeDefined();
      expect(result.email).toBe('admin@dmo.gov');
      expect(result.role).toBe('master_admin');
    });

    test('should throw error with invalid credentials', async () => {
      await expect(
        authApi.login('admin@dmo.gov', 'wrongpassword')
      ).rejects.toThrow('Invalid credentials');
    });

    test('should throw error with non-existent user', async () => {
      await expect(
        authApi.login('nonexistent@email.com', 'password')
      ).rejects.toThrow('Invalid credentials');
    });
  });
});
```

### 2. Training API Tests

```typescript
// tests/services/trainingsApi.test.ts
import { trainingsApi, hallsApi } from '../../src/services/mockApi';

describe('Trainings API', () => {
  describe('create', () => {
    test('should create training with available hall', async () => {
      const trainingData = {
        title: 'Test Training',
        description: 'Test Description',
        program: 'Test Program',
        targetAudience: 'All Staff',
        date: new Date('2026-12-01'),
        startTime: '09:00',
        endTime: '12:00',
        hallId: 'hall-1',
        capacity: 50,
        trainerId: 'user-2',
        createdById: 'user-2',
        requiredInstitutions: ['inst-1'],
        status: 'scheduled' as const,
      };

      const result = await trainingsApi.create(trainingData);
      
      expect(result).toBeDefined();
      expect(result.title).toBe(trainingData.title);
      expect(result.id).toBeDefined();
    });

    test('should throw error when hall is not available', async () => {
      // First, create a training
      await trainingsApi.create({
        title: 'Training 1',
        description: 'Test',
        program: 'Test',
        targetAudience: 'All',
        date: new Date('2026-12-15'),
        startTime: '09:00',
        endTime: '12:00',
        hallId: 'hall-1',
        capacity: 50,
        trainerId: 'user-2',
        createdById: 'user-2',
        requiredInstitutions: ['inst-1'],
        status: 'scheduled' as const,
      });

      // Try to create overlapping training
      await expect(
        trainingsApi.create({
          title: 'Training 2',
          description: 'Test',
          program: 'Test',
          targetAudience: 'All',
          date: new Date('2026-12-15'),
          startTime: '10:00',
          endTime: '13:00',
          hallId: 'hall-1',
          capacity: 50,
          trainerId: 'user-2',
          createdById: 'user-2',
          requiredInstitutions: ['inst-1'],
          status: 'scheduled' as const,
        })
      ).rejects.toThrow('Hall is not available');
    });
  });

  describe('getAll', () => {
    test('should return all trainings', async () => {
      const trainings = await trainingsApi.getAll();
      expect(Array.isArray(trainings)).toBe(true);
      expect(trainings.length).toBeGreaterThan(0);
    });

    test('should filter by status', async () => {
      const scheduledTrainings = await trainingsApi.getAll({ status: 'scheduled' });
      
      expect(scheduledTrainings.every(t => t.status === 'scheduled')).toBe(true);
    });

    test('should filter by institution', async () => {
      const instTrainings = await trainingsApi.getAll({ institutionId: 'inst-1' });
      
      expect(
        instTrainings.every(t => t.requiredInstitutions.includes('inst-1'))
      ).toBe(true);
    });
  });
});
```

### 3. Nominations API Tests

```typescript
// tests/services/nominationsApi.test.ts
import { nominationsApi } from '../../src/services/mockApi';

describe('Nominations API', () => {
  describe('create', () => {
    test('should create nomination successfully', async () => {
      const nominationData = {
        trainingId: 'train-1',
        participantId: 'user-11',
        institutionId: 'inst-1',
        status: 'nominated' as const,
        nominatedBy: 'user-4',
      };

      const result = await nominationsApi.create(nominationData);
      
      expect(result).toBeDefined();
      expect(result.trainingId).toBe(nominationData.trainingId);
      expect(result.status).toBe('nominated');
    });

    test('should throw error for duplicate nomination', async () => {
      const nominationData = {
        trainingId: 'train-1',
        participantId: 'user-6',
        institutionId: 'inst-1',
        status: 'nominated' as const,
        nominatedBy: 'user-4',
      };

      await expect(
        nominationsApi.create(nominationData)
      ).rejects.toThrow('already nominated');
    });

    test('should throw error when capacity is full', async () => {
      // This would need setup to fill capacity first
      // Implementation depends on training capacity logic
    });
  });

  describe('approve', () => {
    test('should approve nomination', async () => {
      // First create a nomination
      const nomination = await nominationsApi.create({
        trainingId: 'train-5',
        participantId: 'user-11',
        institutionId: 'inst-1',
        status: 'nominated' as const,
        nominatedBy: 'user-4',
      });

      const approved = await nominationsApi.approve(nomination.id, 'user-2');
      
      expect(approved.status).toBe('approved');
      expect(approved.approvedBy).toBe('user-2');
      expect(approved.approvedAt).toBeDefined();
    });
  });

  describe('reject', () => {
    test('should reject nomination with reason', async () => {
      const nomination = await nominationsApi.create({
        trainingId: 'train-5',
        participantId: 'user-12',
        institutionId: 'inst-1',
        status: 'nominated' as const,
        nominatedBy: 'user-4',
      });

      const rejected = await nominationsApi.reject(
        nomination.id,
        'user-2',
        'Capacity full'
      );
      
      expect(rejected.status).toBe('rejected');
      expect(rejected.rejectionReason).toBe('Capacity full');
    });
  });
});
```

### 4. Hall Availability Tests

```typescript
// tests/services/hallsApi.test.ts
import { hallsApi, trainingsApi } from '../../src/services/mockApi';

describe('Halls API', () => {
  describe('checkAvailability', () => {
    test('should return true for available hall', async () => {
      const isAvailable = await hallsApi.checkAvailability(
        'hall-1',
        new Date('2026-12-25'),
        '09:00',
        '12:00'
      );
      
      expect(isAvailable).toBe(true);
    });

    test('should return false for booked hall', async () => {
      // Create a training first
      await trainingsApi.create({
        title: 'Booked Training',
        description: 'Test',
        program: 'Test',
        targetAudience: 'All',
        date: new Date('2026-12-30'),
        startTime: '09:00',
        endTime: '12:00',
        hallId: 'hall-2',
        capacity: 50,
        trainerId: 'user-2',
        createdById: 'user-2',
        requiredInstitutions: ['inst-1'],
        status: 'scheduled' as const,
      });

      const isAvailable = await hallsApi.checkAvailability(
        'hall-2',
        new Date('2026-12-30'),
        '10:00',
        '13:00'
      );
      
      expect(isAvailable).toBe(false);
    });
  });

  describe('getAvailableHalls', () => {
    test('should return list of available halls', async () => {
      const available = await hallsApi.getAvailableHalls(
        new Date('2026-12-28'),
        '14:00',
        '16:00'
      );
      
      expect(Array.isArray(available)).toBe(true);
      expect(available.length).toBeGreaterThan(0);
    });
  });
});
```

## Component Tests (React Testing Library)

### 1. Login Component Test

```typescript
// tests/components/Login.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../src/app/pages/Login';
import { AuthProvider } from '../../src/contexts/AuthContext';

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        <Login />
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Login Component', () => {
  test('renders login form', () => {
    renderLogin();
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('shows demo account buttons', () => {
    renderLogin();
    
    expect(screen.getByText(/Master Admin/i)).toBeInTheDocument();
    expect(screen.getByText(/Program Officer/i)).toBeInTheDocument();
  });

  test('fills form when demo button clicked', () => {
    renderLogin();
    
    const adminButton = screen.getByText(/Master Admin/i);
    fireEvent.click(adminButton);
    
    const emailInput = screen.getByLabelText(/email/i) as HTMLInputElement;
    expect(emailInput.value).toBe('admin@dmo.gov');
  });

  test('shows error for invalid credentials', async () => {
    renderLogin();
    
    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'wrong@email.com' } });
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/invalid/i)).toBeInTheDocument();
    });
  });
});
```

### 2. Dashboard Component Test

```typescript
// tests/components/Dashboard.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../src/app/pages/Dashboard';
import { AuthProvider } from '../../src/contexts/AuthContext';

describe('Dashboard Component', () => {
  test('renders dashboard stats', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Total Trainings/i)).toBeInTheDocument();
      expect(screen.getByText(/Upcoming Trainings/i)).toBeInTheDocument();
      expect(screen.getByText(/Attendance Rate/i)).toBeInTheDocument();
    });
  });

  test('displays upcoming trainings list', async () => {
    render(
      <BrowserRouter>
        <AuthProvider>
          <Dashboard />
        </AuthProvider>
      </BrowserRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Upcoming Trainings/i)).toBeInTheDocument();
    });
  });
});
```

## Integration Tests

### 1. Complete Training Flow

```typescript
// tests/integration/trainingFlow.test.ts
describe('Complete Training Flow', () => {
  test('create training -> nominate -> approve -> attend', async () => {
    // 1. Login as Program Officer
    const officer = await authApi.login('priya@dmo.gov', 'officer123');
    expect(officer.role).toBe('program_officer');

    // 2. Create Training
    const training = await trainingsApi.create({
      title: 'Integration Test Training',
      description: 'Test',
      program: 'Test Program',
      targetAudience: 'All',
      date: new Date('2026-12-20'),
      startTime: '09:00',
      endTime: '12:00',
      hallId: 'hall-3',
      capacity: 30,
      trainerId: officer.id,
      createdById: officer.id,
      requiredInstitutions: ['inst-1'],
      status: 'scheduled',
    });
    expect(training.id).toBeDefined();

    // 3. Nominate Participant
    const nomination = await nominationsApi.create({
      trainingId: training.id,
      participantId: 'user-6',
      institutionId: 'inst-1',
      status: 'nominated',
      nominatedBy: 'user-4',
    });
    expect(nomination.status).toBe('nominated');

    // 4. Approve Nomination
    const approved = await nominationsApi.approve(nomination.id, officer.id);
    expect(approved.status).toBe('approved');

    // 5. Mark Attendance
    const attendance = await attendanceApi.markAttendance({
      trainingId: training.id,
      participantId: 'user-6',
      method: 'qr',
      qrData: 'test-qr-data',
    });
    expect(attendance.id).toBeDefined();

    // 6. Verify Updated Nomination
    const updatedNom = await nominationsApi.getById(nomination.id);
    expect(updatedNom?.status).toBe('attended');
  });
});
```

## E2E Test Examples (Cypress)

```typescript
// cypress/e2e/login.cy.ts
describe('Login Flow', () => {
  it('should login successfully', () => {
    cy.visit('/login');
    
    cy.get('input[type="email"]').type('admin@dmo.gov');
    cy.get('input[type="password"]').type('admin123');
    cy.get('button[type="submit"]').click();
    
    cy.url().should('include', '/dashboard');
    cy.contains('Welcome back');
  });

  it('should use demo account button', () => {
    cy.visit('/login');
    
    cy.contains('Master Admin').click();
    cy.get('input[type="email"]').should('have.value', 'admin@dmo.gov');
    cy.get('button[type="submit"]').click();
    
    cy.url().should('include', '/dashboard');
  });
});

// cypress/e2e/createTraining.cy.ts
describe('Create Training', () => {
  beforeEach(() => {
    // Login as Program Officer
    cy.visit('/login');
    cy.get('input[type="email"]').type('priya@dmo.gov');
    cy.get('input[type="password"]').type('officer123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should create new training', () => {
    cy.visit('/trainings/create');
    
    cy.get('input[name="title"]').type('E2E Test Training');
    cy.get('textarea[name="description"]').type('Test Description');
    cy.get('select[name="program"]').select('Emergency Medicine');
    cy.get('input[name="targetAudience"]').type('All Staff');
    cy.get('input[type="date"]').type('2026-12-31');
    cy.get('input[name="startTime"]').type('09:00');
    cy.get('input[name="endTime"]').type('12:00');
    cy.get('input[name="capacity"]').type('50');
    
    cy.get('button[type="submit"]').click();
    
    cy.contains('Training created successfully');
    cy.url().should('include', '/trainings');
  });
});
```

## Manual Testing Checklist

### Authentication
- [ ] Login with valid credentials (all roles)
- [ ] Login with invalid credentials (error shown)
- [ ] Logout functionality
- [ ] Session persistence (refresh page)
- [ ] Demo account buttons

### Dashboard
- [ ] Stats cards display correctly
- [ ] Charts render properly
- [ ] Upcoming trainings listed
- [ ] Role-based content displayed

### Training Management
- [ ] Create training form validation
- [ ] Hall availability check
- [ ] Cannot book overlapping trainings
- [ ] Edit existing training
- [ ] Delete training (with confirmation)
- [ ] Filter trainings by status
- [ ] Search trainings

### Nominations
- [ ] Nominate participant
- [ ] Approve nomination
- [ ] Reject nomination (with reason)
- [ ] Cannot nominate same participant twice
- [ ] Capacity enforcement
- [ ] Filter nominations

### QR Attendance
- [ ] Generate QR code
- [ ] Download QR code image
- [ ] QR code contains correct data
- [ ] Scan QR code (camera access)
- [ ] Cannot mark duplicate attendance
- [ ] Time window validation
- [ ] Participant eligibility check

### Reports
- [ ] Generate training report (PDF)
- [ ] Generate training report (CSV)
- [ ] Generate institution report (PDF)
- [ ] Generate district summary (PDF)
- [ ] Reports contain accurate data
- [ ] Download functionality works

### Hall Availability
- [ ] View all halls
- [ ] Check availability for date/time
- [ ] See existing bookings
- [ ] Hall facilities displayed

### Analytics
- [ ] Dashboard statistics accurate
- [ ] Charts render correctly
- [ ] Training-specific analytics
- [ ] Institution-wise breakdown
- [ ] Program distribution

## Performance Testing

### Load Testing Scenarios
1. 100 concurrent users accessing dashboard
2. 50 users generating reports simultaneously
3. 200 QR scans within 1 minute
4. 1000 trainings in database

### Expected Performance
- Page load: < 2 seconds
- API response: < 500ms
- Report generation: < 5 seconds
- QR scan: < 1 second

## Security Testing

### Checklist
- [ ] JWT token expiration
- [ ] Role-based access control
- [ ] Input sanitization
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Password hashing (bcrypt)
- [ ] Secure session management

## Accessibility Testing

### WCAG 2.1 Compliance
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast ratios
- [ ] Alt text for images
- [ ] ARIA labels
- [ ] Focus indicators

## Test Coverage Goals

- **Unit Tests:** > 80% coverage
- **Integration Tests:** All critical paths
- **E2E Tests:** Major user flows
- **Manual Tests:** All features before release

## Running Tests (Production Setup)

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage

# Watch mode
npm run test:watch
```

---

**Note:** The test examples above are templates. Actual implementation requires setting up testing frameworks (Jest, React Testing Library, Cypress) and writing complete test suites.
