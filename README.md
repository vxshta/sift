<div align="center">

# 🔘 Sift

### Transform Passive Consumption into Active Mastery

*An AI-powered active recall engine that turns any content into a precision-engineered learning experience.*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Features](#-features) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [Documentation](#-documentation)

</div>

---

## 📖 What is Sift?

**Sift** is a minimalist active recall engine designed for students, professionals, and lifelong learners who want to truly master what they study—not just passively consume it. Built on the science of active recall and spaced repetition, Sift transforms your study materials into an engaging, flow-state learning experience.

### The Philosophy

> **"Friction is the Enemy"** — The time between "I have content" and "I'm being quizzed" should be less than 10 seconds.

Sift prioritizes:
- 🎯 **Grounded Intelligence**: AI generates questions strictly from your content—no hallucinations
- ⚡ **Zero Friction**: Upload → Generate → Learn in seconds
- 🧘 **Zen Mode**: Distraction-free, flow-state study sessions
- 📱 **Mobile-First**: Progressive Web App that works everywhere
- 🎨 **Beautiful Design**: Clean, dark-mode-first interface that reduces eye strain

---

## ✨ Features

### Core Functionality

#### 📤 **Multi-Format Content Ingestion**
- Upload PDFs, Markdown, or text files
- Paste text directly or URLs for instant processing
- Future: Audio transcription and video content support

#### 🤖 **AI-Powered Quiz Generation**
- Automatically generates questions from your content using Google's Gemini AI
- Multiple question formats:
  - **Flashcards** for recall practice
  - **Multiple Choice** for recognition testing
  - **Socratic Questions** for deep understanding
- Configurable depth: Shallow (key concepts) vs. Deep (detailed coverage)

#### 🎓 **Learning Paths**
- Create structured, long-term learning goals (e.g., "Master React")
- AI generates progressive curriculum based on your progress
- Tracks what you've learned to suggest next steps
- Continuity across multiple study sessions

#### 📊 **Mastery Tracking (Echoes)**
- Track performance per topic across all sources
- Visual "knowledge heatmap" showing strengths and weaknesses
- Intelligent prioritization of weak areas in future quizzes
- Spaced repetition system to prevent knowledge decay

#### 🔐 **Secure Authentication**
- Google OAuth integration via Better-Auth
- Email/password authentication
- Session management and protected routes

#### 💾 **The Vault**
- Save all your sources and study materials
- View history of all completed "Sifts" (study sessions)
- Track scores and progress over time
- Archive old materials while keeping your knowledge graph

### User Experience

- **Keyboard-Driven Interface**: Fast shortcuts for power users
- **Gesture Support**: Intuitive swipe controls on mobile
- **Instant Feedback**: See source snippets for wrong answers
- **Source Anchoring**: Every answer links back to your original material
- **Progressive Web App**: Install on any device, works offline
- **Dark Mode First**: Reduced eye strain for long study sessions

---

## 🏗️ Architecture

### Tech Stack

**Frontend**
- [Next.js 16](https://nextjs.org/) - React 19, Server Components, Server Actions
- [TypeScript 5](https://www.typescriptlang.org/) - Full type safety
- [Tailwind CSS 4](https://tailwindcss.com/) - Utility-first styling
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful, accessible components
- [Framer Motion](https://www.framer.com/motion/) - Smooth animations and transitions
- [Radix UI](https://www.radix-ui.com/) - Accessible component primitives

**Backend & Data**
- [Drizzle ORM](https://orm.drizzle.team/) - Type-safe database queries
- [PostgreSQL](https://www.postgresql.org/) - Primary database
- [Better-Auth](https://www.better-auth.com/) - Modern authentication
- [Vercel AI SDK](https://sdk.vercel.ai/) - AI integration layer

**AI & Content Processing**
- [Google Gemini](https://ai.google.dev/) - Question generation
- [Firebase](https://firebase.google.com/) - File storage and real-time features
- [Cloudflare R2](https://www.cloudflare.com/products/r2/) - Object storage

**Development Tools**
- [Turborepo](https://turbo.build/repo) - Monorepo build system
- [Biome](https://biomejs.dev/) - Fast linter and formatter
- [pnpm](https://pnpm.io/) - Fast, disk-efficient package manager

### Project Structure

```
sift/
├── apps/
│   └── web/                    # Main Next.js application
│       ├── src/
│       │   ├── app/            # Next.js App Router
│       │   │   ├── api/        # API routes
│       │   │   ├── dashboard/  # User dashboard
│       │   │   ├── sift/       # Quiz interface
│       │   │   ├── learn/      # Learning paths
│       │   │   └── explore/    # Content exploration
│       │   ├── components/     # React components
│       │   │   ├── blocks/     # Landing page sections
│       │   │   ├── media/      # Media components
│       │   │   └── ui/         # shadcn components
│       │   ├── hooks/          # Custom React hooks
│       │   └── lib/            # Utilities and helpers
│       └── public/             # Static assets
│
├── packages/
│   ├── auth/                   # Authentication configuration
│   │   └── src/
│   │       ├── index.ts        # Better-Auth setup
│   │       └── types/          # Auth types
│   │
│   ├── db/                     # Database layer
│   │   └── src/
│   │       ├── schema/         # Drizzle schema definitions
│   │       │   ├── auth.ts     # User & session tables
│   │       │   ├── sources.ts  # Content sources
│   │       │   ├── sifts.ts    # Quiz sessions
│   │       │   ├── echoes.ts   # Knowledge tracking
│   │       │   ├── flashcards.ts
│   │       │   └── learning-paths.ts
│   │       ├── queries/        # Database query functions
│   │       └── types/          # Type definitions
│   │
│   ├── env/                    # Environment variable validation
│   └── config/                 # Shared TypeScript configs
│
├── docs/                       # Documentation
│   ├── soul.md                 # Product vision (v1)
│   ├── soul_v2.md              # Updated product vision
│   ├── learning_system_plan.md # Technical planning
│   └── future.md               # Future enhancements
│
├── turbo.json                  # Turborepo configuration
├── pnpm-workspace.yaml         # Workspace configuration
├── biome.json                  # Linting & formatting rules
└── package.json                # Root package configuration
```

### Database Schema

#### Core Tables

**`sources`** - User-uploaded content
```typescript
- id: string (primary key)
- userId: string (foreign key)
- title: string
- type: 'pdf' | 'text' | 'url' | 'audio' | 'markdown' | 'json'
- content: text (extracted content)
- metadata: json (page count, duration, etc.)
- timestamps: createdAt, updatedAt
```

**`sifts`** - Generated quiz sessions
```typescript
- id: string (primary key)
- userId: string (foreign key)
- sourceId: string (foreign key)
- status: 'in_progress' | 'completed' | 'abandoned'
- config: json (depth, format settings)
- takeaways: json[] (key learnings)
- timestamps: createdAt, updatedAt
```

**`questions`** - Quiz questions
```typescript
- id: string (primary key)
- siftId: string (foreign key)
- sectionId: string (optional foreign key)
- question: string
- answer: string (correct answer)
- options: json (for MCQs)
- explanation: text (source context)
- tags: string[] (topics covered)
```

**`echoes`** - Knowledge tracking
```typescript
- id: string (primary key)
- userId: string (foreign key)
- sourceId: string (foreign key)
- topic: string
- masteryLevel: int (0-100)
- lastReviewedAt: timestamp
- Unique constraint: (userId, sourceId, topic)
```

**`learning_paths`** - Long-term learning goals
```typescript
- id: string (primary key)
- userId: string (foreign key)
- title: string
- goal: string (user's original prompt)
- summary: text (AI progress summary)
- timestamps: createdAt, updatedAt
```

**`sift_sessions`** - Session tracking
```typescript
- id: string (primary key)
- siftId: string (foreign key)
- userId: string (foreign key)
- status: 'in_progress' | 'completed'
- score: int
- startedAt, completedAt: timestamp
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 20+ (LTS recommended)
- **pnpm** 10.28.0+
- **PostgreSQL** 14+ database
- **Google Cloud Account** (for Gemini AI API)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/vxshta/sift.git
   cd sift
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up environment variables**
   
   Create `apps/web/.env` file:
   ```env
   # Database
   DATABASE_URL="postgresql://user:password@localhost:5432/sift"
   DATABASE_URL_UNPOOLED="postgresql://user:password@localhost:5432/sift"
   
   # Authentication
   BETTER_AUTH_SECRET="your-secret-key-min-32-chars"
   BETTER_AUTH_URL="http://localhost:3001"
   GOOGLE_OAUTH_CLIENT_ID="your-google-oauth-client-id"
   GOOGLE_OAUTH_CLIENT_SECRET="your-google-oauth-secret"
   
   # AI
   GOOGLE_GENERATIVE_AI_API_KEY="your-gemini-api-key"
   
   # Storage (Optional - for file uploads)
   CLOUDFLARE_R2_ACCOUNT_ID="your-r2-account-id"
   CLOUDFLARE_R2_ACCESS_KEY_ID="your-access-key"
   CLOUDFLARE_R2_SECRET_ACCESS_KEY="your-secret-key"
   CLOUDFLARE_R2_BUCKET_NAME="sift-uploads"
   NEXT_PUBLIC_R2_URL="https://your-bucket-url.r2.dev"
   ```

4. **Set up the database**
   ```bash
   # Push schema to database
   pnpm run db:push
   
   # Or run migrations
   pnpm run db:migrate
   ```

5. **Start the development server**
   ```bash
   pnpm run dev
   ```

6. **Open the application**
   
   Navigate to [http://localhost:3001](http://localhost:3001)

### Quick Setup with Docker (Optional)

```bash
# Start PostgreSQL with Docker
docker run -d \
  --name sift-postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=sift \
  -p 5432:5432 \
  postgres:16
```

---

## 📚 Documentation

### Available Scripts

| Command | Description |
|---------|-------------|
| `pnpm run dev` | Start all applications in development mode |
| `pnpm run dev:web` | Start only the web application |
| `pnpm run build` | Build all applications for production |
| `pnpm run check-types` | Type-check all packages |
| `pnpm run check` | Run Biome linter and formatter |
| `pnpm run db:push` | Push schema changes to database |
| `pnpm run db:studio` | Open Drizzle Studio (database GUI) |
| `pnpm run db:generate` | Generate new migration files |
| `pnpm run db:migrate` | Run pending migrations |

### Key API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/generate` | POST | Generate study plan or questions |
| `/api/sift/process` | POST | Process uploaded content |
| `/api/sift/[id]/status` | GET | Get sift status and results |
| `/api/notifications/action` | POST | Handle push notifications |
| `/api/auth/[...all]` | ALL | Better-Auth routes |

### Environment Variables Reference

<details>
<summary><b>Required Variables</b></summary>

- `DATABASE_URL` - PostgreSQL connection string (pooled)
- `DATABASE_URL_UNPOOLED` - PostgreSQL connection string (direct)
- `BETTER_AUTH_SECRET` - Secret key for auth (min 32 chars)
- `BETTER_AUTH_URL` - Base URL of your application
- `GOOGLE_GENERATIVE_AI_API_KEY` - Gemini API key

</details>

<details>
<summary><b>OAuth Variables</b></summary>

- `GOOGLE_OAUTH_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_OAUTH_CLIENT_SECRET` - Google OAuth client secret

</details>

<details>
<summary><b>Storage Variables (Optional)</b></summary>

- `CLOUDFLARE_R2_ACCOUNT_ID` - Cloudflare R2 account ID
- `CLOUDFLARE_R2_ACCESS_KEY_ID` - R2 access key
- `CLOUDFLARE_R2_SECRET_ACCESS_KEY` - R2 secret key
- `CLOUDFLARE_R2_BUCKET_NAME` - R2 bucket name
- `CLOUDFLARE_R2_ENDPOINT` - R2 endpoint URL
- `NEXT_PUBLIC_R2_URL` - Public R2 URL

</details>

---

## 🔧 Development

### Code Style

This project uses [Biome](https://biomejs.dev/) for linting and formatting:

```bash
# Check and auto-fix issues
pnpm run check

# The configuration follows these rules:
# - Tabs for indentation
# - Double quotes for strings
# - Organized imports
# - Sorted Tailwind classes
```

### Database Workflow

```bash
# Make changes to schema files in packages/db/src/schema/

# Generate migration
pnpm run db:generate

# Apply migration
pnpm run db:migrate

# Or push directly (for development)
pnpm run db:push

# Explore data with GUI
pnpm run db:studio
```

### Turborepo Caching

Turborepo caches build outputs for faster subsequent builds:
- Build outputs: `.next/`, `dist/`
- Cache location: `.turbo/`
- Cache is local by default (can be configured for remote caching)

---

## 🚢 Deployment

### Vercel (Recommended)

1. **Connect your GitHub repository** to Vercel
2. **Configure environment variables** in project settings
3. **Set build command**: `pnpm run build`
4. **Set output directory**: `apps/web/.next`
5. **Deploy** 🚀

### Docker Deployment

```dockerfile
# Coming soon - Dockerfile for containerized deployment
```

### Database Hosting

Recommended PostgreSQL hosting providers:
- [Neon](https://neon.tech/) - Serverless Postgres
- [Supabase](https://supabase.com/) - Open source Firebase alternative
- [Vercel Postgres](https://vercel.com/storage/postgres) - Integrated with Vercel
- [Railway](https://railway.app/) - Simple infrastructure

---

## 🗺️ Roadmap

### v2.0 - The Foundation ✅ (Current)
- [x] Authentication system (Google OAuth + Email)
- [x] Responsive PWA layout
- [x] Content ingestion (text, files)
- [x] AI-powered quiz generation
- [x] Basic mastery tracking (Echoes)
- [ ] Polished quiz interface

### v2.1 - The Deep Dive 🔄 (In Progress)
- [x] Learning Paths implementation
- [ ] Robust PDF/DOCX extraction
- [ ] Detailed performance analytics
- [ ] Spaced repetition scheduling
- [ ] Knowledge heatmap visualization

### v2.2 - The Community 📅 (Planned)
- [ ] Public Sift Packs (shareable study materials)
- [ ] Community-contributed content
- [ ] Social learning features
- [ ] Mobile app (React Native)

### v2.3 - Advanced Features 🔮 (Future)
- [ ] Audio transcription and processing
- [ ] Video content support
- [ ] Collaborative study sessions
- [ ] Advanced analytics and insights
- [ ] Multi-language support

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and follow the code style
4. **Run linting**: `pnpm run check`
5. **Test your changes** thoroughly
6. **Commit**: `git commit -m 'Add amazing feature'`
7. **Push**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Guidelines

- Follow the existing code style (Biome enforces this)
- Write meaningful commit messages
- Update documentation for significant changes
- Add comments for complex logic
- Test on both desktop and mobile viewports

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Built with [Better-T-Stack](https://github.com/AmanVarshney01/create-better-t-stack)
- Inspired by the science of active recall and spaced repetition
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [HugeIcons](https://hugeicons.com/)

---

## 📞 Contact & Support

- **GitHub Issues**: [Report bugs or request features](https://github.com/vxshta/sift/issues)
- **Discussions**: [Join the conversation](https://github.com/vxshta/sift/discussions)

---

<div align="center">

**[⬆ back to top](#-sift)**

Made with ❤️ by [Vashishta Mithra Reddy](https://github.com/vxshta/)

</div>
