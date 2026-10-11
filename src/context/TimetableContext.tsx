import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  deleteDoc,
  writeBatch,
  getDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType, testConnection } from '../firebase/config';
import { useAuth } from './AuthContext';
import {
  AcademicSettings,
  Building,
  Classroom,
  Cohort,
  CombinedClass,
  Teacher,
  SubjectOffering,
  SchedulingPreferences,
  TimetableRun,
  SystemWarning,
} from '../types';
import {
  DEFAULT_ACADEMIC_SETTINGS,
  DEFAULT_SCHEDULING_PREFERENCES,
  SAMPLE_BUILDINGS,
  SAMPLE_CLASSROOMS,
  SAMPLE_COHORTS,
  SAMPLE_COMBINED_CLASSES,
  SAMPLE_TEACHERS,
  SAMPLE_SUBJECT_OFFERINGS,
  SAMPLE_TIMETABLE_RUN,
} from '../data/sampleData';

interface TimetableContextType {
  academicSettings: AcademicSettings;
  buildings: Building[];
  classrooms: Classroom[];
  cohorts: Cohort[];
  combinedClasses: CombinedClass[];
  teachers: Teacher[];
  subjectOfferings: SubjectOffering[];
  schedulingPreferences: SchedulingPreferences;
  timetableRuns: TimetableRun[];
  activeRun: TimetableRun | null;
  warnings: SystemWarning[];
  loading: boolean;
  dbConnected: boolean;
  isSampleDataLoaded: boolean;

  // Actions
  updateAcademicSettings: (settings: AcademicSettings) => Promise<void>;
  addBuilding: (b: Omit<Building, 'id'>) => Promise<string>;
  updateBuilding: (id: string, b: Partial<Building>) => Promise<void>;
  deleteBuilding: (id: string) => Promise<{ success: boolean; reason?: string }>;

  addClassroom: (c: Omit<Classroom, 'id'>) => Promise<string>;
  updateClassroom: (id: string, c: Partial<Classroom>) => Promise<void>;
  deleteClassroom: (id: string) => Promise<{ success: boolean; reason?: string }>;

  addCohort: (c: Omit<Cohort, 'id'>) => Promise<string>;
  updateCohort: (id: string, c: Partial<Cohort>) => Promise<void>;
  deleteCohort: (id: string) => Promise<{ success: boolean; reason?: string }>;

  addCombinedClass: (cc: Omit<CombinedClass, 'id'>) => Promise<string>;
  updateCombinedClass: (id: string, cc: Partial<CombinedClass>) => Promise<void>;
  deleteCombinedClass: (id: string) => Promise<{ success: boolean; reason?: string }>;

  addTeacher: (t: Omit<Teacher, 'id'>) => Promise<string>;
  updateTeacher: (id: string, t: Partial<Teacher>) => Promise<void>;
  deleteTeacher: (id: string) => Promise<{ success: boolean; reason?: string }>;

  addSubjectOffering: (s: Omit<SubjectOffering, 'id'>) => Promise<string>;
  updateSubjectOffering: (id: string, s: Partial<SubjectOffering>) => Promise<void>;
  deleteSubjectOffering: (id: string) => Promise<{ success: boolean; reason?: string }>;

  updateSchedulingPreferences: (prefs: SchedulingPreferences) => Promise<void>;
  loadSampleDataset: () => Promise<void>;
  resetToEmptyDataset: () => Promise<void>;
  setActiveRun: (run: TimetableRun | null) => void;
}

const TimetableContext = createContext<TimetableContextType | undefined>(undefined);

