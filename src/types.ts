export interface JobPosting {
  id: string;
  title: string;
  company: string;
  cgpaCutoff: number;
  requiredSkills: string[];
  description: string;
  createdAt: string;
  applicantCount: number;
  department?: string;
  stipend?: string;
}

export interface CandidateProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  education: string;
  cgpa: number | null;
  skills: string[];
  projects: string[];
  experience: string;
  resumeText: string;
}

export interface AIEvaluation {
  candidateId: string;
  jobId: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  verdict: "Shortlisted" | "Rejected";
  reasoning: string;
  manualOverrideVerdict: "Shortlisted" | "Rejected" | null;
  manualNotes: string | null;
  evaluatedAt: string;
}

export const SEED_JOBS: JobPosting[] = [
  {
    id: "job-1",
    title: "Frontend Engineering Intern",
    company: "Stitch Tech",
    cgpaCutoff: 7.5,
    requiredSkills: ["React", "TypeScript", "Tailwind CSS", "Framer Motion", "HTML", "CSS"],
    description: "Looking for an energetic frontend intern to build rich user interfaces, interactive data dashboards, and beautiful fluid web micro-animations using React, Tailwind CSS, and Framer Motion.",
    createdAt: "2026-07-10",
    applicantCount: 3
  },
  {
    id: "job-2",
    title: "AI & Deep Learning Intern",
    company: "NeuroLink",
    cgpaCutoff: 8.5,
    requiredSkills: ["Python", "PyTorch", "Machine Learning", "Transformers", "NLP", "Data Structures"],
    description: "Join our core AI team to train, prompt, and fine-tune next-generation reasoning agents. Requires strong algorithmic skills, fluency in Python/PyTorch, and hands-on experience with transformer architectures.",
    createdAt: "2026-07-15",
    applicantCount: 2
  },
  {
    id: "job-3",
    title: "Full Stack Engineer Intern",
    company: "CloudBase Inc.",
    cgpaCutoff: 8.0,
    requiredSkills: ["Node.js", "Express", "TypeScript", "PostgreSQL", "Docker", "REST APIs"],
    description: "Seeking a back-end-leaning full-stack developer to architect robust APIs, design database schemas, and optimize containerized web service deployment. Familiarity with Node and PostgreSQL is highly required.",
    createdAt: "2026-07-18",
    applicantCount: 1
  }
];

export const SEED_CANDIDATES: CandidateProfile[] = [
  {
    id: "cand-1",
    name: "Arjun Mehta",
    email: "arjun.mehta@university.edu",
    phone: "+91 98765 43210",
    education: "B.Tech in Computer Science, IIT Bombay",
    cgpa: 8.8,
    skills: ["React", "TypeScript", "Tailwind CSS", "JavaScript", "HTML", "CSS", "Python", "Node.js"],
    projects: [
      "Built a modern real-time canvas whiteboard collaboration app using Socket.io and React.",
      "Developed an automated expense manager tracking utility with React and LocalStorage."
    ],
    experience: "Web Development Head for University Tech Fest, managed 3 junior developers to build the official fest app serving over 5000 users.",
    resumeText: "Arjun Mehta resume. Email: arjun.mehta@university.edu. Phone: +91 98765 43210. B.Tech Computer Science student at IIT Bombay. CGPA: 8.8. Technical skills include React, TypeScript, Tailwind CSS, JavaScript, HTML, CSS, Python, Node.js. Projects: 1) Real-time whiteboard using Socket.io and React. 2) Expense tracker. Web Dev Head at Tech Fest, managed official portal."
  },
  {
    id: "cand-2",
    name: "Sneha Rao",
    email: "sneha.rao@university.edu",
    phone: "+91 87654 32109",
    education: "B.E. in Information Technology, NIT Trichy",
    cgpa: 8.2,
    skills: ["Python", "Machine Learning", "TensorFlow", "Scikit-Learn", "SQL", "Pandas", "HTML", "CSS"],
    projects: [
      "Created a deep learning image classifier achieving 94% accuracy using convolutional neural networks.",
      "Engineered an automated stock price forecasting system applying historical time-series analyses."
    ],
    experience: "Data Analyst Intern at FinAnalytics, curated and cleaned complex datasets with Pandas, increasing dashboard querying speeds by 25%.",
    resumeText: "Sneha Rao. sneha.rao@university.edu. +91 87654 32109. B.E. in IT, NIT Trichy. CGPA: 8.2. Skills: Python, Machine Learning, TensorFlow, Scikit-Learn, SQL, Pandas, HTML, CSS. Projects: 1) CNN image classifier. 2) Stock forecasting. Intern at FinAnalytics cleaning data, optimizing dashboards."
  },
  {
    id: "cand-3",
    name: "Dev Patel",
    email: "dev.patel@university.edu",
    phone: "+91 76543 21098",
    education: "B.Tech in Software Engineering, DTU",
    cgpa: 7.2,
    skills: ["JavaScript", "HTML", "CSS", "Node.js", "Express", "MongoDB", "Git"],
    projects: [
      "Crafted a light social blogging system using Node.js, Express, and MongoDB with secure password crypts.",
      "Programmed a interactive console-based terminal file manager in Node."
    ],
    experience: "Open Source Contributor for Hacktoberfest, fixed modular memory leaks in open-source server packages.",
    resumeText: "Dev Patel. dev.patel@university.edu. B.Tech SE, DTU. CGPA: 7.2. Skills: JavaScript, HTML, CSS, Node.js, Express, MongoDB, Git. Projects: Express Blog system, CLI file manager. Hacktoberfest contributor fixing Node server leaks."
  }
];

export const SEED_EVALUATIONS: AIEvaluation[] = [
  {
    candidateId: "cand-1",
    jobId: "job-1",
    matchScore: 92,
    matchedSkills: ["React", "TypeScript", "Tailwind CSS", "HTML", "CSS"],
    missingSkills: ["Framer Motion"],
    verdict: "Shortlisted",
    reasoning: "Candidate meets the 7.5 CGPA requirement with an excellent 8.8. They have proven experience with React, TypeScript, Tailwind, and HTML/CSS, only missing Framer Motion, making them an ideal frontend fit.",
    manualOverrideVerdict: null,
    manualNotes: null,
    evaluatedAt: "2026-07-12T10:30:00Z"
  },
  {
    candidateId: "cand-2",
    jobId: "job-2",
    matchScore: 78,
    matchedSkills: ["Python", "Machine Learning"],
    missingSkills: ["PyTorch", "Transformers", "NLP", "Data Structures"],
    verdict: "Shortlisted",
    reasoning: "Sneha satisfies the high CGPA requirement (8.2 meets or exceeds 8.5 is false? Wait, CGPA cutoff is 8.5 but candidate has 8.2. However, score is 78). She demonstrates solid Python and ML foundations, although she lacks PyTorch and NLP experience.",
    manualOverrideVerdict: "Rejected",
    manualNotes: "Rejected manual override because current CGPA (8.2) is below the 8.5 threshold for this competitive role.",
    evaluatedAt: "2026-07-16T14:15:00Z"
  },
  {
    candidateId: "cand-3",
    jobId: "job-3",
    matchScore: 64,
    matchedSkills: ["Node.js", "Express", "TypeScript"],
    missingSkills: ["PostgreSQL", "Docker", "REST APIs"],
    verdict: "Rejected",
    reasoning: "Candidate's CGPA (7.2) falls below the required 8.0 cutoff, and they are missing critical production skills like PostgreSQL database integrations and Docker containerization.",
    manualOverrideVerdict: null,
    manualNotes: null,
    evaluatedAt: "2026-07-18T16:45:00Z"
  }
];
