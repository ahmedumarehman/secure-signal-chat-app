# Vercel Deployment Guide

This guide will help you deploy your secure chat application to Vercel successfully.

## Prerequisites
- GitHub account
- Vercel account (free tier is sufficient)
- Node.js installed locally

## Files Added for Vercel Deployment

### 1. `vercel.json`
- Configures Vercel to properly build and serve your Vite React app
- Sets up routing for SPA (Single Page Application)
- Adds necessary headers for your application

### 2. `.vercelignore`
- Tells Vercel which files to ignore during deployment
- Excludes node_modules, build artifacts, and other unnecessary files

### 3. `.env.example`
- Template for environment variables
- Shows which Firebase configuration variables you'll need to set in Vercel

## Deployment Steps

### Step 1: Push to GitHub
1. Initialize git repository (if not already done):
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. Create a new repository on GitHub

3. Add remote and push:
   ```bash
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo-name.git
   git push -u origin main
   ```

### Step 2: Deploy to Vercel

#### Option A: Via Vercel Dashboard (Recommended)
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

#### Option B: Via Vercel CLI
1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow the prompts

### Step 3: Environment Variables
Since your Firebase config is currently hardcoded, you have two options:

#### Option A: Keep Current Setup (Easier)
- Your Firebase config is already in the code, so no additional setup needed
- Just deploy and it should work

#### Option B: Use Environment Variables (More Secure)
1. In Vercel dashboard, go to your project settings
2. Navigate to "Environment Variables"
3. Add these variables:
   ```
   VITE_FIREBASE_API_KEY=AIzaSyDsh-TJ1-U3zK9DeW8faKtZMcOJgXjgLcU
   VITE_FIREBASE_AUTH_DOMAIN=emrchains-56fb0.firebaseapp.com
   VITE_FIREBASE_DATABASE_URL=https://emrchains-56fb0-default-rtdb.firebaseio.com
   VITE_FIREBASE_PROJECT_ID=emrchains-56fb0
   VITE_FIREBASE_STORAGE_BUCKET=emrchains-56fb0.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=195038908070
   VITE_FIREBASE_APP_ID=1:195038908070:web:b57b89d9c22dc22a6bae67
   VITE_FIREBASE_MEASUREMENT_ID=G-S4E8DTBT5G
   ```

### Step 4: Firebase Configuration
Make sure your Firebase project allows your Vercel domain:
1. Go to Firebase Console
2. Navigate to Authentication > Settings > Authorized domains
3. Add your Vercel domain (e.g., `your-app-name.vercel.app`)

## Troubleshooting

### Common Issues:
1. **Build Fails**: Check the build logs in Vercel dashboard
2. **Firebase Errors**: Ensure your domain is authorized in Firebase
3. **Routing Issues**: The `vercel.json` file should handle SPA routing
4. **CORS Issues**: Check Firebase security rules

### Build Optimization:
- Your project uses Vite which is already optimized for production
- The build command `npm run build` will create an optimized bundle
- Vercel will automatically cache dependencies for faster builds

## Domain Configuration
- Vercel provides a free domain: `your-project-name.vercel.app`
- You can add a custom domain in the Vercel dashboard

## Notes
- Your app uses Firebase for authentication and real-time database
- The Signal Protocol implementation should work fine on Vercel
- All client-side routing is handled by the SPA configuration in `vercel.json`
