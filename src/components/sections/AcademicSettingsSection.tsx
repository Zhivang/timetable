import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  Save,
  Check,
  Building,
  Coffee,
  Info,
  RotateCcw,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { AcademicPeriod, AcademicSettings } from '../../types';
import { DEFAULT_ACADEMIC_SETTINGS } from '../../data/sampleData';

const ALL_POSSIBLE_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export const AcademicSettingsSection: React.FC = () => {
  const { academicSettings, updateAcademicSettings } = useTimetable();

  const [formData, setFormData] = useState<AcademicSettings>({ ...academicSettings });
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync state if context changes externally
  React.useEffect(() => {
    setFormData({ ...academicSettings });
  }, [academicSettings]);

  const toggleDay = (day: string) => {
    const exists = formData.workingDays.includes(day);
    let updated: string[];
    if (exists) {
      if (formData.workingDays.length <= 1) {
        alert('At least one working day must remain configured.');
        return;
      }
      updated = formData.workingDays.filter((d) => d !== day);
    } else {
      updated = [...formData.workingDays, day];
    }
    setFormData({ ...formData, workingDays: updated });
  };

  const handlePeriodChange = (
    index: number,
    field: keyof AcademicPeriod,
    value: string | number
  ) => {
    const updated = [...formData.periods];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    // Recalculate duration if start and end change
    if (field === 'startTime' || field === 'endTime') {
      const s = field === 'startTime' ? (value as string) : updated[index].startTime;
      const e = field === 'endTime' ? (value as string) : updated[index].endTime;
      const [sh, sm] = s.split(':').map(Number);
      const [eh, em] = e.split(':').map(Number);
      if (!isNaN(sh) && !isNaN(sm) && !isNaN(eh) && !isNaN(em)) {
        const diff = eh * 60 + em - (sh * 60 + sm);
        if (diff > 0) {
          updated[index].durationMinutes = diff;
        }
      }
    }
    setFormData({ ...formData, periods: updated });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    await updateAcademicSettings(formData);
    setSaving(false);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  const handleResetToDefaults = () => {
    if (
      window.confirm(
        'Reset academic timetable settings and lecture periods to default university specifications?'
      )
    ) {
      setFormData({ ...DEFAULT_ACADEMIC_SETTINGS });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Academic Schedule & Period Settings
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure working days, lecture periods, non-teaching break windows, and room transition times.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaved ? (
              <>
                <Check className="w-4 h-4" />
                Saved to Firestore
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Department & Term Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-600" />
            Department & Term Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department Name
              </label>
              <input
                type="text"
                required
                value={formData.departmentName}
                onChange={(e) => setFormData({ ...formData, departmentName: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Semester / Academic Term
              </label>
              <input
                type="text"
                required
                value={formData.semester}
                onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Working Days Configuration */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CalendarDays className="w-4 h-4 text-slate-600" />
              Active Working Days ({formData.workingDays.length} Selected)
            </h3>
            <span className="text-xs text-slate-500">
              Monday through Saturday enabled initially
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
            {ALL_POSSIBLE_DAYS.map((day) => {
              const isChecked = formData.workingDays.includes(day);
              return (
                <button
                  type="button"
                  key={day}
                  onClick={() => toggleDay(day)}
                  className={`p-3 rounded-lg border text-xs font-semibold text-center transition-all cursor-pointer ${
                    isChecked
                      ? 'bg-blue-50 border-blue-300 text-blue-700 shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100'
                  }`}
                >
                  <div className="text-sm mb-1">{isChecked ? '✓' : '—'}</div>
                  <div>{day}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Lecture Periods Specification */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-600" />
                Configured Lecture Periods & Exact Timings
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Period 5 is 40 minutes (13:10–13:50), other teaching periods are 50 minutes. Durations are preserved accurately.
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                  <th className="py-2.5 px-3 w-16">Period #</th>
                  <th className="py-2.5 px-3">Display Name</th>
                  <th className="py-2.5 px-3 w-32">Start Time</th>
                  <th className="py-2.5 px-3 w-32">End Time</th>
                  <th className="py-2.5 px-3 w-28">Duration</th>
                  <th className="py-2.5 px-3">Status / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {formData.periods.slice(0, 5).map((p, idx) => (
                  <tr key={p.periodNumber} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-bold text-slate-800">{p.periodNumber}</td>
                    <td className="py-2 px-3">
                      <input
                        type="text"
                        value={p.name}
                        onChange={(e) => handlePeriodChange(idx, 'name', e.target.value)}
                        className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="time"
                        value={p.startTime}
                        onChange={(e) => handlePeriodChange(idx, 'startTime', e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                      />
                    </td>
                    <td className="py-2 px-3">
                      <input
                        type="time"
                        value={p.endTime}
                        onChange={(e) => handlePeriodChange(idx, 'endTime', e.target.value)}
                        className="px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                      />
                    </td>
                    <td className="py-2 px-3 font-semibold text-slate-700">
                      {p.durationMinutes} mins
                    </td>
                    <td className="py-2 px-3 text-slate-500">
                      {p.periodNumber === 5 ? (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium text-[11px]">
                          Pre-Lunch 40m period
                        </span>
                      ) : (
                        <span className="text-slate-600 text-[11px]">Standard 50m period</span>
                      )}
                    </td>
                  </tr>
                ))}

                {/* Non-teaching Lunch Break Highlight Row */}
                <tr className="bg-amber-50/60 border-y-2 border-amber-200">
                  <td className="py-3 px-3 font-bold text-amber-900 text-center">
                    <Coffee className="w-4 h-4 mx-auto text-amber-700" />
                  </td>
                  <td className="py-3 px-3 font-bold text-amber-900">
                    {formData.lunchBreak.name} (Non-teaching window)
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="time"
                      value={formData.lunchBreak.startTime}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lunchBreak: { ...formData.lunchBreak, startTime: e.target.value },
                        })
                      }
                      className="px-2 py-1 border border-amber-300 rounded text-xs font-mono bg-white"
                    />
                  </td>
                  <td className="py-3 px-3">
                    <input
                      type="time"
                      value={formData.lunchBreak.endTime}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          lunchBreak: { ...formData.lunchBreak, endTime: e.target.value },
                        })
                      }
                      className="px-2 py-1 border border-amber-300 rounded text-xs font-mono bg-white"
                    />
                  </td>
                  <td className="py-3 px-3 font-bold text-amber-800">
                    {formData.lunchBreak.durationMinutes} mins
                  </td>
                  <td className="py-3 px-3 text-amber-800 text-[11px] font-medium">
                    Strict non-teaching break; no classes may be scheduled
                  </td>
                </tr>

                {/* Afternoon periods 6 and 7 */}
                {formData.periods.slice(5).map((p, idx) => {
                  const actualIdx = idx + 5;
                  return (
                    <tr key={p.periodNumber} className="hover:bg-slate-50/50">
                      <td className="py-2 px-3 font-bold text-slate-800">{p.periodNumber}</td>
                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={p.name}
                          onChange={(e) => handlePeriodChange(actualIdx, 'name', e.target.value)}
                          className="w-full px-2 py-1 border border-slate-200 rounded text-xs"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="time"
                          value={p.startTime}
                          onChange={(e) => handlePeriodChange(actualIdx, 'startTime', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                        />
                      </td>
                      <td className="py-2 px-3">
                        <input
                          type="time"
                          value={p.endTime}
                          onChange={(e) => handlePeriodChange(actualIdx, 'endTime', e.target.value)}
                          className="px-2 py-1 border border-slate-200 rounded text-xs font-mono"
                        />
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-700">
                        {p.durationMinutes} mins
                      </td>
                      <td className="py-2 px-3 text-slate-500 text-[11px]">
                        Standard afternoon 50m period
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Transition Times & Gap Settings */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Inter-Period Gaps & Campus Transition Buffers
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Inter-Period Gap (Between Adjacent Periods)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="0"
                  max="30"
                  value={formData.interPeriodGapMinutes}
                  onChange={(e) =>
                    setFormData({ ...formData, interPeriodGapMinutes: Number(e.target.value) })
                  }
                  className="w-24 px-3 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                />
                <span className="text-xs text-slate-600">Minutes</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Fixed 5-minute transition gap present between period 1&rarr;2, 2&rarr;3, etc.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Same-Building Room Transition Time
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={formData.transitionBufferSameBuilding}
                  onChange={(e) =>
                    setFormData({ ...formData, transitionBufferSameBuilding: Number(e.target.value) })
                  }
                  className="w-24 px-3 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                />
                <span className="text-xs text-slate-600">Minutes</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Typical walk time between classrooms within the same campus building.
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <label className="block text-xs font-bold text-slate-800">
                Cross-Building Campus Transition Buffer
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  max="45"
                  value={formData.transitionBufferDifferentBuilding}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      transitionBufferDifferentBuilding: Number(e.target.value),
                    })
                  }
                  className="w-24 px-3 py-1.5 border border-slate-300 rounded text-xs bg-white font-mono"
                />
                <span className="text-xs text-slate-600">Minutes</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Minimum buffer required when a cohort or teacher moves between different buildings.
              </p>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
