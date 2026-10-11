export type AvailabilityStatus = 'available' | 'unavailable' | 'unknown';

export interface AcademicPeriod {
  periodNumber: number;
  name: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface LunchBreak {
  name: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface AcademicSettings {
  id: string;
  departmentName: string;
  semester: string;
  workingDays: string[];
  periods: AcademicPeriod[];
  lunchBreak: LunchBreak;
  interPeriodGapMinutes: number;
  transitionBufferSameBuilding: number;
  transitionBufferDifferentBuilding: number;
  updatedAt?: string;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  campusZone: string;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Classroom {
  id: string;
  buildingId: string;
  buildingName: string;
  name: string;
  capacity: number;
  isShared: boolean;
  canHostTheory: boolean;
  canHostLaptopPractical: boolean;
  isDedicatedLab: boolean;
  facilities: string[];
  installedSoftware: string[];
  // Key format: `${day}_${periodNumber}`
  availability: Record<string, AvailabilityStatus>;
  createdAt?: string;
  updatedAt?: string;
}

export interface Cohort {
  id: string;
  name: string;
  degreeProgramme: string;
  academicYear: string;
  studentCount: number;
  availabilityRestrictions?: Record<string, boolean>;
  schedulingPreferences?: {
    maxHoursPerDay?: number;
    preferredStartPeriod?: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface CombinedClass {
  id: string;
  name: string;
  cohortIds: string[];
  cohortNames: string[];
  expectedAttendance: number; // Administrator explicit entry (NOT blindly summed)
  createdAt?: string;
  updatedAt?: string;
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  title: string;
  department: string;
  subjectsCanTeach: string[];
  minWeeklyPeriods: number;
  maxWeeklyPeriods: number;
  // Key format: `${day}_${periodNumber}`
  availability: Record<string, 'available' | 'unavailable'>;
  preferences?: {
    preferMorning?: boolean;
    preferBlockTeaching?: boolean;
  };
  createdAt?: string;
  updatedAt?: string;
}

export type ClassSessionType = 'theory' | 'flexible_practical' | 'dedicated_lab';

export interface SubjectOffering {
  id: string;
  code: string;
  name: string;
  targetType: 'cohort' | 'combined';
  targetId: string;
  targetName: string;
  eligibleTeacherIds: string[];
  assignedTeacherId?: string; // Optional fixed teacher
  totalPeriodsPerWeek: number;
  theoryPeriods: number;
  flexiblePracticalPeriods: number;
  dedicatedLabPeriods: number;
  permissibleBlockLengths: number[]; // e.g. [1, 2]
  requiredSoftware: string[];
  requiredFacilities: string[];
  explicitMeetingPattern?: string; // e.g. "2+1+1"
  createdAt?: string;
  updatedAt?: string;
}

export interface SchedulingPreferences {
  id: string;
  // Soft optimization preferences with weights (1 to 10)
  minimizeRoomChanges: boolean;
  roomChangeWeight: number;
  minimizeBuildingChanges: boolean;
  buildingChangeWeight: number;
  avoidConsecutiveTheoryExceeding: number;
  minimizeTeacherGaps: boolean;
  teacherGapWeight: number;
  groupTeachingIntoCompactBlocks: boolean;
  avoidExcessivelyLongStudentDays: boolean;
  maxStudentPeriodsPerDay: number;
  distributeTeachingUniformly: boolean;
  updatedAt?: string;
}

export interface TimetableSlot {
  id: string;
  day: string;
  periodNumber: number;
  subjectOfferingId: string;
  subjectCode: string;
  subjectName: string;
  sessionType: ClassSessionType;
  classroomId: string;
  classroomName: string;
  buildingCode: string;
  teacherId: string;
  teacherName: string;
  targetType: 'cohort' | 'combined';
  targetId: string;
  targetName: string;
  cohortIds: string[]; // For filtering and combined classes
}

export interface TimetableRun {
  id: string;
  title: string;
  semester: string;
  status: 'not_configured' | 'queued' | 'solving' | 'solved' | 'infeasible' | 'error';
  statusMessage: string;
  slots: TimetableSlot[];
  metrics?: {
    totalSessions: number;
    roomUtilizationPercent: number;
    teacherWorkloadVariance: number;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface SystemWarning {
  id: string;
  level: 'critical' | 'warning' | 'info';
  category: 'classroom' | 'cohort' | 'teacher' | 'subject' | 'settings';
  message: string;
  details?: string;
  actionTarget?: string;
}
