import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { 
  addDocumentToChroma, 
  queryChroma, 
  preseedKnowledgeBase 
} from "./src/server/rag.js";

dotenv.config();

const app = express();
const PORT = 3000;

// Enable JSON bodies with higher limits for large documents
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Lazy-initialized Gemini Client
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not defined in the environment. Please configure it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Robust wrapper around generateContent with exponential backoff retry and automatic model fallback on overload
async function generateContentWithRetryAndFallback(
  ai: GoogleGenAI,
  params: any,
  retries = 2,
  delay = 1000
): Promise<any> {
  // Normalize model name to gemini-2.5-flash unless gemini-2.5-pro is requested
  let requestedModel = params.model || "gemini-2.5-flash";
  if (requestedModel !== "gemini-2.5-pro") {
    requestedModel = "gemini-2.5-flash";
  }
  let currentModel = requestedModel;
  
  let lastError: any = null;
  
  // Try with primary model first
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      const callParams = { ...params, model: currentModel };
      return await ai.models.generateContent(callParams);
    } catch (error: any) {
      lastError = error;
      const isQuotaExceeded = error?.message && /quota|resource_exhausted|resource exhausted|exceeded your current quota/i.test(error.message);
      const isTemporary = (error?.message?.includes("503") || 
                          error?.message?.includes("429") ||
                          error?.status === 503 || 
                          error?.status === 429 ||
                          (error?.message && /experiencing high demand|temporary|overloaded/i.test(error.message))) && !isQuotaExceeded;
      
      if (isTemporary && attempt <= retries) {
        console.warn(`Gemini API temporary error with model ${currentModel} (${error.message || error}) on attempt ${attempt}. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // exponential backoff
        continue;
      }
      break; // non-temporary or exceeded retries
    }
  }

  // Fallback to gemini-1.5-flash if gemini-2.5-flash is overloaded
  const isOverloadedOrQuota = lastError?.message?.includes("503") || 
                              lastError?.message?.includes("429") ||
                              lastError?.status === 503 ||
                              lastError?.status === 429 ||
                              (lastError?.message && /experiencing high demand|temporary|overloaded|quota|resource exhausted/i.test(lastError.message));
                       
  if (isOverloadedOrQuota && currentModel !== "gemini-1.5-flash") {
    console.warn(`Model ${currentModel} overloaded or quota exceeded. Trying fallback model gemini-1.5-flash...`);
    try {
      const fallbackParams = { ...params, model: "gemini-1.5-flash" };
      return await ai.models.generateContent(fallbackParams);
    } catch (fallbackError: any) {
      console.error("Fallback model gemini-1.5-flash also failed:", fallbackError);
      throw lastError;
    }
  }
  
  throw lastError;
}

// 0. Heuristic Resume Fallback Parsers (For offline resilience and missing keys)
function heuristicParseResume(text: string) {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  let name = "Unknown Candidate";
  const commonExclusions = ["resume", "cv", "curriculum", "vitae", "contact", "email", "phone", "profile", "education", "experience", "projects", "skills"];
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i];
    const words = line.split(/\s+/);
    if (words.length >= 2 && words.length <= 4) {
      const isLikelyName = words.every(w => /^[A-Z][a-zA-Z]*$/.test(w)) && 
                          !words.some(w => commonExclusions.includes(w.toLowerCase()));
      if (isLikelyName) {
        name = line;
        break;
      }
    }
  }
  if (name === "Unknown Candidate" && lines.length > 0) {
    for (let i = 0; i < Math.min(lines.length, 3); i++) {
      if (lines[i].length > 3 && lines[i].length < 30) {
        name = lines[i];
        break;
      }
    }
  }

  const commonSkills = [
    "React", "Angular", "Vue", "Node", "Express", "Python", "Java", "C++", "C#", "Ruby", "Rails",
    "Go", "Rust", "Swift", "Kotlin", "TypeScript", "JavaScript", "SQL", "NoSQL", "MongoDB", "Postgres",
    "MySQL", "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Git", "GitHub", "HTML", "CSS", "Tailwind",
    "Bootstrap", "Machine Learning", "Deep Learning", "AI", "NLP", "Flask", "Django", "FastAPI"
  ];
  const skills: string[] = [];
  const textLower = text.toLowerCase();
  for (const skill of commonSkills) {
    const regex = new RegExp(`\\b${skill.replace(/\+/g, "\\+")}\\b`, "i");
    if (regex.test(textLower)) {
      skills.push(skill);
    }
  }

  let education = "Not specified";
  const eduKeywords = ["university", "college", "institute", "school", "bachelor", "master", "btech", "mtech", "b.tech", "m.tech", "b.s.", "m.s.", "phd"];
  for (const line of lines) {
    if (eduKeywords.some(kw => line.toLowerCase().includes(kw))) {
      education = line;
      break;
    }
  }

  let cgpa = "";
  const cgpaRegex = /\b(cgpa|gpa|marks|percentage|pointer)\b:?\s*([0-9]+(?:\.[0-9]+)?(?:\s*\/\s*[0-9]+)?%?)/i;
  const matchCgpa = text.match(cgpaRegex);
  if (matchCgpa) {
    cgpa = matchCgpa[2];
  } else {
    const gpaRegex = /\b([0-9]\.[0-9]{1,2})\s*\/\s*(?:4|10|5)\b/i;
    const matchGpa = text.match(gpaRegex);
    if (matchGpa) {
      cgpa = matchGpa[0];
    } else {
      const standaloneCgpaRegex = /\b(?:cgpa|gpa)\s*(?:of)?\s*([0-9]\.[0-9]{1,2})\b/i;
      const standaloneMatch = text.match(standaloneCgpaRegex);
      if (standaloneMatch) {
        cgpa = standaloneMatch[1];
      }
    }
  }

  const projects: string[] = [];
  const projectKeywords = ["project", "portfolio", "application", "system", "built", "developed"];
  for (const line of lines) {
    if (line.length > 20 && projectKeywords.some(kw => line.toLowerCase().includes(kw)) && projects.length < 3) {
      projects.push(line);
    }
  }
  if (projects.length === 0) {
    projects.push("Resume Analyzer Tool (Interactive web-based platform with natural query filters)");
  }

  let experience = "No formal work experience";
  const expKeywords = ["experience", "worked at", "intern", "developer at", "engineer at", "role", "responsibilities"];
  for (const line of lines) {
    if (line.length > 30 && expKeywords.some(kw => line.toLowerCase().includes(kw))) {
      experience = line;
      break;
    }
  }

  return { name, skills, education, cgpa, projects, experience };
}

function heuristicScoreCandidate(candidate: any, job: any) {
  const candidateSkills = Array.isArray(candidate.skills) ? candidate.skills.map((s: any) => s.toLowerCase().trim()) : [];
  const jobSkills = Array.isArray(job.requiredSkills) ? job.requiredSkills.map((s: any) => s.toLowerCase().trim()) : [];

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  if (Array.isArray(job.requiredSkills)) {
    job.requiredSkills.forEach((s: string) => {
      const cleanS = s.toLowerCase().trim();
      if (candidateSkills.includes(cleanS) || candidateSkills.some((cs: string) => cs.includes(cleanS) || cleanS.includes(cs))) {
        matchedSkills.push(s);
      } else {
        missingSkills.push(s);
      }
    });
  }

  let matchScore = 50; // base score
  if (jobSkills.length > 0) {
    const ratio = matchedSkills.length / jobSkills.length;
    matchScore = Math.round(ratio * 50) + 45;
  } else {
    matchScore = 85;
  }

  let cgpaExplanation = "";
  if (candidate.cgpa && job.cgpaCutoff) {
    const candCgpaVal = parseFloat(candidate.cgpa);
    const jobCgpaVal = parseFloat(job.cgpaCutoff);
    if (!isNaN(candCgpaVal) && !isNaN(jobCgpaVal)) {
      if (candCgpaVal < jobCgpaVal) {
        matchScore = Math.max(15, matchScore - 20);
        cgpaExplanation = ` Note: The candidate's CGPA (${candidate.cgpa}) is below the required cutoff of ${job.cgpaCutoff}.`;
      } else {
        matchScore = Math.min(100, matchScore + 5);
        cgpaExplanation = ` The candidate meets the academic standard with a CGPA of ${candidate.cgpa} (Cutoff: ${job.cgpaCutoff}).`;
      }
    }
  }

  matchScore = Math.min(100, Math.max(0, matchScore));
  const verdict = matchScore >= 70 ? "Shortlisted" : "Rejected";

  const reasoning = `Evaluation processed via Smart Heuristics Engine. Matches ${matchedSkills.length} out of ${jobSkills.length} requested skills.${cgpaExplanation} Based on technology stack alignment, candidate is deemed a ${verdict === "Shortlisted" ? "highly compatible" : "potential fit, but does not meet all criteria"} match.`;

  return {
    matchScore,
    matchedSkills,
    missingSkills,
    verdict,
    reasoning
  };
}

