# Setup Instructions - Training Management Web Application (DMO)

This guide provides step-by-step instructions to run the application locally on Windows.

## System Requirements

- **Operating System:** Windows 10/11
- **Node.js:** Version 18.x or higher
- **Package Manager:** npm (comes with Node.js) or pnpm
- **Browser:** Chrome, Edge, Firefox (latest versions)
- **Memory:** At least 4GB RAM
- **Disk Space:** 500MB free space

## Prerequisites Installation

### Step 1: Install Node.js

1. Go to [https://nodejs.org/](https://nodejs.org/)
2. Download the **LTS (Long Term Support)** version for Windows
3. Run the installer (.msi file)
4. Follow the installation wizard:
   - Accept the license agreement
   - Keep default installation path
   - Ensure "Add to PATH" is checked
5. Click Install and wait for completion

### Step 2: Verify Installation

Open Command Prompt (cmd) or PowerShell and run:

```bash
node --version
# Should show: v18.x.x or higher

npm --version
# Should show: 9.x.x or higher
```

If versions appear, installation is successful!

## Application Setup

### Step 1: Extract/Clone Project

If you have a ZIP file:
1. Extract the ZIP to a folder like `C:\Projects\training-management-dmo`
2. Remember this path

If using Git:
```bash
git clone <repository-url>
cd training-management-dmo
```

### Step 2: Open Command Prompt in Project Folder

**Method 1:** Using File Explorer
1. Open File Explorer
2. Navigate to project folder
3. Click in the address bar, type `cmd`, press Enter

**Method 2:** Using Command Prompt
```bash
cd C:\Projects\training-management-dmo
```

### Step 3: Install Dependencies

Run this command (it will take 2-5 minutes):

```bash
npm install
```

You should see progress bars and package downloads. Wait until you see:
```
added XXX packages
```

**Alternative using pnpm (faster):**
```bash
npm install -g pnpm
pnpm install
```

### Step 4: Start the Development Server

Run:
```bash
npm run dev
```

**OR with pnpm:**
```bash
pnpm dev
```

You should see output like:
```
  VITE v6.3.5  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```

### Step 5: Open in Browser

1. Open your web browser (Chrome/Edge recommended)
2. Go to: **http://localhost:5173**
3. You should see the Login page!

## Using the Application

### First Login

Use any of these demo accounts:

**Master Admin:**
- Email: `admin@dmo.gov`
- Password: `admin123`

**Program Officer:**
- Email: `priya@dmo.gov`
- Password: `officer123`

**Institutional Admin:**
- Email: `anjali@hospital1.gov`
- Password: `inst123`

**Participant:**
- Email: `kavita@hospital1.gov`
- Password: `part123`

See `SEED_DATA.md` for complete list of accounts.

## Common Issues & Solutions

### Issue 1: "node is not recognized"
**Solution:**
- Node.js not installed or not in PATH
- Restart Command Prompt after installing Node.js
- Reinstall Node.js with "Add to PATH" checked

### Issue 2: "npm install" fails
**Solution:**
```bash
# Clear npm cache
npm cache clean --force

# Try again
npm install
```

### Issue 3: Port 5173 already in use
**Solution:**
- Close other applications using the port
- Or the dev server will automatically use next available port (5174, 5175, etc.)

### Issue 4: "Cannot find module" errors
**Solution:**
```bash
# Delete node_modules and reinstall
rmdir /s node_modules
npm install
```

### Issue 5: Camera not working for QR scan
**Solution:**
- Use HTTPS or localhost (not IP address)
- Allow camera permissions in browser
- Check browser console for errors
- Try different browser (Chrome works best)

## Development Commands

### Start Development Server
```bash
npm run dev
```
Starts local server with hot-reload

### Build for Production
```bash
npm run build
```
Creates optimized production build in `dist/` folder

### Preview Production Build
```bash
npm run preview
```
Test the production build locally

## Project Structure

```
training-management-dmo/
│
├── src/                          # Source code
│   ├── app/
│   │   ├── components/          # React components
│   │   │   ├── ui/             # Reusable UI components
│   │   │   └── Layout.tsx      # Main layout
│   │   ├── pages/              # Page components
│   │   │   ├── Login.tsx
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Trainings.tsx
│   │   │   ├── CreateTraining.tsx
│   │   │   ├── QRAttendance.tsx
│   │   │   ├── ScanQR.tsx
│   │   │   ├── Nominations.tsx
│   │   │   ├── Analytics.tsx
│   │   │   ├── Reports.tsx
│   │   │   └── HallAvailability.tsx
│   │   └── App.tsx             # Main app entry
│   │
│   ├── contexts/               # React contexts
│   │   └── AuthContext.tsx    # Authentication
│   │
│   ├── services/               # API services
│   │   └── mockApi.ts         # Mock backend API
│   │
│   ├── types/                  # TypeScript types
│   │   └── index.ts
│   │
│   ├── utils/                  # Utilities
│   │   └── mockData.ts        # Sample data
│   │
│   └── styles/                 # Global styles
│
├── .env.example                # Environment variables template
├── package.json                # Dependencies
├── README.md                   # Main documentation
├── SEED_DATA.md               # Demo accounts & data
├── SETUP.md                   # This file
└── vite.config.ts             # Vite configuration
```

## Features to Test

### 1. Dashboard
- Login as any user
- View personalized statistics
- Check upcoming trainings
- View charts and analytics

### 2. Training Management
**As Program Officer:**
- Create new training
- Select date/time
- Check hall availability (real-time)
- Assign institutions
- Edit/delete trainings

### 3. Nominations
**As Institutional Admin:**
- Nominate staff for trainings
- View nomination status

**As Program Officer:**
- Approve/reject nominations
- Provide rejection reasons

### 4. QR Attendance
**As Program Officer:**
- Generate QR code for training
- Download QR code image
- Display at venue

**As Participant:**
- Scan QR code
- Mark attendance
- View attendance history

### 5. Analytics
- View training statistics
- Program-wise distribution
- Institution-wise participation
- Attendance trends

### 6. Reports
- Generate Training Reports (PDF/CSV)
- Generate Institution Reports (PDF)
- Generate District Summary (PDF)
- Download reports

### 7. Hall Availability
- Select date and time
- View available halls
- Check bookings
- See hall facilities

## Testing Workflows

### Complete Training Lifecycle

1. **Create Training** (Program Officer)
   - Login as `priya@dmo.gov`
   - Go to "Create Training"
   - Fill form and submit
   - Check hall availability

2. **Nominate Participants** (Institutional Admin)
   - Login as `anjali@hospital1.gov`
   - Go to "Trainings"
   - Nominate staff

3. **Approve Nominations** (Program Officer)
   - Login as `priya@dmo.gov`
   - Go to "Nominations"
   - Approve nominations

4. **Generate QR Code** (Program Officer)
   - Go to "QR Attendance"
   - Select training
   - Download QR

5. **Mark Attendance** (Participant)
   - Login as `kavita@hospital1.gov`
   - Go to "Scan QR"
   - Scan code (or simulate)

6. **Generate Report** (Any authorized user)
   - Go to "Reports"
   - Select training
   - Export as PDF/CSV

## Browser Developer Tools

Press **F12** to open browser developer tools:
- **Console:** View logs and errors
- **Network:** See API requests (mock)
- **Application:** View localStorage data

## Stopping the Server

In Command Prompt where server is running:
- Press **Ctrl + C**
- Confirm with **Y** if asked

## Restarting the Server

```bash
npm run dev
```

## Troubleshooting Tips

1. **Clear Browser Cache:**
   - Press Ctrl + Shift + Delete
   - Clear cached files
   - Refresh page (Ctrl + F5)

2. **Check Console for Errors:**
   - Press F12
   - Look for red errors
   - Report errors with details

3. **Restart Everything:**
   ```bash
   # Stop server (Ctrl + C)
   # Clear everything
   rmdir /s node_modules
   npm cache clean --force
   npm install
   npm run dev
   ```

## Next Steps (Production Deployment)

For production deployment, you would need to:

1. Set up real backend (Node.js + Express)
2. Configure MongoDB database
3. Implement real JWT authentication
4. Add email/SMS notification services
5. Set up hosting (AWS, Azure, Heroku, etc.)
6. Configure environment variables
7. Set up SSL certificates
8. Implement proper security measures

See README.md section "Future Enhancements" for details.

## Support & Documentation

- **Main Documentation:** README.md
- **Demo Accounts:** SEED_DATA.md
- **API Documentation:** Check `/src/services/mockApi.ts`
- **Type Definitions:** Check `/src/types/index.ts`

## Development Notes

### Mock Backend
- All data stored in memory
- Resets on page refresh
- Simulates network delays (500ms)
- Includes validation logic
- Demonstrates proper API structure

### Camera Permissions
For QR scanning to work:
- Must use HTTPS or localhost
- User must grant camera permission
- Browser must support MediaDevices API

### Data Persistence
- Currently uses localStorage for login session
- All other data is in-memory (mock)
- For real app, integrate database

---

**Congratulations!** You're now ready to use the Training Management System.

For questions or issues, check the troubleshooting section or review the source code comments.
