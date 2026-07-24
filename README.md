🎯 SmartScreen AI — AI-Powered Smart Internship Screening & Candidate Ranking System

Automating campus internship screening with AI — from resume upload to ranked, shortlisted candidates in minutes, not hours.


👥 Team Details
Role	Name	GitHub	Contribution
Team Lead	[Ranjithkumar M]	@github-handle	Backend + AI pipeline
Member 2	[Roja VM]	@github-handle	Frontend/UI
Member 3	[Madhu mitha B]	@github-handle	Resume parsing/NLP


 Track: AI/Intelligent Automation

📌 Problem Statement

College Training and Placement Cells receive hundreds of resumes for a single internship drive. Manually checking each resume against eligibility criteria (skills, CGPA, projects, education) is slow, inconsistent, and prone to human bias or oversight — often taking placement officers several hours to days per drive.

💡 Solution

SmartScreen AI is an intelligent web platform that automates the entire screening workflow:

Students upload resumes through a simple portal.
The system extracts structured data (skills, CGPA, education, projects, experience) using AI/NLP.
Extracted data is semantically matched against the job description/eligibility criteria.
Each candidate receives an AI-generated match score.
Candidates are automatically ranked and tagged Shortlisted or Rejected.
Placement officers review everything on an admin dashboard — rankings, resume breakdowns, and AI recommendations — instead of reading every resume manually.

This reduces manual effort, speeds up recruitment cycles, and makes evaluation more consistent and fair.

✨ Features
📤 Student Resume Portal — drag-and-drop upload (PDF/DOCX), application status tracking
🧠 AI Resume Parsing — extracts skills, CGPA, education, projects, work experience
🎯 JD-to-Resume Matching — semantic similarity scoring against job description/eligibility criteria
📊 Automated Candidate Ranking — sorts applicants by match score
✅ Shortlist/Reject Automation — configurable score threshold per drive
🖥️ Placement Officer Dashboard — view rankings, resume details, AI recommendations, filters/search
📈 Analytics View — skill-gap trends, average CGPA, drive-wise stats
🔒 Role-based Access — separate student and admin (placement officer) logins
📥 Bulk Export — download shortlisted candidate list (CSV/PDF)
🔔 Status Notifications — students notified on shortlist/reject decision
🛠️ Tech Stack
Layer	Technology
Frontend	React.js / Next.js, Tailwind CSS
Backend	Node.js, Express.js
AI/ML	Google Gemini API (resume parsing + JD matching), LangChain (optional orchestration)
Resume Parsing	pdf-parse / mammoth (DOCX) + Gemini structured extraction
Database	MongoDB (candidate data, drives, scores)
Authentication	JWT-based auth, bcrypt password hashing
File Storage	Local /uploads (dev) → AWS S3 / Firebase Storage (prod)
Hosting	Vercel (frontend), Render/Railway (backend), Google AI Studio (AI prototype)
Version Control	Git & GitHub
🏗️ System Architecture
Upload Resume PDF/DOCX
Extract: Skills, CGPA,Education, Projects
Structured Candidate Data
Job Description
Match Score +Recommendation
Sorted List +Shortlist/Reject Tags
Final Decision
Status Update
Student Portal
Backend API
Resume Parser Service
Gemini AI Engine
Placement Officer: CreateJob Drive + JD
MongoDB Database
Ranking Engine
Admin Dashboard
Placement Officer ReviewsResults
🔄 Detailed Workflow
Drive Creation — Placement officer logs in, creates a new internship drive, and pastes the Job Description (skills required, min CGPA, eligible branches, etc.).
Student Application — Students register/login, view open drives, and upload their resume (PDF/DOCX).
Parsing — Backend sends the resume file to the parsing service, which extracts raw text and passes it to the Gemini API with a structured-extraction prompt, returning JSON: { skills, cgpa, education, projects, experience }.
Matching & Scoring — The extracted profile and the JD are passed to the AI matching module, which computes a similarity/eligibility score (0–100) and generates a short recommendation (e.g., "Strong match — meets all criteria" or "Below CGPA cutoff").
Ranking — All candidates for a drive are sorted by score; those above the configurable threshold are auto-tagged Shortlisted, others Rejected.
Review — Placement officer views the ranked list on the dashboard, can open any resume, see the AI's reasoning, and override any decision manually.
Notification — Students see their updated status (Shortlisted/Rejected/Under Review) on their portal.
📁 Folder Structure
smartscreen-ai/
├── client/                     # React/Next.js frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components (ResumeCard, RankingTable, etc.)
│   │   ├── pages/               # Student portal, Admin dashboard, Login/Signup
│   │   ├── services/            # API call wrappers (axios)
│   │   └── context/              # Auth context, global state
│   └── package.json
│
├── server/                      # Node.js/Express backend
│   ├── src/
│   │   ├── routes/               # /auth, /resumes, /drives, /rankings
│   │   ├── controllers/          # Business logic per route
│   │   ├── models/                # Mongoose schemas (User, Resume, Drive, Score)
│   │   ├── services/
│   │   │   ├── resumeParser.js   # PDF/DOCX text extraction
│   │   │   └── aiMatcher.js       # Gemini API integration + scoring
│   │   ├── middleware/            # Auth guard, error handler, file upload (multer)
│   │   └── config/                 # DB connection, env config
│   ├── uploads/                    # Uploaded resumes (dev only)
│   └── package.json
│
├── docs/
│   ├── architecture-diagram.png
│   ├── screenshots/
│   └── demo-video-link.md
│
├── .env.example
├── .gitignore
└── README.md
⚙️ Installation & Usage Guide
Prerequisites
Node.js ≥ 18.x
MongoDB (local or Atlas URI)
Gemini API key (Google AI Studio)
1. Clone the repository
bash
git clone https://github.com/<your-org-or-username>/smartscreen-ai.git
cd smartscreen-ai
2. Backend setup
bash
cd server
npm install
cp .env.example .env
# Fill in: MONGODB_URI, GEMINI_API_KEY, JWT_SECRET, PORT
npm run dev
3. Frontend setup
bash
cd ../client
npm install
npm run dev
4. Access the app
Frontend: http://localhost:3000
Backend API: http://localhost:5000/api
🔌 API Documentation
Method	Endpoint	Description	Auth
POST	/api/auth/register	Register student/admin	❌
POST	/api/auth/login	Login, returns JWT	❌
POST	/api/drives	Create new internship drive (JD, criteria)	Admin
GET	/api/drives	List all active drives	✅
POST	/api/resumes/upload	Upload resume for a drive	Student
POST	/api/resumes/:id/parse	Trigger AI parsing + scoring	System/Admin
GET	/api/drives/:id/rankings	Get ranked candidate list for a drive	Admin
PATCH	/api/candidates/:id/status	Manually override shortlist/reject	Admin
GET	/api/candidates/:id	Get full parsed resume + AI recommendation	Admin
Database Schema (simplified)

