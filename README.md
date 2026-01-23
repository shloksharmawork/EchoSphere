# EchoSphere

Privacy-first geo-social voice network built with Next.js, Bun, and PostGIS.

## 🎯 Project Overview

EchoSphere is a real-time location-based voice messaging platform that prioritizes user privacy and safety. Drop voice messages at specific locations, discover nearby audio pins, and connect with others through gated voice introductions.

## ✨ Features Implemented

### Phase 1: Authentication & Privacy ✅
- **Secure Authentication**: Lucia-based session management with Argon2id password hashing.
- **Privacy-First Location**: Fuzzy geolocation (±200m jitter) to protect exact user positions.

### Phase 2: Safety & Moderation ✅
- **Blocking System**: Complete user-to-user blocking functionality.
- **Reporting System**: Abuse reporting for Pins and Users with auto-flagging logic.
- **Content Filtering**: Nearby discovery automatically hides pins from blocked users.

### Phase 3: Voice Masking & Core UX ✅
- **Voice Masking**: Client-side pitch shifting using Web Audio API for maximum privacy.
- **Real-time Map**: WebSocket integration for instant pin display and location broadcasting.
- **Profile Management**: Premium modal for updates, avatars, and reputation tracking.

### Phase 4: Social Connections & Final Polish ✅
- **Social Connections**: Real-time connection request inbox with voice intros.
- **Real-time Notifications**: Direct WebSocket-based social alerts (Bell notification).
- **PWA Ready**: Manifest, mobile-optimized viewport, and high-quality app icon.

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** (App Router)
- **React 18** with TypeScript
- **Mapbox GL** for interactive maps
- **Web Audio API** for client-side voice processing
- **TailwindCSS** for styling
- **SWR** for data fetching

### Backend
- **Bun** runtime
- **Hono** web framework
- **Drizzle ORM** with PostgreSQL
- **Lucia v3** authentication
- **PostGIS** for geospatial queries
- **WebSocket** for real-time orchestration

### Infrastructure
- **PostgreSQL** with PostGIS extension
- **Redis** for stateful caching
- **MinIO** (S3-compatible) for audio storage
- **Docker Compose** for local development

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Docker & Docker Compose
- Mapbox API Token

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/shloksharmawork/EchoSphere.git
   cd EchoSphere
   ```

2. **Start infrastructure services**
   ```bash
   docker-compose up -d
   ```

3. **Set up environment variables**
   - Configure `.env` in `apps/api` and `.env.local` in `apps/web` (see [Project Setup](#project-setup) for details).

4. **Install dependencies & Start**
   ```bash
   # From root
   npm install
   npm run dev
   ```

## 🌐 Deployment

EchoSphere is designed to be easily deployed using modern cloud platforms.

### Backend (Render)
1. **Root Directory**: `apps/api`
2. **Build Command**: `npm install && npm run build`
3. **Start Command**: `npm start`
4. **Environment Variables**:
   - `DATABASE_URL`: PostgreSQL connection string (Supabase recommended).
   - `REDIS_URL`: Redis connection string (Upstash recommended).
   - `FRONTEND_URL`: Your Vercel deployment URL.
   - `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_ENDPOINT`: S3-compatible storage credentials.
   - `S3_BUCKET_NAME`: `voice-notes`.
   - `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`: Twilio API credentials.

### Frontend (Vercel)
1. **Root Directory**: `apps/web`
2. **Framework Preset**: Next.js
3. **Environment Variables**:
   - `NEXT_PUBLIC_API_URL`: Your Render backend URL.
   - `NEXT_PUBLIC_MAPBOX_TOKEN`: Your Mapbox public token.

### Infrastructure Providers
- **Database**: [Supabase](https://supabase.com) (PostgreSQL + PostGIS)
- **Redis**: [Upstash](https://upstash.com)
- **Storage**: [Supabase Storage](https://supabase.com/storage) or AWS S3.

## 🔐 Security & Privacy

- **On-Device Masking**: Voice masking is applied *before* upload, ensuring the original voice never leaves the user's device.
- **Fuzzy Mapping**: Publicly visible pin locations are jittered to prevent precise tracking.
- **Gated Connections**: Users must send a voice intro to request a connection; no direct messaging without consent.

## 🗺️ Roadmap Status

- [x] Phase 1: Authentication & Privacy
- [x] Phase 2: Safety & Moderation
- [x] Phase 3: Voice Masking & Core UX
- [x] Phase 4: Social Connections & Final Polish

## 📝 License

MIT

## 👤 Author

**Shlok Sharma**
- GitHub: [@shloksharmawork](https://github.com/shloksharmawork)

---

Built with ❤️ for privacy-conscious voice communication
