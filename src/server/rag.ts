import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";

export interface ChromaDocument {
  id: string;
  text: string;
  metadata: {
    source: string;
    category: string;
    title: string;
    [key: string]: any;
  };
  embedding?: number[];
}

const STORE_DIR = path.join(process.cwd(), "rag", "chromadb");
const STORE_FILE = path.join(STORE_DIR, "store.json");

// Lazy-initialized Gemini client for embedding generation
let internalAiClient: GoogleGenAI | null = null;
function getEmbeddingClient(): GoogleGenAI {
  if (!internalAiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required to generate embeddings for the vector store.");
    }
    internalAiClient = new GoogleGenAI({ apiKey });
  }
  return internalAiClient;
}

// Generate embedding for a single text chunk
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    const ai = getEmbeddingClient();
    const result = await ai.models.embedContent({
      model: "gemini-embedding-2-preview",
      contents: text,
    });
    
    const resAny = result as any;
    if (resAny.embedding?.values) {
      return resAny.embedding.values;
    }
    if (resAny.embeddings && resAny.embeddings[0]?.values) {
      return resAny.embeddings[0].values;
    }
    throw new Error("Empty embedding returned from Gemini");
  } catch (error) {
    console.error("Error generating embedding, using mock vector fallback:", error);
    // Simple pseudo-embedding fallback in case of rate limits or key failures so the app stays functional
    const vec: number[] = [];
    for (let i = 0; i < 768; i++) {
      let sum = 0;
      for (let j = 0; j < text.length; j++) {
        sum += text.charCodeAt(j) * (i + 1);
      }
      vec.push(Math.sin(sum) * 0.1);
    }
    return vec;
  }
}

// Calculate Cosine Similarity
export function calculateCosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Load documents from the JSON file
export function loadDocuments(): ChromaDocument[] {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    if (!fs.existsSync(STORE_FILE)) {
      fs.writeFileSync(STORE_FILE, JSON.stringify([]));
      return [];
    }
    const data = fs.readFileSync(STORE_FILE, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading documents from store.json:", error);
    return [];
  }
}

// Save documents to the JSON file
export function saveDocuments(docs: ChromaDocument[]) {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
    fs.writeFileSync(STORE_FILE, JSON.stringify(docs, null, 2), "utf-8");
  } catch (error) {
    console.error("Error saving documents to store.json:", error);
  }
}

// Add a document to ChromaDB-like store
export async function addDocumentToChroma(
  id: string,
  text: string,
  metadata: { source: string; category: string; title: string; [key: string]: any }
): Promise<ChromaDocument> {
  const docs = loadDocuments();
  
  // Remove existing doc with same ID to avoid duplicates
  const filteredDocs = docs.filter((d) => d.id !== id);
  
  console.log(`Generating embedding for document: ${metadata.title} (${id})`);
  const embedding = await getEmbedding(text);
  
  const newDoc: ChromaDocument = {
    id,
    text,
    metadata,
    embedding,
  };
  
  filteredDocs.push(newDoc);
  saveDocuments(filteredDocs);
  return newDoc;
}

// Search documents in ChromaDB-like store
export async function queryChroma(queryText: string, limit = 4): Promise<Array<{ document: ChromaDocument; score: number }>> {
  const docs = loadDocuments();
  if (docs.length === 0) {
    return [];
  }
  
  const queryEmbed = await getEmbedding(queryText);
  const results = docs.map((doc) => {
    const similarity = doc.embedding 
      ? calculateCosineSimilarity(queryEmbed, doc.embedding) 
      : 0;
    return {
      document: doc,
      score: similarity,
    };
  });
  
  // Sort descending by score
  results.sort((a, b) => b.score - a.score);
  return results.slice(0, limit);
}

