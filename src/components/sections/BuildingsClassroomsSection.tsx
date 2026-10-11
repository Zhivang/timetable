import React, { useState } from 'react';
import {
  Building2,
  DoorClosed,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle,
  Laptop,
  Monitor,
  AlertCircle,
  HelpCircle,
  X,
  Tag,
  SlidersHorizontal,
} from 'lucide-react';
import { useTimetable } from '../../context/TimetableContext';
import { Building, Classroom, AvailabilityStatus } from '../../types';
import { ConfirmationModal } from '../common/ConfirmationModal';
import { PeriodAvailabilityGrid } from '../common/PeriodAvailabilityGrid';
import { buildFullAvailability } from '../../data/sampleData';

const COMMON_FACILITIES = [
  'Whiteboard',
  'Smartboard',
  'Projector',
  'Dual Projectors',
  'Audio System',
  'Tiered Seating',
  'Lecture Recording',
  'Workstation PCs',
  'Video Conference',
  'Mobile Desks',
];

const COMMON_SOFTWARE = [
  'Python/Jupyter',
  'PostgreSQL',
  'Docker',
  'RStudio',
  'PyTorch',
  'CUDA GPU',
  'MATLAB',
  'JupyterLab',
  'VS Code',
  'Office Suite',
];

export const BuildingsClassroomsSection: React.FC = () => {
  const {
    buildings,
    classrooms,
    academicSettings,
    addBuilding,
    updateBuilding,
    deleteBuilding,
    addClassroom,
    updateClassroom,
    deleteClassroom,
  } = useTimetable();

  const [activeTab, setActiveTab] = useState<'classrooms' | 'buildings'>('classrooms');

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBuildingFilter, setSelectedBuildingFilter] = useState<string>('all');
  const [roomTypeFilter, setRoomTypeFilter] = useState<'all' | 'theory' | 'laptop' | 'lab' | 'shared'>('all');

  // Building Modal State
  const [isBuildingModalOpen, setIsBuildingModalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [buildingForm, setBuildingForm] = useState({
    name: '',
    code: '',
    campusZone: '',
    description: '',
  });

  // Classroom Modal State
  const [isClassroomModalOpen, setIsClassroomModalOpen] = useState(false);
  const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
  const [classroomForm, setClassroomForm] = useState<Omit<Classroom, 'id'>>({
    buildingId: '',
    buildingName: '',
    name: '',
    capacity: 40,
    isShared: false,
    canHostTheory: true,
    canHostLaptopPractical: true,
    isDedicatedLab: false,
    facilities: ['Whiteboard'],
    installedSoftware: [],
    availability: {},
  });

  // Facility / Software input states
  const [customFacility, setCustomFacility] = useState('');
  const [customSoftware, setCustomSoftware] = useState('');

  // Delete Confirmation State
  const [deleteConfirmation, setDeleteConfirmation] = useState<{
    isOpen: boolean;
    type: 'building' | 'classroom';
    id: string;
    name: string;
    warningMessage?: string;
  }>({
    isOpen: false,
    type: 'building',
    id: '',
    name: '',
  });

  // Filtered Classrooms
  const filteredClassrooms = classrooms.filter((room) => {
    const matchesSearch =
      room.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.buildingName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      room.installedSoftware.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
      room.facilities.some((f) => f.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesBuilding =
      selectedBuildingFilter === 'all' || room.buildingId === selectedBuildingFilter;

    let matchesType = true;
    if (roomTypeFilter === 'theory') matchesType = room.canHostTheory;
    else if (roomTypeFilter === 'laptop') matchesType = room.canHostLaptopPractical;
    else if (roomTypeFilter === 'lab') matchesType = room.isDedicatedLab;
    else if (roomTypeFilter === 'shared') matchesType = room.isShared;

    return matchesSearch && matchesBuilding && matchesType;
  });

  // Handle Open Building Modal
  const handleOpenBuildingModal = (building?: Building) => {
    if (building) {
      setEditingBuilding(building);
      setBuildingForm({
        name: building.name,
        code: building.code,
        campusZone: building.campusZone,
        description: building.description || '',
      });
    } else {
      setEditingBuilding(null);
      setBuildingForm({ name: '', code: '', campusZone: '', description: '' });
    }
    setIsBuildingModalOpen(true);
  };

  const handleSaveBuilding = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingBuilding) {
      await updateBuilding(editingBuilding.id, buildingForm);
    } else {
      await addBuilding(buildingForm);
    }
    setIsBuildingModalOpen(false);
  };

  // Handle Open Classroom Modal
  const handleOpenClassroomModal = (room?: Classroom) => {
    if (room) {
      setEditingClassroom(room);
      setClassroomForm({
        buildingId: room.buildingId,
        buildingName: room.buildingName,
        name: room.name,
        capacity: room.capacity,
        isShared: room.isShared,
        canHostTheory: room.canHostTheory,
        canHostLaptopPractical: room.canHostLaptopPractical,
        isDedicatedLab: room.isDedicatedLab,
        facilities: [...room.facilities],
        installedSoftware: [...room.installedSoftware],
        availability: { ...room.availability },
      });
    } else {
      setEditingClassroom(null);
      const defaultBld = buildings[0];
      const initialAvailability = buildFullAvailability(
        academicSettings.workingDays,
        academicSettings.periods.map((p) => p.periodNumber),
        'available'
      );
      setClassroomForm({
        buildingId: defaultBld?.id || '',
        buildingName: defaultBld?.name || '',
        name: '',
        capacity: 45,
        isShared: false,
        canHostTheory: true,
        canHostLaptopPractical: true,
        isDedicatedLab: false,
        facilities: ['Whiteboard', 'Projector'],
        installedSoftware: [],
        availability: initialAvailability,
      });
    }
    setIsClassroomModalOpen(true);
  };

  const handleSaveClassroom = async (e: React.FormEvent) => {
    e.preventDefault();
    const parentBld = buildings.find((b) => b.id === classroomForm.buildingId);
    const finalData = {
      ...classroomForm,
      buildingName: parentBld ? parentBld.name : classroomForm.buildingName,
    };

    if (editingClassroom) {
      await updateClassroom(editingClassroom.id, finalData);
    } else {
      await addClassroom(finalData);
    }
    setIsClassroomModalOpen(false);
  };

  const handleDeleteTrigger = (type: 'building' | 'classroom', id: string, name: string) => {
    let warningMsg = '';
    if (type === 'building') {
      const associatedRooms = classrooms.filter((r) => r.buildingId === id);
      if (associatedRooms.length > 0) {
        warningMsg = `Warning: ${associatedRooms.length} classroom(s) are located in this building (${associatedRooms.map((r) => r.name).join(', ')}). Deletion will be rejected if classrooms remain assigned.`;
      }
    }
    setDeleteConfirmation({
      isOpen: true,
      type,
      id,
      name,
      warningMessage: warningMsg,
    });
  };

  const handleExecuteDelete = async () => {
    if (deleteConfirmation.type === 'building') {
      const res = await deleteBuilding(deleteConfirmation.id);
      if (!res.success) {
        alert(res.reason || 'Failed to delete building');
      }
    } else {
      const res = await deleteClassroom(deleteConfirmation.id);
      if (!res.success) {
        alert(res.reason || 'Failed to delete classroom');
      }
    }
    setDeleteConfirmation({ isOpen: false, type: 'building', id: '', name: '' });
  };

  return (
    <div className="space-y-6">
      {/* Header with Navigation Tabs */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Buildings & Classroom Inventory
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage academic buildings, lecture spaces, laboratory facilities, hardware capabilities, and period availability.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setActiveTab('classrooms')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'classrooms'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Classrooms ({classrooms.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('buildings')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                activeTab === 'buildings'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Buildings ({buildings.length})
            </button>
          </div>

          {activeTab === 'classrooms' ? (
            <button
              type="button"
              disabled={buildings.length === 0}
              onClick={() => handleOpenClassroomModal()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Add Classroom
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleOpenBuildingModal()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Building
            </button>
          )}
        </div>
      </div>

      {/* Buildings Tab Content */}
      {activeTab === 'buildings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {buildings.map((bld) => {
              const roomCount = classrooms.filter((r) => r.buildingId === bld.id).length;
              return (
                <div
                  key={bld.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-slate-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                          <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-900">{bld.name}</h4>
                          <span className="text-xs font-mono font-semibold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                            {bld.code}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenBuildingModal(bld)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                          title="Edit Building"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTrigger('building', bld.id, bld.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Building"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2">
                      {bld.description || 'No notes entered.'}
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium text-slate-700">{bld.campusZone || 'Main Campus'}</span>
                    <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                      {roomCount} {roomCount === 1 ? 'room' : 'rooms'}
                    </span>
                  </div>
                </div>
              );
            })}

            {buildings.length === 0 && (
              <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
                <Building2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No buildings registered yet</p>
                <p className="mt-1">Add campus buildings before creating classrooms.</p>
                <button
                  type="button"
                  onClick={() => handleOpenBuildingModal()}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                >
                  <Plus className="w-3.5 h-3.5" /> Add First Building
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Classrooms Tab Content */}
      {activeTab === 'classrooms' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-1 items-center gap-3 min-w-[260px]">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search room name, software, building, facilities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              {/* Building dropdown filter */}
              <select
                value={selectedBuildingFilter}
                onChange={(e) => setSelectedBuildingFilter(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-lg text-xs bg-white focus:outline-hidden font-medium"
              >
                <option value="all">All Buildings ({buildings.length})</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Room Type Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <span className="text-slate-400 mr-1 flex items-center gap-1">
                <SlidersHorizontal className="w-3 h-3" />
                Type:
              </span>
              {[
                { key: 'all', label: 'All' },
                { key: 'theory', label: 'Theory' },
                { key: 'laptop', label: 'Laptop-Ready' },
                { key: 'lab', label: 'Dedicated Labs' },
                { key: 'shared', label: 'Shared' },
              ].map((pill) => (
                <button
                  type="button"
                  key={pill.key}
                  onClick={() => setRoomTypeFilter(pill.key as any)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    roomTypeFilter === pill.key
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          {/* Classrooms List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClassrooms.map((room) => {
              const unknownCount = Object.values(room.availability || {}).filter((s) => s === 'unknown').length;
              const unavailCount = Object.values(room.availability || {}).filter((s) => s === 'unavailable').length;
              return (
                <div
                  key={room.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs hover:border-blue-300 transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-slate-900">{room.name}</h4>
                          {room.isShared ? (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                              Shared
                            </span>
                          ) : (
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              Dedicated
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-0.5">{room.buildingName}</p>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenClassroomModal(room)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                          title="Edit Classroom & Availability"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTrigger('classroom', room.id, room.name)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Delete Classroom"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Capacity & Capability Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 text-xs">
                      <span className="font-bold text-slate-900 px-2 py-0.5 bg-slate-100 rounded">
                        Capacity: {room.capacity} seats
                      </span>
                      {room.isDedicatedLab && (
                        <span className="font-semibold text-purple-700 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded">
                          Dedicated Lab
                        </span>
                      )}
                      {room.canHostTheory && (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                          Theory
                        </span>
                      )}
                      {room.canHostLaptopPractical && (
                        <span className="text-blue-700 bg-blue-50 px-2 py-0.5 rounded font-medium">
                          Laptop Practical
                        </span>
                      )}
                    </div>

                    {/* Software tags */}
                    {room.installedSoftware.length > 0 && (
                      <div className="space-y-1">
                        <span className="text-[11px] font-semibold text-slate-500">
                          Installed Software:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {room.installedSoftware.map((sw) => (
                            <span
                              key={sw}
                              className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded font-mono"
                            >
                              {sw}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Facilities tags */}
                    {room.facilities.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {room.facilities.map((fac) => (
                          <span
                            key={fac}
                            className="text-[10px] px-1.5 py-0.5 bg-slate-50 text-slate-600 rounded border border-slate-200"
                          >
                            {fac}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Availability Summary Footnote */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      {room.isShared && unknownCount > 0 ? (
                        <span className="text-amber-700 font-medium flex items-center gap-1">
                          <HelpCircle className="w-3 h-3" />
                          {unknownCount} Unknown
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-medium flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Grid Configured
                        </span>
                      )}
                      {unavailCount > 0 && (
                        <span className="text-red-600 font-medium">
                          ({unavailCount} blocked)
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleOpenClassroomModal(room)}
                      className="text-blue-600 hover:text-blue-800 font-semibold"
                    >
                      Edit Grid &rarr;
                    </button>
                  </div>
                </div>
              );
            })}

            {filteredClassrooms.length === 0 && (
              <div className="col-span-full bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500">
                <DoorClosed className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No matching classrooms found</p>
                <p className="mt-1">Adjust search parameters or add a new classroom.</p>
                {buildings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => handleOpenClassroomModal()}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Classroom
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Building Create/Edit Modal */}
      {isBuildingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingBuilding ? 'Edit Building' : 'Add Campus Building'}
              </h3>
              <button
                onClick={() => setIsBuildingModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBuilding} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Building Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alan Turing Hall"
                  value={buildingForm.name}
                  onChange={(e) => setBuildingForm({ ...buildingForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Code / Prefix</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ATH"
                    value={buildingForm.code}
                    onChange={(e) => setBuildingForm({ ...buildingForm, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Campus Zone</label>
                  <input
                    type="text"
                    placeholder="e.g. North Campus"
                    value={buildingForm.campusZone}
                    onChange={(e) => setBuildingForm({ ...buildingForm, campusZone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={3}
                  placeholder="Optional campus notes or physical access details..."
                  value={buildingForm.description}
                  onChange={(e) => setBuildingForm({ ...buildingForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBuildingModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-xs"
                >
                  {editingBuilding ? 'Update Building' : 'Create Building'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Classroom Create/Edit Modal with Full Period Availability Grid */}
      {isClassroomModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full border border-slate-200 my-8 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-white sticky top-0 z-10">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingClassroom ? `Edit Classroom: ${editingClassroom.name}` : 'Add New Classroom'}
                </h3>
                <p className="text-xs text-slate-500">
                  Set capacity, laboratory traits, installed software, and weekly period availability.
                </p>
              </div>
              <button
                onClick={() => setIsClassroomModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClassroom} className="p-6 space-y-6 overflow-y-auto text-xs">
              {/* Primary Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Classroom Name / Number</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ATH-101 or Lab 3A"
                    value={classroomForm.name}
                    onChange={(e) => setClassroomForm({ ...classroomForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Building</label>
                  <select
                    required
                    value={classroomForm.buildingId}
                    onChange={(e) => {
                      const bld = buildings.find((b) => b.id === e.target.value);
                      setClassroomForm({
                        ...classroomForm,
                        buildingId: e.target.value,
                        buildingName: bld ? bld.name : '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden bg-white"
                  >
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Integer Seating Capacity
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    max="1000"
                    value={classroomForm.capacity}
                    onChange={(e) =>
                      setClassroomForm({ ...classroomForm, capacity: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-mono"
                  />
                </div>
              </div>

              {/* Toggles & Capability Traits */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <span className="font-bold text-slate-800 block">Classroom Purpose & Capabilities</span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={classroomForm.isShared}
                      onChange={(e) =>
                        setClassroomForm({ ...classroomForm, isShared: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Shared Room</div>
                      <div className="text-[10px] text-slate-500">Shared with other departments</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={classroomForm.canHostTheory}
                      onChange={(e) =>
                        setClassroomForm({ ...classroomForm, canHostTheory: e.target.checked })
                      }
                      className="rounded text-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Can Host Theory</div>
                      <div className="text-[10px] text-slate-500">Standard lectures</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={classroomForm.canHostLaptopPractical}
                      onChange={(e) =>
                        setClassroomForm({
                          ...classroomForm,
                          canHostLaptopPractical: e.target.checked,
                        })
                      }
                      className="rounded text-blue-600"
                    />
                    <div>
                      <div className="font-semibold text-slate-800">Laptop Practical</div>
                      <div className="text-[10px] text-slate-500">Students bring laptops</div>
                    </div>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:border-blue-300">
                    <input
                      type="checkbox"
                      checked={classroomForm.isDedicatedLab}
                      onChange={(e) =>
                        setClassroomForm({ ...classroomForm, isDedicatedLab: e.target.checked })
                      }
                      className="rounded text-purple-600"
                    />
                    <div>
                      <div className="font-semibold text-purple-900">Dedicated Lab</div>
                      <div className="text-[10px] text-slate-500">Fixed hardware/workstations</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Facilities Checklist */}
              <div className="space-y-2">
                <label className="block font-semibold text-slate-800">Available Facilities</label>
                <div className="flex flex-wrap gap-1.5">
                  {COMMON_FACILITIES.map((fac) => {
                    const selected = classroomForm.facilities.includes(fac);
                    return (
                      <button
                        type="button"
                        key={fac}
                        onClick={() => {
                          const updated = selected
                            ? classroomForm.facilities.filter((f) => f !== fac)
                            : [...classroomForm.facilities, fac];
                          setClassroomForm({ ...classroomForm, facilities: updated });
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-blue-50 text-blue-700 border-blue-300 font-semibold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        {fac}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Installed Software Tags */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-800">
                    Installed Software / Specialized Equipment Tags
                  </label>
                  <span className="text-[11px] text-slate-500">
                    Required for dedicated lab matching
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_SOFTWARE.map((sw) => {
                    const selected = classroomForm.installedSoftware.includes(sw);
                    return (
                      <button
                        type="button"
                        key={sw}
                        onClick={() => {
                          const updated = selected
                            ? classroomForm.installedSoftware.filter((s) => s !== sw)
                            : [...classroomForm.installedSoftware, sw];
                          setClassroomForm({ ...classroomForm, installedSoftware: updated });
                        }}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-colors cursor-pointer ${
                          selected
                            ? 'bg-purple-50 text-purple-700 border-purple-300 font-semibold font-mono'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 font-mono'
                        }`}
                      >
                        {sw}
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Add custom software/tool tag..."
                    value={customSoftware}
                    onChange={(e) => setCustomSoftware(e.target.value)}
                    className="px-3 py-1.5 border border-slate-300 rounded-lg text-xs flex-1 max-w-xs"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (customSoftware.trim() && !classroomForm.installedSoftware.includes(customSoftware.trim())) {
                          setClassroomForm({
                            ...classroomForm,
                            installedSoftware: [...classroomForm.installedSoftware, customSoftware.trim()],
                          });
                          setCustomSoftware('');
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customSoftware.trim() && !classroomForm.installedSoftware.includes(customSoftware.trim())) {
                        setClassroomForm({
                          ...classroomForm,
                          installedSoftware: [...classroomForm.installedSoftware, customSoftware.trim()],
                        });
                        setCustomSoftware('');
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-lg text-xs"
                  >
                    Add Tag
                  </button>
                </div>
              </div>

              {/* Weekly Period Availability Grid */}
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-slate-900">
                      Room Availability Grid (Working Days & Periods)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      For shared rooms, Unknown availability is never assumed available. The solver will NOT schedule classes into unavailable or unknown slots.
                    </p>
                  </div>
                </div>

                <PeriodAvailabilityGrid
                  workingDays={academicSettings.workingDays}
                  periods={academicSettings.periods}
                  availability={classroomForm.availability}
                  allowUnknown={classroomForm.isShared}
                  onChange={(newAvail) =>
                    setClassroomForm({ ...classroomForm, availability: newAvail })
                  }
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={() => setIsClassroomModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold shadow-xs"
                >
                  {editingClassroom ? 'Update Classroom' : 'Create Classroom'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={deleteConfirmation.isOpen}
        title={`Delete ${deleteConfirmation.type === 'building' ? 'Building' : 'Classroom'}?`}
        message={
          deleteConfirmation.warningMessage ||
          `Are you sure you want to delete "${deleteConfirmation.name}"? This action cannot be undone.`
        }
        confirmText="Delete Record"
        variant="danger"
        onConfirm={handleExecuteDelete}
        onCancel={() => setDeleteConfirmation({ isOpen: false, type: 'building', id: '', name: '' })}
      />
    </div>
  );
};
