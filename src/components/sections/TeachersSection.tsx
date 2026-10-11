import React, { useState } from 'react';
import {
  UserSquare2,
  Plus,
  Search,
  Edit2,
  Trash2,
  Mail,
  BookOpen,
  Clock,
  CheckCircle,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { Teacher } from '../../types';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { PeriodAvailabilityGrid } from '../common/PeriodAvailabilityGrid';
import { buildFullAvailability } from '../../data/sampleData';

export const TeachersSection: React.FC = () => {
  const {
    teachers,
    academicSettings,
    subjectOfferings,
    addTeacher,
    updateTeacher,
    deleteTeacher,
  } = useTimetable();

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);

  const [teacherForm, setTeacherForm] = useState<Omit<Teacher, 'id'>>({
    name: '',
    email: '',
    title: 'Lecturer',
    department: 'Computer Science',
    subjectsCanTeach: [],
    minWeeklyPeriods: 6,
    maxWeeklyPeriods: 14,
    availability: {},
    preferences: {
      preferMorning: false,
      preferBlockTeaching: true,
    },
  });

  const [customSubjectCode, setCustomSubjectCode] = useState('');

  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    warning?: string;
  }>({
    isOpen: false,
    id: '',
    name: '',
  });

  const filteredTeachers = teachers.filter(
    (t) =>
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.subjectsCanTeach.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleOpenModal = (teacher?: Teacher) => {
    if (teacher) {
      setEditingTeacher(teacher);
      setTeacherForm({
        name: teacher.name,
        email: teacher.email,
        title: teacher.title,
        department: teacher.department,
        subjectsCanTeach: [...teacher.subjectsCanTeach],
        minWeeklyPeriods: teacher.minWeeklyPeriods,
        maxWeeklyPeriods: teacher.maxWeeklyPeriods,
        availability: { ...teacher.availability },
        preferences: teacher.preferences || { preferMorning: false, preferBlockTeaching: true },
      });
    } else {
      setEditingTeacher(null);
      const defaultAvail = buildFullAvailability(
        academicSettings.workingDays,
        academicSettings.periods.map((p) => p.periodNumber),
        'available'
      );
      setTeacherForm({
        name: '',
        email: '',
        title: 'Lecturer',
        department: academicSettings.departmentName,
        subjectsCanTeach: [],
        minWeeklyPeriods: 6,
        maxWeeklyPeriods: 14,
        availability: defaultAvail,
        preferences: { preferMorning: false, preferBlockTeaching: true },
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingTeacher) {
      await updateTeacher(editingTeacher.id, teacherForm);
    } else {
      await addTeacher(teacherForm);
    }
    setIsModalOpen(false);
  };

  const handleDeleteTrigger = (teacher: Teacher) => {
    const referencingSubjects = subjectOfferings.filter(
      (s) =>
        s.assignedTeacherId === teacher.id ||
        (s.eligibleTeacherIds && s.eligibleTeacherIds.includes(teacher.id))
    );
    let warnMsg = '';
    if (referencingSubjects.length > 0) {
      warnMsg = `Warning: ${teacher.name} is referenced in ${referencingSubjects.length} subject offering(s) as an assigned or eligible teacher. Deletion will be blocked until reassigned.`;
    }
    setDeleteConfirmation({
      isOpen: true,
      id: teacher.id,
      name: teacher.name,
      warning: warnMsg,
    });
  };

  const executeDelete = async () => {
    const res = await deleteTeacher(deleteConfirmation.id);
    if (!res.success) {
      alert(res.reason || 'Failed to delete teacher.');
    }
    setDeleteConfirmation({ isOpen: false, id: '', name: '' });
  };

  // Quick helper to add subject tag
  const handleAddSubjectTag = () => {
    const val = customSubjectCode.trim().toUpperCase();
    if (val && !teacherForm.subjectsCanTeach.includes(val)) {
      setTeacherForm({
        ...teacherForm,
        subjectsCanTeach: [...teacherForm.subjectsCanTeach, val],
      });
      setCustomSubjectCode('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Faculty Teachers & Instructor Workload
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage academic appointments, qualification competencies, weekly period limits, and hard availability constraints.
          </p>
        </div>

        <button
          type="button"
          onClick={() => handleOpenModal()}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Add Teacher
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search teachers by name, email, department, qualified subject code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Teachers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTeachers.map((teacher) => {
          const blockedPeriodsCount = Object.values(teacher.availability || {}).filter(
            (status) => status === 'unavailable'
          ).length;

          // Assigned subject offerings
          const assignedSubjects = subjectOfferings.filter((s) => s.assignedTeacherId === teacher.id);
          const assignedPeriods = assignedSubjects.reduce((sum, s) => sum + s.totalPeriodsPerWeek, 0);

          return (
            <div
              key={teacher.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-amber-50 text-amber-700">
                      <UserSquare2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{teacher.name}</h4>
                      <p className="text-xs text-slate-500">
                        {teacher.title} • {teacher.department}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenModal(teacher)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                      title="Edit Teacher & Availability"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteTrigger(teacher)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete Teacher"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{teacher.email}</span>
                </div>

                {/* Teaching Load Constraints */}
                <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-xs flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 font-medium">Weekly Target: </span>
                    <span className="font-bold text-slate-900 font-mono">
                      {teacher.minWeeklyPeriods}–{teacher.maxWeeklyPeriods} periods
                    </span>
                  </div>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      assignedPeriods > teacher.maxWeeklyPeriods
                        ? 'bg-red-50 text-red-700 border border-red-200'
                        : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    }`}
                  >
                    {assignedPeriods} assigned
                  </span>
                </div>

                {/* Qualified Subjects Tags */}
                {teacher.subjectsCanTeach.length > 0 && (
                  <div className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Qualified to Teach:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {teacher.subjectsCanTeach.map((sub) => (
                        <span
                          key={sub}
                          className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold font-mono"
                        >
                          {sub}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Hard Availability Indicator Footnote */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div>
                  {blockedPeriodsCount > 0 ? (
                    <span className="text-amber-700 font-medium">
                      {blockedPeriodsCount} periods blocked (Hard constraint)
                    </span>
                  ) : (
                    <span className="text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Fully Available
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => handleOpenModal(teacher)}
                  className="text-blue-600 hover:text-blue-800 font-semibold cursor-pointer"
                >
                  Edit Availability &rarr;
                </button>
              </div>
            </div>
          );
        })}

        {filteredTeachers.length === 0 && (
          <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
            <UserSquare2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">No teachers found</p>
            <p className="mt-1">Add instructors to satisfy subject offering staffing requirements.</p>
            <button
              type="button"
              onClick={() => handleOpenModal()}
              className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              <Plus className="w-3.5 h-3.5" /> Add Faculty Teacher
            </button>
          </div>
        )}
      </div>

      {/* Teacher Create/Edit Modal with Availability Grid */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full border border-slate-200 my-8 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingTeacher ? `Edit Teacher: ${editingTeacher.name}` : 'Add Faculty Teacher'}
                </h3>
                <p className="text-xs text-slate-500">
                  Configure workload period bounds, subjects qualified to teach, and weekly unavailable periods.
                </p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-6 overflow-y-auto text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Teacher Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Alan Smith"
                    value={teacherForm.name}
                    onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">University Email</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. a.smith@university.ac.uk"
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Academic Title</label>
                  <select
                    value={teacherForm.title}
                    onChange={(e) => setTeacherForm({ ...teacherForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Senior Lecturer">Senior Lecturer</option>
                    <option value="Lecturer">Lecturer</option>
                    <option value="Assistant Professor">Assistant Professor</option>
                    <option value="Teaching Fellow">Teaching Fellow</option>
                    <option value="Adjunct Instructor">Adjunct Instructor</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Computer Science & Data Science"
                    value={teacherForm.department}
                    onChange={(e) => setTeacherForm({ ...teacherForm, department: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Teaching Period Bounds */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block">Weekly Teaching Load Bounds</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">
                      Minimum Weekly Teaching Periods
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="35"
                      value={teacherForm.minWeeklyPeriods}
                      onChange={(e) =>
                        setTeacherForm({ ...teacherForm, minWeeklyPeriods: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 mb-1 font-medium">
                      Maximum Weekly Teaching Periods (Hard Cap)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="40"
                      value={teacherForm.maxWeeklyPeriods}
                      onChange={(e) =>
                        setTeacherForm({ ...teacherForm, maxWeeklyPeriods: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Subjects Qualified to Teach */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-800">
                  Subjects Qualified to Deliver (Subject Codes / Course Names)
                </label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {teacherForm.subjectsCanTeach.map((sub) => (
                    <span
                      key={sub}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded font-semibold font-mono"
                    >
                      {sub}
                      <button
                        type="button"
                        onClick={() =>
                          setTeacherForm({
                            ...teacherForm,
                            subjectsCanTeach: teacherForm.subjectsCanTeach.filter((s) => s !== sub),
                          })
                        }
                        className="text-blue-400 hover:text-blue-700"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Enter subject code (e.g. CS101, DS202) and press Add..."
                    value={customSubjectCode}
                    onChange={(e) => setCustomSubjectCode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddSubjectTag();
                      }
                    }}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs flex-1 max-w-xs font-mono uppercase"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubjectTag}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-xs"
                  >
                    Add Qualified Subject
                  </button>
                </div>
              </div>

              {/* Teacher Weekly Availability Grid */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">
                      Weekly Teacher Availability Grid
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Mark unavailable periods due to other-department teaching, research, leave, or restrictions.
                      <strong> Unavailable teacher periods are strict hard constraints.</strong>
                    </p>
                  </div>
                </div>

                <PeriodAvailabilityGrid
                  workingDays={academicSettings.workingDays}
                  periods={academicSettings.periods}
                  availability={teacherForm.availability}
                  allowUnknown={false}
                  onChange={(newAvail) =>
                    setTeacherForm({ ...teacherForm, availability: newAvail as any })
                  }
                />
              </div>

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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-xs"
                >
                  {editingTeacher ? 'Update Teacher' : 'Save Teacher Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title="Delete Teacher Record?"
        message={
          deleteConfirmation.warning ||
          `Are you sure you want to remove ${deleteConfirmation.name}? This cannot be undone.`
        }
        confirmText="Delete Teacher"
        variant="danger"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, id: '', name: '' })}
      />
    </div>
  );
};
