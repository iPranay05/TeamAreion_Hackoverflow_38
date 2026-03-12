# SafeStree Admin Dashboard

Admin panel for monitoring and managing the WomenSafe app.

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Then edit `.env` and add your credentials:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here

# Google Maps API Key
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

### 3. Run Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:5173`

### 4. Build for Production

```bash
npm run build
```

## Features

- 📊 Dashboard Overview
- 🚨 Emergency Alerts Monitoring
- 📝 Incident Moderation (Approve/Reject)
- 👥 User Management
- 🛡️ Safe Zones Management
- 📈 Analytics (Coming Soon)
- 🗺️ Real-time Map Visualization

## Environment Variables

| Variable                   | Description                               | Required |
| -------------------------- | ----------------------------------------- | -------- |
| `VITE_SUPABASE_URL`        | Your Supabase project URL                 | Yes      |
| `VITE_SUPABASE_ANON_KEY`   | Your Supabase anonymous key               | Yes      |
| `VITE_GOOGLE_MAPS_API_KEY` | Google Maps API key for map visualization | Yes      |

## Getting API Keys

### Supabase

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to Settings → API
4. Copy the URL and anon/public key

### Google Maps

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable Maps JavaScript API
3. Create credentials → API Key
4. Restrict the key to your domain

## Security Notes

- ⚠️ Never commit `.env` file to version control
- ⚠️ Use environment variables for all sensitive data
- ⚠️ Restrict API keys to specific domains in production
- ⚠️ Use Supabase Row Level Security policies

## Tech Stack

- React 17
- TypeScript
- Vite
- Supabase
- Google Maps React
- Lucide Icons
- date-fns
