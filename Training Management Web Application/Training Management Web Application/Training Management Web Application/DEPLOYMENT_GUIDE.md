# Deployment Guide - Training Management System

This guide covers deploying the Training Management System to production.

## Overview

The application consists of:
- **Frontend:** React + Vite (Static files)
- **Backend:** Node.js + Express (API server) - *To be implemented*
- **Database:** MongoDB - *To be implemented*

## Prerequisites

### Development Environment
- Node.js 18+ installed
- MongoDB 6+ installed
- Git installed
- Code editor (VS Code recommended)

### Production Server
- Ubuntu 20.04+ or Windows Server 2019+
- 2GB+ RAM
- 20GB+ storage
- Domain name (optional but recommended)
- SSL certificate

## Frontend Deployment

### Option 1: Vercel (Recommended for Frontend-Only)

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy**
   ```bash
   # First deployment
   vercel

   # Production deployment
   vercel --prod
   ```

4. **Configure**
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

### Option 2: Netlify

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login**
   ```bash
   netlify login
   ```

3. **Initialize**
   ```bash
   netlify init
   ```

4. **Deploy**
   ```bash
   # Build first
   npm run build

   # Deploy
   netlify deploy --prod --dir=dist
   ```

### Option 3: AWS S3 + CloudFront

1. **Build the application**
   ```bash
   npm run build
   ```

2. **Create S3 Bucket**
   ```bash
   aws s3 mb s3://dmo-training-app
   ```

3. **Upload files**
   ```bash
   aws s3 sync dist/ s3://dmo-training-app
   ```

4. **Configure bucket for static hosting**
   ```bash
   aws s3 website s3://dmo-training-app \
     --index-document index.html \
     --error-document index.html
   ```

5. **Create CloudFront distribution** (for CDN)

### Option 4: Traditional Web Server

#### Nginx Configuration

```nginx
server {
    listen 80;
    server_name dmo-training.example.com;
    root /var/www/dmo-training/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

## Backend Deployment (Node.js + Express)

### 1. Backend Setup

#### Project Structure
```
backend/
├── src/
│   ├── config/
│   │   └── database.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Training.js
│   │   ├── Nomination.js
│   │   └── Attendance.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── trainings.js
│   │   ├── nominations.js
│   │   └── attendance.js
│   ├── middleware/
│   │   ├── auth.js
│   │   └── rbac.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── trainingController.js
│   │   └── ...
│   └── server.js
├── .env
├── package.json
└── README.md
```

#### Environment Variables (.env)
```bash
# Server
NODE_ENV=production
PORT=5000

# Database
MONGODB_URI=mongodb://localhost:27017/dmo_training
# OR for MongoDB Atlas
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/dmo_training

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_EXPIRE=7d

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Frontend URL
CLIENT_URL=https://dmo-training.example.com

# QR Code
QR_EXPIRY_HOURS=24

# File Upload
MAX_FILE_SIZE=5242880
```

### 2. Database Setup

#### MongoDB Installation (Ubuntu)

```bash
# Import MongoDB public key
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -

# Create list file
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list

# Update and install
sudo apt-get update
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
```

#### MongoDB Security

```bash
# Connect to MongoDB
mongosh

# Create admin user
use admin
db.createUser({
  user: "admin",
  pwd: "strong-password",
  roles: ["userAdminAnyDatabase", "readWriteAnyDatabase"]
})

# Create app user
use dmo_training
db.createUser({
  user: "dmo_app",
  pwd: "another-strong-password",
  roles: ["readWrite"]
})
```

### 3. Backend Deployment

#### Option A: PM2 (Process Manager)

```bash
# Install PM2
npm install -g pm2

# Start application
pm2 start src/server.js --name dmo-backend

# Auto-restart on reboot
pm2 startup
pm2 save

# Monitoring
pm2 monit

# Logs
pm2 logs dmo-backend
```

#### Option B: Docker

**Dockerfile**
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .

EXPOSE 5000

CMD ["node", "src/server.js"]
```

**docker-compose.yml**
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongo:27017/dmo_training
    depends_on:
      - mongo
    restart: unless-stopped

  mongo:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=strong-password
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    restart: unless-stopped

volumes:
  mongo-data:
```

**Deploy with Docker Compose**
```bash
docker-compose up -d
```

## Full Stack Deployment (AWS EC2)

### 1. Launch EC2 Instance

1. Choose Ubuntu 20.04 LTS
2. Instance type: t2.medium (or larger)
3. Configure security groups:
   - SSH (22)
   - HTTP (80)
   - HTTPS (443)
   - API (5000) - optional, can use reverse proxy

### 2. Initial Server Setup

```bash
# Connect to server
ssh -i your-key.pem ubuntu@your-server-ip

# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install MongoDB (see above)

# Install Nginx
sudo apt-get install -y nginx

# Install PM2
sudo npm install -g pm2
```

### 3. Deploy Backend

```bash
# Clone repository
git clone https://github.com/your-repo/dmo-training-backend.git
cd dmo-training-backend

# Install dependencies
npm ci --only=production

# Set up environment
cp .env.example .env
nano .env  # Edit with production values

# Start with PM2
pm2 start src/server.js --name dmo-backend
pm2 startup
pm2 save
```

### 4. Deploy Frontend

```bash
# Clone frontend
git clone https://github.com/your-repo/dmo-training-frontend.git
cd dmo-training-frontend

# Install and build
npm ci
npm run build

