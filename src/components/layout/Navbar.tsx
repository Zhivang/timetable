import React, { useState } from 'react';
import {
  Menu,
  Database,
  RefreshCw,
  LogOut,
  ShieldCheck,
  Building,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTimetable } from '../../context/TimetableContext';
import { ConfirmationModal } from '../common/ConfirmationModal';

interface NavbarProps {
  onToggleMobileSidebar: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onToggleMobileSidebar }) => {
  const { user, signOutUser } = useAuth();
  const {
    academicSettings,
    loadSampleDataset,
    resetToEmptyDataset,
    isSampleDataLoaded,
    dbConnected,
    loading,
  } = useTimetable();

  const [isSampleModalOpen, setIsSampleModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 shadow-2xs">
        {/* Left side: Hamburger & Department Title */}
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onToggleMobileSidebar}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 lg:hidden cursor-pointer"
            aria-label="Toggle navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                {academicSettings.departmentName}
              </h1>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                {academicSettings.semester}
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-500">
              <span className="flex items-center gap-1">
                <Building className="w-3 h-3 text-slate-400" />
                {academicSettings.workingDays.length} Working Days (Mon–Sat)
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                Firestore Connected
              </span>
            </div>
          </div>
        </div>

        {/* Right side: Actions & User */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Sample Data Toggle Action */}
          {!isSampleDataLoaded ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => setIsSampleModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg shadow-2xs transition-colors cursor-pointer"
              title="Populate authentic demonstration dataset"
            >
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Load Sample Data</span>
              <span className="sm:hidden">Sample</span>
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-md">
                Demonstration Sample Data Active
              </span>
              <button
                type="button"
                disabled={loading}
                onClick={() => setIsResetModalOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                title="Clear sample data back to clean configuration"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Dataset</span>
              </button>
            </div>
          )}

          {/* Admin User Info & Sign Out */}
          <div className="flex items-center gap-2 pl-2 sm:pl-3 border-l border-slate-200">
            <div className="hidden sm:block text-right">
              <div className="text-xs font-semibold text-slate-800 flex items-center justify-end gap-1">
                <span>{user?.displayName || 'Administrator'}</span>
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <div className="text-[10px] text-slate-500 truncate max-w-[150px]">
                {user?.email}
              </div>
            </div>

            <button
              type="button"
              onClick={signOutUser}
              className="p-2 text-slate-400 hover:text-red-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Confirmation for Loading Sample Data */}
      <ConfirmationModal
        isOpen={isSampleModalOpen}
        title="Load Demonstration Sample Dataset?"
        message="This will populate realistic university timetable data (3 buildings, 6 classrooms including dedicated AI and software labs, 4 cohorts, 1 combined class, 6 teachers, 8 subject offerings, and a demonstration solved schedule). All items will be clearly marked as sample data and saved persistently to Cloud Firestore."
        confirmText="Load Sample Data"
        variant="primary"
        onConfirm={async () => {
          setIsSampleModalOpen(false);
          await loadSampleDataset();
        }}
        onCancel={() => setIsSampleModalOpen(false)}
      />

      {/* Confirmation for Resetting Dataset */}
      <ConfirmationModal
        isOpen={isResetModalOpen}
        title="Clear All Dataset Records?"
        message="Are you sure you want to clear all buildings, rooms, cohorts, teachers, subjects, and generated schedules? Your base academic time settings (periods and working days) will remain preserved."
        confirmText="Clear Everything"
        variant="danger"
        onConfirm={async () => {
          setIsResetModalOpen(false);
          await resetToEmptyDataset();
        }}
        onCancel={() => setIsResetModalOpen(false)}
      />
    </>
  );
};
