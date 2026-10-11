import React from 'react';
import { Check, X, HelpCircle, CheckCheck, Ban } from 'lucide-react';
import { AcademicPeriod, AvailabilityStatus } from '../../types';

interface PeriodAvailabilityGridProps {
  workingDays: string[];
  periods: AcademicPeriod[];
  availability: Record<string, AvailabilityStatus>;
  allowUnknown?: boolean; // Classrooms allow unknown, Teachers are strictly available/unavailable
  onChange: (newAvailability: Record<string, AvailabilityStatus>) => void;
  readOnly?: boolean;
}

export const PeriodAvailabilityGrid: React.FC<PeriodAvailabilityGridProps> = ({
  workingDays,
  periods,
  availability,
  allowUnknown = false,
  onChange,
  readOnly = false,
}) => {
  const getStatus = (day: string, periodNumber: number): AvailabilityStatus => {
    const key = `${day}_${periodNumber}`;
    return availability[key] || (allowUnknown ? 'unknown' : 'available');
  };

  const cycleStatus = (day: string, periodNumber: number) => {
    if (readOnly) return;
    const key = `${day}_${periodNumber}`;
    const current = getStatus(day, periodNumber);

    let next: AvailabilityStatus;
    if (allowUnknown) {
      if (current === 'available') next = 'unavailable';
      else if (current === 'unavailable') next = 'unknown';
      else next = 'available';
    } else {
      next = current === 'available' ? 'unavailable' : 'available';
    }

    onChange({
      ...availability,
      [key]: next,
    });
  };

  const handleSetAll = (status: AvailabilityStatus) => {
    if (readOnly) return;
    const updated: Record<string, AvailabilityStatus> = { ...availability };
    workingDays.forEach((day) => {
      periods.forEach((p) => {
        updated[`${day}_${p.periodNumber}`] = status;
      });
    });
    onChange(updated);
  };

  const handleSetDay = (day: string, status: AvailabilityStatus) => {
    if (readOnly) return;
    const updated: Record<string, AvailabilityStatus> = { ...availability };
    periods.forEach((p) => {
      updated[`${day}_${p.periodNumber}`] = status;
    });
    onChange(updated);
  };

  const renderCellContent = (status: AvailabilityStatus) => {
    switch (status) {
      case 'available':
        return (
          <div className="flex flex-col items-center justify-center p-1.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Check className="w-4 h-4 text-emerald-600" />
            <span className="text-[10px] font-semibold tracking-wide">AV</span>
          </div>
        );
      case 'unavailable':
        return (
          <div className="flex flex-col items-center justify-center p-1.5 rounded bg-red-50 text-red-700 border border-red-200">
            <X className="w-4 h-4 text-red-600" />
            <span className="text-[10px] font-semibold tracking-wide">UN</span>
          </div>
        );
      case 'unknown':
      default:
        return (
          <div className="flex flex-col items-center justify-center p-1.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
            <HelpCircle className="w-4 h-4 text-amber-600" />
            <span className="text-[10px] font-semibold tracking-wide">UNK</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-3">
      {!readOnly && (
        <div className="flex flex-wrap items-center justify-between gap-2 pb-1 text-xs">
          <div className="flex items-center gap-3">
            <span className="text-slate-500 font-medium">Quick Actions:</span>
            <button
              type="button"
              onClick={() => handleSetAll('available')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded border border-emerald-200 font-medium transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark All Available
            </button>
            <button
              type="button"
              onClick={() => handleSetAll('unavailable')}
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 hover:bg-red-100 rounded border border-red-200 font-medium transition-colors"
            >
              <Ban className="w-3.5 h-3.5" />
              Mark All Unavailable
            </button>
            {allowUnknown && (
              <button
                type="button"
                onClick={() => handleSetAll('unknown')}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded border border-amber-200 font-medium transition-colors"
              >
                <HelpCircle className="w-3.5 h-3.5" />
                Mark All Unknown
              </button>
            )}
          </div>
          <span className="text-slate-500 italic">Click any cell to toggle state</span>
        </div>
      )}

      {/* Availability Grid Table */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 shadow-xs bg-white">
        <table className="w-full border-collapse text-center text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
              <th className="py-2.5 px-3 text-left font-semibold w-28 border-r border-slate-200">Day</th>
              {periods.map((p) => (
                <th key={p.periodNumber} className="py-2.5 px-2 font-medium min-w-[70px]">
                  <div>{p.name}</div>
                  <div className="text-[10px] text-slate-500 font-normal">{p.startTime}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {workingDays.map((day) => (
              <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                <td className="py-2 px-3 text-left font-medium text-slate-800 bg-slate-50/30 border-r border-slate-200">
                  <div className="flex items-center justify-between">
                    <span>{day}</span>
                    {!readOnly && (
                      <div className="flex items-center gap-1 opacity-60 hover:opacity-100">
                        <button
                          type="button"
                          title={`Mark entire ${day} available`}
                          onClick={() => handleSetDay(day, 'available')}
                          className="p-0.5 text-emerald-600 hover:bg-emerald-50 rounded"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          title={`Mark entire ${day} unavailable`}
                          onClick={() => handleSetDay(day, 'unavailable')}
                          className="p-0.5 text-red-600 hover:bg-red-50 rounded"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </td>
                {periods.map((p) => {
                  const status = getStatus(day, p.periodNumber);
                  return (
                    <td
                      key={p.periodNumber}
                      onClick={() => cycleStatus(day, p.periodNumber)}
                      className={`p-1.5 transition-colors ${
                        readOnly ? 'cursor-default' : 'cursor-pointer hover:bg-slate-100'
                      }`}
                    >
                      {renderCellContent(status)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-6 text-xs text-slate-600 px-1">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-emerald-100 border border-emerald-300"></span>
          <span><strong>Available:</strong> Can be scheduled</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded bg-red-100 border border-red-300"></span>
          <span><strong>Unavailable:</strong> Hard constraint (Blocked)</span>
        </div>
        {allowUnknown && (
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-amber-100 border border-amber-300"></span>
            <span><strong>Unknown:</strong> Shared room (Scheduler will NOT assume available)</span>
          </div>
        )}
      </div>
    </div>
  );
};
