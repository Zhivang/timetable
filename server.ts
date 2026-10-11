import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProd = process.env.NODE_ENV === 'production';
const PORT = 3000;

// Initialize server-side Gemini client
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Authorized admin emails list (server-enforced)
const AUTHORIZED_ADMIN_EMAILS = [
  'shivangshukla884@gmail.com',
];

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Health endpoint
  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'department-timetable-planner',
      timestamp: new Date().toISOString(),
    });
  });

  // Admin authorization check endpoint
  app.get('/api/auth/admin-list', (_req, res) => {
    res.json({
      authorizedEmails: AUTHORIZED_ADMIN_EMAILS,
    });
  });

  // Solver Status & Generation API (Communicates with Python OR-Tools microservice)
  app.get('/api/solver/status', async (_req, res) => {
    const solverUrl = process.env.SOLVER_SERVICE_URL;
    if (!solverUrl) {
      return res.json({
        configured: false,
        solverEngine: 'Google OR-Tools CP-SAT',
        status: 'not_configured',
        serviceUrl: null,
        message:
          'Solver not configured yet. Deploy solver-service to Google Cloud Run and set SOLVER_SERVICE_URL when ready.',
      });
    }

    try {
      const response = await fetch(`${solverUrl}/health`, { signal: AbortSignal.timeout(3000) });
      if (response.ok) {
        const data = await response.json();
        return res.json({
          configured: true,
          solverEngine: data.solverEngine || 'Google OR-Tools CP-SAT',
          status: 'ready',
          serviceUrl: solverUrl,
          message: 'Automated Python OR-Tools CP-SAT solver service is connected and operational.',
        });
      }
      return res.json({
        configured: false,
        solverEngine: 'Google OR-Tools CP-SAT',
        status: 'offline',
        serviceUrl: solverUrl,
        message: `Solver service responded with HTTP ${response.status}.`,
      });
    } catch (err: any) {
      return res.json({
        configured: false,
        solverEngine: 'Google OR-Tools CP-SAT',
        status: 'offline',
        serviceUrl: solverUrl,
        message: `Unable to reach solver service: ${err.message}`,
      });
    }
  });

  app.post('/api/solver/generate', async (req, res) => {
    const solverUrl = process.env.SOLVER_SERVICE_URL;
    if (!solverUrl) {
      return res.status(503).json({
        success: false,
        status: 'not_configured',
        error:
          'Solver not configured yet. Deploy solver-service to Google Cloud Run and set SOLVER_SERVICE_URL to enable automated solving.',
      });
    }

    try {
      const solverApiKey = process.env.SOLVER_API_KEY || '';
      const response = await fetch(`${solverUrl}/solve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': solverApiKey,
        },
        body: JSON.stringify(req.body),
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (err: any) {
      return res.status(502).json({
        success: false,
        status: 'error',
        error: `Failed to proxy request to solver service: ${err.message}`,
      });
    }
  });

  // Server-side AI Feasibility Audit (Gemini intelligence for deep constraint inspection)
  app.post('/api/ai/audit-feasibility', async (req, res) => {
    try {
      const { academicSettings, buildings, classrooms, cohorts, combinedClasses, teachers, subjectOfferings } = req.body;

      if (!subjectOfferings || !teachers || !classrooms) {
        return res.status(400).json({ error: 'Incomplete timetable configuration payload provided.' });
      }

      const prompt = `
You are a senior University Timetabling Systems Analyst and Operations Researcher.
Analyze the following university department timetable configuration and perform a rigorous Pre-Solver Constraint & Feasibility Audit.

Academic Settings:
${JSON.stringify(academicSettings || {}, null, 2)}

Total Buildings: ${buildings?.length || 0}
Classrooms (${classrooms?.length || 0}):
${(classrooms || []).map((c: any) => `- ${c.name} (${c.buildingName}): Capacity ${c.capacity}, Theory: ${c.canHostTheory}, LaptopPractical: ${c.canHostLaptopPractical}, DedicatedLab: ${c.isDedicatedLab}, Software: [${(c.installedSoftware || []).join(', ')}]`).join('\n')}

Cohorts (${cohorts?.length || 0}):
${(cohorts || []).map((co: any) => `- ${co.name}: ${co.studentCount} students`).join('\n')}

Combined Classes (${combinedClasses?.length || 0}):
${(combinedClasses || []).map((cc: any) => `- ${cc.name}: Attendance ${cc.expectedAttendance}, Cohorts: [${(cc.cohortNames || []).join(', ')}]`).join('\n')}

Teachers (${teachers?.length || 0}):
${(teachers || []).map((t: any) => `- ${t.name} (${t.title}): Min periods ${t.minWeeklyPeriods}, Max periods ${t.maxWeeklyPeriods}, Teaches: [${(t.subjectsCanTeach || []).join(', ')}]`).join('\n')}

Subject Offerings (${subjectOfferings?.length || 0}):
${(subjectOfferings || []).map((s: any) => `- [${s.code}] ${s.name} (for ${s.targetName}): Total ${s.totalPeriodsPerWeek} periods (Theory: ${s.theoryPeriods}, FlexPractical: ${s.flexiblePracticalPeriods}, DedicatedLab: ${s.dedicatedLabPeriods}), Eligible teachers: [${(s.eligibleTeacherIds || []).join(', ')}]`).join('\n')}

Perform a thorough, objective analysis addressing:
1. Overall Mathematical Feasibility Score (0-100%).
2. Hard Constraint Bottlenecks:
   - Classroom capacity vs cohort/combined class expected attendance.
   - Dedicated laboratory supply vs dedicated lab period demand.
   - Teacher total teaching workload bounds (sum of required periods vs teachers' min/max limits).
   - Cohort weekly period density across working days.
3. Soft Constraint Optimization Risks:
   - Transition feasibility between buildings with 5-minute inter-period gaps.
   - Potential student fatigue from consecutive blocks.
4. Actionable Administrator Recommendations:
   - Specific corrective steps before handing off to the solver.

Provide your response in clear, structured Markdown with crisp headings, bullet points, and high-impact university administration advice.
`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: prompt,
      });

      res.json({
        analysis: response.text || 'Feasibility analysis could not be generated.',
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      console.error('Error running AI feasibility audit:', error);
      res.status(500).json({
        error: error.message || 'Failed to complete constraint feasibility audit.',
      });
    }
  });

  // Setup Vite in Dev or static files in Prod
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Department Timetable Planner running at http://localhost:${PORT}`);
  });
}

startServer();
