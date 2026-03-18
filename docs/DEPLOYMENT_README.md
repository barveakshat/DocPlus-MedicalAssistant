# Doc+ Deployment Guide

## 🚀 Deployment Steps

### 1. Create Your GitHub Repository
1. Go to [github.com](https://github.com) and create a new repository
2. Name it something like `doc-plus-medical` or `my-doc-plus-app`
3. **Don't initialize with README, .gitignore, or license** (since we already have these)
4. Copy the repository URL

### 2. Push to Your Repository
```bash
# Add your new repository as origin
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git

# Push the code
git push -u origin realtimeChat
```

### 3. Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign up/login
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave as is)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 4. Environment Variables Setup
In Vercel dashboard, add these environment variables:
```
VITE_SUPABASE_PROJECT_ID=your_project_id
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
VITE_OPENROUTER_API_KEY=your_openrouter_key
VITE_OPENROUTER_MODEL=openai/gpt-3.5-turbo
RESEND_API_KEY=your_resend_api_key
SITE_URL=https://your-vercel-domain.vercel.app
```

### 5. Domain Setup (Optional)
- In Vercel, you can add a custom domain
- Update `SITE_URL` environment variable with your custom domain
- For email domain verification, use your custom domain

## 📁 Project Structure
- `src/` - React application code
- `supabase/` - Database functions and migrations
- `public/` - Static assets
- `.env.example` - Template for environment variables

## 🔧 Local Development
```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env
# Edit .env with your actual values

# Start development server
npm run dev
```

## 📧 Email Setup
1. Verify a domain in Resend dashboard
2. Update the Edge Function with your verified domain
3. Deploy the function: `npx supabase functions deploy send-temp-password`

## 🎯 Current Status
- ✅ Git repository cleaned up
- ✅ .env file secured (not in repository)
- ✅ .gitignore updated
- ✅ Ready for deployment
- ⏳ Waiting for your GitHub repository creation
- ⏳ Waiting for Vercel deployment
