# Global App Deployment Guide

To make your Android app work globally (outside your local network), you need to host your **Database** and **Backend** on the internet.

## Phase 1: Cloud Database Setup (MongoDB Atlas)

1.  **Create Account**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and sign up (Free).
2.  **Create Cluster**: 
    *   Select **Shared** (Free) option.
    *   Choose a provider (AWS) and region closest to your users (e.g., Mumbai `ap-south-1`).
    *   Click **Create Cluster**.
3.  **Setup Security**:
    *   **Username/Password**: Create a database user (e.g., `admin` / `your-strong-password`). **Write these down.**
    *   **Network Access**: Click "Add IP Address" -> Select **"Allow Access from Anywhere"** (`0.0.0.0/0`). This is required for your cloud backend to connect.
4.  **Get Connection String**:
    *   Click **Connect** -> **Drivers**.
    *   Copy the string like: `mongodb+srv://admin:<password>@cluster0.abcde.mongodb.net/?retryWrites=true&w=majority`
    *   Replace `<password>` with your actual password.
    *   **Keep this string safe.**

## Phase 2: Backend Deployment (Render.com)

**Option A: Automated Blueprint (Recommended)**
1.  **Push Code**: Push your latest code (including `render.yaml`) to GitHub.
2.  **Create Blueprint**:
    *   Go to [Render Dashboard](https://dashboard.render.com).
    *   Click **New +** -> **Blueprint**.
    *   Connect your GitHub repository.
3.  **Configure**:
    *   Render will detect `render.yaml`.
    *   It will ask for `MONGODB_URI`.
    *   **Paste your Connection String**: `mongodb+srv://abeldaneesh_db_user:TheDarkAvenger%40@abelswolf.ipogkci.mongodb.net/?appName=abelswolf`
    *   *(Note: I replaced the double `@@` with `%40@` assuming your password ends with `@`. If your password is just `TheDarkAvenger`, remove the `%40`.)*
    *   Click **Apply**.
4.  **Wait & Copy URL**: Wait for the deploy to finish (green "Live" badge). Copy the URL (e.g., `https://training-app-backend.onrender.com`).

**Option B: Manual Setup**
1.  **Create Account**: Go to [Render](https://render.com/) and sign up.
2.  **New Web Service**:
    *   Click **New +** -> **Web Service**.
    *   Connect your GitHub repository.
3.  **Configuration**:
    *   **Name**: `dmo-training-api`
    *   **Root Directory**: `server`
    *   **Environment**: `Node`
    *   **Build Command**: `npm install && npm run build`
    *   **Start Command**: `npm start`
4.  **Environment Variables**:
    *   Add `MONGODB_URI`: Your connection string.
    *   Add `JWT_SECRET`: Any random string.
    *   Add `NODE_ENV`: `production`.
5.  **Deploy**: Click Create. Copy the URL when done.

## Phase 3: Android App Configuration

1.  **Update API URL**:
    *   Open `src/services/api.ts` in your local project.
    *   Ensure it uses `import.meta.env.VITE_API_URL`.
    *   Create or edit `.env` file in your project root:
        ```bash
        VITE_API_URL=https://dmo-training-api.onrender.com
        # (Use the URL from Phase 2)
        ```
2.  **Rebuild Web Assets**:
    ```bash
    npm run build
    ```
3.  **Sync to Mobile**:
    ```bash
    npx cap sync
    ```
4.  **Build APK**:
    ```bash
    npx cap build android
    ```
    *   Open Android Studio (`npx cap open android`).
    *   Go to **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.
    *   Locate the `app-debug.apk`.

**Congratulations!** You can now install this APK on any phone, and it will connect to your global cloud backend.