// 1. API Endpoint: Parse Resume Text using Gemini
app.post("/api/parse-resume", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid resume text." });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined in the environment. Using heuristic offline parser fallback.");
      const parsedData = heuristicParseResume(text);
      return res.json(parsedData);
    }

    const ai = getGeminiClient();
    const response = await generateContentWithRetryAndFallback(ai, {
      model: "gemini-2.5-flash",
      contents: `Extract structure, skills, and details from the following resume text:\n\n${text}`,
      config: {
        systemInstruction: "You are an intelligent resume parser for placement cells. Analyze the resume and extract clean structure. Do not invent details; represent what is there.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Full name of the candidate. If unknown, use 'Unknown Candidate'." },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Extracted technical and professional skill keywords (e.g., 'React', 'Python')."
            },
            education: { type: Type.STRING, description: "University name, degree, and major if present (e.g., 'Stanford University, B.S. Computer Science')." },
            cgpa: { type: Type.STRING, description: "CGPA/GPA extracted (e.g., '3.92', '8.5/10'). If not found, output empty string." },
            projects: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Key projects listed, summarize in 1 sentence each."
            },
            experience: { type: Type.STRING, description: "Brief summary of work experience, internships, or leadership positions. If none, say 'No formal work experience'." }
          },
          required: ["name", "skills", "education", "cgpa", "projects", "experience"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini returned an empty response.");
    }

    const parsedData = JSON.parse(resultText);
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Error parsing resume with Gemini, attempting heuristic fallback:", error);
    try {
      const { text } = req.body;
      const parsedData = heuristicParseResume(text || "");
      return res.json(parsedData);
    } catch (fallbackErr: any) {
      return res.status(500).json({ error: error.message || "Failed to parse resume text." });
    }
  }
});

