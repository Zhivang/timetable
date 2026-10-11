import React from 'react';
import {
  Building2,
  DoorClosed,
  Users2,
  UserSquare2,
  BookOpenCheck,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  Database,
  Sparkles,
  Layers,
  ShieldCheck,
  CalendarCheck,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { SectionKey } from '../layout/Sidebar';

interface DashboardSectionProps {
  onNavigate: (section: SectionKey) => void;
}

export const DashboardSection: React.FC<DashboardSectionProps> = ({ onNavigate }) => {
  const {
    buildings,
    classrooms,
    cohorts,
    combinedClasses,
    teachers,
    subjectOfferings,
    academicSettings,
    warnings,
    isSampleDataLoaded,
    loadSampleDataset,
    loading,
    activeRun,
  } = useTimetable();

  const totalTeachingPeriods = subjectOfferings.reduce(
    (sum, s) => sum + (s.totalPeriodsPerWeek || 0),
    0
  );

  const totalTheoryPeriods = subjectOfferings.reduce(
    (sum, s) => sum + (s.theoryPeriods || 0),
    0
  );

  const totalPracticalPeriods = subjectOfferings.reduce(
    (sum, s) => sum + (s.flexiblePracticalPeriods || 0) + (s.dedicatedLabPeriods || 0),
    0
  );

  const totalRoomSlotsAvailable = classrooms.length * academicSettings.workingDays.length * academicSettings.periods.length;

  const criticalWarnings = warnings.filter((w) => w.level === 'critical');
  const advisoryWarnings = warnings.filter((w) => w.level === 'warning');

  const statCards = [
    {
      label: 'Campus Buildings',
      value: buildings.length,
      icon: Building2,
      color: 'blue',
      section: 'buildings_classrooms' as SectionKey,
      subtext: `${classrooms.length} total rooms registered`,
    },
    {
      label: 'Classrooms & Labs',
      value: classrooms.length,
      icon: DoorClosed,
      color: 'emerald',
      section: 'buildings_classrooms' as SectionKey,
      subtext: `${classrooms.filter((r) => r.isDedicatedLab).length} dedicated computer labs`,
    },
    {
      label: 'Student Cohorts',
      value: cohorts.length,
      icon: Users2,
      color: 'purple',
      section: 'cohorts_combined' as SectionKey,
      subtext: `${combinedClasses.length} combined multi-cohort class${combinedClasses.length === 1 ? '' : 'es'}`,
    },
    {
      label: 'Faculty Teachers',
      value: teachers.length,
      icon: UserSquare2,
      color: 'amber',
      section: 'teachers' as SectionKey,
      subtext: `${teachers.reduce((acc, t) => acc + (t.maxWeeklyPeriods || 0), 0)} max weekly period cap`,
    },
    {
      label: 'Subject Offerings',
      value: subjectOfferings.length,
      icon: BookOpenCheck,
      color: 'indigo',
      section: 'subjects' as SectionKey,
      subtext: `${totalTheoryPeriods} Theory + ${totalPracticalPeriods} Practical`,
    },
    {
      label: 'Weekly Periods Required',
      value: totalTeachingPeriods,
      icon: Clock,
      color: 'rose',
      section: 'subjects' as SectionKey,
      subtext: `Across ${academicSettings.workingDays.length} days (${academicSettings.periods.length} periods/day)`,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Administrator Dashboard</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Academic Timetable Planning Overview
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Configure rooms, student cohorts, teaching loads, and constraint parameters.
            All records persist in Cloud Firestore and synchronize with the solver architecture.
          </p>
        </div>

        {!isSampleDataLoaded && (
          <div className="shrink-0">
            <button
              type="button"
              disabled={loading}
              onClick={loadSampleDataset}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <Database className="w-4 h-4" />
              <span>Load Demonstration Dataset</span>
            </button>
          </div>
        )}
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              onClick={() => onNavigate(card.section)}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{card.label}</span>
                <div className="p-2 rounded-lg bg-slate-50 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-2xl font-bold text-slate-900">{card.value}</span>
                <span className="text-[11px] text-slate-400 group-hover:text-blue-600 flex items-center gap-1 transition-colors">
                  Manage <ArrowRight className="w-3 h-3" />
                </span>
              </div>
              <p className="mt-1 text-xs text-slate-500">{card.subtext}</p>
            </div>
          );
        })}
      </div>

      {/* System Readiness & Warnings Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-4 h-4 ${warnings.length > 0 ? 'text-amber-500' : 'text-slate-400'}`} />
              <h3 className="text-sm font-bold text-slate-900">
                Pre-Solver Configuration & Feasibility Checks
              </h3>
            </div>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                criticalWarnings.length > 0
                  ? 'bg-red-50 text-red-700 border border-red-200'
                  : advisoryWarnings.length > 0
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}
            >
              {criticalWarnings.length > 0
                ? `${criticalWarnings.length} Blocking Issue${criticalWarnings.length === 1 ? '' : 's'}`
                : advisoryWarnings.length > 0
                ? `${advisoryWarnings.length} Advisory Note${advisoryWarnings.length === 1 ? '' : 's'}`
                : 'All Checks Passed'}
            </span>
          </div>

          {warnings.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <p className="font-semibold text-slate-800">
                Data model constraints are well-formed!
              </p>
              <p className="max-w-md mx-auto text-slate-500">
                Classroom capacities, period totals, teacher qualifications, and combined class requirements
                meet initial feasibility specifications.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1 space-y-1">
              {warnings.map((warn) => (
                <div key={warn.id} className="py-2.5 flex items-start justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <span
                      className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                        warn.level === 'critical' ? 'bg-red-500' : 'bg-amber-500'
                      }`}
                    />
                    <div>
                      <p className="font-medium text-slate-800">{warn.message}</p>
                      {warn.details && (
                        <p className="text-slate-500 text-[11px] mt-0.5">{warn.details}</p>
                      )}
                    </div>
                  </div>
                  {warn.actionTarget && (
                    <button
                      type="button"
                      onClick={() => onNavigate(warn.actionTarget as SectionKey)}
                      className="text-blue-600 hover:text-blue-800 font-semibold text-[11px] shrink-0"
                    >
                      Resolve &rarr;
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Solver Readiness Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">Solver Engine Status</h3>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1 text-xs">
              <div className="flex items-center justify-between font-semibold text-slate-800">
                <span>Target Engine</span>
                <span className="font-mono text-[11px] text-indigo-700">Google OR-Tools CP-SAT</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Solver Link</span>
                <span className="inline-flex items-center gap-1 text-amber-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  External Adapter Standby
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Timetable generation requires an authorized constraint solver service.
              View the Generation module for configuration diagnostics and AI constraint auditing.
            </p>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigate('generate')}
              className="w-full py-2 px-3 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Open Solver & Feasibility Audit
            </button>
            {activeRun && (
              <button
                type="button"
                onClick={() => onNavigate('results')}
                className="w-full py-2 px-3 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <CalendarCheck className="w-3.5 h-3.5" />
                View Active Schedule Results
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
