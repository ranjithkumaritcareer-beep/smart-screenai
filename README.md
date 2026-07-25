<div align="center">

# 🎯 SmartScreen AI

### AI-Powered Resume Screening for Smarter Placements

*Built by **Team Code Titans** | AI Automation Track*

[![Live Demo](https://img.shields.io/badge/Live%20Demo-smartscreen--ai.ai.studio-00D9C0?style=for-the-badge)](https://smartscreen-ai.ai.studio)
[![Built with AI Studio](https://img.shields.io/badge/Built%20with-Google%20AI%20Studio-0B1F3A?style=for-the-badge)](https://ai.studio)
[![Auth](https://img.shields.io/badge/Auth-Supabase-3ECF8E?style=for-the-badge)](https://supabase.com)
[![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)](#license)

[🚀 Live Demo](https://smartscreen-ai.ai.studio) • [📖 Features](#-features) • [🏗️ Tech Stack](#️-tech-stack) • [🎬 How It Works](#-how-it-works) • [👥 Team](#-team)

</div>

---

## 📸 Preview

<div align="center">
<!-- Replace these with real screenshots/GIFs of your app once hosted -->
<img src="https://via.placeholder.com/800x450/0B1F3A/00D9C0?text=Student+Dashboard+Screenshot" width="45%" alt="Student Dashboard"/>
<img src="https://via.placeholder.com/800x450/0B1F3A/00D9C0?text=Officer+Dashboard+Screenshot" width="45%" alt="Officer Dashboard"/>
</div>

> 💡 **Note:** Swap the placeholder images above with real screenshots or a short GIF of your app in action — a live visual is the single biggest thing that makes a README "impressive" to anyone skimming your repo.

---

## 😩 The Problem

Every placement drive, a Training & Placement Cell receives **hundreds of resumes** for a single internship. Manually checking each one against the job's eligibility criteria takes **hours**, delays shortlisting, and gives students **zero feedback** beyond a plain rejection.

## ✅ The Solution

**SmartScreen AI** automates the entire screening pipeline:

| For Students 🎓 | For Placement Officers 🧑‍💼 |
|---|---|
| Upload a resume, get an instant **ATS score** | See every applicant for a job in **one ranked dashboard** |
| See your **eligibility %** for any specific job | View **eligible vs. not-eligible** split at a glance |
| Get a clear list of **missing skills** to learn | **Shortlist & export** top candidates in one click |
| Track skill growth across every job you check | No more opening 300 resumes one by one |

---

## ✨ Features

- 🔍 **AI Resume Parsing** — extracts education, skills, projects, and experience automatically
- 📊 **ATS + Eligibility Scoring** — instant match percentage against any job's criteria
- 🧭 **Skill Gap Suggestions** — tells students exactly what to learn next
- 🔐 **Role-Locked Portals** — Student and Officer portals are completely separate, secured with Google Sign-In via Supabase
- 📈 **Live Officer Analytics** — real-time charts of applicant eligibility across a drive
- ⚡ **Instant, Not Manual** — what used to take hours now takes seconds

---

## 🏗️ Tech Stack

<div align="center">

| Layer | Technology |
|---|---|
| App Builder | Google AI Studio |
| AI / Resume Scoring | Gemini API |
| Authentication & Database | Supabase |
| Design System | Navy `#0B1F3A` + Teal `#00D9C0`, Space Grotesk + Inter |

</div>

---

## 🎬 How It Works

```
Student uploads resume
        │
        ▼
AI parses resume → extracts skills, education, experience
        │
        ▼
Compared against job's stated criteria
        │
        ▼
   ┌────┴────┐
   ▼         ▼
ATS Score   Eligibility % + Missing Skills
   │         │
   └────┬────┘
        ▼
Officer Dashboard: ranked, filterable applicant list
```

---

## 🚀 Getting Started

```bash
# Clone the repository
git clone https://github.com/<your-username>/smartscreen-ai.git

# Navigate into the project
cd smartscreen-ai

# Install dependencies
npm install

# Add your environment variables
# (Supabase URL + anon key, Gemini API key)
cp .env.example .env

# Run locally
npm run dev
```

> ⚠️ Never commit real API keys or the `.env` file — keep secrets out of version control.

---

## 🗺️ Roadmap

- [ ] OCR support for scanned/image resumes
- [ ] Batch upload — screen hundreds of resumes in one go
- [ ] Officer email whitelist for verified placement staff
- [ ] Downloadable shortlist reports (PDF/CSV)

---

## 👥 Team — Code Titans

| Name | 
|---|
|Ranjithkumar M|  
|Roja VM | 
|Madhu mitha B|  

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

<div align="center">

**⭐ If you like this project, give it a star — it helps a lot!**

</div>