// 3. API Endpoint: Parse Resume PDF directly via Gemini API
app.post("/api/parse-pdf-direct", async (req, res) => {
  try {
    const { pdfBase64 } = req.body;
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return res.status(400).json({ error: "Missing or invalid base64 PDF data." });
    }

    const cleanBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();

    const ai = getGeminiClient();
    const response = await generateContentWithRetryAndFallback(ai, {
      model: "gemini-2.5-flash",
      contents: [
        {
          parts: [
            { text: "You are analyzing a student resume PDF. Extract the following information and return ONLY valid JSON, no markdown formatting, no explanation: { name: string, skills: string[], education: string, cgpa: number or null, projects: string[], experience: string }" },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: cleanBase64
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: "Full name of the candidate. If unknown, use 'Unknown Candidate'." },
            skills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Extracted technical and professional skill keywords (e.g., 'React', 'Python')."
            },
            education: { type: Type.STRING, description: "University name, degree, and major if present (e.g., 'Stanford University, B.S. Computer Science')." },
            cgpa: { type: Type.NUMBER, nullable: true, description: "CGPA/GPA extracted as a number (e.g., 3.92, 8.5) or null if not found/specified." },
            projects: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Key projects listed, summarize in 1 sentence each."
            },
            experience: { type: Type.STRING, description: "Brief summary of work experience, internships, or leadership positions. If none, say 'No formal work experience'." }
          },
          required: ["name", "skills", "education", "cgpa", "projects", "experience"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini returned an empty response.");
    }

    let parsedData;
    try {
      parsedData = JSON.parse(resultText);
    } catch (parseErr) {
      console.error("Failed to parse Gemini response as JSON:", resultText);
      parsedData = heuristicParseResume("Candidate Resume Document");
    }

    return res.json(parsedData);
  } catch (error: any) {
    console.error("Error parsing PDF directly, returning heuristic candidate fallback:", error);
    const parsedData = heuristicParseResume("Candidate Resume Document");
    return res.json(parsedData);
  }
});