# Copy to Nginx directory
sudo mkdir -p /var/www/dmo-training
sudo cp -r dist/* /var/www/dmo-training/
```

### 5. Configure Nginx Reverse Proxy

```nginx
# /etc/nginx/sites-available/dmo-training

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name dmo-training.example.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Server
server {
    listen 443 ssl http2;
    server_name dmo-training.example.com;

    # SSL Certificates
    ssl_certificate /etc/letsencrypt/live/dmo-training.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dmo-training.example.com/privkey.pem;

    # Frontend
    root /var/www/dmo-training;
    index index.html;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

Enable site:
```bash
sudo ln -s /etc/nginx/sites-available/dmo-training /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. SSL Certificate (Let's Encrypt)

```bash
# Install Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d dmo-training.example.com

# Auto-renewal
sudo certbot renew --dry-run
```

## Database Backup Strategy

### Automated MongoDB Backups

```bash
#!/bin/bash
# /opt/scripts/mongodb-backup.sh

DATE=$(date +%Y-%m-%d_%H-%M-%S)
BACKUP_DIR="/backups/mongodb"
DB_NAME="dmo_training"

# Create backup
mongodump --db $DB_NAME --out $BACKUP_DIR/$DATE

# Compress
tar -czf $BACKUP_DIR/$DATE.tar.gz $BACKUP_DIR/$DATE
rm -rf $BACKUP_DIR/$DATE

# Keep only last 7 days
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/$DATE.tar.gz s3://dmo-backups/mongodb/
```

**Cron Job:**
```bash
# Daily at 2 AM
0 2 * * * /opt/scripts/mongodb-backup.sh
```

## Monitoring & Logging

### 1. PM2 Monitoring

```bash
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
```

### 2. Nginx Logs

```nginx
access_log /var/log/nginx/dmo-training-access.log;
error_log /var/log/nginx/dmo-training-error.log;
```

### 3. Application Logging

Use Winston for structured logging:

```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}
```

### 4. Uptime Monitoring

Use services like:
- UptimeRobot
- Pingdom
- StatusCake

## Security Checklist

- [ ] HTTPS enabled (SSL certificate)
- [ ] Environment variables secured
- [ ] Database authentication enabled
- [ ] JWT secret is strong and unique
- [ ] Passwords hashed with bcrypt
- [ ] Rate limiting implemented
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Security headers set
- [ ] Regular security updates
- [ ] Firewall configured
- [ ] SSH key-based authentication
- [ ] MongoDB not exposed publicly

## Performance Optimization

### Frontend
- Code splitting
- Lazy loading routes
- Image optimization
- CDN for static assets
- Gzip compression
- Browser caching

### Backend
- Database indexing
- Query optimization
- Caching (Redis)
- Connection pooling
- Compression middleware

### Database
```javascript
// Create indexes
db.trainings.createIndex({ date: 1, hallId: 1 });
db.trainings.createIndex({ status: 1 });
db.nominations.createIndex({ trainingId: 1, participantId: 1 }, { unique: true });
db.attendance.createIndex({ trainingId: 1, participantId: 1 });
db.users.createIndex({ email: 1 }, { unique: true });
```

## Scaling Strategies

### Horizontal Scaling
- Load balancer (Nginx, AWS ELB)
- Multiple backend instances
- Database replication
- Session store (Redis)

### Vertical Scaling
- Increase server resources
- Optimize code
- Database tuning

## Rollback Plan

```bash
# Keep previous version
mv /var/www/dmo-training /var/www/dmo-training-backup

# Deploy new version
# ...

# If issues, rollback
rm -rf /var/www/dmo-training
mv /var/www/dmo-training-backup /var/www/dmo-training
sudo systemctl reload nginx
```

## Maintenance Window

1. Schedule maintenance (e.g., Sunday 2-4 AM)
2. Notify users in advance
3. Put up maintenance page
4. Perform updates
5. Test thoroughly
6. Remove maintenance page

## Cost Estimation (AWS)

- EC2 t2.medium: ~$35/month
- MongoDB Atlas M10: ~$57/month
- S3 + CloudFront: ~$5/month
- Route53 (DNS): ~$0.50/month
- **Total: ~$100/month**

Alternative (Budget):
- EC2 t2.micro: ~$8/month
- Self-hosted MongoDB: $0
- Nginx only: $0
- **Total: ~$10/month**

## Disaster Recovery

1. **Regular Backups**
   - Database: Daily
   - Code: Git repository
   - Configuration: Documented

2. **Recovery Procedure**
   - Restore database from backup
   - Redeploy from Git
   - Apply configuration
   - Test functionality

3. **RTO/RPO Goals**
   - Recovery Time Objective: 4 hours
   - Recovery Point Objective: 24 hours

## Mobile App Deployment (Android APK)

### 1. Build Web Assets
First, build the React application to generate the `dist` folder:
```bash
npm run build
```

### 2. Sync with Capacitor
Sync the built web assets to the Android project:
```bash
npx cap sync
```

### 3. Build APK (Using Android Studio) - Recommended
1. Open the `android` folder in Android Studio:
   ```bash
   npx cap open android
   ```
2. Wait for Gradle sync to complete.
3. Go to **Build** > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
4. Once finished, a notification will appear. Click "locate" to find your `app-debug.apk`.
   - Usually found in: `android/app/build/outputs/apk/debug/app-debug.apk`.

### 4. Build APK (Command Line)
*Prerequisite: Ensure `JAVA_HOME` is set and Android SDK is in your PATH.*

```bash
cd android
./gradlew assembleDebug
```
The APK will be at: `android/app/build/outputs/apk/debug/app-debug.apk`.

## Troubleshooting
- **JAVA_HOME error**: If building via CLI fails, use Android Studio as it manages the JDK for you.
- **Gradle errors**: Try cleaning the build:
  ```bash
  cd android
  ./gradlew clean
  ```

---

**Ready for Production!** Follow this guide step-by-step to deploy your Training Management System.
