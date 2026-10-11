import React, { useState } from 'react';
import {
  CalendarCheck2,
  Users2,
  UserSquare2,
  DoorClosed,
  Printer,
  Download,
  Info,
  Layers,
  Sparkles,
  Building,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { TimetableSlot } from '../../types';

export const TimetableResultsSection: React.FC = () => {
  const {
    activeRun,
    cohorts,
    teachers,
    classrooms,
    academicSettings,
    loadSampleDataset,
  } = useTimetable();

  const [filterMode, setFilterMode] = useState<'cohort' | 'teacher' | 'room'>('cohort');
  const [selectedEntityId, setSelectedEntityId] = useState<string>('');

  const workingDays = academicSettings.workingDays;
  const periods = academicSettings.periods;

  // Set default selection when filter mode changes
  React.useEffect(() => {
    if (filterMode === 'cohort' && cohorts.length > 0 && !selectedEntityId) {
      setSelectedEntityId(cohorts[0].id);
    } else if (filterMode === 'teacher' && teachers.length > 0 && !selectedEntityId) {
      setSelectedEntityId(teachers[0].id);
    } else if (filterMode === 'room' && classrooms.length > 0 && !selectedEntityId) {
      setSelectedEntityId(classrooms[0].id);
    }
  }, [filterMode, cohorts, teachers, classrooms, selectedEntityId]);

  const slots = activeRun?.slots || [];

  // Filter slots for the current view
  const currentSlots = slots.filter((slot) => {
    if (filterMode === 'cohort') {
      return (
        slot.targetId === selectedEntityId ||
        (slot.cohortIds && slot.cohortIds.includes(selectedEntityId))
      );
    } else if (filterMode === 'teacher') {
      return slot.teacherId === selectedEntityId;
    } else if (filterMode === 'room') {
      return slot.classroomId === selectedEntityId;
    }
    return false;
  });

  // Helper to find slot in cell
  const getSlot = (day: string, periodNumber: number): TimetableSlot | undefined => {
    return currentSlots.find((s) => s.day === day && s.periodNumber === periodNumber);
  };

  const getEntityName = () => {
    if (filterMode === 'cohort') {
      const c = cohorts.find((item) => item.id === selectedEntityId);
      return c ? c.name : 'Selected Cohort';
    } else if (filterMode === 'teacher') {
      const t = teachers.find((item) => item.id === selectedEntityId);
      return t ? t.name : 'Selected Teacher';
    } else {
      const r = classrooms.find((item) => item.id === selectedEntityId);
      return r ? r.name : 'Selected Room';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-50 text-emerald-700 mb-2">
            <CalendarCheck2 className="w-3.5 h-3.5" />
            <span>Schedule Matrix Explorer</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Timetable Results & Views
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Examine the solved timetable by Student Cohort, Faculty Teacher, or Classroom.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Schedule
          </button>
        </div>
      </div>

      {/* Filter Mode Selector & Entity Dropdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4 text-xs">
        {/* Toggle Mode */}
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-700">Timetable View:</span>
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => {
                setFilterMode('cohort');
                if (cohorts.length > 0) setSelectedEntityId(cohorts[0].id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                filterMode === 'cohort'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users2 className="w-3.5 h-3.5" />
              Cohort View
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('teacher');
                if (teachers.length > 0) setSelectedEntityId(teachers[0].id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                filterMode === 'teacher'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserSquare2 className="w-3.5 h-3.5" />
              Teacher View
            </button>
            <button
              type="button"
              onClick={() => {
                setFilterMode('room');
                if (classrooms.length > 0) setSelectedEntityId(classrooms[0].id);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
                filterMode === 'room'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <DoorClosed className="w-3.5 h-3.5" />
              Room View
            </button>
          </div>
        </div>

        {/* Entity Selector Dropdown */}
        <div className="flex items-center gap-2 min-w-[260px]">
          <span className="font-semibold text-slate-700">Select:</span>
          <select
            value={selectedEntityId}
            onChange={(e) => setSelectedEntityId(e.target.value)}
            className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500"
          >
            {filterMode === 'cohort' &&
              cohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.studentCount} students)
                </option>
              ))}
            {filterMode === 'teacher' &&
              teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.department})
                </option>
              ))}
            {filterMode === 'room' &&
              classrooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.buildingName} - Cap {r.capacity})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Timetable Weekly Grid View */}
      {slots.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden print:border-none print:shadow-none">
          {/* Header banner */}
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>{getEntityName()}</span>
                <span className="text-xs font-normal text-slate-500">
                  • {academicSettings.semester}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {currentSlots.length} scheduled session periods this week
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-blue-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-blue-100 border border-blue-300"></span> Theory
              </span>
              <span className="flex items-center gap-1 text-emerald-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-100 border border-emerald-300"></span> Flex Practical
              </span>
              <span className="flex items-center gap-1 text-purple-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-sm bg-purple-100 border border-purple-300"></span> Dedicated Lab
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 text-slate-700 font-bold border-b border-slate-200">
                  <th className="py-3 px-3 text-left w-28 border-r border-slate-200">Period</th>
                  {workingDays.map((day) => (
                    <th key={day} className="py-3 px-2 text-center min-w-[130px] font-semibold border-r border-slate-200 last:border-r-0">
                      <div>{day}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {/* Periods 1 to 5 */}
                {periods.slice(0, 5).map((p) => (
                  <tr key={p.periodNumber} className="hover:bg-slate-50/30">
                    <td className="py-3 px-3 bg-slate-50/50 border-r border-slate-200 text-slate-800">
                      <div className="font-bold">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {p.startTime}–{p.endTime}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {p.durationMinutes}m
                      </div>
                    </td>
                    {workingDays.map((day) => {
                      const slot = getSlot(day, p.periodNumber);
                      return (
                        <td
                          key={day}
                          className="p-1.5 border-r border-slate-200 last:border-r-0 align-top"
                        >
                          {slot ? (
                            <div
                              className={`p-2.5 rounded-lg border shadow-2xs space-y-1 transition-all ${
                                slot.sessionType === 'dedicated_lab'
                                  ? 'bg-purple-50/80 border-purple-200 text-purple-950'
                                  : slot.sessionType === 'flexible_practical'
                                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                                  : 'bg-blue-50/80 border-blue-200 text-blue-950'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono font-bold text-xs">{slot.subjectCode}</span>
                                {slot.targetType === 'combined' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 flex items-center gap-0.5">
                                    <Layers className="w-2.5 h-2.5" />
                                    Comb
                                  </span>
                                )}
                              </div>
                              <div className="font-medium text-[11px] leading-tight line-clamp-1" title={slot.subjectName}>
                                {slot.subjectName}
                              </div>
                              <div className="pt-1 border-t border-slate-200/50 flex flex-col gap-0.5 text-[10px] text-slate-600">
                                <div>
                                  <strong>Room: </strong>{slot.classroomName}
                                </div>
                                <div>
                                  <strong>Teacher: </strong>{slot.teacherName}
                                </div>
                                {filterMode !== 'cohort' && (
                                  <div className="text-slate-500 truncate">
                                    <strong>Target: </strong>{slot.targetName}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="h-16 flex items-center justify-center text-slate-300 text-xs">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}

                {/* Non-teaching Lunch Break Row */}
                <tr className="bg-amber-50/40 border-y-2 border-amber-200">
                  <td className="py-2.5 px-3 bg-amber-50/70 border-r border-slate-200 font-bold text-amber-900 text-xs">
                    {academicSettings.lunchBreak.name}
                    <div className="text-[10px] font-mono text-amber-700">
                      {academicSettings.lunchBreak.startTime}–{academicSettings.lunchBreak.endTime}
                    </div>
                  </td>
                  <td
                    colSpan={workingDays.length}
                    className="py-2 px-4 text-center font-semibold text-amber-800 text-xs tracking-wider"
                  >
                    Non-Teaching Window • Dining & Campus Free Hour
                  </td>
                </tr>

                {/* Periods 6 and 7 */}
                {periods.slice(5).map((p) => (
                  <tr key={p.periodNumber} className="hover:bg-slate-50/30">
                    <td className="py-3 px-3 bg-slate-50/50 border-r border-slate-200 text-slate-800">
                      <div className="font-bold">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        {p.startTime}–{p.endTime}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {p.durationMinutes}m
                      </div>
                    </td>
                    {workingDays.map((day) => {
                      const slot = getSlot(day, p.periodNumber);
                      return (
                        <td
                          key={day}
                          className="p-1.5 border-r border-slate-200 last:border-r-0 align-top"
                        >
                          {slot ? (
                            <div
                              className={`p-2.5 rounded-lg border shadow-2xs space-y-1 transition-all ${
                                slot.sessionType === 'dedicated_lab'
                                  ? 'bg-purple-50/80 border-purple-200 text-purple-950'
                                  : slot.sessionType === 'flexible_practical'
                                  ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                                  : 'bg-blue-50/80 border-blue-200 text-blue-950'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-mono font-bold text-xs">{slot.subjectCode}</span>
                                {slot.targetType === 'combined' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 flex items-center gap-0.5">
                                    <Layers className="w-2.5 h-2.5" />
                                    Comb
                                  </span>
                                )}
                              </div>
                              <div className="font-medium text-[11px] leading-tight line-clamp-1" title={slot.subjectName}>
                                {slot.subjectName}
                              </div>
                              <div className="pt-1 border-t border-slate-200/50 flex flex-col gap-0.5 text-[10px] text-slate-600">
                                <div>
                                  <strong>Room: </strong>{slot.classroomName}
                                </div>
                                <div>
                                  <strong>Teacher: </strong>{slot.teacherName}
                                </div>
                                {filterMode !== 'cohort' && (
                                  <div className="text-slate-500 truncate">
                                    <strong>Target: </strong>{slot.targetName}
                                  </div>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div className="h-16 flex items-center justify-center text-slate-300 text-xs">
                              —
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-12 text-center text-xs text-slate-500 space-y-3">
          <CalendarCheck2 className="w-10 h-10 text-slate-400 mx-auto" />
          <h3 className="text-sm font-bold text-slate-800">
            No Generated Timetable Available
          </h3>
          <p className="max-w-md mx-auto text-slate-500">
            To view an authentic university schedule across all cohorts, load the demonstration dataset.
          </p>
          <button
            type="button"
            onClick={loadSampleDataset}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-indigo-700 transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Load Solved Demonstration Schedule
          </button>
        </div>
      )}
    </div>
  );
};