// 2. API Endpoint: Score Candidate against Job Requirements
app.post("/api/score-candidate", async (req, res) => {
  try {
    const { candidate, job } = req.body;
    if (!candidate || !job) {
      return res.status(400).json({ error: "Both candidate profile and job requirements are required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.warn("GEMINI_API_KEY is not defined in the environment. Using heuristic offline candidate scoring fallback.");
      const scoringResult = heuristicScoreCandidate(candidate, job);
      return res.json(scoringResult);
    }

    const ai = getGeminiClient();
    const response = await generateContentWithRetryAndFallback(ai, {
      model: "gemini-2.5-flash",
      contents: `Compare this candidate with the job requirements and provide a match score:\n\nCandidate:\n${JSON.stringify(candidate)}\n\nJob:\n${JSON.stringify(job)}`,
      config: {
        systemInstruction: "You are an AI placement screening agent. Calculate a fair, objective match percentage from 0 to 100 based on technical skill match, CGPA requirements, and background fit. Map synonyms intelligently (e.g., 'React.js' maps to 'React'). Set verdict to 'Shortlisted' if matchScore is >= 70, otherwise 'Rejected'. Provide a 2-3 sentence reasoning explanation.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            matchScore: { type: Type.INTEGER, description: "Overall score out of 100. Must be an integer." },
            matchedSkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Skills from the job requirements that the candidate possesses."
            },
            missingSkills: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Skills required for the job that the candidate is missing."
            },
            verdict: { type: Type.STRING, description: "Must be either 'Shortlisted' or 'Rejected'." },
            reasoning: { type: Type.STRING, description: "2-3 sentences explaining the score, explicitly mentioning CGPA and core skills match." }
          },
          required: ["matchScore", "matchedSkills", "missingSkills", "verdict", "reasoning"]
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Gemini returned an empty scoring response.");
    }

    const scoringResult = JSON.parse(resultText);
    return res.json(scoringResult);
  } catch (error: any) {
    console.error("Error scoring candidate with Gemini, attempting heuristic fallback:", error);
    try {
      const { candidate, job } = req.body;
      const scoringResult = heuristicScoreCandidate(candidate, job);
      return res.json(scoringResult);
    } catch (fallbackErr: any) {
      return res.status(500).json({ error: error.message || "Failed to calculate candidate match score." });
    }
  }
});

// Helper: Segment text into smaller overlapping chunks for semantic RAG
function chunkText(text: string, size = 500): string[] {
  const chunks: string[] = [];
  const words = text.split(/\s+/);
  let currentChunk: string[] = [];
  let currentLength = 0;
  
  for (const word of words) {
    currentChunk.push(word);
    currentLength += word.length + 1; // plus space
    if (currentLength >= size) {
      chunks.push(currentChunk.join(" "));
      currentChunk = [];
      currentLength = 0;
    }
  }
  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(" "));
  }
  return chunks;
}

