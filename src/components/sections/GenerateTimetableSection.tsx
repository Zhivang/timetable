import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  AlertTriangle,
  Sliders,
  CheckCircle2,
  Lock,
  Layers,
  Cpu,
  BrainCircuit,
  RefreshCw,
  Info,
  Server,
  ArrowRight,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { SchedulingPreferences } from '../../types';
import { solverClient, SolverStatusResponse } from '../../api/solverClient';

export const GenerateTimetableSection: React.FC = () => {
  const {
    academicSettings,
    buildings,
    classrooms,
    cohorts,
    combinedClasses,
    teachers,
    subjectOfferings,
    schedulingPreferences,
    updateSchedulingPreferences,
    warnings,
  } = useTimetable();

  const [prefsForm, setPrefsForm] = useState<SchedulingPreferences>({
    ...schedulingPreferences,
  });
  const [isPrefsSaved, setIsPrefsSaved] = useState(false);

  // Solver Engine Status
  const [solverStatus, setSolverStatus] = useState<SolverStatusResponse>({
    configured: false,
    solverEngine: 'Google OR-Tools (CP-SAT v9.8)',
    status: 'not_configured',
    serviceUrl: null,
    message: 'Automated OR-Tools solver backend service is not yet connected.',
  });
  const [checkingSolver, setCheckingSolver] = useState(false);

  // AI Feasibility Audit State
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditReport, setAuditReport] = useState<string | null>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  useEffect(() => {
    setPrefsForm({ ...schedulingPreferences });
  }, [schedulingPreferences]);

  useEffect(() => {
    checkSolver();
  }, []);

  const checkSolver = async () => {
    setCheckingSolver(true);
    const res = await solverClient.getStatus();
    setSolverStatus(res);
    setCheckingSolver(false);
  };

  const handleSavePreferences = async () => {
    await updateSchedulingPreferences(prefsForm);
    setIsPrefsSaved(true);
    setTimeout(() => setIsPrefsSaved(false), 2000);
  };

  const handleRunAiFeasibilityAudit = async () => {
    setIsAuditing(true);
    setAuditError(null);
    try {
      const res = await solverClient.runFeasibilityAudit({
        academicSettings,
        buildings,
        classrooms,
        cohorts,
        combinedClasses,
        teachers,
        subjectOfferings,
        schedulingPreferences: prefsForm,
      });
      setAuditReport(res.analysis);
    } catch (err: any) {
      setAuditError(err.message || 'Feasibility audit failed to complete.');
    } finally {
      setIsAuditing(false);
    }
  };

  const criticalIssues = warnings.filter((w) => w.level === 'critical');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 mb-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>Constraint Programming & Optimization</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Generate Department Timetable
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Configure hard constraints and soft penalty weights, inspect pre-solver readiness, and trigger the optimization solver.
          </p>
        </div>

        <button
          type="button"
          onClick={handleRunAiFeasibilityAudit}
          disabled={isAuditing || subjectOfferings.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <BrainCircuit className="w-4 h-4" />
          {isAuditing ? 'Auditing Constraints...' : 'AI Constraint Feasibility Audit'}
        </button>
      </div>

      {/* Solver Connection Banner (Strictly truthful and transparent) */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold tracking-tight">
                Automated Scheduling Solver Engine
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Engine: {solverStatus.solverEngine}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
              {solverStatus.status === 'not_configured' ? 'Service Standby' : solverStatus.status}
            </span>
            <button
              type="button"
              onClick={checkSolver}
              className="p-1.5 text-slate-400 hover:text-white rounded-md transition-colors"
              title="Refresh Solver Connection"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${checkingSolver ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <p>
            <strong>Status Notice: </strong>
            {solverStatus.message}
          </p>
          <p className="text-slate-400 text-[11px]">
            In accordance with system specifications, timetable generation requires an authentic constraint optimization solver (such as Google OR-Tools CP-SAT).
            The Generate Timetable button will not fabricate toy or random schedules; it remains disabled until the dedicated optimization microservice is connected.
          </p>
        </div>

        {/* Generate Button (Disabled with clear explanation) */}
        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-800">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Lock className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              Automated Generation Disabled: Connect Python OR-Tools microservice via server endpoint.
            </span>
          </div>

          <button
            type="button"
            disabled
            className="px-5 py-2.5 rounded-lg text-xs font-bold bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-80"
          >
            Generate Optimal Timetable (Solver Offline)
          </button>
        </div>
      </div>

      {/* AI Feasibility Audit Output Modal / Section */}
      {auditReport && (
        <div className="bg-white rounded-xl border border-indigo-200 p-6 shadow-xs space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
            <div className="flex items-center gap-2 text-indigo-950">
              <BrainCircuit className="w-5 h-5 text-indigo-600" />
              <h3 className="text-sm font-bold">
                Pre-Solver Constraint & Mathematical Feasibility Audit (Gemini Intelligence)
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setAuditReport(null)}
              className="text-xs text-slate-400 hover:text-slate-600"
            >
              Dismiss
            </button>
          </div>

          <div className="prose prose-xs max-w-none text-slate-700 leading-relaxed overflow-x-auto bg-slate-50/60 p-4 rounded-xl border border-slate-200">
            <div className="whitespace-pre-wrap font-sans text-xs">{auditReport}</div>
          </div>
        </div>
      )}

      {auditError && (
        <div className="p-4 bg-red-50 rounded-xl border border-red-200 text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{auditError}</span>
        </div>
      )}

      {/* Hard Constraints & Soft Preferences Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hard Constraints (Always Enforced) */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-red-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Hard Constraints (Strict Mathematical Rules)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded">
              Non-Negotiable
            </span>
          </div>

          <p className="text-xs text-slate-500">
            Hard constraints must never be violated under any circumstance. Any timetable violating a hard constraint is invalid.
          </p>

          <div className="space-y-2.5 text-xs">
            {[
              {
                title: 'No Classroom Overlaps',
                desc: 'A classroom can host at most one session at any period.',
              },
              {
                title: 'No Teacher Overlaps',
                desc: 'A teacher can deliver at most one class at any period.',
              },
              {
                title: 'No Cohort Clashes',
                desc: 'A student cohort cannot be scheduled for two concurrent sessions.',
              },
              {
                title: 'Classroom Capacity Guarantee',
                desc: 'Classroom capacity >= expected attendance of scheduled session.',
              },
              {
                title: 'Teacher Hard Availability',
                desc: 'Zero sessions scheduled during teacher leave or blocked periods.',
              },
              {
                title: 'Room Hard Availability',
                desc: 'Never assign unavailable or unknown periods in shared/dedicated rooms.',
              },
              {
                title: 'Exact Required Teaching Periods',
                desc: 'Must schedule exactly the total required periods for each subject offering.',
              },
              {
                title: 'Dedicated Laboratory Compatibility',
                desc: 'Dedicated lab sessions require rooms tagged with needed software & hardware.',
              },
              {
                title: 'Combined Class Consistency',
                desc: 'Combined sessions reserve 1 room and 1 teacher for all participating cohorts.',
              },
              {
                title: 'Teacher Qualification Eligibility',
                desc: 'Only assign instructors from the declared eligible teacher set.',
              },
            ].map((hc) => (
              <div
                key={hc.title}
                className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold text-slate-800">{hc.title}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{hc.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Soft Preferences & Penalty Weights */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Configurable Soft Optimization Preferences
              </h3>
            </div>
            <button
              type="button"
              onClick={handleSavePreferences}
              className="text-xs font-semibold px-2.5 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors cursor-pointer"
            >
              {isPrefsSaved ? 'Saved' : 'Save Weights'}
            </button>
          </div>

          <p className="text-xs text-slate-500">
            Soft preferences guide the optimizer to find an operationally superior timetable without violating hard constraints.
          </p>

          <div className="space-y-4 text-xs">
            {/* Reduce Room Changes */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prefsForm.minimizeRoomChanges}
                    onChange={(e) =>
                      setPrefsForm({ ...prefsForm, minimizeRoomChanges: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Minimize Unnecessary Room Changes</span>
                </label>
                <span className="font-mono text-xs font-bold text-blue-700">
                  Weight: {prefsForm.roomChangeWeight}/10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={prefsForm.roomChangeWeight}
                onChange={(e) =>
                  setPrefsForm({ ...prefsForm, roomChangeWeight: Number(e.target.value) })
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Penalizes changing classrooms between adjacent periods for the same cohort.
              </p>
            </div>

            {/* Reduce Building Changes */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prefsForm.minimizeBuildingChanges}
                    onChange={(e) =>
                      setPrefsForm({ ...prefsForm, minimizeBuildingChanges: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Minimize Cross-Building Movements</span>
                </label>
                <span className="font-mono text-xs font-bold text-blue-700">
                  Weight: {prefsForm.buildingChangeWeight}/10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={prefsForm.buildingChangeWeight}
                onChange={(e) =>
                  setPrefsForm({ ...prefsForm, buildingChangeWeight: Number(e.target.value) })
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Respects 5m inter-period gaps by avoiding hurried cross-campus transitions.
              </p>
            </div>

            {/* Avoid Excessive Consecutive Theory */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">
                  Cap Consecutive Theory Periods
                </span>
                <span className="font-mono text-xs font-bold text-blue-700">
                  Max: {prefsForm.avoidConsecutiveTheoryExceeding} periods
                </span>
              </div>
              <div className="flex gap-2">
                {[2, 3, 4].map((val) => (
                  <button
                    type="button"
                    key={val}
                    onClick={() =>
                      setPrefsForm({ ...prefsForm, avoidConsecutiveTheoryExceeding: val })
                    }
                    className={`px-3 py-1 rounded border text-xs font-semibold cursor-pointer ${
                      prefsForm.avoidConsecutiveTheoryExceeding === val
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                  >
                    {val} Consecutive
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-500">
                Reduces student cognitive fatigue from back-to-back heavy lectures.
              </p>
            </div>

            {/* Minimize Teacher Fragmented Gaps */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-800 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={prefsForm.minimizeTeacherGaps}
                    onChange={(e) =>
                      setPrefsForm({ ...prefsForm, minimizeTeacherGaps: e.target.checked })
                    }
                    className="rounded text-blue-600"
                  />
                  <span>Reduce Isolated Teacher Gaps</span>
                </label>
                <span className="font-mono text-xs font-bold text-blue-700">
                  Weight: {prefsForm.teacherGapWeight}/10
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={prefsForm.teacherGapWeight}
                onChange={(e) =>
                  setPrefsForm({ ...prefsForm, teacherGapWeight: Number(e.target.value) })
                }
                className="w-full accent-blue-600 cursor-pointer"
              />
              <p className="text-[11px] text-slate-500">
                Avoids frustrating isolated single free periods between teaching hours.
              </p>
            </div>

            {/* Compact Blocks & Uniform Distribution */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefsForm.groupTeachingIntoCompactBlocks}
                  onChange={(e) =>
                    setPrefsForm({
                      ...prefsForm,
                      groupTeachingIntoCompactBlocks: e.target.checked,
                    })
                  }
                  className="rounded text-blue-600"
                />
                <div>
                  <div className="font-bold text-slate-800">Compact Blocks</div>
                  <div className="text-[10px] text-slate-500">Cluster teaching hours</div>
                </div>
              </label>

              <label className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={prefsForm.distributeTeachingUniformly}
                  onChange={(e) =>
                    setPrefsForm({
                      ...prefsForm,
                      distributeTeachingUniformly: e.target.checked,
                    })
                  }
                  className="rounded text-blue-600"
                />
                <div>
                  <div className="font-bold text-slate-800">Even Day Spread</div>
                  <div className="text-[10px] text-slate-500">Distribute across week</div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
