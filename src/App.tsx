import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { TimetableProvider, useTimetable } from './context/TimetableContext';
import { Sidebar, SectionKey } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { AuthScreen } from './components/auth/AuthScreen';
import { DashboardSection } from './components/sections/DashboardSection';
import { AcademicSettingsSection } from './components/sections/AcademicSettingsSection';
import { BuildingsClassroomsSection } from './components/sections/BuildingsClassroomsSection';
import { CohortsCombinedSection } from './components/sections/CohortsCombinedSection';
import { TeachersSection } from './components/sections/TeachersSection';
import { SubjectOfferingsSection } from './components/sections/SubjectOfferingsSection';
import { AvailabilityMatrixSection } from './components/sections/AvailabilityMatrixSection';
import { GenerateTimetableSection } from './components/sections/GenerateTimetableSection';
import { TimetableResultsSection } from './components/sections/TimetableResultsSection';
import { UtilizationAnalyticsSection } from './components/sections/UtilizationAnalyticsSection';
import { GraduationCap } from 'lucide-react';

const MainLayout: React.FC = () => {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { loading: dataLoading } = useTimetable();

  const [currentSection, setCurrentSection] = useState<SectionKey>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 bg-blue-600 text-white rounded-2xl animate-pulse shadow-md">
            <GraduationCap className="w-8 h-8" />
          </div>
          <div className="text-sm font-bold text-slate-800">Department Timetable Planner</div>
          <div className="text-xs text-slate-500">Verifying administrator authorization...</div>
        </div>
      </div>
    );
  }

  // Enforce Administrator-Only Access
  if (!user || !isAdmin) {
    return <AuthScreen />;
  }

  const renderSection = () => {
    switch (currentSection) {
      case 'dashboard':
        return <DashboardSection onNavigate={setCurrentSection} />;
      case 'settings':
        return <AcademicSettingsSection />;
      case 'buildings_classrooms':
        return <BuildingsClassroomsSection />;
      case 'cohorts_combined':
        return <CohortsCombinedSection />;
      case 'teachers':
        return <TeachersSection />;
      case 'subjects':
        return <SubjectOfferingsSection />;
      case 'availability':
        return <AvailabilityMatrixSection />;
      case 'generate':
        return <GenerateTimetableSection />;
      case 'results':
        return <TimetableResultsSection />;
      case 'analytics':
        return <UtilizationAnalyticsSection />;
      default:
        return <DashboardSection onNavigate={setCurrentSection} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans text-slate-900 antialiased">
      {/* Top Navigation */}
      <Navbar onToggleMobileSidebar={() => setIsMobileSidebarOpen(true)} />

      {/* Main App Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          currentSection={currentSection}
          onSelectSection={setCurrentSection}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">
            {renderSection()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <TimetableProvider>
        <MainLayout />
      </TimetableProvider>
    </AuthProvider>
  );
}