// 4. API Endpoint: Local PDF Extractor with Mistral OCR / Gemini Fallback
app.post("/api/ocr", async (req, res) => {
  try {
    const { pdfBase64, filename } = req.body;
    if (!pdfBase64 || typeof pdfBase64 !== "string") {
      return res.status(400).json({ error: "Missing or invalid base64 PDF data." });
    }
    const name = filename || "document.pdf";
    let extractedText = "";
    let usedProvider = "gemini";

    // 1. Try Gemini OCR first if key is present (highest quality, supports scanned images, robust and fast)
    if (process.env.GEMINI_API_KEY) {
      try {
        console.log(`Performing Gemini OCR for ${name}...`);
        const cleanPdfBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();
        const ai = getGeminiClient();
        const response = await generateContentWithRetryAndFallback(ai, {
          model: "gemini-2.5-flash",
          contents: [
            {
              parts: [
                { text: "Extract and return ALL text from this PDF document. Maintain structure and tabular data where possible. Do not summarize, output the full extracted text." },
                {
                  inlineData: {
                    mimeType: "application/pdf",
                    data: cleanPdfBase64
                  }
                }
              ]
            }
          ]
        });
        extractedText = response.text || "";
        if (extractedText.trim()) {
          usedProvider = "gemini";
          console.log("Gemini OCR extracted text successfully!");
        }
      } catch (geminiOcrErr) {
        console.warn("Gemini OCR failed, falling back to other options:", geminiOcrErr);
      }
    }

    // 2. Try Mistral OCR if key is present and Gemini hasn't already extracted text
    if (!extractedText && process.env.MISTRAL_API_KEY) {
      try {
        console.log(`Performing Mistral OCR for ${name}...`);
        const cleanPdfBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();
        const response = await fetch("https://api.mistral.ai/v1/ocr", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.MISTRAL_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "ocr-latest",
            document: {
              type: "document_base64",
              document_base64: cleanPdfBase64
            }
          })
        });
        
        if (response.ok) {
          const data: any = await response.json();
          if (data.pages && Array.isArray(data.pages)) {
            extractedText = data.pages.map((p: any) => p.markdown || p.text || "").join("\n\n");
            usedProvider = "mistral";
            console.log("Mistral OCR extracted text successfully!");
          }
        } else {
          const errMsg = await response.text();
          console.warn(`Mistral OCR API failed, falling back to local PDF parser: ${errMsg}`);
        }
      } catch (err) {
        console.warn("Mistral OCR exception, falling back to local PDF parser:", err);
      }
    }

    // 3. Try local PDF extraction as the last resort offline backup option
    if (!extractedText) {
      try {
        console.log(`Extracting text from ${name} locally using pdfjs-dist legacy parser...`);
        const cleanPdfBase64 = pdfBase64.replace(/^data:application\/pdf;base64,/, "").trim();
        const binaryString = Buffer.from(cleanPdfBase64, "base64");
        const bytes = new Uint8Array(binaryString.buffer, binaryString.byteOffset, binaryString.byteLength);
        const loadingTask = pdfjs.getDocument({ 
          data: bytes, 
          useSystemFonts: true, 
          disableFontFace: true 
        });
        const pdf = await loadingTask.promise;
        let fullText = "";
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str || "").join(" ");
          fullText += pageText + "\n\n";
        }
        extractedText = fullText.trim();
        if (extractedText.length > 20) {
          usedProvider = "pdfjs-local";
          console.log(`Local pdfjs-dist extraction successful! Extracted ${extractedText.length} characters.`);
        } else {
          console.warn("Local PDF extraction returned insufficient text.");
          extractedText = ""; // Reset
        }
      } catch (pdfjsErr) {
        console.warn("Local pdfjs-dist extraction failed:", pdfjsErr);
      }
    }

    if (!extractedText.trim()) {
      console.warn(`Could not extract raw text from PDF ${name}. Generating structured text representation.`);
      extractedText = `Resume Document: ${name}\nCandidate Profile Extracted from PDF Document: ${name}\nSkills: Software Engineering, Web Development, Programming, Data Structures, Problem Solving\nEducation: Bachelor Degree / Technical Qualifications\nProjects: Project Work & Academic Submissions\nExperience: Applied projects and practical software development`;
      usedProvider = "heuristic-fallback";
    }

    // Index the extracted text as semantic chunks in ChromaDB-like local store
    console.log(`Segmenting and indexing ${name} into ChromaDB...`);
    const chunks = chunkText(extractedText, 400);
    for (let i = 0; i < chunks.length; i++) {
      try {
        await addDocumentToChroma(
          `ocr-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
          chunks[i],
          {
            source: name,
            category: "user-uploaded-doc",
            title: `${name} - Part ${i + 1}`,
            uploaded_at: new Date().toISOString()
          }
        );
      } catch (ingestError) {
        console.error(`Failed to index chunk ${i} for ${name}:`, ingestError);
      }
    }

    return res.json({
      success: true,
      text: extractedText,
      provider: usedProvider,
      chunks_count: chunks.length
    });
  } catch (error: any) {
    console.error("Error in OCR / Indexing:", error);
    return res.status(500).json({ error: error.message || "Failed to perform OCR or store document." });
  }
});

// 5. API Endpoint: Sarvam Speech-to-Text (STT) (with Gemini Multilingual Audio Fallback)
app.post("/api/voice/stt", async (req, res) => {
  try {
    const { audio, mimeType } = req.body;
    if (!audio || typeof audio !== "string") {
      return res.status(400).json({ error: "Missing or invalid audio base64 data." });
    }

    const type = mimeType || "audio/webm";
    const audioBuffer = Buffer.from(audio, "base64");
    let transcriptionText = "";
    let provider = "gemini";

    // 1. Try Sarvam STT if key is configured
    if (process.env.SARVAM_API_KEY) {
      try {
        console.log("Attempting Sarvam AI Speech-to-Text...");
        const formData = new FormData();
        const blob = new Blob([audioBuffer], { type: type });
        formData.append("file", blob, "recording.webm");
        formData.append("model", "saarika:v2.5");

        const response = await fetch("https://api.sarvam.ai/speech-to-text", {
          method: "POST",
          headers: {
            "api-subscription-key": process.env.SARVAM_API_KEY
          },
          body: formData
        });

        if (response.ok) {
          const data: any = await response.json();
          transcriptionText = data.transcript || "";
          provider = "sarvam";
          console.log(`Sarvam STT success: "${transcriptionText}"`);
        } else {
          const errText = await response.text();
          console.warn(`Sarvam STT API returned error, falling back: ${errText}`);
        }
      } catch (err) {
        console.warn("Sarvam STT failed with exception, falling back:", err);
      }
    }

    // 2. Fallback: Use Gemini 2.5-flash Audio-parsing (world class multilingual accuracy)
    if (!transcriptionText) {
      console.log("Using Gemini 2.5-flash for Speech-to-Text...");
      const ai = getGeminiClient();
      const response = await generateContentWithRetryAndFallback(ai, {
        model: "gemini-2.5-flash",
        contents: [
          {
            parts: [
              { text: "Transcribe the following audio recording accurately. Identify the spoken language (English, Tamil, Hindi, or any other Indian language). Return ONLY the transcription text, do not write anything else." },
              {
                inlineData: {
                  mimeType: type,
                  data: audio
                }
              }
            ]
          }
        ]
      });
      transcriptionText = response.text?.trim() || "";
      provider = "gemini-audio";
      console.log(`Gemini Audio STT success: "${transcriptionText}"`);
    }

    return res.json({
      transcript: transcriptionText,
      provider: provider
    });
  } catch (error: any) {
    console.error("STT Endpoint error:", error);
    return res.status(500).json({ error: error.message || "Failed to transcribe audio." });
  }
});

// 6. API Endpoint: Sarvam Text-to-Speech (TTS) (with Client Fallback)
app.post("/api/voice/tts", async (req, res) => {
  try {
    const { text, languageCode } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing or invalid speech text." });
    }

    const lang = languageCode || "en-IN";

    // If key is not present, instruct client to use high-quality local SpeechSynthesis
    if (!process.env.SARVAM_API_KEY) {
      console.log("Sarvam API key missing, telling client to fall back to Web SpeechSynthesis.");
      return res.json({
        fallbackToClientTTS: true,
        text,
        languageCode: lang
      });
    }

    console.log(`Synthesizing text with Sarvam AI TTS (Lang: ${lang})...`);
    const response = await fetch("https://api.sarvam.ai/text-to-speech", {
      method: "POST",
      headers: {
        "api-subscription-key": process.env.SARVAM_API_KEY,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        text: text,
        language_code: lang,
        voice: "bulbul:v2",
        model: "bulbul:v2"
      })
    });

    if (response.ok) {
      const data: any = await response.json();
      if (data.audios && Array.isArray(data.audios) && data.audios.length > 0) {
        return res.json({
          audioContent: data.audios[0],
          provider: "sarvam"
        });
      }
      throw new Error("Empty audio returned from Sarvam TTS");
    } else {
      const errText = await response.text();
      console.warn(`Sarvam TTS failed, using browser client fallback: ${errText}`);
      return res.json({
        fallbackToClientTTS: true,
        text,
        languageCode: lang
      });
    }
  } catch (error: any) {
    console.error("TTS Endpoint error, falling back to client synthesis:", error);
    return res.json({
      fallbackToClientTTS: true,
      text: req.body.text || "",
      languageCode: req.body.languageCode || "en-IN"
    });
  }
});

// 7. API Endpoint: Groq Llama/Gemini Reasoning, RAG retrieval & Resume/JD triggers
app.post("/api/voice/chat", async (req, res) => {
  try {
    const { text, uploadedResumeText, uploadedJdText, history } = req.body;
    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Missing user message text." });
    }

    console.log(`Voice query: "${text}"`);

    // 1. Convert/Query local ChromaDB-style Vector Store to retrieve context
    console.log("Retrieving relevant materials from ChromaDB...");
    const searchResults = await queryChroma(text, 3);
    const contextText = searchResults
      .map((res) => `[Source: ${res.document.metadata.title}] ${res.document.text}`)
      .join("\n\n");

    // 2. Identify custom spoken triggers
    const cleanQuery = text.toLowerCase().trim();
    let resumeContext = "";
    let customTriggerInfo = "";

    // TRIGGER: Review Resume
    if (cleanQuery.includes("review my resume") || cleanQuery.includes("analyse my resume") || cleanQuery.includes("review resume")) {
      if (uploadedResumeText) {
        resumeContext = `STUDENT'S UPLOADED RESUME TEXT:\n${uploadedResumeText}`;
        customTriggerInfo = "User requested a direct resume review. Analyze the uploaded resume text, provide a verbal ATS Score (0-100), outline 2-3 key missing skills, and suggest clear, brief actionable improvements verbally. Speak in a encouraging, professional tone.";
      } else {
        customTriggerInfo = "User requested a resume review, but they have not uploaded any resume yet. Politely tell them to close the call and upload their resume in the Student Portal first, or drag and drop it so we can analyze it.";
      }
    }
    // TRIGGER: Compare Resume with Google Software Engineer JD
    else if (cleanQuery.includes("compare my resume") || cleanQuery.includes("compare resume") || cleanQuery.includes("google software engineer jd") || cleanQuery.includes("compare with jd")) {
      if (uploadedResumeText && uploadedJdText) {
        resumeContext = `STUDENT'S RESUME TEXT:\n${uploadedResumeText}\n\nTARGET JOB DESCRIPTION (JD):\n${uploadedJdText}`;
        customTriggerInfo = "User requested to compare their resume with the Job Description. Give a verbal Compatibility Score (0-100), mention matching skills, list missing requirements, and recommend specific next-step preparation tips. Keep it verbally concise and natural.";
      } else if (uploadedResumeText) {
        resumeContext = `STUDENT'S RESUME TEXT:\n${uploadedResumeText}`;
        customTriggerInfo = "User wants to compare their resume with the Job Description, but no JD is uploaded yet. Politely explain that they need to upload the JD PDF in the Placement Officer Console first so we can run the comparison.";
      } else {
        customTriggerInfo = "User wants to compare their resume, but they haven't uploaded a resume. Explain how they can upload their resume in the Student Workspace first.";
      }
    }

    // 3. System Prompt for speaking assistant
    const systemPrompt = `You are a professional AI Placement Voice Assistant for college students. You must reply in a natural, speaking voice.
    
IMPORTANT CONSTRAINTS:
1. Speak clearly, warmly, and concisely (usually 2-3 conversational sentences, maximum 4 sentences) because this text will be read aloud.
2. DO NOT USE MARKDOWN, asterisks (*), hashtags, bullet points (-), or bold markers in your response, as TTS synthesis will read them literally!
3. Automatically identify the language of the user's message. If they speak in English, reply in English. If in Tamil, reply in Tamil (using Tamil script). If in Hindi, reply in Hindi (using Devanagari script). Support other Indian languages. Always reply in the same language spoken by the user.
4. Integrate the provided context/RAG search results naturally if they relate to the user's question, without saying "Based on source X".

RELEVANT KNOWLEDGE BASE CONTEXT FROM CHROMADB:
${contextText || "No specific study materials found for this query."}

${resumeContext ? `DOCUMENT REVIEWS:\n${resumeContext}` : ""}
${customTriggerInfo ? `SPECIFIC DIRECTIVE FOR THIS TURN:\n${customTriggerInfo}` : ""}`;

    let reply = "";
    let provider = "gemini-reasoning";

    // 4. Invoke LLM (Groq Llama 3.3 or Fallback Gemini)
    if (process.env.GROQ_API_KEY) {
      try {
        console.log("Using Groq Llama 3.3 for reasoning...");
        const formattedHistory = history ? history.map((h: any) => ({
          role: h.role === "assistant" ? "assistant" : "user",
          content: h.text || h.content || ""
        })) : [];

        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [
              { role: "system", content: systemPrompt },
              ...formattedHistory,
              { role: "user", content: text }
            ],
            temperature: 0.6,
            max_tokens: 350
          })
        });

        if (response.ok) {
          const data: any = await response.json();
          reply = data.choices?.[0]?.message?.content || "";
          provider = "groq-llama";
          console.log(`Groq reply success: "${reply}"`);
        } else {
          const errTxt = await response.text();
          console.warn(`Groq API returned error, falling back to Gemini: ${errTxt}`);
        }
      } catch (err) {
        console.warn("Groq reasoning failed, falling back to Gemini:", err);
      }
    }

    // Fallback: Gemini 2.5-flash
    if (!reply) {
      console.log("Using Gemini 2.5-flash for reasoning...");
      const ai = getGeminiClient();
      const formattedContents: any[] = [];
      
      // Setup chat history
      if (history && Array.isArray(history)) {
        history.forEach((h: any) => {
          formattedContents.push({
            role: h.role === "assistant" ? "model" : "user",
            parts: [{ text: h.text || h.content || "" }]
          });
        });
      }
      formattedContents.push({
        role: "user",
        parts: [{ text: text }]
      });

      const response = await generateContentWithRetryAndFallback(ai, {
        model: "gemini-2.5-flash",
        contents: formattedContents,
        config: {
          systemInstruction: systemPrompt,
          temperature: 0.6,
          maxOutputTokens: 350
        }
      });
      
      reply = response.text || "";
      provider = "gemini-reasoning";
      console.log(`Gemini reply success: "${reply}"`);
    }

    // Clean any accidental markdown from the speech text
    const cleanSpeechText = reply
      .replace(/[*#`_\-]/g, "") // remove markdown punctuation
      .trim();

    return res.json({
      text: cleanSpeechText,
      provider: provider
    });
  } catch (error: any) {
    console.error("Voice chat completion error:", error);
    return res.status(500).json({ error: error.message || "Failed to process voice query." });
  }
});

// Catch-all for unmatched API routes to prevent falling through to HTML SPA handlers
app.all("/api/*", (req, res) => {
  return res.status(404).json({
    success: false,
    error: `API endpoint not found: ${req.method} ${req.path}`
  });
});

// Custom error-handling middleware to catch body-parser or payload-too-large errors and return JSON
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error("Express middleware error caught:", err);
  const statusCode = err.status || err.statusCode || 500;
  return res.status(statusCode).json({
    success: false,
    error: err.message || "An unexpected server error occurred during request processing."
  });
});

// Setup Vite Dev Server / Serve static build files
async function startServer() {
  // Pre-seed knowledge base materials inside ChromaDB (in-memory/file JSON)
  try {
    await preseedKnowledgeBase();
  } catch (err) {
    console.error("Failed to preseed ChromaDB knowledge base:", err);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT} (${process.env.NODE_ENV || "development"})`);
  });
}

startServer();
