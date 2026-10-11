import React from 'react';
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  Users2,
  UserSquare2,
  BookOpenCheck,
  Grid3X3,
  Sparkles,
  CalendarCheck2,
  BarChart3,
  AlertTriangle,
  GraduationCap,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';

export type SectionKey =
  | 'dashboard'
  | 'settings'
  | 'buildings_classrooms'
  | 'cohorts_combined'
  | 'teachers'
  | 'subjects'
  | 'availability'
  | 'generate'
  | 'results'
  | 'analytics';

interface SidebarProps {
  currentSection: SectionKey;
  onSelectSection: (section: SectionKey) => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentSection,
  onSelectSection,
  isOpenMobile,
  onCloseMobile,
}) => {
  const { warnings, buildings, classrooms, cohorts, combinedClasses, teachers, subjectOfferings } = useTimetable();

  const navigationItems = [
    {
      key: 'dashboard' as SectionKey,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: warnings.filter((w) => w.level === 'critical').length > 0 ? (
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      ) : null,
    },
    {
      key: 'settings' as SectionKey,
      label: 'Academic Settings',
      icon: CalendarDays,
    },
    {
      key: 'buildings_classrooms' as SectionKey,
      label: 'Buildings & Classrooms',
      icon: Building2,
      counter: classrooms.length,
    },
    {
      key: 'cohorts_combined' as SectionKey,
      label: 'Cohorts & Combined Classes',
      icon: Users2,
      counter: cohorts.length + combinedClasses.length,
    },
    {
      key: 'teachers' as SectionKey,
      label: 'Teachers',
      icon: UserSquare2,
      counter: teachers.length,
    },
    {
      key: 'subjects' as SectionKey,
      label: 'Subjects & Requirements',
      icon: BookOpenCheck,
      counter: subjectOfferings.length,
    },
    {
      key: 'availability' as SectionKey,
      label: 'Availability',
      icon: Grid3X3,
    },
    {
      key: 'generate' as SectionKey,
      label: 'Generate Timetable',
      icon: Sparkles,
      highlight: true,
    },
    {
      key: 'results' as SectionKey,
      label: 'Timetable Results',
      icon: CalendarCheck2,
    },
    {
      key: 'analytics' as SectionKey,
      label: 'Utilization Analytics',
      icon: BarChart3,
    },
  ];

  const handleSelect = (key: SectionKey) => {
    onSelectSection(key);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 flex flex-col transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-0 -translate-x-full'
        }`}
      >
        {/* Department Branding */}
        <div className="p-5 border-b border-slate-100 flex items-center gap-3">
          <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
              Timetable Planner
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">
              Academic Administration
            </p>
          </div>
        </div>

        {/* Navigation list */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Administration Modules
          </div>
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentSection === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleSelect(item.key)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold shadow-xs border border-blue-100/60'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                } ${item.highlight && !isActive ? 'hover:bg-indigo-50/60' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 ${
                      isActive
                        ? 'text-blue-600'
                        : item.highlight
                        ? 'text-indigo-500'
                        : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {item.badge}
                  {item.counter !== undefined && (
                    <span
                      className={`text-[11px] px-1.5 py-0.2 rounded-md ${
                        isActive
                          ? 'bg-blue-100/80 text-blue-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.counter}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Warning Indicator Footer */}
        {warnings.length > 0 && (
          <div className="p-3 mx-3 mb-3 bg-amber-50 rounded-xl border border-amber-200/80 text-xs">
            <div className="flex items-center gap-2 text-amber-800 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{warnings.length} Advisory {warnings.length === 1 ? 'Notice' : 'Notices'}</span>
            </div>
            <p className="mt-1 text-[11px] text-amber-700 leading-tight">
              Review configuration warnings in the Dashboard before generating timetables.
            </p>
          </div>
        )}
      </aside>
    </>
  );
};
