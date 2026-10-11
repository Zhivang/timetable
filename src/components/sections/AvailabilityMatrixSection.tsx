import React, { useState } from 'react';
import {
  Grid3X3,
  DoorClosed,
  UserSquare2,
  CheckCircle,
  XCircle,
  HelpCircle,
  Search,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { AvailabilityStatus } from '../../types';

export const AvailabilityMatrixSection: React.FC = () => {
  const { classrooms, teachers, academicSettings, updateClassroom, updateTeacher } = useTimetable();

  const [activeTab, setActiveTab] = useState<'rooms' | 'teachers'>('rooms');
  const [selectedDay, setSelectedDay] = useState<string>(
    academicSettings.workingDays[0] || 'Monday'
  );
  const [searchTerm, setSearchTerm] = useState('');

  const workingDays = academicSettings.workingDays;
  const periods = academicSettings.periods;

  const filteredClassrooms = classrooms.filter((r) =>
    r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    r.buildingName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTeachers = teachers.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate day-wide bottleneck summary:
  const dayStats = periods.map((p) => {
    const key = `${selectedDay}_${p.periodNumber}`;
    const availableRooms = classrooms.filter(
      (r) => (r.availability[key] || (r.isShared ? 'unknown' : 'available')) === 'available'
    ).length;
    const availableTeachers = teachers.filter(
      (t) => (t.availability[key] || 'available') === 'available'
    ).length;

    return {
      periodNumber: p.periodNumber,
      name: p.name,
      time: p.startTime,
      availableRooms,
      availableTeachers,
      isRoomBottleneck: availableRooms === 0 && classrooms.length > 0,
      isTeacherBottleneck: availableTeachers === 0 && teachers.length > 0,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Cross-Entity Availability Matrix
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Global timetable grid inspection across physical classrooms and academic instructors.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('rooms')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'rooms'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Classrooms ({classrooms.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('teachers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
              activeTab === 'teachers'
                ? 'bg-white text-blue-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Faculty Teachers ({teachers.length})
          </button>
        </div>
      </div>

      {/* Day Selector & Search Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Day Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-slate-400 font-medium mr-1">Working Day:</span>
          {workingDays.map((day) => (
            <button
              type="button"
              key={day}
              onClick={() => setSelectedDay(day)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer ${
                selectedDay === day
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {day}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-2 text-slate-400" />
          <input
            type="text"
            placeholder={activeTab === 'rooms' ? 'Search rooms...' : 'Search teachers...'}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Hourly Availability Heatstrip */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900">
            {selectedDay} Capacity & Supply Strip
          </h3>
          <span className="text-[11px] text-slate-500">
            Available entities per lecture period
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2 text-xs">
          {dayStats.map((stat) => (
            <div
              key={stat.periodNumber}
              className={`p-3 rounded-lg border text-center space-y-1 ${
                stat.isRoomBottleneck || stat.isTeacherBottleneck
                  ? 'bg-red-50 border-red-200 text-red-900'
                  : 'bg-slate-50 border-slate-200 text-slate-800'
              }`}
            >
              <div className="font-bold text-slate-900">{stat.name}</div>
              <div className="text-[10px] text-slate-500">{stat.time}</div>
              <div className="pt-1 border-t border-slate-200/60 text-[11px] space-y-0.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Rooms:</span>
                  <span className="font-semibold text-emerald-700">{stat.availableRooms}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Teachers:</span>
                  <span className="font-semibold text-blue-700">{stat.availableTeachers}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Full Matrix Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800">
            {activeTab === 'rooms' ? 'Classrooms' : 'Teachers'} Availability Grid ({selectedDay})
          </span>
          <div className="flex items-center gap-4 text-[11px]">
            <span className="flex items-center gap-1 text-emerald-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Available
            </span>
            <span className="flex items-center gap-1 text-red-700">
              <span className="w-2 h-2 rounded-full bg-red-500"></span> Unavailable
            </span>
            {activeTab === 'rooms' && (
              <span className="flex items-center gap-1 text-amber-700">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span> Unknown
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-center border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-2.5 px-4 text-left font-bold min-w-[200px] border-r border-slate-200">
                  {activeTab === 'rooms' ? 'Room Name / Building' : 'Instructor / Department'}
                </th>
                {periods.map((p) => (
                  <th key={p.periodNumber} className="py-2.5 px-3 min-w-[90px]">
                    <div>{p.name}</div>
                    <div className="text-[10px] text-slate-400 font-normal">{p.startTime}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {activeTab === 'rooms' ? (
                filteredClassrooms.map((room) => (
                  <tr key={room.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-left border-r border-slate-200">
                      <div className="font-bold text-slate-900">{room.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {room.buildingName} • Cap {room.capacity}
                      </div>
                    </td>
                    {periods.map((p) => {
                      const key = `${selectedDay}_${p.periodNumber}`;
                      const status: AvailabilityStatus =
                        room.availability[key] || (room.isShared ? 'unknown' : 'available');
                      return (
                        <td key={p.periodNumber} className="p-2">
                          {status === 'available' && (
                            <span className="inline-flex items-center justify-center w-full py-1 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                              Available
                            </span>
                          )}
                          {status === 'unavailable' && (
                            <span className="inline-flex items-center justify-center w-full py-1 rounded bg-red-50 text-red-700 font-semibold text-[10px] border border-red-200">
                              Blocked
                            </span>
                          )}
                          {status === 'unknown' && (
                            <span className="inline-flex items-center justify-center w-full py-1 rounded bg-amber-50 text-amber-700 font-semibold text-[10px] border border-amber-200">
                              Unknown
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                filteredTeachers.map((teacher) => (
                  <tr key={teacher.id} className="hover:bg-slate-50/50">
                    <td className="py-2.5 px-4 text-left border-r border-slate-200">
                      <div className="font-bold text-slate-900">{teacher.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {teacher.title} • {teacher.department}
                      </div>
                    </td>
                    {periods.map((p) => {
                      const key = `${selectedDay}_${p.periodNumber}`;
                      const status = teacher.availability[key] || 'available';
                      return (
                        <td key={p.periodNumber} className="p-2">
                          {status === 'available' ? (
                            <span className="inline-flex items-center justify-center w-full py-1 rounded bg-emerald-50 text-emerald-700 font-semibold text-[10px] border border-emerald-200">
                              Available
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-full py-1 rounded bg-red-50 text-red-700 font-semibold text-[10px] border border-red-200">
                              Blocked
                            </span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