User: { name, email, passwordHash, role: 'student' | 'admin' } Drive: { title, jobDescription, requiredSkills[], minCGPA, deadline, createdBy } Resume: { studentId, driveId, fileUrl, parsedData: { skills[], cgpa, education, projects[] } } Score: { resumeId, driveId, matchScore, recommendation, status: 'shortlisted' | 'rejected' | 'pending' }

🤖 AI/ML Workflow
Text Extraction — pdf-parse/mammoth converts uploaded resume to raw text.
Structured Extraction Prompt — Raw text sent to Gemini with a prompt instructing it to return strict JSON (skills, CGPA, education, projects, experience).
JD Embedding/Comparison — Job description keywords + required skills compared against extracted skills using semantic matching (Gemini reasoning or cosine similarity on embeddings).
Scoring Formula (example, tune as needed):
   score = (skill_match_% * 0.5) + (cgpa_fit * 0.2) + (project_relevance * 0.2) + (experience_bonus * 0.1)
Recommendation Generation — Gemini generates a 1–2 line human-readable justification for the score (used by placement officers to sanity-check AI decisions).
Threshold Application — Score ≥ drive's configured cutoff → Shortlisted; else Rejected (officer can override).
🔐 Security Measures
Passwords hashed with bcrypt; JWT-based session auth with expiry
Role-based access control (student vs. admin routes protected via middleware)
File upload validation (type/size limits, PDF/DOCX only) to prevent malicious uploads
Environment variables for all secrets/API keys (.env, never committed)
Input sanitization/validation on all API endpoints
Rate limiting on auth and upload endpoints to prevent abuse
🧪 Testing & Performance
Manual testing of upload → parse → score → rank pipeline across sample resume sets
Edge cases tested: corrupted files, non-English resumes, missing CGPA/education fields
Load tested with [X] concurrent resume uploads — average parse+score time: [X] seconds/resume
[Add unit/integration test framework used, e.g., Jest, and coverage % if available]
🚧 Challenges Faced
Handling inconsistent resume formats/layouts during text extraction
Balancing AI scoring accuracy vs. false positives/negatives near the shortlist threshold
Designing a scoring formula that's explainable to non-technical placement officers
[Add your team's actual challenges]
🔮 Future Scope
Support for scanned/image-based resumes via OCR
Interview scheduling integration for shortlisted candidates
Bias/fairness audit dashboard for AI decisions
Multi-language resume support
Integration with LinkedIn/portfolio links for richer candidate profiles
🖼️ Demo Screenshots

Add screenshots in /docs/screenshots/ and embed them here:

markdown
![Student Portal](docs/screenshots/student-portal.png)
![Admin Dashboard](docs/screenshots/admin-dashboard.png)
![Ranking View](docs/screenshots/ranking-view.png)
📚 References
Google AI Studio / Gemini API Docs
MongoDB Documentation
React Documentation