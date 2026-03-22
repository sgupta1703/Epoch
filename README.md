# Epoch

Epoch is an AI-powered history classroom platform. Teachers create units with notes, historical persona chatbots, quizzes, and document-based assignments. Students work through each unit's activities and get instant AI feedback on their responses.

---

## Features

**For Teachers**
- Create classrooms with a shareable join code
- Build units with context that drives all AI generation
- Write or AI-generate notes for students
- Create historical personas that students can have conversations with
- Build quizzes with multiple choice, short answer, and essay questions — all AI-graded
- Build document-based assignments with primary and secondary sources
- Manually override AI short answer grades
- View per-student and class-wide performance dashboards
- Attach files (PDFs, images, documents) to unit notes

**For Students**
- Join classrooms via join code
- Work through Notes, Personas, Quiz, and Assignment tabs per unit
- Get instant feedback on quiz and assignment submissions
- See essay annotations with color-coded thesis, evidence, analysis, and counterclaim highlights
- Chat with AI historical figures (e.g. Machiavelli, Leonardo da Vinci)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| AI | Google Gemini 2.5 Flash |
| Frontend Hosting | Vercel |
| Backend Hosting | Render |

---

## Project Structure

```
/
├── src/                  # React frontend
│   ├── api/              # Axios API calls
│   ├── components/       # Shared components (Navbar, Sidebar, Modal, etc.)
│   ├── context/          # Auth context
│   ├── hooks/            # Custom hooks
│   ├── pages/
│   │   ├── auth/         # Login, Register
│   │   ├── teacher/      # Teacher dashboard, classroom, unit editor, quiz, assignment
│   │   └── student/      # Student dashboard, classroom, unit tabs
│   ├── styles/           # Global CSS
│   └── utils/            # Markdown renderer
└── backend/
    ├── src/
    │   ├── middleware/    # Auth, role checking
    │   ├── routes/        # Express route handlers
    │   └── services/      # Supabase client, Gemini AI service
    └── server.js
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project
- A Google Gemini API key

### Backend setup

```bash
cd backend
npm install
```

Create a `.env` file:
```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GEMINI_API_KEY=your_gemini_api_key
CLIENT_URL=http://localhost:5173
PORT=4000
```

```bash
node src/server.js
```

### Frontend setup

```bash
cd src
npm install
```

Create a `.env` file:
```
VITE_API_URL=http://localhost:4000
```

```bash
npm run dev
```

---

## Deployment

- **Frontend**: Deployed on Vercel. Set `VITE_API_URL` to your Render backend URL in Vercel environment variables.
- **Backend**: Deployed on Render. Set all backend environment variables in the Render dashboard. Set `CLIENT_URL` to your Vercel frontend URL.

> Note: the Render free tier spins down after inactivity. The first request after idle may take 30–60 seconds.

---

## Environment Variables

### Backend (Render)
| Variable | Description |
|----------|-------------|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `GEMINI_API_KEY` | Google Gemini API key |
| `CLIENT_URL` | Frontend URL (no trailing slash) |
| `PORT` | Port to run the server on (4000) |

### Frontend (Vercel)
| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | Backend URL (no trailing slash) |
