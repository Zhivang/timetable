import React from 'react';
import {
  BarChart3,
  DoorClosed,
  UserSquare2,
  Users2,
  Clock,
  PieChart,
  Percent,
  TrendingUp,
  Cpu,
  Layers,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';

export const UtilizationAnalyticsSection: React.FC = () => {
  const {
    activeRun,
    classrooms,
    teachers,
    cohorts,
    subjectOfferings,
    academicSettings,
  } = useTimetable();

  const slots = activeRun?.slots || [];
  const totalWeeklyPossibleSlotsPerRoom =
    academicSettings.workingDays.length * academicSettings.periods.length;

  // 1. Classroom Utilization Calculation
  const roomStats = classrooms.map((room) => {
    const occupiedSlots = slots.filter((s) => s.classroomId === room.id).length;
    const utilizationRate =
      totalWeeklyPossibleSlotsPerRoom > 0
        ? Math.round((occupiedSlots / totalWeeklyPossibleSlotsPerRoom) * 100)
        : 0;
    return {
      id: room.id,
      name: room.name,
      building: room.buildingName,
      capacity: room.capacity,
      isDedicatedLab: room.isDedicatedLab,
      occupiedSlots,
      totalSlots: totalWeeklyPossibleSlotsPerRoom,
      utilizationRate,
    };
  });

  const overallRoomUtilization =
    roomStats.length > 0
      ? Math.round(
          roomStats.reduce((sum, r) => sum + r.utilizationRate, 0) / roomStats.length
        )
      : 0;

  // 2. Teacher Workload Utilization Calculation
  const teacherStats = teachers.map((teacher) => {
    const teachingSlots = slots.filter((s) => s.teacherId === teacher.id).length;
    const max = teacher.maxWeeklyPeriods || 14;
    const min = teacher.minWeeklyPeriods || 6;
    const loadPercent = Math.round((teachingSlots / max) * 100);
    return {
      id: teacher.id,
      name: teacher.name,
      department: teacher.department,
      teachingSlots,
      min,
      max,
      loadPercent,
      isUnderloaded: teachingSlots < min,
      isOverloaded: teachingSlots > max,
    };
  });

  // 3. Curriculum Mode Breakdown
  const totalSlots = slots.length;
  const theorySlots = slots.filter((s) => s.sessionType === 'theory').length;
  const flexPracticalSlots = slots.filter((s) => s.sessionType === 'flexible_practical').length;
  const dedicatedLabSlots = slots.filter((s) => s.sessionType === 'dedicated_lab').length;

  const theoryPercent = totalSlots > 0 ? Math.round((theorySlots / totalSlots) * 100) : 0;
  const flexPercent = totalSlots > 0 ? Math.round((flexPracticalSlots / totalSlots) * 100) : 0;
  const labPercent = totalSlots > 0 ? Math.round((dedicatedLabSlots / totalSlots) * 100) : 0;

  // 4. Daily Distribution
  const dailyDistribution = academicSettings.workingDays.map((day) => {
    const daySlots = slots.filter((s) => s.day === day).length;
    return { day, count: daySlots };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700 mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Operations Research & Space Metrics</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Department Utilization Analytics
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Quantify space utilization efficiency, instructor teaching bounds, and lecture session distributions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs px-3 py-1.5 rounded-lg bg-slate-100 font-semibold text-slate-700">
            {totalSlots} Active Timetable Sessions
          </span>
        </div>
      </div>

      {/* Primary KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Classroom Space Utilization</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{overallRoomUtilization}%</span>
            <span className="text-xs text-slate-500">average occupancy</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all"
              style={{ width: `${Math.min(overallRoomUtilization, 100)}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Theory Session Share</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{theoryPercent}%</span>
            <span className="text-xs text-slate-500">({theorySlots} periods)</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all"
              style={{ width: `${theoryPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Dedicated Lab Occupancy</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{labPercent}%</span>
            <span className="text-xs text-slate-500">({dedicatedLabSlots} periods)</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full mt-3 overflow-hidden">
            <div
              className="bg-purple-500 h-full rounded-full transition-all"
              style={{ width: `${labPercent}%` }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Working Days Scheduled</span>
            <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {academicSettings.workingDays.length} Days
            </span>
            <span className="text-xs text-slate-500">Mon through Sat</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-2">
            {academicSettings.periods.length} lecture periods / day
          </p>
        </div>
      </div>

      {/* Classroom Utilization Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <DoorClosed className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Classroom & Laboratory Space Utilization
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Weekly slots capacity: {totalWeeklyPossibleSlotsPerRoom} periods / room
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-3">Room</th>
                <th className="py-2.5 px-3">Building</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Capacity</th>
                <th className="py-2.5 px-3">Scheduled Periods</th>
                <th className="py-2.5 px-3 w-48">Occupancy Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {roomStats.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{r.name}</td>
                  <td className="py-2.5 px-3 text-slate-600">{r.building}</td>
                  <td className="py-2.5 px-3">
                    {r.isDedicatedLab ? (
                      <span className="px-2 py-0.5 rounded font-semibold text-purple-700 bg-purple-50 text-[10px]">
                        Dedicated Lab
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded font-medium text-slate-600 bg-slate-100 text-[10px]">
                        General Classroom
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 font-mono font-medium">{r.capacity} seats</td>
                  <td className="py-2.5 px-3 font-bold text-slate-800 font-mono">
                    {r.occupiedSlots} / {r.totalSlots} periods
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            r.utilizationRate > 80
                              ? 'bg-amber-500'
                              : r.utilizationRate > 0
                              ? 'bg-emerald-500'
                              : 'bg-slate-300'
                          }`}
                          style={{ width: `${r.utilizationRate}%` }}
                        />
                      </div>
                      <span className="font-mono font-bold text-slate-800 w-10 text-right">
                        {r.utilizationRate}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Teacher Workload Distribution */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <UserSquare2 className="w-4 h-4 text-slate-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Teacher Workload Distribution vs Constraints
            </h3>
          </div>
          <span className="text-xs text-slate-500">
            Monitored against configured Min and Max bounds
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teacherStats.map((t) => (
            <div key={t.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900">{t.name}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    t.isOverloaded
                      ? 'bg-red-50 text-red-700 border border-red-200'
                      : t.isUnderloaded
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {t.isOverloaded ? 'Over Limit' : t.isUnderloaded ? 'Under Min' : 'Target Met'}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">{t.department}</div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-slate-600">Assigned:</span>
                <span className="font-mono font-bold text-slate-900 text-sm">
                  {t.teachingSlots} periods
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500">
                <span>Contract Target:</span>
                <span className="font-mono">
                  {t.min}–{t.max} periods/week
                </span>
              </div>

              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden mt-1">
                <div
                  className={`h-full rounded-full ${
                    t.isOverloaded
                      ? 'bg-red-500'
                      : t.isUnderloaded
                      ? 'bg-amber-500'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(t.loadPercent, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Load Distribution Bar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-slate-600" />
          Weekly Teaching Periods Distribution Across Working Days
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 pt-2">
          {dailyDistribution.map((d) => (
            <div key={d.day} className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-center space-y-1">
              <span className="text-xs font-semibold text-slate-700">{d.day}</span>
              <div className="text-xl font-bold text-blue-700 font-mono">{d.count}</div>
              <span className="text-[10px] text-slate-400">lecture sessions</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
