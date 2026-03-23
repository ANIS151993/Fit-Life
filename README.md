<div align="center">

# 🥗 FitLife — AI-Powered Nutrition & Fitness Platform

[![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_&_Firestore-FFCA28?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Cloudflare](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![n8n](https://img.shields.io/badge/n8n-Automation-EA4B71?style=for-the-badge&logo=n8n&logoColor=white)](https://n8n.io/)

**A full-stack AI nutrition and fitness platform with real-time food photo analysis, personalized diet plans, and custom workout programs — powered by a dual AI engine (Gemini + Ollama).**

[🌐 Live Demo](https://fitlife.marcbd.site) · [📊 Project Showcase](https://anis151993.github.io/Fit-Life/) · [🔧 n8n Workflows](https://github.com/ANIS151993/n8n)

---

<img src="https://img.shields.io/badge/Status-Production-brightgreen?style=flat-square" alt="Status" />
<img src="https://img.shields.io/badge/Cost-$0/month-blue?style=flat-square" alt="Cost" />
<img src="https://img.shields.io/badge/AI_Models-Gemini_+_Ollama-purple?style=flat-square" alt="AI" />

</div>

---

## 📸 What FitLife Does

| Feature | Description |
|---------|-------------|
| 🍕 **Food Photo Analysis** | Snap a meal photo → AI returns calories, macros, vitamins, allergens, and a quality score (1-10) |
| 🥑 **AI Diet Plans** | Enter your profile → get a personalized 7-day meal plan with recipes, prep times, and grocery hints |
| 💪 **AI Workout Plans** | Set your goals → receive a complete weekly exercise program with sets, reps, form tips, and recovery |
| 📊 **Live Dashboard** | Track daily calories, macros, weekly trends with interactive charts and progress rings |
| 🔗 **Linked Plans** | Generate a diet plan → a matching workout plan is auto-created (and vice versa) |

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CLOUDFLARE EDGE NETWORK                      │
│  fitlife.marcbd.site    n8n.marcbd.site    ollama.marcbd.site   │
└────────┬──────────────────────┬──────────────────────┬──────────┘
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│   VM 200        │   │   VM 101        │   │   VM 100        │
│  FITLIFE APP    │──▶│  n8n ENGINE     │──▶│  OLLAMA SERVER  │
│                 │   │                 │   │                 │
│  Next.js 15     │   │  6 AI Workflows │   │  llava:7b       │
│  React 19       │   │  KV Store       │   │  phi3:mini      │
│  Tailwind v4    │   │  Job Queue      │   │                 │
│  Firebase SDK   │   │                 │   │  CPU Inference   │
│                 │   │  Gemini API ◀───│   │  (No GPU needed) │
│  172.16.184.217 │   │  172.16.184.111 │   │  172.16.184.60  │
└────────┬────────┘   └─────────────────┘   └─────────────────┘
         │
         ▼
┌─────────────────┐
│   FIREBASE      │
│                 │
│  Authentication │
│  Firestore DB   │
│  Cloud Storage  │
└─────────────────┘
```

### Dual AI Engine

FitLife uses **two AI backends** for every feature, giving users a choice:

| Engine | Model | Speed | Cost | Use Case |
|--------|-------|-------|------|----------|
| ⚡ **Gemini** (Fast) | `gemini-2.5-flash-lite` | ~10-20s | Free tier | Quick results, high accuracy |
| 🌿 **Ollama** (Free) | `llava:7b` / `phi3:mini` | ~1-5 min | Self-hosted, $0 | Privacy-first, no API limits |

### Async Job Architecture

```
Client                    n8n                     AI Model
  │                        │                        │
  ├──POST /analyze-food────▶│                        │
  │  { image, jobId }      │                        │
  │                        ├──Process in background──▶│
  ◀──200 { submitted }─────│                        │
  │                        │                        │
  ├──GET /food-result──────▶│                        │
  │  ?jobId=xxx            │                        │
  ◀──{ status: processing }│                        │
  │                        │◀──Result───────────────│
  ├──GET /food-result──────▶│                        │
  ◀──{ status: done, ... }─│                        │
```

---

## 🛠️ Tech Stack

### Frontend
- **Next.js 15** — App Router, Server Components, Edge Runtime
- **React 19** — Latest with concurrent features
- **TypeScript 5** — Full type safety across the app
- **Tailwind CSS v4** — `@theme` system, custom properties, `@utility` directives
- **Recharts** — Interactive charts (AreaChart with gradient fill)
- **Lucide React** — Consistent icon system
- **Framer Motion** — Smooth page transitions

### Backend & Infrastructure
- **Firebase Auth** — Email/password + Google OAuth
- **Cloud Firestore** — Real-time database with `onSnapshot` listeners
- **n8n** — 6 self-hosted AI workflows (see [n8n repo](https://github.com/ANIS151993/n8n))
- **Ollama** — Self-hosted LLM inference (CPU-only, no GPU required)
- **Google Gemini API** — Vision + text models via free tier
- **Docker** — Containerized Ollama + n8n + KV store

### Deployment
- **Cloudflare Pages** — Auto-deploy on `git push`, global CDN, free SSL
- **Cloudflare Tunnels** — Secure access to self-hosted services (n8n, Ollama)
- **Proxmox VE** — 3 Ubuntu VMs across 2 physical servers

---

## 🚀 How I Built & Deployed This

### Phase 1 — Infrastructure (Proxmox VMs)
1. Provisioned 3 Ubuntu 22.04 VMs with static IPs on a `/22` subnet
2. Installed Docker on VM 100 (Ollama) and VM 101 (n8n)
3. Deployed Ollama with `llava:7b` (vision) and `phi3:mini` (text) — ~5GB models on CPU
4. Deployed n8n with encrypted credentials and custom KV store container

### Phase 2 — AI Workflows (n8n)
5. Built 6 webhook-based workflows: 3 Ollama + 3 Gemini (food/diet/workout)
6. Implemented async job queue with UUID-based polling (KV store with 30-min TTL)
7. Structured all AI outputs as strict JSON with `response_mime_type: application/json`
8. Added Plan Alignment — food analysis checks against your active diet plan

### Phase 3 — Frontend (Next.js)
9. Created Next.js 15 app with TypeScript, Tailwind v4, and Firebase
10. Built 8 pages: Landing, Login, Register, Dashboard, Food Log, Diet Plan, Workouts, Profile
11. Designed premium UI: glass morphism, gradient text, SVG progress rings, animated cards
12. Implemented real-time Firestore listeners for live dashboard updates

### Phase 4 — Deployment
13. Connected GitHub repo to Cloudflare Pages (auto-deploy on push)
14. Created Cloudflare Tunnels for n8n and Ollama (no public port exposure)
15. Configured Firebase Auth domains and Firestore security rules

**Total infrastructure cost: $0/month** (Cloudflare free tier + self-hosted AI + Firebase Spark plan)

---

## 📁 Project Structure

```
fitlife/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx          # Email + Google OAuth login
│   │   │   └── register/page.tsx       # Registration with profile creation
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # Sidebar nav + bottom tabs
│   │   │   ├── dashboard/page.tsx      # Calorie ring, macros, weekly chart
│   │   │   ├── food-log/page.tsx       # Photo upload + dual AI analysis
│   │   │   ├── diet-plan/page.tsx      # AI diet plan generator
│   │   │   ├── workouts/page.tsx       # AI workout plan generator
│   │   │   └── profile/page.tsx        # User profile management
│   │   ├── api/
│   │   │   ├── analyze-food/route.ts   # Edge proxy to n8n food webhook
│   │   │   ├── generate-diet/route.ts  # Edge proxy to n8n diet webhook
│   │   │   └── generate-workout/route.ts
│   │   ├── layout.tsx                  # Root layout + AuthProvider
│   │   ├── page.tsx                    # Landing page
│   │   └── globals.css                 # Design system (glass, gradients, anims)
│   ├── components/
│   │   └── ui/
│   │       ├── Logo.tsx                # Gradient brand logo
│   │       ├── Footer.tsx              # Copyright footer
│   │       └── ProgressRing.tsx        # SVG animated progress ring
│   ├── contexts/
│   │   └── AuthContext.tsx             # Firebase Auth context
│   ├── lib/
│   │   ├── firebase.ts                # Firebase app initialization
│   │   ├── firestore.ts               # All Firestore CRUD operations
│   │   └── n8n.ts                     # n8n webhook client functions
│   └── types/
│       └── index.ts                   # Full TypeScript interfaces
├── next.config.ts
├── tailwind.config.ts
├── wrangler.toml                      # Cloudflare Pages config
└── package.json
```

---

## 🏃 Running Locally

```bash
# Clone
git clone https://github.com/ANIS151993/Fit-Life.git
cd Fit-Life

# Install
npm install

# Set up environment
cp .env.example .env.local
# Fill in Firebase + n8n webhook URLs

# Run
npm run dev
# → http://localhost:3000
```

---

## 📜 License & Copyright

**© 2024-2026 [Md Anisur Rahman Chowdhury](https://marcbd.site), Gannon University**

This project was developed as a comprehensive full-stack AI application demonstrating:
- Multi-VM infrastructure orchestration
- Self-hosted AI model deployment (Ollama)
- Cloud AI integration (Google Gemini)
- Workflow automation (n8n)
- Modern React/Next.js development
- Production deployment on Cloudflare edge network

---

<div align="center">

**Built with ❤️ by [Md Anisur Rahman Chowdhury](https://marcbd.site)**

*Gannon University*

[![Portfolio](https://img.shields.io/badge/Portfolio-marcbd.site-10b981?style=for-the-badge&logo=google-chrome&logoColor=white)](https://marcbd.site)
[![GitHub](https://img.shields.io/badge/GitHub-ANIS151993-181717?style=for-the-badge&logo=github)](https://github.com/ANIS151993)

</div>
