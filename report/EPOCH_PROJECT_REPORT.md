# Epoch — Comprehensive Project Report

> *An AI-powered history education platform for teachers and students*

---

## Table of Contents

1. [Product Overview](#1-product-overview)
   - 1.1 [Executive Summary](#11-executive-summary)
   - 1.2 [Core Concept & Vision](#12-core-concept--vision)
   - 1.3 [User Roles & Personas](#13-user-roles--personas)
   - 1.4 [Feature Matrix](#14-feature-matrix)
   - 1.5 [User Journeys](#15-user-journeys)
   - 1.6 [Classroom Lifecycle](#16-classroom-lifecycle)
   - 1.7 [AI-Powered Activities Overview](#17-ai-powered-activities-overview)

2. [Technical Architecture](#2-technical-architecture)
   - 2.1 [Tech Stack](#21-tech-stack)
   - 2.2 [System Architecture Diagram](#22-system-architecture-diagram)
   - 2.3 [Frontend Architecture](#23-frontend-architecture)
   - 2.4 [Backend Architecture](#24-backend-architecture)
   - 2.5 [Database Schema](#25-database-schema)
   - 2.6 [API Reference](#26-api-reference)
   - 2.7 [AI Integration Deep Dive](#27-ai-integration-deep-dive)
   - 2.8 [Authentication & Security](#28-authentication--security)
   - 2.9 [File Storage & Uploads](#29-file-storage--uploads)
   - 2.10 [Deployment Architecture](#210-deployment-architecture)
   - 2.11 [Settings System](#211-settings-system)

3. [Future Plans & Roadmap](#3-future-plans--roadmap)
   - 3.1 [Near-Term Enhancements](#31-near-term-enhancements)
   - 3.2 [Medium-Term Features](#32-medium-term-features)
   - 3.3 [Long-Term Vision](#33-long-term-vision)
   - 3.4 [Technical Debt & Refactoring](#34-technical-debt--refactoring)
   - 3.5 [Scale Considerations](#35-scale-considerations)

---

---

# 1. Product Overview

---

## 1.1 Executive Summary

**Epoch** is a full-stack, AI-powered educational platform purpose-built for history classrooms. It bridges the gap between traditional history instruction and modern AI capabilities by giving teachers a suite of AI-assisted content creation tools, and students a rich set of interactive learning activities — all within a single, cohesive platform.

The platform is built around a **unit-based curriculum model**: teachers create classrooms, organize content into units (e.g. "The American Civil War", "World War I"), and populate each unit with four types of activities:

| Activity | Teacher Experience | Student Experience |
|---|---|---|
| **Notes** | AI-generates structured markdown notes from a topic description | Reads formatted, AI-authored lesson notes |
| **Personas** | Creates historical figures with backstory, era, and location | Chats with the character in a live AI conversation |
| **Quizzes** | Generates MC, short-answer, and essay questions; sees AI-graded results | Answers questions, gets instant scored feedback |
| **Assignments** | Generates a full DBQ (document-based question) with sources | Reads primary/secondary sources, answers questions |

Every piece of content — from the notes to the persona dialogue to the quiz questions to the grading — is powered by **Google Gemini 2.5 Flash**, with teacher-configurable AI behavior (tone, creativity, reading level, etc.).

---

## 1.2 Core Concept & Vision

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│   TEACHER creates context  →  AI generates everything  →           │
│   STUDENT interacts        →  AI grades and analyzes   →           │
│   TEACHER reviews results  →  AI explains performance              │
│                                                                     │
│   One input. Infinite classroom content.                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

The fundamental insight behind Epoch is that **a teacher's greatest asset is domain knowledge** — knowing what to teach — and their greatest constraint is **time**. Epoch lets a teacher describe a unit topic in a paragraph and instantly have:

- Structured, curriculum-ready lesson notes
- A set of historically authentic persona chatbots for Socratic dialogue
- Multiple quizzes with mixed question types
- A full document-based question assignment with primary and secondary sources
- An interactive visual timeline of all events across the course
- AI-driven performance analysis on every student submission

The platform deliberately follows the **separation of content creation (teacher) from AI generation**, meaning teachers retain full editorial control — they can edit or discard any AI-generated content before publishing to students.

---

## 1.3 User Roles & Personas

### Two Core Roles

```
┌──────────────────────────────┐    ┌──────────────────────────────┐
│         TEACHER              │    │         STUDENT              │
│                              │    │                              │
│  • Creates classrooms        │    │  • Joins via 6-char code     │
│  • Builds units + context    │    │  • Sees visible units only   │
│  • Triggers AI generation    │    │  • Reads notes               │
│  • Edits and curates content │    │  • Chats with personas       │
│  • Controls visibility       │    │  • Takes quizzes             │
│  • Reviews student results   │    │  • Submits assignments       │
│  • Overrides AI grades       │    │  • Gets instant AI feedback  │
│  • Uses Mr. Curator AI       │    │  • Sees own scores only      │
│  • Views analytics           │    │                              │
└──────────────────────────────┘    └──────────────────────────────┘
```

### Teacher Workflow Summary

A typical teacher on Epoch follows this flow:

1. **Register** as a teacher → automatically gets a unique classroom creation panel
2. **Create a Classroom** (e.g. "AP US History — Period 3") → receives a 6-character join code
3. **Create Units** with a title and a context paragraph (the AI's source material)
4. **Generate content** for each unit (notes, personas, quizzes, assignment) with one click
5. **Edit and curate** the generated content before publishing
6. **Set visibility** per unit — unpublished units are invisible to students
7. **Monitor student submissions** through the Course Performance dashboard
8. **Override grades** or request AI analysis per student as needed

### Student Workflow Summary

1. **Register** as a student → lands on classroom list
2. **Join a classroom** with the teacher's join code
3. **Browse visible units** in their enrolled classrooms
4. **Complete activities** (notes → persona chat → quiz → assignment) in any order
5. **Receive instant feedback** on quiz and assignment submissions from Gemini
6. **Review results** showing per-question breakdowns, correct answers, and AI feedback

---

## 1.4 Feature Matrix

### Core Feature Availability by Role

| Feature | Teacher | Student |
|---|:---:|:---:|
| Create / manage classrooms | ✅ | ❌ |
| Join classroom via code | ❌ | ✅ |
| Create / edit units | ✅ | ❌ |
| Control unit visibility | ✅ | ❌ |
| Generate notes (AI) | ✅ | ❌ |
| Read notes | ✅ | ✅ |
| Create / edit personas | ✅ | ❌ |
| Chat with personas | ❌ | ✅ |
| Create / edit quizzes | ✅ | ❌ |
| Generate quiz questions (AI) | ✅ | ❌ |
| Take quizzes | ❌ | ✅ |
| View all quiz results | ✅ | ❌ |
| View own quiz results | ❌ | ✅ |
| Override short-answer grades | ✅ | ❌ |
| Create / edit assignments | ✅ | ❌ |
| Generate DBQ sources + questions (AI) | ✅ | ❌ |
| Submit assignment | ❌ | ✅ |
| View all assignment results | ✅ | ❌ |
| AI student performance analysis | ✅ | ❌ |
| View / edit class timeline | ✅ | ✅ (read) |
| Generate timeline (AI) | ✅ | ❌ |
| Upload files to units | ✅ | ❌ |
| View class performance dashboard | ✅ | ❌ |
| Mr. Curator AI assistant | ✅ | ❌ |
| Customize AI settings | ✅ | ✅ |
| Remove students from classroom | ✅ | ❌ |

### Quiz Question Types

| Type | Auto-Graded | AI-Graded | Teacher Override |
|---|:---:|:---:|:---:|
| Multiple Choice | ✅ | ❌ | ❌ |
| Short Answer | Partial | ✅ (0/25/50/75/100) | ✅ |
| Essay | ❌ | ✅ (4-dimension rubric) | ❌ |

### Assignment Question Types

| Type | Auto-Graded | AI-Graded | Teacher Override |
|---|:---:|:---:|:---:|
| Multiple Choice | ✅ | ❌ | ❌ |
| Short Answer | Partial | ✅ | ✅ |
| Essay (DBQ) | ❌ | ✅ | ❌ |

---

## 1.5 User Journeys

### Teacher Journey — Creating a Unit from Scratch

```
[Dashboard] → Create Classroom
     │
     ▼
[Classroom View] → Create Unit ("World War I")
     │         Enter context: "WWI 1914-1918, causes (MAIN),
     │          major battles, US entry, Treaty of Versailles"
     ▼
[Unit Editor] ─────┬──────────────────────────────────────────┐
                   │                                          │
              [Notes Tab]                              [Personas Tab]
              Click "Generate"                        Create "Archduke Franz Ferdinand"
              AI writes structured notes              Set: Austria, 1914
                   │                                  Create "Woodrow Wilson"
                   ▼                                  Set: USA, 1913-1921
              Edit/approve                                    │
                                                      [Quiz Tab]
                                                      Create quiz "WWI Causes"
                                                      Generate 10 questions
                                                      Review and edit questions
                                                             │
                                                      [Assignment Tab]
                                                      Generate DBQ: 3 sources, 5 questions
                                                      Review sources + questions
                                                             │
                                                             ▼
                                                    Toggle Unit Visibility → ON
                                                    Students can now see unit
```

### Student Journey — Working Through a Unit

```
[Student Dashboard] → Click classroom → Click unit
         │
         ▼
  ┌──────┴────────────────────────────────────────────────┐
  │                     UNIT TABS                         │
  │                                                       │
  │  [Notes]      [Personas]    [Quiz]      [Assignment]  │
  │  Read AI-     Chat with     Select      Read sources  │
  │  generated    Franz         "WWI        Answer DBQ    │
  │  notes        Ferdinand     Causes"     questions     │
  │               or Wilson     Answer 10   Essay graded  │
  │               3+ turns      questions   on 4 rubric   │
  │               to complete   MC+SA+Essay dimensions    │
  │                             scored                    │
  └───────────────────────────────────────────────────────┘
           │                │              │
           ▼                ▼              ▼
      No submission    Conversation    Score + per-question
      tracked          saved + turns   AI feedback shown
                       counted         immediately
```

---

## 1.6 Classroom Lifecycle

```
                          ┌─────────────┐
                          │   TEACHER   │
                          │  registers  │
                          └──────┬──────┘
                                 │
                    ┌────────────▼────────────┐
                    │     CREATE CLASSROOM     │
                    │  name + join code        │
                    └────────────┬────────────┘
                                 │
                    ┌────────────▼────────────┐
                    │      CREATE UNITS        │
                    │  title + context text    │
                    └────────────┬────────────┘
                                 │
              ┌──────────────────┼──────────────────┐
              ▼                  ▼                   ▼
       ┌──────────┐       ┌──────────┐        ┌──────────┐
       │  NOTES   │       │ PERSONAS │        │  QUIZ    │
       │ Generate │       │ Create + │        │ Create + │
       │  + Edit  │       │  Chat AI │        │ Generate │
       └──────────┘       └──────────┘        └──────────┘
                                                    │
                                          ┌─────────▼──────────┐
                                          │    ASSIGNMENT       │
                                          │  Generate DBQ       │
                                          └─────────┬──────────┘
                                                    │
                                  ┌─────────────────▼──────────────────┐
                                  │         PUBLISH UNIT                │
                                  │   Toggle visibility = ON            │
                                  └─────────────────┬──────────────────┘
                                                    │
                           ┌────────────────────────▼────────────────────────┐
                           │               STUDENTS JOIN & WORK               │
                           │  read notes → chat personas → quiz → assignment  │
                           └────────────────────────┬────────────────────────┘
                                                    │
                           ┌────────────────────────▼────────────────────────┐
                           │           TEACHER REVIEWS RESULTS               │
                           │  CourseQuizResults → per-student → AI analysis  │
                           └─────────────────────────────────────────────────┘
```

---

## 1.7 AI-Powered Activities Overview

### Activity 1 — Notes

The teacher clicks **Generate Notes** in the Notes tab. Epoch sends the unit title and context paragraph to Gemini with structured instructions to produce markdown notes covering:

- Overview paragraph
- Historical Background
- Key Figures (formatted with names + roles)
- Chronological Timeline
- Causes & Effects analysis
- Historical Significance & Legacy

The teacher can then freely edit the markdown in a live editor before saving.

### Activity 2 — Persona Chat

The teacher creates a persona by specifying:
- **Name** (e.g. "Harriet Tubman")
- **Description** (background, beliefs, key events)
- **Year Start / Year End** (active period)
- **Location** (geographic context)
- **Minimum Turns** (ensures substantive conversations — default 5)
- **Optional emoji** for avatar

When a student opens the persona, they enter a chat interface. Every student message is sent to Gemini with the persona description + unit context injected as a system prompt. The model is instructed to:
- Stay strictly in character
- Include real historical details and dates in responses
- Keep responses to 1-2 paragraphs
- Never break character or reveal it is an AI
- Reference the teacher's customized AI tone settings

Conversations are persisted per (persona, student) pair and the turn count tracked. When `turn_count >= min_turns`, the conversation is marked `completed`.

### Activity 3 — Quizzes

Multiple quizzes can exist per unit, each with its own:
- **Name**
- **Focus context** (optional — narrows AI generation to specific sub-topics)
- **Due date**

Questions can be **AI-generated** (teacher specifies a count) or **manually written**. Three question types:

**Multiple Choice** — 4 options (A–D), correct answer stored, auto-graded on submit.

**Short Answer** — Gemini grades with scores at `0 / 25 / 50 / 75 / 100` with written feedback explaining the score and correct concept.

**Essay** — Gemini grades on a 4-dimension rubric:
| Dimension | Points |
|---|:---:|
| Thesis | /25 |
| Evidence | /25 |
| Analysis | /25 |
| Counterclaim | /25 |
| **Total** | **/100** |

Gemini also returns a **tagged essay response** with inline markers highlighting each dimension (e.g. `[[thesis]] ... [[/thesis]]`). An optional **Essay Guide** toggle shows students the color-coded rubric key.

### Activity 4 — Assignments (DBQ)

The teacher specifies how many sources (primary + secondary documents) and how many questions to generate. Gemini produces:
- Realistic historical sources with titles, content, and `primary` or `secondary` type tags
- Questions that explicitly reference the sources (citing "According to Source 1…")
- Mixed question types (MC for comprehension, SA and essay for analysis)

Students read the sources in a side panel and answer the questions. Grading follows the same pipeline as quizzes (auto for MC, AI for SA/essay).

---

---

# 2. Technical Architecture

---

## 2.1 Tech Stack

### Full Stack at a Glance

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | React | 19.2.0 | UI component library |
| **Frontend Build Tool** | Vite | 7.3.1 | Dev server, bundling, HMR |
| **Frontend Routing** | React Router DOM | 7.13.1 | Client-side routing |
| **HTTP Client** | Axios | 1.13.6 | API requests + token refresh |
| **Icons** | Lucide React | 0.577.0 | SVG icon set |
| **Date Picker** | React DatePicker | 9.1.0 | Styled calendar input |
| **Backend Runtime** | Node.js | LTS | Server runtime |
| **Backend Framework** | Express | 4.19.2 | HTTP server + routing |
| **Database** | Supabase (PostgreSQL) | 2.43.0 SDK | Data persistence |
| **Auth** | Supabase Auth | — | JWT-based authentication |
| **File Storage** | Supabase Storage | — | Unit file uploads |
| **AI Model** | Google Gemini 2.5 Flash | 0.24.1 SDK | All AI generation + grading |
| **File Uploads** | Multer | 2.1.1 | Multipart form parsing |
| **Frontend Host** | Vercel | — | Static + SPA hosting |
| **Backend Host** | Render | — | Node.js web service |
| **Database Host** | Supabase Cloud | — | Managed PostgreSQL |

### Why This Stack?

```
Supabase    → Eliminates need for custom auth infrastructure.
              Row-level security, storage, and real-time out of the box.
              Free tier generous for MVP scale.

Gemini 2.5  → Best-in-class instruction following for structured JSON output.
              Function-calling support for Mr. Curator assistant tool use.
              Fast response times critical for grading UX.

Vite        → Near-instant dev server startup with React 19.
              Production builds are lean and highly optimized.

Render      → Simple deployment from GitHub. Free tier adequate for
              low-traffic educational platform.

React 19    → Latest React with concurrent features and improved
              hydration for SSR compatibility if needed later.
```

---

## 2.2 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           CLIENT LAYER                              │
│                                                                     │
│   ┌──────────────────────────────────────────────────────────┐     │
│   │                   React SPA (Vercel)                      │     │
│   │                                                          │     │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────┐  │     │
│   │  │  Teacher │  │ Student  │  │  Auth    │  │Landing │  │     │
│   │  │  Pages   │  │  Pages   │  │  Pages   │  │  Page  │  │     │
│   │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────────┘  │     │
│   │       │             │             │                      │     │
│   │  ┌────▼─────────────▼─────────────▼──────────────────┐  │     │
│   │  │         Axios Instance (Bearer token + refresh)    │  │     │
│   │  └────────────────────────┬──────────────────────────┘  │     │
│   └───────────────────────────┼──────────────────────────────┘     │
└───────────────────────────────┼──────────────────────────────────────┘
                                │ HTTPS REST API
┌───────────────────────────────▼──────────────────────────────────────┐
│                          API LAYER (Render)                          │
│                                                                      │
│   ┌──────────────────────────────────────────────────────────────┐  │
│   │               Express Server (Node.js)                        │  │
│   │                                                              │  │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐  │  │
│   │  │   Auth   │  │  Route   │  │ Require  │  │  CORS      │  │  │
│   │  │Middleware│  │ Handlers │  │  Role    │  │  Config    │  │  │
│   │  └────┬─────┘  └────┬─────┘  └──────────┘  └────────────┘  │  │
│   │       │             │                                        │  │
│   │  ┌────▼─────────────▼────────────────────┐                  │  │
│   │  │          Business Logic / Services     │                  │  │
│   │  │                                        │                  │  │
│   │  │  ┌────────────┐    ┌────────────────┐  │                  │  │
│   │  │  │ Supabase   │    │  Gemini AI     │  │                  │  │
│   │  │  │  Client    │    │  Service       │  │                  │  │
│   │  │  └─────┬──────┘    └───────┬────────┘  │                  │  │
│   │  └────────┼───────────────────┼────────────┘                  │  │
│   └───────────┼───────────────────┼────────────────────────────────┘  │
└───────────────┼───────────────────┼──────────────────────────────────┘
                │                   │
       ┌────────▼────────┐  ┌───────▼───────┐
       │   Supabase       │  │  Google       │
       │   Cloud          │  │  Gemini API   │
       │                  │  │               │
       │  ┌────────────┐  │  │  gemini-2.5   │
       │  │ PostgreSQL  │  │  │  -flash       │
       │  │  Database   │  │  │               │
       │  └────────────┘  │  └───────────────┘
       │  ┌────────────┐  │
       │  │  Storage   │  │
       │  │  (files)   │  │
       │  └────────────┘  │
       │  ┌────────────┐  │
       │  │  Auth JWT  │  │
       │  │  Service   │  │
       │  └────────────┘  │
       └──────────────────┘
```

---

## 2.3 Frontend Architecture

### Application Entry & Routing

The application bootstraps from `main.jsx` → `App.jsx`. Routing is handled by React Router DOM v7 with protected route components that gate pages by authentication state and user role.

```
App.jsx
│
├── AuthProvider (Context)
│   └── SettingsEffects (applies user preferences to DOM)
│
└── Router
    ├── / .................... Landing (public)
    ├── /login ............... Login (public)
    ├── /register ............ Register (public)
    │
    ├── /teacher ............. TeacherDashboard (role=teacher)
    ├── /teacher/settings .... SettingsPage (role=teacher)
    ├── /teacher/classroom/:id ........ ClassroomView
    └── /teacher/classroom/:id/unit/:id UnitEditor
        ├── Tab: Notes ........ NotesEditor
        ├── Tab: Personas ..... PersonasEditor
        ├── Tab: Quiz ......... QuizEditor
        └── Tab: Assignment ... AssignmentEditor
    │
    ├── /student ............. StudentDashboard (role=student)
    ├── /student/settings .... SettingsPage (role=student)
    ├── /student/classroom/:id ........ StudentClassroom
    └── /student/classroom/:id/unit/:id StudentUnit
        ├── Tab: Notes ........ NotesView
        ├── Tab: Personas ..... PersonaChat
        ├── Tab: Quiz ......... QuizView
        └── Tab: Assignment ... AssignmentView
```

### Component Hierarchy

```
Layout Components
├── Navbar          — top bar, breadcrumbs, user avatar/menu, logout
├── Sidebar         — left nav, classroom list, unit list (role-aware)
├── Modal           — generic modal shell with ModalActions footer
└── LoadingSpinner  — spinners (full-page, inline, small sizes)

Shared Feature Components
├── AppDatePicker   — react-datepicker wrapper with app theme styles
├── EssayGuide      — color-coded rubric legend for essay questions
├── EpochArchivist  — animated AI assistant panel
├── SettingsEffects — reads user settings, applies CSS vars / classes to body
├── TimelineVisualization — visual timeline of classroom events
└── UnitCard        — unit summary card for classroom/student views

Teacher Pages
├── TeacherDashboard   — classroom grid, create/delete classrooms
├── ClassroomView      — unit list, student management, analytics modal, timeline
├── UnitEditor         — tabbed editor (NotesEditor, PersonasEditor, QuizEditor, AssignmentEditor)
├── CourseQuizResults  — class performance modal (overview + per-student detail)
└── SettingsPage       — AI and view preference controls

Student Pages
├── StudentDashboard   — enrolled classrooms list
├── StudentClassroom   — visible units list
├── StudentUnit        — unit tab shell
├── NotesView          — render markdown notes read-only
├── PersonaChat        — real-time persona conversation UI
├── QuizView           — quiz list → take quiz → results view
└── AssignmentView     — DBQ sources + questions + submission UI
```

### State Management

Epoch uses React's built-in state primitives throughout — no external state manager (Redux, Zustand, etc.) is used. The architecture relies on:

| Pattern | Usage |
|---|---|
| `useState` | Component-local UI state (form values, loading flags, open/closed panels) |
| `useEffect` | Data fetching on mount or dependency change |
| `useReducer` | Complex state machines (quiz taking flow, persona chat) |
| `useMemo` | Derived values (filtered rows, computed averages in CourseQuizResults) |
| `useContext` / `AuthContext` | Global auth state (user object, role, token management) |
| `useRef` | DOM refs for scroll-to-bottom in chat, file input triggers |
| Custom hooks | `useAuth()`, `useClassroom()`, `useSettings()` |

### Auth Context Flow

```
AuthContext.jsx
│
├── State: { user, role, loading, isAuthenticated }
│
├── On mount:
│   └── Read token from localStorage
│       → call GET /api/auth/me
│       → populate user state
│
├── On login:
│   └── store { access_token, refresh_token } to localStorage
│       → set user state
│
├── On 401 (axios interceptor):
│   └── POST /api/auth/refresh with refresh_token
│       → store new access_token
│       → retry original request
│
└── On logout:
    └── clear localStorage
        → reset user state
        → navigate to /login
```

### CSS Architecture

| File | Scope |
|---|---|
| `src/index.css` | Global resets |
| `src/styles/pages.css` | Shared layout, `.field`, `.btn`, `.alert`, `.card`, date picker |
| `src/components/Navbar.css` | `:root` CSS variables (--rust, --gold, --ink, --muted, --border, --font-display, --font-body) |
| `src/components/Modal.css` | Modal overlay + body styles |
| `src/pages/teacher/Teacher.css` | All teacher-side component styles (quiz builder, meta panel, results, analysis) |
| `src/pages/student/Student.css` | Student-side styles (persona chat, quiz taking, assignment view) |
| `src/components/AppDatePicker.css` | Calendar popup custom theming |

---

## 2.4 Backend Architecture

### Server Setup

The Express server (`server.js`) is configured with:

```
Middleware Stack (in order)
│
├── express.json({ limit: '5mb' })    — JSON body parsing
├── express.urlencoded()              — Form body parsing
├── cors(corsOptions)                 — Allowed origins from CLIENT_URLS env
│
├── Route Mounts:
│   ├── /api/auth        → auth.js
│   ├── /api/classrooms  → classrooms.js
│   ├── /api/units       → units.js  (also handles /api/classrooms/:id/units)
│   ├── /api/units/:id/notes      → notes.js
│   ├── /api/units/:id/personas   → personas.js
│   ├── /api/personas/:id         → personas.js
│   ├── /api/units/:id/quizzes    → quiz.js
│   ├── /api/units/:id/assignment → assignments.js
│   ├── /api/units/:id/files      → files.js
│   ├── /api/classrooms/:id/timeline → timeline.js
│   ├── /api/assistant   → assistant.js
│   └── /api/settings    → settings.js
│
└── GET /api/health      → { status: 'ok' }
```

### Middleware Pipeline

```
Incoming Request
       │
       ▼
   CORS Check ──(fail)──► 403
       │
       ▼
  Body Parser
       │
       ▼
 Route Matched?  ──(no)──► 404
       │
       ▼
  authenticate(req, res, next)
  │  ├── Read Authorization: Bearer <token>
  │  ├── supabase.auth.getUser(token)
  │  ├── Load profile from profiles table
  │  └── Attach req.user = { id, email, role, display_name }
       │
       ▼
  requireRole('teacher') [on teacher-only routes]
  │  └── req.user.role !== 'teacher' → 403
       │
       ▼
  Route Handler
  │  ├── Business logic
  │  ├── supabase queries
  │  └── Gemini AI calls (where applicable)
       │
       ▼
  JSON Response
```

### Directory Structure (Backend)

```
backend/
├── src/
│   ├── middleware/
│   │   ├── authenticate.js    — JWT verification + profile load
│   │   └── requireRole.js     — Role-based access guard
│   ├── routes/
│   │   ├── auth.js            — 4 auth endpoints
│   │   ├── classrooms.js      — 10 classroom endpoints
│   │   ├── units.js           — 7 unit endpoints
│   │   ├── notes.js           — 3 notes endpoints
│   │   ├── personas.js        — 6 persona endpoints
│   │   ├── quiz.js            — 12 quiz endpoints
│   │   ├── assignments.js     — 8 assignment endpoints
│   │   ├── files.js           — 3 file endpoints
│   │   ├── timeline.js        — 6 timeline endpoints
│   │   ├── assistant.js       — 2 assistant endpoints
│   │   └── settings.js        — 3 settings endpoints
│   ├── services/
│   │   ├── supabaseClient.js  — Supabase admin client
│   │   ├── claude.js          — All Gemini AI functions
│   │   └── userSettings.js    — Settings merge + AI instruction builder
│   └── server.js              — App entry, middleware, route mount
└── package.json
```

---

## 2.5 Database Schema

### Entity Relationship Diagram

```
profiles ──────────────────────────────────────────────────────────────
  id (uuid, PK)
  email (text)
  display_name (text)
  role (teacher | student)
  created_at
     │
     │ teacher_id
     ▼
classrooms ────────────────────────────────────────────────────────────
  id (uuid, PK)
  teacher_id (FK → profiles.id)
  name (text)
  join_code (text, UNIQUE)
  created_at
     │                                                   │
     │ classroom_id                                       │
     ▼                                          classroom_students ─────
classroom_students                               classroom_id (FK)
  classroom_id (FK → classrooms.id)              student_id (FK)
  student_id (FK → profiles.id)                  joined_at
  joined_at

units ────────────────────────────────────────────────────────────────
  id (uuid, PK)
  classroom_id (FK → classrooms.id)
  title (text)
  context (text) ◄── teacher's paragraph description
  is_visible (boolean, default false)
  due_date (date)
  order_index (integer)
  created_at
     │
     ├─────────────────────────────────────────────────────────────────
     │            │                │                │
     ▼            ▼                ▼                ▼
  notes        personas          quizzes        assignments
  unit_id      unit_id           unit_id        unit_id
  content      name              name           id
  generated_at description       context        due_date
  due_date     min_turns         due_date       essay_guide_enabled
               year_start        essay_guide_   │
               year_end          enabled        ├── assignment_sources
               location          │              │   assignment_id
               due_date          ├── quiz_questions  title
                                 │   quiz_id         content
                                 │   question_text   source_type
                                 │   type            format
                                 │   options[]       order_index
                                 │   correct_answer  │
                                 │   order_index     └── assignment_questions
                                 │                       assignment_id
                                 ├── quiz_submissions    question_text
                                 │   quiz_id             type
                                 │   student_id          options[]
                                 │   answers[]           correct_answer
                                 │   score               order_index
                                 │   mc_results[]
                                 │   sa_feedback[]   assignment_submissions
                                 │   essay_feedback[]    assignment_id
                                 │                       student_id
                                 └── conversations        answers[]
                                     persona_id           score
                                     student_id           mc_results[]
                                     messages[]           sa_feedback[]
                                     turn_count           essay_feedback[]
                                     completed
```

### Table Reference

#### `profiles`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK, FK → auth.users |
| email | text | Unique |
| display_name | text | Shown throughout UI |
| role | text | `teacher` or `student` |
| created_at | timestamptz | Auto |

#### `classrooms`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| teacher_id | uuid | FK → profiles |
| name | text | Display name |
| join_code | text | Unique 6-char code students use to enroll |
| created_at | timestamptz | Auto |

#### `units`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| classroom_id | uuid | FK → classrooms |
| title | text | e.g. "The American Civil War" |
| context | text | Teacher's description — AI source material |
| is_visible | boolean | Default false. Controls student access |
| due_date | date | Optional unit deadline |
| order_index | integer | For drag-to-reorder |
| created_at | timestamptz | Auto |

#### `quizzes`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| unit_id | uuid | FK → units |
| name | text | Default "Quiz" |
| context | text | Optional quiz-specific focus for AI generation |
| due_date | date | Optional |
| essay_guide_enabled | boolean | Shows rubric color key to students |
| created_at | timestamptz | Auto |

#### `quiz_questions`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| quiz_id | uuid | FK → quizzes |
| question_text | text | The question |
| type | text | `multiple_choice`, `short_answer`, `essay` |
| options | jsonb | Array of 4 strings (MC only) |
| correct_answer | text | For MC auto-grading |
| order_index | integer | Display order |

#### `quiz_submissions`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| quiz_id | uuid | FK → quizzes |
| student_id | uuid | FK → profiles |
| answers | jsonb | `[{ question_id, answer }]` |
| score | integer | 0-100, computed on submit |
| submitted_at | timestamptz | Auto |
| mc_results | jsonb | `[{ question_id, correct, correct_answer }]` |
| sa_feedback | jsonb | `[{ question_id, score, feedback, teacher_graded }]` |
| essay_feedback | jsonb | `[{ question_id, score, feedback, breakdown, tagged_essay }]` |

#### `personas`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| unit_id | uuid | FK → units |
| name | text | Historical figure name |
| description | text | Background for AI system prompt |
| min_turns | integer | Minimum conversation turns. Default 5 |
| year_start | integer | Active period start |
| year_end | integer | Active period end |
| location | text | Geographic context |
| due_date | date | Optional |
| created_at | timestamptz | Auto |

#### `conversations`
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| persona_id | uuid | FK → personas |
| student_id | uuid | FK → profiles |
| messages | jsonb | `[{ role: 'user'|'model', content }]` |
| turn_count | integer | User turns completed |
| completed | boolean | `turn_count >= persona.min_turns` |
| updated_at | timestamptz | Updated on every message |

#### `timelines` / `timeline_events`
| Column | Type | Notes |
|---|---|---|
| timeline.classroom_id | uuid | One per classroom |
| event.date_label | text | Human-readable date |
| event.date_sort | integer | Year integer for sorting |
| event.category | text | Politics / War / Culture / etc. |
| event.unit_id | uuid | Optional link to unit |

#### `user_settings`
| Column | Type | Notes |
|---|---|---|
| user_id | uuid | PK, FK → profiles |
| view_settings | jsonb | UI preferences |
| ai_settings | jsonb | AI behavior preferences |
| updated_at | timestamptz | Auto |

---

## 2.6 API Reference

### Authentication Routes (`/api/auth`)

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/register` | None | Create account with email, password, display_name, role |
| POST | `/login` | None | Authenticate, return access_token + refresh_token |
| POST | `/refresh` | Refresh token | Rotate access token |
| GET | `/me` | Bearer | Get authenticated user profile |

### Classroom Routes (`/api/classrooms`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | Any | List user's classrooms |
| POST | `/` | Teacher | Create classroom |
| GET | `/:id` | Any | Get single classroom |
| PATCH | `/:id` | Teacher | Update classroom name |
| DELETE | `/:id` | Teacher | Delete classroom + all data |
| POST | `/join` | Student | Enroll via join code |
| GET | `/:id/students` | Teacher | List enrolled students |
| DELETE | `/:id/students/:studentId` | Teacher | Remove student + wipe their data |
| GET | `/:id/performance` | Teacher | Class-wide analytics |
| GET | `/:id/students/:studentId/performance` | Teacher | Per-student analytics |

### Quiz Routes (`/api/units/:unitId/quizzes`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | Any | List quizzes with `question_count` |
| POST | `/` | Teacher | Create new quiz |
| GET | `/:quizId` | Any | Get quiz with full questions |
| PUT | `/:quizId` | Teacher | Update quiz metadata |
| DELETE | `/:quizId` | Teacher | Delete quiz |
| POST | `/:quizId/generate` | Teacher | AI-generate questions |
| PUT | `/:quizId/questions` | Teacher | Save edited questions |
| POST | `/:quizId/submit` | Student | Submit answers, trigger grading |
| GET | `/:quizId/results/:studentId` | Any | Get own submission results |
| GET | `/:quizId/all-results` | Teacher | Get all submissions |
| POST | `/:quizId/analyze/:studentId` | Teacher | AI performance analysis |
| PATCH | `/:quizId/submissions/:id/sa` | Teacher | Override short-answer grades |

### Assignment Routes (`/api/units/:unitId/assignment`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | Any | Get assignment with sources + questions |
| POST | `/generate` | Teacher | AI-generate full DBQ |
| PUT | `/` | Teacher | Save edited assignment |
| POST | `/submit` | Student | Submit answers, trigger grading |
| GET | `/results/:studentId` | Any | Get own submission |
| GET | `/all-results` | Teacher | All submissions |
| POST | `/analyze/:studentId` | Teacher | AI analysis |
| PATCH | `/submissions/:id/sa` | Teacher | Override SA grades |

### Notes Routes (`/api/units/:unitId/notes`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | Any | Get unit notes |
| POST | `/generate` | Teacher | AI-generate notes |
| PUT | `/` | Teacher | Save edited notes |

### Personas Routes

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/api/units/:unitId/personas` | Any | List personas |
| POST | `/api/units/:unitId/personas` | Teacher | Create persona |
| PATCH | `/api/personas/:id` | Teacher | Edit persona |
| DELETE | `/api/personas/:id` | Teacher | Delete persona |
| POST | `/api/personas/:id/chat` | Student | Send message, receive AI response |
| GET | `/api/personas/:id/conversation` | Student | Get conversation history |

### Timeline Routes (`/api/classrooms/:classroomId/timeline`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | Any | Get full timeline with events |
| POST | `/generate` | Teacher | AI-generate from all unit contexts |
| PUT | `/` | Teacher | Save full timeline |
| PATCH | `/events/:eventId` | Teacher | Update single event |
| DELETE | `/events/:eventId` | Teacher | Delete event |

### Assistant Route (`/api/assistant`)

| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/chat` | Teacher | Gemini function-calling chat with Mr. Curator |
| POST | `/execute` | Teacher | Execute approved AI actions |

### Settings Route (`/api/settings`)

| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/` | Any | Get user settings (merged with defaults) |
| PUT | `/` | Any | Save settings |
| POST | `/reset` | Any | Reset to system defaults |

---

## 2.7 AI Integration Deep Dive

### Architecture

All AI calls flow through `backend/src/services/claude.js`, which exports standalone async functions. Each function:
1. Receives structured inputs (unit context, questions, student answers, etc.)
2. Builds a prompt (system instruction + user content)
3. Calls the Gemini API via `@google/generative-ai`
4. Parses and validates the response
5. Returns structured data to the route handler

```
Route Handler
     │
     ▼
claude.js function
     │
     ├── Build system prompt (base + aiInstruction from user settings)
     ├── Build user content (structured context + request)
     │
     ▼
Gemini 2.5 Flash API
     │
     ▼
Parse response
     │
     ├── For JSON responses: JSON.parse(text) with cleanup
     └── For text responses: return as-is
     │
     ▼
Return to route handler → store in Supabase → respond to client
```

### AI Function Inventory

| Function | Input | Output | Called From |
|---|---|---|---|
| `generateNotes` | unit title, context | Markdown string | `POST /notes/generate` |
| `chatWithEpochAssistant` | messages[], classrooms, units | text or action object | `POST /assistant/chat` |
| `chatWithPersona` | persona, unit context, messages[] | AI response string | `POST /personas/:id/chat` |
| `generateQuizQuestions` | unit title, context, count | `{ questions: [{...}] }` | `POST /quizzes/:id/generate` |
| `gradeShortAnswer` | question, correct answer, student answer | `{ score, feedback }` | `POST /quizzes/:id/submit` |
| `gradeEssay` | question, essay prompt, student answer | `{ score, feedback, breakdown, tagged_essay }` | `POST /quizzes/:id/submit` |
| `analyzePerformance` | unit, questions, submission | `{ summary, strengths[], improvements[], recommendation }` | `POST /quizzes/:id/analyze/:studentId` |
| `generateAssignmentContent` | title, context, sourceCount, questionCount | `{ sources: [], questions: [] }` | `POST /assignment/generate` |
| `generateTimeline` | classroom title, units[] | `{ events: [{...}] }` | `POST /timeline/generate` |

### Gemini Function Calling (Mr. Curator)

The assistant chat endpoint uses Gemini's function-calling feature with the following tool definitions:

| Tool Name | Parameters | Effect |
|---|---|---|
| `create_classroom` | name | Creates a new classroom |
| `create_unit` | classroomId, title, context | Creates a unit with AI context |
| `create_multiple_units` | classroomId, units[] | Batch create units |
| `create_personas` | unitId, personas[] | Create multiple personas |
| `set_unit_visibility` | unitId, isVisible | Show/hide unit from students |
| `delete_unit` | unitId | Remove a unit |
| `delete_multiple_units` | unitIds[] | Batch delete units |
| `delete_all_units` | classroomId | Clear entire classroom |

The model returns either:
- A plain text response (conversation/questions)
- A structured action object requiring teacher confirmation before execution

### Grading Pipeline Detail

```
Student submits quiz
         │
         ▼
For each question:
    ┌────────────────┬──────────────────────┬──────────────────────┐
    │ Multiple Choice│   Short Answer        │       Essay          │
    │                │                       │                      │
    │ Compare answer │ Gemini grades 0-100   │ Gemini grades with   │
    │ to correct_ans │ in increments of 25   │ 4-dimension rubric:  │
    │ auto: correct  │ Returns: score +      │ thesis + evidence +  │
    │ or incorrect   │ written feedback      │ analysis +           │
    └───────┬────────┘                       │ counterclaim         │
            │        ← score                 │ Each dimension /25   │
            │        ← mc_results[]          │ Returns: score +     │
            │        ← sa_feedback[]         │ feedback + breakdown │
            │        ← essay_feedback[]      │ + tagged essay text  │
            ▼                                └────────────┬─────────┘
    Compute overall score                                 │
    (average of all question scores)                      │
            │                                             │
            ▼                                             ▼
    Store submission to Supabase            tagged_essay has inline markers:
    Return { submission } to client         [[thesis]]..[[/thesis]]
                                            {{evidence}}..{{/evidence}}
                                            ||analysis||..||/analysis||
                                            <<counterclaim>>..<<>>
```

### AI Customization via User Settings

Teachers and students can customize AI behavior through the settings page. Settings are serialized into an `aiInstruction` string prepended to every Gemini prompt.

**Teacher AI Settings:**

| Setting | Options | Effect |
|---|---|---|
| Response Style | Concise / Balanced / Detailed | Prompt length and depth |
| Tone | Direct / Supportive / Socratic | Teaching style |
| Creativity | Conservative / Balanced / Creative | Variety in generation |
| Citation Mode | On / Off | Include historical citations |
| Student Reading Level | Middle / High / College | Target complexity |
| Feedback Focus | Historical Thinking / Writing Quality / Evidence Use | What AI emphasizes in grading |

**Student AI Settings:**

| Setting | Options | Effect |
|---|---|---|
| Explanation Style | Guided / Balanced / Direct | How AI explains concepts |
| Tone | Encouraging / Neutral / Challenging | Interaction style |
| Help Depth | Light / Step-by-Step / Deep Coaching | Feedback verbosity |
| Source Focus | Balanced / Source-First / Concept-First | DBQ emphasis |
| Confidence Checks | On / Off | AI adds "does this make sense?" checks |

---

## 2.8 Authentication & Security

### Authentication Flow

```
Registration:
  Client → POST /api/auth/register
           { email, password, display_name, role }
  Server:
    1. supabase.auth.admin.createUser({ email, password, email_confirm: true })
    2. Store display_name + role in user_metadata
    3. DB trigger fires: creates profiles row
    4. Return { access_token, refresh_token }

Login:
  Client → POST /api/auth/login { email, password }
  Server:
    1. supabase.auth.signInWithPassword()
    2. Return { access_token, refresh_token, user }

Every Authenticated Request:
  Client adds: Authorization: Bearer <access_token>
  Server:
    1. supabase.auth.getUser(token) → validates JWT signature + expiry
    2. SELECT * FROM profiles WHERE id = user.id
    3. Attach to req.user
    4. Proceed to route handler

Token Refresh (client-side):
  Axios interceptor catches 401 response
  → POST /api/auth/refresh { refresh_token }
  → Receive new access_token
  → Update localStorage
  → Retry failed request
```

### Security Measures

| Concern | Implementation |
|---|---|
| JWT Validation | Supabase verifies token signature on every request |
| Role Separation | `requireRole('teacher')` middleware on all write routes |
| Ownership Checks | Routes verify `teacher_id = req.user.id` before mutations |
| Student Data Isolation | Students can only read their own submissions; teacher sees all |
| CORS | Strict allowlist via `CLIENT_URLS` environment variable |
| File Upload Limits | Multer hard-limit: 20MB per file |
| AI Input Sanitization | Context strings are passed to AI without executing code |
| Student Removal | Removing a student from a classroom also deletes all their submissions for that classroom |

---

## 2.9 File Storage & Uploads

Teachers can upload reference files to units (PDFs, images, documents) to supplement the AI-generated content. The file pipeline:

```
Teacher selects file in UI
         │
         ▼
POST /api/units/:unitId/files (multipart/form-data)
         │
         ▼
Multer (memory storage, 20MB limit)
         │
         ▼
supabase.storage.from('unit-files').upload(path, buffer)
         │
         ▼
Store metadata to unit_files table:
  { unit_id, name, size, mime_type, storage_path }
         │
         ▼
Return { file } to client with download URL
```

Supported use: Teachers can view/delete uploaded files within the unit editor. Files are not currently surfaced to students directly but serve as reference material for teacher content creation.

---

## 2.10 Deployment Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        PRODUCTION STACK                            │
│                                                                    │
│  ┌──────────────────┐    ┌──────────────────┐    ┌─────────────┐  │
│  │                  │    │                  │    │             │  │
│  │     VERCEL       │    │     RENDER       │    │  SUPABASE   │  │
│  │  (Frontend CDN)  │    │  (Backend API)   │    │   (Cloud)   │  │
│  │                  │    │                  │    │             │  │
│  │  React SPA       │    │  Node.js/Express │    │  PostgreSQL │  │
│  │  Static files    │    │  Port 4000       │    │  Auth/JWT   │  │
│  │  Auto HTTPS      │    │  Auto HTTPS      │    │  Storage    │  │
│  │                  │    │                  │    │             │  │
│  │  vercel.json:    │    │  ENV vars:       │    │  ENV vars:  │  │
│  │  SPA rewrites    │    │  SUPABASE_URL    │    │  (managed)  │  │
│  │                  │    │  SUPABASE_KEY    │    │             │  │
│  │  ENV vars:       │    │  GEMINI_API_KEY  │    │             │  │
│  │  VITE_API_URL    │    │  CLIENT_URL      │    │             │  │
│  │                  │    │  PORT            │    │             │  │
│  └──────────────────┘    └──────────────────┘    └─────────────┘  │
│                                                                    │
│  Note: Render free tier spins down after 15min inactivity.        │
│  First request after sleep may take ~30-60 seconds.               │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Build Pipeline

```
Local Development:
  Frontend: vite dev server → http://localhost:5173
  Backend:  nodemon server.js → http://localhost:4000
  CORS:     CLIENT_URL=http://localhost:5173

Production Build:
  Frontend: vite build → dist/ → Vercel CDN
  Backend:  npm start → node server.js → Render web service
```

---

## 2.11 Settings System

The settings system allows both teachers and students to personalize their experience and the AI's behavior.

### Data Model

```
user_settings table
├── view_settings (JSONB)
│   ├── view_density: 'comfortable' | 'compact'
│   ├── default_landing: varies by role
│   └── reduce_motion: boolean
│
└── ai_settings (JSONB)
    │
    ├── Teacher-specific:
    │   ├── ai_response_style: 'concise' | 'balanced' | 'detailed'
    │   ├── ai_tone: 'direct' | 'supportive' | 'socratic'
    │   ├── ai_creativity: 'conservative' | 'balanced' | 'creative'
    │   ├── ai_citation_mode: 'on' | 'off'
    │   ├── ai_student_reading_level: 'middle' | 'high' | 'college'
    │   └── ai_feedback_focus: 'historical-thinking' | 'writing-quality' | 'evidence-use'
    │
    └── Student-specific:
        ├── ai_explanation_style: 'guided' | 'balanced' | 'direct'
        ├── ai_tone: 'encouraging' | 'neutral' | 'challenging'
        ├── ai_help_depth: 'light' | 'step-by-step' | 'deep-coaching'
        ├── ai_source_focus: 'balanced' | 'source-first' | 'concept-first'
        └── ai_confidence_checks: 'on' | 'off'
```

### Instruction Building

The `buildTeacherAiInstruction(settings)` function converts the settings object into a natural language instruction appended to every Gemini prompt. For example:

```
"Use a concise response style. Maintain a socratic tone. Prioritize
creative and varied question generation. Include historical citations.
Target content at a high school reading level. Focus feedback on
historical thinking skills."
```

This means every classroom can feel subtly different based on the teacher's pedagogical preferences, without requiring any prompt engineering knowledge from the teacher.

---

---

# 3. Future Plans & Roadmap

---

## 3.1 Near-Term Enhancements

These are features that build directly on existing infrastructure with minimal architectural changes.

### Feature Backlog — Short Term

| Feature | Description | Complexity |
|---|---|---|
| **Student persona completion tracking** | Show teachers which students have completed each persona (meet min_turns) | Low |
| **Notes read tracking** | Track when students open and read notes for each unit | Low |
| **Assignment submission tracking** | Show "X/N submitted" badge on teacher assignment view | Low |
| **Quiz retake policy** | Teacher toggle: allow re-takes (creates new submission) or lock after first submit | Medium |
| **Bulk quiz actions** | Select multiple questions to delete, reorder via drag handles | Medium |
| **Persona conversation reset** | Allow students or teachers to reset a persona conversation to start fresh | Low |
| **Rich text notes editor** | Replace raw markdown editor with a WYSIWYG editor (TipTap or Quill) | Medium |
| **Export results to CSV** | Teacher exports class performance data as spreadsheet | Medium |
| **In-app notifications** | Bell icon shows when students submit quizzes/assignments | Medium |
| **Duplicate quiz** | Clone a quiz from one unit to another | Low |
| **Quiz question bank** | Save questions to a reusable bank per classroom | High |

### UX Improvements — Short Term

| Item | Description |
|---|---|
| **Unit reordering UI** | Drag-and-drop to reorder units within ClassroomView |
| **Collapsible sidebar** | Teacher sidebar collapses to icon-only mode on narrow screens |
| **Keyboard shortcuts** | Cmd+S to save, Cmd+Enter to submit in quiz/assignment |
| **Auto-save draft** | Periodically save quiz/assignment answers to localStorage before submit |
| **Better mobile layout** | Current UI is desktop-first; responsive breakpoints for tablets |
| **Empty state illustrations** | Replace text-only empty states with illustrated placeholders |

---

## 3.2 Medium-Term Features

These require moderate new infrastructure or significant UI work.

### Classroom Analytics 2.0

The current analytics show score averages per student and per unit. A richer analytics system would include:

| Metric | Description |
|---|---|
| **Question-level analytics** | Which questions most students got wrong class-wide |
| **Time-spent estimates** | How long students spent on each quiz (requires frontend timing) |
| **Progress heatmap** | Grid showing each student × each activity, colored by status |
| **Score distribution histogram** | Distribution of scores per quiz/assignment |
| **Trend over time** | Student score trajectory unit-by-unit |
| **Standards alignment** | Tag questions to AP history standards (ARG, CCC, KC) and track mastery |

### Multi-Teacher / Department Support

Currently each classroom has exactly one teacher. A department model would allow:
- Multiple teachers to co-manage a classroom
- Shared unit templates across classrooms
- Department-level analytics

### Student Portfolio

Currently students have no persistent view of their own performance across all classes. A student portfolio page would show:
- Overall GPA equivalent across all classrooms
- Activity completion tracker
- Timeline of all submitted work
- Best/worst performing topics

### Rubric Customization

Currently the essay rubric (thesis / evidence / analysis / counterclaim) is fixed. Future versions would allow:
- Teachers to define custom rubric dimensions
- Custom point allocations per dimension
- Rubric saved per quiz or per assignment

### Peer Review Mode

For essay questions, enable an optional peer-review step:
- Student A's essay anonymously shown to Student B
- Student B provides structured feedback
- Teacher approves or overrides peer feedback
- AI facilitates quality of peer feedback

### Real-Time Collaborative Notes

Allow teachers to co-edit unit notes live using WebSocket/CRDT (e.g. integrating Liveblocks or Yjs), making it possible for department teams to build shared notes.

---

## 3.3 Long-Term Vision

### AI Tutor Mode

A student-facing AI tutor that can:
- Answer questions about unit content ("Why did the US enter WWI?")
- Pull from the unit's notes, sources, and persona context as its knowledge base
- Use Retrieval-Augmented Generation (RAG) on the uploaded unit files
- Track what questions students asked to surface knowledge gaps to teachers

This would require:
- Vector embeddings of unit content (stored in Supabase pgvector)
- Semantic search on student queries
- Scoped AI responses (can't answer outside the unit context)

### Standards-Based Grading Integration

Align Epoch with AP US History / AP World History / AP European History frameworks:
- Map questions to official College Board Learning Objectives
- Track student mastery per standard
- Generate AP-style practice LEQ/DBQ prompts
- Predict AP exam readiness score

### LMS Integration

Enable embedding Epoch within existing Learning Management Systems:
- **LTI 1.3** support for Canvas, Schoology, Google Classroom
- Grade passback: Epoch scores automatically sync to the LMS gradebook
- SSO via the LMS identity provider (no separate login)

### Adaptive Learning Engine

Replace static quiz generation with an adaptive engine:
- After each quiz, AI identifies weak topic areas per student
- Generates a personalized follow-up quiz targeting gaps
- Builds a learning graph per student showing mastery over time
- Adapts difficulty of future questions based on performance history

### Mobile App

A React Native port for students specifically, enabling:
- Push notifications for due dates and new assignments
- Offline mode for reading notes
- Voice responses for persona chat
- Dark mode and accessibility support

---

## 3.4 Technical Debt & Refactoring

### Current Known Issues

| Issue | Location | Priority |
|---|---|---|
| `@anthropic-ai/sdk` dependency imported but unused | `backend/package.json` | Low — remove |
| `cohere-ai` dependency imported but unused | `backend/package.json` | Low — remove |
| Render free tier cold starts | Deployment | Medium — upgrade or implement ping keepalive |
| All inline styles in CourseQuizResults | `CourseQuizResults.jsx` | Medium — migrate to CSS classes |
| No error boundaries in React tree | Frontend | Medium — add per-page error fallbacks |
| No database migrations system | Backend | High — add proper migration tracking |
| File service returns storage_path, not public URL | `files.js` | Medium — generate signed URLs consistently |
| No rate limiting on AI generation endpoints | Backend | High — add per-user rate limiting |
| No input length validation | Backend routes | Medium — add max length checks |

### Architectural Improvements

| Improvement | Description |
|---|---|
| **Database migrations** | Adopt a proper migration tool (e.g. Supabase CLI migrations) for reproducible schema changes |
| **API versioning** | Prefix routes with `/api/v1/` to allow future breaking changes without downtime |
| **Caching layer** | Cache AI-generated notes and quiz questions (they don't change after save) with Redis or Supabase Edge Functions |
| **Queue AI grading** | Move quiz grading to a background job queue (BullMQ) for large classes, polling for results instead of blocking the HTTP request |
| **Structured logging** | Add request logging (Winston or Pino) with correlation IDs for debugging production issues |
| **E2E tests** | Add Playwright tests covering the teacher content creation flow and student quiz submission flow |
| **Unit tests for AI parsing** | Add Jest tests for `claude.js` parsing logic — especially JSON extraction from Gemini responses |
| **TypeScript migration** | Gradual JSDoc or full TS migration for frontend API layer and data models |

---

## 3.5 Scale Considerations

### Current Capacity (Free Tier Estimates)

| Resource | Limit | Notes |
|---|---|---|
| Supabase DB storage | 500 MB | Sufficient for thousands of classrooms |
| Supabase file storage | 1 GB | Enough for hundreds of uploaded files |
| Render free tier RAM | 512 MB | Fine for low-concurrency use |
| Vercel bandwidth | 100 GB/month | Generous for an educational app |
| Gemini API | Rate-limited by tier | Key constraint at scale |

### Scaling Path

```
Current (MVP)                  Growth (100s of classrooms)          Scale (1000s)
     │                                    │                              │
  Single Express              Add connection pooling              Microservices:
  server on Render            (PgBouncer / Supabase              - AI service
                              connection limits)                  - Grading service
  Supabase free               Upgrade Supabase tier              - Auth service
  tier PostgreSQL             for more connections               - File service

  Gemini direct               Add request queuing                Switch to Gemini
  API calls per               for grading (BullMQ)               Batch API
  HTTP request
                              Redis for session                  CDN for
  Vercel CDN                  caching + rate limits              static notes
  for frontend
```

### Gemini Cost Projection

| Scale | AI Calls/Month | Estimated Cost |
|---|---|---|
| Small (10 classrooms, 100 students) | ~5,000 | ~$2–5/month |
| Medium (50 classrooms, 500 students) | ~50,000 | ~$20–40/month |
| Large (500 classrooms, 5000 students) | ~500,000 | ~$200–400/month |

The dominant cost driver is **quiz grading** (SA + essay calls per submission) and **persona chat** (one call per student message). Note generation and assignment generation are one-time costs per unit and relatively low volume.

---

---

## Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    EPOCH AT A GLANCE                         │
│                                                             │
│  WHAT IT IS:                                                │
│  An AI-powered history classroom platform for teachers     │
│  and students. Teachers build units with a paragraph of    │
│  context and Epoch handles everything else.                │
│                                                             │
│  WHO IT'S FOR:                                             │
│  High school and college history teachers who want to      │
│  save hours on content creation without sacrificing        │
│  instructional quality.                                    │
│                                                             │
│  HOW IT WORKS:                                             │
│  Teacher context → Gemini 2.5 Flash → Notes, Personas,    │
│  Quizzes, Assignments, Timeline. Student submits →         │
│  Gemini grades and analyzes → Teacher reviews analytics.   │
│                                                             │
│  TECH STACK:                                               │
│  React 19 + Vite → Vercel                                 │
│  Node.js + Express → Render                               │
│  Supabase (PostgreSQL + Auth + Storage)                    │
│  Google Gemini 2.5 Flash                                   │
│                                                             │
│  CURRENT STATE:                                            │
│  MVP complete. All core features functional. Deployed.     │
│  Suitable for small-to-medium classroom use today.         │
│                                                             │
│  NEXT MILESTONE:                                           │
│  Analytics 2.0, student portfolio, LMS integration,       │
│  and AI tutor mode for students.                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

*Report generated: March 2026 | Epoch v1.0 | All data reflects current codebase state*