// Pre-populate standard Knowledge Base documents if the store is empty
export async function preseedKnowledgeBase() {
  const docs = loadDocuments();
  if (docs.length > 5) {
    console.log("Knowledge base already seeded with", docs.length, "documents.");
    return;
  }
  
  console.log("Seeding ChromaDB knowledge base with placement study materials and prep guides...");
  
  const preseededMaterials = [
    {
      id: "kb-resume-tips",
      title: "ATS-Optimized Resume Writing Tips",
      category: "resume-tips",
      text: `Resume Writing and ATS Optimization Checklist:
1. Format: Always use a single-column clean layout. Multi-column resumes, tables, icons, and text boxes often break ATS parsers.
2. File Type: Save and submit in PDF format (.pdf) to preserve layout, unless DOCX is explicitly requested.
3. Action Verbs: Start bullet points with strong verbs (e.g., 'Implemented', 'Developed', 'Engineered', 'Optimized', 'Led').
4. Quantify Accomplishments: Do not just list duties. Use numbers (e.g., 'Reduced load times by 40%', 'Managed a database of 10,000+ users', 'Increased match accuracy by 15%').
5. Section Order: Top-down: Contact Information, Summary/Objective (optional), Technical Skills (categorized into Languages, Frameworks, Developer Tools), Work Experience (reverse chronological), Academic Projects, Education, Certifications.
6. Keyword Alignment: Match technical terms directly from the Job Description. If a JD says 'React.js', write 'React.js' instead of just 'React library'.
7. Length: Limit to 1 full page for college students and fresh graduates. Keep margins between 0.5 to 1 inch.`
    },
    {
      id: "kb-interview-questions",
      title: "Core SDE Behavioral & Technical Interview Guide",
      category: "interview-prep",
      text: `Placement Technical & Behavioral Interview Preparation Guide:
1. STAR Method for Behavioral Questions:
   - Situation: Set the scene (e.g., 'In my 3rd-year web project group...').
   - Task: Explain the challenge or target (e.g., 'We needed to integrate a real-time chat but the socket server kept crashing').
   - Action: What did YOU specifically do? (e.g., 'I implemented a Redis adapter for socket state scaling and added an exponential backoff retry').
   - Result: Concrete positive outcome (e.g., 'The system successfully supported 200 concurrent users with 0 failures').
2. Common Behavioral Questions:
   - 'Tell me about a time you faced a conflict in a team.' (Focus on communication, active listening, compromise, and constructive focus on objectives).
   - 'Tell me about your most challenging technical project.' (Focus on architecture decisions, debugging, overcoming bottlenecks, and performance analysis).
3. System Design Strategy:
   - Clarify requirements (Scale, Read/Write ratio, Latency targets).
   - Estimate capacity (storage, network bandwidth).
   - High-level design (Client -> Load Balancer -> Web Servers -> Database / Cache).
   - Core API design and database schema choices.`
    },
    {
      id: "kb-sql-notes",
      title: "Comprehensive SQL & Database Cheat Sheet",
      category: "sql",
      text: `SQL and Database Management Systems Notes:
1. Joins:
   - INNER JOIN: Returns records that have matching values in both tables.
   - LEFT JOIN: Returns all records from the left table, and matched records from the right. If no match, right side is NULL.
   - RIGHT JOIN: Returns all records from the right table, and matched records from the left.
   - FULL OUTER JOIN: Returns all records when there is a match in either left or right table.
2. GROUP BY and HAVING:
   - GROUP BY aggregates rows that have the same values (e.g., COUNT, SUM, AVG, MAX, MIN).
   - HAVING is used instead of WHERE to filter grouped records (e.g., HAVING COUNT(id) > 5).
3. Window Functions:
   - ROW_NUMBER(): Assigns a unique sequential integer to rows.
   - RANK(): Assigns rank with gaps if duplicates (e.g., 1, 2, 2, 4).
   - DENSE_RANK(): Assigns rank without gaps (e.g., 1, 2, 2, 3).
4. ACID Properties:
   - Atomicity: Entire transaction succeeds or fails together (all-or-nothing).
   - Consistency: Database moves from one valid state to another.
   - Isolation: Concurrent execution of transactions yields same state as sequential execution.
   - Durability: Once committed, changes survive system crashes.
5. Indexes: B-Tree and Hash indexes. Indexes speed up SELECT queries but slow down INSERT/UPDATE because the index structure must be maintained.`
    },
    {
      id: "kb-python-notes",
      title: "Core Python Programming Interview Concepts",
      category: "python",
      text: `Python Advanced Programming Concepts for Interviews:
1. List Comprehensions: Compact way to create lists, e.g., '[x**2 for x in range(10) if x % 2 == 0]'.
2. Decorators: A design pattern that allows modifying the behavior of a function or class. It wraps another function, e.g.,
   def my_decorator(func):
       def wrapper():
           print("Before call")
           func()
           print("After call")
       return wrapper
3. Generators: Functions that yield values lazily one at a time using 'yield' instead of returning a whole list. Saves immense memory.
4. Context Managers: Handled by 'with' statements, ensuring resources are properly closed (e.g., 'with open("file.txt") as f:'). Uses __enter__ and __exit__ methods under the hood.
5. Global Interpreter Lock (GIL): A mutex that protects access to Python objects, preventing multiple native threads from executing Python bytecodes at once. For CPU-bound tasks, use 'multiprocessing'; for I/O-bound tasks, use 'threading' or 'asyncio'.
6. Memory Management: Python uses automatic reference counting and a generational cyclic garbage collector.`
    },
    {
      id: "kb-fastapi-notes",
      title: "FastAPI Backend Framework Reference",
      category: "fastapi",
      text: `FastAPI High-Performance Web Development Guide:
1. Core Advantages: Extremely fast (built on Starlette and Pydantic), automatic OpenAPI/Swagger documentation, native async/await support, and developer friendly typing.
2. Dependency Injection: Uses 'Depends' to declare parameters or common database, security, or auth handlers easily.
3. Request Validation: Powered by Pydantic. You define structures as classes inheriting from 'BaseModel':
   class JobPosting(BaseModel):
       title: str
       salary_min: int
       requirements: list[str]
4. Async Path Handlers: Use 'async def' for endpoints that call asynchronous I/O tasks (e.g., database queries, network requests) to avoid blocking the single-threaded event loop.
5. Path vs Query parameters: '/items/{item_id}' binds item_id as a path parameter. '/items?limit=10' binds limit as a query parameter.
6. CORS: Add CORSMiddleware to allow requests from frontend origins like localhost:5173 or production domains.`
    },
    {
      id: "kb-placement-prep-pdf",
      title: "Campus Placement Preparation and Timeline PDF",
      category: "placement-prep",
      text: `Campus Placements Timeline and Master Preparation Plan:
1. Phase 1 (June - July): Focus on Data Structures (Arrays, Linked Lists, Trees, Graphs) and Algorithms (Sorting, Searching, Dynamic Programming, Greedy). Practice 150-200 LeetCode problems.
2. Phase 2 (August): Prepare core computer science subjects: Operating Systems (Processes, Threads, Virtual Memory, Deadlocks), DBMS (SQL joins, Normalization, ACID), Computer Networks (TCP/IP, OSI layers, HTTP protocols).
3. Phase 3 (September): Resume building. Create 2 strong projects (e.g., Full-Stack Web App, ML model). Prepare 1-minute elevator pitch and introduction.
4. Phase 4 (October onwards): Aptitude tests (quantitative analysis, logical reasoning, verbal ability) and Mock coding tests. Start actual hiring assessments.`
    },
    {
      id: "kb-company-experiences",
      title: "Google, Microsoft and Amazon Interview Experiences",
      category: "interview-experiences",
      text: `FAANG and SDE-1 Recruitment Loop Experiences:
1. Google software engineer hiring process:
   - Round 1: Online Coding Assessment (OA) on HackerEarth (typically 2 medium/hard algorithmic questions on graph or dynamic programming).
   - Round 2: Technical Phone Screen (45 mins) focusing on efficient DSA implementation, space/time complexity analysis.
   - Rounds 3-5: Onsite Coding Interviews (3 rounds). Focus is heavily on clean code, optimal data structures (like Tries, Segment Trees, or Priority Queues), and edge-case handling.
   - Round 6: Googleyness & Leadership (behavioral fit, cross-functional collaboration, adaptability).
2. Amazon SDE-1 process:
   - Coding OA (Debugging, Coding, Work Styles assessment).
   - Onsite Round 1 (Data Structures and Algorithms - focusing on HashMap, Trees, Heap).
   - Onsite Round 2 (Logical & Maintainable Code - design a clean, object-oriented system with interfaces).
   - Onsite Round 3 (Behavioral Round focused heavily on Amazon's 16 Leadership Principles: Customer Obsession, Ownership, Bias for Action, Deliver Results, etc., mapped to the STAR format).`
    }
  ];

  for (const item of preseededMaterials) {
    try {
      await addDocumentToChroma(
        item.id,
        item.text,
        {
          source: "system-kb",
          category: item.category,
          title: item.title,
        }
      );
    } catch (err) {
      console.error(`Error adding preseeded doc ${item.id}:`, err);
    }
  }
  console.log("Knowledge base successfully seeded with core placement notes!");
}
