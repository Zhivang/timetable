import React, { useState } from 'react';
import {
  BookOpenCheck,
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Users2,
  Layers,
  Monitor,
  Cpu,
  Clock,
  X,
  Sliders,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { SubjectOffering, ClassSessionType } from '../../types';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const SubjectOfferingsSection: React.FC = () => {
  const {
    subjectOfferings,
    cohorts,
    combinedClasses,
    teachers,
    addSubjectOffering,
    updateSubjectOffering,
    deleteSubjectOffering,
  } = useTimetable();

  const [searchTerm, setSearchTerm] = useState('');
  const [targetFilter, setTargetFilter] = useState<'all' | 'cohort' | 'combined'>('all');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectOffering | null>(null);

  const [subjectForm, setSubjectForm] = useState<Omit<SubjectOffering, 'id'>>({
    code: '',
    name: '',
    targetType: 'cohort',
    targetId: '',
    targetName: '',
    eligibleTeacherIds: [],
    assignedTeacherId: '',
    totalPeriodsPerWeek: 4,
    theoryPeriods: 2,
    flexiblePracticalPeriods: 2,
    dedicatedLabPeriods: 0,
    permissibleBlockLengths: [1, 2],
    requiredSoftware: [],
    requiredFacilities: [],
    explicitMeetingPattern: '2+2',
  });

  const [customSoftware, setCustomSoftware] = useState('');

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
  }>({
    isOpen: false,
    id: '',
    name: '',
  });

  const filteredSubjects = subjectOfferings.filter((s) => {
    const matchesSearch =
      s.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.targetName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTarget =
      targetFilter === 'all' || s.targetType === targetFilter;

    return matchesSearch && matchesTarget;
  });

  const calculatedSum =
    Number(subjectForm.theoryPeriods || 0) +
    Number(subjectForm.flexiblePracticalPeriods || 0) +
    Number(subjectForm.dedicatedLabPeriods || 0);

  const isPeriodSumValid = calculatedSum === Number(subjectForm.totalPeriodsPerWeek || 0);

  const handleOpenModal = (subject?: SubjectOffering) => {
    if (subject) {
      setEditingSubject(subject);
      setSubjectForm({
        code: subject.code,
        name: subject.name,
        targetType: subject.targetType,
        targetId: subject.targetId,
        targetName: subject.targetName,
        eligibleTeacherIds: [...(subject.eligibleTeacherIds || [])],
        assignedTeacherId: subject.assignedTeacherId || '',
        totalPeriodsPerWeek: subject.totalPeriodsPerWeek,
        theoryPeriods: subject.theoryPeriods,
        flexiblePracticalPeriods: subject.flexiblePracticalPeriods,
        dedicatedLabPeriods: subject.dedicatedLabPeriods,
        permissibleBlockLengths: [...subject.permissibleBlockLengths],
        requiredSoftware: [...subject.requiredSoftware],
        requiredFacilities: [...subject.requiredFacilities],
        explicitMeetingPattern: subject.explicitMeetingPattern || '',
      });
    } else {
      setEditingSubject(null);
      const defaultTarget = cohorts[0];
      setSubjectForm({
        code: '',
        name: '',
        targetType: 'cohort',
        targetId: defaultTarget?.id || '',
        targetName: defaultTarget?.name || '',
        eligibleTeacherIds: [],
        assignedTeacherId: '',
        totalPeriodsPerWeek: 4,
        theoryPeriods: 2,
        flexiblePracticalPeriods: 2,
        dedicatedLabPeriods: 0,
        permissibleBlockLengths: [1, 2],
        requiredSoftware: [],
        requiredFacilities: ['Whiteboard'],
        explicitMeetingPattern: '2+2',
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isPeriodSumValid) {
      alert(
        `Validation Error: The sum of Theory (${subjectForm.theoryPeriods}), Flexible Practical (${subjectForm.flexiblePracticalPeriods}), and Dedicated Lab (${subjectForm.dedicatedLabPeriods}) periods equals ${calculatedSum}, but Total Periods Per Week is set to ${subjectForm.totalPeriodsPerWeek}. They must match exactly.`
      );
      return;
    }

    if (!subjectForm.targetId) {
      alert('Please select a target Cohort or Combined Class.');
      return;
    }

    // Determine targetName
    let name = subjectForm.targetName;
    if (subjectForm.targetType === 'cohort') {
      const c = cohorts.find((item) => item.id === subjectForm.targetId);
      if (c) name = c.name;
    } else {
      const cc = combinedClasses.find((item) => item.id === subjectForm.targetId);
      if (cc) name = cc.name;
    }

    const payload = {
      ...subjectForm,
      targetName: name,
    };

    if (editingSubject) {
      await updateSubjectOffering(editingSubject.id, payload);
    } else {
      await addSubjectOffering(payload);
    }
    setIsModalOpen(false);
  };

  const toggleTeacherEligibility = (teacherId: string) => {
    const list = subjectForm.eligibleTeacherIds || [];
    const exists = list.includes(teacherId);
    let updated: string[];
    if (exists) {
      updated = list.filter((id) => id !== teacherId);
      // If was assigned teacher, reset
      if (subjectForm.assignedTeacherId === teacherId) {
        setSubjectForm({ ...subjectForm, eligibleTeacherIds: updated, assignedTeacherId: '' });
        return;
      }
    } else {
      updated = [...list, teacherId];
    }
    setSubjectForm({ ...subjectForm, eligibleTeacherIds: updated });
  };

  const toggleBlockLength = (length: number) => {
    const list = subjectForm.permissibleBlockLengths;
    if (list.includes(length)) {
      if (list.length <= 1) return; // Keep at least one
      setSubjectForm({
        ...subjectForm,
        permissibleBlockLengths: list.filter((l) => l !== length),
      });
    } else {
      setSubjectForm({
        ...subjectForm,
        permissibleBlockLengths: [...list, length].sort(),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Subjects & Weekly Teaching Requirements
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Specify course codes, assigned cohorts or combined classes, theory vs lab breakdown, and eligible instructors.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Subject Offering
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by code, title, target group..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Target Type:</span>
          {[
            { key: 'all', label: 'All Subjects' },
            { key: 'cohort', label: 'Single Cohort' },
            { key: 'combined', label: 'Combined Class' },
          ].map((pill) => (
            <button
              type="button"
              key={pill.key}
              onClick={() => setTargetFilter(pill.key as any)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                targetFilter === pill.key
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {pill.label}
            </button>
          ))}
        </div>
      </div>

      {/* Subjects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubjects.map((sub) => {
          const sum =
            (sub.theoryPeriods || 0) +
            (sub.flexiblePracticalPeriods || 0) +
            (sub.dedicatedLabPeriods || 0);
          const hasSumMismatch = sum !== sub.totalPeriodsPerWeek;
          const assignedTeacher = teachers.find((t) => t.id === sub.assignedTeacherId);

          return (
            <div
              key={sub.id}
              className={`bg-white rounded-xl border p-5 shadow-2xs transition-all flex flex-col justify-between ${
                hasSumMismatch
                  ? 'border-red-300 bg-red-50/20'
                  : 'border-slate-200 hover:border-blue-300'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded">
                        {sub.code}
                      </span>
                      {sub.targetType === 'combined' ? (
                        <span className="text-[10px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                          Combined
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                          Cohort
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-900 mt-1">{sub.name}</h4>
                    <p className="text-xs text-slate-500">{sub.targetName}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(sub)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                      title="Edit Subject"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirmation({
                          isOpen: true,
                          id: sub.id,
                          name: `[${sub.code}] ${sub.name}`,
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete Subject"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Period Breakdown Badges */}
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between font-bold text-slate-900">
                    <span>Total Periods Required:</span>
                    <span className="font-mono text-sm">{sub.totalPeriodsPerWeek} periods/week</span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 text-[11px] text-center pt-1 border-t border-slate-200">
                    <div className="p-1 rounded bg-white border border-slate-200">
                      <div className="text-slate-500">Theory</div>
                      <div className="font-bold text-slate-800">{sub.theoryPeriods}</div>
                    </div>
                    <div className="p-1 rounded bg-white border border-slate-200">
                      <div className="text-slate-500">Flex Pract</div>
                      <div className="font-bold text-slate-800">{sub.flexiblePracticalPeriods}</div>
                    </div>
                    <div className="p-1 rounded bg-white border border-slate-200">
                      <div className="text-slate-500">Ded. Lab</div>
                      <div className="font-bold text-purple-700">{sub.dedicatedLabPeriods}</div>
                    </div>
                  </div>

                  {hasSumMismatch && (
                    <div className="text-red-600 font-semibold text-[11px] flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Category breakdown ({sum}) != total ({sub.totalPeriodsPerWeek})
                    </div>
                  )}
                </div>

                {/* Teacher Staffing Info */}
                <div className="text-xs space-y-1">
                  <span className="text-slate-500 font-medium">Instructor: </span>
                  {assignedTeacher ? (
                    <span className="font-semibold text-slate-800">
                      {assignedTeacher.name} (Fixed)
                    </span>
                  ) : sub.eligibleTeacherIds && sub.eligibleTeacherIds.length > 0 ? (
                    <span className="text-blue-700 font-medium">
                      {sub.eligibleTeacherIds.length} eligible instructors (Solver chooses)
                    </span>
                  ) : (
                    <span className="text-red-600 font-semibold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" /> No teacher assigned
                    </span>
                  )}
                </div>

                {/* Dedicated Software requirements */}
                {sub.requiredSoftware.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {sub.requiredSoftware.map((sw) => (
                      <span
                        key={sw}
                        className="text-[10px] px-1.5 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded font-mono"
                      >
                        {sw}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>
                  Blocks: {sub.permissibleBlockLengths.join(', ')} period(s)
                  {sub.explicitMeetingPattern && ` (${sub.explicitMeetingPattern})`}
                </span>
                <span
                  onClick={() => handleOpenModal(sub)}
                  className="text-blue-600 font-semibold cursor-pointer"
                >
                  Edit &rarr;
                </span>
              </div>
            </div>
          );
        })}

        {filteredSubjects.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
            <BookOpenCheck className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No subject offerings found</p>
            <p className="mt-1">Define courses, periods, and teacher eligibility requirements.</p>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Add Subject Offering
            </button>
          </div>
        )}
      </div>

      {/* Subject Offering Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-3xl w-full border border-slate-200 my-8 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingSubject ? `Edit Subject Offering: ${editingSubject.code}` : 'Add Subject Offering'}
                </h3>
                <p className="text-xs text-slate-500">
                  Connect academic course, target student group, and weekly teaching period categories.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto text-xs">
              {/* Course Identification */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Course Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS101 or DS202"
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden uppercase font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subject Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Discrete Mathematics & Algorithm Design"
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Target Group Selector */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block">Target Student Group</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">Group Type</label>
                    <div className="flex bg-white p-1 rounded-lg border border-slate-300">
                      <button
                        type="button"
                        onClick={() => {
                          const firstC = cohorts[0];
                          setSubjectForm({
                            ...subjectForm,
                            targetType: 'cohort',
                            targetId: firstC?.id || '',
                            targetName: firstC?.name || '',
                          });
                        }}
                        className={`flex-1 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                          subjectForm.targetType === 'cohort'
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Single Cohort
                      </button>
                      <button
                        type="button"
                        disabled={combinedClasses.length === 0}
                        onClick={() => {
                          const firstCC = combinedClasses[0];
                          setSubjectForm({
                            ...subjectForm,
                            targetType: 'combined',
                            targetId: firstCC?.id || '',
                            targetName: firstCC?.name || '',
                          });
                        }}
                        className={`flex-1 py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer disabled:opacity-40 ${
                          subjectForm.targetType === 'combined'
                            ? 'bg-purple-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Combined Class
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">
                      Select {subjectForm.targetType === 'cohort' ? 'Cohort' : 'Combined Class'}
                    </label>
                    <select
                      required
                      value={subjectForm.targetId}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        let targetName = '';
                        if (subjectForm.targetType === 'cohort') {
                          const c = cohorts.find((item) => item.id === targetId);
                          if (c) targetName = c.name;
                        } else {
                          const cc = combinedClasses.find((item) => item.id === targetId);
                          if (cc) targetName = cc.name;
                        }
                        setSubjectForm({ ...subjectForm, targetId, targetName });
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      {subjectForm.targetType === 'cohort' ? (
                        cohorts.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.studentCount} students)
                          </option>
                        ))
                      ) : (
                        combinedClasses.map((cc) => (
                          <option key={cc.id} value={cc.id}>
                            {cc.name} ({cc.expectedAttendance} attendance)
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* Explicit Period Category Breakdown with Real-Time Validation */}
              <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">
                      Weekly Period Requirements & Category Breakdown
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Explicitly enter the required periods for each session category. Category totals must equal the total.
                    </p>
                  </div>

                  <span
                    className={`font-semibold px-2.5 py-1 rounded text-xs ${
                      isPeriodSumValid
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-red-50 text-red-700 border border-red-200'
                    }`}
                  >
                    Sum: {calculatedSum} / {subjectForm.totalPeriodsPerWeek} periods
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-slate-700 font-bold mb-1">
                      Total Periods / Week
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="14"
                      value={subjectForm.totalPeriodsPerWeek}
                      onChange={(e) =>
                        setSubjectForm({
                          ...subjectForm,
                          totalPeriodsPerWeek: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-mono font-bold text-sm"
                    />
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-slate-700 font-semibold mb-1">
                      Theory Periods
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="14"
                      value={subjectForm.theoryPeriods}
                      onChange={(e) =>
                        setSubjectForm({
                          ...subjectForm,
                          theoryPeriods: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">General classroom</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-slate-700 font-semibold mb-1">
                      Flexible Practical
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="14"
                      value={subjectForm.flexiblePracticalPeriods}
                      onChange={(e) =>
                        setSubjectForm({
                          ...subjectForm,
                          flexiblePracticalPeriods: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 border border-slate-300 rounded bg-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">Classroom or Lab</span>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className="block text-purple-900 font-semibold mb-1">
                      Dedicated Lab Periods
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="14"
                      value={subjectForm.dedicatedLabPeriods}
                      onChange={(e) =>
                        setSubjectForm({
                          ...subjectForm,
                          dedicatedLabPeriods: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-1.5 border border-purple-300 rounded bg-white font-mono font-bold text-purple-900"
                    />
                    <span className="text-[10px] text-purple-700 mt-1 block">Requires dedicated lab</span>
                  </div>
                </div>

                {!isPeriodSumValid && (
                  <div className="p-2.5 bg-red-50 text-red-700 rounded-lg border border-red-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>
                      The sum ({calculatedSum}) does not equal Total Periods Per Week ({subjectForm.totalPeriodsPerWeek}).
                      Please adjust the values so they match exactly.
                    </span>
                  </div>
                )}
              </div>

              {/* Block Lengths & Meeting Pattern */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block font-bold text-slate-800">
                    Permissible Meeting Block Lengths
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((len) => {
                      const active = subjectForm.permissibleBlockLengths.includes(len);
                      return (
                        <button
                          type="button"
                          key={len}
                          onClick={() => toggleBlockLength(len)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
                          }`}
                        >
                          {len} {len === 1 ? 'Period' : 'Periods'}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Allowable consecutive periods per session (e.g. 2 consecutive periods for lab).
                  </p>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <label className="block font-bold text-slate-800">
                    Explicit Weekly Meeting Pattern (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 2+2 or 2+1+1"
                    value={subjectForm.explicitMeetingPattern || ''}
                    onChange={(e) =>
                      setSubjectForm({
                        ...subjectForm,
                        explicitMeetingPattern: e.target.value,
                      })
                    }
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white font-mono"
                  />
                  <p className="text-[11px] text-slate-500">
                    Optional exact weekly session breakdown hint for the optimizer.
                  </p>
                </div>
              </div>

              {/* Teacher Assignment / Eligibility */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800 block">
                    Teacher Eligibility & Assignment
                  </span>
                  <span className="text-[11px] text-slate-500">
                    Select eligible teachers; optionally fix a specific instructor
                  </span>
                </div>

                {/* Eligible Teachers Multi-select */}
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg bg-white divide-y divide-slate-100 p-1">
                  {teachers.map((teacher) => {
                    const isEligible = (subjectForm.eligibleTeacherIds || []).includes(teacher.id);
                    return (
                      <div
                        key={teacher.id}
                        onClick={() => toggleTeacherEligibility(teacher.id)}
                        className={`p-2 rounded flex items-center justify-between cursor-pointer text-xs ${
                          isEligible ? 'bg-blue-50/70 text-blue-950 font-medium' : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div>
                          <span>{teacher.name}</span>
                          <span className="text-[10px] text-slate-400 ml-2">
                            ({teacher.department})
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={isEligible}
                          onChange={() => {}}
                          className="rounded text-blue-600"
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Optional Fixed Teacher */}
                <div>
                  <label className="block text-slate-600 mb-1 font-medium">
                    Fixed Assigned Teacher (Optional)
                  </label>
                  <select
                    value={subjectForm.assignedTeacherId || ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Ensure assigned teacher is in eligible list
                      let elig = subjectForm.eligibleTeacherIds || [];
                      if (val && !elig.includes(val)) {
                        elig = [...elig, val];
                      }
                      setSubjectForm({
                        ...subjectForm,
                        assignedTeacherId: val,
                        eligibleTeacherIds: elig,
                      });
                    }}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="">No fixed teacher (Allow solver to select from eligible set)</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name} ({t.title})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dedicated Software requirements */}
              {subjectForm.dedicatedLabPeriods > 0 && (
                <div className="p-4 bg-purple-50/60 rounded-xl border border-purple-200 space-y-2">
                  <div className="flex items-center gap-2 text-purple-900 font-bold">
                    <Cpu className="w-4 h-4 text-purple-700" />
                    <span>Required Specialized Laboratory Software Tags</span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {subjectForm.requiredSoftware.map((sw) => (
                      <span
                        key={sw}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white text-purple-700 border border-purple-300 rounded font-semibold font-mono"
                      >
                        {sw}
                        <button
                          type="button"
                          onClick={() =>
                            setSubjectForm({
                              ...subjectForm,
                              requiredSoftware: subjectForm.requiredSoftware.filter((s) => s !== sw),
                            })
                          }
                          className="text-purple-400 hover:text-purple-700"
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. PyTorch, Docker, PostgreSQL..."
                      value={customSoftware}
                      onChange={(e) => setCustomSoftware(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = customSoftware.trim();
                          if (val && !subjectForm.requiredSoftware.includes(val)) {
                            setSubjectForm({
                              ...subjectForm,
                              requiredSoftware: [...subjectForm.requiredSoftware, val],
                            });
                            setCustomSoftware('');
                          }
                        }
                      }}
                      className="px-3 py-1.5 border border-purple-300 rounded-lg text-xs bg-white flex-1 max-w-xs"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = customSoftware.trim();
                        if (val && !subjectForm.requiredSoftware.includes(val)) {
                          setSubjectForm({
                            ...subjectForm,
                            requiredSoftware: [...subjectForm.requiredSoftware, val],
                          });
                          setCustomSoftware('');
                        }
                      }}
                      className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-semibold rounded-lg text-xs"
                    >
                      Add Required Software
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!isPeriodSumValid}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-xs disabled:opacity-50"
                >
                  {editingSubject ? 'Update Subject Offering' : 'Save Subject Offering'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Subject Offering?"
        message={`Are you sure you want to delete ${deleteConfirmation.name}? This will remove all associated weekly teaching period requirements.`}
        confirmText="Delete Subject"
        variant="danger"
        onConfirm={async () => {
          await deleteSubjectOffering(deleteConfirmation.id);
          setDeleteConfirmation({ isOpen: false, id: '', name: '' });
        }}
        onCancel={() => setDeleteConfirmation({ isOpen: false, id: '', name: '' })}
      />
    </div>
  );
};
