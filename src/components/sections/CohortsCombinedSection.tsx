import React, { useState } from 'react';
import {
  Users2,
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  GraduationCap,
  Sparkles,
  Info,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { Cohort, CombinedClass } from '../../types';
import { ConfirmationModal } from '../common/ConfirmationModal';

export const CohortsCombinedSection: React.FC = () => {
  const {
    cohorts,
    combinedClasses,
    addCohort,
    updateCohort,
    deleteCohort,
    addCombinedClass,
    updateCombinedClass,
    deleteCombinedClass,
  } = useTimetable();

  const [activeTab, setActiveTab] = useState<'cohorts' | 'combined'>('cohorts');
  const [searchTerm, setSearchTerm] = useState('');

  // Cohort Modal State
  const [isCohortModalOpen, setIsCohortModalOpen] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [cohortForm, setCohortForm] = useState<Omit<Cohort, 'id'>>({
    name: '',
    degreeProgramme: 'BSc Data Science',
    academicYear: 'Year 1',
    studentCount: 50,
    schedulingPreferences: {
      maxHoursPerDay: 5,
      preferredStartPeriod: 1,
    },
  });

  // Combined Class Modal State
  const [isCombinedModalOpen, setIsCombinedModalOpen] = useState(false);
  const [editingCombined, setEditingCombined] = useState<CombinedClass | null>(null);
  const [combinedForm, setCombinedForm] = useState<Omit<CombinedClass, 'id'>>({
    name: '',
    cohortIds: [],
    cohortNames: [],
    expectedAttendance: 80,
  });

  // Delete State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'cohort' | 'combined';
    id: string;
    name: string;
  }>({
    isOpen: false,
    type: 'cohort',
    id: '',
    name: '',
  });

  const filteredCohorts = cohorts.filter(
    (c) =>
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.degreeProgramme.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredCombined = combinedClasses.filter(
    (cc) =>
      cc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cc.cohortNames.some((cn) => cn.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle Open Cohort Modal
  const handleOpenCohortModal = (cohort?: Cohort) => {
    if (cohort) {
      setEditingCohort(cohort);
      setCohortForm({
        name: cohort.name,
        degreeProgramme: cohort.degreeProgramme,
        academicYear: cohort.academicYear,
        studentCount: cohort.studentCount,
        schedulingPreferences: cohort.schedulingPreferences || { maxHoursPerDay: 5 },
      });
    } else {
      setEditingCohort(null);
      setCohortForm({
        name: '',
        degreeProgramme: 'BSc Data Science',
        academicYear: 'Year 1',
        studentCount: 50,
        schedulingPreferences: { maxHoursPerDay: 5, preferredStartPeriod: 1 },
      });
    }
    setIsCohortModalOpen(true);
  };

  const handleSaveCohort = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCohort) {
      await updateCohort(editingCohort.id, cohortForm);
    } else {
      await addCohort(cohortForm);
    }
    setIsCohortModalOpen(false);
  };

  // Handle Open Combined Modal
  const handleOpenCombinedModal = (comb?: CombinedClass) => {
    if (comb) {
      setEditingCombined(comb);
      setCombinedForm({
        name: comb.name,
        cohortIds: [...comb.cohortIds],
        cohortNames: [...comb.cohortNames],
        expectedAttendance: comb.expectedAttendance,
      });
    } else {
      setEditingCombined(null);
      // Select first two cohorts by default if available
      const initialCohorts = cohorts.slice(0, 2);
      const defaultAttendance = initialCohorts.reduce((s, c) => s + c.studentCount, 0);
      setCombinedForm({
        name: '',
        cohortIds: initialCohorts.map((c) => c.id),
        cohortNames: initialCohorts.map((c) => c.name),
        expectedAttendance: defaultAttendance,
      });
    }
    setIsCombinedModalOpen(true);
  };

  const toggleCombinedCohort = (cohortId: string) => {
    const isSelected = combinedForm.cohortIds.includes(cohortId);
    let nextIds: string[];
    let nextNames: string[];

    if (isSelected) {
      nextIds = combinedForm.cohortIds.filter((id) => id !== cohortId);
      nextNames = cohorts.filter((c) => nextIds.includes(c.id)).map((c) => c.name);
    } else {
      nextIds = [...combinedForm.cohortIds, cohortId];
      nextNames = cohorts.filter((c) => nextIds.includes(c.id)).map((c) => c.name);
    }

    setCombinedForm({
      ...combinedForm,
      cohortIds: nextIds,
      cohortNames: nextNames,
    });
  };

  const handleSaveCombined = async (e: React.FormEvent) => {
    e.preventDefault();
    if (combinedForm.cohortIds.length < 2) {
      alert('A combined class must involve at least two student cohorts.');
      return;
    }

    if (editingCombined) {
      await updateCombinedClass(editingCombined.id, combinedForm);
    } else {
      await addCombinedClass(combinedForm);
    }
    setIsCombinedModalOpen(false);
  };

  const handleDelete = async () => {
    if (deleteConfirmation.type === 'cohort') {
      const res = await deleteCohort(deleteConfirmation.id);
      if (!res.success) {
        alert(res.reason || 'Failed to delete cohort.');
      }
    } else {
      const res = await deleteCombinedClass(deleteConfirmation.id);
      if (!res.success) {
        alert(res.reason || 'Failed to delete combined class.');
      }
    }
    setDeleteConfirmation({ isOpen: false, type: 'cohort', id: '', name: '' });
  };

  // Helper to calculate raw sum of selected cohorts for reference
  const selectedCohortsSum = combinedForm.cohortIds.reduce((sum, id) => {
    const c = cohorts.find((item) => item.id === id);
    return sum + (c ? c.studentCount : 0);
  }, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Student Cohorts & Combined Classes
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure degree levels, student headcounts, and combined shared lectures across cohorts.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('cohorts')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'cohorts'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cohorts ({cohorts.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('combined')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'combined'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Combined Classes ({combinedClasses.length})
            </button>
          </div>

          {activeTab === 'cohorts' ? (
            <button
              type="button"
              onClick={() => handleOpenCohortModal()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Cohort
            </button>
          ) : (
            <button
              type="button"
              disabled={cohorts.length < 2}
              onClick={() => handleOpenCombinedModal()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Create Combined Class
            </button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'cohorts'
                ? 'Search cohorts by name, programme...'
                : 'Search combined classes by title or participating cohorts...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Cohorts Tab */}
      {activeTab === 'cohorts' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCohorts.map((cohort) => (
            <div
              key={cohort.id}
              className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-lg bg-purple-50 text-purple-700">
                      <GraduationCap className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{cohort.name}</h4>
                      <p className="text-xs text-slate-500">{cohort.degreeProgramme}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenCohortModal(cohort)}
                      className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                      title="Edit Cohort"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setDeleteConfirmation({
                          isOpen: true,
                          type: 'cohort',
                          id: cohort.id,
                          name: cohort.name,
                        })
                      }
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                      title="Delete Cohort"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded">
                    {cohort.studentCount} Students
                  </span>
                  <span className="font-medium text-slate-600 px-2 py-0.5 bg-slate-50 border border-slate-200 rounded">
                    {cohort.academicYear}
                  </span>
                </div>

                {cohort.schedulingPreferences && (
                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1">
                    <div>
                      Max Daily Load: <strong>{cohort.schedulingPreferences.maxHoursPerDay || 5} periods</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Requires room capacity &ge; {cohort.studentCount}</span>
                <span className="text-blue-600 font-semibold cursor-pointer" onClick={() => handleOpenCohortModal(cohort)}>
                  Configure &rarr;
                </span>
              </div>
            </div>
          ))}

          {filteredCohorts.length === 0 && (
            <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
              <Users2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No student cohorts found</p>
              <button
                type="button"
                onClick={() => handleOpenCohortModal()}
                className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
              >
                <Plus className="w-3.5 h-3.5" /> Add Student Cohort
              </button>
            </div>
          )}
        </div>
      )}

      {/* Combined Classes Tab */}
      {activeTab === 'combined' && (
        <div className="space-y-4">
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-200 text-xs text-indigo-900 flex items-start gap-3">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-bold">Combined Class Constraint Guarantee</p>
              <p className="text-indigo-800 leading-relaxed">
                A combined class reserves a single classroom and qualified instructor at the exact same time slot across all participating cohorts.
                Classroom capacity must be greater than or equal to the explicit expected attendance figure entered by the administrator.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCombined.map((comb) => (
              <div
                key={comb.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-indigo-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-700">
                        <Layers className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{comb.name}</h4>
                        <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                          Combined Session
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenCombinedModal(comb)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                        title="Edit Combined Class"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setDeleteConfirmation({
                            isOpen: true,
                            type: 'combined',
                            id: comb.id,
                            name: comb.name,
                          })
                        }
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        title="Delete Combined Class"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-slate-500">
                      Participating Cohorts ({comb.cohortNames.length}):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {comb.cohortNames.map((cn) => (
                        <span
                          key={cn}
                          className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-800 rounded font-medium"
                        >
                          {cn}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 text-xs flex items-center justify-between">
                    <span className="text-slate-600 font-medium">Expected Attendance:</span>
                    <span className="font-bold text-slate-900 font-mono text-sm">
                      {comb.expectedAttendance} students
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Capacity check: Room &ge; {comb.expectedAttendance}</span>
                  <span className="text-indigo-600 font-semibold cursor-pointer" onClick={() => handleOpenCombinedModal(comb)}>
                    Edit &rarr;
                  </span>
                </div>
              </div>
            ))}

            {filteredCombined.length === 0 && (
              <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
                <Layers className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No combined classes defined</p>
                <p className="mt-1">
                  Combine two or more cohorts to share a lecture theatre and instructor.
                </p>
                {cohorts.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => handleOpenCombinedModal()}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Combined Class
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cohort Modal */}
      {isCohortModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingCohort ? 'Edit Student Cohort' : 'Add Student Cohort'}
              </h3>
              <button onClick={() => setIsCohortModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCohort} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Cohort Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BSc Data Science Year 1"
                  value={cohortForm.name}
                  onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Degree Programme</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BSc Data Science"
                    value={cohortForm.degreeProgramme}
                    onChange={(e) => setCohortForm({ ...cohortForm, degreeProgramme: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Academic Year</label>
                  <select
                    value={cohortForm.academicYear}
                    onChange={(e) => setCohortForm({ ...cohortForm, academicYear: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  >
                    <option value="Year 1">Year 1</option>
                    <option value="Year 2">Year 2</option>
                    <option value="Year 3">Year 3</option>
                    <option value="Year 4">Year 4</option>
                    <option value="Postgraduate Year 1">Postgraduate Year 1</option>
                    <option value="Postgraduate Year 2">Postgraduate Year 2</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Enrolled Student Count (Integer)
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  max="1000"
                  value={cohortForm.studentCount}
                  onChange={(e) => setCohortForm({ ...cohortForm, studentCount: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Classrooms assigned to this cohort must have capacity &ge; {cohortForm.studentCount}.
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <span className="font-semibold text-slate-700 block">Scheduling Preferences</span>
                <div className="flex items-center gap-3">
                  <label className="text-slate-600">Max Periods Per Day:</label>
                  <input
                    type="number"
                    min="1"
                    max="7"
                    value={cohortForm.schedulingPreferences?.maxHoursPerDay || 5}
                    onChange={(e) =>
                      setCohortForm({
                        ...cohortForm,
                        schedulingPreferences: {
                          ...cohortForm.schedulingPreferences,
                          maxHoursPerDay: Number(e.target.value),
                        },
                      })
                    }
                    className="w-20 px-2 py-1 border border-slate-300 rounded bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCohortModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-xs"
                >
                  {editingCohort ? 'Update Cohort' : 'Save Cohort'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Combined Class Modal */}
      {isCombinedModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingCombined ? 'Edit Combined Class' : 'Create Combined Multi-Cohort Class'}
              </h3>
              <button onClick={() => setIsCombinedModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCombined} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Combined Class Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Data Science & AI Foundations"
                  value={combinedForm.name}
                  onChange={(e) => setCombinedForm({ ...combinedForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Participating Cohorts Multi-select */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-700">
                    Select Participating Cohorts (Select at least 2)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    {combinedForm.cohortIds.length} selected
                  </span>
                </div>

                <div className="max-h-48 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 p-1">
                  {cohorts.map((cohort) => {
                    const isSelected = combinedForm.cohortIds.includes(cohort.id);
                    return (
                      <div
                        key={cohort.id}
                        onClick={() => toggleCombinedCohort(cohort.id)}
                        className={`p-2.5 rounded flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-50/70 text-indigo-950' : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <div>
                          <div className="font-semibold">{cohort.name}</div>
                          <div className="text-[10px] text-slate-500">
                            {cohort.degreeProgramme} • {cohort.studentCount} students
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="rounded text-indigo-600"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Explicit Expected Attendance Input */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-800">
                    Combined Expected Attendance (Explicit Entry)
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Raw sum of cohort counts: {selectedCohortsSum}
                  </span>
                </div>

                <input
                  type="number"
                  required
                  min="1"
                  max="1000"
                  value={combinedForm.expectedAttendance}
                  onChange={(e) =>
                    setCombinedForm({ ...combinedForm, expectedAttendance: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-mono font-bold text-sm focus:ring-2 focus:ring-indigo-500"
                />

                <p className="text-[11px] text-slate-500 leading-tight">
                  <strong>Important:</strong> Enter the actual expected attendance for this combined session.
                  The scheduler will use this exact number rather than blindly summing cohort totals.
                </p>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCombinedModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-semibold shadow-xs"
                >
                  {editingCombined ? 'Update Combined Class' : 'Create Combined Class'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title={`Delete ${deleteConfirmation.type === 'cohort' ? 'Cohort' : 'Combined Class'}?`}
        message={`Are you sure you want to delete "${deleteConfirmation.name}"? This action cannot be undone.`}
        confirmText="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, type: 'cohort', id: '', name: '' })}
      />
    </div>
  );
};
