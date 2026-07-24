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
Notification — Students see their updated status (Shortlisted/Rejected/Under Review) on their portal
✨ Key Features
👨‍🎓 Student Portal
Secure Login
Resume Upload (PDF)
ATS Score
Eligibility Percentage
Missing Skills Analysis
Resume History
Voice AI Assistant
Application Status Tracking
👨‍💼 Placement Officer Portal
Create Internship Drives
Upload Job Descriptions
AI Resume Ranking
Candidate Shortlisting
Search & Filters
Analytics Dashboard
Export Results (CSV/PDF)
Manual Override
🤖 AI Features
Resume Parsing
OCR Extraction
Semantic JD Matching
AI Recommendation Engine
Skill Gap Detection
AI Chat Assistant
Voice Conversation
Resume Summarization
🧠 AI Workflow
Resume Upload
      │
      ▼
OCR + Resume Parsing
      │
      ▼
Structured Candidate Profile
      │
      ▼
Job Description Matching
      │
      ▼
ATS Score Generation
      │
      ▼
Eligibility %
      │
      ▼
Candidate Ranking
      │
      ▼
Placement Officer Dashboard
🛠 Tech Stack
Category	Technologies
Frontend	React, TypeScript, Tailwind CSS, Vite
Backend	Node.js, Express.js
Database	Supabase
AI	Google Gemini API
OCR	Mistral OCR
Speech	Sarvam AI STT & TTS
Authentication	Supabase Auth
Storage	Supabase Storage
Deployment	Google AI Studio
🏗 System Architecture
Student
    │
    ▼
Upload Resume
    │
    ▼
OCR Service
    │
    ▼
Gemini AI
    │
    ▼
Resume Parser
    │
    ▼
Embedding + Matching
    │
    ▼
Ranking Engine
    │
    ▼
Supabase Database
    │
    ▼
Officer Dashboard
📂 Project Structure
smartscreen-ai/

├── client/
│   ├── components/
│   ├── pages/
│   ├── services/
│   └── assets/
│
├── server/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── middleware/
│   └── config/
│
├── docs/
├── public/
├── README.md
└── package.json
⚙ Installation
git clone https://github.com/username/smartscreen-ai.git

cd smartscreen-ai

npm install

npm run dev
🔑 Environment Variables
GEMINI_API_KEY=

SUPABASE_URL=

SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

JWT_SECRET=
📷 Screenshots
Student Portal	Placement Dashboard
Add Screenshot	Add Screenshot
📊 Future Enhancements
Resume OCR for scanned images
Multi-language Resume Support
Interview Scheduling
LinkedIn Profile Integration
AI Interview Preparation
Bias Detection Dashboard
Company Portal
Email Notifications
👥 Team
Name	Role
Team Lead	Backend & AI
Member 2	Frontend
Member 3	Database
Member 4	UI/UX
📄 License

This project was developed for a Hackathon and is intended for educational and demonstration purposes.

⭐ Why SmartScreen AI?
🚀 AI-powered recruitment automation
⚡ 10x faster resume screening
📊 Intelligent candidate ranking
🎯 Accurate JD matching
📈 ATS score generation
🗣️ Voice AI Assistant
🔒 Secure authentication
📱 Modern responsive UI
MongoDB Documentation
React Documentation
