# EchoSphere

Privacy-first geo-social voice network built with Next.js, Bun, and PostGIS.

## 🎯 Project Overview

EchoSphere is a real-time location-based voice messaging platform that prioritizes user privacy and safety. Drop voice messages at specific locations, discover nearby audio pins, and connect with others through gated voice introductions.

## ✨ Features Implemented

### Phase 1: Authentication & Privacy ✅
- **Secure Authentication**: Lucia-based session management with Argon2id password hashing
- **Privacy-First Location**: Fuzzy geolocation (±200m jitter) to protect exact user positions
- **User Management**: Signup, login, logout with session cookies
- **Protected Routes**: Authentication middleware on API endpoints

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** (App Router, Turbopack)
- **React 19** with TypeScript
- **Mapbox GL** for interactive maps
- **TailwindCSS** for styling
- **SWR** for data fetching

### Backend
- **Bun** runtime
- **Hono** web framework
- **Drizzle ORM** with PostgreSQL
- **Lucia** authentication
- **PostGIS** for geospatial queries

### Infrastructure
- **PostgreSQL** with PostGIS extension
- **Redis** for caching
- **MinIO** (S3-compatible) for audio storage
- **Docker Compose** for local development

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ or Bun
- Docker & Docker Compose
- Git

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
   
   Create `apps/api/.env`:
   ```env
   DATABASE_URL=postgres://echo_user:echo_password@localhost:5432/echosphere
   MINIO_ENDPOINT=localhost
   MINIO_PORT=9000
   MINIO_ACCESS_KEY=minioadmin
   MINIO_SECRET_KEY=minioadmin
   ```

   Create `apps/web/.env.local`:
   ```env
   NEXT_PUBLIC_MAPBOX_TOKEN=your_mapbox_token_here
   NEXT_PUBLIC_API_URL=http://localhost:3001
   ```

4. **Install dependencies**
   ```bash
   # API
   cd apps/api
   npm install
   
   # Web
   cd ../web
   npm install
   ```

5. **Run database migrations**
   ```bash
   cd apps/api
   # Apply initial schema
   docker exec -i echosphere-db-1 psql -U echo_user -d echosphere < ../../migration.sql
   
   # Apply auth migration
   docker exec -i echosphere-db-1 psql -U echo_user -d echosphere < ../../migration_auth.sql
   ```

6. **Start development servers**
   ```bash
   # Terminal 1 - API
   cd apps/api
   npm run dev
   
   # Terminal 2 - Web
   cd apps/web
   npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:3000
   - API: http://localhost:3001
   - MinIO Console: http://localhost:9001

## 📁 Project Structure

```
EchoSphere/
├── apps/
│   ├── api/              # Bun + Hono backend
│   │   ├── src/
│   │   │   ├── auth.ts   # Lucia configuration
│   │   │   ├── db/       # Drizzle schema & connection
│   │   │   ├── routes/   # API endpoints
│   │   │   └── services/ # Business logic
│   │   └── drizzle/      # Generated migrations
│   └── web/              # Next.js frontend
│       ├── app/          # App router pages
│       ├── components/   # React components
│       └── hooks/        # Custom hooks
├── docker-compose.yml    # Infrastructure setup
├── migration.sql         # Initial database schema
└── migration_auth.sql    # Auth system migration
```

## 🔐 Security Features

- **Password Hashing**: Argon2id (industry standard)
- **Session Management**: HTTP-only cookies with CSRF protection
- **Location Privacy**: Fuzzy coordinates prevent exact location tracking
- **Environment Isolation**: Secrets managed via `.env` files (never committed)

## 🗺️ Roadmap

- [x] Phase 1: Authentication & Privacy
- [ ] Phase 2: Voice Recording & Playback
- [ ] Phase 3: Real-time Discovery
- [ ] Phase 4: Connection Safety (Blocking, Reporting)
- [ ] Phase 5: Voice Masking
- [ ] Phase 6: Production Deployment

## 📝 License

MIT

## 👤 Author

**Shlok Sharma**
- GitHub: [@shloksharmawork](https://github.com/shloksharmawork)

---

Built with ❤️ for privacy-conscious voice communication
