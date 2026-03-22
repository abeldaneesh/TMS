# Quick Start Guide - Training Management System (DMO)

Get up and running in 5 minutes!

## ⚡ Super Quick Start (Copy & Paste)

```bash
# 1. Install dependencies
npm install

# 2. Start the app
npm run dev

# 3. Open browser to http://localhost:5173

# 4. Login with demo account
Email: admin@dmo.gov
Password: admin123
```

That's it! You're ready to explore.

## 🎯 First Steps

### 1. Login (Choose Your Role)

Click any of these demo account buttons on the login page:

| Role | What You Can Do |
|------|-----------------|
| **Master Admin** | See everything, manage all trainings |
| **Program Officer** | Create trainings, approve nominations |
| **Institutional Admin** | Nominate staff for trainings |
| **Participant** | View trainings, scan QR for attendance |

### 2. Explore the Dashboard

After login, you'll see:
- 📊 **Statistics cards** - Key metrics at a glance
- 📈 **Charts** - Visual data representation
- 📅 **Upcoming trainings** - Next scheduled sessions

### 3. Try These Features

#### As Program Officer (priya@dmo.gov / officer123):

**Create a Training:**
1. Click "Create Training" in sidebar
2. Fill in the form:
   - Title: "Test Training"
   - Description: "My first training"
   - Program: Choose from dropdown
   - Date: Pick a future date
   - Time: Set start and end times
3. Watch as available halls are shown automatically!
4. Select institutions
5. Click "Create Training"

**Generate QR Code:**
1. Go to "QR Attendance"
2. Select a training
3. Click "Generate QR Code"
4. Download the QR image

#### As Institutional Admin (anjali@hospital1.gov / inst123):

**Nominate Staff:**
1. Go to "Trainings"
2. View available trainings
3. Click on a training
4. Nominate staff members

#### As Participant (kavita@hospital1.gov / part123):

**Scan QR Code:**
1. Go to "Scan QR"
2. Click "Start Scanning"
3. Allow camera access
4. Point at QR code (or use the sample one)

## 🎓 Common Tasks

### Create Your First Training

```
1. Login as: priya@dmo.gov / officer123
2. Click: "Create Training"
3. Enter:
   - Title: "Emergency Response Training"
   - Program: "Emergency Medicine"
   - Date: Tomorrow
   - Time: 09:00 - 12:00
4. Select: District General Hospital
5. Submit!
```

### View Reports

```
1. Login as any user
2. Click: "Reports"
3. Select:
   - Report Type: Training Report
   - Training: Choose any
4. Click: "Export as PDF"
5. Report downloads instantly!
```

### Check Hall Availability

```
1. Login as: priya@dmo.gov / officer123
2. Click: "Hall Availability"
3. Select:
   - Date: Any date
   - Time: 09:00 - 17:00
4. See: Available halls highlighted in green
```

## 📱 Mobile Testing

On mobile device:
1. Open http://localhost:5173 (or your network IP)
2. Login with any account
3. Sidebar collapses to hamburger menu
4. All features work on small screens

## 🔍 What to Look For

### ✅ Check These Work

- [ ] Login/Logout
- [ ] Role-based navigation (different for each user)
- [ ] Create training with hall conflict checking
- [ ] Nominate participants
- [ ] Approve/reject nominations
- [ ] Generate QR codes
- [ ] View analytics charts
- [ ] Export reports (PDF/CSV)
- [ ] Search and filter functions
- [ ] Responsive design (resize browser)

### 🎨 UI Features to Notice

- **Toast Notifications** - Bottom-right corner
- **Loading States** - Spinners when data loads
- **Error Messages** - Helpful validation feedback
- **Badges** - Color-coded status indicators
- **Charts** - Interactive data visualizations
- **Cards** - Clean, organized layouts

## 🐛 If Something Goes Wrong

### Can't Login?
- Check you're using exact demo credentials
- Clear browser cache (Ctrl+Shift+Delete)
- Try incognito/private window

### Blank Page?
```bash
# Stop the server (Ctrl+C)
# Clear and restart
npm cache clean --force
npm install
npm run dev
```

### Port Already in Use?
- Server will auto-use next available port (5174, 5175, etc.)
- Or kill process using port 5173:
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <process_id> /F

# Mac/Linux
lsof -ti:5173 | xargs kill
```

### Camera Not Working (QR Scan)?
- Must use localhost (not IP address)
- Allow camera permissions
- Try Chrome/Edge (best compatibility)

## 💡 Pro Tips

1. **Quick Role Switching**: Just logout and login with different account
2. **Test Data**: All data resets on page refresh (it's in-memory)
3. **Browser DevTools**: Press F12 to see console, network, etc.
4. **Multiple Users**: Open different browsers for multi-user testing
5. **Sample Data**: Check `/src/utils/mockData.ts` for all demo data

## 📚 Learn More

After quick start, explore these docs:

- **README.md** - Full project overview
- **SEED_DATA.md** - All demo accounts and data
- **FEATURES.md** - Complete feature list
- **SETUP.md** - Detailed setup instructions
- **API_DOCUMENTATION.md** - API structure
- **TESTING_GUIDE.md** - How to test

## 🎯 Next Steps

### Beginner
1. ✅ Login and explore dashboard
2. ✅ Create a training
3. ✅ Generate a report
4. ✅ View analytics

### Intermediate
1. ✅ Complete a full workflow (create → nominate → approve → attend)
2. ✅ Test hall conflict detection
3. ✅ Generate and scan QR codes
4. ✅ Export multiple report types

### Advanced
1. ✅ Review mock API code (`/src/services/mockApi.ts`)
2. ✅ Examine React components
3. ✅ Understand routing structure
4. ✅ Plan backend implementation

## 🚀 Ready to Build?

### Frontend Customization
```bash
# Components are in:
/src/app/components/

# Pages are in:
/src/app/pages/

# Mock API is in:
/src/services/mockApi.ts
```

### Backend Integration
```bash
# Replace mock API calls with real HTTP requests
# Use axios or fetch
# Update endpoints in services/
# Add environment variables
```

## ❓ Quick Reference

### Demo Accounts Quick Copy

```
Master Admin:
admin@dmo.gov / admin123

Program Officer:
priya@dmo.gov / officer123

Institutional Admin:
anjali@hospital1.gov / inst123

Participant:
kavita@hospital1.gov / part123
```

### Common Commands

```bash
# Start development
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Install new package
npm install package-name
```

### URLs

- Local: http://localhost:5173
- Network: http://[your-ip]:5173 (for mobile testing)

## 🎉 You're All Set!

The application is now running and ready for exploration.

**Enjoy building with the DMO Training Management System!**

---

**Need Help?**
- Check SETUP.md for detailed instructions
- Review SEED_DATA.md for all demo accounts
- See FEATURES.md for what's implemented

**Found a Bug?**
- Check browser console (F12)
- Review error messages
- Clear cache and retry
