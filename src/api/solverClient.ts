import {
  AcademicSettings,
  Building,
  Classroom,
  Cohort,
  CombinedClass,
  Teacher,
  SubjectOffering,
  SchedulingPreferences,
  TimetableRun,
} from '../types';

export interface SolverStatusResponse {
  configured: boolean;
  solverEngine: string;
  status: 'not_configured' | 'ready' | 'offline';
  serviceUrl: string | null;
  message: string;
}

export interface SolverGenerationRequest {
  academicSettings: AcademicSettings;
  buildings: Building[];
  classrooms: Classroom[];
  cohorts: Cohort[];
  combinedClasses: CombinedClass[];
  teachers: Teacher[];
  subjectOfferings: SubjectOffering[];
  schedulingPreferences: SchedulingPreferences;
}

export interface SolverGenerationResponse {
  success: boolean;
  status: string;
  run?: TimetableRun;
  error?: string;
}

export interface FeasibilityAuditResponse {
  analysis: string;
  timestamp: string;
  error?: string;
}

/**
 * Typed client for interacting with the server-mediated scheduling solver and feasibility diagnostic API.
 * Future Python OR-Tools microservices connect seamlessly via the backend proxy endpoints.
 */
export const solverClient = {
  /**
   * Check connection status of the backend solver service.
   */
  async getStatus(): Promise<SolverStatusResponse> {
    try {
      const res = await fetch('/api/solver/status');
      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      return {
        configured: false,
        solverEngine: 'Google OR-Tools (CP-SAT)',
        status: 'offline',
        serviceUrl: null,
        message: err.message || 'Unable to communicate with timetable server.',
      };
    }
  },

  /**
   * Triggers the constraint optimization solver.
   * Truthfully returns error when the external solver engine is not connected.
   */
  async generateTimetable(payload: SolverGenerationRequest): Promise<SolverGenerationResponse> {
    try {
      const res = await fetch('/api/solver/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      return data;
    } catch (err: any) {
      return {
        success: false,
        status: 'error',
        error: err.message || 'Solver network communication error.',
      };
    }
  },

  /**
   * Runs an academic feasibility and constraint satisfaction pre-audit using Gemini intelligence.
   */
  async runFeasibilityAudit(payload: SolverGenerationRequest): Promise<FeasibilityAuditResponse> {
    const res = await fetch('/api/ai/audit-feasibility', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `Feasibility audit failed with HTTP ${res.status}`);
    }

    return await res.json();
  },
};