export const TimetableProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin } = useAuth();
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Core Data State
  const [academicSettings, setAcademicSettings] = useState<AcademicSettings>(DEFAULT_ACADEMIC_SETTINGS);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [combinedClasses, setCombinedClasses] = useState<CombinedClass[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjectOfferings, setSubjectOfferings] = useState<SubjectOffering[]>([]);
  const [schedulingPreferences, setSchedulingPreferences] = useState<SchedulingPreferences>(DEFAULT_SCHEDULING_PREFERENCES);
  const [timetableRuns, setTimetableRuns] = useState<TimetableRun[]>([]);
  const [activeRun, setActiveRun] = useState<TimetableRun | null>(null);

  // Test Firestore Connection on Boot
  useEffect(() => {
    testConnection().then((ok) => setDbConnected(ok));
  }, []);

  // Listen to Firestore when user is authenticated admin
  useEffect(() => {
    if (!user || !isAdmin) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const unsubSettings = onSnapshot(
      doc(db, 'academicSettings', 'default'),
      (snapshot) => {
        if (snapshot.exists()) {
          setAcademicSettings(snapshot.data() as AcademicSettings);
        } else {
          // Initialize default in Firestore
          setDoc(doc(db, 'academicSettings', 'default'), DEFAULT_ACADEMIC_SETTINGS).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, 'academicSettings/default')
          );
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'academicSettings/default')
    );

    const unsubPrefs = onSnapshot(
      doc(db, 'schedulingPreferences', 'default'),
      (snapshot) => {
        if (snapshot.exists()) {
          setSchedulingPreferences(snapshot.data() as SchedulingPreferences);
        } else {
          setDoc(doc(db, 'schedulingPreferences', 'default'), DEFAULT_SCHEDULING_PREFERENCES).catch((err) =>
            handleFirestoreError(err, OperationType.WRITE, 'schedulingPreferences/default')
          );
        }
      },
      (error) => handleFirestoreError(error, OperationType.GET, 'schedulingPreferences/default')
    );

    const unsubBuildings = onSnapshot(
      collection(db, 'buildings'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Building));
        setBuildings(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'buildings')
    );

    const unsubClassrooms = onSnapshot(
      collection(db, 'classrooms'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Classroom));
        setClassrooms(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'classrooms')
    );

    const unsubCohorts = onSnapshot(
      collection(db, 'cohorts'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Cohort));
        setCohorts(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'cohorts')
    );

    const unsubCombined = onSnapshot(
      collection(db, 'combinedClasses'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CombinedClass));
        setCombinedClasses(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'combinedClasses')
    );

    const unsubTeachers = onSnapshot(
      collection(db, 'teachers'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Teacher));
        setTeachers(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'teachers')
    );

    const unsubSubjects = onSnapshot(
      collection(db, 'subjectOfferings'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as SubjectOffering));
        setSubjectOfferings(list);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, 'subjectOfferings')
    );

    const unsubRuns = onSnapshot(
      collection(db, 'timetableRuns'),
      (snapshot) => {
        const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TimetableRun));
        setTimetableRuns(list);
        if (list.length > 0 && !activeRun) {
          setActiveRun(list[0]);
        }
        setLoading(false);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'timetableRuns');
        setLoading(false);
      }
    );

    return () => {
      unsubSettings();
      unsubPrefs();
      unsubBuildings();
      unsubClassrooms();
      unsubCohorts();
      unsubCombined();
      unsubTeachers();
      unsubSubjects();
      unsubRuns();
    };
  }, [user, isAdmin]);

  // Check if sample dataset is currently loaded
  const isSampleDataLoaded = useMemo(() => {
    return buildings.some((b) => b.id.startsWith('bld_'));
  }, [buildings]);

  // Comprehensive System Validation & Warnings Calculation
  const warnings = useMemo<SystemWarning[]>(() => {
    const list: SystemWarning[] = [];

    // 1. Settings Warnings
    if (!academicSettings.workingDays || academicSettings.workingDays.length === 0) {
      list.push({
        id: 'warn_days',
        level: 'critical',
        category: 'settings',
        message: 'No active working days configured for academic schedule.',
        actionTarget: 'settings',
      });
    }

    if (!academicSettings.periods || academicSettings.periods.length === 0) {
      list.push({
        id: 'warn_periods',
        level: 'critical',
        category: 'settings',
        message: 'No lecture periods defined.',
        actionTarget: 'settings',
      });
    }

    // 2. Classrooms Warnings
    if (classrooms.length === 0) {
      list.push({
        id: 'warn_no_rooms',
        level: 'critical',
        category: 'classroom',
        message: 'No classrooms registered. Timetable cannot be solved without physical spaces.',
        actionTarget: 'classrooms',
      });
    }

    classrooms.forEach((room) => {
      if (room.capacity <= 0) {
        list.push({
          id: `warn_cap_${room.id}`,
          level: 'critical',
          category: 'classroom',
          message: `Classroom "${room.name}" has invalid seating capacity (${room.capacity}).`,
          actionTarget: 'classrooms',
        });
      }
    });

    // 3. Cohorts Warnings
    if (cohorts.length === 0) {
      list.push({
        id: 'warn_no_cohorts',
        level: 'warning',
        category: 'cohort',
        message: 'No student cohorts registered.',
        actionTarget: 'cohorts',
      });
    }

    // 4. Combined Classes Warnings
    combinedClasses.forEach((cc) => {
      if (cc.cohortIds.length < 2) {
        list.push({
          id: `warn_comb_cohorts_${cc.id}`,
          level: 'warning',
          category: 'cohort',
          message: `Combined class "${cc.name}" must link at least two participating cohorts.`,
          actionTarget: 'cohorts',
        });
      }
      if (cc.expectedAttendance <= 0) {
        list.push({
          id: `warn_comb_att_${cc.id}`,
          level: 'critical',
          category: 'cohort',
          message: `Combined class "${cc.name}" requires a valid positive expected attendance.`,
          actionTarget: 'cohorts',
        });
      }
    });

    // 5. Teachers Warnings
    if (teachers.length === 0) {
      list.push({
        id: 'warn_no_teachers',
        level: 'critical',
        category: 'teacher',
        message: 'No faculty teachers registered.',
        actionTarget: 'teachers',
      });
    }

    // 6. Subject Offerings Warnings
    subjectOfferings.forEach((sub) => {
      const sum = (sub.theoryPeriods || 0) + (sub.flexiblePracticalPeriods || 0) + (sub.dedicatedLabPeriods || 0);
      if (sum !== sub.totalPeriodsPerWeek) {
        list.push({
          id: `warn_sub_sum_${sub.id}`,
          level: 'critical',
          category: 'subject',
          message: `Subject [${sub.code}] period breakdown (${sum}) does not equal total required periods (${sub.totalPeriodsPerWeek}).`,
          details: `Theory: ${sub.theoryPeriods}, Flex: ${sub.flexiblePracticalPeriods}, Dedicated Lab: ${sub.dedicatedLabPeriods}`,
          actionTarget: 'subjects',
        });
      }

      if (!sub.eligibleTeacherIds || sub.eligibleTeacherIds.length === 0) {
        list.push({
          id: `warn_sub_teachers_${sub.id}`,
          level: 'critical',
          category: 'subject',
          message: `Subject [${sub.code}] has no qualified eligible teachers assigned.`,
          actionTarget: 'subjects',
        });
      }

      // Check room capacity feasibility
      let expectedAttendance = 0;
      if (sub.targetType === 'cohort') {
        const cohort = cohorts.find((c) => c.id === sub.targetId);
        expectedAttendance = cohort ? cohort.studentCount : 0;
      } else {
        const comb = combinedClasses.find((cc) => cc.id === sub.targetId);
        expectedAttendance = comb ? comb.expectedAttendance : 0;
      }

      const suitableRooms = classrooms.filter((r) => r.capacity >= expectedAttendance);
      if (suitableRooms.length === 0 && classrooms.length > 0) {
        list.push({
          id: `warn_sub_cap_${sub.id}`,
          level: 'critical',
          category: 'subject',
          message: `No classroom has sufficient capacity for [${sub.code}] (${expectedAttendance} students). Maximum room capacity is ${Math.max(...classrooms.map((r) => r.capacity), 0)}.`,
          actionTarget: 'subjects',
        });
      }

      // Check dedicated lab requirement
      if (sub.dedicatedLabPeriods > 0) {
        const labRooms = classrooms.filter((r) => r.isDedicatedLab && r.capacity >= expectedAttendance);
        if (labRooms.length === 0) {
          list.push({
            id: `warn_sub_lab_${sub.id}`,
            level: 'critical',
            category: 'subject',
            message: `Subject [${sub.code}] requires dedicated laboratory periods, but no dedicated lab can accommodate ${expectedAttendance} students.`,
            actionTarget: 'subjects',
          });
        }
      }
    });

    return list;
  }, [academicSettings, classrooms, cohorts, combinedClasses, teachers, subjectOfferings]);

  // Operations
  const updateAcademicSettings = async (settings: AcademicSettings) => {
    try {
      await setDoc(doc(db, 'academicSettings', 'default'), {
        ...settings,
        updatedAt: new Date().toISOString(),
      });
      setAcademicSettings(settings);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'academicSettings/default');
    }
  };

  const addBuilding = async (b: Omit<Building, 'id'>) => {
    const id = `bld_${Date.now()}`;
    const payload: Building = {
      ...b,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'buildings', id), payload);
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `buildings/${id}`);
      return id;
    }
  };

  const updateBuilding = async (id: string, b: Partial<Building>) => {
    try {
      await setDoc(
        doc(db, 'buildings', id),
        { ...b, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `buildings/${id}`);
    }
  };

  const deleteBuilding = async (id: string) => {
    // Check if classrooms are assigned to this building
    const referencingRooms = classrooms.filter((r) => r.buildingId === id);
    if (referencingRooms.length > 0) {
      return {
        success: false,
        reason: `Cannot delete building: ${referencingRooms.length} classroom(s) (${referencingRooms.map((r) => r.name).join(', ')}) belong to this building. Reassign or remove these classrooms first.`,
      };
    }

    try {
      await deleteDoc(doc(db, 'buildings', id));
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `buildings/${id}`);
      return { success: false, reason: 'Failed to delete building from database.' };
    }
  };

  const addClassroom = async (c: Omit<Classroom, 'id'>) => {
    const id = `room_${Date.now()}`;
    const payload: Classroom = {
      ...c,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'classrooms', id), payload);
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `classrooms/${id}`);
      return id;
    }
  };

  const updateClassroom = async (id: string, c: Partial<Classroom>) => {
    try {
      await setDoc(
        doc(db, 'classrooms', id),
        { ...c, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `classrooms/${id}`);
    }
  };

  const deleteClassroom = async (id: string) => {
    // Check if active timetable slots reference this classroom
    const activeSlots = activeRun?.slots?.filter((s) => s.classroomId === id) || [];
    if (activeSlots.length > 0) {
      return {
        success: false,
        reason: `Cannot delete classroom: It is referenced in ${activeSlots.length} slot(s) of the active schedule.`,
      };
    }
    try {
      await deleteDoc(doc(db, 'classrooms', id));
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `classrooms/${id}`);
      return { success: false, reason: 'Failed to delete classroom from database.' };
    }
  };

  const addCohort = async (c: Omit<Cohort, 'id'>) => {
    const id = `cohort_${Date.now()}`;
    const payload: Cohort = {
      ...c,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'cohorts', id), payload);
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `cohorts/${id}`);
      return id;
    }
  };

  const updateCohort = async (id: string, c: Partial<Cohort>) => {
    try {
      await setDoc(
        doc(db, 'cohorts', id),
        { ...c, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `cohorts/${id}`);
    }
  };

  const deleteCohort = async (id: string) => {
    // Check combined classes
    const referencingCombined = combinedClasses.filter((cc) => cc.cohortIds.includes(id));
    if (referencingCombined.length > 0) {
      return {
        success: false,
        reason: `Cannot delete cohort: It is part of combined class "${referencingCombined[0].name}".`,
      };
    }
    // Check subject offerings
    const referencingSubjects = subjectOfferings.filter((s) => s.targetType === 'cohort' && s.targetId === id);
    if (referencingSubjects.length > 0) {
      return {
        success: false,
        reason: `Cannot delete cohort: ${referencingSubjects.length} subject offering(s) are assigned to it.`,
      };
    }

    try {
      await deleteDoc(doc(db, 'cohorts', id));
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `cohorts/${id}`);
      return { success: false, reason: 'Failed to delete cohort.' };
    }
  };

  const addCombinedClass = async (cc: Omit<CombinedClass, 'id'>) => {
    const id = `comb_${Date.now()}`;
    const payload: CombinedClass = {
      ...cc,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'combinedClasses', id), payload);
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `combinedClasses/${id}`);
      return id;
    }
  };

  const updateCombinedClass = async (id: string, cc: Partial<CombinedClass>) => {
    try {
      await setDoc(
        doc(db, 'combinedClasses', id),
        { ...cc, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `combinedClasses/${id}`);
    }
  };

  const deleteCombinedClass = async (id: string) => {
    const referencingSubjects = subjectOfferings.filter(
      (s) => s.targetType === 'combined' && s.targetId === id
    );
    if (referencingSubjects.length > 0) {
      return {
        success: false,
        reason: `Cannot delete combined class: Assigned to subject offering "${referencingSubjects[0].name}".`,
      };
    }

    try {
      await deleteDoc(doc(db, 'combinedClasses', id));
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `combinedClasses/${id}`);
      return { success: false, reason: 'Failed to delete combined class.' };
    }
  };

  const addTeacher = async (t: Omit<Teacher, 'id'>) => {
    const id = `teacher_${Date.now()}`;
    const payload: Teacher = {
      ...t,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'teachers', id), payload);
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `teachers/${id}`);
      return id;
    }
  };

  const updateTeacher = async (id: string, t: Partial<Teacher>) => {
    try {
      await setDoc(
        doc(db, 'teachers', id),
        { ...t, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `teachers/${id}`);
    }
  };

  const deleteTeacher = async (id: string) => {
    const referencingSubjects = subjectOfferings.filter(
      (s) => s.assignedTeacherId === id || (s.eligibleTeacherIds && s.eligibleTeacherIds.includes(id))
    );
    if (referencingSubjects.length > 0) {
      return {
        success: false,
        reason: `Cannot delete teacher: Referenced in ${referencingSubjects.length} subject offering(s) as eligible or assigned instructor.`,
      };
    }

    try {
      await deleteDoc(doc(db, 'teachers', id));
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `teachers/${id}`);
      return { success: false, reason: 'Failed to delete teacher.' };
    }
  };

  const addSubjectOffering = async (s: Omit<SubjectOffering, 'id'>) => {
    const id = `sub_${Date.now()}`;
    const payload: SubjectOffering = {
      ...s,
      id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    try {
      await setDoc(doc(db, 'subjectOfferings', id), payload);
      return id;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `subjectOfferings/${id}`);
      return id;
    }
  };

  const updateSubjectOffering = async (id: string, s: Partial<SubjectOffering>) => {
    try {
      await setDoc(
        doc(db, 'subjectOfferings', id),
        { ...s, updatedAt: new Date().toISOString() },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `subjectOfferings/${id}`);
    }
  };

  const deleteSubjectOffering = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'subjectOfferings', id));
      return { success: true };
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `subjectOfferings/${id}`);
      return { success: false, reason: 'Failed to delete subject offering.' };
    }
  };

  const updateSchedulingPreferences = async (prefs: SchedulingPreferences) => {
    try {
      await setDoc(doc(db, 'schedulingPreferences', 'default'), {
        ...prefs,
        updatedAt: new Date().toISOString(),
      });
      setSchedulingPreferences(prefs);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'schedulingPreferences/default');
    }
  };

  // Seed or Reset to Sample Dataset
  const loadSampleDataset = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);

      // 1. Settings & Prefs
      batch.set(doc(db, 'academicSettings', 'default'), DEFAULT_ACADEMIC_SETTINGS);
      batch.set(doc(db, 'schedulingPreferences', 'default'), DEFAULT_SCHEDULING_PREFERENCES);

      // 2. Buildings
      SAMPLE_BUILDINGS.forEach((b) => {
        batch.set(doc(db, 'buildings', b.id), b);
      });

      // 3. Classrooms
      SAMPLE_CLASSROOMS.forEach((c) => {
        batch.set(doc(db, 'classrooms', c.id), c);
      });

      // 4. Cohorts
      SAMPLE_COHORTS.forEach((co) => {
        batch.set(doc(db, 'cohorts', co.id), co);
      });

      // 5. Combined Classes
      SAMPLE_COMBINED_CLASSES.forEach((cc) => {
        batch.set(doc(db, 'combinedClasses', cc.id), cc);
      });

      // 6. Teachers
      SAMPLE_TEACHERS.forEach((t) => {
        batch.set(doc(db, 'teachers', t.id), t);
      });

      // 7. Subject Offerings
      SAMPLE_SUBJECT_OFFERINGS.forEach((s) => {
        batch.set(doc(db, 'subjectOfferings', s.id), s);
      });

      // 8. Timetable Demo Run
      batch.set(doc(db, 'timetableRuns', SAMPLE_TIMETABLE_RUN.id), SAMPLE_TIMETABLE_RUN);

      await batch.commit();
      setActiveRun(SAMPLE_TIMETABLE_RUN);
    } catch (err) {
      console.error('Error loading sample dataset:', err);
      handleFirestoreError(err, OperationType.WRITE, 'batch/sample_dataset');
    } finally {
      setLoading(false);
    }
  };

  // Reset to Empty
  const resetToEmptyDataset = async () => {
    setLoading(true);
    try {
      const batch = writeBatch(db);
      buildings.forEach((b) => batch.delete(doc(db, 'buildings', b.id)));
      classrooms.forEach((c) => batch.delete(doc(db, 'classrooms', c.id)));
      cohorts.forEach((co) => batch.delete(doc(db, 'cohorts', co.id)));
      combinedClasses.forEach((cc) => batch.delete(doc(db, 'combinedClasses', cc.id)));
      teachers.forEach((t) => batch.delete(doc(db, 'teachers', t.id)));
      subjectOfferings.forEach((s) => batch.delete(doc(db, 'subjectOfferings', s.id)));
      timetableRuns.forEach((r) => batch.delete(doc(db, 'timetableRuns', r.id)));

      // Re-initialize bare default settings
      batch.set(doc(db, 'academicSettings', 'default'), DEFAULT_ACADEMIC_SETTINGS);
      batch.set(doc(db, 'schedulingPreferences', 'default'), DEFAULT_SCHEDULING_PREFERENCES);

      await batch.commit();
      setActiveRun(null);
    } catch (err) {
      console.error('Error resetting dataset:', err);
      handleFirestoreError(err, OperationType.WRITE, 'batch/reset');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TimetableContext.Provider
      value={{
        academicSettings,
        buildings,
        classrooms,
        cohorts,
        combinedClasses,
        teachers,
        subjectOfferings,
        schedulingPreferences,
        timetableRuns,
        activeRun,
        warnings,
        loading,
        dbConnected,
        isSampleDataLoaded,

        updateAcademicSettings,
        addBuilding,
        updateBuilding,
        deleteBuilding,

        addClassroom,
        updateClassroom,
        deleteClassroom,

        addCohort,
        updateCohort,
        deleteCohort,

        addCombinedClass,
        updateCombinedClass,
        deleteCombinedClass,

        addTeacher,
        updateTeacher,
        deleteTeacher,

        addSubjectOffering,
        updateSubjectOffering,
        deleteSubjectOffering,

        updateSchedulingPreferences,
        loadSampleDataset,
        resetToEmptyDataset,
        setActiveRun,
      }}
    >
      {children}
    </TimetableContext.Provider>
  );
};

export const useTimetable = () => {
  const context = useContext(TimetableContext);
  if (!context) {
    throw new Error('useTimetable must be used within a TimetableProvider');
  }
  return context;
};
